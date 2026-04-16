const analyzeBtn = document.getElementById("analyzeBtn") as HTMLButtonElement;
const viewResultsBtn = document.getElementById("viewResultsBtn") as HTMLButtonElement;
const statusEl = document.getElementById("status") as HTMLElement;
const lastResultEl = document.getElementById("lastResult") as HTMLElement;
const lastResultBody = document.getElementById("lastResultBody") as HTMLElement;

function setStatus(msg: string) {
  statusEl.textContent = msg;
}

async function loadLastResult() {
  try {
    const data = await chrome.storage.local.get("creatorgraph_analysis");
    const analysis = data["creatorgraph_analysis"];
    if (!analysis) return;

    const date = new Date(analysis.scannedAt).toLocaleDateString();
    lastResultBody.innerHTML = `
      <strong style="color:#7cf2d3">${analysis.totalUsers.toLocaleString()}</strong> accounts
      &middot; <strong style="color:#78a6ff">${analysis.tribes?.length ?? 0}</strong> tribes<br>
      Analyzed ${date}
    `;
    lastResultEl.style.display = "";
  } catch {
    // no previous result
  }
}

analyzeBtn.addEventListener("click", async () => {
  analyzeBtn.disabled = true;
  setStatus("Starting scan…");

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url?.match(/(?:twitter|x)\.com\/[^/]+\/following/)) {
      setStatus("⚠ Go to your X /following page first.");
      analyzeBtn.disabled = false;
      return;
    }

    const res = await chrome.runtime.sendMessage({ action: "CREATORGRAPH_START" }) as { ok: boolean; message?: string };
    if (!res?.ok) {
      setStatus(res?.message || "Failed to start scan.");
      analyzeBtn.disabled = false;
      return;
    }

    setStatus("Scanning… keep this tab open.");
    // Re-enable after 3s so user can retry if needed
    setTimeout(() => {
      analyzeBtn.disabled = false;
      setStatus("Scan running in the tab.");
    }, 3000);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus("Error: " + msg);
    analyzeBtn.disabled = false;
  }
});

viewResultsBtn?.addEventListener("click", () => {
  const url = chrome.runtime.getURL("results/results.html");
  chrome.tabs.create({ url });
});

// Listen for storage changes to show "View Results" when analysis completes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes["creatorgraph_analysis"]) {
    void loadLastResult();
    setStatus("Analysis complete!");
    analyzeBtn.disabled = false;
  }
});

void loadLastResult();
