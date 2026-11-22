# Tagebuch für Windows 2.0.0

Version 2.0 enthält einen überarbeiteten Schreibabschluss, geprüfte Diktate ab Klasse 5 und die optionale lokale KI-Anbindung. Das Kind bearbeitet und speichert seinen Text weiterhin selbst.

## Neu in dieser Version

- **54 eigene, redaktionell und sprachlich geprüfte Diktattexte** für 27 Fehlerschwerpunkte auf zwei Stufen. Die Auswahl bleibt beim Schwerpunkt und der Stufe. Wiederholungen und fehlendes Material werden kenntlich gemacht.
- Konkrete Übungsstellen und Fortschritt je Schwerpunkt. Auch die Wort-Diktate nutzen geprüfte Wörter und Kontextsätze. Alte Protokolle bleiben erhalten.
- **Eintrag selbst speichern:** Eine erfolgreiche Prüfung beendet den Eintrag nicht automatisch. Weitere Tagesabschnitte zählen zum Tagesziel und bringen nach den bestehenden Regeln zusätzliche Coins. Vorherige Texte desselben Tages bleiben unveränderbar lesbar.
- Lokales **gpt-oss:20b** als weitere Modelloption sowie verbesserte Einrichtung und Modellerkennung. Der Elternbereich erklärt die Einschränkungen der lokalen KI.
- Verbesserte Darstellung auf schmalen Fenstern und ein sichtbar gesperrter Speicherknopf während laufender Prüfungen.

## Download und Start

Das Windows-x64-ZIP vollständig entpacken und `Start.cmd` starten. Die benötigte Node.js-Laufzeit ist enthalten. Die Anwendung öffnet sich unter `http://127.0.0.1:8765` im Browser und speichert im eigenen Ordner `data/`.

Vor einem Update die App schließen und den bisherigen Ordner sichern. Die neue Version getrennt entpacken und den bisherigen `data/`-Ordner übernehmen. Bei älteren Datei-Versionen die Sicherungsfunktion verwenden. Ein OpenAI-Schlüssel ist an das Windows-Konto gebunden.

Ollama-Laufzeit und Modellgewichte sind **nicht** im ZIP enthalten. Sie lassen sich optional im Elternbereich herunterladen. Die Diktate brauchen keine KI und keine laufende Internetprüfung. Zum Vorlesen muss eine deutsche Browser-/Systemstimme vorhanden sein.

## Qualität und bekannte Grenzen

**230 technische Tests bestanden.** Alle 54 neuen Diktattexte wurden redaktionell gelesen; die lokale LanguageTool-Prüfung ergab keine Hinweise. Zusätzlich wurden 10.800 Auswahlfälle für alle Schwerpunkte und beide Stufen sowie gesperrte und erschöpfte Vorräte geprüft. Das ist keine externe lerntherapeutische Validierung.

Nach der Zusammenführung mit `main` bestanden zusätzlich alle 38 Kernprüfungen der bisherigen Datei-Version. Sie bleibt im Repository erhalten und erhält als Version 1.3.5 die aktuelle Änderungsübersicht. Das Windows-Paket 2.0.0 wird mit `Start.cmd` gestartet; der alte In-App-Updater installiert diesen lokalen Server nicht.

Die lokale KI kann weiterhin Fehler übersehen oder falsche Korrekturen vorschlagen. Freie lokale KI-Erklärungen bleiben für Kinder ausgeschaltet, da der Nachweis von mindestens 90 % fachlich richtigen Erklärungen nicht erbracht wurde. Wörterbuch-/Regelhinweise und geprüfte Korrekturvorschläge bleiben verfügbar. Die optional getrennte OpenAI-Anbindung benötigt einen eigenen API-Zugang und ausdrückliche Elternfreigaben.

Zum Download gehört eine SHA-256-Datei für das Windows-ZIP. Die beigefügten Quellcode-Archive von GitHub ersetzen das portable Windows-Paket nicht.

Das tatsächliche Windows-ZIP wurde nach dem Entpacken mit seiner eigenen Node.js-Laufzeit geprüft: alle 34 Programmdateien stimmen mit dem geprüften Quellstand überein, alle 54 Diktat-Freigaben sind gültig, und Auswahl sowie Auswertung eines Diktats funktionieren im isolierten Browserprofil. Der Test ergab keine Browserfehler oder externen Textanfragen.
