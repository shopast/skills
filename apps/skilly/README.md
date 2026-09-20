# Skilly

Skilly is an independent agent-skill directory included with this fork. It
adds description-aware search to the skills ecosystem: the index reads the
YAML frontmatter description from every indexed `SKILL.md`, ranks matches in
names and descriptions, and can search the full instructions when they are
available.

Run from the repository root:

```bash
pnpm install
pnpm dev:skilly       # http://localhost:3065
pnpm check:skilly
pnpm test:skilly
pnpm build:skilly
```

The public API is documented at `/docs/api`; its OpenAPI document is
available at `/api/openapi.json`. The description search endpoint is:

```text
GET /api/v1/skills/search?q=typography&limit=20
```

It also supports `owner`, `name`, `description`, `category`, `source`, and
`instructions` filters. Search results include the skill description, source
repository, install URL, and canonical skill URL. Search is intentionally
public so agents can use it without a bearer token; listing, curated, and
detail endpoints retain the upstream authentication contract.

The checked-in catalog is a safe fallback. To refresh it from the complete
skills.sh catalog, provide `SKILLS_SH_API_TOKEN` or `VERCEL_OIDC_TOKEN` and
run:

```bash
pnpm --filter skilly catalog:refresh
```

The refresh validates the complete paginated catalog and pins GitHub sources
to immutable revisions before replacing the fallback snapshot.

## Cloudflare deployment

Skilly is a single Cloudflare Worker with Workers Static Assets. Configure a
Workers Build with this repository as the root, build command
`pnpm build:skilly`, and deploy command `pnpm --filter skilly exec wrangler
deploy`. Create the R2 bucket declared in `wrangler.jsonc` and set the
`CATALOG_INGEST_SECRET` secret before enabling the catalog sync function.

The sync function in `api/skilly-catalog-sync.ts` is a separate, private
Vercel Cron entry point because the upstream catalog API uses short-lived
Vercel OIDC tokens. Its setup is documented in
[`docs/SKILLY_CATALOG_SYNC.md`](../../docs/SKILLY_CATALOG_SYNC.md).

The repository links on skill pages identify the original publisher. Their
licenses and terms continue to apply.
