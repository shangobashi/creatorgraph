import type { RawUser, GraphNode, GraphEdge, Graph } from "./types";

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "and", "or", "in", "on", "at", "to", "for",
  "of", "by", "with", "that", "this", "it", "i", "my", "me", "we", "our",
  "he", "she", "they", "their", "your", "am", "be", "been", "was", "were",
  "do", "does", "did", "have", "has", "had", "will", "would", "can", "could",
  "should", "may", "might", "must", "not", "no", "from", "as", "but", "if",
  "into", "about", "up", "out", "so", "all", "just", "more", "also", "when",
  "what", "who", "how", "love", "work", "building", "working", "making", "using",
  "based", "former", "founder", "co", "ex", "new", "old", "big", "one", "two",
  "now", "then", "here", "there", "where", "get", "got", "go", "going", "want",
  "like", "know", "think", "say", "see", "look", "come", "take", "make", "need"
]);

const EDGE_THRESHOLD = 0.12;
const MAX_KEYWORD_USERS = 60; // Ignore keywords shared by too many users (too generic)

export function extractKeywords(bio: string): string[] {
  return bio
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && w.length < 20 && !STOP_WORDS.has(w));
}

export function buildGraph(users: RawUser[]): Graph {
  if (users.length === 0) {
    return { nodes: [], edges: [] };
  }

  // Extract keywords per user
  const keywordLists = users.map((u) => extractKeywords(u.bio));
  const keywordSets = keywordLists.map((kws) => new Set(kws));

  // Build inverted index: keyword → [userIndices]
  const invertedIndex = new Map<string, number[]>();
  for (let i = 0; i < users.length; i++) {
    for (const kw of keywordSets[i]) {
      if (!invertedIndex.has(kw)) invertedIndex.set(kw, []);
      invertedIndex.get(kw)!.push(i);
    }
  }

  // Count shared keywords between user pairs (only for pairs sharing ≥1 keyword)
  const pairShared = new Map<string, number>();
  invertedIndex.forEach((userIdxs) => {
    if (userIdxs.length < 2 || userIdxs.length > MAX_KEYWORD_USERS) return;
    for (let a = 0; a < userIdxs.length; a++) {
      for (let b = a + 1; b < userIdxs.length; b++) {
        const key = `${userIdxs[a]}|${userIdxs[b]}`;
        pairShared.set(key, (pairShared.get(key) ?? 0) + 1);
      }
    }
  });

  // Build edges using Jaccard similarity
  const edges: GraphEdge[] = [];
  pairShared.forEach((shared, key) => {
    const [ai, bi] = key.split("|").map(Number);
    const sizeA = keywordSets[ai].size;
    const sizeB = keywordSets[bi].size;
    if (sizeA === 0 || sizeB === 0) return;

    // Jaccard: |A ∩ B| / |A ∪ B|
    const sim = shared / (sizeA + sizeB - shared);
    if (sim >= EDGE_THRESHOLD) {
      edges.push({
        source: users[ai].username,
        target: users[bi].username,
        weight: sim
      });
    }
  });

  // Build initial nodes (centrality/scores computed later in signal.ts)
  const nodes: GraphNode[] = users.map((u) => ({
    id: u.username,
    username: u.username,
    displayName: u.displayName,
    bio: u.bio,
    profileUrl: u.profileUrl,
    communityId: 0,
    degree: 0,
    betweenness: 0,
    communityRank: 0,
    signalScore: 0
  }));

  return { nodes, edges };
}
