export function runRoadPlanner(room: Room): void {
  // Only plan once per room
  if (room.memory.roadsPlanned) return;

  const spawn = room.find(FIND_MY_SPAWNS)[0];
  if (!spawn) return;

  const targets: RoomPosition[] = [];

  // Add all sources
  for (const source of room.find(FIND_SOURCES)) {
    targets.push(source.pos);
  }

  // Add controller
  if (room.controller) {
    targets.push(room.controller.pos);
  }

  // Plan a road along the path from spawn to each target
  for (const target of targets) {
    const path = room.findPath(spawn.pos, target, {
      ignoreCreeps: true,
      swampCost: 2
    });
    for (const step of path) {
      room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
    }
  }

  room.memory.roadsPlanned = true;
  console.log(`[${room.name}] Road plan placed`);
}
