const historyKey = "vertex-diagram-history";
const editor = document.querySelector("#mermaidEditor");
const renderEl = document.querySelector("#diagramRender");
const viewport = document.querySelector("#diagramViewport");
let scale = 1;
let undo = [];
let redo = [];
function histories(){ return JSON.parse(localStorage.getItem(historyKey) || "[]"); }
function saveHistory(source){ localStorage.setItem(historyKey, JSON.stringify([source,...histories().filter((x)=>x!==source)].slice(0,12))); renderHistory(); }
function renderHistory(){ document.querySelector("#diagramHistory").innerHTML=histories().map((item,i)=>`<button type="button" data-history="${i}">${item.split("\n")[0]}</button>`).join("") || "<p class='muted'>No diagrams yet.</p>"; }
function sanitize(text){ return String(text||"").replace(/</g,"").slice(0,12000); }
async function renderDiagram(){ const source=sanitize(editor.value); if(!window.mermaid){ renderEl.textContent="Mermaid renderer is unavailable. You can still edit, copy, and download the source."; return; } try{ mermaid.initialize({startOnLoad:false,theme:document.querySelector("#diagramTheme").checked?"dark":"default",securityLevel:"strict"}); const result=await mermaid.render(`vertexDiagram${Date.now()}`, source); renderEl.innerHTML=result.svg; }catch(error){ renderEl.textContent=`Mermaid syntax error: ${error.message}`; } }
function setSource(text){ undo.push(editor.value); editor.value=sanitize(text); renderDiagram(); saveHistory(editor.value); }
editor.value="flowchart TD\n  Idea[User idea] --> VERTEX[VERTEX AI Whiteboard]\n  VERTEX --> Diagram[Mermaid diagram]\n  Diagram --> Explain[Explain and refine]\n";
editor.addEventListener("input",()=>{ renderDiagram(); });
document.querySelector("#generateDiagram").onclick=async()=>{ const res=await fetch("/api/whiteboard/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:document.querySelector("#diagramPrompt").value,diagram_type:document.querySelector("#diagramType").value})}); const data=await res.json(); setSource(data.mermaid); };
document.querySelector("#explainDiagram").onclick=async()=>{ const res=await fetch("/api/whiteboard/explain",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mermaid:editor.value})}); const data=await res.json(); document.querySelector("#diagramExplanation").textContent=data.explanation||"No explanation available."; };
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
