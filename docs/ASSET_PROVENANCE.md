# Asset Provenance

Stand: 2026-07-13

Nach Angabe des Projekteigentuemers wurden die vorhandenen Spielassets mit
ChatGPT erzeugt. Fuer aeltere Assets liegen in diesem Repository derzeit keine
einzelnen Prompts oder Erstellungsdaten vor. Neue Assets werden ab jetzt hier
einzeln dokumentiert.

## `public/assets/league-menu-arena-v1.png`

- Erstellt: 2026-07-13
- Werkzeug: OpenAI ImageGen, eingebauter Generierungsmodus
- Abmessungen: 1672 x 941 Pixel
- Nachbearbeitung: keine; generierte PNG-Datei unveraendert in das Projekt
  uebernommen
- Einsatzzweck: Fullscreen-Hintergrund fuer Hauptmenue und League HQ

Prompt:

> Use case: stylized-concept. Asset type: fullscreen web arena game main-menu
> and league-hub background. Primary request: an original premium sci-fi
> industrial arena complex seen from an elevated wide cinematic viewpoint,
> suggesting competitive league play and a brutal fast arena below.
> Scene/backdrop: dark metallic foundry architecture, layered platforms,
> distant arena floor, subtle banners without symbols, atmospheric depth.
> Style/medium: polished game key art, grounded industrial realism with
> slightly stylized painted finish. Composition/framing: wide 16:9 landscape
> composition; strong environmental framing around the outer edges; calm
> low-detail negative space through the center and left-center for responsive
> HTML menu panels; no dominant character or focal object behind the UI.
> Lighting/mood: dramatic cool teal ambient light with restrained warm furnace
> glow and subtle red-versus-blue accent lights, competitive and prestigious
> rather than horror. Color palette: charcoal, deep teal, steel, muted rust,
> small controlled red and blue accents. Materials/textures: worn metal,
> concrete, light haze, restrained sparks, believable arena construction.
> Constraints: background art only; no text; no letters; no numbers; no logos;
> no emblems; no watermark; no recognizable copyrighted game design; no
> characters; no weapons; no UI panels; no fake interface elements. Avoid:
> clutter in the center, neon cyberpunk excess, bright saturated colors,
> fantasy castles, photoreal people, illegible signage.

## Neue Charakter-Spritesheets

Die Spritesheets `briarhorn-spritesheet-6x4.png`,
`ax9-mantis-spritesheet-6x4.png`, `null-courier-spritesheet-6x4.png`,
`aegis-vanguard-spritesheet-6x4.png`, `xeno-runner-spritesheet-6x4.png` und
`volt-hound-spritesheet-6x4.png`, `mirejaw-spritesheet-6x4.png`,
`scrapwing-spritesheet-6x4.png` und `prism-bastion-spritesheet-6x4.png` wurden
am 2026-07-13 mit dem eingebauten OpenAI-ImageGen-Modus erzeugt. Layout,
Nachbearbeitung und vollstaendige Prompt-Spezifikationen stehen in
`CHARACTER_ASSET_BATCH_2026-07-13.md`.

## League Branding

Die sechs Teamembleme unter `public/assets/league/teams/` und das zentrale
`public/assets/league/arena-league-emblem.png` wurden am 2026-07-13 mit dem
eingebauten OpenAI-ImageGen-Modus erzeugt. Alle Prompts, Abmessungen und
Nachbearbeitungsschritte stehen in
`LEAGUE_BRANDING_ASSET_BATCH_2026-07-13.md`.

## P1-C Banner-Pilotassets

Die folgenden Pilotassets wurden am 2026-07-14 mit dem eingebauten
OpenAI-ImageGen-Modus erzeugt und nicht aus externen Spielen uebernommen:

- `public/assets/core-relay-mast-pilot.png` (512x512 RGBA),
- `public/assets/core-relay-cloth-pilot-spritesheet-6x2.png`
  (1536x512 RGBA, 6x2 Zellen mit 256x256).

Referenzbilder waren ausschliesslich die bereits im Projekt vorhandenen
`core-relay-banner.png`.

Promptset:

> Core Relay Mast: Remove only the hanging white-and-gold cloth from the
> existing premium Core Relay banner. Reconstruct the hidden dark metal mast,
> gold brackets and cyan energy core. Keep the original top-down rendering,
> proportions and palette. Single centered sprite on a perfectly flat solid
> #ff00ff chroma-key background. No cloth, shadow, particles, text or watermark.

> Core Relay Cloth: Create exactly twelve cloth-only animation frames in a
> regular 6-column by 2-row grid, matching the existing white fabric, gold
> edging and centered cyan relay emblem. Row 1 trails left; row 2 trails right.
> Each row moves from calm through a restrained flutter and back. Identical
> scale and attachment anchor in every cell, flat #ff00ff background, no mast,
> shadows, labels, separators, particles or alternate designs.

Nachbearbeitung:

1. Chroma-Key-Entfernung mit dem offiziellen Imagegen-Helfer
   `remove_chroma_key.py`, Border-Autokey, Soft Matte und Despill.
2. Exakte Rasterung mit `scripts/normalize-generated-spritesheet.py`.
3. Mast mit `scripts/optimize-transparent-asset.py` auf 512x512 normalisiert.
4. Beide finalen PNGs wurden visuell und automatisiert auf Raster, RGBA-Typ und
   vollstaendige Zellen geprueft.

### Verworfener AX-9-Versuch

Ein AX-9-Special-Idle wurde ebenfalls mit ImageGen erzeugt und technisch
erprobt. Die menschliche Live-Abnahme am 2026-07-14 bewertete die Animation als
unklar und eher buggy. Das PNG wird nicht geladen, nicht staged und nicht als
Produktasset committed; ein Rollout auf weitere Charaktere findet nicht statt.
Die lokale untracked Quelle sowie Chroma-/Alpha-Zwischenquellen unter
`tmp/imagegen/` bleiben geschuetztes Arbeitsmaterial und keine Runtime-Dateien.
