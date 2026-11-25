// 반복 구조 학습실 AI 중계 서버
// AWS Lambda(Node.js 20 이상) + 함수 URL. 화면이 만든 프롬프트를 받아 Claude API에 넘기고 답을 돌려준다.
// API 키는 여기(환경 변수)에만 둔다. 화면(html)에는 절대 넣지 않는다.
//
// 환경 변수
//   ANTHROPIC_API_KEY  필수. Anthropic 콘솔에서 만든 키
//   ALLOWED_ORIGINS    요청을 받을 화면 주소(쉼표로 여러 개). 기본: https://helloworld3414.github.io
//                      내려받은 html 파일로 시험하려면 null 도 넣는다(파일로 열면 출처가 null)
//   ACCESS_CODE        (선택) 화면 연구자 보기의 접속 코드와 같은 값. 비밀은 아니고 엉뚱한 호출을 거르는 용도
//   MODEL_QUICK        화면 '빠름' 등급에 쓸 모델 이름
//   MODEL_DEFAULT      화면 '기본' 등급에 쓸 모델 이름
//   MAX_TOKENS         답 길이 상한(기본 600)
//   TEMPERATURE        (선택) 0~1. 비우면 API 기본값. 두 조건에 같은 값을 쓴다
//   PER_SESSION_LIMIT  가명 식별자 하나당 호출 상한(기본 60). 함수가 살아 있는 동안만 세는 간이 제한
//   LOG_TEXT           1이면 프롬프트와 답 전문을 CloudWatch에 남긴다(IRB 승인 범위 확인 뒤 켤 것)

const API = "https://api.anthropic.com/v1/messages";
const env = process.env;
const ORIGINS = (env.ALLOWED_ORIGINS || "https://helloworld3414.github.io").split(",").map(s => s.trim()).filter(Boolean);
const MODELS = { quick: env.MODEL_QUICK || "claude-haiku-4-5-20251001", default: env.MODEL_DEFAULT || "claude-sonnet-5" };
const MAX_PROMPT = 60000;
const LIMIT = Number(env.PER_SESSION_LIMIT || 60);
const seen = new Map();

function cors(origin) {
  return { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type, x-access-code", "Access-Control-Max-Age": "600", "Vary": "Origin" };
}
function reply(status, body, origin) {
  return { statusCode: status, headers: Object.assign({ "content-type": "application/json; charset=utf-8" }, origin ? cors(origin) : {}), body: JSON.stringify(body) };
}

export const handler = async (event) => {
  const h = Object.fromEntries(Object.entries(event.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
  const origin = h.origin || "";
  const allowed = ORIGINS.includes(origin) ? origin : null;
  const method = (event.requestContext && event.requestContext.http && event.requestContext.http.method) || event.httpMethod || "POST";

  if (method === "OPTIONS") return { statusCode: allowed ? 204 : 403, headers: allowed ? cors(allowed) : {} };
  if (!allowed) return reply(403, { error: "origin_not_allowed" }, null);
  if (method !== "POST") return reply(405, { error: "method_not_allowed" }, allowed);
  if (env.ACCESS_CODE && h["x-access-code"] !== env.ACCESS_CODE) return reply(401, { error: "bad_access_code" }, allowed);
  if (!env.ANTHROPIC_API_KEY) return reply(500, { error: "no_api_key" }, allowed);

  let req;
  try { req = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body || "", "base64").toString("utf8") : (event.body || "{}")); }
  catch (e) { return reply(400, { error: "bad_json" }, allowed); }
  const prompt = String(req.prompt || "");
  if (!prompt || prompt.length > MAX_PROMPT) return reply(400, { error: "bad_prompt" }, allowed);

  const sid = String(req.session || "anon").slice(0, 64);
  const n = (seen.get(sid) || 0) + 1; seen.set(sid, n);
  if (n > LIMIT) return reply(429, { error: "rate_limited" }, allowed);

  const model = MODELS[req.tier] || MODELS.quick;
  const body = { model, max_tokens: Number(env.MAX_TOKENS || 600), messages: [{ role: "user", content: prompt }] };
  if (env.TEMPERATURE !== undefined && env.TEMPERATURE !== "") body.temperature = Number(env.TEMPERATURE);

  const t0 = Date.now();
  let r, data;
  try {
    r = await fetch(API, { method: "POST", headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, body: JSON.stringify(body) });
    data = await r.json().catch(() => ({}));
  } catch (e) {
    console.log(JSON.stringify({ kind: "upstream_network", sid, message: String(e && e.message || e) }));
    return reply(502, { error: "upstream_network" }, allowed);
  }
  if (!r.ok) {
    console.log(JSON.stringify({ kind: "upstream_error", sid, status: r.status, type: data && data.error && data.error.type }));
    return reply(r.status === 429 ? 429 : 502, { error: r.status === 429 ? "rate_limited" : "upstream", status: r.status }, allowed);
  }
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const log = { kind: "turn", sid, condition: req.condition || "", role: req.role || "", tier: req.tier || "", model: data.model || model, ms: Date.now() - t0,
    input_tokens: data.usage && data.usage.input_tokens, output_tokens: data.usage && data.usage.output_tokens, stop: data.stop_reason };
  if (env.LOG_TEXT === "1") { log.prompt = prompt; log.text = text; }
  console.log(JSON.stringify(log));
  return reply(200, { text, model: data.model || model }, allowed);
};
