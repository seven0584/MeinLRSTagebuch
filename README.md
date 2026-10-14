# MeinLRSTagebuch

Ein deutschsprachiges Tagebuch für Kinder mit Rechtschreibübungen. Die Anwendung läuft in einem Browser und benötigt weder einen eigenen Backend-Server noch eine Installation von npm-Paketen.

**Was ist neu?** In der [Änderungsübersicht für Eltern und Lehrkräfte](CHANGELOG.md) stehen die Neuerungen, behobene Probleme und Hinweise zu Updates.

In der App öffnet die **Glocke oben rechts** dieselbe Historie, auch offline. Die Zahl zeigt ungelesene Einträge; beim Öffnen werden sie als gelesen markiert. Der Lesestand wird für den verwendeten Browser gespeichert, gemeinsam für alle Kinderprofile. Nach dem Löschen der Browserdaten erscheinen die Einträge wieder als neu.

Die Bedienhilfe direkt in der App findet ihr unter **Eltern → Hilfe** sowie über **❓ Hilfe** im Kindertagebuch. Dort sind auch Stimmenauswahl, Shop, Updates und Glocke erklärt.

## Testfassung 1.3.0 auf `dev`

Die neuen Funktionen werden zunächst auf dem separaten Branch **[dev](https://github.com/seven0584/MeinLRSTagebuch/tree/dev)** zum Ausprobieren bereitgestellt. Sie sind noch nicht in `main` übernommen und kein reguläres Release.

**[Testfassung als ZIP herunterladen](https://github.com/seven0584/MeinLRSTagebuch/archive/refs/heads/dev.zip)** · **[Anleitung zum Testen](docs/testfassung-dev.md)**

Die ZIP vollständig in einen eigenen Testordner entpacken und `Tagebuch.html` in Chrome oder Edge öffnen. Dafür ein separates Browserprofil verwenden und zuerst ein erfundenes Testkind anlegen. Ein anderer Ordner allein trennt die Browserdaten nicht zuverlässig. Der Testordner darf nicht euer bisheriger Tagebuchordner sein.

Die automatische Update-Suche liest weiterhin ausschließlich `main`. Neue Teststände von `dev` werden über den ZIP-Link geladen; bestehende Installationen bekommen die Testfassung nicht als automatisches Update angeboten.

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

## Programmupdates

Ab Version 1.0.0 prüft die App beim Öffnen automatisch, ob in diesem Repository ein Update bereitsteht. Auf der Startseite erscheint dann **Jetzt aktualisieren**. Erst nach einem Klick auf diese Schaltfläche und der Freigabe des Programmordners werden Dateien geändert. Mit **Später** lässt sich die Installation verschieben; **Nach Updates suchen** startet eine neue Prüfung.

Für den ersten Umstieg von der ursprünglichen App muss diese Version einmal manuell heruntergeladen werden: `Tagebuch.html` und `app/` ersetzen, die vorhandenen Ordner `config/` und `kinder/` behalten. Danach stehen die Updates innerhalb der App zur Verfügung.

Der Updater lädt ausschließlich `Tagebuch.html` und freigegebene Programmdateien unter `app/`. Er prüft die Größe und SHA-256-Prüfsumme jeder Datei, bevor die Installation beginnt. `config/`, `kinder/` und persönliche Sicherungen werden nicht aktualisiert. Nach der Installation auf **Neu laden** klicken; vorher speichert die App den aktuellen Stand.

Die bisherigen Programmdateien werden in `.tagebuch-update-backup/` gesichert. Bei einem Schreibfehler versucht der Updater, sie wiederherzustellen. Ein unterbrochenes Update mit vorhandener `pending.json` wird beim nächsten Installationsversuch zuerst zurückgesetzt. Ein Absturz oder Stromausfall kann dennoch einen unvollständigen Programmstand hinterlassen: Falls die App nicht mehr startet, `Tagebuch.html` und `app/` erneut aus dem Repository herunterladen und ersetzen, ohne die Datenordner zu verändern.

Ohne Internet oder bei einem fehlgeschlagenen Update-Check läuft die installierte App weiter. Die Prüfung fragt `updates.json` und bei bestätigter Installation die Programmdateien von `raw.githubusercontent.com/seven0584/MeinLRSTagebuch/main/` ab. Tagebuchtexte oder Einstellungen werden dabei nicht übermittelt. Das Repository muss für diesen Ablauf öffentlich zugänglich sein; der Updater speichert keine GitHub-Zugangsdaten. Die Prüfungen sichern die Übertragung und erkennen beschädigte Dateien; die Quelle der Programmupdates bleibt der vertrauenswürdige Stand dieses Repositories.

## Sprachausgabe einstellen

Im Elternbereich unter **Einstellungen → Stimme und Diktat testen** eine deutsche Stimme und das Sprechtempo auswählen. Mit **Hörprobe** und **Langsame Hörprobe** lässt sich ein eigener kurzer Text testen; **Stopp** beendet die Wiedergabe. Die gespeicherte Auswahl gilt für alle Kinder und für Diktate, Fragen und das Vorlesen. Eine auf einem anderen Gerät fehlende Stimme wird automatisch durch eine verfügbare deutsche Stimme ersetzt.

Auf Windows-Geräten bietet die App Links zu den System-Sprach- und Sprachausgabe-Einstellungen. Der Browser kann eine Bestätigung verlangen oder den Aufruf blockieren; dann den beschriebenen Weg über das Windows-Startmenü nutzen. Nach dem Hinzufügen einer Stimme **Stimmen neu laden** wählen oder den Browser vollständig neu starten. Die App kann ausschließlich Stimmen verwenden, die der Browser bereitstellt. Manche Stimmen benötigen Internet. Die Hörprobe selbst muss auf dem jeweiligen Gerät beurteilt werden.

Auf **macOS** zeigt die App den Weg zu **Systemeinstellungen → Bedienungshilfen → Gesprochene Inhalte / Lesen & Sprechen → Systemstimme**. Ein Link kann die Bedienungshilfen auf neueren macOS-Versionen öffnen. Wenn der Browser den Aufruf blockiert oder die macOS-Version ihn nicht unterstützt, die Systemeinstellungen über das Apple-Menü öffnen. Eine im System installierte Stimme muss nicht im Browser auswählbar sein. Auf dem Mac weiterhin Chrome oder Edge für die Ordnerspeicherung verwenden; Safari unterstützt diesen Speicherablauf nicht.

## Shop bearbeiten

Im Elternbereich unter **Belohnungen** gilt der Shop für das oben ausgewählte Kind. Namen, Preise und Symbole werden beim Bearbeiten automatisch gespeichert, sobald Name und Preis gültig sind. Die Schaltfläche 😀 neben dem Symbolfeld öffnet eine Emoji-Auswahl. Alternativ ein eigenes Symbol direkt ins Feld eingeben. Änderungen stehen dem Kind beim nächsten Öffnen seines Shops sofort zur Verfügung.

Bei leeren Namen oder Preisen unter 1 Coin bleibt der letzte gültige Stand erhalten; die App zeigt einen Hinweis. **Löschen** entfernt einen Artikel ausdrücklich. Der Preis wird in ganzen Coins gespeichert.

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

## Schreibziele, offene Wörter und freiwillige Aufgaben

Unter **Eltern → Gemeinsam starten** stehen Schreibumfang, Satzlänge, Schreibtage und Coins nebeneinander. Ein Beispieltext zeigt, ob das Ziel erreicht wäre und welche Tagebuch-Coins er bringen würde. Alle bisherigen Einstellungen und die Wochenabrechnung bleiben erhalten. Die Vorschau prüft keine Rechtschreibung.

Kinder schreiben in einem Hauptfeld. Die drei Fragen stehen unter **Freiwillige Schreibideen**; eingetragene Antworten bleiben auch beim Zuklappen erhalten und zählen mit. Nach **Prüfen** können Kinder eine Wortstelle direkt bearbeiten, Hinweise öffnen oder melden, dass ein Tipp noch nicht hilft. **Hier weiß ich nicht weiter** und **Meine Schreibweise stimmt, bitte prüfen** stellen nur dieses einzelne Wort zurück. Die App korrigiert es nicht automatisch. Ein Eintrag mit offenen Wörtern kann abgeschlossen werden, sobald das bestehende Schreibziel und die übrigen Prüfungen erfüllt sind.

Unter **Wörter und Rückmeldungen** lassen sich solche Stellen später bearbeiten oder gezielt mit den Eltern teilen. Neue private Wortformen, Kontextausschnitte und daraus entstandene Übungswörter sind in der Elternoberfläche nur nach Freigabe sichtbar. Vorhandene alte Übungswörter bleiben sichtbar. Ein Kontextausschnitt umfasst höchstens 160 Zeichen vor und nach dem Wort innerhalb desselben Satzes. Das ist ein Sichtschutz in der Oberfläche; die bestehenden Grenzen von PINs und Ordnerzugriff gelten weiter.

Die Elternübersicht trennt beobachtete Verbesserungen, offene Wörter und beanstandete Bewertungen. Eine Beanstandung bleibt als Rückfrage erhalten, auch wenn das Kind danach weiterübt. Die Eltern können geteilte Stellen oder Aufgabenantworten bestätigen, als zulässig anerkennen oder ungeklärt lassen. Hinweise sind keine Diagnose. Weniger Markierungen allein belegen keinen Lernfortschritt; die Schreibmenge und die bearbeiteten Aufgaben können sich verändert haben.

Unter **Übersicht → Eine freiwillige Aufgabe anbieten** können Eltern ein Wort-Diktat mit 1 bis 5 Wörtern oder einen kurzen Text aus einem kleinen eigenen Materialbestand wählen. Die Vorschau zeigt das Material. Der maximale Coinbetrag lässt sich je Aufgabe zwischen 0 und 10.000 einstellen; der letzte Betrag wird für dieses Kind vorbelegt. Noch nicht begonnene Aufgaben lassen sich ändern. Nach Beginn bleiben Material und Coinvereinbarung fest; Aufgaben können zurückgenommen werden, ohne den erreichten Anteil zu verlieren.

Das Kind findet das Angebot unter **Üben → Für dich angeboten**. Aufgaben sind freiwillig und lassen sich pausieren. Bei Wort-Diktaten wird das Wort mit einem Satz zum Verständnis vorgelesen. Nach einem eigenen Versuch ist eine Vergleichsschreibweise verfügbar. Im kurzen Text werden Wortschreibweisen geprüft; Satzzeichen bringen dort keine zusätzlichen Coins und werden nicht bewertet. Antworten auf angebotene Aufgaben sind für Eltern sichtbar.

Die Extra-Coins werden beim Abschluss separat gutgeschrieben: `abrunden(maximale Coins × bearbeitete Zielwörter / alle Zielwörter)`. Verbesserungen nach einem Hinweis zählen mit; leere Eingaben und nur übersprungene Wörter zählen nicht. Spätere Bearbeitung oder Anerkennung einer zulässigen eigenen Antwort kann den noch fehlenden Anteil ergänzen. Es gibt keine Doppelzahlung und keine automatische Rücknahme bereits gebuchter Coins. Die bisherigen freien Diktate bleiben mit ihrer Spielzeitvergütung verfügbar.

Oben in der Kinderansicht stehen **verfügbare Coins** (nach Reservierungen für Einkaufswünsche) und **diese Woche gesammelte Tagebuch-Coins** getrennt. Die Wochenbedingungen bleiben unverändert.

Automatische Mustervorschläge erfordern mindestens drei verschiedene zuordenbare Wörter an mindestens zwei Tagen in den letzten 30 Tagen. Beanstandete, ungeklärte und als zulässig anerkannte Fälle werden dafür ausgeschlossen. Diese Schwelle ist eine Produktheuristik, kein wissenschaftlich validierter Test und keine Vorgabe für die Übungshäufigkeit. Es gibt keine verpflichtende Klassenstufenabfrage. Die Regeln und Beispiele wurden bei der Umsetzung durchgesehen; eine externe pädagogische Begutachtung und beobachtete Tests mit Familien stehen aus.

## Wenn nach einem Update etwas nicht funktioniert

Kompatible vorhandene Profile werden um die neuen Lerndaten ergänzt. Einträge, bisherige Belohnungsregeln, PINs und Bilder bleiben im bestehenden Speichersystem. Neue Wortverläufe, Aufgaben und Buchungen gehören zu Browserstand, Ordnerspeicherung und kennwortgeschützter Sicherung. Die neuen Detaildaten werden in dieser Version nicht automatisch nach Alter gelöscht.

Fehlen Programmteile oder wird ein unbekanntes neueres Datenformat erkannt, zeigt die App einen Starthinweis: Kinder sollen einen Erwachsenen holen; Eltern erhalten konkrete Schritte. Ein unbekannter oder unvollständiger Ordner wird vor Schreibzugriff zurückgewiesen, auch wenn sein Zeitstempel älter als der Browserstand ist.

1. Die App einmal neu öffnen. Bleibt das Problem, die **vollständige aktuelle Veröffentlichung** von der [Release-Seite](https://github.com/seven0584/MeinLRSTagebuch/releases/latest) herunterladen.
2. Alle Programmdateien zusammen entpacken. Nur `Tagebuch.html` und `app/` ersetzen; `config/` und `kinder/` behalten. Keine Browserdaten löschen. Denselben Browser und Speicherort verwenden.
3. Unter **Eltern → Einstellungen → Speicherort** den bisherigen Ordner erneut verbinden. Bei einer fehlenden Stimme unter **Stimme und Diktat testen** eine Hörprobe machen; dort stehen auch die Windows- und macOS-Anleitungen.
4. Bei einem Speicherfehler nicht schließen: noch sichtbaren Text kopieren, freien Speicher und Browser-Einstellungen prüfen. Fehlgeschlagene neue Lernschritte und Coinbuchungen werden nicht als gespeichert bestätigt. Eine Sicherung nur gezielt über **Sicherung wiederherstellen** einspielen.

Die neuen Wortverläufe und Kontextausschnitte werden nicht zusätzlich an ntfy versandt. Die optionale Onlineprüfung des Tagebuchtexts durch LanguageTool bleibt eine eigene Einstellung.

## Entwicklung

Die Umsetzung für Version 1.3.0 ist im [Entwicklungsplan](docs/entwicklungsplan-rechtschreibfoerderung.md) beschrieben. Das zugrunde liegende [Konzept](docs/konzept-rechtschreibfoerderung.md) enthält Anforderungen und Akzeptanzkriterien. Der [Prüfbericht](docs/pruefbericht-1.3.0.md) nennt technische Nachweise und offene Prüfungen mit echten Eltern und Kindern.

Die Quellen bestehen aus HTML, CSS und JavaScript. Für den Betrieb gibt es keinen Paketmanager oder Build-Schritt. Die Updater-Tests verwenden den integrierten Test-Runner von Node.js (Version 22 oder neuer):

```bash
node --test tests/update-core.test.cjs tests/learning-core.test.cjs
```

Für die Shop-Korrekturen gibt es zusätzlich einen Browser-Regressionstest. Wenn Python 3, Playwright und Chromium verfügbar sind, `node tests/shop-browser.cjs` ausführen. Der Test startet einen eigenen lokalen Server auf Port 8765 und verwendet ausschließlich Testprofile. Ein abweichender Chromium-Pfad kann über `CHROMIUM_PATH` gesetzt werden.

`node tests/speech-browser.cjs` prüft Stimmenauswahl, Tempo, Hörproben, Stoppen, Speicherung und die Übernahme ins Kinderdiktat mit simulierten Stimmen. Er startet einen lokalen Testserver auf Port 8766. Diese Prüfung bewertet weder den hörbaren Klang noch das Öffnen echter Windows- oder macOS-Einstellungen; beides auf dem jeweiligen Gerät prüfen.

Die neuen Browserprüfungen laufen mit denselben Voraussetzungen:

```bash
node tests/learning-browser.cjs
node tests/learning-storage-browser.cjs
node tests/learning-edge-browser.cjs
```

Sie verwenden künstliche Profile und eigene lokale Server auf den Ports 8767–8769. Die Ordnerprüfung simuliert Browser-Dateihandles, verwendet aber die tatsächliche Speicher- und Verschlüsselungslogik. Die Sicherung wird über den echten Download-/Wiederherstellungsablauf geprüft. Das ersetzt keinen Test des Betriebssystemdialogs auf einem Windows-PC oder Mac. Screenshots und temporäre Sicherungen liegen unter `/tmp`, nicht im Repository.

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

### Ein Update veröffentlichen

1. Programmänderungen umsetzen und prüfen.
   Die Änderungen in `CHANGELOG.md` für Eltern und Lehrkräfte erklären: Was ist neu oder behoben, und müssen sie etwas tun?
2. In `app/version.js` die ganzzahlige `release` erhöhen und die angezeigte `version` ändern. Auch bei kleinen Korrekturen muss `release` steigen, damit bereits installierte Apps das Update erkennen.
3. Aus dem Repository-Hauptordner `node scripts/prepare-update.cjs` ausführen. Das erzeugt die Offline-Änderungsübersicht `app/changelog-data.js` aus `CHANGELOG.md` sowie `updates.json` mit den Größen und SHA-256-Prüfsummen der aktuellen Programmdateien. Die erzeugte Übersicht nicht von Hand ändern.
4. `node --test tests/update-core.test.cjs` ausführen. Nach Änderungen an Programmdateien das Manifest erneut erzeugen.
5. Programmdateien, Versionsdatei und `updates.json` gemeinsam committen und auf `main` pushen.

Das Manifest enthält bewusst keine Familien- oder Kinderdaten und keine Entwicklungsdateien. Ändert sich das Repository während eines Downloads, führen abweichende Prüfsummen zum Abbruch vor der Installation; später erneut prüfen.

## Lizenzen und Quellen

Die Repository-Lizenz steht in [LICENSE](LICENSE). Enthaltene Drittanbieterbestandteile behalten ihre jeweiligen Lizenzbedingungen. Laut den mitgelieferten Hinweisen stammen:

- das deutsche Rechtschreibwörterbuch aus **igerman98** (GPL),
- die Rechtschreibkomponente aus **Hunspell** (LGPL/MPL),
- die Übungstexte aus **Klexikon/MiniKlexikon** (CC BY-SA 4.0),
- Teile der Spiele und Spielsounds aus **Vintage Arcade** von Gbolahan Aziz (MIT).

Die Spielhinweise einschließlich MIT-Lizenztext stehen in [app/spiele/LIZENZEN.txt](app/spiele/LIZENZEN.txt). Die Herkunftshinweise in [LIESMICH.txt](LIESMICH.txt) ergänzen diese Angaben. Vor einer Weiterveröffentlichung die vollständigen Lizenz- und Attributionsanforderungen der enthaltenen Komponenten prüfen; die Repository-Lizenz ersetzt diese nicht.
