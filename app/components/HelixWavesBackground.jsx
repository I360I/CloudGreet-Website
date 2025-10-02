/**
 * HelixWavesBackground.jsx
 *
 * A 3D, high-performance, responsive hero background animation:
 * - 5 twisting strands (desktop) / 3 strands (mobile), flowing left→right.
 * - Each strand follows a curved path that bulges around a focal ellipse (the CTA),
 *   producing a visible "oval frame" that leads the eye to the button.
 * - A slower, broader bottom wave sits below for depth.
 * - Subtle lighting + glow for a premium, Retell-like feel.
 *
 * Drop <HelixWavesBackground /> inside your hero section, positioned behind content.
 */

"use client";

import React, { useMemo, useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { PerspectiveCamera } from "@react-three/fiber";

/* ================================
   1) CONFIG DEFAULTS
   ================================ */

const DEFAULTS = {
  // Visual sizing
  heightVh: 60, // canvas height in vh
  bgOpacity: 1,

  // Strand counts
  strandsDesktop: 5,
  strandsMobile: 3,

  // Ellipse around CTA (desktop defaults)
  ellipseRx: 240, // horizontal radius in px
  ellipseRy: 100, // vertical radius in px
  // Envelope controls how much the wave bulges near the CTA center:
  ellipseEnvelopeBoost: 2.0, // multiplier of amplitude at center
  ellipseEnvelopeWidthPct: 0.36, // central width (fraction of canvas) that gets boosted

  // Wave geometry
  pathLengthPx: 1800, // virtual wave width in px (bigger => smoother wrapping)
  tubeRadius: 0.6, // radius of each 3D tube (thickness)
  tubeSegments: 900, // geometry segments along path
  radialSegments: 8, // tube radial segments
  minCurvatureRadiusPx: 50, // prevents kinks (controls amplitude/curve math)

  // Motion
  baseSpeedPxPerSec: 95, // base horizontal speed of strands
  speedJitterPct: 0.15, // ±15% variation per strand
  zJitterRange: [-0.6, 0.6], // 3D depth range
  rotationRate: 0.08, // slow Y rotation of tubes for extra "twist"
  highlightPulseSecs: 7.0, // slow moving highlight along tubes

  // Colours (cycled for strands)
  strandColors: ["#6A5BFF", "#7E66FF", "#5C8BFF", "#8A7BFF", "#4C7BFF"],

  // Alpha and glow
  strandOpacity: 0.55,
  glowEmissiveIntensity: 0.65,

  // "Top quiet zone" (keep headline clean)
  topQuietPx: 140, // avoid heavy strokes here (just faint)

  // Bottom wave
  bottomWave: {
    enabled: true,
    color: "#3457F5",
    opacity: 0.28,
    amplitudePx: 38,
    speedPxPerSec: 65,
    yOffsetPx: 200, // how far below the CTA centerline (approx) this sits
    tubeRadius: 0.9,
  },
};

/* ================================
   2) RESPONSIVE HELPERS
   ================================ */

function useIsMobile() {
  const { size } = useThree();
  return size.width < 768;
}

// Maps px to NDC-ish world units using camera fov; keeps wave roughly consistent
function usePixelToWorldScale() {
  const { size, camera } = useThree();
  // Distance from camera to plane where waves live
  const z = 0;
  // Convert px to world units using vertical FOV:
  const vFov = (camera.fov * Math.PI) / 180;
  const worldHeightAtZ = 2 * Math.tan(vFov / 2) * Math.abs(camera.position.z - z);
  const pixelsPerWorldUnit = size.height / worldHeightAtZ;
  return (px) => px / pixelsPerWorldUnit;
}

/* ================================
   3) MATH: CURVES & ENVELOPES
   ================================ */

/**
 * Returns a Gaussian-ish envelope factor for a given normalized x in [-1, 1].
 * We amplify amplitude near the center to draw an ellipse around CTA.
 */
function centralEnvelope(normX, boost = 2.0, widthPct = 0.36) {
  const sigma = widthPct; // how wide the bulge region is
  const gauss = Math.exp(-((normX * normX) / (2 * sigma * sigma)));
  return 1 + (boost - 1) * gauss;
}

/**
 * Builds CatmullRom curve points for a strand.
 * - pathLengthPx: total virtual horizontal span for seamless wrapping
 * - lanes: starting vertical offsets for each strand, ensures variety
 */
function buildStrandPoints({
  segments = 900,
  pathLengthPx,
  baseAmplitudePx,
  turns = 3.8,
  laneYOffsetPx = 0,
  ellipseBoost = 2.0,
  ellipseWidthPct = 0.36,
  bottomBiasPx = 0, // nudge everything slightly downward if desired
  THREE,
}) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    // x in px across path
    const xPx = (i / segments) * pathLengthPx - pathLengthPx / 2; // [-L/2, L/2]
    const normX = xPx / (pathLengthPx / 2); // => [-1..1]
    const envelope = centralEnvelope(normX, ellipseBoost, ellipseWidthPct);

    // Sin/cos for twisting with turns across the path
    const theta = turns * Math.PI * normX;

    // Modulate vertical amplitude across the path
    const Ay = baseAmplitudePx * envelope;

    // y "lane" + sin wave bulge, with slight asymmetry for organic feel
    const yPx =
      laneYOffsetPx +
      (Math.sin(theta) * Ay + Math.cos(theta * 0.5) * Ay * 0.12) +
      bottomBiasPx;

    // add small z variation for depth even before we offset with zJitter
    const zPx = Math.cos(theta) * baseAmplitudePx * 0.18;

    pts.push(new THREE.Vector3(xPx, yPx, zPx));
  }
  return new THREE.CatmullRomCurve3(pts);
}

/* ================================
   4) GEOMETRY COMPONENTS
   ================================ */

function TwistingStrand({
  color = "#6A5BFF",
  opacity = 0.55,
  emissiveIntensity = 0.65,
  baseSpeedPxPerSec = 95,
  speedMul = 1.0,
  phaseOffsetPx = 0,
  zOffsetWorld = 0,
  tubeRadiusWorld = 0.02,
  pathLengthPx,
  tubeSegments,
  radialSegments,
  baseAmplitudePx,
  turns,
  ellipseBoost,
  ellipseWidthPct,
  laneYOffsetPx,
  rotationRate = 0.08,
  highlightPulseSecs = 7.0,
  topQuietPxWorld = 0,
  THREE,
}) {
  const mesh = useRef();
  const pixelToWorld = usePixelToWorldScale();

  // Build the curve and tube geometry once
  const geometry = useMemo(() => {
    const curve = buildStrandPoints({
      segments: tubeSegments,
      pathLengthPx,
      baseAmplitudePx,
      turns,
      laneYOffsetPx,
      ellipseBoost,
      ellipseWidthPct,
      THREE,
    });
    return new THREE.TubeGeometry(curve, tubeSegments, tubeRadiusWorld, radialSegments, false);
  }, [
    tubeSegments,
    pathLengthPx,
    baseAmplitudePx,
    turns,
    laneYOffsetPx,
    ellipseBoost,
    ellipseWidthPct,
    tubeRadiusWorld,
    radialSegments,
  ]);

  // Material: subtle glow + screen-like look
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity,
      roughness: 0.35,
      metalness: 0.15,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return m;
  }, [color, emissiveIntensity, opacity]);

  // Animate: slide horizontally, rotate slowly, run a highlight pulse
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pxToWorld = pixelToWorld(1);

    // Horizontal wrap — move mesh along x
    const worldSpan = pixelToWorld(pathLengthPx);
    const speedWorld = pixelToWorld(baseSpeedPxPerSec * speedMul) * (1 / 60); // per frame approx
    const offset = (t * speedWorld + pixelToWorld(phaseOffsetPx)) % worldSpan;

    mesh.current.position.x = -worldSpan / 2 + offset;
    mesh.current.position.z = zOffsetWorld;

    // Subtle rotation to look like twisting in 3D
    mesh.current.rotation.y = t * rotationRate;

    // Optional: gentle vertical dodge in top-quiet zone (avoid heavy lines through headline)
    if (topQuietPxWorld > 0) {
      const pos = mesh.current.position;
      if (Math.abs(pos.y) < topQuietPxWorld * 0.5) {
        pos.y += Math.sin(t * 0.8 + phaseOffsetPx * 0.001) * topQuietPxWorld * 0.02;
      }
    }

    // Shimmer highlight via emissive mod
    const pulse = 0.5 + 0.5 * Math.sin((t / highlightPulseSecs) * Math.PI * 2 + phaseOffsetPx * 0.002);
    material.emissiveIntensity = emissiveIntensity * (0.8 + pulse * 0.4);
  });

  return <mesh ref={mesh} geometry={geometry} material={material} />;
}

function BottomWave({
  color = "#3457F5",
  opacity = 0.28,
  yOffsetPx,
  amplitudePx,
  speedPxPerSec,
  tubeRadiusWorld,
  pathLengthPx,
  tubeSegments,
  radialSegments,
  THREE,
}) {
  const mesh = useRef();
  const pixelToWorld = usePixelToWorldScale();

  const geometry = useMemo(() => {
    const segments = tubeSegments;
    const pts = [];
    for (let i = 0; i <= segments; i++) {
      const xPx = (i / segments) * pathLengthPx - pathLengthPx / 2;
      const t = (i / segments) * Math.PI * 2;
      const yPx = yOffsetPx + Math.sin(t) * amplitudePx; // smooth big ribbon
      pts.push(new THREE.Vector3(xPx, yPx, 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, segments, tubeRadiusWorld, radialSegments, false);
  }, [pathLengthPx, tubeSegments, radialSegments, amplitudePx, yOffsetPx, tubeRadiusWorld]);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.5,
        roughness: 0.45,
        metalness: 0.1,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [color, opacity]
  );

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const worldSpan = pixelToWorld(pathLengthPx);
    const speedWorld = pixelToWorld(speedPxPerSec) * (1 / 60);
    const offset = (t * speedWorld) % worldSpan;
    mesh.current.position.x = -worldSpan / 2 + offset;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} />;
}

/* ================================
   5) MAIN BACKGROUND WRAPPER
   ================================ */

function SceneContent(props) {
  const {
    ellipseRx,
    ellipseRy,
    ellipseEnvelopeBoost,
    ellipseEnvelopeWidthPct,
    pathLengthPx,
    tubeRadius,
    tubeSegments,
    radialSegments,
    baseSpeedPxPerSec,
    speedJitterPct,
    zJitterRange,
    rotationRate,
    highlightPulseSecs,
    strandColors,
    strandOpacity,
    glowEmissiveIntensity,
    topQuietPx,
    bottomWave,
    THREE,
  } = props;

  const isMobile = useIsMobile();
  const { size, camera } = useThree();
  const pixelToWorld = usePixelToWorldScale();

  // Place camera so waves fill ~60vh and look nicely scaled
  useEffect(() => {
    camera.position.set(0, 0, 11.5);
  }, [camera]);

  // Choose strand count
  const strandCount = isMobile ? props.strandsMobile : props.strandsDesktop;

  // Convert px to world units for geometry thickness and safety zones
  const tubeRadiusWorld = pixelToWorld(tubeRadius);
  const topQuietPxWorld = pixelToWorld(topQuietPx);

  // Lane offsets: distribute around CTA line
  const laneOffsetsPx = useMemo(() => {
    const spread = ellipseRy * 1.6; // vertical band across which lanes start
    const step = spread / (strandCount - 1);
    const start = -spread / 2;
    return new Array(strandCount).fill(0).map((_, i) => start + i * step);
  }, [ellipseRy, strandCount]);

  // Create strands
  const strands = new Array(strandCount).fill(0).map((_, i) => {
    const color = strandColors[i % strandColors.length];

    // Slightly different speeds & phases per strand
    const jitter = 1 + (Math.random() * 2 - 1) * speedJitterPct;
    const speedMul = jitter;
    const phaseOffsetPx = (i / strandCount) * (pathLengthPx / 3) + Math.random() * 300;

    // Depth
    const zOffsetWorld = THREE.MathUtils.lerp(zJitterRange[0], zJitterRange[1], Math.random());

    // Base amplitude is tied to ellipseRy so we bulge near center
    const baseAmplitudePx = Math.max(ellipseRy * 0.38, 22);

    const turns = 4.0 - i * 0.25; // slight variety in twisting

    return (
      <TwistingStrand
        key={`strand-${i}`}
        color={color}
        opacity={strandOpacity}
        emissiveIntensity={glowEmissiveIntensity}
        baseSpeedPxPerSec={baseSpeedPxPerSec}
        speedMul={speedMul}
        phaseOffsetPx={phaseOffsetPx}
        zOffsetWorld={zOffsetWorld}
        tubeRadiusWorld={tubeRadiusWorld}
        pathLengthPx={pathLengthPx}
        tubeSegments={tubeSegments}
        radialSegments={radialSegments}
        baseAmplitudePx={baseAmplitudePx}
        turns={turns}
        ellipseBoost={ellipseEnvelopeBoost}
        ellipseWidthPct={ellipseEnvelopeWidthPct}
        laneYOffsetPx={laneOffsetsPx[i]}
        rotationRate={rotationRate}
        highlightPulseSecs={highlightPulseSecs}
        topQuietPxWorld={topQuietPxWorld}
        THREE={THREE}
      />
    );
  });

  return (
    <>
      {/* Camera & Lighting */}
      <PerspectiveCamera makeDefault fov={50} position={[0, 0, 11.5]} />
      <ambientLight intensity={0.35} />
      <pointLight position={[10, 10, 10]} intensity={0.45} />
      <pointLight position={[-10, -5, -5]} intensity={0.3} />

      {/* Strands */}
      {strands}

      {/* Bottom wave */}
      {bottomWave?.enabled && (
        <BottomWave
          color={bottomWave.color}
          opacity={bottomWave.opacity}
          yOffsetPx={bottomWave.yOffsetPx}
          amplitudePx={bottomWave.amplitudePx}
          speedPxPerSec={bottomWave.speedPxPerSec}
          tubeRadiusWorld={pixelToWorld(bottomWave.tubeRadius)}
          pathLengthPx={pathLengthPx}
          tubeSegments={tubeSegments}
          radialSegments={radialSegments}
          THREE={THREE}
        />
      )}
    </>
  );
}

/**
 * Public component: mount this behind the hero content.
 * Props allow fine control; if you pass nothing, it uses DEFAULTS.
 *
 * IMPORTANT:
 * - Parent container must be position: relative.
 * - This background div uses position: absolute and z-index: -1.
 * - Set pointer-events: none so clicks pass through to CTA.
 */
export default function HelixWavesBackground(userProps = {}) {
  const [ThreeJSComponents, setThreeJSComponents] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
    
    // Dynamic import of Three.js components only on client side
    const loadThreeJS = async () => {
      try {
        const [
          { Canvas, useFrame, useThree },
          { PerspectiveCamera },
          THREE
        ] = await Promise.all([
          import("@react-three/fiber"),
          import("@react-three/drei"),
          import("three")
        ]);
        
        setThreeJSComponents({
          Canvas,
          useFrame,
          useThree,
          PerspectiveCamera,
          THREE
        });
      } catch (error) {
        console.error("Failed to load Three.js components:", error);
        setHasError(true);
      }
    };
    
    loadThreeJS();
  }, []);

  const cfg = { ...DEFAULTS, ...userProps };
  const {
    heightVh,
    bgOpacity,
  } = cfg;

  // Fallback for SSR or when Three.js fails to load
  if (!isMounted || hasError || !ThreeJSComponents) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          height: `${heightVh}vh`,
          pointerEvents: "none",
          zIndex: -1,
          opacity: bgOpacity,
          overflow: "hidden",
          background: "linear-gradient(45deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)",
        }}
      />
    );
  }

  // Render the Three.js animation once components are loaded
  return <ThreeJSAnimation userProps={userProps} ThreeJSComponents={ThreeJSComponents} />;
}

// Separate component for Three.js animation
function ThreeJSAnimation({ userProps, ThreeJSComponents }) {
  const { Canvas, THREE } = ThreeJSComponents;
  
  const cfg = { ...DEFAULTS, ...userProps };
  const {
    heightVh,
    bgOpacity,
    strandsDesktop,
    strandsMobile,
    ellipseRx,
    ellipseRy,
    ellipseEnvelopeBoost,
    ellipseEnvelopeWidthPct,
    pathLengthPx,
    tubeRadius,
    tubeSegments,
    radialSegments,
    baseSpeedPxPerSec,
    speedJitterPct,
    zJitterRange,
    rotationRate,
    highlightPulseSecs,
    strandColors,
    strandOpacity,
    glowEmissiveIntensity,
    topQuietPx,
    bottomWave,
  } = cfg;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        height: `${heightVh}vh`,
        pointerEvents: "none",
        zIndex: -1,
        opacity: bgOpacity,
        overflow: "hidden",
      }}
    >
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        dpr={[1, 1.75]}
        camera={{ fov: 50, position: [0, 0, 11.5] }}
        frameloop="always"
      >
        <SceneContent
          strandsDesktop={strandsDesktop}
          strandsMobile={strandsMobile}
          ellipseRx={ellipseRx}
          ellipseRy={ellipseRy}
          ellipseEnvelopeBoost={ellipseEnvelopeBoost}
          ellipseEnvelopeWidthPct={ellipseEnvelopeWidthPct}
          pathLengthPx={pathLengthPx}
          tubeRadius={tubeRadius}
          tubeSegments={tubeSegments}
          radialSegments={radialSegments}
          baseSpeedPxPerSec={baseSpeedPxPerSec}
          speedJitterPct={speedJitterPct}
          zJitterRange={zJitterRange}
          rotationRate={rotationRate}
          highlightPulseSecs={highlightPulseSecs}
          strandColors={strandColors}
          strandOpacity={strandOpacity}
          glowEmissiveIntensity={glowEmissiveIntensity}
          topQuietPx={topQuietPx}
          bottomWave={bottomWave}
          THREE={THREE}
        />
      </Canvas>
    </div>
  );
}
