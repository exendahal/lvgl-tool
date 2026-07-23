export function renderFormatReference(): string {
  return `
  <div class="docs">
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
    </ul>
  </div>`;
}
