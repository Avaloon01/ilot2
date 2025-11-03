/**
 * POST /api/auth/register
 * Body: { "email": "a@b.com", "password": "secret" }
 * Creates a user with hashed password in KV.
 */
export async function onRequestPost(ctx) {
  try {
    const { request, env } = ctx;
    const { email, password } = await request.json();
    const mail = (email || "").trim().toLowerCase();
    const pwd = (password || "").trim();
    if (!mail || !pwd) {
      return json({ ok: false, error: "email/password requis" }, 400);
    }
    if (pwd.length < 8) {
      return json({ ok: false, error: "mot de passe trop court (min 8)" }, 400);
    }

    const exists = await env.BARO.get(`user:${mail}`);
    if (exists) {
      return json({ ok: false, error: "compte déjà existant" }, 409);
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const saltB64 = b64(salt);
    const hashB64 = await pbkdf2Hash(pwd, salt, 100000);
    const id = crypto.randomUUID();

    const user = { id, email: mail, pwd: `pbkdf2$100000$${saltB64}$${hashB64}` };
    await env.BARO.put(`user:${mail}`, JSON.stringify(user));

    return json({ ok: true });
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
async function pbkdf2Hash(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return b64(new Uint8Array(bits));
}
