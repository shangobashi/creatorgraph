import type { GraphNode, Tribe } from "./types";

// Predefined tribe labels based on keyword clusters
const TRIBE_PATTERNS: [string, string[]][] = [
  ["AI Builders", ["ai", "ml", "llm", "gpt", "claude", "openai", "deeplearning", "machinelearning", "artificialintelligence", "neural", "transformer"]],
  ["Crypto & Web3", ["crypto", "bitcoin", "ethereum", "defi", "nft", "blockchain", "web3", "solana", "btc", "eth", "dao"]],
  ["Indie Hackers", ["indie", "indiehacker", "buildinpublic", "saas", "bootstrap", "mrr", "arr", "solofounder", "product", "startup"]],
  ["VC & Investors", ["vc", "venturecapital", "investor", "fund", "portfolio", "angel", "seed", "investment", "investing"]],
  ["Developers", ["developer", "engineer", "programming", "code", "software", "typescript", "python", "rust", "javascript", "backend", "frontend", "fullstack"]],
  ["Founders", ["founder", "ceo", "cofounder", "cto", "startup", "company", "entrepreneurship", "scale", "growth"]],
  ["Content Creators", ["creator", "youtube", "podcast", "content", "newsletter", "writer", "author", "media"]],
  ["Design", ["design", "designer", "ux", "ui", "figma", "product", "visual", "brand", "typography"]],
  ["Research & Science", ["research", "researcher", "phd", "science", "data", "analysis", "paper", "academia", "university"]],
  ["Finance & Trading", ["trading", "finance", "stocks", "quant", "market", "economics", "fintech", "portfolio", "hedge"]],
  ["Marketing & Growth", ["marketing", "growth", "seo", "ads", "conversion", "acquisition", "brand", "retention"]],
  ["Open Source", ["opensource", "github", "contributor", "community", "developer", "oss", "maintainer"]],
];

const TRIBE_COLORS = [
  "#7cf2d3", // teal (primary)
  "#78a6ff", // blue
  "#ff6b9d", // pink
  "#ffd166", // yellow
  "#a8edea", // light teal
  "#f7b267", // orange
  "#c77dff", // purple
  "#06d6a0", // green
  "#ef476f", // red
  "#118ab2", // dark blue
  "#ffd60a", // bright yellow
  "#8338ec", // deep purple
];

export function labelTribe(members: GraphNode[], tribeId: number): { label: string; keywords: string[] } {
  // Count keyword frequency across all member bios
  const kwCount = new Map<string, number>();
  for (const node of members) {
    const kws = new Set(node.keywords);
    for (const kw of kws) {
      kwCount.set(kw, (kwCount.get(kw) ?? 0) + 1);
    }
  }

  // Compute TF: term frequency within tribe
  const tf = new Map<string, number>();
  const total = members.length;
  kwCount.forEach((count, kw) => {
    tf.set(kw, count / total);
  });

  // Score against predefined patterns
  let bestLabel = "";
  let bestScore = 0;

  for (const [label, patterns] of TRIBE_PATTERNS) {
    let score = 0;
    for (const pattern of patterns) {
      score += tf.get(pattern) ?? 0;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLabel = label;
    }
  }

  // If no strong pattern match, use top keywords
  const topKws = [...tf.entries()]
    .filter(([, v]) => v > 0.1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k]) => k);

  if (!bestLabel || bestScore < 0.05) {
    if (topKws.length > 0) {
      bestLabel = topKws
        .slice(0, 2)
        .map((k) => k.charAt(0).toUpperCase() + k.slice(1))
        .join(" & ");
    } else {
      bestLabel = `Group ${tribeId + 1}`;
    }
  }

  return { label: bestLabel, keywords: topKws };
}

export function buildTribes(nodes: GraphNode[]): Tribe[] {
  const commGroups = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    if (!commGroups.has(node.communityId)) commGroups.set(node.communityId, []);
    commGroups.get(node.communityId)!.push(node);
  }

  // Sort by size (largest tribe first)
  const sorted = [...commGroups.entries()].sort((a, b) => b[1].length - a[1].length);

  const tribes: Tribe[] = [];
  sorted.forEach(([id, members], colorIdx) => {
    if (members.length < 2) return;
    const { label, keywords } = labelTribe(members, id);
    tribes.push({
      id,
      label,
      keywords,
      members,
      color: TRIBE_COLORS[colorIdx % TRIBE_COLORS.length]
    });
  });

  return tribes;
}
