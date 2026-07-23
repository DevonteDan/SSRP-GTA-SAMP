/* ============================================================
   SS RP Generator — app.js
   Flow: Landing → Loading → Editor
   ============================================================ */

(function () {
  'use strict';

  // ---- Screens ----
  const screenLanding = document.getElementById('screenLanding');
  const screenLoading = document.getElementById('screenLoading');
  const screenEditor  = document.getElementById('screenEditor');

  // ---- Landing ----
  const fileInputLanding = document.getElementById('fileInputLanding');
  const landingPickBtn   = document.getElementById('landingPickBtn');
  const landingDropArea  = document.getElementById('landingDropArea');

  // ---- Editor ----

  const backBtn         = document.getElementById('backBtn');
  const chatlogTextarea = document.getElementById('chatlogTextarea');
  const canvas          = document.getElementById('previewCanvas');
  const ctx             = canvas.getContext('2d');
  const downloadBtn     = document.getElementById('downloadBtn');
  const downloadBtnMob  = document.getElementById('downloadBtnMobile');
  const mobileBar       = document.getElementById('mobileBar');
  const fontSizeSlider   = document.getElementById('fontSizeSlider');
  const fontSizeValue    = document.getElementById('fontSizeValue');
  const paddingXSlider   = document.getElementById('paddingXSlider');
  const paddingXValue    = document.getElementById('paddingXValue');
  const paddingYSlider   = document.getElementById('paddingYSlider');
  const paddingYValue    = document.getElementById('paddingYValue');
  const addChatlogBtn         = document.getElementById('addChatlogBtn');
  const chatlogCardsContainer = document.getElementById('chatlogCardsContainer');

  const imageScaleSlider = document.getElementById('imageScaleSlider');
  const imageScaleValue  = document.getElementById('imageScaleValue');
  const resetScaleBtn    = document.getElementById('resetScaleBtn');

  const grayscaleToggle    = document.getElementById('grayscaleToggle');
  const addBlurBtn         = document.getElementById('addBlurBtn');
  const modeDragTextBtn  = document.getElementById('modeDragTextBtn');
  const modeDragBlurBtn  = document.getElementById('modeDragBlurBtn');
  const toast            = document.getElementById('toast');

  // ---- State ----
  let uploadedImage = null;
  let settings = {
    imageScale: 100,
    grayscale: false
  };

  let chatlogBlocks = [
    {
      id: 1,
      text: '[10:20:50] * Aiden Brooks melepas radio.\n[10:21:05] Aiden Brooks says: Unit 24-King, standby.',
      fontSize: 16,
      x: 10,
      y: 10
    }
  ];
  let activeChatlogId = 1;
  let nextChatlogId = 2;

  let blurSensors = []; // array of { id, x, y, w, h, radius }
  let activeSensorId = null;
  let nextSensorId = 1;

  let activeDragMode = 'text'; // 'text' | 'blur'
  let currentDragTarget = null; // 'text' | 'blur'
  let isExporting = false;

  function getActiveChatlog() {
    return chatlogBlocks.find(function (b) { return b.id === activeChatlogId; }) || null;
  }

  function getActiveSensor() {
    return blurSensors.find(function (s) { return s.id === activeSensorId; }) || null;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function syncSlidersToActiveBlock() {
    var block = getActiveChatlog();
    if (!block) return;
    fontSizeSlider.value = block.fontSize;
    fontSizeValue.textContent = block.fontSize + 'px';
    paddingXSlider.value = block.x;
    paddingXValue.textContent = block.x + 'px';
    paddingYSlider.value = block.y;
    paddingYValue.textContent = block.y + 'px';
  }

  function renderChatlogCards() {
    chatlogCardsContainer.innerHTML = '';

    if (chatlogBlocks.length === 0) {
      chatlogCardsContainer.innerHTML = '<p class="field-hint" style="text-align: center; padding: 12px;">Belum ada chatlog. Klik "+ Tambah Chatlog" di atas.</p>';
      syncSlidersToActiveBlock();
      return;
    }

    chatlogBlocks.forEach(function (block, idx) {
      var isActive = (block.id === activeChatlogId);

      var card = document.createElement('div');
      card.className = 'chatlog-card' + (isActive ? ' active' : '');
      card.dataset.id = block.id;

      card.innerHTML =
        '<div class="chatlog-card-header">' +
          '<span class="chatlog-card-title">Chatlog #' + (idx + 1) + '</span>' +
          (chatlogBlocks.length > 1 ?
            '<button type="button" class="delete-sensor-btn delete-chatlog-item-btn" data-id="' + block.id + '" title="Hapus chatlog ini">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Hapus' +
            '</button>' : '') +
        '</div>' +
        '<textarea class="chatlog-input chatlog-card-textarea" data-id="' + block.id + '" rows="4" placeholder="[10:20:50] * Aiden Brooks melepas radio.&#10;[10:21:05] Aiden Brooks says: Standby.">' +
          escapeHtml(block.text) +
        '</textarea>';

      card.addEventListener('click', function (e) {
        if (e.target.closest('.delete-chatlog-item-btn')) return;
        if (activeChatlogId !== block.id) {
          activeChatlogId = block.id;
          setDragMode('text');
          renderChatlogCards();
          renderCanvas();
        }
      });

      var delBtn = card.querySelector('.delete-chatlog-item-btn');
      if (delBtn) {
        delBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          deleteChatlogBlock(block.id);
        });
      }

      var textarea = card.querySelector('.chatlog-card-textarea');
      textarea.addEventListener('input', function () {
        block.text = this.value;
        renderCanvas();
      });

      chatlogCardsContainer.appendChild(card);
    });

    syncSlidersToActiveBlock();
  }

  function addChatlogBlock() {
    var newX = 10;
    var newY = 10;

    if (chatlogBlocks.length > 0) {
      var lastBlock = chatlogBlocks[chatlogBlocks.length - 1];
      var lines = parseChatlog(lastBlock.text);
      var lineCount = Math.max(1, lines.length);
      var lineHeight = Math.round(lastBlock.fontSize * 1.3);

      newX = lastBlock.x;
      newY = lastBlock.y + (lineCount * lineHeight) + 16;
    }

    var newBlock = {
      id: nextChatlogId++,
      text: '',
      fontSize: 16,
      x: newX,
      y: newY
    };

    chatlogBlocks.push(newBlock);
    activeChatlogId = newBlock.id;
    setDragMode('text');
    renderChatlogCards();
    renderCanvas();

    setTimeout(function () {
      var newCardTextarea = chatlogCardsContainer.querySelector('.chatlog-card[data-id="' + newBlock.id + '"] textarea');
      if (newCardTextarea) newCardTextarea.focus();
    }, 50);

    showToast('Chatlog #' + chatlogBlocks.length + ' ditambahkan');
  }

  function deleteChatlogBlock(id) {
    var idx = chatlogBlocks.findIndex(function (b) { return b.id === id; });
    if (idx !== -1) {
      chatlogBlocks.splice(idx, 1);
      if (activeChatlogId === id) {
        if (chatlogBlocks.length > 0) {
          var nextIdx = Math.min(idx, chatlogBlocks.length - 1);
          activeChatlogId = chatlogBlocks[nextIdx].id;
        } else {
          activeChatlogId = null;
        }
      }
      renderChatlogCards();
      renderCanvas();
      showToast('Chatlog dihapus');
    }
  }

  addChatlogBtn.addEventListener('click', addChatlogBlock);

  const sensorCardsContainer = document.getElementById('sensorCardsContainer');

  function renderSensorCards() {
    sensorCardsContainer.innerHTML = '';

    if (blurSensors.length === 0) {
      sensorCardsContainer.innerHTML = '<p class="field-hint" style="text-align: center; padding: 8px;">Belum ada sensor blur. Klik "+ Tambah Sensor Blur" di atas.</p>';
      return;
    }

    blurSensors.forEach(function (sensor, idx) {
      var isActive = (sensor.id === activeSensorId);

      var card = document.createElement('div');
      card.className = 'chatlog-card' + (isActive ? ' active' : '');
      card.dataset.id = sensor.id;

      card.innerHTML =
        '<div class="chatlog-card-header">' +
          '<span class="chatlog-card-title">Sensor #' + (idx + 1) + '</span>' +
          '<button type="button" class="delete-sensor-btn delete-sensor-item-btn" data-id="' + sensor.id + '" title="Hapus sensor ini">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Hapus' +
          '</button>' +
        '</div>' +
        '<div class="settings-grid" style="gap: 10px;">' +
          '<div class="setting-item">' +
            '<div class="setting-label"><span>Intensitas Blur</span><span class="setting-val radius-val">' + sensor.radius + 'px</span></div>' +
            '<input type="range" class="radius-slider" min="2" max="30" value="' + sensor.radius + '">' +
          '</div>' +
          '<div class="setting-item">' +
            '<div class="setting-label"><span>Lebar Sensor</span><span class="setting-val width-val">' + sensor.w + 'px</span></div>' +
            '<input type="range" class="width-slider" min="40" max="800" value="' + sensor.w + '">' +
          '</div>' +
          '<div class="setting-item">' +
            '<div class="setting-label"><span>Tinggi Sensor</span><span class="setting-val height-val">' + sensor.h + 'px</span></div>' +
            '<input type="range" class="height-slider" min="30" max="600" value="' + sensor.h + '">' +
          '</div>' +
        '</div>';

      card.addEventListener('click', function (e) {
        if (e.target.closest('.delete-sensor-item-btn') || e.target.tagName === 'INPUT') return;
        if (activeSensorId !== sensor.id) {
          activeSensorId = sensor.id;
          setDragMode('blur');
          renderSensorCards();
          renderCanvas();
        }
      });

      var delBtn = card.querySelector('.delete-sensor-item-btn');
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        deleteSensorBlock(sensor.id);
      });

      var radiusInput = card.querySelector('.radius-slider');
      var radiusVal = card.querySelector('.radius-val');
      radiusInput.addEventListener('input', function () {
        sensor.radius = parseInt(this.value, 10);
        radiusVal.textContent = this.value + 'px';
        renderCanvas();
      });

      var widthInput = card.querySelector('.width-slider');
      var widthVal = card.querySelector('.width-val');
      widthInput.addEventListener('input', function () {
        sensor.w = parseInt(this.value, 10);
        widthVal.textContent = this.value + 'px';
        renderCanvas();
      });

      var heightInput = card.querySelector('.height-slider');
      var heightVal = card.querySelector('.height-val');
      heightInput.addEventListener('input', function () {
        sensor.h = parseInt(this.value, 10);
        heightVal.textContent = this.value + 'px';
        renderCanvas();
      });

      sensorCardsContainer.appendChild(card);
    });
  }

  function addSensor() {
    var imgW = uploadedImage ? uploadedImage.naturalWidth : 1000;
    var imgH = uploadedImage ? uploadedImage.naturalHeight : 600;
    var offset = (blurSensors.length * 35) % 200;

    var newSensor = {
      id: nextSensorId++,
      x: Math.round(imgW * 0.1) + offset,
      y: Math.round(imgH * 0.1) + offset,
      w: 200,
      h: 120,
      radius: 10
    };

    blurSensors.push(newSensor);
    activeSensorId = newSensor.id;
    setDragMode('blur');
    renderSensorCards();
    renderCanvas();
    showToast('Sensor #' + blurSensors.length + ' ditambahkan');
  }

  function deleteSensorBlock(id) {
    var idx = blurSensors.findIndex(function (s) { return s.id === id; });
    if (idx !== -1) {
      blurSensors.splice(idx, 1);
      if (activeSensorId === id) {
        if (blurSensors.length > 0) {
          var nextIdx = Math.min(idx, blurSensors.length - 1);
          activeSensorId = blurSensors[nextIdx].id;
        } else {
          activeSensorId = null;
          setDragMode('text');
        }
      }
      renderSensorCards();
      renderCanvas();
      showToast('Sensor dihapus');
    }
  }

  addBlurBtn.addEventListener('click', addSensor);

  // ============================================================
  // SCREEN MANAGER
  // ============================================================

  /**
   * Show one screen, hide all others.
   * @param {'landing'|'loading'|'editor'} name
   */
  function showScreen(name) {
    // Map name → element
    var screens = {
      landing: screenLanding,
      loading: screenLoading,
      editor:  screenEditor,
    };

    Object.keys(screens).forEach(function (key) {
      if (key === name) {
        screens[key].classList.remove('is-hidden');
      } else {
        screens[key].classList.add('is-hidden');
      }
    });

    // Mobile download bar: only show in editor
    if (name === 'editor' && window.innerWidth <= 900) {
      mobileBar.style.display = 'flex';
    } else {
      mobileBar.style.display = 'none';
    }
  }

  // ============================================================
  // FILE HANDLING
  // ============================================================

  function handleFile(file) {
    if (!file) return;

    var validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('Format tidak didukung. Gunakan PNG, JPG, atau WebP.');
      return;
    }

    // Show loading screen immediately
    showScreen('loading');

    var reader = new FileReader();
    reader.onload = function (e) {
      var img = new Image();
      img.onload = function () {
        uploadedImage = img;

        // Minimum loading display: 700ms so user sees the animation
        setTimeout(function () {
          showScreen('editor');
          renderChatlogCards();
          renderSensorCards();
          renderCanvas();
        }, 700);
      };
      img.onerror = function () {
        showToast('Gagal memuat gambar. Coba lagi.');
        showScreen('landing');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // ---- Landing: Pick button ----
  landingPickBtn.addEventListener('click', function () {
    fileInputLanding.click();
  });

  fileInputLanding.addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
      e.target.value = '';
    }
  });

  // ---- Landing: Drag & Drop ----
  landingDropArea.addEventListener('dragover', function (e) {
    e.preventDefault();
    landingDropArea.classList.add('dragover');
  });

  landingDropArea.addEventListener('dragleave', function () {
    landingDropArea.classList.remove('dragover');
  });

  landingDropArea.addEventListener('drop', function (e) {
    e.preventDefault();
    landingDropArea.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Also allow drop on the entire landing screen
  screenLanding.addEventListener('dragover', function (e) { e.preventDefault(); });
  screenLanding.addEventListener('drop', function (e) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Block accidental drop anywhere else
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  // ---- Editor: Back button ----
  backBtn.addEventListener('click', function () {
    showScreen('landing');
    // Reset state
    uploadedImage = null;
    chatlogBlocks = [
      {
        id: 1,
        text: '',
        fontSize: 16,
        x: 10,
        y: 10
      }
    ];
    activeChatlogId = 1;
    blurSensors = [];
    activeSensorId = null;
    renderChatlogCards();
    renderSensorCards();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = 0;
    canvas.height = 0;
    landingDropArea.classList.remove('dragover');
  });

  // ============================================================
  // CHATLOG PARSER
  // ============================================================

  function parseChatlog(rawText) {
    if (!rawText || !rawText.trim()) return [];
    return rawText
      .split('\n')
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

    // Clear & fill black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Calculate background zoom/scale destination coordinates
    var scale = (settings.imageScale || 100) / 100;
    var dw = canvas.width * scale;
    var dh = canvas.height * scale;
    var dx = (canvas.width - dw) / 2;
    var dy = (canvas.height - dh) / 2;

    // 1. Draw base background image (grayscale if enabled)
    ctx.save();
    if (settings.grayscale) {
      ctx.filter = 'grayscale(100%)';
    }
    ctx.drawImage(uploadedImage, dx, dy, dw, dh);
    ctx.restore();

    // 2. Draw All Draggable Sensor Blur regions
    blurSensors.forEach(function (sensor, idx) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(sensor.x, sensor.y, sensor.w, sensor.h);
      ctx.clip();

      var filterStr = 'blur(' + sensor.radius + 'px)';
      if (settings.grayscale) {
        filterStr = 'grayscale(100%) ' + filterStr;
      }
      ctx.filter = filterStr;
      ctx.drawImage(uploadedImage, dx, dy, dw, dh);
      ctx.restore();

      // Render dashed indicator border around sensor box in editor mode
      if (!isExporting) {
        ctx.save();
        var isActive = (sensor.id === activeSensorId);
        ctx.strokeStyle = isActive ? '#3A7BD5' : 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = isActive ? 2 : 1.5;
        ctx.setLineDash(isActive ? [6, 4] : [4, 4]);
        ctx.strokeRect(sensor.x, sensor.y, sensor.w, sensor.h);

        // Badge label on top of sensor box
        var badgeY = Math.max(0, sensor.y - 18);
        ctx.fillStyle = isActive ? '#3A7BD5' : 'rgba(30, 30, 30, 0.85)';
        ctx.fillRect(sensor.x, badgeY, 78, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('⛶ SENSOR #' + (idx + 1), sensor.x + 5, badgeY + 12);
        ctx.restore();
      }
    });

    // 3. Draw All Chatlog Blocks on top
    chatlogBlocks.forEach(function (block, blockIdx) {
      var lines = parseChatlog(block.text);
      if (lines.length === 0) {
        block.bounds = null;
        return;
      }

      var fontSize   = block.fontSize;
      var lineHeight = Math.round(fontSize * 1.3);
      var startX     = block.x;
      var startY     = block.y;

      ctx.font         = 'bold ' + fontSize + 'px Arial, sans-serif';
      ctx.textBaseline = 'top';
      ctx.lineJoin     = 'round';
      ctx.miterLimit   = 2;

      var maxLineWidth = 0;
      lines.forEach(function (line) {
        var w = ctx.measureText(line.text).width;
        if (w > maxLineWidth) maxLineWidth = w;
      });

      lines.forEach(function (line, i) {
        var yPos = startY + (i * lineHeight);
        if (yPos + fontSize > canvas.height) return;

        // Draw semi-transparent black background behind text
        var textWidth = ctx.measureText(line.text).width;
        var bgPadding = 3;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(
          startX - bgPadding,
          yPos - bgPadding,
          textWidth + bgPadding * 2,
          fontSize + bgPadding * 2
        );

        // Draw text
        ctx.fillStyle = line.isAction ? '#C2A2DA' : '#FFFFFF';
        ctx.strokeStyle  = '#000000';
        ctx.lineWidth    = 1.5;
        ctx.strokeText(line.text, startX, yPos);
        ctx.fillText(line.text, startX, yPos);
      });

      // Save block bounds for hit testing during drag & click selection
      var totalH = lines.length * lineHeight;
      block.bounds = {
        x: startX - 3,
        y: startY - 3,
        w: maxLineWidth + 6,
        h: totalH + 6
      };

      // Draw dashed outline for selected chatlog block in editor mode when multiple exist
      if (!isExporting && block.id === activeChatlogId && chatlogBlocks.length > 1) {
        ctx.save();
        ctx.strokeStyle = '#3A7BD5';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(block.bounds.x, block.bounds.y, block.bounds.w, block.bounds.h);

        var badgeY = Math.max(0, block.bounds.y - 18);
        ctx.fillStyle = '#3A7BD5';
        ctx.fillRect(block.bounds.x, badgeY, 84, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('💬 CHATLOG #' + (blockIdx + 1), block.bounds.x + 4, badgeY + 12);
        ctx.restore();
      }
    });
  }
  // ============================================================
  // DRAG & DROP POSITIONING (TEXT & SENSOR BLUR)
  // ============================================================

  var isDragging = false;
  var dragOffsetX = 0;
  var dragOffsetY = 0;

  function getCanvasCoords(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    var clientY = e.touches && e.touches.length > 0 ? e.touches[0].clientY : e.clientY;
    var scaleX = canvas.width / rect.width;
    var scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  function startDrag(e) {
    if (!uploadedImage) return;
    var coords = getCanvasCoords(e);

    // 1. Hit test Sensor Blur regions (topmost first)
    var hitSensor = blurSensors.slice().reverse().find(function (s) {
      return coords.x >= s.x && coords.x <= (s.x + s.w) &&
             coords.y >= (s.y - 18) && coords.y <= (s.y + s.h);
    });

    // 2. Hit test Chatlog Blocks (topmost first)
    var hitChatlog = chatlogBlocks.slice().reverse().find(function (b) {
      if (!b.bounds) return false;
      return coords.x >= b.bounds.x && coords.x <= (b.bounds.x + b.bounds.w) &&
             coords.y >= (b.bounds.y - 18) && coords.y <= (b.bounds.y + b.bounds.h);
    });

    if (hitSensor) {
      activeSensorId = hitSensor.id;
      renderSensorCards();
      currentDragTarget = 'blur';
      dragOffsetX = coords.x - hitSensor.x;
      dragOffsetY = coords.y - hitSensor.y;
      setDragMode('blur');
      renderCanvas();
    } else if (hitChatlog) {
      activeChatlogId = hitChatlog.id;
      renderChatlogCards();
      currentDragTarget = 'text';
      dragOffsetX = coords.x - hitChatlog.x;
      dragOffsetY = coords.y - hitChatlog.y;
      setDragMode('text');
      renderCanvas();
    } else if (activeDragMode === 'blur' && blurSensors.length > 0) {
      var sensor = getActiveSensor();
      if (sensor) {
        currentDragTarget = 'blur';
        dragOffsetX = coords.x - sensor.x;
        dragOffsetY = coords.y - sensor.y;
      }
    } else {
      var activeBlock = getActiveChatlog();
      if (activeBlock) {
        currentDragTarget = 'text';
        dragOffsetX = coords.x - activeBlock.x;
        dragOffsetY = coords.y - activeBlock.y;
        setDragMode('text');
      }
    }

    isDragging = true;
    canvas.classList.add('is-dragging');
  }

  function doDrag(e) {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();
    var coords = getCanvasCoords(e);

    if (currentDragTarget === 'blur') {
      var sensor = getActiveSensor();
      if (sensor) {
        var newBlurX = Math.max(0, Math.min(canvas.width - sensor.w, Math.round(coords.x - dragOffsetX)));
        var newBlurY = Math.max(0, Math.min(canvas.height - sensor.h, Math.round(coords.y - dragOffsetY)));
        sensor.x = newBlurX;
        sensor.y = newBlurY;
      }
    } else if (currentDragTarget === 'text') {
      var block = getActiveChatlog();
      if (block) {
        var newX = Math.max(0, Math.round(coords.x - dragOffsetX));
        var newY = Math.max(0, Math.round(coords.y - dragOffsetY));
        block.x = newX;
        block.y = newY;
        paddingXSlider.value = newX;
        paddingXValue.textContent = newX + 'px';
        paddingYSlider.value = newY;
        paddingYValue.textContent = newY + 'px';
      }
    }

    renderCanvas();
  }

  function stopDrag() {
    isDragging = false;
    currentDragTarget = null;
    canvas.classList.remove('is-dragging');
  }

  function setDragMode(mode) {
    activeDragMode = mode;
    if (mode === 'blur') {
      modeDragBlurBtn.classList.add('active');
      modeDragTextBtn.classList.remove('active');
    } else {
      modeDragTextBtn.classList.add('active');
      modeDragBlurBtn.classList.remove('active');
    }
  }

  modeDragTextBtn.addEventListener('click', function () {
    if (chatlogBlocks.length === 0) {
      addChatlogBlock();
    } else {
      setDragMode('text');
      renderChatlogCards();
      renderCanvas();
    }
  });

  modeDragBlurBtn.addEventListener('click', function () {
    if (blurSensors.length === 0) {
      addSensor();
    } else {
      setDragMode('blur');
      renderSensorCards();
      renderCanvas();
    }
  });

  canvas.addEventListener('mousedown', startDrag);
  window.addEventListener('mousemove', doDrag);
  window.addEventListener('mouseup', stopDrag);

  canvas.addEventListener('touchstart', startDrag, { passive: false });
  window.addEventListener('touchmove', doDrag, { passive: false });
  window.addEventListener('touchend', stopDrag);
  window.addEventListener('touchcancel', stopDrag);

  // ============================================================
  // SETTINGS LISTENERS
  // ============================================================

  imageScaleSlider.addEventListener('input', function () {
    settings.imageScale = parseInt(this.value, 10);
    imageScaleValue.textContent = this.value + '%';
    renderCanvas();
  });

  resetScaleBtn.addEventListener('click', function () {
    settings.imageScale = 100;
    imageScaleSlider.value = 100;
    imageScaleValue.textContent = '100%';
    renderCanvas();
    showToast('Scale gambar di-reset ke 100%');
  });

  grayscaleToggle.addEventListener('change', function () {
    settings.grayscale = this.checked;
    renderCanvas();
    showToast(this.checked ? 'Mode Hitam Putih aktif' : 'Mode Hitam Putih nonaktif');
  });



  fontSizeSlider.addEventListener('input', function () {
    var block = getActiveChatlog();
    if (block) {
      block.fontSize = parseInt(this.value, 10);
      fontSizeValue.textContent = this.value + 'px';
      renderCanvas();
    }
  });

  paddingXSlider.addEventListener('input', function () {
    var block = getActiveChatlog();
    if (block) {
      block.x = parseInt(this.value, 10);
      paddingXValue.textContent = this.value + 'px';
      renderCanvas();
    }
  });

  paddingYSlider.addEventListener('input', function () {
    var block = getActiveChatlog();
    if (block) {
      block.y = parseInt(this.value, 10);
      paddingYValue.textContent = this.value + 'px';
      renderCanvas();
    }
  });

  // ============================================================
  // DOWNLOAD
  // ============================================================

  function downloadImage() {
    if (!uploadedImage) { showToast('Upload gambar dulu!'); return; }
    isExporting = true;
    renderCanvas();
    canvas.toBlob(function (blob) {
      isExporting = false;
      renderCanvas();
      if (!blob) { showToast('Gagal membuat gambar.'); return; }
      var ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      var url = URL.createObjectURL(blob);
      var a   = document.createElement('a');
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

  imageScaleValue.textContent = imageScaleSlider.value + '%';
  renderChatlogCards();
  renderSensorCards();

  // Start on landing screen
  showScreen('landing');

})();
