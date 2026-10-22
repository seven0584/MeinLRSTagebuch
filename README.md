# Mein LRS-Tagebuch

Ein deutschsprachiges Tagebuch zum regelmäßigen Schreiben, Lesen und Üben der Rechtschreibung. Kinder haben eigene Profile und PINs; Eltern stellen Ziele, Belohnungen und Spielzeit ein und sehen Lernstatistiken.

Im Windows-Dev kommen ein geführter Elternbereich und eine Gefühlsübersicht hinzu: Das Kind wählt vor dem Speichern ein bis drei Gefühle, darunter 😍 für „geliebt“. Lokale KI-Hinweise aus dem Freitext werden separat gezeigt. Der Kalender ordnet Tageswerte nach KWs; Wochen und Monate werden erst für vollständig erfasste Kalenderzeiträume ausgewertet. Prozentwerte zeigen Häufigkeiten pro erfasstem Tag, keine psychologische Bewertung. Die freiwilligen Tagesfragen bleiben privat.

Die Anwendung läuft direkt im Browser. Es gibt keinen eigenen Server, keine Installation und keinen Build-Schritt. Wörterbuch, Übungstexte und Spiele sind im Download enthalten. Die zusätzliche Online-Grammatikprüfung und Benachrichtigungen benötigen Internet.

**Aktuelle Entwicklung: Windows-PC.** In `Dev/` ist eine zusätzliche lokale Lernhilfe mit Ollama vorbereitet. Oberfläche, Lernhilfe-Kern und KI-Anbindung sind getrennt, damit spätere mobile Apps oder eine gehostete PWA darauf aufbauen können. Eine mobile App und Hosting werden derzeit nicht implementiert. Der vorhandene ZIP-Release ist davon getrennt. [Entwicklungsstand](docs/ENTWICKLUNG.md#windows-dev-und-spätere-plattformen).

## Schnell starten

1. [Release/Tagebuch.zip](Release/Tagebuch.zip) herunterladen und vollständig entpacken.
2. Den entpackten Ordner `Tagebuch` an einen festen Platz legen.
3. `Tagebuch.html` mit Chrome oder Microsoft Edge am PC öffnen.
4. In der App den Ordner auswählen, in dem `Tagebuch.html` liegt, und Schreibzugriff erlauben.
5. Im Bereich **Eltern** eine Eltern-PIN festlegen und Kinder anlegen. Jedes Kind legt anschließend seine eigene PIN fest.

Zum Ausprobieren des Quellstands stattdessen [Dev/Tagebuch.html](Dev/Tagebuch.html) lokal öffnen und den Ordner `Dev` auswählen. Eine HTML-Datei in der GitHub-Dateiansicht startet die App nicht.

Für die Windows-Entwicklung mit installiertem Node.js: `npm run dev` starten und `http://127.0.0.1:8765` öffnen. **Es ist keine Ordnerauswahl nötig:** Der lokale Dev-Server legt die Daten automatisch unter `data/` im Projektordner ab. Der genaue Pfad steht im Elternbereich unter Speicherort. Er bleibt auf diesem PC; `data/` ist von Git ausgeschlossen. Unter **Eltern → Einstellungen → Zusätzliche Lernhilfe** ein Modell auswählen und **Lokale KI und Modell herunterladen** wählen. Die App verwaltet eine eigene Ollama-Laufzeit ohne separaten Installer. Anschließend das Beispiel testen, die Lernhilfe einschalten und speichern. Die bisherige Datei-/ZIP-Version braucht weiterhin weder Node.js noch einen Build und verwendet ihren bisherigen Ordnerdialog. Die neue KI-Einrichtung ist noch nicht im ZIP enthalten.

## Funktionen

Im Windows-Dev lässt sich unter **Eltern → Einstellungen → Prüfung & Lernhilfe**
auch **OpenAI (ChatGPT-Modelle)** einrichten. API-Schlüssel speichern, das
erfundene Beispiel testen und die Voraussetzungen für Kindertexte klären.
Der Schlüssel bleibt verschlüsselt beim lokalen Server. Die App markiert
Textstellen und gibt Lernhinweise; das Kind korrigiert selbst und darf mit
offenen Stellen abschließen. Die Einrichtung steht in der [Bedienungsanleitung](docs/BEDIENUNG.md).

- Freies Schreiben, Rechtschreibhinweise und ein persönlicher Wortschatz.
- Im aktuellen Dev-Stand: direkt im Schreibblock korrigieren, Hinweise rechts daneben und **Prüfen** über dem Text. Bei eingeschalteter lokaler Lernhilfe prüft die KI dabei zusätzlich einen begrenzten Freitextausschnitt im Zusammenhang; weitere Erklärungen lassen sich einzeln anfordern. In den Eltern-Einstellungen vergleicht **Modell automatisch auswählen** heruntergeladene Modelle auf Prozessor und Grafikbeschleunigung.
- Freiwilliger Tagesrückblick im Dev-Stand: Ein Wort oder Emoji genügt, Antworten werden ohne Sprachprüfung gespeichert. Auch ein reiner Rückblick ist ohne Mindestumfang des Tagesauftrags möglich.
- Geführte Eltern-Einstellungen in sechs Schritten im Dev-Stand. Für die lokale KI stehen unter anderem Qwen 3 4B Instruct (`qwen3:4b-instruct-2507-q4_K_M`), Qwen 3 8B und Gemma 3 4B zur Auswahl; die Erklärungsqualität bitte selbst mit dem Beispiel testen.
- Tagebucheinträge mit selbst gemalten Bildern und einer Ansicht zum Nachlesen.
- Rechtschreibübungen, Diktate mit Browser-Sprachausgabe und Auswertung von Fehlermustern.
- Mehrere Kinder mit getrennten Einträgen, Übungen, Coins und PINs.
- Einstellbare Schreib- und Leseziele, Belohnungswünsche, Joker und Pausentage.
- Spiele mit begrenzter täglicher Spielzeit.
- Automatisches Speichern in einem freigegebenen Ordner sowie Sicherungen mit Kennwort.
- Optionale Grammatikprüfung über LanguageTool und Eltern-Benachrichtigungen über ntfy.

## Daten und Online-Funktionen

Im Ordnerbetrieb speichert die App Familien-Einstellungen unter `config/` und die Daten jedes Kindes unter `kinder/`. Zusätzlich nutzt sie den Browser-Speicher. Im reinen Browserbetrieb gehen Daten beim Löschen dieses Speichers verloren, sofern keine Sicherung vorhanden ist.

**Die Online-Grammatikprüfung ist im Ausgangszustand aktiviert.** Beim Prüfen wird der Text über HTTPS an LanguageTool übertragen. Für eine Nutzung ohne diese Textübertragung den Haken im Elternbereich unter Einstellungen entfernen. ntfy erhält bei eingerichtetem Kanal Benachrichtigungen mit Namen und Aktivitäten, jedoch keine Tagebuchtexte. Details stehen in der [Dokumentation zu Daten und Speicherung](docs/DATEN-UND-SPEICHERUNG.md).

PINs dienen als Sichtschutz innerhalb der App. Die Ordnerdateien sind verschlüsselt, der zugehörige Schlüssel liegt aber in der Familien-Konfiguration. Das schützt nicht vor Personen mit Zugriff auf den gesamten Ordner oder das Browserprofil.

## Repository

| Pfad | Inhalt |
| --- | --- |
| `Dev/` | Bearbeitbarer Anwendungsstand, direkt im Browser ausführbar |
| `Dev/app/` | JavaScript, CSS, Wörterbuch, Übungen und Spiele |
| `Dev/config/`, `Dev/kinder/` | Hinweise und Speicherorte für Laufzeitdaten; persönliche Daten werden von Git ausgeschlossen |
| `Release/Tagebuch.zip` | Mitgeliefertes, entpackbares Anwendungspaket |
| `docs/` | Bedienung, Speicherung und Entwicklung |

## Dokumentation

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
