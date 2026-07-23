/* ============================================================
   SAMP RP Screenshot Generator — app.js
   Logic: Upload, Parse, Render Canvas, Download PNG
   ============================================================ */

(function () {
  'use strict';

  // ---- DOM References ----
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const changeBtn = document.getElementById('changeBtn');
  const dropzonePreview = document.getElementById('dropzonePreview');
  const chatlogTextarea = document.getElementById('chatlogTextarea');
  const canvas = document.getElementById('previewCanvas');
  const ctx = canvas.getContext('2d');
  const canvasContainer = document.getElementById('canvasContainer');
  const canvasPlaceholder = document.getElementById('canvasPlaceholder');
  const downloadBtnDesktop = document.getElementById('downloadBtnDesktop');
  const downloadBtnMobile = document.getElementById('downloadBtnMobile');
  const fontSizeSlider = document.getElementById('fontSizeSlider');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const paddingXSlider = document.getElementById('paddingXSlider');
  const paddingXValue = document.getElementById('paddingXValue');
  const paddingYSlider = document.getElementById('paddingYSlider');
  const paddingYValue = document.getElementById('paddingYValue');
  const toast = document.getElementById('toast');

  // ---- State ----
  let uploadedImage = null; // Image object
  let settings = {
    fontSize: 16,
    paddingX: 10,
    paddingY: 10,
  };

  // ============================================================
  // IMAGE UPLOAD HANDLER (FR-01)
  // ============================================================

  function handleFile(file) {
    if (!file) return;

    // Validate format
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Format tidak didukung. Gunakan PNG, JPG, atau WebP.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        uploadedImage = img;

        // Show preview in dropzone
        dropzonePreview.src = e.target.result;
        dropzone.classList.add('has-image');

        renderCanvas();
        updateDownloadButtonState();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Click to upload
  dropzone.addEventListener('click', function () {
    fileInput.click();
  });

  fileInput.addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  });

  // Change button
  changeBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    fileInput.click();
  });

  // Drag and drop
  dropzone.addEventListener('dragover', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', function (e) {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  });

  // Prevent default drag behavior on window
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  // ============================================================
  // CHATLOG PARSER (FR-02, FR-03, FR-04)
  // ============================================================

  function parseChatlog(rawText) {
    if (!rawText || !rawText.trim()) return [];

    const lines = rawText.split('\n');
    const parsed = [];

    for (let i = 0; i < lines.length; i++) {
      // Trim trailing whitespace
      let line = lines[i].replace(/\s+$/, '');

      // Remove timestamp pattern [HH:MM:SS]
      let cleanedText = line.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');

      // Skip empty lines
      if (!cleanedText.trim()) continue;

      // Detect action lines (starts with *)
      let isAction = cleanedText.trim().startsWith('*');

      parsed.push({
        text: cleanedText,
        isAction: isAction,
      });
    }

    return parsed;
  }

  // ============================================================
  // CANVAS RENDERING ENGINE (FR-05, FR-06, FR-07)
  // ============================================================

  function renderCanvas() {
    if (!uploadedImage) {
      canvas.style.display = 'none';
      canvasPlaceholder.style.display = 'flex';
      return;
    }

    // Show canvas, hide placeholder
    canvas.style.display = 'block';
    canvasPlaceholder.style.display = 'none';

    // Set canvas to full image resolution
    canvas.width = uploadedImage.naturalWidth;
    canvas.height = uploadedImage.naturalHeight;

    // Draw background image
    ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

    // Parse chatlog
    const chatlogText = chatlogTextarea.value;
    const parsedLines = parseChatlog(chatlogText);

    if (parsedLines.length === 0) return;

    // Text rendering settings
    const fontSize = settings.fontSize;
    const lineHeight = Math.round(fontSize * 1.3);
    const startX = settings.paddingX;
    const startY = settings.paddingY;

    ctx.font = 'bold ' + fontSize + 'px Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#000000';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    parsedLines.forEach(function (line, index) {
      const yPos = startY + (index * lineHeight);

      // Don't render beyond canvas height
      if (yPos + fontSize > canvas.height) return;

      // Set color based on action or normal
      ctx.fillStyle = line.isAction ? '#C2A2DA' : '#FFFFFF';

      // Draw stroke first (outline), then fill
      ctx.strokeText(line.text, startX, yPos);
      ctx.fillText(line.text, startX, yPos);
    });
  }

  // Live preview: re-render on textarea input
  chatlogTextarea.addEventListener('input', function () {
    renderCanvas();
  });

  // ============================================================
  // SETTINGS CONTROLS (FR-06)
  // ============================================================

  fontSizeSlider.addEventListener('input', function () {
    settings.fontSize = parseInt(this.value, 10);
    fontSizeValue.textContent = this.value + 'px';
    renderCanvas();
  });

  paddingXSlider.addEventListener('input', function () {
    settings.paddingX = parseInt(this.value, 10);
    paddingXValue.textContent = this.value + 'px';
    renderCanvas();
  });

  paddingYSlider.addEventListener('input', function () {
    settings.paddingY = parseInt(this.value, 10);
    paddingYValue.textContent = this.value + 'px';
    renderCanvas();
  });

  // ============================================================
  // DOWNLOAD HANDLER (FR-08)
  // ============================================================

  function downloadImage() {
    if (!uploadedImage) {
      showToast('Unggah gambar terlebih dahulu!');
      return;
    }

    // Re-render to ensure latest state
    renderCanvas();

    canvas.toBlob(function (blob) {
      if (!blob) {
        showToast('Gagal membuat gambar. Coba lagi.');
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = 'ss_rp_' + timestamp + '.png';

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Screenshot berhasil diunduh! 🎉');
    }, 'image/png');
  }

  downloadBtnDesktop.addEventListener('click', downloadImage);
  downloadBtnMobile.addEventListener('click', downloadImage);

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================

  function updateDownloadButtonState() {
    const hasImage = !!uploadedImage;
    downloadBtnDesktop.disabled = !hasImage;
    downloadBtnMobile.disabled = !hasImage;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () {
      toast.classList.remove('show');
    }, 2500);
  }

  // ============================================================
  // INITIALIZATION
  // ============================================================

  function init() {
    // Set initial slider values display
    fontSizeValue.textContent = fontSizeSlider.value + 'px';
    paddingXValue.textContent = paddingXSlider.value + 'px';
    paddingYValue.textContent = paddingYSlider.value + 'px';

    // Disable download buttons initially
    updateDownloadButtonState();

    // Set canvas to hidden initially
    canvas.style.display = 'none';
  }

  init();

})();
