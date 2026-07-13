# Verifizierter UI-, Gameplay- und Architektur-Maßnahmenplan

Stand: 2026-07-13  
Geprüfter Stand: `main` bei `1d651a5` (`Refine founders circuit and league UX`)  
Fokus: PC/Desktop-Browser, V2 und Arena League  
Status dieses Dokuments: historische Planungs- und Entscheidungsgrundlage. P0 und erste P1-Teilpakete wurden inzwischen umgesetzt; der aktuelle, verifizierte Stand und die offenen Punkte stehen in `P0_INTERIM_HANDOFF_2026-07-13.md`.

## 1. Ziel, Prioritäten und Evidenzregeln

Dieser Plan konsolidiert den vollständigen UI-/UX-Audit und die danach ergänzten Beobachtungen zu Gameplay-Fairness, Waffen, Bots, Assets und Architektur.

Prioritäten bedeuten:

- **P0:** vor weiterer Inhaltsausweitung oder einem Release-Kandidaten lösen.
- **P1:** danach gezielt verbessern; wichtig, aber nicht blockierend für den nächsten stabilen Desktop-Stand.
- **P2:** Polish oder spätere Produktentscheidung.
- **Später:** bewusst außerhalb des aktuellen Desktop-Fokus.

Evidenzklassen:

- **Verifiziert:** im aktuellen Browser-Build, Code, Test oder Diagnoseartefakt direkt nachgewiesen.
- **Teilweise verifiziert:** die technische Ursache oder das Risiko ist belegt, die Häufigkeit im menschlichen Spiel aber noch nicht gemessen.
- **Nicht bestätigt:** darf nicht als bestehender Fehler eingeplant werden, bevor eine Messung ihn bestätigt.

Aktuelle technische Basis:

- `npm.cmd test`: **57/57 Tests bestanden**.
- Der zuvor auf demselben Commit geprüfte Build war erfolgreich; die bekannte Vite-Chunk-Warnung bleibt bestehen.
- Bot-Diagnosen enthalten keine ungültigen Positionen oder komplett aktionslosen Simulationsframes.
- Im Laufzeit-Importgraphen der 157 TypeScript-Dateien wurden **keine Runtime-Zyklen** gefunden.
- Der Arbeitsbaum war vor Anlegen dieses Dokuments sauber.

## 2. Klärung: Was mit P0 Recruitment gemeint ist

**Recruitment soll keine unterschiedlichen Kampfwerte einführen.** Alle spielbaren Charaktere sollen dieselben Health-, Movement-, Hitbox-, Damage- und Waffenregeln verwenden und sich nur optisch sowie durch Persönlichkeit/Lore unterscheiden. Das verhindert ausdrücklich eine Charakter-Balancing-Hölle.

Der P0-Befund betrifft die **Qualität und Ehrlichkeit der Entscheidungssituation**:

- Der aktuelle Recruitment-Screen zeigt den Kandidaten klein und allein, nutzt sehr viel Leerraum und stellt den bisherigen Wingmate nicht direkt daneben.
- Der Kandidat wird über die ganze Karte ausgewählt, ohne klar beschrifteten Recruit-CTA und mit einem nativen Browser-Confirm.
- Die Oberfläche zeigt aktuell `OVR`, Rollen wie `ATTACKER`/`DEFENDER` und leistungsbezogene Traits. Das vermittelt unterschiedliche Gameplay-Stärke.
- Im League-Katalog existieren tatsächlich unterschiedliche Character-Ratings. Diese fließen über `teamPower()` in simulierte Ligaergebnisse ein, obwohl der Match-Routen-Test den Skin als kosmetisch behandelt und die spielbaren Actors keine charakterabhängigen Kampfwerte erhalten.

Empfohlene P0-Lösung:

1. Recruitment wird als **rein kosmetische Roster-/Skin-Entscheidung** vertraglich festgeschrieben und getestet.
2. Character-Ratings werden von rekrutierbaren Charakteren entkoppelt. Stärke der simulierten Rivalen gehört in Team-/Liga-Profile, nicht in auswählbare Character-Stats.
3. `OVR` und kampfstarke Rollen verschwinden aus der Auswahl oder werden durch klar nicht-mechanische Inhalte ersetzt: Herkunftsteam, Persönlichkeit, Rufname, kosmetischer Stil und kurze Lore.
4. Kandidat und aktueller Wingmate werden groß und gleichwertig nebeneinander gezeigt. Statt Stat-Deltas steht sichtbar: **„Cosmetic only – identical arena stats“**.
5. Eindeutige Aktionen: `Recruit <Name>` und `Keep <Name>`, gefolgt von einer eigenen, dunklen Review-Ansicht statt `window.confirm`.

P0 bedeutet hier: Die Liga darf keine falsche Erwartung über Charakterstärke etablieren. Es bedeutet **nicht**, dass ein Stat-System gebaut werden soll.

## 3. Verifizierte neue Beobachtungen

| Thema | Evidenz | Bewertung | Konsequenz |
|---|---|---|---|
| Kachel-auf-Kachel-Optik | Browser und CSS bestätigen auf dem Hauptmenü eine gerahmte Action-Fläche mit zwei weiteren Karten. Im HQ entstehen bis zu vier visuelle Ebenen: Hub-Fläche → Panel → Character-/Tier-Karte → innere Stats/Controls. | **Verifiziert, P0/P1** | Oberflächenhierarchie reduzieren; nicht jede Gruppierung braucht Rahmen, Hintergrund und Shadow. |
| Spawn-Camping-Schutz | Respawn setzt Position, Health, Armor und `lifeState` zurück. Es gibt keinen Schutz-Timer und `applyDamage()` akzeptiert sofort wieder Schaden. | **Verifiziertes strukturelles Risiko, P0** | Zwei Sekunden Spawn-Schutz mit klarer visueller Sprache einführen. Häufigkeit von echtem Camping zusätzlich messen. |
| Ammo-Knappheit | Actors starten mit 0 Rocket-, 0 Rail- und 0 Whip-Ammo. Respawn füllt Ammo nicht auf. Arena-Pickups respawnen nach 12 s und geben 3/2/5 Ammo. Weapon-Ammo wird ohne Cap addiert. | **Verifiziert, P0** | Ein Spieler darf nie komplett kampfunfähig werden; genaue Werte erst nach Telemetrie festlegen. |
| Bots nehmen Items | TDM-Bots suchen Weapon-Pickups aktiv, wenn ihnen eine Waffenart fehlt. Jeder aktive Actor kann einen Pickup bei Kontakt erhalten; es gibt keine Ally-Courtesy oder Reservierung. In der 2v2-TDM-Diagnose sammelten die Teams in 18 s 7 bzw. 9 Pickups. | **Verifiziert; menschliche Frustrationshäufigkeit noch ungemessen, P0** | `allWeaponsEmptyMs`, verlorene Pickup-Rennen und Sammlungen pro Actor messen; Bot-Courtesy und Grundwaffe testen. |
| Whip-Pickup-/HUD-Asset | Beide SVGs sind flache, violett-gelbe Spiralen mit braunem Griff. Neben Rocket, Rail, Arenen und Charakteren wirken sie wie ein vereinfachtes Lollipop-/Platzhalter-Icon. | **Verifiziert, P1** | Durch eine hochwertige industrielle Energy-Lash/Arc-Lash-Familie ersetzen. |
| Whip-Aiming | Desktop schickt für `F` die Maus-Aim-Richtung. Touch-Tap besitzt bereits eine Nächster-Gegner-Automatik. | **Verifiziert, P0/P1** | Desktop-first einen gemeinsamen Core-Target-Resolver verwenden; Whip ignoriert manuelles Aim. Mobile erst später angleichen. |
| Idle-Zustände | Alle 6x4-Sheets verwenden nur Spalte 0 als Idle. Vier Skins simulieren Idle mit vertikalem Sinus-Bob und 1,2 % Scale-Y-„Atmen“, fünf stehen komplett statisch. | **Verifiziert, P1** | Synthetisches Atmen entfernen und ein unterbrechbares Idle-/Special-Idle-System mit echten Frames bauen. |
| Neutrale One-Flag-Flagge | Sie wird als statische Phaser-Grafik aus dünnem Mast und cremefarbenem Dreieck gezeichnet; es gibt kein Flaggenasset und keine Flatteranimation. | **Verifiziert, P1** | Eigenes neutrales „Core Relay Banner“ mit bewegungsabhängiger Cloth-Animation erstellen. |
| Item-Pads/Glows | Jeder Pickup erzeugt denselben `spawnPadV2` und `spawnPadGlowV2`. Der Glow ist nur sichtbar, solange der Pickup aktiv ist; der Pad bleibt beim 12-s-Respawn dunkel stehen. Auf hellen Maps ist der Cyan-Glow deutlich schwächer lesbar. | **Kein mapweiser Missing-Asset-Bug; Lesbarkeitsproblem verifiziert, P1** | Aktiv/inaktiv klarer differenzieren, Glow kontrastabhängig machen und visuelle Regressionen pro Map aufnehmen. |
| „Bots springen nie“ | Alle aktuellen Maps besitzen 4 oder 8 gerichtete Jump-Links. TDM-, CTF- und One-Flag-Controller senden Jump-Actions nur bei Navigation über diese Links. Die One-Flag-Diagnose erfasst je Actor 13–283 Jump-Link-aktive Frames. | **Die absolute Aussage ist widerlegt; Sichtbarkeits-/Nutzungsproblem ist plausibel, P1** | Echte `actor.jumped`-Starts und erfolgreiche Traversals zählen; keine zufälligen Combat-Hops einführen. |
| Bot wartet an Base | In Classic CTF ist Slot 2 fest `defender`. Im blauen 2v2 ist Slot 1 der Mensch und der einzige Team-Bot damit immer Defender. Ohne Bedrohung patrouilliert er Base; Tests sichern dieses frühe Zuhausebleiben sogar explizit ab. | **Verifiziert, P1** | Feste Rolle durch teamgrößenabhängige, hysterese-geschützte Utility-Rollen ersetzen. |

## 4. Kachel-auf-Kachel-Prüfung und Designregel

Die Beobachtung ist korrekt, besonders im League HQ.

### Wo es zu stark auftritt

- **Hauptmenü:** Hintergrund → dunkle Action-Rail → Career-/Quick-Play-Karten → zusätzlicher innerer Rand/Accent.
- **Quick Play:** Setup-Surface → Feldgruppen → gerahmte Controls → Skin-Karten → Selected-State mit eigenem Inset.
- **League HQ:** Hub-Surface → vier große Panels → Character-Karten/Tier-Karten → Stats, Portraitflächen und Select-Flächen.
- **Recruitment:** Modal-Surface → Candidate-Grid → klickbarer Kartenrahmen → Character-Karte.
- **Overlays:** Result-/Scoreboard-Surface → Table-Wrap → Teamheader/Rows/Impact-Bars.

### Warum es stört

- Jede Ebene fordert ähnliche visuelle Aufmerksamkeit.
- Inhaltshierarchie wird durch Containerhierarchie ersetzt.
- Die Seite wirkt wie ein Dashboard-Editor statt wie eine Arena-Liga.
- Auf kleineren Desktop-Viewports verbrauchen Rahmen, Padding und Überschriften zu viel Höhe.

### Verbindliche Oberflächenregel

Pro Screen höchstens drei Ebenen:

1. **Canvas:** Hintergrund/Key Art ohne sichtbaren Rahmen.
2. **Surface:** höchstens eine dominante Fläche oder klar getrennte Hauptbereiche.
3. **Action/Focus:** nur wirklich klickbare, ausgewählte oder modale Elemente erhalten starken Rahmen, Shadow oder Accent.

Konkrete Änderungen:

- Hauptmenü: äußere Action-Rail entrahmen; Career und Quick Play stehen als eigenständige Aktionen direkt im Layout.
- HQ: Next-Match/Season-Hero bleibt dominant. Squad, Tabelle, Team File und Arena Path nutzen mehr Weißraum und Dividers statt je eines vollen Kartenrahmens.
- Character-Paare teilen sich eine Surface; Portrait und Text werden nicht noch einmal als separate Kacheln gerahmt.
- Tabellenzeilen bleiben flach und erhalten Hintergrund nur bei Hover, Auswahl oder eigenem Team.
- Arena Path wird als echter vertikaler Pfad/Bracket visualisiert, nicht als drei Karten in einem Kartenpanel.
- Recruitment bekommt eine Modal-Surface und zwei große, flache Vergleichsspalten; nicht „Button enthält Karte enthält Character-Karte“.

Abnahme: In Screenshots muss ein Betrachter innerhalb einer Sekunde Hauptfläche, Primäraktion und Sekundärinformation unterscheiden können. Kein normaler Screen darf mehr als zwei sichtbar gerahmte Vorfahren um denselben Inhalt haben.

## 5. Konsolidierter UI-/UX-Audit

| Screen | Wertung | Verifizierter Hauptbefund | Empfohlene Richtung |
|---|---:|---|---|
| Hauptmenü | 7/10 | Starkes Key Art; Quick Play ist durch eine spezifischere alte ID-Regel heller als Career und wirkt primär. Action-Rail verstärkt die Kachelverschachtelung. | Career klar primär, CSS-Kaskade bereinigen, Rail entrahmen. |
| Quick Play | 6/10 | Bei 1366×768 liegen Start-CTA und Hilfe unterhalb des internen Scrollbereichs; bei kleinen Desktop-Höhen wird der Weg sehr lang. | Kompakte Desktop-Komposition, sticky/fester Startbereich, weniger Boxen und Padding. |
| Contract/League-Intro | 8/10 | Starke Identität und verständlicher Einstieg; unten bei 1366×768 knapp. | Vertikalen Platz reduzieren, Stil beibehalten. |
| League HQ – Start | 7/10 | Next Match funktioniert, aber Pyramide liegt bei 1366×768 unter dem Fold; viel Mikroschrift. | Hero priorisieren, Nebenpanels vereinfachen, Card-Nesting reduzieren. |
| League HQ – nach Matches | 6/10 | Werte ändern sich, Komposition fühlt sich nach Match 1 und 2 fast identisch an. | Fortschritt und Konsequenz stärker inszenieren, wiederholte Daten einklappen. |
| Season Conclusion | 7/10 | Gute Abschlussfläche; Reward-/Recruitment-Übergang kann klarer sein. | Konsequenz, Belohnung und nächsten Schritt trennen. |
| Match Result | 8/10 | Dunkle Ergebnisdarstellung ist stark; `CAP`/`RET` erscheinen auch in TDM, Text teilweise zu klein. | Modusspezifische Spalten und Mindestschriftgrößen. |
| League Progression | 8/10 | Starkes Modal; „Up 1 Place“ trotz Niederlage kann durch Rivalensimulation entstehen, +0 Punkte erscheint positiv grün; Singulartext fehlerhaft. | Ursache der Rangänderung nennen, neutrale Null-Semantik, Grammatik korrigieren. |
| Recruitment | 4/10 | Schwächster League-Screen: wenig Vergleich, viel Leerraum, unklare Aktion, OVR suggeriert Mechanik. | Rein kosmetischer Side-by-side-Vergleich mit eigener Review-Stufe. |
| Desktop-TAB-Scoreboard | 7/10 | Dunkel und konsistent; kleine Tabellen-/Impact-Texte. | Typografie und Modusspalten verbessern. |
| Pause | 4/10 | Helle Mint-/White-Karte widerspricht dem dunklen V2-System. | Gemeinsame dunkle Overlay-Surface mit Result/Scoreboard. |
| HUD | 6/10 | Score/Timer und CTF-Kommandos funktionieren; Grand Archive zeigt unten eine große helle Restfläche, andere Maps füllen besser. | Canvas-/Kamera-Fit P0, Weapon-Dock und Cooldowns gezielt human-verifizieren. |

Weitere Designsystem-Befunde:

- Es gibt keine expliziten `:focus-visible`-Regeln; Tastaturfokus ist damit nicht als belastbar verifiziert.
- Kleine League-Texte bis 7–9 px sind zu dicht; `#607d86` auf `#102731` erreicht nur etwa 3,52:1 Kontrast.
- Desktop-Pause, Ergebnis und Scoreboard verwenden nicht dieselbe Surface-Familie.
- Grand Archive hatte bei 1920×1080 eine große helle Unterkante und abgeschnittene rechte Inhalte. Training Crossing zeigte am rechten Rand einen schwarzen Streifen; Foundry Circuit füllte den Viewport am zuverlässigsten.
- Intermittierende schwarze WebGL-Flächen verschwanden bei späteren Captures und erzeugten keine Console-Fehler. Sie bleiben ein manueller Normalbrowser-Prüfpunkt, nicht ein bestätigter Rendering-Bug.
- Bei der abschließenden schnellen Direktnavigation zwischen Match-Routen und Roh-Assets wurden zweimal Promise-Fehler mit `Cannot use 'in' operator to search for 'animation' in undefined` ohne Source-URL geloggt. Das ist nur für diese künstliche Navigationsfolge verifiziert und noch nicht als normaler Match-Bug reproduziert; deshalb bleibt es ein fokussierter Route-/Teardown-Prüfpunkt statt eines behaupteten Defekts.

## 6. Gameplay- und Asset-Empfehlungen

### 6.1 Spawn-Schutz – P0

Empfohlener Vertrag:

- `spawnProtectionRemainingMs = 2000` ab dem Frame, in dem der Actor wieder steuerbar ist.
- Schutz blockiert Damage und Knockback.
- Schutz endet sofort bei Rocket-, Rail- oder Whip-Angriff sowie bei Flag-Pickup/-Capture-Interaktion.
- Normale Bewegung beendet ihn nicht; sonst wäre er beim Verlassen enger Spawns praktisch wirkungslos.
- Schutz gilt identisch für Mensch und Bots.
- Damage-Events müssen unterscheiden können: `blockedBySpawnProtection`, damit Diagnose und Audio nicht fälschlich Treffer melden.

Visuelle Lösung:

- Zuerst prozeduraler, transparenter Energie-Dome mit Team-Rim, Hex-/Segmentlinien und auslaufendem Ring. So lässt sich die Mechanik ohne Asset-Risiko testen.
- Über dem lokalen Actor kurz `SPAWN SHIELD` plus Restzeit; für Gegner reicht die klar erkennbare Bubble.
- Erst nach Mechanik-Abnahme entscheiden, ob ein 256×256- oder 4-Frame-Bubble-Asset nötig ist.

Tests:

- Kein Direct-/Splash-Damage und kein Knockback während Schutz.
- Erster Frame nach Ablauf nimmt Schaden.
- Angriff und Objective-Interaktion brechen Schutz sofort.
- Keine doppelte Schutzvergabe ohne echten Respawn.
- 1v1 bis 4v4, alle drei Modi.

### 6.2 Ammo und Bot-Courtesy – P0

Die technische Ausgangslage bestätigt das Gefühl, erlaubt aber noch keine seriöse Festlegung neuer Ammo-Zahlen. Deshalb zweistufig:

**Messstufe**

- Pro Actor: `allWeaponsEmptyMs`, `zeroAmmoMsByWeapon`, Shots, Pickups, überschüssig eingesammelte Ammo und Zeit bis zur nächsten offensiven Möglichkeit.
- Pickup-Rennen: Mensch und Ally-Bot innerhalb eines definierten Radius, tatsächlicher Collector und jeweiliger Bedarf.
- Desktop-Human-Smoke für TDM, Classic CTF und One Flag; Bot-only-Matrix allein reicht nicht.

**Bevorzugte erste Designhypothese**

- Die neue **Arc Lash** wird die verlässliche kurze Grundwaffe: auto-targeted, kurzer Cooldown, keine dauerhaft verbrauchbare Ammo. Rocket und Rail bleiben map-kontrollierte Ressourcen.
- Falls unendliche Nutzung im Playtest zu dominant wird, zweite Variante: 2–3 automatisch regenerierende Energy Charges statt endlicher Ammo.
- Ally-Bots dürfen einen Weapon-Pickup nicht aktiv ansteuern oder bei Gleichzeitigkeit erhalten, wenn der menschliche Teampartner nahe ist und objektiv weniger von dieser Ressource besitzt. Keine globale Player-Bevorzugung gegen Gegner.
- Für Rocket/Rail erst nach Messung Pickup-Wert oder 12-s-Respawn ändern; nicht mehrere Parameter gleichzeitig tunen.

Diese Lösung hält die Charaktere identisch und vermeidet einen neuen Charakter-Balance-Layer.

### 6.3 Arc-Lash-Asset und Auto-Target – P0/P1

Asset-Brief:

- Industrieller Griff mit isolierten Segmenten, kompakter Spule und leuchtendem Cyan-/Magenta-Energiefilament.
- Klare diagonale Silhouette, damit das Icon bei 32–64 px noch lesbar ist.
- Eine gemeinsame Formensprache für Pickup, Desktop-HUD und Killfeed; keine zwei unabhängigen Icons.
- Transparentes Master-Asset, anschließend kontrolliert abgeleitete Größen.
- Whip-Effekt als kurzer, energiegeladener Bogen/Tether statt flacher Spirale.

Desktop-Verhalten:

- `F` und Desktop-Dock wählen den nächsten aktiven Gegner innerhalb Whip-Reichweite plus Zielradius und mit freier Sichtlinie.
- Mausposition hat auf die Whip keine Wirkung.
- Bei gleichem Abstand deterministischer Tie-Break nach Actor-ID.
- Ohne gültiges Ziel: keine Ammo-/Energy-Ausgabe, kein Cooldown-Start; kurzes `NO TARGET`-/Dock-Feedback.
- Resolver gehört in den Core, nicht in den Desktop- oder Mobile-Adapter.

### 6.4 Character-Idle-System – P1

Die bestehenden 6x4-Sheets sind vollständig belegt: 1 Idle-, 4 Walk- und 1 Jump-Spalte pro Richtung. Eine Erweiterung aller Sheets würde Frame-Indizes und Assets unnötig riskant machen.

Empfehlung:

- Separate `*-idle-special-spritesheet`-Assets pro Charakter, mit vier Richtungszeilen und 4–8 Frames.
- Base Idle bleibt ruhig; das synthetische Scale-Y-Atmen wird entfernt.
- Special Idle startet erst nach zufälligen 3,5–6 s ohne Move/Aim/Attack, läuft maximal etwa 2 s und hat 8–14 s Cooldown.
- Jede Bewegung, Jump, Damage oder Objective-Interaktion bricht ihn sofort ab.
- Humor darf Persönlichkeit zeigen, aber Silhouette und Teamlesbarkeit nicht verdecken.

Vorschläge:

- Briarhorn schüttelt oder kratzt kurz ein Horn.
- AX-9 Mantis kalibriert Fühler/Optik.
- Null Courier wird für einen Moment schwerelos oder „glitcht“ wenige Zentimeter.
- Aegis Vanguard prüft Schild/Brustplatte oder salutiert zu ernst.
- Xeno Runner legt den Kopf schief und kratzt sich.
- Volt Hound jagt kurz einen eigenen Energieschweif.
- Mirejaw gähnt übertrieben oder prüft die Zähne.
- Scrapwing zieht eine lose Schraube an, die sofort wieder herausfällt.
- Prism Bastion fängt einen kleinen Lichtreflex ein und betrachtet ihn.

Zuerst System plus ein Pilot-Charakter; erst nach erfolgreicher Abnahme alle neun Assets produzieren.

### 6.5 Neutrale Flagge – P1

Konzept: **Core Relay Banner**

- Neutraler, heller Mast/Relay-Core mit creme-goldenem oder weiß-amberfarbenem holografischem Tuch.
- Keine rote oder blaue Grundfarbe; Teamzugehörigkeit des Carriers kommt über einen separaten Team-Ring/Aura.
- Eigene hochwertige Silhouette, die neben den bestehenden Teamflaggen nicht wie ein drittes Team wirkt.

Technik/Asset-Aufteilung:

- Statischer Mast/Core als transparentes PNG.
- Cloth-Sheet mit mindestens sechs Frames für „trail left“ und sechs für „trail right“; alternativ ein sauber flipbares Tuch, falls asymmetrische Details vermieden werden.
- Beim Tragen bestimmt `carrier.velocity.x` beziehungsweise die geglättete Facing-Richtung die Reihe. Läuft der Carrier nach rechts, flattert das Tuch nach links und umgekehrt.
- Frame-Rate steigt leicht mit der Bewegungsgeschwindigkeit; im Stillstand beruhigt sich das Tuch und behält die letzte Richtung.
- Richtungswechsel erhält eine kurze Hysterese, damit das Banner nicht flackert.

Die Asset-Erstellung mit Imagegen erfolgt erst in der genehmigten Asset-Etappe und wird danach frameweise manuell geprüft.

### 6.6 Pickup-Pads – P1

- Kein Umbau der Map-Daten nötig: Alle Spawns verwenden bereits denselben Pad-/Glow-Pfad.
- Inaktiv: klar dunkler, aber nicht „kaputt“ wirkender Pad; optional dünner radialer Respawn-Fortschritt.
- Aktiv: kräftigerer Außenring, kurzer vertikaler Beam und höherer Kontrast auf hellen Themes.
- `ADD`-/Glow-Stärke und Tint dürfen pro Map-Theme variieren, Asset-Größe und State-Semantik nicht.
- Screenshot-Gate auf Training Crossing, Grand Archive und Foundry Circuit jeweils in aktivem und inaktivem Zustand.

### 6.7 Bot-Jumps – P1

Ziel ist **sinnvolle Wall-/Gap-Traversal**, kein zufälliges Bunny-Hopping und kein generischer Combat-Hop.

- Bestehende authored Jump-Links bleiben die einzige normale Sprungquelle.
- Neue Diagnose zählt `jumpStarted`, `jumpCompleted`, `jumpFailed`, verwendete Link-ID und Fortschritt nach Landung. `jumpFrames` allein ist nicht ausreichend.
- Ein Jump-Link wird gewählt, wenn er den Zielpfad relevant verkürzt, einen blockierten Korridor löst oder ein dringendes Objective unterstützt.
- Derselbe Link bekommt einen kurzen Wiederholungs-Cooldown; kein Hin-und-her-Springen ohne Zielgewinn.
- Keine Sprünge in unsichere Landing-Zonen oder wenn der nächste Pfadschritt direkt zurückführt.
- Browser-Smoke muss pro Map mindestens einen sichtbar erfolgreichen Bot-Traversal zeigen; Simulation muss zugleich `randomCombatJumps = 0` bestätigen.

### 6.8 Dynamische CTF-Bot-Rollen – P1

Die feste Slot-2-Defender-Regel ist im 2v2 zu passiv.

Empfehlung:

- Im 2v2 kein permanenter Base-Guard. Der Team-Bot arbeitet als **Sweeper** zwischen eigenem ersten Choke und Midfield.
- Verteidigung wird durch Threat Utility aktiviert: eigener Flag-Status, Invader-Distanz, Carrier-Route und Zahl aktiver Verbündeter.
- Ohne Bedrohung rotiert der Sweeper nach wenigen Sekunden zu Support, Escort oder Attack.
- In 3v3/4v4 maximal ein Defender gleichzeitig; übrige Rollen werden nach Objective-Lage vergeben.
- Rollenwechsel erhalten 1,5–2,5 s Hysterese, außer bei Flag-Notfällen.
- Manuelle Befehle `Defend`, `Follow`, `Attack` bleiben Overrides; Flag-Notfälle dürfen sie wie heute überstimmen.

Diagnose/Abnahme:

- Zeit pro Goal/Rolle, Distanz zum nächsten relevanten Ereignis, Combat-Beteiligung, erfolgreiche Recoveries/Escorts und nutzlose Hold-Zeit.
- 2v2: kein Bot verbringt ohne Bedrohung den Großteil des Matches im Base-Radius.
- Defensive Intervention darf gegenüber dem heutigen Baseline-Test nicht schlechter werden.

## 7. Architektur- und Stabilitätsprüfung

### 7.1 Positive Basis

- Der V2-Core trennt Runtime, Modi, Bots, World, Combat und Ports grundsätzlich sinnvoll.
- Phaser ist überwiegend in Adapter-/Scene-Code gekapselt.
- `strict: true` ist für `src` aktiv.
- Keine Runtime-Importzyklen im aktuellen Source-Graphen.
- 57 grüne Tests plus Bot-Simulationen bilden eine brauchbare Sicherheitsbasis.

Ein Big-Bang-Rewrite ist daher **nicht** gerechtfertigt.

### 7.2 Godfile-/Hotspot-Befund

| Datei | Umfang | Befund | Dringlichkeit |
|---|---:|---|---|
| `src/adapters/phaser/PhaserGameBridge.smoke.ts` | 3287 Zeilen | Sehr großer Smoke-Test-Sammelpunkt; hohe Merge- und Navigationskosten. | P1 inkrementell nach Featuregruppen splitten. |
| `tests/bot-diagnostics.ts` | 2439 | Framework, Szenarien, Metriken und Formatter in einer Datei. | P1 vor Ausbau der neuen AI-/Ammo-Metriken splitten. |
| `tests/gameplay-core.smoke.test.ts` | 1166 | Viele unabhängige Contracts in einer Suite. | P1 beim nächsten Testausbau nach Domänen splitten. |
| `src/scenes/ArenaScene.ts` | 916 | V1-Monolith: Lifecycle, Rendering, Input, Pickups, Waffen, Touch und HUD. | Nicht jetzt refactoren; V1 einfrieren. |
| `src/adapters/phaser/PhaserMobileInputAdapter.ts` | 838 | Input, Layout, Drawing, Cooldowns und Targeting vermischt. | Später; Mobile ist derzeit bewusst nachrangig. |
| `src/adapters/phaser/PhaserArenaRendererPort.ts` | 833 | Actors, Projectiles, Pickups, Objectives, Map-Atmosphäre, Kamera und Animationen. | **P0 als gezielte Naht**, bevor Shield/Flag/Idle hinzukommen. |
| `src/styles.css` | 811 | Alle UI-Generationen in globaler Kaskade; realer ID-Spezifitätsfehler beim Hauptmenü. | **P0**, in Surface-Dateien/Layers aufteilen. |
| `src/adapters/phaser/PhaserArenaHudPort.ts` | 704 | Header, Commands, Killfeed, Player-Panels und Result-Overlay. | P1 in Subviews zerlegen. |
| `src/systems.ts` | 659 | V1-Navigation, Bots, Combat, Pickups und Flags. | Wie V1-Scene einfrieren, nicht kosmetisch umbauen. |
| `src/adapters/phaser/PhaserWeaponEffectsPort.ts` | 570 | Alle Waffeneffekte plus Death-Bursts. | P1 beim Arc-Lash-Umbau gezielt pro Effektfamilie entlasten. |
| `src/meta/league/leagueSeason.ts` | 423 | Schedule, Simulation, Tabellen, Character-Stats und Recruitment. | P0/P1 vor Recruitment-Semantik in `leagueSimulation` und `leagueRecruitment` trennen. |

### 7.3 Dringend empfohlene Auslagerungen

Keine massenhafte Umbenennung. Nur „just in time“ vor dem jeweiligen Feature:

1. `styles.css` in `base`, `menu`, `league`, `overlays`, `legacy` und klar definierte Cascade Layers teilen. Der Career/Quick-Play-Bug wird dabei als Regressionstest festgehalten.
2. `PhaserArenaRendererPort` als Orchestrator behalten, aber `ActorRenderer`, `PickupRenderer`, `ObjectiveRenderer`, `MapAtmosphereRenderer` und `ArenaCameraController` auslagern.
3. Gemeinsamen `NearestValidEnemyResolver` im Core anlegen; Desktop und später Mobile konsumieren ihn.
4. Doppelte Jump-Action-State-Maschinen aus TDM/CTF/One Flag in eine kleine gemeinsame Traversal-Komponente überführen, ohne Rollenentscheidung hineinzumischen.
5. League-Simulation und Recruitment trennen, damit kosmetische Auswahl nicht versehentlich Simulationspower verändert.
6. Bot-Diagnose in `framework`, `scenarios/tdm`, `scenarios/ctf`, `scenarios/oneFlag` und `formatters` teilen, bevor neue Metriken hinzukommen.

### 7.4 Zusätzliche Stabilitätslücken

- `tsconfig.json` schließt nur `src` ein; Tests und Scripts werden nicht durch einen eigenen Typecheck abgesichert.
- Es gibt noch keinen Lint-/Format-Check im Package-Script.
- Große Smoke-Suites sind grün, aber erschweren das gezielte Erkennen, welcher Contract zu welchem Feature gehört.

Empfehlung: eigener `test:typecheck` für Tests/Scripts und schrittweise Suite-Teilung. Kein neues Tooling-Bündel gleichzeitig mit Gameplay-Änderungen einführen.

## 8. Priorisierter Backlog

### P0 – vor nächster Inhaltsausweitung

1. Desktop-Canvas-/Kamera-Fit auf Training Crossing und Grand Archive korrigieren.
2. Quick-Play-Startaktion bei 1366×768 und 1024×768 ohne langen internen Scrollweg erreichbar machen.
3. Career als echte Primäraktion herstellen; CSS-ID-Spezifitätsfehler beseitigen.
4. Desktop-Pause in das dunkle Overlay-System überführen; Fokuszustände und kritische Kontraste ergänzen.
5. Kachelverschachtelung auf Main, Quick Play, HQ und Recruitment anhand der Drei-Ebenen-Regel reduzieren.
6. Recruitment als rein kosmetische, ehrliche Side-by-side-Entscheidung umsetzen und Rating-Einfluss entkoppeln.
7. Zwei Sekunden Spawn-Schutz mit Gameplay- und Visual-Contract.
8. Ammo-Hilflosigkeit messen und eine verlässliche Grundwaffenlösung einführen; Ally-Bot-Pickup-Courtesy testen.
9. Desktop-Whip automatisch auf den nächsten gültigen Gegner richten; Targeting in den Core verlagern.
10. CSS- und Renderer-Hotspots vor weiterem Featurewachstum gezielt entlasten.

### P1 – danach

1. HQ-Informationsdichte und Wiederholung zwischen Runden reduzieren.
2. Progression-Semantik, Nullpunkte-Farbe und Singular/Plural korrigieren.
3. Result-/Scoreboard-Spalten pro Modus anzeigen; kleine Typografie anheben.
4. Whip durch hochwertige Arc-Lash-Assetfamilie ersetzen.
5. Neutralflagge als bewegungsabhängiges Core Relay Banner produzieren.
6. Pickup-Pads auf hellen und dunklen Themes eindeutig aktiv/inaktiv lesbar machen.
7. Bot-Jump-Diagnose auf echte Traversals umstellen und sinnvolle Routen sichtbar machen.
8. Classic-CTF-Rollen im 2v2 dynamisch und bedrohungsabhängig machen.
9. Unterbrechbares Special-Idle-System mit einem Pilot-Charakter, danach neun Character-Assets.
10. Kleinere Charaktere nur über Presentation-Scale angleichen; keine Hitbox-/Stat-Unterschiede.
11. HUD- und Renderer-Subview-Dateien sowie große Test-/Diagnosedateien inkrementell splitten.

### P2 / später

- Zusätzliche Transitionen, subtile League-Banner und Hover-Polish.
- Map-Thumbnails **erst nach der geplanten Map-Überarbeitung**; dann ausdrücklich gewünscht.
- Mobile/Touch als separate Produktentscheidung: Controls, Layout, Scoreboard und QA-Matrix werden später neu bewertet. Aktuell nur Regressionen vermeiden.
- Die 20-MB-/Portal-Paketgrenze ist derzeit kein Handlungsdruck. Der zuletzt gemessene Build lag bei etwa 33,96 MiB; Legacy-Assets und Chunk-Splitting werden erst in einer späteren Release-/Portalphase behandelt.

## 9. Sichere Umsetzung in Etappen

Jede Etappe endet mit Stop-Gate und eigener Abnahme. Keine Etappe mischt UI-Redesign, Gameplay-Balance, AI und Assetproduktion gleichzeitig.

### E0A – Baseline und Messbarkeit

- Spawn-Schutz-, Ammo-, Pickup-Race-, Jump-Start/-Erfolg- und CTF-Rollenmetriken als Tests/Diagnosen definieren.
- Tests/Scripts typprüfbar machen.
- Bestehende Desktop-Screenshots für 1920×1080, 1366×768 und 1024×768 festhalten.
- Einen fokussierten Route-/Teardown-Smoke für schnelle Wechsel zwischen Menü, Match und Reload-Zuständen ergänzen.

Gate: bestehende 57 Tests grün, neue Baselines nachvollziehbar, keine Runtime-/Visual-Änderung.

### E0B – CSS-Sicherheitsumbau ohne Redesign

- Globales CSS nach Surface trennen und Cascade-Reihenfolge explizit machen.
- Career/Quick-Play-Spezifität, Overlay-Themes und Focus-Contracts testen.

Gate: Pixel-/Browser-Vergleich zeigt bis auf den bewusst korrigierten Primärstatus keine unbeabsichtigten Änderungen.

### E0C – Renderer-Nähte ohne Verhaltensänderung

- Actor-, Pickup- und Objective-Rendering aus dem Orchestrator lösen.
- Kamera/Map-Atmosphäre getrennt halten.

Gate: alle Maps/Modi starten, Screenshots und Bot-Diagnosen bleiben funktional gleich.

### E1 – Desktop UI Reliability und De-Cardification

- Canvas-Fit, Quick-Play-CTA, Career-Hierarchie, dunkle Pause, Focus/Contrast.
- Main/HQ/Recruitment nach der Drei-Ebenen-Regel vereinfachen.
- Recruitment rein kosmetisch und side-by-side gestalten.

Gate: vollständige Desktop-Matrix, kompletter Drei-Match-League-Flow, kein CTA außerhalb des Viewports, keine helle Restfläche, keine Console-Fehler.

### E2A – Spawn-Schutz

- Mechanik, Damage-/Knockback-Contract, sofortiger Abbruch bei Angriff/Objective.
- Zunächst prozedurale Bubble und lokale Restzeitanzeige.

Gate: Unit-/Smoke-Tests plus manueller 1v1-/2v2-Spawn-Camp-Versuch in allen Modi.

### E2B – Ammo und Arc-Lash-Grundfunktion

- Messbaseline aus E0A auswerten.
- Auto-targeted Desktop Arc Lash und bevorzugte Grundwaffenhypothese separat implementieren.
- Ally-Bot-Courtesy als eigener, abschaltbarer Vergleich.

Gate: kein Actor bleibt unvertretbar lange komplett offensiv handlungsunfähig; Rocket/Rail-Pickup-Kontrolle bleibt relevant; nur ein Balance-Parameter pro Testlauf.

### E3 – AI Traversal und Rollen

- Zuerst echte Jump-Start/-Erfolgsmetriken, danach gezielte Jump-Link-Utility.
- Anschließend, in separatem Change, dynamische CTF-Sweeper-/Defender-Rollen.

Gate: sichtbare sinnvolle Traversals ohne Combat-Hop-Spam; 2v2-Bot verlässt ohne Bedrohung die Base, Recovery-Leistung regressiert nicht.

### E4 – High-Impact-Assets

- Arc-Lash Pickup/HUD/Effect.
- Core Relay Banner mit Links-/Rechts-Cloth-Sheet.
- Pickup-Pad-States.

Gate: Asset-Provenance dokumentiert, transparente Kanten geprüft, 32–64-px-Lesbarkeit und alle drei Map-Themes im Browser bestätigt.

### E5 – Character-Idle-Pilot und Rollout

- System und ein Pilot-Special-Idle.
- Nach Abnahme Character für Character produzieren; kein Neuner-Batch ohne Pilot.

Gate: unterbrechbar, keine Gameplay-/Hitbox-Auswirkung, keine Richtungsfehler, Humor bleibt kurz und lesbar.

### E6 – League-/HUD-P1

- HQ-Dichte, Progression-Microcopy, modusspezifische Result-Stats, Typografie.
- HudPort/Test-Suites beim Berühren schrittweise splitten.

Gate: kompletter League-Run und TAB/Pause/Result auf allen Desktop-Viewports.

### Spätere eigene Phasen

- Map-Überarbeitung, danach Map-Thumbnails.
- Mobile-/Touch-Produktentscheidung und eigenes UX-Konzept.
- Portal-/Paketgrößenoptimierung inklusive Legacy-Asset-Bereinigung und Chunking.

## 10. Empfohlener nächster Schritt

Als nächstes nur **E0A** umsetzen: Messverträge und Sicherheitsnetze für Spawn-Schutz, Ammo/Pickup-Races, echte Bot-Jumps und CTF-Rollen. Danach E0B und E0C als verhaltensneutrale, kleine Strukturänderungen. Erst wenn diese Gates grün sind, folgt E1.

So bleiben die großen Themen einzeln überprüfbar, und UI-, Gameplay-, AI- und Asset-Probleme werden nicht in einem einzigen riskanten Umbau vermischt.
