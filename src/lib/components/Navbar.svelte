<script lang="ts">
  import { Shield, Clock, Award, Lock, Unlock, Settings, Users, BookOpen, CheckCircle, KeyRound } from "lucide-svelte";
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
</script>

<header class="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-30">
  <div class="max-w-5xl mx-auto px-4 py-3 sm:px-6">
    <div class="flex items-center justify-between gap-3">
      <!-- Team Logo & Title -->
      <div class="flex items-center gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
              {settings?.teamName || 'H4A'} {settings?.season || '26/27'}
            </h1>
          </div>
          <p class="text-xs text-slate-400 font-normal">
            Team Fines & Club Duty Portal
          </p>
        </div>
      </div>

      <!-- Header Action Buttons -->
      <div class="flex items-center gap-2">
        <button
          type="button"
          onclick={onOpenRules}
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-600 transition-all text-slate-200 border border-slate-700 cursor-pointer shadow-xs"
          title="View official penalty fine rules"
        >
          <BookOpen class="w-3.5 h-3.5 text-emerald-400" />
          <span class="hidden sm:inline">Fine Rules</span>
        </button>

        {#if h4aStore.isAdminAuthenticated || h4aStore.isAdminAccessGranted}
          <button
            type="button"
            onclick={() => onSelectTab(activeTab === 'admin' ? 'fine-form' : 'admin')}
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer shadow-xs relative {activeTab === 'admin' ? 'bg-emerald-600 text-white ring-2 ring-emerald-400' : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'}"
            title={activeTab === 'admin' ? 'Exit Admin Dashboard' : 'Open Admin Dashboard'}
          >
            <Settings class="w-3.5 h-3.5 {activeTab === 'admin' ? 'text-white' : 'text-emerald-400'}" />
            <span>{activeTab === 'admin' ? 'Exit Admin' : 'Admin'}</span>
          </button>
        {/if}
      </div>
    </div>

    <!-- Quick Stats Bar -->
    <div class="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 gap-2 text-center text-xs">
      <!-- Fine Pot Widget -->
      <div class="bg-slate-800/80 rounded-xl py-2 px-3 border border-slate-700/80">
        <div class="text-slate-400 text-[11px] font-medium flex items-center justify-center gap-1 mb-0.5">
          <Shield class="w-3 h-3 text-emerald-400" />
          <span>Team Penalty Pot</span>
        </div>
        <div class="font-bold text-sm sm:text-base flex items-center justify-center gap-1">
          {#if settings.finePotPublished || activeTab === 'admin'}
            <span class="text-white font-extrabold">{totalFinesNok} kr</span>
            {#if settings.finePotPublished}
              <span title="Published by admin" class="flex items-center">
                <Unlock class="w-3 h-3 text-emerald-400" />
              </span>
            {:else}
              <span title="Unpublished (Admin View)" class="flex items-center gap-0.5 text-[10px] text-amber-400 font-bold bg-amber-950/60 px-1 py-0.2 rounded border border-amber-500/30">
                <span>Admin</span>
              </span>
            {/if}
          {:else}
            <span class="text-slate-300 font-mono tracking-wider font-extrabold">??? kr</span>
          {/if}
        </div>
      </div>

      <!-- Submissions Count -->
      <div class="bg-slate-800/80 rounded-xl py-2 px-3 border border-slate-700/80">
        <div class="text-slate-400 text-[11px] font-medium flex items-center justify-center gap-1 mb-0.5">
          <Award class="w-3 h-3 text-amber-400" />
          <span>Approved Logs</span>
        </div>
        <div class="font-bold text-white text-sm sm:text-base">
          {approvedFines.length + approvedDugnad.length} total
        </div>
      </div>
    </div>
  </div>
</header>
