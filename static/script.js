const chatForm = document.querySelector("#chatForm");
const userInput = document.querySelector("#userInput");
const chatMessages = document.querySelector("#chatMessages");
const sampleQuestions = document.querySelectorAll(".sample-question");
const voiceButton = document.querySelector("#voiceButton");
const stopListeningButton = document.querySelector("#stopListeningButton");
const voiceSpeakLastButton = document.querySelector("#voiceSpeakLastButton");
const voiceStopSpeakingButton = document.querySelector("#voiceStopSpeakingButton");
const apodCard = document.querySelector("#apodCard");
const newsGrid = document.querySelector("#newsGrid");
const planetGrid = document.querySelector("#planetGrid");
const planetSearch = document.querySelector("#planetSearch");
const agencyGrid = document.querySelector("#agencyGrid");
const issCard = document.querySelector("#issCard");
const launchList = document.querySelector("#launchList");
const refreshMissionButton = document.querySelector("#refreshMissionButton");
const missionUpdatedText = document.querySelector("#missionUpdatedText");
const vertexAvatar = document.querySelector("#vertexAvatar");
const avatarStatus = document.querySelector("#avatarStatus");
const themeSelect = document.querySelector("#themeSelect");
const muteButton = document.querySelector("#muteButton");
const presentationButton = document.querySelector("#presentationButton");
const exitPresentationButton = document.querySelector("#exitPresentationButton");
const autoSpeakToggle = document.querySelector("#autoSpeakToggle");
const voiceAutoSpeakToggle = document.querySelector("#voiceAutoSpeakToggle");
const voiceModeStatus = document.querySelector("#voiceModeStatus");
const voiceStatusText = document.querySelector("#voiceStatusText");
const voiceWaveform = document.querySelector("#voiceWaveform");
const missionClock = document.querySelector("#missionClock");
const missionStatusText = document.querySelector("#missionStatusText");
const quizPlayerName = document.querySelector("#quizPlayerName");
const quizModeSelect = document.querySelector("#quizModeSelect");
const quizDifficultySelect = document.querySelector("#quizDifficultySelect");
const quizTypeSelect = document.querySelector("#quizTypeSelect");
const quizCompletionSelect = document.querySelector("#quizCompletionSelect");
const quizTimerSelect = document.querySelector("#quizTimerSelect");
const quizSearchInput = document.querySelector("#quizSearchInput");
const quizCategoryGrid = document.querySelector("#quizCategoryGrid");
const startQuizButton = document.querySelector("#startQuizButton");
const dailyQuizButton = document.querySelector("#dailyQuizButton");
const randomQuizButton = document.querySelector("#randomQuizButton");
const aiQuizButton = document.querySelector("#aiQuizButton");
const hardAiQuizButton = document.querySelector("#hardAiQuizButton");
const nasaAiQuizButton = document.querySelector("#nasaAiQuizButton");
const marsAiQuizButton = document.querySelector("#marsAiQuizButton");
const astronomyAiQuizButton = document.querySelector("#astronomyAiQuizButton");
const quizProgress = document.querySelector("#quizProgress");
const quizScore = document.querySelector("#quizScore");
const quizScoreCircle = document.querySelector("#quizScoreCircle");
const quizTimer = document.querySelector("#quizTimer");
const quizTimerBar = document.querySelector("#quizTimerBar");
const quizStreak = document.querySelector("#quizStreak");
const quizBankCount = document.querySelector("#quizBankCount");
const quizQuestionType = document.querySelector("#quizQuestionType");
const quizDifficultyTag = document.querySelector("#quizDifficultyTag");
const quizImage = document.querySelector("#quizImage");
const quizQuestion = document.querySelector("#quizQuestion");
const quizChoices = document.querySelector("#quizChoices");
const fillBlankForm = document.querySelector("#fillBlankForm");
const fillBlankInput = document.querySelector("#fillBlankInput");
const quizFeedback = document.querySelector("#quizFeedback");
const restartQuizButton = document.querySelector("#restartQuizButton");
const reviewQuizButton = document.querySelector("#reviewQuizButton");
const nextQuizButton = document.querySelector("#nextQuizButton");
const achievementList = document.querySelector("#achievementList");
const leaderboardList = document.querySelector("#leaderboardList");
const progressTracker = document.querySelector("#progressTracker");
const quizReviewPanel = document.querySelector("#quizReviewPanel");
const quizReviewList = document.querySelector("#quizReviewList");
const certificatePanel = document.querySelector("#certificatePanel");
const certificateName = document.querySelector("#certificateName");
const certificateDetails = document.querySelector("#certificateDetails");
const printCertificateButton = document.querySelector("#printCertificateButton");
const aiStatusMode = document.querySelector("#aiStatusMode");
const aiStatusMessage = document.querySelector("#aiStatusMessage");
const tenAiQuizButton = document.querySelector("#tenAiQuizButton");
const backupSpaceImage = "/static/images/apod-backup.svg";
const savedTheme = localStorage.getItem("vertex-theme") || "deep-space";
const savedMute = localStorage.getItem("vertex-muted") === "true";
const savedAutoSpeak = localStorage.getItem("vertex-auto-speak");
let allPlanets = [];
let soundsMuted = savedMute;
let autoSpeakEnabled = savedAutoSpeak === null ? true : savedAutoSpeak === "true";
let preferredVoice = null;
let activeReplyTurnId = 0;
let activeThinkingCleanup = null;
let activeTypingCleanup = null;
let recognition = null;
let recognitionActive = false;
let voiceMode = "ready";
let lastCompletedReplyText = "";
let missionClockTimer = null;

const quizStorageKey = "vertex-quiz-academy";
const quizLeaderboardKey = "vertex-quiz-leaderboard";
const badgeRules = [
  { id: "space-cadet", name: "🚀 Space Cadet", test: (stats) => stats.completed >= 1 },
  { id: "mission-specialist", name: "🛰 Mission Specialist", test: (stats) => stats.correct >= 25 },
  { id: "planet-explorer", name: "🌍 Planet Explorer", test: (stats) => stats.completedCategories.includes("solar-system") },
  { id: "galaxy-explorer", name: "🌠 Galaxy Explorer", test: (stats) => stats.completedCategories.includes("galaxies") },
  { id: "junior-astronaut", name: "👨‍🚀 Junior Astronaut", test: (stats) => stats.answered >= 50 },
  { id: "space-scientist", name: "🌌 Space Scientist", test: (stats) => stats.correct >= 100 },
  { id: "quiz-champion", name: "🏆 Quiz Champion", test: (stats) => stats.bestScore >= 300 },
  { id: "space-master", name: "🌟 Space Master", test: (stats) => stats.bestPercent >= 80 }
];
const pointMap = { easy: 10, medium: 20, hard: 30, expert: 50 };
let quizDatabase = { categories: [], questions: [] };
let selectedQuizCategory = "solar-system";
let quizTimerInterval = null;
let quizState = {
  questions: [],
  index: 0,
  score: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  answered: false,
  startedAt: 0,
  secondsLeft: 0,
  totalSeconds: 0,
  results: [],
  active: false
};

function playSound(soundName) {
  if (soundsMuted) {
    return;
  }

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return;
    }

    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    const soundMap = {
      send: 520,
      reply: 740,
      click: 360
    };

    oscillator.frequency.value = soundMap[soundName] || 440;
    oscillator.type = "sine";
    volume.gain.value = 0.04;

    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.08);

    oscillator.addEventListener("ended", () => {
      audioContext.close();
    });
  } catch (error) {
    // Some browsers block audio until the user interacts. VERTEX just stays quiet.
  }
}

function setThinkingState(isThinking) {
  vertexAvatar.classList.toggle("is-thinking", isThinking);
  avatarStatus.textContent = isThinking ? "Thinking about your question..." : "Ready for your next space question.";
  if (isThinking) {
    setVoiceMode("thinking", "VERTEX is thinking about the answer.");
  } else if (!recognitionActive && voiceMode !== "speaking" && voiceMode !== "unsupported") {
    setVoiceMode("ready");
  }
}

function updateMissionClock() {
  if (missionClock) {
    missionClock.textContent = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZoneName: "short"
    });
  }

  if (missionStatusText) {
    missionStatusText.textContent = "ONLINE";
  }
}

function updateAutoSpeakToggle() {
  if (!autoSpeakToggle) {
    return;
  }

  autoSpeakToggle.checked = autoSpeakEnabled;
  if (voiceAutoSpeakToggle) {
    voiceAutoSpeakToggle.checked = autoSpeakEnabled;
  }
}

function setVoiceMode(mode, message) {
  voiceMode = mode;

  if (voiceButton) {
    voiceButton.classList.toggle("is-listening", mode === "listening");
    voiceButton.classList.toggle("is-speaking", mode === "speaking");
  }

  if (voiceModeStatus) {
    const labelMap = {
      ready: "Voice Mode: Ready",
      listening: "Voice Mode: Listening...",
      thinking: "Voice Mode: Thinking...",
      speaking: "Voice Mode: Speaking...",
      stopped: "Voice Mode: Stopped",
      unsupported: "Voice Unsupported"
    };
    voiceModeStatus.textContent = labelMap[mode] || "Voice Mode: Ready";
  }

  if (voiceStatusText) {
    const messageMap = {
      ready: "Tap Talk to Vertex and ask a question out loud.",
      listening: "Speak your question now. VERTEX is listening.",
      thinking: "VERTEX is preparing an answer.",
      speaking: "VERTEX is speaking the completed answer.",
      stopped: "Voice interaction stopped.",
      unsupported: "Voice recognition is not supported in this browser. Please use Chrome or Edge."
    };
    voiceStatusText.textContent = message || messageMap[mode] || messageMap.ready;
  }

  if (!voiceWaveform) {
    return;
  }

  const activeModes = new Set(["listening", "thinking", "speaking"]);
  voiceWaveform.className = "voice-waveform";
  if (activeModes.has(mode)) {
    voiceWaveform.classList.add("is-active");
    voiceWaveform.classList.add(`is-${mode}`);
  }
}

function ensureRecognition() {
  if (recognition) {
    return recognition;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return null;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.addEventListener("start", () => {
    recognitionActive = true;
    setVoiceMode("listening");
    if (voiceButton) {
      voiceButton.textContent = "Listening...";
    }
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
    if (!transcript) {
      setVoiceMode("stopped", "No speech was detected. Please try again.");
      return;
    }

    userInput.value = transcript;
    userInput.focus();
    stopListening();
    chatForm.requestSubmit();
  });

  recognition.addEventListener("speechend", () => {
    if (recognitionActive) {
      setVoiceMode("listening", "Speech detected. Listening for the end of your question...");
    }
  });

  recognition.addEventListener("end", () => {
    recognitionActive = false;
    if (voiceButton) {
      voiceButton.textContent = "🎤 Talk to Vertex";
    }

    if (voiceMode === "listening") {
      setVoiceMode("stopped", "Voice recognition stopped.");
    }
  });

  recognition.addEventListener("error", (event) => {
    recognitionActive = false;
    if (voiceButton) {
      voiceButton.textContent = "🎤 Talk to Vertex";
    }

    const errorMap = {
      "not-allowed": "Microphone permission was denied. Please allow access and try again.",
      "service-not-allowed": "Microphone access is blocked in this browser. Please use Chrome or Edge.",
      "no-speech": "No speech was detected. Please try again.",
      "audio-capture": "No microphone was found. Please check your device.",
      "network": "Speech recognition could not reach the service right now."
    };
    const friendly = errorMap[event.error] || "Voice recognition stopped because of an error.";
    setVoiceMode("stopped", friendly);
  });

  return recognition;
}

function stopListening() {
  if (!recognitionActive || !recognition) {
    return;
  }

  try {
    recognition.stop();
  } catch (error) {
    try {
      recognition.abort();
    } catch (abortError) {
      // Ignore abort failures. The browser may already have stopped recognition.
    }
  }

  recognitionActive = false;
  if (voiceButton) {
    voiceButton.textContent = "🎤 Talk to Vertex";
  }
  if (voiceMode === "listening") {
    setVoiceMode("stopped", "Voice recognition stopped.");
  }
}

function startListening() {
  const activeRecognition = ensureRecognition();

  if (!activeRecognition) {
    setVoiceMode("unsupported");
    addMessage("VERTEX", "Voice recognition is not supported in this browser. Please use Chrome or Edge.", "bot", { speakable: false });
    return;
  }

  stopSpeaking();

  try {
    activeRecognition.start();
  } catch (error) {
    // Some browsers throw if start is called twice quickly. We recover by resetting the state.
    setVoiceMode("stopped", "Voice recognition could not start. Please try again.");
  }
}

function updateMuteButton() {
  muteButton.textContent = soundsMuted ? "Sound Off" : "Sound On";
}

function getCurrentTimeText() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#039;");
}

function renderInlineMarkdown(text) {
  let html = escapeHtml(text);
  const savedItems = [];

  html = html.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, (match, altText, imageUrl) => {
    const token = `__VERTEX_ITEM_${savedItems.length}__`;
    savedItems.push(`<img class="chat-image" src="${imageUrl}" alt="${altText}">`);
    return token;
  });

  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, linkText, linkUrl) => {
    const token = `__VERTEX_ITEM_${savedItems.length}__`;
    savedItems.push(`<a href="${linkUrl}" target="_blank" rel="noreferrer">${linkText}</a>`);
    return token;
  });

  html = html.replace(/(https?:\/\/[^\s<]+)/g, "<a href=\"$1\" target=\"_blank\" rel=\"noreferrer\">$1</a>");
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

  savedItems.forEach((item, index) => {
    html = html.replace(`__VERTEX_ITEM_${index}__`, item);
  });

  return html;
}

function renderMarkdown(text) {
  const lines = text.split("\n");
  const htmlParts = [];
  let listOpen = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (!line) {
      if (listOpen) {
        htmlParts.push("</ul>");
        listOpen = false;
      }
      continue;
    }

    if (line.startsWith("|") && line.endsWith("|")) {
      const tableLines = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) {
        tableLines.push(lines[index].trim());
        index += 1;
      }
      index -= 1;

      const rows = tableLines
        .filter((tableLine) => !/^\|\s*-/.test(tableLine))
        .map((tableLine) => tableLine.split("|").slice(1, -1).map((cell) => renderInlineMarkdown(cell.trim())));

      if (rows.length > 0) {
        htmlParts.push("<table>");
        htmlParts.push(`<thead><tr>${rows[0].map((cell) => `<th>${cell}</th>`).join("")}</tr></thead>`);
        htmlParts.push("<tbody>");
        rows.slice(1).forEach((row) => {
          htmlParts.push(`<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`);
        });
        htmlParts.push("</tbody></table>");
      }
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!listOpen) {
        htmlParts.push("<ul>");
        listOpen = true;
      }
      htmlParts.push(`<li>${renderInlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    if (/^\d+\.\s/.test(line)) {
      if (!listOpen) {
        htmlParts.push("<ul>");
        listOpen = true;
      }
      htmlParts.push(`<li>${renderInlineMarkdown(line.replace(/^\d+\.\s/, ""))}</li>`);
      continue;
    }

    if (listOpen) {
      htmlParts.push("</ul>");
      listOpen = false;
    }

    if (line.startsWith("```")) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      htmlParts.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    htmlParts.push(`<p>${renderInlineMarkdown(line)}</p>`);
  }

  if (listOpen) {
    htmlParts.push("</ul>");
  }

  return htmlParts.join("");
}

function chooseBestVoice() {
  if (!("speechSynthesis" in window)) {
    return null;
  }

  const voices = window.speechSynthesis.getVoices();
  const preferredNames = [
    "Microsoft Aria",
    "Microsoft Jenny",
    "Google UK English Female",
    "Google US English",
    "Any English voice"
  ];

  for (const voiceName of preferredNames) {
    if (voiceName === "Any English voice") {
      continue;
    }

    const match = voices.find((voice) => String(voice.name || "").includes(voiceName));
    if (match) {
      return match;
    }
  }

  return voices.find((voice) => String(voice.lang || "").toLowerCase().startsWith("en")) || voices[0] || null;
}

function stopSpeaking() {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  if (voiceMode === "speaking") {
    setVoiceMode("stopped", "Speech stopped.");
  }
}

function shouldAutoSpeakReply(text) {
  return autoSpeakEnabled && Boolean(String(text || "").trim());
}

function stripMarkdownForSpeech(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1")
    .replace(/[*_`>#]/g, " ")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function speakCompletedReply(text) {
  if (!("speechSynthesis" in window)) {
    setVoiceMode("unsupported");
    return;
  }

  const replyText = stripMarkdownForSpeech(text);
  if (!replyText) {
    return;
  }

  preferredVoice = preferredVoice || chooseBestVoice();
  if (!preferredVoice) {
    return;
  }

  const speech = new SpeechSynthesisUtterance(replyText);
  speech.rate = 0.95;
  speech.pitch = 1.0;
  speech.volume = 1;
  speech.voice = preferredVoice;
  speech.lang = preferredVoice.lang || "en-US";
  speech.onstart = () => {
    setVoiceMode("speaking", "VERTEX is speaking the answer.");
  };
  speech.onend = () => {
    if (voiceMode === "speaking") {
      setVoiceMode("ready");
    }
  };
  speech.onerror = () => {
    setVoiceMode("stopped", "Speech output could not play.");
  };
  stopSpeaking();
  window.speechSynthesis.speak(speech);
}

function speakLastAnswer() {
  if (!lastCompletedReplyText) {
    setVoiceMode("stopped", "No completed answer is available yet.");
    return;
  }

  speakCompletedReply(lastCompletedReplyText);
}

function beginNewReplyTurn() {
  activeReplyTurnId += 1;
  activeThinkingCleanup?.();
  activeThinkingCleanup = null;
  activeTypingCleanup?.();
  activeTypingCleanup = null;
  stopListening();
  stopSpeaking();
  return activeReplyTurnId;
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function setupSpeechVoices() {
  if (!("speechSynthesis" in window)) {
    return;
  }

  preferredVoice = chooseBestVoice();
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    preferredVoice = chooseBestVoice();
  });
}

// This function adds a new message bubble to the chat window.
function addMessage(speaker, text, type, options = {}) {
  const message = document.createElement("div");
  message.className = `message ${type}`;

  const speakerLabel = document.createElement("span");
  speakerLabel.className = "speaker";
  speakerLabel.textContent = speaker;

  const paragraph = document.createElement("div");
  paragraph.className = "message-body";
  paragraph.textContent = text;

  const timestamp = document.createElement("time");
  timestamp.className = "message-time";
  timestamp.dateTime = new Date().toISOString();
  timestamp.textContent = getCurrentTimeText();

  message.appendChild(speakerLabel);
  message.appendChild(paragraph);
  message.appendChild(timestamp);

  // SpeechSynthesis is a browser feature. It lets VERTEX read replies aloud.
  if (type === "bot" && !("speechSynthesis" in window)) {
    const unavailable = document.createElement("span");
    unavailable.className = "voice-unavailable";
    unavailable.textContent = "Voice is not available in this browser.";
    message.appendChild(unavailable);
  }

  if (type === "bot" && options.speakable !== false && "speechSynthesis" in window) {
    const actions = document.createElement("div");
    actions.className = "message-actions";

    const speakButton = document.createElement("button");
    speakButton.className = "speaker-button";
    speakButton.type = "button";
    speakButton.textContent = "Speak Again";
    speakButton.title = "Read this Vertex reply";
    speakButton.addEventListener("click", () => {
      preferredVoice = preferredVoice || chooseBestVoice();

      if (!preferredVoice) {
        return;
      }

      speakCompletedReply(text);
    });

    const stopButton = document.createElement("button");
    stopButton.className = "speaker-button stop-button";
    stopButton.type = "button";
    stopButton.textContent = "Stop Speaking";
    stopButton.title = "Stop reading this Vertex reply";
    stopButton.addEventListener("click", () => {
      stopSpeaking();
    });

    actions.appendChild(speakButton);
    actions.appendChild(stopButton);
    message.appendChild(actions);
  }

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return { message, paragraph };
}

// This function types one VERTEX reply letter by letter.
function typeBotReply(messageNode, paragraph, fullText, turnId) {
  let letterIndex = 0;
  paragraph.textContent = "";

  return new Promise((resolve) => {
    const typingTimer = setInterval(() => {
      if (turnId !== activeReplyTurnId) {
        clearInterval(typingTimer);
        resolve(false);
        return;
      }

      paragraph.textContent += fullText.charAt(letterIndex);
      letterIndex += 1;
      chatMessages.scrollTop = chatMessages.scrollHeight;

      if (letterIndex >= fullText.length) {
        clearInterval(typingTimer);
        paragraph.innerHTML = renderMarkdown(fullText);
        resolve(true);
      }
    }, 28);

    activeTypingCleanup = () => {
      clearInterval(typingTimer);
      messageNode.remove();
      resolve(false);
    };
  });
}

// This small delay makes VERTEX feel like it is thinking.
function waitOneSecond() {
  return new Promise((resolve) => {
    setTimeout(resolve, 1000);
  });
}

// This helper asks Flask for JSON data and reports errors clearly.
async function fetchJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed: ${url}`);
  }

  return response.json();
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = userInput.value.trim();
  if (!message) {
    return;
  }

  const replyTurnId = beginNewReplyTurn();
  addMessage("You", message, "user");
  playSound("send");
  userInput.value = "";

  setThinkingState(true);
  const thinkingMessage = addMessage("VERTEX", "Vertex is thinking...", "bot thinking");
  activeThinkingCleanup = () => {
    thinkingMessage.message.remove();
  };

  try {
    const fetchReply = fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const [response] = await Promise.all([fetchReply, waitOneSecond()]);
    if (replyTurnId !== activeReplyTurnId) {
      return;
    }

    const data = await response.json();
    thinkingMessage.message.remove();
    activeThinkingCleanup = null;
    const botReply = addMessage("VERTEX", data.response, "bot");
    const finishedTyping = await typeBotReply(botReply.message, botReply.paragraph, data.response, replyTurnId);
    activeTypingCleanup = null;
    if (!finishedTyping || replyTurnId !== activeReplyTurnId) {
      return;
    }

    lastCompletedReplyText = data.response;
    playSound("reply");
    await sleep(300);
    if (replyTurnId === activeReplyTurnId && shouldAutoSpeakReply(data.response)) {
      speakCompletedReply(data.response);
    }
  } catch (error) {
    await waitOneSecond();
    if (replyTurnId !== activeReplyTurnId) {
      return;
    }

    thinkingMessage.message.remove();
    activeThinkingCleanup = null;
    const errorText = "Connection problem. Please check if Flask is running.";
    const botReply = addMessage("VERTEX", errorText, "bot", { speakable: false });
    await typeBotReply(botReply.message, botReply.paragraph, errorText, replyTurnId);
    activeTypingCleanup = null;
  } finally {
    if (replyTurnId === activeReplyTurnId) {
      setThinkingState(false);
      activeThinkingCleanup = null;
    }
  }
});

// Clicking a sample question puts it in the input box and sends it.
sampleQuestions.forEach((button) => {
  button.addEventListener("click", () => {
    userInput.value = button.textContent;
    chatForm.requestSubmit();
  });
});

// The Web Speech API is a browser feature. It may not work in every browser.
function setupVoiceInput() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setVoiceMode("unsupported");
    if (voiceButton) {
      voiceButton.disabled = true;
      voiceButton.setAttribute("aria-disabled", "true");
    }
    return;
  }

  ensureRecognition();
  setVoiceMode("ready");

  voiceButton.addEventListener("click", () => {
    if (recognitionActive) {
      stopListening();
      return;
    }

    startListening();
  });

  stopListeningButton?.addEventListener("click", () => {
    stopListening();
  });

  voiceStopSpeakingButton?.addEventListener("click", () => {
    stopSpeaking();
  });

  voiceSpeakLastButton?.addEventListener("click", () => {
    speakLastAnswer();
  });
}

// NASA APOD gets one large visual card.
function renderApod(apod) {
  apodCard.innerHTML = "";

  const image = document.createElement("img");
  image.src = apod.image_url;
  image.alt = apod.title;
  image.onerror = () => {
    image.src = backupSpaceImage;
  };

  const content = document.createElement("div");
  content.className = "apod-content";

  const source = document.createElement("span");
  source.className = "tag";
  source.textContent = apod.source === "nasa" ? "NASA APOD" : "Local Backup";

  const title = document.createElement("h3");
  title.textContent = apod.title;

  const date = document.createElement("p");
  date.className = "card-meta";
  date.textContent = apod.date;

  const explanation = document.createElement("p");
  explanation.textContent = apod.explanation;

  content.appendChild(source);
  content.appendChild(title);
  content.appendChild(date);
  content.appendChild(explanation);
  apodCard.appendChild(image);
  apodCard.appendChild(content);
}

function renderNews(newsItems) {
  newsGrid.innerHTML = "";

  newsItems.forEach((item) => {
    const card = document.createElement("article");
    card.className = "info-card glass-panel";

    card.innerHTML = `
      <span class="tag">${item.agency}</span>
      <h3>${item.title}</h3>
      <p class="card-meta">${item.date}</p>
      <p>${item.summary}</p>
    `;

    newsGrid.appendChild(card);
  });
}

function renderPlanets(planets) {
  planetGrid.innerHTML = "";

  if (planets.length === 0) {
    planetGrid.innerHTML = "<p class=\"error-text\">No planet found.</p>";
    return;
  }

  planets.forEach((planet) => {
    const card = document.createElement("article");
    card.className = "planet-card glass-panel";

    card.innerHTML = `
      <img src="${planet.image_url}" alt="${planet.name}">
      <div class="planet-card-body">
        <h3>${planet.name}</h3>
        <p><strong>Diameter:</strong> ${planet.diameter}</p>
        <p><strong>Distance:</strong> ${planet.distance_from_sun}</p>
        <p><strong>Moons:</strong> ${planet.moons}</p>
        <p>${planet.fact}</p>
      </div>
    `;

    const image = card.querySelector("img");
    image.onerror = () => {
      image.src = backupSpaceImage;
    };

    planetGrid.appendChild(card);
  });
}

function filterPlanets() {
  const searchText = planetSearch.value.toLowerCase().trim();
  const matchingPlanets = allPlanets.filter((planet) => {
    return planet.name.toLowerCase().includes(searchText);
  });

  renderPlanets(matchingPlanets);
}

function renderAgencies(agencies) {
  agencyGrid.innerHTML = "";

  agencies.forEach((agency) => {
    const card = document.createElement("article");
    card.className = "info-card glass-panel";

    card.innerHTML = `
      <span class="tag">${agency.country}</span>
      <h3>${agency.name}</h3>
      <p class="card-meta">Founded: ${agency.founded}</p>
      <p>${agency.description}</p>
      <a class="card-link" href="${agency.website}" target="_blank" rel="noreferrer">Official website</a>
    `;

    agencyGrid.appendChild(card);
  });
}

function renderIss(iss) {
  issCard.innerHTML = `
    <span class="tag">${iss.source === "live" ? "Live ISS" : "Demo ISS"}</span>
    <h3>International Space Station</h3>
    <div class="stat-grid">
      <p><strong>Latitude</strong><span>${iss.latitude}</span></p>
      <p><strong>Longitude</strong><span>${iss.longitude}</span></p>
      <p><strong>Altitude</strong><span>${iss.altitude}</span></p>
      <p><strong>Speed</strong><span>${iss.speed}</span></p>
    </div>
    <p class="card-meta">Last updated: ${iss.last_updated}</p>
  `;
}

function renderLaunches(launches) {
  launchList.innerHTML = "";

  launches.forEach((launch) => {
    const launchCard = document.createElement("article");
    launchCard.className = "launch-card";
    launchCard.innerHTML = `
      <div>
        <span class="tag">${launch.status}</span>
        <h4>${launch.mission_name}</h4>
        <p class="card-meta">${launch.agency} - ${launch.rocket_name}</p>
        <p>${launch.description}</p>
      </div>
      <div class="launch-details">
        <p><strong>Date:</strong> ${launch.launch_date}</p>
        <p><strong>Site:</strong> ${launch.launch_site}</p>
      </div>
    `;

    launchList.appendChild(launchCard);
  });
}

function showCardError(container, message) {
  container.innerHTML = `<p class="error-text">${message}</p>`;
}

async function loadDashboardData() {
  try {
    const apod = await fetchJson("/api/nasa/apod");
    renderApod(apod);
  } catch (error) {
    showCardError(apodCard, "NASA data could not load, but the chatbot still works.");
  }

  try {
    const news = await fetchJson("/api/space-news");
    renderNews(news);
  } catch (error) {
    showCardError(newsGrid, "Space news could not load right now.");
  }

  try {
    const planets = await fetchJson("/api/planets");
    allPlanets = planets;
    renderPlanets(allPlanets);
  } catch (error) {
    showCardError(planetGrid, "Planet cards could not load right now.");
  }

  try {
    const agencies = await fetchJson("/api/agencies");
    renderAgencies(agencies);
  } catch (error) {
    showCardError(agencyGrid, "Agency cards could not load right now.");
  }
}

async function loadMissionControl() {
  issCard.innerHTML = "<p class=\"loading-text\">Loading ISS location...</p>";
  launchList.innerHTML = "<p class=\"loading-text\">Loading rocket launches...</p>";

  try {
    const iss = await fetchJson("/api/iss");
    renderIss(iss);
  } catch (error) {
    showCardError(issCard, "ISS location could not load right now.");
  }

  try {
    const launches = await fetchJson("/api/launches");
    renderLaunches(launches);
  } catch (error) {
    showCardError(launchList, "Rocket launches could not load right now.");
  }

  missionUpdatedText.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
}

async function loadAiStatus() {
  try {
    const status = await fetchJson("/api/ai-status");
    aiStatusMode.textContent = status.mode;
    aiStatusMessage.textContent = status.message;
  } catch (error) {
    aiStatusMode.textContent = "Offline Demo Mode";
    aiStatusMessage.textContent = "AI status could not load, but the local demo can still run.";
  }
}

planetSearch.addEventListener("input", filterPlanets);
refreshMissionButton.addEventListener("click", loadMissionControl);

function applyTheme(themeName) {
  document.body.dataset.theme = themeName;
  themeSelect.value = themeName;
  localStorage.setItem("vertex-theme", themeName);
}

themeSelect.addEventListener("change", () => {
  applyTheme(themeSelect.value);
});

muteButton.addEventListener("click", () => {
  soundsMuted = !soundsMuted;
  localStorage.setItem("vertex-muted", String(soundsMuted));
  updateMuteButton();
});

// A tiny click sound runs for normal buttons. Audio errors are ignored in playSound().
document.addEventListener("click", (event) => {
  if (event.target.closest("button")) {
    playSound("click");
  }
});

function enterPresentationMode() {
  document.body.classList.add("presentation-mode");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exitPresentationMode() {
  document.body.classList.remove("presentation-mode");
}

presentationButton.addEventListener("click", enterPresentationMode);
exitPresentationButton.addEventListener("click", exitPresentationMode);

// The quiz saves progress in localStorage so it still works without a backend login.
function getSavedQuizStats() {
  const defaultStats = {
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
    return { ...defaultStats, ...JSON.parse(localStorage.getItem(quizStorageKey) || "{}") };
  } catch (error) {
    return defaultStats;
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
  return quizPlayerName.value.trim() || "Explorer";
}

function getCategoryName(categoryId) {
  const category = quizDatabase.categories.find((item) => item.id === categoryId);
  return category ? category.name : "Mixed Space";
}

function formatQuestionType(type) {
  return String(type || "multiple_choice").replaceAll("_", " ");
}

// This function applies the student's category, difficulty, type, search, and progress filters.
function getSelectedQuestions() {
  const mode = quizModeSelect.value;
  const difficulty = quizDifficultySelect.value;
  const type = quizTypeSelect.value;
  const completion = quizCompletionSelect.value;
  const searchText = quizSearchInput.value.toLowerCase().trim();
  const stats = getSavedQuizStats();
  let questions = quizDatabase.questions;

  if (mode === "random") {
    questions = shuffleItems(questions);
  } else if (selectedQuizCategory && selectedQuizCategory !== "all") {
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
    questions = questions.filter((question) => {
      return question.question.toLowerCase().includes(searchText)
        || question.topic.toLowerCase().includes(searchText)
        || question.category.toLowerCase().includes(searchText)
        || question.answer.toLowerCase().includes(searchText);
    });
  }

  const limitMap = {
    practice: 10,
    challenge: 10,
    exam: 20,
    adventure: 8,
    daily: 5
  };

  return shuffleItems(questions).slice(0, limitMap[mode] || 10);
}

// Category cards make the quiz feel like an academy instead of a single question list.
function renderQuizCategories() {
  const searchText = quizSearchInput.value.toLowerCase().trim();
  const stats = getSavedQuizStats();
  const unlockedCount = quizModeSelect.value === "adventure"
    ? Math.max(1, stats.completedCategories.length + 1)
    : quizDatabase.categories.length;
  quizCategoryGrid.innerHTML = "";

  quizDatabase.categories
    .filter((category) => {
      return !searchText
        || category.name.toLowerCase().includes(searchText)
        || category.description.toLowerCase().includes(searchText);
    })
    .forEach((category, index) => {
      const locked = index >= unlockedCount;
      const button = document.createElement("button");
      button.type = "button";
      button.disabled = locked;
      button.className = `quiz-category-card${category.id === selectedQuizCategory ? " active" : ""}${locked ? " locked" : ""}`;
      button.innerHTML = `
        <span>${category.icon}</span>
        <strong>${category.name}</strong>
        <small>${locked ? "Locked in Adventure Mode" : category.description}</small>
      `;
      button.addEventListener("click", () => {
        if (locked) {
          return;
        }
        selectedQuizCategory = category.id;
        renderQuizCategories();
      });
      quizCategoryGrid.appendChild(button);
    });
}

// Badges, leaderboard, and progress tracker all refresh from localStorage.
function updateQuizProgressViews() {
  const stats = getSavedQuizStats();
  const total = Math.max(stats.answered, 1);
  const correctPercent = Math.round((stats.correct / total) * 100);
  const incorrectPercent = Math.round((stats.incorrect / total) * 100);
  const favoriteCategory = Object.entries(stats.categoryCounts)
    .sort((left, right) => right[1] - left[1])[0];

  achievementList.innerHTML = "";
  badgeRules.forEach((badge) => {
    const badgeElement = document.createElement("span");
    badgeElement.className = `achievement-badge${stats.badges.includes(badge.id) ? " unlocked" : ""}`;
    badgeElement.textContent = badge.name;
    achievementList.appendChild(badgeElement);
  });

  leaderboardList.innerHTML = "";
  const leaderboard = getLeaderboard();
  if (leaderboard.length === 0) {
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
    <p><strong>Correct:</strong> ${correctPercent}%</p>
    <p><strong>Incorrect:</strong> ${incorrectPercent}%</p>
    <p><strong>Favorite category:</strong> ${favoriteCategory ? getCategoryName(favoriteCategory[0]) : "None yet"}</p>
    <p><strong>Completed categories:</strong> ${stats.completedCategories.length}</p>
    <p><strong>Total quizzes completed:</strong> ${stats.completed}</p>
  `;
}

function updateScoreDisplay() {
  const totalQuestions = Math.max(quizState.questions.length, 1);
  const percent = Math.round((quizState.correct / totalQuestions) * 100);
  quizScore.textContent = `Score: ${quizState.score}`;
  quizScoreCircle.textContent = `${percent}%`;
  quizScoreCircle.style.background = `conic-gradient(var(--accent-2) ${percent}%, rgba(255, 255, 255, 0.1) 0)`;
  quizStreak.textContent = `${quizState.streak} correct in a row`;
}

function stopQuizTimer() {
  if (quizTimerInterval) {
    clearInterval(quizTimerInterval);
    quizTimerInterval = null;
  }
}

// Timed modes auto-submit the current question when the countdown reaches zero.
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
  quizTimerInterval = setInterval(() => {
    quizState.secondsLeft -= 1;
    const percentLeft = Math.max(0, (quizState.secondsLeft / quizState.totalSeconds) * 100);
    quizTimer.textContent = `${Math.max(quizState.secondsLeft, 0)}s`;
    quizTimerBar.style.width = `${percentLeft}%`;

    if (quizState.secondsLeft <= 0) {
      stopQuizTimer();
      submitQuizAnswer("__timeout__");
    }
  }, 1000);
}

function getTimerSecondsForMode() {
  if (quizTimerSelect.value !== "0") {
    return Number(quizTimerSelect.value);
  }

  if (quizModeSelect.value === "challenge") {
    return 30;
  }

  return 0;
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
    const choiceButton = document.createElement("button");
    choiceButton.type = "button";
    choiceButton.className = "quiz-choice";
    choiceButton.textContent = choice;
    choiceButton.addEventListener("click", () => submitQuizAnswer(choice));
    quizChoices.appendChild(choiceButton);
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
  quizQuestion.textContent = question.question;
  quizQuestionType.textContent = formatQuestionType(question.type);
  quizDifficultyTag.textContent = question.difficulty;
  quizImage.hidden = question.type !== "image_quiz";
  quizImage.src = question.image_url || backupSpaceImage;
  quizImage.alt = question.type === "image_quiz" ? question.question : "";
  renderChoices(question);
  updateScoreDisplay();
  startQuizTimer(getTimerSecondsForMode());
}

function getQuestionPoints(question) {
  const basePoints = question.points || pointMap[question.difficulty] || 10;
  const speedBonus = quizState.secondsLeft > 10 ? 5 : 0;
  const streakBonus = quizState.streak > 0 && quizState.streak % 3 === 0 ? 10 : 0;
  const dailyBonus = quizModeSelect.value === "daily" ? 5 : 0;
  return basePoints + speedBonus + streakBonus + dailyBonus;
}

// Every answer immediately shows the correct answer, explanation, and a fun fact.
function submitQuizAnswer(answer) {
  if (quizState.answered || !quizState.active) {
    return;
  }

  stopQuizTimer();
  const question = quizState.questions[quizState.index];
  const isCorrect = normalizeAnswer(answer) === normalizeAnswer(question.answer);
  quizState.answered = true;

  quizChoices.querySelectorAll("button").forEach((button) => {
    button.disabled = true;

    if (normalizeAnswer(button.textContent) === normalizeAnswer(question.answer)) {
      button.classList.add("correct");
    }

    if (normalizeAnswer(button.textContent) === normalizeAnswer(answer) && !isCorrect) {
      button.classList.add("wrong");
    }
  });

  if (isCorrect) {
    quizState.correct += 1;
    quizState.streak += 1;
    quizState.bestStreak = Math.max(quizState.bestStreak, quizState.streak);
    quizState.score += getQuestionPoints(question);
  } else {
    quizState.streak = 0;
  }

  quizState.results.push({
    question: question.question,
    answer,
    correctAnswer: question.answer,
    correct: isCorrect,
    explanation: question.explanation,
    fact: question.fact,
    category: question.category
  });

  quizFeedback.innerHTML = `
    <strong>${isCorrect ? "Correct!" : "Not quite."}</strong><br>
    Correct Answer: ${escapeHtml(question.answer)}<br>
    Explanation: ${escapeHtml(question.explanation)}<br>
    Fun Fact: ${escapeHtml(question.fact)}
  `;
  nextQuizButton.hidden = false;
  updateScoreDisplay();
}

function goToNextQuestion() {
  quizState.index += 1;

  if (quizState.index >= quizState.questions.length) {
    finishQuiz();
    return;
  }

  showQuizQuestion();
}

function updateStatsAfterQuiz(percent) {
  const stats = getSavedQuizStats();
  const incorrect = quizState.questions.length - quizState.correct;
  stats.answered += quizState.questions.length;
  stats.correct += quizState.correct;
  stats.incorrect += incorrect;
  stats.completed += 1;
  stats.bestScore = Math.max(stats.bestScore, quizState.score);
  stats.bestPercent = Math.max(stats.bestPercent, percent);
  stats.categoryCounts[selectedQuizCategory] = (stats.categoryCounts[selectedQuizCategory] || 0) + 1;

  if (!stats.completedCategories.includes(selectedQuizCategory)) {
    stats.completedCategories.push(selectedQuizCategory);
  }

  quizState.questions.forEach((question) => {
    if (!stats.answeredQuestions.includes(question.id)) {
      stats.answeredQuestions.push(question.id);
    }
  });

  badgeRules.forEach((badge) => {
    if (!stats.badges.includes(badge.id) && badge.test(stats)) {
      stats.badges.push(badge.id);
    }
  });

  saveQuizStats(stats);
}

function updateLeaderboardAfterQuiz(percent) {
  const leaderboard = getLeaderboard();
  leaderboard.push({
    name: getPlayerName(),
    score: quizState.score,
    percent,
    completed: new Date().toLocaleDateString()
  });
  leaderboard.sort((left, right) => right.score - left.score);
  saveLeaderboard(leaderboard);
}

function showCertificate(percent) {
  if (percent < 80) {
    certificatePanel.hidden = true;
    return;
  }

  certificateName.textContent = getPlayerName();
  certificateDetails.textContent = `${percent}% score in ${getCategoryName(selectedQuizCategory)} on ${new Date().toLocaleDateString()}.`;
  certificatePanel.hidden = false;
}

// The final screen stores stats, updates badges, creates review mode, and shows a certificate.
function finishQuiz() {
  stopQuizTimer();
  quizState.active = false;
  const total = Math.max(quizState.questions.length, 1);
  const percent = Math.round((quizState.correct / total) * 100);
  const timeTaken = Math.round((Date.now() - quizState.startedAt) / 1000);

  quizProgress.textContent = "Quiz Complete";
  quizQuestion.textContent = `Final Score: ${quizState.score} points`;
  quizChoices.innerHTML = "";
  fillBlankForm.hidden = true;
  nextQuizButton.hidden = true;
  quizFeedback.innerHTML = `
    Correct: ${quizState.correct} of ${quizState.questions.length}<br>
    Percentage: ${percent}%<br>
    Time Taken: ${timeTaken}s<br>
    Open Review Mode to study every answer.
  `;

  updateStatsAfterQuiz(percent);
  updateLeaderboardAfterQuiz(percent);
  updateQuizProgressViews();
  showReview();
  showCertificate(percent);
}

function startQuiz(customQuestions) {
  const questions = customQuestions || getSelectedQuestions();

  if (questions.length === 0) {
    quizQuestion.textContent = "No questions matched your filters. Try another category or difficulty.";
    quizFeedback.textContent = "The local database is still loaded, but your filters were too narrow.";
    return;
  }

  quizState = {
    questions,
    index: 0,
    score: 0,
    correct: 0,
    streak: 0,
    bestStreak: 0,
    answered: false,
    startedAt: Date.now(),
    secondsLeft: 0,
    totalSeconds: 0,
    results: [],
    active: true
  };
  quizReviewPanel.hidden = true;
  certificatePanel.hidden = true;
  showQuizQuestion();
}

function showReview() {
  quizReviewPanel.hidden = false;
  quizReviewList.innerHTML = "";

  if (quizState.results.length === 0) {
    quizReviewList.innerHTML = "<p>No answers to review yet.</p>";
    return;
  }

  quizState.results.forEach((result, index) => {
    const card = document.createElement("article");
    card.className = `review-card ${result.correct ? "correct" : "wrong"}`;
    card.innerHTML = `
      <strong>${index + 1}. ${escapeHtml(result.question)}</strong>
      <p>Your answer: ${escapeHtml(result.answer === "__timeout__" ? "Time ended" : result.answer)}</p>
      <p>Correct answer: ${escapeHtml(result.correctAnswer)}</p>
      <p>${escapeHtml(result.explanation)}</p>
      <p><strong>Fun fact:</strong> ${escapeHtml(result.fact)}</p>
    `;
    quizReviewList.appendChild(card);
  });
}

// Groq-generated quizzes are optional. If Groq is unavailable, local questions are used.
async function generateQuiz(topic, difficulty) {
  quizQuestion.textContent = "Generating quiz questions...";
  quizFeedback.textContent = "VERTEX will use Groq if available, otherwise local questions.";

  try {
    const data = await fetchJsonWithOptions("/api/quiz-generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, difficulty, limit: 10 })
    });
    quizFeedback.textContent = data.source === "groq"
      ? "Generated with Groq."
      : "Groq is offline, so VERTEX used local questions.";
    startQuiz(data.questions);
  } catch (error) {
    const fallback = getSelectedQuestions().slice(0, 10);
    quizFeedback.textContent = "AI generation is unavailable. Starting a local quiz.";
    startQuiz(fallback);
  }
}

async function fetchJsonWithOptions(url, options) {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Request failed: ${url}`);
  }

  return response.json();
}

async function loadQuizDatabase() {
  try {
    quizDatabase = await fetchJson("/api/quiz-database");
    quizBankCount.textContent = `${quizDatabase.questions.length} questions`;
    quizPlayerName.value = localStorage.getItem("vertex-quiz-player") || "";
    renderQuizCategories();
    updateQuizProgressViews();
  } catch (error) {
    quizQuestion.textContent = "Quiz database could not load.";
    quizFeedback.textContent = "Check data/quiz_database.json and the Flask route.";
  }
}

quizPlayerName.addEventListener("input", () => {
  localStorage.setItem("vertex-quiz-player", quizPlayerName.value.trim());
});

quizSearchInput.addEventListener("input", renderQuizCategories);
quizModeSelect.addEventListener("change", renderQuizCategories);
startQuizButton.addEventListener("click", () => startQuiz());
restartQuizButton.addEventListener("click", () => startQuiz(quizState.questions.length ? quizState.questions : undefined));
reviewQuizButton.addEventListener("click", showReview);
nextQuizButton.addEventListener("click", goToNextQuestion);
dailyQuizButton.addEventListener("click", () => {
  quizModeSelect.value = "daily";
  startQuiz();
});
randomQuizButton.addEventListener("click", () => {
  selectedQuizCategory = "all";
  startQuiz();
});
aiQuizButton.addEventListener("click", () => generateQuiz("", ""));
tenAiQuizButton.addEventListener("click", () => generateQuiz("", ""));
hardAiQuizButton.addEventListener("click", () => generateQuiz("", "hard"));
nasaAiQuizButton.addEventListener("click", () => generateQuiz("NASA", ""));
marsAiQuizButton.addEventListener("click", () => generateQuiz("Mars", ""));
astronomyAiQuizButton.addEventListener("click", () => generateQuiz("Astronomy", ""));
fillBlankForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitQuizAnswer(fillBlankInput.value);
});
printCertificateButton.addEventListener("click", () => window.print());

applyTheme(savedTheme);
updateAutoSpeakToggle();
updateMuteButton();
updateMissionClock();
setupVoiceInput();
setupSpeechVoices();
if (autoSpeakToggle) {
  autoSpeakToggle.addEventListener("change", () => {
    autoSpeakEnabled = autoSpeakToggle.checked;
    localStorage.setItem("vertex-auto-speak", String(autoSpeakEnabled));
    updateAutoSpeakToggle();
  });
}
if (voiceAutoSpeakToggle) {
  voiceAutoSpeakToggle.addEventListener("change", () => {
    autoSpeakEnabled = voiceAutoSpeakToggle.checked;
    localStorage.setItem("vertex-auto-speak", String(autoSpeakEnabled));
    updateAutoSpeakToggle();
  });
}
missionClockTimer = window.setInterval(updateMissionClock, 1000);
loadAiStatus();
loadDashboardData();
loadMissionControl();
loadQuizDatabase();
