# Änderungen am Windows-Entwicklungsstand

## 22. Oktober 2026 – Windows-Testpaket 0.1.0

Dieser Entwicklungsstand wird getrennt von der auf GitHub veröffentlichten HTML-App 1.3.4 gesichert. Die Versionsnummer 0.1.0 bezeichnet das Windows-Paket und ist kein Update der HTML-App 1.3.4.

- Die Windows-App speichert Einstellungen und Tagebücher automatisch im eigenen Datenordner. Eine anfängliche Ordnerauswahl entfällt bei Start über den lokalen Server.
- Eltern können eine eigene lokale Ollama-Laufzeit und ein Modell über die App einrichten. Alternativ steht eine optionale OpenAI-API-Anbindung mit eigenem API-Schlüssel zur Verfügung. Die Einrichtung führt durch die notwendigen Schritte und Einwilligungen.
- Kinder können Korrekturen im Schreibbereich bearbeiten und Hinweise daneben lesen. Bei einer fehlgeschlagenen KI-Prüfung erscheint der Abbruchgrund; Wörterbuch und Regeln bleiben als Rückfall verfügbar. Die lokale Modellqualität und Geschwindigkeit sind weiterhin zu prüfen.
- Der Tagesabschluss fragt bis zu drei Gefühle ab und bietet anschließend Lesen oder Spielen an. Der Elternbereich erhält eine Gefühlsübersicht mit Kalender und Zeiträumen.
- Einstellungen und Belohnungen sind neu gegliedert. Kurze Hilfen, Tooltips und Verweise auf die Anleitung unterstützen die Einrichtung.
- Das Windows-x64-ZIP enthält die benötigte Node.js-Laufzeit. Nach vollständigem Entpacken startet `Start.cmd` die App im Browser. Ollama und Modellgewichte werden separat über die App heruntergeladen; persönliche Daten und Zugangsschlüssel sind nicht enthalten.
- Dokumentation, automatisierte Prüfungen und getrennte Forschungsprogramme dokumentieren die untersuchten Verfahren zur Rechtschreibkorrektur. Die experimentellen Fehlermodelle sind keine aktive Korrekturinstanz der App.

Die Daten liegen nach dem ersten Speichern unter `data/` im entpackten Programmordner. Für eine Sicherung die App beenden und den gesamten Ordner kopieren. Ein OpenAI-Schlüssel muss auf einem anderen Windows-Konto oder PC erneut eingerichtet werden.
