/* ---------- math ---------- */
renderMathInElement(document.querySelector('.slides'), {
  delimiters: [
    { left: '$$', right: '$$', display: true },
    { left: '\\[', right: '\\]', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\(', right: '\\)', display: false },
  ],
  macros: {
    '\\ZZ': '\\mathbb{Z}', '\\QQ': '\\mathbb{Q}', '\\RR': '\\mathbb{R}', '\\CC': '\\mathbb{C}',
    '\\Li': '\\operatorname{Li}',
    '\\gold': '\\htmlClass{gold}{#1}', '\\azure': '\\htmlClass{azure}{#1}', '\\verm': '\\htmlClass{verm}{#1}', '\\teal': '\\htmlClass{teal}{#1}',
  },
  trust: ctx => ctx.command === '\\htmlClass' || ctx.command === '\\htmlData',
  strict: false,
  throwOnError: false,
});

/* ---------- marks over the zeta backdrop ----------
   figs/zeta-domain.jpg shows -28 < Re s < 6 and -34 < Im s < 34 on the full 1920 x 1080 slide.
   An <svg class="marks" data-zeta-marks="..."> gets, for each word in the list:
     axis     the real axis                 line    the critical line Re s = 1/2
     zeros    the zeros on the critical line trivial the trivial zeros -2, -4, ...
     pole     the pole at s = 1             labels  names for the above                        */
(() => {
  const RE = [-28, 6], IM = 34, W = 1920, H = 1080;
  const X = re => (re - RE[0]) / (RE[1] - RE[0]) * W, Y = im => H / 2 - im / (2 * IM) * H;
  const GAMMA = [14.134725, 21.022040, 25.010858, 30.424876, 32.935062];
  const NS = 'http://www.w3.org/2000/svg';
  const add = (svg, tag, attrs, text) => {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (text !== undefined) e.textContent = text;
    svg.appendChild(e); return e;
  };
  document.querySelectorAll('svg[data-zeta-marks]').forEach(svg => {
    const want = new Set(svg.dataset.zetaMarks.split(/\s+/));
    if (want.has('axis')) add(svg, 'line', { class: 'axis', x1: 0, y1: Y(0), x2: W, y2: Y(0) });
    if (want.has('line')) add(svg, 'line', { class: 'crit', x1: X(.5), y1: 0, x2: X(.5), y2: H });
    if (want.has('trivial')) for (let n = 2; n <= 26; n += 2) {
      add(svg, 'circle', { class: 'zero trivial', cx: X(-n), cy: Y(0), r: 7 });
      if (want.has('labels')) add(svg, 'text', { x: X(-n), y: Y(0) + 36, 'text-anchor': 'middle' }, '−' + n);
    }
    if (want.has('zeros')) GAMMA.forEach(g => [g, -g].forEach(t => add(svg, 'circle', { class: 'zero', cx: X(.5), cy: Y(t), r: 9 })));
    if (want.has('pole')) {
      const x = X(1), y = Y(0), d = 8;
      add(svg, 'path', { class: 'pole', d: `M${x - d} ${y - d}L${x + d} ${y + d}M${x - d} ${y + d}L${x + d} ${y - d}` });
      if (want.has('labels')) add(svg, 'text', { x: x + 4, y: y + 36, 'text-anchor': 'middle' }, '1');
    }
    if (want.has('labels')) {
      add(svg, 'text', { class: 'it', x: X(.5) + 20, y: Y(-28.2) }, 'Re s = ½');
      GAMMA.slice(0, 3).forEach(g => add(svg, 'text', { x: X(.5) + 20, y: Y(g) + 8 }, `½ + ${g.toFixed(2)}… i`));
    }
  });
})();

/* ---------- reveal ---------- */
Reveal.initialize({
  width: 1920, height: 1080, margin: 0, minScale: 0.1, maxScale: 2.5,
  center: false,
  hash: true,
  controls: false,
  progress: true,
  slideNumber: 'c/t',
  transition: 'fade', transitionSpeed: 'fast', backgroundTransition: 'fade',
  pdfSeparateFragments: false,
  plugins: [RevealNotes],
});

/* ---------- plots follow the fragments ----------
   A plot's step is the largest data-<name>-step among the fragments now visible on its slide;
   if the fragment giving that step also has data-<name>-sweep, the plot is told to sweep to it. */
const STEPPED = [['primeStep', Plots.PrimePlot], ['waveStep', Plots.WavePlot]];
const stepOf = key => Math.max(0, ...[...document.querySelectorAll('.fragment.visible')].filter(f => f.dataset[key] !== undefined).map(f => +f.dataset[key]));
const sweepOf = (key, step) => [...document.querySelectorAll('.fragment.visible')].some(f => +f.dataset[key] === step && f.dataset[key.replace('Step', 'Sweep')] !== undefined);
const syncPlots = animate => {
  STEPPED.forEach(([key, plot]) => { const step = stepOf(key); plot.go(step, animate, sweepOf(key, step)); });
  Plots.ZetaReal.draw(); Plots.ErrorPlot.draw();
};
Reveal.on('ready', () => { syncPlots(false); document.fonts.ready.then(() => syncPlots(false)); });
Reveal.on('slidechanged', () => syncPlots(false));
Reveal.on('fragmentshown', () => syncPlots(true));
Reveal.on('fragmenthidden', () => syncPlots(true));
Reveal.on('resize', () => syncPlots(false));
