/**
 * POST /api/login
 * Body: { "class": "CLASSE_X", "pin": "1234" }
 * Vérifie le PIN de la classe dans KV (clé "auth:<class>").
 */
export async function onRequestPost(ctx) {
  try {
    const { request, env } = ctx;
    const data = await request.json();
    const klass = (data?.class || "").trim();
    const pin = (data?.pin || "").trim();
    if (!klass || !pin) {
      return new Response(JSON.stringify({ ok: false, error: "class/pin manquant" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
    const stored = await env.BARO.get(`auth:${klass}`);
    const ok = stored && stored === pin;
    return new Response(JSON.stringify({ ok }), {
      headers: { "content-type": "application/json" },
      status: ok ? 200 : 401,
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
