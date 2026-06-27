# CTF - Spielübersicht

**Stand: 07.06.26**

## Was ist das?

CTF ist ein spielbarer 2D-Capture-the-Flag-Prototyp für den Browser.
Zwei Teams, Rot und Blau, kämpfen in einer Arena gegeneinander.

Das Ziel ist einfach:

1. Die gegnerische Flagge aus der gegnerischen Basis holen.
2. Die Flagge zur eigenen Basis zurückbringen.
3. Das zuerst dreimal schaffen.

Ein Match dauert höchstens drei Minuten. Wer zuerst drei Punkte erreicht,
gewinnt sofort. Nach Ablauf der Zeit gewinnt das Team mit mehr Punkten.
Bei Gleichstand endet das Match unentschieden.

## Aktueller Spielablauf

- Hauptmenü mit Karten- und Teamgrößenwahl
- Drei Sekunden Countdown vor dem Match
- Punktestand und verbleibende Zeit im HUD
- Ergebnisanzeige nach dem Match
- Neues Match oder Rückkehr ins Hauptmenü
- Einstellungen während des Spiels
- Vollbildmodus und zuschaltbare Debug-Daten

Die gewählte Karte und Teamgröße werden im Browser gespeichert.

## Steuerung

### Desktop

- Bewegung: `WASD` oder Pfeiltasten
- Springen: Leertaste
- Peitsche: `F`
- Raketenwerfer und Railgun: über die Waffen-Schaltflächen und Zielsteuerung

### Mobile

- Virtueller Joystick für Bewegung
- Eigene Schaltfläche zum Springen
- Eigene Schaltflächen für Raketenwerfer, Railgun und Peitsche
- Raketenwerfer und Railgun können durch Ziehen gezielt werden
- Kurzes Antippen wählt automatisch ein geeignetes Ziel

## Bewegung

Die Bewegung ist schnell und leicht gleitend. Beschleunigen, Abbremsen,
Richtungswechsel und Luftkontrolle fühlen sich unterschiedlich an.

Der Sprung kann kurz angetippt oder länger gehalten werden. Längeres Halten
verlängert den Sprung. Abgründe und eingestürzte Bereiche können übersprungen
werden. Wer hinein fällt, wird nach kurzer Zeit zum letzten sicheren Punkt
zurückgesetzt.

## Teams und Einheiten

Es gibt Team Rot und Team Blau. Pro Team sind bis zu vier Einheiten möglich.
Die Teamgröße kann im Hauptmenü oder in den Einstellungen gewählt werden.

Der menschliche Spieler gehört aktuell zum roten Team. Die übrigen Plätze
werden durch Bots besetzt. Die Figuren besitzen vier unterschiedliche
Charaktervarianten pro Team und zeigen ihre Blickrichtung nach Norden, Süden,
Osten oder Westen.

### Werte

- Spieler: 100 Lebenspunkte
- Bots: 70 Lebenspunkte
- Rüstung fängt Schaden ab, bevor Lebenspunkte verloren gehen
- Gestorbene Einheiten erscheinen nach kurzer Zeit wieder
- Beim Tod gibt es eine sichtbare Zerplatz-Animation statt einfachem
  Verschwinden

## Kampf

### Automatischer Standardschuss

Jede lebende Einheit feuert automatisch auf sichtbare Gegner in Reichweite.

- Kleine rote oder blaue Geschosse
- Ein Schuss alle drei Sekunden
- Das Geschoss fliegt auf die Position, an der das Ziel beim Abschuss stand
- Wände können Schüsse blockieren
- Schaden: 18

### Raketenwerfer

Eine langsamer fliegende Spezialwaffe mit Flächenschaden.

- Fünf Raketen pro Aufnahme
- Direkter Schaden: bis zu 45
- Explosion trifft auch Einheiten in der Nähe
- Schaden nimmt zum Rand der Explosion ab
- Explosion verursacht Rückstoß
- Kann manuell oder automatisch auf ein Ziel abgefeuert werden

### Railgun

Eine sehr schnelle Präzisionswaffe für große Entfernung.

- Fünf Schüsse pro Aufnahme
- Sehr hohe Reichweite
- Trifft sofort entlang einer geraden Linie
- Verursacht 95 Prozent der maximalen Lebenspunkte des Ziels als Schaden
- 2,5 Sekunden Abklingzeit zwischen zwei Schüssen
- Wände stoppen den Schuss
- Treffer erhält ein eigenes akustisches Bestätigungssignal
- In der Bibliothek kann der Strahl Kerzenflammen löschen

### Peitsche

Eine starke Waffe für den Nahbereich.

- Acht Schläge pro Aufnahme
- Kurze Reichweite und begrenzter Angriffswinkel
- Schaden: 35
- 0,8 Sekunden Abklingzeit
- Unterschiedliche Geräusche für Fehlschlag und Treffer
- Wählt bei einfachem Auslösen den nächsten geeigneten Gegner

## Pickups

Auf den Karten liegen verschiedene Gegenstände:

- Gesundheit: heilt 50 Prozent der maximalen Lebenspunkte
- Rüstung: gibt 25 Prozent der maximalen Lebenspunkte als Rüstung
- Raketenwerfer-Munition
- Railgun-Munition
- Peitschen-Munition

Feste Pickups erscheinen nach 20 Sekunden erneut. Besiegte Einheiten lassen
noch vorhandene Waffenmunition für kurze Zeit fallen.

Pickups besitzen eigene Geräusche. Auch gegnerische Schritte, Schüsse,
Waffenaufnahmen und andere Aktionen sind in begrenzter Entfernung hörbar.
Die Lautstärke nimmt mit der Entfernung ab.

## Karten

### 1. Training Crossing

Eine symmetrische Ruinenarena und die übersichtlichste Einstiegskarte.

- Klare rote und blaue Basis
- Umkämpfter Bereich in der Kartenmitte
- Mauern, Abgründe und Sprungwege an den Seiten
- Ruinensäulen, überwachsene Steinreste und leicht flatternde Teambanner
- Zentrales Rüstungs-Pickup

### 2. Grand Archive

Eine breite Bibliotheksarena mit langen Galerien und einem offenen Lesesaal im Zentrum.

- Bücherregale und beschädigte Regale als Hindernisse
- Drei gut lesbare Routen und mehrere Querverbindungen
- Vier runde Lesetische im zentralen Saal
- Teppiche, Bücherstapel und Spinnweben
- Vier kleine Einstürze als überspringbare Abkürzungen
- Animierte Kerzen, Staub und eine laufende Spinne
- Kerzen können durch Railgun- und Projektiltreffer gelöscht werden
- Verwendet dieselben hochwertigen Teambasen wie Training Crossing

### 3. Flank Switch

Eine breite industrielle Sci-Fi-Arena mit längeren Flaggenläufen.

- Drei klar unterscheidbare Hauptrouten
- Querverbindungen für schnelle Flankenwechsel
- Offene Mittelroute sowie Railgun- und Rocket-Flanken
- Metallboden, industrielle Teambasen, massive Barrieren und beleuchtete Wartungsgruben
- Zentrale Energiekreuzung als umkämpfter Orientierungspunkt

## Bot-KI

Die Bots verwenden aktuell eine regelbasierte KI. Sie ist keine lernende KI.
Jeder Bot erhält eine Rolle:

- Angreifer: bewegt sich bevorzugt zur gegnerischen Flagge
- Verteidiger: bewacht die eigene Basis und verfolgt Eindringlinge
- Support: kontrolliert den mittleren Bereich und unterstützt das Team

Je nach Situation können Bots:

- die gegnerische Flagge holen und zur eigenen Basis bringen
- einen eigenen Flaggenträger begleiten
- einen gegnerischen Flaggenträger verfolgen
- die gestohlene eigene Flagge abfangen
- die eigene Basis verteidigen
- bei wenig Gesundheit Heilung suchen
- sich bei großer Gefahr zurückziehen
- passende Waffen oder Rüstung aufnehmen
- feste Angriffs-, Verteidigungs- und Patrouillenwege benutzen

Bots verwenden den automatischen Standardschuss und können aufgenommene
Raketen einsetzen, besonders auf größere Entfernung oder gegen Flaggenträger.
Railgun und Peitsche werden aktuell nur vom menschlichen Spieler benutzt.

Die Bots planen Wege um Wände und andere Hindernisse. Wenn ein Bot kaum
vorankommt, berechnet er den Weg neu und versucht eine andere Ausweichrichtung.

Normale Aufgaben werden kurz beibehalten, damit Bots nicht ständig zwischen
zwei Zielen wechseln. Dringende Situationen wie Flaggenträger, Rückzug oder
Heilung dürfen sofort eine neue Entscheidung auslösen.

Die KI ist für einen Prototyp funktionsfähig, aber noch kein fertiges,
hochwertiges Bot-System. Weitere geplante Verbesserungen stehen in
`BOT_AI_ROADMAP.md`.

## Darstellung und Ton

- Eigene Figuren für beide Teams
- Richtungsabhängige Charakterdarstellung
- Teamfarbene Geschosse und Effekte
- Raketenexplosionen, Railgun-Strahl und Peitscheneffekt
- Deutliche Treffer- und Todesrückmeldung
- Schritte, Sprung, Pickups, Schüsse und Treffer besitzen Sounds
- Bot-Geräusche werden abhängig von ihrer Entfernung abgespielt

## Technischer Stand

Das Spiel läuft als Browserprojekt mit Phaser, TypeScript und Vite.
Es ist auf Desktop und Mobilgeräten steuerbar.

Der aktuelle Stand ist ein fortgeschrittener spielbarer Prototyp:

- Die zentrale Capture-the-Flag-Spielschleife funktioniert.
- Matches können gestartet, beendet und neu begonnen werden.
- Drei Karten und mehrere Waffen sind spielbar.
- Bots erfüllen grundlegende Teamaufgaben.
- Grafik, Audio und Bedienung sind bereits deutlich über einem technischen
  Platzhalterstand.

Noch nicht vollständig sind unter anderem langfristige Progression,
umfangreicheres Balancing, eine ausgereifte Bot-KI und die finalen Assets der
dritten Karte.
