import { type Catalog, type CatalogSkill } from './catalog'
type IndexedSkill = CatalogSkill

export interface ApiSkill {
  id: string
  slug: string
  name: string
  description: string
  category: string
  source: string
  installs: number
  sourceType: 'github' | 'well-known'
  installUrl: string
  url: string
  isDuplicate?: boolean
}

export function apiSkill(skill: CatalogSkill): ApiSkill {
  const indexed = skill as IndexedSkill
  const id = indexed.skillyId ?? `${skill.repo}/${skill.name}`
  return {
    id,
    slug: id.split('/').at(-1) ?? skill.name,
    name: indexed.apiName ?? skill.name,
    description: skill.description,
    category: skill.category,
    source: skill.repo,
    installs: indexed.installs ?? 0,
    sourceType: indexed.sourceType ?? 'github',
    installUrl: indexed.installUrl ?? `https://github.com/${skill.repo}`,
    url: indexed.skillyUrl ?? `https://skilly.sh/skills/${skill.id}`,
    ...(indexed.isDuplicate ? { isDuplicate: true } : {}),
  }
}

export function findSkill(catalog: Catalog, id: string): CatalogSkill | undefined {
  const normalized = id.replace(/^github\//, '')
  return catalog.skills.find((skill) => {
    const indexed = skill as IndexedSkill
    return (
      indexed.skillyId === normalized ||
      indexed.skillyUrl?.replace('https://skilly.sh/skills/', '') === normalized ||
      `${skill.repo}/${skill.name}` === normalized
    )
  })
}

export function apiError(status: number, error: string, message: string) {
  return Response.json(
    { error, message },
    { status, headers: { 'Cache-Control': 'public, max-age=0, must-revalidate' } }
  )
}

export function requireAuthentication(request: Request) {
  const authorization = request.headers.get('authorization')
  if (authorization?.startsWith('Bearer ') && authorization.length > 'Bearer '.length)
    return null
  return apiError(
    401,
    'authentication_required',
    'This endpoint requires authentication. Pass a bearer token in the Authorization header.'
  )
}

export function json<T>(body: T, cacheControl = 'public, max-age=30') {
  return Response.json(body, { headers: { 'Cache-Control': cacheControl } })
}

export function integerParam(
  params: URLSearchParams,
  name: string,
  fallback: number,
  min: number,
  max: number
) {
  const raw = params.get(name)
  if (raw === null || raw === '') return fallback
  if (!/^\d+$/.test(raw)) return null
  const value = Number(raw)
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : null
}

export async function skillMarkdown(skill: CatalogSkill) {
  if (!skill.content) {
    const rawSource = `https://raw.githubusercontent.com/${skill.repo}/${skill.revision}/${skill.path}`
    const response = await fetch(rawSource, { headers: { accept: 'text/plain' } })
    if (response.ok) return response.text()
  }
  return `---\nname: ${skill.name}\ndescription: ${JSON.stringify(skill.description)}\n---\n\n${skill.content ?? ''}\n`
}

export function skillApiId(skill: CatalogSkill) {
  return apiSkill(skill).id
}

export function skillApiSlug(skill: CatalogSkill) {
  return apiSkill(skill).slug
}

export function skillIdParts(path: string) {
  const parts = path.split('/').filter(Boolean)
  if (parts.length < 2) return null
  const slug = parts.at(-1)!
  const source = parts.slice(0, -1).join('/')
  return { source, slug, id: `${source}/${slug}` }
}
