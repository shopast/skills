<script>import { page } from '$app/state';</script>
<svelte:head><title>{page.status} — Skilly</title></svelte:head>
<main id="main" class="detail"><span class="eyebrow">{page.status}</span><h1>{page.error?.message ?? 'Something went wrong'}</h1><a class="hero-link" href="/">Back to the skill directory →</a></main>
