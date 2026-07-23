---
name: add-guest
description: Add a new invitee RSVP code to index.html. Use when the user wants to add a guest, family, or group and give them a code to confirm attendance.
---

Add a new entry to the `guests = { ... }` object in `index.html`.

1. Open `index.html` and find `guests = {`.
2. Ask the user (if not already given): the invite code, the display name, and the max number of seats.
   - Code convention: uppercase, no spaces (e.g. `FAMILIA01`, `AMIGOS02`).
3. Insert a new line following the existing pattern:
   ```js
   'CODIGO': { nombre: 'Nombre a mostrar', max: N },
   ```
4. Do not reformat or reorder existing entries — just add the new line, keeping the object's existing style.
5. Do not touch `support.js`.
6. If `invitacion-scroll.html` exists in the repo, mirror the same addition there too (per `README.md`); if it doesn't exist, skip this step.
