import yaml from 'js-yaml'

export function skillPaths(tree, prefix) {
  if (tree.truncated)
    throw new Error('Repository tree is truncated; refusing an incomplete refresh')
  if (!Array.isArray(tree.tree)) throw new Error('Invalid repository tree')
  return tree.tree
    .filter(
      (entry) =>
        entry.type === 'blob' &&
        entry.mode !== '120000' &&
        entry.path.startsWith(prefix) &&
        (entry.path === 'SKILL.md' || entry.path.endsWith('/SKILL.md'))
    )
    .map((entry) => entry.path)
    .sort()
}

export function parseSkill(markdown, source, path, revision, previousId) {
  const frontmatter = markdown.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!frontmatter) throw new Error(`Missing metadata: ${source.repo}/${path}`)
  const metadata = yaml.load(frontmatter[1], { schema: yaml.JSON_SCHEMA })
  if (
    !metadata ||
    typeof metadata.name !== 'string' ||
    !/^[a-z0-9][a-z0-9-]*$/.test(metadata.name) ||
    typeof metadata.description !== 'string' ||
    !metadata.description.trim()
  ) {
    throw new Error(`Invalid skill metadata: ${source.repo}/${path}`)
  }
  const folder = path.split('/').at(-2)
  return {
    id:
      previousId ??
      `${source.repo.replaceAll('/', '--')}--${path.slice(source.prefix.length, -9).replaceAll('/', '--')}`,
    name: metadata.name,
    repo: source.repo,
    category: source.categories?.[folder] ?? source.category,
    description: metadata.description.trim(),
    content: markdown.slice(frontmatter[0].length).trim(),
    source: `https://github.com/${source.repo}/blob/${revision}/${path}`,
    rawSource: `https://raw.githubusercontent.com/${source.repo}/${revision}/${path}`,
    path,
    revision,
  }
}
