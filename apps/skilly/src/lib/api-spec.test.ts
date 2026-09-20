import { describe, expect, it } from 'vitest'
import { apiEndpoints, openApiDocument } from './server/api-spec'
import { GET as openApi } from '../routes/api/openapi.json/+server'

describe('generated API documentation', () => {
  it('documents every endpoint from the shared endpoint registry', () => {
    const document = openApiDocument() as any
    expect(document.openapi).toBe('3.0.3')
    expect(Object.keys(document.paths)).toEqual(apiEndpoints.map((endpoint) => endpoint.path))
    for (const endpoint of apiEndpoints) {
      const operation = document.paths[endpoint.path].get
      expect(operation.summary).toBe(endpoint.summary)
      expect(operation.responses['200'].content['application/json'].schema.$ref).toBe(
        `#/components/schemas/${endpoint.response}`
      )
      expect(operation.security).toEqual(endpoint.auth ? [{ bearerAuth: [] }] : [])
    }
  })

  it('exposes a usable OpenAPI schema and bearer security definition', () => {
    const document = openApiDocument() as any
    expect(document.servers).toEqual([{ url: 'https://skilly.sh' }])
    expect(document.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    })
    expect(document.components.schemas).toEqual(
      expect.objectContaining({
        Skill: expect.any(Object),
        ListResponse: expect.any(Object),
        SearchResponse: expect.any(Object),
        DetailResponse: expect.any(Object),
        AuditResponse: expect.any(Object),
        Error: expect.any(Object),
      })
    )
  })

  it('serves the generated document as a cacheable cross-origin JSON endpoint', async () => {
    const response = await openApi({} as never)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect((await response.json() as { paths?: unknown }).paths).toBeTruthy()
  })
})
