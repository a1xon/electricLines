export interface Position {
  x: number;
  y: number;
}

export interface Edge {
  from: Position;
  to: Position;
}

export interface Path {
  voltage: number;
  d: string;
}

export interface Riser {
  x: number;
  y: number;
}

export interface Individual {
  risers: Riser[];
  steiners: Record<string, Position[]>;
  orientations: Record<string, Uint8Array>;
  fitness: number;
  renderData: {
    pathsByLevel: Record<string, Path[]>;
    risers: Riser[];
    totalLength: number;
    totalCrossings: number;
  };
}

export const computeMST = (nodes: Position[], steiners: Position[]): Edge[] => {
  const allNodes = [...nodes, ...steiners];
  const n = allNodes.length;
  if (n < 2) return [];
  const parent = new Int32Array(n).fill(-1);
  const key = new Float32Array(n).fill(Infinity);
  const inMST = new Uint8Array(n).fill(0);
  key[0] = 0;
  for (let count = 0; count < n - 1; count++) {
    let u = -1, min = Infinity;
    for (let v = 0; v < n; v++) {
      const kv = key[v];
      if (kv !== undefined && !inMST[v] && kv < min) { 
        min = kv; 
        u = v; 
      }
    }
    if (u === -1) break;
    inMST[u] = 1;
    for (let v = 0; v < n; v++) if (!inMST[v]) {
      const nodeU = allNodes[u];
      const nodeV = allNodes[v];
      if (nodeU && nodeV) {
        const d = Math.abs(nodeU.x - nodeV.x) + Math.abs(nodeU.y - nodeV.y);
        const kv = key[v];
        if (kv !== undefined && d < kv) { 
          parent[v] = u; 
          key[v] = d; 
        }
      }
    }
  }
  const edges: Edge[] = [];
  for (let i = 1; i < n; i++) {
    const pIdx = parent[i];
    if (pIdx !== undefined && pIdx !== -1) {
      const from = allNodes[i];
      const to = allNodes[pIdx];
      if (from && to) {
        edges.push({ from, to });
      }
    }
  }
  return edges;
};

export const getRandomPos = (width: number, height: number): Position => ({
  x: Math.floor(Math.random() * width),
  y: Math.floor(Math.random() * height)
});
