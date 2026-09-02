<script lang="ts">
  import { Trophy, Medal, ShieldAlert, HeartHandshake, Lock, Clock, Sparkles, UserCheck, Shield } from "lucide-svelte";
  import type { FineReport, DugnadEntry, Person, TeamSettings } from "$lib/types";
  import { getPublicDisplayName } from "$lib/utils/nameHelper";

  let {
    persons = [],
    fines = [],
    dugnad = [],
    settings
  }: {
    persons: Person[];
    fines: FineReport[];
    dugnad: DugnadEntry[];
    settings: TeamSettings;
  } = $props();

  let activeView = $state<"fines" | "dugnad">("fines");

  // Only approved entries count
  const approvedFines = $derived(fines.filter(f => f.status === "approved"));
  const approvedDugnad = $derived(dugnad.filter(d => d.status === "approved"));

  const players = $derived(persons.filter(p => p.type === "player"));
  const coaches = $derived(persons.filter(p => p.type === "coach"));

  // Compute fine totals per person
  const playerFineStats = $derived(() => {
    return players.map(p => {
      const pFines = approvedFines.filter(f => f.playerId === p.id);
      const totalAmount = pFines.reduce((sum, f) => sum + (f.totalFine || 0), 0);
      const count = pFines.length;
      return {
        person: p,
        displayName: getPublicDisplayName(p, persons),
        totalAmount,
        count
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount || b.count - a.count || a.displayName.localeCompare(b.displayName));
  });

  // Coaches fine stats (at the bottom of fine list)
  const coachFineStats = $derived(() => {
    return coaches.map(c => {
      const cFines = approvedFines.filter(f => f.playerId === c.id);
      const totalAmount = cFines.reduce((sum, f) => sum + (f.totalFine || 0), 0);
      const count = cFines.length;
      return {
        person: c,
        displayName: getPublicDisplayName(c, persons),
        totalAmount,
        count
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount || a.displayName.localeCompare(b.displayName));
  });

  // Compute dugnad totals per player (players only)
  const dugnadStats = $derived(() => {
    return players.map(p => {
      const pDugnad = approvedDugnad.filter(d => d.playerId === p.id);
      const totalHours = pDugnad.reduce((sum, d) => sum + (d.hours || 0), 0);
      const totalPoints = pDugnad.reduce((sum, d) => sum + (d.points || 0), 0);
      const count = pDugnad.length;
      return {
        player: p,
        displayName: getPublicDisplayName(p, persons),
        totalHours,
        totalPoints,
        count
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints || b.totalHours - a.totalHours || a.displayName.localeCompare(b.displayName));
  });

  const totalFinesNok = $derived(
    approvedFines.reduce((sum, f) => sum + (f.totalFine || 0), 0)
  );

  const totalDugnadHours = $derived(
    approvedDugnad.reduce((sum, d) => sum + (d.hours || 0), 0)
  );

  const totalDugnadPoints = $derived(
    approvedDugnad.reduce((sum, d) => sum + (d.points || 0), 0)
  );
</script>

<div class="space-y-6">
  <!-- View Switcher -->
  <div class="flex items-center justify-center">
    <div class="bg-slate-200 p-1 rounded-xl flex items-center gap-1 shadow-inner">
      <button
        type="button"
        onclick={() => activeView = "fines"}
        class="flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer {activeView === 'fines' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:text-slate-950'}"
      >
        <ShieldAlert class="w-4 h-4 text-emerald-400" />
        <span>Penalty Leaderboard</span>
      </button>

      <button
        type="button"
        onclick={() => activeView = "dugnad"}
        class="flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer {activeView === 'dugnad' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:text-slate-950'}"
      >
        <HeartHandshake class="w-4 h-4 text-teal-400" />
        <span>Club Duty Leaderboard</span>
      </button>
    </div>
  </div>

  <!-- VIEW 1: PENALTY LEADERBOARD -->
  {#if activeView === "fines"}
    {#if !settings.finePotPublished}
      <!-- HIDDEN STATE UNTIL ADMIN PUBLISHES -->
      <div class="bg-white rounded-2xl shadow-xs border border-slate-200 p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
        <div class="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
          <Lock class="w-8 h-8" />
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-bold text-slate-900 tracking-tight">
            Penalty Leaderboards Are Hidden
          </h3>
          <p class="text-xs sm:text-sm text-slate-500 leading-relaxed">
            The team penalty leaderboard and total penalty pot remain confidential until the next penalty party draws near.
          </p>
        </div>
      </div>
    {:else}
      <!-- PUBLISHED STATE -->
      <div class="space-y-6">
        <!-- Top 3 Podium for Fines -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {#each playerFineStats().slice(0, 3) as item, index}
            {@const rankColors = [
              "border-amber-400 bg-amber-50/50 text-amber-950",
              "border-slate-300 bg-slate-50 text-slate-900",
              "border-amber-700/30 bg-amber-50/30 text-amber-900"
            ]}
            {@const rankTitles = ["Fine King (1st)", "2nd Place", "3rd Place"]}
            <div class="rounded-2xl border p-4 text-center shadow-xs {rankColors[index]}">
              <div class="text-[11px] font-bold uppercase tracking-wider mb-1 opacity-80">
                {rankTitles[index]}
              </div>
              <div class="text-base sm:text-lg font-black tracking-tight mb-0.5">
                {item.displayName}
              </div>
              <div class="text-xs text-slate-500 mb-2">
                {item.person.role || "Player"} {item.person.number ? `(#${item.person.number})` : ""}
              </div>
              <div class="text-xl sm:text-2xl font-black text-emerald-950">
                {item.totalAmount} kr
              </div>
              <div class="text-[11px] text-slate-500 font-medium">
                {item.count} {item.count === 1 ? 'violation' : 'violations'}
              </div>
            </div>
          {/each}
        </div>

        <!-- Full Player Fine Table -->
        <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div class="font-bold text-xs sm:text-sm flex items-center gap-2">
              <ShieldAlert class="w-4 h-4 text-emerald-400" />
              <span>Player Fine Table</span>
            </div>
            <div class="text-xs text-slate-300">
              Total Pot: <span class="font-bold text-white">{totalFinesNok} kr</span>
            </div>
          </div>

          <div class="divide-y divide-slate-100">
            {#each playerFineStats() as item, idx}
              <div class="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div class="flex items-center gap-3">
                  <span class="w-6 text-center font-bold text-xs {idx < 3 ? 'text-amber-600 font-black' : 'text-slate-400'}">
                    #{idx + 1}
                  </span>
                  <div>
                    <div class="font-bold text-slate-900 text-xs sm:text-sm">
                      {item.displayName}
                    </div>
                    <div class="text-[11px] text-slate-400">
                      {item.person.role || "Player"} {item.person.number ? `• #${item.person.number}` : ""}
                    </div>
                  </div>
                </div>

                <div class="text-right">
                  <div class="font-black text-xs sm:text-sm text-slate-900">
                    {item.totalAmount} kr
                  </div>
                  <div class="text-[11px] text-slate-400 font-medium">
                    {item.count} {item.count === 1 ? 'fine' : 'fines'}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Coaches Penalty Section (At the bottom of fine list) -->
        {#if coachFineStats().length > 0}
          <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div class="p-4 bg-slate-800 text-white flex items-center justify-between">
              <div class="font-bold text-xs sm:text-sm flex items-center gap-2">
                <UserCheck class="w-4 h-4 text-teal-300" />
                <span>Coaches Penalty Leaderboard</span>
              </div>
              <span class="text-[11px] text-slate-300">Coaching Staff</span>
            </div>

            <div class="divide-y divide-slate-100">
              {#each coachFineStats() as item}
                <div class="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <div class="font-bold text-slate-900 text-xs sm:text-sm">
                      {item.displayName}
                    </div>
                    <div class="text-[11px] text-slate-400">
                      {item.person.role || "Coach"}
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-black text-xs sm:text-sm text-slate-900">
                      {item.totalAmount} kr
                    </div>
                    <div class="text-[11px] text-slate-400 font-medium">
                      {item.count} {item.count === 1 ? 'fine' : 'fines'}
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    {/if}

  <!-- VIEW 2: CLUB DUTY LEADERBOARD -->
  {:else}
    <div class="space-y-6">
      <!-- Duty Podium -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {#each dugnadStats().slice(0, 3) as item, index}
          {@const rankColors = [
            "border-teal-400 bg-teal-50/50 text-teal-950",
            "border-slate-300 bg-slate-50 text-slate-900",
            "border-teal-700/30 bg-teal-50/30 text-teal-900"
          ]}
          {@const rankTitles = ["Top Contributor (1st)", "2nd Place", "3rd Place"]}
          <div class="rounded-2xl border p-4 text-center shadow-xs {rankColors[index]}">
            <div class="text-[11px] font-bold uppercase tracking-wider mb-1 opacity-80">
              {rankTitles[index]}
            </div>
            <div class="text-base sm:text-lg font-black tracking-tight mb-0.5">
              {item.displayName}
            </div>
            <div class="text-xs text-slate-500 mb-2">
              {item.player.role || "Player"} {item.player.number ? `(#${item.player.number})` : ""}
            </div>
            <div class="text-xl sm:text-2xl font-black text-teal-950">
              {item.totalPoints} pts
            </div>
          </div>
        {/each}
      </div>

      <!-- Full Duty Table -->
      <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div class="font-bold text-xs sm:text-sm flex items-center gap-2">
            <HeartHandshake class="w-4 h-4 text-teal-400" />
            <span>Club Duty Leaderboard</span>
          </div>
        </div>

        <div class="divide-y divide-slate-100">
          {#each dugnadStats() as item, idx}
            <div class="p-3.5 sm:px-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div class="flex items-center gap-3">
                <span class="w-6 text-center font-bold text-xs {idx < 3 ? 'text-teal-600 font-black' : 'text-slate-400'}">
                  #{idx + 1}
                </span>
                <div>
                  <div class="font-bold text-slate-900 text-xs sm:text-sm">
                    {item.displayName}
                  </div>
                  <div class="text-[11px] text-slate-400">
                    {item.player.role || "Player"} {item.player.number ? `• #${item.player.number}` : ""}
                  </div>
                </div>
              </div>

              <div class="text-right">
                <div class="font-black text-xs sm:text-sm text-teal-900">
                  {item.totalPoints} pts
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}
</div>
