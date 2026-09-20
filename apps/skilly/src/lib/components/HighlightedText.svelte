<script lang="ts">
  import { highlight } from '$lib/search';
  let { text, query = '' }: { text: string; query?: string } = $props();
</script>
{#each highlight(text, query) as part}{#if part.match}<mark>{part.text}</mark>{:else}{part.text}{/if}{/each}
