// How many of each non-source-dependent role to maintain
const ROLE_TARGETS: Record<string, number> = {
  upgrader: 2,
  builder: 1
};

// Spawn priority order — miners first to ensure energy income
const SPAWN_PRIORITY = ["miner", "hauler", "upgrader", "builder"];

// --- Body builders ---

const PART_COST: Record<string, number> = {
  [WORK]: 100, [CARRY]: 50, [MOVE]: 50,
  [ATTACK]: 80, [RANGED_ATTACK]: 150, [HEAL]: 250,
  [CLAIM]: 600, [TOUGH]: 10
};

function bodyCost(body: BodyPartConstant[]): number {
  return body.reduce((sum, part) => sum + PART_COST[part], 0);
}

/**
 * Miner body: maximises WORK parts with a single MOVE to reach the source.
 * Capped at 5 WORK (enough to fully drain a standard source each regen cycle).
 */
function buildMinerBody(energyCapacity: number): BodyPartConstant[] {
  const maxWork = Math.min(5, Math.floor((energyCapacity - PART_COST[MOVE]) / PART_COST[WORK]));
  const workCount = Math.max(1, maxWork);
  return [...Array(workCount).fill(WORK), MOVE];
}

/**
 * Hauler body: pure CARRY + MOVE, scaled to energy capacity.
 * No WORK parts — haulers never harvest.
 */
function buildHaulerBody(energyCapacity: number): BodyPartConstant[] {
  const unitCost = PART_COST[CARRY] + PART_COST[MOVE];
  const repeats = Math.min(6, Math.max(1, Math.floor(energyCapacity / unitCost / 2)));
  return Array(repeats).fill([CARRY, MOVE]).flat();
}

/**
 * Generic body: repeats a [WORK, CARRY, MOVE] unit scaled to energy capacity.
 * Used for upgraders.
 */
function buildGenericBody(energyCapacity: number): BodyPartConstant[] {
  const unit: BodyPartConstant[] = [WORK, CARRY, MOVE];
  const unitCost = bodyCost(unit);
  const repeats = Math.min(4, Math.max(1, Math.floor(energyCapacity / unitCost)));
  return Array(repeats).fill(unit).flat();
}

/**
 * Builder body: prioritises WORK parts for faster construction.
 * Ratio is 3 WORK : 2 CARRY : 2 MOVE to balance build speed and carry capacity.
 */
function buildBuilderBody(energyCapacity: number): BodyPartConstant[] {
  const unit: BodyPartConstant[] = [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE];
  const unitCost = bodyCost(unit);
  const repeats = Math.min(2, Math.max(1, Math.floor(energyCapacity / unitCost)));
  return Array(repeats).fill(unit).flat();
}

// Emergency body used when miners hit 0 — cheap enough to spawn immediately
const EMERGENCY_MINER_BODY: BodyPartConstant[] = [WORK, CARRY, MOVE];

// --- Creep counting ---

function countByRole(): Record<string, number> {
  const counts: Record<string, number> = { miner: 0, hauler: 0, upgrader: 0, builder: 0 };
  for (const name in Game.creeps) {
    const role = Game.creeps[name].memory.role;
    if (role in counts) counts[role]++;
  }
  return counts;
}

/** Returns the set of source IDs that already have a miner assigned. */
function assignedSourceIds(): Set<string> {
  const assigned = new Set<string>();
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    if (creep.memory.role === "miner" && creep.memory.sourceId) {
      assigned.add(creep.memory.sourceId);
    }
  }
  return assigned;
}

// --- Spawn logic ---

function trySpawn(
  spawn: StructureSpawn,
  role: string,
  body: BodyPartConstant[],
  extraMemory: Partial<CreepMemory> = {}
): boolean {
  const name = `${role}_${Game.time}`;
  const result = spawn.spawnCreep(body, name, {
    memory: { role, working: false, room: spawn.room.name, ...extraMemory }
  });

  if (result === OK) {
    console.log(`[${spawn.room.name}] Spawning ${role} (${bodyCost(body)} energy, ${body.length} parts): ${name}`);
    return true;
  }
  return false;
}

// --- Visual ---

function drawSpawnStatus(spawn: StructureSpawn, counts: Record<string, number>, nextRole: string | null): void {
  const sources = spawn.room.find(FIND_SOURCES).length;
  const minerTarget = sources;
  const haulerTarget = sources;

  const lines = [
    `M:${counts.miner}/${minerTarget} H:${counts.hauler}/${haulerTarget}`,
    `U:${counts.upgrader}/${ROLE_TARGETS.upgrader} B:${counts.builder}/${ROLE_TARGETS.builder}`,
    nextRole ? `next: ${nextRole}` : "next: idle"
  ];

  lines.forEach((line, i) => {
    spawn.room.visual.text(line, spawn.pos.x, spawn.pos.y - 1 - i, {
      align: "center",
      opacity: 0.8,
      font: 0.5
    });
  });
}

export function runSpawnManager(spawn: StructureSpawn): void {
  if (spawn.spawning) {
    const spawningCreep = Game.creeps[spawn.spawning.name];
    spawn.room.visual.text(`🐣 ${spawningCreep.memory.role}`, spawn.pos.x + 1, spawn.pos.y, {
      align: "left",
      opacity: 0.8
    });
    return;
  }

  const counts = countByRole();
  const sources = spawn.room.find(FIND_SOURCES);
  const energyCapacity = spawn.room.energyCapacityAvailable;
  const hasSites = spawn.room.find(FIND_CONSTRUCTION_SITES).length > 0;
  const isEmergency = counts.miner === 0;

  const minerTarget = sources.length;
  const haulerTarget = sources.length;

  let nextRole: string | null = null;

  for (const role of SPAWN_PRIORITY) {
    if (role === "builder" && !hasSites) continue;

    const target = role === "miner" ? minerTarget
      : role === "hauler" ? haulerTarget
      : ROLE_TARGETS[role];

    if (counts[role] >= target) continue;

    nextRole = role;

    if (role === "miner") {
      const assigned = assignedSourceIds();
      const unassigned = sources.find(s => !assigned.has(s.id));
      if (!unassigned) break;

      const body = isEmergency ? EMERGENCY_MINER_BODY : buildMinerBody(energyCapacity);
      trySpawn(spawn, "miner", body, { sourceId: unassigned.id });

    } else if (role === "hauler") {
      trySpawn(spawn, "hauler", buildHaulerBody(energyCapacity));

    } else if (role === "builder") {
      trySpawn(spawn, "builder", buildBuilderBody(energyCapacity));
    } else {
      trySpawn(spawn, role, buildGenericBody(energyCapacity));
    }

    break;
  }

  drawSpawnStatus(spawn, counts, nextRole);
}
