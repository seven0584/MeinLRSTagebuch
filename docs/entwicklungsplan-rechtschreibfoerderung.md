# Entwicklungsplan: Rechtschreibförderung und einfache Bedienung

Stand: 14. Oktober 2026. Grundlage: [Konzept 1.1](konzept-rechtschreibfoerderung.md), R01–R25 und AK01–AK25. Zielversion: 1.3.0. Die Implementierung wird zunächst auf dem separaten Branch `dev` zum Testen bereitgestellt; `main` bleibt unverändert. Programmdateien und Manifest werden gemeinsam übernommen. Die [Testanleitung](testfassung-dev.md) erklärt Download und Erprobung. Der [Prüfbericht](pruefbericht-1.3.0.md) dokumentiert ausgeführte Prüfungen und offene Validierungen. Die Freigabe als reguläres Update steht noch aus.

## Produktentscheidungen

- Bestehende Schreibziele, Tagebuch-Coins, Wochenabrechnung, Joker und Spiele bleiben erhalten.
- P1: zusätzliche Aufgaben-Coins anteilig nach vollständig bearbeiteten Zielwörtern; falscher Erstversuch mit anschließender Bearbeitung zählt. Nur übersprungene Wörter zählen nicht. Zulässige beanstandete Antworten können Eltern anerkennen.
- P2: separate Gutschrift beim Aufgabenabschluss; spätere Ergänzungen nur als positive Differenz. Pro zugewiesener Aufgabe gilt eine feste Obergrenze. Keine automatische nachträgliche Kürzung.
- P3: in dieser Version keine automatische Löschung der neuen Detaildaten. Speicherung und Sicherung übernehmen sie vollständig; Speicherfehler müssen sichtbar werden.
- P4: automatische Mustervorschläge erst bei wiederholten, zuordenbaren, nicht beanstandeten Beobachtungen an mindestens drei verschiedenen Wörtern an mindestens zwei Tagen. Das ist eine vorsichtige Produktheuristik, keine diagnostisch validierte Schwelle. Eltern können geprüfte Übungen jederzeit selbst anbieten.
- P5: kleiner, redaktionell durchgesehener Startbestand mit Regelbeispielen und Gegenbeispielen. Keine Behauptung einer externen fachlichen Zertifizierung. Die bekannte falsche Bestandsvorlage und unvollständige Regeln werden berichtigt. Eine externe pädagogische Durchsicht bleibt eine offene Validierung.
- P6: Wort-Diktate und kurze Text-Diktate werden gemeinsam unterstützt. Aufgaben bleiben freiwillig, mit eigenem gespeicherten Verlauf.
- Ergänzung aus der Rückmeldung während der Umsetzung: Bestandsdaten bleiben kompatibel. Bei fehlenden Voraussetzungen oder Startproblemen nach einem Update müssen Eltern konkrete Handlungsschritte und Kinder einen verständlichen Hilferuf sehen. Unbekannte neuere Datenformate dürfen nicht stillschweigend überschrieben werden.

## Arbeitspakete und Reihenfolge

| Paket | Umsetzung | Abnahme |
| --- | --- | --- |
| 1. Fachkern | Eigenes Modul für Katalog, Wortfälle, Aufgaben, Statistik und Vergütung; stabile Kennungen; konservative Einordnung. | AK03–AK05, AK07, AK09–AK12, AK14–AK16, AK19 |
| 2. Einfache Bedienung | Zusammenhängende Elterneinrichtung mit Vorschau; freiwillige Fragen einklappbar; direkte Wortbearbeitung; eindeutige Coin-Anzeigen. | AK21–AK24 |
| 3. Wortklärungen | Einzelne Wortstelle ungelöst oder beanstandet zurückstellen; Verlauf vor Abschluss speichern; Wiederaufnahme; ehrliche Abschlussmeldungen. | AK02–AK08 |
| 4. Elternbereich | Zusammenfassung in Alltagssprache, Detailansicht, Kontextfreigabe durch das Kind, Elternprüfung, nachvollziehbare Empfehlungen. | AK10–AK12, AK18, AK22 |
| 5. Zusatzaufgaben | Geprüfte Materialvorschau, Elternzuweisung, Wort-/Text-Diktat, Pausen, Einzelwortklärung, konfigurierbare Coins und wiederholbarer Abschluss ohne Doppelvergütung. | AK13–AK17 |
| 6. Bestand und Speicherung | Bestehende Profile ergänzen; Altdaten gesondert anzeigen; Browser-/Ordnerspeicherung und Sicherung prüfen; späte Antworten dem richtigen Kind zuordnen; verständliche Update-/Startfehlerhinweise. | AK01, AK08, AK11, AK17, AK25 |
| 7. Dokumentation und Release | Eltern-/Kinderhilfe, README, Changelog, Version, Offline-Historie und Manifest gemeinsam aktualisieren. | AK20 |

## Technischer Ansatz

`app/learning-core.js` enthält die unabhängig testbare Fachlogik. `app/learning-ui.js` stellt die neuen Oberflächen bereit und verwendet einen schmalen Adapter zur bestehenden App. `app/app.js` integriert Wortfälle, direkte Korrektur, Statusmeldungen und Speicherung. Neue Felder liegen je Kind unter `learning`; bestehende Daten werden nicht nachträglich detailliert interpretiert.

Eine Wortmarkierung gehört zu einem konkreten Vorkommen. Textrevisionen werden über Wortfolgen abgeglichen; mehrdeutige Änderungen bleiben vorsichtig als Textänderung erfasst. Aufgerufene Hinweise sind Beobachtungen, kein Nachweis des Verstehens. Aufgaben speichern ihre Zielwörter und vereinbarte Belohnung beim Anlegen. Kontobuchungen und Aufgabenstand werden zusammen gespeichert.

## Prüfplan

1. Fachkern: richtige/falsche Schreibweisen und zulässige Varianten; Kategorisierung; Wiedererkennung bei Einfügungen, Löschungen und gleichen Wörtern; Hinweise, Beanstandungen und Elternprüfungen; Statistikgrenzen; Aufgabenabrechnung einschließlich nachträglicher Anerkennung.
2. Integration im Browser: Eltern-PIN, Kinderwechsel, Einrichtungsvorschau, direkte Korrektur, Speichern mit offenen Wörtern, Wiederaufnahme nach Neuladen, private Kontextfreigabe, Aufgaben beider Arten und Doppelbuchungsschutz.
3. Fehlerfälle: fehlende Stimme, Offline-Prüfung, verspätete Onlineantworten, fehlgeschlagene Speicherung, Sicherung/Wiederherstellung und bestehende Profile.
4. Regression: vorhandene Update-, Shop- und Sprachausgabetests; Syntax- und Manifestprüfungen.
5. Zielgruppengerechte Bedienung: konkrete Aufgaben aus AK21–AK24 mit Testprofilen und Sichtprüfung auf üblichen Laptopgrößen; verständliche Texte und erkennbare freiwillige Schritte. Dies ersetzt keine Beobachtung echter Eltern/Kinder und belegt keinen Spaß oder Lernzuwachs.

Alle Prüfungen arbeiten mit künstlichen Daten. Ein abschließender Bericht nennt tatsächlich ausgeführte Prüfungen, Ergebnisse und verbleibende Grenzen. Es wird keine vollständige Fehlerfreiheit oder pädagogische Wirksamkeit behauptet.
