import { describe, expect, it } from 'vitest'
import { fallback, loadCatalog, parseCatalog } from './server/catalog'

const snapshot = {
  indexedAt: '2026-09-19T00:00:00.000Z',
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
}

class FakeObject {
  constructor(private readonly value: unknown) {}
  async json() {
    return this.value
  }
}

class FakeBucket {
  readonly objects = new Map<string, unknown>()
  async get(key: string) {
    const value = this.objects.get(key)
    return value === undefined ? null : new FakeObject(value)
  }
  async put(key: string, value: string) {
    this.objects.set(key, JSON.parse(value))
  }
}

describe('runtime catalog loading', () => {
  it('rejects duplicate IDs and malformed required metadata', () => {
    expect(() => parseCatalog({ ...snapshot, skills: [snapshot.skills[0], snapshot.skills[0]] })).toThrow(
      'duplicate IDs'
    )
    expect(() => parseCatalog({ ...snapshot, skills: [{ ...snapshot.skills[0], description: 42 }] })).toThrow(
      'Invalid catalog snapshot'
    )
  })

  it('uses the checked-in catalog when no R2 binding is available', async () => {
    expect(await loadCatalog()).toBe(fallback())
  })

  it('loads the immutable snapshot addressed by the current pointer', async () => {
    const bucket = new FakeBucket()
    bucket.objects.set('catalog/current.json', {
      snapshotKey: 'catalog/snapshots/' + 'a'.repeat(64) + '.json',
    })
    bucket.objects.set('catalog/snapshots/' + 'a'.repeat(64) + '.json', snapshot)

    const loaded = await loadCatalog({ env: { CATALOG_BUCKET: bucket } } as never)
    expect(loaded.skills[0].description).toBe('A searchable description.')
  })

  it('falls back when the pointer is unsafe or the snapshot is invalid', async () => {
    const bucket = new FakeBucket()
    bucket.objects.set('catalog/current.json', { snapshotKey: '../catalog.json' })
    expect(await loadCatalog({ env: { CATALOG_BUCKET: bucket } } as never)).toBe(fallback())

    bucket.objects.set('catalog/current.json', {
      snapshotKey: 'catalog/snapshots/' + 'b'.repeat(64) + '.json',
    })
    bucket.objects.set('catalog/snapshots/' + 'b'.repeat(64) + '.json', { invalid: true })
    expect(await loadCatalog({ env: { CATALOG_BUCKET: bucket } } as never)).toBe(fallback())
  })
})
