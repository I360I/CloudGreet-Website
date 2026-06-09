"use client"

/**
 * Voice-reactive 3D orb. An icosahedron displaced in the vertex shader by 3D
 * simplex noise, with the displacement amplitude + speed driven by the live
 * audio level (passed via levelRef, read every frame so the Canvas never
 * re-renders). Fragment shader does a blue gradient + fresnel rim glow. A
 * blurred CSS bloom sits behind it. Lazy-loaded (three.js) and client-only.
 */

import React, { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Ashima 3D simplex noise (snoise) — standard GLSL implementation.
const SNOISE = `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+1.0*C.xxx; vec3 x2=x0-i2+2.0*C.xxx; vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`

const VERT = `
uniform float uTime; uniform float uAmp; uniform float uSpeed;
varying float vDisp; varying vec3 vN; varying vec3 vView;
${SNOISE}
void main(){
  float n = snoise(normal * 1.5 + vec3(uTime * uSpeed));
  float n2 = snoise(normal * 3.0 - vec3(uTime * uSpeed * 0.6)) * 0.4;
  float disp = (n + n2) * uAmp;
  vDisp = disp;
  vec3 pos = position + normal * disp;
  vN = normalize(normalMatrix * normal);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`

const FRAG = `
precision highp float;
uniform vec3 uA; uniform vec3 uB;
varying float vDisp; varying vec3 vN; varying vec3 vView;
void main(){
  float fres = pow(1.0 - max(dot(vN, vView), 0.0), 2.2);
  vec3 base = mix(uB, uA, smoothstep(-0.25, 0.35, vDisp));
  vec3 col = base + fres * vec3(0.55, 0.74, 1.0);
  col += max(vDisp, 0.0) * 0.7;
  gl_FragColor = vec4(col, 1.0);
}`

function OrbMesh({ levelRef }: { levelRef: React.MutableRefObject<number> }) {
  const grp = useRef<THREE.Group>(null)
  const material = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uAmp: { value: 0.12 },
      uSpeed: { value: 0.7 },
      uA: { value: new THREE.Color('#7dd3fc') },
      uB: { value: new THREE.Color('#2563eb') },
    },
  }), [])
  useFrame((_state, delta) => {
    const l = Math.min(levelRef.current || 0, 1)
    const u = material.uniforms
    u.uTime.value += delta
    u.uAmp.value += ((0.12 + l * 1.5) - u.uAmp.value) * 0.12
    u.uSpeed.value = 0.6 + l * 0.9
    if (grp.current) { grp.current.rotation.y += delta * 0.18; grp.current.scale.setScalar(1 + l * 0.18) }
  })
  return (
    <group ref={grp}>
      <mesh>
        <icosahedronGeometry args={[1, 48]} />
        <primitive object={material} attach="material" />
      </mesh>
    </group>
  )
}

export default function VoiceOrb({ levelRef }: { levelRef: React.MutableRefObject<number> }) {
  return (
    <div className="relative h-full w-full">
      <div className="pointer-events-none absolute inset-0 rounded-full bg-sky-400/40 blur-2xl" />
      <Canvas camera={{ position: [0, 0, 2.6], fov: 50 }} gl={{ antialias: true, alpha: true }} dpr={[1, 2]}>
        <OrbMesh levelRef={levelRef} />
      </Canvas>
    </div>
  )
}
