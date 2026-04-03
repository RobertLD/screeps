/**
 * Miner: assigned to a specific source at spawn time.
 * Moves to the container next to its source and harvests every tick.
 * If the container isn't built yet, harvests and drops on the ground
 * so haulers can pick it up.
 */
export function runMiner(creep: Creep): void {
  if (!creep.memory.sourceId) return;

  const source = Game.getObjectById<Source>(creep.memory.sourceId);
  if (!source) return;

  const container = source.pos.findInRange(FIND_STRUCTURES, 1, {
    filter: s => s.structureType === STRUCTURE_CONTAINER
  })[0] as StructureContainer | undefined;

  if (container) {
    // Sit on the container tile and harvest into it
    if (!creep.pos.isEqualTo(container.pos)) {
      creep.moveTo(container, { visualizePathStyle: { stroke: "#ffaa00" }, reusePath: 5 });
      return;
    }
    creep.harvest(source);
  } else {
    // Container not yet built — harvest and let energy drop for haulers to collect
    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
      creep.moveTo(source, { visualizePathStyle: { stroke: "#ffaa00" }, reusePath: 5 });
    }
  }
}
