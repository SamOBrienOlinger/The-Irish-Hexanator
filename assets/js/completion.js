/* Personalised version of the generated emerald reveal; no baked-in sample curse. */
(() => {
  'use strict';
  const card = document.getElementById('curse-reveal');
  if (!card) return;
  const preview = document.getElementById('hex-preview');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frameSource = 'assets/images/hex-reveal-frame.webp';
  let timer;
  let revealed = false;
  let framePromise;

  const particles = card.querySelector('.hex-reveal-particles');
  for (let i = 0; i < 14; i += 1) {
    const spark = document.createElement('i');
    spark.style.setProperty('--x', `${8 + (i * 29) % 84}%`);
    spark.style.setProperty('--y', `${42 + (i * 17) % 46}%`);
    spark.style.setProperty('--delay', `${200 + (i * 73) % 800}ms`);
    spark.style.setProperty('--drift', `${(i % 2 ? 1 : -1) * (12 + i * 2)}px`);
    particles.appendChild(spark);
  }
  function settle() {
    clearTimeout(timer);
    card.classList.remove('is-revealing');
    if (revealed) card.dataset.animation = 'complete';
  }
  function updatePreview(phrases) {
    Array.from(preview.children).forEach((line, i) => { line.textContent = phrases[i] || ''; });
  }
  function reveal(phrases) {
    // The main generator calls this only after Step 4 accepts a complete phrase.
    if (revealed || phrases.length !== 4 || phrases.some(p => !p.trim())) return;
    revealed = true;
    updatePreview(phrases);
    card.dataset.state = 'ready';
    if (!motion.matches && !document.hidden) {
      card.classList.add('is-revealing');
      card.dataset.animation = 'running';
      timer = setTimeout(settle, 3400);
    } else settle();
  }
  function markCast() {
    settle();
    card.dataset.state = 'cast';
    preview.hidden = true;
    document.getElementById('completion-heading').textContent = 'Your hex is cast!';
    document.getElementById('completion-instructions').textContent = 'Create your shareable image below and spread the mischief.';
  }
  const motionChanged = () => { if (motion.matches) settle(); };
  if (motion.addEventListener) motion.addEventListener('change', motionChanged);
  else if (motion.addListener) motion.addListener(motionChanged);
  document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
  window.addEventListener('pagehide', settle);
  document.getElementById('name').addEventListener('input', (event) => {
    if (card.dataset.state === 'ready') preview.children[0].textContent = event.target.value;
  });

  function loadFrame() {
    if (!framePromise) framePromise = new Promise(resolve => {
      const image = new Image();
      const timeout = setTimeout(() => resolve(null), 4000);
      image.onload = () => { clearTimeout(timeout); resolve(image); };
      image.onerror = () => { clearTimeout(timeout); resolve(null); };
      image.src = frameSource;
    });
    return framePromise;
  }
  function wrapText(context, text, width) {
    const lines = [];
    let line = '';
    for (const char of Array.from(text)) {
      if (context.measureText(line + char).width > width && line) {
        const space = line.lastIndexOf(' ');
        if (space > 0) { lines.push(line.slice(0, space)); line = line.slice(space + 1); }
        else { lines.push(line); line = ''; }
      }
      line += char;
    }
    lines.push(line);
    return lines;
  }
  async function renderShare(canvas, phrases, mascot) {
    const frame = await loadFrame();
    if (!frame) return false; // Let the original PNG renderer handle a failed decorative asset.
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const width = 1080;
    const rows = phrases.map((text, i) => {
      const size = i === 0 ? 84 : 66;
      ctx.font = `${size}px "Irish Grover", Georgia, serif`;
      return { size, color: i === 0 || i === 3 ? '#ffe399' : '#fff8e7', lines: wrapText(ctx, text, 780) };
    });
    const textHeight = rows.reduce((sum, row) => sum + row.lines.length * row.size * 1.3 + 26, 0);
    // Keep even a long name above the frame's lower medallions and brand.
    const contentTop = 570;
    const contentBottom = 0.74;
    const height = Math.max(1662, Math.ceil((contentTop + textHeight + 40) / contentBottom));
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#002014';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(frame, 0, 0, width, height);
    // Keep the original high-resolution mascot and all personalised text sharp.
    const glow = ctx.createRadialGradient(540, 290, 30, 540, 300, 390);
    glow.addColorStop(0, '#80da443d'); glow.addColorStop(1, '#00201400');
    ctx.fillStyle = glow; ctx.fillRect(150, 35, 780, 560);
    const artHeight = 405;
    const artWidth = artHeight * mascot.naturalWidth / mascot.naturalHeight;
    ctx.drawImage(mascot, (width - artWidth) / 2, 90, artWidth, artHeight);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.shadowColor = '#00140e'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
    let y = contentTop + Math.max(0, (height * contentBottom - contentTop - textHeight) / 2);
    for (const row of rows) {
      ctx.font = `${row.size}px "Irish Grover", Georgia, serif`;
      ctx.fillStyle = row.color;
      for (const line of row.lines) { ctx.fillText(line, width / 2, y, 780); y += row.size * 1.3; }
      y += 26;
    }
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    canvas.style.display = 'block';
    canvas.setAttribute('aria-label', phrases.join(' '));
    return true;
  }
  window.HexCompletion = Object.freeze({ reveal, markCast, renderShare });
})();
