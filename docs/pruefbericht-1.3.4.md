# Prüfbericht: Verständliche Leerzeichenhinweise und begrenzte Textkorrektur

Stand: 15. Oktober 2026. Testfassung 1.3.4, Release 10, ausschließlich auf `dev`. Ausgangspunkt: Version 1.3.3, Commit `1634f53`.

## Problem und Änderung

Bei „schreibst.Die“ fehlte das Leerzeichen nach dem Punkt. Die App unterstrich jedoch „Die“, zeigte nur die Überschrift „Leerzeichen“ und öffnete den gesamten Inhalt des Schreibfelds. Dadurch sah die richtige Schreibweise wie ein Wortfehler aus. Die konkrete Erklärung musste erst über „Tipp“ geöffnet werden.

Jetzt nennt die App direkt das fehlende beziehungsweise überflüssige Leerzeichen. Bei einem fehlenden Abstand liegt die Markierung am Wort davor samt Satzzeichen. Der Hinweis nennt beide Seiten der Grenze und erklärt, dass die Markierung nicht die Schreibweise des folgenden Wortes beanstandet. Im Korrekturfeld steht nur die kurze Stelle, etwa „schreibst.Die“, mit dem Cursor am Abstand.

Andere Satzzeichen- und Grammatikhinweise öffnen den betroffenen Satz oder Abschnitt. Beim Übernehmen wird nur dieser Ausschnitt im ursprünglichen Feld ersetzt. Umgebende Sätze, Absätze, andere Eingabefelder und freiwillige Antworten bleiben erhalten. Der Schutz vor veralteten Eingaben sowie die Entwurfsspeicherung bleiben bestehen. Es gibt weiterhin keine automatische Korrektur; gelbe Wörter behalten ihren bisherigen Ablauf.

## Prüfungen

Verwendet wurden Node.js 24.19.0, Playwright, Chromium und künstliche Profile. Das enthaltene Wörterbuch wird tatsächlich geladen; Antworten der Online-Grammatikprüfung werden simuliert.

| Prüfung | Ergebnis |
| --- | --- |
| `tests/correction-browser.cjs` | Fehlender Abstand in einem längeren Text: verständliche Erklärung, Markierung vor der Grenze, kurzer Ausschnitt, Cursorposition und unveränderter umgebender Text bestanden. Eine davon unabhängige gelbe Markierung bleibt erhalten. |
| Derselbe Browsertest | Überflüssige Abstände vor einem Punkt innerhalb und am Ende des Textes, Komma im mittleren Satz, fehlender Schlusspunkt und mehrteilige Online-Grammatikmarkierung bestanden. Nur der ausgewählte Ausschnitt wird ersetzt. |
| Freiwillige Antworten | Korrektur in einer eingeklappten Antwort funktioniert. Haupttext mit Emoji, andere Sätze sowie führende und folgende Leerzeichen bleiben im gespeicherten Entwurf erhalten. |
| Bestehende Korrekturabläufe | Wortkorrekturen, gelbe Wörter und Rückmeldungsverlauf, Namen, Tippstufen, Tagesziel, Schutz vor veraltetem Text, Markierungswechsel und Entwurfsspeicherung bestanden. |
| Darstellung | Bestehende Prüfungen für bündige Oberkanten bei 900, 1024 und 1280 Pixel Breite sowie gestapelte Ansicht bei 600 Pixel Breite bestanden. Bildschirmaufnahme des neuen Leerzeichenhinweises angesehen. |
| `tests/learning-browser.cjs` | Einrichtung, Kindertrennung, private Wortstellen, freiwillige Aufgaben, Coins, Wiederaufnahme, verschlüsselte Sicherung/Wiederherstellung, Speicherfehler und Startprobleme bestanden. |
| `tests/learning-edge-browser.cjs` | Gültige Schreibweisen, Namen, eingeklappte Antworten, Elternanerkennung, verspätete Onlineantworten, Profilwechsel und ältere Daten bestanden. |
| Fachkern, Updates und Spiel | 38 Einzeltests bestanden: 21 Fachkern-, 12 Update- und 5 Spieltests. |

README, beide App-Hilfen, Testanleitung, Changelog und Versionsdatei wurden angepasst; Historie und Update-Manifest wurden neu erzeugt.

## Grenzen und Bereitstellung

Die Ausschnittauswahl orientiert sich an Satzzeichen und Zeilenumbrüchen. Abkürzungen, ungewöhnliche Zeichensetzung oder lange Sätze ohne klare Grenzen können weiterhin einen größeren oder kürzeren Abschnitt ergeben. Die App kann nicht alle Schreibfehler erkennen und erklärt keine unbekannte Schreibweise für sicher richtig. Ein Bedienversuch mit Kindern und echte Windows-/macOS-Dateidialoge wurden nicht geprüft.

Veröffentlichung ausschließlich auf `dev`; `main` und die automatische Update-Quelle bleiben unverändert. Programmdateien gemäß [Testanleitung](testfassung-dev.md) ersetzen und neu laden. Datenordner und Browserprofil behalten; eine Datenumstellung ist nicht erforderlich.
