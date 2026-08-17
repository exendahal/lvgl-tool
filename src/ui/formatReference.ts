export function renderFormatReference(): string {
  return `
  <div class="docs">
    <h2>FAQ</h2>
    <p><strong>Is this the same as the official LVGL converter?</strong> No — this is an
    independent, open-source alternative to the official lvgl.io/tools converter, built for
    teams who need to target a specific LVGL major version, or want an inspectable client-side
    tool instead of a hosted black-box service.</p>
    <p><strong>Do I need to install anything?</strong> No — it runs entirely in your browser, no
    Python scripts, no Node.js CLI, no server.</p>
    <p><strong>Is my file uploaded anywhere?</strong> No — all conversion happens client-side;
    nothing you load into the tool is ever sent anywhere.</p>

    <h2>Why the version selector matters</h2>
    <p>LVGL's on-disk image and font formats changed meaningfully across v7, v8 and v9.
    Picking the wrong version's output for your firmware's actual LVGL version will fail to
    compile or, worse, compile but render garbage. This page summarizes the structural
    differences this tool accounts for.</p>

    <h3>Image color formats</h3>
    <table>
      <thead><tr><th>Feature</th><th>v7</th><th>v8</th><th>v9</th></tr></thead>
      <tbody>
        <tr>
          <td>Color formats</td>
          <td>TRUE_COLOR, TRUE_COLOR_ALPHA, TRUE_COLOR_CHROMA, INDEXED 1/2/4/8-bit, ALPHA 1/2/4/8-bit, RAW / RAW_CHROMA / RAW_ALPHA (passthrough)</td>
          <td>Same as v7, plus RGB565A8</td>
          <td>New <code>LV_COLOR_FORMAT_*</code> model: RGB565, RGB888, ARGB8888, XRGB8888, indexed I1/I2/I4/I8, L8, A8</td>
        </tr>
        <tr>
          <td>Output struct</td>
          <td><code>lv_img_dsc_t</code></td>
          <td><code>lv_img_dsc_t</code> (compatible with v7)</td>
          <td><code>lv_image_dsc_t</code>, C array or standalone <code>.bin</code> for LV_FS loading</td>
        </tr>
        <tr>
          <td>Compression</td>
          <td>None</td>
          <td>None</td>
          <td>Optional RLE (this tool's RLE is an original scheme requiring app-side decompression — see the generated file's comment header)</td>
        </tr>
      </tbody>
    </table>

    <h3>Transparency approaches</h3>
    <table>
      <thead><tr><th>Approach</th><th>v7</th><th>v8</th><th>v9</th></tr></thead>
      <tbody>
        <tr><td>Chroma key</td><td>TRUE_COLOR_CHROMA</td><td>Same as v7</td><td>Chroma-key flag on RGB formats</td></tr>
        <tr><td>Per-pixel alpha</td><td>TRUE_COLOR_ALPHA</td><td>Same as v7</td><td>ARGB8888</td></tr>
        <tr><td>Alpha-only mask</td><td>ALPHA_1/2/4/8BIT</td><td>Same as v7</td><td>A8</td></tr>
      </tbody>
    </table>

    <p>The transparency workflow has four modes, chosen based on the picked color format's
    <code>supportsAlpha</code>/<code>supportsChroma</code> capability: existing-alpha passthrough,
    single-color-pick (+ tolerance), chroma-key, and <strong>color range</strong> — independent
    min/max bounds per R/G/B channel, an invert toggle, and an optional grey-only gate that
    restricts the effect to near-neutral pixels so a wide background range doesn't punch through
    saturated icon artwork. Color range mode only takes effect on formats with a real alpha
    channel (e.g. <code>TRUE_COLOR_ALPHA</code>, <code>ARGB8888</code>) — picking a non-alpha
    format like plain <code>TRUE_COLOR</code> forces full opacity regardless of the transparency
    settings, since there's nowhere in that format's packed bytes to store per-pixel alpha.</p>

    <h3>Struct layout notes</h3>
    <p><strong>v7/v8</strong> <code>lv_img_dsc_t</code> packs a bitfield header (cf : 5, always_zero : 3,
    reserved : 2, w : 11, h : 11) followed by <code>data_size</code> and a <code>data</code> pointer.</p>
    <p><strong>v9</strong> <code>lv_image_dsc_t</code> instead nests an <code>lv_image_header_t</code>
    (magic : 8, cf : 8, flags : 16, w : 16, h : 16, stride : 16, reserved : 16) ahead of
    <code>data_size</code> and <code>data</code> — the explicit <code>stride</code> field is new in v9
    and matters for anything other than tightly-packed rows.</p>

    <h3>What this tool doesn't guarantee yet</h3>
    <ul>
      <li>The v9 <code>.bin</code> header's numeric <code>LV_COLOR_FORMAT_*</code> and magic values are
      taken from the LVGL v9 sources at time of writing, but LVGL minor releases have shifted these
      before — cross-check against the exact point release you target before shipping a generated
      <code>.bin</code> to production.</li>
      <li>RLE compression is this tool's own scheme, not LVGL's native v9 compressed format — it needs
      a matching decompressor in your app.</li>
      <li>"True color" in v7/v8 depends on your firmware's <code>LV_COLOR_DEPTH</code> build setting;
      pick the matching color depth (16 or 32-bit) in the converter or the packed bytes won't match
      what your LVGL build expects.</li>
      <li>The <strong>Import &amp; Inspect</strong> tab can't tell v7 apart from v8 source files (they
      share an identical struct/macro surface) — it defaults to v8 and lets you override manually.
      It also assumes this tool's own palette byte order ([B,G,R,A]); a file from a different
      generator may decode with swapped colors if its convention differs. Re-exporting a decoded
      image to a different target version isn't implemented yet (tracked as a stretch goal).</li>
    </ul>

    <h3>Font converter — how it works</h3>
    <p>Rather than a WASM-ported FreeType, this tool rasterizes each glyph with the browser's own
    native (antialiased, hinted) text renderer via a temporary <code>FontFace</code> + Canvas, and
    reads real metrics — advance width, glyph existence, and kerning — directly from the font's
    tables via <a href="https://github.com/opentypejs/opentype.js" target="_blank" rel="noopener">opentype.js</a>,
    exactly the "opentype.js + custom rasterizer" fallback the PRD itself proposed. One generated
    <code>.c</code> file targets v7/v8/v9 simultaneously using the same
    <code>LV_VERSION_CHECK(...)</code> preprocessor guards LVGL's own headers provide and the
    official <code>lv_font_conv</code> tool relies on — fonts didn't get a wholesale struct
    replacement in v9 the way images did, so a single adaptive emitter is more trustworthy here
    than three hand-diverged generators.</p>

    <h3>Font converter — known limitations</h3>
    <ul>
      <li><strong>Not implemented:</strong> 3bpp compression-gated glyphs, horizontal subpixel
      rendering, and color-glyph/grayscale icon extraction from color/emoji fonts. v9's "improved
      compression" for font bitmaps is also not reproduced — output is always uncompressed.</li>
      <li><strong><code>LV_SYMBOL_*</code> icons aren't bundled</strong> — this tool doesn't ship
      LVGL's private-use-area icon font. Merge your own copy of it as a second source (the
      "merge an additional font source" option) and reference its codepoints in the explicit
      character list instead.</li>
      <li><strong>Kerning is best-effort</strong>: it reads whatever legacy <code>kern</code> table
      or GPOS pair-adjustment data opentype.js can find in the source font, capped at 500 combined
      glyphs (pairwise lookup is O(n²)). The exact binary layout of
      <code>lv_font_fmt_txt_kern_pair_t</code> and the sparse <code>lv_font_fmt_txt_cmap_t</code>
      struct emitted here are this tool's best recollection of <code>lv_font_fmt_txt.h</code>,
      <strong>not verified against a specific LVGL checkout</strong> — if glyphs render blank or
      kerning looks wrong, check those sections first.</li>
      <li><strong>Glyph vertical positioning</strong> (<code>ofs_x</code>/<code>ofs_y</code>) is
      derived from Canvas coordinate math rather than a verified on-device convention — glyph
      shapes, coverage, and bpp packing are solid, but a small vertical nudge is the most likely
      thing to need correcting if you compare against official-tool output.</li>
      <li>The "fallback font" field only emits a <code>.fallback = &amp;your_name;</code> pointer
      to an <em>already-compiled</em> separate <code>lv_font_t</code> you provide elsewhere — it
      doesn't chain fonts within this tool itself.</li>
      <li>Font <strong>Binary</strong> output is this tool's own experimental format for
      round-tripping, not LVGL's native binary font loader (<code>lv_binfont_create()</code>)
      layout — same caveat as the image path's v9 <code>.bin</code>.</li>
    </ul>
  </div>`;
}
