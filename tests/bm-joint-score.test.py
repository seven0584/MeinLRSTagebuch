"""Regression checks against inflated benchmark denominators and unmatched inputs."""
from contextlib import redirect_stdout
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('score', Path(__file__).resolve().parents[1] / 'scripts/bm-joint-score.py')
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


class ScoreTest(unittest.TestCase):
    def fixture(self, root):
        folder = root / 'test'
        folder.mkdir()
        write = m.evaluation.write
        model = root / 'model.json'
        model.write_text('{"chosen_margin":1}', encoding='utf-8')
        inputs = [dict(id='error', input='Hunt', candidates=[dict(id='c1', word='Hund')]),
                  dict(id='control', input='Katze', candidates=[dict(id='c1', word='Katze')])]
        original = [dict(id=r['id'], input=r['input']) for r in inputs]
        gold = [dict(r, target='Hund' if r['id'] == 'error' else 'Katze',
                     phase='test', split='test', role=r['id'], train_seen_pair=False) for r in original]
        write(folder / 'context-inputs.jsonl', original)
        write(folder / 'context.jsonl', gold)
        predictions = [dict(id=r['id'], decision='candidate', candidateId='c1') for r in inputs]
        for name in ['bm-results', 'joint-raw', 'joint-safe', 'keep-results']:
            output = folder / (name + '.jsonl')
            write(output, [dict(id=r['id'], decision='keep', candidateId=None) for r in inputs] if name == 'keep-results' else predictions)
            if name.startswith('joint-'):
                write(Path(str(output) + '.inputs.jsonl'), inputs)
                Path(str(output) + '.manifest.json').write_text(json.dumps(dict(model_sha256=m.sha(model), output_sha256=m.sha(output))), encoding='utf-8')
        self.freeze(root)

    def freeze(self, root):
        names = ['test/context.jsonl', 'test/context-inputs.jsonl']
        (root / 'manifest.json').write_text(json.dumps(dict(files_sha256={name:m.sha(root / name) for name in names})), encoding='utf-8')

    def test_keeps_and_changes_have_separate_denominators(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root)
            with redirect_stdout(io.StringIO()):
                m.score(root)
            result = json.loads((root / 'comparison.json').read_text(encoding='utf-8'))['results']
            self.assertEqual(result['joint-raw']['groups']['test/all']['correct'], 2)
            self.assertEqual(result['joint-raw']['groups']['test/all']['offered_changes'], 1)
            self.assertEqual(result['keep-results']['groups']['test/error']['missed_error_keeps'], 1)

    def test_missing_gold_cannot_shrink_denominator(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root)
            path = root / 'test/context.jsonl'
            m.evaluation.write(path, m.evaluation.read(path)[:1])
            self.freeze(root)
            with self.assertRaisesRegex(ValueError, 'Gold/input IDs differ'):
                m.score(root)

    def test_variants_must_use_identical_candidates(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            self.fixture(root)
            path = root / 'test/joint-safe.jsonl.inputs.jsonl'
            rows = m.evaluation.read(path)
            rows[0]['candidates'][0]['word'] = 'Hut'
            m.evaluation.write(path, rows)
            with self.assertRaisesRegex(ValueError, 'candidate inputs differ'):
                m.score(root)


if __name__ == '__main__':
    unittest.main()
