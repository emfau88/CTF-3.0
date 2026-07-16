<div align="center">

# CORE ARENA

**Move fast. Read the arena. Win the objective.**

A desktop-first, browser-playable 2D top-down arena game built around movement,
aim, route knowledge, weapon control and objective pressure.

[**Play the current build**](https://emfau88.github.io/CTF-3.0/) ·
[Run locally](#quick-start) ·
[Explore the game](#what-you-can-play-today)

</div>

![Core Arena start screen](docs/screenshots/start-screen.jpg)

> [!NOTE]
> Core Arena is in active development. The current public experience is a
> single-player-versus-bots build with a complete Quick Play loop and the first
> three-match League circuit. Progress is stored locally in the browser.

## Vision

Core Arena is designed as a readable, skill-driven arena game: a match should
be understandable at a glance, but difficult to master. Movement, deliberate
jumps, aim, projectile timing, positioning, pickups, team commands and the
objective all compete for the player's attention.

The long-term goal is depth through execution and arena knowledge rather than
stat inflation. Fighter skins and wingman identities are cosmetic; every
fighter follows the same gameplay rules. A lightweight League layer gives
matches context without turning the arena into an RPG grind.

## What you can play today

### Quick Play

Configure a match, select an arena and fighter, and play from **1v1 through
4v4**. You control one fighter while every other slot is filled by bots.

| Mode | Objective | Match format |
| --- | --- | --- |
| **Team Deathmatch** | Win the elimination race | First to 10, 2-minute limit |
| **Classic CTF** | Steal and capture the enemy flag | First to 3, 3-minute limit |
| **One Flag** | Control the neutral objective | First to 3, 3-minute limit |

![Quick Play mode and flagship-arena selection](docs/screenshots/quick-play.jpg)

### League

Create a callsign and team identity, choose a captain skin and wingman, scout
the next rival, then compete through the **Proving Circuit**:

1. Team Deathmatch on Helix Canopy
2. One Flag in the Temple of the Drowned Sun
3. Classic CTF in the Temple final

League HQ tracks the four-team table, match performance and permanent cosmetic
wingman unlocks. Defeat a rival team to make its fighters available in Team
Manager. The Contender and Apex circuits are visible as honest future previews;
only the Proving Circuit is currently playable.

![League HQ with match dossier, squad and standings](docs/screenshots/league-hq.jpg)

## Flagship arenas

The current arena roster contains seven playable maps. **Helix Canopy** and
**Temple of the Drowned Sun** are the two flagship arenas and define the visual
and competitive quality target for future map work. The remaining arenas are
playable iteration and prototype spaces.

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/helix-canopy-gameplay.jpg" alt="Team Deathmatch gameplay on Helix Canopy"></td>
    <td width="50%"><img src="docs/screenshots/temple-drowned-sun-gameplay.jpg" alt="Classic Capture the Flag gameplay in the Temple of the Drowned Sun"></td>
  </tr>
  <tr>
    <td><strong>Helix Canopy</strong><br>A bright mirrored orbital biodome with clean lanes, readable flanks and a luminous central helix.</td>
    <td><strong>Temple of the Drowned Sun</strong><br>A darker tactical arena built around layered cover, distinct flank routes and jumpable cenotes.</td>
  </tr>
</table>

## Arena systems

- Fast directional movement, deliberate jumping and gap traversal
- Health, armor, respawns and short spawn protection
- Pickup-controlled **Rocket**, **Rail** and auto-targeting **Arc Lash** weapons
- Team commands for **Defend**, **Follow** and **Attack**
- Team rings, fighter outlines and a dedicated player marker for combat clarity
- Fullscreen support, scalable HUD, match feed and hold-to-view statistics
- Nine cosmetic fighter skins with identical gameplay rules
- Purpose-built bots with mode-aware objectives, navigation and combat behavior

## Controls

| Input | Action |
| --- | --- |
| `WASD` | Move |
| Mouse | Aim |
| `Space` | Jump |
| `Q` | Fire Rocket when available |
| `E` | Fire Rail when available |
| `F` | Use Arc Lash when available |
| `1` / `2` / `3` | Defend / Follow / Attack squad command |
| Hold `Tab` | Match statistics |
| `M` | Pause and match menu |

Core Arena is developed desktop-first. A landscape touch interface exists as
an experimental secondary control path, but desktop keyboard and mouse remain
the primary target.

## Technology

- **TypeScript 5.8**
- **Phaser 3.90** for browser rendering and scene integration
- **Vite 7** for local development and production builds
- A framework-neutral gameplay core separated from Phaser rendering, input and
  audio adapters
- Node-based automated gameplay, UI, map-quality and bot-simulation tests

## Quick start

Requirements: a current Node.js installation and npm.

```bash
git clone https://github.com/emfau88/CTF-3.0.git
cd CTF-3.0
npm install
npm run dev
```

Open [http://127.0.0.1:5173/CTF-3.0/](http://127.0.0.1:5173/CTF-3.0/).

### Validation

```bash
npm test
npm run test:typecheck
npm run build
```

## Current direction

Development is focused on:

- bringing future arenas up to the Helix and Temple quality bar
- expanding League progression beyond the Proving Circuit
- deepening presentation and usability without sacrificing visible map space
- continuing bot, responsive-layout and experimental touch-control refinement

Online multiplayer, local PvP, account services and cloud saves are not part of
the current playable build.
