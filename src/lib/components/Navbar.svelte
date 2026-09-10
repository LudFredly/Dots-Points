<script lang="ts">
  import { Shield, Clock, Unlock, Settings, Users, BookOpen, CheckCircle } from "lucide-svelte";
  import { h4aStore } from "$lib/utils/store";
  import type { FineReport, DugnadEntry, Person, TeamSettings } from "$lib/types";

  let {
    fines = [],
    dugnad = [],
    persons = [],
    settings,
    pendingCount = 0,
    activeTab,
    onSelectTab,
    onOpenRules
  }: {
    fines: FineReport[];
    dugnad: DugnadEntry[];
    persons: Person[];
    settings: TeamSettings;
    pendingCount: number;
    activeTab: string;
    onSelectTab: (tab: "fine-form" | "dugnad-form" | "leaderboard" | "history" | "admin") => void;
    onOpenRules: () => void;
  } = $props();

  // Approved totals only
  const approvedFines = $derived(fines.filter(f => f.status === "approved"));
  const approvedDugnad = $derived(dugnad.filter(d => d.status === "approved"));

  const totalFinesNok = $derived(
    approvedFines.reduce((sum, f) => sum + (f.totalFine || 0), 0)
  );

  const totalDugnadHours = $derived(
    approvedDugnad.reduce((sum, d) => sum + (d.hours || 0), 0)
  );

  // Skjul navbar-innholdet (ned til stripene) når man scroller nedover på
  // mobil, så det ikke tar for mye av skjermen. Vises igjen ved scroll opp
  // eller nær toppen av siden.
  let navOffset = $state(0);
  let navContent = $state<HTMLDivElement | null>(null);

  function handleScroll() {
    const isPhone = window.innerWidth <= 600 || window.innerHeight <= 600;

    if (!isPhone) {
      navOffset = 0;
      return;
    }

    const maxOffset = Math.max(0, (navContent?.offsetHeight ?? 0) - 5);

    navOffset = Math.min(window.scrollY, maxOffset);
  }
</script>

<svelte:window onscroll={handleScroll} />

<header
  class="bg-[var(--ntnui-green)] text-white shadow-md sticky top-0 z-30"
  style:transform={`translateY(-${navOffset}px)`}
>
  <div
    bind:this={navContent}
    class="overflow-hidden"
  >
  <div class="max-w-5xl mx-auto px-4 py-3 sm:px-6">
    <div class="flex items-center justify-between gap-3">

      <!-- Team Logo & Title -->
      <div class="flex items-center gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base sm:text-lg font-bold tracking-tight text-[var(--ntnui-black-dark)] leading-tight">
              {settings?.teamName || 'H4A'} {settings?.season || '26/27'}
            </h1>
          </div>

          <p class="text-xs text-[var(--ntnui-black-dark)] font-normal">
            Team Fines & Club Duty Portal
          </p>
        </div>
      </div>

      <!-- Header Action Buttons -->
      <div class="flex items-center gap-2">

        <!-- Fine Rules -->
        <button
          type="button"
          onclick={onOpenRules}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--ntnui-yellow)] hover:bg-[var(--ntnui-yellow-hover)] active:bg-[var(--ntnui-yellow-active)] transition-all text-[var(--ntnui-black-dark)] cursor-pointer shadow-xs"
          title="View official penalty fine rules"
        >
          <BookOpen class="w-3.5 h-3.5 text-[var(--ntnui-black-dark)]" />
          <span class="hidden sm:inline text-[var(--ntnui-black-dark)]">Fine Rules</span>
        </button>

        <!-- Admin -->
        {#if h4aStore.isAdminAccessGranted}
          <button
            type="button"
            onclick={() => onSelectTab(activeTab === 'admin' ? 'fine-form' : 'admin')}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs relative {activeTab === 'admin'
              ? 'bg-[var(--ntnui-black-dark)] text-[var(--ntnui-yellow)] ring-2 ring-white/40'
              : 'bg-[var(--ntnui-yellow)] hover:bg-[var(--ntnui-yellow-hover)] active:bg-[var(--ntnui-yellow-active)] text-[var(--ntnui-black-dark)]'}"
            title={activeTab === 'admin' ? 'Exit Admin Dashboard' : 'Open Admin Dashboard'}
          >
            <Settings
              class="w-3.5 h-3.5 {activeTab === 'admin'
                ? 'text-[var(--ntnui-yellow)]'
                : 'text-[var(--ntnui-black-dark)]'}"
            />
            <span>{activeTab === 'admin' ? 'Exit Admin' : 'Admin'}</span>
          </button>
        {/if}
      </div>
    </div>

    <!-- Quick Stats -->
    <div class="mt-3 pt-3 border-t border-white/20 grid grid-cols-1 gap-2 text-center text-xs">

    <!-- Fine Pot Widget -->
    <div class="bg-[var(--ntnui-yellow)] rounded-xl py-2 px-3 border border-black/30">
      <div class="text-[var(--ntnui-black-light)] text-[11px] font-medium flex items-center justify-center gap-1 mb-0.5">
        <span>Team Penalty Pot</span>
      </div>

      <div class="font-bold text-sm sm:text-base flex items-center justify-center gap-2">
        {#if settings.finePotPublished || activeTab === 'admin'}

          {#if !settings.finePotPublished}
            <span class="text-[var(--ntnui-black)] font-extrabold">
              Unpublished:
            </span>
          {/if}

          <span class="text-[var(--ntnui-black)] font-extrabold">
            {totalFinesNok} kr
          </span>

        {:else}

          <span class="text-[var(--ntnui-black)] font-mono tracking-wider font-extrabold">
            ??? kr
          </span>

        {/if}
      </div>
    </div>
    </div>
  </div>
  </div>

  <!-- NTNUI Accent Stripes - alltid synlige, selv når resten er skjult -->
  <div class="h-1 bg-[var(--ntnui-yellow)]"></div>
  <div class="h-1 bg-[var(--ntnui-black-dark)]"></div>
  <div class="h-1 bg-[var(--ntnui-yellow)]"></div>
  <div class="h-1 bg-[var(--ntnui-green)]"></div>

</header>