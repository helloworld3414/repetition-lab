/* ===== 화면 틀(엘리스 AIDT 방식) =====
   로그인 뒤 '내 수업'(교사가 추가한 과목) 목록, 과목을 고르면 그 과목의 대시보드.
   대시보드 모드: 왼쪽 아이콘 줄 + 메뉴, 가운데 메인, 오른쪽 도구 줄과 도구 창.
   학습 모드: 어두운 위·아래 막대, 왼쪽 어두운 수업 목차, 오른쪽 도구 줄.
   상태 낱말은 미진행, 진행 중, 완료, 미열람, 미제출, 제출 완료, 미점검으로 통일한다.
   참고 명세: 프로젝트 문서 「AIDT 화면 코드화 명세」(엘리스 01~04, YBM 02 게시판). 반 평균 비교, 레벨·배지는 넣지 않는다. */
const GLOSSARY = [
  { id: "loop", term: "반복 구조", def: "같은 일을 여러 번 되풀이하는 구조이다.", seg: "think" },
  { id: "select", term: "선택 구조", def: "조건에 따라 할 일을 고르는 구조이다.", seg: "think" },
  { id: "nested", term: "중첩 제어 구조", def: "제어 구조 안에 다른 제어 구조가 들어간 것이다. for 안의 if가 그 예이다.", seg: "learn2" },
  { id: "for", term: "for", def: "정해진 범위의 값을 하나씩 바꾸며 들여 쓴 줄을 되풀이하는 명령이다.", seg: "learn1" },
  { id: "range", term: "range(시작, 끝, 간격)", def: "시작값부터 끝값 바로 앞의 수까지 간격만큼 건너뛰며 수를 만든다. 끝값은 들어가지 않는다.", seg: "learn1" },
  { id: "if", term: "if, else", def: "조건이 참이면 if 아래 줄을, 거짓이면 else 아래 줄을 실행한다.", seg: "learn2" },
  { id: "mod", term: "%", def: "나눗셈의 나머지를 구한다. 7 % 3은 1, 9 % 3은 0이다.", seg: "learn2" },
  { id: "eq", term: "==", def: "두 값이 같은지 비교한다. 변수에 값을 넣는 = 하나와 뜻이 다르다.", seg: "learn2" },
  { id: "indent", term: "들여쓰기", def: "줄 앞의 공백으로 어느 구조 안에 있는 명령인지 나타낸다. 파이썬은 보통 4칸을 쓴다.", seg: "learn2" }
];
/* 정보 과목 대단원(2022 개정 교육과정 정보 영역). 지금은 Ⅲ단원 1차시만 연다. */
const UNITS = [
  { no: "Ⅰ", title: "컴퓨팅 시스템", open: false },
  { no: "Ⅱ", title: "데이터", open: false },
  { no: "Ⅲ", title: "알고리즘과 프로그래밍", open: true },
  { no: "Ⅳ", title: "인공지능", open: false },
  { no: "Ⅴ", title: "디지털 문화", open: false }
];
const UNIT_NOW = "Ⅲ. 알고리즘과 프로그래밍";
const LESSON_NO = 1;
/* 교사가 추가한 과목. 시연용이라 이 브라우저에 저장하고, 연구자 보기의 '수업 관리'에서 더하거나 뺀다. */
const SEED_COURSES = [
  { id: "info", subject: "정보", classCode: "1-3", teacher: "김하늘", slots: [{ d: 2, p: 3 }, { d: 4, p: 5 }], content: "info", task: null, seed: true },
  { id: "math", subject: "수학", classCode: "1-3", teacher: "박서준", slots: [{ d: 1, p: 2 }, { d: 3, p: 1 }, { d: 5, p: 4 }], content: null, task: null, seed: true }
];
let COURSES = load(KEY + ":courses", null) || JSON.parse(JSON.stringify(SEED_COURSES));
function saveCourses() { store(KEY + ":courses", COURSES); }
let TPOSTS = load(KEY + ":tposts", []);
function saveTposts() { store(KEY + ":tposts", TPOSTS); }
/* 차시 계획: 수업 시간표의 n번째 수업에 n번째 차시를 맞춘다. 첫 수업은 오늘이거나 오늘 전 가장 가까운 수업 날. */
const PLAN = {
  info: [
    { unit: UNIT_NOW, no: 1, title: LESSON.title, open: true },
    { unit: UNIT_NOW, no: 2, title: "다음 차시", open: false }
  ]
};

/* ----- 게시판 씨앗 글: 교사 글(공지)과 우리반 담벼락 ----- */
function prng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function rnd01() { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; }
function shuffled(n, rand) { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor((rand || rnd01)() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function genLadder(n, rand) {
  const R = 8, rungs = [], r0 = rand || rnd01;
  for (let r = 0; r < R; r++) for (let c = 0; c < n - 1; c++) { if (rungs.some(x => x[0] === r && x[1] === c - 1)) continue; if (r0() < 0.42) rungs.push([r, c]); }
  for (let c = 0; c < n - 1; c++) if (!rungs.some(x => x[1] === c)) { const r = Math.floor(r0() * R); if (!rungs.some(x => x[0] === r && Math.abs(x[1] - c) === 1)) rungs.push([r, c]); }
  return { rows: R, rungs };
}
function isoDay(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
const SEED_TPOSTS = [
  { id: "t5", course: "info", type: "ladder", tag: "사다리타기", title: "이번 주 청소 구역 정하기", by: "교사", date: "2026-09-28", body: "모둠 이름을 눌러 사다리를 타 보세요. 결과는 모두 같게 나와요.",
    ladder: Object.assign({ players: ["1모둠", "2모둠", "3모둠", "4모둠", "5모둠", "6모둠"], results: ["교실 앞", "교실 뒤", "복도", "분리수거", "창틀", "쉬는 모둠"] }, genLadder(6, prng(7))) },
  { id: "t4", course: "info", type: "draw", tag: "제비뽑기", title: "오늘 발표할 모둠 뽑기", by: "교사", date: "2026-09-28", body: "활동해요 결과를 발표할 모둠 두 곳을 뽑았어요.",
    draw: { cands: ["1모둠", "2모둠", "3모둠", "4모둠", "5모둠", "6모둠"], n: 2, deal: [5, 2, 0, 3, 4, 1], flipped: [1, 4], at: "2026-09-28 13:05" } },
  { id: "t3", course: "info", type: "vote", tag: "투표", title: "다음 시간 실습 주제 고르기", by: "교사", date: "2026-09-27", body: "가장 많이 나온 주제로 실습해요.",
    vote: { opts: ["구구단 표 출력하기", "369 게임 만들기", "별 모양 찍기"], base: [6, 9, 4], multi: false, due: isoDay(new Date(Date.now() + 3 * 864e5)) } },
  { id: "t2", course: "info", type: "post", tag: "질문/답변", title: "range 끝값이 헷갈리면 여기에 물어보세요", by: "교사", date: "2026-09-25", body: "수업 중에 헷갈린 점을 담벼락에 남겨 주세요. 다음 시간에 같이 풀어 봐요." },
  { id: "t1", course: "info", type: "post", tag: "안내", title: "AI와 공부할 때 지킬 것", by: "교사", date: "2026-09-24", body: "먼저 내 생각을 말하고 AI에게 물어보세요. AI도 틀릴 수 있으니 교과서로 확인해요. 형성평가 중에는 AI를 쓸 수 없어요." }
];
const SEED_WALL = [
  { id: "w2", course: "info", type: "vote", tag: "투표", title: "다음 실습 때 짝 활동 할까요?", by: "친구", date: "2026-09-28", body: "", vote: { opts: ["짝과 같이", "혼자 하기"], base: [8, 5], multi: false, due: "" } },
  { id: "w1", course: "info", type: "post", tag: "자료 나눔", title: "range 끝값 기억하는 방법", by: "친구", date: "2026-09-27", body: "range(1, 5)는 손가락으로 1, 2, 3, 4까지만 세면 돼요. 5는 문 앞에서 멈춘다고 생각하면 편해요." }
];
const PAGES = [
  { id: "dash", label: "클래스 홈", icon: "home" },
  { id: "course", label: "학습 시작", icon: "learn" },
  { id: "task", label: "과제", icon: "formative" },
  { id: "record", label: "학습 현황", icon: "check" },
  { id: "board", label: "학급 게시판", icon: "board" },
  { id: "memo", label: "내 노트", icon: "activity" }
];
ICONS.home = '<path d="M4 10.5L12 4l8 6.5V20h-5.5v-6h-5v6H4z"/>';
ICONS.board = '<rect x="4" y="4.5" width="16" height="12" rx="1.5"/><path d="M8 20h8"/><path d="M12 16.5V20"/>';
ICONS.menu = '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>';
ICONS.close = '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>';
ICONS.arrow = '<path d="M9 6l6 6-6 6"/>';
ICONS.grid = '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>';
ICONS.clip = '<path d="M16.5 7.5l-7.8 7.8a2 2 0 0 0 2.8 2.8l8-8a4 4 0 0 0-5.6-5.6l-8 8a6 6 0 0 0 8.5 8.5l6.6-6.6"/>';
ICONS.cal = '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16"/><path d="M8.5 3.5v4"/><path d="M15.5 3.5v4"/>';
ICONS.book = '<path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16z"/><path d="M5 16a3 3 0 0 1 3-3h11"/>';
ICONS.pin = '<path d="M9 4h6l-1 5 3 3v2H7v-2l3-3z"/><path d="M12 14v6"/>';

let courseId = null, homeOpen = false, page = "dash", tocOpen = true, sideOpen = false, toolTab = null, boardView = null, coursePane = "list", review = null;

function shellMode() {
  if (!S) return "cover";
  if (!courseId || !course()) return "hub";
  if (homeOpen) return "home";
  return "lesson";
}
function course() { return COURSES.find(c => c.id === courseId) || null; }
function myCourses() { return S ? COURSES.filter(c => c.classCode === S.student.classCode) : []; }
function hasLesson(c) { return !!(c && c.content === "info"); }
const WK = ["일", "월", "화", "수", "목", "금", "토"];
const DFMT = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", weekday: "short" });
const HFMT = new Intl.DateTimeFormat("ko-KR", { hour: "numeric", minute: "2-digit" });
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function dayKey(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function slotsText(c) { return c.slots.length ? c.slots.slice().sort((a, b) => a.d - b.d || a.p - b.p).map(s => WK[s.d] + " " + s.p + "교시").join(", ") : "수업 시간 미정"; }
function sessions(c) {
  if (!c || !c.slots.length) return [];
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const slotOf = d => c.slots.filter(s => s.d === d.getDay()).sort((a, b) => a.p - b.p);
  const a = new Date(today);
  for (let i = 0; i < 14 && !slotOf(a).length; i++) a.setDate(a.getDate() - 1);
  const out = [], x = new Date(a);
  for (let i = 0; i < 70 && out.length < 12; i++) { slotOf(x).forEach(s => out.push({ date: new Date(x), p: s.p })); x.setDate(x.getDate() + 1); }
  return out;
}
function planOf(c) { return (c && PLAN[c.content]) || []; }
function lessonWhen(c, no) { const s = sessions(c)[no - 1]; return s ? DFMT.format(s.date) + " " + s.p + "교시" : ""; }

/* ----- 표시 조각: 차시 상자, 상태 칩 ----- */
function chipNo(no, dark) { return '<span class="chip-no' + (dark ? " dark" : "") + '">' + no + "차시</span>"; }
function stChip(kind, text) { return '<span class="st-chip st-' + kind + '">' + text + "</span>"; }
function lessonState() { return !started() ? ["none", "미진행"] : S.stage === "done" ? ["done", "완료"] : ["doing", "진행 중"]; }

function studyMinutes() {
  let ms = 0;
  Object.keys(S.stageTime || {}).forEach(k => { const t = S.stageTime[k]; if (t && t.start) ms += (t.end || now()) - t.start; });
  return Math.max(0, Math.round(ms / 60000));
}
function started() { return ORDER.includes(S.stage) || S.stage === "done"; }
function checksDone() { return CHECK_ITEMS.filter(x => checkDone(x.id)).length; }
function checksFirstRight() { return CHECK_ITEMS.filter(x => S.items[x.id] && S.items[x.id].attempts[0] && S.items[x.id].attempts[0].correct).length; }
function formScore() { return FORM_ITEMS.filter(x => S.items[x.id] && S.items[x.id].attempts[0] && S.items[x.id].attempts[0].correct).length; }
function formAnswered() { return FORM_ITEMS.filter(x => S.items[x.id] && S.items[x.id].sel).length; }
function lessonTotal() { return SEGMENTS.length + CHECK_ITEMS.length + FORM_ITEMS.length + 1; }
function lessonDone() { return (started() ? S.segSeen.length : 0) + checksDone() + (S.formSubmitted ? FORM_ITEMS.length : 0) + (S.stage === "done" ? 1 : 0); }
function overallProgress() { return Math.min(100, Math.round(100 * lessonDone() / lessonTotal())); }
function whereNow() {
  if (!started()) return "미진행";
  if (S.stage === "learn") return "학습 · " + SEGMENTS[S.seg].label;
  if (S.stage === "check") return "확인 문항 " + (S.checkIdx + 1) + "번";
  if (S.stage === "formative") return "형성평가 " + (S.formIdx + 1) + "번";
  if (S.stage === "note") return "오답 노트";
  return "학습 완료";
}
function ring(pct, size) {
  const r = 17, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
  return '<span class="ring" style="width:' + (size || 44) + "px;height:" + (size || 44) + 'px" role="img" aria-label="진도 ' + pct + '%"><svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="' + r + '" class="rg-bg"/><circle cx="20" cy="20" r="' + r + '" class="rg-fg" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><b aria-hidden="true">' + pct + "%</b></span>";
}
function pbarRow(pct) { return '<span class="lbar ' + (pct >= 100 ? "full" : pct > 0 ? "part" : "zero") + '" aria-hidden="true"><span style="width:' + pct + '%"></span></span>'; }
function kb(n) { return n < 1024 ? n + "B" : n < 1048576 ? Math.round(n / 1024) + "KB" : (n / 1048576).toFixed(1) + "MB"; }
function resumeLabel() { return S.stage === "done" ? "결과 보기" : started() ? "이어서 학습" : "학습 시작"; }
function emptyBox(t) { return '<p class="hempty">' + t + "</p>"; }

/* ----- 다시 보기 규칙: 이미 한 곳만 열고, 진도는 바꾸지 않는다. 형성평가 중에는 막는다. ----- */
function canReview(k) {
  const st = S.stage;
  if (!started() || st === "formative") return false;
  if (k === "seg") return st !== "learn";
  if (k === "check") return st === "note" || st === "done";
  if (k === "form") return !!S.formSubmitted && (st === "note" || st === "done");
  if (k === "note") return st === "done";
  return false;
}
function openReview(k, i) {
  if (!canReview(k)) return false;
  review = { k, i: i || 0 };
  log("experienced", "review/" + k + (k === "note" ? "" : "/" + review.i), "다시 보기", "module", null, { stage: S.stage });
  return true;
}
/* 단계별 진척: 대시보드, 학습 현황, 목차가 같이 쓴다. */
function stepRows() {
  const st = S.stage;
  const segDone = started() ? S.segSeen.length : 0, firstUnseen = SEGMENTS.findIndex((g, i) => !S.segSeen.includes(i));
  const rows = [
    { k: "학습 구간", rk: "seg", done: segDone, all: SEGMENTS.length, state: !started() || (st === "learn" && segDone === 0) ? (st === "learn" ? "doing" : "none") : st === "learn" ? "doing" : "done", ri: firstUnseen >= 0 ? firstUnseen : 0 },
    { k: "확인 문항", rk: "check", done: checksDone(), all: CHECK_ITEMS.length, state: st === "check" ? "doing" : ["formative", "note", "done"].includes(st) ? "done" : "none", ri: 0 },
    { k: "형성평가", rk: "form", done: S.formSubmitted ? FORM_ITEMS.length : (st === "formative" ? formAnswered() : 0), all: FORM_ITEMS.length, state: st === "formative" ? "doing" : S.formSubmitted ? "done" : "none", ri: 0 },
    { k: "오답 노트", rk: "note", done: st === "done" ? 1 : 0, all: 1, state: st === "note" ? "doing" : st === "done" ? "done" : "none", ri: 0 }
  ];
  rows.forEach(r => { r.skipped = r.rk === "seg" && r.state === "done" && r.done < r.all ? r.all - r.done : 0; });
  return rows;
}
function stepChip(r) {
  if (r.skipped) return stChip("warn", "미열람 " + r.skipped);
  return r.state === "done" ? stChip("done", "완료") : r.state === "doing" ? stChip("doing", "진행 중") : stChip("none", "미진행");
}

/* ----- 내 수업(과목 고르기) ----- */
function pageHub() {
  const list = myCourses(), today = new Date();
  const card = c => {
    const t = c.slots.filter(s => s.d === today.getDay()).sort((a, b) => a.p - b.p)[0];
    const pct = hasLesson(c) ? overallProgress() : null;
    return '<li><button class="hub-card" data-act="course-open" data-id="' + c.id + '">' +
      '<span class="hub-top"><span class="hub-ic" aria-hidden="true">' + ic(c.content === "info" ? "code" : "book") + "</span>" + (t ? '<span class="hub-today">오늘 ' + t.p + "교시</span>" : "") + "</span>" +
      '<span class="hub-b"><b class="hub-name">' + esc(c.subject) + '</b><span class="hub-meta">' + esc(c.classCode) + "반 · " + esc(c.teacher) + ' 선생님</span><span class="hub-meta">' + ic("cal") + esc(slotsText(c)) + "</span></span>" +
      '<span class="hub-f">' + (pct == null ? '<span class="muted">수업 자료 준비 중</span>' : "<span>진도 " + pct + "%</span>" + pbarRow(pct)) + "</span></button></li>";
  };
  return '<div class="page page-hub"><div class="hub-head"><h1 data-focus tabindex="-1">내 수업</h1><p>' + esc(S.student.classCode) + "반 " + esc(S.student.number) + "번 · 선생님이 추가한 과목이 여기에 보여요.</p></div>" +
    (list.length ? '<ul class="hub-grid">' + list.map(card).join("") + "</ul>"
      : '<div class="dcard">' + emptyBox("추가된 과목이 없어요. 선생님이 과목을 추가하면 여기에 보여요.") + "</div>") + "</div>";
}

/* ----- 과목 대시보드 ----- */
function dashHead(c) {
  return '<div class="dash-head"><span class="dh-k">' + esc(S.student.classCode) + "반 " + esc(S.student.number) + '번</span><h1 data-focus tabindex="-1">' + esc(c.subject) + '</h1><p class="dh-meta">' + esc(c.teacher) + " 선생님 · " + esc(slotsText(c)) + "</p></div>";
}
function taskBtn(c) {
  return c.task ? '<button class="btn btn-secondary" data-act="page" data-p="task">과제 제출하러 가기</button>'
    : '<button class="btn btn-secondary" disabled aria-describedby="noTask">과제 제출하러 가기</button><span class="small muted" id="noTask">등록된 과제 없음</span>';
}
function lastStudyLine() {
  if (!S.lastStudyAt || !started()) return '<div class="last-line"><span class="ll-k">마지막 학습</span><span>학습 기록 없음</span></div>';
  const d = new Date(S.lastStudyAt);
  return '<div class="last-line"><span class="ll-k">마지막 학습</span><span class="ll-v"><b>' + esc(DFMT.format(d)) + " " + esc(HFMT.format(d)) + "</b>" + chipNo(LESSON_NO) + esc(LESSON.title) + '<span class="ll-w">' + esc(whereNow()) + "</span></span></div>";
}
function todayCard(c) {
  const ss = sessions(c), pl = planOf(c), today = new Date();
  let idx = ss.findIndex(s => dayKey(s.date) === dayKey(today));
  const isToday = idx >= 0;
  if (!isToday) idx = ss.findIndex(s => s.date > today);
  const s = ss[idx], L = pl[idx];
  const kick = s ? (isToday ? "오늘 · " : "다음 수업 · ") + DFMT.format(s.date) + " " + s.p + "교시" : "수업 시간 미정";
  let body;
  if (!hasLesson(c)) body = '<b class="tc-title">수업 자료 준비 중</b><p class="tc-sub">선생님이 차시를 올리면 여기에 보여요.</p>';
  else if (L && L.open) {
    const pct = overallProgress(), ls = lessonState();
    body = '<span class="tc-unit">' + esc(L.unit) + '</span><div class="title-row">' + chipNo(L.no) + '<b class="tc-title">' + esc(L.title) + "</b>" + stChip(ls[0], ls[1]) + "</div>" +
      '<div class="tc-prog">' + pbarRow(pct) + "<span>" + pct + "% · " + esc(whereNow()) + "</span></div>";
  } else if (L) body = '<span class="tc-unit">' + esc(L.unit) + '</span><div class="title-row">' + chipNo(L.no) + '<b class="tc-title">' + esc(L.title) + "</b>" + stChip("none", "준비 중") + '</div><p class="tc-sub">열리면 여기서 바로 시작할 수 있어요. 지난 차시는 아래에서 이어서 할 수 있어요.</p>';
  else body = '<b class="tc-title">계획된 차시 없음</b>';
  const go = hasLesson(c) ? '<button class="btn btn-dark" id="goLesson" data-act="home-resume">' + resumeLabel() + "</button>" : '<button class="btn btn-dark" disabled>학습 시작</button>';
  return '<section class="dcard today-card" aria-labelledby="dToday"><h2 id="dToday" class="tc-k">' + ic("cal") + esc(kick) + "</h2>" + body +
    (hasLesson(c) ? lastStudyLine() : "") + '<div class="tc-acts">' + go + taskBtn(c) + "</div></section>";
}
function taskStateChip(t) {
  const sub = S.taskSubs && S.taskSubs[t.id], late = now() > new Date(t.due + "T23:59").getTime();
  return sub ? stChip("done", "제출 완료") : late ? stChip("warn", "기한 지남") : stChip("doing", "미제출");
}
function progressRowsHtml(withBtns) {
  return stepRows().map(r => {
    const p = Math.round(100 * r.done / r.all);
    let btn = '<span class="pg-sp"></span>';
    if (withBtns) {
      if (r.state === "doing") btn = '<button class="btn btn-sm btn-dark" data-act="home-resume">이어서 하기</button>';
      else if (r.state === "none" && r.rk === "seg" && !started()) btn = '<button class="btn btn-sm btn-dark" data-act="home-resume">시작하기</button>';
      else if (r.state === "done" && canReview(r.rk)) btn = '<button class="btn btn-sm btn-secondary" data-act="review-open" data-k="' + r.rk + '" data-i="' + r.ri + '">다시 보기</button>';
    }
    return '<li><span class="lr-t">' + r.k + "</span>" + pbarRow(p) + '<span class="lr-p">' + r.done + " / " + r.all + "</span>" + stepChip(r) + btn + "</li>";
  }).join("");
}
function progressCard(c) {
  if (!hasLesson(c)) return '<section class="dcard" aria-labelledby="dProg"><h2 id="dProg">학습 진척도</h2>' + emptyBox("등록된 차시가 없어요.") + "</section>";
  const t = c.task, sub = t && S.taskSubs && S.taskSubs[t.id], ls = lessonState();
  const taskRow = '<li><span class="lr-t">과제</span>' + (t ? '<span class="pg-task">' + esc(t.title) + " · 마감 " + esc(DFMT.format(new Date(t.due + "T00:00"))) + "</span>" + taskStateChip(t) + '<button class="btn btn-sm btn-secondary" data-act="page" data-p="task">' + (sub ? "제출물 보기" : "제출하기") + "</button>"
    : '<span class="pg-task muted">등록된 과제 없음</span>') + "</li>";
  return '<section class="dcard" aria-labelledby="dProg"><div class="dc-h"><h2 id="dProg">학습 진척도</h2><button class="linkbtn" data-act="page" data-p="record">자세히 보기</button></div>' +
    '<div class="pg-top">' + ring(overallProgress(), 52) + '<div><div class="title-row">' + chipNo(LESSON_NO) + "<b>" + esc(LESSON.title) + "</b>" + stChip(ls[0], ls[1]) + '</div><span class="small muted">완료한 단계는 다시 볼 수 있어요. 다시 봐도 진도는 그대로예요.</span></div></div>' +
    '<ol class="lesson-rows pg-rows">' + progressRowsHtml(true) + taskRow + "</ol></section>";
}
function calCard(c) {
  const d = new Date(), dow = d.getDay(), days = [];
  for (let i = 0; i < 7; i++) { const x = new Date(d); x.setDate(d.getDate() - dow + i); days.push(x); }
  const ss = sessions(c), pl = planOf(c);
  const start = new Date(days[0]); start.setHours(0, 0, 0, 0); const end = new Date(days[6]); end.setHours(23, 59, 59, 0);
  const wk = ss.map((s, i) => Object.assign({ i }, s)).filter(s => s.date >= start && s.date <= end);
  const has = x => c.slots.some(s => s.d === x.getDay());
  return '<section class="dcard" aria-labelledby="dCal"><div class="dc-h"><h2 id="dCal">수업 일정</h2></div><div class="cal-m">' + d.getFullYear() + "년 " + (d.getMonth() + 1) + '월</div><ol class="week">' +
    days.map((x, i) => '<li class="' + (i === dow ? "today" : "") + (has(x) ? " has" : "") + '"><span>' + WK[i] + "</span><b>" + x.getDate() + "</b>" + (has(x) ? '<span class="sr-only">수업 있음</span>' : "") + "</li>").join("") + "</ol>" +
    '<ul class="wk-list">' + (wk.length ? wk.map(s => { const L = pl[s.i]; return "<li><b>" + esc(DFMT.format(s.date)) + " " + s.p + '교시</b><span class="title-row">' + (L ? chipNo(L.no) + (L.open ? esc(L.title) : stChip("none", "준비 중")) : stChip("none", "계획 전")) + "</span></li>"; }).join("") : "<li><span>이번 주 수업 없음</span></li>") + "</ul></section>";
}
function boardMini() {
  const tp = teacherPosts().slice(0, 3), wall = wallPosts();
  const fresh = wall.filter(p => p.date === isoDay(new Date())).length;
  return '<section class="dcard" aria-labelledby="dBoard"><div class="dc-h"><h2 id="dBoard">학급 게시판</h2><button class="linkbtn" data-act="page" data-p="board">전체 보기</button></div>' +
    (tp.length ? '<ul class="mini-board">' + tp.map(p => '<li><button data-act="post-view" data-id="' + p.id + '"><span class="pt">' + stChip("notice", "공지") + "<b>" + esc(p.title) + '</b></span><span class="pd">' + esc(p.date.slice(5).replace("-", ".")) + "</span></button></li>").join("") + "</ul>" : emptyBox("등록된 공지가 없어요.")) +
    '<button class="wall-line" data-act="page" data-p="board"><span>우리반 담벼락</span><span>글 ' + wall.length + "개" + (fresh ? " · 오늘 " + fresh + "개" : "") + "</span></button>" +
    '<button class="board-new" data-act="post-write">+ 담벼락에 쓰기</button></section>';
}
function pageDash() {
  const c = course();
  return '<div class="page page-dash">' + dashHead(c) +
    '<div class="dash-grid"><div class="dash-main">' + todayCard(c) + progressCard(c) + "</div>" +
      '<div class="dash-side">' + calCard(c) + boardMini() + "</div></div></div>";
}
function recordBody() {
  const selfLv = ["설명할 수 있어요", "조금 알 것 같아요", "아직 헷갈려요"];
  const selfQ = [["sc1", "range(2, 7)이 만드는 수를 말할 수 있다."], ["sc2", "3의 배수인지 확인하는 조건을 쓸 수 있다."], ["sc3", "for 안에 if를 넣은 프로그램의 실행 결과를 따라갈 수 있다."]];
  return '<section class="dcard"><div class="title-row">' + chipNo(LESSON_NO) + "<h2>" + esc(LESSON.title) + '</h2></div><ol class="lesson-rows pg-rows">' + progressRowsHtml(true) + "</ol></section>" +
    '<section class="dcard"><h2>결과</h2><dl class="rec4"><div><dt>확인 문항 첫 제출</dt><dd>' + (checksDone() ? checksFirstRight() + " / " + CHECK_ITEMS.length : "-") + "</dd></div><div><dt>형성평가</dt><dd>" + (S.formSubmitted ? formScore() + " / " + FORM_ITEMS.length : "-") + "</dd></div><div><dt>다시 볼 문제</dt><dd>" + (S.formSubmitted ? noteItems().length + "문항" : "-") + "</dd></div><div><dt>공부한 시간</dt><dd>" + studyMinutes() + "분</dd></div></dl></section>" +
    '<section class="dcard"><h2>스스로 점검</h2><ul class="hself">' + selfQ.map(q => "<li><span>" + esc(q[1]) + "</span>" + (S.selfCheck[q[0]] == null ? stChip("none", "미점검") : '<b class="lv' + S.selfCheck[q[0]] + '">' + selfLv[S.selfCheck[q[0]]] + "</b>") + "</li>").join("") + "</ul>" +
    '<p class="small muted" style="margin:0">내 기록만 보여요. 다른 친구와 비교하지 않아요.</p></section>';
}
function pageCourse() {
  const c = course();
  const tabs = [["list", "수업 목록"], ["record", "학습 현황"], ["about", "과목 소개"]];
  const head = '<div class="course-head"><div><span class="muted small">' + esc(c.classCode) + "반 · " + esc(c.teacher) + ' 선생님</span><h1 data-focus tabindex="-1">' + esc(c.subject) + "</h1></div>" + (hasLesson(c) ? ring(overallProgress(), 56) : "") + "</div>";
  if (!hasLesson(c)) return '<div class="page page-course">' + head + '<div class="dcard">' + emptyBox("선생님이 수업 자료를 올리면 여기에 보여요.") + "</div></div>";
  const pct = overallProgress(), ls = lessonState();
  let body = "";
  if (coursePane === "list") {
    body = '<div class="list-h">대단원 ' + UNITS.length + "개 · 열린 차시 1개</div>" +
      UNITS.map((u, i) => {
        if (!u.open) return '<section class="unit"><div class="unit-h"><span class="u-no">' + ic("learn") + "0" + (i + 1) + '</span><h2 class="unit-t">' + u.no + ". " + u.title + "</h2>" + stChip("none", "준비 중") + "</div></section>";
        return '<section class="unit open"><div class="unit-h"><span class="u-no">' + ic("learn") + "0" + (i + 1) + '</span><h2 class="unit-t">' + u.no + ". " + u.title + "</h2>" + ring(pct, 40) + "</div>" +
          '<ol class="lesson-rows"><li>' + chipNo(1) + '<span class="lr-t">' + esc(LESSON.title) + '<span class="lr-when">' + esc(lessonWhen(c, 1)) + "</span></span>" + pbarRow(pct) + '<span class="lr-p">' + pct + "% (" + lessonDone() + "/" + lessonTotal() + ")</span>" + stChip(ls[0], ls[1]) + '<button class="btn btn-sm btn-dark" data-act="home-resume">' + (S.stage === "done" ? "결과 보기" : started() ? "이어서" : "학습하기") + "</button></li>" +
          '<li class="soon">' + chipNo(2) + '<span class="lr-t">다음 차시<span class="lr-when">' + esc(lessonWhen(c, 2)) + "</span></span>" + stChip("none", "준비 중") + "</li></ol></section>";
      }).join("");
  } else if (coursePane === "record") body = recordBody();
  else body = '<section class="dcard"><h2>성취기준</h2><dl class="std"><dt>성취기준</dt><dd>' + LESSON.standard.code + " " + LESSON.standard.text + "</dd><dt>근거</dt><dd>" + LESSON.standard.source + "</dd></dl>" +
    '<h3>학습 목표</h3><ol class="goal-list">' + LESSON.goals.map(g => "<li><span>" + esc(g) + "</span></li>").join("") + "</ol><h3>공부 순서</h3>" + flowList() + "</section>";
  return '<div class="page page-course">' + head +
    '<div class="ptabs" role="tablist" aria-label="학습 과목 보기">' + tabs.map(t => '<button role="tab" aria-selected="' + (coursePane === t[0]) + '" data-act="course-tab" data-v="' + t[0] + '">' + t[1] + "</button>").join("") + "</div>" +
    '<div class="course-body">' + body + "</div></div>";
}
function pageRecord() {
  const c = course();
  return '<div class="page"><h1 class="hello" data-focus tabindex="-1">학습 현황</h1><div class="stack">' + (hasLesson(c) ? recordBody() : '<div class="dcard">' + emptyBox("학습 기록이 없어요.") + "</div>") + "</div></div>";
}

/* ----- 파일 첨부(시연용: 1MB까지, 이 브라우저에만 저장) ----- */
const FILE_EXT = ["png", "jpg", "jpeg", "gif", "webp", "pdf", "txt", "csv", "docx", "pptx", "xlsx", "zip"];
const FILE_MAX = 1048576;
function fileField(id) {
  return '<div class="file-f"><span class="lb" id="' + id + 'Lb">파일 첨부 <span class="muted small">(쓰지 않아도 돼요)</span></span>' +
    '<span class="file-pick"><input type="file" class="sr-file" id="' + id + '" name="' + id + '" aria-labelledby="' + id + "Lb " + id + 'Btn" accept="' + FILE_EXT.map(e => "." + e).join(",") + '"><label for="' + id + '" class="btn btn-secondary btn-sm" id="' + id + 'Btn">' + ic("clip") + '파일 고르기</label><span class="file-name" id="' + id + 'Name" aria-live="polite">고른 파일 없음</span></span>' +
    '<p class="small muted" style="margin:0">그림, PDF, 문서 파일을 1MB까지 올릴 수 있어요. 얼굴이나 이름이 보이는 사진은 올리지 마세요.</p></div>';
}
function readFile(inp) {
  return new Promise((res, rej) => {
    const f = inp && inp.files && inp.files[0]; if (!f) { res(null); return; }
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    if (!FILE_EXT.includes(ext)) { rej(new Error("이 형식은 올릴 수 없어요. 그림, PDF, 문서 파일을 골라 주세요.")); return; }
    if (f.size > FILE_MAX) { rej(new Error("1MB보다 작은 파일만 올릴 수 있어요.")); return; }
    const r = new FileReader();
    r.onload = () => {
      const out = { name: f.name, size: f.size, type: f.type || "", data: r.result };
      if (/^image\//.test(f.type)) { const im = new Image(); im.onload = () => { out.w = im.naturalWidth; out.h = im.naturalHeight; res(out); }; im.onerror = () => res(out); im.src = r.result; }
      else res(out);
    };
    r.onerror = () => rej(new Error("파일을 읽지 못했어요."));
    r.readAsDataURL(f);
  });
}
function fileBlock(f, src) {
  if (!f) return "";
  const img = f.data && /^image\//.test(f.type) ? '<img class="att-img" src="' + f.data + '" alt="' + esc(f.name) + '"' + (f.w ? ' width="' + f.w + '" height="' + f.h + '"' : "") + ' loading="lazy">' : "";
  return '<div class="att">' + img + '<div class="att-row"><span class="att-ic" aria-hidden="true">' + ic("clip") + '</span><span class="att-n">' + esc(f.name) + '</span><span class="att-s">' + kb(f.size) + "</span>" +
    (f.data ? '<button class="btn btn-sm btn-secondary" data-act="file-dl" data-src="' + src + '">내려받기</button>' : '<span class="small muted">저장 공간이 부족해 파일 이름만 남았어요</span>') + "</div></div>";
}
async function dlFile(f) {
  if (!f || !f.data) return;
  const bin = atob(f.data.split(",")[1] || ""), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const blob = new Blob([u8], { type: f.type || "application/octet-stream" });
  if (downloadsNs) {
    try { await downloadsNs.save({ filename: f.name, data: blob }); toast("내려받기를 요청했어요."); }
    catch (e) { if (!(e && e.code === "declined")) toast("이 파일은 여기서 내려받을 수 없어요."); }
    return;
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = f.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function persistChecked() {
  S.updated = now();
  try { localStorage.setItem(sKey(S.student), JSON.stringify(S)); store(KEY + ":last", S.student); return true; } catch (e) { return false; }
}

/* ----- 학급 게시판: 위는 선생님 글(공지), 아래는 우리반 담벼락 ----- */
function teacherPosts() { return TPOSTS.filter(p => p.course === courseId).concat(SEED_TPOSTS.filter(p => p.course === courseId)); }
function wallPosts() { return (S.posts || []).filter(p => (p.course || "info") === courseId).concat(SEED_WALL.filter(p => p.course === courseId)); }
function postById(id) { return (S.posts || []).find(p => p.id === id) || TPOSTS.find(p => p.id === id) || SEED_TPOSTS.find(p => p.id === id) || SEED_WALL.find(p => p.id === id); }
function pstate(id) { S.postState = S.postState || {}; return S.postState[id] || (S.postState[id] = {}); }
function byName(p) { return p.by === "교사" ? (course() ? course().teacher + " 선생님" : "선생님") : p.by === "나" ? "나" : "우리반 친구"; }
const TYPE_NAME = { post: "글", vote: "투표", draw: "제비뽑기", ladder: "사다리타기" };
function typeChip(p) { return p.type === "post" ? stChip("tag", esc(p.tag || "글")) : stChip("type", TYPE_NAME[p.type]); }

/* 투표 */
function voteMine(p) { const st = S.postState && S.postState[p.id]; const m = st && st.my; return m == null ? null : Array.isArray(m) ? m : [m]; }
function voteClosed(p) { return !!(p.vote.due && now() > new Date(p.vote.due + "T23:59").getTime()); }
function voteBlock(p) {
  const my = voteMine(p), closed = voteClosed(p), v = p.vote, base = v.base || v.opts.map(() => 0);
  const meta = '<div class="game-meta">' + (closed ? stChip("none", "마감") : my ? stChip("done", "투표 완료") : stChip("doing", "투표 진행 중")) +
    (v.multi ? stChip("tag", "여러 개 선택") : stChip("tag", "하나만 선택")) + (v.due ? '<span class="small muted">마감 ' + esc(DFMT.format(new Date(v.due + "T00:00"))) + "</span>" : "") + '<span class="small muted">이름은 보이지 않아요</span></div>';
  if (!my && !closed) {
    const type = v.multi ? "checkbox" : "radio";
    return '<div class="game vote">' + meta + '<fieldset class="vote-f"><legend class="sr-only">' + (v.multi ? "고를 것을 모두 고르세요" : "하나를 고르세요") + "</legend>" +
      v.opts.map((o, i) => '<label class="vote-opt"><input type="' + type + '" name="vote-' + p.id + '" value="' + i + '"><span class="vo-mark" aria-hidden="true"></span><span class="vo-t">' + esc(o) + "</span></label>").join("") + "</fieldset>" +
      '<div class="row"><button class="btn btn-primary" data-act="vote-cast" data-id="' + p.id + '">투표하기</button></div></div>';
  }
  const counts = base.map((b, i) => b + (my && my.includes(i) ? 1 : 0)), people = base.reduce((a, b) => a + b, 0) + (my ? 1 : 0), top = Math.max.apply(null, counts);
  return '<div class="game vote">' + meta + '<p class="small muted" style="margin:0">' + people + '명 참여</p><ul class="vote-res">' + v.opts.map((o, i) => {
    const pc = Math.round(100 * counts[i] / (people || 1)), mine = my && my.includes(i);
    return '<li class="' + (mine ? "mine" : "") + (counts[i] === top && top > 0 ? " top" : "") + '"><span class="vr-t">' + esc(o) + (mine ? stChip("doing", "내 선택") : "") + '</span><span class="vr-bar" aria-hidden="true"><span style="width:' + pc + '%"></span></span><span class="vr-n">' + counts[i] + "명 · " + pc + "%</span></li>";
  }).join("") + "</ul>" + (closed ? "" : '<div class="row"><button class="btn btn-secondary btn-sm" data-act="vote-reset" data-id="' + p.id + '">다시 투표하기</button></div>') + "</div>";
}
/* 제비뽑기: 쪽지를 골라 펼친다. 쪽지와 후보의 짝은 글을 올릴 때 무작위로 정해 둔다. */
function drawState(p) { const st = pstate(p.id); if (!st.flipped) st.flipped = (p.draw.flipped || []).slice(); if (!st.deal) st.deal = (p.draw.deal || shuffled(p.draw.cands.length)).slice(); return st; }
function drawWinners(p) { const st = drawState(p); return st.flipped.slice(0, p.draw.n).map(s => p.draw.cands[st.deal[s]]); }
function drawBlock(p) {
  const st = drawState(p), n = p.draw.n, done = st.flipped.length >= n, mine = p.by === "나", playable = mine && !done;
  const status = done ? stChip("done", "뽑기 완료") : playable ? stChip("doing", "쪽지 " + (n - st.flipped.length) + "장 더 고르기") : stChip("none", "뽑기 전");
  const slips = p.draw.cands.map((_, s) => {
    const open = st.flipped.includes(s) || (done && st.all), win = st.flipped.indexOf(s) > -1 && st.flipped.indexOf(s) < n;
    const name = p.draw.cands[st.deal[s]];
    return '<li><button class="slip' + (open ? " open" : "") + (win ? " win" : "") + '" data-act="slip-pick" data-id="' + p.id + '" data-s="' + s + '"' + (playable && !open ? "" : " disabled") + ' aria-label="' + (open ? "쪽지 " + (s + 1) + ", " + esc(name) + (win ? ", 뽑힘" : "") : "쪽지 " + (s + 1) + " 펼치기") + '">' +
      '<span class="slip-in" aria-hidden="true"><span class="slip-back"><span class="slip-fold"></span><b>' + (s + 1) + '</b></span><span class="slip-front">' + (win ? '<span class="slip-tag">당첨</span>' : "") + "<b>" + (open ? esc(name) : "") + "</b></span></span></button></li>";
  }).join("");
  return '<div class="game draw" id="game-' + p.id + '"><div class="game-meta">' + status + '<span class="small muted">후보 ' + p.draw.cands.length + "개 가운데 " + n + "개</span></div>" +
    (playable && !st.flipped.length ? '<p class="game-help">쪽지를 섞은 뒤 ' + n + "장을 골라 펼쳐 보세요. 한 번 펼친 쪽지는 되돌릴 수 없어요.</p>" : "") +
    '<ul class="slips' + (st.shuffling ? " shuffling" : "") + '">' + slips + "</ul>" +
    (done ? '<p class="draw-r" aria-live="polite"><b>뽑힌 것</b>' + drawWinners(p).map(w => stChip("doing", esc(w))).join("") + '<span class="small muted">' + esc(p.draw.at || st.at || "") + "</span></p>" : "") +
    '<div class="row">' + (playable && !st.flipped.length ? '<button class="btn btn-secondary btn-sm" data-act="slip-shuffle" data-id="' + p.id + '">쪽지 섞기</button>' : "") +
      (done && !st.all ? '<button class="btn btn-secondary btn-sm" data-act="slip-all" data-id="' + p.id + '">나머지 쪽지도 펼쳐 보기</button>' : "") +
      (!mine && !done ? '<span class="small muted">글쓴이가 쪽지를 펼치면 결과가 보여요.</span>' : "") + "</div></div>";
}
/* 사다리타기: 사다리 모양은 글을 올릴 때 정해져서 누가 몇 번 타도 결과가 같다. */
const LAD_COL = ["#7353EA", "#2E7D32", "#B35C00", "#1E6FD9", "#C62828", "#00796B", "#6D4C41", "#546E7A"];
function ladderGeo(L) {
  const n = L.players.length, W = n * 100, H = 240, top = 8, bot = H - 8, step = (bot - top) / (L.rows + 1);
  const x = c => 50 + c * 100, y = r => top + (r + 1) * step;
  const has = (r, c) => L.rungs.some(q => q[0] === r && q[1] === c);
  const trace = start => { let c = start; const pts = [[x(c), top]]; for (let r = 0; r < L.rows; r++) { if (has(r, c)) { pts.push([x(c), y(r)], [x(c + 1), y(r)]); c++; } else if (c > 0 && has(r, c - 1)) { pts.push([x(c), y(r)], [x(c - 1), y(r)]); c--; } } pts.push([x(c), bot]); return { pts, end: c }; };
  return { n, W, H, top, bot, x, y, trace };
}
function ladderBlock(p) {
  const L = p.ladder, G = ladderGeo(L), st = pstate(p.id), shown = st.shown || [];
  const endOf = i => G.trace(i).end;
  const revealedAt = {}; shown.forEach(i => { revealedAt[endOf(i)] = i; });
  const cols = "repeat(" + G.n + ",minmax(0,1fr))";
  const svg = '<svg class="lad-svg" viewBox="0 0 ' + G.W + " " + G.H + '" aria-hidden="true">' +
    L.players.map((_, c) => '<line class="lad-v" x1="' + G.x(c) + '" y1="' + G.top + '" x2="' + G.x(c) + '" y2="' + G.bot + '"/>').join("") +
    L.rungs.map(q => '<line class="lad-h" x1="' + G.x(q[1]) + '" y1="' + G.y(q[0]) + '" x2="' + G.x(q[1] + 1) + '" y2="' + G.y(q[0]) + '"/>').join("") +
    '<g class="lad-paths">' + shown.map(i => '<polyline class="lad-path" points="' + G.trace(i).pts.map(a => a.join(",")).join(" ") + '" stroke="' + LAD_COL[i % LAD_COL.length] + '"/>').join("") + "</g></svg>";
  return '<div class="game ladder" id="game-' + p.id + '"><div class="game-meta">' + (shown.length === G.n ? stChip("done", "모두 확인") : stChip("doing", shown.length + " / " + G.n + " 확인")) + '<span class="small muted">이름을 누르면 사다리를 타요</span></div>' +
    '<div class="lad-wrap"><div class="lad-in" style="max-width:' + (G.n * 130) + 'px">' +
      '<div class="lad-top" style="grid-template-columns:' + cols + '">' + L.players.map((nm, i) => '<button class="lad-p' + (shown.includes(i) ? " done" : "") + '" data-act="lad-go" data-id="' + p.id + '" data-i="' + i + '" style="--c:' + LAD_COL[i % LAD_COL.length] + '"><span class="lad-dot" aria-hidden="true"></span>' + esc(nm) + "</button>").join("") + "</div>" +
      svg +
      '<div class="lad-bot" style="grid-template-columns:' + cols + '">' + L.results.map((r, c) => { const who = revealedAt[c]; return '<div class="lad-r' + (who != null ? " open" : "") + '" id="lr-' + p.id + "-" + c + '"' + (who != null ? ' style="--c:' + LAD_COL[who % LAD_COL.length] + '"' : "") + ">" + (who != null ? "<b>" + esc(r) + '</b><span class="small">' + esc(L.players[who]) + "</span>" : '<b aria-hidden="true">?</b><span class="sr-only">가려진 결과</span>') + "</div>"; }).join("") + "</div>" +
    "</div></div>" +
    (shown.length ? '<dl class="lad-list">' + shown.map(i => "<div><dt>" + esc(L.players[i]) + "</dt><dd>" + esc(L.results[endOf(i)]) + "</dd></div>").join("") + "</dl>" : "") +
    '<div class="row">' + (shown.length < G.n ? '<button class="btn btn-secondary btn-sm" data-act="lad-all" data-id="' + p.id + '">모두 타 보기</button>' : "") + (shown.length ? '<button class="btn btn-ghost btn-sm" data-act="lad-reset" data-id="' + p.id + '">처음 화면으로</button>' : "") + "</div></div>";
}
function ladderAnimate(p, i) {
  const G = ladderGeo(p.ladder), box = $("#game-" + p.id); if (!box) return;
  const g = $(".lad-paths", box), t = G.trace(i), ns = "http://www.w3.org/2000/svg";
  const old = $('.lad-path[data-i="' + i + '"]', box); if (old) old.remove();
  const el = document.createElementNS(ns, "polyline");
  el.setAttribute("class", "lad-path"); el.setAttribute("data-i", i); el.setAttribute("stroke", LAD_COL[i % LAD_COL.length]);
  el.setAttribute("points", t.pts.map(a => a.join(",")).join(" "));
  g.appendChild(el);
  const len = el.getTotalLength(), ms = reduceMotion() ? 0 : 1300;
  el.style.strokeDasharray = len; el.style.strokeDashoffset = len;
  requestAnimationFrame(() => { el.style.transition = ms ? "stroke-dashoffset " + ms + "ms linear" : "none"; el.style.strokeDashoffset = 0; });
  return new Promise(res => setTimeout(res, ms + 60));
}
function wallCard(p) {
  const extra = p.type === "vote" ? '<span class="wc-x">' + ((p.vote.base || []).reduce((a, b) => a + b, 0) + (voteMine(p) ? 1 : 0)) + "명 참여</span>" :
    p.type === "draw" ? '<span class="wc-x">' + (drawState(p).flipped.length >= p.draw.n ? "뽑기 완료" : "뽑기 전") + "</span>" :
    p.type === "ladder" ? '<span class="wc-x">' + p.ladder.players.length + "명 참여</span>" : "";
  const thumb = p.file && p.file.data && /^image\//.test(p.file.type) ? '<img class="wc-img" src="' + p.file.data + '" alt=""' + (p.file.w ? ' width="' + p.file.w + '" height="' + p.file.h + '"' : "") + ' loading="lazy">' : "";
  return '<li><button class="wall-card' + (p.by === "나" ? " mine" : "") + '" data-act="post-view" data-id="' + p.id + '">' + '<span class="wc-h">' + typeChip(p) + (p.file ? '<span class="clip" aria-label="파일 있음" role="img">' + ic("clip") + "</span>" : "") + "</span>" +
    thumb + '<b class="wc-t">' + esc(p.title) + "</b>" + (p.body ? '<span class="wc-b">' + esc(p.body) + "</span>" : "") +
    '<span class="wc-f"><span>' + byName(p) + "</span><span>" + esc(p.date.slice(5).replace("-", ".")) + "</span>" + extra + "</span></button></li>";
}
function writeForm() {
  const types = [["post", "글"], ["vote", "투표"], ["draw", "제비뽑기"], ["ladder", "사다리타기"]];
  return '<div class="page page-board"><h1 class="board-title" data-focus tabindex="-1">담벼락에 쓰기</h1><form class="post-form" id="postForm" novalidate>' +
    '<fieldset class="ptype"><legend>종류</legend>' + types.map((t, i) => '<label><input type="radio" name="pType" value="' + t[0] + '"' + (i ? "" : " checked") + "><span>" + t[1] + "</span></label>").join("") + "</fieldset>" +
    '<div class="pf-row"><label for="pTag" data-for="post">말머리<select id="pTag" name="pTag"><option>질문/답변</option><option>자료 나눔</option><option>자유</option></select></label>' +
    '<label for="pTitle" class="grow">제목<input id="pTitle" name="pTitle" autocomplete="off" maxlength="60" required></label></div>' +
    '<label for="pBody"><span class="lb">내용 <span class="muted small" data-for="vote draw ladder" hidden>(쓰지 않아도 돼요)</span></span><textarea class="ta" id="pBody" name="pBody" rows="5" maxlength="1000"></textarea></label>' +
    '<fieldset class="pf-opts" data-for="vote" hidden><legend>선택지 <span class="muted small">(2개 이상)</span></legend>' + [0, 1, 2, 3, 4].map(i => '<label class="sr-only" for="pOpt' + i + '">선택지 ' + (i + 1) + '</label><input id="pOpt' + i + '" name="pOpt' + i + '" autocomplete="off" maxlength="40" placeholder="선택지 ' + (i + 1) + '…">').join("") +
      '<div class="pf-row"><label class="check-l" for="pMulti"><input type="checkbox" id="pMulti" name="pMulti"><span>여러 개 고를 수 있게</span></label><label for="pDue">마감일 <span class="muted small">(쓰지 않아도 돼요)</span><input type="date" id="pDue" name="pDue" autocomplete="off"></label></div></fieldset>' +
    '<div class="pf-row" data-for="draw" hidden><label for="pCands" class="grow"><span class="lb">후보 <span class="muted small">(한 줄에 하나씩)</span></span><textarea class="ta" id="pCands" name="pCands" rows="4" placeholder="1모둠&#10;2모둠&#10;3모둠…"></textarea></label>' +
      '<label for="pN">뽑을 수<input id="pN" name="pN" type="number" inputmode="numeric" min="1" max="10" value="1" autocomplete="off"></label></div>' +
    '<div class="pf-row" data-for="ladder" hidden><label for="pPlayers" class="grow"><span class="lb">참가 <span class="muted small">(한 줄에 하나씩, 2~8개)</span></span><textarea class="ta" id="pPlayers" name="pPlayers" rows="4" placeholder="1모둠&#10;2모둠&#10;3모둠…"></textarea></label>' +
      '<label for="pResults" class="grow"><span class="lb">결과 <span class="muted small">(모자라면 \'통과\'로 채워요)</span></span><textarea class="ta" id="pResults" name="pResults" rows="4" placeholder="발표&#10;기록&#10;통과…"></textarea></label></div>' +
    fileField("pFile") +
    '<p class="small muted" style="margin:0">담벼락 글은 우리 반 친구들에게 보여요. 이름, 학번, 연락처는 쓰지 마세요. 시연용이라 이 브라우저에만 저장돼요.</p>' +
    '<p class="form-err" id="postErr" role="alert"></p>' +
    '<div class="row" style="justify-content:flex-end"><button type="button" class="btn btn-secondary" data-act="board-list">취소</button><button class="btn btn-primary" type="submit">올리기</button></div></form></div>';
}
function pageBoard() {
  if (boardView === "write") return writeForm();
  if (boardView) {
    const p = postById(boardView);
    if (p) {
      const teacher = p.by === "교사";
      return '<div class="page page-board"><article class="post"><div class="post-tags">' + (teacher ? stChip("notice", "공지") : stChip("tag", "우리반 담벼락")) + typeChip(p) + '</div><h1 data-focus tabindex="-1"' + (teacher ? ' class="is-notice"' : "") + ">" + esc(p.title) + '</h1><div class="post-meta">' + byName(p) + " · " + esc(p.date) + "</div>" +
        (p.body ? '<p class="post-body">' + esc(p.body) + "</p>" : "") + (p.type === "vote" ? voteBlock(p) : "") + (p.type === "draw" ? drawBlock(p) : "") + (p.type === "ladder" ? ladderBlock(p) : "") + fileBlock(p.file, "post:" + p.id) + "</article>" +
        '<div class="row"><button class="btn btn-secondary" data-act="board-list">목록으로</button>' + (p.by === "나" ? '<button class="btn btn-ghost" data-act="post-del" data-id="' + p.id + '">지우기</button>' : "") + "</div></div>";
    }
  }
  const tp = teacherPosts(), wall = wallPosts();
  return '<div class="page page-board"><h1 class="board-title" data-focus tabindex="-1">학급 게시판</h1>' +
    '<section aria-labelledby="bNotice"><div class="bsec-h"><h2 id="bNotice">선생님 글</h2><span class="board-count">총 ' + tp.length + "개</span></div>" +
    '<div class="board-tbl"><table class="tbl"><caption class="sr-only">선생님 글 목록</caption><thead><tr><th scope="col">번호</th><th scope="col">제목</th><th scope="col">작성자</th><th scope="col">등록일</th></tr></thead><tbody>' +
      (tp.length ? tp.map((p, i) => "<tr><td>" + (tp.length - i) + '</td><td><button class="post-link is-notice" data-act="post-view" data-id="' + p.id + '">' + stChip("notice", "공지") + (p.type !== "post" ? stChip("type", TYPE_NAME[p.type]) : "") + "<b>" + esc(p.title) + "</b></button>" + (p.file ? '<span class="clip" role="img" aria-label="파일 있음">' + ic("clip") + "</span>" : "") + "</td><td>" + byName(p) + '</td><td class="mono">' + esc(p.date) + "</td></tr>").join("")
        : '<tr><td colspan="4">등록된 글이 없어요.</td></tr>') + "</tbody></table></div></section>" +
    '<section class="wall" aria-labelledby="bWall"><div class="bsec-h"><div><h2 id="bWall">우리반 담벼락</h2><p class="small muted" style="margin:2px 0 0">친구들과 생각, 자료, 투표, 뽑기를 나누는 곳이에요.</p></div><button class="btn btn-primary btn-sm" data-act="post-write">담벼락에 쓰기 ' + ic("activity") + "</button></div>" +
      (wall.length ? '<ul class="wall-grid">' + wall.map(wallCard).join("") + "</ul>" : emptyBox("담벼락에 올라온 글이 없어요.")) + "</section></div>";
}

/* ----- 과제 ----- */
function pageTask() {
  const c = course(), t = c.task;
  if (!t) return '<div class="page"><h1 class="hello" data-focus tabindex="-1">과제</h1><div class="dcard">' + emptyBox("등록된 과제가 없어요. 선생님이 과제를 내면 여기에 보여요.") + "</div></div>";
  S.taskSubs = S.taskSubs || {};
  const sub = S.taskSubs[t.id];
  return '<div class="page"><h1 class="hello" data-focus tabindex="-1">과제</h1><div class="stack">' +
    '<section class="dcard"><div class="dc-h"><span class="tc-unit">' + esc(c.subject) + " · " + esc(c.teacher) + " 선생님</span>" + taskStateChip(t) + "</div><h2>" + esc(t.title) + '</h2><p class="task-body">' + esc(t.body) + "</p>" +
      '<p class="small" style="margin:0">마감 <b>' + esc(DFMT.format(new Date(t.due + "T00:00"))) + "</b></p></section>" +
    (sub ? '<section class="dcard"><div class="dc-h"><h2>제출한 내용</h2><span class="small muted">' + esc(DFMT.format(new Date(sub.t))) + " " + esc(HFMT.format(new Date(sub.t))) + "</span></div>" + (sub.text ? '<p class="task-body task-sub" translate="no">' + esc(sub.text) + "</p>" : "") + fileBlock(sub.file, "task:" + t.id) + "</section>" : "") +
    '<section class="dcard"><h2>' + (sub ? "다시 제출하기" : "제출하기") + '</h2><form class="post-form" id="taskForm" novalidate><label for="kText">답<textarea class="ta ta-code" id="kText" name="kText" spellcheck="false" rows="6" maxlength="3000" placeholder="코드나 답을 적어요…">' + (sub ? esc(sub.text) : "") + "</textarea></label>" + fileField("kFile") +
      '<p class="form-err" id="taskErr" role="alert"></p><div class="row" style="justify-content:flex-end"><button class="btn btn-primary" type="submit">' + (sub ? "다시 제출하기" : "제출하기") + "</button></div></form></section></div></div>";
}

/* ----- 내 노트: 어느 단원, 어느 부분에서 적었는지와 그 부분으로 가기 ----- */
function noteTarget(id, n) {
  if (n && n.target) return n.target;
  const si = SEGMENTS.findIndex(s => s.id === id); if (si >= 0) return { kind: "seg", i: si };
  const ci = CHECK_ITEMS.findIndex(x => x.id === id); if (ci >= 0) return { kind: "check", i: ci };
  if (id === "note") return { kind: "note" };
  if (id === "formative") return { kind: "formative" };
  return { kind: "general" };
}
function canGo(t) {
  const st = S.stage;
  if (t.kind === "general") return { ok: false, why: "" };
  if (st === "formative" && t.kind !== "formative") return { ok: false, why: "형성평가를 마친 뒤에 갈 수 있어요" };
  if (!started()) return { ok: false, why: "학습을 시작하면 갈 수 있어요" };
  if (t.kind === "seg") return { ok: true };
  if (t.kind === "check") return st === "check" || canReview("check") ? { ok: true } : { ok: false, why: "확인 문항을 마친 뒤에 다시 볼 수 있어요" };
  if (t.kind === "note") return st === "note" || canReview("note") ? { ok: true } : { ok: false, why: "형성평가 뒤에 열려요" };
  if (t.kind === "formative") return st === "formative" || canReview("form") ? { ok: true } : { ok: false, why: "형성평가를 낸 뒤에 다시 볼 수 있어요" };
  return { ok: false, why: "" };
}
function notesOf(cid) {
  return Object.keys(S.notes || {}).map(k => Object.assign({ id: k }, S.notes[k])).filter(n => n.text && (n.course || "info") === cid).sort((a, b) => b.t - a.t);
}
function notePathHtml(n) {
  const c = COURSES.find(x => x.id === (n.course || "info"));
  if (noteTarget(n.id, n).kind === "general") return esc(c ? c.subject : "") + " · 클래스 홈";
  return esc(c ? c.subject : "정보") + " · " + esc(n.unit || UNIT_NOW) + chipNo(LESSON_NO) + esc(LESSON.title);
}
function noteGoBtn(n, small) {
  const t = noteTarget(n.id, n), g = canGo(t);
  if (t.kind === "general") return "";
  return g.ok ? '<button class="btn btn-sm ' + (small ? "btn-ghost" : "btn-secondary") + '" data-act="note-go" data-id="' + n.id + '">이 부분으로 가기</button>' : '<span class="small muted">' + g.why + "</span>";
}
function pageMemo() {
  const notes = notesOf(courseId);
  return '<div class="page"><h1 class="hello" data-focus tabindex="-1">내 노트</h1>' +
    (notes.length ? '<ul class="memo-list">' + notes.map(n => { const d = new Date(n.t);
      return '<li class="dcard"><div class="mn-h"><span class="mn-path">' + notePathHtml(n) + '</span><span class="mn-d">' + esc(DFMT.format(d)) + " " + esc(HFMT.format(d)) + '</span></div><b class="mn-part">' + esc(n.label) + "</b><p>" + esc(n.text) + '</p><div class="row">' + noteGoBtn(n) + "</div></li>"; }).join("") + "</ul>"
      : '<div class="dcard">' + emptyBox("오른쪽 노트 도구로 적은 내용이 여기에 모여요. 어느 단원, 어느 부분에서 적었는지도 함께 남아요.") + "</div>") + "</div>";
}
function viewHome() {
  if (shellMode() === "hub") return pageHub();
  return ({ dash: pageDash, course: pageCourse, task: pageTask, record: pageRecord, board: pageBoard, memo: pageMemo }[page] || pageDash)();
}

/* ----- 다시 보기: 완료한 곳을 읽기 전용으로 연다. 진도와 기록은 바뀌지 않는다. ----- */
const REVIEW_NAME = { seg: "학습", check: "확인 문항", form: "형성평가", note: "오답 노트" };
function reviewBar() {
  const back = S.stage === "check" ? "확인 문항으로 돌아가기" : S.stage === "note" ? "오답 노트로 돌아가기" : "결과 화면으로 돌아가기";
  return '<div class="review-bar"><span>' + stChip("doing", "다시 보기") + '<span class="rb-now">현재 단계 <b>' + esc(whereNow()) + '</b></span><span class="muted">진도는 바뀌지 않아요</span></span>' + '<button class="btn btn-sm btn-secondary" data-act="review-end">' + back + "</button></div>";
}
function reviewPager(k, i, total, label) {
  return '<div class="pager">' + progBar(i + 1, total) + '<button class="btn btn-secondary" data-act="review-go" data-k="' + k + '" data-i="' + (i - 1) + '"' + (i === 0 ? " disabled" : "") + '>이전</button><span class="count"><b>' + (i + 1) + "</b> / " + total + " · " + esc(label) + "</span>" +
    (i === total - 1 ? '<button class="btn btn-primary" data-act="review-end">돌아가기</button>' : '<button class="btn btn-primary" data-act="review-go" data-k="' + k + '" data-i="' + (i + 1) + '">다음</button>') + "</div>";
}
function itemReview(it, k) {
  const r = S.items[it.id] || { attempts: [] }, a0 = r.attempts[0], last = r.attempts[r.attempts.length - 1];
  const conf = ["확실해요", "조금 헷갈려요", "찍었어요"];
  const opts = it.options ? '<ul class="rv-opts">' + it.options.map(o => '<li class="' + (o.id === it.answer ? "ans" : "") + '"><span class="ot">' + esc(o.text) + "</span>" + (o.id === it.answer ? stChip("done", "정답") : "") + (a0 && a0.resp === o.id ? stChip(a0.correct ? "done" : "warn", "내 첫 답") : "") + (k === "check" && last && last !== a0 && last.resp === o.id ? stChip(last.correct ? "done" : "warn", "내 마지막 답") : "") + "</li>").join("") + "</ul>" : "";
  return '<div class="seg-head">' + actLabel(k === "check" ? "check" : "formative", REVIEW_NAME[k]) + '<h2 data-focus tabindex="-1" id="segTitle">' + REVIEW_NAME[k] + " " + it.no + "번 다시 보기</h2></div>" +
    '<section class="item" aria-labelledby="segTitle"><div class="item-meta"><span>문항 ' + it.no + "</span>" + (a0 ? (a0.correct ? stChip("done", "첫 제출 정답") : stChip("warn", "첫 제출 오답")) : stChip("none", "미응답")) + "</div>" +
      codeBlock(it.code) + '<p class="q">' + esc(it.prompt) + "</p>" + opts +
      '<dl class="kv">' + (k === "check" ? "<dt>제출 횟수</dt><dd>" + r.attempts.length + "번</dd>" : "") + (k === "form" && r.conf != null ? "<dt>자신감</dt><dd>" + conf[r.conf] + "</dd>" : "") + "<dt>해설</dt><dd>" + esc(it.explain) + "</dd></dl></section>";
}
function viewReview() {
  const k = review.k, i = review.i;
  let body = "";
  if (k === "seg") {
    if (!S.segSeen.includes(i)) { S.segSeen.push(i); persist(); }
    const seg = SEGMENTS[i];
    body = '<section class="section-block" aria-labelledby="segTitle" id="segBody"><div class="seg-head">' + actLabel(seg.id, seg.label) + '<h2 data-focus tabindex="-1" id="segTitle">' + seg.title + "</h2></div>" + segBody(seg.id) + "</section>" + reviewPager("seg", i, SEGMENTS.length, seg.label);
  } else if (k === "check") body = itemReview(CHECK_ITEMS[i], "check") + reviewPager("check", i, CHECK_ITEMS.length, "확인 문항");
  else if (k === "form") body = itemReview(FORM_ITEMS[i], "form") + reviewPager("form", i, FORM_ITEMS.length, "형성평가");
  else body = viewNote().replace(/<div class="pager">[\s\S]*$/, "") + '<div class="pager"><span class="count">오답 노트 다시 보기</span><button class="btn btn-primary" data-act="review-end">돌아가기</button></div>';
  return reviewBar() + body;
}

/* ----- 왼쪽: 대시보드 메뉴 또는 학습 목차 ----- */
function sideMenu() {
  const c = course();
  return '<div class="rail"><button class="rail-btn" data-act="hub-open">' + ic("grid") + '<span>내 수업</span></button><button class="rail-btn" data-act="page" data-p="dash">' + ic("home") + "<span>홈</span></button></div>" +
    '<div class="side-menu"><div class="side-title">' + esc(c.subject) + '<span class="side-sub">' + esc(c.classCode) + "반 · " + esc(c.teacher) + " 선생님</span></div><ul>" +
    PAGES.map(p => '<li><button class="side-item' + (page === p.id ? " on" : "") + '" data-act="page" data-p="' + p.id + '"' + (page === p.id ? ' aria-current="page"' : "") + ">" + ic(p.icon) + "<span>" + p.label + "</span>" + (p.id === "task" && c.task && !(S.taskSubs && S.taskSubs[c.task.id]) ? '<span class="side-dot">새 과제</span>' : "") + "</button></li>").join("") + "</ul></div>";
}
function tocRow(act, i, n, label, right, state, enabled) {
  return '<li><button class="t-row ' + state + '" data-act="' + act + '" data-i="' + i + '"' + (enabled ? "" : " disabled") + (state === "cur" ? ' aria-current="step"' : "") + '><span class="t-n">' + n + '</span><span class="t-l">' + label + "</span>" + right + "</button></li>";
}
const DONE_MARK = '<span class="t-done"><span class="sr-only">완료</span></span>';
const LOCK_MARK = '<span class="t-lock"><span class="sr-only">잠김</span></span>';
function tocBox(title, sub, rows) { return '<section class="t-box"><h3 class="t-bh">' + title + (sub ? '<span class="t-sub">' + sub + "</span>" : "") + "</h3><ol>" + rows + "</ol></section>"; }
function sideToc() {
  const inL = S.stage === "learn", inC = S.stage === "check", inF = S.stage === "formative", before = !started();
  const rv = k => review && review.k === k;
  const learn = SEGMENTS.map((g, i) => {
    const cur = (inL && i === S.seg && !review) || (rv("seg") && review.i === i);
    return tocRow("toc-seg", i, i + 1, esc(g.label) + ' <span class="t-m">' + esc(g.title) + "</span>", (!before && S.segSeen.includes(i) && !cur) ? DONE_MARK : "", cur ? "cur" : "", inL || canReview("seg"));
  }).join("");
  const check = CHECK_ITEMS.map((it, i) => {
    const r = S.items[it.id], d = checkDone(it.id);
    const right = d ? (r.attempts.some(a => a.correct) ? DONE_MARK : '<span class="t-score">정답 확인</span>') : (ORDER.indexOf(S.stage) < 1 ? LOCK_MARK : "");
    const cur = (inC && !review && i === S.checkIdx) || (rv("check") && review.i === i);
    return tocRow("toc-check", i, i + 1, "확인 문항 " + (i + 1), right, cur ? "cur" : "", inC || canReview("check"));
  }).join("");
  let form;
  if (inF) form = FORM_ITEMS.map((it, i) => tocRow("toc-form", i, i + 1, "문항 " + (i + 1), (S.items[it.id] && S.items[it.id].sel) ? '<span class="t-score ok">응답</span>' : "", i === S.formIdx ? "cur" : "", true)).join("");
  else if (S.formSubmitted) form = FORM_ITEMS.map((it, i) => { const a = S.items[it.id] && S.items[it.id].attempts[0]; return tocRow("toc-form", i, i + 1, "문항 " + (i + 1), a && a.correct ? '<span class="t-score ok">정답</span>' : '<span class="t-score">오답</span>', rv("form") && review.i === i ? "cur" : "", canReview("form")); }).join("");
  else form = tocRow("toc-form", 0, "", FORM_ITEMS.length + "문항", LOCK_MARK, "", false);
  const note = tocRow("toc-note", 0, "", "틀린 문제 다시 보기", S.stage === "note" ? "" : S.stage === "done" ? DONE_MARK : LOCK_MARK, (S.stage === "note" && !review) || rv("note") ? "cur" : "", canReview("note"));
  return '<div class="t-head"><span class="t-k">' + UNIT_NOW + '</span><div class="t-title"><span class="title-row">' + chipNo(LESSON_NO, true) + "<b>" + esc(LESSON.title) + '</b></span><button class="t-status" data-act="page-go" data-p="record">학습 현황</button></div></div>' +
    '<nav class="t-body" aria-label="수업 목차">' +
      (before ? tocBox("시작 전", "", tocRow("toc-none", 0, 1, S.stage === "notice" ? "AI 안내 보기" : "함께할 AI 고르기", "", "cur", false)) : "") +
      tocBox("학습", "학습 완료 " + (before ? 0 : S.segSeen.length) + "/" + SEGMENTS.length + (canReview("seg") ? " · 눌러서 다시 보기" : ""), learn) +
      tocBox("확인 문항", checksDone() + "/" + CHECK_ITEMS.length + (canReview("check") ? " · 눌러서 다시 보기" : ""), check) +
      tocBox("형성평가", S.formSubmitted ? formScore() + "/" + FORM_ITEMS.length + " 정답" + (canReview("form") ? " · 눌러서 다시 보기" : "") : "AI 없이 · 시간 제한 없음", form) +
      tocBox("오답 노트", "", note) + "</nav>";
}
function renderToc() {
  const el = $("#toc"); if (!el) return;
  const mode = shellMode(), app = $(".app");
  app.dataset.shell = mode;
  app.dataset.tocOpen = tocOpen ? "1" : "0";
  app.dataset.sideOpen = sideOpen ? "1" : "0";
  el.className = "side " + (mode === "lesson" ? "side-toc" : "side-dash");
  el.setAttribute("aria-label", mode === "lesson" ? "수업 목차" : "메뉴");
  el.innerHTML = mode === "cover" || mode === "hub" ? "" : mode === "lesson" ? sideToc() : sideMenu();
  renderGnb(); renderTools();
}
function renderGnb() {
  const g = $("#gnbCrumb"); if (!g) return;
  const mode = shellMode(), c = course();
  g.innerHTML = mode === "lesson" ? '<span class="gc-a">' + esc(c.subject) + " · " + UNIT_NOW + "</span>" + ic("arrow") + chipNo(LESSON_NO, true) + "<b>" + esc(LESSON.title) + "</b>" : "";
  const end = $("#endBtn"); if (end) end.hidden = mode !== "lesson";
  const who = $("#whoChip"); if (who) { who.hidden = !S; if (S) who.textContent = S.student.classCode + "반 " + S.student.number + "번"; }
  const t = $("#sideToggle"); if (t) { t.hidden = mode === "cover" || mode === "hub"; t.setAttribute("aria-expanded", String(mode === "lesson" ? tocOpen : sideOpen)); t.setAttribute("aria-label", mode === "lesson" ? "수업 목차 열고 닫기" : "메뉴 열고 닫기"); }
}

/* ----- 오른쪽 도구 줄 ----- */
function renderTools() {
  const rail = $("#toolRail"); if (!rail) return;
  const mode = shellMode(), app = $(".app");
  if (mode === "cover" || mode === "hub") { rail.innerHTML = ""; app.dataset.tool = ""; app.dataset.hasAi = "0"; document.body.dataset.hasAi = "0"; $("#toolPane").innerHTML = ""; return; }
  const lessonOk = hasLesson(course());
  if (!lessonOk && (toolTab === "ai" || toolTab === "gloss")) toolTab = null;
  const info = agentInfo();
  const t = (id, icon, label) => '<button class="tool-btn' + (toolTab === id ? " on" : "") + '" data-act="tool" data-v="' + id + '" aria-pressed="' + (toolTab === id) + '">' + ic(icon) + "<span>" + label + "</span></button>";
  rail.innerHTML = (lessonOk ? t("ai", "chat", info ? info.name.replace("러닝", "러닝 ") : "AI") : "") + t("memo", "activity", "노트") + (lessonOk ? t("gloss", "learn", "용어") : "");
  app.dataset.tool = toolTab || "";
  app.dataset.hasAi = lessonOk ? "1" : "0"; document.body.dataset.hasAi = app.dataset.hasAi;
  applyPaneW();
  const pane = $("#toolPane");
  if (toolTab === "memo") pane.innerHTML = memoPane();
  else if (toolTab === "gloss") pane.innerHTML = glossPane();
  else pane.innerHTML = "";
}
/* 오른쪽 창: 코드 편집기 옆 보조 창처럼 위쪽 제목 줄, 넓게 보기, 닫기, 끌어서 너비 조절 */
ICONS.wide = '<path d="M4 9V4h5"/><path d="M20 9V4h-5"/><path d="M4 15v5h5"/><path d="M20 15v5h-5"/>';
ICONS.narrow = '<path d="M9 4v5H4"/><path d="M15 4v5h5"/><path d="M9 20v-5H4"/><path d="M15 20v-5h5"/>';
function panelBar(title) {
  return '<div class="panel-bar"><span class="pb-t">' + title + '</span><span class="pb-acts"><button class="pb-btn" data-act="pane-wide" aria-pressed="' + !!view.paneWide + '" aria-label="' + (view.paneWide ? "기본 너비로" : "넓게 보기") + '" title="' + (view.paneWide ? "기본 너비로" : "넓게 보기") + '">' + ic(view.paneWide ? "narrow" : "wide") + '</button><button class="pb-btn" data-act="tool" data-v="" aria-label="창 닫기" title="창 닫기">' + ic("close") + "</button></span></div>";
}
function paneHead(title) { return panelBar(title); }
const PANE_MIN = 320;
let paneTocBefore = null;
function paneMax() { return Math.max(PANE_MIN, Math.min(900, window.innerWidth - 64 - (shellMode() === "lesson" && tocOpen && !midWidth() ? 340 : shellMode() === "home" && !midWidth() ? 329 : 0) - 560)); }
function applyPaneW() {
  const app = $(".app"); if (!app) return;
  if (narrowTools()) { app.style.removeProperty("--pane-w"); return; }
  const w = view.paneWide ? paneMax() : Math.max(PANE_MIN, Math.min(view.paneW || 400, paneMax()));
  app.style.setProperty("--pane-w", w + "px");
  const r = $("#toolResizer"); if (r) { r.setAttribute("aria-valuenow", String(w)); r.setAttribute("aria-valuemax", String(paneMax())); }
}
function setPaneW(w) { view.paneW = Math.round(Math.max(PANE_MIN, Math.min(w, paneMax()))); view.paneWide = false; applyPaneW(); }
(function paneResize() {
  let drag = null;
  document.addEventListener("pointerdown", ev => {
    const r = ev.target.closest && ev.target.closest("#toolResizer"); if (!r || narrowTools()) return;
    ev.preventDefault(); drag = { id: ev.pointerId }; r.setPointerCapture(ev.pointerId); document.body.classList.add("resizing");
  });
  document.addEventListener("pointermove", ev => {
    if (!drag) return;
    const rail = $("#toolRail"), right = rail ? rail.getBoundingClientRect().left : window.innerWidth - 64;
    setPaneW(right - ev.clientX);
  });
  const end = () => { if (!drag) return; drag = null; document.body.classList.remove("resizing"); saveView(); if (toolTab === "ai") scrollMsgs(); };
  document.addEventListener("pointerup", end); document.addEventListener("pointercancel", end);
  document.addEventListener("dblclick", ev => { if (ev.target.closest && ev.target.closest("#toolResizer")) { view.paneWide = !view.paneWide; applyPaneW(); saveView(); renderTools(); renderAgent(); } });
  document.addEventListener("keydown", ev => {
    if (ev.target.id !== "toolResizer") return;
    const cur = parseInt(getComputedStyle($(".app")).getPropertyValue("--pane-w"), 10) || view.paneW;
    let w = null;
    if (ev.key === "ArrowLeft") w = cur + 24; else if (ev.key === "ArrowRight") w = cur - 24; else if (ev.key === "Home") w = PANE_MIN; else if (ev.key === "End") w = paneMax();
    if (w == null) return;
    ev.preventDefault(); setPaneW(w); saveView();
  });
  window.addEventListener("resize", () => applyPaneW());
})();
function memoCtx() {
  const base = { course: courseId, unit: UNIT_NOW, lesson: LESSON.lessonNo + " " + LESSON.title };
  if (!S || shellMode() !== "lesson") return { id: "general-" + courseId, label: "클래스 홈에서 적은 노트", course: courseId, target: { kind: "general" } };
  if (review) {
    if (review.k === "seg") { const g = SEGMENTS[review.i]; return Object.assign(base, { id: g.id, label: g.label + " · " + g.title, target: { kind: "seg", i: review.i } }); }
    if (review.k === "check") { const it = CHECK_ITEMS[review.i]; return Object.assign(base, { id: it.id, label: "확인 문항 " + it.no + "번", target: { kind: "check", i: review.i } }); }
    if (review.k === "form") { const it = FORM_ITEMS[review.i]; return Object.assign(base, { id: it.id, label: "형성평가 " + it.no + "번", target: { kind: "formative", i: review.i } }); }
    return Object.assign(base, { id: "note", label: "오답 노트", target: { kind: "note" } });
  }
  const c = currentContext();
  if (S.stage === "learn") return Object.assign(base, { id: c.id, label: SEGMENTS[S.seg].label + " · " + SEGMENTS[S.seg].title, target: { kind: "seg", i: S.seg } });
  if (S.stage === "check") return Object.assign(base, { id: c.id, label: "확인 문항 " + (S.checkIdx + 1) + "번", target: { kind: "check", i: S.checkIdx } });
  if (S.stage === "note") return Object.assign(base, { id: "note", label: "오답 노트", target: { kind: "note" } });
  if (S.stage === "formative") return Object.assign(base, { id: "formative", label: "형성평가", target: { kind: "formative", i: S.formIdx } });
  return Object.assign(base, { id: "general-" + courseId, label: "전체", target: { kind: "general" } });
}
function memoWhere(c) {
  return c.target && c.target.kind !== "general" ? '<p class="memo-where"><span class="title-row">' + esc(course().subject) + " · " + UNIT_NOW + chipNo(LESSON_NO) + "</span><b>" + esc(c.label) + "</b></p>" : '<p class="memo-where"><b>' + esc(c.label) + "</b></p>";
}
function memoPane() {
  const c = memoCtx(), cur = (S.notes && S.notes[c.id]) ? S.notes[c.id].text : "";
  const others = notesOf(courseId).filter(n => n.id !== c.id).slice(0, 5);
  return paneHead("노트") + '<div class="pane-b">' + memoWhere(c) + '<label class="sr-only" for="memoTa">노트 내용</label><textarea class="ta" id="memoTa" name="memoTa" rows="8" autocomplete="off" placeholder="예: range의 끝값은 들어가지 않는다…">' + esc(cur) + "</textarea>" +
    '<div class="row"><button class="btn btn-primary btn-sm" data-act="memo-save" data-id="' + c.id + '">저장하기</button><button class="linkbtn" data-act="page-go" data-p="memo">내 노트 모두 보기</button></div>' +
    (others.length ? '<h3 class="mini-h">다른 노트</h3><ul class="memo-mini">' + others.map(n => "<li><b>" + esc(n.label) + "</b><p>" + esc(n.text) + "</p>" + noteGoBtn(n, true) + "</li>").join("") + "</ul>" : "") + "</div>";
}
function glossPane(term) {
  return paneHead("용어 사전") + '<dl class="gloss pane-b">' + GLOSSARY.map(g => '<div class="gl-row' + (g.id === term ? " on" : "") + '" id="gl-' + g.id + '"><dt translate="no">' + esc(g.term) + "</dt><dd>" + esc(g.def) + ' <span class="gl-where">' + esc((SEGMENTS.find(s => s.id === g.seg) || {}).label || "") + "</span></dd></div>").join("") + "</dl>";
}

/* ----- 아래 막대(학습 모드) ----- */
function placeBar() {
  const bar = $("#lessonBar"); if (!bar) return;
  const pager = $("#lessonInner > .pager");
  const mid = $("#lessonBar .bar-mid");
  if (shellMode() !== "lesson" || !pager) { bar.hidden = true; if (mid) mid.innerHTML = ""; $(".app").dataset.bar = "off"; return; }
  bar.hidden = false; $(".app").dataset.bar = "on";
  mid.innerHTML = ""; mid.appendChild(pager);
  $("#lessonBar .bar-tools").innerHTML = '<button class="bar-btn bar-m" data-act="memo-open" aria-label="노트">' + ic("activity") + '<span>노트</span></button><button class="bar-btn bar-m" data-act="gloss-open" aria-label="용어 사전">' + ic("learn") + "<span>용어</span></button>" +
    '<button class="bar-btn bar-d" data-act="teacher">' + ic("chat") + "<span>선생님께 알리기</span></button>";
}

/* ----- 좁은 화면용 모달 ----- */
function memoModal() {
  const c = memoCtx(), cur = (S.notes && S.notes[c.id]) ? S.notes[c.id].text : "";
  showModal('<h2 id="mTitle">노트</h2>' + memoWhere(c) + '<label class="sr-only" for="memoTa">노트 내용</label><textarea class="ta" id="memoTa" name="memoTa" rows="6" autocomplete="off" placeholder="예: range의 끝값은 들어가지 않는다…">' + esc(cur) + "</textarea>" +
    '<div class="actions"><button class="btn btn-secondary" data-act="modal-close">닫기</button><button class="btn btn-primary" data-act="memo-save" data-id="' + c.id + '">저장하기</button></div>');
}
function glossModal(term) {
  showModal('<h2 id="mTitle">용어 사전</h2><dl class="gloss">' + GLOSSARY.map(g => '<div class="gl-row' + (g.id === term ? " on" : "") + '"><dt translate="no">' + esc(g.term) + "</dt><dd>" + esc(g.def) + "</dd></div>").join("") + '</dl><div class="actions"><button class="btn btn-primary" data-act="modal-close">닫기</button></div>');
}
const narrowTools = () => window.matchMedia("(max-width:900px)").matches;
const midWidth = () => window.matchMedia("(max-width:1199px)").matches;

/* ----- 연구자 보기: 수업 관리(교사가 과목, 과제, 공지를 더함. 시연용) ----- */
function drawerClasses() {
  const info = COURSES.find(c => c.id === "info"), t = info && info.task;
  const dayOpts = '<option value="">없음</option>' + [1, 2, 3, 4, 5].map(d => '<option value="' + d + '">' + WK[d] + "요일</option>").join("");
  const perOpts = [1, 2, 3, 4, 5, 6, 7].map(p => '<option value="' + p + '">' + p + "교시</option>").join("");
  return '<p class="prose-p small muted" style="margin:0;line-height:1.7">교사가 과목을 더하면 그 학급 학생의 \'내 수업\'에 나타나요. 시연용이라 이 브라우저에만 저장돼요. 실제 플랫폼에서는 교사 화면에서 관리해요.</p>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">과목</th><th scope="col">학급</th><th scope="col">교사</th><th scope="col">수업 시간</th><th scope="col">자료</th><th scope="col"><span class="sr-only">관리</span></th></tr></thead><tbody>' +
      COURSES.map(c => "<tr><td>" + esc(c.subject) + "</td><td>" + esc(c.classCode) + "</td><td>" + esc(c.teacher) + "</td><td>" + esc(slotsText(c)) + "</td><td>" + (c.content ? "있음" : "없음") + "</td><td>" + (c.seed ? '<span class="small muted">기본</span>' : '<button class="btn btn-ghost btn-sm" data-act="course-del" data-id="' + c.id + '">빼기</button>') + "</td></tr>").join("") + "</tbody></table></div>" +
    '<h3>과목 더하기</h3><form class="post-form" id="courseForm" novalidate><div class="pf-row"><label for="cSubject" class="grow">과목 이름<input id="cSubject" name="cSubject" autocomplete="off" maxlength="20" placeholder="예: 영어…" required></label>' +
      '<label for="cClass">학급<input id="cClass" name="cClass" autocomplete="off" spellcheck="false" maxlength="8" value="' + esc(S ? S.student.classCode : "1-3") + '" required></label></div>' +
      '<label for="cTeacher">교사 이름<input id="cTeacher" name="cTeacher" autocomplete="off" maxlength="12" required></label>' +
      '<fieldset class="pf-slots"><legend>매주 수업 시간</legend>' + [0, 1, 2].map(i => '<div class="slot"><label class="sr-only" for="cD' + i + '">요일 ' + (i + 1) + '</label><select id="cD' + i + '" name="cD' + i + '">' + dayOpts + '</select><label class="sr-only" for="cP' + i + '">교시 ' + (i + 1) + '</label><select id="cP' + i + '" name="cP' + i + '">' + perOpts + "</select></div>").join("") + "</fieldset>" +
      '<p class="form-err" id="courseErr" role="alert"></p><div class="row"><button class="btn btn-primary btn-sm" type="submit">과목 더하기</button></div></form>' +
    "<h3>정보 과제</h3>" + (t ? '<div class="note-box"><p class="prose-p" style="margin:0"><b>' + esc(t.title) + "</b> · 마감 " + esc(t.due) + '</p><p class="prose-p small" style="margin:0">' + esc(t.body) + '</p><div><button class="btn btn-secondary btn-sm" data-act="task-clear">과제 거두기</button></div></div>'
      : '<form class="post-form" id="taskNewForm" novalidate><label for="tTitle">제목<input id="tTitle" name="tTitle" autocomplete="off" maxlength="40" value="3의 배수 찾기 코드 제출" required></label>' +
        '<label for="tBody">내용<textarea class="ta" id="tBody" name="tBody" rows="3" maxlength="500">1부터 30까지 수 가운데 3의 배수만 출력하는 파이썬 코드를 써서 내세요. 실행 화면을 찍어 올려도 돼요.</textarea></label>' +
        '<label for="tDue">마감일<input id="tDue" name="tDue" type="date" value="' + isoDay(new Date(Date.now() + 3 * 864e5)) + '" required></label><div class="row"><button class="btn btn-primary btn-sm" type="submit">과제 내기</button><span class="small muted">과제가 없으면 학생 화면의 \'과제 제출하러 가기\'는 눌리지 않아요.</span></div></form>') +
    '<h3>정보 공지 쓰기</h3><form class="post-form" id="noticeForm" novalidate><label for="nTitle">제목<input id="nTitle" name="nTitle" autocomplete="off" maxlength="60" required></label><label for="nBody">내용<textarea class="ta" id="nBody" name="nBody" rows="3" maxlength="1000"></textarea></label>' +
      '<div class="row"><button class="btn btn-primary btn-sm" type="submit">공지 올리기</button><span class="small muted">학급 게시판 위쪽 \'선생님 글\'에 [공지]로 올라가요.</span></div></form>';
}

function goHome(p) { homeOpen = true; page = p || "dash"; boardView = null; sideOpen = false; review = null; toolTab = null; log("experienced", "home/" + page, "대시보드", "module", null, { course: courseId }); renderAll(); focusMain(); }
function enterLessonView() { homeOpen = false; review = null; tocOpen = !midWidth(); if (!narrowTools() && started()) toolTab = "ai"; }
const SHELL_ACT = {
  "home-open"() { if (!S) return; if (!courseId) { SHELL_ACT["hub-open"](); return; } goHome("dash"); },
  "hub-open"() { if (!S) return; courseId = null; homeOpen = true; boardView = null; sideOpen = false; review = null; toolTab = null; log("experienced", "hub", "내 수업", "module"); renderAll(); focusMain(); },
  "course-open"(el) { courseId = el.dataset.id; S.lastCourse = courseId; persist(); page = "dash"; homeOpen = true; toolTab = null; coursePane = "list"; log("experienced", "course/" + courseId, "과목 들어가기", "module", null, { course: courseId }); renderAll(); focusMain(); },
  "page"(el) { goHome(el.dataset.p); },
  "page-go"(el) { goHome(el.dataset.p); },
  "course-tab"(el) { coursePane = el.dataset.v; renderLesson(); },
  "home-resume"() { if (!hasLesson(course())) return; enterLessonView(); renderAll(); focusMain(); },
  "toc-toggle"() { if (shellMode() === "lesson") tocOpen = !tocOpen; else sideOpen = !sideOpen; renderToc(); },
  "toc-close"() { sideOpen = false; if (midWidth()) tocOpen = false; renderToc(); },
  "toc-seg"(el) { if (midWidth()) tocOpen = false; const i = +el.dataset.i; if (S.stage === "learn") { review = null; goSeg(i); } else if (openReview("seg", i)) { renderLesson(); focusMain(); } },
  "toc-check"(el) { if (midWidth()) tocOpen = false; const i = +el.dataset.i; if (S.stage === "check") { review = null; goCheck(i); } else if (openReview("check", i)) { renderLesson(); focusMain(); } },
  "toc-form"(el) { if (midWidth()) tocOpen = false; const i = +el.dataset.i; if (S.stage === "formative") goForm(i); else if (openReview("form", i)) { renderLesson(); focusMain(); } },
  "toc-note"() { if (midWidth()) tocOpen = false; if (openReview("note", 0)) { renderLesson(); focusMain(); } },
  "review-open"(el) {
    const k = el.dataset.k || "seg", i = +el.dataset.i || 0;
    if (!hasLesson(course())) return;
    enterLessonView();
    if (k === "seg" && S.stage === "learn") { if (i !== S.seg) { closeSegTiming(); S.seg = i; S.segAt = now(); if (!S.segSeen.includes(i)) S.segSeen.push(i); persist(); } }
    else openReview(k, i);
    renderAll(); focusMain();
  },
  "review-go"(el) { const k = el.dataset.k, i = +el.dataset.i; const max = { seg: SEGMENTS.length, check: CHECK_ITEMS.length, form: FORM_ITEMS.length }[k] || 1; if (i >= 0 && i < max && canReview(k)) { review = { k, i }; renderLesson(); focusMain(); } },
  "pane-wide"() {
    view.paneWide = !view.paneWide;
    if (shellMode() === "lesson" && !midWidth()) { if (view.paneWide) { paneTocBefore = tocOpen; tocOpen = false; } else if (paneTocBefore != null) { tocOpen = paneTocBefore; paneTocBefore = null; } renderToc(); }
    saveView(); applyPaneW(); renderTools(); renderAgent(); if (toolTab === "ai") scrollMsgs(); },
  "review-end"() { review = null; renderLesson(); focusMain(); },
  "tool"(el) {
    const v = el.dataset.v || null;
    if (narrowTools() && v === "ai") { setSheet(true); return; }
    if (narrowTools() && v === "memo") { memoModal(); return; }
    if (narrowTools() && v === "gloss") { glossModal(); return; }
    toolTab = toolTab === v ? null : v; renderTools();
    if (toolTab) log("interacted", "tool/" + toolTab, "도구 열기", "interaction");
    if (toolTab === "ai") { scrollMsgs(); const t = $("#chatIn"); if (t) t.focus(); }
    if (toolTab === "memo") { const t = $("#memoTa"); if (t) t.focus(); }
  },
  "memo-open"() { if (!S) return; if (narrowTools()) memoModal(); else { toolTab = "memo"; renderTools(); const t = $("#memoTa"); if (t) t.focus(); } },
  "memo-save"(el) {
    const t = $("#memoTa"); if (!t) return;
    const c = memoCtx(); S.notes = S.notes || {};
    const text = t.value.trim();
    if (text) S.notes[el.dataset.id] = { text, label: c.label, t: now(), course: c.course, unit: c.unit, lesson: c.lesson, target: c.target }; else delete S.notes[el.dataset.id];
    persist(); if ($("#modalRoot").innerHTML) closeModal(); toast("노트를 저장했어요.");
    log("commented", "memo", "노트", "interaction", { response: text.slice(0, 200) }, { "context-id": el.dataset.id, chars: text.length });
    if (homeOpen) renderLesson(); else if (toolTab === "memo") renderTools();
  },
  "note-go"(el) {
    const n = Object.assign({ id: el.dataset.id }, (S.notes || {})[el.dataset.id] || {});
    const tg = noteTarget(n.id, n); if (!canGo(tg).ok) return;
    courseId = n.course || "info";
    log("interacted", "memo/jump", "노트 위치로 가기", "interaction", null, { "context-id": n.id });
    enterLessonView(); if (!narrowTools()) toolTab = "memo";
    if (tg.kind === "seg") { if (S.stage === "learn") { if (tg.i !== S.seg) { closeSegTiming(); S.seg = tg.i; S.segAt = now(); persist(); } } else openReview("seg", tg.i); }
    if (tg.kind === "check") { if (S.stage === "check") { S.checkIdx = tg.i; persist(); } else openReview("check", tg.i); }
    if (tg.kind === "note" && S.stage !== "note") openReview("note", 0);
    if (tg.kind === "formative") { if (S.stage === "formative") { if (tg.i != null) S.formIdx = tg.i; } else openReview("form", tg.i || 0); }
    if ($("#modalRoot").innerHTML) closeModal();
    renderAll(); focusMain();
  },
  "gloss-open"(el) {
    const term = el && el.dataset ? el.dataset.term || null : null;
    if (narrowTools()) glossModal(term); else { toolTab = "gloss"; renderTools(); $("#toolPane").innerHTML = glossPane(term); if (term) { const r = $("#gl-" + term); if (r) r.scrollIntoView({ block: "center" }); } }
    if (S) log("experienced", "glossary", "용어 사전", "interaction", null, { term: term || "all" });
  },
  "post-view"(el) { page = "board"; homeOpen = true; boardView = el.dataset.id; renderAll(); focusMain(); },
  "post-write"() { page = "board"; homeOpen = true; boardView = "write"; renderAll(); const t = $("#pTitle"); if (t) t.focus(); },
  "board-list"() { boardView = null; renderLesson(); focusMain(); },
  "post-del"(el) {
    confirmModal("이 글을 지울까요?", "지운 글은 되돌릴 수 없어요.", "지우기", "취소", () => { S.posts = (S.posts || []).filter(p => p.id !== el.dataset.id); persist(); boardView = null; renderLesson(); toast("글을 지웠어요."); });
  },
  "vote-cast"(el) {
    const p = postById(el.dataset.id), sel = $$('input[name="vote-' + p.id + '"]:checked').map(x => +x.value);
    if (!sel.length) { toast(p.vote.multi ? "하나 이상 골라 주세요." : "하나를 골라 주세요."); return; }
    pstate(p.id).my = sel; persist();
    log("responded", "board/vote/" + p.id, "투표", "interaction", { response: sel.map(i => p.vote.opts[i]).join(", ") });
    renderLesson();
  },
  "vote-reset"(el) { pstate(el.dataset.id).my = null; persist(); renderLesson(); },
  "slip-shuffle"(el) {
    const p = postById(el.dataset.id); if (!p || p.by !== "나") return;
    const st = drawState(p); if (st.flipped.length) return;
    st.deal = shuffled(p.draw.cands.length); persist();
    const ul = $("#game-" + p.id + " .slips"); if (!ul || reduceMotion()) { toast("쪽지를 섞었어요."); return; }
    ul.classList.remove("shuffling"); void ul.offsetWidth; ul.classList.add("shuffling");
    setTimeout(() => ul.classList.remove("shuffling"), 900);
  },
  "slip-pick"(el) {
    const p = postById(el.dataset.id); if (!p || p.by !== "나") return;
    const st = drawState(p), s = +el.dataset.s;
    if (st.flipped.length >= p.draw.n || st.flipped.includes(s)) return;
    st.flipped.push(s);
    const done = st.flipped.length >= p.draw.n;
    if (done) { const d = new Date(); st.at = isoDay(d) + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); p.draw.result = drawWinners(p); }
    persist();
    const front = $(".slip-front", el); if (front) front.innerHTML = '<span class="slip-tag">당첨</span><b>' + esc(p.draw.cands[st.deal[s]]) + "</b>";
    el.setAttribute("aria-label", "쪽지 " + (s + 1) + ", " + p.draw.cands[st.deal[s]] + ", 뽑힘");
    el.classList.add("open", "win"); el.disabled = true;
    announce(p.draw.cands[st.deal[s]] + " 뽑힘");
    if (done) { log("interacted", "board/draw/" + p.id, "제비뽑기", "interaction", { response: drawWinners(p).join(", ") }); setTimeout(() => renderLesson(), reduceMotion() ? 0 : 700); }
    else { const m = $("#game-" + p.id + " .game-meta .st-chip"); if (m) m.textContent = "쪽지 " + (p.draw.n - st.flipped.length) + "장 더 고르기"; }
  },
  "slip-all"(el) { const p = postById(el.dataset.id); if (!p) return; drawState(p).all = true; persist(); renderLesson(); },
  async "lad-go"(el) {
    const p = postById(el.dataset.id), i = +el.dataset.i; if (!p) return;
    const box = $("#game-" + p.id); if (box) $$(".lad-p", box).forEach(b => { b.disabled = true; });
    await ladderAnimate(p, i);
    const st = pstate(p.id); st.shown = st.shown || []; if (!st.shown.includes(i)) st.shown.push(i); persist();
    log("interacted", "board/ladder/" + p.id, "사다리타기", "interaction", { response: p.ladder.players[i] + " " + p.ladder.results[ladderGeo(p.ladder).trace(i).end] });
    renderLesson();
  },
  async "lad-all"(el) {
    const p = postById(el.dataset.id); if (!p) return;
    const st = pstate(p.id); st.shown = st.shown || [];
    const rest = p.ladder.players.map((_, i) => i).filter(i => !st.shown.includes(i));
    const box = $("#game-" + p.id); if (box) $$(".lad-p, .row .btn", box).forEach(b => { b.disabled = true; });
    await Promise.all(rest.map(i => ladderAnimate(p, i)));
    st.shown = st.shown.concat(rest); persist(); renderLesson();
  },
  "lad-reset"(el) { pstate(el.dataset.id).shown = []; persist(); renderLesson(); },
  "file-dl"(el) {
    const parts = el.dataset.src.split(":"), k = parts[0], id = parts[1];
    const f = k === "post" ? (postById(id) || {}).file : ((S.taskSubs || {})[id] || {}).file;
    dlFile(f);
  },
  "course-del"(el) {
    const c = COURSES.find(x => x.id === el.dataset.id); if (!c) return;
    COURSES = COURSES.filter(x => x.id !== c.id); saveCourses();
    if (courseId === c.id) courseId = null;
    renderDrawer(); if (S) renderAll(); toast(c.subject + " 과목을 뺐어요.");
  },
  "task-clear"() { const c = COURSES.find(x => x.id === "info"); if (!c) return; c.task = null; saveCourses(); renderDrawer(); if (S) renderAll(); toast("과제를 거뒀어요."); }
};
document.addEventListener("change", ev => {
  if (ev.target.classList && ev.target.classList.contains("sr-file")) { const f = ev.target.files[0], n = $("#" + ev.target.id + "Name"); if (n) n.textContent = f ? f.name + " · " + kb(f.size) : "고른 파일 없음"; return; }
  if (ev.target.name !== "pType") return;
  const v = ev.target.value;
  $$("#postForm [data-for]").forEach(x => { x.hidden = !x.dataset.for.split(" ").includes(v); });
});
const lines = s => s.split(/[\n,]/).map(x => x.trim()).filter(Boolean).map(maskPII);
document.addEventListener("submit", async ev => {
  const id = ev.target.id;
  if (id === "postForm") {
    ev.preventDefault();
    const err = $("#postErr"), type = ($('input[name="pType"]:checked') || {}).value || "post";
    const ti = $("#pTitle").value.trim(), bo = $("#pBody").value.trim();
    const bad = (msg, el) => { err.textContent = msg; if (el) el.focus(); };
    if (!ti) return bad("제목을 적어 주세요.", $("#pTitle"));
    if (type === "post" && !bo) return bad("내용을 적어 주세요.", $("#pBody"));
    const post = { id: "s" + uuid().slice(0, 6), course: courseId, type, title: maskPII(ti), body: maskPII(bo), by: "나", date: isoDay(new Date()) };
    if (type === "post") post.tag = $("#pTag").value;
    if (type === "vote") {
      const opts = [0, 1, 2, 3, 4].map(i => $("#pOpt" + i).value.trim()).filter(Boolean).map(maskPII);
      if (opts.length < 2) return bad("선택지를 2개 이상 적어 주세요.", $("#pOpt0"));
      post.tag = "투표"; post.vote = { opts, base: opts.map(() => 0), multi: $("#pMulti").checked, due: $("#pDue").value || "" };
    }
    if (type === "draw") {
      const cands = lines($("#pCands").value).slice(0, 12);
      if (cands.length < 2) return bad("후보를 2개 이상 적어 주세요.", $("#pCands"));
      post.tag = "제비뽑기"; post.draw = { cands, n: Math.max(1, Math.min(+$("#pN").value || 1, cands.length)), deal: shuffled(cands.length), flipped: [] };
    }
    if (type === "ladder") {
      const players = lines($("#pPlayers").value).slice(0, 8);
      if (players.length < 2) return bad("참가를 2개 이상 적어 주세요.", $("#pPlayers"));
      const results = lines($("#pResults").value).slice(0, players.length);
      while (results.length < players.length) results.push("통과");
      post.tag = "사다리타기"; post.ladder = Object.assign({ players, results }, genLadder(players.length));
    }
    try { const f = await readFile($("#pFile")); if (f) post.file = f; } catch (e) { return bad(e.message, $("#pFile")); }
    S.posts = S.posts || []; S.posts.unshift(post);
    let msg = "담벼락에 올렸어요.";
    if (!persistChecked() && post.file) { post.file.data = null; persistChecked(); msg = "저장 공간이 부족해 파일 이름만 남겼어요."; }
    log("commented", "board", "담벼락 글쓰기", "interaction", { response: post.title }, { chars: bo.length, type, file: post.file ? post.file.size : 0 });
    boardView = post.id; renderLesson(); focusMain(); toast(msg);
  }
  if (id === "taskForm") {
    ev.preventDefault();
    const c = course(), t = c && c.task, err = $("#taskErr"); if (!t) return;
    const text = $("#kText").value.trim();
    let file = null;
    try { file = await readFile($("#kFile")); } catch (e) { err.textContent = e.message; $("#kFile").focus(); return; }
    const prev = (S.taskSubs || {})[t.id];
    if (!text && !file && !(prev && prev.file)) { err.textContent = "답을 적거나 파일을 올려 주세요."; $("#kText").focus(); return; }
    S.taskSubs = S.taskSubs || {};
    S.taskSubs[t.id] = { text: maskPII(text), file: file || (prev ? prev.file : null), t: now() };
    if (!persistChecked() && S.taskSubs[t.id].file) { S.taskSubs[t.id].file.data = null; persistChecked(); }
    log("completed", "task/" + t.id, "과제 제출", "assessment", { response: text.slice(0, 200) }, { chars: text.length, file: file ? file.size : 0 });
    renderAll(); focusMain(); toast("과제를 제출했어요.");
  }
  if (id === "courseForm") {
    ev.preventDefault();
    const err = $("#courseErr");
    const subject = $("#cSubject").value.trim(), classCode = $("#cClass").value.trim(), teacher = $("#cTeacher").value.trim();
    if (!subject || !classCode || !teacher) { err.textContent = "과목 이름, 학급, 교사 이름을 모두 적어 주세요."; (!subject ? $("#cSubject") : !classCode ? $("#cClass") : $("#cTeacher")).focus(); return; }
    const slots = [0, 1, 2].map(i => ({ d: $("#cD" + i).value, p: +$("#cP" + i).value })).filter(s => s.d !== "").map(s => ({ d: +s.d, p: s.p }));
    COURSES.push({ id: "c" + uuid().slice(0, 6), subject, classCode, teacher, slots, content: null, task: null });
    saveCourses(); renderDrawer(); if (S) renderAll(); toast(subject + " 과목을 더했어요.");
  }
  if (id === "taskNewForm") {
    ev.preventDefault();
    const c = COURSES.find(x => x.id === "info"); if (!c) return;
    const title = $("#tTitle").value.trim(), body = $("#tBody").value.trim(), due = $("#tDue").value;
    if (!title || !due) { toast("제목과 마감일을 넣어 주세요."); return; }
    c.task = { id: "k" + uuid().slice(0, 6), title, body, due }; saveCourses(); renderDrawer(); if (S) renderAll(); toast("과제를 냈어요.");
  }
  if (id === "noticeForm") {
    ev.preventDefault();
    const title = $("#nTitle").value.trim(), body = $("#nBody").value.trim();
    if (!title) { $("#nTitle").focus(); toast("제목을 적어 주세요."); return; }
    TPOSTS.unshift({ id: "n" + uuid().slice(0, 6), course: "info", type: "post", tag: "안내", title, body, by: "교사", date: isoDay(new Date()) });
    saveTposts(); renderDrawer(); if (S) renderAll(); toast("공지를 올렸어요.");
  }
});
document.addEventListener("keydown", ev => {
  if (ev.key !== "Escape" || $("#modalRoot").innerHTML) return;
  if (sideOpen) { sideOpen = false; renderToc(); return; }
  if (toolTab && toolTab !== "ai" && !drawerOpen) { toolTab = null; renderTools(); }
});
