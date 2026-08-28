<script lang="ts">
  import { onMount } from "svelte";
  import { h4aStore } from "$lib/utils/store";
  import type { Person, FineRule, FineReport, DugnadEntry, DugnadActivity, TeamSettings } from "$lib/types";
  import AdminDashboard from "$lib/components/AdminDashboard.svelte";
  import { ArrowLeft } from "lucide-svelte";

  let persons = $state<Person[]>([]);
  let rules = $state<FineRule[]>([]);
  let fines = $state<FineReport[]>([]);
  let dugnad = $state<DugnadEntry[]>([]);
  let dugnadActivities = $state<DugnadActivity[]>([]);
  let settings = $state<TeamSettings>(h4aStore.settings);

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
</script>

<div class="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white">
  <!-- Top Bar -->
  <header class="bg-slate-900 text-white shadow-md border-b border-slate-800 sticky top-0 z-30">
    <div class="max-w-5xl mx-auto px-4 py-3 sm:px-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a
          href="/"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700"
        >
          <ArrowLeft class="w-4 h-4" />
          <span>Back to Main Portal</span>
        </a>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-slate-200">
          Admin Portal • H4A 26/27
        </span>
      </div>
    </div>
  </header>

  <main class="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
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
    />
  </main>
</div>
