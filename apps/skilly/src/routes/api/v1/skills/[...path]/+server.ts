import {
  apiError,
  findSkill,
  json,
  requireAuthentication,
  skillApiId,
  skillApiSlug,
  skillIdParts,
  skillMarkdown,
} from '$lib/server/skills-api'
import { loadCatalog } from '$lib/server/catalog'
import type { RequestHandler } from './$types'

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const GET: RequestHandler = async ({ request, params, platform }) => {
  const catalog = await loadCatalog(platform)
  const path = params.path
  if (path.startsWith('audit/')) {
    const parts = skillIdParts(path.slice('audit/'.length))
    const skill = parts && findSkill(catalog, parts.id)
    if (!skill) return apiError(404, 'not_found', 'Skill not found.')
    // The upstream API returns 404 when no provider has produced an audit yet.
    return apiError(
      404,
      'not_found',
      'No security audits found for this skill. Audits are generated automatically after a skill is installed for the first time.'
    )
  }

  const authenticationError = requireAuthentication(request)
  if (authenticationError) return authenticationError

  const parts = skillIdParts(path)
  const skill = parts && findSkill(catalog, parts.id)
  if (!skill) return apiError(404, 'not_found', 'Skill not found.')
  const markdown = await skillMarkdown(skill)
  return json(
    {
      id: skillApiId(skill),
      source: skill.repo,
      slug: skillApiSlug(skill),
      installs: (skill as { installs?: number }).installs ?? 0,
      hash: (skill as { contentHash?: string }).contentHash ?? (await sha256(markdown)),
      files: [{ path: 'SKILL.md', contents: markdown }],
    },
    'public, max-age=300'
  )
}
