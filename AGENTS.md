# Änderungen dokumentieren

Zu jeder Änderung an diesem Repository gehört ein Eintrag in `CHANGELOG.md` im selben Commit. Bereits veröffentlichte Einträge nicht umschreiben, außer um sachliche Fehler zu korrigieren. Neue Einträge stehen oben; zusammengehörige Änderungen können unter einem gemeinsamen datierten Eintrag stehen.

Die Änderungsübersicht richtet sich an Eltern und Lehrkräfte:

- Auf Deutsch und ohne vorausgesetztes Programmierwissen schreiben.
- Konkret erklären, was sich bei der Nutzung ändert und welchen Nutzen das hat.
- Fehlerkorrekturen anhand des vorherigen Problems und des neuen Verhaltens beschreiben.
- Erforderliche Schritte, Auswirkungen auf gespeicherte Daten und relevante Grenzen ausdrücklich nennen. Keine ungetesteten Funktionen oder Garantien behaupten.
- Auch Änderungen an Anleitungen und Projektpflege kurz erklären. Reine Dokumentationsänderungen als solche kennzeichnen; dafür keine neue App-Version erfinden.
- Programmänderungen mit der tatsächlich veröffentlichten Version aus `app/version.js` und einem Datum versehen. Datumsangaben nicht aus unbekannten früheren Veröffentlichungen ableiten.

Bei Änderungen an `Tagebuch.html` oder Dateien unter `app/` auch die Update-Veröffentlichung gemäß README vorbereiten: `release` und `version` in `app/version.js` erhöhen, `node scripts/prepare-update.cjs` ausführen und `node --test tests/update-core.test.cjs` prüfen. Manifest und Programmdateien gemeinsam veröffentlichen. Familien- und Kinderdaten niemals committen.
