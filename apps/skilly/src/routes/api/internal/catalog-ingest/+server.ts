import { error, json } from '@sveltejs/kit'
import { catalogKeys, parseCatalog, sha256Hex } from '$lib/server/catalog'
import type { RequestHandler } from './$types'

const MAX_BODY_BYTES = 25_000_000

function constantTimeEquals(left: string, right: string) {
  const a = new TextEncoder().encode(left)
  const b = new TextEncoder().encode(right)
  let result = a.length ^ b.length
  for (let index = 0; index < Math.max(a.length, b.length); index += 1)
    result |= (a[index] ?? 0) ^ (b[index] ?? 0)
  return result === 0
}

async function readLimitedText(request: Request) {
  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) throw error(413, 'Catalog snapshot is too large')
  if (!request.body) return request.text()
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.byteLength
      if (size > MAX_BODY_BYTES) throw error(413, 'Catalog snapshot is too large')
      chunks.push(next.value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}

export const POST: RequestHandler = async ({ request, platform }) => {
  const env = platform?.env
  const secret = env?.CATALOG_INGEST_SECRET
  const authorization = request.headers.get('authorization') ?? ''
  if (!secret || !constantTimeEquals(authorization, `Bearer ${secret}`))
    return json({ error: 'unauthorized' }, { status: 401 })
  if (!env.CATALOG_BUCKET) return json({ error: 'catalog_storage_unavailable' }, { status: 503 })

  let snapshot
  try {
    snapshot = parseCatalog(JSON.parse(await readLimitedText(request)))
  } catch (cause) {
    if (cause instanceof Response) throw cause
    return json({ error: 'invalid_catalog', message: cause instanceof Error ? cause.message : 'Invalid JSON' }, { status: 400 })
  }

  const body = JSON.stringify(snapshot) + '\n'
  // The publication key is content-addressed by the catalog itself, not by
  // indexedAt. This keeps scheduled refreshes idempotent when no skill changed.
  const stableContent = JSON.stringify({ sources: snapshot.sources, skills: snapshot.skills })
  const hash = await sha256Hex(stableContent)
  const snapshotKey = `catalog/snapshots/${hash}.json`
  const pointer = JSON.stringify({ snapshotKey, hash, indexedAt: snapshot.indexedAt, count: snapshot.skills.length }) + '\n'
  const current = await env.CATALOG_BUCKET.get(catalogKeys.current)
  if (current) {
    try {
      const existing = (await current.json()) as { snapshotKey?: string }
      if (existing.snapshotKey === snapshotKey) return json({ status: 'unchanged', count: snapshot.skills.length })
    } catch {
      // Replace malformed pointer after the validated snapshot is safely stored.
    }
  }
  await env.CATALOG_BUCKET.put(snapshotKey, body, {
    httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { hash, count: String(snapshot.skills.length), indexedAt: snapshot.indexedAt },
  })
  // R2 is strongly consistent. The immutable snapshot exists before this pointer changes.
  await env.CATALOG_BUCKET.put(catalogKeys.current, pointer, {
    httpMetadata: { contentType: 'application/json; charset=utf-8', cacheControl: 'no-store' },
  })
  return json({ status: 'updated', hash, count: snapshot.skills.length })
}
