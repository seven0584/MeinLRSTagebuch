# Prüfbericht: Korrekturstelle und unbekannte Wörter

Stand: 14. Oktober 2026. Testfassung 1.3.1, Release 7, auf `dev`. Ausgangspunkt ist Commit `23f961c` mit Version 1.3.0. Die [bisherigen Prüfungen und Grenzen](pruefbericht-1.3.0.md) gelten ergänzend.

## Behobene Probleme

Die zusätzliche lokale Groß-/Kleinschreibungsregel beanstandete „Rotze“ in „Ich sehe Rotze und Popel.“, obwohl Hunspell die Schreibweise akzeptiert. Die separate Liste der Nomenstämme enthielt sie nicht; daraus wurde fälschlich eine notwendige Kleinschreibung abgeleitet. Diese Heuristik ist entfernt. „Rotze“ wird jetzt akzeptiert. „Popel“ fehlt im mitgelieferten Wörterbuch und wird ausdrücklich als unbekannt gekennzeichnet.

Auch andere unbekannte Schreibweisen werden nicht mehr aus einem bloßen Ähnlichkeitsvorschlag einer bestimmten Schreibregel zugeordnet. Es gibt keine behauptete Zielschreibweise und keine daraus abgeleitete Empfehlung. Eine tatsächlich eingegebene, überprüfte Verbesserung kann anschließend eine Zuordnung begründen. Nachvollziehbare Großschreibungsfälle und Diktate mit vorgegebenem Zielwort behalten ihre Hinweise.

Wörter werden weiterhin direkt bearbeitet. Für Satzzeichen, Leerzeichen oder mehrteilige Grammatikhinweise erscheint jetzt ein bearbeitbarer Satz beziehungsweise Abschnitt im selben Korrekturbereich. Der Sprung zurück zum oberen Originalfeld entfällt. Die Änderung wird in genau das betroffene Feld übernommen; andere Antworten bleiben erhalten. Die Oberfläche benennt Satzzeichenstellen ausdrücklich und zeigt den Hinweis vor dem Eingabefeld. Unbekannte Wörter sind gelb als ungeklärt markiert.

## Ausgeführte Prüfungen

Umgebung: Linux, Node.js 22, Playwright und Chromium. Alle Profile und Texte sind künstlich. Das Wörterbuch wird tatsächlich aus den mitgelieferten App-Dateien geladen.

| Prüfung | Ergebnis |
| --- | --- |
| `node --test tests/learning-core.test.cjs tests/update-core.test.cjs` | 33 Tests bestanden: 21 Fachkern- und 12 Update-Tests. Enthalten ist eine neue Prüfung, dass alte ungeklärte Vermutungen neutral dargestellt werden, der Verlauf erhalten bleibt und eine erneute Prüfung die aktuelle Einordnung übernimmt. |
| `node tests/correction-browser.cjs` | „Rotze“, „Popel“, mehrere unbekannte Schreibweisen, ein bekannter Großschreibungsfall und zulässige Schreibweisen geprüft. Keine falsche Regel oder Empfehlung für ungeklärte Wörter. Wort-, Satzzeichen- und mehrteilige Grammatikänderung im selben Bereich; eingeklappte Antwort mit Rand-Leerzeichen; keine Überschreibung eines inzwischen geänderten Textes; Weiterbearbeitung nach Unterschreiten des Tagesziels. |
| `node tests/learning-browser.cjs` | Einrichtung, Kindertrennung, private/geteilte Wortstellen, Hinweise, Korrekturen, Aufgaben, anteilige Coins, Wiederaufnahme, Sicherung/Wiederherstellung sowie Speicherfehler und Startprobleme bestanden. |
| `node tests/learning-storage-browser.cjs` | Ordnerimport und verschlüsseltes Speichern bestanden; unbekannte oder unvollständige Daten werden vor Schreibzugriff abgewiesen. |
| `node tests/learning-edge-browser.cjs` | Zulässige Schreibweisen, getrennte Namen, eingeklappte Antworten, Elternanerkennung, verspätete Onlineantworten, Profilwechsel und Bestandsdaten bestanden. |
| `node tests/shop-browser.cjs` | Speicherung, Artikel, Symbole, Validierung, Kinderwechsel und Neuladen bestanden. |
| `node tests/speech-browser.cjs` | Stimmenkonfiguration für simuliertes Windows und macOS bestanden. |
| Syntax, Historie und Manifest | JavaScript-Syntax geprüft; `git diff --check` ohne Befund. Offline-Changelog und Manifest für Version 1.3.1 mit 22 Programmdateien neu erzeugt; Prüfsummen stimmen. |

Nach der abschließenden Anpassung der Beschriftungen und Farben wurden die 33 Fachkern-/Update-Tests und die gezielte Browserprüfung erneut ausgeführt. Der Editor bleibt bei 1280 × 800 und 900 × 768 im sichtbaren Bereich; im schmaleren Fenster entsteht kein horizontaler Überlauf. Eine Bildschirmaufnahme wurde angesehen. Sie liegt nur als lokale Prüfarbeitsdatei unter `/tmp` und enthält keine Familiendaten.

## Grenzen und Testhinweise

Die Onlineantworten in den Regressionstests sind simuliert. Es wurde kein Tagebuchtext an einen externen Prüfdienst gesendet. Eine Wörterbuchannahme beweist weder die richtige Bedeutung noch die korrekte Verwendung im Satz. Die lokale Prüfung verzichtet bewusst auf unsichere Kleinschreibungsbehauptungen allein aus einer unvollständigen Nomenliste. Dadurch bleiben manche Groß-/Kleinschreibungsfälle für die gemeinsame oder optionale Onlineprüfung offen.

Alte, noch ungeklärte automatische Zuordnungen werden neutral angezeigt; ihre ursprünglichen Daten bleiben erhalten. Bereits abgeschlossene Bewertungen werden nicht rückwirkend vollständig fachlich neu geprüft. Ausdrückliche Elternentscheidungen bleiben bestehen. Das Datenformat und die bisherigen Belohnungsregeln ändern sich nicht.

Die Prüfungen ersetzen keine Bedienbeobachtung mit einem Kind und keinen Test des Dateiauswahldialogs oder der hörbaren Stimme am Windows-PC oder Mac. Die [Testanleitung](testfassung-dev.md) enthält den Download und konkrete Schritte. Für das Update der Testfassung die vollständigen Programmdateien zusammen ersetzen; Datenordner und Test-Browserprofil behalten. Bereitstellung ausschließlich auf `dev`, ohne Übernahme nach `main`.
