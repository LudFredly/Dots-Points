<script lang="ts">
  import { X, Search, BookOpen } from "lucide-svelte";
  import type { FineRule } from "$lib/types";
  import { h4aStore } from "$lib/utils/store";

  let {
    rules = [],
    onClose
  }: {
    rules: FineRule[];
    onClose: () => void;
  } = $props();

  let searchQuery = $state("");

  function getMinRuleFine(r: FineRule): number {
    const rates = [r.fineMatch, r.finePractice, r.fineSocial, r.fine]
      .filter((v): v is number => v != null && v > 0);

    return rates.length > 0 ? Math.min(...rates) : 0;
  }

  // Sort rules strictly by fine amount from lowest to highest
  const sortedRules = $derived(
    [...rules].sort(
      (a, b) =>
        getMinRuleFine(a) - getMinRuleFine(b) ||
        a.title.localeCompare(b.title)
    )
  );

  const filteredRules = $derived(
    sortedRules.filter(r => {
      const q = searchQuery.toLowerCase().trim();

      if (!q) return true;

      return (
        r.title.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q)
      );
    })
  );
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ntnui-black-dark)]/60 backdrop-blur-xs">
  <div class="bg-white rounded-3xl shadow-2xl border border-[var(--ntnui-black-dark)] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

    <!-- Header -->
    <div class="p-4 sm:p-6 bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] grid grid-cols-[1fr_auto_1fr] items-center shrink-0">
      <!-- Left Icon -->
      <div class="flex items-center justify-start">
        <div class="w-10 h-10 rounded-xl text-[var(--ntnui-black-dark)] flex items-center justify-center font-bold">
          <BookOpen class="w-5 h-5" />
        </div>
      </div>

      <!-- Centered Text -->
      <div class="text-center px-3">
        <h3 class="text-base sm:text-lg font-bold text-[var(--ntnui-black-dark)] tracking-tight">
          Official Penalty Rules & Occasions
        </h3>
        <p class="text-xs text-[var(--ntnui-black-dark)]/85">
          {h4aStore.settings?.teamName || 'H4A'} {h4aStore.settings?.season || '26/27'} penalty catalog
        </p>
      </div>

      <!-- Close Button -->
      <div class="flex items-center justify-end">
        <button
          type="button"
          onclick={onClose}
          class="w-10 h-10 rounded-full hover:bg-[var(--ntnui-black-light)]/50 text-[var(--ntnui-black-dark)] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="p-4 bg-[var(--ntnui-black)]/5 border-b border-[var(--ntnui-black)]/15 flex items-center justify-between gap-3 shrink-0">
      <div class="relative w-full">
        <Search class="w-4 h-4 text-[var(--ntnui-black-light)] absolute left-3 top-1/2 -translate-y-1/2" />

        <input
          type="text"
          placeholder="Search penalty rules..."
          bind:value={searchQuery}
          class="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-[var(--ntnui-black)]/30 rounded-xl text-[var(--ntnui-black-dark)] placeholder:text-[var(--ntnui-black-light)]/70 focus:outline-none focus:border-[var(--ntnui-green)] focus:ring-2 focus:ring-[var(--ntnui-green)]/20"
        />
      </div>
    </div>

    <!-- Rules List -->
    <div class="p-4 sm:p-6 overflow-y-auto space-y-2.5 flex-1">
      {#if filteredRules.length === 0}
        <div class="text-center py-8 text-[var(--ntnui-black-light)] text-xs sm:text-sm">
          No penalty rules match your search.
        </div>
      {:else}
        {#each filteredRules as rule}
          <div class="p-3.5 bg-[var(--ntnui-black)]/5 hover:bg-[var(--ntnui-green)]/10 rounded-2xl border border-[var(--ntnui-black)]/15 flex items-start justify-between gap-3 transition-colors">

            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="font-bold text-[var(--ntnui-black-dark)] text-xs sm:text-sm">
                  {rule.title}
                </h4>
              </div>

              {#if rule.description}
                <p class="text-xs text-[var(--ntnui-black-light)] mt-0.5">
                  {rule.description}
                </p>
              {/if}

              <div class="flex items-center gap-2 mt-1.5 text-[11px] font-medium flex-wrap">

                {#if rule.fineMatch != null && rule.fineMatch > 0}
                  <span class="px-2 py-0.5 bg-[var(--ntnui-green)]/10 text-[var(--ntnui-green)] rounded border border-[var(--ntnui-green)]/30 font-bold">
                    Match: {rule.fineMatch} kr
                  </span>
                {/if}

                {#if rule.finePractice != null && rule.finePractice > 0}
                  <span class="px-2 py-0.5 bg-[var(--ntnui-green)]/10 text-[var(--ntnui-green)] rounded border border-[var(--ntnui-green)]/30 font-bold">
                    Practice: {rule.finePractice} kr
                  </span>
                {/if}

                {#if rule.fineSocial != null && rule.fineSocial > 0}
                  <span class="px-2 py-0.5 bg-[var(--ntnui-green)]/10 text-[var(--ntnui-green)] rounded border border-[var(--ntnui-green)]/30 font-bold">
                    Social: {rule.fineSocial} kr
                  </span>
                {/if}

                {#if (rule.fineMatch == null || rule.fineMatch <= 0) &&
                  (rule.finePractice == null || rule.finePractice <= 0) &&
                  (rule.fineSocial == null || rule.fineSocial <= 0)}
                  <span class="px-2 py-0.5 bg-[var(--ntnui-black)]/5 rounded border border-[var(--ntnui-black)]/15 font-bold text-[var(--ntnui-black-dark)]">
                    Standard: {rule.fine || 0} kr
                  </span>
                {/if}

              </div>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Footer -->
    <div class="p-4 bg-[var(--ntnui-black)]/5 border-t border-[var(--ntnui-black)]/15 flex font-bold items-center justify-between text-xs text-[var(--ntnui-black-light)] shrink-0">
      <span>{rules.length} active penalty rules</span>

      <button
        type="button"
        onclick={onClose}
        class="px-4 py-2 bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/85 active:bg-[var(--ntnui-green)]/80 text-[var(--ntnui-black-dark)] font-bold rounded-xl transition-all cursor-pointer"
      >
        Close Catalog
      </button>
    </div>

  </div>
</div>