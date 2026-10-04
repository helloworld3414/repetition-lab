"use strict";
/* ===== 도구 ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const now = () => Date.now();
const delay = ms => new Promise(r => setTimeout(r, ms));
const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 3 | 8)).toString(16); });
const dur = ms => "PT" + (Math.max(0, ms) / 1000).toFixed(1) + "S";
const secs = ms => ms == null ? "-" : (ms < 60000 ? Math.round(ms / 1000) + "초" : Math.floor(ms / 60000) + "분 " + Math.round((ms % 60000) / 1000) + "초");
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장소 없음 */ } }
function load(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
function drop(k) { try { localStorage.removeItem(k); } catch (e) { /* 무시 */ } }
const ICONS = {
  goal: '<path d="M6 21V4"/><path d="M6 4h11l-2.5 4L17 12H6"/>',
  think: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.3V16h6v-.9c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3z"/>',
  learn: '<path d="M12 6.5C10 5 7 4.5 4 4.5v13c3 0 6 .5 8 2 2-1.5 5-2 8-2v-13c-3 0-6 .5-8 2z"/><path d="M12 6.5v13"/>',
  activity: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>',
  summary: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.8 2.8L16 9.5"/>',
  check: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8 12.5l2.8 2.8L16 9.5"/>',
  formative: '<rect x="5.5" y="4.5" width="13" height="16" rx="2"/><path d="M9 3.5h6v3H9z"/><path d="M9 11h6"/><path d="M9 15h4"/>',
  note: '<path d="M6.5 3.5h11v17l-5.5-3.5-5.5 3.5z"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z"/>',
  lab: '<path d="M9.5 3.5h5"/><path d="M10.5 3.5v6L5.2 18.2A1.8 1.8 0 0 0 6.8 21h10.4a1.8 1.8 0 0 0 1.6-2.8L13.5 9.5v-6"/><path d="M7.5 15h9"/>',
  code: '<path d="M8.5 7l-5 5 5 5"/><path d="M15.5 7l5 5-5 5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6v.2"/>',
  chat: '<path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17h-7l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5z"/>'
};
const KIND_ICON = { goal: "goal", think: "think", learn1: "learn", learn2: "learn", activity: "activity", summary: "summary", check: "check", formative: "formative", note: "note" };
function ic(name) { const p = ICONS[name]; return p ? '<svg class="ic" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + p + "</svg>" : ""; }
function actLabel(kind, text) { return '<span class="act-label" data-kind="' + kind + '">' + ic(KIND_ICON[kind]) + text + "</span>"; }
function progBar(i, n) { return '<span class="pbar" aria-hidden="true"><span style="width:' + Math.round(100 * i / n) + '%"></span></span>'; }
const norm = s => String(s == null ? "" : s).replace(/\s+/g, "").trim();

function hl(src) {
  const re = /("[^"]*"|'[^']*')|\b(for|in|if|else|elif|and|or|not|while)\b|\b(range|print)\b|(\b\d+\b)|(_{3,})/g;
  let out = "", last = 0, m;
  while ((m = re.exec(src))) {
    out += esc(src.slice(last, m.index));
    if (m[1]) out += '<span class="st">' + esc(m[1]) + "</span>";
    else if (m[2]) out += '<span class="kw">' + m[2] + "</span>";
    else if (m[3]) out += '<span class="fn">' + m[3] + "</span>";
    else if (m[4]) out += '<span class="nu">' + m[4] + "</span>";
    else if (m[5]) out += '<span class="blank" aria-label="빈칸">빈칸</span>';
    last = re.lastIndex;
  }
  return out + esc(src.slice(last));
}
function codeBlock(code, o = {}) {
  const body = o.lines
    ? code.split("\n").map((ln, i) => '<span class="ln" data-ln="' + i + '">' + (hl(ln) || " ") + "</span>").join("\n")
    : hl(code);
  return '<div class="code"' + (o.id ? ' id="' + o.id + '"' : "") + '><div class="code-head"><span>' + esc(o.label || "파이썬") + "</span>" + (o.right || labEnabled() ? '<span class="code-tools">' + (o.right ? "<span>" + esc(o.right) + "</span>" : "") + (labEnabled() ? '<button class="open-lab" data-act="lab-open-code" data-code="' + esc(code) + '">실습장에서 열기</button>' : "") + "</span>" : "") + "</div><pre translate=\"no\"><code>" + body + "</code></pre></div>";
}

/* ===== 설정과 상태 ===== */
const KEY = "jeongbo-lab-v1";
const DEFAULT_SETTINGS = {
  condition: "mate", coachChoice: false, answerFirst: true, blockPaste: true, proactive: true,
  turnCap: 30, engine: "live", tier: "quick", manipCheck: true,
  errors: { learn1: true, learn2: true, c1: false, c2: true, c3: false },
  harness: {
    coach: { key: true, hints: true, maxHint: 3, judge: true, textbook: 100, errors: false },
    mate: { key: false, hints: false, maxHint: 0, judge: false, textbook: 100, errors: true },
    memShort: 10, memLong: true
  }
};
let settings = Object.assign({}, DEFAULT_SETTINGS, load(KEY + ":settings-v2", {}));
settings.errors = Object.assign({}, DEFAULT_SETTINGS.errors, settings.errors || {});
settings.harness = (function (h) { h = h || {}; return { coach: Object.assign({}, DEFAULT_SETTINGS.harness.coach, h.coach || {}), mate: Object.assign({}, DEFAULT_SETTINGS.harness.mate, h.mate || {}), memShort: h.memShort != null ? h.memShort : 10, memLong: h.memLong !== false }; })(settings.harness);
function H(role) { return settings.harness[role || (S && S.condition) || "mate"]; }
let view = Object.assign({ size: "m", leading: "normal", theme: "auto", contrast: "normal", tts: false, paneW: 400, paneWide: false }, load(KEY + ":view", {}));
const hostTheme = document.documentElement.getAttribute("data-theme");
let S = null;
let drawerOpen = false, drawerTab = "settings", busy = false, ctl = null, lastPrompt = "", sheetOpen = false, modalState = null, lastFocus = null;

const CHECK_ITEMS = ITEMS.filter(i => i.stage === "check");
const FORM_ITEMS = ITEMS.filter(i => i.stage === "formative");
const itemById = id => ITEMS.find(i => i.id === id);
const optText = (it, id) => { if (!it) return ""; if (it.type === "short") return id == null ? "(답 없음)" : String(id); const o = it.options.find(x => x.id === id); return o ? o.text : "(답 없음)"; };
const isCorrect = (it, resp) => it.type === "short" ? it.accept.map(norm).includes(norm(resp)) : resp === it.answer;
const STAGE_NAME = { notice: "안내", choose: "에이전트 고르기", learn: "학습", check: "확인", formative: "형성평가", note: "오답 노트", done: "마침" };
const ORDER = ["learn", "check", "formative", "note"];

function pidOf(cls, no) { let h = 5381; const s = cls + "|" + no; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return "s-" + h.toString(36); }
function newSession(student) {
  return {
    v: 1, sessionId: uuid(), student, condition: settings.condition, coachChoice: settings.coachChoice,
    agentType: null, stage: "notice", seg: 0, segSeen: [0], segAt: null, checkIdx: 0, formIdx: 0, noteFocus: null,
    items: {}, hintLv: {}, activity: { a: "", b: "", c: "", attempts: [] }, think: "", thinkRevealed: false,
    lab: { start: 1, end: 5, step: 1 }, trace: 0, selfCheck: {}, formEstimate: null, formSubmitted: false, formFinishing: false,
    chat: [], turns: 0, proactiveDone: {}, mateErr: {}, stageTime: {}, logs: [],
    teacherCalls: 0, safetyFlags: 0, afApplied: 0, leakFlags: 0, chipUses: 0, typedUses: 0, manip: {},
    created: now(), updated: now()
  };
}
const sKey = st => KEY + ":s:" + st.key;
function persist() { if (!S) return; S.updated = now(); store(sKey(S.student), S); store(KEY + ":last", S.student); }
const rec = id => (S.items[id] = S.items[id] || { sel: null, attempts: [], conf: null, viewAt: null, firstSelAt: null, retry: null });
function saveSettings() { store(KEY + ":settings-v2", settings); }
function saveView() { store(KEY + ":view", view); }

/* ===== 학습 기록(xAPI 형식) =====
   확장 키와 행위자 주소의 xapi.example.org는 자리표시. 실제 구현 때 연구팀 주소로 바꾼다. */
const XAPI = { home: "https://xapi.example.org", ext: "https://xapi.example.org/ext/", act: "https://xapi.example.org/activities/" + LESSON.id + "/" };
const VERB = {
  launched: ["http://adlnet.gov/expapi/verbs/launched", "시작함"],
  resumed: ["http://adlnet.gov/expapi/verbs/resumed", "이어 함"],
  preferred: ["http://adlnet.gov/expapi/verbs/preferred", "고름"],
  experienced: ["http://adlnet.gov/expapi/verbs/experienced", "봄"],
  interacted: ["http://adlnet.gov/expapi/verbs/interacted", "조작함"],
  asked: ["http://adlnet.gov/expapi/verbs/asked", "물음"],
  responded: ["http://adlnet.gov/expapi/verbs/responded", "응답함"],
  answered: ["http://adlnet.gov/expapi/verbs/answered", "답함"],
  completed: ["http://adlnet.gov/expapi/verbs/completed", "마침"],
  commented: ["http://adlnet.gov/expapi/verbs/commented", "남김"]
};
const ACT_TYPE = {
  lesson: "http://adlnet.gov/expapi/activities/lesson", question: "http://adlnet.gov/expapi/activities/question",
  assessment: "http://adlnet.gov/expapi/activities/assessment", interaction: "http://adlnet.gov/expapi/activities/interaction",
  module: "http://adlnet.gov/expapi/activities/module"
};
function studentActor() { return { objectType: "Agent", account: { homePage: XAPI.home + "/students", name: S.student.pid } }; }
function agentActor() { return { objectType: "Agent", account: { homePage: XAPI.home + "/agents", name: S.condition === "coach" ? "learning-coach" : "learning-mate" } }; }
function log(verb, objId, objName, objType, result, ext, actor) {
  if (!S) return;
  const e = {};
  e[XAPI.ext + "condition"] = S.condition;
  e[XAPI.ext + "agent-type"] = S.agentType;
  e[XAPI.ext + "stage"] = S.stage;
  e[XAPI.ext + "agent-available"] = agentAvailable();
  e[XAPI.ext + "engine"] = engineNow();
  e[XAPI.ext + "standard"] = "9정03-06";
  if (ext) for (const k in ext) e[XAPI.ext + k] = ext[k];
  const st = {
    id: uuid(), actor: actor || studentActor(),
    verb: { id: VERB[verb][0], display: { "ko-KR": VERB[verb][1] } },
    object: { objectType: "Activity", id: XAPI.act + objId, definition: { name: { "ko-KR": objName }, type: ACT_TYPE[objType] || ACT_TYPE.interaction } },
    context: { registration: S.sessionId, extensions: e },
    timestamp: new Date().toISOString()
  };
  if (result) st.result = result;
  S.logs.push(st);
  persist();
  if (drawerOpen && (drawerTab === "logs" || drawerTab === "summary")) renderDrawer();
}

/* ===== 실행 환경(실시간 AI, 내려받기) ===== */
let sampleFn = null, sampleState = "pending", downloadsNs = null, runtimeResolve;
const runtimeReady = new Promise(r => { runtimeResolve = r; });
(async function initRuntime() {
  try {
    if (!window.claude || typeof window.claude.use !== "function") { sampleState = "none"; return; }
    try { sampleFn = await window.claude.use("sample"); } catch (e) { sampleFn = null; }
    sampleState = sampleFn ? "ready" : "none";
    try { downloadsNs = await window.claude.use("downloads"); } catch (e) { downloadsNs = null; }
  } finally {
    runtimeResolve();
    if (drawerOpen) renderDrawer();
    renderAgentStatus();
  }
})();
const inArtifact = () => !!(window.claude && typeof window.claude.use === "function");
/* 아티팩트 밖(내려받은 html 파일)에서는 브라우저 기본 내려받기로 저장한다. */
function localSave(filename, data) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function canSave() { return !!downloadsNs || !inArtifact(); }
function engineNow() { return settings.engine === "live" && sampleState === "ready" ? "live" : "script"; }
async function waitRuntime() { if (sampleState !== "pending") return; await Promise.race([runtimeReady, delay(11000)]); }

/* ===== 에이전트 신원 ===== */
function agentInfo() {
  if (!S) return null;
  if (S.condition === "coach") {
    if (S.coachChoice && S.agentType && S.agentType !== "coach") {
      const t = COACH_TYPES.find(x => x.id === S.agentType) || COACH_TYPES[0];
      return { role: "coach", mark: "코", name: "러닝코치", sub: t.name, type: t };
    }
    return { role: "coach", mark: "코", name: "러닝코치", sub: COACH_DEFAULT.short, type: Object.assign({ open: "" }, COACH_DEFAULT) };
  }
  const t = MATE_TYPES.find(x => x.id === S.agentType) || MATE_TYPES[1];
  return { role: "mate", mark: "메", name: "러닝메이트", sub: t.name, type: t };
}
function agentAvailable() { return !!(S && S.agentType && (S.stage === "learn" || S.stage === "check" || S.stage === "note")); }
function roleLine(info) {
  return info.role === "coach"
    ? "선생님 역할을 맡은 AI예요. AI도 틀릴 수 있어요."
    : "1학년 친구 역할을 맡은 AI예요. AI도 틀릴 수 있어요.";
}

/* ===== 화면 보기 설정 ===== */
function applyView() {
  const r = document.documentElement;
  r.setAttribute("data-size", view.size);
  r.setAttribute("data-leading", view.leading);
  if (view.contrast === "high") r.setAttribute("data-contrast", "high"); else r.removeAttribute("data-contrast");
  if (view.theme === "light" || view.theme === "dark") r.setAttribute("data-theme", view.theme);
  else if (hostTheme) r.setAttribute("data-theme", hostTheme); else r.removeAttribute("data-theme");
}
const canSpeak = () => "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance === "function";
function speak(text) {
  if (!canSpeak()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR"; u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch (e) { /* 읽기 실패는 조용히 넘김 */ }
}

/* ===== 알림 ===== */
function announce(msg) { const el = $("#srLive"); if (!el) return; el.textContent = ""; setTimeout(() => { el.textContent = msg; }, 30); }
let toastTimer = null;
function toast(msg) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}

/* ===== 단계 전환 ===== */
function enterStage(stage) {
  const prev = S.stage;
  if (prev && S.stageTime[prev] && !S.stageTime[prev].end) S.stageTime[prev].end = now();
  if (prev === "learn") closeSegTiming();
  S.stage = stage;
  if (!S.stageTime[stage]) S.stageTime[stage] = { start: now() };
  if (stage === "learn") S.segAt = now();
  if (stage === "check") { const it = CHECK_ITEMS[S.checkIdx]; const r = rec(it.id); if (!r.viewAt) r.viewAt = now(); }
  if (stage === "formative") { const it = FORM_ITEMS[S.formIdx]; const r = rec(it.id); if (!r.viewAt) r.viewAt = now(); }
  if (ORDER.includes(prev) && prev !== stage) log("completed", "stage/" + prev, STAGE_NAME[prev] + " 단계", "module", { duration: dur((S.stageTime[prev].end || now()) - S.stageTime[prev].start) });
  if (ORDER.includes(stage)) pushMsg("system", STAGE_NAME[stage] + " 시작", { quiet: true });
  if (stage === "done") pushMsg("system", "공부 마침", { quiet: true });
  persist();
  renderAll();
  announce(STAGE_NAME[stage] + " 화면으로 넘어왔어요.");
  focusMain();
}
function focusMain() { requestAnimationFrame(() => { const h = $("#lessonInner [data-focus]"); if (h) h.focus({ preventScroll: false }); window.scrollTo({ top: 0 }); }); }
function closeSegTiming() {
  if (!S.segAt) return;
  const seg = SEGMENTS[S.seg];
  log("experienced", "segment/" + seg.id, seg.label + " " + seg.title, "module", { duration: dur(now() - S.segAt) }, { "segment": seg.id });
  S.segAt = null;
}
function goSeg(i) {
  if (i < 0 || i >= SEGMENTS.length || i === S.seg) return;
  closeSegTiming();
  S.seg = i; S.segAt = now();
  if (!S.segSeen.includes(i)) S.segSeen.push(i);
  persist();
  renderLesson();
  const id = SEGMENTS[i].id;
  if (id === "learn1" || id === "learn2") proactive(id);
  focusMain();
}

/* ===== 렌더링: 뼈대 ===== */
function renderAll() { applyView(); renderSteps(); renderLesson(); renderAgent(); renderFab(); if (drawerOpen) renderDrawer(); }
function renderSteps() {
  const ol = $("#steps"); if (!ol) return;
  const cur = S ? ORDER.indexOf(S.stage) : -1;
  ol.innerHTML = LESSON.stages.map((st, i) => {
    const done = S && (S.stage === "done" || (cur > i));
    const isCur = S && S.stage === st.id;
    return '<li class="step' + (done ? " done" : "") + '"' + (isCur ? ' aria-current="step"' : "") + '><span class="num" aria-hidden="true">' + (i + 1) + "</span>" + st.name +
      (st.agent ? "" : '<span class="noai">AI 없음</span>') + (done ? '<span class="sr-only"> 완료</span>' : "") + "</li>";
  }).join("");
  $("#brandLesson").textContent = LESSON.title;
  const bn = $("#brandName"); if (bn) bn.textContent = LESSON.subject + " · " + LESSON.unit;
}
function renderLesson() {
  const el = $("#lessonInner"); if (!el) return;
  const sm = shellMode();
  el.dataset.stage = S ? (sm === "home" || sm === "hub" ? "home" : S.stage) : "cover";
  if (!S) { el.innerHTML = viewCover(); renderToc(); placeBar(); return; }
  if (sm === "home" || sm === "hub") { el.innerHTML = viewHome(); renderToc(); placeBar(); return; }
  S.lastStudyAt = now();
  if (review && !canReview(review.k)) review = null;
  const f = { notice: viewNotice, choose: viewChoose, learn: viewLearn, check: viewCheck, formative: viewFormative, note: viewNote, done: viewDone }[S.stage];
  const h1 = ["learn", "check", "formative", "note", "done"].includes(S.stage) ? '<h1 class="sr-only">' + esc(LESSON.title) + " " + STAGE_NAME[S.stage] + "</h1>" : "";
  let body = review ? viewReview() : f ? f() : "";
  if (labEnabled()) { const lab = viewLab(), at = body.lastIndexOf('<div class="pager"'); body = at >= 0 ? body.slice(0, at) + lab + body.slice(at) : body + lab; }
  el.innerHTML = h1 + body;
  renderToc(); placeBar();
  afterLessonRender();
}
function afterLessonRender() {
  if (!S) return;
  updateAgentCtx();
  const segI = review ? (review.k === "seg" ? review.i : -1) : (S.stage === "learn" ? S.seg : -1);
  if (segI >= 0) {
    const id = SEGMENTS[segI].id;
    if (id === "learn1") updateLab();
    if (id === "learn2") updateTrace();
  }
  if (settings.blockPaste) $$("[data-nopaste]").forEach(inp => inp.addEventListener("paste", ev => { ev.preventDefault(); toast("답안 칸에는 붙여넣기를 쓸 수 없어요. 직접 입력해 주세요."); log("interacted", "paste-blocked", "붙여넣기 막음", "interaction", null, { "field": inp.id }); }));
}

/* ===== 표지와 안내 ===== */
function flowList() {
  return '<ol class="flow">' + LESSON.stages.map(st => '<li><span class="fname">' + st.name + '</span><span class="fmin">약 ' + st.minutes + "분</span>" +
    '<span class="fai' + (st.agent ? "" : " off") + '">' + (st.agent ? "AI와 대화할 수 있어요" : "AI 없이 풀어요") + "</span></li>").join("") + "</ol>";
}
function viewCover() {
  const last = load(KEY + ":last", null);
  return '<div class="login"><form class="form login-card" id="entryForm" novalidate>' +
      '<h1 data-focus tabindex="-1">학습실 들어가기</h1><p class="small muted" style="margin:0">선생님이 알려 준 학급 코드와 번호를 넣으세요. 들어가면 선생님이 추가한 과목이 보여요.</p>' +
      '<label for="inClass">학급 코드<input id="inClass" name="cls" autocomplete="off" spellcheck="false" value="' + esc(last ? last.classCode : "1-3") + '" required></label>' +
      '<label for="inNo">번호<input id="inNo" name="no" inputmode="numeric" autocomplete="off" spellcheck="false" value="' + esc(last ? last.number : "12") + '" required></label>' +
      '<label for="inCode">확인 코드<input id="inCode" name="code" inputmode="numeric" autocomplete="off" spellcheck="false" value="4271"></label>' +
      '<button class="btn btn-primary" type="submit">들어가기</button>' +
      '<p class="small muted" id="entryMsg" style="margin:0">선생님이 나눠 준 카드에 적힌 코드를 넣으세요.</p>' +
    "</form></div>";
}
function viewNotice() {
  const coach = S.condition === "coach";
  const items = coach ? [
    "러닝코치는 선생님 역할을 맡은 AI예요. 사람이 아니에요.",
    "교과서와 정답지를 보고 힌트를 줘요. 내 생각을 먼저 말하면 거기서부터 도와줘요.",
    "AI도 틀릴 수 있어요. 이상하면 선생님께 물어보세요.",
    "형성평가를 푸는 동안에는 AI와 대화할 수 없어요.",
    "대화는 연구를 위해 기록돼요. 이름, 학번, 연락처는 쓰지 마세요."
  ] : [
    "러닝메이트는 1학년 친구 역할을 맡은 AI예요. 사람이 아니에요.",
    "정답지 없이 교과서만 보고 말해서 틀릴 때가 있어요. 틀린 곳을 찾으면 알려 주세요.",
    "틀리게 말한 부분은 마지막에 정답, 해설과 함께 다시 보여 줘요.",
    "형성평가를 푸는 동안에는 AI와 대화할 수 없어요.",
    "대화는 연구를 위해 기록돼요. 이름, 학번, 연락처는 쓰지 마세요."
  ];
  return '<section class="section-block">' +
    '<span class="act-label" data-kind="subject">시작하기 전에</span>' +
    '<h1 data-focus tabindex="-1">이것만 알고 시작해요</h1>' +
    '<ol class="notice-list">' + items.map(t => "<li>" + esc(t) + "</li>").join("") + "</ol>" +
    '<div class="row"><button class="btn btn-primary" data-act="notice-next">다음</button></div>' +
    "</section>";
}
function choiceCard(t, checked, name) {
  return '<label class="choice"><input type="radio" name="' + name + '" value="' + t.id + '"' + (checked ? " checked" : "") + ">" +
    '<span class="ava" aria-hidden="true">' + t.mark + "</span>" +
    '<span class="cname">' + esc(t.name) + "</span>" +
    '<span class="cdesc">' + esc(t.desc) + "</span>" +
    '<span class="csample">예: ' + esc(t.sample) + "</span></label>";
}
function viewChoose() {
  const coach = S.condition === "coach";
  if (coach && !S.coachChoice) {
    return '<section class="section-block">' +
      '<span class="act-label" data-kind="subject">함께할 AI</span>' +
      '<h1 data-focus tabindex="-1">오늘 함께할 코치</h1>' +
      '<div class="choice-grid" style="grid-template-columns:minmax(0,1fr)"><div class="choice" style="cursor:default">' +
        '<span class="ava" aria-hidden="true">' + COACH_DEFAULT.mark + '</span><span class="cname">' + COACH_DEFAULT.name + '</span><span class="cdesc">' + esc(COACH_DEFAULT.desc) + '</span><span class="csample">예: ' + esc(COACH_DEFAULT.sample) + "</span></div></div>" +
      '<p class="small muted">AI가 맡은 역할이에요.</p>' +
      '<div class="row"><button class="btn btn-primary" data-act="choose-start">시작하기</button></div></section>';
  }
  const list = coach ? COACH_TYPES : MATE_TYPES;
  const word = coach ? "코치" : "친구";
  return '<section class="section-block">' +
    '<span class="act-label" data-kind="subject">함께할 AI</span>' +
    '<h1 data-focus tabindex="-1">같이 공부할 ' + word + "를 골라요</h1>" +
    '<fieldset class="choice-grid"><legend class="sr-only">' + word + " 유형</legend>" + list.map(t => choiceCard(t, S.agentType === t.id, "agentType")).join("") + "</fieldset>" +
    '<p class="small muted">모두 AI가 맡은 역할이에요.</p>' +
    '<p class="small" id="chooseMsg" aria-live="polite"></p>' +
    '<div class="row"><button class="btn btn-primary" data-act="choose-start">이 ' + word + "와 시작하기</button></div></section>";
}

/* ===== 학습 단계 ===== */
function viewLearn() {
  const seg = SEGMENTS[S.seg];
  const nav = '<nav aria-label="학습 구간"><ul class="segnav">' + SEGMENTS.map((s, i) =>
    '<li><button data-act="seg-go" data-i="' + i + '"' + (i === S.seg ? ' aria-current="true"' : "") + (S.segSeen.includes(i) && i !== S.seg ? ' class="seen"' : "") + ">" + s.label + "</button></li>").join("") + "</ul></nav>";
  const head = '<div class="seg-head">' + actLabel(seg.id, seg.label) + '<h2 data-focus tabindex="-1" id="segTitle">' + seg.title + "</h2></div>";
  const speakBtn = view.tts && canSpeak() ? '<div><button class="btn btn-secondary btn-sm" data-act="speak-seg">이 부분 읽어 주기</button></div>' : "";
  const last = S.seg === SEGMENTS.length - 1;
  const pager = '<div class="pager">' + progBar(S.seg + 1, SEGMENTS.length) + '<button class="btn btn-secondary" data-act="seg-prev"' + (S.seg === 0 ? " disabled" : "") + '>이전</button><span class="count"><b>' + (S.seg + 1) + "</b> / " + SEGMENTS.length + " · " + esc(SEGMENTS[S.seg].label) + "</span>" +
    (last ? '<button class="btn btn-primary" data-act="to-check">확인 문항 풀기</button>' : '<button class="btn btn-primary" data-act="seg-next">다음</button>') + "</div>";
  return nav + '<section class="section-block" aria-labelledby="segTitle" id="segBody">' + head + speakBtn + segBody(seg.id) + "</section>" + pager;
}
function segBody(id) {
  if (id === "goal") {
    return '<dl class="std"><dt>성취기준</dt><dd>' + LESSON.standard.code + " " + LESSON.standard.text + "</dd><dt>근거</dt><dd>" + LESSON.standard.source + "</dd></dl>" +
      "<h3>학습 목표</h3><ol class=\"goal-list\">" + LESSON.goals.map(g => "<li><span>" + esc(g) + "</span></li>").join("") + "</ol>" +
      "<h3>오늘 공부 순서</h3>" + flowList();
  }
  if (id === "think") {
    return '<div class="prose"><p class="lead">친구들과 1부터 차례로 수를 말하는 놀이를 한다. 3의 배수 차례에는 수 대신 ‘짝’이라고 말한다.</p>' +
      "<p>1, 2, 짝, 4, 5, 짝. 30까지 한 번도 틀리지 않기는 생각보다 어렵다. 이 일을 컴퓨터에게 맡기려면 무엇을 알려 줘야 할까?</p></div>" +
      '<div class="note-box think"><h3 id="thinkLbl">컴퓨터에게 알려 줄 것 두 가지를 적어 보자.</h3>' +
      '<textarea id="thinkTa" class="ta" aria-labelledby="thinkLbl" placeholder="예: 수를 차례로 센다…">' + esc(S.think) + "</textarea>" +
      '<div class="row"><button class="btn btn-secondary btn-sm" data-act="think-reveal">예시 답 보기</button></div>' +
      '<div class="reveal" id="thinkReveal"' + (S.thinkRevealed ? "" : " hidden") + ' aria-live="polite">' +
        '<p class="prose-p">첫째, 1부터 30까지 수를 하나씩 센다. 같은 일을 되풀이하므로 <b>반복 구조</b>가 필요하다.</p>' +
        '<p class="prose-p">둘째, 지금 수가 3의 배수인지 확인해 ‘짝’과 수 가운데 하나를 말한다. 조건에 따라 할 일을 고르므로 <b>선택 구조</b>가 필요하다.</p>' +
        '<p class="prose-p">이번 시간에는 이 두 구조를 겹쳐 쓰는 방법을 배운다.</p></div></div>';
  }
  if (id === "learn1") {
    return '<div class="prose"><p>초등학교에서 ‘10번 반복하기’ 블록으로 같은 일을 여러 번 시켜 보았다. 파이썬에서는 <code class="inl" translate="no">for</code>와 <code class="inl" translate="no">range</code>로 반복을 만든다.</p></div>' +
      '<div class="bridge"><div class="blocks" role="group" aria-label="블록으로 나타낸 반복"><span class="cap">블록으로 보면</span>' +
        '<div class="blk"><div class="blk-head">i를 1부터 4까지 1씩 바꾸며 반복하기</div><div class="blk-body"><div class="blk-line">i 말하기</div></div></div></div>' +
        codeBlock("for i in range(1, 5):\n    print(i)", { label: "파이썬", right: "실행 결과: 1 2 3 4" }) + "</div>" +
      '<div class="prose"><p><code class="inl" translate="no">range(1, 5)</code>는 1부터 5 바로 앞의 수까지, 곧 1, 2, 3, 4를 차례로 만든다. i에는 이 수가 하나씩 들어가고, 그때마다 들여 쓴 줄이 실행된다. 그래서 <code class="inl" translate="no">print(i)</code>는 4번 실행된다.</p></div>' +
      '<div class="keypoint"><span class="kp-label">' + ic("star") + '기억해요</span><p><code class="inl" translate="no">range(시작, 끝)</code>에서 <b>끝값은 들어가지 않는다.</b> 세 번째 값을 쓰면 <code class="inl" translate="no">range(시작, 끝, 간격)</code>처럼 몇씩 건너뛸지 정할 수 있다.</p></div>' +
      '<div class="lab" id="rangeLab"><div class="lab-head"><h3>' + ic("lab") + 'range 실험실</h3><p class="lab-ask">시작값과 끝값을 바꿔 보자.</p></div>' +
        '<div class="fields">' +
          '<label class="field" for="labStart">시작값<input id="labStart" name="labStart" autocomplete="off" type="number" min="-10" max="30" value="' + S.lab.start + '"></label>' +
          '<label class="field" for="labEnd">끝값<input id="labEnd" name="labEnd" autocomplete="off" type="number" min="-10" max="31" value="' + S.lab.end + '"></label>' +
          '<label class="field" for="labStep">간격<input id="labStep" name="labStep" autocomplete="off" type="number" min="1" max="5" value="' + S.lab.step + '"></label>' +
        "</div>" +
        '<div class="inline-code-row" id="labCode" translate="no"></div>' +
        '<div class="tiles" id="labTiles"></div>' +
        '<p class="lab-out" id="labOut" aria-live="polite"></p></div>';
  }
  if (id === "learn2") {
    const code = 'for i in range(1, 16):\n    if i % 3 == 0:\n        print("짝")\n    else:\n        print(i)';
    return '<div class="prose"><p>반복할 때마다 조건을 확인하려면 <code class="inl" translate="no">for</code> 안에 <code class="inl" translate="no">if</code>를 넣는다. 3의 배수인지는 3으로 나눈 나머지가 0인지로 알 수 있다.</p>' +
      '<p>파이썬에서 나머지는 <code class="inl" translate="no">%</code>로 구한다. <code class="inl" translate="no">7 % 3</code>은 1, <code class="inl" translate="no">9 % 3</code>은 0이다.</p></div>' +
      '<div class="bridge"><div class="blocks" role="group" aria-label="블록으로 나타낸 반복 안의 조건"><span class="cap">블록으로 보면</span>' +
        '<div class="blk"><div class="blk-head">i를 1부터 15까지 1씩 바꾸며 반복하기</div><div class="blk-body">' +
          '<div class="blk"><div class="blk-head">만일 (i를 3으로 나눈 나머지) = 0 이라면</div><div class="blk-body"><div class="blk-line">‘짝’ 말하기</div></div>' +
          '<div class="blk-head">아니면</div><div class="blk-body"><div class="blk-line">i 말하기</div></div></div>' +
        "</div></div></div>" +
        codeBlock(code, { label: "파이썬", right: "들여쓰기가 구조를 나타내요", lines: true, id: "traceCode" }) + "</div>" +
      '<div class="prose"><p><code class="inl" translate="no">==</code>는 두 값이 같은지 비교한다. <code class="inl" translate="no">=</code> 하나는 변수에 값을 넣는 기호이므로 뜻이 다르다.</p>' +
      "<p>들여쓰기는 어느 구조 안에 들어 있는지를 나타낸다. if는 for 안에, print(\"짝\")은 if 안에 있다.</p></div>" +
      '<div class="keypoint"><span class="kp-label">' + ic("star") + '기억해요</span><p>제어 구조 안에 다른 제어 구조가 들어간 것을 <b>중첩 제어 구조</b>라고 한다.</p></div>' +
      '<div class="lab" id="traceLab"><div class="lab-head"><h3>' + ic("lab") + '한 번씩 따라가기</h3><p class="lab-ask">반복이 한 번 돌 때마다 무엇이 바뀌는지 살펴보자.</p></div>' +
        '<div class="row"><button class="btn btn-primary btn-sm" data-act="trace-step">한 번 반복하기</button><button class="btn btn-secondary btn-sm" data-act="trace-all">끝까지 실행</button><button class="btn btn-ghost btn-sm" data-act="trace-reset">처음으로</button></div>' +
        '<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">반복 회차별 값</caption><thead><tr><th scope="col">회차</th><th scope="col">i</th><th scope="col">i % 3</th><th scope="col">i % 3 == 0</th><th scope="col">출력</th></tr></thead><tbody id="traceBody"></tbody></table></div>' +
        '<div><div class="mini-h">출력</div><div class="tiles" id="traceOut"></div></div>' +
        '<p class="lab-out" id="traceMsg" aria-live="polite"></p></div>' +
      '<div class="note-box"><h3>더 알아보기</h3><p class="prose-p">조건 두 개를 함께 확인하려면 <code class="inl" translate="no">and</code>를 쓴다. <code class="inl" translate="no">i % 3 == 0 and i % 2 == 0</code>은 3의 배수이면서 짝수인 6, 12에서만 참이다. 둘 중 하나만 참이어도 되면 <code class="inl" translate="no">or</code>를 쓴다.</p></div>';
  }
  if (id === "activity") {
    const a = S.activity;
    return '<div class="prose"><p class="lead">1부터 20까지 세면서 4의 배수에서 ‘짝’을 출력하는 프로그램을 완성해 보자.</p><p>빈칸에 수를 넣고 실행해 결과를 확인한다.</p></div>' +
      '<div class="tpl" role="group" aria-label="빈칸이 있는 프로그램"><span class="kw">for</span> i <span class="kw">in</span> <span class="fn">range</span>(<input id="actA" name="actA" autocomplete="off" spellcheck="false" aria-label="시작값" inputmode="numeric" value="' + esc(a.a) + '">, <input id="actB" name="actB" autocomplete="off" spellcheck="false" aria-label="끝값" inputmode="numeric" value="' + esc(a.b) + '">):\n' +
        '    <span class="kw">if</span> i % <input id="actC" name="actC" autocomplete="off" spellcheck="false" aria-label="나누는 수" inputmode="numeric" value="' + esc(a.c) + '"> == 0:\n' +
        '        <span class="fn">print</span>(<span class="st">"짝"</span>)\n    <span class="kw">else</span>:\n        <span class="fn">print</span>(i)</div>' +
      '<div class="row"><button class="btn btn-primary btn-sm" data-act="act-run">실행하기</button><button class="btn btn-secondary btn-sm" data-act="act-target" aria-expanded="false" aria-controls="actTarget">목표 결과 보기</button></div>' +
      '<div id="actTarget" hidden><div class="mini-h">목표 결과</div><div class="tiles">' + runProgram(1, 21, 4).map(v => '<span class="tile' + (v === "짝" ? " hit" : "") + '">' + v + "</span>").join("") + "</div></div>" +
      '<div id="actOut" class="section-block" aria-live="polite"></div>';
  }
  if (id === "summary") {
    const qs = [
      ["sc1", "range(2, 7)이 만드는 수를 말할 수 있다."],
      ["sc2", "3의 배수인지 확인하는 조건을 쓸 수 있다."],
      ["sc3", "for 안에 if를 넣은 프로그램의 실행 결과를 따라갈 수 있다."]
    ];
    const lv = ["설명할 수 있어요", "조금 알 것 같아요", "아직 헷갈려요"];
    return '<ol class="goal-list">' +
      "<li><span><code class=\"inl\" translate=\"no\">range(시작, 끝)</code>은 시작값부터 끝값 바로 앞의 수까지를 차례로 만들어요.</span></li>" +
      "<li><span>for 안에 if를 넣으면 반복할 때마다 조건을 확인해 다르게 처리할 수 있어요. 이것을 중첩 제어 구조라고 해요.</span></li>" +
      "<li><span><code class=\"inl\" translate=\"no\">%</code>는 나머지를 구하고, <code class=\"inl\" translate=\"no\">==</code>는 두 값이 같은지 비교해요.</span></li></ol>" +
      '<div class="note-box"><h3>스스로 점검하기</h3>' + qs.map(q => '<fieldset class="conf"><legend>' + esc(q[1]) + "</legend>" +
        lv.map((l, i) => '<label><input type="radio" name="' + q[0] + '" value="' + i + '" data-self="' + q[0] + '"' + (S.selfCheck[q[0]] === i ? " checked" : "") + ">" + l + "</label>").join("") + "</fieldset>").join("") + "</div>";
  }
  return "";
}
function rangeList(a, b, s) { const out = []; if (!(s > 0)) return out; for (let i = a; i < b && out.length < 60; i += s) out.push(i); return out; }
function updateLab() {
  const st = +$("#labStart").value, en = +$("#labEnd").value, sp = +$("#labStep").value;
  S.lab = { start: isFinite(st) ? st : 1, end: isFinite(en) ? en : 5, step: isFinite(sp) ? sp : 1 };
  const { start, end, step } = S.lab;
  $("#labCode").textContent = "for i in range(" + start + ", " + end + (step !== 1 ? ", " + step : "") + "):";
  if (!(step >= 1)) { $("#labTiles").innerHTML = ""; $("#labOut").textContent = "간격은 1 이상으로 넣어 주세요."; return; }
  const list = rangeList(start, end, step);
  $("#labTiles").innerHTML = list.map(v => '<span class="tile">' + v + "</span>").join("") + (end > start && list.length ? '<span class="tile miss" title="끝값은 들어가지 않아요">' + end + " 없음</span>" : "");
  $("#labOut").textContent = list.length ? "만들어지는 수 " + list.length + "개, print(i)는 " + list.length + "번 실행돼요." : "만들어지는 수가 없어요. 시작값이 끝값보다 작아야 해요.";
}
let labLogTimer = null;
function labChanged() { updateLab(); persist(); clearTimeout(labLogTimer); labLogTimer = setTimeout(() => log("interacted", "range-lab", "range 실험실", "interaction", { response: "range(" + S.lab.start + ", " + S.lab.end + ", " + S.lab.step + ")" }), 800); }
function traceRows(n) {
  const rows = [];
  for (let k = 1; k <= n; k++) { const i = k; const r = i % 3; rows.push({ k, i, r, cond: r === 0, out: r === 0 ? "짝" : String(i) }); }
  return rows;
}
function updateTrace() {
  const n = S.trace, rows = traceRows(n);
  const body = $("#traceBody"); if (!body) return;
  body.innerHTML = rows.length ? rows.map((r, idx) => '<tr' + (idx === rows.length - 1 ? ' class="now"' : "") + "><td>" + r.k + (idx === rows.length - 1 ? '<span class="now-tag">지금</span>' : "") + '</td><td class="mono">' + r.i + '</td><td class="mono">' + r.r + "</td><td>" + (r.cond ? "참" : "거짓") + '</td><td class="mono">' + r.out + "</td></tr>").join("")
    : '<tr><td colspan="5" class="muted">‘한 번 반복하기’를 눌러 시작해 보세요.</td></tr>';
  $("#traceOut").innerHTML = rows.map(r => '<span class="tile' + (r.cond ? " hit" : "") + '">' + r.out + "</span>").join("");
  $$("#traceCode .ln").forEach(el => el.classList.remove("ln-on"));
  if (n > 0 && n <= 15) { const last = rows[rows.length - 1]; const ln = last.cond ? 2 : 4; const el = $('#traceCode .ln[data-ln="' + ln + '"]'); if (el) el.classList.add("ln-on"); }
  $("#traceMsg").textContent = n === 0 ? "" : n >= 15 ? "range(1, 16)은 1부터 15까지라서 반복이 15번으로 끝났어요." : "i가 " + n + "일 때 " + n + " % 3은 " + (n % 3) + "이라서 조건은 " + (n % 3 === 0 ? "참, '짝'을 출력해요." : "거짓, " + n + "을 출력해요.");
}
function runProgram(a, b, c) { const out = []; for (let i = a; i < b && out.length < 60; i++) out.push(i % c === 0 ? "짝" : String(i)); return out; }
function runActivity() {
  const a = S.activity;
  const A = parseInt(a.a, 10), B = parseInt(a.b, 10), C = parseInt(a.c, 10);
  const box = $("#actOut");
  let msg = "", ok = false, tiles = "";
  if ([A, B, C].some(v => isNaN(v))) msg = "빈칸 세 곳에 모두 수를 넣어 주세요.";
  else if (C === 0) msg = "0으로는 나눌 수 없어요. 파이썬에서도 오류가 나요. 나누는 수를 바꿔 보세요.";
  else if (B - A > 60) msg = "반복이 너무 많아요. 60번 이하가 되게 바꿔 보세요.";
  else {
    const out = runProgram(A, B, C);
    tiles = '<div class="tiles">' + out.map(v => '<span class="tile' + (v === "짝" ? " hit" : "") + '">' + v + "</span>").join("") + "</div>";
    const target = runProgram(1, 21, 4);
    ok = out.join(",") === target.join(",");
    if (!out.length) msg = "출력이 없어요. 시작값이 끝값보다 작아야 반복이 돌아요.";
    else if (ok) msg = "목표 결과와 같아요. 20에서도 '짝'이 나왔는지 확인해 보세요.";
    else if (A !== 1) msg = "처음에 나오는 수가 1이 아니에요. 시작값을 확인해 보세요.";
    else if (B === 20) msg = "19에서 멈췄어요. 20까지 세려면 끝값을 얼마로 해야 할까요?";
    else if (B !== 21) msg = "마지막에 나오는 수가 20이 아니에요. 끝값을 확인해 보세요.";
    else msg = "'짝'이 나오는 자리가 목표와 달라요. 4의 배수는 4로 나눈 나머지가 0인 수예요.";
  }
  a.attempts.push({ a: a.a, b: a.b, c: a.c, ok, t: now() });
  box.innerHTML = tiles + '<p class="status ' + (ok ? "ok" : "no") + '"><span class="dot" aria-hidden="true"></span><span><b>' + (ok ? "목표와 같아요" : "다시 해 봐요") + "</b> " + esc(msg) + "</span></p>";
  log("interacted", "activity/fill-run", "빈칸 채워 실행하기", "interaction", { success: ok, response: "range(" + a.a + ", " + a.b + "), % " + a.c }, { attempt: a.attempts.length });
  persist();
}

/* ===== 확인 문항 ===== */
function optionsHtml(it, r, locked, name) {
  if (it.type === "short") {
    return '<label class="field" for="short-' + it.id + '" style="color:var(--text-2)">답<input class="short-in" id="short-' + it.id + '" name="short-' + it.id + '" data-short="' + it.id + '" data-nopaste inputmode="numeric" autocomplete="off" spellcheck="false" value="' + esc(r.sel || "") + '"' + (locked ? " disabled" : "") + "></label>";
  }
  return '<fieldset class="opts"><legend class="sr-only">보기</legend>' + it.options.map(o => {
    const cls = locked && o.id === it.answer ? " correct" : "";
    return '<label class="opt' + cls + '"><input type="radio" name="' + name + '" value="' + o.id + '" data-opt="' + it.id + '"' + (r.sel === o.id ? " checked" : "") + (locked ? " disabled" : "") + '><span class="ot' + (/[가-힣]/.test(o.text) && !/[a-z]/.test(o.text) ? " ko" : "") + '">' + esc(o.text) + "</span></label>";
  }).join("") + "</fieldset>";
}
function checkDone(id) { const r = S.items[id]; if (!r) return false; return r.attempts.some(a => a.correct) || r.attempts.length >= 2; }
function viewCheck() {
  const it = CHECK_ITEMS[S.checkIdx], r = rec(it.id);
  const done = checkDone(it.id), last = r.attempts[r.attempts.length - 1];
  let fb = "";
  if (last) {
    if (last.correct) fb = '<p class="status ok"><span class="dot" aria-hidden="true"></span><span><b>정답이에요.</b> ' + esc(it.explain) + "</span></p>";
    else if (!done) fb = '<p class="status no"><span class="dot" aria-hidden="true"></span><span><b>다시 생각해 보세요.</b> 한 번 더 제출할 수 있어요.</span></p>';
    else fb = '<p class="status no"><span class="dot" aria-hidden="true"></span><span><b>정답은 ' + esc(optText(it, it.answer)) + "이에요.</b> " + esc(it.explain) + "</span></p>";
  }
  const allDone = CHECK_ITEMS.every(x => checkDone(x.id));
  const dots = '<div class="dots" role="group" aria-label="문항 이동">' + CHECK_ITEMS.map((x, i) => '<button data-act="check-go" data-i="' + i + '"' + (i === S.checkIdx ? ' aria-current="true"' : "") + (S.items[x.id] && S.items[x.id].attempts.length ? ' class="answered"' : "") + ' aria-label="확인 문항 ' + (i + 1) + '">' + (i + 1) + "</button>").join("") + "</div>";
  const lastIdx = S.checkIdx === CHECK_ITEMS.length - 1;
  return '<div class="seg-head">' + actLabel("check", "확인 문항") + '<h2 data-focus tabindex="-1">배운 내용 확인하기</h2></div>' + dots +
    '<section class="item" aria-label="확인 문항 ' + it.no + '">' +
      '<div class="item-meta"><span>문항 ' + it.no + " / " + CHECK_ITEMS.length + "</span><span>" + esc(it.kc) + "</span></div>" +
      codeBlock(it.code) + '<p class="q">' + esc(it.prompt) + "</p>" +
      optionsHtml(it, r, done, "opt-" + it.id) +
      '<div class="row"><button class="btn btn-primary" data-act="check-submit"' + (done ? " disabled" : "") + ">" + (r.attempts.length ? "다시 제출하기" : "제출하기") + "</button>" +
"</div>" +
      '<div class="explain" aria-live="polite"' + (fb ? "" : " hidden") + ">" + fb + "</div>" +
    "</section>" +
    '<div class="pager">' + progBar(S.checkIdx + 1, CHECK_ITEMS.length) + '<button class="btn btn-secondary" data-act="check-prev"' + (S.checkIdx === 0 ? " disabled" : "") + '>이전 문항</button><span class="count">확인 문항 <b>' + (S.checkIdx + 1) + "</b> / " + CHECK_ITEMS.length + "</span>" +
      (lastIdx ? '<button class="btn btn-primary" data-act="to-formative"' + (allDone ? "" : ' aria-disabled="true"') + ">형성평가 시작하기</button>" : '<button class="btn btn-primary" data-act="check-next">다음 문항</button>') + "</div>" +
    (lastIdx && !allDone ? '<p class="small muted" style="margin:0">세 문항을 다 풀면 형성평가로 넘어가요.</p>' : "");
}
function selectOpt(id, val) {
  const it = itemById(id), r = rec(id);
  const first = !r.firstSelAt;
  r.sel = val;
  if (first) r.firstSelAt = now();
  persist();
  log("interacted", "item/" + id + "/select", "보기 고름", "interaction", { response: optText(it, val) }, { "item": id, "first-select": first });
  if (first && it.stage === "check") proactive(id);
}
function submitCheck() {
  const it = CHECK_ITEMS[S.checkIdx], r = rec(it.id);
  if (checkDone(it.id)) return;
  if (!r.sel) { toast("보기를 하나 골라 주세요."); return; }
  const correct = isCorrect(it, r.sel);
  const t = now();
  r.attempts.push({ resp: r.sel, correct, t, sinceView: r.viewAt ? t - r.viewAt : null, askedBefore: agentTurnsOn(it.id) });
  log("answered", "item/" + it.id, "확인 문항 " + it.no, "question", { success: correct, response: optText(it, r.sel), duration: dur(r.viewAt ? t - r.viewAt : 0), extensions: { [XAPI.ext + "attempt"]: r.attempts.length } }, { "item": it.id, "agent-turns-on-item": agentTurnsOn(it.id) });
  persist();
  renderLesson();
  const ex = $(".explain"); if (ex) ex.focus && ex.setAttribute("tabindex", "-1");
  announce(correct ? "정답이에요." : (checkDone(it.id) ? "정답과 해설을 보여 줄게요." : "아직 아니에요. 한 번 더 풀 수 있어요."));
}
function agentTurnsOn(id) { return S.chat.filter(m => m.who === "student" && m.ctx === id).length; }
function goCheck(i) {
  if (i < 0 || i >= CHECK_ITEMS.length) return;
  S.checkIdx = i; const r = rec(CHECK_ITEMS[i].id); if (!r.viewAt) r.viewAt = now();
  persist(); renderLesson(); renderAgent(); focusMain();
}

/* ===== 형성평가 ===== */
function viewFormative() {
  if (S.formFinishing) {
    const unanswered = FORM_ITEMS.filter(x => !(S.items[x.id] && S.items[x.id].sel)).map(x => x.no);
    return '<div class="seg-head">' + actLabel("formative", "형성평가") + '<h2 data-focus tabindex="-1">제출하기 전에</h2></div>' +
      (unanswered.length ? '<p class="status no"><span class="dot" aria-hidden="true"></span><span><b>아직 안 푼 문항이 있어요.</b> ' + unanswered.join(", ") + "번 문항을 확인해 보세요. 그대로 제출해도 돼요.</span></p>" : "") +
      '<fieldset class="conf" style="border:0;padding:0;margin:0"><legend class="lg">5문항 가운데 몇 문항을 맞혔을 것 같나요?</legend>' +
      [0, 1, 2, 3, 4, 5].map(n => '<label><input type="radio" name="est" value="' + n + '" data-est' + (S.formEstimate === n ? " checked" : "") + ">" + n + "문항</label>").join("") + "</fieldset>" +
      '<div class="row"><button class="btn btn-secondary" data-act="form-back">문항으로 돌아가기</button><button class="btn btn-primary" data-act="form-submit">제출하기</button></div>';
  }
  const it = FORM_ITEMS[S.formIdx], r = rec(it.id);
  const dots = '<div class="dots" role="group" aria-label="문항 이동">' + FORM_ITEMS.map((x, i) => '<button data-act="form-go" data-i="' + i + '"' + (i === S.formIdx ? ' aria-current="true"' : "") + (S.items[x.id] && S.items[x.id].sel ? ' class="answered"' : "") + ' aria-label="형성평가 ' + (i + 1) + "번" + (S.items[x.id] && S.items[x.id].sel ? ", 답함" : "") + '">' + (i + 1) + "</button>").join("") + "</div>";
  const lastIdx = S.formIdx === FORM_ITEMS.length - 1;
  const conf = ["확실해요", "조금 헷갈려요", "찍었어요"];
  return '<div class="seg-head">' + actLabel("formative", "형성평가") + '<h2 data-focus tabindex="-1">혼자 풀어 보기</h2><p class="seg-sub">AI 없이 풀어요. 시간 제한은 없어요.</p></div>' + dots +
    '<section class="item" aria-label="형성평가 ' + it.no + '번">' +
      '<div class="item-meta"><span>문항 ' + it.no + " / " + FORM_ITEMS.length + "</span></div>" +
      codeBlock(it.code) + '<p class="q">' + esc(it.prompt) + "</p>" + optionsHtml(it, r, false, "fopt-" + it.id) +
      '<fieldset class="conf" style="border:0;padding:0;margin:0"><legend>얼마나 자신 있나요?</legend>' +
        conf.map((c, i) => '<label><input type="radio" name="conf-' + it.id + '" value="' + i + '" data-conf="' + it.id + '"' + (r.conf === i ? " checked" : "") + ">" + c + "</label>").join("") + "</fieldset>" +
    "</section>" +
    '<div class="pager">' + progBar(S.formIdx + 1, FORM_ITEMS.length) + '<button class="btn btn-secondary" data-act="form-prev"' + (S.formIdx === 0 ? " disabled" : "") + '>이전</button><span class="count">형성평가 <b>' + (S.formIdx + 1) + "</b> / " + FORM_ITEMS.length + "</span>" +
      (lastIdx ? '<button class="btn btn-primary" data-act="form-finish">다 풀었어요</button>' : '<button class="btn btn-primary" data-act="form-next">다음</button>') + "</div>";
}
function goForm(i) {
  if (i < 0 || i >= FORM_ITEMS.length) return;
  S.formIdx = i; const r = rec(FORM_ITEMS[i].id); if (!r.viewAt) r.viewAt = now();
  persist(); renderLesson(); focusMain();
}
function submitFormative() {
  const t = now();
  FORM_ITEMS.forEach(it => {
    const r = rec(it.id);
    const correct = r.sel != null && r.sel !== "" && isCorrect(it, r.sel);
    r.attempts = [{ resp: r.sel, correct, t, sinceView: r.viewAt ? t - r.viewAt : null, conf: r.conf }];
    log("answered", "item/" + it.id, "형성평가 " + it.no + "번", "question", { success: correct, response: r.sel == null ? "" : optText(it, r.sel), extensions: { [XAPI.ext + "confidence"]: r.conf == null ? null : ["확실해요", "조금 헷갈려요", "찍었어요"][r.conf] } }, { "item": it.id });
  });
  const score = FORM_ITEMS.filter(it => S.items[it.id].attempts[0].correct).length;
  S.formSubmitted = true; S.formFinishing = false;
  log("completed", "formative", "형성평가", "assessment", { score: { raw: score, min: 0, max: FORM_ITEMS.length, scaled: +(score / FORM_ITEMS.length).toFixed(2) }, completion: true, extensions: { [XAPI.ext + "self-estimate"]: S.formEstimate } });
  enterStage("note");
}

/* ===== 오답 노트 ===== */
function noteItems() {
  const list = [];
  FORM_ITEMS.forEach(it => { const r = S.items[it.id]; if (r && r.attempts.length && !r.attempts[0].correct) list.push({ it, from: "형성평가 " + it.no + "번", resp: r.attempts[0].resp }); });
  CHECK_ITEMS.forEach(it => { const r = S.items[it.id]; if (r && r.attempts.length && !r.attempts[0].correct) list.push({ it, from: "확인 문항 " + it.no + "번(처음 제출)", resp: r.attempts[0].resp }); });
  return list;
}
function viewNote() {
  const list = noteItems();
  const fs = FORM_ITEMS.filter(it => S.items[it.id] && S.items[it.id].attempts[0] && S.items[it.id].attempts[0].correct).length;
  const cs = CHECK_ITEMS.filter(it => S.items[it.id] && S.items[it.id].attempts[0] && S.items[it.id].attempts[0].correct).length;
  const cards = list.map(({ it, from, resp }) => {
    const r = rec(it.id), rt = r.retry;
    const why = (it.wrongWhy && (it.wrongWhy[resp] || it.wrongWhy._)) || "";
    let retry = "";
    if (rt && rt.open) {
      retry = '<div class="section-block retry-box"><div class="mini-h">다시 풀기</div>' + optionsHtml(it, { sel: rt.sel }, rt.done, "retry-" + it.id).replace(/data-opt=/g, "data-retry=").replace(/data-short=/g, "data-retry-short=") +
        '<div class="row"><button class="btn btn-primary btn-sm" data-act="note-retry-submit" data-id="' + it.id + '"' + (rt.done ? " disabled" : "") + ">제출하기</button></div>" +
        (rt.done ? '<p class="status ' + (rt.correct ? "ok" : "no") + '"><span class="dot" aria-hidden="true"></span><span><b>' + (rt.correct ? "이번에는 맞았어요." : "아직 달라요.") + "</b> " + (rt.correct ? "" : "해설을 다시 읽고 AI와 이야기해 보세요.") + "</span></p>" : "") + "</div>";
    }
    const badge = rt && rt.done ? (rt.correct ? '<span class="badge pass">통과</span>' : '<span class="badge retry">재도전</span>') : '<span class="badge">풀이 전</span>';
    return '<article class="note-item' + (S.noteFocus === it.id ? " focus" : "") + '" aria-label="' + esc(from) + '">' +
      '<div class="note-head">' + badge + "<span>" + esc(from) + '</span><span class="kc">' + esc(it.kc) + "</span></div>" +
      codeBlock(it.code) + '<p class="q">' + esc(it.prompt) + "</p>" +
      '<dl class="kv"><dt>내 답</dt><dd>' + esc(resp == null || resp === "" ? "(답하지 않음)" : optText(it, resp)) + "</dd><dt>정답</dt><dd>" + esc(optText(it, it.answer)) + "</dd><dt>해설</dt><dd>" + esc(it.explain) + "</dd>" + (why ? "<dt>생각해 볼 점</dt><dd>" + esc(why) + "</dd>" : "") + "</dl>" +
      '<div class="row"><button class="btn btn-secondary btn-sm" data-act="note-talk" data-id="' + it.id + '">AI와 이야기하기</button>' +
      (rt && rt.open ? "" : '<button class="btn btn-secondary btn-sm" data-act="note-retry" data-id="' + it.id + '">다시 풀기</button>') + "</div>" + retry + "</article>";
  }).join("");
  let fixes = "";
  if (S.condition === "mate") {
    const exp = Object.keys(S.mateErr).filter(k => S.mateErr[k].expressed && MATE_ERRORS[k]);
    fixes = exp.length ? '<div class="fixlist">' + exp.map(k => {
      const e = MATE_ERRORS[k], st = S.mateErr[k];
      return '<div class="fix"><p class="prose-p" style="margin:0"><b>러닝메이트가 한 말:</b> ' + esc(e.said) + "</p><p class=\"prose-p\" style=\"margin:0\"><b>바르게 고치면:</b> " + esc(e.fix) + "</p>" +
        '<fieldset class="conf"><legend>대화하면서 이 부분을 바로잡아 주었나요?</legend>' +
        ["예", "아니요", "잘 모르겠어요"].map((l, i) => '<label><input type="radio" name="rep-' + k + '" value="' + i + '" data-report="' + k + '"' + (st.reported === i ? " checked" : "") + ">" + l + "</label>").join("") + "</fieldset></div>";
    }).join("") + "</div>" : '<p class="prose-p muted" style="margin:0">오늘 러닝메이트가 틀리게 말한 부분은 기록되지 않았어요. AI 답이 이상했다면 선생님께 알려 주세요.</p>';
  } else {
    fixes = '<p class="prose-p muted" style="margin:0">오늘 러닝코치의 말 가운데 따로 바로잡을 부분은 기록되지 않았어요. AI 답이 이상했다면 선생님께 알려 주세요.</p>';
  }
  return '<div class="seg-head">' + actLabel("note", "오답 노트") + '<h2 data-focus tabindex="-1">다시 볼 문제</h2></div>' +
    '<dl class="score-row"><div><dt>형성평가</dt><dd><b>' + fs + "</b> / " + FORM_ITEMS.length + (S.formEstimate != null ? '<span class="muted"> (예상 ' + S.formEstimate + ")</span>" : "") + "</dd></div><div><dt>확인 문항 첫 제출</dt><dd><b>" + cs + "</b> / " + CHECK_ITEMS.length + "</dd></div><div><dt>다시 볼 문제</dt><dd><b>" + list.length + "</b>문항</dd></div></dl>" +
    (list.length ? '<div class="section-block">' + cards + "</div>" : '<div class="note-box"><h3>틀린 문제가 없어요</h3><p class="prose-p">오늘 배운 것을 AI에게 설명하며 정리해 보세요.</p></div>') +
    '<section class="note-box" aria-labelledby="fixTitle"><h3 id="fixTitle">AI가 한 말 다시 확인하기</h3>' + fixes + "</section>" +
    '<div class="pager"><span class="count">오답 노트</span><button class="btn btn-primary" data-act="to-done">마치기</button></div>';
}

/* ===== 마침 ===== */
function viewDone() {
  const fs = FORM_ITEMS.filter(it => S.items[it.id] && S.items[it.id].attempts[0] && S.items[it.id].attempts[0].correct).length;
  const retried = noteItems().filter(x => S.items[x.it.id].retry && S.items[x.it.id].retry.done);
  const fixed = retried.filter(x => S.items[x.it.id].retry.correct).length;
  const likert = ["전혀 아니다", "아니다", "보통이다", "그렇다", "매우 그렇다"];
  const q = [["m1", "이 AI는 나보다 잘 아는 것 같았다."], ["m2", "이 AI가 나를 평가한다고 느꼈다."]];
  return '<div class="seg-head">' + actLabel("summary", "학습 완료") + '<h2 data-focus tabindex="-1">오늘 공부를 마쳤어요</h2></div>' +
    '<ol class="goal-list"><li><span>학습 구간 ' + SEGMENTS.length + "개 가운데 " + S.segSeen.length + "개를 봤어요.</span></li>" +
    "<li><span>형성평가 " + FORM_ITEMS.length + "문항 가운데 " + fs + "문항을 맞혔어요.</span></li>" +
    "<li><span>오답 노트에서 " + retried.length + "문항을 다시 풀었고, 그 가운데 " + fixed + "문항을 맞혔어요.</span></li></ol>" +
    (settings.manipCheck ? '<section class="note-box" aria-labelledby="mTitle"><h3 id="mTitle">오늘 함께한 AI는 어땠나요?</h3>' +
      q.map(x => '<fieldset class="conf"><legend>' + esc(x[1]) + "</legend>" +
        likert.map((l, i) => '<label><input type="radio" name="' + x[0] + '" value="' + (i + 1) + '" data-manip="' + x[0] + '"' + (S.manip[x[0]] === i + 1 ? " checked" : "") + ">" + l + "</label>").join("") + "</fieldset>").join("") + "</section>" : "") +
    '<div class="row"><button class="btn btn-secondary" data-act="restart-ask">처음부터 다시 하기</button></div>';
}

/* ===== 에이전트 패널 ===== */
function renderAgent() {
  const el = $("#agent"); if (!el) return;
  const info = agentInfo();
  if (!S || !S.agentType || S.stage === "notice" || S.stage === "choose") {
    el.innerHTML = panelBar("AI 대화") + '<div class="agent-head"><span class="ava" aria-hidden="true">AI</span><div class="agent-id"><span class="agent-name">AI 대화창</span><span class="agent-role">차시를 시작하면 열려요</span></div>' + closeBtn() + "</div>" +
      '<div class="lock preview"><span class="lock-mark" aria-hidden="true">' + ic("chat") + '</span><p><b>차시를 시작하면 여기에서 AI와 이야기해요.</b></p>' +
      '<p class="small muted">이런 걸 물어볼 수 있어요.</p><div class="chips preview-chips" aria-hidden="true"><span class="chip">이게 무슨 뜻이야?</span><span class="chip">예시 하나만 더</span><span class="chip">내가 설명해 볼게</span></div>' +
      '<p class="caution">' + ic("info") + "AI도 틀릴 수 있어요. 이상하면 교과서로 확인해요.</p></div>";
    return;
  }
  const head = panelBar("AI 대화") + '<div class="agent-head"><span class="ava" aria-hidden="true">' + info.mark + '</span><div class="agent-id"><span class="agent-name">' + info.name + ' <span class="ai-badge">AI</span></span><span class="agent-role">' + esc(info.sub) + "</span></div>" + closeBtn() + "</div>" +
    '<div class="ai-line">' + roleLine(info) + (engineNow() === "script" ? '<span class="script-note">지금은 미리 쓴 대본으로 답해요. ' + (inArtifact() ? "연구자 보기 설정에서 실시간 AI를 켤 수 있어요." : "내려받은 파일에서는 실시간 AI를 쓸 수 없어요.") + "</span>" : "") + "</div>" +
    '<div class="ctx-line"><span>지금 보는 곳</span><b id="agentCtx">' + esc(ctxLabel()) + "</b></div>";
  if (S.stage === "formative") {
    el.innerHTML = head + '<div class="lock"><span class="lock-mark" aria-hidden="true"><svg width="18" height="20" viewBox="0 0 18 20" fill="none"><rect x="1.5" y="8.5" width="15" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M5 8.5V5.5a4 4 0 0 1 8 0v3" stroke="currentColor" stroke-width="1.5"/></svg></span>' +
      "<p>형성평가를 푸는 동안에는 " + info.name + "와 대화할 수 없어요. 평가가 끝나면 오답 노트에서 다시 이야기해요.</p></div>";
    return;
  }
  const msgs = '<div class="msgs" id="msgs" role="log" aria-live="polite" aria-label="대화 내용">' + S.chat.map(msgHtml).join("") + "</div>";
  if (S.stage === "done") { el.innerHTML = head + msgs + '<div class="composer"><p class="small muted" style="margin:0">오늘 대화는 여기까지예요.</p></div>'; scrollMsgs(); return; }
  const chips = CHIPS[S.stage] || [];
  const left = settings.turnCap - S.turns;
  el.innerHTML = head + msgs +
    '<div class="chips" role="group" aria-label="빠른 질문">' + chips.map(c => '<button class="chip" data-act="chip" data-intent="' + c.intent + '" data-label="' + esc(c.label) + '"' + (busy ? " disabled" : "") + ">" + c.label + "</button>").join("") + "</div>" +
    '<div class="composer"><div class="composer-row"><label class="sr-only" for="chatIn">' + info.name + "에게 보낼 메시지</label>" +
      '<textarea id="chatIn" rows="1" placeholder="' + (S.stage === "check" ? "먼저 네 생각을 적어 보세요…" : "궁금한 것을 적어 보세요…") + '"' + (busy ? " disabled" : "") + "></textarea>" +
      (busy && ctl ? '<button class="btn btn-secondary" data-act="stop">멈추기</button>' : '<button class="btn btn-primary" data-act="send"' + (busy ? " disabled" : "") + ">보내기</button>") + "</div>" +
      '<div class="composer-foot"><span id="agentStatus">' + statusText(left) + '</span><button class="linkbtn" data-act="teacher">선생님께 알리기</button></div></div>';
  scrollMsgs();
}
function ctxLabel() {
  if (!S) return "";
  if (S.stage === "learn") { const g = SEGMENTS[S.seg]; return g.label + " · " + g.title; }
  if (S.stage === "check") return "확인 문항 " + (S.checkIdx + 1) + " / " + CHECK_ITEMS.length;
  if (S.stage === "formative") return "형성평가";
  if (S.stage === "note") return S.noteFocus ? "오답 노트 · " + (itemById(S.noteFocus) ? itemById(S.noteFocus).kc : "") : "오답 노트";
  if (S.stage === "done") return "차시 완료";
  return STAGE_NAME[S.stage] || "";
}
function updateAgentCtx() { const c = $("#agentCtx"); if (c) c.textContent = ctxLabel(); }
function statusText(left) {
  const parts = ["이름, 학번은 쓰지 마세요."];
  if (left <= 3) parts.unshift("남은 대화 " + Math.max(0, left) + "번.");
  if (settings.engine === "live" && sampleState === "pending") parts.push("AI 연결 확인 중…");
  return parts.join(" ");
}
function renderAgentStatus() { const s = $("#agentStatus"); if (s && S) s.textContent = statusText(settings.turnCap - S.turns); }
function closeBtn() { return '<button class="btn btn-ghost btn-sm agent-close" data-act="agent-close" aria-label="대화창 닫기">닫기</button>'; }
function msgHtml(m) {
  if (m.who === "system") return '<div class="msg system" data-mid="' + m.id + '">' + esc(m.text) + "</div>";
  if (m.who === "student") return '<div class="msg student" data-mid="' + m.id + '"><div class="bubble">' + esc(m.text) + "</div></div>";
  const info = agentInfo();
  const tools = view.tts && canSpeak() && !m.pending ? '<div class="tools"><button class="linkbtn" data-act="speak-msg" data-mid="' + m.id + '">읽기</button></div>' : "";
  return '<div class="msg agent" data-mid="' + m.id + '"><span class="ava sm" aria-hidden="true">' + (info ? info.mark : "AI") + '</span><div><span class="sr-only">' + (info ? info.name : "AI") + ": </span>" +
    '<div class="bubble' + (m.pending && !m.text ? " thinking" : "") + '">' + (m.pending && !m.text ? '<span class="typing">생각하는 중…</span>' : esc(m.text)) + "</div>" +
    (m.caution && !m.pending && info ? '<p class="msg-note">' + ic("info") + info.name + "가 틀렸을 수도 있어요. 교과서로 확인해 보세요.</p>" : "") + tools + "</div></div>";
}
function scrollMsgs() { const b = $("#msgs"); if (!b) return; const notes = $$(".msg-note", b); notes.forEach((n, i) => n.classList.toggle("show", i === notes.length - 1)); b.scrollTop = b.scrollHeight; }
function pushMsg(who, text, extra) {
  const m = Object.assign({ id: uuid().slice(0, 8), who, text, t: now(), stage: S.stage, ctx: currentContext().id }, extra || {});
  S.chat.push(m);
  persist();
  if (!(extra && extra.quiet && !$("#msgs"))) {
    const box = $("#msgs");
    if (box) { box.insertAdjacentHTML("beforeend", msgHtml(m)); scrollMsgs(); }
  }
  return m;
}
function updateMsgText(m, text) {
  m.text = text;
  const b = $('[data-mid="' + m.id + '"] .bubble');
  if (b) { b.classList.remove("thinking"); b.textContent = text || ""; if (!text) b.innerHTML = '<span class="typing">생각하는 중…</span>'; }
  scrollMsgs();
}
function renderFab() {
  const fab = $("#agentFab"); if (!fab) return;
  const info = agentInfo();
  const show = !!(S && S.agentType && ORDER.concat(["done"]).includes(S.stage));
  fab.hidden = !show;
  if (!show) return;
  const full = S.stage === "formative" ? "AI 대화 잠김" : info.name + "와 대화" + (S.unread ? ", 새 메시지 " + S.unread + "개" : "");
  fab.innerHTML = S.stage === "formative" ? "AI 대화 잠김" : esc(info.name) + (S.unread ? '<span class="fab-badge" aria-hidden="true">' + S.unread + "</span>" : "");
  fab.setAttribute("aria-label", full);
  fab.setAttribute("aria-expanded", String(sheetOpen));
}
function setSheet(open) {
  sheetOpen = open;
  $("#agent").classList.toggle("open", open);
  renderFab();
  if (open) { const t = $("#chatIn"); if (t) setTimeout(() => t.focus(), 60); } else { const f = $("#agentFab"); if (f && !f.hidden) f.focus(); }
}
