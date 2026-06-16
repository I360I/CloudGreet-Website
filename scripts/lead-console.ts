/**
 * CloudGreet Lead Finder - local browser console.
 *
 *   npx tsx --env-file=.env.local scripts/lead-console.ts
 *   then open http://localhost:4317
 *
 * A tiny private chat page (localhost only) so you can talk to the lead
 * agent like a Claude chat instead of the terminal. Single-user: the server
 * holds ONE conversation in memory. Same agent core as the CLI.
 * Not part of the deployed site.
 */

import http from 'node:http'
import Anthropic from '@anthropic-ai/sdk'
import { MODEL, makeClient, envReady, runTurn, getLastResults, buildCsv } from './lead-core'

const PORT = Number(process.env.LEAD_CONSOLE_PORT) || 4317
const ready = envReady()
if (!ready.ok) { console.error(`Missing env: ${ready.missing.join(', ')}. Run: npx tsx --env-file=.env.local scripts/lead-console.ts`); process.exit(1) }

const client = makeClient()
let messages: Anthropic.MessageParam[] = []

const PAGE = `<!doctype html><html><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>CloudGreet Lead Finder</title>
<style>
  :root { color-scheme: dark }
  * { box-sizing: border-box }
  body { margin:0; font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#0b0d10; color:#e8eaed }
  header { padding:14px 18px; border-bottom:1px solid #1c2127; display:flex; align-items:center; gap:12px; position:sticky; top:0; background:#0b0d10; z-index:2 }
  header b { font-weight:600 } header .muted { color:#8a929c; font-size:12px }
  header .sp { flex:1 }
  button { background:#1b1f26; color:#e8eaed; border:1px solid #2a3039; border-radius:8px; padding:7px 12px; font-size:13px; cursor:pointer }
  button:hover { background:#232832 } button:disabled { opacity:.5; cursor:default }
  #log { max-width:860px; margin:0 auto; padding:20px 18px 140px }
  .msg { margin:14px 0; display:flex; gap:10px }
  .msg .who { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:#7c8593; min-width:46px; padding-top:3px }
  .msg .body { white-space:pre-wrap; flex:1 }
  .msg.user .body { color:#bfe0ff }
  .status { color:#7c8593; font-size:13px; font-style:italic; margin:6px 0 6px 56px }
  .bubble { background:#13171d; border:1px solid #1c2127; border-radius:10px; padding:10px 13px; flex:1; white-space:pre-wrap; overflow-x:auto }
  table { border-collapse:collapse; margin:6px 0 } td,th { border:1px solid #2a3039; padding:3px 8px; font-size:13px } th { color:#9aa3ae }
  code { background:#1b1f26; padding:1px 5px; border-radius:4px }
  form { position:fixed; bottom:0; left:0; right:0; background:#0b0d10; border-top:1px solid #1c2127; padding:12px 18px }
  form .row { max-width:860px; margin:0 auto; display:flex; gap:10px }
  textarea { flex:1; resize:none; background:#13171d; color:#e8eaed; border:1px solid #2a3039; border-radius:10px; padding:10px 13px; font:inherit; min-height:44px; max-height:160px }
  .send { background:#2563eb; border-color:#2563eb; color:#fff; padding:0 18px }
</style></head><body>
<header>
  <b>CloudGreet Lead Finder</b>
  <span class="muted">${MODEL} · localhost</span>
  <span class="sp"></span>
  <button id="csv">Download CSV</button>
  <button id="reset">New chat</button>
</header>
<div id="log"></div>
<form id="f"><div class="row">
  <textarea id="q" placeholder="e.g. find me 20 solo black car services in Columbus OH" autofocus></textarea>
  <button class="send" type="submit">Send</button>
</div></form>
<script>
const log = document.getElementById('log'), q = document.getElementById('q'), f = document.getElementById('f')
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
// minimal markdown: bold, tables, links
function md(t){
  t = esc(t)
  // tables
  t = t.replace(/(?:^\\|.*\\|\\n?)+/gm, block => {
    const rows = block.trim().split('\\n').filter(r=>r.includes('|'))
    if (rows.length < 2) return block
    const cells = rows.map(r => r.replace(/^\\||\\|$/g,'').split('|').map(c=>c.trim()))
    if (!/^[-: ]+$/.test(cells[1].join(''))) return block
    let h = '<table><tr>'+cells[0].map(c=>'<th>'+c+'</th>').join('')+'</tr>'
    for (let i=2;i<cells.length;i++) h += '<tr>'+cells[i].map(c=>'<td>'+c+'</td>').join('')+'</tr>'
    return h+'</table>'
  })
  t = t.replace(/\\*\\*([^*]+)\\*\\*/g,'<b>$1</b>')
  t = t.replace(/(https?:\\/\\/[^\\s<)]+)/g,'<a href="$1" target="_blank" style="color:#7cc4ee">$1</a>')
  return t
}
function add(who, html, cls){
  const d = document.createElement('div'); d.className='msg '+(cls||'')
  d.innerHTML = '<div class="who">'+who+'</div><div class="'+(cls==='user'?'body':'bubble')+'">'+html+'</div>'
  log.appendChild(d); window.scrollTo(0,document.body.scrollHeight); return d
}
// live status line with elapsed timer + last activity
function liveStatus(){
  const d=document.createElement('div'); d.className='status'; log.appendChild(d)
  const started=Date.now(); let phase='thinking…'
  const fmt=()=>{ const s=Math.floor((Date.now()-started)/1000); const m=Math.floor(s/60); return (m? m+'m ':'')+(s%60)+'s' }
  const render=()=>{ d.textContent='… '+phase+'  ·  '+fmt() }
  render(); const iv=setInterval(render,1000)
  window.scrollTo(0,document.body.scrollHeight)
  return { set:(p)=>{ phase=p; render(); window.scrollTo(0,document.body.scrollHeight) }, done:()=>{ clearInterval(iv); d.remove() } }
}
async function send(){
  const text = q.value.trim(); if(!text) return
  q.value=''; add('you', esc(text), 'user')
  const st = liveStatus()
  try {
    const r = await fetch('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({message:text})})
    const reader = r.body.getReader(); const dec = new TextDecoder(); let buf=''
    for(;;){
      const {value,done} = await reader.read(); if(done) break
      buf += dec.decode(value,{stream:true})
      const parts = buf.split('\\n\\n'); buf = parts.pop()||''
      for(const p of parts){
        const ev=(p.match(/^event: (.*)$/m)||[])[1]; const dm=(p.match(/^data: (.*)$/m)||[])[1]
        if(!ev||!dm) continue
        let data={}; try{ data=JSON.parse(dm) }catch{}
        if(ev==='status') st.set(data.line)
        else if(ev==='done'){ st.done(); add('agent', md(data.text)) }
        else if(ev==='error'){ st.done(); add('agent','<span style="color:#ff8a8a">'+esc(data.message)+'</span>') }
      }
    }
    st.done()
  } catch(e){ st.done(); add('agent','<span style="color:#ff8a8a">'+esc(String(e))+'</span>') }
}
f.onsubmit = e => { e.preventDefault(); send() }
q.onkeydown = e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }
document.getElementById('csv').onclick = () => location.href='/api/csv'
document.getElementById('reset').onclick = async () => { await fetch('/api/reset',{method:'POST'}); log.innerHTML=''; q.focus() }
</script></body></html>`

function json(res: http.ServerResponse, code: number, body: unknown) {
  res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body))
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/'
  if (req.method === 'GET' && (url === '/' || url.startsWith('/?'))) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE); return
  }
  if (req.method === 'POST' && url === '/api/reset') { messages = []; json(res, 200, { ok: true }); return }
  if (req.method === 'GET' && url === '/api/csv') {
    const rows = getLastResults()
    if (!rows.length) { json(res, 404, { error: 'No results yet - run a search first.' }); return }
    res.writeHead(200, { 'content-type': 'text/csv', 'content-disposition': 'attachment; filename="cloudgreet-leads.csv"' })
    res.end(buildCsv(rows)); return
  }
  if (req.method === 'POST' && url === '/api/chat') {
    let raw = ''
    req.on('data', (c) => { raw += c })
    req.on('end', async () => {
      const msg = String((() => { try { return JSON.parse(raw || '{}').message } catch { return '' } })() || '').trim()
      if (!msg) { json(res, 400, { error: 'empty message' }); return }
      // Stream progress as Server-Sent Events so the browser can show what
      // the agent is doing live instead of a silent "thinking…".
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' })
      const sse = (event: string, data: unknown) => { try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`) } catch { /* client gone */ } }
      // heartbeat so proxies/timers know it's alive even between phases
      const beat = setInterval(() => sse('ping', { t: Date.now() }), 5000)
      try {
        messages.push({ role: 'user', content: msg })
        const text = await runTurn(client, messages, (line) => sse('status', { line }))
        sse('done', { text })
      } catch (e) {
        sse('error', { message: e instanceof Error ? e.message : String(e) })
      } finally {
        clearInterval(beat)
        res.end()
      }
    })
    return
  }
  res.writeHead(404); res.end('not found')
})

server.listen(PORT, () => {
  console.log(`\n  CloudGreet Lead Finder console  (model: ${MODEL})`)
  console.log(`  Open  ->  http://localhost:${PORT}\n`)
})
