import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { prefersReducedMotion } from '../fx/reducedMotion';

/**
 * Ambient 3D "atrium" environment for the Draft Academy homepage.
 *
 * A single flat piece of art is given life two ways at once:
 *  1. A depth-parallax shader on the image plane. We synthesize a depth field
 *     (the central archway recedes to a vanishing point; the foreground floor,
 *     railings and pillars sit near) and offset the texture sampling by the
 *     pointer/gyro so near elements slide further than far ones.
 *  2. An ambient pulsating glow: the shader isolates the emissive parts of the
 *     art (bright + cyan-blue holographic panels, runes, the scrying circle) and
 *     blooms them with a slow, spatially-varied pulse so the light breathes.
 *
 * Design constraints (see agency rules): decorative + menu-only, lazy-loaded so
 * three.js never lands in the draft/build bundle, and a calm, static first-class
 * experience under `prefers-reduced-motion`.
 */

const PLANE_DIST = 6;
const FOV = 45;
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

  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  // How "emissive" a texel reads: generally bright OR cyan-blue (the glowing
  // holographic panels, runes and scrying circle), 0..1.
  float emissiveMask(vec3 c) {
    float bright = smoothstep(0.5, 0.92, lum(c));
    float cyan = smoothstep(0.05, 0.42, c.b - (c.r + c.g) * 0.35);
    return clamp(max(bright, cyan), 0.0, 1.0);
  }

  void main() {
    vec2 uv = coverUv(vUv);
    uv = (uv - 0.5) / uZoom + 0.5;

    float nearness = nearnessAt(uv);
    vec2 shift = (uPointer * vec2(1.0, 0.6) + uDrift) * uAmp * nearness;
    uv += shift;
    uv = clamp(uv, 0.0015, 0.9985);

    vec3 col = texture2D(uTex, uv).rgb;

    // Lift exposure — the chamber read too dark behind the scrim.
    col = pow(col, vec3(0.9)); // gentle shadow/midtone lift
    col *= 1.16;               // overall gain

    // --- Ambient pulsating glow on the lit elements ------------------------
    // Ring-kernel bloom of ONLY the emissive parts, so the lights breathe while
    // the rest of the chamber stays calm. Two radii for a soft halo.
    float texel = 0.0016;
    vec3 glow = vec3(0.0);
    const int TAPS = 12;
    for (int i = 0; i < TAPS; i++) {
      float a = (float(i) / float(TAPS)) * 6.2831853;
      vec2 dir = vec2(cos(a), sin(a));
      vec3 c1 = texture2D(uTex, clamp(uv + dir * texel * 2.2, 0.0015, 0.9985)).rgb;
      vec3 c2 = texture2D(uTex, clamp(uv + dir * texel * 4.8, 0.0015, 0.9985)).rgb;
      glow += c1 * emissiveMask(c1) * 0.66;
      glow += c2 * emissiveMask(c2) * 0.34;
    }
    glow /= float(TAPS);

    // Spatially-varied pulse so different lamps breathe out of sync.
    float phase = dot(uv, vec2(9.0, 14.0));
    float pulse = 0.6 + 0.4 * sin(uTime * 0.9 + phase);
    float pulseSlow = 0.7 + 0.3 * sin(uTime * 0.45 + phase * 0.5);

    // Boost the emissive texels in place + add the bloom halo, both pulsing.
    float selfMask = emissiveMask(col);
    col += col * selfMask * pulse * 0.55;
    col += glow * (1.1 + pulse) * pulseSlow;

    // Foresight-blue breathing over the low-centre scrying circle.
    float circleMask = smoothstep(0.42, 0.0, distance(uv, vec2(0.5, 0.24)));
    col += vec3(0.16, 0.34, 0.62) * circleMask * pulseSlow * 0.12;

    // Very soft vignette — fuse the edges without crushing the scene.
    float vig = smoothstep(1.2, 0.45, distance(vUv, vec2(0.5)));
    col *= mix(0.9, 1.0, vig);

    gl_FragColor = vec4(col, 1.0);
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
      uniforms.uTex.value?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, [url]);

  return <div ref={hostRef} className="atrium-host" aria-hidden />;
}
