const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const chatForm = $("#chatForm");
const userInput = $("#userInput");
const chatMessages = $("#chatMessages");
const sampleQuestions = $$(".sample-question");
const voiceButton = $("#voiceButton");
const voiceRetryButton = $("#voiceRetryButton");
const stopListeningButton = $("#stopListeningButton");
const voiceSpeakLastButton = $("#voiceSpeakLastButton");
const voiceStopSpeakingButton = $("#voiceStopSpeakingButton");
const newsGrid = $("#newsGrid");
const planetGrid = $("#planetGrid");
const planetSearch = $("#planetSearch");
const agencyGrid = $("#agencyGrid");
const launchList = $("#launchList");
const missionUpdatedText = $("#missionUpdatedText");
const vertexAvatar = $("#vertexAvatar");
const avatarStatus = $("#avatarStatus");
const themeSelect = $("#themeSelect");
const themeToggle = $("#themeToggle");
const settingsButton = $("#settingsButton");
const muteButton = $("#muteButton");
const presentationButton = $("#presentationButton");
const exitPresentationButton = $("#exitPresentationButton");
const sidebarToggle = $("#sidebarToggle");
const sidebarOverlay = $("#sidebarOverlay");
const sidebarLinks = $$(".nav-link");
const autoSpeakToggle = $("#autoSpeakToggle");
const voiceAutoSpeakToggle = $("#voiceAutoSpeakToggle");
const voiceModeStatus = $("#voiceModeStatus");
const voiceStatusText = $("#voiceStatusText");
const voiceWaveform = $("#voiceWaveform");
const missionClock = $("#missionClock");
const aiStatusMode = $("#aiStatusMode");
const aiStatusMessage = $("#aiStatusMessage");
const latencyMetric = $("#latencyMetric");

const quizPlayerName = $("#quizPlayerName");
const quizModeSelect = $("#quizModeSelect");
const quizDifficultySelect = $("#quizDifficultySelect");
const quizTypeSelect = $("#quizTypeSelect");
const quizCompletionSelect = $("#quizCompletionSelect");
const quizTimerSelect = $("#quizTimerSelect");
const quizSearchInput = $("#quizSearchInput");
const quizCategoryGrid = $("#quizCategoryGrid");
const startQuizButton = $("#startQuizButton");
const dailyQuizButton = $("#dailyQuizButton");
const randomQuizButton = $("#randomQuizButton");
const aiQuizButton = $("#aiQuizButton");
const tenAiQuizButton = $("#tenAiQuizButton");
const hardAiQuizButton = $("#hardAiQuizButton");
const nasaAiQuizButton = $("#nasaAiQuizButton");
const marsAiQuizButton = $("#marsAiQuizButton");
const astronomyAiQuizButton = $("#astronomyAiQuizButton");
const quizProgress = $("#quizProgress");
const quizScore = $("#quizScore");
const quizScoreCircle = $("#quizScoreCircle");
const quizTimer = $("#quizTimer");
const quizTimerBar = $("#quizTimerBar");
const quizStreak = $("#quizStreak");
const quizBankCount = $("#quizBankCount");
const quizQuestionType = $("#quizQuestionType");
const quizDifficultyTag = $("#quizDifficultyTag");
const quizImage = $("#quizImage");
const quizQuestion = $("#quizQuestion");
const quizChoices = $("#quizChoices");
const fillBlankForm = $("#fillBlankForm");
const fillBlankInput = $("#fillBlankInput");
const quizFeedback = $("#quizFeedback");
const restartQuizButton = $("#restartQuizButton");
const reviewQuizButton = $("#reviewQuizButton");
const nextQuizButton = $("#nextQuizButton");
const achievementList = $("#achievementList");
const leaderboardList = $("#leaderboardList");
const progressTracker = $("#progressTracker");
const quizReviewPanel = $("#quizReviewPanel");
const quizReviewList = $("#quizReviewList");
const certificatePanel = $("#certificatePanel");
const certificateName = $("#certificateName");
const certificateDetails = $("#certificateDetails");
const printCertificateButton = $("#printCertificateButton");

const savedTheme = localStorage.getItem("vertex-theme") || "deep-space";
const savedMute = localStorage.getItem("vertex-muted") === "true";
const savedAutoSpeak = localStorage.getItem("vertex-auto-speak");
const quizStorageKey = "vertex-ai-academy";
const quizLeaderboardKey = "vertex-ai-leaderboard";

let allModels = [];
let soundsMuted = savedMute;
let autoSpeakEnabled = savedAutoSpeak === null ? true : savedAutoSpeak === "true";
let preferredVoice = null;
let recognition = null;
let recognitionActive = false;
let recognitionStopRequested = false;
let recognitionRestartTimer = null;
let voiceMode = "ready";
let lastCompletedReplyText = "";
let activeReplyTurnId = 0;
let activeTypingCleanup = null;
let quizDatabase = { categories: [], questions: [] };
let selectedQuizCategory = "prompt-engineering";
let quizTimerInterval = null;
let quizState = {
  questions: [],
  index: 0,
  score: 0,
  correct: 0,
  streak: 0,
  answered: false,
  secondsLeft: 0,
  totalSeconds: 0,
  results: []
};

const badgeRules = [
  { id: "prompt-builder", name: "Prompt Builder", test: (stats) => stats.completed >= 1 },
  { id: "llm-operator", name: "LLM Operator", test: (stats) => stats.correct >= 10 },
  { id: "systems-thinker", name: "Systems Thinker", test: (stats) => stats.answered >= 25 },
  { id: "ai-architect", name: "AI Architect", test: (stats) => stats.bestPercent >= 80 }
];

function playSound(soundName) {
  if (soundsMuted) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    const soundMap = { send: 520, reply: 760, click: 360 };
    oscillator.frequency.value = soundMap[soundName] || 440;
    oscillator.type = "sine";
    volume.gain.value = 0.035;
    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.07);
    oscillator.addEventListener("ended", () => audioContext.close());
  } catch (error) {
    // Browser audio can be blocked until a user interaction.
  }
}

function updateClock() {
  if (!missionClock) return;
  missionClock.textContent = new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function updateMuteButton() {
  if (muteButton) {
    muteButton.textContent = soundsMuted ? "Sound Off" : "Sound On";
  }
}

function applyTheme(themeName) {
  document.body.dataset.theme = themeName;
  if (themeSelect) themeSelect.value = themeName;
  localStorage.setItem("vertex-theme", themeName);
}

function syncAutoSpeak() {
  if (autoSpeakToggle) autoSpeakToggle.checked = autoSpeakEnabled;
  if (voiceAutoSpeakToggle) voiceAutoSpeakToggle.checked = autoSpeakEnabled;
  localStorage.setItem("vertex-auto-speak", String(autoSpeakEnabled));
}

function getCurrentTimeText() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noreferrer\">$1</a>")
    .replace(/(https?:\/\/[^\s<]+)/g, "<a href=\"$1\" target=\"_blank\" rel=\"noreferrer\">$1</a>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

function renderMarkdown(text) {
  const lines = String(text || "").split("\n");
  const html = [];
  let listOpen = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      if (listOpen) {
        html.push("</ul>");
        listOpen = false;
      }
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      const rows = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        const tableLine = lines[index].trim();
        if (!/^\|\s*-/.test(tableLine)) {
          rows.push(tableLine.split("|").slice(1, -1).map((cell) => renderInlineMarkdown(cell.trim())));
        }
        index += 1;
      }
      index -= 1;
      if (rows.length) {
        html.push("<table><tbody>");
        rows.forEach((row, rowIndex) => {
          const tag = rowIndex === 0 ? "th" : "td";
          html.push(`<tr>${row.map((cell) => `<${tag}>${cell}</${tag}>`).join("")}</tr>`);
        });
        html.push("</tbody></table>");
      }
      continue;
    }

    if (/^[-*]\s/.test(line) || /^\d+\.\s/.test(line)) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${renderInlineMarkdown(line.replace(/^[-*]\s/, "").replace(/^\d+\.\s/, ""))}</li>`);
      continue;
    }

    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
    html.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  if (listOpen) html.push("</ul>");
  return html.join("");
}

function addMessage(speaker, text, type, options = {}) {
  const message = document.createElement("div");
  message.className = `message ${type}`;

  const speakerLabel = document.createElement("span");
  speakerLabel.className = "speaker";
  speakerLabel.textContent = speaker;

  const body = document.createElement("div");
  body.className = "message-body";
  body.textContent = text;

  const timestamp = document.createElement("time");
  timestamp.className = "message-time";
  timestamp.dateTime = new Date().toISOString();
  timestamp.textContent = getCurrentTimeText();

  message.append(speakerLabel, body, timestamp);

  if (type === "bot" && options.speakable !== false && "speechSynthesis" in window) {
    const actions = document.createElement("div");
    actions.className = "message-actions";

    const speakButton = document.createElement("button");
    speakButton.className = "secondary-button";
    speakButton.type = "button";
    speakButton.textContent = "Speak";
    speakButton.addEventListener("click", () => speakCompletedReply(text));

    const stopButton = document.createElement("button");
    stopButton.className = "secondary-button";
    stopButton.type = "button";
    stopButton.textContent = "Stop";
    stopButton.addEventListener("click", stopSpeaking);
    actions.append(speakButton, stopButton);
    message.appendChild(actions);
  }

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return { message, body };
}

function setThinkingState(isThinking) {
  vertexAvatar?.classList.toggle("is-thinking", isThinking);
  if (avatarStatus) {
    avatarStatus.textContent = isThinking ? "Processing with the AI core..." : "Ready for AI and technology questions.";
  }
  if (isThinking) {
    setVoiceMode("processing", "VERTEX is thinking.");
  } else if (!recognitionActive && voiceMode !== "speaking" && voiceMode !== "unsupported") {
    setVoiceMode("ready");
  }
}

function beginNewReplyTurn() {
  activeReplyTurnId += 1;
  activeTypingCleanup?.();
  activeTypingCleanup = null;
  stopListening();
  stopSpeaking();
  return activeReplyTurnId;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function typeBotReply(messageNode, body, fullText, turnId) {
  let index = 0;
  body.textContent = "";

  return new Promise((resolve) => {
    const timer = window.setInterval(() => {
      if (turnId !== activeReplyTurnId) {
        window.clearInterval(timer);
        resolve(false);
        return;
      }
      body.textContent += fullText.charAt(index);
      index += 1;
      chatMessages.scrollTop = chatMessages.scrollHeight;
      if (index >= fullText.length) {
        window.clearInterval(timer);
        body.innerHTML = renderMarkdown(fullText);
        resolve(true);
      }
    }, 16);
    activeTypingCleanup = () => {
      window.clearInterval(timer);
      messageNode.remove();
      resolve(false);
    };
  });
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeoutMs || 12000);
  const startedAt = performance.now();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    const data = await response.json();
    if (latencyMetric && url === "/chat") {
      latencyMetric.textContent = `${Math.round(performance.now() - startedAt)}ms`;
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The request timed out.");
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

chatForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const message = userInput.value.trim();
  if (!message) return;

  const turnId = beginNewReplyTurn();
  addMessage("You", message, "user", { speakable: false });
  userInput.value = "";
  playSound("send");
  setThinkingState(true);

  const thinking = addMessage("VERTEX", "Thinking...", "bot thinking", { speakable: false });

  try {
    const data = await fetchJson("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    await sleep(240);
    if (turnId !== activeReplyTurnId) return;
    thinking.message.remove();
    const reply = addMessage("VERTEX", data.response, "bot");
    const finished = await typeBotReply(reply.message, reply.body, data.response, turnId);
    activeTypingCleanup = null;
    if (!finished || turnId !== activeReplyTurnId) return;
    lastCompletedReplyText = data.response;
    playSound("reply");
    if (autoSpeakEnabled) {
      await sleep(180);
      if (turnId === activeReplyTurnId) speakCompletedReply(data.response);
    }
  } catch (error) {
    thinking.message.remove();
    const text = error?.message || "Connection problem. Check if Flask is running.";
    const reply = addMessage("VERTEX", text, "bot", { speakable: false });
    await typeBotReply(reply.message, reply.body, text, turnId);
  } finally {
    if (turnId === activeReplyTurnId) setThinkingState(false);
  }
});

sampleQuestions.forEach((button) => {
  button.addEventListener("click", () => {
    userInput.value = button.textContent;
    chatForm.requestSubmit();
  });
});

function chooseBestVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith("en")) || voices[0] || null;
}

function stripMarkdownForSpeech(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
    .replace(/[*_`>#|]/g, " ")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function setVoiceMode(mode, message) {
  voiceMode = mode;
  const labels = {
    ready: "Voice Mode: Ready",
    listening: "Voice Mode: Listening",
    processing: "Voice Mode: Thinking",
    speaking: "Voice Mode: Speaking",
    "permission-denied": "Microphone blocked",
    unsupported: "Unsupported browser"
  };
  const messages = {
    ready: "Tap Talk to Vertex and ask a technology question out loud.",
    listening: "Speak now. VERTEX is listening.",
    processing: "VERTEX is processing the question.",
    speaking: "VERTEX is speaking the completed answer.",
    "permission-denied": "Microphone permission is blocked. Allow microphone access in your browser settings.",
    unsupported: "Voice input works best in Chrome or Microsoft Edge."
  };
  if (voiceModeStatus) voiceModeStatus.textContent = labels[mode] || labels.ready;
  if (voiceStatusText) voiceStatusText.textContent = message || messages[mode] || messages.ready;
  if (voiceRetryButton) voiceRetryButton.hidden = mode !== "permission-denied";
  if (voiceWaveform) {
    voiceWaveform.className = "voice-waveform";
    if (["listening", "processing", "speaking"].includes(mode)) {
      voiceWaveform.classList.add("is-active", `is-${mode}`);
    }
  }
}

function speakCompletedReply(text) {
  if (!("speechSynthesis" in window)) {
    setVoiceMode("unsupported");
    return;
  }
  const speechText = stripMarkdownForSpeech(text);
  if (!speechText) return;
  preferredVoice = preferredVoice || chooseBestVoice();
  const utterance = new SpeechSynthesisUtterance(speechText);
  utterance.voice = preferredVoice;
  utterance.lang = preferredVoice?.lang || "en-US";
  utterance.rate = 0.96;
  utterance.onstart = () => setVoiceMode("speaking");
  utterance.onend = () => setVoiceMode("ready");
  utterance.onerror = () => setVoiceMode("ready", "Speech output could not play.");
  stopSpeaking();
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  if (voiceMode === "speaking") setVoiceMode("ready", "Speech stopped.");
}

function speakLastAnswer() {
  if (!lastCompletedReplyText) {
    setVoiceMode("ready", "No completed answer is available yet.");
    return;
  }
  speakCompletedReply(lastCompletedReplyText);
}

function ensureRecognition() {
  if (recognition) return recognition;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.addEventListener("start", () => {
    recognitionActive = true;
    recognitionStopRequested = false;
    if (voiceButton) voiceButton.textContent = "Listening";
    setVoiceMode("listening");
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
    recognitionStopRequested = true;
    stopListening();
    if (transcript) {
      userInput.value = transcript;
      chatForm.requestSubmit();
    } else {
      setVoiceMode("ready", "No speech was detected. Try again.");
    }
  });

  recognition.addEventListener("end", () => {
    recognitionActive = false;
    if (voiceButton) voiceButton.textContent = "Talk to Vertex";
    if (!recognitionStopRequested && voiceMode === "listening") {
      setVoiceMode("ready", "Microphone stopped. Tap Talk to Vertex to retry.");
    }
  });

  recognition.addEventListener("error", (event) => {
    recognitionActive = false;
    recognitionStopRequested = true;
    clearTimeout(recognitionRestartTimer);
    if (voiceButton) voiceButton.textContent = "Talk to Vertex";
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      setVoiceMode("permission-denied");
    } else if (event.error === "no-speech") {
      setVoiceMode("ready", "No speech was detected. Try again.");
    } else {
      setVoiceMode("ready", "Voice recognition stopped.");
    }
  });

  return recognition;
}

function stopListening() {
  if (!recognition || !recognitionActive) return;
  recognitionStopRequested = true;
  clearTimeout(recognitionRestartTimer);
  try {
    recognition.stop();
  } catch (error) {
    try { recognition.abort(); } catch (abortError) {}
  }
  recognitionActive = false;
  if (voiceButton) voiceButton.textContent = "Talk to Vertex";
}

async function checkMicrophonePermission() {
  if (!navigator.permissions?.query) return "unknown";
  try {
    const result = await navigator.permissions.query({ name: "microphone" });
    return result.state || "unknown";
  } catch (error) {
    return "unknown";
  }
}

async function startListening() {
  const activeRecognition = ensureRecognition();
  if (!activeRecognition) {
    setVoiceMode("unsupported");
    addMessage("VERTEX", "Voice recognition is not supported in this browser. Please use Chrome or Edge.", "bot", { speakable: false });
    return;
  }
  stopSpeaking();
  setVoiceMode("processing", "Checking microphone permission...");
  const permission = await checkMicrophonePermission();
  if (permission === "denied") {
    setVoiceMode("permission-denied");
    return;
  }
  recognitionStopRequested = false;
  try {
    activeRecognition.start();
  } catch (error) {
    setVoiceMode("ready", "Voice recognition could not start. Please try again.");
  }
}

function setupVoice() {
  if (!ensureRecognition()) {
    setVoiceMode("unsupported");
    if (voiceButton) voiceButton.disabled = true;
    return;
  }
  setVoiceMode("ready");
  voiceButton?.addEventListener("click", () => recognitionActive ? stopListening() : startListening());
  voiceRetryButton?.addEventListener("click", startListening);
  stopListeningButton?.addEventListener("click", stopListening);
  voiceStopSpeakingButton?.addEventListener("click", stopSpeaking);
  voiceSpeakLastButton?.addEventListener("click", speakLastAnswer);
  if ("speechSynthesis" in window) {
    preferredVoice = chooseBestVoice();
    window.speechSynthesis.addEventListener("voiceschanged", () => {
      preferredVoice = chooseBestVoice();
    });
  }
}

function showCardError(container, message) {
  if (!container) return;
  container.innerHTML = `<p class="error-text">${escapeHtml(message)}</p>`;
}

function renderNews(items) {
  newsGrid.innerHTML = "";
  items.forEach((item) => {
    const card = document.createElement("article");
    card.className = "info-card glass-panel";
    card.innerHTML = `
      <span class="tag">${escapeHtml(item.agency || item.source || "AI")}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p class="card-meta">${escapeHtml(item.date || "Signal")}</p>
      <p>${escapeHtml(item.summary)}</p>
    `;
    newsGrid.appendChild(card);
  });
}

function renderModels(models) {
  planetGrid.innerHTML = "";
  if (!models.length) {
    planetGrid.innerHTML = "<p class=\"error-text\">No model found.</p>";
    return;
  }
  models.forEach((model) => {
    const card = document.createElement("article");
    card.className = "model-card glass-panel";
    card.innerHTML = `
      <span class="tag">${escapeHtml(model.company)}</span>
      <h3>${escapeHtml(model.name)}</h3>
      <p>${escapeHtml(model.summary || model.fact || "")}</p>
      <div class="model-stats">
        <p><strong>Context</strong><span>${escapeHtml(model.context_window || "Varies")}</span></p>
        <p><strong>Pricing</strong><span>${escapeHtml(model.pricing || "Varies")}</span></p>
        <p><strong>Strengths</strong><span>${escapeHtml(model.strengths || "")}</span></p>
        <p><strong>Weaknesses</strong><span>${escapeHtml(model.weaknesses || "")}</span></p>
      </div>
      <p class="card-meta">Benchmarks: ${escapeHtml(model.benchmarks || "Use current evals before production choices.")}</p>
    `;
    planetGrid.appendChild(card);
  });
}

function filterModels() {
  const search = planetSearch.value.toLowerCase().trim();
  renderModels(allModels.filter((model) => {
    return [model.name, model.company, model.strengths, model.summary].join(" ").toLowerCase().includes(search);
  }));
}

function renderCompanies(companies) {
  agencyGrid.innerHTML = "";
  companies.forEach((company) => {
    const card = document.createElement("article");
    card.className = "info-card glass-panel";
    card.innerHTML = `
      <span class="tag">${escapeHtml(company.country || company.category || "AI Company")}</span>
      <h3>${escapeHtml(company.name)}</h3>
      <p class="card-meta">Founded: ${escapeHtml(String(company.founded || "N/A"))}</p>
      <p>${escapeHtml(company.description)}</p>
      <a class="card-link" href="${company.website}" target="_blank" rel="noreferrer">Official website</a>
    `;
    agencyGrid.appendChild(card);
  });
}

function renderTrends(trends) {
  launchList.innerHTML = "";
  trends.forEach((trend) => {
    const card = document.createElement("article");
    card.className = "trend-card";
    card.innerHTML = `
      <span class="tag">${escapeHtml(trend.status || trend.category)}</span>
      <h3>${escapeHtml(trend.mission_name || trend.title)}</h3>
      <p class="card-meta">${escapeHtml(trend.agency || trend.signal || "")}</p>
      <p>${escapeHtml(trend.description)}</p>
    `;
    launchList.appendChild(card);
  });
  if (missionUpdatedText) {
    missionUpdatedText.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
  }
}

async function loadDashboardData() {
  try {
    renderNews(await fetchJson("/api/space-news"));
  } catch (error) {
    showCardError(newsGrid, error?.message || "AI news could not load.");
  }
  try {
    allModels = await fetchJson("/api/planets");
    renderModels(allModels);
  } catch (error) {
    showCardError(planetGrid, error?.message || "AI models could not load.");
  }
  try {
    renderCompanies(await fetchJson("/api/agencies"));
  } catch (error) {
    showCardError(agencyGrid, error?.message || "AI companies could not load.");
  }
  try {
    renderTrends(await fetchJson("/api/launches"));
  } catch (error) {
    showCardError(launchList, error?.message || "AI trends could not load.");
  }
}

async function loadAiStatus() {
  try {
    const status = await fetchJson("/api/ai-status");
    aiStatusMode.textContent = status.mode || "online";
    aiStatusMessage.textContent = status.message || "VERTEX is ready.";
  } catch (error) {
    aiStatusMode.textContent = "local";
    aiStatusMessage.textContent = "AI status could not load, but local mode still works.";
  }
}

function getSavedQuizStats() {
  const fallback = {
    answered: 0,
    correct: 0,
    incorrect: 0,
    completed: 0,
    bestScore: 0,
    bestPercent: 0,
    categoryCounts: {},
    completedCategories: [],
    answeredQuestions: [],
    badges: []
  };
  try {
    return { ...fallback, ...JSON.parse(localStorage.getItem(quizStorageKey) || "{}") };
  } catch (error) {
    return fallback;
  }
}

function saveQuizStats(stats) {
  localStorage.setItem(quizStorageKey, JSON.stringify(stats));
}

function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(quizLeaderboardKey) || "[]");
  } catch (error) {
    return [];
  }
}

function saveLeaderboard(entries) {
  localStorage.setItem(quizLeaderboardKey, JSON.stringify(entries.slice(0, 10)));
}

function shuffleItems(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function normalizeAnswer(value) {
  return String(value || "").trim().toLowerCase();
}

function getPlayerName() {
  return quizPlayerName.value.trim() || "Builder";
}

function getCategoryName(categoryId) {
  return quizDatabase.categories.find((item) => item.id === categoryId)?.name || "Mixed AI";
}

function getSelectedQuestions() {
  const difficulty = quizDifficultySelect.value;
  const type = quizTypeSelect.value;
  const completion = quizCompletionSelect.value;
  const searchText = quizSearchInput.value.toLowerCase().trim();
  const stats = getSavedQuizStats();
  let questions = quizDatabase.questions;

  if (selectedQuizCategory && selectedQuizCategory !== "all") {
    questions = questions.filter((question) => question.category === selectedQuizCategory);
  }
  if (difficulty !== "all") {
    questions = questions.filter((question) => question.difficulty === difficulty);
  }
  if (type !== "all") {
    questions = questions.filter((question) => question.type === type);
  }
  if (completion === "completed") {
    questions = questions.filter((question) => stats.answeredQuestions.includes(question.id));
  }
  if (completion === "unanswered") {
    questions = questions.filter((question) => !stats.answeredQuestions.includes(question.id));
  }
  if (searchText) {
    questions = questions.filter((question) => JSON.stringify(question).toLowerCase().includes(searchText));
  }
  const limitMap = { practice: 10, challenge: 10, exam: 20, adventure: 8, daily: 5 };
  return shuffleItems(questions).slice(0, limitMap[quizModeSelect.value] || 10);
}

function renderQuizCategories() {
  quizCategoryGrid.innerHTML = "";
  quizDatabase.categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `quiz-category-card${category.id === selectedQuizCategory ? " active" : ""}`;
    button.innerHTML = `<strong>${escapeHtml(category.name)}</strong><small>${escapeHtml(category.description)}</small>`;
    button.addEventListener("click", () => {
      selectedQuizCategory = category.id;
      renderQuizCategories();
    });
    quizCategoryGrid.appendChild(button);
  });
}

function updateQuizProgressViews() {
  const stats = getSavedQuizStats();
  const total = Math.max(stats.answered, 1);
  const percent = Math.round((stats.correct / total) * 100);
  const favorite = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1])[0];

  achievementList.innerHTML = "";
  badgeRules.forEach((badge) => {
    const item = document.createElement("span");
    item.className = `achievement-badge${stats.badges.includes(badge.id) ? " unlocked" : ""}`;
    item.textContent = badge.name;
    achievementList.appendChild(item);
  });

  leaderboardList.innerHTML = "";
  const leaderboard = getLeaderboard();
  if (!leaderboard.length) {
    leaderboardList.innerHTML = "<li>No scores yet. Start a quiz.</li>";
  } else {
    leaderboard.forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = `${entry.name} - ${entry.score} pts (${entry.percent}%)`;
      leaderboardList.appendChild(item);
    });
  }

  progressTracker.innerHTML = `
    <p><strong>Questions answered:</strong> ${stats.answered}</p>
    <p><strong>Accuracy:</strong> ${percent}%</p>
    <p><strong>Favorite category:</strong> ${favorite ? getCategoryName(favorite[0]) : "None yet"}</p>
    <p><strong>Completed quizzes:</strong> ${stats.completed}</p>
  `;
}

function updateScoreDisplay() {
  const percent = Math.round((quizState.correct / Math.max(quizState.questions.length, 1)) * 100);
  quizScore.textContent = `Score: ${quizState.score}`;
  quizScoreCircle.textContent = `${percent}%`;
  quizScoreCircle.style.background = `conic-gradient(var(--accent) ${percent}%, rgba(255,255,255,0.1) 0)`;
  quizStreak.textContent = `${quizState.streak} correct in a row`;
}

function stopQuizTimer() {
  if (quizTimerInterval) window.clearInterval(quizTimerInterval);
  quizTimerInterval = null;
}

function startQuizTimer(seconds) {
  stopQuizTimer();
  quizState.totalSeconds = seconds;
  quizState.secondsLeft = seconds;
  if (!seconds) {
    quizTimer.textContent = "No timer";
    quizTimerBar.style.width = "0%";
    return;
  }
  quizTimer.textContent = `${seconds}s`;
  quizTimerBar.style.width = "100%";
  quizTimerInterval = window.setInterval(() => {
    quizState.secondsLeft -= 1;
    const percent = Math.max(0, (quizState.secondsLeft / quizState.totalSeconds) * 100);
    quizTimer.textContent = `${Math.max(quizState.secondsLeft, 0)}s`;
    quizTimerBar.style.width = `${percent}%`;
    if (quizState.secondsLeft <= 0) {
      stopQuizTimer();
      submitQuizAnswer("__timeout__");
    }
  }, 1000);
}

function getTimerSecondsForMode() {
  if (quizTimerSelect.value !== "0") return Number(quizTimerSelect.value);
  return quizModeSelect.value === "challenge" ? 30 : 0;
}

function renderChoices(question) {
  quizChoices.innerHTML = "";
  fillBlankForm.hidden = question.type !== "fill_blank";
  nextQuizButton.hidden = true;
  if (question.type === "fill_blank") {
    fillBlankInput.value = "";
    fillBlankInput.focus();
    return;
  }
  const choices = question.type === "true_false" ? ["True", "False"] : question.choices;
  choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quiz-choice";
    button.textContent = choice;
    button.addEventListener("click", () => submitQuizAnswer(choice));
    quizChoices.appendChild(button);
  });
}

function showQuizQuestion() {
  const question = quizState.questions[quizState.index];
  if (!question) {
    finishQuiz();
    return;
  }
  quizState.answered = false;
  quizFeedback.textContent = "Choose an answer. VERTEX will explain it after you submit.";
  quizProgress.textContent = `Question ${quizState.index + 1} of ${quizState.questions.length}`;
  quizQuestionType.textContent = String(question.type || "multiple_choice").replaceAll("_", " ");
  quizDifficultyTag.textContent = question.difficulty;
  quizQuestion.textContent = question.question;
  if (question.image_url) {
    quizImage.src = question.image_url;
    quizImage.alt = question.topic || "AI Academy image";
    quizImage.hidden = false;
  } else {
    quizImage.hidden = true;
  }
  renderChoices(question);
  startQuizTimer(getTimerSecondsForMode());
  updateScoreDisplay();
}

function updateStatsAfterAnswer(question, isCorrect) {
  const stats = getSavedQuizStats();
  stats.answered += 1;
  stats.correct += isCorrect ? 1 : 0;
  stats.incorrect += isCorrect ? 0 : 1;
  stats.categoryCounts[question.category] = (stats.categoryCounts[question.category] || 0) + 1;
  if (!stats.answeredQuestions.includes(question.id)) stats.answeredQuestions.push(question.id);
  badgeRules.forEach((badge) => {
    if (!stats.badges.includes(badge.id) && badge.test(stats)) stats.badges.push(badge.id);
  });
  saveQuizStats(stats);
}

function submitQuizAnswer(answer) {
  const question = quizState.questions[quizState.index];
  if (!question || quizState.answered) return;
  stopQuizTimer();
  quizState.answered = true;
  const isCorrect = normalizeAnswer(answer) === normalizeAnswer(question.answer);
  quizState.correct += isCorrect ? 1 : 0;
  quizState.streak = isCorrect ? quizState.streak + 1 : 0;
  quizState.score += isCorrect ? Number(question.points || 10) : 0;
  quizState.results.push({ question, answer, isCorrect });
  updateStatsAfterAnswer(question, isCorrect);
  quizFeedback.textContent = `${isCorrect ? "Correct." : `Not quite. Correct answer: ${question.answer}.`} ${question.explanation || ""} ${question.fact || ""}`;
  [...quizChoices.children].forEach((button) => {
    button.disabled = true;
    if (normalizeAnswer(button.textContent) === normalizeAnswer(question.answer)) {
      button.classList.add("active");
    }
  });
  nextQuizButton.hidden = false;
  updateScoreDisplay();
  updateQuizProgressViews();
}

function finishQuiz() {
  stopQuizTimer();
  const percent = Math.round((quizState.correct / Math.max(quizState.questions.length, 1)) * 100);
  quizQuestion.textContent = "AI Academy session complete.";
  quizChoices.innerHTML = "";
  nextQuizButton.hidden = true;
  quizFeedback.textContent = `Final score: ${quizState.score} points, ${percent}% accuracy.`;

  const stats = getSavedQuizStats();
  stats.completed += 1;
  stats.bestScore = Math.max(stats.bestScore, quizState.score);
  stats.bestPercent = Math.max(stats.bestPercent, percent);
  if (!stats.completedCategories.includes(selectedQuizCategory)) stats.completedCategories.push(selectedQuizCategory);
  badgeRules.forEach((badge) => {
    if (!stats.badges.includes(badge.id) && badge.test(stats)) stats.badges.push(badge.id);
  });
  saveQuizStats(stats);

  const leaderboard = getLeaderboard();
  leaderboard.push({ name: getPlayerName(), score: quizState.score, percent, date: new Date().toISOString() });
  leaderboard.sort((a, b) => b.score - a.score);
  saveLeaderboard(leaderboard);

  if (percent >= 80) {
    certificatePanel.hidden = false;
    certificateName.textContent = getPlayerName();
    certificateDetails.textContent = `Completed AI Academy with ${percent}% accuracy and ${quizState.score} points.`;
  }
  updateQuizProgressViews();
}

function startQuiz() {
  certificatePanel.hidden = true;
  quizReviewPanel.hidden = true;
  quizState = {
    questions: getSelectedQuestions(),
    index: 0,
    score: 0,
    correct: 0,
    streak: 0,
    answered: false,
    secondsLeft: 0,
    totalSeconds: 0,
    results: []
  };
  if (!quizState.questions.length) {
    quizQuestion.textContent = "No questions match these filters.";
    quizChoices.innerHTML = "";
    return;
  }
  showQuizQuestion();
}

function showReview() {
  quizReviewPanel.hidden = false;
  quizReviewList.innerHTML = quizState.results.map((result, index) => `
    <article class="info-card">
      <strong>${index + 1}. ${escapeHtml(result.question.question)}</strong>
      <p>Your answer: ${escapeHtml(result.answer)}</p>
      <p>Correct answer: ${escapeHtml(result.question.answer)}</p>
      <p>${escapeHtml(result.question.explanation || "")}</p>
    </article>
  `).join("");
}

async function generateQuiz(topic = "", difficulty = "", limit = 10) {
  quizFeedback.textContent = "VERTEX is generating quiz questions...";
  try {
    const data = await fetchJson("/api/quiz-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, difficulty, limit }),
      timeoutMs: 20000
    });
    quizState.questions = data.questions || [];
    quizState.index = 0;
    quizState.score = 0;
    quizState.correct = 0;
    quizState.streak = 0;
    quizState.results = [];
    showQuizQuestion();
  } catch (error) {
    quizFeedback.textContent = error?.message || "Quiz generation failed.";
  }
}

async function loadQuizDatabase() {
  try {
    quizDatabase = await fetchJson("/api/quiz-database");
    selectedQuizCategory = quizDatabase.categories[0]?.id || "prompt-engineering";
    quizBankCount.textContent = `${quizDatabase.questions.length} questions`;
    renderQuizCategories();
    updateQuizProgressViews();
  } catch (error) {
    quizCategoryGrid.innerHTML = "<p class=\"error-text\">AI Academy could not load.</p>";
  }
}

function bindNavigation() {
  sidebarToggle?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
    sidebarToggle.setAttribute("aria-expanded", String(document.body.classList.contains("sidebar-open")));
    sidebarOverlay.hidden = !document.body.classList.contains("sidebar-open");
  });
  sidebarOverlay?.addEventListener("click", () => {
    document.body.classList.remove("sidebar-open");
    sidebarOverlay.hidden = true;
  });
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
      sidebarLinks.forEach((item) => item.classList.remove("is-active"));
      link.classList.add("is-active");
      document.body.classList.remove("sidebar-open");
      if (sidebarOverlay) sidebarOverlay.hidden = true;
    });
  });
}

function bindControls() {
  planetSearch?.addEventListener("input", filterModels);
  themeSelect?.addEventListener("change", () => applyTheme(themeSelect.value));
  themeToggle?.addEventListener("click", () => {
    const next = document.body.dataset.theme === "blue-neon" ? "deep-space" : "blue-neon";
    applyTheme(next);
  });
  settingsButton?.addEventListener("click", () => {
    document.querySelector("#settings")?.scrollIntoView({ behavior: "smooth" });
  });
  muteButton?.addEventListener("click", () => {
    soundsMuted = !soundsMuted;
    localStorage.setItem("vertex-muted", String(soundsMuted));
    updateMuteButton();
  });
  autoSpeakToggle?.addEventListener("change", () => {
    autoSpeakEnabled = autoSpeakToggle.checked;
    syncAutoSpeak();
  });
  voiceAutoSpeakToggle?.addEventListener("change", () => {
    autoSpeakEnabled = voiceAutoSpeakToggle.checked;
    syncAutoSpeak();
  });
  presentationButton?.addEventListener("click", () => document.body.classList.add("presentation-mode"));
  exitPresentationButton?.addEventListener("click", () => document.body.classList.remove("presentation-mode"));
  document.addEventListener("click", (event) => {
    if (event.target.closest("button")) playSound("click");
  });
}

function bindQuiz() {
  startQuizButton?.addEventListener("click", startQuiz);
  restartQuizButton?.addEventListener("click", startQuiz);
  dailyQuizButton?.addEventListener("click", () => {
    quizModeSelect.value = "daily";
    startQuiz();
  });
  randomQuizButton?.addEventListener("click", () => {
    selectedQuizCategory = "all";
    startQuiz();
  });
  nextQuizButton?.addEventListener("click", () => {
    quizState.index += 1;
    showQuizQuestion();
  });
  fillBlankForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    submitQuizAnswer(fillBlankInput.value);
  });
  reviewQuizButton?.addEventListener("click", showReview);
  printCertificateButton?.addEventListener("click", () => window.print());
  quizSearchInput?.addEventListener("input", renderQuizCategories);
  aiQuizButton?.addEventListener("click", () => generateQuiz("generative AI", "", 8));
  tenAiQuizButton?.addEventListener("click", () => generateQuiz("AI and programming", "", 10));
  hardAiQuizButton?.addEventListener("click", () => generateQuiz("machine learning and MLOps", "hard", 10));
  nasaAiQuizButton?.addEventListener("click", () => generateQuiz("prompt engineering", "", 8));
  marsAiQuizButton?.addEventListener("click", () => generateQuiz("large language models", "", 8));
  astronomyAiQuizButton?.addEventListener("click", () => generateQuiz("MLOps", "", 8));
}

function init() {
  applyTheme(savedTheme);
  updateMuteButton();
  syncAutoSpeak();
  updateClock();
  window.setInterval(updateClock, 1000);
  bindNavigation();
  bindControls();
  setupVoice();
  bindQuiz();
  loadAiStatus();
  loadDashboardData();
  loadQuizDatabase();
}

init();
