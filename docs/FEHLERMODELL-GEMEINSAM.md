# Gemeinsame Bewertung von Schreibfehlern und Satzkontext

Stand: 22. Oktober 2026. Fortsetzung des [Kontextvergleichs](FEHLERMODELL-KONTEXT.md).
Dieser Entwicklungsversuch bleibt außerhalb der Kinder-App.

## Versuchsaufbau

Die bisherigen Basismodelle bleiben unverändert: Brill & Moore und das
statistische Trigramm verwenden ausschließlich Texte der ursprünglichen 175
Trainingskinder. Von den 37 ursprünglichen Entwicklungskindern werden 20 per
festem Hash dem neuen Selektortraining und die übrigen 17 der Kalibrierung
zugeteilt. Keine dieser Gruppen überschneidet sich mit den 39 Testkindern.

| Verwendung | Fehler | Kontrollwörter | Kinder |
| --- | ---: | ---: | ---: |
| Gemeinsame Gewichte lernen | 200 | 200 | 20 |
| Enthaltungsschwelle wählen | 100 | 100 | 17 |
| Neue Wortstellen testen | 100 | 100 | 39 |

Die 800 Positionen wurden vor der Kandidatenberechnung anhand eines festen
Hashs ausgewählt und mit Prüfsummen eingefroren. Alle früheren Kontextpositionen
sind ausgeschlossen; der neue Test schließt außerdem sämtliche früheren
Mini-Testpositionen aus. Die neuen Teststellen stammen trotzdem aus der bereits
betrachteten Population und denselben Erzählanlässen. Das ist kein unabhängig
neu erhobener Praxistest. 32 der 100 Testfehlerpaare waren im Basistraining nicht
vorhanden.

Kontrollwörter entsprechen der originalen orthografischen Zielannotation;
umgebende Sätze können trotzdem Fehler enthalten. Das künstliche Verhältnis
von 50 Prozent Fehlern zu 50 Prozent Kontrollen bildet keinen natürlichen
Tagebuchtext ab. Nachbarwörter werden nicht mit Zielannotationen repariert.

## Modell und Entscheidung

Die Kandidatensuche verwendet unverändert das breite Lexikon und den festen
Vorfilter des vorherigen Versuchs. Der Selektor erhält die fünf besten
Brill-&-Moore-Vorschläge sowie ausdrücklich die unveränderte Eingabe. Das
richtige Zielwort wird nicht nachträglich in eine Kandidatenliste aufgenommen.

Ein bedingtes loglineares Modell lernt sieben gemeinsame Gewichte:

1. Brill-&-Moore-Kosten relativ zum besten Wortkandidaten.
2. Trigramm-Kontextwert relativ zur unveränderten Eingabe.
3. Ob überhaupt eine Änderung vorgeschlagen wird.
4. Zeichenabstand, geteilt durch die größere Wortlänge.
5. Ob ausschließlich Groß-/Kleinschreibung geändert wird.
6. Wortprior relativ zur Eingabe.
7. Ob für die unveränderte Eingabe keine endlichen BM-Kosten verfügbar sind.

BM-Kosten enthalten bereits einen Wortprior. Das zusätzliche Priormerkmal
erlaubt eine gelernte Umgewichtung; es ist kein unabhängiges zweites Indiz.
Die unveränderte Eingabe wird separat mit derselben BM-Originalmethode bewertet.
Bekannte Wörter behalten ihren globalen Prior. Für unbekannte Eingaben gilt
der kleinste globale Prior, im verwendeten Lexikon der additiv geglättete
Prior eines ungesehenen Wortes. Fehlt trotzdem ein endlicher Berechnungspfad,
wird dokumentiert `maximale ausgegebene Kosten + 5` mit einem eigenen
Fehlend-Merkmal verwendet. Dadurch bleiben Beibehalten und fehlende Kandidaten
unterschiedliche Zustände.

Trainiert wird bedingte Softmax-Kreuzentropie pro Wortposition, mit 500 festen
Gradientenschritten, Lernrate 0,15 und L2-Regularisierung 0,01. Merkmale werden
nur anhand der Fit-Daten über ihren quadratischen Mittelwert skaliert.
Ist das Ziel nicht auswählbar, wird die Position nicht zum Gewichtetraining
verwendet; in den Testwerten bleibt sie vollständig enthalten.

Verglichen werden BM-Erstvorschlag, alles beibehalten, der gemeinsame Selektor
ohne zusätzliche Schwelle und derselbe Selektor mit einer Kalibrierungsschwelle.
Die feste Schwellenliste lautet `0; 0,25; 0,5; 1; 2; 4; 8; 16; unendlich`.
Gewählt wird zuerst die kleinste Zahl falscher Änderungen, danach die größte
Zahl richtiger Änderungen, danach die kleinere Schwelle. Deshalb kann ehrliche
vollständige Enthaltung entstehen. Die Schwelle prüft den Abstand zwischen dem
besten und zweitbesten Wort, nicht nur den Abstand zur Originaleingabe.
Eine als beste Option beibehaltene Eingabe bleibt Beibehalten. Nur vorgeschlagene
Änderungen können durch die Schwelle zur Enthaltung werden.

Die Vorhersage liest keine Fit-, Kalibrierungs- oder Testziele. Gewichte,
Sprachmodellzustand und Quellprüfsummen werden vor der Testauswertung gespeichert.
Weder die Scores noch ihre Abstände sind kalibrierte Wahrscheinlichkeiten.

## Ergebnisse

Alle Varianten wurden auf denselben 200 neuen Positionen mit identischen
Kandidaten ausgewertet. Es gibt keine fehlenden oder technisch ungültigen
Entscheidungen. Die Referenz liegt bei 99 der 100 Fehler unter den fünf
BM-Kandidaten. „Richtig“ bedeutet weiterhin exakte Zielannotation.

| Verfahren | Richtig korrigiert / 100 Fehler | Enthaltung bei Fehlern | Kontrollwörter verändert / 100 | Enthaltung bei Kontrollen | Richtige / angebotene Änderungen |
| --- | ---: | ---: | ---: | ---: | ---: |
| Brill & Moore, erster Vorschlag | 77 | 0 | 0 | 0 | 77 / 86 |
| Alles beibehalten | 0 | 0 | 0 | 0 | 0 / 0 |
| Gemeinsam, ohne zusätzliche Schwelle | 65 | 0 | 3 | 0 | 65 / 81 |
| Gemeinsam, Entwicklungsschwelle 4 | 17 | 61 | 0 | 3 | 17 / 17 |

**Die gemeinsame Rangfolge verbessert die Korrektur hier nicht.** Ohne Schwelle
geht die Zahl richtiger Fehlerkorrekturen von 77 auf 65 zurück, während drei
zuvor richtige Kontrollwörter verändert werden. Von allen 200 Positionen trifft
der gemeinsame Selektor drei, die BM verfehlt, verfehlt aber 18, die BM trifft.
Das kleine Sprachmodell und die gemeinsamen Gewichte bieten in dieser Form
keinen belegten Vorteil als allgemeiner Korrektor.

Die vorsichtige Variante enthält sich bei 61 Fehlern und lässt weitere 22 Fehler
unverändert. Diese 22 werden nicht als korrekt bestätigt; die Referenz sagt
weiterhin, dass eine Korrektur nötig gewesen wäre. Nur 17 Fehler werden
korrigiert. Sieben dieser Korrekturen betreffen ausschließlich Groß-/Kleinschreibung,
zehn andere orthografische Änderungen. Bei den Kontrollen werden 97 unverändert
übernommen und drei offengelassen.

Die 17 angebotenen Änderungen sind sämtlich referenzrichtig und bei manueller
Sichtung im Originalkontext plausibel, darunter `fergesen → vergessen`,
`Fernster → Fenster` und `Katong → Karton`. Alle 17 waren allerdings bereits
korrekte BM-Erstvorschläge: Das Ergebnis zeigt die Wirkung eines zurückhaltenden
Filters, keine bessere Rekonstruktion dieser Wörter. Bei den 32 Fehlerpaaren,
die dem BM-Basistraining unbekannt waren, trifft BM 23, die rohe gemeinsame
Bewertung 14 und die vorsichtige Variante nur eines. Diese Untergruppe kann
Fehlerpaare enthalten, die im zusätzlichen Selektortraining vorkamen.

Die Schwelle wurde ausschließlich an den 200 Kalibrierungspositionen gewählt:
Ohne Schwelle ergeben sich 69 richtige und 13 falsche Änderungen. Schwelle 2
liefert 44 richtige und eine falsche; Schwelle 4 liefert elf richtige und keine
falsche. Höhere Schwellen liefern dort gar keine Änderung. Die vorab festgelegte
Auswahlregel wählt deshalb 4. Nach Einsicht in die Testwerte wurde weder eine
weniger strenge Schwelle gewählt noch nachtrainiert.

Die manuelle Sichtung der 16 referenzabweichenden Änderungen ohne Schwelle
findet zwölf klar unpassende Wort-/Grammatikänderungen, zwei Fehler der
Groß-/Kleinschreibung und zwei aus dem Text nicht eindeutig entscheidbare
Fälle. Beispiele sind `Du siest witzig → Du ist witzig` und
`nach eingen Minuten → nach einen Minuten`. Es handelt sich somit überwiegend
um echte Fehlkorrekturen und nicht bloß um zulässige alternative Schreibungen.
Referenzen und Messzahlen bleiben unverändert.

**Folgerung:** Es gibt einen Kandidaten für vorsichtige Teilhilfe mit geringer
Abdeckung, aber noch keinen ausreichend geprüften Korrektor für unbeaufsichtigte
Nutzung. 17 richtige Vorschläge sind eine zu kleine Beobachtungsbasis, um
Zuverlässigkeit zuzusichern. Ein nächster wissenschaftlicher Vergleich müsste
insbesondere prüfen, ob eine ebenso zurückhaltende Schwelle direkt auf den
BM-Kosten denselben Nutzen erreicht; ein Zusatznutzen des gemeinsamen Modells
ist mit diesem Versuch nicht nachgewiesen. Die App bleibt unverändert.

## Grenzen und Prüfung

Dieser Versuch bewertet weiterhin vorgegebene Wortstellen. Er entdeckt nicht
selbstständig die Fehler eines vollständigen Textes. Mehrwortkorrekturen,
Wortgrenzenfehler, Grammatikrekonstruktion, Namenserkennung und pädagogisch
geprüfte Lernhinweise sind damit nicht gelöst. Die Weitergabelizenz der breiten
Forschungswortliste bleibt ungeklärt; sie bleibt ein lokales Versuchsartefakt.

Technisch geprüft wurden acht Datenvorbereitungstests, 14 Selektortests, drei
Auswertertests und ein ausführbarer Java-Adaptertest mit mehreren Assertions. Dazu gehören getrennte
Autoren, Ausschluss alter Testpositionen, Goldunabhängigkeit der Eingabe,
unveränderliche Daten, gleiche Kandidatenkosten bei aktivierter Originalbewertung,
Schutz vor nachträglichen Wörterbuchänderungen sowie Vorhersage nach Entfernung
der Trainings- und Kalibrierungsziel-Dateien.

## Dateien und Wiederholung

- [Datenskript](../scripts/bm-joint-prepare.py), [Selektor](../scripts/bm-joint-rank.py),
  [Auswerter](../scripts/bm-joint-score.py).
- [Eingefrorenes Datenmanifest](../tests/benchmark-artifacts/brillmoore/joint/manifest.json).
- [Gelernte Gewichte und Kalibrierung](../tests/benchmark-artifacts/brillmoore/joint/model.json).
- [Auswertung](../tests/benchmark-artifacts/brillmoore/joint/comparison.md),
  [vollständige JSON-Daten](../tests/benchmark-artifacts/brillmoore/joint/comparison.json).
- [Manuelle Einordnung aller abweichenden Änderungen und 17 vorsichtigen Vorschläge](../tests/benchmark-artifacts/brillmoore/joint/adjudication.md).
- [Modell vor den Testvorhersagen eingefroren](../tests/benchmark-artifacts/brillmoore/joint/training-freeze.json).

Die Datendateien und Forschungsartefakte liegen im von Git ausgeschlossenen
Ordner `tests/benchmark-artifacts/`. Vor erneuter Ausführung Ergebnisdateien
separat archivieren; der BM-Runner überschreibt keine vorhandenen Ausgaben.

```powershell
py -3.11 scripts/bm-joint-prepare.py
node scripts/bm-build.cjs
node scripts/bm-run.cjs bm-joint-small tests/benchmark-artifacts/brillmoore/joint/inputs.tsv
tests/benchmark-artifacts/runtime/pyenv/Scripts/python.exe scripts/bm-expand.py --inputs tests/benchmark-artifacts/brillmoore/joint/inputs.tsv --seed-results tests/benchmark-artifacts/brillmoore/bm-joint-small.jsonl --output tests/benchmark-artifacts/brillmoore/joint-expanded
$env:BM_PREPARED = 'tests/benchmark-artifacts/brillmoore/joint-expanded'
$env:BM_CANDIDATE_POOLS = 'tests/benchmark-artifacts/brillmoore/joint-expanded/per-input-candidates.tsv'
$env:BM_INPUT_SCORE = '1'
node scripts/bm-run.cjs bm-joint-expanded
$env:BM_PREPARED = $null
$env:BM_CANDIDATE_POOLS = $null
$env:BM_INPUT_SCORE = $null
py -3.11 scripts/bm-joint-experiment.py
```

Der letzte Schritt trennt die bereits berechneten BM-Ergebnisse anhand der
zielwortfreien Eingabe-IDs in Phasen, trainiert das Modell und speichert
`training-freeze.json`, erzeugt die Vorhersagen und wertet anschließend aus.
Vor dem Training werden alle eingefrorenen Dateien auf Byte-Ebene gehasht,
auch die Testreferenz. Ihre Zielwerte gehen erst nach gespeicherten
Testvorhersagen in die Auswertung ein.
