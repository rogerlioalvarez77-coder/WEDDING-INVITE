// POST /api/verify   body: { codigo }
// -> 200 { ok:true, nombre, max }   |   404 { ok:false }
// Valida el código contra D1. Así la lista de invitados NO viaja en el HTML.
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "bad_request" }, 400); }

  const codigo = String(body?.codigo || "").trim().toUpperCase();
  if (!codigo) return json({ ok: false, error: "missing_code" }, 400);

  const row = await env.rsvp
    .prepare("SELECT nombre, asientos FROM guests WHERE codigo = ?")
    .bind(codigo)
    .first();

  if (!row) return json({ ok: false, error: "not_found" }, 404);
  return json({ ok: true, nombre: row.nombre, max: row.asientos });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
