// POST /api/admin-rsvp   body: { token, codigo, asiste, personas }
//                        body: { token, codigo, borrar: true }
// Corrige a mano la respuesta de una familia desde /admin.html (por ejemplo,
// avisaron por WhatsApp que no van, o que de 4 solo van 2). Protegido por el
// mismo ADMIN_TOKEN que /api/admin.
//
// - Conserva alergias / dieta / cancion que la familia ya hubiera escrito.
// - El tope de asientos se valida igual que en /api/rsvp.
// - `borrar: true` elimina la respuesta: la familia vuelve a "Sin responder".
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "bad_request" }, 400); }

  if (!env.ADMIN_TOKEN) return json({ ok: false, error: "not_configured" }, 500);
  if (String(body?.token || "") !== env.ADMIN_TOKEN)
    return json({ ok: false, error: "unauthorized" }, 401);

  const codigo = String(body?.codigo || "").trim().toUpperCase();
  if (!codigo) return json({ ok: false, error: "missing_code" }, 400);

  const db = env.rsvp;
  const g = await db.prepare("SELECT asientos FROM guests WHERE codigo = ?").bind(codigo).first();
  if (!g) return json({ ok: false, error: "not_found" }, 404);

  if (body?.borrar) {
    await db.prepare("DELETE FROM rsvp WHERE codigo = ?").bind(codigo).run();
    return json({ ok: true });
  }

  const asiste = body?.asiste ? 1 : 0;
  let personas = parseInt(body?.personas, 10);
  if (!Number.isFinite(personas)) personas = 0;
  // Asistir con 0 personas no tiene sentido: eso es "no asiste".
  if (asiste && personas < 1) return json({ ok: false, error: "personas_invalidas" }, 400);
  if (personas > g.asientos) return json({ ok: false, error: "excede_asientos", max: g.asientos }, 400);
  if (!asiste) personas = 0;

  await db
    .prepare(
      `INSERT INTO rsvp (codigo, asiste, personas, actualizado_en)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(codigo) DO UPDATE SET
         asiste = excluded.asiste,
         personas = excluded.personas,
         actualizado_en = excluded.actualizado_en`
    )
    .bind(codigo, asiste, personas)
    .run();

  return json({ ok: true });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
