<script lang="ts">
  import '../site.css';
  import { ArrowUpRight, Zap } from '@lucide/svelte';
  let { children }: { children: import('svelte').Snippet } = $props();
</script>
<a class="skip" href="#main">Skip to content</a>
<div class="shell">
  <header class="header">
    <a href="/" class="brand" aria-label="Skilly home"><span class="brand-icon"><Zap size={22} fill="currentColor"/></span>skilly<span class="brand-period">.</span></a>
    <nav aria-label="Main navigation"><a href="/#directory">Explore skills</a><a href="/harnesses">Agent harnesses</a><a href="/docs/api">API docs <ArrowUpRight size={14}/></a><a href="/#how-it-works">How it works <ArrowUpRight size={14}/></a></nav>
    <span class="header-note"><i></i> A little skill. A lot of possibility.</span>
  </header>
  {@render children()}
  <footer><a class="brand footer-brand" href="/">skilly.</a><span>Better skills. Better agents.</span><a href="https://github.com/anthropics/skills" target="_blank" rel="noreferrer">Explore the open ecosystem <ArrowUpRight size={14}/></a></footer>
</div>
