const BRIDGE_SOURCE = "vertex-browser-control";
const commandForm = document.querySelector("#commandForm");
const commandInput = document.querySelector("#commandInput");
const micButton = document.querySelector("#micButton");
const feedback = document.querySelector("#feedback");
const confirmCard = document.querySelector("#confirmCard");
const confirmText = document.querySelector("#confirmText");
const confirmAllow = document.querySelector("#confirmAllow");
const confirmCancel = document.querySelector("#confirmCancel");
const quickActions = document.querySelectorAll("[data-command]");

let pendingCommand = null;
let recognition = null;

function setFeedback(message, isError = false) {
  feedback.textContent = message;
  feedback.classList.toggle("is-error", Boolean(isError));
}

function describeCommand(command) {
  const args = command.args || {};
  const labels = {
    open_site: `Open ${args.site === "youtube" ? "YouTube" : "Google"}`,
    search_google: `Search Google for "${args.query || ""}"`,
    search_youtube: `Search YouTube for "${args.query || ""}"`,
    go_back: "Go back in the active tab",
    go_forward: "Go forward in the active tab",
    reload_tab: "Reload the active tab",
    scroll_up: "Scroll up on Google or YouTube",
    scroll_down: "Scroll down on Google or YouTube",
    click_first_result: "Click the first visible result",
    disconnect: "Stop Browser Control"
  };
  return labels[command.name] || "Run browser command";
}

function parseCommand(text) {
  const value = String(text || "").trim();
  const lower = value.toLowerCase();
  if (!value) throw new Error("Type a command first.");

  if (/^(open|go to|launch)\s+google$/.test(lower)) return { name: "open_site", args: { site: "google" } };
  if (/^(open|go to|launch)\s+(youtube|you tube)$/.test(lower)) return { name: "open_site", args: { site: "youtube" } };
  if (/^(go\s+)?back$/.test(lower)) return { name: "go_back", args: {} };
  if (/^(reload|refresh)(\s+tab)?$/.test(lower)) return { name: "reload_tab", args: {} };
  if (/^scroll\s+up$/.test(lower)) return { name: "scroll_up", args: {} };
  if (/^scroll\s+down$/.test(lower)) return { name: "scroll_down", args: {} };
  if (/^click\s+(the\s+)?first\s+result$/.test(lower)) return { name: "click_first_result", args: {} };
  if (/^(stop|disconnect)$/.test(lower)) return { name: "disconnect", args: {} };

  const googleMatch = value.match(/^(?:search\s+google(?:\s+for)?|google)\s+(.+)$/i);
  if (googleMatch?.[1]) return { name: "search_google", args: { query: googleMatch[1].trim() } };

  const youtubeMatch = value.match(/^(?:search\s+(?:youtube|you tube)(?:\s+for)?|(?:youtube|you tube))\s+(.+)$/i);
  if (youtubeMatch?.[1]) return { name: "search_youtube", args: { query: youtubeMatch[1].trim() } };

  throw new Error("Use Google/YouTube commands only, like: search youtube Mars rover.");
}

function commandNeedsConfirmation(command) {
  return [
    "open_site",
    "search_google",
    "search_youtube",
    "go_back",
    "go_forward",
    "reload_tab",
    "click_first_result"
  ].includes(command.name);
}

function sendCommand(command) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      source: BRIDGE_SOURCE,
      type: "browser_command",
      id: `${Date.now()}`,
      command
    }, (response) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message || "Browser Control did not respond."));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "Browser command failed."));
        return;
      }
      resolve(response);
    });
  });
}

function hideConfirmation() {
  pendingCommand = null;
  confirmCard.hidden = true;
  confirmAllow.disabled = false;
  confirmCancel.disabled = false;
}

function requestCommand(command) {
  if (commandNeedsConfirmation(command)) {
    pendingCommand = command;
    confirmText.textContent = describeCommand(command);
    confirmCard.hidden = false;
    setFeedback("Review the command, then choose Allow or Cancel.");
    return;
  }

  runCommand(command);
}

async function runCommand(command) {
  try {
    setFeedback(`Running: ${describeCommand(command)}`);
    const result = await sendCommand(command);
    setFeedback(result?.message || "Command completed.");
    if (command.name === "disconnect") {
      document.querySelector("#panelStatus").textContent = "Browser Control Stopped";
    }
  } catch (error) {
    setFeedback(error?.message || "Command failed.", true);
  }
}

commandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  try {
    requestCommand(parseCommand(commandInput.value));
  } catch (error) {
    setFeedback(error?.message || "Invalid command.", true);
  }
});

quickActions.forEach((button) => {
  button.addEventListener("click", () => {
    const name = button.dataset.command;
    if (name === "search_youtube") {
      const query = commandInput.value.trim() || window.prompt("Search YouTube for:");
      if (!query) return;
      requestCommand({ name, args: { query } });
      return;
    }
    requestCommand({ name, args: { site: button.dataset.site } });
  });
});

confirmAllow.addEventListener("click", async () => {
  if (!pendingCommand) return;
  const command = pendingCommand;
  confirmAllow.disabled = true;
  confirmCancel.disabled = true;
  hideConfirmation();
  await runCommand(command);
});

confirmCancel.addEventListener("click", () => {
  hideConfirmation();
  setFeedback("Command cancelled.");
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  micButton.hidden = false;
  micButton.addEventListener("click", () => {
    recognition?.abort?.();
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onstart = () => setFeedback("Listening for a short command...");
    recognition.onresult = (event) => {
      commandInput.value = event.results[0][0].transcript;
      setFeedback("Voice command captured. Press Prepare Command.");
    };
    recognition.onerror = () => setFeedback("Voice command failed. Type the command instead.", true);
    recognition.start();
  });
}

sendCommand({ name: "ping", args: {} })
  .then(() => setFeedback("Ready for Google and YouTube controls."))
  .catch((error) => setFeedback(error?.message || "Browser Control is unavailable.", true));
