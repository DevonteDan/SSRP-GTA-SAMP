/* ============================================================
   SS RP Generator — app.js
   Two-screen flow: Landing → Editor
   ============================================================ */

(function () {
  'use strict';

  // ---- Screens ----
  const screenLanding = document.getElementById('screenLanding');
  const screenEditor  = document.getElementById('screenEditor');
  const mobileBar     = document.getElementById('mobileBar');

  // ---- Landing elements ----
  const fileInputLanding = document.getElementById('fileInputLanding');
  const landingPickBtn   = document.getElementById('landingPickBtn');
  const landingDropArea  = document.getElementById('landingDropArea');

  // ---- Editor elements ----
  const fileInputEditor = document.getElementById('fileInputEditor');
  const changeImgBtn    = document.getElementById('changeImgBtn');
  const editorThumb     = document.getElementById('editorThumb');
  const backBtn         = document.getElementById('backBtn');
  const chatlogTextarea = document.getElementById('chatlogTextarea');
  const canvas          = document.getElementById('previewCanvas');
  const ctx             = canvas.getContext('2d');
  const downloadBtn     = document.getElementById('downloadBtn');
  const downloadBtnMob  = document.getElementById('downloadBtnMobile');
  const fontSizeSlider  = document.getElementById('fontSizeSlider');
  const fontSizeValue   = document.getElementById('fontSizeValue');
  const paddingXSlider  = document.getElementById('paddingXSlider');
  const paddingXValue   = document.getElementById('paddingXValue');
  const paddingYSlider  = document.getElementById('paddingYSlider');
  const paddingYValue   = document.getElementById('paddingYValue');
  const previewBadge    = document.getElementById('previewBadge');
  const toast           = document.getElementById('toast');

  // ---- State ----
  let uploadedImage = null;
  let settings = { fontSize: 16, paddingX: 10, paddingY: 10 };

  // ============================================================
  // SCREEN TRANSITION
  // ============================================================

  function goToEditor() {
    screenLanding.classList.add('hidden');
    screenEditor.classList.remove('hidden');
    // Show mobile bar on mobile
    if (window.innerWidth <= 900) mobileBar.style.display = 'flex';
  }

  function goToLanding() {
    screenEditor.classList.add('hidden');
    screenLanding.classList.remove('hidden');
    mobileBar.style.display = 'none';
    // Reset state
    uploadedImage = null;
    chatlogTextarea.value = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  backBtn.addEventListener('click', goToLanding);

  // ============================================================
  // FILE HANDLING
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
        editorThumb.src = e.target.result;
        goToEditor();
        renderCanvas();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // --- Landing screen upload ---
  landingPickBtn.addEventListener('click', function () {
    fileInputLanding.click();
  });

  fileInputLanding.addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
      e.target.value = '';
    }
  });

  // Landing drag-and-drop
  landingDropArea.addEventListener('dragover', function (e) {
    e.preventDefault();
    landingDropArea.classList.add('dragover');
  });

  landingDropArea.addEventListener('dragleave', function (e) {
    e.preventDefault();
    landingDropArea.classList.remove('dragover');
  });

  landingDropArea.addEventListener('drop', function (e) {
    e.preventDefault();
    landingDropArea.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  // Also allow dropping anywhere on landing screen
  screenLanding.addEventListener('dragover', function (e) { e.preventDefault(); });
  screenLanding.addEventListener('drop', function (e) {
    e.preventDefault();
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  // --- Editor: change image ---
  changeImgBtn.addEventListener('click', function () {
    fileInputEditor.click();
  });

  fileInputEditor.addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        showToast('Format tidak didukung.');
        return;
      }
      const reader = new FileReader();
      reader.onload = function (ev) {
        const img = new Image();
        img.onload = function () {
          uploadedImage = img;
          editorThumb.src = ev.target.result;
          renderCanvas();
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  });

  // Prevent accidental drop on window
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  // ============================================================
  // CHATLOG PARSER
  // ============================================================

  function parseChatlog(rawText) {
    if (!rawText || !rawText.trim()) return [];
    return rawText.split('\n')
      .map(function (line) { return line.replace(/\s+$/, ''); })
      .map(function (line) { return line.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, ''); })
      .filter(function (line) { return line.trim().length > 0; })
      .map(function (text) {
        return { text: text, isAction: text.trim().startsWith('*') };
      });
  }

  // ============================================================
  // CANVAS RENDERING
  // ============================================================

  function renderCanvas() {
    if (!uploadedImage) return;

    canvas.width  = uploadedImage.naturalWidth;
    canvas.height = uploadedImage.naturalHeight;

    ctx.drawImage(uploadedImage, 0, 0, canvas.width, canvas.height);

    const parsedLines = parseChatlog(chatlogTextarea.value);
    if (parsedLines.length === 0) return;

    const fontSize   = settings.fontSize;
    const lineHeight = Math.round(fontSize * 1.3);
    const startX     = settings.paddingX;
    const startY     = settings.paddingY;

    ctx.font         = 'bold ' + fontSize + 'px Arial, sans-serif';
    ctx.textBaseline = 'top';
    ctx.lineWidth    = 1.5;
    ctx.strokeStyle  = '#000000';
    ctx.lineJoin     = 'round';
    ctx.miterLimit   = 2;

    parsedLines.forEach(function (line, i) {
      const yPos = startY + (i * lineHeight);
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
  // DOWNLOAD
  // ============================================================

  function downloadImage() {
    if (!uploadedImage) { showToast('Upload gambar dulu!'); return; }
    renderCanvas();
    canvas.toBlob(function (blob) {
      if (!blob) { showToast('Gagal membuat gambar.'); return; }
      const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href = url;
      a.download = 'ss_rp_' + ts + '.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Berhasil diunduh!');
    }, 'image/png');
  }

  downloadBtn.addEventListener('click', downloadImage);
  downloadBtnMob.addEventListener('click', downloadImage);

  // ============================================================
  // TOAST
  // ============================================================

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(function () { toast.classList.remove('show'); }, 2500);
  }

  // ============================================================
  // INIT
  // ============================================================

  fontSizeValue.textContent  = fontSizeSlider.value + 'px';
  paddingXValue.textContent  = paddingXSlider.value + 'px';
  paddingYValue.textContent  = paddingYSlider.value + 'px';

})();
