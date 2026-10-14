# MeinLRSTagebuch

Ein deutschsprachiges Tagebuch für Kinder mit Lese- und Rechtschreibübungen. Die Anwendung läuft in einem Browser und benötigt weder einen eigenen Backend-Server noch eine Installation von npm-Paketen.

## Funktionen

- Tagebucheinträge mit Schreibimpulsen, Bildern und Emojis
- Lokale Rechtschreibprüfung mit Hunspell und deutschem Wörterbuch
- Optionale Online-Grammatikprüfung mit LanguageTool
- Mehrere Kinderprofile mit eigenen PINs und ein Elternbereich mit separater PIN
- Leseansicht, Vorlesen über die Browser-Sprachausgabe und Drucken als Tagebuchbuch
- Wort- und Kurz-Diktate, Coins, Belohnungen, Joker und freischaltbare Spiele
- Optionale Benachrichtigungen über ntfy

## Start auf dem eigenen PC

1. Das Repository klonen oder über **Code → Download ZIP** herunterladen und vollständig entpacken.
2. Den Projektordner an einen festen Platz legen. Die Datei `Tagebuch.html` und der Ordner `app/` müssen zusammenbleiben.
3. `Tagebuch.html` mit einer aktuellen Version von **Google Chrome oder Microsoft Edge** öffnen.
4. Beim ersten Start den Projektordner auswählen und dem Browser Schreibzugriff erlauben. Der Ordner muss nicht „Tagebuch“ heißen; entscheidend ist, dass `Tagebuch.html` darin liegt.
5. Im Bereich **Eltern** eine Eltern-PIN festlegen und die Kinderprofile anlegen.

Die Ordnerspeicherung verwendet die File System Access API. Andere Browser unterstützen diesen Ablauf möglicherweise nicht. Als Alternative bietet die Startseite **nur im Browser speichern** an. Dabei gehen die gespeicherten Daten verloren, wenn die zugehörigen Browserdaten gelöscht werden. Regelmäßig Sicherungen erstellen.

## Dateien und Speicherung

```text
Tagebuch.html                 Einstiegspunkt
app/                         JavaScript, CSS, Wörterbuch und Übungstexte
app/spiele/                  Spiele und deren Lizenzhinweise
app/sounds/                  Spielsounds
config/LIESMICH.txt           Hinweis zur Familienkonfiguration
kinder/LIESMICH.txt           Hinweis zu den Kinderdaten
LIESMICH.txt                  Kurzanleitung
```

Bei Nutzung der Ordnerspeicherung erzeugt die Anwendung zusätzlich:

```text
config/familie.json
kinder/<Name>/files/tagebuch.json
kinder/<Name>/files/bilder/
kinder/<Name>/files/sicherungen/
```

Tagesstände werden für die letzten 14 Tage aufbewahrt. Für einen Umzug den gesamten Projektordner einschließlich `config/` und `kinder/` kopieren und auf dem neuen PC erneut im Browser freigeben. Zusätzlich gibt es im Elternbereich Funktionen für Sicherung und Wiederherstellung.

**Persönliche Daten gehören nicht ins Repository.** Die `.gitignore` schließt die erzeugte Familienkonfiguration und die Kinderdaten aus. Das gilt auch für PINs, Benachrichtigungseinstellungen, Einträge, Bilder und Sicherungen. Vor jedem Commit prüfen, welche Dateien aufgenommen werden.

Die Tagebuchdateien werden mit AES-GCM verschlüsselt. Der zugehörige Schlüssel wird in der Familienkonfiguration gespeichert; die Ordnerspeicherung schützt daher nicht vor Personen, die den gesamten Datenordner lesen können. PINs steuern den Zugang in der Oberfläche und werden als gesalzene Hashes gespeichert.

## Internet und Datenschutz

Das Wörterbuch und die Übungstexte sind enthalten. Die lokale Rechtschreibprüfung benötigt keine Internetverbindung.

- **LanguageTool:** Wenn die Online-Grammatikprüfung aktiviert ist, wird der zu prüfende Text an `https://api.languagetool.org/v2/check` gesendet. Diese Funktion lässt sich im Elternbereich abschalten.
- **ntfy:** Bei eingerichteten Benachrichtigungen werden Meldungen an das konfigurierte Thema auf `https://ntfy.sh` gesendet. Ein Thema ist keine Zugangskontrolle; Namen und Meldungsinhalte können persönliche Informationen enthalten.
- **Vorlesen:** Verfügbare Stimmen und deren Verhalten hängen vom Browser und Betriebssystem ab.

## Entwicklung

Die Quellen bestehen aus HTML, CSS und JavaScript. Es gibt aktuell keinen Paketmanager, Build-Schritt oder automatisierten Test-Runner im Repository.

Für die Entwicklung kann ein lokaler HTTP-Server verwendet werden:

```bash
cd MeinLRSTagebuch
python3 -m http.server 8000 --bind 127.0.0.1
```

Unter Windows kann der entsprechende Befehl `py -m http.server 8000 --bind 127.0.0.1` verwendet werden. Danach im Browser `http://127.0.0.1:8000/Tagebuch.html` öffnen. Der Server dient nur der lokalen Entwicklung. Einen festen Port verwenden, damit die Browserdaten derselben Origin zugeordnet bleiben.

### Prüfen nach Änderungen

1. Die Startseite laden und die Browserkonsole auf Fehler prüfen.
2. Mit einem separaten Testprofil oder Testdatenordner eine Eltern-PIN und ein Kind anlegen.
3. Einen korrekten Satz und einen Satz mit Schreibfehler prüfen, z. B. „Ich spiele heute im Garten.“ und „Ich spiele heute im Gartenn.“.
4. Einen Eintrag speichern, neu laden und die gespeicherten Daten kontrollieren.
5. Bei Änderungen an der Speicherung zusätzlich Ordnerfreigabe, Sicherung und Wiederherstellung mit Testdaten prüfen.
6. Online-Grammatikprüfung und Benachrichtigungen separat prüfen, wenn diese Funktionen geändert wurden.

## Lizenzen und Quellen

Die Repository-Lizenz steht in [LICENSE](LICENSE). Enthaltene Drittanbieterbestandteile behalten ihre jeweiligen Lizenzbedingungen. Laut den mitgelieferten Hinweisen stammen:

- das deutsche Rechtschreibwörterbuch aus **igerman98** (GPL),
- die Rechtschreibkomponente aus **Hunspell** (LGPL/MPL),
- die Übungstexte aus **Klexikon/MiniKlexikon** (CC BY-SA 4.0),
- Teile der Spiele und Spielsounds aus **Vintage Arcade** von Gbolahan Aziz (MIT).

Die Spielhinweise einschließlich MIT-Lizenztext stehen in [app/spiele/LIZENZEN.txt](app/spiele/LIZENZEN.txt). Die Herkunftshinweise in [LIESMICH.txt](LIESMICH.txt) ergänzen diese Angaben. Vor einer Weiterveröffentlichung die vollständigen Lizenz- und Attributionsanforderungen der enthaltenen Komponenten prüfen; die Repository-Lizenz ersetzt diese nicht.
