# Erweiterter Wortbestand und Auswahl im Originalkontext

Stand: 22. Oktober 2026. Fortsetzung des [ersten Machbarkeitsversuchs](FEHLERMODELL-PROTOTYP.md).
Der Hauptvergleich ist abgeschlossen: breitere Wortabdeckung hilft deutlich;
die getesteten Kontextverfahren liefern noch keine verlässliche automatische Auswahl.

Die Versuche laufen getrennt von der App. Sie untersuchen Wortkandidaten und
die Entscheidung an einer vorgegebenen Wortposition. Die automatische
Fehlererkennung im vollständigen Text, gemeinsame Änderungen mehrerer Wörter,
Grammatikprüfung und kindgerechte Lernhinweise sind damit noch nicht umgesetzt.

## 1. Breiteres Lexikon: deutlicher Fortschritt bei fehlenden Wörtern

Das neue Lexikon enthält 727.145 Wortformen: eine unabhängige Wortformenliste
aus dem veröffentlichten Forschungsversuch plus die bisherigen Trainingsformen.
Keine Entwicklungs- oder Testzielwörter wurden gezielt ergänzt.

| Gleiche eingefrorene Fälle | Kleines Lexikon: Top 1 | Breites Lexikon: Top 1 | Kleines Lexikon: Top 10 | Breites Lexikon: Top 10 |
| --- | ---: | ---: | ---: | ---: |
| 200 Litkey-Fehler | 160 | 160 | 189 | 195 |
| Davon 56 neue Fehlerpaare | 37 | 39 | 45 | 51 |
| 100 DysList-Fehler | 28 | 63 | 39 | 88 |

Die Wortabdeckung steigt bei Litkey von 190 auf 196 der 200 Zielwörter und bei
DysList von 40 auf 91 der 100 Zielwörter. Eine einfache Suche nach Zeichenabstand
im selben breiten Lexikon erreicht 97/200 beziehungsweise 44/100 richtige
Erstvorschläge; das trainierte Fehlermodell bleibt ihr überlegen.

Unveränderte Gesamtwerte können einzelne Verschlechterungen verdecken: Bei den
200 Litkey-Fehlern gewinnt das breite Modell fünf richtige Erstvorschläge und
verliert fünf zuvor richtige. Bei DysList kommen 35 richtige Erstvorschläge
hinzu, ohne einen zuvor richtigen zu verlieren. Von 200 Kontrollwörtern würde
die ungeprüfte Übernahme des Erstvorschlags fünf verändern, zuvor sechs.

### Vorfilter und Priors

Ein vollständiger Scan des großen Wörterbuchs mit der Java-Referenz wäre zu
aufwendig. Der feste, vor der Auswertung gewählte Vorfilter bildet deshalb die
Vereinigung aus:

- den ersten 100 Levenshtein-Kandidaten, mit Trainingshäufigkeit und Wort als
  Gleichstandsauflösung;
- den bisherigen zehn Brill-&-Moore-Kandidaten;
- der Originalschreibung, sofern im neuen Lexikon enthalten.

Brill & Moore bewertet diese etwa 100–110 Kandidaten mit seinen unveränderten
Fehlerkosten und globalen Wortpriorwerten. Der Prior ist fest definiert als
`(Trainingshäufigkeit + 1) / (Trainingswortzahl + Lexikongröße)`; Testhäufigkeiten
werden nicht verwendet. Die eingeschränkte Kandidatenmenge wird nicht separat
renormalisiert. Ein ausführbarer Vergleich mit vollständiger Suche sichert
identische Kosten für enthaltene Kandidaten ab.

Der Vorfilter enthält alle 196 verfügbaren Litkey-Zielwörter, aber nur 89 der
91 verfügbaren DysList-Zielwörter. `fie → Vieh` und `keten → Ketten` gehen
bereits hier verloren. Diese Verluste bleiben in den Ergebnissen enthalten;
die Listen wurden nach Betrachtung der Ziele nicht nachgebessert.

Der größere Wortbestand löst nicht die Bedeutungswahl. Zusätzliche illustrative
Abfragen außerhalb der 500er-Auswertung zeigen:

| Eingabe | Kleines Lexikon: erster Vorschlag | Breites Lexikon: erster Vorschlag |
| --- | --- | --- |
| Hasen | Hause | Hasen |
| Farat | Fahrrad | Farad |
| Fogel | Vogel | Vogel |
| weisste | weißt | weiseste |
| Grumox | Guck | Grüm |

Ein gültiges Wort ist kein Beweis für das beabsichtigte Wort. Ebenso ist ein
Fantasiename nicht durch den ähnlichsten Wörterbucheintrag zu ersetzen. Das
Einwortmodell erzeugt für `weisste` weiterhin keine Mehrwortlösung „weißt du“.

## 2. Kontextversuch: feste Kandidaten statt freier Textkorrektur

Vorab ausgewählt wurden 60 Entwicklungsvorkommen (30 Fehler, 30 Kontrollen)
und 100 Testvorkommen (50 Fehler, 50 Kontrollen). Die Testfälle sind eine feste
Untermenge des ursprünglichen Mini-Versuchs; 16 Fehlerpaare darin waren im
Training unbekannt. Die Gruppen nach Kindern bleiben disjunkt.

Jede Anfrage erhält die Originalschreibung, zwölf originale Transkriptionszeilen links und
rechts sowie dieselben fünf Brill-&-Moore-Kandidaten. Diese Zeilen entsprechen
überwiegend Worttoken; die Anzeige verbindet sie mit Leerzeichen. Zulässig sind eine
Kandidatenwahl, Beibehaltung oder Enthaltung. Die Nachbarwörter werden nicht
mithilfe der Zielspalte verbessert. Transkriptionszeichen bleiben sichtbar.
Für DysList wird mangels Originalkontext kein künstlicher Satz erfunden.

Verglichen werden:

1. Der erste Vorschlag des breiten Brill-&-Moore-Modells.
2. Ein festes statistisches Trigramm, nur auf Zieltokenfolgen der Trainingskinder
   trainiert: Glättung 0,1, Rückfall auf beobachtete kürzere Historien. Es bewertet
   Kandidat und direkte Nachbarn; Annotationen unterbrechen die Historie.
   Dieser einfache Vergleich nutzt nur Sprachmodellwerte, keine kombinierte
   Kalibrierung mit den Brill-&-Moore-Fehlerkosten.
3. Qwen3 4B Instruct 2507, Q4_K_M, lokal auf CPU: Temperatur 0, Seed 42, vier
   Threads, Kontextfenster 2.048 Token. Es darf nur eine der vorgegebenen
   Möglichkeiten auswählen, keine neuen Wörter oder Erklärungen erzeugen.
4. Eine vorab festgelegte Konsensregel: Zwei Verfahren müssen dasselbe Wort
   auswählen; sonst wird die Stelle als unsicher offengelassen. Zustimmung ist
   ausdrücklich kein unabhängiger Beweis und keine kalibrierte Sicherheit.

### Technischer Vorversuch

Der ursprüngliche Qwen-Vertrag hatte zwei Felder (`decision` und `candidateId`).
Einige Antworten widersprachen sich, etwa Beibehaltung zusammen mit einer
Kandidaten-ID. Nach 28 Entwicklungsvorkommen wurde dieser technische Pilot
gesichert und beendet. Es wurden noch keine Qwen-Testantworten erzeugt.

Der Hauptlauf verwendet genau ein Enum-Feld `choice`. Daten, Kandidaten und
Modellparameter bleiben gleich. Eine zulässige Enum-Auswahl wird mechanisch in
den gemeinsamen Ergebnisvertrag überführt. Die Pilotantworten bleiben separat;
sie werden weder mit dem Hauptlauf vermischt noch semantisch repariert.

### Kontext-Ergebnisse

Alle 160 Hauptlaufantworten sind vollständig und technisch gültig. Die folgende
Tabelle zeigt ausschließlich die zuvor festgelegten 100 Testvorkommen.
„Richtig“ bedeutet exakte Referenzübereinstimmung; Enthaltungen zählen nicht als
Treffer. Die letzte Spalte bezieht sich auf alle angebotenen Änderungen in den
100 Fällen, einschließlich Änderungen an Kontrollwörtern.

| Verfahren | Richtig korrigiert / 50 Fehler | Enthaltung / 50 Fehler | Veränderte Kontrollwörter / 50 | Enthaltung / 50 Kontrollen | Richtige / angebotene Änderungen |
| --- | ---: | ---: | ---: | ---: | ---: |
| Brill & Moore, erster Vorschlag | 39 | 0 | 4 | 0 | 39 / 48 |
| Statistisches Trigramm allein | 26 | 0 | 21 | 0 | 26 / 67 |
| Qwen, eingeschränkte Auswahl | 8 | 8 | 0 | 0 | 8 / 17 |
| Konsens Brill & Moore + Trigramm | 21 | 28 | 3 | 19 | 21 / 24 |
| Konsens Brill & Moore + Qwen | 8 | 34 | 0 | 4 | 8 / 10 |

Das Zielwort liegt bei 48 der 50 Fehler bereits unter den fünf Kandidaten.
Die wesentliche Lücke ist in dieser Stichprobe daher die Auswahl, nicht allein
die Verfügbarkeit. Qwen behält 25 Fehler unverändert bei, enthält sich achtmal
und schlägt 17 Änderungen vor: acht referenzrichtig, neun abweichend. Auch ohne
Groß-/Kleinschreibung erreicht es nur 23/50 Fehler; diese Diagnose zählt unter
anderem bloß beibehaltene Groß-/Kleinschreibfehler als Treffer.

Beim Brill-&-Moore-Erstvorschlag sind fünf der 44 Änderungen an Fehlerwörtern
referenzabweichend, sechs Fehler bleiben unverändert. Seine vier Änderungen an
Kontrollwörtern betreffen ausschließlich die Groß-/Kleinschreibung. Nicht jede
dieser Referenzabweichungen ist automatisch eine schädliche Änderung; die
manuelle Einordnung steht im folgenden Abschnitt.

Konsens mit Qwen reduziert die angebotenen Änderungen von 48 auf zehn, lässt
aber zwei falsche Änderungen durch. Sechs Fehler bleiben unverändert, 34 werden
offengelassen. Die beobachteten 8/10 richtigen Änderungen belegen somit keine
ausreichende Zuverlässigkeit. Dass 50 Kontrollwörter unangetastet bleiben,
beweist ebenso wenig die Sicherheit bei anderen Texten.

Die 60 Entwicklungsfälle werden separat gespeichert: Brill & Moore trifft
57/60, das Trigramm 37/60, Qwen 37/60 mit sieben Enthaltungen. Die Konsensregeln
treffen 35/60 mit 25 Enthaltungen beziehungsweise 37/60 mit 23 Enthaltungen.
Nach Einsicht in Testantworten wurden weder Prompt noch Auswahlregeln optimiert.

**Folgerung:** Die Kandidatensuche lohnt die Weiterentwicklung. Ein einfacher
Sprachmodellwert allein und das hier getestete kleine Instruct-Modell lösen
die Auswahl nicht zuverlässig. Als nächster Entwicklungsversuch bietet sich
eine gemeinsam trainierte Bewertung aus Fehlerkosten, Sprachkontext und einer
Strafe für unnötige Änderungen an. Sie benötigt eigene Trainings- und
Entwicklungsdaten sowie einen neuen, unberührten Test. Mehrwortkorrekturen,
Fehlererkennung und geprüfte Lernhinweise bleiben gesonderte Aufgaben. Dieser
Versuch wird nicht in die Kinder-App übernommen.

## 3. Was die Referenzen belegen und was nicht

Die automatische Hauptmessung bleibt exakte Übereinstimmung mit der originalen
Zielannotation. Zusätzlich wird diagnostisch ohne Groß-/Kleinschreibung
ausgewertet. Diese zweite Zahl ist keine Bestätigung korrekter Rechtschreibung.

Litkey enthält orthografische Zielhypothesen. Ein unverändert annotiertes Wort
garantiert weder einen grammatisch korrekten Satz noch eine eindeutig
rekonstruierbare Aussage. Die manuelle Sichtung unterscheidet deshalb echte
Fehlkorrekturen, zulässige Varianten, mögliche Grammatikänderungen außerhalb der
Orthografie-Annotation und unentscheidbare Fälle.

Beispiele: `ct` muss als Cent-Zeichen nicht zwingend zu `Ct` werden; `guckt`
kann eine zulässige Alternative zur Referenz `kuckt` sein. Bei Lautmalerei
`Pam → Bam` ist die Zielhypothese nicht eindeutig. Unabhängig davon sind
Ausgaben wie `fenster → feinster` oder `ct → geht` im gezeigten Zusammenhang
klar unpassend. Die [manuelle Sichtung](../tests/benchmark-artifacts/brillmoore/context/adjudication.md)
enthält die Fälle und Quellen; gespeicherte Goldwerte werden nicht verändert.

## 4. Grenzen und technische Validierung

- Es ist ein Entwicklungsvergleich auf denselben Forschungsdaten, kein finaler
  Freigabetest und keine repräsentative Stichprobe aller Kinder mit LRS.
- Die Auswahlposition ist vorgegeben. Das eigenständige Finden der Fehler im
  vollständigen Text wird nicht gemessen. Wortgrenzen- und Mehrwortfehler sind
  weiterhin außerhalb dieses Versuchs.
- Die Wortformenliste kann seltene Wörter und Namen enthalten. Ihre genaue
  Herkunft und Weitergabelizenz ist im Forschungsrepository nicht eindeutig
  dokumentiert; sie bleibt ein lokales Versuchsartefakt. Für eine Auslieferung
  ist eine eindeutig lizenzierte Quelle nötig.
- Der Vorfilter hat bekannte Verluste. Kontextmodelle können ein fehlendes
  Zielwort nicht auswählen und sollen sich dann enthalten.
- Keine Bewertung wird als Wahrscheinlichkeit pädagogisch richtiger Hilfe
  ausgegeben. Die Qualität von Lernhinweisen wurde nicht getestet.

Die klassische Wortkandidatenberechnung mit Vorfilter benötigte für 500 Fälle
rund 65 Sekunden Suche plus 6,4 Sekunden Brill-&-Moore-Bewertung einschließlich
Initialisierung auf dem vorhandenen älteren Windows-PC. Das sind keine
belastbaren produktiven Latenzgarantien. Qwen benötigt in diesem Einzelpositions-
Versuch mehrere Sekunden pro Anfrage; eine spätere App muss den Aufwand separat
begrenzen und prüfen. Im abgeschlossenen Qwen-Hauptlauf beträgt der Median
6,45 Sekunden je Wortposition, die Summe der 160 Anfragen rund 17,5 Minuten.

Validiert wurden acht Wortauswertertests, sechs Kontextdaten-Tests, 14
Kontext-/Konsenstests und ein ausführbarer Java-Adaptertest. Der Adaptertest
prüft globale Priors, unveränderte Teilmengenkosten und die Zurückweisung von
Goldspalten oder fehlenden Kandidatenlisten. Zusätzlich liefern 100 überlappende
Eingaben im alten und neuen Standardadapter identische Kandidaten samt Kosten.

## 5. Artefakte und Wiederholung

- [Breites Lexikon: vollständige Auswertung](../tests/benchmark-artifacts/brillmoore/expanded/comparison.md)
  und [JSON](../tests/benchmark-artifacts/brillmoore/expanded/comparison.json).
- [Kontextauswertung](../tests/benchmark-artifacts/brillmoore/context/context-comparison.json),
  [manuelle Einordnung](../tests/benchmark-artifacts/brillmoore/context/adjudication.md).
- [Lexikonmanifest](../tests/benchmark-artifacts/brillmoore/expanded/manifest.json),
  [Kontextmanifest](../tests/benchmark-artifacts/brillmoore/context/manifest.json),
  [statistische Konfiguration](../tests/benchmark-artifacts/brillmoore/context/stat-manifest.json),
  [Qwen-Konfiguration](../tests/benchmark-artifacts/brillmoore/context/qwen-manifest.json).
- [Qwen-Rohantworten](../tests/benchmark-artifacts/brillmoore/context/qwen-results.jsonl),
  [technischer Pilot](../tests/benchmark-artifacts/brillmoore/context/qwen-pilot-results.jsonl).
- [Abschlussprüfung](../tests/benchmark-artifacts/brillmoore/context/completion-audit.json):
  160 eindeutige, gültige Antworten und vier unveränderte Kontextdatei-Hashes.

Ausgehend von den vorhandenen Daten und dem Build des ersten Versuchs:

```powershell
tests/benchmark-artifacts/runtime/pyenv/Scripts/python.exe -m pip install -r scripts/bm-expanded-requirements.txt
py -3.11 scripts/bm-context-prepare.py
node scripts/bm-build.cjs
node scripts/bm-run.cjs bm-context-small tests/benchmark-artifacts/brillmoore/context/inputs.tsv
tests/benchmark-artifacts/runtime/pyenv/Scripts/python.exe scripts/bm-expand.py
tests/benchmark-artifacts/runtime/pyenv/Scripts/python.exe scripts/bm-expand.py --inputs tests/benchmark-artifacts/brillmoore/context/inputs.tsv --seed-results tests/benchmark-artifacts/brillmoore/bm-context-small.jsonl --output tests/benchmark-artifacts/brillmoore/expanded-context
```

Für die breiten BM-Läufe die vorbereiteten Wörterbücher und Vorfilter explizit
auswählen. Die folgenden Standardnamen sind für den ersten Lauf vorgesehen;
vor einer vollständigen Wiederholung vorhandene Ergebnisse separat archivieren.
Der Runner überschreibt sie nicht.

```powershell
$env:BM_PREPARED = 'tests/benchmark-artifacts/brillmoore/expanded'
$env:BM_CANDIDATE_POOLS = 'tests/benchmark-artifacts/brillmoore/expanded/per-input-candidates.tsv'
node scripts/bm-run.cjs bm-expanded
$env:BM_PREPARED = 'tests/benchmark-artifacts/brillmoore/expanded-context'
$env:BM_CANDIDATE_POOLS = 'tests/benchmark-artifacts/brillmoore/expanded-context/per-input-candidates.tsv'
node scripts/bm-run.cjs bm-context-expanded
$env:BM_PREPARED = $null
$env:BM_CANDIDATE_POOLS = $null
py -3.11 scripts/bm-expanded-score.py
py -3.11 scripts/bm-context-rank.py rank --training tests/benchmark-artifacts/brillmoore/context/train-sequences.jsonl --inputs tests/benchmark-artifacts/brillmoore/context/context-inputs.jsonl --candidates tests/benchmark-artifacts/brillmoore/bm-context-expanded.jsonl --out tests/benchmark-artifacts/brillmoore/context
node scripts/bm-context-qwen.cjs
py -3.11 scripts/bm-context-rank.py consensus --inputs tests/benchmark-artifacts/brillmoore/context/constrained-inputs.jsonl --first tests/benchmark-artifacts/brillmoore/context/bm-top1-results.jsonl --second tests/benchmark-artifacts/brillmoore/context/qwen-results.jsonl --output tests/benchmark-artifacts/brillmoore/context/consensus-bm-qwen.jsonl
py -3.11 scripts/bm-context-rank.py consensus --inputs tests/benchmark-artifacts/brillmoore/context/constrained-inputs.jsonl --first tests/benchmark-artifacts/brillmoore/context/bm-top1-results.jsonl --second tests/benchmark-artifacts/brillmoore/context/stat-results.jsonl --output tests/benchmark-artifacts/brillmoore/context/consensus-bm-stat.jsonl
py -3.11 scripts/bm-context-rank.py evaluate --gold tests/benchmark-artifacts/brillmoore/context/context.jsonl --inputs tests/benchmark-artifacts/brillmoore/context/constrained-inputs.jsonl --predictions tests/benchmark-artifacts/brillmoore/context/bm-top1-results.jsonl tests/benchmark-artifacts/brillmoore/context/stat-results.jsonl tests/benchmark-artifacts/brillmoore/context/qwen-results.jsonl tests/benchmark-artifacts/brillmoore/context/consensus-bm-stat.jsonl tests/benchmark-artifacts/brillmoore/context/consensus-bm-qwen.jsonl --out tests/benchmark-artifacts/brillmoore/context
```

Der Qwen-Runner setzt nur Checkpoints mit identischem Eingabe-/Konfigurations-
Fingerprint fort. Für einen neuen unabhängigen Lauf bestehende Antworten und
Manifest separat archivieren. Alle heruntergeladenen Daten und Rohantworten
liegen im von Git ausgeschlossenen Artefaktordner.
