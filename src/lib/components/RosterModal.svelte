<script lang="ts">
  import { X, Users } from "lucide-svelte";
  import type { Person, TeamSettings } from "$lib/types";
  import { getAdminFullName, getPublicDisplayName } from "$lib/utils/nameHelper";

  let {
    persons = [],
    settings,
    onClose
  }: {
    persons: Person[];
    settings: TeamSettings;
    onClose: () => void;
  } = $props();
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
  <div class="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="p-4 sm:p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
          <Users class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-base sm:text-lg font-bold text-white tracking-tight">
            Team Roster - H4A 26/27
          </h3>
          <p class="text-xs text-slate-400">
            Current players & coaches
          </p>
        </div>
      </div>
      <button
        type="button"
        onclick={onClose}
        class="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
        aria-label="Close dialog"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Actions Bar -->
    <div class="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
      <span class="text-xs font-bold text-slate-700">
        {persons.length} active members (alphabetically sorted)
      </span>
    </div>

    <!-- Members List -->
    <div class="p-4 sm:p-6 overflow-y-auto space-y-2 flex-1">
      {#each persons as person}
        <div class="p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg font-mono font-black text-xs flex items-center justify-center {person.type === 'coach' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-slate-200 text-slate-700'}">
              {person.number !== undefined ? `#${person.number}` : (person.type === "coach" ? "C" : "-")}
            </div>
            <div>
              <div class="font-bold text-slate-900 text-xs sm:text-sm">
                {getPublicDisplayName(person, persons)}
                <span class="text-xs font-normal text-slate-400 ml-1">
                  ({getAdminFullName(person)})
                </span>
              </div>
              <div class="text-[11px] text-slate-500">
                {person.role || (person.type === "coach" ? "Coach" : "Player")} • {person.type === "coach" ? "Coach" : "Player"}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Footer -->
    <div class="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
      <span>Roster maintained by team admin</span>
      <button
        type="button"
        onclick={onClose}
        class="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer"
      >
        Close
      </button>
    </div>
  </div>
</div>
