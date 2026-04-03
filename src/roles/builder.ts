/**
 * Builder: constructs sites using energy from source containers.
 * Falls back to harvesting if no containers are available,
 * and falls back to upgrading if there's nothing to build.
 */
export function runBuilder(creep: Creep): void {
  if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
    creep.memory.working = false;
    creep.say("🔄 refill");
  }
  if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
    creep.say("🔨 build");
  }

  if (creep.memory.working) {
    const site = creep.pos.findClosestByPath(FIND_CONSTRUCTION_SITES);
    if (site) {
      if (creep.build(site) === ERR_NOT_IN_RANGE) {
        creep.moveTo(site, { visualizePathStyle: { stroke: "#0000ff" }, reusePath: 5 });
      }
    } else {
      // Nothing to build — help upgrade the controller
      const controller = creep.room.controller;
      if (controller) {
        if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
          creep.moveTo(controller, { visualizePathStyle: { stroke: "#ffffff" } });
        }
      }
    }
  } else {
    // Prefer source containers (not the controller container)
    const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
      filter: s => {
        if (s.structureType !== STRUCTURE_CONTAINER) return false;
        const c = s as StructureContainer;
        if (c.store[RESOURCE_ENERGY] === 0) return false;
        const controller = creep.room.controller;
        return !controller || c.pos.getRangeTo(controller) > 3;
      }
    }) as StructureContainer | null;

    if (container) {
      if (creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(container, { visualizePathStyle: { stroke: "#ffaa00" }, reusePath: 5 });
      }
    } else {
      // No containers yet — harvest directly
      const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
      if (source) {
        if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
          creep.moveTo(source, { visualizePathStyle: { stroke: "#ffaa00" }, reusePath: 5 });
        }
      }
    }
  }
}
