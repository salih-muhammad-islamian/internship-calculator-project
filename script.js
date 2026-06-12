/**
 * CALC — Premium Calculator  |  script.js
 * Clean MVC-style vanilla JS, keyboard support, particles, ripple
 */

/* ── State ────────────────────────────────────────────────── */
const state = {
  current:     '',     // what the user is currently typing
  previous:    '',     // previous operand
  operator:    null,   // pending operator  (÷ × − +)
  justEvaled:  false,  // flag: just pressed =
  hasError:    false,
};

/* ── DOM refs ─────────────────────────────────────────────── */
const resultEl     = document.getElementById('result');
const expressionEl = document.getElementById('expression');
const displayEl    = resultEl.closest('.display');

/* ── Core Logic ───────────────────────────────────────────── */

/** Update the display */
function updateDisplay(forceResult) {
  const val = state.current || state.previous || '0';

  // Scale down font for long numbers
  const len = String(val).replace('-','').replace('.','').length;
  resultEl.style.fontSize =
    len > 12 ? '22px' :
    len > 9  ? '30px' :
    len > 7  ? '38px' : '48px';

  resultEl.textContent = formatNumber(val);
  expressionEl.textContent = buildExpression();
}

/** Format a numeric string for display (thousands, limit precision) */
function formatNumber(val) {
  if (val === '' || val === '-') return '0';
  const n = parseFloat(val);
  if (isNaN(n)) return val; // pass-through for error strings
  // Limit floating precision without trimming integer display
  if (!Number.isInteger(n) && String(val).includes('.')) {
    const parts = val.split('.');
    return parts[0] + '.' + parts[1]; // keep as typed
  }
  return val;
}

/** Build the expression label string */
function buildExpression() {
  if (!state.operator) return '';
  const opSym = state.operator;
  if (state.justEvaled) return '';
  return `${state.previous} ${opSym}`;
}

/** Input a digit or digits */
function inputDigit(digit) {
  if (state.hasError) clearAll();
  if (state.justEvaled) {
    state.current = digit;
    state.justEvaled = false;
  } else {
    // Prevent leading zeros
    if (state.current === '0' && digit !== '.') {
      state.current = digit;
    } else if (state.current.length < 15) {
      state.current += digit;
    }
  }
  updateDisplay();
}

/** Decimal point */
function inputDecimal() {
  if (state.hasError) clearAll();
  if (state.justEvaled) { state.current = '0.'; state.justEvaled = false; return updateDisplay(); }
  if (!state.current.includes('.')) {
    state.current = (state.current || '0') + '.';
  }
  updateDisplay();
}

/** Operator pressed */
function inputOperator(op) {
  if (state.hasError) return;

  // If there's a pending operation and the user typed a second number, evaluate first
  if (state.operator && state.current !== '' && !state.justEvaled) {
    calculate();
    state.justEvaled = false; // keep editing
  }

  if (state.current !== '') {
    state.previous = state.current;
    state.current  = '';
  }

  state.operator   = op;
  state.justEvaled = false;

  // Highlight active operator button
  document.querySelectorAll('.btn-op').forEach(b => {
    b.classList.toggle('active-op', b.dataset.value === op);
  });

  updateDisplay();
}

/** Perform calculation */
function calculate() {
  if (!state.operator || state.current === '') return;

  const a = parseFloat(state.previous);
  const b = parseFloat(state.current);

  if (isNaN(a) || isNaN(b)) return;

  let result;
  switch (state.operator) {
    case '+': result = a + b; break;
    case '−': result = a - b; break;
    case '×': result = a * b; break;
    case '÷':
      if (b === 0) { return showError('Cannot ÷ by 0'); }
      result = a / b;
      break;
    default: return;
  }

  // Handle floating point imprecision
  result = parseFloat(result.toPrecision(12));

  // Clamp to safe range
  if (!isFinite(result)) return showError('Overflow');

  state.previous   = String(result);
  state.current    = String(result);
  state.operator   = null;
  state.justEvaled = true;

  clearOpHighlight();
  popResult();
  glowDisplay();
  updateDisplay();
}

/** Sign toggle */
function toggleSign() {
  if (!state.current && !state.previous) return;
  const target = state.current || state.previous;
  const toggled = String(parseFloat(target) * -1);
  if (state.current) state.current = toggled;
  else state.previous = toggled;
  updateDisplay();
}

/** Percent */
function percent() {
  const target = state.current || state.previous;
  if (!target) return;
  const val = parseFloat(target) / 100;
  const result = String(parseFloat(val.toPrecision(10)));
  if (state.current) state.current = result;
  else state.previous = result;
  updateDisplay();
}

/** Delete last character */
function deleteLast() {
  if (state.hasError) return clearAll();
  if (state.justEvaled) return;
  state.current = state.current.slice(0, -1);
  updateDisplay();
}

/** Clear everything */
function clearAll() {
  state.current    = '';
  state.previous   = '';
  state.operator   = null;
  state.justEvaled = false;
  state.hasError   = false;
  resultEl.classList.remove('error', 'pop');
  displayEl.classList.remove('glowing');
  clearOpHighlight();
  updateDisplay();
}

/** Show an error */
function showError(msg) {
  resultEl.textContent = msg;
  resultEl.classList.add('error');
  displayEl.classList.remove('glowing');
  state.hasError = true;
  state.current = state.previous = '';
  state.operator = null;
  expressionEl.textContent = '';
}

/** UI helpers */
function popResult() {
  resultEl.classList.remove('pop');
  void resultEl.offsetWidth; // reflow
  resultEl.classList.add('pop');
}
function glowDisplay() {
  displayEl.classList.add('glowing');
  setTimeout(() => displayEl.classList.remove('glowing'), 900);
}
function clearOpHighlight() {
  document.querySelectorAll('.btn-op').forEach(b => b.classList.remove('active-op'));
}

/* ── Ripple Effect ────────────────────────────────────────── */
function createRipple(btn, e) {
  const circle   = document.createElement('span');
  const diameter = Math.max(btn.clientWidth, btn.clientHeight);
  const radius   = diameter / 2;
  const rect     = btn.getBoundingClientRect();
  const x        = (e.clientX || rect.left + rect.width  / 2) - rect.left - radius;
  const y        = (e.clientY || rect.top  + rect.height / 2) - rect.top  - radius;

  circle.style.cssText = `
    width:${diameter}px; height:${diameter}px;
    left:${x}px; top:${y}px;
  `;
  circle.classList.add('ripple');
  btn.appendChild(circle);
  circle.addEventListener('animationend', () => circle.remove());
}

/* ── Button Click Handler ─────────────────────────────────── */
document.querySelector('.btn-grid').addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  createRipple(btn, e);

  const action = btn.dataset.action;
  const value  = btn.dataset.value;

  switch (action) {
    case 'number':   inputDigit(value);   break;
    case 'decimal':  inputDecimal();      break;
    case 'operator': inputOperator(value);break;
    case 'equals':   calculate();         break;
    case 'clear':    clearAll();          break;
    case 'delete':   deleteLast();        break;
    case 'sign':     toggleSign();        break;
    case 'percent':  percent();           break;
  }
});

/* ── Keyboard Support ─────────────────────────────────────── */
const keyMap = {
  '0':'number:0','1':'number:1','2':'number:2','3':'number:3','4':'number:4',
  '5':'number:5','6':'number:6','7':'number:7','8':'number:8','9':'number:9',
  '.':'decimal', ',':'decimal',
  '+':'operator:+', '-':'operator:−', '*':'operator:×', '/':'operator:÷',
  'Enter':'equals', '=':'equals',
  'Backspace':'delete', 'Escape':'clear',
  'Delete':'clear',
};

document.addEventListener('keydown', e => {
  // Ignore modifier combos
  if (e.ctrlKey || e.altKey || e.metaKey) return;

  const mapped = keyMap[e.key];
  if (!mapped) return;
  e.preventDefault();

  const [action, value] = mapped.split(':');

  // Find matching button for visual feedback
  let btn = null;
  if (action === 'number')   btn = document.querySelector(`[data-value="${value}"]`);
  else if (action === 'operator') btn = document.querySelector(`[data-value="${value}"]`);
  else btn = document.querySelector(`[data-action="${action}"]`);

  if (btn) {
    btn.classList.add('key-pressed');
    createRipple(btn, {});
    setTimeout(() => btn.classList.remove('key-pressed'), 180);
  }

  switch (action) {
    case 'number':   inputDigit(value);    break;
    case 'decimal':  inputDecimal();       break;
    case 'operator': inputOperator(value); break;
    case 'equals':   calculate();          break;
    case 'clear':    clearAll();           break;
    case 'delete':   deleteLast();         break;
  }
});

/* ── Particle Canvas ──────────────────────────────────────── */
(function initParticles() {
  const canvas = document.getElementById('particles');
  const ctx    = canvas.getContext('2d');

  let W, H, particles = [];

  const PARTICLE_COUNT = 55;
  const COLORS = ['rgba(79,158,255,', 'rgba(155,107,255,', 'rgba(0,229,255,'];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  class Particle {
    constructor() { this.reset(true); }
    reset(init) {
      this.x  = Math.random() * W;
      this.y  = init ? Math.random() * H : H + 10;
      this.r  = Math.random() * 1.8 + 0.4;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = -(Math.random() * 0.4 + 0.1);
      this.a  = Math.random() * 0.5 + 0.1;
      this.color = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.pulse = Math.random() * Math.PI * 2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.pulse += 0.02;
      this.currentAlpha = this.a * (0.7 + 0.3 * Math.sin(this.pulse));
      if (this.y < -10) this.reset(false);
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = this.color + this.currentAlpha + ')';
      ctx.fill();
    }
  }

  function init() {
    resize();
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  }

  function frame() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(frame);
  }

  window.addEventListener('resize', resize);
  init();
  frame();
})();

/* ── Init ─────────────────────────────────────────────────── */
updateDisplay();
