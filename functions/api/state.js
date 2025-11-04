
export const onRequestGet = async ({ request, env }) => {
  const uid = getUserId(request);
  if (!uid) return json({ ok:false, unauthorized:true }, 401);
  const key = `user:${uid}:state`;
  const val = await env.BARO.get(key);
  if (!val) return json({ ok:true, state: { groups:[], history:[], lastId:0 } }, 200);
  return new Response(val, {
    headers: { "content-type":"application/json", "cache-control":"no-store" }
  });
};

export const onRequestPut = async ({ request, env }) => {
  const uid = getUserId(request);
  if (!uid) return json({ ok:false, unauthorized:true }, 401);
  const key = `user:${uid}:state`;
  const body = await request.text();
  try {
    const data = JSON.parse(body);
    if (!data || typeof data !== "object" || !("state" in data)) {
      return json({ ok:false, error:"invalid_payload" }, 400);
    }
    await env.BARO.put(key, JSON.stringify({ ok:true, ...data }));
    return json({ ok:true });
  } catch (e) {
    return json({ ok:false, error:"invalid_json" }, 400);
  }
};

function getUserId(request){
  const cookie = request.headers.get("Cookie") || "";
  const m1 = /(?:^|;\s*)uid=([^;]+)/i.exec(cookie);
  if (m1) return decodeURIComponent(m1[1]);
  const m2 = /(?:^|;\s*)session=([^;]+)/i.exec(cookie);
  if (m2) {
    const raw = decodeURIComponent(m2[1]);
    const mm = /^uid:(.+)$/.exec(raw);
    return mm ? mm[1] : raw;
  }
  return null;
}

function json(obj, status=200){
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type":"application/json", "cache-control":"no-store" }
  });
}
