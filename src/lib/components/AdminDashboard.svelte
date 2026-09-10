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
    Navigation,
    Download,
    Upload,
    Database,
    FileDown,
    FileUp,
    FileText,
    Check,
    AlertTriangle,
    CheckCircle,
    ShieldCheck,
    KeyRound,
    Trophy
  } from "lucide-svelte";
  import type {
    Person,
    FineRule,
    FineReport,
    DugnadEntry,
    DugnadActivity,
    TeamSettings,
    TeamDataBackup,
    PlayerBackupData
  } from "$lib/types";
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
    onAddPerson: (firstName: string, lastName: string, role: string, type: "player" | "coach", number?: number) => Promise<void> | void;
    onUpdatePerson: (id: string, updates: Partial<Person>) => Promise<void> | void;
    onRemovePerson: (id: string) => Promise<void> | void;
    onAdjustPersonTotals?: (personId: string, fineSum?: number, dutyHours?: number) => Promise<void> | void;
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

  // Admin Authorization State (URL admin access key only)
  let isUnlocked = $derived(
    h4aStore.isAdminAccessGranted ||
    !h4aStore.expectedAdminAccessKey
  );
  let adminKeyInput = $state("");
  let authError = $state("");
  let isLoggingIn = $state(false);
  let showPassword = $state(false);

  // Backup & Restore State
  let isExporting = $state(false);
  let isImporting = $state(false);
  let isImportModalOpen = $state(false);
  let pendingBackup = $state<TeamDataBackup | null>(null);
  let importErrors = $state<string[]>([]);
  let importMode = $state<"merge" | "replace">("merge");
  let replaceConfirmation = $state("");
  let fileInputRef = $state<HTMLInputElement | null>(null);

  async function handleAdminLogin(e: SubmitEvent) {
    e.preventDefault();
    authError = "";
    isLoggingIn = true;
    try {
      await h4aStore.loginWithAdminKey(adminKeyInput);
      adminKeyInput = "";
      notify("Admin-konsollen er låst opp.");
    } catch (err: any) {
      console.error("Admin sign-in error:", err);
      authError = err.message || "Kunne ikke låse opp som administrator.";
    } finally {
      isLoggingIn = false;
    }
  }

  async function handleExitAdmin() {
    try {
      await h4aStore.logoutAdmin();
      adminKeyInput = "";
      notify("Logget ut av Admin-konsollen.");
      onExitAdmin?.();
    } catch (err: any) {
      console.error("Sign out error:", err);
      onExitAdmin?.();
    }
  }

  function handleExportTeamData() {
    isExporting = true;
    try {
      const data = h4aStore.exportTeamData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `h4a-team-data-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const finesCount = data.players.reduce((sum, p) => sum + (p.fines?.length || 0), 0);
      const dugnadCount = data.players.reduce((sum, p) => sum + (p.dugnad?.length || 0), 0);
      notify(`Eksporterte ${data.players.length} spillere, ${finesCount} bøter og ${dugnadCount} dugnadsposter.`);
    } catch (err: any) {
      console.error("Export error:", err);
      notify(err.message || "Kunne ikke eksportere teamdata.", "error");
    } finally {
      isExporting = false;
    }
  }

  function handleFileInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      processImportFile(target.files[0]);
    }
  }

  async function processImportFile(file: File) {
    importErrors = [];
    if (!file.name.toLowerCase().endsWith(".json")) {
      importErrors = ["File must be a .json file."];
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const errors: string[] = [];
      if (!parsed || typeof parsed !== "object") {
        errors.push("File does not contain a valid JSON object.");
      } else if (!Array.isArray(parsed.players)) {
        errors.push("Missing required field: 'players' must be a list of players.");
      } else if (parsed.players.length === 0) {
        errors.push("The 'players' list is empty.");
      } else {
        const invalid = parsed.players.filter((p: any) => !p || (!p.firstName && !p.name));
        if (invalid.length > 0) {
          errors.push(`${invalid.length} player(s) are missing a first name.`);
        }
      }

      if (errors.length > 0) {
        importErrors = errors;
        return;
      }

      pendingBackup = parsed as TeamDataBackup;
      importMode = "merge";
      replaceConfirmation = "";
      isImportModalOpen = true;
    } catch (err: any) {
      console.error("JSON parse error:", err);
      importErrors = [`Could not read JSON: ${err.message}`];
    }
  }

  async function executeImport() {
  if (!pendingBackup) return;
  if (importMode === "replace" && replaceConfirmation.trim().toUpperCase() !== "REPLACE") {
    notify("Please type 'REPLACE' to confirm full data replacement.", "error");
    return;
  }

  isImporting = true;
  try {
    const res = await h4aStore.importTeamData(pendingBackup, importMode);
    notify(`Import successful! ${res.playersCount} players, ${res.finesCount} fines, and ${res.dugnadCount} club duties.`);
    isImportModalOpen = false;
    pendingBackup = null;
    if (fileInputRef) fileInputRef.value = "";
  } catch (err: any) {
    console.error("Import error:", err);
    notify(err.message || "Could not complete the import.", "error");
  } finally {
    isImporting = false;
  }
}

  let adminTab = $state<"pending" | "roster" | "duty_leaderboard" | "rules" | "dugnad_rates" | "records" | "settings">("pending");

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
  // Sort roster: coaches first, then alphabetically by last name and first name
  const sortedPersons = $derived(
    [...persons].sort((a, b) => {
      // Coaches first
      if (a.type !== b.type) {
        return a.type === "coach" ? -1 : 1;
      }

      // Alphabetically by last name
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) {
        return lastNameCompare;
      }

      // Then by first name
      return a.firstName.localeCompare(b.firstName);
    })
  );

  // Total approved fine pot
  const approvedTotalFines = $derived(
    fines.filter(f => f.status === "approved").reduce((sum, f) => sum + (f.totalFine || 0), 0)
  );

  const approvedTotalHours = $derived(
    dugnad.filter(d => d.status === "approved").reduce((sum, d) => sum + (d.hours || 0), 0)
  );

  const approvedTotalPoints = $derived(
    dugnad.filter(d => d.status === "approved").reduce((sum, d) => sum + (d.points || 0), 0)
  );

  // Admin reversed Club Duty leaderboard
  // Shows who has done the least dugnad / has greatest remaining duty obligation
  // Uses exact same underlying data and calculation logic as regular Club Duty leaderboard
  const dutyEligiblePersons = $derived(() => {
    const approvedDugnad = dugnad.filter(d => d.status === "approved");
    return persons.filter(p => {
      // Explicitly exempt players are excluded from the reversed leaderboard.
      if (p.exemptFromDutyReverse) return false;
      // Regular players are always eligible
      if (p.type === "player") return true;
      // Admin is included as player if admin has person data & dugnad points/records in the dataset
      const hasDugnadPoints = approvedDugnad.some(d => d.playerId === p.id && (d.points || 0) > 0);
      const hasDugnadRecord = dugnad.some(d => d.playerId === p.id);
      const isAdminRole = (p.role && p.role.toLowerCase().includes("admin")) || (p.firstName && p.firstName.toLowerCase().includes("admin"));
      return hasDugnadPoints || hasDugnadRecord || isAdminRole;
    });
  });

  const adminDutyLeaderboard = $derived(() => {
    const approvedDugnad = dugnad.filter(d => d.status === "approved");
    return dutyEligiblePersons().map(p => {
      const pDugnad = approvedDugnad.filter(d => d.playerId === p.id);
      const totalHours = pDugnad.reduce((sum, d) => sum + (d.hours || 0), 0);
      const totalPoints = pDugnad.reduce((sum, d) => sum + (d.points || 0), 0);
      const count = pDugnad.length;
      return {
        person: p,
        displayName: getAdminFullName(p),
        totalHours,
        totalPoints,
        count
      };
    }).sort((a, b) => a.totalPoints - b.totalPoints || a.totalHours - b.totalHours || a.displayName.localeCompare(b.displayName));
  });

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
  let editFineStatus = $state<"approved" | "pending" | "rejected">("approved");
  let editFineComment = $state("");
  let isSavingFine = $state(false);

  // Edit Dugnad Entry Modal
  let editingDugnad = $state<DugnadEntry | null>(null);
  let editDugnadPlayerId = $state("");
  let editDugnadPoints = $state<number>(0);
  let editDugnadActivityType = $state<string>("Club Task");
  let editDugnadStatus = $state<"approved" | "pending" | "rejected">("approved");
  let editDugnadComment = $state("");
  let isSavingDugnad = $state(false);

  // Edit Person Modal
  let editingPerson = $state<Person | null>(null);
  let editPersonFirstName = $state("");
  let editPersonLastName = $state("");
  let editPersonType = $state<"player" | "coach">("player");
  let editPersonRole = $state("Player");
  let editPersonNumber = $state<number | undefined>(undefined);
  let editPersonFineSum = $state<number>(0);
  let editPersonDutyPoints = $state<number>(0);
  let editPersonExemptFromDutyReverse = $state<boolean>(false);

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
  let newDugnadActpointsPer = $state<number>(10);
  let newDugnadActPointsType = $state<"perHour" | "fixed">("perHour");

  let editingDugnadActivity = $state<DugnadActivity | null>(null);
  let editDugnadActTitle = $state("");
  let editDugnadActDefaultHours = $state<number>(2.0);
  let editDugnadActpointsPer = $state<number>(10);
  let editDugnadActPointsType = $state<"perHour" | "fixed">("perHour");

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
    editFineStatus = fine.status || "approved";
    editFineComment = fine.comment || "";
  }

  async function saveEditedFine() {
    if (!editingFine) return;

    isSavingFine = true;
    try {
      const person = persons.find(p => p.id === editFinePlayerId);
      const pName = person ? getAdminFullName(person) : editingFine.playerName;

      await onUpdateFine(editingFine.id, {
        playerId: editFinePlayerId,
        playerName: pName,
        totalFine: Number(editFineAmount),
        eventContext: editFineEventContext,
        status: editFineStatus,
        comment: editFineComment.trim()
      });

      notify("Fine record updated successfully.");
      editingFine = null;
    } catch (err: any) {
      console.error("[AdminDashboard] Error saving fine:", err);
      notify("Kunne ikke lagre bot: " + (err?.message || "Ukjent feil"), "error");
    } finally {
      isSavingFine = false;
    }
  }

  function openEditDugnad(entry: DugnadEntry) {
    editingDugnad = entry;
    editDugnadPlayerId = entry.playerId;
    editDugnadPoints = entry.points;
    editDugnadActivityType = entry.activityType || "Club Task";
    editDugnadStatus = entry.status || "approved";
    editDugnadComment = entry.comment || "";
  }

  async function saveEditedDugnad() {
    if (!editingDugnad) return;

    isSavingDugnad = true;
    try {
      const person = persons.find(p => p.id === editDugnadPlayerId);
      const pName = person ? getAdminFullName(person) : editingDugnad.playerName;
      const pts = Number(editDugnadPoints) || 0;
      const rate = settings.hourlyPointsRate || 10;
      const hrs = Number((pts / rate).toFixed(2));

      await onUpdateDugnad(editingDugnad.id, {
        playerId: editDugnadPlayerId,
        playerName: pName,
        points: pts,
        hours: hrs,
        dutyPoints: pts,
        dutyHours: hrs,
        activityType: editDugnadActivityType,
        status: editDugnadStatus,
        comment: editDugnadComment.trim()
      });

      notify("Club duty record updated successfully.");
      editingDugnad = null;
    } catch (err: any) {
      console.error("[AdminDashboard] Error saving duty record:", err);
      notify("Kunne ikke lagre dugnad: " + (err?.message || "Ukjent feil"), "error");
    } finally {
      isSavingDugnad = false;
    }
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
    editPersonDutyPoints = pDug.reduce((sum, d) => sum + (d.points || 0), 0);
    editPersonExemptFromDutyReverse = Boolean(person.exemptFromDutyReverse);
  }

  let isSavingPerson = $state(false);

  async function saveEditedPerson() {
    if (!editingPerson || !editPersonFirstName.trim()) return;

    isSavingPerson = true;
    const personId = editingPerson.id;
    const numVal = editPersonNumber !== undefined && String(editPersonNumber).trim() !== "" ? Number(editPersonNumber) : undefined;

    console.log("[AdminDashboard] saveEditedPerson saving player:", personId, {
      firstName: editPersonFirstName.trim(),
      lastName: editPersonLastName.trim(),
      type: editPersonType,
      role: editPersonRole.trim(),
      number: numVal
    });

    try {
      await onUpdatePerson(personId, {
        firstName: editPersonFirstName.trim(),
        lastName: editPersonLastName.trim(),
        type: editPersonType,
        role: editPersonRole.trim(),
        number: numVal,
        exemptFromDutyReverse: editPersonExemptFromDutyReverse
      });

      const targetFine = Number(editPersonFineSum) || 0;
      const rate = settings.hourlyPointsRate || 10;
      const targetDuty = editPersonType === 'player' ? ((Number(editPersonDutyPoints) || 0) / rate) : undefined;

      if (onAdjustPersonTotals) {
        await onAdjustPersonTotals(personId, targetFine, targetDuty);
      } else {
        await h4aStore.setPersonTotals(personId, targetFine, targetDuty);
      }

      notify("Spilleren og ledertavlen ble oppdatert!");
      editingPerson = null;
    } catch (err: any) {
      console.error("[AdminDashboard] Error saving player:", err);
      notify("Kunne ikke lagre spiller: " + (err?.message || "Ukjent feil"), "error");
    } finally {
      isSavingPerson = false;
    }
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
    editDugnadActpointsPer = act.pointsPer;
    editDugnadActPointsType = act.pointsType;
  }

  function handleAddDugnadActivitySubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!newDugnadActTitle.trim()) return;

    onAddDugnadActivity?.({
      title: newDugnadActTitle.trim(),
      defaultHours: newDugnadActPointsType === "fixed" ? 0 : (Number(newDugnadActDefaultHours) || 1),
      pointsPer: Number(newDugnadActpointsPer) || 10,
      pointsType: newDugnadActPointsType
    });

    notify(`Added duty activity "${newDugnadActTitle.trim()}"`);
    newDugnadActTitle = "";
    newDugnadActDefaultHours = 2.0;
    newDugnadActpointsPer = 10;
    newDugnadActPointsType = "perHour";
    isAddDugnadActivityOpen = false;
  }

  function saveEditedDugnadActivity() {
    if (!editingDugnadActivity || !editDugnadActTitle.trim()) return;

    onUpdateDugnadActivity?.(editingDugnadActivity.id, {
      title: editDugnadActTitle.trim(),
      defaultHours: editDugnadActPointsType === "fixed" ? 0 : (Number(editDugnadActDefaultHours) || 1),
      pointsPer: Number(editDugnadActpointsPer) || 10,
      pointsType: editDugnadActPointsType
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
        ? "Fine pot and penalty leaderboard are now PUBLISHED to team members."
        : "Fine pot is now HIDDEN from public view."
    );
  }
</script>

<div class="space-y-6">
  <!-- Toast / Notification Banner -->
  {#if bannerMessage}
    <div class="p-4 rounded-xl border flex items-center justify-between gap-3 shadow-md {bannerMessage.type === 'success' ? 'bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] border-[var(--ntnui-green)]' : 'bg-[var(--ntnui-red)] text-white border-[var(--ntnui-red)]'}">
      <div class="flex items-center gap-2.5 text-xs sm:text-sm font-semibold">
        {#if bannerMessage.type === 'success'}
          <CheckCircle2 class="w-4 h-4 text-[var(--color-text)] shrink-0" />
        {:else}
          <AlertCircle class="w-4 h-4 text-[var(--color-text)] shrink-0" />
        {/if}
        <span>{bannerMessage.text}</span>
      </div>
      <button type="button" onclick={() => bannerMessage = null} class="text-[var(--color-text)] hover:text-white cursor-pointer">
        <X class="w-4 h-4" />
      </button>
    </div>
  {/if}

  {#if !isUnlocked}
    <!-- Admin Access Key Gate (URL key or manual fallback entry) -->
    <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-text)]/15 p-6 sm:p-8 max-w-md mx-auto text-center space-y-5">
      <div class="w-14 h-14 mx-auto rounded-2xl bg-[var(--ntnui-green)]/10 text-[var(--ntnui-green)] flex items-center justify-center border border-[var(--ntnui-green)]/20 shadow-inner">
        <Lock class="w-7 h-7" />
      </div>

      <div>
        <h2 class="text-xl font-bold text-[var(--color-text)] tracking-tight">
          Admin-adgang kreves
        </h2>
        <p class="text-xs sm:text-sm text-[var(--color-text-muted)] mt-1.5 leading-relaxed">
          Oppgi din <strong>ADMIN_ACCESS_KEY</strong> for å låse opp administrasjonspanelet, eller åpne via din admin-URL (<code class="text-[var(--ntnui-green)] bg-[var(--ntnui-green)]/10 px-1.5 py-0.5 rounded font-mono text-xs">/admin?key=...</code>).
        </p>
      </div>

      <form onsubmit={handleAdminLogin} class="space-y-4 text-left">
        <div>
          <label for="admin-key-input" class="block text-xs font-bold text-[var(--color-text)] mb-1.5">
            Admin Access Key
          </label>
          <div class="relative">
            <input
              id="admin-key-input"
              type={showPassword ? "text" : "password"}
              bind:value={adminKeyInput}
              required
              placeholder="Skriv inn din ADMIN_ACCESS_KEY..."
              class="w-full px-3.5 py-2.5 rounded-xl border border-[var(--color-text)]/15 focus:outline-none focus:ring-2 focus:ring-[var(--ntnui-green)] text-sm font-mono pr-10"
            />
            <button
              type="button"
              onclick={() => showPassword = !showPassword}
              class="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
              title={showPassword ? "Skjul" : "Vis"}
            >
              <Eye class="w-4 h-4" />
            </button>
          </div>
        </div>

        {#if authError}
          <div class="p-3 rounded-xl bg-[var(--ntnui-red)]/10 border border-[var(--ntnui-red)]/30 text-[var(--ntnui-red)] text-xs font-medium flex items-start gap-2">
            <AlertCircle class="w-4 h-4 shrink-0 mt-0.5 text-[var(--ntnui-red)]" />
            <span>{authError}</span>
          </div>
        {/if}

        <button
          type="submit"
          disabled={isLoggingIn || !adminKeyInput.trim()}
          class="w-full py-2.5 bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 disabled:opacity-50 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2"
        >
          {#if isLoggingIn}
            <RefreshCw class="w-4 h-4 animate-spin" />
            <span>Verifiserer nøkkel...</span>
          {:else}
            <Unlock class="w-4 h-4" />
            <span>Lås opp Admin-panelet</span>
          {/if}
        </button>
      </form>

      {#if onExitAdmin}
        <div class="pt-2 border-t border-[var(--color-text)]/10">
          <button
            type="button"
            onclick={onExitAdmin}
            class="w-full py-2 text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <LogOut class="w-3.5 h-3.5" />
            <span>Tilbake til hovedportalen</span>
          </button>
        </div>
      {/if}

      <div class="pt-2 border-t border-[var(--color-text)]/10 text-[11px] text-[var(--color-text-muted)] text-center">
        Secured with separate VITE_ADMIN_ACCESS_KEY
      </div>
    </div>
  {:else}
    <!-- Authenticated Admin Header Banner -->
    <div class="bg-[var(--ntnui-red)] shadow-sm text-[var(--ntnui-black-dark)] rounded-2xl p-5 sm:p-6 shadow-md border border-[var(--ntnui-black-dark)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-xs uppercase font-extrabold tracking-wider text-[var(--color-text)]">
            {settings?.teamName || 'H4A'} {settings?.season || '26/27'} Admin Console
          </span>
        </div>
        <h2 class="text-lg sm:text-xl font-bold text-[var(--color-text)] mt-1">
          Team Management HQ
        </h2>
        <div class="text-xs text-[var(--ntnui-red)] mt-1 flex items-center gap-2 flex-wrap">
          <span class="text-[var(--color-text)] font-medium">Access granted via the admin-key</span>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-wrap">

        <!-- Exit / Sign Out Admin Button -->
        <button
          type="button"
          onclick={handleExitAdmin}
          class="px-3.5 py-2 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface)]/80 text-[var(--color-text)] border border-[var(--color-border-strong)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          title="Sign out of admin mode and return to main site"
        >
          <LogOut class="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>

    <!-- Admin Navigation Tabs -->
    <div class="bg-[var(--color-surface)] p-1.5 rounded-2xl shadow-xs border border-[var(--color-border-strong)] flex items-center gap-1 overflow-x-auto text-xs sm:text-sm font-bold">

      <button
        type="button"
        onclick={() => adminTab = "pending"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 flex-1 min-w-fit {adminTab === 'pending'
          ? 'bg-[var(--ntnui-yellow)] text-[var(--ntnui-black-dark)] shadow-xs'
          : 'text-[var(--color-text)] hover:bg-[var(--ntnui-yellow)]/15'}"
      >
        <span>Pending Queue</span>
        {#if pendingTotalCount > 0}
          <span class="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--ntnui-red)] text-white">
            {pendingTotalCount}
          </span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => adminTab = "roster"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 flex-1 min-w-fit {adminTab === 'roster'
          ? 'bg-[var(--ntnui-yellow)] text-[var(--ntnui-black-dark)] shadow-xs'
          : 'text-[var(--color-text)] hover:text-[var(--color-text)] hover:bg-[var(--ntnui-yellow)]/15'}"
      >
        <span>Team Roster</span>
      </button>

      <button
        type="button"
        onclick={() => adminTab = "rules"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 flex-1 min-w-fit {adminTab === 'rules'
          ? 'bg-[var(--ntnui-yellow)] text-[var(--ntnui-black-dark)] shadow-xs'
          : 'text-[var(--color-text)] hover:text-[var(--color-text)] hover:bg-[var(--ntnui-yellow)]/15'}"
      >
        <span>Fine Rules</span>
      </button>

      <button
        type="button"
        onclick={() => adminTab = "dugnad_rates"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 flex-1 min-w-fit {adminTab === 'dugnad_rates'
          ? 'bg-[var(--ntnui-yellow)] text-[var(--ntnui-black-dark)] shadow-xs'
          : 'text-[var(--color-text)] hover:text-[var(--color-text)] hover:bg-[var(--ntnui-yellow)]/15'}"
      >
        <span>Club Duties</span>
      </button>

      <button
        type="button"
        onclick={() => adminTab = "duty_leaderboard"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 flex-1 min-w-fit {adminTab === 'duty_leaderboard'
          ? 'bg-[var(--ntnui-yellow)] text-[var(--ntnui-black-dark)] shadow-xs'
          : 'text-[var(--color-text)] hover:text-[var(--color-text)] hover:bg-[var(--ntnui-yellow)]/15'}"
      >
        <span>Due for Duty</span>
      </button>

      <button
        type="button"
        onclick={() => adminTab = "records"}
        class="px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 flex-1 min-w-fit {adminTab === 'records'
          ? 'bg-[var(--ntnui-yellow)] text-[var(--ntnui-black-dark)] shadow-xs'
          : 'text-[var(--color-text)] hover:text-[var(--color-text)] hover:bg-[var(--ntnui-yellow)]/15'}"
      >
        <span>Records</span>
      </button>

      <button
        type="button"
        onclick={() => adminTab = "settings"}
        class="w-11 shrink-0 px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 {adminTab === 'settings'
          ? 'bg-[var(--ntnui-yellow)] text-[var(--ntnui-black-dark)] shadow-xs'
          : 'text-[var(--color-text)] hover:bg-[var(--ntnui-yellow)]/15'}"
        aria-label="Settings"
      >
        <Settings class="w-4 h-4" />
      </button>

    </div>

    <!-- TAB 1: PENDING QUEUE -->
    {#if adminTab === "pending"}
      <div class="space-y-6">
        <!-- Pending Fines -->
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs shadow-xs border-1 border-[var(--color-border-strong)] overflow-hidden">
          <div class="p-4 bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] flex items-center justify-center">
            <div class="font-bold text-xs sm:text-sm flex items-center gap-2">
              <span>Pending Fine Reports ({pendingFines.length})</span>
            </div>
          </div>

          <div class="divide-y divide-[var(--color-text)]/10">
            {#if pendingFines.length === 0}
              <div class="p-8 text-center text-[var(--color-text-muted)] text-xs sm:text-sm">
                No pending fine submissions awaiting review.
              </div>
            {:else}
              {#each pendingFines as fine}
                {@const person = persons.find(p => p.id === fine.playerId)}
                <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--color-text)]/5">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-[var(--color-text)] text-sm">
                        {person ? getAdminFullName(person) : fine.playerName}
                      </span>
                      <span class="text-xs font-black text-[var(--ntnui-red)] bg-[var(--ntnui-red)]/10 px-2 py-0.5 rounded border border-[var(--ntnui-red)]/30">
                        {fine.totalFine} kr
                      </span>
                      <span class="text-[11px] font-semibold text-[var(--color-text-muted)] bg-[var(--color-text)]/5 px-2 py-0.5 rounded">
                        {fine.eventContext}
                      </span>
                    </div>

                    <div class="text-xs text-[var(--color-text-muted)] mt-1 font-medium">
                      {fine.ruleTitles.join(", ")}
                    </div>

                    {#if fine.comment}
                      <div class="text-xs text-[var(--color-text-muted)] italic mt-0.5">
                        "{fine.comment}"
                      </div>
                    {/if}

                    <div class="text-[11px] text-[var(--color-text-muted)] mt-1">
                      Reported by: {fine.reportedBy || 'Anonymous'} • {new Date(fine.date).toLocaleDateString()}
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onclick={() => openEditFine(fine)}
                      class="p-1.5 text-xs font-semibold rounded-lg bg-[var(--color-text)]/5 hover:bg-[var(--color-text)]/10 text-[var(--color-text)] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 class="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onclick={async () => {
                        await onRejectFine(fine.id);
                        notify("Fine submission rejected.");
                      }}
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--ntnui-red)]/10 hover:bg-[var(--ntnui-red)]/15 text-[var(--ntnui-red)] flex items-center gap-1 cursor-pointer"
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
                      class="px-4 py-1.5 text-xs font-bold rounded-lg bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
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
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs shadow-xs border border-[var(--color-border-strong)] overflow-hidden">
          <div class="p-4 bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] flex items-center justify-center">
            <div class="font-bold text-xs sm:text-sm flex items-center gap-2">
              <span>Pending Club Duty Logs ({pendingDugnad.length})</span>
            </div>
          </div>

          <div class="divide-y divide-[var(--color-text)]/10">
            {#if pendingDugnad.length === 0}
              <div class="p-8 text-center text-[var(--color-text-muted)] text-xs sm:text-sm">
                No pending club duty entries awaiting review.
              </div>
            {:else}
              {#each pendingDugnad as dug}
                {@const person = persons.find(p => p.id === dug.playerId)}
                <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--color-text)]/5">
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-bold text-[var(--color-text)] text-sm">
                        {person ? getAdminFullName(person) : dug.playerName}
                      </span>
                      <span class="text-xs font-black text-[var(--ntnui-green)] bg-[var(--ntnui-green)]/10 px-2 py-0.5 rounded border border-[var(--ntnui-green)]/30">
                        {dug.points} pts
                      </span>
                      {#if dug.hadTravel}
                        <span class="text-[10px] font-bold text-[var(--ntnui-green)] bg-[var(--ntnui-green)]/10 px-2 py-0.5 rounded border border-[var(--ntnui-green)]/30 flex items-center gap-1">
                          <Navigation class="w-3 h-3" />
                          <span>Includes travel (+{dug.travelPoints || 0} pts)</span>
                        </span>
                      {/if}
                    </div>

                    <div class="text-xs font-semibold text-[var(--color-text)] mt-1">
                      {dug.activityType}
                    </div>

                    {#if dug.comment}
                      <div class="text-xs text-[var(--color-text-muted)] italic mt-0.5">
                        "{dug.comment}"
                      </div>
                    {/if}
                  </div>

                  <!-- Action Buttons -->
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onclick={() => openEditDugnad(dug)}
                      class="p-1.5 text-xs font-semibold rounded-lg bg-[var(--color-text)]/5 hover:bg-[var(--color-text)]/10 text-[var(--color-text)] flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 class="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onclick={async () => {
                        await onRejectDugnad(dug.id);
                        notify("Club duty entry rejected.");
                      }}
                      class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[var(--ntnui-red)]/10 hover:bg-[var(--ntnui-red)]/15 text-[var(--ntnui-red)] flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle class="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onclick={async () => {
                        await onApproveDugnad(dug.id);
                        notify(`Approved ${dug.points} pts for ${dug.playerName}`);
                      }}
                      class="px-4 py-1.5 text-xs font-bold rounded-lg bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 text-white flex items-center gap-1.5 cursor-pointer shadow-xs"
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
      <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs shadow-xs border-1 border-[var(--color-border-strong)] overflow-hidden">
        <div class="p-4 sm:p-5 bg-[var(--ntnui-green)] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-base sm:text-lg font-bold text-[var(--color-text)] tracking-tight">
              Team Roster & Individual Stats ({persons.length} )
            </h3>
            <p class="text-xs text-[var(--color-text)]/85">
              Manage your team's roster. Add or remove players and coaches, or change specific stats.
            </p>
          </div>

          <button
            type="button"
            onclick={() => isAddPersonOpen = true}
            class="px-3.5 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-strong)] hover:bg-[var(--color-surface)]/60 text-[var(--color-text)] font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <UserPlus class="w-4 h-4" />
            <span>Add Person</span>
          </button>
        </div>

        <!-- Add Person Form (Inline collapsible) -->
        {#if isAddPersonOpen}
          <form onsubmit={handleAddPersonSubmit} class="p-4 bg-[var(--color-text)]/5 border-y border-[var(--color-text)]/15">
            <div class="flex items-center justify-between">
              <h4 class="text-xs sm:text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
                <UserPlus class="w-4 h-4 text-[var(--ntnui-green)]" />
                <span>Add New Team Member / Staff</span>
              </h4>
              <button type="button" onclick={() => isAddPersonOpen = false} class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs sm:text-sm">
              <div>
                <label for="adm-first-name" class="block text-xs font-bold text-[var(--color-text)] mb-1">First Name *</label>
                <input
                  id="adm-first-name"
                  type="text"
                  placeholder="e.g. Henrik"
                  bind:value={newPersonFirstName}
                  required
                  class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] focus:ring-2 focus:ring-[var(--ntnui-green)]/30"
                />
              </div>

              <div>
                <label for="adm-last-name" class="block text-xs font-bold text-[var(--color-text)] mb-1">Last Name</label>
                <input
                  id="adm-last-name"
                  type="text"
                  placeholder="e.g. Hansen"
                  bind:value={newPersonLastName}
                  class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] focus:ring-2 focus:ring-[var(--ntnui-green)]/30"
                />
              </div>

              <div>
                <label for="adm-person-type" class="block text-xs font-bold text-[var(--color-text)] mb-1">Role Type</label>
                <select
                  id="adm-person-type"
                  bind:value={newPersonType}
                  class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-medium focus:ring-2 focus:ring-[var(--ntnui-green)]/30"
                >
                  <option value="player">Player</option>
                  <option value="coach">Coach / Staff</option>
                </select>
              </div>

              <div>
                <label for="adm-person-role" class="block text-xs font-bold text-[var(--color-text)] mb-1">Position / Title</label>
                <input
                  id="adm-person-role"
                  type="text"
                  placeholder="e.g. Setter"
                  bind:value={newPersonRole}
                  class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] focus:ring-2 focus:ring-[var(--ntnui-green)]/30"
                />
              </div>

              <div>
                <label for="adm-person-num" class="block text-xs font-bold text-[var(--color-text)] mb-1">Jersey #</label>
                <input
                  id="adm-person-num"
                  type="number"
                  placeholder="4"
                  bind:value={newPersonNumber}
                  class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] focus:ring-2 focus:ring-[var(--ntnui-green)]/30"
                />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onclick={() => isAddPersonOpen = false}
                class="px-3 py-1.5 rounded-lg border border-[var(--color-text)]/30 bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-text)]/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-1.5 rounded-lg bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Member
              </button>
            </div>
          </form>
        {/if}

        <!-- Persons Table -->
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs sm:text-sm">
            <thead class="bg-[var(--color-text)]/5 border-b border-[var(--color-text)]/15 text-[var(--color-text-subtle)] font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th class="p-3.5 pl-5">Full Name</th>
                <th class="p-3.5">Type</th>
                <th class="p-3.5">Position</th>
                <th class="p-3.5">Jersey</th>
                <th class="p-3.5">Fines Sum</th>
                <th class="p-3.5">Club Duty</th>
                <th class="p-3.5 pr-5">Actions</th>
              </tr>
            </thead>

            <tbody class="divide-y divide-[var(--color-text)]/10">
              {#each sortedPersons as p}
                {@const pFines = fines.filter(f => f.playerId === p.id && f.status === 'approved')}
                {@const pFineSum = pFines.reduce((sum, f) => sum + (f.totalFine || 0), 0)}
                {@const pDug = dugnad.filter(d => d.playerId === p.id && d.status === 'approved')}
                {@const pDugHours = pDug.reduce((sum, d) => sum + (d.hours || 0), 0)}
                {@const pDugPoints = pDug.reduce((sum, d) => sum + (d.points || 0), 0)}

                <tr class="hover:bg-[var(--color-text)]/5 transition-colors">

                  <td class="p-3.5 pl-5 font-bold text-[var(--color-text)]">
                    {getAdminFullName(p)}
                  </td>

                  <td class="p-3.5">
                    <div class="flex items-center">
                      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-text)]/10 text-[var(--color-text)]">
                        {p.type === 'coach' ? 'Coach' : 'Player'}
                      </span>
                    </div>
                  </td>

                  <td class="p-3.5">
                    <div class="flex items-center">
                      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-text)]/10 text-[var(--color-text)]">
                        {p.role || "Player"}
                      </span>
                    </div>
                  </td>

                  <td class="p-3.5 font-mono font-bold">
                    <div class="flex items-center">
                      <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-text)]/10 text-[var(--color-text)]">
                        {p.number !== undefined ? `#${p.number}` : "-"}
                      </span>
                    </div>
                  </td>

                  <td class="p-3.5">
                    <div class="flex flex-col items-start justify-center">
                      <span class="font-black text-[var(--color-text)]">
                        {pFineSum} kr
                      </span>
                      <span class="text-[11px] font-normal text-[var(--color-text-muted)]">
                        {pFines.length} fines
                      </span>
                    </div>
                  </td>

                  <td class="p-3.5">
                    {#if p.type === 'player'}
                      <div class="flex flex-col items-start justify-center">
                        <span class="font-black text-[var(--color-text)]">
                          {pDugPoints} pts
                        </span>
                        <span class="text-[11px] font-normal text-[var(--color-text-muted)]">
                          {pDug.length} {pDug.length === 1 ? 'duty' : 'duties'}
                        </span>
                      </div>
                    {:else}
                      <span class="text-[var(--color-text)] italic text-xs font-normal">
                        Excluded
                      </span>
                    {/if}
                  </td>

                  <td class="p-3.5 pr-5">
                    <div class="flex items-center justify-start gap-1.5">
                      <button
                        type="button"
                        onclick={() => openEditPerson(p)}
                        class="p-1.5 rounded-lg bg-[var(--color-text)]/5 hover:bg-[var(--color-text)]/10 text-[var(--color-text)] cursor-pointer flex items-center gap-1 text-xs font-semibold"
                        title="Edit person details, fines sum & duty points"
                      >
                        <Edit3 class="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onclick={() => {
                          if (confirm(`Are you sure you want to remove ${getAdminFullName(p)} from the roster?`)) {
                            onRemovePerson(p.id);
                            notify(`Removed ${getAdminFullName(p)} from roster`);
                          }
                        }}
                        class="p-1.5 rounded-lg bg-[var(--ntnui-red)]/10 hover:bg-[var(--ntnui-red)]/15 text-[var(--ntnui-red)] cursor-pointer"
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

    <!-- TAB: CLUB DUTY LOOSERBOARD -->
    {:else if adminTab === "duty_leaderboard"}
      <div class="space-y-6">

        <!-- Full Duty Table -->
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border-strong)] overflow-hidden">
          <div class="p-4 bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] flex items-center justify-center">
          <div class="text-lg sm:text-xl font-bold flex items-center justify-center gap-2">
            <span>Club Duty Looserboard</span>
          </div>
        </div>

          <div class="divide-y divide-[var(--color-text)]/10">
            {#each adminDutyLeaderboard() as item, idx}
              {@const lowestPoints = adminDutyLeaderboard()[0]?.totalPoints}

              <div class="p-3.5 sm:px-5 flex items-center justify-between hover:bg-[var(--color-text)]/5 transition-colors">
                <div class="flex items-center gap-3">
                  <span class="w-6 text-center font-bold text-xs text-[var(--color-text)]">
                    {item.totalPoints === lowestPoints ? '#1' : `#${idx + 1}`}
                  </span>

                  <div>
                    <div class="font-bold text-xs sm:text-sm flex items-center gap-1.5 {item.totalPoints === lowestPoints ? 'text-[var(--ntnui-red)]' : 'text-[var(--color-text)]'}">
                      <span>{item.displayName}</span>
                      {#if item.person.type === 'coach'}
                        <span class="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[var(--color-text)]/5 text-[var(--color-text)] border border-[var(--color-text)]/15">
                          Coach
                        </span>
                      {/if}
                    </div>
                    <div class="text-[11px] text-[var(--color-text-muted)]">
                      {item.person.role || "Player"} {item.person.number ? `• #${item.person.number}` : ""} • {item.count} {item.count === 1 ? 'dugnad' : 'dugnader'}
                    </div>
                  </div>
                </div>
                <div class="flex items-center gap-3">
                  <div class="text-right">
                    <div class="font-black text-xs sm:text-sm text-[var(--ntnui-green)]">
                      {item.totalPoints} pts
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

    <!-- TAB 3: FINE RULES & OCCASIONS -->
    {:else if adminTab === "rules"}
      <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs border-1 border-[var(--color-border-strong)] overflow-hidden">
        <div class="p-4 sm:p-5 bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 class="text-base sm:text-lg font-bold text-[var(--color-text)] tracking-tight">
              Fine Rules & Occasions  ({rules.length})
            </h3>
            <p class="text-xs text-[var(--color-text)]/85">
              Manage penalties. Each rule must have at least one occasion (Match, Practice, or Social) and an accompanying amount.
            </p>
          </div>

          <button
            type="button"
            onclick={() => isAddRuleOpen = true}
            class="px-3.5 py-2 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface)]/60 text-[var(--color-text)] font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
          >
            <Plus class="w-4 h-4 shrink-0" />
            <span>New Fine Rule</span>
          </button>
        </div>

        <!-- Add Rule Form -->
        {#if isAddRuleOpen}
          <form onsubmit={handleAddRuleSubmit} class="p-4 bg-[var(--color-text)]/5 border-y border-[var(--color-text)]/15">
            <div class="flex items-center justify-between">
              <h4 class="text-xs sm:text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
                <Plus class="w-4 h-4 text-[var(--ntnui-green)]" />
                <span>Add New Fine Rule</span>
              </h4>
              <button type="button" onclick={() => isAddRuleOpen = false} class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
                <X class="w-4 h-4" />
              </button>
            </div>

            <div class="space-y-3 text-xs sm:text-sm">
              <div>
                <label for="adm-rule-title" class="block text-xs font-bold text-[var(--color-text)] mb-1">Rule Title *</label>
                <input
                  id="adm-rule-title"
                  type="text"
                  placeholder="e.g. Late for warm-up / team call-up"
                  bind:value={newRuleTitle}
                  required
                  class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] focus:ring-2 focus:ring-[var(--ntnui-green)]/30 font-medium"
                />
              </div>

              <!-- Occasion-Specific Amounts (Mandatory) -->
              <div class="p-3.5 bg-[var(--color-surface)] rounded-xl border border-[var(--color-text)]/15 space-y-2">
                <div>
                  <span class="block text-xs font-bold text-[var(--color-text)]">
                    Occasion Amounts *
                  </span>
                  <span class="block text-[11px] text-[var(--color-text-muted)] italic mt-0.5">
                    * Leave empty or 0 if this rule does not apply to that occasion.
                  </span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div>
                    <label for="adm-match-rate" class="block text-[11px] font-bold text-[var(--color-text)] mb-1">Match (kr)</label>
                    <input
                      id="adm-match-rate"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="e.g. 50"
                      bind:value={newRuleFineMatch}
                      class="w-full px-2.5 py-1.5 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-md text-[var(--color-text)] text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label for="adm-practice-rate" class="block text-[11px] font-bold text-[var(--color-text)] mb-1">Practice (kr)</label>
                    <input
                      id="adm-practice-rate"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="e.g. 50"
                      bind:value={newRuleFinePractice}
                      class="w-full px-2.5 py-1.5 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-md text-[var(--color-text)] text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label for="adm-social-rate" class="block text-[11px] font-bold text-[var(--color-text)] mb-1">Social (kr)</label>
                    <input
                      id="adm-social-rate"
                      type="number"
                      step="1"
                      min="0"
                      placeholder="e.g. 50"
                      bind:value={newRuleFineSocial}
                      class="w-full px-2.5 py-1.5 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-md text-[var(--color-text)] text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label for="adm-rule-desc" class="block text-xs font-bold text-[var(--color-text)] mb-1">Description (optional)</label>
                <input
                  id="adm-rule-desc"
                  type="text"
                  placeholder="Explanation of when this fine is applied"
                  bind:value={newRuleDescription}
                  class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] focus:ring-2 focus:ring-[var(--ntnui-green)]/30"
                />
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onclick={() => isAddRuleOpen = false}
                class="px-3 py-1.5 rounded-lg border border-[var(--color-text)]/30 bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-text)]/5 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-4 py-1.5 rounded-lg bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Rule
              </button>
            </div>
          </form>
        {/if}

        <!-- Rules List -->
        <div class="divide-y divide-[var(--color-text)]/10">
          {#each sortedRules as rule}
            <div class="p-4 sm:px-5 flex items-center justify-between gap-3 hover:bg-[var(--color-text)]/5">
              <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-bold text-[var(--color-text)] text-xs sm:text-sm">
                    {rule.title}
                  </span>
                </div>
                {#if rule.description}
                  <div class="text-xs text-[var(--color-text)]/85 mt-0.5">
                    {rule.description}
                  </div>
                {/if}
                <div class="flex items-center gap-2 mt-1.5 text-[11px] font-medium flex-wrap">
                  <span class="text-[var(--color-text-muted)] font-semibold">Occasions:</span>
                  {#if rule.fineMatch != null && rule.fineMatch > 0}
                    <span class="px-2 py-0.5 bg-[var(--ntnui-green)]/10 text-[var(--ntnui-green)] rounded border border-[var(--ntnui-green)]/30 font-bold">
                      Match: {rule.fineMatch} kr
                    </span>
                  {/if}
                  {#if rule.finePractice != null && rule.finePractice > 0}
                    <span class="px-2 py-0.5 bg-[var(--ntnui-green)]/10 text-[var(--ntnui-green)] rounded border border-[var(--ntnui-green)]/30 font-bold">
                      Practice: {rule.finePractice} kr
                    </span>
                  {/if}
                  {#if rule.fineSocial != null && rule.fineSocial > 0}
                    <span class="px-2 py-0.5 bg-[var(--ntnui-green)]/10 text-[var(--ntnui-green)] rounded border border-[var(--ntnui-green)]/30 font-bold">
                      Social: {rule.fineSocial} kr
                    </span>
                  {/if}
                  {#if (rule.fineMatch == null || rule.fineMatch <= 0) && (rule.finePractice == null || rule.finePractice <= 0) && (rule.fineSocial == null || rule.fineSocial <= 0)}
                    <span class="px-2 py-0.5 bg-[var(--color-text)]/5 text-[var(--color-text)] rounded border border-[var(--color-text)]/15 font-bold">
                      Standard: {rule.fine || 0} kr
                    </span>
                  {/if}
                </div>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onclick={() => openEditRule(rule)}
                  class="p-1.5 rounded-lg bg-[var(--color-text)]/5 hover:bg-[var(--color-text)]/10 text-[var(--color-text)] cursor-pointer"
                  title="Edit rule"
                >
                  <Edit3 class="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onclick={() => {
                    if (confirm(`Are you sure you want to delete the fine rule "${rule.title}"?`)) {
                      onDeleteFineRule(rule.id);
                      notify(`Deleted rule "${rule.title}"`);
                    }
                  }}
                  class="p-1.5 rounded-lg bg-[var(--ntnui-red)]/10 hover:bg-[var(--ntnui-red)]/15 text-[var(--ntnui-red)] cursor-pointer"
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
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border-strong)] overflow-hidden">
          <div class="p-4 sm:p-5 bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 class="text-base sm:text-lg font-bold text-[var(--color-text)] tracking-tight flex items-center gap-2">
                <span>Club Duty Activities ({activeDugnadActivities.length})</span>
              </h3>
              <p class="text-xs text-[var(--color-text)]/85 mt-0.5">
                Manage club duties, standard durations, and points awarded.
              </p>
            </div>

            <button
              type="button"
              onclick={() => isAddDugnadActivityOpen = true}
              class="px-3.5 py-2 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface)]/60 text-[var(--color-text)] font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
            >
              <Plus class="w-4 h-4" />
              <span>Add Duty Activity</span>
            </button>
          </div>

          <!-- Add Dugnad Activity Form -->
          {#if isAddDugnadActivityOpen}
            <form onsubmit={handleAddDugnadActivitySubmit} class="p-4 bg-[var(--color-text)]/5 border-y border-[var(--color-text)]/15">
              <div class="flex items-center justify-between">
                <h4 class="text-xs sm:text-sm font-bold text-[var(--color-text)] flex items-center gap-2">
                  <Plus class="w-4 h-4 text-[var(--ntnui-green)]" />
                  <span>Add New Duty Activity & Rate</span>
                </h4>
                <button type="button" onclick={() => isAddDugnadActivityOpen = false} class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
                  <X class="w-4 h-4" />
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs sm:text-sm">
                <div class="sm:col-span-2">
                  <label for="new-act-title" class="block text-xs font-bold text-[var(--color-text)] mb-1">Activity Title *</label>
                  <input
                    id="new-act-title"
                    type="text"
                    placeholder="e.g. Hall Rigging & Net Setup"
                    bind:value={newDugnadActTitle}
                    required
                    class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] focus:ring-2 focus:ring-[var(--ntnui-green)]/30 font-medium"
                  />
                </div>

                <div>
                  <label for="new-act-type" class="block text-xs font-bold text-[var(--color-text)] mb-1">Point Type *</label>
                  <select
                    id="new-act-type"
                    bind:value={newDugnadActPointsType}
                    class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] focus:ring-2 focus:ring-[var(--ntnui-green)]/30 font-medium"
                  >
                    <option value="perHour">Per hour</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>

                {#if newDugnadActPointsType === "perHour"}
                <div>
                  <label for="new-act-hours" class="block text-xs font-bold text-[var(--color-text)] mb-1">Standard Duration (Hours)</label>
                  <input
                    id="new-act-hours"
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    bind:value={newDugnadActDefaultHours}
                    class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] focus:ring-2 focus:ring-[var(--ntnui-green)]/30 font-medium"
                  />
                </div>
                {/if}

                <div>
                  <label for="new-act-rate" class="block text-xs font-bold text-[var(--color-text)] mb-1">Points ({newDugnadActPointsType === "fixed" ? "fixed" : "per hour"}) *</label>
                  <input
                    id="new-act-rate"
                    type="number"
                    step="0.5"
                    min="1"
                    bind:value={newDugnadActpointsPer}
                    required
                    class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] focus:ring-2 focus:ring-[var(--ntnui-green)]/30 font-medium"
                  />
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onclick={() => isAddDugnadActivityOpen = false}
                  class="px-3 py-1.5 rounded-lg border border-[var(--color-text)]/30 bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-text)] hover:bg-[var(--color-text)]/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-4 py-1.5 rounded-lg bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Activity Rate
                </button>
              </div>
            </form>
          {/if}

          <!-- Activities Table -->
          <div class="divide-y divide-[var(--color-text)]/10">
            {#each activeDugnadActivities as act}
              <div class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--color-text)]/5">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-[var(--color-text)] text-xs sm:text-sm">
                      {act.title}
                    </span>
                    <span class="text-xs font-black text-[var(--ntnui-green)] bg-[var(--ntnui-green)]/10 px-2 py-0.5 rounded border border-[var(--ntnui-green)]/30">
                      {act.pointsPer} {act.pointsType === "fixed" ? "pts fixed" : "pts / hr"}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={() => openEditDugnadActivity(act)}
                    class="p-1.5 text-xs font-semibold rounded-lg bg-[var(--color-text)]/5 hover:bg-[var(--color-text)]/10 text-[var(--color-text)] flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onclick={() => {
                      if (confirm(`Are you sure you want to delete the club duty activity "${act.title}"?`)) {
                        onDeleteDugnadActivity?.(act.id);
                        notify(`Deleted activity "${act.title}"`);
                      }
                    }}
                    class="p-1.5 rounded-lg bg-[var(--ntnui-red)]/10 hover:bg-[var(--ntnui-red)]/15 text-[var(--ntnui-red)] cursor-pointer"
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
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border-strong)] overflow-hidden">
          <div class="p-4 bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] flex items-center justify-center">
            <div class="font-bold text-xs sm:text-sm flex items-center gap-2">
              <span>Approved Fines ({fines.filter(f => f.status === 'approved').length})</span>
            </div>
            <div class="text-xs text-[var(--ntnui-green)] font-bold">
              Total: {approvedTotalFines} kr
            </div>
          </div>

          <div class="divide-y divide-[var(--color-text)]/10 max-h-96 overflow-y-auto">
            {#each fines.filter(f => f.status === 'approved') as fine}
              {@const person = persons.find(p => p.id === fine.playerId)}
              <div class="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-[var(--color-text)]/5">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-[var(--color-text)] text-xs sm:text-sm">
                      {person ? getAdminFullName(person) : fine.playerName}
                    </span>
                    <span class="font-bold text-[var(--ntnui-green)] text-xs">
                      {fine.totalFine} kr
                    </span>
                  </div>
                  <div class="text-xs text-[var(--color-text-muted)]">
                    {fine.ruleTitles.join(", ")}
                  </div>
                  {#if fine.comment}
                    <div class="text-[11px] text-[var(--color-text-muted)] italic">
                      "{fine.comment}"
                    </div>
                  {/if}
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={() => openEditFine(fine)}
                    class="p-1.5 rounded-lg bg-[var(--color-text)]/5 hover:bg-[var(--color-text)]/10 text-[var(--color-text)] cursor-pointer"
                    title="Edit fine"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onclick={async () => {
                      if (confirm("Are you sure you want to delete this fine record?")) {
                        await onRejectFine(fine.id);
                        notify("Deleted fine record.");
                      }
                    }}
                    class="p-1.5 rounded-lg bg-[var(--ntnui-red)]/10 hover:bg-[var(--ntnui-red)]/15 text-[var(--ntnui-red)] cursor-pointer"
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
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border-strong)] overflow-hidden">
          <div class="p-4 bg-[var(--ntnui-green)] text-[var(--ntnui-black-dark)] flex items-center justify-center">
            <div class="font-bold text-xs sm:text-sm flex items-center gap-2">
              <span>Approved Club Duties ({dugnad.filter(d => d.status === 'approved').length})</span>
            </div>
            <div class="text-xs text-[var(--ntnui-green)] font-bold">
              Total: {approvedTotalPoints} pts
            </div>
          </div>

          <div class="divide-y divide-[var(--color-text)]/10 max-h-96 overflow-y-auto">
            {#each dugnad.filter(d => d.status === 'approved') as entry}
              {@const person = persons.find(p => p.id === entry.playerId)}
              <div class="p-3.5 sm:px-5 flex items-center justify-between gap-3 hover:bg-[var(--color-text)]/5">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-[var(--color-text)] text-xs sm:text-sm">
                      {person ? getAdminFullName(person) : entry.playerName}
                    </span>
                    <span class="font-bold text-[var(--ntnui-green)] text-xs">
                      {entry.points} pts
                    </span>
                    {#if entry.hadTravel}
                      <span class="text-[10px] font-bold text-[var(--ntnui-yellow)] bg-[var(--ntnui-yellow)]/10 px-1.5 py-0.2 rounded border border-[var(--ntnui-yellow)]/50">
                        +{entry.travelPoints || 0} pts travel
                      </span>
                    {/if}
                  </div>
                  <div class="text-xs text-[var(--color-text-muted)]">
                    {entry.activityType}
                  </div>
                  {#if entry.comment}
                    <div class="text-[11px] text-[var(--color-text-muted)] italic">
                      "{entry.comment}"
                    </div>
                  {/if}
                </div>

                <div class="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onclick={() => openEditDugnad(entry)}
                    class="p-1.5 rounded-lg bg-[var(--color-text)]/5 hover:bg-[var(--color-text)]/10 text-[var(--color-text)] cursor-pointer"
                    title="Edit duty record"
                  >
                    <Edit3 class="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onclick={async () => {
                      if (confirm("Are you sure you want to delete this duty record?")) {
                        await onRejectDugnad(entry.id);
                        notify("Deleted duty record.");
                      }
                    }}
                    class="p-1.5 rounded-lg bg-[var(--ntnui-red)]/10 hover:bg-[var(--ntnui-red)]/15 text-[var(--ntnui-red)] cursor-pointer"
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
      <div class="space-y-6">

        <!-- SETTINGS -->
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border-strong)] p-6 space-y-6 text-center">
          <div>
            <h3 class="text-base sm:text-lg font-bold text-[var(--color-text)] tracking-tight">
              Portal & Season Configuration
            </h3>
            <p class="text-xs text-[var(--color-text)]/85">
              Manage privacy, publication switches, and team details. Changes to Team Name and Season propagate immediately across the entire site.
            </p>
          </div>

          <!-- Publication Big Box -->
            <div class="p-5 rounded-2xl border-2 {settings.finePotPublished ? 'border-[var(--ntnui-green)] bg-[var(--ntnui-green)]/10' : 'border-[var(--ntnui-yellow)] bg-[var(--ntnui-yellow)]/10'} space-y-4">
              <div>
                <div class="text-xs font-bold uppercase tracking-wider {settings.finePotPublished ? 'text-[var(--ntnui-green)]' : 'text-[var(--color-text)]'}">
                  Penalty Pot & Leaderboards Privacy
                </div>

                <div class="text-base font-black text-[var(--color-text)] mt-0.5">
                  {#if settings.finePotPublished}
                    Fine Pot is currently PUBLISHED to all team members
                  {:else}
                    Fine Pot is currently HIDDEN (displays "??? kr")
                  {/if}
                </div>

                <p class="text-xs text-[var(--color-text)]/85 mt-1">
                  When hidden, the total fine pot in the header and the penalty leaderboard are concealed from public view.<br>Toggle on when you are ready to reveal the results before a preparty.
                </p>

                <button
                  type="button"
                  onclick={toggleFinePotPublication}
                  class="mt-3 px-5 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all shadow-xs cursor-pointer {settings.finePotPublished ? 'bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 text-white' : 'bg-[var(--ntnui-yellow)] hover:bg-[var(--ntnui-yellow)]/90 text-[var(--ntnui-black-dark)]'}"
                >
                  {#if settings.finePotPublished}
                    <span class="flex items-center gap-1.5">
                      <Unlock class="w-4 h-4" />
                      <span>Switch to Hidden</span>
                    </span>
                  {:else}
                    <span class="flex items-center gap-1.5">
                      <Lock class="w-4 h-4" />
                      <span>Publish Leaderboards</span>
                    </span>
                  {/if}
                </button>
              </div>
            </div>

          <!-- Season Settings Form -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--color-text)]/15">
            <div>
              <label for="set-team-name" class="block text-xs font-bold text-[var(--color-text)] mb-1">
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
                class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-xl text-[var(--color-text)] font-bold text-xs sm:text-sm"
              />
            </div>

            <div>
              <label for="set-team-season" class="block text-xs font-bold text-[var(--color-text)] mb-1">
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
                class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-xl text-[var(--color-text)] font-bold text-xs sm:text-sm"
              />
            </div>
          </div>

          <!-- Reset / Danger Zone -->
            <div class="pt-6 border-t border-[var(--color-text)]/15">
              <div>
                <div class="text-xs font-bold text-[var(--color-text)]">
                  Reset Sample Data
                </div>

                <div class="text-[11px] text-[var(--color-text)]/85">
                  Restore initial team roster, fine rules, and sample entries.
                </div>

                <button
                  type="button"
                  onclick={() => {
                    if (confirm("Are you sure you want to reset all data to the default sample data? This will overwrite the current team data.")) {
                      onResetData();
                      notify("Reset all data to defaults.");
                    }
                  }}
                  class="mt-3 px-3.5 py-1.5 rounded-lg border border-[var(--color-text)]/30 bg-[var(--color-surface)] hover:bg-[var(--color-text)]/5 text-xs font-semibold text-[var(--color-text)] inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw class="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>
              </div>
            </div>
        </div>

        <!-- BACKUP & DATA -->
        <div class="space-y-6">
          <!-- Intro Banner -->
          <div class="bg-[var(--ntnui-green)] rounded-2xl shadow-xs border border-[var(--ntnui-black-dark)] p-6 space-y-2 text-center">
            <div class="flex items-center justify-center">
              <div>
                <h3 class="text-base sm:text-lg font-bold text-[var(--color-text)] tracking-tight">
                  Data Storage & Backup
                </h3>
                <p class="text-xs text-[var(--color-text)]">
                  Export complete team data to a portable JSON backup, or restore and update the database from a previously exported backup.
                </p>
              </div>
            </div>
          </div>

          <!-- 2-Column Action Cards: Export and Import -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

            <!-- CARD 1: EXPORT -->
            <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border-strong)] p-6 flex flex-col justify-between space-y-6">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--ntnui-green)]/10 text-[var(--ntnui-green)] border border-[var(--ntnui-green)]/30">
                    <Download class="w-3.5 h-3.5" />
                    <span>Offline Backup</span>
                  </span>
                  <span class="text-xs text-[var(--color-text-muted)] font-medium">Portable JSON Format</span>
                </div>

                <div>
                  <h4 class="text-base font-bold text-[var(--color-text)]">
                    Export Team Data
                  </h4>
                  <p class="text-xs text-[var(--color-text)]/85 mt-1 leading-relaxed">
                    Download a complete JSON file containing all players, positions, jerseys, approved and pending fines, club duties, fine rules, and season settings. The file can be stored as a backup or saved as <code class="bg-[var(--color-text)]/5 px-1 py-0.5 rounded text-[var(--color-text)] font-mono text-[11px]">data/team-data.json</code> in the repository.
                  </p>
                </div>

                <!-- Data scope counts -->
                <div class="grid grid-cols-4 gap-2.5 p-3.5 bg-[var(--color-text)]/5 rounded-xl border border-[var(--color-text)]/10 text-center">
                  <div>
                    <div class="text-base sm:text-lg font-black text-[var(--color-text)]">
                      {persons.filter(p => p.type === "player").length}
                    </div>
                    <div class="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">Players</div>
                  </div>

                  <div>
                    <div class="text-base sm:text-lg font-black text-[var(--color-text)]">
                      {persons.filter(p => p.type === "coach").length}
                    </div>
                    <div class="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">Coaches</div>
                  </div>

                  <div>
                    <div class="text-base sm:text-lg font-black text-[var(--ntnui-green)]">
                      {fines.length}
                    </div>
                    <div class="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">
                      Fines<br>({approvedTotalFines} kr)
                    </div>
                  </div>

                  <div>
                    <div class="text-base sm:text-lg font-black text-[var(--ntnui-green)]">
                      {dugnad.length}
                    </div>
                    <div class="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">
                      Club Duties<br> ({approvedTotalHours.toFixed(1)} hours)
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onclick={handleExportTeamData}
                disabled={isExporting}
                class="w-full py-3 px-4 rounded-xl bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {#if isExporting}
                  <RefreshCw class="w-4 h-4 animate-spin" />
                  <span>Genererer eksport...</span>
                {:else}
                  <Download class="w-4 h-4" />
                  <span>Last ned team-data.json</span>
                {/if}
              </button>
            </div>

            <!-- CARD 2: IMPORT -->
            <div class="bg-[var(--color-surface)] rounded-2xl shadow-xs border border-[var(--color-border-strong)] p-6 flex flex-col justify-between space-y-6">
              <div class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-[var(--ntnui-green)]/10 text-[var(--ntnui-green)] border border-[var(--ntnui-green)]/30">
                    <Upload class="w-3.5 h-3.5" />
                    <span>Import / Restore</span>
                  </span>
                  <span class="text-xs text-[var(--color-text-muted)] font-medium">Note: Validate Before Writing</span>
                </div>

                <div>
                  <h4 class="text-base font-bold text-[var(--color-text)]">
                    Import Team Data
                  </h4>
                  <p class="text-xs text-[var(--color-text)]/85 mt-1 leading-relaxed">
                    Upload a previously exported JSON file (e.g. <code class="bg-[var(--color-text)]/5 px-1 py-0.5 rounded text-[var(--color-text)] font-mono text-[11px]">team-data.json</code>). The file will be validated before you can choose to merge or replace the existing data.
                  </p>
                </div>

                <!-- Upload Drag & Drop Box -->
                <label
                  for="team-data-file-input"
                  class="border-2 border-dashed border-[var(--color-text)]/30 hover:border-[var(--ntnui-green)] bg-[var(--color-text)]/5 hover:bg-[var(--ntnui-green)]/10 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all"
                >
                  <FileUp class="w-7 h-7 text-[var(--color-text-muted)] mb-2" />
                  <span class="text-xs font-bold text-[var(--color-text)]">
                    Click to select <span class="text-[var(--ntnui-green)]">team-data.json</span>
                  </span>
                  <span class="text-[11px] text-[var(--color-text-muted)] mt-0.5">
                    or drag and drop the file here
                  </span>

                  <input
                    id="team-data-file-input"
                    bind:this={fileInputRef}
                    type="file"
                    accept=".json,application/json"
                    class="hidden"
                    onchange={handleFileInputChange}
                  />
                </label>

                {#if importErrors.length > 0}
                  <div class="p-3.5 rounded-xl bg-[var(--ntnui-red)]/10 border border-[var(--ntnui-red)]/30 text-[var(--ntnui-red)] text-xs space-y-1">
                    <div class="font-bold flex items-center gap-1.5">
                      <AlertCircle class="w-4 h-4 text-[var(--ntnui-red)] shrink-0" />
                      <span>Validation Error:</span>
                    </div>

                    <ul class="list-disc list-inside space-y-0.5 text-[11px]">
                      {#each importErrors as err}
                        <li>{err}</li>
                      {/each}
                    </ul>
                  </div>
                {/if}
              </div>

              <div class="pt-2">
                <div class="text-[11px] text-[var(--color-text-muted)] text-center flex items-center justify-center gap-1">
                  <span>No data is deleted automatically without your explicit confirmation</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    {/if}

    <!-- MODAL: Inspect & Confirm Import -->
    {#if isImportModalOpen && pendingBackup}
      {@const totalFinesInFile = pendingBackup.players?.reduce((sum, p) => sum + (p.fines?.length || 0), 0) || 0}
      {@const totalDugnadInFile = pendingBackup.players?.reduce((sum, p) => sum + (p.dugnad?.length || 0), 0) || 0}

      <div class="fixed inset-0 z-50 bg-[var(--ntnui-black-dark)]/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-5 border border-[var(--color-text)]/15">

          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-[var(--ntnui-green)]/10 text-[var(--ntnui-green)] flex items-center justify-center">
                <Upload class="w-5 h-5" />
              </div>

              <div>
                <h4 class="font-bold text-base text-[var(--color-text)]">
                  Confirm Team Data Import
                </h4>
                <p class="text-[11px] text-[var(--color-text-muted)]">
                  Exported: {new Date(pendingBackup.exportedAt || Date.now()).toLocaleString("en-US")} • Version {pendingBackup.version || "1.0"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onclick={() => {
                isImportModalOpen = false;
                pendingBackup = null;
              }}
              class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Inspection Summary Grid -->
          <div class="grid grid-cols-3 gap-2.5 p-3.5 bg-[var(--color-text)]/5 rounded-xl border border-[var(--color-text)]/10 text-center text-xs">
            <div>
              <div class="text-base sm:text-lg font-black text-[var(--color-text)]">
                {pendingBackup.players?.length || 0}
              </div>
              <div class="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">Players</div>
            </div>

            <div>
              <div class="text-base sm:text-lg font-black text-[var(--ntnui-green)]">
                {totalFinesInFile}
              </div>
              <div class="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">Fines</div>
            </div>

            <div>
              <div class="text-base sm:text-lg font-black text-[var(--ntnui-green)]">
                {totalDugnadInFile}
              </div>
              <div class="text-[10px] uppercase font-bold text-[var(--color-text-muted)]">Club Duties</div>
            </div>
          </div>

          <!-- Mode Selection -->
          <div class="space-y-3">
            <div class="text-xs font-bold text-[var(--color-text)]">
              Choose how the data should be imported:
            </div>

            <!-- Option 1: Merge -->
            <label
              class="flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer {importMode === 'merge' ? 'border-[var(--ntnui-green)] bg-[var(--ntnui-green)]/10' : 'border-[var(--color-text)]/15 hover:border-[var(--color-text)]/30'}"
            >
              <input
                type="radio"
                name="import-mode"
                value="merge"
                checked={importMode === "merge"}
                onchange={() => importMode = "merge"}
                class="mt-1 text-[var(--ntnui-green)] focus:ring-[var(--ntnui-green)]"
              />

              <div class="space-y-0.5">
                <div class="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                  <span>Merge / Update Existing</span>
                  <span class="text-[10px] px-1.5 py-0.2 bg-[var(--ntnui-green)]/10 text-[var(--ntnui-green)] rounded font-semibold">
                    Recommended
                  </span>
                </div>

                <div class="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Updates players and adds missing fines and club duties. It <strong>never</strong> deletes existing data from the database.
                </div>
              </div>
            </label>

            <!-- Option 2: Replace -->
            <label
              class="flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer {importMode === 'replace' ? 'border-[var(--ntnui-red)] bg-[var(--ntnui-red)]/10' : 'border-[var(--color-text)]/15 hover:border-[var(--color-text)]/30'}"
            >
              <input
                type="radio"
                name="import-mode"
                value="replace"
                checked={importMode === "replace"}
                onchange={() => importMode = "replace"}
                class="mt-1 text-[var(--ntnui-red)] focus:ring-[var(--ntnui-red)]"
              />

              <div class="space-y-0.5">
                <div class="text-xs font-bold text-[var(--color-text)] flex items-center gap-1.5">
                  <span class="text-[var(--ntnui-red)]">Replace All Team Data (Full Restore)</span>
                </div>

                <div class="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
                  Deletes records that are not present in the backup file and completely replaces the current database with the file's contents.
                </div>
              </div>
            </label>
          </div>

          <!-- If Replace Mode: confirmation safeguard -->
          {#if importMode === "replace"}
            <div class="p-3.5 bg-[var(--ntnui-red)]/10 border border-[var(--ntnui-red)]/30 rounded-xl space-y-2">
              <div class="flex items-center gap-1.5 text-[var(--ntnui-red)] font-bold text-xs">
                <AlertTriangle class="w-4 h-4 text-[var(--ntnui-red)] shrink-0" />
                <span>Confirmation Required</span>
              </div>

              <p class="text-[11px] text-[var(--ntnui-red)]">
                Type <strong>REPLACE</strong> in the field below to confirm that you want to overwrite the existing team data:
              </p>

              <input
                type="text"
                bind:value={replaceConfirmation}
                placeholder="Type REPLACE..."
                class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--ntnui-red)]/30 rounded-lg text-xs font-bold text-[var(--ntnui-red)] placeholder:text-[var(--ntnui-red)]"
              />
            </div>
          {/if}

          <!-- Action buttons -->
          <div class="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-text)]/10">
            <button
              type="button"
              onclick={() => {
                isImportModalOpen = false;
                pendingBackup = null;
              }}
              class="px-4 py-2 rounded-xl text-xs font-bold text-[var(--color-text-muted)] hover:bg-[var(--color-text)]/5 cursor-pointer transition-all"
            >
              Cancel
            </button>

            <button
              type="button"
              onclick={executeImport}
              disabled={isImporting || (importMode === 'replace' && replaceConfirmation.trim().toUpperCase() !== 'REPLACE')}
              class="px-5 py-2 rounded-xl bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center gap-2"
            >
              {#if isImporting}
                <RefreshCw class="w-3.5 h-3.5 animate-spin" />
                <span>Importing Data...</span>
              {:else}
                <Check class="w-3.5 h-3.5" />
                <span>Complete Import</span>
              {/if}
            </button>
          </div>

        </div>
      </div>
    {/if}

    <!-- MODAL: Edit Fine Entry -->
    {#if editingFine}
      <div class="fixed inset-0 z-50 bg-[var(--ntnui-black-dark)]/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--color-text)]/15">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-base text-[var(--color-text)]">
              Edit Fine Submission
            </h4>
            <button type="button" onclick={() => editingFine = null} class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3 text-xs sm:text-sm">
            <div>
              <label for="edit-fine-player" class="block text-xs font-bold text-[var(--color-text)] mb-1">Player / Person</label>
              <select
                id="edit-fine-player"
                bind:value={editFinePlayerId}
                class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold"
              >
                {#each persons as p}
                  <option value={p.id}>{getAdminFullName(p)} ({p.type})</option>
                {/each}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edit-fine-amount" class="block text-xs font-bold text-[var(--color-text)] mb-1">Total Fine (kr)</label>
                <input
                  id="edit-fine-amount"
                  type="number"
                  step="1"
                  min="0"
                  bind:value={editFineAmount}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold"
                />
              </div>

              <div>
                <label for="edit-fine-ctx" class="block text-xs font-bold text-[var(--color-text)] mb-1">Occasion</label>
                <select
                  id="edit-fine-ctx"
                  bind:value={editFineEventContext}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-medium"
                >
                  <option value="Practice">Practice</option>
                  <option value="Match">Match</option>
                  <option value="Social">Social</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3 items-center">
              <div>
                <label for="edit-fine-status" class="block text-xs font-bold text-[var(--color-text)] mb-1">Status</label>
                <select
                  id="edit-fine-status"
                  bind:value={editFineStatus}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-medium"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label for="edit-fine-comm" class="block text-xs font-bold text-[var(--color-text)] mb-1">Comment</label>
              <textarea
                id="edit-fine-comm"
                rows="2"
                bind:value={editFineComment}
                class="w-full p-2.5 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)]"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onclick={() => editingFine = null}
              disabled={isSavingFine}
              class="px-3.5 py-1.5 rounded-lg border border-[var(--color-text)]/30 text-[var(--color-text)] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={saveEditedFine}
              disabled={isSavingFine}
              class="px-4 py-1.5 rounded-lg bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {#if isSavingFine}
                <RefreshCw class="w-3 h-3 animate-spin" />
                <span>Lagrer...</span>
              {:else}
                <span>Save Changes</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- MODAL: Edit Dugnad Entry -->
    {#if editingDugnad}
      <div class="fixed inset-0 z-50 bg-[var(--ntnui-black-dark)]/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--color-text)]/15">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-base text-[var(--color-text)]">
              Edit Club Duty Submission
            </h4>
            <button type="button" onclick={() => editingDugnad = null} class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3 text-xs sm:text-sm">
            <div>
              <label for="edit-dug-player" class="block text-xs font-bold text-[var(--color-text)] mb-1">Player</label>
              <select
                id="edit-dug-player"
                bind:value={editDugnadPlayerId}
                class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold"
              >
                {#each persons.filter(p => p.type === 'player') as p}
                  <option value={p.id}>{getAdminFullName(p)}</option>
                {/each}
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edit-dug-pts" class="block text-xs font-bold text-[var(--color-text)] mb-1">Points (pts)</label>
                <input
                  id="edit-dug-pts"
                  type="number"
                  step="1"
                  min="0"
                  bind:value={editDugnadPoints}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold"
                />
              </div>

              <div>
                <label for="edit-dug-status" class="block text-xs font-bold text-[var(--color-text)] mb-1">Status</label>
                <select
                  id="edit-dug-status"
                  bind:value={editDugnadStatus}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-medium"
                >
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div>
              <label for="edit-dug-activity" class="block text-xs font-bold text-[var(--color-text)] mb-1">Activity Type</label>
              <input
                id="edit-dug-activity"
                type="text"
                bind:value={editDugnadActivityType}
                class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-medium"
                placeholder="e.g. Club Task, Hall Rigging, Kiosk..."
              />
            </div>

            <div>
              <label for="edit-dug-comm" class="block text-xs font-bold text-[var(--color-text)] mb-1">Comment</label>
              <textarea
                id="edit-dug-comm"
                rows="2"
                bind:value={editDugnadComment}
                class="w-full p-2.5 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)]"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onclick={() => editingDugnad = null}
              disabled={isSavingDugnad}
              class="px-3.5 py-1.5 rounded-lg border border-[var(--color-text)]/30 text-[var(--color-text)] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={saveEditedDugnad}
              disabled={isSavingDugnad}
              class="px-4 py-1.5 rounded-lg bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {#if isSavingDugnad}
                <RefreshCw class="w-3 h-3 animate-spin" />
                <span>Lagrer...</span>
              {:else}
                <span>Save Changes</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- MODAL: Edit Person -->
    {#if editingPerson}
      <div class="fixed inset-0 z-50 bg-[var(--ntnui-black-dark)]/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--color-text)]/15">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-base text-[var(--color-text)]">
              Edit Team Member
            </h4>
            <button type="button" onclick={() => editingPerson = null} class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3 text-xs sm:text-sm">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edit-p-fname" class="block text-xs font-bold text-[var(--color-text)] mb-1">First Name *</label>
                <input
                  id="edit-p-fname"
                  type="text"
                  bind:value={editPersonFirstName}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold"
                />
              </div>
              <div>
                <label for="edit-p-lname" class="block text-xs font-bold text-[var(--color-text)] mb-1">Last Name</label>
                <input
                  id="edit-p-lname"
                  type="text"
                  bind:value={editPersonLastName}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label for="edit-p-type" class="block text-xs font-bold text-[var(--color-text)] mb-1">Type</label>
                <select
                  id="edit-p-type"
                  bind:value={editPersonType}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-medium"
                >
                  <option value="player">Player</option>
                  <option value="coach">Coach / Staff</option>
                </select>
              </div>
              <div>
                <label for="edit-p-num" class="block text-xs font-bold text-[var(--color-text)] mb-1">Jersey #</label>
                <input
                  id="edit-p-num"
                  type="number"
                  bind:value={editPersonNumber}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)]"
                />
              </div>
            </div>

            <div>
              <label for="edit-p-role" class="block text-xs font-bold text-[var(--color-text)] mb-1">Position / Role</label>
              <input
                id="edit-p-role"
                type="text"
                bind:value={editPersonRole}
                class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)]"
              />
            </div>

            <label class="flex items-start gap-2.5 p-3.5 bg-[var(--ntnui-yellow)]/10 rounded-xl border border-[var(--ntnui-yellow)]/40 cursor-pointer">
              <input
                type="checkbox"
                bind:checked={editPersonExemptFromDutyReverse}
                class="mt-0.5 w-4 h-4 rounded border-[var(--color-text)]/30 text-[var(--ntnui-green)] focus:ring-[var(--ntnui-green)]"
              />
              <span>
                <span class="block text-xs font-bold text-[var(--color-text)]">Exclude from reversed Club Duty leaderboard</span>
                <span class="block text-[11px] text-[var(--color-text)] mt-0.5">
                  This person will not appear in the admin reversed ranking.
                </span>
              </span>
            </label>

            <!-- Direct Leaderboards & Totals Adjustment -->
            <div class="p-3.5 bg-[var(--color-text)]/5 rounded-xl border border-[var(--color-text)]/15 space-y-2.5">
              <div>
                <span class="block text-xs font-bold text-[var(--color-text)]">
                  Direct Leaderboards & Totals Adjustment
                </span>
                <span class="block text-[11px] text-[var(--color-text-muted)] italic mt-0.5">
                  Directly adjust this person's recorded fine total and club duty points.
                </span>
              </div>
              <div class="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label for="edit-p-finesum" class="block text-xs font-bold text-[var(--color-text)] mb-1">
                    Fines Sum (kr)
                  </label>
                  <div class="relative">
                    <input
                      id="edit-p-finesum"
                      type="number"
                      step="5"
                      bind:value={editPersonFineSum}
                      class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold focus:ring-2 focus:ring-[var(--ntnui-green)]/30"
                    />
                    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-text-muted)]">
                      kr
                    </span>
                  </div>
                </div>

                {#if editPersonType === 'player'}
                  <div>
                    <label for="edit-p-dutypts" class="block text-xs font-bold text-[var(--color-text)] mb-1">
                      Club Duty (pts)
                    </label>
                    <div class="relative">
                      <input
                        id="edit-p-dutypts"
                        type="number"
                        step="1"
                        min="0"
                        bind:value={editPersonDutyPoints}
                        class="w-full px-3 py-2 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold focus:ring-2 focus:ring-[var(--ntnui-green)]/30"
                      />
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-text-muted)]">
                        pts
                      </span>
                    </div>
                  </div>
                {:else}
                  <div class="flex flex-col justify-center text-xs text-[var(--color-text-muted)] italic">
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
              class="px-3.5 py-1.5 rounded-lg border border-[var(--color-text)]/30 text-[var(--color-text)] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={saveEditedPerson}
              disabled={isSavingPerson}
              class="px-4 py-1.5 rounded-lg bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {#if isSavingPerson}
                <RefreshCw class="w-3 h-3 animate-spin" />
                <span>Lagrer...</span>
              {:else}
                <span>Lagre person</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- MODAL: Edit Fine Rule -->
    {#if editingRule}
      <div class="fixed inset-0 z-50 bg-[var(--ntnui-black-dark)]/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--color-text)]/15">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-base text-[var(--color-text)]">
              Edit Fine Rule
            </h4>
            <button type="button" onclick={() => editingRule = null} class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3 text-xs sm:text-sm">
            <div>
              <label for="edit-r-title" class="block text-xs font-bold text-[var(--color-text)] mb-1">Rule Title *</label>
              <input
                id="edit-r-title"
                type="text"
                bind:value={editRuleTitle}
                class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold"
              />
            </div>

            <!-- Occasion amounts (Mandatory) -->
            <div class="p-3.5 bg-[var(--color-text)]/5 rounded-xl border border-[var(--color-text)]/15 space-y-2">
              <div>
                <span class="block text-xs font-bold text-[var(--color-text)]">
                  Occasion Amounts *
                </span>
                <span class="block text-[11px] text-[var(--color-text-muted)] italic mt-0.5">
                  * Leave blank or 0 to exclude this violation from that occasion.
                </span>
              </div>
              <div class="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label for="edit-match-rate" class="block text-[10px] font-bold text-[var(--color-text-muted)] mb-1">Match (kr)</label>
                  <input
                    id="edit-match-rate"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="None"
                    bind:value={editRuleFineMatch}
                    class="w-full p-1.5 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-md text-xs font-bold text-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label for="edit-practice-rate" class="block text-[10px] font-bold text-[var(--color-text-muted)] mb-1">Practice (kr)</label>
                  <input
                    id="edit-practice-rate"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="None"
                    bind:value={editRuleFinePractice}
                    class="w-full p-1.5 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-md text-xs font-bold text-[var(--color-text)]"
                  />
                </div>
                <div>
                  <label for="edit-social-rate" class="block text-[10px] font-bold text-[var(--color-text-muted)] mb-1">Social (kr)</label>
                  <input
                    id="edit-social-rate"
                    type="number"
                    step="1"
                    min="0"
                    placeholder="None"
                    bind:value={editRuleFineSocial}
                    class="w-full p-1.5 bg-[var(--color-surface)] border border-[var(--color-text)]/30 rounded-md text-xs font-bold text-[var(--color-text)]"
                  />
                </div>
              </div>
            </div>

            <div>
              <label for="edit-r-desc" class="block text-xs font-bold text-[var(--color-text)] mb-1">Description (optional)</label>
              <textarea
                id="edit-r-desc"
                rows="2"
                bind:value={editRuleDescription}
                class="w-full p-2.5 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)]"
              ></textarea>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onclick={() => editingRule = null}
              class="px-3.5 py-1.5 rounded-lg border border-[var(--color-text)]/30 text-[var(--color-text)] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={saveEditedRule}
              class="px-4 py-1.5 rounded-lg bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Rule
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- MODAL: Edit Dugnad Activity -->
    {#if editingDugnadActivity}
      <div class="fixed inset-0 z-50 bg-[var(--ntnui-black-dark)]/70 backdrop-blur-xs flex items-center justify-center p-4">
        <div class="bg-[var(--color-surface)] rounded-2xl shadow-xl max-w-md w-full p-6 border border-[var(--color-text)]/15">
          <div class="flex items-center justify-between">
            <h4 class="font-bold text-base text-[var(--color-text)]">
              Edit Duty Task & Rate
            </h4>
            <button type="button" onclick={() => editingDugnadActivity = null} class="text-[var(--color-text-muted)] hover:text-[var(--color-text)] cursor-pointer">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3 text-xs sm:text-sm">
            <div>
              <label for="edit-act-title" class="block text-xs font-bold text-[var(--color-text)] mb-1">Activity Title *</label>
              <input
                id="edit-act-title"
                type="text"
                bind:value={editDugnadActTitle}
                class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold"
              />
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label for="edit-act-type" class="block text-xs font-bold text-[var(--color-text)] mb-1">Point Type</label>
                <select
                  id="edit-act-type"
                  bind:value={editDugnadActPointsType}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold"
                >
                  <option value="perHour">Per hour</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>

              {#if editDugnadActPointsType === "perHour"}
              <div>
                <label for="edit-act-hours" class="block text-xs font-bold text-[var(--color-text)] mb-1">Standard Duration (Hours)</label>
                <input
                  id="edit-act-hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  bind:value={editDugnadActDefaultHours}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold"
                />
              </div>
              {/if}

              <div>
                <label for="edit-act-rate" class="block text-xs font-bold text-[var(--color-text)] mb-1">Points ({editDugnadActPointsType === "fixed" ? "fixed" : "per hour"})</label>
                <input
                  id="edit-act-rate"
                  type="number"
                  step="0.5"
                  min="1"
                  bind:value={editDugnadActpointsPer}
                  class="w-full px-3 py-2 bg-[var(--color-text)]/5 border border-[var(--color-text)]/30 rounded-lg text-[var(--color-text)] font-bold"
                />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onclick={() => editingDugnadActivity = null}
              class="px-3.5 py-1.5 rounded-lg border border-[var(--color-text)]/30 text-[var(--color-text)] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={saveEditedDugnadActivity}
              class="px-4 py-1.5 rounded-lg bg-[var(--ntnui-green)] hover:bg-[var(--ntnui-green)]/90 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              Save Rate
            </button>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
