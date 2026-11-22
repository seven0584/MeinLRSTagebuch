# Lokaler Versuch mit gpt-oss-20b

Stand: 22. November 2026, Vorbereitung auf Windows-Version 2.0. Ausschließlich erfundene Sätze; keine Familien- oder Kinderdaten.

Dieser Bericht dokumentiert die ersten Einrichtungsversuche vor den anschließenden GUI-, Backend- und vollständigen Fachtests. Neuere Ergebnisse und die Begrenzung auf lokale Korrekturvorschläge stehen im [Prüfbericht Version 2.0](pruefbericht-version-2-tests.md).

## Einrichtung

`gpt-oss:20b` wurde über die App-eigene Ollama-Laufzeit vollständig heruntergeladen und als bereit erkannt. Download der großen Modelldatei: 13.793.422.816 Bytes, danach weitere Begleitdateien und Ollamas Prüfsummenprüfung. Testgerät: rund 30 GiB nutzbarer Arbeitsspeicher, integrierte AMD Radeon 890M. Getestet wurde der Prozessormodus, nicht die Grafikbeschleunigung.

Die Anbindung verwendet die über Modellinformationen erkannte Denkstufe `low`. Für Erklärungen stehen 8.192 Kontexttokens und bis zu 4.096 Ausgabetokens bereit. Ausschließlich die abschließende Antwort wird ausgewertet. Die bestehenden Zeitlimits und Qualitätsanforderungen bleiben erhalten.

## Echte Antworten

| Eingabe | Beobachtung |
| --- | --- |
| „Meine oma kommt zu Besuch.“ | Erklärung nennt die richtige Schreibweise „Oma“, aber Bewertung ist `unclear` und der Vorschlag bleibt leer. Vergleich nicht bestanden. Erste Antwort rund 43,2 Sekunden einschließlich rund 22 Sekunden Modellladezeit. |
| „Ich habe ein geefühl.“ | Modell fragt nach der Bedeutung und liefert keinen Vorschlag. Vergleich nicht bestanden. Rund 12,8 Sekunden bei geladenem Modell. |
| „Ich spiele mit meinem Hunt.“ | Modell fragt nach der Bedeutung und behauptet nicht wie zuvor Qwen, das Wort sei sicher ein Name. Das ist eine einzelne brauchbare Rückfrage, kein allgemeiner Qualitätsnachweis. |
| „Der Hase frisst eine karote.“ | Im ersten Versuch wurde die Antwort abgelehnt; beim Kontrollversuch folgte eine Bedeutungsrückfrage ohne Korrekturvorschlag. Keine stabile Verbesserung zu „Karotte“ nachgewiesen. |
| „Ich besuche meine Tante.“ | Auch die rohe Kontrollantwort bewertet mit `unclear`, erklärt das Wort aber für richtig und lässt die erforderliche Rückfrage leer. Die App lehnt die widersprüchliche Antwort ab. |
| Kontextprüfung „Meine oma hat ein geefühl.“ | `oma` wurde als Name bewertet; für `geefühl` wurde „Gefühl“ vorgeschlagen. Die erste Entscheidung ist fachlich unpassend. |

Die Formulierung der Antworten kann zwischen Versuchen abweichen. Eine funktionierende Installation und passende JSON-Struktur sind kein Nachweis richtiger Rechtschreiberklärungen. Der aktuelle automatische Vergleich findet im Prozessormodus keinen Gewinner. Für die beiden abgelehnten zusätzlichen Antworten wurde nicht pauschal ein Auswertungsfehler angenommen; die rohe Kontrollantwort zu „Tante“ bestätigt den Widerspruch.

## Technische Prüfungen und Ergebnis

109 automatisierte Tests bestanden: 58 für Lernhilfe, Modellvergleich, gpt-oss-Vertrag, Kontext- und Gefühlsanbindung sowie 51 für Windows-Laufzeit, Browserabläufe und Hilfen. Diese Tests verwenden simulierte Modellantworten und belegen die Integration, nicht die fachliche Modellqualität.

Das Modell ist lokal verfügbar und kann in den Eltern-Einstellungen ausdrücklich ausgewählt werden. Es wurde nicht automatisch als Lernhilfe gespeichert. Die aktuelle Kombination aus Modell, Anweisungen und Antwortvertrag ist noch nicht als zuverlässige Lernhilfe für Kinder bestätigt. Eine weitere Untersuchung der Anweisungen und des Antwortvertrags wäre ein eigener nächster Entwicklungsschritt; die Tests wurden nicht zum Bestehen abgeschwächt.

Technische Grundlage: [Ollama-Denkstufen](https://docs.ollama.com/capabilities/thinking), [Modellseite](https://ollama.com/library/gpt-oss:20b).
