// Small, progressive: everything is readable without this file.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Intro: the app's hatching animation (site-provided, sets window.introDone); never holds the page past 4.5s
const loader = $('.loader');
if (loader) {
  Promise.race([window.introDone ?? Promise.resolve(), new Promise(r => setTimeout(r, 4500))]).then(() => {
    loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'ease-out' }).finished.then(() => loader.remove());
  });
}

// Team: the panel nearest the middle of the screen picks the held screenshot
const steps = $$('.pstep');
if (steps.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    $$('.pframe').forEach(f => f.classList.toggle('is-on', f.dataset.frame === en.target.dataset.step));
  }), { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => io.observe(s));
}

// Install: the OS tabs swap the command (arrow keys move between them); copy puts it on the clipboard
$$('.install').forEach(box => {
  const code = $('code', box), tabs = $$('[role="tab"]', box), label = $('.copy span', box);
  const pick = t => { tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; }); code.textContent = t.dataset.cmd; };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(t));
    t.addEventListener('keydown', ev => {
      const step = { ArrowLeft: 1, ArrowRight: -1 }[ev.key]; // RTL: left moves forward
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length]; pick(next); next.focus();
    });
  });
  $('.copy', box).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(code.textContent); label.textContent = 'کپی شد'; }
    catch { label.textContent = 'نشد؛ دستی کپی کن'; }
    setTimeout(() => (label.textContent = 'کپی'), 1800);
  });
});

// Embers: slow warm sparks rising from the nest behind the mark; off with reduced motion, paused off-screen
const canvas = $('.embers');
if (canvas && !calm) {
  const ctx = canvas.getContext('2d');
  const tones = ['230,160,111', '245,178,107', '247,206,124', '224,140,105', '255,248,238'];
  let w = 0, h = 0, dpr = 1, parts = [], run = false, raf = 0, last = 0, seen = false;
  const size = () => { const r = canvas.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 2); w = r.width; h = r.height; canvas.width = w * dpr; canvas.height = h * dpr; };
  const spark = (aged) => {
    const life = 6 + Math.random() * 6;
    return { life, age: aged ? Math.random() * life : 0, x: w * (0.5 + (Math.random() - 0.5) * 0.5), y: h * (0.72 + Math.random() * 0.2),
      vy: -(14 + Math.random() * 16), sway: 10 + Math.random() * 20, f: 0.5 + Math.random() * 0.6, ph: Math.random() * 6.28,
      r: 0.9 + Math.random() * 1.5, a: 0.55 + Math.random() * 0.4, c: tones[Math.random() < 0.15 ? 4 : Math.floor(Math.random() * 4)] };
  };
  const frame = now => {
    if (!run) return;
    const dt = Math.min((now - last) / 1000, 0.1); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h); ctx.globalCompositeOperation = 'lighter';
    parts.forEach((p, i) => {
      p.age += dt;
      if (p.age >= p.life) { parts[i] = spark(false); return; }
      const t = p.age / p.life, alpha = p.a * Math.min(t / 0.15, 1) * (t > 0.45 ? 1 - (t - 0.45) / 0.55 : 1);
      const x = p.x + Math.sin(p.age * p.f + p.ph) * p.sway, y = p.y + p.vy * p.age, rad = p.r * (1 - t * 0.45) * 3;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${p.c},${alpha})`); g.addColorStop(1, `rgba(${p.c},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.28); ctx.fill();
    });
    raf = requestAnimationFrame(frame);
  };
  const update = () => {
    const go = seen && !document.hidden;
    if (go && !run) { run = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!go && run) { run = false; cancelAnimationFrame(raf); }
  };
  size(); parts = Array.from({ length: w < 600 ? 26 : 56 }, () => spark(true));
  addEventListener('resize', size, { passive: true });
  document.addEventListener('visibilitychange', update);
  new IntersectionObserver(([en]) => { seen = en.isIntersecting; update(); }).observe(canvas);
}
