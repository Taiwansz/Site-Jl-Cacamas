import { createHeroRig3D } from './cacamba3d.js';
import { initVerificationBadgePhysics } from './lanyard.js';

/**
 * JL Caçambas e Munck — Indaiatuba / SP (Studio Edition)
 * Master Motion, 3D Rig Choreography, GSAP Flip Split 50/50 Showroom,
 * Gamified 4,2 m³ Interactive 3D Builder, CAD Scroll Drawing & Pendulum Badge.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');
if (!reduceMotion) document.documentElement.classList.add('motion');

if (typeof gsap !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, Flip);
}

const isMobileViewport = () => window.innerWidth <= 820;

// ============================================================================
// 1. LENIS + GSAP SCROLLTRIGGER SYNC
// ============================================================================
let lenis = null;
if (!reduceMotion && typeof Lenis !== 'undefined' && typeof gsap !== 'undefined') {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function smoothScrollTo(target, offset = 0) {
  if (!target) return;
  if (lenis) {
    lenis.scrollTo(target, { offset });
  } else if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: reduceMotion ? 'auto' : 'smooth' });
  } else {
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  }
}

// ============================================================================
// 2. INITIALIZE 3D RIGS & LANYARD PHYSICS (EXACT SUBAGENT 2 CONTRACTS)
// ============================================================================
const heroRig = createHeroRig3D({
  canvas: document.getElementById('heroWebglCanvas'),
  stageEl: document.getElementById('heroStage3d'),
});

const badgePhys = initVerificationBadgePhysics({
  containerEl: document.getElementById('lanyardStage'),
  cardEl: document.getElementById('lanyardCard'),
  cordCanvas: document.getElementById('lanyardCord'),
});

// ============================================================================
// 3. PRELOADER: MINIMALIST COUNTER + 5 CHROMATIC CURTAIN BANDS
// ============================================================================
const curtainEl = document.getElementById('curtainLoader');
if (curtainEl) {
  if (reduceMotion || typeof gsap === 'undefined') {
    curtainEl.classList.add('is-done');
    heroRig?.forceSync?.();
  } else {
    const center = document.getElementById('curtainCenter');
    const barFill = document.getElementById('curtainBarFill');
    const pctEl = document.getElementById('curtainPct');
    const cols = curtainEl.querySelectorAll('.curtain-col');
    const counter = { val: 0 };

    const tlPre = gsap.timeline({
      onComplete: () => {
        curtainEl.classList.add('is-done');
      },
    });

    tlPre
      .to(counter, {
        val: 100,
        duration: 0.58,
        ease: 'power2.inOut',
        onUpdate: () => {
          const v = Math.round(counter.val);
          if (pctEl) pctEl.textContent = `${String(v).padStart(2, '0')}%`;
          if (barFill) barFill.style.transform = `scaleX(${(v / 100).toFixed(3)})`;
        },
      })
      .to(center, {
        opacity: 0,
        duration: 0.24,
        ease: 'power2.in',
        onComplete: () => {
          if (center) center.style.display = 'none';
          heroRig?.triggerImplosion?.();
        },
      })
      .to(
        cols,
        {
          yPercent: (i) => (i % 2 === 0 ? -100 : 100),
          duration: 0.62,
          stagger: 0.05,
          ease: 'expo.inOut',
        },
        '-=0.05'
      );
  }
}

// ============================================================================
// 4. HEADER POLARITY BY elementsFromPoint() + CHAPTER SYNC + SUMÁRIO MENU
// ============================================================================
const hdr = document.querySelector('[data-hdr]');
const progressEl = document.querySelector('[data-progress]');
const hdrChapterNum = document.getElementById('hdrChapterNum');
const hdrChapterName = document.getElementById('hdrChapterName');

// Showroom state ref declared early so syncHeaderTheme can read it cleanly
const SHOWROOM_SLIDES = [
  {
    bg: '#E6A800',
    accent: '#0A214E',
    tone: 'light',
    counter: '01 / 04',
    kicker: 'ESTACIONÁRIA NBR 14728',
    wordmark: 'CAÇAMBA 4,2 m³',
    titleA: 'CAÇAMBA',
    titleB: '4,2 m³',
    img: './assets/img/cacamba-3d-cutout.png',
    alt: 'Render 3D transparente da Caçamba 4,2 m³ da JL Caçambas',
    isCutout: true,
    satA: 'LIMITE BORDA 4,2 m³',
    satB: 'CCM 139.7421',
    desc: 'Unidade estacionária em aço reforçado cadastrada sob CCM 139.7421. Atende reformas residenciais, construções e demolições em toda Indaiatuba com transporte 100% coberto por lona.',
    specs: ['4,2 m³ Úteis', 'Lei 097/2017', 'Com Lona', 'Base DIMPE II'],
    waMsg: 'Olá JL Caçambas! Vi a Caçamba 4,2 m³ no Showroom do site oficial e quero orçamento para Indaiatuba.',
  },
  {
    bg: '#0A214E',
    accent: '#F5B800',
    tone: 'dark',
    counter: '02 / 04',
    kicker: 'IÇAMENTO & CARGA PESADA',
    wordmark: 'CAMINHÃO MUNCK',
    titleA: 'CAMINHÃO',
    titleB: 'MUNCK',
    img: './assets/img/frota-patio.jpg',
    alt: 'Frota própria de caminhões da JL Caçambas e Munck no pátio do DIMPE II',
    isCutout: false,
    satA: 'CARGA PESADA',
    satB: 'OPERAÇÃO TÉCNICA',
    desc: 'Locação de caminhão guindauto Munck para carga, descarga, içamento e posicionamento técnico de máquinas industriais, geradores e estruturas metálicas em obras e fábricas.',
    specs: ['Içamento Técnico', 'Operador Próprio', 'Indústria & Obra', 'Indaiatuba e Região'],
    waMsg: 'Olá JL Caçambas e Munck! Vi o Caminhão Munck no Showroom do site e preciso de orçamento.',
  },
  {
    bg: '#151A23',
    accent: '#F5B800',
    tone: 'dark',
    counter: '03 / 04',
    kicker: 'LOGÍSTICA DE GALPÃO & CANTEIRO',
    wordmark: 'EMPILHADEIRAS',
    titleA: 'EMPILHA',
    titleB: 'DEIRAS',
    img: './assets/img/empilhadeira-linha.svg',
    alt: 'Ilustração de empilhadeira',
    isCutout: true,
    satA: 'GALPÃO & OBRA',
    satB: 'FROTA REVISADA',
    desc: 'Locação de empilhadeiras revisadas para movimentação ágil de pallets, blocos e cargas industriais em galpões e canteiros de Indaiatuba com flexibilidade por diária ou contrato.',
    specs: ['Movimentação Ágil', 'Frota Revisada', 'Diária ou Mensal', 'Polo Industrial'],
    waMsg: 'Olá JL Locação! Vi Empilhadeiras no Showroom do site oficial e quero informações sobre locação.',
  },
  {
    bg: '#174E24',
    accent: '#F5B800',
    tone: 'dark',
    counter: '04 / 04',
    kicker: 'CONSTRUTORAS & INDÚSTRIAS',
    wordmark: 'CONTRATO B2B',
    titleA: 'CONTRATO',
    titleB: 'B2B OBRAS',
    img: './assets/img/cacambas-fileira.jpg',
    alt: 'Fileira de caçambas estacionárias amarelas da JL Caçambas para atendimento corporativo',
    isCutout: false,
    satA: 'TROCA PROGRAMADA',
    satB: 'DESDE 2013',
    desc: 'Planos corporativos com trocas programadas, prioridade de despacho e faturamento organizado. Parceiro operacional de construtoras, shoppings e indústrias de Indaiatuba desde 2013.',
    specs: ['Troca Programada', 'Faturamento PJ', 'Prioridade Rota', 'Descarte Legal'],
    waMsg: 'Olá JL Caçambas! Represento uma empresa e quero conhecer os Planos Corporativos B2B em Indaiatuba.',
  },
];

let srIndex = 0;
let srMode = 'hero';
let rafThemePending = false;

function syncHeaderTheme() {
  if (rafThemePending || !hdr) return;
  rafThemePending = true;
  requestAnimationFrame(() => {
    rafThemePending = false;
    const hit = document
      .elementsFromPoint(window.innerWidth * 0.25, Math.max(12, hdr.offsetHeight / 2))
      .find((el) => !el.closest('[data-hdr],[data-menu],#heroStage3d,.curtain-loader') && el.closest('[data-theme]'));
    let theme = hit?.closest('[data-theme]')?.dataset.theme || 'light';

    if (theme === 'chameleon') {
      if (srMode === 'split' && !isMobileViewport()) {
        theme = 'light';
      } else {
        theme = SHOWROOM_SLIDES[srIndex]?.tone === 'light' ? 'light' : 'dark';
      }
    }
    document.body.dataset.hdrTheme = theme;
  });
}

if (typeof ScrollTrigger !== 'undefined') {
  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate: (self) => {
      syncHeaderTheme();
      if (progressEl) {
        progressEl.style.transform = `scaleX(${self.progress.toFixed(4)})`;
      }
      document.body.classList.toggle('show-brand', window.scrollY > window.innerHeight * 0.45);
    },
    onRefresh: syncHeaderTheme,
  });

  document.querySelectorAll('[data-chapter]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 52%',
      end: 'bottom 48%',
      onEnter: () => {
        if (hdrChapterNum) hdrChapterNum.textContent = sec.dataset.chapter || '01';
        if (hdrChapterName) hdrChapterName.textContent = sec.dataset.chapterTitle || 'Abertura';
      },
      onEnterBack: () => {
        if (hdrChapterNum) hdrChapterNum.textContent = sec.dataset.chapter || '01';
        if (hdrChapterName) hdrChapterName.textContent = sec.dataset.chapterTitle || 'Abertura';
      },
    });
  });

  ScrollTrigger.create({
    trigger: '#contato',
    start: 'top 82%',
    end: 'bottom top',
    onEnter: () => {
      document.body.classList.add('in-footer');
      badgePhys?.impulse?.(1.15);
    },
    onEnterBack: () => {
      document.body.classList.add('in-footer');
      badgePhys?.impulse?.(0.75);
    },
    onLeaveBack: () => document.body.classList.remove('in-footer'),
  });
}
syncHeaderTheme();

// Smooth anchor navigation
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    if (document.body.classList.contains('menu-open')) {
      toggleMenu(false);
      setTimeout(() => smoothScrollTo(target), 120);
    } else {
      smoothScrollTo(target);
    }
  });
});

// Fullscreen Sumário Menu
const menuBtn = document.querySelector('[data-menu-btn]');
const menuOverlay = document.querySelector('[data-menu]');

function toggleMenu(forceState) {
  if (!menuOverlay || !menuBtn) return;
  const open = typeof forceState === 'boolean' ? forceState : !menuOverlay.classList.contains('is-open');
  if (open) {
    menuOverlay.hidden = false;
    requestAnimationFrame(() => menuOverlay.classList.add('is-open'));
    document.body.classList.add('menu-open');
    menuBtn.setAttribute('aria-expanded', 'true');
    if (lenis) lenis.stop();
  } else {
    menuOverlay.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
    setTimeout(() => {
      if (!menuOverlay.classList.contains('is-open')) menuOverlay.hidden = true;
    }, 540);
  }
}
if (menuBtn) menuBtn.addEventListener('click', () => toggleMenu());
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (document.body.classList.contains('menu-open')) toggleMenu(false);
    else if (srMode === 'split') closeShowroomSplit();
  }
});

// ============================================================================
// 5. ACT 01 & ACT 02: HERO 3D RIG + OBSIDIAN CHAINS SCROLL CHOREOGRAPHY
// ============================================================================
function applyHeroPose(p = 0) {
  const mob = isMobileViewport();
  heroRig?.setState?.({
    x: mob ? 0 : p * 0.42,
    y: mob ? -0.18 - p * 0.25 : -0.46 - p * 0.16,
    z: mob ? -1.35 : -0.12 + p * 0.18,
    rotX: 0.22 + p * 0.14,
    rotY: -0.48 + p * 0.62,
    rotZ: p * 0.06,
    scale: mob ? 0.64 : 0.88 - p * 0.08,
    heroProgress: p,
    obsidianProgress: 0,
    chainSpread: 0.12 + p * 0.38,
    opacity: 1,
    themeMode: p > 0.68 ? 'dark' : 'light',
  });
}
applyHeroPose(0);

if (typeof ScrollTrigger !== 'undefined') {
  ScrollTrigger.create({
    trigger: '#topo',
    start: 'top top',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => applyHeroPose(self.progress),
  });

  ScrollTrigger.create({
    trigger: '.obsidian-index-band',
    start: 'top bottom',
    end: 'bottom 20%',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      const mob = isMobileViewport();
      const fadeOut = p > 0.72 ? Math.max(0, 1 - (p - 0.72) / 0.28) : 1;
      heroRig?.setState?.({
        x: mob ? 0 : 0.85 - p * 0.4,
        y: mob ? -0.55 : -0.58 - p * 0.35,
        z: mob ? -1.8 : -0.55 - p * 0.45,
        rotX: 0.36 + p * 0.22,
        rotY: 0.14 + p * 0.95,
        rotZ: 0.08 - p * 0.12,
        scale: mob ? 0.52 : 0.74 - p * 0.14,
        heroProgress: 1,
        obsidianProgress: p,
        chainSpread: 0.52 + p * 0.48,
        opacity: fadeOut,
        themeMode: 'dark',
      });
    },
  });

  ScrollTrigger.create({
    trigger: '.bento-band',
    start: 'top 65%',
    end: 'max',
    onEnter: () => heroRig?.setState?.({ opacity: 0 }),
  });
}

// ============================================================================
// 6. ACT 03: CHAMELEON SHOWROOM + GSAP FLIP SPLIT 50/50 + VERTICAL SLOT SWAP
// ============================================================================
const srStage = document.getElementById('showroomStage');
const srSplitPanel = document.getElementById('srSplitPanel');
const srSplitBody = document.getElementById('srSplitBody');
const srSplitCounter = document.getElementById('srSplitCounter');
const srSplitKicker = document.getElementById('srSplitKicker');
const srSplitTitleA = document.getElementById('srSplitTitleA');
const srSplitTitleB = document.getElementById('srSplitTitleB');
const srSplitDesc = document.getElementById('srSplitDesc');
const srSpecSlots = Array.from(document.querySelectorAll('#srSpecStrip [data-spec-slot]'));
const srWaBtn = document.getElementById('srWaBtn');
const srHeroCounter = document.getElementById('srHeroCounter');
const srHeroWordmark = document.getElementById('srHeroWordmark');
const srSatA = document.getElementById('srSatA');
const srSatB = document.getElementById('srSatB');
const srVisualWrap = document.getElementById('srVisualWrap');
const srVisualInner = document.getElementById('srVisualInner');
const srVisualImg = document.getElementById('srVisualImg');
const srDots = Array.from(document.querySelectorAll('[data-sr-dot]'));
const srOpenSplitBtn = document.getElementById('srOpenSplitBtn');
const srBackBtn = document.getElementById('srBackBtn');

let srAnimating = false;

function paintShowroomContent(idx) {
  const s = SHOWROOM_SLIDES[idx] || SHOWROOM_SLIDES[0];
  srIndex = idx;

  if (srStage) {
    srStage.dataset.slide = String(idx);
    srStage.dataset.tone = s.tone;
    srStage.style.setProperty('--sr-bg', s.bg);
    srStage.style.setProperty('--sr-accent', s.accent);
    srStage.style.setProperty('--sr-ink', s.tone === 'light' ? '#0A0D12' : '#F7F5EF');
  }

  if (srHeroCounter) srHeroCounter.textContent = `${s.counter} · SHOWROOM JL`;
  if (srHeroWordmark) srHeroWordmark.textContent = s.wordmark;
  if (srSatA) srSatA.textContent = s.satA;
  if (srSatB) srSatB.textContent = s.satB;

  if (srSplitCounter) srSplitCounter.textContent = s.counter;
  if (srSplitKicker) srSplitKicker.textContent = s.kicker;
  if (srSplitTitleA) srSplitTitleA.textContent = s.titleA;
  if (srSplitTitleB) srSplitTitleB.textContent = s.titleB;
  if (srSplitDesc) srSplitDesc.textContent = s.desc;

  srSpecSlots.forEach((slot, i) => {
    slot.textContent = s.specs[i] || '';
  });

  if (srVisualImg) {
    srVisualImg.src = s.img;
    srVisualImg.alt = s.alt;
  }
  if (srVisualWrap) {
    srVisualWrap.classList.toggle('is-cutout', Boolean(s.isCutout));
    srVisualWrap.classList.toggle('is-framed', !s.isCutout);
  }
  if (srWaBtn) {
    srWaBtn.href = `https://wa.me/5519989689696?text=${encodeURIComponent(s.waMsg)}`;
  }

  srDots.forEach((dot, i) => {
    const active = i === idx;
    dot.classList.toggle('is-active', active);
    dot.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  syncHeaderTheme();
}

function swapShowroomSlide(targetIdx, dirHint = 1) {
  const len = SHOWROOM_SLIDES.length;
  const nextIdx = ((targetIdx % len) + len) % len;
  if (nextIdx === srIndex && !srAnimating) return;

  if (reduceMotion || typeof gsap === 'undefined') {
    paintShowroomContent(nextIdx);
    return;
  }

  if (srAnimating) {
    gsap.killTweensOf([srVisualInner, srSplitBody, srHeroWordmark, srSatA, srSatB]);
  }
  srAnimating = true;

  if (srMode === 'split') {
    // Burger King BR Style: Vertical Slot-Machine Swap keeping Split locked!
    const outY = dirHint >= 0 ? -115 : 115;
    const inY = dirHint >= 0 ? 115 : -115;
    const tl = gsap.timeline({
      onComplete: () => {
        srAnimating = false;
      },
    });

    tl.to([srVisualInner, srSplitBody], {
      yPercent: outY,
      opacity: 0,
      duration: 0.3,
      ease: 'power3.in',
      stagger: 0.03,
      onComplete: () => paintShowroomContent(nextIdx),
    }).fromTo(
      [srVisualInner, srSplitBody],
      { yPercent: inY, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.56, ease: 'expo.out', stagger: 0.05 }
    );
  } else {
    // Hero Mode Horizontal Parallax Swap
    const outX = dirHint >= 0 ? -70 : 70;
    const inX = dirHint >= 0 ? 70 : -70;
    const tl = gsap.timeline({
      onComplete: () => {
        srAnimating = false;
      },
    });

    tl.to(srVisualInner, { x: outX, opacity: 0, scale: 0.92, duration: 0.28, ease: 'power2.in' })
      .to([srSatA, srSatB], { x: outX * 1.4, opacity: 0, duration: 0.24, ease: 'power2.in' }, '<')
      .add(() => paintShowroomContent(nextIdx))
      .fromTo(srVisualInner, { x: inX, opacity: 0, scale: 0.92 }, { x: 0, opacity: 1, scale: 1, duration: 0.54, ease: 'expo.out' })
      .fromTo([srSatA, srSatB], { x: inX * 1.3, opacity: 0 }, { x: 0, opacity: 0.85, duration: 0.48, ease: 'expo.out', stagger: 0.05 }, '<0.06');
  }
}

function openShowroomSplit(idx = srIndex) {
  if (!srStage || !srVisualWrap || !srSplitPanel) return;
  if (typeof idx === 'number' && idx !== srIndex) {
    paintShowroomContent(idx);
  }
  if (srMode === 'split') return;

  const mob = isMobileViewport();
  const state = !reduceMotion && typeof Flip !== 'undefined' ? Flip.getState(srVisualWrap) : null;

  srMode = 'split';
  srStage.dataset.mode = 'split';
  srSplitPanel.setAttribute('aria-hidden', 'false');
  syncHeaderTheme();

  if (reduceMotion || typeof gsap === 'undefined') {
    srSplitPanel.style.transform = 'translate3d(0, 0, 0)';
    return;
  }

  gsap.fromTo(
    srSplitPanel,
    mob ? { xPercent: 0, yPercent: 102 } : { xPercent: -102, yPercent: 0 },
    { xPercent: 0, yPercent: 0, duration: 0.78, ease: 'expo.inOut', clearProps: 'transform' }
  );

  if (state) {
    Flip.from(state, {
      duration: 0.84,
      ease: 'expo.inOut',
      scale: true,
    });
  }

  gsap.fromTo(
    srSplitBody,
    { y: 24, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.52, delay: 0.24, ease: 'power3.out' }
  );
}

function closeShowroomSplit() {
  if (!srStage || !srVisualWrap || !srSplitPanel) return;
  if (srMode === 'hero') return;

  const mob = isMobileViewport();
  const state = !reduceMotion && typeof Flip !== 'undefined' ? Flip.getState(srVisualWrap) : null;

  srMode = 'hero';
  srStage.dataset.mode = 'hero';
  srSplitPanel.setAttribute('aria-hidden', 'true');
  syncHeaderTheme();

  if (reduceMotion || typeof gsap === 'undefined') {
    srSplitPanel.style.transform = mob ? 'translateY(102%)' : 'translateX(-102%)';
    return;
  }

  gsap.to(srSplitPanel, {
    xPercent: mob ? 0 : -102,
    yPercent: mob ? 102 : 0,
    duration: 0.65,
    ease: 'expo.inOut',
  });

  if (state) {
    Flip.from(state, {
      duration: 0.78,
      ease: 'expo.inOut',
      scale: true,
    });
  }
}

paintShowroomContent(0);

if (srOpenSplitBtn) srOpenSplitBtn.addEventListener('click', () => openShowroomSplit(srIndex));
if (srBackBtn) srBackBtn.addEventListener('click', () => closeShowroomSplit());

document.querySelectorAll('[data-sr-prev]').forEach((btn) => {
  btn.addEventListener('click', () => swapShowroomSlide(srIndex - 1, -1));
});
document.querySelectorAll('[data-sr-next]').forEach((btn) => {
  btn.addEventListener('click', () => swapShowroomSlide(srIndex + 1, 1));
});
srDots.forEach((dot) => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.dataset.srDot || '0', 10);
    swapShowroomSlide(idx, idx >= srIndex ? 1 : -1);
  });
});

// Jump hooks from Act 02 Obsidian Index & Colorful Bento directly into Showroom
document.querySelectorAll('[data-jump-showroom]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const idx = parseInt(btn.dataset.jumpShowroom || '0', 10);
    const shouldSplit = btn.dataset.openSplit === 'true';
    const srSection = document.getElementById('showroom');
    smoothScrollTo(srSection);
    setTimeout(() => {
      if (shouldSplit) {
        if (srMode === 'split') swapShowroomSlide(idx, 1);
        else openShowroomSplit(idx);
      } else {
        swapShowroomSlide(idx, 1);
      }
    }, 320);
  });
});

// ============================================================================
// 8. ACT 05: CAD BLUEPRINT SVG DRAWING ON SCROLL + FLEET STRIP CONTROLS
// ============================================================================
const cadSvg = document.getElementById('cadBlueprintSvg');
if (cadSvg && !reduceMotion && typeof gsap !== 'undefined') {
  const stroked = cadSvg.querySelectorAll('[pathLength="1"]');
  const hullFill = cadSvg.querySelector('.cad-hull-fill');
  const labels = cadSvg.querySelectorAll('text, .cad-badge-rect');

  gsap.set(stroked, { strokeDasharray: 1, strokeDashoffset: 1 });
  if (hullFill) gsap.set(hullFill, { opacity: 0 });
  gsap.set(labels, { opacity: 0 });

  const tlCad = gsap.timeline({
    scrollTrigger: {
      trigger: '#especificacao',
      start: 'top 76%',
      end: 'top 14%',
      scrub: 0.45,
    },
  });

  tlCad
    .to(cadSvg.querySelectorAll('.cad-frame, .cad-axis, .cad-ground'), { strokeDashoffset: 0, duration: 0.24, stagger: 0.04 })
    .to(cadSvg.querySelectorAll('[data-cad-part="hull"] [pathLength="1"]'), { strokeDashoffset: 0, duration: 0.45, stagger: 0.03 })
    .to(hullFill, { opacity: 1, duration: 0.25 }, '-=0.15')
    .to(cadSvg.querySelectorAll('[data-cad-part="limit"] [pathLength="1"], [data-cad-part="dims"] [pathLength="1"]'), { strokeDashoffset: 0, duration: 0.35, stagger: 0.02 })
    .to(cadSvg.querySelectorAll('[data-cad-part="street"] [pathLength="1"]'), { strokeDashoffset: 0, duration: 0.35, stagger: 0.03 })
    .to(labels, { opacity: 1, duration: 0.28, stagger: 0.02 }, '-=0.35');
}

const fleetStrip = document.getElementById('fleetStrip');
const fleetPrevBtn = document.getElementById('fleetPrevBtn');
const fleetNextBtn = document.getElementById('fleetNextBtn');
if (fleetStrip && fleetPrevBtn && fleetNextBtn) {
  const scrollStrip = (dir) => {
    const step = Math.max(280, fleetStrip.clientWidth * 0.65);
    fleetStrip.scrollBy({ left: dir * step, behavior: reduceMotion ? 'auto' : 'smooth' });
  };
  fleetPrevBtn.addEventListener('click', () => scrollStrip(-1));
  fleetNextBtn.addEventListener('click', () => scrollStrip(1));
}

// ============================================================================
// 9. SCROLL REVEALS & MAGNETIC CTA MICRO-INTERACTIONS
// ============================================================================
if (!reduceMotion && typeof gsap !== 'undefined') {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.72,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 86%',
        once: true,
      },
    });
  });

  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.magnetic-btn').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) * 0.14;
        const dy = (e.clientY - (r.top + r.height / 2)) * 0.18;
        gsap.to(btn, { x: dx, y: dy, duration: 0.26, ease: 'power2.out' });
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, { x: 0, y: 0, duration: 0.44, ease: 'elastic.out(1, 0.5)' });
      });
    });
  }
}

// ============================================================================
// 10. PLAYWRIGHT AUDIT HOOKS (EXACT CONTRACT)
// ============================================================================
window.__jlAudit = {
  heroRig,
  badgePhys,
  openShowroomSplit: (idx = 0) => openShowroomSplit(idx),
  closeShowroomSplit: () => closeShowroomSplit(),
  swapShowroomSlide: (idx) => swapShowroomSlide(idx, 1),
};
