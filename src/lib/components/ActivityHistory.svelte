<script lang="ts">
  import { ShieldAlert, HeartHandshake, Calendar, User, Clock, CheckCircle2, AlertCircle, Filter } from "lucide-svelte";
  import type { FineReport, DugnadEntry, Person } from "$lib/types";
  import { getPublicDisplayName } from "$lib/utils/nameHelper";

  let {
    fines = [],
    dugnad = [],
    persons = []
  }: {
    fines: FineReport[];
    dugnad: DugnadEntry[];
    persons: Person[];
  } = $props();

  let filterType = $state<"all" | "fines" | "dugnad" | "pending">("all");

  function getPersonDisplayNameById(id: string, fallbackName: string): string {
    const found = persons.find(p => p.id === id);
    if (found) {
      return getPublicDisplayName(found, persons);
    }
    return fallbackName;
  }

  // Unified combined history list
  const combinedHistory = $derived(() => {
    const list: Array<{
      id: string;
      kind: "fine" | "dugnad";
      personName: string;
      title: string;
      subtitle: string;
      value: string;
      date: string;
      status: "approved" | "pending" | "rejected";
      reportedBy?: string;
    }> = [];

    fines.forEach(f => {
      list.push({
        id: f.id,
        kind: "fine",
        personName: getPersonDisplayNameById(f.playerId, f.playerName),
        title: f.ruleTitles.join(", "),
        subtitle: f.comment ? `"${f.comment}" • ${f.eventContext || 'Practice'}` : (f.eventContext || "Penalty fine"),
        value: `${f.totalFine} kr`,
        date: f.date,
        status: f.status || "approved",
        reportedBy: f.reportedBy
      });
    });

    dugnad.forEach(d => {
      list.push({
        id: d.id,
        kind: "dugnad",
        personName: getPersonDisplayNameById(d.playerId, d.playerName),
        title: d.activityType,
        subtitle: d.comment ? `"${d.comment}" • ${d.hours} hours` : `${d.hours} hours registered`,
        value: `${d.points} pts`,
        date: d.date,
        status: d.status || "approved",
        reportedBy: d.reportedBy
      });
    });

    // Sort descending by date
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (filterType === "fines") return list.filter(item => item.kind === "fine");
    if (filterType === "dugnad") return list.filter(item => item.kind === "dugnad");
    if (filterType === "pending") return list.filter(item => item.status === "pending");
    return list;
  });

  function formatDate(iso: string): string {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch (e) {
      return iso;
    }
  }
</script>

<div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
  <!-- Header with Filters -->
  <div class="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
    <div>
      <h3 class="text-base sm:text-lg font-bold text-white tracking-tight">
        Activity Log
      </h3>
      <p class="text-xs text-slate-400">
        Live feed of submitted fines and logged volunteer hours.
      </p>
    </div>

    <!-- Filter Buttons -->
    <div class="flex items-center gap-1 bg-slate-800 p-1 rounded-xl text-xs font-semibold">
      <button
        type="button"
        onclick={() => filterType = "all"}
        class="px-2.5 py-1 rounded-lg transition-all cursor-pointer {filterType === 'all' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-300 hover:text-white'}"
      >
        All
      </button>
      <button
        type="button"
        onclick={() => filterType = "fines"}
        class="px-2.5 py-1 rounded-lg transition-all cursor-pointer {filterType === 'fines' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-300 hover:text-white'}"
      >
        Fines
      </button>
      <button
        type="button"
        onclick={() => filterType = "dugnad"}
        class="px-2.5 py-1 rounded-lg transition-all cursor-pointer {filterType === 'dugnad' ? 'bg-teal-600 text-white shadow-2xs' : 'text-slate-300 hover:text-white'}"
      >
        Volunteer
      </button>
      <button
        type="button"
        onclick={() => filterType = "pending"}
        class="px-2.5 py-1 rounded-lg transition-all cursor-pointer {filterType === 'pending' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-300 hover:text-white'}"
      >
        Pending
      </button>
    </div>
  </div>

  <!-- Content List -->
  <div class="divide-y divide-slate-100">
    {#if combinedHistory().length === 0}
      <div class="p-8 text-center text-slate-400 text-xs sm:text-sm">
        No entries found in this category.
      </div>
    {:else}
      {#each combinedHistory() as entry}
        <div class="p-4 sm:px-5 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
          <div class="flex items-start gap-3 min-w-0">
            <!-- Kind Icon -->
            <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 {entry.kind === 'fine' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'}">
              {#if entry.kind === "fine"}
                <ShieldAlert class="w-4 h-4" />
              {:else}
                <HeartHandshake class="w-4 h-4" />
              {/if}
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-slate-900 text-xs sm:text-sm">
                  {entry.personName}
                </span>

                {#if entry.status === "pending"}
                  <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock class="w-2.5 h-2.5" />
                    Pending Approval
                  </span>
                {:else}
                  <span class="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 class="w-2.5 h-2.5" />
                    Approved
                  </span>
                {/if}
              </div>

              <div class="text-xs text-slate-700 font-medium mt-0.5 line-clamp-2">
                {entry.title}
              </div>

              <div class="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{formatDate(entry.date)}</span>
                {#if entry.reportedBy}
                  <span>• By {entry.reportedBy}</span>
                {/if}
                {#if entry.subtitle}
                  <span class="truncate max-w-xs">• {entry.subtitle}</span>
                {/if}
              </div>
            </div>
          </div>

          <!-- Value Badge -->
          <div class="shrink-0 text-right">
            <div class="font-black text-xs sm:text-sm {entry.kind === 'fine' ? 'text-emerald-950' : 'text-teal-950'}">
              {entry.value}
            </div>
            <div class="text-[10px] text-slate-400 uppercase tracking-wider">
              {entry.kind === 'fine' ? 'penalty' : 'reward'}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>
