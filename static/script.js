const chatForm = document.querySelector("#chatForm");
const userInput = document.querySelector("#userInput");
const chatMessages = document.querySelector("#chatMessages");
const sampleQuestions = document.querySelectorAll(".sample-question");
const apodCard = document.querySelector("#apodCard");
const newsGrid = document.querySelector("#newsGrid");
const planetGrid = document.querySelector("#planetGrid");
const agencyGrid = document.querySelector("#agencyGrid");
const backupSpaceImage = "/static/images/apod-backup.svg";

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
  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return message;
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
  userInput.value = "";

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
    thinkingMessage.remove();
    addMessage("VERTEX", data.response, "bot");
  } catch (error) {
    await waitOneSecond();
    thinkingMessage.remove();
    addMessage("VERTEX", "Connection problem. Please check if Flask is running.", "bot");
  }
});

// Clicking a sample question puts it in the input box and sends it.
sampleQuestions.forEach((button) => {
  button.addEventListener("click", () => {
    userInput.value = button.textContent;
    chatForm.requestSubmit();
  });
});

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
    renderPlanets(planets);
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

loadDashboardData();
