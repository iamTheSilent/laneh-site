// «آشیانهٔ نور» — The Living Hatchery (Tactile Nest & Ambient Dawn)
// Progressive enhancement: core interactions (drawer, tabs, copy, gallery, step observer)
// work without GSAP; GSAP and Lenis provide fluid motion and ambient physics.

const html = document.documentElement;
const motionOn = html.classList.contains('m');
const rtl = document.dir === 'rtl';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

// 1. Mobile Drawer Navigation
const navToggle = $('#nav-toggle');
const navDrawer = $('#nav-drawer');
const navBackdrop = $('#nav-backdrop');

function setDrawer(open) {
  if (!navToggle || !navDrawer) return;
  const isOpen = typeof open === 'boolean' ? open : !navDrawer.classList.contains('is-open');
  navDrawer.classList.toggle('is-open', isOpen);
  navBackdrop?.classList.toggle('is-open', isOpen);
  navToggle.classList.toggle('is-active', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
}

if (navToggle) {
  navToggle.addEventListener('click', () => setDrawer());
  navBackdrop?.addEventListener('click', () => setDrawer(false));
  $$('.drawer-link, .drawer-cta').forEach(link => {
    link.addEventListener('click', () => setDrawer(false));
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && navDrawer?.classList.contains('is-open')) setDrawer(false);
  });
}

// 2. Ambient Hero Embers (Slow, elegant glowing sparks behind hero logo)
function initHeroEmbers() {
  const canvas = document.querySelector('.hero-embers');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotionQuery.matches) return;

  let width = 0;
  let height = 0;
  let dpr = 1;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  const heroBg = canvas.closest('.hero-bg') || canvas.parentElement;
  if (window.ResizeObserver && heroBg) {
    new ResizeObserver(() => resize()).observe(heroBg);
  }

  // Warm glowing embers palette: peach (#E6A06F), amber, soft gold, and near-white core
  const palette = [
    [230, 160, 111], // Peach (#E6A06F)
    [245, 178, 107], // Amber
    [247, 206, 124], // Soft gold
    [224, 140, 105], // Clay / warm terracotta
    [255, 192, 138], // Warm fledgling glow
  ];

  function createParticle(randomizeAge = false) {
    const isCore = Math.random() < 0.15; // ~15% near-white cores
    const rgb = isCore ? [255, 248, 238] : palette[Math.floor(Math.random() * palette.length)];
    const life = 6 + Math.random() * 6; // 6 - 12 seconds
    const age = randomizeAge ? Math.random() * life : 0;

    // Spawn mostly lower-middle (nest area around logo), some across bottom
    let baseX, spawnY;
    if (Math.random() < 0.72) {
      baseX = width * 0.5 + (Math.random() - 0.5) * Math.min(width * 0.42, 340);
      spawnY = height * (0.70 + Math.random() * 0.24);
    } else {
      baseX = width * (0.08 + Math.random() * 0.84);
      spawnY = height * (0.80 + Math.random() * 0.18);
    }

    const vy = -(16 + Math.random() * 16); // Rise slowly: 16 - 32 px/sec
    const driftX = (Math.random() - 0.5) * 6; // Very slight horizontal drift
    const swayAmp = 12 + Math.random() * 18; // 12 - 30 px sway
    const swayFreq = 0.5 + Math.random() * 0.6; // Gentle sway period
    const swayPhase = Math.random() * Math.PI * 2;
    const flickerFreq = 1.8 + Math.random() * 2.2;
    const flickerPhase = Math.random() * Math.PI * 2;
    const baseRadius = 0.9 + Math.random() * 1.5; // Tiny sparks: ~0.9 - 2.4 px
    const baseAlpha = isCore ? (0.75 + Math.random() * 0.25) : (0.55 + Math.random() * 0.35);

    return {
      isCore,
      rgb,
      life,
      age,
      baseX,
      spawnY,
      vy,
      driftX,
      swayAmp,
      swayFreq,
      swayPhase,
      flickerFreq,
      flickerPhase,
      baseRadius,
      baseAlpha,
    };
  }

  function getTargetCount() {
    return (width && width < 768) ? 26 : 56;
  }

  let particles = [];
  function initParticles() {
    const count = getTargetCount();
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push(createParticle(true));
    }
  }
  initParticles();

  let isVisible = false;
  let isTabVisible = !document.hidden;
  let isRunning = false;
  let animId = null;
  let lastTime = 0;

  function render(now) {
    if (!isRunning) return;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    const targetCount = getTargetCount();
    while (particles.length < targetCount) particles.push(createParticle(false));
    if (particles.length > targetCount && Math.random() < 0.05) particles.pop();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        particles[i] = createParticle(false);
        continue;
      }

      const progress = p.age / p.life;
      const fadeIn = Math.min(progress / 0.15, 1);
      const fadeOut = progress > 0.45 ? Math.max(0, 1 - (progress - 0.45) / 0.55) : 1;
      const flicker = 0.85 + 0.15 * Math.sin(p.age * p.flickerFreq + p.flickerPhase);
      const alpha = p.baseAlpha * fadeIn * fadeOut * flicker;

      const radius = Math.max(0.4, p.baseRadius * (1 - progress * 0.45));
      const y = p.spawnY + p.vy * p.age;
      const sway = Math.sin(p.age * p.swayFreq + p.swayPhase) * p.swayAmp;
      const x = p.baseX + p.driftX * p.age + sway;

      if (y < -30) {
        particles[i] = createParticle(false);
        continue;
      }

      if (alpha <= 0.01) continue;

      const [r, g, b] = p.rgb;
      const glowRadius = radius * (p.isCore ? 3.8 : 3.0);

      const grad = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`);
      grad.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, ${(alpha * 0.5).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      if (p.isCore && alpha > 0.25) {
        ctx.fillStyle = `rgba(255, 255, 255, ${(alpha * 0.9).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, radius * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    animId = requestAnimationFrame(render);
  }

  function updateState() {
    const shouldRun = isVisible && isTabVisible && !reducedMotionQuery.matches;
    if (shouldRun && !isRunning) {
      isRunning = true;
      lastTime = performance.now();
      animId = requestAnimationFrame(render);
    } else if (!shouldRun && isRunning) {
      isRunning = false;
      if (animId) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    }
  }

  document.addEventListener('visibilitychange', () => {
    isTabVisible = !document.hidden;
    updateState();
  });

  reducedMotionQuery.addEventListener?.('change', () => {
    if (reducedMotionQuery.matches) {
      ctx.clearRect(0, 0, width, height);
    }
    updateState();
  });

  const heroSection = canvas.closest('.hero') || canvas.closest('.hero-header') || canvas.parentElement;
  if ('IntersectionObserver' in window && heroSection) {
    const observer = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      updateState();
    }, { threshold: 0.05 });
    observer.observe(heroSection);
  } else {
    isVisible = true;
    updateState();
  }
}

initHeroEmbers();

// Video Performance Safeguard (pause video when off-screen if video exists)
const heroVideo = $('.hero-video');
if (heroVideo && 'IntersectionObserver' in window) {
  const vObs = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      heroVideo.play().catch(() => {});
    } else {
      heroVideo.pause();
    }
  }, { threshold: 0.1 });
  vObs.observe(heroVideo);
}

// 3. Team Story Synchronized Dual-Precision Stage
const steps = $$('.step');
const stage = $('.story-stage');
const desktopScreens = $$('.stage-screen-desktop');
const phoneScreens = $$('.stage-screen-phone');

if (steps.length && 'IntersectionObserver' in window) {
  const stepObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const target = entry.target;
      const stepIdx = target.dataset.step;
      const device = target.dataset.device || 'desktop';

      // Highlight active narrative step
      steps.forEach(s => s.classList.toggle('on', s === target));

      if (stage) {
        if (device === 'phone') {
          stage.classList.add('focus-phone');
          stage.classList.remove('focus-desktop');
          phoneScreens.forEach(f => f.classList.toggle('on', f.dataset.step === stepIdx));
        } else {
          stage.classList.add('focus-desktop');
          stage.classList.remove('focus-phone');
          desktopScreens.forEach(f => f.classList.toggle('on', f.dataset.step === stepIdx));
        }
      }
    });
  }, { rootMargin: '-35% 0px -35% 0px' });

  steps.forEach(s => stepObs.observe(s));
  // Default stage focus on initial desktop step
  stage?.classList.add('focus-desktop');
}

// 4. Orthogonal Screenshot Gallery (Horizontal drag & navigation buttons)
const galleryTrack = $('.gallery-track');
const prevBtn = $('.gallery-btn.prev');
const nextBtn = $('.gallery-btn.next');

if (galleryTrack) {
  let isDown = false;
  let startX = 0;
  let scrollLeftPos = 0;

  galleryTrack.addEventListener('mousedown', e => {
    isDown = true;
    startX = e.pageX - galleryTrack.offsetLeft;
    scrollLeftPos = galleryTrack.scrollLeft;
  });
  window.addEventListener('mouseup', () => { isDown = false; });
  galleryTrack.addEventListener('mouseleave', () => { isDown = false; });
  galleryTrack.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - galleryTrack.offsetLeft;
    const walk = (x - startX) * 1.5;
    galleryTrack.scrollLeft = scrollLeftPos - walk;
  });

  const scrollByAmount = (amount) => {
    galleryTrack.scrollBy({ left: amount, behavior: 'smooth' });
  };
  prevBtn?.addEventListener('click', () => scrollByAmount(rtl ? 340 : -340));
  nextBtn?.addEventListener('click', () => scrollByAmount(rtl ? -340 : 340));
}

// 5. Claude Spotlight (Interactive Prompt Chips, 1-Click Install, Copy)
const promptChips = $$('.prompt-chip');
const spotShots = $$('.spot-shot-wrap');

promptChips.forEach(chip => {
  chip.addEventListener('click', () => {
    promptChips.forEach(c => c.classList.toggle('on', c === chip));
    const idx = parseInt(chip.dataset.promptIdx || '0', 10);
    // Alternate screenshot focus based on prompt
    spotShots.forEach((s, sIdx) => {
      s.classList.toggle('on', sIdx === (idx % spotShots.length));
    });
  });
});

$$('.install').forEach(box => {
  const code = $('code', box);
  const copyBtn = $('.copy', box);
  const copyLabel = $('span', copyBtn);
  const tabs = $$('.tabs button', box);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.classList.toggle('on', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      if (code && tab.dataset.cmd) {
        code.textContent = tab.dataset.cmd;
      }
    });
  });

  copyBtn?.addEventListener('click', async () => {
    const text = code ? code.textContent : '';
    try {
      await navigator.clipboard.writeText(text);
      if (copyLabel) copyLabel.textContent = 'کپی شد';
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (copyLabel) copyLabel.textContent = 'کپی شد';
    }
    setTimeout(() => {
      if (copyLabel) copyLabel.textContent = 'کپی';
    }, 2000);
  });
});

// If motion is disabled or libraries didn't load, reveal content immediately
if (!motionOn || !window.gsap || !window.ScrollTrigger) {
  html.classList.remove('m');
  $('.loader')?.remove();
} else {
  initMotion();
}

function initMotion() {
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });

  // Smooth Scrolling with Lenis
  const lenis = window.Lenis ? new Lenis({
    lerp: 0.082,
    wheelMultiplier: 0.95,
    smoothTouch: false,
  }) : null;

  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // Smooth scroll for anchor links
  const normalizePath = p => p.replace(/index\.html$/, '');
  $$('a[href*="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = a.hash && normalizePath(a.pathname) === normalizePath(location.pathname) && $(a.hash);
      if (!target) return;
      e.preventDefault();
      if (lenis) {
        lenis.scrollTo(target, { offset: -80, duration: 1.4 });
      } else {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Scroll Progress indicator
  gsap.to('.scroll-progress', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: {
      start: 0,
      end: 'max',
      scrub: 0.2,
    },
  });

  // Handoff from Hatching Intro to Hero (No abrupt guillotine!)
  const loader = $('.loader');
  if (loader) lenis?.stop();

  const heroTimeline = gsap.timeline({
    paused: !!loader,
    onComplete: () => {
      loader?.remove();
      lenis?.start();
    },
  });

  if (loader) {
    heroTimeline.to(loader, {
      opacity: 0,
      duration: 0.75,
      ease: 'power2.inOut',
    });
  }

  // Hero entrance typography & UI (Strictly zero individual word rotation!)
  heroTimeline
    .from('.hero-header .badge', {
      y: 18,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    }, loader ? '-=0.4' : 0)
    .from('.hero-header .hero-eyebrow', {
      y: 16,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.6')
    .from('.hero-header h1 .w > span', {
      yPercent: 105,
      opacity: 0,
      duration: 0.95,
      stagger: 0.05,
      ease: 'power3.out',
    }, '-=0.6')
    .from('.hero-header .ctas', {
      y: 20,
      opacity: 0,
      duration: 0.8,
      ease: 'power3.out',
    }, '-=0.6')
    .from('.hero-chassis', {
      y: 50,
      clearProps: 'transform',
      opacity: 0,
      duration: 1.1,
      ease: 'power3.out',
    }, '-=0.6')
    .from('.hero-satellite', {
      y: 70,
      opacity: 0,
      duration: 1.0,
      stagger: 0.12,
      ease: 'power3.out',
    }, '-=0.8')
    .from('.sanctuary-card', {
      y: 35,
      opacity: 0,
      duration: 0.85,
      stagger: 0.1,
      ease: 'power3.out',
    }, '-=0.6');

  // Fail-safe: ensure page never waits more than 4.5s
  if (loader) {
    const introPromise = window.introDone ? window.introDone.catch(() => {}) : Promise.resolve();
    const fallbackTimeout = new Promise(resolve => setTimeout(resolve, 4500));
    Promise.race([introPromise, fallbackTimeout]).then(() => heroTimeline.play());
  }

  // Satellite Phones Parallax on Scroll
  gsap.to('.hero-sat-0', {
    yPercent: -18,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero-stage',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1,
    },
  });
  gsap.to('.hero-sat-1', {
    yPercent: -28,
    ease: 'none',
    scrollTrigger: {
      trigger: '.hero-stage',
      start: 'top bottom',
      end: 'bottom top',
      scrub: 1.4,
    },
  });

  // Endless Editorial Ribbon Drift
  const bandRows = $$('.band-row');
  bandRows.forEach((row, i) => {
    const end = rtl ? 50 : -50;
    const [from, to] = i % 2 ? [end, 0] : [0, end];
    gsap.fromTo(row, { xPercent: from }, {
      xPercent: to,
      duration: 36,
      ease: 'none',
      repeat: -1,
    });
  });

  // Reveal animations for Headings and Cards
  $$('.split:not(.split-hero)').forEach(el => {
    gsap.from($$('.w > span', el), {
      yPercent: 105,
      duration: 0.9,
      ease: 'power3.out',
      stagger: 0.05,
      scrollTrigger: {
        trigger: el,
        start: 'top 88%',
      },
    });
  });

  gsap.set('[data-reveal]', { y: 35, opacity: 0 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%',
    onEnter: batch => gsap.to(batch, {
      y: 0,
      opacity: 1,
      duration: 0.85,
      stagger: 0.08,
      ease: 'power3.out',
      overwrite: true,
    }),
  });

  // Tactile Magnetic Hover for buttons on fine pointers
  if (matchMedia('(pointer: fine)').matches) {
    $$('.magnetic').forEach(b => {
      const quickX = gsap.quickTo(b, 'x', { duration: 0.4, ease: 'power2.out' });
      const quickY = gsap.quickTo(b, 'y', { duration: 0.4, ease: 'power2.out' });
      b.addEventListener('pointermove', e => {
        const r = b.getBoundingClientRect();
        quickX((e.clientX - r.left - r.width / 2) * 0.22);
        quickY((e.clientY - r.top - r.height / 2) * 0.22);
      });
      b.addEventListener('pointerleave', () => {
        quickX(0);
        quickY(0);
      });
    });
  }
}
