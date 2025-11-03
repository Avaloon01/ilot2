/**
 * POST /api/auth/login
 * Body: { "email":"a@b.com", "password":"secret" }
 * Verifies credentials and sets a signed session cookie.
 */
export async function onRequestPost(ctx) {
  try {
    const { request, env } = ctx;
    const { email, password } = await request.json();
    const mail = (email || "").trim().toLowerCase();
    const pwd = (password || "").trim();
    if (!mail || !pwd) return json({ ok: false, error: "email/password requis" }, 400);

    const raw = await env.BARO.get(`user:${mail}`);
    if (!raw) return json({ ok: false, error: "identifiants invalides" }, 401);
    const user = JSON.parse(raw);
    const ok = await verifyPassword(pwd, user.pwd);
    if (!ok) return json({ ok: false, error: "identifiants invalides" }, 401);

    const token = await signToken({ uid: user.id, email: user.email, iat: Math.floor(Date.now()/1000) }, env.SESSION_SECRET);
    const headers = new Headers({ "content-type": "application/json" });
    headers.append("Set-Cookie", cookie("session", token, { path:"/", httpOnly:true, sameSite:"Lax", secure:true, maxAge: 60*60*24*30 }));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });
}
function b64(buf) {
  let s = "";
  buf = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
  return btoa(s);
}
function b64url(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function cookie(name, value, { path="/", httpOnly=true, sameSite="Lax", secure=true, maxAge }={}) {
  let c = `${name}=${value}; Path=${path}; SameSite=${sameSite}`;
  if (httpOnly) c += "; HttpOnly";
  if (secure) c += "; Secure";
  if (maxAge) c += `; Max-Age=${maxAge}`;
  return c;
}
async function pbkdf2Hash(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}
async function verifyPassword(password, encoded) {
  // format: "pbkdf2$<iter>$<salt_b64>$<hash_b64>"
  const [scheme, iterStr, saltB64, hashB64] = (encoded || "").split("$");
  if (scheme !== "pbkdf2") return false;
  const iterations = parseInt(iterStr, 10);
  const salt = Uint8Array.from(atob(saltB64), c=>c.charCodeAt(0));
  const expect = Uint8Array.from(atob(hashB64), c=>c.charCodeAt(0));
  const got = await pbkdf2Hash(password, salt, iterations);
  if (got.length !== expect.length) return false;
  let diff = 0; for (let i=0;i<got.length;i++){ diff |= got[i]^expect[i]; }
  return diff === 0;
}
async function signToken(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const enc = (obj) => b64url(JSON.stringify(obj));
  const data = `${enc(header)}.${enc(payload)}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
  return `${data}.${sigB64}`;
}
