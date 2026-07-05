# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Edward S. Hansen's lighting-design portfolio site, plus a handful of standalone
browser tools for theatrical lighting workflows. It's a static site with **no
build system, no package manager, and no test suite** — every page is a
self-contained `.html` file with inline `<style>`/`<script>`, styled with
Bootstrap 5 pulled from a CDN.

The `gh-pages` branch is both the default branch and the one a **Cloudflare
Pages** project auto-deploys from — anything committed/pushed here goes live
immediately. There is no staging branch or CI build step in between.

## Working locally

There is no install/build/lint/test command. To preview changes, either open
the HTML file directly in a browser, or serve the directory so relative paths
and `fetch`/CDN scripts behave the same as production:

```bash
python3 -m http.server
```

Then visit `http://localhost:8000/<page>.html`.

## Site structure

- Portfolio pages: `index.html`, `about.html`, `work.html`, `resume.html`,
  `contact.html`, `contact-thanks.html`, `404.html`.
- `work/*.html` — one page per show, listed from `work.html`.
- `assets/` — images (organized per-section: `home/`, `about/`, `work/`,
  `resume/`), logo SVG, favicon.

## Lighting tools (the interesting part)

These are single-file browser apps with no backend — all parsing/conversion
happens client-side in JS (or in-browser Python via Pyodide). They share a
domain vocabulary worth knowing before editing any of them:

- **Lightwright-style cue list CSV** — columns like `Cue Number`, `Label`,
  `Page Number`, `Time`, `Focus`/`Color`/`Beam`, `Follow/Hang`, etc.
- **ETC Eos ASCII cue export/import format** — CSV wrapped in
  `START_TARGETS` / `END_TARGETS` marker lines, with columns like
  `TARGET_ID`, `TARGET_TYPE`, `TARGET_TYPE_AS_TEXT`, `CUE_NOTES`,
  `SCENE_TEXT`/`SCENE_END`, and separate `_TIME`/`_DELAY` pairs for
  up/down/focus/color/beam fades.

Tools:

- **`cuelist.html`** — Converts a Lightwright-style cuelist CSV into the Eos
  ASCII-import CSV format. Loads Pyodide + pandas/numpy in-browser (see the
  `<script>` block starting around line 173) and runs the actual
  column-remapping/time-parsing logic as a Python string executed via
  `pyodide.runPythonAsync`. If you're modifying the conversion logic, edit the
  embedded Python, not JS.
- **`cuelistcompare.html`** — Audits a Lightwright cuelist CSV against an
  Eos-exported ASCII CSV to find cues present in one but missing in the
  other, and infers likely script page numbers for orphaned Eos cues by
  interpolating between neighboring matched cues. Pure JS CSV parsing, no
  Pyodide.
- **`lxnotes.html`** — "LX Notes" scene-structure builder: define
  acts/scenes/songs and a page→cue map (via manual entry, Excel clipboard
  paste, or CSV import), then export either a timeline CSV or a CSV formatted
  for a specific external Followspot-operator app. Largest of the tools —
  logic is organized into clearly labeled sections (drop-zone setup, dynamic
  row rendering, Excel paste parsing, timeline export, Followspot export,
  bidirectional CSV import) inside one big `<script>` block.
- **`photometrics.html`**, **`rdr.html`** — smaller standalone calculators
  (lux/footcandle photometric conversions; a "double your money" RDR
  calculator), using `math.min.js` from a CDN.

When editing any of the CSV-handling tools, check both ends of the
conversion (the input format's real-world column names and the Eos/Lightwright
CSV quirks — e.g. BOM-prefixed UTF-8 output, `/`-separated up/down time pairs)
rather than assuming a generic CSV shape.

## `public/apps/minigolf/` — isolated Next.js sub-app

This one subdirectory is a completely separate full-stack app (Mini-Golf
score tracker) and does **not** follow anything above: it has its own
`package.json`, Next.js/TypeScript/Tailwind toolchain, Cloudflare D1 database
(`minigolf_db`), and Clerk-based auth. It's deployed as its own, independent
Cloudflare Worker via `@opennextjs/cloudflare` (Cloudflare's current
recommended path for Next.js SSR apps, not the classic Pages product) — its
Workers Builds Git integration is scoped to this subfolder as its root
directory, so its build/deploy never touches the static portfolio site's
Cloudflare Pages project. See `public/apps/minigolf/README.md` for its own
commands —
everything in the rest of this file (no build system, static HTML, etc.)
refers only to the portfolio site outside this directory.
