# Premium-Map Botverhalten und Audit

Stand: 2026-07-19

Dieses Dokument beschreibt die aktuell produktive Botlogik auf:

- Helix Canopy (`helix-canopy-v2`)
- Temple of the Drowned Sun (`drowned-sun-temple-v2`)
- Foundry Circuit (`flow-circuit-v2`)

Es dokumentiert ausserdem den neuen reproduzierbaren Mehrfachlauf-Audit.
Der Audit beobachtet vorhandenes Verhalten. Er veraendert keine Botwerte,
Mapdaten, Waffenbalance oder Objective-Regeln.

## Kurzfazit

Vor diesem Paket gab es bereits:

- umfangreiche Headless-Simulationen,
- einen Kurz-Smoke fuer jeden Modus, jede Map und 1v1 bis 4v4,
- gezielte Tests fuer TDM-Pickups und Standoff,
- gezielte CTF- und One-Flag-Szenarien,
- gespeicherte JSON-/Markdown-Diagnosen.

Es fehlte jedoch eine lange, wiederholte Vergleichsmatrix nur fuer die drei
Premium-Maps. Menschliche CTF-Kommandos wurden ausserdem nur als kleine
Entscheidungstests, nicht als vollstaendige Matches miteinander verglichen.

Der neue Audit fuehrt standardmaessig aus:

- 3 Premium-Maps,
- 3 Modi,
- 6 reproduzierbare Laeufe je Map und Modus,
- 2v2,
- 18 Sekunden je Lauf,
- insgesamt 54 Headless-Matches.

Der erste vollstaendige Lauf fand keine Runtime-Totalausfaelle und keine
invaliden Positionen. Er zeigt aber einen reproduzierbaren Logikkonflikt in
Temple-TDM sowie echte laengere Navigationsstalls auf Helix.

## Produktiver Entscheidungsweg

Jeder Bot durchlaeuft pro Core-Frame dieselben Schichten:

1. Der Modus-Controller waehlt einen semantischen Zweck:
   Gegner bekaempfen, Pickup suchen, Flagge angreifen, Carrier verfolgen,
   eskortieren oder verteidigen.
2. `GridBotNavigator` berechnet einen Weg zu diesem Ziel.
3. `BotCombatStandoff` entscheidet bei kampfbezogenen Zielen, ob der Bot
   annaehern, zurueckweichen oder seine Position halten soll.
4. `TdmBotCombatController` waehlt unabhaengig davon eine aktuell
   einsetzbare Waffe.
5. Der Controller erzeugt Move-, Aim-, Jump- und gegebenenfalls
   Fire-Intents.
6. `GameplayCoreRuntime` verarbeitet Bewegung, Kollision, Objectives,
   Pickups, Kampf, Tod und Respawn.

Wichtig: Zielwahl, Bewegung und Waffenauswahl sind getrennte Entscheidungen.
Dadurch kann eine Schicht eine sinnvolle Einzelentscheidung treffen, deren
Kombination trotzdem zu Leerlauf fuehrt. Genau solche Kombinationen misst
der neue Audit.

## Gemeinsame Navigation

`GridBotNavigator` verwendet A* auf einem 40-Einheiten-Raster.

| Regel | Aktueller Wert oder Verhalten |
| --- | --- |
| Repath | alle 420 ms |
| Zusaetzlicher Repath | Zielkey wechselt oder alter Pfad ist erschoepft |
| Waypoint erreicht | innerhalb von 24 Einheiten |
| Hindernis-Padding | 18 Einheiten um Solids und Gaps |
| Bewegung | acht Nachbarzellen, diagonale Schritte erlaubt |
| Spruenge | ausschliesslich authorierte Jump-Links |
| Kein Pfad | Navigator gibt den Startpunkt als Fallback zurueck |

Ein rohes Ziel kann im Hindernis-Padding liegen, obwohl der Bot auf dem Weg
dorthin weiter Fortschritt macht. Deshalb wertet der Audit
`blockedGoalFrames` allein nur als Hinweis. Erst zusammen mit einem
Move-Intent-Stall oder einer hohen Pfadfehlerrate wird daraus eine Warnung.

## Gemeinsames Combat-Standoff

Bei direkter Sichtlinie und ohne Gap zwischen Bot und Gegner gilt:

| Distanz | Bewegung |
| --- | --- |
| unter 96 | Rueckzug auf etwa 160 |
| 96 bis 210 | Position halten |
| ueber 210 | auf etwa 160 annaehren |

Ohne Sichtlinie oder bei einem Gap wird der Gegner normal verfolgt.

Die Halteentscheidung prueft nicht, ob in genau diesem Moment eine Waffe
einsatzbereit ist. Die Waffenauswahl geschieht erst danach. Das ist der
wichtigste aktuell gefundene gegensaetzliche Entscheidungsfaktor.

## Waffenauswahl der Bots

Die Reihenfolge bei Sichtlinie ist:

1. Arc Lash innerhalb ihrer effektiven Nahreichweite,
2. Rail auf bevorzugter grosser Distanz nach 320 ms Reaktion,
3. Rocket zwischen 190 und 700,
4. Ricochet Disc ab 170,
5. Pulse Repeater,
6. Shardcaster,
7. Lob Grenade ab 280,
8. Rail notfalls auch unter ihrer bevorzugten Distanz.

Ohne Sichtlinie wird ausschliesslich die Lob Grenade ab 220 Distanz
erwaegt.

Zusaetzlich gelten immer:

- Waffe muss im Map-Roster liegen,
- Cooldown muss bereit sein,
- Munitionswaffen brauchen Munition,
- Ziel muss innerhalb der Waffenreichweite liegen.

Rocket verwendet begrenzten Bewegungsvorhalt, kleine deterministische
Ungenauigkeit und gelegentlich einen sichtbaren Splash-Punkt an einer
nahen Wand. Rail verwendet eine Reaktionszeit und auf grosse Distanz
groessere deterministische Zielabweichung.

## Team Deathmatch

### Gegnerwahl

- Naechster aktive Gegner wird gewaehlt.
- Bei exakt gleicher Entfernung entscheidet die stabile Actor-ID.
- Das Ziel wird nicht nach Health, Waffe oder Objective-Wert gewichtet.

### Pickup-Entscheidung

Ein Pickup kann den Kampfweg ueberstimmen:

- Health bei hoechstens 55 Prozent Health,
- Armor nur fuer Slot 4 bei hoechstens 50 Prozent Armor,
- bevorzugte Pickup-Waffe des Slots bei 0 Munition,
- maximale Suchdistanz 720,
- ein begonnenes Pickup-Ziel bleibt 850 ms kleben.

Wenn der Gegner naeher als 230 ist und der Bot mehr als 25 Health besitzt,
wird keine neue Pickup-Suche gestartet. Ein bereits klebendes Ziel darf
kurz weiterlaufen.

Die bevorzugte Pickup-Waffe wird aus den Munitionswaffen des jeweiligen
Map-Rosters abgeleitet. Die Slots rotieren durch diese Liste.

Ein Waffenpickup kann fuer einen nahen menschlichen Mitspieler reserviert
werden, wenn dieser mindestens so wenig Munition besitzt. Health und Armor
werden nie auf diese Weise reserviert.

### Formation

- Ohne Pickup wird die Standoff-Position slotabhaengig auf verschiedene
  Hoehenbahnen verschoben.
- Wenn mindestens zwei Teamkameraden innerhalb von 170 stehen, wird eine
  zusaetzliche Cluster-Separation aktiviert.
- Ein echter Standoff-Hold wird nur verwendet, wenn weder Pickup noch
  Separation gerade Vorrang haben.

### Gefundener TDM-Konflikt

Folgende Regeln koennen eine Schleife bilden:

1. Gegner ist naeher als 230, daher wird die Pickup-Suche abgebrochen.
2. Standoff versucht etwa 160 Distanz zu halten.
3. Arc Lash reicht effektiv nur ungefaehr 136.
4. Rocket beginnt erst ab 190, Disc ab 170 und Lob Grenade ab 280.
5. Ohne passende Munition oder bei 160 Distanz waehlt Combat keine Waffe.
6. Standoff fordert trotzdem weiterhin Stillstand.

Temple of the Drowned Sun reproduziert diese Schleife besonders stark.

## Classic CTF

### Rollen

| Team-Slot | Rolle |
| --- | --- |
| 1 | Attacker |
| 2 | Defender |
| 3 | Support |
| 4 | Attacker |

Der 2v2-Defender verhaelt sich adaptiv:

- beim Start 1.600 ms Basisanker,
- bei einem Invader 2.500 ms erneuter Anker,
- danach Sweep Richtung Mitte beziehungsweise Teamkamerad,
- beim fortgeschrittenen eigenen Carrier-Return darf er eskortieren,
- einen weit heimwaerts gebrachten gegnerischen Flag-Drop darf er sichern.

### Prioritaeten

Die Reihenfolge ist verbindlich:

1. selbst getragene gegnerische Flagge zur eigenen Basis bringen,
2. eigene gedroppte Flagge aufnehmen,
3. gegnerischen Carrier der eigenen Flagge jagen,
4. aktives menschliches Teamkommando,
5. verbuendeten Carrier eskortieren,
6. gegnerischen Flag-Drop fortsetzen,
7. Rollenlogik fuer Attack, Defense oder Support.

Die Punkte 1 bis 3 sind Notfaelle und ueberstimmen jedes menschliche
Kommando absichtlich.

## Menschliche Kommandos

Kommandos werden aktuell nur in Classic CTF bei einem Solo-Spieler gegen
Bots angeboten.

| Eingabe | Kommando | Wirkung auf blaue Bot-Teamkameraden |
| --- | --- | --- |
| `1` / Button | Defend | Invader nahe eigener Basis verfolgen, sonst Defender-Route patrouillieren |
| `2` / Button | Follow | etwa 80 bis 145 Einheiten Abstand zum menschlichen Spieler halten |
| `3` / Button | Attack | gegnerische Flagge angreifen oder eigenen Carrier eskortieren |

Dasselbe Kommando ein zweites Mal schaltet zurueck auf `Auto`. Ein anderes
Kommando ersetzt das alte sofort.

Kommandos wirken nicht in TDM oder One Flag. Sie geben keinen Bonus auf
Schaden, Geschwindigkeit oder Navigation.

Der Audit verwendet fuer den menschlichen Spieler einen separaten,
unkommandierten Attacker-Controller als reproduzierbaren Bewegungsproxy.
Nur die uebrigen blauen Teamkameraden erhalten das Testkommando. Dadurch
wird nicht versehentlich der simulierte Mensch selbst kommandiert.

Der erste Audit fand in keinem Kommando-Lauf einen unerlaubten Konflikt:

- alle Nicht-Notfall-Frames entsprachen dem aktiven Kommando,
- Abweichungen waren vollstaendig durch Flaggen-Notfaelle erklaert,
- die hohen Override-Anteile bei Follow und Attack sind deshalb kein
  Befehlsfehler, sondern Folge der aktuellen Prioritaetsreihenfolge.

## One Flag

Die Zielwahl ist eine feste Hierarchie:

1. selbst getragene neutrale Flagge zur gegnerischen Capture-Basis bringen,
2. gegnerischen Carrier jagen,
3. eigenen Carrier eskortieren,
4. neutrale Flagge in der Mitte aufnehmen,
5. Mitte kontrollieren, falls kein aktiver Carrier und keine Home-Flagge
   vorhanden ist.

Carrier- und Escort-Ziele koennen innerhalb oder direkt neben Cover liegen.
Darum projiziert der Controller diese dynamischen Ziele auf einen freien
Punkt:

- zuerst auf der Achse zum Bot,
- danach auf beiden Querachsen,
- in 16er-Schritten,
- bis maximal 240 Einheiten.

Combat-Standoff wird nur fuer die direkte Jagd auf einen gegnerischen
Carrier verwendet.

## Vorhandene automatische Tests vor diesem Audit

### `tests/bot-simulation.test.ts`

Bereits vorhanden sind:

- lange Repraesentativmatrix:
  - TDM auf Training Crossing,
  - Classic CTF auf Flank Switch,
  - One Flag auf Grand Archive,
  - jeweils 1v1 bis 4v4;
- Kurz-Smoke fuer jeden Modus, jede registrierte Map und 1v1 bis 4v4;
- langer Foundry-2v2-Test in allen Modi;
- TDM: Low-Health gegen sichtbaren Gegner;
- TDM: Armor- und Waffenpickup-Prioritaet;
- TDM: bewusstes Combat-Standoff;
- Classic CTF: Reaktion auf gestohlene eigene Flagge;
- One Flag: Escort-/Chaser-Hotzone und Navigator-Telemetrie.

### `tests/gameplay-core.smoke.test.ts`

Bereits vorhanden sind kleine deterministische Entscheidungstests fuer:

- CTF-Rollen,
- adaptiven 2v2-Defender,
- Follow, Attack und Defend,
- Umschalten desselben Kommandos zurueck auf Auto,
- Flaggen-Notfaelle vor menschlichem Kommando,
- TDM-Waffenwahl und Pickup-Intents.

### `npm.cmd run bot:diagnostics`

Der allgemeine Diagnosebefehl speichert bereits:

- `diagnostics/bots/latest.json`,
- `diagnostics/bots/latest.md`,
- historische JSON-Artefakte.

Seine lange Hauptmatrix konzentriert sich aber auf die drei
Repraesentativmaps. Die Premium-Map-Abdeckung ist dort ein kurzer Smoke und
keine Mehrfachserie.

## Neuer Premium-Audit

Ausfuehrung mit Standardwerten:

```bash
npm.cmd run bot:audit:premium
```

Optionale Parameter:

```bash
npm.cmd run bot:audit:premium -- --runs 8 --duration-ms 30000 --team-size 2
```

Gespeicherte Ausgaben:

- `diagnostics/bots/premium/latest.json`
- `diagnostics/bots/premium/latest.md`
- `diagnostics/bots/premium/history/<timestamp>.json`

Der gespeicherte Audit akzeptiert 5 bis 10 Laeufe je Map und Modus.
Teamgroesse kann 1 bis 4 sein. Fuer einen aussagekraeftigen
Kommandotest ist mindestens 2v2 erforderlich.

### Reproduzierbare Variation

TDM und One Flag verwenden einen Baseline-Lauf und kontrollierte,
map-gepruefte Startpositionsvarianten.

Classic CTF verwendet sechs Vergleichsprofile:

1. Auto,
2. Defend,
3. Follow,
4. Attack,
5. Defend -> Follow -> Attack -> Auto,
6. Auto mit Startpositionsvariation.

Die Variation ist aus Map, Modus, Actor und Laufindex gehasht. Es gibt keine
unkontrollierte Zufallsquelle. Derselbe Code und dieselben Parameter liefern
deshalb denselben Simulationsverlauf.

## Gemessene Faktoren

Pro Actor:

- aktive Zeit und getrennte Tot-/Respawnzeit,
- gesamte Laufstrecke,
- laengste Stationaerphase,
- Zeit mit Bewegungsabsicht,
- laengster Stillstand trotz Bewegungsabsicht,
- absichtliche Standoff-Haltezeit,
- laengster Standoff ohne Schuss,
- laengster Standoff ohne nach Botregeln einsetzbare Waffe,
- Frames mit blockiertem Ziel,
- Frames ohne gefundenen Pfad trotz Bewegungsbedarf,
- Repaths,
- Goal-/Intent-Wechsel,
- Zielkey-Wechsel,
- starke Richtungsumkehr,
- Schuesse, Damage-Events, Pickups, Kills und Tode,
- Verteilung der semantischen Goals oder Intents,
- Kommando-Befolgung, erlaubte Notfall-Overrides und echte Konflikte.

Pro Lauf:

- Score-Events,
- Flag-Pickups und Captures,
- leere Action-Frames,
- invalide Positionen,
- Matchende,
- automatische Befunde.

## Automatische Einstufung

Ein Befund wird unter anderem erzeugt bei:

- mindestens 1.000 ms Stillstand trotz Move-Intent,
- mindestens 2.500 ms Standoff ohne Schuss,
- mindestens 1.500 ms Standoff ohne einsetzbare Waffe,
- mindestens 8 Prozent Pfadfehler,
- mindestens 8 Prozent blockierte Ziele,
- sehr geringer Wegleistung ueber eine lange aktive Zeit,
- Kommando-Konflikt ohne Flaggen-Notfall,
- TDM-Deadlock: kein Score und mindestens die Haelfte des Teams lange ohne
  einsetzbare Waffe im Standoff.

Blockierte Ziele ohne messbaren Bewegungsstall sind nur ein Info-Hinweis.
Tot-/Respawnzeit zaehlt nicht als Inaktivitaetsfehler.

## Ergebnis des ersten 54-Lauf-Audits

Die vollstaendigen Werte stehen unter:

- `diagnostics/bots/premium/latest.md`
- `diagnostics/bots/premium/latest.json`

### Helix Canopy

| Modus | Befund |
| --- | --- |
| TDM | durchschnittlich 3,67 Score-Events; gute Bewegung, aber wiederholte waffenlose Standoffs bis 6.868 ms und einzelne Move-Stalls bis 1.360 ms |
| Classic CTF | Objectives funktionieren; durchschnittlich 1,67 Flag-Pickups und 0,5 Captures; einzelne echte Stalls bis 6.460 ms |
| One Flag | im Mittel 3,17 Pickups und 1,67 Captures; zwei reproduzierte rote Move-Stalls um 4,3 bis 4,5 Sekunden |

Helix besitzt damit die wichtigsten echten Navigationskandidaten fuer die
naechste Untersuchung.

### Temple of the Drowned Sun

| Modus | Befund |
| --- | --- |
| TDM | in 5 von 6 Laeufen 0 Score; durchschnittlich nur 0,17 Score-Events; waffenloses Standoff bis 14.008 ms; klarer Entscheidungs-Deadlock |
| Classic CTF | stabil; durchschnittlich 2 Flag-Pickups und 1,5 Captures; keine Auditwarnung |
| One Flag | stabiler Objective-Kontakt mit 4,17 Pickups; 0,33 Captures im 18-Sekunden-Fenster; keine Auditwarnung |

Dass Temple in CTF und One Flag gut laeuft, waehrend TDM festhaengt, spricht
gegen einen allgemeinen Map- oder Navigatorfehler. Der Fehler liegt sehr
wahrscheinlich in der Kombination aus TDM-Pickupabbruch, Standoff-Distanz
und Waffen-Mindestdistanzen.

### Foundry Circuit

| Modus | Befund |
| --- | --- |
| TDM | durchschnittlich 3,17 Score-Events und gute Bewegung; viele rohe blockierte Zielmeldungen, aber maximal 34 ms Move-Stall; derzeit kein belegter Navigator-Deadlock |
| Classic CTF | 1,83 Flag-Pickups, aber kein Capture innerhalb von 18 Sekunden; Bewegung bleibt stabil; fuer Outcome-Bewertung laenger testen |
| One Flag | durchschnittlich 3 Pickups und 0,83 Captures; keine Auditwarnung |

Die hohe Foundry-TDM-Rate blockierter Rohziele sollte beobachtet werden.
Weil Pfadfehler und Move-Stalls praktisch fehlen, ist sie aktuell niedriger
zu priorisieren als Temple-TDM oder die Helix-Stalls.

## Priorisierte Verbesserungsmoeglichkeiten

### P0: Temple-TDM-Deadlock aufloesen

Kleinster sinnvoller Fix:

- Standoff nur halten, wenn `TdmBotCombatController` tatsaechlich eine
  einsetzbare Waffe besitzt, oder
- ohne einsetzbare Waffe weiter in Arc-Lash-Reichweite schliessen, oder
- die Pickup-Suche bei Gegnerdistanz unter 230 nicht abbrechen, wenn am
  gewuenschten Standoff-Punkt keine Waffe einsetzbar ist.

Diese Varianten sollten als getrennte A/B-Tests gegen denselben Audit laufen.

### P1: Helix-Stalls mit engem Trace isolieren

Fuer die betroffenen Laufprofile sollten zusaetzlich gespeichert werden:

- Weltposition und Zielposition beim Beginn des Stalls,
- aktuelle Rasterzelle und Waypoint,
- aktiver Jump-Link,
- Collision-Normalen der letzten Sekunden,
- Goal- und Zielkey-Verlauf.

Erst danach sollte entschieden werden, ob Map-Waypoints, Zielprojektion oder
Navigator-Padding korrigiert werden.

### P1: Foundry-Zielprojektion beobachten

Viele Gegner- oder Standoff-Ziele liegen im Navigator-Padding. Da die Bots
trotzdem laufen und scoren, ist kein sofortiger Gameplay-Fix belegt.
Sinnvoll waere eine lokale Projektion dynamischer Combat-Ziele auf den
naechsten freien Rasterpunkt, gefolgt von einem Auditvergleich.

### P2: Laengere Objective-Outcome-Laeufe

Foundry Classic CTF und Temple One Flag erreichen Objectives, capturen aber
im kurzen Fenster ungleichmaessig. Fuer Balancingaussagen sollten zusaetzlich
30 bis 60 Sekunden lange Laeufe verwendet werden.

## Bewusste Grenzen

Der Audit beantwortet technische Aktivitaet und Entscheidungsfolgen. Er
beantwortet nicht:

- ob Bewegung im Browser natuerlich aussieht,
- ob ein Kommando fuer einen echten Menschen subjektiv schnell genug wirkt,
- ob Bots strategisch stark oder fair gebalanced sind,
- echtes Mobile-/Touch-Verhalten,
- Renderperformance,
- menschliche Unvorhersehbarkeit,
- langfristige 1v1-, 3v3- und 4v4-Balance.

Der bestehende Kurz-Smoke deckt weiterhin 1v1 bis 4v4 strukturell ab. Fuer
lange Serien bleibt 2v2 der Standard, weil dort Teamrollen, Objectives,
Kommandos und Laufzeit noch gut vergleichbar sind.

