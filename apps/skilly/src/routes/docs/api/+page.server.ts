import { apiBaseUrl, apiEndpoints } from '$lib/server/api-spec'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = () => ({ apiBaseUrl, apiEndpoints })
