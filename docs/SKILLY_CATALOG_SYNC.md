# Skilly catalog sync

Skilly is deployed as a Cloudflare Worker. A private Vercel Cron function is
used only to obtain the short-lived upstream catalog credential, validate the
complete catalog, and upload an immutable snapshot to the Worker’s R2 bucket.

## Vercel project

Create a private Vercel project linked to this repository with
`apps/skilly` as its root directory and enable OIDC Federation. Configure:

| Variable | Value |
| --- | --- |
| `CRON_SECRET` | Random secret for the scheduled endpoint |
| `GITHUB_TOKEN` | Optional read-only token for higher GitHub API limits |
| `CLOUDFLARE_CATALOG_INGEST_URL` | `https://<skilly-domain>/api/internal/catalog-ingest` |
| `CLOUDFLARE_CATALOG_INGEST_SECRET` | Same value as Cloudflare’s `CATALOG_INGEST_SECRET` |

`apps/skilly/vercel.json` schedules `/api/skilly-catalog-sync` daily at 03:00
UTC. The endpoint validates every upstream page and source file and uploads
nothing when validation fails.

## Cloudflare Worker

Create the R2 bucket and secret from the repository root:

```bash
pnpm --filter skilly exec wrangler r2 bucket create skilly-catalog
pnpm --filter skilly exec wrangler secret put CATALOG_INGEST_SECRET
```

Do not put `VERCEL_OIDC_TOKEN` in Cloudflare secrets; it is short-lived and
scoped to the Vercel request. The checked-in catalog remains available as a
fallback if R2 is unavailable.
