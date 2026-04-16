import { parseVisibleUsers } from "./parser";
import { UserStore } from "./store";
import { runScrollLoop } from "./scroller";
import { saveRawUsers } from "./storage";
import { ensureUI, uiSetStatus, uiSetCount, uiSetProgress } from "./ui";

declare global {
  interface Window {
    __CREATORGRAPH_RUNNING__?: boolean;
    __CREATORGRAPH_LISTENER_READY__?: boolean;
  }
}

function isFollowingPage(): boolean {
  const hostOk = ["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(location.hostname);
  const pathOk = location.pathname.includes("/following");
  return hostOk && pathOk;
}

async function runScan() {
  if (!isFollowingPage()) {
    ensureUI();
    uiSetStatus("Navigate to your /following page first.");
    return;
  }

  ensureUI();
  uiSetStatus("Scanning your following list…");
  uiSetProgress(5);

  const store = new UserStore();

  const result = await runScrollLoop({
    onTick: (tick) => {
      const visible = parseVisibleUsers();
      store.add(visible);

      uiSetCount(store.size());
      uiSetStatus(tick.progressed ? "Scanning…" : "Scanning (waiting for content)…");

      // Progress is indeterminate during scan, animate loosely
      const pseudoPct = Math.min(85, 5 + (tick.rounds / 400) * 80);
      uiSetProgress(pseudoPct);
    }
  });

  uiSetStatus(`Scan complete — ${store.size().toLocaleString()} accounts found. Building graph…`);
  uiSetProgress(90);

  const users = store.values();
  await saveRawUsers(users);

  uiSetStatus(`Done. ${users.length.toLocaleString()} accounts saved. Opening CreatorGraph…`);
  uiSetProgress(100);

  // Tell background to open results page
  await chrome.runtime.sendMessage({
    action: "CREATORGRAPH_OPEN_RESULTS",
    count: users.length,
    stopReason: result.reason
  });
}

function registerListener() {
  if (window.__CREATORGRAPH_LISTENER_READY__) return;
  window.__CREATORGRAPH_LISTENER_READY__ = true;

  chrome.runtime.onMessage.addListener(
    (msg: { action?: string }, _sender: unknown, sendResponse: (v?: unknown) => void) => {
      if (msg?.action !== "CREATORGRAPH_START") return;

      if (window.__CREATORGRAPH_RUNNING__) {
        ensureUI();
        uiSetStatus("Already scanning.");
        sendResponse({ ok: false });
        return true;
      }

      window.__CREATORGRAPH_RUNNING__ = true;
      sendResponse({ ok: true });

      void runScan()
        .catch((err) => {
          console.error("[CreatorGraph]", err);
          ensureUI();
          uiSetStatus("Error — see console.");
        })
        .finally(() => {
          window.__CREATORGRAPH_RUNNING__ = false;
        });

      return true;
    }
  );
}

registerListener();
