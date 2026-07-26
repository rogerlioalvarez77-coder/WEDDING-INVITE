# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, single-page wedding invitation site (Adriana & Rogelio, 28 nov 2026, Sonsonate) with a small serverless backend for RSVPs. The page is plain HTML/CSS/JS — **no npm, no build step** — and at runtime loads React 18.3.1 + ReactDOM from `unpkg.com` and Google Fonts, wired up by `support.js`. RSVPs are handled by Cloudflare Pages Functions + D1. Content and instructions are in Spanish; see `README.md` for the full editing guide (also in Spanish).

## Repo layout

The git repo root is **also** the Cloudflare Pages project. Only `public/` is served publicly:

- `public/` — the served site: `index.html`, `support.js`, `assets/`. **This is the Pages build output directory.**
- `functions/api/` — Pages Functions (server code): `verify.js`, `rsvp.js`. Must stay at the repo root (not inside `public/`).
- `wrangler.toml` — Pages/D1 config (binding `rsvp`). At the repo root, not served.
- `../backend/` — private data + tooling **outside this repo** (not deployed): guest→code list, code generator, D1 `schema.sql`/`seed.sql`. See `backend/README.md`.

## Do not edit `public/support.js`

`support.js` is generated output (see its header comment: `GENERATED from dc-runtime/src/*.ts — do not edit. Rebuild with 'cd dc-runtime && bun run build'.`). The `dc-runtime` source is not part of this repo. All content edits happen in `public/index.html` directly.

## Where things live (in `public/index.html`)

- The RSVP guest list is **not** in the page — codes/names live in Cloudflare D1 and are verified server-side via `/api/verify`. To add a guest, insert into D1 (see `backend/README.md`).
- `lodging = [...]` — lodging/hotel suggestions shown on the page.
- `bgs = [...]` — ordered list of background images per section (paths into `assets/`).
- Text, dates, times, and map/Waze links are plain strings in the markup — find and edit directly.

## Backend (RSVP)

The form posts to Pages Functions backed by D1 (SQLite):
- `functions/api/verify.js` — validates the code against D1 (guest list never ships in the HTML) and returns any prior answer (`ya` / `previo`).
- `functions/api/rsvp.js` — stores the confirmation (upsert; enforces the seat cap server-side).
- `functions/api/admin.js` — token-gated (`ADMIN_TOKEN`) dump of `responses` + `pending` for `public/admin.html`. It is the **only** endpoint that returns `guests.telefono` / `guests.responsable`; keep it that way. Totals are computed in the browser so the Adriana/Rogelio filter recalculates without another query.

Invitations go out by WhatsApp with the code in the URL (`/?c=RD273`). `index.html` reads
it in the state initializer (`codeFromUrl()`) and auto-verifies on mount, so the form
arrives already personalized. If they already answered, they see that answer plus a
"Modificar respuesta" button instead of a blank form. The sending tool lives in
`../backend/whatsapp_links.py`.

The D1 binding variable is `rsvp`. Private data (guest list, schema, seed) and the full setup/deploy/export runbook live in `../backend/`.

`guests` columns: `codigo, nombre, asientos, telefono, responsable`. Source of truth is `../backend/asientos_reservados.csv` → `python3 generate_codes.py` → `seed.sql` (an idempotent UPSERT — re-running never wipes `rsvp` rows).

## Local preview

Static only (no backend):
```bash
npx serve public
```
With the backend (Functions + D1) locally:
```bash
npx wrangler pages dev
```

## Deploy

Cloudflare Pages via Git integration. Framework preset `None`, build command empty, **build output directory: `public`**. `functions/` (at the repo root) compiles to Pages Functions automatically; `wrangler.toml` defines the D1 binding. Only `public/` is served — config/docs at the repo root stay private.

## Scope note

`README.md` also describes a second file, `invitacion-scroll.html` (a scroll-navigation variant). That file does not currently exist in this repo — treat it as not in scope unless asked to create it.
