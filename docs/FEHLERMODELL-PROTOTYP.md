# Brill & Moore: erster lokaler Machbarkeitsversuch

Stand: 22. Oktober 2026. Der Prototyp läuft getrennt von der App und verwendet
öffentliche Forschungsdaten. Es werden keine Tagebuchtexte benötigt.

## Ergebnis

**Das trainierte Fehlermodell verbessert die Wortkandidaten gegenüber einer
einfachen Zeichenabstands-Suche deutlich. Eine zuverlässige automatische
Fehlerentscheidung ist damit noch nicht nachgewiesen.**

Alle 500 vorab ausgewählten Eingaben wurden von beiden Verfahren verarbeitet.
Die folgende Tabelle zählt korrekte Zielschreibungen einschließlich Groß- und
Kleinschreibung. Top-k bedeutet: Das annotierte Zielwort steht unter den ersten
k Kandidaten; es ist keine Wahrscheinlichkeit für eine sichere Autokorrektur.

| Testgruppe | Fälle | Zeichenabstand: Top 1 | Brill & Moore: Top 1 | Brill & Moore: Top 3 | Brill & Moore: Top 10 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Litkey-Fehler | 200 | 112 (56 %) | 160 (80 %) | 189 (94,5 %) | 189 (94,5 %) |
| Davon Fehlerpaare, die nicht im Training vorkamen | 56 | 30 (53,6 %) | 37 (66,1 %) | 45 (80,4 %) | 45 (80,4 %) |
| Zusätzliche DysList-Fehler | 100 | 21 (21 %) | 28 (28 %) | 35 (35 %) | 39 (39 %) |

Die 56 neuen Paare sind eine Teilmenge der 200 Litkey-Fälle. In dieser Teilmenge
sind zehn Erstvorschläge nur bei Brill & Moore richtig und drei nur bei der
Baseline; 27 sind bei beiden richtig, 16 bei beiden falsch. Die Stichprobe ist
klein und nach Wortvorkommen ausgewählt; daraus wird keine allgemeine
Trefferquote für freie Kindertexte abgeleitet.

Der Vorteil besteht überwiegend bei mehr als reinen Groß-/Kleinschreibfehlern:
Bei 150 solchen Litkey-Fällen sind 127 Erstvorschläge richtig, gegenüber 85 bei
der Baseline. Bei den darin enthaltenen 50 neuen Fehlerpaaren sind es 36
gegenüber 29. Solche Fälle können zusätzlich einen Großschreibfehler enthalten.

## Die wichtigsten Einschränkungen

### Bekanntes Fehlerpaar ist nicht dasselbe wie neues Kind

Die Kindergruppen sind disjunkt. Trotzdem kamen 144 der 200 Litkey-Fehlerpaare
bereits bei anderen Trainingskindern vor. Deshalb ist das Ergebnis der 56 neuen
Paare gesondert ausgewiesen. Auch Themen und Bildergeschichten überschneiden
sich. Litkey ist ein Grundschulkorpus, kein ausschließlich auf ausgeprägte LRS
begrenzter Datensatz.

### Das Wörterbuch begrenzt die erreichbare Qualität

Das Lexikon enthält 4.285 Wortformen ausschließlich aus den Trainingskindern.
Die Priorwerte stammen ebenfalls nur aus deren Wortvorkommen. Es wurden keine
Zielwörter aus Entwicklung oder Test ergänzt.

- Bei Litkey stehen 190 der 200 Zielwörter im Lexikon. Davon findet Brill & Moore
  189 unter den ersten zehn Vorschlägen; die Baseline findet 184.
- Bei DysList stehen nur 40 der 100 Zielwörter im Lexikon. Davon findet
  Brill & Moore 39 unter den ersten zehn Vorschlägen; die Baseline findet 35.

Das schlechte absolute DysList-Ergebnis ist deshalb stark durch die geringe
Wortabdeckung begrenzt. Diese bedingten Zahlen dürfen jedoch nicht an die Stelle
des Gesamtergebnisses treten: Ein fehlendes Zielwort bleibt ein Misserfolg.

### Korrekte Wörter erhalten weiterhin falsche Erstvorschläge

Von 200 unverändert annotierten Kontrollwörtern würde der rohe Erstvorschlag
bei Brill & Moore sechs verändern, bei der Baseline drei. Das ist eine Prüfung
der Kandidatenausgabe, keine gemessene Fehlalarmrate einer bereits entwickelten
Fehlererkennung.

Die sechs Brill-&-Moore-Fälle sind `Verloren` → `verloren`, zweimal `Die` → `die`,
`Labidat` → `Leider`, `lachendes` → `lachender` und `Einen` → `einen`.
Wortkontext, Satzanfang, Namen und Flexionsbezug fehlen dem Verfahren.

Eine separat ausgewertete feste Regel „Eingabe exakt im Lexikon: beibehalten“
reduziert die sechs Eingriffe auf drei. Sie verschlechtert zugleich die richtigen
Erstvorschläge auf den 200 Fehlern von 160 auf 153. Ein gültiges Wort kann im
Satz falsch sein; die Regel ist kein Beweis für eine sichere Entscheidung.
Es wurde keine Schwelle anhand der Testergebnisse angepasst.

## Zusätzliche Beispielabfragen

Diese Beispiele sind qualitative Prüfungen außerhalb der 500er-Auswertung.
Sie beeinflussten weder Training noch Parameterwahl.

| Eingabe | Erstvorschlag | Einordnung |
| --- | --- | --- |
| Farat | Fahrrad | Dieses exakte Fehler-Ziel-Paar kam im Training nicht vor. |
| Kaze | Katze | Paar war im Training enthalten. |
| Hunt | Hund | Paar war im Training enthalten. |
| Fogel | Vogel | Paar war im Training enthalten. |
| weisste | weißt | Eine Mehrwortlösung wie „weißt du“ wird vom Einwortmodell nicht erzeugt. |
| Hasen | Hause | Ungeeignete Veränderung eines gültigen Wortes; das kleine Lexikon enthält „Hasen“ nicht. |
| Grumox | Guck | Fantasie-/Eigennamen benötigen einen eigenen Schutz und eine Enthaltungsentscheidung. |
| fest@teamwolke.example | keine endlichen Kandidaten | Keine bewusste Adresserkennung; es fehlt die Abdeckung durch das Zeichenmodell. |
| 00742 | keine endlichen Kandidaten | Ebenfalls kein implementierter Schutzmechanismus. |

Zehn Eingaben des Hauptlaufs wurden in einer neuen JVM erneut abgefragt.
Alle zehn vollständigen Kandidatenlisten samt Kosten waren identisch. Das
belegt Wiederholbarkeit für diese feste Umgebung und diese Fälle, keine
plattformübergreifende Garantie für sämtliche Gleitkommawerte.

## Versuchsaufbau

- Litkey: 1.922 Dateien, 251 Kinder. Fester SHA256-basierter Split mit Seed
  `tagebuch-bm-feasibility-v1-2026-10-22`: 175 Kinder Training, 37 Entwicklung,
  39 Test. Alle Texte eines Kindes bleiben zusammen.
- Training: 19.989 Fehlervorkommen, aggregiert zu 7.421 Fehler-Ziel-Paaren mit
  Häufigkeiten. Lexikon und Wortpriorwerte berücksichtigen alle verwendbaren
  Zielwortvorkommen der Trainingskinder, auch unveränderte Schreibungen.
- Mini-Test: 200 Litkey-Fehlervorkommen, 200 unveränderte Kontrollen und 100
  DysList-Paare, durch feste Hashreihenfolge vor der Auswertung ausgewählt.
- Nur Einzelwörter mit deutschen Buchstaben. Wortgrenzen-/Mehrwortfehler,
  Interpunktion, Sonderannotation und die vorgegebenen Storynamen Lea, Lars und
  Dodo sind ausgeschlossen. Andere Namen können verbleiben. Ausgeschlossene
  Zeilen werden mit Originalwerten und Begründung gespeichert; Zeichen werden
  nicht entfernt, um Fehler vorab zu reparieren.
- DysList: 738 von 1.021 Einträgen bestehen diesen Einwortfilter; daraus stammen
  die 100 Fälle. Es gibt keine Schreiber-ID oder vollständigen Satzkontext.
  14 der 100 Paare kamen im Litkey-Training vor; 86 sind neue Paare.
- Keine nachträgliche Parameteroptimierung oder Auswahl eines besseren Splits.
  Die Entwicklungsteilmenge bleibt für spätere Verfahrensentscheidungen verfügbar.

### Vergleichsverfahren

Brill & Moore verwendet die unveränderte öffentliche Java-Referenzimplementierung
auf Revision `59e7af3aba2a784f72e033fc281e52d5a61ffa2a`.
Fenster 3, minimale Identitätswahrscheinlichkeit 0,8, keine zusätzliche
Einzelzeichen-Augmentation. Ein eigener Adapter lädt die Daten, ruft die
Original-API auf und ordnet Gleichstände nach vollständigem Kostenwert und
anschließend Wort. Unendliche Kosten werden nicht als plausible Vorschläge
ausgegeben. Eingaben des Adapters enthalten ausschließlich ID und Originalwort,
keine Zielschreibung.

Die Baseline benutzt denselben Wortbestand und dieselben Priorwerte: einfache
Levenshtein-Distanz, danach absteigende Trainingshäufigkeit, danach lexikalischer
Gleichstand. Sie ist eine einfache Referenz, kein Vergleich mit sämtlichen
Fähigkeiten von Hunspell oder LanguageTool. Sie modelliert keine eigene
Transpositionsoperation.

Die Modellkosten sind unkalibrierte negative Log-Werte. Sie sind keine
Korrektheitswahrscheinlichkeiten. Beim Original-CLI wird der Schalter `-s`
zwar eingelesen, aktiviert die Einzelzeichen-Augmentation aber nicht. Dieser
Upstream-Fehler wurde nicht verändert; der Adapter nutzt ausdrücklich dieselbe
Konfiguration ohne Augmentation.

Der Hauptlauf dauerte einschließlich rund 1,3 Sekunden Training/Initialisierung
etwa 107 Sekunden auf dem vorhandenen i7-4700MQ. Die Referenz baut für jede
Abfrage den Wörterbuch-Trie neu auf und durchsucht ihn vollständig. Größere
Wörterbücher und eine spätere laufende App benötigen daher eine eigene
Performanceprüfung. Die Baseline nutzt einen Wiederholungscache; die Laufzeiten
werden nicht als fairer Geschwindigkeitsvergleich interpretiert.

## Schlussfolgerung und nächster sinnvoller Schritt

Der Nachweis rechtfertigt die Weiterarbeit an diesem Kandidatengenerator.
Er ersetzt nicht die notwendige Fehlererkennung, Kontextbewertung,
Grammatikprüfung oder geprüfte Lernhinweise.

Zuerst sollte ein breiteres, unabhängig festgelegtes deutsches Wortformenlexikon
mit kontrollierter Laufzeit angebunden werden. Anschließend folgt ein eigener
Vergleich zur Auswahl zwischen den vorhandenen Kandidaten unter Satzkontext,
einschließlich unveränderter Eingabe und „keine verlässliche Entscheidung“.

Ein weiterer phonetischer Generator hat in diesem engen Litkey-Versuch zunächst
weniger Priorität: Bei vorhandenem Zielwort erreicht Brill & Moore bereits
189/190 Top-10-Treffer. Ein Zusatzverfahren muss seinen Nutzen insbesondere auf
neuen Fehlermustern und einem breiteren Wortbestand zeigen.

Es gibt aus diesem Versuch keine Freigabe für automatische Korrekturen oder
verbindliche Lernhinweise bei unbegleiteter Nutzung.

## Reproduzieren und nachprüfen

Voraussetzungen: Node.js 22+, Python 3.11+ und JDK 11+. Der Builder nutzt das
bereits vorhandene Microsoft-JDK. Andere Pfade lassen sich über `BM_JAVAC` und
`BM_JAVA` setzen. Downloads bleiben im ignorierten Artefaktordner; es erfolgt
keine Systeminstallation.

```powershell
py -3.11 scripts/bm-prepare.py
node scripts/bm-build.cjs
node scripts/bm-run.cjs
py -3.11 scripts/bm-evaluate.py --baseline --baseline-output tests/benchmark-artifacts/brillmoore/baseline-results.jsonl --results tests/benchmark-artifacts/brillmoore/bm-results.jsonl --output tests/benchmark-artifacts/brillmoore/comparison
py -3.11 tests/bm-evaluate.test.py
```

Der Runner überschreibt keine vorhandene Ergebnisdatei. Einen neuen Lauf mit
eigenem Namen starten, zum Beispiel `node scripts/bm-run.cjs bm-results-repeat`,
und diesen Ergebnisnamen der Auswertung übergeben. Nach dem Erstdownload kann
die Datenaufbereitung mit `--offline` laufen.

Geprüft: acht Auswertertests, drei englische Referenz-Smoke-Fälle, vollständige
500er-Ausgaben beider Verfahren, Datenhashes, disjunkte Kindergruppen und zehn
identische Wiederholungsabfragen in einer neuen JVM. Kein Appcode wurde verändert.

- [Vollständige Auswertung](../tests/benchmark-artifacts/brillmoore/comparison.md)
  und [JSON-Ergebnisse](../tests/benchmark-artifacts/brillmoore/comparison.json).
- [Datenmanifest](../tests/benchmark-artifacts/brillmoore/prepared/data-manifest.json),
  [Buildmanifest](../tests/benchmark-artifacts/brillmoore/build-manifest.json),
  [Laufmanifest](../tests/benchmark-artifacts/brillmoore/bm-results-manifest.json).
- [Brill-&-Moore-Rohantworten](../tests/benchmark-artifacts/brillmoore/bm-results.jsonl),
  [Baseline](../tests/benchmark-artifacts/brillmoore/baseline-results.jsonl),
  [zusätzliche Beispielabfragen](../tests/benchmark-artifacts/brillmoore/bm-probes.jsonl).
- [Technische Adapterbeschreibung](../scripts/brillmoore/README.md).

Quellen: [Studie von 2022 samt Auswertungscode](https://github.com/catalpa-cl/spellchecker-evaluation-german-children),
[Brill-&-Moore-Referenz](https://github.com/adrianeboyd/BrillMooreSpellChecker),
[Litkey](https://www.linguistics.rub.de/litkeycorpus/),
[DysList](https://github.com/Rauschii/DysListGerman).
Litkey-Daten: CC BY-SA 4.0, DysList-Repository: MIT, Referenz: Apache-2.0;
die Java-Abhängigkeiten und ihre Lizenzen sind im Buildmanifest dokumentiert.
