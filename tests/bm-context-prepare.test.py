import importlib.util
import json
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('bm_context_prepare', ROOT / 'scripts/bm-context-prepare.py')
bm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bm)


class ContextTests(unittest.TestCase):
    def test_byte_offsets_preserve_bom_unicode_and_line_endings(self):
        raw = '\ufeffHäuser\tHäuser\r\nHunt\tHund\r\n'.encode('utf-8')
        rows = bm.parse_source(raw)
        self.assertEqual(rows[0]['original'], 'Häuser')
        self.assertEqual(raw[rows[1]['byte_start']:rows[1]['byte_end']], b'Hunt\tHund\r\n')
        self.assertEqual(rows[-1]['byte_end'], len(raw))

    def test_neighbor_gold_never_enters_inference(self):
        source = bm.parse_source(b'falsh\tPRIVATE-GOLD\nHunt\tHund\n^\tOTHER-GOLD\n')
        row = {'id': 'unit', 'input': 'Hunt', 'target': 'Hund', 'index': 2}
        gold, public = bm.context_record(row, source, 'sha', 'unit.csv')
        self.assertEqual(set(public), {'id', 'input', 'left', 'right', 'markedText'})
        self.assertEqual(public['markedText'], 'falsh [[Hunt]] ^')
        self.assertNotIn('PRIVATE-GOLD', json.dumps(public))
        self.assertNotIn('OTHER-GOLD', json.dumps(public))
        source[0]['target'] = 'ENTIRELY-CHANGED-GOLD'
        self.assertEqual(public, bm.context_record(row, source, 'sha', 'unit.csv')[1])
        self.assertEqual(gold['rawOriginalTokens'], ['falsh', 'Hunt', '^'])

    def test_offset_alignment_rejects_wrong_original(self):
        source = bm.parse_source(b'Hunt\tHund\n')
        with self.assertRaises(ValueError):
            bm.context_record({'id': 'bad', 'input': 'Kaze', 'target': 'Hund', 'index': 1}, source, 'sha', 'f')

    def test_selection_hash_is_independent_of_gold(self):
        self.assertEqual(bm.order({'id': 'fixed', 'target': 'Hund', 'role': 'error'}),
                         bm.order({'id': 'fixed', 'target': 'SECRET', 'role': 'control'}))

    @unittest.skipUnless((bm.DEFAULT / 'context/context.jsonl').exists(), 'Generate local data first')
    def test_frozen_artifacts_have_no_gold_leak_and_exact_provenance(self):
        base = bm.DEFAULT
        gold = bm.read_jsonl(base / 'context/context.jsonl')
        inputs = bm.read_jsonl(base / 'context/context-inputs.jsonl')
        self.assertEqual(len(gold), 160)
        self.assertEqual(len({row['id'] for row in gold}), 160)
        public_keys = {'id', 'input', 'left', 'right', 'markedText'}
        with zipfile.ZipFile(base / 'raw/litkey-data.zip') as archive:
            for row, public in zip(gold, inputs):
                self.assertEqual(set(public), public_keys)
                self.assertEqual(public, {key: row[key] for key in public_keys})
                raw = archive.read(row['sourceMember'])
                self.assertEqual(bm.sha(raw), row['sourceFileSha256'])
                raw_line = raw[row['sourceRowByteStart']:row['sourceRowByteEnd']]
                self.assertEqual(raw_line.decode('utf-8-sig').split('\t')[0], row['input'])
                original = bm.parse_source(raw)
                start, end = row['windowStartLine'] - 1, row['windowEndLine']
                self.assertEqual([part['original'] for part in original[start:end]], row['rawOriginalTokens'])
                self.assertEqual(row['rawOriginalTokens'][row['markedTokenIndex']], row['input'])

    @unittest.skipUnless((bm.DEFAULT / 'context/context.jsonl').exists(), 'Generate local data first')
    def test_training_sequences_and_test_selection_are_writer_disjoint(self):
        base = bm.DEFAULT
        rows = bm.read_jsonl(base / 'context/context.jsonl')
        seq = bm.read_jsonl(base / 'context/train-sequences.jsonl')
        train_writers = {row['writer'] for row in seq}
        self.assertFalse(train_writers & {row['writer'] for row in rows})
        self.assertFalse({r['writer'] for r in rows if r['split'] == 'dev'} &
                         {r['writer'] for r in rows if r['split'] == 'test'})
        mini_ids = {row['id'] for row in bm.read_jsonl(base / 'prepared/mini.jsonl')}
        self.assertTrue({r['id'] for r in rows if r['split'] == 'test'} <= mini_ids)
        for split, count in [('dev', 30), ('test', 50)]:
            for role in ['error', 'control']:
                self.assertEqual(sum(r['split'] == split and r['role'] == role for r in rows), count)


if __name__ == '__main__':
    unittest.main()
