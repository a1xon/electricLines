<template>
  <div class="h-screen bg-brand-black text-zinc-100 p-4 font-sans selection:bg-brand-accent/30 flex flex-col gap-4 overflow-hidden">
    
    <!-- Header Section -->
    <div class="flex-shrink-0 flex justify-between items-center bg-brand-card rounded-2xl px-6 py-3 border border-brand-border shadow-2xl">
      <h1 class="text-xl font-bold tracking-tight text-white flex items-center gap-2">
        Electric Lines Routing
      </h1>
      <div class="flex items-center gap-4">
        <div v-if="simulationStats.hasRun" class="flex gap-4 bg-brand-black px-4 py-2 rounded-xl border border-brand-border font-mono text-[10px]">
          <div class="flex items-center gap-2">
            <span class="text-zinc-500">LENGTH:</span>
            <span class="text-white font-bold">{{ simulationStats.cableLength.toFixed(0) }}m</span>
          </div>
          <div class="flex items-center gap-2 border-l border-brand-border pl-4">
            <span class="text-zinc-500">RISERS:</span>
            <span class="text-white font-bold">{{ bestSolution.risers.length }}</span>
          </div>
          <div class="flex items-center gap-2 border-l border-brand-border pl-4">
            <span class="text-zinc-500">CROSSINGS:</span>
            <span :class="simulationStats.crossings > 0 ? 'text-rose-500' : 'text-emerald-500'" class="font-bold">{{ simulationStats.crossings }}</span>
          </div>
        </div>
        <button @click="addRandomItems" 
                class="px-4 py-2 bg-brand-border hover:bg-brand-hover text-zinc-300 rounded-lg text-sm font-semibold transition-colors border border-brand-hover/50">
          Randomize All
        </button>
      </div>
    </div>

    <div class="flex-1 flex gap-4 overflow-hidden">
      
      <!-- Left Sidebar: Controls -->
      <div class="w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
        
        <!-- Level Selection & Mode -->
        <div class="bg-brand-card rounded-2xl p-4 shadow-xl border border-brand-border flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Level Management</span>
            <div class="flex flex-wrap gap-1 items-center">
              <button v-for="l in activeLevels" :key="l" 
                      @click="activeLevel = l" 
                      :class="activeLevel === l ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : 'bg-brand-black text-zinc-400 hover:bg-brand-border'"
                      class="px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-2">
                {{l}}
              </button>
              <button v-if="levelCount < 5" @click="addLevel"
                      class="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-md text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all">
                +
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Current Voltage</span>
            <div class="flex flex-wrap gap-1">
              <button v-for="v in AVAILABLE_VOLTAGES" :key="v" 
                      @click="currentVoltage = v" 
                      :class="currentVoltage === v ? 'ring-2 ring-white/40 shadow-lg' : 'opacity-80 hover:opacity-100'"
                      :style="{ backgroundColor: getVoltageColor(v) }"
                      class="px-2 py-1 rounded-md text-[10px] font-black text-white transition-all">
                {{v}}V
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Placement Mode</span>
            <div class="flex gap-1">
              <button v-for="m in (['provider', 'endpoint'] as const)" :key="m"
                      @click="placementMode = m" 
                      :class="placementMode === m ? 'bg-zinc-100 text-black' : 'bg-brand-black text-zinc-400 hover:bg-brand-border'"
                      class="flex-1 py-1 rounded-md text-[10px] font-bold capitalize transition-all">
                {{m}}
              </button>
            </div>
          </div>

          <button @click="toggleSimulation" 
                  :class="isRunning ? 'bg-rose-600 hover:bg-rose-500 ring-rose-900/40' : 'bg-emerald-600 hover:bg-emerald-500 ring-emerald-900/40'"
                  class="w-full py-3 rounded-xl text-white font-black uppercase tracking-tighter shadow-lg transition-all active:scale-95 ring-4 mt-2">
            {{ isRunning ? 'Stop Optimization' : 'Run GA' }}
          </button>
        </div>

        <!-- Providers List -->
        <div class="bg-brand-card rounded-2xl p-4 shadow-xl border border-brand-border flex flex-col gap-3">
          <header class="flex justify-between items-center">
            <strong class="text-[10px] uppercase tracking-widest text-zinc-500">Providers (L:{{activeLevel}})</strong>
            <button @click="addVoltageProvider(activeLevel)" 
                    class="w-5 h-5 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold">
              +
            </button>
          </header>
          <div class="max-h-40 overflow-y-auto pr-1 custom-scrollbar">
            <div v-for="p in getProvidersForLevel(activeLevel)" :key="'p'+p.position.x+p.position.y" 
                 class="flex items-center gap-3 py-1.5 border-b border-brand-border/50 group">
              <div class="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" :style="{ backgroundColor: getVoltageColor(p.type) }"></div>
              <select v-model.number="p.type" class="bg-transparent text-[10px] font-bold text-zinc-300 focus:outline-none cursor-pointer">
                <option v-for="v in AVAILABLE_VOLTAGES" :key="v" :value="v" class="bg-brand-card">{{v}}V</option>
              </select>
              <button @click="removeVoltageProvider(p)" class="ml-auto opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-400 transition-all text-sm leading-none">×</button>
            </div>
          </div>
        </div>

        <!-- Endpoints List -->
        <div class="bg-brand-card rounded-2xl p-4 shadow-xl border border-brand-border flex flex-col gap-3">
          <header class="flex justify-between items-center">
            <strong class="text-[10px] uppercase tracking-widest text-zinc-500">Endpoints (L:{{activeLevel}})</strong>
            <button @click="addEndpoint(activeLevel)" 
                    class="w-5 h-5 flex items-center justify-center bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all text-xs font-bold">
              +
            </button>
          </header>
          <div class="max-h-40 overflow-y-auto pr-1 custom-scrollbar">
            <div v-for="e in getEndpointsForLevel(activeLevel)" :key="'e'+e.position.x+e.position.y" 
                 class="flex items-center gap-3 py-1.5 border-b border-brand-border/50 group">
              <div class="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]" :style="{ backgroundColor: getVoltageColor(e.requiredVoltage) }"></div>
              <select v-model.number="e.requiredVoltage" class="bg-transparent text-[10px] font-bold text-zinc-300 focus:outline-none cursor-pointer">
                <option v-for="v in AVAILABLE_VOLTAGES" :key="v" :value="v" class="bg-brand-card">{{v}}V</option>
              </select>
              <button @click="removeEndpoint(e)" class="ml-auto opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-400 transition-all text-sm leading-none">×</button>
            </div>
          </div>
        </div>

        <!-- Config -->
        <div class="bg-brand-card rounded-2xl p-4 shadow-xl border border-brand-border flex flex-col gap-3">
          <h3 class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Configuration</h3>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-bold text-zinc-600 uppercase">Grid W</label>
              <input type="number" v-model.number="gridSize.width" class="bg-brand-black border border-brand-border rounded-lg p-1.5 text-[10px] text-white focus:ring-1 focus:ring-brand-accent outline-none">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-bold text-zinc-600 uppercase">Grid H</label>
              <input type="number" v-model.number="gridSize.height" class="bg-brand-black border border-brand-border rounded-lg p-1.5 text-[10px] text-white focus:ring-1 focus:ring-brand-accent outline-none">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-bold text-zinc-600 uppercase">Risers</label>
              <input type="number" v-model.number="geneticParams.maxRisers" class="bg-brand-black border border-brand-border rounded-lg p-1.5 text-[10px] text-white focus:ring-1 focus:ring-brand-accent outline-none">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-bold text-zinc-600 uppercase">Gens</label>
              <input type="number" v-model.number="geneticParams.generationCount" class="bg-brand-black border border-brand-border rounded-lg p-1.5 text-[10px] text-white focus:ring-1 focus:ring-brand-accent outline-none">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-bold text-zinc-600 uppercase">Pop Size</label>
              <input type="number" v-model.number="geneticParams.populationSize" class="bg-brand-black border border-brand-border rounded-lg p-1.5 text-[10px] text-white focus:ring-1 focus:ring-brand-accent outline-none">
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[9px] font-bold text-zinc-600 uppercase">Crossing Penalty</label>
              <input type="number" v-model.number="geneticParams.crossingPenalty" class="bg-brand-black border border-brand-border rounded-lg p-1.5 text-[10px] text-white focus:ring-1 focus:ring-brand-accent outline-none">
            </div>
          </div>
        </div>
      </div>

      <!-- Main Section: Visualization -->
      <div class="flex-1 bg-brand-card rounded-2xl border border-brand-border shadow-2xl overflow-hidden flex flex-col">
        <div class="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar p-6 bg-brand-black/40">
          <div class="flex gap-8 min-h-full items-start">
            <div v-for="(level, idx) in activeLevels" :key="level" 
                 class="flex-shrink-0 transition-all duration-500"
                 :class="activeLevel === level ? 'scale-100 opacity-100' : 'scale-95 opacity-40 grayscale-[0.6]'">
              <div class="bg-brand-card rounded-3xl p-5 border-2 transition-colors border-brand-border shadow-2xl relative"
                   :class="{ '!border-brand-accent !shadow-brand-accent/10': activeLevel === level }">
                <header class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3">
                    <span class="px-2 py-0.5 bg-zinc-100 text-black rounded text-[10px] font-black uppercase">Level {{level}}</span>
                    <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{{ getLevelDesc(level) }}</span>
                  </div>
                  <button v-if="levelCount > 1" @click="removeLevel(level)" 
                          class="w-6 h-6 flex items-center justify-center bg-rose-500/10 text-rose-500 rounded-full hover:bg-rose-500 hover:text-white transition-all text-xs font-bold"
                          title="Delete Level">
                    ×
                  </button>
                </header>

                <div class="relative bg-brand-black rounded-xl overflow-hidden border border-brand-border shadow-inner cursor-crosshair group">
                  <svg :width="gridSize.width * GRID_CELL" :height="gridSize.height * GRID_CELL"
                       class="block select-none"
                       @click="handleGridClick($event, level)">
                    <defs>
                      <pattern id="gridPattern" :width="GRID_CELL" :height="GRID_CELL" patternUnits="userSpaceOnUse">
                        <path :d="`M ${GRID_CELL} 0 L 0 0 0 ${GRID_CELL}`" fill="none" stroke="#27272a" stroke-width="1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#gridPattern)" />

                    <g class="layer-cables">
                      <path v-for="(path, i) in (bestSolution.pathsByLevel[level] || [])" :key="i"
                            :d="path.d" :stroke="getVoltageColor(path.voltage)"
                            stroke-width="3" fill="none" opacity="0.9" stroke-linecap="round" stroke-linejoin="round"
                            class="drop-shadow-[0_0_12px_rgba(0,0,0,0.8)]" />
                    </g>

                    <g class="layer-risers">
                      <template v-for="(r, i) in bestSolution.risers" :key="'r'+i">
                        <rect :x="r.x * GRID_CELL" :y="r.y * GRID_CELL"
                              :width="GRID_CELL * 3" :height="GRID_CELL * 3"
                              class="fill-white/[0.03] stroke-white/10 stroke-2" stroke-dasharray="4,2" />
                        <text :x="r.x * GRID_CELL + (GRID_CELL * 1.5)" :y="r.y * GRID_CELL + (GRID_CELL * 1.5)"
                              class="text-[8px] font-black fill-white/20 uppercase pointer-events-none text-center"
                              dominant-baseline="middle" text-anchor="middle">
                          {{ getRiserType(level, activeLevels.length, idx) }}
                        </text>
                      </template>
                    </g>

                    <g class="layer-items">
                      <rect v-for="p in getProvidersForLevel(level)" :key="'p-'+p.position.x+'-'+p.position.y"
                            :x="p.position.x * GRID_CELL + 4" :y="p.position.y * GRID_CELL + 4"
                            :width="GRID_CELL - 8" :height="GRID_CELL - 8"
                            :fill="getVoltageColor(p.type)" stroke="white" stroke-opacity="0.2" stroke-width="2" rx="2"
                            class="cursor-grab active:cursor-grabbing transition-transform origin-center shadow-lg" 
                            @mousedown.stop="startDrag($event, p)" />
                      
                      <circle v-for="e in getEndpointsForLevel(level)" :key="'e-'+e.position.x+'-'+e.position.y"
                              :cx="e.position.x * GRID_CELL + GRID_CELL/2"
                              :cy="e.position.y * GRID_CELL + GRID_CELL/2"
                              :r="GRID_CELL/2 - 4"
                              :fill="getVoltageColor(e.requiredVoltage)" stroke="white" stroke-opacity="0.2" stroke-width="2"
                              class="cursor-grab active:cursor-grabbing transition-transform origin-center shadow-lg" 
                              @mousedown.stop="startDrag($event, e)" />
                    </g>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive } from 'vue';
import { useEventListener } from '@vueuse/core';
import { useElectricSimulation } from './composables/useElectricSimulation';
import { getVoltageColor, AVAILABLE_VOLTAGES, GRID_CELL, getLevelDesc, getRiserType } from './utils/constants';

const {
  gridSize,
  isRunning,
  activeLevel,
  currentVoltage,
  placementMode,
  levelCount,
  voltageProviders,
  endpoints,
  bestSolution,
  simulationStats,
  geneticParams,
  activeLevels,
  addRandomItems,
  toggleSimulation,
  isOccupied,
  addLevel,
  removeLevel
} = useElectricSimulation();

const dragState = reactive({ active: false, rect: null as DOMRect | null });

const getProvidersForLevel = (l: string) => voltageProviders.value.filter(p => p.level === l);
const getEndpointsForLevel = (l: string) => endpoints.value.filter(e => e.level === l);

const removeVoltageProvider = (item: any) => {
  const idx = voltageProviders.value.indexOf(item);
  if (idx > -1) voltageProviders.value.splice(idx, 1);
};

const removeEndpoint = (item: any) => {
  const idx = endpoints.value.indexOf(item);
  if (idx > -1) endpoints.value.splice(idx, 1);
};

const addVoltageProvider = (l: string) => {
  let p = getRandomPos();
  let attempts = 0;
  while(isOccupied(p.x, p.y, l) && attempts < 50) {
    p = getRandomPos();
    attempts++;
  }
  voltageProviders.value.push({ type: currentVoltage.value, position: p, level: l });
};

const addEndpoint = (l: string) => {
  let p = getRandomPos();
  let attempts = 0;
  while(isOccupied(p.x, p.y, l) && attempts < 50) {
    p = getRandomPos();
    attempts++;
  }
  endpoints.value.push({ requiredVoltage: currentVoltage.value, position: p, level: l });
};

const getRandomPos = () => ({ x: Math.floor(Math.random() * gridSize.width), y: Math.floor(Math.random() * gridSize.height) });

const handleGridClick = (e: MouseEvent, l: string) => {
  if (isRunning.value || dragState.active) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / GRID_CELL);
  const y = Math.floor((e.clientY - rect.top) / GRID_CELL);
  
  if (x < 0 || x >= gridSize.width || y < 0 || y >= gridSize.height) return;
  if (isOccupied(x, y, l)) return;

  if (placementMode.value === 'provider') {
    voltageProviders.value.push({ type: currentVoltage.value, position: {x, y}, level: l });
  } else {
    endpoints.value.push({ requiredVoltage: currentVoltage.value, position: {x, y}, level: l });
  }
};

const startDrag = (e: MouseEvent, item: any) => {
  dragState.active = true;
  dragState.rect = (e.currentTarget as SVGElement).ownerSVGElement!.getBoundingClientRect();
  
  const cleanupMove = useEventListener(window, 'mousemove', (me) => {
    if (!dragState.active || !dragState.rect) return;
    const x = Math.floor((me.clientX - dragState.rect.left) / GRID_CELL);
    const y = Math.floor((me.clientY - dragState.rect.top) / GRID_CELL);
    if (x >= 0 && x < gridSize.width && y >= 0 && y < gridSize.height && !isOccupied(x, y, item.level, item)) {
      item.position = { x, y };
    }
  });

  const cleanupUp = useEventListener(window, 'mouseup', () => {
    dragState.active = false;
    cleanupMove();
    cleanupUp();
  });
};

onMounted(() => {
  // Start with just 1 level as requested
  levelCount.value = 1;
  addRandomItems();
});
</script>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(63, 63, 70, 0.5);
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(82, 82, 91, 0.8);
}
</style>
