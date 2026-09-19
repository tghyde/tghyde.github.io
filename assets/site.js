/* Theme toggle, sticky bar, and table-of-contents behaviour (after hwGenie). */

// Light/dark toggle. A saved choice is applied before first paint by the
// inline script in <head>; without one the CSS follows the system setting.
(function () {
  var b = document.getElementById("themetoggle");
  if (!b) return;
  function effective() {
    var a = document.documentElement.getAttribute("data-theme");
    if (a) return a;
    return window.matchMedia &&
      matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function icon() { b.textContent = effective() === "dark" ? "☀" : "☾"; }
  b.addEventListener("click", function () {
    var next = effective() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("th-theme", next); } catch (e) {}
    icon();
  });
  if (window.matchMedia) {
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", icon);
  }
  icon();
})();

// Sticky bar that slides in once the reader has scrolled past the header.
(function () {
  var bar = document.getElementById("scrollnav");
  if (!bar) return;
  var shown = false;
  window.addEventListener("scroll", function () {
    var want = window.scrollY > 350;
    if (want !== shown) {
      shown = want;
      bar.classList.toggle("visible", want);
    }
  }, { passive: true });
  bar.addEventListener("click", function (ev) {
    var a = ev.target.closest("a");
    if (!a) return;
    if (a.getAttribute("href") === "#top") {
      ev.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });
})();

// Table of contents: open/close on narrow screens, scroll-spy highlighting.
(function () {
  var toc = document.getElementById("toc");
  if (!toc) return;
  var bar = document.getElementById("scrollnav");
  var btn = bar ? bar.querySelector(".sb-toc") : null;
  var wide = window.matchMedia ? matchMedia("(min-width: 78rem)") : null;
  var links = Array.prototype.slice.call(toc.querySelectorAll("a[href^='#']"));
  var targets = links.map(function (a) {
    return document.getElementById(a.getAttribute("href").slice(1));
  });

  function setOpen(want) {
    toc.classList.toggle("open", want);
    if (btn) btn.setAttribute("aria-expanded", want ? "true" : "false");
    if (want && bar) toc.style.top = bar.offsetHeight + "px";
  }
  if (btn) {
    btn.addEventListener("click", function (ev) {
      ev.stopPropagation();
      setOpen(!toc.classList.contains("open"));
    });
  }
  toc.addEventListener("click", function (ev) {
    if (ev.target.closest("a")) setOpen(false);
  });
  document.addEventListener("click", function (ev) {
    if (toc.classList.contains("open") && !toc.contains(ev.target)) setOpen(false);
  });
  document.addEventListener("keydown", function (ev) {
    if (ev.key === "Escape") setOpen(false);
  });
  window.addEventListener("resize", function () { setOpen(false); });

  var current = -1;
  function spy() {
    if (bar && toc.classList.contains("open") && !bar.classList.contains("visible")) {
      setOpen(false);
    }
    var limit = 90, idx = -1;
    for (var i = 0; i < targets.length; i++) {
      if (targets[i] && targets[i].getBoundingClientRect().top <= limit) idx = i;
    }
    if (targets.length &&
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 2) {
      idx = targets.length - 1;
    }
    if (idx === current) return;
    current = idx;
    links.forEach(function (a, i) {
      a.classList.toggle("active", i === idx);
      if (i === idx) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    if (idx >= 0 && wide && wide.matches) {
      var a = links[idx], top = a.offsetTop, bottom = top + a.offsetHeight;
      if (top < toc.scrollTop) toc.scrollTop = top - 8;
      else if (bottom > toc.scrollTop + toc.clientHeight) {
        toc.scrollTop = bottom - toc.clientHeight + 8;
      }
    }
  }
  var pending = false;
  window.addEventListener("scroll", function () {
    if (pending) return;
    pending = true;
    requestAnimationFrame(function () { pending = false; spy(); });
  }, { passive: true });
  window.addEventListener("load", spy);
  spy();
})();
