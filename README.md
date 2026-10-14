# Mein LRS-Tagebuch

Ein deutschsprachiges Tagebuch zum regelmäßigen Schreiben, Lesen und Üben der Rechtschreibung. Kinder haben eigene Profile und PINs; Eltern stellen Ziele, Belohnungen und Spielzeit ein und sehen Lernstatistiken.

Die Anwendung läuft direkt im Browser. Es gibt keinen eigenen Server, keine Installation und keinen Build-Schritt. Wörterbuch, Übungstexte und Spiele sind im Download enthalten. Die zusätzliche Online-Grammatikprüfung und Benachrichtigungen benötigen Internet.

## Schnell starten

1. [Release/Tagebuch.zip](Release/Tagebuch.zip) herunterladen und vollständig entpacken.
2. Den entpackten Ordner `Tagebuch` an einen festen Platz legen.
3. `Tagebuch.html` mit Chrome oder Microsoft Edge am PC öffnen.
4. In der App den Ordner auswählen, in dem `Tagebuch.html` liegt, und Schreibzugriff erlauben.
5. Im Bereich **Eltern** eine Eltern-PIN festlegen und Kinder anlegen. Jedes Kind legt anschließend seine eigene PIN fest.

Zum Ausprobieren des Quellstands stattdessen [Dev/Tagebuch.html](Dev/Tagebuch.html) lokal öffnen und den Ordner `Dev` auswählen. Eine HTML-Datei in der GitHub-Dateiansicht startet die App nicht.

## Funktionen

- Freies Schreiben und Fragen als Schreibhilfe, Rechtschreibhinweise und ein persönlicher Wortschatz.
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
- [Drittanbieter und Lizenzen](docs/DRITTANBIETER.md)

## Lizenz

Die im Repository vorhandene [Apache-2.0-Lizenz](LICENSE) bleibt erhalten. Für eingebundene Bibliotheken, Wörterbücher, Texte und Spielbestandteile gelten eigene Lizenzbedingungen, unter anderem GPL, LGPL/MPL, CC BY-SA und MIT. Diese Bestandteile werden durch die Repository-Lizenz nicht neu lizenziert. Die bekannten Quellen und noch zu prüfenden Nachweise stehen in [Drittanbieter und Lizenzen](docs/DRITTANBIETER.md).
