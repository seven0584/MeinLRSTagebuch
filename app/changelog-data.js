// Generated from CHANGELOG.md by scripts/prepare-update.cjs.
window.TB_CHANGELOG = [
  {
    "id": "3e7084a79e208322",
    "title": "2.0.0 – 22. November 2026",
    "lines": [
      "",
      "- Die Diktate verwenden 54 vollständig neu verfasste, redaktionell gesichtete und lokal sprachlich geprüfte Texte ab Klasse 5. Alle 27 Schwerpunkte sind auf zwei Stufen mit konkreten Übungsstellen vertreten. Auch die Kontextsätze im Wort-Diktat stammen aus dieser Sammlung.",
      "- Die Auswahl verlangt den Schwerpunkt, die Stufe und eine unveränderte redaktionelle Freigabe. Bei fehlendem Material wird kein anderer Text untergeschoben. Wiederholungen werden angezeigt. Neue Übungsergebnisse beeinflussen den Schwerpunkt und die automatische Stufenwahl; alte Protokolle bleiben erhalten.",
      "- Ein Wort-Diktat enthält bis zu zehn geprüfte Wörter derselben Stufe und beachtet die Fälligkeit persönlicher Wörter. Satzbau und Zeichensetzung werden im Kurz-Diktat geübt. Die Diktate benötigen keine KI- oder Internetprüfung während der Nutzung.",
      "- Neue Kern- und Browserprüfungen untersuchen Materialfreigaben, Auswahl, Auswertung, Fortschritt, Kindertrennung und schmale Fenster. Der Build verweigert ungeprüftes oder nachträglich geändertes Material.",
      "- Das portable Windows-x64-Release enthält Node.js und wird mit SHA-256-Prüfsumme veröffentlicht. Lokale KI-Modelle werden optional separat eingerichtet. Das selbstbestimmte Speichern und weitere Tagesabschnitte gehören ebenfalls zu Version 2.0. Freie lokale KI-Erklärungen bleiben wegen der nicht erreichten Qualitätsanforderung ausgeschaltet.",
      ""
    ]
  },
  {
    "id": "26322bb241755e0f",
    "title": "Version 1.3.5: Hinweis auf das neue Windows-Paket — 22. November 2026",
    "lines": [
      "",
      "- Die bisherige Datei-Version erhält die zusammengeführte Änderungsübersicht. Ihre Schreib-, Diktat- und Speicherfunktionen entsprechen weiterhin 1.3.4. Die neue Windows-App 2.0.0 ist ein getrenntes Paket mit lokalem Server; ihre geprüften Diktate und die lokale KI sind nur dort enthalten.",
      "- Die README führt zum Windows-Download und erklärt den Start mit Start.cmd. Die bisherige Datei-Anleitung bleibt als ausdrücklich historischer Stand erreichbar. Persönliche Daten werden nicht in GitHub übernommen.",
      "- Nach der Zusammenführung bestanden alle 38 Kernprüfungen der Datei-Version. Das getrennte Windows-Paket bestand seinen Start- und Diktattest erneut; seine Programmdateien entsprechen weiterhin dem Stand mit 230 bestandenen Windows-Tests.",
      "",
      "**Was müsst ihr tun?** Für die Windows-App das Windows-x64-ZIP aus dem Release 2.0.0 getrennt entpacken und Start.cmd öffnen. Vorher die bisherige App schließen und ihren Ordner sichern. Die automatische Update-Suche der Datei-Version aktualisiert lediglich ihre Programmdateien und die Änderungsübersicht; sie installiert keinen lokalen Server. Vorhandene config/- und kinder/-Ordner behalten. Details stehen in der README und den Windows-Release-Hinweisen.",
      ""
    ]
  },
  {
    "id": "fdb3cbc7869d116d",
    "title": "22. November 2026 – Tests ausführen und lokale KI auf Korrekturvorschläge begrenzen",
    "lines": [
      "",
      "- GUI- und Backendprüfungen wurden ausgeführt. Der Speicherknopf ist während einer laufenden Nachprüfung jetzt sichtbar gesperrt; die Navigation passt durch Zeilenumbruch auch in ein 390 Pixel breites Fenster. Zusätzliche Regressionstests prüfen beide Fälle.",
      "- Fachliche Versuche mit dem tatsächlich installierten gpt-oss:20b unterscheiden exakte Fehlerstellen, Korrekturvorschläge und die Richtigkeit der Erklärung. Ein richtiges Lösungswort allein gilt nicht als fachlich richtige Erklärung. Allgemeine Anweisungen und ein falsch ausgelöster Ersatzwort-Filter wurden korrigiert; Testsätze wurden nicht als Sonderkorrekturen in die Anwendung übernommen.",
      "- Für frei erzeugte lokale KI-Erklärungen gilt die geforderte Freigabegrenze von mindestens 90 % fachlich richtigen Erklärungen. Da sie nicht erreicht wird, zeigt die lokale Zusatzhilfe Kindern nur überprüfte Korrekturvorschläge. Der Elternbereich weist darauf hin, dass KI-Hinweise dazu, was falsch ist und warum, ausgeschaltet sind. Die bestehenden Wörterbuch-/Regelhinweise bleiben verfügbar. Kein Vorschlag wird automatisch in den Kindertext übernommen.",
      "- Neben den 54 ursprünglichen Fällen sind 16 neue Transferbeispiele für dieselben Fehlermuster enthalten. Die Auswertung kann die tatsächlich angezeigten Korrekturvorschläge getrennt von freien Modellantworten prüfen. Ausführung, Ergebnisse und bekannte Grenzen dokumentieren [Prüfbericht](docs/pruefbericht-version-2-tests.md) und [Testanleitung](docs/testplan-version-2.md).",
      ""
    ]
  },
  {
    "id": "5a21fbf0bdb09b97",
    "title": "22. November 2026 – GUI-, Backend- und Fachtests für Version 2.0 vorbereiten",
    "lines": [
      "",
      "- Sieben neue GUI-Testfälle prüfen bewusstes Speichern, weitere Tagesabschnitte, zusätzliche Coins, Tages- und Kindertrennung, schmale Fenster und Erklärungen. Sechs Backend-Testfälle prüfen Einrichtung, Anfragen und Speicherung mit simuliertem Ollama und temporären Daten.",
      "- Ein Korpus mit 54 erfundenen Testsätzen in 22 Kategorien enthält Fehler, korrekte Kontrollsätze und mehrdeutige Fälle. Der vorbereitete Nachtlauf untersucht die Markierungen der echten App sowie Bewertungen, Korrekturvorschläge und Erklärungen des lokalen Modells. Referenzantworten werden nicht an das Modell übermittelt.",
      "- Berichte unterscheiden Fehlalarme, übersehene Stellen, technische Ausfälle und formal passende Vorschläge. Die Richtigkeit und Kindgerechtheit einer Erklärung erfordern zusätzlich die dokumentierte manuelle Nachsicht. Zwischenstände und eine Wiederaufnahme bei unverändertem Stand sind vorgesehen.",
      "- Diese Vorbereitung ergänzte Tests und Entwickleranleitungen, keine neue App-Version. Zu diesem Zeitpunkt waren die neuen Tests noch nicht ausgeführt; die anschließende Durchführung steht im neueren Eintrag oben. Der Fachlauf benötigt ausdrücklich `--execute`. Die [Testanleitung](docs/testplan-version-2.md) nennt Vorbereitung, Befehle und Grenzen.",
      ""
    ]
  },
  {
    "id": "4262761e873cea63",
    "title": "22. November 2026 – Selbst speichern und am selben Tag weiterschreiben",
    "lines": [
      "",
      "- Eine fehlerfreie Prüfung oder die letzte bearbeitete Markierung beendet den Eintrag nicht mehr automatisch. Das Kind entscheidet selbst mit „Eintrag speichern“, wann es fertig ist; eine eingeschaltete Gefühlsauswahl folgt erst danach.",
      "- „Noch etwas ins Tagebuch schreiben“ öffnet einen neuen Abschnitt. Die bereits gespeicherten Texte desselben Tages stehen darüber unveränderbar zum Lesen, auch nach einem Neustart. Alte Texte werden nicht erneut korrigiert oder an die KI geschickt. Wörter und Sätze der heutigen Abschnitte zählen gemeinsam zum Tagesziel, sodass ein späterer Zusatz kürzer sein darf.",
      "- Neue Abschnitte bringen nach den bestehenden Satz-, Wort- und Kommaregeln weitere Coins. Die frühere Sperre „nur erster Eintrag pro Tag“ entfällt für neue Abschnitte. Bereits gespeicherter Text und alte Buchungen werden nicht nachträglich neu vergütet. Für kurze Abschnitte ohne ausreichend langen ganzen Satz gibt es weiterhin keine Satz-Coins.",
      "- „Erklärung und Merkhilfe“ bietet zusätzliche Erklärungen oder Vergleichs- und Merkstrategien, etwa für vertauschte, fehlende oder zusätzliche Buchstaben. Wo keine sichere Regel bekannt ist, wird keine erfunden. Vorhandene ausführlichere OpenAI-Hinweise sind dort ohne weiteren KI-Aufruf lesbar.",
      "- Zum Ausprobieren die lokale App-Seite neu laden. Bestehende Einträge und Coinstände bleiben erhalten. Diese Änderungen gehören zur Vorbereitung auf Version 2.0; sie sind noch nicht als neues Windows-Paket veröffentlicht.",
      ""
    ]
  },
  {
    "id": "0dae1e56e4fdfde4",
    "title": "22. November 2026 – Lokales gpt-oss-20b für Version 2.0 erproben",
    "lines": [
      "",
      "- OpenAI gpt-oss-20b steht als zusätzliches lokales Modell zur Auswahl. Der Download ist etwa 14 GB groß; das Modell benötigt viel freien Arbeitsspeicher und kann im Prozessormodus deutlich länger antworten. Die vorhandenen Qwen-Modelle bleiben erhalten.",
      "- Die App erkennt die niedrige Denkstufe des Modells und gibt ihr mehr Platz für die abschließende Antwort. Angezeigt und ausgewertet wird ausschließlich die Antwort, nicht der interne Denktext. Abgeschnittene oder unpassende Antworten bleiben Fehler. Die Auswahlprüfung wird nicht gelockert.",
      "- Nach der lokalen Aktualisierung die Seite neu laden, das Modell herunterladen und mit den Testfragen erproben. Eine allgemeine fachliche Eignung für Kinder ist damit noch nicht nachgewiesen; die Lernhilfe wird nicht automatisch eingeschaltet. Dies ist noch keine Veröffentlichung von Version 2.0.",
      "- Der [lokale Prüfbericht](docs/pruefbericht-gpt-oss-20b.md) dokumentiert die erfolgreiche Installation, Antwortzeiten und weiterhin fehlerhafte Bewertungen. gpt-oss hat den unveränderten Vergleich im Prozessormodus noch nicht bestanden; ein größerer Download allein behebt die fachlichen Probleme nicht.",
      ""
    ]
  },
  {
    "id": "0c12a89a01401c59",
    "title": "22. November 2026 – Modellvergleich für Windows-Version 2.0 nachvollziehbar machen",
    "lines": [
      "",
      "- Ein erreichbares Modell kann falsche Rechtschreibantworten liefern. Der Vergleich zeigt jetzt unter „Testantworten ansehen“ für jede beantwortete Testfrage die erwartete Schreibweise, den tatsächlichen Vorschlag, die Erklärung und eine etwaige Rückfrage. Eine falsche erste Antwort beendet die zweite Testfrage nicht mehr vorzeitig.",
      "- Die Anforderungen bleiben unverändert: Nur zwei passende Verbesserungen erlauben eine automatische Auswahl; für Grafik zusätzlich der bestätigte Grafikspeicher. Gespeicherte Einstellungen ändern sich bei einem Fehlschlag nicht. Echte lokale Versuche mit beiden Qwen-Modellen haben falsche Bewertungen von „oma“ gezeigt. Eine funktionierende Verbindung bestätigt daher noch keine fachliche Eignung.",
      "- Für die neue Anzeige die App-Seite neu laden. Modelle und vorhandene Tagebuchdaten müssen nicht erneut heruntergeladen oder eingerichtet werden. Dies ist weiterhin eine Vorbereitung auf Version 2.0.",
      ""
    ]
  },
  {
    "id": "743a2260985e6329",
    "title": "21. November 2026 – Vorbereitung auf Windows-Version 2.0",
    "lines": [
      "",
      "- Die Ollama-Einrichtung verwendet jetzt ausdrücklich das zu Windows PowerShell gehörende Entpackmodul. Damit scheitert sie nicht mehr an einem fremden PowerShell-Modulpfad. Ein bereits vollständig heruntergeladenes Laufzeitarchiv wird nach erneuter Prüfung von Größe und Prüfsumme wiederverwendet, wenn das Entpacken zuvor fehlgeschlagen ist.",
      "- Beim Öffnen der KI-Einstellungen werden vorhandene Modelle auch nach einem Serverneustart wieder gesucht und als heruntergeladen angezeigt. „Beispiel testen“ erklärt eine unvollständige Einrichtung mit dem konkreten Fehler statt nur „Ollama nicht erreichbar“ zu melden.",
      "- Nach dieser lokalen Aktualisierung den App-Server neu starten und die Seite neu laden. Bei einer gescheiterten Einrichtung „Lokale KI und Modell herunterladen“ erneut wählen. Vorhandene Familien- und Kinderdaten bleiben erhalten. Dies ist noch keine Veröffentlichung von Version 2.0.",
      ""
    ]
  },
  {
    "id": "6f3f3cb42b44ccf9",
    "title": "22. Oktober 2026 – Windows-Testpaket 0.1.0",
    "lines": [
      "",
      "Dieser Entwicklungsstand wird getrennt von der auf GitHub veröffentlichten HTML-App 1.3.4 gesichert. Die Versionsnummer 0.1.0 bezeichnet das Windows-Paket und ist kein Update der HTML-App 1.3.4.",
      "",
      "- Die Windows-App speichert Einstellungen und Tagebücher automatisch im eigenen Datenordner. Eine anfängliche Ordnerauswahl entfällt bei Start über den lokalen Server.",
      "- Eltern können eine eigene lokale Ollama-Laufzeit und ein Modell über die App einrichten. Alternativ steht eine optionale OpenAI-API-Anbindung mit eigenem API-Schlüssel zur Verfügung. Die Einrichtung führt durch die notwendigen Schritte und Einwilligungen.",
      "- Kinder können Korrekturen im Schreibbereich bearbeiten und Hinweise daneben lesen. Bei einer fehlgeschlagenen KI-Prüfung erscheint der Abbruchgrund; Wörterbuch und Regeln bleiben als Rückfall verfügbar. Die lokale Modellqualität und Geschwindigkeit sind weiterhin zu prüfen.",
      "- Der Tagesabschluss fragt bis zu drei Gefühle ab und bietet anschließend Lesen oder Spielen an. Der Elternbereich erhält eine Gefühlsübersicht mit Kalender und Zeiträumen.",
      "- Einstellungen und Belohnungen sind neu gegliedert. Kurze Hilfen, Tooltips und Verweise auf die Anleitung unterstützen die Einrichtung.",
      "- Das Windows-x64-ZIP enthält die benötigte Node.js-Laufzeit. Nach vollständigem Entpacken startet `Start.cmd` die App im Browser. Ollama und Modellgewichte werden separat über die App heruntergeladen; persönliche Daten und Zugangsschlüssel sind nicht enthalten.",
      "- Dokumentation, automatisierte Prüfungen und getrennte Forschungsprogramme dokumentieren die untersuchten Verfahren zur Rechtschreibkorrektur. Die experimentellen Fehlermodelle sind keine aktive Korrekturinstanz der App.",
      "",
      "Die Daten liegen nach dem ersten Speichern unter `data/` im entpackten Programmordner. Für eine Sicherung die App beenden und den gesamten Ordner kopieren. Ein OpenAI-Schlüssel muss auf einem anderen Windows-Konto oder PC erneut eingerichtet werden.",
      ""
    ]
  },
  {
    "id": "2541cfbdf36aa8c8",
    "title": "Version 1.3.4: Jetzt als reguläres Update verfügbar — 15. Oktober 2026",
    "lines": [
      "",
      "- Die auf `dev` erprobten Änderungen bis Version 1.3.4 stehen jetzt regulär auf `main` bereit. Damit erreicht die Update-Suche auch die neuen Lernfunktionen, die Korrekturansicht mit Text links und Verbesserung rechts, die unmittelbare Rückmeldung zu gelben Wörtern, verständliche Leerzeichenhinweise und den leichteren Einstieg in Weltraum-Angriff.",
      "- Gegenüber der Testfassung 1.3.4 ändern sich die Programmfunktionen nicht. README und Testanleitung erklären jetzt die reguläre Bereitstellung. Die älteren Einträge darunter beschreiben die vorausgegangenen Teststände und ihren damaligen Veröffentlichungsweg.",
      "",
      "**Was müsst ihr tun?** Auf der Startseite **Nach Updates suchen**, dann **Jetzt aktualisieren** und nach der Installation **Neu laden** wählen. Ohne Update-Funktion die vollständige ZIP von `main` entpacken und nur `Tagebuch.html` und `app/` ersetzen. Eure Ordner `config/` und `kinder/` sowie das bisherige Browserprofil behalten. Gespeicherte Einträge, Profile, Coins und Einstellungen benötigen keine Umstellung. Wer bereits die Testfassung 1.3.4 verwendet, hat denselben Programmstand und muss sie nicht erneut installieren. Die Programmversion bleibt 1.3.4; dieser Eintrag dokumentiert ihre reguläre Veröffentlichung.",
      ""
    ]
  },
  {
    "id": "1af597f93dd3b34c",
    "title": "Version 1.3.4: Leerzeichen verständlich zeigen und gezielt verbessern — 15. Oktober 2026",
    "lines": [
      "",
      "- Bei „schreibst.Die App“ wurde bisher „Die“ als Markierung angezeigt, obwohl das Leerzeichen nach dem Punkt fehlte. Jetzt steht direkt „Hier fehlt ein Leerzeichen“ mit einer Erklärung der betroffenen Grenze. Die Markierung liegt am Wort vor dem Abstand samt Satzzeichen. „Die“ wird dadurch nicht mehr wie ein falsch geschriebenes Wort dargestellt.",
      "- Im Verbesserungsfeld steht bei Leerzeichenfehlern nur die kurze Textstelle, zum Beispiel „schreibst.Die“. Der Cursor steht an der Stelle zum Einfügen. Bei einem überflüssigen Leerzeichen vor dem Satzzeichen erklärt die App ausdrücklich, dass dieser Abstand entfernt werden soll.",
      "- Bei Satzzeichen- und Grammatikhinweisen steht im Korrekturfeld nur der betroffene Satz oder Abschnitt statt des gesamten Schreibfelds. Beim Übernehmen wird ausschließlich dieser Ausschnitt ersetzt; der übrige Text bleibt erhalten. Die App verbessert weiterhin nichts automatisch.",
      "- README, Elternhilfe, Kinderhilfe und Testanleitung erklären diese Hinweise. Browserprüfungen decken fehlende und überflüssige Leerzeichen, längere Texte, Satzzeichen, Grammatik und den Erhalt des umgebenden Textes ab.",
      "",
      "**Was müsst ihr tun?** Die Testfassung wird ausschließlich auf `dev` bereitgestellt. Im separaten Testordner `Tagebuch.html` und den vollständigen Ordner `app/` ersetzen und neu laden; Datenordner und Test-Browserprofil behalten. Gespeicherte Texte und Einstellungen benötigen keine Umstellung. Die automatische Update-Suche liest weiterhin `main`. Bereits geschriebene Texte werden erst nach einer erneuten Prüfung mit den neuen Hinweisen angezeigt.",
      ""
    ]
  },
  {
    "id": "015e738a0e2ae0ca",
    "title": "Version 1.3.3: Bündige Prüfung und leichterer Spieleinstieg — 15. Oktober 2026",
    "lines": [
      "",
      "- Textblatt und Korrekturfenster beginnen bei normaler Laptopbreite jetzt auf gleicher Höhe. Überschrift und Hinweis stehen gemeinsam darüber; im schmalen Fenster bleiben die Bereiche untereinander.",
      "- Bei gelb markierten, dem Wörterbuch unbekannten Wörtern genügt unter „Ich brauche Hilfe“ jetzt „Ich glaube, meine Schreibweise stimmt“. Genau diese Stelle blockiert sofort nicht mehr; die zusätzliche Bestätigung entfällt. Die Schreibweise bleibt stehen. Rückmeldung und offene Prüfbitte bleiben gespeichert, auch nach Neuladen. Gleiche Wörter an anderen Stellen werden weiterhin einzeln geprüft; private Texte werden dadurch nicht automatisch mit Eltern geteilt.",
      "- „Das ist ein Name“ bleibt erreichbar: Bei gelben Wörtern steht es gegebenenfalls direkt neben „Prüfen“. Bei anderen Markierungen bleibt die bisherige Rückfrage bestehen.",
      "- „Weltraum-Angriff“ beginnt mit 21 statt 55 Gegnern, langsameren Bewegungen und langsamerem, seltenerem Beschuss. In Welle 1 gibt es höchstens einen gegnerischen Schuss gleichzeitig. Vier Leben, ein kurzer Schutz nach Treffern und die begrenzte Beschleunigung der letzten Gegner erleichtern den Einstieg. Spätere Wellen werden schrittweise schwieriger. Die Spielgeschwindigkeit hängt nicht mehr von der Bildwiederholrate ab.",
      "- README, Elternhilfe, Kinderhilfe und Testanleitung erklären die geänderten Abläufe. Automatische Prüfungen wurden für die Ausrichtung, unmittelbare Freigabe samt Rückmeldung und den Spieleinstieg ergänzt.",
      "",
      "**Was müsst ihr tun?** Diese Testfassung wird ausschließlich auf `dev` bereitgestellt. Im separaten Testordner die vollständig entpackten Programmdateien `Tagebuch.html` und `app/` ersetzen und neu laden; die Datenordner und das Test-Browserprofil behalten. Gespeicherte Einträge und Einstellungen benötigen keine Umstellung. Die automatische Update-Suche liest weiterhin `main` und verteilt diese Testfassung nicht. Die [Testanleitung](docs/testfassung-dev.md) beschreibt den Ablauf.",
      ""
    ]
  },
  {
    "id": "28fc90c767b6eba5",
    "title": "Version 1.3.2: Den Text sehen und daneben verbessern — 15. Oktober 2026",
    "lines": [
      "",
      "- **Text und Verbesserung nebeneinander:** Nach dem Prüfen sieht das Kind links seinen Text mit anklickbaren Unterstreichungen. Verbessert wird rechts, immer im selben Feld. Bei Satzzeichen und Grammatik erscheint dort der betroffene Satz oder Abschnitt. In schmalen Fenstern stehen die Bereiche untereinander; bei langen Texten kann Scrollen weiterhin nötig sein.",
      "- **Weniger Knöpfe auf einmal:** Zunächst erscheinen „Prüfen“, bei einem passenden Hinweis „Tipp“ und „Ich brauche Hilfe“. Die Hilfe bietet dann „Ich weiß nicht weiter“ oder „Ich glaube, meine Schreibweise stimmt“ an. Nach einem Tipp kann das Kind melden, dass dieser nicht hilft. Namen lassen sich über die Rückfrage zur Schreibweise merken. Private Wortstellen werden weiterhin nur nach einer eigenen Freigabe mit den Eltern geteilt.",
      "- **Fragen bleiben freiwillig:** „Schreibideen anzeigen“ blendet die drei Fragen ein. Beim Ausblenden bleiben Antworten erhalten und zählen mit. Über „Text weiterschreiben“ geht es aus der Prüfung zurück ins Heft.",
      "- **Eingegebene Verbesserungen behalten:** Gültige Korrekturen werden beim Wechsel der Markierung, beim Zurückgehen und beim normalen Neuladen als Entwurf übernommen. Ein unbekanntes Wort bleibt gelb gepunktet markiert und bekommt die Erklärung „Dieses Wort kenne ich nicht“, ohne geratenen Regeltipp.",
      "- **Anleitungen und Prüfungen ergänzt:** README, Elternhilfe, Kinderhilfe und Testanleitung beschreiben die neue Ansicht. Zusätzliche Browserprüfungen kontrollieren die Bedienung, Entwürfe und schmale Fenster. Schreibziele, Belohnungsregeln und das Datenformat bleiben erhalten.",
      "",
      "**Was müsst ihr tun?** Die aktuelle ZIP vom Branch `dev` laden und im Testordner die vollständigen Programmdateien `Tagebuch.html` und `app/` ersetzen. `config/`, `kinder/` und das Test-Browserprofil behalten. Die App neu öffnen und einen vorhandenen Entwurf erneut prüfen. Bei Startproblemen die vollständige ZIP erneut entpacken; keine Programmdateien verschiedener Versionen mischen. Die automatische Update-Suche verteilt diese Testfassung nicht; `main` bleibt unverändert.",
      ""
    ]
  },
  {
    "id": "2e30ef977905f8aa",
    "title": "Version 1.3.1: Klarer korrigieren, unbekannte Wörter ehrlich benennen — 14. Oktober 2026",
    "lines": [
      "",
      "- **Korrekturen bleiben an einer Stelle:** Wörter, Satzzeichen und Grammatik werden im selben Korrekturbereich unter dem Text bearbeitet. Für Satzzeichen oder mehrere Wörter erscheint dort der betroffene Satz beziehungsweise Abschnitt. Der bisherige Sprung zurück zum oberen Schreibfeld entfällt. Das funktioniert auch bei eingeklappten freiwilligen Antworten.",
      "- **„Rotze“ wird nicht mehr fälschlich beanstandet:** Eine zusätzliche Groß-/Kleinschreibungsregel hatte das vom Wörterbuch akzeptierte Wort abgewertet. Diese unsichere Regel wurde entfernt.",
      "- **„Nicht im Wörterbuch“ bedeutet nicht „falsch“:** Fehlt eine Schreibweise wie „Popel“, sagt die App das ausdrücklich. Sie erfindet dafür keinen Nomen- oder anderen Regeltipp und keinen vermeintlich sicheren Verbesserungsvorschlag. Das Kind kann selbst verbessern oder genau diese Wortstelle zur gemeinsamen Prüfung offenlassen. Die App verwendet Hunspell/igerman98, keinen Duden.",
      "- **Vorsichtigere Auswertung:** Unbekannte Wörter bleiben ungeklärt und erzeugen keine Empfehlung für eine bestimmte Fehlerklasse. Alte, noch ungeklärte automatische Zuordnungen zeigen bis zur erneuten Prüfung einen neutralen Hinweis. Elternentscheidungen und der gespeicherte Verlauf bleiben erhalten. Bei Diktaten mit vorgegebenem Zielwort und nachvollziehbaren Großschreibungsfällen gibt es weiterhin passende Tipps.",
      "- **Anleitungen ergänzt:** Beide App-Hilfen und die Testanleitung erklären die gemeinsame Korrekturstelle und die Grenzen des Wörterbuchs.",
      "",
      "**Was müsst ihr tun?** Die neue ZIP vom Branch `dev` herunterladen und im Testordner nur `Tagebuch.html` und `app/` ersetzen. `config/`, `kinder/` und die Daten des Test-Browserprofils behalten. Danach neu öffnen und den aktuellen Text erneut prüfen. `main` bleibt unverändert; die automatische Update-Suche verteilt diese Testfassung nicht.",
      ""
    ]
  },
  {
    "id": "20f5312709e7273b",
    "title": "Version 1.3.0 — 14. Oktober 2026",
    "lines": [
      "",
      "- **Zunächst als Testfassung:** Die neuen Funktionen werden auf dem separaten GitHub-Branch `dev` mit ZIP-Download und einer [Schritt-für-Schritt-Testanleitung](docs/testfassung-dev.md) bereitgestellt. `main` bleibt unverändert; die automatische Update-Suche bietet diese Testfassung nicht an. Bitte in einem eigenen Testordner und separaten Browserprofil ausprobieren.",
      "- **Einfacher einrichten:** Unter „Gemeinsam starten“ sehen Eltern Schreibziel, Satzlänge, Schreibtage und Coins zusammen. Ein Beispieltext zeigt, ob die Aufgabe machbar wäre und wann Coins verfügbar werden. Vorhandene Einstellungen bleiben erhalten.",
      "- **Eine Wortstelle nach der anderen:** Kinder können direkt an einer Markierung verbessern, Tipps öffnen oder sagen, dass ein Tipp noch nicht hilft. „Hier weiß ich nicht weiter“ und „Meine Schreibweise stimmt, bitte prüfen“ lassen nur dieses Wort offen. Der Text wird nicht automatisch korrigiert; offene Stellen können später erneut angeschaut werden.",
      "- **Mehr Ruhe beim Schreiben:** Ein Hauptfeld steht im Vordergrund; die freiwilligen Fragen lassen sich aufklappen. Gesammelte Wochen-Coins und tatsächlich verfügbare Coins werden getrennt angezeigt. Die bisherigen Tagesziele und Wochenregeln gelten weiter.",
      "- **Nachvollziehbare Elternübersicht:** Verbesserte, ungelöste und beanstandete Wortstellen werden getrennt dargestellt. Neue private Wortstellen sehen Eltern nur nach Freigabe durch das Kind. Rückfragen zur Bewertung bleiben sichtbar, auch wenn das Kind weiterübt. Ältere Zusammenfassungen bleiben gesondert erhalten.",
      "- **Freiwillige Übungen mit vereinbarter Belohnung:** Eltern können kurze Wort- und Text-Diktate ansehen, anbieten und dafür eigene Extra-Coins festlegen, auch 0. Das Kind kann pausieren. Bearbeitete Wörter erhalten ihren Anteil; bloßes Überspringen bringt keine Coins. Spätere Bearbeitung oder eine anerkannte zulässige Antwort ergänzt nur den fehlenden Anteil. Diese Aufgaben werden nie Voraussetzung für das Tagebuch.",
      "- **Vorsichtigere Hinweise:** Mehrdeutige Wörterbuchvorschläge werden nicht als sichere Fehlerklasse ausgegeben. Regeln enthalten auch Gegenbeispiele; Buchstabenverwechslungen lösen keinen vermeintlich diagnostischen Schwellenhinweis mehr aus. Die geplante 30-Tage-Wiederholung eigener Übungswörter wird jetzt tatsächlich abgewartet. Namen bleiben getrennt je Kind. Die falsche Vorlage „zum tauschen“ wurde zu „zum Tauschen“ berichtigt.",
      "- **Hilfe bei Updateproblemen:** Fehlt ein Programmteil oder passt ein gespeichertes Datenformat nicht zur App, erhalten Kinder und Eltern verständliche Hinweise mit nächsten Schritten. Unbekannte oder unvollständige Ordner werden vor dem Schreiben zurückgewiesen. Speicherfehler werden sichtbar; neue Aufgabenstände und Coins werden zusammen gespeichert.",
      "- **Anleitungen und Prüfungen:** Elternhilfe, Kinderhilfe und README erklären die neuen Abläufe. Entwicklungsplan und Prüfbericht dokumentieren die Umsetzung und ihre Grenzen. Automatische Prüfungen belegen keine Lernwirkung und ersetzen keine Tests mit echten Familien.",
      "",
      "**Müsst ihr etwas tun?** Ein normales Update übernimmt kompatible Daten. Bei einem Startproblem die vollständigen Programmdateien erneut laden und nur `Tagebuch.html` und `app/` ersetzen; `config/`, `kinder/` und Browserdaten behalten. Danach gegebenenfalls den bisherigen Ordner erneut freigeben oder die Stimme im Elternbereich testen. Die bisherigen Belohnungseinstellungen müssen nicht neu angelegt werden.",
      ""
    ]
  },
  {
    "id": "53fb075caeb911f4",
    "title": "Konzept zur Rechtschreibförderung ergänzt — 14. Oktober 2026",
    "lines": [
      "",
      "- Ein [Konzept für die weitere Entwicklung](docs/konzept-rechtschreibfoerderung.md) beschreibt, wie Kinder einzelne schwierige Wörter offenlassen und mögliche Fehlbewertungen melden könnten. Eltern sollen diese Fälle nachvollziehen und gezielte Übungsangebote mit einstellbaren Extra-Coins anlegen können.",
      "- Das Dokument beschreibt auch die fachliche Überarbeitung der Fehlerklassen und Hinweise sowie die Grenzen der Auswertung. Die bisherigen Einstellungen zu Schreibumfang und Tagebuchbelohnungen bleiben Grundlage der Planung.",
      "- Rückmeldungen zur Nutzung sind als Bedienanforderungen aufgenommen: zusammenhängende Elterneinstellungen, verständliche Empfehlungen, eine klare Schreibansicht und das direkte Bearbeiten markierter Wörter. Diese Verbesserungen haben Vorrang vor zusätzlichen Auswertungen und Aufgabenfunktionen.",
      "- Die README verlinkt das Konzept als Ausgangspunkt für einen Entwicklungsplan und benennt Schreiben und Rechtschreibung als Schwerpunkt. Die beschriebenen neuen Funktionen sind noch nicht umgesetzt.",
      "",
      "**Was müsst ihr tun?** Nichts. Dies ist eine reine Dokumentationsänderung; die App, ihre Einstellungen und gespeicherten Daten werden dadurch nicht verändert. Ein App-Update ist dafür nicht erforderlich.",
      ""
    ]
  },
  {
    "id": "e4f5d2e03522aa5d",
    "title": "Version 1.2.1: Hilfe in der App ergänzt — 14. Oktober 2026",
    "lines": [
      "",
      "- Die Hilfe im Elternbereich erklärt jetzt die Stimmenauswahl mit Hörprobe, die Einrichtung unter Windows/macOS, das automatische Speichern im Shop, die Symbolauswahl sowie Programmupdates und die Glocke.",
      "- Unter „Probleme lösen“ findet ihr passende Schritte bei schlecht verständlicher Sprachausgabe, fehlenden Shop-Artikeln und fehlgeschlagenen Updates.",
      "- Die Kinderhilfe erklärt die Glocke und zeigt, wann ein Erwachsener bei Diktatstimmen oder Updates helfen kann.",
      "",
      "**Was müsst ihr tun?** Version 1.2.1 installieren und neu laden. Die Elternhilfe findet ihr unter **Eltern → Hilfe**, die Kinderhilfe über **❓ Hilfe** im Tagebuch. Diese Fassung ergänzt die Hilfetexte; eure Daten und Einstellungen bleiben erhalten.",
      ""
    ]
  },
  {
    "id": "2e314a4eedd726fe",
    "title": "Version 1.2.0: Stimmen auswählen und Diktate probehören — 14. Oktober 2026",
    "lines": [
      "",
      "- Im Elternbereich unter **Einstellungen → Stimme und Diktat testen** könnt ihr eine verfügbare deutsche Stimme auswählen und das Tempo einstellen.",
      "- Mit einem eigenen kurzen Text könnt ihr eine normale und eine langsamere Hörprobe starten oder die Wiedergabe stoppen. So lässt sich die Verständlichkeit auf eurem Gerät vergleichen.",
      "- Die Auswahl wird gespeichert und gilt für die Diktate, Fragen und das Vorlesen aller Kinder. Fehlt die gewählte Stimme auf einem anderen Gerät, verwendet die App eine verfügbare deutsche Ersatzstimme.",
      "- Unter Windows führen Links zu den Sprach- und Sprachausgabe-Einstellungen. Wenn der Browser das Öffnen blockiert, hilft die Anleitung daneben. Nach dem Installieren neuer Stimmen könnt ihr die Liste neu laden; manchmal ist ein Browser-Neustart nötig.",
      "- Auf dem Mac zeigt die App einen Link zu den macOS-Bedienungshilfen und eine Anleitung zur Auswahl zusätzlicher Stimmen. Falls der Link vom Browser blockiert oder von der macOS-Version nicht unterstützt wird, öffnet ihr die Systemeinstellungen über das Apple-Menü.",
      "",
      "**Was müsst ihr tun?** Version 1.2.0 installieren, die App neu laden und im Elternbereich verschiedene Stimmen probehören. Die App verwendet die vom Browser angebotenen Stimmen; sie installiert keine neuen Stimmen und kann deren Klangqualität nicht verbessern.",
      ""
    ]
  },
  {
    "id": "7fabdcd723ef2b95",
    "title": "Version 1.1.1: Shop-Artikel zuverlässig bearbeiten — 14. Oktober 2026",
    "lines": [
      "",
      "- Namen, Preise und Symbole im Eltern-Shop werden nun während der Bearbeitung automatisch gespeichert. Gültige Änderungen sind nach dem Wechsel zum Kind sofort im Shop sichtbar, auch ohne zusätzlichen Klick auf „Shop speichern“.",
      "- Beim Hinzufügen oder Löschen eines weiteren Artikels bleiben bereits gespeicherte Änderungen an anderen Artikeln erhalten.",
      "- Neben dem Symbolfeld öffnet die Schaltfläche 😀 eine Auswahl mit Emojis. Ihr könnt ein Symbol anklicken oder weiterhin direkt in das Feld eingeben. Auch längere Emojis werden unterstützt.",
      "- Bei einem leeren Namen oder einem ungültigen Preis zeigt die App einen Hinweis und behält den letzten gültigen Stand. Ein Artikel wird nicht mehr durch einen versehentlich leeren Namen beim Speichern entfernt.",
      "- Ein Hinweis erklärt, dass der Shop für das im Elternbereich ausgewählte Kind eingestellt wird. Die Shops anderer Kinder werden nicht verändert.",
      "",
      "**Was müsst ihr tun?** Version 1.1.1 installieren und die App neu laden. Bereits gespeicherte Artikel bleiben erhalten. Eingaben, die mit einer älteren Version verloren gegangen sind, müsst ihr erneut eintragen.",
      ""
    ]
  },
  {
    "id": "33f9942f89a27768",
    "title": "Version 1.1.0: Die Neuerungen direkt in der App lesen — 14. Oktober 2026",
    "lines": [
      "",
      "- Oben rechts findet ihr eine Glocke. Sie öffnet die gesamte Änderungsübersicht, auch ohne Internet.",
      "- Eine Zahl an der Glocke zeigt, wie viele Einträge ihr in diesem Browser noch nicht geöffnet habt.",
      "- Beim Öffnen sind die neuen Einträge mit „Neu“ markiert. Danach verschwindet die Zahl; die Übersicht könnt ihr jederzeit wieder lesen.",
      "- Die App merkt sich den Lesestand in diesem Browser. Er gilt gemeinsam für alle, die diesen Browser verwenden. Wenn die Browserdaten gelöscht werden, erscheinen die Einträge wieder als neu.",
      "",
      "**Was müsst ihr tun?** Version 1.1.0 über **Jetzt aktualisieren** installieren und danach **Neu laden** wählen. Wer noch eine Fassung ohne Update-Funktion verwendet, übernimmt einmal die neuen Programmdateien. Kinderprofile und Einträge bleiben erhalten.",
      ""
    ]
  },
  {
    "id": "436473f225bce27c",
    "title": "Ergänzte Dokumentation — 14. Oktober 2026",
    "lines": [
      "",
      "- Diese Änderungsübersicht ist neu. Ihr könnt hier nachlesen, welche Funktionen hinzugekommen sind und was sich bei der Nutzung geändert hat.",
      "- Die Anleitung auf der Startseite des GitHub-Repositories verlinkt jetzt direkt auf diese Übersicht.",
      "- Für die weitere Pflege des Projekts ist festgehalten, dass zu jeder Änderung ein verständlicher Eintrag ergänzt werden soll.",
      "",
      "**Was müsst ihr tun?** Für diese Ergänzung ist kein Update der App nötig.",
      ""
    ]
  },
  {
    "id": "99a408f19fabff52",
    "title": "Version 1.0.0: Updates direkt im Tagebuch — 14. Oktober 2026",
    "lines": [
      "",
      "### Neu",
      "",
      "- Beim Öffnen schaut das Tagebuch nach, ob eine neue Programmversion verfügbar ist. Ihr müsst dafür nicht selbst auf GitHub nachsehen.",
      "- Wenn es ein Update gibt, könnt ihr **Jetzt aktualisieren** oder **Später** wählen. Ohne eure Bestätigung wird nichts installiert.",
      "- Mit **Nach Updates suchen** könnt ihr die Prüfung jederzeit auf der Startseite wiederholen.",
      "- Nach der Installation erscheint **Neu laden**. Damit startet ihr die neue Version; vorher speichert die App den aktuellen Stand.",
      "",
      "### Eure Daten und fehlgeschlagene Updates",
      "",
      "- Aktualisiert werden nur die Programmdateien. Kinderprofile, Tagebucheinträge, Bilder und Familieneinstellungen bleiben erhalten.",
      "- Vor der Installation prüft die App, ob alle heruntergeladenen Dateien vollständig und unverändert angekommen sind.",
      "- Die bisherigen Programmdateien werden gesichert. Geht beim Schreiben etwas schief, versucht die App, diese Dateien wiederherzustellen.",
      "- Ohne Internet könnt ihr das Tagebuch weiter nutzen. Die Suche nach Updates lässt sich später erneut starten.",
      "",
      "**Was müsst ihr tun?** Wenn ihr noch die ursprüngliche App verwendet, müsst ihr einmal die neue `Tagebuch.html` und den Ordner `app/` aus dem Repository übernehmen. Die vorhandenen Ordner `config/` und `kinder/` behalten. Erst diese neue Fassung enthält die Update-Funktion. Für spätere Updates verwendet ihr Chrome oder Edge und gebt den Programmordner zum Schreiben frei.",
      ""
    ]
  },
  {
    "id": "1da5a33dbf9a5f03",
    "title": "Erste Bereitstellung im Repository — 14. Oktober 2026",
    "lines": [
      "",
      "- Die vorhandene Tagebuch-App wurde aus der hochgeladenen ZIP übernommen. Ihre Dateien liegen jetzt direkt im Repository.",
      "- Die App bringt bereits mehrere Kinderprofile, PINs, Tagebucheinträge, Bilder, Rechtschreibprüfung, Lese- und Diktatübungen sowie Spiele und Belohnungen mit.",
      "- Eine ausführliche Anleitung erklärt das Öffnen mit Chrome oder Edge, die Einrichtung der Kinderprofile, die Speicherung und das Sichern der Daten.",
      "- Die Anleitung beschreibt auch, wann Text zur Online-Grammatikprüfung übertragen wird und wie die optionalen Handy-Benachrichtigungen funktionieren.",
      "- Die Projektverwaltung schließt erzeugte Familien- und Kinderdaten aus, damit sie beim normalen Hinzufügen der Dateien nicht versehentlich auf GitHub landen.",
      "",
      "**Was müsst ihr tun?** Für den ersten Start das Repository vollständig herunterladen und entpacken, `Tagebuch.html` öffnen und die Schritte in der [Anleitung](README.md#start-auf-dem-eigenen-pc) befolgen.",
      ""
    ]
  }
];
