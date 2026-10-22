import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('bm_gate_prepare', ROOT / 'scripts/bm-gate-prepare.py')
bm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bm)


def fixture():
    result = {}
    for split in ['train', 'dev', 'test']:
        result[split] = [{'id': f'{split}:{role}:{i}', 'writer': split, 'split': split,
                          'role': role, 'input': 'gut', 'target': 'gut'}
                         for role in ['error', 'control'] for i in range(5)]
    return result


class GatePreparationTests(unittest.TestCase):
    def test_selection_fixed_by_id_not_gold_or_order(self):
        rows = fixture()
        first = bm.select(rows, set(), count=2)
        changed = copy.deepcopy(rows)
        for source in changed.values():
            source.reverse()
            for row in source:
                row['target'] = 'arbitrary'
        self.assertEqual([r['id'] for r in first], [r['id'] for r in bm.select(changed, set(), count=2)])

    def test_exclusions_applied_before_selection_and_counts_fixed(self):
        rows = fixture()
        excluded = {r['id'] for r in bm.select(rows, set(), count=2)}
        second = bm.select(rows, excluded, count=2)
        self.assertFalse({r['id'] for r in second} & excluded)
        self.assertEqual([r['role'] for r in second], ['error', 'error', 'control', 'control'])
        with self.assertRaisesRegex(ValueError, 'Insufficient'):
            bm.select(rows, excluded, count=4)

    def test_partition_leakage_duplicate_ids_and_wrong_split_rejected(self):
        rows = fixture()
        rows['test'][0]['writer'] = 'train'
        with self.assertRaisesRegex(ValueError, 'Writer partition leakage'):
            bm.select(rows, set(), 2)
        rows = fixture()
        rows['test'].append(rows['test'][0].copy())
        with self.assertRaisesRegex(ValueError, 'Duplicate occurrence'):
            bm.select(rows, set(), 2)
        rows = fixture()
        rows['test'][0]['split'] = 'dev'
        with self.assertRaisesRegex(ValueError, 'partition label'):
            bm.select(rows, set(), 2)

    def test_freeze_rejects_changed_bytes_before_adding_files(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            bm.joint.freeze_files(output, {'first': b'fixed'})
            bm.joint.freeze_files(output, {'first': b'fixed'})
            with self.assertRaisesRegex(ValueError, 'refusing overwrite'):
                bm.joint.freeze_files(output, {'new': b'new', 'first': b'changed'})
            self.assertFalse((output / 'new').exists())

    @unittest.skipUnless((bm.DEFAULT / 'gate/manifest.json').exists(), 'Generate gate data first')
    def test_frozen_counts_writers_hashes_exclusions_and_public_contract(self):
        base = bm.DEFAULT
        output = base / 'gate'
        manifest = json.loads((output / 'manifest.json').read_text(encoding='utf-8'))
        gold = bm.context.read_jsonl(output / 'test/context.jsonl')
        inputs = bm.context.read_jsonl(output / 'test/context-inputs.jsonl')
        self.assertEqual(len(gold), 400)
        self.assertEqual(len({r['id'] for r in gold}), 400)
        self.assertEqual(manifest['counts'], {'test': {'error': 200, 'control': 200}})
        self.assertEqual(manifest['source_writer_counts'], {'train': 175, 'dev': 37, 'test': 39})
        self.assertEqual(manifest['selected_writer_count'], 39)
        self.assertTrue(all(r['phase'] == r['split'] == 'test' for r in gold))
        train_writers = {r['writer'] for r in bm.context.read_jsonl(base / 'train.jsonl')}
        self.assertFalse(train_writers & {r['writer'] for r in gold})
        self.assertEqual(len(inputs), len(gold))
        for evaluated, public in zip(gold, inputs):
            self.assertEqual(set(public), bm.PUBLIC_KEYS)
            self.assertEqual(public, {key: evaluated[key] for key in bm.PUBLIC_KEYS})
        for source in ['prepared/mini.jsonl', 'context/context.jsonl', 'joint/test/context.jsonl']:
            old = {r['id'] for r in bm.context.read_jsonl(base / source)}
            self.assertFalse(old & {r['id'] for r in gold})
        for name, digest in manifest['files_sha256'].items():
            self.assertEqual(bm.joint.sha((output / name).read_bytes()), digest, name)
        for name, digest in manifest['source_sha256'].items():
            self.assertEqual(bm.joint.sha((base / name).read_bytes()), digest, name)
        self.assertEqual((output / 'inputs.tsv').read_bytes(), (output / 'test/inputs.tsv').read_bytes())

    @unittest.skipUnless((bm.DEFAULT / 'gate/manifest.json').exists(), 'Generate gate data first')
    def test_original_context_and_exact_source_byte_provenance(self):
        gold = bm.context.read_jsonl(bm.DEFAULT / 'gate/test/context.jsonl')
        cache = {}
        with zipfile.ZipFile(bm.DEFAULT / 'raw/litkey-data.zip') as archive:
            for row in gold:
                member = row['sourceMember']
                if member not in cache:
                    raw = archive.read(member)
                    cache[member] = raw, bm.context.parse_source(raw)
                raw, source = cache[member]
                self.assertEqual(bm.joint.sha(raw), row['sourceFileSha256'])
                exact = raw[row['sourceRowByteStart']:row['sourceRowByteEnd']].decode('utf-8-sig')
                self.assertEqual(exact.split('\t')[0], row['input'])
                window = source[row['windowStartLine'] - 1:row['windowEndLine']]
                self.assertEqual([r['original'] for r in window], row['rawOriginalTokens'])
                self.assertLessEqual(len(window), 25)


if __name__ == '__main__':
    unittest.main()
