import { describe, expect, it } from 'vitest'
import { POST } from '../routes/api/internal/catalog-ingest/+server'

const makeCatalog = (indexedAt: string) => ({
  indexedAt,
  sources: [{ id: 'source' }],
  skills: [
    {
      id: 'source/skill',
      name: 'skill',
      repo: 'owner/repo',
      category: 'Development',
      description: 'A searchable description.',
      source: 'https://github.com/owner/repo',
      path: 'skills/skill/SKILL.md',
      revision: 'a'.repeat(40),
    },
  ],
})

class FakeBucket {
  readonly writes: string[] = []
  readonly values = new Map<string, string>()
  async get(key: string) {
    const value = this.values.get(key)
    return value === undefined ? null : { json: async () => JSON.parse(value) }
  }
  async put(key: string, value: string) {
    this.writes.push(key)
    this.values.set(key, value)
  }
}

const requestFor = (catalog: unknown, secret = 'secret') =>
  new Request('https://skilly.example/api/internal/catalog-ingest', {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify(catalog),
  })

describe('Cloudflare catalog ingest', () => {
  it('rejects missing or incorrect credentials', async () => {
    const bucket = new FakeBucket()
    const response = await POST({
      request: requestFor(makeCatalog('2026-09-19T00:00:00.000Z'), 'wrong'),
      platform: { env: { CATALOG_INGEST_SECRET: 'secret', CATALOG_BUCKET: bucket } },
    } as never)
    expect(response.status).toBe(401)
  })

  it('writes the immutable snapshot before changing the current pointer', async () => {
    const bucket = new FakeBucket()
    const response = await POST({
      request: requestFor(makeCatalog('2026-09-19T00:00:00.000Z')),
      platform: { env: { CATALOG_INGEST_SECRET: 'secret', CATALOG_BUCKET: bucket } },
    } as never)
    expect(response.status).toBe(200)
    expect(bucket.writes).toHaveLength(2)
    expect(bucket.writes[0]).toMatch(/^catalog\/snapshots\/[a-f0-9]{64}\.json$/)
    expect(bucket.writes[1]).toBe('catalog/current.json')
  })

  it('is idempotent when only indexedAt changes', async () => {
    const bucket = new FakeBucket()
    const first = await POST({
      request: requestFor(makeCatalog('2026-09-19T00:00:00.000Z')),
      platform: { env: { CATALOG_INGEST_SECRET: 'secret', CATALOG_BUCKET: bucket } },
    } as never)
    const second = await POST({
      request: requestFor(makeCatalog('2026-09-20T00:00:00.000Z')),
      platform: { env: { CATALOG_INGEST_SECRET: 'secret', CATALOG_BUCKET: bucket } },
    } as never)
    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(await second.json()).toMatchObject({ status: 'unchanged' })
    expect(bucket.writes).toHaveLength(2)
  })
})
