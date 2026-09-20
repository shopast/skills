import { loadCatalog } from '$lib/server/catalog'
import { json, requireAuthentication } from '$lib/server/skills-api'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ request, platform }) => {
  const catalog = await loadCatalog(platform)
  const authenticationError = requireAuthentication(request)
  if (authenticationError) return authenticationError
  return json(
    { data: [], totalOwners: 0, totalSkills: 0, generatedAt: catalog.indexedAt },
    'public, max-age=300'
  )
}
