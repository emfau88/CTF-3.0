# Premium-Map-Dekoration: Vertical Slice

Stand: 2026-07-19

Status: Technisch implementiert. Temple und Foundry wurden nach Sichttest
korrigiert; die genaue Helix-Platzierung bleibt zur gemeinsamen Markierung
offen.
Die Elemente sind rein kosmetische, transparente Overlays am blockierten
Kartenrand. Masterbilder, Kollision, Laufwege, Pickups, Objectives,
Waffenwerte und Sound bleiben unveraendert.

## Verbindlicher Follow-up

Helix Canopy benoetigt noch eine vom Nutzer markierte Lampen- und
Pflanzenplatzierung. Die Zielpunkte sollen am besten in einem Screenshot
nummeriert oder als relative Stellen in einer Randzone angegeben werden.
Temple und Foundry besitzen bereits die korrigierte Randverteilung.

Verifizierter Stand:

- `npm.cmd test`: 171 von 171 Tests bestanden.
- `npm.cmd run test:typecheck`: bestanden.
- `npm.cmd run build`: bestanden.
- `npm.cmd run test:e2e -- tests/e2e/premium-arenas.spec.ts`: 3 von 3
  Premium-Map-Starts bestanden.
- Technische Kartenuebersicht und Browserfehlerpruefung: bestanden.
- Temple und Foundry wurden erneut aus der normalen Spielkamera geprueft.
  Die Helix-Abnahme ist weiterhin offen.

## Enthaltene Elemente

| Map | Element | Position | Leerlauf | Lokale Reaktion |
| --- | --- | --- | --- | --- |
| Helix Canopy | neugierige biolumineszente Kelchpflanze | vorlaeufig `(220, 600)`; neue Zielposition noch offen | ruhiges Atmen, leichtes Schaukeln, vier kleine Lichtsporen | duckt sich erschrocken, wenn ein aktiver Actor oder Projektil auf 150 px herankommt |
| Temple of the Drowned Sun | kleiner Tempelfrosch | `(52, 650)` im westlichen, blockierten Wurzel-/Wasserrand | kaum sichtbares Atmen und Wippen | huepft weg, bleibt mindestens 10,5 Sekunden unsichtbar und kehrt dann mit lokalen Wasserringen zurueck |

Die Frosch-Reaktion besitzt eine lange Sperrzeit. Ein Actor, der am Rand
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
- `preloadArenaAssets()` laedt nur ein konfiguriertes Asset der aktuell
  gewaehlten Premium-Map. Foundry laedt nach Entfernung des Wartungsbots kein
  Einzelwesen.

## Lesbarkeit und Gameplay-Sicherheit

- Beide verbliebenen Mittelpunkte liegen in bereits blockierter Aussenkulisse und
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

Die beiden verbliebenen Motive wurden am 2026-07-18 speziell fuer Core Arena mit dem in
Codex integrierten OpenAI-`imagegen`-Werkzeug erzeugt. Es wurden keine
Fremdassets, Asset-Pakete, Markenmotive oder Kenney-Bausteine verwendet.

| Enddatei | Generierte Quelldatei | Promptkern | SHA-256 |
| --- | --- | --- | --- |
| `public/assets/premium-cosmetics/helix-curious-bloom.png` | `call_EXVs3rOUT2rp2YkqdN05TCwn.png` | isolierte Top-down-Sci-Fi-Kelchpflanze, Smaragd/Jade/Tuerkis, neugierige Silhouette, keine Teamfarben, reines Magenta als Chroma-Key | `AA4DB6ECB85355BD4344C0E1743681B1F153387F83C4B30EFAFDB91E725F6D76` |
| `public/assets/premium-cosmetics/temple-grumpy-frog.png` | `call_xv0asqmFj57iN1J8FDXTCkNl.png` | isolierter kleiner Top-down-Tempelfrosch, Moos/Oliv/Antikgold, muerrischer Ausdruck, keine Teamfarben, reines Magenta als Chroma-Key | `06B143EF65170322688396A082C7D5A98CFA4DA0E82FFB65C0A533A9B248E0A4` |

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

- hoechstens eine selektiv geladene 256-x-256-RGBA-Textur,
- hoechstens ein `Phaser.GameObjects.Image`,
- ein wiederverwendetes `Phaser.GameObjects.Graphics`,
- hoechstens vier gezeichnete Lichtsporen beziehungsweise wenige lokale
  Linien/Kreise im Reaktionsfenster,
- keine Physik-, Audio- oder Core-Simulationsobjekte.

Das Objektbudget ist damit unabhaengig von 1v1 bis 4v4 konstant. Ein
vollstaendiger spaeterer Dekorationsausbau sollte dieses Muster beibehalten
und zusaetzliche Elemente pro Map budgetieren, statt unkontrolliert Emitter
zu verteilen.

## Testabdeckung

- genau zwei freigegebene Einzelwesen; Foundry besitzt bewusst keines,
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

Diese Kandidaten waren nicht Teil des ersten Slices. Die folgende,
ausdruecklich freigegebene Erweiterung fuegt stattdessen einen kontrollierten
Lichtkranz pro Map hinzu.

## Erweiterung 2026-07-19: sichtbare Randpositionen und Lichtkranz

Der erste manuelle Sichttest zeigte, dass die Einzelwesen zwar technisch
korrekt in blockierter Randkulisse lagen, aber nicht gut auffindbar waren.
Ihre Positionen wurden deshalb ohne Aenderung von Masterbild oder Kollision
in normal sichtbare Randzonen verschoben. Bluete und Frosch bleiben in
blockierter Kulisse:

| Map | Element | neue Position |
| --- | --- | --- |
| Helix Canopy | neugierige Bluete | `(220, 600)` |
| Temple of the Drowned Sun | Tempelfrosch | `(52, 650)` |

Zusaetzlich besitzt jede Premium-Map nun genau acht kleine Randlichter.
Helix und Temple nutzen die durchgehend blockierten Seitenraender; Foundry
nutzt wegen seiner offenen Seiteneingaenge je vier Leuchten am oberen und
unteren Rand. Pro Map wird nur eine 256-x-256-RGBA-Textur geladen und achtmal
instanziert:

| Map | Lichttyp | Lichtfarbe | Instanzen |
| --- | --- | --- | ---: |
| Helix Canopy | botanische Grow-Lamp | neutrales Mintweiss | 8 |
| Temple of the Drowned Sun | antike Sonnenbrazier | warmes Antikgold | 8 |
| Foundry Circuit | gekaefigte Servicelampe | warmes Arbeitsamber | 8 |

Die Leuchten pulsieren mit versetzter Phase. Ein Projektil nahe der
blockierten Randfassung dimmt nur die betroffene Leuchte fuer 1,15 Sekunden;
danach erholt sie sich deterministisch. Die Reaktion erzeugt weder Schaden
noch Event, Punkte, Loot, Kollision oder Sound und wird bei Reset vollstaendig
zurueckgesetzt.

### Herkunft der neuen Licht-Assets

Alle drei Assets wurden am 2026-07-19 mit dem integrierten ImageGen-Werkzeug
als neue, projektbezogene Top-down-Einzelobjekte erzeugt. Der Prompt verlangte
jeweils eine einzelne maptypische Fassung, keine Teamfarben, keinen Text und
einen exakt magentafarbenen Chroma-Key-Hintergrund. Anschliessend wurden die
Ergebnisse mit `remove_chroma_key.py` weich freigestellt, Spill bereinigt und
mit Pillow/Lanczos auf 256 x 256 Pixel skaliert.

| finales Asset | ImageGen-Original | Promptkern | SHA-256 |
| --- | --- | --- | --- |
| `public/assets/premium-cosmetics/helix-grow-lamp.png` | `call_0GdEP1468TAKoFSs7JkASum9.png` | pale ceramic botanical grow lamp, mint-white core, leaf fins, strict top-down | `F371D97C5B17A6552C1F87360946A92B1FD12510315738AA048A85DF82934FC4` |
| `public/assets/premium-cosmetics/temple-sun-brazier.png` | `call_clTw4e0OHUMThEwA2ecjzPYw.png` | basalt and antique-gold drowned-sun brazier, warm amber flame, strict top-down | `24A4E7AA9CDF0612B108E9CDAF7ABB2D82663F9E79D7A2BDC3930909B41E7276` |
| `public/assets/premium-cosmetics/foundry-service-lamp.png` | `call_OWRFCmyiHCUGuNLf7MNegd5u.png` | caged steel service lamp, brass details, warm amber work light, strict top-down | `3C8BC60F1B8DBF37425470B890060FA25BF8812B20150B2FC825F0D133ACEA8F` |

Das zusaetzliche Laufzeitbudget pro Match betraegt acht Images und ein
gemeinsames Graphics-Objekt. Es gibt keine Emitter und keine wachsende
Partikelliste. Zusammen mit dem Einzelwesen bleiben Objektzahl und Kosten
damit fuer 1v1 bis 4v4 konstant.

## Korrektur nach Sichttest am 2026-07-19

- Helix Canopy bleibt fuer eine gemeinsam markierte Lampen- und
  Pflanzenplatzierung offen. Bis zu diesem Feedback wurden dort keine
  weiteren Positionsannahmen getroffen.
- Temple verteilt seine acht Sonnenbrazier nun gleichmaessig auf die beiden
  langen Kanten: je vier bei `x = 420, 900, 1380, 1860`, oben bei `y = 42`
  und unten bei `y = 938`.
- Der Tempelfrosch ist mit 66 statt 82 Pixeln rund 20 Prozent kleiner. Nach
  dem Verscheuchen bleibt er bis 10,5 Sekunden vollstaendig verborgen und
  kehrt erst danach zurueck. Die Reaktion kann fruehestens nach 14 Sekunden
  erneut ausgeloest werden.
- Der Foundry-Wartungsbot wurde vollstaendig aus Konfiguration, Preload und
  Laufzeit entfernt.
- Foundrys acht Servicelampen liegen nun vollstaendig in den blockierten
  Maschinenstreifen: oben bei `y = 55`, unten bei `y = 991`. Sie reichen
  nicht mehr auf den direkten Arena-Spielboden und lesen sich dadurch nicht
  wie Pickups.
