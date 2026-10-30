/* Slide 2: the digits of pi copy down a row, then pull apart into the expanded sum.
   Both lines run off the right edge of the slide (the section clips them). */
const PiExpand = (() => {
  const section = document.querySelector('[data-pi-slide]');
  const box = document.getElementById('pi-expand');
  const trigger = section.querySelector('[data-pi-go]');
  const PI = '31415926535897932384626433832795028841971693993751058209749445923078164062862089986280348253421170679';
  const N = 60;                                   // digits shown; well past the right edge
  const digits = PI.slice(0, N).split('');
  const DUR = 2200;
  let running = [], clones = [];

  const katexOpts = { displayMode: true, throwOnError: false, strict: false, trust: ctx => ctx.command === '\\htmlClass' };

  function tex() {
    const l1 = digits.map((d, i) => i === 0 ? `\\htmlClass{src0}{3}\\htmlClass{srcdot}{.}` : `\\htmlClass{src${i}}{${d}}`).join('');
    const l2 = '{}= ' + digits.map((d, i) => i === 0 ? `\\htmlClass{dst0}{3}` : ` + \\htmlClass{dst${i}}{${d}}\\tfrac{1}{10${i > 1 ? `^{${i}}` : ''}}`).join('');
    return `\\begin{aligned} \\pi &= \\htmlClass{line1}{${l1}} \\\\[.35em] &\\htmlClass{line2}{${l2}} \\end{aligned}`;
  }
  katex.render(tex(), box, katexOpts);
  digits.forEach((_, i) => { box.querySelector('.src' + i).classList.add('vas'); box.querySelector('.dst' + i).classList.add('vas'); });
  box.querySelector('.srcdot').classList.add('vas');
  const dsts = digits.map((_, i) => box.querySelector('.dst' + i));
  const line2 = box.querySelector('.line2');

  function clear() {
    running.forEach(a => a.cancel()); running = [];
    clones.forEach(c => c.remove()); clones = [];
    dsts.forEach(d => d.style.visibility = '');
    line2.style.opacity = '';
  }
  function reset() { clear(); box.classList.add('hidden2'); }
  function showDone() { clear(); box.classList.remove('hidden2'); }

  function play() {
    clear();
    const scale = Reveal.getScale();
    const boxRect = box.getBoundingClientRect();
    const mk = (srcEl, dstRect, text, fadeOut) => {
      const sr = srcEl.getBoundingClientRect();
      const clone = document.createElement('span');
      clone.className = 'pi-clone vas';
      clone.textContent = text;
      const cs = getComputedStyle(srcEl);
      clone.style.fontSize = cs.fontSize; clone.style.lineHeight = cs.lineHeight;
      clone.style.left = (sr.left - boxRect.left) / scale + 'px';
      clone.style.top = (sr.top - boxRect.top) / scale + 'px';
      box.appendChild(clone); clones.push(clone);
      const dy = (dstRect.top - sr.top) / scale, dx = (dstRect.left - sr.left) / scale;
      const frames = fadeOut
        ? [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(0,${dy}px)`, opacity: 1, offset: .4 }, { transform: `translate(0,${dy}px)`, opacity: 1, offset: .5 }, { transform: `translate(0,${dy}px)`, opacity: 0, offset: .7 }, { transform: `translate(0,${dy}px)`, opacity: 0 }]
        : [{ transform: 'translate(0,0)' }, { transform: `translate(0,${dy}px)`, offset: .4 }, { transform: `translate(0,${dy}px)`, offset: .5 }, { transform: `translate(${dx}px,${dy}px)` }];
      running.push(clone.animate(frames, { duration: DUR, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' }));
    };
    dsts.forEach(d => d.style.visibility = 'hidden');      // the real digits stay hidden while the clones travel
    box.classList.remove('hidden2');
    line2.style.opacity = '0';
    running.push(line2.animate([{ opacity: 0 }, { opacity: 0, offset: .5 }, { opacity: 1 }], { duration: DUR, fill: 'forwards' }));
    digits.forEach((d, i) => mk(box.querySelector('.src' + i), dsts[i].getBoundingClientRect(), d, false));
    mk(box.querySelector('.srcdot'), dsts[0].getBoundingClientRect(), '.', true);   // the decimal point rides along, then fades
    running[1].onfinish = () => { if (running.length) showDone(); };
  }

  function sync() { trigger.classList.contains('visible') ? showDone() : reset(); }

  return { section, play, reset, sync };
})();
