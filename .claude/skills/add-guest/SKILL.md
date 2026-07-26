---
name: add-guest
description: Add a new invitee to the RSVP system (Cloudflare D1) and get their unique code. Use when the user wants to add a guest, family, or group and give them a code to confirm attendance.
---

Guests now live in **Cloudflare D1** (table `guests`), NOT in `index.html`. The master list and the code generator live in `../backend/` (outside the deployed repo). Never put guest names/codes in `index.html` or anything under `public/` — it would be served publicly.

Adding a guest = append to the source CSV, regenerate codes, insert the new row into D1. Run everything from the repo root (`dist/`, where `wrangler.toml` is).

## Steps

1. **Get the details** (ask if not given): the family/display **name**, the **max seats** (integer), their **phone** (international format) and the **responsable** — which of the two is inviting them, `Adriana` or `Rogelio`. Phone and responsable may be left empty, but ask: without a phone they can't be messaged from `envios.html` or `/admin.html`.

2. **Append to the source CSV** `../backend/asientos_reservados.csv` (header `Familia,ASIENTOS_RESERVADO,Telefono,Responsable`). Add ONE line at the **end** — never reorder or insert in the middle; appending keeps every existing code unchanged:
   ```
   Nombre De La Familia,N,+503 7000 1234,Adriana
   ```
   8-digit numbers are assumed to be +503; US (+1) and Italy (+39) must carry their country code.

3. **Regenerate the master files**:
   ```bash
   python3 ../backend/generate_codes.py
   ```
   Rewrites `../backend/{codigos.csv,guests.json,seed.sql}`. Existing codes stay identical (fixed seed + append-only); the new family gets a fresh unique 5-char code. Check the printed summary for phone warnings.

4. **Read the new code** from `../backend/codigos.csv` (the row whose `Familia` matches the name you added).

5. **Update D1.** `seed.sql` is an idempotent UPSERT (it does *not* delete rows that have already answered), so the whole file is safe to run and is the preferred way:
   ```bash
   npx wrangler d1 execute rsvp --remote --file=../backend/seed.sql
   ```
   To touch only the new row instead (escape any `'` in the name by doubling it → `''`):
   ```bash
   npx wrangler d1 execute rsvp --remote \
     --command="INSERT INTO guests (codigo, nombre, asientos, telefono, responsable) VALUES ('NEWCODE', 'Nombre', N, '503XXXXXXXX', 'Adriana');"
   ```

6. **Report the code** to the user so they can send the invitation link (`https://wedding-invite-4a7.pages.dev/?c=NEWCODE`). Confirm it works:
   ```bash
   npx wrangler d1 execute rsvp --remote --command="SELECT * FROM guests WHERE codigo='NEWCODE';"
   ```

7. **If they want to send it now**, regenerate the WhatsApp launcher:
   ```bash
   python3 ../backend/whatsapp_links.py && xdg-open ../backend/envios.html
   ```

## Notes
- Codes are 5 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/1/I/L/O), unique. `codigo` is the primary key, so a duplicate INSERT fails loudly; if that ever happens, re-run the generator (it picks a different code) — extremely rare.
- Adding several at once: append all lines to the CSV, run the generator once, then run `seed.sql` once.
- To remove a guest: delete their line from `../backend/asientos_reservados.csv`, re-run the generator, then run `seed.sql` — its trailing `DELETE … WHERE codigo NOT IN (…)` removes them, unless they already answered (that row is kept on purpose so no confirmation is lost; delete it by hand from `rsvp` first if you really mean it).
- `telefono` and `responsable` are only ever exposed through `/api/admin` (password-gated). Never surface them in `index.html` or `/api/verify`.
- Full backend runbook (setup, deploy, exporting responses): `../backend/README.md`.
