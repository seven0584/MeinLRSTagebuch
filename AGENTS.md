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

Bei Änderungen an der Bedienung auch die eingebaute Elternhilfe und, soweit für Kinder relevant, die Kinderhilfe in `Tagebuch.html` sowie die README aktualisieren. Die Glocken-Historie ersetzt diese Hilfetexte nicht. Anleitungen und Schritte unter „Probleme lösen“ müssen die aktuelle Oberfläche beschreiben.

`app/changelog-data.js` wird aus `CHANGELOG.md` generiert. Bei einer App-Veröffentlichung die Historie mit `node scripts/prepare-update.cjs` aktualisieren und zusammen mit dem Update-Manifest committen. Bestehende Überschriften in `CHANGELOG.md` möglichst stabil halten: Ihre Kennungen bestimmen den gespeicherten Lesestand der Glocke.

Die Windows-App unter `Dev/` verwendet dagegen die Version in `package.json` und wird mit `scripts/build-release.ps1` als portables Windows-Paket gebaut. Ihre Materialfreigaben prüft `node scripts/build-practice.cjs`, ihre technische Testsuite `npm run test:all`. Die bisherige Datei-Version im Hauptordner hat weiterhin einen eigenen Versionsstand und ein eigenes Update-Manifest. Änderungen an ihrer generierten Historie ebenfalls mit einer erhöhten Datei-Version und neuem Manifest veröffentlichen; den lokalen Windows-Server nicht über ihren In-App-Updater verteilen.
