// Search radius around spawn to look for valid extension positions
const SEARCH_RADIUS = 5;

function countExtensions(room: Room): { built: number; sites: number } {
  const built = room.find(FIND_MY_STRUCTURES, {
    filter: s => s.structureType === STRUCTURE_EXTENSION
  }).length;

  const sites = room.find(FIND_MY_CONSTRUCTION_SITES, {
    filter: s => s.structureType === STRUCTURE_EXTENSION
  }).length;

  return { built, sites };
}

function maxExtensionsAtRCL(rcl: number): number {
  return (CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION] as Record<number, number>)[rcl] ?? 0;
}

function isValidExtensionPos(room: Room, x: number, y: number): boolean {
  // Stay within room bounds (walls are at 0 and 49)
  if (x <= 0 || x >= 49 || y <= 0 || y >= 49) return false;

  const terrain = room.getTerrain().get(x, y);
  if (terrain === TERRAIN_MASK_WALL) return false;

  const pos = new RoomPosition(x, y, room.name);
  const hasStructure = pos.lookFor(LOOK_STRUCTURES).length > 0;
  const hasSite = pos.lookFor(LOOK_CONSTRUCTION_SITES).length > 0;

  return !hasStructure && !hasSite;
}

function findExtensionPositions(spawn: StructureSpawn, count: number): RoomPosition[] {
  const { room, pos } = spawn;
  const positions: RoomPosition[] = [];

  // Spiral outward from the spawn looking for valid tiles
  for (let radius = 2; radius <= SEARCH_RADIUS && positions.length < count; radius++) {
    for (let dx = -radius; dx <= radius && positions.length < count; dx++) {
      for (let dy = -radius; dy <= radius && positions.length < count; dy++) {
        // Only check the perimeter of each radius ring
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const x = pos.x + dx;
        const y = pos.y + dy;
        if (isValidExtensionPos(room, x, y)) {
          positions.push(new RoomPosition(x, y, room.name));
        }
      }
    }
  }

  return positions;
}

export function runExtensionPlanner(room: Room): void {
  const controller = room.controller;
  if (!controller) return;

  const rcl = controller.level;

  // Re-plan whenever RCL increases
  if (room.memory.lastExtensionRCL === rcl) return;

  const spawn = room.find(FIND_MY_SPAWNS)[0];
  if (!spawn) return;

  const max = maxExtensionsAtRCL(rcl);
  const { built, sites } = countExtensions(room);
  const needed = max - built - sites;

  if (needed <= 0) {
    room.memory.lastExtensionRCL = rcl;
    return;
  }

  const positions = findExtensionPositions(spawn, needed);

  for (const pos of positions) {
    room.createConstructionSite(pos, STRUCTURE_EXTENSION);
  }

  console.log(`[${room.name}] RCL ${rcl}: placing ${positions.length} extension site(s) (${built + sites + positions.length}/${max})`);
  room.memory.lastExtensionRCL = rcl;
}
