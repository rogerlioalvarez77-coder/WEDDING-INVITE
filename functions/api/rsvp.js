// POST /api/rsvp
// body: { codigo, asiste, personas, alergias, dieta, cancion }
// -> 200 { ok:true }   |   404 { ok:false }
// Guarda la confirmacion en D1. Re-enviar el mismo codigo ACTUALIZA la fila
// (upsert), asi no hay duplicados y el tope de asientos se valida en el server.
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "bad_request" }, 400); }

  const codigo = String(body?.codigo || "").trim().toUpperCase();
  if (!codigo) return json({ ok: false, error: "missing_code" }, 400);

  // El codigo debe existir; de paso obtenemos el tope de asientos real.
  const g = await env.rsvp
    .prepare("SELECT asientos FROM guests WHERE codigo = ?")
    .bind(codigo)
    .first();
  if (!g) return json({ ok: false, error: "not_found" }, 404);

  const asiste = body?.asiste ? 1 : 0;
  let personas = parseInt(body?.personas, 10);
  if (!Number.isFinite(personas)) personas = 0;
  // Si asiste: entre 1 y el tope. Si no asiste: 0.
  personas = asiste ? Math.min(Math.max(personas, 1), g.asientos) : 0;

  await env.rsvp
    .prepare(
      `INSERT INTO rsvp (codigo, asiste, personas, alergias, dieta, cancion, actualizado_en)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(codigo) DO UPDATE SET
         asiste = excluded.asiste,
         personas = excluded.personas,
         alergias = excluded.alergias,
         dieta = excluded.dieta,
         cancion = excluded.cancion,
         actualizado_en = excluded.actualizado_en`
    )
    .bind(codigo, asiste, personas, clip(body?.alergias), clip(body?.dieta), clip(body?.cancion))
    .run();

  return json({ ok: true });
}

function clip(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, 300) : null;
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
