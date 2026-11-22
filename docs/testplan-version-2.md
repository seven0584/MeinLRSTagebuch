# Tests für die Windows-Version 2.0

Stand: 22. November 2026. GUI- und Backendtests wurden ausgeführt und gefundene technische Fehler behoben. Fachliche Versuche mit dem tatsächlich installierten gpt-oss:20b laufen getrennt von diesen Tests. Messwerte, Befunde und Grenzen stehen im [Prüfbericht](pruefbericht-version-2-tests.md). Syntaxprüfung oder Plananzeige sind keine fachliche Prüfung.

## GUI

`npm run test:gui:v2`

Zehn Fälle, darunter zwei Bildschirmbreiten (390 und 1280 Pixel):

- Erreichtes Tagesziel, fehlerfreie Prüfung und Nachprüfung speichern nichts automatisch. Das Kind speichert per Tastatur selbst; Abbrechen der Gefühlsauswahl lässt den Text erhalten. Doppeltes Speichern erzeugt keinen zweiten Eintrag.
- Auch das Zurückstellen der letzten Markierung beendet den Abschnitt nicht automatisch.
- Während einer laufenden Nachprüfung ist das Speichern sichtbar gesperrt. Auch ein programmatischer Klick speichert dann nicht; nach Abschluss ist die bewusste Speicherentscheidung wieder möglich.
- Ein kürzerer Tageszusatz wird allein geprüft. Der alte Text bleibt unverändert, neue Coins entstehen genau einmal, Neuladen erhält beide Abschnitte und den Coinstand.
- Gespeicherte Texte sind nicht bearbeitbar. Texte von gestern und anderer Kinder erscheinen nicht in dieser Tagesansicht und erfüllen nicht das aktuelle Tagesziel. Kinderwechsel und schmale Fenster werden berücksichtigt.
- Die zusätzliche Erklärung lässt sich aufklappen, ohne einen neuen KI-Aufruf auszulösen.
- Ein fehlendes Leerzeichen nach dem Satzzeichen wird als Abstandshinweis behandelt; das korrekt geschriebene Folgewort und der ungespeicherte Originaltext bleiben erhalten.
- Die lokale KI zeigt nur einen bereits überprüften Korrekturvorschlag. Dabei wird keine freie Erklärung erzeugt und kein Originaltext geändert. Der Elternbereich nennt die Einschränkung und die geforderte Mindestqualität von 90 % fachlich richtigen Erklärungen.

Die Tests starten einen eigenen lokalen Server ohne Speicher- und KI-Backend. Frische Browserkontexte enthalten ausschließlich erfundene Profile. Modellantworten werden simuliert, externe HTTP-Anfragen blockiert. Bildschirmaufnahmen liegen danach unter `test-results/gui-v2/`. Die Tests belegen keine Modellqualität. Voraussetzung: installiertes Microsoft Edge und die Projektabhängigkeiten; alternativ `PLAYWRIGHT_CHANNEL` für einen anderen installierten Chromium-Browser setzen.

## Backend

`npm run test:backend:v2`

Sechs Fälle gegen den tatsächlichen lokalen Node-Server: gpt-oss-Einrichtung ohne Änderung gespeicherter Daten, getrennte Sitzungstoken, unveränderte Weitergabe von Denkstufe/Antwortschema/CPU-Einstellungen, fehlerhafte oder zu große Anfragen, sichtbare Laufzeitfehler und atomare Speicherung mehrerer Abschnitte mit getrennten Kinderpfaden.

Der Speicher liegt ausschließlich in einem temporären Testordner. Ollama-Start und Modellantworten sind simuliert; es werden keine Programme oder Gewichte heruntergeladen und keine echten Anbieter aufgerufen. Das Backend speichert verschlüsselte Inhalte als undurchsichtigen Text. Die Regel „alten Tagebuchtext nicht mehr bearbeiten“ gehört zur Oberfläche, ist keine serverseitige Zugriffssperre und wird deshalb im GUI-Test geprüft.

Beide technischen Gruppen zusammen: `npm run test:v2:technical`. Die bisherigen Browser-, Speicher-, OpenAI- und Fachkern-Regressionstests bleiben zusätzlich erhalten.

## Fachlicher Korrekturlauf für die Nacht

Der Korpus in `tests/fixtures/correction-corpus.de.json` enthält 54 kurze erfundene Texte in 22 Kategorien mit Referenzstellen, erlaubten Korrekturen und Kriterien für die manuelle Nachsicht. Enthalten sind ie, doppelte Konsonanten, f/v, stummes h, Umlaute, s/ss/ß, Groß-/Kleinschreibung, fehlende/zusätzliche/vertauschte Buchstaben, Kontextwörter, Satzzeichen, Abstände, wiederholte Wörter, mehrere Fehler, Emojis, Absätze, korrekte Kontrollsätze, Namen, Mehrdeutigkeit und ein früherer Fehlversuch. Absichtlich falsche Prüfhinweise prüfen, ob die KI auch widersprechen kann.

Die Sätze sind ein gemischter Regressionstest, keine blind erhobene oder extern pädagogisch validierte Stichprobe. Einige Beispiele sind aus der Entwicklung bekannt. Korpus, Auswertung und Referenzen werden nicht zum Bestehen angepasst. Erwartete Antworten und Bewertungskriterien gelangen nicht in Modellanfragen; nur die für die App üblichen Satz-/Wortinformationen und gegebenenfalls ein erfundener Nutzerhinweis werden übermittelt. Die App darf ihre eigenen Wörterbuchvorschläge verwenden.

Zusätzlich enthält `tests/fixtures/correction-transfer.de.json` 16 nach Festlegung des allgemeinen Antwortvertrags ergänzte Fälle mit neuen Wörtern. Sie prüfen die Übertragung auf dieselben Fehlermuster sowie korrekte Gegenbeispiele und einen Namen. Anwendung und Prompt werden nach Sichtung dieser Transferantworten nicht zum Bestehen angepasst.

**Freigabegrenze:** Frei erzeugte lokale KI-Erklärungen dürfen Kindern erst nach einem gesonderten Nachweis von mindestens 90 % fachlich richtigen Erklärungen angeboten werden. Ein korrekter Vorschlag, eine passende Bewertung oder gültiges JSON reichen als Nachweis nicht. Die aktuellen Versuche unterschreiten diese Anforderung; der Kinderablauf wird deshalb auf die Anzeige überprüfter Korrekturvorschläge begrenzt. Die vorhandenen Wörterbuch-/Regelhinweise und überprüfbaren Buchstabenvergleiche sind davon getrennt. Rohe Modellerklärungen im Fachlauf bleiben ausdrücklich Diagnosematerial für Entwickler.

Der Lauf hat getrennte Teile pro Testsatz:

1. **Kontrolle in der echten App:** Ein eigenes Browserprofil lädt die tatsächliche Anwendung, schreibt den Satz und wählt Prüfen. Das enthaltene Wörterbuch, lokale Regeln, die KI-Einordnung und die endgültigen Markierungen werden gemeinsam untersucht. Die Rückblickfelder bleiben leer. Exakte Markierungspositionen werden mit den Referenzstellen verglichen; breite Markierungen des ganzen Satzes zählen nicht einfach als Treffer. Namen dürfen die ausdrücklich erlaubte neutrale Rückfragemarkierung erhalten. Korrekte Kontrollsätze haben keine erwarteten Fehler.
2. **Angezeigter Korrekturvorschlag:** Der Lauf wählt die tatsächlichen Markierungen und öffnet den Korrekturvorschlag. Nur die dort angezeigte Schreibweise zählt. Eine richtige Lösung irgendwo in einer freien Erklärung genügt nicht. Fehlende und falsche Vorschläge werden getrennt gezählt. Nach Kontrolle und Anzeige muss der Originaltext unverändert sein.
3. **Optionale Einzelerklärung:** Ohne `--corrections-only` bekommt der tatsächliche Ollama-Adapter den Satz und die markierte Stelle im Modus Lösung, ohne Referenzschreibweise. Bewertung und Vorschlag werden exakt gegen die erlaubten Referenzen geprüft. Erklärungen und Rückfragen werden zusätzlich für Menschen protokolliert, auch wenn der Antwortvertrag sie ablehnt. Diese Stufe ist Diagnosematerial für Entwickler und keine Freigabe der für Kinder ausgeschalteten Funktion. Sie gibt nicht vor, den per Buchstabenvergleich formulierten Hinweis der App zu bewerten.

Die zusätzliche Ollama-Wortprüfung hat keinen vollständigen Grammatikauftrag. Satzzeichenfälle bewerten deshalb die gesamte App einschließlich ihrer Regeln. Für den Test ist LanguageTool ausgeschaltet: Es gibt keine externen Textübertragungen. Der Lauf prüft die aktuelle lokale Anbindung bis 1.800 Zeichen, nicht automatisch alle langen Tagebuchtexte und nicht die OpenAI-Cloud-Anbindung.

### Umfang anzeigen und bewusst starten

`npm run test:fach:plan` zeigt den Umfang und die Fallkennungen an, ohne Browser oder Modell zu starten. Auch `npm run test:fach` **ohne** `--execute` zeigt nur diesen Plan.

Der folgende Befehl startet einen bewussten Nachtlauf mit zwei Wiederholungen:

```powershell
npm run test:fach -- --execute --models gpt-oss:20b --execution cpu --repeat 2
```

Vorher die Windows-App über `npm run dev` starten und sicherstellen, dass der Modelldownload abgeschlossen ist. Der Fachlauf verbindet sich mit der laufenden App auf `http://127.0.0.1:8765`, startet ihre installierte lokale Ollama-Laufzeit bei Bedarf, lädt aber keine Modelle herunter. Er ändert keine gespeicherten Eltern-Einstellungen. Alle Testsätze bleiben in frischen Test-Browserkontexten; echte Tagebücher werden weder gelesen noch geschrieben. Für unverfälschte Laufzeiten währenddessen keine anderen Modellanfragen ausführen.

Alle Versuche laufen nacheinander; es gibt keine automatische Wiederholung zum Verbergen eines Fehlers und keinen automatischen Wechsel auf ein anderes Modell. Bei `--execution auto` kann die reguläre App einen CPU-Rückfall verwenden: Das ist ausdrücklich kein bestätigter GPU-Leistungsvergleich. Für den ersten Nachtlauf ist daher CPU vorgegeben. Jede Erklärung hat höchstens 180 Sekunden; die Anwendungsprüfung verwendet zusätzlich die regulären App-Zeitgrenzen. Der Gesamtumfang kann mehrere Stunden dauern; eine feste Dauer wird nicht zugesagt.

Weitere Optionen: `--models gpt-oss:20b,qwen3:8b`, `--repeat 1` bis `10`, `--case gross-oma` für einen einzelnen Fall, `--app-url http://127.0.0.1:8765` und `--timeout-ms` von 1000 bis 180000. Ein niedrigerer Timeout begrenzt den Weiterleitungsaufruf; die reguläre Oberfläche bleibt unverändert.

Die Transferprüfung für den aktuellen Kinderablauf startet ohne freie Erklärungsanfragen:

```powershell
npm run test:fach -- --execute --models gpt-oss:20b --execution cpu --repeat 1 --corrections-only --corpus tests/fixtures/correction-transfer.de.json
```

`--corpus` wählt eine andere Referenzdatei mit demselben Schema. `--corrections-only` prüft Markierungen und die tatsächlichen Korrekturvorschläge ohne isolierte Erklärungsaufrufe. Beide Optionen funktionieren auch bei der reinen Plananzeige. Bei Wiederaufnahme dieselben Optionen erneut angeben.

### Ergebnisse und Unterbrechung

Jeder Lauf bekommt einen eigenen Ordner unter `test-results/fach/`:

- `manifest.json`: Quell-/Korpus-Prüfsummen, tatsächliche Modelldigests, angeforderte Hardware, Wiederholungen und Node-Version.
- `results.jsonl`: Zwischenstand nach jedem vollständig bearbeiteten Fall, tatsächliche Markierungen und angezeigte Korrekturvorschläge, abschließende Modellantworten, Fehler und Zeiten. Interne Denktexte und Sitzungstoken werden nicht gespeichert.
- `summary.json` und `report.md`: Präzision, Erkennungsrate, Fehlalarme auf korrekten Sätzen, Ausfälle, KI-Rückfälle und Ergebnisse je Modell/Kategorie. Nicht auswertbare Versuche werden gesondert genannt und nicht als Erfolg gezählt.
- `manual-review.csv`: Bei Erklärungsdiagnosen die Erklärungen, Rückfragen und konkreten Prüfkriterien mit leeren Spalten für fachliche Richtigkeit, Kindgerechtheit, passende Regel und unbegründete Sicherheit. Mit `--corrections-only` bleibt diese Datei bis auf die Überschriften leer. Gute Formulierungen oder ein richtiges Lösungswort allein belegen keine richtige Erklärung.

Die Ergebnisordner sind von Git ausgeschlossen. Es gibt **keine automatische fachliche Freigabe**. Exitcode 0 bedeutet technisch beendeten Lauf ohne erkannte automatische Abweichung, 2 bedeutet festgestellte Abweichungen/Ausfälle, 1 einen Abbruch durch einen Start-/Infrastrukturfehler und 130 eine bewusste Unterbrechung. Die manuelle Nachsicht bleibt auch bei Exitcode 0 offen.

Strg+C beendet den Lauf. Bereits abgeschlossene Fälle bleiben erhalten. Den letzten unvollständigen Fall später erneut bearbeiten:

```powershell
npm run test:fach -- --execute --models gpt-oss:20b --execution cpu --repeat 2 --resume "test-results/fach/ORDNER-DES-LAUFS"
```

Wiederaufnahme ist nur mit identischen Quellen, Referenzen, Modellen und Optionen erlaubt. Eine Sperrdatei verhindert paralleles Schreiben. Nach einem harten Prozessabsturz kann `run.lock` zurückbleiben; vor einem gezielten Entfernen prüfen, dass der alte Lauf wirklich beendet ist. Ein beschädigtes JSONL-Journal wird nicht stillschweigend übersprungen.

Die reinen Auswertungsregeln haben eigene Tests: `npm run test:fach:scoring`. Auch sie führen keine echten Modellanfragen aus und wurden ausgeführt.
