import './style.css';
import type { BinaryRawVariant, ColorFormatDef, ConversionResult, DecodedImage, LvglVersion, OutputMode, TransparencyMode } from './lib/types';
import { decodeImageFile, readSvgIntrinsicSize } from './lib/imageLoad';
import { toCIdentifier } from './lib/bytes';
import { getFormats, findFormat } from './profiles';
import { packPixels, encodeRawPassthrough, buildPreviewRgba } from './image/formats';
import { applyTransparency, autoSampleCornerColor, samplePixelColor, DEFAULT_CHROMA_COLOR } from './image/transparency';
import { generateCArrayFile } from './image/encodeCArray';
import { encodeBinaryRaw, encodeV9Bin } from './image/encodeBinary';
import { combinePixelBytes, maybeRle } from './image/combine';
import { downloadBytes, downloadText } from './ui/download';
import { paintOnCheckerboard } from './ui/checkerboard';
import { renderFormatReference } from './ui/formatReference';

const VERSION_STORAGE_KEY = 'lvgl-tool.version';

interface AppState {
  version: LvglVersion;
  file: File | null;
  decodedImage: DecodedImage | null;
  svgWidth: number;
  svgHeight: number;
  formatId: string;
  colorDepth: 16 | 32;
  dithering: boolean;
  transparencyMode: TransparencyMode;
  pickedColor: [number, number, number];
  tolerance: number;
  feather: number;
  varName: string;
  fileNameBase: string;
  outputMode: OutputMode;
  binaryVariant: BinaryRawVariant;
  rle: boolean;
  result: ConversionResult | null;
  pickingFromImage: boolean;
}

function loadPersistedVersion(): LvglVersion {
  const saved = localStorage.getItem(VERSION_STORAGE_KEY);
  return saved === 'v7' || saved === 'v8' || saved === 'v9' ? saved : 'v9';
}

const state: AppState = {
  version: loadPersistedVersion(),
  file: null,
  decodedImage: null,
  svgWidth: 256,
  svgHeight: 256,
  formatId: '',
  colorDepth: 16,
  dithering: false,
  transparencyMode: 'none',
  pickedColor: [...DEFAULT_CHROMA_COLOR],
  tolerance: 24,
  feather: 0,
  varName: 'img',
  fileNameBase: 'img',
  outputMode: 'carray',
  binaryVariant: 'RGB565',
  rle: false,
  result: null,
  pickingFromImage: false,
};

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="app-header">
    <h1>LVGL Asset Converter</h1>
    <div class="trust-banner">🔒 100% client-side — nothing you upload ever leaves your browser</div>
  </header>

  <div class="version-select">
    <label for="version-select" style="margin:0;">LVGL version</label>
    <select id="version-select">
      <option value="v7">v7</option>
      <option value="v8">v8</option>
      <option value="v9">v9</option>
    </select>
  </div>

  <div class="tabs">
    <button id="tab-convert-btn" class="active">Image Converter</button>
    <button id="tab-docs-btn">Format Reference</button>
  </div>

  <section id="panel-convert" class="panel active">
    <div class="grid">
      <div>
        <fieldset>
          <legend>Source image</legend>
          <div id="drop-zone">Drop a PNG / JPG / BMP / SVG here, or click to choose a file</div>
          <input type="file" id="file-input" accept=".png,.jpg,.jpeg,.bmp,.svg,image/*" style="display:none" />
          <div class="row" id="svg-size-row" style="display:none">
            <div class="field">
              <label for="svg-width">SVG target width (px)</label>
              <input type="number" id="svg-width" min="1" value="256" />
            </div>
            <div class="field">
              <label for="svg-height">SVG target height (px)</label>
              <input type="number" id="svg-height" min="1" value="256" />
            </div>
          </div>
          <p class="note" id="file-info"></p>
        </fieldset>

        <fieldset>
          <legend>Color format</legend>
          <div class="field">
            <label for="format-select">Color format (options shown are only those valid for the selected LVGL version)</label>
            <select id="format-select"></select>
          </div>
          <div class="row field" id="color-depth-row" style="display:none">
            <div>
              <label><input type="radio" name="color-depth" value="16" checked /> 16-bit (RGB565) — matches LV_COLOR_DEPTH 16</label>
            </div>
            <div>
              <label><input type="radio" name="color-depth" value="32" /> 32-bit — matches LV_COLOR_DEPTH 32</label>
            </div>
          </div>
          <div class="checkbox-field field">
            <input type="checkbox" id="dithering-checkbox" />
            <label for="dithering-checkbox" style="margin:0">Enable dithering (Floyd–Steinberg) for color-reduced/indexed formats</label>
          </div>
          <p class="note" id="raw-passthrough-note" style="display:none">Raw passthrough formats embed the original file bytes unmodified — color/dithering/transparency options don't apply.</p>
        </fieldset>

        <fieldset id="transparency-fieldset">
          <legend>Transparency</legend>
          <div class="field">
            <label for="transparency-mode">Approach</label>
            <select id="transparency-mode">
              <option value="none">None (fully opaque)</option>
              <option value="existingAlpha">Existing-alpha passthrough (use the source PNG's alpha channel)</option>
              <option value="colorPick">Color-pick transparency (pick a background color + tolerance)</option>
              <option value="chromaKey">Chroma-key (magic transparent color)</option>
            </select>
          </div>
          <div id="transparency-controls" style="display:none">
            <div class="row field" id="color-pick-row">
              <div>
                <label for="chroma-color">Picked / chroma color</label>
                <input type="color" id="chroma-color" value="#ff00ff" style="width:100%; height:2.2rem;" />
              </div>
              <div>
                <label>&nbsp;</label>
                <button type="button" class="secondary" id="pick-from-image-btn">Pick from preview →</button>
              </div>
            </div>
            <div class="field" id="tolerance-row">
              <label for="tolerance-slider">Tolerance (<span id="tolerance-value">24</span>)</label>
              <input type="range" id="tolerance-slider" min="0" max="150" value="24" />
            </div>
            <div class="field" id="feather-row">
              <label for="feather-slider">Edge feather / despill radius (<span id="feather-value">0</span>px)</label>
              <input type="range" id="feather-slider" min="0" max="8" value="0" />
            </div>
          </div>
          <p class="note warn" id="transparency-disabled-note" style="display:none">This color format has no alpha or chroma-key support for the selected LVGL version — transparency controls are disabled.</p>
        </fieldset>

        <fieldset>
          <legend>Output</legend>
          <div class="row field">
            <div>
              <label for="var-name-input">C variable name</label>
              <input type="text" id="var-name-input" value="img" />
            </div>
            <div>
              <label for="file-name-input">Output file name (no extension)</label>
              <input type="text" id="file-name-input" value="img" />
            </div>
          </div>
          <div class="field">
            <label for="output-mode-select">Output mode</label>
            <select id="output-mode-select">
              <option value="carray">C array (.c file)</option>
              <option value="binaryRaw">Raw binary (no C wrapper)</option>
              <option value="bin9">v9 .bin (LV_FS-loadable, header + data)</option>
            </select>
          </div>
          <div class="field" id="binary-variant-row" style="display:none">
            <label for="binary-variant-select">Raw binary variant</label>
            <select id="binary-variant-select">
              <option value="RGB332">RGB332 (1 byte/pixel)</option>
              <option value="RGB565">RGB565 (2 bytes/pixel, little-endian)</option>
              <option value="RGB565_SWAPPED">RGB565 byte-swapped (big-endian)</option>
              <option value="RGB888">RGB888 (3 bytes/pixel)</option>
            </select>
            <p class="note">Raw binary output packs straight R,G,B channel order and is not dithered in this version — pick a color format above for a dithered, transparency-aware C array instead.</p>
          </div>
          <div class="checkbox-field field" id="rle-row" style="display:none">
            <input type="checkbox" id="rle-checkbox" />
            <label for="rle-checkbox" style="margin:0">RLE-compress (experimental, custom scheme — see Format Reference)</label>
          </div>
        </fieldset>

        <div class="actions">
          <button class="primary" id="convert-btn" disabled>Convert</button>
          <button class="secondary" id="download-btn" disabled>Download</button>
          <button class="secondary" id="copy-btn" disabled>Copy to clipboard</button>
        </div>
        <p class="status" id="status-msg"></p>
      </div>

      <div>
        <fieldset>
          <legend>Preview</legend>
          <div class="preview-row">
            <div class="preview-box">
              <canvas id="preview-before"></canvas>
              <div class="caption">Source (click to pick a transparency color)</div>
            </div>
            <div class="preview-box">
              <canvas id="preview-after"></canvas>
              <div class="caption">Converted (simulated at target format precision)</div>
            </div>
          </div>
        </fieldset>
        <fieldset>
          <legend>Generated output</legend>
          <textarea id="output-text" readonly placeholder="Convert an image to see the generated C array here. Binary outputs won't render as text — use Download."></textarea>
        </fieldset>
      </div>
    </div>
  </section>

  <section id="panel-docs" class="panel">
    ${renderFormatReference()}
  </section>

  <footer class="app-footer">LVGL Asset Converter — static, client-side, open-source. See the Format Reference tab for known limitations before shipping generated assets to production firmware.</footer>
`;

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const versionSelect = $<HTMLSelectElement>('version-select');
const tabConvertBtn = $<HTMLButtonElement>('tab-convert-btn');
const tabDocsBtn = $<HTMLButtonElement>('tab-docs-btn');
const panelConvert = $<HTMLDivElement>('panel-convert');
const panelDocs = $<HTMLDivElement>('panel-docs');

const dropZone = $<HTMLDivElement>('drop-zone');
const fileInput = $<HTMLInputElement>('file-input');
const svgSizeRow = $<HTMLDivElement>('svg-size-row');
const svgWidthInput = $<HTMLInputElement>('svg-width');
const svgHeightInput = $<HTMLInputElement>('svg-height');
const fileInfo = $<HTMLParagraphElement>('file-info');

const formatSelect = $<HTMLSelectElement>('format-select');
const colorDepthRow = $<HTMLDivElement>('color-depth-row');
const ditheringCheckbox = $<HTMLInputElement>('dithering-checkbox');
const rawPassthroughNote = $<HTMLParagraphElement>('raw-passthrough-note');

const transparencyModeSelect = $<HTMLSelectElement>('transparency-mode');
const transparencyControls = $<HTMLDivElement>('transparency-controls');
const transparencyDisabledNote = $<HTMLParagraphElement>('transparency-disabled-note');
const chromaColorInput = $<HTMLInputElement>('chroma-color');
const pickFromImageBtn = $<HTMLButtonElement>('pick-from-image-btn');
const toleranceSlider = $<HTMLInputElement>('tolerance-slider');
const toleranceValue = $<HTMLSpanElement>('tolerance-value');
const featherSlider = $<HTMLInputElement>('feather-slider');
const featherValue = $<HTMLSpanElement>('feather-value');

const varNameInput = $<HTMLInputElement>('var-name-input');
const fileNameInput = $<HTMLInputElement>('file-name-input');
const outputModeSelect = $<HTMLSelectElement>('output-mode-select');
const binaryVariantRow = $<HTMLDivElement>('binary-variant-row');
const binaryVariantSelect = $<HTMLSelectElement>('binary-variant-select');
const rleRow = $<HTMLDivElement>('rle-row');
const rleCheckbox = $<HTMLInputElement>('rle-checkbox');

const convertBtn = $<HTMLButtonElement>('convert-btn');
const downloadBtn = $<HTMLButtonElement>('download-btn');
const copyBtn = $<HTMLButtonElement>('copy-btn');
const statusMsg = $<HTMLParagraphElement>('status-msg');

const previewBefore = $<HTMLCanvasElement>('preview-before');
const previewAfter = $<HTMLCanvasElement>('preview-after');
const outputText = $<HTMLTextAreaElement>('output-text');

function currentFormat(): ColorFormatDef | undefined {
  return findFormat(state.version, state.formatId);
}

function setStatus(msg: string, kind: 'ok' | 'error' | '' = ''): void {
  statusMsg.textContent = msg;
  statusMsg.className = `status ${kind}`;
}

function populateFormatOptions(): void {
  const formats = getFormats(state.version);
  const previousId = state.formatId;
  formatSelect.innerHTML = formats.map((f) => `<option value="${f.id}">${f.label}</option>`).join('');
  const stillValid = formats.some((f) => f.id === previousId);
  state.formatId = stillValid ? previousId : formats[0].id;
  formatSelect.value = state.formatId;
  updateFormatDependentUI();
}

function updateFormatDependentUI(): void {
  const format = currentFormat();
  if (!format) return;

  const isTrueColorDepthChoice = format.category === 'trueColor' && ['true_color', 'true_color_alpha', 'true_color_chroma'].includes(format.id) && state.version !== 'v9';
  colorDepthRow.style.display = isTrueColorDepthChoice ? 'flex' : 'none';

  rawPassthroughNote.style.display = format.isRawPassthrough ? 'block' : 'none';
  ditheringCheckbox.disabled = !!format.isRawPassthrough;

  const transparencyCapable = format.supportsAlpha || format.supportsChroma;
  transparencyModeSelect.disabled = !transparencyCapable || !!format.isRawPassthrough;
  transparencyDisabledNote.style.display = transparencyCapable ? 'none' : 'block';
  if (!transparencyCapable) {
    transparencyControls.style.display = 'none';
  }

  // Chroma-key mode only makes sense when the format actually supports it (vs. plain alpha).
  const chromaOption = transparencyModeSelect.querySelector<HTMLOptionElement>('option[value="chromaKey"]')!;
  chromaOption.disabled = !format.supportsChroma;
  const alphaOptions = ['existingAlpha', 'colorPick'];
  alphaOptions.forEach((v) => {
    const opt = transparencyModeSelect.querySelector<HTMLOptionElement>(`option[value="${v}"]`)!;
    opt.disabled = !format.supportsAlpha;
  });
  const modeStillValid =
    state.transparencyMode === 'none' ||
    (state.transparencyMode === 'chromaKey' && format.supportsChroma) ||
    (['existingAlpha', 'colorPick'].includes(state.transparencyMode) && format.supportsAlpha);
  if (!modeStillValid) {
    state.transparencyMode = 'none';
    transparencyModeSelect.value = 'none';
    updateTransparencyControlsVisibility();
  }

  rleRow.style.display = state.version === 'v9' && !!format.supportsRle && state.outputMode !== 'binaryRaw' ? 'flex' : 'none';

  // bin9 output only valid for v9 non-raw formats.
  const bin9Option = outputModeSelect.querySelector<HTMLOptionElement>('option[value="bin9"]')!;
  bin9Option.disabled = state.version !== 'v9' || !!format.isRawPassthrough;
  if (bin9Option.disabled && state.outputMode === 'bin9') {
    state.outputMode = 'carray';
    outputModeSelect.value = 'carray';
  }

  binaryVariantRow.style.display = state.outputMode === 'binaryRaw' ? 'block' : 'none';
}

function refreshPreviewBefore(): void {
  if (!state.decodedImage) return;
  paintOnCheckerboard(state.decodedImage, previewBefore);
}

async function handleFile(file: File): Promise<void> {
  state.file = file;
  const isSvg = file.name.toLowerCase().endsWith('.svg') || file.type === 'image/svg+xml';
  svgSizeRow.style.display = isSvg ? 'flex' : 'none';

  if (isSvg) {
    const intrinsic = await readSvgIntrinsicSize(file);
    if (intrinsic) {
      state.svgWidth = Math.round(intrinsic.width);
      state.svgHeight = Math.round(intrinsic.height);
      svgWidthInput.value = String(state.svgWidth);
      svgHeightInput.value = String(state.svgHeight);
    }
  }

  try {
    const decoded = await decodeImageFile(file, isSvg ? { width: state.svgWidth, height: state.svgHeight } : undefined);
    state.decodedImage = decoded;
    fileInfo.textContent = `${file.name} — ${decoded.width}×${decoded.height}px`;
    const base = toCIdentifier(file.name.replace(/\.[^/.]+$/, ''));
    state.varName = base;
    state.fileNameBase = base;
    varNameInput.value = base;
    fileNameInput.value = base;

    // Auto-sample the corner as a starting guess for a color-pick/chroma-key background color.
    state.pickedColor = autoSampleCornerColor(decoded);
    chromaColorInput.value = '#' + state.pickedColor.map((c) => c.toString(16).padStart(2, '0')).join('');

    refreshPreviewBefore();
    convertBtn.disabled = false;
    setStatus('Image loaded. Adjust options and click Convert.', 'ok');
  } catch (err) {
    setStatus(`Failed to load image: ${(err as Error).message}`, 'error');
  }
}

async function reRasterizeSvg(): Promise<void> {
  if (!state.file) return;
  const isSvg = state.file.name.toLowerCase().endsWith('.svg');
  if (!isSvg) return;
  const decoded = await decodeImageFile(state.file, { width: state.svgWidth, height: state.svgHeight });
  state.decodedImage = decoded;
  fileInfo.textContent = `${state.file.name} — ${decoded.width}×${decoded.height}px`;
  refreshPreviewBefore();
}

function runConvert(): void {
  if (!state.decodedImage || !state.file) {
    setStatus('Load an image first.', 'error');
    return;
  }
  const format = currentFormat();
  if (!format) return;

  try {
    if (state.outputMode === 'binaryRaw') {
      const bytes = encodeBinaryRaw(state.decodedImage, state.binaryVariant);
      state.result = {
        fileName: `${toCIdentifier(state.fileNameBase)}_${state.binaryVariant}.bin`,
        kind: 'binary',
        bytes,
        previewRgba: state.decodedImage,
      };
    } else if (format.isRawPassthrough) {
      encodeRawPassthrough(state.file).then((packed) => {
        const text = generateCArrayFile({
          version: state.version,
          format,
          variableName: state.varName,
          width: state.decodedImage!.width,
          height: state.decodedImage!.height,
          pixelData: packed.data,
          stride: 0,
          isRawPassthrough: true,
          rle: false,
        });
        state.result = { fileName: `${toCIdentifier(state.varName)}.c`, kind: 'text', text, previewRgba: state.decodedImage! };
        renderResult();
      });
      return;
    } else {
      const transparent = applyTransparency(state.decodedImage, {
        mode: state.transparencyMode,
        pickedColor: state.pickedColor,
        tolerance: state.tolerance,
        feather: state.feather,
      }, format);
      const packOpts = { colorDepth: state.colorDepth, dithering: state.dithering };
      const packed = packPixels(transparent, format, packOpts);
      const preview = buildPreviewRgba(transparent, format, packOpts);

      if (state.outputMode === 'bin9') {
        const combined = combinePixelBytes(packed.palette, packed.data);
        const finalBytes = maybeRle(combined, state.rle && !!format.supportsRle);
        const bytes = encodeV9Bin(format, state.decodedImage.width, state.decodedImage.height, packed.stride, finalBytes);
        state.result = { fileName: `${toCIdentifier(state.varName)}.bin`, kind: 'binary', bytes, previewRgba: preview };
      } else {
        const text = generateCArrayFile({
          version: state.version,
          format,
          variableName: state.varName,
          width: state.decodedImage.width,
          height: state.decodedImage.height,
          pixelData: packed.data,
          paletteData: packed.palette,
          stride: packed.stride,
          isRawPassthrough: false,
          rle: state.rle,
        });
        state.result = { fileName: `${toCIdentifier(state.varName)}.c`, kind: 'text', text, previewRgba: preview };
      }
    }
    renderResult();
  } catch (err) {
    setStatus(`Conversion failed: ${(err as Error).message}`, 'error');
  }
}

function renderResult(): void {
  if (!state.result) return;
  paintOnCheckerboard(state.result.previewRgba, previewAfter);
  if (state.result.kind === 'text') {
    outputText.value = state.result.text ?? '';
    copyBtn.disabled = false;
  } else {
    outputText.value = `(binary output — ${state.result.bytes?.length ?? 0} bytes — use Download)`;
    copyBtn.disabled = true;
  }
  downloadBtn.disabled = false;
  setStatus(`Converted successfully → ${state.result.fileName}`, 'ok');
}

// ---- Event wiring ----

versionSelect.value = state.version;
versionSelect.addEventListener('change', () => {
  state.version = versionSelect.value as LvglVersion;
  localStorage.setItem(VERSION_STORAGE_KEY, state.version);
  populateFormatOptions();
});

tabConvertBtn.addEventListener('click', () => {
  tabConvertBtn.classList.add('active');
  tabDocsBtn.classList.remove('active');
  panelConvert.classList.add('active');
  panelDocs.classList.remove('active');
});
tabDocsBtn.addEventListener('click', () => {
  tabDocsBtn.classList.add('active');
  tabConvertBtn.classList.remove('active');
  panelDocs.classList.add('active');
  panelConvert.classList.remove('active');
});

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer?.files?.[0];
  if (file) void handleFile(file);
});
fileInput.addEventListener('change', () => {
  const file = fileInput.files?.[0];
  if (file) void handleFile(file);
});

svgWidthInput.addEventListener('change', () => {
  state.svgWidth = Math.max(1, parseInt(svgWidthInput.value, 10) || 1);
  void reRasterizeSvg();
});
svgHeightInput.addEventListener('change', () => {
  state.svgHeight = Math.max(1, parseInt(svgHeightInput.value, 10) || 1);
  void reRasterizeSvg();
});

formatSelect.addEventListener('change', () => {
  state.formatId = formatSelect.value;
  updateFormatDependentUI();
});

colorDepthRow.addEventListener('change', (e) => {
  const target = e.target as HTMLInputElement;
  if (target.name === 'color-depth') state.colorDepth = target.value === '32' ? 32 : 16;
});

ditheringCheckbox.addEventListener('change', () => {
  state.dithering = ditheringCheckbox.checked;
});

transparencyModeSelect.addEventListener('change', () => {
  state.transparencyMode = transparencyModeSelect.value as TransparencyMode;
  updateTransparencyControlsVisibility();
});

const toleranceRow = $<HTMLDivElement>('tolerance-row');
const featherRow = $<HTMLDivElement>('feather-row');
const colorPickRow = $<HTMLDivElement>('color-pick-row');

function updateTransparencyControlsVisibility(): void {
  transparencyControls.style.display = state.transparencyMode === 'none' ? 'none' : 'block';
  const needsColor = state.transparencyMode === 'colorPick' || state.transparencyMode === 'chromaKey';
  colorPickRow.style.display = needsColor ? 'flex' : 'none';
  toleranceRow.style.display = needsColor ? 'block' : 'none';
  featherRow.style.display = state.transparencyMode === 'colorPick' || state.transparencyMode === 'existingAlpha' ? 'block' : 'none';
}

chromaColorInput.addEventListener('input', () => {
  const hex = chromaColorInput.value.replace('#', '');
  state.pickedColor = [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
});

pickFromImageBtn.addEventListener('click', () => {
  state.pickingFromImage = true;
  setStatus('Click a pixel on the source preview to pick its color…');
});

previewBefore.addEventListener('click', (e) => {
  if (!state.pickingFromImage || !state.decodedImage) return;
  const rect = previewBefore.getBoundingClientRect();
  const scaleX = state.decodedImage.width / rect.width;
  const scaleY = state.decodedImage.height / rect.height;
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);
  const color = samplePixelColor(state.decodedImage, x, y);
  state.pickedColor = color;
  chromaColorInput.value = '#' + color.map((c) => c.toString(16).padStart(2, '0')).join('');
  state.pickingFromImage = false;
  setStatus('Color picked.', 'ok');
});

toleranceSlider.addEventListener('input', () => {
  state.tolerance = parseInt(toleranceSlider.value, 10);
  toleranceValue.textContent = String(state.tolerance);
});
featherSlider.addEventListener('input', () => {
  state.feather = parseInt(featherSlider.value, 10);
  featherValue.textContent = String(state.feather);
});

varNameInput.addEventListener('input', () => {
  state.varName = varNameInput.value;
});
fileNameInput.addEventListener('input', () => {
  state.fileNameBase = fileNameInput.value;
});

outputModeSelect.addEventListener('change', () => {
  state.outputMode = outputModeSelect.value as OutputMode;
  updateFormatDependentUI();
});
binaryVariantSelect.addEventListener('change', () => {
  state.binaryVariant = binaryVariantSelect.value as BinaryRawVariant;
});
rleCheckbox.addEventListener('change', () => {
  state.rle = rleCheckbox.checked;
});

convertBtn.addEventListener('click', runConvert);

downloadBtn.addEventListener('click', () => {
  if (!state.result) return;
  if (state.result.kind === 'text') downloadText(state.result.fileName, state.result.text ?? '');
  else downloadBytes(state.result.fileName, state.result.bytes ?? new Uint8Array());
});

copyBtn.addEventListener('click', async () => {
  if (!state.result?.text) return;
  await navigator.clipboard.writeText(state.result.text);
  setStatus('Copied to clipboard.', 'ok');
});

// ---- Init ----
populateFormatOptions();
updateTransparencyControlsVisibility();
