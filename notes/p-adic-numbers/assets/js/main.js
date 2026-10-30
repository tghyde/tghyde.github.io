/* ---------- helpers ---------- */
const MOD = 10n ** 9n;
function modpow(b, e, m) { let r = 1n; b %= m; while (e > 0n) { if (e & 1n) r = r * b % m; b = b * b % m; e >>= 1n; } return r; }
const last9 = v => (v % MOD).toString().padStart(9, '0');
function colorTail(digits, n, cls = 'vas') {
  // highlight the last n digits
  n = Math.min(n, digits.length);
  const head = digits.slice(0, digits.length - n), tail = digits.slice(digits.length - n);
  return `${head}<span class="${cls}">${tail}</span>`;
}

/* ---------- powers table: 2^(5^n) ----------
   Values on the left (as many digits as fit, ellipsis on the left when cut), n on the right; the whole
   table is there from the start. Showing [data-powers-go] lights a band behind the stabilized digits
   (the last n+1 digits of row n), one digit at a time: top row to bottom row, right to left in each. */
const PowersTable = (() => {
  const tbody = document.querySelector('#powers-table tbody'), go = document.querySelector('[data-powers-go]');
  const LAST = 10;
  let timers = [], fitted = false, order = [];
  function build(D) {
    tbody.innerHTML = ''; order = [];
    for (let n = 0; n <= LAST; n++) {
      const tr = document.createElement('tr');
      let digits, dots = '';
      if (n <= 3) { const full = (2n ** (5n ** BigInt(n))).toString(); if (full.length <= D) digits = full; }
      if (digits === undefined) { digits = modpow(2n, 5n ** BigInt(n), 10n ** BigInt(D)).toString().padStart(D, '0'); dots = '<span class="muted">…</span>'; }
      const k = Math.min(n + 1, digits.length);
      const cells = [...digits].map((ch, i) => {
        const fromRight = digits.length - 1 - i, st = fromRight < k;
        return `<span class="d${st ? ' stab' : ''}${st && fromRight === 0 ? ' end' : ''}${st && fromRight === k - 1 ? ' start' : ''}">${ch}</span>`;
      }).join('');
      tr.innerHTML = `<td class="num">${dots}${cells}</td><td class="n">${n}</td>`;
      tbody.appendChild(tr);
      order.push(...[...tr.querySelectorAll('.stab')].reverse());       // right to left within the row
    }
  }
  function fit() {                                  // how many digits fit in the value column?
    build(40);
    const td = tbody.querySelector('tr:nth-child(3) td.num'); if (!td || !td.offsetWidth) return;
    const probe = document.createElement('span'); probe.style.whiteSpace = 'nowrap'; probe.innerHTML = '<span class="d">0</span>'.repeat(40); td.appendChild(probe);
    const perDigit = probe.offsetWidth / 40; probe.innerHTML = '<span class="muted">…</span>'; const dotsW = probe.offsetWidth; probe.remove();   // digits are boxed one by one
    const cs = getComputedStyle(td), avail = td.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    build(Math.max(12, Math.floor((avail - dotsW) / perDigit)));
    fitted = true;
  }
  const stop = () => { timers.forEach(clearTimeout); timers = []; };
  const light = on => order.forEach(d => d.classList.toggle('lit', on));
  function reset() { stop(); light(false); }
  function play() {
    reset();
    let t = 250, row = null;
    order.forEach(d => {
      const tr = d.closest('tr'); if (tr !== row) { if (row) t += 220; row = tr; }   // a breath between rows
      timers.push(setTimeout(() => d.classList.add('lit'), t)); t += 55;
    });
  }
  function sync() {                                 // instant: match the fragment's state
    stop();
    if (!fitted) fit();
    light(go.classList.contains('visible'));
  }
  build(40);
  document.fonts.ready.then(() => { fitted = false; sync(); });
  return { play, reset, sync };
})();

/* ---------- mysterious limit: (b^2 + 1) * b worked out to 0 ----------
   The card starts with the two factors; showing [data-bprod-go] plays the long multiplication:
   each partial product row (the multiplier digit highlighted), then the column sums with their
   carries, every column coming out 0. */
const BProd = (() => {
  const card = document.getElementById('bprod'), go = document.querySelector('[data-bprod-go]'), after = document.querySelector('.bprod-after');
  if (!card) return { play() {}, reset() {}, sync() {} };
  const K = 9, M = 10n ** BigInt(K);
  const b = modpow(2n, 5n ** 30n, M), c = (b * b + 1n) % M;
  const bs = b.toString().padStart(K, '0'), cs = c.toString().padStart(K, '0');
  const cell = (txt, cls = '') => { const e = document.createElement('span'); if (cls) e.className = cls; e.textContent = txt; card.appendChild(e); return e; };
  const rule = (cls = '') => { const d = document.createElement('div'); d.className = 'rule ' + cls; card.appendChild(d); return d; };
  const byPos = lr => lr.slice().reverse();                       // index by place value: 0 = units

  cell('', 'op'); cell('⋯', 'dots'); [...cs].forEach(ch => cell(ch));
  cell('×', 'op'); cell('⋯', 'dots'); const bot = byPos([...bs].map(ch => cell(ch)));
  rule();
  cell('', 'carry'); cell('', 'carry'); const carries = byPos(Array.from({ length: K }, () => cell('', 'carry anim')));
  const rows = [], pd = [];
  for (let i = 0; i < K; i++) {
    const ps = ((c * BigInt(bs[K - 1 - i])) % 10n ** BigInt(K - i)).toString().padStart(K - i, '0');
    const op = cell(i === K - 1 ? '+' : '', 'op' + (i === K - 1 ? ' anim' : '')), dots = cell('⋯', 'dots anim');
    const lr = Array.from({ length: K }, (_, col) => { const k = K - 1 - col - i; return k >= 0 ? cell(ps[ps.length - 1 - k], 'anim') : cell(''); });
    rows.push({ op, dots, cells: byPos(lr) });
    pd.push(Array.from({ length: K }, (_, pos) => pos >= i ? +ps[ps.length - 1 - (pos - i)] : 0));
  }
  const rule2 = rule('anim');
  cell('', 'op'); const resDots = cell('⋯', 'res dots anim');
  const res = byPos(Array.from({ length: K }, () => cell('', 'res anim')));
  let carry = 0;
  for (let pos = 0; pos < K; pos++) {
    let sum = carry; pd.forEach(r => sum += r[pos]);
    res[pos].textContent = sum % 10; carry = Math.floor(sum / 10);
    if (pos + 1 < K && carry) carries[pos + 1].textContent = carry;
  }
  const hl = cls => { const e = document.createElement('span'); e.className = 'hl ' + cls; card.prepend(e); return e; };
  const hlDigit = hl('digit'), hlCol = hl('col');
  function place(h, a, z, pad = 4) {                               // cover from cell a (top) to cell z (bottom)
    h.style.left = (Math.min(a.offsetLeft, z.offsetLeft) - pad) + 'px';
    h.style.width = (Math.max(a.offsetWidth, z.offsetWidth) + 2 * pad) + 'px';
    h.style.top = (a.offsetTop - pad) + 'px';
    h.style.height = (z.offsetTop + z.offsetHeight - a.offsetTop + 2 * pad) + 'px';
    h.classList.add('on');
  }
  const anims = [...card.querySelectorAll('.anim')];
  const show = (e, kind = 'pop') => {
    e.classList.add('on');
    const k = kind === 'drop' ? [{ opacity: 0, transform: 'translateY(-.5em)' }, { opacity: 1, transform: 'none' }]
            : kind === 'fade' ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'none' }];
    e.animate(k, { duration: 300, easing: 'ease-out' });
  };
  let run = 0;
  const PACE = 1.3;                                                // > 1 slows the whole animation down
  const sleep = ms => new Promise(r => setTimeout(r, ms * PACE));
  function reset() { run++; anims.forEach(e => e.classList.remove('on')); after.classList.remove('on'); hlDigit.classList.remove('on'); hlCol.classList.remove('on'); }
  async function play() {
    reset(); const id = run, ok = () => id === run;
    await sleep(250);
    for (let i = 0; i < K; i++) {                                    // partial products, one row per multiplier digit
      if (!ok()) return;
      place(hlDigit, bot[i], bot[i]); show(rows[i].dots, 'fade'); if (i === K - 1) show(rows[i].op, 'fade');
      await sleep(160);
      for (let pos = i; pos < K; pos++) { if (!ok()) return; show(rows[i].cells[pos]); await sleep(35); }
      await sleep(150);
    }
    if (!ok()) return;
    hlDigit.classList.remove('on'); show(rule2, 'fade'); await sleep(400);
    for (let pos = 0; pos < K; pos++) {                              // add the columns, right to left
      if (!ok()) return;
      place(hlCol, carries[pos], res[pos]); await sleep(170); if (!ok()) return;
      show(res[pos]); if (pos + 1 < K && carries[pos + 1].textContent) show(carries[pos + 1], 'drop');
      await sleep(260);
    }
    if (!ok()) return;
    hlCol.classList.remove('on'); show(resDots, 'fade');
    await sleep(700); if (!ok()) return;
    show(after, 'fade');                                             // b(b^2 + 1) = 0, yet neither factor is 0
  }
  function sync() { reset(); if (go.classList.contains('visible')) [...anims, after].forEach(e => e.classList.add('on')); }
  return { play, reset, sync };
})();

/* ---------- primes that are 1 mod 4: running percentage ----------
   One blue line (share of the first n primes with remainder 1 on division by 4) against a dashed
   50% reference line, computed here so it is exact. Showing the figure plays it: primes are added at
   an accelerating rate (log n follows a curve that starts brisk, rushes through the middle and settles), the x-axis always ends at
   the newest prime so the view zooms out, and the y-axis stays at 0-55% until n = 50 (so the early
   swings stay on screen) before easing to 30-55% by n = 400. The final frame is the static picture. */
const PrimePlot = (() => {
  const host = document.getElementById('prime-plot'), fig = host && host.closest('[data-prime-plot]'), cheb = fig && fig.querySelector('.cheb');
  if (!host) return { play() {}, reset() {}, sync() {} };
  const N = 1000, T = 9500, W = 840, H = 330, M = { l: 96, r: 96, t: 14, b: 50 }, YMAX = 55;
  const PW = W - M.l - M.r, PH = H - M.t - M.b;
  const sieve = new Uint8Array(8000).fill(1); const primes = [];
  for (let i = 2; primes.length < N; i++) if (sieve[i]) { primes.push(i); for (let j = i * i; j < sieve.length; j += i) sieve[j] = 0; }
  let ones = 0; const pct = primes.map((p, k) => (ones += p % 4 === 1, 100 * ones / (k + 1)));
  const smooth = t => t * t * (3 - 2 * t);
  const pace = t => t + .6 * t * t - .6 * t * t * t;                // fraction of log N reached at time t: slope 1 at the start, 1.15 mid-run, 0.4 at the end
  const niceStep = raw => { const e = 10 ** Math.floor(Math.log10(raw)), m = raw / e; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * e; };

  function draw(nf, live) {                                       // nf: how far along, 1 .. N (fractional while animating)
    const n = Math.max(1, Math.min(N, Math.floor(nf))), xmax = Math.max(nf, 4);
    const ymin = 30 * smooth(Math.min(1, Math.max(0, Math.log10(Math.max(nf, 1) / 50) / Math.log10(400 / 50))));
    const x = k => M.l + PW * (k - 1) / (xmax - 1), y = v => M.t + PH * (YMAX - v) / (YMAX - ymin);
    let d = ''; for (let k = 1; k <= n; k++) d += `${k > 1 ? 'L' : 'M'}${x(k).toFixed(1)},${y(pct[k - 1]).toFixed(1)}`;
    const labelEvery = YMAX - ymin > 35 ? 20 : 10;
    let grid = '';
    for (let v = 0; v <= 50; v += 10) if (v >= ymin - .5) {
      grid += `<line class="grid" x1="${M.l}" x2="${W - M.r}" y1="${y(v)}" y2="${y(v)}"/>`;
      if (v % labelEvery === 0) grid += `<text class="tick" x="${M.l - 16}" y="${y(v)}" text-anchor="end" dominant-baseline="middle">${v}%</text>`;
    }
    const step = Math.max(1, niceStep((xmax - 1) / 4.5)); let xt = '';            // whole numbers only
    for (let v = step; v <= xmax + 1e-9; v += step) xt += `<text class="tick" x="${x(v)}" y="${H - M.b + 38}" text-anchor="middle">${Math.round(v)}</text>`;
    const dot = live ? `<circle class="lead" cx="${x(n)}" cy="${y(pct[n - 1])}" r="9"/>` : '';
    host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      <defs><clipPath id="plotclip"><rect x="${M.l - 12}" y="${M.t - 12}" width="${PW + 24}" height="${PH + 12}"/></clipPath></defs>
      ${grid}
      <line class="half" x1="${M.l}" x2="${W - M.r}" y1="${y(50)}" y2="${y(50)}"/>
      <text class="half-label" x="${W - M.r + 16}" y="${y(50)}" dominant-baseline="middle">50%</text>
      <g clip-path="url(#plotclip)"><path class="share" d="${d}"/>${dot}</g>
      <line class="axis" x1="${M.l}" x2="${W - M.r}" y1="${y(ymin)}" y2="${y(ymin)}"/>
      ${xt}
      <text class="tick axis-title" x="${W - M.r + 62}" y="${H - M.b + 38}" text-anchor="start">n</text>
    </svg>`;
  }
  let run = 0;
  function reset() { run++; draw(1, false); cheb && cheb.classList.remove('on'); }
  function play() {
    const id = ++run, t0 = performance.now();
    const frame = now => {
      if (id !== run) return;
      const t = Math.min(1, (now - t0) / T);
      draw(N ** pace(t), t < 1);
      if (t < 1) requestAnimationFrame(frame); else cheb && cheb.classList.add('on');   // the drawing is done: name the effect
    };
    requestAnimationFrame(frame);
  }
  function sync() { run++; const on = fig.classList.contains('visible'); draw(on ? N : 1, false); cheb && cheb.classList.toggle('on', on); }
  draw(N, false);
  return { play, reset, sync };
})();

/* ---------- multiplication slide: the pattern rows worked out ----------
   Showing [data-mulrows-go] fills in rows 2, 3, 4 the way the b(b^2+1) card does: the multiplier digit
   lights up and the row's digits arrive right to left; then the vertical dots and the rule. */
const MulRows = (() => {
  const card = document.querySelector('.addition.mul'), go = document.querySelector('[data-mulrows-go]');
  if (!card || !go) return { play() {}, reset() {}, sync() {} };
  const mdig = [...card.querySelectorAll('.mdig')];                 // multiplier digits, left to right
  const anims = [...card.querySelectorAll('.mrow, .mrule')];
  const hl = document.createElement('span'); hl.className = 'mulhl mult live'; card.prepend(hl);
  const PACE = 1.0, sleep = ms => new Promise(r => setTimeout(r, ms * PACE));
  const show = (e, pop = true) => { e.classList.add('on'); e.animate(pop ? [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 1, transform: 'none' }] : [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' }); };
  let run = 0;
  function reset() { run++; anims.forEach(e => e.classList.remove('on')); hl.classList.remove('on'); }
  async function play() {
    reset(); const id = run, ok = () => id === run;
    await sleep(200);
    for (const r of [2, 3, 4]) {
      if (!ok()) return;
      const m = mdig[4 - r]; hl.style.left = (m.offsetLeft) + 'px'; hl.classList.add('on');   // row r uses the multiplier's 10^r digit
      await sleep(260);
      const cells = [...card.querySelectorAll(`.mrow[data-r="${r}"]`)].sort((a, b) => a.dataset.c - b.dataset.c);
      for (const c of cells) { if (!ok()) return; show(c, !c.classList.contains('dots')); await sleep(110); }
      await sleep(260);
    }
    if (!ok()) return;
    hl.classList.remove('on');
    show(card.querySelector('.mrow[data-r="v"]'), false); await sleep(300); if (!ok()) return;
    show(card.querySelector('.mrule'), false);
  }
  function sync() { reset(); if (go.classList.contains('visible')) anims.forEach(e => e.classList.add('on')); }
  return { play, reset, sync };
})();

/* ---------- powers of the limit b ---------- */
(function () {
  const tbody = document.querySelector('#bpowers-table tbody');
  const b = modpow(2n, 5n ** 12n, MOD);         // last 9 digits have stabilized by then
  const classes = ['vas', 'pink', 'teal', ''];
  for (let n = 1; n <= 9; n++) {
    const tr = document.createElement('tr');
    const cls = classes[(n - 1) % 4];
    tr.innerHTML = `<td class="n">${n}</td><td class="num"><span class="${cls}"><span class="muted">…</span>${last9(modpow(b, BigInt(n), MOD))}</span></td>`;
    tbody.appendChild(tr);
  }
})();

/* ---------- math ---------- */
renderMathInElement(document.querySelector('.slides'), {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\(', right: '\\)', display: false },
  ],
  macros: {
    '\\ZZ': '\\mathbb{Z}', '\\QQ': '\\mathbb{Q}', '\\RR': '\\mathbb{R}',
    '\\vas': '\\htmlClass{vas}{#1}', '\\pink': '\\htmlClass{pink}{#1}', '\\teal': '\\htmlClass{teal}{#1}',
    '\\blue': '\\htmlClass{vas}{#1}', '\\forest': '\\htmlClass{teal}{#1}',
  },
  trust: ctx => ctx.command === '\\htmlClass' || ctx.command === '\\htmlData',
  throwOnError: false,
  strict: false,
  ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
});

// \htmlData{fragment-index=n}{...} inside math becomes a reveal.js fragment
document.querySelectorAll('.slides .katex [data-fragment-index]').forEach(el => el.classList.add('fragment'));

/* ---------- number line wiring ---------- */
const nlSection = document.querySelector('[data-numberline]');
const numberline = NumberLine.mount(document.getElementById('numberline'),
  k => document.querySelectorAll('.nl-eq .eq').forEach(el => el.classList.toggle('on', +el.dataset.level === Math.round(k))));
function syncNumberline(animated) {
  let k = 0;
  nlSection.querySelectorAll('.zoom-ctrl.visible').forEach(el => { k = Math.max(k, +el.dataset.zoom); });
  numberline.setLevel(k, animated);
}

/* ---------- reveal ---------- */
Reveal.initialize({
  width: 1920, height: 1080, margin: 0.02, minScale: 0.1, maxScale: 2.5,
  center: false,
  hash: true,
  controls: false,
  progress: true,
  slideNumber: 'c/t',
  transition: 'fade', transitionSpeed: 'fast', backgroundTransition: 'fade',
  pdfSeparateFragments: false,
  plugins: [RevealNotes],
});
const eqVisible = deck => Math.max(0, ...[...deck.section.querySelectorAll('.eqstep.visible')].map(f => +f.dataset.eqstep));
const eqStepsOf = e => [...(e.fragments || [e.fragment])].filter(f => f.dataset.eqstep).map(f => +f.dataset.eqstep);
const eqSyncAll = () => EqDecks.forEach(d => d.show(eqVisible(d)));
// Characters that spill off the bottom (Alice, the Hatter) should reach the visual bottom of the
// window, however the slide is letterboxed: stretch them to cover the gap below the slide.
const BOTTOM_FIT = [['.looking-glass img.alice', 210, 1020], ['.tenadic img.hatter', 425, 900]];   // selector, top, base height
function fitBottom() {
  const gap = (document.querySelector('.reveal').clientHeight / Reveal.getScale() - 1080) / 2;   // letterbox below the slide, in slide px
  BOTTOM_FIT.forEach(([sel, top, base]) => { const img = document.querySelector(sel); if (img) img.style.height = Math.max(base, 1080 - top + gap + 6) + 'px'; });
}
Reveal.on('resize', fitBottom);
// Images pinned to the slide's bottom-left corner reach the screen's corner, past the letterbox margin.
function fitCorner() {
  const r = document.querySelector('.reveal'), k = Reveal.getScale();
  const gx = (r.clientWidth / k - 1920) / 2, gy = (r.clientHeight / k - 1080) / 2;
  document.querySelectorAll('img.pin-corner').forEach(img => { img.style.left = -(gx + 2) + 'px'; img.style.bottom = -(gy + 2) + 'px'; });
  document.querySelectorAll('.pin-bottom').forEach(el => { el.style.bottom = -(gy + 2) + 'px'; });   // to the screen's bottom edge only
}
Reveal.on('resize', fitCorner);
// slide 7: the addition-phase column highlight should cover the carries and partial products only
// (measured once the slide is actually displayed, since offsets are 0 while it is hidden)
// slide 12: the question card is as tall as the check card beside it (same top and bottom)
function fitQuestionCard() {
  const chk = document.querySelector('.neg-check .addition'), q = document.querySelector('.neg-question');
  if (chk && q && chk.offsetHeight > 0) q.style.height = chk.offsetHeight + 'px';
}
function fitMulHighlight() {
  const card = document.querySelector('.addition.mul'), c = card && card.querySelector('.carryS');
  if (c && c.offsetTop > 0) card.style.setProperty('--sum-top', (c.offsetTop - 4) + 'px');
}
/* A hooked line with data-hook-under="<selector>" slides over so its arrow's vertical stem sits
   under the first letter of the equation that selector names (on the same slide). */
function alignHooks() {
  const k = Reveal.getScale();
  document.querySelectorAll('.present p.hooked[data-hook-under]').forEach(p => {
    const t = p.closest('section').querySelector(p.dataset.hookUnder + ' .katex-html .mathnormal'), hook = p.querySelector('.hook');
    if (!t || !hook) return;
    p.style.transition = 'opacity .2s ease, visibility .2s ease';    // reveal's fragments transition `all`, which would animate the margin mid-measure
    p.style.marginLeft = '0px';
    const tr = t.getBoundingClientRect(), hr = hook.getBoundingClientRect();
    p.style.marginLeft = ((tr.left + tr.width / 2 - (hr.left + hr.width * 6 / 24)) / k) + 'px';   // stem is at x = 6 of the 24-unit icon
  });
}
Reveal.on('resize', alignHooks);
/* ---------- auto-advancing runs ----------
   A fragment with data-auto="ms" moves on to the next fragment by itself after ms, so one click can play
   a whole run of steps. Stepping back from anywhere inside a run returns to just before the click that
   started it (it keeps going back while the current step is itself an auto step). */
let autoTimer = null;
const autoStepsAt = (slide, f) => [...slide.querySelectorAll(`.fragment[data-fragment-index="${f}"][data-auto]`)];
Reveal.on('fragmentshown', () => {
  clearTimeout(autoTimer);
  const slide = Reveal.getCurrentSlide(), f = Reveal.getIndices().f;
  const ms = Math.max(0, ...autoStepsAt(slide, f).map(el => +el.dataset.auto));
  if (ms) autoTimer = setTimeout(() => Reveal.nextFragment(), ms);
});
Reveal.on('fragmenthidden', () => {
  clearTimeout(autoTimer);
  setTimeout(() => {
    const slide = Reveal.getCurrentSlide(), f = Reveal.getIndices().f;
    if (f !== undefined && f >= 0 && autoStepsAt(slide, f).length) Reveal.prevFragment();
  }, 0);
});
Reveal.on('slidechanged', () => clearTimeout(autoTimer));

Reveal.on('ready', () => { fitCorner(); syncNumberline(false); PiExpand.sync(false); eqSyncAll(); fitBottom(); fitMulHighlight(); fitQuestionCard(); PowersTable.sync(); BProd.sync(); PrimePlot.sync(); MulRows.sync(); document.fonts.ready.then(alignHooks); });
Reveal.on('slidechanged', e => { fitMulHighlight(); fitQuestionCard(); PowersTable.sync(); BProd.sync(); PrimePlot.sync(); MulRows.sync(); alignHooks(); if (e.currentSlide === nlSection) syncNumberline(false); if (e.currentSlide === PiExpand.section) PiExpand.sync(false); const d = EqSteps.forSection(e.currentSlide); if (d) d.show(eqVisible(d)); });
// a click can show several elements at once: check all of them for a trigger
const shownHas = (e, attr) => [...(e.fragments || [e.fragment])].some(f => f.hasAttribute(attr));
// ...but only play an animation when its trigger is the step just reached (not when jumping past it)
const reached = (e, attr) => [...(e.fragments || [e.fragment])].some(f => f.hasAttribute(attr) && +f.dataset.fragmentIndex === Reveal.getIndices().f);
Reveal.on('fragmentshown', e => {
  if (nlSection.contains(e.fragment)) syncNumberline(true);
  if (reached(e, 'data-pi-go')) PiExpand.play();
  if (reached(e, 'data-powers-go')) PowersTable.play();
  if (reached(e, 'data-bprod-go')) BProd.play();
  if (reached(e, 'data-prime-plot')) PrimePlot.play();
  if (reached(e, 'data-mulrows-go')) MulRows.play();
  const eq = eqStepsOf(e), d = EqSteps.forFragment(e.fragment); if (d && eq.length === 1) d.go(eq[0]); else if (d && eq.length > 1) d.show(Math.max(...eq));
});
Reveal.on('fragmenthidden', e => {
  if (nlSection.contains(e.fragment)) syncNumberline(true);
  if (shownHas(e, 'data-pi-go')) PiExpand.reset();
  if (shownHas(e, 'data-powers-go')) PowersTable.reset();
  if (shownHas(e, 'data-bprod-go')) BProd.reset();
  if (shownHas(e, 'data-prime-plot')) PrimePlot.reset();
  if (shownHas(e, 'data-mulrows-go')) MulRows.reset();
  const eq = eqStepsOf(e), d = EqSteps.forFragment(e.fragment); if (d && eq.length) d.show(Math.min(...eq) - 1);
});
