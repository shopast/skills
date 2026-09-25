import { describe, expect, it } from 'vitest'
import { GET as list } from '../routes/api/v1/skills/+server'
import { GET as search } from '../routes/api/v1/skills/search/+server'
import { GET as curated } from '../routes/api/v1/skills/curated/+server'
import { GET as detail } from '../routes/api/v1/skills/[...path]/+server'

function event(url: string, authorization?: string, params?: Record<string, string>) {
  return {
    request: new Request(`https://skilly.test${url}`, authorization ? { headers: { authorization } } : {}),
    url: new URL(`https://skilly.test${url}`),
    params: params ?? {},
  } as never
}

async function body(response: Response) {
  return response.json() as Promise<Record<string, any>>
}

const bearer = 'Bearer test-oidc-token'

describe('Skilly API', () => {
  it('uses the documented authentication error contract', async () => {
    const response = await list(event('/api/v1/skills'))
    expect(response.status).toBe(401)
    expect(await body(response)).toEqual({
      error: 'authentication_required',
      message:
        'This endpoint requires authentication. Pass a bearer token in the Authorization header.',
    })
  })

  it('implements zero-indexed listing pagination and all documented views', async () => {
    const response = await list(event('/api/v1/skills?view=hot&page=0&per_page=2', bearer))
    const payload = await body(response)
    expect(response.status).toBe(200)
    expect(payload.data).toHaveLength(2)
    expect(payload.data[0]).toMatchObject({
      id: expect.stringMatching(/^.+\/.+\/.+$/),
      slug: expect.any(String),
      name: expect.any(String),
      source: expect.any(String),
      installs: 0,
      sourceType: 'github',
      installUrl: expect.stringMatching(/^https:\/\/github\.com\//),
      url: expect.stringMatching(/^https:\/\/skilly\.sh\//),
      installsYesterday: 0,
      change: 0,
    })
    expect(payload.pagination).toEqual({ page: 0, perPage: 2, total: expect.any(Number), hasMore: true })
  })

  it('rejects invalid list parameters with the documented error shape', async () => {
    for (const query of ['?page=-1', '?per_page=0', '?per_page=501', '?view=weekly']) {
      const response = await list(event(`/api/v1/skills${query}`, bearer))
      expect(response.status).toBe(400)
      expect(await body(response)).toEqual({ error: expect.any(String), message: expect.any(String) })
    }
  })

  it('implements search response fields, owner filtering, and search type', async () => {
    const response = await search(event('/api/v1/skills/search?q=algorithmic%20art&owner=anthropics&limit=5', bearer))
    const payload = await body(response)
    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ query: 'algorithmic art', searchType: 'semantic', count: 1, durationMs: expect.any(Number) })
    expect(payload.data[0]).toMatchObject({ source: 'anthropics/skills', slug: 'algorithmic-art' })
  })

  it('supports public field-specific search and returns searchable metadata', async () => {
    const response = await search(event('/api/v1/skills/search?name=algorithmic&category=Design&limit=5'))
    const payload = await body(response)
    expect(response.status).toBe(200)
    expect(payload.data).toHaveLength(1)
    expect(payload.data[0]).toMatchObject({
      source: 'anthropics/skills',
      slug: 'algorithmic-art',
      name: 'algorithmic-art',
      description: expect.any(String),
      category: 'Design',
    })
  })

  it('requires q or a field-specific search parameter', async () => {
    const response = await search(event('/api/v1/skills/search'))
    expect(response.status).toBe(400)
    expect(await body(response)).toEqual({
      error: 'invalid_query',
      message: 'Provide q or at least one field search parameter.',
    })
  })

  it('implements the curated envelope even when the snapshot has no curated providers', async () => {
    const response = await curated(event('/api/v1/skills/curated', bearer))
    expect(response.status).toBe(200)
    expect(await body(response)).toMatchObject({ data: [], totalOwners: 0, totalSkills: 0, generatedAt: expect.any(String) })
  })

  it('returns detail files, a content hash, and the minimal detail shape', async () => {
    const response = await detail(event('/api/v1/skills/anthropics/skills/algorithmic-art', bearer, { path: 'anthropics/skills/algorithmic-art' }))
    const payload = await body(response)
    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      id: 'anthropics/skills/algorithmic-art',
      source: 'anthropics/skills',
      slug: 'algorithmic-art',
      installs: 0,
      hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      files: [{ path: 'SKILL.md', contents: expect.stringContaining('name: algorithmic-art') }],
    })
    expect(Object.keys(payload).sort()).toEqual(['files', 'hash', 'id', 'installs', 'slug', 'source'])
  })

  it('keeps audit public and returns the documented no-audit error', async () => {
    const response = await detail(event('/api/v1/skills/audit/anthropics/skills/algorithmic-art', undefined, { path: 'audit/anthropics/skills/algorithmic-art' }))
    expect(response.status).toBe(404)
    expect(await body(response)).toEqual({
      error: 'not_found',
      message: 'No security audits found for this skill. Audits are generated automatically after a skill is installed for the first time.',
    })
  })

  it('returns the documented not-found shape for unknown skills', async () => {
    const response = await detail(event('/api/v1/skills/no/such/skill', bearer, { path: 'no/such/skill' }))
    expect(response.status).toBe(404)
    expect(await body(response)).toEqual({ error: 'not_found', message: 'Skill not found.' })
  })
})
