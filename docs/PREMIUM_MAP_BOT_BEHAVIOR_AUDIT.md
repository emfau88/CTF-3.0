# Premium-Map Botverhalten und Audit

Stand: 2026-07-19

Der reproduzierbare Headless-Audit untersucht die produktive Botlogik auf:

- Helix Canopy (`helix-canopy-v2`)
- Temple of the Drowned Sun (`drowned-sun-temple-v2`)
- Foundry Circuit (`flow-circuit-v2`)

Er startet echte `GameplayCoreRuntime`-Matches in Team Deathmatch,
Classic CTF und One Flag. Renderer, HUD und Sound sind nicht beteiligt.

Die KI-Architektur ist separat dokumentiert:

- `docs/BOT_AI_V2_ARCHITECTURE.md`

## Standardmatrix

```bash
npm.cmd run bot:audit:premium
```

Der Standardlauf umfasst:

- 3 Premium-Maps,
- 3 Modi,
- 1v1, 2v2 und 4v4,
- 10 deterministische Läufe pro Kombination,
- 60 Sekunden pro Lauf,
- insgesamt 270 simulierte Matches.

Der gespeicherte Audit erlaubt 5 bis 10 Läufe und 5 bis 120 Sekunden:

```bash
npm.cmd run bot:audit:premium -- --runs 5 --duration-ms 30000 --team-sizes 1,2,4
```

Ein einzelner Teamumfang bleibt für schnelle Vergleiche möglich:

```bash
npm.cmd run bot:audit:premium -- --runs 5 --duration-ms 10000 --team-size 2
```

## Ausgaben

- `diagnostics/bots/premium/latest.json`
- `diagnostics/bots/premium/latest.md`
- `diagnostics/bots/premium/history/<timestamp>.json`

JSON enthält die vollständigen Zahlen. Markdown ist die kurze
Vergleichsansicht. Entscheidungstraces werden nur für Läufe mit Warnung oder
kritischem Befund gespeichert; reine Informationshinweise blähen das
Artefakt nicht auf.

## Kontrollierte Variation

Startlagen werden stabil aus Map, Modus, Teamgröße, Laufindex und Actor-ID
abgeleitet. Es gibt keine unkontrollierte Zufallsquelle.

Classic CTF vergleicht:

1. Auto,
2. Defend,
3. Follow,
4. Attack,
5. zeitlicher Zyklus Defend → Follow → Attack → Auto,
6. weitere Läufe als deterministische Positionsvarianten.

Bei Follow wird `blue-player` als menschlicher Bewegungsproxy behandelt.
Nur Bot-Teamkameraden erhalten das Kommando.

## Gemessene Faktoren

Pro Lauf:

- Score, Flag-Pickups und Captures,
- Frames ohne Aktionen,
- invalide Positionen,
- durchschnittliche, p95- und maximale CPU-Zeit aller Botentscheidungen.

Pro Bot:

- aktive Zeit und getrennte Tot-/Respawnzeit,
- Laufstrecke und Strecke pro Sekunde,
- längster Stillstand,
- Stillstand trotz Bewegungsabsicht,
- bewusstes Combat-Hold,
- Hold ohne Schuss,
- Hold ohne taktisch einsetzbare Waffe,
- blockierte Ziele und fehlende Pfade,
- Repaths, Ziel- und Entscheidungswechsel,
- starke Richtungswechsel,
- Schüsse, Pickups, Schaden, Kills und Tode,
- Kommando-Befolgung, Notfall-Override und unerlaubter Konflikt.

Problematische Läufe speichern ungefähr einmal pro Sekunde:

- Position,
- Entscheidung und Zielkey,
- Navigationstarget und Wegpunkt,
- Pfadstatus und Recovery-Stufe,
- gewählte Waffe und Entscheidungsgrund,
- lokaler Lenkgrund wie Teamtrennung, Projektilausweichen oder Recovery,
- Teamrolle und Teamgrund.

## Befundklassen

Kritisch:

- nicht-endliche Position,
- kompletter Frame ohne Botaktionen.

Warnung:

- p95-Entscheidungszeit über dem strengen 4-ms-Budget,
- kein Objective-Kontakt in einem ausreichend langen Objective-Lauf,
- kein Waffenschuss oder echter Combat-Deadlock in TDM,
- Stillstand bis in die dritte Recovery-Stufe,
- hohe Pfadfehlerrate,
- blockiertes Ziel mit messbarer Folge,
- sehr geringe Aktivität,
- unerlaubter Konflikt mit einem menschlichen Kommando.

Information:

- blockierte Rohziele, die erfolgreich projiziert werden,
- kurze Stalls innerhalb der gestuften Recovery,
- auffällige Richtungswechsel ohne festgestellten Fortschrittsverlust.

Ein blockiertes Rohziel ist allein kein Defekt. Pickups, Carrier oder
Standoff-Punkte können knapp am Navigator-Padding liegen. Relevant wird es
erst, wenn Projektion und Recovery keinen Fortschritt herstellen.

## Implementierungsbefunde und Korrekturen

Der erste Audit vor Bot-KI v2 zeigte:

- Temple-TDM konnte bei ungefähr 160 Einheiten stehen bleiben, obwohl nur
  Arc Lash ohne Munition verfügbar und dafür zu kurz war.
- Rocket-Bots verwendeten einen alten 3-Sekunden-Autoshoot-Timer statt des
  echten 1-Sekunden-Waffenrhythmus.
- Helix-Sprünge enthielten im Pfad nur den Landepunkt. Bots außerhalb des
  Aktivierungsradius liefen deshalb gegen die Kapselkante.
- Rollen in 4v4 wurden zu häufig neu verteilt und erzeugten widersprüchliche
  Zielwechsel sowie synchrone A*-Spitzen.

Korrigiert wurden:

- gemeinsame Waffenbewertung für Bewegung und Schuss,
- Annäherung bis in echte Arc-Lash-Reichweite,
- echter Rocket-Rhythmus,
- Jump-Link-Anlaufpunkt vor Landepunkt,
- gestufte Stuck-Recovery,
- kurze Rollen- und Formationsbindung,
- deterministisch verteilte Repath-Zeitpunkte.

## Letzter Entwicklungs-Audit

Der gespeicherte Abschlusslauf `2026-07-19T18-08-45-590Z` verwendete:

- 270 Matches,
- alle 3 Premium-Maps und alle 3 Modi,
- 1v1, 2v2 und 4v4,
- 10 Läufe je Kombination,
- 60 Sekunden je Lauf.

Ergebnis nach den Korrekturen:

- 0 kritische Befunde,
- keine fehlenden Botaktionen und keine invaliden Positionen,
- kein TDM-Combat-Deadlock und kein stiller Combat-Hold über dem Warnlimit,
- kein Move-Stall bis zur dritten Recovery-Stufe,
- keine Pfadfehlerrate über dem Warnlimit,
- keine unerlaubten Kommando-Konflikte,
- keine langen Helix-One-Flag-Sprungstaus,
- 6 bewusst sichtbar gebliebene Warnhinweise.

Der erste vollständige Entwicklungs-Audit vor den letzten
Navigationskorrekturen enthielt 66 Warnungen. Im Abschlusslauf bleiben:

- 4 aktive 4v4-Classic-CTF-Läufe ohne Flaggenaufnahme in der ersten Minute:
  zwei auf Temple und zwei auf Foundry;
- 2 Überschreitungen des strengen Node-p95-Budgets von 4 ms:
  `4.2065` und `4.0301` ms bei durchschnittlich nur `1.1448` und `0.9096` ms
  in den betroffenen Läufen.

Die vier CTF-Läufe sind keine Inaktivitäts- oder Navigationsausfälle. Die
acht Bots legten je Lauf zusammen ungefähr 68.700 bis 75.800 Einheiten
zurück, feuerten 83 bis 111 Schüsse und erreichten höchstens 136 ms
Move-Stall. Sie zeigen echten Kampf- und Objective-Druck, aber noch eine
Balancefrage für Flaggenzugang und Überlebensdauer im dichten 4v4.

Die CPU-Messung ist maschinenabhängig; wiederholte Entwicklungs-Audits
schwankten bei diesem strengen Grenzwert zwischen keinem und wenigen
Performance-Hinweisen. Node-Zeiten sind deshalb ein Trendindikator, kein
Browserprofil. Vor einem Release bleibt ein visuelles 4v4-Profiling auf einem
kleineren Zielgerät sinnvoll.

## Interpretation nach Modus

### Team Deathmatch

- Bots suchen fehlende Roster-Waffen oder dringend benötigte Health/Armor.
- Sie halten nur, wenn eine tatsächlich verfügbare Waffe die aktuelle
  Distanz abdeckt.
- Ohne passende Munition schließen sie in Arc-Lash-Reichweite auf.
- Teamziele werden verteilt; lokale Separation verhindert unnötige Cluster.

### Classic CTF

- Rollen passen sich an die Teamgröße an.
- Aufgaben bleiben kurz stabil und werden bei Tod oder Notfall neu verteilt.
- Follow betrifft genau einen Bot, Defend und Attack sinnvolle Teilgruppen.
- Eigener Flaggenverlust und eigener Carrierlauf dürfen Kommandos
  nachvollziehbar überstimmen.

### One Flag

- Nur ein Bot übernimmt den initialen Flaggenlauf.
- Mit Carrier entstehen Escort und Screen.
- Gegen einen Carrier entstehen Interceptor und Cutoff.
- Dynamische Ziele nahe Cover werden lokal auf freie Punkte projiziert.

## Grenzen des Audits

Der Audit beweist technische Aktivität und findet reproduzierbare
Logikkonflikte. Er ersetzt nicht:

- visuelles Spielgefühl,
- Bewertung der taktischen Qualität durch Menschen,
- Browser- und GPU-Profiling,
- Touch- oder HUD-Tests,
- Balancing über viele menschliche Matches.
