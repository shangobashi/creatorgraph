let overlay: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;
let progressEl: HTMLElement | null = null;
let countEl: HTMLElement | null = null;

const OVERLAY_ID = "creatorgraph-overlay";

export function ensureUI(): void {
  if (document.getElementById(OVERLAY_ID)) return;

  const style = document.createElement("style");
  style.textContent = `
    #creatorgraph-overlay {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 999999;
      background: rgba(7, 17, 29, 0.96);
      border: 1px solid rgba(124, 242, 211, 0.25);
      border-radius: 16px;
      padding: 18px 22px;
      min-width: 280px;
      max-width: 340px;
      font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
      box-shadow: 0 24px 64px rgba(0,0,0,0.5);
      backdrop-filter: blur(12px);
    }
    #creatorgraph-overlay .cg-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }
    #creatorgraph-overlay .cg-logo {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: linear-gradient(135deg, #7cf2d3, #78a6ff);
    }
    #creatorgraph-overlay .cg-name {
      color: #eef6ff;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: 0.02em;
    }
    #creatorgraph-overlay .cg-status {
      color: rgba(238, 246, 255, 0.7);
      font-size: 12px;
      line-height: 1.5;
      margin-bottom: 10px;
    }
    #creatorgraph-overlay .cg-count {
      color: #7cf2d3;
      font-size: 22px;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      margin-bottom: 4px;
    }
    #creatorgraph-overlay .cg-progress {
      width: 100%;
      height: 3px;
      background: rgba(124, 242, 211, 0.15);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 12px;
    }
    #creatorgraph-overlay .cg-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #7cf2d3, #78a6ff);
      border-radius: 2px;
      width: 0%;
      transition: width 0.3s ease;
      animation: cg-pulse 1.5s ease-in-out infinite;
    }
    @keyframes cg-pulse {
      0%, 100% { opacity: 0.9; }
      50% { opacity: 0.5; }
    }
  `;
  document.head.appendChild(style);

  overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <div class="cg-header">
      <div class="cg-logo"></div>
      <div class="cg-name">CreatorGraph</div>
    </div>
    <div class="cg-count" id="cg-count">0</div>
    <div class="cg-status" id="cg-status">Initializing…</div>
    <div class="cg-progress"><div class="cg-progress-bar" id="cg-bar"></div></div>
  `;

  document.body.appendChild(overlay);

  statusEl = document.getElementById("cg-status");
  progressEl = document.getElementById("cg-bar");
  countEl = document.getElementById("cg-count");
}

export function uiSetStatus(msg: string): void {
  if (statusEl) statusEl.textContent = msg;
}

export function uiSetCount(n: number): void {
  if (countEl) countEl.textContent = n.toLocaleString();
}

export function uiSetProgress(pct: number): void {
  if (progressEl) progressEl.style.width = `${Math.min(100, pct)}%`;
}

export function uiRemove(): void {
  overlay?.remove();
  overlay = null;
}
