# Screeps TypeScript Bot

## Build & Deploy

```bash
npm run build          # compile only, no upload
npm run push-main      # compile + upload to 'main' branch
npm run watch-main     # compile + upload on file change
```

Always run `npx tsc --noEmit` before pushing to catch type errors.

## Project Structure

```
src/
  main.ts              — main loop: wires all managers and roles together
  roles/
    miner.ts           — sits on source container, harvests every tick (never moves)
    hauler.ts          — collects energy from containers, delivers to spawn/extensions/storage
    upgrader.ts        — withdraws from controller container, upgrades controller
    builder.ts         — withdraws from source containers, builds construction sites
  managers/
    spawn.ts           — decides what to spawn, scales bodies to available energy
    tower.ts           — attacks hostiles, heals creeps, repairs structures
    roads.ts           — places road sites spawn→sources→controller (once per room)
    containers.ts      — places container sites at sources and controller (once per room)
    extensions.ts      — places extension sites when RCL increases
  utils/
    ErrorMapper.ts     — maps runtime errors back to TypeScript source lines
```

## Role System

Each creep has `memory.role` and `memory.working` (true = spending energy, false = collecting).

| Role | Collect from | Deliver to |
|------|-------------|------------|
| miner | source (directly) | container at source |
| hauler | source containers / dropped energy | spawn, extensions, storage |
| upgrader | controller container | controller |
| builder | source containers | construction sites |

Miners are assigned a specific source via `memory.sourceId` at spawn time.

## Spawn Targets

| Role | Count | Body scaling |
|------|-------|-------------|
| miner | 1 per source | max WORK + 1 MOVE (up to 5 WORK) |
| hauler | 2 per source | [CARRY, CARRY, MOVE] units |
| upgrader | 2 | [WORK, CARRY, MOVE] units, max 4x |
| builder | 1 (if sites exist) | [WORK, CARRY, MOVE] units, max 4x |

Bootstrap protection: if miners = 0, an emergency [WORK, CARRY, MOVE] miner spawns immediately regardless of energy.

## Room Memory Flags

| Key | Purpose |
|-----|---------|
| `roadsPlanned` | Roads have been placed, don't re-run |
| `containersPlanned` | Containers have been placed, don't re-run |
| `lastExtensionRCL` | Last RCL at which extensions were placed |

## Config Files

- `screeps.json` — auth token and upload target (gitignored, copy from `screeps.sample.json`)
- `rollup.config.mjs` — bundler config
- `tsconfig.json` — TypeScript config (target: es2019, lib: es2019 + dom)
