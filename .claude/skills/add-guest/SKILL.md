---
name: add-guest
description: Add a new invitee to the RSVP system (Cloudflare D1) and get their unique code. Use when the user wants to add a guest, family, or group and give them a code to confirm attendance.
---

Guests now live in **Cloudflare D1** (table `guests`), NOT in `index.html`. The master list and the code generator live in `../backend/` (outside the deployed repo). Never put guest names/codes in `index.html` or anything under `public/` — it would be served publicly.

Adding a guest = append to the source CSV, regenerate codes, insert the new row into D1. Run everything from the repo root (`dist/`, where `wrangler.toml` is).

## Steps

1. **Get the details** (ask if not given): the family/display **name** and the **max seats** (an integer).

2. **Append to the source CSV** `../backend/asientos_reservados.csv` (header `Familia,ASIENTOS_RESERVADO`). Add ONE line at the **end** — never reorder or insert in the middle; appending keeps every existing code unchanged:
   ```
   Nombre De La Familia,N
   ```

3. **Regenerate the master files**:
   ```bash
   python3 ../backend/generate_codes.py
   ```
   Rewrites `../backend/{codigos.csv,guests.json,seed.sql}`. Existing codes stay identical (fixed seed + append-only); the new family gets a fresh unique 5-char code.

4. **Read the new code** from `../backend/codigos.csv` (the row whose `Familia` matches the name you added).

5. **Insert only the new guest into D1** (escape any `'` in the name by doubling it → `''`):
   ```bash
   npx wrangler d1 execute rsvp --remote \
     --command="INSERT INTO guests (codigo, nombre, asientos) VALUES ('NEWCODE', 'Nombre', N);"
   ```
   Do NOT run the whole `seed.sql` against D1 — it starts with `DELETE FROM guests` and would wipe/reload the table. Insert only the new row.

6. **Report the code** to the user so they can print it on the invitation. Confirm it works:
   ```bash
   npx wrangler d1 execute rsvp --remote --command="SELECT * FROM guests WHERE codigo='NEWCODE';"
   ```

## Notes
- Codes are 5 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/1/I/L/O), unique. `codigo` is the primary key, so a duplicate INSERT fails loudly; if that ever happens, re-run the generator (it picks a different code) — extremely rare.
- Adding several at once: append all lines to the CSV, run the generator once, then do one INSERT per new family.
- To remove a guest: `DELETE FROM guests WHERE codigo='CODE';` and delete their line from `../backend/asientos_reservados.csv`, then re-run the generator.
- Full backend runbook (setup, deploy, exporting responses): `../backend/README.md`.
