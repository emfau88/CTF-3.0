# Bot-KI v2: Architektur und Map-Vertrag

Stand: 2026-07-19

Dieses Dokument beschreibt die gemeinsame Bot-KI für Team Deathmatch,
Classic CTF und One Flag. Sie ist nicht auf die drei Premium-Maps
zugeschnitten: Neue und umgebaute Maps verwenden denselben Vertrag und
dieselben automatischen Prüfungen.

## Zielbild

Bots sollen nachvollziehbar und organisch wirken:

- Sie entscheiden nach einer bewerteten Gesamtsituation statt nach einer
  langen Folge widersprüchlicher Einzelregeln.
- Sie besitzen nur begrenzte Wahrnehmung und eine kurze Erinnerung.
- Bewegung und Schussentscheidung verwenden dieselbe Waffenbewertung.
- Teamkameraden übernehmen unterschiedliche, kurz gebundene Aufgaben.
- Blockierte Ziele, schlechte Wegpunkte und Sprungverbindungen führen nicht
  dauerhaft zu Stillstand.
- Alle wichtigen Entscheidungen sind im Audit als Trace nachvollziehbar.

Die KI erhält keine versteckten Vorteile. Sie erzeugt weder Schaden noch
Punkte außerhalb der normalen Spielregeln und kennt keine Gegnerposition,
auf die sie durch Wände schießen dürfte.

## Entscheidungsfluss

Pro Bot und Core-Frame laufen diese Schichten:

1. `ArenaBotTeamCoordinator` verteilt Teamaufgaben und priorisierte Gegner.
2. `BotTargetSelector` bewertet wahrgenommene Gegner und kurze Erinnerungen.
3. Der Modus-Controller erzeugt sinnvolle Handlungsoptionen.
4. `BotUtilityArbiter` wählt die beste Option mit kurzer Bindungszeit.
5. `BotCombatOpportunity` bewertet Distanz, Sicht, Munition und Cooldown
   für alle Waffen des aktuellen Map-Rosters.
6. `GridBotNavigator` projiziert das Ziel, berechnet und glättet den Pfad
   und bedient autorisierte Sprungverbindungen.
7. `BotLocalMovement` trennt nahe Teamkameraden und weicht gefährlichen
   Projektilen lokal aus. Es prüft dabei beide Ausweichseiten gegen Rand,
   Wände und Gaps, statt blind in die bevorzugte Seite zu drücken.
8. `TdmBotCombatController` zielt und feuert nur auf ein wahrgenommenes Ziel.

Die Debug-Zustände der Controller enthalten unter anderem Intent,
Combat-Bewertung, Zielbewertung, Teamrolle, Navigation und lokale
Ausweichentscheidung.

## Wahrnehmung und Zielwahl

Ein Gegner ist verwendbar, wenn mindestens eine Bedingung gilt:

- direkte Sicht innerhalb der Schwierigkeits-Reichweite,
- unmittelbare Nähe bis 165 Einheiten,
- innerhalb der letzten 1.250 ms gesehen,
- Objective-Träger oder durch das Team als strategisches Suchziel bekannt.

Die letzten beiden strategischen Fälle sind getrennt:

- Eine kurze Erinnerung darf noch als letzter bekannter Punkt verfolgt werden.
- Reines Team- oder Objective-Wissen darf Navigation auslösen, aber keinen
  Schuss durch Cover.
- Solange der Bot das gemeldete Ziel nicht selbst wahrnimmt, sucht er aktiv
  weiter und bleibt auch mit einer Granate nicht in einer Feuerposition
  stehen, aus der er regelkonform gar nicht schießen darf.

Die Zielbewertung berücksichtigt Distanz, Sicht, gegnerische Health,
Objective-Trägerstatus, Teamzuweisung und die Persönlichkeit des Bots.
Eine kurze Zielbindung verhindert hektisches Umschalten.

## Gemeinsame Waffenbewertung

`BotCombatOpportunity` ist die einzige taktische Quelle für Bewegung und
Waffenauswahl. Pro Waffe werden geprüft:

- im aktuellen Map-Roster,
- Munition vorhanden oder unendliche Arc Lash,
- Cooldown bereit,
- Sichtlinie oder erlaubte Lob-Geometrie,
- Mindest-, bevorzugte und maximale Kampfdistanz.

Das Ergebnis legt gemeinsam fest:

- welche Waffe jetzt feuern kann,
- für welche Waffe der Bot seine Position verändert,
- ob er annähert, verfolgt, hält oder zurückweicht.

Damit kann der Navigator nicht mehr bei einer Distanz anhalten, auf der der
Combat-Controller keine Waffe einsetzen kann. Arc Lash bleibt die verlässliche
Fallback-Waffe mit unendlicher Munition.

Rocket verwendet den echten Waffenrhythmus von 1.000 ms, begrenzten Vorhalt,
leichte deterministische Ungenauigkeit und gelegentliche Wand-Splash-Ziele.
Rail hat eine sichtbare Reaktionszeit und auf große Distanz mehr Streuung.

## Entscheidungen und Persönlichkeit

`BotUtilityArbiter` bewertet Optionen mit Score, Grund und optionalem
Notfallstatus. Eine plausible Entscheidung bleibt für kurze Zeit gebunden.
Ein echter Notfall darf diese Bindung sofort überstimmen.

Deterministische Persönlichkeitswerte variieren:

- Aggressivität,
- Objective-Fokus,
- Selbsterhaltung,
- Teamorientierung,
- bevorzugte seitliche Ausweichrichtung.

Die Profile `casual`, `normal` und `strong` definieren Reaktionszeit,
Entscheidungsbindung, Zielbindung, Zielungenauigkeit, Vorhalt und
Wahrnehmungsreichweite. Die Controller reichen das gewählte Profil bis zur
Waffenlogik durch. Eine Auswahl im Spielmenü ist bewusst noch nicht Teil
dieses Pakets.

## Teamkoordination

### Team Deathmatch

- Gegner werden nach Entfernung, Rest-Health, Objective-Gefahr und bereits
  vergebenen Teamzielen verteilt.
- Ein 4er-Team konzentriert sich deshalb nicht automatisch vollständig auf
  denselben Gegner.
- Die individuelle Zielbindung verhindert dennoch ein Umschalten in jedem
  Frame.

### Classic CTF

- 1v1: ein Angreifer.
- 2v2: Verteidiger und Angreifer.
- 3v3: Verteidiger, Support und Angreifer.
- 4v4: Verteidiger, Support und zwei Angreifer.

Verteidiger und Support werden anhand der aktuellen Position bestimmt und
dann 3.000 ms gebunden. Tod oder fehlende Verfügbarkeit löst eine frühere
Neuverteilung aus.

Bei gestohlener eigener Flagge reagieren nur die nächstgelegenen zuständigen
Bots: einer in kleinen Teams, höchstens zwei in 4v4.

Menschliche Kommandos werden verteilt:

- `Follow`: genau ein naher Bot folgt dem Menschen.
- `Defend`: Verteidiger und Support.
- `Attack`: Angreifer und Support.

Flaggen-Notfälle und ein selbst getragener Flaggenlauf haben weiterhin
Vorrang. Nicht zugewiesene Bots behalten ihre automatische Aufgabe.

### One Flag

Ohne Carrier gibt es genau einen Runner; die übrigen Bots kontrollieren Raum.

Mit eigenem Carrier entstehen:

- Carrier,
- Escort,
- Screen,
- übrige Controller.

Mit gegnerischem Carrier entstehen:

- Interceptor,
- Cutoff,
- übrige Controller.

Die Formation bleibt bei gleicher Spielsituation 2.000 ms stabil. Ein
Carrierwechsel löst sofort eine neue Verteilung aus.

## Navigation und Stuck-Recovery

Der Navigator verwendet A* auf einem 40-Einheiten-Raster.

| Regel | Wert |
| --- | ---: |
| Basis-Repath | 420 ms |
| deterministische Entzerrung | bis 180 ms |
| Waypoint erreicht | 24 Einheiten |
| Hindernis-Padding | 18 Einheiten |
| Zielprojektion | bis 280 Einheiten |
| Stufe 1: neu planen | ab 650 ms Stillstand |
| Stufe 2: Wegpunkt überspringen | ab 1.100 ms |
| Stufe 3: seitlich befreien | ab 1.800 ms |

Weitere Regeln:

- Diagonales Schneiden durch blockierte Ecken ist verboten.
- Unnötige Zwischenpunkte werden nur bei freier Verbindung geglättet.
- Ein blockiertes oder unerreichbares Ziel wird auf eine freie erreichbare
  Position projiziert.
- Der Rasterpfad endet anschließend an der exakten freien Zielposition, nicht
  nur am Mittelpunkt ihrer Rasterzelle. Dadurch werden kleine Pickups und
  Objectives zuverlässig wirklich berührt.
- Autorisierte Jump-Links bestehen aus Anlaufpunkt und Landepunkt. Der Bot
  läuft zuerst in den Aktivierungsradius und springt erst dann.
- Eine Sprungkante darf nur von Rasterzellen angeboten werden, von denen
  der Aktivierungsradius über einen freien Anlauf erreichbar ist. Der
  Navigator überspringt einen Anlaufpunkt niemals von außerhalb dieses
  Radius.
- Eine erfolglose Sprunganforderung wird nach der Landung erneut ausgelöst,
  statt als dauerhaft gehaltene Taste verloren zu gehen.
- Nach einem erfolgreichen Absprung bleibt die Sprungtaste bis zur Landung
  gehalten, auch wenn der Bot den engen Aktivierungsradius bereits in der
  Luft verlassen hat.
- Ein Sprung gilt nur innerhalb eines plausiblen Korridors zwischen Anlauf
  und Landung als aktiv. Veraltete Sprungpfade blockieren dadurch keinen
  Zielwechsel.
- Tod und Respawn leeren den alten Pfad. Ein taktischer Zielwechsel setzt
  hingegen den echten Stillstands-Timer nicht zurück.
- Pfadglättung verwendet das volle Kollisions-Padding. Während einer
  Recovery hat die Befreiungsrichtung Vorrang vor lokaler
  Teamkameraden-Separation und Projektilausweichung.
- Repaths mehrerer Bots werden deterministisch zeitlich verteilt, damit 4v4
  keine künstlichen CPU-Spitzen durch synchrone A*-Läufe erzeugt.

## Vertrag für neue Maps

Jede `WorldMapData` benötigt ein `botProfile` der Version 1:

```ts
botProfile: {
  version: 1,
  navigation: "auto-grid",
  tacticalZones: [
    {
      id: "map-control",
      kind: "control",
      position: { x: 1000, y: 500 },
      radius: 140,
    },
  ],
}
```

Erlaubte Zonentypen sind `control`, `flank`, `cover` und `pickup`.
Zonen erzeugen keine Kollision und keinen Gameplay-Bonus. Sie sind
semantische Orientierungspunkte für Teamentscheidungen.

`validateWorldMapBotSupport(map)` prüft automatisch:

- Bot-Profil vorhanden und gültig,
- eindeutige, spielbare taktische Zonen,
- erreichbare Jump-Link-Aktivierungszonen mit freiem Anlauf,
- Pickups, Basismitten, Combat-Zone und taktische Zonen liegen im Spielraum,
- alle kritischen Ziele sind von beiden Teamstarts erreichbar.

Alle derzeit registrierten Maps erfüllen diesen Vertrag. Neue Maps sollen
erst registriert werden, wenn diese Prüfung grün ist.

## Bewusst nicht eingebaut

- keine Map-ID-Sonderfälle in der KI,
- kein Teleport als Stuck-Recovery,
- kein Schießen auf ausschließlich teamweit bekannte Positionen,
- keine perfekte Zielgenauigkeit oder sofortige Rail-Reaktion,
- keine globale Verfolgung jedes Flaggen-Notfalls durch das ganze Team,
- keine Gameplay-Boni durch Rollen oder Kommandos,
- keine Schwierigkeitsauswahl im HUD oder Touch-Umbau.

## Relevante Tests

- `tests/bot-ai-v2.test.ts`: Wahrnehmung, Utility-Bindung, Kommandos,
  Teamformationen, lokale Bewegung, Zielprojektion, Jump-Anlauf und
  Map-Vertrag.
- `tests/bot-simulation.test.ts`: echte Runtime-Matrix, Langläufe und
  modusspezifische Szenarien.
- `tests/bot-traversal-smoke.test.ts`: jeder autorisierte Jump-Link.
- `tests/premium-bot-audit.test.ts`: Reproduzierbarkeit und
  Kommandovergleich.
- `tests/premium-bot-audit.ts`: gespeicherte Mehrfachsimulationen,
  Performancewerte und problembezogene Entscheidungstraces.
