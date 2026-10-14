# Drittanbieter und Lizenzen

Die Liste beruht auf Hinweisen in den mitgelieferten Dateien. Sie dokumentiert die bekannten Quellen; sie ist kein vollständiger Nachweis aller Lizenzanforderungen. Die vorhandene Apache-2.0-Lizenz des Repositorys hebt die Bedingungen eingebundener Bestandteile nicht auf.

| Bestandteil | Quelle laut mitgelieferten Hinweisen | Lizenzhinweis |
| --- | --- | --- |
| Deutsches Hunspell-Wörterbuch in `woerterbuch.js` | igerman98, Björn Jacke; eingebettete Affixdaten nennen Version 20161207 | GPLv2/GPLv3 laut Datenkopf |
| Hunspell-Laufzeit in `hunspell.js` | Hunspell; genauer Bundle-/Wrapper-Stand nicht dokumentiert | `Dev/LIESMICH.txt` nennt LGPL/MPL |
| Übungstexte in `uebungen.js` | Klexikon und MiniKlexikon, über das Lexica-Korpus von Hewett & Stede | CC BY-SA 4.0 laut Dateikopf |
| QR-Code-Generator in `qrcode.js` | Kazuhiko Arase, Copyright 2009 | MIT laut Dateikopf |
| Weltraum-Angriff, Schlange und `sounds/sfx.js` | Vintage Arcade / Vintage-Games von Gbolahan Aziz | MIT laut `Dev/app/spiele/LIZENZEN.txt` |
| Bienchen-Labyrinth, Minensucher, Asteroiden-Sturm und Klötzchen-Regen | Laut `Dev/app/spiele/LIZENZEN.txt` eigene Umsetzungen für das Tagebuch | Keine separate Lizenz in diesen Hinweisen angegeben |

## Vorhandene Quellenhinweise

- Wörterbuch: `Dev/app/woerterbuch.js`, einschließlich des eingebetteten Affix-Dateikopfs.
- Übungen: `Dev/app/uebungen.js`; [Klexikon](https://klexikon.zum.de/).
- QR-Code-Generator: `Dev/app/qrcode.js`; [Projektseite im Dateikopf](http://www.d-project.com/).
- Spiele und Klangeffekte: [Vintage-Games](https://github.com/Gbolahan-Aziz/Vintage-Games) und `Dev/app/spiele/LIZENZEN.txt`.
- Übergreifende Hinweise: `Dev/LIESMICH.txt`.

## Noch zu vervollständigen

Im lokalen Ausgangsstand liegen für das Wörterbuch und die Hunspell-Laufzeit keine separaten vollständigen GPL-/LGPL-/MPL-Lizenztexte und kein dokumentierter Build des Hunspell-Bundles vor. Die genauen Versionen, Wrapper-Abhängigkeiten, Quellcodebezüge und erforderlichen Lizenztexte müssen für eine vollständige Weitergabe-Dokumentation ergänzt werden. Die Wörterbuch-Affixdaten weisen ausdrücklich auf mitzuliefernde GPL-Lizenztexte hin.

Für die Übungstexte ist die Herkunft auf Korpus-Ebene angegeben; eine Zuordnung jedes Textauszugs zum Ursprungsartikel liegt in den vorhandenen Dateien nicht vor. Für eine vollständige Attribution müssen diese Nachweise aus der ursprünglichen Datenquelle ergänzt werden. Bestehende Copyright- und Lizenzhinweise beim Bearbeiten oder Neuverpacken erhalten.
