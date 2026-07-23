# PRD: LVGL Asset Converter (Fonts & Images) — GitHub Pages Tool

**Author:** Santosh
**Status:** Draft v1
**Target platform:** Static site on GitHub Pages (client-side only, no backend)
**Scope:** Font conversion + Image conversion for LVGL v7, v8, and v9

---

## 1. Problem Statement

LVGL ships an official web converter (lvgl.io/tools), but it targets whichever LVGL version the site currently maintains and doesn't cleanly let a user pick "give me a v7-compatible array" vs "give me a v9-compatible array." Teams maintaining embedded products across multiple LVGL versions (common in long-lived firmware, or when different product lines froze on different LVGL majors) have no single place to generate assets for whichever version they're actually shipping.

There's also no offline-friendly, open-source, inspectable alternative — useful for CI pipelines, air-gapped build environments, or just trusting what the tool is actually emitting instead of a black-box service.

## 2. Goals

- One static web tool, hosted free on GitHub Pages, that converts:
  - **Images** → LVGL C array / binary image descriptor, or LVGL v9 image `.bin` for LVGL's filesystem-loaded images
  - **Fonts** (TTF/OTF/WOFF) → LVGL C font array (`lv_font_t`)
- Correct output for **LVGL v7, v8, and v9**, since the on-disk structures for both fonts and images changed across these majors.
- 100% client-side (WASM/JS in-browser) — no file ever leaves the user's machine, no server cost, works offline once cached.
- Batch conversion (multiple images/fonts in one pass) for real project workflows, not just one-off single-file conversions.
- Reasonably matches or exceeds the output of the official LVGL converter in fidelity, so it can be a drop-in replacement.

## 3. Non-Goals

- Not a general-purpose image editor or font editor — no cropping, hinting adjustment, or glyph editing.
- Not a UI layout/screen designer (that's LVGL's SquareLine/GUI Guider territory).
- No account system, no cloud storage, no analytics tied to file contents.
- No support for pre-v7 LVGL (v6 and earlier use a substantially different, largely obsolete image format) — out of scope unless there's later demand.

## 4. Target Users

- Embedded/firmware developers using LVGL who need font/image assets and want version-correct output without installing the Python-based `lv_font_conv` / `LVGLImage.py` CLI tools locally.
- Teams with LVGL v7 or v8 legacy products still in maintenance, where the current official tool has drifted toward v9-only defaults and formats.
- Anyone who wants a scriptable/offline alternative for CI (even though this is primarily a manual web tool, output should be deterministic enough to diff in CI if someone automates it via a headless browser).

## 5. Key Functional Requirements

### 5.1 Version Selector (global, top-level control)
- A single, prominent LVGL version selector: **v7 / v8 / v9**, since format, options, and output structure differ meaningfully across majors and this choice should gate all downstream options.
- Persist last-used version selection (localStorage) so returning users don't have to reselect every time.

### 5.2 Image Converter

**Input:** PNG, JPG, BMP, and **SVG** (rasterized at a user-chosen target resolution before conversion, since LVGL's own array/binary formats are raster-only); batch upload supported.

**Version-specific output differences to handle correctly:**

| Feature | v7 | v8 | v9 |
|---|---|---|---|
| Color formats | `LV_IMG_CF_TRUE_COLOR`, `TRUE_COLOR_ALPHA`, `TRUE_COLOR_CHROMA`, indexed (1/2/4/8-bit), alpha-only, `RAW`/`RAW_CHROMA`/`RAW_ALPHA` (passthrough — original file bytes embedded as-is, decoded by the app rather than LVGL) | Same family as v7, plus `RGB565A8` | New format model (`LV_COLOR_FORMAT_*`): RGB565, RGB888, ARGB8888, XRGB8888, indexed 1/2/4/8-bit, L8, A8, native RLE-compressed variants |
| Output container | `lv_img_dsc_t` C array | `lv_img_dsc_t` C array (mostly compatible with v7) | `lv_image_dsc_t` C array **or** standalone `.bin` file for `LV_FS`-based runtime loading |
| Compression | None | None | Optional RLE compression (v9 feature) |
| Byte order / endianness options | Standard | Standard | Configurable, since v9 supports more display controllers directly |

- Output options:
  - **C array (.c file)** — the default, wrapped in the version-appropriate `lv_img_dsc_t`/`lv_image_dsc_t` struct.
  - **Raw binary variants** (no C wrapper, for direct flashing or filesystem loading): **Binary RGB332, RGB565, RGB565 (byte-swapped), RGB888**, plus the v9 `lv_image_dsc_t`-headed `.bin` for `LV_FS`-based runtime loading. These are distinct output modes, not just a generic ".bin" — each packs pixels differently and should be separate, clearly labeled choices.
  - **Raw passthrough** (v7/v8 `CF_RAW*` formats): embed the original compressed file bytes (e.g. a JPEG/PNG blob) unmodified, for cases where the app decodes the image itself at runtime rather than relying on LVGL's built-in decoder.
- Color format dropdown that only shows options valid for the selected LVGL version (don't let someone pick a v9-only format while targeting v7).
- Dithering toggle for color-reduced/indexed formats.
- Preview pane showing the converted image rendered back from the generated data, so users can visually confirm color format hasn't introduced banding or corruption before they use it.
- Configurable C array variable name / output file name, with a batch-mode naming pattern (e.g., `{filename}_img`).

**Transparency tools:**

Since transparency handling differs meaningfully by LVGL version, this needs to be a first-class part of the image workflow rather than an afterthought:

| Approach | v7 | v8 | v9 |
|---|---|---|---|
| Chroma key (single "magic" color = transparent) | `LV_IMG_CF_TRUE_COLOR_CHROMA` | Same as v7 | Supported via chroma-key flag on RGB formats |
| Per-pixel alpha channel | `LV_IMG_CF_TRUE_COLOR_ALPHA` | Same as v7 | ARGB8888 / native alpha-supporting formats |
| Alpha-only mask (single-channel, for icons tinted at runtime) | `LV_IMG_CF_ALPHA_1/2/4/8BIT` | Same as v7 | `A8`/similar alpha-only format |

- **"Make background transparent" tool**, offered a few ways depending on the source image:
  - **Color-pick transparency**: user clicks a pixel (or the tool auto-samples a corner) to pick the background color, with a tolerance/threshold slider so near-matching shades (anti-aliased edges, JPEG artifacts) are included rather than leaving a color fringe.
  - **Existing-alpha passthrough**: if the source PNG already has an alpha channel, preserve it directly and just repack into the target color format's alpha representation.
  - **Chroma-key mode**: for v7/v8/v9 formats that use a magic transparent color instead of a real alpha channel, let the user pick that magic color explicitly (defaulting to LVGL's usual magenta `#FF00FF` convention) — separate from the alpha-channel path above, since the two are handled completely differently on-device.
- Live before/after preview on a checkerboard background (standard transparency-preview convention) so the user can visually confirm edges aren't leaving halos or hard color fringing before export.
- Edge-cleanup option: a simple "despill"/feather toggle on the transparent edge, useful for icons exported from tools that leave faint anti-aliased background color at the boundary.
- Format-aware gating: if the selected color format for the chosen LVGL version doesn't support transparency at all (e.g., plain indexed without an alpha variant), disable the transparency controls and show why, rather than silently ignoring them.

### 5.3 Font Converter

**Input:** TTF, OTF, WOFF; also support specifying a **Unicode range or explicit character list** (e.g., "0x20-0x7E" plus custom symbols), since embedded builds care a lot about flash footprint.

**Version-specific output differences to handle correctly:**

| Feature | v7 | v8 | v9 |
|---|---|---|---|
| Font struct | `lv_font_t` (older field layout) | `lv_font_t` (kerning table format changed vs v7; subpixel options added) | `lv_font_t` (further internal layout changes; better compression support) |
| Bits-per-pixel | 1/2/4/8 bpp | 1/2/4/8 bpp | 1/2/4/8 bpp, plus improved compression |
| Compression | None | Optional RLE-style compression (introduced in v8) | Improved compression algorithm, smaller output typically |
| Fallback font chaining | Not supported | Supported | Supported, refined API |
| Kerning | Basic | Normal + sparse kerning table options | Same options, updated internal format |

- Standard controls: font size (px), bpp (**1/2/4/8-bit**, plus **3-bit** available when compression is enabled — matches the official tool's compression-gated 3bpp option), letter spacing/kerning on-off, fallback font selection, symbol inclusion (common LVGL symbol set like `LV_SYMBOL_*` icons as a checkbox add-on).
- Character range picker with common presets (ASCII, Latin-1 Supplement, Latin Extended-A, common CJK subsets) plus free-text Unicode range input — relevant given your prior work adding extended Latin support for European-language embedded fonts.
- **Range and Symbols as two independent, combinable inputs**: a Unicode range field (e.g. `0x20-0x7E`) and a separate explicit-character/symbol list field, usable together or individually — matches the official tool's model rather than forcing one or the other.
- **Merge multiple source fonts into one output** ("include another font"): let the user add a second (or further) TTF/OTF/WOFF source, each with its own range/symbols, and combine them into a single generated C array/font struct — common pattern for base font + icon font merges.
- **Horizontal subpixel rendering** toggle (may improve perceived quality on LCD subpixel layouts at the cost of larger output) — expose as an explicit UI control, not just an internal struct detail.
- **Color-glyph/grayscale icon extraction**: option to pull glyph color info from color/emoji-style fonts and emit it as a grayscale icon (gray tones emulated via transparency, so results are best on a contrasting solid background) — useful for icon fonts that encode shading in color rather than pure vector outlines.
- Output: **C file** (`.c`/`.h` pair, sized/labeled per LVGL version conventions) **or Binary** — both should be supported output modes, not just C array.
- Live glyph preview grid showing rendered output at actual target size/bpp before download.

### 5.4 `.c` Font Preview (Import & Inspect)

A reverse-direction feature: let a user upload an **existing LVGL font `.c` file** (one they already generated, inherited from a legacy project, or pulled from someone else's repo) and see it rendered as a glyph grid, without needing the original TTF/OTF source.

**Use cases:**
- Auditing an unfamiliar/legacy codebase's font assets to see what's actually in there before deciding whether to regenerate them.
- Verifying that a font someone else generated (via the official tool, `lv_font_conv`, or this tool) actually looks right and matches its claimed bpp/size/range, without wiring it into real firmware first.
- Spot-checking that a hand-edited or partially-corrupted `.c` array still decodes to sane glyph bitmaps.

**Requirements:**
- File upload (or paste) of a `.c` (and optional matching `.h`) font source.
- Parser per LVGL version profile (v7/v8/v9), since `lv_font_t` field layout, kerning table format, and bitmap packing differ by version — reuse the same profile modules as the conversion engine, just running decode instead of encode.
- Auto-detect version where feasible (struct field names/comments often hint at the LVGL version used to generate the file), falling back to the user's manually selected version if detection is ambiguous.
- Render a glyph grid (same preview component used during conversion) showing each character at actual bpp/size, plus summary metadata: font size, bpp, compression on/off, character range covered, kerning present y/n, approximate flash footprint (byte size of the array).
- Graceful error handling for malformed/unsupported files — report *what* failed to parse (e.g., "unrecognized struct layout, doesn't match v7/v8/v9 profile") rather than a silent blank preview, since this is exactly the kind of tool where a wrong-looking failure needs to be diagnosable.
- Nice-to-have: a "re-export" button that takes the parsed/decoded font and re-emits it in a different target LVGL version's format — effectively font migration between LVGL majors without needing the original TTF. Worth flagging as a stretch goal rather than V1 scope, since it depends on the decode path being solid first.

### 5.5 `.c` Image Preview (Import & Inspect)

The image-side counterpart to font preview: let a user upload an **existing LVGL image `.c` file** (or v9 `.bin`) and see the actual decoded picture, not just skim array declarations and header comments.

**Use cases:**
- Auditing a legacy or inherited codebase's image assets — confirming what's actually baked into an array before deciding whether to touch it.
- Verifying a colleague's (or the official tool's) conversion output actually looks right, without flashing it to a device first.
- Spot-checking a hand-edited, git-merged, or possibly-corrupted array still decodes to a sane image.
- Reverse-engineering an asset's color format/size when the original source image has been lost and only the `.c`/`.bin` remains.

**Requirements:**
- File upload (or paste) of a `.c` image source, or a v9-style `.bin` binary blob.
- Parser per LVGL version profile (v7/v8/v9), decoding the `lv_img_dsc_t` (v7/v8) or `lv_image_dsc_t` (v9) header fields — width, height, color format, stride — then unpacking pixel data accordingly (true-color, indexed + palette, alpha-only, or v9's RLE-compressed variants).
- Auto-detect version/format from header fields and struct shape where possible, with manual override if detection is ambiguous (e.g., a v8 file using a color format that also exists unchanged in v9).
- Render the decoded image directly to a canvas at native resolution, with a zoom control for small icon-sized assets (embedded UI icons are often 16–32px and hard to inspect at 1:1).
- Show metadata alongside the preview: resolution, color format, indexed palette (if any), compression on/off, byte size — useful for flash-budget auditing across a whole asset set.
- Graceful, specific error reporting for malformed/unrecognized data ("header doesn't match any known v7/v8/v9 image descriptor layout") rather than a blank canvas.
- Nice-to-have / stretch: a "re-export" action to re-emit the decoded image in a different target version's format or color format (e.g., migrate a v7 indexed-4bpp icon set forward to v9's RLE-compressed format) — same "decode once, re-encode elsewhere" pattern as the font stretch goal, and could share a fair bit of the underlying pipeline.

### 5.6 Batch & Project Workflow
- Multi-file drag-and-drop for both images and fonts.
- A single "Download All" as a zipped bundle, generated client-side (e.g., via a JS zip library) — no server round-trip.
- Optional persisted "project" of conversion settings (localStorage or exportable JSON config) so a user can reconvert the same asset set later with identical settings after a source image/font changes.

### 5.7 Format Documentation / Diffing Aid
- A reference page (static content) summarizing the image/font structural differences per version — genuinely useful since this is the exact confusion that motivates the tool, and doubles as the tool's own documentation of *why* the version selector matters.

## 6. Non-Functional Requirements

- **Fully static**, deployable via GitHub Actions to GitHub Pages — no server-side conversion logic.
- Conversion logic runs in-browser: reuse or port the logic from LVGL's own open-source CLI converters (`lv_font_conv` is Node-based — can run via a bundled WASM/JS build in-browser; `LVGLImage.py` logic needs a JS/WASM port or reimplementation for images).
- Target bundle size manageable enough for fast first load on GitHub Pages (lazy-load conversion engines per-format so users converting only images don't pay the font-engine download cost, and vice versa).
- Works fully offline after first load (consider a simple service worker/PWA manifest, optional nice-to-have).
- No file upload leaves the browser — this should be an explicit, visible claim in the UI (builds trust vs. a hosted converter).
- Cross-browser: latest Chrome, Firefox, Safari, Edge. No IE support needed.
- Mobile-responsive isn't critical (this is a dev tool, desktop-first), but shouldn't be broken on a tablet.

## 7. Technical Approach / Architecture

- **Hosting:** GitHub Pages, deployed via GitHub Actions on push to `main` (mirrors your existing DietNet CI/CD experience with GitHub Actions multi-target distribution).
- **Frontend stack:** Plain JS/TS + a lightweight framework (or none) — given this is a static, mostly-form-driven tool, a heavy SPA framework isn't necessary; something like Vite + vanilla TS or a minimal framework keeps load times low.
- **Conversion engines:**
  - Font: port/wrap `lv_font_conv` (Node.js-based today) to run client-side — likely via bundling it for the browser or reimplementing the core bitmap-font-generation logic (freetype-wasm or opentype.js + custom rasterizer) if the Node tool doesn't bundle cleanly for browser use.
  - Image: reimplement `LVGLImage.py`'s logic in JS/TS, since it's a well-defined, relatively small transformation (pixel format packing + optional RLE), rather than trying to run Python-in-browser (Pyodide) purely for this.
- **Version-specific logic:** implemented as pluggable "profile" modules (`v7Profile`, `v8Profile`, `v9Profile`) each defining valid color formats, struct layout, and serialization — keeps the codebase maintainable as LVGL v10 eventually appears.
- **Zipping for batch download:** a client-side zip library (e.g., `fflate` or `JSZip`).

## 8. Success Metrics

Since this is an open-source utility rather than a monetized product, success looks like:
- Tool produces byte-correct (or behaviorally identical) output vs. the official LVGL CLI tools for the same input/settings, across all three supported versions.
- Adoption signals: GitHub stars, issues/PRs from other LVGL users, mentions in LVGL community forum/Discord.
- Personal utility: replaces your own local CLI usage for Locator Link / embedded UI work without friction.

## 9. Risks / Open Questions

- **Maintenance burden of tracking LVGL format changes**: v9 introduced significant changes and v10 will eventually land — the "profile" architecture should make this additive rather than a rewrite, but confirm this before locking the architecture.
- **Font engine complexity**: rasterizing arbitrary TTF/OTF fonts to bitmap fonts client-side is the hardest technical piece (hinting, subpixel rendering, kerning tables) — worth prototyping this first as the highest-risk item before committing to the rest of the scope.
- **Fidelity validation**: needs a test suite that compares output against the official LVGL converter / CLI tools for a fixed set of sample inputs per version, to catch regressions.
- **License compatibility**: confirm the license of any ported LVGL converter code (LVGL is MIT-licensed, which should be permissive enough to port logic into this tool, but worth explicitly checking before reusing code).

## 10. Milestones (Suggested)

1. **Spike:** Prototype v9 image conversion only (smallest scope, validates the "no-server, client-side" approach end to end).
2. **V1:** Image converter for all three versions (v7/v8/v9), single-file only.
3. **V2:** Add batch mode + zip download for images.
4. **V3:** Font converter, starting with v9, then backfilling v8/v7.
5. **V4:** Batch mode for fonts, project-save/reload, format reference docs page.
6. **V5 (stretch):** PWA/offline support, drag-and-drop project config sharing.

