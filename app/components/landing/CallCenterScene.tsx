/**
 * Ambient call-center scene behind the hero: a looping clip of the blue
 * agent characters at their desks (generated, optimized to /cganimation.mp4).
 *
 * The clip has a white background, so `mix-blend-multiply` drops the white
 * and lets the characters sit directly on the off-white page. The top is
 * masked to a fade so the scene dissolves up behind the headline.
 */
export function CallCenterScene() {
 return (
  <div
   aria-hidden
   className="pointer-events-none absolute inset-x-0 bottom-0 h-[82%] [mask-image:linear-gradient(to_top,black_62%,transparent)]"
  >
   <video
    autoPlay
    loop
    muted
    playsInline
    preload="auto"
    className="h-full w-full object-cover object-bottom mix-blend-multiply"
   >
    <source src="/cganimation.mp4" type="video/mp4" />
   </video>
  </div>
 )
}
