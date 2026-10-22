import importlib.util
from argparse import Namespace
from contextlib import redirect_stdout
import io
import json
import math
from pathlib import Path
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location('joint', Path(__file__).parents[1] / 'scripts/bm-joint-rank.py')
m = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(m)


class JointTests(unittest.TestCase):
    def setUp(self):
        self.lm = m.context.CountLM([{'tokens': ['Der', 'Hund', 'bellt', '.']}] * 3 +
                                  [{'tokens': ['Die', 'Katze', 'miaut', '.']}])
        self.priors = {'Hund': .3, 'Hut': .2, 'Katze': .1}
        self.row = dict(id='a', input='Hunt', left='Der', right='bellt .', markedText='Der [[Hunt]] bellt .')
        self.bm = dict(id='a', input='Hunt', inputCost=8., candidates=[dict(word='Hund', cost=1.), dict(word='Hut', cost=2.)])

    def prepared(self, row=None, bm=None):
        return m.prepare([row or self.row], [bm or self.bm], self.lm, self.priors)

    def test_gold_fields_cannot_change_features(self):
        expected = self.prepared()
        actual = self.prepared(dict(self.row, target='Katze', role='error', split='test'))
        self.assertEqual(expected, actual)

    def test_real_keep_cost_even_outside_top_five(self):
        row = self.prepared()[0]
        self.assertEqual(row['choices'][0]['features'][0], -7.)
        self.assertEqual(row['choices'][0]['features'][-1], 0.)
        self.assertEqual(row['choices'][1]['features'][0], 0.)

    def test_missing_cost_is_explicit_fallback_feature(self):
        row = self.prepared(bm=dict(self.bm, inputCost=None))[0]
        self.assertEqual(row['choices'][0]['features'][0], -6.)
        self.assertEqual(row['choices'][0]['features'][-1], 1.)

    def test_missing_input_cost_is_not_silently_guessed(self):
        bm = dict(self.bm)
        del bm['inputCost']
        with self.assertRaises(ValueError):
            self.prepared(bm=bm)

    def test_nonfinite_or_duplicate_costs_rejected(self):
        for bm in [dict(self.bm, inputCost=float('nan')),
                   dict(self.bm, candidates=[dict(word='Hund', cost=float('inf'))]),
                   dict(self.bm, candidates=[dict(word='Hund', cost=1.), dict(word='Hund', cost=2.)]),
                   dict(self.bm, candidates=[dict(word='Hund', cost=3.), dict(word='Hut', cost=2.)])]:
            with self.assertRaises(ValueError):
                self.prepared(bm=bm)

    def test_duplicate_or_mismatched_ids_rejected(self):
        with self.assertRaises(ValueError):
            m.prepare([self.row, self.row], [self.bm], self.lm, self.priors)
        with self.assertRaises(ValueError):
            self.prepared(bm=dict(self.bm, id='b'))
        with self.assertRaises(ValueError):
            self.prepared(bm=dict(self.bm, input='Wrong'))

    def test_original_candidate_is_single_keep_choice_and_ids_preserved(self):
        bm = dict(self.bm, candidates=[dict(word='Hunt', cost=1.), dict(word='Hund', cost=2.)])
        row = self.prepared(bm=bm)[0]
        self.assertEqual(len(row['choices']), 2)
        self.assertEqual(row['choices'][1]['candidateId'], 'c2')
        result = m.predict([row], [0.] * len(m.FEATURES), [1.] * len(m.FEATURES), 0.)[0]
        self.assertEqual(result['decision'], 'keep')

    def test_margin_abstains_without_changing_candidate_ranking(self):
        rows = self.prepared()
        weights = [1.] + [0.] * (len(m.FEATURES) - 1)
        scale = [1.] * len(m.FEATURES)
        raw = m.predict(rows, weights, scale, 0.)[0]
        abstain = m.predict(rows, weights, scale, 2.)[0]
        self.assertEqual(raw['selectedWord'], 'Hund')
        self.assertEqual(abstain['decision'], 'uncertain')
        self.assertEqual(raw['scores'], abstain['scores'])

    def test_development_can_select_no_changes_honestly(self):
        rows = self.prepared()
        # All offered corrections are wrong under this deliberately different gold.
        gold = m.labels(rows, [dict(self.row, target='Katze')])
        weights = [1.] + [0.] * (len(m.FEATURES) - 1)
        margin, report = m.choose_margin(rows, gold, weights, [1.] * len(m.FEATURES))
        self.assertGreater(margin, 1.)
        self.assertEqual(next(r for r in report if r['margin'] == margin)['offered_changes'], 0)

    def test_training_learns_covered_choice_and_reports_missing_targets(self):
        rows = self.prepared()
        other = self.prepared(dict(self.row, id='b'), dict(self.bm, id='b'))
        rows += other
        gold = m.labels(rows, [dict(self.row, target='Hund'), dict(self.row, id='b', target='Katze')])
        scale = m.scales(rows)
        w1, stats = m.optimize(rows, gold, scale)
        w2, _ = m.optimize(rows, gold, scale)
        self.assertEqual(w1, w2)
        self.assertTrue(all(math.isfinite(w) for w in w1))
        self.assertEqual(stats, dict(covered_fit=1, uncovered_fit=1))
        self.assertEqual(m.predict(rows, w1, scale, 0.)[0]['selectedWord'], 'Hund')

    def test_serialized_lm_preserves_scores_and_annotation_boundaries(self):
        restored = m.decode_lm(m.encode_lm(self.lm))
        self.assertEqual(restored.score('Der', 'Hund', 'bellt .'), self.lm.score('Der', 'Hund', 'bellt .'))
        self.assertEqual(restored.score('Die ^ Der', 'Hund', 'bellt ^ .'), self.lm.score('Der', 'Hund', 'bellt'))

    def test_training_and_calibration_writers_are_disjoint(self):
        fit, dev = {'a': {'writer': 'fit'}}, {'b': {'writer': 'dev'}}
        m.writer_guard(fit, dev, [{'writer': 'base'}])
        m.writer_guard(fit, dev, [{'tokens': ['no', 'metadata']}])
        with self.assertRaisesRegex(ValueError, 'Base LM/ranker'):
            m.writer_guard(fit, dev, [{'writer': 'fit'}])
        with self.assertRaisesRegex(ValueError, 'Base LM/ranker'):
            m.writer_guard(fit, dev, [{'writer': 'dev'}])
        with self.assertRaisesRegex(ValueError, 'Fit/development'):
            m.writer_guard(fit, {'b': {'writer': 'fit'}}, [{'writer': 'base'}])

    def test_fit_scales_unchanged_when_prediction_distribution_differs(self):
        rows = self.prepared()
        scale = m.scales(rows)
        before = scale[:]
        m.predict(rows, [1.] * len(m.FEATURES), scale, 0.)
        self.assertEqual(scale, before)

    def test_prediction_never_reopens_fit_dev_labels_or_training_sequences(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            payloads = dict(fit_inputs=[self.row], fit_bm=[self.bm],
                            fit_gold=[dict(self.row, target='Hund', writer='fit')],
                            dev_inputs=[dict(self.row, id='dev')],
                            dev_bm=[dict(self.bm, id='dev')],
                            dev_gold=[dict(self.row, id='dev', target='Hund', writer='dev')],
                            lm_training=[{'tokens': ['Der', 'Hund', 'bellt', '.']}])
            paths = {}
            for name, rows in payloads.items():
                paths[name] = root / (name + '.jsonl')
                m.context.write(paths[name], rows)
            paths['dictionary'] = root / 'dictionary.tsv'
            paths['dictionary'].write_text('Hund\t0.3\nHut\t0.2\nKatze\t0.1\n', encoding='utf-8')
            paths['output'] = root / 'model.json'
            with redirect_stdout(io.StringIO()):
                m.fit(Namespace(**paths))
            for name in ['fit_gold', 'dev_gold', 'lm_training']:
                paths[name].unlink()
            output = root / 'predictions.jsonl'
            m.run_predict(Namespace(model=paths['output'], inputs=paths['dev_inputs'],
                                    bm=paths['dev_bm'], out=output, raw=True))
            prediction = m.context.read(output)[0]
            self.assertEqual(prediction['selectedWord'], 'Hund')
            manifest = json.loads(Path(str(output) + '.manifest.json').read_text())
            self.assertEqual(manifest['count'], 1)
            paths['dictionary'].write_text('Hund\t0.4\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Dictionary hash changed'):
                m.run_predict(Namespace(model=paths['output'], inputs=paths['dev_inputs'],
                                        bm=paths['dev_bm'], out=output, raw=True))


if __name__ == '__main__':
    unittest.main()
