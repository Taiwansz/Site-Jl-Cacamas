import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * JL Cacambas 3D WebGL & Physics Rig Engine
 * - Shared single-download Promise cache (loadSharedGLB) for ./assets/models/jl_cacamba.glb
 * - Full multi-clip Blender glTF animation scan to extract exact restPos & restQuat for all 74 Debris_L* pieces
 * - Export 1: createHeroRig3D (Persistent WebGL stage, studio gallery -> obsidian PBR lighting,
 *   3D chromed steel poliguindaste chains via InstancedMesh + CatmullRomCurve3, 28-block opening implosion, contact shadow)
 * - Export 2: createBuilderRig3D (Contained interactive 360-deg dumpster builder with gravity drop,
 *   rubble recoil, 3D dust burst particles, Lei 097/2017 waterproof tarp, and hydraulic hoist chains)
 */

const GLB_URL = './assets/models/jl_cacamba.glb';
let sharedGlbPromise = null;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(t) {
  const u = 1 - clamp01(t);
  return 1 - u * u * u;
}

function easeOutBack(t) {
  const x = clamp01(t);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/**
 * Downloads ./assets/models/jl_cacamba.glb once and caches both the parsed GLTF
 * and the complete settled transform map across ALL Blender glTF animation clips.
 */
export function loadSharedGLB() {
  if (!sharedGlbPromise) {
    sharedGlbPromise = new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        GLB_URL,
        (gltf) => {
          // Blender glTF exports one clip per animated object: scan EVERY clip in gltf.animations[]
          const settledMap = new Map();
          if (gltf.animations && gltf.animations.length) {
            for (let c = 0; c < gltf.animations.length; c++) {
              const clip = gltf.animations[c];
              if (!clip || !clip.tracks) continue;
              for (let t = 0; t < clip.tracks.length; t++) {
                const tr = clip.tracks[t];
                const dot = tr.name.lastIndexOf('.');
                if (dot === -1) continue;
                const objName = tr.name.slice(0, dot);
                const prop = tr.name.slice(dot + 1);
                if (!settledMap.has(objName)) settledMap.set(objName, {});
                const entry = settledMap.get(objName);
                const vals = tr.values;
                if (prop === 'position' && vals.length >= 3) {
                  const n = vals.length;
                  entry.pos = new THREE.Vector3(vals[n - 3], vals[n - 2], vals[n - 1]);
                } else if (prop === 'quaternion' && vals.length >= 4) {
                  const n = vals.length;
                  entry.quat = new THREE.Quaternion(vals[n - 4], vals[n - 3], vals[n - 2], vals[n - 1]);
                }
              }
            }
          }
          resolve({ gltf, settledMap });
        },
        undefined,
        (err) => {
          sharedGlbPromise = null;
          reject(err);
        }
      );
    });
  }
  return sharedGlbPromise;
}

/**
 * Produces an isolated scene graph clone from the cached GLB with independent material
 * clones (sharing GPU textures) and rebuilt references to Debris_Mound_Core, Tarp_Cover,
 * and all 74 ordered Debris_L* pieces.
 */
function cloneDumpsterAsset(cached, envIntensity = 1.05) {
  const root = cached.gltf.scene.clone(true);
  const { settledMap } = cached;

  let moundObj = null;
  let tarpObj = null;
  const rawPieces = [];

  root.traverse((node) => {
    if (node.name === 'Debris_Mound_Core') {
      moundObj = node;
    } else if (node.name === 'Tarp_Cover') {
      tarpObj = node;
    } else if (/^Debris_L(\d+)_(\d+)$/.test(node.name)) {
      const m = node.name.match(/^Debris_L(\d+)_(\d+)$/);
      rawPieces.push({
        node,
        layer: parseInt(m[1], 10),
        idx: parseInt(m[2], 10),
      });
    }

    if (node.isMesh && node.material) {
      if (Array.isArray(node.material)) {
        node.material = node.material.map((mat) => {
          const cloned = mat.clone();
          cloned.envMapIntensity = envIntensity;
          return cloned;
        });
      } else {
        const cloned = node.material.clone();
        cloned.envMapIntensity = envIntensity;
        node.material = cloned;
      }
    }
  });

  rawPieces.sort((a, b) => a.layer - b.layer || a.idx - b.idx);
  const total = Math.max(1, rawPieces.length);

  const debrisList = rawPieces.map((item, order) => {
    const info = settledMap.get(item.node.name) || {};
    const fallbackPos = item.node.position.clone();
    if (!info.pos && fallbackPos.y > 1.5) fallbackPos.y -= 2.8;

    const restPos = info.pos ? info.pos.clone() : fallbackPos;
    const restQuat = info.quat ? info.quat.clone() : item.node.quaternion.clone();
    const dropQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        ((order * 1.37) % 3.14) - 1.57,
        (order * 2.11) % 6.28,
        ((order * 0.93) % 3.14) - 1.57
      )
    );

    const start = (order / total) * 0.84;
    const span = 0.16;
    item.node.visible = false;

    return {
      node: item.node,
      layer: item.layer,
      restPos,
      restQuat,
      dropQuat,
      dropOffsetY: 2.15 + (order % 5) * 0.28,
      start,
      span,
    };
  });

  if (tarpObj) {
    tarpObj.userData.restPos = new THREE.Vector3(0, 0, 0);
    tarpObj.position.set(0, 0, 0);
    tarpObj.scale.set(1, 1, 1);
    tarpObj.visible = false;
  }

  if (moundObj) {
    moundObj.position.set(0, 0, 0);
    moundObj.scale.set(0.001, 0.001, 0.001);
    moundObj.visible = false;
  }

  return { root, moundObj, tarpObj, debrisList };
}

/**
 * Closed stadium-profile 3D curve for authentic industrial steel chain links.
 * Long axis sits on local X so instanced alignment along a CatmullRomCurve3 tangent is direct.
 */
class StadiumLinkCurve extends THREE.Curve {
  constructor(straightHalf = 0.095, arcRadius = 0.072) {
    super();
    this.s = straightHalf;
    this.r = arcRadius;
    this.straightLen = straightHalf * 2;
    this.arcLen = Math.PI * arcRadius;
    this.totalLen = this.straightLen * 2 + this.arcLen * 2;
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    let d = (((t % 1) + 1) % 1) * this.totalLen;
    const { s, r, straightLen, arcLen } = this;

    if (d < straightLen) {
      const u = d / straightLen;
      return optionalTarget.set(-s + u * straightLen, r, 0);
    }
    d -= straightLen;

    if (d < arcLen) {
      const a = Math.PI * 0.5 - (d / arcLen) * Math.PI;
      return optionalTarget.set(s + Math.cos(a) * r, Math.sin(a) * r, 0);
    }
    d -= arcLen;

    if (d < straightLen) {
      const u = d / straightLen;
      return optionalTarget.set(s - u * straightLen, -r, 0);
    }
    d -= straightLen;

    const a = -Math.PI * 0.5 - (d / arcLen) * Math.PI;
    return optionalTarget.set(-s + Math.cos(a) * r, Math.sin(a) * r, 0);
  }
}

let cachedChainLinkGeo = null;
function getChainLinkGeometry() {
  if (!cachedChainLinkGeo) {
    const curve = new StadiumLinkCurve(0.096, 0.070);
    cachedChainLinkGeo = new THREE.TubeGeometry(curve, 26, 0.031, 10, true);
  }
  return cachedChainLinkGeo;
}

/**
 * Soft radial alpha contact shadow texture so the dumpster sits grounded
 * on both light gallery (#ECEAE4) and dark surfaces without shadow-map overhead.
 */
function createContactShadowMesh(width = 4.4, depth = 2.95) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 256, 256);
    ctx.save();
    ctx.translate(128, 128);
    ctx.scale(1.0, 0.72);
    const g = ctx.createRadialGradient(0, 0, 14, 0, 0, 124);
    g.addColorStop(0.0, 'rgba(10, 14, 22, 0.44)');
    g.addColorStop(0.36, 'rgba(10, 14, 22, 0.28)');
    g.addColorStop(0.68, 'rgba(10, 14, 22, 0.09)');
    g.addColorStop(1.0, 'rgba(10, 14, 22, 0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 124, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const geo = new THREE.PlaneGeometry(width, depth);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI * 0.5;
  mesh.position.set(0, 0.012, 0);
  return mesh;
}

/**
 * Soft circular dust sprite texture for 3D rubble burst particles in the interactive builder.
 */
function createDustSpriteTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0.0, 'rgba(255, 255, 255, 0.92)');
    g.addColorStop(0.42, 'rgba(255, 255, 255, 0.48)');
    g.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Reusable scratch math objects to keep 60fps loops GC-free
const _pos = new THREE.Vector3();
const _tan = new THREE.Vector3();
const _side = new THREE.Vector3();
const _binorm = new THREE.Vector3();
const _refUp = new THREE.Vector3(0, 0, 1);
const _altUp = new THREE.Vector3(0, 1, 0);
const _basisMat = new THREE.Matrix4();
const _rollQuat = new THREE.Quaternion();
const _baseQuat = new THREE.Quaternion();
const _finalQuat = new THREE.Quaternion();
const _scaleVec = new THREE.Vector3();
const _instMat = new THREE.Matrix4();
const _xAxis = new THREE.Vector3(1, 0, 0);

/**
 * Populates an InstancedMesh of interlocked stadium links along a CatmullRomCurve3.
 * Dynamically calibrates link scale to the curve arc length so adjacent links always interlock.
 */
function updateChainAlongCurve(instMesh, curve, count, options = {}) {
  const {
    baseLinkPitch = 0.245,
    minScale = 0.62,
    maxScale = 1.65,
    twistOffset = 0,
    twistRate = 0.55,
    thicknessScale = 1.0,
    startIndex = 0,
  } = options;

  const arcLen = Math.max(0.2, curve.getLength());
  const spacing = arcLen / Math.max(1, count - 1);
  const autoScale = clamp(spacing / baseLinkPitch, minScale, maxScale) * thicknessScale;
  _scaleVec.set(autoScale, autoScale, autoScale);

  for (let i = 0; i < count; i++) {
    const u = count > 1 ? i / (count - 1) : 0.5;
    curve.getPointAt(u, _pos);
    curve.getTangentAt(u, _tan).normalize();

    const up = Math.abs(_tan.dot(_refUp)) > 0.92 ? _altUp : _refUp;
    _side.crossVectors(_tan, up).normalize();
    _binorm.crossVectors(_side, _tan).normalize();

    _basisMat.makeBasis(_tan, _binorm, _side);
    _baseQuat.setFromRotationMatrix(_basisMat);

    const roll = (i % 2 === 0 ? 0 : Math.PI * 0.5) + twistOffset + u * twistRate;
    _rollQuat.setFromAxisAngle(_xAxis, roll);
    _finalQuat.copy(_baseQuat).multiply(_rollQuat);

    _instMat.compose(_pos, _finalQuat, _scaleVec);
    instMesh.setMatrixAt(startIndex + i, _instMat);
  }
  instMesh.instanceMatrix.needsUpdate = true;
}

// ============================================================================
// EXPORT 1: HERO PERSISTENT 3D RIG (WEBLOVE CHROME CHAINS + IMPLOSION + GLB)
// ============================================================================
export function createHeroRig3D({ canvas, stageEl } = {}) {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const fallbackApi = {
    setState() {},
    triggerImplosion() {},
    isReady: () => false,
    forceSync() {},
  };

  if (!canvas) {
    if (stageEl) stageEl.style.display = 'none';
    return fallbackApi;
  }

  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    console.warn('[JL-Hero3D] WebGL unavailable:', err);
    if (stageEl) stageEl.style.display = 'none';
    return fallbackApi;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose();
  pmrem.dispose();
  scene.environment = envTex;
  scene.environmentIntensity = 0.72;

  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / Math.max(1, window.innerHeight), 0.1, 80);
  camera.position.set(0, 1.55, 6.7);
  camera.lookAt(0, 0.38, 0);

  // Studio Gallery (#ECEAE4) <-> Obsidian (#0A0C10) calibrated PBR lighting
  const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.85);
  keyLight.position.set(4.8, 7.2, 5.8);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xc2d8fa, 0.85);
  fillLight.position.set(-5.2, 3.6, 4.0);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffd27a, 1.35);
  rimLight.position.set(-2.4, 4.4, -5.2);
  scene.add(rimLight);

  const chromeSpecLight = new THREE.DirectionalLight(0xffffff, 0.55);
  chromeSpecLight.position.set(5.4, -1.2, 4.8);
  scene.add(chromeSpecLight);

  const hemiLight = new THREE.HemisphereLight(0xfaf7ef, 0x1b202b, 0.58);
  scene.add(hemiLight);

  const lightRimColor = new THREE.Color(0xffcf70);
  const darkRimColor = new THREE.Color(0xdbe8ff);
  const lightKeyColor = new THREE.Color(0xfff5e4);
  const darkKeyColor = new THREE.Color(0xeef3ff);

  // Dumpster pivot + contact shadow
  const dumpsterGroup = new THREE.Group();
  scene.add(dumpsterGroup);

  const contactShadow = createContactShadowMesh(4.5, 3.0);
  dumpsterGroup.add(contactShadow);

  // Chromed steel chains (WEBLOVE signature + JL poliguindaste steel)
  const linkGeo = getChainLinkGeometry();
  const chainMat = new THREE.MeshStandardMaterial({
    color: 0xe3e8ef,
    metalness: 0.96,
    roughness: 0.14,
    envMapIntensity: 1.65,
  });

  const CHAIN_LINKS = 62;
  const chainA = new THREE.InstancedMesh(linkGeo, chainMat, CHAIN_LINKS);
  const chainB = new THREE.InstancedMesh(linkGeo, chainMat, CHAIN_LINKS);
  chainA.frustumCulled = false;
  chainB.frustumCulled = false;
  scene.add(chainA);
  scene.add(chainB);

  const ptsA = Array.from({ length: 5 }, () => new THREE.Vector3());
  const ptsB = Array.from({ length: 5 }, () => new THREE.Vector3());
  const curveA = new THREE.CatmullRomCurve3(ptsA, false, 'centripetal', 0.5);
  const curveB = new THREE.CatmullRomCurve3(ptsB, false, 'centripetal', 0.5);

  // 28 Industrial metallic & concrete blocks for opening implosion (triggerImplosion)
  const implosionGroup = new THREE.Group();
  scene.add(implosionGroup);

  const fragGeoBox = new THREE.BoxGeometry(0.26, 0.18, 0.22);
  const fragGeoSlab = new THREE.BoxGeometry(0.32, 0.10, 0.20);
  const fragGeoCube = new THREE.BoxGeometry(0.18, 0.18, 0.18);
  const fragGeos = [fragGeoBox, fragGeoSlab, fragGeoCube];

  const fragChromeMat = new THREE.MeshStandardMaterial({
    color: 0xdbe1ea,
    metalness: 0.94,
    roughness: 0.18,
    envMapIntensity: 1.5,
  });
  const fragConcreteMat = new THREE.MeshStandardMaterial({
    color: 0x8f949c,
    metalness: 0.08,
    roughness: 0.84,
    envMapIntensity: 0.55,
  });
  const fragYellowMat = new THREE.MeshStandardMaterial({
    color: 0xf5b800,
    metalness: 0.35,
    roughness: 0.34,
    envMapIntensity: 1.0,
  });
  const fragMats = [fragChromeMat, fragConcreteMat, fragYellowMat];

  const FRAG_COUNT = 28;
  const fragments = [];
  for (let i = 0; i < FRAG_COUNT; i++) {
    const mesh = new THREE.Mesh(fragGeos[i % fragGeos.length], fragMats[i % fragMats.length]);
    const theta = (i / FRAG_COUNT) * Math.PI * 2 + (i % 3) * 0.28;
    const phi = ((i * 1.618) % 1) * 1.55 - 0.75;
    const startR = 4.6 + (i % 5) * 0.78;

    const startPos = new THREE.Vector3(
      Math.cos(theta) * Math.cos(phi) * startR * 1.25,
      Math.sin(phi) * startR * 0.88 + 0.55,
      Math.sin(theta) * Math.cos(phi) * startR * 0.75
    );

    // 10 subtle satellite micro-blocks remain cleanly orbiting far behind/low; 18 tuck away cleanly
    const keepOrbital = i % 3 === 0;
    const orbitR = 2.05 + (i % 4) * 0.32;
    const settlePos = keepOrbital
      ? new THREE.Vector3(Math.cos(theta) * orbitR, -0.18 + Math.sin(i * 1.7) * 0.52, -0.85 + Math.sin(theta) * 0.6)
      : new THREE.Vector3(Math.cos(theta) * 0.65, 0.45, Math.sin(theta) * 0.45);

    const startRot = new THREE.Euler(i * 0.9, i * 1.3, i * 0.7);
    const endRot = new THREE.Euler(i * 0.25, i * 0.4, i * 0.15);

    mesh.visible = false;
    implosionGroup.add(mesh);
    fragments.push({
      mesh,
      startPos,
      settlePos,
      startRot,
      endRot,
      baseScale: 0.58 + (i % 4) * 0.18,
      keepOrbital,
      orbitR,
      orbitPhase: theta,
      orbitSpeed: 0.18 + (i % 5) * 0.05,
      delay: (i / FRAG_COUNT) * 0.24,
    });
  }

  // Choreographed state
  const target = {
    x: 0,
    y: -0.46,
    z: 0,
    rotX: 0.22,
    rotY: -0.52,
    rotZ: 0,
    scale: 1.0,
    heroProgress: 0.0,
    obsidianProgress: 0.0,
    chainSpread: 1.0,
    opacity: 1.0,
    themeMode: 'light',
  };
  const current = { ...target };

  const pointer = { nx: 0, ny: 0, sx: 0, sy: 0 };
  const implosion = {
    active: false,
    progress: 1.0, // Starts settled cleanly until triggerImplosion() is fired
    duration: 1.38,
    elapsed: 1.38,
  };

  let modelReady = false;
  let dumpsterAsset = null;
  let isMobile = window.innerWidth <= 880;
  let active = true;

  function applyViewportFraming() {
    const w = Math.max(1, window.innerWidth);
    const h = Math.max(1, window.innerHeight);
    isMobile = w <= 880;
    camera.aspect = w / h;
    camera.fov = isMobile ? 44 : 34;
    if (isMobile) {
      camera.position.set(0, 1.52, 7.65);
      camera.lookAt(0, 0.30, 0);
    } else {
      camera.position.set(0, 1.55, 6.65);
      camera.lookAt(0, 0.38, 0);
    }
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
  }
  applyViewportFraming();
  window.addEventListener('resize', applyViewportFraming);

  window.addEventListener(
    'pointermove',
    (e) => {
      const w = Math.max(1, window.innerWidth);
      const h = Math.max(1, window.innerHeight);
      pointer.nx = (e.clientX / w) * 2 - 1;
      pointer.ny = (e.clientY / h) * 2 - 1;
    },
    { passive: true }
  );

  function computeObsidianBlend() {
    const themeTarget = target.themeMode === 'dark' || target.themeMode === 'obsidian' ? 1 : 0;
    return clamp01(Math.max(current.obsidianProgress, themeTarget * 0.85));
  }

  function updateLighting(obsBlend) {
    keyLight.intensity = lerp(1.85, 1.42, obsBlend);
    keyLight.color.lerpColors(lightKeyColor, darkKeyColor, obsBlend);
    fillLight.intensity = lerp(0.85, 0.56, obsBlend);
    rimLight.intensity = lerp(1.35, 2.35, obsBlend);
    rimLight.color.lerpColors(lightRimColor, darkRimColor, obsBlend);
    chromeSpecLight.intensity = lerp(0.52, 1.65, obsBlend);
    hemiLight.intensity = lerp(0.58, 0.24, obsBlend);
    scene.environmentIntensity = lerp(0.74, 1.05, obsBlend);
    renderer.toneMappingExposure = lerp(1.02, 1.12, obsBlend);
    chainMat.envMapIntensity = lerp(1.55, 2.05, obsBlend);
  }

  function updateChains(elapsed) {
    const obs = clamp01(current.obsidianProgress);
    const heroP = clamp01(current.heroProgress);
    const spread = clamp(current.chainSpread, 0.4, 2.0);
    const spanX = (isMobile ? 3.25 : 5.65) * spread;
    const spanY = isMobile ? 2.45 : 2.65;

    // Tension snap during opening implosion
    const impT = implosion.progress;
    const impEase = easeOutBack(Math.min(1, impT / 0.76));
    const impSlack = (1 - Math.min(1, impT / 0.72)) * 1.45;
    const impVib = impT < 0.95 ? Math.sin(impT * 26) * (1 - impT) * 0.16 : 0;

    const px = pointer.sx;
    const py = pointer.sy;
    const wavePhase = elapsed * (reducedMotion ? 0 : 1.15) + heroP * 2.4 + obs * 3.8;

    // Hero Framing CatmullRom Points (Diagonal X-frame Z-interlocked framing dumpster corners cleanly without blocking stencil)
    const hA0x = -spanX * 1.12;
    const hA0y = spanY * 1.06 + impSlack;
    const hA1x = -spanX * 0.62;
    const hA1y = 0.62 + impSlack * 0.45 + impVib;
    const hA2x = -0.78 + px * 0.14;
    const hA2y = (isMobile ? -0.92 : -1.02) - py * 0.10 - impVib;
    const hA3x = spanX * 0.42;
    const hA3y = -1.32 + impVib * 0.7;
    const hA4x = spanX * 1.12;
    const hA4y = -spanY * 0.92 - impSlack * 0.6;

    const hB0x = spanX * 1.10;
    const hB0y = spanY * 1.02 + impSlack;
    const hB1x = spanX * 0.48;
    const hB1y = 1.18 - impVib * 0.8;
    const hB2x = 0.16 - px * 0.12;
    const hB2y = 0.64 + py * 0.08 + impVib * 0.5;
    const hB3x = -spanX * 0.52;
    const hB3y = -0.58 - impVib * 0.4;
    const hB4x = -spanX * 1.12;
    const hB4y = -spanY * 0.88 - impSlack * 0.5;

    // Obsidian Act 02 Sweeping Diagonal Wave Points (WEBLOVE smooth continuous silver chains below headline)
    const ampA = (isMobile ? 0.22 : 0.34) + Math.abs(py) * 0.12;
    const ampB = (isMobile ? 0.20 : 0.30) + Math.abs(px) * 0.12;
    const w1 = Math.sin(wavePhase) * ampA;
    const w2 = Math.cos(wavePhase * 0.92 + 0.9) * ampA;
    const w3 = Math.sin(wavePhase * 1.08 + 2.1) * ampB;
    const w4 = Math.cos(wavePhase * 0.86 + 3.2) * ampB;

    const oA0x = -spanX * 1.18;
    const oA0y = (isMobile ? 0.52 : 0.35) + py * 0.14;
    const oA1x = -spanX * 0.52;
    const oA1y = -0.18 + w1 * 0.65 - py * 0.16;
    const oA2x = 0.06 + px * 0.26;
    const oA2y = -0.56 + w2 * 0.68 + py * 0.20;
    const oA3x = spanX * 0.54;
    const oA3y = -0.98 - w1 * 0.58 - py * 0.14;
    const oA4x = spanX * 1.18;
    const oA4y = (isMobile ? -1.42 : -1.58) + py * 0.12;

    const oB0x = -spanX * 1.18;
    const oB0y = (isMobile ? -0.35 : -0.58) - py * 0.12;
    const oB1x = -spanX * 0.48;
    const oB1y = -0.82 + w3 * 0.62 + py * 0.18;
    const oB2x = 0.14 - px * 0.24;
    const oB2y = -0.32 + w4 * 0.62 - py * 0.18;
    const oB3x = spanX * 0.56;
    const oB3y = -0.46 - w3 * 0.56 + py * 0.14;
    const oB4x = spanX * 1.18;
    const oB4y = (isMobile ? -0.95 : -0.88) - py * 0.10;

    const obsEase = easeOutCubic(obs);

    ptsA[0].set(lerp(hA0x, oA0x, obsEase), lerp(hA0y, oA0y, obsEase), lerp(-0.35, 0.55, obsEase));
    ptsA[1].set(lerp(hA1x, oA1x, obsEase), lerp(hA1y, oA1y, obsEase), lerp(0.75, 1.18, obsEase));
    ptsA[2].set(lerp(hA2x, oA2x, obsEase), lerp(hA2y, oA2y, obsEase), lerp(1.22, 1.48, obsEase));
    ptsA[3].set(lerp(hA3x, oA3x, obsEase), lerp(hA3y, oA3y, obsEase), lerp(0.78, 1.08, obsEase));
    ptsA[4].set(lerp(hA4x, oA4x, obsEase), lerp(hA4y, oA4y, obsEase), lerp(-0.20, 0.45, obsEase));

    ptsB[0].set(lerp(hB0x, oB0x, obsEase), lerp(hB0y, oB0y, obsEase), lerp(-1.35, -0.25, obsEase));
    ptsB[1].set(lerp(hB1x, oB1x, obsEase), lerp(hB1y, oB1y, obsEase), lerp(-0.98, 0.35, obsEase));
    ptsB[2].set(lerp(hB2x, oB2x, obsEase), lerp(hB2y, oB2y, obsEase), lerp(-1.12, 0.65, obsEase));
    ptsB[3].set(lerp(hB3x, oB3x, obsEase), lerp(hB3y, oB3y, obsEase), lerp(-0.72, 0.42, obsEase));
    ptsB[4].set(lerp(hB4x, oB4x, obsEase), lerp(hB4y, oB4y, obsEase), lerp(0.18, -0.18, obsEase));

    const thick = (isMobile ? 0.86 : 1.08) * lerp(0.92, 1.14, obsEase) * clamp(impEase, 0.72, 1.08);
    const twistScroll = heroP * 1.4 + obs * 3.1 + px * 0.65;

    updateChainAlongCurve(chainA, curveA, CHAIN_LINKS, {
      twistOffset: twistScroll,
      twistRate: 0.75,
      thicknessScale: thick,
    });
    updateChainAlongCurve(chainB, curveB, CHAIN_LINKS, {
      twistOffset: -twistScroll * 0.85 + 0.6,
      twistRate: -0.65,
      thicknessScale: thick * 0.94,
    });
  }

  function updateImplosion(dt, elapsed) {
    if (implosion.active) {
      if (reducedMotion) {
        implosion.progress = 1.0;
        implosion.active = false;
      } else {
        implosion.elapsed += dt;
        implosion.progress = clamp01(implosion.elapsed / implosion.duration);
        if (implosion.progress >= 1.0) {
          implosion.active = false;
        }
      }
    }

    const p = implosion.progress;
    const obsFade = 1 - clamp01(current.obsidianProgress * 1.4);

    for (let i = 0; i < fragments.length; i++) {
      const f = fragments[i];
      if (p >= 1.0) {
        if (f.keepOrbital && obsFade > 0.04) {
          f.mesh.visible = true;
          const a = f.orbitPhase + (reducedMotion ? 0 : elapsed * f.orbitSpeed);
          f.mesh.position.set(
            current.x + Math.cos(a) * f.orbitR * (isMobile ? 0.72 : 1.0),
            current.y + 0.55 + Math.sin(a * 1.4 + i) * 0.34,
            current.z - 0.85 + Math.sin(a) * 0.65
          );
          f.mesh.rotation.set(
            f.endRot.x + elapsed * 0.18,
            f.endRot.y + elapsed * 0.24,
            f.endRot.z
          );
          f.mesh.scale.setScalar(f.baseScale * 0.34 * obsFade);
        } else {
          f.mesh.visible = false;
        }
        continue;
      }

      const localT = clamp01((p - f.delay) / (1 - f.delay));
      if (localT <= 0.001) {
        f.mesh.visible = false;
        continue;
      }

      f.mesh.visible = true;
      if (localT < 0.72) {
        const u = easeOutBack(localT / 0.72);
        f.mesh.position.lerpVectors(f.startPos, f.settlePos, u);
        f.mesh.rotation.set(
          lerp(f.startRot.x, f.endRot.x, u),
          lerp(f.startRot.y, f.endRot.y, u),
          lerp(f.startRot.z, f.endRot.z, u)
        );
        const popIn = Math.min(1, localT * 5.0);
        f.mesh.scale.setScalar(f.baseScale * popIn * obsFade);
      } else {
        const u = easeOutCubic((localT - 0.72) / 0.28);
        f.mesh.position.copy(f.settlePos);
        const targetScale = f.keepOrbital ? f.baseScale * 0.34 : 0.0001;
        const s = lerp(f.baseScale, targetScale, u) * obsFade;
        f.mesh.scale.setScalar(Math.max(0.0001, s));
        if (!f.keepOrbital && u > 0.96) f.mesh.visible = false;
      }
    }
  }

  function applyDumpsterTransform(elapsed) {
    const obs = clamp01(current.obsidianProgress);
    const obsEase = easeOutCubic(obs);
    const impPop = implosion.progress < 0.72 ? lerp(0.84, 1.0, easeOutBack(implosion.progress / 0.72)) : 1.0;

    const bob = reducedMotion ? 0 : Math.sin(elapsed * 1.42) * 0.03 * (1 - obsEase * 0.5);
    const mobScale = isMobile ? 0.76 : 1.0;
    const mobYOffset = isMobile ? 0.14 : 0.0;

    // During Act 02 Obsidian transition, smoothly clear dumpster off-stage so WEBLOVE chains own the black canvas cleanly
    const obsSlideX = obsEase * (isMobile ? 1.85 : 3.25);
    const obsSlideY = -obsEase * 0.55;
    const obsSlideZ = -obsEase * 2.85;
    const obsScale = Math.max(0.001, 1 - obsEase * 1.35);

    dumpsterGroup.visible = obsEase < 0.74;
    dumpsterGroup.position.set(
      current.x + obsSlideX,
      current.y + mobYOffset + bob + obsSlideY,
      current.z + obsSlideZ
    );
    dumpsterGroup.rotation.set(
      current.rotX + pointer.sy * 0.055 + obsEase * 0.14,
      current.rotY + pointer.sx * 0.13 + obsEase * 0.58,
      current.rotZ - obsEase * 0.08
    );
    dumpsterGroup.scale.setScalar(Math.max(0.001, current.scale * mobScale * impPop * obsScale));

    // Contact shadow stays crisp under the Hero dumpster and fades smoothly as it recedes or enters obsidian mode
    const yDrift = Math.max(0, Math.abs(current.y + 0.46) - 0.55);
    contactShadow.material.opacity = clamp01(0.78 * (1 - obsEase * 1.15) * clamp01(1 - yDrift * 0.7));
    contactShadow.visible = contactShadow.material.opacity > 0.02;
  }

  function renderOneFrame(dt, elapsed) {
    const obsBlend = computeObsidianBlend();
    updateLighting(obsBlend);
    updateImplosion(dt, elapsed);
    applyDumpsterTransform(elapsed);
    updateChains(elapsed);
    renderer.render(scene, camera);
  }

  // Load shared GLB
  loadSharedGLB()
    .then((cached) => {
      dumpsterAsset = cloneDumpsterAsset(cached, 1.12);
      dumpsterGroup.add(dumpsterAsset.root);
      modelReady = true;
      renderOneFrame(0, 0);
      window.__jlHero3dReady = true;
    })
    .catch((err) => {
      console.error('[JL-Hero3D] Failed to load shared GLB:', err);
    });

  function setState(next) {
    if (!next || typeof next !== 'object') return;
    Object.assign(target, next);
    if (stageEl && typeof next.opacity === 'number') {
      stageEl.style.opacity = String(clamp01(next.opacity));
    }
  }

  function triggerImplosion() {
    if (reducedMotion) {
      implosion.active = false;
      implosion.progress = 1.0;
      implosion.elapsed = implosion.duration;
      return;
    }
    implosion.active = true;
    implosion.elapsed = 0;
    implosion.progress = 0;
  }

  function forceSync() {
    Object.assign(current, target);
    pointer.sx = pointer.nx;
    pointer.sy = pointer.ny;
    implosion.active = false;
    implosion.progress = 1.0;
    implosion.elapsed = implosion.duration;
    if (stageEl) {
      stageEl.style.opacity = String(clamp01(current.opacity));
    }
    applyViewportFraming();
    if (modelReady) {
      renderOneFrame(0, 0);
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

    current.x += (target.x - current.x) * lerpK;
    current.y += (target.y - current.y) * lerpK;
    current.z += (target.z - current.z) * lerpK;
    current.rotX += (target.rotX - current.rotX) * lerpK;
    current.rotY += (target.rotY - current.rotY) * lerpK;
    current.rotZ += (target.rotZ - current.rotZ) * lerpK;
    current.scale += (target.scale - current.scale) * lerpK;
    current.heroProgress += (target.heroProgress - current.heroProgress) * lerpK;
    current.obsidianProgress += (target.obsidianProgress - current.obsidianProgress) * lerpK;
    current.chainSpread += (target.chainSpread - current.chainSpread) * lerpK;
    current.opacity += (target.opacity - current.opacity) * lerpK;
    current.themeMode = target.themeMode;

    pointer.sx += (pointer.nx - pointer.sx) * Math.min(1, dt * 4.2);
    pointer.sy += (pointer.ny - pointer.sy) * Math.min(1, dt * 4.2);

    if (!modelReady || current.opacity < 0.015 || document.hidden) return;

    const minInterval = avgFrameMs > 52 ? 150 : 0;
    if (minInterval > 0 && now - lastRenderAt < minInterval) return;

    const t0 = performance.now();
    renderOneFrame(dt, elapsed);
    const renderMs = performance.now() - t0;
    avgFrameMs = avgFrameMs * 0.8 + renderMs * 0.2;
    lastRenderAt = now;
  }

  tick();

  return {
    setState,
    triggerImplosion,
    isReady: () => modelReady,
    forceSync,
  };
}

// ============================================================================
// EXPORT 2: CONTAINED INTERACTIVE BUILDER 3D RIG ("MONTE SUA CACAMBA 4,2 m3")
// ============================================================================
const BURST_COLORS = {
  alvenaria: 0xc96b45,
  concreto: 0xa2a8b2,
  madeira: 0xc99c62,
  terra: 0x8f623d,
  gesso: 0xebe8df,
  misto: 0xc2b08a,
};

const STAGE_PRESETS = [
  { fill: 0.0, tarp: 0.0, hoist: 0.0, yaw: -0.56, pitch: 0.24 }, // 0: Vazia limpa
  { fill: 0.0, tarp: 0.0, hoist: 0.0, yaw: 0.14, pitch: 0.16 },  // 1: Perfil CCM 139.7421
  { fill: 1.0, tarp: 0.0, hoist: 0.0, yaw: -0.50, pitch: 0.46 }, // 2: Enchendo ate 4.2m3
  { fill: 1.0, tarp: 1.0, hoist: 0.0, yaw: -0.36, pitch: 0.34 }, // 3: Lona azul Lei 097/2017
  { fill: 1.0, tarp: 1.0, hoist: 1.0, yaw: -0.66, pitch: 0.22 }, // 4: Icamento hidraulico
];

export function createBuilderRig3D({ canvas, onMetricsChange } = {}) {
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const fallbackApi = {
    setFill() {},
    addMaterialBurst() {},
    setTarp() {},
    setHoist() {},
    setStageStep() {},
    resetLoad() {},
    forceSync() {},
    isReady: () => false,
  };

  if (!canvas) return fallbackApi;

  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
  } catch (err) {
    console.warn('[JL-Builder3D] WebGL unavailable:', err);
    return fallbackApi;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();

  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
  roomEnv.dispose();
  pmrem.dispose();
  scene.environment = envTex;
  scene.environmentIntensity = 0.68;

  const camera = new THREE.PerspectiveCamera(34, 1.25, 0.1, 60);
  camera.position.set(0, 2.05, 5.85);
  camera.lookAt(0, 0.52, 0);

  // Studio 3-point lighting calibrated for inspecting bricks, concrete, and tarp details
  const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.78);
  keyLight.position.set(4.5, 6.8, 5.2);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xd8e8ec, 0.78);
  fillLight.position.set(-5.0, 3.4, 3.4);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffbd42, 1.32);
  rimLight.position.set(-2.5, 4.2, -5.0);
  scene.add(rimLight);

  const hemiLight = new THREE.HemisphereLight(0xf6f3ea, 0x101520, 0.48);
  scene.add(hemiLight);

  // Orbit group (360-degree user rotation) -> Hoist/recoil group -> GLB root
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);

  const contactShadow = createContactShadowMesh(4.15, 2.75);
  orbitGroup.add(contactShadow);

  const dumpsterRig = new THREE.Group();
  orbitGroup.add(dumpsterRig);

  // Short vertical poliguindaste hoist chains hooked onto real lateral steel pins
  const hoistChainMat = new THREE.MeshStandardMaterial({
    color: 0xdce2ea,
    metalness: 0.95,
    roughness: 0.16,
    envMapIntensity: 1.55,
  });
  const LINKS_PER_LEG = 14;
  const hoistChainsMesh = new THREE.InstancedMesh(getChainLinkGeometry(), hoistChainMat, LINKS_PER_LEG * 4);
  hoistChainsMesh.frustumCulled = false;
  hoistChainsMesh.visible = false;
  orbitGroup.add(hoistChainsMesh);

  // 4 steel lifting pins on Cacamba_Steel_Pins_Mesh bounds: X +-1.14, Y 0.78, Z +-0.86
  const pinLocalCoords = [
    new THREE.Vector3(-1.14, 0.78, 0.86),
    new THREE.Vector3(-1.14, 0.78, -0.86),
    new THREE.Vector3(1.14, 0.78, 0.86),
    new THREE.Vector3(1.14, 0.78, -0.86),
  ];
  const hoistTopAnchors = [
    new THREE.Vector3(-1.02, 3.85, 0.12),
    new THREE.Vector3(-1.02, 3.85, -0.12),
    new THREE.Vector3(1.02, 3.85, 0.12),
    new THREE.Vector3(1.02, 3.85, -0.12),
  ];
  const legCurves = Array.from({ length: 4 }, () =>
    new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()])
  );
  const _pinWorld = new THREE.Vector3();

  // Lightweight 3D dust burst particle system for addMaterialBurst(category)
  const DUST_COUNT = 42;
  const dustPositions = new Float32Array(DUST_COUNT * 3);
  const dustVelocities = Array.from({ length: DUST_COUNT }, () => new THREE.Vector3());
  const dustLife = new Float32Array(DUST_COUNT);
  const dustMaxLife = new Float32Array(DUST_COUNT);

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.24,
    map: createDustSpriteTexture(),
    color: 0xc2b08a,
    transparent: true,
    opacity: 0.0,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.frustumCulled = false;
  dustPoints.visible = false;
  dumpsterRig.add(dustPoints);

  // Simulation state
  const target = {
    fill: 0.0,
    tarp: 0.0,
    hoist: 0.0,
    yaw: -0.56,
    pitch: 0.30,
  };
  const current = { ...target };

  const orbit = {
    dragging: false,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    velYaw: 0,
    basePitch: 0.30,
    userRotated: false,
  };

  let manualTarpOverride = false;
  let impactImpulse = 0;
  let prevLandedCount = 0;
  let modelReady = false;
  let asset = null;
  let isVisible = true;
  let active = true;

  // Last emitted metrics snapshot to prevent redundant callback firing
  let lastMetrics = {
    fill: -1,
    volumeM3: -1,
    piecesLanded: -1,
    tarpClosed: false,
    hoisted: false,
  };

  function emitMetrics(piecesLanded, force = false) {
    if (typeof onMetricsChange !== 'function') return;
    const fill = Number(clamp01(current.fill).toFixed(3));
    const volumeM3 = Number((fill * 4.2).toFixed(2));
    const tarpClosed = current.tarp >= 0.88;
    const hoisted = current.hoist >= 0.5;

    if (
      force ||
      fill !== lastMetrics.fill ||
      volumeM3 !== lastMetrics.volumeM3 ||
      piecesLanded !== lastMetrics.piecesLanded ||
      tarpClosed !== lastMetrics.tarpClosed ||
      hoisted !== lastMetrics.hoisted
    ) {
      lastMetrics = { fill, volumeM3, piecesLanded, tarpClosed, hoisted };
      onMetricsChange({ ...lastMetrics });
    }
  }

  // Container sizing via ResizeObserver
  const containerEl = canvas.parentElement || canvas;
  function syncSize() {
    const rect = containerEl.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width || canvas.clientWidth || 640));
    const h = Math.max(1, Math.round(rect.height || canvas.clientHeight || 480));
    camera.aspect = w / h;
    const compact = w < 460;
    camera.fov = compact ? 42 : 34;
    camera.position.set(0, compact ? 2.25 : 2.02, compact ? 6.45 : 5.75);
    camera.lookAt(0, 0.58, 0);
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
  }
  syncSize();

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => {
      syncSize();
      if (modelReady && isVisible) renderer.render(scene, camera);
    });
    ro.observe(containerEl);
  } else {
    window.addEventListener('resize', syncSize);
  }

  // IntersectionObserver to pause rendering offscreen (saves GPU)
  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry ? entry.isIntersecting : true;
      },
      { rootMargin: '120px 0px' }
    );
    io.observe(canvas);
  }

  // Interactive 360-degree drag orbit with smooth inertia and gentle pitch return
  canvas.style.cursor = 'grab';
  canvas.style.touchAction = 'pan-y';

  canvas.addEventListener('pointerdown', (e) => {
    orbit.dragging = true;
    orbit.pointerId = e.pointerId;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    orbit.velYaw = 0;
    orbit.userRotated = true;
    canvas.style.cursor = 'grabbing';
    if (canvas.setPointerCapture) {
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_err) {
        // Ignore if pointer capture is unsupported in synthetic events
      }
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!orbit.dragging || (orbit.pointerId !== null && e.pointerId !== orbit.pointerId)) return;
    const dx = e.clientX - orbit.lastX;
    const dy = e.clientY - orbit.lastY;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;

    const deltaYaw = dx * 0.0085;
    target.yaw += deltaYaw;
    orbit.velYaw = deltaYaw * 0.85;
    target.pitch = clamp(target.pitch + dy * 0.0055, -0.14, 0.68);
  });

  function endDrag(e) {
    if (!orbit.dragging) return;
    orbit.dragging = false;
    canvas.style.cursor = 'grab';
    if (orbit.pointerId !== null && canvas.releasePointerCapture) {
      try {
        canvas.releasePointerCapture(orbit.pointerId);
      } catch (_err) {
        // Ignore
      }
    }
    orbit.pointerId = null;
  }

  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('pointerleave', (e) => {
    if (orbit.dragging && !canvas.hasPointerCapture?.(e.pointerId)) {
      endDrag(e);
    }
  });

  function updateDebrisAndTarp(fillAmt, tarpAmt, force = false) {
    if (!modelReady || !asset) return 0;

    const { moundObj, tarpObj, debrisList } = asset;

    // 1. Gravel/rubble base mound rises progressively with fill
    if (moundObj) {
      if (fillAmt <= 0.015) {
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

    // 2. All 74 individual debris pieces drop from above with gravity curve & micro-bounce
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

      let fallEase;
      if (t < 0.85) {
        const u = t / 0.85;
        fallEase = u * u;
      } else {
        const u = (t - 0.85) / 0.15;
        fallEase = 1.0 - Math.sin(u * Math.PI) * 0.04;
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

    if (!force && landedCount > prevLandedCount && fillAmt > 0.04) {
      impactImpulse = Math.min(0.068, impactImpulse + 0.011);
    }
    prevLandedCount = landedCount;

    // 3. Lei 097/2017 waterproof blue tarp unfolds cleanly with cubicOut easing
    if (tarpObj) {
      if (tarpAmt <= 0.01) {
        tarpObj.visible = false;
      } else {
        tarpObj.visible = true;
        const te = easeOutCubic(tarpAmt);
        tarpObj.scale.set(Math.max(0.02, te), 0.75 + 0.25 * te, 1.0);
        tarpObj.position.set((1 - te) * 1.25, (1 - te) * 0.12, 0);
      }
    }

    return landedCount;
  }

  function updateHoistChains(hoistAmt) {
    if (hoistAmt <= 0.02) {
      hoistChainsMesh.visible = false;
      return;
    }
    hoistChainsMesh.visible = true;
    const hEase = easeOutCubic(hoistAmt);
    dumpsterRig.updateMatrix();

    for (let leg = 0; leg < 4; leg++) {
      _pinWorld.copy(pinLocalCoords[leg]).applyMatrix4(dumpsterRig.matrix);
      const top = hoistTopAnchors[leg];
      const curve = legCurves[leg];

      // Start chains slightly above view and lower tension smoothly onto the lateral pins
      const topY = lerp(top.y + 1.4, top.y, hEase);
      curve.points[0].set(top.x, topY, top.z);
      curve.points[1].set(
        lerp(top.x, _pinWorld.x, 0.52),
        lerp(topY, _pinWorld.y, 0.52),
        lerp(top.z, _pinWorld.z, 0.52)
      );
      curve.points[2].copy(_pinWorld);

      updateChainAlongCurve(hoistChainsMesh, curve, LINKS_PER_LEG, {
        startIndex: leg * LINKS_PER_LEG,
        baseLinkPitch: 0.21,
        thicknessScale: 0.72 * clamp(hEase * 1.35, 0.2, 1.0),
        twistRate: 0.2,
      });
    }
  }

  function updateDustParticles(dt) {
    if (!dustPoints.visible) return;
    let alive = 0;
    let maxAlpha = 0;
    const posAttr = dustGeo.attributes.position;
    for (let i = 0; i < DUST_COUNT; i++) {
      if (dustLife[i] <= 0) continue;
      dustLife[i] -= dt;
      if (dustLife[i] <= 0) {
        dustLife[i] = 0;
        posAttr.setXYZ(i, 0, -99, 0);
        continue;
      }
      alive++;
      const frac = dustLife[i] / dustMaxLife[i];
      if (frac > maxAlpha) maxAlpha = frac;
      const v = dustVelocities[i];
      v.multiplyScalar(Math.pow(0.18, dt));
      v.y += 0.35 * dt; // Gentle thermal rise of dust plume
      const x = posAttr.getX(i) + v.x * dt;
      const y = posAttr.getY(i) + v.y * dt;
      const z = posAttr.getZ(i) + v.z * dt;
      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
    dustMat.opacity = clamp01(maxAlpha * 0.72);
    if (alive === 0) {
      dustPoints.visible = false;
    }
  }

  function applyRigTransforms(elapsed) {
    const hEase = easeOutCubic(current.hoist);
    const hoistY = hEase * 0.54;
    const hoistTiltZ = hEase * 0.11;
    const hoistTiltX = hEase * 0.05;
    const idleBob = reducedMotion ? 0 : Math.sin(elapsed * 1.55) * 0.018 * (1 + hEase * 0.8);

    orbitGroup.rotation.set(current.pitch, current.yaw, 0);

    dumpsterRig.position.set(0, hoistY + idleBob - impactImpulse * 1.55, 0);
    dumpsterRig.rotation.set(
      hoistTiltX + impactImpulse * 0.78,
      0,
      hoistTiltZ + impactImpulse * 0.32
    );

    // Contact shadow weakens and spreads slightly when hoisted
    contactShadow.material.opacity = clamp01(0.74 * (1 - hEase * 0.62));
    const shScale = 1 + hEase * 0.18;
    contactShadow.scale.set(shScale, shScale, 1);

    updateHoistChains(current.hoist);
  }

  // Load shared GLB
  loadSharedGLB()
    .then((cached) => {
      asset = cloneDumpsterAsset(cached, 1.05);
      dumpsterRig.add(asset.root);
      modelReady = true;

      const landed = updateDebrisAndTarp(current.fill, current.tarp, true);
      applyRigTransforms(0);
      emitMetrics(landed, true);
      renderer.render(scene, camera);
      window.__jlBuilder3dReady = true;
    })
    .catch((err) => {
      console.error('[JL-Builder3D] Failed to load shared GLB:', err);
    });

  // Public Builder API
  function setFill(ratio) {
    const nextFill = clamp01(Number(ratio) || 0);
    target.fill = nextFill;
    if (!manualTarpOverride) {
      target.tarp = nextFill >= 0.99 ? 1.0 : 0.0;
    }
  }

  function addMaterialBurst(category = 'misto') {
    const key = String(category || 'misto').toLowerCase();
    const hex = BURST_COLORS[key] !== undefined ? BURST_COLORS[key] : BURST_COLORS.misto;
    dustMat.color.setHex(hex);

    impactImpulse = Math.min(0.088, impactImpulse + 0.052);

    if (reducedMotion) return;

    const posAttr = dustGeo.attributes.position;
    for (let i = 0; i < DUST_COUNT; i++) {
      const a = (i / DUST_COUNT) * Math.PI * 2 + Math.random() * 0.45;
      const r = 0.25 + Math.random() * 0.75;
      posAttr.setXYZ(
        i,
        Math.cos(a) * r * 1.15,
        1.12 + Math.random() * 0.24,
        Math.sin(a) * r * 0.68
      );
      dustVelocities[i].set(
        Math.cos(a) * (0.65 + Math.random() * 1.15),
        0.95 + Math.random() * 1.35,
        Math.sin(a) * (0.55 + Math.random() * 0.95)
      );
      const life = 0.55 + Math.random() * 0.48;
      dustLife[i] = life;
      dustMaxLife[i] = life;
    }
    posAttr.needsUpdate = true;
    dustMat.opacity = 0.72;
    dustPoints.visible = true;
  }

  function setTarp(amount) {
    manualTarpOverride = true;
    target.tarp = clamp01(Number(amount) || 0);
  }

  function setHoist(amount) {
    target.hoist = clamp01(Number(amount) || 0);
  }

  function setStageStep(stepIdx) {
    const idx = clamp(Math.round(Number(stepIdx) || 0), 0, STAGE_PRESETS.length - 1);
    const preset = STAGE_PRESETS[idx];
    manualTarpOverride = true;
    target.fill = preset.fill;
    target.tarp = preset.tarp;
    target.hoist = preset.hoist;
    orbit.basePitch = preset.pitch;
    if (!orbit.dragging) {
      target.yaw = preset.yaw;
      target.pitch = preset.pitch;
      orbit.velYaw = 0;
    }
  }

  function resetLoad() {
    manualTarpOverride = false;
    target.fill = 0.0;
    target.tarp = 0.0;
    target.hoist = 0.0;
    impactImpulse = 0;
    dustPoints.visible = false;
  }

  function forceSync() {
    syncSize();
    Object.assign(current, target);
    impactImpulse = 0;
    if (modelReady) {
      const landed = updateDebrisAndTarp(current.fill, current.tarp, true);
      applyRigTransforms(0);
      emitMetrics(landed, true);
      renderer.render(scene, camera);
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

    // Inertia and gentle pitch settling when not dragging
    if (!orbit.dragging) {
      if (Math.abs(orbit.velYaw) > 0.0002) {
        target.yaw += orbit.velYaw;
        orbit.velYaw *= Math.pow(0.035, dt);
      } else {
        orbit.velYaw = 0;
      }
      target.pitch += (orbit.basePitch - target.pitch) * Math.min(1, dt * 1.45);
    }

    const lerpK = reducedMotion ? 1.0 : Math.min(1, dt * 8.2);
    const fillK = reducedMotion ? 1.0 : Math.min(1, dt * 10.5);

    current.fill += (target.fill - current.fill) * fillK;
    current.tarp += (target.tarp - current.tarp) * lerpK;
    current.hoist += (target.hoist - current.hoist) * lerpK;
    current.yaw += (target.yaw - current.yaw) * (orbit.dragging ? Math.min(1, dt * 22) : lerpK);
    current.pitch += (target.pitch - current.pitch) * (orbit.dragging ? Math.min(1, dt * 22) : lerpK);

    impactImpulse *= Math.pow(0.03, dt);

    if (!modelReady || !isVisible || document.hidden) return;

    const minInterval = avgFrameMs > 52 ? 150 : 0;
    if (minInterval > 0 && now - lastRenderAt < minInterval) return;

    const landed = updateDebrisAndTarp(current.fill, current.tarp, false);
    updateDustParticles(dt);
    applyRigTransforms(elapsed);
    emitMetrics(landed, false);

    const t0 = performance.now();
    renderer.render(scene, camera);
    const renderMs = performance.now() - t0;
    avgFrameMs = avgFrameMs * 0.8 + renderMs * 0.2;
    lastRenderAt = now;
  }

  tick();

  return {
    setFill,
    addMaterialBurst,
    setTarp,
    setHoist,
    setStageStep,
    resetLoad,
    forceSync,
    isReady: () => modelReady,
  };
}
