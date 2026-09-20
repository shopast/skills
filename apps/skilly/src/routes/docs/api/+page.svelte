<script lang="ts">
  import { Check, ChevronDown, Copy, Download, ExternalLink, KeyRound } from '@lucide/svelte'
  import type { PageData } from './$types'

  let { data }: { data: PageData } = $props()
  let copied = $state('')
  let open = $state('')
  $effect(() => {
    if (!open) open = data.apiEndpoints[0]?.path ?? ''
  })

  async function copy(path: string, example: string) {
    try {
      await navigator.clipboard.writeText(example)
      copied = path
      setTimeout(() => { if (copied === path) copied = '' }, 1800)
    } catch { copied = '' }
  }

  function anchor(path: string) {
    return path.replaceAll('/', '-').replaceAll('{', '').replaceAll('}', '')
  }
</script>

<svelte:head>
  <title>API reference — Skilly</title>
  <meta name="description" content="Automatically generated API reference for the Skilly agent skill catalog." />
</svelte:head>

<main id="main" class="api-docs">
  <section class="api-hero">
    <div>
      <span class="eyebrow"><i></i> DEVELOPER API / V1</span>
      <h1>The skill index,<br /><span>at your fingertips.</span></h1>
      <p>Build agent tooling on top of the Skilly catalog. Discover skills, search what they do, fetch complete instructions, and inspect available security audits.</p>
      <div class="api-actions"><a class="api-button primary" href="/api/openapi.json" target="_blank"><Download size={16} /> Download OpenAPI</a><a class="api-button" href="#endpoints">Explore endpoints <ChevronDown size={16} /></a></div>
    </div>
    <div class="api-hero-card"><span class="mono">BASE URL</span><code>{data.apiBaseUrl}</code><span class="api-status"><i></i> API v1 · JSON over HTTPS</span></div>
  </section>

  <div class="api-layout">
    <aside class="api-sidebar"><span class="mono sidebar-label">ON THIS PAGE</span><a href="#quickstart">Quickstart</a><a href="#authentication">Authentication</a><a href="#endpoints">Endpoints</a>{#each data.apiEndpoints as endpoint}<a href={'#' + anchor(endpoint.path)}>{endpoint.title}</a>{/each}<a href="#errors">Errors</a></aside>
    <div class="api-content">
      <section id="quickstart" class="api-section intro-section"><span class="eyebrow muted">QUICKSTART</span><h2>One request to start exploring.</h2><p>Every response is JSON. Use the OpenAPI document to generate a typed client, or call the public search endpoint directly. Search supports broad <code>q</code> queries and targeted <code>name</code>, <code>description</code>, <code>category</code>, <code>source</code>, and <code>instructions</code> parameters.</p><div class="code-block"><div class="code-top"><span class="mono">curl</span><span class="mono">SEARCH</span></div><pre><code>curl \
  "{data.apiBaseUrl}/api/v1/skills/search?q=typography&amp;limit=10"</code></pre></div></section>

      <section id="authentication" class="api-section"><div class="section-heading"><KeyRound size={22} /><div><span class="eyebrow muted">AUTHENTICATION</span><h2>Search is public.</h2></div></div><p>Agents can discover and call search without credentials. Listing, curated, and detail requests accept a Vercel OIDC bearer token. Send it on every authenticated request in the <code>Authorization</code> header.</p><div class="notice"><KeyRound size={17} /><span>Never expose tokens in browser code. Proxy authenticated calls through your server.</span></div></section>

      <section id="endpoints" class="api-section endpoints-section"><span class="eyebrow muted">ENDPOINTS</span><h2>Everything you need to build on the index.</h2><div class="endpoint-list">
        {#each data.apiEndpoints as endpoint}
          <article id={anchor(endpoint.path)} class:expanded={open === endpoint.path} class="endpoint-card"><button class="endpoint-summary" onclick={() => open = open === endpoint.path ? '' : endpoint.path} aria-expanded={open === endpoint.path}><span class="method">{endpoint.method}</span><code>{endpoint.path}</code><span class="endpoint-title">{endpoint.title}</span>{#if endpoint.auth}<span class="auth-pill">AUTH</span>{:else}<span class="public-pill">PUBLIC</span>{/if}<ChevronDown class="endpoint-chevron" size={18} /></button>
            {#if open === endpoint.path}<div class="endpoint-body"><p class="endpoint-summary-copy">{endpoint.description}</p>{#if endpoint.parameters.length}<h3>Parameters</h3><div class="params">{#each endpoint.parameters as parameter}<div class="param"><code>{parameter.name}</code><span class="param-type">{parameter.type}{parameter.required ? ' · required' : ' · optional'}</span><p>{parameter.description}</p>{#if parameter.example !== undefined}<span class="param-example">Example: <code>{parameter.example}</code></span>{/if}</div>{/each}</div>{/if}<h3>Request</h3><div class="code-block endpoint-code"><div class="code-top"><span class="mono">curl</span><button onclick={(event) => { event.stopPropagation(); void copy(endpoint.path, endpoint.example) }} aria-label="Copy request">{#if copied === endpoint.path}<Check size={14} /> Copied{:else}<Copy size={14} /> Copy{/if}</button></div><pre><code>{endpoint.example}</code></pre></div><h3>Response</h3><p class="response-link"><code>{endpoint.response}</code> · <a href="/api/openapi.json" target="_blank">View schema in OpenAPI <ExternalLink size={13} /></a></p>{#if endpoint.notes}<ul>{#each endpoint.notes as note}<li>{note}</li>{/each}</ul>{/if}</div>{/if}
          </article>
        {/each}
      </div></section>

      <section id="errors" class="api-section"><span class="eyebrow muted">ERRORS</span><h2>Predictable when something goes wrong.</h2><p>Error responses use one stable shape so clients can handle failures consistently.</p><div class="code-block"><pre><code>{`{
  "error": "invalid_query",
  "message": "Search query must be at least 2 characters."
}`}</code></pre></div><div class="error-grid"><div><strong>400</strong><span>Invalid parameters</span></div><div><strong>401</strong><span>Authentication required</span></div><div><strong>404</strong><span>Skill or audit not found</span></div><div><strong>429</strong><span>Rate limit exceeded</span></div></div></section>
    </div>
  </div>
</main>
