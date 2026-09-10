<script lang="ts">
  import { onMount } from "svelte";
  import { h4aStore } from "$lib/utils/store";
  import type {
    Person,
    FineRule,
    FineReport,
    DugnadEntry,
    DugnadActivity,
    TeamSettings
  } from "$lib/types";
  import Navbar from "$lib/components/Navbar.svelte";
  import FineSubmitForm from "$lib/components/FineSubmitForm.svelte";
  import DugnadSubmitForm from "$lib/components/DugnadSubmitForm.svelte";
  import LeaderboardView from "$lib/components/LeaderboardView.svelte";
  import ActivityHistory from "$lib/components/ActivityHistory.svelte";
  import AdminDashboard from "$lib/components/AdminDashboard.svelte";
  import RulesModal from "$lib/components/RulesModal.svelte";
  import {Lock } from "lucide-svelte";

  let persons = $state<Person[]>([]);
  let rules = $state<FineRule[]>([]);
  let fines = $state<FineReport[]>([]);
  let dugnad = $state<DugnadEntry[]>([]);
  let dugnadActivities = $state<DugnadActivity[]>([]);
  let settings = $state<TeamSettings>(h4aStore.settings);
  let activeTab = $state<"fine-form" | "dugnad-form" | "leaderboard" | "history" | "admin">("fine-form");
  let isRulesModalOpen = $state(false);

  function syncState() {
    persons = [...h4aStore.persons];
    rules = [...h4aStore.rules];
    fines = [...h4aStore.fines];
    dugnad = [...h4aStore.dugnad];
    dugnadActivities = [...h4aStore.dugnadActivities];
    settings = { ...h4aStore.settings };
  }

  onMount(() => {
    syncState();
    const unsubscribe = h4aStore.subscribe(() => {
      syncState();
    });
    return () => unsubscribe();
  });

  const pendingCount = $derived(
    fines.filter(f => f.status === "pending").length +
    dugnad.filter(d => d.status === "pending").length
  );
</script>

<div class="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text)] selection:bg-[var(--ntnui-green)]/30 selection:text-[var(--color-text)]">

  <!-- Navbar -->
  <Navbar
    {fines}
    {dugnad}
    {persons}
    {settings}
    {pendingCount}
    {activeTab}
    onSelectTab={(tab: "fine-form" | "dugnad-form" | "leaderboard" | "history" | "admin") => activeTab = tab}
    onOpenRules={() => isRulesModalOpen = true}
  />

  <main class="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">

    <!-- Primary Navigation Tabs -->
    {#if activeTab !== "admin"}
      <div class="bg-[var(--color-surface)] p-1.5 rounded-2xl shadow-xs border border-[var(--color-border-strong)] flex items-center gap-1 overflow-x-auto">

        <!-- Report Fine -->
        <button
          type="button"
          onclick={() => activeTab = "fine-form"}
          class="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer {activeTab === 'fine-form'
            ? 'bg-[var(--ntnui-yellow)] text-[var(--ntnui-black-dark)] shadow-xs'
            : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--ntnui-yellow)]/15'}"
        >
          <span>Report Fine</span>
        </button>

        <!-- Log Club Duty -->
        <button
          type="button"
          onclick={() => activeTab = "dugnad-form"}
          class="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer {activeTab === 'dugnad-form'
            ? 'bg-[var(--ntnui-yellow)] text-[var(--ntnui-black-dark)] shadow-xs'
            : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--ntnui-yellow)]/15'}"
        >
          <span>Log Club Duty</span>
        </button>

        <!-- Leaderboards -->
        <button
          type="button"
          onclick={() => activeTab = "leaderboard"}
          class="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer {activeTab === 'leaderboard'
            ? 'bg-[var(--ntnui-yellow)] text-[var(--ntnui-black-dark)] shadow-xs'
            : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--ntnui-yellow)]/15'}"
        >
          <span>Leaderboards</span>
        </button>

        <!-- Activity Log -->
        <button
          type="button"
          onclick={() => activeTab = "history"}
          class="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer {activeTab === 'history'
            ? 'bg-[var(--ntnui-yellow)] text-[var(--ntnui-black-dark)] shadow-xs'
            : 'text-[var(--color-text-subtle)] hover:text-[var(--color-text)] hover:bg-[var(--ntnui-yellow)]/15'}"
        >
          <span>Activity Log</span>
        </button>

      </div>
    {/if}

    <!-- Active View Display -->
    {#if activeTab === "fine-form"}

      <FineSubmitForm
        {persons}
        {rules}
        onSubmitFine={async (report: Omit<FineReport, "id" | "date" | "status">) => {
          await h4aStore.addFineReport(report);
        }}
      />

    {:else if activeTab === "dugnad-form"}

      <DugnadSubmitForm
        {persons}
        activities={dugnadActivities}
        onSubmitDugnad={async (entry: Omit<DugnadEntry, "id" | "date" | "status">) => {
          await h4aStore.addDugnadEntry(entry);
        }}
      />

    {:else if activeTab === "leaderboard"}

      <LeaderboardView
        {persons}
        {fines}
        {dugnad}
        {settings}
      />

    {:else if activeTab === "history"}

      <ActivityHistory {fines} {dugnad} {persons} />

    {:else if activeTab === "admin"}

      <AdminDashboard
        {persons}
        {rules}
        {fines}
        {dugnad}
        {dugnadActivities}
        {settings}
        onApproveFine={async (id: string) => {
          await h4aStore.setFineStatus(id, "approved");
        }}
        onRejectFine={async (id: string) => {
          await h4aStore.deleteFine(id);
        }}
        onUpdateFine={async (id: string, updates: Partial<FineReport>) => {
          await h4aStore.updateFine(id, updates);
        }}
        onApproveDugnad={async (id: string) => {
          await h4aStore.setDugnadStatus(id, "approved");
        }}
        onRejectDugnad={async (id: string) => {
          await h4aStore.deleteDugnad(id);
        }}
        onUpdateDugnad={async (id: string, updates: Partial<DugnadEntry>) => {
          await h4aStore.updateDugnad(id, updates);
        }}
        onAddPerson={(firstName: string, lastName: string, role: string, type: "player" | "coach", number?: number) => {
          h4aStore.addPerson(firstName, lastName, role, type, number);
        }}
        onUpdatePerson={(id: string, updates: Partial<Person>) => {
          h4aStore.updatePerson(id, updates);
        }}
        onRemovePerson={(id: string) => {
          h4aStore.removePerson(id);
        }}
        onAdjustPersonTotals={(personId: string, fineSum?: number, dutyHours?: number) => {
          h4aStore.setPersonTotals(personId, fineSum, dutyHours);
        }}
        onAddFineRule={(rule: Omit<FineRule, "id">) => {
          h4aStore.addFineRule(rule);
        }}
        onUpdateFineRule={(id: string, updates: Partial<FineRule>) => {
          h4aStore.updateFineRule(id, updates);
        }}
        onDeleteFineRule={(id: string) => {
          h4aStore.deleteFineRule(id);
        }}
        onAddDugnadActivity={(activity) => {
          h4aStore.addDugnadActivity(activity);
        }}
        onUpdateDugnadActivity={(id, updates) => {
          h4aStore.updateDugnadActivity(id, updates);
        }}
        onDeleteDugnadActivity={(id) => {
          h4aStore.deleteDugnadActivity(id);
        }}
        onUpdateSettings={(newSettings: Partial<TeamSettings>) => {
          h4aStore.updateSettings(newSettings);
        }}
        onResetData={() => {
          h4aStore.resetToDefaultData();
        }}
        onExitAdmin={() => {
          activeTab = "fine-form";
        }}
      />

    {/if}

  </main>

  <!-- Rules Catalog Modal -->
  {#if isRulesModalOpen}
    <RulesModal
      {rules}
      onClose={() => isRulesModalOpen = false}
    />
  {/if}

  <!-- Footer -->
  <footer class="mt-auto py-6 border-t border-[var(--color-text)]/30 bg-[var(--color-surface)] text-center text-xs text-[var(--color-text)]">
    <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
      <div class="font-bold text-[var(--color-text)]">
        {settings?.teamName || 'H4A'} {settings?.season || '26/27'}
      </div>

      <div class="text-[var(--color-text)]">
        Team Fines & Club Duty Management Portal
      </div>
    </div>
  </footer>

</div>