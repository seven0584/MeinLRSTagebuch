# Prüfbericht: Bündige Korrektur und leichterer Weltraum-Angriff

Stand: 15. Oktober 2026. Testfassung 1.3.3, Release 9, ausschließlich auf `dev`. Ausgangspunkt: Version 1.3.2, Commit `730bc65`.

## Änderungen

Überschrift und Hinweis stehen gemeinsam über der Prüfung. Textblatt und Korrekturfenster beginnen bei nebeneinander angezeigten Bereichen auf derselben Höhe. Unter 900 Pixel Fensterbreite bleiben die Bereiche untereinander.

Bei gelb markierten unbekannten Wörtern lässt „Ich brauche Hilfe → Ich glaube, meine Schreibweise stimmt“ die ausgewählte Wortstelle sofort nicht mehr blockieren. Der zusätzliche Bestätigungsschritt entfällt. Der bestehende Rückmeldungsverlauf mit beanstandeter Schreibweise und offener Prüfbitte wird weiter gespeichert. Es erfolgt keine automatische Korrektur oder Freigabe privater Texte. Bei möglichen Namen ist „Das ist ein Name“ direkt bei den Hauptaktionen erreichbar. Andere Markierungsarten behalten die bisherige Rückfrage.

Weltraum-Angriff beginnt mit 21 statt 55 Gegnern und vier statt drei Leben. Gegner bewegen sich langsamer, sinken am Rand weniger weit ab und beschleunigen am Ende nur begrenzt. In Welle 1 beginnt der Beschuss frühestens nach etwa drei Sekunden; höchstens ein langsames gegnerisches Geschoss ist gleichzeitig unterwegs. Eigene Schüsse folgen beim Halten der Leertaste schneller. Ein Treffer leert die gegnerischen Geschosse und schützt das blinkende Schiff für etwa 1,5 Sekunden. Spätere Wellen steigen schrittweise an. Eine feste Simulationsschrittweite hält das Spieltempo bei höherer Bildwiederholrate gleich.

README, Elternhilfe, Kinderhilfe, Testanleitung, Changelog, Versionsdatei und Update-Manifest sind aktualisiert.

## Ausgeführte Prüfungen

Umgebung: Linux, Node.js 24.19.0, Playwright und Chromium. Ausschließlich künstliche Profile und Texte; Onlineantworten und Stimmen simuliert.

| Prüfung | Ergebnis |
| --- | --- |
| `node --test tests/learning-core.test.cjs tests/update-core.test.cjs tests/weltraum.test.cjs` | 38 Einzeltests bestanden: 21 Fachkern-, 12 Update- und 5 Spieltests. |
| `tests/correction-browser.cjs` | Gelbe Wortstellen werden einzeln sofort freigegeben. Rückmeldungsverlauf, unveränderter Text, private Freigabe, Neuladen und Zusammenfassung beim Abschluss geprüft. Namen, Hinweise, Wort-/Satzzeichen-/Grammatikänderungen, Entwurfsspeicherung und Schutz vor veralteten Eingaben bestanden. |
| Darstellung im selben Browsertest | Bündige Oberkanten von Textblatt und Korrekturfenster bei 900, 1024 und 1280 Pixel Breite, sichtbare Hauptaktionen und kein horizontaler Überlauf geprüft. Bei 600 Pixel Breite stehen die Bereiche untereinander. Bildschirmaufnahmen in heller und dunkler Darstellung angesehen. |
| `tests/weltraum.test.cjs` | 21 zentrierte Gegner, vier Leben, Schussabstand und Schussgrenze in Welle 1, begrenztes Tempo des letzten Gegners, Dauerschießen, Trefferschutz, Wellenwechsel mit frischen Zeitgebern, Neustart und Tempo bei 60/120 Hz bestanden. |
| `tests/weltraum-browser.cjs` | Tatsächliches Spiel im Browser: Start, Pfeiltasten, gehaltene Leertaste, Treffer, Welle 2 und Neustart ohne Browserfehler bestanden. Spielansicht als Bildschirmaufnahme angesehen. |
| `tests/learning-browser.cjs` | Einrichtung, Kindertrennung, private Wortstellen, freiwillige Aufgaben, Coins, Wiederaufnahme, Sicherung/Wiederherstellung, Speicherfehler und Startprobleme bestanden. |
| `tests/learning-storage-browser.cjs` | Ordnerimport und verschlüsseltes Speichern bestanden; unvollständige und unbekannte Daten bleiben vor Schreibzugriff geschützt. |
| `tests/learning-edge-browser.cjs` | Zulässige Schreibweisen, Namen, optionale Antworten, Elternanerkennung, verspätete Onlineantworten, Profilwechsel und ältere Daten bestanden. |
| `tests/shop-browser.cjs` und `tests/speech-browser.cjs` | Shop-Speicherung, Symbole, Validierung, Kindertrennung und Neuladen sowie simulierte Windows-/macOS-Stimmenkonfiguration bestanden. |

Zusätzlich bestanden die Syntaxprüfungen für 26 JavaScript-Dateien und die eingebetteten Spielskripte sowie `git diff --check`. Historie und Manifest wurden für Version 1.3.3 mit 22 Programmdateien neu erzeugt; der anschließende Update-Test bestätigt Größen und Prüfsummen.

## Grenzen und Bereitstellung

Die Tests ersetzen keinen Bedienversuch mit einem Kind. Ob die neue Spielschwierigkeit zum jeweiligen Kind passt, muss beim Ausprobieren beurteilt werden. Hörbarer Klang, echte Windows-/macOS-Dateidialoge und echte Bildschirme mit 120 Hz wurden nicht geprüft; die Bildratenprüfung simuliert Zeitstempel. Lange Texte, große Schrift und Zoom können weiterhin Scrollen erfordern.

Rückmeldungen gelten weiterhin für die einzelne Wortstelle. Eine Änderung der Schreibweise oder ihres Satzkontexts kann eine erneute Prüfung erforderlich machen. Speicherfehler oder Browserabstürze sind kein normales Neuladen.

Bereitstellung ausschließlich auf `dev`; `main` und die automatische Update-Quelle bleiben unverändert. Vollständige Programmdateien gemäß [Testanleitung](testfassung-dev.md) übernehmen, Datenordner und Test-Browserprofil behalten. Eine Datenumstellung ist nicht nötig.
