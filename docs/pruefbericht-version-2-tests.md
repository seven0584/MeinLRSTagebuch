# Prüfbericht für Windows-Version 2.0

Stand: 22. November 2026. Die technischen Prüfungen, beide vollständigen Fachläufe und die anschließende Transferprüfung sind abgeschlossen.

## GUI

Zehn neue GUI-Fälle und alle 44 Fälle der bestehenden Browser-Suite bestanden in isolierten Microsoft-Edge-Testprofilen mit erfundenen Kindern und simulierten Modellantworten. Geprüft wurden bewusstes Speichern nach Erreichen des Tagesziels, erneutes Prüfen, offen gelassene Hinweise, weitere Tagesabschnitte, Coins, Wiederöffnen, Tages-/Kindertrennung, Erklärungen und Bildschirmbreiten von 390 und 1280 Pixeln. Die zusätzlichen Fälle prüfen den lokalen Korrekturmodus ohne neue Erklärungsanfrage und den Elternhinweis zur 90-%-Grenze.

Zwei tatsächliche Oberflächenfehler wurden behoben:

- Während einer zweiten laufenden Kontrolle blieb der vorherige Speicherknopf optisch aktiv. Jetzt ist er bis zum Abschluss der Prüfung deaktiviert. Ein eigener Regressionstest prüft auch den Klick während der Wartezeit.
- Die Navigation lief bei 390 Pixeln aus dem Fenster. Sie bricht nun auf mehrere Zeilen um; der Test prüft die Dokumentbreite und erstellt Bildschirmaufnahmen.

Zwei anfängliche GUI-Testfehler beruhten auf fehlenden Wartebedingungen für asynchrone Prüfungen. Die Tests warten nun auf den Abschluss beziehungsweise die sichtbare Markierung; die fachlichen Erwartungen wurden nicht abgeschwächt. Gespeicherte Texte werden weiterhin nur gelesen, und Korrekturvorschläge ändern den Originaltext nicht automatisch.

## Backend

Sechs neue Backend-Fälle bestanden gegen den tatsächlichen lokalen Node-Server mit temporären Datenordnern. Geprüft wurden die Einrichtung ohne Änderung gespeicherter Inhalte, getrennte Sitzungstoken, Weitergabe von Denkstufe/Antwortschema/CPU-Wahl, ungültige und übergroße Anfragen, sichtbare Laufzeitfehler und atomare Speicherung bei getrennten Kinderpfaden. Die Tests benötigen keine echten Modellgewichte.

Weitere 135 bestehende Kern-, Adapter-, Einrichtungs-, Speicher-, OpenAI-, Gefühls- und Hilfetests sowie neun reine Auswertungstests bestanden ebenfalls. Insgesamt: **204 technische Tests bestanden, keine Fehler und keine übersprungenen Fälle**. Modellantworten sind hier simuliert; diese Zahl belegt keine fachliche Modellqualität.

## Fachtests und Fehlermuster

Der Referenzkorpus enthält 54 erfundene Fälle in 22 Kategorien mit insgesamt 43 erwarteten Fehlerstellen. Referenzlösungen und Bewertungsregeln gelangen ausschließlich in die Auswertung, niemals in Modellanfragen. Die Anwendung enthält keine nach diesen Testsätzen angelegten Satz-Sonderkorrekturen. Geprüfte Buchstabenunterschiede und Merkhilfen werden anhand des jeweiligen Wortes und Fehlermusters erarbeitet. Bei unklarer Bedeutung bleibt eine Rückfrage beziehungsweise das Offenlassen möglich.

Die Prüfung unterscheidet Markierungen der vollständigen App, die rohe Antwort des tatsächlichen Modelladapters und die fachliche Richtigkeit der Erklärung. Ein richtiges Lösungswort belegt keine richtige Begründung. Die App verwendet bei überprüften Schreibweisen bevorzugt unmittelbar nachvollziehbare Buchstabenvergleiche; die zusätzlich separat getestete freie Modellantwort ist deshalb nicht identisch mit jedem angezeigten App-Hinweis.

Der Ausgangslauf mit gpt-oss:20b im Prozessormodus fand 39 von 43 Referenzstellen, ohne zusätzliche Markierungen. Alle zehn vollständig korrekten Kontrollsätze blieben ohne Fehlalarm. Nur 3 von 54 direkten Lernhilfeantworten erfüllten die formalen Referenzkriterien; 23 Antworten wurden technisch oder durch den Antwortvertrag abgelehnt. Häufig stimmten Bewertung und Erklärung nicht überein.

Der allgemeine Antwortvertrag wurde präzisiert: Änderung, bereits richtige Stelle und echte Bedeutungsunsicherheit werden ausdrücklich unterschieden; der Lösungsvorschlag bezieht sich auf die markierte Stelle. Keine Referenzlösung wurde dafür in den Prompt aufgenommen. Eine begrenzte Validatorregel wurde außerdem korrigiert, die einen Bezug wie „den Namen deines Drachen“ fälschlich als Ersatzwort deutete. Ausdrücklich behauptete fremde Ersatzwörter werden weiterhin abgelehnt.

Der zweite Lauf mit demselben Korpus fand erneut **39 von 43 Fehlerstellen (90,7 %)**, ohne zusätzliche Markierungen und ohne Fehlalarm auf den zehn korrekten Kontrollsätzen. Kein Kontrolllauf und keine zusätzliche KI-Prüfung fiel technisch aus. Übersehen wurden die Kleinschreibung des Verbs in „Wir Spielen im Garten.“, „das/dass“ sowie beide „seit/seid“-Verwechslungen. Die lokale Wortprüfung ist keine vollständige Grammatikprüfung; vorhandene Wörter werden außerdem bewusst nicht allein auf einen anderen Wörterbucheintrag umgebogen.

Die direkten Lernhilfeantworten verbesserten sich auf **42 von 54 formal passende Antworten (77,8 %)**; sieben wurden technisch oder durch den Antwortvertrag abgelehnt, fünf weitere verfehlten die Referenzkriterien. Das ist ausdrücklich keine Quote fachlich richtiger Erklärungen: Unter den formal passenden Antworten standen weiterhin falsche Buchstabenangaben und unpassende Regeln. Beispielsweise wurde „Hunn → Hund“ als Buchstabendreher statt als Ersetzung beschrieben. Beim mehrdeutigen „Hunt“ wurde unbegründet ein Tier angenommen. Deshalb gibt es keine Freigabe für freie lokale Erklärungen.

Für die anschließende Transferprüfung wurden nach Festlegung des allgemeinen Antwortvertrags 16 weitere Fälle mit neuen Wörtern angelegt, darunter passende Gegenbeispiele, Namen und unterschiedliche Groß-/Kleinschreibung je nach Satzkontext. Sie werden ohne anschließendes Zuschneiden von Anwendung oder Prompt auf diese Beispiele ausgewertet. Auch das ist eine interne Stichprobe und kein extern blind validierter Qualitätstest.

### Transferergebnis des Korrekturmodus

Alle 16 Fälle liefen mit gpt-oss:20b auf dem Prozessor vollständig durch. Die Anwendung erkannte zehn von zwölf erwarteten Fehlerstellen (**83,3 %**), ohne zusätzliche Markierung. Die drei vollständig korrekten Kontrollsätze und der ausdrücklich genannte Fantasiename wurden nicht fälschlich geändert. Die erwarteten Schreibweisen blieben ausschließlich in der Auswertung. Der Prüf-Prompt war identisch mit dem vollständigen Kontrolllauf; nach den Transferantworten wurde weder die Anwendung noch der Prompt zum Bestehen angepasst.

Von zehn tatsächlich angezeigten Korrekturvorschlägen waren **neun richtig und einer falsch**. Bezogen auf alle zwölf erwarteten Fehlerstellen sind das **9/12 passende angezeigte Korrekturen (75 %)**; die beiden übersehenen Stellen erhielten keinen Vorschlag. Auch der Korrekturmodus ist damit keine Garantie für eine richtige oder vollständige Prüfung:

- „Die kreide liegt neben der Tafel.“: Großschreibung von Kreide übersehen.
- „Die Kinder Laufen zum Haus.“: Kleinschreibung des Verbs übersehen. Das korrekte substantivierte „das Laufen“ im Kontrollsatz blieb erhalten.
- „Ich öffne die Trü.“: Die Stelle wurde erkannt, aber Wörterbuchvorschlag und KI-Bestätigung ergaben fälschlich „Trüb“ statt „Tür“. Eine richtige Markierung ist deshalb noch kein richtiger Korrekturvorschlag.

Die zehn weiteren Buchstabenfehler beziehungsweise Fehlerstellen wurden im Lauf getrennt geprüft; bei neun davon stimmte die angezeigte Korrektur, beim genannten Vertauschungsfall nicht. Es gab keine Verbindungs-/Browserfehler und keine externen Textanfragen. Pro Fall gab es genau einen tatsächlichen lokalen Prüfaufruf, **keinen zusätzlichen Aufruf für Erklärungen oder zum Ansehen des Vorschlags**. Nach Prüfen und Vorschlagsanzeige blieb jeder Originaltext unverändert. Der Lauf endet wegen der drei fachlichen Abweichungen mit Fehlerstatus; er wird nicht als vollständig bestanden ausgewiesen.

## Konsequenz aus der 90-%-Anforderung

Der Nutzer verlangt mindestens 90 % fachlich richtige Erklärungen. Diese Freigabe ist bereits ausgeschlossen: Im Kontrolllauf wurden unter anderem eine „Sonne“ als „Licht-Treibhaus“ beschrieben, für „Vater“ zwei t verlangt, bei „Waser“ ein angeblich fehlendes e genannt, für „Straße“ zwei a verlangt und „blume“ mitten im Satz mit einer Satzanfangsregel erklärt. Zusätzlich wurden mehrere Erklärungsantworten wegen eines ungültigen Antwortvertrags abgelehnt. Solche Antworten zählen nicht als richtige Erklärung; ein richtiges Lösungswort hebt den Mangel nicht auf.

Die lokale KI wird deshalb im Kinderablauf auf Korrekturvorschläge begrenzt. Es gibt dort keinen Abruf freier KI-Erklärungen oder KI-Begründungen. Der Elternbereich weist ausdrücklich darauf hin, dass die KI derzeit keine zuverlässigen Hinweise dazu liefert, was falsch ist beziehungsweise warum. Bestehende Wörterbuch-/Regelhinweise und direkt überprüfbare Buchstabenvergleiche bleiben als eigene Funktionen erkennbar. Der fachliche Vergleich wird durch diese Einschränkung nicht nachträglich zum bestandenen Erklärungstest erklärt.

## Nachweise und Grenzen

Die lokalen Rohdaten liegen unter `test-results/fach/` und enthalten Quell-/Korpus-Prüfsummen, Modelldigests, endgültige Modellantworten, Fehler und Zwischenstände. Persönliche Tagebücher und gespeicherte Eltern-Einstellungen werden weder als Tests benutzt noch verändert. Interne Denktexte und Sitzungstoken werden nicht protokolliert.

- Ausgangslauf: `2026-11-22T13-11-19.455Z-e716932e` (54/54 abgeschlossen).
- Kontrolllauf mit präzisiertem Antwortvertrag: `2026-11-22T13-42-26.951Z-de97ff68` (54/54 abgeschlossen).
- Transferlauf im Korrekturmodus: `2026-11-22T14-17-07.948Z-152215f3` (16/16 abgeschlossen).

Die beiden vollständigen Erklärungsläufe endeten wegen festgestellter Qualitätsabweichungen mit einem Fehlerstatus, nicht wegen einer unterbrochenen Verbindung. Der Korrekturmodus wurde anschließend umgesetzt und technisch geprüft; der Transferlauf hat deshalb einen eigenen Quellstand. Die Erklärungstests sind Diagnosematerial und wurden durch die Einschränkung nicht nachträglich als bestanden umgewertet. Die Übertragung auf andere Texte und eine breite pädagogische Qualität sind durch diese internen Stichproben nicht allgemein nachgewiesen.
