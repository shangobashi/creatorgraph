/* CreatorGraph — landing page JS
   Ambient graph canvas + static preview sections */

// ── Ambient particle graph (background canvas) ────────────────────────────
(function initBgCanvas() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let W = 0, H = 0;
  const COLORS = ["#f59e0b", "#8b5cf6", "#e879f9", "#10b981", "#f97316"];
  const NODE_COUNT = 60;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener("resize", resize);

  const nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    r: 1.5 + Math.random() * 3,
    color: COLORS[i % COLORS.length]
  }));

  const MAX_DIST = 180;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Edges
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          ctx.globalAlpha = (1 - dist / MAX_DIST) * 0.18;
          ctx.strokeStyle = nodes[i].color;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    // Nodes
    nodes.forEach((node) => {
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }

  function update() {
    nodes.forEach((node) => {
      node.x += node.vx;
      node.y += node.vy;
      if (node.x < 0 || node.x > W) node.vx *= -1;
      if (node.y < 0 || node.y > H) node.vy *= -1;
    });
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();

// ── Mini graph hero canvas ────────────────────────────────────────────────
(function initMiniGraph() {
  const canvas = document.getElementById("mini-graph");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const TRIBE_COLORS = ["#f59e0b", "#8b5cf6", "#e879f9", "#10b981", "#f97316", "#06b6d4"];
  const TRIBES = [
    { count: 18, color: "#f59e0b", cx: 0.28, cy: 0.35 },
    { count: 14, color: "#8b5cf6", cx: 0.65, cy: 0.28 },
    { count: 11, color: "#e879f9", cx: 0.72, cy: 0.68 },
    { count: 9,  color: "#10b981", cx: 0.35, cy: 0.70 },
  ];

  let W = 0, H = 0;

  function resize() {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;
  }

  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // Generate nodes per tribe
  const nodes = [];
  TRIBES.forEach((tribe, ti) => {
    for (let i = 0; i < tribe.count; i++) {
      const angle = (i / tribe.count) * Math.PI * 2;
      const r = 20 + Math.random() * 40;
      nodes.push({
        x: tribe.cx + (Math.cos(angle) * r) / W,
        y: tribe.cy + (Math.sin(angle) * r) / H,
        vx: (Math.random() - 0.5) * 0.0006,
        vy: (Math.random() - 0.5) * 0.0006,
        radius: 2 + Math.random() * 4,
        color: tribe.color,
        tribe: ti
      });
    }
  });

  // Edges (within tribe)
  const edges = [];
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[i].tribe === nodes[j].tribe && Math.random() < 0.25) {
        edges.push([i, j]);
      }
    }
  }
  // A few cross-tribe bridge edges
  for (let k = 0; k < 6; k++) {
    const a = Math.floor(Math.random() * nodes.length);
    const b = Math.floor(Math.random() * nodes.length);
    if (a !== b) edges.push([a, b, true]);
  }

  let t = 0;

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Edges
    edges.forEach(([a, b, bridge]) => {
      const na = nodes[a], nb = nodes[b];
      ctx.globalAlpha = bridge ? 0.2 : 0.12;
      ctx.strokeStyle = bridge ? "#eef6ff" : na.color;
      ctx.lineWidth = bridge ? 0.8 : 0.6;
      ctx.beginPath();
      ctx.moveTo(na.x * W, na.y * H);
      ctx.lineTo(nb.x * W, nb.y * H);
      ctx.stroke();
    });

    // Tribe glow
    TRIBES.forEach((tribe) => {
      const grd = ctx.createRadialGradient(
        tribe.cx * W, tribe.cy * H, 0,
        tribe.cx * W, tribe.cy * H, 80
      );
      grd.addColorStop(0, tribe.color + "18");
      grd.addColorStop(1, "transparent");
      ctx.globalAlpha = 0.6 + 0.2 * Math.sin(t * 0.02 + TRIBES.indexOf(tribe));
      ctx.beginPath();
      ctx.arc(tribe.cx * W, tribe.cy * H, 80, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    });

    // Nodes
    nodes.forEach((node) => {
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(node.x * W, node.y * H, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = node.color;
      ctx.fill();
    });

    ctx.globalAlpha = 1;
  }

  function update() {
    t++;
    nodes.forEach((node, i) => {
      const tribe = TRIBES[node.tribe];
      // Pull toward tribe center
      node.vx += (tribe.cx - node.x) * 0.00006;
      node.vy += (tribe.cy - node.y) * 0.00006;
      // Gentle drift
      node.vx += (Math.random() - 0.5) * 0.0002;
      node.vy += (Math.random() - 0.5) * 0.0002;
      // Damping
      node.vx *= 0.97;
      node.vy *= 0.97;

      node.x = Math.max(0.04, Math.min(0.96, node.x + node.vx));
      node.y = Math.max(0.04, Math.min(0.96, node.y + node.vy));
    });
  }

  function loop() {
    if (W > 0 && H > 0) { update(); draw(); }
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();

// ── Tribes preview section ─────────────────────────────────────────────────
(function renderTribesPreview() {
  const container = document.getElementById("tribes-preview");
  if (!container) return;

  const tribes = [
    { name: "AI Builders", count: 34, color: "#f59e0b" },
    { name: "Indie Hackers", count: 22, color: "#8b5cf6" },
    { name: "Crypto & Web3", count: 19, color: "#e879f9" },
    { name: "Founders", count: 15, color: "#10b981" },
    { name: "Developers", count: 28, color: "#f97316" },
  ];

  tribes.forEach(function(tribe) {
    var el = document.createElement("div");
    el.className = "preview-tribe";

    var dot = document.createElement("div");
    dot.className = "preview-tribe-dot";
    dot.style.background = tribe.color;

    var name = document.createElement("div");
    name.className = "preview-tribe-name";
    name.textContent = tribe.name;

    var count = document.createElement("div");
    count.className = "preview-tribe-count";
    count.style.color = tribe.color;
    count.textContent = String(tribe.count);

    el.append(dot, name, count);
    container.appendChild(el);
  });
})();

// ── Signal preview section ─────────────────────────────────────────────────
(function renderSignalPreview() {
  var container = document.getElementById("signal-preview");
  if (!container) return;

  var items = [
    { name: "Alice R.", handle: "aliceR", role: "Bridge Node", score: 97, ca: "#f59e0b", cb: "#8b5cf6" },
    { name: "Dev S.",   handle: "devS",   role: "Cluster Hub",  score: 88, ca: "#8b5cf6", cb: "#e879f9" },
    { name: "Max K.",   handle: "maxK",   role: "Connector",    score: 79, ca: "#e879f9", cb: "#f59e0b" },
    { name: "Sam L.",   handle: "samL",   role: "Hidden Influencer", score: 71, ca: "#10b981", cb: "#8b5cf6" },
    { name: "Pat O.",   handle: "patO",   role: "Community Leader",  score: 64, ca: "#f97316", cb: "#e879f9" },
  ];

  items.forEach(function(item, i) {
    var el = document.createElement("div");
    el.className = "preview-signal-item";

    var rank = document.createElement("div");
    rank.className = "preview-signal-rank" + (i < 3 ? " top" : "");
    rank.textContent = String(i + 1);

    var avatar = document.createElement("div");
    avatar.className = "preview-avatar";
    avatar.style.background = "linear-gradient(135deg," + item.ca + "," + item.cb + ")";
    avatar.textContent = item.name.slice(0, 2).toUpperCase();

    var info = document.createElement("div");
    info.className = "preview-signal-info";
    var nm = document.createElement("div");
    nm.className = "preview-signal-name";
    nm.textContent = item.name;
    var role = document.createElement("div");
    role.className = "preview-signal-role";
    role.textContent = item.role;
    info.append(nm, role);

    var barWrap = document.createElement("div");
    barWrap.className = "preview-signal-bar";
    var bar = document.createElement("div");
    bar.className = "preview-signal-bar-fill";
    bar.style.width = item.score + "%";
    barWrap.appendChild(bar);

    el.append(rank, avatar, info, barWrap);
    container.appendChild(el);
  });
})();

// ── Smooth scroll ──────────────────────────────────────────────────────────
document.querySelectorAll("a[href^='#']").forEach(function(link) {
  link.addEventListener("click", function(e) {
    var id = link.getAttribute("href").slice(1);
    var target = document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    var top = target.getBoundingClientRect().top + window.scrollY - 70;
    window.scrollTo({ top: top, behavior: "smooth" });
  });
});

// ── Nav scroll tint ────────────────────────────────────────────────────────
(function() {
  var nav = document.querySelector(".nav");
  if (!nav) return;
  window.addEventListener("scroll", function() {
    if (window.scrollY > 40) {
      nav.style.background = "rgba(14,13,19,0.96)";
    } else {
      nav.style.background = "rgba(14,13,19,0.85)";
    }
  }, { passive: true });
})();
