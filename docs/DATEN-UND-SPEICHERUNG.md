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

Die freiwilligen Tagesrückblick-Antworten stehen im jeweiligen Eintrag unter `answers`, mit den Schlüsseln `best`, `feeling`, `tomorrow`, `difficult` und gegebenenfalls der bisherigen Frage `learned`. Neue Einträge speichern die Beschriftungen zusätzlich unter `answerLabels`; ältere Einträge behalten über die bisherigen Beschriftungen ihre Bedeutung. Entwürfe liegen unter `draftQ`. Antworten sind Teil derselben Kinddaten, desselben Browser-Caches und derselben Sicherungen wie der Haupttext. Für sie gelten dieselben Grenzen des PIN-Sichtschutzes und der Verschlüsselung. Die normale Elternübersicht spiegelt weder Antworten noch Tagebuchtexte.

Alle Fragen dürfen ausgelassen werden, Einwort- und Emoji-Antworten sind möglich. Für einen reinen Rückblick ist der Mindestumfang des Tagesauftrags keine Speicherbedingung. Bei einem Eintrag mit Haupttext können Antworten zum Schreibumfang zählen; eine sprachliche Bewertung der Antworten erfolgt nicht. Hunspell, LanguageTool, Ollama und die OpenAI-Lernhilfe verarbeiten ausschließlich den dafür vorgesehenen Haupttext beziehungsweise einen begrenzten Ausschnitt daraus.

## Gefühlsdaten im Dev-Stand

Die zusätzliche Gefühlsauswahl ist von den freiwilligen Rückblickantworten getrennt. `parent.moodSharing` enthält `enabled` und `ai`; fehlt diese Einstellung, verwendet die App beide Werte als `true`. Im Elternassistenten können sie geändert werden. Das Kind sieht vor seiner Auswahl, dass Eltern die daraus entstehende Übersicht und gegebenenfalls KI-Hinweise sehen. Die normale Elternansicht zeigt weiterhin weder Tagebuchtexte noch Rückblickantworten; sie zeigt nun die dem Kind angekündigten Gefühlsangaben und aus dem Freitext abgeleiteten KI-Kategorien.

Bei aktivierter Übersicht ist eine Auswahl aus ein bis drei Katalog-IDs vor dem Speichern nötig. Der Kindentwurf speichert sie als `draftMood`. Ein fertiger Eintrag enthält `mood.self` und `mood.ai` mit `status` (`ready`, `pending`, `error` oder `off`), `moods` (höchstens drei Katalog-IDs) und `unclear` (Boolean). Diese Angaben werden mit dem bestehenden Kindzustand im Browser-Cache und in den verschlüsselten Ordnerdateien, Tagesständen und Sicherungen gespeichert. Die vorhandenen Grenzen der Verschlüsselung und des PIN-Sichtschutzes gelten unverändert. Die KI-Ausgabe speichert keine Textzitate oder freie psychologische Begründung.

Die lokale Gefühlsauswertung läuft beim Speichern nur dann asynchron an, wenn die Gefühlsübersicht, die zusätzliche KI und die Ollama-Lernhilfe eingeschaltet sind und ein freier Haupttext vorhanden ist. Übertragen werden ausschließlich höchstens 1.800 Zeichen dieses Texts an die lokale Laufzeit. `answers`, `draftQ`, `mood.self`, Namen und andere Einträge werden nicht als zusätzliche Eingaben angehängt; persönliche Informationen im ausgewählten Textausschnitt selbst bleiben natürlich Teil dieses Ausschnitts. Es gibt keinen rückwirkenden Scan älterer Einträge. Die KI kann scheitern, ohne den bereits gespeicherten Eintrag zu verlieren. Beim Neuladen werden noch auf `pending` stehende, damit unterbrochene Auswertungen auf `error` gesetzt; sie werden nicht automatisch erneut gestartet.

Die Elternübersicht berechnet getrennte Häufigkeiten für Selbstbericht und KI nach eindeutigen Kalendertagen. Prozentwerte beziehen sich auf die tatsächlichen Selbstberichttage beziehungsweise abgeschlossenen KI-Tage, nicht auf die Zahl der Texte. Mehrfachauswahl wird nicht zu einem Gesamtwert für positiv oder negativ verrechnet. Fehlende Daten bleiben fehlend, unklare KI-Ergebnisse sind als solche gekennzeichnet. Wochen und Monate betreffen die letzte abgeschlossene Kalenderperiode und werden erst ausgewertet, wenn der Aufzeichnungsbeginn vor oder auf ihrem ersten Tag liegt. Historische Einträge ohne Gefühlsdaten setzen diesen Beginn nicht. Der Gefühlskalender zeigt ebenfalls ausschließlich die Kategorien und ihren Status, keine Texte.

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

Im aktuellen Dev-Stand gibt es zusätzlich eine zunächst ausgeschaltete Lernhilfe. Deren Kern verarbeitet weder Dateien noch Zugangsdaten. Bei ausgewähltem Ollama löst **Prüfen** zusätzlich eine lokale Rechtschreibanalyse im Zusammenhang aus: höchstens die ersten 1.800 Zeichen des Haupttexts und bis zu 20 darin liegende Wortmarkierungen mit Korrekturvorschlägen. Die Antwort enthält begrenzte Entscheidungen zu diesen Stellen und höchstens zwölf weitere Fundstellen. Rückblickantworten, die Gefühlsauswahl und andere Einträge werden dafür nicht angehängt. Wörterbuch, Regeln und gegebenenfalls LanguageTool bleiben die Grundlage; die zusätzliche Analyse kann abgebrochen werden oder scheitern, ohne ihre Hinweise zu verlieren. Einzelne KI-Erklärungen werden weiterhin über die Hilfeknöpfe angefordert. Bei einfachen geprüften Buchstabenänderungen kann die App einen Hinweis direkt aus den beiden Schreibweisen erzeugen, ohne eine weitere Modellantwort anzufordern.

Die getrennt konfigurierte Gefühlsauswertung kann zusätzlich beim Speichern automatisch einen begrenzten Haupttextausschnitt lokal auswerten, wie oben beschrieben. Der lokale Adapter sendet begrenzten Kontext an Ollama auf diesem PC. Im Windows-Dev vermittelt der lokale App-Server zu seiner eigenen Laufzeit auf einem dynamischen Loopback-Port; nur im manuellen Datei-Betrieb wird die feste Adresse `http://127.0.0.1:11434` verwendet. Zu einer einzelnen Erklärung gehören die markierte Stelle mit maximal 700 Zeichen Satzausschnitt, der Prüfhinweis, die Rückfrage und ein begrenzter Verlauf aus der laufenden Sitzung. Modell- und Anbieterwahl stehen in den Familien-Einstellungen; die einzelnen Gespräche werden nicht in Tagebucheinträgen gespeichert. Aus der Rechtschreibhilfe enthält der Eintrag lediglich die zusätzlichen Kennzeichnungen `helped` und `deferred`; die getrennten Gefühlsdaten stehen unter `mood`. Der Ollama-Adapter lehnt erkannte Remote-/Cloud-Modelle vor dem Senden des Lerntexts ab. Die eigene Laufzeit startet mit abgeschalteter Cloud-KI. Alternativ kann OpenAI ausdrücklich ausgewählt werden; es gibt keinen automatischen Fallback zu einem Online-Anbieter. Die unabhängige LanguageTool-Einstellung bleibt davon unberührt.

### Optionale OpenAI-Verarbeitung

Bei ausdrücklich ausgewähltem OpenAI vermittelt der lokale App-Server die Prüfung des Haupttexts und einzelne Erklärungen an die OpenAI-API über HTTPS. Der API-Schlüssel verlässt den Server nicht in Richtung Browser. Er wird nicht im Familienzustand, `localStorage`, Tagebucheintrag, Browser-Gesprächsverlauf oder Tagebuch-Sicherung abgelegt. Die Elternoberfläche erhält ausschließlich Status und nicht geheime Einstellungen; ein leeres Passwortfeld erhält den bisherigen Schlüssel. **Schlüssel entfernen** widerruft die lokale Konfiguration; eine vollständige Sperrung eines möglicherweise anderweitig bekannten Schlüssels erfolgt zusätzlich im OpenAI-Konto.

Unter Windows speichert der Server die Zugangskonfiguration mit **CurrentUser-DPAPI** verschlüsselt in `data/openai/openai-credentials.dpapi`. Entschlüsselung ist an das Windows-Benutzerkonto gebunden; Prozesse desselben Kontos sind dadurch nicht ausgeschlossen. Dies ersetzt keinen Schutz des Windows-Kontos. Auf anderen Systemen wird der Schlüssel nur während der Serversitzung gehalten; die Elternoberfläche weist auf die erneute Eingabe nach einem Neustart hin.

Die Prüfung akzeptiert höchstens 12.000 Zeichen Haupttext und kürzt längere Texte nicht still. Eine Erklärung verwendet höchstens 700 Zeichen aktuellen Satzausschnitt, 240 Zeichen markierte Stelle, bis zu drei frühere Versuche und zwei frühere Antworten (jeweils begrenzt). OpenAI erhält den zur Prüfung übergebenen Haupttext beziehungsweise den begrenzten Erklärungskontext. `answers`, `draftQ`, die Gefühlsauswahl, andere Einträge und die Familienhistorie werden nicht angehängt. Personen- und Ortsnamen im Haupttext selbst werden nicht automatisch anonymisiert. OpenAI wird nicht zur Gefühlsauswertung benutzt. Anbieterwahl und nicht geheime Freigaben können im Familienzustand stehen; ohne serverseitig gespeicherten Schlüssel und Freigaben ist keine Cloud-Prüfung möglich.

Die App fordert die ausdrückliche Freigabe der Übertragung sowie die Bestätigung einer bereits von OpenAI freigeschalteten Zero-Data-Retention-Konfiguration. Diese Bestätigung ist eine Elternangabe, keine technische Überprüfung des API-Kontos. `store:false` allein aktiviert keine Zero Data Retention und rechtfertigt keine Zusage, dass beim Anbieter nichts gespeichert wird. Vor der Freigabe personenbezogener Kindertexte gelten die [OpenAI-Vorgaben für Minderjährige](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance) und die im API-Konto wirksamen [Datenkontrollen](https://developers.openai.com/api/docs/guides/your-data). Der Test verwendet einen fest eingebauten erfundenen Satz und ist ohne Freigabe von Kindertexten möglich.

Der Eltern-Test **Modell automatisch auswählen** verwendet ausschließlich zwei erfundene Beispielsätze, keine Tagebuchdaten. Er vergleicht geeignete, bereits installierte lokale Modelle mit Prozessor und Grafikbeschleunigung, lädt dabei keine Modelle herunter und lässt sich abbrechen. Testergebnisse und Antwortzeiten werden zur Auswahl in der laufenden Ansicht angezeigt; erst das Speichern übernimmt Modell und Ausführungsart in die Familien-Einstellungen.

Die explizit gestartete KI-Einrichtung lädt die Standalone-Laufzeit von GitHub und Modelle aus der Ollama-Registrierung herunter. Dabei werden keine Tagebuchtexte übertragen. Die Downloads, entpackte Laufzeit und Modelle liegen unter `data/ai/`. Sie gehören nicht zu den verschlüsselten Tagebuch-Sicherungen und können nach einem Gerätewechsel neu heruntergeladen werden. Die App verändert keine systemweite Ollama-Installation.

Die aktuelle Windows-Dev (`npm run dev`) verwendet automatisch `data/` im Projektordner als lokalen Datenspeicher. Der vollständige Pfad wird im Elternbereich angezeigt. Die bisherigen Dateiformate bleiben erhalten: `data/config/familie.json` enthält Familien-Einstellungen und Schlüssel; `data/kinder/<Name>/files/` enthält verschlüsselte Tagebücher, Bilder und Tagesstände. Browser-Speicher dient weiterhin als Cache. `data/` wird nicht versioniert. Beim ersten Verbinden können vorhandene Daten desselben Browser-Ursprungs in den leeren Speicher übernommen werden. Ältere Datei-Versionen benötigen den Import einer verschlüsselten Sicherung.

Die Daten gehen über eine lokale, auf Loopback beschränkte Speicher-Schnittstelle an den Node-Prozess auf demselben PC. Ein Sitzungstoken, Ursprungsprüfung, begrenzte erlaubte Pfade und die Ablehnung von Verzeichnislinks begrenzen den Zugriff. Die Dateischreibvorgänge erfolgen über temporäre Dateien und Umbenennen. Persönliche Dateien sind nicht über normale statische Download-Pfade erreichbar. Das ist kein öffentlicher Hosting-Dienst und keine Internet-Synchronisation. Fehler beim Lesen vorhandener Daten blockieren die Verbindung, statt sie mit einem leeren Stand zu überschreiben. Der alte Ordnerdialog bleibt ausschließlich für den bisherigen Datei-Betrieb bzw. die statische Browser-Version erhalten.

Eine spätere gehostete PWA und insbesondere ein öffentliches KI- oder Daten-Backend wären gesonderte Betriebsarten; Hosting der Oberfläche allein erzeugt keine Synchronisation und keine Freigabe zur Textübertragung.

- **LanguageTool:** Bei aktivierter Online-Grammatikprüfung sendet die App den Haupttext (ohne Tagesrückblick-Antworten) und die Sprache per HTTPS-POST an `https://api.languagetool.org/v2/check`. Die Einstellung `grammar` ist im Ausgangszustand `true`. Bei fehlendem Internet, nicht erfolgreicher Antwort oder Zeitüberschreitung nutzt die App weiterhin die lokale Prüfung. HTTPS schützt den Transport; LanguageTool erhält den Text zur Verarbeitung. Diese Dokumentation macht keine Zusage über die Speicherung beim Anbieter.
- **ntfy:** Bei eingerichtetem Kanal sendet die App Aktivitätsmeldungen an `https://ntfy.sh/<Kanal>`, über `fetch` beziehungsweise `sendBeacon`. Tagebuchtexte werden dafür nicht verwendet; Namen und Aktivitätsangaben können in den Meldungen stehen. Nicht zugestellte Meldungen werden teilweise für spätere Übertragung vorgemerkt.
- **Sprachausgabe:** Die App nutzt `speechSynthesis` und verfügbare deutsche Browser-/Systemstimmen. Ob eine Stimme lokal arbeitet, hängt von der ausgewählten Stimme und dem System ab.

Die statische Anwendung benötigt keinen eigenen Backend-Dienst; die OpenAI-Anbindung benötigt den lokalen App-Server. Ein synchronisierter Ordner kann unabhängig von der App Daten an den jeweiligen Cloud-Anbieter übertragen.

## Was gehört nach GitHub?

Nur Programmdateien, Dokumentation und ein geprüftes Anwendungspaket. `.gitignore` schließt persönliche Daten unter `Dev/config/` und `Dev/kinder/` aus und erhält deren `LIESMICH.txt`. ZIP-Dateien müssen zusätzlich auf ihre Inhalte geprüft werden; Git untersucht keine Dateien innerhalb eines Archivs. Keine Tagebuchdaten, Familien-Schlüssel, PIN-Hashes, ntfy-Kanäle oder privaten Sicherungen in Commits aufnehmen.
