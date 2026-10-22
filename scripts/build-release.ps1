$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$nodePath = (Get-Command node -CommandType Application).Source
$nodeInfo = (& $nodePath -p 'JSON.stringify({version:process.version,arch:process.arch,platform:process.platform})') | ConvertFrom-Json
if ($nodeInfo.platform -ne 'win32' -or $nodeInfo.arch -ne 'x64') { throw 'Für dieses Paket wird Node.js für Windows x64 benötigt.' }
if ([int]($nodeInfo.version.TrimStart('v').Split('.')[0]) -lt 22) { throw 'Node.js 22 oder neuer ist erforderlich.' }
& $nodePath (Join-Path $PSScriptRoot 'build-help.cjs')
if ($LASTEXITCODE -ne 0) { throw 'Die Hilfe konnte nicht erzeugt werden.' }
$version = (Get-Content (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$releaseStage = Join-Path ([IO.Path]::GetTempPath()) ('tagebuch-release-' + [guid]::NewGuid())
$releaseApp = Join-Path $releaseStage 'Tagebuch'
New-Item -ItemType Directory -Path $releaseApp | Out-Null
foreach ($folder in @('Dev','scripts','runtime','docs')) { New-Item -ItemType Directory -Path (Join-Path $releaseApp $folder) | Out-Null }
Copy-Item -LiteralPath (Join-Path $projectRoot 'Dev/Tagebuch.html') -Destination (Join-Path $releaseApp 'Dev')
Copy-Item -LiteralPath (Join-Path $projectRoot 'Dev/app') -Destination (Join-Path $releaseApp 'Dev') -Recurse
foreach ($file in @('start.cjs','dev-server.cjs','local-store.cjs','ai-runtime.cjs','openai-runtime.cjs','secret-store.cjs')) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $releaseApp 'scripts')
}
Copy-Item -LiteralPath $nodePath -Destination (Join-Path $releaseApp 'runtime/node.exe')
Invoke-WebRequest -Uri ('https://raw.githubusercontent.com/nodejs/node/' + $nodeInfo.version + '/LICENSE') -OutFile (Join-Path $releaseApp 'runtime/LICENSE.txt')
Copy-Item -LiteralPath (Join-Path $projectRoot 'LICENSE') -Destination $releaseApp
foreach ($file in @('BEDIENUNG.md','DRITTANBIETER.md','DATEN-UND-SPEICHERUNG.md')) {
  Copy-Item -LiteralPath (Join-Path $projectRoot ('docs/' + $file)) -Destination (Join-Path $releaseApp 'docs')
}
@'
@echo off
cd /d "%~dp0"
"runtime\node.exe" "scripts\start.cjs"
if errorlevel 1 pause
'@ | Set-Content -LiteralPath (Join-Path $releaseApp 'Start.cmd') -Encoding ascii
@"
TAGEBUCH - Windows x64, Version $version, Stand $stamp

1. Das ZIP vollständig entpacken. Den Ordner Tagebuch an einen festen,
   beschreibbaren Ort legen, z.B. Dokumente. Nicht direkt im ZIP starten.
2. Start.cmd doppelklicken. Der Browser öffnet sich automatisch.
   Das Konsolenfenster während der Nutzung offen lassen.
3. Im Elternbereich die Familie und die gewünschte Lernhilfe einrichten.
   Node.js ist enthalten; eine separate Installation ist nicht nötig.
4. Für Ollama in den Einstellungen Laufzeit und Modell herunterladen.
   Dafür ist zunächst Internet nötig. Modelle sind nicht im ZIP enthalten.
   Alternativ lässt sich ein eigener OpenAI-API-Zugang einrichten.

Die Daten entstehen beim ersten Speichern unter Tagebuch\data.
Dieses Paket enthält keine Familien- oder Kinderdaten und keine API-Schlüssel.
Zum Sichern die App beenden und den gesamten Ordner kopieren.
OpenAI-Schlüssel sind an das Windows-Benutzerkonto gebunden und müssen
auf einem anderen PC neu eingegeben werden.

Zum Beenden im Konsolenfenster Strg+C drücken.
Wenn der Browser nicht öffnet: http://127.0.0.1:8765 aufrufen.
Eine bereits laufende Tagebuch-App vor einem weiteren Start beenden.
Die HTML-Datei nicht direkt öffnen: lokale KI und Datenspeicherung
benötigen Start.cmd. Chrome oder Edge verwenden.

Enthaltene Laufzeit: Node.js $($nodeInfo.version) Windows x64.
Lizenzhinweise: LICENSE, runtime\LICENSE.txt und docs\DRITTANBIETER.md.
Weitere Bedienhinweise: docs\BEDIENUNG.md und die Hilfe in der App.
"@ | Set-Content -LiteralPath (Join-Path $releaseApp 'LIESMICH.txt') -Encoding utf8
@{version=$version;builtAt=(Get-Date -Format o);platform='win32-x64';node=$nodeInfo.version} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $releaseApp 'VERSION.json') -Encoding utf8
$releaseZip = Join-Path $projectRoot ("Release/Tagebuch-$version-Windows-x64-$stamp.zip")
Compress-Archive -LiteralPath $releaseApp -DestinationPath $releaseZip -CompressionLevel Optimal
$hash = (Get-FileHash -LiteralPath $releaseZip -Algorithm SHA256).Hash.ToLowerInvariant()
"$hash  $([IO.Path]::GetFileName($releaseZip))" | Set-Content -LiteralPath ($releaseZip + '.sha256') -Encoding ascii
Write-Output $releaseZip
Write-Output ('Stage: ' + $releaseApp)
