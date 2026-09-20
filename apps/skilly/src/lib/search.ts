export interface Skill {
  id: string
  name: string
  repo: string
  category: string
  description: string
  content?: string
  rawSource?: string
  source: string
}

export function searchTerms(query: string) {
  return [
    ...new Set(
      query
        .slice(0, 300)
        .toLocaleLowerCase()
        .match(/[\p{L}\p{N}]+/gu) ?? []
    ),
  ]
}

export function highlight(text: string, query: string) {
  const terms = searchTerms(query).sort((a, b) => b.length - a.length)
  if (!terms.length) return [{ text, match: false }]
  // Terms contain only letters/numbers. Keep publisher content as escaped text in the UI.
  const pattern = new RegExp(`(${terms.join('|')})`, 'giu')
  return text
    .split(pattern)
    .filter(Boolean)
    .map((part) => ({ text: part, match: terms.includes(part.toLocaleLowerCase()) }))
}

export function searchSkills(
  skills: Skill[],
  query: string,
  category = 'All',
  sort = 'relevance',
  publisher = 'All'
) {
  const terms = searchTerms(query)
  return skills
    .filter(
      (skill) =>
        (category === 'All' || skill.category === category) &&
        (publisher === 'All' || skill.repo === publisher)
    )
    .flatMap((skill) => {
      const fields = [skill.name, skill.description, skill.content ?? '', skill.repo, skill.category].map(
        (value) => value.toLocaleLowerCase()
      )
      if (!terms.every((term) => fields.some((field) => field.includes(term)))) return []
      const score = terms.reduce(
        (total, term) =>
          total +
          fields.reduce(
            (sum, field, i) => sum + (field.includes(term) ? [10, 5, 1, 2, 2][i] : 0),
            0
          ),
        0
      )
      const contentTerms = terms.filter(
        (term) => !fields[0].includes(term) && !fields[1].includes(term) && fields[2].includes(term)
      )
      const passage = contentTerms.length ? skill.content ?? skill.description : skill.description
      const anchors = contentTerms.length ? contentTerms : terms
      const firstMatch =
        anchors
          .map((term) => passage.toLocaleLowerCase().indexOf(term))
          .filter((position) => position >= 0)
          .sort((a, b) => a - b)[0] ?? 0
      const position = Math.max(0, firstMatch - 65)
      const excerpt =
        (position ? '…' : '') +
        passage.slice(position, position + 230).replace(/[#*`]/g, '') +
        (passage.length > position + 230 ? '…' : '')
      const matchedIn = contentTerms.length
        ? 'instructions'
        : terms.some((term) => fields[1].includes(term))
          ? 'description'
          : terms.some((term) => fields[0].includes(term))
            ? 'name'
            : terms.some((term) => fields[3].includes(term))
              ? 'repository'
              : 'category'
      const { content, ...summary } = skill
      return [{ ...summary, score, excerpt, matchedIn }]
    })
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : b.score - a.score || a.name.localeCompare(b.name)
    )
}

export const PAGE_SIZE = 12
export function paginate<T>(items: T[], requestedPage: string | null) {
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const parsed = Number(requestedPage)
  const currentPage = Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, pages) : 1
  const offset = (currentPage - 1) * PAGE_SIZE
  return {
    items: items.slice(offset, offset + PAGE_SIZE),
    currentPage,
    pages,
    offset,
    count: items.length,
  }
}
