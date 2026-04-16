import type { Graph, GraphNode } from "./types";

const W_DEGREE = 0.35;
const W_BETWEENNESS = 0.45;
const W_COMMUNITY_RANK = 0.20;

// Approximate betweenness centrality using random BFS sampling (Brandes-like)
// Samples k source nodes instead of all nodes — O(k * E) instead of O(V * E)
function approximateBetweenness(
  n: number,
  adj: Map<number, number>[],
  sampleK: number
): Float64Array {
  const betweenness = new Float64Array(n);

  const sources: number[] = [];
  if (n <= sampleK) {
    for (let i = 0; i < n; i++) sources.push(i);
  } else {
    // Random sample without replacement
    const all = Array.from({ length: n }, (_, i) => i);
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    sources.push(...all.slice(0, sampleK));
  }

  const stack: number[] = [];
  const pred: number[][] = Array.from({ length: n }, () => []);
  const sigma = new Float64Array(n);
  const dist = new Int32Array(n);
  const delta = new Float64Array(n);

  for (const s of sources) {
    // Reset
    stack.length = 0;
    for (let i = 0; i < n; i++) {
      pred[i].length = 0;
      sigma[i] = 0;
      dist[i] = -1;
      delta[i] = 0;
    }

    sigma[s] = 1;
    dist[s] = 0;
    const queue: number[] = [s];
    let qi = 0;

    // BFS
    while (qi < queue.length) {
      const v = queue[qi++];
      stack.push(v);

      adj[v].forEach((_, w) => {
        if (dist[w] < 0) {
          queue.push(w);
          dist[w] = dist[v] + 1;
        }
        if (dist[w] === dist[v] + 1) {
          sigma[w] += sigma[v];
          pred[w].push(v);
        }
      });
    }

    // Accumulate
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      }
      if (w !== s) {
        betweenness[w] += delta[w];
      }
    }
  }

  // Scale by sample ratio
  const scale = n <= sampleK ? 1 : n / sampleK;
  for (let i = 0; i < n; i++) {
    betweenness[i] *= scale;
  }

  return betweenness;
}

function normalize(arr: Float64Array): Float64Array {
  const max = Math.max(...arr);
  if (max === 0) return new Float64Array(arr.length);
  return arr.map((v) => v / max);
}

export function computeSignal(graph: Graph, communityMap: Map<string, number>): GraphNode[] {
  const { nodes, edges } = graph;
  const n = nodes.length;

  if (n === 0) return [];

  const indexMap = new Map<string, number>();
  nodes.forEach((node, i) => indexMap.set(node.id, i));

  // Adjacency list
  const adj: Map<number, number>[] = Array.from({ length: n }, () => new Map());
  for (const edge of edges) {
    const si = indexMap.get(edge.source);
    const ti = indexMap.get(edge.target);
    if (si === undefined || ti === undefined || si === ti) continue;
    adj[si].set(ti, edge.weight);
    adj[ti].set(si, edge.weight);
  }

  // Degree centrality
  const degreeRaw = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    degreeRaw[i] = adj[i].size;
  }

  // Approximate betweenness centrality
  const sampleK = Math.min(n, Math.max(50, Math.floor(n * 0.15)));
  const betweennessRaw = approximateBetweenness(n, adj, sampleK);

  // Normalize
  const degreeNorm = normalize(degreeRaw);
  const betweennessNorm = normalize(betweennessRaw);

  // Community rank: degree rank within community
  const commGroups = new Map<number, number[]>();
  nodes.forEach((node, i) => {
    const c = communityMap.get(node.id) ?? 0;
    if (!commGroups.has(c)) commGroups.set(c, []);
    commGroups.get(c)!.push(i);
  });

  const communityRankRaw = new Float64Array(n);
  commGroups.forEach((members) => {
    const sorted = [...members].sort((a, b) => degreeRaw[b] - degreeRaw[a]);
    sorted.forEach((idx, rank) => {
      communityRankRaw[idx] = 1 - rank / Math.max(1, members.length - 1);
    });
  });

  // Final signal score
  const result: GraphNode[] = nodes.map((node, i) => {
    const signalScore =
      W_DEGREE * degreeNorm[i] +
      W_BETWEENNESS * betweennessNorm[i] +
      W_COMMUNITY_RANK * communityRankRaw[i];

    return {
      ...node,
      communityId: communityMap.get(node.id) ?? 0,
      degree: degreeRaw[i],
      betweenness: betweennessRaw[i],
      communityRank: communityRankRaw[i],
      signalScore
    };
  });

  return result;
}

export function describeRole(node: GraphNode, allNodes: GraphNode[]): string {
  const communities = new Set(allNodes.map((n) => n.communityId));
  const numCommunities = communities.size;

  // Check if node bridges multiple communities (high betweenness, edges to multiple communities)
  const normalizedBetweenness = node.betweenness / Math.max(1, ...allNodes.map((n) => n.betweenness));
  const normalizedDegree = node.degree / Math.max(1, ...allNodes.map((n) => n.degree));

  if (normalizedBetweenness > 0.6 && numCommunities > 2) {
    return "Bridge Node";
  }
  if (normalizedDegree > 0.7) {
    return "Cluster Hub";
  }
  if (normalizedBetweenness > 0.35) {
    return "Connector";
  }
  if (node.communityRank > 0.8) {
    return "Community Leader";
  }
  if (normalizedDegree < 0.1 && node.communityRank > 0.5) {
    return "Hidden Influencer";
  }
  return "Member";
}
