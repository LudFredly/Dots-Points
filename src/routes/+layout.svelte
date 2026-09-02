<script lang="ts">
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { h4aStore } from "$lib/utils/store";
  import AccessGate from "$lib/components/AccessGate.svelte";

  let { children } = $props();

  let isAccessGranted = $state(h4aStore.isAccessGranted);
  let isAdminAuthenticated = $state(h4aStore.isAdminAuthenticated);
  let hasAccessKeyConfigured = $state(Boolean(h4aStore.expectedAccessKey));

  function syncAccess() {
    isAccessGranted = h4aStore.isAccessGranted;
    isAdminAuthenticated = h4aStore.isAdminAuthenticated;
    hasAccessKeyConfigured = Boolean(h4aStore.expectedAccessKey);
  }

  onMount(() => {
    h4aStore.checkAccess();
    syncAccess();
    const unsub = h4aStore.subscribe(() => {
      syncAccess();
    });
    return () => unsub();
  });

  const isAdminRoute = $derived(page?.url?.pathname?.startsWith("/admin") ?? false);
  const canViewContent = $derived(!hasAccessKeyConfigured || isAccessGranted || isAdminAuthenticated || isAdminRoute);
</script>

<svelte:head>
  <title>{h4aStore.settings?.teamName || 'H4A'} {h4aStore.settings?.season || '26/27'} - Team Fines & Club Duty Portal</title>
  <meta name="description" content="Official fines, club duty, points, and penalty management portal for volleyball teams." />
</svelte:head>

{#if canViewContent}
  {@render children()}
{:else}
  <div class="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900">
    <AccessGate onUnlocked={() => syncAccess()} />
  </div>
{/if}
