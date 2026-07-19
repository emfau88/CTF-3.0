# Bot Simulation Testing

Stand: 2026-07-19

Die Bot-Tests laufen headless im echten `GameplayCoreRuntime`. Sie prüfen
Entscheidung, Navigation, Kollision, Pickups, Waffen, Objectives, Tod und
Respawn ohne Browser oder Renderer.

## Schnelle Testebenen

### KI-v2-Mikroszenarien

```bash
node --import tsx --test tests/bot-ai-v2.test.ts
```

Geprüft werden:

- gemeinsame Waffen- und Distanzbewertung,
- Utility-Bindung und Notfall-Override,
- CTF-Rollen und menschliche Kommandos,
- One-Flag-Runner, Escort, Screen, Interceptor und Cutoff,
- begrenzte Wahrnehmung und kurze Gegnererinnerung,
- kein Schuss auf reines Teamwissen,
- Team-Separation und Projektilausweichen,
- Zielprojektion und dreistufige Stuck-Recovery,
- Anlauf und Ausführung autorisierter Jump-Links,
- Bot-Vertrag und Erreichbarkeit jeder registrierten Map,
- Auditmatrix mehrerer Teamgrößen.

### Runtime-Simulationen

```bash
node --import tsx --test tests/bot-simulation.test.ts
```

Enthalten sind:

- repräsentative Langläufe in TDM, Classic CTF und One Flag,
- jeder Modus auf jeder Map von 1v1 bis 4v4 als Start-/Aktivitäts-Smoke,
- längere Foundry-Circuit-2v2-Läufe,
- TDM-Pickup- und Standoff-Szenarien,
- CTF-Flaggen-Notfall,
- One-Flag-Carrier-/Escort-Situationen,
- Navigator-Telemetrie.

### Sprungverbindungen

```bash
node --import tsx --test tests/bot-traversal-smoke.test.ts
```

Jeder in einer Map autorisierte Jump-Link muss:

- aus dem Aktivierungsbereich starten,
- mindestens 50 Prozent Fortschritt melden,
- außerhalb einer Gap landen,
- ohne Fallzustand abgeschlossen werden.

### Gesamtsuite

```bash
npm.cmd test
npm.cmd run test:typecheck
npm.cmd run build
```

## Gespeicherter Premium-Audit

```bash
npm.cmd run bot:audit:premium
```

Standard:

- Helix Canopy, Temple of the Drowned Sun, Foundry Circuit,
- TDM, Classic CTF und One Flag,
- 1v1, 2v2 und 4v4,
- 10 Läufe je Kombination,
- 60 Sekunden je Lauf,
- 270 Matches.

Schneller Entwicklungsvergleich:

```bash
npm.cmd run bot:audit:premium -- --runs 5 --duration-ms 10000 --team-sizes 1,2,4
```

Ausgaben:

- `diagnostics/bots/premium/latest.json`
- `diagnostics/bots/premium/latest.md`
- `diagnostics/bots/premium/history/<timestamp>.json`

Die vollständige Metrik- und Ergebnisbeschreibung steht in
`docs/PREMIUM_MAP_BOT_BEHAVIOR_AUDIT.md`.

## Map-Abnahme

Jede registrierte Map besitzt einen `botProfile`-Vertrag. Der Test
`validateWorldMapBotSupport(map)` prüft:

- gültige taktische Zonen,
- sichere Jump-Link-Endpunkte,
- spielbare Pickups und Objectives,
- Erreichbarkeit von beiden Teamstarts.

Neue oder stark umgebaute Maps gelten erst als botfähig, wenn:

1. die statische Map-Prüfung grün ist,
2. alle Jump-Link-Smokes grün sind,
3. die 1v1-bis-4v4-Runtime-Matrix grün ist,
4. ein Premium-Audit oder gleichwertiger Mehrfachlauf keine kritischen
   Befunde erzeugt,
5. ein Mensch das Verhalten in allen unterstützten Modi visuell geprüft hat.

## Metriken richtig lesen

- Tot-/Respawnzeit ist keine Inaktivität.
- Ein bewusstes Combat-Hold ist kein Move-Stall.
- Ein blockiertes Rohziel ist kein Fehler, wenn es projiziert wird und der
  Bot weiterläuft.
- Ein kurzer Stall bis zur ersten oder zweiten Recovery-Stufe ist ein
  Informationshinweis.
- Ein Stall bis zur dritten Recovery-Stufe ist eine Warnung.
- CPU-Zeiten aus Node sind für Vergleiche geeignet, aber kein Ersatz für
  Browser-Profiling auf dem Zielgerät.

## Bewusste Grenzen

Headless-Tests beantworten nicht:

- ob Bewegung optisch menschlich genug wirkt,
- ob eine taktische Entscheidung Spaß macht,
- ob HUD und Touch verständlich sind,
- wie GPU, Rendering und Effekte auf kleinen Geräten performen,
- ob Waffen und Objectives gegen Menschen ausgewogen sind.
