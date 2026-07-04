const chatForm = document.querySelector("#chatForm");
const userInput = document.querySelector("#userInput");
const chatMessages = document.querySelector("#chatMessages");
const sampleQuestions = document.querySelectorAll(".sample-question");
const voiceButton = document.querySelector("#voiceButton");
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
const quizProgress = document.querySelector("#quizProgress");
const quizScore = document.querySelector("#quizScore");
const quizQuestion = document.querySelector("#quizQuestion");
const quizChoices = document.querySelector("#quizChoices");
const quizFeedback = document.querySelector("#quizFeedback");
const restartQuizButton = document.querySelector("#restartQuizButton");
const backupSpaceImage = "/static/images/apod-backup.svg";
const savedTheme = localStorage.getItem("vertex-theme") || "deep-space";
const savedMute = localStorage.getItem("vertex-muted") === "true";
let allPlanets = [];
let soundsMuted = savedMute;
let currentQuizIndex = 0;
let currentQuizScore = 0;
let quizAnswered = false;

const quizQuestions = [
  {
    question: "Which planet is called the Red Planet?",
    choices: ["Mars", "Venus", "Jupiter"],
    answer: "Mars"
  },
  {
    question: "Which agency is from India?",
    choices: ["ISRO", "NASA", "ESA"],
    answer: "ISRO"
  },
  {
    question: "What does ISS stand for?",
    choices: ["International Space Station", "Indian Space Ship", "Interstellar Solar System"],
    answer: "International Space Station"
  },
  {
    question: "Which planet is the largest?",
    choices: ["Jupiter", "Earth", "Mars"],
    answer: "Jupiter"
  },
  {
    question: "What is the Sun?",
    choices: ["A star", "A planet", "A moon"],
    answer: "A star"
  }
];

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
}

function updateMuteButton() {
  muteButton.textContent = soundsMuted ? "Sound Off" : "Sound On";
}

// This function adds a new message bubble to the chat window.
function addMessage(speaker, text, type) {
  const message = document.createElement("div");
  message.className = `message ${type}`;

  const speakerLabel = document.createElement("span");
  speakerLabel.className = "speaker";
  speakerLabel.textContent = speaker;

  const paragraph = document.createElement("p");
  paragraph.textContent = text;

  message.appendChild(speakerLabel);
  message.appendChild(paragraph);

  // SpeechSynthesis is a browser feature. It lets VERTEX read replies aloud.
  if (type === "bot" && "speechSynthesis" in window) {
    const speakButton = document.createElement("button");
    speakButton.className = "speaker-button";
    speakButton.type = "button";
    speakButton.textContent = "Speak";
    speakButton.title = "Read this Vertex reply";
    speakButton.addEventListener("click", () => {
      const speech = new SpeechSynthesisUtterance(text);
      speech.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(speech);
    });
    message.appendChild(speakButton);
  }

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return { message, paragraph };
}

// This function types one VERTEX reply letter by letter.
function typeBotReply(paragraph, fullText) {
  let letterIndex = 0;
  paragraph.textContent = "";

  return new Promise((resolve) => {
    const typingTimer = setInterval(() => {
      paragraph.textContent += fullText.charAt(letterIndex);
      letterIndex += 1;
      chatMessages.scrollTop = chatMessages.scrollHeight;

      if (letterIndex >= fullText.length) {
        clearInterval(typingTimer);
        resolve();
      }
    }, 28);
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

  addMessage("You", message, "user");
  playSound("send");
  userInput.value = "";

  setThinkingState(true);
  const thinkingMessage = addMessage("VERTEX", "Vertex is thinking...", "bot thinking");

  try {
    const fetchReply = fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message })
    });

    const [response] = await Promise.all([fetchReply, waitOneSecond()]);
    const data = await response.json();
    thinkingMessage.message.remove();
    const botReply = addMessage("VERTEX", data.response, "bot");
    await typeBotReply(botReply.paragraph, data.response);
    playSound("reply");
  } catch (error) {
    await waitOneSecond();
    thinkingMessage.message.remove();
    const errorText = "Connection problem. Please check if Flask is running.";
    const botReply = addMessage("VERTEX", errorText, "bot");
    await typeBotReply(botReply.paragraph, errorText);
  } finally {
    setThinkingState(false);
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
    voiceButton.addEventListener("click", () => {
      addMessage("VERTEX", "Voice input is not supported in this browser. You can still type your question.", "bot");
    });
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;

  voiceButton.addEventListener("click", () => {
    voiceButton.textContent = "Listening...";
    recognition.start();
  });

  recognition.addEventListener("result", (event) => {
    userInput.value = event.results[0][0].transcript;
    voiceButton.textContent = "Mic";
    userInput.focus();
  });

  recognition.addEventListener("end", () => {
    voiceButton.textContent = "Mic";
  });

  recognition.addEventListener("error", () => {
    voiceButton.textContent = "Mic";
    addMessage("VERTEX", "I could not hear that clearly. Please try again or type your question.", "bot");
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

function showQuizQuestion() {
  const currentQuestion = quizQuestions[currentQuizIndex];
  quizAnswered = false;
  quizChoices.innerHTML = "";
  quizFeedback.textContent = "";
  quizProgress.textContent = `Question ${currentQuizIndex + 1} of ${quizQuestions.length}`;
  quizScore.textContent = `Score: ${currentQuizScore}`;
  quizQuestion.textContent = currentQuestion.question;

  currentQuestion.choices.forEach((choice) => {
    const choiceButton = document.createElement("button");
    choiceButton.type = "button";
    choiceButton.className = "quiz-choice";
    choiceButton.textContent = choice;
    choiceButton.addEventListener("click", () => checkQuizAnswer(choice));
    quizChoices.appendChild(choiceButton);
  });
}

function checkQuizAnswer(choice) {
  if (quizAnswered) {
    return;
  }

  const currentQuestion = quizQuestions[currentQuizIndex];
  const choiceButtons = quizChoices.querySelectorAll("button");
  quizAnswered = true;

  choiceButtons.forEach((button) => {
    button.disabled = true;

    if (button.textContent === currentQuestion.answer) {
      button.classList.add("correct");
    }

    if (button.textContent === choice && choice !== currentQuestion.answer) {
      button.classList.add("wrong");
    }
  });

  if (choice === currentQuestion.answer) {
    currentQuizScore += 1;
    quizFeedback.textContent = "Correct!";
  } else {
    quizFeedback.textContent = `Not quite. Correct answer: ${currentQuestion.answer}`;
  }

  quizScore.textContent = `Score: ${currentQuizScore}`;

  setTimeout(() => {
    currentQuizIndex += 1;

    if (currentQuizIndex < quizQuestions.length) {
      showQuizQuestion();
    } else {
      quizProgress.textContent = "Quiz Complete";
      quizQuestion.textContent = `Final score: ${currentQuizScore} out of ${quizQuestions.length}`;
      quizChoices.innerHTML = "";
      quizFeedback.textContent = "Press Restart Quiz to play again.";
    }
  }, 1400);
}

restartQuizButton.addEventListener("click", () => {
  currentQuizIndex = 0;
  currentQuizScore = 0;
  showQuizQuestion();
});

applyTheme(savedTheme);
updateMuteButton();
showQuizQuestion();
setupVoiceInput();
loadDashboardData();
loadMissionControl();
