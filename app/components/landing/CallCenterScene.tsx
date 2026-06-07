/**
 * Ambient call-center scene behind the hero: a looping clip of the blue
 * agent characters at their desks (CapCut export, cropped + transcoded to
 * the browser-safe /cganimation.mp4).
 *
 * The clip has a white background, so `mix-blend-multiply` drops the white
 * and lets the characters sit directly on the off-white page. It runs as a
 * full-width band along the bottom, with the top masked to a soft fade so
 * it dissolves up behind the headline.
 */
export function CallCenterScene() {
 return (
  <div
   aria-hidden
   className="pointer-events-none absolute inset-x-0 bottom-0 [mask-image:linear-gradient(to_top,black_78%,transparent)]"
  >
   <video
    autoPlay
    loop
    muted
    playsInline
    preload="auto"
    className="h-auto w-full mix-blend-multiply"
   >
    <source src="/cganimation.mp4" type="video/mp4" />
   </video>
  </div>
 )
}
