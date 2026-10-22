# Entwicklung

## Einheitliche Kontext-Hilfe

Jeder App-Dialog und jedes Eingabefeld erhält über `Dev/app/ui-help.js` eine per Klick und Tastatur bedienbare **?**-Hilfe. Alle Buttons erhalten eine kurze Aktionsbeschreibung als Tooltip, auch bei Tastaturfokus. Dynamische Ansichten werden ebenfalls erfasst. Neue Felder und Dialoge sollen ihre konkrete Erklärung mit `data-help-text` und das passende Kapitel mit `data-help-topic` angeben; die allgemeine Ersatzbeschreibung ist nur eine Absicherung. Neue Buttons beschreiben mit `data-tooltip`, was beim Auslösen tatsächlich passiert. Warnungen und für die Entscheidung nötige Datenschutzinformationen bleiben kurz sichtbar.

Die Dokumentation stammt aus `docs/BEDIENUNG.md`. `npm run build:help` bündelt sie als lokale Datei `Dev/app/help-content.js`; `npm run dev` aktualisiert das Bündel automatisch. Damit funktionieren die Kapitel auch ohne Internet und beim direkten Öffnen der HTML-Datei. Die Kindersicht erhält ausschließlich das Kapitel „Hilfe für Kinder“. Änderungen an den Hilfen mit `npm run test:help` prüfen. App-Bestätigungen verwenden die eigenen Dialoge statt nativer Browserbestätigungen, damit Kontext-Hilfe auch dort verfügbar ist.

## Anwendung bearbeiten

`Dev/` enthält die direkt ausführbare Anwendung. Sie braucht keine Paketinstallation und keinen Bundler. Zum Starten `Dev/Tagebuch.html` lokal mit Chrome oder Edge öffnen. Für die Windows-Entwicklung steht zusätzlich `npm run dev` mit einem ausschließlich lokal erreichbaren Server bereit. `package.json` und `package-lock.json` verwalten die Entwicklungsprüfungen; sie sind keine Laufzeitvoraussetzung für die heruntergeladene App.

| Datei | Aufgabe |
| --- | --- |
| `Dev/Tagebuch.html` | Ansichten, Formulare, Hilfetexte und Laden der Skripte |
| `Dev/app/app.css` | Gestaltung und responsive Ansichten |
| `Dev/app/app.js` | Profile, Schreiben, Prüfung, Übungen, Belohnungen, Spiele, Speicherung und Sicherungen |
| `Dev/app/mood.js` | Plattformneutraler Katalog, Gefühlsverträge, begrenzte KI-Anfrage und Kalenderaggregation |
| `Dev/app/mood-ui.js`, `mood-ui.css` | Gefühlsauswahl des Kindes, getrennte Elternübersicht und Kalenderwochenansicht |
| `Dev/app/lernhilfe.js` | Plattformneutraler Lernhilfe-Vertrag, Kontext, Verlauf, Abbruch und Antwortprüfung |
| `Dev/app/spell-review.js` | Begrenzte Rechtschreibanalyse im Textkontext, strikte Antwortprüfung und überprüfbare Buchstabenhinweise |
| `Dev/app/ai-selection.js` | Abbrechbarer serieller Vergleich lokaler Modelle auf CPU und Grafikbeschleunigung |
| `Dev/app/ollama.js` | Lokale Ollama-Anbindung für den Windows-Dev-Stand |
| `Dev/app/openai.js` | Cloud-Vertrag und Zugriff auf den lokalen OpenAI-Proxy ohne API-Schlüssel im Browser |
| `Dev/app/openai-settings.js` | Geführte OpenAI-Einrichtung, synthetischer Test und getrennte Kindertext-Freigaben |
| `Dev/app/reflection.js` | Freiwillige Fragen zum Tagesrückblick und Hinweise für Erwachsene |
| `Dev/app/settings-wizard.js` | Geführte Eltern-Einstellungen mit Schritten und direktem Themenzugriff |
| `Dev/app/local-store.js`, `scripts/local-store.cjs` | Automatischer lokaler Datenspeicher über den Windows-Dev-Server |
| `Dev/app/hunspell.js` | Gebündelte Hunspell-Laufzeit |
| `Dev/app/woerterbuch.js` | Eingebettete Wörterbuchdaten in `window.TB_DATA` |
| `Dev/app/uebungen.js` | Übungsdaten in `window.TB_PRACTICE` |
| `Dev/app/qrcode.js` | QR-Code-Erstellung für ntfy |
| `Dev/app/spiele/` | Separate Spielseiten, die als iframe geladen werden |
| `Dev/app/sounds/sfx.js` | Klangeffekte für eingebundene Spiele |

Die Reihenfolge der Skripte in der HTML-Datei beibehalten: QR-Code, Hunspell, Wörterbuch, Übungen, Lernhilfe-Kern, Rechtschreibanalyse, Modellkatalog, Gefühlskern und Gefühlsoberfläche, lokaler KI-Adapter, Ollama-Adapter, KI-Modellvergleich, lokaler Speicher-Adapter, Tagesrückblick, Anwendung, Einstellungsassistent. Klötzchen-Regen ist in der Hauptanwendung umgesetzt; die anderen Spiele liegen als HTML-Dateien vor.

Die Schreibansicht verwendet ein bearbeitbares Textfeld mit synchronisierter Markierungsebene. Hinweise und freiwilliger Tagesrückblick stehen auf breiten Bildschirmen rechts daneben; bei kleinen Ansichten ordnen sie sich unter dem Text an. Die Prüfen-Aktion steht oberhalb des Textfelds. Fundstellen lassen sich im Text auswählen und direkt ändern. Die Lernhilfe berücksichtigt eindeutig zuordenbare Änderungen derselben Fundstelle ohne vorherige erneute Gesamtprüfung. Bei mehrdeutigen Änderungen fordert sie eine neue Prüfung an. Antworten auf die freiwilligen Rückblickfragen werden gespeichert und beim Lesen angezeigt, sind aber von Rechtschreib- und KI-Prüfung ausgenommen. Auch ein Eintrag nur mit Rückblickantworten kann gespeichert werden.

## Prüfen

Für die neuen Lernhilfe-Prüfungen im Repository-Ordner mit Node.js 22 oder neuer:

```powershell
npm ci
npm test
npm run test:browser
npm run test:storage
npm run test:ai
npm run test:mood
```

Die Browsertests verwenden standardmäßig einen installierten Microsoft Edge in einem isolierten, unsichtbaren Testprofil. Mit `PLAYWRIGHT_CHANNEL` kann ein anderer installierter Chromium-Browser ausgewählt werden. Es werden erfundene Profile und simulierte Ollama-Antworten verwendet; vorhandene Browserprofile und Tagebuchdaten bleiben unberührt. Die Tests bewerten keine echte Modellqualität.

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

Den aktuellen Windows-Stand einschließlich portabler Node.js-Laufzeit mit `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build-release.ps1` paketieren. Voraussetzung auf dem Build-PC ist Node.js ab Version 22 für Windows x64; auf dem Ziel-PC ist keine Node.js-Installation nötig. Das Skript erzeugt unter `Release/` ein versioniertes ZIP mit Zeitstempel und SHA-256-Datei. Die passende Node.js-Lizenz wird von der offiziellen Quelle heruntergeladen. Nur freigegebene Programmdateien werden kopiert; `data/`, API-Schlüssel, Tests und Modelle bleiben draußen. Nach dem Entpacken startet `Start.cmd` den lokalen Server und öffnet den Browser. Ollama-Laufzeit und Modelle werden bei der Einrichtung über die App heruntergeladen.

Die folgende Anleitung beschreibt das ältere reine HTML-Paket ohne lokalen Server:

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

## Windows-Dev und spätere Plattformen

Entscheidung vom 22. Oktober 2026: Funktionale Entwicklung zunächst auf Windows-PC. Die begonnene native Mobil-Implementierung wurde verworfen. Im Projekt gibt es keine aktiven Capacitor-, Swift- oder Android-Abhängigkeiten und keine nativen Mobil-Builds. Die 20 erfundenen deutschen Evaluationsfälle wurden als plattformneutrale Daten unter `tests/lernhilfe-cases.mjs` übernommen. Lokale generierte Reste des verworfenen Vorversuchs unter `Mobile/` sind ignoriert und keine Projektquelle.

### Bereits umgesetzte Trennung

| Ebene | Zuständigkeit | Spätere Erweiterung |
| --- | --- | --- |
| Oberfläche in `app.js` | Eltern-Einrichtung, Rückfragen, Darstellung und Abschluss | Responsive Browser-/PWA-Oberfläche oder native Hülle |
| Kern in `lernhilfe.js` | Begrenzter Anfrage-/Antwortvertrag, Kontext, Verlauf, Status, Abbruch | Unverändert von einer späteren mobilen oder gehosteten Variante verwendbar |
| Adapter in `ollama.js` | Verbindung, Modellprüfung und Übersetzung in Ollama-Anfragen | Weiterer Adapter für einen eigenen Server oder eine zulässige Geräte-KI |
| Speicherung | Automatischer lokaler Dev-Speicher über einen Adapter; Datei-Betrieb und verschlüsselte Sicherungen bleiben erhalten | Andere Speicher-Adapter nach Bedarf; die übrige Speicherlogik ist noch nicht vollständig aus dem Altcode extrahiert |

Die Skripte funktionieren als klassische Browser-Skripte direkt unter `file:` und lassen sich für Node-Tests importieren. Ein späteres Framework oder ein Bundler ist damit nicht vorgegeben. Der Kern kennt weder DOM noch Windows-, Apple- oder Android-APIs und speichert keine Daten. Eine native Plattform-Anbindung wird erst dann ergänzt, wenn sie konkret entwickelt und auf echten Geräten geprüft werden kann.

### Vertrag für KI-Anbieter

Ein Adapter liefert `id`, `location` (`local`, `device` oder `online`), `status({signal})` und `explain(request, {signal})`. `createTutor({provider, allowOnline, timeoutMs, statusTimeoutMs})` führt ausschließlich den gewählten Adapter aus. Die Standardgrenzen betragen 180 Sekunden für die gesamte Lernhilfe-Anfrage und 40 Sekunden für die Statusprüfung. Ein Online-Adapter wird ohne explizites `allowOnline` bereits vor der Statusabfrage gesperrt. Aktuell wird in der Oberfläche ausschließlich Ollama angeboten und keine Online-KI-Anbindung angelegt.

Die Anfrage enthält `sentence`, `target`, `checkerHint`, `mode` (`hint`, `simpler`, `meaning`, `solution`), `question`, bis zu drei `previousAttempts` und zwei `previousReplies`. Der Kontext wird auf höchstens 700 Zeichen um die markierte Stelle begrenzt. Die Antwort enthält `assessment` (`needsChange`, `unclear`, `looksCorrect`), `explanation`, `question`, `suggestion`. Alle Felder werden geprüft; eine unsichere Antwort ohne Rückfrage wird verworfen. Eine separate Schreibweise wird nur im Modus `solution` angezeigt. Das verhindert nicht, dass ein Modell in seiner Erklärung selbst eine Schreibweise nennt.

Bei eingeschalteter Lernhilfe ruft **Prüfen** zusätzlich `review(text, candidates, {signal})` auf. `TB_SPELL_REVIEW.buildRequest` begrenzt den Haupttext auf 1.800 Zeichen ohne abgeschnittenes Schlusswort und übernimmt höchstens 20 exakt passende Wortfundstellen. Rückblickfelder und Selbstangaben werden nicht angehängt. Der strukturierte Vertrag erlaubt Teilentscheidungen mit `error`, `name`, `correct` oder `unclear` und höchstens zwölf zusätzliche Fundstellen. Unbekannte oder doppelte IDs, freie Erklärfelder, Korrekturen mit mehr als zwei Wörtern, falsche Textpositionen und überlappende Zusatzstellen werden abgelehnt. Die Anwendung prüft jedes vorgeschlagene Wort außerdem mit dem Wörterbuch und begrenzt den Abstand zur ursprünglichen Schreibweise; gültige Schreibweise allein garantiert keine passende Bedeutung. Abbruch und technische Fehler lassen die lokale Grundprüfung bestehen. Unbewertete Markierungen bleiben erhalten.

`groundedHelp` beschreibt ausschließlich direkt überprüfbare einfache Buchstabenunterschiede oder die Anfangsgroßschreibung. Es erfindet keine lautliche Begründung und erklärt einen Großbuchstaben nicht pauschal mit „Nomen“. Bis zu drei Änderungen werden mit Unicode-Positionen im ursprünglichen Wort erklärt; `editSummary` zählt Einfügen, Entfernen, Ersetzen, Groß-/Kleinschreibung und benachbarte Vertauschung. Bei einer geprüften Zusammenziehung darf der Vorschlag aus genau zwei Wörtern bestehen; die Hilfe beschreibt dann das Leerzeichen. Groß-/Kleinschreibhinweise mit gleichem Wort werden direkt aus der lokalen Regel erklärt. Das zusätzliche Fragefeld wurde aus der Oberfläche entfernt; der Adaptervertrag behält `question` für alternative Aufrufer bei. Die Strukturprüfung und diese begrenzten Hilfen ersetzen keine fachliche Modellbewertung. Zusätzliche Vertragstests: `node --test tests/spell-review.test.cjs`.

Die Modellaussage ist kein Prüfbeweis: Es werden keine Wörterbuchänderungen, Belohnungen, Korrekturen oder Erfolgseinstufungen automatisch aus `assessment` abgeleitet. Nur das Kind verändert seinen Text. Eine Stelle darf auch ohne KI offengelassen werden. Einträge mit Hilfe oder offenen Stellen werden entsprechend bezeichnet.

Vorherige Versuche werden bei unveränderten Fundstellen und eindeutig zuordenbaren Einzeländerungen weitergeführt. Bei mehrdeutigen Mehrfachänderungen wird kein Zusammenhang erfunden. Verläufe bleiben in der aktuellen Schreibsitzung und werden bei Profilwechsel nicht geteilt. Wiederholte Fehlversuche werden auch vor dem ersten Aufruf der Lernhilfe als Kontext gesammelt, soweit die Zuordnung eindeutig ist.

### Vertrag und Auswertung der Gefühlsdaten

`TB_MOOD` ist als UMD-Modul ohne DOM- oder Speicherzugriff verwendbar. `CATALOG` beziehungsweise `catalog` enthält 13 stabile IDs mit deutschem Label und Emoji, darunter `loved` mit 😍. `validateSelf` fordert ein bis drei eindeutige IDs. `validateAI` erlaubt ausschließlich `{moods, unclear}`, höchstens drei eindeutige IDs und ein Boolean; ein leeres Ergebnis muss unklar sein. Freitextbegründungen, Zitate und unbekannte IDs werden verworfen. `buildRequest(freeText)` akzeptiert ausschließlich den Freitextstring und begrenzt `text` auf 1.800 Zeichen. Die Ollama-Methode `mood(text, {signal})` verwendet den eigenen JSON-Vertrag und dieselbe lokale Modellprüfung wie die Lernhilfe. Die Prompt-Anweisung verlangt einen unsicheren Texteindruck, keine Diagnose; sie ersetzt keine fachliche Validierung der Modellantworten.

Die Elternkonfiguration `moodSharing` verwendet bei fehlendem Wert `{enabled:true, ai:true}`. Bei aktivierter Übersicht ist die Selbstauswahl vor dem Speichern verpflichtend, das Prüfen des Texts ist vorher möglich. Das Kind wird darüber informiert, welche Kategorien Eltern sehen. `draftMood` gehört zum Kindentwurf; neue Einträge speichern `mood:{self, ai:{status,moods,unclear}}` im vorhandenen Kindzustand. Rückblickantworten bleiben privat und sind weder Selbstauswahl noch KI-Eingabe. Die normalen Elternansichten enthalten keine Tagebuchtexte.

Die zusätzliche KI-Auswertung startet erst beim Speichern, nur bei eingeschalteter Übersicht, eingeschalteter KI, gewähltem Ollama-Anbieter und nicht leerem Freitext. Der Eintrag wird zunächst mit `pending` gespeichert. Das Hintergrundresultat wird `ready`, ein Fehler oder ein Ablauf der Zeitgrenze wird `error`; das Speichern hängt nicht von der KI ab. `load()` markiert beim Neuladen verbliebene `pending`-Auswertungen als `error`, ohne sie automatisch neu zu starten. Es gibt keinen Scan früherer Texte und keine Elternaktion zur erneuten Analyse eines alten Eintrags. Es werden nur Kategorien, Status und Unsicherheit gespeichert, keine zweite Kopie des analysierten Textausschnitts.

`aggregate(entries, {period, today})` verarbeitet `day`, `week`, `month` und `all`. Wochen und Monate sind die jeweils letzte abgeschlossene Kalenderperiode. Eine erste Teilwoche oder ein erster Teilmonat wird nicht als vollständiger Zeitraum ausgewertet: Der ausgewertete Zeitraum muss am oder nach dem ersten Tag mit Gefühlsdaten beginnen. Historische Einträge ohne diese Daten zählen nicht als Aufzeichnungsbeginn. `available`, `range:{start,end}`, `availableFrom` und `unavailableReason` unterstützen die Freischaltung in der Oberfläche; nicht verfügbare Zeiträume liefern keine Teilresultate. Einzelne Tage sowie der Gesamtdurchschnitt sind ohne diese Wartezeit nutzbar.

Pro Kalendertag und Quelle werden die vorhandenen IDs vereinigt und nur einmal gezählt. `self` und `ai` liefern jeweils `days`, `counts` und `percentages`; die KI enthält zusätzlich `unclearDays`, `pendingDays` und `errorDays`. Prozentwerte sind `count / days * 100`, bei fehlenden Quelltagen `null`. Mehrere Gefühle können gemeinsam auftreten, die Summe kann über 100 % liegen. Es gibt keinen Mittelwert der Gefühlspolarität und keine Neutral-Ersetzung für fehlende Angaben. Bei mehreren KI-Ständen eines Tages gilt die Priorität `ready > pending > error > off`. Der Gefühlskalender verwendet die aktuelle und bis zu sieben frühere Kalenderwochen mit Einträgen, Montag bis Sonntag und ISO-Wochenjahr, und zeigt ausschließlich Tageskategorien.

`tests/mood.test.cjs` prüft Validierung, Quellentrennung, Textbegrenzung, Mehrfacheinträge, fehlende Daten, vollständige Kalenderperioden, Jahresgrenzen und getrennte Prozentnenner. Die Ollama-Vertragsprüfungen verwenden simulierte Antworten. Diese Tests validieren weder die Erkennung tatsächlicher Gefühle noch klinische Wirkungen oder die fachliche Zuverlässigkeit eines Modells.

### Windows und Ollama

Bei `execution:auto` wiederholt `explain()` eine ungültige oder abgeschnittene Antwort sowie einen expliziten Tokenwiederholungsfehler einmal mit `num_gpu:0`, innerhalb desselben Abbruchsignals und Gesamtzeitlimits. Erst eine erfolgreich validierte CPU-Antwort aktiviert den CPU-Pfad für weitere Erklärungen dieses Providerobjekts. Konfiguration, Modell und Anbieter bleiben gleich. Netzwerkfehler, andere Modellfehler und Abbruch lösen keinen Retry aus; der reine CPU-Modus ebenfalls nicht. Die getrennte Gefühlsauswertung ist davon unverändert. Profilnamen des jeweils ausgewählten Kindes werden als bekannte Namen behandelt, auch wenn sie nicht im Wörterbuch stehen.

Der Ollama-Adapter verwendet standardmäßig `execution:"cpu"` und sendet `options.num_gpu:0` als Kompatibilitätsmodus. Eltern können auf `execution:"auto"` wechseln; dann entfällt diese Vorgabe und Ollama wählt die Hardware einschließlich möglicher GPU-Beschleunigung. Beide Modi bleiben lokale Ausführung. Der Kompatibilitätsmodus ist eine vorsichtige Vorgabe nach fehlerhaften Modellausgaben auf dem Entwicklungs-PC; eine isoliert nachgewiesene GPU-Ursache oder allgemeine Qualitätsgarantie folgt daraus nicht. Beim unten beschriebenen isolierten Vergleich lieferte die CPU-Vorgabe zwei strukturell gültige, lesbare Antworten. Die fachliche Qualität muss weiterhin gesondert geprüft werden.

`TB_AI_SELECTION.compare` vergleicht nur geeignete, bereits installierte lokale Modelle; es startet keine Downloads. Pro Modell und Ausführungsart laufen dieselben zwei erfundenen Aufgaben nacheinander, alle Varianten ebenfalls seriell. Das verhindert konkurrierende CPU-/GPU-Last durch den Test selbst. Die beiden Antworten müssen den Lernhilfevertrag erfüllen und exakt die erwarteten Korrekturen `Oma` und `Gefühl` liefern. Grafikvarianten zählen nur mit bestätigtem positivem `size_vram` aus Ollamas Prozessstatus; stiller CPU-Fallback ist für diese Messung ausgeschaltet. Von der gemessenen Antwortzeit wird die gemeldete, auf die Gesamtzeit begrenzte `load_duration` abgezogen. Die bestandene Variante mit dem kleinsten Mittelwert gewinnt. Das ist ein kurzer Vergleich nach dem Laden, keine Messung der vollständigen Startdauer und kein allgemeiner Qualitätsnachweis. Einzelversuche sind zeitlich begrenzt, der gesamte Vergleich ist abbrechbar. Fehlversuche und fehlender Grafikspeichernachweis werden angezeigt. Die Auswahl bleibt bis zum ausdrücklichen Speichern ungespeichert; beim fehlgeschlagenen Grafiktest wechselt die Auswahl zurück auf CPU.

`npm run dev` liefert die Anwendung unter `http://127.0.0.1:8765` aus und richtet automatisch `data/` im Projektordner als Datenspeicher ein. Die Ordnerauswahl entfällt; der Pfad erscheint im Elternbereich. Der Server lauscht nur auf Loopback. Über `/api/storage/` werden bisherige Familien-, Kinder- und Bilddateien gelesen und atomar geschrieben. Die Pfade sind beschränkt, Host/Origin und Sitzungstoken werden geprüft, Dateisystemlinks abgelehnt. Normale statische URLs liefern keine persönlichen Dateien aus. Der Server ist ein lokales Entwicklungswerkzeug, kein öffentlicher Hosting-Dienst. `createDevServer({dataDir, storage})` ermöglicht isolierte temporäre Datenordner und Tests des bisherigen Browserbetriebs ohne Speicher-API.

Der Browser-Adapter liefert ausschließlich `read`, `write`, `list`, `remove` und den angezeigten Pfad. Bestehende Verschlüsselung und Tagesstände werden weiterverwendet. Die Sitzungstoken bleiben im Arbeitsspeicher. Leere oder beschädigte Familiendateien sowie unvollständig lesbare Kinderbestände verhindern den Start, statt vorhandene Daten zu überschreiben. Die fünf Speichertests prüfen unter Windows Sitzungsschutz, Pfadbegrenzung, Verzeichnislinks, Unicode/Bild-/Backup-Dateien, automatisches Speichern und Wiederöffnen in einem frischen Browserprofil. Alle Testdaten liegen in separat angelegten temporären Ordnern. Der bisherige Datei-Betrieb besitzt weiter den Browser-Ordnerdialog. Nach Änderungen am Node-Server ist ein Neustart von `npm run dev` erforderlich.

Der Ollama-Adapter verwendet im Windows-Dev `local-ai.js` und die gleichursprüngliche `/api/ai/`-Schnittstelle. `scripts/ai-runtime.cjs` verwaltet eine eigene Standalone-Laufzeit auf einem dynamischen Loopback-Port und startet sie bei Bedarf mit `OLLAMA_NO_CLOUD=1`. Der reine Datei-Betrieb behält als manuellen Fallback `http://127.0.0.1:11434`. Über `/api/show` werden Modellinformationen geprüft, bekannte Cloud-Namen und `remote_model`/`remote_host` abgelehnt und erst danach begrenzter Kontext an `/api/chat` gesendet. Die Modellsuche verlangt die Fähigkeit `completion`. Modelle mit ausschließlich aktiviertem Thinking werden als `thinking_only` abgelehnt und aus der Suche ausgeschlossen; abschaltbares Thinking wird mit `think:false` deaktiviert. Die Generierung nutzt bis zu 900 Ausgabetokens; abgeschnittene oder ungültige JSON-Antworten werden verworfen. Fehler des lokalen Backends behalten Fehlercode und konkrete Beschreibung bis zur Oberfläche und zum Eltern-Einrichtungsbeispiel. Anfragen sind zeitlich begrenzt und abbrechbar. [Ollama-API](https://docs.ollama.com/api/chat), [Modellinformationen](https://docs.ollama.com/api-reference/show-model-details), [Cloud-Abschaltung](https://docs.ollama.com/faq).

`model-catalog.js` enthält gemeinsame Download-Kandidaten. Der kleine Qwen-Kandidat ist `qwen3:4b-instruct-2507-q4_K_M`; das frühere `qwen3:4b` wird wegen seines erzwungenen Thinking-Modus nicht mehr dafür vorgeschlagen. Die Einrichtung ist eine explizite Elternaktion. Der Server lädt ausschließlich die gepinnte offizielle Windows-ZIP-Datei von Ollama v0.40.8 (x64/ARM64), prüft Größe und SHA-256 vor dem Entpacken und schreibt erst nach erfolgreicher Extraktion die Bereitschaftsmarkierung. Versionswechsel erfordern eine Aktualisierung von Version, Größen und Hashes in `ai-runtime.cjs`. Basis ist die [offizielle Release-Metadaten-API](https://api.github.com/repos/ollama/ollama/releases/tags/v0.40.8). Kein globaler Installer, keine Registry-/PATH-Änderung und keine Nutzung einer fremden Ollama-Instanz. Laufzeit und Modelle liegen unter `data/ai/`. GPU-Zusatzpakete für AMD/MLX werden nicht eingerichtet; Hardwarebeschleunigung und Laufzeitverhalten müssen auf Zielgeräten geprüft werden.

Die Verwaltungs-API verlangt lokalen Host, passenden Origin, Client-Header und Sitzungstoken. Downloads erlauben nur Katalogmodelle, der Proxy nur Tags, Show und Chat. `/api/pull` läuft im Backend mit gestreamtem Fortschritt; Polling der Oberfläche kann nach Neuladen fortgesetzt werden. Kein automatischer Download-Neustart nach Serverabbruch; erneut auslösen. `npm run test:ai` prüft mit kleinen Testdaten Hashabweichungen, Fortschrittsparsing, Sitzungsschutz, Modellauswahl, Wiederverwendung und Prozessende. `npm run test:browser` prüft auch die Einrichtung in Edge. Tests verwenden simulierte Downloads und Laufzeitantworten, keine GB-Downloads oder echten Modellantworten. Der Download und der GPU-/CPU-Vergleich auf dem Entwicklungs-PC sind unten beschrieben. Breite Hardwareabdeckung und fachliche Modellqualität sind weiterhin offen. Die heutige Startform ist weiterhin der lokale Node-Dev-Server, kein Windows-App-Paket.

Die Verbindung wird im Elternbereich anhand eines erfundenen Satzes getestet. Auf dem vorhandenen Windows-PC wurde der Instruct-Download tatsächlich abgeschlossen und die echte Laufzeit geprüft. Automatische Hardwarewahl lieferte wiederholte Zeichen bzw. Wortteile, während ausschließlich `num_gpu:0` bei ansonsten unveränderten Adapterparametern zwei strukturell gültige und lesbare Antworten lieferte. Das grenzt den Fehler auf den Beschleunigungspfad ein, beweist aber keine allgemeine Ursache für andere PCs. Das kleine Qwen-Modell fragte dabei trotz einer Bedeutungsangabe erneut nach; die Anweisung wurde daher um die ausdrückliche Berücksichtigung bereits geklärter Bedeutung ergänzt. Breite pädagogische Modellqualität ist weiterhin offen. Der fachliche Test mit `tests/lernhilfe-cases.mjs` muss richtige Wörter bei falschen Prüfhinweisen, Namen, Fantasiewörter, Bedeutungsrückfragen und erneute Korrekturversuche abdecken. Automatisierte Tests verwenden weiterhin simulierte Antworten.

### Option PWA mit eigenem Hosting

Eine gehostete PWA bleibt eine mögliche Auslieferungsform. Dafür fehlen derzeit bewusst Manifest, Service Worker, Update-Konzept und Hosting. Für Installierbarkeit ist eine geeignete sichere Bereitstellung erforderlich, üblicherweise HTTPS. [PWA-Anforderungen](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

| Variante | Tagebuchdaten | KI |
| --- | --- | --- |
| Statisches Hosting der PWA | Können weiter lokal im Browser bleiben; Hosting allein erzeugt keine Synchronisation | Ein lokales Modell braucht eine im Browser verfügbare Laufzeit oder einen erreichbaren lokalen Dienst |
| PWA mit eigenem KI-Backend | Können lokal bleiben; benötigte Satzausschnitte werden für Online-Erklärungen übertragen | Server ruft eigenes Modell oder Anbieter-API auf |
| Zusätzliches Daten-Backend | Synchronisation und Konten würden neu hinzukommen | Unabhängige Entscheidung vom KI-Anbieter |

Eine PWA auf einem Handy kann nicht einfach das `127.0.0.1`-Ollama des Windows-PCs nutzen: Loopback meint immer das jeweilige Gerät. Zugriff einer HTTPS-PWA auf einen lokalen Dienst ist zudem browser- und berechtigungsabhängig und muss gesondert getestet werden. Eine native System-KI wird nicht automatisch zu einer Browser-API. Deshalb stellt der gemeinsame Kern nur den Vertrag bereit und täuscht keine Plattformverfügbarkeit vor.

Für eigenes Online-Hosting sind Geheimnisse ausschließlich im Serverdienst aufzubewahren; Authentifizierung, Berechtigungen, Kostenbegrenzung und ausdrückliche Freigabe der Textübertragung gehören zu dessen Umsetzung. Die bestehenden lokalen PINs sind keine Server-Authentifizierung. Ein Daten-Backend oder Server-Synchronisation wird nicht allein durch die Entscheidung für eine PWA eingeführt.

Vor Android-Geräte-KI die Bedingungen für die Kinderzielgruppe prüfen: Die derzeitige [ML-Kit-GenAI-Schnittstelle](https://developers.google.com/ml-kit/genai-terms) ist dafür ausgeschlossen. Alternativen müssen technisch und hinsichtlich der Modelllizenz separat bewertet werden. Für Apple kommt ein nativer Adapter erst in einer späteren tatsächlichen Mobil-Implementierung hinzu.


### Wortbezug der Lernhilfe

Die Modellanweisung enthält kein ausgearbeitetes Wortbeispiel mehr, das ein kleines Modell als Antwort übernehmen könnte. `validateReplyForRequest` kontrolliert zusätzlich ausdrücklich behauptete Ersatzwörter und den Ausgangspunkt einer Verlängerung gegen die aktuelle Markierung. Dies ist eine begrenzte Plausibilitätsprüfung und kein allgemeiner semantischer Beweis. Der Ollama-Adapter nutzt sie bereits vor dem CPU-Fallback. Unterschiedliche Wörter teilen keinen unscharf zugeordneten Erklärungsverlauf; unpassende ältere Antworten werden nicht erneut als Kontext gesendet. Nach Textänderungen verschwinden Antworten zu einer anderen Markierung. Nicht mehr eindeutig zuordenbare Altmarken werden ausgeblendet, bis erneut geprüft wird.

## OpenAI im Windows-Dev

`npm run test:openai` prüft Vertrag, geschützten lokalen Server und Browserabläufe
mit simulierten Anbieterantworten. Unter Windows wird die DPAPI-Speicherung
zusätzlich tatsächlich ausgeführt. Eine echte Modellantwort erfordert den
separaten Beispieltest mit einem eingerichteten API-Schlüssel.

Die Cloud-Anbindung läuft ausschließlich über den lokalen App-Server. Der Browser erhält per `GET /api/openai/session` ein Sitzungstoken; die Konfiguration (`GET`/`POST`/`DELETE /api/openai/config`) liefert den API-Schlüssel niemals zurück. `POST /api/openai/test` arbeitet mit einem synthetischen Satz und benötigt keine Freigabe für Kindertexte. Die Elternkonfiguration trennt das Hinterlegen des Schlüssels und den Verbindungstest von der Aktivierung für Kindertexte. `Dev/app/openai-settings.js` persistiert keine Geheimnisse im Browser und leert das Passwortfeld beim Speichern beziehungsweise Wechsel zur lokalen Lernhilfe.

Die Oberfläche behandelt die ZDR-Bestätigung als nicht überprüfte Elternangabe. Sie darf daraus keine automatisch verifizierte Anbieterfreischaltung oder Speicherzusage ableiten. Keine realen Kindertexte, produktiven API-Schlüssel oder echten Provider-Aufrufe in automatisierte Tests aufnehmen; die Browsertests verwenden synthetische Profile und simulierte Antworten.
