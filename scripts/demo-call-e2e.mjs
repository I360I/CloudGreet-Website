import { chromium } from 'playwright'
const browser = await chromium.launch({
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
})
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 }, permissions: ['microphone'] })
const page = await ctx.newPage()
page.on('console', (m) => { if (['error', 'warning'].includes(m.type())) console.log('[console]', m.type(), m.text().slice(0, 300)) })
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)))
page.on('requestfailed', (r) => console.log('[reqfail]', r.url().slice(0, 140), '|', r.failure()?.errorText))
const target = process.argv[2] || 'https://cloudgreet.com/'
await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForTimeout(5000)
await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.6))
await page.waitForTimeout(2000)
const btn = page.locator('text=Talk to Mia').first()
await btn.click()
console.log('clicked Talk to Mia, waiting...')
await page.waitForTimeout(15000)
const errText = await page.evaluate(() => {
  const els = [...document.querySelectorAll('p')].filter((p) => p.className.includes('red'))
  return els.map((e) => e.textContent).join(' | ') || '(no visible error)'
})
console.log('UI error text:', errText)
const state = await page.evaluate(() => {
  const t = document.body.innerText
  return {
    live: t.includes('End call'),
    speaking: t.includes('is speaking') || t.includes('Listening'),
    connecting: t.includes('Connecting'),
    transcriptHasAgent: /Mia/.test(t),
  }
})
console.log('CALL STATE:', JSON.stringify(state))
await page.screenshot({ path: '/tmp/cg-qa/calltest.png', clip: { x: 0, y: 300, width: 900, height: 600 } })
await browser.close()
