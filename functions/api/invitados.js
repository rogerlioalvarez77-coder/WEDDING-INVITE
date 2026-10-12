// POST /api/invitados   (protegido por ADMIN_TOKEN, lo usa /envios.html)
//   { token, op: "list" }
//     -> { ok, invitados: [{ codigo, nombre, asientos, telefono, responsable,
//                            asiste, personas, actualizado_en }] }
//   { token, op: "save", invitado: { codigo?, nombre, asientos, telefono, responsable } }
//     -> { ok, codigo, nuevo }
//     Sin `codigo` crea una familia nueva con un código nuevo; con `codigo`
//     modifica esa familia (el código NUNCA cambia).
//
// Reglas, las mismas que ../backend/generate_codes.py:
// - Teléfono normalizado a E.164 sin '+'; 8 dígitos sin '+' => +503.
// - Responsable: 'Adriana' o 'Rogelio'.
// - Un código nuevo nunca repite uno entregado alguna vez (tabla `codigos_usados`,
//   que es el equivalente en D1 de codigos_usados.txt).
// - No puede haber dos familias con el mismo teléfono ni con el mismo nombre
//   (sin tildes ni mayúsculas): el generador local las reconoce por eso.
//
// OJO: desde que se edita aquí, D1 pasa a ser la fuente de verdad. Antes de
// volver a editar asientos_reservados.csv a mano, correr
// `python3 ../backend/sync_desde_d1.py` (ver COMO-HACER-CAMBIOS.md).

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0 1 I L O
const CODE_LEN = 5;
const DEFAULT_CC = "503";
const RESPONSABLES = { adriana: "Adriana", rogelio: "Rogelio" };
const MAX_ASIENTOS = 20;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try { body = await request.json(); }
  catch { return json({ ok: false, error: "bad_request" }, 400); }

  if (!env.ADMIN_TOKEN) return json({ ok: false, error: "not_configured" }, 500);
  if (String(body?.token || "") !== env.ADMIN_TOKEN)
    return json({ ok: false, error: "unauthorized" }, 401);

  const db = env.rsvp;
  if (body?.op === "list") return listar(db);
  if (body?.op === "save") return guardar(db, body?.invitado || {});
  return json({ ok: false, error: "bad_op" }, 400);
}

async function listar(db) {
  const invitados = (await db.prepare(
    `SELECT g.codigo, g.nombre, g.asientos, g.telefono, g.responsable,
            r.asiste, r.personas, r.actualizado_en
       FROM guests g LEFT JOIN rsvp r ON r.codigo = g.codigo
      ORDER BY g.nombre COLLATE NOCASE`
  ).all()).results;
  return json({ ok: true, invitados });
}

async function guardar(db, inv) {
  // --- validar ---
  const nombre = String(inv.nombre || "").trim().replace(/\s+/g, " ");
  if (!nombre) return error("Falta el nombre de la familia.");
  if (nombre.length > 120) return error("El nombre es demasiado largo (máx. 120).");

  const asientos = parseInt(inv.asientos, 10);
  if (!Number.isFinite(asientos) || asientos < 1 || asientos > MAX_ASIENTOS)
    return error(`Los asientos deben ser un número entre 1 y ${MAX_ASIENTOS}.`);

  const tel = normTel(inv.telefono);
  if (tel.error) return error(tel.error);

  const rk = String(inv.responsable || "").trim().toLowerCase();
  const responsable = RESPONSABLES[rk] || "";
  if (rk && !responsable) return error("Quién invita debe ser Adriana o Rogelio.");

  const codigo = String(inv.codigo || "").trim().toUpperCase();

  // --- duplicados (teléfono / nombre) contra las demás familias ---
  const todos = (await db.prepare(
    `SELECT g.codigo, g.nombre, g.telefono, r.asiste, r.personas
       FROM guests g LEFT JOIN rsvp r ON r.codigo = g.codigo`
  ).all()).results;

  const actual = codigo ? todos.find(g => g.codigo === codigo) : null;
  if (codigo && !actual) return json({ ok: false, error: "not_found", mensaje: "Ese código no existe." }, 404);

  const otros = todos.filter(g => g.codigo !== codigo);
  if (tel.tel) {
    const d = otros.find(g => g.telefono === tel.tel);
    if (d) return error(`Ese teléfono ya lo tiene "${d.nombre}" (${d.codigo}).`);
  }
  const clave = claveNombre(nombre);
  const dn = otros.find(g => claveNombre(g.nombre) === clave);
  if (dn) return error(`Ya existe una familia con ese nombre: "${dn.nombre}" (${dn.codigo}). Agregá algo que las distinga.`);

  // --- modificar ---
  if (actual) {
    if (actual.asiste && actual.personas > asientos)
      return error(`Esta familia ya confirmó ${actual.personas} personas. Corregí primero su respuesta en el panel o dejá al menos ${actual.personas} asientos.`);
    await db.prepare(
      `UPDATE guests SET nombre = ?, asientos = ?, telefono = ?, responsable = ? WHERE codigo = ?`
    ).bind(nombre, asientos, tel.tel || null, responsable || null, codigo).run();
    return json({ ok: true, codigo, nuevo: false });
  }

  // --- crear ---
  let usados;
  try {
    usados = new Set((await db.prepare("SELECT codigo FROM codigos_usados").all()).results.map(r => r.codigo));
  } catch {
    return json({ ok: false, error: "falta_migracion",
      mensaje: "Falta la tabla codigos_usados en D1. Corré una vez ./exec_process.sh (o el seed.sql) y volvé a intentar." }, 500);
  }
  todos.forEach(g => usados.add(g.codigo));

  let nuevo = null;
  for (let i = 0; i < 200 && !nuevo; i++) {
    const c = codigoAleatorio();
    if (!usados.has(c)) nuevo = c;
  }
  if (!nuevo) return json({ ok: false, error: "sin_codigo", mensaje: "No se pudo generar un código. Intentá de nuevo." }, 500);

  await db.batch([
    db.prepare(
      `INSERT INTO guests (codigo, nombre, asientos, telefono, responsable) VALUES (?, ?, ?, ?, ?)`
    ).bind(nuevo, nombre, asientos, tel.tel || null, responsable || null),
    db.prepare("INSERT OR IGNORE INTO codigos_usados (codigo) VALUES (?)").bind(nuevo),
  ]);
  return json({ ok: true, codigo: nuevo, nuevo: true });
}

// Igual que norm_phone() de generate_codes.py, pero rechaza en vez de "revisar".
function normTel(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return { tel: "" };
  let d = s.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  d = d.replace(/^0+/, "");
  if (!d) return { tel: "" }; // '0' = "todavía no tengo su número"
  if (d.length === 8 && !s.startsWith("+")) return { tel: DEFAULT_CC + d };
  if (d.length < 8 || d.length > 15)
    return { error: `El teléfono "${s}" tiene ${d.length} dígitos. Los de El Salvador van con 8; los de otro país, con + y su código (+1 305 555 1234).` };
  return { tel: d };
}

// Igual que clave_nombre() de generate_codes.py.
function claveNombre(nombre) {
  return String(nombre || "").toLowerCase().normalize("NFD")
    .replace(/\p{Mn}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function codigoAleatorio() {
  const buf = new Uint32Array(CODE_LEN);
  crypto.getRandomValues(buf);
  return Array.from(buf, n => ALPHABET[n % ALPHABET.length]).join("");
}

function error(mensaje) {
  return json({ ok: false, error: "invalid", mensaje }, 400);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
