# Foundry Circuit Rebuild Target V1

- Created: 2026-07-18
- Tool path: built-in Imagegen
- Purpose: pre-greybox art-direction and layout mockup, not a runtime master
- Output: `foundry-circuit-rebuild-target-v1.png` (`1915x821`)

## References

The following existing assets were used only as material, lighting, and shape
references. The result is a newly generated integrated composition rather than
an asset collage.

- `public/assets/industrial/base-blue.png`
- `public/assets/industrial/base-red.png`
- `public/assets/industrial/floor-metal.png`
- `public/assets/industrial/maintenance-pit.png`
- `public/assets/industrial/energy-junction.png`

## Initial generation prompt

```text
Use case: stylized-concept
Asset type: pre-greybox art-direction and layout target mockup for a premium top-down arena map; this is a planning concept, not the final runtime master.
Primary request: Create one epic, cohesive, complete science-fiction industrial foundry arena called Foundry Circuit, composed as a single integrated wide arena image rather than an asset collage.
Input images: Image 1 and Image 2 are material, lighting, and blue/red base-design references only; Image 3 is the graphite metal floor material reference; Image 4 is the maintenance-pit reference; Image 5 is the embedded energy-junction machinery reference. Reinterpret them into one coherent premium arena.
Composition/framing: strict 90-degree orthographic top-down view, approximately 2.33:1 panoramic arena proportions, entire arena and outer frame visible, horizontally mirrored gameplay geometry. Blue base on the far left and red base on the far right, equal visual size, each with three broad readable exits.
Layout contract: the shortest central route is the Forge Heart, a broad embedded molten-energy crucible chamber with four entrances and offset low cover that blocks any direct base-to-base shot. The upper route is a longer precision lane with segmented blast shields and a risky open control zone near its center, but sightlines are repeatedly interrupted. The lower route is a longer protected coolant works route with broad combat bays, lateral exits, and machinery along the unplayable outer edge; never a narrow splash corridor. Place two small maintenance pits near the upper-to-center exchange points, with obvious safe walking detours; imply optional jump shortcuts without arrows. Use roughly 20–24 low, compact, orthogonal cover islands from one consistent blast-shield silhouette family. Keep all walkable lanes unmistakably clear and connected.
Scene/backdrop: colossal active orbital steelworks, brushed steel decks, recessed coolant channels, forge machinery, turbines, pipes, restrained molten light beneath protected grates, decorative industrial machinery outside the playable border.
Style/medium: premium cohesive hand-painted 3D game arena master concept, high production value, crisp gameplay readability, visually dramatic but uncluttered.
Lighting/mood: controlled furnace glow at the center and outer machinery, cool cyan coolant accents, strong but restrained material definition, calm playable floor.
Color palette: graphite, dark gunmetal, brushed steel, furnace amber and orange, cyan coolant; saturated blue and red only at the team bases.
Materials/textures: metal panels, low armored blast shields, inset conduits, protected grates, narrow contact shadows.
Constraints: exact top-down orthographic view; no perspective tilt; no characters; no flags; no pickups; no weapons; no UI; no labels; no arrows; no text; no logo; no watermark. No apparent second floor, no elevated bridge crossing another route, no tall walls or pillars inside gameplay, no misleading decorative objects that look collidable, no smoke or fire obscuring walkable floor. Every visible gameplay obstacle must have a clear solid top, a compact side edge, and a tight contact shadow. Decoration belongs only in recessed floor inlays or outside the playable border. Preserve left-right gameplay symmetry while allowing small non-gameplay art asymmetry.
```

## Final refinement prompt

```text
Use case: precise-object-edit
Asset type: revised pre-greybox top-down arena target mockup.
Primary request: Refine this exact Foundry Circuit concept for much clearer competitive gameplay readability.
Edit target: Image 1 is the complete target image. Preserve its panoramic frame, strict top-down camera, blue and red base designs, material quality, graphite/amber/cyan palette, industrial edge machinery, and overall premium rendering.
Required changes only:
1. Reduce the interior cover count to roughly 20–22 coherent low blast-shield islands. Remove the scattered tiny blocks that make the floor look noisy.
2. Make three unmistakable left-to-right route bands: a broad upper precision lane, a short central Forge Heart lane, and a broad lower coolant lane. Each route must remain connected through two clear exchange zones on each half.
3. Replace the tall-looking central orange forge structure with a large FLAT recessed octagonal furnace-energy inlay embedded in the floor. It may glow beneath a protected grate, but must not look elevated or collidable. Surround it with only four low offset blast shields, leaving four broad entrances.
4. Keep exactly two small maintenance pits, mirrored in the upper route near the central exchange points, each with obvious walk-around space.
5. Widen every major passage and remove accidental dead ends. Keep repeated sightline breakers, but no obstacle should dominate two routes simultaneously.
6. Make all active cover share one low orthogonal silhouette family with clear tops, compact side edges, and tight shadows.
Constraints: Preserve strict 90-degree orthographic top-down view and left-right gameplay symmetry. No characters, flags, pickups, weapons, UI, text, labels, arrows, logo, watermark, tall interior walls, second floor, bridges, smoke, or floor-obscuring effects. Do not change the two bases or the outer industrial frame except where necessary to connect the cleaned lanes.
```
