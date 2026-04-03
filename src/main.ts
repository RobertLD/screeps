import { ErrorMapper } from "utils/ErrorMapper";
import { runMiner } from "roles/miner";
import { runHauler } from "roles/hauler";
import { runUpgrader } from "roles/upgrader";
import { runBuilder } from "roles/builder";
import { runSpawnManager } from "managers/spawn";
import { runTowerManager } from "managers/tower";
import { runRoadPlanner } from "managers/roads";
import { runExtensionPlanner } from "managers/extensions";
import { runContainerPlanner } from "managers/containers";

declare global {
  interface Memory {
    uuid: number;
    log: any;
  }

  interface CreepMemory {
    role: string;
    room: string;
    working: boolean;
    sourceId?: string;
  }

  interface RoomMemory {
    roadsPlanned: boolean;
    lastExtensionRCL: number;
    containersPlanned: boolean;
  }
}

const ROLE_LABELS: Record<string, { working: string; idle: string }> = {
  miner:    { working: "⛏️ mining",    idle: "⛏️ mining"    },
  hauler:   { working: "🚚 delivering", idle: "🔄 collecting" },
  upgrader: { working: "⬆️ upgrading",  idle: "🔄 refilling"  },
  builder:  { working: "🔨 building",   idle: "🔄 refilling"  }
};

const roleMap: Record<string, (creep: Creep) => void> = {
  miner:    runMiner,
  hauler:   runHauler,
  upgrader: runUpgrader,
  builder:  runBuilder
};

export const loop = ErrorMapper.wrapLoop(() => {
  // Clean up memory for dead creeps
  for (const name in Memory.creeps) {
    if (!(name in Game.creeps)) {
      delete Memory.creeps[name];
    }
  }

  // Run per-room planners (run-once or RCL-gated)
  for (const name in Game.rooms) {
    const room = Game.rooms[name];
    runRoadPlanner(room);
    runContainerPlanner(room);
    runExtensionPlanner(room);
  }

  // Run towers
  for (const name in Game.structures) {
    const structure = Game.structures[name];
    if (structure.structureType === STRUCTURE_TOWER) {
      runTowerManager(structure as StructureTower);
    }
  }

  // Run spawns
  for (const name in Game.spawns) {
    runSpawnManager(Game.spawns[name]);
  }

  // Run creeps
  for (const name in Game.creeps) {
    const creep = Game.creeps[name];
    const runner = roleMap[creep.memory.role];
    if (runner) runner(creep);

    // Show action label above creep
    const labels = ROLE_LABELS[creep.memory.role];
    if (labels) {
      const label = creep.memory.working ? labels.working : labels.idle;
      creep.room.visual.text(label, creep.pos.x, creep.pos.y - 0.5, {
        align: "center",
        opacity: 0.8,
        font: 0.4
      });
    }
  }
});
