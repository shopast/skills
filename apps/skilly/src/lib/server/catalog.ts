import fallbackCatalog from './catalog.json'

export type CatalogSkill = Omit<(typeof fallbackCatalog.skills)[number], 'content'> & {
  content?: string
  rawSource?: string
  installs?: number
  skillyId?: string
  skillyUrl?: string
  apiName?: string
  sourceType?: 'github' | 'well-known'
  installUrl?: string
  isDuplicate?: boolean
  contentHash?: string
}

export interface Catalog {
  indexedAt: string
  sources: unknown[]
  skills: CatalogSkill[]
}

const CURRENT_KEY = 'catalog/current.json'
const MAX_CATALOG_BYTES = 25_000_000

function isCatalog(value: unknown): value is Catalog {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Catalog>
  return (
    typeof candidate.indexedAt === 'string' &&
    Array.isArray(candidate.sources) &&
    Array.isArray(candidate.skills) &&
    candidate.skills.every(
      (skill) =>
        !!skill &&
        typeof skill === 'object' &&
        typeof skill.id === 'string' &&
        typeof skill.name === 'string' &&
        typeof skill.repo === 'string' &&
        typeof skill.category === 'string' &&
        typeof skill.description === 'string' &&
        typeof skill.source === 'string' &&
        typeof skill.path === 'string' &&
        typeof skill.revision === 'string'
    )
  )
}

export function parseCatalog(value: unknown): Catalog {
  if (!isCatalog(value)) throw new Error('Invalid catalog snapshot')
  if (JSON.stringify(value).length > MAX_CATALOG_BYTES) throw new Error('Catalog snapshot is too large')
  const ids = new Set(value.skills.map((skill) => skill.id))
  if (ids.size !== value.skills.length) throw new Error('Catalog snapshot contains duplicate IDs')
  return value
}

export function fallback(): Catalog {
  return fallbackCatalog as Catalog
}

export async function loadCatalog(platform?: App.Platform): Promise<Catalog> {
  const bucket = platform?.env?.CATALOG_BUCKET
  if (!bucket) return fallback()
  try {
    const pointer = await bucket.get(CURRENT_KEY)
    if (!pointer) return fallback()
    const manifest = (await pointer.json()) as { snapshotKey?: string }
    if (!manifest.snapshotKey || !/^catalog\/snapshots\/[a-f0-9]{64}\.json$/.test(manifest.snapshotKey)) return fallback()
    const snapshot = await bucket.get(manifest.snapshotKey)
    if (!snapshot) return fallback()
    return parseCatalog(await snapshot.json())
  } catch (error) {
    console.error('Skilly catalog snapshot unavailable; using checked-in fallback', error)
    return fallback()
  }
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const catalogKeys = { current: CURRENT_KEY }
