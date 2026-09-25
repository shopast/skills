<script lang="ts">
  import { goto, afterNavigate, beforeNavigate } from '$app/navigation';
  import { page, navigating } from '$app/state';
  import { onDestroy, untrack } from 'svelte';
  import HighlightedText from '$lib/components/HighlightedText.svelte';
  import { Search, ArrowUpRight, ArrowRight, ArrowLeft, Terminal, SlidersHorizontal, X, Sparkles, Command, Braces, Palette, Workflow, FileText } from '@lucide/svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let input: HTMLInputElement;
  let query = $state(untrack(() => data.query));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let searchError = $state('');
  const icons = { Design: Palette, Development: Braces, Productivity: FileText, Workflow };
  function link(changes: Record<string, string>, resetPage = true) {
    const url = new URL(page.url);
    if (resetPage) url.searchParams.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (!value || value === 'All') url.searchParams.delete(key); else url.searchParams.set(key, value);
    }
    return `${url.pathname}${url.search}#directory`;
  }
  async function search(replaceState = false) {
    clearTimeout(timer);
    searchError = '';
    try { await goto(link({ q: query }), { replaceState, keepFocus: true, noScroll: true }); }
    catch { searchError = 'Search could not load. Try again.'; }
  }
  function scheduleSearch() {
    clearTimeout(timer);
    timer = setTimeout(() => { void search(true); }, 300);
  }
  beforeNavigate(() => clearTimeout(timer));
  afterNavigate(({ type }) => {
    // A completed search must not overwrite text typed while its request was in flight.
    if (type === 'popstate' || document.activeElement !== input) query = data.query;
  });
  onDestroy(() => clearTimeout(timer));
  function shortcut(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); input?.focus(); }
  }
</script>
<svelte:head><title>Skilly — Find your agent’s next superpower</title><meta name="description" content="Discover agent skills by what they do. Search full descriptions and instructions, explore categories, and find your next capability."/></svelte:head>
<svelte:window onkeydown={shortcut}/>
<main id="main">
  <section class="hero">
    <div class="hero-top"><span class="eyebrow"><i></i> THE AGENT SKILLS DIRECTORY</span><span class="mono hero-edition">INDEPENDENT INDEX / 001</span></div>
    <div class="hero-grid">
      <div class="hero-copy"><h1>Small skills.<br/>Big <span>possibilities.</span></h1><p>Your agent can do more. Find the skill that makes it happen.<br class="desktop"/> Search what skills actually do — all the way down to the details.</p><a class="hero-link" href="#directory">Find your next superpower <ArrowRight size={18}/></a></div>
      <div class="sculpture" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="sculpture-core">✳</div><span class="sculpture-label label-one"><Braces size={14}/> a little more capable</span><span class="sculpture-label label-two"><Sparkles size={14}/> a lot more possible</span><span class="coordinate">[ CAPABILITY, EXPANDED ]</span></div>
    </div>
    <div class="hero-bottom"><span><strong>{String(data.total).padStart(2, '0')}</strong> skills indexed</span><span><strong>{String(data.publishers).padStart(2, '0')}</strong> open-source publishers</span><span class="full-text"><span class="tiny-cross">✳</span> Full descriptions. Fully searchable.</span></div>
  </section>
  <section id="directory" class="directory">
    <div class="section-title"><div><span class="eyebrow muted">A NEW CAPABILITY STARTS HERE</span><h2>Find the right skill<span>.</span></h2></div><span class="index-label mono">THE INDEX ↙</span></div>
    <form class="search-form" action="/#directory" method="GET" onsubmit={(event) => { event.preventDefault(); void search(); }}>
      <Search size={23}/><label class="sr-only" for="skill-search">Search skills and full descriptions</label><input bind:this={input} bind:value={query} oninput={scheduleSearch} id="skill-search" name="q" maxlength="300" placeholder="What do you want your agent to do?" autocomplete="off"/>
      {#if data.category !== 'All'}<input type="hidden" name="category" value={data.category}/>{/if}
      <input type="hidden" name="sort" value={data.sort}/>
      {#if data.publisher !== 'All'}<input type="hidden" name="publisher" value={data.publisher}/>{/if}
      {#if query}<button class="clear-search" type="button" aria-label="Clear search" onclick={() => { query = ''; input.focus(); void search(); }}><X size={18}/></button>{:else}<kbd><Command size={12}/> K</kbd>{/if}
      <button class="search-button" type="submit">Search <ArrowUpRight size={18}/></button>
    </form>
    <div class="search-hint"><span><span class="green-dot"></span> Searches names and SKILL.md frontmatter descriptions</span><span>Try <a href="/?q=typography#directory">typography</a>, <a href="/?q=debugging#directory">debugging</a> or <a href="/?q=spreadsheet#directory">spreadsheet</a></span></div>
    <div class="filter-bar">
      <div class="filters" aria-label="Skill categories">
        {#each data.categories as category}
          <a class:active={data.category === category} href={link({ category, q: query })} aria-current={data.category === category ? 'true' : undefined} data-sveltekit-noscroll>{category === 'All' ? 'All skills' : category}</a>
        {/each}
      </div>
      <form class="directory-options" action="/#directory" method="GET">
        <input type="hidden" name="q" value={query}/><input type="hidden" name="category" value={data.category}/>
        <label class="sort"><span class="sr-only">Repository</span><select name="publisher" value={data.publisher} onchange={(event) => event.currentTarget.form?.requestSubmit()}><option value="All">All repositories</option>{#each data.repositories.filter(repo => repo !== 'All') as repo}<option value={repo}>{repo}</option>{/each}</select></label>
        <label class="sort"><SlidersHorizontal size={14}/><span class="sr-only">Sort skills</span><select name="sort" value={data.sort} onchange={(event) => event.currentTarget.form?.requestSubmit()}><option value="relevance">Relevance</option><option value="name">Name A–Z</option></select></label>
        <noscript><button type="submit">Apply</button></noscript>
      </form>
    </div>
    {#if searchError}<p role="alert" class="search-error">{searchError}</p>{/if}
    <div class="results-meta" aria-live="polite"><span>{data.count} skills{data.query ? ` matching “${data.query}”` : ' to expand what’s possible'}</span><span>{navigating.to ? 'SEARCHING…' : 'FULL-TEXT INDEX'}</span></div>
    <div class="skill-grid" aria-busy={!!navigating.to}>
      {#each data.skills as skill, i}
        {@const Icon = icons[skill.category as keyof typeof icons] ?? Braces}
        <a class="skill-card" href={`/skills/${skill.id}?${new URLSearchParams({ q: data.query, category: data.category, publisher: data.publisher, sort: data.sort, page: String(data.currentPage) })}`}>
          <div class="card-top"><span class="skill-icon" class:purple={skill.category === 'Design'} class:orange={skill.category === 'Productivity'}><Icon size={21}/></span><span class="category-tag">{skill.category}</span><ArrowUpRight class="card-arrow" size={18}/></div>
          <span class="publisher mono"><HighlightedText text={skill.repo} query={data.query}/></span><h3><HighlightedText text={skill.name} query={data.query}/></h3><p><HighlightedText text={skill.excerpt} query={data.query}/></p>
          <div class="card-bottom"><span>{data.query ? `Matched in ${skill.matchedIn}` : 'Read skill & install'}</span><span class="mono">{String(data.offset + i + 1).padStart(2, '0')} <ArrowRight size={14}/></span></div>
        </a>
      {:else}
        <div class="empty"><Search size={32}/><h3>No skills found. Still plenty possible.</h3><p>Try fewer words or search another category.</p><a href="/#directory">Clear all filters <ArrowRight size={16}/></a></div>
      {/each}
    </div>
    {#if data.pages > 1}
      <nav class="pagination" aria-label="Results pages">
        {#if data.currentPage > 1}<a href={link({ page: String(data.currentPage - 1) }, false)}><ArrowLeft size={15}/> Previous</a>{:else}<span>Previous</span>{/if}
        <span class="page-count">Page {data.currentPage} of {data.pages} · {data.offset + 1}–{data.offset + data.skills.length} of {data.count}</span>
        {#if data.currentPage < data.pages}<a href={link({ page: String(data.currentPage + 1) }, false)}>Next <ArrowRight size={15}/></a>{:else}<span>Next</span>{/if}
      </nav>
    {/if}
    <p class="catalog-note">A growing collection of real, public skills. Descriptions and instructions indexed {new Date(data.indexedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}.</p>
  </section>
  <section id="how-it-works" class="how"><div><span class="eyebrow">LESS SETUP. MORE POSSIBILITY.</span><h2>Find it. Add it.<br/><span>Make something.</span></h2><p>Skills give your agent reusable instructions for a specific job. Pick one, read what it does, and bring it into your workflow.</p></div><div class="steps"><article><span>01</span><div><h3>Search the actual skill.</h3><p>A name only tells half the story. Search the full description and instructions to find the right fit.</p></div></article><article><span>02</span><div><h3>Get to know it.</h3><p>Read the skill, visit its source, and see exactly what you’re adding to your agent.</p></div></article><article><span>03</span><div><h3>Give your agent a new ability.</h3><p>Copy the install command from a skill page and run it in your project.</p><code><Terminal size={15}/> npx skillycli add owner/repo --skill name</code></div></article></div></section>
</main>
