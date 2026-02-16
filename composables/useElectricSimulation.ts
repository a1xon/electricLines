import { AVAILABLE_VOLTAGES, GRID_CELL, LEVELS } from '../utils/constants';
import { computeMST, getRandomPos, type Position, type Individual, type Riser, type Path } from '../utils/simulation-logic';

export const useElectricSimulation = () => {
  const gridSize = reactive({ width: 30, height: 20 });
  const isRunning = ref(false);
  const activeLevel = ref('A');
  const currentVoltage = ref(5);
  const placementMode = ref<'provider' | 'endpoint'>('endpoint');
  const levelCount = ref(3); 

  const voltageProviders = ref<{ type: number; position: Position; level: string }[]>([]); 
  const endpoints = ref<{ requiredVoltage: number; position: Position; level: string }[]>([]);

  const bestSolution = shallowRef({ 
    pathsByLevel: {} as Record<string, Path[]>, 
    risers: [] as Riser[], 
    crossings: [] as any[] 
  });
  
  const simulationStats = reactive({ 
    hasRun: false, 
    generation: 0, 
    cost: 0, 
    cableLength: 0, 
    crossings: 0 
  });

  const geneticParams = reactive({
    populationSize: 300,
    generationCount: 1_000,
    mutationRate: 0.175,
    elitism: 0.1,
    maxRisers: 2,
    steinerCount: 3,
    crossingPenalty: 2_500,
    riserPenalty: 1_000,
    overlapPenalty: 5_000
  });

  const activeLevels = computed(() => LEVELS.slice(0, levelCount.value));

  watch([voltageProviders, endpoints, gridSize, geneticParams, levelCount], () => {
    if (isRunning.value) return;
    simulationStats.hasRun = false;
    bestSolution.value = { pathsByLevel: {}, risers: [], crossings: [] };
  }, { deep: true });

  const isOccupied = (x: number, y: number, level: string, excludeItem?: any) => {
    const providers = voltageProviders.value.some(p => p.level === level && p.position.x === x && p.position.y === y && p !== excludeItem);
    const ends = endpoints.value.some(e => e.level === level && e.position.x === x && e.position.y === y && e !== excludeItem);
    return providers || ends;
  };

  const createIndividual = (): Individual => {
    const risers = Array.from({ length: Math.floor(Math.random() * geneticParams.maxRisers) + 1 }, () => ({
      x: 3 + Math.floor(Math.random() * (gridSize.width - 6)),
      y: 3 + Math.floor(Math.random() * (gridSize.height - 6))
    }));
    const steiners: Record<string, Position[]> = {};
    const orientations: Record<string, Uint8Array> = {};
    activeLevels.value.forEach(l => {
      AVAILABLE_VOLTAGES.forEach(v => {
        const key = `${l}_${v}`;
        steiners[key] = Array.from({ length: geneticParams.steinerCount }, () => getRandomPos(gridSize.width, gridSize.height));
        orientations[key] = new Uint8Array(30).map(() => Math.random() > 0.5 ? 1 : 0);
      });
    });
    return { risers, steiners, orientations, fitness: Infinity, renderData: { pathsByLevel: {}, risers: [], totalLength: 0, totalCrossings: 0 } };
  };

  const evaluateFitness = (ind: Individual) => {
    let totalLength = 0;
    let totalCollisions = 0;
    const pathsByLevel: Record<string, Path[]> = {};
    activeLevels.value.forEach(l => pathsByLevel[l] = []);
    
    const riserPos = ind.risers.map(r => ({ x: r.x + 1, y: r.y + 1 }));
    const w = gridSize.width;
    const h = gridSize.height;

    const buffers: Record<string, Uint8Array> = {};
    activeLevels.value.forEach(l => buffers[l] = new Uint8Array(w * h));

    activeLevels.value.forEach(level => {
      const buffer = buffers[level];
      if (!buffer) return;
      [...voltageProviders.value, ...endpoints.value].filter(it => it.level === level).forEach(it => {
        const idx = it.position.y * w + it.position.x;
        if (idx >= 0 && idx < buffer.length) {
          const v = 'type' in it ? it.type : it.requiredVoltage;
          buffer[idx] = 100 + (AVAILABLE_VOLTAGES.indexOf(v) + 1);
        }
      });
    });

    const neededOnLevel: Record<string, number[]> = {};
    activeLevels.value.forEach((l, idx) => {
      neededOnLevel[l] = AVAILABLE_VOLTAGES.filter(v => {
        for (let i = idx; i < activeLevels.value.length; i++) {
          const nextLevel = activeLevels.value[i];
          if (endpoints.value.some(e => e.level === nextLevel && e.requiredVoltage === v)) return true;
        }
        return false;
      });
    });

    activeLevels.value.forEach((level, lIdx) => {
      const buffer = buffers[level];
      if (!buffer) return;
      AVAILABLE_VOLTAGES.forEach((v, vIdx) => {
        const key = `${level}_${v}`, vColorIdx = vIdx + 1;
        let starts: Position[], ends: Position[];

        if (lIdx === 0) { // Base level
          starts = voltageProviders.value.filter(p => p.level === level && p.type === v).map(p => p.position);
          ends = endpoints.value.filter(e => e.level === level && e.requiredVoltage === v).map(e => e.position);
          const nextLevel = activeLevels.value[lIdx + 1];
          if (nextLevel && neededOnLevel[nextLevel]?.includes(v)) {
            ends.push(...riserPos);
          }
        } else {
          starts = riserPos;
          ends = endpoints.value.filter(e => e.level === level && e.requiredVoltage === v).map(e => e.position);
          const nextLevel = activeLevels.value[lIdx + 1];
          if (nextLevel && neededOnLevel[nextLevel]?.includes(v)) {
            ends.push(...riserPos);
          }
        }

        if (starts.length > 0 && ends.length > 0) {
          const mst = computeMST([...starts, ...ends], ind.steiners[key] || []);
          mst.forEach((edge, i) => {
            totalLength += Math.abs(edge.from.x - edge.to.x) + Math.abs(edge.from.y - edge.to.y);
            const flip = ind.orientations[key] ? ind.orientations[key][i % 30] === 1 : false;
            const corner = flip ? { x: edge.from.x, y: edge.to.y } : { x: edge.to.x, y: edge.from.y };

            const levelPaths = pathsByLevel[level];
            if (levelPaths) {
              levelPaths.push({ 
                voltage: v, 
                d: `M ${edge.from.x*GRID_CELL + 12} ${edge.from.y*GRID_CELL + 12} L ${corner.x*GRID_CELL + 12} ${corner.y*GRID_CELL + 12} L ${edge.to.x*GRID_CELL + 12} ${edge.to.y*GRID_CELL + 12}` 
              });
            }

            [{ p1: edge.from, p2: corner }, { p1: corner, p2: edge.to }].forEach(seg => {
              const x1 = Math.min(seg.p1.x, seg.p2.x), x2 = Math.max(seg.p1.x, seg.p2.x);
              const y1 = Math.min(seg.p1.y, seg.p2.y), y2 = Math.max(seg.p1.y, seg.p2.y);
              for (let x = x1; x <= x2; x++) {
                for (let y = y1; y <= y2; y++) {
                  const idx = y * w + x;
                  if (idx >= 0 && idx < buffer.length) {
                    const val = buffer[idx];
                    if (val !== undefined) {
                      if (val !== 0 && val !== vColorIdx && val !== (100 + vColorIdx)) totalCollisions++;
                      if (val < 100) buffer[idx] = vColorIdx;
                    }
                  }
                }
              }
            });
          });
        }
      });
    });

    let riserScore = ind.risers.length * geneticParams.riserPenalty;
    ind.risers.forEach((r1, i) => {
      if (r1.x < 2 || r1.x > w - 5 || r1.y < 2 || r1.y > h - 5) riserScore += 10000;
      ind.risers.slice(i + 1).forEach(r2 => { if (Math.abs(r1.x - r2.x) < 3 && Math.abs(r1.y - r2.y) < 3) riserScore += geneticParams.overlapPenalty; });
      [...voltageProviders.value, ...endpoints.value].forEach(it => { if (it.position.x >= r1.x && it.position.x < r1.x + 3 && it.position.y >= r1.y && it.position.y < r1.y + 3) riserScore += 15000; });
    });

    ind.fitness = totalLength + (totalCollisions * geneticParams.crossingPenalty) + riserScore;
    ind.renderData = { pathsByLevel, risers: ind.risers, totalLength, totalCrossings: totalCollisions };
  };

  const mutate = (ind: Individual) => {
    if (Math.random() < 0.1) ind.risers.forEach(r => {
      r.x = Math.max(1, Math.min(gridSize.width-4, r.x + (Math.random() > 0.5 ? 1 : -1)));
      r.y = Math.max(1, Math.min(gridSize.height-4, r.y + (Math.random() > 0.5 ? 1 : -1)));
    });
    Object.keys(ind.steiners).forEach(k => {
      const steinerK = ind.steiners[k];
      const orientationK = ind.orientations[k];
      if (steinerK && Math.random() < 0.1) steinerK[Math.floor(Math.random() * steinerK.length)] = getRandomPos(gridSize.width, gridSize.height);
      if (orientationK && Math.random() < 0.1) { 
        const i = Math.floor(Math.random() * orientationK.length); 
        orientationK[i] = orientationK[i] === 1 ? 0 : 1; 
      }
    });
  };

  const runGA = () => {
    let population = Array.from({ length: geneticParams.populationSize }, () => createIndividual());
    let gen = 0;
    const step = () => {
      if (!isRunning.value) return;
      population.forEach(ind => evaluateFitness(ind));
      population.sort((a, b) => a.fitness - b.fitness);
      
      const best = population[0];
      if (best) {
        bestSolution.value = {
          ...best.renderData,
          crossings: [] // best.renderData doesn't have crossings property, but bestSolution expects it
        };
        simulationStats.generation = gen;
        simulationStats.cableLength = best.renderData.totalLength;
        simulationStats.crossings = best.renderData.totalCrossings;
      }

      if (gen < geneticParams.generationCount) {
        gen++;
        population = [...population.slice(0, 10), ...Array.from({ length: geneticParams.populationSize - 10 }, () => {
          const parent = population[Math.floor(Math.random()*20)];
          if (!parent) return createIndividual();
          const child = JSON.parse(JSON.stringify(parent));
          mutate(child);
          return child;
        })];
        requestAnimationFrame(step);
      } else { isRunning.value = false; simulationStats.hasRun = true; }
    };
    step();
  };

  const toggleSimulation = () => { 
    isRunning.value = !isRunning.value; 
    if (isRunning.value) runGA(); 
  };

  const addRandomItems = () => {
    isRunning.value = false;
    voltageProviders.value = AVAILABLE_VOLTAGES.map(v => ({ 
      type: v, 
      level: 'A', 
      position: { x: 1, y: 2 + AVAILABLE_VOLTAGES.indexOf(v)*4 } 
    }));
    endpoints.value = [];
    activeLevels.value.forEach(l => {
      // Task: Random feature should place more endpoints on all levels. x3. (5 * 3 = 15)
      for(let i=0; i<15; i++) {
        let p = getRandomPos(gridSize.width, gridSize.height);
        let attempts = 0;
        while(isOccupied(p.x, p.y, l) && attempts < 50) {
          p = getRandomPos(gridSize.width, gridSize.height);
          attempts++;
        }
        const randomVoltage = AVAILABLE_VOLTAGES[Math.floor(Math.random()*AVAILABLE_VOLTAGES.length)];
        if (randomVoltage !== undefined) {
          endpoints.value.push({ 
            requiredVoltage: randomVoltage, 
            level: l, 
            position: p 
          });
        }
      }
    });
    simulationStats.hasRun = false;
    bestSolution.value = { pathsByLevel: {}, risers: [], crossings: [] };
  };

  const addLevel = () => {
    if (levelCount.value < 5) {
      levelCount.value++;
    }
  };

  const removeLevel = (l: string) => {
    // Only allow removing the top-most level to maintain hierarchy simplicity
    // or if the user clicks the delete button on the level card
    if (levelCount.value > 1) {
      // Clean up items on this level
      voltageProviders.value = voltageProviders.value.filter(p => p.level !== l);
      endpoints.value = endpoints.value.filter(e => e.level !== l);
      levelCount.value--;
      
      // Ensure activeLevel is still valid
      if (activeLevel.value === l || !activeLevels.value.includes(activeLevel.value)) {
        activeLevel.value = activeLevels.value[activeLevels.value.length - 1];
      }
    }
  };

  return {
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
  };
};
