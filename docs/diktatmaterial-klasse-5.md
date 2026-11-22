# Geprüftes Diktatmaterial ab Klasse 5

Stand: 22. November 2026, Windows-Version 2.0.0. Die Sammlung `grade5-v1` enthält 54 neu verfasste Texte: 27 Schwerpunkte in je zwei Stufen. Sie ersetzt den früheren Lexikonauszug-Bestand auch für die Kontextsätze im Wort-Diktat.

## Inhaltliche Prüfung

Alle 54 Texte und die zugehörigen Übungsstellen wurden durch Codex redaktionell gelesen und geprüft: vollständige, eigenständig verständliche Abschnitte, vertraute Themen aus Schule, Freizeit und gemeinsamer Projektarbeit, korrekte Schreibweisen sowie eine passende Zuordnung zum Hauptschwerpunkt. Es gibt keine herausgelösten Sachbehauptungen, die Wissen aus einem nicht enthaltenen Vorabsatz voraussetzen. Die Texte wurden vollständig neu geschrieben; alte fehlerhafte Abschnitte wurden nicht lediglich mit automatischen Ersetzungen bearbeitet.

Die lokale Sprachprüfung mit LanguageTool 6.6 hat alle 54 Texte ohne Anfragefehler, unvollständige Antworten oder sprachliche Hinweise verarbeitet. Das ergänzt die redaktionelle Sichtung. Es ist weder eine externe lerntherapeutische Validierung noch ein Nachweis einer bestimmten therapeutischen Wirksamkeit. Der Prüfbericht des früheren Bestands zeigt, warum ein leerer LanguageTool-Bericht allein keine Freigabe begründet.

| Merkmal | Stufe 1 | Stufe 2 |
| --- | --- | --- |
| Texte | 27 | 27 |
| Wörter je Text | 22–28 | 27–35 |
| Typische Länge, Median | 25 Wörter | 32 Wörter |
| Maximale Satzlänge | 12 Wörter | 14 Wörter |

Stufe 1 bietet kürzere, einfachere Abschnitte. Stufe 2 enthält mehr Übungsstellen und etwas umfangreichere Satzstrukturen. Beide richten sich inhaltlich an Kinder ab Klasse 5. Der passende Umfang hängt zusätzlich vom individuellen Lernstand ab; die Eltern können die Stufe fest einstellen.

## Schwerpunkte und Übungsstellen

Erfasst sind Nomen- und Kleinschreibung, s/ss/ß, i/ie, stummes h, doppelte Konsonanten einschließlich ck/tz, ä/e, äu/eu, Auslautverhärtung, f/v/w, b/d/p/q, m/n/u, ei/ie, Buchstabenreihenfolge, ausgelassene und zusätzliche Buchstaben, Kommas, Satzende, Wortgrenzen, Frage-/Ausrufezeichen, Fälle/Endungen, Verbformen, Satzbau, Wortwiederholung, ähnliche Wörter im Zusammenhang, das/dass und Getrennt-/Zusammenschreibung.

Jeder Text hat genau einen Hauptschwerpunkt, ein kurzes Lernziel und mindestens zwei ausdrücklich markierte Zielwörter, Wortgruppen oder Satzzeichen. Die vollständigen Texte und Zielstellen stehen lesbar in `content/dictations-grade5.json`. Diese Stellen sind Übungsziele; ihre Schreibgenauigkeit ist keine eigenständige Diagnose einer LRS oder eines Grammatikdefizits.

## Verbindliche Auswahl und Fortschritt

- Die Auswahl verlangt den konkreten Schwerpunkt und die passende Stufe. Zufall entscheidet nur innerhalb dieses geprüften Vorrats.
- Die automatische Schwerpunktwahl berücksichtigt die Kategorien der Tagebucheinträge der letzten 30 Tage und die Ergebnisse neuer Übungen. Fehler an den Zielstellen erhöhen den Übungsbedarf, vollständig richtig geschriebene Zielstellen senken ihn schrittweise.
- Fehlt bisher ein Schwerpunkt oder ist er bereits abgearbeitet, wählt das Kind ausdrücklich einen Schwerpunkt aus. Es wird kein angeblich persönlicher Schwerpunkt erfunden.
- Sind alle passenden Texte verwendet, darf derselbe geprüfte Text wiederholt werden. Die Oberfläche kennzeichnet diese Wiederholung. Der Schwerpunkt bleibt dabei erhalten.
- Fehlt passendes freigegebenes Material, erscheint eine Meldung. Die App wechselt nicht stillschweigend zu einer anderen Stufe, einem anderen Schwerpunkt oder zu alten Lexikonauszügen.
- Bei Satzbau und Zeichensetzung ist das Kurz-Diktat verfügbar. Ein Wort-Diktat mit unpassenden Ersatzwörtern wird nicht angeboten.
- Das Wort-Diktat enthält bis zu zehn unterschiedliche geprüfte Zielwörter mit geprüften Kontextsätzen derselben Stufe. Eigene frühere Übungswörter kommen nur vor, wenn sie mit diesem Vorrat und Schwerpunkt übereinstimmen. Noch nicht fällige persönliche Wörter werden auch über die Wortbank nicht vorzeitig gezogen.
- Die automatische Stufe steigt nach mindestens drei vollständig richtigen aktuellen Kurz-Diktaten desselben Schwerpunkts. Ergebnisse anderer Schwerpunkte, alte Lexikon-Diktate, zukünftige Einträge oder abweichende Materialfassungen geben dafür keine Gutschrift.

Alte Übungsprotokolle und historische numerische Diktat-IDs bleiben erhalten. Neue Protokolle tragen Materialversion, stabile Text-ID, Text-Prüfsumme und die Anzahl richtig geschriebener Übungsstellen. Jedes Kind verwendet weiterhin nur seine eigenen Daten.

## Technische Freigabe und Pflege

Die Quelldatei enthält pro Text eine redaktionelle Freigabe-Prüfsumme. Sie umfasst Thema, Stufe, Klasse, Schwerpunkt, Lernziel, Text und Zielstellen. `scripts/build-practice.cjs` erzeugt daraus `Dev/app/uebungen.js` und verweigert die Ausgabe bei fehlender Prüfung, veränderten Inhalten oder fehlenden Schwerpunkt-/Stufenkombinationen. Der normale Build erzeugt keine neue redaktionelle Freigabe.

Die Browser-App prüft die Freigabe nochmals mit SHA-256 und verwendet ausschließlich unveränderte Texte. Auch Änderungen an einer Zielstelle machen die alte Freigabe ungültig. Ungültiges Material führt zu einer sichtbaren Lücke statt zu einer ungeprüften Ersatzvorlage.

Bei einer Ergänzung oder Änderung müssen Text, Verständlichkeit, Zuordnung und mögliche Schreibvarianten erneut redaktionell geprüft werden. Erst danach wird die Freigabe aktualisiert. Eine größere inhaltliche Neuauflage bekommt eine neue Materialversion, damit alte Erfolge nicht einer neuen Vorlage zugerechnet werden.

## Ausgeführte Prüfungen

- Alle 54 Referenztexte: lokale Sprachprüfung, vollständige redaktionelle Sichtung und Prüfung aller Zielstellen.
- 10.800 synthetische Auswahlversuche über alle 27 Schwerpunkte und beide Stufen: passende Stufe und passender Schwerpunkt in allen Fällen. Fehlende und erschöpfte Vorräte sind zusätzlich gezielt getestet.
- Kernprüfungen: fehlende/veraltete Freigaben, doppelte IDs, Textänderungen, ungültige Zielstellen, echte Fundstellen von das/dass, Unicode, eingefügte Zeichen und Wörter, Wortgrenzen, Satzbau sowie versionsgebundener Fortschritt.
- Browserprüfungen: neue Kinder ohne Vorgeschichte, Wort- und Kurz-Diktat, Wiedervorlage, Wiederholungen, gesperrtes Material, alte Protokolle, Kinderwechsel, lokale Verarbeitung und Bildschirmbreiten 390/1280 Pixel.

Die Vorlagen gelangen beim Üben weder an Ollama noch an OpenAI oder LanguageTool. Die Sprachausgabe übernimmt weiterhin die im Browser verfügbare deutsche Stimme.

Nachweise der Sprachprüfung: lokal unter `test-results/dictations/grade5-v1-review/`; Auswahl- und Strukturprüfung unter `test-results/dictations/2026-11-22T15-26-19.305Z/`. Die Ergebnisordner enthalten ausschließlich synthetische Daten und sind von Git ausgeschlossen.

```powershell
npm run build:practice
npm run test:dictation
npm run test:all
node scripts/audit-dictations.cjs
```
