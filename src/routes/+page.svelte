<script lang="ts">
  import { onMount } from "svelte";
  import { h4aStore } from "$lib/utils/store";
  import type { Person, FineRule, FineReport, DugnadEntry, DugnadActivity, TeamSettings } from "$lib/types";
  import Navbar from "$lib/components/Navbar.svelte";
  import FineSubmitForm from "$lib/components/FineSubmitForm.svelte";
  import DugnadSubmitForm from "$lib/components/DugnadSubmitForm.svelte";
  import LeaderboardView from "$lib/components/LeaderboardView.svelte";
  import ActivityHistory from "$lib/components/ActivityHistory.svelte";
  import AdminDashboard from "$lib/components/AdminDashboard.svelte";
  import RulesModal from "$lib/components/RulesModal.svelte";
  import { ShieldAlert, HeartHandshake, Trophy, History, Lock } from "lucide-svelte";

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
    fines.filter(f => f.status === "pending").length + dugnad.filter(d => d.status === "pending").length
  );
</script>

<div class="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
  <!-- Navbar with Fine Pot status, Hours, Rules, and Admin button in upper right corner -->
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
    <div class="bg-white p-1.5 rounded-2xl shadow-xs border border-slate-200 flex items-center gap-1 overflow-x-auto">
      <button
        type="button"
        onclick={() => activeTab = "fine-form"}
        class="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer {activeTab === 'fine-form' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}"
      >
        <ShieldAlert class="w-4 h-4 text-emerald-400" />
        <span>Report Fine</span>
      </button>

      <button
        type="button"
        onclick={() => activeTab = "dugnad-form"}
        class="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer {activeTab === 'dugnad-form' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}"
      >
        <HeartHandshake class="w-4 h-4 text-teal-400" />
        <span>Log Club Duty</span>
      </button>

      <button
        type="button"
        onclick={() => activeTab = "leaderboard"}
        class="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer {activeTab === 'leaderboard' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}"
      >
        <Trophy class="w-4 h-4 text-amber-400" />
        <span>Standings</span>
        {#if !settings.finePotPublished}
          <Lock class="w-3 h-3 text-amber-400" />
        {/if}
      </button>

      <button
        type="button"
        onclick={() => activeTab = "history"}
        class="flex-1 min-w-[120px] py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer {activeTab === 'history' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}"
      >
        <History class="w-4 h-4 text-sky-400" />
        <span>Activity Log</span>
      </button>
    </div>

    <!-- Active View Display -->
    {#if activeTab === "fine-form"}
      <div class="space-y-6">
        <FineSubmitForm
          {persons}
          {rules}
          onSubmitFine={async (report: Omit<FineReport, "id" | "date" | "status">) => {
            await h4aStore.addFineReport(report);
          }}
        />
        <ActivityHistory {fines} {dugnad} {persons} />
      </div>
    {:else if activeTab === "dugnad-form"}
      <div class="space-y-6">
        <DugnadSubmitForm
          {persons}
          activities={dugnadActivities}
          onSubmitDugnad={async (entry: Omit<DugnadEntry, "id" | "date" | "status">) => {
            await h4aStore.addDugnadEntry(entry);
          }}
        />
        <ActivityHistory {fines} {dugnad} {persons} />
      </div>
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

  <!-- Clean Minimal Footer with dynamic Team Name & Season -->
  <footer class="mt-auto py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
    <div class="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
      <div class="font-bold text-slate-700">
        {settings?.teamName || 'H4A'} {settings?.season || '26/27'}
      </div>
      <div class="text-slate-400">
        Team Fines & Club Duty Management Portal
      </div>
    </div>
  </footer>
</div>
