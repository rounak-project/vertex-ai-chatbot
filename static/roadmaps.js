const progressKey = "vertex-roadmap-progress";
let roadmaps = [];
let active = null;
const select = document.querySelector("#roadmapSelect");
const timeline = document.querySelector("#roadmapTimeline");
function progress(){ return JSON.parse(localStorage.getItem(progressKey) || "{}"); }
function saveProgress(data){ localStorage.setItem(progressKey, JSON.stringify(data)); }
function activeId(){ return active?.id || "roadmap"; }
function renderSelect(){ select.innerHTML = roadmaps.map((r)=>`<option value="${r.id}">${r.title}</option>`).join(""); }
function render(){ if(!active) return; const store=progress(); const done=store[activeId()]?.done||{}; const notes=store[activeId()]?.notes||{}; const count=active.stages.length; const complete=active.stages.filter((s)=>done[s.id]).length; document.querySelector("#progressPercent").textContent=`${Math.round((complete/count)*100)||0}%`; document.querySelector("#nextStep").textContent=`Suggested next step: ${active.stages.find((s)=>!done[s.id])?.title || active.suggested_next_step || "Keep building projects"}`; timeline.innerHTML=active.stages.map((s,i)=>`<article class="stage ${done[s.id]?"checked":""}"><h3>${i+1}. ${s.title}</h3><label><input type="checkbox" data-done="${s.id}" ${done[s.id]?"checked":""}> Mark complete</label><details><summary>Stage details</summary><div class="stage-grid"><div><strong>Goals</strong><p>${(s.learning_goals||[]).join("<br>")}</p></div><div><strong>Projects</strong><p>${(s.recommended_projects||[]).join("<br>")}</p></div><div><strong>Practice</strong><p>${(s.practice_tasks||[]).join("<br>")}</p></div><div><strong>Tools</strong><p>${(s.useful_tools||[]).join(", ")}</p></div></div></details><textarea class="note" data-note="${s.id}" placeholder="Notes for this skill">${notes[s.id]||""}</textarea></article>`).join(""); }
timeline.addEventListener("change",(event)=>{ if(!event.target.matches("[data-done]")) return; const store=progress(); store[activeId()] ||= {done:{},notes:{}}; store[activeId()].done[event.target.dataset.done]=event.target.checked; saveProgress(store); render(); });
timeline.addEventListener("input",(event)=>{ if(!event.target.matches("[data-note]")) return; const store=progress(); store[activeId()] ||= {done:{},notes:{}}; store[activeId()].notes[event.target.dataset.note]=event.target.value; saveProgress(store); });
select.onchange=()=>{ active=roadmaps.find((r)=>r.id===select.value); render(); };
document.querySelector("#resetRoadmap").onclick=()=>{ const store=progress(); delete store[activeId()]; saveProgress(store); render(); };
document.querySelector("#printRoadmap").onclick=()=>window.print();
document.querySelector("#generateRoadmap").onclick=async()=>{ const res=await fetch("/api/roadmaps/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:document.querySelector("#customRoadmapPrompt").value})}); const data=await res.json(); active=data.roadmap; active.id=`custom-${Date.now()}`; roadmaps.unshift(active); renderSelect(); select.value=active.id; render(); };
fetch("/api/roadmaps").then((r)=>r.json()).then((data)=>{ roadmaps=data.roadmaps||[]; active=roadmaps[0]; renderSelect(); render(); });
