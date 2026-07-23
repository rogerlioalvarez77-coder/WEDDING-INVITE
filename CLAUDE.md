# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, single-page wedding invitation site (Adriana & Rogelio, 28 nov 2026, Sonsonate). Plain HTML/CSS/JS — **no npm, no build step, no package manager**. At runtime the page loads React 18.3.1 + ReactDOM from `unpkg.com` and Google Fonts, wired up by `support.js`. Content and instructions are in Spanish; see `README.md` for the full editing guide (also in Spanish).

## Do not edit `support.js`

`support.js` is generated output (see its header comment: `GENERATED from dc-runtime/src/*.ts — do not edit. Rebuild with 'cd dc-runtime && bun run build'.`). The `dc-runtime` source is not part of this repo. All content edits happen in `index.html` directly.

## Where things live (in `index.html`)

- `guests = { 'CODE': { nombre: '...', max: N }, ... }` — RSVP codes given to each invitee. `max` is the seat cap for that code.
- `lodging = [...]` — lodging/hotel suggestions shown on the page.
- `bgs = [...]` — ordered list of background images per section (paths into `assets/`).
- Text, dates, times, and map/Waze links are plain strings in the markup — find and edit directly.

## No backend yet

The RSVP form only writes to the guest's browser `localStorage`. There is no server, so responses are not centrally collected and seat limits aren't enforced globally. A Cloudflare Workers + D1/KV backend would be needed for that (not present in this repo).

## Local preview

No build step — just serve the static files:
```bash
npx serve dist
# or
python -m http.server 8000
```

## Deploy

Cloudflare Pages, uploading this directory's contents directly. Framework preset: `None`, build command: empty, output directory: `/`.

## Scope note

`README.md` also describes a second file, `invitacion-scroll.html` (a scroll-navigation variant). That file does not currently exist in this repo — treat it as not in scope unless asked to create it.
