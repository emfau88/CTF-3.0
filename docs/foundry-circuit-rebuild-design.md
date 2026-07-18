# Foundry Circuit Premium Rebuild

## Product contract

Foundry Circuit is rebuilt as the third premium arena while retaining its
existing product ID, display name and Quick Play position. The previous map
remains recoverable through Git history until the rebuild has passed every
gate.

- Primary balance target: 1v1 and 2v2
- Density target: 3v3
- Technical support: 4v4 with eight safe spawn slots
- Modes: Team Deathmatch, Classic CTF and One Flag
- World: 2440 x 1046 units
- Presentation: one integrated top-down master image
- Engine additions: none

## Route roles

1. **Forge Heart** is the shortest route. Four low shields block direct base
   and objective fire while leaving four broad entries around a flat recessed
   smelter landmark.
2. **Precision Deck** is the longer upper route. Repeated low sight-line
   breakers protect spawns and the objective. Two maintenance pits provide
   optional authored jumps with normal walk-around routes.
3. **Coolant Works** is the longer protected route. Staggered cover forms broad
   splash-combat bays with side exits rather than a forced corridor.

## Gameplay rules

- No spawn-to-spawn or spawn-to-objective sight line.
- Rail remains exposed on the upper route and cannot see the objective.
- Rockets remain in the lower route without a direct objective spam line.
- Health supports route re-entry; Armor rewards the Forge exchanges.
- The neutral objective has at least 120 units of clearance.
- Gameplay geometry, pickups and jump links remain horizontally mirrored.
- Every collision rectangle lies inside visible integrated cover or the outer
  decorative foundry rim.

## Bot comparison gate

The rebuilt map must run the same controller and simulation matrix as the
non-premium maps. Longer Foundry-specific scenarios track physical stationary
time, movement-intent stalls, path misses and authored jump completion. Art is
not accepted as the cause of an improvement until the new geometry passes the
same deterministic bot inputs.

## Visual source

The approved direction is
`docs/concepts/foundry-circuit-rebuild-target-v2.png`. It defines the material,
outer machinery, team pads and Forge Heart. Collision remains governed by the
tested map data and is traced inside the final integrated master.
