import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('bm_joint_prepare', ROOT / 'scripts/bm-joint-prepare.py')
bm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bm)


def fixture():
    partitions = {'train': [], 'dev': [], 'test': []}
    for split, writers in [('train', ['tr']), ('dev', ['d1', 'd2']), ('test', ['te'])]:
        for writer in writers:
            for role in ['error', 'control']:
                for number in range(5):
                    partitions[split].append({'id': f'{writer}:{role}:{number}', 'writer': writer,
                        'role': role, 'split': split, 'input': 'falsh' if role == 'error' else 'gut',
                        'target': 'falsch' if role == 'error' else 'gut'})
    return partitions


class JointPreparationTests(unittest.TestCase):
    phases = [('trainfit', 'dev', 2), ('devcal', 'dev', 2), ('test', 'test', 2)]

    def select(self, rows, context=None, mini=None):
        return bm.select(rows, context or set(), mini or set(), self.phases, fit_writer_count=1)

    def test_selection_order_ignores_gold_values_and_source_order(self):
        rows = fixture()
        first, _ = self.select(rows)
        changed = copy.deepcopy(rows)
        for partition in changed.values():
            partition.reverse()
            for row in partition:
                row['target'] = 'changed-target'
        second, _ = self.select(changed)
        self.assertEqual([r['id'] for r in first], [r['id'] for r in second])

    def test_old_context_excluded_everywhere_old_mini_excluded_test(self):
        rows = fixture()
        initial, _ = self.select(rows)
        previous = {row['id'] for row in initial[::2]}
        mini = {row['id'] for row in initial if row['phase'] == 'test'}
        selected, counts = self.select(rows, previous, mini)
        self.assertFalse({row['id'] for row in selected} & previous)
        self.assertFalse({row['id'] for row in selected if row['phase'] == 'test'} & mini)
        self.assertEqual(counts['test']['prior_mini'], 4)
        self.assertEqual(counts['test']['excluded_union'], 4)

    def test_ranker_fit_calibration_base_train_test_writers_disjoint(self):
        rows = fixture()
        selected, _ = self.select(rows)
        writers = {phase: {r['writer'] for r in selected if r['phase'] == phase}
                   for phase in ['trainfit', 'devcal', 'test']}
        writers['base'] = {r['writer'] for r in rows['train']}
        for first in writers:
            for second in writers:
                if first != second:
                    self.assertFalse(writers[first] & writers[second])
        self.assertTrue(all(row['split'] == 'dev' for row in selected if row['phase'] != 'test'))

    def test_insufficient_fixed_writer_pool_fails_without_repartition(self):
        rows = fixture()
        fitting = bm.ranker_writers(rows, fit_writer_count=1)['trainfit']
        rows['dev'] = [r for r in rows['dev'] if r['writer'] not in fitting or r['role'] != 'error']
        with self.assertRaisesRegex(ValueError, 'Insufficient trainfit error'):
            self.select(rows)

    def test_source_writer_leak_and_duplicate_ids_rejected(self):
        rows = fixture()
        rows['test'][0]['writer'] = 'tr'
        with self.assertRaisesRegex(ValueError, 'Writer partition leakage'):
            self.select(rows)
        rows = fixture()
        rows['test'].append(rows['test'][0].copy())
        with self.assertRaisesRegex(ValueError, 'Duplicate occurrence'):
            self.select(rows)

    def test_frozen_files_never_silently_replace_or_partially_add(self):
        with tempfile.TemporaryDirectory() as temporary:
            output = Path(temporary)
            bm.freeze_files(output, {'gold.jsonl': b'original'})
            bm.freeze_files(output, {'gold.jsonl': b'original'})
            with self.assertRaisesRegex(ValueError, 'refusing overwrite'):
                bm.freeze_files(output, {'new.jsonl': b'new', 'gold.jsonl': b'replacement'})
            self.assertEqual((output / 'gold.jsonl').read_bytes(), b'original')
            self.assertFalse((output / 'new.jsonl').exists())

    @unittest.skipUnless((bm.DEFAULT / 'joint/manifest.json').exists(), 'Generate joint data first')
    def test_frozen_counts_input_contract_hashes_and_no_prior_test_overlap(self):
        base = bm.DEFAULT
        output = base / 'joint'
        manifest = json.loads((output / 'manifest.json').read_text(encoding='utf-8'))
        gold = bm.context.read_jsonl(output / 'context.jsonl')
        inputs = bm.context.read_jsonl(output / 'context-inputs.jsonl')
        self.assertEqual(len(gold), 800)
        self.assertEqual(len({r['id'] for r in gold}), 800)
        self.assertEqual(len(inputs), len(gold))
        for evaluated, public in zip(gold, inputs):
            self.assertEqual(set(public), bm.PUBLIC_KEYS)
            self.assertEqual(public, {key: evaluated[key] for key in bm.PUBLIC_KEYS})
        prior = {r['id'] for r in bm.context.read_jsonl(base / 'context/context.jsonl')}
        mini = {r['id'] for r in bm.context.read_jsonl(base / 'prepared/mini.jsonl')}
        self.assertFalse({r['id'] for r in gold} & prior)
        self.assertFalse({r['id'] for r in gold if r['phase'] == 'test'} & mini)
        for phase, split, count in bm.PHASES:
            subset = [r for r in gold if r['phase'] == phase]
            self.assertTrue(all(r['split'] == split for r in subset))
            self.assertEqual(sum(r['role'] == 'error' for r in subset), count)
            self.assertEqual(sum(r['role'] == 'control' for r in subset), count)
            self.assertEqual(subset, bm.context.read_jsonl(output / phase / 'context.jsonl'))
        for name, digest in manifest['files_sha256'].items():
            self.assertEqual(bm.sha((output / name).read_bytes()), digest, name)
        for name, digest in manifest['source_sha256'].items():
            self.assertEqual(bm.sha((base / name).read_bytes()), digest, name)

    @unittest.skipUnless((bm.DEFAULT / 'joint/manifest.json').exists(), 'Generate joint data first')
    def test_all_context_provenance_and_training_writer_separation(self):
        base = bm.DEFAULT
        gold = bm.context.read_jsonl(base / 'joint/context.jsonl')
        manifest = json.loads((base / 'joint/manifest.json').read_text(encoding='utf-8'))
        writer_groups = manifest['writer_partition']['writers']
        train = {r['writer'] for r in bm.context.read_jsonl(base / 'joint/train-sequences.jsonl')}
        self.assertEqual(len(train), 175)
        self.assertEqual(len(writer_groups['trainfit']), 20)
        self.assertEqual(len(writer_groups['devcal']), 17)
        for phase in writer_groups:
            self.assertFalse(set(writer_groups[phase]) & train)
            for other in writer_groups:
                if phase != other:
                    self.assertFalse(set(writer_groups[phase]) & set(writer_groups[other]))
        self.assertEqual((base / 'joint/train-sequences.jsonl').read_bytes(),
                         (base / 'context/train-sequences.jsonl').read_bytes())
        cache = {}
        with zipfile.ZipFile(base / 'raw/litkey-data.zip') as archive:
            for row in gold:
                member = row['sourceMember']
                if member not in cache:
                    raw = archive.read(member)
                    cache[member] = (raw, bm.context.parse_source(raw))
                raw, source = cache[member]
                self.assertEqual(bm.sha(raw), row['sourceFileSha256'])
                source_line = raw[row['sourceRowByteStart']:row['sourceRowByteEnd']].decode('utf-8-sig')
                self.assertEqual(source_line.split('\t')[0], row['input'])
                start, end = row['windowStartLine'] - 1, row['windowEndLine']
                self.assertEqual([r['original'] for r in source[start:end]], row['rawOriginalTokens'])
                self.assertIn(row['writer'], writer_groups[row['phase']])


if __name__ == '__main__':
    unittest.main()
