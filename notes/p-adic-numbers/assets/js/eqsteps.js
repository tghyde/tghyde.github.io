/* Click-by-click derivations (slides 3 and 5).
   Rows are stacked top to bottom (oldest first) with their first "=" aligned. Equations are rows
   of token <span>s set in the KaTeX fonts; transitions between states are FLIP animations keyed by
   token id. The engine is generic; each slide supplies a spec (its rows and its step animations). */

const T = (id, text, cls = '') => ({ id, text, cls });
const F = (id, num, den) => ({ id, text: num + '/' + den, cls: 'frac', num, den });   // a stacked fraction token
function fill(el, t) {
  if (t.num === undefined) { el.textContent = t.text; return; }
  el.textContent = '';
  const n = document.createElement('span'), d = document.createElement('span');
  n.className = 'num'; n.textContent = t.num; d.className = 'den'; d.textContent = t.den;
  el.append(n, d);
}
const EqTok = {
  X: T('x', 'x', 'var'), EQ: T('eq', '=', 'rel'), TEN: T('tenL', '10'), N1: T('n1', '9'), DOT: T('dot', '.'),
  PLUS: T('plus', '+', 'bin'), ELL: T('ell', '…', 'ell'), ELL_L: T('ell', '…', 'ellL'),
  N: (...ids) => ids.map(i => T('n' + i, '9')),
};

function makeEqSteps(section, spec) {
  const stack = section.querySelector('.eqstack');
  const ROW = spec.row || 112;
  let EQX = 430;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const q = (row, id) => row.querySelector(`[data-id="${id}"]`);

  function mk(t) {
    const el = document.createElement('span');
    el.className = 'tok' + (t.cls ? ' ' + t.cls : ''); el.dataset.id = t.id; fill(el, t);
    return el;
  }
  function alignRow(row) { const eq = q(row, 'eq'); if (eq) row.style.left = (EQX - eq.offsetLeft) + 'px'; }
  function mkRow(tokens, i) {
    const row = document.createElement('div');
    row.className = 'eqrow'; row.dataset.i = i; row.style.top = i * ROW + 'px';
    tokens.forEach(t => row.appendChild(mk(t)));
    row.style.transition = 'none';
    stack.appendChild(row); alignRow(row);
    void row.offsetWidth; row.style.transition = '';
    return row;
  }
  // Centre the block on the widest row, with room for the widest left-hand side.
  function measure() {
    if (!stack.offsetWidth) return;
    const rows = spec.measure.map(t => mkRow(t, 0));
    const lhs = Math.max(...rows.map(r => q(r, 'eq').offsetLeft)), rhs = Math.max(...rows.map(r => r.offsetWidth - q(r, 'eq').offsetLeft));
    rows.forEach(r => r.remove());
    EQX = Math.round((stack.offsetWidth - (lhs + rhs)) / 2 + lhs);
    measure.done = true;
  }

  async function flip(row, tokens, dur = 500) {
    const old = new Map([...row.querySelectorAll('.tok:not([data-pin])')].map(el => [el.dataset.id, { el, x: el.offsetLeft, y: el.offsetTop }]));
    const keep = new Set(tokens.map(t => t.id));
    const leaving = [...old.values()].filter(o => !keep.has(o.el.dataset.id));
    leaving.forEach(o => { o.el.style.position = 'absolute'; o.el.style.left = o.x + 'px'; o.el.style.top = o.y + 'px'; o.el.style.margin = 0; });
    tokens.forEach(t => {
      let el = old.get(t.id)?.el;
      if (!el) el = mk(t); else { fill(el, t); el.className = 'tok' + (t.cls ? ' ' + t.cls : ''); }
      row.appendChild(el);
    });
    alignRow(row);
    const anims = [];
    tokens.forEach(t => {
      const el = q(row, t.id), o = old.get(t.id);
      if (!o) anims.push(el.animate([{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'none' }], { duration: dur, easing: 'ease-out' }));
      else {
        const dx = o.x - el.offsetLeft;
        if (Math.abs(dx) > .5) anims.push(el.animate([{ transform: `translateX(${dx}px)` }, { transform: 'none' }], { duration: dur, easing: 'ease-in-out' }));
      }
    });
    leaving.forEach(o => anims.push(o.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: dur * .6, fill: 'forwards' })));
    await Promise.all(anims.map(a => a.finished.catch(() => {})));
    leaving.forEach(o => o.el.remove());
  }

  // A new row whose tokens fly down from matching tokens in the row above.
  async function dropRow(tokens, i, from, idMap = {}, dur = 750) {
    const row = mkRow(tokens, i);
    const scale = Reveal.getScale();
    const anims = [];
    tokens.forEach(t => {
      const el = q(row, t.id), src = q(from, idMap[t.id] || t.id);
      if (!src) { anims.push(el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: dur })); return; }
      const a = src.getBoundingClientRect(), b = el.getBoundingClientRect();
      anims.push(el.animate([{ transform: `translate(${(a.left - b.left) / scale}px, ${(a.top - b.top) / scale}px)` }, { transform: 'none' }], { duration: dur, easing: 'cubic-bezier(.4,0,.2,1)' }));
    });
    await Promise.all(anims.map(a => a.finished.catch(() => {})));
    return row;
  }

  // A single multiplier (10 by default) sweeps left to right across `row`: it leaves a copy behind
  // in front of x and, as it reaches `passId`, the row flips to `after`.
  async function sweepTen(row, ok, passId, after, mult = EqTok.TEN) {
    const ten = mk(mult); ten.style.opacity = 0; ten.style.transition = 'opacity .35s';
    row.style.transition = 'none'; row.prepend(ten); alignRow(row); void row.offsetWidth; row.style.transition = '';
    await sleep(520); if (!ok()) return;
    const sw = mk(T('sweep', mult.text)); sw.dataset.pin = '1';
    sw.style.cssText = `position:absolute; left:${ten.offsetLeft}px; top:${ten.offsetTop}px; margin:0; z-index:2;`;
    row.appendChild(sw);
    const pass = q(row, passId), last = [...row.querySelectorAll('.tok:not([data-pin])')].pop();
    const dist = last.offsetLeft + last.offsetWidth + 60 - ten.offsetLeft;
    const DUR = 2400;
    const sweep = sw.animate([
      { transform: 'translateX(0)', opacity: 1 },
      { transform: `translateX(${dist * .88}px)`, opacity: 1, offset: .88 },
      { transform: `translateX(${dist}px)`, opacity: 0 }], { duration: DUR, easing: 'linear', fill: 'forwards' });
    setTimeout(() => { if (ok()) ten.style.opacity = 1; }, DUR * .09);
    const tHop = DUR * ((pass.offsetLeft - ten.offsetLeft) / dist) * .97;
    setTimeout(() => { if (ok()) flip(row, after, 600); }, tHop);
    await sweep.finished.catch(() => {}); sw.remove();
  }

  const rowAt = i => stack.querySelector(`.eqrow[data-i="${i}"]`);
  const dimAbove = i => [...stack.children].forEach(r => r.classList.toggle('past', +r.dataset.i < i));
  const cancel = (row, ids) => ids.forEach(id => q(row, id).classList.add('cancel'));
  const h = { T, F, mk, q, sleep, flip, dropRow, sweepTen, rowAt, dimAbove, cancel };
  const steps = spec.steps(h);
  const STATES = spec.states;

  let runId = 0, current = -1;
  function show(k) {
    runId++; current = k;
    if (!measure.done) measure();
    stack.innerHTML = '';
    STATES[k].forEach((tokens, i) => {
      const row = mkRow(tokens, i);
      if (spec.plain) return;                                   // a running chain: no dimming, no blue final row
      if (i < STATES[k].length - 1) row.classList.add('past');
      if (k === STATES.length - 1 && i === STATES[k].length - 1) row.classList.add('final');
    });
  }
  async function go(k) {
    if (!steps[k]) return show(k);
    if (current !== k - 1) show(k - 1);
    if (!measure.done) measure();
    const id = ++runId; current = k;
    const ok = () => id === runId;
    const last = STATES[k - 1][STATES[k - 1].length - 1], lastRow = rowAt(STATES[k - 1].length - 1);
    if (lastRow) { lastRow.innerHTML = ''; last.forEach(t => lastRow.appendChild(mk(t))); alignRow(lastRow); }
    await steps[k](ok);
  }
  show(0);
  document.fonts.ready.then(() => { measure.done = false; show(Math.max(0, current)); });
  return { section, show, go, steps: STATES.length - 1 };
}

/* ---------- slide 3: why 0.999... = 1 ---------- */
const EqSpecs = {};
EqSpecs.nines = (() => {
  const { X, EQ, TEN, N1, DOT, PLUS, ELL, N } = EqTok;
  const R0 = [X, EQ, T('z', '0'), DOT, ...N(1, 2, 3, 4, 5), ELL];
  const R1a = [TEN, X, EQ, N1, DOT, ...N(2, 3, 4, 5, 6), ELL];
  const R1b = [...R1a, T('eq2', '=', 'rel'), T('n1b', '9'), T('plus2', '+', 'bin'), T('z2', '0'), T('dot2', '.'), ...['a', 'b', 'c', 'd', 'e'].map(i => T('m' + i, '9')), T('ell2', '…', 'ell')];
  const R1c = [...R1b, T('eq3', '=', 'rel'), T('n1c', '9'), T('plus3', '+', 'bin'), T('xR', 'x', 'var')];
  const R2a = [TEN, X, EQ, N1, PLUS, T('xR', 'x', 'var')];
  const R2c = [T('nine', '9'), X, EQ, N1];
  const R3b = [X, EQ, T('one', '1')];
  return {
    states: [[R0], [R0, R1a], [R0, R1b], [R0, R1c], [R0, R1c, R2c], [R0, R1c, R2c, R3b]],
    measure: [R1c, R2a],
    steps: h => ({
      async 1(ok) { h.dimAbove(1); const row = await h.dropRow(R0, 1, h.rowAt(0)); if (!ok()) return; await h.sleep(300); if (!ok()) return; await h.sweepTen(row, ok, 'z', R1a); },
      async 2(ok) { await h.flip(h.rowAt(1), R1b, 650); },
      async 3(ok) { await h.flip(h.rowAt(1), R1c, 650); },
      async 4(ok) {
        h.dimAbove(2);
        const row = await h.dropRow(R2a, 2, h.rowAt(1), { eq: 'eq3', n1: 'n1c', plus: 'plus3' }); if (!ok()) return;
        await h.sleep(500); if (!ok()) return;
        h.cancel(row, ['tenL', 'xR']); await h.sleep(900); if (!ok()) return;
        await h.flip(row, R2c, 650);
      },
      async 5(ok) {
        h.dimAbove(3);
        const row = await h.dropRow(R2c, 3, h.rowAt(2)); if (!ok()) return;
        await h.sleep(400); if (!ok()) return;
        h.cancel(row, ['nine', 'n1']); await h.sleep(900); if (!ok()) return;
        await h.flip(row, R3b, 650); if (!ok()) return;
        row.classList.add('final');
      },
    }),
  };
})();

/* ---------- slide 5: what is ...99999? ---------- */
EqSpecs.tenadic = (() => {
  const { X, EQ, TEN, ELL_L, N } = EqTok;
  const MINUS = T('minus', '−', 'bin'), NINE_R = T('nineR', '9');
  const R0 = [X, EQ, ELL_L, ...N(1, 2, 3, 4, 5)];                                                  // x = …99999
  const R1a = [TEN, X, EQ, ELL_L, ...N(1, 2, 3, 4, 5), T('z', '0')];                               // 10x = …999990
  const R1b = [...R1a, T('eq2', '=', 'rel'), T('ell2', '…', 'ellL'), ...['a', 'b', 'c', 'd', 'e'].map(i => T('m' + i, '9')), T('minus2', '−', 'bin'), T('nine2', '9')]; // = …99999 − 9
  const R1c = [...R1b, T('eq3', '=', 'rel'), T('xR', 'x', 'var'), MINUS, NINE_R];                 // = x − 9
  const R2a = [TEN, X, EQ, T('xR', 'x', 'var'), MINUS, NINE_R];                                    // 10x = x − 9
  const NEG = T('minus', '−', 'neg');                                                               // same token, now a unary minus
  const R2c = [T('nine', '9'), X, EQ, NEG, NINE_R];                                                 // 9x = −9
  const R3b = [X, EQ, NEG, T('one', '1')];                                                          // x = −1
  return {
    states: [[R0], [R0, R1a], [R0, R1b], [R0, R1c], [R0, R1c, R2c], [R0, R1c, R2c, R3b]],
    measure: [R1c, R2a],
    steps: h => ({
      async 1(ok) { h.dimAbove(1); const row = await h.dropRow(R0, 1, h.rowAt(0)); if (!ok()) return; await h.sleep(300); if (!ok()) return; await h.sweepTen(row, ok, 'n5', R1a); },
      async 2(ok) { await h.flip(h.rowAt(1), R1b, 650); },
      async 3(ok) { await h.flip(h.rowAt(1), R1c, 650); },
      async 4(ok) {
        h.dimAbove(2);
        const row = await h.dropRow(R2a, 2, h.rowAt(1), { eq: 'eq3' }); if (!ok()) return;
        await h.sleep(500); if (!ok()) return;
        h.cancel(row, ['tenL', 'xR']); await h.sleep(900); if (!ok()) return;
        await h.flip(row, R2c, 650);
      },
      async 5(ok) {
        h.dimAbove(3);
        const row = await h.dropRow(R2c, 3, h.rowAt(2)); if (!ok()) return;
        await h.sleep(400); if (!ok()) return;
        h.cancel(row, ['nine', 'nineR']); await h.sleep(900); if (!ok()) return;
        await h.flip(row, R3b, 650); if (!ok()) return;
        row.classList.add('final');
      },
    }),
  };
})();

/* ---------- slide 13: x = ...090909 is -1/11 ---------- */
EqSpecs.elevenths = (() => {
  const { X, EQ, ELL_L } = EqTok;
  const HUN = T('tenL', '100');                                                                     // same id as the 10, so sweep/cancel work unchanged
  const D = (...ids) => ids.map((i, k) => T('n' + i, k % 2 ? '9' : '0'));                         // 0 9 0 9 0 9
  const MINUS = T('minus', '−', 'bin'), NINE_R = T('nineR', '9');
  const R0 = [X, EQ, ELL_L, ...D(1, 2, 3, 4, 5, 6)];                                               // x = …090909
  const R1a = [HUN, X, EQ, ELL_L, ...D(1, 2, 3, 4, 5, 6), T('z1', '0'), T('z2', '0')];             // 100x = …09090900
  const R1b = [...R1a, T('eq2', '=', 'rel'), T('ell2', '…', 'ellL'), ...['a', 'b', 'c', 'd', 'e', 'f'].map((i, k) => T('m' + i, k % 2 ? '9' : '0')), T('minus2', '−', 'bin'), T('nine2', '9')]; // = …090909 − 9
  const R1c = [...R1b, T('eq3', '=', 'rel'), T('xR', 'x', 'var'), MINUS, NINE_R];                 // = x − 9
  const R2a = [HUN, X, EQ, T('xR', 'x', 'var'), MINUS, NINE_R];                                    // 100x = x − 9
  const NEG = T('minus', '−', 'neg');
  const R2c = [T('nn', '99'), X, EQ, NEG, NINE_R];                                                 // 99x = −9
  const R3a = [X, EQ, NEG, F('f', '9', '99')];                                                     // x = −9/99
  const R3b = [X, EQ, NEG, F('f2', '1', '11')];                                                    // x = −1/11
  return {
    states: [[R0], [R0, R1a], [R0, R1b], [R0, R1c], [R0, R1c, R2c], [R0, R1c, R2c, R3b]],
    measure: [R1c, R2a],
    steps: h => ({
      async 1(ok) { h.dimAbove(1); const row = await h.dropRow(R0, 1, h.rowAt(0)); if (!ok()) return; await h.sleep(300); if (!ok()) return; await h.sweepTen(row, ok, 'n6', R1a, HUN); },
      async 2(ok) { await h.flip(h.rowAt(1), R1b, 650); },
      async 3(ok) { await h.flip(h.rowAt(1), R1c, 650); },
      async 4(ok) {
        h.dimAbove(2);
        const row = await h.dropRow(R2a, 2, h.rowAt(1), { eq: 'eq3' }); if (!ok()) return;
        await h.sleep(500); if (!ok()) return;
        h.cancel(row, ['tenL', 'xR']); await h.sleep(900); if (!ok()) return;
        await h.flip(row, R2c, 650);
      },
      async 5(ok) {
        h.dimAbove(3);
        const row = await h.dropRow(R2c, 3, h.rowAt(2)); if (!ok()) return;
        await h.sleep(400); if (!ok()) return;
        h.cancel(row, ['nn']); await h.sleep(900); if (!ok()) return;
        await h.flip(row, R3a, 650); if (!ok()) return;
        await h.sleep(1000); if (!ok()) return;
        await h.flip(row, R3b, 650); if (!ok()) return;
        row.classList.add('final');
      },
    }),
  };
})();

/* ---------- mysterious limit: x^5 = x  ->  0 = x^5 - x = x(x^4 - 1) = x(x^2-1)(x^2+1) = x(x-1)(x+1)(x^2+1) ---------- */
EqSpecs.mystery = (() => {
  const { X, EQ } = EqTok;
  const SUP5 = T('e5', '5', 'sup'), XR = T('xR', 'x', 'var');
  const R0 = [X, SUP5, EQ, XR];                                                                     // x^5 = x
  const R1 = [T('z0', '0'), EQ, X, SUP5, T('m', '−', 'bin'), XR];                                  // 0 = x^5 − x
  const P = (k, ...toks) => [T('lp' + k, '('), ...toks, T('rp' + k, ')')];
  const xs = (k, e) => e ? [T('x' + k, 'x', 'var'), T('e' + k, e, 'sup')] : [T('x' + k, 'x', 'var')];
  const lin = (k, op, e) => P(k, ...xs(k, e), T('o' + k, op, 'bin'), T('c' + k, '1'));
  const R2a = [EQ, T('f0', 'x', 'var'), ...lin('a', '−', '4')];                                    // = x(x^4 − 1)
  const R2b = [EQ, T('f0', 'x', 'var'), ...lin('b', '−', '2'), ...lin('c', '+', '2')];             // = x(x^2 − 1)(x^2 + 1)
  const R2c = [EQ, T('f0', 'x', 'var'), ...lin('d', '−'), ...lin('e', '+'), ...lin('f', '+', '2')]; // = x(x − 1)(x + 1)(x^2 + 1)
  const fresh = row => Object.fromEntries(row.map(t => [t.id, '-']));                               // nothing flies down: the row fades in
  return {
    plain: true,
    row: 84,
    states: [[R0], [R1], [R1, R2a], [R1, R2a, R2b], [R1, R2a, R2b, R2c]],
    measure: [R1, R2c],
    steps: h => ({
      async 1(ok) { await h.flip(h.rowAt(0), R1, 800); },
      async 2(ok) { await h.dropRow(R2a, 1, h.rowAt(0), fresh(R2a), 650); },
      async 3(ok) { await h.dropRow(R2b, 2, h.rowAt(1), fresh(R2b), 650); },
      async 4(ok) { await h.dropRow(R2c, 3, h.rowAt(2), fresh(R2c), 650); },
    }),
  };
})();

const EqDecks = [...document.querySelectorAll('[data-eqsteps]')].map(sec => makeEqSteps(sec, EqSpecs[sec.dataset.eqsteps]));
const EqSteps = { forSection: sec => EqDecks.find(d => d.section === sec), forFragment: f => EqDecks.find(d => d.section.contains(f)) };
