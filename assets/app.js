// Small, progressive: everything is readable without this file.
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

// 1. Intro -> hero handoff (FLIP with 4.5s fail-safe)
const loader = $('.loader');
const heroMark = $('.hero-mark .mark');
const introStage = $('.intro-stage');

if (loader && !calm) {
  let handedOff = false;
  const handoff = () => {
    if (handedOff) return;
    handedOff = true;

    // Check if hero mark is visible on screen to FLIP onto
    if (introStage && heroMark) {
      // Pause exit animation on introStage so it doesn't vanish while FLIP runs
      try {
        const anims = introStage.getAnimations();
        for (const a of anims) {
          if (a.effect?.getTiming()?.delay >= 2000) {
            a.pause();
          }
        }
      } catch {}

      const r1 = introStage.getBoundingClientRect();
      const r2 = heroMark.getBoundingClientRect();

      if (r1.width > 0 && r2.width > 0) {
        const dx = (r2.left + r2.width / 2) - (r1.left + r1.width / 2);
        const dy = (r2.top + r2.height / 2) - (r1.top + r1.height / 2);
        const scale = r2.width / r1.width;

        // Smooth FLIP to the hero logo position
        const flip = introStage.animate([
          { transform: 'none', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 1 }
        ], { duration: 580, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' });

        // Fade the dark loader backdrop away to reveal the hero
        loader.animate([
          { backgroundColor: 'var(--color-paper-2)' },
          { backgroundColor: 'transparent' }
        ], { duration: 440, easing: 'ease-out', fill: 'forwards' });

        // Trigger orchestrated hero entrance as bird arrives
        document.documentElement.classList.add('hero-in');

        flip.finished.then(() => {
          document.documentElement.classList.remove('intro-active');
          loader.remove();
        });
        return;
      }
    }

    // Fallback if measurement unavailable
    document.documentElement.classList.add('hero-in');
    loader.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease-out' })
      .finished.then(() => {
        document.documentElement.classList.remove('intro-active');
        loader.remove();
      });
  };

  // Intro egg cracking & flap finishes at ~2320ms
  setTimeout(handoff, 2320);
  if (window.introDone) {
    window.introDone.then(handoff);
  }
  // 4.5s hard fail-safe
  setTimeout(handoff, 4500);
} else if (loader) {
  document.documentElement.classList.remove('intro-active');
  document.documentElement.classList.add('hero-in');
  loader.remove();
} else {
  document.documentElement.classList.remove('intro-active');
  document.documentElement.classList.add('hero-in');
}

// 2. The bird: pointer response & CTA happy flap
const birdLean = $('.mark-lean');
const heroEl = $('.hero');
const primaryCta = $('.hero .btn--primary');

if (birdLean && heroEl && !calm) {
  let targetRot = 0, targetX = 0, targetY = 0;
  let curRot = 0, curX = 0, curY = 0;
  let rafLean = 0;

  const updateLean = () => {
    curRot += (targetRot - curRot) * 0.08;
    curX += (targetX - curX) * 0.08;
    curY += (targetY - curY) * 0.08;
    birdLean.style.transform = `translate(${curX.toFixed(2)}px, ${curY.toFixed(2)}px) rotate(${curRot.toFixed(2)}deg)`;
    if (Math.abs(targetRot - curRot) > 0.01 || Math.abs(targetX - curX) > 0.01) {
      rafLean = requestAnimationFrame(updateLean);
    } else {
      rafLean = 0;
    }
  };

  const onPointerMove = ev => {
    const rect = heroMark ? heroMark.getBoundingClientRect() : heroEl.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight) return;
    const cx = rect.left + rect.width * 0.52;
    const cy = rect.top + rect.height * 0.48;
    const dx = Math.max(-1, Math.min(1, (ev.clientX - cx) / (window.innerWidth * 0.6)));
    const dy = Math.max(-1, Math.min(1, (ev.clientY - cy) / (window.innerHeight * 0.6)));
    targetRot = dx * 5;
    targetX = dx * 8;
    targetY = dy * 6;
    if (!rafLean) rafLean = requestAnimationFrame(updateLean);
  };

  const onPointerLeave = () => {
    targetRot = 0;
    targetX = 0;
    targetY = 0;
    if (!rafLean) rafLean = requestAnimationFrame(updateLean);
  };

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('mouseleave', onPointerLeave);

  // Faster happy flap on hover/focus of primary CTA
  if (primaryCta) {
    const markWrap = $('.hero-mark');
    const setHappy = on => markWrap?.classList.toggle('is-happy', on);
    primaryCta.addEventListener('mouseenter', () => setHappy(true));
    primaryCta.addEventListener('mouseleave', () => setHappy(false));
    primaryCta.addEventListener('focusin', () => setHappy(true));
    primaryCta.addEventListener('focusout', () => setHappy(false));
  }
}

// 3. Embers: slow warm sparks rising from nest with pointer drift & pause
const canvas = $('.embers');
if (canvas && !calm) {
  const ctx = canvas.getContext('2d');
  const tones = ['230,160,111', '245,178,107', '247,206,124', '224,140,105', '255,248,238'];
  let w = 0, h = 0, dpr = 1, parts = [], run = false, raf = 0, last = 0, seen = false;
  let mouseX = -9999, mouseY = -9999;

  const size = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(devicePixelRatio || 1, 2);
    w = r.width;
    h = r.height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  };

  // Tune spawn specifically to rise from the woven nest in the lower-middle
  const spark = aged => {
    const life = 5.5 + Math.random() * 5.5;
    return {
      life,
      age: aged ? Math.random() * life : 0,
      x: w * (0.5 + (Math.random() - 0.5) * 0.36),
      y: h * (0.74 + (Math.random() - 0.5) * 0.12),
      vx: 0,
      vy: -(12 + Math.random() * 14),
      sway: 8 + Math.random() * 16,
      f: 0.4 + Math.random() * 0.5,
      ph: Math.random() * 6.28,
      r: 0.9 + Math.random() * 1.5,
      a: 0.5 + Math.random() * 0.4,
      c: tones[Math.random() < 0.15 ? 4 : Math.floor(Math.random() * 4)]
    };
  };

  const frame = now => {
    if (!run) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    parts.forEach((p, i) => {
      p.age += dt;
      if (p.age >= p.life) { parts[i] = spark(false); return; }

      // Subtle pointer drift away from cursor
      const dist = Math.hypot(p.x - mouseX, p.y - mouseY);
      if (dist < 130 && dist > 1) {
        const repel = (1 - dist / 130) * 32 * dt;
        p.vx += ((p.x - mouseX) / dist) * repel;
      }
      p.vx *= 0.96; // dampening
      p.x += p.vx;

      const t = p.age / p.life;
      const alpha = p.a * Math.min(t / 0.15, 1) * (t > 0.45 ? 1 - (t - 0.45) / 0.55 : 1);
      const x = p.x + Math.sin(p.age * p.f + p.ph) * p.sway;
      const y = p.y + p.vy * p.age;
      const rad = p.r * (1 - t * 0.42) * 3;

      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, `rgba(${p.c},${alpha})`);
      g.addColorStop(1, `rgba(${p.c},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, 6.28);
      ctx.fill();
    });

    raf = requestAnimationFrame(frame);
  };

  const update = () => {
    const go = seen && !document.hidden;
    if (go && !run) { run = true; last = performance.now(); raf = requestAnimationFrame(frame); }
    else if (!go && run) { run = false; cancelAnimationFrame(raf); }
  };

  window.addEventListener('pointermove', ev => {
    const r = canvas.getBoundingClientRect();
    mouseX = ev.clientX - r.left;
    mouseY = ev.clientY - r.top;
  }, { passive: true });

  size();
  parts = Array.from({ length: w < 600 ? 24 : 52 }, () => spark(true));
  addEventListener('resize', size, { passive: true });
  document.addEventListener('visibilitychange', update);
  new IntersectionObserver(([en]) => { seen = en.isIntersecting; update(); }).observe(canvas);
}

// 4. Team section (pinned): stageshow framing with camera zoom per step
const steps = $$('.pstep');
const frames = $$('.pframe');
if (steps.length && frames.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (!en.isIntersecting) return;
    const stepIdx = en.target.dataset.step;
    frames.forEach(f => {
      const active = f.dataset.frame === stepIdx;
      f.classList.toggle('is-on', active);
    });
  }), { rootMargin: '-40% 0px -40% 0px' });
  steps.forEach(s => io.observe(s));
}

// 5. Claude map: draw-on once on entrance & node hover highlight
const mapWrap = $('.map-wrap');
const mapEl = $('.map');
if (mapEl && 'IntersectionObserver' in window) {
  const mapObserver = new IntersectionObserver(([en]) => {
    if (en.isIntersecting) {
      mapEl.classList.add('is-drawn');
      mapObserver.unobserve(en.target);
    }
  }, { threshold: 0.25 });
  mapObserver.observe(mapWrap || mapEl);

  // Hover node to highlight matching edge
  const nodes = $$('.map-node', mapEl);
  const edges = $$('.map-edges path', mapEl);
  nodes.forEach(node => {
    const key = node.dataset.node;
    const setHighlight = on => {
      if (key === 'core') {
        edges.forEach(e => e.classList.toggle('is-highlight', on));
      } else {
        const edge = $(`[data-edge="${key}"]`, mapEl);
        edge?.classList.toggle('is-highlight', on);
      }
    };
    node.addEventListener('mouseenter', () => setHighlight(true));
    node.addEventListener('mouseleave', () => setHighlight(false));
    node.addEventListener('focus', () => setHighlight(true));
    node.addEventListener('blur', () => setHighlight(false));
  });
}

// 6. Rail of screens: drag-to-scroll with inertia, arrow navigation, center scale
const rail = $('.rail');
if (rail) {
  let isDown = false, startX = 0, scrollStart = 0, vel = 0, lastX = 0, lastT = 0, rafInertia = 0;

  rail.addEventListener('mousedown', e => {
    // Only primary button
    if (e.button !== 0) return;
    isDown = true;
    rail.classList.add('is-dragging');
    startX = e.pageX;
    lastX = e.pageX;
    scrollStart = rail.scrollLeft;
    lastT = performance.now();
    vel = 0;
    cancelAnimationFrame(rafInertia);
  });

  window.addEventListener('mousemove', e => {
    if (!isDown) return;
    const now = performance.now();
    const dt = Math.max(now - lastT, 1);
    const dx = e.pageX - lastX;
    vel = dx / dt;
    lastX = e.pageX;
    lastT = now;
    rail.scrollLeft = scrollStart - (e.pageX - startX);
  });

  const endDrag = () => {
    if (!isDown) return;
    isDown = false;
    rail.classList.remove('is-dragging');
    if (Math.abs(vel) > 0.08 && !calm) {
      let momentum = -vel * 260;
      const step = () => {
        if (Math.abs(momentum) < 0.5) return;
        rail.scrollLeft += momentum * 0.08;
        momentum *= 0.92;
        rafInertia = requestAnimationFrame(step);
      };
      rafInertia = requestAnimationFrame(step);
    }
  };
  window.addEventListener('mouseup', endDrag);

  // Keyboard navigation
  rail.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const isRtl = document.documentElement.dir === 'rtl';
      // In RTL: ArrowRight goes backward, ArrowLeft goes forward
      const dir = (e.key === 'ArrowLeft') ? (isRtl ? -1 : 1) : (isRtl ? 1 : -1);
      rail.scrollBy({ left: rail.offsetWidth * 0.42 * dir, behavior: 'smooth' });
    }
  });

  // Parallax / subtle scale of nearest center item
  const updateCenterScale = () => {
    if (calm) return;
    const rBox = rail.getBoundingClientRect();
    const center = rBox.left + rBox.width / 2;
    const items = $$('li', rail);
    items.forEach(li => {
      const r = li.getBoundingClientRect();
      const itemCenter = r.left + r.width / 2;
      const dist = Math.abs(center - itemCenter);
      const maxDist = rBox.width * 0.6;
      const t = Math.max(0, 1 - dist / maxDist);
      const scale = 0.96 + t * 0.07;
      const opacity = 0.86 + t * 0.14;
      li.style.transform = `scale(${scale.toFixed(3)})`;
      li.style.opacity = opacity.toFixed(2);
    });
  };
  rail.addEventListener('scroll', () => requestAnimationFrame(updateCenterScale), { passive: true });
  updateCenterScale();
}

// 7. Microinteractions: OS tabs sliding indicator & copy button check morph
$$('.install').forEach(box => {
  const code = $('code', box);
  const tabs = $$('[role="tab"]', box);
  const copyBtn = $('.copy', box);
  const copyLabel = $('.copy-lbl', box);
  const seg = $('.seg', box);
  const segIndicator = $('.seg-indicator', box);

  const updateTabIndicator = target => {
    if (!segIndicator || !target || !seg) return;
    const offset = target.offsetLeft;
    const width = target.offsetWidth;
    segIndicator.style.transform = `translateX(${offset}px) scaleX(${width / 80})`;
  };

  const pick = t => {
    tabs.forEach(x => {
      const on = x === t;
      x.setAttribute('aria-selected', on);
      x.tabIndex = on ? 0 : -1;
    });
    code.textContent = t.dataset.cmd;
    updateTabIndicator(t);
  };

  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(t));
    t.addEventListener('keydown', ev => {
      const step = { ArrowLeft: 1, ArrowRight: -1 }[ev.key]; // RTL
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      pick(next);
      next.focus();
    });
  });

  // Initial tab position
  const activeTab = $('[role="tab"][aria-selected="true"]', box) || tabs[0];
  if (activeTab) updateTabIndicator(activeTab);

  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        copyBtn.dataset.state = 'copied';
        if (copyLabel) copyLabel.textContent = 'کپی شد';
      } catch {
        if (copyLabel) copyLabel.textContent = 'نشد؛ دستی کپی کن';
      }
      setTimeout(() => {
        delete copyBtn.dataset.state;
        if (copyLabel) copyLabel.textContent = 'کپی';
      }, 2500);
    });
  }
});

// 8. Nav scroll-spy with sliding underline
const nav = $('.bar nav');
const navThumb = $('.nav-thumb', nav);
if (nav && navThumb) {
  const navLinks = $$('a[href^="index.html#"]', nav);
  const sections = navLinks.map(a => {
    const id = a.getAttribute('href').replace('index.html#', '');
    return { el: document.getElementById(id), link: a };
  }).filter(s => s.el);

  let activeLink = null;
  const setNavThumb = link => {
    if (!link) {
      navThumb.style.opacity = '0';
      return;
    }
    navThumb.style.opacity = '1';
    navThumb.style.transform = `translateX(${link.offsetLeft}px) scaleX(${link.offsetWidth / 40})`;
  };

  if ('IntersectionObserver' in window && sections.length) {
    const spy = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const match = sections.find(s => s.el === entry.target);
          if (match) {
            navLinks.forEach(l => l.removeAttribute('aria-current'));
            match.link.setAttribute('aria-current', 'true');
            activeLink = match.link;
            setNavThumb(activeLink);
          }
        }
      });
      // Hide if above first section
      const topSection = sections[0].el;
      if (topSection && topSection.getBoundingClientRect().top > window.innerHeight * 0.7) {
        navLinks.forEach(l => l.removeAttribute('aria-current'));
        activeLink = null;
        setNavThumb(null);
      }
    }, { rootMargin: '-20% 0px -60% 0px' });
    sections.forEach(s => spy.observe(s.el));
  }

  const pageCurrent = $('a[aria-current="page"]', nav);
  if (pageCurrent) {
    activeLink = pageCurrent;
    setNavThumb(activeLink);
  }

  $$('a', nav).forEach(l => {
    l.addEventListener('mouseenter', () => setNavThumb(l));
    l.addEventListener('mouseleave', () => setNavThumb(activeLink));
  });
}

// 9. Scroll progress spine fallback if animation-timeline is unsupported
const spine = $('.spine');
if (spine && !CSS.supports('animation-timeline: scroll()') && !calm) {
  const updateSpine = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    const progress = Math.min(1, Math.max(0, window.scrollY / max));
    spine.style.setProperty('--spine-p', progress.toFixed(3));
  };
  window.addEventListener('scroll', updateSpine, { passive: true });
  updateSpine();
}

// 10. Live «مسیر تا هدف» flow: entrance draw-in, offscreen pause, glide to current work
const livePlans = $$('.plan-live');
if (livePlans.length && 'IntersectionObserver' in window) {
  const planObserver = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const el = en.target;
      if (en.isIntersecting) {
        el.classList.add('is-drawn');
        $$('.flow-dash', el).forEach(d => { d.style.animationPlayState = 'running'; });
        $$('.is-jiggling', el).forEach(j => { j.style.animationPlayState = 'running'; });

        // Glide over what's done to where the work is now (first appearance)
        const scroller = $('.flow-scroller', el);
        if (scroller && !scroller.dataset.scrolled && !calm) {
          scroller.dataset.scrolled = 'true';
          setTimeout(() => {
            const maxScroll = scroller.scrollWidth - scroller.clientWidth;
            if (maxScroll > 0) {
              scroller.scrollTo({ left: -120, behavior: 'smooth' });
            }
          }, 800);
        }
      } else {
        // Pause animations when offscreen to preserve resources
        $$('.flow-dash', el).forEach(d => { d.style.animationPlayState = 'paused'; });
        $$('.is-jiggling', el).forEach(j => { j.style.animationPlayState = 'paused'; });
      }
    });
  }, { threshold: 0.15 });

  livePlans.forEach(p => planObserver.observe(p));

  // Node chain hover interaction: hover a task to illuminate its stage links
  livePlans.forEach(plan => {
    const nodes = $$('.task-node', plan);
    const edges = $$('.flow-edge', plan);
    nodes.forEach(node => {
      const stage = node.dataset.stage;
      const setChainHighlight = on => {
        edges.forEach(edge => {
          if (edge.dataset.stage === stage) {
            edge.style.opacity = on ? '1' : '';
            edge.style.strokeWidth = on ? '3.5px' : '';
          } else {
            edge.style.opacity = on ? '0.2' : '';
          }
        });
      };
      node.addEventListener('mouseenter', () => setChainHighlight(true));
      node.addEventListener('mouseleave', () => setChainHighlight(false));
      node.addEventListener('focus', () => setChainHighlight(true));
      node.addEventListener('blur', () => setChainHighlight(false));
    });
  });
}

// Live version badge: read tag_name from the latest GitHub release (the owner asked not to hard-code it)
(() => {
  const el = document.querySelector('[data-latest]:not([data-latest=""])');
  if (!el) return;
  fetch(el.dataset.latest).then(r => r.ok ? r.json() : null).then(j => {
    if (j?.tag_name) el.textContent = j.tag_name.replace(/^v/, '').replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  }).catch(() => {});
})();

// Live calendar / person page: reveal once in view, numbers count up
(() => {
  const els = document.querySelectorAll('.live-ui');
  if (!els.length) return;
  const fa = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const calm = !document.documentElement.classList.contains('m');
  const run = el => {
    el.classList.add('is-drawn');
    if (calm) return;
    el.querySelectorAll('.count[data-to]').forEach(b => {
      const to = +b.dataset.to, pct = 'pct' in b.dataset, t0 = performance.now();
      const step = now => {
        const p = Math.min(1, (now - t0) / 900), v = Math.round(to * (1 - (1 - p) ** 3));
        b.textContent = (pct ? '٪' : '') + fa(v);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  };
  if (!('IntersectionObserver' in window)) return els.forEach(run);
  const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { run(en.target); io.unobserve(en.target); } }), { threshold: 0.25 });
  els.forEach(el => io.observe(el));
})();
