# Vorsichtige Korrekturen und Abschluss mit offenen Stellen

Stand: 22. Oktober 2026. Fortsetzung der [gemeinsamen Bewertung](FEHLERMODELL-GEMEINSAM.md).

## Verhalten der App

Nach einer Prüfung steht bei den Hinweisen **Für heute abschließen**. Die App
erklärt: „Ich kann nicht jede Stelle sicher prüfen. Meine Hinweise können sich
irren. Du darfst deinen Text auch mit offenen Stellen speichern.“

Der Knopf speichert den aktuellen Text, auch wenn er nach der Prüfung nochmals
geändert wurde. Offene Hinweise sind keine bestätigten Fehler. Ihr Stand und
noch nicht geprüfte Änderungen werden beim Eintrag vermerkt. Die Gefühlsauswahl
bleibt verpflichtend, sofern sie eingeschaltet ist. Die normale Belohnung hängt
nicht vom Abarbeiten aller Hinweise ab. Die Abschlussmeldung behauptet auch bei
null gefundenen Hinweisen keine Fehlerfreiheit. Abbruch des Gefühlsdialogs lässt
den Entwurf und die Abschlussmöglichkeit erhalten; Doppelklick speichert nicht
zweimal. Auch eine fehlgeschlagene oder übersprungene KI-Prüfung blockiert den
Abschluss nicht.

Dieses Verhalten ist bereits in der App umgesetzt. Der folgende numerische
BM-Filter ist weiterhin ein separater Forschungsversuch, kein bereits in die
App eingebauter Prüfdienst.

## Vorab festgelegter Filtervergleich

Der einfache Filter ändert die BM-Rangfolge nicht. Er bietet den ersten der fünf
Kandidaten nur an, wenn sein Kostenabstand sowohl zum nächsten anderen
Kandidaten als auch zur unveränderten Eingabe groß genug ist:

`Abstand = min(Kosten zweiter Kandidat, Kosten Original) − Kosten erster Kandidat`

Ist der erste Kandidat die Eingabe selbst, lautet die Entscheidung Beibehalten.
Fehlen endliche Originalkosten oder ist der Abstand zu klein, lautet sie
Enthaltung. Diese Kostenabstände sind keine kalibrierten Wahrscheinlichkeiten.
Beibehalten bedeutet ebenfalls keine Bestätigung der Fehlerfreiheit.

Die Kalibrierung nutzt unverändert die 100 Fehler und 100 Kontrollen der
bisherigen Kalibrierungsgruppe. Der gemeinsame Selektor wird nicht nachtrainiert.
Die feste Schwellenliste lautet `0; 0,25; 0,5; 1; 2; 3; 4; 6; 8; 12; 16; unendlich`.

Die pragmatische Auswahl verlangt mindestens 20 angebotene Änderungen,
mindestens 95 Prozent exakte Referenztreffer unter diesen Änderungen und
höchstens ein Prozent veränderte Kontrollwörter in den Entwicklungsdaten.
Unter passenden Schwellen gewinnt die mit den meisten richtigen Änderungen,
danach weniger falschen und schließlich die kleinere Schwelle. Ohne passende
Schwelle wird nichts angeboten. Die strenge Vergleichsregel verlangt null
falsche Änderungen und maximiert dann richtige Änderungen.

Dadurch werden **vor der neuen Testauswertung** die Schwellen 2 und 3 gewählt:

| Entwicklungsregel | Schwelle | Richtige / angebotene Änderungen | Veränderte Kontrollen / 100 |
| --- | ---: | ---: | ---: |
| Pragmatisch | 2 | 28 / 29 | 0 |
| Streng | 3 | 16 / 16 | 0 |

95 Prozent sind hier eine Auswahlvorgabe für eine kleine Entwicklungsstichprobe,
keine zugesicherte Quote neuer Vorschläge und keine psychologisch begründete
Grenze für Frustration. Das künstliche 50/50-Verhältnis von Fehlern und
Kontrollen entspricht nicht der natürlichen Fehlerhäufigkeit in Tagebüchern.

Für den neuen Vergleich werden weitere 200 Fehler und 200 Kontrollwörter per
festem Hash ausgewählt. Keine dieser Positionen war in den bisherigen Mini-,
Kontext- oder gemeinsamen Tests enthalten. Alle stammen weiterhin aus der
bekannten Gruppe von 39 Testkindern und denselben Erzählanlässen. Das ist ein
Test neuer Wortstellen, keine unabhängig neu erhobene Kinderstichprobe.
62 Fehlerpaare kamen im BM-Basistraining nicht vor. Originalkontexte bleiben
unverändert; Nachbarfehler werden nicht mithilfe der Referenz repariert.

Verglichen werden BM-Erstvorschlag, BM mit Schwelle 2, BM mit Schwelle 3,
der unverändert eingefrorene gemeinsame Selektor mit seiner früheren Schwelle 4
und alles beibehalten. Alle verwenden dieselben Kandidaten und Positionen.

## Ergebnisse

Auf den 400 neuen Positionen ergeben sich folgende unveränderten Referenzwerte:

| Verfahren | Richtig korrigiert / 200 Fehler | Enthaltung bei Fehlern | Veränderte Kontrollen / 200 | Enthaltung bei Kontrollen | Richtige / angebotene Änderungen |
| --- | ---: | ---: | ---: | ---: | ---: |
| BM-Erstvorschlag | 140 | 0 | 1 | 0 | 140 / 163 |
| BM, pragmatische Schwelle 2 | 55 | 107 | 0 | 1 | 55 / 55 |
| BM, strenge Schwelle 3 | 28 | 134 | 0 | 1 | 28 / 28 |
| Gemeinsamer Selektor, frühere Schwelle 4 | 20 | 130 | 0 | 9 | 20 / 20 |
| Alles beibehalten | 0 | 0 | 0 | 0 | 0 / 0 |

Der pragmatische BM-Filter liefert in dieser Stichprobe deutlich mehr richtige
Vorschläge als die strengeren Varianten, ohne eine beobachtete falsche Änderung.
Alle 55 Vorschläge wurden zusätzlich im ursprünglichen Wortfenster gelesen und
sind dort als Einzelwortkorrekturen plausibel. Beispiele sind
`Froch → Frosch`, `Rucksak → Rucksack` und `wen → wenn` im passenden Kontext.
Umliegende Grammatik wird dadurch nicht automatisch richtig.

Die 55 Änderungen betreffen 41 verschiedene Eingabe-Zielwort-Paare aus Texten
von 30 Kindern. 14 korrigieren nur Groß-/Kleinschreibung, 41 andere Schreibungen.
Es bleibt eine kleine, nicht vollständig unabhängige Stichprobe. Null
beobachtete falsche Änderungen bedeutet keine Garantie für zukünftige Texte.

Die Abdeckung beträgt lediglich 55/200, also **27,5 Prozent der Referenzfehler**.
107 Fehlerstellen werden als unsicher offengelassen, 38 fehlerhafte Eingaben
bleiben als BM-Erstvorschlag unverändert. Diese 38 sind ausdrücklich keine
als richtig bestätigten Wörter. Von den 200 Kontrollwörtern bleiben 199
unverändert; bei einem enthält sich der Filter. Das Referenzziel liegt bei
192 der 200 Fehler unter den fünf Kandidaten.

Eine wichtige Grenze zeigt die nachträgliche Untergruppenbetrachtung:
Von 62 Fehlerpaaren, die im BM-Basistraining nicht vorkamen, korrigiert der
pragmatische Filter nur eines; BM ohne Filter trifft dort 33. 54 der 55
angebotenen Änderungen betreffen somit bereits im Training vorgekommene
Fehlerpaare, trotz anderer Kinder. Das Verfahren bietet vor allem bei bekannten
Schreibmustern eine vorsichtige Teilhilfe und ist kein allgemeiner Rekonstruktor
beliebig neuer Fehlerschreibungen. Diese Untergruppen wurden nur ausgewertet;
die Schwelle wurde danach nicht verändert.

**Empfehlung aus diesem Versuch:** Für einen weiteren Entwicklungsprototyp ist
der einfache BM-Filter mit Schwelle 2 gegenüber der komplexeren gemeinsamen
Bewertung vorzuziehen. Er benötigt kein zusätzliches Kontext-LLM und liefert
hier mehr brauchbare Einzelwortvorschläge. Die App muss trotzdem unklaren oder
nicht gefundenen Fehlern Raum lassen und darf den Abschluss nicht von einer
vollständigen Korrektur abhängig machen. Genau dieser Abschlussablauf ist
bereits umgesetzt; die numerische Prüfmethode selbst bleibt separat.

## Prüfung und Grenzen

Sechs Datenvorbereitungstests und 13 Filtertests bestanden. Die Appänderung
bestand die vollständige Browsersuite mit 37 Tests und sechs Hilfetests.
Zusätzlich wurden die Abschlussfälle für unklare, fehlgeschlagene und
übersprungene KI-Prüfung gezielt verschärft geprüft.

Der Versuch testet weiterhin einzelne vorgegebene Wortstellen. Eigenständige
Fehlererkennung im vollständigen Text, Wortgrenzen, Grammatik, Namenerkennung
und geprüfte Lernhinweise sind damit nicht gelöst. Die Weitergabelizenz der
breiten Forschungswortliste ist weiterhin ungeklärt; sie bleibt ein lokales
Versuchsartefakt. Die App erhält deshalb nicht nebenbei diesen Prüfalgorithmus.

## Dateien und Wiederholung

- [Datenauswahl](../scripts/bm-gate-prepare.py), [Filter](../scripts/bm-cost-gate.py),
  [vollständiger Vergleich](../scripts/bm-gate-experiment.py).
- [Eingefrorene Daten](../tests/benchmark-artifacts/brillmoore/gate/manifest.json),
  [Kalibrierung](../tests/benchmark-artifacts/brillmoore/cost-gate/config.json).
- [Ergebnisse](../tests/benchmark-artifacts/brillmoore/gate/comparison.md),
  [Einzelfälle und Kennzahlen](../tests/benchmark-artifacts/brillmoore/gate/comparison.json).
- [Entscheidung vor der Testvorhersage eingefroren](../tests/benchmark-artifacts/brillmoore/gate/decision-freeze.json),
  [Abschlussprüfung](../tests/benchmark-artifacts/brillmoore/gate/completion-audit.json).
- [Manuelle Sichtung](../tests/benchmark-artifacts/brillmoore/gate/adjudication.md),
  [deskriptive Untergruppen](../tests/benchmark-artifacts/brillmoore/gate/diagnostics.json).

Die folgenden Schritte setzen die vorhandenen lokalen Daten und die
Kalibrierung voraus. Ergebnisdateien vor einer Wiederholung separat archivieren.

```powershell
py -3.11 scripts/bm-gate-prepare.py
py -3.11 scripts/bm-cost-gate.py calibrate --inputs tests/benchmark-artifacts/brillmoore/joint/devcal/context-inputs.jsonl --bm tests/benchmark-artifacts/brillmoore/joint/devcal/bm-candidates.jsonl --gold tests/benchmark-artifacts/brillmoore/joint/devcal/context.jsonl --output tests/benchmark-artifacts/brillmoore/cost-gate/config.json
node scripts/bm-run.cjs bm-gate-small tests/benchmark-artifacts/brillmoore/gate/inputs.tsv
tests/benchmark-artifacts/runtime/pyenv/Scripts/python.exe scripts/bm-expand.py --inputs tests/benchmark-artifacts/brillmoore/gate/inputs.tsv --seed-results tests/benchmark-artifacts/brillmoore/bm-gate-small.jsonl --output tests/benchmark-artifacts/brillmoore/gate-expanded
$env:BM_PREPARED = 'tests/benchmark-artifacts/brillmoore/gate-expanded'
$env:BM_CANDIDATE_POOLS = 'tests/benchmark-artifacts/brillmoore/gate-expanded/per-input-candidates.tsv'
$env:BM_INPUT_SCORE = '1'
node scripts/bm-run.cjs bm-gate-expanded
$env:BM_PREPARED = $null
$env:BM_CANDIDATE_POOLS = $null
$env:BM_INPUT_SCORE = $null
py -3.11 scripts/bm-gate-experiment.py
```

Die Integritätsprüfung hasht vorab auch Referenzdateien auf Byte-Ebene. Ihre
Zielwerte werden erst nach gespeicherten Vorhersagen aller Varianten ausgewertet.
