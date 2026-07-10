const languages = ["python","javascript","typescript","html","css","java","c","cpp","go","rust","bash","sql","yaml","json","dockerfile","terraform","kubernetes","github-actions"];
const starterData = JSON.parse(document.querySelector("#starterData")?.textContent || "{}");
const promptEl = document.querySelector("#codingPrompt");
const languageEl = document.querySelector("#codingLanguage");
const targetLanguageEl = document.querySelector("#targetLanguage");
const actionEl = document.querySelector("#codingAction");
const runButton = document.querySelector("#runCodingAction");
const tabsEl = document.querySelector("#fileTabs");
const editor = document.querySelector("#codeEditor");
const lineNumbers = document.querySelector("#lineNumbers");
const responseEl = document.querySelector("#aiResponse");
const statusEl = document.querySelector("#codingStatus");
const previewFrame = document.querySelector("#previewFrame");
const previewBox = document.querySelector("#frontendPreview");
let files = {"main.py":"# Ask VERTEX to generate or paste code here.\n"};
let activeFile = "main.py";
let undoStack = [];
let redoStack = [];

function setStatus(text){ if(statusEl) statusEl.textContent = text; }
function logCodingError(message, payload){ if(location.hostname==="127.0.0.1"||location.hostname==="localhost") console.error(`[CodingWorkspace] ${message}`, payload); }
async function fetchJson(url, options){ const res=await fetch(url, options); const contentType=res.headers.get("content-type")||""; if(!contentType.includes("application/json")) throw new Error("Server returned a non-JSON response"); const data=await res.json(); if(!res.ok) throw new Error(data.error||"Request failed"); return data; }
function fillSelect(select){ languages.forEach((item)=>select.insertAdjacentHTML("beforeend", `<option value="${item}">${item}</option>`)); }
fillSelect(languageEl); fillSelect(targetLanguageEl);
function snapshot(){ undoStack.push(JSON.stringify(files)); if(undoStack.length>30) undoStack.shift(); redoStack=[]; }
function renderTabs(){ tabsEl.innerHTML = Object.keys(files).map((name)=>`<button class="${name===activeFile?"is-active":""}" data-file="${name}">${name}</button>`).join(""); }
function renderEditor(){ renderTabs(); editor.value = files[activeFile] || ""; updateLines(); updatePreview(); }
function updateLines(){ const count = Math.max(1, editor.value.split("\n").length); lineNumbers.textContent = Array.from({length:count},(_,i)=>i+1).join("\n"); }
function buildPreview(){ const html = files["index.html"]; if(!html) return ""; return String(html).replace(/<link[^>]+href=["']style\.css["'][^>]*>/i, `<style>${files["style.css"] || ""}</style>`).replace(/<script[^>]+src=["']script\.js["'][^>]*>\s*<\/script>/i, `<script>${files["script.js"] || ""}<\/script>`); }
function updatePreview(){ previewFrame.srcdoc = buildPreview(); }
function loadFiles(next){ snapshot(); files = {...files, ...next}; activeFile = Object.keys(next)[0] || activeFile; renderEditor(); }
document.querySelector("#starterGrid").innerHTML = Object.entries(starterData).map(([key,item])=>`<button type="button" data-starter="${key}">${item.name}</button>`).join("");
document.querySelector("#starterGrid").addEventListener("click",(event)=>{ const button=event.target.closest("[data-starter]"); if(button) loadFiles(starterData[button.dataset.starter].files); });
tabsEl.addEventListener("click",(event)=>{ const button=event.target.closest("[data-file]"); if(!button) return; activeFile=button.dataset.file; renderEditor(); });
editor.addEventListener("input",()=>{ files[activeFile]=editor.value; updateLines(); updatePreview(); });
document.querySelector("#codeSearch").addEventListener("input",(event)=>{ const query=event.target.value.toLowerCase(); const index=editor.value.toLowerCase().indexOf(query); if(query && index>=0){ editor.focus(); editor.setSelectionRange(index,index+query.length); } });
document.querySelector("#undoCode").onclick=()=>{ if(!undoStack.length) return; redoStack.push(JSON.stringify(files)); files=JSON.parse(undoStack.pop()); activeFile=Object.keys(files)[0]; renderEditor(); };
document.querySelector("#redoCode").onclick=()=>{ if(!redoStack.length) return; undoStack.push(JSON.stringify(files)); files=JSON.parse(redoStack.pop()); activeFile=Object.keys(files)[0]; renderEditor(); };
document.querySelector("#copyCode").onclick=()=>navigator.clipboard.writeText(editor.value);
document.querySelector("#downloadFile").onclick=()=>{ const blob=new Blob([editor.value],{type:"text/plain"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=activeFile; a.click(); URL.revokeObjectURL(a.href); };
document.querySelector("#resetCode").onclick=()=>{ snapshot(); files={[activeFile]:""}; renderEditor(); };
document.querySelector("#downloadProject").onclick=async()=>{ const res=await fetch("/api/coding/download",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({files})}); if(!res.ok){ setStatus("ZIP failed"); return; } const blob=await res.blob(); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="vertex-code-project.zip"; a.click(); URL.revokeObjectURL(a.href); };
document.querySelectorAll("[data-preview]").forEach((button)=>button.onclick=()=>{ document.querySelectorAll("[data-preview]").forEach((item)=>item.classList.toggle("is-active",item===button)); previewBox.dataset.preview=button.dataset.preview; });
runButton.onclick=async()=>{ setStatus("Working"); runButton.disabled=true; try{ const endpoint=`/api/coding/${actionEl.value}`; const data=await fetchJson(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:promptEl.value,code:editor.value,files,language:languageEl.value,target_language:targetLanguageEl.value})}); if(data.files && typeof data.files==="object" && Object.keys(data.files).length) loadFiles(data.files); responseEl.textContent=[data.message,data.explanation,Array.isArray(data.warnings)?data.warnings.join("\n"):""].filter(Boolean).join("\n\n") || "No response content returned."; setStatus(data.source==="groq"?"Groq response":"Local fallback"); }catch(error){ logCodingError("Action failed", error); responseEl.textContent=error.message; setStatus("Error"); }finally{ runButton.disabled=false; } };
renderEditor();
