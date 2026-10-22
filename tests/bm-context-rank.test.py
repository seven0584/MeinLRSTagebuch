import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('ranker', Path(__file__).parents[1] / 'scripts/bm-context-rank.py')
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


class ContextTests(unittest.TestCase):
    def row(self):
        return {'id': 'a', 'input': 'Hunt', 'left': 'Der', 'right': 'bellt .', 'markedText': 'Der [Hunt] bellt .'}

    def test_gold_fields_never_enter_model_input_or_change_ranking(self):
        a = self.row()
        b = dict(a, target='Katze', split='test', role='error')
        candidates = [{'id': 'a', 'input': 'Hunt', 'candidates': [{'word': 'Hund'}, {'word': 'Hut'}]}]
        x, y = m.prepare([a], candidates), m.prepare([b], candidates)
        self.assertEqual(x, y)
        lm = m.CountLM([{'tokens': ['Der', 'Hund', 'bellt', '.']}] * 3)
        self.assertEqual(m.rank(lm, x), m.rank(lm, y))
        self.assertEqual(m.rank(lm, x)[0]['candidateId'], 'c1')

    def test_keep_and_uncertain_are_distinct(self):
        row = dict(self.row(), candidates=[{'id': 'c1', 'word': 'Hund'}])
        gold = [dict(row, split='test', role='error', target='Hund')]
        keep = m.evaluate(gold, [row], [{'id': 'a', 'decision': 'keep'}])['groups']['test/error']
        uncertain = m.evaluate(gold, [row], [{'id': 'a', 'decision': 'uncertain'}])['groups']['test/error']
        self.assertEqual(keep['incorrect'], 1)
        self.assertEqual(uncertain['uncertain'], 1)
        self.assertEqual(keep['offered_changes'], 0)

    def test_arbitrary_word_cannot_be_selected(self):
        row = dict(self.row(), candidates=[{'id': 'c1', 'word': 'Hund'}])
        word, error = m.resolve(row, {'decision': 'candidate', 'candidateId': 'Katze'})
        self.assertIsNone(word)
        self.assertEqual(error, 'invalid_choice')

    def test_annotations_break_training_history(self):
        lm = m.CountLM([{'tokens': ['Der', 'foo_bar', 'Hund', '.']}])
        self.assertNotIn(('Der',), lm.counts)
        self.assertIn(('Hund',), lm.counts)
        self.assertEqual(lm.rejected, 1)

    def test_controls_and_candidate_coverage_separate(self):
        row = dict(self.row(), input='Hund', candidates=[{'id': 'c1', 'word': 'Hut'}])
        gold = [dict(row, split='test', role='control', target='Hund')]
        r = m.evaluate(gold, [row], [{'id': 'a', 'decision': 'candidate', 'candidateId': 'c1'}])['groups']['test/control']
        self.assertEqual(r['undesired_control_changes'], 1)
        self.assertEqual(r['candidate_covered'], 0)
        self.assertEqual(r['selectable'], 1)

    def test_duplicate_original_prefers_keep(self):
        row = dict(self.row(), candidates=[{'id': 'c1', 'word': 'Hunt'}])
        lm = m.CountLM([{'tokens': ['Der', 'Hunt', 'bellt', '.']}])
        self.assertEqual(m.rank(lm, [row])[0]['decision'], 'keep')

    def test_inference_annotations_reset_left_history(self):
        lm = m.CountLM([{'tokens': ['Der', 'Hund', 'bellt', '.']}])
        self.assertEqual(lm.score('beliebig davor ^ Der', 'Hund', 'bellt .'),
                         lm.score('Der', 'Hund', 'bellt .'))
        self.assertEqual(lm.score('Der ^', 'Hund', 'bellt .'),
                         lm.score('', 'Hund', 'bellt .'))

    def test_inference_annotations_stop_right_context(self):
        lm = m.CountLM([{'tokens': ['Der', 'Hund', 'bellt', '.']}])
        self.assertEqual(lm.score('Der', 'Hund', 'bellt ^ egal danach'),
                         lm.score('Der', 'Hund', 'bellt'))
        self.assertEqual(lm.score('Der', 'Hund', '^ bellt .'),
                         lm.score('Der', 'Hund', ''))

    def test_case_diagnostic_does_not_change_exact_gold_metric(self):
        row = dict(self.row(), input='hund', candidates=[{'id': 'c1', 'word': 'Hund'}])
        gold = [dict(row, split='test', role='error', target='Hund')]
        report = m.evaluate(gold, [row], [{'id': 'a', 'decision': 'keep'}])
        group = report['groups']['test/error_case_only']
        self.assertEqual(group['correct'], 0)
        self.assertEqual(group['case_insensitive_correct'], 1)
        self.assertEqual(group['missed_error_keeps'], 1)
        self.assertEqual(report['details'][0]['target'], 'Hund')
        self.assertEqual(report['details'][0]['actionOutcome'], 'missed_error_keep')

    def test_consensus_same_word_with_different_choice_encoding(self):
        row = dict(self.row(), candidates=[{'id': 'c1', 'word': 'Hunt'}])
        result = m.consensus([row], [{'id': 'a', 'decision': 'keep'}],
                             [{'id': 'a', 'decision': 'candidate', 'candidateId': 'c1'}])
        self.assertEqual(result[0]['decision'], 'keep')
        self.assertIsNone(result[0]['candidateId'])

    def test_consensus_differences_missing_or_uncertain_abstain(self):
        row = dict(self.row(), candidates=[{'id': 'c1', 'word': 'Hund'}])
        first = [{'id': 'a', 'decision': 'candidate', 'candidateId': 'c1'}]
        for second in [[], [{'id': 'a', 'decision': 'keep'}], [{'id': 'a', 'decision': 'uncertain'}]]:
            self.assertEqual(m.consensus([row], first, second)[0]['decision'], 'uncertain')

    def test_consensus_does_not_consult_gold_or_scores(self):
        row = dict(self.row(), candidates=[{'id': 'c1', 'word': 'Hund'}])
        first = [{'id': 'a', 'decision': 'candidate', 'candidateId': 'c1', 'score': 5}]
        second = [{'id': 'a', 'decision': 'candidate', 'candidateId': 'c1', 'score': -9}]
        a = m.consensus([row], first, second)
        b = m.consensus([dict(row, target='Katze', confidence=0)], first, second)
        self.assertEqual(a, b)
        self.assertEqual(a[0]['candidateId'], 'c1')

    def test_fail_closed_keeps_raw_and_never_reinterprets_invalid_choice(self):
        row = dict(self.row(), candidates=[{'id': 'c1', 'word': 'Hund'}])
        original = {'id': 'a', 'error': 'Invalid constrained choice',
                    'raw': {'content': '{"candidateId":"c1","decision":"keep"}'}}
        result = m.fail_closed([row], [original])[0]
        self.assertEqual(result['decision'], 'uncertain')
        self.assertIsNone(result['candidateId'])
        self.assertTrue(result['technicalAbstention'])
        self.assertEqual(result['originalError'], original['error'])
        self.assertEqual(result['raw'], original['raw'])
        self.assertNotIn('decision', original)
        self.assertIn('error', original)

    def test_fail_closed_preserves_valid_choices_and_all_missing_rows(self):
        row = dict(self.row(), candidates=[{'id': 'c1', 'word': 'Hund'}])
        keep = {'id': 'a', 'decision': 'keep', 'candidateId': None}
        result = m.fail_closed([row], [keep])[0]
        self.assertEqual(result['decision'], 'keep')
        self.assertFalse(result['technicalAbstention'])
        missing = m.fail_closed([row], [])[0]
        self.assertTrue(missing['technicalAbstention'])
        self.assertEqual(missing['originalError'], 'missing')
        self.assertEqual(missing['decision'], 'uncertain')


if __name__ == '__main__':
    unittest.main()
