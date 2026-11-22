# Prüfung der Diktate für Kinder mit LRS ab Klasse 5

Stand: 22. November 2026. Bezug: Entwicklungsstand `7904df2` und unveränderte Produktionsdateien während der Prüfung.

Dieser Bericht dokumentiert den früheren Lexikonbestand. Windows-Version 2.0.0 verwendet stattdessen die vollständig neu erstellte [geprüfte Sammlung ab Klasse 5](diktatmaterial-klasse-5.md) mit verbindlicher Auswahl. Die historischen Befunde unten bleiben als Nachweis erhalten.

**Ergebnis:** Der Bestand lässt sich derzeit nicht pauschal als verlässliche, auf Fehlerschwerpunkte abgestimmte LRS-Diktatsammlung freigeben. Viele Texte haben eine brauchbare Länge und passende Sachthemen. Es gibt aber eindeutige Sprachfehler, mindestens einen bestätigten Sachfehler, unverständliche Ausschnitte und Lücken in der Auswahl nach Fehlerschwerpunkten.

## Umfang und Methode

- Alle **2.600 Diktate** aus `Dev/app/uebungen.js` strukturell und mit lokalem LanguageTool 6.6 geprüft: je 1.300 Texte aus MiniKlexikon und Klexikon, 8.745 Sätze im zugrunde liegenden Satzvorrat, 1.038 Themen.
- **75 Auszüge redaktionell gelesen**: systematische Stichprobe von 32 Texten je Stufe plus gezielt ausgewählte Auffälligkeiten. Die Auswahl ist keine repräsentative Zufallsstichprobe. Die Sichtung wurde durch Codex vorgenommen und ist keine lerntherapeutische Freigabe jedes einzelnen Textes.
- Die tatsächlichen Auswahlfunktionen der App mit **54 synthetischen Profilen und insgesamt 10.800 Ziehungen** ausgeführt: 27 erfasste Fehlerschwerpunkte auf beiden Stufen. Zusätzlich erschöpfte Vorräte passender Texte geprüft.
- Referenztexte, Softwarestand, Laufzeiten und Eingaben protokolliert. Die lokale Sprachprüfung hat alle 2.600 Texte ohne Anfragefehler oder als unvollständig gemeldete Ergebnisse verarbeitet. Keine echten Kinderprofile oder Tagebücher wurden verwendet.

LanguageTool arbeitet hier mit seinen lokalen Standardregeln ohne Cloud-KI. Es dient als Suchhilfe; seine Vorschläge wurden nicht automatisch in Diktatvorlagen übernommen. Laut [LanguageTool-Dokumentation](https://dev.languagetool.org/http-server) enthält der lokale Server keine cloudbasierten KI-Regeln.

## Sprachliche und sachliche Fehler

LanguageTool lieferte **226 Prüfhinweise auf 209 Texten**: 128 Texte auf Stufe 1, 81 auf Stufe 2. Darunter sind 49 Hinweise der Kategorie Grammatik, 43 zu Zusammenschreibung und 42 zu Groß-/Kleinschreibung; hinzu kommen Komma-, Stil- und andere Hinweise. **Das sind keine 209 nachweislich fehlerhaften Texte.** Manche Meldungen sind Stilfragen oder Fehlalarme, andere tatsächliche Fehler werden übersehen.

Beispiele für redaktionell bestätigten Überarbeitungsbedarf, IDs entsprechen den nullbasierten Indizes der App:

| ID / Thema | Stelle | Befund |
| --- | --- | --- |
| D0001 / Geld | „zum tauschen“ | Nominalisierung: „zum Tauschen“. |
| D0054 / Kinderarzt | „die in Krankenhaus arbeiten“ | „im Krankenhaus“ oder „in einem Krankenhaus“. Der Abschnitt enthält zusätzlich eine abgetrennte Ergänzung „Und solche …“. |
| D0125 / Vulkan | „Lava hat schön ganze Dörfer … zugedeckt“ | Sinnentstellende Wortwahl; gemeint ist offenbar „schon“. |
| D0712 / Renaissance | „war man … soweit“ | In diesem Zusammenhang „so weit“. |
| D0838 / Experiment | „heraus zu finden“ | Erweiterter Infinitiv von herausfinden: „herauszufinden“. |
| D1173 / Kompass | „Man dreht den Kompass bis …“ | Komma vor dem bis-Nebensatz fehlt. |
| D1299 / Salamander | „die können …“ nach einem Punkt | Der Satzanfang muss großgeschrieben werden. |
| D2221 / Slowakei | „so groß wie die Schweiz etwas mehr … Einwohner“ | Satzteile fehlen; beispielsweise „… wie die Schweiz und hat etwas mehr … Einwohner“. |

Der Mexiko-Text **D1677** vertauscht die Klimazonen im Norden und Süden. Die [Bundeszentrale für politische Bildung](https://www.bpb.de/kurz-knapp/lexika/kosmos-weltalmanach/65742/mexiko/) beschreibt im Norden subtropisches Steppen-/Wüstenklima und im Süden tropisch-feuchtes Klima. Das ist ein bestätigter Sachfehler, keine Frage der LRS-Schwierigkeit. Eine vollständige Faktenprüfung sämtlicher Sachbehauptungen war nicht Teil der automatischen Sprachprüfung.

Die Beispiele D0054 und D0125 erhielten lokal **keine** LanguageTool-Meldung. Umgekehrt schlägt LanguageTool bei D0167 ein unpassendes Komma in „er das“ vor und verortet das tatsächlich benötigte Komma vor „warum“ nicht richtig. Ein leerer Prüfbericht beweist daher keine fehlerfreie Vorlage; automatisches Anwenden der ersten vorgeschlagenen Ersetzung wäre ebenfalls unzuverlässig.

Das ist im Diktat besonders relevant: Die App vergleicht die Eingabe exakt mit der Vorlage und bezeichnet diese als „So ist es richtig“. Bei Abweichungen können deren Wörter außerdem in die persönliche Übungsliste gelangen. Eine fehlerhafte Vorlage kann somit richtige Kindereingaben als falsch behandeln und falsche Schreibweisen weitertragen.

## Verständlichkeit und Eignung ab Klasse 5

Die Länge ist grundsätzlich günstig:

| Kennzahl | Stufe 1 | Stufe 2 |
| --- | ---: | ---: |
| Texte | 1.300 | 1.300 |
| Wortzahl, Median | 27 | 29 |
| Wortzahl, 90. Perzentil | 37 | 43 |
| Wortzahl, Minimum–Maximum | 18–53 | 18–55 |
| Längster Satz pro Text, Median | 11 Wörter | 13 Wörter |
| Satzlänge, Maximum | 16 Wörter | 16 Wörter |

Die beiden Stufen entsprechen den beiden Quellen. Eine individuelle Einschätzung der Lese-/Rechtschreibanforderungen oder eine Zuordnung zu Schulklassen liegt nicht vor. Auch die geringe Differenz der typischen Textlänge macht daraus noch keine verlässliche Lernprogression.

**Kontext:** 319 Texte beginnen mit einer heuristisch auffälligen Form wie „Sie“, „Es“ oder „Dadurch“. Das ist nur ein Prüfanlass: „Es gibt …“ kann völlig verständlich sein, und eine Überschrift kann einen Personenbezug klären. Klare Gegenbeispiele sind jedoch D0013 zum Thema Südamerika, das mit einer nicht benannten Kamelart beginnt, D1383 mit einer ausgelassenen Behauptung über einen Bibeltext, D1970 mit einem unbekannten Bild und Preis sowie D2431 mit „im Jahrhundert danach“ ohne genanntes Jahrhundert.

**Wortschatz:** 47 Texte enthalten mindestens ein Wort mit 18 oder mehr Buchstaben. Das macht sie nicht automatisch ungeeignet. Begriffe wie „Erdanziehungskraft“ können ab Klasse 5 sinnvoll sein, brauchen je nach Kind aber eine Einführung und sollten nicht beiläufig zusätzliche Rechtschreibprobleme aufhäufen.

**Themen:** Geschichte, Natur und Technik können altersgemäß sein. Einzelne Auszüge behandeln Ermordung, Verfolgung oder Konzentrationslager. Solche Inhalte sind keine pauschalen Altersausschlüsse, sollten für eine Rechtschreibübung aber bewusst und mit passendem Kontext gewählt werden. Die aktuelle Auswahl berücksichtigt nur Kategorien, Zufall und zuletzt verwendete Themen, keine redaktionelle Themenfreigabe. Die fünf Treffer einer einfachen Suchwortliste sind keine vollständige Inhaltskontrolle.

Im Bestand gibt es außerdem 22 Gruppen identischer Textabschnitte unter verschiedenen Diktat-IDs. Eine andere ID garantiert deshalb keinen neuen Text.

Als fachliche Orientierung betont der [BVL](https://www.bvl-legasthenie.de/schule/schulische-foerderung/legasthenie.html) eine Förderung nach Lernstand und konkreten Schwierigkeiten sowie systematisches Arbeiten an Laut-Buchstaben-Zuordnung, Silben, Morphemen und Rechtschreibregeln. Die [BiSS-Handreichung zur Leseförderung](https://www.biss-sprachbildung.de/pdf/biss-handreichung-durchgaengige-lesefoerderung.pdf) verlangt für Lesematerial eine Anpassung an die tatsächlichen Fähigkeiten. Daraus lässt sich keine therapeutische Wirksamkeit dieser App ableiten; für diese Materialprüfung dienen die Hinweise als Orientierung für nachvollziehbare Anforderungen.

## Anpassung an die Fehlerschwerpunkte

**Was bereits funktioniert:** Im frischen Vorrat wählte die App bei den 15 mit positiven Metadaten versehenen Schwerpunkten in allen 6.000 simulierten Ziehungen einen Text mit mindestens einem entsprechenden Zählwert. Die vorhandene Gewichtung ist damit für diese Kategorien wirksam. Die Simulation bestätigt allerdings nur die Metadatenzuordnung, nicht die sprachliche Qualität oder die tatsächliche didaktische Eignung der Übungswörter.

**Was fehlt:** Für zwölf der 27 erfassten Kategorien gibt es auf beiden Stufen keinen einzigen positiv markierten Text:

- fälschlich großgeschrieben (`klein`);
- Buchstaben vertauscht (`umstellung`) oder zusätzlich (`zusatz`);
- Satzende, Leerzeichen und weitere Satzzeichen (`satzende`, `leer`, `satzz`);
- Fall/Endungen, Verbform, Satzbau, Wortwiederholung und Wortverwechslung (`fall`, `verb`, `grammatik`, `doppelwort`, `verwechselt`);
- Getrennt-/Zusammenschreibung (`getrennt`).

Die App wählt für diese Schwerpunkte trotzdem einen Text. In den 4.800 Ziehungen dieser Profile gab es folglich keinen entsprechenden Metadatentreffer. „Passend zum Schwerpunkt“ ist hier nicht belegt.

Auch bei unterstützten Kategorien gibt es einen stillen Wechsel: Sind passende Texte bereits verwendet, aber mehr als 20 andere übrig, wählt der Algorithmus weiterhin aus diesen anderen Texten. Tests mit erschöpften ie-, äu- und das/dass-Vorräten ergaben auf beiden Stufen jeweils einen Text mit Zählwert null für den einzigen angefragten Schwerpunkt.

Die Textdaten enthalten außerdem nur Häufigkeiten pro Kategorie und keine redaktionell geprüften Listen konkreter Zielwörter oder Satzstrukturen. Die Auswahl kennt somit weder deren Erklärung noch eine abgestimmte Reihenfolge der Lernschritte. Ihre Schwerpunkte stammen aus den protokollierten Kategorien der Tagebucheinträge der letzten 30 Tage. Ergebnisse der Diktate stehen in einem getrennten Übungsprotokoll und gehen in `weakCats()` nicht ein; für die automatische Stufenwahl wird nur die gesamte Fehlerquote der letzten Diktate betrachtet.

## Erforderliche Überarbeitung

1. **Vorlagen redaktionell bereinigen und freigeben.** Eindeutige Sprachfehler korrigieren, fehlende Bezüge herstellen, Sachangaben prüfen und unsichere Texte bis zur Prüfung aus der automatischen Auswahl nehmen. Automatische Treffer dienen als Arbeitsliste.
2. **Eigenständige, altersgemäße Texte verwenden.** Ein kurzer Abschnitt muss mit seiner Überschrift verständlich sein. Klarer Satzbau und vertrauter Wortschatz sollen die Übung entlasten; Themen dürfen dabei zu Kindern ab Klasse 5 passen.
3. **Lernziele ausdrücklich annotieren.** Pro Text einen Hauptschwerpunkt mit konkreten geprüften Zielwörtern beziehungsweise Satzstrukturen, Voraussetzungen und möglichen Zusatzschwierigkeiten hinterlegen. Buchstabenhäufigkeiten allein reichen dafür nicht.
4. **Die Auswahl verbindlich machen.** Qualität, Schwierigkeit und tatsächlicher Schwerpunkt müssen Voraussetzungen sein. Zufall und Themenvielfalt dürfen erst unter geeigneten Texten entscheiden. Bei fehlendem Material muss die App das kenntlich machen und eine passende Wort-/Satzübung anbieten.
5. **Fortschritt nach Schwerpunkt berücksichtigen.** Bestätigte Fehler und Erfolge aus den Diktaten in die weitere Auswahl einbeziehen; eine globale Fehlerquote genügt nicht als alleinige Stufenentscheidung.

Das ist eine erforderliche Material- und Auswahlüberarbeitung, keine bereits nachgewiesene Freigabe für alle Texte.

## Nachweise und Wiederholung

Ergebnisordner, lokal und von Git ausgeschlossen:

`test-results/dictations/2026-11-22T14-49-02.225Z/`

Enthalten sind `manifest.json`, `summary.json`, alle Diktate mit Prüfanlässen in `dictations.jsonl` und `review.csv`, die 75 gelesenen Auszüge in `samples.json` mit redaktionellen Notizen in `manual-review.jsonl`, die Auswahlfälle in `selection-depleted.json` sowie vollständige LanguageTool-Antworten und Zusammenfassung in `languagetool-results.jsonl`, `language-check-manifest.json` und `language-summary.json`. Die Dateien dokumentieren Befunde, keine automatische Eignungsfreigabe.

```powershell
# Statische Bestandsprüfung und Auswahltests mit synthetischen Profilen
node scripts/audit-dictations.cjs

# Reine Tests der Auditwerkzeuge; sechs Fälle bestanden
node --test tests/dictation-audit.test.cjs

# Einmalig portable lokale Sprachprüfung vorbereiten
node scripts/benchmark-languagetool.cjs --prepare

# Den zuvor ausgegebenen Auditordner vollständig prüfen oder fortsetzen
node scripts/check-dictation-language.cjs test-results/dictations/ORDNER
```

Die Prüfsummen von Korpus und Anwendungsdatei blieben während der Prüfung gleich. Die Auditwerkzeuge und dieser Bericht ändern die Diktatvorlagen und die Produktionsauswahl nicht.
