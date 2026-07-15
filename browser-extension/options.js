const defaults = {
  groqApiKey: "",
  groqModel: "llama-3.1-8b-instant",
  vertexAppUrl: "https://vertex-ai-chatbot-self.vercel.app/",
  useVertexEndpoint: false
};

const form = document.querySelector("#settingsForm");
const groqApiKey = document.querySelector("#groqApiKey");
const groqModel = document.querySelector("#groqModel");
const vertexAppUrl = document.querySelector("#vertexAppUrl");
const useVertexEndpoint = document.querySelector("#useVertexEndpoint");
const clearKey = document.querySelector("#clearKey");
const statusEl = document.querySelector("#status");
const browserStatus = document.querySelector("#browserStatus");
const browserDetail = document.querySelector("#browserDetail");
const reconnectBrowser = document.querySelector("#reconnectBrowser");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#fecaca" : "#95aac7";
}

async function loadSettings() {
  const settings = await chrome.storage.local.get(defaults);
  const browser = await chrome.storage.local.get({
    vertexBrowserConnected: false,
    vertexBrowserStatus: "No browser status yet.",
    vertexBrowserLastSeen: "",
    vertexBrowserActiveTabUrl: "",
    vertexBrowserContentReady: false
  });
  groqApiKey.value = settings.groqApiKey || "";
  groqModel.value = settings.groqModel || defaults.groqModel;
  vertexAppUrl.value = settings.vertexAppUrl || defaults.vertexAppUrl;
  useVertexEndpoint.checked = Boolean(settings.useVertexEndpoint);
  browserStatus.textContent = browser.vertexBrowserConnected
    ? "Browser Control: Connected"
    : "Browser Control: Disconnected";
  browserDetail.textContent = [
    browser.vertexBrowserStatus,
    browser.vertexBrowserActiveTabUrl ? `Active page: ${browser.vertexBrowserActiveTabUrl}` : "",
    browser.vertexBrowserLastSeen ? `Last seen: ${new Date(browser.vertexBrowserLastSeen).toLocaleString()}` : ""
  ].filter(Boolean).join(" | ");
  setStatus(settings.groqApiKey ? "Groq API key saved." : "No Groq API key saved yet.");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const settings = {
    groqApiKey: groqApiKey.value.trim(),
    groqModel: groqModel.value.trim() || defaults.groqModel,
    vertexAppUrl: vertexAppUrl.value.trim() || defaults.vertexAppUrl,
    useVertexEndpoint: useVertexEndpoint.checked
  };

  try {
    new URL(settings.vertexAppUrl);
    await chrome.storage.local.set(settings);
    setStatus("Settings saved. Reload any open webpages to ensure the newest content script is active.");
  } catch (error) {
    setStatus("Enter a valid Vertex app URL.", true);
  }
});

clearKey.addEventListener("click", async () => {
  groqApiKey.value = "";
  await chrome.storage.local.set({ groqApiKey: "" });
  setStatus("Groq API key cleared.");
});

reconnectBrowser.addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "VERTEX_RECONNECT_CONTENT" }, async (response) => {
    const runtimeError = chrome.runtime.lastError;
    if (runtimeError || !response?.ok) {
      browserStatus.textContent = "Browser Control: Needs attention";
      browserDetail.textContent = runtimeError?.message || response?.error || "Open a normal webpage and reload it.";
      return;
    }
    await loadSettings();
  });
});

loadSettings().catch((error) => setStatus(error.message || "Could not load settings.", true));
