import { loadCatalog } from '$lib/server/catalog'
import { apiError, apiSkill, json } from '$lib/server/skills-api'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, platform }) => {
  const catalog = await loadCatalog(platform)
  const query = (url.searchParams.get('q') ?? '').trim()
  if (query && query.length < 2)
    return apiError(400, 'invalid_query', 'Search query must be at least 2 characters.')
  const rawLimit = url.searchParams.get('limit')
  const limit = rawLimit === null ? 50 : /^\d+$/.test(rawLimit) ? Number(rawLimit) : NaN
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200)
    return apiError(400, 'invalid_limit', 'Limit must be between 1 and 200.')
  const owner = url.searchParams.get('owner')
  const filters = {
    name: (url.searchParams.get('name') ?? '').trim().toLocaleLowerCase(),
    description: (url.searchParams.get('description') ?? '').trim().toLocaleLowerCase(),
    category: (url.searchParams.get('category') ?? '').trim().toLocaleLowerCase(),
    source: (url.searchParams.get('source') ?? '').trim().toLocaleLowerCase(),
    instructions: (url.searchParams.get('instructions') ?? '').trim().toLocaleLowerCase(),
  }
  if (!query && !Object.values(filters).some(Boolean))
    return apiError(400, 'invalid_query', 'Provide q or at least one field search parameter.')
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const started = Date.now()
  const results = catalog.skills
    .filter((skill) => !owner || skill.repo.split('/')[0] === owner)
    .flatMap((skill) => {
      const fields = {
        name: skill.name.toLocaleLowerCase(),
        description: skill.description.toLocaleLowerCase(),
        category: skill.category.toLocaleLowerCase(),
        source: skill.repo.toLocaleLowerCase(),
        instructions: (skill.content ?? '').toLocaleLowerCase(),
      }
      if (!Object.entries(filters).every(([field, value]) => !value || fields[field as keyof typeof fields].includes(value))) return []
      const searchableFields = Object.values(fields)
      if (!terms.every((term) => searchableFields.some((field) => field.includes(term)))) return []
      const score = terms.reduce(
        (total, term) =>
          total + searchableFields.reduce((sum, field, index) => sum + (field.includes(term) ? [10, 5, 2, 2, 1][index] : 0), 0),
        0
      )
      return [{ skill, score }]
    })
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name))
    .slice(0, limit)
    .map(({ skill }) => apiSkill(skill))
  return json({
    data: results,
    query,
    searchType: terms.length > 1 ? 'semantic' : 'fuzzy',
    count: results.length,
    durationMs: Math.max(0, Date.now() - started),
  })
}
