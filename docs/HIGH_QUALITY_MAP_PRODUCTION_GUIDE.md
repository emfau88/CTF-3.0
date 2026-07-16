# Leitfaden für hochwertige CTF-3.0-Maps

Stand: 2026-07-16  
Referenzmaps: `Helix Canopy` und `Temple of the Drowned Sun`

Dieses Dokument ist die zentrale Übergabe für zukünftige Map-Arbeit. Es
beschreibt den technischen Aufbau, den tatsächlich erfolgreichen
Produktionsablauf, die wichtigsten Fehler und Erkenntnisse sowie die noch nicht
umgesetzten Mapkonzepte.

Ein neuer Chat soll vor neuer Map-Arbeit mindestens dieses Dokument,
`docs/helix-canopy-design.md` und die aktuelle Mapdatei der gewählten
Referenzmap lesen.

## 1. Warum Helix und Temple hochwertiger wirken

Die älteren Maps funktionieren technisch, wirken aber stärker wie
zusammengesetzte Spielbausteine. Viele Wand- und Hindernisassets haben
unterschiedliche Perspektiven, Höhen und Silhouetten. Im schnellen Spiel ist
dadurch nicht immer sofort klar:

- was begehbarer Boden ist,
- was Körper und Projektile blockiert,
- was übersprungen werden kann,
- was lediglich Dekoration ist.

Helix Canopy und die überarbeitete Temple-Map lösen das anders:

1. Eine vollständige, zusammenhängende Draufsicht ist die visuelle
   Hauptquelle.
2. Gameplay-Kollision wird anschließend eng an den im Bild sichtbaren
   Hindernissen ausgerichtet.
3. Die Hindernisse gehören zu einer gemeinsamen, niedrigen
   Silhouettenfamilie.
4. Dekoration liegt flach im Boden oder am unspielbaren Rand und sieht nicht
   wie zusätzliche Deckung aus.
5. Basen, Mitte und Landmarken sind Teil einer Gesamtkomposition statt separat
   darübergelegte Module.
6. Das Masterbild wird immer proportional dargestellt. Runde und quadratische
   Motive werden nicht in beliebige Rechtecke verzerrt.

Die wichtigste Lehre lautet:

> Erst eine verständliche Arena entwerfen, dann ein kohärentes Zielbild
> erstellen und zuletzt die technische Geometrie exakt an dieses Bild
> anpassen. Nicht unabhängig voneinander Gameplay-Rechtecke und dekorative
> Assets verteilen.

## 2. Tatsächliche Map-Architektur

Eine V2-Map ist statisches TypeScript-Datenmodell in
`src/core/world/maps/`. Der zentrale Vertrag steht in
`src/core/world/maps/worldMapData.ts`.

Jede Map definiert:

- `geometry.bounds`: Größe der Welt,
- `geometry.solids`: rechteckige Projektile-/Körperhindernisse,
- `geometry.gaps`: nicht begehbare Flächen,
- `navigation.jumpLinks`: gerichtete, authored Sprungverbindungen,
- `spawnPoints`: vollständige Teamslots bis 4v4,
- `pickupSpawns`: Health, Armor und Waffen,
- `gameplay.blueBase` und `gameplay.redBase`,
- `gameplay.combatZone`: unter anderem die neutrale One-Flag-Mitte,
- `presentation`: Theme, sichtbare Geometrie und Bot-Routen,
- `diagnosticSpawn`: reproduzierbarer Teststart.

Wichtige Verbraucher:

- `src/core/world/maps/worldMapRegistry.ts`
- `src/core/world/maps/worldMapValidation.ts`
- `src/core/world/maps/worldMapQuality.ts`
- `src/core/world/maps/worldMapClearance.ts`
- Botnavigation und modusabhängige Botcontroller unter `src/core/`
- `src/arenaRenderer.ts`
- `src/adapters/phaser/PhaserArenaRendererPort.ts`
- `src/adapters/phaser/scenes/GameplayV2Scene.ts`
- `src/assets.ts`
- `index.html` für Quick Play
- `src/meta/league/leagueCatalog.ts` für die Liga

Technische Grenzen:

- Es gibt nur eine echte 2D-Ebene.
- Solids und Gaps sind achsenparallele Rechtecke.
- Höhe ist nur eine temporäre Sprungdarstellung.
- Echte übereinanderliegende Stockwerke existieren nicht.
- Sprünge der Bots und Spieler bleiben authored Traversals. Keine zufälligen
  Combat- oder Bunny-Hops einbauen.
- Portale, dynamische Schalter, bewegliche Geometrie und kontrollierbare
  Gefahren sind keine bloßen Mapfeatures. Sie benötigen neue Engine-, Bot-,
  Objective-, Rendering- und Diagnostiksysteme.

## 3. Verbindliche Produktionsmethode für neue Premium-Maps

### Phase A – technischer und produktseitiger Vertrag

Vor Code oder Bildgenerierung festlegen:

- unverwechselbare Fantasy und Silhouette,
- bevorzugte Teamgrößen,
- Priorität von TDM, Classic CTF und One Flag,
- drei verständliche Routenrollen,
- Basen, Objective, Spawns und Pickup-Risikozonen,
- Rail-Sichtlinien und Sichtlinienbrecher,
- Rocket-Splashräume ohne lange Zwangsschläuche,
- Arc-Lash-Nahkampfzonen mit Ausgängen,
- geplante authored Sprünge,
- stabile Weltgröße und Seitenverhältnis,
- klare Liste erlaubter Gameplay-Hindernisfamilien.

4v4 muss technisch starten und sichere Spawns besitzen, muss aber nicht die
frühe Detailbalance bestimmen. Helix wurde bewusst zuerst für 1v1 und 2v2
entworfen.

### Phase B – Greybox und Qualitätsverträge

Zuerst nur Mapdaten:

- Bounds,
- Solids und Gaps,
- acht Spawnslots,
- Basen und Combat Zone,
- Pickups,
- Bot-Routen,
- Jump Links.

Danach sofort automatisiert prüfen:

- alle drei Modi von 1v1 bis 4v4,
- freie Spawns, Objectives, Pickups und Jump-Endpunkte,
- keine Spawn-zu-Spawn-Sichtlinie,
- keine direkte Rail-/Rocket-Spamlinie zum One-Flag-Objective,
- gespiegelte Gameplay-Geometrie und Pickup-Ökonomie,
- unterschiedliche, messbare Routenlängen,
- ausreichende Objective-Clearance,
- erreichbare Bot-Routen,
- jeder einzelne authored Jump-Link.

Wenn dieses Gate rot ist, keine Assets produzieren.

### Phase C – vollständiges Zielbild

Nach grüner Greybox wird ein vollständiges Top-down-Zielbild erstellt.

Anforderungen:

- exakte Draufsicht,
- kompletter Arena-Rahmen,
- alle Basen und Landmarken,
- alle Gameplay-Hindernisse sichtbar,
- freie begehbare Wege eindeutig,
- symmetrische Gameplaystruktur,
- Dekoration nur ohne Regelkonflikt,
- keine Figuren, Pickups, UI, Flags oder Effekte im Master,
- keine scheinbaren zweiten Ebenen,
- keine perspektivisch hohen Pfeiler oder Tore, wenn ihre Gameplayregel nicht
  sofort verständlich ist.

Das Zielbild muss als Ganzes beurteilt werden. Kleine Asset-Einzelansichten
reichen nicht. Helix zeigte deutlich, dass technisch korrekte Module trotzdem
als Gesamtmap scheitern können.

### Phase D – integriertes Masterbild statt Asset-Collage

Für Helix und die finale Temple-Version ist das vollständige Arena-Masterbild
die visuelle Single Source of Truth.

- Das Bild wird proportional auf die Welthöhe gebracht.
- Die Breite ergibt sich aus dem nativen Seitenverhältnis.
- Es wird niemals unabhängig in X und Y gestreckt.
- Renderer-Rechtecke zeichnen keine zweiten Rahmen über bereits gemalte
  Basen, Wände oder Mittelzonen.
- Zusätzliche Effekte bleiben subtil und semantisch eindeutig, zum Beispiel
  Cenote-Schimmer oder Projektil-Impact auf Cover.

Modulare Einzelassets bleiben sinnvoll für wiederverwendbare Effekte oder
Rollback, aber nicht als konkurrierende zweite Geometriesprache.

### Phase E – Kollision aus dem Bild nachzeichnen

Kollision niemals nur aus einer alten Greybox übernehmen.

1. Masterbild im Spiel rendern.
2. `collisionDebug=1` aktivieren.
3. Rohrechtecke und die um den Spielerradius erweiterte effektive Sperrfläche
   prüfen.
4. Jedes Rechteck eng innerhalb der sichtbaren Steinkante beziehungsweise
   Pflanzeninsel platzieren.
5. Normale Bodenwege auf unsichtbare Kollision prüfen.
6. `clearanceHeatmap=1` beziehungsweise
   `sampleWorldMapClearance()` verwenden.
7. Engste repräsentative Passagen als feste Tests aufnehmen.

Ein sichtbares Hindernis ohne passende Kollision und eine Kollision ohne
sichtbares Hindernis sind beide Stop-Gate-Fehler.

### Phase F – echter Größenumbau

Wenn eine Map später mehr Platz benötigt, nicht einfach das Bild oder einzelne
Assets verzerren.

Zulässige Wege:

- ein neues, größeres Masterbild mit zusätzlichem nativen Boden erzeugen,
- Hindernisgruppen unverzerrt weiter auseinander platzieren,
- Bounds, Solids, Gaps, Spawns, Pickups, Objectives, Jump Links und Bot-Routen
  gemeinsam anpassen,
- danach Kollision erneut am neuen Master nachzeichnen.

Temple wurde so von `2160×920` auf `2280×980` erweitert. Die zusätzlichen
Flächen verbreitern die vorher zu engen Nord-/Südpassagen und die Zugänge zum
zentralen Sonnenhof. Die Hindernisse wurden nicht nur optisch skaliert.

### Phase G – Vollbild- und Gameplay-Abnahme

Pflichtprüfungen:

- saubere statische Gesamtübersicht mit `mapPreview=1`,
- Kollisionsansicht,
- Clearance-Stichprobe,
- TDM, CTF und One Flag,
- bevorzugte Teamgrößen sowie technischer 4v4-Smoke,
- Spawn- und Basissicherheit,
- Pickup-Erreichbarkeit,
- Botbewegung und Bot-Routen,
- alle Jump Links,
- Kamera bei normalen und kompakten Desktop-Viewports,
- menschlicher Schnellspiel-Test auf Lesbarkeit.

#### Verbindlicher Kamera- und Viewportvertrag

CTF-3.0 ist ein schnelles, skillbasiertes Arena-Spiel. Bewegung, Sprünge,
Projectile Lead, Positioning und Objectives müssen gleichzeitig lesbar bleiben.
Darum hat Übersicht Vorrang vor einem um jeden Preis randlos gefüllten
Viewport.

- Der gemeinsame Desktop-Zoom darf `1.05` nicht überschreiten.
- Eine Map darf die Kamera nicht weiter hineinzoomen, nur um ihre kürzere
  Weltachse bis an den Viewportrand zu strecken.
- Auf kleinen oder kompakten Viewports darf die Kamera weiterhin automatisch
  herauszoomen, damit mindestens die definierte Mindest-Sichtfläche erhalten
  bleibt.
- Kleine sichtbare Randbereiche an den äußeren Mapgrenzen sind akzeptabel,
  sofern Gameplayfläche, Figuren und Objectives dadurch besser überblickbar
  bleiben.
- Neue Premium-Maps sollen bereits im Greybox- und Masterbild-Stadium gegen
  diesen Kameravertrag gestaltet werden. Falls nötig, erhalten sie außerhalb
  der spielbaren Fläche einen thematisch passenden dekorativen Bleed, statt
  den Gameplay-Zoom zu erhöhen.
- Die Kamera ist ein konstanter Teil des Gameplay-Feelings. Neue Maps werden an
  den Kameravertrag angepasst; keine map-spezifischen Zoom-Sonderfälle
  einführen.
- Pflichtabnahme mindestens bei `1920×1080`, `1600×900`, `1366×768`,
  `1280×720`, `1024×768` und `2560×1080`, jeweils mit besonderem Blick auf
  Übersicht, Randdarstellung und konstante Actor-Größe.

Bei beendeten Botmatches `Play Again` auslösen, damit der nächste Test nicht am
Ergebnisbildschirm hängen bleibt.

### Phase H – Integration und Abschluss

- Map in `worldMapRegistry.ts` registrieren.
- Quick-Play-Eintrag in `index.html` ergänzen.
- Liga nur bewusst anpassen.
- Premium-Maps bei gewünschter Priorisierung oben anordnen.
- Übersicht unter `public/assets/map-previews/` aktualisieren.
- Map-spezifische Tests ergänzen.
- `npm test`
- `npm run test:typecheck`
- `npm run build`
- nur zugehörige Dateien stagen.
- fremde WIP-Dateien niemals versehentlich committen.

## 4. Referenz: Helix Canopy

Aktueller technischer Stand:

- Map-ID: `helix-canopy-v2`
- Welt: `2208×1104`
- Master: `public/assets/helix-canopy/arena-master.png`
- 24 Solids
- keine Gaps
- 4 authored Vault-Links
- 8 Spawnslots
- 11 Pickups
- bevorzugt 1v1 und 2v2
- 3v3 als Dichteprüfung
- 4v4 technisch abgesichert

Erfolgreicher Aufbau:

1. Orbitale Bio-Kuppel und vertikale Helix als klare Fantasy.
2. Drei Routenrollen: direkter Core, Canopy-Präzisionsroute und geschützte
   Root-Route.
3. Greybox mit vollständigem Gameplayvertrag.
4. Erste modulare Darstellung technisch korrekt, visuell aber nicht
   ausreichend.
5. Zweite modulare Korrektur ebenfalls im Vollbild abgelehnt.
6. Wechsel zu einem zusammenhängenden Masterbild.
7. Proportionale Darstellung des Masters.
8. Kollisionsrechtecke ausschließlich innerhalb sichtbarer Pflanzeninseln.
9. Reversible einheitliche Größenprüfung auf 115 Prozent.
10. Collision-Debug und Clearance-Heatmap als dauerhafte Diagnosewerkzeuge.

Wichtigste Helix-Lektion:

> Wenn die Gesamtkomposition nicht stimmt, beheben mehr Module und mehr
> Dekoration das Problem nicht. Ein starkes Gesamtbild mit daran angepasster
> Kollision ist besser als viele einzeln gute Assets.

## 5. Referenz: Temple of the Drowned Sun

Aktueller technischer Stand nach der Flächenerweiterung:

- Map-ID: `drowned-sun-temple-v2`
- Welt: `2280×980`
- Master: `public/assets/jungle-temple/arena-master-v2.png`
- Übersicht:
  `public/assets/map-previews/drowned-sun-temple-v2-overview.png`
- 27 Solids für 25 sichtbare Coverinseln
- 2 Cenoten
- 4 authored Cenote-Links
- 8 Spawnslots
- 13 Pickups
- TDM, Classic CTF und One Flag von 1v1 bis 4v4

Erfolgreicher Aufbau:

1. Drei Routen mit unterschiedlichen Rollen: Sun Causeway, Jaguar Gallery und
   Rootwater Run.
2. Vollständiger technischer Vertrag mit Spawns, Pickups, Objectives,
   Bot-Routen und Jump Links.
3. Frühe Assets und zusätzliche Code-Rahmen zeigten inkonsistente Perspektive,
   Größen und visuelle Doppelungen.
4. Panther-/Jaguar-Motive wurden proportional behandelt.
5. Basen wurden geometrisch und optisch gleich groß gemacht.
6. Die Cover-Sprache wurde auf niedrige bepflanzte Steinmodule vereinheitlicht.
7. Hohe oder mehrdeutige Säulen-/Wandformen wurden aus dem aktiven
   Gameplay-Vokabular entfernt.
8. Der große zentrale Halbmond/Sonnenhof blieb die Hauptlandmarke.
9. Der kleine goldene Löwen-/Jaguarkopf blieb als Dekoration zwischen den
   Cenoten.
10. Zwei überzählige quadratische Seitenplanter wurden entfernt.
11. Projektiltreffer auf Cover erhielten neutrales Impact-Feedback.
12. Die Map wurde mit zusätzlichem nativen Boden auf `2280×980` erweitert.
13. Kollisionen wurden am neuen Masterbild neu nachgezeichnet.
14. Die engsten Passagen wurden als Clearance-Regressionspunkte abgesichert.

Wichtigste Temple-Lektion:

> Ein cooles Motiv darf bleiben, wenn es keine falsche Gameplayregel
> suggeriert. Landmarken wie Sonne oder Löwenkopf sind wertvoll. Aktive
> Hindernisse müssen dagegen einer extrem klaren, wiederholbaren
> Silhouettenfamilie folgen.

Der genaue Prompt für die vorherige dichte Temple-Fassung steht in
`docs/drowned-sun-temple-master-prompt.md`.

## 6. Hindernis- und Lesbarkeitsregeln

### Verbindliche visuelle Semantik

- Charaktere sind emissiv: Teamfarbe, Bewegung, Bloom und Bodenring.
- Cover ist materiell: feste Oberkante, dunklere Seitenfläche, statischer
  Kontaktschatten, kein Team-Glow.
- Begehbarer Boden ist ruhiger und kontrastärmer als Actors, Pickups und
  Projektil-VFX.
- Dekoration darf keine falsche Kollision ankündigen.

### Bevorzugte Coverfamilie

- niedrig,
- kompakt,
- klare Oberseite,
- klar erkennbare Seitenfläche,
- enger Kontaktschatten,
- ähnliche Grundsilhouette auf der gesamten Map,
- thematische Skins sind erlaubt, die visuelle Gameplay-DNA bleibt gleich.

### Hohe Wände und Säulen

Hohe Pfeiler, Torbögen und echte Wände sind nicht grundsätzlich verboten, aber
sie sind aktuell riskant:

- Seitlich dargestellte Figuren und reine Draufsicht-Architektur erzeugen
  unterschiedliche Perspektivsignale.
- Ein hoher Pfeiler, über den der Actor trotzdem springen oder laufen kann, ist
  kaum intuitiv.
- Ein Objekt mit unklarer Regel ist schlechter als weniger dekorative Vielfalt.

Darum zunächst:

- hohe Formen an den unspielbaren Rand,
- aktive Coverobjekte niedrig halten,
- echte Vollwände nur einsetzen, wenn sie Körper und Projektile eindeutig
  blockieren und nicht übersprungen werden können,
- keine dritte Regelkategorie allein durch Detail oder Farbton erklären.

### Feedback lehrt die Regel

Wenn Projektile an Cover stoppen:

- sichtbarer neutraler Impact,
- kurze Funken-/Staubreaktion,
- keine Teamfarbe,
- kein dauerhaftes Glow.

So lernt der Spieler die Regel schneller als durch zusätzliche Konturen.

## 7. Was bei zukünftigen Maps vermieden werden muss

- Keine zufälligen Hindernisse nur zur Flächenfüllung.
- Kein Imagegen vor einem belastbaren Layoutvertrag.
- Keine Asset-Collage ohne Vollbildabnahme.
- Keine getrennte X-/Y-Skalierung eines Masterbilds.
- Keine Kreise, Gesichter oder Quadrate in falsche Seitenverhältnisse ziehen.
- Keine zweiten Code-Rahmen über bereits gerahmter Kunst.
- Keine großen schwarzen Backing-Rechtecke hinter transparenten Assets.
- Keine unsichtbaren Kollisionen auf normal aussehendem Boden.
- Keine gemalten Hindernisse ohne Gameplay-Kollision.
- Keine langen Rail-Sichtlinien auf Spawns oder One Flag.
- Keine Rocket-Pickups mit direkter Spamlinie zum Objective.
- Keine langen engen Splash-Korridore ohne seitlichen Ausweg.
- Keine Sackgassen in wichtigen Rückzugsrouten.
- Keine Portale oder Geheimwege ohne eigene Bot-/Objective-/Cooldown-Regeln.
- Keine echte zweite Ebene mit der aktuellen Architektur vortäuschen.
- Keine frühe Feinplanung für jede aktuelle Waffenkennzahl. Stattdessen
  robuste Abstände, mehrere Ausgänge und verschiebbare Pickup-Zonen planen.

## 8. Noch nicht umgesetzte Mapkonzepte

Die ursprüngliche Konzeptphase enthielt fünf Vorschläge. Temple und Helix sind
umgesetzt. Die folgenden drei bleiben als Backlog erhalten.

### Cryo Fault 7

Fantasy:

Eine Forschungsstation wird durch einen diagonalen Gletscherriss geteilt.
Weiße Eisflächen, dunkle Labormodule, türkise Tiefe und orange
Notbeleuchtung erzeugen eine klare Silhouette.

Layoutidee:

- zwei breite, sichere Brücken,
- ein schneller Fault-Jump als riskante Abkürzung,
- eine gedeckte untere Laborflanke,
- zentrale Eiskammer mit vier Ausgängen für One Flag,
- Rail auf der exponierten Nordbrücke,
- Rockets im zerstörten Labor,
- Armor in der zentralen Kammer.

Eignung:

- stark für 1v1 bis 3v3,
- 4v4 nur mit sehr breiten Brücken,
- gutes Risiko-gegen-Sicherheit-Konzept für TDM und CTF.

Risiken:

- Eis und Schnee dürfen Actors nicht kontrastarm machen.
- Der diagonale Riss muss mit rechteckiger Kollision ehrlich angenähert werden.
- Kein rutschiger Boden ohne eigenes, vorher freigegebenes Gameplay-System.

Geschätzter Aufwand:

- etwa 10 bis 15 Arbeitstage als vollständiger Vertical Slice.

### Prism Choir

Fantasy:

Eine surreale Kristallkathedrale auf schwarzem Obsidian mit farbigen
Lichtfenstern und einem zentralen Refraktor.

Layoutidee:

- kreuzförmiges Hauptschiff,
- lange obere Rail-Nave,
- enge untere Cloister-Route,
- Sichtfenster zwischen Seitenwegen,
- One Flag am zentralen Refraktor,
- Rockets unten,
- Arc Lash in Seitenkapellen,
- ein gebrochener Transept-Jump,
- optisch erhöhte, aber räumlich nicht überlappende Terrassen.

Eignung:

- besonders 2v2 bis 4v4,
- 1v1 nur in kompakter Ausführung.

Risiken:

- Kristallglows dürfen Teamfarben, Pickups und Projektile nicht überstrahlen.
- feste Kristallcover und flache Dekoration müssen sofort unterscheidbar sein.
- keine scheinbar begehbare zweite Ebene.

Geschätzter Aufwand:

- etwa 12 bis 18 Arbeitstage.

### Tempest Bastion

Fantasy:

Eine Sturmfestung auf drei schwebenden Inseln über den Wolken. Materialien:
Schiefer, Kupfer, kaltes Wolkenweiß und kontrollierte elektrische Akzente.

Layoutidee:

- breite Hauptbrücken,
- überdachte Seitenpassagen,
- genau eine kurze Sprungabkürzung über eine gebrochene Brücke,
- One Flag im ruhigen Auge des Sturms,
- Rail auf der oberen Brüstung,
- Rockets auf der gedeckten unteren Route.

Eignung:

- gut für 2v2 bis 4v4,
- weniger geeignet für 1v1.

Risiken:

- Rocket-Knockback und Fallflächen können schmale Brücken unfair dominieren.
- keine Windphysik und keine zufälligen Blitze im ersten Vertical Slice.
- Wolken- und Randkunst dürfen die echte spielbare Grenze nicht verschleiern.

Geschätzter Aufwand:

- etwa 12 bis 18 Arbeitstage.

## 9. Empfehlung für die nächste neue Map

Empfohlene Reihenfolge:

1. `Cryo Fault 7`, weil das Brücke-/Fault-/Labor-Konzept mit der aktuellen
   Architektur ohne neue Enginefunktion ehrlich umsetzbar ist.
2. `Prism Choir`, wenn eine visuell mutigere, etwas riskantere Art-Direction
   gewünscht ist.
3. `Tempest Bastion` erst danach, weil Fallflächen und Brückenbreite besonders
   sorgfältige Rocket- und 4v4-Tests benötigen.

Unabhängig vom Konzept gilt:

- zuerst Greybox,
- dann Gameplay-Gates,
- dann ein vollständiges Zielbild,
- danach integriertes Master,
- zuletzt Kollision, Clearance und Vollbild-Iteration.

## 10. Aktueller Integrationsstand der Premium-Maps

Die beiden Premium-Maps stehen an erster Stelle in der Registry und in Quick
Play:

1. `Helix Canopy`
2. `Temple of the Drowned Sun`

Die Founders-Circuit-Liga verwendet:

- Runde 1: TDM auf Helix Canopy,
- Runde 2: One Flag auf Temple of the Drowned Sun,
- Runde 3: Classic CTF auf Temple of the Drowned Sun.

Direkte Test-URLs:

- Helix:
  `http://127.0.0.1:5173/CTF-3.0/?scene=v2&mode=tdm&map=helix-canopy-v2&players=bot&controls=keyboard&teamSize=2`
- Temple:
  `http://127.0.0.1:5173/CTF-3.0/?scene=v2&mode=tdm&map=drowned-sun-temple-v2&players=bot&controls=keyboard&teamSize=2`
- Collision Debug: an eine URL `&collisionDebug=1` anhängen.
- Clearance Heatmap: an eine URL `&clearanceHeatmap=1` anhängen.
- Saubere Übersicht: an eine URL `&mapPreview=1` anhängen.

## 11. Checkliste für einen neuen Chat

Vor Beginn:

- richtigen Projektpfad `C:\Users\madde\Documents\CTF-3.0` bestätigen,
- `git status --short` lesen,
- vorhandene fremde WIP-Dateien schützen,
- dieses Dokument vollständig lesen,
- Referenzmap und zugehörige Tests lesen,
- keine neue Engine-Mechanik stillschweigend voraussetzen.

Vor Asset-Produktion:

- Layoutvertrag freigegeben,
- alle Modi starten,
- Spawns/Pickups/Objectives frei,
- Routen messbar,
- Bot-Routen frei,
- Jump Links grün,
- Rail/Rocket/Arc-Lash-Risiken geprüft.

Vor Commit:

- Vollbild visuell abgenommen,
- Collision Debug kontrolliert,
- Clearance geprüft,
- `npm test` grün,
- `npm run test:typecheck` grün,
- `npm run build` grün,
- Quick Play und gegebenenfalls Liga geprüft,
- Übersicht aktualisiert,
- nur mapbezogene Dateien gestaged.

## 12. Geschützte fremde WIP-Dateien

Diese Dateien gehörten während der Helix-/Temple-Arbeit nicht zum Mapumfang und
dürfen nicht versehentlich in einen Map-Commit geraten:

- `public/assets/ax9-mantis-idle-special-pilot-spritesheet-6x4.png`
- `public/assets/ui/portraits/xeno-runner-portrait.png`
- `src/adapters/phaser/characterSpecialIdle.ts`
- `tmp/`
