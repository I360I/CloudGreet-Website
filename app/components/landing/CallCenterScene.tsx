'use client'

/**
 * Ambient call-center scene that sits BEHIND the hero. A row of round
 * blue characters with colorful heads + headsets, seated at glowing
 * desks. Looping motion via GSAP: gentle seat-bob (staggered/random),
 * blinking headset call-lights, flickering monitors, and chat bubbles
 * that pop in over a couple of agents.
 *
 * Isolated 'use client' leaf per the taste-skill's interactivity rule.
 * The scene renders static on the server; GSAP animates on mount.
 */
import { useEffect, useRef } from 'react'
import gsap from 'gsap'

type Agent = { cx: number; head: string; light: string; bubble?: boolean }

// Colorful heads, friendly palette. Bodies are all the same blue so the
// heads read as the pops of color.
const AGENTS: Agent[] = [
 { cx: 150, head: '#fb923c', light: '#34d399', bubble: true },
 { cx: 390, head: '#f472b6', light: '#fbbf24' },
 { cx: 620, head: '#34d399', light: '#38bdf8', bubble: true },
 { cx: 850, head: '#a78bfa', light: '#fb7185' },
 { cx: 1075, head: '#38bdf8', light: '#34d399' },
]

const BLUE = '#3b82f6'
const DARK = '#1e293b'
const BASE = 360 // desk-top baseline

function Character({ cx, head, light, bubble }: Agent) {
 return (
  <g>
   {/* Character (this group bobs); desk drawn after so it sits in front */}
   <g className="cc-char">
    {/* body */}
    <rect x={cx - 40} y={BASE - 92} width={80} height={120} rx={40} fill={BLUE} />
    {/* head */}
    <circle cx={cx} cy={BASE - 118} r={32} fill={head} />
    {/* eyes */}
    <circle cx={cx - 11} cy={BASE - 120} r={3.6} fill={DARK} />
    <circle cx={cx + 11} cy={BASE - 120} r={3.6} fill={DARK} />
    {/* headset band + earpieces */}
    <path
     d={`M ${cx - 34} ${BASE - 122} Q ${cx} ${BASE - 164} ${cx + 34} ${BASE - 122}`}
     fill="none"
     stroke={DARK}
     strokeWidth={5}
     strokeLinecap="round"
    />
    <rect x={cx - 41} y={BASE - 130} width={9} height={18} rx={4} fill={DARK} />
    <rect x={cx + 32} y={BASE - 130} width={9} height={18} rx={4} fill={DARK} />
    {/* mic boom */}
    <path
     d={`M ${cx + 36} ${BASE - 119} Q ${cx + 30} ${BASE - 103} ${cx + 13} ${BASE - 103}`}
     fill="none"
     stroke={DARK}
     strokeWidth={4}
     strokeLinecap="round"
    />
    {/* call light on the earpiece */}
    <circle className="cc-light" cx={cx - 36} cy={BASE - 121} r={4.5} fill={light} />

    {/* chat bubble (starts hidden, GSAP pops it) */}
    {bubble && (
     <g className="cc-bubble" opacity={0}>
      <rect x={cx + 18} y={BASE - 196} width={64} height={40} rx={14} fill="#fff" stroke="#e2e8f0" strokeWidth={2} />
      <path d={`M ${cx + 34} ${BASE - 158} l 8 12 l 8 -12 z`} fill="#fff" />
      <circle cx={cx + 36} cy={BASE - 176} r={4} fill={BLUE} />
      <circle cx={cx + 50} cy={BASE - 176} r={4} fill={BLUE} />
      <circle cx={cx + 64} cy={BASE - 176} r={4} fill={BLUE} />
     </g>
    )}
   </g>

   {/* desk + monitor (static, in front of the seated character) */}
   <rect x={cx - 74} y={BASE} width={148} height={120} rx={12} fill="#dbe4f0" />
   <rect x={cx - 74} y={BASE} width={148} height={12} rx={6} fill="#c7d4e6" />
   <rect x={cx + 34} y={BASE} width={8} height={8} fill="#94a3b8" />
   <rect x={cx + 14} y={BASE - 36} width={54} height={36} rx={5} fill={DARK} />
   <rect className="cc-screen" x={cx + 18} y={BASE - 32} width={46} height={28} rx={3} fill={light} opacity={0.45} />
  </g>
 )
}

export function CallCenterScene() {
 const ref = useRef<SVGSVGElement>(null)

 useEffect(() => {
  const el = ref.current
  if (!el) return
  const ctx = gsap.context(() => {
   // Seat-bob: each character drifts up and back down, random stagger
   gsap.to('.cc-char', {
    y: -7,
    duration: 1.8,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    stagger: { each: 0.25, from: 'random' },
   })
   // Blinking call-lights
   gsap.to('.cc-light', {
    opacity: 0.25,
    duration: 0.85,
    ease: 'power1.inOut',
    yoyo: true,
    repeat: -1,
    stagger: { each: 0.4, from: 'random' },
   })
   // Monitor flicker
   gsap.to('.cc-screen', {
    opacity: 0.7,
    duration: 2.4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
    stagger: 0.6,
   })
   // Chat bubbles pop in and out on a loop
   gsap.fromTo(
    '.cc-bubble',
    { opacity: 0, scale: 0, transformOrigin: '50% 100%' },
    {
     opacity: 1,
     scale: 1,
     duration: 0.5,
     ease: 'back.out(2.2)',
     repeat: -1,
     repeatDelay: 3.4,
     yoyo: true,
     stagger: 1.7,
    },
   )
  }, el)
  return () => ctx.revert()
 }, [])

 return (
  <div
   aria-hidden
   className="pointer-events-none absolute inset-x-0 bottom-0 h-[72%] opacity-90 [mask-image:linear-gradient(to_top,black_58%,transparent)]"
  >
   <svg
    ref={ref}
    viewBox="0 0 1200 480"
    preserveAspectRatio="xMidYMax slice"
    className="h-full w-full"
   >
    {/* faint floor line */}
    <line x1="0" y1={BASE + 122} x2="1200" y2={BASE + 122} stroke="#c7d4e6" strokeWidth="2" />
    {AGENTS.map((a) => (
     <Character key={a.cx} {...a} />
    ))}
   </svg>
  </div>
 )
}
