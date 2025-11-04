export const onRequestGet = async ({ request, env }) => {
  const { uid, raw, emailGuess } = await getUserIdentity(request);
  if (!uid) return json({ ok: false, unauthorized: true }, 401);

  const canonicalKey = `user:${uid}:state`;
  let val = await env.BARO.get(canonicalKey);

  if (!val) {
    const candidates = new Set();
    if (raw) {
      candidates.add(`state:${raw}`);
      candidates.add(`user:${raw}`);
      candidates.add(`user:${raw}:state`);
    }
    if (emailGuess) {
      candidates.add(`state:${emailGuess}`);
      candidates.add(`user:${emailGuess}:state`);
    }
    for (const k of candidates) {
      const v = await env.BARO.get(k);
      if (v) {
        val = v;
        await env.BARO.put(canonicalKey, v); // on recopie vers la clé finale
        break;
      }
    }
  }

  if (!val) return json({ ok: true, state: { groups: [], history: [], lastId: 0 } });
  return new Response(val, {
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
};

export const onRequestPut = async ({ request, env }) => {
  const { uid } = await getUserIdentity(request);
  if (!uid) return json({ ok: false, unauthorized: true }, 401);

  const body = await request.text();
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  if (!data || typeof data !== "object" || !("state" in data)) {
    return json({ ok: false, error: "invalid_payload" }, 400);
  }

  await env.BARO.put(`user:${uid}:state`, JSON.stringify({ ok: true, ...data }));
  return json({ ok: true });
};


function readCookie(request, name) {
  const m = (request.headers.get("Cookie") || "").match(
    new RegExp(`(?:^|;\\s*)${name}=([^;]+)`)
  );
  return m ? decodeURIComponent(m[1]) : null;
}

async function getUserIdentity(request) {
  // Essaie plusieurs noms de cookie possibles
  const raw =
    readCookie(request, "uid") ||
    readCookie(request, "session") ||
    readCookie(request, "user");
  if (!raw) return { uid: null, raw: null, emailGuess: null };

  let emailGuess = null;

  if (raw.includes("@")) emailGuess = raw.toLowerCase().trim();

  if (!emailGuess && raw.split(".").length === 3) {
    try {
      const b64 = raw.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(atob(b64));
      if (json.email) emailGuess = String(json.email).toLowerCase().trim();
      else if (json.sub) emailGuess = String(json.sub).toLowerCase().trim();
    } catch { /* ignore */ }
  }

  const base = emailGuess || raw;
  const uid = await sha256Hex(base);
  return { uid, raw, emailGuess };
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" }
  });
}
