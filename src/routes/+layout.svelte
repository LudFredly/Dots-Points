<script lang="ts">
  import "../app.css";
  import { h4aStore } from "$lib/utils/store";

  let { children } = $props();
</script>

<svelte:head>
  <title>{h4aStore.settings?.teamName || 'H4A'} {h4aStore.settings?.season || '26/27'} - Team Fines & Club Duty Portal</title>
  <meta name="description" content="Official fines, club duty, points, and penalty management portal for volleyball teams." />
</svelte:head>

{@render children()}
