/* ============================================================
   SS RP Generator — app.js
   Logic: Upload, Parse, Render Canvas, Download PNG
   ============================================================ */

(function () {
  'use strict';

  // ---- DOM References ----
  const dropzone          = document.getElementById('dropzone');
  const fileInput         = document.getElementById('fileInput');
  const browseBtn         = document.getElementById('browseBtn');
  const changeBtn         = document.getElementById('changeBtn');
  const dropzoneBody      = document.getElementById('dropzoneBody');
  const dropzonePreviewWrap = document.getElementById('dropzonePreviewWrap');
  const dropzonePreview   = document.getElementById('dropzonePreview');
  const chatlogTextarea   = document.getElementById('chatlogTextarea');
  const canvas            = document.getElementById('previewCanvas');
  const ctx               = canvas.getContext('2d');
  const canvasEmpty       = document.getElementById('canvasEmpty');
  const downloadBtn       = document.getElementById('downloadBtn');
  const downloadBtnMobile = document.getElementById('downloadBtnMobile');
  const fontSizeSlider    = document.getElementById('fontSizeSlider');
  const fontSizeValue     = document.getElementById('fontSizeValue');
  const paddingXSlider    = document.getElementById('paddingXSlider');
  const paddingXValue     = document.getElementById('paddingXValue');
  const paddingYSlider    = document.getElementById('paddingYSlider');
  const paddingYValue     = document.getElementById('paddingYValue');
  const previewBadge      = document.getElementById('previewBadge');
  const toast             = document.getElementById('toast');

  // ---- State ----
  let uploadedImage = null;
  let settings = { fontSize: 16, paddingX: 10, paddingY: 10 };

  // ============================================================
  // IMAGE UPLOAD HANDLER
  // ============================================================

  function handleFile(file) {
    if (!file) return;
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
        // Show image preview inside dropzone
        dropzonePreview.src = e.target.result;
        dropzoneBody.hidden = true;
        dropzonePreviewWrap.hidden = false;
        renderCanvas();
        updateButtons();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Click dropzone body → open file picker
  dropzone.addEventListener('click', function (e) {
    // Only trigger if clicking on the dropzone body (not the change button)
    if (!dropzonePreviewWrap.hidden) return;
    fileInput.click();
  });

  browseBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
      // Reset input so same file can be re-selected
      e.target.value = '';
    }
  });

  // Change image button
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
    if (files && files[0]) handleFile(files[0]);
  });

  // Block default browser drag-drop outside dropzone
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  // ============================================================
  // CHATLOG PARSER
  // ============================================================

  function parseChatlog(rawText) {
    if (!rawText || !rawText.trim()) return [];
    const lines = rawText.split('\n');
    const parsed = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].replace(/\s+$/, '');
      // Remove timestamp [HH:MM:SS]
      let cleanedText = line.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '');
      if (!cleanedText.trim()) continue;

      parsed.push({
        text: cleanedText,
        isAction: cleanedText.trim().startsWith('*'),
      });
    }
    return parsed;
  }

  // ============================================================
  // CANVAS RENDERING ENGINE
  // ============================================================

  function renderCanvas() {
    if (!uploadedImage) {
      canvas.style.display = 'none';
      canvasEmpty.hidden = false;
      setBadge(false);
      return;
    }

    // Show canvas
    canvas.style.display = 'block';
    canvasEmpty.hidden = true;
    setBadge(true);

    // Full resolution
    canvas.width  = uploadedImage.naturalWidth;
    canvas.height = uploadedImage.naturalHeight;

    // Draw background
    ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

    // Parse chatlog
    const parsedLines = parseChatlog(chatlogTextarea.value);
    if (parsedLines.length === 0) return;

    const fontSize   = settings.fontSize;
    const lineHeight = Math.round(fontSize * 1.3);
    const startX     = settings.paddingX;
    const startY     = settings.paddingY;

    ctx.font        = 'bold ' + fontSize + 'px Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.lineWidth    = 1.5;
    ctx.strokeStyle  = '#000000';
    ctx.lineJoin     = 'round';
    ctx.miterLimit   = 2;

    parsedLines.forEach(function (line, index) {
      const yPos = startY + (index * lineHeight);
      if (yPos + fontSize > canvas.height) return;

      ctx.fillStyle = line.isAction ? '#C2A2DA' : '#FFFFFF';
      ctx.strokeText(line.text, startX, yPos);
      ctx.fillText(line.text, startX, yPos);
    });
  }

  chatlogTextarea.addEventListener('input', renderCanvas);

  // ============================================================
  // SETTINGS
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
  // DOWNLOAD HANDLER
  // ============================================================

  function downloadImage() {
    if (!uploadedImage) {
      showToast('Upload gambar terlebih dahulu!');
      return;
    }

    renderCanvas();

    canvas.toBlob(function (blob) {
      if (!blob) { showToast('Gagal membuat gambar. Coba lagi.'); return; }

      const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = 'ss_rp_' + ts + '.png';
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('Berhasil diunduh!');
    }, 'image/png');
  }

  downloadBtn.addEventListener('click', downloadImage);
  downloadBtnMobile.addEventListener('click', downloadImage);

  // ============================================================
  // HELPERS
  // ============================================================

  function updateButtons() {
    const has = !!uploadedImage;
    downloadBtn.disabled = !has;
    downloadBtnMobile.disabled = !has;
  }

  function setBadge(ready) {
    if (ready) {
      previewBadge.textContent = 'Siap diunduh';
      previewBadge.classList.add('ready');
    } else {
      previewBadge.textContent = 'Menunggu gambar...';
      previewBadge.classList.remove('ready');
    }
  }

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2500);
  }

  // ============================================================
  // INIT
  // ============================================================

  (function init() {
    fontSizeValue.textContent  = fontSizeSlider.value + 'px';
    paddingXValue.textContent  = paddingXSlider.value + 'px';
    paddingYValue.textContent  = paddingYSlider.value + 'px';
    canvas.style.display = 'none';
    updateButtons();
  })();

})();
