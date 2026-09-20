import { error } from '@sveltejs/kit'
import { loadCatalog } from '$lib/server/catalog'
import type { PageServerLoad } from './$types'
export const load: PageServerLoad = async ({ params, url, fetch, platform }) => {
  const catalog = await loadCatalog(platform)
  const skill = catalog.skills.find((skill) => skill.id === params.id)
  if (!skill) error(404, 'Skill not found')
  let content = skill.content ?? ''
  if (!content) {
    const rawSource = `https://raw.githubusercontent.com/${skill.repo}/${skill.revision}/${skill.path}`
    const response = await fetch(rawSource, { headers: { Accept: 'text/plain' } })
    if (!response.ok) error(502, 'The original skill instructions are temporarily unavailable')
    content = await response.text()
  }
  const query = (url.searchParams.get('q') ?? '').slice(0, 300)
  const back = new URLSearchParams()
  for (const key of ['q', 'category', 'publisher', 'sort', 'page']) {
    const value = url.searchParams.get(key)?.slice(0, 300)
    if (value) back.set(key, value)
  }
  return { skill: { ...skill, content }, query, backHref: `/${back.size ? `?${back}` : ''}#directory` }
}
