import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * JL Cacambas 3D Engine (Archetype B Persistent Fixed WebGL Rig + Blender 5.3 PBR GLB)
 * - Loads assets/models/jl_cacamba.glb with full PBR textures (Albedo, Roughness, Normal)
 * - Uses PMREMGenerator + RoomEnvironment for studio-grade metallic reflections (60fps, zero external HDR)
 * - Controls all 74 individual debris pieces, rubble mound, and Lei 097/2017 waterproof tarp
 *   synchronously with GSAP ScrollTrigger across Hero -> Manifesto Filling -> 5-Step Operation!
 */
export function createCacamba3D({ canvas, stageEl, hudEl, phaseEl, barEl, volEl, captionEl }) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer = null;
  let active = true;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    console.warn('[JL-3D] WebGL unavailable:', err);
    if (stageEl) stageEl.style.display = 'none';
    return { setState() {}, isReady: () => false };
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.92;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  // Studio environment reflections via PMREMGenerator (Archetype B canonical standard)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.50;

  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, 0.1, 60);
  camera.position.set(0, 1.85, 6.2);
  camera.lookAt(0, 0.55, 0);

  // Calibrated 3-point warm industrial lighting (rich golden steel + crisp PBR relief)
  const keyLight = new THREE.DirectionalLight(0xfff4dc, 1.65);
  keyLight.position.set(4.5, 6.8, 5.2);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xaecbff, 0.65);
  fillLight.position.set(-5.0, 3.2, 3.0);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffb830, 1.25);
  rimLight.position.set(-2.5, 4.2, -5.0);
  scene.add(rimLight);

  const hemiLight = new THREE.HemisphereLight(0xf6f2e8, 0x0b0e14, 0.38);
  scene.add(hemiLight);

  // Pivot group controlled by scroll choreography
  const pivot = new THREE.Group();
  scene.add(pivot);

  // Target vs smoothed state for buttery 60fps damping
  const target = {
    x: 0,
    y: -0.58,
    z: 0,
    rotX: 0.18,
    rotY: -0.52,
    rotZ: 0,
    scale: 1.0,
    fill: 0.0,     // 0.0 (empty) -> 1.0 (full 4.2m3)
    tarp: 0.0,     // 0.0 (hidden) -> 1.0 (covered per Lei 097/2017)
    lift: 0.0,     // 0.0 (grounded) -> 1.0 (hydraulic hoist)
    opacity: 1.0,
    showHud: false,
    phaseText: 'ESTÁGIO 00 · UNIDADE PRONTA',
  };

  const current = { ...target };
  const pointer = { nx: 0, ny: 0, sx: 0, sy: 0 };

  let modelReady = false;
  let rootObj = null;
  let moundObj = null;
  let tarpObj = null;
  let debrisList = [];
  let impactImpulse = 0;
  let prevLandedCount = 0;

  // Load Blender 5.3 AAA GLB model
  const loader = new GLTFLoader();
  loader.load(
    './assets/models/jl_cacamba.glb',
    (gltf) => {
      rootObj = gltf.scene;
      pivot.add(rootObj);

      // Extract named Blender nodes (debris layers, rubble mound, tarp cover)
      // Note: Blender Z-up exports to glTF Y-up automatically!
      const rawPieces = [];
      rootObj.traverse((node) => {
        if (node.name === 'Debris_Mound_Core') {
          moundObj = node;
        } else if (node.name === 'Tarp_Cover') {
          tarpObj = node;
        } else if (/^Debris_L(\d+)_(\d+)$/.test(node.name)) {
          const m = node.name.match(/^Debris_L(\d+)_(\d+)$/);
          const layer = parseInt(m[1], 10);
          const idx = parseInt(m[2], 10);
          rawPieces.push({ node, layer, idx });
        }
        if (node.isMesh && node.material) {
          const mats = Array.isArray(node.material) ? node.material : [node.material];
          mats.forEach((mat) => {
            mat.envMapIntensity = 1.05;
          });
        }
      });

      // Blender exports one action per animated object into gltf.animations[] — scan ALL clips!
      const settledMap = new Map();
      if (gltf.animations && gltf.animations.length) {
        gltf.animations.forEach((clip) => {
          clip.tracks.forEach((tr) => {
            const dot = tr.name.lastIndexOf('.');
            if (dot === -1) return;
            const objName = tr.name.slice(0, dot);
            const prop = tr.name.slice(dot + 1);
            if (!settledMap.has(objName)) settledMap.set(objName, {});
            const vals = tr.values;
            if (prop === 'position' && vals.length >= 3) {
              const n = vals.length;
              settledMap.get(objName).pos = new THREE.Vector3(vals[n - 3], vals[n - 2], vals[n - 1]);
            } else if (prop === 'quaternion' && vals.length >= 4) {
              const n = vals.length;
              settledMap.get(objName).quat = new THREE.Quaternion(vals[n - 4], vals[n - 3], vals[n - 2], vals[n - 1]);
            }
          });
        });
      }

      rawPieces.sort((a, b) => a.layer - b.layer || a.idx - b.idx);
      const total = Math.max(1, rawPieces.length);

      debrisList = rawPieces.map((item, order) => {
        const info = settledMap.get(item.node.name) || {};
        // Fallback: if track wasn't found, subtract Blender's 2.8m pre-drop lift along glTF +Y
        const fallbackPos = item.node.position.clone();
        if (!info.pos && fallbackPos.y > 1.5) fallbackPos.y -= 2.8;
        const restPos = info.pos || fallbackPos;
        const restQuat = info.quat || item.node.quaternion.clone();
        const dropQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            ((order * 1.37) % 3.14) - 1.57,
            ((order * 2.11) % 6.28),
            ((order * 0.93) % 3.14) - 1.57
          )
        );
        // Sequential drop window in [0..1]
        const start = (order / total) * 0.84;
        const span = 0.16;
        return {
          node: item.node,
          restPos,
          restQuat,
          dropQuat,
          dropOffsetY: 2.1 + (order % 5) * 0.28,
          start,
          span,
        };
      });

      // Reset tarp rest transform cleanly to (0,0,0) & scale (1,1,1) reference
      if (tarpObj) {
        tarpObj.userData.restPos = new THREE.Vector3(0, 0, 0);
        tarpObj.visible = false;
      }
      if (moundObj) {
        moundObj.position.set(0, 0, 0);
        moundObj.scale.set(0.001, 0.001, 0.001);
        moundObj.visible = false;
      }

      modelReady = true;
      updateDebrisAndTarp(current.fill, current.tarp, true);
      renderer.render(scene, camera);
      window.__jl3dReady = true;
    },
    undefined,
    (err) => {
      console.error('[JL-3D] GLB load error:', err);
    }
  );

  function updateDebrisAndTarp(fillAmt, tarpAmt, force = false) {
    if (!modelReady) return;

    // 1. Gravel/rubble base mound rises progressively with fill
    if (moundObj) {
      if (fillAmt <= 0.02) {
        moundObj.visible = false;
      } else {
        moundObj.visible = true;
        const mProg = Math.min(1, fillAmt / 0.92);
        const sXZ = 0.72 + mProg * 0.28;
        const sY = Math.max(0.05, Math.pow(mProg, 0.85));
        moundObj.scale.set(sXZ, sY, sXZ);
        moundObj.position.set(0, (1 - sY) * 0.06, 0);
      }
    }

    // 2. Individual 74 debris pieces drop from above with gravity curve & settle cleanly
    let landedCount = 0;
    for (let i = 0; i < debrisList.length; i++) {
      const p = debrisList[i];
      const raw = (fillAmt - p.start) / p.span;
      if (raw <= 0) {
        p.node.visible = false;
        continue;
      }
      p.node.visible = true;
      const t = Math.min(1, raw);
      if (t >= 0.98) landedCount++;

      // Gravity ease-in + micro bounce at settle
      let fallEase;
      if (t < 0.85) {
        const u = t / 0.85;
        fallEase = u * u;
      } else {
        const u = (t - 0.85) / 0.15;
        fallEase = 1.0 - Math.sin(u * Math.PI) * 0.035;
      }

      const yOffset = (1 - fallEase) * p.dropOffsetY;
      p.node.position.set(
        p.restPos.x * (0.86 + 0.14 * fallEase),
        p.restPos.y + yOffset,
        p.restPos.z * (0.86 + 0.14 * fallEase)
      );
      p.node.quaternion.slerpQuaternions(p.dropQuat, p.restQuat, Math.min(1, fallEase * 1.08));
      const pop = Math.min(1, t * 4.5);
      p.node.scale.setScalar(pop);
    }

    if (!force && landedCount > prevLandedCount && fillAmt > 0.05) {
      impactImpulse = Math.min(0.045, impactImpulse + 0.008);
    }
    prevLandedCount = landedCount;

    // 3. Lei 097/2017 waterproof tarp unfolds cleanly over the top rim
    if (tarpObj) {
      if (tarpAmt <= 0.01) {
        tarpObj.visible = false;
      } else {
        tarpObj.visible = true;
        const te = 1 - Math.pow(1 - Math.min(1, tarpAmt), 3);
        tarpObj.scale.set(Math.max(0.02, te), 0.75 + 0.25 * te, 1.0);
        tarpObj.position.set((1 - te) * 1.25, (1 - te) * 0.12, 0);
      }
    }
  }

  // Responsive viewport framing
  function handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.fov = w < 880 ? 44 : 34;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
  }
  window.addEventListener('resize', handleResize);
  handleResize();

  window.addEventListener('pointermove', (e) => {
    pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  // External state setter driven by ScrollTrigger acts
  function setState(next) {
    Object.assign(target, next);
    if (stageEl) {
      stageEl.style.opacity = String(Math.max(0, Math.min(1, target.opacity)));
    }
    if (hudEl) {
      const vis = Boolean(target.showHud && target.opacity > 0.25);
      hudEl.classList.toggle('is-visible', vis);
      document.body.classList.toggle('hud3d-active', vis);
    }
    if (phaseEl && target.phaseText) {
      phaseEl.textContent = target.phaseText;
    }
    if (captionEl && target.phaseText) {
      captionEl.textContent = target.phaseText;
    }
  }

  const clock = new THREE.Clock();
  let lastRenderAt = 0;
  let avgFrameMs = 16;

  function tick(now = 0) {
    if (!active) return;
    requestAnimationFrame(tick);

    const dt = Math.min(0.05, clock.getDelta());
    const elapsed = clock.elapsedTime;
    const lerpK = reducedMotion ? 1.0 : Math.min(1, dt * 8.5);

    // Smooth camera/model transforms
    current.x += (target.x - current.x) * lerpK;
    current.y += (target.y - current.y) * lerpK;
    current.z += (target.z - current.z) * lerpK;
    current.rotX += (target.rotX - current.rotX) * lerpK;
    current.rotY += (target.rotY - current.rotY) * lerpK;
    current.rotZ += (target.rotZ - current.rotZ) * lerpK;
    current.scale += (target.scale - current.scale) * lerpK;
    current.fill += (target.fill - current.fill) * (reducedMotion ? 1.0 : Math.min(1, dt * 11));
    current.tarp += (target.tarp - current.tarp) * lerpK;
    current.lift += (target.lift - current.lift) * lerpK;
    current.opacity += (target.opacity - current.opacity) * lerpK;

    pointer.sx += (pointer.nx - pointer.sx) * Math.min(1, dt * 4);
    pointer.sy += (pointer.ny - pointer.sy) * Math.min(1, dt * 4);

    // Damped physical recoil when rubble lands inside
    impactImpulse *= Math.pow(0.04, dt);

    // Update live HUD fill metrics
    const vol = (current.fill * 4.2).toFixed(1).replace('.', ',');
    if (volEl) volEl.textContent = `${vol} m³`;
    if (barEl) barEl.style.width = `${Math.round(current.fill * 100)}%`;

    if (!modelReady || current.opacity < 0.02 || document.hidden) return;

    // Adaptive frame pacing: keep 60fps on GPUs, throttle gracefully if software rasterizer is slow
    const minInterval = avgFrameMs > 45 ? 180 : 0;
    if (minInterval > 0 && (now - lastRenderAt) < minInterval) return;

    const bob = reducedMotion ? 0 : Math.sin(elapsed * 1.45) * 0.032;
    const hoistY = current.lift * 0.42;
    const hoistTiltZ = current.lift * 0.09;

    pivot.position.set(
      current.x,
      current.y + bob + hoistY - impactImpulse * 1.4,
      current.z
    );
    pivot.rotation.set(
      current.rotX + pointer.sy * 0.06 + impactImpulse * 0.65,
      current.rotY + pointer.sx * 0.14,
      current.rotZ + hoistTiltZ
    );
    pivot.scale.setScalar(current.scale);

    updateDebrisAndTarp(current.fill, current.tarp);
    const t0 = performance.now();
    renderer.render(scene, camera);
    const renderMs = performance.now() - t0;
    avgFrameMs = avgFrameMs * 0.8 + renderMs * 0.2;
    lastRenderAt = now;
  }

  tick();

  return {
    setState,
    isReady: () => modelReady,
    getCurrent: () => ({ ...current }),
    forceSync: () => {
      Object.assign(current, target);
      if (modelReady) {
        pivot.position.set(current.x, current.y + current.lift * 0.42, current.z);
        pivot.rotation.set(current.rotX, current.rotY, current.rotZ + current.lift * 0.09);
        pivot.scale.setScalar(current.scale);
        updateDebrisAndTarp(current.fill, current.tarp, true);
        renderer.render(scene, camera);
      }
    },
  };
}
