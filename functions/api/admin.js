// POST /api/admin   body: { token }
// Devuelve el resumen de confirmaciones SOLO si token === env.ADMIN_TOKEN.
// Es el UNICO endpoint que expone telefono y responsable de cada familia
// (la invitacion publica, /api/verify, nunca los devuelve).
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

  // Los totales se calculan en el navegador a partir de estas dos listas, para
  // que el filtro por responsable (Adriana / Rogelio) recalcule todo sin otra
  // consulta y sin que los numeros se contradigan.
  const responses = (await db.prepare(
    `SELECT g.nombre, g.asientos, g.telefono, g.responsable,
            r.asiste, r.personas, r.alergias, r.dieta, r.cancion, r.actualizado_en
       FROM rsvp r JOIN guests g ON g.codigo = r.codigo
      ORDER BY r.actualizado_en DESC`
  ).all()).results;

  const pending = (await db.prepare(
    `SELECT g.nombre, g.asientos, g.telefono, g.responsable
       FROM guests g LEFT JOIN rsvp r ON r.codigo = g.codigo
      WHERE r.codigo IS NULL
      ORDER BY g.nombre`
  ).all()).results;

  return json({ ok: true, responses, pending });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
