const historyKey = "vertex-interview-history";
let session = null;
let currentQuestion = "";
let evaluations = [];

function logInterviewError(message, payload) {
  if (location.hostname === "127.0.0.1" || location.hostname === "localhost") {
    console.error(`[Interviewer] ${message}`, payload);
  }
}
function escapeHtml(text){ return String(text||"").replace(/[&<>"']/g,(ch)=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[ch])); }
function history(){ try { return JSON.parse(localStorage.getItem(historyKey) || "[]"); } catch { return []; } }
function saveHistory(report){ localStorage.setItem(historyKey, JSON.stringify([report,...history()].slice(0,10))); renderHistory(); }
function renderHistory(){ document.querySelector("#interviewHistory").innerHTML=history().map((item)=>`<div>${escapeHtml(item.date)}: ${escapeHtml(item.average_score)}/10 ${escapeHtml(item.domain)}</div>`).join("") || "<p>No interviews yet.</p>"; }
async function fetchJson(url, options){
  const res=await fetch(url, options);
  const contentType=res.headers.get("content-type") || "";
  if(!contentType.includes("application/json")) throw new Error("Server returned a non-JSON response");
  const data=await res.json();
  if(!res.ok) throw new Error(data.error || "Request failed");
  return data;
}
function validateEvaluation(data){
  if(!data || typeof data !== "object" || typeof data.score === "undefined" || !Array.isArray(data.strengths) || !Array.isArray(data.missing_points)){
    logInterviewError("Invalid evaluation schema", data);
    throw new Error("Interview evaluation response was incomplete");
  }
  return data;
}
function renderEval(data){
  validateEvaluation(data);
  document.querySelector("#evaluationPanel").innerHTML=`
    <article><strong>Score: ${escapeHtml(data.score)}/10</strong></article>
    <article><strong>Strengths</strong><ul>${(data.strengths||[]).map((item)=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></article>
    <article><strong>Missing points</strong><ul>${(data.missing_points||[]).map((item)=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></article>
    <article><strong>Improved answer</strong><p>${escapeHtml(data.improved_answer || data.sample_answer || "")}</p></article>
    <article><strong>Next question</strong><p>${escapeHtml(data.next_question || data.follow_up || "")}</p></article>`;
  const avg=evaluations.reduce((sum,item)=>sum+Number(item.score||0),0)/(evaluations.length||1);
  document.querySelector("#totalScore").textContent=avg.toFixed(1);
}
async function nextQuestion(){
  const data=await fetchJson("/api/interview/question",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session})});
  session=data.session;
  currentQuestion=data.question;
  document.querySelector("#questionBox").textContent=currentQuestion;
  document.querySelector("#answerInput").value="";
}
document.querySelector("#startInterview").onclick=async()=>{
  try{
    const data=await fetchJson("/api/interview/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({role:document.querySelector("#roleInput").value,domain:document.querySelector("#domainSelect").value,difficulty:document.querySelector("#difficultySelect").value,mode:document.querySelector("#modeSelect").value,total_questions:document.querySelector("#questionCount").value})});
    session=data.session;
    currentQuestion=data.question;
    evaluations=[];
    document.querySelector("#questionBox").textContent=currentQuestion;
    document.querySelector("#evaluationPanel").innerHTML="";
    document.querySelector("#summaryPanel").innerHTML="<p>Interview started.</p>";
    document.querySelector("#totalScore").textContent="0.0";
  }catch(error){
    document.querySelector("#summaryPanel").textContent=error.message || "Interview could not start.";
  }
};
document.querySelector("#evaluateAnswer").onclick=async()=>{
  if(!currentQuestion) return;
  try{
    const data=validateEvaluation(await fetchJson("/api/interview/evaluate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:currentQuestion,answer:document.querySelector("#answerInput").value,session})}));
    evaluations.push({...data,question:currentQuestion});
    renderEval(data);
    if(data.next_question){
      currentQuestion=data.next_question;
      document.querySelector("#questionBox").textContent=currentQuestion;
      document.querySelector("#answerInput").value="";
    }
  }catch(error){
    logInterviewError("Evaluate failed", error);
    document.querySelector("#evaluationPanel").innerHTML=`<p class="error-text">${escapeHtml(error.message)}</p>`;
  }
};
document.querySelector("#nextQuestion").onclick=()=>nextQuestion().catch((error)=>{ document.querySelector("#summaryPanel").textContent=error.message; });
document.querySelector("#retryQuestion").onclick=()=>{ const weak=evaluations.filter((item)=>Number(item.score)<7).pop(); if(weak){ currentQuestion=weak.question; document.querySelector("#questionBox").textContent=currentQuestion; document.querySelector("#answerInput").value=""; } };
document.querySelector("#finishInterview").onclick=async()=>{
  try{
    const data=await fetchJson("/api/interview/summary",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({session,evaluations})});
    document.querySelector("#summaryPanel").innerHTML=`
      <article><strong>Average score</strong><p>${escapeHtml(data.average_score)}/10 across ${escapeHtml(data.total_questions)} questions</p></article>
      <article><strong>Strengths</strong><ul>${(data.strengths||[]).map((item)=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></article>
      <article><strong>Next steps</strong><ul>${(data.next_steps||[]).map((item)=>`<li>${escapeHtml(item)}</li>`).join("")}</ul></article>
      <p>${escapeHtml(data.report || "")}</p>`;
    saveHistory({date:new Date().toLocaleString(),average_score:data.average_score,domain:session?.domain||"Interview",report:data.report});
  }catch(error){
    document.querySelector("#summaryPanel").textContent=error.message || "Final report failed.";
  }
};
document.querySelector("#exportReport").onclick=()=>{ const blob=new Blob([document.querySelector("#summaryPanel").textContent],{type:"text/plain"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="vertex-interview-report.txt"; a.click(); URL.revokeObjectURL(a.href); };
document.querySelector("#voiceAnswer").onclick=()=>{ const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SpeechRecognition){ alert("Voice input is not supported in this browser."); return; } const rec=new SpeechRecognition(); rec.lang="en-US"; rec.onresult=(event)=>{ document.querySelector("#answerInput").value=event.results[0][0].transcript; }; rec.start(); };
renderHistory();
