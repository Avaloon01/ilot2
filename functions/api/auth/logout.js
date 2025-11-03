/**
 * POST /api/auth/logout
 * Clears the session cookie.
 */
export async function onRequestPost(ctx) {
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("Set-Cookie", "session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}
