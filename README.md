# LVGL Asset Converter

A static, 100% client-side web tool for converting image and font assets into
[LVGL](https://lvgl.io/)-compatible C arrays / binaries — for **LVGL v7, v8, and v9**, since the
on-disk image and font formats changed meaningfully across those majors. Nothing you upload ever
leaves your browser: there is no backend, no upload, no analytics.

Built as an open, inspectable alternative to the official [lvgl.io/tools](https://lvgl.io/tools)
converter for teams maintaining products across multiple LVGL versions, or anyone who'd rather
see exactly what a converter emits than trust a black-box service.

**🔗 Try it online: [exendahal.github.io/lvgl-tool](https://exendahal.github.io/lvgl-tool/)**

## Features

- **Image Converter** — PNG/JPG/BMP/SVG → `lv_img_dsc_t` (v7/v8) or `lv_image_dsc_t` (v9) C
  arrays, or raw binary (RGB332/RGB565/RGB565-swapped/RGB888, or a v9 `.bin`). Version-gated
  color format list, dithering, and a full transparency workflow (color-pick, chroma-key,
  existing-alpha passthrough, edge feather/despill).
- **Import & Inspect (images)** — paste or upload an existing image `.c`/`.bin` source and see it
  decoded back to a picture, with metadata (resolution, format, palette, byte size).
- **Font Converter** — TTF/OTF/WOFF → `lv_font_t`. Rasterizes glyphs with the browser's own
  antialiased text renderer and reads real advance-width/kerning metrics via
  [opentype.js](https://github.com/opentypejs/opentype.js) rather than shipping a WASM port of
  FreeType. Supports Unicode range + explicit symbol list (combinable), merging a second font
  source, letter-spacing, and best-effort kerning.
- **Font Import & Inspect** — paste or upload an existing font `.c` source and see a rendered
  glyph grid with metadata (bpp, line height, kerning presence, flash footprint), without needing
  the original TTF.
- **Format Reference** — an in-app page summarizing the structural differences between v7/v8/v9,
  and a frank list of what this tool doesn't guarantee yet (see below).

## Project status / known limitations

This is under active development. A few things are deliberately simplified or not yet
implemented, and are called out both in the app's **Format Reference** tab and in code comments
at the relevant spot:

- v9 RLE "compression" is this tool's own experimental scheme, not LVGL's native compressed
  format — it needs a matching decompressor in your app.
- The v9 `.bin` header's numeric `LV_COLOR_FORMAT_*`/magic values, and the font converter's sparse
  cmap / kerning-pair struct layout, are this tool's best recollection of the LVGL C sources —
  **not verified against a specific LVGL checkout**. Cross-check before shipping to production
  firmware.
- Font converter: no 3bpp compression-gated glyphs, no horizontal subpixel rendering, no
  color-glyph/grayscale icon extraction, and no bundled `LV_SYMBOL_*` icon font (merge your own
  copy of it as a second source instead).
- Batch conversion, zip download, and project save/reload (PRD §5.6) aren't built yet.

---

## Developer guide

### Quick start (Docker Compose — recommended)

No local Node.js installation needed; this is the fastest way to get a working dev environment.

```bash
# Hot-reloading dev server at http://localhost:5173
docker compose up dev
```

Edit files under `src/` on your host as usual — they're bind-mounted into the container and
Vite picks up changes immediately.

To check the actual production build (what will get deployed), served by nginx:

```bash
# Production build preview at http://localhost:8080
docker compose --profile prod up preview
```

Stop everything with `docker compose --profile prod down` (or just `docker compose down` if you
only started `dev`).

### Quick start (without Docker)

Requires Node.js 20+.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Typecheck, then produce a production build in `dist/` |
| `npm run preview` | Serve the built `dist/` locally (after `npm run build`) |
| `npm run typecheck` | Typecheck only, no build output |

---

## Support & Motivation

Maintaining and improving this library takes time and effort.
If you find it useful and would like to support future enhancements or ongoing maintenance,
you can do so [here](https://buymemomo.com/exendahal).

Thank you for using and supporting the project.
