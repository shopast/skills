import { loadCatalog } from '$lib/server/catalog'
import { apiError, apiSkill, integerParam, json, requireAuthentication } from '$lib/server/skills-api'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ request, url, platform }) => {
  const catalog = await loadCatalog(platform)
  const authenticationError = requireAuthentication(request)
  if (authenticationError) return authenticationError
  const view = url.searchParams.get('view') ?? 'all-time'
  if (!['all-time', 'trending', 'hot'].includes(view))
    return apiError(400, 'invalid_view', 'View must be all-time, trending, or hot.')

  const page = integerParam(url.searchParams, 'page', 0, 0, Number.MAX_SAFE_INTEGER)
  const perPage = integerParam(url.searchParams, 'per_page', 100, 1, 500)
  if (page === null) return apiError(400, 'invalid_page', 'Page must be a non-negative integer.')
  if (perPage === null) return apiError(400, 'invalid_per_page', 'Per page must be between 1 and 500.')

  const skills = [...catalog.skills]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(apiSkill)
    .map((skill) =>
      view === 'hot' ? { ...skill, installsYesterday: 0, change: 0 } : skill
    )
  const start = page * perPage
  return json({
    data: skills.slice(start, start + perPage),
    pagination: {
      page,
      perPage,
      total: skills.length,
      hasMore: start + perPage < skills.length,
    },
  })
}
