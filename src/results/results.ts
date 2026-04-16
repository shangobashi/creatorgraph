import type { RawUser, AnalysisResult, GraphNode } from "../types";
import { buildGraph } from "../graph";
import { detectCommunities } from "../community";
import { computeSignal, describeRole } from "../signal";
import { buildTribes } from "../labeler";

// ─── Sanitize helpers ─────────────────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const loadingState = document.getElementById("loading-state")!;
const emptyState = document.getElementById("empty-state")!;
const mainResults = document.getElementById("main-results")!;
const loadingPhase = document.getElementById("loading-phase")!;
const loadingDetail = document.getElementById("loading-detail")!;
const loadingBarFill = document.getElementById("loading-bar-fill")!;
const pillCount = document.getElementById("pill-count")!;
const tribesGrid = document.getElementById("tribes-grid")!;
const signalList = document.getElementById("signal-list")!;
const graphCanvas = document.getElementById("graph-canvas") as HTMLCanvasElement;
const graphLegend = document.getElementById("graph-legend")!;

// ─── Utility ──────────────────────────────────────────────────────────────────
function setPhase(phase: string, detail: string, pct: number) {
  loadingPhase.textContent = phase;
  loadingDetail.textContent = detail;
  loadingBarFill.style.width = `${pct}%`;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ─── Load & run ───────────────────────────────────────────────────────────────
async function loadUsers(): Promise<RawUser[]> {
  const data = await chrome.storage.local.get("creatorgraph_raw_users");
  return (data["creatorgraph_raw_users"] as RawUser[]) || [];
}

async function saveAnalysis(result: AnalysisResult) {
  await chrome.storage.local.set({ creatorgraph_analysis: result });
}

async function main() {
  setPhase("Loading network data…", "Reading your scanned accounts", 5);
  await sleep(200);

  const users = await loadUsers();
  if (users.length === 0) {
    loadingState.style.display = "none";
    emptyState.style.display = "";
    return;
  }

  pillCount.textContent = `${users.length.toLocaleString()} accounts`;

  setPhase("Building graph…", `Connecting ${users.length.toLocaleString()} accounts via bio similarity`, 15);
  await sleep(100);

  const graph = buildGraph(users);

  setPhase("Detecting tribes…", `Running Louvain on ${graph.edges.length.toLocaleString()} connections`, 40);
  await sleep(50);

  const communityMap = detectCommunities(graph);

  setPhase("Computing SIGNAL scores…", "Degree + betweenness centrality", 65);
  await sleep(50);

  const scoredNodes = computeSignal(graph, communityMap);
  graph.nodes = scoredNodes;

  setPhase("Labeling tribes…", "Analyzing bio keywords to name your communities", 80);
  await sleep(50);

  const tribes = buildTribes(scoredNodes);
  const tribeColorMap = new Map<number, string>();
  tribes.forEach((t) => tribeColorMap.set(t.id, t.color));

  const topSignal = [...scoredNodes]
    .sort((a, b) => b.signalScore - a.signalScore)
    .slice(0, 20)
    .map((n) => ({
      username: n.username,
      displayName: n.displayName,
      signalScore: n.signalScore,
      role: describeRole(n, scoredNodes),
      communityLabel: tribes.find((t) => t.id === n.communityId)?.label ?? `Group ${n.communityId}`
    }));

  const result: AnalysisResult = {
    graph,
    tribes,
    topSignal,
    scannedAt: Date.now(),
    totalUsers: users.length,
    totalEdges: graph.edges.length
  };

  setPhase("Rendering…", "Building your tribe map and signal leaderboard", 92);
  await sleep(100);

  await saveAnalysis(result);
  renderResults(result, tribeColorMap);

  setPhase("Done!", "", 100);
  await sleep(200);

  loadingState.style.display = "none";
  mainResults.style.display = "";

  initGraph(graph, tribes, tribeColorMap);
}

// ─── Render tribes ────────────────────────────────────────────────────────────
function renderResults(result: AnalysisResult, colorMap: Map<number, string>) {
  renderTribes(result.tribes);
  renderSignal(result.topSignal, colorMap);
  renderLegend(result.tribes);
}

function makeTribeCard(tribe: { color: string; members: { length: number }; label: string; keywords: string[] }) {
  const card = document.createElement("div");
  card.className = "tribe-card";

  const accent = document.createElement("div");
  accent.className = "tribe-card-accent";
  accent.style.background = tribe.color;

  const count = document.createElement("div");
  count.className = "tribe-count";
  count.style.color = tribe.color;
  count.textContent = String(tribe.members.length);

  const name = document.createElement("div");
  name.className = "tribe-name";
  name.textContent = tribe.label;

  const kws = document.createElement("div");
  kws.className = "tribe-keywords";
  tribe.keywords.slice(0, 5).forEach((k) => {
    const span = document.createElement("span");
    span.className = "tribe-keyword";
    span.textContent = k;
    kws.appendChild(span);
  });

  card.append(accent, count, name, kws);
  return card;
}

function renderTribes(tribes: AnalysisResult["tribes"]) {
  tribesGrid.innerHTML = "";
  tribes.slice(0, 12).forEach((tribe) => {
    tribesGrid.appendChild(makeTribeCard(tribe));
  });
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function avatarColors(username: string): [string, string] {
  const pairs: [string, string][] = [
    ["#7cf2d3", "#78a6ff"],
    ["#78a6ff", "#c77dff"],
    ["#ff6b9d", "#ffd166"],
    ["#06d6a0", "#118ab2"],
    ["#ffd166", "#ef476f"],
    ["#c77dff", "#7cf2d3"],
  ];
  return pairs[hashStr(username) % pairs.length];
}

function makeSignalItem(
  item: AnalysisResult["topSignal"][0],
  rank: number
): HTMLElement {
  const [ca, cb] = avatarColors(item.username);
  const initials = (item.displayName || item.username).slice(0, 2).toUpperCase();
  const pct = 100; // set per-call below

  const el = document.createElement("a");
  el.className = "signal-item";
  el.href = `https://x.com/${encodeURIComponent(item.username)}`;
  el.target = "_blank";
  el.rel = "noopener noreferrer";

  const rankEl = document.createElement("div");
  rankEl.className = "signal-rank" + (rank < 3 ? " top3" : "");
  rankEl.textContent = String(rank + 1);

  const avatar = document.createElement("div");
  avatar.className = "signal-avatar";
  avatar.style.background = `linear-gradient(135deg,${ca},${cb})`;
  avatar.textContent = initials;

  const info = document.createElement("div");
  info.className = "signal-info";

  const nameEl = document.createElement("div");
  nameEl.className = "signal-name";
  nameEl.textContent = item.displayName || item.username;

  const handleEl = document.createElement("div");
  handleEl.className = "signal-handle";
  handleEl.textContent = `@${item.username} · ${item.communityLabel}`;

  info.append(nameEl, handleEl);

  const role = document.createElement("div");
  role.className = "signal-role";
  role.textContent = item.role;

  const barWrap = document.createElement("div");
  barWrap.className = "signal-bar-wrap";
  const bar = document.createElement("div");
  bar.className = "signal-bar";
  // width set after max is known
  barWrap.appendChild(bar);

  el.append(rankEl, avatar, info, role, barWrap);
  el.dataset.score = String(item.signalScore);
  el.dataset.bar = bar.style.width; // placeholder
  (el as any).__bar = bar;

  return el;
}

function renderSignal(topSignal: AnalysisResult["topSignal"], _colorMap: Map<number, string>) {
  signalList.innerHTML = "";
  const maxScore = topSignal[0]?.signalScore ?? 1;
  topSignal.forEach((item, i) => {
    const el = makeSignalItem(item, i);
    const pct = Math.round((item.signalScore / maxScore) * 100);
    (el as any).__bar.style.width = `${pct}%`;
    signalList.appendChild(el);
  });
}

function renderLegend(tribes: AnalysisResult["tribes"]) {
  graphLegend.innerHTML = "";
  tribes.slice(0, 12).forEach((tribe) => {
    const item = document.createElement("div");
    item.className = "legend-item";

    const dot = document.createElement("div");
    dot.className = "legend-dot";
    dot.style.background = tribe.color;

    const label = document.createElement("span");
    label.textContent = `${tribe.label} (${tribe.members.length})`;

    item.append(dot, label);
    graphLegend.appendChild(item);
  });
}

// ─── Force-directed graph ─────────────────────────────────────────────────────
interface FNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  label: string;
  profileUrl: string;
}

interface FEdge { s: number; t: number; w: number; }

function initGraph(
  graph: { nodes: GraphNode[]; edges: { source: string; target: string; weight: number }[] },
  tribes: AnalysisResult["tribes"],
  colorMap: Map<number, string>
) {
  const container = graphCanvas.parentElement!;
  const W = container.clientWidth;
  const H = container.clientHeight;
  graphCanvas.width = W;
  graphCanvas.height = H;

  const ctx = graphCanvas.getContext("2d")!;

  const sorted = [...graph.nodes].sort((a, b) => b.signalScore - a.signalScore);
  const MAX_NODES = 600;
  const subset = sorted.slice(0, MAX_NODES);
  const subsetIds = new Set(subset.map((n) => n.id));
  const indexMap = new Map<string, number>();
  subset.forEach((n, i) => indexMap.set(n.id, i));

  const fnodes: FNode[] = subset.map((n) => {
    const color = colorMap.get(n.communityId) ?? "#7cf2d3";
    const radius = 3 + Math.min(12, n.signalScore * 28);
    const angle = (hashStr(n.id) / 0xffffffff) * Math.PI * 2;
    const r = 50 + (hashStr(n.id + "r") / 0xffffffff) * (Math.min(W, H) * 0.38);
    return {
      id: n.id,
      x: W / 2 + Math.cos(angle) * r,
      y: H / 2 + Math.sin(angle) * r,
      vx: 0, vy: 0, radius, color,
      label: n.username,
      profileUrl: n.profileUrl
    };
  });

  const fedges: FEdge[] = graph.edges
    .filter((e) => subsetIds.has(e.source) && subsetIds.has(e.target))
    .map((e) => ({ s: indexMap.get(e.source)!, t: indexMap.get(e.target)!, w: e.weight }));

  const IDEAL = 60, REPEL = 800, DAMP = 0.82, DECAY = 0.0028;
  let alpha = 1;

  function tick() {
    const n = fnodes.length;
    for (let i = 0; i < n; i++) {
      let fx = 0, fy = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = fnodes[i].x - fnodes[j].x;
        const dy = fnodes[i].y - fnodes[j].y;
        const d2 = dx * dx + dy * dy + 0.01;
        const f = REPEL / d2;
        fx += dx * f; fy += dy * f;
      }
      fnodes[i].vx += fx * alpha;
      fnodes[i].vy += fy * alpha;
    }
    fedges.forEach(({ s, t, w }) => {
      const dx = fnodes[t].x - fnodes[s].x;
      const dy = fnodes[t].y - fnodes[s].y;
      const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
      const f = (dist - IDEAL * (1 - w * 0.4)) / dist * 0.06 * alpha;
      fnodes[s].vx += dx * f; fnodes[s].vy += dy * f;
      fnodes[t].vx -= dx * f; fnodes[t].vy -= dy * f;
    });
    fnodes.forEach((node) => {
      node.vx += (W / 2 - node.x) * 0.004 * alpha;
      node.vy += (H / 2 - node.y) * 0.004 * alpha;
      node.vx *= DAMP; node.vy *= DAMP;
      node.x = Math.max(node.radius, Math.min(W - node.radius, node.x + node.vx));
      node.y = Math.max(node.radius, Math.min(H - node.radius, node.y + node.vy));
    });
    alpha = Math.max(0.001, alpha - DECAY);
  }

  let camX = 0, camY = 0, camScale = 1, hoveredIdx = -1;
  let dragging = false, lastMX = 0, lastMY = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(camX, camY);
    ctx.scale(camScale, camScale);

    fedges.forEach(({ s, t, w }) => {
      ctx.globalAlpha = 0.06 + w * 0.12;
      ctx.strokeStyle = "#7cf2d3";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(fnodes[s].x, fnodes[s].y);
      ctx.lineTo(fnodes[t].x, fnodes[t].y);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
    fnodes.forEach((node, i) => {
      const hov = i === hoveredIdx;
      const r = node.radius * (hov ? 1.5 : 1);
      if (node.radius > 8 || hov) {
        const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3);
        grd.addColorStop(0, node.color + "44");
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 3, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
      if (hov) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5 / camScale;
        ctx.stroke();
        ctx.font = `${11 / camScale}px Manrope, sans-serif`;
        ctx.fillStyle = "#eef6ff";
        ctx.textAlign = "center";
        ctx.fillText("@" + node.label, node.x, node.y - r - 6 / camScale);
      }
    });
    ctx.restore();
  }

  function loop() {
    if (alpha > 0.01) tick();
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function toWorld(cx: number, cy: number): [number, number] {
    return [(cx - camX) / camScale, (cy - camY) / camScale];
  }

  graphCanvas.addEventListener("mousemove", (e) => {
    if (dragging) {
      camX += e.clientX - lastMX; camY += e.clientY - lastMY;
      lastMX = e.clientX; lastMY = e.clientY;
      return;
    }
    const rect = graphCanvas.getBoundingClientRect();
    const [wx, wy] = toWorld(e.clientX - rect.left, e.clientY - rect.top);
    hoveredIdx = -1;
    for (let i = 0; i < fnodes.length; i++) {
      const dx = fnodes[i].x - wx, dy = fnodes[i].y - wy;
      if (dx * dx + dy * dy <= fnodes[i].radius * fnodes[i].radius * 4) { hoveredIdx = i; break; }
    }
    graphCanvas.style.cursor = hoveredIdx >= 0 ? "pointer" : "grab";
  });

  graphCanvas.addEventListener("mousedown", (e) => {
    dragging = true; lastMX = e.clientX; lastMY = e.clientY;
    graphCanvas.style.cursor = "grabbing";
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    graphCanvas.style.cursor = hoveredIdx >= 0 ? "pointer" : "grab";
  });

  graphCanvas.addEventListener("click", () => {
    if (hoveredIdx >= 0) window.open(fnodes[hoveredIdx].profileUrl, "_blank", "noopener");
  });

  graphCanvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const f = e.deltaY > 0 ? 0.88 : 1.14;
    const rect = graphCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    camX = mx - (mx - camX) * f; camY = my - (my - camY) * f;
    camScale = Math.max(0.15, Math.min(6, camScale * f));
  }, { passive: false });

  document.getElementById("zoom-in")?.addEventListener("click", () => {
    const f = 1.3;
    camX = W / 2 - (W / 2 - camX) * f; camY = H / 2 - (H / 2 - camY) * f;
    camScale = Math.min(6, camScale * f);
  });
  document.getElementById("zoom-out")?.addEventListener("click", () => {
    const f = 0.77;
    camX = W / 2 - (W / 2 - camX) * f; camY = H / 2 - (H / 2 - camY) * f;
    camScale = Math.max(0.15, camScale * f);
  });
  document.getElementById("zoom-reset")?.addEventListener("click", () => { camX = 0; camY = 0; camScale = 1; });

  document.getElementById("export-graph-btn")?.addEventListener("click", () => {
    requestAnimationFrame(() => {
      const link = document.createElement("a");
      link.download = "creatorgraph-network.png";
      link.href = graphCanvas.toDataURL("image/png");
      link.click();
    });
  });
}

// ─── Tribes share card export ─────────────────────────────────────────────────
document.getElementById("export-tribes-btn")?.addEventListener("click", async () => {
  const data = await chrome.storage.local.get("creatorgraph_analysis");
  const analysis = data["creatorgraph_analysis"] as AnalysisResult | undefined;
  if (!analysis) return;

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#07111d";
  ctx.fillRect(0, 0, 1200, 630);
  const grd = ctx.createLinearGradient(0, 0, 1200, 630);
  grd.addColorStop(0, "rgba(124,242,211,0.08)");
  grd.addColorStop(1, "rgba(120,166,255,0.05)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 1200, 630);

  ctx.font = "bold 14px sans-serif";
  ctx.fillStyle = "#7cf2d3";
  ctx.textAlign = "left";
  ctx.fillText("CREATORGRAPH", 60, 60);

  ctx.font = "bold 48px sans-serif";
  ctx.fillStyle = "#eef6ff";
  ctx.fillText("My Twitter Tribes", 60, 120);

  ctx.font = "16px sans-serif";
  ctx.fillStyle = "rgba(238,246,255,0.6)";
  ctx.fillText(
    `${analysis.totalUsers.toLocaleString()} accounts · ${analysis.tribes.length} tribes`,
    60, 155
  );

  const tiles = analysis.tribes.slice(0, 6);
  const cols = Math.min(3, tiles.length);
  const cW = 340, cH = 100, pX = 60, pY = 200, gX = 30, gY = 20;

  tiles.forEach((tribe, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pX + col * (cW + gX);
    const y = pY + row * (cH + gY);

    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.rect(x, y, cW, cH);
    ctx.fill();

    ctx.fillStyle = tribe.color;
    ctx.fillRect(x, y, cW, 3);

    ctx.font = "bold 32px sans-serif";
    ctx.fillStyle = tribe.color;
    ctx.textAlign = "left";
    ctx.fillText(String(tribe.members.length), x + 18, y + 46);

    ctx.font = "bold 15px sans-serif";
    ctx.fillStyle = "#eef6ff";
    ctx.fillText(tribe.label, x + 18, y + 70);

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(238,246,255,0.5)";
    ctx.fillText(tribe.keywords.slice(0, 3).join(" · "), x + 18, y + 90);
  });

  ctx.font = "13px sans-serif";
  ctx.fillStyle = "rgba(238,246,255,0.35)";
  ctx.textAlign = "right";
  ctx.fillText("Made by Shango Bashi", 1140, 610);

  const link = document.createElement("a");
  link.download = "creatorgraph-tribes.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
});

// ─── Boot ─────────────────────────────────────────────────────────────────────
void main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  loadingPhase.textContent = "Error loading results";
  loadingDetail.textContent = msg;
});
