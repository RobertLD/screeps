/**
 * Finds the best adjacent tile to place a container next to a target position.
 * Prefers tiles closest to the spawn so haulers have shorter routes.
 */
function findAdjacentContainerPos(
  room: Room,
  targetPos: RoomPosition,
  spawnPos: RoomPosition
): RoomPosition | null {
  const terrain = room.getTerrain();

  const candidates: RoomPosition[] = [];

  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (dx === 0 && dy === 0) continue;
      const x = targetPos.x + dx;
      const y = targetPos.y + dy;
      if (x <= 0 || x >= 49 || y <= 0 || y >= 49) continue;
      if (terrain.get(x, y) === TERRAIN_MASK_WALL) continue;

      const pos = new RoomPosition(x, y, room.name);
      const blocked =
        pos.lookFor(LOOK_STRUCTURES).some(s => s.structureType !== STRUCTURE_ROAD) ||
        pos.lookFor(LOOK_CONSTRUCTION_SITES).length > 0;

      if (!blocked) candidates.push(pos);
    }
  }

  // Prefer the tile closest to spawn so haulers travel less
  candidates.sort((a, b) => a.getRangeTo(spawnPos) - b.getRangeTo(spawnPos));
  return candidates[0] ?? null;
}

export function runContainerPlanner(room: Room): void {
  if (room.memory.containersPlanned) return;

  const spawn = room.find(FIND_MY_SPAWNS)[0];
  if (!spawn) return;

  const targets: RoomPosition[] = [
    ...room.find(FIND_SOURCES).map(s => s.pos),
    ...(room.controller ? [room.controller.pos] : [])
  ];

  let placed = 0;
  for (const targetPos of targets) {
    const pos = findAdjacentContainerPos(room, targetPos, spawn.pos);
    if (pos) {
      const result = room.createConstructionSite(pos, STRUCTURE_CONTAINER);
      if (result === OK) placed++;
    }
  }

  console.log(`[${room.name}] Container plan placed (${placed} site(s))`);
  room.memory.containersPlanned = true;
}
