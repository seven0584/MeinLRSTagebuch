# Änderungen am Windows-Entwicklungsstand

## 22. November 2026 – Tests ausführen und lokale KI auf Korrekturvorschläge begrenzen

- GUI- und Backendprüfungen wurden ausgeführt. Der Speicherknopf ist während einer laufenden Nachprüfung jetzt sichtbar gesperrt; die Navigation passt durch Zeilenumbruch auch in ein 390 Pixel breites Fenster. Zusätzliche Regressionstests prüfen beide Fälle.
- Fachliche Versuche mit dem tatsächlich installierten gpt-oss:20b unterscheiden exakte Fehlerstellen, Korrekturvorschläge und die Richtigkeit der Erklärung. Ein richtiges Lösungswort allein gilt nicht als fachlich richtige Erklärung. Allgemeine Anweisungen und ein falsch ausgelöster Ersatzwort-Filter wurden korrigiert; Testsätze wurden nicht als Sonderkorrekturen in die Anwendung übernommen.
- Für frei erzeugte lokale KI-Erklärungen gilt die geforderte Freigabegrenze von mindestens 90 % fachlich richtigen Erklärungen. Da sie nicht erreicht wird, zeigt die lokale Zusatzhilfe Kindern nur überprüfte Korrekturvorschläge. Der Elternbereich weist darauf hin, dass KI-Hinweise dazu, was falsch ist und warum, ausgeschaltet sind. Die bestehenden Wörterbuch-/Regelhinweise bleiben verfügbar. Kein Vorschlag wird automatisch in den Kindertext übernommen.
- Neben den 54 ursprünglichen Fällen sind 16 neue Transferbeispiele für dieselben Fehlermuster enthalten. Die Auswertung kann die tatsächlich angezeigten Korrekturvorschläge getrennt von freien Modellantworten prüfen. Ausführung, Ergebnisse und bekannte Grenzen dokumentieren [Prüfbericht](docs/pruefbericht-version-2-tests.md) und [Testanleitung](docs/testplan-version-2.md).

## 22. November 2026 – GUI-, Backend- und Fachtests für Version 2.0 vorbereiten

- Sieben neue GUI-Testfälle prüfen bewusstes Speichern, weitere Tagesabschnitte, zusätzliche Coins, Tages- und Kindertrennung, schmale Fenster und Erklärungen. Sechs Backend-Testfälle prüfen Einrichtung, Anfragen und Speicherung mit simuliertem Ollama und temporären Daten.
- Ein Korpus mit 54 erfundenen Testsätzen in 22 Kategorien enthält Fehler, korrekte Kontrollsätze und mehrdeutige Fälle. Der vorbereitete Nachtlauf untersucht die Markierungen der echten App sowie Bewertungen, Korrekturvorschläge und Erklärungen des lokalen Modells. Referenzantworten werden nicht an das Modell übermittelt.
- Berichte unterscheiden Fehlalarme, übersehene Stellen, technische Ausfälle und formal passende Vorschläge. Die Richtigkeit und Kindgerechtheit einer Erklärung erfordern zusätzlich die dokumentierte manuelle Nachsicht. Zwischenstände und eine Wiederaufnahme bei unverändertem Stand sind vorgesehen.
- Diese Vorbereitung ergänzte Tests und Entwickleranleitungen, keine neue App-Version. Zu diesem Zeitpunkt waren die neuen Tests noch nicht ausgeführt; die anschließende Durchführung steht im neueren Eintrag oben. Der Fachlauf benötigt ausdrücklich `--execute`. Die [Testanleitung](docs/testplan-version-2.md) nennt Vorbereitung, Befehle und Grenzen.

## 22. November 2026 – Selbst speichern und am selben Tag weiterschreiben

- Eine fehlerfreie Prüfung oder die letzte bearbeitete Markierung beendet den Eintrag nicht mehr automatisch. Das Kind entscheidet selbst mit „Eintrag speichern“, wann es fertig ist; eine eingeschaltete Gefühlsauswahl folgt erst danach.
- „Noch etwas ins Tagebuch schreiben“ öffnet einen neuen Abschnitt. Die bereits gespeicherten Texte desselben Tages stehen darüber unveränderbar zum Lesen, auch nach einem Neustart. Alte Texte werden nicht erneut korrigiert oder an die KI geschickt. Wörter und Sätze der heutigen Abschnitte zählen gemeinsam zum Tagesziel, sodass ein späterer Zusatz kürzer sein darf.
- Neue Abschnitte bringen nach den bestehenden Satz-, Wort- und Kommaregeln weitere Coins. Die frühere Sperre „nur erster Eintrag pro Tag“ entfällt für neue Abschnitte. Bereits gespeicherter Text und alte Buchungen werden nicht nachträglich neu vergütet. Für kurze Abschnitte ohne ausreichend langen ganzen Satz gibt es weiterhin keine Satz-Coins.
- „Erklärung und Merkhilfe“ bietet zusätzliche Erklärungen oder Vergleichs- und Merkstrategien, etwa für vertauschte, fehlende oder zusätzliche Buchstaben. Wo keine sichere Regel bekannt ist, wird keine erfunden. Vorhandene ausführlichere OpenAI-Hinweise sind dort ohne weiteren KI-Aufruf lesbar.
- Zum Ausprobieren die lokale App-Seite neu laden. Bestehende Einträge und Coinstände bleiben erhalten. Diese Änderungen gehören zur Vorbereitung auf Version 2.0; sie sind noch nicht als neues Windows-Paket veröffentlicht.

## 22. November 2026 – Lokales gpt-oss-20b für Version 2.0 erproben

- OpenAI gpt-oss-20b steht als zusätzliches lokales Modell zur Auswahl. Der Download ist etwa 14 GB groß; das Modell benötigt viel freien Arbeitsspeicher und kann im Prozessormodus deutlich länger antworten. Die vorhandenen Qwen-Modelle bleiben erhalten.
- Die App erkennt die niedrige Denkstufe des Modells und gibt ihr mehr Platz für die abschließende Antwort. Angezeigt und ausgewertet wird ausschließlich die Antwort, nicht der interne Denktext. Abgeschnittene oder unpassende Antworten bleiben Fehler. Die Auswahlprüfung wird nicht gelockert.
- Nach der lokalen Aktualisierung die Seite neu laden, das Modell herunterladen und mit den Testfragen erproben. Eine allgemeine fachliche Eignung für Kinder ist damit noch nicht nachgewiesen; die Lernhilfe wird nicht automatisch eingeschaltet. Dies ist noch keine Veröffentlichung von Version 2.0.
- Der [lokale Prüfbericht](docs/pruefbericht-gpt-oss-20b.md) dokumentiert die erfolgreiche Installation, Antwortzeiten und weiterhin fehlerhafte Bewertungen. gpt-oss hat den unveränderten Vergleich im Prozessormodus noch nicht bestanden; ein größerer Download allein behebt die fachlichen Probleme nicht.

## 22. November 2026 – Modellvergleich für Windows-Version 2.0 nachvollziehbar machen

- Ein erreichbares Modell kann falsche Rechtschreibantworten liefern. Der Vergleich zeigt jetzt unter „Testantworten ansehen“ für jede beantwortete Testfrage die erwartete Schreibweise, den tatsächlichen Vorschlag, die Erklärung und eine etwaige Rückfrage. Eine falsche erste Antwort beendet die zweite Testfrage nicht mehr vorzeitig.
- Die Anforderungen bleiben unverändert: Nur zwei passende Verbesserungen erlauben eine automatische Auswahl; für Grafik zusätzlich der bestätigte Grafikspeicher. Gespeicherte Einstellungen ändern sich bei einem Fehlschlag nicht. Echte lokale Versuche mit beiden Qwen-Modellen haben falsche Bewertungen von „oma“ gezeigt. Eine funktionierende Verbindung bestätigt daher noch keine fachliche Eignung.
- Für die neue Anzeige die App-Seite neu laden. Modelle und vorhandene Tagebuchdaten müssen nicht erneut heruntergeladen oder eingerichtet werden. Dies ist weiterhin eine Vorbereitung auf Version 2.0.

## 21. November 2026 – Vorbereitung auf Windows-Version 2.0

- Die Ollama-Einrichtung verwendet jetzt ausdrücklich das zu Windows PowerShell gehörende Entpackmodul. Damit scheitert sie nicht mehr an einem fremden PowerShell-Modulpfad. Ein bereits vollständig heruntergeladenes Laufzeitarchiv wird nach erneuter Prüfung von Größe und Prüfsumme wiederverwendet, wenn das Entpacken zuvor fehlgeschlagen ist.
- Beim Öffnen der KI-Einstellungen werden vorhandene Modelle auch nach einem Serverneustart wieder gesucht und als heruntergeladen angezeigt. „Beispiel testen“ erklärt eine unvollständige Einrichtung mit dem konkreten Fehler statt nur „Ollama nicht erreichbar“ zu melden.
- Nach dieser lokalen Aktualisierung den App-Server neu starten und die Seite neu laden. Bei einer gescheiterten Einrichtung „Lokale KI und Modell herunterladen“ erneut wählen. Vorhandene Familien- und Kinderdaten bleiben erhalten. Dies ist noch keine Veröffentlichung von Version 2.0.

## 22. Oktober 2026 – Windows-Testpaket 0.1.0

Dieser Entwicklungsstand wird getrennt von der auf GitHub veröffentlichten HTML-App 1.3.4 gesichert. Die Versionsnummer 0.1.0 bezeichnet das Windows-Paket und ist kein Update der HTML-App 1.3.4.

- Die Windows-App speichert Einstellungen und Tagebücher automatisch im eigenen Datenordner. Eine anfängliche Ordnerauswahl entfällt bei Start über den lokalen Server.
- Eltern können eine eigene lokale Ollama-Laufzeit und ein Modell über die App einrichten. Alternativ steht eine optionale OpenAI-API-Anbindung mit eigenem API-Schlüssel zur Verfügung. Die Einrichtung führt durch die notwendigen Schritte und Einwilligungen.
- Kinder können Korrekturen im Schreibbereich bearbeiten und Hinweise daneben lesen. Bei einer fehlgeschlagenen KI-Prüfung erscheint der Abbruchgrund; Wörterbuch und Regeln bleiben als Rückfall verfügbar. Die lokale Modellqualität und Geschwindigkeit sind weiterhin zu prüfen.
- Der Tagesabschluss fragt bis zu drei Gefühle ab und bietet anschließend Lesen oder Spielen an. Der Elternbereich erhält eine Gefühlsübersicht mit Kalender und Zeiträumen.
- Einstellungen und Belohnungen sind neu gegliedert. Kurze Hilfen, Tooltips und Verweise auf die Anleitung unterstützen die Einrichtung.
- Das Windows-x64-ZIP enthält die benötigte Node.js-Laufzeit. Nach vollständigem Entpacken startet `Start.cmd` die App im Browser. Ollama und Modellgewichte werden separat über die App heruntergeladen; persönliche Daten und Zugangsschlüssel sind nicht enthalten.
- Dokumentation, automatisierte Prüfungen und getrennte Forschungsprogramme dokumentieren die untersuchten Verfahren zur Rechtschreibkorrektur. Die experimentellen Fehlermodelle sind keine aktive Korrekturinstanz der App.

Die Daten liegen nach dem ersten Speichern unter `data/` im entpackten Programmordner. Für eine Sicherung die App beenden und den gesamten Ordner kopieren. Ein OpenAI-Schlüssel muss auf einem anderen Windows-Konto oder PC erneut eingerichtet werden.
