<script lang="ts">
  import { ArrowLeft, ArrowUpRight, Copy, Check, Terminal } from '@lucide/svelte';
  import HighlightedText from '$lib/components/HighlightedText.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let copyState = $state('');
  $effect(() => { data.skill.id; copyState = ''; });
  let command = $derived(`npx skillycli add ${data.skill.repo} --skill ${data.skill.name}`);
  async function copy() { try { await navigator.clipboard.writeText(command); copyState = 'Copied'; } catch { copyState = 'Select and copy the command below.'; } }
</script>
<svelte:head><title>{data.skill.name} — Skilly</title><meta name="description" content={data.skill.description}/></svelte:head>
<main id="main" class="detail"><a class="back" href={data.backHref}><ArrowLeft size={16}/> {data.query ? 'Back to search results' : 'All skills'}</a><div class="detail-heading"><span class="eyebrow">{data.skill.category} / AGENT SKILL</span><h1>{data.skill.name}</h1><a class="source" href={data.skill.source} target="_blank" rel="noreferrer">{data.skill.repo} <ArrowUpRight size={16}/></a><p><HighlightedText text={data.skill.description} query={data.query}/></p></div><div class="detail-grid"><section class="instructions"><h2>The full skill<span>.</span></h2><p class="muted">Original instructions from the publisher’s SKILL.md</p><pre><HighlightedText text={data.skill.content} query={data.query}/></pre></section><aside class="install"><Terminal size={24}/><h2>One new superpower.</h2><p>Run this command in your project to choose an agent and install the skill.</p><code>{command}</code><button onclick={copy}>{#if copyState === 'Copied'}<Check size={17}/>{:else}<Copy size={17}/>{/if}{copyState === 'Copied' ? 'Copied' : 'Copy install command'}</button><span class="copy-status" aria-live="polite">{copyState}</span><a href={data.skill.source} target="_blank" rel="noreferrer">View original source <ArrowUpRight size={16}/></a></aside></div></main>
