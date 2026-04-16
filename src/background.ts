chrome.runtime.onMessage.addListener(
  (msg: { action?: string; count?: number }, _sender: unknown, sendResponse: (v?: unknown) => void) => {
    if (msg?.action === "CREATORGRAPH_START") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) {
          sendResponse({ ok: false, message: "No active tab." });
          return;
        }

        chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            files: ["scanner.js"]
          })
          .then(() =>
            chrome.tabs.sendMessage(tab.id!, { action: "CREATORGRAPH_START" })
          )
          .then((res) => sendResponse(res))
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            sendResponse({ ok: false, message });
          });
      });

      return true; // async response
    }

    if (msg?.action === "CREATORGRAPH_OPEN_RESULTS") {
      const url = chrome.runtime.getURL("results/results.html");
      chrome.tabs.create({ url }, () => sendResponse({ ok: true }));
      return true;
    }

    return false;
  }
);
