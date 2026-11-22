# Testkorpus für deutsche Rechtschreib- und Grammatikprüfung

## 1. Zweck und Testbedingungen

Ein absichtlich misslungener Bericht über ein Vereinsfest, ergänzt um Protokollauszüge und mündlich formulierte Dialoge. Er enthält viele alltägliche Schreibfehler, Buchstabenauslassungen und -vertauschungen, lautnahe Schreibungen, Grammatikfehler, Fehler der Zeichensetzung, abweichende Eigennamen und Umgangssprache. Die künstlichen Schreibmuster sind keine diagnostische Beschreibung einer LRS.

**Umfang:** 60 nummerisch referenzierte Testeinheiten, 1051 durch Leerraum getrennte Wörter im Fehlertext und 252 einzeln dokumentierte Prüfstellen. Davon sind 226 Korrekturstellen, 10 Abweichungen von der Namensreferenz und 16 optionale Stilhinweise. Hinzu kommen 19 gesonderte Kontrollfälle.

**Zielvariante:** Standarddeutsch in Deutschland (`de-DE`). Die Schreibungen mit ß sind auf diese Zielvariante abgestimmt. Die Referenz orientiert sich am Amtlichen Regelwerk 2024; bei erweiterten zu-Infinitiven wird die verbindliche Kommaabtrennung berücksichtigt. [Regelgrundlage](https://www.rechtschreibrat.com/regeln-und-woerterverzeichnis/) und [vollständiges Regelwerk](https://www.rechtschreibrat.com/DOX/RfdR_Amtliches-Regelwerk_2024.pdf).

| Erwartung | Bedeutung für die Auswertung |
|---|---|
| Korrektur | Die markierte Stelle soll im vorgegebenen Kontext korrigiert werden. Inhalt und Bezugspersonen sollen erhalten bleiben. |
| Namensabgleich | Die Stelle weicht von der ausdrücklich vorgegebenen Namensliste ab. Nur mit dieser Referenz als erwarteten Treffer zählen; ohne Referenz keinen sicheren Namensfehler unterstellen. |
| Stilhinweis | Umgangssprache oder eine Registerfrage. Im Modus „Register erhalten“ nicht automatisch verändern; im Modus „Standardsprache“ die vorgeschlagene Normalisierung anbieten. |
| Beibehalten | Kontrollfall: keine zwingende Korrektur. Ein Fehlalarm oder eine sinnverändernde Korrektur soll bei der Auswertung sichtbar werden. |

Die Zählung bezieht sich auf **Prüfstellen, nicht auf einzelne verletzte Regeln**. Ein falsch geschriebener und zugleich falsch gebeugter Ausdruck kann eine gemeinsame Prüfstelle bilden. Bei einer Aufzählung können zwei fehlende Kommas in einer Tabellenzeile zusammengefasst sein. Gleichwertige, inhaltserhaltende Korrekturen sind zulässig; die Referenz ist keine Vorgabe für einen vollständigen Wortlautvergleich.

### Verbindliche Namensreferenz

Die folgenden Namen und Bezeichnungen sind für diesen Test frei festgelegt. Abweichungen davon können sonst ebenfalls legitime Personen- oder Firmennamen sein.

| Typ | Sollschreibung |
|---|---|
| Person | Léa Müller-Lüdenscheidt |
| Person | Derya Yılmaz |
| Person | McAllister |
| Person | van der Meer |
| Person | Anna-Lena Schulte |
| Person | Jörg Weiß |
| Person | O’Connor |
| Firma | Nordlicht & Söhne GmbH |
| Produkt | TeamWolke |
| Produkt | PlanPilot |

Weitere korrekt verwendete Vornamen sind Mia, Ben, Timo und Max. Die Zeichenfolgen `www.teamwolke.example`, `fest@teamwolke.example` und `00742` sind unverändert zu erhalten. Sie sind Testdaten, keine zu prüfenden Kontakt- oder Zugangsangaben.

## 2. Fehlerhafter Testtext

**Nur den folgenden Codeblock als Texteingabe verwenden.** Jede physische Zeile bildet eine Testeinheit: Zeile 1 entspricht S01, Zeile 2 S02 und so weiter bis S60. Eine Einheit kann direkte Rede oder mehrere Teilsätze enthalten. Die IDs gehören nicht zum Eingabetext. Tabellen, Namensliste und Referenzfassung nur dann an die Prüfsoftware übergeben, wenn ausdrücklich ein Test mit Zusatzkontext gewünscht ist.

```text
Gester morgen bin ich mit meine Schwester zum Vereinfest gefaren, obwohl ich eigendlich ausschlaffen wolte.
Die Einladunk lag seid eine Woche auf den Küchentisch und keiner hatte sie richtig gelessen.
Darin stand das alle Helfer pünktlig um acht uhr am Sport Plaz seien sollen.
Ich dachte dass das blos ein Scherz wahr weil die Feier doch erst am Nachmitag anfengt.
Im Flur suchte ich meine Schue, den roten Ruksack und dass Handy, dass unter eine Jake lag.
Meine Schwester hatte den Schlüsell verlegt und sagte das sie in bereits dreimal gesucht hat.
Auf dem Weg begegneten wir einen alten Nachbarn, der mit zwei Hunte vor dem Haus gewartet haben.
Der Bus kamm zu spet, deshalb mussten wir zu fus durch eine schmale Strasse lauffen.
Vor der Halle stehte ein Schild mit der Aufschrift: Herzlich wilkommen zum fünften Somerfest!
Die Tühr war noch zu, aber die anderen Helfer wartet schon ungeduldig neben den Eingank.
Zum aufbauen brauchten wir zwansig Tische, mehrere Stüle und ein sehr langen Verlängerungskabel.
Die Kabeltromel stand im Material Raum, dessen Türe wir wegen dem fehlenden Schlüssel nicht öffnen könnte.
Ben wollte die Kisten hohlen, obwol er garnicht wusste wo der Hausmeister gerade wahr.
Ich habe das kleine Packet aufgemacht und darin ein Blat, drei Bleistifte sowie eine kaputte Scherre gefunden.
Auf der Einkaufsliesste standen Tomaten Gurken Käse und Brot, aber kein einziger Getränk.
Also kaufte ich ein bischen Apfelsaft und viel zuviele Flaschen, weil mann ja nie weis wie durstig alle sind.
An der Kasse merckte ich dass ich meinen Geldbeutel vergessen hatte und musste wieder nachhause gehen.
Als ich zurück kahm waren die Helfer am essen und die ersten Gäste warteten bereits drausen.
Das Buffet sah interesant aus, nur die Erdberen waren matschig und der Salat schmeckte merkwürtig süs.
Die Brötchen waren härter wie gestern, und der Kuchen war der einzigste, den überhaupt jemand essen wollte.
Beim Getränke Stand verkaufte Timo drei Kaffee’s, zwei Tee’s und eine Flasche Mineral Wasser.
Neben dem Stand läufte ein Junge herumm, dessen Händy ständig klingelte und wo niemand kannte.
Er fragte nach den Wlan Passwort, weil sein Tablett keine Verbindunk zu unsere Anlage bekahm.
Die Musik wahr sehr laut, trotzdem hörte mann jedes wort dass der Moderator ins Mikrofon schrie.
Plözlich fihl der Strom aus, und sämtliche Lapen gingen gleichzeitig aus obwohl die Sicherung noch drinn war.
Nach dem wir die falsche Steck Dose ausgetauscht hatten, funktionirte alles wider und die Musik spielte weiter.
Die manschaft vom Nachbarort gewann das Tunier, obwohl ihre Trikots viel zu gross und die Schuhe zimlich alt waren.
Beim letzten Spiel schoss ein Spieler den Bal durch das offene Fesnter, worauf der Schitzrichter laut pfiff.
Zum glük wurde keiner verlezt, aber der Hausmeister beschwerte sich lautstark über die kapute Scheibe.
Wir gaben ihm das Versprechen den Schaden zubezahlen und baten ihn darum uns noch eine Schangs zu geben.
Die beiden Helfer trägt die schweren Kisten in den Halle, weil der Lieferwagen wartet schon seit einer Stunde vor dem Tor.
Ben erzählt Mia das er seid gestern auf eine Antwort des Vereinsvorsitzenden warten und deshalb keine weiteren Getränke bestellt hat.
Die Frau den am Eingang steht, verkauft die Eintrittskarten und geben jedem Besucher einen Plan damit alle die Stände findet.
Nachdem Timo die Bühne aufbauen hatte, gingen die Musiker gestern auf die Bretter und spielte sofort ein Lied für dem Publikum.
„Habt ihr die Mikrofone getestet“, fragt Mia, worauf Ben antwortet „Wir haben sie vor zehn Minuten angeschließt, aber eines funktioniert nicht.“
Liebe Gäste wir freuen uns das ihr heute so zahlreich gekommen ist, und wünschen euch einen schönen Tag auf unserem Vereinsfest.
Der Mann mit den roten Jacke, verteilt vor der Bühne die Lose obwohl niemand weiß wie viele Gewinne überhaupt vorhanden ist.
Die Tombola beginnt erst wenn alle Kinder zurück sind aber Timo ruft die erste Nummer auf, bevor die Helfer schließen den Lostopf.
Mia erinnert Ben auf den fehlenden Schlüssel, den er gestern zu Hause liegen gelassen haben und jetzt dringend für das Lager brauchen.
Wider stehen die Kuchen neben den Lautsprecher, obwohl Mia erklärt hat dass die Sahne dort wegen der warmen Lampen schnell verderben.
Das kleine Kind, dessen Eltern wir vorhin geholfen haben, sucht sein roten Rucksack und fragt ob jemand ihm unter der Bank gesehen hat.
Die Liste mit den Bestellungen liegen neben der Kasse und enthalten mehr Einträge als wir erwartet hat, deshalb fehlen am Ende Getränke.
Ben konnte die Rechnung nicht bezahlen weil er hatte seine Geldbörse vergessen, und Mia gab ihm das Geld, um den Betrag sofort überweisen.
Obwohl es bereits dunkel geworden war mussten die letzte Besucher noch warten, denn der Busfahrer wusste nicht wo er die Gruppe abholen sollen.
Als alle gegangen waren sagte Timo: „Das nächste Fest wird bestimmt ruhiger“ aber Mia bezweifelte dass wir bis dahin genug Helfer findet.
Ben fragte: „Weisste, hassse mal nen Stift, damit ich dat Formular ebend ausfüllen kann?“
Mia sagte: „Ick hab keenen Zettel mehr, und det find ick doof.“
Timo rief: „Kommse ma rüber, dat kriegen wa schon hin, is doch allet halb so wild!“
Im Protokol schrieb Leea Müler-Lüdenscheid das der Sponsor Nordlicht und Söne GmbH alle Kossten übernimmt.
Derya Yilmaz schickte die E Mail an Herrn van der Mehr und vergass den Anhang mit zu schicken.
Mc Allister öffnete die Datei in Teamwolke, aber der Plan-Pilot Export war unvollstendig und lies sich nicht speichern.
Die Einträge für Anna Lena Schulte, Jörg Weiß und O’Conner waren dopelt vorhanden, obwohl jeder nur einmal angemelt war.
Auf dem Plkat stand www.teamwolke.example, doch die Adresse fest@teamwolke.example wurde von den Program als Feler markiert.
In der Liste stand die die Anmelde Numemr 00742 zweimal, und niemant wusste wer sie zuletzt geendert hatte.
Ich freue auf das nächste Fest, aber ohne besser Plan und ohne zusätzliche Helfer werde das bestimt wieder Chaos.
Bie Kinder haben geholft die Schtühle wegzutragen, und ein kleiner Fogel saß ungestört auf dem Zaun.
Zum Schluß tranken wir Waßer mit Zitrone und assen süsse Kekse, weil der Abbau lange gedauert hatt.
Danach haben wir nach Hause gegangen, denn unsere Beine schmerzten und wir hatte überhaupt keine Krafft mehr.
Zu Hause schrieb ich den bericht fertig,weil ich ihn noch abschiken wollte ,, bevor ich eingeschlaffen bin.
Falls ihr noch Fragen habt meldet euch bitte bis freitag bei mir, ich beantworte sie gern und schike euch dann dass endgüldige Protokoll
```

## 3. Vollständige Fehlertabelle

Original und Soll beziehen sich auf die jeweilige Zeile des unveränderten Fehlertexts. Bei Kommaergänzungen dient häufig das benachbarte Wort als eindeutig auffindbarer Anker, zum Beispiel `dachte` → `dachte,`. Die kurze Begründung erläutert die eigentliche Änderung. Ein Leerzeichen am Anfang einer zitierten Stelle ist Bestandteil des Ausschnitts.

### S01–S10

| ID | Einheit | Originalstelle | Soll / Vorschlag | Fehlertyp | Erwartung | Begründung |
|---|---|---|---|---|---|---|
| F001 | S01 | `Gester` | `Gestern` | Buchstabenauslassung | Korrektur | Das abschließende n fehlt. |
| F002 | S01 | `morgen` | `Morgen` | Groß-/Kleinschreibung | Korrektur | Substantiv in der Zeitangabe gestern Morgen. |
| F003 | S01 | `meine` | `meiner` | Kasus | Korrektur | Mit verlangt hier den Dativ. |
| F004 | S01 | `Vereinfest` | `Vereinsfest` | Fugenlaut | Korrektur | Das Fugen-s fehlt. |
| F005 | S01 | `gefaren` | `gefahren` | Dehnungs-h | Korrektur | Das h fehlt. |
| F006 | S01 | `eigendlich` | `eigentlich` | Konsonantenverwechslung | Korrektur | t statt d. |
| F007 | S01 | `ausschlaffen` | `ausschlafen` | Konsonantenverdopplung | Korrektur | Überflüssiges f. |
| F008 | S01 | `wolte` | `wollte` | Konsonantenverdopplung | Korrektur | Das zweite l fehlt. |
| F009 | S02 | `Einladunk` | `Einladung` | Lautnahe Schreibung | Korrektur | Die Endung wird -ung geschrieben. |
| F010 | S02 | `seid` | `seit` | Wortverwechslung | Korrektur | Zeitangabe: seit, nicht die Verbform seid. |
| F011 | S02 | `eine Woche` | `einer Woche` | Kasus | Korrektur | Dativ nach seit. |
| F012 | S02 | `den Küchentisch` | `dem Küchentisch` | Kasus | Korrektur | Wo lag sie? Dativ bei Ortsangabe. |
| F013 | S02 | `gelessen` | `gelesen` | Konsonantenverdopplung | Korrektur | Nur ein s. |
| F014 | S03 | `stand` | `stand,` | Komma: Nebensatz | Korrektur | Komma vor dem dass-Satz. |
| F015 | S03 | `das` | `dass` | das/dass | Korrektur | Konjunktion zur Einleitung des Nebensatzes. |
| F016 | S03 | `pünktlig` | `pünktlich` | Lautnahe Schreibung | Korrektur | Die Endung lautet -lich. |
| F017 | S03 | `uhr` | `Uhr` | Groß-/Kleinschreibung | Korrektur | Substantiv. |
| F018 | S03 | `Sport Plaz` | `Sportplatz` | Zusammenschreibung und tz | Korrektur | Zusammengesetztes Substantiv; Platz mit tz. |
| F019 | S03 | `seien` | `sein` | Verbform | Korrektur | Nach sollen steht hier der Infinitiv sein. |
| F020 | S04 | `dachte` | `dachte,` | Komma: Nebensatz | Korrektur | Komma vor dass. |
| F021 | S04 | `blos` | `bloß` | s/ss/ß | Korrektur | Standarddeutsch in Deutschland: bloß. |
| F022 | S04 | `wahr` | `war` | Wortverwechslung | Korrektur | Gemeint ist die Vergangenheitsform von sein. |
| F023 | S04 | ` weil` | `, weil` | Komma: Nebensatz | Korrektur | Komma vor weil. |
| F024 | S04 | `Nachmitag` | `Nachmittag` | Konsonantenverdopplung | Korrektur | Zweites t fehlt. |
| F025 | S04 | `anfengt` | `anfängt` | Umlaut/Stammprinzip | Korrektur | Umlaut in der Verbform anfängt. |
| F026 | S05 | `Schue` | `Schuhe` | Dehnungs-h | Korrektur | h fehlt. |
| F027 | S05 | `Ruksack` | `Rucksack` | ck-Schreibung | Korrektur | Rucksack mit ck. |
| F028 | S05 | `dass Handy` | `das Handy` | das/dass | Korrektur | Artikel vor Handy. |
| F029 | S05 | `dass unter` | `das unter` | das/dass | Korrektur | Relativpronomen mit Bezug auf Handy. |
| F030 | S05 | `eine Jake` | `einer Jacke` | Kasus und ck-Schreibung | Korrektur | Dativ nach unter bei Ortsangabe; Jacke mit ck. |
| F031 | S06 | `Schlüsell` | `Schlüssel` | Buchstabenfolge | Korrektur | Falsche Verteilung von s und l. |
| F032 | S06 | `sagte` | `sagte,` | Komma: Nebensatz | Korrektur | Komma vor dass. |
| F033 | S06 | `das` | `dass` | das/dass | Korrektur | Konjunktion. |
| F034 | S06 | `in bereits` | `ihn bereits` | Wortverwechslung | Korrektur | Gemeint ist das Pronomen ihn. |
| F035 | S07 | `einen alten Nachbarn` | `einem alten Nachbarn` | Kasus | Korrektur | Begegnen verlangt den Dativ. |
| F036 | S07 | `Hunte` | `Hunden` | Konsonantenverwechslung und Flexion | Korrektur | Hund mit d; Dativ Plural Hunden. |
| F037 | S07 | `haben` | `hatte` | Subjekt-Verb-Kongruenz | Korrektur | Singular erforderlich. Die Referenz wählt hatte; hat ist ebenfalls grammatisch zulässig. |
| F038 | S08 | `kamm` | `kam` | Konsonantenverdopplung | Korrektur | Überflüssiges m. |
| F039 | S08 | `spet` | `spät` | Umlaut/Stammprinzip | Korrektur | ä statt e. |
| F040 | S08 | `fus` | `Fuß` | Großschreibung und ß | Korrektur | Substantiv in zu Fuß; ß bei de-DE. |
| F041 | S08 | `Strasse` | `Straße` | s/ss/ß | Korrektur | Zielsprache de-DE; in de-CH wäre ss zulässig. |
| F042 | S08 | `lauffen` | `laufen` | Konsonantenverdopplung | Korrektur | Überflüssiges f. |
| F043 | S09 | `stehte` | `stand` | Unregelmäßige Verbform | Korrektur | Präteritum von stehen. |
| F044 | S09 | `wilkommen` | `willkommen` | Konsonantenverdopplung | Korrektur | Zweites l fehlt. |
| F045 | S09 | `Somerfest` | `Sommerfest` | Konsonantenverdopplung | Korrektur | Zweites m fehlt. |
| F046 | S10 | `Tühr` | `Tür` | Dehnungs-h | Korrektur | Überflüssiges h. |
| F047 | S10 | `wartet` | `warteten` | Kongruenz und Tempus | Korrektur | Plural im Präteritum passend zum Bericht. |
| F048 | S10 | `den Eingank` | `dem Eingang` | Kasus und Konsonantenverwechslung | Korrektur | Dativ bei Ortsangabe; Eingang mit g. |

### S11–S20

| ID | Einheit | Originalstelle | Soll / Vorschlag | Fehlertyp | Erwartung | Begründung |
|---|---|---|---|---|---|---|
| F049 | S11 | `aufbauen` | `Aufbauen` | Substantivierter Infinitiv | Korrektur | Groß nach zum. |
| F050 | S11 | `zwansig` | `zwanzig` | Lautnahe Schreibung | Korrektur | z statt s. |
| F051 | S11 | `Stüle` | `Stühle` | Dehnungs-h | Korrektur | h fehlt. |
| F052 | S11 | `ein sehr langen` | `ein sehr langes` | Adjektivflexion | Korrektur | Neutrum: das Verlängerungskabel. |
| F053 | S12 | `Kabeltromel` | `Kabeltrommel` | Konsonantenverdopplung | Korrektur | Zweites m fehlt. |
| F054 | S12 | `Material Raum` | `Materialraum` | Zusammenschreibung | Korrektur | Zusammengesetztes Substantiv. |
| F055 | S12 | `wegen dem fehlenden Schlüssel` | `wegen des fehlenden Schlüssels` | Register: Kasus nach wegen | Stilhinweis | Standardsprachliche Referenz mit Genitiv; Dativ als Registerfall separat bewerten. |
| F056 | S12 | `könnte` | `konnten` | Kongruenz und Verbmodus | Korrektur | Indikativ Präteritum, 1. Person Plural. |
| F057 | S13 | `hohlen` | `holen` | Wortverwechslung | Korrektur | Gemeint ist das Verb holen. |
| F058 | S13 | `obwol` | `obwohl` | Buchstabenauslassung | Korrektur | h fehlt. |
| F059 | S13 | `garnicht` | `gar nicht` | Getrenntschreibung | Korrektur | Gar nicht wird getrennt geschrieben. |
| F060 | S13 | `wusste` | `wusste,` | Komma: indirekter Fragesatz | Korrektur | Komma vor wo. |
| F061 | S13 | `wahr` | `war` | Wortverwechslung | Korrektur | Verbform war. |
| F062 | S14 | `Packet` | `Paket` | Fremdwortschreibung | Korrektur | Paket ohne c. |
| F063 | S14 | `Blat` | `Blatt` | Konsonantenverdopplung | Korrektur | Zweites t fehlt. |
| F064 | S14 | `Scherre` | `Schere` | Konsonantenverdopplung | Korrektur | Überflüssiges r. |
| F065 | S15 | `Einkaufsliesste` | `Einkaufsliste` | Vokallänge und Verdopplung | Korrektur | Liste mit i und einem s. |
| F066 | S15 | `Tomaten Gurken Käse` | `Tomaten, Gurken, Käse` | Komma: Aufzählung | Korrektur | Zwei fehlende Aufzählungskommas; als eine Prüfstelle erfasst. |
| F067 | S15 | `kein einziger` | `kein einziges` | Genus und Adjektivflexion | Korrektur | Getränk ist Neutrum. |
| F068 | S16 | `bischen` | `bisschen` | Konsonantenverdopplung | Korrektur | Zweites s fehlt. |
| F069 | S16 | `zuviele` | `zu viele` | Getrenntschreibung | Korrektur | Gradpartikel zu und viele getrennt. |
| F070 | S16 | `mann` | `man` | Wortverwechslung | Korrektur | Indefinitpronomen man, nicht das Substantiv Mann. |
| F071 | S16 | `weis` | `weiß` | s/ss/ß | Korrektur | Verbform weiß. |
| F072 | S16 | ` wie durstig` | `, wie durstig` | Komma: indirekter Fragesatz | Korrektur | Komma vor wie. |
| F073 | S17 | `merckte` | `merkte` | ck-Schreibung | Korrektur | Kein c vor k nach r. |
| F074 | S17 | `ich dass` | `ich, dass` | Komma: Nebensatz | Korrektur | Komma vor dass. |
| F075 | S17 | `hatte` | `hatte,` | Komma: schließendes Nebensatzkomma | Korrektur | Den dass-Satz vor dem fortgesetzten Hauptsatz und musste abschließen; nachhause bleibt zulässig. |
| F076 | S18 | `zurück kahm` | `zurückkam` | Zusammenschreibung und Dehnungs-h | Korrektur | Verb zurückkommen im Nebensatz zusammenschreiben; kam ohne h. |
| F077 | S18 | ` waren` | `, waren` | Komma: vorangestellter Nebensatz | Korrektur | Komma nach kam. |
| F078 | S18 | `essen` | `Essen` | Substantivierter Infinitiv | Korrektur | Substantivierung nach am. |
| F079 | S18 | `drausen` | `draußen` | s/ss/ß | Korrektur | Außen/draußen mit ß. |
| F080 | S19 | `interesant` | `interessant` | Konsonantenverdopplung | Korrektur | Zweites s fehlt. |
| F081 | S19 | `Erdberen` | `Erdbeeren` | Vokalverdopplung | Korrektur | Beere mit ee. |
| F082 | S19 | `merkwürtig` | `merkwürdig` | Konsonantenverwechslung | Korrektur | Würdig mit d. |
| F083 | S19 | `süs` | `süß` | s/ss/ß | Korrektur | Süß mit ß. |
| F084 | S20 | `wie gestern` | `als gestern` | Vergleichskonstruktion | Korrektur | Nach dem Komparativ härter steht als. |
| F085 | S20 | `einzigste` | `einzige` | Unzulässige Steigerung | Korrektur | Standardsprachlich keine Steigerung von einzig. |

### S21–S30

| ID | Einheit | Originalstelle | Soll / Vorschlag | Fehlertyp | Erwartung | Begründung |
|---|---|---|---|---|---|---|
| F086 | S21 | `Getränke Stand` | `Getränkestand` | Zusammenschreibung | Korrektur | Zusammengesetztes Substantiv. |
| F087 | S21 | `Kaffee’s` | `Kaffees` | Apostroph: Plural | Korrektur | Kein Apostroph vor Plural-s. |
| F088 | S21 | `Tee’s` | `Tees` | Apostroph: Plural | Korrektur | Kein Apostroph vor Plural-s. |
| F089 | S21 | `Mineral Wasser` | `Mineralwasser` | Zusammenschreibung | Korrektur | Zusammengesetztes Substantiv. |
| F090 | S22 | `läufte` | `lief` | Unregelmäßige Verbform | Korrektur | Präteritum von laufen. |
| F091 | S22 | `herumm` | `herum` | Konsonantenverdopplung | Korrektur | Überflüssiges m. |
| F092 | S22 | `Händy` | `Handy` | Fremdwortschreibung | Korrektur | Handy ohne Umlaut. |
| F093 | S22 | `wo niemand` | `den niemand` | Relativpronomen | Korrektur | Akkusativ mit Bezug auf Junge. |
| F094 | S23 | `den Wlan Passwort` | `dem WLAN-Passwort` | Kasus und Abkürzungskompositum | Korrektur | Dativ nach nach; WLAN groß und mit Bindestrich im Kompositum. |
| F095 | S23 | `Tablett` | `Tablet` | Kontext: Realwortfehler | Korrektur | Gemeint ist das elektronische Gerät, kein Serviertablett. |
| F096 | S23 | `Verbindunk` | `Verbindung` | Lautnahe Schreibung | Korrektur | Endung -ung. |
| F097 | S23 | `unsere Anlage` | `unserer Anlage` | Kasus | Korrektur | Dativ nach zu. |
| F098 | S23 | `bekahm` | `bekam` | Dehnungs-h | Korrektur | Überflüssiges h. |
| F099 | S24 | `wahr` | `war` | Wortverwechslung | Korrektur | Verbform war. |
| F100 | S24 | `mann` | `man` | Wortverwechslung | Korrektur | Indefinitpronomen man. |
| F101 | S24 | `wort` | `Wort,` | Großschreibung und Relativsatzkomma | Korrektur | Substantiv; Komma vor dem anschließenden Relativsatz. |
| F102 | S24 | `dass` | `das` | das/dass | Korrektur | Relativpronomen mit Bezug auf Wort. |
| F103 | S25 | `Plözlich` | `Plötzlich` | Buchstabenauslassung | Korrektur | t fehlt. |
| F104 | S25 | `fihl` | `fiel` | ie-Schreibung | Korrektur | Fiel mit ie statt ih. |
| F105 | S25 | `Lapen` | `Lampen` | Buchstabenauslassung | Korrektur | m fehlt. |
| F106 | S25 | ` obwohl` | `, obwohl` | Komma: Nebensatz | Korrektur | Komma vor obwohl. |
| F107 | S25 | `drinn` | `drin` | Konsonantenverdopplung | Korrektur | Überflüssiges n; die umgangssprachliche Form drin bleibt erhalten. |
| F108 | S26 | `Nach dem` | `Nachdem` | Getrennt-/Zusammenschreibung | Korrektur | Hier Konjunktion nachdem. |
| F109 | S26 | `Steck Dose` | `Steckdose` | Zusammenschreibung | Korrektur | Zusammengesetztes Substantiv. |
| F110 | S26 | `funktionirte` | `funktionierte` | ie-Schreibung | Korrektur | -ieren mit ie. |
| F111 | S26 | `wider` | `wieder` | Wortverwechslung | Korrektur | Erneut: wieder mit ie. |
| F112 | S27 | `manschaft` | `Mannschaft` | Großschreibung und Verdopplung | Korrektur | Substantiv; doppeltes n. |
| F113 | S27 | `Tunier` | `Turnier` | Buchstabenauslassung | Korrektur | r fehlt. |
| F114 | S27 | `gross` | `groß` | s/ss/ß | Korrektur | Zielsprache de-DE. |
| F115 | S27 | `zimlich` | `ziemlich` | ie-Schreibung | Korrektur | Ziemlich mit ie. |
| F116 | S28 | `Bal` | `Ball` | Konsonantenverdopplung | Korrektur | Zweites l fehlt. |
| F117 | S28 | `Fesnter` | `Fenster` | Buchstabenvertauschung | Korrektur | n und s vertauscht. |
| F118 | S28 | `Schitzrichter` | `Schiedsrichter` | Lautnahe Schreibung | Korrektur | Mehrere Laut-Buchstaben-Zuordnungen und der Wortstamm sind betroffen. |
| F119 | S29 | `glük` | `Glück` | Großschreibung und ck | Korrektur | Substantiv Glück mit ck. |
| F120 | S29 | `verlezt` | `verletzt` | tz-Schreibung | Korrektur | t fehlt. |
| F121 | S29 | `kapute` | `kaputte` | Konsonantenverdopplung | Korrektur | Zweites t fehlt. |
| F122 | S30 | `Versprechen` | `Versprechen,` | Komma: Infinitivgruppe | Korrektur | Komma vor der vom Substantiv Versprechen abhängigen Infinitivgruppe. |
| F123 | S30 | `zubezahlen` | `zu bezahlen` | Getrenntschreibung | Korrektur | Zu beim nicht trennbaren Verb bezahlen getrennt. |
| F124 | S30 | ` und baten` | `, und baten` | Komma: schließendes Infinitivgruppenkomma | Korrektur | Die Infinitivgruppe vor der Fortsetzung des Hauptsatzes abschließen. |
| F125 | S30 | `darum` | `darum,` | Komma: Infinitivgruppe | Korrektur | Komma nach dem Verweiswort darum. |
| F126 | S30 | `Schangs` | `Chance` | Lautnahe Fremdwortschreibung | Korrektur | Standardform Chance. |

### S31–S40

| ID | Einheit | Originalstelle | Soll / Vorschlag | Fehlertyp | Erwartung | Begründung |
|---|---|---|---|---|---|---|
| F127 | S31 | `trägt` | `tragen` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „die beiden Helfer“ verlangt den Plural. |
| F128 | S31 | `den Halle` | `die Halle` | Grammatik: Genus und Artikel | Korrektur | Bei einer Bewegung in die feminine Halle steht „in die Halle“. |
| F129 | S31 | `wartet schon seit einer Stunde vor dem Tor` | `schon seit einer Stunde vor dem Tor wartet` | Grammatik: Verbendstellung | Korrektur | Im eingeleiteten weil-Nebensatz steht das finite Verb am Ende. |
| F130 | S32 | `Mia` | `Mia,` | Interpunktion: fehlendes Nebensatzkomma | Korrektur | Komma vor dem folgenden dass-Satz ergänzen. |
| F131 | S32 | `das` | `dass` | Rechtschreibung im Kontext: das/dass | Korrektur | Hier wird die Konjunktion „dass“ benötigt. |
| F132 | S32 | `seid` | `seit` | Rechtschreibung im Kontext: seit/seid | Korrektur | „Seit gestern“ bezeichnet einen Zeitraum. |
| F133 | S32 | `warten` | `wartet` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „er“ verlangt die dritte Person Singular. |
| F134 | S33 | `Frau` | `Frau,` | Interpunktion: fehlendes Relativsatzkomma | Korrektur | Das öffnende Komma des eingeschobenen Relativsatzes fehlt. |
| F135 | S33 | `den` | `die` | Grammatik: Relativpronomen | Korrektur | Das Relativpronomen bezieht sich auf „die Frau“ und ist Subjekt des Relativsatzes. |
| F136 | S33 | `geben` | `gibt` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „die Frau“ verlangt die dritte Person Singular. |
| F137 | S33 | `Plan` | `Plan,` | Interpunktion: fehlendes Nebensatzkomma | Korrektur | Komma vor dem damit-Satz ergänzen. |
| F138 | S33 | `findet` | `finden` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „alle“ verlangt den Plural. |
| F139 | S34 | `aufbauen hatte` | `aufgebaut hatte` | Grammatik: Bildung des Plusquamperfekts | Korrektur | Die zusammengesetzte Vergangenheitsform verlangt das Partizip II. |
| F140 | S34 | `spielte` | `spielten` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „die Musiker“ verlangt den Plural. |
| F141 | S34 | `dem Publikum` | `das Publikum` | Grammatik: Kasus nach Präposition | Korrektur | „Für“ verlangt den Akkusativ. |
| F142 | S35 | `getestet“,` | `getestet?“,` | Interpunktion: Fragezeichen in direkter Rede | Korrektur | Das Fragezeichen gehört vor das schließende Anführungszeichen; das folgende Komma bleibt erhalten. |
| F143 | S35 | `antwortet` | `antwortet:` | Interpunktion: Doppelpunkt vor direkter Rede | Korrektur | Der vorangestellte Begleitsatz wird mit einem Doppelpunkt abgeschlossen. |
| F144 | S35 | `angeschließt` | `angeschlossen` | Grammatik: unregelmäßiges Partizip | Korrektur | Das Partizip II von „anschließen“ lautet „angeschlossen“. |
| F145 | S36 | `Gäste` | `Gäste,` | Interpunktion: Anredekomma | Korrektur | Die Anrede wird durch ein Komma abgetrennt. |
| F146 | S36 | `uns` | `uns,` | Interpunktion: fehlendes Nebensatzkomma | Korrektur | Das Komma vor dem dass-Satz fehlt. |
| F147 | S36 | `das` | `dass` | Rechtschreibung im Kontext: das/dass | Korrektur | Hier wird die Konjunktion „dass“ benötigt. |
| F148 | S36 | `ist` | `seid` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „ihr“ verlangt „seid“. |
| F149 | S37 | `den roten` | `der roten` | Grammatik: Kasus und Artikel | Korrektur | „Mit“ verlangt den Dativ; feminine Einzahl: „mit der roten Jacke“. |
| F150 | S37 | `Jacke,` | `Jacke` | Interpunktion: überflüssiges Komma | Korrektur | Zwischen dem vollständigen Subjekt und seinem Prädikat steht hier kein Komma. |
| F151 | S37 | `Lose` | `Lose,` | Interpunktion: fehlendes Nebensatzkomma | Korrektur | Komma vor dem obwohl-Satz ergänzen. |
| F152 | S37 | `weiß` | `weiß,` | Interpunktion: indirekter Fragesatz | Korrektur | Der mit „wie“ eingeleitete Nebensatz wird abgetrennt. |
| F153 | S37 | `ist` | `sind` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „viele Gewinne“ verlangt den Plural. |
| F154 | S38 | `erst` | `erst,` | Interpunktion: fehlendes Nebensatzkomma | Korrektur | Das öffnende Komma vor dem wenn-Satz fehlt. |
| F155 | S38 | `sind aber` | `sind, aber` | Interpunktion: fehlendes schließendes Nebensatzkomma | Korrektur | Der wenn-Satz muss vor „aber“ geschlossen werden. |
| F156 | S38 | `schließen den Lostopf` | `den Lostopf schließen` | Grammatik: Verbendstellung | Korrektur | Im bevor-Nebensatz steht das finite Verb am Ende. |
| F157 | S39 | `auf` | `an` | Grammatik: feste Präposition | Korrektur | Die Konstruktion lautet „jemanden an etwas erinnern“. |
| F158 | S39 | `haben` | `hat` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „er“ verlangt „hat“. |
| F159 | S39 | `brauchen` | `braucht` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „er“ verlangt „braucht“. |
| F160 | S40 | `Wider` | `Wieder` | Rechtschreibung im Kontext: wider/wieder | Korrektur | Gemeint ist „erneut“, also „wieder“. |
| F161 | S40 | `den Lautsprecher` | `dem Lautsprecher` | Grammatik: Kasus bei Ortsangabe | Korrektur | Die Ortsangabe zu „stehen“ verlangt hier den Dativ; die Referenz nimmt einen einzelnen Lautsprecher an. |
| F162 | S40 | `hat` | `hat,` | Interpunktion: fehlendes Nebensatzkomma | Korrektur | Das Komma vor dem dass-Satz fehlt. |
| F163 | S40 | `verderben` | `verdirbt` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „die Sahne“ verlangt die dritte Person Singular. |

### S41–S50

| ID | Einheit | Originalstelle | Soll / Vorschlag | Fehlertyp | Erwartung | Begründung |
|---|---|---|---|---|---|---|
| F164 | S41 | `sein roten` | `seinen roten` | Grammatik: Flexion des Possessivartikels | Korrektur | Der gesuchte Rucksack ist ein maskulines Akkusativobjekt. |
| F165 | S41 | `fragt` | `fragt,` | Interpunktion: indirekter Fragesatz | Korrektur | Der mit „ob“ eingeleitete Nebensatz wird durch ein Komma abgetrennt. |
| F166 | S41 | `ihm` | `ihn` | Grammatik: Pronomen im Akkusativ | Korrektur | „Sehen“ verlangt für den gesehenen Rucksack ein Akkusativobjekt. |
| F167 | S42 | `liegen` | `liegt` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt ist die einzelne „Liste“, nicht die Bestellungen. |
| F168 | S42 | `enthalten` | `enthält` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Auch dieses Verb bezieht sich auf die einzelne Liste. |
| F169 | S42 | `Einträge` | `Einträge,` | Interpunktion: Vergleichssatz | Korrektur | Der Vergleich enthält einen vollständigen Nebensatz mit finitem Verb und benötigt ein Komma. |
| F170 | S42 | `hat` | `haben` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „wir“ verlangt „haben“. |
| F171 | S43 | `bezahlen` | `bezahlen,` | Interpunktion: fehlendes Nebensatzkomma | Korrektur | Das Komma vor dem weil-Satz fehlt. |
| F172 | S43 | `hatte seine Geldbörse vergessen` | `seine Geldbörse vergessen hatte` | Grammatik: Verbendstellung | Korrektur | Im weil-Nebensatz steht das finite Hilfsverb am Ende. |
| F173 | S43 | `überweisen` | `zu überweisen` | Grammatik: fehlendes zu im Infinitiv | Korrektur | Die Zweckangabe mit „um“ verlangt „zu“ und einen Infinitiv. |
| F174 | S44 | `war` | `war,` | Interpunktion: vorangestellter Nebensatz | Korrektur | Der obwohl-Satz wird vor dem Hauptsatz durch ein Komma abgeschlossen. |
| F175 | S44 | `letzte` | `letzten` | Grammatik: Adjektivdeklination | Korrektur | Nach dem bestimmten Artikel im Plural lautet die Form „die letzten Besucher“. |
| F176 | S44 | `nicht` | `nicht,` | Interpunktion: indirekter Fragesatz | Korrektur | Der mit „wo“ eingeleitete Nebensatz wird abgetrennt. |
| F177 | S44 | `sollen` | `sollte` | Grammatik: finite Verbform | Korrektur | Der Nebensatz benötigt eine zu „er“ passende finite Form; die Referenz bleibt im Präteritum. |
| F178 | S45 | `waren` | `waren,` | Interpunktion: vorangestellter Nebensatz | Korrektur | Der als-Satz wird vor dem Hauptsatz durch ein Komma abgeschlossen. |
| F179 | S45 | `ruhiger“` | `ruhiger“,` | Interpunktion: Komma vor aber | Korrektur | Die mit „aber“ angeschlossene Hauptsatzverbindung benötigt hier ein Komma nach dem schließenden Anführungszeichen. |
| F180 | S45 | `bezweifelte` | `bezweifelte,` | Interpunktion: fehlendes Nebensatzkomma | Korrektur | Das Komma vor dem dass-Satz fehlt. |
| F181 | S45 | `findet` | `finden` | Grammatik: Subjekt-Verb-Kongruenz | Korrektur | Das Subjekt „wir“ verlangt „finden“. |
| F182 | S46 | `Weisste` | `Weißt du` | Umgangssprache: Lautverschmelzung | Stilhinweis | Standardisierung ist ein eigener Modus; die mündliche Figurenstimme darf erhalten bleiben. |
| F183 | S46 | `hassse mal` | `hast du mal` | Umgangssprache: Lautverschmelzung | Stilhinweis | Die Bedeutung ist durch die folgende Frage nach einem Stift festgelegt. |
| F184 | S46 | `nen Stift` | `einen Stift` | Umgangssprache: verkürzter Artikel | Stilhinweis | Akkusativ eines maskulinen Substantivs. |
| F185 | S46 | `dat` | `das` | Umgangssprache: regionale Form | Stilhinweis | Regionale Form in bewusst mündlicher direkter Rede. |
| F186 | S46 | `ebend` | `eben` | Umgangssprache: regionale Form | Stilhinweis | Optionale Übertragung in Standardsprache. |
| F187 | S47 | `Ick hab` | `Ich habe` | Umgangssprache: Pronomen und Verbverkürzung | Stilhinweis | Optionale Standardisierung der Figurenrede. |
| F188 | S47 | `keenen` | `keinen` | Umgangssprache: regionale Lautung | Stilhinweis | Optionale Standardisierung. |
| F189 | S47 | `det` | `das` | Umgangssprache: regionale Form | Stilhinweis | Optionale Standardisierung. |
| F190 | S47 | `find ick` | `finde ich` | Umgangssprache: Verbverkürzung und Pronomen | Stilhinweis | Optionale Standardisierung; doof bleibt als zulässiges Wort stehen. |
| F191 | S48 | `Kommse` | `Kommen Sie` | Umgangssprache: Anredeverschmelzung | Stilhinweis | Die Referenz deutet die Anrede hier als höfliches Sie. |
| F192 | S48 | `ma rüber` | `mal herüber` | Umgangssprache: verkürzte Wörter | Stilhinweis | Optionale Standardisierung. |
| F193 | S48 | `dat` | `das` | Umgangssprache: regionale Form | Stilhinweis | Optionale Standardisierung. |
| F194 | S48 | `wa schon` | `wir schon` | Umgangssprache: Pronomen | Stilhinweis | Hier ist wir gemeint. |
| F195 | S48 | `is doch` | `das ist doch` | Umgangssprache: Ellipse und Verbverkürzung | Stilhinweis | Subjekt und vollständige Verbform für die Standardfassung ergänzen. |
| F196 | S48 | `allet` | `alles` | Umgangssprache: regionale Form | Stilhinweis | Optionale Standardisierung. |
| F197 | S49 | `Protokol` | `Protokoll` | Konsonantenverdopplung | Korrektur | Zweites l fehlt. |
| F198 | S49 | `Leea` | `Léa` | Eigenname: Vorname | Namensabgleich | Korrektur nur mit der festgelegten Namensreferenz. |
| F199 | S49 | `Müler-Lüdenscheid` | `Müller-Lüdenscheidt` | Eigenname: Nachname | Namensabgleich | l und abschließendes t fehlen gegenüber der Namensreferenz. |
| F200 | S49 | ` das` | `, dass` | Komma und das/dass | Korrektur | Nebensatzkomma und Konjunktion ergänzen. |
| F201 | S49 | `Nordlicht und Söne GmbH` | `Nordlicht & Söhne GmbH` | Eigenname: Firmenname | Namensabgleich | Die exakte Firmenschreibweise ist für diesen Test vorgegeben. |
| F202 | S49 | `Kossten` | `Kosten` | Konsonantenverdopplung | Korrektur | Überflüssiges s. |
| F203 | S50 | `Yilmaz` | `Yılmaz` | Eigenname: Unicode-Zeichen | Namensabgleich | Punktloses ı gemäß Namensreferenz; nicht allgemein aus einem Wörterbuch ableitbar. |
| F204 | S50 | `E Mail` | `E-Mail` | Bindestrich | Korrektur | Standardform mit Bindestrich. |
| F205 | S50 | `van der Mehr` | `van der Meer` | Eigenname: Namensbestandteil | Namensabgleich | Schreibweise gemäß Namensreferenz. |
| F206 | S50 | `vergass` | `vergaß,` | ß und Infinitivgruppenkomma | Korrektur | de-DE: vergaß; Komma vor dem erweiterten zu-Infinitiv. |
| F207 | S50 | `mit zu schicken` | `mitzuschicken` | Trennbares Verb mit zu | Korrektur | Zu wird in mitschicken eingeschoben. |

### S51–S60

| ID | Einheit | Originalstelle | Soll / Vorschlag | Fehlertyp | Erwartung | Begründung |
|---|---|---|---|---|---|---|
| F208 | S51 | `Mc Allister` | `McAllister` | Eigenname: Namenszusammenschreibung | Namensabgleich | Schreibweise gemäß Namensreferenz. |
| F209 | S51 | `Teamwolke` | `TeamWolke` | Eigenname: Binnenmajuskel | Namensabgleich | Bewusste Produktschreibweise gemäß Referenz. |
| F210 | S51 | `Plan-Pilot` | `PlanPilot` | Eigenname: Produktschreibweise | Namensabgleich | Produktname gemäß Referenz. |
| F211 | S51 | ` Export` | `-Export` | Bindestrich im Kompositum | Korrektur | Den Produktnamen mit Export zu einem Kompositum verbinden. |
| F212 | S51 | `unvollstendig` | `unvollständig` | Umlaut/Stammprinzip | Korrektur | Stamm vollständig mit ä. |
| F213 | S51 | `lies sich` | `ließ sich` | Wortverwechslung | Korrektur | Vergangenheitsform von lassen, nicht Imperativ von lesen. |
| F214 | S52 | `Anna Lena Schulte` | `Anna-Lena Schulte` | Eigenname: Bindestrich | Namensabgleich | Der amtliche Vorname wird für diesen Test mit Bindestrich vorgegeben. |
| F215 | S52 | `O’Conner` | `O’Connor` | Eigenname: Nachname | Namensabgleich | Beide Schreibungen könnten reale Namen sein; nur die Referenz macht die Abweichung zum Testfehler. |
| F216 | S52 | `dopelt` | `doppelt` | Konsonantenverdopplung | Korrektur | Zweites p fehlt. |
| F217 | S52 | `angemelt` | `angemeldet` | Silbenauslassung | Korrektur | Die Buchstabenfolge de fehlt. |
| F218 | S53 | `Plkat` | `Plakat` | Buchstabenauslassung | Korrektur | a fehlt. |
| F219 | S53 | `den Program` | `dem Programm` | Kasus und Konsonantenverdopplung | Korrektur | Dativ nach von; Programm mit mm. |
| F220 | S53 | `Feler` | `Fehler` | Dehnungs-h | Korrektur | h fehlt. |
| F221 | S54 | `die die` | `die` | Unbeabsichtigte Wortwiederholung | Korrektur | Hier sind zwei identische Artikel unmittelbar vor demselben Substantiv überflüssig. |
| F222 | S54 | `Anmelde Numemr` | `Anmeldenummer` | Zusammenschreibung und Buchstabenvertauschung | Korrektur | Zusammengesetztes Substantiv; Buchstabenfolge in Nummer korrigieren. |
| F223 | S54 | `niemant` | `niemand` | Konsonantenverwechslung | Korrektur | Niemand mit d. |
| F224 | S54 | `wusste` | `wusste,` | Komma: indirekter Fragesatz | Korrektur | Komma vor wer. |
| F225 | S54 | `geendert` | `geändert` | Umlaut/Stammprinzip | Korrektur | Ändern mit ä. |
| F226 | S55 | `freue` | `freue mich` | Fehlendes Reflexivpronomen | Korrektur | Sich auf etwas freuen. |
| F227 | S55 | `besser Plan` | `besseren Plan` | Kasus und Adjektivflexion | Korrektur | Akkusativ nach ohne; maskulines Substantiv. |
| F228 | S55 | `werde` | `wird` | Subjekt-Verb-Kongruenz | Korrektur | Subjekt ist das: dritte Person Singular. |
| F229 | S55 | `bestimt` | `bestimmt` | Konsonantenverdopplung | Korrektur | Zweites m fehlt. |
| F230 | S56 | `Bie` | `Die` | Buchstabenverwechslung b/d | Korrektur | Anfangsbuchstabe des Artikels vertauscht. |
| F231 | S56 | `geholft` | `geholfen,` | Unregelmäßiges Partizip und Komma | Korrektur | Partizip geholfen; Komma vor dem erweiterten zu-Infinitiv. |
| F232 | S56 | `Schtühle` | `Stühle` | Lautnahe Schreibung st/scht | Korrektur | Wortanfang St statt Scht. |
| F233 | S56 | `Fogel` | `Vogel` | Lautnahe Schreibung f/v | Korrektur | Vogel mit V. |
| F234 | S57 | `Schluß` | `Schluss` | s/ss/ß | Korrektur | Kurzer Vokal: ss. |
| F235 | S57 | `Waßer` | `Wasser` | s/ss/ß | Korrektur | Kurzer Vokal: ss. |
| F236 | S57 | `assen` | `aßen` | s/ss/ß | Korrektur | Langer Vokal: ß in de-DE. |
| F237 | S57 | `süsse` | `süße` | s/ss/ß | Korrektur | Langer Vokal: ß in de-DE. |
| F238 | S57 | `hatt` | `hat` | Konsonantenverdopplung | Korrektur | Überflüssiges t. |
| F239 | S58 | `haben` | `sind` | Perfekthilfsverb | Korrektur | Gehen bildet das Perfekt hier mit sein. |
| F240 | S58 | `hatte` | `hatten` | Subjekt-Verb-Kongruenz | Korrektur | Wir verlangt den Plural. |
| F241 | S58 | `Krafft` | `Kraft` | Konsonantenverdopplung | Korrektur | Überflüssiges f. |
| F242 | S59 | `bericht` | `Bericht` | Groß-/Kleinschreibung | Korrektur | Substantiv. |
| F243 | S59 | `fertig,weil` | `fertig, weil` | Typografie: fehlendes Leerzeichen | Korrektur | Leerzeichen nach dem Komma ergänzen. |
| F244 | S59 | `abschiken` | `abschicken` | ck-Schreibung | Korrektur | Schicken mit ck. |
| F245 | S59 | ` ,,` | `,` | Typografie: doppelte Satzzeichen | Korrektur | Ein Komma, ohne vorausgehendes Leerzeichen. |
| F246 | S59 | `eingeschlaffen` | `eingeschlafen` | Konsonantenverdopplung | Korrektur | Überflüssiges f. |
| F247 | S60 | `habt` | `habt,` | Komma: vorangestellter Nebensatz | Korrektur | Komma nach dem falls-Satz. |
| F248 | S60 | `freitag` | `Freitag` | Groß-/Kleinschreibung | Korrektur | Wochentag als Substantiv. |
| F249 | S60 | `schike` | `schicke` | ck-Schreibung | Korrektur | Schicken mit ck. |
| F250 | S60 | `dass` | `das` | das/dass | Korrektur | Artikel vor Protokoll. |
| F251 | S60 | `endgüldige` | `endgültige` | Konsonantenverwechslung | Korrektur | Gültig mit t. |
| F252 | S60 | `Protokoll` | `Protokoll.` | Fehlendes Satzschlusszeichen | Korrektur | Abschließenden Punkt ergänzen. |

## 4. Korrekte Kontrollfälle gegen unnötige Korrekturen

Diese Fälle separat oder zusätzlich zum Fehlertext prüfen. Sie enthalten bewusst schwierige, aber zulässige Formen. Die Kontrollfälle K01–K04 benötigen dieselbe Namensreferenz wie die Namensprüfung. K13 prüft ausdrücklich den Modus „Register erhalten“.

Nachschlagebelege für die Varianten: [aufwendig / aufwändig](https://grammis.ids-mannheim.de/rechtschreibung/A), [zu Hause / zuhause](https://grammis.ids-mannheim.de/rechtschreibung/6782) und [nach Hause / nachhause](https://grammis.ids-mannheim.de/rechtschreibung/6788) im amtlichen Wörterverzeichnis beim IDS.

| ID | Korrekte Texteingabe | Erwartetes Verhalten |
|---|---|---|
| K01 | Léa Müller-Lüdenscheidt und Derya Yılmaz helfen heute. | Akzent, zusammengesetzter Nachname und türkisches punktloses ı gemäß Namensliste erhalten. |
| K02 | McAllister spricht mit Herrn van der Meer. | Binnenmajuskel und kleingeschriebene Namensbestandteile gemäß Namensliste erhalten. |
| K03 | TeamWolke übernimmt den PlanPilot-Export. | Bewusste Produktnamen und korrekter Bindestrich im Kompositum erhalten. |
| K04 | Anna-Lena Schulte, Jörg Weiß und O’Connor stehen auf der Liste. | Bindestrich, ß und Apostroph in den vorgegebenen Namen erhalten. |
| K05 | Max’ Fahrrad steht neben der Tür. | Korrekter Genitivapostroph bei einem Namen auf x. |
| K06 | Ich weiß, dass das funktioniert. | Dass als Konjunktion und das als Pronomen nicht vereinheitlichen. |
| K07 | Seid ihr seit gestern hier? | Verbform seid und zeitliche Präposition seit unterscheiden. |
| K08 | Die Frau, die die Liste führt, kommt gleich. | Notwendige Wiederholung aus Relativpronomen und Artikel nicht entfernen. |
| K09 | Sie arbeitet selbstständig; er arbeitet selbständig. | Beide zulässigen Varianten akzeptieren. |
| K10 | Wir bleiben zu Hause; die anderen bleiben zuhause. | Beide zulässigen Schreibungen des Ortsadverbs akzeptieren. |
| K11 | Die erste Lösung war aufwendig; die zweite war aufwändig. | Beide zulässigen Varianten akzeptieren. |
| K12 | Wider Erwarten kam er wieder. | Wider im Sinn von entgegen und wieder im Sinn von erneut unterscheiden. |
| K13 | „Haste mal eine Minute?“, fragte Ben. | Im Modus Register erhalten keine erzwungene Standardisierung; optional Hast du vorschlagen. |
| K14 | Die Adresse lautet fest@teamwolke.example. | Adresse als opake Testzeichenfolge erhalten; keine Schreibkorrektur innerhalb der Adresse. |
| K15 | Im Feld steht die Kennung 00742. | Kennung und führende Nullen erhalten. |
| K16 | Wir müssen noch E-Mails und PDF-Dateien verschicken. | Korrekte Komposita mit Bindestrich erhalten. |
| K17 | Die Türe ist zu. | Zulässige Variante Türe nicht als Rechtschreibfehler markieren. |
| K18 | Die Straße ist 500 m lang. | Korrekte de-DE-Schreibung sowie Abstand zwischen Zahl und Einheit erhalten. |
| K19 | Wir gehen nach Hause; die anderen gehen nachhause. | Beide zulässigen Schreibvarianten akzeptieren; auch nachhause ist korrekt. |

## 5. Korrigierte Referenzfassung

Die folgenden 60 Zeilen entsprechen S01–S60 in derselben Reihenfolge. Sämtliche Korrekturstellen und referenzgebundenen Namensabweichungen sind behoben. Bewusst mündliche Ausdrucksweisen sowie der als Registerfrage erfasste Dativ nach „wegen“ bleiben in dieser Fassung erhalten. Die Änderungen für eine zusätzliche Standardisierung stehen anschließend separat.

```text
Gestern Morgen bin ich mit meiner Schwester zum Vereinsfest gefahren, obwohl ich eigentlich ausschlafen wollte.
Die Einladung lag seit einer Woche auf dem Küchentisch und keiner hatte sie richtig gelesen.
Darin stand, dass alle Helfer pünktlich um acht Uhr am Sportplatz sein sollen.
Ich dachte, dass das bloß ein Scherz war, weil die Feier doch erst am Nachmittag anfängt.
Im Flur suchte ich meine Schuhe, den roten Rucksack und das Handy, das unter einer Jacke lag.
Meine Schwester hatte den Schlüssel verlegt und sagte, dass sie ihn bereits dreimal gesucht hat.
Auf dem Weg begegneten wir einem alten Nachbarn, der mit zwei Hunden vor dem Haus gewartet hatte.
Der Bus kam zu spät, deshalb mussten wir zu Fuß durch eine schmale Straße laufen.
Vor der Halle stand ein Schild mit der Aufschrift: Herzlich willkommen zum fünften Sommerfest!
Die Tür war noch zu, aber die anderen Helfer warteten schon ungeduldig neben dem Eingang.
Zum Aufbauen brauchten wir zwanzig Tische, mehrere Stühle und ein sehr langes Verlängerungskabel.
Die Kabeltrommel stand im Materialraum, dessen Türe wir wegen dem fehlenden Schlüssel nicht öffnen konnten.
Ben wollte die Kisten holen, obwohl er gar nicht wusste, wo der Hausmeister gerade war.
Ich habe das kleine Paket aufgemacht und darin ein Blatt, drei Bleistifte sowie eine kaputte Schere gefunden.
Auf der Einkaufsliste standen Tomaten, Gurken, Käse und Brot, aber kein einziges Getränk.
Also kaufte ich ein bisschen Apfelsaft und viel zu viele Flaschen, weil man ja nie weiß, wie durstig alle sind.
An der Kasse merkte ich, dass ich meinen Geldbeutel vergessen hatte, und musste wieder nachhause gehen.
Als ich zurückkam, waren die Helfer am Essen und die ersten Gäste warteten bereits draußen.
Das Buffet sah interessant aus, nur die Erdbeeren waren matschig und der Salat schmeckte merkwürdig süß.
Die Brötchen waren härter als gestern, und der Kuchen war der einzige, den überhaupt jemand essen wollte.
Beim Getränkestand verkaufte Timo drei Kaffees, zwei Tees und eine Flasche Mineralwasser.
Neben dem Stand lief ein Junge herum, dessen Handy ständig klingelte und den niemand kannte.
Er fragte nach dem WLAN-Passwort, weil sein Tablet keine Verbindung zu unserer Anlage bekam.
Die Musik war sehr laut, trotzdem hörte man jedes Wort, das der Moderator ins Mikrofon schrie.
Plötzlich fiel der Strom aus, und sämtliche Lampen gingen gleichzeitig aus, obwohl die Sicherung noch drin war.
Nachdem wir die falsche Steckdose ausgetauscht hatten, funktionierte alles wieder und die Musik spielte weiter.
Die Mannschaft vom Nachbarort gewann das Turnier, obwohl ihre Trikots viel zu groß und die Schuhe ziemlich alt waren.
Beim letzten Spiel schoss ein Spieler den Ball durch das offene Fenster, worauf der Schiedsrichter laut pfiff.
Zum Glück wurde keiner verletzt, aber der Hausmeister beschwerte sich lautstark über die kaputte Scheibe.
Wir gaben ihm das Versprechen, den Schaden zu bezahlen, und baten ihn darum, uns noch eine Chance zu geben.
Die beiden Helfer tragen die schweren Kisten in die Halle, weil der Lieferwagen schon seit einer Stunde vor dem Tor wartet.
Ben erzählt Mia, dass er seit gestern auf eine Antwort des Vereinsvorsitzenden wartet und deshalb keine weiteren Getränke bestellt hat.
Die Frau, die am Eingang steht, verkauft die Eintrittskarten und gibt jedem Besucher einen Plan, damit alle die Stände finden.
Nachdem Timo die Bühne aufgebaut hatte, gingen die Musiker gestern auf die Bretter und spielten sofort ein Lied für das Publikum.
„Habt ihr die Mikrofone getestet?“, fragt Mia, worauf Ben antwortet: „Wir haben sie vor zehn Minuten angeschlossen, aber eines funktioniert nicht.“
Liebe Gäste, wir freuen uns, dass ihr heute so zahlreich gekommen seid, und wünschen euch einen schönen Tag auf unserem Vereinsfest.
Der Mann mit der roten Jacke verteilt vor der Bühne die Lose, obwohl niemand weiß, wie viele Gewinne überhaupt vorhanden sind.
Die Tombola beginnt erst, wenn alle Kinder zurück sind, aber Timo ruft die erste Nummer auf, bevor die Helfer den Lostopf schließen.
Mia erinnert Ben an den fehlenden Schlüssel, den er gestern zu Hause liegen gelassen hat und jetzt dringend für das Lager braucht.
Wieder stehen die Kuchen neben dem Lautsprecher, obwohl Mia erklärt hat, dass die Sahne dort wegen der warmen Lampen schnell verdirbt.
Das kleine Kind, dessen Eltern wir vorhin geholfen haben, sucht seinen roten Rucksack und fragt, ob jemand ihn unter der Bank gesehen hat.
Die Liste mit den Bestellungen liegt neben der Kasse und enthält mehr Einträge, als wir erwartet haben, deshalb fehlen am Ende Getränke.
Ben konnte die Rechnung nicht bezahlen, weil er seine Geldbörse vergessen hatte, und Mia gab ihm das Geld, um den Betrag sofort zu überweisen.
Obwohl es bereits dunkel geworden war, mussten die letzten Besucher noch warten, denn der Busfahrer wusste nicht, wo er die Gruppe abholen sollte.
Als alle gegangen waren, sagte Timo: „Das nächste Fest wird bestimmt ruhiger“, aber Mia bezweifelte, dass wir bis dahin genug Helfer finden.
Ben fragte: „Weisste, hassse mal nen Stift, damit ich dat Formular ebend ausfüllen kann?“
Mia sagte: „Ick hab keenen Zettel mehr, und det find ick doof.“
Timo rief: „Kommse ma rüber, dat kriegen wa schon hin, is doch allet halb so wild!“
Im Protokoll schrieb Léa Müller-Lüdenscheidt, dass der Sponsor Nordlicht & Söhne GmbH alle Kosten übernimmt.
Derya Yılmaz schickte die E-Mail an Herrn van der Meer und vergaß, den Anhang mitzuschicken.
McAllister öffnete die Datei in TeamWolke, aber der PlanPilot-Export war unvollständig und ließ sich nicht speichern.
Die Einträge für Anna-Lena Schulte, Jörg Weiß und O’Connor waren doppelt vorhanden, obwohl jeder nur einmal angemeldet war.
Auf dem Plakat stand www.teamwolke.example, doch die Adresse fest@teamwolke.example wurde von dem Programm als Fehler markiert.
In der Liste stand die Anmeldenummer 00742 zweimal, und niemand wusste, wer sie zuletzt geändert hatte.
Ich freue mich auf das nächste Fest, aber ohne besseren Plan und ohne zusätzliche Helfer wird das bestimmt wieder Chaos.
Die Kinder haben geholfen, die Stühle wegzutragen, und ein kleiner Vogel saß ungestört auf dem Zaun.
Zum Schluss tranken wir Wasser mit Zitrone und aßen süße Kekse, weil der Abbau lange gedauert hat.
Danach sind wir nach Hause gegangen, denn unsere Beine schmerzten und wir hatten überhaupt keine Kraft mehr.
Zu Hause schrieb ich den Bericht fertig, weil ich ihn noch abschicken wollte, bevor ich eingeschlafen bin.
Falls ihr noch Fragen habt, meldet euch bitte bis Freitag bei mir, ich beantworte sie gern und schicke euch dann das endgültige Protokoll.
```

### Optionale Standardisierung der Registerfälle

| Einheit | Vollständige standardisierte Fassung |
|---|---|
| S12 | Die Kabeltrommel stand im Materialraum, dessen Türe wir wegen des fehlenden Schlüssels nicht öffnen konnten. |
| S46 | Ben fragte: „Weißt du, hast du mal einen Stift, damit ich das Formular eben ausfüllen kann?“ |
| S47 | Mia sagte: „Ich habe keinen Zettel mehr, und das finde ich doof.“ |
| S48 | Timo rief: „Kommen Sie mal herüber, das kriegen wir schon hin, das ist doch alles halb so wild!“ |

## 6. Vorschlag für die Auswertung

1. **Fehlererkennung:** Für jede Korrekturstelle festhalten, ob die richtige Stelle erkannt wurde. Eine Markierung des ganzen Wortes oder Satzteils kann genügen, auch wenn der technische Zeichenausschnitt anders abgegrenzt ist.
2. **Korrekturqualität:** Separat prüfen, ob mindestens ein angebotener Vorschlag grammatisch richtig ist und den gemeinten Inhalt erhält. Namen, Zahlen und Bezugspersonen dürfen nicht zur bloßen Herstellung eines korrekten Satzes geändert werden.
3. **Eigennamen:** Einen Lauf ohne und einen Lauf mit Namensliste unterscheiden. Die Namensabweichungen nur im Lauf mit Referenz als erwartete Treffer zählen.
4. **Register:** Einen Lauf mit erhaltener Umgangssprache und optional einen mit gewünschter Standardsprache durchführen. Stilhinweise getrennt von Pflichtkorrekturen ausweisen.
5. **Fehlalarme:** Die korrekten Kontrollfälle prüfen und unnötige Markierungen sowie falsche automatische Änderungen zählen. Beispielsweise darf `die die` in K08 nicht wie die überflüssige Wiederholung in S54 behandelt werden.
6. **Mehrfachfehler:** Prüfen, ob nach der ersten Korrektur weitere Fehler im selben Ausdruck bestehen bleiben oder neue entstehen. Mehrere Regeln derselben Prüfstelle nicht ungeprüft als mehrere Treffer zählen.

Für einen einfachen Ergebnisbericht genügen die Spalten `Prüfstelle`, `erkannt`, `Vorschlag korrekt`, `tatsächlicher Vorschlag` und `Bemerkung`. Eine Erkennungsquote lässt sich als erkannte Korrekturstellen geteilt durch alle Korrekturstellen berechnen. Namensabgleich, Stilhinweise und Fehlalarme gesondert ausweisen.
