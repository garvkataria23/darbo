/* ==========================================================================
   DARBO — CUSTOM DESIGN STUDIO ENGINE
   Fabric.js Canvas + Upload + Drag/Resize/Rotate + Multi-Variants + Shipping + Cart
   Project: darbo-e0752
   ========================================================================== */

// ============================================================
// STATE
// ============================================================
let canvas = null;
let uploadedDesign = null;
let uploadedText = null;
let uploadedFileBlob = null;
let uploadedFileName = '';
let nextVariantId = 1;

let state = {
  garmentType: 'tshirt',
  garmentColor: '#1A1A1A',
  size: 'L',
  designScale: 1,
  designAngle: 0,
  textContent: '',
  textColor: '#FFFFFF',
  textFont: 'Outfit',
  textWeight: '800',
  price: 799,
  qty: 1,
  variantMode: false,
  variants: [],       // Array of { id, text, size, color, qty }
};

// ============================================================
// CONSTANTS
// ============================================================
const CANVAS_SIZE = 500;

const GARMENT_COLORS = {
  tshirt: [
    { hex: '#1A1A1A', label: 'Black', light: false },
    { hex: '#FFFFFF', label: 'White', light: true },
    { hex: '#F5F0EB', label: 'Cream', light: true },
    { hex: '#FFF0F3', label: 'Blush Pink', light: true },
    { hex: '#B0C4DE', label: 'Steel Blue', light: false },
    { hex: '#556B2F', label: 'Olive', light: false },
  ],
  hoodie: [
    { hex: '#1A1A1A', label: 'Black', light: false },
    { hex: '#FFFFFF', label: 'White', light: true },
    { hex: '#F5F0EB', label: 'Cream', light: true },
    { hex: '#2E5A44', label: 'Forest', light: false },
    { hex: '#556B2F', label: 'Olive', light: false },
  ],
};

const GARMENT_PRICES = {
  tshirt: 799,
  hoodie: 1299,
};

const BULK_DISCOUNTS = [
  { minQty: 10, discount: 10 },   // 10% off for 10+
  { minQty: 25, discount: 15 },   // 15% off for 25+
  { minQty: 50, discount: 20 },   // 20% off for 50+
  { minQty: 100, discount: 25 },  // 25% off for 100+
];

const SIZES = ['S', 'M', 'L', 'XL', 'XXL'];

const TEXT_FONTS = [
  { name: 'Outfit', family: 'Outfit, sans-serif', weight: '800' },
  { name: 'Jakarta', family: 'Plus Jakarta Sans, sans-serif', weight: '700' },
  { name: 'Impact', family: 'Impact, sans-serif', weight: '400' },
  { name: 'Georgia', family: 'Georgia, serif', weight: '700' },
];

const TEXT_COLORS = [
  '#FFFFFF', '#000000', '#F07167', '#FFD700',
  '#22C55E', '#3B82F6', '#A855F7', '#F97316',
];

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// ============================================================
// INITIALIZATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Remove loading overlay once canvas initializes
  const loadingOverlay = document.getElementById('canvasLoadingOverlay');
  if (loadingOverlay) {
    loadingOverlay.style.opacity = '0';
    loadingOverlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => loadingOverlay.remove(), 300);
  }

  initFabricCanvas();
  renderColorSwatches();
  renderSizeButtons();
  renderTextOptions();
  bindGarmentTypeButtons();
  bindUploadZone();
  bindSliders();
  bindTextControls();
  updatePrice();
  lucide.createIcons();
});

function initFabricCanvas() {
  if (typeof fabric === 'undefined') {
    console.error('Fabric.js failed to load from CDN');
    const wrapper = document.querySelector('.canvas-wrapper');
    if (wrapper) {
      wrapper.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:2rem;text-align:center;"><div style="font-size:2rem;margin-bottom:1rem;">⚠️</div><div style="font-weight:700;font-size:1rem;color:var(--text-dark);">Design tools failed to load</div><div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem;">Please check your internet connection and refresh the page.</div></div>';
    }
    return;
  }

  canvas = new fabric.Canvas('designCanvas', {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: '#FFFFFF',
    selection: true,
    preserveObjectStacking: true,
  });

  drawGarmentBase();

  canvas.on('selection:created', updateToolbarState);
  canvas.on('selection:updated', updateToolbarState);
  canvas.on('selection:cleared', updateToolbarState);
  canvas.on('object:modified', updateSlidersFromCanvas);

  updateToolbarState();
}

// ============================================================
// GARMENT BASE DRAWING — Uses mockup images with color tinting
// Falls back to path outline if images fail to load
// ============================================================
const GARMENT_IMAGES = {
  tshirt: 'images/custom_tee_mockup.jpg',
  hoodie: 'images/create_reality_hoodie.jpg',
};

function drawGarmentBase() {
  // Remove all non-user objects (shirt paths, print area, background images)
  canvas.getObjects().forEach(obj => {
    if (obj !== uploadedDesign && obj !== uploadedText) {
      canvas.remove(obj);
    }
  });
  canvas.backgroundImage = null;

  const imgSrc = GARMENT_IMAGES[state.garmentType];
  if (imgSrc) {
    fabric.Image.fromURL(imgSrc, (img) => {
      if (!img) { drawGarmentFallback(); return; }

      // Scale image to fill the canvas
      const scaleX = CANVAS_SIZE / img.width;
      const scaleY = CANVAS_SIZE / img.height;
      const scale = Math.max(scaleX, scaleY);

      // Apply color tint to match selected garment color
      const isLight = isLightColor(state.garmentColor);
      img.filters = [
        new fabric.Image.filters.BlendColor({
          color: state.garmentColor,
          mode: 'multiply',
          alpha: isLight ? 0.35 : 0.65,
        }),
      ];
      img.applyFilters();

      img.set({
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
        left: CANVAS_SIZE / 2,
        top: CANVAS_SIZE / 2,
      });

      canvas.backgroundImage = img;
      canvas.renderAll();

      // Draw print area boundary on top
      drawPrintArea();
    }, imgSrc, { crossOrigin: 'anonymous' });
  } else {
    drawGarmentFallback();
  }
}

function drawGarmentFallback() {
  // Fallback: path-based outline
  const pathColor = isLightColor(state.garmentColor)
    ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

  let shirtPath;
  if (state.garmentType === 'tshirt') {
    shirtPath = new fabric.Path(
      'M 155,55 L 120,60 L 90,80 L 80,110 L 110,120 L 115,100 L 115,420 L 385,420 L 385,100 L 390,120 L 420,110 L 410,80 L 380,60 L 345,55 L 310,75 Q 275,30 250,30 Q 225,30 190,75 Z',
      { fill: 'transparent', stroke: pathColor, strokeWidth: 1.5, selectable: false, evented: false }
    );
  } else {
    shirtPath = new fabric.Path(
      'M 150,50 L 115,55 L 80,78 L 65,115 L 100,125 L 105,100 L 105,420 L 395,420 L 395,100 L 400,125 L 435,115 L 420,78 L 385,55 L 350,50 L 320,70 Q 285,20 250,20 Q 215,20 180,70 Z',
      { fill: 'transparent', stroke: pathColor, strokeWidth: 1.5, selectable: false, evented: false }
    );
  }

  canvas.add(shirtPath);
  canvas.sendObjectToBack(shirtPath);
  drawPrintArea();
}

function drawPrintArea() {
  const pathColor = isLightColor(state.garmentColor)
    ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

  const printArea = new fabric.Rect({
    left: 155, top: 110, width: 190, height: 220,
    fill: 'transparent', stroke: pathColor, strokeWidth: 1, strokeDashArray: [6, 4],
    selectable: false, evented: false,
  });
  canvas.add(printArea);
  canvas.sendObjectToBack(printArea);
}

function isLightColor(hex) {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 186;
}

// ============================================================
// GARMENT TYPE & COLOR
// ============================================================
function bindGarmentTypeButtons() {
  document.querySelectorAll('.garment-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.garmentType = btn.dataset.type;
      state.price = GARMENT_PRICES[state.garmentType];
      document.querySelectorAll('.garment-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderColorSwatches();
      drawGarmentBase();
      updatePrice();
    });
  });
}

function renderColorSwatches() {
  const container = document.getElementById('colorSwatches');
  if (!container) return;
  const colors = GARMENT_COLORS[state.garmentType];
  container.innerHTML = colors.map(c => `
    <button class="color-swatch-btn ${c.light ? 'light-swatch' : ''} ${c.hex === state.garmentColor ? 'active' : ''}"
            data-color="${c.hex}" title="${c.label}" style="background:${c.hex};"
            onclick="selectGarmentColor('${c.hex}')"></button>
  `).join('');
}

function selectGarmentColor(hex) {
  state.garmentColor = hex;
  // When using mockup images, the background is white and color is applied via tinting
  canvas.backgroundColor = '#FFFFFF';
  canvas.renderAll();
  drawGarmentBase();
  document.querySelectorAll('.color-swatch-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.color === hex);
  });
}

function renderSizeButtons() {
  const container = document.getElementById('sizeGrid');
  if (!container) return;
  container.innerHTML = SIZES.map(s => `
    <button class="size-btn ${s === state.size ? 'active' : ''}"
            onclick="selectSize('${s}')">${s}</button>
  `).join('');
}

function selectSize(size) {
  state.size = size;
  document.querySelectorAll('.size-btn').forEach(btn => {
    btn.classList.toggle('active', btn.textContent === size);
  });
}

// ============================================================
// FILE UPLOAD
// ============================================================
function bindUploadZone() {
  const zone = document.getElementById('uploadZone');
  if (!zone) return;

  // Bind change listener on the current file input
  const input = document.getElementById('fileInput');
  if (input) {
    input.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
  }

  zone.addEventListener('click', (e) => {
    if (e.target.closest('.uploaded-remove')) return;
    // Always find the CURRENT file input (not from closure)
    const currentInput = document.getElementById('fileInput');
    if (currentInput) currentInput.click();
  });

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => { zone.classList.remove('dragover'); });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  });
}

async function handleFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    showDesignToast('Invalid file type. Upload PNG, JPG, JPEG, or PDF.', 'error');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    showDesignToast('File too large. Max 10MB allowed.', 'error');
    return;
  }

  showDesignToast('Processing your design...', 'info');

  try {
    let imageBlob;
    if (file.type === 'application/pdf') {
      imageBlob = await convertPDFToImage(file);
      uploadedFileName = file.name.replace(/\.pdf$/i, '.png');
    } else {
      imageBlob = file;
      uploadedFileName = file.name;
    }

    uploadedFileBlob = imageBlob;

    const imgUrl = URL.createObjectURL(imageBlob);
    fabric.Image.fromURL(imgUrl, (img) => {
      if (uploadedDesign) canvas.remove(uploadedDesign);

      const maxW = 180, maxH = 200;
      let scale = Math.min(maxW / img.width, maxH / img.height, 1);

      img.set({
        left: CANVAS_SIZE / 2, top: CANVAS_SIZE / 2 + 20,
        scaleX: scale, scaleY: scale,
        originX: 'center', originY: 'center',
        selectable: true, hasControls: true, hasBorders: true,
        cornerColor: '#F07167', cornerStrokeColor: '#F07167',
        cornerSize: 10, borderColor: '#F07167', transparentCorners: false,
      });

      uploadedDesign = img;
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.renderAll();

      state.designScale = scale;
      state.designAngle = 0;

      updateUploadPreview(file);
      updateSlidersFromCanvas();
      updateEmptyState(false);
      markStepCompleted(2);
      showDesignToast('Design added! Drag to position, use sliders to resize.', 'success');
    });
  } catch (err) {
    console.error('File handling error:', err);
    showDesignToast('Failed to process file. Please try again.', 'error');
  }
}

async function convertPDFToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = viewport.width;
        tempCanvas.height = viewport.height;
        const ctx = tempCanvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        tempCanvas.toBlob((blob) => resolve(blob), 'image/png');
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

function updateUploadPreview(file) {
  const zone = document.getElementById('uploadZone');
  if (!zone) return;
  const thumbUrl = uploadedFileBlob ? URL.createObjectURL(uploadedFileBlob) : '';
  zone.innerHTML = `
    <input type="file" id="fileInput" accept=".png,.jpg,.jpeg,.webp,.pdf" style="display:none;" />
    <div class="uploaded-preview">
      <img src="${thumbUrl}" class="uploaded-thumb" alt="Design preview" />
      <div class="uploaded-info">
        <div class="uploaded-name">${file.name}</div>
        <div class="uploaded-size">${formatFileSize(file.size)}</div>
      </div>
      <button class="uploaded-remove" onclick="removeUploadedDesign(event)" title="Remove design">
        <i data-lucide="x" style="width:16px;height:16px;"></i>
      </button>
    </div>
  `;
  // Re-bind click on the zone to use the NEW file input (old one is detached)
  zone.onclick = (e) => {
    if (e.target.closest('.uploaded-remove')) return;
    const newInput = document.getElementById('fileInput');
    if (newInput) newInput.click();
  };
  // Re-bind drag events on the zone
  zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('dragover'); };
  zone.ondragleave = () => { zone.classList.remove('dragover'); };
  zone.ondrop = (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  };
  const newInput = document.getElementById('fileInput');
  if (newInput) {
    newInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) handleFile(e.target.files[0]);
    });
  }
  lucide.createIcons();
}

function removeUploadedDesign(e) {
  e.stopPropagation();
  if (uploadedDesign) { canvas.remove(uploadedDesign); uploadedDesign = null; canvas.renderAll(); }
  uploadedFileBlob = null;
  uploadedFileName = '';
  state.designScale = 1;
  state.designAngle = 0;

  const zone = document.getElementById('uploadZone');
  if (zone) {
    zone.innerHTML = `
      <input type="file" id="fileInput" accept=".png,.jpg,.jpeg,.webp,.pdf" style="display:none;" />
      <div class="upload-icon"><i data-lucide="cloud-upload"></i></div>
      <div class="upload-title">Drop your design here</div>
      <div class="upload-sub">or click to browse files</div>
      <div class="upload-btn"><i data-lucide="plus" style="width:14px;height:14px;"></i> Choose File</div>
      <div class="upload-formats">PNG, JPG, JPEG, PDF &bull; Max 10MB</div>
    `;
    bindUploadZone();
    lucide.createIcons();
  }
  updateEmptyState(true);
  resetSliders();
  showDesignToast('Design removed', 'info');
}

// ============================================================
// TEXT OVERLAY
// ============================================================
function renderTextOptions() {
  const fontContainer = document.getElementById('textFontOptions');
  const colorContainer = document.getElementById('textColorOptions');

  if (fontContainer) {
    fontContainer.innerHTML = TEXT_FONTS.map(f => `
      <button class="text-font-btn ${f.name === state.textFont ? 'active' : ''}"
              data-font="${f.name}" style="font-family:${f.family};"
              onclick="selectTextFont(this, '${f.name}', '${f.family}', '${f.weight}')">${f.name}</button>
    `).join('');
  }

  if (colorContainer) {
    colorContainer.innerHTML = TEXT_COLORS.map(c => `
      <button class="text-color-btn ${c === state.textColor ? 'active' : ''}"
              data-color="${c}" style="background:${c};"
              onclick="selectTextColor('${c}')"></button>
    `).join('');
  }
}

function bindTextControls() {
  const input = document.getElementById('textInput');
  const addBtn = document.getElementById('textAddBtn');
  if (input) input.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTextToCanvas(); });
  if (addBtn) addBtn.addEventListener('click', addTextToCanvas);
}

function addTextToCanvas() {
  const input = document.getElementById('textInput');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  if (uploadedText) canvas.remove(uploadedText);

  uploadedText = new fabric.Text(text.toUpperCase(), {
    left: CANVAS_SIZE / 2, top: CANVAS_SIZE / 2 + 20,
    fontFamily: TEXT_FONTS.find(f => f.name === state.textFont)?.family || 'Outfit, sans-serif',
    fontSize: 32, fontWeight: state.textWeight, fill: state.textColor,
    originX: 'center', originY: 'center',
    selectable: true, hasControls: true, hasBorders: true,
    cornerColor: '#F07167', cornerStrokeColor: '#F07167',
    cornerSize: 10, borderColor: '#F07167', transparentCorners: false,
    textAlign: 'center',
  });

  canvas.add(uploadedText);
  canvas.setActiveObject(uploadedText);
  canvas.renderAll();
  state.textContent = text;

  updateEmptyState(false);
  markStepCompleted(3);
  showDesignToast('Text added! Drag to position.', 'success');
}

function selectTextFont(btn, name, family, weight) {
  state.textFont = name;
  state.textWeight = weight;
  document.querySelectorAll('.text-font-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (uploadedText) { uploadedText.set({ fontFamily: family, fontWeight: weight }); canvas.renderAll(); }
}

function selectTextColor(color) {
  state.textColor = color;
  document.querySelectorAll('.text-color-btn').forEach(b => b.classList.toggle('active', b.dataset.color === color));
  if (uploadedText) { uploadedText.set({ fill: color }); canvas.renderAll(); }
}

// ============================================================
// SLIDERS
// ============================================================
function bindSliders() {
  const scaleSlider = document.getElementById('scaleSlider');
  const angleSlider = document.getElementById('angleSlider');

  if (scaleSlider) {
    scaleSlider.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      state.designScale = val;
      const active = canvas.getActiveObject();
      if (active) { active.set({ scaleX: val, scaleY: val }); canvas.renderAll(); }
      document.getElementById('scaleValue').textContent = Math.round(val * 100) + '%';
    });
  }

  if (angleSlider) {
    angleSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      state.designAngle = val;
      const active = canvas.getActiveObject();
      if (active) { active.set({ angle: val }); canvas.renderAll(); }
      document.getElementById('angleValue').textContent = val + '\u00B0';
    });
  }
}

function updateSlidersFromCanvas() {
  const active = canvas.getActiveObject();
  if (!active) return;
  const scaleSlider = document.getElementById('scaleSlider');
  const angleSlider = document.getElementById('angleSlider');
  if (scaleSlider) { scaleSlider.value = active.scaleX; state.designScale = active.scaleX; document.getElementById('scaleValue').textContent = Math.round(active.scaleX * 100) + '%'; }
  if (angleSlider) { angleSlider.value = Math.round(active.angle); state.designAngle = Math.round(active.angle); document.getElementById('angleValue').textContent = Math.round(active.angle) + '\u00B0'; }
}

function resetSliders() {
  const s = document.getElementById('scaleSlider');
  const a = document.getElementById('angleSlider');
  if (s) { s.value = 1; document.getElementById('scaleValue').textContent = '100%'; }
  if (a) { a.value = 0; document.getElementById('angleValue').textContent = '0\u00B0'; }
}

// ============================================================
// TOOLBAR
// ============================================================
function updateToolbarState() {
  const active = canvas.getActiveObject();
  document.getElementById('toolbarDelete')?.classList.toggle('disabled', !active);
  document.getElementById('toolbarFront')?.classList.toggle('disabled', !active);
  document.getElementById('toolbarBack')?.classList.toggle('disabled', !active);
}

function toolbarDelete() {
  const active = canvas.getActiveObject();
  if (!active) return;
  canvas.remove(active);
  canvas.discardActiveObject();
  canvas.renderAll();
  if (active === uploadedDesign) uploadedDesign = null;
  if (active === uploadedText) uploadedText = null;
  if (!uploadedDesign && !uploadedText) updateEmptyState(true);
  updateToolbarState();
  showDesignToast('Object deleted', 'info');
}

function toolbarBringFront() { const a = canvas.getActiveObject(); if (a) { canvas.bringObjectToFront(a); canvas.renderAll(); } }
function toolbarSendBack() { const a = canvas.getActiveObject(); if (a) { canvas.sendObjectToBack(a); canvas.renderAll(); } }

function toolbarResetCanvas() {
  if (uploadedDesign) { canvas.remove(uploadedDesign); uploadedDesign = null; }
  if (uploadedText) { canvas.remove(uploadedText); uploadedText = null; }
  uploadedFileBlob = null;
  uploadedFileName = '';
  drawGarmentBase();
  resetSliders();
  updateEmptyState(true);
  showDesignToast('Canvas reset', 'info');
}

function toolbarDownload() {
  canvas.discardActiveObject();
  canvas.renderAll();
  const dataURL = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
  const link = document.createElement('a');
  link.download = `darbo-custom-design-${Date.now()}.png`;
  link.href = dataURL;
  link.click();
  showDesignToast('Design downloaded!', 'success');
}

// ============================================================
// EMPTY STATE & STEP MARKERS
// ============================================================
function updateEmptyState(empty) {
  document.getElementById('canvasEmptyState')?.classList.toggle('hidden', !empty);
}

function markStepCompleted(stepNum) {
  const el = document.getElementById(`step${stepNum}Num`);
  if (el) el.classList.add('completed');
}

// ============================================================
// QUANTITY
// ============================================================
function changeQty(delta) {
  state.qty = Math.max(1, Math.min(500, state.qty + delta));
  document.getElementById('qtyDisplay').textContent = state.qty;
  updatePrice();
}

// ============================================================
// VARIANT MODE
// ============================================================
function toggleVariantMode() {
  state.variantMode = !state.variantMode;

  const toggleContainer = document.getElementById('variantModeToggle');
  const toggle = document.getElementById('variantToggle');
  const builder = document.getElementById('variantBuilder');
  const singleQty = document.getElementById('singleQtySection');

  if (toggleContainer) toggleContainer.classList.toggle('active', state.variantMode);
  if (toggle) toggle.classList.toggle('on', state.variantMode);
  if (builder) builder.classList.toggle('visible', state.variantMode);
  if (singleQty) singleQty.style.display = state.variantMode ? 'none' : 'block';

  if (state.variantMode && state.variants.length === 0) {
    // Auto-create first variant from current settings
    state.variants.push({
      id: nextVariantId++,
      text: state.textContent || '',
      size: state.size,
      color: state.garmentColor,
      qty: 1,
    });
    renderVariants();
  }

  updatePrice();
}

function addVariant() {
  state.variants.push({
    id: nextVariantId++,
    text: '',
    size: state.size,
    color: state.garmentColor,
    qty: 1,
  });
  renderVariants();
}

function removeVariant(id) {
  state.variants = state.variants.filter(v => v.id !== id);
  if (state.variants.length === 0) {
    toggleVariantMode();
  } else {
    renderVariants();
  }
  updatePrice();
}

function updateVariantField(id, field, value) {
  const variant = state.variants.find(v => v.id === id);
  if (variant) {
    variant[field] = value;
    renderVariantSummary();
    updatePrice();
  }
}

function renderVariants() {
  const container = document.getElementById('variantList');
  if (!container) return;

  const currentColors = GARMENT_COLORS[state.garmentType];

  container.innerHTML = state.variants.map((v, i) => `
    <div class="variant-card">
      <div class="variant-card-header">
        <div class="variant-card-number">
          <span style="width:20px;height:20px;background:var(--coral-primary);color:#fff;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:800;">${i + 1}</span>
          Variant ${i + 1}
        </div>
        <button class="variant-card-remove" onclick="removeVariant(${v.id})" title="Remove variant">
          <i data-lucide="x" style="width:14px;height:14px;"></i>
        </button>
      </div>
      <div class="variant-card-fields">
        <div class="variant-field full-width">
          <label>Text on Shirt</label>
          <input type="text" value="${escapeHtml(v.text)}" placeholder="e.g. ARJUN, TEAM LEAD, BATCH 2024..."
                 oninput="updateVariantField(${v.id}, 'text', this.value)" maxlength="30" />
        </div>
        <div class="variant-field">
          <label>Size</label>
          <div class="size-mini-grid">
            ${SIZES.map(s => `
              <button class="size-mini-btn ${s === v.size ? 'active' : ''}"
                      onclick="updateVariantField(${v.id}, 'size', '${s}'); renderVariants();">${s}</button>
            `).join('')}
          </div>
        </div>
        <div class="variant-field">
          <label>Color</label>
          <div class="color-mini-grid">
            ${currentColors.map(c => `
              <button class="color-mini-btn ${c.hex === v.color ? 'active' : ''}"
                      style="background:${c.hex};" title="${c.label}"
                      onclick="updateVariantField(${v.id}, 'color', '${c.hex}'); renderVariants();"></button>
            `).join('')}
          </div>
        </div>
        <div class="variant-field">
          <label>Qty</label>
          <div class="qty-selector" style="width:100%;">
            <button class="qty-btn" onclick="changeVariantQty(${v.id}, -1)" style="width:32px;height:32px;font-size:0.9rem;">-</button>
            <div class="qty-display" style="width:40px;height:32px;font-size:0.85rem;">${v.qty}</div>
            <button class="qty-btn" onclick="changeVariantQty(${v.id}, 1)" style="width:32px;height:32px;font-size:0.9rem;">+</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  renderVariantSummary();
  lucide.createIcons();
}

function changeVariantQty(id, delta) {
  const variant = state.variants.find(v => v.id === id);
  if (variant) {
    variant.qty = Math.max(1, Math.min(200, variant.qty + delta));
    renderVariants();
    updatePrice();
  }
}

function renderVariantSummary() {
  const el = document.getElementById('variantSummary');
  const textEl = document.getElementById('variantSummaryText');
  if (!el || !textEl) return;

  if (state.variants.length === 0) {
    el.style.display = 'none';
    return;
  }

  const totalPieces = state.variants.reduce((sum, v) => sum + v.qty, 0);
  el.style.display = 'flex';
  textEl.textContent = `${state.variants.length} variant${state.variants.length > 1 ? 's' : ''} \u2022 ${totalPieces} total pieces`;
}

// ============================================================
// PRICING WITH BULK DISCOUNTS
// ============================================================
function getBulkDiscount(qty) {
  let discount = 0;
  for (const tier of BULK_DISCOUNTS) {
    if (qty >= tier.minQty) discount = tier.discount;
  }
  return discount;
}

function updatePrice() {
  const totalQty = state.variantMode
    ? state.variants.reduce((sum, v) => sum + v.qty, 0)
    : state.qty;

  const discountPct = getBulkDiscount(totalQty);
  const pricePerPiece = state.price;
  const discountAmount = Math.round((pricePerPiece * totalQty * discountPct) / 100);
  const totalAmount = (pricePerPiece * totalQty) - discountAmount;

  const garmentLabel = document.getElementById('garmentTypeLabel');
  const priceEl = document.getElementById('designPrice');
  const originalEl = document.getElementById('designOriginalPrice');

  if (garmentLabel) garmentLabel.textContent = state.garmentType === 'tshirt' ? 'Custom T-Shirt' : 'Custom Hoodie';
  if (priceEl) priceEl.textContent = `\u20B9${totalAmount.toLocaleString('en-IN')}`;
  if (originalEl) originalEl.textContent = `\u20B9${(pricePerPiece * totalQty).toLocaleString('en-IN')}`;

  // Price breakdown
  const breakdownBase = document.getElementById('breakdownBase');
  const breakdownQtyRow = document.getElementById('breakdownQtyRow');
  const breakdownQty = document.getElementById('breakdownQty');
  const breakdownDiscountRow = document.getElementById('breakdownDiscountRow');
  const breakdownDiscount = document.getElementById('breakdownDiscount');
  const breakdownTotal = document.getElementById('breakdownTotal');

  if (breakdownBase) breakdownBase.textContent = `\u20B9${pricePerPiece} x ${totalQty} piece${totalQty > 1 ? 's' : ''}`;
  if (breakdownQtyRow) breakdownQtyRow.style.display = 'none';
  if (breakdownDiscountRow) {
    if (discountPct > 0) {
      breakdownDiscountRow.style.display = 'flex';
      if (breakdownDiscount) breakdownDiscount.textContent = `-\u20B9${discountAmount.toLocaleString('en-IN')} (${discountPct}% off)`;
    } else {
      breakdownDiscountRow.style.display = 'none';
    }
  }
  if (breakdownTotal) breakdownTotal.textContent = `\u20B9${totalAmount.toLocaleString('en-IN')}`;

  // Bulk discount badge
  const badgeContainer = document.getElementById('bulkBadgeContainer');
  if (badgeContainer) {
    if (discountPct > 0) {
      badgeContainer.innerHTML = `<div class="bulk-discount-badge">🎉 Bulk discount: ${discountPct}% OFF on ${totalQty}+ pieces!</div>`;
    } else if (totalQty >= 5) {
      const nextTier = BULK_DISCOUNTS.find(t => t.minQty > totalQty);
      if (nextTier) {
        badgeContainer.innerHTML = `<div class="bulk-discount-badge">💡 Add ${nextTier.minQty - totalQty} more for ${nextTier.discount}% bulk discount!</div>`;
      } else {
        badgeContainer.innerHTML = '';
      }
    } else {
      badgeContainer.innerHTML = totalQty >= 3 ? `<div class="bulk-discount-badge">💡 Order 10+ for 10% bulk discount!</div>` : '';
    }
  }

  // Single mode hint
  const qtyHint = document.getElementById('qtyHint');
  if (qtyHint && !state.variantMode) {
    qtyHint.textContent = `${totalQty} piece${totalQty > 1 ? 's' : ''} \u2022 \u20B9${pricePerPiece} per piece`;
  }

  // Update cart button
  const btn = document.getElementById('addToCartBtn');
  if (btn) {
    btn.innerHTML = `<i data-lucide="shopping-bag" style="width:18px;height:18px;"></i> Add to Cart — \u20B9${totalAmount.toLocaleString('en-IN')}`;
    lucide.createIcons();
  }
}

// ============================================================
// SHIPPING FORM VALIDATION
// ============================================================
function validateShippingForm() {
  let valid = true;

  const fields = [
    { id: 'shipName', validate: v => v.trim().length >= 2 },
    { id: 'shipPhone', validate: v => /^[6-9]\d{9}$/.test(v.trim()) },
    { id: 'shipEmail', validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) },
    { id: 'shipAddress', validate: v => v.trim().length >= 10 },
    { id: 'shipCity', validate: v => v.trim().length >= 2 },
    { id: 'shipPincode', validate: v => /^\d{6}$/.test(v.trim()) },
  ];

  fields.forEach(f => {
    const input = document.getElementById(f.id);
    const field = input?.closest('.shipping-field');
    if (!input || !field) return;

    if (!f.validate(input.value)) {
      field.classList.add('has-error');
      valid = false;
    } else {
      field.classList.remove('has-error');
    }
  });

  // State
  const stateSelect = document.getElementById('shipState');
  const stateField = stateSelect?.closest('.shipping-field');
  if (stateSelect && stateField) {
    if (!stateSelect.value) {
      stateField.classList.add('has-error');
      valid = false;
    } else {
      stateField.classList.remove('has-error');
    }
  }

  return valid;
}

function getShippingData() {
  return {
    name: document.getElementById('shipName')?.value.trim() || '',
    phone: document.getElementById('shipPhone')?.value.trim() || '',
    email: document.getElementById('shipEmail')?.value.trim() || '',
    address: document.getElementById('shipAddress')?.value.trim() || '',
    city: document.getElementById('shipCity')?.value.trim() || '',
    pincode: document.getElementById('shipPincode')?.value.trim() || '',
    state: document.getElementById('shipState')?.value || '',
    notes: document.getElementById('shipNotes')?.value.trim() || '',
  };
}

// ============================================================
// CART — ADD TO CART
// ============================================================
async function addCustomDesignToCart() {
  // Validate shipping form first
  if (!validateShippingForm()) {
    showDesignToast('Please fill all required shipping fields.', 'error');
    document.getElementById('shipName')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const btn = document.getElementById('addToCartBtn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-spinner"></span> Adding to Cart...';
  }

  try {
    // Export canvas as thumbnail
    canvas.discardActiveObject();
    canvas.renderAll();
    const canvasImage = canvas.toDataURL({ format: 'png', quality: 0.8, multiplier: 1 });

    const totalQty = state.variantMode
      ? state.variants.reduce((sum, v) => sum + v.qty, 0)
      : state.qty;

    const discountPct = getBulkDiscount(totalQty);
    const discountAmount = Math.round((state.price * totalQty * discountPct) / 100);
    const totalAmount = (state.price * totalQty) - discountAmount;
    const shipping = getShippingData();

    // Upload design image to Firebase Storage (if logged in and file exists)
    let designCloudUrl = null;
    if (window.darboCurrentUser && window.darboFirestore && uploadedFileBlob) {
      try {
        showDesignToast('Uploading design to cloud...', 'info');
        designCloudUrl = await window.darboFirestore.uploadDesignImage(
          window.darboCurrentUser.uid,
          uploadedFileBlob,
          uploadedFileName || 'design.png'
        );
      } catch (e) {
        console.warn('Firebase Storage upload failed (non-blocking):', e);
      }
    }

    // Build the cart item
    const cartItem = {
      id: 'custom_' + Date.now(),
      title: state.garmentType === 'tshirt' ? 'Custom Printed T-Shirt' : 'Custom Printed Hoodie',
      type: 'custom',
      garment: state.garmentType,
      garmentColor: state.garmentColor,
      size: state.size,
      pricePerPiece: state.price,
      price: state.price,
      qty: totalQty,
      image: canvasImage,
      designCloudUrl: designCloudUrl,
      designFileName: uploadedFileName || null,
      designPosition: uploadedDesign ? {
        left: uploadedDesign.left, top: uploadedDesign.top,
        scaleX: uploadedDesign.scaleX, scaleY: uploadedDesign.scaleY,
        angle: uploadedDesign.angle,
      } : null,
      textOverlay: uploadedText ? uploadedText.text : null,
      textStyle: uploadedText ? {
        fontFamily: uploadedText.fontFamily, fontSize: uploadedText.fontSize,
        fill: uploadedText.fill, fontWeight: uploadedText.fontWeight,
      } : null,
      variantMode: state.variantMode,
      variants: state.variantMode ? state.variants.map(v => ({
        text: v.text, size: v.size, color: v.color, qty: v.qty,
      })) : [],
      discount: discountPct,
      discountAmount: discountAmount,
      totalAmount: totalAmount,
      shipping: shipping,
      orderNotes: shipping.notes,
      currency: 'INR',
    };

    // Save to localStorage
    let cart = [];
    try { cart = JSON.parse(localStorage.getItem('darbo_cart') || '[]'); } catch (e) { cart = []; }
    cart.push(cartItem);
    localStorage.setItem('darbo_cart', JSON.stringify(cart));

    // Sync to Firestore
    if (window.darboCurrentUser && window.darboFirestore) {
      try {
        await window.darboFirestore.saveCart(window.darboCurrentUser.uid, cart);
      } catch (e) { console.warn('Firestore cart sync failed:', e); }

      try {
        await window.darboFirestore.saveCustomDesign(window.darboCurrentUser.uid, {
          garmentType: state.garmentType,
          garmentColor: state.garmentColor,
          size: state.size,
          textOverlay: uploadedText ? uploadedText.text : null,
          pricePerPiece: state.price,
          totalQty: totalQty,
          totalAmount: totalAmount,
          discount: discountPct,
          variantMode: state.variantMode,
          variants: cartItem.variants,
          shipping: shipping,
          designFileName: uploadedFileName || null,
          designCloudUrl: designCloudUrl,
        });
      } catch (e) { console.warn('Firestore design save failed:', e); }
    }

    showSuccessOverlay(totalQty, totalAmount);

  } catch (err) {
    console.error('Add to cart error:', err);
    showDesignToast('Failed to add to cart. Please try again.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      // Restore button text with current price
      const totalQty = state.variantMode
        ? state.variants.reduce((sum, v) => sum + v.qty, 0)
        : state.qty;
      const discountPct = getBulkDiscount(totalQty);
      const totalAmount = (state.price * totalQty) - Math.round((state.price * totalQty * discountPct) / 100);
      btn.innerHTML = `<i data-lucide="shopping-bag" style="width:18px;height:18px;"></i> Add to Cart — \u20B9${totalAmount.toLocaleString('en-IN')}`;
      lucide.createIcons();
    }
  }
}

function showSuccessOverlay(totalQty, totalAmount) {
  const overlay = document.createElement('div');
  overlay.className = 'design-success-overlay';
  overlay.innerHTML = `
    <div class="design-success-card">
      <div class="design-success-icon">&#x2705;</div>
      <div class="design-success-title">Design Added to Cart!</div>
      <div class="design-success-sub">
        ${totalQty} custom ${state.garmentType === 'tshirt' ? 'T-Shirt' : 'Hoodie'}${totalQty > 1 ? 's' : ''}
        added &bull; Total: \u20B9${totalAmount.toLocaleString('en-IN')}
      </div>
      <div class="design-success-actions">
        <a href="index.html" class="btn-continue-design">Continue Shopping</a>
        <a href="checkout.html" class="btn-go-cart">Go to Checkout</a>
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ============================================================
// WHATSAPP
// ============================================================
function sendWhatsAppDesign() {
  const totalQty = state.variantMode
    ? state.variants.reduce((sum, v) => sum + v.qty, 0)
    : state.qty;

  const garmentName = state.garmentType === 'tshirt' ? 'T-Shirt' : 'Hoodie';
  let msg = `Hi DARBO! I want to order ${totalQty}x Custom ${garmentName}.\n\n`;

  if (state.variantMode && state.variants.length > 0) {
    msg += '--- VARIANTS ---\n';
    state.variants.forEach((v, i) => {
      const colorName = GARMENT_COLORS[state.garmentType].find(c => c.hex === v.color)?.label || v.color;
      msg += `${i + 1}. "${v.text || 'No text'}" | Size: ${v.size} | Color: ${colorName} | Qty: ${v.qty}\n`;
    });
  } else {
    const colorName = GARMENT_COLORS[state.garmentType].find(c => c.hex === state.garmentColor)?.label || state.garmentColor;
    msg += `Size: ${state.size} | Color: ${colorName} | Qty: ${totalQty}\n`;
    if (state.textContent) msg += `Text: "${state.textContent}"\n`;
  }

  const discountPct = getBulkDiscount(totalQty);
  const discountAmount = Math.round((state.price * totalQty * discountPct) / 100);
  const totalAmount = (state.price * totalQty) - discountAmount;

  msg += `\n--- PRICING ---\n`;
  msg += `Base: \u20B9${state.price} x ${totalQty} = \u20B9${(state.price * totalQty).toLocaleString('en-IN')}\n`;
  if (discountPct > 0) msg += `Bulk Discount (${discountPct}%): -\u20B9${discountAmount.toLocaleString('en-IN')}\n`;
  msg += `Total: \u20B9${totalAmount.toLocaleString('en-IN')}\n`;

  // Include shipping info if filled
  const ship = getShippingData();
  if (ship.name || ship.phone || ship.address) {
    msg += `\n--- SHIPPING ---\n`;
    if (ship.name) msg += `Name: ${ship.name}\n`;
    if (ship.phone) msg += `Phone: ${ship.phone}\n`;
    if (ship.email) msg += `Email: ${ship.email}\n`;
    if (ship.address) msg += `Address: ${ship.address}\n`;
    if (ship.city || ship.pincode || ship.state) msg += `${ship.city}, ${ship.state} - ${ship.pincode}\n`;
    if (ship.notes) msg += `Notes: ${ship.notes}\n`;
  }

  msg += `\nPlease share the design details!`;

  window.open(`https://wa.me/918355983699?text=${encodeURIComponent(msg)}`, '_blank');
}

// ============================================================
// UTILITIES
// ============================================================
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showDesignToast(message, type = 'info') {
  let container = document.getElementById('designToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'designToastContainer';
    container.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;gap:0.5rem;align-items:center;';
    document.body.appendChild(container);
  }

  const colors = { success: '#22C55E', error: '#EF4444', info: '#3B82F6' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    background: ${colors[type] || colors.info}; color: #fff;
    padding: 0.75rem 1.5rem; border-radius: 9999px;
    font-size: 0.82rem; font-weight: 700;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    animation: slideUpToast 0.4s ease; white-space: nowrap;
  `;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
