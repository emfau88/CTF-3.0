# Premium-Map-Dekoration: Vertical Slice

Stand: 2026-07-18

Status: Technisch implementiert, visuelle Platzierung noch nicht abgenommen.
Die Elemente sind rein kosmetische, transparente Overlays am blockierten
Kartenrand. Masterbilder, Kollision, Laufwege, Pickups, Objectives,
Waffenwerte und Sound bleiben unveraendert.

## Verbindlicher Follow-up fuer die naechste Sitzung

Feedback aus dem ersten manuellen Test:

- Helix Canopy: Das Element ist nicht gut positioniert.
- Temple of the Drowned Sun: Das Element ist im normalen Spiel nicht
  auffindbar beziehungsweise nicht sichtbar genug.
- Foundry Circuit: Das Element ist spontan ebenfalls nicht auffindbar
  beziehungsweise nicht sichtbar genug.

Vor jeder Erweiterung des Dekorationsumfangs werden daher zuerst alle drei
Positionen im normalen Gameplay neu festgelegt. Die neuen Stellen sollen
weiterhin am Kartenrand und ausserhalb wichtiger Laufwege liegen, aber aus
der ueblichen Spielkamera klar erkennbar sein. Danach folgen eine erneute
Sichtpruefung im echten Match und die ausdrueckliche visuelle Abnahme. Bis
dahin gilt der Vertical Slice nicht als fertig abgenommen.

Verifizierter Stand:

- `npm.cmd test`: 162 von 162 Tests bestanden.
- `npm.cmd run test:typecheck`: bestanden.
- `npm.cmd run build`: bestanden.
- `npm.cmd run test:e2e -- tests/e2e/premium-arenas.spec.ts`: 3 von 3
  Premium-Map-Starts bestanden.
- Technische Kartenuebersicht und Browserfehlerpruefung: bestanden.
- Visuelle Abnahme aus der normalen Spielkamera: nicht bestanden; neue
  Positionierung ist fuer die naechste Sitzung offen.

## Enthaltene Elemente

| Map | Element | Position | Leerlauf | Lokale Reaktion |
| --- | --- | --- | --- | --- |
| Helix Canopy | neugierige biolumineszente Kelchpflanze | `(620, 115)` im noerdlichen, blockierten Gartenrand | ruhiges Atmen, leichtes Schaukeln, vier kleine Lichtsporen | duckt sich erschrocken, wenn ein aktiver Actor oder Projektil auf 150 px herankommt |
| Temple of the Drowned Sun | muerrischer goldaeugiger Tempelfrosch | `(1140, 948)` im suedlichen, blockierten Wurzel-/Wasserrand | kaum sichtbares Atmen und Wippen | huepft und taucht mit zwei lokalen Wasserringen kurz ab, wenn Aktivitaet auf 150 px herankommt |
| Foundry Circuit | ueberarbeiteter muerrischer Wartungsbot | `(1960, 992)` in der suedlichen, blockierten Maschinerie | schwebt und kippt leicht, warmes Arbeitslicht pulsiert | zieht sich bei Aktivitaet auf 160 px mit einem kleinen Dampf-/Funkenpuff zurueck |

Alle Reaktionen besitzen mehrere Sekunden Sperrzeit. Ein Actor, der am Rand
stehen bleibt, erzeugt daher keine dauernde Effektkette.

## Technische Architektur

- `src/premiumMapCosmetics.ts` ist die gemeinsame, Phaser-freie Quelle fuer
  Map-Zuordnung, Asset, Position, Groesse, Reaktionsradius und Zeitwerte.
- `src/adapters/phaser/PhaserPremiumMapCosmetics.ts` besitzt pro laufendem
  Match hoechstens ein `Image` und ein wiederverwendetes `Graphics`-Objekt.
- Der vorhandene `PhaserArenaRendererPort` ruft den Controller mit dem
  schreibgeschuetzten `WorldSnapshot` auf.
- Der Controller liest lediglich Positionen aktiver Actors und Projektile. Er
  schreibt niemals in den Core-Weltzustand und erzeugt keine Game Events.
- Animationen werden aus `snapshot.timeMs` und einem kleinen lokalen Zustand
  berechnet. Es gibt keine Physikkoerper, Collider, Partikelsysteme,
  Zufallsobjekte oder endlosen Phaser-Tweens.
- `reset()` setzt Reaktion, Sperrzeit und Darstellung vollstaendig zurueck.
  `dispose()` zerstoert beide Game Objects zusammen mit der Arena.
- Die Tiefe `-1.05` liegt ueber dem integrierten Master, aber weit unter
  Actors, Projektilen, Pickups und Objectives.
- `preloadArenaAssets()` laedt nur das Asset der aktuell gewaehlten
  Premium-Map. Andere Karten laden keines der drei Bilder.

## Lesbarkeit und Gameplay-Sicherheit

- Alle drei Mittelpunkte liegen in bereits blockierter Aussenkulisse und
  hoechstens 115 px vom Weltrand entfernt.
- Die Elemente besitzen keine eigene Kollision und suggerieren keinen neuen
  begehbaren oder blockierenden Bereich.
- Kein Element liegt auf einem Pickup, Spawn, Objective oder markierten
  Laufweg.
- Die Farbgebung verwendet neutrale Mapfarben. Gespaettigte rote oder blaue
  Teamlichter wurden in den Prompts ausdruecklich ausgeschlossen.
- Interaktionen geben keinen Schaden, Knockback, Punkt, Loot, Sichtvorteil
  oder Bot-Hinweis.
- Das vertagte Soundthema wird nicht beruehrt.

## Asset-Provenienz

Alle drei Motive wurden am 2026-07-18 speziell fuer Core Arena mit dem in
Codex integrierten OpenAI-`imagegen`-Werkzeug erzeugt. Es wurden keine
Fremdassets, Asset-Pakete, Markenmotive oder Kenney-Bausteine verwendet.

| Enddatei | Generierte Quelldatei | Promptkern | SHA-256 |
| --- | --- | --- | --- |
| `public/assets/premium-cosmetics/helix-curious-bloom.png` | `call_EXVs3rOUT2rp2YkqdN05TCwn.png` | isolierte Top-down-Sci-Fi-Kelchpflanze, Smaragd/Jade/Tuerkis, neugierige Silhouette, keine Teamfarben, reines Magenta als Chroma-Key | `AA4DB6ECB85355BD4344C0E1743681B1F153387F83C4B30EFAFDB91E725F6D76` |
| `public/assets/premium-cosmetics/temple-grumpy-frog.png` | `call_xv0asqmFj57iN1J8FDXTCkNl.png` | isolierter kleiner Top-down-Tempelfrosch, Moos/Oliv/Antikgold, muerrischer Ausdruck, keine Teamfarben, reines Magenta als Chroma-Key | `06B143EF65170322688396A082C7D5A98CFA4DA0E82FFB65C0A533A9B248E0A4` |
| `public/assets/premium-cosmetics/foundry-grumpy-maintenance-bot.png` | `call_sksgTyRekHOXOT2tLSbT97jA.png` | isolierter kleiner Top-down-Wartungsbot, dunkler Stahl/Messing/Arbeitsorange, ueberarbeiteter Ausdruck, keine Teamfarben, reines Magenta als Chroma-Key | `E39DC0B543A292AB724EF6D6F8B03FEC43AE58A41E7EE09508FBD4CD6089E39A` |

Die Originalgenerierungen liegen ausserhalb des Repositorys im lokalen
Codex-Ordner
`C:\Users\madde\.codex\generated_images\019f76d1-a6d9-7d30-8b70-1d593f5dd387`.
Sie wurden nicht verschoben oder geloescht.

Lokale Nachbearbeitung:

1. Magenta-Hintergrund mit dem zum `imagegen`-Skill gehoerenden
   `remove_chroma_key.py` entfernt.
2. Kanten weich freigestellt und Magenta-Farbs spill bereinigt.
3. Sichtbaren Alpha-Bereich proportional beschnitten.
4. Mit Pillow/Lanczos auf eine transparente 256-x-256-PNG-Flaeche gesetzt.
5. Alpha, Abmessungen, Dateigroesse und visuelle Freistellung kontrolliert.

## Performancebudget

Pro Match entstehen:

- eine selektiv geladene 256-x-256-RGBA-Textur,
- ein `Phaser.GameObjects.Image`,
- ein wiederverwendetes `Phaser.GameObjects.Graphics`,
- hoechstens vier gezeichnete Lichtsporen beziehungsweise wenige lokale
  Linien/Kreise im Reaktionsfenster,
- keine Physik-, Audio- oder Core-Simulationsobjekte.

Das Objektbudget ist damit unabhaengig von 1v1 bis 4v4 konstant. Ein
vollstaendiger spaeterer Dekorationsausbau sollte dieses Muster beibehalten
und zusaetzliche Elemente pro Map budgetieren, statt unkontrolliert Emitter
zu verteilen.

## Testabdeckung

- genau ein kosmetischer Eintrag fuer jede Premium-Map,
- eindeutige Asset-Keys und selektives Preloading,
- alle Positionen liegen in blockierter Randkulisse,
- PNG-Dateien sind 256 x 256, RGBA und kleiner als 300 KB,
- Reaktionszustand ist lokal, framebegrenzt, sperrbar und resetbar,
- Premium-Map-E2E prueft das erwartete Asset und verbietet die zwei
  mapfremden Kosmetik-Assets,
- bestehende Core-, Map-, Waffen-, Bot-, Typecheck- und Build-Gates bleiben
  Bestandteil der Abschlusspruefung.

## Bewusst nicht gebaut

- keine Aenderung oder Neuberechnung der drei Masterbilder,
- keine neue Kollision und keine dekorativen Gameplay-Hindernisse,
- keine Zerquetsch-, Schaden-, Punkte- oder Lootmechanik,
- kein Sound,
- keine teamfarbigen Deko-Lichter,
- kein dauerhaftes Partikelsystem,
- keine zufaellige Objektvermehrung,
- keine Deko im Kartenmittelpunkt oder ueber umkaempften Pickups,
- noch kein grosser Katalog weiterer Tiere, Kerzen oder Maschinen.

## Moegliche spaetere Erweiterung

Erst nach Spieltests dieses Slices kann pro Map ein kleines festes Budget
weiterer Randdetails beschlossen werden. Sinnvolle Kandidaten sind:

- Helix: zwei sehr subtile, rein dekorative Biolumineszenz-Pulse,
- Temple: eine seltene kleine Spinne in einer bereits blockierten Ecke,
- Foundry: ein einzelnes Ventil mit kurzem, lokalem Dampfablass.

Diese Kandidaten sind nicht Teil des aktuellen Slices.
