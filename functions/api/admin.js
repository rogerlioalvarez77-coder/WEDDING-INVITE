// POST /api/admin   body: { token }
// Devuelve el resumen de confirmaciones SOLO si token === env.ADMIN_TOKEN.
// El token es un secreto de Pages (no vive en el repo):
//   npx wrangler pages secret put ADMIN_TOKEN --project-name=wedding-invite
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "bad_request" }, 400); }

  // Falla cerrado: si no hay secreto configurado, no expone nada.
  if (!env.ADMIN_TOKEN) return json({ ok: false, error: "not_configured" }, 500);
  if (String(body?.token || "") !== env.ADMIN_TOKEN)
    return json({ ok: false, error: "unauthorized" }, 401);

  const db = env.rsvp;

  const totals = await db.prepare(
    `SELECT
       (SELECT COUNT(*) FROM guests)                               AS familias,
       (SELECT COUNT(*) FROM rsvp)                                 AS respondieron,
       (SELECT COUNT(*) FROM rsvp WHERE asiste=1)                  AS confirmadas,
       (SELECT COUNT(*) FROM rsvp WHERE asiste=0)                  AS declinadas,
       (SELECT COALESCE(SUM(personas),0) FROM rsvp WHERE asiste=1) AS personas,
       (SELECT COALESCE(SUM(asientos),0) FROM guests)              AS asientos_totales`
  ).first();

  const responses = (await db.prepare(
    `SELECT g.nombre, g.asientos, r.asiste, r.personas, r.alergias, r.dieta, r.cancion, r.actualizado_en
       FROM rsvp r JOIN guests g ON g.codigo = r.codigo
      ORDER BY r.actualizado_en DESC`
  ).all()).results;

  const pending = (await db.prepare(
    `SELECT g.nombre, g.asientos
       FROM guests g LEFT JOIN rsvp r ON r.codigo = g.codigo
      WHERE r.codigo IS NULL
      ORDER BY g.nombre`
  ).all()).results;

  return json({ ok: true, totals, responses, pending });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
