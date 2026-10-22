# Unveränderte Brill-&-Moore-Referenz

`node scripts/bm-build.cjs` lädt den gepinnten Quellstand und die drei POM-Abhängigkeiten, prüft die JAR-SHA256 und kompiliert mit `javac --release 8`. Es installiert nichts systemweit. `BM_JAVAC` und `BM_JAVA` können andere vorhandene Java-Pfade angeben. Standard ist das vorhandene Microsoft JDK 11.0.22.

Quelle: https://github.com/adrianeboyd/BrillMooreSpellChecker, Revision `59e7af3aba2a784f72e033fc281e52d5a61ffa2a`, Apache-2.0. Die Originalquellen bleiben unverändert in `tests/benchmark-artifacts/brillmoore/reference`. Das erzeugte `build-manifest.json` protokolliert Quell- und Dependency-Hashes, Compilerargumente, Java-Pfad und vollständigen Classpath. Die Dependency-POMs liegen neben den JARs; Lizenztexte sind außerdem in den JARs enthalten. Der Benchmarkordner ist git-ignoriert.

Aus PowerShell im Repository:

```powershell
node scripts/bm-build.cjs
$bm = Get-Content tests/benchmark-artifacts/brillmoore/build-manifest.json -Raw | ConvertFrom-Json
& $bm.java '-Dfile.encoding=UTF-8' '-Duser.language=de' '-Duser.country=DE' '-cp' $bm.classpath BmBenchmark train.tsv dict.tsv inputs.tsv
```

Die Dateien sind UTF-8 ohne BOM. Training: `Fehlschreibung TAB Zielwort TAB Anzahl` (Anzahl optional). Wörterbuch: `Wort TAB Prior` (Prior optional, dann 1). Inferenz: ausschließlich `ID TAB Eingabe`, ohne Zielwort. Leere Zeilen werden übersprungen. Priors müssen positiv und höchstens 1 sein; Duplikate im Wörterbuch werden abgelehnt.

Der Adapter trainiert einmal, ruft standardmäßig für jedes Eingabewort die Originalmethode `getRankedCandidates(input)` auf und schreibt JSONL mit `id`, `input`, `candidates[{word,cost}]`, `finiteCandidateCount`, `unavailableCount` und `elapsedMs`. Trainingszeit und feste Einstellungen erscheinen als JSON auf stderr. Window 3, minAtoA 0,8; keine zusätzlichen Einzelzeichen-Trainingspaare. Kosten werden mit voller Double-Präzision ausgegeben und Gleichstände lexikalisch nach Java-Stringvergleich geordnet. Nur höchstens zehn Kandidaten mit endlichen Kosten werden ausgegeben. Die Kosten sind keine kalibrierten Korrektheitswahrscheinlichkeiten.

Ein optionales viertes Argument enthält vorberechnete Kandidatenmengen als
`ID TAB Wort TAB Wort ...`. Dann nutzt der Adapter die Originalüberladung
`getRankedCandidates(input, restrictedDict)`. Die Teilmenge behält die globalen
Priors des Wörterbuchs; sie wird nicht renormalisiert. Fehlende Mengen und
zusätzliche Zielspalten in der Eingabedatei werden abgelehnt.
`scripts/bm-run.cjs` reicht diese Datei über `BM_CANDIDATE_POOLS` weiter;
`BM_PREPARED` wählt einen anderen vorbereiteten Datenordner. Das Verfahren und
die Vergleichszahlen stehen in [FEHLERMODELL-KONTEXT.md](../../docs/FEHLERMODELL-KONTEXT.md).

Für den gemeinsamen Selektor aktiviert `BM_INPUT_SCORE=1` im Runner die
Java-Property `-Dbenchmark.inputScore=true`. Der Adapter ergänzt dann separat
`inputCost`, `inputPrior` und `inputInDictionary`. Die unveränderte Eingabe wird
über die Originalmethode mit einer Einwortmenge bewertet, auch wenn sie nicht
unter den zehn ausgegebenen Kandidaten steht. Für unbekannte Eingaben gilt der
kleinste globale Wörterbuchprior; ein nicht endlicher Kostenpfad erscheint als
`null`. Die ursprüngliche Kandidatenliste wird dabei nicht verändert. Diese
Option ist für das additiv geglättete Forschungswörterbuch vorgesehen.

Die unveränderte Original-CLI ist ebenfalls verfügbar:

```powershell
& $bm.java '-Dfile.encoding=UTF-8' '-cp' $bm.classpath $bm.mainClass '-d' dict.tsv '-p' train.tsv '-t' original-test.tsv '-c' '10'
```

Sie erwartet im Test `Eingabe TAB Ziel TAB Anzahl`; das Ziel wird nur in die Ausgabe kopiert und nicht zur Inferenz genutzt. Sie rundet Kosten auf zwei Dezimalstellen und gibt auch unendliche Kosten aus. Ihr `-s`-Flag ist im Original wirkungslos, weil die lokale Variable `single` nicht aus den geparsten Argumenten gesetzt wird. Der Adapter repariert diesen Bug nicht und benutzt keine solche Augmentation.

## Aufwand und Funktionstests

Die Referenz baut bei jeder Abfrage den kompletten Wörterbuch-Trie erneut, besucht alle Knoten und sortiert alle Wörter. Das CLI-Flag `-c` kürzt erst anschließend die Ausgabe. Es gibt kein vorgeschaltetes Levenshtein-Pruning oder einen Ersatzalgorithmus. Laufzeiten skalieren deshalb stark mit dem Wörterbuch.

Ein Smoke-Test mit dem vollständigen mitgelieferten Aspell-Wörterbuch und den ersten drei englischen Entwicklungsfällen reproduzierte die README-Vorschläge `pumpkin`, `reorganisation`, `galaxies` auf Platz 1. Gesamtdauer einschließlich Training: 36,840 Sekunden auf dem Test-PC. Das Testziel war jeweils `BLIND`. Ein weiterer Adapter-Smoke mit denselben Wörtern, vollem Aspell-Training und einem auf neun Wörter begrenzten Wörterbuch lieferte bei zweimaliger Abfrage exakt gleiche vollständige Kandidatenarrays. Diese Tests prüfen Build und Anbindung; sie sind keine deutsche oder wissenschaftliche Qualitätsevaluation.
