<script lang="ts">
  import { ShieldAlert, HeartHandshake, Calendar, User, Clock, CheckCircle2, AlertCircle, Filter, X } from "lucide-svelte";
  import type { FineReport, DugnadEntry, Person, TrialStatus, TrialOutcome } from "$lib/types";
  import { getPublicDisplayName } from "$lib/utils/nameHelper";

  let {
    fines = [],
    dugnad = [],
    persons = [],
    onRequestTrial
  }: {
    fines: FineReport[];
    dugnad: DugnadEntry[];
    persons: Person[];
    onRequestTrial: (fineId: string, requestedByPersonId: string, comment?: string) => Promise<void> | void;
  } = $props();

  let filterType = $state<"all" | "fines" | "dugnad" | "pending">("all");

  // Coaches first, then alphabetically by first name, then last name
  const sortedPersonsForTrial = $derived(
    [...persons].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "coach" ? -1 : 1;
      }
      const firstNameCompare = a.firstName.localeCompare(b.firstName);
      if (firstNameCompare !== 0) return firstNameCompare;
      return a.lastName.localeCompare(b.lastName);
    })
  );

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
      trialStatus?: TrialStatus;
      trialOutcome?: TrialOutcome;
      trialOriginalFine?: number;
      trialOriginalPlayerName?: string;
      trialRequestedByName?: string;
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
        reportedBy: f.reportedBy,
        trialStatus: f.trialStatus,
        trialOutcome: f.trialOutcome,
        trialOriginalFine: f.trialOriginalFine,
        trialOriginalPlayerName: f.trialOriginalPlayerName,
        trialRequestedByName: f.trialRequestedByName
      });
    });

    dugnad.forEach(d => {
      list.push({
        id: d.id,
        kind: "dugnad",
        personName: getPersonDisplayNameById(d.playerId, d.playerName),
        title: d.activityType,
        subtitle: d.comment ? `"${d.comment}" • ${d.hours} hour(s) registered` : `${d.hours} hour(s) registered`,
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
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric"});
    } catch (e) {
      return iso;
    }
  }

  // --- Request Trial Modal ---
  const ABSURD_EXCUSES = [
    '"The clock on the wall was clearly running fast, Your Honor."',
    '"That wasn\'t me — that was my evil twin."',
    '"I was acting in the best interest of team morale."',
    '"The ball moved on its own. I have witnesses."',
    '"I plead the fifth."',
    '"Objection: hearsay."',
    '"I have a signed alibi from my cat."',
    '"The floor was slippery. Sue the gym, not me."',
    '"This is a miscarriage of justice."',
    '"I demand a trial by jury of my teammates."',
    '"Someone else was wearing my jersey that day."',
    '"The evidence was clearly planted."',
    '"I was merely testing the team\'s reflexes."',
    '"My alarm clock was set to the wrong time zone."',
    '"Technically, the rules don\'t explicitly forbid it."',
    '"I refuse to answer on the grounds it may incriminate me."',
    '"I was under the influence of pre-game nerves."',
    '"The referee clearly has it out for me."',
    '"I have an airtight alibi. I just can\'t share it right now."',
    '"It\'s not a crime if nobody filmed it."'
  ];

  function pickRandomExcuse(): string {
    return ABSURD_EXCUSES[Math.floor(Math.random() * ABSURD_EXCUSES.length)];
  }

  let trialRequestFineId = $state<string | null>(null);
  let trialRequestPersonId = $state("");
  let trialRequestComment = $state("");
  let trialRequestPlaceholder = $state("");
  let isSubmittingTrialRequest = $state(false);

  function openTrialRequestModal(fineId: string) {
    trialRequestFineId = fineId;
    trialRequestPersonId = "";
    trialRequestComment = "";
    trialRequestPlaceholder = pickRandomExcuse();
  }

  async function submitTrialRequest(e: SubmitEvent) {
    e.preventDefault();
    if (!trialRequestFineId || !trialRequestPersonId) return;

    isSubmittingTrialRequest = true;
    try {
      await onRequestTrial(trialRequestFineId, trialRequestPersonId, trialRequestComment.trim() || undefined);
      trialRequestFineId = null;
    } catch (err) {
      console.error("[ActivityHistory] Error requesting trial:", err);
    } finally {
      isSubmittingTrialRequest = false;
    }
  }

  function trialBadgeInfo(status: TrialStatus | undefined, outcome: TrialOutcome | undefined): { label: string; classes: string } | null {
    if (!status) return null;
    if (status === "requested") {
      return { label: "Trial Requested", classes: "bg-amber-100 text-amber-800 border-amber-200" };
    }
    if (status === "approved") {
      return { label: "Trial Approved — pending Fine Party", classes: "bg-[var(--ntnui-green)]/15 text-[var(--ntnui-green)] border-[var(--ntnui-green)]/30" };
    }
    if (status === "rejected") {
      return { label: "Trial Rejected", classes: "bg-[var(--ntnui-red)]/10 text-[var(--ntnui-red)] border-[var(--ntnui-red)]/25" };
    }
    if (status === "resolved") {
      if (outcome === "acquitted") return { label: "Acquitted", classes: "bg-[var(--ntnui-green)]/15 text-[var(--ntnui-green)] border-[var(--ntnui-green)]/30" };
      if (outcome === "guilty") return { label: "Guilty — fine doubled", classes: "bg-[var(--ntnui-red)]/10 text-[var(--ntnui-red)] border-[var(--ntnui-red)]/25" };
      if (outcome === "transferred") return { label: "Transferred", classes: "bg-[var(--ntnui-yellow)]/20 text-[var(--ntnui-black-dark)] border-[var(--ntnui-yellow)]/40" };
    }
    return null;
  }
</script>

<div class="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border-strong)] overflow-hidden">
  <!-- Header with Filters -->
  <div class="p-4 sm:p-5 bg-[var(--ntnui-green)] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--ntnui-black-dark)]">
    <div>
      <h3 class="text-lg sm:text-xl font-bold text-[var(--color-text)] tracking-tight">
        Activity Log
      </h3>
      <p class="text-sm sm:text-base text-[var(--color-text)]/85">
        Live feed of submitted fines and logged volunteer hours.
      </p>
    </div>

    <!-- Filter Buttons -->
    <div class="flex items-center gap-1 bg-[var(--color-surface)] border border-[var(--color-border-strong)] p-1 rounded-xl text-xs font-semibold">
      <button
        type="button"
        onclick={() => filterType = "all"}
        class="px-2.5 py-1 rounded-lg transition-all cursor-pointer {filterType === 'all' ? 'bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)]'  : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-subtle)] hover:bg-[var(--ntnui-green)]/30'}"
      >
        All
      </button>
      <button
        type="button"
        onclick={() => filterType = "fines"}
        class="px-2.5 py-1 rounded-lg transition-all cursor-pointer {filterType === 'fines' ? 'bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)]'  : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-subtle)] hover:bg-[var(--ntnui-green)]/30'}"
      >
        Fines
      </button>
      <button
        type="button"
        onclick={() => filterType = "dugnad"}
        class="px-2.5 py-1 rounded-lg transition-all cursor-pointer {filterType === 'dugnad' ? 'bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)]'  : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-subtle)] hover:bg-[var(--ntnui-green)]/30'}"
      >
        Volunteer
      </button>
      <button
        type="button"
        onclick={() => filterType = "pending"}
        class="px-2.5 py-1 rounded-lg transition-all cursor-pointer {filterType === 'pending' ? 'bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)]'  : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text-subtle)] hover:bg-[var(--ntnui-green)]/30'}"
      >
        Pending
      </button>
    </div>
  </div>

  <!-- Content List -->
  <div class="divide-y divide-[var(--color-border)]">
    {#if combinedHistory().length === 0}
      <div class="p-8 text-center text-[var(--color-text-faint)] text-xs sm:text-sm">
        No entries found in this category.
      </div>
    {:else}
      {#each combinedHistory() as entry}
        <div class="p-3 sm:pl-5 sm:pr-6 flex items-center justify-between hover:bg-[var(--color-text)]/5 transition-colors gap-3">
          <div class="flex items-center gap-5 min-w-0">
            <!-- Kind Icon -->
            <div
              class="w-12 h-10 rounded-lg flex items-center justify-center {entry.kind === 'fine' ? 'text-[var(--ntnui-red)]' : 'text-[var(--ntnui-green)]'}"
            >
              {#if entry.kind === "fine"}
                <ShieldAlert class="w-6 h-6" />
              {:else}
                <HeartHandshake class="w-6 h-6" />
              {/if}
            </div>

            <div class="min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-bold text-[var(--color-text)] text-xs sm:text-sm">
                  {entry.personName}
                </span>

                {#if entry.status === "pending"}
                  <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    <Clock class="w-2.5 h-2.5" />
                    Pending Approval
                  </span>
                {/if}

                {#if entry.kind === "fine"}
                  {@const badge = trialBadgeInfo(entry.trialStatus, entry.trialOutcome)}
                  {#if badge}
                    <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border {badge.classes}">
                      {badge.label}
                    </span>
                  {/if}
                {/if}
              </div>

              <div class="text-xs text-[var(--color-text-subtle)] font-medium mt-0.5 line-clamp-2">
                {entry.title}
              </div>

              <div class="text-[11px] text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1 flex-wrap">
                <span>{formatDate(entry.date)}</span>
                {#if entry.reportedBy && entry.reportedBy !== "Teammate"}
                  <span>• By {entry.reportedBy}</span>
                {/if}
                {#if entry.subtitle}
                  <span class="truncate max-w-xs">• {entry.subtitle}</span>
                {/if}
                {#if entry.trialStatus === "resolved" && entry.trialOutcome === "guilty" && entry.trialOriginalFine !== undefined}
                  <span>• Original: {entry.trialOriginalFine} kr</span>
                {/if}
                {#if entry.trialStatus === "resolved" && entry.trialOutcome === "transferred" && entry.trialOriginalPlayerName}
                  <span>• Originally: {entry.trialOriginalPlayerName}</span>
                {/if}
              </div>
            </div>
          </div>

          <div class="shrink-0 flex flex-col items-end gap-1.5">
            <!-- Value Badge -->
            <div class="text-center min-w-[52px]">
              <div class="font-black text-xs sm:text-sm {entry.kind === 'fine' ? 'text-[var(--color-text)]' : 'text-[var(--ntnui-green)]'}">
                {entry.value}
              </div>
              <div class="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">
                {entry.kind === 'fine' ? 'penalty' : 'reward'}
              </div>
            </div>

            {#if entry.kind === "fine" && entry.status === "approved" && !entry.trialStatus}
              <button
                type="button"
                onclick={() => openTrialRequestModal(entry.id)}
                class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border border-[var(--color-text)]/25 text-[var(--color-text)] hover:bg-[var(--color-text)]/5 cursor-pointer whitespace-nowrap"
              >
                Request Trial
              </button>
            {/if}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

{#if trialRequestFineId}
  <div class="fixed inset-0 z-50 bg-[var(--ntnui-black-dark)]/70 backdrop-blur-xs flex items-center justify-center p-4">
    <div class="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--color-text)]/15">
      <div class="flex items-center justify-between">
        <h4 class="font-bold text-base text-[var(--color-text)] flex items-center gap-2">
          Request Trial
        </h4>
        <button type="button" onclick={() => trialRequestFineId = null} class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
          <X class="w-5 h-5" />
        </button>
      </div>

      <p class="text-xs text-[var(--color-text-muted)] mt-1 mb-4">
        The request must be approved by admin, and is finally decided at the next Fine Party.
      </p>

      <form onsubmit={submitTrialRequest} class="space-y-3 text-xs sm:text-sm">
        <div>
          <label for="trial-req-person" class="block text-xs font-bold text-[var(--color-text)] mb-1">Who is requesting trial? *</label>
          <select
            id="trial-req-person"
            bind:value={trialRequestPersonId}
            required
            style="background-color: var(--color-surface); color: var(--color-text);"
            class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-medium focus:ring-2 focus:ring-[var(--ntnui-green)]/30"
          >
            <option value="" disabled style="background-color: var(--color-surface); color: var(--color-text);">Select yourself...</option>
            {#each sortedPersonsForTrial as p}
              <option value={p.id} style="background-color: var(--color-surface); color: var(--color-text);">{getPublicDisplayName(p, persons)} ({p.type})</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="trial-req-comment" class="block text-xs font-bold text-[var(--color-text)] mb-1">Grounds for appeal (optional)</label>
          <textarea
            id="trial-req-comment"
            bind:value={trialRequestComment}
            rows="3"
            placeholder={trialRequestPlaceholder}
            class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] resize-none focus:ring-2 focus:ring-[var(--ntnui-green)]/30"
          ></textarea>
        </div>

        <div class="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onclick={() => trialRequestFineId = null}
            class="px-3 py-1.5 rounded-lg border border-[var(--color-text)]/30 bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-text)]/5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trialRequestPersonId || isSubmittingTrialRequest}
            class="px-4 py-1.5 rounded-lg bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            {isSubmittingTrialRequest ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
