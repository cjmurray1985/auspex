import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { prefersReducedMotion } from '../fx/reducedMotion';

/**
 * Ambient 3D "atrium" environment for the Draft Academy homepage.
 *
 * A single flat piece of art is given real 2.5D depth two ways at once:
 *  1. A depth-parallax shader on the image plane. We synthesize a depth field
 *     (the central archway recedes to a vanishing point; the foreground floor,
 *     railings and pillars sit near) and offset the texture sampling by the
 *     pointer/gyro so near elements slide further than far ones.
 *  2. A layer of drifting dust motes (additive GL points) scattered in front of
 *     the art, each with its own parallax depth, so the whole scene feels alive.
 *
 * Design constraints (see agency rules): decorative + menu-only, lazy-loaded so
 * three.js never lands in the draft/build bundle, and a calm, static first-class
 * experience under `prefers-reduced-motion`.
 */

const PLANE_DIST = 6;
const FOV = 45;
const DUST_COUNT = 320;
/** Max texture-sample shift (fraction of UV) at full pointer deflection. */
const PARALLAX_AMP = 0.028;

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uPointer;      // smoothed pointer, -1..1
  uniform vec2 uDrift;        // slow ambient auto-drift
  uniform float uImageAspect; // texture w/h
  uniform float uViewAspect;  // viewport w/h
  uniform float uZoom;        // >1 leaves headroom so parallax never hits an edge
  uniform float uAmp;
  uniform float uTime;

  // background-size: cover — sample a centered crop that fills the viewport.
  vec2 coverUv(vec2 uv) {
    vec2 s = vec2(1.0);
    if (uViewAspect > uImageAspect) {
      s.y = uImageAspect / uViewAspect;
    } else {
      s.x = uViewAspect / uImageAspect;
    }
    return (uv - 0.5) * s + 0.5;
  }

  // Synthesized depth → "nearness" (0 = far vanishing point, 1 = near foreground).
  // The archway sits a touch above centre; the floor/circle in front is nearest.
  float nearnessAt(vec2 uv) {
    float radial = smoothstep(0.0, 0.72, distance(uv, vec2(0.5, 0.6)));
    float lower = smoothstep(0.8, 0.0, uv.y);
    return clamp(radial * 0.7 + lower * 0.45, 0.0, 1.0);
  }

  void main() {
    vec2 uv = coverUv(vUv);
    uv = (uv - 0.5) / uZoom + 0.5;

    float nearness = nearnessAt(uv);
    vec2 shift = (uPointer * vec2(1.0, 0.6) + uDrift) * uAmp * nearness;
    uv += shift;
    uv = clamp(uv, 0.0015, 0.9985);

    vec3 col = texture2D(uTex, uv).rgb;

    // Arcane pulse: gently breathe the foresight-blue glow low-centre where the
    // scrying circle sits, so the chamber feels lit from within.
    float pulse = 0.5 + 0.5 * sin(uTime * 0.6);
    float glowMask = smoothstep(0.42, 0.0, distance(uv, vec2(0.5, 0.24)));
    col += vec3(0.16, 0.34, 0.62) * glowMask * pulse * 0.09;

    // Soft vignette to fuse the edges into the surrounding scrim.
    float vig = smoothstep(1.15, 0.35, distance(vUv, vec2(0.5)));
    col *= mix(0.72, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const DUST_VERT = /* glsl */ `
  attribute float aDepth;   // 0 = near, 1 = far
  attribute float aPhase;
  attribute float aSize;
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uPixelRatio;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    // Slow updraft with sideways wander; wrap within the volume height.
    float rise = mod(aPhase * 6.2831 + uTime * 0.06, 4.0) - 2.0;
    p.y += rise;
    p.x += sin(uTime * 0.15 + aPhase * 6.2831) * 0.18;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Depth-scaled parallax in clip space: near motes (aDepth→0) move most.
    gl_Position.xy += uPointer * vec2(0.9, 0.55) * (1.0 - aDepth) * 0.16 * gl_Position.w;

    gl_PointSize = aSize * uPixelRatio * (2.6 / -mv.z) * 34.0;

    float twinkle = 0.55 + 0.45 * sin(uTime * 1.3 + aPhase * 12.0);
    vAlpha = twinkle * (0.35 + 0.4 * (1.0 - aDepth));
  }
`;

const DUST_FRAG = /* glsl */ `
  precision mediump float;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    if (a < 0.01) discard;
    // Warm-gold core fading to foresight blue at the rim.
    vec3 col = mix(vec3(0.55, 0.72, 1.0), vec3(1.0, 0.86, 0.55), smoothstep(0.5, 0.0, d));
    gl_FragColor = vec4(col, a);
  }
`;

export function AtriumScene({ src }: { src?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const url = src ?? `${import.meta.env.BASE_URL}academy-atrium.jpg`;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      return; // No WebGL — the CSS gradient/still fallback stays visible underneath.
    }

    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x05070f, 0);
    host.appendChild(renderer.domElement);
    renderer.domElement.className = 'atrium-canvas';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);

    // ---- Image plane -------------------------------------------------------
    const planeGeo = new THREE.PlaneGeometry(1, 1);
    const uniforms = {
      uTex: { value: null as THREE.Texture | null },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uDrift: { value: new THREE.Vector2(0, 0) },
      uImageAspect: { value: 1 },
      uViewAspect: { value: 1 },
      uZoom: { value: 1.08 },
      uAmp: { value: reduced ? 0 : PARALLAX_AMP },
      uTime: { value: 0 },
    };
    const planeMat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      depthWrite: false,
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.position.z = -PLANE_DIST;
    scene.add(plane);

    // ---- Dust motes --------------------------------------------------------
    const depths = new Float32Array(DUST_COUNT);
    const phases = new Float32Array(DUST_COUNT);
    const sizes = new Float32Array(DUST_COUNT);
    const positions = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      const depth = Math.random();
      depths[i] = depth;
      phases[i] = Math.random();
      sizes[i] = 0.5 + Math.random() * 1.2;
      // Nearer motes ride closer to the camera; spread wide so pans stay full.
      const z = -0.6 - depth * (PLANE_DIST - 1.2);
      positions[i * 3] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
      positions[i * 3 + 2] = z;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeo.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));
    dustGeo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    dustGeo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    const dustUniforms = {
      uTime: { value: 0 },
      uPointer: uniforms.uPointer,
      uPixelRatio: { value: dpr },
    };
    const dustMat = new THREE.ShaderMaterial({
      vertexShader: DUST_VERT,
      fragmentShader: DUST_FRAG,
      uniforms: dustUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const dust = new THREE.Points(dustGeo, dustMat);
    scene.add(dust);

    // ---- Sizing (fill the frustum at the plane's distance, cover the art) --
    const resize = () => {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      const visH = 2 * PLANE_DIST * Math.tan((FOV * Math.PI) / 360);
      plane.scale.set(visH * camera.aspect, visH, 1);
      uniforms.uViewAspect.value = w / h;
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    // ---- Texture -----------------------------------------------------------
    const loader = new THREE.TextureLoader();
    loader.load(url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      tex.generateMipmaps = false;
      const img = tex.image as { width: number; height: number };
      uniforms.uImageAspect.value = img.width / img.height;
      uniforms.uTex.value = tex;
      if (reduced) renderer.render(scene, camera); // paint the calm still frame
    });

    // ---- Interaction: smoothed pointer + optional gyro ---------------------
    const pointerTarget = new THREE.Vector2(0, 0);
    const onPointer = (e: PointerEvent) => {
      pointerTarget.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      const gx = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30));
      const gy = Math.max(-1, Math.min(1, ((e.beta ?? 0) - 45) / 30));
      pointerTarget.set(gx, -gy);
    };
    if (!reduced) {
      window.addEventListener('pointermove', onPointer, { passive: true });
      window.addEventListener('deviceorientation', onOrient, { passive: true });
    }

    // ---- Render loop -------------------------------------------------------
    let raf = 0;
    const clock = new THREE.Clock();
    const tick = () => {
      const t = clock.getElapsedTime();
      uniforms.uTime.value = t;
      dustUniforms.uTime.value = t;
      // Ease the pointer toward its target for buttery parallax.
      uniforms.uPointer.value.lerp(pointerTarget, 0.045);
      // Slow ambient breathing so the scene drifts with no input.
      uniforms.uDrift.value.set(Math.sin(t * 0.11) * 0.35, Math.cos(t * 0.083) * 0.22);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    if (!reduced) raf = requestAnimationFrame(tick);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      cancelAnimationFrame(raf);
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onOrient);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      planeGeo.dispose();
      planeMat.dispose();
      dustGeo.dispose();
      dustMat.dispose();
      uniforms.uTex.value?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [url]);

  return <div ref={hostRef} className="atrium-host" aria-hidden />;
}
