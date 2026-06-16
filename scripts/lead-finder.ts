/**
 * CloudGreet Lead Finder - terminal CLI (thin wrapper over lead-core.ts).
 *
 *   npx tsx --env-file=.env.local scripts/lead-finder.ts
 *
 * Prefer the browser console (lead-console.ts) if the terminal REPL is
 * fiddly. Both share the same agent core.
 */

import Anthropic from '@anthropic-ai/sdk'
import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { writeFileSync } from 'node:fs'
import { MODEL, envReady, runTurn, getLastResults, lastQueryDesc, buildCsv } from './lead-core'

function exportCsv(filename?: string): void {
  const rows = getLastResults()
  if (!rows.length) { console.log('\n  No results to export yet. Run a search first.\n'); return }
  const safe = (lastQueryDesc() || 'leads').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()
  const name = filename || `${process.env.HOME}/Downloads/leads-${safe}.csv`
  writeFileSync(name, buildCsv(rows))
  console.log(`\n  Exported ${rows.length} leads -> ${name}\n`)
}

async function main() {
  const ready = envReady()
  if (!ready.ok) { console.error(`Missing env: ${ready.missing.join(', ')}. Run with: npx tsx --env-file=.env.local scripts/lead-finder.ts`); process.exit(1) }

  const client = new Anthropic()
  const messages: Anthropic.MessageParam[] = []
  const rl = readline.createInterface({ input, output })

  console.log(`
CloudGreet Lead Finder  (model: ${MODEL})
Reuses the rep scraper's official Google Places search. Transport-ICP aware.

Try:  "find me 20 solo black car services in Columbus OH"
      "now only ones with under 50 reviews"
      "dig into Danny's Car Service - is it really solo?"  (reviews + website + web search)
      "draft outreach for the top 5"
Commands:  /csv [path]   export last results    |    /quit
`)

  for (;;) {
    let line: string
    try { line = (await rl.question('you › ')).trim() } catch { break }
    if (!line) continue
    if (line === '/quit' || line === '/exit') break
    if (line === '/help') { console.log('  /csv [path] to export, /quit to exit. Otherwise just talk.'); continue }
    if (line.startsWith('/csv')) { exportCsv(line.slice(4).trim() || undefined); continue }
    messages.push({ role: 'user', content: line })
    try {
      const text = await runTurn(client, messages, (s) => process.stdout.write(`  …${s}\n`))
      console.log('\n' + text + '\n')
    } catch (e) {
      console.error('\n  [error] ' + (e instanceof Error ? e.message : String(e)) + '\n')
    }
  }
  rl.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
