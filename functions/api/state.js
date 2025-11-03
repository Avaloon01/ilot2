/**
 * GET  /api/state          → returns current user's state (requires session cookie)
 * PUT  /api/state          → saves state for current user (requires session cookie)
 */
export async function onRequestGet(ctx) {
  try {
    const { env, request } = ctx;
    const session = await requireSession(request, env.SESSION_SECRET);
    if (!session) return json({ ok: false, error: "unauthorized" }, 401);
    const key = `state:${session.uid}`;
    const raw = await env.BARO.get(key);
    const state = raw ? JSON.parse(raw) : { groups: [], history: [], lastId: 0, mode: null };
    return json({ ok: true, state });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

export async function onRequestPut(ctx) {
  try {
    const { env, request } = ctx;
    const session = await requireSession(request, env.SESSION_SECRET);
    if (!session) return json({ ok: false, error: "unauthorized" }, 401);
    const body = await request.json();
    const state = {
      groups: body?.groups || [],
      history: body?.history || [],
      lastId: body?.lastId || 0,
      mode: body?.mode ?? null
    };
    await env.BARO.put(`state:${session.uid}`, JSON.stringify(state));
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

function json(obj, status=200){
  return new Response(JSON.stringify(obj), { status, headers:{ "content-type":"application/json" } });
}
function getCookie(req, name){
  const h = req.headers.get("cookie") || "";
  const parts = h.split(/;\s*/);
  for(const p of parts){
    const [k, ...v] = p.split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
async function verifyToken(token, secret){
  const [h,p,sig] = (token||"").split(".");
  if(!h||!p||!sig) return null;
  const data = `${h}.${p}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("HMAC", key, Uint8Array.from(atob(sig.replace(/-/g,"+").replace(/_/g,"/")), c=>c.charCodeAt(0)), new TextEncoder().encode(data));
  if(!ok) return null;
  try{
    const payload = JSON.parse(atob(p.replace(/-/g,"+").replace(/_/g,"/")));
    return payload;
  }catch{ return null; }
}
async function requireSession(request, secret){
  const token = getCookie(request, "session");
  if(!token) return null;
  return await verifyToken(token, secret);
}
