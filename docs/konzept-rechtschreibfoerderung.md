# Konzept: Rechtschreibförderung, Wortklärungen und Elternempfehlungen

Stand: 14. Oktober 2026 · Konzeptfassung 1.1 · Grundlage: App 1.2.1, Commit `646dd49`

**Status:** Fachliche Grundlage der Umsetzung für Version 1.3.0. Verbindliche Produktentscheidungen stehen im [Entwicklungsplan](entwicklungsplan-rechtschreibfoerderung.md); umgesetzter Umfang, Nachweise und verbleibende Validierungen im [Prüfbericht](pruefbericht-1.3.0.md). Bestätigte Zielvorgaben stehen in Abschnitt 1, ergänzte Bedienanforderungen in Abschnitt 10; Planungsannahmen sind ausdrücklich gekennzeichnet. Dieses Dokument ändert keine App-Einstellungen.

## 1. Ziel und vereinbarter Umfang

Die App unterstützt Kinder beim Schreiben und Rechtschreiblernen. Sie richtet sich sowohl an Kinder mit LRS als auch an Kinder mit fehlenden Grundlagen, Unsicherheiten oder Schwierigkeiten, sich auf Schreibaufgaben einzulassen. Eine Diagnose ist keine Voraussetzung für die Nutzung.

Lesen bleibt ein freiwilliger Nebeneffekt des persönlichen Tagebuchs. Systematische Leseförderung ist kein Ziel dieses Vorhabens.

| ID | Bestätigte Anforderung |
| --- | --- |
| R01 | Die vorhandene Konfiguration von Schreibumfang, Satzlänge, Tagebuch-Coins, Wochenwertung, Jokern und Pausen bleibt bestehen. Das diskutierte offene Belohnungsmodell wird nicht eingeführt. |
| R02 | Die App empfiehlt Eltern gezielte Übungen. Erst die Eltern machen daraus eine Zusatzaufgabe für das Kind. Ein Diktat wird keine Voraussetzung für den Tagebuchabschluss. |
| R03 | Für solche Diktataufgaben gibt es zusätzlich konfigurierbare Coins. Die bestehende Tagebuchvergütung wird dadurch nicht ersetzt. |
| R04 | Das Kind kann die Bearbeitung einer einzelnen Wortstelle beenden, wenn es nicht weiterweiß oder die App-Bewertung anzweifelt. Es gibt keine Sammelaktion zum Überspringen aller Fehler. |
| R05 | Das Kind kann durch diese Funktion keine automatische Korrektur seines Textes auslösen. Die offene Stelle bleibt ungeklärt; andere Stellen werden weiter bearbeitet. |
| R06 | Wortklärungen, eigene Bearbeitung und aufgerufene Hilfen werden gespeichert und im Elternbereich verständlich ausgewertet. |
| R07 | Fehlerklassen, Korrekturhinweise und Übungsempfehlungen werden fachlich überarbeitet. Unsichere App-Zuordnungen werden kenntlich gemacht. |
| R08 | Eltern erhalten nachvollziehbare Beobachtungen und begründete Vorschläge. Die App diagnostiziert weder LRS noch mangelnden Willen und behauptet nicht, aus Klicks Verständnis erkennen zu können. |

Weitere Leitplanken: Die Anwendung bleibt lokal nutzbar und kommt ohne neuen Backend-Dienst aus. Private Tagebuchtexte werden nicht pauschal für Eltern geöffnet. Neue externe Benachrichtigungen oder Textübertragungen sind nicht Bestandteil dieses Konzepts.

## 2. Ausgangslage und notwendige Änderungen

Der aktuelle Stand enthält bereits Fehlerkategorien, kindgerechte Tipps, eigene Übungswörter, Wort- und Kurz-Diktate, Elternstatistiken und lokale Speicherung.

| Bestehender Ablauf | Bedeutung für die Weiterentwicklung |
| --- | --- |
| `fineCats()` und `errCats()` ordnen Fehler unter anderem anhand des vermuteten Zielworts ein. | Eine falsche Wortvermutung kann eine falsche Kategorie erzeugen. Beobachtung und vermutete Erklärung müssen getrennt werden. |
| `runCheck()` und `renderResult()` bearbeiten markierte Stellen; der reguläre Abschluss erfolgt ohne verbleibende Markierungen. | Zusätzlich wird ein Abschluss mit ausdrücklich offengelassenen Wortstellen benötigt. Das konfigurierte Schreibziel bleibt erforderlich. |
| „Ich finde, das stimmt so“ ist auf bestimmte Markierungen begrenzt und entfernt Fehlerzählungen; gespeichert wird vor allem eine pauschale Anzahl von Ausnahmen. | Eine Beanstandung benötigt einen eigenen Fall mit Verlauf und offenem Prüfstatus. Sie darf nicht als bestätigte Korrektur erscheinen. |
| `errCats` und `practice.log` enthalten überwiegend zusammengefasste Zahlen. | Daraus lassen sich nachträglich keine Wortversuche oder Hinweisaufrufe rekonstruieren. Neue Detaildaten beginnen erst mit der Umsetzung. |
| `weakCats()` verwendet hauptsächlich Fehlerzählungen aus Tagebucheinträgen. | Empfehlungen sollen künftig auch überprüfte Übungsergebnisse, offene Stellen und die Verlässlichkeit der Zuordnung berücksichtigen. |
| Zusatzaufgaben bringen derzeit zusätzliche Spielzeit. | Elternzuweisungen und zusätzliche Aufgaben-Coins sind neue Funktionen. Bestehende freie Übungen bleiben nutzbar. |

In der bisherigen Analyse wurden außerdem fehlerhafte beziehungsweise unvollständige Lerninhalte gefunden: „zum tauschen“ in einer Diktatvorlage, eine zu allgemeine s/ss/ß-Erklärung und die verkürzte Aussage, jedem Laut entspreche ein Buchstabe. Die angekündigte Wiederholung nach 30 Tagen wird bei eigenen Übungswörtern derzeit durch vorzeitiges Entfernen des Wortes verhindert. Diese Punkte gehören in die fachliche Qualitätsarbeit dieses Vorhabens.

## 3. Kinderablauf: eine Wortstelle offenlassen

### 3.1 Auswahl an der konkreten Stelle

Die vorhandenen Hinweise bleiben zugänglich. Zusätzlich bietet eine markierte Wortstelle zwei klar unterscheidbare Aktionen:

- **„Hier weiß ich nicht weiter.“** Die Bearbeitung bleibt ungelöst.
- **„Ich glaube, meine Schreibweise stimmt.“** Die Markierung wird zur Prüfung vorgemerkt.

Die Aktion gilt für genau dieses Wortvorkommen im aktuellen Text beziehungsweise in der aktuellen Aufgabe. Sie fügt das Wort weder einem globalen Wörterbuch hinzu noch erklärt sie alle gleichen Wörter automatisch für richtig. Sie setzt keine künstliche Mindestzahl falscher Versuche voraus.

**R09 – Ergebnis:** Die aktuelle Schreibweise bleibt erhalten. Die Stelle ist in der Korrekturansicht als offen erkennbar und blockiert die weitere Bearbeitung nicht. Es wird kein ganzer Text übersprungen oder automatisch berichtigt. Ein Name kann weiterhin über die dafür vorgesehene Namensfunktion behandelt werden.

Mehrwort-Grammatikhinweise und reine Satzzeichenmarkierungen erhalten in diesem Vorhaben keine neue pauschale Überspringfunktion. Die vorhandenen Abläufe bleiben bestehen; Wortklärungen dürfen nicht versehentlich größere Textbereiche freigeben.

### 3.2 Bearbeitung fortsetzen und abschließen

Das Kind kann eine offene Stelle später wieder bearbeiten. Wird sie verbessert, ändert sich ihr aktueller Zustand; die zuvor erfolgte Hilfesuche bleibt im Verlauf sichtbar. Entfernt oder ersetzt das Kind die betreffende Passage vollständig, gilt die ursprüngliche Stelle als „Text geändert“, nicht als nachgewiesen selbst korrigiert.

Ein erneuter Prüflauf darf dieselbe unveränderte, bereits zurückgestellte Stelle nicht wieder als neue Blockade behandeln. Ändert sich der Wort- oder Satzkontext wesentlich, muss die Zuordnung überprüft werden. Neue Fehler bleiben neue Fälle.

**R10 – Abschluss:** Ein Eintrag kann abgeschlossen werden, wenn das bisher konfigurierte Schreibziel erreicht ist und jede relevante Wortmarkierung entweder nach erneuter Prüfung als behoben gilt oder ausdrücklich offengelassen wurde. Bestehende andere Prüfbedingungen bleiben erhalten. Offene Wortstellen werden nicht als Fehlerfreiheit oder als selbst verbesserte Fehler ausgegeben.

Beispiel einer Abschlussmeldung: „Dein Eintrag ist gespeichert. Vier Stellen hast du verbessert; eine Stelle könnt ihr euch gemeinsam anschauen.“

Die Änderung erhält die Tagebuch-Coins nach den bestehenden Regeln. Allein das Offenlassen eines Wortes führt zu keiner neuen Kürzung oder Zusatzvergütung. Die Überarbeitung der Wortstatistik führt keine neue Bewertungsformel für bestehende Satz-, Wort- oder Komma-Coins ein.

## 4. Fachmodell für Fehlerklassen und Hilfen

### 4.1 Drei getrennte Ebenen

**R11 – Fachliche Einordnung:** Jeder Fall unterscheidet:

1. **Beobachtung:** etwa abweichende Großschreibung, ein fehlender Buchstabe oder eine vertauschte Reihenfolge.
2. **Vermutete Fehlerklasse:** etwa Doppelkonsonanten oder Wortstammableitung, jeweils nur bei ausreichend passendem Kontext und Zielwort.
3. **Passende Strategie:** etwa Verlängern, Ableiten, Untersuchung der Lautfolge oder eine Merkstrategie.

Ein Schreibbild kann mehrere Erklärungen haben. Eine Buchstabenvertauschung beweist weder eine Wahrnehmungsstörung noch LRS. Die Gruppe „Typische LRS-Muster“ wird durch neutrale Bezeichnungen für die tatsächlich beobachteten Schreibmuster ersetzt. Unbekannte Fälle erhalten „Noch nicht sicher zugeordnet“.

| Förderbereich | Mögliche Unterklassen | Beispiel | Mögliche Hilfe |
| --- | --- | --- | --- |
| Laut- und Buchstabenfolge | Auslassung, Zusatz, Reihenfolge, Buchstabenverwechslung | „Blme“ → „Blume“ | Wort langsam sprechen und Lautfolge untersuchen |
| Rechtschreibregeln und Merkwörter | Doppelkonsonanten einschließlich ck/tz, i/ie, Dehnungs-h, s/ss/ß, f/v/w | „komen“ → „kommen“ | Passende Regel erklären und an einem anderen Wort zeigen |
| Wortstämme und Wortverwandtschaft | Ableiten ä/e und äu/eu, Verlängern bei Auslautverhärtung | „Hunt“ → „Hund“ | „Hunde“ als Verlängerung nutzen |
| Wort und Satzkontext | Groß-/Kleinschreibung, Nominalisierung, das/dass, Getrennt-/Zusammenschreibung | „zum spielen“ → „zum Spielen“ | Die Funktion des Wortes im Satz untersuchen |
| Satzstruktur und Zeichensetzung | Satzabschluss, Kommas, grammatische Beziehungen | Fehlendes Satzende | Satzgrenzen beziehungsweise Satzstruktur untersuchen |

Diese Beispiele illustrieren die Struktur; sie bilden keinen vollständigen Regelkatalog und keinen diagnostischen Test. Eine Klasse kann mehrere geeignete Strategien haben. Mehrere Tags an derselben Stelle dürfen die Gesamtzahl der Fälle nicht vervielfachen.

### 4.2 Verlässlichkeit einer Bewertung

Bewertungsquelle und Prüfstatus werden getrennt gespeichert. Quellen sind etwa Wörterbuch, Onlineprüfung, kuratierte Aufgabenlösung und Elternprüfung. Mögliche Prüfstände sind:

- **Automatisch vermutet:** nachvollziehbare Zuordnung, aber kein geprüfter Einzelfall.
- **Mit geprüfter Aufgabenlösung verglichen:** ein eindeutiges Ziel und zulässige Varianten sind vorhanden.
- **Von Eltern bestätigt:** menschlich geprüft, mit nachvollziehbarem Ergebnis.
- **Beanstandet oder ungeklärt:** die Zuordnung darf keine gesicherte Fehleraussage begründen.

Die Kategorien sind keine errechneten Wahrscheinlichkeiten. Insbesondere eine Onlineprüfung ist kein Beweis für Richtigkeit. Fehlen für eine Zuordnung Kontext oder eine eindeutige Zielschreibweise, bleibt sie offen.

### 4.3 Anforderungen an den Regel- und Hinweiskatalog

**R12 – Inhaltsqualität:** Jeder Katalogeintrag benötigt eine stabile Kennung, Version, verständliche Bezeichnung, Anwendungsvoraussetzungen, passende Beispiele, Gegenbeispiele beziehungsweise zulässige Varianten, kindgerechte Hinweise, eine Erklärung für Eltern und geeignete Übungsarten.

Hinweise sollen schrittweise helfen: Aufmerksamkeit auf die relevante Stelle lenken, eine Strategie erklären und sie an einem passenden Beispiel zeigen. Die bisherige pauschale Entfernung jeder möglicherweise lösungsverratenden Beispielstelle darf den Hinweis nicht unverständlich machen. Daraus entsteht keine neue Autokorrektur-Schaltfläche.

Vor Einsatz sind insbesondere zu prüfen:

- s/ss/ß: Vokallänge allein reicht als allgemeine Entscheidungsregel nicht aus; Gegenbeispiel „Eis“.
- Groß-/Kleinschreibung: Wortart und Verwendung im Satz berücksichtigen, etwa „spielen“ und „das Spielen“.
- Laute und Buchstaben: Mehrbuchstabenschreibungen wie „sch“, „ie“ und nicht hörbare Schreibbestandteile berücksichtigen.
- Namen, Zusammensetzungen, zulässige Varianten und sprachliche Mehrdeutigkeiten: keine erzwungene falsche Musterlösung.
- Übungstexte: Grammatik und Rechtschreibung im Zusammenhang prüfen. Ein Wörterbuchtest einzelner Wörter genügt nicht.
- Wiederholung: Vorgesehene langfristige Wiederholungsstufen tatsächlich durchführen; ein Wort nicht vor der letzten vorgesehenen Prüfung entfernen.

Für neue zugewiesene Aufgaben werden nur fachlich geprüfte Materialien verwendet. Die vorhandene große Textsammlung gilt nicht allein aufgrund einer automatischen Kontrolle als vollständig geprüft. Der Entwicklungsplan muss festlegen, welche Bestandsinhalte vor einer Veröffentlichung korrigiert, ausgesetzt oder redaktionell geprüft werden.

## 5. Elternansicht und nachvollziehbare Statistik

### 5.1 Beobachtungen statt Zuschreibungen

**R13 – Auswertung:** Eltern sehen je Kind und Zeitraum, wie viele unterschiedliche Stellen markiert, bearbeitet, nach Hinweis gelöst, ungelöst zurückgestellt oder beanstandet wurden. Die Datenquelle wird kenntlich gemacht: Tagebuch, Wort-Diktat oder Kurz-Diktat.

Eine Detailansicht führt von einer Kategorie zu ihren Fällen. Bei einem Tagebuchfall werden standardmäßig Kategorie, Verlauf und Prüfbedarf gezeigt. Regeln für das Teilen von Wörtern und Kontext stehen in Abschnitt 9.

| Kennzahl | Definition und Grenze |
| --- | --- |
| Markierte Stellen | Eindeutige Wortvorkommen innerhalb einer Text-/Aufgabenversion. Wiederholtes Prüfen ist kein neuer Fall. |
| Zurückgestellt | Anteil ungelöster Fälle an den markierten, auswertbaren Fällen; beanstandete Fälle werden separat ausgewiesen. Das ist keine Verweigerungsquote. |
| Ohne aufgerufenen Hinweis verbessert | Eine eigene Änderung beseitigt die Markierung, ohne dass ein Hinweis aufgerufen wurde. Daraus folgt kein Nachweis selbstständigen Regelverständnisses. |
| Nach Hinweis verbessert | Ein Hinweis wurde geöffnet, danach wurde verbessert. Ob er gelesen oder verstanden wurde, ist nicht messbar. |
| Beanstandete Bewertungen | Eigene Anzahl und Prüfstatus. Bis zur Klärung kein bestätigter Kinderfehler. |
| Aufgabenleistung | Bearbeitete, zunächst richtig beantwortete, nachbearbeitete und übersprungene Zielwörter, jeweils mit Gesamtzahl der Zielwörter. |
| Schreibumfang | Wörter, Einträge und Übungstage im betrachteten Zeitraum, damit reine Fallzahlen eingeordnet werden können. |

Aktueller Bearbeitungszustand und Prüfstatus sind zwei verschiedene Merkmale. Eine Elternbestätigung macht ein ursprünglich übersprungenes Wort nicht nachträglich zu einer selbst erbrachten Korrektur. Als App-Fehler bestätigte Fälle verlassen die Fehlerauswertung des Kindes, bleiben aber als nachvollziehbare Prüfung erhalten.

### 5.2 Vergleichbarkeit

Tagebuchmarkierungen zeigen nur gefundene Auffälligkeiten. Aus fünf markierten Doppelkonsonanten lässt sich ohne Anzahl aller entsprechenden Schreibgelegenheiten keine Trefferquote für Doppelkonsonanten berechnen. Gezielte Aufgaben liefern eine besser definierte Bezugsmenge.

Eine Anzeige „Fehler pro 100 Wörter“ muss kenntlich machen, ob es geprüfte Fehler oder automatische Markierungen sind. Unterschiede in Textschwierigkeit, Prüfmodus, Regelversion und benötigter Hilfe begrenzen Zeitvergleiche. Ein einzelner besserer Tag gilt nicht als dauerhaft beherrschte Strategie.

Unabhängig von der Kategorie gilt: wenig Daten → „Noch keine belastbare Verlaufsaussage“. Bei bereits vorhandenen Altdaten fehlen die neuen Details; sie erscheinen getrennt als bisherige Gesamtzahlen.

## 6. Empfehlungen an Eltern

**R14 – Begründung:** Jede Empfehlung enthält Beobachtung, Bezugsmenge, Zeitraum, mögliche Erklärung mit Unsicherheit und einen konkreten Vorschlag. Die auslösenden Fälle sind nachvollziehbar. Empfehlungen ändern keine Ziele oder Belohnungen automatisch.

| Beobachtung | Geeigneter Hinweis beziehungsweise Vorschlag |
| --- | --- |
| Gleichartige Schwierigkeiten an mehreren verschiedenen Wörtern und Tagen; Zuordnung ausreichend verlässlich | Passende Strategie gemeinsam anschauen und ein kurzes gezieltes Diktat anbieten. |
| Viele offene Stellen über unterschiedliche Kategorien hinweg | Gemeinsam klären, ob Umfang, Hinweise, Bedienung oder die aktuelle Situation Schwierigkeiten machen. |
| Häufig beanstandete Bewertungen | Zuerst die Bewertungen und Lerninhalte prüfen; daraus nicht einfach zusätzliche Fehlerübungen erzeugen. |
| Wiederholt Verbesserungen nach derselben Hilfe | Beobachteten Erfolg nennen und später ein ungeübtes Wort mit derselben Strategie anbieten. |
| Sicherere Leistung bei vergleichbaren Aufgaben über mehrere Termine | Fortschritt sichtbar machen und mit zeitlichem Abstand erneut prüfen. |

Beispieltext, ausdrücklich keine echten Nutzerdaten:

> „Bei Doppelkonsonanten wurden an mehreren Tagen zehn Stellen markiert. Vier wurden ohne aufgerufenen Hinweis verbessert, zwei nach einem Hinweis, drei offengelassen und eine Bewertung beanstandet. Ein kurzes Wort-Diktat könnte helfen. Die beanstandete Stelle solltet ihr zunächst prüfen.“

Die vorhandene numerische Schwelle für einen LRS-Hinweis wird nicht als fachlich validierter Schwellenwert übernommen. Empfehlungen zu einzelnen Rechtschreibstrategien sind von allgemeinen Informationen zu LRS getrennt. Bei anhaltenden Schwierigkeiten kann die App ein Gespräch mit der Lehrkraft anregen, ohne eine Diagnose oder Ursache zu behaupten.

Eine Klassenstufe kann später als ergänzender Kontext dienen. Sie ersetzt weder Informationen darüber, welche Regeln schon behandelt wurden, noch eine individuelle Betrachtung. Eine verpflichtende Klassenstufenabfrage gehört nicht zum vereinbarten Umfang.

## 7. Von der Empfehlung zur freiwilligen Diktataufgabe

### 7.1 Eltern legen eine Aufgabe an

**R15 – Aufgabe:** Aus einer Empfehlung öffnen Eltern einen Aufgabenvorschlag. Sie wählen Kind, Förderziel, Übungsart, Umfang und maximalen Coinbetrag. Sie sehen vor der Zuweisung das geprüfte Material beziehungsweise die Materialauswahl. Empfehlungen können auch zurückgestellt werden.

Das Kind sieht Ziel, Umfang und mögliche Belohnung, beispielsweise: „Doppelkonsonanten üben · 5 Wörter · bis zu 20 Extra-Coins“. Diese Zahlen sind ein Beispiel, keine fachlich festgelegte Übungsdosis.

Die Aufgabe ist freiwillig und unabhängig vom Tagebuchabschluss erreichbar. Sie erzeugt keinen automatischen Pflichttermin und blockiert weder den nächsten Eintrag noch vorhandene Funktionen. Eltern können eine noch nicht begonnene Aufgabe bearbeiten oder zurücknehmen. Ab Beginn werden Material, Umfang und Vergütung für diese Aufgabe festgehalten, damit sich die Vereinbarung während der Bearbeitung nicht ändert. Eltern können auch eine begonnene Aufgabe beenden; der erreichte Stand und die zugehörige Vergütung bleiben nachvollziehbar erhalten.

Die Entwicklungsplanung kann zuerst Wort-Diktate und anschließend Kurz-Diktate mit denselben Grundregeln liefern. Eine spätere Lieferstufe muss ausdrücklich benannt werden. Freie vorhandene Diktate bleiben verfügbar; ihre Wiederholung erzeugt nicht automatisch die neue Zuweisungsbelohnung.

### 7.2 Zusätzliche Aufgaben-Coins

**R16 – Konfiguration und Nachvollziehbarkeit:** Eltern können den Coinbetrag je Aufgabe setzen, einschließlich 0. Ein pro Kind gespeicherter Standardbetrag erleichtert die nächste Zuweisung. Ein separates Buchungsmerkmal verbindet jede Gutschrift eindeutig mit der Aufgabe.

**Planungsannahme P1 – anteilige Vergütung:** Für die erste Umsetzung wird folgende Regel vorgeschlagen:

`verdiente Aufgaben-Coins = abrunden(maximale Aufgaben-Coins × bearbeitete Zielwörter / alle Zielwörter)`

Bei 5 Zielwörtern, maximal 20 Coins und 4 bearbeiteten Wörtern wären das 16 Coins. Satzzeichen erhöhen den Nenner nicht. Ein falsch begonnenes, anschließend mit Hilfe bearbeitetes Wort zählt ebenfalls. Ein nur übersprungenes oder noch offenes Wort zählt bis zur Klärung nicht als bearbeitet.

„Bearbeitet“ bedeutet eine eigene Eingabe mit abgeschlossener Prüfung und gegebenenfalls durchlaufener Rückmeldung/Nachbearbeitung. Eine leere Eingabe, das bloße Öffnen der Aufgabe oder ein Klick auf „Weiter“ erfüllt dies nicht. Die genaue Zuordnung wird für Wort- und Kurz-Diktate anhand von Beispielabläufen spezifiziert. Der Ablauf soll Eigenarbeit fördern, kann absichtlich beliebige Eingaben aber nicht zuverlässig von echten Schwierigkeiten unterscheiden.

Bei einer beanstandeten App-Bewertung kann die Prüfung den betroffenen Anteil nachträglich freigeben, wenn tatsächlich eine zulässige eigene Antwort vorlag. Die bloße Bestätigung, dass ein ungelöstes Wort schwierig war, erzeugt keine fiktive Bearbeitung.

**Planungsannahme P2 – Buchung:** Neue Aufgaben-Coins werden beim Abschluss der Aufgabe separat gutgeschrieben. Die bestehende sonntägliche Tagebuchgutschrift bleibt unverändert. Wird eine Aufgabe später vervollständigt oder eine Fehlbewertung geklärt, wird ausschließlich die noch nicht ausgezahlte positive Differenz gebucht. Der Gesamtbetrag bleibt auf die vereinbarte Aufgabenvergütung begrenzt. Eine aufgehobene Aufgabe mit bereits geleisteter Arbeit behält den erreichten Anteil; es gibt keinen neuen Verfallstatbestand.

Diese Annahmen betreffen ausschließlich die neue Zusatzvergütung und sind im Entwicklungsplan als Produktentscheidungen zu übernehmen oder gezielt anzupassen. Bereits gutgeschriebene Coins werden durch eine nachträgliche Umklassifizierung nicht automatisch abgezogen. Die bestehende manuelle Elternkorrektur bleibt verfügbar.

**R17 – Schutz vor Doppelvergütung:** Wiederholtes Prüfen, Neuladen, erneutes Öffnen und Wiederholen derselben Zuweisung erzeugen keine weiteren Coins über den vereinbarten Betrag hinaus. Eine neue vergütete Wiederholung erfordert eine neue Elternzuweisung. Ein vollständig übersprungener Durchlauf erhält nach P1 keine Aufgaben-Coins. Wiederholungen und offene Wörter bleiben in der Elternansicht sichtbar; eine automatische Unterstellung von Täuschung findet nicht statt.

## 8. Fachliches Datenmodell

Das Modell beschreibt benötigte Informationen, noch keine verbindlichen JavaScript-Namen oder Datenbankstruktur. Alle Datensätze gehören eindeutig zu einem Kinderprofil.

| Objekt | Benötigte Informationen |
| --- | --- |
| Wortfall | Stabile Fall-ID; Kind; Entwurf/Eintrag oder Aufgabe; Textrevision und Wortvorkommen; ursprüngliche Schreibweise; vorgeschlagene Zielschreibweise beziehungsweise Varianten; Kontextbezug; Beobachtung, Kategorie und Strategie; Bewertungsquelle; Katalogversion; Prüfstatus; aktueller Bearbeitungszustand; Zeitpunkte |
| Bearbeitungsereignis | Fall-ID; eindeutige Ereignis-ID; Zeitpunkt; Art des Ereignisses; zur Prüfung eingereichte Änderung; aufgerufene Hinweis-ID und Version; Überspringgrund; gegebenenfalls Bezug auf eine Elternprüfung |
| Elternprüfung | Fall-ID; Ergebnis „Schreibweise akzeptiert“, „Markierung bestätigt“ oder „weiter ungeklärt“; gegebenenfalls korrigierte Zielschreibweise/Kategorie; kurze Begründung; Zeitpunkt |
| Empfehlung | Kind; Regel-ID und Version; Zeitraum; zugrunde liegende Fall-/Aufgabenzahlen; Begründung; Förderziel; vorgeschlagene Übung; Status „neu“, „zurückgestellt“ oder „Aufgabe angelegt“ |
| Zugewiesene Aufgabe | Aufgaben-ID; Kind; Bezug zur Empfehlung, falls vorhanden; Übungsart; Materialversion und konkrete Zielwörter; Umfang; vereinbarte Maximal-Coins; Zustand; Wortergebnisse; bisher ausgezahlter Betrag |
| Coinbuchung | Bestehende Kontobuchung mit zusätzlichem Aufgabentyp, Aufgabenbezug und eindeutigem Vergütungsvorgang; positive Differenz und Zeitpunkt |
| Katalogeintrag | Stabile Regel-ID; Version; Förderbereich; Voraussetzungen; zulässige Varianten; Hinweise; Elterntext; passende geprüfte Materialien; fachlicher Prüfstand |

### 8.1 Zustände eines Wortfalls

Bearbeitungszustände: `markiert`, `in Bearbeitung`, `verbessert`, `ungelöst zurückgestellt`, `Text geändert/entfernt`.

Prüfstatus separat: `automatisch vermutet`, `geprüfte Aufgabenreferenz`, `beanstandet`, `von Eltern als Fehler bestätigt`, `als zulässig/App-Fehler geklärt`, `weiter ungeklärt`.

Die Historie bleibt erhalten, während der aktuelle Zustand wechselt. „Beanstandet“ unterbricht die Bearbeitung an dieser Stelle, ohne sie als gelöst zu werten. Bei späterer Wiederaufnahme kann die Stelle verbessert werden; eine offene Elternprüfung wird dadurch nicht stillschweigend überschrieben.

### 8.2 Identität und Zählung

**R18 – Konsistente Speicherung:** Eine Fall-ID gehört zu einem konkreten Wortvorkommen, nicht allein zum Wortlaut oder zur Zeichenposition. Identische Wörter an zwei Stellen sind zwei Vorkommen; fünf Prüfklicks auf dieselbe Stelle bleiben ein Fall. Positionsverschiebungen durch Einfügen von Text dürfen die Zuordnung nicht zerstören.

Der Entwicklungsplan muss ein Verfahren für Textrevisionen und Wiedererkennung festlegen. Bei mehrdeutiger Zuordnung wird der alte Fall nachvollziehbar beendet und die neue Bewertung als solche kenntlich gemacht; eine bloße technische Neuzuordnung darf keinen vermeintlichen Lernrückschritt erzeugen. Späte Ergebnisse einer Onlineprüfung gehören nur zur geprüften Revision und zum richtigen Kinderprofil.

Gespeichert werden fachlich relevante Prüf- und Hilfsereignisse, kein lückenloses Tastaturprotokoll. Wortfälle entstehen bereits beim Prüfen des Entwurfs und werden beim Abschluss mit dem Eintrag verknüpft. Ein verlassener Entwurf ist zunächst „unterbrochen“, nicht „verweigert“.

### 8.3 Zustände einer zugewiesenen Aufgabe

Eine Aufgabe beginnt als `angeboten`, wird mit dem ersten Bearbeitungsschritt `begonnen` und kann `pausiert` werden. Wenn alle Zielwörter bearbeitet oder einzeln zurückgestellt wurden, ist sie entweder `vollständig bearbeitet` oder `mit offenen Wörtern abgeschlossen`. Letzteres darf nicht als vollständig erbrachte Lernleistung erscheinen. Eine Pause ist keine pauschale Überspringaktion und löst keine Abschlussvergütung aus.

Das Kind kann offene Wörter wieder aufnehmen; der Aufgabenbezug und der bereits ausgezahlte Betrag bleiben erhalten. Von Eltern zurückgenommene Aufgaben erscheinen als `zurückgenommen` mit ihrem bisherigen Verlauf. Ein technischer Zustand wie „Aufgabenansicht geschlossen“ darf nicht automatisch „erledigt“ oder „abgebrochen wegen Überforderung“ bedeuten.

## 9. Speicherung, Sichtbarkeit und Bestandsdaten

**R19 – Bestandsschutz:** Neue Informationen werden in die vorhandene lokale Familien-/Kinderspeicherung und deren Sicherungs- und Wiederherstellungswege integriert. Die bestehende Verschlüsselung der Ordnerdaten wird genutzt. Neue Datenstrukturen werden versioniert und bei Bestandsprofilen mit leeren Werten ergänzt.

Alte Einträge behalten ihre bisherigen Zahlen. Fehlende Einzelereignisse werden nicht erfunden; neue Quoten beginnen mit dem verfügbaren Detailzeitraum. Alte Guthaben, Wochenabrechnungen, Shops, Aufgabenhistorien und Einstellungen dürfen nicht neu berechnet oder zurückgesetzt werden. Neue Buchungen und der dazugehörige Aufgabenstand müssen als konsistenter Zustand gespeichert und wiederhergestellt werden.

Der Entwicklungsplan muss Datenmengen und Aufbewahrung festlegen. Mindestanforderung: Die angezeigten Vergleichszeiträume sind vollständig nachvollziehbar; offene Prüfungen und noch relevante Vergütungsbelege verschwinden nicht durch eine pauschale Kürzung der Historie. Scheitert das Speichern, darf die Oberfläche keine gesicherte Protokollierung oder Coinbuchung behaupten.

Eltern erhalten standardmäßig Zusammenfassungen und vorhandene freigegebene Übungswörter. Vollständige Tagebuchtexte werden nicht geöffnet. Für die Prüfung einer privaten Tagebuchstelle kann das Kind gezielt das betreffende Wort und bei Bedarf einen kleinen Kontextausschnitt teilen. Ohne ausreichenden Kontext darf die Stelle ungeklärt bleiben. Bei zugewiesenen Diktaten sind Aufgabenmaterial und dazugehörige Antworten im Elternbereich prüfbar.

Eltern werden im vorhandenen Elternbereich auf neue offene Fälle hingewiesen. Die bestehende Glocke für App-Neuerungen bleibt eine Änderungshistorie. Neue Einzelwortmeldungen werden nicht automatisch über ntfy verschickt. Bereits vorhandene Berichte müssen künftig zwischen „selbst verbessert“ und „offengelassen“ unterscheiden; private Wortformen gehören nicht in externe Meldungen.

Eine technische Speicherung allein macht die PIN nicht zu einer stärkeren Zugriffssicherung. Die bestehenden Hinweise zu lokalem Sichtschutz und Datensicherung bleiben zutreffend.

## 10. Alltagstaugliche Bedienung als Voraussetzung

Die Prüfung der Desktop-Oberfläche mit einem künstlichen Testprofil zeigte verteilte Elterneinstellungen, eine umfangreich wirkende Kinderansicht und einen umständlichen Wechsel zwischen markierter Textkopie und bearbeitbarem Original. Eine Rückmeldung aus tatsächlicher Familiennutzung bestätigte die beschriebenen Schwierigkeiten. Diese Rückmeldung begründet die Priorität der folgenden Anforderungen; sie ist kein repräsentativer Nutzertest und kein Nachweis über Motivation oder Lernwirkung.

Die Bedienanforderungen haben im Entwicklungsplan Priorität. Vor dem Ausbau der Elternauswertung und Aufgabenverwaltung sollen die grundlegenden Abläufe verständlich gestaltet und mit Eltern und Kindern überprüft werden. Die bestehenden Mengen- und Belohnungsregeln aus R01 bleiben dabei erhalten.

### 10.1 Geführte Einrichtung für Eltern

**R21 – Zusammenhängende Konfiguration:** Eltern werden durch die Einrichtung des Kindes, die Schreibanforderungen und die Belohnungen geführt. Zusammenwirkende Einstellungen stehen gemeinsam zur Verfügung: gesamte Wortanzahl, Satzanzahl und die Mindestlänge eines zählbaren Satzes. Die Oberfläche erklärt das daraus entstehende Tagesziel in einem Satz und anhand eines Beispieltexts.

Eine Vorschau zeigt die Coins für diesen Beispieltext nach der tatsächlich eingestellten Formel sowie die Bedingung und den Zeitpunkt der Gutschrift. Sie hilft, Shop-Preise einzuordnen, ohne eine tägliche Schreibleistung oder die Dauer bis zu einer Belohnung zu garantieren. Bestehende Werte werden übernommen; der Ablauf setzt keine neuen Vorgaben ungefragt ein. Technische Einstellungen bleiben erreichbar, stehen aber nicht zwischen den zusammengehörigen Entscheidungen zum Schreibziel.

### 10.2 Eine handlungsorientierte Elternübersicht

**R22 – Verständliche Zusammenfassung:** Die erste Ansicht beantwortet drei Fragen: „Was klappt bereits?“, „Wo braucht mein Kind Hilfe?“ und „Was können wir ausprobieren?“. Sie verwendet Alltagssprache und passende Wortbeispiele. Fachbegriffe, Fallverläufe und ausführliche Tabellen stehen in einer aufklappbaren Vertiefung.

Eine begründete Empfehlung führt unmittelbar zum passenden Aufgabenvorschlag. Eltern sehen Material, Umfang und Coinbetrag vor dem Anlegen. Sie müssen nicht erst eine Fehlerklasse fachlich diagnostizieren oder sämtliche Wortfälle einzeln abarbeiten. Offene Prüfungen werden zusammengefasst angeboten; bei unzureichenden Daten wird keine Erfolgsaussage erfunden. Ungeklärte Bewertungen blockieren weder die sonstige Elternansicht noch das Kindertagebuch.

### 10.3 Eine klare Hauptaufgabe für das Kind

**R23 – Konzentrierte Schreibansicht:** Das eigene Schreiben bildet den sichtbaren Einstieg. Zusätzliche Fragen werden als freiwillige Ideen angeboten und bei Bedarf geöffnet. Schon vor dem Öffnen ist erkennbar, dass sie keine weiteren Pflichtfelder sind. Bereits eingegebene Antworten bleiben beim Ein- und Ausblenden erhalten und zählen weiterhin nach den bestehenden Regeln.

Das Kind erkennt sein aktuelles Schreibziel, den erreichten Stand und die nächste mögliche Handlung. Hinweise erscheinen dort, wo sie gebraucht werden. Bilder, Emojis und eigene Themen bleiben verfügbar. Die Gestaltung soll für ein zehnjähriges Kind verständlich sein; Spaß oder Ehrgeiz werden nicht allein aus einer spielerischen Darstellung abgeleitet. Die Desktop-Prüfung ist kein Nachweis der Nutzbarkeit auf einem Smartphone.

### 10.4 Direkte Korrektur und sichtbarer Fortschritt

**R24 – Zusammenhängende Bearbeitung:** Die Auswahl eines markierten Wortes führt unmittelbar zu dessen Bearbeitung, etwa direkt im Text oder in einem fokussierten Worteditor. Das Kind muss nicht dieselbe Stelle in einer zweiten Textdarstellung suchen. Jede Änderung landet im Original; eine veraltete Prüfkopie darf nicht als aktueller Stand erscheinen. Tipp, Änderungsmöglichkeit und Einzelwort-Klärung gehören sichtbar zusammen.

Rückmeldungen würdigen konkrete beobachtete Leistungen, etwa eine selbst verbesserte Stelle oder einen abgeschlossenen Eintrag. Ungeklärte Wörter erscheinen nicht als gelöst. Gesammelte Wochen-Coins und verfügbares Guthaben werden eindeutig beschriftet; die bestehenden Gutschriftregeln bleiben erhalten. Eine gewählte Wunschbelohnung kann den Fortschritt anschaulich machen, ohne ausstehende Coins als schon ausgebbar darzustellen.

## 11. Anknüpfungspunkte für den Entwicklungsplan

**R25 – Bestandskompatibilität und Hilfen nach Updates:** Bestehende Familien sollen die App nach einem Update weiter nutzen können. Fehlen Voraussetzungen, erscheinen konkrete Schritte für Eltern und ein kurzer verständlicher Hinweis für das Kind. Auch ein fehlgeschlagener Programmstart erhält eine Fehleranzeige mit Wiederherstellungshinweisen. Unbekannte neuere Datenformate werden nicht stillschweigend überschrieben. Ein Hinweis darf Datenverlust oder erfolgreiche Sicherung nicht ohne Prüfung behaupten.

Die spätere Planung kann die Arbeit in folgende fachlich zusammenhängende Pakete aufteilen. Das ist eine Abhängigkeitsübersicht, keine Aufwandsschätzung oder bereits beschlossene Releasefolge.

| Paket | Anforderungen | Bestehende Anknüpfungspunkte | Ergebnis und Abhängigkeit |
| --- | --- | --- | --- |
| U: Verständliche Grundabläufe | R21–R24, R01 | Elternnavigation und Einstellungen, Schreibansicht, `renderResult`, Coin-Anzeigen | Zusammenhängende Einrichtung, einfache Übersicht und direkte Wortbearbeitung. Bedienentwurf zuerst überprüfen; Umsetzung mit B/C verzahnen, bevor D/E die Oberfläche erweitern. |
| A: Fachlicher Katalog und Materialqualität | R07, R11, R12 | `fineCats`, `errCats`, `CAT_GROUPS`, `TRICK`, `app/uebungen.js`, Wiederholungslogik | Versionierter Katalog, geprüfte Beispiele und Aufgaben. Grundlage für verlässliche Empfehlungen. |
| B: Wortfälle und Speicherung | R06, R18, R19 | `newSession`, `load`, `save`, Entwurfs- und Ordnerspeicherung | Dauerhafte Fälle, Ereignisse, Zuordnung zu Textrevisionen und Migration. Voraussetzung für C und D. |
| C: Kindgerechte Wortklärung | R04, R05, R09, R10 | `runCheck`, `renderResult`, `finish`, Wort-/Kurz-Diktate | Einzelwort-Aktionen, Wiederaufnahme und korrekte Abschlussmeldungen; nutzt B und Katalogstände aus A. |
| D: Elternprüfung und Statistik | R08, R13, R14 | `renderErrStats`, `renderPracticeStats`, `catCounts`, Wochenbericht | Prüfansicht, belastbar beschriftete Kennzahlen und begründete Empfehlungen; nutzt A bis C. |
| E: Zugewiesene Diktate und Extra-Coins | R02, R03, R15–R17 | `P`, `weakCats`, `renderPractice`, Diktatabschlüsse, `R`, Kontobuchungen | Aufgabenverwaltung, Zielmaterial, konfigurierbare Vergütung und Doppelbuchungsschutz; nutzt A, B und D. |
| F: Dokumentation und Veröffentlichung | R01, R20 | `Tagebuch.html`, README, CHANGELOG, Update-Skripte und Tests | Eltern-/Kinderhilfe, sichtbare Grenzen, Migrationstests und gemeinsame Veröffentlichung der Programmdateien. |

Die Fachlogik für Einordnung, Auswertung und Vergütung sollte unabhängig von der Oberfläche prüfbar werden. Ob dafür eigene Module entstehen, entscheidet der Entwicklungsplan. Ein neues Framework oder ein Server ist dafür nicht erforderlich.

**R20 – Dokumentation:** Bei der Umsetzung werden Elternhilfe, relevante Kinderhilfe, README und verständlicher Changelog gemeinsam aktualisiert. Erst eine tatsächliche App-Veröffentlichung erhält eine neue App-Version, generierte Glocken-Historie und ein neues Update-Manifest. Das vorliegende Konzept ist eine reine Dokumentationsänderung.

## 12. Akzeptanzkriterien und notwendige Prüfungen

Die folgenden Kriterien sollen in konkrete Entwicklungsaufgaben und passende automatisierte beziehungsweise manuelle Prüfungen überführt werden. Sie sind noch keine ausgeführten Tests.

| ID | Prüfsituation | Erwartetes Ergebnis |
| --- | --- | --- |
| AK01 | Bestandsprofil wird aktualisiert. | Schreibziele, Tagebuchvergütung, Wochenregeln, Guthaben und vorhandene Daten bleiben erhalten; R01/R19. |
| AK02 | Kind lässt ein Wort ungelöst. | Nur dieses Vorkommen wird zurückgestellt; Original bleibt, andere Markierungen bleiben bearbeitbar; R04/R05/R09. |
| AK03 | Gleicher Text wird mehrfach geprüft; Text wird davor eingefügt. | Kein Zuwachs allein durch Prüfklicks; Fall und Überspringstatus bleiben korrekt zugeordnet; R18. |
| AK04 | Dasselbe Wort kommt an zwei Stellen vor. | Offenlassen einer Stelle wirkt nicht auf die andere; R09/R18. |
| AK05 | Kind beanstandet eine vermutlich falsche Bewertung. | Fall erscheint separat zur Prüfung; keine automatische Autokorrektur, Fehlerbestätigung oder Löschung aus der Historie; R06/R11. |
| AK06 | Eintrag erfüllt Schreibziel, enthält aber zurückgestellte Wörter. | Abschluss möglich; Meldung und Elternzahlen unterscheiden korrigierte und offene Stellen; R10. |
| AK07 | Kind bearbeitet eine offene Stelle später oder entfernt den Satz. | Verbesserung beziehungsweise Textänderung werden korrekt unterschieden; keine nachträglich erfundene Korrekturleistung; R13/R18. |
| AK08 | App wird geschlossen, neu geladen oder ein anderes Kind gewählt. | Verlauf bleibt beim richtigen Kind; verspätete Prüfergebnisse und Vergütungen wechseln nicht das Profil; R18/R19. |
| AK09 | Eine Klasse hat Regeln, Gegenbeispiele und zulässige Varianten. | Beispielsweise „Eis“, „zum Spielen“, Mehrbuchstabenschreibungen und gültige Varianten werden fachlich korrekt behandelt; R11/R12. |
| AK10 | Zielwort oder Kontext ist unklar; Eltern bestätigen einen App-Fehler. | Unsicherheit sichtbar; kein gesicherter Förderbedarf daraus; bestätigter App-Fehler wird aus der Kinderfehlerauswertung ausgeschlossen; R11/R13. |
| AK11 | Schreibmenge sinkt oder es existieren nur Altdaten. | Keine behauptete Verbesserung allein durch kleinere Fallzahl; fehlende Detaildaten bleiben fehlend; R13/R19. |
| AK12 | Eltern erhalten eine Empfehlung. | Zahlen, Zeitraum, Einschränkungen und Übungsbezug sind nachvollziehbar; keine LRS- oder Motivationsdiagnose; R08/R14. |
| AK13 | Eltern weisen eine Diktataufgabe zu. | Kind sieht Ziel, Umfang und Coinvereinbarung; Tagebuchabschluss bleibt ohne Diktat möglich; R02/R15/R16. |
| AK14 | Aufgabe wird teilweise bearbeitet, vollständig übersprungen oder falsch begonnen und mit Hilfe bearbeitet. | Ergebnis und anteilige Coins folgen der übernommenen Regel P1; keine Belohnung für reine Klicks und kein Fehlerfreiheitszwang; R16/R17. |
| AK15 | Aufgabe wird erneut geöffnet, nachbearbeitet oder nach Neuladen abgeschlossen. | Keine doppelte Auszahlung; nur positive Differenz bis zum vereinbarten Höchstbetrag; R17. |
| AK16 | Beanstandete Aufgabenbewertung wird später zugunsten des Kindes geklärt. | Statistik wird berichtigt, gegebenenfalls fehlender Coinanteil einmalig ergänzt; keine automatische Rücknahme früherer Gutschriften; R16/R17. |
| AK17 | Browser- und Ordnerspeicherung, Sicherung und Wiederherstellung werden mit Testprofilen verwendet. | Wortfälle, Prüfungen, Aufgaben und Kontobuchungen bleiben konsistent; Speicherfehler werden erkennbar; R19. |
| AK18 | Eltern prüfen einen Tagebuchfall; externe Berichte sind aktiviert. | Kein pauschaler Zugriff auf private Texte; kein neuer Versand von Wortformen oder Textausschnitten; R19. |
| AK19 | Eigene Übungswörter erreichen die langfristige Wiederholungsstufe. | Vorgesehene Wiederholung wird tatsächlich angeboten; vorzeitiges Entfernen verfälscht den Lernstand nicht; R12. |
| AK20 | Neue Version wird veröffentlicht. | Relevante Hilfen, Changelog, Versionsangabe, generierte Historie und Manifest passen zum umgesetzten Funktionsumfang; R20. |
| AK21 | Eltern richten ein Schreibziel und eine Belohnung ohne pädagogisches Vorwissen ein. | Sie können anhand der gemeinsamen Vorschau erklären, welcher Text das Ziel erfüllt, welche Coins er bringt und wann diese verfügbar werden; bestehende Werte bleiben erhalten; R21/R01. |
| AK22 | Eltern öffnen die Übersicht und möchten eine passende Übung anbieten. | Sie finden eine begründete Handlung ohne Fachbegriffe voraussetzen oder alle Fälle einzeln prüfen zu müssen; Material und Coinbetrag sind vor der Zuweisung sichtbar; R22. |
| AK23 | Ein Kind öffnet die Schreibansicht erstmals und verwendet freiwillige Fragen. | Es erkennt die Hauptaufgabe und die Freiwilligkeit der Fragen; Ein-/Ausblenden verliert keine Antworten und ändert keine Anforderungen; R23. |
| AK24 | Ein Kind wählt eine markierte Stelle und prüft anschließend seinen Fortschritt. | Es kann dort unmittelbar bearbeiten, Hinweise nutzen oder genau dieses Wort offenlassen; Original und Prüfstand bleiben konsistent. Gelöste/offene Stellen sowie gesammelte/verfügbare Coins sind unterscheidbar; R24. |
| AK25 | Ein Bestandsprofil wird nach dem Update geöffnet; eine Voraussetzung oder Programmdatei fehlt oder ein neueres Datenformat wird geladen. | Kompatible Daten bleiben nutzbar. Bei Problemen erscheinen konkrete Elternschritte und verständliche Kinderhinweise statt einer leeren Seite; unbekannte Daten werden nicht überschrieben; R25. |

Prüfstrategie: fachlich geprüfte Positiv-/Negativbeispiele für den Regelkatalog; Tests der Zustände, Kennzahlen, Migration und Coinbuchungen; Browserprüfungen der Kinder-/Elternabläufe mit ausschließlich künstlichen Testdaten. Vorhandene Update-, Shop- und Sprachausgabeprüfungen werden entsprechend der betroffenen Funktionen einbezogen. Zusätzlich sind eine pädagogische Durchsicht der Hinweise und beobachtete Bedienversuche mit Eltern und Kindern erforderlich. Bei Letzteren zählen auch Suchwege, Rückfragen und Fehlinterpretationen; technisch erfolgreiche Klicks reichen für AK21–AK24 nicht aus. Technisch bestandene Tests belegen keine therapeutische Wirksamkeit.

## 13. Planungsannahmen und noch zu konkretisierende Entscheidungen

Die bestätigten Anforderungen aus Abschnitt 1 bleiben die Grundlage. Für den Entwicklungsplan sind insbesondere folgende Punkte explizit zu entscheiden; daraus folgt keine erneute Freigabe bereits vereinbarter Anforderungen:

| Punkt | Vorschlag beziehungsweise notwendige Konkretisierung |
| --- | --- |
| P1: Vergütung teilweise bearbeiteter Aufgaben | Anteilig nach Zielwörtern gemäß Abschnitt 7; genaue Abschlusszustände für beide Diktatarten anhand von Beispielen festlegen. |
| P2: Zeitpunkt der neuen Aufgabenvergütung | Separate Gutschrift beim Aufgabenabschluss; bestehende Tagebuch-Wochenregel bleibt bestehen. |
| P3: Aufbewahrung der neuen Detaildaten | Vergleichszeiträume, Umfang der Ereignishistorie und Umgang mit abgeschlossenen Fällen festlegen; offene Prüfungen und Vergütungsbelege schützen. |
| P4: Auslöseregeln für Empfehlungen | Mindestdatenmenge, verschiedene Wörter/Tage und verlässliche Zuordnung gemeinsam festlegen und an Beispieldaten prüfen. Keine aus der Luft gegriffenen Schwellen als wissenschaftlich validiert ausgeben. Ohne ausreichende Grundlage nur Beobachtung anzeigen. |
| P5: Fachliche Freigabe | Zuständigkeit für Regelkatalog und Aufgabenmaterial sowie den geprüften Startbestand bestimmen. Fundstellen und Versionen dokumentieren. |
| P6: Lieferumfang je Version | Wort-Diktat und Kurz-Diktat zusammen oder in klar getrennten Stufen; die Regeln für Wortfälle und Vergütung gelten konsistent. |

Der daraus erstellte Entwicklungsplan sollte pro Paket Anforderungen, Datenänderungen, Akzeptanzkriterien, fachliche Abhängigkeiten, Tests und Dokumentationsumfang aufführen. Empfehlungen werden erst aktiviert, wenn ihre zugrunde liegenden Fälle und Regeln verlässlich ausgewertet werden können.

## 14. Fachliche Grundlage und Grenzen der bisherigen Recherche

Das Konzept beruht auf den vereinbarten Produktzielen, der Prüfung des aktuellen App-Stands und allgemeinen Grundsätzen gezielter Rechtschreibförderung. Es behauptet keine bereits nachgewiesene Lernwirkung der App. Die Kategorien beschreiben Schreibbeobachtungen und Förderansätze; sie ersetzen keine standardisierte Diagnostik.

Als bekannte Hintergrundliteratur wurden berücksichtigt:

- Galuschka et al. (2014): *Effectiveness of Treatment Approaches for Children and Adolescents with Reading Disabilities: A Meta-Analysis of Randomized Controlled Trials*. [DOI: 10.1371/journal.pone.0089900](https://doi.org/10.1371/journal.pone.0089900).
- Galuschka und Schulte-Körne (2016): *The Diagnosis and Treatment of Reading and/or Spelling Disorders in Children and Adolescents*. [DOI: 10.3238/arztebl.2016.0279](https://doi.org/10.3238/arztebl.2016.0279).

Eine aktuelle vertiefte Online-Literaturrecherche konnte in dieser Umgebung wegen blockierter Fachseiten nicht abgeschlossen werden. Diese Quellen wurden hier nicht erneut vollständig abgerufen. Sie validieren weder die konkreten Hinweisschwellen noch das Coinmodell. Vor Umsetzung des Regelkatalogs sind die Schreibregeln anhand des maßgeblichen amtlichen Regelwerks und die Förderhinweise fachlich zu prüfen.

Lokale Grundlagen: [Programmabläufe](../app/app.js), [Übungsdaten](../app/uebungen.js), [bestehende Oberfläche und Hilfe](../Tagebuch.html), [Entwicklungs- und Veröffentlichungshinweise](../README.md#entwicklung).
