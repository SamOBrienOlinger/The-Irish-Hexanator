/* Existing three-part hex generator; accessibility and rendering repairs only. */
const FIRST_PHRASE = document.getElementById('firstResult');
const SECOND_PHRASE = document.getElementById('secondResult');
const THIRD_PHRASE = document.getElementById('thirdResult');
const NAME_ELEMENT = document.getElementById('name');

// Keep the original phrases and their order unchanged.
let phraseListOne = [
  "will",
  "shall",
  "is cursed to",
  "will, from this day,",
  "is destined to",
  "is fated to",
];
let phraseListTwo = [
  "be covered in",
  "be imprisoned in",
  "be chained to",
  "be infected with",
  "be haunted by",
];
let phraseListThree = [
  "a mountain of Banshee poop!",
  "buckets of Leprechaun spittle!",
  "the Divil's fire for all eternity!",
  "a lake of boiling stout!",
  "an ocean of poison whiskey for infinity!",
  "rotten potatoes for ten years!",
  "clothes with itchy labels!",
  "a severe allergy to Guinness!"
];
const phraseListIndexMap = [phraseListOne, phraseListTwo, phraseListThree];
const phraseElementIndexMap = [FIRST_PHRASE, SECOND_PHRASE, THIRD_PHRASE];
const CURSE_BUTTONS = Array.from(document.querySelectorAll('.curse-button'));
const confirmNameButton = document.getElementById('confirmName');
const buttonFinal = document.getElementById('finalButton');

function setDisabled(button, disabled) {
  button.disabled = disabled;
  button.classList.toggle('disabled', disabled);
  if (disabled) button.classList.remove('active-flicker');
}

function checkName() {
  const valid = Boolean(NAME_ELEMENT.value.trim());
  const error = document.getElementById('name-error');
  NAME_ELEMENT.setAttribute('aria-invalid', String(!valid));
  error.textContent = valid ? '' : "Please enter your nemesis's name to begin.";
  error.hidden = valid;
  if (!valid) NAME_ELEMENT.focus();
  return valid;
}

function focusNext(control) {
  control.focus({ preventScroll: true });
  const rect = control.getBoundingClientRect();
  if (rect.bottom > window.innerHeight || rect.top < 0) {
    control.scrollIntoView({ block: 'center', behavior:
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
}

confirmNameButton.addEventListener('click', () => {
  if (!checkName()) return;
  document.getElementById('step2').style.display = 'block';
  if (!FIRST_PHRASE.textContent) setDisabled(CURSE_BUTTONS[0], false);
  if (!CURSE_BUTTONS[0].disabled) focusNext(CURSE_BUTTONS[0]);
});
NAME_ELEMENT.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); confirmNameButton.click(); }
});
NAME_ELEMENT.addEventListener('input', () => {
  if (NAME_ELEMENT.getAttribute('aria-invalid') === 'true') checkName();
});

CURSE_BUTTONS.forEach((button, index) => {
  setDisabled(button, true);
  button.addEventListener('click', () => {
    if (button.disabled || !checkName()) return;
    const phrases = phraseListIndexMap[index];
    phraseElementIndexMap[index].textContent = phrases[Math.floor(Math.random() * phrases.length)];
    setDisabled(button, true);
    const section = document.getElementById(`step${index + 3}`);
    section.style.display = 'block';
    const nextButton = CURSE_BUTTONS[index + 1] || buttonFinal;
    setDisabled(nextButton, false);
    if (index === 2 && window.HexCompletion) {
      // Step 4 is the third phrase button. Reveal only after it succeeds.
      window.HexCompletion.reveal(prepareFinalPhrase());
      nextButton.focus({ preventScroll: true });
      section.scrollIntoView({ block: section.offsetHeight <= innerHeight ? 'center' : 'end',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    } else {
      focusNext(nextButton);
    }
  });
});
setDisabled(buttonFinal, true);

function prepareFinalPhrase() {
  return [NAME_ELEMENT.value, ...phraseElementIndexMap.map((element) => element.textContent)];
}
buttonFinal.addEventListener('click', () => {
  if (buttonFinal.disabled || !checkName() || phraseElementIndexMap.some((element) => !element.textContent)) return;
  const result = document.getElementById('finalResult');
  // User-entered names are text, never executable HTML.
  result.textContent = prepareFinalPhrase().join(' ');
  setDisabled(buttonFinal, true);
  document.querySelector('.sparkle-background').style.display = 'block';
  if (window.HexCompletion) window.HexCompletion.markCast();
  document.getElementById('create-canvas').style.display = 'block';
  document.getElementById('refresh').style.display = 'block';
  result.tabIndex = -1;
  focusNext(result);
});
document.getElementById('refresh').addEventListener('click', () => document.location.reload());

// Preserve the original sharing artwork, corner shamrocks and PNG output.
// Wait for fonts and images so a fast download cannot save an unfinished canvas.
async function drawOnMainCanvas(phrases) {
  const canvas = document.getElementById('canvas');
  const loadImage = (source) => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load the original sharing artwork.'));
    image.src = source;
  });
  const [shamrock, leprechaun] = await Promise.all([
    loadImage('assets/css/Images/green-shamrock-no-bg.png'),
    loadImage('assets/css/Images/angry-leprechaun-bg-free.png'),
    // Canvas-only fonts are not requested by document.fonts.ready alone.
    // A blocked font service must not prevent an otherwise usable PNG.
    document.fonts ? document.fonts.load('28px "Irish Grover"').catch(() => []) : Promise.resolve()
  ]);
  // Use the same personalised artwork as the Step 4 reveal. If its decorative
  // frame cannot load, keep the original PNG renderer as a reliable fallback.
  if (window.HexCompletion && await window.HexCompletion.renderShare(canvas, phrases, leprechaun)) return;
  const scale = window.devicePixelRatio || 1;
  const width = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image creation is not supported in this browser.');
  ctx.font = '28px "Irish Grover", Georgia, serif';
  const lines = [];
  for (const phrase of phrases) {
    let line = '';
    for (const char of Array.from(phrase)) {
      if (ctx.measureText(line + char).width > 520 && line) {
        const space = line.lastIndexOf(' ');
        if (space > 0) { lines.push(line.slice(0, space)); line = line.slice(space + 1); }
        else { lines.push(line); line = ''; }
      }
      line += char;
    }
    lines.push(line);
  }
  const height = Math.max(400, 260 + lines.length * 34);
  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  [[10, 10], [490, 10], [10, height - 110], [490, height - 110]].forEach(([x, y]) => ctx.drawImage(shamrock, x, y, 100, 100));
  const artHeight = 125;
  const artWidth = artHeight * leprechaun.naturalWidth / leprechaun.naturalHeight;
  ctx.drawImage(leprechaun, (width - artWidth) / 2, 10, artWidth, artHeight);
  ctx.fillStyle = 'whitesmoke';
  ctx.font = '28px "Irish Grover", Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => ctx.fillText(line, width / 2, 158 + i * 34));
  ctx.font = '12px Arial';
  ctx.fillText(window.location.href, width / 2, height - 20, 560);
  canvas.style.display = 'block';
  canvas.setAttribute('aria-label', phrases.join(' '));
}

const canvasCreate = document.getElementById('create-canvas');
canvasCreate.addEventListener('click', async (event) => {
  event.preventDefault();
  const button = document.getElementById('createCanvasButton');
  if (button.disabled) return;
  button.disabled = true;
  canvasCreate.setAttribute('aria-busy', 'true');
  try {
    await drawOnMainCanvas(prepareFinalPhrase());
    document.getElementById('download-link').style.display = 'block';
    focusNext(document.querySelector('#download-link a'));
  } catch (error) {
    window.alert(error.message + ' Please try again.');
  } finally {
    button.disabled = false;
    canvasCreate.removeAttribute('aria-busy');
  }
});
document.querySelector('#download-link a').addEventListener('click', (event) => {
  event.preventDefault();
  const control = event.currentTarget;
  const link = document.createElement('a');
  link.download = 'canvas-image.png';
  link.href = document.getElementById('canvas').toDataURL('image/png');
  link.tabIndex = -1;
  link.setAttribute('aria-hidden', 'true');
  document.body.appendChild(link);
  link.click();
  link.remove();
  control.focus({ preventScroll: true });
});
// Social destinations remain in the HTML. Do not manufacture unhosted image URLs
// or append cloned canvases; neither provided an actual sharing feature.
