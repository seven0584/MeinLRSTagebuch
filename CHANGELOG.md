# Was hat sich geändert?

Hier stehen die Änderungen am Tagebuch, erklärt für Eltern und Lehrkräfte. Die neuesten Einträge stehen oben. Bei Programmupdates nennen wir die Version, was sich im Alltag ändert und ob ihr etwas tun müsst.


## Version 1.3.4: Jetzt als reguläres Update verfügbar — 15. Oktober 2026

- Die auf `dev` erprobten Änderungen bis Version 1.3.4 stehen jetzt regulär auf `main` bereit. Damit erreicht die Update-Suche auch die neuen Lernfunktionen, die Korrekturansicht mit Text links und Verbesserung rechts, die unmittelbare Rückmeldung zu gelben Wörtern, verständliche Leerzeichenhinweise und den leichteren Einstieg in Weltraum-Angriff.
- Gegenüber der Testfassung 1.3.4 ändern sich die Programmfunktionen nicht. README und Testanleitung erklären jetzt die reguläre Bereitstellung. Die älteren Einträge darunter beschreiben die vorausgegangenen Teststände und ihren damaligen Veröffentlichungsweg.

**Was müsst ihr tun?** Auf der Startseite **Nach Updates suchen**, dann **Jetzt aktualisieren** und nach der Installation **Neu laden** wählen. Ohne Update-Funktion die vollständige ZIP von `main` entpacken und nur `Tagebuch.html` und `app/` ersetzen. Eure Ordner `config/` und `kinder/` sowie das bisherige Browserprofil behalten. Gespeicherte Einträge, Profile, Coins und Einstellungen benötigen keine Umstellung. Wer bereits die Testfassung 1.3.4 verwendet, hat denselben Programmstand und muss sie nicht erneut installieren. Die Programmversion bleibt 1.3.4; dieser Eintrag dokumentiert ihre reguläre Veröffentlichung.

## Version 1.3.4: Leerzeichen verständlich zeigen und gezielt verbessern — 15. Oktober 2026

- Bei „schreibst.Die App“ wurde bisher „Die“ als Markierung angezeigt, obwohl das Leerzeichen nach dem Punkt fehlte. Jetzt steht direkt „Hier fehlt ein Leerzeichen“ mit einer Erklärung der betroffenen Grenze. Die Markierung liegt am Wort vor dem Abstand samt Satzzeichen. „Die“ wird dadurch nicht mehr wie ein falsch geschriebenes Wort dargestellt.
- Im Verbesserungsfeld steht bei Leerzeichenfehlern nur die kurze Textstelle, zum Beispiel „schreibst.Die“. Der Cursor steht an der Stelle zum Einfügen. Bei einem überflüssigen Leerzeichen vor dem Satzzeichen erklärt die App ausdrücklich, dass dieser Abstand entfernt werden soll.
- Bei Satzzeichen- und Grammatikhinweisen steht im Korrekturfeld nur der betroffene Satz oder Abschnitt statt des gesamten Schreibfelds. Beim Übernehmen wird ausschließlich dieser Ausschnitt ersetzt; der übrige Text bleibt erhalten. Die App verbessert weiterhin nichts automatisch.
- README, Elternhilfe, Kinderhilfe und Testanleitung erklären diese Hinweise. Browserprüfungen decken fehlende und überflüssige Leerzeichen, längere Texte, Satzzeichen, Grammatik und den Erhalt des umgebenden Textes ab.

**Was müsst ihr tun?** Die Testfassung wird ausschließlich auf `dev` bereitgestellt. Im separaten Testordner `Tagebuch.html` und den vollständigen Ordner `app/` ersetzen und neu laden; Datenordner und Test-Browserprofil behalten. Gespeicherte Texte und Einstellungen benötigen keine Umstellung. Die automatische Update-Suche liest weiterhin `main`. Bereits geschriebene Texte werden erst nach einer erneuten Prüfung mit den neuen Hinweisen angezeigt.

## Version 1.3.3: Bündige Prüfung und leichterer Spieleinstieg — 15. Oktober 2026

- Textblatt und Korrekturfenster beginnen bei normaler Laptopbreite jetzt auf gleicher Höhe. Überschrift und Hinweis stehen gemeinsam darüber; im schmalen Fenster bleiben die Bereiche untereinander.
- Bei gelb markierten, dem Wörterbuch unbekannten Wörtern genügt unter „Ich brauche Hilfe“ jetzt „Ich glaube, meine Schreibweise stimmt“. Genau diese Stelle blockiert sofort nicht mehr; die zusätzliche Bestätigung entfällt. Die Schreibweise bleibt stehen. Rückmeldung und offene Prüfbitte bleiben gespeichert, auch nach Neuladen. Gleiche Wörter an anderen Stellen werden weiterhin einzeln geprüft; private Texte werden dadurch nicht automatisch mit Eltern geteilt.
- „Das ist ein Name“ bleibt erreichbar: Bei gelben Wörtern steht es gegebenenfalls direkt neben „Prüfen“. Bei anderen Markierungen bleibt die bisherige Rückfrage bestehen.
- „Weltraum-Angriff“ beginnt mit 21 statt 55 Gegnern, langsameren Bewegungen und langsamerem, seltenerem Beschuss. In Welle 1 gibt es höchstens einen gegnerischen Schuss gleichzeitig. Vier Leben, ein kurzer Schutz nach Treffern und die begrenzte Beschleunigung der letzten Gegner erleichtern den Einstieg. Spätere Wellen werden schrittweise schwieriger. Die Spielgeschwindigkeit hängt nicht mehr von der Bildwiederholrate ab.
- README, Elternhilfe, Kinderhilfe und Testanleitung erklären die geänderten Abläufe. Automatische Prüfungen wurden für die Ausrichtung, unmittelbare Freigabe samt Rückmeldung und den Spieleinstieg ergänzt.

**Was müsst ihr tun?** Diese Testfassung wird ausschließlich auf `dev` bereitgestellt. Im separaten Testordner die vollständig entpackten Programmdateien `Tagebuch.html` und `app/` ersetzen und neu laden; die Datenordner und das Test-Browserprofil behalten. Gespeicherte Einträge und Einstellungen benötigen keine Umstellung. Die automatische Update-Suche liest weiterhin `main` und verteilt diese Testfassung nicht. Die [Testanleitung](docs/testfassung-dev.md) beschreibt den Ablauf.

## Version 1.3.2: Den Text sehen und daneben verbessern — 15. Oktober 2026

- **Text und Verbesserung nebeneinander:** Nach dem Prüfen sieht das Kind links seinen Text mit anklickbaren Unterstreichungen. Verbessert wird rechts, immer im selben Feld. Bei Satzzeichen und Grammatik erscheint dort der betroffene Satz oder Abschnitt. In schmalen Fenstern stehen die Bereiche untereinander; bei langen Texten kann Scrollen weiterhin nötig sein.
- **Weniger Knöpfe auf einmal:** Zunächst erscheinen „Prüfen“, bei einem passenden Hinweis „Tipp“ und „Ich brauche Hilfe“. Die Hilfe bietet dann „Ich weiß nicht weiter“ oder „Ich glaube, meine Schreibweise stimmt“ an. Nach einem Tipp kann das Kind melden, dass dieser nicht hilft. Namen lassen sich über die Rückfrage zur Schreibweise merken. Private Wortstellen werden weiterhin nur nach einer eigenen Freigabe mit den Eltern geteilt.
- **Fragen bleiben freiwillig:** „Schreibideen anzeigen“ blendet die drei Fragen ein. Beim Ausblenden bleiben Antworten erhalten und zählen mit. Über „Text weiterschreiben“ geht es aus der Prüfung zurück ins Heft.
- **Eingegebene Verbesserungen behalten:** Gültige Korrekturen werden beim Wechsel der Markierung, beim Zurückgehen und beim normalen Neuladen als Entwurf übernommen. Ein unbekanntes Wort bleibt gelb gepunktet markiert und bekommt die Erklärung „Dieses Wort kenne ich nicht“, ohne geratenen Regeltipp.
- **Anleitungen und Prüfungen ergänzt:** README, Elternhilfe, Kinderhilfe und Testanleitung beschreiben die neue Ansicht. Zusätzliche Browserprüfungen kontrollieren die Bedienung, Entwürfe und schmale Fenster. Schreibziele, Belohnungsregeln und das Datenformat bleiben erhalten.

**Was müsst ihr tun?** Die aktuelle ZIP vom Branch `dev` laden und im Testordner die vollständigen Programmdateien `Tagebuch.html` und `app/` ersetzen. `config/`, `kinder/` und das Test-Browserprofil behalten. Die App neu öffnen und einen vorhandenen Entwurf erneut prüfen. Bei Startproblemen die vollständige ZIP erneut entpacken; keine Programmdateien verschiedener Versionen mischen. Die automatische Update-Suche verteilt diese Testfassung nicht; `main` bleibt unverändert.

## Version 1.3.1: Klarer korrigieren, unbekannte Wörter ehrlich benennen — 14. Oktober 2026

- **Korrekturen bleiben an einer Stelle:** Wörter, Satzzeichen und Grammatik werden im selben Korrekturbereich unter dem Text bearbeitet. Für Satzzeichen oder mehrere Wörter erscheint dort der betroffene Satz beziehungsweise Abschnitt. Der bisherige Sprung zurück zum oberen Schreibfeld entfällt. Das funktioniert auch bei eingeklappten freiwilligen Antworten.
- **„Rotze“ wird nicht mehr fälschlich beanstandet:** Eine zusätzliche Groß-/Kleinschreibungsregel hatte das vom Wörterbuch akzeptierte Wort abgewertet. Diese unsichere Regel wurde entfernt.
- **„Nicht im Wörterbuch“ bedeutet nicht „falsch“:** Fehlt eine Schreibweise wie „Popel“, sagt die App das ausdrücklich. Sie erfindet dafür keinen Nomen- oder anderen Regeltipp und keinen vermeintlich sicheren Verbesserungsvorschlag. Das Kind kann selbst verbessern oder genau diese Wortstelle zur gemeinsamen Prüfung offenlassen. Die App verwendet Hunspell/igerman98, keinen Duden.
- **Vorsichtigere Auswertung:** Unbekannte Wörter bleiben ungeklärt und erzeugen keine Empfehlung für eine bestimmte Fehlerklasse. Alte, noch ungeklärte automatische Zuordnungen zeigen bis zur erneuten Prüfung einen neutralen Hinweis. Elternentscheidungen und der gespeicherte Verlauf bleiben erhalten. Bei Diktaten mit vorgegebenem Zielwort und nachvollziehbaren Großschreibungsfällen gibt es weiterhin passende Tipps.
- **Anleitungen ergänzt:** Beide App-Hilfen und die Testanleitung erklären die gemeinsame Korrekturstelle und die Grenzen des Wörterbuchs.

**Was müsst ihr tun?** Die neue ZIP vom Branch `dev` herunterladen und im Testordner nur `Tagebuch.html` und `app/` ersetzen. `config/`, `kinder/` und die Daten des Test-Browserprofils behalten. Danach neu öffnen und den aktuellen Text erneut prüfen. `main` bleibt unverändert; die automatische Update-Suche verteilt diese Testfassung nicht.

## Version 1.3.0 — 14. Oktober 2026

- **Zunächst als Testfassung:** Die neuen Funktionen werden auf dem separaten GitHub-Branch `dev` mit ZIP-Download und einer [Schritt-für-Schritt-Testanleitung](docs/testfassung-dev.md) bereitgestellt. `main` bleibt unverändert; die automatische Update-Suche bietet diese Testfassung nicht an. Bitte in einem eigenen Testordner und separaten Browserprofil ausprobieren.
- **Einfacher einrichten:** Unter „Gemeinsam starten“ sehen Eltern Schreibziel, Satzlänge, Schreibtage und Coins zusammen. Ein Beispieltext zeigt, ob die Aufgabe machbar wäre und wann Coins verfügbar werden. Vorhandene Einstellungen bleiben erhalten.
- **Eine Wortstelle nach der anderen:** Kinder können direkt an einer Markierung verbessern, Tipps öffnen oder sagen, dass ein Tipp noch nicht hilft. „Hier weiß ich nicht weiter“ und „Meine Schreibweise stimmt, bitte prüfen“ lassen nur dieses Wort offen. Der Text wird nicht automatisch korrigiert; offene Stellen können später erneut angeschaut werden.
- **Mehr Ruhe beim Schreiben:** Ein Hauptfeld steht im Vordergrund; die freiwilligen Fragen lassen sich aufklappen. Gesammelte Wochen-Coins und tatsächlich verfügbare Coins werden getrennt angezeigt. Die bisherigen Tagesziele und Wochenregeln gelten weiter.
- **Nachvollziehbare Elternübersicht:** Verbesserte, ungelöste und beanstandete Wortstellen werden getrennt dargestellt. Neue private Wortstellen sehen Eltern nur nach Freigabe durch das Kind. Rückfragen zur Bewertung bleiben sichtbar, auch wenn das Kind weiterübt. Ältere Zusammenfassungen bleiben gesondert erhalten.
- **Freiwillige Übungen mit vereinbarter Belohnung:** Eltern können kurze Wort- und Text-Diktate ansehen, anbieten und dafür eigene Extra-Coins festlegen, auch 0. Das Kind kann pausieren. Bearbeitete Wörter erhalten ihren Anteil; bloßes Überspringen bringt keine Coins. Spätere Bearbeitung oder eine anerkannte zulässige Antwort ergänzt nur den fehlenden Anteil. Diese Aufgaben werden nie Voraussetzung für das Tagebuch.
- **Vorsichtigere Hinweise:** Mehrdeutige Wörterbuchvorschläge werden nicht als sichere Fehlerklasse ausgegeben. Regeln enthalten auch Gegenbeispiele; Buchstabenverwechslungen lösen keinen vermeintlich diagnostischen Schwellenhinweis mehr aus. Die geplante 30-Tage-Wiederholung eigener Übungswörter wird jetzt tatsächlich abgewartet. Namen bleiben getrennt je Kind. Die falsche Vorlage „zum tauschen“ wurde zu „zum Tauschen“ berichtigt.
- **Hilfe bei Updateproblemen:** Fehlt ein Programmteil oder passt ein gespeichertes Datenformat nicht zur App, erhalten Kinder und Eltern verständliche Hinweise mit nächsten Schritten. Unbekannte oder unvollständige Ordner werden vor dem Schreiben zurückgewiesen. Speicherfehler werden sichtbar; neue Aufgabenstände und Coins werden zusammen gespeichert.
- **Anleitungen und Prüfungen:** Elternhilfe, Kinderhilfe und README erklären die neuen Abläufe. Entwicklungsplan und Prüfbericht dokumentieren die Umsetzung und ihre Grenzen. Automatische Prüfungen belegen keine Lernwirkung und ersetzen keine Tests mit echten Familien.

**Müsst ihr etwas tun?** Ein normales Update übernimmt kompatible Daten. Bei einem Startproblem die vollständigen Programmdateien erneut laden und nur `Tagebuch.html` und `app/` ersetzen; `config/`, `kinder/` und Browserdaten behalten. Danach gegebenenfalls den bisherigen Ordner erneut freigeben oder die Stimme im Elternbereich testen. Die bisherigen Belohnungseinstellungen müssen nicht neu angelegt werden.

## Konzept zur Rechtschreibförderung ergänzt — 14. Oktober 2026

- Ein [Konzept für die weitere Entwicklung](docs/konzept-rechtschreibfoerderung.md) beschreibt, wie Kinder einzelne schwierige Wörter offenlassen und mögliche Fehlbewertungen melden könnten. Eltern sollen diese Fälle nachvollziehen und gezielte Übungsangebote mit einstellbaren Extra-Coins anlegen können.
- Das Dokument beschreibt auch die fachliche Überarbeitung der Fehlerklassen und Hinweise sowie die Grenzen der Auswertung. Die bisherigen Einstellungen zu Schreibumfang und Tagebuchbelohnungen bleiben Grundlage der Planung.
- Rückmeldungen zur Nutzung sind als Bedienanforderungen aufgenommen: zusammenhängende Elterneinstellungen, verständliche Empfehlungen, eine klare Schreibansicht und das direkte Bearbeiten markierter Wörter. Diese Verbesserungen haben Vorrang vor zusätzlichen Auswertungen und Aufgabenfunktionen.
- Die README verlinkt das Konzept als Ausgangspunkt für einen Entwicklungsplan und benennt Schreiben und Rechtschreibung als Schwerpunkt. Die beschriebenen neuen Funktionen sind noch nicht umgesetzt.

**Was müsst ihr tun?** Nichts. Dies ist eine reine Dokumentationsänderung; die App, ihre Einstellungen und gespeicherten Daten werden dadurch nicht verändert. Ein App-Update ist dafür nicht erforderlich.

## Version 1.2.1: Hilfe in der App ergänzt — 14. Oktober 2026

- Die Hilfe im Elternbereich erklärt jetzt die Stimmenauswahl mit Hörprobe, die Einrichtung unter Windows/macOS, das automatische Speichern im Shop, die Symbolauswahl sowie Programmupdates und die Glocke.
- Unter „Probleme lösen“ findet ihr passende Schritte bei schlecht verständlicher Sprachausgabe, fehlenden Shop-Artikeln und fehlgeschlagenen Updates.
- Die Kinderhilfe erklärt die Glocke und zeigt, wann ein Erwachsener bei Diktatstimmen oder Updates helfen kann.

**Was müsst ihr tun?** Version 1.2.1 installieren und neu laden. Die Elternhilfe findet ihr unter **Eltern → Hilfe**, die Kinderhilfe über **❓ Hilfe** im Tagebuch. Diese Fassung ergänzt die Hilfetexte; eure Daten und Einstellungen bleiben erhalten.

## Version 1.2.0: Stimmen auswählen und Diktate probehören — 14. Oktober 2026

- Im Elternbereich unter **Einstellungen → Stimme und Diktat testen** könnt ihr eine verfügbare deutsche Stimme auswählen und das Tempo einstellen.
- Mit einem eigenen kurzen Text könnt ihr eine normale und eine langsamere Hörprobe starten oder die Wiedergabe stoppen. So lässt sich die Verständlichkeit auf eurem Gerät vergleichen.
- Die Auswahl wird gespeichert und gilt für die Diktate, Fragen und das Vorlesen aller Kinder. Fehlt die gewählte Stimme auf einem anderen Gerät, verwendet die App eine verfügbare deutsche Ersatzstimme.
- Unter Windows führen Links zu den Sprach- und Sprachausgabe-Einstellungen. Wenn der Browser das Öffnen blockiert, hilft die Anleitung daneben. Nach dem Installieren neuer Stimmen könnt ihr die Liste neu laden; manchmal ist ein Browser-Neustart nötig.
- Auf dem Mac zeigt die App einen Link zu den macOS-Bedienungshilfen und eine Anleitung zur Auswahl zusätzlicher Stimmen. Falls der Link vom Browser blockiert oder von der macOS-Version nicht unterstützt wird, öffnet ihr die Systemeinstellungen über das Apple-Menü.

**Was müsst ihr tun?** Version 1.2.0 installieren, die App neu laden und im Elternbereich verschiedene Stimmen probehören. Die App verwendet die vom Browser angebotenen Stimmen; sie installiert keine neuen Stimmen und kann deren Klangqualität nicht verbessern.

## Version 1.1.1: Shop-Artikel zuverlässig bearbeiten — 14. Oktober 2026

- Namen, Preise und Symbole im Eltern-Shop werden nun während der Bearbeitung automatisch gespeichert. Gültige Änderungen sind nach dem Wechsel zum Kind sofort im Shop sichtbar, auch ohne zusätzlichen Klick auf „Shop speichern“.
- Beim Hinzufügen oder Löschen eines weiteren Artikels bleiben bereits gespeicherte Änderungen an anderen Artikeln erhalten.
- Neben dem Symbolfeld öffnet die Schaltfläche 😀 eine Auswahl mit Emojis. Ihr könnt ein Symbol anklicken oder weiterhin direkt in das Feld eingeben. Auch längere Emojis werden unterstützt.
- Bei einem leeren Namen oder einem ungültigen Preis zeigt die App einen Hinweis und behält den letzten gültigen Stand. Ein Artikel wird nicht mehr durch einen versehentlich leeren Namen beim Speichern entfernt.
- Ein Hinweis erklärt, dass der Shop für das im Elternbereich ausgewählte Kind eingestellt wird. Die Shops anderer Kinder werden nicht verändert.

**Was müsst ihr tun?** Version 1.1.1 installieren und die App neu laden. Bereits gespeicherte Artikel bleiben erhalten. Eingaben, die mit einer älteren Version verloren gegangen sind, müsst ihr erneut eintragen.

## Version 1.1.0: Die Neuerungen direkt in der App lesen — 14. Oktober 2026

- Oben rechts findet ihr eine Glocke. Sie öffnet die gesamte Änderungsübersicht, auch ohne Internet.
- Eine Zahl an der Glocke zeigt, wie viele Einträge ihr in diesem Browser noch nicht geöffnet habt.
- Beim Öffnen sind die neuen Einträge mit „Neu“ markiert. Danach verschwindet die Zahl; die Übersicht könnt ihr jederzeit wieder lesen.
- Die App merkt sich den Lesestand in diesem Browser. Er gilt gemeinsam für alle, die diesen Browser verwenden. Wenn die Browserdaten gelöscht werden, erscheinen die Einträge wieder als neu.

**Was müsst ihr tun?** Version 1.1.0 über **Jetzt aktualisieren** installieren und danach **Neu laden** wählen. Wer noch eine Fassung ohne Update-Funktion verwendet, übernimmt einmal die neuen Programmdateien. Kinderprofile und Einträge bleiben erhalten.

## Ergänzte Dokumentation — 14. Oktober 2026

- Diese Änderungsübersicht ist neu. Ihr könnt hier nachlesen, welche Funktionen hinzugekommen sind und was sich bei der Nutzung geändert hat.
- Die Anleitung auf der Startseite des GitHub-Repositories verlinkt jetzt direkt auf diese Übersicht.
- Für die weitere Pflege des Projekts ist festgehalten, dass zu jeder Änderung ein verständlicher Eintrag ergänzt werden soll.

**Was müsst ihr tun?** Für diese Ergänzung ist kein Update der App nötig.

## Version 1.0.0: Updates direkt im Tagebuch — 14. Oktober 2026

### Neu

- Beim Öffnen schaut das Tagebuch nach, ob eine neue Programmversion verfügbar ist. Ihr müsst dafür nicht selbst auf GitHub nachsehen.
- Wenn es ein Update gibt, könnt ihr **Jetzt aktualisieren** oder **Später** wählen. Ohne eure Bestätigung wird nichts installiert.
- Mit **Nach Updates suchen** könnt ihr die Prüfung jederzeit auf der Startseite wiederholen.
- Nach der Installation erscheint **Neu laden**. Damit startet ihr die neue Version; vorher speichert die App den aktuellen Stand.

### Eure Daten und fehlgeschlagene Updates

- Aktualisiert werden nur die Programmdateien. Kinderprofile, Tagebucheinträge, Bilder und Familieneinstellungen bleiben erhalten.
- Vor der Installation prüft die App, ob alle heruntergeladenen Dateien vollständig und unverändert angekommen sind.
- Die bisherigen Programmdateien werden gesichert. Geht beim Schreiben etwas schief, versucht die App, diese Dateien wiederherzustellen.
- Ohne Internet könnt ihr das Tagebuch weiter nutzen. Die Suche nach Updates lässt sich später erneut starten.

**Was müsst ihr tun?** Wenn ihr noch die ursprüngliche App verwendet, müsst ihr einmal die neue `Tagebuch.html` und den Ordner `app/` aus dem Repository übernehmen. Die vorhandenen Ordner `config/` und `kinder/` behalten. Erst diese neue Fassung enthält die Update-Funktion. Für spätere Updates verwendet ihr Chrome oder Edge und gebt den Programmordner zum Schreiben frei.

## Erste Bereitstellung im Repository — 14. Oktober 2026

- Die vorhandene Tagebuch-App wurde aus der hochgeladenen ZIP übernommen. Ihre Dateien liegen jetzt direkt im Repository.
- Die App bringt bereits mehrere Kinderprofile, PINs, Tagebucheinträge, Bilder, Rechtschreibprüfung, Lese- und Diktatübungen sowie Spiele und Belohnungen mit.
- Eine ausführliche Anleitung erklärt das Öffnen mit Chrome oder Edge, die Einrichtung der Kinderprofile, die Speicherung und das Sichern der Daten.
- Die Anleitung beschreibt auch, wann Text zur Online-Grammatikprüfung übertragen wird und wie die optionalen Handy-Benachrichtigungen funktionieren.
- Die Projektverwaltung schließt erzeugte Familien- und Kinderdaten aus, damit sie beim normalen Hinzufügen der Dateien nicht versehentlich auf GitHub landen.

**Was müsst ihr tun?** Für den ersten Start das Repository vollständig herunterladen und entpacken, `Tagebuch.html` öffnen und die Schritte in der [Anleitung](README.md#start-auf-dem-eigenen-pc) befolgen.
