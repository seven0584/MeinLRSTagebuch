# Entwicklung

## Anwendung bearbeiten

`Dev/` enthält die direkt ausführbare Anwendung. Es gibt derzeit keine Paketverwaltung, keinen Bundler und keine automatisierte Testsuite. Zum Starten `Dev/Tagebuch.html` lokal mit Chrome oder Edge öffnen. Ein eigener Webserver ist für den vorgesehenen Dateibetrieb nicht erforderlich.

| Datei | Aufgabe |
| --- | --- |
| `Dev/Tagebuch.html` | Ansichten, Formulare, Hilfetexte und Laden der Skripte |
| `Dev/app/app.css` | Gestaltung und responsive Ansichten |
| `Dev/app/app.js` | Profile, Schreiben, Prüfung, Übungen, Belohnungen, Spiele, Speicherung und Sicherungen |
| `Dev/app/hunspell.js` | Gebündelte Hunspell-Laufzeit |
| `Dev/app/woerterbuch.js` | Eingebettete Wörterbuchdaten in `window.TB_DATA` |
| `Dev/app/uebungen.js` | Übungsdaten in `window.TB_PRACTICE` |
| `Dev/app/qrcode.js` | QR-Code-Erstellung für ntfy |
| `Dev/app/spiele/` | Separate Spielseiten, die als iframe geladen werden |
| `Dev/app/sounds/sfx.js` | Klangeffekte für eingebundene Spiele |

Die Reihenfolge der Skripte in der HTML-Datei beibehalten: QR-Code, Hunspell, Wörterbuch, Übungen, Anwendung. Klötzchen-Regen ist in der Hauptanwendung umgesetzt; die anderen Spiele liegen als HTML-Dateien vor.

## Prüfen

Mit installiertem Node.js lassen sich die externen JavaScript-Dateien auf Syntaxfehler prüfen (PowerShell, im Repository-Ordner):

```powershell
Get-ChildItem Dev/app -Recurse -Filter *.js | ForEach-Object {
    node --check $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Syntaxfehler: $($_.FullName)" }
}
```

Das prüft keine Browserfunktionen und keine Inline-Skripte der Spielseiten. Für funktionale Änderungen zusätzlich mit einem separaten Testordner und erfundenen Profilen prüfen:

1. Ordner auswählen, Eltern-PIN setzen, zwei Kinder anlegen und Kinder-PINs setzen.
2. Text prüfen, verbessern, mit Bild abschließen und in der Leseansicht wieder öffnen.
3. Online-Grammatikprüfung ausschalten und die lokale Prüfung ohne Internet testen.
4. Eine Übung und ein Spiel starten; Sprachausgabe und Spielzeit prüfen.
5. Speicherstatus kontrollieren, Browser schließen und gespeicherte Daten wieder öffnen.
6. Sicherung herunterladen und in einem getrennten Browserprofil wiederherstellen; Profile, Einträge und Bilder vergleichen.

## Release erstellen

`Release/Tagebuch.zip` ist ein mitgeliefertes Paket. Änderungen in `Dev/` ändern dieses ZIP nicht automatisch. Zum Erstellen einer neuen Ausgabe nur Programmdateien und die drei `LIESMICH.txt` in einen sauberen temporären Ordner `Tagebuch` kopieren. Keine Familien-Konfiguration oder Kinderordner übernehmen.

Beispiel für PowerShell aus dem Repository-Ordner; der Dateiname erhält einen Zeitstempel, damit das vorhandene ZIP erhalten bleibt:

```powershell
$releaseStage = Join-Path ([IO.Path]::GetTempPath()) ('tagebuch-release-' + [guid]::NewGuid())
$releaseApp = Join-Path $releaseStage 'Tagebuch'
New-Item -ItemType Directory -Path $releaseApp | Out-Null
Copy-Item Dev/Tagebuch.html, Dev/LIESMICH.txt -Destination $releaseApp
Copy-Item Dev/app -Destination $releaseApp -Recurse
New-Item -ItemType Directory -Path (Join-Path $releaseApp 'config'), (Join-Path $releaseApp 'kinder') | Out-Null
Copy-Item Dev/config/LIESMICH.txt -Destination (Join-Path $releaseApp 'config')
Copy-Item Dev/kinder/LIESMICH.txt -Destination (Join-Path $releaseApp 'kinder')
$releaseZip = Join-Path (Get-Location) ('Release/Tagebuch-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.zip')
Compress-Archive -Path $releaseApp -DestinationPath $releaseZip
```

Das neue ZIP vollständig in einen separaten Ordner entpacken und die Startanleitung testen. Den Archivinhalt kontrollieren, insbesondere `config/` und `kinder/`. Erst nach dieser Prüfung das gewünschte Paket als `Release/Tagebuch.zip` übernehmen. Lizenzhinweise bei Weitergabe berücksichtigen; siehe [Drittanbieter](DRITTANBIETER.md).

## Git-Workflow

Vor jedem Commit `git status` und die Änderungen prüfen. Programmänderungen in `Dev/`, Doku unter `docs/` und die README gemeinsam aktuell halten. Keine Laufzeitdaten hinzufügen, auch nicht mit `git add -f`.

```powershell
git diff
git add README.md docs Dev Release/Tagebuch.zip .gitignore
git diff --cached --stat
git commit -m "Beschreibe die konkrete Änderung"
git push origin main
```

Nach dem ersten Upload können Dokumentationsänderungen auch direkt über GitHub erfolgen. Für Entwicklung mit Ausführung und Tests wird weiterhin eine Arbeitsumgebung benötigt, lokal oder in einer Cloud-Umgebung. GitHub allein führt die App nicht aus.
