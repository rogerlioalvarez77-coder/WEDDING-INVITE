# Invitación de Boda — Adriana & Rogelio

Invitación digital interactiva (28 de noviembre de 2026 · Cachito Mountain, Los Naranjos, Sonsonate).

Incluye **dos versiones** del diseño; ambas comparten el mismo contenido, imágenes y formulario de confirmación:

| Archivo | Versión | Navegación |
|---|---|---|
| `index.html` | **Historia** (recomendada) | Botones "Continuar ▸" — cada capítulo se funde con un fondo ilustrado distinto |
| `invitacion-scroll.html` | **Scroll** | Se avanza con scroll; la cámara viaja por el paisaje |

Puedes publicar solo una (renombra la que prefieras a `index.html`) o ambas.

---

## 1. Frameworks y dependencias

**No hay que instalar nada, no hay build, no hay npm.** Son archivos estáticos (HTML + JS + imágenes).

En tiempo de ejecución, el navegador carga automáticamente (por eso se necesita **conexión a internet**):

- **React 18.3.1** y **ReactDOM 18.3.1** — desde `unpkg.com` (los carga `support.js`).
- **Google Fonts** — tipografías *Cormorant Garamond* y *Great Vibes*.

`support.js` es el motor que hace funcionar la página; **no lo edites**.

---

## 2. Estructura de archivos

```
dist/
├── index.html               ← versión Historia (entrada principal)
├── invitacion-scroll.html   ← versión Scroll
├── support.js               ← motor (no editar)
├── assets/
│   ├── novios.png           ← ilustración de los novios
│   ├── luka.png             ← Luka
│   ├── parroquia.png        ← parroquia (ceremonia)
│   ├── cachito.png          ← Cachito "LOVE" (usada en la versión scroll)
│   ├── bg-entrada.png       ← fondo Bienvenida
│   ├── bg-vista.png         ← fondo Ceremonia / Información
│   ├── bg-mesas.png         ← fondo Recepción
│   ├── bg-zona.png          ← fondo Hospedaje
│   ├── bg-love.png          ← fondo Confirmación
│   └── cancion.mp3          ← (agregar tú) música de fondo
└── README.md
```

---

## 3. Probar en tu computadora

Ábrelo con un servidor local (recomendado, evita bloqueos del navegador):

```bash
# opción A (Node)
npx serve dist

# opción B (Python)
cd dist && python -m http.server 8000
```

Luego abre `http://localhost:3000` (o `:8000`). O usa la extensión **Live Server** de VS Code.

---

## 4. Publicar en Cloudflare Pages

1. Entra a Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Upload assets** (o conecta un repo de Git).
2. Sube el contenido de la carpeta `dist/`.
3. Configuración de build:
   - **Framework preset:** `None`
   - **Build command:** *(vacío)*
   - **Build output directory:** `/`
4. Deploy. Listo.

---

## 5. Cómo hacer cambios

Todo el contenido está dentro de `index.html` (y `invitacion-scroll.html`). Ábrelo con cualquier editor de texto (VS Code, Bloc de notas), busca el texto y cámbialo. **Guarda y recarga.**

### Textos, fechas, horas y lugares
Busca la frase que quieres cambiar (por ejemplo `3:00 P.M.`, `Parroquia Nuestra Señora de la Asunción`, `15 de octubre de 2026`) y edítala directamente.

### Enlaces de Google Maps / Waze
Busca `maps.app.goo.gl` o `waze.com` y reemplaza la URL dentro de `href="..."`.

### Códigos de invitados y número de asientos
En `index.html`, busca `guests = {`. Cada invitado es una línea:

```js
guests = {
  'PRUEBA':    { nombre:'Invitado de Prueba', max:5 },
  'FAMILIA01': { nombre:'Familia Martínez',   max:4 },
  'AMIGOS02':  { nombre:'Sr. y Sra. López',   max:2 }
};
```

- `'CODIGO'` — el código que le envías a cada invitado (en MAYÚSCULAS).
- `nombre` — cómo se le saluda en el formulario.
- `max` — máximo de asientos reservados (podrá elegir esa cantidad o menos).

Agrega una línea por invitado. Haz lo mismo en `invitacion-scroll.html` si publicas esa versión.

### Hospedajes
Busca `lodging = [`. Cambia `nombre` y `url`. **Las tarjetas 5 y 6 son marcadores** ("Hospedaje sugerido 5/6"): reemplaza su nombre y su enlace de Maps.

### Imágenes
La forma más fácil: **reemplaza el archivo en `assets/` conservando el mismo nombre**. Para cambiar qué fondo usa cada sección, busca `bgs = [` en `index.html` y cambia el orden/nombres.

### Música
Coloca tu canción en `assets/cancion.mp3`. El botón de disco (abajo a la derecha) la reproduce; si el archivo no existe, aparece un aviso.

### Animaciones (opcional)
En el editor/preview hay controles ("Tweaks") para: **luciérnagas**, **aves** y **movimiento** del fondo. En código son las `props` al inicio de la clase.

---

## 6. IMPORTANTE — Confirmaciones (RSVP)

Hoy el formulario **guarda la respuesta solo en el navegador del invitado** (localStorage). Es una demostración funcional: valida el código, respeta el máximo de asientos y pide alergias y canción, **pero las respuestas NO llegan a un servidor central**, así que aún no puedes ver la lista de confirmados ni controlar el cupo global.

Para recibir las respuestas de verdad y aplicar el límite por invitado se necesita un backend en **Cloudflare Workers + D1 (o KV)**. Ese backend no está incluido en este paquete — puedo construirlo cuando quieras (endpoint de confirmación, base de datos de invitados y panel para ver respuestas).
