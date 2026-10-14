# Daten und Speicherung

Diese Beschreibung bezieht sich auf den mitgelieferten Code in `Dev/app/app.js`.

## Speicherorte

| Ort | Inhalt |
| --- | --- |
| `localStorage`, Schlüssel `schreibheft-v1` | Familienzustand mit Eltern-Einstellungen, Kinderprofilen, Einträgen, Entwürfen und Lern-/Belohnungsdaten als JSON |
| IndexedDB `tagebuch-bilder`, Store `pics` | Bilder und Bildentwürfe |
| IndexedDB `tagebuch-ordner`, Store `h` | Handle des vom Benutzer freigegebenen Ordners |
| `config/familie.json` | Eltern-Einstellungen, Liste der Kinder, Zeitstempel, Salt und Familien-Schlüssel |
| `kinder/<Name>/files/tagebuch.json` | Verschlüsselter Zustand eines Kindes |
| `kinder/<Name>/files/bilder/<id>.bild` | Verschlüsselte Bilder gespeicherter Einträge |
| `kinder/<Name>/files/sicherungen/tagebuch-YYYY-MM-DD.json` | Verschlüsselter Tagesstand eines Kindes |

Der Browserzustand wird auch im Ordnerbetrieb verwendet. Die JSON-Daten im `localStorage` sind nicht mit dem Sicherungskennwort verschlüsselt. Zugriff auf das Browserprofil kann deshalb Einblick in persönliche Daten geben.

## Ordnerbetrieb

Die App verwendet die File System Access API, wenn `showDirectoryPicker` verfügbar ist. Ein Benutzer muss den Ordner auswählen und Schreibzugriff gewähren. Beim Verbinden vergleicht die App die Zeitstempel des Ordner- und Browserstands. Ein vorhandener Ordnerstand wird bei leerem Browser oder neuerem beziehungsweise gleichem Zeitstempel eingelesen; andernfalls wird der Browserstand in den Ordner geschrieben.

Änderungen lösen einen verzögerten Speichervorgang aus, normalerweise nach etwa 1,5 Sekunden. Im Elternbereich kann **Jetzt speichern** einen vollständigen Schreibvorgang auslösen. Vor Kopieren oder Schließen den Speicherstatus prüfen.

Pro Kind wird bei Änderungen ein Tagesstand geschrieben. Der Code löscht Tagesdateien mit Datum vor `heute minus 14 Tage`. Einschließlich heute können damit bis zu 15 datierte Tagesdateien bestehen. Diese Dateien enthalten den Kindzustand; Familien-Konfiguration und Bilder werden nicht als eigene historische Komplettkopie mitgesichert. Sie ersetzen daher keine vollständige Sicherung.

Es gibt keine serverseitige Synchronisation oder Zusammenführung gleichzeitig bearbeiteter Stände. Beim Einsatz in einem synchronisierten Cloud-Ordner die App möglichst nur auf einem Gerät zur selben Zeit verwenden und den Ordner vollständig synchronisieren lassen.

## Verschlüsselung und PINs

Ordnerdateien für Kindzustände und Bilder verwenden AES-GCM mit einem zufälligen 256-Bit-Familien-Schlüssel und einem zufälligen Initialisierungsvektor. Der Schlüssel liegt in `config/familie.json` und im Browserzustand. Wer den ganzen Ordner besitzt, hat deshalb auch den Schlüssel. Familien-Einstellungen selbst sind als lesbares JSON gespeichert.

PINs werden mit einem Familien-Salt gehasht; bei verfügbarer Web-Crypto-API verwendet der Code SHA-256. Die PIN ist eine Bedienungssperre innerhalb der App, kein Kennwort zur Verschlüsselung der Ordnerdaten. Eltern können eine Kinder-PIN zurücksetzen.

## Heruntergeladene Sicherung

Die Sicherung bündelt den Browserzustand und die Bilder aus IndexedDB. Sie verwendet AES-GCM mit 256 Bit; der Schlüssel wird mit PBKDF2, SHA-256, zufälligem Salt und 200.000 Iterationen aus dem Kennwort abgeleitet. Das Sicherungsformat trägt die Kennung `tagebuch-sicherung`.

Die Wiederherstellung entschlüsselt die Datei und ersetzt `localStorage` sowie die Bilder in IndexedDB. Danach lädt die Anwendung neu. Beim anschließenden Verbinden eines vorhandenen Ordners gilt wieder der Zeitstempelvergleich. Die Sicherung umfasst die Bilder, die zu diesem Zeitpunkt in IndexedDB liegen; im Ordner vorhandene, im Browser noch nicht geladene Bilder werden vom Export nicht automatisch nachgeladen. Für einen vollständigen Umzug deshalb zusätzlich den ganzen Ordner kopieren.

Kennwort und Sicherung getrennt aufbewahren. Ohne korrektes Kennwort kann die App die Sicherung nicht wiederherstellen.

## Datenübertragung

- **LanguageTool:** Bei aktivierter Online-Grammatikprüfung sendet die App Text und Sprache per HTTPS-POST an `https://api.languagetool.org/v2/check`. Die Einstellung `grammar` ist im Ausgangszustand `true`. Bei fehlendem Internet, nicht erfolgreicher Antwort oder Zeitüberschreitung nutzt die App weiterhin die lokale Prüfung. HTTPS schützt den Transport; LanguageTool erhält den Text zur Verarbeitung. Diese Dokumentation macht keine Zusage über die Speicherung beim Anbieter.
- **ntfy:** Bei eingerichtetem Kanal sendet die App Aktivitätsmeldungen an `https://ntfy.sh/<Kanal>`, über `fetch` beziehungsweise `sendBeacon`. Tagebuchtexte werden dafür nicht verwendet; Namen und Aktivitätsangaben können in den Meldungen stehen. Nicht zugestellte Meldungen werden teilweise für spätere Übertragung vorgemerkt.
- **Sprachausgabe:** Die App nutzt `speechSynthesis` und verfügbare deutsche Browser-/Systemstimmen. Ob eine Stimme lokal arbeitet, hängt von der ausgewählten Stimme und dem System ab.

Die ausgelieferten Anwendungsdateien benötigen keinen eigenen Backend-Dienst. Ein synchronisierter Ordner kann unabhängig von der App Daten an den jeweiligen Cloud-Anbieter übertragen.

## Was gehört nach GitHub?

Nur Programmdateien, Dokumentation und ein geprüftes Anwendungspaket. `.gitignore` schließt persönliche Daten unter `Dev/config/` und `Dev/kinder/` aus und erhält deren `LIESMICH.txt`. ZIP-Dateien müssen zusätzlich auf ihre Inhalte geprüft werden; Git untersucht keine Dateien innerhalb eines Archivs. Keine Tagebuchdaten, Familien-Schlüssel, PIN-Hashes, ntfy-Kanäle oder privaten Sicherungen in Commits aufnehmen.
