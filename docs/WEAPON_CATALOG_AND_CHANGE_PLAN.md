# Waffenkatalog und Aenderungsplan

Stand: 2026-07-19

Status: Phasen 1 bis 6 sind implementiert. Am 2026-07-19 wurden ausserdem
die vier freigegebenen Waffenprototypen, map-spezifische Vierer-Roster,
Desktop-HUD und Desktop-Eingabe umgesetzt. Manuelle Langzeit-Balance-,
Spielgefuehl-, Touch- und Sichttests bleiben offen.

Verifizierter Stand:

- `npm.cmd test`: 177 von 177 Tests bestanden.
- `npm.cmd run test:typecheck`: bestanden.
- `npm.cmd run build`: bestanden.
- `npm.cmd run test:e2e`: 3 von 3 Premium-Map-Starts bestanden.
- `npm.cmd run bot:diagnostics`: bestanden und Artefakte aktualisiert.

## Zweck und Reihenfolge

Dieses Dokument ist ab jetzt die zentrale, menschenlesbare Referenz fuer:

- den aktuellen Ist-Zustand aller vorhandenen Waffen und Angriffe,
- bereits getroffene Produktentscheidungen,
- geplante Aenderungen an Arc Lash, Rocket und Rail,
- offene Balancingfragen,
- spaetere Waffenprototypen.

Der Katalog steht bewusst vor der Implementierung. So ist fuer jede Aenderung
klar, welches Verhalten beibehalten, ersetzt oder bewusst vertagt wird.

Empfohlene Gesamtfolge:

1. Ist-Katalog und Zielwerte festhalten.
2. Gemeinsame Waffenwerte und Munitionsgrenzen eindeutig abbilden.
3. Arc Lash zur immer verfuegbaren Standardwaffe umbauen.
4. Rocket-Treffer, -Explosionen, -Kollision, Munition, Bots und HUD verbessern.
5. Rail-Schaden, Munition und Wandtreffer-Effekt verbessern.
6. Alle drei Bestandswaffen gemeinsam in allen Modi und Teamgroessen pruefen.
7. Den kleinen Premium-Map-Dekorations-Vertical-Slice umsetzen.
8. Pulse Repeater als erste neue Testwaffe prototypisieren.
9. Pulse, Ricochet Disc, Lob Grenade und Shardcaster als klar getrennte
   Testwaffen implementieren und gemeinsam balancieren.

Touch-Eingabe ist ein eigenes, groesseres Thema und gehoert ausdruecklich
nicht in das erste Waffen-Aenderungspaket.

## Bereits getroffene Entscheidungen

### Arc Lash

- Arc Lash wird eine Standardwaffe, die jeder Spieler immer besitzt.
- Sie verwendet keine Munition und keine Ladungen mehr.
- Die automatische Ladungsregeneration entfaellt.
- Alle Arc-Lash-Pickups werden aus allen Maps entfernt.
- Die bisherigen Arc-Pickup-Positionen bleiben zunaechst leer.
- Beim spaeteren Pulse-Prototyp wird jede freie Position einzeln neu bewertet.
- Der HUD-Slot bleibt dauerhaft sichtbar und zeigt nur Einsatzbereitschaft
  beziehungsweise Cooldown, aber keinen Munitionszaehler.
- Bots suchen keine Arc-Pickups mehr.
- Schaden und Cooldown bleiben fuer den ersten Test bei 35 Schaden und 800 ms.

### Rocket

- Ein direkter Treffer verursacht garantiert 45 Rohschaden.
- Der direkt getroffene Actor erhaelt nicht zusaetzlich noch einmal
  Explosionsschaden.
- Andere Gegner im Radius erhalten weiterhin den vorhandenen fallenden
  Flaechenschaden.
- Eine Rocket explodiert auch am Ende ihrer Reichweite oder Lebenszeit.
- Die Kollision wird entlang der vollstaendigen Flugstrecke eines
  Simulationsschritts geprueft.
- Ein Rocket-Pickup gibt 5 Raketen.
- Ein Actor kann maximal 15 Raketen tragen.
- Die Bot-Nutzung wird um nachvollziehbares Vorhalten und vorsichtige
  Flaechenzielwahl erweitert.
- Der Rocket-HUD-Slot bleibt auch ohne Munition sichtbar und wird dann
  ausgegraut.
- Rocket-Jumping und Selbst-Knockback werden nicht Teil dieses Pakets.
- Aenderungen an der Touch-Zielhilfe werden vertagt.

### Rail

- Rail verwendet festen Schaden statt eines Anteils der maximalen Gesundheit.
- Der feste Schaden wird auf 85 gesetzt.
- Ein Rail-Pickup gibt 4 Schuesse.
- Ein Actor kann maximal 8 Rail-Schuesse tragen.
- Ein echter Wandtreffer erhaelt einen kurzen gruenden Einschlagseffekt in der
  Farbe des Rail-Strahls.
- Reichweite, Cooldown und aktuelle Treffertoleranz bleiben zunaechst
  unveraendert.
- Aenderungen an der Touch-Eingabe werden vertagt.

## Ist-Katalog vor der Umsetzung

### Gemeinsame Kampfregeln

- Ein normaler Actor besitzt 100 Gesundheit und kann bis zu 100 Armor tragen.
- Armor absorbiert Schaden vor der Gesundheit.
- Eigene Actors und Teammitglieder erhalten durch die vorhandenen Waffen
  keinen Schaden.
- Ein Angriff beendet vorhandenen Spawn-Schutz.
- Rocket- und Rail-Munition starten bei 0 und werden beim Tod entfernt.
- Arc Lash startet beziehungsweise respawnt mit 3 Ladungen.
- Arena-Pickups besitzen Radius 22 und erscheinen nach 12 Sekunden erneut.
- Es gibt aktuell keine Trageobergrenze fuer Rocket oder Rail.
- Das sichtbare Desktop-HUD ordnet Rocket links, Rail mittig und Arc Lash
  rechts an.
- Das HUD ist technisch auf drei produktive Waffen typisiert, obwohl die
  Layout-Hilfe mehr Slots berechnen kann.
- Die Produktwaffen verwenden mehrere hart codierte Waffen-Unionen und
  Fallunterscheidungen in Core, Bots, Input, HUD, Pickups und Rendering.

### Rocket

| Eigenschaft | Aktueller Ist-Zustand |
| --- | --- |
| Interne ID | `rocket` |
| Sichtbarer Name | Rocket |
| Desktop-Eingabe | `Q` |
| HUD | linker Slot; aktuell nur mit vorhandener Munition sichtbar |
| Touch | Antippen mit automatischer Zielwahl oder Ziehen zum manuellen Zielen |
| Angriffstyp | geradliniges Projektil mit Explosion |
| Geschwindigkeit | 371 Welt-Einheiten pro Sekunde |
| Projektilradius | 14 |
| Schaden | nominell 45; aktuell auch beim Direkttreffer nur Splash-Berechnung |
| Splash | Radius 105; Faktor 0,35 bis 1, also 15,75 bis 45 Rohschaden |
| Knockback | Basiswert 230, mit demselben Entfernungsabfall wie Splash |
| Cooldown | 1.000 ms |
| Lebenszeit | 2.600 ms |
| Reichweite | rechnerisch 964,6 Welt-Einheiten |
| Start/Respawn | 0 Raketen |
| Pickup | aktuell +3 Raketen, ohne Obergrenze |
| Sonderregeln | Explosion bei Actor, Solid oder Weltgrenze; kein Eigen- oder Teamschaden |

Visuell besitzt Rocket ein eigenes Projektil, eine Rauchspur, ein
Explosions-Spritesheet sowie einen kurz sichtbaren Splash-Radius.

Die TDM-Botlogik verwendet Rocket im mittleren Entfernungsbereich von etwa
190 bis 700 Welt-Einheiten und begrenzt neue Rocket-Entscheidungen auf einen
Rhythmus von 3.000 ms. Aktuell zielt sie direkt auf die gegenwaertige
Actorposition, ohne Bewegungsvorhalt oder bewusste Boden-/Wandziele. TDM-Slot
1 sucht Rocket-Pickups, wenn keine Munition vorhanden ist. CTF- und
One-Flag-Bots koennen Pickups einsammeln, planen aber keine vergleichbar
gezielte Waffenroute.

Erkannte Schwaechen:

- Ein sichtbarer Direkttreffer kann wegen Splash-Falloff weniger als 45
  Schaden verursachen.
- Bei Ablauf von Lebenszeit oder Reichweite verschwindet die Rocket ohne
  Explosion.
- Kollision wird nur an der neuen Projektilposition geprueft. Ein schnelles
  Projektil kann bei unguenstigem Simulationsschritt ein schmales Ziel
  ueberspringen.
- Munition kann unbegrenzt gehortet werden.
- Die Touch-Automatik kann Ziele ausserhalb der praktisch erreichbaren
  Rocket-Reichweite waehlen.
- Ein leerer HUD-Slot verschwindet, statt den fehlenden Vorrat klar zu zeigen.

### Rail

| Eigenschaft | Aktueller Ist-Zustand |
| --- | --- |
| Interne ID | `rail` |
| Sichtbarer Name | Rail |
| Desktop-Eingabe | `E` |
| HUD | mittlerer Slot; aktuell nur mit vorhandener Munition sichtbar |
| Touch | Antippen mit automatischer Zielwahl oder Ziehen zum manuellen Zielen |
| Angriffstyp | sofortiger Hitscan-Strahl |
| Reichweite | 1.100 Welt-Einheiten |
| Schaden | 95 Prozent der maximalen Gesundheit des getroffenen Actors; aktuell meist 95 |
| Cooldown | 2.500 ms |
| Start/Respawn | 0 Schuesse |
| Pickup | aktuell +2 Schuesse, ohne Obergrenze |
| Treffertoleranz | Zielradius wird fuer den Strahl um 5 Welt-Einheiten vergroessert |
| Sonderregeln | erster Solid oder erster gegnerischer Actor beendet den Strahl; keine Penetration, kein Knockback |

Visuell besitzt Rail einen etwa 190 ms sichtbaren gruenden Mehrschicht-Strahl.
Bei einem Actor-Treffer wird bereits ein Impact-Bild erzeugt. Ein Schuss, der
an einer Wand endet, besitzt noch keinen eigenen Rail-Wandeffekt.

Die Botlogik bevorzugt Rail ab etwa 520 Welt-Einheiten. Nach Erfassung eines
Ziels wartet sie 320 ms und verwendet eine kleine deterministische
Zielabweichung, die auf grosse Distanz zunimmt. Falls keine passendere Waffe
verfuegbar ist, kann Rail auch naeher eingesetzt werden. TDM-Slot 2 sucht
Rail-Pickups, wenn keine Munition vorhanden ist.

Erkannte Schwaechen:

- Prozentualer Schaden koppelt die Waffenwirkung unnoetig an `maxHealth`.
- 95 Schaden erzeugen sehr haeufig sofortige Kills gegen nur leicht
  verletzte Ziele.
- Munition kann unbegrenzt gehortet werden.
- Ein Wandende besitzt keine eindeutige Einschlagsrueckmeldung.
- Der aktuelle Event unterscheidet fuer einen Fehlschuss nicht eindeutig
  zwischen Wandende und maximaler Reichweite.
- Automatisches Touch-Zielen nimmt der Praezisionswaffe einen Teil ihrer
  Skill-Anforderung; dieses Thema ist jedoch vertagt.

### Arc Lash

| Eigenschaft | Aktueller Ist-Zustand |
| --- | --- |
| Interne ID | `whip` |
| Sichtbarer Name | Arc Lash |
| Desktop-Eingabe | `F` |
| HUD | rechter Slot; zeigt vorhandene Ladungen |
| Touch | Antippen; das Ziel wird automatisch gewaehlt |
| Angriffstyp | automatische Erfassung des naechsten sichtbaren Gegners |
| Reichweite | Basis 120 plus Zielradius; bei normalem Actor effektiv etwa 136 |
| Schaden | 35 |
| Cooldown | 800 ms |
| Start/Respawn | 3 Ladungen |
| Maximum | 3 Ladungen |
| Regeneration | eine Ladung je 2.400 ms |
| Pickup | nominell +5, praktisch auf maximal 3 begrenzt |
| Sonderregeln | braucht Sichtlinie; kein Ziel bedeutet keinen Verbrauch und keinen Cooldown |

Visuell verbindet ein kurzlebiger cyanfarbener elektrischer Mehrfachstrang
den Angreifer mit dem automatisch gewaehlten Ziel. Ohne gueltiges Ziel
erscheint fuer den lokalen Spieler `NO TARGET`.

Die TDM-Botlogik priorisiert Arc Lash in unmittelbarer Naehe, solange eine
Ladung vorhanden und der Cooldown bereit ist. TDM-Slot 3 sucht Arc-Pickups,
wenn alle Ladungen verbraucht sind.

Erkannte Schwaechen:

- Das Ladungsmodell widerspricht der gewuenschten Rolle als verlaessliche
  Standardwaffe.
- Ein leerer Arc-Slot verschwindet waehrend der Regeneration; die verbleibende
  Regenerationszeit wird nicht klar dargestellt.
- Der konfigurierte Halbwinkel von 35 Grad wird im Event ausgegeben, hat aber
  keine Kegel- oder Mehrzielwirkung im Gameplay.
- `whipAmmo` in der Waffenconfig ist nicht identisch mit dem tatsaechlichen
  Maximum von 3 und fuehrt leicht zu Fehlinterpretationen.
- Arc-Pickups besetzen wertvolle Map-Positionen, obwohl sich die Waffe selbst
  regeneriert.

### Basic Autoshoot

| Eigenschaft | Aktueller Ist-Zustand |
| --- | --- |
| Interne ID | `basic-autoshoot` |
| Sichtbarer Name | keiner im Produkt-HUD |
| Verfuegbarkeit | opt-in Core-Faehigkeit, in normalen Produktmatches deaktiviert |
| Angriffstyp | automatische Zielerfassung mit geradlinigem Projektil |
| Zielreichweite | 520 |
| Projektilgeschwindigkeit | 286 |
| Schaden | 18 |
| Projektilradius | 9 |
| Cooldown | 3.000 ms |
| Lebenszeit | 2.600 ms |
| Rechnerische Projektilstrecke | 743,6 |
| Munition | keine |

Das Ziel wird nach Sichtlinie, fehlender Gesundheit und Entfernung bewertet.
Der Angriff besitzt keinen produktiven Pickup, HUD-Slot oder normalen
Spieler-Input. Er bleibt eine interne, derzeit deaktivierte Core-Faehigkeit
und ist keine vierte Produktwaffe.

### Diagnostic Blaster

| Eigenschaft | Aktueller Ist-Zustand |
| --- | --- |
| Interne ID | `diagnostic-blaster` |
| Sichtbarer Name | Diagnosewaffe, nicht Teil normaler Matches |
| Angriffstyp | manuell gerichtetes Projektil |
| Geschwindigkeit | 620 |
| Schaden | 30 |
| Projektilradius | 6 |
| Reichweite | 720 |
| Lebenszeit | 1.200 ms |
| Cooldown | 220 ms |
| Munition | keine |

Der Diagnostic Blaster dient internen Diagnosepfaden. Adapter und
HUD-Hinweise sind teilweise historisch beziehungsweise nicht vollstaendig
deckungsgleich. Er wird durch dieses Produktpaket nicht zur regulaeren Waffe.

## Aktuelle Pickup-Platzierung

Alle Koordinaten sind Weltkoordinaten des aktuellen Map-Datensatzes.

| Map | Rocket | Rail | Arc Lash |
| --- | --- | --- | --- |
| Helix Canopy | `(776, 880)`, `(1432, 880)` | `(1104, 201)` | `(1012, 552)`, `(1196, 552)` |
| Temple of the Drowned Sun | `(840, 860)`, `(1440, 860)` | `(1140, 80)` | `(875, 550)`, `(1405, 550)` |
| Foundry Circuit | `(660, 800)`, `(1780, 800)` | `(1220, 145)` | `(1040, 523)`, `(1400, 523)` |
| Training Crossing | `(130, 500)`, `(1370, 500)` | `(215, 500)`, `(1285, 500)` | `(285, 410)`, `(1215, 410)` |
| Grand Archive | `(125, 500)`, `(2375, 500)`, `(1250, 715)` | `(1250, 105)` | `(285, 410)`, `(2215, 410)` |
| Flank Switch | `(125, 505)`, `(2375, 505)`, `(1250, 715)` | `(1250, 105)` | `(285, 410)`, `(2215, 410)` |
| Sunken Relay | `(720, 230)`, `(1480, 230)`, `(720, 670)`, `(1480, 670)` | `(1100, 90)`, `(1100, 835)` | `(900, 790)`, `(1300, 790)` |

Beim Arc-Umbau werden ausschliesslich die Arc-Pickups entfernt. Rocket- und
Rail-Positionen bleiben in diesem Paket unveraendert. Die leeren Positionen
werden nicht automatisch mit anderen Pickups gefuellt.

## Zielzustand nach dem ersten Waffenpaket

| Eigenschaft | Arc Lash | Rocket | Rail |
| --- | --- | --- | --- |
| Rolle | immer verfuegbare Nahbereichs-Standardwaffe | langsame Flaechen- und Direkttrefferwaffe | knappe Praezisionswaffe fuer grosse Distanz |
| Schaden | 35 | 45 garantiert direkt; vorhandener Splash fuer andere Ziele | fest 85 |
| Cooldown | 800 ms | 1.000 ms | 2.500 ms |
| Munition | unendlich | Pickup +5, Maximum 15 | Pickup +4, Maximum 8 |
| Pickup | keiner | bestehende Positionen | bestehende Positionen |
| HUD leer | nicht anwendbar; immer sichtbar | sichtbar und ausgegraut | sichtbar und ausgegraut |
| Bot | immer als Nahbereichsoption | Vorhalt und begrenzte Flaechenzielwahl | vorhandene Reaktion und Zielabweichung |
| Neuer Effekt | keiner erforderlich | Explosion auch am Flugende | kurzer gruener Effekt an echter Wand |

## Umsetzungsplan

### Phase 0: Katalog und Baseline

Ziel: Vor dem ersten Codeeingriff ist das aktuelle und gewuenschte Verhalten
eindeutig.

- [x] Ist-Katalog und Pickup-Positionen dokumentieren.
- [x] Beschlossene Zielwerte dokumentieren.
- [x] Vor Implementierungsbeginn den aktuellen Test-, Typecheck- und
      Browser-Build-Stand erneut bestaetigen.
- [x] Relevante Baseline-Tests fuer Arc, Rocket, Rail, Pickups, Bots und HUD
      den folgenden Phasen zuordnen.

### Phase 1: Kleine gemeinsame Waffenregel-Basis

Ziel: Pickup-Mengen, Maximalmunition und sichtbare Metadaten besitzen eine
eindeutige Quelle, ohne das gesamte Kampfsystem neu zu bauen.

- [x] Eindeutige Felder fuer `rocketPickupAmmo = 5`,
      `rocketMaxAmmo = 15`, `railPickupAmmo = 4` und `railMaxAmmo = 8`
      einfuehren.
- [x] Irrefuehrende oder unbenutzte `rocketAmmo`, `railAmmo` und `whipAmmo`
      Konfigurationsfelder entfernen oder eindeutig umbenennen.
- [x] Pickup-Anwendung auf das jeweilige Maximum begrenzen.
- [x] Ein Pickup bei vollem Vorrat nicht einsammelbar machen.
- [x] Bei Teilbedarf nur die tatsaechlich hinzugefuegte Menge als
      `appliedValue` melden, zum Beispiel 2 statt 5 bei 13 von 15 Rockets.
- [x] Eine kleine gemeinsame Produkt-Metadatenliste fuer interne ID,
      sichtbaren Namen, HUD-Reihenfolge, Taste, Cooldown, Pickup-Menge und
      Munitionsmaximum pruefen. Noch nicht eingefuehrt, weil die kleine
      Config-Bereinigung den aktuellen Umfang ohne neues Framework abdeckt.
- [x] Kampfverhalten weiterhin in klaren, typisierten Waffenfunktionen lassen;
      kein universelles Waffenframework auf Vorrat bauen.

### Phase 2: Arc Lash als Standardwaffe

Ziel: Arc Lash ist nach Spawn und Respawn jederzeit nutzbar, sofern Cooldown,
Zielreichweite und Sichtlinie es erlauben.

Core:

- [x] `whipAmmo` und `whipRechargeMs` aus dem aktiven Produktzustand entfernen.
- [x] Ladungsverbrauch, Maximal-Ladungen und Regenerationsupdate entfernen.
- [x] Feuerfreigabe nur noch von aktivem Actor, Cooldown und gueltigem Ziel
      abhaengig machen.
- [x] Bestehende Regel beibehalten: Ohne Ziel wird nicht gefeuert und kein
      Cooldown gestartet.
- [x] Schaden 35, Reichweite 120 und Cooldown 800 ms fuer den ersten Test
      beibehalten.
- [x] Interne ID `whip` vorerst nicht breit umbenennen; eine Umbenennung zu
      `arc-lash` ist kosmetische Bereinigung, kein notwendiger Teil dieses
      Pakets.

Pickups und Maps:

- [x] Alle `whip`-Pickups aus jeder Mapdefinition entfernen.
- [x] Whip-Pickupwert und Whip-Pickupanwendung aus dem Produktpfad entfernen.
- [x] Pickup-Renderer und Pickup-Typen bereinigen, soweit dadurch keine
      historischen Diagnosepfade unnoetig zerstoert werden.
- [x] Maptests auf die neue Pickup-Anzahl und das bewusste Fehlen von
      Arc-Pickups aktualisieren.
- [x] Freie Positionen noch nicht mit Pulse oder anderen Pickups belegen.

HUD und Input:

- [x] Arc-Slot dauerhaft darstellen.
- [x] Munitionsbadge und Ladungszahl entfernen.
- [x] Cooldown-Wipe und Cooldown-Zeit weiterhin anzeigen.
- [x] `F` und die bestehende Touch-Schaltflaeche funktional beibehalten.
- [x] In dieser Phase keine allgemeine Touch-Steuerung neu entwerfen.

Bots und Diagnose:

- [x] Munitionspruefung vor Bot-Arc-Nutzung entfernen.
- [x] Arc bei passender Distanz und bereitem Cooldown weiterhin priorisieren.
- [x] TDM-Slot 3 nicht mehr zu Arc-Pickups schicken.
- [x] Arc aus Null-Munitionsmetriken und Pickup-Reservierungslogik entfernen.
- [x] Sicherstellen, dass CTF- und One-Flag-Bots Arc ebenfalls ohne
      Ressourcenannahme verwenden.

Abnahmekriterien:

- Jeder aktive Actor kann Arc nach jedem Cooldown erneut einsetzen.
- Tod, Respawn und Rundenneustart erzeugen keine Ladungs- oder
  Regenerationszustaende.
- Auf keiner Map existiert ein Arc-Pickup.
- Der Arc-HUD-Slot bleibt immer sichtbar.
- Bots warten nicht auf Arc-Munition und suchen keinen Arc-Pickup.

### Phase 3: Rocket-Zuverlaessigkeit, Munition, Bots und HUD

#### 3.1 Garantierter Direkttreffer

- [x] Beim Actor-Kontakt den direkt getroffenen Actor explizit an die
      Explosionsauswertung uebergeben.
- [x] Genau 45 Rohschaden ueber die normale Armor-/Schadenpipeline anwenden.
- [x] Den direkten Actor von zusaetzlichem Splash-Schaden ausschliessen.
- [x] Knockback weiterhin genau einmal und mit der vorhandenen
      Entfernungsregel anwenden.
- [x] Andere Gegner im Radius weiterhin mit Faktor 0,35 bis 1 treffen.
- [x] Spawn-Schutz, Teamfilter und Sichtblockierung durch Solids beibehalten.

#### 3.2 Explosion am Flugende

- [x] Vor dem Ablauf wegen `range` oder `lifetime` eine normale
      Rocket-Explosion am tatsaechlichen Endpunkt erzeugen.
- [x] Genau ein Explosions- und ein Ablaufereignis erzeugen.
- [x] Verhindern, dass Solid-, Bounds-, Actor- und Ablaufkontakt im selben
      Simulationsschritt doppelt explodieren.
- [x] Das vorhandene Explosionsbild und den vorhandenen Splash-Kreis
      wiederverwenden; kein neues Asset erforderlich.

#### 3.3 Durchgehende Kollisionspruefung

- [x] Alte und geplante neue Projektilposition pro Schritt festhalten.
- [x] Den fruehesten Kontakt auf diesem Segment mit Actor, Solid oder
      Weltgrenze bestimmen.
- [x] Das Projektil an den fruehesten Kontaktpunkt setzen und dort genau
      einmal Treffer beziehungsweise Explosion ausloesen.
- [x] Kollisionen bei maximalem zugelassenem Delta sowie bei duennen Solids
      und quer laufenden Actors testen.
- [x] Die gemeinsame Projektilroutine so absichern, dass Basic Autoshoot und
      Diagnostic Blaster ihr bisheriges Verhalten nicht verlieren.

#### 3.4 Munition

- [x] Arena-Pickupwert von 3 auf 5 setzen.
- [x] Maximum 15 durchsetzen.
- [x] Bei 15 von 15 keinen Rocket-Pickup verbrauchen.
- [x] Bei 11 bis 14 nur bis 15 auffuellen und den realen Zuwachs melden.
- [x] Tod und Respawn weiterhin mit 0 Rocket-Munition behandeln.
- [x] Pickup-Positionen und Respawnzeit von 12 Sekunden unveraendert lassen.

#### 3.5 Bot-Nutzung

- [x] Fuer bewegte Ziele einen begrenzten, aus Zielgeschwindigkeit,
      Projektilgeschwindigkeit und Entfernung abgeleiteten Vorhalt berechnen.
- [x] Vorhalt auf eine vernuenftige Maximalzeit begrenzen, damit Bots bei
      Richtungswechseln nicht weit neben die Arena zielen.
- [x] In geeigneten Situationen einen sichtbaren Wandpunkt nahe dem Ziel
      waehlen, wenn der Splash-Radius den Gegner erreichen kann. Freier Boden
      ist in der aktuellen Top-down-Geometrie kein Projektilkontakt und wird
      deshalb nicht als kuenstliches Explosionsziel behandelt.
- [x] Keine Ziele durch Deckung und keine mathematisch perfekten
      Abprall-/Vorhersageschuesse erlauben.
- [x] Bestehende Entfernungsgrenzen und den 3.000-ms-Entscheidungsrhythmus
      zunaechst beibehalten.
- [x] Kleine deterministische Ungenauigkeit beziehungsweise nachvollziehbare
      Fehlentscheidungen beibehalten.

#### 3.6 HUD

- [x] Rocket-Slot unabhaengig von der Munitionsmenge anzeigen.
- [x] Bei 0 Munition Icon und Rahmen eindeutig ausgrauen.
- [x] Bei Munition den aktuellen Wert bis maximal 15 anzeigen.
- [x] Cooldown-Darstellung beibehalten.
- [x] Keine Touch-Zielhilfe oder Touch-Gesten in dieser Phase aendern.

Abnahmekriterien:

- Ein Direkttreffer verursacht exakt 45 Rohschaden und niemals doppelten
  Schaden.
- Splash trifft ausschliesslich weitere berechtigte Actors mit Falloff.
- Jede Rocket endet sichtbar in genau einer Explosion.
- Kein getestetes Ziel oder schmales Solid wird zwischen zwei Positionen
  uebersprungen.
- Pickup +5 und Maximum 15 funktionieren inklusive Teilauffuellung.
- Bots koennen sichtbar vorhalten, bleiben aber fehlbar.
- Der leere HUD-Slot bleibt erkennbar.

### Phase 4: Rail-Schaden, Munition und Wandtreffer

Core:

- [x] `railDamageRatio` durch einen festen `railDamage = 85` ersetzen.
- [x] Treffer immer mit 85 Rohschaden durch die normale Armor-/Schadenpipeline
      verarbeiten.
- [x] Reichweite 1.100, Cooldown 2.500 ms und Radiuszugabe 5 beibehalten.
- [x] Pickupwert von 2 auf 4 setzen.
- [x] Maximum 8 durchsetzen.
- [x] Bei vollem Vorrat keinen Pickup verbrauchen und Teilauffuellung korrekt
      melden.
- [x] Rail-Event eindeutig zwischen Actor-Treffer, Solid-Ende und
      Reichweitenende unterscheiden lassen.

Rendering:

- [x] Nur bei einem echten Solid-Ende einen kurzen Wandtreffer erzeugen.
- [x] Den Effekt gruen wie den Rail-Strahl gestalten.
- [x] Einen kleinen lokalen Funken/Ring per bestehendem Graphics-Layer
      bevorzugen; kein neues Asset erzwingen.
- [x] Effekt kurz halten und weder Pickups noch Actors ueberdecken.
- [x] Bei freiem Reichweitenende keinen falschen Wandtreffer anzeigen.

HUD und Input:

- [x] Rail-Slot auch bei 0 Munition sichtbar und ausgegraut halten.
- [x] Munitionswert bis maximal 8 anzeigen.
- [x] Bestehende Desktop-Eingabe `E` beibehalten.
- [x] Touch-Autoaim und Touch-Gesten nicht in diesem Paket aendern.

Abnahmekriterien:

- Jeder Actor-Treffer meldet und verarbeitet genau 85 Rohschaden.
- Pickup +4 und Maximum 8 funktionieren inklusive Teilauffuellung.
- Der gruene Wandtreffer erscheint nur dort, wo der Strahl wirklich ein Solid
  erreicht.
- Actor-Impact, Wand-Impact und freier Fehlschuss bleiben unterscheidbar.

### Phase 5: Gemeinsames Waffen-Gate

Ziel: Die Einzelverbesserungen duerfen zusammen weder Modi noch
Pickup-Oekonomie unkontrolliert verschieben.

- [x] Core-Tests und Typecheck ausfuehren.
- [x] Produktions-Build ausfuehren.
- [x] Bestehende Phaser-Smoke-Checks aktualisieren und ausfuehren.
- [x] Jede Map auf entfernte Arc-Pickups und unveraenderte Rocket-/Rail-Orte
      pruefen.
- [x] TDM, Classic CTF und One Flag pruefen.
- [x] 1v1, 2v2 und 4v4 pruefen.
- [x] Desktop-HUD in kleinen und grossen Viewports durch Layouttests und den
      Premium-Map-E2E-Smoke pruefen.
- [x] Bot-Diagnosen auf Null-Munitionszeit, Pickup-Suche und Waffenwahl
      aktualisieren.
- [ ] Testspiele fuer Arc-Dominanz durch unbegrenzte Verfuegbarkeit
      durchfuehren.
- [ ] Falls Arc zu dominant wird, als getrennten A/B-Test 30 Schaden und
      1.000 ms Cooldown pruefen; nicht ungeprueft beide Werte aendern.
- [ ] Rail mit 85 Schaden auf Kill-Verteilung und Armor-Wirkung pruefen.
- [ ] Rocket-Vorrat 15 auf Horten, Pickup-Kontrolle und 4v4-Projektilmenge
      pruefen.

### Phase 6: Premium-Map-Dekorations-Vertical-Slice

Nach bestandenem Waffen-Gate wurde je ein hochwertiges kosmetisches
Randelement umgesetzt:

- [x] Helix Canopy: reaktive biolumineszente Pflanze.
- [x] Temple of the Drowned Sun: kleiner Tempelfrosch mit Flucht und
      Wasserkraeuseln.
- [x] Foundry Circuit: Wartungsdrohne, die sich bei Aktivitaet zurueckzieht.
- [x] Gemeinsames selektiv geladenes Overlay-System ohne Physik,
      Gameplay-Events oder Sound.
- [x] Herkunft, Nachbearbeitung und Performancebudget unter
      `docs/PREMIUM_MAP_COSMETIC_VERTICAL_SLICE.md` dokumentiert.
- [ ] Positionen aller drei Elemente nach dem ersten manuellen Test
      ueberarbeiten: Helix ist unguenstig positioniert, Temple und Foundry
      sind aus der normalen Spielkamera zu unauffaellig beziehungsweise
      nicht auffindbar.
- [ ] Neue Positionen im echten Match visuell abnehmen lassen, bevor weitere
      Dekorationselemente hinzukommen.

Diese Phase aendert keine Waffenwerte, Masterbilder, Kollisionen oder
Pickup-Positionen.

### Phase 7: Pulse-Repeater-Prototyp

Pulse ist als erste neue Testwaffe implementiert.

Vorlaeufige, noch nicht endgueltig freigegebene Testidentitaet:

- manuell gerichtete, schmale Projektile,
- mittlere Reichweite,
- kontinuierliches Tracking statt Splash, Hitscan oder Autoziel,
- 10 Schaden, 160 ms Feuerrhythmus, Geschwindigkeit 760,
- Reichweite 640,
- Pickup +36, Maximum 54,
- kein Splash, kein Homing und kein Knockback.

Die ehemaligen Arc-Pickup-Positionen sind Kandidaten, aber keine automatische
Zuweisung. Pro Map werden Anzahl, Symmetrie, Moduswege und bestehende
Rocket-/Rail-Oekonomie zuerst neu bewertet.

### Phase 8: Ricochet Disc

Die Ricochet Disc ist implementiert: 38 Schaden direkt, bis zu drei
Abpraller, nach dem ersten Abpraller 50 Schaden, 850 ms Cooldown, Pickup +8
und Maximum 12. Ein Kontakt mit einem gegnerischen Actor beendet das
Projektil sofort; es fliegt nach einem Treffer nicht weiter.

Die Disc bleibt auf `C`. Der zuvor ebenfalls auf `C` liegende Reset der
manuell verschobenen Kamera wurde auf `Home` verlegt, damit ein Disc-Schuss
keine Kamerabewegung beziehungsweise Neuzentrierung mehr ausloest.

### Produktionsgrafiken fuer Pulse, Disc und Lob Grenade

Pulse Repeater und Ricochet Disc verwenden seit dem 2026-07-19 eigene
Waffen- und Projektilgrafiken. HUD und Pickup zeigen jeweils die komplette
Waffe; im Flug werden ein eigener Cyan-Bolzen beziehungsweise eine rotierende
goldene Disc gerendert. Die Lob Grenade besitzt zusaetzlich eine eigene
blau-weisse Energiekugel. Nach der Landung pulsiert ihr Kern immer heller;
die Detonation verwendet eine eigene blau-weisse Ring-, Blitz- und
Energieexplosion statt der orangefarbenen Rocket-Explosion. Die vorherigen
prozeduralen Icons bleiben lediglich als technischer Fallback fuer isolierte
Phaser-Tests erhalten.

Alle fuenf Motive wurden mit dem integrierten OpenAI-ImageGen-Werkzeug als
neue Projektassets erzeugt. Es wurden keine Fremdassets, Markenwaffen oder
Asset-Pakete verwendet. Die Prompts verlangten einzelne, freigestellte
Sci-Fi-Objekte, klare Lesbarkeit in der Top-down-Arena, keine Teammarkierung,
keinen Text und einen gleichmaessigen magentafarbenen Chroma-Key-Hintergrund.

| finales Asset | ImageGen-Original | Promptkern | SHA-256 |
| --- | --- | --- | --- |
| `public/assets/weapons/pulse-repeater.png` | `call_vxMorQy6HD6A5CjDJYlTyNyG.png` | kompakter Graphit-/Keramik-Energiekarabiner mit zwei Cyan-Zellen | `E1FB615024F3A3AA2A87F8A5718E1A4E917C290B6DE707DF23900B73035D044A` |
| `public/assets/weapons/pulse-bolt.png` | `call_gIQb2xHhm3Uyr4vugF0kgYoK.png` | kurzer gerichteter Cyan-Energiebolzen mit weissem Kern | `0846DA5832B32CAD351FE93CC06A39C8FE5726DAD377D3C26860F4525C6419B8` |
| `public/assets/weapons/ricochet-disc-launcher.png` | `call_roC62ecsZ8TBn6phYxmJitNp.png` | magnetischer Graphit-Scheibenwerfer mit sichtbarem Goldmagazin | `2AE10FF368E9600C0E59A61C179C6C37EF0E9D98C376C507239EF71E886243B0` |
| `public/assets/weapons/ricochet-disc-projectile.png` | `call_LRw86LgvmUKunMgcQAoXweD6.png` | direkt von oben sichtbare segmentierte Stahl-/Gold-Rotorscheibe | `3C7F7E9808E3577F340E737501D13D12CE629343BBFB94E36C07359E4927BA5C` |
| `public/assets/weapons/lob-energy-grenade.png` | `call_taKzpM3ykCJ5kD1AxB7UN5Jv.png` | direkt von oben sichtbare Graphit-Energiekugel mit segmentierter Huelle und blau-weissem Kern | `E9CF43A2ACE79205BD05B7CDEE9C881C5A9A3FC6D64FD641667F5CCF48519496` |

Die Originale liegen im lokalen Codex-Ordner
`C:\Users\madde\.codex\generated_images\019f76d1-a6d9-7d30-8b70-1d593f5dd387`.
Der Chroma-Key wurde mit `remove_chroma_key.py`, Soft-Matte und Despill
entfernt. Danach wurden die sichtbaren Alpha-Grenzen proportional auf
transparente 256-x-256-PNGs gesetzt. Tests pruefen Format, Alpha,
Abmessungen und ein Dateibudget unter 200 KB.

### Phase 9: Lob Grenade

Die Lob Grenade ist implementiert: Zielpunkt am Cursor bis Reichweite 850,
Flug ueber Solids und Actors, sichtbare Flugkurve, kurze Landefuse,
60 Zentrumsschaden mit Radius 120, Pickup +3 und Maximum 9. Der Zielpunkt
wird auf Weltgrenzen und begehbaren Boden zurueckgezogen. Projektil,
Ladetelegraph und Explosion besitzen eine gemeinsame blau-weisse
Energieidentitaet.

### Phase 10: Shardcaster

Der Shardcaster ist implementiert: 5 Direktschaden, begrenzte Zielsuche in
einem engen Kegel, langsame Kurskorrektur nur bei Sichtlinie und eine lokale
Resonanz von 25 Bonusschaden nach sechs Treffern desselben Schuetzen.
Pickup +18, Maximum 54. Die Resonanz erzeugt keinen Flaechenschaden.

### Aktuelle Premium-Map-Roster

| Map | Vier gleichzeitig verfuegbare Waffen |
| --- | --- |
| Helix Canopy | Arc Lash, Rail, Pulse Repeater, Shardcaster |
| Temple of the Drowned Sun | Arc Lash, Rocket, Lob Grenade, Ricochet Disc |
| Foundry Circuit | Arc Lash, Rocket, Rail, Ricochet Disc |

Das Roster ist Teil des World-Snapshots. Feuerfreigabe, Desktop-HUD,
Bot-Wahl und Pickup-Oekonomie lesen dieselbe Mapliste. Arc Lash steht immer
ohne Pickup bereit; eine Premium-Map hat hoechstens drei Pickup-Waffen.

## Relevante Testabdeckung

Bestehende Ausgangspunkte:

- `tests/p0-gameplay.test.ts`
- `tests/gameplay-core.smoke.test.ts`
- `src/adapters/phaser/PhaserGameBridge.smoke.ts`
- `tests/bot-simulation.test.ts`
- `tests/bot-traversal-smoke.test.ts`
- `tests/helix-canopy.test.ts`
- `tests/drowned-sun-temple.test.ts`
- `tests/foundry-circuit.test.ts`
- `tests/world-map-quality.test.ts`
- `tests/e2e/premium-arenas.spec.ts`

Neu oder gezielt zu erweitern:

- Arc feuert mehrfach ueber Cooldowns hinweg ohne Ressource.
- Arc bleibt nach Tod, Respawn und Rematch ressourcenfrei.
- Keine Map enthaelt einen Arc-Pickup.
- Kein Bot plant einen Arc-Pickup als Ziel.
- Rocket-Direkttreffer verursacht exakt 45 und keinen doppelten Splash.
- Rocket-Splash auf weitere Actors behaelt Falloff, Sicht- und Teamregeln.
- Rocket explodiert bei Solid, Bounds, Actor, Range und Lifetime genau einmal.
- Swept Collision trifft Actors und duenne Solids zwischen zwei Frames.
- Rocket-Pickup +5, Maximum 15 und Teilauffuellung.
- Rail fester Schaden 85 gegen Health, Armor und Spawn-Schutz.
- Rail-Pickup +4, Maximum 8 und Teilauffuellung.
- Rail-Wandende wird im Event vom freien Reichweitenende unterschieden.
- HUD-Slots bleiben ohne Munition sichtbar.
- 4v4-Stresstest mit maximal sinnvollem Rocket-Vorrat.
- Pulse-Projektil verursacht 10 Schaden und respektiert das Map-Roster.
- Disc kann genau dreimal abprallen, erhaelt nach dem ersten Abpraller
  50 Schaden und endet bei jedem gegnerischen Treffer sofort.
- Pulse-Pickup gibt 36 Schuss, Disc-Pickup 8; beide respektieren weiter ihr
  bestehendes Maximum.
- Disc-Feuer auf `C` und Kamera-Reset auf `Home` sind konfliktfrei.
- Fuenf Waffen-/Projektilassets besitzen 256 x 256 Pixel, Alpha und bleiben
  unter dem Dateibudget.
- Grenade ueberquert Solids, landet, telegraphiert und detoniert lokal.
- Shardcaster loest genau nach sechs Treffern eine einzelne Resonanz aus.
- Jede Premium-Map enthaelt Arc plus genau drei Pickup-Waffen.

## Bewusst nicht Teil des ersten Pakets

- keine allgemeine Ueberarbeitung der Touch-Eingabe,
- kein Rail-Tap-/Autoaim-Umbau,
- keine Rocket-Touch-Reichweitenkorrektur in diesem Paket,
- kein Rocket-Jumping,
- kein eigener Selbstschaden oder Selbst-Knockback,
- keine Aenderung der Masterbilder oder Kollisionsdaten,
- keine sofortige Belegung aller entfernten Arc-Pickup-Positionen,
- kein vierter oder zufaellig zusaetzlicher Disc-Abpraller,
- keine frei um Hindernisse kurvenden Shard-Projektile,
- keine umfassende universelle Waffen-Engine ausserhalb des benoetigten
  gemeinsamen Katalogs,
- keine Wiederaufnahme des vertagten Soundthemas.

## Quellreferenzen des Ist-Katalogs

- `src/core/combat/V1WeaponConfig.ts`
- `src/core/combat/v1Weapons.ts`
- `src/core/combat/updateProjectiles.ts`
- `src/core/combat/BasicAutoAttackConfig.ts`
- `src/core/combat/basicAutoAttack.ts`
- `src/core/combat/DiagnosticWeaponConfig.ts`
- `src/core/combat/diagnosticWeapon.ts`
- `src/core/pickups/PickupConfig.ts`
- `src/core/pickups/updatePickups.ts`
- `src/core/actors/actor.ts`
- `src/core/actors/actorLifecycle.ts`
- `src/core/bots/TdmBotCombatController.ts`
- `src/core/bots/TdmBotController.ts`
- `src/adapters/phaser/PhaserWeaponEffectsPort.ts`
- `src/adapters/phaser/PhaserArenaHudPort.ts`
- `src/adapters/phaser/PhaserMobileInputAdapter.ts`
- `src/adapters/phaser/weaponHudLayout.ts`
- die Mapdefinitionen unter `src/core/world/maps/`
