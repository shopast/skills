import { openApiDocument } from '$lib/server/api-spec'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = () => Response.json(openApiDocument(), { headers: { 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' } })
