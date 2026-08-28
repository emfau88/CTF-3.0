# Phase 0 – Release-Baseline

- **Status:** `IN PROGRESS`
- **Vorbereitet:** 2026-08-28
- **Arbeitsbranch:** `codex/release-baseline`
- **Basis:** `origin/main` @ `4ce36f5`
- **Kanonische Roadmap:** [CORE_ARENA_RELEASE_ROADMAP.md](../CORE_ARENA_RELEASE_ROADMAP.md)

## Zweck

Diese Phase erzeugt einen sauberen, belegten und wiederherstellbaren
Ausgangspunkt. Sie ändert kein Produktverhalten. Erst nach ihrem Abschluss darf
Phase 1 beginnen.

## Bestätigte Repository-Fakten

| Prüfung | Ergebnis | Evidenz |
| --- | --- | --- |
| Aktiver Projektordner | bestanden | `C:\Users\madde\Documents\CTF-3.0` |
| Remote-Stand aktualisiert | bestanden | `origin/main` am 2026-08-28 auf `4ce36f5` gefetcht |
| Feature-Inhalt integriert | bestanden | `9811b51` ist Vorfahr von `4ce36f5`; beide Trees sind identisch |
| Isolierter Phase-0-Branch | bestanden | `codex/release-baseline` basiert auf `origin/main` |
| Untracked WIP vorhanden | geschützt/offen | siehe Schutzliste unten |
| Audio ausgeschlossen | verbindlich | keine Audioprüfung oder -änderung vor Phase 9 |

## Geschütztes WIP

Die folgenden beim Start untracked vorgefundenen Bereiche sind **nicht Teil von
Phase 0**. Sie dürfen in diesem Branch weder gelöscht, verschoben, bearbeitet
noch pauschal gestaged werden:

- `docs/concepts/core-arena-custom-match-full-map-mockup-v2.png`
- `docs/concepts/core-arena-custom-match-mockup-v1.png`
- `docs/concepts/core-arena-league-hq-mockup-v1.png`
- `docs/concepts/core-arena-league-progression-mockup-v2.png`
- `docs/concepts/core-arena-main-menu-twilight-mockup-v2.png`
- `docs/concepts/core-arena-menu-bright-mockup-v1.png`
- `docs/concepts/core-arena-settings-help-mockup-v1.png`
- `public/assets/ax9-mantis-idle-special-pilot-spritesheet-6x4.png`
- `public/assets/sounds/neu/`
- `public/assets/ui/portraits/xeno-runner-portrait.png`
- `src/adapters/phaser/characterSpecialIdle.ts`
- `tmp/`

Vor jedem Commit gilt:

```powershell
git status --short
git diff --cached --name-only
```

Es wird ausschließlich mit expliziten Dateipfaden gestaged, niemals mit
`git add .`.

## Arbeitspakete

### P0.1 – Baseline und Dokumentation

- [x] Projektordner verifiziert.
- [x] `origin/main` aktualisiert und Commit/Tree geprüft.
- [x] Phase-0-Branch angelegt.
- [x] Untracked WIP inventarisiert und geschützt.
- [x] Kanonische Roadmap angelegt.
- [x] README auf die kanonische Roadmap umgestellt.
- [x] Frühere übergeordnete Pläne als historisch markiert.

### P0.2 – Kleine Architektur- und CI-Hygiene

- [x] Pull-Request-Trigger für die vollständigen automatischen Gates ergänzt.
- [x] Pages-Konfiguration und Deploy bei Pull Requests deaktiviert.
- [x] Smoke-Test-Export aus `src/adapters/phaser/index.ts` entfernt; Tests
      importieren weiterhin direkt aus der Testdatei.
- [x] `npm audit --omit=dev` auf dem Branch erneut ausgeführt und Ergebnis hier
      dokumentiert.
- [x] Sichere transitive Patches für `postcss` und `nanoid` angewandt; keine
      Major-Upgrades oder erzwungenen Fixes.
- [ ] Verbleibenden niedrigen `esbuild`-Befund über ein kompatibles Vite-Paket
      lösen und anschließend in einer sauberen Installation verifizieren.

### P0.3 – Automatische Baseline-Gates

| Gate | Befehl | Status | Ergebnis/Evidenz |
| --- | --- | --- | --- |
| Unit/Integration/Simulation | `npm test` | `PASS*` | 223/223 vor Audit sowie 223/223 nach Patch mit isoliertem, versionsgleichem Dev-Harness |
| Test-/Script-Typecheck | `npm run test:typecheck` | `PASS*` | vor Audit grün; Wiederholung mit frischem `npm ci` steht aus |
| Produktions-Build | `npm run build` | `PASS*` | nach Patch grün; isolierte Wiederholung mit `--configLoader runner` ebenfalls grün |
| Browser-E2E | `npm run test:e2e` | `PASS*` | 10/10 gegen den Produktions-Build; direkter npm-Aufruf in sauberer Installation noch zu wiederholen |
| Produktions-Audit | `npm audit --omit=dev` | `OPEN` | `postcss`/`nanoid` behoben; 1 niedriger `esbuild`-Befund verbleibt |

Ein Gate wird nur mit Datum, Ergebnis und gegebenenfalls einem Link auf
gespeicherte QA-Evidenz auf `PASS` gesetzt.

#### Lokaler Installationshinweis zum E2E-Gate

Der erste direkte `npm run test:e2e`-Aufruf fand `@playwright/test` nicht mehr,
weil `npm audit fix --omit=dev` die Dev-Abhängigkeiten aus dem lokalen
`node_modules` entfernt hatte. Davon waren bei weiteren Wiederholungen auch
`jsdom` und das lokale `tsx`/`esbuild`-Paar betroffen. Der anschließende Restore
traf auf einen bestätigten Windows-`EBUSY`-Lock in
`node_modules/css-tree/cjs/data-patch.cjs`; unbekannte laufende Prozesse wurden
bewusst nicht beendet.

Die 223 Node-Tests wurden mit `tsx` 4.22.4 und den gepinnten Dev-Abhängigkeiten
aus einer isolierten temporären Installation erneut ausgeführt und bestanden
vollständig. Die zehn Browsertests wurden entsprechend mit Playwright 1.61.1
gegen den aktuellen Produktions-Build ausgeführt und bestanden ebenfalls. Das
belegt Code- und Browserfunktion, ersetzt aber nicht den abschließenden CI-Lauf
mit frischem `npm ci`. Darum tragen die automatischen Gates bis zum erfolgreichen
Pull-Request-Lauf ein Sternchen und Phase 0 bleibt offen.

#### Audit-Ergebnis

Der erste Audit meldete drei transitive Befunde: `esbuild` (niedrig), `nanoid`
und `postcss` (hoch). Der kompatible Fix aktualisierte `nanoid` auf 3.3.18 und
`postcss` auf 8.5.26. Offen bleibt `esbuild` 0.27.7 über Vite 7.3.5. Ein
Major-Upgrade auf Vite 8 wird nicht ungeprüft erzwungen.

### P0.4 – Manuelle Produkt-Baseline

Eine vollständige Saison wird ohne Debug-URL und ohne Zustandsmanipulation
gespielt:

1. frischer League-Spielstand;
2. Team erstellen;
3. TDM auf Helix Canopy abschließen;
4. One Flag im Drowned Sun Temple abschließen;
5. Classic CTF im finalen Proving-Match abschließen;
6. Ergebnis-, Tabellen-, Unlock- und Teammanagerfluss prüfen;
7. Reload zwischen zwei Matches und nach Saisonabschluss prüfen;
8. Browserkonsole auf neue Fehler prüfen.

| Manuelles Gate | Status | Evidenz/Notiz |
| --- | --- | --- |
| Drei-Match-Saison vollständig | `PENDING` | – |
| Reload/Save stabil | `PENDING` | – |
| Keine neuen blockierenden Konsolenfehler | `PENDING` | – |
| Öffentliches Verhalten unverändert | `PENDING` | – |

### P0.5 – Abschluss und Wiederherstellbarkeit

- [ ] Alle automatischen Gates `PASS`.
- [ ] Alle manuellen Gates `PASS`.
- [ ] Roadmap und dieses Protokoll auf tatsächlichen Stand aktualisiert.
- [ ] Pull Request geprüft und in `main` integriert.
- [ ] GitHub-Pages-Deploy nach Merge erfolgreich.
- [ ] Baseline-Tag erst danach setzen und hier eintragen.

## Definition of Done

Phase 0 wechselt nur dann auf `COMPLETE`, wenn:

- sämtliche Kriterien der Roadmap belegt sind;
- kein geschütztes WIP im Diff oder Index liegt;
- keine unbeabsichtigte Produkt- oder Audioänderung enthalten ist;
- der Merge-Commit und der erfolgreiche Deploy dokumentiert sind;
- der Baseline-Tag auf dem abgenommenen `main`-Commit liegt.

## Änderungsprotokoll

| Datum | Änderung |
| --- | --- |
| 2026-08-28 | Phase-0-Plan angelegt, Ausgangsstand und WIP-Schutz dokumentiert, automatische und manuelle Gates vorbereitet. |
