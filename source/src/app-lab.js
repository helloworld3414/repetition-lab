/* ===== 코드 실습장(정보 교과만) =====
   파이썬: Skulpt(cdn.jsdelivr.net/npm, 처음 실행할 때 불러옴)
   C: JSCPP(페이지에 포함, Web Worker에서 실행해 무한 반복도 끊을 수 있음) */
const LAB_ON = !!(LESSON.features && LESSON.features.codeLab);
const SK_BASE = "https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/";
const LAB_START = {
  py: 'for i in range(1, 16):\n    if i % 3 == 0:\n        print("짝")\n    else:\n        print(i)\n',
  c: '#include <stdio.h>\n\nint main() {\n    int i;\n    for (i = 1; i < 16; i++) {\n        if (i % 3 == 0) {\n            printf("짝\\n");\n        } else {\n            printf("%d\\n", i);\n        }\n    }\n    return 0;\n}\n'
};
function labEnabled() { return LAB_ON && !!S && (S.stage === "learn" || S.stage === "check" || S.stage === "note"); }
function labState() {
  if (!S.code) S.code = { open: false, lang: "py", src: { py: LAB_START.py, c: LAB_START.c }, stdin: "", runs: 0, lastRun: null };
  return S.code;
}
function viewLab() {
  const L = labState();
  const head = '<div class="lab-head"><h3 id="codeLabTitle">' + ic("code") + '코드 실습장</h3><p class="lab-ask">파이썬이나 C 코드를 직접 실행해 보자.</p></div>';
  if (!L.open) return '<section class="lab codelab" id="codeLab" aria-labelledby="codeLabTitle">' + head + '<div class="row"><button class="btn btn-secondary btn-sm" data-act="lab-toggle" aria-expanded="false" aria-controls="codeLab">실습장 열기</button></div></section>';
  const langBtn = (v, l) => '<button data-act="lab-lang" data-v="' + v + '" aria-pressed="' + (L.lang === v) + '">' + l + "</button>";
  const file = L.lang === "c" ? "main.c" : "main.py";
  return '<section class="lab codelab" id="codeLab" aria-labelledby="codeLabTitle">' + head +
    '<div class="editor-wrap">' +
      '<div class="editor-head"><label class="file-tab" for="codeEditor" translate="no">' + file + '<span class="sr-only"> 편집 칸</span></label>' +
        '<div class="seg-ctl" role="group" aria-label="언어">' + langBtn("py", "파이썬") + langBtn("c", "C") + "</div></div>" +
      '<div class="editor-body"><pre class="gutter" id="codeGutter" aria-hidden="true">' + gutterText(L.src[L.lang]) + "</pre>" +
        '<textarea id="codeEditor" class="editor" name="codeEditor" rows="12" spellcheck="false" autocomplete="off" autocapitalize="off" translate="no" aria-describedby="editorHelp">' + esc(L.src[L.lang]) + "</textarea></div>" +
      '<div class="editor-bar"><button class="btn btn-primary btn-sm" data-act="lab-run" id="labRun">실행하기</button><button class="btn btn-secondary btn-sm" data-act="lab-stop" id="labStop" hidden>멈추기</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="lab-download" title="zip 파일로 받아요">파일로 받기</button><button class="btn btn-ghost btn-sm" data-act="lab-copy">코드 복사</button><button class="btn btn-ghost btn-sm" data-act="lab-reset">처음 코드로</button>' +
        '<span class="run-state" id="runState">' + (L.lang === "c" ? "C" : "파이썬 3") + "</span></div>" +
    "</div>" +
    '<p class="sr-only" id="editorHelp">Tab 키는 공백 4칸을 넣어요. 편집 칸에서 나가려면 Esc를 누른 뒤 Tab을 누르세요. Ctrl+Enter로 실행해요.</p>' +
    '<label class="mini-h" for="codeStdin">입력값 <span class="muted">한 줄에 하나씩</span></label>' +
    '<textarea id="codeStdin" class="ta stdin" name="codeStdin" rows="2" spellcheck="false" autocomplete="off" translate="no" placeholder="예: 7…">' + esc(L.stdin) + "</textarea>" +
    '<div><div class="mini-h">실행 결과</div><pre class="lab-console" id="codeOut" aria-live="polite" translate="no">' + esc(L.lastRun && L.lastRun.lang === L.lang ? L.lastRun.out : "") + "</pre></div>" +
    "</section>";
}
function gutterText(src) { const n = Math.max(1, String(src || "").split("\n").length); let o = ""; for (let i = 1; i <= n; i++) o += i + (i < n ? "\n" : ""); return o; }
function syncGutter() { const ed = $("#codeEditor"), g = $("#codeGutter"); if (!ed || !g) return; const t = gutterText(ed.value); if (g.textContent !== t) g.textContent = t; g.scrollTop = ed.scrollTop; }
function setRunState(busy, text) { const r = $("#runState"), b = $("#labRun"); if (r) { r.classList.toggle("busy", busy); if (text) r.textContent = text; } if (b) b.disabled = busy; }
function labRerender() {
  const box = $("#codeLab"); if (!box) return;
  box.outerHTML = viewLab();
}
function setOut(text, err) { const o = $("#codeOut"); if (!o) return; o.textContent = text; o.classList.toggle("err", !!err); o.scrollTop = o.scrollHeight; }

/* 파이썬 */
let skReady = null;
function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("load")); document.body.appendChild(s); }); }
function ensureSkulpt() { if (!skReady) skReady = loadScript(SK_BASE + "skulpt.min.js").then(() => loadScript(SK_BASE + "skulpt-stdlib.js")).catch(e => { skReady = null; throw e; }); return skReady; }
async function runPython(code, stdin) {
  await ensureSkulpt();
  const lines = stdin === "" ? [] : stdin.split(/\r?\n/);
  let li = 0, out = "", starved = false;
  window.Sk.configure({
    output: t => { out += t; setOut(out); },
    read: x => { if (!window.Sk.builtinFiles || window.Sk.builtinFiles.files[x] === undefined) throw "File not found: '" + x + "'"; return window.Sk.builtinFiles.files[x]; },
    inputfun: p => { const v = li < lines.length ? lines[li++] : (starved = true, ""); out += (p || "") + v + "\n"; setOut(out); return v; },
    inputfunTakesPrompt: true, __future__: window.Sk.python3, execLimit: 5000
  });
  try { await window.Sk.misceval.asyncToPromise(() => window.Sk.importMainWithBody("<stdin>", false, code, true)); return { ok: true, out, starved }; }
  catch (e) { return { ok: false, out, starved, err: e && e.toString ? e.toString() : String(e) }; }
}

/* C */
let cUrl = null, cWorker = null, cTimer = null, cResolve = null;
function makeCWorker() {
  // JSCPP는 Worker 안에서 불리면 스스로 메시지 처리기를 둔다: [id, "run", code, stdin, config]
  if (!cUrl) cUrl = URL.createObjectURL(new Blob([$("#jscppLib").textContent], { type: "text/javascript" }));
  return new Worker(cUrl);
}
function runC(code, stdin) {
  // 한글처럼 ASCII가 아닌 글자는 실행기가 다루지 못해 잠시 기호로 바꿨다가 결과에서 되돌린다
  const chars = [];
  const enc = code.replace(/[^\x00-\x7F]/g, ch => { let i = chars.indexOf(ch); if (i < 0) { chars.push(ch); i = chars.length - 1; } return "`@" + String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + Math.floor(i / 26)); });
  const dec = s => String(s || "").replace(/`@([A-Z])([A-Z])/g, (m, a, b) => chars[(a.charCodeAt(0) - 65) + 26 * (b.charCodeAt(0) - 65)] || m);
  return new Promise(resolve => {
    let out = "";
    try { cWorker = makeCWorker(); } catch (e) { resolve({ ok: false, out: "", err: "C 실행기를 시작하지 못했어요." }); return; }
    cResolve = r => { clearTimeout(cTimer); cResolve = null; if (cWorker) { cWorker.terminate(); cWorker = null; } resolve(r); };
    cWorker.onmessage = e => {
      const d = e.data || {};
      if (d.type === "stdio.write") { out += d.data; setOut(dec(out)); return; }
      if (d.id !== "run1") return;
      if (d.err) cResolve({ ok: false, out: dec(out), err: dec(d.msg) });
      else cResolve({ ok: true, out: dec(out), rc: d.data });
    };
    cWorker.onerror = e => { e.preventDefault(); if (cResolve) cResolve({ ok: false, out: dec(out), err: "C 실행기에서 오류가 났어요." }); };
    cTimer = setTimeout(() => { if (cResolve) cResolve({ ok: false, out: dec(out), err: "Time limit: 실행 시간이 5초를 넘었어요." }); }, 5000);
    cWorker.postMessage(["run1", "run", enc, stdin, { maxTimeout: 4500 }]);
  });
}
function stopC() { if (cResolve) cResolve({ ok: false, out: "", err: "stopped", stopped: true }); }

function explainErr(lang, err) {
  if (!err) return "";
  err = String(err).replace(/\s*Expected [\s\S]*$/, "").replace(/\\n(?=\n|$)/g, "");
  if (/TimeLimit|Time limit/i.test(err)) return "실행 시간이 너무 길어 멈췄어요. 끝나지 않는 반복이 있는지 확인해 보세요.\n(" + err + ")";
  if (/SyntaxError|Parsing Failure/i.test(err)) return "문법 오류가 있어요. 오류가 난 줄의 콜론, 괄호, 들여쓰기, 세미콜론을 확인해 보세요.\n(" + err + ")";
  if (/NameError|not declared|undefined/i.test(err)) return "정의하지 않은 이름을 썼어요. 변수 이름의 철자를 확인해 보세요.\n(" + err + ")";
  if (/ZeroDivision|divide by zero/i.test(err)) return "0으로 나누었어요. 나누는 수를 확인해 보세요.\n(" + err + ")";
  return "실행 중 오류가 났어요.\n(" + err + ")";
}
let labBusy = false;
async function labRun() {
  if (labBusy) return;
  const L = labState(), ed = $("#codeEditor"), si = $("#codeStdin");
  if (ed) L.src[L.lang] = ed.value;
  if (si) L.stdin = si.value;
  const code = L.src[L.lang];
  if (!code.trim()) { setOut("실행할 코드가 없어요.", true); return; }
  labBusy = true;
  const idle = L.lang === "c" ? "C" : "파이썬 3";
  setRunState(true, L.lang === "py" && !window.Sk ? "파이썬 실행기 불러오는 중…" : "실행 중…");
  const stop = $("#labStop"); if (stop && L.lang === "c") stop.hidden = false;
  setOut(L.lang === "py" && !window.Sk ? "파이썬 실행기를 불러오는 중…" : "실행하는 중…");
  const t0 = now();
  let r;
  try { r = L.lang === "py" ? await runPython(code, L.stdin) : await runC(code, L.stdin); }
  catch (e) { r = { ok: false, out: "", err: "실행기를 불러오지 못했어요. 인터넷 연결을 확인해 주세요." }; }
  labBusy = false;
  setRunState(false, idle);
  if (stop) stop.hidden = true;
  let text = r.out || "";
  if (r.stopped) text += (text ? "\n" : "") + "실행을 멈췄어요.";
  else if (!r.ok) text += (text ? "\n" : "") + "오류: " + explainErr(L.lang, r.err);
  else if (!text) text = "(출력 없음)";
  if (r.starved) text += "\n(입력값이 모자라 빈 값을 넣었어요. 입력값 칸을 확인해 보세요.)";
  setOut(text, !r.ok);
  L.runs++;
  L.lastRun = { lang: L.lang, code, out: text, ok: r.ok, t: now() };
  persist();
  log("interacted", "code-lab/run", "코드 실습장 실행", "interaction", { success: r.ok, response: text.slice(0, 200), duration: dur(now() - t0) }, { lang: L.lang, chars: code.length, run: L.runs, error: r.ok ? null : String(r.err || "").slice(0, 120) });
}

/* zip 파일 하나 만들기(압축 없이 저장) */
function crc32(bytes) { let crc = 0xFFFFFFFF; for (let i = 0; i < bytes.length; i++) { let c = (crc ^ bytes[i]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; }
function zipOne(name, text) {
  const te = new TextEncoder(), data = te.encode(text), fn = te.encode(name), crc = crc32(data);
  const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const buf = new Uint8Array(30 + fn.length + data.length + 46 + fn.length + 22), v = new DataView(buf.buffer);
  let p = 0;
  const u32 = x => { v.setUint32(p, x, true); p += 4; }, u16 = x => { v.setUint16(p, x, true); p += 2; };
  u32(0x04034b50); u16(20); u16(0x0800); u16(0); u16(time); u16(date); u32(crc); u32(data.length); u32(data.length); u16(fn.length); u16(0);
  buf.set(fn, p); p += fn.length; buf.set(data, p); p += data.length;
  const cd = p;
  u32(0x02014b50); u16(20); u16(20); u16(0x0800); u16(0); u16(time); u16(date); u32(crc); u32(data.length); u32(data.length); u16(fn.length); u16(0); u16(0); u16(0); u16(0); u32(0); u32(0);
  buf.set(fn, p); p += fn.length;
  const cdSize = p - cd;
  u32(0x06054b50); u16(0); u16(0); u16(1); u16(1); u32(cdSize); u32(cd); u16(0);
  return new Blob([buf], { type: "application/zip" });
}
async function labDownload() {
  const L = labState(), ed = $("#codeEditor"); if (ed) L.src[L.lang] = ed.value;
  const name = L.lang === "c" ? "main.c" : "main.py", code = L.src[L.lang];
  if (!downloadsNs) {
    if (inArtifact()) { toast("이 화면에서는 파일로 받을 수 없어요. 코드 복사를 써 주세요."); return; }
    localSave(name, code); toast("파일을 내려받았어요."); log("interacted", "code-lab/download", "코드 파일 받기", "interaction", { response: name }, { lang: L.lang }); return;
  }
  const tryOne = async (filename, data) => { await downloadsNs.save({ filename, data }); toast("내려받기를 요청했어요."); log("interacted", "code-lab/download", "코드 파일 받기", "interaction", { response: filename }, { lang: L.lang }); };
  try { await tryOne(name + ".zip", zipOne(name, code)); }
  catch (e) {
    const c = e && e.code;
    if (c === "declined") return;
    if (c === "rejected_extension" || c === "extension_not_enabled") { try { await tryOne(name + ".txt", code); } catch (e2) { if (!(e2 && e2.code === "declined")) toast("파일로 받지 못했어요. 코드 복사를 써 주세요."); } return; }
    toast("파일로 받지 못했어요. 코드 복사를 써 주세요.");
  }
}

const LAB_ACT = {};
LAB_ACT["lab-toggle"] = () => { const L = labState(); L.open = !L.open; persist(); labRerender(); if (L.open) { const e = $("#codeEditor"); if (e) e.focus(); } };
LAB_ACT["lab-lang"] = el => { const L = labState(), ed = $("#codeEditor"), si = $("#codeStdin"); if (ed) L.src[L.lang] = ed.value; if (si) L.stdin = si.value; L.lang = el.dataset.v; persist(); labRerender(); };
LAB_ACT["lab-run"] = () => { labRun(); };
LAB_ACT["lab-stop"] = () => { stopC(); };
LAB_ACT["lab-download"] = () => { labDownload(); };
LAB_ACT["lab-copy"] = () => { const ed = $("#codeEditor"); if (ed) copyText(ed.value); };
LAB_ACT["lab-reset"] = () => {
  const L = labState(), ed = $("#codeEditor"); if (ed) L.src[L.lang] = ed.value;
  if (L.src[L.lang] === LAB_START[L.lang]) { toast("이미 처음 코드예요."); return; }
  confirmModal("처음 코드로 되돌릴까요?", "지금 편집 칸에 쓴 코드는 지워지고 처음 예시 코드로 바뀌어요. 필요하면 먼저 코드 복사나 파일로 받기를 해 두세요.", "되돌리기", "취소", () => { L.src[L.lang] = LAB_START[L.lang]; persist(); labRerender(); toast("처음 코드로 되돌렸어요."); });
};
LAB_ACT["lab-open-code"] = el => {
  const L = labState(); L.open = true; L.lang = "py"; L.src.py = el.dataset.code.replace(/_{3,}/g, "____") + "\n"; persist();
  labRerender();
  const box = $("#codeLab"); if (box) box.scrollIntoView({ block: "start" });
  const ed = $("#codeEditor"); if (ed) ed.focus({ preventScroll: true });
  log("interacted", "code-lab/open", "실습장에서 열기", "interaction", null, { "context-id": currentContext().id });
};
let escArmed = false;
document.addEventListener("keydown", ev => {
  if (ev.target.id !== "codeEditor") return;
  if (ev.key === "Escape") { escArmed = true; return; }
  if (ev.key === "Tab" && !escArmed && !ev.shiftKey) {
    ev.preventDefault();
    const t = ev.target, s = t.selectionStart, e = t.selectionEnd;
    t.value = t.value.slice(0, s) + "    " + t.value.slice(e); t.selectionStart = t.selectionEnd = s + 4; if (S && S.code) { S.code.src[S.code.lang] = t.value; persist(); } syncGutter();
    return;
  }
  escArmed = false;
  if ((ev.ctrlKey || ev.metaKey) && ev.key === "Enter") { ev.preventDefault(); labRun(); }
});
document.addEventListener("input", ev => {
  if (!S || !S.code) return;
  if (ev.target.id === "codeEditor") { S.code.src[S.code.lang] = ev.target.value; persist(); syncGutter(); }
  if (ev.target.id === "codeStdin") { S.code.stdin = ev.target.value; persist(); }
});
document.addEventListener("scroll", ev => { if (ev.target && ev.target.id === "codeEditor") syncGutter(); }, true);
