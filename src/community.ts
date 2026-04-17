import type { Graph } from "./types";

/**
 * Louvain community detection algorithm.
 * Returns a map of node ID → community ID.
 *
 * Reference: Blondel et al. "Fast unfolding of communities in large networks" (2008)
 */
export function detectCommunities(graph: Graph): Map<string, number> {
  const { nodes, edges } = graph;
  const n = nodes.length;

  if (n === 0) return new Map();
  if (n === 1) return new Map([[nodes[0].id, 0]]);

  // Index nodes
  const indexMap = new Map<string, number>();
  nodes.forEach((node, i) => indexMap.set(node.id, i));

  // Build weighted adjacency: adj[i] → Map<j, weight>
  const adj: Map<number, number>[] = Array.from({ length: n }, () => new Map());
  let totalWeight = 0;

  for (const edge of edges) {
    const si = indexMap.get(edge.source);
    const ti = indexMap.get(edge.target);
    if (si === undefined || ti === undefined || si === ti) continue;

    const w = edge.weight;
    adj[si].set(ti, (adj[si].get(ti) ?? 0) + w);
    adj[ti].set(si, (adj[ti].get(si) ?? 0) + w);
    totalWeight += w * 2;
  }

  if (totalWeight === 0) {
    // No edges — put nodes in singleton communities
    const result = new Map<string, number>();
    nodes.forEach((node, i) => result.set(node.id, i));
    return result;
  }

  // Node degrees
  const degrees = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    adj[i].forEach((w) => { degrees[i] += w; });
  }

  // Initial: each node in its own community
  const community = new Int32Array(n);
  for (let i = 0; i < n; i++) community[i] = i;

  // sigma_tot[c] = sum of degrees of all nodes in community c
  const sigmaTot = degrees.slice();

  // Phase 1: move nodes greedily to maximize modularity
  let improved = true;
  let iterations = 0;
  const MAX_ITER = 50;

  // Pre-allocate reusable Map for community weights
  const commWeights = new Map<number, number>();

  while (improved && iterations < MAX_ITER) {
    improved = false;
    iterations++;

    for (let i = 0; i < n; i++) {
      const currentComm = community[i];
      const ki = degrees[i];

      // Sum of edge weights from i to each neighboring community
      commWeights.clear();
      adj[i].forEach((w, j) => {
        const c = community[j];
        commWeights.set(c, (commWeights.get(c) ?? 0) + w);
      });

      // Temporarily remove i from its community
      sigmaTot[currentComm] -= ki;

      let bestComm = currentComm;
      let bestGain = 0;

      // ΔQ for moving i to community c = k_i_c / m - ki * σ_tot[c] / (2m²)
      // We compare against re-inserting into current community
      const gainCurrentComm = (commWeights.get(currentComm) ?? 0) / totalWeight
        - ki * sigmaTot[currentComm] / (totalWeight * totalWeight);

      commWeights.forEach((w, c) => {
        if (c === currentComm) return;
        const gain = w / totalWeight - ki * sigmaTot[c] / (totalWeight * totalWeight);
        const netGain = gain - gainCurrentComm;
        if (netGain > bestGain) {
          bestGain = netGain;
          bestComm = c;
        }
      });

      if (bestComm !== currentComm && bestGain > 1e-10) {
        community[i] = bestComm;
        sigmaTot[bestComm] += ki;
        improved = true;
      } else {
        // Re-insert into current community
        sigmaTot[currentComm] += ki;
      }
    }
  }

  // Renumber communities consecutively
  const commRemap = new Map<number, number>();
  let nextId = 0;

  const result = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const c = community[i];
    if (!commRemap.has(c)) {
      commRemap.set(c, nextId++);
    }
    result.set(nodes[i].id, commRemap.get(c)!);
  }

  // Merge tiny communities (< 2 members) into nearest larger one
  const commSizes = new Map<number, number>();
  result.forEach((c) => commSizes.set(c, (commSizes.get(c) ?? 0) + 1));

  result.forEach((c, nodeId) => {
    if (commSizes.get(c)! < 2) {
      const idx = indexMap.get(nodeId)!;
      let bestNeighborComm = -1;
      let bestEdgeWeight = -1;

      adj[idx].forEach((w, j) => {
        const nc = result.get(nodes[j].id)!;
        if (nc !== c && (commSizes.get(nc) ?? 0) >= 2 && w > bestEdgeWeight) {
          bestEdgeWeight = w;
          bestNeighborComm = nc;
        }
      });

      if (bestNeighborComm !== -1) {
        result.set(nodeId, bestNeighborComm);
        commSizes.set(c, (commSizes.get(c) ?? 0) - 1);
        commSizes.set(bestNeighborComm, (commSizes.get(bestNeighborComm) ?? 0) + 1);
      }
    }
  });

  return result;
}
