import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { logger } from '@/lib/monitoring'

const CRON_SECRET = process.env.CRON_SECRET

export const dynamic = 'force-dynamic'

function authorized(request: NextRequest) {
  if (!CRON_SECRET) return false
  return request.headers.get('x-cron-secret') === CRON_SECRET
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(s: string): string {
  let r = escapeHtml(s)
  r = r.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  r = r.replace(/`([^`]+)`/g, '<code style="background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:0.92em;">$1</code>')
  return r
}

function renderMarkdown(md: string): string {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const h = line.match(/^(#{1,4})\s+(.+)$/)
    if (h) {
      const level = Math.min(h[1].length + 1, 6)
      const sizes: Record<number, string> = {
        2: 'font-size:20px;font-weight:600;letter-spacing:-0.01em;margin:24px 0 8px;',
        3: 'font-size:15px;font-weight:600;letter-spacing:0.01em;color:#374151;margin:18px 0 6px;text-transform:none;',
        4: 'font-size:13px;font-weight:600;color:#6b7280;margin:14px 0 4px;',
      }
      out.push(`<h${level} style="${sizes[level] || sizes[3]}">${renderInline(h[2])}</h${level}>`)
      i++
      continue
    }
    if (line.startsWith('|') && lines[i + 1]?.match(/^\|[\s\-:|]+\|$/)) {
      const headers = line.split('|').slice(1, -1).map((c) => c.trim())
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()))
        i++
      }
      const th = headers
        .map((c) => `<th style="text-align:left;padding:8px 12px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280;border-bottom:1px solid #e5e7eb;background:#fafafa;">${renderInline(c)}</th>`)
        .join('')
      const trs = rows
        .map(
          (r) =>
            `<tr>${r
              .map((c) => `<td style="padding:8px 12px;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">${renderInline(c)}</td>`)
              .join('')}</tr>`,
        )
        .join('')
      out.push(`<table style="border-collapse:collapse;width:100%;margin:8px 0 16px;border:1px solid #e5e7eb;">
<thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`)
      continue
    }
    if (line.match(/^[-*]\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^[-*]\s+/)) {
        items.push(`<li style="margin:4px 0;">${renderInline(lines[i].replace(/^[-*]\s+/, ''))}</li>`)
        i++
      }
      out.push(`<ul style="margin:6px 0 14px 18px;padding:0;font-size:14px;line-height:1.55;color:#111827;">${items.join('')}</ul>`)
      continue
    }
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = []
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(`<li style="margin:4px 0;">${renderInline(lines[i].replace(/^\d+\.\s+/, ''))}</li>`)
        i++
      }
      out.push(`<ol style="margin:6px 0 14px 22px;padding:0;font-size:14px;line-height:1.55;color:#111827;">${items.join('')}</ol>`)
      continue
    }
    if (line.trim() === '') {
      i++
      continue
    }
    if (line.startsWith('---')) {
      out.push('<hr style="border:none;border-top:1px solid #e5e7eb;margin:18px 0;">')
      i++
      continue
    }
    out.push(`<p style="margin:6px 0;font-size:14px;line-height:1.55;color:#111827;">${renderInline(line)}</p>`)
    i++
  }
  return out.join('\n')
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload: { subject?: unknown; markdown?: unknown }
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : ''
  const markdown = typeof payload.markdown === 'string' ? payload.markdown : ''
  if (!subject || !markdown) {
    return NextResponse.json({ error: 'subject and markdown required' }, { status: 400 })
  }

  const key = process.env.RESEND_API_KEY
  if (!key) {
    return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
  }
  const to = process.env.FOUNDER_EMAIL || 'anthony@cloudgreet.com'
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@cloudgreet.com'

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#f6f5f1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" width="640" style="max-width:640px;background:#ffffff;border:1px solid #e5e7eb;">
        <tr><td style="padding:24px 28px 8px;">
          <div style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">CloudGreet · scheduled digest</div>
          <div style="font-size:16px;font-weight:500;letter-spacing:-0.01em;margin-top:6px;">${escapeHtml(subject)}</div>
        </td></tr>
        <tr><td style="padding:8px 28px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          ${renderMarkdown(markdown)}
        </td></tr>
        <tr><td style="padding:0 28px 24px;">
          <div style="font-size:11px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:12px;">
            Sent by a scheduled CloudGreet agent · routine output also viewable at claude.ai/code/routines
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  try {
    const resend = new Resend(key)
    const result = await resend.emails.send({
      from: `CloudGreet <${fromEmail}>`,
      to,
      subject,
      text: markdown,
      html,
    })
    return NextResponse.json({ success: true, id: result.data?.id })
  } catch (error) {
    logger.warn('digest-relay send failed', {
      subject,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'send failed' },
      { status: 500 },
    )
  }
}
