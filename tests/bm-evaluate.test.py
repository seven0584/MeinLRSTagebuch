import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('bm_evaluate', Path(__file__).resolve().parents[1] / 'scripts/bm-evaluate.py')
bm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bm)


class EvaluationTests(unittest.TestCase):
    def test_distance(self):
        self.assertEqual(bm.levenshtein('Hunt', 'Hund'), 1)
        self.assertEqual(bm.levenshtein('', 'Hund'), 4)
        self.assertEqual(bm.levenshtein('Hund', 'Hund'), 0)

    def test_baseline_ties_and_gold_independence(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'out.jsonl'
            rows = [{'id': 'a', 'input': 'bat', 'target': 'DO NOT USE'}]
            bm.baseline(rows, {'cat': 2, 'hat': 9, 'rat': 9, 'bat': 1}, path)
            ranked = bm.read_jsonl(path)[0]['candidates']
            self.assertEqual([c['word'] for c in ranked], ['bat', 'hat', 'rat', 'cat'])

    def test_failure_denominators_and_case(self):
        gold = [{'id': 'a', 'input': 'hunt', 'target': 'Hund', 'role': 'error'},
                {'id': 'b', 'input': 'kaze', 'target': 'Katze', 'role': 'error'},
                {'id': 'c', 'input': 'Farat', 'target': 'Fahrrad', 'role': 'error'}]
        result = [{'id': 'a', 'input': 'hunt', 'candidates': [{'word': 'hund', 'cost': 1}]},
                  {'id': 'b', 'input': 'kaze', 'error': 'timeout'}]
        score = bm.evaluate(gold, result, {'Hund': 1, 'Katze': 1})['groups']['all']
        self.assertEqual(score['missing'], 1)
        self.assertEqual(score['errors'], 1)
        self.assertEqual(score['topk']['exact']['1']['hits'], 0)
        self.assertEqual(score['topk']['lowercase']['1']['hits'], 1)
        self.assertEqual(score['topk']['lowercase']['1']['denominator'], 3)
        self.assertEqual(score['topk']['exact']['10']['target_in_lexicon_denominator'], 2)

    def test_nonfinite_never_becomes_valid_candidate(self):
        gold = [{'id': 'a', 'input': 'Hunt', 'target': 'Hund', 'role': 'error'}]
        result = [{'id': 'a', 'input': 'Hunt', 'candidates': [
            {'word': 'Hund', 'cost': 'Infinity'}, {'word': 'Hand', 'cost': 2}]}]
        score = bm.evaluate(gold, result, {'Hund': 1})['groups']['all']
        self.assertEqual(score['invalid_candidates'], 1)
        self.assertEqual(score['topk']['exact']['10']['hits'], 0)

    def test_controls_policy_is_separate(self):
        gold = [{'id': 'a', 'input': 'Hund', 'target': 'Hund', 'role': 'control'}]
        result = [{'id': 'a', 'input': 'Hund', 'candidates': [{'word': 'Hand', 'cost': 0}]}]
        score = bm.evaluate(gold, result, {'Hund': 1})['groups']['all']['controls']
        self.assertEqual(score['raw_top1_changes'], 1)
        self.assertEqual(score['conservative_policy_changes'], 0)

    def test_policy_preservation_can_hide_real_word_error(self):
        gold = [{'id': 'a', 'input': 'das', 'target': 'dass', 'role': 'error'}]
        result = [{'id': 'a', 'input': 'das', 'candidates': [{'word': 'dass', 'cost': 0}]}]
        score = bm.evaluate(gold, result, {'das': 1, 'dass': 1})['groups']['all']
        self.assertEqual(score['topk']['exact']['1']['hits'], 1)
        self.assertEqual(score['conservative_policy']['exact_hits'], 0)

    def test_novel_pairs_and_duplicate_ids(self):
        gold = [{'id': 'a', 'input': 'Hunt', 'target': 'Hund', 'role': 'error', 'train_seen_pair': False},
                {'id': 'b', 'input': 'Kaze', 'target': 'Katze', 'role': 'error', 'train_seen_pair': True}]
        self.assertEqual(bm.evaluate(gold, [], {})['groups']['novel_errors']['n'], 1)
        with self.assertRaises(ValueError):
            bm.evaluate(gold, [{'id': 'a'}, {'id': 'a'}], {})

    def test_writer_leakage_rejected(self):
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            for split in ('train', 'dev', 'test'):
                (base / f'{split}.jsonl').write_text(json.dumps({'id': split, 'writer': 'same'}) + '\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Writer leakage'):
                bm.validate(base, [])


if __name__ == '__main__':
    unittest.main()
