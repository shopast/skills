import type { Fetcher, R2Bucket } from '@cloudflare/workers-types'

declare global {
  namespace App {
    interface Platform {
      env?: {
        ASSETS?: Fetcher
        CATALOG_BUCKET?: R2Bucket
        CATALOG_INGEST_SECRET?: string
      }
    }
  }
}

export {}
