# Mein LRS-Tagebuch

Ein deutschsprachiges Tagebuch zum regelmäßigen Schreiben, Lesen und Üben der Rechtschreibung. Kinder haben eigene Profile und PINs; Eltern stellen Ziele, Belohnungen und Spielzeit ein und sehen Lernstatistiken.

Im Windows-Dev kommen ein geführter Elternbereich und eine Gefühlsübersicht hinzu: Das Kind wählt vor dem Speichern ein bis drei Gefühle, darunter 😍 für „geliebt“. Lokale KI-Hinweise aus dem Freitext werden separat gezeigt. Der Kalender ordnet Tageswerte nach KWs; Wochen und Monate werden erst für vollständig erfasste Kalenderzeiträume ausgewertet. Prozentwerte zeigen Häufigkeiten pro erfasstem Tag, keine psychologische Bewertung. Die freiwilligen Tagesfragen bleiben privat.

Die Windows-App 2.0 läuft im Browser über einen lokalen Server auf diesem PC. Das portable ZIP enthält die Node.js-Laufzeit, Wörterbuch, Übungstexte und Spiele. Eine separate Node.js-Installation ist dafür nicht nötig. Die optionale Online-Grammatikprüfung und Benachrichtigungen benötigen Internet.

**Aktuelle Version: Windows 2.0.0.** Die zusätzliche lokale KI mit Ollama kann auf Wunsch eingerichtet werden. Sie liefert Korrekturvorschläge; freie lokale KI-Erklärungen bleiben wegen der nicht erreichten Qualitätsanforderung ausgeschaltet. [Release auf GitHub](https://github.com/seven0584/MeinLRSTagebuch/releases/tag/v2.0.0) · [Entwicklungsstand](docs/ENTWICKLUNG.md#windows-dev-und-spätere-plattformen).

## Schnell starten

1. Im [Windows-Release 2.0.0](https://github.com/seven0584/MeinLRSTagebuch/releases/tag/v2.0.0) das Windows-x64-ZIP herunterladen und vollständig entpacken.
2. Den entpackten Ordner `Tagebuch` an einen festen Platz legen.
3. `Start.cmd` doppelklicken und das Konsolenfenster während der Nutzung offen lassen.
4. Die App öffnet sich im Browser. Sie speichert automatisch im eigenen Ordner `data/`; der Pfad steht im Elternbereich.
5. Im Bereich **Eltern** eine Eltern-PIN festlegen und Kinder anlegen. Jedes Kind legt anschließend seine eigene PIN fest.

Vor einem Update die App schließen und den bisherigen Ordner sichern. Die neue Version getrennt entpacken und den bisherigen `data/`-Ordner übernehmen. Alte Datei-/HTML-Versionen können über ihre Sicherungsfunktion in die neue App übertragen werden. Die ältere [Datei-Version](Release/Tagebuch.zip) bleibt als historischer Download erhalten.

Für die Entwicklung mit installiertem Node.js zuerst `npm ci`, dann `npm run dev` starten und `http://127.0.0.1:8765` öffnen. Der Build prüft die Freigaben der Diktattexte. Eine HTML-Datei in der GitHub-Dateiansicht startet die App nicht. Unter **Eltern → Einstellungen → Prüfung & Lernhilfe** kann die optionale lokale KI eingerichtet werden; Modelle und Ollama-Laufzeit werden separat heruntergeladen und sind nicht im ZIP enthalten.

## Tagesabschnitte in Version 2.0

Das Kind beendet eine Prüfung selbst mit **Eintrag speichern**. Eine fehlerfreie Prüfung speichert nicht mehr automatisch. Über **Noch etwas ins Tagebuch schreiben** ergänzt es einen weiteren Abschnitt: Bisherige Texte des Tages bleiben darüber unveränderbar lesbar, neue Texte werden geprüft und zählen mit zum Tagesziel. Weitere Abschnitte bringen nach den bisherigen Satz- und Wortregeln zusätzliche Coins; alte Texte werden nicht erneut vergütet. **Erklärung und Merkhilfe** bietet an Markierungen zusätzliche Regeln oder Übungsstrategien.

## Funktionen

Im Windows-Dev lässt sich unter **Eltern → Einstellungen → Prüfung & Lernhilfe**
auch **OpenAI (ChatGPT-Modelle)** einrichten. API-Schlüssel speichern, das
erfundene Beispiel testen und die Voraussetzungen für Kindertexte klären.
Der Schlüssel bleibt verschlüsselt beim lokalen Server. Die App markiert
Textstellen und gibt Lernhinweise; das Kind korrigiert selbst und darf mit
offenen Stellen abschließen. Die Einrichtung steht in der [Bedienungsanleitung](docs/BEDIENUNG.md).

- Freies Schreiben, Rechtschreibhinweise und ein persönlicher Wortschatz.
- Direkt im Schreibblock korrigieren, Hinweise rechts daneben und **Prüfen** über dem Text. Bei eingeschalteter lokaler KI wird ein begrenzter Freitextausschnitt im Zusammenhang geprüft. Für Kinder werden ausschließlich bereits geprüfte Korrekturvorschläge angezeigt. Die normalen Wörterbuch-/Regelhinweise bleiben verfügbar.
- Freiwilliger Tagesrückblick im Dev-Stand: Ein Wort oder Emoji genügt, Antworten werden ohne Sprachprüfung gespeichert. Auch ein reiner Rückblick ist ohne Mindestumfang des Tagesauftrags möglich.
- Geführte Eltern-Einstellungen in sechs Schritten. Für die lokale KI stehen unter anderem Qwen 3 4B Instruct, Qwen 3 8B, Gemma 3 4B und OpenAI gpt-oss 20B zur Auswahl. Auch Korrekturvorschläge können falsch sein; die bisherigen Fachtests und Grenzen sind dokumentiert.
- Tagebucheinträge mit selbst gemalten Bildern und einer Ansicht zum Nachlesen.
- 54 eigene, redaktionell und sprachlich geprüfte Diktattexte ab Klasse 5: alle 27 Schwerpunkte in zwei Stufen, mit konkreten Zielstellen, verbindlicher Auswahl, kenntlich gemachten Wiederholungen und Fortschritt je Schwerpunkt.
- Mehrere Kinder mit getrennten Einträgen, Übungen, Coins und PINs.
- Einstellbare Schreib- und Leseziele, Belohnungswünsche, Joker und Pausentage.
- Spiele mit begrenzter täglicher Spielzeit.
- Automatisches Speichern in einem freigegebenen Ordner sowie Sicherungen mit Kennwort.
- Optionale Grammatikprüfung über LanguageTool und Eltern-Benachrichtigungen über ntfy.

## Daten und Online-Funktionen

Im Ordnerbetrieb speichert die App Familien-Einstellungen unter `config/` und die Daten jedes Kindes unter `kinder/`. Zusätzlich nutzt sie den Browser-Speicher. Im reinen Browserbetrieb gehen Daten beim Löschen dieses Speichers verloren, sofern keine Sicherung vorhanden ist.

**Die Online-Grammatikprüfung ist im Ausgangszustand aktiviert.** Beim Prüfen wird der Text über HTTPS an LanguageTool übertragen. Für eine Nutzung ohne diese Textübertragung den Haken im Elternbereich unter Einstellungen entfernen. ntfy erhält bei eingerichtetem Kanal Benachrichtigungen mit Namen und Aktivitäten, jedoch keine Tagebuchtexte. Details stehen in der [Dokumentation zu Daten und Speicherung](docs/DATEN-UND-SPEICHERUNG.md).

PINs dienen als Sichtschutz innerhalb der App. Die Ordnerdateien sind verschlüsselt, der zugehörige Schlüssel liegt aber in der Familien-Konfiguration. Das schützt nicht vor Personen mit Zugriff auf den gesamten Ordner oder das Browserprofil.

## Bisherige Datei-Version

Die Dateien `Tagebuch.html`, `app/` und `updates.json` im Repository-Hauptordner gehören zur bisherigen Datei-Version. Version 1.3.5 aktualisiert dort ausschließlich Versionshinweis und Änderungsübersicht; ihre Funktionen entsprechen 1.3.4. Die [bisherige Anleitung](docs/dateiversion-1.3.4.md) bleibt erhalten. Die neuen geprüften Diktate und die lokale KI gehören zur Windows-App unter `Dev/` und zum Windows-Release 2.0.0. Deren Start erfolgt mit `Start.cmd`; die Update-Suche der Datei-Version installiert diesen Server nicht.

Die [Update-Veröffentlichung für die Datei-Version](docs/dateiversion-1.3.4.md#ein-update-veröffentlichen) wird getrennt vom [Windows-Build](docs/ENTWICKLUNG.md) vorbereitet. Vor dem Wechsel den bisherigen Datenordner und das Browserprofil sichern.

## Repository

| Pfad | Inhalt |
| --- | --- |
| `Dev/` | Windows-App 2.0, über den lokalen Server ausführbar |
| `Tagebuch.html`, `app/`, `updates.json` | Bisherige Datei-Version mit eigenem Update-Manifest |
| `Dev/app/` | JavaScript, CSS, Wörterbuch, Übungen und Spiele |
| `Dev/config/`, `Dev/kinder/` | Hinweise und Speicherorte für Laufzeitdaten; persönliche Daten werden von Git ausgeschlossen |
| `Release/Tagebuch.zip` | Mitgeliefertes, entpackbares Anwendungspaket |
| `docs/` | Bedienung, Speicherung und Entwicklung |

## Dokumentation

- [GUI-, Backend- und Fachtests für Version 2.0](docs/testplan-version-2.md): Befehle, Testumfang und Grenzen. Ausgeführte Tests und tatsächliche Modellantworten werden im [Prüfbericht](docs/pruefbericht-version-2-tests.md) dokumentiert. Der Fachlauf startet ausschließlich mit ausdrücklichem `--execute`.
- [Neues Diktatmaterial ab Klasse 5](docs/diktatmaterial-klasse-5.md): 54 geprüfte Texte, Zielstellen, Auswahl, Fortschritt und Nachweise. Die [Prüfung der früheren 2.600 Vorlagen](docs/pruefbericht-diktate-klasse-5.md) dokumentiert den Anlass der Überarbeitung.

- [Bedienung und Problemlösung](docs/BEDIENUNG.md)
- [Daten, Speicherung und Sicherungen](docs/DATEN-UND-SPEICHERUNG.md)
- [Entwicklung, Prüfung und Release-Erstellung](docs/ENTWICKLUNG.md)
- [Lokaler Modellvergleich mit dem Rechtschreib-Stresstest](docs/MODELLVERGLEICH.md)
- [Erster Brill-&-Moore-Prototyp mit Kindertexten](docs/FEHLERMODELL-PROTOTYP.md)
- [Erweiterter Wortbestand und Kontextauswahl](docs/FEHLERMODELL-KONTEXT.md)
- [Gemeinsame Bewertung aus Fehlerkosten und Satzkontext](docs/FEHLERMODELL-GEMEINSAM.md)
- [Schwellenwertvergleich und Abschluss mit offenen Stellen](docs/FEHLERMODELL-SCHWELLENWERT.md)
- [Drittanbieter und Lizenzen](docs/DRITTANBIETER.md)

## Lizenz

Die im Repository vorhandene [Apache-2.0-Lizenz](LICENSE) bleibt erhalten. Für eingebundene Bibliotheken, Wörterbücher, Texte und Spielbestandteile gelten eigene Lizenzbedingungen, unter anderem GPL, LGPL/MPL, CC BY-SA und MIT. Diese Bestandteile werden durch die Repository-Lizenz nicht neu lizenziert. Die bekannten Quellen und noch zu prüfenden Nachweise stehen in [Drittanbieter und Lizenzen](docs/DRITTANBIETER.md).
