const statusEl = document.querySelector("#status");
const setupCard = document.querySelector("#setupCard");
const togglePanel = document.querySelector("#togglePanel");
const openOptions = document.querySelector("#openOptions");
const openOptionsSetup = document.querySelector("#openOptionsSetup");
const browserStatus = document.querySelector("#browserStatus");
const browserDetail = document.querySelector("#browserDetail");
const reconnectBrowser = document.querySelector("#reconnectBrowser");

function send(type, payload = {}) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "Vertex action failed."));
        return;
      }
      resolve(response);
    });
  });
}

async function refreshStatus() {
  const settings = await send("VERTEX_GET_SETTINGS");
  const browser = await send("VERTEX_GET_BROWSER_STATUS");
  const hasKey = Boolean(settings.groqApiKey);
  setupCard.hidden = hasKey || settings.useVertexEndpoint;
  statusEl.textContent = hasKey
    ? `Groq ready: ${settings.groqModel}`
    : settings.useVertexEndpoint
      ? "Using Vertex app endpoint"
      : "Setup needed";
  browserStatus.textContent = browser.vertexBrowserConnected
    ? "Browser Control: Connected"
    : "Browser Control: Disconnected";
  browserDetail.textContent = browser.vertexBrowserStatus || "No connection status yet.";
}

togglePanel.addEventListener("click", async () => {
  await send("VERTEX_TOGGLE_FROM_POPUP");
  window.close();
});

openOptions.addEventListener("click", () => chrome.runtime.openOptionsPage());
openOptionsSetup.addEventListener("click", () => chrome.runtime.openOptionsPage());
reconnectBrowser.addEventListener("click", async () => {
  browserDetail.textContent = "Reconnecting to the active tab...";
  try {
    await send("VERTEX_RECONNECT_CONTENT");
    await refreshStatus();
  } catch (error) {
    browserStatus.textContent = "Browser Control: Needs attention";
    browserDetail.textContent = error.message || "Reconnect failed. Open a normal webpage and reload it.";
  }
});

document.querySelectorAll("[data-command]").forEach((button) => {
  button.addEventListener("click", async () => {
    const command = button.dataset.command;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      statusEl.textContent = "No active tab found.";
      return;
    }

    const payloads = {
      summarize: { action: "summarizePage", label: "Current Page Summary" },
      selected: { action: "selectedText", label: "Selected Text Assistant" },
      youtube: { action: "openWebsite", userText: "YouTube", label: "Open YouTube" }
    };
    let payload = payloads[command];
    if (command === "google") {
      const query = window.prompt("Search Google for:");
      if (!query) return;
      payload = { action: "searchWeb", userText: query, label: `Search Google: ${query}` };
    }

    chrome.tabs.sendMessage(tab.id, { type: "VERTEX_QUICK_TOOL", ...payload }, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError || !response?.ok) {
        statusEl.textContent = "Open a normal webpage, then try again.";
        return;
      }
      window.close();
    });
  });
});

refreshStatus().catch((error) => {
  statusEl.textContent = error.message || "Vertex unavailable";
});
