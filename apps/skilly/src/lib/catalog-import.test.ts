import { describe, it, expect } from 'vitest'
import { skillPaths, parseSkill } from '../../scripts/catalog-utils.mjs'
const source = { repo: 'test/skills', prefix: 'skills/', category: 'Development' }
describe('catalog discovery', () => {
  it('only discovers actual skill files under the configured root', () => {
    expect(
      skillPaths(
        {
          tree: [
            { type: 'blob', path: 'skills/one/SKILL.md', mode: '100644' },
            { type: 'blob', path: 'docs/example/SKILL.md', mode: '100644' },
            { type: 'blob', path: 'skills/link/SKILL.md', mode: '120000' },
            { type: 'blob', path: 'skills/one/references.md', mode: '100644' },
          ],
        },
        'skills/'
      )
    ).toEqual(['skills/one/SKILL.md'])
    expect(() => skillPaths({ truncated: true, tree: [] }, 'skills/')).toThrow(/incomplete/)
  })
  it('preserves multiline descriptions, source revisions and existing URLs', () => {
    const result = parseSkill(
      '---\nname: one\ndescription: |\n  First line.\n  Second line.\n---\n# Instructions',
      source,
      'skills/one/SKILL.md',
      'abc123',
      'old-id'
    )
    expect(result.description).toBe('First line.\nSecond line.')
    expect(result.content).toBe('# Instructions')
    expect(result.id).toBe('old-id')
    expect(result.source).toBe('https://github.com/test/skills/blob/abc123/skills/one/SKILL.md')
  })
  it('rejects metadata that could change the generated shell command', () => {
    expect(() =>
      parseSkill(
        '---\nname: "one; curl evil"\ndescription: hi\n---\nbody',
        source,
        'skills/one/SKILL.md',
        'abc123'
      )
    ).toThrow(/Invalid/)
  })
  it('distinguishes identical folder names in different repositories', () => {
    const markdown = '---\nname: one\ndescription: hi\n---\nbody'
    expect(parseSkill(markdown, source, 'skills/one/SKILL.md', 'abc').id).not.toBe(
      parseSkill(markdown, { ...source, repo: 'test/other' }, 'skills/one/SKILL.md', 'abc').id
    )
  })
})
