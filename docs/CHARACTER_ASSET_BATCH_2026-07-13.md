# Character Asset Batch - 2026-07-13

Alle neun Spritesheets wurden mit dem eingebauten OpenAI-ImageGen-Modus
erzeugt. Als Stil- und Layouthilfe dienten die bestehenden Sheets
`alien-runner-spritesheet-4x4.png` und `riot-droid-spritesheet-6x4.png`.

Die generierten 1536-x-1024-Chroma-Sheets wurden mit dem offiziellen
ImageGen-Chroma-Key-Helfer freigestellt und hochwertig auf 768 x 512 Pixel
verkleinert. Das Ergebnis besitzt 24 Frames mit jeweils 128 x 128 Pixeln.

## Gemeinsames Layout

- Reihe 1: Blickrichtung unten
- Reihe 2: Blickrichtung rechts
- Reihe 3: Blickrichtung oben
- Reihe 4: Blickrichtung links
- Spalte 1: Idle
- Spalten 2 bis 5: vier aufeinanderfolgende Laufphasen
- Spalte 6: Jump

## Briarhorn

Projektdatei: `public/assets/briarhorn-spritesheet-6x4.png`

Prompt:

> Use case: stylized-concept. Asset type: production-ready 2D top-down arena
> game character spritesheet. Input images: Image 1 and Image 2 are style,
> scale, camera-angle, spacing, and grid-layout references only; create a
> completely new original character. Primary request: create a single exact
> 6-column by 4-row spritesheet for an original fantasy arena fighter named
> Briarhorn. Subject: compact bipedal forest-and-stone creature, broad curved
> dark horns, chunky bark and slate armor, powerful arms, low stable center of
> gravity, one bright cyan chest core, bold readable silhouette, no weapon.
> Style/medium: polished hand-painted 2D game sprite, slightly chibi
> proportions, same moderate detail and top-down three-quarter camera as the
> references, crisp readable shapes at 128x128 gameplay size, not pixel art.
> Grid semantics: row 1 faces down/toward camera; row 2 faces right; row 3
> faces up/away; row 4 faces left. In every row column 1 is neutral idle,
> columns 2-5 form four consecutive smooth running poses with alternating foot
> contacts, column 6 is a compact airborne jump pose. Composition/framing:
> exactly 24 separate full-body frames in a precise uniform 6x4 grid; every
> frame centered in an identical cell; identical character scale and camera
> angle; feet/body anchor at the same coordinates in every cell; generous
> internal padding; no cropped horns or limbs; no dividers. Color palette:
> charcoal stone, deep brown bark, muted moss, controlled cyan glow; do not use
> magenta. Scene/backdrop: perfectly flat solid #ff00ff chroma-key background
> covering the complete canvas. Constraints: exactly 6 columns and exactly 4
> rows; exactly one character per cell; consistent identity, proportions, horn
> shape, armor and colors in all 24 frames; direction and motion must be
> immediately readable; flat uniform background with no shadows, gradients,
> texture, floor, reflections, grid lines, text, labels, logos, weapons,
> particles, foliage debris or watermark. Avoid: extra frames, missing frames,
> decorative borders, perspective drift, size drift, changing costume,
> jittering body center, photorealism, excessive detail, thin fragile
> appendages.

## AX-9 Mantis

Projektdatei: `public/assets/ax9-mantis-spritesheet-6x4.png`

Prompt:

> Use case: stylized-concept. Asset type: production-ready 2D top-down arena
> game character spritesheet. Input images: Image 1 and Image 2 are style,
> scale, camera-angle, spacing, and grid-layout references only; create a
> completely new original character. Primary request: create a single exact
> 6-column by 4-row spritesheet for an original compact arena combat mech named
> AX-9 Mantis. Subject: sturdy bipedal mech with a bold triangular shoulder
> silhouette, one large horizontal cyan visor, compact armored torso, powerful
> articulated mechanical legs, slightly asymmetrical forearms with one subtle
> integrated targeting module, large clean armor plates, no handheld weapon.
> Style/medium: polished hand-painted 2D game sprite, slightly chibi
> proportions, same moderate detail and top-down three-quarter camera as the
> references, crisp readable shapes at 128x128 gameplay size, not pixel art.
> Grid semantics: row 1 faces down/toward camera; row 2 faces right; row 3
> faces up/away; row 4 faces left. In every row column 1 is neutral idle,
> columns 2-5 form four consecutive smooth running poses with alternating foot
> contacts and mechanical weight shift, column 6 is a compact airborne jump
> pose. Composition/framing: exactly 24 separate full-body frames in a precise
> uniform 6x4 grid; every frame centered in an identical cell; identical
> character scale and camera angle; feet/body anchor at the same coordinates
> in every cell; generous internal padding; no cropped armor or limbs; no
> dividers. Color palette: matte gunmetal and graphite, muted ivory armor
> panels, restrained orange warning accents, bright cyan visor and reactor; do
> not use magenta. Scene/backdrop: perfectly flat solid #ff00ff chroma-key
> background covering the complete canvas. Constraints: exactly 6 columns and
> exactly 4 rows; exactly one character per cell; consistent identity,
> proportions, visor, armor and colors in all 24 frames; direction and motion
> must be immediately readable; flat uniform background with no shadows,
> gradients, texture, floor, reflections, grid lines, text, labels, logos,
> handheld weapons, muzzle effects, particles or watermark. Avoid: extra
> frames, missing frames, decorative borders, perspective drift, size drift,
> changing machinery, jittering body center, thin antennae, tiny greebles,
> photorealism, excessive detail.

## Null Courier

Projektdatei: `public/assets/null-courier-spritesheet-6x4.png`

Prompt:

> Use case: stylized-concept. Asset type: production-ready 2D top-down arena
> game character spritesheet. Input images: Image 1 and Image 2 are style,
> scale, camera-angle, spacing, and grid-layout references only; create a
> completely new original character. Primary request: create a single exact
> 6-column by 4-row spritesheet for an original floating void arena fighter
> named Null Courier. Subject: compact levitating entity made from a solid dark
> mask, bright narrow cyan face slit, three large segmented mantle armor
> plates, two substantial armored forearms, stable tapered energy tail instead
> of legs, one clear forward-pointing shoulder fin that makes facing direction
> obvious; entirely opaque shapes, no handheld weapon. Style/medium: polished
> hand-painted 2D game sprite, slightly chibi proportions, same moderate detail
> and top-down three-quarter camera as the references, crisp readable shapes at
> 128x128 gameplay size, not pixel art. Grid semantics: row 1 faces down/toward
> camera; row 2 faces right; row 3 faces up/away; row 4 faces left. In every row
> column 1 is neutral hovering idle, columns 2-5 form four consecutive smooth
> gliding poses with alternating mantle tilt and arm swing, column 6 is a
> compact airborne surge/jump pose with armor drawn inward.
> Composition/framing: exactly 24 separate full-body frames in a precise
> uniform 6x4 grid; every frame centered in an identical cell; identical
> character scale and camera angle; body anchor at the same coordinates in
> every cell; generous internal padding; no cropped armor or tail; no dividers.
> Color palette: near-black and deep navy armor, muted cool-gray edges,
> restrained pale gold fasteners, bright cyan face and energy core; do not use
> magenta, purple, smoke, transparency or soft glow outside the silhouette.
> Scene/backdrop: perfectly flat solid #ff00ff chroma-key background covering
> the complete canvas. Constraints: exactly 6 columns and exactly 4 rows;
> exactly one character per cell; consistent identity, proportions, mask,
> mantle, tail and colors in all 24 frames; direction and motion must be
> immediately readable; flat uniform background with no shadows, gradients,
> texture, floor, reflections, grid lines, text, labels, logos, handheld
> weapons, particles, trails or watermark. Avoid: extra frames, missing frames,
> decorative borders, perspective drift, size drift, changing costume,
> jittering body center, wispy semitransparent effects, tiny floating
> fragments, photorealism, excessive detail.

## Aegis Vanguard

Projektdatei: `public/assets/aegis-vanguard-spritesheet-6x4.png`

Prompt:

> Use case: stylized-concept. Asset type: production-ready 2D top-down arena
> game character spritesheet. Input images: use the existing character sheets
> only as references for camera angle, gameplay scale, spacing and grid
> discipline; create a completely new original character. Primary request:
> create one exact 6-column by 4-row spritesheet for an original human sci-fi
> arena trooper named Aegis Vanguard. Subject: compact heavily armored human,
> broad ivory composite shoulder plates, deep navy flexible undersuit, chunky
> reinforced boots and gauntlets, sealed helmet with one narrow amber visor,
> restrained orange safety accents, strong heroic silhouette, no handheld
> weapon, no resemblance to a recognizable copyrighted soldier design.
> Style/medium: polished hand-painted 2D game sprite, slightly chibi
> proportions, moderate detail, top-down three-quarter camera, crisp readable
> shapes at 128x128 gameplay size, not pixel art. Grid semantics: row 1 faces
> down/toward camera; row 2 faces right; row 3 faces up/away; row 4 faces left.
> In every row column 1 is neutral idle, columns 2-5 are four consecutive
> smooth running poses with clear alternating foot contacts and armored weight,
> column 6 is a compact airborne jump pose. Composition/framing: exactly 24
> separate full-body frames in a precise uniform 6x4 grid; identical scale and
> camera in every cell; stable body anchor; generous padding; no cropped armor,
> no dividers. Scene/backdrop: perfectly flat solid #ff00ff chroma-key across
> the complete canvas. Constraints: one character per cell; consistent armor,
> proportions, visor and colors; immediately readable direction and motion;
> no shadows, gradients, floor, text, logos, insignia, particles or watermark.
> Avoid: extra or missing frames, borders, perspective drift, size drift,
> changing equipment, jittering body center, thin fragile details,
> photorealism, excessive greebles.

## Xeno Runner

Projektdatei: `public/assets/xeno-runner-spritesheet-6x4.png`

Kompatibilitaet: Die bisherige Laufzeit-ID `alien-runner` bleibt fuer alte
Links und lokale Einstellungen erhalten, zeigt jetzt aber auf Xeno Runner.

Prompt:

> Use case: stylized-concept. Asset type: production-ready 2D top-down arena
> game character spritesheet. Input images: use the existing character sheets
> only as references for camera angle, gameplay scale, spacing and grid
> discipline; redesign the old alien idea as a new original high-quality
> character. Primary request: create one exact 6-column by 4-row spritesheet
> for an agile alien arena fighter named Xeno Runner. Subject: compact athletic
> biomechanical humanoid, large swept blade-shaped head carapace, one bright
> cyan eye/visor, narrow waist, powerful digitigrade legs, substantial readable
> forearms, short stabilizing tail, no weapon, unmistakably alien silhouette.
> Style/medium: polished hand-painted 2D game sprite, slightly chibi
> proportions, moderate detail, top-down three-quarter camera, crisp readable
> shapes at 128x128 gameplay size, not pixel art. Grid semantics: row 1 faces
> down/toward camera; row 2 faces right; row 3 faces up/away; row 4 faces left.
> In every row column 1 is neutral idle, columns 2-5 are four consecutive fast
> running poses with alternating contacts and forward lean, column 6 is a
> compact airborne jump pose. Composition/framing: exactly 24 separate
> full-body frames in a precise uniform 6x4 grid; identical scale and camera;
> stable body anchor; generous padding; no cropped head, tail or limbs; no
> dividers. Color palette: desaturated jade-gray carapace, dark graphite joints,
> small muted copper details and controlled cyan energy. Scene/backdrop:
> perfectly flat solid #ff00ff chroma-key across the complete canvas.
> Constraints: one character per cell; consistent anatomy, carapace, eye and
> colors; immediately readable direction and motion; no shadows, gradients,
> floor, text, logos, weapon, particles, trails or watermark. Avoid: extra or
> missing frames, perspective drift, size drift, changing anatomy, jittering
> center, thin antennae, gore, photorealism, excessive detail.

## Volt Hound

Projektdatei: `public/assets/volt-hound-spritesheet-6x4.png`

Prompt:

> Use case: stylized-concept. Asset type: production-ready 2D top-down arena
> game character spritesheet. Input images: use the existing character sheets
> only as references for camera angle, gameplay scale, spacing and grid
> discipline; create a completely new original character. Primary request:
> create one exact 6-column by 4-row spritesheet for an original quadrupedal
> biomechanical arena creature named Volt Hound. Subject: compact four-legged
> armored cyber-beast, low powerful stance, wedge-shaped head, two sturdy swept
> sensor fins, bright cyan face slit and spine conduits, broad mechanical paws,
> segmented dark armor with restrained rust-red panels, no rider and no weapon,
> silhouette radically different from every humanoid skin. Style/medium:
> polished hand-painted 2D game sprite, slightly chibi proportions, moderate
> detail, top-down three-quarter camera, crisp readable shapes at 128x128
> gameplay size, not pixel art. Grid semantics: row 1 faces down/toward camera;
> row 2 faces right; row 3 faces up/away; row 4 faces left. In every row column
> 1 is a stable idle crouch, columns 2-5 are four consecutive smooth gallop
> poses with readable leg sequencing and body compression, column 6 is a
> compact airborne leap. Composition/framing: exactly 24 separate full-body
> frames in a precise uniform 6x4 grid; identical scale and camera; stable torso
> anchor; generous padding; no cropped fins, paws or tail; no dividers.
> Scene/backdrop: perfectly flat solid #ff00ff chroma-key across the complete
> canvas. Constraints: one creature per cell; consistent armor, anatomy, face
> slit and colors; immediately readable direction and motion; no shadows,
> gradients, floor, text, logos, particles or watermark. Avoid: extra or
> missing frames, perspective drift, size drift, changing leg count, jittering
> body center, thin fragile parts, organic gore, photorealism, excessive detail.

## Mirejaw

Projektdatei: `public/assets/mirejaw-spritesheet-6x4.png`

Prompt:

> Use case: stylized-concept. Asset type: production-ready 2D top-down arena
> game character spritesheet. Primary request: create one exact 6-column by
> 4-row spritesheet for a completely original amphibious arena brute named
> Mirejaw. Subject: compact broad bipedal toad-and-crocodile alien, huge
> powerful forearms and hands, short neck, low heavy center of gravity, sturdy
> short legs, a few large readable dorsal toxin chambers glowing sulfur
> yellow, blunt armored brow, no handheld weapon, no gore. Style/medium:
> polished hand-painted 2D game sprite, slightly chibi proportions, moderate
> detail, top-down three-quarter camera, crisp clean shapes readable at 128x128
> gameplay size, not pixel art. Grid semantics: row 1 faces down/toward camera;
> row 2 faces right; row 3 faces up/away; row 4 faces left. In every row column
> 1 is neutral idle, columns 2-5 form four consecutive smooth heavy running
> poses with clearly alternating foot contacts and arm swing, column 6 is a
> compact explosive frog-like airborne jump pose. Composition/framing: exactly
> 24 separate full-body frames in a precise uniform 6x4 grid; every frame
> centered in an identical cell; identical character scale and camera angle;
> stable torso/body anchor; generous internal padding; no cropped limbs or
> chambers; no dividers. Color palette: dark swamp green skin, charcoal natural
> armor, muted brown leather details, sulfur-yellow toxin glow; do not use
> magenta. Scene/backdrop: perfectly flat solid #ff00ff chroma-key background
> covering the entire canvas. Constraints: exactly 6 columns and 4 rows,
> exactly one character per cell, consistent identity, anatomy, colors and
> proportions in all 24 frames; direction and movement immediately readable;
> background one uniform color with no shadows, gradients, texture, floor,
> reflections, grid lines, text, labels, logos, particles or watermark. Avoid:
> extra or missing frames, borders, perspective drift, scale drift, changing
> anatomy, jittering center, thin appendages, translucent effects,
> photorealism, excessive detail.

## Scrapwing

Projektdatei: `public/assets/scrapwing-spritesheet-6x4.png`

Prompt:

> Use case: stylized-concept. Asset type: production-ready 2D top-down arena
> game character spritesheet. Primary request: create one exact 6-column by
> 4-row spritesheet for a completely original avian desert arena raider named
> Scrapwing. Subject: compact upright alien bird fighter with powerful
> digitigrade legs and broad taloned feet, short armored beak helmet, thick
> feather collar, two large folded armored wing-arms built from a few sturdy
> readable segments, weathered belt and light scavenger armor, no handheld
> weapon, no thin loose feathers. Style/medium: polished hand-painted 2D game
> sprite, slightly chibi proportions, moderate detail, top-down three-quarter
> camera, crisp clean shapes readable at 128x128 gameplay size, not pixel art.
> Grid semantics: row 1 faces down/toward camera; row 2 faces right; row 3 faces
> up/away; row 4 faces left. In every row column 1 is neutral alert idle,
> columns 2-5 form four consecutive smooth springy running poses with clear
> alternating foot contacts and folded-wing counter-motion, column 6 is a
> compact airborne jump pose with one restrained partial wing flare.
> Composition/framing: exactly 24 separate full-body frames in a precise
> uniform 6x4 grid; every frame centered in an identical cell; identical
> character scale and camera angle; stable torso/body anchor; generous internal
> padding; no cropped beak, wings, legs or feet; no dividers. Color palette:
> sand and charcoal plumage, black armor, muted rust red wing panels, aged brass
> fasteners; small warm amber eye; do not use magenta. Scene/backdrop: perfectly
> flat solid #ff00ff chroma-key background covering the entire canvas.
> Constraints: exactly 6 columns and 4 rows, exactly one character per cell,
> consistent identity, anatomy, armor, colors and proportions in all 24 frames;
> direction and movement immediately readable; background one uniform color
> with no shadows, gradients, texture, floor, reflections, grid lines, text,
> labels, logos, particles or watermark. Avoid: extra or missing frames,
> borders, perspective drift, scale drift, changing costume, jittering center,
> thin feathers, sprawling wings, translucent effects, photorealism, excessive
> detail.

## Prism Bastion

Projektdatei: `public/assets/prism-bastion-spritesheet-6x4.png`

Prompt:

> Use case: stylized-concept. Asset type: production-ready 2D top-down arena
> game character spritesheet. Primary request: create one exact 6-column by
> 4-row spritesheet for a completely original living crystal-and-stone arena
> construct named Prism Bastion. Subject: compact massive golem made from a few
> large charcoal stone slabs and asymmetrical deep cobalt crystal plates, one
> arm deliberately larger and heavier than the other, short powerful legs,
> head formed by two blunt stone plates around one warm golden floating core,
> no face, no handheld weapon, no tiny floating fragments. Style/medium:
> polished hand-painted 2D game sprite, slightly chibi proportions, moderate
> detail, top-down three-quarter camera, crisp clean shapes readable at 128x128
> gameplay size, not pixel art. Grid semantics: row 1 faces down/toward camera;
> row 2 faces right; row 3 faces up/away; row 4 faces left. In every row column
> 1 is neutral grounded idle, columns 2-5 form four consecutive smooth weighty
> running poses with clearly alternating foot contacts and shifting
> asymmetrical shoulders, column 6 is a compact airborne meteor-like jump pose
> with limbs drawn inward. Composition/framing: exactly 24 separate full-body
> frames in a precise uniform 6x4 grid; every frame centered in an identical
> cell; identical character scale and camera angle; stable torso/body anchor;
> generous internal padding; no cropped crystals or limbs; no dividers. Color
> palette: charcoal stone, deep cobalt-blue opaque crystal, muted slate edges,
> controlled warm gold core and hairline accents; do not use magenta or purple.
> Scene/backdrop: perfectly flat solid #ff00ff chroma-key background covering
> the entire canvas. Constraints: exactly 6 columns and 4 rows, exactly one
> character per cell, consistent identity, asymmetry, stone/crystal arrangement,
> colors and proportions in all 24 frames; direction and movement immediately
> readable; all character materials opaque; background one uniform color with
> no shadows, gradients, texture, floor, reflections, grid lines, text, labels,
> logos, particles or watermark. Avoid: extra or missing frames, borders,
> perspective drift, scale drift, changing crystal layout, jittering center,
> translucent glass, glow outside silhouette, floating debris, thin crystal
> needles, photorealism, excessive detail.

## Xeno Runner Direction Revision

Projektdatei: `public/assets/xeno-runner-spritesheet-6x4.png`

Werkzeug: eingebauter OpenAI-ImageGen-Modus mit dem vorherigen Xeno-Sheet als
Bildreferenz. Generierte Quellen:

- `exec-3cae19b0-4a72-4dc1-8fcf-c6b466a44b98.png`
- `exec-72e90ad3-8625-4e57-8c9e-19d8b2a02503.png`

Edit-Prompt:

> Edit the provided Xeno Runner game sprite sheet, preserving the exact same
> character identity, pale mint alien armor, cyan eye, compact readable
> top-down arena-game style, shading quality, and transparent background.
> Preserve an exact 6 columns by 4 rows sprite-sheet grid with 24 isolated
> frames and generous transparent margins; every frame must remain centered in
> its own equal cell and must not touch neighboring cells. Rows must be
> strictly cardinal and visually unmistakable: row 1 faces straight DOWN
> toward camera, row 2 faces straight RIGHT, row 3 faces straight UP away from
> camera with a centered true rear view (not three-quarter or diagonal), row 4
> faces straight LEFT. Columns: 1 idle, 2-5 four smooth walk-cycle phases, 6
> jump. Fix directional consistency especially the entire UP row and every
> jump frame: jump pose must face the same row direction, never the opposite
> direction. Keep torso/feet visual anchor stable across walk frames to
> eliminate jitter. No text, labels, grid lines, shadows outside frames,
> background, extra characters, duplicated limbs, or perspective camera
> changes.

Chroma-Prompt:

> Preserve this exact revised Xeno Runner 6-column by 4-row sprite sheet,
> character design, poses, cardinal directions, spacing, and frame alignment.
> Change only the background: replace the entire checkerboard pattern with one
> perfectly flat solid chroma key color #ff00ff (RGB 255, 0, 255), with crisp
> clean character edges and absolutely no checkerboard, shadows, grid lines,
> labels, text, or other background marks. Keep the same 3:2 overall sheet
> aspect ratio, all 24 isolated frames, and generous solid-magenta separation
> between frames.

Nachbearbeitung: Magenta-Key mit dem offiziellen
`remove_chroma_key.py`-Helper entfernt; 24 zusammenhaengende Figuren maschinell
erkannt, einzeln proportional normalisiert und in transparente 128-x-128-
Zellen mit gemeinsamem Bodenanker gesetzt. Dadurch koennen keine Pixel einer
Nachbarzeile in einen Phaser-Frame bluten.

## Technische Abnahme

- Alle neun finalen Dateien sind 768 x 512 Pixel gross und verwenden RGBA.
- Alle 24 Zellen je Sheet enthalten sichtbare Pixel.
- Die Alpha-Bounding-Box jeder Figur wurde pro 128-x-128-Zelle mechanisch
  zentriert; maximale Abweichung vom Zellzentrum: 1 Pixel.
- Aktive Auswahl: Briarhorn, AX-9 Mantis, Null Courier, Aegis Vanguard,
  Xeno Runner, Volt Hound, Mirejaw, Scrapwing und Prism Bastion.
- Aeltere Skin-Dateien bleiben vorerst nur als Rollback-Material im Repository,
  werden aber weder geladen noch in Quick Play oder League HQ angeboten.
