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

  let activeView = $state<"fines" | "dugnad">("dugnad");

  // Only approved entries count
  const approvedFines = $derived(fines.filter(f => f.status === "approved"));
  const approvedDugnad = $derived(dugnad.filter(d => d.status === "approved"));

  const players = $derived(persons.filter(p => p.type === "player"));
  const coaches = $derived(persons.filter(p => p.type === "coach"));

  // Compute fine totals per person
  const fineStats = $derived(() => {
    return persons.map(p => {
      const pFines = approvedFines.filter(f => f.playerId === p.id);
      const totalAmount = pFines.reduce((sum, f) => sum + (f.totalFine || 0), 0);
      const count = pFines.length;

      return {
        person: p,
        displayName: getPublicDisplayName(p, persons),
        totalAmount,
        count
      };
    }).sort((a, b) =>
      b.totalAmount - a.totalAmount ||
      b.count - a.count ||
      a.displayName.localeCompare(b.displayName)
    );
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
    <div class="bg-white p-1 rounded-xl border border-[var(--ntnui-black)] flex items-center gap-1 shadow-inner">
      <button
        type="button"
        onclick={() => activeView = "fines"}
        class="flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer {activeView === 'fines' ? 'bg-[var(--ntnui-green)]/70 text-[var(--ntnui-black)] shadow-xs' : 'text-[var(--ntnui-black)] hover:text-[var(--ntnui-black-dark)] hover:bg-[var(--ntnui-green)]/15'}"
      >
        <span>Penalty Leaderboard</span>
      </button>

      <button
        type="button"
        onclick={() => activeView = "dugnad"}
        class="flex items-center gap-2 px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer {activeView === 'dugnad' ? 'bg-[var(--ntnui-green)]/70 text-[var(--ntnui-black)] shadow-xs' : 'text-[var(--ntnui-black)] hover:text-[var(--ntnui-black-dark)] hover:bg-[var(--ntnui-green)]/15'}"
      >
        <span>Club Duty Leaderboard</span>
      </button>
    </div>
  </div>

  <!-- VIEW 1: PENALTY LEADERBOARD -->
  {#if activeView === "fines"}
    {#if !settings.finePotPublished}
      <!-- HIDDEN STATE UNTIL ADMIN PUBLISHES -->
      <div class="bg-white rounded-2xl shadow-xs border border-[var(--ntnui-black)] p-8 sm:p-12 text-center max-w-xl mx-auto space-y-4">
        <div class="w-16 h-16 text-[var(--ntnui-yellow)] flex items-center justify-center mx-auto">
          <Lock class="w-16 h-16" />
        </div>
        <div class="space-y-2">
          <h3 class="text-xl font-bold text-[var(--ntnui-black-dark)] tracking-tight">
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
          {#each fineStats().slice(0, 3) as item, index}
            {@const rankColors = [
              "border-black-400 bg-gradient-to-r from-amber-50 via-yellow-100 to-amber-50 text-[var(--ntnui-black-dark)]",
              "border-black-400 bg-gradient-to-r from-[var(--ntnui-black)]/5 via-slate-200 to-[var(--ntnui-black)]/5 text-[var(--ntnui-black-dark)]",
              "border-black-400 bg-gradient-to-r from-orange-50 via-orange-100 to-orange-50 text-[var(--ntnui-black-dark)]"
            ]}
            {@const rankTitles = ["🥇", "🥈", "🥉"]}
            <div class="rounded-2xl border p-2 pb-4 text-center shadow-xs {rankColors[index]}">
              <div class="text-[20px] tracking-wider mb-0">
                {rankTitles[index]}
              </div>
              <div class="text-base sm:text-lg font-black tracking-tight">
                {item.displayName}
              </div>
              <div class="text-sm text-black mb-3">
                {item.person.role || "Player"} {item.person.number ? `(#${item.person.number})` : ""}
              </div>
              <div class="text-xl sm:text-2xl font-black text-black">
                {item.totalAmount} kr
              </div>
            </div>
          {/each}
        </div>

        <!-- Full Player Fine Table -->
        <div class="bg-white rounded-2xl shadow-xs border border-[var(--ntnui-black)] overflow-hidden">
          <div class="p-4 bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] flex items-center justify-center">
            <div class="text-lg sm:text-xl font-bold flex items-center justify-center gap-2">
              <span>Penalty Leaderboard</span>
            </div>
          </div>

          <div class="divide-y divide-[var(--ntnui-black)]/5">
            {#each fineStats() as item, idx}
              {@const rank = fineStats().filter(other => other.totalAmount > item.totalAmount).length + 1}

              <div class="p-3.5 sm:px-5 flex items-center justify-between hover:bg-[var(--ntnui-black)]/10 transition-colors">
                <div class="flex items-center gap-5">

                  <!-- Position -->
                  <div class="w-7 shrink-0 text-right relative -top-0.5">
                    <span class="font-bold text-xl text-[var(--ntnui-black)]">
                      {rank}.
                    </span>
                  </div>

                  <!-- Person -->
                  <div>
                    <div class="font-bold text-[var(--ntnui-black)] text-xs sm:text-sm">
                      {item.displayName}
                    </div>

                    <div class="text-[11px] text-[var(--ntnui-black-light)]">
                      {item.person.role || "Player"} {item.person.number ? `• #${item.person.number}` : ""}
                    </div>
                  </div>
                </div>

                <!-- Fine Total -->
                <div class="text-right">
                  <div class="font-black text-xs sm:text-sm text-[var(--ntnui-black)]">
                    {item.totalAmount} kr
                  </div>

                  <div class="text-[11px] text-[var(--ntnui-black-light)]">
                    {item.count} {item.count === 1 ? 'fine' : 'fines'}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    {/if}

  <!-- VIEW 2: CLUB DUTY LEADERBOARD -->
  {:else}
    <div class="space-y-6">
      <!-- Duty Podium -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {#each dugnadStats().slice(0, 3) as item, index}
          {@const rankColors = [
            "border-black-400 bg-gradient-to-r from-amber-50 via-yellow-100 to-amber-50 text-[var(--ntnui-black-dark)]",
            "border-black-400 bg-gradient-to-r from-[var(--ntnui-black)]/5 via-slate-200 to-[var(--ntnui-black)]/5 text-[var(--ntnui-black-dark)]",
            "border-black-400 bg-gradient-to-r from-orange-50 via-orange-100 to-orange-50 text-[var(--ntnui-black-dark)]"
          ]}
          {@const rankTitles = ["🥇", "🥈", "🥉"]}

          <div class="rounded-2xl border p-2 pb-4 text-center shadow-xs {rankColors[index]}">
            <div class="text-[20px] tracking-wider mb-0">
              {rankTitles[index]}
            </div>

            <div class="text-base sm:text-lg font-black tracking-tight">
              {item.displayName}
            </div>

            <div class="text-sm text-black mb-3">
              {item.player.role || "Player"} {item.player.number ? `(#${item.player.number})` : ""}
            </div>

            <div class="text-xl sm:text-2xl font-black text-black">
              {item.totalPoints} pts
            </div>
          </div>
        {/each}
      </div>

      <!-- Full Duty Table -->
      <div class="bg-white rounded-2xl shadow-xs border border-[var(--ntnui-black)] overflow-hidden">
        <div class="p-4 bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] flex items-center justify-center">
          <div class="text-lg sm:text-xl font-bold flex items-center justify-center gap-2">
            <span>Club Duty Leaderboard</span>
          </div>
        </div>

        <div class="divide-y divide-[var(--ntnui-black)]/5">
          {#each dugnadStats() as item}
            {@const rank = dugnadStats().filter(other => other.totalPoints > item.totalPoints).length + 1}

            <div class="p-3.5 sm:px-5 flex items-center justify-between hover:bg-[var(--ntnui-black)]/10 transition-colors">
              <div class="flex items-center gap-5">

                <!-- Position -->
                <div class="w-7 shrink-0 text-right relative -top-0.5">
                  <span class="font-bold text-xl text-[var(--ntnui-black)]">
                    {rank}.
                  </span>
                </div>

                <!-- Player -->
                <div>
                  <div class="font-bold text-[var(--ntnui-black)] text-xs sm:text-sm">
                    {item.displayName}
                  </div>

                  <div class="text-[11px] text-[var(--ntnui-black-light)]">
                    {item.player.role || "Player"} {item.player.number ? `• #${item.player.number}` : ""}
                  </div>
                </div>
              </div>

              <!-- Points -->
              <div class="text-right">
                <div class="font-black text-xs sm:text-sm text-[var(--ntnui-black)]">
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
