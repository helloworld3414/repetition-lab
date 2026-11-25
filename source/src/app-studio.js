/* ===== 프로그램 만들기(관리자 화면)와 만든 프로그램 학습 화면 =====
   관리자가 정규 과목(여러 차시), 단건 특강, 단건 연수를 만든다. 교육과정 문서나 강의 자료를 올리면
   AI가 차시 구성과 내용 초안을 만들고, 관리자가 고쳐서 학습자에게 연다.
   - 정규 과목은 학급 코드로, 특강과 연수는 참가 코드로 학습자의 '내 수업'에 들어간다.
   - AI는 claude.ai 아티팩트 안이나 AI 서버가 연결된 배포판에서만 쓴다. 없으면 직접 입력한다.
   - 기존 정보(반복 구조 실험 차시), 수학 과목은 건드리지 않는다. 여기서 만든 프로그램은 실험 하네스와 무관하다.
   - 시연판이라 이 브라우저에만 저장된다. 실제 운영은 서버 저장소가 필요하다. */
const PKIND = { course: "정규 과목", lecture: "단건 특강", training: "단건 연수" };
const MROLE = { curriculum: "교육과정·성취기준", lecture: "강의 자료", ref: "참고 자료" };
let PROGRAMS = load(KEY + ":programs", []);
let studioOpen = false, studioView = "list", editId = null, editStep = "info", progSid = null, studioBusy = null, savedAt = 0;
function savePrograms() {
  try { localStorage.setItem(KEY + ":programs", JSON.stringify(PROGRAMS)); savedAt = Date.now(); return true; }
  catch (e) { toast("저장 공간이 부족해요. 큰 첨부 파일을 지워 주세요."); return false; }
}
function progById(id) { return PROGRAMS.find(p => p.id === id) || null; }
function editing() { return progById(editId); }
function newCode() { const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", r = new Uint32Array(6); crypto.getRandomValues(r); return Array.from(r, x => a[x % a.length]).join(""); }
function aiReady() { return engineNow() === "live"; }
function aiWhy() { return inArtifact() ? "연구자 보기 설정에서 응답 방식이 대본으로 되어 있거나, AI 사용을 허용하지 않았어요." : "이 주소에서는 AI 서버가 연결돼야 AI를 쓸 수 있어요. 지금은 직접 입력해 주세요."; }

/* ----- 학습자 쪽에서 보는 과목 목록에 프로그램을 더한다 ----- */
function progCourse(p) {
  return { id: "p-" + p.id, subject: p.title || "이름 없는 프로그램", classCode: p.kind === "course" ? p.classCode : "", teacher: p.teacher || "", slots: p.kind === "course" ? (p.slots || []) : [], content: "prog", prog: p.id, kind: p.kind, task: null };
}
function progCourses() {
  const joined = (S && S.joined) || [];
  return PROGRAMS.filter(p => p.status === "open" && (p.kind === "course" || joined.includes(p.id))).map(progCourse);
}
function isProg(c) { return !!(c && c.content === "prog"); }
function progOf(c) { return c && c.prog ? progById(c.prog) : null; }
function progDone(pid) { S.progDone = S.progDone || {}; return S.progDone[pid] || (S.progDone[pid] = []); }
function progPct(p) { const n = (p.sessions || []).length; return n ? Math.round(100 * progDone(p.id).filter(id => p.sessions.some(s => s.id === id)).length / n) : 0; }
function sessLabel(p, i) { return p.kind === "course" ? (i + 1) + "차시" : (i + 1) + "부"; }
function progChip(p, i) { return '<span class="chip-no">' + sessLabel(p, i) + "</span>"; }
function whenText(p) {
  if (p.kind === "course") return slotsText({ slots: p.slots || [] });
  return [p.date ? DFMT.format(new Date(p.date + "T00:00")) : "날짜 미정", p.time || "", p.minutes ? p.minutes + "분" : ""].filter(Boolean).join(" ");
}

/* ===================== 관리자 화면 ===================== */
function studioMenu() {
  const items = [["list", "프로그램 목록", "grid"], ["new", "새로 만들기", "activity"]];
  return '<div class="rail"><button class="rail-btn" data-act="studio-exit">' + ic("home") + '<span>나가기</span></button></div>' +
    '<div class="side-menu"><div class="side-title">관리자 화면<span class="side-sub">과목, 특강, 연수 만들기</span></div><ul>' +
    items.map(x => { const on = (x[0] === "list" && studioView === "list") || (x[0] === "new" && studioView === "edit" && !editId); return '<li><button class="side-item' + (on ? " on" : "") + '" data-act="studio-' + x[0] + '"' + (on ? ' aria-current="page"' : "") + ">" + ic(x[2]) + "<span>" + x[1] + "</span></button></li>"; }).join("") +
    (editing() ? '<li><button class="side-item on" aria-current="page">' + ic("book") + "<span>" + esc(editing().title || "이름 없는 프로그램") + "</span></button></li>" : "") + "</ul></div>";
}
function viewStudio() { return studioView === "edit" && editing() ? studioEdit() : studioList(); }
function studioList() {
  const rows = PROGRAMS.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  const card = p => '<li class="dcard sp-card"><div class="dc-h"><span class="title-row">' + stChip("type", PKIND[p.kind]) + (p.status === "open" ? stChip("done", "공개 중") : stChip("none", "작성 중")) + "</span>" +
    '<span class="small muted">' + esc(DFMT.format(new Date(p.updatedAt))) + " 수정</span></div><b class=\"sp-t\">" + esc(p.title || "이름 없는 프로그램") + '</b><span class="small muted">' +
    esc(p.kind === "course" ? (p.classCode || "학급 미정") + "반" : "참가 코드 " + p.code) + " · " + (p.sessions || []).length + (p.kind === "course" ? "차시" : "부") + " · 자료 " + (p.materials || []).length + "개 · " + esc(whenText(p)) + "</span>" +
    '<div class="row"><button class="btn btn-dark btn-sm" data-act="studio-edit" data-id="' + p.id + '">열기</button><button class="btn btn-secondary btn-sm" data-act="studio-copy" data-id="' + p.id + '">복사</button><button class="btn btn-ghost btn-sm" data-act="studio-del" data-id="' + p.id + '">지우기</button></div></li>';
  return '<div class="page"><div class="dash-head"><span class="dh-k">관리자 화면</span><h1 data-focus tabindex="-1">프로그램 목록</h1><p class="dh-meta">정규 과목은 학급에, 특강과 연수는 참가 코드로 학습자에게 열려요. 기본 과목인 정보, 수학은 여기서 바꾸지 않아요.</p></div>' +
    '<div class="sp-new"><button class="sp-kind" data-act="studio-new" data-kind="course"><b>정규 과목</b><span>교육과정 문서로 여러 차시를 길게 설계해요</span></button><button class="sp-kind" data-act="studio-new" data-kind="lecture"><b>단건 특강</b><span>주제나 강의 자료로 한 번짜리 수업을 만들어요</span></button><button class="sp-kind" data-act="studio-new" data-kind="training"><b>단건 연수</b><span>교원 연수처럼 한 번짜리 프로그램을 만들어요</span></button></div>' +
    (rows.length ? '<ul class="sp-list">' + rows.map(card).join("") + "</ul>" : '<div class="dcard">' + emptyBox("만든 프로그램이 없어요. 위에서 종류를 골라 시작하세요.") + "</div>") +
    '<p class="small muted" style="margin:0">시연판이라 이 브라우저에만 저장돼요. 다른 기기의 학습자에게 보이려면 서버 저장소가 필요해요.</p></div>';
}
const STEPS = [["info", "기본 정보"], ["mat", "자료"], ["design", "설계"], ["open", "공개"]];
function studioEdit() {
  const p = editing();
  const head = '<div class="dash-head"><span class="dh-k title-row">' + stChip("type", PKIND[p.kind]) + (p.status === "open" ? stChip("done", "공개 중") : stChip("none", "작성 중")) + '<span class="saved" id="savedNote">' + (savedAt ? "저장됨 " + HFMT.format(new Date(savedAt)) : "") + "</span></span>" +
    '<h1 data-focus tabindex="-1">' + esc(p.title || "이름 없는 프로그램") + "</h1></div>";
  const tabs = '<div class="ptabs st-steps" role="tablist" aria-label="만드는 순서">' + STEPS.map((s, i) => '<button role="tab" aria-selected="' + (editStep === s[0]) + '" data-act="studio-step" data-v="' + s[0] + '"><span class="st-n">' + (i + 1) + "</span>" + s[1] + "</button>").join("") + "</div>";
  const body = { info: stepInfo, mat: stepMat, design: stepDesign, open: stepOpen }[editStep](p);
  const i = STEPS.findIndex(s => s[0] === editStep);
  const nav = '<div class="row sp-nav">' + (i > 0 ? '<button class="btn btn-secondary" data-act="studio-step" data-v="' + STEPS[i - 1][0] + '">이전</button>' : "<span></span>") + (i < STEPS.length - 1 ? '<button class="btn btn-primary" data-act="studio-step" data-v="' + STEPS[i + 1][0] + '">다음: ' + STEPS[i + 1][1] + "</button>" : "") + "</div>";
  return '<div class="page page-studio">' + head + tabs + '<div class="course-body">' + body + nav + "</div></div>";
}
function fld(label, input, hint) { return '<div class="sf"><span class="lb">' + label + (hint ? ' <span class="muted small">' + hint + "</span>" : "") + "</span>" + input + "</div>"; }
function stepInfo(p) {
  const kinds = Object.keys(PKIND).map(k => '<label><input type="radio" name="pKind" value="' + k + '" data-pf="kind"' + (p.kind === k ? " checked" : "") + "><span>" + PKIND[k] + "</span></label>").join("");
  const dayOpts = v => '<option value="">없음</option>' + [1, 2, 3, 4, 5].map(d => '<option value="' + d + '"' + (String(v) === String(d) ? " selected" : "") + ">" + WK[d] + "요일</option>").join("");
  const perOpts = v => [1, 2, 3, 4, 5, 6, 7].map(n => '<option value="' + n + '"' + (String(v) === String(n) ? " selected" : "") + ">" + n + "교시</option>").join("");
  const sl = p.slots || [];
  const course = p.kind === "course";
  return '<section class="dcard"><h2>기본 정보</h2><div class="post-form">' +
    '<fieldset class="ptype"><legend>종류</legend>' + kinds + "</fieldset>" +
    '<label for="pfTitle">' + (course ? "과목 이름" : "프로그램 이름") + '<input id="pfTitle" data-pf="title" autocomplete="off" maxlength="60" value="' + esc(p.title || "") + '" placeholder="' + (course ? "예: 정보 2학기…" : "예: 생성형 AI로 수업 설계하기…") + '"></label>' +
    '<div class="pf-row"><label for="pfTeacher" class="grow">' + (course ? "담당 교사" : "강사") + '<input id="pfTeacher" data-pf="teacher" autocomplete="off" maxlength="20" value="' + esc(p.teacher || "") + '"></label>' +
    '<label for="pfAud" class="grow">대상<input id="pfAud" data-pf="audience" autocomplete="off" maxlength="40" value="' + esc(p.audience || "") + '" placeholder="' + (p.kind === "training" ? "예: 중등 정보 교사…" : "예: 중학교 1학년…") + '"></label></div>' +
    (course
      ? '<div class="pf-row"><label for="pfClass">학급 코드<input id="pfClass" data-pf="classCode" autocomplete="off" spellcheck="false" maxlength="8" value="' + esc(p.classCode || "") + '" placeholder="1-3"></label>' +
        '<label for="pfCount">차시 수<input id="pfCount" data-pf="count" type="number" inputmode="numeric" min="1" max="40" value="' + (p.count || 8) + '"></label>' +
        '<label for="pfMin">차시당 시간(분)<input id="pfMin" data-pf="minutes" type="number" inputmode="numeric" min="10" max="180" value="' + (p.minutes || 45) + '"></label></div>' +
        '<fieldset class="pf-slots"><legend>매주 수업 시간</legend>' + [0, 1, 2].map(i => '<div class="slot"><label class="sr-only" for="pfD' + i + '">요일 ' + (i + 1) + '</label><select id="pfD' + i + '" data-pf="slot-d-' + i + '">' + dayOpts((sl[i] || {}).d) + '</select><label class="sr-only" for="pfP' + i + '">교시 ' + (i + 1) + '</label><select id="pfP' + i + '" data-pf="slot-p-' + i + '">' + perOpts((sl[i] || {}).p || 1) + "</select></div>").join("") + "</fieldset>"
      : '<div class="pf-row"><label for="pfDate">날짜<input id="pfDate" data-pf="date" type="date" value="' + esc(p.date || "") + '"></label>' +
        '<label for="pfTime">시작 시각<input id="pfTime" data-pf="time" type="time" value="' + esc(p.time || "") + '"></label>' +
        '<label for="pfMin">전체 시간(분)<input id="pfMin" data-pf="minutes" type="number" inputmode="numeric" min="10" max="480" value="' + (p.minutes || 90) + '"></label>' +
        '<label for="pfCount">나눌 부분 수<input id="pfCount" data-pf="count" type="number" inputmode="numeric" min="1" max="8" value="' + (p.count || 3) + '"></label></div>') +
    '<label for="pfGoal"><span class="lb">설계 의도와 목표 <span class="muted small">(AI가 설계할 때 가장 먼저 봐요)</span></span><textarea class="ta" id="pfGoal" data-pf="goal" rows="4" maxlength="2000" placeholder="' + (course ? "예: 2022 개정 정보과 알고리즘과 프로그래밍 영역을 한 학기에 걸쳐 다룬다. 실습 비중을 높인다…" : "예: 교사가 생성형 AI로 수업 자료를 만들고 점검하는 방법을 직접 해 본다…") + '">' + esc(p.goal || "") + "</textarea></label>" +
    "</div></section>";
}
function stepMat(p) {
  const list = (p.materials || []).map(m => '<li class="mat"><div class="mat-h"><span class="title-row">' + stChip("tag", MROLE[m.role] || "참고 자료") + "<b>" + esc(m.name) + '</b></span><span class="small muted">' + (m.size ? kb(m.size) + " · " : "") + (m.chars || 0).toLocaleString("ko-KR") + "자" + (m.note ? " · " + esc(m.note) : "") + "</span></div>" +
    '<p class="mat-prev">' + esc((m.text || "").slice(0, 220)) + ((m.text || "").length > 220 ? "…" : "") + "</p>" +
    '<div class="row"><label class="sr-only" for="mr-' + m.id + '">자료 종류</label><select id="mr-' + m.id + '" class="h-sel" data-mrole="' + m.id + '">' + Object.keys(MROLE).map(k => '<option value="' + k + '"' + (m.role === k ? " selected" : "") + ">" + MROLE[k] + "</option>").join("") + "</select>" +
    '<button class="btn btn-secondary btn-sm" data-act="mat-view" data-id="' + m.id + '">전체 보기</button><button class="btn btn-ghost btn-sm" data-act="mat-del" data-id="' + m.id + '">빼기</button></div></li>').join("");
  const total = (p.materials || []).reduce((a, m) => a + (m.chars || 0), 0);
  return '<section class="dcard"><div class="dc-h"><h2>자료</h2><span class="small muted">모두 ' + (p.materials || []).length + "개 · " + total.toLocaleString("ko-KR") + "자</span></div>" +
    '<p class="small muted" style="margin:0">개정 교육과정 문서, 성취기준, 교과서 단원, 강의 자료, 연수 주제 설명을 넣어요. PDF, 워드(docx), 한글(hwpx), 텍스트 파일에서 글자를 뽑아 쓰고, 한글 hwp는 PDF로 저장하거나 글을 붙여 넣어 주세요.</p>' +
    '<div class="mat-add"><div class="file-f"><span class="lb" id="mFileLb">파일 올리기</span><span class="file-pick"><input type="file" class="sr-file" id="mFile" multiple aria-labelledby="mFileLb mFileBtn" accept=".pdf,.docx,.hwpx,.txt,.md,.csv"><label for="mFile" class="btn btn-secondary btn-sm" id="mFileBtn">' + ic("clip") + '파일 고르기</label>' +
      '<label class="sr-only" for="mRole">올릴 자료 종류</label><select id="mRole" class="h-sel">' + Object.keys(MROLE).map(k => '<option value="' + k + '"' + (k === (p.kind === "course" ? "curriculum" : "lecture") ? " selected" : "") + ">" + MROLE[k] + "</option>").join("") + "</select>" +
      '<span class="file-name" id="mFileName" aria-live="polite">' + (studioBusy === "file" ? "글자를 뽑는 중…" : "") + "</span></span></div>" +
    '<details class="mat-paste"><summary>글로 붙여 넣기</summary><div class="post-form"><label for="mPName">이름<input id="mPName" autocomplete="off" maxlength="60" placeholder="예: 정보과 성취기준 발췌…"></label><label for="mPText">내용<textarea class="ta" id="mPText" rows="6"></textarea></label><div class="row"><button class="btn btn-secondary btn-sm" data-act="mat-paste">자료로 넣기</button></div></div></details></div>' +
    (list ? '<ul class="mat-list">' + list + "</ul>" : emptyBox("넣은 자료가 없어요. 자료 없이 설계 의도만으로도 만들 수 있어요.")) +
    '<label for="pfFocus" class="sf-focus"><span class="lb">자료에서 집중할 부분 <span class="muted small">(쓰지 않아도 돼요. 쉼표로 구분)</span></span><input id="pfFocus" data-pf="focus" autocomplete="off" value="' + esc(p.focus || "") + '" placeholder="예: [9정04], 알고리즘, 반복 구조…"></label>' +
    '<p class="small muted" style="margin:0">자료가 길면 AI에는 이 낱말이 들어간 부분을 먼저 넘겨요. 넘기는 분량은 설계 단계에서 보여요.</p></section>';
}
function excerpt(p, budget) {
  const mats = (p.materials || []).slice().sort((a, b) => ["curriculum", "lecture", "ref"].indexOf(a.role) - ["curriculum", "lecture", "ref"].indexOf(b.role));
  const keys = String(p.focus || "").split(",").map(s => s.trim()).filter(Boolean);
  const total = mats.reduce((a, m) => a + (m.text || "").length, 0);
  let out = "", used = 0;
  for (const m of mats) {
    let t = m.text || "";
    if (keys.length && t.length > 1500) {
      const paras = t.split(/\n{1,}/), keep = new Set();
      paras.forEach((x, i) => { if (keys.some(k => x.includes(k))) { keep.add(i - 1); keep.add(i); keep.add(i + 1); } });
      if (keep.size) t = paras.filter((x, i) => keep.has(i)).join("\n");
    }
    const room = Math.max(0, Math.floor((budget - used) / Math.max(1, mats.length - mats.indexOf(m))) * 1.6);
    const piece = t.slice(0, Math.min(t.length, room, budget - used));
    if (!piece) continue;
    out += "\n[" + (MROLE[m.role] || "자료") + ": " + m.name + "]\n" + piece + (piece.length < t.length ? "\n(이하 줄임)" : "") + "\n";
    used += piece.length;
  }
  return { text: out, used, total };
}
function sessView(p, s, i) {
  const ln = a => (a || []).join("\n"), ck = (s.checks || []).map(c => c.q + (c.a ? " | " + c.a : "")).join("\n");
  return '<li class="ss" id="ss-' + s.id + '"><details' + (s.open ? " open" : "") + ' data-sid="' + s.id + '"><summary><span class="title-row">' + progChip(p, i) + "<b>" + esc(s.title || "제목 없음") + '</b><span class="small muted">' + (s.minutes ? s.minutes + "분" : "") + (s.body ? "" : " · 내용 비어 있음") + "</span></span></summary>" +
    '<div class="post-form ss-b">' +
      '<div class="pf-row"><label for="sT-' + s.id + '" class="grow">제목<input id="sT-' + s.id + '" data-sf="title" data-si="' + i + '" autocomplete="off" maxlength="80" value="' + esc(s.title || "") + '"></label><label for="sM-' + s.id + '">시간(분)<input id="sM-' + s.id + '" data-sf="minutes" data-si="' + i + '" type="number" inputmode="numeric" min="5" max="240" value="' + (s.minutes || "") + '"></label></div>' +
      '<label for="sG-' + s.id + '"><span class="lb">학습 목표 <span class="muted small">(한 줄에 하나)</span></span><textarea class="ta" id="sG-' + s.id + '" data-sf="goals" data-si="' + i + '" rows="2">' + esc(ln(s.goals)) + "</textarea></label>" +
      '<label for="sS-' + s.id + '"><span class="lb">관련 성취기준 <span class="muted small">(쓰지 않아도 돼요)</span></span><input id="sS-' + s.id + '" data-sf="standards" data-si="' + i + '" autocomplete="off" value="' + esc((s.standards || []).join(", ")) + '"></label>' +
      '<label for="sB-' + s.id + '">학습 내용<textarea class="ta" id="sB-' + s.id + '" data-sf="body" data-si="' + i + '" rows="7">' + esc(s.body || "") + "</textarea></label>" +
      '<label for="sA-' + s.id + '"><span class="lb">활동 <span class="muted small">(한 줄에 하나)</span></span><textarea class="ta" id="sA-' + s.id + '" data-sf="activities" data-si="' + i + '" rows="3">' + esc(ln(s.activities)) + "</textarea></label>" +
      '<label for="sC-' + s.id + '"><span class="lb">확인 질문 <span class="muted small">(한 줄에 하나, 질문 | 답)</span></span><textarea class="ta" id="sC-' + s.id + '" data-sf="checks" data-si="' + i + '" rows="3">' + esc(ck) + "</textarea></label>" +
      '<div class="row"><button class="btn btn-secondary btn-sm" data-act="sess-ai" data-i="' + i + '"' + (aiReady() && !studioBusy ? "" : " disabled") + ">AI로 이 " + (p.kind === "course" ? "차시" : "부분") + ' 쓰기</button><button class="btn btn-ghost btn-sm" data-act="sess-move" data-i="' + i + '" data-d="-1"' + (i === 0 ? " disabled" : "") + '>위로</button><button class="btn btn-ghost btn-sm" data-act="sess-move" data-i="' + i + '" data-d="1"' + (i === p.sessions.length - 1 ? " disabled" : "") + '>아래로</button><button class="btn btn-ghost btn-sm" data-act="sess-del" data-i="' + i + '">빼기</button></div>' +
    "</div></details></li>";
}
function stepDesign(p) {
  const ex = excerpt(p, 30000), unit = p.kind === "course" ? "차시" : "부분";
  const ai = aiReady();
  const busy = studioBusy && studioBusy !== "file" ? '<p class="ai-busy" role="status"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>' + esc(studioBusy) + "</p>" : "";
  return '<section class="dcard"><div class="dc-h"><h2>설계</h2><span class="small muted">' + (p.sessions || []).length + "개 " + unit + "</span></div>" +
    '<div class="ai-box"><div><b>AI로 초안 만들기</b><p class="small muted" style="margin:2px 0 0">' + (ai ? "설계 의도와 자료를 보고 " + unit + " 구성부터 만들어요. 구성을 보고 고친 뒤 내용을 채우면 돼요. AI 초안은 틀릴 수 있으니 꼭 검토해 주세요." : esc(aiWhy())) + "</p>" +
      '<p class="small muted" style="margin:4px 0 0">AI에 넘길 자료 ' + ex.used.toLocaleString("ko-KR") + "자" + (ex.total > ex.used ? " (전체 " + ex.total.toLocaleString("ko-KR") + "자 가운데)" : "") + "</p></div>" +
      '<div class="row"><button class="btn btn-dark" data-act="ai-outline"' + (ai && !studioBusy ? "" : " disabled") + ">" + unit + " 구성 만들기</button>" +
      '<button class="btn btn-secondary" data-act="ai-fill"' + (ai && !studioBusy && (p.sessions || []).length ? "" : " disabled") + '>빈 내용 모두 채우기</button>' + (studioBusy && studioBusy !== "file" ? '<button class="btn btn-ghost" data-act="ai-stop">멈추기</button>' : "") + "</div>" + busy + "</div>" +
    ((p.sessions || []).length ? '<ol class="ss-list">' + p.sessions.map((s, i) => sessView(p, s, i)).join("") + "</ol>" : emptyBox(ai ? "위 버튼으로 구성을 만들거나, 아래에서 직접 더하세요." : "아래에서 " + unit + "을 직접 더하세요.")) +
    '<div class="row"><button class="btn btn-secondary btn-sm" data-act="sess-add">' + unit + " 하나 더하기</button>" + ((p.sessions || []).length ? "" : '<button class="btn btn-secondary btn-sm" data-act="sess-blank">' + (p.count || 1) + "개 빈 틀 만들기</button>") + "</div></section>";
}
function openChecks(p) {
  const c = [];
  c.push([!!(p.title || "").trim(), "이름"]);
  c.push([p.kind === "course" ? !!(p.classCode || "").trim() : !!p.code, p.kind === "course" ? "학급 코드" : "참가 코드"]);
  c.push([(p.sessions || []).length > 0, "차시나 부분 1개 이상"]);
  c.push([(p.sessions || []).every(s => (s.title || "").trim()), "모든 제목"]);
  return c;
}
function stepOpen(p) {
  const checks = openChecks(p), ok = checks.every(c => c[0]);
  const empty = (p.sessions || []).filter(s => !(s.body || "").trim()).length;
  return '<section class="dcard"><h2>공개</h2>' +
    '<ul class="hself">' + checks.map(c => "<li><span>" + c[1] + "</span>" + (c[0] ? stChip("done", "완료") : stChip("warn", "미입력")) + "</li>").join("") + "</ul>" +
    (empty ? '<p class="small muted" style="margin:0">내용이 빈 ' + (p.kind === "course" ? "차시" : "부분") + "이 " + empty + "개 있어요. 공개해도 되지만 학습자에게는 제목과 목표만 보여요.</p>" : "") +
    (p.kind === "course" ? '<p style="margin:0">공개하면 <b>' + esc(p.classCode || "-") + "반</b> 학습자의 내 수업에 나타나요.</p>"
      : '<div class="join-code"><span class="small muted">참가 코드</span><b translate="no">' + esc(p.code) + '</b><button class="btn btn-ghost btn-sm" data-act="code-new">새 코드</button></div><p style="margin:0">학습자는 내 수업 화면에서 이 코드를 넣고 들어와요.</p>') +
    '<div class="row">' + (p.status === "open" ? '<button class="btn btn-secondary" data-act="prog-close">공개 닫기</button><button class="btn btn-dark" data-act="studio-preview">학습자 화면으로 보기</button>' : '<button class="btn btn-dark" data-act="prog-open"' + (ok ? "" : " disabled") + ">학습자에게 열기</button>") + "</div></section>" +
    '<section class="dcard"><h2>미리 보기</h2><ol class="lesson-rows">' + (p.sessions || []).map((s, i) => "<li>" + progChip(p, i) + '<span class="lr-t">' + esc(s.title || "제목 없음") + '<span class="lr-when">' + esc((s.goals || [])[0] || "") + "</span></span>" + (s.minutes ? '<span class="small muted">' + s.minutes + "분</span>" : "") + "</li>").join("") + "</ol></section>";
}

/* ----- 자료 글자 뽑기: PDF(pdf.js), docx(mammoth), hwpx(JSZip) ----- */
const LIB = {
  pdf: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
  pdfWorker: "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js",
  mammoth: "https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js",
  jszip: "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"
};
const libLoaded = {};
function needLib(name) { return libLoaded[name] || (libLoaded[name] = loadScript(LIB[name])); }
const TEXT_MAX = 200000;
async function extractText(f) {
  const ext = (f.name.split(".").pop() || "").toLowerCase();
  if (["txt", "md", "csv"].includes(ext)) return { text: await f.text() };
  if (ext === "pdf") {
    await needLib("pdf"); const lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = LIB.pdfWorker;
    const doc = await lib.getDocument({ data: new Uint8Array(await f.arrayBuffer()) }).promise;
    let out = ""; const n = Math.min(doc.numPages, 300);
    for (let i = 1; i <= n; i++) {
      const pg = await doc.getPage(i), tc = await pg.getTextContent(); let line = "", lastY = null;
      tc.items.forEach(it => { const y = it.transform ? Math.round(it.transform[5]) : null; if (lastY != null && y !== lastY) { out += line.trim() + "\n"; line = ""; } line += it.str + (it.hasEOL ? "\n" : ""); lastY = y; });
      out += line.trim() + "\n\n";
      if (out.length > TEXT_MAX) break;
    }
    return { text: out, note: doc.numPages + "쪽" + (out.replace(/\s/g, "").length < 20 * n ? ", 글자가 거의 없어 스캔본일 수 있어요" : "") };
  }
  if (ext === "docx") { await needLib("mammoth"); const r = await window.mammoth.extractRawText({ arrayBuffer: await f.arrayBuffer() }); return { text: r.value }; }
  if (ext === "hwpx") {
    await needLib("jszip"); const zip = await window.JSZip.loadAsync(await f.arrayBuffer());
    const names = Object.keys(zip.files).filter(n => /^Contents\/section\d+\.xml$/i.test(n)).sort((a, b) => parseInt(a.replace(/\D/g, ""), 10) - parseInt(b.replace(/\D/g, ""), 10));
    let out = "";
    for (const n of names) {
      const xml = await zip.file(n).async("string"), dom = new DOMParser().parseFromString(xml, "application/xml");
      Array.from(dom.getElementsByTagName("*")).filter(e => e.localName === "p").forEach(p => { const t = Array.from(p.getElementsByTagName("*")).filter(e => e.localName === "t").map(e => e.textContent).join(""); if (t.trim()) out += t + "\n"; });
    }
    return { text: out };
  }
  throw new Error(ext === "hwp" ? "한글 hwp는 읽을 수 없어요. PDF나 hwpx로 저장하거나 글을 붙여 넣어 주세요." : "이 형식은 읽을 수 없어요.");
}
async function addFiles(files, role) {
  const p = editing(); if (!p) return;
  studioBusy = "file"; renderLesson();
  const fails = [];
  for (const f of files) {
    try {
      if (f.size > 30 * 1048576) throw new Error("30MB보다 큰 파일은 올릴 수 없어요.");
      const r = await extractText(f);
      const text = String(r.text || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").slice(0, TEXT_MAX);
      let data = null;
      if (f.size <= FILE_MAX) data = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(null); fr.readAsDataURL(f); });
      p.materials = p.materials || [];
      p.materials.push({ id: "m" + uuid().slice(0, 6), name: f.name, size: f.size, type: f.type || "", role, text, chars: text.length, note: r.note || "", data });
    } catch (e) { fails.push(f.name + ": " + (e && e.message ? e.message : "읽지 못했어요")); }
  }
  p.updatedAt = now();
  if (!savePrograms()) { p.materials.forEach(m => { m.data = null; }); savePrograms(); }
  studioBusy = null; renderLesson();
  if (fails.length) showModal('<h2 id="mTitle">읽지 못한 파일</h2><ul class="plain">' + fails.map(x => "<li>" + esc(x) + "</li>").join("") + '</ul><div class="actions"><button class="btn btn-primary" data-act="modal-close">닫기</button></div>');
  else toast("자료를 넣었어요.");
}

/* ----- AI 설계 ----- */
let studioCtl = null;
function aiBrief(p) {
  return "[프로그램]\n종류: " + PKIND[p.kind] + "\n이름: " + (p.title || "(미정)") + "\n대상: " + (p.audience || "(미정)") +
    (p.kind === "course" ? "\n차시 수: " + (p.count || 8) + "\n차시당 시간: " + (p.minutes || 45) + "분" : "\n전체 시간: " + (p.minutes || 90) + "분\n나눌 부분 수: " + (p.count || 3)) +
    "\n설계 의도와 목표: " + (p.goal || "(없음)");
}
function parseJSON(t) { const s = String(t || ""), a = s.indexOf("{"), b = s.lastIndexOf("}"); if (a < 0 || b <= a) throw new Error("json"); return JSON.parse(s.slice(a, b + 1)); }
async function askAI(prompt, tier) {
  await waitRuntime();
  if (!aiReady()) throw new Error(aiWhy());
  studioCtl = new AbortController();
  const opts = { cache: false, modelTier: tier || "default", signal: studioCtl.signal };
  if (engineKind === "relay") opts.maxTokens = tier === "quick" ? 800 : 4000;
  const res = await sampleFn(prompt, opts);
  return res.text;
}
const DESIGN_RULES = "규칙:\n- 한국어로 쓴다. 학습 내용은 교과서 문체(~한다)로, 활동은 '~해 보자'처럼 쓴다.\n- 자료에 있는 성취기준 코드와 내용만 성취기준으로 적는다. 자료에 없으면 비워 둔다. 지어내지 않는다.\n- 자료에서 확인되지 않는 통계, 연도, 인용은 쓰지 않는다.\n- 대상 수준에 맞는 낱말을 쓰고, 화살표 같은 특수문자와 이모지는 쓰지 않는다.\n- 응답은 JSON 하나만 쓴다. 다른 말은 붙이지 않는다.";
async function aiOutline() {
  const p = editing(); if (!p) return;
  const n = Math.max(1, Math.min(40, +p.count || (p.kind === "course" ? 8 : 3)));
  const ex = excerpt(p, 30000), unit = p.kind === "course" ? "차시" : "부분";
  const prompt = "너는 학교와 교원 연수 프로그램을 설계하는 교육과정 전문가다. 아래 프로그램을 " + n + "개 " + unit + "으로 나눈 구성을 만든다.\n\n" + aiBrief(p) + "\n\n[자료]" + (ex.text || "\n(자료 없음)") + "\n\n" + DESIGN_RULES +
    '\n- 형식: {"summary": "프로그램 소개 2문장", "sessions": [{"title": "' + unit + ' 제목", "minutes": 숫자, "goals": ["학습 목표 1", "학습 목표 2"], "standards": ["[성취기준 코드] 내용"]}]}\n- sessions는 정확히 ' + n + "개. 앞 " + unit + "에서 배운 것이 뒤로 이어지게 순서를 잡는다.";
  studioBusy = unit + " 구성을 만드는 중이에요"; renderLesson();
  try {
    const j = parseJSON(await askAI(prompt, "default"));
    const ss = (j.sessions || []).slice(0, 40).map(s => ({ id: "s" + uuid().slice(0, 6), title: String(s.title || "").slice(0, 80), minutes: +s.minutes || (p.kind === "course" ? p.minutes || 45 : Math.round((p.minutes || 90) / n)), goals: (s.goals || []).map(String).slice(0, 5), standards: (s.standards || []).map(String).slice(0, 6), body: "", activities: [], checks: [], ai: true }));
    if (!ss.length) throw new Error("empty");
    const apply = () => { p.sessions = ss; if (j.summary) p.summary = String(j.summary); p.designedBy = "ai"; p.updatedAt = now(); savePrograms(); renderLesson(); toast(unit + " 구성을 만들었어요. 검토해 주세요."); };
    if ((p.sessions || []).some(s => (s.body || "").trim())) confirmModal("지금 구성을 바꿀까요?", "이미 쓴 " + unit + " 내용이 새 구성으로 바뀌어요.", "바꾸기", "그대로 두기", apply); else apply();
  } catch (e) { if (!(e && e.code === "cancelled")) toast(e && e.message && e.message.length > 6 ? e.message : "AI 답을 읽지 못했어요. 다시 시도해 주세요."); }
  finally { studioBusy = null; studioCtl = null; renderLesson(); }
}
async function aiSession(i, quiet) {
  const p = editing(); const s = p && p.sessions[i]; if (!s) return false;
  const ex = excerpt(p, 20000), unit = p.kind === "course" ? "차시" : "부분";
  const around = p.sessions.map((x, k) => sessLabel(p, k) + " " + x.title + (k === i ? " (지금 쓸 것)" : "")).join("\n");
  const prompt = "너는 학교와 교원 연수 프로그램을 설계하는 교육과정 전문가다. 아래 프로그램의 " + sessLabel(p, i) + " 내용을 쓴다.\n\n" + aiBrief(p) + "\n\n[전체 구성]\n" + around +
    "\n\n[지금 쓸 " + unit + "]\n제목: " + s.title + "\n시간: " + (s.minutes || "") + "분\n학습 목표: " + (s.goals || []).join(" / ") + "\n\n[자료]" + (ex.text || "\n(자료 없음)") + "\n\n" + DESIGN_RULES +
    '\n- 형식: {"body": "학습 내용. 문단 3~6개, 문단 사이 빈 줄", "activities": ["활동 1", "활동 2"], "checks": [{"q": "확인 질문", "a": "모범 답"}], "standards": ["[코드] 내용"]}\n- 활동은 2~4개, 확인 질문은 2~3개. 시간 안에 할 수 있는 분량으로 쓴다.';
  if (!quiet) { studioBusy = sessLabel(p, i) + " 내용을 쓰는 중이에요"; renderLesson(); }
  try {
    const j = parseJSON(await askAI(prompt, "default"));
    s.body = String(j.body || "").trim(); s.activities = (j.activities || []).map(String).slice(0, 6);
    s.checks = (j.checks || []).map(c => ({ q: String(c.q || ""), a: String(c.a || "") })).filter(c => c.q).slice(0, 5);
    if (j.standards && j.standards.length) s.standards = j.standards.map(String).slice(0, 6);
    s.ai = true; s.open = !quiet; p.updatedAt = now(); savePrograms();
    return true;
  } catch (e) { if (e && e.code === "cancelled") throw e; if (!quiet) toast("AI 답을 읽지 못했어요. 다시 시도해 주세요."); return false; }
  finally { if (!quiet) { studioBusy = null; studioCtl = null; renderLesson(); } }
}
async function aiFill() {
  const p = editing(); if (!p) return;
  const todo = p.sessions.map((s, i) => i).filter(i => !(p.sessions[i].body || "").trim());
  if (!todo.length) { toast("빈 내용이 없어요."); return; }
  let ok = 0;
  try {
    for (let k = 0; k < todo.length; k++) {
      studioBusy = "내용을 채우는 중이에요 (" + (k + 1) + " / " + todo.length + ")"; renderLesson();
      if (await aiSession(todo[k], true)) ok++;
      if (!studioBusy) break;
    }
  } catch (e) { /* 멈춤 */ }
  studioBusy = null; studioCtl = null; renderLesson();
  toast(ok + "개를 채웠어요." + (ok < todo.length ? " 나머지는 다시 시도해 주세요." : ""));
}

/* ----- 관리자 입력 자동 저장 ----- */
let saveTimer = null;
function touch() { const p = editing(); if (!p) return; p.updatedAt = now(); clearTimeout(saveTimer); saveTimer = setTimeout(() => { savePrograms(); const n = $("#savedNote"); if (n) n.textContent = "저장됨 " + HFMT.format(new Date(savedAt)); }, 400); }
function onStudioInput(ev) {
  const t = ev.target, p = editing(); if (!p || !studioOpen) return;
  if (t.dataset.pf) {
    const k = t.dataset.pf;
    if (k.indexOf("slot-") === 0) {
      const [, dp, i] = k.split("-"); p.slots = p.slots || [];
      const rows = [0, 1, 2].map(n => ({ d: ($("#pfD" + n) || {}).value, p: +(($("#pfP" + n) || {}).value || 1) }));
      p.slots = rows.filter(r => r.d !== "" && r.d != null).map(r => ({ d: +r.d, p: r.p })); void dp; void i;
    } else if (k === "kind") { if (ev.type !== "change") return; p.kind = t.value; if (p.kind !== "course" && !p.code) p.code = newCode(); touch(); renderLesson(); return; }
    else if (k === "count" || k === "minutes") p[k] = Math.max(1, +t.value || 0);
    else p[k] = t.value;
    if (k === "title") { const h = $(".page-studio h1"); if (h) h.textContent = t.value || "이름 없는 프로그램"; }
    touch(); return;
  }
  if (t.dataset.sf) {
    const s = p.sessions[+t.dataset.si]; if (!s) return;
    const k = t.dataset.sf, lines = v => v.split("\n").map(x => x.trim()).filter(Boolean);
    if (k === "goals" || k === "activities") s[k] = lines(t.value);
    else if (k === "standards") s[k] = t.value.split(",").map(x => x.trim()).filter(Boolean);
    else if (k === "checks") s.checks = lines(t.value).map(x => { const [q, ...a] = x.split("|"); return { q: q.trim(), a: a.join("|").trim() }; });
    else if (k === "minutes") s.minutes = +t.value || 0;
    else s[k] = t.value;
    if (k === "title") { const b = $("#ss-" + s.id + " summary b"); if (b) b.textContent = t.value || "제목 없음"; }
    touch(); return;
  }
  if (t.dataset.mrole && ev.type === "change") { const m = (p.materials || []).find(x => x.id === t.dataset.mrole); if (m) { m.role = t.value; touch(); } }
}
document.addEventListener("input", onStudioInput);
document.addEventListener("change", ev => {
  onStudioInput(ev);
  if (ev.target.id === "mFile" && ev.target.files.length) { addFiles(Array.from(ev.target.files), ($("#mRole") || {}).value || "ref"); ev.target.value = ""; }
});
document.addEventListener("toggle", ev => { const d = ev.target; if (!d.dataset || !d.dataset.sid) return; const p = editing(); const s = p && p.sessions.find(x => x.id === d.dataset.sid); if (s) s.open = d.open; }, true);

/* ===================== 학습자 화면(만든 프로그램) ===================== */
function progHead(c, p) {
  return '<div class="dash-head"><span class="dh-k title-row">' + stChip("type", PKIND[p.kind]) + (c.classCode ? esc(c.classCode) + "반" : "") + '</span><h1 data-focus tabindex="-1">' + esc(p.title) + '</h1><p class="dh-meta">' + esc([p.teacher ? p.teacher + (p.kind === "course" ? " 선생님" : " 강사") : "", whenText(p), p.audience].filter(Boolean).join(" · ")) + "</p></div>";
}
function nextSess(p) { const d = progDone(p.id); return p.sessions.findIndex(s => !d.includes(s.id)); }
function progRows(p, withBtn) {
  const d = progDone(p.id), c = course();
  return '<ol class="lesson-rows">' + p.sessions.map((s, i) => "<li>" + progChip(p, i) + '<span class="lr-t">' + esc(s.title) + '<span class="lr-when">' + esc(p.kind === "course" ? lessonWhen(c, i + 1) : (s.minutes ? s.minutes + "분" : "")) + "</span></span>" +
    (d.includes(s.id) ? stChip("done", "완료") : i === nextSess(p) ? stChip("doing", "학습할 차례") : stChip("none", "미진행")) +
    (withBtn ? '<button class="btn btn-sm ' + (d.includes(s.id) ? "btn-secondary" : "btn-dark") + '" data-act="sess-open" data-sid="' + s.id + '">' + (d.includes(s.id) ? "다시 보기" : "학습하기") + "</button>" : "") + "</li>").join("") + "</ol>";
}
function progDash(c) {
  const p = progOf(c); if (!p) return emptyBox("프로그램이 닫혔어요.");
  const k = nextSess(p), s = p.sessions[k], pct = progPct(p);
  const next = '<section class="dcard today-card" aria-labelledby="pNext"><h2 id="pNext" class="tc-k">' + ic("cal") + (k < 0 ? "모두 마쳤어요" : "다음 학습") + "</h2>" +
    (s ? '<div class="title-row">' + progChip(p, k) + '<b class="tc-title">' + esc(s.title) + "</b></div>" + (s.goals && s.goals.length ? '<p class="tc-sub">' + esc(s.goals[0]) + "</p>" : "") : '<p class="tc-sub">다시 보고 싶은 ' + (p.kind === "course" ? "차시" : "부분") + "을 아래에서 고르세요.</p>") +
    '<div class="tc-prog">' + pbarRow(pct) + "<span>" + pct + "%</span></div>" +
    '<div class="tc-acts">' + (s ? '<button class="btn btn-dark" id="goLesson" data-act="sess-open" data-sid="' + s.id + '">' + (k === 0 ? "학습 시작" : "이어서 학습") + "</button>" : "") + "</div></section>";
  const list = '<section class="dcard"><div class="dc-h"><h2>' + (p.kind === "course" ? "차시" : "프로그램 구성") + '</h2><button class="linkbtn" data-act="page" data-p="course">전체 보기</button></div>' + (p.summary ? '<p class="small" style="margin:0">' + esc(p.summary) + "</p>" : "") + progRows(p, true) + "</section>";
  return '<div class="page page-dash">' + progHead(c, p) + '<div class="dash-grid"><div class="dash-main">' + next + list + "</div>" +
    '<div class="dash-side">' + (p.kind === "course" ? calCard(c) : '<section class="dcard"><h2>일정</h2><p style="margin:0"><b>' + esc(whenText(p)) + "</b></p></section>") + boardMini() + "</div></div></div>";
}
function progCoursePage(c) {
  const p = progOf(c); if (!p) return emptyBox("프로그램이 닫혔어요.");
  const mats = (p.materials || []).filter(m => m.data);
  return '<div class="page page-course"><div class="course-head"><div><span class="muted small">' + esc(PKIND[p.kind]) + '</span><h1 data-focus tabindex="-1">' + esc(p.title) + "</h1></div>" + ring(progPct(p), 56) + "</div>" +
    '<section class="dcard">' + (p.summary ? '<p style="margin:0">' + esc(p.summary) + "</p>" : "") + progRows(p, true) + "</section>" +
    (mats.length ? '<section class="dcard"><h2>자료</h2>' + mats.map(m => fileBlock(m, "mat:" + p.id + ":" + m.id)).join("") + "</section>" : "") + "</div>";
}
function progSessPage(c) {
  const p = progOf(c); if (!p) return emptyBox("프로그램이 닫혔어요.");
  const i = p.sessions.findIndex(s => s.id === progSid), s = p.sessions[i]; if (!s) return progDash(c);
  const done = progDone(p.id).includes(s.id);
  const paras = String(s.body || "").split(/\n\s*\n/).map(x => x.trim()).filter(Boolean);
  const prev = p.sessions[i - 1], next = p.sessions[i + 1];
  return '<div class="page page-sess"><div class="sess-head"><span class="muted small">' + esc(p.title) + '</span><div class="title-row">' + progChip(p, i) + '<h1 data-focus tabindex="-1">' + esc(s.title) + "</h1>" + (done ? stChip("done", "완료") : "") + "</div>" +
      (s.minutes ? '<span class="small muted">' + s.minutes + "분</span>" : "") + "</div>" +
    '<article class="sheet-card">' +
      (s.goals && s.goals.length ? '<section><div class="act-label">' + ic("goal") + '<span>학습 목표</span></div><ol class="goal-list">' + s.goals.map(g => "<li><span>" + esc(g) + "</span></li>").join("") + "</ol></section>" : "") +
      (s.standards && s.standards.length ? '<p class="small muted" style="margin:0">' + s.standards.map(esc).join(" · ") + "</p>" : "") +
      (paras.length ? '<section><div class="act-label">' + ic("learn") + "<span>학습 내용</span></div>" + paras.map(x => '<p class="prose-p">' + esc(x) + "</p>").join("") + "</section>" : '<p class="muted">학습 내용이 아직 없어요.</p>') +
      (s.activities && s.activities.length ? '<section><div class="act-label">' + ic("activity") + '<span>활동</span></div><ol class="plain-ol">' + s.activities.map(a => "<li>" + esc(a) + "</li>").join("") + "</ol></section>" : "") +
      (s.checks && s.checks.length ? '<section><div class="act-label">' + ic("check") + '<span>확인 질문</span></div><div class="pchecks">' + s.checks.map((q, k) => '<details class="pcheck"><summary><b>' + (k + 1) + ".</b> " + esc(q.q) + "</summary>" + (q.a ? '<p class="small">' + esc(q.a) + "</p>" : '<p class="small muted">모범 답이 없어요.</p>') + "</details>").join("") + "</div></section>" : "") +
    "</article>" +
    '<div class="row sess-acts"><button class="btn ' + (done ? "btn-secondary" : "btn-dark") + '" data-act="sess-done" data-sid="' + s.id + '">' + (done ? "완료 취소" : "학습 완료로 표시") + '</button><button class="btn btn-secondary" data-act="tool" data-v="ask">AI에게 묻기</button><button class="btn btn-secondary" data-act="memo-open">노트</button></div>' +
    '<div class="row sp-nav">' + (prev ? '<button class="btn btn-secondary" data-act="sess-open" data-sid="' + prev.id + '">이전: ' + esc(prev.title) + "</button>" : "<span></span>") + (next ? '<button class="btn btn-primary" data-act="sess-open" data-sid="' + next.id + '">다음: ' + esc(next.title) + "</button>" : '<button class="btn btn-primary" data-act="page" data-p="dash">클래스 홈으로</button>') + "</div></div>";
}
function progRecord(c) {
  const p = progOf(c); if (!p) return emptyBox("프로그램이 닫혔어요.");
  return '<div class="page"><h1 class="hello" data-focus tabindex="-1">학습 현황</h1><section class="dcard"><div class="pg-top">' + ring(progPct(p), 52) + "<div><b>" + esc(p.title) + '</b><span class="small muted">' + progDone(p.id).length + " / " + p.sessions.length + " 완료</span></div></div>" + progRows(p, true) + "</section></div>";
}

/* ----- AI에게 묻기(만든 프로그램 전용, 실험 하네스와 무관) ----- */
function askLog(pid) { S.progAsk = S.progAsk || {}; return S.progAsk[pid] || (S.progAsk[pid] = []); }
function askPane() {
  const c = course(), p = progOf(c); if (!p) return "";
  const s = p.sessions.find(x => x.id === progSid), log = askLog(p.id).slice(-30), ai = aiReady();
  return paneHead("AI에게 묻기") + '<div class="pane-b ask">' +
    '<p class="memo-where"><span>' + esc(p.title) + "</span><b>" + esc(s ? s.title : "프로그램 전체") + "</b></p>" +
    (ai ? "" : '<p class="small muted" style="margin:0">' + esc(aiWhy()) + "</p>") +
    '<ul class="ask-log" aria-live="polite">' + (log.length ? log.map(m => '<li class="' + m.who + '"><span class="sr-only">' + (m.who === "me" ? "나" : "AI") + ": </span>" + esc(m.text) + (m.who === "ai" ? '<span class="ask-note">AI도 틀릴 수 있어요. 자료로 확인해 보세요.</span>' : "") + "</li>").join("") : '<li class="hint">이 ' + (p.kind === "course" ? "차시" : "프로그램") + " 내용과 자료를 바탕으로 답해요.</li>") + "</ul>" +
    '<form id="askForm" class="ask-f" novalidate><label class="sr-only" for="askIn">질문</label><textarea class="ta" id="askIn" name="askIn" rows="2" maxlength="600" placeholder="궁금한 것을 적어요…"' + (ai ? "" : " disabled") + '></textarea><button class="btn btn-primary btn-sm" type="submit"' + (ai ? "" : " disabled") + ">보내기</button></form></div>";
}
function askModal() { showModal('<h2 id="mTitle" class="sr-only">AI에게 묻기</h2>' + askPane().replace(/<div class="panel-bar">[\s\S]*?<\/div><\/span><\/div>/, "") + '<div class="actions"><button class="btn btn-secondary" data-act="modal-close">닫기</button></div>'); }
async function sendAsk(q) {
  const c = course(), p = progOf(c); if (!p || !q) return;
  const s = p.sessions.find(x => x.id === progSid), lg = askLog(p.id);
  lg.push({ who: "me", text: maskPII(q) }); lg.push({ who: "ai", text: "생각하는 중…", pending: true }); persist(); rerenderAsk();
  const ex = excerpt(p, 15000);
  const prompt = "너는 아래 학습 프로그램의 학습 도우미다. 학습자 질문에 답한다.\n규칙: 프로그램 내용과 자료 안에서 답한다. 자료에 없는 것은 모른다고 말하고 선생님께 물어보라고 한다. 3~5문장으로 짧게, 대상 수준에 맞게 쓴다. 특수문자와 이모지는 쓰지 않는다.\n\n" +
    aiBrief(p) + "\n\n[지금 보는 " + (p.kind === "course" ? "차시" : "부분") + "]\n" + (s ? s.title + "\n목표: " + (s.goals || []).join(" / ") + "\n" + (s.body || "") : "(전체)") + "\n\n[자료]" + (ex.text || "\n(없음)") +
    "\n\n[최근 대화]\n" + lg.slice(-8, -2).map(m => (m.who === "me" ? "학습자: " : "도우미: ") + m.text).join("\n") + "\n\n[학습자 질문]\n" + maskPII(q);
  let text;
  try { text = (await askAI(prompt, "quick")).trim() || "답을 받지 못했어요."; } catch (e) { text = "지금은 답할 수 없어요. " + (e && e.message ? e.message : ""); }
  studioCtl = null;
  const last = lg[lg.length - 1]; last.text = text; delete last.pending; persist(); rerenderAsk();
  log("responded", "prog/ask/" + p.id, "프로그램 질문", "interaction", { response: text.slice(0, 300) }, { "context-id": progSid || "all" });
}
function rerenderAsk() {
  if ($("#modalRoot").innerHTML && $("#modalRoot #askForm")) { askModal(); const t = $("#askIn"); if (t) t.focus(); return; }
  if (toolTab === "ask") { renderTools(); const t = $("#askIn"); if (t) t.focus(); const l = $(".ask-log"); if (l) l.scrollTop = l.scrollHeight; }
}
document.addEventListener("submit", ev => {
  if (ev.target.id === "askForm") { ev.preventDefault(); const t = $("#askIn"), q = (t.value || "").trim(); if (!q) return; t.value = ""; sendAsk(q); }
  if (ev.target.id === "joinForm") {
    ev.preventDefault();
    const v = ($("#joinCode").value || "").trim().toUpperCase(), p = PROGRAMS.find(x => x.status === "open" && x.kind !== "course" && x.code === v);
    if (!p) { $("#joinErr").textContent = "맞는 프로그램이 없어요. 코드를 다시 확인해 주세요."; return; }
    S.joined = S.joined || []; if (!S.joined.includes(p.id)) S.joined.push(p.id); persist();
    log("experienced", "prog/join/" + p.id, "프로그램 참가", "module");
    toast(p.title + "에 들어왔어요."); renderLesson();
  }
});
function joinBox() {
  return '<form class="dcard join-f" id="joinForm" novalidate><div><b>특강·연수 참가</b><p class="small muted" style="margin:2px 0 0">선생님이나 강사가 알려 준 참가 코드를 넣으세요.</p></div><div class="row"><label class="sr-only" for="joinCode">참가 코드</label><input id="joinCode" name="joinCode" autocomplete="off" spellcheck="false" maxlength="8" placeholder="참가 코드…"><button class="btn btn-secondary" type="submit">참가하기</button></div><p class="form-err" id="joinErr" role="alert"></p></form>';
}

/* ----- 동작 ----- */
function studioGo(v, id) { studioOpen = true; studioView = v; editId = id || null; if (v === "edit" && !editStep) editStep = "info"; renderAll(); focusMain(); }
function openStudio() { studioOpen = true; studioView = "list"; editId = null; sideOpen = false; toolTab = null; renderAll(); focusMain(); }
const STUDIO_ACT = {
  "studio-open"() { if (researchUnlocked()) openStudio(); else { window.__gateNext = "studio"; ACT["research-open"](); } },
  "studio-exit"() { studioOpen = false; studioView = "list"; editId = null; if (studioCtl) studioCtl.abort(); studioBusy = null; renderAll(); focusMain(); },
  "studio-list"() { studioGo("list"); },
  "studio-new"(el) {
    const kind = (el && el.dataset.kind) || "course";
    const p = { id: "g" + uuid().slice(0, 7), kind, title: "", teacher: "", audience: "", classCode: kind === "course" ? (S ? S.student.classCode : "1-3") : "", code: kind === "course" ? "" : newCode(), slots: [], date: "", time: "", minutes: kind === "course" ? 45 : 90, count: kind === "course" ? 8 : 3, goal: "", focus: "", materials: [], sessions: [], status: "draft", createdAt: now(), updatedAt: now() };
    PROGRAMS.push(p); savePrograms(); editStep = "info"; studioGo("edit", p.id);
    const t = $("#pfTitle"); if (t) t.focus();
  },
  "studio-edit"(el) { editStep = "info"; studioGo("edit", el.dataset.id); },
  "studio-copy"(el) { const p = progById(el.dataset.id); if (!p) return; const q = JSON.parse(JSON.stringify(p)); q.id = "g" + uuid().slice(0, 7); q.title = (p.title || "") + " 사본"; q.status = "draft"; if (q.kind !== "course") q.code = newCode(); q.sessions.forEach(s => { s.id = "s" + uuid().slice(0, 6); }); q.createdAt = q.updatedAt = now(); PROGRAMS.push(q); savePrograms(); renderLesson(); toast("복사했어요."); },
  "studio-del"(el) { const p = progById(el.dataset.id); if (!p) return; confirmModal("이 프로그램을 지울까요?", "학습자 화면에서도 사라지고 되돌릴 수 없어요.", "지우기", "취소", () => { PROGRAMS = PROGRAMS.filter(x => x.id !== p.id); savePrograms(); renderLesson(); toast("지웠어요."); }); },
  "studio-step"(el) { editStep = el.dataset.v; savePrograms(); renderLesson(); focusMain(); },
  "studio-preview"() { const p = editing(); if (!p || !S) { toast("학습자로 들어가 있어야 미리 볼 수 있어요. 로그인 뒤 다시 눌러 주세요."); return; } if (p.kind !== "course") { S.joined = S.joined || []; if (!S.joined.includes(p.id)) S.joined.push(p.id); persist(); } studioOpen = false; courseId = "p-" + p.id; page = "dash"; homeOpen = true; renderAll(); focusMain(); },
  "mat-paste"() {
    const p = editing(), name = ($("#mPName").value || "").trim() || "붙여 넣은 글", text = ($("#mPText").value || "").replace(/\r/g, "").trim().slice(0, TEXT_MAX);
    if (!text) { toast("내용을 넣어 주세요."); return; }
    p.materials = p.materials || []; p.materials.push({ id: "m" + uuid().slice(0, 6), name, size: 0, type: "text/plain", role: ($("#mRole") || {}).value || "ref", text, chars: text.length, data: null });
    touch(); savePrograms(); renderLesson(); toast("자료를 넣었어요.");
  },
  "mat-del"(el) { const p = editing(); p.materials = p.materials.filter(m => m.id !== el.dataset.id); touch(); savePrograms(); renderLesson(); },
  "mat-view"(el) { const m = editing().materials.find(x => x.id === el.dataset.id); if (!m) return; showModal('<h2 id="mTitle">' + esc(m.name) + '</h2><p class="small muted">' + (m.chars || 0).toLocaleString("ko-KR") + '자</p><pre class="mat-full">' + esc((m.text || "").slice(0, 20000)) + ((m.text || "").length > 20000 ? "\n…" : "") + '</pre><div class="actions"><button class="btn btn-primary" data-act="modal-close">닫기</button></div>'); },
  "ai-outline"() { aiOutline(); },
  "ai-fill"() { aiFill(); },
  "ai-stop"() { if (studioCtl) studioCtl.abort(); studioBusy = null; renderLesson(); },
  "sess-ai"(el) { aiSession(+el.dataset.i); },
  "sess-add"() { const p = editing(); p.sessions = p.sessions || []; p.sessions.push({ id: "s" + uuid().slice(0, 6), title: "", minutes: p.kind === "course" ? p.minutes || 45 : 30, goals: [], standards: [], body: "", activities: [], checks: [], open: true }); touch(); savePrograms(); renderLesson(); const t = $("#sT-" + p.sessions[p.sessions.length - 1].id); if (t) t.focus(); },
  "sess-blank"() { const p = editing(), n = Math.max(1, Math.min(40, +p.count || 1)); p.sessions = Array.from({ length: n }, (_, i) => ({ id: "s" + uuid().slice(0, 6), title: sessLabel(p, i), minutes: p.kind === "course" ? p.minutes || 45 : Math.round((p.minutes || 90) / n), goals: [], standards: [], body: "", activities: [], checks: [] })); touch(); savePrograms(); renderLesson(); },
  "sess-move"(el) { const p = editing(), i = +el.dataset.i, j = i + (+el.dataset.d); if (j < 0 || j >= p.sessions.length) return; [p.sessions[i], p.sessions[j]] = [p.sessions[j], p.sessions[i]]; touch(); savePrograms(); renderLesson(); },
  "sess-del"(el) { const p = editing(), i = +el.dataset.i; confirmModal("이 " + (p.kind === "course" ? "차시" : "부분") + "을 뺄까요?", "쓴 내용이 함께 사라져요.", "빼기", "취소", () => { p.sessions.splice(i, 1); touch(); savePrograms(); renderLesson(); }); },
  "code-new"() { const p = editing(); p.code = newCode(); touch(); savePrograms(); renderLesson(); },
  "prog-open"() { const p = editing(); if (!openChecks(p).every(c => c[0])) return; p.status = "open"; p.openedAt = now(); touch(); savePrograms(); renderLesson(); toast("학습자에게 열었어요."); },
  "prog-close"() { const p = editing(); p.status = "draft"; touch(); savePrograms(); renderLesson(); toast("공개를 닫았어요."); },
  "sess-open"(el) { progSid = el.dataset.sid; page = "sess"; homeOpen = true; const p = progOf(course()); log("experienced", "prog/" + (p ? p.id : "") + "/" + progSid, "프로그램 학습", "module"); if (toolTab === "ask") renderTools(); renderAll(); focusMain(); },
  "sess-done"(el) { const p = progOf(course()); if (!p) return; const d = progDone(p.id), id = el.dataset.sid; if (d.includes(id)) d.splice(d.indexOf(id), 1); else { d.push(id); log("completed", "prog/" + p.id + "/" + id, "프로그램 학습 완료", "module"); } persist(); renderLesson(); }
};
