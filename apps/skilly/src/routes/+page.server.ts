import { loadCatalog } from '$lib/server/catalog'
import { searchSkills, paginate } from '$lib/search'
import type { PageServerLoad } from './$types'
export const load: PageServerLoad = async ({ url, platform }) => {
  const catalog = await loadCatalog(platform)
  const query = (url.searchParams.get('q') ?? '').slice(0, 300)
  const categories = ['All', ...new Set(catalog.skills.map((skill) => skill.category))]
  const repositories = ['All', ...new Set(catalog.skills.map((skill) => skill.repo))]
  const requestedCategory = url.searchParams.get('category') ?? 'All'
  const category = categories.includes(requestedCategory) ? requestedCategory : 'All'
  const requestedPublisher = url.searchParams.get('publisher') ?? 'All'
  const publisher = repositories.includes(requestedPublisher) ? requestedPublisher : 'All'
  const sort = url.searchParams.get('sort') === 'name' ? 'name' : 'relevance'
  const { items, ...pagination } = paginate(
    searchSkills(catalog.skills, query, category, sort, publisher),
    url.searchParams.get('page')
  )
  return {
    query,
    category,
    sort,
    publisher,
    repositories,
    categories,
    skills: items,
    ...pagination,
    total: catalog.skills.length,
    publishers: new Set(catalog.skills.map((skill) => skill.repo.split('/')[0])).size,
    indexedAt: catalog.indexedAt,
  }
}
