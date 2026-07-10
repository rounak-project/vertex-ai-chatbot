const builderForm = document.querySelector("#websiteBuilderForm");
const promptInput = document.querySelector("#websitePrompt");
const templateSelect = document.querySelector("#templateSelect");
const styleSelect = document.querySelector("#styleSelect");
const colorInput = document.querySelector("#colorInput");
const statusBadge = document.querySelector("#builderStatus");
const previewFrame = document.querySelector("#websitePreview");
const previewCanvas = document.querySelector("#previewCanvas");
const projectName = document.querySelector("#projectName");
const generateButton = document.querySelector("#generateWebsiteButton");
const progressPanel = document.querySelector("#generationProgress");
const progressTitle = document.querySelector("#generationProgressTitle");
const progressText = document.querySelector("#generationProgressText");
const previewLoader = document.querySelector("#previewLoader");
const previewLoaderTitle = document.querySelector("#previewLoaderTitle");
const previewLoaderText = document.querySelector("#previewLoaderText");
const promptAssistant = document.querySelector("#promptAssistant");
const surpriseButton = document.querySelector("#surpriseButton");
const editInstruction = document.querySelector("#editInstruction");
const editWithAiButton = document.querySelector("#editWithAiButton");
const sectionSelect = document.querySelector("#sectionSelect");
const saveVersionButton = document.querySelector("#saveVersionButton");
const historyList = document.querySelector("#historyList");
const undoButton = document.querySelector("#undoButton");
const redoButton = document.querySelector("#redoButton");
const codeEditor = document.querySelector("#codeEditor");
const findInput = document.querySelector("#findInput");
const planOutput = document.querySelector("#planOutput");
const validationOutput = document.querySelector("#validationOutput");
const copyFileButton = document.querySelector("#copyFileButton");
const downloadFileButton = document.querySelector("#downloadFileButton");
const resetFileButton = document.querySelector("#resetFileButton");
const downloadZipButton = document.querySelector("#downloadZipButton");
const copyAllButton = document.querySelector("#copyAllButton");
const downloadHtmlButton = document.querySelector("#downloadHtmlButton");
const downloadCssButton = document.querySelector("#downloadCssButton");
const downloadJsButton = document.querySelector("#downloadJsButton");

const defaultFiles = {
  "index.html": "<!-- Generate a website to edit index.html. -->",
  "style.css": "/* Generate a website to edit style.css. */",
  "script.js": "// Generate a website to edit script.js."
};

const generationStages = [
  "Understanding your idea",
  "Planning the website",
  "Writing content",
  "Designing components",
  "Generating code",
  "Preparing preview"
];
const editStages = [
  "Reading current site",
  "Applying requested edit",
  "Updating sections",
  "Refreshing code",
  "Validating changes",
  "Preparing preview"
];

let currentProject = {
  project_name: "Untitled Website",
  summary: "",
  plan: null,
  design_system: null,
  files: { ...defaultFiles },
  readme: ""
};
let activeFile = "index.html";
let savedSnapshot = { ...defaultFiles };
let undoStack = [];
let redoStack = [];
let stageTimer = null;

function setStatus(message) {
  if (statusBadge) statusBadge.textContent = message;
}

function cloneProject(project) {
  return JSON.parse(JSON.stringify(project));
}

function pushUndo() {
  undoStack.push(cloneProject(currentProject));
  if (undoStack.length > 20) undoStack.shift();
  redoStack = [];
}

function getSelectedSections() {
  return Array.from(document.querySelectorAll(".section-options input:checked")).map((item) => item.value);
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function logBuilderError(message, payload) {
  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    console.error(`[WebsiteBuilder] ${message}`, payload);
  }
}

function updateFileTabs() {
  document.querySelectorAll(".file-tab").forEach((tab) => {
    const file = tab.dataset.file;
    tab.classList.toggle("is-active", file === activeFile);
    const dirty = (currentProject.files[file] || "") !== (savedSnapshot[file] || "");
    tab.querySelector("span").textContent = dirty ? "*" : "";
  });
}

function renderEditor() {
  if (!codeEditor) return;
  codeEditor.value = currentProject.files[activeFile] || "";
  updateFileTabs();
}

function stripUnsafePreviewHtml(html) {
  return String(html || "")
    .replace(/<script[^>]+src\s*=\s*["'](?!script\.js["'])[^"']+["'][^>]*>\s*<\/script>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object\b[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "");
}

function stripLinkedAssets(html) {
  return stripUnsafePreviewHtml(html)
    .replace(/<link[^>]+href=["']style\.css["'][^>]*>/gi, "")
    .replace(/<script[^>]+src=["']script\.js["'][^>]*>\s*<\/script>/gi, "");
}

function buildPreviewDocument(files = {}) {
  const html = stripLinkedAssets(files["index.html"] || "");
  const css = String(files["style.css"] || "");
  const js = String(files["script.js"] || "").replace(/<\/script/gi, "<\\/script");
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = escapeHtml(titleMatch ? titleMatch[1] : currentProject.project_name || "Generated Website");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>${css}</style>
</head>
<body>
${body}
<script>${js}<\/script>
</body>
</html>`;
}

async function updatePreview() {
  if (!previewFrame) return;
  previewFrame.srcdoc = buildPreviewDocument(currentProject.files);
}

function updatePlanView() {
  if (projectName) projectName.textContent = currentProject.project_name || "Untitled Website";
  if (planOutput) {
    planOutput.textContent = currentProject.plan
      ? JSON.stringify(currentProject.plan, null, 2)
      : "Generate a website to see the plan.";
  }
  sectionSelect.innerHTML = '<option value="">No section selected</option>';
  (currentProject.plan?.sections || []).forEach((section) => {
    const option = document.createElement("option");
    option.value = section;
    option.textContent = section.replaceAll("-", " ");
    sectionSelect.appendChild(option);
  });
}

function renderValidation(validation) {
  if (!validationOutput) return;
  if (!validation) {
    validationOutput.textContent = "No validation results yet.";
    return;
  }
  const rows = [
    `<strong class="validation-${escapeHtml(validation.status)}">${escapeHtml(validation.status || "unknown").toUpperCase()}</strong>`,
    ...(validation.errors || []).map((item) => `<p class="bad">${escapeHtml(item)}</p>`),
    ...(validation.warnings || []).map((item) => `<p class="warn">${escapeHtml(item)}</p>`),
    ...(validation.passed || []).map((item) => `<p class="good">${escapeHtml(item)}</p>`)
  ];
  validationOutput.innerHTML = rows.join("");
}

async function validateProject() {
  const response = await fetch("/api/website-builder/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: currentProject.files })
  });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("application/json")) {
    throw new Error("Validation failed");
  }
  const validation = await response.json();
  currentProject.validation = validation;
  renderValidation(validation);
}

function validateGeneratedProject(data) {
  const files = data?.files || {};
  const missing = ["index.html", "style.css", "script.js"].filter((name) => typeof files[name] !== "string" || !files[name].trim());
  if (missing.length) {
    logBuilderError("Invalid response schema", data);
    throw new Error(`Generated project is missing ${missing.join(", ")}`);
  }
  return data;
}

function setProject(project, shouldSaveUndo = true) {
  if (shouldSaveUndo) pushUndo();
  currentProject = {
    project_name: project.project_name || "Generated Website",
    summary: project.summary || "",
    plan: project.plan || null,
    design_system: project.design_system || null,
    files: { ...defaultFiles, ...(project.files || {}) },
    readme: project.readme || "",
    validation: project.validation || null
  };
  savedSnapshot = { ...currentProject.files };
  renderEditor();
  updatePlanView();
  renderValidation(currentProject.validation);
  updatePreview();
}

function setBusyState(isBusy, activeButton = generateButton) {
  if (generateButton) generateButton.disabled = isBusy;
  if (editWithAiButton) editWithAiButton.disabled = isBusy;
  if (surpriseButton) surpriseButton.disabled = isBusy;
  if (activeButton) activeButton.dataset.loading = isBusy ? "true" : "false";
}

function updateLoaderStage(stages, index, title) {
  const label = stages[index] || stages[stages.length - 1] || "Working";
  const percent = Math.min(100, ((index + 1) / stages.length) * 100);
  const items = Array.from(progressPanel?.querySelectorAll("li") || []);
  const bar = progressPanel?.querySelector(".progress-track span");

  items.forEach((item, itemIndex) => {
    item.classList.toggle("is-active", itemIndex <= index);
    item.textContent = stages[itemIndex] || item.textContent;
  });
  if (bar) bar.style.width = `${percent}%`;
  if (progressTitle) progressTitle.textContent = title;
  if (progressText) progressText.textContent = label;
  if (previewLoaderTitle) previewLoaderTitle.textContent = title;
  if (previewLoaderText) previewLoaderText.textContent = label;
  setStatus(label);
}

function showProgress(title = "VERTEX is building", stages = generationStages) {
  if (!progressPanel) return;
  window.clearInterval(stageTimer);
  progressPanel.hidden = false;
  previewCanvas?.classList.add("is-loading");
  previewLoader?.setAttribute("aria-hidden", "false");
  let index = 0;
  updateLoaderStage(stages, index, title);
  stageTimer = window.setInterval(() => {
    index = Math.min(index + 1, stages.length - 1);
    updateLoaderStage(stages, index, title);
  }, 520);
}

function hideProgress(message) {
  window.clearInterval(stageTimer);
  stageTimer = null;
  if (progressPanel) progressPanel.hidden = true;
  previewCanvas?.classList.remove("is-loading");
  previewLoader?.setAttribute("aria-hidden", "true");
  setStatus(message);
}

async function generateWebsite(surprise = false) {
  const prompt = promptInput.value.trim();
  if (!prompt && !surprise) {
    setStatus("Add more detail or use Surprise me");
    promptAssistant.hidden = false;
    promptInput.focus();
    return;
  }
  setBusyState(true, generateButton);
  showProgress("VERTEX is building", generationStages);
  try {
    const response = await fetch("/api/website-builder/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        template: templateSelect.value,
        style: styleSelect.value,
        colors: colorInput.value || "auto",
        sections: getSelectedSections(),
        surprise
      })
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) throw new Error("Website Builder returned a non-JSON response");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Generation failed");
    setProject(validateGeneratedProject(data), false);
    saveHistory(`Generated ${data.project_name || "website"}`);
    hideProgress(data.source === "groq" ? "Generated with Groq" : "Generated locally");
  } catch (error) {
    hideProgress(error?.message || "Generation failed");
  } finally {
    setBusyState(false, generateButton);
  }
}

async function editWithAi() {
  const instruction = editInstruction.value.trim();
  if (!instruction) {
    setStatus("Add an edit instruction");
    editInstruction.focus();
    return;
  }
  setBusyState(true, editWithAiButton);
  showProgress("VERTEX is editing", editStages);
  try {
    const response = await fetch("/api/website-builder/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instruction,
        selected_section: sectionSelect.value,
        project: currentProject
      })
    });
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) throw new Error("Website edit returned a non-JSON response");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Edit failed");
    setProject(validateGeneratedProject(data));
    saveHistory(`Edited: ${instruction.slice(0, 32)}`);
    hideProgress("Edit applied");
  } catch (error) {
    hideProgress(error?.message || "Edit failed");
  } finally {
    setBusyState(false, editWithAiButton);
  }
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem("vertex-builder-history") || "[]");
  } catch (error) {
    return [];
  }
}

function writeHistory(history) {
  localStorage.setItem("vertex-builder-history", JSON.stringify(history.slice(0, 10)));
  renderHistory();
}

function saveHistory(name = "Saved version") {
  const history = getHistory();
  history.unshift({
    id: `version-${Date.now()}`,
    name,
    project: cloneProject(currentProject),
    timestamp: new Date().toLocaleString()
  });
  writeHistory(history);
}

function renderHistory() {
  const history = getHistory();
  if (!historyList) return;
  if (!history.length) {
    historyList.innerHTML = "<p>No saved versions yet.</p>";
    return;
  }
  historyList.innerHTML = history.map((item) => `
    <button type="button" data-version="${escapeHtml(item.id)}">
      <strong>${escapeHtml(item.name)}</strong>
      <span>${escapeHtml(item.timestamp)}</span>
    </button>
  `).join("");
}

function restoreVersion(id) {
  const item = getHistory().find((version) => version.id === id);
  if (!item) return;
  setProject(item.project);
  setStatus("Version restored");
}

function downloadFile(fileName, content, mimeType = "text/plain") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function allCodeBundle() {
  return ["index.html", "style.css", "script.js"]
    .map((fileName) => `/* ${fileName} */\n${currentProject.files[fileName] || ""}`)
    .join("\n\n");
}

async function downloadZip() {
  setStatus("Preparing ZIP");
  const response = await fetch("/api/website-builder/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentProject)
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    setStatus(data.error || "ZIP failed");
    return;
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${(currentProject.project_name || "vertex-site").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setStatus("ZIP downloaded");
}

builderForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  generateWebsite(false);
});

promptInput?.addEventListener("input", () => {
  promptAssistant.hidden = promptInput.value.trim().length >= 34;
});

surpriseButton?.addEventListener("click", () => generateWebsite(true));
editWithAiButton?.addEventListener("click", editWithAi);
saveVersionButton?.addEventListener("click", () => saveHistory("Manual save"));

undoButton?.addEventListener("click", () => {
  if (!undoStack.length) return;
  redoStack.push(cloneProject(currentProject));
  currentProject = undoStack.pop();
  renderEditor();
  updatePlanView();
  renderValidation(currentProject.validation);
  updatePreview();
  setStatus("Undo applied");
});

redoButton?.addEventListener("click", () => {
  if (!redoStack.length) return;
  undoStack.push(cloneProject(currentProject));
  currentProject = redoStack.pop();
  renderEditor();
  updatePlanView();
  renderValidation(currentProject.validation);
  updatePreview();
  setStatus("Redo applied");
});

historyList?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-version]");
  if (button) restoreVersion(button.dataset.version);
});

document.querySelectorAll(".file-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    activeFile = tab.dataset.file;
    renderEditor();
  });
});

codeEditor?.addEventListener("input", () => {
  currentProject.files[activeFile] = codeEditor.value;
  updateFileTabs();
  updatePreview();
  validateProject();
});

findInput?.addEventListener("input", () => {
  const query = findInput.value;
  if (!query || !codeEditor) return;
  const index = codeEditor.value.toLowerCase().indexOf(query.toLowerCase());
  if (index >= 0) {
    codeEditor.focus();
    codeEditor.setSelectionRange(index, index + query.length);
  }
});

copyFileButton?.addEventListener("click", async () => {
  await copyText(currentProject.files[activeFile] || "");
  setStatus("File copied");
});
downloadFileButton?.addEventListener("click", () => downloadFile(activeFile, currentProject.files[activeFile] || ""));
resetFileButton?.addEventListener("click", () => {
  currentProject.files[activeFile] = savedSnapshot[activeFile] || defaultFiles[activeFile];
  renderEditor();
  updatePreview();
  validateProject();
});

downloadZipButton?.addEventListener("click", downloadZip);
copyAllButton?.addEventListener("click", async () => {
  await copyText(allCodeBundle());
  setStatus("All code copied");
});
downloadHtmlButton?.addEventListener("click", () => downloadFile("index.html", currentProject.files["index.html"] || "", "text/html"));
downloadCssButton?.addEventListener("click", () => downloadFile("style.css", currentProject.files["style.css"] || "", "text/css"));
downloadJsButton?.addEventListener("click", () => downloadFile("script.js", currentProject.files["script.js"] || "", "text/javascript"));

document.querySelectorAll("[data-viewport]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-viewport]").forEach((item) => item.classList.toggle("is-active", item === button));
    previewCanvas.dataset.viewport = button.dataset.viewport;
  });
});

document.querySelector("#fitPreviewButton")?.addEventListener("click", () => {
  previewCanvas.classList.toggle("is-fit");
});
document.querySelector("#refreshPreviewButton")?.addEventListener("click", updatePreview);
document.querySelector("#openPreviewButton")?.addEventListener("click", () => {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    setStatus("Popup blocked");
    return;
  }
  win.document.open();
  win.document.write(previewFrame.srcdoc || buildPreviewDocument(currentProject.files));
  win.document.close();
});
document.querySelector("#fullscreenPreviewButton")?.addEventListener("click", () => {
  previewCanvas.requestFullscreen?.();
});

document.querySelectorAll("[data-inspector]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-inspector]").forEach((item) => item.classList.toggle("is-active", item === button));
    document.querySelectorAll("[data-view]").forEach((view) => view.classList.toggle("is-active", view.dataset.view === button.dataset.inspector));
  });
});

promptInput.value = "Create an AI cybersecurity startup landing page with threat monitoring, product demo, integrations, pricing, FAQ, and CTA.";
renderEditor();
renderHistory();
updatePlanView();
updatePreview();
