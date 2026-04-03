/**
 * Upgrader: stays near the controller and upgrades it every tick.
 * Withdraws from the container adjacent to the controller.
 * Falls back to harvesting if no container is available yet.
 */
export function runUpgrader(creep: Creep): void {
  if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
    creep.memory.working = false;
    creep.say("🔄 refill");
  }
  if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
    creep.say("⬆️ upgrade");
  }

  if (creep.memory.working) {
    const controller = creep.room.controller;
    if (controller) {
      if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
        creep.moveTo(controller, { visualizePathStyle: { stroke: "#ffffff" } });
      }
    }
  } else {
    // Prefer container adjacent to the controller
    const controllerContainer = creep.room.controller?.pos.findInRange(FIND_STRUCTURES, 3, {
      filter: s =>
        s.structureType === STRUCTURE_CONTAINER &&
        (s as StructureContainer).store[RESOURCE_ENERGY] > 0
    })[0] as StructureContainer | undefined;

    if (controllerContainer) {
      if (creep.withdraw(controllerContainer, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(controllerContainer, { visualizePathStyle: { stroke: "#ffaa00" } });
      }
    } else {
      // Container not built yet — harvest directly
      const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
      if (source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          creep.moveTo(source, { visualizePathStyle: { stroke: "#ffaa00" } });
        }
      }
    }
  }
}
