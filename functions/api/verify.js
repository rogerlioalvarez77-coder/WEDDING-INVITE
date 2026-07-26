// POST /api/verify   body: { codigo }
// -> 200 { ok:true, nombre, max, ya, previo? }   |   404 { ok:false }
// Valida el código contra D1. Así la lista de invitados NO viaja en el HTML.
// Si ya habían confirmado, devuelve `ya:true` y su respuesta anterior en
// `previo`, para mostrarsela y dejar que la modifiquen en vez de sobrescribirla
// en silencio.
export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "bad_request" }, 400); }

  const codigo = String(body?.codigo || "").trim().toUpperCase();
  if (!codigo) return json({ ok: false, error: "missing_code" }, 400);

  const row = await env.rsvp
    .prepare(
      `SELECT g.nombre, g.asientos,
              r.asiste, r.personas, r.alergias, r.dieta, r.cancion, r.actualizado_en
         FROM guests g
         LEFT JOIN rsvp r ON r.codigo = g.codigo
        WHERE g.codigo = ?`
    )
    .bind(codigo)
    .first();

  if (!row) return json({ ok: false, error: "not_found" }, 404);

  const ya = row.actualizado_en != null;
  return json({
    ok: true,
    nombre: row.nombre,
    max: row.asientos,
    ya,
    // Los campos de texto viajan de vuelta para que "Modificar respuesta" abra
    // el formulario con lo que ya habian escrito, en vez de borrarselo.
    previo: ya ? {
      asiste: row.asiste,
      personas: row.personas,
      alergias: row.alergias,
      dieta: row.dieta,
      cancion: row.cancion,
      actualizado_en: row.actualizado_en,
    } : null,
  });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
