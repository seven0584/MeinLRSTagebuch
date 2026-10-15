# Prüfbericht: Text links, Verbesserung rechts

Stand: 15. Oktober 2026. Testfassung 1.3.2, Release 8, auf `dev`. Ausgangspunkt ist Commit `3a0c2cd` mit Version 1.3.1.

## Umsetzung

Beim Schreiben bleibt das große Heft im Mittelpunkt. „Schreibideen anzeigen“ öffnet die freiwilligen Fragen; ausgeblendete Antworten bleiben erhalten und zählen mit. Nach dem Prüfen zeigt die App links den nicht bearbeitbaren Text mit anklickbaren Unterstreichungen. Rechts steht das Wort beziehungsweise der betroffene Satz oder Abschnitt zum Verbessern. Ab 900 Pixel Fensterbreite stehen die Bereiche nebeneinander, darunter untereinander.

Im Korrekturbereich erscheinen höchstens drei Aktionen gleichzeitig. „Prüfen“, gegebenenfalls „Tipp“ und „Ich brauche Hilfe“ führen zu den weiteren Möglichkeiten. Unbekannte Wörter bekommen eine gelb gepunktete Unterstreichung und eine ausdrückliche Erklärung, aber keinen geratenen Regeltipp. Das Offenlassen und das Melden einer möglichen Fehlbewertung bleiben getrennt. Private Wortstellen werden dadurch nicht automatisch geteilt.

Gültige eingegebene Korrekturen werden beim Markierungswechsel, beim Zurückgehen ins Schreibfeld, beim Verlassen der Kinderansicht und beim normalen Neuladen als Entwurf gespeichert. Die Datenstruktur, Schreibziele und Belohnungsregeln ändern sich nicht. README, beide App-Hilfen, Testanleitung und die offline verfügbare Glocken-Historie sind angepasst.

## Ausgeführte Prüfungen

Umgebung: Linux, Node.js 24.19.0, Playwright und Chromium. Verwendet wurden künstliche Profile und Texte sowie das tatsächlich mitgelieferte Wörterbuch. Onlineantworten und Stimmen wurden simuliert.

| Prüfung | Ergebnis |
| --- | --- |
| Fachkern und Updates | 33 Einzeltests bestanden: 21 für den Fachkern, 12 für Updates. Zusätzlich zum normalen Testaufruf wurden sie mit `node --test --test-isolation=none --test-reporter=tap tests/learning-core.test.cjs tests/update-core.test.cjs` einzeln ausgewiesen. |
| `tests/correction-browser.cjs` | Wort-, Satzzeichen- und mehrteilige Grammatikänderungen; „Rotze“ und „Popel“; keine falschen Regeln für unbekannte Wörter; Korrekturen in eingeklappten Antworten; unveränderbarer Text links; Tagesziel und Schutz vor veralteten Änderungen bestanden. |
| Neue Bedienabläufe im selben Browsertest | Höchstens drei Aktionen pro Schritt, beide Tippstufen, Rückmeldung zum Tipp, Offenlassen einzelner Wortstellen und keine automatische Weitergabe privater Wortstellen geprüft. Namen bleiben erreichbar. Gültige Eingaben überstehen Markierungswechsel, Rückkehr ins Heft, Verlassen der Kinderansicht und Neuladen. |
| `tests/learning-browser.cjs` | Einrichtung, Kindertrennung, private und geteilte Wortstellen, freiwillige Aufgaben, anteilige Coins, Wiederaufnahme, verschlüsselte Sicherung/Wiederherstellung, Speicherfehler und Startprobleme bestanden. Das Tipp-Beispiel verwendet einen nachvollziehbaren Großschreibungsfall. |
| `tests/learning-storage-browser.cjs` | Ordnerimport und verschlüsseltes Speichern bestanden. Unbekannte und unvollständige Daten werden vor Schreibzugriff abgewiesen. |
| `tests/learning-edge-browser.cjs` | Zulässige Schreibweisen, getrennte Namen, optionale Antworten, Elternanerkennung, verspätete Onlineantworten, Profilwechsel und ältere Daten bestanden. |
| `tests/shop-browser.cjs` und `tests/speech-browser.cjs` | Shop-Speicherung, Symbole, Validierung, Kinderwechsel und Neuladen sowie die Stimmenkonfiguration für simuliertes Windows und macOS bestanden. |
| Darstellung | Mit einem Text von etwa 50 Wörtern bei 1280, 1024 und 900 Pixel Breite stehen Text und Editor nebeneinander; die Hauptaktionen sind bei 768 Pixel Höhe sichtbar. Bei 600 Pixel Breite stehen die Bereiche untereinander, ohne horizontalen Überlauf. Bildschirmaufnahmen der Schreibansicht und der Prüfung in heller und dunkler Darstellung wurden angesehen. |
| Programmdateien | Syntax von 21 JavaScript-Dateien und `git diff --check` ohne Befund. Historie und Manifest für 1.3.2 mit 22 Programmdateien erzeugt; der Update-Test bestätigt die Prüfsummen. |

## Grenzen und Bereitstellung

Die automatischen Tests und die Sichtprüfung ersetzen keinen Bedienversuch mit einem Kind oder Elternteil. Dateiauswahldialoge und die hörbare Stimme wurden nicht an einem echten Windows-PC oder Mac geprüft. Lange Texte, größere Schrift und starker Zoom können weiterhin Scrollen erfordern. Ein Browserabsturz oder ein Speicherfehler ist kein normales Neuladen; ungesicherte Eingaben können dabei verloren gehen.

Die [Prüfhinweise zur Wörterbucheinordnung](pruefbericht-1.3.1.md) gelten weiterhin. Zurückgestellte Wortstellen können bei geändertem Satzkontext wieder prüfpflichtig werden; das Offenlassen gilt nicht pauschal für jede gleiche Schreibweise.

Bereitstellung ausschließlich auf `dev`. Die automatische Update-Suche liest weiterhin `main`. Für die Testfassung die vollständige ZIP gemäß [Testanleitung](testfassung-dev.md) verwenden; nur die Programmdateien ersetzen und Datenordner sowie Test-Browserprofil behalten.
