const userKey = "vertex-user-prompts";
const favKey = "vertex-favorite-prompts";
const recentKey = "vertex-recent-prompts";
let seedPrompts = [];
let selectedPrompt = null;
const grid = document.querySelector("#promptGrid");
const editor = document.querySelector("#promptEditor");
const statusEl = document.querySelector("#promptStatus");
const favorites = new Set(JSON.parse(localStorage.getItem(favKey) || "[]"));
function escapeHtml(text){ return String(text||"").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch])); }
function logPromptError(message, payload){ if(location.hostname==="127.0.0.1"||location.hostname==="localhost") console.error(`[PromptLibrary] ${message}`, payload); }
async function fetchJson(url, options){ const res=await fetch(url, options); const contentType=res.headers.get("content-type")||""; if(!contentType.includes("application/json")) throw new Error("Server returned a non-JSON response"); const data=await res.json(); if(!res.ok) throw new Error(data.error||"Request failed"); return data; }
function getUsers(){ return JSON.parse(localStorage.getItem(userKey) || "[]"); }
function setUsers(items){ localStorage.setItem(userKey, JSON.stringify(items)); }
function allPrompts(){ return [...seedPrompts, ...getUsers()]; }
function saveFavs(){ localStorage.setItem(favKey, JSON.stringify([...favorites])); }
function recents(){ return JSON.parse(localStorage.getItem(recentKey) || "[]"); }
function addRecent(item){ const list=[item.title,...recents().filter((x)=>x!==item.title)].slice(0,8); localStorage.setItem(recentKey, JSON.stringify(list)); renderRecent(); }
function renderRecent(){ document.querySelector("#recentPrompts").innerHTML = recents().map((x)=>`<div>${escapeHtml(x)}</div>`).join("") || "<p>No recent prompts.</p>"; }
function render(){ const search=document.querySelector("#promptSearch").value.toLowerCase(); const cat=document.querySelector("#categoryFilter").value; const tag=document.querySelector("#tagFilter").value.toLowerCase(); const sort=document.querySelector("#sortPrompts").value; let items=allPrompts().filter((p)=>(!cat||p.category===cat)&&(!search||`${p.title} ${p.prompt}`.toLowerCase().includes(search))&&(!tag||(p.tags||[]).join(" ").toLowerCase().includes(tag))); if(sort==="favorites") items=items.filter((p)=>favorites.has(p.id)); else if(sort==="newest") items.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))); else items.sort((a,b)=>(b.popularity||0)-(a.popularity||0)); grid.innerHTML=items.map((p)=>`<article class="prompt-card"><h3>${p.featured?"★ ":""}${escapeHtml(p.title)}</h3><p>${escapeHtml(String(p.prompt||"").slice(0,160))}...</p><div class="tag-list">${(p.tags||[]).slice(0,4).map((t)=>`<span>${escapeHtml(t)}</span>`).join("")}</div><button data-id="${escapeHtml(p.id)}">Open ${favorites.has(p.id)?"♥":"♡"}</button></article>`).join("") || "<p>No prompts found.</p>"; statusEl.textContent = `${items.length} prompts shown`; }
function selectPrompt(id){ selectedPrompt=allPrompts().find((p)=>p.id===id); if(!selectedPrompt) return; editor.value=selectedPrompt.prompt; document.querySelector("#promptTitle").value=selectedPrompt.title; document.querySelector("#promptCategory").value=selectedPrompt.category; document.querySelector("#promptTags").value=(selectedPrompt.tags||[]).join(", "); addRecent(selectedPrompt); }
grid.onclick=(event)=>{ const button=event.target.closest("[data-id]"); if(!button) return; selectPrompt(button.dataset.id); if(event.altKey){ favorites.has(button.dataset.id)?favorites.delete(button.dataset.id):favorites.add(button.dataset.id); saveFavs(); render(); } };
document.querySelectorAll("#promptSearch,#categoryFilter,#tagFilter,#sortPrompts").forEach((el)=>el.addEventListener("input",render));
document.querySelector("#savePrompt").onclick=()=>{ const users=getUsers(); const id=selectedPrompt?.id?.startsWith("user-")?selectedPrompt.id:`user-${Date.now()}`; const item={id,title:document.querySelector("#promptTitle").value||"Untitled Prompt",category:document.querySelector("#promptCategory").value,tags:document.querySelector("#promptTags").value.split(",").map((x)=>x.trim()).filter(Boolean),prompt:editor.value,popularity:1,created_at:new Date().toISOString(),featured:false}; setUsers([item,...users.filter((p)=>p.id!==id)]); selectedPrompt=item; render(); };
document.querySelector("#copyPrompt").onclick=()=>navigator.clipboard.writeText(editor.value);
document.querySelector("#duplicatePrompt").onclick=()=>{ selectedPrompt=null; document.querySelector("#promptTitle").value=`Copy of ${document.querySelector("#promptTitle").value}`; };
document.querySelector("#deletePrompt").onclick=()=>{ if(!selectedPrompt?.id?.startsWith("user-")) return; setUsers(getUsers().filter((p)=>p.id!==selectedPrompt.id)); selectedPrompt=null; editor.value=""; render(); };
document.querySelector("#exportPrompts").onclick=()=>{ const blob=new Blob([JSON.stringify(getUsers(),null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="vertex-prompts.json"; a.click(); URL.revokeObjectURL(a.href); };
document.querySelector("#importPrompts").onchange=async(event)=>{ const text=await event.target.files[0].text(); const items=JSON.parse(text); if(Array.isArray(items)){ setUsers([...items,...getUsers()]); render(); } };
document.querySelector("#improvePrompt").onclick=async()=>{ statusEl.textContent="Improving prompt"; try{ const data=await fetchJson("/api/prompts/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:document.querySelector("#roughPrompt").value})}); if(typeof data.prompt!=="string") throw new Error("Prompt response was incomplete"); editor.value=data.prompt; statusEl.textContent=data.source==="groq"?"Improved with Groq":"Improved locally"; }catch(error){ logPromptError("Improve failed", error); statusEl.textContent=error.message || "Prompt improvement failed"; } };
document.querySelector("#sendChat").onclick=()=>localStorage.setItem("vertex-draft-prompt", editor.value);
document.querySelector("#sendBuilder").onclick=()=>localStorage.setItem("vertex-builder-draft", editor.value);
fetchJson("/api/prompts").then((data)=>{ seedPrompts=data.prompts||[]; render(); renderRecent(); }).catch((error)=>{ statusEl.textContent=error.message || "Prompt library failed to load"; });
