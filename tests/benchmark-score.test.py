"""Small synthetic fixtures test scoring semantics, not model quality."""
import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("benchmark_score", Path(__file__).resolve().parents[1] / "scripts" / "benchmark-score.py")
scorer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scorer)


class ScoringTests(unittest.TestCase):
    def site(self, original, expected, identifier="F001"):
        return dict(id=identifier, unit="S01", original=original, expected=expected, expectation="Korrektur")

    def test_whitespace_only_normalization(self):
        self.assertEqual(scorer.tokens("Hallo, Welt!"), scorer.tokens(" Hallo ,  Welt ! "))
        self.assertNotEqual(scorer.tokens("Morgen"), scorer.tokens("morgen"))

    def test_unique_local_correction(self):
        item = dict(input="Der Hunt rennt.", reference="Der Hund rennt.")
        result = scorer.site_scores(item, scorer.tokens("Der Hund rennt."), [self.site("Hunt", "Hund")], False)
        self.assertEqual(result[0]["status"], "exact_expected")
        unchanged = scorer.site_scores(item, scorer.tokens(item["input"]), [self.site("Hunt", "Hund")], False)
        self.assertEqual(unchanged[0]["status"], "unchanged")

    def test_whitespace_correction_not_credited_by_token_normalization(self):
        item = dict(input="fertig,weil", reference="fertig, weil")
        result = scorer.site_scores(item, scorer.tokens("fertig,weil"),
                                   [self.site("fertig,weil", "fertig, weil")], False)
        self.assertEqual(result[0]["status"], "manual")
        self.assertIn("Leerraum", result[0]["reason"])

    def test_repeated_or_overlapping_anchor_is_manual(self):
        item = dict(input="Hunt und Hunt", reference="Hund und Hund")
        result = scorer.site_scores(item, scorer.tokens(item["reference"]), [self.site("Hunt", "Hund")], False)
        self.assertEqual(result[0]["status"], "manual")
        item = dict(input="der Hunt", reference="dem Hund")
        result = scorer.site_scores(item, scorer.tokens(item["reference"]),
                                   [self.site("Hunt", "Hund"), self.site("der Hunt", "dem Hund", "F002")], False)
        self.assertTrue(all(r["status"] == "manual" for r in result))

    def test_cross_boundary_edit_is_manual(self):
        item = dict(input="Der Hunt rennt", reference="Der Hund rennt")
        result = scorer.site_scores(item, scorer.tokens("Die Hunde rennen"), [self.site("Hunt", "Hund")], False)
        self.assertEqual(result[0]["status"], "manual")

    def test_controls_have_change_rate_not_precision(self):
        corpus = dict(items=[], controls=[dict(id="K01", input="Hallo!"), dict(id="K02", input="Moin!")], sites=[])
        results = dict(K01=dict(correction="Hallo !"), K02=dict(correction="Guten Tag!"))
        report = scorer.score(corpus, results)
        self.assertEqual(report["summary"]["controlsChanged"], 1)
        self.assertEqual(report["summary"]["controlChangeRate"], 0.5)
        self.assertNotIn("precision", report["summary"])

    def test_missing_and_mismatched_input_not_success(self):
        corpus = dict(items=[], controls=[dict(id="K01", input="Hallo!"), dict(id="K02", input="Moin!")], sites=[])
        report = scorer.score(corpus, dict(K01=dict(input="Falsch", correction="Hallo!")))
        self.assertEqual(report["summary"]["controlSuccessful"], 0)
        self.assertEqual(report["summary"]["statuses"], dict(error=1, missing=1))


if __name__ == "__main__":
    unittest.main()
