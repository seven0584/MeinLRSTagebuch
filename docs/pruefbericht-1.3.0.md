# Prüfbericht zur vorbereiteten Version 1.3.0

Stand: 14. Oktober 2026. Ausgangsbasis: `646dd49` / App 1.2.1. Neue Programmkennung: Version 1.3.0, Release 6. Dieser Bericht bezieht sich auf den Arbeitsstand einschließlich der neuen Dateien, nicht auf ein bereits veröffentlichtes GitHub-Release.

## Ergebnis und Grenzen

Die vereinbarten neuen Abläufe sind implementiert. 32 Fachkern- und Update-Tests sowie fünf Browser-Testprogramme bestehen. Die Prüfung verwendet ausschließlich künstliche Profile. Bestehende Tagesziele, Wochenvergütung, Joker, Pausen, Shop und freie Übungen behalten ihre Regeln. Die neue Vergütung gilt nur für angebotene Elternaufgaben.

Eine vollständige Fehlerfreiheit ist damit nicht bewiesen. Beobachtete Bedienversuche mit echten Eltern und zehnjährigen Kindern, die Beurteilung der hörbaren Stimmen unter Windows/macOS und eine unabhängige pädagogische Durchsicht stehen aus. Die fachlichen Regeln wurden während der Umsetzung anhand konkreter Beispiele durchgesehen; daraus folgt keine klinische Validierung, LRS-Diagnostik oder belegte Lernwirkung. Es wurde für diese Umsetzung keine erfolgreiche neue externe Literaturrecherche durchgeführt.

## Ausgeführte technische Prüfungen

Umgebung: Linux, Node.js 22, Python 3, Playwright und Chromium (`/usr/bin/chromium`). Die Browserprogramme starten jeweils eigene lokale Testserver. Plattformnamen und Stimmen werden bei den Sprachausgabetests simuliert.

| Prüfung | Ergebnis und Nachweis |
| --- | --- |
| `node --test tests/learning-core.test.cjs` | 20 Tests bestanden: Wortidentität, Wiederaufnahme, unsichere Vorschläge, Hinweise, Elternprüfung, Empfehlungen, Aufgabensperren, Abrechnung, ältere offene Fälle und Wiederholungsabstände. |
| `node --test tests/update-core.test.cjs` | 12 Tests bestanden: Manifest, Offline-Historie, zulässige Dateien, Prüfsummen, Abbruch, Wiederherstellung und Schutz persönlicher Dateien. |
| `node tests/learning-browser.cjs` | Einrichtungsvorschau, getrennte Kinderprofile, Aufgaben vor Beginn ändern, private/geteilte Wortstellen, direkte Korrektur, Abschluss mit offenen Wörtern, Wort-/Text-Diktate, Pausen, Neuladen, Gutschrift ohne Doppelzahlung und echte verschlüsselte Sicherung/Wiederherstellung bestanden. |
| `node tests/learning-storage-browser.cjs` | Import vorhandener Ordnerdaten und verschlüsseltes Speichern von Lernfällen, Aufgaben und Kontobuchungen bestanden. Unbekannte Konfigurationen, neuere Lernschemata und fehlende Kinddateien erzeugen Hinweise und **keine Dateischreibzugriffe**, auch bei älteren Ordner-Zeitstempeln. Datei-Handles werden simuliert; die App führt ihre tatsächliche Lese-, Schreib- und Verschlüsselungslogik aus. |
| `node tests/learning-edge-browser.cjs` | Zulässige Schreibweisen, je Kind getrennte Namen, Korrektur in eingeklappten Fragen, fehlende Stimme, direkt eingegebene Beanstandung, spätere Elternanerkennung, verspätete Onlineantwort und Profilwechsel bestanden. Ältere Einzelkind-Daten behalten Einträge, vorhandene Coins und konfigurierte Ziele. |
| `node tests/shop-browser.cjs` | Vorhandene Shop-Prüfung bestanden: automatische Speicherung, Artikel, Symbole, Validierung, Kinderwechsel und Neuladen. |
| `node tests/speech-browser.cjs` | Vorhandene Prüfung für simuliertes Windows und macOS bestanden: Stimmenwahl, Tempo, Hörprobe, Stoppen, spätere Stimmenverfügbarkeit, Ersatzstimme, Speicherung und Hilfelinks. |
| Syntax und Änderungen | `node --check` für JavaScript-Dateien unter `app/`; `git diff --check` ohne Befund. |
| Release-Vorbereitung | `node scripts/prepare-update.cjs`: 22 Programmdateien im Manifest, Release 6. Versionsdatei, Größen, Prüfsummen und generierte Glocken-Historie stimmen mit dem Arbeitsstand überein. |

Die Speicherfehlerprüfung lässt `Storage.setItem` gezielt einen `QuotaExceededError` auslösen. Ein tatsächlich volles Laufwerk wird dabei nicht hergestellt. Dabei bleiben gespeicherter Aufgabenstand und Kontobuchungen unverändert. Nach erfolgreichem Wiederholen wird der Anteil genau einmal gebucht. Das ist eine gezielte Fehlersimulation; kein vollständiger Test aller möglichen Laufwerks- und Browserfehler.

Der Starttest prüft eine fehlende `app/app.js`, ein unbekanntes neueres Browser-Datenformat und eine ältere/unvollständige HTML-Oberfläche mit neuem Hauptskript. Kinder erhalten den Hinweis, einen Erwachsenen zu holen. Eltern erhalten konkrete Schritte zum erneuten Laden der vollständigen Programmdateien und zum Erhalt der Datenordner. Das unbekannte Browserformat bleibt bytegleich erhalten. Wenn bereits die HTML-Datei gar nicht geöffnet werden kann oder JavaScript vollständig blockiert ist, ist ein dynamischer Starthinweis technisch nicht möglich; bei ausgeschaltetem JavaScript steht ein statischer Hinweis bereit.

## Abgleich mit den Akzeptanzkriterien

„Technisch geprüft“ bezeichnet die genannten automatischen und manuellen Sichtprüfungen. Es bedeutet keine abgeschlossene Freigabe durch Familien oder Fachleute.

| Kriterien | Umgesetzt und geprüft | Verbleibende Grenze |
| --- | --- | --- |
| AK01 | Vorhandene Ziele und Belohnungsregeln bleiben erhalten; Einzelkind- und Familienprofile werden ergänzt. | Keine Prüfung sämtlicher jemals veränderter privater Datenbestände. |
| AK02–AK07 | Einzelwortklärung, Originaltext, Beanstandung, Hinweise, tatsächliche Verbesserung und Textänderung werden getrennt erfasst. Gleich geschriebene Vorkommen werden nicht pauschal übersprungen. | Bei mehrdeutigen größeren Textumbauten wird vorsichtig eine Textänderung erfasst, statt eine sichere Korrektur zu behaupten. |
| AK08 | Pausen und Neuladen erhalten den Stand. Eine verspätete Onlineantwort verarbeitet nicht das andere Kinderprofil. | Zwei gleichzeitig schreibende App-Instanzen werden dadurch nicht zu einer synchronisierten Mehrbenutzeranwendung. |
| AK09 | Regeln mit Gegenbeispielen, eigene Satzkontexte und zulässige Beispiele wie „Eis“, „zum Spielen“, „Fotografie“ und „Photographie“ geprüft. Mehrdeutige Vorschläge bleiben unklar. | Der kleine neue Materialbestand ist keine extern zertifizierte Sammlung; die große alte Textsammlung wurde nicht vollständig neu redigiert. |
| AK10–AK12 | Vorläufige Zuordnung, Elternkorrekturen, getrennte Altdaten, Zahlen/Zeitraum und begrenzte Empfehlungsgrundlage sichtbar. Akzeptierte App-Fehler und offene Beanstandungen begründen keine Empfehlung. | Drei Wörter an zwei Tagen sind eine Produktheuristik, keine fachlich validierte Förder- oder Diagnosegrenze. |
| AK13–AK16 | Wort- und kurze Text-Diktate freiwillig; 0 Coins möglich; Anteil nach bearbeiteten Zielwörtern; Gutschrift erst bei Abschluss; spätere Ergänzung genau einmal; keine automatische Kürzung. | Ob ein Kind eine Regel verstanden hat oder absichtlich rät, lässt sich aus den Eingaben allein nicht zuverlässig bestimmen. |
| AK17 | Browserstand, verschlüsselte Sicherung und Ordnerabläufe geprüft; Schreibfehler sichtbar; unbekannte Ordner vor Änderungen abgewiesen. | Echte Dateiauswahldialoge und Betriebssystemberechtigungen auf Windows/macOS separat erproben. |
| AK18 | Neue private Wortstellen und zugehörige Übungswörter bleiben ohne Freigabe verborgen. Aufgabenantworten sind sichtbar. Neue Detailverläufe werden nicht in ntfy-Nachrichten eingebaut. | PINs sind ein Oberflächen-Sichtschutz. Die bestehenden Grenzen des Zugriffs auf den gesamten Datenordner bleiben. Kein Versand an einen echten ntfy-Kanal im Test. |
| AK19 | Eigene Übungswörter bleiben bis zur beantworteten 30-Tage-Wiederholung in der Wiederholung. | Kein Nachweis dauerhafter Beherrschung aus einer einzelnen richtigen Antwort. |
| AK20 | README, beide Hilfen, Changelog, Version, generierte Historie und Manifest aktualisiert. | Zunächst Testfassung auf `dev`; keine Übernahme nach `main` und kein reguläres Release. |
| AK21–AK24 | Elternaufgaben im Browser durchgespielt; Vorschau, verständliche Übersicht, eingeklappte Fragen, direktes Wortfeld und getrennte Coinanzeigen vorhanden. Sichtprüfung bei 1280 × 800, Layoutprüfung zusätzlich bei 1024 × 768; keine doppelt vergebenen Element-IDs. | **Zielgruppenabnahme offen:** Tests mit echten Eltern und Kindern müssen Suchwege, Verständnis, Frust, Bedienbarkeit und Motivation prüfen. |
| AK25 | Hinweise bei fehlenden/gemischten Programmdateien, unbekanntem Browserformat, neueren Ordnerdaten, fehlender Stimme und Speicherfehlern. Bestehende kompatible Daten bleiben verwendbar. | Keine Garantie für jede denkbare Beschädigung oder nicht mehr startende Browserinstallation. |

## Sichtprüfung und nächste Zielgruppenprüfung

Bei 1280 × 800 ist in der Kinderansicht das Hauptschreibfeld mit eingeklappten freiwilligen Fragen und der Prüfschaltfläche erkennbar. Verfügbare Coins und Wochen-Coins tragen unterschiedliche Beschriftungen. Die Elterneinrichtung zeigt die zusammengehörigen Werte und darunter ein konkretes Beispiel. In der Elternübersicht stehen die drei Förderfragen zuerst; weitere Statistik-/Speicherkarten sind einklappbar.

Die Screenshots sind lokale Prüfarbeitsdateien unter `/tmp` und enthalten ausschließlich Testnamen. Sie werden nicht als Nutzungsbeobachtung eines Kindes ausgegeben.

Für eine beobachtete Abnahme sind folgende Aufgaben vorbereitet:

1. Ein Elternteil legt ohne Erklärung ein erreichbares Tagesziel fest und erklärt anhand des Beispiels, wie viele Coins entstehen und wann sie verfügbar sind.
2. Es öffnet die Übersicht, erkennt eine unsichere App-Bewertung und bietet eine passende kurze Aufgabe mit einer selbst gewählten Belohnung an.
3. Ein zehnjähriges Kind schreibt einen kurzen Eintrag, erkennt die Freiwilligkeit der Fragen, verbessert ein Wort und lässt eine schwierige Stelle einzeln offen.
4. Das Kind findet später die Stelle, entscheidet bewusst über die Freigabe und kann verfügbare von noch nicht gutgeschriebenen Wochen-Coins unterscheiden.
5. Das Kind beginnt ein Diktat, pausiert, setzt fort und erklärt, warum offene Wörter noch keinen Coinanteil erhalten.

Festzuhalten sind benötigte Hilfe, Fehlbedienungen, Suchwege und die Erklärungen der Beteiligten. Spaß, Ehrgeiz und längerfristige Lernwirkung müssen beobachtet werden; automatisches Durchklicken kann sie nicht belegen.

## Veröffentlichung

Die Bereitstellung erfolgt zunächst ausschließlich auf dem Branch `dev` im Repository `seven0584/MeinLRSTagebuch`. Programmdateien, `app/version.js`, `app/changelog-data.js`, `updates.json`, Anleitungen, Plan, Prüfbericht und Tests gehören gemeinsam zu diesem Teststand. Persönliche Daten, temporäre Sicherungen und Screenshots gehören nicht ins Repository. Der [Testleitfaden](testfassung-dev.md) enthält Download und konkrete Prüfschritte. Eine Übernahme nach `main` oder ein reguläres GitHub-Release ist damit nicht verbunden.

Vor der Bereitstellung wurden die 32 Fachkern-/Update-Tests nach dem Ergänzen der Testanleitung und dem Neuerzeugen der Historie und des Manifests erneut erfolgreich ausgeführt. Eine ZIP aus dem Commit wurde auf Integrität und fehlende persönliche Daten geprüft, entpackt und über einen lokalen Testserver gestartet. Wörterbuch, Version 1.3.0 und die Testfassungs-Historie wurden ohne externe Netzwerkzugriffe geladen; es traten keine JavaScript-Laufzeitfehler auf. Die Testanleitung ist im Archiv enthalten.

Der zusätzliche Startversuch direkt per `file://` wurde von der Richtlinie des Cloud-Browsers mit `ERR_BLOCKED_BY_ADMINISTRATOR` verhindert. Ein erfolgreicher Start durch Doppelklick auf dem eigenen Windows-PC oder Mac ist deshalb weiterhin vor Ort zu prüfen. Die Browserrichtlinie wurde nicht verändert.
