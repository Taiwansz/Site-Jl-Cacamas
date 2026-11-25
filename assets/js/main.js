import { createCacamba3D } from './cacamba3d.js';

/**
 * JL Cacambas e Munck — Indaiatuba / SP
 * Master Choreography Engine:
 * - Archetype A: Chromatic Curtain Preloader + Chameleon Work Configurator (GSAP Flip)
 * - Archetype B: Persistent Fixed Blender PBR 3D Dumpster Rig (Empty -> Filling -> Tarp -> Hoist)
 * - Archetype C: Lenis + GSAP ScrollTrigger, elementsFromPoint() Header Polarity,
 *   Vertical Chapter Rail, Fullscreen Clip-Path Sumario, splitWords Scrub,
 *   CAD SVG Path Drawing, Discrete 5-Step EVP State Machine, Strikethrough --strike,
 *   and Contextual WhatsApp Conversion Funnel (19) 98968-9696.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('js');
if (!reduceMotion) document.documentElement.classList.add('motion');

gsap.registerPlugin(ScrollTrigger, Flip);

// ============================================================================
// 1. LENIS + GSAP CANONICAL SYNC (Archetype C §4.1)
// ============================================================================
let lenis = null;
if (!reduceMotion && typeof Lenis !== 'undefined') {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// ============================================================================
// 2. PRELOADER: ARCHETYPE A CHROMATIC CURTAIN (5 BRAND COLUMNS)
// ============================================================================
const curtainEl = document.getElementById('curtainLoader');
if (curtainEl) {
  if (reduceMotion) {
    curtainEl.classList.add('is-done');
  } else {
    const cols = curtainEl.querySelectorAll('.curtain-col');
    const badge = curtainEl.querySelector('.curtain-badge');
    const tlLoad = gsap.timeline({
      delay: 0.25,
      onComplete: () => curtainEl.classList.add('is-done'),
    });
    tlLoad.to(badge, { opacity: 0, scale: 0.94, duration: 0.28, ease: 'power2.in' });
    tlLoad.to(
      cols,
      {
        yPercent: (i) => (i % 2 === 0 ? -100 : 100),
        duration: 0.68,
        stagger: 0.055,
        ease: 'expo.inOut',
      },
      '-=0.1'
    );
  }
}

// ============================================================================
// 3. HEADER POLARITY BY elementsFromPoint() + SINGLE-LOGO DISCIPLINE
// ============================================================================
const hdr = document.querySelector('[data-hdr]');
const progressEl = document.querySelector('[data-progress]');
let rafThemePending = false;

function syncHeaderTheme() {
  if (rafThemePending || !hdr) return;
  rafThemePending = true;
  requestAnimationFrame(() => {
    rafThemePending = false;
    const hit = document
      .elementsFromPoint(window.innerWidth / 2, Math.max(10, hdr.offsetHeight / 2))
      .find((el) => !el.closest('[data-hdr],[data-menu],#stage3d,.stage-3d,.curtain-loader') && el.closest('[data-theme]'));
    const theme = hit?.closest('[data-theme]')?.dataset.theme || 'dark';
    document.body.dataset.hdrTheme = theme;
  });
}

ScrollTrigger.create({
  start: 0,
  end: 'max',
  onUpdate: (self) => {
    syncHeaderTheme();
    if (progressEl) {
      progressEl.style.transform = `scaleX(${self.progress.toFixed(4)})`;
    }
    // Single-logo discipline: reveal compact header logo after leaving Hero lockup
    document.body.classList.toggle('show-brand', window.scrollY > window.innerHeight * 0.65);
  },
  onRefresh: syncHeaderTheme,
});
syncHeaderTheme();

// ============================================================================
// 4. VERTICAL LEFT CHAPTER RAIL + FULLSCREEN SUMÁRIO MENU
// ============================================================================
const chapters = Array.from(document.querySelectorAll('[data-chapter]'));
const sideGuideList = document.getElementById('sideGuideList');
const sideChapterName = document.getElementById('sideChapterName');
const hdrChapterNum = document.getElementById('hdrChapterNum');
const hdrChapterName = document.getElementById('hdrChapterName');

const guideBtns = [];
chapters.forEach((sec, idx) => {
  if (!sideGuideList) return;
  const li = document.createElement('li');
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', `Ir para ${sec.dataset.chapterTitle || sec.id}`);
  if (idx === 0) btn.classList.add('is-active');
  btn.addEventListener('click', () => {
    if (lenis) lenis.scrollTo(sec, { offset: 0 });
    else sec.scrollIntoView({ behavior: 'smooth' });
  });
  li.appendChild(btn);
  sideGuideList.appendChild(li);
  guideBtns.push(btn);

  ScrollTrigger.create({
    trigger: sec,
    start: 'top 52%',
    end: 'bottom 48%',
    onEnter: () => setActiveChapter(idx, sec),
    onEnterBack: () => setActiveChapter(idx, sec),
  });
});

function setActiveChapter(idx, sec) {
  guideBtns.forEach((b, i) => b.classList.toggle('is-active', i === idx));
  const num = sec.dataset.chapter || '00';
  const title = sec.dataset.chapterTitle || 'Abertura';
  if (sideChapterName) sideChapterName.textContent = title;
  if (hdrChapterNum) hdrChapterNum.textContent = num;
  if (hdrChapterName) hdrChapterName.textContent = title;
}

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
    }, 520);
  }
}
if (menuBtn) menuBtn.addEventListener('click', () => toggleMenu());
if (menuOverlay) {
  menuOverlay.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetEl = document.querySelector(link.getAttribute('href'));
      toggleMenu(false);
      if (targetEl) {
        setTimeout(() => {
          if (lenis) lenis.scrollTo(targetEl);
          else targetEl.scrollIntoView({ behavior: 'smooth' });
        }, 120);
      }
    });
  });
}
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('menu-open')) toggleMenu(false);
});

// ============================================================================
// 5. PERSISTENT 3D BLENDER DUMPSTER ENGINE + MASTER SCROLL CHOREOGRAPHY
// ============================================================================
const rig3D = createCacamba3D({
  canvas: document.getElementById('cacambaCanvas'),
  stageEl: document.getElementById('stage3d'),
  hudEl: document.getElementById('hud3d'),
  phaseEl: document.getElementById('hudPhaseLabel'),
  barEl: document.getElementById('hudFillBar'),
  volEl: document.getElementById('hudVolumeVal'),
  captionEl: document.getElementById('evp3dCaption'),
});
window.__jlRig3D = rig3D;

const isMobile = () => window.innerWidth <= 880;

// Initial Hero-Poster 3D pose (Z-interlocked cleanly across "JL CAÇAMBAS")
function setHeroPose(p = 0) {
  const mob = isMobile();
  rig3D.setState({
    x: mob ? 0 : p * 1.1,
    y: mob ? -0.46 - p * 0.15 : -0.64 - p * 0.14,
    z: mob ? -1.15 : -0.15 + p * 0.30,
    rotX: 0.24 + p * 0.18,
    rotY: -0.54 + p * 0.65,
    rotZ: 0,
    scale: mob ? 0.72 : 0.86 - p * 0.10,
    fill: 0.0,
    tarp: 0.0,
    lift: 0.0,
    opacity: p > 0.78 ? Math.max(0, 1 - (p - 0.78) / 0.22) : 1.0,
    showHud: false,
    phaseText: 'ESTÁGIO 00 · CAÇAMBA 4,2 m³ LIMPA',
  });
}
setHeroPose(0);

// Act 00 Hero -> Optical Continuity Portal + 3D Hero Exit
const heroPortal = document.getElementById('heroPortal');
ScrollTrigger.create({
  trigger: '#topo',
  start: 'top top',
  end: 'bottom top',
  scrub: true,
  onUpdate: (self) => {
    const p = self.progress;
    setHeroPose(p);
    if (heroPortal && !reduceMotion) {
      const portalScale = p > 0.52 ? ((p - 0.52) / 0.48) * 9.5 : 0;
      heroPortal.style.transform = `translate(-50%, -50%) scale(${portalScale.toFixed(3)})`;
      heroPortal.style.opacity = p > 0.92 ? String(Math.max(0, 1 - (p - 0.92) / 0.08)) : '1';
    }
  },
});

// Act 01 Historia -> Hide 3D rig cleanly so authentic Parque Ecologico photo owns the screen
ScrollTrigger.create({
  trigger: '#historia',
  start: 'top 65%',
  end: 'bottom 35%',
  onEnter: () => rig3D.setState({ opacity: 0, showHud: false }),
  onEnterBack: () => rig3D.setState({ opacity: 0, showHud: false }),
});

// Act 02 Manifesto -> 3D Dumpster Returns on Right & FILLS PROGRESSIVELY (0.0m³ -> 2.4m³)
ScrollTrigger.create({
  trigger: '#manifesto',
  start: 'top 72%',
  end: 'bottom 35%',
  scrub: true,
  onUpdate: (self) => {
    const p = self.progress;
    const mob = isMobile();
    const fillPhase = Math.min(0.58, p * 0.62); // Layers 1, 2 & 3 rain down smoothly
    const fadeIn = Math.min(1, p / 0.14);
    const fadeOut = p > 0.88 ? Math.max(0, (1 - p) / 0.12) : 1;
    rig3D.setState({
      x: mob ? 0 : 1.44,
      y: mob ? -1.25 : -0.40,
      z: mob ? -1.65 : -0.25,
      rotX: 0.44 + p * 0.14,  // Elevated isometric pitch so viewer sees bricks & concrete filling inside!
      rotY: -0.78 + p * 0.88,
      rotZ: 0,
      scale: mob ? 0.64 : 0.86,
      fill: fillPhase,
      tarp: 0.0,
      lift: 0.0,
      opacity: Math.min(fadeIn, fadeOut),
      showHud: true,
      phaseText: `CARGA EM ANDAMENTO · CAMADA ${Math.min(3, Math.floor(p * 3) + 1)}/5`,
    });
  },
});

// Act 03 CAD Blueprint -> Hide 3D rig so CAD SVG technical drawing has 100% focus
ScrollTrigger.create({
  trigger: '#especificacao',
  start: 'top 72%',
  end: 'bottom 35%',
  onEnter: () => rig3D.setState({ opacity: 0, showHud: false }),
  onEnterBack: () => rig3D.setState({ opacity: 0, showHud: false }),
});

// Act 04 Discrete 5-Step State Machine (.s-evp) + 3D FULL FILL (4.2m³) + TARP + HYDRAULIC HOIST!
const evpSlides = Array.from(document.querySelectorAll('[data-evp-step]'));
const evpPills = Array.from(document.querySelectorAll('[data-evp-jump]'));
let currentEvpStep = 0;

function setEvpStep(stepIdx) {
  const clamped = Math.max(0, Math.min(4, stepIdx));
  if (clamped === currentEvpStep && evpSlides[clamped]?.classList.contains('is-active')) return;
  currentEvpStep = clamped;
  evpSlides.forEach((el, i) => el.classList.toggle('is-active', i === clamped));
  evpPills.forEach((el, i) => el.classList.toggle('is-active', i === clamped));
}

const evpSection = document.getElementById('operacao');
evpPills.forEach((pill) => {
  pill.addEventListener('click', () => {
    const idx = parseInt(pill.dataset.evpJump || '0', 10);
    if (!evpSection) return;
    const rectTop = evpSection.getBoundingClientRect().top + window.scrollY;
    const scrollable = evpSection.offsetHeight - window.innerHeight;
    const targetY = rectTop + (idx + 0.45) * (scrollable / 5);
    if (lenis) lenis.scrollTo(targetY);
    else window.scrollTo({ top: targetY, behavior: 'smooth' });
  });
});

ScrollTrigger.create({
  trigger: '#operacao',
  start: 'top 65%',
  end: 'bottom 40%',
  scrub: true,
  onUpdate: (self) => {
    const p = self.progress;
    const step = Math.min(4, Math.floor(p * 5));
    setEvpStep(step);

    const mob = isMobile();
    const fadeIn = Math.min(1, p / 0.08);
    const fadeOut = p > 0.94 ? Math.max(0, (1 - p) / 0.06) : 1;

    // 5-Stage 3D Choreography:
    // 0 (0.00..0.20): Clean arrival spin
    // 1 (0.20..0.40): Legal placement profile showing CCM 139.7421 & reflectors
    // 2 (0.40..0.62): Full fill explosion (0.52 -> 1.00 = 4.2m³ flush with rim!)
    // 3 (0.62..0.82): Lei 097/2017 waterproof tarp unfolds cleanly over load
    // 4 (0.82..1.00): Hydraulic hoist elevation & tilt ready for legal disposal
    let fill = 0.0;
    let tarp = 0.0;
    let lift = 0.0;
    let rotX = 0.30;
    let rotY = -0.55;
    let phaseText = 'ETAPA 01 · UNIDADE DESPACHADA';

    if (p < 0.20) {
      const u = p / 0.20;
      fill = 0.0;
      rotX = 0.26;
      rotY = -0.75 + u * 0.55;
      phaseText = 'ETAPA 01 · PEDIDO CONFIRMADO';
    } else if (p < 0.40) {
      const u = (p - 0.20) / 0.20;
      fill = u * 0.35;
      rotX = 0.32;
      rotY = -0.20 + u * 0.55;
      phaseText = 'ETAPA 02 · POSICIONADA NA VIA (30 cm)';
    } else if (p < 0.62) {
      const u = (p - 0.40) / 0.22;
      fill = 0.35 + u * 0.65;
      rotX = 0.50;
      rotY = 0.35 - u * 0.92;
      phaseText = 'ETAPA 03 · ENCHENDO ATÉ 4,2 m³ (BORDA)';
    } else if (p < 0.82) {
      const u = (p - 0.62) / 0.20;
      fill = 1.0;
      tarp = u;
      rotX = 0.44 - u * 0.12;
      rotY = -0.57 + u * 0.42;
      phaseText = 'ETAPA 04 · COBERTURA COM LONA (LEI 097/2017)';
    } else {
      const u = (p - 0.82) / 0.18;
      fill = 1.0;
      tarp = 1.0;
      lift = u;
      rotX = 0.30 - u * 0.10;
      rotY = -0.15 - u * 0.45;
      phaseText = 'ETAPA 05 · IÇAMENTO & DESCARTE LEGAL';
    }

    rig3D.setState({
      x: mob ? 0 : 1.44,
      y: mob ? -1.32 : -0.38,
      z: mob ? -1.75 : -0.25,
      rotX,
      rotY,
      rotZ: 0,
      scale: mob ? 0.60 : 0.86,
      fill,
      tarp,
      lift,
      opacity: Math.min(fadeIn, fadeOut),
      showHud: true,
      phaseText,
    });
  },
});

// Acts 05..08 -> Pause 3D rig cleanly for maximum GPU smoothness
ScrollTrigger.create({
  trigger: '#frota',
  start: 'top 75%',
  end: 'max',
  onEnter: () => rig3D.setState({ opacity: 0, showHud: false }),
});

// Hide floating WA button on Footer/Contact section where full CTAs live
ScrollTrigger.create({
  trigger: '#contato',
  start: 'top 80%',
  end: 'bottom top',
  onEnter: () => document.body.classList.add('in-footer'),
  onLeaveBack: () => document.body.classList.remove('in-footer'),
});

// ============================================================================
// 6. WORD-SPLITTER ZERO-LICENSE + OPACITY SCRUB (Archetype C §4.3.1)
// ============================================================================
document.querySelectorAll('[data-scrub-words]').forEach((el) => {
  const original = el.textContent.trim();
  el.setAttribute('aria-label', original);

  // Preserve inner <strong> tags while wrapping plain words in <span class="w">
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parts = node.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          frag.appendChild(document.createTextNode(part));
        } else {
          const span = document.createElement('span');
          span.className = 'w';
          span.textContent = part;
          frag.appendChild(span);
        }
      });
      node.parentNode.replaceChild(frag, node);
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(walk);
    }
  };
  walk(el);

  const words = el.querySelectorAll('.w');
  if (!reduceMotion && words.length) {
    gsap.set(words, { opacity: 0.16 });
    gsap.to(words, {
      opacity: 1,
      stagger: 0.04,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top 84%',
        end: 'bottom 44%',
        scrub: true,
      },
    });
  }
});

// ============================================================================
// 7. CAD SVG TECHNICAL BLUEPRINT DRAWING ON SCROLL (pathLength="1")
// ============================================================================
const cadSvg = document.getElementById('cadBlueprintSvg');
if (cadSvg && !reduceMotion) {
  const stroked = cadSvg.querySelectorAll('[pathLength="1"]');
  const hullFill = cadSvg.querySelector('.cad-hull-fill');
  const texts = cadSvg.querySelectorAll('text, rect[fill="#0A214E"]');

  gsap.set(stroked, { strokeDasharray: 1, strokeDashoffset: 1 });
  if (hullFill) gsap.set(hullFill, { opacity: 0 });
  gsap.set(texts, { opacity: 0 });

  const tlCad = gsap.timeline({
    scrollTrigger: {
      trigger: '#especificacao',
      start: 'top 78%',
      end: 'center center',
      scrub: 0.5,
    },
  });

  tlCad
    .to(cadSvg.querySelectorAll('.cad-frame, .cad-axis, .cad-ground'), { strokeDashoffset: 0, duration: 0.25, stagger: 0.04 })
    .to(cadSvg.querySelectorAll('[data-cad-part="hull"] [pathLength="1"]'), { strokeDashoffset: 0, duration: 0.45, stagger: 0.03 })
    .to(hullFill, { opacity: 1, duration: 0.25 }, '-=0.15')
    .to(cadSvg.querySelectorAll('[data-cad-part="limit"] [pathLength="1"], [data-cad-part="dims"] [pathLength="1"]'), { strokeDashoffset: 0, duration: 0.35, stagger: 0.02 })
    .to(cadSvg.querySelectorAll('[data-cad-part="street"] [pathLength="1"]'), { strokeDashoffset: 0, duration: 0.35, stagger: 0.03 })
    .to(texts, { opacity: 1, duration: 0.25, stagger: 0.02 }, '-=0.35');
}

// ============================================================================
// 8. SUBTLE DUST PARTICLE WAVE CANVAS IN ACT 02 (2D Canvas HiDPI)
// ============================================================================
const dustCanvas = document.getElementById('dustCanvas');
if (dustCanvas) {
  const ctx = dustCanvas.getContext('2d');
  const dots = Array.from({ length: 68 }, (_, i) => ({
    x: (i * 137.5) % 1000,
    y: (i * 73.1) % 600,
    r: 1.2 + (i % 4) * 0.65,
    vx: 0.14 + (i % 5) * 0.05,
    vy: -0.08 - (i % 3) * 0.04,
    gold: i % 3 === 0,
  }));

  function resizeDust() {
    const rect = dustCanvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    dustCanvas.width = Math.max(300, rect.width * dpr);
    dustCanvas.height = Math.max(300, rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeDust();
  window.addEventListener('resize', resizeDust);

  let dustVisible = false;
  new IntersectionObserver((entries) => {
    dustVisible = entries[0]?.isIntersecting || false;
  }).observe(dustCanvas);

  function renderDust() {
    if (dustVisible && !reduceMotion) {
      const w = dustCanvas.clientWidth;
      const h = dustCanvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      dots.forEach((d) => {
        d.x = (d.x + d.vx + w) % w;
        d.y = (d.y + d.vy + h) % h;
        ctx.fillStyle = d.gold ? 'rgba(245, 184, 0, 0.55)' : 'rgba(247, 245, 239, 0.26)';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    requestAnimationFrame(renderDust);
  }
  renderDust();
}

// ============================================================================
// 9. HORIZONTAL FLEET GALLERY PARALLAX SHIFT (Desktop)
// ============================================================================
const fleetTrack = document.getElementById('fleetTrack');
const fleetWrap = document.getElementById('fleetTrackWrap');
if (fleetTrack && fleetWrap && !reduceMotion && window.innerWidth > 900) {
  gsap.to(fleetTrack, {
    x: () => -(Math.max(0, fleetTrack.scrollWidth - fleetWrap.clientWidth) * 0.62),
    ease: 'none',
    scrollTrigger: {
      trigger: '#frota',
      start: 'top 55%',
      end: 'center top',
      scrub: 0.7,
    },
  });
}

// ============================================================================
// 10. ARCHETYPE A CHAMELEON WORK CONFIGURATOR (GSAP FLIP + WHATSAPP FUNNEL)
// ============================================================================
const PROFILES = {
  reforma: {
    badge: 'REFORMA RESIDENCIAL',
    desc: 'Ideal para reforma de banheiro, cozinha, troca de pisos ou abertura de paredes. Entregue na vaga regulamentada sem obstruir a calçada.',
    img: './assets/img/cacamba-3d-render.png',
    defaultQty: 1,
  },
  construcao: {
    badge: 'CONSTRUÇÃO NOVA',
    desc: 'Atendimento contínuo para obra do alicerce ao acabamento com trocas programadas rápidas direto da nossa base no DIMPE II.',
    img: './assets/img/cacambas-fileira.jpg',
    defaultQty: 2,
  },
  demolicao: {
    badge: 'DEMOLIÇÃO & LIMPEZA',
    desc: 'Caçambas reforçadas de 4,2 m³ para concreto pesado, alvenaria estrutural e limpeza completa de terrenos em Indaiatuba.',
    img: './assets/img/icamento-poliguindaste.jpg',
    defaultQty: 3,
  },
  industrial: {
    badge: 'INDÚSTRIA · MUNCK · EMPILHADEIRA',
    desc: 'Condições comerciais diferenciadas para empresas e indústrias: caçambas, caminhão Munck para içamento pesado e empilhadeiras.',
    img: './assets/img/frota-patio.jpg',
    defaultQty: 4,
  },
};

const simShell = document.getElementById('simShell');
const simPreview = document.getElementById('simPreview');
const simBadge = document.getElementById('simBadge');
const simVolPill = document.getElementById('simVolPill');
const simVisualImg = document.getElementById('simVisualImg');
const simSpecTitle = document.getElementById('simSpecTitle');
const simSpecDesc = document.getElementById('simSpecDesc');
const simBairroTag = document.getElementById('simBairroTag');
const simMsgPreview = document.getElementById('simMsgPreview');
const simWaBtn = document.getElementById('simWaBtn');
const simBairro = document.getElementById('simBairro');
const simResiduo = document.getElementById('simResiduo');
const profileBtns = Array.from(document.querySelectorAll('[data-profile-btn]'));
const qtyBtns = Array.from(document.querySelectorAll('[data-qty]'));

let simState = {
  profile: 'reforma',
  qty: 1,
  bairro: simBairro?.value || 'Jardim Morada do Sol',
  residuo: simResiduo?.value || 'Alvenaria, tijolos e concreto',
};

function updateSimulator(animateFlip = false) {
  const cfg = PROFILES[simState.profile] || PROFILES.reforma;
  const flipState = animateFlip && !reduceMotion && simPreview ? Flip.getState([simBadge, simVolPill, simVisualImg]) : null;

  if (simShell) simShell.dataset.profile = simState.profile;
  if (simBadge) simBadge.textContent = cfg.badge;

  const isB2B = simState.qty >= 4 || simState.profile === 'industrial';
  const totalVol = (simState.qty * 4.2).toFixed(1).replace('.', ',');
  if (simVolPill) simVolPill.textContent = isB2B ? `${totalVol}+ m³` : `${totalVol} m³`;

  if (simVisualImg) {
    if (simVisualImg.getAttribute('src') !== cfg.img) {
      simVisualImg.setAttribute('src', cfg.img);
    }
    simVisualImg.classList.toggle('is-photo', !cfg.img.endsWith('.png'));
  }

  if (simSpecTitle) {
    if (simState.profile === 'industrial') {
      simSpecTitle.textContent = 'Plano Corporativo: Caçambas, Munck & Empilhadeira';
    } else {
      const plural = simState.qty > 1 ? 'Caçambas Estacionárias' : 'Caçamba Estacionária';
      simSpecTitle.textContent = `${simState.qty === 4 ? '4+' : simState.qty} ${plural} (${totalVol} m³)`;
    }
  }
  if (simSpecDesc) simSpecDesc.textContent = cfg.desc;
  if (simBairroTag) simBairroTag.textContent = simState.bairro.split('/')[0].trim();

  // UTM-aware contextual WhatsApp conversion message (whatsapp-conversion-funnel standard)
  const params = new URLSearchParams(window.location.search);
  const utm = params.get('utm_source') || 'site-oficial';
  const qtyTxt = simState.qty === 4 ? '4 ou mais caçambas (plano empresa)' : `${simState.qty} caçamba(s) de 4,2 m³`;
  const msg = `Olá JL Caçambas! Vim pelo simulador do site e preciso de orçamento para: ${cfg.badge} | ${qtyTxt} | Material: ${simState.residuo} | Bairro: ${simState.bairro} (Indaiatuba/SP). [Origem: ${utm}]`;

  if (simMsgPreview) simMsgPreview.textContent = `"${msg}"`;
  if (simWaBtn) {
    simWaBtn.href = `https://wa.me/5519989689696?text=${encodeURIComponent(msg)}`;
  }

  if (flipState) {
    Flip.from(flipState, {
      duration: 0.45,
      ease: 'power3.out',
      scale: true,
    });
    gsap.fromTo(simVisualImg, { y: 14, opacity: 0.5 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' });
  }
}

profileBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const p = btn.dataset.profileBtn;
    if (!p || !PROFILES[p]) return;
    simState.profile = p;
    simState.qty = PROFILES[p].defaultQty;
    profileBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
    qtyBtns.forEach((b) => b.classList.toggle('is-active', Number(b.dataset.qty) === simState.qty));
    updateSimulator(true);
  });
});

qtyBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    simState.qty = Number(btn.dataset.qty || 1);
    qtyBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
    updateSimulator(true);
  });
});

if (simBairro) {
  simBairro.addEventListener('change', () => {
    simState.bairro = simBairro.value;
    updateSimulator(false);
  });
}
if (simResiduo) {
  simResiduo.addEventListener('change', () => {
    simState.residuo = simResiduo.value;
    updateSimulator(false);
  });
}
updateSimulator(false);

// ============================================================================
// 11. ANIMATED STRIKETHROUGH MANIFESTO (--strike: 0 -> 1) + REVEALS
// ============================================================================
document.querySelectorAll('.strike-item').forEach((item) => {
  const s = item.querySelector('s');
  if (!s) return;
  if (reduceMotion) {
    s.style.setProperty('--strike', '1');
    return;
  }
  ScrollTrigger.create({
    trigger: item,
    start: 'top 76%',
    once: true,
    onEnter: () => {
      gsap.to(s, {
        '--strike': 1,
        duration: 0.55,
        ease: 'power2.inOut',
        onComplete: () => item.classList.add('is-struck'),
      });
    },
  });
});

if (!reduceMotion) {
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
}

// ============================================================================
// 12. MAGNETIC CTA MICRO-INTERACTION (Desktop pointer: fine only)
// ============================================================================
if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  document.querySelectorAll('.magnetic-btn').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.16;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.22;
      gsap.to(btn, { x: dx, y: dy, duration: 0.28, ease: 'power2.out' });
    });
    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, { x: 0, y: 0, duration: 0.42, ease: 'elastic.out(1, 0.5)' });
    });
  });
}
