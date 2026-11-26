/**
 * JL Cacambas Anti-Fraud Verification Badge — Damped Double-Pendulum Spring Physics & Metallic Chain Cord
 * Inspired by physical hanging 3D pass/lanyard interaction:
 * - Differential spring-pendulum integration (acc = -k * angle - c * vel + externalForce)
 * - Driven by scroll velocity impulses, nearby pointer parallax, direct drag-and-release, and subtle ambient breeze
 * - Renders a HiDPI metallic industrial chain cord with catenary sag and swivel clasp on cordCanvas
 * - Honors prefers-reduced-motion: reduce (clean static rest render)
 */

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function traceRoundedRect(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  const rad = Array.isArray(r) ? r[2] || r[0] || 0 : r;
  const rr = Math.min(rad, w * 0.5, h * 0.5);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

export function initVerificationBadgePhysics({ containerEl, cardEl, cordCanvas } = {}) {
  const stub = {
    impulse() {},
    forceSync() {},
  };

  if (!containerEl || !cardEl) return stub;

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ctx = cordCanvas ? cordCanvas.getContext('2d') : null;

  // Physics state (primary pendulum + secondary card swing + 3D perspective tilt + elastic pull)
  const state = {
    angle: 0,
    vel: 0,
    cardTwist: 0,
    cardTwistVel: 0,
    tiltY: 0,
    tiltYVel: 0,
    tiltX: 0,
    tiltXVel: 0,
    pullX: 0,
    pullY: 0,
    pullVx: 0,
    pullVy: 0,
  };

  // Layout anchor metrics measured cleanly without transform distortion
  const geom = {
    width: 320,
    height: 440,
    dpr: 1,
    anchorX: 160,
    anchorY: 0,
    restClaspX: 160,
    restClaspY: 112,
    cordLen: 112,
  };

  const drag = {
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    velX: 0,
    velY: 0,
  };

  const pointer = {
    active: false,
    nx: 0,
    ny: 0,
    proximity: 0,
  };

  let lastScrollY = window.scrollY || 0;
  let scrollImpulseQueue = 0;
  let isVisible = true;
  let rafId = null;
  let lastTime = performance.now();
  let startTime = lastTime;

  // Prepare card for clean hardware-accelerated 3D pivot from top clasp
  cardEl.style.transformOrigin = '50% 0%';
  cardEl.style.willChange = 'transform';
  cardEl.style.userSelect = 'none';
  if (!reducedMotion) {
    cardEl.style.cursor = 'grab';
    cardEl.style.touchAction = 'none';
  }

  function measureGeometry() {
    const prevTransform = cardEl.style.transform;
    cardEl.style.transform = 'none';

    const cRect = containerEl.getBoundingClientRect();
    const kRect = cardEl.getBoundingClientRect();

    cardEl.style.transform = prevTransform;

    const w = Math.max(120, Math.round(cRect.width || containerEl.clientWidth || 320));
    const h = Math.max(200, Math.round(cRect.height || containerEl.clientHeight || 420));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    geom.width = w;
    geom.height = h;
    geom.dpr = dpr;

    if (kRect.width > 0 && cRect.width > 0) {
      geom.restClaspX = kRect.left - cRect.left + kRect.width * 0.5;
      geom.restClaspY = Math.max(28, kRect.top - cRect.top + 6);
    } else {
      geom.restClaspX = w * 0.5;
      geom.restClaspY = Math.max(64, h * 0.24);
    }

    geom.anchorX = geom.restClaspX;
    geom.anchorY = 0;
    geom.cordLen = Math.max(40, geom.restClaspY - geom.anchorY);

    if (cordCanvas && ctx) {
      cordCanvas.width = Math.round(w * dpr);
      cordCanvas.height = Math.round(h * dpr);
      cordCanvas.style.width = `${w}px`;
      cordCanvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function getClaspPosition() {
    const swingDx = Math.sin(state.angle) * geom.cordLen * 0.56 + state.pullX;
    const swingDy = (1 - Math.cos(state.angle)) * geom.cordLen * 0.16 + state.pullY;
    return {
      dx: swingDx,
      dy: swingDy,
      claspX: geom.restClaspX + swingDx,
      claspY: Math.max(18, geom.restClaspY + swingDy),
    };
  }

  function applyCardTransform(pos) {
    if (reducedMotion) {
      cardEl.style.transform = 'perspective(1100px) translate3d(0px, 0px, 0) rotateZ(0deg) rotateY(0deg) rotateX(0deg)';
      return;
    }
    const thetaDeg = ((state.angle + state.cardTwist * 0.55) * 180) / Math.PI;
    const tiltYDeg = clamp((state.tiltY * 180) / Math.PI, -28, 28);
    const tiltXDeg = clamp((state.tiltX * 180) / Math.PI, -22, 22);

    cardEl.style.transform =
      `perspective(1100px) translate3d(${pos.dx.toFixed(2)}px, ${pos.dy.toFixed(2)}px, 0) ` +
      `rotateZ(${thetaDeg.toFixed(2)}deg) rotateY(${tiltYDeg.toFixed(2)}deg) rotateX(${tiltXDeg.toFixed(2)}deg)`;
  }

  function drawMetallicCord(pos) {
    if (!ctx || !cordCanvas) return;

    ctx.clearRect(0, 0, geom.width, geom.height);

    const ax = geom.anchorX;
    const ay = geom.anchorY;
    const cx = pos.claspX;
    const cy = pos.claspY;

    const dx = cx - ax;
    const dy = cy - ay;
    const dist = Math.hypot(dx, dy);

    // Physical catenary sag relaxes when user pulls downward, bows slightly with angular velocity
    const tension = clamp((dist - geom.cordLen) / 48, 0, 1);
    const sag = (1 - tension) * 11 + Math.abs(state.vel) * 2.5;
    const ctrlX = (ax + cx) * 0.5 - state.vel * 10 + state.pullX * 0.12;
    const ctrlY = (ay + cy) * 0.5 + sag;

    // 1. Subtle soft drop shadow beneath chain
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ax + 4, ay + 2);
    ctx.quadraticCurveTo(ctrlX + 4, ctrlY + 3, cx + 4, cy + 3);
    ctx.strokeStyle = 'rgba(10, 14, 20, 0.22)';
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // 2. Top industrial mounting grommet/bracket at y = 0
    ctx.save();
    const mountGrad = ctx.createLinearGradient(ax - 16, 0, ax + 16, 12);
    mountGrad.addColorStop(0, '#3a414d');
    mountGrad.addColorStop(0.5, '#d7dde6');
    mountGrad.addColorStop(1, '#262b35');
    ctx.fillStyle = mountGrad;
    ctx.beginPath();
    traceRoundedRect(ctx, ax - 15, -2, 30, 12, [0, 0, 6, 6]);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top anchor ring
    ctx.beginPath();
    ctx.arc(ax, 10, 5.5, 0, Math.PI * 2);
    ctx.strokeStyle = '#aeb6c2';
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.restore();

    // 3. Individual metallic chain links sampled along quadratic Bezier curve
    const approxLen = Math.max(32, dist + sag * 0.45);
    const linkStep = 9.2;
    const numLinks = Math.max(4, Math.floor(approxLen / linkStep));

    for (let i = 0; i <= numLinks; i++) {
      const t = i / numLinks;
      const omt = 1 - t;
      const px = omt * omt * ax + 2 * omt * t * ctrlX + t * t * cx;
      const py = omt * omt * ay + 2 * omt * t * ctrlY + t * t * cy;

      const tx = 2 * omt * (ctrlX - ax) + 2 * t * (cx - ctrlX);
      const ty = 2 * omt * (ctrlY - ay) + 2 * t * (cy - ctrlY);
      const ang = Math.atan2(ty, tx);

      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang);

      if (i % 2 === 0) {
        // Face-on stadium steel link
        const linkGrad = ctx.createLinearGradient(-6, -4, 6, 4);
        linkGrad.addColorStop(0.0, '#596170');
        linkGrad.addColorStop(0.35, '#eef2f7');
        linkGrad.addColorStop(0.65, '#8c95a5');
        linkGrad.addColorStop(1.0, '#2e3440');

        ctx.beginPath();
        traceRoundedRect(ctx, -6.2, -3.6, 12.4, 7.2, 3.6);
        ctx.strokeStyle = linkGrad;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Specular steel glint
        ctx.beginPath();
        ctx.moveTo(-3.2, -2.6);
        ctx.lineTo(2.4, -2.6);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 0.9;
        ctx.stroke();
      } else {
        // Edge-on interlocking steel link
        const edgeGrad = ctx.createLinearGradient(-5, -1.8, 5, 1.8);
        edgeGrad.addColorStop(0.0, '#363c48');
        edgeGrad.addColorStop(0.45, '#f2f5fa');
        edgeGrad.addColorStop(1.0, '#2b303a');

        ctx.beginPath();
        traceRoundedRect(ctx, -5.8, -1.6, 11.6, 3.2, 1.6);
        ctx.fillStyle = edgeGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(18, 22, 30, 0.45)';
        ctx.lineWidth = 0.7;
        ctx.stroke();
      }

      ctx.restore();
    }

    // 4. Swivel metallic clasp / grommet locked onto the top edge of the badge card
    const endTx = 2 * (cx - ctrlX);
    const endTy = 2 * (cy - ctrlY);
    const endAng = Math.atan2(endTy, endTx) - Math.PI * 0.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(endAng * 0.5 + state.angle * 0.45);

    const claspGrad = ctx.createLinearGradient(-8, -12, 8, 6);
    claspGrad.addColorStop(0.0, '#2f3542');
    claspGrad.addColorStop(0.42, '#eef2f8');
    claspGrad.addColorStop(0.75, '#7e8899');
    claspGrad.addColorStop(1.0, '#252a34');

    // Swivel neck + clamp jaw
    ctx.fillStyle = claspGrad;
    ctx.beginPath();
    traceRoundedRect(ctx, -7.5, -11, 15, 14, 4);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Rivet pin
    ctx.beginPath();
    ctx.arc(0, -3.5, 2.4, 0, Math.PI * 2);
    ctx.fillStyle = '#1b1f27';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-0.6, -4.1, 0.9, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fill();

    ctx.restore();
  }

  function stepPhysics(dt, nowMs) {
    if (reducedMotion) return;

    const elapsedSec = (nowMs - startTime) * 0.001;
    // Substep for rock-solid spring integration across 60Hz/120Hz/144Hz monitors
    const steps = dt > 0.018 ? 2 : 1;
    const h = dt / steps;

    for (let s = 0; s < steps; s++) {
      // Micro-breeze (very low amplitude so badge always feels suspended in real air)
      const breeze = Math.sin(elapsedSec * 1.12) * 0.095 + Math.sin(elapsedSec * 2.38 + 1.1) * 0.042;

      // Scroll velocity impulse
      let scrollForce = 0;
      if (Math.abs(scrollImpulseQueue) > 0.0001) {
        scrollForce = scrollImpulseQueue;
        scrollImpulseQueue = 0;
      }

      // Nearby pointer parallax force
      const pointerForceAngle = pointer.active ? pointer.nx * pointer.proximity * 2.1 : 0;
      const pointerTargetTiltY = pointer.active ? pointer.nx * pointer.proximity * 0.24 : 0;
      const pointerTargetTiltX = pointer.active ? -pointer.ny * pointer.proximity * 0.16 : 0;

      if (drag.active) {
        // While dragging: spring-follow the pulled angle and damped tilt
        const desiredAngle = clamp(-state.pullX / Math.max(70, geom.cordLen * 1.35), -0.68, 0.68);
        state.angle += (desiredAngle - state.angle) * Math.min(1, h * 18);
        state.vel = (desiredAngle - state.angle) * 6;
        state.cardTwist += (desiredAngle * 0.32 - state.cardTwist) * Math.min(1, h * 14);
        state.cardTwistVel = 0;

        const targetTY = clamp(state.pullX * 0.0042 + drag.velX * 0.008, -0.45, 0.45);
        const targetTX = clamp(-state.pullY * 0.0032 - drag.velY * 0.006, -0.34, 0.34);
        state.tiltY += (targetTY - state.tiltY) * Math.min(1, h * 16);
        state.tiltX += (targetTX - state.tiltX) * Math.min(1, h * 16);
      } else {
        // Primary pendulum: acc = -k * angle - c * vel + externalForce
        const k = 26.0;
        const c = 3.2;
        const externalForce = breeze + pointerForceAngle + scrollForce;
        const acc = -k * state.angle - c * state.vel + externalForce;
        state.vel += acc * h;
        state.angle += state.vel * h;
        state.angle = clamp(state.angle, -0.82, 0.82);

        // Secondary pendulum (card inertia pivoting below the clasp)
        const k2 = 38.0;
        const c2 = 4.6;
        const twistAcc = -k2 * (state.cardTwist - state.angle * 0.42) - c2 * state.cardTwistVel + externalForce * 0.28;
        state.cardTwistVel += twistAcc * h;
        state.cardTwist += state.cardTwistVel * h;

        // Elastic pull-back to neutral rest (0, 0) after user release
        const kp = 56.0;
        const cp = 7.4;
        const axPull = -kp * state.pullX - cp * state.pullVx;
        const ayPull = -kp * state.pullY - cp * state.pullVy;
        state.pullVx += axPull * h;
        state.pullVy += ayPull * h;
        state.pullX += state.pullVx * h;
        state.pullY += state.pullVy * h;

        // 3D perspective tilt coupled to angular velocity + pointer parallax
        const targetTiltY = pointerTargetTiltY - state.vel * 0.14;
        const targetTiltX = pointerTargetTiltX + Math.abs(state.vel) * 0.04;
        const tYAcc = -32 * (state.tiltY - targetTiltY) - 5.2 * state.tiltYVel;
        const tXAcc = -30 * (state.tiltX - targetTiltX) - 5.4 * state.tiltXVel;
        state.tiltYVel += tYAcc * h;
        state.tiltXVel += tXAcc * h;
        state.tiltY += state.tiltYVel * h;
        state.tiltX += state.tiltXVel * h;
      }
    }
  }

  function renderFrame() {
    const pos = getClaspPosition();
    applyCardTransform(pos);
    drawMetallicCord(pos);
  }

  function tick(now) {
    rafId = requestAnimationFrame(tick);
    if (!isVisible || document.hidden) {
      lastTime = now;
      return;
    }
    const dt = clamp((now - lastTime) * 0.001, 0.001, 0.033);
    lastTime = now;
    stepPhysics(dt, now);
    renderFrame();
  }

  // 1. Scroll velocity impulse listener
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY || 0;
      const delta = y - lastScrollY;
      lastScrollY = y;
      if (reducedMotion || drag.active || !isVisible) return;
      const capped = clamp(delta, -140, 140);
      scrollImpulseQueue += -capped * 0.11;
      state.tiltXVel += clamp(capped * 0.012, -1.8, 1.8);
    },
    { passive: true }
  );

  // 2. Nearby mouse parallax listener
  window.addEventListener(
    'pointermove',
    (e) => {
      if (reducedMotion || drag.active) return;
      const rect = containerEl.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.55;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      const radius = 480;
      if (dist < radius) {
        pointer.active = true;
        pointer.proximity = 1 - dist / radius;
        pointer.nx = clamp(dx / (rect.width * 0.65 || 200), -1, 1);
        pointer.ny = clamp(dy / (rect.height * 0.65 || 240), -1, 1);
      } else {
        pointer.active = false;
        pointer.proximity = 0;
      }
    },
    { passive: true }
  );

  // 3. Direct drag-and-release physics on cardEl
  if (!reducedMotion) {
    cardEl.addEventListener('pointerdown', (e) => {
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('a, button')) {
        return;
      }
      drag.active = true;
      drag.pointerId = e.pointerId;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.velX = 0;
      drag.velY = 0;
      cardEl.style.cursor = 'grabbing';
      if (cardEl.setPointerCapture) {
        try {
          cardEl.setPointerCapture(e.pointerId);
        } catch (_err) {
          // Ignore
        }
      }
    });

    cardEl.addEventListener('pointermove', (e) => {
      if (!drag.active || (drag.pointerId !== null && e.pointerId !== drag.pointerId)) return;
      const rawDx = e.clientX - drag.startX;
      const rawDy = e.clientY - drag.startY;
      const stepDx = e.clientX - drag.lastX;
      const stepDy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;
      drag.velX = drag.velX * 0.55 + stepDx * 0.45;
      drag.velY = drag.velY * 0.55 + stepDy * 0.45;

      // Elastic hyperbolic resistance so card never tears off the screen
      const maxPullX = 115;
      const maxPullY = 72;
      state.pullX = maxPullX * Math.tanh(rawDx / maxPullX);
      state.pullY = maxPullY * Math.tanh(rawDy / maxPullY);
    });

    const releaseDrag = () => {
      if (!drag.active) return;
      drag.active = false;
      cardEl.style.cursor = 'grab';
      if (drag.pointerId !== null && cardEl.releasePointerCapture) {
        try {
          cardEl.releasePointerCapture(drag.pointerId);
        } catch (_err) {
          // Ignore
        }
      }
      drag.pointerId = null;

      // Transfer release displacement + throw velocity into spring pendulum momentum
      state.pullVx = clamp(drag.velX * 14, -480, 480);
      state.pullVy = clamp(drag.velY * 12, -360, 360);
      state.vel += clamp(-drag.velX * 0.085 - state.pullX * 0.018, -4.5, 4.5);
      state.cardTwistVel += clamp(-drag.velX * 0.055, -3.2, 3.2);
      state.tiltYVel += clamp(drag.velX * 0.06, -3.5, 3.5);
    };

    cardEl.addEventListener('pointerup', releaseDrag);
    cardEl.addEventListener('pointercancel', releaseDrag);
  }

  // ResizeObserver & IntersectionObserver
  measureGeometry();
  renderFrame();

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      measureGeometry();
      renderFrame();
    });
    ro.observe(containerEl);
  }
  window.addEventListener('resize', () => {
    measureGeometry();
    renderFrame();
  });

  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const wasVisible = isVisible;
        isVisible = entry ? entry.isIntersecting : true;
        if (isVisible && !wasVisible && !reducedMotion) {
          // Subtle welcoming swing when badge scrolls into view
          state.vel += 0.95;
          state.tiltYVel += 0.65;
          lastTime = performance.now();
        }
      },
      { rootMargin: '80px 0px' }
    );
    io.observe(containerEl);
  }

  if (!reducedMotion) {
    lastTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function impulse(strength = 1.0) {
    const s = Number(strength);
    const val = Number.isFinite(s) ? s : 1.0;
    if (reducedMotion) {
      renderFrame();
      return;
    }
    state.vel += clamp(val * 1.65, -5.5, 5.5);
    state.cardTwistVel += clamp(val * 0.95, -4.0, 4.0);
    state.tiltYVel += clamp(val * 1.15, -4.2, 4.2);
    state.tiltXVel += clamp(Math.abs(val) * 0.45, 0, 2.4);
  }

  function forceSync() {
    measureGeometry();
    renderFrame();
  }

  return {
    impulse,
    forceSync,
  };
}
