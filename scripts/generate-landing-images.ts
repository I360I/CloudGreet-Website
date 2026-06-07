/**
 * Generate landing-page imagery with Gemini 2.5 Flash Image ("nano banana").
 *
 * Images are generated ONCE here and saved as static files - the website never
 * calls the image API at runtime. Output goes to ./image-candidates/ (gitignored)
 * for review; copy the keepers into public/landing/ and reference them like any
 * other static asset.
 *
 * Run:  npx tsx --env-file=.env.local scripts/generate-landing-images.ts
 * Needs GEMINI_API_KEY in .env.local (from Google AI Studio).
 */
import { GoogleGenAI } from '@google/genai'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const apiKey = process.env.GEMINI_API_KEY
if (!apiKey) {
 console.error(
  '\nMissing GEMINI_API_KEY.\nAdd this line to .env.local (it is gitignored):\n  GEMINI_API_KEY=your_key_from_google_ai_studio\n',
 )
 process.exit(1)
}

const ai = new GoogleGenAI({ apiKey })
const MODEL = 'gemini-2.5-flash-image'

const OUT = join(process.cwd(), 'image-candidates')
mkdirSync(OUT, { recursive: true })

// Prompts are written for REAL editorial/documentary photography so the results
// don't read as AI. Natural light, candid framing, no text/logos/watermarks, and
// we lean on hands/phone/truck details over tight face close-ups (the usual AI
// tell). Tweak freely and re-run.
const STYLE =
 'Photorealistic candid documentary photograph, natural daylight, shallow depth of field, ' +
 'real-world textures, shot on a 35mm camera. No text, no logos, no watermarks, no illustration, ' +
 'no CGI look. Authentic American small-business service contractor.'

const JOBS: { name: string; prompt: string }[] = [
 {
  name: 'contractor-van-phone',
  prompt: `Wide 3:2 landscape. A tradesman in a plain work shirt standing beside his service van in a residential driveway, looking down at his phone, calm and focused, late afternoon golden light. ${STYLE}`,
 },
 {
  name: 'phone-confirmation-hands',
  prompt: `Wide 3:2 landscape. Close on a contractor's hands holding a smartphone showing a simple appointment-confirmation message, a parked work pickup truck softly blurred in the background, warm morning light. Face not visible. ${STYLE}`,
 },
 {
  name: 'truck-cab-call',
  prompt: `Wide 3:2 landscape. A service technician sitting in the cab of his pickup truck taking a phone call, one hand on the wheel, soft window light, relaxed and professional. ${STYLE}`,
 },
 {
  name: 'jobsite-phone',
  prompt: `Wide 3:2 landscape. A roofing or HVAC contractor on a suburban job site checking his phone between tasks, tools nearby, bright overcast daylight, documentary feel. ${STYLE}`,
 },
]

async function run() {
 console.log(`Generating ${JOBS.length} images with ${MODEL} -> ${OUT}\n`)
 for (const job of JOBS) {
  try {
   const response = await ai.models.generateContent({
    model: MODEL,
    contents: job.prompt,
    config: { responseModalities: ['TEXT', 'IMAGE'] },
   })
   const parts = response.candidates?.[0]?.content?.parts ?? []
   const imagePart = parts.find((p: any) => p.inlineData?.data)
   if (!imagePart) {
    const text = parts.map((p: any) => p.text).filter(Boolean).join(' ')
    console.error(`  [skip] ${job.name}: no image returned. ${text.slice(0, 160)}`)
    continue
   }
   const buffer = Buffer.from((imagePart as any).inlineData.data, 'base64')
   const file = join(OUT, `${job.name}.png`)
   writeFileSync(file, buffer)
   console.log(`  [ok]   ${job.name}.png  (${Math.round(buffer.length / 1024)} KB)`)
  } catch (e) {
   console.error(`  [err]  ${job.name}: ${e instanceof Error ? e.message : String(e)}`)
  }
 }
 console.log('\nDone. Review ./image-candidates/, then copy keepers into public/landing/.')
}

run()
