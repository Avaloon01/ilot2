/**
 * GET  /api/state?class=CLASSE_X      → renvoie l'état (lecture publique)
 * PUT  /api/state?class=CLASSE_X      → enregistre l'état (écriture protégée par X-Class-Pin)
 *         Body: JSON { groups, history, lastId, mode }
 */
export async function onRequestGet(ctx) {
  try {
    const { request, env } = ctx;
    const url = new URL(request.url);
    const klass = (url.searchParams.get("class") || "").trim();
    if (!klass) return json({ ok: false, error: "paramètre 'class' manquant" }, 400);

    const key = `state:${klass}`;
    const raw = await env.BARO.get(key);
    if (!raw) {
      return json({
        ok: true,
        state: { groups: [], history: [], lastId: 0, mode: null }
      });
    }
    const state = JSON.parse(raw);
    return json({ ok: true, state });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}

export async function onRequestPut(ctx) {
  try {
    const { request, env } = ctx;
    const url = new URL(request.url);
    const klass = (url.searchParams.get("class") || "").trim();
    if (!klass) return json({ ok: false, error: "paramètre 'class' manquant" }, 400);

    const pin = request.headers.get("X-Class-Pin") || "";
    const stored = await env.BARO.get(`auth:${klass}`);
    if (!stored || stored !== pin) return json({ ok: false, error: "PIN invalide" }, 401);

    const body = await request.json();
    // filtre : on n'enregistre que les champs utiles
    const state = {
      groups: body?.groups || [],
      history: body?.history || [],
      lastId: body?.lastId || 0,
      mode: body?.mode ?? null
    };
    await env.BARO.put(`state:${klass}`, JSON.stringify(state));
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" }
  });
}
