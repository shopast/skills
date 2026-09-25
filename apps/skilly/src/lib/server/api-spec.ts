export type ApiParameter = {
  name: string
  in: 'query' | 'path'
  required?: boolean
  type: string
  description: string
  example?: string | number
}

export type ApiEndpoint = {
  method: 'GET'
  path: string
  title: string
  summary: string
  description: string
  auth: boolean
  parameters: ApiParameter[]
  response: string
  example: string
  notes?: string[]
}

export const apiBaseUrl = 'https://skilly.sh'

export const apiEndpoints: ApiEndpoint[] = [
  { method: 'GET', path: '/api/v1/skills', title: 'List skills', summary: 'Browse the skill leaderboard.', description: 'Returns a paginated list of indexed skills. Pages are zero-indexed and installs are sorted highest-first by the upstream-compatible catalog view.', auth: true, parameters: [
    { name: 'view', in: 'query', type: 'string', description: 'Ranking view: all-time, trending, or hot.', example: 'all-time' },
    { name: 'page', in: 'query', type: 'integer', description: 'Zero-indexed page number.', example: 0 },
    { name: 'per_page', in: 'query', type: 'integer', description: 'Results per page, from 1 to 500.', example: 20 },
  ], response: 'ListResponse', example: 'curl -H "Authorization: Bearer $VERCEL_OIDC_TOKEN" "https://skilly.sh/api/v1/skills?view=trending&per_page=10"', notes: ['The hot view adds installsYesterday and change to each skill.'] },
  { method: 'GET', path: '/api/v1/skills/search', title: 'Search skills', summary: 'Search names, descriptions, categories, sources, and instructions.', description: 'Publicly searches the indexed skill catalog. Use q for a broad full-text search, or use name, description, category, source, and instructions to target specific fields. Field parameters are combined with AND.', auth: false, parameters: [
    { name: 'q', in: 'query', type: 'string', description: 'Broad full-text search across all indexed fields. Minimum 2 characters when provided.', example: 'react native' },
    { name: 'name', in: 'query', type: 'string', description: 'Match the skill name.', example: 'algorithmic' },
    { name: 'description', in: 'query', type: 'string', description: 'Match the YAML frontmatter description.', example: 'image generation' },
    { name: 'category', in: 'query', type: 'string', description: 'Match the catalog category.', example: 'Development' },
    { name: 'source', in: 'query', type: 'string', description: 'Match the source repository.', example: 'anthropics/skills' },
    { name: 'instructions', in: 'query', type: 'string', description: 'Match the full SKILL.md instructions.', example: 'security audit' },
    { name: 'limit', in: 'query', type: 'integer', description: 'Maximum results, from 1 to 200.', example: 5 },
    { name: 'owner', in: 'query', type: 'string', description: 'Restrict results to a GitHub owner.', example: 'anthropics' },
  ], response: 'SearchResponse', example: 'curl "https://skilly.sh/api/v1/skills/search?name=algorithmic&category=Development&limit=5"', notes: ['Provide q or at least one field-specific search parameter. No bearer token is required for search.'] },
  { method: 'GET', path: '/api/v1/skills/curated', title: 'Curated skills', summary: 'Get the official curated skill groups.', description: 'Returns first-party skill groups from the Skilly directory.', auth: true, parameters: [], response: 'CuratedResponse', example: 'curl "https://skilly.sh/api/v1/skills/curated"' },
  { method: 'GET', path: '/api/v1/skills/{source}/{skill}', title: 'Skill detail', summary: 'Fetch metadata and the complete SKILL.md file.', description: 'Use the id from a list or search response. For GitHub sources, source is the owner/repository path and skill is the skill slug.', auth: true, parameters: [
    { name: 'source', in: 'path', required: true, type: 'string', description: 'The source repository, such as anthropics/skills.', example: 'anthropics/skills' },
    { name: 'skill', in: 'path', required: true, type: 'string', description: 'The URL-safe skill slug.', example: 'algorithmic-art' },
  ], response: 'DetailResponse', example: 'curl -H "Authorization: Bearer $VERCEL_OIDC_TOKEN" "https://skilly.sh/api/v1/skills/anthropics/skills/algorithmic-art"' },
  { method: 'GET', path: '/api/v1/skills/audit/{source}/{skill}', title: 'Security audit', summary: 'Fetch available third-party security audits.', description: 'Returns all available provider audits for a skill. This endpoint is public; a skill with no available audit returns 404.', auth: false, parameters: [
    { name: 'source', in: 'path', required: true, type: 'string', description: 'The source repository, such as anthropics/skills.', example: 'anthropics/skills' },
    { name: 'skill', in: 'path', required: true, type: 'string', description: 'The URL-safe skill slug.', example: 'algorithmic-art' },
  ], response: 'AuditResponse', example: 'curl "https://skilly.sh/api/v1/skills/audit/anthropics/skills/algorithmic-art"', notes: ['Audit data is only returned after a provider has scanned the skill.'] },
]

const skillProperties = {
  id: { type: 'string', example: 'anthropics/skills/algorithmic-art' }, slug: { type: 'string', example: 'algorithmic-art' }, name: { type: 'string', example: 'algorithmic-art' }, description: { type: 'string', example: 'Create generative art with code.' }, category: { type: 'string', example: 'Design' }, source: { type: 'string', example: 'anthropics/skills' }, installs: { type: 'integer', minimum: 0, example: 24531 }, sourceType: { type: 'string', enum: ['github', 'well-known'] }, installUrl: { type: ['string', 'null'] }, url: { type: 'string', format: 'uri' }, isDuplicate: { type: 'boolean' },
}

export function openApiDocument() {
  const paths = Object.fromEntries(apiEndpoints.map((endpoint) => [endpoint.path, { get: {
    operationId: endpoint.title.toLowerCase().replaceAll(' ', '-'), summary: endpoint.summary, description: endpoint.description,
    security: endpoint.auth ? [{ bearerAuth: [] }] : [],
    parameters: endpoint.parameters.map((parameter) => ({ name: parameter.name, in: parameter.in, required: parameter.required ?? false, description: parameter.description, schema: { type: parameter.type }, ...(parameter.example === undefined ? {} : { example: parameter.example }) })),
    responses: { '200': { description: 'Successful response.', content: { 'application/json': { schema: { $ref: `#/components/schemas/${endpoint.response}` } } } }, '400': { description: 'Invalid request parameters.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }, '404': { description: 'Skill or audit not found.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } } },
  } }]))
  return {
    openapi: '3.0.3', info: { title: 'Skilly API', version: '1.0.0', description: 'Programmatic access to the Skilly agent-skill catalog.' }, servers: [{ url: apiBaseUrl }], security: [{ bearerAuth: [] }], paths,
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'Vercel OIDC' } }, schemas: {
      Skill: { type: 'object', required: ['id', 'slug', 'name', 'description', 'category', 'source', 'installs', 'sourceType', 'installUrl', 'url'], properties: skillProperties },
      Pagination: { type: 'object', properties: { page: { type: 'integer' }, perPage: { type: 'integer' }, total: { type: 'integer' }, hasMore: { type: 'boolean' } } },
      ListResponse: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Skill' } }, pagination: { $ref: '#/components/schemas/Pagination' } } },
      SearchResponse: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Skill' } }, query: { type: 'string' }, searchType: { type: 'string', enum: ['fuzzy', 'semantic'] }, count: { type: 'integer' }, durationMs: { type: 'integer' } } },
      CuratedResponse: { type: 'object', properties: { data: { type: 'array' }, totalOwners: { type: 'integer' }, totalSkills: { type: 'integer' }, generatedAt: { type: 'string', format: 'date-time' } } },
      DetailResponse: { type: 'object', properties: { id: { type: 'string' }, source: { type: 'string' }, slug: { type: 'string' }, installs: { type: 'integer' }, hash: { type: ['string', 'null'] }, files: { type: ['array', 'null'], items: { type: 'object', properties: { path: { type: 'string' }, contents: { type: 'string' } } } } } },
      AuditResponse: { type: 'object', properties: { id: { type: 'string' }, source: { type: 'string' }, slug: { type: 'string' }, audits: { type: 'array' } } }, Error: { type: 'object', required: ['error', 'message'], properties: { error: { type: 'string' }, message: { type: 'string' } } },
    } },
  }
}
