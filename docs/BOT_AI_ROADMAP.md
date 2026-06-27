# Bot AI Roadmap

## Ziel

Die Bots sollen nachvollziehbarer, aktiver und taktischer wirken, ohne das
bestehende CTF-Verhalten durch einen großen KI-Umbau zu destabilisieren.
Die Verbesserung erfolgt deshalb in kleinen, einzeln testbaren Schritten.

## Empfohlene Reihenfolge

### 1. Aufgaben stabilisieren

Status: umgesetzt, noch im Spieltest.

- Normale Aufgaben werden für kurze Zeit gehalten, statt ständig zu wechseln.
- Kritische Reaktionen wie Flaggenträger verfolgen, eigene Flagge retten,
  Rückzug und Überleben dürfen die Haltezeit sofort überschreiben.
- Bewegliche Ziele werden während derselben Aufgabe weiterhin aktualisiert.
- Debug-Werte zeigen Aufgabenhaltezeit und Feststeck-Reaktionen.

Erwartete Verbesserung:

- Weniger Zögern und Richtungswechsel.
- Klarer erkennbares Bot-Verhalten.
- Sehr geringes Risiko, weil die bestehende Zielauswahl erhalten bleibt.

### 2. Aufgaben als bewertete Kandidaten sammeln

- Mögliche Aufgaben explizit sammeln: angreifen, verteidigen, Flaggenträger
  verfolgen, Flagge zurückbringen, heilen, Waffe holen und patrouillieren.
- Jede Aufgabe erhält einen nachvollziehbaren Score.
- Zunächst werden dieselben Prioritäten wie im bestehenden Verhalten
  abgebildet, ohne neue Taktiken einzuführen.

Erwartete Verbesserung:

- Entscheidungen werden messbar und leichter abstimmbar.
- Fehler lassen sich über Scores statt über verschachtelte Sonderfälle finden.
- Mittleres Risiko; deshalb erst nach erfolgreichem Test von Schritt 1.

### 3. Rollen als Gewichtung verwenden

- Angreifer bevorzugen Flagge, Waffen und offensive Wege.
- Verteidiger bevorzugen Basisraum, eigene Flagge und Eindringlinge.
- Rollen verbieten keine dringenden Reaktionen, sondern verändern nur Scores.

Erwartete Verbesserung:

- Teams wirken organisierter.
- Bots unterscheiden sich sichtbar, ohne getrennte KI-Systeme zu benötigen.

### 4. Entscheidungshysterese ergänzen

- Eine neue Aufgabe muss die aktuelle Aufgabe deutlich übertreffen.
- Kleine Score-Schwankungen lösen keinen Wechsel aus.
- Für einzelne Aufgaben können kurze Cooldowns gelten.

Erwartete Verbesserung:

- Noch weniger Hin-und-her-Laufen bei ähnlich attraktiven Zielen.
- Ruhigeres Verhalten in umkämpften Bereichen.

### 5. Debugging und Balancing ausbauen

- Aktuelle Aufgabe, Ziel, Score und Wechselgrund sichtbar machen.
- Feststeck- und Neuplanungszähler beobachten.
- Werte pro Karte testen und nur bei belegtem Bedarf kartenspezifisch machen.

Erwartete Verbesserung:

- KI-Probleme werden reproduzierbar.
- Spätere Anpassungen bleiben risikoarm.

## Bewusst vorerst nicht empfohlen

- Vollständige Utility AI in einem großen Umbau.
- Behavior Trees oder Machine Learning für den aktuellen Prototyp.
- Unterschiedliche Navigationssysteme pro Rolle oder Karte.
- Neue taktische Regeln gleichzeitig mit dem Umbau der Entscheidungsauswahl.

Diese Varianten erhöhen Aufwand und Fehlerrisiko, bevor die bestehenden
Entscheidungen ausreichend beobachtbar und stabil sind.
