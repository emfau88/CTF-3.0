# Helix Canopy – Phase-1-Vertrag

## Ziel

Helix Canopy ist eine orbitale Bio-Kuppel: Ein technischer Stationsring umschließt
eine leuchtende, lebende Helix aus Baumkronen, Wurzeln und Biolicht. Die Map soll
heller, sauberer und stärker science-fiction-geprägt wirken als Temple of the
Drowned Sun, ohne dessen Geometrie oder Artassets zu kopieren.

Priorität der Spielmodi:

1. 1v1 und 2v2: primäres Layout- und Balanceziel
2. 3v3: Dichte- und Rotationsprüfung
3. 4v4: vollständige Spawns und technischer Start-/Traffic-Smoke, keine frühe
   Feinbalance

Die Map bleibt statisches, eindeutig lesbares 2D. Es gibt keine Portale,
überlappenden Stockwerke, Schalter oder dynamischen Kollisionsänderungen. Die
Helixform entsteht durch den Grundriss, Bodeninlays und transparente Randkunst.

## Große Layoutidee

Geplanter Rahmen: ungefähr 2160–2240 × 920–960 Welt-Einheiten. Die genaue Größe
wird erst in der Greybox festgelegt.

```text
                 CANOPY SPINE
          offen · präzise · unterbrechbar
        ┌───────────┬───────────┐
 BLUE POD ─ WEST EXCHANGE ≋ HELIX CORE ≋ EAST EXCHANGE ─ RED POD
        └───────────┴───────────┘
                 ROOT CONDUIT
          geschützt · länger · rotierbar
```

Anders als Temple besitzt die Mitte keinen rechteckigen Hof. Zwei versetzte,
gespiegelte Helixrippen erzeugen einen breiten S-förmigen Kern. An den beiden
Exchange-Knoten können Spieler zwischen Kern und Außenring wechseln. Dadurch
entstehen Rotationen und Gegenwege, ohne unsichtbare Abkürzungen.

### Blue Pod und Red Pod

- Identische Gameplay-Geometrie mit gespiegelt wirkender Teamkunst.
- Drei verständliche Ausgänge; kein direkter Schuss von Spawn zu Spawn.
- Spawn 1 und 2 erhalten Priorität bei Deckung und Bewegungsfreiheit.
- Spawn 3 bleibt voll brauchbar; Spawn 4 wird technisch sicher platziert, aber
  nicht zum frühen Balanceziel gemacht.

### Helix Core

- Kürzeste Route und Ort des neutralen One-Flag-Objectives.
- Keine offene Schussbahn durch die komplette Map.
- Zwei breite Eintrittswinkel pro Team und mindestens ein seitlicher Ausweg aus
  jedem Nahkampfbereich.
- Der Kern bleibt frei genug für Objectives und zukünftige Waffenwirkungen.
- Die Helixrippen sind echte, klar gerenderte Deckung – keine dekorativen
  Hindernisse.

### Canopy Spine

- Äußerer Präzisionsweg mit Glas-, Metall- und Pflanzen-Silhouette.
- Längere Sichtlinien werden durch regelmäßige Stationsrippen unterbrochen.
- Der Rail-Schwerpunkt liegt sichtbar und riskant, aber ohne Sicht auf Spawns
  oder das neutrale Objective.
- Zwei kleine, gespiegelte Bio-Trenches bieten optionale authored Jumps zurück
  zu den Exchange-Knoten. Umwege bleiben immer vorhanden.

### Root Conduit

- Längerer, geschützter Rückzugs- und Flag-Return-Weg.
- Breite Kampfbereiche statt enger Rocket-Schläuche.
- Seitentaschen schaffen Ausweichraum, dürfen aber keine Sackgassen bilden.
- Der Rocket-Schwerpunkt liegt nicht auf einer direkten Objective-Schussbahn.

## Routen- und Pickup-Vertrag

- Helix Core ist die schnellste, aber am stärksten umkämpfte Route.
- Canopy Spine ist grob 15–25 Prozent länger und bietet Präzisionskontrolle.
- Root Conduit ist grob 25–35 Prozent länger und bietet die sicherste Rotation.
- Diese Verhältnisse sind Startwerte für die Greybox, keine endgültige
  Millimeter-Balance.
- Health liegt an Rückzugs-/Reentry-Punkten, nicht direkt im Objective.
- Armor belohnt die beiden Exchange-Knoten.
- Rail, Rocket und Arc Lash erhalten erkennbare Risikozonen; die finalen Pads
  bleiben verschiebbar, damit spätere Waffen ergänzt werden können.
- Pickups und Kampfgeometrie bleiben gespiegelt. Die Kunst darf optisch
  organischer und leicht asymmetrisch wirken.

## Generische Zukunftssicherheit für Waffen

Die Map wird nicht auf jede aktuelle Cooldown- oder Schadenszahl festgenagelt.
Sie muss stattdessen folgende stabile Regeln erfüllen:

- keine Basis-zu-Basis-Sichtlinie
- keine einzelne Position kontrolliert alle drei Routen
- regelmäßige, eindeutig sichtbare Sichtlinienbrecher
- mindestens zwei Ausgänge aus wichtigen Kampfbereichen
- keine langen, ausweglosen Splash-Korridore
- ausreichend freie Fläche um Spawns, Objectives und Pickup-Pads
- Pickup-Zonen können später verschoben oder um einen neuen Waffentyp erweitert
  werden, ohne die Geometrie neu zu bauen

## Art Direction

Farb- und Materialidee:

- dunkles Graphit und gebürstetes Weiß für die Stationsstruktur
- Petrol und tiefes Grün für Boden und Pflanzenvolumen
- Cyan/Türkis für Helix, Glasränder und neutrale Orientierung
- Blau und Rot nur als klare Teamakzente an den Basen
- kleine magentafarbene Biolicht-Akzente, nicht als Teamfarbe
- sichtbarer Weltraum und Planetenglanz nur außerhalb der spielbaren Kanten

Lesbarkeitsregeln:

- Kollisionswände besitzen eine klare helle Kante und heben sich vom Boden ab.
- Dekorative Blätter und Kronen liegen am Weltrand oder flach unter dem
  Gameplay; sie dürfen nicht wie zusätzliche Deckung wirken.
- Transparente Glasformen werden nie als unsichtbare Kollision verwendet.
- Die Helixgrafik darf nicht den Eindruck eines begehbaren zweiten Stockwerks
  erzeugen.
- Motive und runde Assets werden proportional dargestellt, nicht auf beliebige
  Rechtecke verzerrt.

## Geplantes Asset-Kit

Ziel: ungefähr 16–18 neue modulare PNG-Assets, nicht wieder 22 Einzelfälle.

Struktur und Gameplay:

1. Stationsboden-Grundtile
2. Helix-Core-Bodeninlay
3. Canopy-Spine-Bodenband
4. Root-Conduit-Bodenband
5. Wand horizontal
6. Wand vertikal
7. Wandabschluss/Ecke
8. Helixrippen-Deckungsmodul
9. Bio-Trench/Gaphintergrund
10. Blaues Basispod
11. Rotes Basispod
12. Neutraler Helix-Core-Ring

Atmosphäre und Randkunst:

13. Canopy-Randsegment
14. Pflanzen-/Kronencluster
15. Leuchtende Ranken oder Membran
16. Orbitale Glas-/Stationsstrebe
17. Planet-/Weltraumlicht
18. optionales kleines Orientierungszeichen, nur wenn die Greybox es benötigt

Pickups, Pickup-Pads, Charaktere, Flags und UI werden wiederverwendet.
Imagegen beginnt erst nach erfolgreicher Greybox- und Gameplay-Freigabe.

## Übernahme aus Temple of the Drowned Sun

Direkt wiederverwendbar:

- `WorldMapData`-Struktur und benannte Geometrieelemente
- `createTeamSpawnPoints()` für vollständige Team-Slots
- Registry-, Mode- und Map-Quality-Prüfungen
- gespiegelt geprüfte Pickup-Ökonomie
- blocked-sight-line- und Objective-Clearance-Verträge
- authored Jump-Link- und Traversal-Smoke-Muster
- theme-spezifisches Asset-Preloading
- Kamera-Fit und Mikro-Waffen-HUD
- Trennung von Gameplay-Geometrie, Wall-Visuals und Atmosphäre

Bewusst nicht wiederverwendbar:

- Temple-Wände, Cenoten, Court-Corners und Jaguar-/Pantherkunst
- Temple-Koordinaten und dessen rechteckiger Mittelhof
- Temple-Pickup-Positionen und exakte Routenverhältnisse
- `jungle-temple` als Theme oder Assetordner

## Stop-Gate für Phase 2

Phase 2 darf eine Greybox anlegen, wenn folgende Entscheidungen akzeptiert
sind:

- orbitale Bio-Kuppel ohne neue Engine-Mechanik
- S-förmiger Helix Core mit zwei Exchange-Knoten
- Canopy Spine und Root Conduit als verbundener Außenring
- 1v1/2v2 zuerst; 4v4 nur vollständig und technisch sicher
- ungefähr 16–18 neue Assets erst nach Gameplay-Freigabe

Ein rotes Gate in Phase 2 stoppt die Arbeit vor der Asset-Produktion. Die ersten
zu prüfenden Risiken sind eine zu dominante Kernroute, zu enge Helixbögen und
eine Canopy-Sichtlinie, die mehr als einen Routenwechsel gleichzeitig abdeckt.

## Status nach Phase 4

- Greybox und Produktionslayout stehen bei 2240 × 960 Welt-Einheiten.
- 24 benannte Solids, zwei Bio-Trenches und vier authored Jump-Links bilden die
  unveränderte Gameplay-Geometrie.
- Acht Spawn-Slots pro Mapvertrag unterstützen 1v1 bis 4v4; 4v4 bleibt wie
  vereinbart nur technisch abgesichert.
- Das Art-Kit wurde bewusst auf dreizehn modulare Assets verdichtet. Rotation,
  proportionale Skalierung und Wiederverwendung ersetzen separate Vertikal-,
  Abschluss- und Bodenband-Dateien, ohne Motive zu verzerren.
- Rote und blaue Basis verwenden denselben 2:3-Darstellungsrahmen und dieselbe
  sichtbare Größe.
- TDM, Classic CTF und One Flag starten im Live-Smoke ohne Browserfehler.
- Vollständige Tests, Typecheck und Produktions-Build sind nach Phase 4 grün.

## Visuelle Korrektur nach Vollbildabnahme

Die erste Produktionsdarstellung war technisch korrekt, bestand aber die
Vollbildabnahme nicht: Der Core wirkte wie ein massives Hindernis, schwarze
Backing-Flächen waren sichtbar und die drei Routen hatten keine ausreichende
visuelle Eigenständigkeit. Die Korrektur ersetzt deshalb nicht die getestete
Grundidee, sondern ihre Darstellung:

- Canopy Spine nutzt nun helle Stationspaneele mit flachen Pflanzenkanälen.
- Root Conduit nutzt dunkle Petrolpaneele mit eingelassenen Biowurzeln.
- Der Core ist ein flaches, gedämpftes Doppelhelix-Inlay statt einer scheinbar
  erhöhten Kreisplattform.
- Echte Deckung wird durch geschlossene bepflanzte Module dargestellt; kleine
  Botanikkapseln und technische Helixrippen bleiben klar unterscheidbar.
- Schwarze Vollflächen hinter Assets wurden durch kleine, weiche Schlagschatten
  ersetzt.
- Figuren, Pickups und Kollisionsobjekte besitzen wieder höheren Kontrast als
  die begehbaren Bodenmotive.

## Verbindliche Rekonstruktion nach der zweiten Vollbildabnahme

Die modulare Produktionsdarstellung bestand auch nach der ersten Korrektur die
visuelle Abnahme nicht. Dieser Abschnitt ersetzt deshalb den oben beschriebenen
Phase-4-Art-Status als aktuelle Produktionsgrundlage:

- Das freigegebene Gesamtzielbild ist als `arena-master.png` die einzige
  visuelle Arena-Grundlage. Es wird proportional bei voller Welthöhe gerendert
  und niemals auf ein anderes Seitenverhältnis gezogen.
- Die Welt misst 1920 × 960 Einheiten. Seitliche Weltraumränder sind Teil der
  Komposition, aber nicht begehbar.
- 24 Kollisionsrechtecke liegen ausschließlich innerhalb der im Masterbild
  sichtbaren Stationsränder und Pflanzeninseln. Sie erzeugen keine zusätzliche
  Rendergrafik und damit keine zweite, widersprüchliche Geometriesprache.
- Die leuchtende Helix bleibt vertikal und in die Architektur eingebettet.
  Zusätzliche horizontale Helix-Decals, Bodentexturbänder und wiederholte
  Pflanzenmodule werden nicht mehr verwendet.
- Blaue und rote Basis liegen auf den beiden gemalten Pods und erhalten nur
  identisch dimensionierte, halbtransparente Teamringe als Gameplay-Markierung.
- Vier gespiegelte Vault-Links führen über die kleinen inneren Pflanzenpods;
  alle regulären Routen bleiben ohne Sprung erreichbar.
- Pickups sind auf Route, Reentry und Risiko verteilt. Die Mitte enthält nur
  zwei Arc-Lash-Pads und zwei Exchange-Armor-Pads statt einer durchgehenden
  Loadout-Reihe.
