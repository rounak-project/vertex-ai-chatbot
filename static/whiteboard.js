const historyKey = "vertex-diagram-history";
const editor = document.querySelector("#mermaidEditor");
const renderEl = document.querySelector("#diagramRender");
const viewport = document.querySelector("#diagramViewport");
const explanationEl = document.querySelector("#diagramExplanation");
let scale = 1;
let undo = [];
let redo = [];

function logWhiteboardError(message, payload) {
  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    console.error(`[Whiteboard] ${message}`, payload);
  }
}
function histories(){ try { return JSON.parse(localStorage.getItem(historyKey) || "[]"); } catch { return []; } }
function saveHistory(source){ localStorage.setItem(historyKey, JSON.stringify([source,...histories().filter((x)=>x!==source)].slice(0,12))); renderHistory(); }
function escapeHtml(text){ return String(text||"").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch])); }
function renderHistory(){ document.querySelector("#diagramHistory").innerHTML=histories().map((item,i)=>`<button type="button" data-history="${i}">${escapeHtml(item.split("\n")[0])}</button>`).join("") || "<p class='muted'>No diagrams yet.</p>"; }
function sanitize(text){ return String(text||"").replace(/</g,"").replace(/javascript:/gi,"").slice(0,12000); }
async function renderDiagram(){
  const source=sanitize(editor.value);
  if(!source.trim()){ renderEl.textContent="Generate or type Mermaid source to render a diagram."; return; }
  if(!window.mermaid){ renderEl.textContent="Mermaid renderer is unavailable. You can still edit, copy, and download the source."; return; }
  try{
    mermaid.initialize({startOnLoad:false,theme:document.querySelector("#diagramTheme").checked?"dark":"default",securityLevel:"strict"});
    const result=await mermaid.render(`vertexDiagram${Date.now()}`, source);
    renderEl.innerHTML=result.svg;
  }catch(error){
    renderEl.innerHTML=`<p class="error-text">Mermaid syntax error. Check the source tab and try again.</p>`;
    logWhiteboardError("Mermaid render failed", error);
  }
}
function setSource(text){ undo.push(editor.value); editor.value=sanitize(text); renderDiagram(); saveHistory(editor.value); }
async function fetchJson(url, options){
  const res=await fetch(url, options);
  const contentType=res.headers.get("content-type") || "";
  if(!contentType.includes("application/json")) throw new Error("Server returned a non-JSON response");
  const data=await res.json();
  if(!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

editor.value="flowchart TD\n  Idea[User idea] --> VERTEX[VERTEX AI Whiteboard]\n  VERTEX --> Diagram[Mermaid diagram]\n  Diagram --> Explain[Explain and refine]\n";
editor.addEventListener("input",()=>{ renderDiagram(); });
document.querySelector("#generateDiagram").onclick=async()=>{
  try{
    const data=await fetchJson("/api/whiteboard/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:document.querySelector("#diagramPrompt").value,diagram_type:document.querySelector("#diagramType").value})});
    const diagram=data.diagram || data.mermaid;
    if(typeof diagram !== "string" || !diagram.trim()) throw new Error("Whiteboard response did not include a diagram");
    setSource(diagram);
    explanationEl.textContent=data.explanation || "Diagram generated.";
  }catch(error){
    logWhiteboardError("Generate failed", error);
    explanationEl.textContent=error.message || "Diagram generation failed.";
  }
};
document.querySelector("#explainDiagram").onclick=async()=>{
  try{
    const data=await fetchJson("/api/whiteboard/explain",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mermaid:editor.value})});
    explanationEl.textContent=data.explanation||"No explanation available.";
  }catch(error){
    explanationEl.textContent=error.message || "Explanation failed.";
  }
};
document.querySelector("#zoomIn").onclick=()=>{ scale=Math.min(2,scale+.1); renderEl.style.transform=`scale(${scale})`; };
document.querySelector("#zoomOut").onclick=()=>{ scale=Math.max(.4,scale-.1); renderEl.style.transform=`scale(${scale})`; };
document.querySelector("#resetView").onclick=()=>{ scale=1; renderEl.style.transform="scale(1)"; viewport.scrollTo(0,0); };
document.querySelector("#fullscreenBoard").onclick=()=>viewport.requestFullscreen?.();
document.querySelector("#copyMermaid").onclick=()=>navigator.clipboard.writeText(editor.value);
document.querySelector("#downloadMermaid").onclick=()=>{ const blob=new Blob([editor.value],{type:"text/plain"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="vertex-diagram.mmd"; a.click(); URL.revokeObjectURL(a.href); };
document.querySelector("#exportSvg").onclick=()=>{ const svg=renderEl.querySelector("svg"); if(!svg) return; const blob=new Blob([svg.outerHTML],{type:"image/svg+xml"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="vertex-diagram.svg"; a.click(); URL.revokeObjectURL(a.href); };
document.querySelector("#exportPng").onclick=()=>alert("PNG export depends on browser SVG canvas support. Use SVG export if PNG is blocked.");
document.querySelector("#undoDiagram").onclick=()=>{ if(!undo.length) return; redo.push(editor.value); editor.value=undo.pop(); renderDiagram(); };
document.querySelector("#redoDiagram").onclick=()=>{ if(!redo.length) return; undo.push(editor.value); editor.value=redo.pop(); renderDiagram(); };
document.querySelector("#diagramTheme").onchange=()=>{ document.body.classList.toggle("theme-dark", document.querySelector("#diagramTheme").checked); renderDiagram(); };
document.querySelector("#diagramHistory").onclick=(event)=>{ const button=event.target.closest("[data-history]"); if(button) setSource(histories()[Number(button.dataset.history)]); };
document.body.classList.add("theme-dark"); renderHistory(); renderDiagram();
