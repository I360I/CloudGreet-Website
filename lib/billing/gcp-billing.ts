import { BigQuery } from '@google-cloud/bigquery'
import { logger } from '../monitoring'

/**
 * Reads real Google Cloud billing data from the BigQuery billing
 * export the user enabled in GCP Console (Detailed usage cost). This
 * is the bit-perfect, post-credits cost — same numbers you'd see in
 * the GCP Billing console.
 *
 * Required env:
 *   GCP_BILLING_PROJECT_ID — the project where the billing dataset lives
 *   GCP_BILLING_DATASET    — dataset name (e.g. "billing_export")
 *   GCP_BILLING_SA_JSON    — service account key JSON (raw string)
 *
 * Detailed-export tables are named gcp_billing_export_resource_v1_<billing_account_id>
 * — we don't ask the user to find the suffix, we auto-discover via
 * INFORMATION_SCHEMA.TABLES the first time and cache.
 */

let cachedClient: BigQuery | null = null
let cachedTable: string | null = null
let cachedTableExpires = 0

export function isGcpBillingConfigured(): boolean {
  return (
    !!process.env.GCP_BILLING_PROJECT_ID &&
    !!process.env.GCP_BILLING_DATASET &&
    !!process.env.GCP_BILLING_SA_JSON
  )
}

function getClient(): BigQuery {
  if (cachedClient) return cachedClient
  const raw = process.env.GCP_BILLING_SA_JSON || ''
  let credentials: any
  try {
    credentials = JSON.parse(raw)
  } catch {
    throw new Error('GCP_BILLING_SA_JSON is not valid JSON')
  }
  cachedClient = new BigQuery({
    projectId: credentials.project_id || process.env.GCP_BILLING_PROJECT_ID,
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
  })
  return cachedClient
}

/**
 * Find the detailed-billing-export table name. Detailed exports start
 * with `gcp_billing_export_resource_v1_`. We pick the first match.
 * Cached for 1h.
 */
async function getBillingTable(): Promise<string> {
  if (cachedTable && Date.now() < cachedTableExpires) return cachedTable
  const projectId = process.env.GCP_BILLING_PROJECT_ID!
  const dataset = process.env.GCP_BILLING_DATASET!
  const bq = getClient()

  const [rows] = await bq.query({
    query: `
      SELECT table_name
      FROM \`${projectId}.${dataset}.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name LIKE 'gcp_billing_export_resource_v1_%'
      ORDER BY table_name
      LIMIT 1
    `,
    location: 'US',
  })
  const name = rows?.[0]?.table_name
  if (!name) {
    throw new Error(
      'No detailed-export table found yet. Billing exports take 4–24h to populate after enabling in GCP. ' +
      'If it has been longer than that, double-check "Detailed usage cost" is set to the same dataset in Billing → Billing export.',
    )
  }
  cachedTable = `${projectId}.${dataset}.${name}`
  cachedTableExpires = Date.now() + 60 * 60 * 1000
  return cachedTable
}

export type PlacesSpendBreakdown = {
  range: 'today' | 'mtd' | 'last_30d' | 'last_90d'
  start_iso: string
  end_iso: string
  /** Pre-credit list cost in USD. */
  list_cost_usd: number
  /** Sum of credit lines (negative) — includes the $200/mo Maps free tier. */
  credit_usd: number
  /** What you'll actually be billed (list + credits). Always ≥ 0. */
  net_cost_usd: number
  /** SKU-level rollup, sorted by net cost desc. */
  skus: Array<{
    sku_id: string
    sku_description: string
    list_cost_usd: number
    credit_usd: number
    net_cost_usd: number
    usage_amount: number
    usage_unit: string | null
  }>
}

const RANGES = {
  today: () => {
    const start = new Date()
    start.setUTCHours(0, 0, 0, 0)
    return { start, end: new Date() }
  },
  mtd: () => {
    const start = new Date()
    start.setUTCDate(1)
    start.setUTCHours(0, 0, 0, 0)
    return { start, end: new Date() }
  },
  last_30d: () => {
    const end = new Date()
    const start = new Date(end.getTime() - 30 * 86_400_000)
    return { start, end }
  },
  last_90d: () => {
    const end = new Date()
    const start = new Date(end.getTime() - 90 * 86_400_000)
    return { start, end }
  },
} as const

/**
 * Pull Places API spend for a date range. Filters on the Maps Platform
 * service + Places sku descriptions. Credits are summed from the
 * `credits` repeated field (each row has 0..N credit entries — the
 * Maps $200 monthly credit, sustained-use discounts, etc).
 */
export async function getPlacesSpend(
  range: keyof typeof RANGES,
): Promise<PlacesSpendBreakdown> {
  const table = await getBillingTable()
  const { start, end } = RANGES[range]()

  const bq = getClient()
  const [rows] = await bq.query({
    query: `
      SELECT
        sku.id AS sku_id,
        sku.description AS sku_description,
        SUM(cost) AS list_cost,
        SUM(IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS credit,
        SUM(cost + IFNULL((SELECT SUM(c.amount) FROM UNNEST(credits) c), 0)) AS net_cost,
        SUM(IFNULL(usage.amount, 0)) AS usage_amount,
        ANY_VALUE(usage.unit) AS usage_unit
      FROM \`${table}\`
      WHERE service.description IN ('Maps API', 'Maps Platform', 'Geocoding API', 'Places API')
        AND (LOWER(sku.description) LIKE '%places%'
             OR LOWER(service.description) LIKE '%places%')
        AND usage_start_time >= @start
        AND usage_start_time < @end
      GROUP BY sku_id, sku_description
      ORDER BY net_cost DESC
    `,
    params: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    location: 'US',
  })

  let listSum = 0
  let creditSum = 0
  let netSum = 0
  const skus = (rows || []).map((r: any) => {
    const list = Number(r.list_cost || 0)
    const credit = Number(r.credit || 0)
    const net = Number(r.net_cost || 0)
    listSum += list
    creditSum += credit
    netSum += net
    return {
      sku_id: String(r.sku_id || ''),
      sku_description: String(r.sku_description || ''),
      list_cost_usd: list,
      credit_usd: credit,
      net_cost_usd: net,
      usage_amount: Number(r.usage_amount || 0),
      usage_unit: r.usage_unit ? String(r.usage_unit) : null,
    }
  })

  return {
    range,
    start_iso: start.toISOString(),
    end_iso: end.toISOString(),
    list_cost_usd: round2(listSum),
    credit_usd: round2(creditSum),
    net_cost_usd: round2(Math.max(0, netSum)),
    skus,
  }
}

/**
 * Convenience: pull all four ranges in parallel + the freshness of
 * the latest export row (so the admin UI can warn if data is stale).
 */
export async function getPlacesSpendDashboard(): Promise<{
  today: PlacesSpendBreakdown
  mtd: PlacesSpendBreakdown
  last_30d: PlacesSpendBreakdown
  last_90d: PlacesSpendBreakdown
  freshness_iso: string | null
}> {
  const [today, mtd, last_30d, last_90d, freshness] = await Promise.all([
    getPlacesSpend('today'),
    getPlacesSpend('mtd'),
    getPlacesSpend('last_30d'),
    getPlacesSpend('last_90d'),
    getExportFreshness().catch((e) => {
      logger.warn('billing freshness query failed', { error: e instanceof Error ? e.message : 'Unknown' })
      return null
    }),
  ])
  return { today, mtd, last_30d, last_90d, freshness_iso: freshness }
}

async function getExportFreshness(): Promise<string | null> {
  const table = await getBillingTable()
  const bq = getClient()
  const [rows] = await bq.query({
    query: `SELECT MAX(usage_end_time) AS latest FROM \`${table}\``,
    location: 'US',
  })
  const latest = rows?.[0]?.latest
  if (!latest) return null
  if (typeof latest === 'string') return latest
  if (latest?.value) return String(latest.value)
  return null
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
