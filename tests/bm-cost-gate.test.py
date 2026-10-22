import importlib.util
import math
from pathlib import Path
import tempfile
import unittest
from types import SimpleNamespace

SPEC = importlib.util.spec_from_file_location('gate', Path(__file__).resolve().parents[1] / 'scripts/bm-cost-gate.py')
gate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gate)


def sample(costs=None, input_cost=7, original='Farat'):
    return gate.prepare([dict(id='x', input=original, target='FORBIDDEN')],
                        [dict(id='x', input=original, inputCost=input_cost,
                              candidates=costs or [dict(word='Fahrrad', cost=2),dict(word='Farad', cost=6)])])[0]


class GateTests(unittest.TestCase):
    def test_gap_is_minimum_of_second_and_actual_original(self):
        self.assertEqual(sample()['gap'], 4)
        self.assertEqual(sample(input_cost=3)['gap'], 1)
        self.assertEqual(sample(input_cost=1)['gap'], -1)

    def test_missing_original_cost_never_invented(self):
        row = sample(input_cost=None)
        self.assertIsNone(row['gap'])
        self.assertEqual(gate.predict([row], 0)[0]['decision'], 'uncertain')

    def test_original_top_is_kept_even_with_infinite_threshold(self):
        row = sample(original='Fahrrad', input_cost=None)
        pred = gate.predict([row], None)[0]
        self.assertEqual((pred['decision'], pred['candidateId']), ('keep', None))

    def test_boundary_inclusive_and_infinity_abstains(self):
        row = sample()
        self.assertEqual(gate.predict([row],4)[0]['candidateId'],'c1')
        self.assertEqual(gate.predict([row],4.01)[0]['decision'],'uncertain')
        self.assertEqual(gate.predict([row],None)[0]['decision'],'uncertain')

    def test_duplicate_words_deduplicated_before_first_five(self):
        row = sample([dict(word=w,cost=i) for i,w in enumerate(['A','A','B','C','D','E','F'])])
        self.assertEqual([c['word'] for c in row['candidates']],['A','B','C','D','E'])
        self.assertEqual(row['gap'],2)

    def test_empty_candidates_abstain(self):
        row = gate.prepare([dict(id='x',input='a')],[dict(id='x',input='a',candidates=[])])[0]
        self.assertEqual(gate.predict([row],0)[0]['decision'],'uncertain')

    def test_invalid_candidates_rejected(self):
        for costs in [[dict(word='a',cost=math.nan)], [dict(word='a',cost=True)],
                      [dict(word='a',cost=2),dict(word='b',cost=1)]]:
            with self.assertRaises(ValueError):
                sample(costs)

    def test_ids_and_input_match_required(self):
        for rows in [[dict(id='y',input='a',candidates=[])], [dict(id='x',input='b',candidates=[])]]:
            with self.assertRaises(ValueError):
                gate.prepare([dict(id='x',input='a')],rows)
        with self.assertRaises(ValueError):
            gate.indexed([dict(id='x'),dict(id='x')])

    def test_policy_uses_precision_support_controls_then_coverage(self):
        def result(t,c,w,controls_changed=0):
            return dict(threshold=t, correct_changes=c,incorrect_changes=w,offered_changes=c+w,
                        precision=c/(c+w) if c+w else None,control_changes=controls_changed,controls=100)
        table=[result(0,95,6),result(.25,40,2,2),result(.5,38,2,1),result(1,19,0),result(None,0,0)]
        self.assertEqual(gate.select(table),.5)
        self.assertEqual(gate.select(table,strict=True),1)
        self.assertIsNone(gate.select([result(0,19,0),result(None,0,0)]))

    def test_tie_prefers_less_wrong_then_smaller_threshold(self):
        def r(t,w):
            return dict(threshold=t,correct_changes=40,incorrect_changes=w,offered_changes=40+w,
                        precision=40/(40+w),control_changes=0,controls=100)
        self.assertEqual(gate.select([r(0,2),r(2,1),r(3,1)]),2)

    def test_incorrect_error_change_counts_as_wrong_not_control(self):
        gold={'x':dict(input='Farat',target='Fahrrad')}
        pred=[dict(id='x',decision='candidate',selectedWord='Farad')]
        result=gate.metrics(pred,gold)
        self.assertEqual((result['incorrect_changes'],result['control_changes']),(1,0))

    def test_predict_does_not_read_gold_and_freeze_tampering_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            ins,bm,gold=root/'inputs',root/'bm',root/'gold'
            inputs=[dict(id=str(i),input='typo' if i<100 else 'fine') for i in range(200)]
            bms=[dict(id=r['id'],input=r['input'],inputCost=8,candidates=[dict(word='fine',cost=1)]) for r in inputs]
            labels=[dict(**r,target='fine',phase='devcal') for r in inputs]
            gate.write(ins,inputs);gate.write(bm,bms);gate.write(gold,labels)
            config=root/'config'
            gate.calibrate(SimpleNamespace(inputs=ins,bm=bm,gold=gold,output=config))
            args=SimpleNamespace(config=config,inputs=ins,bm=bm,out=root/'out',policy='pragmatic')
            gate.run_predict(args)
            self.assertEqual(len(gate.read(args.out)),200)
            self.assertFalse('target' in Path(str(args.out)+'.inputs.jsonl').read_text())
            gate.write(gold,labels[:-1])
            with self.assertRaisesRegex(ValueError,'Calibration source changed'):
                gate.run_predict(args)

    def test_non_development_calibration_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp)
            gate.write(root/'inputs',[dict(id='x',input='a')])
            gate.write(root/'gold',[dict(id='x',input='a',target='b',phase='test')])
            with self.assertRaisesRegex(ValueError,'development-calibration'):
                gate.calibrate(SimpleNamespace(inputs=root/'inputs',gold=root/'gold',bm=root/'unread',output=root/'config'))


if __name__ == '__main__':
    unittest.main()
