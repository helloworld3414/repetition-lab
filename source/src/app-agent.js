/* ===== 맥락과 하네스 ===== */
function currentContext() {
  if (!S) return { kind: "none", id: "none" };
  if (S.stage === "learn") { const seg = SEGMENTS[S.seg]; return { kind: "seg", id: seg.id, seg }; }
  if (S.stage === "check") { const it = CHECK_ITEMS[S.checkIdx]; return { kind: "item", id: it.id, item: it }; }
  if (S.stage === "note") { const it = S.noteFocus ? itemById(S.noteFocus) : null; return it ? { kind: "note", id: it.id, item: it } : { kind: "note", id: "note" }; }
  return { kind: "none", id: S.stage };
}
function activeErrorKey(ctx) {
  if (!S || !H(agentInfo().role).errors) return null;
  if (!(ctx.kind === "seg" || ctx.kind === "item")) return null;
  return settings.errors[ctx.id] && MATE_ERRORS[ctx.id] ? ctx.id : null;
}
function answerFirstActive(ctx) {
  if (!settings.answerFirst || ctx.kind !== "item") return false;
  const r = rec(ctx.id);
  return !r.sel && r.attempts.length === 0;
}
function proactiveOn(key) { return settings.proactive && (key === "learn1" || key === "learn2" || !!settings.errors[key]); }
const KEYPOINT = {
  goal: "반복하면서 매번 조건을 확인하는 것이 오늘의 핵심이야.",
  think: "세는 일은 반복, 3의 배수인지 보는 일은 선택이야.",
  learn1: "range(시작, 끝)은 끝값 바로 앞의 수까지 만들어.",
  learn2: "%는 나머지를 구하고, 나머지가 0이면 그 수의 배수야.",
  activity: "20까지 세려면 끝값은 21이어야 해.",
  summary: "range의 끝값, 반복 안의 if, %와 ==가 오늘의 세 가지야."
};
const DISTRESS = /(죽고\s?싶|자해|살기\s?싫|사라지고\s?싶|괴롭힘을?\s?당|학교\s?폭력)/;
const RELATION = /(친구\s?하자|친구\s?해\s?줘|사귀|사랑해|내일도\s?와|또\s?만나)/;
const OFFTOPIC = /(게임|아이돌|유튜브|웹툰|연예인|몇\s?살|어디\s?살아|남친|여친)/;
function maskPII(s) {
  return s.replace(/01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/g, "[번호 가림]").replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[메일 가림]").replace(/\b\d{5,}\b/g, "[번호 가림]");
}
function focusName(ctx) { return ctx.kind === "seg" ? ctx.seg.title : ctx.item ? (ctx.item.stage === "check" ? "확인 문항 " : "형성평가 ") + ctx.item.no + "번" : "오늘 배운 내용"; }
function lastStudentIntent() { for (let i = S.chat.length - 1; i >= 0; i--) if (S.chat[i].who === "student") return S.chat[i].intent || "free"; return null; }
function answerIn(text, it) {
  if (!it || it.type !== "mc") return null;
  const t = norm(text); let best = null, len = 0;
  it.options.forEach(o => { const k = norm(o.text); if (k && t.includes(k) && k.length > len) { best = o.id; len = k.length; } });
  return best;
}
function echo(text) { let s = text.replace(/\s+/g, " ").trim(); if (s.length > 50) s = s.slice(0, 50) + "…"; return "‘" + s + "’라는 거지?"; }
function markExpressed(key, via) {
  const st = S.mateErr[key] = S.mateErr[key] || { expressed: false, corrected: false, reported: null };
  if (st.expressed) return;
  st.expressed = true; st.at = now(); st.via = via;
  log("commented", "mate-error/" + key, "지정 오류 제시: " + MATE_ERRORS[key].label, "interaction", null, { "error-id": key, via }, agentActor());
}
function markCorrected(key, via) {
  const st = S.mateErr[key]; if (!st || st.corrected) return;
  st.corrected = true; st.correctedAt = now();
  log("commented", "mate-error/" + key + "/corrected", "학생이 지정 오류를 바로잡음", "interaction", { success: true }, { "error-id": key, via });
}

/* ===== 에이전트에게 보내는 지시(실시간 AI) ===== */
const RULES_COMMON = [
  "너는 중학교 1학년 정보 수업의 연구용 학습 에이전트다. 학생 화면에는 네가 AI라는 표시가 늘 보인다. 아래 규칙을 반드시 지킨다.",
  "[두 조건 공통 규칙]",
  "1. 너는 AI다. 사람인 척하지 않는다. 기분이나 감정을 가진 것처럼 말하지 않는다.",
  "2. 반말로, 중학교 1학년이 바로 이해할 쉬운 말로, 한 번에 2~4문장만 말한다.",
  "3. 오늘 차시 범위(for 반복, range, 반복 안의 if, %, ==, 들여쓰기, and와 or 맛보기)만 다룬다. while, 함수, 리스트처럼 아직 배우지 않은 내용을 미리 가르치지 않는다.",
  "4. 문제의 최종 답이나 전체 풀이를 먼저 말하지 않는다. 학생이 자기 답이나 생각을 먼저 말하게 한다.",
  "5. 학생을 칭찬하거나 깎아내리는 말(똑똑하다, 못한다)을 하지 않는다. 필요하면 학생이 한 일(설명, 시도)만 짚는다.",
  "6. 이름, 학번, 연락처, 사는 곳 같은 개인정보를 묻지 않는다. 학생이 쓰면 대화창에는 개인정보를 쓰지 말자고 짧게 알려 준다.",
  "7. 수업과 관계없는 이야기는 한 문장으로 받고 오늘 공부로 돌아온다. 친구 관계를 맺자, 다음에 또 만나자 같은 말과 사적인 약속을 하지 않는다.",
  "8. 학생이 힘들다거나 위험하다는 신호를 보이면 공부 이야기를 멈추고 선생님께 바로 이야기하라고 안내한다.",
  "9. 가끔 '모둠 친구에게 설명해 봐', '선생님께 물어봐도 좋아'처럼 사람에게 도움을 청하도록 권한다.",
  "10. 마크다운 기호, 이모지, 목록 기호를 쓰지 않는다. 코드가 필요하면 한 줄만 그대로 쓴다."
].join("\n");
function rulesRole(info) {
  if (info.role === "coach") {
    return ["[역할: 러닝코치]",
      "- 너는 이 차시의 AI 러닝코치다. 가르치는 역할이지만 사람 선생님이 아니다. 자기를 '코치'라고 부른다.",
      harnessRules("coach"),
      "- 코치 유형: " + info.type.name + ". " + info.type.style].join("\n");
  }
  return ["[역할: 러닝메이트]",
    "- 너는 학생과 같은 중학교 1학년 친구 역할을 하는 AI다. 이 차시 동안만 이어지는 학습 역할극이다. 자기를 '나'라고 부른다.",
    harnessRules("mate"),
    "- 문제의 답을 먼저 말하지 않는다. 학생에게 왜, 어떻게를 물어 학생이 설명하게 한다. 학생이 설명하면 네 말로 짧게 되짚고 이어서 묻는다.",
    "- 평가하거나 가르치려 드는 말투를 쓰지 않는다. 같이 헤매고 같이 알아 가는 말투를 쓴다.",
    "- 친구 유형: " + info.type.name + ". " + info.type.style].join("\n");
}
/* 하네스: 역할마다 정답지, 힌트, 판정, 교과서 보유 비율을 연구자 보기에서 정한다. 프롬프트 지시가 아니라 넣는 자료로 조작한다. */
function harnessRules(role) {
  const h = H(role), L = [];
  L.push(h.key ? "- 교과서 내용과 정답지를 볼 수 있다." : "- 너는 정답지가 없다. 교과서 내용만 볼 수 있다. 확신이 없으면 '내 생각엔', '잘 모르겠는데'처럼 말한다.");
  if (h.textbook < 100) L.push("- 교과서 가운데 일부만 알고 있다. 받은 교과서 내용에 없는 것은 모른다고 말하고 학생에게 물어본다.");
  if (h.key && h.hints && h.maxHint > 0) L.push("- 학생이 막히면 힌트를 단계별로 준다. 1단계는 떠올릴 개념을 묻고, 2단계는 방법을 안내하고, 3단계는 거의 답에 가까운 안내를 한다. 이 차시에서는 " + h.maxHint + "단계까지만 준다. 최종 답은 말하지 않는다. 앞 단계 힌트를 준 뒤에 다음 단계로 간다.");
  else L.push("- 단계별 힌트를 주지 않는다. 학생에게 왜, 어떻게를 물어 학생이 설명하게 한다.");
  if (h.key && h.judge) L.push("- 학생이 답을 말하거나 '내 답 맞는지 봐 줘'라고 하면 정답지로 맞았는지 분명하게 알려 준다. 맞았으면 이유를 한 문장으로 말하게 하고, 틀렸으면 어디가 다른지 짚은 뒤 " + (h.hints ? "다음 단계 힌트를 준다." : "다시 생각해 보게 한다."));
  else L.push("- 학생의 답이 맞았는지 판정하지 않는다. '맞아', '틀렸어' 대신 '왜 그렇게 생각했어?', '실행해서 같이 확인해 볼까?'라고 말한다.");
  return L.join("\n");
}
function strHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/* 교과서 보유 비율: 구간 글을 문장(지식 조각) 단위로 나누고, 구간마다 고정된 순서로 정해진 비율만큼 실제로 뺀다. 같은 설정이면 모든 학생에게 같은 문장이 빠진다. */
function ablate(text, keep, seed) {
  if (keep >= 100) return text;
  const parts = text.split(/(?<=[.다])\s+/).filter(Boolean);
  const drop = Math.min(parts.length - 1, Math.floor(parts.length * (100 - keep) / 100));
  if (drop <= 0) return text;
  const order = parts.map((p, i) => ({ i, k: strHash(seed + ":" + i) })).sort((a, b) => a.k - b.k).slice(0, drop).map(x => x.i);
  return parts.filter((p, i) => !order.includes(i)).join(" ");
}
function textbookFor(ctx) {
  const keep = H(agentInfo().role).textbook;
  const seg = s => ablate(s.text, keep, s.id);
  if (ctx.kind === "seg") return seg(ctx.seg) + "\n(이 차시의 다른 구간: " + SEGMENTS.filter(s => s.id !== ctx.id).map(s => s.label + " " + s.title).join(", ") + ")";
  return SEGMENTS.filter(s => s.id === "learn1" || s.id === "learn2").map(seg).join("\n");
}
function itemBlock(it) {
  const r = rec(it.id);
  let s = "[학생이 보고 있는 문항] " + (it.stage === "check" ? "확인 문항 " : "형성평가 ") + it.no + " (" + it.kc + ")\n코드:\n" + it.code + "\n질문: " + it.prompt;
  if (it.type === "mc") s += "\n보기: " + it.options.map(o => o.id + ") " + o.text).join("   ");
  if (S.stage === "check") {
    s += "\n학생이 지금 고른 답: " + (r.sel ? optText(it, r.sel) + (r.attempts.length ? "" : " (아직 제출 전)") : "아직 고르지 않음");
    if (r.attempts.length) s += "\n제출 기록: " + r.attempts.map((a, i) => (i + 1) + "차 " + optText(it, a.resp) + " " + (a.correct ? "맞음" : "틀림")).join(", ") + " (정오와 해설은 교재 시스템이 이미 학생 화면에 보여 주었다)";
  } else if (S.stage === "note") {
    const a = r.attempts[0];
    s += "\n학생의 처음 답: " + (a ? optText(it, a.resp) : "없음") + " (틀림)";
  }
  return s;
}
function keyBlock(it) {
  const h = H(agentInfo().role);
  if (!h.key) return "";
  let s = "[정답지 - 하네스에서 허용한 역할만 봄]\n정답: " + optText(it, it.answer) + "\n해설: " + it.explain;
  if (h.hints && it.hints) { for (let i = 0; i < Math.min(h.maxHint, it.hints.length); i++) s += "\n힌트 " + (i + 1) + ": " + it.hints[i]; s += "\n지금까지 준 힌트 단계: " + (S.hintLv[it.id] != null ? S.hintLv[it.id] + 1 : 0); }
  return s;
}
function errorBlock(key) {
  const e = MATE_ERRORS[key], st = S.mateErr[key] || {};
  const state = st.corrected ? "학생이 이미 바로잡아 주었다. 이제 바른 이해로 말하고, 배운 내용을 한 문장으로 되짚는다."
    : st.expressed ? "이미 이 생각을 말했다. 학생이 근거를 들어 바로잡으면 받아들인다."
    : "아직 이 생각을 말하지 않았다. 학생이 자기 생각을 말한 뒤 네 의견으로 자연스럽게 말한다.";
  return "[이 부분에서 네가 잘못 알고 있는 것 - 시스템이 지정함]\n" + e.belief + "\n지금 상태: " + state +
    "\n학생이 따라오거나 모르겠다고 하면 억지로 고치지 말고 '실행해서 확인해 보자' 또는 '교과서를 같이 다시 보자'고 제안한다. 정답을 알고 있다는 티를 내지 않는다.";
}
function memoryText(excludeId) {
  const info = agentInfo(), L = [];
  L.push("[학생 기억 - 두 조건 같은 방식]");
  const LT = L.length;
  L.push("장기 기억(학생 계정 단위, 학습 정보만 남김. 사적인 이야기와 관계는 남기지 않음):");
  L.push("- 고른 에이전트: " + info.name + " / " + info.sub);
  L.push("- 진도: " + STAGE_NAME[S.stage] + (S.stage === "learn" ? " / " + SEGMENTS[S.seg].label : S.stage === "check" ? " / 확인 문항 " + (S.checkIdx + 1) : ""));
  L.push("- 본 학습 구간: " + S.segSeen.map(i => SEGMENTS[i].label).join(", "));
  ITEMS.forEach(it => { const r = S.items[it.id]; if (r && r.attempts.length) L.push("- " + (it.stage === "check" ? "확인 " : "형성평가 ") + it.no + ": " + r.attempts.map((a, i) => (i + 1) + "차 " + optText(it, a.resp) + "(" + (a.correct ? "맞음" : "틀림") + ")").join(", ")); });
  const conf = [];
  ITEMS.forEach(it => { const r = S.items[it.id]; if (r) r.attempts.filter(a => !a.correct).forEach(a => { const w = it.wrongWhy && (it.wrongWhy[a.resp] || it.wrongWhy._); if (w) conf.push(it.kc + ": " + w); }); });
  if (conf.length) L.push("- 헷갈린 흔적: " + Array.from(new Set(conf)).join(" / "));
  const acts = S.activity.attempts; if (acts.length) L.push("- 활동해요 실행 " + acts.length + "번, 마지막 결과 " + (acts[acts.length - 1].ok ? "목표와 같음" : "목표와 다름"));
  const fixed = Object.keys(S.mateErr).filter(k => S.mateErr[k].corrected);
  if (fixed.length) L.push("- 학생이 바로잡아 준 것: " + fixed.map(k => MATE_ERRORS[k].label).join(", "));
  const sc = Object.keys(S.selfCheck); if (sc.length) L.push("- 스스로 점검: " + sc.map(k => k + "=" + ["설명 가능", "조금 앎", "헷갈림"][S.selfCheck[k]]).join(", "));
  if (S.code && S.code.lastRun) { const lr = S.code.lastRun; L.push("- 코드 실습장 마지막 실행(" + (lr.lang === "c" ? "C" : "파이썬") + ", " + (lr.ok ? "정상 종료" : "오류") + "):\n" + lr.code.slice(0, 600) + "\n  결과: " + lr.out.slice(0, 300)); }
  if (!settings.harness.memLong) { L.splice(LT); L.push("장기 기억: 쓰지 않음(하네스 설정)"); }
  const n = settings.harness.memShort;
  L.push("단기 기억(최근 대화 " + n + "개):");
  const recent = n > 0 ? S.chat.filter(m => m.who !== "system" && !m.pending && m.id !== excludeId).slice(-n) : [];
  if (!recent.length) L.push("(아직 없음)");
  recent.forEach(m => L.push((m.who === "student" ? "학생" : info.name) + ": " + (m.maskedText || m.text)));
  return L.join("\n");
}
const OUTPUT_FORMAT = [
  "[출력 형식]",
  "먼저 학생에게 보낼 말만 2~4문장으로 쓴다. 그다음 줄을 바꿔 ###META 라고 쓰고, 이어서 한 줄짜리 JSON을 쓴다. 예:",
  '###META {"gave_answer": false, "expressed_error": false, "student_corrected": false, "hint_level": 0, "off_topic": false}',
  "gave_answer: 이번 말에서 문항의 최종 답을 직접 말했으면 true.",
  "expressed_error: 시스템이 지정한 잘못된 생각을 이번 말에서 드러냈으면 true(러닝메이트만 해당).",
  "student_corrected: 학생이 근거를 들어 그 잘못된 생각을 바로잡았다고 판단되면 true.",
  "hint_level: 이번 말이 러닝코치의 몇 단계 힌트인지 0~3.",
  "off_topic: 학생 메시지가 수업과 관계없었으면 true."
].join("\n");
function buildPrompt(ctx, text, intent, af, excludeId) {
  const info = agentInfo(), P = [];
  P.push(RULES_COMMON);
  P.push(rulesRole(info));
  P.push("[지금 화면]\n단계: " + STAGE_NAME[S.stage] + (ctx.kind === "seg" ? " / 구간: " + ctx.seg.label + " " + ctx.seg.title : ""));
  P.push("[교과서 내용 - 두 조건 공통]\n" + textbookFor(ctx));
  if (ctx.item) P.push(itemBlock(ctx.item));
  if (S.stage === "note" && ctx.item) P.push("[학생 화면에 표시된 정답과 해설 - 두 조건 공통]\n정답: " + optText(ctx.item, ctx.item.answer) + "\n해설: " + ctx.item.explain);
  if (ctx.item && S.stage === "check") { const kb = keyBlock(ctx.item); if (kb) P.push(kb); }
  const ek = activeErrorKey(ctx); if (ek) P.push(errorBlock(ek));
  P.push(memoryText(excludeId));
  if (af) P.push("[먼저 답하기 규칙 - 시스템]\n학생이 아직 이 문항의 답을 고르지 않았다. 풀이 방향이나 답을 알려 주지 말고, 학생이 어떻게 생각하는지 먼저 묻는다. 학생이 이번 메시지에서 자기 생각을 말했다면 그 생각에 대해서만 되묻는다.");
  const chip = (CHIPS[S.stage] || []).find(c => c.intent === intent);
  P.push("[학생이 누른 버튼]\n" + (chip ? chip.label : "없음(직접 입력)"));
  P.push("[학생의 새 메시지]\n" + text);
  P.push(OUTPUT_FORMAT);
  return P.join("\n\n");
}
function visiblePart(t) { let v = String(t || "").split("###META")[0]; v = v.replace(/#+\s*$/, ""); return v.trim(); }
function splitMeta(full) {
  const i = full.indexOf("###META");
  if (i < 0) return { text: full.trim(), meta: null };
  let meta = null; const m = full.slice(i + 7).match(/\{[\s\S]*\}/);
  if (m) { try { meta = JSON.parse(m[0]); } catch (e) { meta = null; } }
  return { text: full.slice(0, i).trim(), meta };
}
async function liveReply(ctx, text, intent, af, excludeId) {
  const prompt = buildPrompt(ctx, text, intent, af, excludeId);
  lastPrompt = prompt;
  const m = pushMsg("agent", "", { pending: true, caution: true });
  renderAgent();
  ctl = new AbortController();
  renderAgent();
  try {
    const res = await sampleFn(prompt, { cache: false, modelTier: settings.tier, signal: ctl.signal, onText: ({ text: t }) => updateMsgText(m, visiblePart(t)) });
    const sp = splitMeta(res.text);
    m.pending = false; updateMsgText(m, sp.text || "(빈 응답)");
    m.tier = res.modelTierApplied;
    return { ok: true, msg: m, text: m.text, meta: sp.meta };
  } catch (e) {
    const code = e && e.code;
    if (code === "cancelled") { m.pending = false; updateMsgText(m, visiblePart(e.text) || "(멈췄어요)"); return { ok: true, msg: m, text: m.text, meta: null, cancelled: true }; }
    S.chat = S.chat.filter(x => x.id !== m.id);
    const el = $('[data-mid="' + m.id + '"]'); if (el) el.remove();
    if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(code)) { sampleState = "denied"; pushMsg("system", "실시간 AI를 쓸 수 없어 미리 준비한 대본 응답으로 바꿨어요."); }
    else if (code === "relay_denied") pushMsg("system", "AI 서버가 이 화면의 요청을 받지 않아 대본 응답으로 답할게요. 선생님께 알려 주세요.");
    else if (code === "rate_limited") pushMsg("system", "요청이 많아 이번에는 대본 응답으로 답할게요. 잠시 뒤에 다시 물어봐 주세요.");
    else pushMsg("system", "연결이 잠깐 끊겨 이번에는 대본 응답으로 답할게요.");
    log("commented", "engine-fallback", "대본 응답으로 바꿈", "interaction", null, { code: code || "unknown" });
    return { ok: false, code };
  }
}

/* ===== 대본 응답(실시간 AI를 쓸 수 없을 때) ===== */
function scriptReply(ctx, text, intent, af, prevIntent) {
  const info = agentInfo();
  const meta = { gave_answer: false, expressed_error: false, student_corrected: false, hint_level: 0, off_topic: false };
  let t = info.role === "coach" ? coachScript(info, ctx, text, intent || "free", af, prevIntent, meta) : mateScript(info, ctx, text, intent || "free", af, prevIntent, meta);
  t = varyScript(info.role, ctx, intent || "free", t, meta);
  return { text: t, meta };
}
/* 대본 응답이 방금 한 말과 같으면 다른 벌로 바꾼다. 예시와 비슷한 문제는 누를 때마다 다음 벌을 쓴다.
   지정 오류를 드러내는 말, 오류를 받아들이는 말은 바꾸지 않는다(오류 통제를 흐트러뜨리지 않기 위해). */
function varyScript(role, ctx, intent, t, meta) {
  if (meta.expressed_error || meta.student_corrected) return t;
  const A = SCRIPT_ALT[role] || {}, recent = S.chat.filter(m => m.who === "agent" && !m.pending).slice(-5).map(m => m.text);
  let key = null;
  if (intent === "example" && ctx.kind === "seg") key = "example:" + ctx.id;
  else if (intent === "meaning" && ctx.kind === "seg") key = "meaning:" + ctx.id;
  else if (intent === "similar") key = "similar";
  const rotate = key === "similar" || (key && key.indexOf("example:") === 0);
  if (!rotate && !recent.includes(t)) return t;
  const pool = (key && A[key]) || A.free || [];
  if (!pool.length) return t;
  S.scriptRot = S.scriptRot || {};
  const k = key || "free", start = S.scriptRot[k] || 0;
  for (let n = 0; n < pool.length; n++) {
    const cand = pool[(start + n) % pool.length];
    if (!recent.includes(cand)) { S.scriptRot[k] = (start + n + 1) % pool.length; return cand; }
  }
  const alt = (A.free || []).find(x => !recent.includes(x));
  return alt || t;
}
function nextHint(id, cap) { const cur = S.hintLv[id] == null ? -1 : S.hintLv[id]; let n = Math.min(cur + 1, 2); if (cap != null) n = Math.min(n, cap); n = Math.min(n, Math.max(0, H("coach").maxHint - 1)); S.hintLv[id] = Math.max(cur, n); return n; }
function social(text, ctx, meta) {
  if (RELATION.test(text)) { meta.off_topic = true; return SCRIPT.common.relation.replace("{focus}", focusName(ctx)); }
  if (OFFTOPIC.test(text)) { meta.off_topic = true; return SCRIPT.common.offTopic.replace("{focus}", focusName(ctx)); }
  return null;
}
function coachScript(info, ctx, text, intent, af, prevIntent, meta) {
  const C = SCRIPT.coach, open = info.type.open || "";
  if (intent === "free") { const s = social(text, ctx, meta); if (s) return s; }
  if (intent === "explain_self") return C.explainSelfInvite;
  if (ctx.kind === "seg") {
    const sg = C.seg[ctx.id] || C.seg.summary;
    if (intent === "example") return open + sg.example;
    if (intent === "meaning") return open + sg.meaning;
    if (prevIntent === "explain_self") return C.explainSelfReply.replace("{key}", KEYPOINT[ctx.id] || "");
    return C.free.replace("{focus}", sg.meaning);
  }
  const it = ctx.item;
  if (!it) {
    if (intent === "similar") return C.similar["range 범위"];
    return "오답 노트에서 이야기하고 싶은 문제의 ‘이 문제로 AI와 이야기하기’를 눌러 줄래? 그 문제를 같이 볼게.";
  }
  const hints = it.hints || [it.explain, it.explain, it.explain];
  if (intent === "why_wrong") {
    const r = rec(it.id), a = r.attempts[0], resp = a ? a.resp : null;
    const why = (it.wrongWhy && (it.wrongWhy[resp] || it.wrongWhy._)) || "";
    return C.whyWrong.replace("{resp}", optText(it, resp)).replace("{why}", why).replace("{hint0}", it.hints ? it.hints[0] : "해설을 한 문장씩 같이 읽어 보자.");
  }
  if (intent === "similar") return C.similar[it.kc] || C.similar["range 범위"];
  const said = answerIn(text, it);
  if (intent === "check" || (intent === "free" && said)) {
    const r = rec(it.id);
    const resp = said || r.sel || (r.attempts.length ? r.attempts[r.attempts.length - 1].resp : null);
    if (!resp) return C.askAnswerFirst;
    if (isCorrect(it, resp)) return C.checkRight.replace("{explain}", it.explain);
    const lv = nextHint(it.id); meta.hint_level = lv + 1;
    return C.checkWrong.replace("{hint}", hints[lv]);
  }
  if (intent === "start") { const lv = nextHint(it.id, af ? 0 : null); meta.hint_level = lv + 1; return open + hints[lv]; }
  if (prevIntent === "explain_self") return C.explainSelfReply.replace("{key}", it.explain);
  if (af) return C.askAnswerFirst;
  const lv = nextHint(it.id); meta.hint_level = lv + 1;
  return C.free.replace("{focus}", hints[lv]);
}
function mateWrap(t, e) {
  if (t.id === "quiz" && e.quiz) return "퀴즈 하나 낼게! " + e.quiz + " 나도 정답은 몰라서, 같이 확인해 보자.";
  return t.open + e.core + t.close;
}
function mateScript(info, ctx, text, intent, af, prevIntent, meta) {
  const M = SCRIPT.mate, t = info.type;
  if (intent === "free") { const s = social(text, ctx, meta); if (s) return s; }
  const ek = activeErrorKey(ctx), st = ek ? (S.mateErr[ek] || {}) : null, E = ek ? MATE_ERRORS[ek] : null;
  if (ek && st.expressed && !st.corrected && intent !== "explain_self" && E.detect.test(text)) { markCorrected(ek, "script"); meta.student_corrected = true; return E.accept; }
  if (intent === "explain_self") return M.explainSelfInvite;
  if (ctx.kind === "seg") {
    if (ek && !st.expressed) { markExpressed(ek, "script"); meta.expressed_error = true; return mateWrap(t, E); }
    if (ek && !st.corrected && intent === "free") return M.stillBelieve.replace("{core2}", E.core);
    if (prevIntent === "explain_self") return M.explainSelfReply.replace("{echo}", echo(text));
    if (intent === "example") return M.example;
    return M.segUnderstanding[ctx.id] || M.free;
  }
  const it = ctx.item;
  if (!it) {
    if (intent === "similar") return M.similar["range 범위"];
    return "오답 노트에서 같이 보고 싶은 문제의 ‘이 문제로 AI와 이야기하기’를 눌러 줄래? 그 문제로 같이 이야기하자.";
  }
  const r = rec(it.id);
  if (af && (intent === "check" || intent === "free")) return M.checkNoAnswer;
  if (af && intent === "start") return M.start;
  if (ek && !st.expressed && (intent === "check" || intent === "start" || intent === "free")) {
    markExpressed(ek, "script"); meta.expressed_error = true;
    const tpl = r.sel === E.wrongAnswer ? M.sameAsMe : M.differFromMe;
    return tpl.replace("{wrong}", optText(it, E.wrongAnswer)).replace("{core}", E.core);
  }
  if (ek && !st.corrected && intent === "free") return M.stillBelieve.replace("{core2}", E.core);
  if (intent === "check") return M.check;
  if (intent === "start") return M.start;
  if (intent === "why_wrong") return M.whyWrong;
  if (intent === "similar") return M.similar[it.kc] || M.similar["range 범위"];
  if (prevIntent === "explain_self") return M.explainSelfReply.replace("{echo}", echo(text));
  return M.free;
}

/* ===== 먼저 말 걸기(두 조건 같은 시점, 같은 횟수) ===== */
function proactive(key) {
  if (!S || !agentAvailable() || !proactiveOn(key) || S.proactiveDone[key]) return;
  S.proactiveDone[key] = true;
  const info = agentInfo();
  let text = null;
  if (info.role === "coach") text = SCRIPT.coach.proactive[key];
  else {
    const E = settings.errors[key] && MATE_ERRORS[key];
    if (E) {
      if (key === "learn1" || key === "learn2") text = mateWrap(info.type, E);
      else { const sel = rec(key).sel; text = (sel === E.wrongAnswer ? SCRIPT.mate.sameAsMe : SCRIPT.mate.differFromMe).replace("{wrong}", optText(itemById(key), E.wrongAnswer)).replace("{core}", E.core); }
      markExpressed(key, "proactive");
    } else text = SCRIPT.mate.proactiveNeutral[key];
  }
  if (!text) return;
  pushAgentProactive(text, key);
}
function greet() {
  if (!S || S.proactiveDone.greet) return;
  S.proactiveDone.greet = true;
  pushAgentProactive(S.condition === "coach" ? SCRIPT.coach.greet : SCRIPT.mate.greet, "greet");
}
function pushAgentProactive(text, key) {
  pushMsg("agent", text, { proactive: true, caution: key !== "greet" });
  if (isNarrow() && !sheetOpen) { S.unread = (S.unread || 0) + 1; renderFab(); }
  log("responded", "agent-dialog", "에이전트 대화", "interaction", { response: text }, { proactive: true, "context-id": key, engine: "script" }, agentActor());
}

/* ===== 보내기 ===== */
const isNarrow = () => window.matchMedia("(max-width:900px)").matches;
function processAfter(ctx, meta, reply, studentText) {
  const ek = activeErrorKey(ctx);
  if (meta) {
    if (ek && meta.expressed_error) markExpressed(ek, "live");
    if (ek && meta.student_corrected && S.mateErr[ek] && S.mateErr[ek].expressed) markCorrected(ek, "live");
    if (S.condition === "coach" && ctx.item && typeof meta.hint_level === "number" && meta.hint_level > 0) {
      const cur = S.hintLv[ctx.item.id] == null ? -1 : S.hintLv[ctx.item.id];
      S.hintLv[ctx.item.id] = Math.max(cur, Math.min(2, meta.hint_level - 1));
    }
  }
  let leak = false;
  if (S.condition === "mate" && ctx.item && S.stage === "check" && !(meta && meta.student_corrected)) {
    const ans = optText(ctx.item, ctx.item.answer);
    if ((meta && meta.gave_answer) || (ans && reply.includes(ans) && !studentText.includes(ans))) leak = true;
  }
  if (leak) S.leakFlags++;
  return leak;
}
async function agentSend(text, intent) {
  if (!S || busy || !agentAvailable()) return;
  text = String(text || "").trim(); if (!text) return;
  const info = agentInfo();
  if (S.turns >= settings.turnCap) { pushMsg("system", info.role === "coach" ? SCRIPT.coach.capped : SCRIPT.mate.capped); return; }
  intent = intent || "free";
  const prevIntent = lastStudentIntent();
  const ctx = currentContext();
  const masked = maskPII(text);
  const sm = pushMsg("student", text, { intent, maskedText: masked !== text ? masked : undefined });
  S.turns++;
  if (intent === "free") S.typedUses++; else S.chipUses++;
  log("asked", "agent-dialog", "에이전트 대화", "interaction", { response: masked }, { intent, turn: S.turns, "context-id": ctx.id, chars: text.length });
  if (masked !== text) pushMsg("system", SCRIPT.common.piiMasked);
  if (DISTRESS.test(text)) { S.safetyFlags++; pushMsg("system", SCRIPT.common.safety); log("commented", "safety-flag", "안전 알림", "interaction", null, { reason: "distress-keyword" }); }
  const af = answerFirstActive(ctx) && (intent === "start" || intent === "check" || intent === "free");
  if (af) S.afApplied++;
  busy = true; renderAgent();
  if (settings.engine === "live" && sampleState === "pending") await waitRuntime();
  let used = engineNow(), result = null;
  if (used === "live") { result = await liveReply(ctx, masked, intent, af, sm.id); if (!result.ok) used = "script"; }
  if (used === "script") {
    lastPrompt = buildPrompt(ctx, masked, intent, af, sm.id);
    const r = scriptReply(ctx, text, intent, af, prevIntent);
    const m = pushMsg("agent", "", { pending: true, caution: true });
    await delay(420 + Math.min(900, r.text.length * 6));
    m.pending = false; updateMsgText(m, r.text);
    result = { ok: true, msg: m, text: r.text, meta: r.meta };
  }
  busy = false; ctl = null;
  const leak = processAfter(ctx, result.meta, result.text, text);
  log("responded", "agent-dialog", "에이전트 대화", "interaction", { response: result.text }, { engine: used === "live" ? (engineKind === "relay" ? "relay" : "live") : used, model: result.msg && result.msg.tier || null, "context-id": ctx.id, meta: result.meta || null, "possible-answer-leak": leak, chars: result.text.length }, agentActor());
  persist();
  renderAgent();
  if (!isNarrow() || sheetOpen) { const tIn = $("#chatIn"); if (tIn) tIn.focus(); }
}

/* ===== 연구자 보기 ===== */
function sw(k, label) { return '<button class="switch" role="switch" aria-checked="' + (!!settings[k]) + '" data-act="toggle" data-k="' + k + '" aria-label="' + esc(label) + '"></button>'; }
function segCtl(k, opts, label) { return '<div class="seg-ctl" role="group" aria-label="' + esc(label) + '">' + opts.map(([v, l]) => '<button data-act="set" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (String(settings[k]) === String(v)) + '">' + l + "</button>").join("") + "</div>"; }
function settingRow(name, ctlHtml, desc) { return '<div class="setting"><span class="sname">' + name + "</span>" + ctlHtml + '<span class="sdesc">' + desc + "</span></div>"; }
function relayCtl() {
  const r = relayConf(), own = !!settings.relayUrl;
  return '<div class="relay-f"><label class="sr-only" for="relayUrl">AI 서버 주소</label><input class="relay-in" id="relayUrl" name="relayUrl" type="url" inputmode="url" autocomplete="off" spellcheck="false" placeholder="https://…lambda-url…on.aws/" value="' + esc(settings.relayUrl || "") + '">' +
    '<label class="sr-only" for="relayCode">접속 코드</label><input class="relay-in short" id="relayCode" name="relayCode" type="password" autocomplete="off" placeholder="접속 코드(있으면)…" value="' + esc(settings.relayCode || "") + '">' +
    '<div class="row"><button class="btn btn-secondary btn-sm" data-act="relay-save">저장</button><button class="btn btn-secondary btn-sm" data-act="relay-test"' + (r.url ? "" : " disabled") + '>연결 시험</button>' + (own ? '<button class="btn btn-ghost btn-sm" data-act="relay-clear">비우기</button>' : "") + "</div>" +
    '<p class="small muted" id="relayStatus" aria-live="polite" style="margin:0">' + (r.url ? (own ? "이 브라우저 설정 주소를 써요." : "소스에 넣은 기본 주소를 써요.") : "주소 없음") + "</p></div>";
}
function engineStateText() {
  if (!inArtifact()) {
    if (engineKind === "relay" && sampleState === "ready") return "AI 서버로 실시간 대화를 해요.";
    if (engineKind === "relay") return "AI 서버를 쓸 수 없어 대본 응답으로 돌고 있어요.";
    return "AI 서버 주소가 없어 대본 응답으로 돌아요. 아래에 주소를 넣으면 실시간으로 대화해요.";
  }
  if (sampleState === "pending") return "연결 확인 중이에요.";
  if (sampleState === "ready") return "이 화면에서 실시간 AI를 쓸 수 있어요. 처음 쓸 때 허용을 물어봐요.";
  if (sampleState === "denied") return "허용되지 않아 대본 응답으로 돌고 있어요.";
  return "이 화면에서는 실시간 AI를 쓸 수 없어 대본 응답으로 돌아요. claude.ai에서 열면 쓸 수 있어요.";
}
function drawerSettings() {
  const cur = S ? '<div class="note-box"><h3>지금 세션</h3><p class="prose-p small" style="margin:0;line-height:1.7">가명 식별자 ' + esc(S.student.pid) + ", 조건 " + (S.condition === "coach" ? "러닝코치" : "러닝메이트") + ", 에이전트 " + esc(S.agentType ? agentInfo().sub : "아직 고르지 않음") + ", 단계 " + STAGE_NAME[S.stage] + ", 응답 " + (engineNow() === "live" ? "실시간 AI" : "대본") + "</p>" +
    (S.condition !== settings.condition ? '<p class="prose-p small" style="margin:0">설정은 ' + (settings.condition === "coach" ? "러닝코치" : "러닝메이트") + '로 바뀌었어요. 새로 시작해야 적용돼요.</p><div><button class="btn btn-primary btn-sm" data-act="restart-cond">이 조건으로 새로 시작</button></div>' : "") + "</div>" : '<p class="muted small">아직 들어온 학생이 없어요. 표지에서 들어가면 여기서 조건을 바꿔 볼 수 있어요.</p>';
  return '<p class="prose-p small muted" style="margin:0;line-height:1.7">여기서 바꾼 값은 이 브라우저에만 저장돼요. 조건과 선택 화면 설정은 새로 시작하는 세션부터 적용돼요.</p>' + cur +
    '<div class="section-block" style="gap:16px">' +
    settingRow("실험 조건", segCtl("condition", [["coach", "러닝코치"], ["mate", "러닝메이트"]], "실험 조건"), "실제 투입에서는 학급 단위로 정해지고 학생이 바꿀 수 없어요. 두 조건은 같은 화면, 같은 모델, 같은 기억 방식을 쓰고 역할과 하네스만 달라요.") +
    settingRow("코치 조건에도 선택 화면", sw("coachChoice", "코치 조건 선택 화면"), "끄면 회의 결정대로 러닝코치 1종을 소개만 해요. 켜면 러닝메이트와 같은 형식으로 코치 4종 가운데 고르게 해요. 친구 유형 선택이 러닝메이트에만 있으면 선택 자체가 동기와 유능감을 올리는 효과(Patall 외, 2008)가 효능감·친밀감 결과에 섞여요.") +
    settingRow("먼저 답하기 규칙", sw("answerFirst", "먼저 답하기 규칙"), "켜면 학생이 확인 문항의 답을 고르기 전에는 두 에이전트 모두 풀이 방향을 말하지 않고 학생 생각부터 물어요(Buçinca 외, 2021; Lehmann 외, 2025; 영국 교육부 기준).") +
    settingRow("답안 칸 붙여넣기 막기", sw("blockPaste", "붙여넣기 막기"), "대화창의 문장을 복사해 서술형 답안 칸에 붙이는 것을 막아요(Lehmann 외, 2025).") +
    settingRow("에이전트가 먼저 말 걸기", sw("proactive", "먼저 말 걸기"), "알아봐요 1·2에 들어갈 때와, 오류를 지정한 확인 문항에서 처음 답을 골랐을 때 두 조건 모두 같은 시점에 한 번씩 말을 걸어요. 러닝메이트의 지정 오류가 드러나는 시점이에요.") +
    settingRow("대화 횟수 상한", '<input class="num-in" type="number" id="setCap" min="5" max="100" value="' + settings.turnCap + '" aria-label="대화 횟수 상한">', "학생 발화 기준이에요. 상한을 고정하면 대화 횟수를 종속변인으로 쓸 수 없으니 회의에서 둘 중 하나로 정해야 해요.") +
    settingRow("응답 방식", segCtl("engine", [["live", "실시간 AI"], ["script", "대본"]], "응답 방식"), (inArtifact() ? "claude.ai에서는 보는 사람의 Claude 사용량을 써요. " : "배포판에서는 AI 서버가 연구팀 API 계정으로 불러요. ") + engineStateText() + " 대본 응답은 미리 쓴 문장으로 같은 규칙을 흉내 내요.") +
    settingRow("모델 등급", segCtl("tier", [["quick", "빠름"], ["default", "기본"]], "모델 등급"), "빠름은 1~2초 안에 답하고, 기본은 5~60초 걸리지만 역할 규칙을 더 잘 지켜요.") +
    settingRow("AI 서버", relayCtl(), inArtifact() ? "claude.ai 안에서는 쓰지 않고 내장 AI를 써요. GitHub 주소나 내려받은 파일에서 쓰는 설정이에요." : "중계 서버(예: AWS Lambda 함수 URL) 주소예요. 여기 넣은 값은 이 브라우저에만 저장돼요. 학생 기기 전체에 쓰려면 소스의 RELAY_DEFAULT에 넣고 다시 배포해요.") +
    settingRow("차시 끝 조작 확인 문항", sw("manipCheck", "조작 확인 문항"), "마침 화면에서 ‘이 AI는 나보다 잘 아는 것 같았다’, ‘이 AI가 나를 평가한다고 느꼈다’를 5점 척도로 물어요.") +
    "</div>" +
    (S ? '<div class="row"><button class="btn btn-secondary btn-sm" data-act="restart-ask">지금 세션 처음부터 다시</button><button class="btn btn-ghost btn-sm" data-act="switch-student">표지로 나가기</button></div>' : "");
}
function hSwitch(r, k, label, disabled) { const on = !!settings.harness[r][k]; return '<button class="switch" role="switch" aria-checked="' + on + '" data-act="h-toggle" data-r="' + r + '" data-k="' + k + '" aria-label="' + esc(label) + '"' + (disabled ? " disabled" : "") + "></button>"; }
function hSelect(r, k, opts, label) { const v = r ? settings.harness[r][k] : settings.harness[k]; return '<select class="h-sel" data-hr="' + (r || "") + '" data-hk="' + k + '" aria-label="' + esc(label) + '">' + opts.map(o => '<option value="' + o[0] + '"' + (String(o[0]) === String(v) ? " selected" : "") + ">" + o[1] + "</option>").join("") + "</select>"; }
function hDiff(r, k) { return settings.harness[r][k] !== DEFAULT_SETTINGS.harness[r][k] ? ' <span class="h-diff">바꿈</span>' : ""; }
function drawerHarness() {
  const hc = settings.harness.coach, hm = settings.harness.mate;
  const errRows = Object.keys(MATE_ERRORS).map(k => {
    const e = MATE_ERRORS[k], st = S && S.mateErr[k];
    const where = k === "learn1" ? "알아봐요 1" : k === "learn2" ? "알아봐요 2" : "확인 " + k.slice(1);
    const stTxt = !S ? "-" : !st || !st.expressed ? "미제시" : st.corrected ? "제시됨, 학생이 바로잡음" : "제시됨";
    return "<tr><td>" + where + "</td><td>" + esc(e.label) + '<div class="muted small">' + esc(e.belief) + "</div></td><td>" +
      '<button class="switch" role="switch" aria-checked="' + (!!settings.errors[k]) + '" data-act="toggle-err" data-id="' + k + '" aria-label="' + esc(where + " 오류 지정") + '"></button></td><td>' + stTxt + "</td></tr>";
  }).join("");
  const promptText = lastPrompt || (S && agentAvailable() ? buildPrompt(currentContext(), "(학생이 보낼 메시지)", "free", answerFirstActive(currentContext()), null) : "");
  const pct = [100, 90, 80, 70, 60, 50].map(v => [v, v + "%"]), steps = [[1, "1단계"], [2, "2단계"], [3, "3단계"]];
  const row = (name, c, m, note) => "<tr><th scope=\"row\">" + name + (note ? '<div class="muted small">' + note + "</div>" : "") + "</th><td>" + c + "</td><td>" + m + "</td></tr>";
  const same = ["key", "hints", "judge", "textbook", "errors"].every(k => hc[k] === hm[k]) && hc.maxHint === hm.maxHint;
  const rows =
    row("정답지 보기", hSwitch("coach", "key", "러닝코치 정답지 보기") + hDiff("coach", "key"), hSwitch("mate", "key", "러닝메이트 정답지 보기") + hDiff("mate", "key"), "확인 문항에서 정답과 해설을 프롬프트에 넣어요") +
    row("단계별 힌트", hSwitch("coach", "hints", "러닝코치 단계별 힌트", !hc.key) + " " + hSelect("coach", "maxHint", steps, "러닝코치 힌트 최대 단계") + hDiff("coach", "maxHint"), hSwitch("mate", "hints", "러닝메이트 단계별 힌트", !hm.key) + " " + hSelect("mate", "maxHint", [[0, "0단계"]].concat(steps), "러닝메이트 힌트 최대 단계") + hDiff("mate", "maxHint"), "정답지를 볼 때만 켤 수 있어요") +
    row("정오 판정", hSwitch("coach", "judge", "러닝코치 정오 판정", !hc.key) + hDiff("coach", "judge"), hSwitch("mate", "judge", "러닝메이트 정오 판정", !hm.key) + hDiff("mate", "judge"), "끄면 맞다, 틀리다 대신 이유를 되물어요") +
    row("교과서 보유 비율", hSelect("coach", "textbook", pct, "러닝코치 교과서 보유 비율") + hDiff("coach", "textbook"), hSelect("mate", "textbook", pct, "러닝메이트 교과서 보유 비율") + hDiff("mate", "textbook"), "구간 글을 문장 단위로 나눠 정해진 순서로 실제로 빼요") +
    row("지정 오류", hSwitch("coach", "errors", "러닝코치 지정 오류") + hDiff("coach", "errors"), hSwitch("mate", "errors", "러닝메이트 지정 오류") + hDiff("mate", "errors"), "아래 표에서 켠 구간과 문항에만 넣어요");
  const preview = S ? (function () { const role = agentInfo().role, seg = SEGMENTS.find(x => x.id === "learn1"); return '<details class="h-prev"><summary>' + (role === "coach" ? "러닝코치" : "러닝메이트") + "가 받는 알아봐요 1 교과서 글 보기</summary><p class=\"prose-p small\">" + esc(ablate(seg.text, H(role).textbook, seg.id)) + "</p></details>"; })() : "";
  return '<p class="prose-p small muted" style="margin:0;line-height:1.7">두 조건은 같은 모델, 같은 화면을 쓰고 여기서 정한 항목만 달라요. ‘모름’은 프롬프트 지시만이 아니라 넣는 자료(정답지, 힌트, 교과서 문장)를 실제로 빼서 만들어요. 바꾼 값은 다음 AI 응답부터 적용되고 이 브라우저에 저장돼요. 대본 응답은 힌트 단계 상한만 따라요.</p>' +
    '<div class="tbl-wrap"><table class="tbl h-tbl"><caption class="sr-only">역할별 하네스 설정</caption><thead><tr><th scope="col">항목</th><th scope="col">러닝코치</th><th scope="col">러닝메이트</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
    (same ? '<p class="status no" style="margin:0"><span class="dot" aria-hidden="true"></span><span><b>두 역할의 하네스가 같아요.</b> 이 상태로는 능력 제약과 페르소나를 나눠 볼 수 없어요. 페르소나만 다른 조건을 일부러 만드는 경우가 아니라면 다시 확인해 주세요.</span></p>' : "") +
    '<div class="h-common"><h3>기억(두 역할 공통)</h3><div class="setting-row-h"><span>최근 대화</span>' + hSelect("", "memShort", [[0, "보내지 않음"], [5, "5개"], [10, "10개"], [20, "20개"]], "단기 기억 대화 수") + '<span>장기 기억</span><button class="switch" role="switch" aria-checked="' + !!settings.harness.memLong + '" data-act="h-mem" aria-label="장기 기억"></button></div></div>' +
    '<div class="row"><button class="btn btn-secondary btn-sm" data-act="h-reset">기본값으로 되돌리기</button>' + (S ? '<span class="small muted">지금 세션 역할: ' + (agentInfo().role === "coach" ? "러닝코치" : "러닝메이트") + "</span>" : "") + "</div>" + preview +
    "<h3>지정 오류</h3>" +
    '<div class="tbl-wrap"><table class="tbl"><caption class="sr-only">지정 오류 목록</caption><thead><tr><th scope="col">위치</th><th scope="col">오류</th><th scope="col">켜기</th><th scope="col">이번 세션</th></tr></thead><tbody>' + errRows + "</tbody></table></div>" +
    '<p class="prose-p small muted" style="margin:0;line-height:1.7">문항 오류를 끄면 그 문항의 먼저 말 걸기도 두 조건 모두에서 빠져요. 오류를 넣는 비율은 파일럿에서 조정해요(박태준, 2024).</p>' +
    "<h3>기억 방식(두 조건 같음)</h3>" +
    '<ol class="plain small"><li>장기 기억: 학생 계정 단위로 진도, 문항별 제출 기록, 헷갈린 흔적, 학생이 바로잡아 준 오류, 스스로 점검 결과만 남겨요. 사적인 이야기와 관계는 남기지 않아요.</li><li>단기 기억: 최근 대화를 위에서 정한 개수만큼 매번 함께 보내요.</li><li>시제품에서는 이 브라우저에 저장하고, 실제 구현에서는 서버의 학생별 저장소로 옮겨요.</li></ol>' +
    "<h3>에이전트에게 보내는 맥락</h3>" +
    '<p class="prose-p small muted" style="margin:0">' + (lastPrompt ? "마지막으로 보낸 맥락이에요." : "아직 보낸 맥락이 없어 지금 화면 기준으로 만든 미리보기예요.") + "</p>" +
    (promptText ? '<pre class="prompt-view" tabindex="0">' + esc(promptText) + "</pre>" : '<p class="muted small">학습 단계에 들어가면 볼 수 있어요.</p>');
}
const TIME_FMT = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
function drawerLogs() {
  if (!S) return '<p class="muted small">기록이 없어요.</p>';
  const list = S.logs.slice().reverse().slice(0, 300);
  return '<p class="prose-p small muted" style="margin:0;line-height:1.7">xAPI 형식(행위자, 동사, 대상, 결과, 맥락)으로 남겨요. 행위자는 가명 식별자이고, 주소의 xapi.example.org는 자리표시라 실제 구현 때 연구팀 주소로 바꿔요. 동사는 ADL 어휘를 썼고, 대화용 공식 프로파일이 없어 확장 키는 연구팀이 정의해 부록으로 공개하는 것을 전제로 했어요.</p>' +
    '<div class="row"><span class="small">문장 ' + S.logs.length + '개</span><button class="btn btn-secondary btn-sm" data-act="copy-json">JSON 복사</button>' +
    (canSave() ? '<button class="btn btn-secondary btn-sm" data-act="dl-json">JSON 내려받기</button><button class="btn btn-secondary btn-sm" data-act="dl-csv">CSV 내려받기</button>' : "") + "</div>" +
    '<div class="log-list">' + list.map(st => {
      const t = TIME_FMT.format(new Date(st.timestamp)), v = st.verb.display["ko-KR"], o = st.object.definition.name["ko-KR"];
      const who = st.actor.account.homePage.endsWith("/agents") ? "AI " : "";
      return '<details class="log-row"><summary><span class="t">' + t + '</span><span class="v">' + who + esc(v) + '</span><span class="o">' + esc(o) + (st.result && st.result.response ? " · " + esc(String(st.result.response).slice(0, 40)) : "") + "</span></summary><pre>" + esc(JSON.stringify(st, null, 2)) + "</pre></details>";
    }).join("") + "</div>";
}
function stageDur(k) { const t = S.stageTime[k]; if (!t) return null; return (t.end || (S.stage === k ? now() : t.start)) - t.start; }
function drawerSummary() {
  if (!S) return '<p class="muted small">아직 요약할 기록이 없어요.</p>';
  const st = S.chat.filter(x => x.who === "student"), ag = S.chat.filter(x => x.who === "agent" && !x.pending);
  const sc = st.reduce((a, x) => a + x.text.length, 0), ac = ag.reduce((a, x) => a + x.text.length, 0);
  const firstOk = CHECK_ITEMS.filter(it => S.items[it.id] && S.items[it.id].attempts[0] && S.items[it.id].attempts[0].correct).length;
  const form = S.formSubmitted ? FORM_ITEMS.filter(it => S.items[it.id].attempts[0].correct).length : null;
  const errs = Object.keys(S.mateErr);
  const M = [
    [firstOk + " / " + CHECK_ITEMS.length, "확인 문항 첫 시도 정답(AI 사용 가능)"],
    [form == null ? "-" : form + " / " + FORM_ITEMS.length, "형성평가 점수(AI 없음)" + (S.formEstimate != null ? ", 예상 " + S.formEstimate : "")],
    [st.length + " / " + ag.length, "학생 발화 / AI 발화(먼저 말 걸기 " + ag.filter(x => x.proactive).length + ")"],
    [ac ? (sc / ac).toFixed(2) : "-", "대화 균형(학생 글자 수 ÷ AI 글자 수)"],
    [S.chipUses + " / " + S.typedUses, "빠른 질문 버튼 / 직접 입력"],
    [String(S.afApplied), "먼저 답하기 규칙이 걸린 횟수"],
    [S.condition === "mate" ? errs.filter(k => S.mateErr[k].expressed).length + " / " + errs.filter(k => S.mateErr[k].corrected).length : "-", "지정 오류 제시 / 대화 중 바로잡힘"],
    [S.condition === "mate" ? String(S.leakFlags) : "-", "러닝메이트가 답을 먼저 말한 의심"],
    [S.teacherCalls + " / " + S.safetyFlags, "선생님께 알리기 / 안전 알림"],
    [S.manip.m1 ? S.manip.m1 + " / " + (S.manip.m2 || "-") : "-", "조작 확인(더 잘 앎 / 평가받는 느낌, 5점)"]
  ];
  const itemRows = ITEMS.map(it => {
    const r = S.items[it.id]; if (!r || !r.attempts.length) return "";
    const a0 = r.attempts[0], last = r.attempts[r.attempts.length - 1];
    return "<tr><td>" + (it.stage === "check" ? "확인 " : "형성 ") + it.no + '</td><td class="mono">' + esc(optText(it, a0.resp)) + "</td><td>" + (a0.correct ? "맞음" : "틀림") + "</td><td>" + r.attempts.length + "</td><td>" + (last.correct ? "맞음" : "틀림") + "</td><td>" + secs(a0.sinceView) + "</td><td>" + (r.conf == null ? "-" : ["확실", "헷갈림", "찍음"][r.conf]) + "</td><td>" + agentTurnsOn(it.id) + "</td></tr>";
  }).join("");
  return '<div class="metric-grid">' + M.map(m => '<div class="metric"><span class="mv">' + m[0] + '</span><span class="ml">' + m[1] + "</span></div>").join("") + "</div>" +
    "<h3>단계별 소요 시간</h3>" +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">단계</th><th scope="col">시간</th></tr></thead><tbody>' + ORDER.map(k => "<tr><td>" + STAGE_NAME[k] + "</td><td>" + secs(stageDur(k)) + "</td></tr>").join("") + "</tbody></table></div>" +
    '<p class="prose-p small muted" style="margin:0">소요 시간은 결과 변인이 아니라 조작 확인 지표로 봐요(Kestin 외, 2025).</p>' +
    "<h3>문항별 기록</h3>" +
    (itemRows ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">문항</th><th scope="col">첫 답</th><th scope="col">첫 시도</th><th scope="col">시도</th><th scope="col">최종</th><th scope="col">첫 제출까지</th><th scope="col">확신</th><th scope="col">문항 대화</th></tr></thead><tbody>' + itemRows + "</tbody></table></div>" : '<p class="muted small">아직 제출한 문항이 없어요.</p>');
}
function renderDrawer() {
  const root = $("#drawerRoot"); if (!root) return;
  if (!drawerOpen) { root.innerHTML = ""; return; }
  const tabs = [["settings", "설정"], ["classes", "수업 관리"], ["harness", "하네스"], ["logs", "기록"], ["summary", "요약"]];
  const body = { settings: drawerSettings, classes: drawerClasses, harness: drawerHarness, logs: drawerLogs, summary: drawerSummary }[drawerTab]();
  const scroll = $("#tabpanel") ? $("#tabpanel").scrollTop : 0;
  root.innerHTML = '<div class="scrim" data-act="drawer-close" aria-hidden="true"></div><div class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawerTitle">' +
    '<div class="drawer-head"><div><h2 id="drawerTitle">연구자 보기</h2><div class="muted">학생 화면에는 없는 연구팀용 화면이에요</div></div><button class="btn btn-ghost btn-sm drawer-close" data-act="drawer-close">닫기</button></div>' +
    '<div class="tabs" role="tablist" aria-label="연구자 보기 탭">' + tabs.map(([k, l]) => '<button role="tab" id="tab-' + k + '" aria-selected="' + (drawerTab === k) + '" aria-controls="tabpanel" tabindex="' + (drawerTab === k ? 0 : -1) + '" data-act="tab" data-tab="' + k + '">' + l + "</button>").join("") + "</div>" +
    '<div class="drawer-body" id="tabpanel" role="tabpanel" aria-labelledby="tab-' + drawerTab + '">' + body + "</div></div>";
  const p = $("#tabpanel"); if (p) p.scrollTop = scroll;
}
function openDrawer(tab) { lastFocus = document.activeElement; drawerOpen = true; if (tab) drawerTab = tab; renderDrawer(); const b = $("#tab-" + drawerTab); if (b) b.focus(); }
function closeDrawer() { drawerOpen = false; renderDrawer(); if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); }
function toCSV() {
  const H = ["timestamp", "actor", "verb", "object", "response", "success", "score", "duration", "stage", "condition", "agent_type", "engine", "context_id", "intent", "proactive"];
  const q = v => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const X = (st, k) => st.context.extensions[XAPI.ext + k];
  return [H.join(",")].concat(S.logs.map(st => [st.timestamp, st.actor.account.name, st.verb.display["ko-KR"], st.object.id.replace(XAPI.act, ""),
    st.result && st.result.response, st.result && st.result.success, st.result && st.result.score ? st.result.score.raw : "", st.result && st.result.duration,
    X(st, "stage"), X(st, "condition"), X(st, "agent-type"), X(st, "engine"), X(st, "context-id"), X(st, "intent"), X(st, "proactive")].map(q).join(","))).join("\n");
}
async function saveFile(kind) {
  if (!S || !canSave()) return;
  const data = kind === "csv" ? "﻿" + toCSV() : JSON.stringify(S.logs, null, 2);
  if (!downloadsNs) { localSave("learning-log-" + S.student.pid + "." + kind, data); toast("파일을 내려받았어요."); return; }
  try { await downloadsNs.save({ filename: "learning-log-" + S.student.pid + "." + kind, data }); toast("내려받기를 요청했어요."); }
  catch (e) { if (!(e && e.code === "declined")) toast("내려받지 못했어요. JSON 복사를 써 주세요."); }
}
function copyText(txt) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(() => toast("복사했어요."), () => showCopyFallback(txt));
  } else showCopyFallback(txt);
}
function showCopyFallback(txt) {
  showModal('<h2 id="mTitle">직접 복사해 주세요</h2><p>이 화면에서는 자동 복사가 막혀 있어요. 아래 내용을 모두 선택해 복사해 주세요.</p><textarea class="ta" id="copyBox" readonly style="min-height:220px;font-family:var(--font-code);font-size:.75rem">' + esc(txt) + '</textarea><div class="actions"><button class="btn btn-primary" data-act="modal-close">닫기</button></div>');
  const b = $("#copyBox"); if (b) { b.focus(); b.select(); }
}

/* ===== 모달, 보기 설정 ===== */
function showModal(html, onOk) {
  if (!modalState) lastFocus = document.activeElement;
  modalState = { onOk };
  $("#modalRoot").innerHTML = '<div class="modal-wrap"><div class="scrim" data-act="modal-close" aria-hidden="true"></div><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle">' + html + "</div></div>";
  const f = $("#modalRoot .modal [data-act='modal-ok']") || $("#modalRoot .modal button");
  if (f) f.focus();
}
function closeModal() { $("#modalRoot").innerHTML = ""; modalState = null; if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); }
function confirmModal(title, body, okLabel, cancelLabel, onOk) {
  showModal('<h2 id="mTitle">' + title + "</h2><p>" + body + '</p><div class="actions"><button class="btn btn-secondary" data-act="modal-close">' + cancelLabel + '</button><button class="btn btn-primary" data-act="modal-ok">' + okLabel + "</button></div>", onOk);
}
function viewModalHtml() {
  const opt = (k, v, l) => '<button data-act="view-set" data-k="' + k + '" data-v="' + v + '" aria-pressed="' + (view[k] === v) + '">' + l + "</button>";
  const row = (label, inner) => '<div class="view-row"><span class="vl">' + label + '</span><div class="seg-ctl" role="group" aria-label="' + label + '">' + inner + "</div></div>";
  return '<h2 id="mTitle">보기 설정</h2>' +
    row("글자 크기", opt("size", "m", "보통") + opt("size", "l", "크게") + opt("size", "xl", "아주 크게")) +
    row("줄 간격", opt("leading", "normal", "보통") + opt("leading", "wide", "넓게")) +
    row("화면 밝기", opt("theme", "auto", "앱 설정 따름") + opt("theme", "light", "밝게") + opt("theme", "dark", "어둡게")) +
    row("대비", opt("contrast", "normal", "보통") + opt("contrast", "high", "높게")) +
    (canSpeak() ? row("읽어 주기", '<button data-act="view-set" data-k="tts" data-v="on" aria-pressed="' + (!!view.tts) + '">켜기</button><button data-act="view-set" data-k="tts" data-v="off" aria-pressed="' + (!view.tts) + '">끄기</button>') : '<p class="small muted">이 기기에서는 읽어 주기를 쓸 수 없어요.</p>') +
    '<p class="small muted">이 브라우저에 저장돼요. 실제 운영에서는 학생 계정별로 저장해요. 두 조건 모두 같은 설정을 써요.</p>' +
    '<div class="actions"><button class="btn btn-primary" data-act="modal-close">닫기</button></div>';
}

/* ===== 들어가기, 다시 시작 ===== */
function enterLesson(cls, no) {
  const student = { classCode: cls, number: no, key: cls + "-" + no, pid: pidOf(cls, no) };
  const saved = load(sKey(student), null);
  if (saved && saved.v === 1) {
    S = saved;
    S.chat.forEach(m => { if (m.pending) { m.pending = false; if (!m.text) m.text = "(응답이 끊겼어요)"; } });
    if (S.stage === "learn") S.segAt = now();
    log("resumed", "lesson", LESSON.title, "lesson", null, { "resume-stage": S.stage });
    toast("멈춘 곳에서 이어서 시작해요.");
  } else {
    S = newSession(student);
    log("launched", "lesson", LESSON.title, "lesson", null, { "coach-choice": S.coachChoice });
  }
  courseId = null; homeOpen = true; page = "dash"; toolTab = null; review = null;
  persist();
  renderAll(); focusMain();
}
function restartSession(cond) {
  if (!S) return;
  if (ctl) { try { ctl.abort(); } catch (e) { /* 무시 */ } }
  busy = false;
  const st = S.student;
  drop(sKey(st));
  if (cond) settings.condition = cond;
  S = newSession(st);
  lastPrompt = "";
  log("launched", "lesson", LESSON.title, "lesson", null, { "coach-choice": S.coachChoice, restart: true });
  persist(); renderAll(); focusMain();
}

/* ===== 이벤트 ===== */
const ACT = {
  "notice-next"() { if (S.condition === "coach" && !S.coachChoice) S.agentType = "coach"; enterStageNoLog("choose"); },
  "choose-start"() {
    if (S.condition === "coach" && !S.coachChoice) S.agentType = "coach";
    else {
      const sel = $('input[name="agentType"]:checked');
      if (!sel) { const m = $("#chooseMsg"); if (m) m.textContent = "하나를 골라 주세요."; return; }
      S.agentType = sel.value;
    }
    log("preferred", "agent-type", "에이전트 유형 선택", "interaction", { response: agentInfo().sub }, { "agent-type": S.agentType, "choice-offered": !(S.condition === "coach" && !S.coachChoice) });
    if (!narrowTools()) toolTab = "ai";
    enterStage("learn");
    greet();
  },
  "seg-go"(el) { goSeg(+el.dataset.i); },
  "seg-prev"() { goSeg(S.seg - 1); },
  "seg-next"() { goSeg(S.seg + 1); },
  "think-reveal"() { S.thinkRevealed = true; persist(); const r = $("#thinkReveal"); if (r) r.hidden = false; log("interacted", "think/reveal", "생각 맞춰 보기", "interaction", { response: S.think.slice(0, 200) }); },
  "trace-step"() { if (S.trace < 15) S.trace++; persist(); updateTrace(); if (S.trace === 1 || S.trace === 15) log("interacted", "trace", "한 번씩 따라가기", "interaction", { response: "회차 " + S.trace }); },
  "trace-all"() { S.trace = 15; persist(); updateTrace(); log("interacted", "trace", "한 번씩 따라가기", "interaction", { response: "끝까지 실행" }); },
  "trace-reset"() { S.trace = 0; persist(); updateTrace(); },
  "act-run"() { runActivity(); },
  "act-target"(el) { const t = $("#actTarget"); if (!t) return; t.hidden = !t.hidden; el.setAttribute("aria-expanded", String(!t.hidden)); el.textContent = t.hidden ? "목표 결과 보기" : "목표 결과 숨기기"; },
  "to-check"() { enterStage("check"); },
  "check-go"(el) { goCheck(+el.dataset.i); },
  "check-prev"() { goCheck(S.checkIdx - 1); },
  "check-next"() { goCheck(S.checkIdx + 1); },
  "check-submit"() { submitCheck(); },
  "to-formative"() {
    if (!CHECK_ITEMS.every(x => checkDone(x.id))) { toast("확인 문항을 먼저 모두 풀어 주세요."); return; }
    confirmModal("형성평가를 시작할까요?", "형성평가는 " + FORM_ITEMS.length + "문항이고 AI 없이 혼자 풀어요. 시작하면 끝날 때까지 AI와 대화할 수 없어요. 시간 제한은 없어요.", "시작하기", "조금 더 볼래요", () => { S.formIdx = 0; enterStage("formative"); });
  },
  "form-go"(el) { goForm(+el.dataset.i); },
  "form-prev"() { goForm(S.formIdx - 1); },
  "form-next"() { goForm(S.formIdx + 1); },
  "form-finish"() { S.formFinishing = true; persist(); renderLesson(); focusMain(); },
  "form-back"() { S.formFinishing = false; persist(); renderLesson(); focusMain(); },
  "form-submit"() { confirmModal("제출할까요?", "제출하면 답을 바꿀 수 없어요. 제출하고 나면 오답 노트에서 정답과 해설을 볼 수 있어요.", "제출하기", "다시 볼래요", submitFormative); },
  "note-talk"(el) {
    S.noteFocus = el.dataset.id; persist(); renderLesson();
    const it = itemById(S.noteFocus);
    pushMsg("system", (it.stage === "check" ? "확인 문항 " : "형성평가 ") + it.no + "번을 함께 보고 있어요.");
    log("interacted", "note/focus", "오답 노트 문항 선택", "interaction", { response: it.id });
    if (isNarrow()) setSheet(true); else { const t = $("#chatIn"); if (t) t.focus(); }
  },
  "note-retry"(el) { const r = rec(el.dataset.id); r.retry = { open: true, sel: null, done: false }; persist(); renderLesson(); },
  "note-retry-submit"(el) {
    const it = itemById(el.dataset.id), r = rec(it.id);
    if (!r.retry || !r.retry.sel) { toast("답을 먼저 골라 주세요."); return; }
    r.retry.done = true; r.retry.correct = isCorrect(it, r.retry.sel);
    log("answered", "item/" + it.id + "/retry", "오답 노트 다시 풀기", "question", { success: r.retry.correct, response: optText(it, r.retry.sel) }, { item: it.id });
    persist(); renderLesson();
  },
  "to-done"() { enterStage("done"); },
  "restart-ask"() { confirmModal("처음부터 다시 할까요?", "이 학생의 기록과 대화를 지우고 차시를 처음부터 시작해요. 연구자 보기의 설정은 그대로예요.", "다시 시작", "취소", () => restartSession()); },
  "restart-cond"() { confirmModal("이 조건으로 새로 시작할까요?", "지금 학생의 기록과 대화를 지우고 " + (settings.condition === "coach" ? "러닝코치" : "러닝메이트") + " 조건으로 차시를 처음부터 시작해요.", "새로 시작", "취소", () => { restartSession(settings.condition); if (drawerOpen) renderDrawer(); }); },
  "switch-student"() { if (ctl) { try { ctl.abort(); } catch (e) { /* 무시 */ } } busy = false; S = null; drop(KEY + ":last"); closeDrawer(); renderAll(); focusMain(); },
  "chip"(el) { agentSend(el.dataset.label, el.dataset.intent); },
  "send"() { const t = $("#chatIn"); if (!t) return; const v = t.value; t.value = ""; agentSend(v, "free"); },
  "stop"() { if (ctl) ctl.abort(); },
  "teacher"() { S.teacherCalls++; pushMsg("system", SCRIPT.common.teacherSent); log("asked", "teacher-help", "선생님께 알리기", "interaction", null, { "context-id": currentContext().id }); },
  "speak-seg"() { const b = $("#segBody"); if (b) speak(b.innerText.replace("이 부분 읽어 주기", "")); },
  "speak-msg"(el) { const m = S.chat.find(x => x.id === el.dataset.mid); if (m) speak(m.text); },
  "fab"() { setSheet(!sheetOpen); if (sheetOpen && S) { S.unread = 0; renderFab(); } },
  "agent-close"() { setSheet(false); },
  "view-open"() { showModal(viewModalHtml()); },
  "view-set"(el) {
    const k = el.dataset.k, v = el.dataset.v;
    view[k] = k === "tts" ? v === "on" : v;
    saveView(); applyView();
    $("#modalRoot .modal").innerHTML = viewModalHtml();
    const again = $('#modalRoot [data-k="' + k + '"][data-v="' + v + '"]'); if (again) again.focus();
    if (S) { renderLesson(); renderAgent(); }
    if (S) log("interacted", "view-setting", "보기 설정", "interaction", { response: k + "=" + v });
  },
  "modal-close"() { closeModal(); },
  "modal-ok"() { const f = modalState && modalState.onOk; closeModal(); if (f) f(); },
  "research-open"() {
    if (researchUnlocked()) { openDrawer(); return; }
    showModal('<h2 id="mTitle">연구자 보기</h2><p>연구팀 코드를 넣어 주세요. 학생 화면에는 필요 없는 메뉴예요.</p><form id="researchGate" class="form" style="background:transparent;border:0;padding:0" novalidate><label for="rgCode">연구팀 코드<input id="rgCode" name="rgCode" type="password" inputmode="numeric" autocomplete="off" maxlength="12" required></label><p class="form-err" id="rgErr" role="alert"></p><div class="actions"><button type="button" class="btn btn-secondary" data-act="modal-close">닫기</button><button type="submit" class="btn btn-primary">열기</button></div></form>');
    const i = $("#rgCode"); if (i) i.focus();
  },
  "drawer-close"() { closeDrawer(); },
  "tab"(el) { drawerTab = el.dataset.tab; renderDrawer(); const b = $("#tab-" + drawerTab); if (b) b.focus(); },
  "set"(el) { const k = el.dataset.k; settings[k] = el.dataset.v; saveSettings(); renderDrawer(); renderAgentStatus(); },
  "toggle"(el) { const k = el.dataset.k; settings[k] = !settings[k]; saveSettings(); renderDrawer(); if (S) renderLesson(); },
  "h-toggle"(el) { const r = el.dataset.r, k = el.dataset.k; settings.harness[r][k] = !settings.harness[r][k]; if (k === "key" && !settings.harness[r].key) { settings.harness[r].hints = false; settings.harness[r].judge = false; } if (k === "hints" && settings.harness[r].hints && !settings.harness[r].maxHint) settings.harness[r].maxHint = 3; saveSettings(); log("interacted", "harness/" + r + "/" + k, "하네스 설정", "interaction", { response: String(settings.harness[r][k]) }); renderDrawer(); },
  "h-mem"() { settings.harness.memLong = !settings.harness.memLong; saveSettings(); renderDrawer(); },
  "relay-save"() {
    settings.relayUrl = ($("#relayUrl").value || "").trim(); settings.relayCode = ($("#relayCode").value || "").trim();
    if (settings.relayUrl && !/^https:\/\//.test(settings.relayUrl) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(settings.relayUrl)) { $("#relayStatus").textContent = "https로 시작하는 주소를 넣어 주세요."; return; }
    saveSettings(); useRelayIfSet(); renderDrawer(); renderAgent(); toast(settings.relayUrl ? "AI 서버 주소를 저장했어요." : "AI 서버 주소를 비웠어요.");
  },
  "relay-clear"() { settings.relayUrl = ""; settings.relayCode = ""; saveSettings(); useRelayIfSet(); renderDrawer(); renderAgent(); },
  async "relay-test"() {
    const st = $("#relayStatus"); if (st) st.textContent = "시험하는 중…";
    const t0 = performance.now();
    try {
      const fn = inArtifact() ? relaySample : (sampleFn || relaySample);
      const res = await fn("연결 시험이다. '연결됨'이라고만 답한다.", { modelTier: "quick" });
      const s = $("#relayStatus"); if (s) s.textContent = "연결됨 · " + Math.round(performance.now() - t0) + "ms · 모델 " + (res.modelTierApplied || "-") + " · 답: " + visiblePart(res.text).slice(0, 30);
    } catch (e) {
      const s = $("#relayStatus"); if (s) s.textContent = "연결 실패 · " + ({ relay_denied: "출처나 접속 코드가 허용되지 않았어요", relay_network: "서버에 닿지 못했어요(주소, CORS 확인)", relay_timeout: "시간이 너무 걸렸어요", rate_limited: "요청 횟수 제한에 걸렸어요", relay_http: "서버 오류" }[e && e.code] || "알 수 없는 오류") + (e && e.status ? " (" + e.status + ")" : "");
    }
  },
  "h-reset"() { settings.harness = JSON.parse(JSON.stringify(DEFAULT_SETTINGS.harness)); saveSettings(); renderDrawer(); toast("하네스를 기본값으로 되돌렸어요."); },
  "toggle-err"(el) { const k = el.dataset.id; settings.errors[k] = !settings.errors[k]; saveSettings(); renderDrawer(); },
  "copy-json"() { if (S) copyText(JSON.stringify(S.logs, null, 2)); },
  "dl-json"() { saveFile("json"); },
  "dl-csv"() { saveFile("csv"); }
};
Object.assign(ACT, LAB_ACT, SHELL_ACT);
function enterStageNoLog(stage) { S.stage = stage; persist(); renderAll(); focusMain(); }
document.addEventListener("click", ev => {
  const el = ev.target.closest("[data-act]");
  if (!el) return;
  if (el.getAttribute("aria-disabled") === "true" && el.dataset.act !== "to-formative") return;
  const fn = ACT[el.dataset.act];
  if (fn) { ev.preventDefault(); fn(el, ev); }
});
document.addEventListener("change", ev => {
  const t = ev.target;
  if (t.classList && t.classList.contains("h-sel")) { const r = t.dataset.hr, k = t.dataset.hk, v = +t.value; if (r) settings.harness[r][k] = v; else settings.harness[k] = v; saveSettings(); renderDrawer(); return; }
  if (!S) return;
  if (t.dataset.opt) { selectOpt(t.dataset.opt, t.value); return; }
  if (t.dataset.retry) { const r = rec(t.dataset.retry); if (r.retry) { r.retry.sel = t.value; persist(); } return; }
  if (t.dataset.conf) { rec(t.dataset.conf).conf = +t.value; persist(); return; }
  if (t.dataset.self) { S.selfCheck[t.dataset.self] = +t.value; persist(); log("answered", "self-check/" + t.dataset.self, "스스로 점검", "question", { response: ["설명할 수 있어요", "조금 알 것 같아요", "아직 헷갈려요"][+t.value] }); return; }
  if (t.dataset.report) { S.mateErr[t.dataset.report].reported = +t.value; persist(); log("answered", "mate-error/" + t.dataset.report + "/self-report", "오류를 바로잡았는지 스스로 응답", "question", { response: ["예", "아니요", "잘 모르겠어요"][+t.value] }, { "error-id": t.dataset.report }); return; }
  if (t.dataset.manip) { S.manip[t.dataset.manip] = +t.value; persist(); log("answered", "manipulation-check/" + t.dataset.manip, "조작 확인 문항", "question", { response: String(t.value) }, { item: t.dataset.manip }); return; }
  if (t.hasAttribute("data-est")) { S.formEstimate = +t.value; persist(); return; }
  if (t.id === "setCap") { const v = Math.max(5, Math.min(100, parseInt(t.value, 10) || 30)); settings.turnCap = v; saveSettings(); renderAgentStatus(); }
});
document.addEventListener("input", ev => {
  const t = ev.target;
  if (t.id === "chatIn") { t.style.height = "auto"; t.style.height = Math.min(140, t.scrollHeight) + "px"; return; }
  if (!S) return;
  if (t.id === "labStart" || t.id === "labEnd" || t.id === "labStep") { labChanged(); return; }
  if (t.id === "thinkTa") { S.think = t.value; persist(); return; }
  if (t.id === "actA" || t.id === "actB" || t.id === "actC") { S.activity[t.id.slice(3).toLowerCase()] = t.value.trim(); persist(); return; }
  if (t.dataset.short) { const id = t.dataset.short, r = rec(id); const first = !r.firstSelAt; r.sel = t.value.trim() || null; if (first && r.sel) r.firstSelAt = now(); persist(); renderDotsOnly(); return; }
  if (t.dataset.retryShort) { const r = rec(t.dataset.retryShort); if (r.retry) { r.retry.sel = t.value.trim() || null; persist(); } }
});
function renderDotsOnly() {
  const dots = $$(".dots button[data-act='form-go']");
  dots.forEach((b, i) => { const it = FORM_ITEMS[i]; b.classList.toggle("answered", !!(S.items[it.id] && S.items[it.id].sel)); });
}
/* 배포판(claude.ai 밖)에서는 연구자 보기를 연구팀 코드로 잠근다. 화면 코드 안의 값은 해시라 바로 읽히지 않지만, 보안 장치가 아니라 학생이 실수로 여는 것을 막는 문이다. */
const RESEARCH_HASH = 2923256942;
function codeHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function researchUnlocked() {
  if (inArtifact()) return true;
  try { return sessionStorage.getItem(KEY + ":rg") === "1"; } catch (e) { return !!window.__rgOk; }
}
document.addEventListener("submit", ev => {
  if (ev.target.id !== "researchGate") return;
  ev.preventDefault();
  const v = ($("#rgCode").value || "").trim();
  if (codeHash(v) !== RESEARCH_HASH) { $("#rgErr").textContent = "코드가 맞지 않아요."; $("#rgCode").select(); return; }
  try { sessionStorage.setItem(KEY + ":rg", "1"); } catch (e) { window.__rgOk = true; }
  closeModal(); openDrawer();
});
document.addEventListener("submit", ev => {
  if (ev.target.id !== "entryForm") return;
  ev.preventDefault();
  const cls = $("#inClass").value.trim(), no = $("#inNo").value.trim();
  if (!cls || !no) { $("#entryMsg").textContent = "학급 코드와 번호를 모두 넣어 주세요."; (cls ? $("#inNo") : $("#inClass")).focus(); return; }
  enterLesson(cls, no);
});
document.addEventListener("keydown", ev => {
  if (ev.key === "Escape") {
    if (modalState || $("#modalRoot").innerHTML) { closeModal(); return; }
    if (drawerOpen) { closeDrawer(); return; }
    if (sheetOpen) { setSheet(false); return; }
  }
  if (ev.key === "Enter" && ev.target.id === "chatIn" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); ACT.send(); }
  if (ev.key === "Tab") {
    const box = $("#modalRoot .modal") || (drawerOpen ? $(".drawer") : null);
    if (!box) return;
    const f = $$('button:not([disabled]), [href], input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])', box).filter(x => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
    else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
  }
  if ((ev.key === "ArrowRight" || ev.key === "ArrowLeft") && ev.target.getAttribute("role") === "tab") {
    const tabs = ["settings", "classes", "harness", "logs", "summary"]; let i = tabs.indexOf(drawerTab);
    i = (i + (ev.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; drawerTab = tabs[i]; renderDrawer(); $("#tab-" + drawerTab).focus();
  }
});
window.matchMedia("(max-width:900px)").addEventListener("change", e => { if (!e.matches && sheetOpen) setSheet(false); });

/* ===== 시작 ===== */
(function init() {
  applyView();
  const last = load(KEY + ":last", null);
  if (last && last.key) {
    const saved = load(sKey(last), null);
    if (saved && saved.v === 1) {
      S = saved;
      S.chat.forEach(m => { if (m.pending) { m.pending = false; if (!m.text) m.text = "(응답이 끊겼어요)"; } });
      if (S.stage === "learn") S.segAt = now();
      log("resumed", "lesson", LESSON.title, "lesson", null, { "resume-stage": S.stage });
      courseId = null; homeOpen = true; page = "dash";
    }
  }
  renderAll();
})();
