const skyStage = document.querySelector("#skyStage");
const skyStageOverlay = document.querySelector("#skyStageOverlay");
const skyFullscreenButton = document.querySelector("#skyFullscreenButton");
const skyControlGrid = document.querySelector("#skyControlGrid");
const skySearchInput = document.querySelector("#skySearchInput");
const skySearchResults = document.querySelector("#skySearchResults");
const skyLocationState = document.querySelector("#skyLocationState");
const skyObjectCategory = document.querySelector("#skyObjectCategory");
const skyObjectName = document.querySelector("#skyObjectName");
const skyObjectType = document.querySelector("#skyObjectType");
const skyObjectDistance = document.querySelector("#skyObjectDistance");
const skyObjectMagnitude = document.querySelector("#skyObjectMagnitude");
const skyObjectDescription = document.querySelector("#skyObjectDescription");
const skyObjectFacts = document.querySelector("#skyObjectFacts");
const skyAiForm = document.querySelector("#skyAiForm");
const skyAiInput = document.querySelector("#skyAiInput");
const skyAiResponse = document.querySelector("#skyAiResponse");
const stellariumFrame = document.querySelector("#stellariumFrame");

let skyData = { featured_objects: [], control_actions: [] };
let selectedObject = null;
let telescopeMode = false;

function normalize(text) {
  return String(text || "").toLowerCase().trim();
}

function clearChildren(node) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs || 10000;
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("Unexpected response format.");
    }

    return await response.json();
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("The request timed out.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function setSelectedObject(objectItem) {
  if (!objectItem) {
    return;
  }

  selectedObject = objectItem;
  skyObjectCategory.textContent = objectItem.category || "Unknown";
  skyObjectName.textContent = objectItem.name || "Unknown";
  skyObjectType.textContent = objectItem.type || "---";
  skyObjectDistance.textContent = objectItem.distance || "---";
  skyObjectMagnitude.textContent = objectItem.magnitude || "---";
  skyObjectDescription.textContent = objectItem.description || "";

  clearChildren(skyObjectFacts);
  (objectItem.interesting_facts || []).forEach((fact) => {
    const li = document.createElement("li");
    li.textContent = fact;
    skyObjectFacts.appendChild(li);
  });

  skyAiInput.value = objectItem.ai_prompt || `Tell me about ${objectItem.name}.`;
}

function renderObjectCards(list) {
  clearChildren(skySearchResults);

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "sky-search-item";
    empty.textContent = "No matching objects found.";
    skySearchResults.appendChild(empty);
    return;
  }

  list.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `sky-search-item${selectedObject && selectedObject.name === item.name ? " is-selected" : ""}`;
    button.innerHTML = `
      <strong>${item.name}</strong>
      <span>${item.type}</span>
      <span>${item.distance}</span>
      <div class="sky-result-meta">
        <span class="sky-result-tag">${item.category}</span>
        <span class="sky-result-tag">${item.magnitude}</span>
      </div>
    `;
    button.addEventListener("click", () => setSelectedObject(item));
    skySearchResults.appendChild(button);
  });
}

function renderSearch() {
  const query = normalize(skySearchInput.value);
  if (!skyData.featured_objects.length) {
    skySearchResults.innerHTML = "<div class=\"sky-search-item\">Sky data is unavailable right now.</div>";
    return;
  }

  const filtered = skyData.featured_objects.filter((item) => {
    if (!query) {
      return true;
    }

    const haystack = [
      item.name,
      item.type,
      item.category,
      item.description,
      ...(item.interesting_facts || [])
    ].join(" ").toLowerCase();

    return haystack.includes(query);
  });

  renderObjectCards(filtered);
}

function handleControlAction(action) {
  if (action.mode === "location") {
    skyLocationState.textContent = "Checking location...";
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        skyLocationState.textContent = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
      },
      () => {
        skyLocationState.textContent = "Location permission denied";
      },
      { enableHighAccuracy: false, timeout: 6000 }
    );
    return;
  }

  if (action.mode === "sky") {
    skyLocationState.textContent = "Tonight's sky ready";
    const bestMatch = skyData.featured_objects.find((item) => item.name === "Moon") || skyData.featured_objects[0];
    if (bestMatch) {
      setSelectedObject(bestMatch);
    }
    skySearchInput.value = "";
    renderSearch();
    return;
  }

  if (action.mode === "filter") {
    skySearchInput.value = action.filter || "";
    renderSearch();

    const match = skyData.featured_objects.find((item) => normalize(item.category) === normalize(action.filter));
    if (match) {
      setSelectedObject(match);
    }
    return;
  }

  if (action.mode === "select") {
    const match = skyData.featured_objects.find((item) => normalize(item.name) === normalize(action.target));
    if (match) {
      setSelectedObject(match);
      renderSearch();
    }
    return;
  }

  if (action.mode === "telescope") {
    telescopeMode = !telescopeMode;
    skyStage.classList.toggle("is-telescope-mode", telescopeMode);
    skyLocationState.textContent = telescopeMode ? "Telescope mode on" : "Telescope mode off";
    skyStage.style.boxShadow = telescopeMode ? "0 0 40px rgba(0, 229, 255, 0.32)" : "";
  }
}

async function askVertex(event) {
  event.preventDefault();

  const message = skyAiInput.value.trim();
  if (!message) {
    return;
  }

  skyAiResponse.textContent = "VERTEX is thinking...";

  try {
    const payload = await fetchJson("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    skyAiResponse.textContent = payload.response || "No response returned.";
  } catch (error) {
    skyAiResponse.textContent = error.message || "VERTEX could not answer right now. Local page features still work.";
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    skyStage.requestFullscreen?.();
    return;
  }

  document.exitFullscreen?.();
}

function setOverlayReady() {
  skyStage.classList.add("is-loaded");
}

async function loadSkyData() {
  try {
    skyData = await fetchJson("/api/sky-explorer-data");
  } catch (error) {
    skyData = { featured_objects: [], control_actions: [] };
    skyStageOverlay.textContent = "Sky data could not load right now.";
  }

  skyControlGrid.innerHTML = "";
  skyData.control_actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "sky-control-btn";
    button.innerHTML = `<strong>${action.label}</strong><span>${action.query}</span>`;
    button.addEventListener("click", () => handleControlAction(action));
    skyControlGrid.appendChild(button);
  });

  if (skyData.featured_objects.length) {
    setSelectedObject(skyData.featured_objects[0]);
  }

  renderSearch();
}

stellariumFrame?.addEventListener("load", setOverlayReady);
skyFullscreenButton?.addEventListener("click", toggleFullscreen);
skySearchInput?.addEventListener("input", renderSearch);
skyAiForm?.addEventListener("submit", askVertex);

loadSkyData();
