/**
 * Hauler: pure logistics role with no WORK parts.
 * Collects energy from containers or dropped resources,
 * then delivers to spawn, extensions, or storage.
 */

const DELIVERY_THRESHOLD = 50; // Minimum energy in a source before hauling from it

function findEnergySource(creep: Creep): StructureContainer | Resource | null {
  // Dropped energy (from miners before containers are built)
  const dropped = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES, {
    filter: r => r.resourceType === RESOURCE_ENERGY && r.amount >= DELIVERY_THRESHOLD
  });

  // Containers with energy (excluding controller-adjacent containers — reserved for upgraders)
  const container = creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: s => {
      if (s.structureType !== STRUCTURE_CONTAINER) return false;
      const c = s as StructureContainer;
      if (c.store[RESOURCE_ENERGY] < DELIVERY_THRESHOLD) return false;
      // Skip containers within 3 tiles of the controller (reserved for upgraders)
      const controller = creep.room.controller;
      return !controller || c.pos.getRangeTo(controller) > 3;
    }
  }) as StructureContainer | null;

  if (!dropped && !container) return null;
  if (!dropped) return container;
  if (!container) return dropped;

  // Pick whichever is closer
  return creep.pos.getRangeTo(dropped) <= creep.pos.getRangeTo(container)
    ? dropped
    : container;
}

function findDeliveryTarget(creep: Creep): StructureSpawn | StructureExtension | StructureStorage | null {
  // Fill spawn and extensions first
  const energyStructure = creep.pos.findClosestByPath(FIND_STRUCTURES, {
    filter: s =>
      (s.structureType === STRUCTURE_SPAWN || s.structureType === STRUCTURE_EXTENSION) &&
      (s as StructureSpawn | StructureExtension).store.getFreeCapacity(RESOURCE_ENERGY) > 0
  }) as StructureSpawn | StructureExtension | null;

  if (energyStructure) return energyStructure;

  // Fall back to storage
  const storage = creep.room.storage;
  if (storage && storage.store.getFreeCapacity(RESOURCE_ENERGY) > 0) return storage;

  return null;
}

export function runHauler(creep: Creep): void {
  if (creep.memory.working && creep.store[RESOURCE_ENERGY] === 0) {
    creep.memory.working = false;
    creep.say("🔄 collect");
  }
  if (!creep.memory.working && creep.store.getFreeCapacity() === 0) {
    creep.memory.working = true;
    creep.say("🚚 deliver");
  }

  if (creep.memory.working) {
    const target = findDeliveryTarget(creep);
    if (target) {
      if (creep.transfer(target, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(target, { visualizePathStyle: { stroke: "#ffffff" } });
      }
    }
  } else {
    const source = findEnergySource(creep);
    if (!source) return;

    if (source instanceof Resource) {
      if (creep.pickup(source) === ERR_NOT_IN_RANGE) {
        creep.moveTo(source, { visualizePathStyle: { stroke: "#00ff00" } });
      }
    } else {
      if (creep.withdraw(source, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
        creep.moveTo(source, { visualizePathStyle: { stroke: "#00ff00" } });
      }
    }
  }
}
