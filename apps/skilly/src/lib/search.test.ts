import { describe, it, expect } from 'vitest'
import { searchSkills, highlight, paginate, PAGE_SIZE, type Skill } from './search'
const skills: Skill[] = [
  {
    id: 'a',
    name: 'layout',
    repo: 'test/design',
    category: 'Design',
    description: 'Build interfaces with distinctive typography.',
    content: 'Use asymmetry and whitespace to establish hierarchy.',
    source: 'https://example.com/a',
  },
  {
    id: 'b',
    name: 'typography',
    repo: 'test/design',
    category: 'Development',
    description: 'Font tooling',
    content: 'Generate subsets.',
    source: 'https://example.com/b',
  },
]
describe('full skill search', () => {
  it('finds description matches and ranks name matches first', () => {
    expect(searchSkills(skills, 'typography').map((s) => s.id)).toEqual(['b', 'a'])
  })
  it('searches frontmatter descriptions when full instructions are lazy-loaded', () => {
    const metadataOnly = [{ ...skills[0], content: undefined }]
    expect(searchSkills(metadataOnly, 'distinctive typography')[0].id).toBe('a')
  })
  it('finds text present only in instructions and returns its passage', () => {
    const result = searchSkills(skills, 'asymmetry')[0]
    expect(result.id).toBe('a')
    expect(result.matchedIn).toBe('instructions')
    expect(result.excerpt).toContain('asymmetry')
    expect(result).not.toHaveProperty('content')
  })
  it('requires all terms across fields, ignoring case and punctuation', () => {
    expect(searchSkills(skills, 'LAYOUT, hierarchy')).toHaveLength(1)
    expect(searchSkills(skills, 'layout absent')).toHaveLength(0)
  })
  it('combines categories with description search', () => {
    expect(searchSkills(skills, 'typography', 'Design').map((s) => s.id)).toEqual(['a'])
  })
  it('handles empty search and alphabetical sorting', () => {
    expect(searchSkills(skills, '  ', 'All', 'name').map((s) => s.id)).toEqual(['a', 'b'])
  })
})

describe('search browsing', () => {
  it('filters by repository without confusing repository matches with instructions', () => {
    const result = searchSkills(skills, 'test/design', 'All', 'relevance', 'test/design')
    expect(result).toHaveLength(2)
    expect(result[0].matchedIn).toBe('repository')
    expect(searchSkills(skills, '', 'All', 'relevance', 'missing/repo')).toHaveLength(0)
  })
  it('keeps highlighted text escaped and handles repeated terms', () => {
    const parts = highlight('<script>typography</script>', 'typography typography')
    expect(parts.filter((part) => part.match)).toEqual([{ text: 'typography', match: true }])
    expect(parts.map((part) => part.text).join('')).toBe('<script>typography</script>')
    expect(highlight('hello', '[.*]')).toEqual([{ text: 'hello', match: false }])
  })
  it('clamps invalid pages and bounds result payloads', () => {
    const items = Array.from({ length: 30 }, (_, i) => i)
    expect(paginate(items, '2').items).toEqual(items.slice(PAGE_SIZE, PAGE_SIZE * 2))
    expect(paginate(items, '999').currentPage).toBe(3)
    expect(paginate(items, '-1').currentPage).toBe(1)
    expect(paginate(items, '1.5').currentPage).toBe(1)
    expect(paginate([], '2')).toMatchObject({ items: [], currentPage: 1, pages: 1, count: 0 })
  })
})
