import type { IncomingMessage, ServerResponse } from 'node:http'
import { getVercelOidcToken } from '@vercel/oidc'
import { buildCatalog } from '../scripts/refresh-catalog.mjs'
import fallbackCatalog from '../src/lib/server/catalog.json' with { type: 'json' }

const env = {
  githubToken: process.env.GITHUB_TOKEN ?? '',
  ingestUrl: process.env.CLOUDFLARE_CATALOG_INGEST_URL ?? '',
  ingestSecret: process.env.CLOUDFLARE_CATALOG_INGEST_SECRET ?? '',
  cronSecret: process.env.CRON_SECRET ?? '',
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function sameSnapshot(a: { sources: unknown[]; skills: unknown[] }, b: { sources: unknown[]; skills: unknown[] }) {
  return JSON.stringify({ sources: a.sources, skills: a.skills }) === JSON.stringify({ sources: b.sources, skills: b.skills })
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' })
  if (!env.cronSecret || req.headers.authorization !== `Bearer ${env.cronSecret}`)
    return json(res, 401, { error: 'unauthorized' })
  if (!env.ingestUrl || !env.ingestSecret)
    return json(res, 500, { error: 'sync_configuration_missing' })

  try {
    // Resolve this inside the request. Vercel rotates the token and exposes it
    // through request context; caching it at module scope would be unsafe.
    const apiToken = await getVercelOidcToken()
    const candidate = await buildCatalog({
      apiToken,
      githubToken: env.githubToken,
      previous: fallbackCatalog,
    })
    if (sameSnapshot(fallbackCatalog, candidate))
      return json(res, 200, { status: 'unchanged', count: candidate.skills.length })

    const response = await fetch(env.ingestUrl, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.ingestSecret}`, 'content-type': 'application/json' },
      body: JSON.stringify(candidate),
    })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Cloudflare catalog ingest failed: HTTP ${response.status}`)
    return json(res, 200, body)
  } catch (cause) {
    console.error('Skilly catalog sync failed', cause)
    return json(res, 502, {
      error: 'catalog_sync_failed',
      message: cause instanceof Error ? cause.message : 'Unknown error',
    })
  }
}
