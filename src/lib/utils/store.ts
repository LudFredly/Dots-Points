import type { Person, FineRule, FineReport, DugnadEntry, DugnadActivity, TeamSettings } from "$lib/types";
import { sortPersonsAlphabetically, getPublicDisplayName } from "$lib/utils/nameHelper";
import { database } from "$lib/utils/firestore";
import { collection, getDocs, addDoc, doc, updateDoc } from "firebase/firestore/lite";

export const DEFAULT_PERSONS: Person[] = [
  { id: "p1", firstName: "Henrik", lastName: "Karlsen", number: 4, role: "Setter (Captain)", type: "player", active: true },
  { id: "p2", firstName: "Sander", lastName: "Tveit", number: 7, role: "Outside Hitter", type: "player", active: true },
  { id: "p3", firstName: "Magnus", lastName: "Bakke", number: 9, role: "Middle Blocker", type: "player", active: true },
  { id: "p4", firstName: "Tobias", lastName: "Solberg", number: 11, role: "Outside Hitter", type: "player", active: true },
  { id: "p5", firstName: "Jonas", lastName: "Lie", number: 13, role: "Opposite", type: "player", active: true },
  { id: "p6", firstName: "Elias", lastName: "Hansen", number: 1, role: "Libero", type: "player", active: true },
  { id: "p7", firstName: "Mathias", lastName: "Olsen", number: 5, role: "Middle Blocker", type: "player", active: true },
  { id: "p8", firstName: "Fredrik", lastName: "Moen", number: 8, role: "Outside Hitter", type: "player", active: true },
  { id: "p9", firstName: "Oliver", lastName: "Larsen", number: 10, role: "Setter", type: "player", active: true },
  { id: "p10", firstName: "Simen", lastName: "Berg", number: 12, role: "Opposite", type: "player", active: true },
  { id: "p11", firstName: "Kristian", lastName: "Aas", number: 6, role: "All-Rounder", type: "player", active: true },
  { id: "p12", firstName: "Henrik", lastName: "Holm", number: 14, role: "Middle Blocker", type: "player", active: true },
  { id: "c1", firstName: "Martin", lastName: "Eriksen", number: undefined, role: "Head Coach", type: "coach", active: true },
  { id: "c2", firstName: "Tor", lastName: "Amundsen", number: undefined, role: "Assistant Coach", type: "coach", active: true }
];

// Fine rules sorted strictly by fine amount (sum) ascending
export const DEFAULT_FINE_RULES: FineRule[] = [
  {
    id: "r1",
    title: "Service into net on set point / 0-0",
    fine: 20,
    fineMatch: 20,
    category: "Match",
    description: "Missed serve directly into the net after a timeout or on score 24-XX"
  },
  {
    id: "r2",
    title: "Losing warm-up drill / last in sprints",
    fine: 20,
    finePractice: 20,
    category: "Practice",
    description: "Dropping an easy reception ball or finishing last in team conditioning sprints"
  },
  {
    id: "r3",
    title: "Net touch on decisive ball",
    fine: 30,
    fineMatch: 30,
    category: "Match",
    description: "Touching the net on a set point, match point, or unforced situation"
  },
  {
    id: "r4",
    title: "Water bottle / tape left in gym",
    fine: 30,
    fineMatch: 30,
    finePractice: 30,
    category: "Equipment & Facility",
    description: "Leaving bottles, tape, or training gear behind on the court after practice or match"
  },
  {
    id: "r5",
    title: "Phone ringing / buzzing during tactical briefing",
    fine: 40,
    fineMatch: 40,
    finePractice: 40,
    fineSocial: 40,
    category: "Social & Conduct",
    description: "Phone makes noise in the locker room or during tactical timeout"
  },
  {
    id: "r6",
    title: "Dirty or black-soled shoes marking the court",
    fine: 40,
    fineMatch: 40,
    finePractice: 40,
    category: "Equipment & Facility",
    description: "Using outdoor footwear or shoes leaving black scuff marks on the court"
  },
  {
    id: "r7",
    title: "Late for warm-up / team call-up",
    fine: 50,
    fineMatch: 50,
    finePractice: 50,
    category: "Practice",
    description: "Arriving late to the gym or scheduled team meeting"
  },
  {
    id: "r8",
    title: "Forgot jersey / knee pads / match kit",
    fine: 50,
    fineMatch: 50,
    finePractice: 50,
    category: "Equipment & Facility",
    description: "Missing match jersey, shorts, kneepads, or designated team gear"
  },
  {
    id: "r9",
    title: "Custom / Special fine",
    fine: 50,
    fineMatch: 50,
    finePractice: 50,
    fineSocial: 50,
    category: "Other",
    description: "Ad-hoc penalty established by the team leadership or captain"
  },
  {
    id: "r10",
    title: "Yellow / Red card from referee",
    fine: 100,
    fineMatch: 100,
    category: "Match",
    description: "Unsportsmanlike conduct, arguing with officials, or penalty cards"
  },
  {
    id: "r11",
    title: "Birthday cake fine (missing birthday treats)",
    fine: 100,
    finePractice: 100,
    fineSocial: 100,
    category: "Social & Conduct",
    description: "Had a birthday recently without bringing cake or treats to the next practice"
  },
  {
    id: "r12",
    title: "Absence without 24h prior notification",
    fine: 100,
    fineMatch: 100,
    finePractice: 100,
    category: "Practice",
    description: "Late cancellation or unannounced absence on match or practice day"
  }
];

export const DEFAULT_DUGNAD_ACTIVITIES: DugnadActivity[] = [
  { id: "d1", title: "Concession stand / Kiosk shift", defaultHours: 3, pointsPerHour: 10 },
  { id: "d2", title: "Scorekeeper / Digital scoresheet", defaultHours: 2, pointsPerHour: 12 },
  { id: "d3", title: "Referee / Line judge duty", defaultHours: 2, pointsPerHour: 15 },
  { id: "d4", title: "Raffle / merchandise sales", defaultHours: 4, pointsPerHour: 10 },
  { id: "d5", title: "Court set-up & net take-down", defaultHours: 1.5, pointsPerHour: 10 },
  { id: "d6", title: "Team driver for away match", defaultHours: 3, pointsPerHour: 15 },
  { id: "d7", title: "Other club duty", defaultHours: 2, pointsPerHour: 10 }
];

export const DEFAULT_SETTINGS: TeamSettings = {
  teamName: "H4A",
  season: "26/27",
  finePotPublished: false, // Hidden until admin publishes
  hourlyPointsRate: 10
};

// Check if a rule applies to a specific occasion
export function isRuleApplicableForOccasion(rule: FineRule, occasion: string): boolean {
  if (occasion === "Match") {
    return rule.fineMatch != null && Number(rule.fineMatch) > 0;
  }
  if (occasion === "Practice") {
    return rule.finePractice != null && Number(rule.finePractice) > 0;
  }
  if (occasion === "Social") {
    return rule.fineSocial != null && Number(rule.fineSocial) > 0;
  }
  if (occasion === "Other") {
    return true;
  }
  return false;
}

// Helper to calculate fine based on context/occasion
export function getRuleFineForOccasion(rule: FineRule, occasion: string): number {
  if (occasion === "Match" && rule.fineMatch != null && Number(rule.fineMatch) > 0) {
    return Number(rule.fineMatch);
  }
  if (occasion === "Practice" && rule.finePractice != null && Number(rule.finePractice) > 0) {
    return Number(rule.finePractice);
  }
  if (occasion === "Social" && rule.fineSocial != null && Number(rule.fineSocial) > 0) {
    return Number(rule.fineSocial);
  }
  const rates = [rule.fineMatch, rule.finePractice, rule.fineSocial, rule.fine].filter((v): v is number => v != null && v > 0);
  return rates.length > 0 ? rates[0] : (rule.fine || 0);
}

export const INITIAL_FINES: FineReport[] = [];

export const INITIAL_DUGNAD: DugnadEntry[] = [];

const STORAGE_KEYS = {
  PERSONS: "h4a_persons_v3",
  RULES: "h4a_fine_rules_v3",
  FINES: "h4a_fines_reports_v3",
  DUGNAD: "h4a_dugnad_entries_v3",
  DUGNAD_ACTIVITIES: "h4a_dugnad_activities_v3",
  SETTINGS: "h4a_settings_v3"
};

export function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") return defaultValue;
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item) as T;
  } catch (err) {
    console.warn(`Error reading localStorage key ${key}:`, err);
    return defaultValue;
  }
}

export function saveToLocalStorage<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Error writing localStorage key ${key}:`, err);
  }
}

export class H4ADataManager {
  persons: Person[] = [];
  rules: FineRule[] = [];
  fines: FineReport[] = [];
  dugnad: DugnadEntry[] = [];
  dugnadActivities: DugnadActivity[] = [];
  settings: TeamSettings = DEFAULT_SETTINGS;
  isAdminUnlocked: boolean = false;

  private listeners: (() => void)[] = [];

  constructor() {
    this.init();
  }

  init() {
    this.persons = sortPersonsAlphabetically(loadFromLocalStorage<Person[]>(STORAGE_KEYS.PERSONS, DEFAULT_PERSONS));
    this.rules = this.sortRulesByFine(loadFromLocalStorage<FineRule[]>(STORAGE_KEYS.RULES, DEFAULT_FINE_RULES));
    this.fines = loadFromLocalStorage<FineReport[]>(STORAGE_KEYS.FINES, INITIAL_FINES);
    this.dugnad = loadFromLocalStorage<DugnadEntry[]>(STORAGE_KEYS.DUGNAD, INITIAL_DUGNAD);
    this.dugnadActivities = loadFromLocalStorage<DugnadActivity[]>(STORAGE_KEYS.DUGNAD_ACTIVITIES, DEFAULT_DUGNAD_ACTIVITIES);
    this.settings = loadFromLocalStorage<TeamSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);

    if (typeof window !== "undefined") {
      this.isAdminUnlocked = sessionStorage.getItem("h4a_admin_session_unlocked") === "true";
    }

    this.syncFromFirestore();
  }

  setAdminUnlocked(unlocked: boolean): void {
    this.isAdminUnlocked = unlocked;
    if (typeof window !== "undefined") {
      if (unlocked) {
        sessionStorage.setItem("h4a_admin_session_unlocked", "true");
      } else {
        sessionStorage.removeItem("h4a_admin_session_unlocked");
      }
    }
    this.notify();
  }

  get players(): Person[] {
    return this.persons.filter(p => p.type === "player");
  }

  get coaches(): Person[] {
    return this.persons.filter(p => p.type === "coach");
  }

  private getMinOccasionRate(r: FineRule): number {
    const rates = [r.fineMatch, r.finePractice, r.fineSocial, r.fine].filter((v): v is number => v != null && v > 0);
    return rates.length > 0 ? Math.min(...rates) : 0;
  }

  private sortRulesByFine(rules: FineRule[]): FineRule[] {
    return [...rules].sort((a, b) => this.getMinOccasionRate(a) - this.getMinOccasionRate(b) || a.title.localeCompare(b.title));
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    for (const l of this.listeners) {
      try {
        l();
      } catch (err) {
        console.error(err);
      }
    }
  }

  async syncFromFirestore() {
    if (typeof window === "undefined") return;
    try {
      const finesCol = collection(database, "prikk_melding");
      const finesSnap = await getDocs(finesCol);
      if (!finesSnap.empty) {
        const remoteFines: FineReport[] = [];
        finesSnap.docs.forEach(docSnap => {
          const d = docSnap.data();
          const dateVal = d.date?.toDate ? d.date.toDate().toISOString() : (typeof d.date === "string" ? d.date : new Date().toISOString());
          remoteFines.push({
            id: docSnap.id,
            playerId: d.playerId || "unknown",
            playerName: d.playerName || "Player",
            ruleIds: d.ruleIds || [],
            ruleTitles: d.ruleTitles || ["Reported fine"],
            totalFine: Number(d.totalFine || 50),
            comment: d.comment || "",
            reportedBy: d.reportedBy || "Teammate",
            date: dateVal,
            eventContext: d.eventContext || "Practice",
            status: d.status || "approved",
            paid: Boolean(d.paid)
          });
        });

        const existingIds = new Set(this.fines.map(f => f.id));
        const newOnes = remoteFines.filter(f => !existingIds.has(f.id));
        if (newOnes.length > 0) {
          this.fines = [...newOnes, ...this.fines];
          saveToLocalStorage(STORAGE_KEYS.FINES, this.fines);
          this.notify();
        }
      }
    } catch (e) {
      // LocalStorage fallback is reliable
    }
  }

  // --- Fine Submissions ---
  async addFineReport(report: Omit<FineReport, "id" | "date" | "status"> & { date?: string; status?: FineReport["status"] }): Promise<FineReport> {
    const newReport: FineReport = {
      ...report,
      id: "fine_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      date: report.date || new Date().toISOString(),
      status: report.status || "pending",
      paid: false
    };

    this.fines = [newReport, ...this.fines];
    saveToLocalStorage(STORAGE_KEYS.FINES, this.fines);
    this.notify();

    try {
      await addDoc(collection(database, "prikk_melding"), {
        ...newReport,
        timestamp: new Date()
      });
    } catch (err) {
      console.warn("Firestore sync skipped:", err);
    }

    return newReport;
  }

  async updateFine(id: string, updates: Partial<FineReport>): Promise<void> {
    this.fines = this.fines.map(f => f.id === id ? { ...f, ...updates } : f);
    saveToLocalStorage(STORAGE_KEYS.FINES, this.fines);
    this.notify();
  }

  async setFineStatus(id: string, status: "approved" | "rejected" | "pending"): Promise<void> {
    this.fines = this.fines.map(f => f.id === id ? { ...f, status } : f);
    saveToLocalStorage(STORAGE_KEYS.FINES, this.fines);
    this.notify();
  }

  async deleteFine(fineId: string): Promise<void> {
    this.fines = this.fines.filter(f => f.id !== fineId);
    saveToLocalStorage(STORAGE_KEYS.FINES, this.fines);
    this.notify();
  }

  // --- Volunteer / Dugnad Submissions ---
  async addDugnadEntry(entry: Omit<DugnadEntry, "id" | "date" | "status"> & { date?: string; status?: DugnadEntry["status"] }): Promise<DugnadEntry> {
    const newEntry: DugnadEntry = {
      ...entry,
      id: "dug_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      date: entry.date || new Date().toISOString(),
      status: entry.status || "pending"
    };

    this.dugnad = [newEntry, ...this.dugnad];
    saveToLocalStorage(STORAGE_KEYS.DUGNAD, this.dugnad);
    this.notify();

    try {
      await addDoc(collection(database, "dugnad_entries"), {
        ...newEntry,
        timestamp: new Date()
      });
    } catch (err) {
      console.warn("Firestore sync skipped for dugnad:", err);
    }

    return newEntry;
  }

  async updateDugnad(id: string, updates: Partial<DugnadEntry>): Promise<void> {
    this.dugnad = this.dugnad.map(d => d.id === id ? { ...d, ...updates } : d);
    saveToLocalStorage(STORAGE_KEYS.DUGNAD, this.dugnad);
    this.notify();
  }

  async setDugnadStatus(id: string, status: "approved" | "rejected" | "pending"): Promise<void> {
    this.dugnad = this.dugnad.map(d => d.id === id ? { ...d, status } : d);
    saveToLocalStorage(STORAGE_KEYS.DUGNAD, this.dugnad);
    this.notify();
  }

  async deleteDugnad(dugnadId: string): Promise<void> {
    this.dugnad = this.dugnad.filter(d => d.id !== dugnadId);
    saveToLocalStorage(STORAGE_KEYS.DUGNAD, this.dugnad);
    this.notify();
  }

  // --- Roster / Persons Management ---
  addPerson(firstName: string, lastName: string, role: string = "Player", type: "player" | "coach" = "player", number?: number): Person {
    const newPerson: Person = {
      id: "person_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role.trim(),
      type,
      number: number || undefined,
      active: true
    };
    this.persons = sortPersonsAlphabetically([...this.persons, newPerson]);
    saveToLocalStorage(STORAGE_KEYS.PERSONS, this.persons);
    this.notify();
    return newPerson;
  }

  updatePerson(id: string, updates: Partial<Person>): void {
    this.persons = sortPersonsAlphabetically(
      this.persons.map(p => p.id === id ? { ...p, ...updates } : p)
    );
    saveToLocalStorage(STORAGE_KEYS.PERSONS, this.persons);
    this.notify();
  }

  removePerson(personId: string): void {
    this.persons = this.persons.filter(p => p.id !== personId);
    saveToLocalStorage(STORAGE_KEYS.PERSONS, this.persons);
    this.notify();
  }

  // --- Direct Person Totals Adjustment (Admin) ---
  setPersonTotals(personId: string, targetFineSum?: number, targetDutyHours?: number): void {
    const person = this.persons.find(p => p.id === personId);
    const pName = person ? `${person.firstName} ${person.lastName}`.trim() : "Player";

    // Adjust fines sum if specified
    if (targetFineSum !== undefined && !isNaN(targetFineSum)) {
      const approvedFines = this.fines.filter(f => f.playerId === personId && f.status === "approved");
      const currentFineSum = approvedFines.reduce((sum, f) => sum + (f.totalFine || 0), 0);
      const diff = Math.round(targetFineSum - currentFineSum);
      if (diff !== 0) {
        const adjFine: FineReport = {
          id: "fine_adj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          playerId: personId,
          playerName: pName,
          ruleIds: ["admin_adj"],
          ruleTitles: ["Admin direct fine adjustment"],
          totalFine: diff,
          comment: `Direct admin adjustment to set total fines to ${targetFineSum} kr`,
          date: new Date().toISOString(),
          eventContext: "Other",
          status: "approved",
          paid: false
        };
        this.fines = [adjFine, ...this.fines];
        saveToLocalStorage(STORAGE_KEYS.FINES, this.fines);
      }
    }

    // Adjust duty hours if specified (players only)
    if (targetDutyHours !== undefined && !isNaN(targetDutyHours)) {
      const approvedDugnad = this.dugnad.filter(d => d.playerId === personId && d.status === "approved");
      const currentHours = approvedDugnad.reduce((sum, d) => sum + (d.hours || 0), 0);
      const hoursDiff = Number((targetDutyHours - currentHours).toFixed(2));
      if (hoursDiff !== 0) {
        const pointsDiff = Math.round(hoursDiff * 10);
        const adjDugnad: DugnadEntry = {
          id: "dug_adj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
          playerId: personId,
          playerName: pName,
          activityType: "Admin direct duty adjustment",
          hours: hoursDiff,
          points: pointsDiff,
          comment: `Direct admin adjustment to set total duty to ${targetDutyHours} hrs`,
          date: new Date().toISOString(),
          status: "approved"
        };
        this.dugnad = [adjDugnad, ...this.dugnad];
        saveToLocalStorage(STORAGE_KEYS.DUGNAD, this.dugnad);
      }
    }

    this.notify();
  }

  // --- Rules Management ---
  addFineRule(rule: Omit<FineRule, "id">): FineRule {
    const newRule: FineRule = {
      ...rule,
      id: "rule_" + Date.now()
    };
    this.rules = this.sortRulesByFine([...this.rules, newRule]);
    saveToLocalStorage(STORAGE_KEYS.RULES, this.rules);
    this.notify();
    return newRule;
  }

  updateFineRule(id: string, updates: Partial<FineRule>): void {
    this.rules = this.sortRulesByFine(
      this.rules.map(r => r.id === id ? { ...r, ...updates } : r)
    );
    saveToLocalStorage(STORAGE_KEYS.RULES, this.rules);
    this.notify();
  }

  deleteFineRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
    saveToLocalStorage(STORAGE_KEYS.RULES, this.rules);
    this.notify();
  }

  // --- Volunteer Activities & Rates Management ---
  addDugnadActivity(activity: Omit<DugnadActivity, "id">): DugnadActivity {
    const newActivity: DugnadActivity = {
      ...activity,
      id: "dug_act_" + Date.now()
    };
    this.dugnadActivities = [...this.dugnadActivities, newActivity];
    saveToLocalStorage(STORAGE_KEYS.DUGNAD_ACTIVITIES, this.dugnadActivities);
    this.notify();
    return newActivity;
  }

  updateDugnadActivity(id: string, updates: Partial<DugnadActivity>): void {
    this.dugnadActivities = this.dugnadActivities.map(a => a.id === id ? { ...a, ...updates } : a);
    saveToLocalStorage(STORAGE_KEYS.DUGNAD_ACTIVITIES, this.dugnadActivities);
    this.notify();
  }

  deleteDugnadActivity(id: string): void {
    this.dugnadActivities = this.dugnadActivities.filter(a => a.id !== id);
    saveToLocalStorage(STORAGE_KEYS.DUGNAD_ACTIVITIES, this.dugnadActivities);
    this.notify();
  }

  // --- Settings ---
  updateSettings(newSettings: Partial<TeamSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    saveToLocalStorage(STORAGE_KEYS.SETTINGS, this.settings);
    this.notify();
  }

  setFinePotPublished(published: boolean): void {
    this.settings = { ...this.settings, finePotPublished: published };
    saveToLocalStorage(STORAGE_KEYS.SETTINGS, this.settings);
    this.notify();
  }

  resetToDefaultData(): void {
    this.persons = sortPersonsAlphabetically(DEFAULT_PERSONS);
    this.rules = this.sortRulesByFine(DEFAULT_FINE_RULES);
    this.fines = INITIAL_FINES;
    this.dugnad = INITIAL_DUGNAD;
    this.dugnadActivities = DEFAULT_DUGNAD_ACTIVITIES;
    this.settings = DEFAULT_SETTINGS;
    saveToLocalStorage(STORAGE_KEYS.PERSONS, this.persons);
    saveToLocalStorage(STORAGE_KEYS.RULES, this.rules);
    saveToLocalStorage(STORAGE_KEYS.FINES, this.fines);
    saveToLocalStorage(STORAGE_KEYS.DUGNAD, this.dugnad);
    saveToLocalStorage(STORAGE_KEYS.DUGNAD_ACTIVITIES, this.dugnadActivities);
    saveToLocalStorage(STORAGE_KEYS.SETTINGS, this.settings);
    this.notify();
  }
}

export const h4aStore = new H4ADataManager();
