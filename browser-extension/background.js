const VERTEX_DEFAULTS = {
  groqApiKey: "",
  groqModel: "llama-3.1-8b-instant",
  vertexAppUrl: "https://vertex-ai-chatbot-self.vercel.app/",
  useVertexEndpoint: false
};

const KNOWN_SITES = {
  google: "https://www.google.com/",
  youtube: "https://www.youtube.com/",
  wikipedia: "https://www.wikipedia.org/",
  nasa: "https://www.nasa.gov/",
  github: "https://github.com/",
  stackoverflow: "https://stackoverflow.com/",
  stack: "https://stackoverflow.com/"
};

const MAX_CONTEXT_CHARS = 12000;
const MAX_SELECTED_CHARS = 5000;
const CONNECTION_DEFAULTS = {
  vertexBrowserConnected: false,
  vertexBrowserStatus: "Starting Vertex Browser Control...",
  vertexBrowserLastSeen: "",
  vertexBrowserActiveTabUrl: "",
  vertexBrowserContentReady: false
};
const ALLOWED_EXTERNAL_ORIGINS = new Set([
  "https://vertex-ai-chatbot-self.vercel.app",
  "https://vertexai-five.vercel.app",
  "http://127.0.0.1:5000",
  "http://localhost:5000"
]);

function cleanText(value, limit = 4000) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function normalizeUrl(input) {
  const value = String(input || "").trim();
  if (!value) throw new Error("Website is required.");

  const key = value.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#\s]/)[0];
  if (KNOWN_SITES[key]) return KNOWN_SITES[key];

  if (/^https?:\/\//i.test(value)) return value;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) return `https://${value}`;

  return `https://www.google.com/search?q=${encodeURIComponent(value)}`;
}

function parseBrowserCommand(text) {
  const raw = String(text || "").trim();
  const lower = raw.toLowerCase();
  if (!raw) return null;

  const searchGoogle = raw.match(/^(?:search\s+google(?:\s+for)?|google)\s+(.+)$/i);
  if (searchGoogle?.[1]) return { type: "search", engine: "google", query: searchGoogle[1].trim() };

  const findVideos = raw.match(/^(?:find\s+videos\s+(?:about|on)|search\s+(?:youtube|you tube)(?:\s+for)?|(?:youtube|you tube))\s+(.+)$/i);
  if (findVideos?.[1]) return { type: "search", engine: "youtube", query: findVideos[1].trim() };

  const open = raw.match(/^(?:open|go\s+to|launch|visit)\s+(.+)$/i);
  if (open?.[1]) return { type: "open", target: open[1].trim() };

  return null;
}

async function getSettings() {
  const settings = await chrome.storage.local.get(VERTEX_DEFAULTS);
  return { ...VERTEX_DEFAULTS, ...settings };
}

async function setBrowserStatus(status) {
  const next = {
    ...status,
    vertexBrowserConnected: status.vertexBrowserConnected !== false,
    vertexBrowserLastSeen: new Date().toISOString()
  };
  await chrome.storage.local.set(next);
  return next;
}

async function getBrowserStatus() {
  const status = await chrome.storage.local.get(CONNECTION_DEFAULTS);
  return { ...CONNECTION_DEFAULTS, ...status };
}

async function registerConnected(message = "Vertex Browser Control is ready.") {
  return setBrowserStatus({
    vertexBrowserConnected: true,
    vertexBrowserStatus: message
  });
}

function isSupportedTab(tab) {
  return Boolean(tab?.id && /^https?:\/\//i.test(tab.url || ""));
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active browser tab found. Open Google or another normal webpage and try again.");
  return tab;
}

async function sendToActiveContent(message) {
  const tab = await getActiveTab();
  if (!isSupportedTab(tab)) {
    throw new Error("Vertex can only connect to normal http/https webpages. Open Google, YouTube, or another website first.");
  }
  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch (error) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
    return chrome.tabs.sendMessage(tab.id, message);
  }
}

async function ensureActiveContentScript() {
  const tab = await getActiveTab();
  if (!isSupportedTab(tab)) {
    throw new Error("Content script unavailable on this page. Open a normal http/https webpage, then reconnect.");
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "VERTEX_EXTENSION_PING" });
    if (response?.ok) {
      await setBrowserStatus({
        vertexBrowserConnected: true,
        vertexBrowserContentReady: true,
        vertexBrowserActiveTabUrl: tab.url || "",
        vertexBrowserStatus: "Connected to the active page."
      });
      return { tab, response };
    }
  } catch (error) {
    // Fall through to inject the latest content script.
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"]
    });
    const response = await chrome.tabs.sendMessage(tab.id, { type: "VERTEX_EXTENSION_PING" });
    if (!response?.ok) throw new Error("Content script did not acknowledge the ping.");
    await setBrowserStatus({
      vertexBrowserConnected: true,
      vertexBrowserContentReady: true,
      vertexBrowserActiveTabUrl: tab.url || "",
      vertexBrowserStatus: "Connected to the active page."
    });
    return { tab, response };
  } catch (error) {
    await setBrowserStatus({
      vertexBrowserConnected: true,
      vertexBrowserContentReady: false,
      vertexBrowserActiveTabUrl: tab.url || "",
      vertexBrowserStatus: error?.message || "Could not connect to the active page."
    });
    throw new Error(`Content script unavailable: ${error?.message || "reload the page and reconnect."}`);
  }
}

async function togglePanel() {
  return sendToActiveContent({ type: "VERTEX_TOGGLE_PANEL" });
}

async function openOptionsPage() {
  await chrome.runtime.openOptionsPage();
  return { message: "Opened Vertex extension settings." };
}

async function openWebsite(target) {
  const url = normalizeUrl(target);
  const tab = await getActiveTab();
  await chrome.tabs.update(tab.id, { url, active: true });
  return { message: `Opening ${url}`, url };
}

async function runPageCommand(type) {
  await ensureActiveContentScript();
  const response = await sendToActiveContent({ type });
  if (!response?.ok) throw new Error(response?.error || "The active page did not complete the command.");
  return response;
}

async function executeExternalBrowserCommand(command) {
  const name = String(command?.name || "");
  const args = command?.args && typeof command.args === "object" ? command.args : {};

  if (name === "ping") {
    const status = await registerConnected("Vertex Browser Control is connected.");
    try {
      await ensureActiveContentScript();
    } catch (error) {
      return {
        message: error?.message || "Extension is connected, but the active page is unavailable.",
        status: await getBrowserStatus()
      };
    }
    return { message: "Vertex Browser Control is connected.", status };
  }

  if (name === "disconnect") {
    const status = await setBrowserStatus({
      vertexBrowserConnected: false,
      vertexBrowserContentReady: false,
      vertexBrowserStatus: "Browser Control stopped from the Vertex web app."
    });
    return { message: "Browser Control stopped.", status };
  }

  if (name === "open_side_panel") {
    await togglePanel();
    return { message: "Opened Vertex floating assistant." };
  }

  if (name === "open_site") {
    if (!["google", "youtube"].includes(args.site)) throw new Error("Only Google and YouTube are allowed.");
    return openWebsite(args.site);
  }

  if (name === "search_google") return searchWeb(args.query, "google");
  if (name === "search_youtube") return searchWeb(args.query, "youtube");

  const tabCommands = {
    go_back: async () => {
      const tab = await getActiveTab();
      await chrome.tabs.goBack(tab.id);
      return { message: "Went back in the active tab." };
    },
    go_forward: async () => {
      const tab = await getActiveTab();
      await chrome.tabs.goForward(tab.id);
      return { message: "Went forward in the active tab." };
    },
    reload_tab: async () => {
      const tab = await getActiveTab();
      await chrome.tabs.reload(tab.id);
      return { message: "Reloaded the active tab." };
    },
    scroll_up: () => runPageCommand("VERTEX_SCROLL_UP"),
    scroll_down: () => runPageCommand("VERTEX_SCROLL_DOWN"),
    click_first_result: () => runPageCommand("VERTEX_CLICK_FIRST_RESULT")
  };

  if (!tabCommands[name]) throw new Error("Unsupported browser command.");
  return tabCommands[name]();
}

async function searchWeb(query, engine = "google") {
  const cleanQuery = cleanText(query, 180);
  if (!cleanQuery) throw new Error("Search query is required.");

  const url = engine === "youtube"
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQuery)}`
    : `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`;

  const tab = await getActiveTab();
  await chrome.tabs.update(tab.id, { url, active: true });
  return { message: `${engine === "youtube" ? "Searching YouTube" : "Searching Google"} for "${cleanQuery}".`, url };
}

function buildPagePrompt(action, payload) {
  const context = payload.context || {};
  const selectedText = cleanText(context.selectedText, MAX_SELECTED_CHARS);
  const headings = Array.isArray(context.headings) ? context.headings.slice(0, 24).join(" | ") : "";
  const readableText = cleanText(context.readableText, MAX_CONTEXT_CHARS);

  const prompts = {
    explainPage: "Explain this webpage clearly. Include what it is about, the main ideas, and anything a student should understand.",
    summarizePage: "Summarize this webpage in a concise, useful way.",
    simplifyPage: "Simplify this webpage for a student. Use easy words and short sections.",
    quizPage: "Create a short quiz from this webpage. Include answers after each question.",
    keyPoints: "Extract the most important key points from this webpage.",
    selectedText: "Answer the user's question about the selected text. If no question is provided, explain the selected text.",
    notes: "Create clean study notes from this webpage with headings, bullets, and a short recap.",
    eli12: "Explain this webpage like I am 12 years old.",
    translate: "Translate the selected text into the requested language. If no language is given, translate it into simple English.",
    ask: "Answer the user's question using the webpage context when useful."
  };

  return [
    `Task: ${prompts[action] || prompts.ask}`,
    payload.userText ? `User request: ${payload.userText}` : "",
    `Page title: ${context.title || "Unknown"}`,
    `URL: ${context.url || "Unknown"}`,
    headings ? `Headings: ${headings}` : "",
    selectedText ? `Selected text:\n${selectedText}` : "",
    readableText ? `Visible readable page content:\n${readableText}` : "",
    "Rules: Do not claim the page says something unless it appears in the context. Keep the answer useful and direct."
  ].filter(Boolean).join("\n\n");
}

async function callVertexEndpoint(message, settings) {
  const baseUrl = String(settings.vertexAppUrl || VERTEX_DEFAULTS.vertexAppUrl).replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  if (!response.ok) throw new Error(`Vertex app returned HTTP ${response.status}.`);
  const data = await response.json();
  return data.response || "Vertex did not return a response.";
}

async function callGroq(message, settings) {
  const apiKey = String(settings.groqApiKey || "").trim();
  if (!apiKey) {
    const error = new Error("API key missing. Add your Groq API key in Vertex extension settings.");
    error.code = "API_KEY_MISSING";
    throw error;
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.groqModel || VERTEX_DEFAULTS.groqModel,
      temperature: 0.35,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: "You are Vertex AI, a premium page-aware browser assistant. Help with webpages, selected text, school research, coding, notes, summaries, quizzes, and safe browser tasks. Be clear, concise, and honest about limits."
        },
        { role: "user", content: message }
      ]
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || `Groq returned HTTP ${response.status}.`);
  }

  return data?.choices?.[0]?.message?.content?.trim() || "Groq returned an empty response.";
}

async function askAi(message) {
  const settings = await getSettings();
  if (settings.useVertexEndpoint) {
    return callVertexEndpoint(message, settings);
  }
  return callGroq(message, settings);
}

async function saveImportantNote(note, context = {}) {
  const cleanNote = cleanText(note, 6000);
  if (!cleanNote) throw new Error("There is no note to save.");

  const data = await chrome.storage.local.get({ vertexSavedNotes: [] });
  const notes = Array.isArray(data.vertexSavedNotes) ? data.vertexSavedNotes : [];
  const item = {
    id: `note-${Date.now()}`,
    note: cleanNote,
    title: cleanText(context.title, 160),
    url: cleanText(context.url, 800),
    savedAt: new Date().toISOString()
  };
  notes.unshift(item);
  await chrome.storage.local.set({ vertexSavedNotes: notes.slice(0, 100) });
  return { message: "Saved important note.", note: item };
}

async function readAloud(text) {
  const clean = cleanText(text, 3800);
  if (!clean) throw new Error("No readable text found on this page.");
  await chrome.tts.stop();
  await chrome.tts.speak(clean, { rate: 0.95, pitch: 1, volume: 1 });
  return { message: "Reading page aloud." };
}

async function handleTool(payload) {
  const action = payload.action || "ask";
  const settings = await getSettings();
  const context = payload.context || {};

  if (action === "settings") return openOptionsPage();
  if (action === "openWebsite") return openWebsite(payload.userText);
  if (action === "searchWeb") return searchWeb(payload.userText, payload.engine || "google");
  if (action === "saveNote") return saveImportantNote(payload.userText || context.selectedText || context.readableText, context);
  if (action === "readAloud") return readAloud(context.selectedText || context.readableText || context.title);

  const command = parseBrowserCommand(payload.userText);
  if (action === "ask" && command) {
    if (command.type === "open") return openWebsite(command.target);
    if (command.type === "search") return searchWeb(command.query, command.engine);
  }

  if (!settings.useVertexEndpoint && !String(settings.groqApiKey || "").trim()) {
    const error = new Error("API key missing. Add your Groq API key in Vertex extension settings.");
    error.code = "API_KEY_MISSING";
    throw error;
  }

  const prompt = buildPagePrompt(action, payload);
  const answer = await askAi(prompt);
  return { answer };
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.local.get(VERTEX_DEFAULTS);
  await chrome.storage.local.set({ ...VERTEX_DEFAULTS, ...current });
  await registerConnected("Vertex Browser Control installed and ready.");
});

chrome.runtime.onStartup.addListener(() => {
  registerConnected("Vertex Browser Control started.").catch(() => {});
});

chrome.action.onClicked.addListener(() => {
  togglePanel().catch(() => {});
});

chrome.commands.onCommand.addListener((command) => {
  if (command === "toggle-vertex-panel") {
    togglePanel().catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  Promise.resolve()
    .then(async () => {
      await registerConnected("Vertex Browser Control is active.");
      if (message?.type === "VERTEX_CONTENT_READY") {
        await setBrowserStatus({
          vertexBrowserConnected: true,
          vertexBrowserContentReady: true,
          vertexBrowserActiveTabUrl: message.url || sender?.tab?.url || "",
          vertexBrowserStatus: "Connected to page content."
        });
        return getBrowserStatus();
      }
      if (message?.type === "VERTEX_GET_BROWSER_STATUS") return getBrowserStatus();
      if (message?.type === "VERTEX_RECONNECT_CONTENT") {
        await ensureActiveContentScript();
        return getBrowserStatus();
      }
      if (message?.type === "VERTEX_GET_SETTINGS") return getSettings();
      if (message?.type === "VERTEX_OPEN_OPTIONS") return openOptionsPage();
      if (message?.type === "VERTEX_RUN_TOOL") return handleTool(message.payload || {});
      if (message?.type === "VERTEX_TOGGLE_FROM_POPUP") return togglePanel();
      if (message?.type === "VERTEX_GET_NOTES") return chrome.storage.local.get({ vertexSavedNotes: [] });
      throw new Error("Unsupported Vertex extension message.");
    })
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) => sendResponse({
      ok: false,
      code: error?.code || "ERROR",
      error: error?.message || "Vertex extension action failed."
    }));

  return true;
});

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  Promise.resolve()
    .then(async () => {
      const origin = sender?.origin || "";
      if (!ALLOWED_EXTERNAL_ORIGINS.has(origin)) {
        throw new Error("This webpage is not allowed to control Vertex Browser Control.");
      }
      if (message?.source !== "vertex-browser-control" || message?.type !== "browser_command") {
        throw new Error("Unsupported external Vertex message.");
      }
      const result = await executeExternalBrowserCommand(message.command || {});
      return { ok: true, ...result, status: await getBrowserStatus() };
    })
    .then(sendResponse)
    .catch(async (error) => {
      await setBrowserStatus({
        vertexBrowserConnected: true,
        vertexBrowserStatus: error?.message || "Browser command failed."
      }).catch(() => {});
      sendResponse({
        ok: false,
        error: error?.message || "Browser command failed.",
        status: await getBrowserStatus().catch(() => CONNECTION_DEFAULTS)
      });
    });

  return true;
});

registerConnected("Vertex Browser Control service worker is ready.").catch(() => {});
