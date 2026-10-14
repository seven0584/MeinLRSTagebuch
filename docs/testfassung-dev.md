# Testfassung herunterladen und ausprobieren

Version 1.3.0 wird zuerst auf `dev` erprobt. Die bisherige Fassung auf `main` bleibt bestehen. Ein reguläres Release ist diese Testfassung noch nicht.

## Herunterladen und starten

1. **[Den dev-Branch auf GitHub öffnen](https://github.com/seven0584/MeinLRSTagebuch/tree/dev)**. Über der Dateiliste muss `dev` stehen. Bei einem privaten Repository zuerst mit einem berechtigten GitHub-Konto anmelden.
2. **Code → Download ZIP** wählen. Alternativ: **[Testfassung direkt als ZIP herunterladen](https://github.com/seven0584/MeinLRSTagebuch/archive/refs/heads/dev.zip)**.
3. Die ZIP vollständig in einen neuen Ordner entpacken, beispielsweise `Tagebuch-Test`. Nicht über eure bisherige App kopieren. `Tagebuch.html` und der ganze Ordner `app/` müssen zusammenbleiben; nicht direkt aus der ZIP starten.
4. In Chrome oder Edge über das Profilsymbol ein **zusätzliches Browserprofil** für den Test erstellen. Dafür ist keine Anmeldung oder Synchronisierung nötig. Das Profil dauerhaft behalten, wenn ihr später weiterprüfen wollt. Ein anderer Dateiordner allein trennt die Browserdaten nicht zuverlässig.
5. Im Testprofil `Tagebuch.html` öffnen. Bei der Ordnerauswahl ausschließlich den neuen Testordner freigeben. Alternativ **nur im Browser speichern** wählen.
6. Eine Eltern-PIN setzen und zunächst ein erfundenes Testkind anlegen. Die App zeigt Version **1.3.0**; unter der Glocke steht der Hinweis zur Testfassung.

Eine Installation oder ein Programmierwerkzeug ist dafür nicht erforderlich. Verwendet am Windows-PC oder Mac einen aktuellen Chrome oder Edge. Auf dem jeweiligen Gerät auch die Diktatstimme anhören; automatische Tests können deren Verständlichkeit nicht beurteilen.

## Diese Abläufe ausprobieren

| Schritt | Was sollte passieren? |
| --- | --- |
| Als Eltern unter **Gemeinsam starten** ein kleines Ziel einstellen und den Beispieltext ansehen. | Es ist erkennbar, wann das Ziel erreicht wird und wann Tagebuch-Coins verfügbar werden. |
| Als Kind einen kurzen Text schreiben, etwa „Die Sone scheint auf die Blume.“; vorher das Testziel passend klein einstellen. | Der Text wird geprüft. An der markierten Wortstelle kann das Kind direkt „Sonne“ eingeben oder einen Tipp öffnen. |
| Bei einem Wort **Hier weiß ich nicht weiter** wählen. | Nur diese Stelle bleibt offen; der Originaltext wird nicht automatisch ersetzt. Wenn die übrigen Anforderungen erfüllt sind, lässt sich der Eintrag abschließen. |
| Unter **Wörter und Rückmeldungen** eine Stelle ausdrücklich mit den Eltern teilen. | Die Eltern können die freigegebene Stelle sehen. Private neue Tagebuchstellen bleiben ohne Freigabe verborgen. |
| In der Elternübersicht ein Wort-Diktat mit zwei Wörtern und höchstens 12 Extra-Coins anbieten. | Beim Kind erscheint unter **Üben → Für dich angeboten** eine freiwillige Aufgabe. |
| Ein Zielwort bearbeiten, das andere offenlassen und die Aufgabe abschließen. Danach neu laden. | Für das bearbeitete Wort gibt es 6 Extra-Coins. Durch Neuladen werden sie nicht erneut gutgeschrieben. Späteres Bearbeiten des zweiten Wortes ergänzt den Rest. |
| Eine Schreibweise mit **Meine Schreibweise stimmt, bitte prüfen** melden. | Die Rückfrage bleibt für die Eltern nachvollziehbar, auch wenn das Kind danach verbessert. |
| Eine Aufgabe pausieren, die App neu öffnen und weiterüben. | Der gespeicherte Aufgabenstand ist wieder da. Auch ein kurzer Text als Aufgabe lässt sich anbieten und ausprobieren. |
| Shop, Hörprobe, Elternhilfe und Kinderhilfe öffnen. | Bisherige Funktionen sind erreichbar; die Hilfen beschreiben die neuen Abläufe. |

Lasst das Kind möglichst selbst suchen und erklären, was es verstanden hat. Notiert, wo Hilfe nötig war oder Frust entstand. Die technischen Prüfungen sind im [Prüfbericht](pruefbericht-1.3.0.md) beschrieben; Bedienversuche mit echten Familien stehen noch aus.

## Vorhandene Daten als Kopie testen

Für den ersten Durchlauf reichen Testdaten. Wenn ihr anschließend eure bisherigen Daten prüfen möchtet:

1. In der bisherigen App unter **Eltern → Einstellungen** eine Sicherung herunterladen. Die Sicherung und das gewählte Passwort aufbewahren.
2. Nur im separaten Test-Browserprofil die Testfassung öffnen und dort über **Sicherung wiederherstellen** die Kopie importieren. Das ersetzt ausschließlich den Stand in diesem Testprofil.
3. Nach dem Import den Speicherort kontrollieren und bei einer Ordnerfreigabe ausschließlich den Testordner auswählen. Den bisherigen Familienordner nicht verbinden.
4. Einträge, Bilder, vorhandene Coins und Ziele vergleichen. Danach neue Funktionen mit dieser Kopie ausprobieren.

Zum bisherigen Alltag zurückkehren: die bisherige App im ursprünglichen Browserprofil und aus dem ursprünglichen Ordner öffnen. Änderungen aus dem Test werden nicht automatisch dorthin übernommen. Die Testdaten nicht in die ältere App zurückspielen.

## Weitere Teststände und Rückmeldung

Die automatische Update-Suche fragt weiterhin `main` ab. Sie installiert weder diesen noch spätere `dev`-Teststände. Für einen neuen Teststand dieselbe ZIP-Adresse nutzen, die Test-App schließen und im Testordner nur `Tagebuch.html` und `app/` durch die vollständig entpackten Programmdateien ersetzen. Eigene `config/`- und `kinder/`-Ordner sowie die Daten des Test-Browserprofils behalten. Bei Startproblemen die vollständige `dev`-ZIP erneut laden; keine Dateien verschiedener Versionen mischen.

Bei einem Problem bitte Version, Windows/macOS, Browser, die ausgeführten Schritte und die sichtbare Meldung notieren. Dazu beschreiben, was stattdessen erwartet wurde. Für Beispiele erfundene Texte nutzen; persönliche Tagebucheinträge oder Sicherungsdateien gehören nicht in öffentliche GitHub-Issues.
