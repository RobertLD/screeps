export function runTowerManager(tower: StructureTower): void {
  // Priority 1: attack hostiles
  const hostile = tower.pos.findClosestByRange(FIND_HOSTILE_CREEPS);
  if (hostile) {
    tower.attack(hostile);
    return;
  }

  // Priority 2: heal damaged friendly creeps
  const damagedCreep = tower.pos.findClosestByRange(FIND_MY_CREEPS, {
    filter: (c) => c.hits < c.hitsMax
  });
  if (damagedCreep) {
    tower.heal(damagedCreep);
    return;
  }

  // Priority 3: repair damaged structures (ignore roads below 75% to save energy)
  const damagedStructure = tower.pos.findClosestByRange(FIND_STRUCTURES, {
    filter: (s) =>
      s.hits < s.hitsMax * 0.75 &&
      s.structureType !== STRUCTURE_WALL &&
      s.structureType !== STRUCTURE_RAMPART
  });
  if (damagedStructure) {
    tower.repair(damagedStructure);
  }
}
