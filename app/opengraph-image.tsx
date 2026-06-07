import { ImageResponse } from 'next/og'

// Branded 1200x630 social share card, generated at build time. Replaces
// the old broken reference to /icon-192.png (which never existed in /public).
export const runtime = 'edge'
export const alt = 'CloudGreet - 24/7 AI receptionist for service businesses'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
 return new ImageResponse(
  (
   <div
    style={{
     width: '100%',
     height: '100%',
     display: 'flex',
     flexDirection: 'column',
     justifyContent: 'space-between',
     background: '#f6f5f1',
     padding: '80px',
     fontFamily: 'sans-serif',
    }}
   >
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
     <div
      style={{
       width: '52px',
       height: '52px',
       borderRadius: '14px',
       background: '#0f172a',
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'center',
       color: '#fff',
       fontSize: '30px',
       fontWeight: 700,
      }}
     >
      C
     </div>
     <div style={{ fontSize: '34px', fontWeight: 600, color: '#0f172a' }}>CloudGreet</div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column' }}>
     <div
      style={{
       fontSize: '76px',
       fontWeight: 600,
       color: '#0f172a',
       lineHeight: 1.05,
       letterSpacing: '-2px',
      }}
     >
      Stop losing profit
     </div>
     <div
      style={{
       fontSize: '76px',
       fontWeight: 600,
       color: '#94a3b8',
       lineHeight: 1.05,
       letterSpacing: '-2px',
      }}
     >
      to voicemail.
     </div>
    </div>

    <div style={{ fontSize: '30px', color: '#64748b', display: 'flex' }}>
     A 24/7 AI receptionist for service businesses. Answers every call, books every job.
    </div>
   </div>
  ),
  { ...size },
 )
}
