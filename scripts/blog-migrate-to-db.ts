/** One-time: import content/blog/*.md into the blog_posts table. */
import { supabaseAdmin } from '../lib/supabase'
import fs from 'node:fs'
import path from 'node:path'
const DIR = path.join(process.cwd(), 'content', 'blog')
function parse(raw: string) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  const data: Record<string,string> = {}; let body = raw
  if (m) { body = m[2].trim(); for (const line of m[1].split('\n')) { const i=line.indexOf(':'); if(i<0)continue; let v=line.slice(i+1).trim(); if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1); data[line.slice(0,i).trim()]=v } }
  return { data, body }
}
;(async () => {
  const files = fs.readdirSync(DIR).filter(f=>f.endsWith('.md'))
  for (const f of files) {
    const slug = f.replace(/\.md$/,'')
    const { data, body } = parse(fs.readFileSync(path.join(DIR,f),'utf8'))
    const status = String(data.draft||'').toLowerCase()==='true' ? 'draft' : 'published'
    const keywords = (data.keywords||'').replace(/^\[|\]$/g,'').split(',').map(k=>k.trim().replace(/^["']|["']$/g,'')).filter(Boolean)
    const iso = new Date((data.date||'2026-06-16')+'T12:00:00Z').toISOString()
    const row = { slug, title: data.title||slug, description: data.description||'', body, keywords, author: data.author||'The CloudGreet Team', status, published_at: status==='published'?iso:null, created_at: iso }
    const { error } = await supabaseAdmin.from('blog_posts').upsert(row, { onConflict: 'slug' })
    console.log(error ? `FAIL ${slug}: ${error.message}` : `ok ${slug} (${status})`)
  }
})().catch(e=>{console.error(e);process.exit(1)})
