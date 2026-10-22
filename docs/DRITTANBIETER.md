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

Für die automatisierten Entwicklungsprüfungen wird zusätzlich Playwright 1.64.1 verwendet (Apache-2.0, Version und transitive Pakete in `package-lock.json`). Es ist kein Bestandteil der Tagebuch-Laufzeit und des bestehenden ZIPs. Die Lernhilfe-Anbindung nutzt die lokale Ollama-API. Ollama und Modellgewichte liegen nicht im Repository oder ZIP, werden im Windows-Dev aber auf ausdrücklichen Wunsch durch die App heruntergeladen. Ollama steht unter [MIT](https://github.com/ollama/ollama/blob/main/LICENSE); die offiziellen Archive enthalten weitere Komponenten mit eigenen Lizenzhinweisen. Die entpackten Hinweise beibehalten. Die Modellbedingungen sind in der Auswahl verlinkt: [Qwen 3](https://ollama.com/library/qwen3:4b) (Apache-2.0) und [Gemma 3](https://ollama.com/library/gemma3:4b) (Gemma-Bedingungen). Die verworfenen Capacitor-/Apple-Mobil-Abhängigkeiten gehören nicht zum Projekt.

Im lokalen Ausgangsstand liegen für das Wörterbuch und die Hunspell-Laufzeit keine separaten vollständigen GPL-/LGPL-/MPL-Lizenztexte und kein dokumentierter Build des Hunspell-Bundles vor. Die genauen Versionen, Wrapper-Abhängigkeiten, Quellcodebezüge und erforderlichen Lizenztexte müssen für eine vollständige Weitergabe-Dokumentation ergänzt werden. Die Wörterbuch-Affixdaten weisen ausdrücklich auf mitzuliefernde GPL-Lizenztexte hin.

Für die Übungstexte ist die Herkunft auf Korpus-Ebene angegeben; eine Zuordnung jedes Textauszugs zum Ursprungsartikel liegt in den vorhandenen Dateien nicht vor. Für eine vollständige Attribution müssen diese Nachweise aus der ursprünglichen Datenquelle ergänzt werden. Bestehende Copyright- und Lizenzhinweise beim Bearbeiten oder Neuverpacken erhalten.

## Optionaler OpenAI-Dienst

Die OpenAI-Anbindung verwendet die HTTPS-API, ohne ein OpenAI-SDK oder Modellgewichte mitzuliefern. OpenAI ist ein optionaler externer Verarbeitungsdienst und keine eingebettete Lizenzkomponente. Ein eigener API-Zugang und die beim Anbieter geltenden Nutzungs- und Abrechnungsbedingungen sind erforderlich; ein ChatGPT-Abonnement umfasst kein API-Guthaben. [API-Preise](https://developers.openai.com/api/docs/pricing), [Vorgaben für Minderjährige](https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance), [Datenkontrollen](https://developers.openai.com/api/docs/guides/your-data).

Die Eltern schalten die Übertragung ausdrücklich ein. API-Schlüssel werden serverseitig gehalten. Die Checkbox zur Zero-Data-Retention-Freischaltung bestätigt nur die bereits beim Anbieter geklärte Voraussetzung und stellt diese nicht selbst her. Eine Claude-Anbindung ist in diesem Stand nicht enthalten.
