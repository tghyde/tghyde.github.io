/* Zooming number line: 0.9, 0.99, 0.999, ... closing in on 1.
   Level k shows the window [1 - 1.3·10^-k, 1 + 0.3·10^-k]. Everything is drawn as a continuous
   function of the (fractional) zoom level: tick marks grow out of the line as their spacing widens,
   labels appear only on well-separated ticks, and each gap bracket stretches and fades as the next
   one comes into focus. */
(function () {
  const W = 1700, H = 380, X0 = 80, X1 = 1620, AXIS_Y = 240;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const TEAL = [31, 138, 112], PINK = [194, 24, 91];
  const rgb = (c1, c2, t) => `rgb(${c1.map((v, i) => Math.round(mix(v, c2[i], t))).join(',')})`;

  function mount(container, onLevel = () => {}) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    container.appendChild(svg);

    let kCur = 0, kTarget = 0, raf = null;

    function draw(k) {
      const s = Math.pow(10, -k), lo = 1 - 1.3 * s, hi = 1 + 0.3 * s;
      const pxPerUnit = (X1 - X0) / (hi - lo);
      const x = v => X0 + (v - lo) * pxPerUnit;
      const isPoint = v => v > 0 && v < 1 && Math.abs(-Math.log10(1 - v) - Math.round(-Math.log10(1 - v))) < 1e-6;
      let out = '';

      // axis
      out += `<line class="axis" x1="${X0 - 30}" y1="${AXIS_Y}" x2="${X1 + 30}" y2="${AXIS_Y}"/>`;
      out += `<path d="M${X1 + 30},${AXIS_Y} l-18,-11 v22 z" fill="#1E2530"/>`;
      out += `<path d="M${X0 - 30},${AXIS_Y} l18,-11 v22 z" fill="#1E2530"/>`;

      // ticks at every decimal level: height and opacity follow the on-screen spacing
      for (let j = 0; j < 12; j++) {
        const step = Math.pow(10, -j), spacing = pxPerUnit * step;
        if (spacing < 6) break;
        const h = 4 + 14 * clamp(Math.log10(spacing / 8) / 2.1, 0, 1);
        const op = clamp((spacing - 6) / 20, 0, 1) * (0.35 + 0.65 * clamp(Math.log10(spacing / 8) / 2.1, 0, 1));
        const labelOp = j === 0 ? clamp((spacing - 220) / 160, 0, 1) : 0;   // only the integers get labels
        const i0 = Math.ceil(lo / step - 1e-9), i1 = Math.floor(hi / step + 1e-9);
        if (i1 - i0 > 400) continue;
        for (let i = i0; i <= i1; i++) {
          if (j > 0 && i % 10 === 0) continue;                    // drawn at a coarser level already
          const v = i * step, px = x(v);
          out += `<line x1="${px}" y1="${AXIS_Y - h}" x2="${px}" y2="${AXIS_Y + h}" stroke="#4C5566" stroke-width="2.5" opacity="${op.toFixed(2)}"/>`;
          if (labelOp > 0 && !isPoint(v)) {
            const isOne = Math.abs(v - 1) < 1e-9;
            out += `<text class="ticklabel" x="${px}" y="${AXIS_Y + 62}" opacity="${labelOp.toFixed(2)}"`
                 + (isOne ? ' style="fill:#1F5A9E;font-weight:700;font-size:40px"' : '')
                 + `>${isOne ? '1' : (Math.abs(v) < 1e-12 ? 0 : v).toFixed(j)}</text>`;
          }
        }
      }

      // the points 0.9, 0.99, ...: each one's look depends on how wide its gap to 1 is on screen
      for (let n = 1; n < 14; n++) {
        const w = pxPerUnit * Math.pow(10, -n);                  // on-screen gap to 1
        if (w < 10) break;
        const v = 1 - Math.pow(10, -n), px = x(v);
        const opP = clamp((w - 10) / 30, 0, 1);
        const f = clamp((w - 300) / 700, 0, 1);                  // 0 = in focus (newest), 1 = old
        const col = rgb(TEAL, PINK, f);
        const stemH = 96 - 56 * f, labelY = AXIS_Y - 118 + 56 * f;
        if (v >= lo) {
          out += `<g opacity="${opP.toFixed(2)}">`;
          out += `<line x1="${px}" y1="${AXIS_Y - stemH}" x2="${px}" y2="${AXIS_Y}" stroke="${col}" stroke-width="2" opacity=".6"/>`;
          out += `<circle cx="${px}" cy="${AXIS_Y}" r="11" fill="${col}" stroke="#FFFDF8" stroke-width="4"/>`;
          out += `<text class="ptlabel" x="${px}" y="${labelY}" style="fill:${col}">0.${'9'.repeat(n)}</text>`;
          out += `</g>`;
        }
        // gap bracket: fades in as it becomes visible, stretches and fades out as the next one takes over
        const gapOp = Math.min(clamp((w - 20) / 40, 0, 1), clamp((900 - w) / 500, 0, 1));   // gone by the time the zoom lands
        if (gapOp > 0) {
          const a = Math.max(px, X0 - 30), b = x(1), y = AXIS_Y + 120;
          out += `<g opacity="${gapOp.toFixed(2)}">`;
          out += `<path class="gap" d="M${a},${y - 22} v22 H${b} v-22" fill="none"/>`;
          out += `</g>`;
        }
      }
      // the point 1
      out += `<circle class="pt one" cx="${x(1)}" cy="${AXIS_Y}" r="13"/>`;

      // magnification badge
      const km = Math.round(k);
      const mag = km === 0 ? '1×' : `10<tspan baseline-shift="super" font-size="24">${km}</tspan>×`;
      out += `<text class="badge" x="${X0 - 30}" y="52">magnification: ${mag}</text>`;

      svg.innerHTML = out;
    }

    function animate() {
      const from = kCur, to = kTarget, dur = 1800, t0 = performance.now();
      if (raf) cancelAnimationFrame(raf);
      let told = false;
      const step = now => {
        const t = Math.min(1, (now - t0) / dur);
        const e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // easeInOutCubic
        kCur = from + (to - from) * e;
        draw(kCur);
        if (!told && t >= .5) { told = true; onLevel(to); }                  // swap the caption mid-zoom
        if (t < 1) raf = requestAnimationFrame(step); else raf = null;
      };
      raf = requestAnimationFrame(step);
    }

    function setLevel(k, animated) {
      kTarget = k;
      if (animated && Math.abs(k - kCur) > 1e-6) animate();
      else { if (raf) cancelAnimationFrame(raf); raf = null; kCur = k; draw(k); onLevel(k); }
    }

    draw(0);
    return { setLevel };
  }

  window.NumberLine = { mount };
})();
