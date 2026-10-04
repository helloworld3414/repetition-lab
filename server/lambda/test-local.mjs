// 키 없이 중계 서버 동작을 확인하는 시험. Claude API 호출은 가짜 응답으로 바꾼다.
// 실행: node server/lambda/test-local.mjs
process.env.ANTHROPIC_API_KEY = "test"; process.env.ACCESS_CODE = "abc"; process.env.ALLOWED_ORIGINS = "https://helloworld3414.github.io,null"; process.env.PER_SESSION_LIMIT = "2";
let sent = null;
globalThis.fetch = async (url, opt) => { sent = JSON.parse(opt.body); return { ok: true, status: 200, json: async () => ({ model: sent.model, content: [{ type: "text", text: "연결됨" }], usage: { input_tokens: 10, output_tokens: 2 }, stop_reason: "end_turn" }) }; };
const { handler } = await import("./index.mjs");
const ev = (o) => Object.assign({ requestContext: { http: { method: "POST" } }, headers: { origin: "https://helloworld3414.github.io", "x-access-code": "abc" }, body: JSON.stringify({ prompt: "안녕", tier: "quick", session: "p1" }) }, o);
const check = (name, ok) => { console.log((ok ? "통과 " : "실패 ") + name); if (!ok) process.exitCode = 1; };
let r = await handler(ev()); check("정상 호출", r.statusCode === 200 && JSON.parse(r.body).text === "연결됨" && sent.model.length > 0);
r = await handler(ev({ headers: { origin: "https://evil.example", "x-access-code": "abc" } })); check("다른 출처 막기", r.statusCode === 403);
r = await handler(ev({ headers: { origin: "https://helloworld3414.github.io", "x-access-code": "x" } })); check("접속 코드 틀림", r.statusCode === 401);
r = await handler(ev({ requestContext: { http: { method: "OPTIONS" } } })); check("사전 요청(CORS)", r.statusCode === 204 && r.headers["Access-Control-Allow-Origin"] === "https://helloworld3414.github.io");
r = await handler(ev()); r = await handler(ev()); check("횟수 제한", r.statusCode === 429);
r = await handler(ev({ body: JSON.stringify({ prompt: "x", tier: "default", session: "p2" }) })); check("기본 등급 모델", r.statusCode === 200 && sent.model === (process.env.MODEL_DEFAULT || "claude-sonnet-5"));
r = await handler(ev({ headers: { origin: "null", "x-access-code": "abc" }, body: JSON.stringify({ prompt: "x", session: "p3" }) })); check("파일로 연 화면(null 출처)", r.statusCode === 200);
