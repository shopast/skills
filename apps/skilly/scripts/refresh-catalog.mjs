import { readFile, writeFile, rename, rm } from 'node:fs/promises'
import { skillPaths, parseSkill } from './catalog-utils.mjs'

const destination = new URL('../src/lib/server/catalog.json', import.meta.url)
const sleepDefault = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

async function getJson(fetchImpl, url, headers, label, sleep) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetchImpl(url, { headers, signal: AbortSignal.timeout(30000) })
    if (response.ok) return response.json()
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 3) {
      const body = await response.text().catch(() => '')
      throw new Error(`${label}: HTTP ${response.status}${body ? ` — ${body.slice(0, 300)}` : ''}`)
    }
    const retryAfter = Number(response.headers.get('retry-after'))
    const delay = Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 30000) : 1000 * 2 ** attempt
    await sleep(delay)
  }
  throw new Error(`Unreachable: ${label}`)
}

async function getText(fetchImpl, url, label, sleep) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(30000) })
    if (response.ok) {
      const text = await response.text()
      if (text.length > 500000) throw new Error(`${label}: SKILL.md exceeds 500 KB`)
      return text
    }
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === 3)
      throw new Error(`${label}: HTTP ${response.status}`)
    await sleep(1000 * 2 ** attempt)
  }
  throw new Error(`Unreachable: ${label}`)
}

async function loadSkillsShCatalog(fetchImpl, headers, sleep) {
  const all = []
  let page = 0
  let expectedTotal = null
  while (true) {
    const payload = await getJson(
      fetchImpl,
      `https://skills.sh/api/v1/skills?view=all-time&page=${page}&per_page=500`,
      headers,
      `skills.sh page ${page}`,
      sleep
    )
    if (!Array.isArray(payload.data) || !payload.pagination)
      throw new Error(`skills.sh page ${page}: invalid response shape`)
    expectedTotal ??= payload.pagination.total
    if (payload.pagination.total !== expectedTotal)
      throw new Error('skills.sh catalog changed while paging; retry the refresh')
    all.push(...payload.data)
    if (!payload.pagination.hasMore) break
    if (payload.data.length === 0)
      throw new Error(`skills.sh page ${page}: empty page with hasMore=true`)
    page += 1
  }
  if (expectedTotal === null || all.length !== expectedTotal)
    throw new Error(`skills.sh returned ${all.length} skills; expected ${expectedTotal}`)
  if (new Set(all.map((skill) => skill.id)).size !== all.length)
    throw new Error('skills.sh returned duplicate skill IDs')
  return all
}

export async function buildCatalog({ apiToken, githubToken, previous, fetchImpl = fetch, sleep = sleepDefault }) {
  if (!apiToken) throw new Error('Missing SKILLS_SH_API_TOKEN (skills.sh API authentication is required).')
  const skillsHeaders = { Accept: 'application/json', Authorization: `Bearer ${apiToken}` }
  const githubHeaders = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2026-03-10',
  }
  if (githubToken) githubHeaders.Authorization = `Bearer ${githubToken}`

  const upstreamSkills = await loadSkillsShCatalog(fetchImpl, skillsHeaders, sleep)
  const unsupported = upstreamSkills.filter(
    (skill) => skill.sourceType && skill.sourceType !== 'github'
  )
  if (unsupported.length)
    throw new Error(
      `Cannot safely index ${unsupported.length} non-GitHub skills; refusing a partial catalog`
    )

  const byRepo = new Map()
  for (const skill of upstreamSkills) {
    if (typeof skill.source !== 'string' || !/^[^/]+\/[^/]+$/.test(skill.source))
      throw new Error(`Invalid GitHub source for ${skill.id}`)
    const list = byRepo.get(skill.source) ?? []
    list.push(skill)
    byRepo.set(skill.source, list)
  }

  const indexed = []
  const revisions = []
  for (const [repo, repoSkills] of byRepo) {
    const repoInfo = await getJson(fetchImpl, `https://api.github.com/repos/${repo}`, githubHeaders, `${repo} metadata`, sleep)
    const branch = repoInfo.default_branch
    if (typeof branch !== 'string' || !branch) throw new Error(`${repo}: missing default branch`)
    const reference = await getJson(
      fetchImpl,
      `https://api.github.com/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
      githubHeaders,
      `${repo} branch`,
      sleep
    )
    const revision = reference.object?.sha
    if (typeof revision !== 'string' || !revision) throw new Error(`${repo}: missing immutable revision`)
    const tree = await getJson(
      fetchImpl,
      `https://api.github.com/repos/${repo}/git/trees/${revision}?recursive=1`,
      githubHeaders,
      `${repo} tree`,
      sleep
    )
    if (tree.truncated) throw new Error(`${repo}: GitHub returned a truncated tree`)
    const paths = skillPaths(tree, '')
    if (!paths.length) throw new Error(`${repo}: no SKILL.md files found`)

    const markdownByPath = new Map()
    for (let offset = 0; offset < paths.length; offset += 8) {
      const batch = await Promise.all(
        paths.slice(offset, offset + 8).map(async (path) => [
          path,
          await getText(
            fetchImpl,
            `https://raw.githubusercontent.com/${repo}/${revision}/${path}`,
            `${repo}/${path}`,
            sleep
          ),
        ])
      )
      for (const [path, markdown] of batch) markdownByPath.set(path, markdown)
    }
    const parsedByPath = new Map()
    for (const [path, markdown] of markdownByPath) {
      try {
        parsedByPath.set(
          path,
          parseSkill(markdown, { repo, prefix: '', category: 'Community' }, path, revision)
        )
      } catch (error) {
        throw new Error(`${repo}/${path}: ${error.message}`)
      }
    }

    const usedPaths = new Set()
    for (const upstream of repoSkills) {
      const slug = String(upstream.slug ?? upstream.skillId ?? '').toLocaleLowerCase()
      const name = String(upstream.name ?? '').toLocaleLowerCase()
      const matches = [...parsedByPath.entries()].filter(([path, skill]) => {
        if (usedPaths.has(path)) return false
        const folder = path.split('/').at(-2)?.toLocaleLowerCase() ?? ''
        return folder === slug || skill.name.toLocaleLowerCase() === name || skill.name.toLocaleLowerCase() === slug
      })
      if (matches.length !== 1)
        throw new Error(`${repo}/${upstream.skillId ?? upstream.id}: expected one SKILL.md match, found ${matches.length}`)
      const [path, parsed] = matches[0]
      usedPaths.add(path)
      const old = previous.skills.find(
        (skill) => skill.repo === repo && (skill.path === path || skill.source.endsWith(`/${path}`))
      )
      const { content, ...metadata } = parsed
      indexed.push({
        ...metadata,
        id: old?.id ?? metadata.id,
        category: old?.category ?? metadata.category,
        skillsShId: upstream.id,
        apiName: upstream.name,
        sourceType: upstream.sourceType ?? 'github',
        ...(upstream.isDuplicate ? { isDuplicate: true } : {}),
        installs: Number.isSafeInteger(upstream.installs) ? upstream.installs : 0,
        skillsShUrl: `https://skills.sh/${upstream.id}`,
        installUrl: upstream.installUrl ?? `https://github.com/${repo}`,
        contentHash: [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content)))]
          .map((byte) => byte.toString(16).padStart(2, '0')).join(''),
      })
    }
    if (usedPaths.size !== repoSkills.length) throw new Error(`${repo}: not all skills were indexed`)
    revisions.push({ repo, revision, skills: repoSkills.length, files: paths.length })
  }

  indexed.sort((a, b) => a.id.localeCompare(b.id))
  if (indexed.length !== upstreamSkills.length) throw new Error('Generated catalog is incomplete')
  if (new Set(indexed.map((skill) => skill.id)).size !== indexed.length)
    throw new Error('Duplicate generated skill IDs')
  return { indexedAt: new Date().toISOString(), sources: revisions, skills: indexed }
}

if (process.argv[1] && new URL(`file://${process.argv[1]}`).href === import.meta.url) {
  const previous = JSON.parse(await readFile(destination, 'utf8'))
  const catalog = await buildCatalog({
    apiToken: process.env.SKILLS_SH_API_TOKEN || process.env.VERCEL_OIDC_TOKEN,
    githubToken: process.env.GITHUB_TOKEN,
    previous,
  })
  const temporary = new URL(`../src/lib/server/catalog.${process.pid}.tmp`, import.meta.url)
  try {
    await writeFile(temporary, JSON.stringify(catalog, null, 2) + '\n', { flag: 'wx' })
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
  console.log(`Indexed ${catalog.skills.length} skills with frontmatter descriptions.`)
}
