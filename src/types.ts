export interface RawUser {
  username: string;
  displayName: string;
  profileUrl: string;
  bio: string;
}

export interface GraphNode {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  profileUrl: string;
  communityId: number;
  degree: number;
  betweenness: number;
  communityRank: number;
  signalScore: number;
  keywords: string[];
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Tribe {
  id: number;
  label: string;
  keywords: string[];
  members: GraphNode[];
  color: string;
}

export interface SignalResult {
  username: string;
  displayName: string;
  signalScore: number;
  role: string;
  communityLabel: string;
}

export interface AnalysisResult {
  graph: Graph;
  tribes: Tribe[];
  topSignal: SignalResult[];
  scannedAt: number;
  totalUsers: number;
  totalEdges: number;
}

export interface Progress {
  rounds: number;
  idleRounds: number;
  extractedTotal: number;
  visibleCells: number;
  progressed: boolean;
  delayMs: number;
  elapsedMs: number;
}

export type StopReason = "idle" | "hardCap" | "maxUsers";

export interface ScanPhase {
  phase: "scanning" | "building" | "detecting" | "computing" | "done" | "error";
  message: string;
  progress?: number;
}
