/* The deck's plots, drawn on canvases in slide pixels.
   Each plot has  go(step, animate)  and is told its step by main.js, which counts the
   visible fragments on its slide; draw() is safe to call at any time. */
const Plots = (() => {
  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const C = { ink: css('--ink'), soft: css('--ink-soft'), muted: css('--muted'), gold: css('--gold'), azure: css('--azure'), verm: css('--vermilion') };
  const SANS = '"Source Sans 3", "Helvetica Neue", Arial, sans-serif', SERIF = 'Fraunces, Georgia, serif';
  const fmt = v => Math.round(v).toLocaleString('en-US');
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  /* ---------- number theory ---------- */
  const LIMIT = 1000000;
  const primePi = (() => {                        // primePi[n] = number of primes <= n
    const composite = new Uint8Array(LIMIT + 1), count = new Uint32Array(LIMIT + 1);
    for (let i = 2; i * i <= LIMIT; i++) if (!composite[i]) for (let j = i * i; j <= LIMIT; j += i) composite[j] = 1;
    for (let n = 2, c = 0; n <= LIMIT; n++) { if (!composite[n]) c++; count[n] = c; }
    return count;
  })();
  function zetaReal(s) {                          // Euler-Maclaurin; s real, s != 1
    const N = 20; let sum = 0;
    for (let n = 1; n < N; n++) sum += Math.pow(n, -s);
    return sum + Math.pow(N, 1 - s) / (s - 1) + Math.pow(N, -s) / 2 + s * Math.pow(N, -s - 1) / 12
      - s * (s + 1) * (s + 2) * Math.pow(N, -s - 3) / 720;
  }
  const GRAM = (() => {                           // R(x) = 1 + sum_k (ln x)^k / (k k! zeta(k+1))
    const c = [0]; let fact = 1;
    for (let k = 1; k <= 140; k++) { fact *= k; c.push(1 / (k * fact * zetaReal(k + 1))); }
    return c;
  })();
  function R(x) {
    const L = Math.log(x); let sum = 0;
    for (let k = GRAM.length - 1; k >= 1; k--) sum = (sum + GRAM[k]) * L;
    return 1 + sum;
  }

  /* ---------- drawing ---------- */
  // A canvas at twice the slide's resolution, so it stays sharp when the deck is scaled up.
  function surface(id) {
    const el = document.getElementById(id); if (!el) return null;
    const canvas = el.querySelector('canvas'), W = el.offsetWidth, H = el.offsetHeight;
    if (!W || !H) return null;                    // the slide is not laid out yet
    if (canvas.width !== W * 2 || canvas.height !== H * 2) { canvas.width = W * 2; canvas.height = H * 2; }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, W, H);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    return { ctx, W, H };
  }
  function niceStep(span, count) {
    const raw = span / count, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
    return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p;
  }
  // Axes for [x0, x1] x [y0, y1] inside the margins m; returns the maps to pixels.
  // With ylog the y-axis is logarithmic (y0 > 0) and yticks should be given.
  function frame(s, { x0, x1, y0, y1, m, xticks, yticks, xfmt = fmt, yfmt = fmt, zeroLine = false, ylog = false }) {
    const { ctx, W, H } = s, X = x => m.l + (x - x0) / (x1 - x0) * (W - m.l - m.r);
    const Y = ylog ? y => H - m.b - Math.log(y / y0) / Math.log(y1 / y0) * (H - m.t - m.b)
                   : y => H - m.b - (y - y0) / (y1 - y0) * (H - m.t - m.b);
    ctx.font = `400 25px ${SANS}`; ctx.fillStyle = C.soft; ctx.strokeStyle = 'rgba(241,233,216,.13)'; ctx.lineWidth = 1;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    (yticks || ticks(y0, y1, 4)).forEach(v => { ctx.beginPath(); ctx.moveTo(m.l, Y(v)); ctx.lineTo(W - m.r, Y(v)); ctx.stroke(); ctx.fillText(yfmt(v), m.l - 12, Y(v)); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    (xticks || ticks(x0, x1, 5)).forEach(v => { if (v === x0 && x0 === 0 && y0 === 0) return; ctx.fillText(xfmt(v), X(v), H - m.b + 9); });
    ctx.strokeStyle = 'rgba(241,233,216,.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(m.l, m.t); ctx.lineTo(m.l, H - m.b); ctx.lineTo(W - m.r, H - m.b); ctx.stroke();
    if (zeroLine) { ctx.beginPath(); ctx.moveTo(m.l, Y(0)); ctx.lineTo(W - m.r, Y(0)); ctx.stroke(); }
    return { X, Y };
  }
  function ticks(a, b, count) {
    const step = niceStep(b - a, count), out = [];
    for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return out;
  }
  // Ticks for a logarithmic axis on [a, b]: 1, 2, 5, 10, 20, ... over a short range, else powers of 10.
  function logTicks(a, b) {
    const mult = Math.log10(b / a) <= 2 ? [1, 2, 5] : [1], out = [];
    for (let p = Math.floor(Math.log10(a)); p <= Math.ceil(Math.log10(b)); p++)
      mult.forEach(k => { const v = k * Math.pow(10, p); if (v >= a * (1 - 1e-9) && v <= b) out.push(v); });
    return out;
  }
  function label(ctx, text, x, y, colour, { align = 'left', italic = true, size = 34, sans = false } = {}) {
    ctx.font = sans ? `400 ${size}px ${SANS}` : `${italic ? 'italic ' : ''}500 ${size}px ${SERIF}`; ctx.fillStyle = colour; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
  }
  // Runs fn(t) for t from 0 to 1 over ms; a newer run on the same slot cancels the older.
  const running = {};
  function animate(slot, ms, fn, shape = ease) {
    cancelAnimationFrame(running[slot]);
    const t0 = performance.now();
    const tick = now => { const t = Math.min(1, (now - t0) / ms); fn(shape(t)); if (t < 1) running[slot] = requestAnimationFrame(tick); };
    running[slot] = requestAnimationFrame(tick);
  }

  /* ---------- pi(x) at two scales, R(x) laid over it, then their difference ---------- */
  const PrimePlot = (() => {
    const YLOG = false;                                    // true: logarithmic y-axis (the earlier version)
    const XZ = 10000, XMAX = [100, XZ, XZ, XZ];          // by step; step 0 (on arrival) is pi(x) up to 100
    const RSHOW = 2, DSTEP = 3;                            // R(x) from step RSHOW; pi(x) - R(x) at step DSTEP
    const DY = 7;                                          // step DSTEP: the y-window is [-DY, DY]; below 10^4, |pi(x) - R(x)| < 5.6
    let step = 0, xmax = 100, shown = 0, rAlpha = 0, diff = 0;   // shown, rAlpha: opacities; diff: 0 = pi and R, 1 = pi - R
    function draw() {
      const s = surface('prime-plot'); if (!s) return;
      if (shown <= 0) return;
      const { ctx, W, H } = s, m = { l: 112, r: 76, t: 22, b: 50 };
      ctx.globalAlpha = shown;
      // YLOG (top of PrimePlot) picks the y-axis: logarithmic from 1 (= pi(2)), or linear from 0.
      const ymax = primePi[Math.floor(xmax)] * (YLOG ? 1.4 : 1.1);
      // The difference: both curves have diff * R(x) taken off, so R(x) flattens onto 0 and pi(x) onto
      // pi(x) - R(x), while the y-window moves linearly from [0, ymax] to [-DY, DY] and the curves keep filling it.
      const x0 = 0, x1 = xmax, lin = diff > 0;
      let y0 = YLOG && !lin ? 1 : 0, y1 = ymax;
      if (lin) { y0 = -DY * diff; y1 = (1 - diff) * ymax + DY * diff; }
      const ylog = YLOG && !lin;
      const yticks = ylog && Math.log10(y1 / y0) > .5 ? logTicks(y0, y1) : ticks(y0, y1, 4);
      const ystep = yticks.length > 1 ? yticks[1] - yticks[0] : 1, yfmt = ystep < 1 ? (v => v.toFixed(Math.ceil(-Math.log10(ystep) - 1e-9))) : (v => fmt(v).replace('-', '−'));
      const { X, Y } = frame(s, { x0, x1, y0, y1, m, ylog, yticks, yfmt });
      const px = W - m.l - m.r, n = Math.max(px * 2, Math.min(Math.ceil(x1 - x0), px * 8));
      const off = x => diff * R(x);
      ctx.save(); ctx.beginPath(); ctx.rect(m.l, m.t, px, H - m.t - m.b); ctx.clip();
      if (rAlpha > 0) {                                    // R(x): a wide gold band under the staircase, thinning as it flattens onto 0
        ctx.globalAlpha = shown * rAlpha; ctx.strokeStyle = C.gold; ctx.lineWidth = 12 - 6 * diff; ctx.beginPath();
        for (let i = 0; i <= n; i++) { const x = Math.max(2, x0 + (x1 - x0) * i / n), y = R(x) - off(x); i ? ctx.lineTo(X(x), Y(y)) : ctx.moveTo(X(x), Y(y)); }
        ctx.stroke(); ctx.globalAlpha = shown;
      }
      const xs = Math.max(2, x0);
      let prev = primePi[Math.floor(xs)];
      ctx.strokeStyle = C.ink; ctx.lineWidth = 3 - diff; ctx.beginPath(); ctx.moveTo(X(xs), Y(prev - off(xs)));
      for (let i = 1; i <= n; i++) {
        const x = x0 + (x1 - x0) * i / n; if (x <= xs) continue;
        const y = primePi[Math.floor(x)], o = off(x);
        ctx.lineTo(X(x), Y(prev - o)); if (y !== prev) ctx.lineTo(X(x), Y(y - o)); prev = y;
      }
      ctx.stroke();
      ctx.restore();
      // The key sits at the bottom right over pi and R; for the difference it moves to the top left, raised into the
      // top margin so that it stays above the curve (which reaches 3.7 below x = 3,000; the key's bottom is near 4.4).
      if (diff < .5) legend(ctx, W - m.r - 16, H - m.b - 20, shown * (1 - 2 * diff), false);
      else legend(ctx, m.l + 16, m.t - 18, shown * (2 * diff - 1), true);
      ctx.globalAlpha = 1;
    }
    // The key, anchored at its bottom-right corner (or, for the difference, its top-left corner);
    // the R(x) row fades in with the curve.
    function legend(ctx, x, y, alpha, isDiff) {
      const row = 46, w = isDiff ? 290 : 190, pad = 16, rows = isDiff ? 1 : 1 + rAlpha, h = pad * 2 + row * rows - 10;
      const left = isDiff ? x : x - w, top = isDiff ? y : y - h;
      ctx.globalAlpha = alpha; ctx.fillStyle = css('--night'); ctx.strokeStyle = 'rgba(241,233,216,.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.rect(left, top, w, h); ctx.fill(); ctx.stroke();
      const entry = (y, colour, width, text) => {
        ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(left + pad, y - 11); ctx.lineTo(left + pad + 56, y - 11); ctx.stroke();
        label(ctx, text, left + pad + 74, y, colour);
      };
      entry(top + pad + 30, C.ink, isDiff ? 2 : 3, isDiff ? 'π(x) − R(x)' : 'π(x)');
      if (!isDiff && rAlpha > 0) { ctx.globalAlpha = alpha * rAlpha; entry(top + pad + 30 + row, C.gold, 12, 'R(x)'); }
      ctx.globalAlpha = shown;
    }
    function go(to, anim) {
      const from = { xmax, shown, rAlpha, diff }, target = { xmax: XMAX[to], shown: 1, rAlpha: to >= RSHOW ? 1 : 0, diff: to >= DSTEP ? 1 : 0 };
      step = to;
      const set = t => {
        xmax = Math.exp(Math.log(from.xmax) + (Math.log(target.xmax) - Math.log(from.xmax)) * t);
        shown = from.shown + (target.shown - from.shown) * t; rAlpha = from.rAlpha + (target.rAlpha - from.rAlpha) * t;
        diff = from.diff + (target.diff - from.diff) * t; draw();
      };
      if (!anim) { cancelAnimationFrame(running.prime); set(1); return; }
      if (from.diff !== target.diff) animate('prime', 1800, set);
      else animate('prime', from.xmax !== target.xmax ? 1700 : 500, set);
    }
    return { go, draw };
  })();

  /* ---------- zeta(s) for real s > 1 ---------- */
  const ZetaReal = (() => {
    function draw() {
      const s = surface('zeta-real-plot'); if (!s) return;
      const { ctx, W, H } = s, m = { l: 50, r: 24, t: 14, b: 50 };
      const { X, Y } = frame(s, { x0: 0, x1: 6, y0: 0, y1: 5, m, xticks: [1, 2, 3, 4, 5, 6], yticks: [1, 2, 3, 4, 5], xfmt: String, yfmt: String });
      ctx.setLineDash([7, 8]); ctx.strokeStyle = C.soft; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(X(1), Y(0)); ctx.lineTo(X(1), Y(5)); ctx.stroke();       // the pole at s = 1
      ctx.strokeStyle = 'rgba(241,233,216,.4)'; ctx.beginPath(); ctx.moveTo(X(1), Y(1)); ctx.lineTo(X(6), Y(1)); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.beginPath();
      for (let i = 0; i <= 400; i++) { const x = 1.2 + (6 - 1.2) * i / 400 - (i ? 0 : 0); const v = zetaReal(x); i ? ctx.lineTo(X(x), Y(v)) : (ctx.moveTo(X(1.248), Y(5)), ctx.lineTo(X(x), Y(v))); }
      ctx.stroke();
      label(ctx, 'ζ(s)', X(2.1), Y(2.6), C.gold, { size: 38 });
      label(ctx, 's', W - m.r - 4, H - m.b - 12, C.soft, { align: 'right' });
    }
    return { go: draw, draw };
  })();

  /* ---------- pi(x) - R(x) up to a million ---------- */
  const ErrorPlot = (() => {
    let cache = null;
    function draw() {
      const s = surface('error-plot'); if (!s) return;
      const { ctx, W, H } = s, m = { l: 78, r: 76, t: 18, b: 48 };
      const n = (W - m.l - m.r) * 4;
      if (!cache || cache.length !== n + 1) {
        cache = new Float64Array(n + 1);
        for (let i = 0; i <= n; i++) { const x = Math.max(2, LIMIT * i / n); cache[i] = primePi[Math.floor(x)] - R(x); }
      }
      let top = 0; cache.forEach(v => { top = Math.max(top, Math.abs(v)); });
      top = Math.ceil(top / 10) * 10;
      const { X, Y } = frame(s, { x0: 0, x1: LIMIT, y0: -top, y1: top, m, zeroLine: true, xticks: [250000, 500000, 750000, 1000000] });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const x = Math.max(2, LIMIT * i / n); i ? ctx.lineTo(X(x), Y(cache[i])) : ctx.moveTo(X(x), Y(cache[i])); }
      ctx.stroke();
      label(ctx, 'π(x) − R(x)', m.l + 20, m.t + 36, C.ink);
    }
    return { go: draw, draw };
  })();

  /* ---------- the same difference near the origin, rebuilt from the zeros ---------- */
  const WavePlot = (() => {
    const D = window.WAVES;
    let step = 0, current = D ? D.sums[0].slice() : [];
    const caption = k => k === 0 ? 'just the trivial zeros' : k === 1 ? 'the first pair of zeros' : `the first ${k} pairs of zeros`;
    function draw() {
      const s = surface('wave-plot'); if (!s || !D) return;
      const { ctx, W, H } = s, m = { l: 78, r: 40, t: 18, b: 48 };
      const { X, Y } = frame(s, { x0: 0, x1: D.xmax, y0: -1.5, y1: 1.5, m, zeroLine: true, yticks: [-1, 0, 1], xticks: [20, 40, 60, 80, 100], yfmt: String });
      const n = (W - m.l - m.r) * 3;                         // the target: pi(x) - R(x) itself
      ctx.strokeStyle = 'rgba(241,233,216,.5)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const x = D.xmin + (D.xmax - D.xmin) * i / n, v = primePi[Math.floor(x)] - R(x); i ? ctx.lineTo(X(x), Y(v)) : ctx.moveTo(X(x), Y(v)); }
      ctx.stroke();
      ctx.strokeStyle = C.azure; ctx.lineWidth = 3.5; ctx.beginPath();
      current.forEach((v, i) => { const x = D.xmin + (D.xmax - D.xmin) * i / (current.length - 1); i ? ctx.lineTo(X(x), Y(v)) : ctx.moveTo(X(x), Y(v)); });
      ctx.stroke();
      label(ctx, 'π(x) − R(x)', m.l + 20, m.t + 36, 'rgba(241,233,216,.75)');
      label(ctx, caption(D.stages[step]), W - m.r - 8, m.t + 36, C.azure, { align: 'right', sans: true });
    }
    // The terms of the sum under the plot (data-wave-term="k") show once stage k is reached.
    const terms = () => document.querySelectorAll('[data-wave-term]').forEach(el => el.classList.toggle('reached', step >= +el.dataset.waveTerm));
    let pause = 0;
    function morph(to, ms, done) {
      const from = current.slice(), target = D.sums[to];
      step = to; terms();
      const set = t => { current = target.map((v, i) => from[i] + (v - from[i]) * t); draw(); if (t === 1 && done) done(); };
      if (!ms) { cancelAnimationFrame(running.wave); set(1); return; }
      animate('wave', ms, set);
    }
    // With sweep, a forward move passes through the stages that have a term in the sum
    // (data-wave-term) on the way, pausing briefly at each.
    function go(to, anim, sweep) {
      if (!D) return;
      to = Math.max(0, Math.min(D.sums.length - 1, to));
      clearTimeout(pause);
      if (!anim) return morph(to, 0);
      const stops = [...new Set([...document.querySelectorAll('[data-wave-term]')].map(el => +el.dataset.waveTerm))]
        .filter(k => k > step && k < to).sort((a, b) => a - b).concat(to);
      if (!sweep || to <= step || stops.length === 1) return morph(to, 900);
      const next = () => morph(stops.shift(), 700, () => { if (stops.length) pause = setTimeout(next, 450); });
      next();
    }
    return { go, draw };
  })();

  return { PrimePlot, ZetaReal, ErrorPlot, WavePlot };
})();
