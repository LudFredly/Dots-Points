<script lang="ts">
  import {
    Settings,
    CheckCircle2,
    XCircle,
    Edit3,
    Trash2,
    Plus,
    UserPlus,
    Lock,
    Unlock,
    ShieldAlert,
    HeartHandshake,
    Users,
    Sliders,
    BookOpen,
    AlertCircle,
    Save,
    X,
    Clock,
    RefreshCw,
    Sparkles,
    Eye,
    LogOut,
    Navigation
  } from "lucide-svelte";
  import type { Person, FineRule, FineReport, DugnadEntry, DugnadActivity, TeamSettings } from "$lib/types";
  import { getAdminFullName, getPublicDisplayName } from "$lib/utils/nameHelper";
  import { h4aStore, DEFAULT_DUGNAD_ACTIVITIES } from "$lib/utils/store";

  let {
    persons = [],
    rules = [],
    fines = [],
    dugnad = [],
    dugnadActivities = DEFAULT_DUGNAD_ACTIVITIES,
    settings,
    onApproveFine,
    onRejectFine,
    onUpdateFine,
    onApproveDugnad,
    onRejectDugnad,
    onUpdateDugnad,
    onAddPerson,
    onUpdatePerson,
    onRemovePerson,
    onAdjustPersonTotals,
    onAddFineRule,
    onUpdateFineRule,
    onDeleteFineRule,
    onAddDugnadActivity,
    onUpdateDugnadActivity,
    onDeleteDugnadActivity,
    onUpdateSettings,
    onResetData,
    onExitAdmin
  }: {
    persons: Person[];
    rules: FineRule[];
    fines: FineReport[];
    dugnad: DugnadEntry[];
    dugnadActivities?: DugnadActivity[];
    settings: TeamSettings;
    onApproveFine: (id: string) => Promise<void>;
    onRejectFine: (id: string) => Promise<void>;
    onUpdateFine: (id: string, updates: Partial<FineReport>) => Promise<void>;
    onApproveDugnad: (id: string) => Promise<void>;
    onRejectDugnad: (id: string) => Promise<void>;
    onUpdateDugnad: (id: string, updates: Partial<DugnadEntry>) => Promise<void>;
    onAddPerson: (firstName: string, lastName: string, role: string, type: "player" | "coach", number?: number) => void;
    onUpdatePerson: (id: string, updates: Partial<Person>) => void;
    onRemovePerson: (id: string) => void;
    onAdjustPersonTotals?: (personId: string, fineSum?: number, dutyHours?: number) => void;
    onAddFineRule: (rule: Omit<FineRule, "id">) => void;
    onUpdateFineRule: (id: string, updates: Partial<FineRule>) => void;
    onDeleteFineRule: (id: string) => void;
    onAddDugnadActivity?: (activity: Omit<DugnadActivity, "id">) => void;
    onUpdateDugnadActivity?: (id: string, updates: Partial<DugnadActivity>) => void;
    onDeleteDugnadActivity?: (id: string) => void;
    onUpdateSettings: (settings: Partial<TeamSettings>) => void;
    onResetData: () => void;
    onExitAdmin?: () => void;
  } = $props();

  // Admin Authentication State - Requires password each time admin is opened
  let isAuthenticated = $state(false);
  let adminPasswordInput = $state("");
  let authError = $state("");
  let showPassword = $state(false);

  function handleAdminLogin(e: SubmitEvent) {
    e.preventDefault();
    authError = "";
    if (adminPasswordInput.trim() === "H4AOnTop") {
      isAuthenticated = true;
      adminPasswordInput = "";
      notify("Admin console unlocked successfully.");
    } else {
      authError = "Incorrect admin password. Please try again.";
    }
  }

  function handleExitAdmin() {
    isAuthenticated = false;
    adminPasswordInput = "";
    onExitAdmin?.();
  }

  let adminTab = $state<"pending" | "roster" | "rules" | "dugnad_rates" | "records" | "settings">("pending");

  // Notifications
  let bannerMessage = $state<{ type: "success" | "error"; text: string } | null>(null);

  function notify(text: string, type: "success" | "error" = "success") {
    bannerMessage = { type, text };
    setTimeout(() => {
      if (bannerMessage?.text === text) bannerMessage = null;
    }, 4000);
  }

  // Pending Items
  const pendingFines = $derived(fines.filter(f => f.status === "pending"));
  const pendingDugnad = $derived(dugnad.filter(d => d.status === "pending"));
  const pendingTotalCount = $derived(pendingFines.length + pendingDugnad.length);

  // Helper to get minimum rate for sorting
  function getMinRate(r: FineRule): number {
    const rates = [r.fineMatch, r.finePractice, r.fineSocial, r.fine].filter((v): v is number => v != null && v > 0);
    return rates.length > 0 ? Math.min(...rates) : 0;
  }

  // Sorting rules strictly by occasion fine amounts
  const sortedRules = $derived(
    [...rules].sort((a, b) => getMinRate(a) - getMinRate(b) || a.title.localeCompare(b.title))
  );

  // Total approved fine pot
  const approvedTotalFines = $derived(
    fines.filter(f => f.status === "approved").reduce((sum, f) => sum + (f.totalFine || 0), 0)
  );

  const approvedTotalHours = $derived(
    dugnad.filter(d => d.status === "approved").reduce((sum, d) => sum + (d.hours || 0), 0)
  );

  // Effective activities list
  const activeDugnadActivities = $derived(
    (dugnadActivities && dugnadActivities.length > 0) ? dugnadActivities : DEFAULT_DUGNAD_ACTIVITIES
  );

  // --- Modal States ---
  let isAddPersonOpen = $state(false);
  let newPersonFirstName = $state("");
  let newPersonLastName = $state("");
  let newPersonType = $state<"player" | "coach">("player");
  let newPersonRole = $state("Outside Hitter");
  let newPersonNumber = $state<number | undefined>(undefined);

  // Add Rule state - occasion rates mandatory
  let isAddRuleOpen = $state(false);
  let newRuleTitle = $state("");
  let newRuleFineMatch = $state<number | undefined>(undefined);
  let newRuleFinePractice = $state<number | undefined>(undefined);
  let newRuleFineSocial = $state<number | undefined>(undefined);
  let newRuleDescription = $state("");

  // Edit Fine Entry Modal
  let editingFine = $state<FineReport | null>(null);
  let editFinePlayerId = $state("");
  let editFineAmount = $state<number>(0);
  let editFineEventContext = $state<string>("Practice");
  let editFineComment = $state("");

  // Edit Dugnad Entry Modal
  let editingDugnad = $state<DugnadEntry | null>(null);
  let editDugnadPlayerId = $state("");
  let editDugnadHours = $state<number>(0);
  let editDugnadPoints = $state<number>(0);
  let editDugnadComment = $state("");

  // Edit Person Modal
  let editingPerson = $state<Person | null>(null);
  let editPersonFirstName = $state("");
  let editPersonLastName = $state("");
  let editPersonType = $state<"player" | "coach">("player");
  let editPersonRole = $state("Player");
  let editPersonNumber = $state<number | undefined>(undefined);
  let editPersonFineSum = $state<number>(0);
  let editPersonDutyHours = $state<number>(0);

  // Edit Rule Modal - occasion rates mandatory
  let editingRule = $state<FineRule | null>(null);
  let editRuleTitle = $state("");
  let editRuleFineMatch = $state<number | undefined>(undefined);
  let editRuleFinePractice = $state<number | undefined>(undefined);
  let editRuleFineSocial = $state<number | undefined>(undefined);
  let editRuleDescription = $state("");

  // Volunteer Activity Add / Edit
  let isAddDugnadActivityOpen = $state(false);
  let newDugnadActTitle = $state("");
  let newDugnadActDefaultHours = $state<number>(2.0);
  let newDugnadActPointsPerHour = $state<number>(10);

  let editingDugnadActivity = $state<DugnadActivity | null>(null);
  let editDugnadActTitle = $state("");
  let editDugnadActDefaultHours = $state<number>(2.0);
  let editDugnadActPointsPerHour = $state<number>(10);

  // Helper to safely parse occasion fine overrides
  function parseRate(val: any): number | undefined {
    if (val === undefined || val === null || val === "" || String(val).trim() === "") {
      return undefined;
    }
    const num = Number(val);
    if (isNaN(num) || num <= 0) {
      return undefined;
    }
    return num;
  }

  // --- Handlers ---
  function openEditFine(fine: FineReport) {
    editingFine = fine;
    editFinePlayerId = fine.playerId;
    editFineAmount = fine.totalFine;
    editFineEventContext = fine.eventContext || "Practice";
    editFineComment = fine.comment || "";
  }

  async function saveEditedFine() {
    if (!editingFine) return;
    const person = persons.find(p => p.id === editFinePlayerId);
    const pName = person ? getAdminFullName(person) : editingFine.playerName;

    await onUpdateFine(editingFine.id, {
      playerId: editFinePlayerId,
      playerName: pName,
      totalFine: Number(editFineAmount),
      eventContext: editFineEventContext,
      comment: editFineComment.trim()
    });

    notify("Fine record updated successfully.");
    editingFine = null;
  }

  function openEditDugnad(entry: DugnadEntry) {
    editingDugnad = entry;
    editDugnadPlayerId = entry.playerId;
    editDugnadHours = entry.hours;
    editDugnadPoints = entry.points;
    editDugnadComment = entry.comment || "";
  }

  async function saveEditedDugnad() {
    if (!editingDugnad) return;
    const person = persons.find(p => p.id === editDugnadPlayerId);
    const pName = person ? getAdminFullName(person) : editingDugnad.playerName;

    await onUpdateDugnad(editingDugnad.id, {
      playerId: editDugnadPlayerId,
      playerName: pName,
      hours: Number(editDugnadHours),
      points: Number(editDugnadPoints),
      comment: editDugnadComment.trim()
    });

    notify("Club duty record updated successfully.");
    editingDugnad = null;
  }

  function openEditPerson(person: Person) {
    editingPerson = person;
    editPersonFirstName = person.firstName;
    editPersonLastName = person.lastName;
    editPersonType = person.type;
    editPersonRole = person.role || "";
    editPersonNumber = person.number;

    const pFines = fines.filter(f => f.playerId === person.id && f.status === 'approved');
    editPersonFineSum = pFines.reduce((sum, f) => sum + (f.totalFine || 0), 0);

    const pDug = dugnad.filter(d => d.playerId === person.id && d.status === 'approved');
    editPersonDutyHours = Number(pDug.reduce((sum, d) => sum + (d.hours || 0), 0).toFixed(1));
  }

  function saveEditedPerson() {
    if (!editingPerson || !editPersonFirstName.trim()) return;

    onUpdatePerson(editingPerson.id, {
      firstName: editPersonFirstName.trim(),
      lastName: editPersonLastName.trim(),
      type: editPersonType,
      role: editPersonRole.trim(),
      number: editPersonNumber !== undefined && String(editPersonNumber) !== "" ? Number(editPersonNumber) : undefined
    });

    const targetFine = Number(editPersonFineSum) || 0;
    const targetDuty = editPersonType === 'player' ? (Number(editPersonDutyHours) || 0) : undefined;

    if (onAdjustPersonTotals) {
      onAdjustPersonTotals(editingPerson.id, targetFine, targetDuty);
    } else {
      h4aStore.setPersonTotals(editingPerson.id, targetFine, targetDuty);
    }

    notify("Team member and standings updated successfully.");
    editingPerson = null;
  }

  function handleAddPersonSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!newPersonFirstName.trim()) return;

    onAddPerson(
      newPersonFirstName.trim(),
      newPersonLastName.trim(),
      newPersonRole.trim(),
      newPersonType,
      newPersonNumber !== undefined && String(newPersonNumber) !== "" ? Number(newPersonNumber) : undefined
    );

    notify(`Added ${newPersonFirstName.trim()} ${newPersonLastName.trim()} to team`);
    newPersonFirstName = "";
    newPersonLastName = "";
    newPersonRole = "Outside Hitter";
    newPersonNumber = undefined;
    isAddPersonOpen = false;
  }

  function openEditRule(rule: FineRule) {
    editingRule = rule;
    editRuleTitle = rule.title;
    editRuleFineMatch = rule.fineMatch;
    editRuleFinePractice = rule.finePractice;
    editRuleFineSocial = rule.fineSocial;
    editRuleDescription = rule.description || "";
  }

  function saveEditedRule() {
    if (!editingRule || !editRuleTitle.trim()) return;

    const matchVal = parseRate(editRuleFineMatch);
    const practiceVal = parseRate(editRuleFinePractice);
    const socialVal = parseRate(editRuleFineSocial);

    if (!matchVal && !practiceVal && !socialVal) {
      notify("Please provide at least one occasion rate (Match, Practice, or Social).", "error");
      return;
    }

    const fallbackRate = matchVal || practiceVal || socialVal || 50;

    onUpdateFineRule(editingRule.id, {
      title: editRuleTitle.trim(),
      fine: fallbackRate,
      fineMatch: matchVal,
      finePractice: practiceVal,
      fineSocial: socialVal,
      description: editRuleDescription.trim() || undefined
    });

    notify("Rule updated successfully.");
    editingRule = null;
  }

  function handleAddRuleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!newRuleTitle.trim()) return;

    const matchVal = parseRate(newRuleFineMatch);
    const practiceVal = parseRate(newRuleFinePractice);
    const socialVal = parseRate(newRuleFineSocial);

    if (!matchVal && !practiceVal && !socialVal) {
      notify("Please provide at least one occasion rate (Match, Practice, or Social).", "error");
      return;
    }

    const fallbackRate = matchVal || practiceVal || socialVal || 50;

    onAddFineRule({
      title: newRuleTitle.trim(),
      fine: fallbackRate,
      fineMatch: matchVal,
      finePractice: practiceVal,
      fineSocial: socialVal,
      description: newRuleDescription.trim() || undefined
    });

    notify(`Created new rule "${newRuleTitle}"`);
    newRuleTitle = "";
    newRuleFineMatch = undefined;
    newRuleFinePractice = undefined;
    newRuleFineSocial = undefined;
    newRuleDescription = "";
    isAddRuleOpen = false;
  }

  // --- Dugnad Activity Handlers ---
  function openEditDugnadActivity(act: DugnadActivity) {
    editingDugnadActivity = act;
    editDugnadActTitle = act.title;
    editDugnadActDefaultHours = act.defaultHours;
    editDugnadActPointsPerHour = act.pointsPerHour;
  }

  function handleAddDugnadActivitySubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!newDugnadActTitle.trim()) return;

    onAddDugnadActivity?.({
      title: newDugnadActTitle.trim(),
      defaultHours: Number(newDugnadActDefaultHours) || 1,
      pointsPerHour: Number(newDugnadActPointsPerHour) || 10
    });

    notify(`Added duty activity "${newDugnadActTitle.trim()}"`);
    newDugnadActTitle = "";
    newDugnadActDefaultHours = 2.0;
    newDugnadActPointsPerHour = 10;
    isAddDugnadActivityOpen = false;
  }

  function saveEditedDugnadActivity() {
    if (!editingDugnadActivity || !editDugnadActTitle.trim()) return;

    onUpdateDugnadActivity?.(editingDugnadActivity.id, {
      title: editDugnadActTitle.trim(),
      defaultHours: Number(editDugnadActDefaultHours) || 1,
      pointsPerHour: Number(editDugnadActPointsPerHour) || 10
    });

    notify(`Updated activity rate for "${editDugnadActTitle.trim()}"`);
    editingDugnadActivity = null;
  }

  function toggleFinePotPublication() {
    onUpdateSettings({
      finePotPublished: !settings.finePotPublished
    });
    notify(
      !settings.finePotPublished
        ? "Fine pot and player standings are now PUBLISHED to team members."
        : "Fine pot is now HIDDEN from public view."
    );
  }
</script>

<div class="space-y-6">
  <!-- Toast / Notification Banner -->
  {#if bannerMessage}
    <div class="p-4 rounded-xl border flex items-center justify-between gap-3 shadow-md {bannerMessage.type === 'success' ? 'bg-emerald-900 text-emerald-100 border-emerald-700' : 'bg-rose-900 text-rose-100 border-rose-700'}">
      <div class="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
        {#if bannerMessage.type === 'success'}
          <CheckCircle2 class="w-4 h-4 text-emerald-400 shrink-0" />
        {:else}
          <AlertCircle class="w-4 h-4 text-rose-400 shrink-0" />
        {/if}
        <span>{bannerMessage.text}</span>
      </div>
      <button type="button" onclick={() => bannerMessage = null} class="text-white/60 hover:text-white cursor-pointer">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  {#if !isAuthenticated}
    <!-- Password Locked View -->
    <div class="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 sm:p-8 max-w-md mx-auto text-center space-y-5">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-inner">
        <Lock class="w-7 h-7" />
      </div>

      <div>
        <h2 class="text-xl font-bold text-slate-900 tracking-tight">
          Admin Portal Access
        </h2>
        <p class="text-xs sm:text-sm text-slate-500 mt-1">
          Enter the team master password to manage fines, roster, rules, and approvals for {settings?.teamName || 'H4A'} {settings?.season || '26/27'}.
        </p>
      </div>

      {#if authError}
        <div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle class="w-4 h-4 shrink-0 text-rose-600" />
          <span>{authError}</span>
        </div>
      {/if}

      <form onsubmit={handleAdminLogin} class="space-y-4 text-left">
        <div>
          <label for="admin-pass" class="block text-xs font-bold text-slate-700 mb-1">
            Master Password
          </label>
          <div class="relative">
            <input
              id="admin-pass"
              type={showPassword ? "text" : "password"}
              placeholder="Enter password..."
              bind:value={adminPasswordInput}
              required
              class="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 focus:bg-white focus:ring-2 focus:ring-emerald-300 rounded-xl text-slate-900 font-mono text-sm"
            />
            <button
              type="button"
              onclick={() => showPassword = !showPassword}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div class="space-y-2">
          <button
            type="submit"
            class="w-full py-3 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-black rounded-xl text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock class="w-4 h-4" />
            <span>Unlock Admin Console</span>
          </button>

          {#if onExitAdmin}
            <button
              type="button"
              onclick={handleExitAdmin}
              class="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut class="w-3.5 h-3.5" />
              <span>Cancel & Return to Main Site</span>
            </button>
          {/if}
        </div>
      </form>
    </div>
  {:else}
    <!-- Authenticated Admin Header Banner -->
    <div class="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <div class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
          <span class="text-xs uppercase font-extrabold tracking-wider text-emerald-400">
            {settings?.teamName || 'H4A'} {settings?.season || '26/27'} Admin Console (Unlocked)
          </span>
        </div>
        <h2 class="text-lg sm:text-xl font-bold text-white mt-1">
          Team Management & Approval Headquarters
        </h2>
      </div>

      <div class="flex items-center gap-2 flex-wrap">
        <!-- Live Pot Status in Admin -->
        <div class="flex items-center gap-3 bg-slate-800/90 border border-slate-700/80 px-4 py-2 rounded-xl">
          <div>
            <div class="text-[10px] uppercase font-bold text-slate-400">
              Fine Pot Status ({settings.finePotPublished ? 'Published' : 'Hidden'})
            </div>
            <div class="text-base sm:text-lg font-black text-emerald-400">
              {approvedTotalFines} kr <span class="text-xs text-slate-400 font-normal">({approvedTotalHours.toFixed(1)} duty hrs)</span>
            </div>
          </div>
          <button
            type="button"
            onclick={toggleFinePotPublication}
            class="px-2.5 py-1 text-xs font-bold rounded-lg cursor-pointer transition-all {settings.finePotPublished ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'}"
          >
            {settings.finePotPublished ? 'Make Hidden' : 'Publish'}
          </button>
        </div>

        <!-- Exit Admin Button -->
        <button
          type="button"
          onclick={handleExitAdmin}
          class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          title="Exit admin mode and return to main site"
        >
          <LogOut class="w-3.5 h-3.5" />
          <span>Exit Admin</span>
        </button>
      </div>
    </div>

    <!-- Admin Navigation Tabs -->
    <div class="bg-slate-900 p-1.5 rounded-2xl shadow-sm border border-slate-800 flex items-center gap-1 overflow-x-auto text-xs sm:text-sm font-bold">
      <button
        type="button"
        onclick={() => adminTab = "pending"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 {adminTab === 'pending' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'}"
      >
        <ShieldAlert class="w-4 h-4 text-emerald-300" />
        <span>Pending Queue</span>
        {#if pendingTotalCount > 0}
          <span class="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-slate-950">
            {pendingTotalCount}
          </span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => adminTab = "roster"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 {adminTab === 'roster' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'}"
      >
        <Users class="w-4 h-4 text-teal-300" />
        <span>Team Roster ({persons.length})</span>
      </button>

      <button
        type="button"
        onclick={() => adminTab = "rules"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 {adminTab === 'rules' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'}"
      >
        <BookOpen class="w-4 h-4 text-amber-300" />
        <span>Fine Rules ({rules.length})</span>
      </button>

      <button
        type="button"
        onclick={() => adminTab = "dugnad_rates"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 {adminTab === 'dugnad_rates' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'}"
      >
        <HeartHandshake class="w-4 h-4 text-teal-400" />
        <span>Club Duty Activities ({activeDugnadActivities.length})</span>
      </button>

      <button
        type="button"
        onclick={() => adminTab = "records"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 {adminTab === 'records' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'}"
      >
        <Sliders class="w-4 h-4 text-sky-300" />
        <span>All Records</span>
      </button>

      <button
        type="button"
        onclick={() => adminTab = "settings"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 {adminTab === 'settings' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-300 hover:bg-slate-800'}"
      >
        <Settings class="w-4 h-4 text-slate-300" />
        <span>Settings</span>
      </button>
    </div>

    <!-- TAB 1: PENDING QUEUE -->
    {#if adminTab === "pending"}
      <div class="space-y-6">
        <!-- Pending Fines -->
        <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div class="font-bold text-xs sm:text-sm flex items-center gap-2">
              <ShieldAlert class="w-4 h-4 text-amber-400" />
              <span>Pending Fine Reports ({pendingFines.length})</span>
            </div>
            <span class="text-xs text-slate-400">Requires Captain / Treasurer Approval</span>
          </div>

          <div class="divide-y divide-slate-100">
            {#if pendingFines.length === 0}
              <div class="p-8 text-center text-slate-400 text-xs sm:text-sm">
                No pending fine submissions awaiting review.
              </div>
            {:else}
              {#each pendingFines as fine}
                {@const person = persons.find(p => p.id === fine.playerId)}
                <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-slate-900 text-sm">
                        {person ? getAdminFullName(person) : fine.playerName}
                      </span>
                      <span class="text-xs font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {fine.totalFine} kr
                      </span>
                      <span class="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {fine.eventContext}
                      </span>
                    </div>

                    <div class="text-xs text-slate-600 mt-1 font-medium">
                      {fine.ruleTitles.join(", ")}
                    </div>

                    {#if fine.comment}
                      <div class="text-xs text-slate-500 italic mt-0.5">
                        "{fine.comment}"
                      </div>
                    {/if}

                    <div class="text-[11px] text-slate-400 mt-1">
                      Reported by: {fine.reportedBy || 'Anonymous'} • {new Date(fine.date).toLocaleDateString()}
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onclick={() => openEditFine(fine)}
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 class="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onclick={async () => {
                        await onRejectFine(fine.id);
                        notify("Fine submission rejected.");
                      }}
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle class="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onclick={async () => {
                        await onApproveFine(fine.id);
                        notify(`Approved fine of ${fine.totalFine} kr for ${fine.playerName}`);
                      }}
                      class="px-4 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 class="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>

        <!-- Pending Dugnad / Club Duty -->
        <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div class="font-bold text-xs sm:text-sm flex items-center gap-2">
              <HeartHandshake class="w-4 h-4 text-teal-400" />
              <span>Pending Club Duty Logs ({pendingDugnad.length})</span>
            </div>
            <span class="text-xs text-slate-400">Award duty & travel points</span>
          </div>

          <div class="divide-y divide-slate-100">
            {#if pendingDugnad.length === 0}
              <div class="p-8 text-center text-slate-400 text-xs sm:text-sm">
                No pending club duty hours awaiting review.
              </div>
            {:else}
              {#each pendingDugnad as dug}
                {@const person = persons.find(p => p.id === dug.playerId)}
                <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-slate-900 text-sm">
                        {person ? getAdminFullName(person) : dug.playerName}
                      </span>
                      <span class="text-xs font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        {dug.hours} hrs ({dug.points} pts)
                      </span>
                      {#if dug.hadTravel}
                        <span class="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 flex items-center gap-1">
                          <Navigation class="w-3 h-3" />
                          <span>Includes {dug.travelHours || 0}h travel (+{dug.travelPoints || 0} pts)</span>
                        </span>
                      {/if}
                    </div>

                    <div class="text-xs font-semibold text-slate-800 mt-1">
                      {dug.activityType}
                    </div>

                    {#if dug.comment}
                      <div class="text-xs text-slate-500 italic mt-0.5">
                        "{dug.comment}"
                      </div>
                    {/if}
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onclick={() => openEditDugnad(dug)}
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 class="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onclick={async () => {
                        await onRejectDugnad(dug.id);
                        notify("Club duty entry rejected.");
                      }}
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle class="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onclick={async () => {
                        await onApproveDugnad(dug.id);
                        notify(`Approved ${dug.hours} hrs for ${dug.playerName}`);
                      }}
                      class="px-4 py-1.5 text-xs font-bold rounded-lg bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 class="w-4 h-4" />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>
              {/each}
            {/if}
          </div>
        </div>
      </div>

    <!-- TAB 2: ROSTER & OVERVIEW -->
    {:else if adminTab === "roster"}
      <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-4">
        <div class="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-base sm:text-lg font-bold text-white tracking-tight">
              Team Roster & Individual Standings
            </h3>
            <p class="text-xs text-slate-400">
              Full names displayed. Alphabetically sorted. Add or remove players and coaches.
            </p>
          </div>

          <button
            type="button"
            onclick={() => isAddPersonOpen = true}
            class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <UserPlus class="w-4 h-4" />
            <span>Add Person</span>
          </button>
        </div>

        <!-- Add Person Form (Inline collapsible) -->
        {#if isAddPersonOpen}
          <form onsubmit={handleAddPersonSubmit} class="p-4 bg-slate-50 border-y border-slate-200 space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserPlus class="w-4 h-4 text-emerald-600" />
                <span>Add New Team Member / Staff</span>
              </h4>
              <button type="button" onclick={() => isAddPersonOpen = false} class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs sm:text-sm">
              <div>
                <label for="adm-first-name" class="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                <input
                  id="adm-first-name"
                  type="text"
                  placeholder="e.g. Henrik"
                  bind:value={newPersonFirstName}
                  required
                  class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label for="adm-last-name" class="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                <input
                  id="adm-last-name"
                  type="text"
                  placeholder="e.g. Hansen"
                  bind:value={newPersonLastName}
                  class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label for="adm-person-type" class="block text-xs font-bold text-slate-700 mb-1">Role Type</label>
                <select
                  id="adm-person-type"
                  bind:value={newPersonType}
                  class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-emerald-200"
                >
                  <option value="player">Player</option>
                  <option value="coach">Coach / Staff</option>
                </select>
              </div>

              <div>
                <label for="adm-person-role" class="block text-xs font-bold text-slate-700 mb-1">Position / Title</label>
                <input
                  id="adm-person-role"
                  type="text"
                  placeholder="e.g. Setter"
                  bind:value={newPersonRole}
                  class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div>
                <label for="adm-person-num" class="block text-xs font-bold text-slate-700 mb-1">Jersey #</label>
                <input
                  id="adm-person-num"
                  type="number"
                  placeholder="4"
                  bind:value={newPersonNumber}
                  class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onclick={() => isAddPersonOpen = false}
                class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Member
              </button>
            </div>
          </form>
        {/if}

        <!-- Persons Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th class="p-3.5 pl-5">Full Name</th>
                <th class="p-3.5">Type</th>
                <th class="p-3.5">Position</th>
                <th class="p-3.5">Jersey</th>
                <th class="p-3.5 text-right">Fines Sum</th>
                <th class="p-3.5 text-right">Club Duty</th>
                <th class="p-3.5 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              {#each persons as p}
                {@const pFines = fines.filter(f => f.playerId === p.id && f.status === 'approved')}
                {@const pFineSum = pFines.reduce((sum, f) => sum + (f.totalFine || 0), 0)}
                {@const pDug = dugnad.filter(d => d.playerId === p.id && d.status === 'approved')}
                {@const pDugHours = pDug.reduce((sum, d) => sum + (d.hours || 0), 0)}
                {@const pDugPoints = pDug.reduce((sum, d) => sum + (d.points || 0), 0)}
                <tr class="hover:bg-slate-50/80 transition-colors">
                  <td class="p-3.5 pl-5 font-bold text-slate-900">
                    {getAdminFullName(p)}
                  </td>
                  <td class="p-3.5">
                    <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full {p.type === 'coach' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'}">
                      {p.type === 'coach' ? 'Coach' : 'Player'}
                    </span>
                  </td>
                  <td class="p-3.5 text-slate-600">
                    {p.role || "Player"}
                  </td>
                  <td class="p-3.5 font-mono font-bold text-slate-700">
                    {p.number !== undefined ? `#${p.number}` : "-"}
                  </td>
                  <td class="p-3.5 text-right font-black text-emerald-900">
                    <button
                      type="button"
                      onclick={() => openEditPerson(p)}
                      class="hover:underline text-emerald-900 hover:text-emerald-700 inline-flex flex-col items-end cursor-pointer group"
                      title="Click to edit fines sum directly"
                    >
                      <span class="flex items-center gap-1 font-black">
                        {pFineSum} kr
                        <Edit3 class="w-3 h-3 text-slate-400 group-hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </span>
                      <span class="text-[11px] font-normal text-slate-400">
                        {pFines.length} fines
                      </span>
                    </button>
                  </td>
                  <td class="p-3.5 text-right font-black text-teal-900">
                    {#if p.type === 'player'}
                      <button
                        type="button"
                        onclick={() => openEditPerson(p)}
                        class="hover:underline text-teal-900 hover:text-teal-700 inline-flex flex-col items-end cursor-pointer group"
                        title="Click to edit club duty hours directly"
                      >
                        <span class="flex items-center gap-1 font-black">
                          {pDugHours.toFixed(1)} hrs
                          <Edit3 class="w-3 h-3 text-slate-400 group-hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </span>
                        <span class="text-[11px] font-normal text-slate-400">
                          {pDugPoints} pts
                        </span>
                      </button>
                    {:else}
                      <span class="text-slate-400 italic text-xs font-normal">Excluded</span>
                    {/if}
                  </td>
                  <td class="p-3.5 text-right pr-5">
                    <div class="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onclick={() => openEditPerson(p)}
                        class="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Edit person details, fines sum & duty hours"
                      >
                        <Edit3 class="w-3.5 h-3.5" />
                        <span class="hidden md:inline">Edit</span>
                      </button>
                      <button
                        type="button"
                        onclick={() => {
                          onRemovePerson(p.id);
                          notify(`Removed ${getAdminFullName(p)} from roster`);
                        }}
                        class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                        title="Remove person"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>

    <!-- TAB 3: FINE RULES & OCCASIONS -->
    {:else if adminTab === "rules"}
      <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-4">
        <div class="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-base sm:text-lg font-bold text-white tracking-tight">
              Fine Rules & Occasion Amounts
            </h3>
            <p class="text-xs text-slate-400">
              Each rule must have at least one occasion amount (Match, Practice, or Social) set with 5 kr increments. Unset occasions do not show during fine reporting.
            </p>
          </div>

          <button
            type="button"
            onclick={() => isAddRuleOpen = true}
            class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <Plus class="w-4 h-4" />
            <span>New Fine Rule</span>
          </button>
        </div>

        <!-- Add Rule Form -->
        {#if isAddRuleOpen}
          <form onsubmit={handleAddRuleSubmit} class="p-4 bg-slate-50 border-y border-slate-200 space-y-4">
            <div class="flex items-center justify-between">
              <h4 class="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus class="w-4 h-4 text-emerald-600" />
                <span>Add New Fine Rule</span>
              </h4>
              <button type="button" onclick={() => isAddRuleOpen = false} class="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="space-y-3 text-xs sm:text-sm">
              <div>
                <label for="adm-rule-title" class="block text-xs font-bold text-slate-700 mb-1">Rule Title *</label>
                <input
                  id="adm-rule-title"
                  type="text"
                  placeholder="e.g. Late for warm-up / team call-up"
                  bind:value={newRuleTitle}
                  required
                  class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-200 font-medium"
                />
              </div>

              <!-- Occasion-Specific Amounts (Mandatory) -->
              <div class="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                <div>
                  <span class="block text-xs font-bold text-slate-800">
                    Occasion Amounts (Mandatory: enter kr for applicable occasions) *
                  </span>
                  <span class="block text-[11px] text-slate-500 italic mt-0.5">
                    * Leave empty or 0 if this rule does not apply to that occasion.
                  </span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label for="adm-match-rate" class="block text-[11px] font-bold text-slate-700 mb-1">Match (kr)</label>
                    <input
                      id="adm-match-rate"
                      type="number"
                      step="5"
                      min="0"
                      placeholder="e.g. 50"
                      bind:value={newRuleFineMatch}
                      class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label for="adm-practice-rate" class="block text-[11px] font-bold text-slate-700 mb-1">Practice (kr)</label>
                    <input
                      id="adm-practice-rate"
                      type="number"
                      step="5"
                      min="0"
                      placeholder="e.g. 50"
                      bind:value={newRuleFinePractice}
                      class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label for="adm-social-rate" class="block text-[11px] font-bold text-slate-700 mb-1">Social (kr)</label>
                    <input
                      id="adm-social-rate"
                      type="number"
                      step="5"
                      min="0"
                      placeholder="e.g. 50"
                      bind:value={newRuleFineSocial}
                      class="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-slate-900 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label for="adm-rule-desc" class="block text-xs font-bold text-slate-700 mb-1">Description (optional)</label>
                <input
                  id="adm-rule-desc"
                  type="text"
                  placeholder="Explanation of when this fine is applied"
                  bind:value={newRuleDescription}
                  class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onclick={() => isAddRuleOpen = false}
                class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Rule
              </button>
            </div>
          </form>
        {/if}

        <!-- Rules List -->
        <div class="divide-y divide-slate-100">
          {#each sortedRules as rule}
            <div class="p-4 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-slate-900 text-xs sm:text-sm">
                    {rule.title}
                  </span>
                </div>
                {#if rule.description}
                  <div class="text-xs text-slate-500 mt-0.5">
                    {rule.description}
                  </div>
                {/if}
                <div class="flex items-center gap-2 mt-1.5 text-[11px] font-medium flex-wrap">
                  <span class="text-slate-500 font-semibold">Occasions:</span>
                  {#if rule.fineMatch != null && rule.fineMatch > 0}
                    <span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-bold">
                      Match: {rule.fineMatch} kr
                    </span>
                  {/if}
                  {#if rule.finePractice != null && rule.finePractice > 0}
                    <span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-bold">
                      Practice: {rule.finePractice} kr
                    </span>
                  {/if}
                  {#if rule.fineSocial != null && rule.fineSocial > 0}
                    <span class="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 font-bold">
                      Social: {rule.fineSocial} kr
                    </span>
                  {/if}
                  {#if (rule.fineMatch == null || rule.fineMatch <= 0) && (rule.finePractice == null || rule.finePractice <= 0) && (rule.fineSocial == null || rule.fineSocial <= 0)}
                    <span class="px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 font-bold">
                      Standard: {rule.fine || 0} kr
                    </span>
                  {/if}
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onclick={() => openEditRule(rule)}
                  class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                  title="Edit rule"
                >
                  <Edit3 class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => {
                    onDeleteFineRule(rule.id);
                    notify(`Deleted rule "${rule.title}"`);
                  }}
                  class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                  title="Delete rule"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>

    <!-- TAB 4: CLUB DUTY RATES & ACTIVITIES -->
    {:else if adminTab === "dugnad_rates"}
      <div class="space-y-6">
        <!-- Duty Activities Catalog & Custom Rates -->
        <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden space-y-4">
          <div class="p-4 sm:p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <HeartHandshake class="w-5 h-5 text-teal-400" />
                <span>Club Duty Activities & Rates ({activeDugnadActivities.length})</span>
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">
                Manage specific club duties, standard durations, and points per hour.
              </p>
            </div>

            <button
              type="button"
              onclick={() => isAddDugnadActivityOpen = true}
              class="px-3.5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus class="w-4 h-4" />
              <span>Add Duty Activity</span>
            </button>
          </div>

          <!-- Add Dugnad Activity Form -->
          {#if isAddDugnadActivityOpen}
            <form onsubmit={handleAddDugnadActivitySubmit} class="p-4 bg-slate-50 border-y border-slate-200 space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Plus class="w-4 h-4 text-teal-600" />
                  <span>Add New Duty Activity & Rate</span>
                </h4>
                <button type="button" onclick={() => isAddDugnadActivityOpen = false} class="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X class="w-4 h-4" />
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs sm:text-sm">
                <div class="sm:col-span-2">
                  <label for="new-act-title" class="block text-xs font-bold text-slate-700 mb-1">Activity Title *</label>
                  <input
                    id="new-act-title"
                    type="text"
                    placeholder="e.g. Hall Rigging & Net Setup"
                    bind:value={newDugnadActTitle}
                    required
                    class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-200 font-medium"
                  />
                </div>

                <div>
                  <label for="new-act-hours" class="block text-xs font-bold text-slate-700 mb-1">Standard Duration (Hours) *</label>
                  <input
                    id="new-act-hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    bind:value={newDugnadActDefaultHours}
                    required
                    class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-200 font-medium"
                  />
                </div>

                <div>
                  <label for="new-act-rate" class="block text-xs font-bold text-slate-700 mb-1">Points Rate (pts/hr) *</label>
                  <input
                    id="new-act-rate"
                    type="number"
                    step="1"
                    min="1"
                    bind:value={newDugnadActPointsPerHour}
                    required
                    class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-teal-200 font-medium"
                  />
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onclick={() => isAddDugnadActivityOpen = false}
                  class="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Activity Rate
                </button>
              </div>
            </form>
          {/if}

          <!-- Activities Table -->
          <div class="divide-y divide-slate-100">
            {#each activeDugnadActivities as act}
              <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 text-xs sm:text-sm">
                      {act.title}
                    </span>
                    <span class="text-xs font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {act.pointsPerHour} pts / hr
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={() => openEditDugnadActivity(act)}
                    class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                    <span>Edit Rate</span>
                  </button>

                  <button
                    type="button"
                    onclick={() => {
                      onDeleteDugnadActivity?.(act.id);
                      notify(`Deleted activity "${act.title}"`);
                    }}
                    class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                    title="Delete activity"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

    <!-- TAB 5: ALL APPROVED RECORDS -->
    {:else if adminTab === "records"}
      <div class="space-y-6">
        <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div class="font-bold text-xs sm:text-sm flex items-center gap-2">
              <ShieldAlert class="w-4 h-4 text-emerald-400" />
              <span>Approved Fines ({fines.filter(f => f.status === 'approved').length})</span>
            </div>
            <div class="text-xs text-emerald-400 font-bold">
              Total: {approvedTotalFines} kr
            </div>
          </div>

          <div class="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {#each fines.filter(f => f.status === 'approved') as fine}
              {@const person = persons.find(p => p.id === fine.playerId)}
              <div class="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 text-xs sm:text-sm">
                      {person ? getAdminFullName(person) : fine.playerName}
                    </span>
                    <span class="font-bold text-emerald-800 text-xs">
                      {fine.totalFine} kr
                    </span>
                  </div>
                  <div class="text-xs text-slate-600">
                    {fine.ruleTitles.join(", ")}
                  </div>
                  {#if fine.comment}
                    <div class="text-[11px] text-slate-400 italic">
                      "{fine.comment}"
                    </div>
                  {/if}
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={() => openEditFine(fine)}
                    class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    title="Edit fine"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onclick={async () => {
                      await onRejectFine(fine.id);
                      notify("Deleted fine record.");
                    }}
                    class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                    title="Delete fine"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Approved Dugnad -->
        <div class="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
          <div class="p-4 bg-slate-900 text-white flex items-center justify-between">
            <div class="font-bold text-xs sm:text-sm flex items-center gap-2">
              <HeartHandshake class="w-4 h-4 text-teal-400" />
              <span>Approved Club Duty Hours ({dugnad.filter(d => d.status === 'approved').length})</span>
            </div>
            <div class="text-xs text-teal-400 font-bold">
              Total: {approvedTotalHours.toFixed(1)} hrs
            </div>
          </div>

          <div class="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {#each dugnad.filter(d => d.status === 'approved') as entry}
              {@const person = persons.find(p => p.id === entry.playerId)}
              <div class="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-slate-50">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-900 text-xs sm:text-sm">
                      {person ? getAdminFullName(person) : entry.playerName}
                    </span>
                    <span class="font-bold text-teal-800 text-xs">
                      {entry.hours} hrs ({entry.points} pts)
                    </span>
                    {#if entry.hadTravel}
                      <span class="text-[10px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                        +{entry.travelHours || 0}h travel
                      </span>
                    {/if}
                  </div>
                  <div class="text-xs text-slate-600">
                    {entry.activityType}
                  </div>
                  {#if entry.comment}
                    <div class="text-[11px] text-slate-400 italic">
                      "{entry.comment}"
                    </div>
                  {/if}
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={() => openEditDugnad(entry)}
                    class="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                    title="Edit duty record"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onclick={async () => {
                      await onRejectDugnad(entry.id);
                      notify("Deleted duty record.");
                    }}
                    class="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                    title="Delete duty record"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

    <!-- TAB 6: SETTINGS & PUBLISHING -->
    {:else if adminTab === "settings"}
      <div class="bg-white rounded-2xl shadow-xs border border-slate-200 p-6 space-y-6">
        <div>
          <h3 class="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Portal & Season Configuration
          </h3>
          <p class="text-xs text-slate-500">
            Manage privacy, publication switches, and team details. Changes to Team Name and Season propagate immediately across the entire site.
          </p>
        </div>

        <!-- Publication Big Box -->
        <div class="p-5 rounded-2xl border-2 {settings.finePotPublished ? 'border-emerald-500 bg-emerald-50/50' : 'border-amber-400 bg-amber-50/50'} space-y-3">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-xs font-bold uppercase tracking-wider {settings.finePotPublished ? 'text-emerald-800' : 'text-amber-800'}">
                Penalty Pot & Standings Privacy
              </div>
              <div class="text-base font-black text-slate-900 mt-0.5">
                {#if settings.finePotPublished}
                  Fine Pot is currently PUBLISHED to all team members
                {:else}
                  Fine Pot is currently HIDDEN (displays "??? kr")
                {/if}
              </div>
              <p class="text-xs text-slate-600 mt-1 max-w-xl">
                When hidden, the total fine pot in the header and the player standings leaderboard are concealed from public view. Toggle on when you are ready to reveal the season end results.
              </p>
            </div>

            <button
              type="button"
              onclick={toggleFinePotPublication}
              class="px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-xs cursor-pointer shrink-0 {settings.finePotPublished ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'}"
            >
              {#if settings.finePotPublished}
                <span class="flex items-center gap-1.5">
                  <Unlock class="w-4 h-4" />
                  <span>Switch to Hidden</span>
                </span>
              {:else}
                <span class="flex items-center gap-1.5">
                  <Lock class="w-4 h-4" />
                  <span>Publish Standings</span>
                </span>
              {/if}
            </button>
          </div>
        </div>

        <!-- Season Settings Form -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200">
          <div>
            <label for="set-team-name" class="block text-xs font-bold text-slate-700 mb-1">
              Team Name
            </label>
            <input
              id="set-team-name"
              type="text"
              bind:value={settings.teamName}
              oninput={() => {
                onUpdateSettings({ teamName: settings.teamName });
              }}
              onchange={() => {
                onUpdateSettings({ teamName: settings.teamName });
                notify("Updated team name.");
              }}
              class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-xs sm:text-sm"
            />
          </div>

          <div>
            <label for="set-team-season" class="block text-xs font-bold text-slate-700 mb-1">
              Season
            </label>
            <input
              id="set-team-season"
              type="text"
              bind:value={settings.season}
              oninput={() => {
                onUpdateSettings({ season: settings.season });
              }}
              onchange={() => {
                onUpdateSettings({ season: settings.season });
                notify("Updated season.");
              }}
              class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-xs sm:text-sm"
            />
          </div>
        </div>

        <!-- Reset / Danger Zone -->
        <div class="pt-6 border-t border-slate-200 flex items-center justify-between">
          <div>
            <div class="text-xs font-bold text-slate-900">
              Reset Sample Data
            </div>
            <div class="text-[11px] text-slate-500">
              Restore initial team roster, fine rules, and sample entries.
            </div>
          </div>

          <button
            type="button"
            onclick={() => {
              onResetData();
              notify("Reset all data to defaults.");
            }}
            class="px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw class="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>
    {/if}

    <!-- MODAL: Edit Fine Entry -->
    {#if editingFine}
      <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-base text-slate-900">
              Edit Fine Submission
            </h4>
            <button type="button" onclick={() => editingFine = null} class="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3 text-xs sm:text-sm">
            <div>
              <label for="edit-fine-player" class="block text-xs font-bold text-slate-700 mb-1">Player / Person</label>
              <select
                id="edit-fine-player"
                bind:value={editFinePlayerId}
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
              >
                {#each persons as p}
                  <option value={p.id}>{getAdminFullName(p)} ({p.type})</option>
                {/each}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edit-fine-amount" class="block text-xs font-bold text-slate-700 mb-1">Total Fine (kr)</label>
                <input
                  id="edit-fine-amount"
                  type="number"
                  step="5"
                  min="0"
                  bind:value={editFineAmount}
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div>
                <label for="edit-fine-ctx" class="block text-xs font-bold text-slate-700 mb-1">Occasion</label>
                <select
                  id="edit-fine-ctx"
                  bind:value={editFineEventContext}
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  <option value="Practice">Practice</option>
                  <option value="Match">Match</option>
                  <option value="Social">Social</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label for="edit-fine-comm" class="block text-xs font-bold text-slate-700 mb-1">Comment</label>
              <textarea
                id="edit-fine-comm"
                rows="2"
                bind:value={editFineComment}
                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onclick={() => editingFine = null}
              class="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={saveEditedFine}
              class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- MODAL: Edit Dugnad Entry -->
    {#if editingDugnad}
      <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-base text-slate-900">
              Edit Club Duty Submission
            </h4>
            <button type="button" onclick={() => editingDugnad = null} class="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3 text-xs sm:text-sm">
            <div>
              <label for="edit-dug-player" class="block text-xs font-bold text-slate-700 mb-1">Player</label>
              <select
                id="edit-dug-player"
                bind:value={editDugnadPlayerId}
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
              >
                {#each persons.filter(p => p.type === 'player') as p}
                  <option value={p.id}>{getAdminFullName(p)}</option>
                {/each}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edit-dug-hours" class="block text-xs font-bold text-slate-700 mb-1">Hours</label>
                <input
                  id="edit-dug-hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  bind:value={editDugnadHours}
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div>
                <label for="edit-dug-pts" class="block text-xs font-bold text-slate-700 mb-1">Points Awarded</label>
                <input
                  id="edit-dug-pts"
                  type="number"
                  step="1"
                  min="0"
                  bind:value={editDugnadPoints}
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>
            </div>

            <div>
              <label for="edit-dug-comm" class="block text-xs font-bold text-slate-700 mb-1">Comment</label>
              <textarea
                id="edit-dug-comm"
                rows="2"
                bind:value={editDugnadComment}
                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onclick={() => editingDugnad = null}
              class="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={saveEditedDugnad}
              class="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- MODAL: Edit Person -->
    {#if editingPerson}
      <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-base text-slate-900">
              Edit Team Member
            </h4>
            <button type="button" onclick={() => editingPerson = null} class="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3 text-xs sm:text-sm">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edit-p-fname" class="block text-xs font-bold text-slate-700 mb-1">First Name *</label>
                <input
                  id="edit-p-fname"
                  type="text"
                  bind:value={editPersonFirstName}
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>
              <div>
                <label for="edit-p-lname" class="block text-xs font-bold text-slate-700 mb-1">Last Name</label>
                <input
                  id="edit-p-lname"
                  type="text"
                  bind:value={editPersonLastName}
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edit-p-type" class="block text-xs font-bold text-slate-700 mb-1">Type</label>
                <select
                  id="edit-p-type"
                  bind:value={editPersonType}
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                >
                  <option value="player">Player</option>
                  <option value="coach">Coach / Staff</option>
                </select>
              </div>
              <div>
                <label for="edit-p-num" class="block text-xs font-bold text-slate-700 mb-1">Jersey #</label>
                <input
                  id="edit-p-num"
                  type="number"
                  bind:value={editPersonNumber}
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>

            <div>
              <label for="edit-p-role" class="block text-xs font-bold text-slate-700 mb-1">Position / Role</label>
              <input
                id="edit-p-role"
                type="text"
                bind:value={editPersonRole}
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <!-- Direct Standings & Totals Adjustment -->
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div>
                <span class="block text-xs font-bold text-slate-800">
                  Direct Standings & Totals Adjustment
                </span>
                <span class="block text-[11px] text-slate-500 italic mt-0.5">
                  Directly adjust this person's recorded fine total and club duty hours.
                </span>
              </div>
              <div class="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label for="edit-p-finesum" class="block text-xs font-bold text-slate-700 mb-1">
                    Fines Sum (kr)
                  </label>
                  <div class="relative">
                    <input
                      id="edit-p-finesum"
                      type="number"
                      step="5"
                      bind:value={editPersonFineSum}
                      class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-emerald-200"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                      kr
                    </span>
                  </div>
                </div>

                {#if editPersonType === 'player'}
                  <div>
                    <label for="edit-p-dutyhrs" class="block text-xs font-bold text-slate-700 mb-1">
                      Club Duty (hrs)
                    </label>
                    <div class="relative">
                      <input
                        id="edit-p-dutyhrs"
                        type="number"
                        step="0.5"
                        min="0"
                        bind:value={editPersonDutyHours}
                        class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-teal-200"
                      />
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                        hrs
                      </span>
                    </div>
                  </div>
                {:else}
                  <div class="flex flex-col justify-center text-xs text-slate-400 italic">
                    Coaches are excluded from Club Duty.
                  </div>
                {/if}
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onclick={() => editingPerson = null}
              class="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={saveEditedPerson}
              class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Person
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- MODAL: Edit Fine Rule -->
    {#if editingRule}
      <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-base text-slate-900">
              Edit Fine Rule
            </h4>
            <button type="button" onclick={() => editingRule = null} class="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3 text-xs sm:text-sm">
            <div>
              <label for="edit-r-title" class="block text-xs font-bold text-slate-700 mb-1">Rule Title *</label>
              <input
                id="edit-r-title"
                type="text"
                bind:value={editRuleTitle}
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>

            <!-- Occasion amounts (Mandatory) -->
            <div class="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div>
                <span class="block text-xs font-bold text-slate-800">
                  Occasion Amounts (Mandatory: enter amounts in 5 kr steps) *
                </span>
                <span class="block text-[11px] text-slate-500 italic mt-0.5">
                  * Leave blank or 0 to exclude this violation from that occasion.
                </span>
              </div>
              <div class="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label for="edit-match-rate" class="block text-[10px] font-bold text-slate-600 mb-1">Match (kr)</label>
                  <input
                    id="edit-match-rate"
                    type="number"
                    step="5"
                    min="0"
                    placeholder="None"
                    bind:value={editRuleFineMatch}
                    class="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label for="edit-practice-rate" class="block text-[10px] font-bold text-slate-600 mb-1">Practice (kr)</label>
                  <input
                    id="edit-practice-rate"
                    type="number"
                    step="5"
                    min="0"
                    placeholder="None"
                    bind:value={editRuleFinePractice}
                    class="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label for="edit-social-rate" class="block text-[10px] font-bold text-slate-600 mb-1">Social (kr)</label>
                  <input
                    id="edit-social-rate"
                    type="number"
                    step="5"
                    min="0"
                    placeholder="None"
                    bind:value={editRuleFineSocial}
                    class="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div>
              <label for="edit-r-desc" class="block text-xs font-bold text-slate-700 mb-1">Description (optional)</label>
              <textarea
                id="edit-r-desc"
                rows="2"
                bind:value={editRuleDescription}
                class="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onclick={() => editingRule = null}
              class="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={saveEditedRule}
              class="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Rule
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- MODAL: Edit Dugnad Activity -->
    {#if editingDugnadActivity}
      <div class="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-slate-200">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-base text-slate-900">
              Edit Duty Task & Rate
            </h4>
            <button type="button" onclick={() => editingDugnadActivity = null} class="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3 text-xs sm:text-sm">
            <div>
              <label for="edit-act-title" class="block text-xs font-bold text-slate-700 mb-1">Activity Title *</label>
              <input
                id="edit-act-title"
                type="text"
                bind:value={editDugnadActTitle}
                class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edit-act-hours" class="block text-xs font-bold text-slate-700 mb-1">Standard Duration (Hours)</label>
                <input
                  id="edit-act-hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  bind:value={editDugnadActDefaultHours}
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>

              <div>
                <label for="edit-act-rate" class="block text-xs font-bold text-slate-700 mb-1">Points Rate (pts/hr)</label>
                <input
                  id="edit-act-rate"
                  type="number"
                  step="1"
                  min="1"
                  bind:value={editDugnadActPointsPerHour}
                  class="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onclick={() => editingDugnadActivity = null}
              class="px-3.5 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={saveEditedDugnadActivity}
              class="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Rate
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
