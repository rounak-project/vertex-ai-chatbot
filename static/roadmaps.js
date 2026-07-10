const progressKey = "vertex-roadmap-progress";
let roadmaps = [];
let active = null;
const select = document.querySelector("#roadmapSelect");
const timeline = document.querySelector("#roadmapTimeline");
const statusEl = document.querySelector("#nextStep");

function logRoadmapError(message, payload) {
  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    console.error(`[Roadmaps] ${message}`, payload);
  }
}
function escapeHtml(text){ return String(text||"").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch])); }
function progress(){ try { return JSON.parse(localStorage.getItem(progressKey) || "{}"); } catch { return {}; } }
function saveProgress(data){ localStorage.setItem(progressKey, JSON.stringify(data)); }
function activeId(){ return active?.id || "roadmap"; }
function normalizeStage(stage, index){
  const title = stage?.title || `Stage ${index + 1}`;
  return {
    id: stage?.id || `${activeId()}-${index}`,
    title,
    duration: stage?.duration || "2-4 weeks",
    skills: Array.isArray(stage?.skills) && stage.skills.length ? stage.skills : (stage?.learning_goals || []),
    projects: Array.isArray(stage?.projects) && stage.projects.length ? stage.projects : (stage?.recommended_projects || []),
    practice_tasks: stage?.practice_tasks || [],
    useful_tools: stage?.useful_tools || [],
    difficulty: stage?.difficulty || "Mixed",
    checklist: stage?.checklist || []
  };
}
function validateRoadmap(item){
  if(!item || typeof item !== "object" || !Array.isArray(item.stages) || !item.stages.length){
    logRoadmapError("Invalid roadmap schema", item);
    throw new Error("Roadmap response did not include stages");
  }
  return item;
}
function renderSelect(){ select.innerHTML = roadmaps.map((r)=>`<option value="${escapeHtml(r.id)}">${escapeHtml(r.title)}</option>`).join(""); }
function render(){
  if(!active) return;
  validateRoadmap(active);
  const stages = active.stages.map(normalizeStage);
  const store=progress();
  const done=store[activeId()]?.done||{};
  const notes=store[activeId()]?.notes||{};
  const complete=stages.filter((s)=>done[s.id]).length;
  document.querySelector("#progressPercent").textContent=`${Math.round((complete/stages.length)*100)||0}%`;
  statusEl.textContent=`Suggested next step: ${stages.find((s)=>!done[s.id])?.title || active.suggested_next_step || "Keep building projects"}`;
  timeline.innerHTML=`
    <header class="roadmap-summary">
      <h2>${escapeHtml(active.title || "Custom Roadmap")}</h2>
      <p>${escapeHtml(active.description || active.difficulty || "Follow the connected stages below.")}</p>
    </header>
    ${stages.map((s,i)=>`<article class="stage ${done[s.id]?"checked":""}">
      <h3>${i+1}. ${escapeHtml(s.title)}</h3>
      <p class="muted">${escapeHtml(s.duration)} · ${escapeHtml(s.difficulty)}</p>
      <label><input type="checkbox" data-done="${escapeHtml(s.id)}" ${done[s.id]?"checked":""}> Mark complete</label>
      <details open><summary>Skills and projects</summary>
        <div class="stage-grid">
          <div><strong>Skills</strong><p>${(s.skills||[]).map(escapeHtml).join("<br>") || "Practice the core concept."}</p></div>
          <div><strong>Projects</strong><p>${(s.projects||[]).map(escapeHtml).join("<br>") || "Build a small portfolio project."}</p></div>
          <div><strong>Practice</strong><p>${(s.practice_tasks||[]).map(escapeHtml).join("<br>") || "Complete focused exercises."}</p></div>
          <div><strong>Tools</strong><p>${(s.useful_tools||[]).map(escapeHtml).join(", ") || "Documentation, GitHub, VS Code"}</p></div>
        </div>
      </details>
      <textarea class="note" data-note="${escapeHtml(s.id)}" placeholder="Notes for this skill">${escapeHtml(notes[s.id]||"")}</textarea>
    </article>`).join("")}`;
}
async function fetchJson(url, options){
  const res=await fetch(url, options);
  const contentType=res.headers.get("content-type") || "";
  if(!contentType.includes("application/json")) throw new Error("Server returned a non-JSON response");
  const data=await res.json();
  if(!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
timeline.addEventListener("change",(event)=>{ if(!event.target.matches("[data-done]")) return; const store=progress(); store[activeId()] ||= {done:{},notes:{}}; store[activeId()].done[event.target.dataset.done]=event.target.checked; saveProgress(store); render(); });
timeline.addEventListener("input",(event)=>{ if(!event.target.matches("[data-note]")) return; const store=progress(); store[activeId()] ||= {done:{},notes:{}}; store[activeId()].notes[event.target.dataset.note]=event.target.value; saveProgress(store); });
select.onchange=()=>{ active=roadmaps.find((r)=>r.id===select.value); render(); };
document.querySelector("#resetRoadmap").onclick=()=>{ const store=progress(); delete store[activeId()]; saveProgress(store); render(); };
document.querySelector("#printRoadmap").onclick=()=>window.print();
document.querySelector("#generateRoadmap").onclick=async()=>{
  statusEl.textContent="Generating custom roadmap...";
  try{
    const data=await fetchJson("/api/roadmaps/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:document.querySelector("#customRoadmapPrompt").value})});
    active=validateRoadmap(data.roadmap);
    active.id=`custom-${Date.now()}`;
    roadmaps.unshift(active);
    renderSelect();
    select.value=active.id;
    render();
  }catch(error){
    logRoadmapError("Generate failed", error);
    statusEl.textContent=error.message || "Roadmap generation failed.";
  }
};
fetchJson("/api/roadmaps").then((data)=>{ roadmaps=data.roadmaps||[]; active=roadmaps[0]; renderSelect(); render(); }).catch((error)=>{ timeline.innerHTML=`<p class="error-text">${escapeHtml(error.message)}</p>`; });
