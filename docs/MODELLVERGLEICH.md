# Lokaler Vergleich der Rechtschreibsysteme

Der Vergleich verwendet ausschließlich den synthetischen Korpus aus
`tests/Rechtschreib_Grammatik_Stresstest.md`. Tagebuchdaten werden nicht verwendet.
Die Programme und Gewichte liegen isoliert unter `tests/benchmark-artifacts/`;
dieser Ordner ist von Git ausgeschlossen. Es wird nichts in die App eingebaut.

## Ergebnis vom 22. Oktober 2026

**Die getesteten KI-Konfigurationen eignen sich nicht als verbindliche
Korrekturinstanz für die Kinder-App.** Beide reparieren zahlreiche Stellen,
lassen andere Fehler stehen und erzeugen zusätzlich falsche Wörter oder neue
Aussagen. Das spezialisierte langlm liefert in diesem Test keinen Grund, es
anstelle der bisherigen Prüfung einzubauen.

| System | Antwortformat | Korrekte Kontrollen unverändert¹ | Fehlertexte exakt wie Referenz² |
| --- | --- | ---: | ---: |
| LanguageTool 6.6, lokale Standardregeln, Top-1-Adapter | 79/79 gültig | 13/19 | 4/60 |
| Qwen3 4B Instruct 2507, Q4_K_M | 79/79 gültig | 15/19 | 18/60 |
| langlm-de 755 MiB, Q4_K_M | 78/79 strikt gültig; ein Korrekturfeld wiederherstellbar | 13/19 | 18/60 |

¹ Leerraumunterschiede werden ignoriert. Änderungen sind nicht automatisch
schädlich: Bei Qwen betreffen drei eine zulässige Schreibvariante und eine
verschlechtert den Satz. Bei langlm sind vier redaktionell/typografisch und zwei
schädlich. Bei LanguageTool betreffen drei zulässige Variantenempfehlungen und
drei korrekte Namen/Produktnamen. Die Zahlen sind keine Precision und erlauben
bei nur 19 Kontrollen keine verlässliche Hochrechnung auf den Alltag.

² Strenger Wortlautvergleich nach Leerraumnormalisierung, **keine Genauigkeitsquote**.
Die Referenz enthält auch optionale Standardisierungen und Namen, die die Systeme
nicht als Zusatzwissen erhalten haben. Manuell wurden gleichwertige Alternativen
akzeptiert; es wurde keine vollständige manuelle Trefferquote aller 226
Pflichtstellen berechnet. Bei langlm ändern weder die Wiederherstellung der
fehlerhaft formatierten Antwort noch deren Sichtung die 18 exakten Referenztreffer.

### Konkrete Befunde

| Eingabe/Fall | Beobachtete Ausgabe | Bedeutung für die App |
| --- | --- | --- |
| Qwen, S25: „fihl der Strom aus“ | „fühlte der Strom aus“ | Ein offensichtlicher Fehler wird durch eine weiterhin falsche Form ersetzt. |
| Qwen, S56: „ein kleiner Fogel“ | „ein kleiner Flieder“ | Das gemeinte Tier wird zu einer Pflanze. |
| Qwen, S33: fehlerhafter Relativsatz | „Die Frau am Eingang steht verkauft …“ | Der Satzbau wird zusätzlich beschädigt. |
| langlm, S01: „zum Vereinfest gefaren“ | „zum Bahnhof gekommen“ | Ort und Tätigkeit werden verändert. Die Änderungsliste führt den zweiten Eingriff nicht auf. |
| langlm, K05: korrektes „Max’ Fahrrad steht neben der Tür.“ | „Max steht auf dem Fahrrad neben der Tür.“ | Ein korrekter Kontrollsatz erhält eine andere Aussage. |
| langlm, K14: korrekte Testadresse `fest@teamwolke.example` | `fest@teamwolke.exempel` | Eine gültige Kennung wird beschädigt. |
| LanguageTool, S01: „Gester“ | Erster Vorschlag „Bester“; „Gestern“ erst auf Rang 6 | Fehlerstelle erkannt, automatische Auswahl ungeeignet. |
| LanguageTool, S28: „Schitzrichter“ | Erster Vorschlag „Gießtrichter“; „Schiedsrichter“ fehlt | Auch die gesamte Kandidatenliste deckt nicht jeden starken Schreibfehler ab. |

Positive Ergebnisse sind ebenfalls vorhanden: Beide Modelle reparieren mehrere
stark fehlerhafte Sätze vollständig. LanguageTool bietet bei vielen schlechten
ersten Vorschlägen passende spätere Kandidaten, etwa „Vereinsfest“ und
„ausschlafen“ auf Rang 2. Seine 174 rohen Hinweise dürfen deshalb nicht mit
der Qualität des automatisch zusammengesetzten Top-1-Textes gleichgesetzt werden.

### Empfehlung für die Entwicklung

1. Die lokale Wörterbuchprüfung als Grundlage erhalten und LanguageTool für
   Grammatik, Fundstellen und Vorschläge nutzen. Die App hat bereits eine
   optionale Online-Anbindung; für den gewünschten Offline-Betrieb wäre diese
   durch eine lokale Anbindung zu ergänzen. Der Benchmark stellt sie noch nicht um.
   Vorschläge einzeln anbieten; keinen ungeprüften Gesamtkorrekturtext übernehmen.
2. Das bestehende Wörterbuch aktualisieren und die Kandidatenqualität prüfen.
   `Dev/app/woerterbuch.js` deklariert 75.767 Einträge des igerman98-Wörterbuchs,
   Stand 20161207. Mehr Einträge allein garantieren weder eine passende
   Kontextkorrektur noch den richtigen Umgang mit Namen oder Grammatik.
   Eine bessere aktuelle Version wurde hier noch nicht getestet.
3. Kindgerechte Lernhinweise an eine unabhängig bestätigte Korrektur und eine
   geprüfte Rechtschreibstrategie binden. Eine Modell-Änderungsliste ist kein
   Beleg für die richtige Fehlerursache. Bei Unsicherheit eine Stelle offenlassen
   oder die Lösung anbieten, statt das Kind wiederholt gegen eine falsche
   Erwartung korrigieren zu lassen.
4. langlm vorerst nicht integrieren. Auch das getestete Qwen darf eine Korrektur
   nicht allein verbindlich festlegen. Eine spätere ergänzende Erklärrolle braucht
   einen eigenen Test; die Qualität kindgerechter Erklärungen wurde hier nicht
   gemessen. Es wurden keine fallbezogenen Reparaturregeln nachgerüstet.

Das betrifft die hier getesteten Konfigurationen. Es ist keine Aussage über
sämtliche lokalen Modelle, andere Quantisierungen oder stärkere Systeme. Ebenso
wurde die LanguageTool-Konfiguration mit zusätzlichen N-Gramm-Daten aus dem
Autorenvergleich nicht nachgestellt. Die Empfehlung folgt insbesondere den
belegten schädlichen Änderungen, nicht einer vermeintlichen Gesamtprozentzahl.

### Nachprüfbare Artefakte

- [Vollständiger automatischer Vergleich](../tests/benchmark-artifacts/comparison.md)
  und [strukturierte Daten](../tests/benchmark-artifacts/comparison.json).
- Manuelle Sichtung aller 79 Antworten pro System:
  [Qwen](../tests/benchmark-artifacts/adjudication-qwen.md),
  [langlm](../tests/benchmark-artifacts/adjudication-langlm.md),
  [LanguageTool](../tests/benchmark-artifacts/adjudication-languagetool.md).
- [Referenzvarianten und Auswertungsgrenzen](../tests/benchmark-artifacts/reference-notes.md),
  [langlm-Formatwiederherstellung](../tests/benchmark-artifacts/langlm-recovery-report.json).
- Unveränderte Rohantworten: `qwen.jsonl`, `langlm.jsonl` und
  `languagetool-results.jsonl` im Artefaktordner. Metadaten enthalten Prompts,
  Modellversionen, Downloadquellen, Hashes und Parameter.

## Versuchsaufbau

- 60 Textabschnitte und 19 korrekte Kontrollfälle, pro System identische Eingaben.
- Die Referenz, Fehlertabelle und Namensliste dienen ausschließlich der Auswertung.
- 226 Pflichtkorrekturstellen, zehn referenzabhängige Namen und 16 optionale
  Stiländerungen werden getrennt betrachtet. Korrekte Varianten zählen nicht als Fehler.
- Qwen erhält einen festen Korrekturauftrag, ohne Gesprächsverlauf oder Beispiele.
  Temperatur 0, CPU, JSON-Ausgabe; vollständige Konfiguration in `qwen-metadata.json`.
- langlm erhält das dokumentierte Completion-Prompt und die originale spaCy-
  Tokenisierung des Autors. Keine Chatvorlage und keine nachträglichen Wortregeln.
  Rohantwort und tokenisierte Eingabe bleiben erhalten. Leerraum-Normalisierung
  des Adapters zählt nicht als Modellkorrektur.
- LanguageTool 6.6 läuft lokal ohne zusätzliche N-Gramm-Daten oder Cloud-Regeln.
  Die automatische Vergleichsfassung nimmt jeweils den ersten konfliktfreien
  Vorschlag. Rohbefunde und weitere Vorschläge bleiben erhalten; Erkennung und
  automatische Auswahl sind unterschiedliche Leistungen.
- Die App-Begrenzungen von 1.800 Zeichen und 20 KI-Kandidaten werden umgangen.
  Dieser Versuch bewertet die Korrektursysteme, nicht den vollständigen App-Workflow.

Testrechner: Intel Core i7-4700MQ, vier Kerne/acht Threads, etwa 16 GiB RAM.
Die gesamte Inferenz läuft auf der CPU. Andere Vergleichs- und Einrichtungsprozesse
laufen teilweise gleichzeitig; Zeitangaben sind daher nur Größenordnungen.
Über alle Anfragen einschließlich Kaltstart wurden im Mittel rund 12,5 Sekunden
für Qwen, 11,8 Sekunden für langlm und 4,6 Sekunden für LanguageTool gemessen.
Diese Werte sind kein fairer Geschwindigkeitsvergleich unter isolierter Last.

## Wiederholen

Node.js 22 oder neuer und Python werden benötigt. Die folgenden Befehle gehören
in das Repository-Verzeichnis. Downloads benötigen Netzwerk; die anschließende
Prüfung läuft lokal. Der Qwen-Lauf verwendet das bereits eingerichtete portable
Ollama und das Modell `qwen3:4b-instruct-2507-q4_K_M` aus dem App-Datenverzeichnis.

```powershell
node scripts/benchmark-corpus.cjs
node scripts/benchmark-assets.cjs
node scripts/benchmark-languagetool.cjs
node scripts/benchmark-models.cjs qwen
```

Für langlm ist die dokumentierte spaCy-Einrichtung erforderlich. Die isolierte
Umgebung liegt in `tests/benchmark-artifacts/runtime/pyenv`; Versions- und
Installationsdaten stehen in den Tokenizer-Artefakten.

```powershell
py -3.11 -m venv tests/benchmark-artifacts/runtime/pyenv
tests/benchmark-artifacts/runtime/pyenv/Scripts/python.exe -m pip install -r scripts/benchmark-tokenizer-requirements.txt
tests/benchmark-artifacts/runtime/pyenv/Scripts/python.exe scripts/benchmark-tokenize.py
node scripts/benchmark-models.cjs langlm
py -3.11 scripts/benchmark-recover-langlm.py
py -3.11 tests/benchmark-score.test.py
py -3.11 scripts/benchmark-score.py tests/benchmark-artifacts/qwen.jsonl tests/benchmark-artifacts/langlm.jsonl tests/benchmark-artifacts/langlm-recovered.jsonl tests/benchmark-artifacts/languagetool-results.jsonl
```

Die JSONL-Dateien enthalten jede Antwort samt Laufzeit oder Fehler. Modellläufe
setzen vorhandene IDs fort, auch wenn diese Fehler enthalten. Für einen neuen
unabhängigen Lauf die bisherigen Ergebnisdateien zuerst unter einem anderen
Namen archivieren; vorhandene Ergebnisse nicht mit anderen Einstellungen mischen.

Die separate langlm-Recovery übernimmt den Parser-Fallback des Autors: Ein
vollständig geschlossenes, JSON-dekodierbares `correction`-Feld kann trotz
beschädigter anschließender Änderungsliste lesbar sein. Originaldatei und
Formatfehler bleiben erhalten; das Derivat kennzeichnet `parserRecovery` und
`complete: false`. Es gibt dabei weder einen neuen Modellaufruf noch eine
inhaltliche Reparatur. Strikte Formatgültigkeit und wiederherstellbarer Text
werden getrennt ausgewiesen.

## Auswertung und Grenzen

`comparison.json` und `comparison.md` zeigen sämtliche Eingaben, Antworten,
Referenzen und Änderungen. Der automatische Stellenvergleich markiert mehrdeutige
oder überlappende Ausrichtungen zur manuellen Prüfung. Exakte Referenzgleichheit
ist keine Qualitätsquote: Gleichwertige Lösungen können anders formuliert sein.
Nicht behobene Fehler, neue Fehler und Bedeutungsänderungen sind gesondert zu prüfen.

Die Zahl veränderter korrekter Kontrollen beschreibt ausschließlich diese 19
Fälle. Sie ist weder die Precision noch eine belastbare Fehlalarmrate für den Alltag.
Der künstliche Stresstest ist keine repräsentative Stichprobe von Kindertexten.
Eine gute Korrektur beweist außerdem noch keine richtige kindgerechte Erklärung.

Primärquellen: [langlm-Modellkarte](https://huggingface.co/AnthonyFC/langlm-gguf),
[Autorenimplementierung](https://github.com/afchatfield/language_lm),
[lokaler LanguageTool-Server](https://dev.languagetool.org/http-server).
Die langlm-Gewichte stehen unter CC BY-NC 4.0; eine kommerzielle Auslieferung
benötigt eine gesonderte Lizenzklärung.
