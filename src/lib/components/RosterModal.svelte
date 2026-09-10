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

<div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--ntnui-black-dark)]/60 backdrop-blur-xs">
  <div class="bg-[var(--color-surface)] rounded-3xl shadow-2xl border border-[var(--color-border)] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="p-4 sm:p-6 bg-[var(--ntnui-black-dark)] text-white flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
          <Users class="w-5 h-5" />
        </div>
        <div>
          <h3 class="text-base sm:text-lg font-bold text-white tracking-tight">
            Team Roster - H4A 26/27
          </h3>
          <p class="text-xs text-[var(--color-text-faint)]">
            Current players & coaches
          </p>
        </div>
      </div>
      <button
        type="button"
        onclick={onClose}
        class="w-8 h-8 rounded-full bg-[var(--ntnui-black-dark)] hover:bg-slate-700 text-[var(--ntnui-black)]/30 flex items-center justify-center transition-colors cursor-pointer"
        aria-label="Close dialog"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <!-- Actions Bar -->
    <div class="p-4 bg-[var(--color-text)]/5 border-b border-[var(--color-border)] flex items-center justify-between gap-3 shrink-0">
      <span class="text-xs font-bold text-[var(--color-text)]">
        {persons.length} active members (alphabetically sorted)
      </span>
    </div>

    <!-- Members List -->
    <div class="p-4 sm:p-6 overflow-y-auto space-y-2 flex-1">
      {#each persons as person}
        <div class="p-3 bg-[var(--color-text)]/5 hover:bg-[var(--color-surface-muted)] rounded-xl border border-[var(--color-border)] flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg font-mono font-black text-xs flex items-center justify-center {person.type === 'coach' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-[var(--color-surface-muted-2)] text-[var(--color-text)]'}">
              {person.number !== undefined ? `#${person.number}` : (person.type === "coach" ? "C" : "-")}
            </div>
            <div>
              <div class="font-bold text-[var(--color-text)] text-xs sm:text-sm">
                {getPublicDisplayName(person, persons)}
                <span class="text-xs font-normal text-[var(--color-text-faint)] ml-1">
                  ({getAdminFullName(person)})
                </span>
              </div>
              <div class="text-[11px] text-[var(--color-text-muted)]">
                {person.role || (person.type === "coach" ? "Coach" : "Player")} • {person.type === "coach" ? "Coach" : "Player"}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <!-- Footer -->
    <div class="p-4 bg-[var(--color-surface-muted)] border-t border-[var(--color-border)] flex items-center justify-between text-xs text-[var(--color-text-subtle)] shrink-0">
      <span>Roster maintained by team admin</span>
      <button
        type="button"
        onclick={onClose}
        class="px-4 py-2 bg-[var(--ntnui-black-dark)] hover:bg-slate-700 text-white font-bold rounded-xl transition-all cursor-pointer"
      >
        Close
      </button>
    </div>
  </div>
</div>
