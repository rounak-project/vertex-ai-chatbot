(() => {
  const ROOT_ID = "vertex-ai-whole-web-root";
  if (window.__VERTEX_WHOLE_WEB_ASSISTANT__ || document.getElementById(ROOT_ID)) return;
  window.__VERTEX_WHOLE_WEB_ASSISTANT__ = true;

  const state = {
    open: false,
    minimized: false,
    expanded: false,
    busy: false,
    messages: [],
    lastContext: null,
    position: loadPosition(),
    panelSize: loadPanelSize()
  };

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.setAttribute("aria-live", "polite");
  const shadow = root.attachShadow({ mode: "open" });
  document.documentElement.appendChild(root);

  function storageGet(key, fallback) {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Page storage can be blocked; the assistant still works without persistence.
    }
  }

  function loadPosition() {
    return storageGet("vertex-extension-position", { right: 24, bottom: 24 });
  }

  function loadPanelSize() {
    return storageGet("vertex-extension-panel-size", { width: 420, height: 620 });
  }

  function escapeHtml(text) {
    return String(text || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderMarkdown(text) {
    const lines = String(text || "").split("\n");
    let html = "";
    let listOpen = false;
    for (const line of lines) {
      const trimmed = line.trim();
      const bullet = trimmed.match(/^[-*]\s+(.+)/);
      if (bullet) {
        if (!listOpen) {
          html += "<ul>";
          listOpen = true;
        }
        html += `<li>${formatInline(bullet[1])}</li>`;
        continue;
      }
      if (listOpen) {
        html += "</ul>";
        listOpen = false;
      }
      if (!trimmed) {
        html += "<br>";
      } else if (/^#{1,3}\s+/.test(trimmed)) {
        html += `<strong>${formatInline(trimmed.replace(/^#{1,3}\s+/, ""))}</strong>`;
      } else {
        html += `<p>${formatInline(trimmed)}</p>`;
      }
    }
    if (listOpen) html += "</ul>";
    return html;
  }

  function formatInline(text) {
    return escapeHtml(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noreferrer\">$1</a>")
      .replace(/(https?:\/\/[^\s<]+)/g, "<a href=\"$1\" target=\"_blank\" rel=\"noreferrer\">$1</a>");
  }

  function isSensitiveElement(element) {
    const field = element?.closest?.("input, textarea, select, [contenteditable='true']");
    if (!field) return false;
    const type = String(field.getAttribute("type") || "").toLowerCase();
    return ["password", "email", "tel", "number", "credit-card", "file"].includes(type)
      || /password|payment|card|cvv|otp|secret|token/i.test(field.name || field.id || field.autocomplete || "");
  }

  function visibleTextFromNode(node) {
    const walker = document.createTreeWalker(
      node,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(textNode) {
          const parent = textNode.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (isSensitiveElement(parent)) return NodeFilter.FILTER_REJECT;
          if (parent.closest("script, style, noscript, svg, canvas, iframe, input, textarea, select")) {
            return NodeFilter.FILTER_REJECT;
          }
          const style = getComputedStyle(parent);
          if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
            return NodeFilter.FILTER_REJECT;
          }
          const rect = parent.getBoundingClientRect();
          if (rect.width < 1 || rect.height < 1) return NodeFilter.FILTER_REJECT;
          const value = textNode.nodeValue.replace(/\s+/g, " ").trim();
          if (value.length < 2) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const parts = [];
    let total = 0;
    while (walker.nextNode() && total < 14000) {
      const text = walker.currentNode.nodeValue.replace(/\s+/g, " ").trim();
      parts.push(text);
      total += text.length;
    }
    return parts.join(" ").slice(0, 14000);
  }

  function getSelectedText() {
    const active = document.activeElement;
    if (isSensitiveElement(active)) return "";
    const selection = window.getSelection?.();
    return String(selection?.toString?.() || "").replace(/\s+/g, " ").trim().slice(0, 5000);
  }

  function collectPageContext() {
    const headings = Array.from(document.querySelectorAll("h1, h2, h3"))
      .map((node) => node.textContent.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .slice(0, 30);

    const context = {
      title: document.title || "",
      url: location.href,
      selectedText: getSelectedText(),
      headings,
      readableText: visibleTextFromNode(document.body || document.documentElement)
    };
    state.lastContext = context;
    return context;
  }

  function chromeMessage(type, payload = {}) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type, payload }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          reject(new Error(error.message || "Vertex extension is unavailable."));
          return;
        }
        if (!response?.ok) {
          const failed = new Error(response?.error || "Vertex action failed.");
          failed.code = response?.code;
          reject(failed);
          return;
        }
        resolve(response);
      });
    });
  }

  function notifyReady(reason = "ready") {
    chrome.runtime.sendMessage({
      type: "VERTEX_CONTENT_READY",
      reason,
      url: location.href,
      title: document.title || ""
    }, () => {
      // The background service worker may be waking up; runtime errors here are non-fatal.
      void chrome.runtime.lastError;
    });
  }

  function clickFirstSearchResult() {
    const selectors = [
      "a[href][ping] h3",
      "a[href] h3",
      "ytd-video-renderer a#video-title",
      "a#video-title",
      "a[href]"
    ];
    for (const selector of selectors) {
      const target = document.querySelector(selector);
      const link = target?.closest?.("a[href]") || target;
      if (link?.href && /^https?:\/\//i.test(link.href)) {
        link.click();
        return { message: "Clicked the first visible result." };
      }
    }
    throw new Error("No clickable Google or YouTube result was found on this page.");
  }

  function patchRouteChange(methodName) {
    const original = history[methodName];
    if (typeof original !== "function") return;
    history[methodName] = function patchedHistoryMethod(...args) {
      const result = original.apply(this, args);
      window.setTimeout(() => notifyReady("spa-route-change"), 100);
      return result;
    };
  }

  function addMessage(role, text, meta = "") {
    state.messages.push({
      id: `m-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      role,
      text,
      meta
    });
    render();
    scrollMessages();
  }

  function updateLastAssistant(text, meta = "") {
    const last = state.messages[state.messages.length - 1];
    if (last?.role === "assistant" && last.text === "Thinking...") {
      last.text = text;
      last.meta = meta;
    } else {
      state.messages.push({ id: `m-${Date.now()}`, role: "assistant", text, meta });
    }
    render();
    scrollMessages();
  }

  function scrollMessages() {
    requestAnimationFrame(() => {
      const box = shadow.querySelector(".vertex-messages");
      if (box) box.scrollTop = box.scrollHeight;
    });
  }

  async function runTool(action, userText = "", options = {}) {
    if (state.busy) return;
    state.busy = true;
    const context = options.skipContext ? {} : collectPageContext();
    const label = options.label || userText || toolLabel(action);
    if (label) addMessage("user", label, context.selectedText ? "Includes selected text" : "Page-aware request");
    addMessage("assistant", "Thinking...", "Vertex is working");

    try {
      const response = await chromeMessage("VERTEX_RUN_TOOL", {
        action,
        userText,
        engine: options.engine,
        context
      });
      updateLastAssistant(response.answer || response.message || "Done.", response.url || "");
    } catch (error) {
      const needsKey = error.code === "API_KEY_MISSING";
      updateLastAssistant(
        needsKey
          ? "Add your Groq API key in Vertex settings to use AI tools. Browser open/search tools still work."
          : error.message || "Vertex ran into an error.",
        needsKey ? "Setup required" : "Error"
      );
    } finally {
      state.busy = false;
      render();
    }
  }

  function toolLabel(action) {
    const labels = {
      explainPage: "Explain this page",
      summarizePage: "Summarize page",
      simplifyPage: "Simplify for me",
      quizPage: "Quiz me",
      keyPoints: "Extract key points",
      selectedText: "Ask about selected text",
      notes: "Create notes from page",
      eli12: "Explain like I'm 12",
      searchWeb: "Search web",
      openWebsite: "Open website",
      saveNote: "Save important note",
      readAloud: "Read page aloud",
      translate: "Translate selected text"
    };
    return labels[action] || "Ask Vertex";
  }

  function openPanel() {
    state.open = true;
    state.minimized = false;
    if (!state.messages.length) {
      addMessage("assistant", "I can help with this page when you ask. I only read page content after you choose a tool or send a message.", "Ready");
    }
    render();
  }

  function closePanel() {
    state.open = false;
    state.minimized = false;
    render();
  }

  function togglePanel() {
    state.open ? closePanel() : openPanel();
  }

  function applyPosition() {
    const widget = shadow.querySelector(".vertex-widget");
    if (!widget) return;
    widget.style.right = `${Math.max(8, state.position.right)}px`;
    widget.style.bottom = `${Math.max(8, state.position.bottom)}px`;
  }

  function startDrag(event, targetSelector = ".vertex-widget") {
    const widget = shadow.querySelector(targetSelector);
    if (!widget || event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startRight = state.position.right;
    const startBottom = state.position.bottom;
    widget.setPointerCapture?.(event.pointerId);
    event.preventDefault();

    const move = (moveEvent) => {
      state.position.right = Math.max(8, startRight - (moveEvent.clientX - startX));
      state.position.bottom = Math.max(8, startBottom - (moveEvent.clientY - startY));
      applyPosition();
    };
    const up = () => {
      storageSet("vertex-extension-position", state.position);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
  }

  function startResize(event) {
    const panel = shadow.querySelector(".vertex-panel");
    if (!panel || event.button !== 0) return;
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = state.panelSize.width;
    const startHeight = state.panelSize.height;
    event.preventDefault();

    const move = (moveEvent) => {
      state.panelSize.width = Math.min(window.innerWidth - 24, Math.max(340, startWidth + (moveEvent.clientX - startX)));
      state.panelSize.height = Math.min(window.innerHeight - 24, Math.max(440, startHeight + (moveEvent.clientY - startY)));
      panel.style.width = `${state.panelSize.width}px`;
      panel.style.height = `${state.panelSize.height}px`;
    };
    const up = () => {
      storageSet("vertex-extension-panel-size", state.panelSize);
      window.removeEventListener("pointermove", move, true);
      window.removeEventListener("pointerup", up, true);
    };
    window.addEventListener("pointermove", move, true);
    window.addEventListener("pointerup", up, true);
  }

  function getStyles() {
    return `
      :host { all: initial; color-scheme: dark; }
      * { box-sizing: border-box; }
      .vertex-widget { position: fixed; z-index: 2147483647; right: 24px; bottom: 24px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; pointer-events: none; }
      .vertex-fab, .vertex-panel { pointer-events: auto; }
      .vertex-fab { width: 62px; height: 62px; border: 1px solid rgba(84, 232, 255, .52); border-radius: 20px; color: #eaffff; background: radial-gradient(circle at 30% 20%, rgba(111, 255, 246, .42), transparent 32%), linear-gradient(145deg, rgba(10, 22, 42, .96), rgba(18, 10, 46, .94)); box-shadow: 0 22px 52px rgba(0, 0, 0, .34), 0 0 32px rgba(0, 229, 255, .28), inset 0 1px 0 rgba(255, 255, 255, .18); display: grid; place-items: center; cursor: grab; transition: transform .22s ease, box-shadow .22s ease; }
      .vertex-fab:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 28px 68px rgba(0, 0, 0, .38), 0 0 44px rgba(132, 92, 255, .38); }
      .vertex-fab:active { cursor: grabbing; transform: scale(.98); }
      .vertex-mark { width: 34px; height: 34px; border-radius: 14px; display: grid; place-items: center; font: 900 18px/1 Inter, sans-serif; color: #001419; background: linear-gradient(135deg, #48f5ff, #9b7cff); box-shadow: 0 0 22px rgba(72, 245, 255, .45); }
      .vertex-panel { width: min(420px, calc(100vw - 24px)); height: min(620px, calc(100vh - 24px)); min-width: 340px; min-height: 440px; overflow: hidden; border: 1px solid rgba(139, 199, 255, .22); border-radius: 18px; color: #eef8ff; background: linear-gradient(145deg, rgba(5, 12, 25, .94), rgba(15, 16, 40, .92)); box-shadow: 0 30px 90px rgba(0, 0, 0, .52), 0 0 60px rgba(0, 229, 255, .18); backdrop-filter: blur(22px); display: grid; grid-template-rows: auto auto 1fr auto; animation: vertexIn .2s ease both; }
      .vertex-panel.is-expanded { width: min(760px, calc(100vw - 24px)) !important; height: min(760px, calc(100vh - 24px)) !important; }
      .vertex-panel.is-minimized { height: 74px !important; min-height: 74px; grid-template-rows: auto; }
      @keyframes vertexIn { from { opacity: 0; transform: translateY(16px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
      .vertex-header { display: grid; grid-template-columns: auto 1fr auto; gap: 10px; align-items: center; padding: 12px; border-bottom: 1px solid rgba(148, 163, 184, .15); cursor: grab; background: linear-gradient(90deg, rgba(0, 229, 255, .08), rgba(139, 92, 246, .08)); }
      .vertex-title strong { display: block; font-size: 14px; letter-spacing: 0; }
      .vertex-title span { display: block; color: #92a9c8; font-size: 11px; }
      .vertex-actions { display: flex; gap: 6px; }
      .icon-btn { width: 32px; height: 32px; border: 1px solid rgba(148, 163, 184, .18); border-radius: 8px; color: #dff7ff; background: rgba(255, 255, 255, .055); cursor: pointer; display: grid; place-items: center; font: 800 14px/1 system-ui; }
      .icon-btn:hover { border-color: rgba(0, 229, 255, .45); background: rgba(0, 229, 255, .12); }
      .vertex-status { margin: 10px 12px 0; padding: 9px 10px; border: 1px solid rgba(0, 229, 255, .18); border-radius: 10px; color: #a9bed8; background: rgba(4, 12, 24, .58); font-size: 12px; }
      .vertex-tools { display: flex; gap: 7px; padding: 10px 12px 0; overflow-x: auto; scrollbar-width: thin; }
      .tool-btn { flex: 0 0 auto; min-height: 32px; border: 1px solid rgba(148, 163, 184, .18); border-radius: 8px; padding: 0 10px; color: #dff7ff; background: rgba(255, 255, 255, .055); cursor: pointer; font: 700 12px/1 Inter, sans-serif; white-space: nowrap; }
      .tool-btn:hover { border-color: rgba(139, 92, 246, .48); color: #fff; }
      .vertex-messages { min-height: 0; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
      .msg { max-width: 92%; border: 1px solid rgba(148, 163, 184, .14); border-radius: 12px; padding: 10px; font: 13px/1.5 Inter, sans-serif; overflow-wrap: anywhere; }
      .msg.user { align-self: flex-end; color: #00151a; background: linear-gradient(135deg, #45ecff, #9c7bff); border-color: transparent; }
      .msg.assistant { align-self: flex-start; color: #e8f6ff; background: rgba(255, 255, 255, .06); }
      .msg-meta { margin-top: 6px; color: rgba(217, 238, 255, .62); font-size: 10px; text-transform: uppercase; letter-spacing: .08em; }
      .msg p { margin: 0 0 7px; }
      .msg p:last-child { margin-bottom: 0; }
      .msg ul { margin: 0; padding-left: 18px; }
      .msg a { color: #6ef3ff; }
      .msg code { padding: 1px 4px; border-radius: 5px; background: rgba(0, 0, 0, .25); }
      .vertex-compose { display: grid; grid-template-columns: 1fr auto; gap: 8px; padding: 12px; border-top: 1px solid rgba(148, 163, 184, .15); }
      .vertex-input { width: 100%; min-height: 42px; max-height: 120px; resize: vertical; border: 1px solid rgba(148, 163, 184, .22); border-radius: 10px; padding: 10px 11px; color: #eef8ff; background: rgba(2, 6, 23, .72); font: 13px/1.35 Inter, sans-serif; outline: none; }
      .vertex-input:focus { border-color: rgba(0, 229, 255, .52); box-shadow: 0 0 0 3px rgba(0, 229, 255, .1); }
      .send-btn { width: 44px; min-height: 42px; border: 0; border-radius: 10px; color: #00151a; background: linear-gradient(135deg, #48f5ff, #a78bfa); cursor: pointer; font: 900 18px/1 Inter, sans-serif; }
      .send-btn:disabled, .tool-btn:disabled { opacity: .55; cursor: progress; }
      .vertex-resize { position: absolute; right: 3px; bottom: 3px; width: 18px; height: 18px; cursor: nwse-resize; pointer-events: auto; color: rgba(210, 240, 255, .42); }
      .setup-row { display: flex; gap: 8px; margin-top: 8px; }
      .setup-row button { min-height: 32px; border: 1px solid rgba(0, 229, 255, .4); border-radius: 8px; color: #00151a; background: #48f5ff; font-weight: 800; cursor: pointer; }
      @media (max-width: 520px) { .vertex-widget { right: 10px !important; bottom: 10px !important; } .vertex-panel { width: calc(100vw - 20px) !important; height: min(620px, calc(100vh - 20px)) !important; min-width: 0; } }
    `;
  }

  function render() {
    const panelStyle = `width:${state.panelSize.width}px;height:${state.panelSize.height}px;`;
    const hiddenBody = state.minimized ? "hidden" : "";
    const messages = state.messages.map((message) => `
      <article class="msg ${message.role}">
        <div>${renderMarkdown(message.text)}</div>
        ${message.meta ? `<div class="msg-meta">${escapeHtml(message.meta)}</div>` : ""}
      </article>
    `).join("");

    shadow.innerHTML = `
      <style>${getStyles()}</style>
      <div class="vertex-widget">
        ${state.open ? `
          <section class="vertex-panel ${state.expanded ? "is-expanded" : ""} ${state.minimized ? "is-minimized" : ""}" style="${panelStyle}" role="dialog" aria-label="Vertex AI assistant">
            <header class="vertex-header" title="Drag Vertex">
              <div class="vertex-mark">V</div>
              <div class="vertex-title">
                <strong>Vertex AI</strong>
                <span>${navigator.onLine ? "Whole-web assistant" : "Offline"}</span>
              </div>
              <div class="vertex-actions">
                <button class="icon-btn" data-action="settings" title="Settings">⚙</button>
                <button class="icon-btn" data-action="minimize" title="Minimize">−</button>
                <button class="icon-btn" data-action="expand" title="Expand">□</button>
                <button class="icon-btn" data-action="close" title="Close">×</button>
              </div>
            </header>
            <div class="vertex-status" ${hiddenBody}>Page content is read only when you ask Vertex to analyze it.</div>
            <div class="vertex-tools" ${hiddenBody}>
              ${[
                ["summarizePage", "Summary"],
                ["selectedText", "Selected Text"],
                ["eli12", "ELI12"],
                ["notes", "Notes"],
                ["quizPage", "Quiz"],
                ["keyPoints", "Key Points"],
                ["simplifyPage", "Simplify"],
                ["explainPage", "Explain"],
                ["searchWeb", "Search Web"],
                ["openWebsite", "Open Site"],
                ["saveNote", "Save Note"],
                ["readAloud", "Read Aloud"],
                ["translate", "Translate"]
              ].map(([action, label]) => `<button class="tool-btn" data-tool="${action}" title="${escapeHtml(toolLabel(action))}" ${state.busy ? "disabled" : ""}>${label}</button>`).join("")}
            </div>
            <div class="vertex-messages" ${hiddenBody}>${messages}</div>
            <form class="vertex-compose" ${hiddenBody}>
              <textarea class="vertex-input" placeholder="Ask Vertex, or try: Open YouTube, Search Google for black holes..." rows="1"></textarea>
              <button class="send-btn" title="Send" ${state.busy ? "disabled" : ""}>›</button>
            </form>
            <div class="vertex-resize" title="Resize">◢</div>
          </section>
        ` : `
          <button class="vertex-fab" title="Open Vertex AI (Alt+V)" aria-label="Open Vertex AI">
            <span class="vertex-mark">V</span>
          </button>
        `}
      </div>
    `;

    applyPosition();
    bindEvents();
  }

  function bindEvents() {
    shadow.querySelector(".vertex-fab")?.addEventListener("click", openPanel);
    shadow.querySelector(".vertex-fab")?.addEventListener("pointerdown", (event) => startDrag(event));
    shadow.querySelector(".vertex-header")?.addEventListener("pointerdown", (event) => {
      if (event.target.closest("button")) return;
      startDrag(event);
    });
    shadow.querySelector(".vertex-resize")?.addEventListener("pointerdown", startResize);

    shadow.querySelector("[data-action='close']")?.addEventListener("click", closePanel);
    shadow.querySelector("[data-action='minimize']")?.addEventListener("click", () => {
      state.minimized = !state.minimized;
      render();
    });
    shadow.querySelector("[data-action='expand']")?.addEventListener("click", () => {
      state.expanded = !state.expanded;
      render();
    });
    shadow.querySelector("[data-action='settings']")?.addEventListener("click", () => chromeMessage("VERTEX_OPEN_OPTIONS").catch(() => {}));

    shadow.querySelectorAll("[data-tool]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.tool;
        if (action === "searchWeb" || action === "openWebsite") {
          const input = shadow.querySelector(".vertex-input");
          const value = input?.value?.trim() || window.prompt(action === "searchWeb" ? "Search the web for:" : "Open website:");
          if (!value) return;
          input.value = "";
          runTool(action, value, { skipContext: true, label: `${toolLabel(action)}: ${value}` });
          return;
        }
        if (action === "translate") {
          const selected = getSelectedText();
          if (!selected) {
            addMessage("assistant", "Select text on the page first, then choose Translate Selected Text.", "Selection needed");
            return;
          }
        }
        runTool(action);
      });
    });

    shadow.querySelector(".vertex-compose")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const input = shadow.querySelector(".vertex-input");
      const value = input?.value?.trim();
      if (!value) return;
      input.value = "";
      runTool("ask", value);
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "VERTEX_EXTENSION_PING") {
      notifyReady("ping");
      sendResponse({ ok: true, url: location.href, title: document.title || "" });
      return true;
    }
    if (message?.type === "VERTEX_SCROLL_UP") {
      window.scrollBy({ top: -Math.max(420, Math.round(window.innerHeight * 0.78)), behavior: "smooth" });
      sendResponse({ ok: true, message: "Scrolled up." });
      return true;
    }
    if (message?.type === "VERTEX_SCROLL_DOWN") {
      window.scrollBy({ top: Math.max(420, Math.round(window.innerHeight * 0.78)), behavior: "smooth" });
      sendResponse({ ok: true, message: "Scrolled down." });
      return true;
    }
    if (message?.type === "VERTEX_CLICK_FIRST_RESULT") {
      try {
        sendResponse({ ok: true, ...clickFirstSearchResult() });
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || "Could not click the first result." });
      }
      return true;
    }
    if (message?.type === "VERTEX_TOGGLE_PANEL") {
      togglePanel();
      sendResponse({ ok: true });
      return true;
    }
    if (message?.type === "VERTEX_QUICK_TOOL") {
      openPanel();
      const action = message.action || "summarizePage";
      const userText = message.userText || "";
      runTool(action, userText, {
        skipContext: action === "searchWeb" || action === "openWebsite",
        label: message.label || toolLabel(action),
        engine: message.engine
      });
      sendResponse({ ok: true });
      return true;
    }
    return false;
  });

  patchRouteChange("pushState");
  patchRouteChange("replaceState");
  window.addEventListener("popstate", () => window.setTimeout(() => notifyReady("popstate"), 100));
  window.addEventListener("pageshow", () => notifyReady("pageshow"));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) notifyReady("visible");
  });

  render();
  notifyReady("initial-load");
})();
