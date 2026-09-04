import type {
  Person,
  FineRule,
  FineReport,
  DugnadEntry,
  DugnadActivity,
  TeamSettings,
  PlayerBackupData,
  TeamDataBackup
} from "$lib/types";
import { sortPersonsAlphabetically } from "$lib/utils/nameHelper";
import { database, isFirebaseConfigured, handleFirestoreError, OperationType } from "$lib/utils/firestore";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  onSnapshot,
  writeBatch,
  getDocs,
  getDoc
} from "firebase/firestore";

export const DEFAULT_PERSONS: Person[] = [
  { id: "p1", firstName: "Erik", lastName: "Myhrum", number: undefined, role: "Middle", type: "player", active: true },
  { id: "p2", firstName: "Erlend", lastName: "Langeggen", number: undefined, role: "Middle", type: "player", active: true },
  { id: "p3", firstName: "Ethan", lastName: "Bestele", number: undefined, role: "Middle", type: "player", active: true },
  { id: "p4", firstName: "Jonas", lastName: "Einvik Smehaug", number: undefined, role: "Opposite", type: "player", active: true },
  { id: "p5", firstName: "Jonas", lastName: "Sunde Kobberdal", number: undefined, role: "Libero", type: "player", active: true },
  { id: "p6", firstName: "Ludvig", lastName: "Vilmar Fredly", number: 4, role: "Outside", type: "player", active: true },
  { id: "p7", firstName: "Marius", lastName: "Lindløkken", number: undefined, role: "Setter", type: "player", active: true },
  { id: "p8", firstName: "Markus", lastName: "Sørland", number: undefined, role: "Potato", type: "player", active: true },
  { id: "p9", firstName: "Markus", lastName: "Veblungsnes", number: undefined, role: "Opposite", type: "player", active: true },
  { id: "p10", firstName: "Mikael", lastName: "Bergmester", number: undefined, role: "Libero", type: "player", active: true },
  { id: "p11", firstName: "Olav", lastName: "Kvåle Gissinger", number: undefined, role: "Potato", type: "player", active: true },
  { id: "p12", firstName: "Sabri", lastName: "Rebaine", number: undefined, role: "Outside", type: "player", active: true },
  { id: "p13", firstName: "Sondre", lastName: "Vikene", number: undefined, role: "Outside", type: "player", active: true },
  { id: "p14", firstName: "Thomas", lastName: "Hanstad", number: undefined, role: "Outside", type: "player", active: true },
  { id: "p15", firstName: "Trond", lastName: "Juvkam", number: undefined, role: "Setter", type: "player", active: true },
  { id: "p16", firstName: "Vegard", lastName: "Lauritsen", number: undefined, role: "Middle", type: "player", active: true },
  { id: "c1", firstName: "Andrea", lastName: "Jamne", number: undefined, role: "Coach", type: "coach", active: true },
  { id: "c2", firstName: "Erle", lastName: "Letnes Levorsen", number: undefined, role: "Coach", type: "coach", active: true }
];

export const DEFAULT_FINE_RULES: FineRule[] = [
  {
    id: "r1",
    title: "No Spond response by midnight",
    fineSocial: 25,
    description: "Not responding on Spond by midnight the day before the event"
  },
  {
    id: "r2",
    title: "Late to practice without notice",
    finePractice: 25,
    description: "Arriving late to practice without notifying anyone in advance. Notice must be given at least one hour before the practice starts."
  },
  {
    id: "r3",
    title: "Late to match without notice",
    fineMatch: 25,
    description: "Arriving late to a match without notifying anyone in advance. Notice must be given at least one hour before the match. Remember to write how late the player was."
  },
  {
    id: "r4",
    title: "No-show",
    finePractice: 75,
    description: "Not showing up to practice after saying that you would attend."
  },
  {
    id: "r5",
    title: "No-show",
    fineMatch: 150,
    description: "Not showing up to a match after saying that you would attend."
  },
  {
    id: "r6",
    title: "Forgetting team equipment",
    fineMatch: 50,
    finePractice: 50,
    description: "Forgetting necessary team/club equipment, such as balls for Spektrum-practice or the match sheet for home matches."
  },
  {
    id: "r7",
    title: "Losing or damaging equipment",
    fineMatch: 50,
    finePractice: 50,
    description: "Losing or damaging team/club equipment, such as a NTNUI-jersey, the net, a ball, etc."
  },
  {
    id: "r8",
    title: "Incorrect match attire",
    fineMatch: 25,
    description: "Not wearing the correct match attire. Black shorts and white tennis socks are required."
  },
  {
    id: "r9",
    title: "Forgetfulness",
    fineMatch: 10,
    finePractice: 10,
    fineSocial: 10,
    description: "Forgetting personal or necessary items."
  },
  {
    id: "r10",
    title: "Unnecessary phone use",
    fineMatch: 25,
    finePractice: 25,
    fineSocial: 25,
    description: "Unnecessary use of a mobile phone during meetings, matches, or practices"
  },
  {
    id: "r11",
    title: "KASSE!",
    finePractice: 10,
    description: "Serving under the net during practice or warm-up before a match. This does not apply during dedicated serve practice, before practice starts, or after practice ends."
  },
  {
    id: "r12",
    title: "KASSEEE!!!",
    fineMatch: 100,
    description: "Serving under the net during a match"
  },
  {
    id: "r13",
    title: "Wasting food",
    fineSocial: 10,
    description: "Not finishing your food when eating together with the team"
  },
  {                                 
    id: "r14",
    title: "Spilling a drink",
    fineMatch: 10,
    finePractice: 10,
    fineSocial: 10,
    description: "Spilling a drink during practice, a match, a party, or another team activity"
  },
  {
    id: "r15",
    title: "Yellow card",
    fineMatch: 50,
    description: "Receiving a yellow card, or doing something that obviously deserves a yellow card"
  },
  {
    id: "r16",
    title: "Red card",
    fineMatch: 100,
    description: "Receiving a red card, or more severe sanctions"
  },
  {
    id: "r17",
    title: "PikkPrikk",
    fineMatch: 25,
    finePractice: 25,
    fineSocial: 25,
    description: "Don't act like a dick"
  },
  {
    id: "r18",
    title: "General Incompetence",
    fineMatch: 10,
    finePractice: 10,
    fineSocial: 10,
    description: "Saying or doing something stupid or obviously idiotic"
  },
  {
    id: "r19",
    title: "Late Important Response",
    fineMatch: 10,
    finePractice: 10,
    fineSocial: 10,
    description: "Having to be reminded to respond to an important message. The fine doubles for each reminder: NOK 10 → NOK 20 → NOK 40 → NOK 80, etc."
  },
  {
    id: "r20",
    title: "Not attending team party",
    fineSocial: 25,
    description: "Not attending a team party without giving notice in advance (booooo)"
  },
  {
    id: "r21",
    title: "F**tefine",
    fineMatch: 50,
    finePractice: 50,
    fineSocial: 50,
    description: "Markus V. swears"
  }
];

export const DEFAULT_DUGNAD_ACTIVITIES: DugnadActivity[] = [
  {
    id: "d1",
    title: "1st referee",
    defaultHours: 1,
    pointsPer: 15,
    pointsType: "perHour"
  },
  {
    id: "d2",
    title: "2nd referee",
    defaultHours: 1,
    pointsPer: 12,
    pointsType: "perHour"
  },
  {
    id: "d3",
    title: "Line judge / secretary",
    defaultHours: 1,
    pointsPer: 8,
    pointsType: "perHour"
  },
  {
    id: "d4",
    title: "Floor duty",
    defaultHours: 1,
    pointsPer: 5,
    pointsType: "perHour"
  },
  {
    id: "d5",
    title: "Work in the kiosk",
    defaultHours: 1,
    pointsPer: 5,
    pointsType: "perHour"
  },
  {
    id: "d6",
    title: "Travel specifically for duty",
    defaultHours: 1,
    pointsPer: 5,
    pointsType: "perHour"
  },
  {
    id: "d7",
    title: "Host social event",
    defaultHours: 0,
    pointsPer: 15,
    pointsType: "fixed"
  },
  {
    id: "d8",
    title: "Organize social event",
    defaultHours: 0,
    pointsPer: 15,
    pointsType: "fixed"
  },
  {
    id: "d9",
    title: "Bring AND return balls to practice/match",
    defaultHours: 0,
    pointsPer: 8,
    pointsType: "fixed"
  },
  {
    id: "d10",
    title: "Wash NTNUI uniforms for the team",
    defaultHours: 0,
    pointsPer: 5,
    pointsType: "fixed"
  },
  {
    id: "d11",
    title: "Bake cake for kiosk",
    defaultHours: 0,
    pointsPer: 5,
    pointsType: "fixed"
  },
  {
    id: "d12",
    title: "Designated driver",
    defaultHours: 1,
    pointsPer: 10,
    pointsType: "perHour"
  }
];

export const DEFAULT_SETTINGS: TeamSettings = {
  teamName: "H4A",
  season: "26/27",
  finePotPublished: false,
  hourlyPointsRate: 10
};

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

export class H4ADataManager {
  persons: Person[] = [];
  rules: FineRule[] = [];
  fines: FineReport[] = [];
  dugnad: DugnadEntry[] = [];
  dugnadActivities: DugnadActivity[] = [];
  settings: TeamSettings = DEFAULT_SETTINGS;
  isConfigured: boolean = isFirebaseConfigured;
  connectionError: string | null = null;
  isLoading: boolean = true;

  // Access Key Management
  expectedAccessKey: string = (import.meta.env.VITE_ACCESS_KEY || "").replace(/^["']|["']$/g, "").trim();
  expectedAdminAccessKey: string = (import.meta.env.VITE_ADMIN_ACCESS_KEY || "").replace(/^["']|["']$/g, "").trim();
  isAccessGranted: boolean = false;
  isAdminAccessGranted: boolean = false;

  private listeners: (() => void)[] = [];
  private unsubscribers: (() => void)[] = [];

  constructor() {
    if (typeof window !== "undefined") {
      this.checkAccess();
      this.checkAdminAccess();
      this.init();
    }
  }

  checkAccess(explicitKey?: string): boolean {
    if (!this.expectedAccessKey) {
      this.isAccessGranted = true;
      return true;
    }

    if (typeof window !== "undefined") {
      // 1. Check URL query parameter (e.g. ?key=xyz or ?access_key=xyz) or explicit key
      let queryKey = explicitKey ? explicitKey.trim() : "";
      if (!queryKey) {
        try {
          const params = new URLSearchParams(window.location.search);
          queryKey = (params.get("key") || params.get("access_key") || "").trim();
        } catch {
          // ignore
        }
      }

      if (queryKey && queryKey === this.expectedAccessKey) {
        try {
          localStorage.setItem("h4a_portal_access_key", queryKey);
        } catch {
          // ignore
        }
        this.isAccessGranted = true;
        // Keep ?key=... visible in the address bar as required
        this.notify();
        return true;
      }

      // 2. Check saved localStorage key
      try {
        const stored = localStorage.getItem("h4a_portal_access_key");
        if (stored && stored.trim() === this.expectedAccessKey) {
          this.isAccessGranted = true;
          return true;
        }
      } catch {
        // ignore
      }
    }

    this.isAccessGranted = false;
    return false;
  }

  checkAdminAccess(explicitKey?: string): boolean {
    if (!this.expectedAdminAccessKey) {
      this.isAdminAccessGranted = true;
      this.isAccessGranted = true;
      return true;
    }

    if (typeof window !== "undefined") {
      let queryKey = explicitKey ? explicitKey.trim() : "";
      if (!queryKey) {
        try {
          const params = new URLSearchParams(window.location.search);
          queryKey = (params.get("key") || params.get("admin_key") || "").trim();
        } catch {
          // ignore
        }
      }

      if (queryKey && queryKey === this.expectedAdminAccessKey) {
        try {
          localStorage.setItem("h4a_admin_access_key", queryKey);
        } catch {
          // ignore
        }
        this.isAdminAccessGranted = true;
        this.isAccessGranted = true;
        // Keep ?key=... visible in the address bar as required
        this.notify();
        return true;
      }

      try {
        const stored = localStorage.getItem("h4a_admin_access_key");
        if (stored && stored.trim() === this.expectedAdminAccessKey) {
          this.isAdminAccessGranted = true;
          this.isAccessGranted = true;
          return true;
        }
      } catch {
        // ignore
      }
    }

    return false;
  }

  verifyAndGrantAccess(key: string): boolean {
    const cleanKey = key.trim();
    if (!this.expectedAccessKey || cleanKey === this.expectedAccessKey) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("h4a_portal_access_key", cleanKey);
        } catch {}
      }
      this.isAccessGranted = true;
      this.notify();
      return true;
    }
    return false;
  }

  verifyAndGrantAdminAccess(key: string): boolean {
    const cleanKey = key.trim();
    if (!this.expectedAdminAccessKey || cleanKey === this.expectedAdminAccessKey) {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("h4a_admin_access_key", cleanKey);
        } catch {}
      }
      this.isAdminAccessGranted = true;
      this.isAccessGranted = true;
      this.notify();
      return true;
    }
    return false;
  }

  revokeAccess(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("h4a_portal_access_key");
      } catch {}
    }
    this.isAccessGranted = !this.expectedAccessKey;
    this.notify();
  }

  revokeAdminAccess(): void {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("h4a_admin_access_key");
      } catch {}
    }
    this.isAdminAccessGranted = false;
    this.notify();
  }

  async init() {
    if (!this.isConfigured) {
      this.connectionError = "Firebase credentials not detected. The portal is displaying preview data. Add your Firebase keys to environment variables to enable live cloud synchronization.";
      this.persons = [...DEFAULT_PERSONS];
      this.rules = this.sortRulesByFine([...DEFAULT_FINE_RULES]);
      this.dugnadActivities = [...DEFAULT_DUGNAD_ACTIVITIES];
      this.isLoading = false;
      this.notify();
      return;
    }

    // Populate empty Firestore collections with the built-in defaults.
    // Existing data is never overwritten.
    try {
      await this.seedDefaultDataIfNeeded();
    } catch (err: any) {
      console.error("Failed to initialize default Firestore data:", err);
      this.connectionError = `Error initializing default data: ${err?.message || "Unknown error"}`;
      this.notify();
    }

    // Start Real-Time Firestore Listeners for authoritative shared state.
    // Access is controlled by the team/admin URL key in the frontend.
    this.startListeners();
  }

  private async seedDefaultDataIfNeeded(): Promise<void> {
    const [personsSnapshot, rulesSnapshot, activitiesSnapshot, settingsSnapshot] = await Promise.all([
      getDocs(collection(database, "persons")),
      getDocs(collection(database, "fine_rules")),
      getDocs(collection(database, "dugnad_activities")),
      getDoc(doc(database, "settings", "team"))
    ]);

    const batch = writeBatch(database);
    let hasWrites = false;

    if (personsSnapshot.empty) {
      for (const person of DEFAULT_PERSONS) {
        batch.set(doc(database, "persons", person.id), person);
      }
      hasWrites = true;
    }

    if (rulesSnapshot.empty) {
      for (const rule of DEFAULT_FINE_RULES) {
        batch.set(doc(database, "fine_rules", rule.id), rule);
      }
      hasWrites = true;
    }

    if (activitiesSnapshot.empty) {
      for (const activity of DEFAULT_DUGNAD_ACTIVITIES) {
        batch.set(doc(database, "dugnad_activities", activity.id), activity);
      }
      hasWrites = true;
    }

    if (!settingsSnapshot.exists()) {
      batch.set(doc(database, "settings", "team"), DEFAULT_SETTINGS);
      hasWrites = true;
    }

    if (hasWrites) {
      await batch.commit();
    }
  }

  private startListeners() {
    try {
      // 1. Persons / Roster Listener
      const unsubPersons = onSnapshot(
        collection(database, "persons"),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Person[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as Person;
              list.push({ ...data, id: docSnap.id });
            });
            this.persons = sortPersonsAlphabetically(list);
          } else {
            this.persons = [...DEFAULT_PERSONS];
          }
          this.isLoading = false;
          this.notify();
        },
        (err) => {
          console.error("Persons listener error:", err);
          this.connectionError = `Error syncing roster: ${err.message}`;
          this.notify();
        }
      );
      this.unsubscribers.push(unsubPersons);

      // 2. Fine Rules Listener
      const unsubRules = onSnapshot(
        collection(database, "fine_rules"),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: FineRule[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as FineRule;
              list.push({ ...data, id: docSnap.id });
            });
            this.rules = this.sortRulesByFine(list);
          } else {
            this.rules = this.sortRulesByFine([...DEFAULT_FINE_RULES]);
          }
          this.notify();
        },
        (err) => {
          console.error("Rules listener error:", err);
        }
      );
      this.unsubscribers.push(unsubRules);

      // 3. Dugnad Activity Types Listener
      const unsubActs = onSnapshot(
        collection(database, "dugnad_activities"),
        (snapshot) => {
          if (!snapshot.empty) {
            const list: DugnadActivity[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as DugnadActivity;
              list.push({ ...data, id: docSnap.id });
            });
            this.dugnadActivities = list;
          } else {
            this.dugnadActivities = [...DEFAULT_DUGNAD_ACTIVITIES];
          }
          this.notify();
        },
        (err) => {
          console.error("Dugnad activities listener error:", err);
        }
      );
      this.unsubscribers.push(unsubActs);

      // 4. Team Settings Listener
      const unsubSettings = onSnapshot(
        doc(database, "settings", "team"),
        (docSnap) => {
          if (docSnap.exists()) {
            this.settings = { ...DEFAULT_SETTINGS, ...docSnap.data() } as TeamSettings;
          } else {
            this.settings = { ...DEFAULT_SETTINGS };
          }
          this.notify();
        },
        (err) => {
          console.error("Settings listener error:", err);
        }
      );
      this.unsubscribers.push(unsubSettings);

      // 5. Fine Reports Listener
      const unsubFines = onSnapshot(
        collection(database, "fines"),
        (snapshot) => {
          const list: FineReport[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              playerId: d.playerId || "",
              playerName: d.playerName || "",
              ruleIds: d.ruleIds || [],
              ruleTitles: d.ruleTitles || [],
              totalFine: Number(d.totalFine || 0),
              comment: d.comment || "",
              reportedBy: d.reportedBy || "",
              date: d.date || new Date().toISOString(),
              eventContext: d.eventContext || "Practice",
              status: d.status || "pending",
              paid: Boolean(d.paid),
              paidDate: d.paidDate
            });
          });
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          this.fines = list;
          this.notify();
        },
        (err) => {
          console.error("Fines listener error:", err);
          this.connectionError = `Error syncing fines: ${err.message}`;
          this.notify();
        }
      );
      this.unsubscribers.push(unsubFines);

      // 6. Dugnad Entries Listener
      const unsubDugnad = onSnapshot(
        collection(database, "dugnad_entries"),
        (snapshot) => {
          const list: DugnadEntry[] = [];
          snapshot.forEach((docSnap) => {
            const d = docSnap.data();
            list.push({
              id: docSnap.id,
              playerId: d.playerId || "",
              playerName: d.playerName || "",
              activityType: d.activityType || "",
              hours: Number(d.hours || 0),
              points: Number(d.points || 0),
              dutyHours: d.dutyHours != null ? Number(d.dutyHours) : undefined,
              dutyPoints: d.dutyPoints != null ? Number(d.dutyPoints) : undefined,
              hadTravel: Boolean(d.hadTravel),
              travelHours: d.travelHours != null ? Number(d.travelHours) : undefined,
              travelPoints: d.travelPoints != null ? Number(d.travelPoints) : undefined,
              comment: d.comment || "",
              date: d.date || new Date().toISOString(),
              reportedBy: d.reportedBy || "",
              status: d.status || "pending"
            });
          });
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          this.dugnad = list;
          this.notify();
        },
        (err) => {
          console.error("Dugnad listener error:", err);
          this.connectionError = `Error syncing dugnad entries: ${err.message}`;
          this.notify();
        }
      );
      this.unsubscribers.push(unsubDugnad);

    } catch (err: any) {
      console.error("Failed to initialize Firestore listeners:", err);
      this.connectionError = err?.message || "Failed to connect to Firestore";
      this.isLoading = false;
      this.notify();
    }
  }

  // --- Access Key Operations ---

  async loginWithAdminKey(adminKey: string): Promise<void> {
    const cleanKey = adminKey.trim();
    if (!cleanKey) {
      throw new Error("Vennligst oppgi ADMIN_ACCESS_KEY.");
    }

    if (!this.expectedAdminAccessKey) {
      this.isAdminAccessGranted = true;
      this.isAccessGranted = true;
      this.notify();
      return;
    }

    const success = this.verifyAndGrantAdminAccess(cleanKey);
    if (!success) {
      throw new Error("Ugyldig ADMIN_ACCESS_KEY. Vennligst sjekk nøkkelen.");
    }
  }

  async logoutAdmin(): Promise<void> {
    this.revokeAdminAccess();
    this.notify();
  }

  // --- Utility Getters & Helpers ---

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

  // --- Fine Reports Operations ---

  async addFineReport(report: Omit<FineReport, "id" | "date" | "status"> & { date?: string; status?: FineReport["status"] }): Promise<FineReport> {
    const id = "fine_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const newReport: FineReport = {
      ...report,
      id,
      date: report.date || new Date().toISOString(),
      status: report.status || "pending",
      paid: false
    };

    if (!this.isConfigured) {
      this.fines = [newReport, ...this.fines];
      this.notify();
      return newReport;
    }

    try {
      await setDoc(doc(database, "fines", id), {
        ...newReport,
        createdAt: new Date().toISOString()
      });
      return newReport;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `fines/${id}`);
    }
  }

  async updateFine(id: string, updates: Partial<FineReport>): Promise<void> {
    console.log("[H4A Store] updateFine called for id:", id, "updates:", updates);
    this.fines = this.fines.map(f => f.id === id ? { ...f, ...updates } : f);
    this.notify();

    if (!this.isConfigured) {
      console.log("[H4A Store] Firestore not configured; updated fine locally only.");
      return;
    }
    try {
      const cleanUpdates: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null) {
          cleanUpdates[key] = deleteField();
        } else {
          cleanUpdates[key] = value;
        }
      }
      console.log("[H4A Store] Writing fine update to Firestore: fines/" + id, cleanUpdates);
      await setDoc(doc(database, "fines", id), cleanUpdates, { merge: true });
      console.log("[H4A Store] Successfully updated fine in Firestore: fines/" + id);
    } catch (err) {
      console.error("[H4A Store] updateFine failed in Firestore for fines/" + id, err);
      handleFirestoreError(err, OperationType.UPDATE, `fines/${id}`);
    }
  }

  async setFineStatus(id: string, status: "approved" | "rejected" | "pending"): Promise<void> {
    if (!this.isConfigured) {
      this.fines = this.fines.map(f => f.id === id ? { ...f, status } : f);
      this.notify();
      return;
    }
    try {
      await updateDoc(doc(database, "fines", id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `fines/${id}`);
    }
  }

  async deleteFine(fineId: string): Promise<void> {
    if (!this.isConfigured) {
      this.fines = this.fines.filter(f => f.id !== fineId);
      this.notify();
      return;
    }
    try {
      await deleteDoc(doc(database, "fines", fineId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `fines/${fineId}`);
    }
  }

  // --- Dugnad / Volunteer Operations ---

  async addDugnadEntry(entry: Omit<DugnadEntry, "id" | "date" | "status"> & { date?: string; status?: DugnadEntry["status"] }): Promise<DugnadEntry> {
    const id = "dug_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    const newEntry: DugnadEntry = {
      ...entry,
      id,
      date: entry.date || new Date().toISOString(),
      status: entry.status || "pending"
    };

    if (!this.isConfigured) {
      this.dugnad = [newEntry, ...this.dugnad];
      this.notify();
      return newEntry;
    }

    try {
      await setDoc(doc(database, "dugnad_entries", id), {
        ...newEntry,
        createdAt: new Date().toISOString()
      });
      return newEntry;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `dugnad_entries/${id}`);
    }
  }

  async updateDugnad(id: string, updates: Partial<DugnadEntry>): Promise<void> {
    console.log("[H4A Store] updateDugnad called for id:", id, "updates:", updates);
    this.dugnad = this.dugnad.map(d => d.id === id ? { ...d, ...updates } : d);
    this.notify();

    if (!this.isConfigured) {
      console.log("[H4A Store] Firestore not configured; updated dugnad locally only.");
      return;
    }
    try {
      const cleanUpdates: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null) {
          cleanUpdates[key] = deleteField();
        } else {
          cleanUpdates[key] = value;
        }
      }
      console.log("[H4A Store] Writing dugnad update to Firestore: dugnad_entries/" + id, cleanUpdates);
      await setDoc(doc(database, "dugnad_entries", id), cleanUpdates, { merge: true });
      console.log("[H4A Store] Successfully updated dugnad in Firestore: dugnad_entries/" + id);
    } catch (err) {
      console.error("[H4A Store] updateDugnad failed in Firestore for dugnad_entries/" + id, err);
      handleFirestoreError(err, OperationType.UPDATE, `dugnad_entries/${id}`);
    }
  }

  async setDugnadStatus(id: string, status: "approved" | "rejected" | "pending"): Promise<void> {
    if (!this.isConfigured) {
      this.dugnad = this.dugnad.map(d => d.id === id ? { ...d, status } : d);
      this.notify();
      return;
    }
    try {
      await updateDoc(doc(database, "dugnad_entries", id), { status });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `dugnad_entries/${id}`);
    }
  }

  async deleteDugnad(dugnadId: string): Promise<void> {
    if (!this.isConfigured) {
      this.dugnad = this.dugnad.filter(d => d.id !== dugnadId);
      this.notify();
      return;
    }
    try {
      await deleteDoc(doc(database, "dugnad_entries", dugnadId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `dugnad_entries/${dugnadId}`);
    }
  }

  // --- Roster / Persons Operations ---

  async addPerson(firstName: string, lastName: string, role: string = "Player", type: "player" | "coach" = "player", number?: number): Promise<Person> {
    const id = "person_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
    const newPerson: Person = {
      id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: role.trim(),
      type,
      number: (number !== undefined && !isNaN(number)) ? number : undefined,
      active: true
    };

    console.log("[H4A Store] addPerson called:", newPerson);

    // Optimistically update local state
    this.persons = sortPersonsAlphabetically([...this.persons, newPerson]);
    this.notify();

    if (!this.isConfigured) {
      return newPerson;
    }

    try {
      const cleanData: Record<string, any> = {};
      for (const [k, v] of Object.entries(newPerson)) {
        if (v !== undefined) {
          cleanData[k] = v;
        }
      }
      await setDoc(doc(database, "persons", id), cleanData);
      console.log("[H4A Store] addPerson successfully persisted to Firestore:", id);
      return newPerson;
    } catch (err) {
      console.error("[H4A Store] addPerson failed in Firestore for persons/" + id, err);
      handleFirestoreError(err, OperationType.CREATE, `persons/${id}`);
    }
  }

  async updatePerson(id: string, updates: Partial<Person>): Promise<void> {
    console.log("[H4A Store] updatePerson called for id:", id, "updates:", updates);

    // 1. Optimistically update local state immediately so UI updates
    const existing = this.persons.find(p => p.id === id);
    const updatedPerson: Person = {
      id,
      firstName: updates.firstName !== undefined ? updates.firstName : (existing?.firstName ?? ""),
      lastName: updates.lastName !== undefined ? updates.lastName : (existing?.lastName ?? ""),
      role: updates.role !== undefined ? updates.role : (existing?.role ?? "Player"),
      type: updates.type !== undefined ? updates.type : (existing?.type ?? "player"),
      number: updates.number !== undefined ? updates.number : (updates.number === null ? undefined : existing?.number),
      active: updates.active !== undefined ? updates.active : (existing?.active ?? true)
    };

    this.persons = sortPersonsAlphabetically(this.persons.map(p => p.id === id ? updatedPerson : p));
    this.notify();

    if (!this.isConfigured) {
      console.log("[H4A Store] Firestore not configured; updated locally only.");
      return;
    }

    // 2. Prepare sanitized payload for Firestore
    try {
      const cleanUpdates: Record<string, any> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === null) {
          // In Firestore, removing a field like 'number' requires deleteField()
          cleanUpdates[key] = deleteField();
        } else {
          cleanUpdates[key] = value;
        }
      }

      console.log("[H4A Store] Writing person update to Firestore: persons/" + id, cleanUpdates);
      // Use setDoc with merge: true so it creates or updates whether the document was in-memory or already stored
      await setDoc(doc(database, "persons", id), cleanUpdates, { merge: true });
      console.log("[H4A Store] Successfully updated person in Firestore: persons/" + id);
    } catch (err) {
      console.error("[H4A Store] updatePerson failed in Firestore for persons/" + id, err);
      handleFirestoreError(err, OperationType.UPDATE, `persons/${id}`);
    }
  }

  async removePerson(personId: string): Promise<void> {
    console.log("[H4A Store] removePerson called for:", personId);
    this.persons = this.persons.filter(p => p.id !== personId);
    this.notify();

    if (!this.isConfigured) {
      return;
    }
    try {
      await deleteDoc(doc(database, "persons", personId));
      console.log("[H4A Store] Successfully deleted person from Firestore: persons/" + personId);
    } catch (err) {
      console.error("[H4A Store] removePerson failed in Firestore for persons/" + personId, err);
      handleFirestoreError(err, OperationType.DELETE, `persons/${personId}`);
    }
  }

  // --- Direct Person Adjustment (Admin) ---

  async setPersonTotals(personId: string, targetFineSum?: number, targetDutyHours?: number): Promise<void> {
    const person = this.persons.find(p => p.id === personId);
    const pName = person ? `${person.firstName} ${person.lastName}`.trim() : "Player";

    if (targetFineSum !== undefined && !isNaN(targetFineSum)) {
      const approvedFines = this.fines.filter(f => f.playerId === personId && f.status === "approved");
      const currentFineSum = approvedFines.reduce((sum, f) => sum + (f.totalFine || 0), 0);
      const diff = Math.round(targetFineSum - currentFineSum);
      if (diff !== 0) {
        const id = "fine_adj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
        const adjFine: FineReport = {
          id,
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
        if (!this.isConfigured) {
          this.fines = [adjFine, ...this.fines];
        } else {
          await setDoc(doc(database, "fines", id), adjFine);
        }
      }
    }

    if (targetDutyHours !== undefined && !isNaN(targetDutyHours)) {
      const approvedDugnad = this.dugnad.filter(d => d.playerId === personId && d.status === "approved");
      const currentHours = approvedDugnad.reduce((sum, d) => sum + (d.hours || 0), 0);
      const hoursDiff = Number((targetDutyHours - currentHours).toFixed(2));
      if (hoursDiff !== 0) {
        const id = "dug_adj_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6);
        const pointsDiff = Math.round(hoursDiff * (this.settings.hourlyPointsRate || 10));
        const adjDugnad: DugnadEntry = {
          id,
          playerId: personId,
          playerName: pName,
          activityType: "Admin direct duty adjustment",
          hours: hoursDiff,
          points: pointsDiff,
          comment: `Direct admin adjustment to set total duty to ${targetDutyHours} hrs`,
          date: new Date().toISOString(),
          status: "approved"
        };
        if (!this.isConfigured) {
          this.dugnad = [adjDugnad, ...this.dugnad];
        } else {
          await setDoc(doc(database, "dugnad_entries", id), adjDugnad);
        }
      }
    }

    if (!this.isConfigured) {
      this.notify();
    }
  }

  // --- Fine Rules Operations ---

  async addFineRule(rule: Omit<FineRule, "id">): Promise<FineRule> {
    const id = "rule_" + Date.now();
    const newRule: FineRule = { ...rule, id };
    if (!this.isConfigured) {
      this.rules = this.sortRulesByFine([...this.rules, newRule]);
      this.notify();
      return newRule;
    }
    try {
      await setDoc(doc(database, "fine_rules", id), newRule);
      return newRule;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `fine_rules/${id}`);
    }
  }

  async updateFineRule(id: string, updates: Partial<FineRule>): Promise<void> {
    this.rules = this.sortRulesByFine(this.rules.map(r => r.id === id ? { ...r, ...updates } : r));
    this.notify();

    if (!this.isConfigured) {
      return;
    }
    try {
      const cleanUpdates: Record<string, any> = {};
      for (const [k, v] of Object.entries(updates)) {
        cleanUpdates[k] = v === undefined ? deleteField() : v;
      }
      await setDoc(doc(database, "fine_rules", id), cleanUpdates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `fine_rules/${id}`);
    }
  }

  async deleteFineRule(ruleId: string): Promise<void> {
    if (!this.isConfigured) {
      this.rules = this.rules.filter(r => r.id !== ruleId);
      this.notify();
      return;
    }
    try {
      await deleteDoc(doc(database, "fine_rules", ruleId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `fine_rules/${ruleId}`);
    }
  }

  // --- Volunteer Activities Operations ---

  async addDugnadActivity(activity: Omit<DugnadActivity, "id">): Promise<DugnadActivity> {
    const id = "dug_act_" + Date.now();
    const newActivity: DugnadActivity = { ...activity, id };
    if (!this.isConfigured) {
      this.dugnadActivities = [...this.dugnadActivities, newActivity];
      this.notify();
      return newActivity;
    }
    try {
      await setDoc(doc(database, "dugnad_activities", id), newActivity);
      return newActivity;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `dugnad_activities/${id}`);
    }
  }

  async updateDugnadActivity(id: string, updates: Partial<DugnadActivity>): Promise<void> {
    this.dugnadActivities = this.dugnadActivities.map(a => a.id === id ? { ...a, ...updates } : a);
    this.notify();

    if (!this.isConfigured) {
      return;
    }
    try {
      const cleanUpdates: Record<string, any> = {};
      for (const [k, v] of Object.entries(updates)) {
        cleanUpdates[k] = v === undefined ? deleteField() : v;
      }
      await setDoc(doc(database, "dugnad_activities", id), cleanUpdates, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `dugnad_activities/${id}`);
    }
  }

  async deleteDugnadActivity(id: string): Promise<void> {
    if (!this.isConfigured) {
      this.dugnadActivities = this.dugnadActivities.filter(a => a.id !== id);
      this.notify();
      return;
    }
    try {
      await deleteDoc(doc(database, "dugnad_activities", id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `dugnad_activities/${id}`);
    }
  }

  // --- Settings Operations ---

  async updateSettings(newSettings: Partial<TeamSettings>): Promise<void> {
    if (!this.isConfigured) {
      this.settings = { ...this.settings, ...newSettings };
      this.notify();
      return;
    }
    try {
      await setDoc(doc(database, "settings", "team"), newSettings, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings/team");
    }
  }

  async setFinePotPublished(published: boolean): Promise<void> {
    if (!this.isConfigured) {
      this.settings = { ...this.settings, finePotPublished: published };
      this.notify();
      return;
    }
    try {
      await setDoc(doc(database, "settings", "team"), { finePotPublished: published }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "settings/team");
    }
  }

  // --- Initial Seeding / Reset Data (Admin) ---

  async resetToDefaultData(): Promise<void> {
    if (!this.isConfigured) {
      this.persons = [...DEFAULT_PERSONS];
      this.rules = this.sortRulesByFine([...DEFAULT_FINE_RULES]);
      this.dugnadActivities = [...DEFAULT_DUGNAD_ACTIVITIES];
      this.settings = { ...DEFAULT_SETTINGS };
      this.fines = [];
      this.dugnad = [];
      this.notify();
      return;
    }
    const batch = writeBatch(database);

    // Seed Persons
    for (const p of DEFAULT_PERSONS) {
      batch.set(doc(database, "persons", p.id), p);
    }

    // Seed Fine Rules
    for (const r of DEFAULT_FINE_RULES) {
      batch.set(doc(database, "fine_rules", r.id), r);
    }

    // Seed Dugnad Activities
    for (const d of DEFAULT_DUGNAD_ACTIVITIES) {
      batch.set(doc(database, "dugnad_activities", d.id), d);
    }

    // Seed Settings
    batch.set(doc(database, "settings", "team"), DEFAULT_SETTINGS);

    await batch.commit();
    this.notify();
  }

  // --- Team Data Export & Import (Backup System) ---

  exportTeamData(): TeamDataBackup {
    const playersList: PlayerBackupData[] = this.persons
      .filter((p) => p.type === "player")
      .map((player) => {
        const playerFines = this.fines.filter((f) => f.playerId === player.id);
        const playerDugnad = this.dugnad.filter((d) => d.playerId === player.id);
        const totalFineSum = playerFines
          .filter((f) => f.status === "approved")
          .reduce((sum, f) => sum + (f.totalFine || 0), 0);
        const totalDugnadHours = playerDugnad
          .filter((d) => d.status === "approved")
          .reduce((sum, d) => sum + (d.hours || 0), 0);
        const totalDugnadPoints = playerDugnad
          .filter((d) => d.status === "approved")
          .reduce((sum, d) => sum + (d.points || 0), 0);

        return {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          number: player.number,
          role: player.role,
          type: "player" as const,
          active: player.active !== false,
          totalFineSum,
          totalDugnadHours: Number(totalDugnadHours.toFixed(1)),
          totalDugnadPoints: Math.round(totalDugnadPoints),
          fines: playerFines,
          dugnad: playerDugnad
        };
      });

    const coachesList = this.persons.filter((p) => p.type === "coach");

    const playerIds = new Set(this.persons.map((p) => p.id));
    const unassignedFines = this.fines.filter((f) => !playerIds.has(f.playerId));
    const unassignedDugnad = this.dugnad.filter((d) => !playerIds.has(d.playerId));

    return {
      _documentation: {
        title: "H4A Volleyball Team Data Backup",
        description: "Authoritative portable JSON backup of team roster, fines, and dugnad duty records.",
        howToPopulate: "This file was exported directly from live application state. You can replace data/team-data.json with this file or keep it as an external backup.",
        howToRestore: "Import via the 'Backup & Data' tab in the Admin dashboard (/admin?key=YOUR_KEY)."
      },
      version: "1.0",
      exportedAt: new Date().toISOString(),
      teamSettings: { ...this.settings },
      fineRules: [...this.rules],
      dugnadActivities: [...this.dugnadActivities],
      players: playersList,
      coaches: coachesList,
      ...(unassignedFines.length > 0 ? { unassignedFines } : {}),
      ...(unassignedDugnad.length > 0 ? { unassignedDugnad } : {})
    };
  }

  async importTeamData(
    backup: TeamDataBackup,
    mode: "merge" | "replace"
  ): Promise<{ playersCount: number; finesCount: number; dugnadCount: number }> {
    if (!backup || typeof backup !== "object") {
      throw new Error("Ugyldig data: backup-filen er ikke et gyldig JSON-objekt.");
    }
    if (!Array.isArray(backup.players)) {
      throw new Error("Ugyldig backupformat: 'players' må være en liste med spillere.");
    }

    const importedPersons: Person[] = [];
    const allFines: FineReport[] = [];
    const allDugnad: DugnadEntry[] = [];

    // 1. Process players
    backup.players.forEach((p, idx) => {
      const pid = p.id || `p_${Date.now()}_${idx}`;
      const fullName = `${p.firstName || ""} ${p.lastName || ""}`.trim() || `Player #${p.number || idx + 1}`;
      importedPersons.push({
        id: pid,
        firstName: p.firstName || "Player",
        lastName: p.lastName || `${idx + 1}`,
        number: p.number != null ? Number(p.number) : undefined,
        role: p.role || "Player",
        type: "player",
        active: p.active !== false
      });

      if (Array.isArray(p.fines)) {
        p.fines.forEach((f, fIdx) => {
          allFines.push({
            id: f.id || `fine_${pid}_${fIdx}_${Date.now()}`,
            playerId: pid,
            playerName: f.playerName || fullName,
            ruleIds: Array.isArray(f.ruleIds) ? f.ruleIds : [],
            ruleTitles: Array.isArray(f.ruleTitles) ? f.ruleTitles : [],
            totalFine: Number(f.totalFine || 0),
            comment: f.comment || "",
            reportedBy: f.reportedBy || "",
            date: f.date || new Date().toISOString(),
            eventContext: f.eventContext || "Other",
            status: f.status || "approved",
            paid: Boolean(f.paid),
            paidDate: f.paidDate || undefined
          });
        });
      }

      if (Array.isArray(p.dugnad)) {
        p.dugnad.forEach((d, dIdx) => {
          allDugnad.push({
            id: d.id || `dugnad_${pid}_${dIdx}_${Date.now()}`,
            playerId: pid,
            playerName: d.playerName || fullName,
            activityType: d.activityType || "Other club duty",
            hours: Number(d.hours || 0),
            points: Number(d.points || 0),
            dutyHours: d.dutyHours != null ? Number(d.dutyHours) : undefined,
            dutyPoints: d.dutyPoints != null ? Number(d.dutyPoints) : undefined,
            hadTravel: Boolean(d.hadTravel),
            travelHours: d.travelHours != null ? Number(d.travelHours) : undefined,
            travelPoints: d.travelPoints != null ? Number(d.travelPoints) : undefined,
            comment: d.comment || "",
            date: d.date || new Date().toISOString(),
            reportedBy: d.reportedBy || "",
            status: d.status || "approved"
          });
        });
      }
    });

    // 2. Process coaches
    if (Array.isArray(backup.coaches)) {
      backup.coaches.forEach((c, idx) => {
        importedPersons.push({
          id: c.id || `c_${Date.now()}_${idx}`,
          firstName: c.firstName || "Coach",
          lastName: c.lastName || `${idx + 1}`,
          role: c.role || "Coach",
          type: "coach",
          active: c.active !== false
        });
      });
    }

    // 3. Process unassigned fines and dugnad
    if (Array.isArray(backup.unassignedFines)) {
      backup.unassignedFines.forEach((f) => allFines.push(f));
    }
    if (Array.isArray(backup.unassignedDugnad)) {
      backup.unassignedDugnad.forEach((d) => allDugnad.push(d));
    }

    // 4. Persistence
    if (!this.isConfigured) {
      if (mode === "replace") {
        this.persons = sortPersonsAlphabetically(importedPersons);
        this.fines = allFines;
        this.dugnad = allDugnad;
      } else {
        const personMap = new Map(this.persons.map((p) => [p.id, p]));
        importedPersons.forEach((p) => personMap.set(p.id, p));
        this.persons = sortPersonsAlphabetically(Array.from(personMap.values()));

        const fineMap = new Map(this.fines.map((f) => [f.id, f]));
        allFines.forEach((f) => fineMap.set(f.id, f));
        this.fines = Array.from(fineMap.values());

        const dugnadMap = new Map(this.dugnad.map((d) => [d.id, d]));
        allDugnad.forEach((d) => dugnadMap.set(d.id, d));
        this.dugnad = Array.from(dugnadMap.values());
      }

      if (Array.isArray(backup.fineRules) && backup.fineRules.length > 0) {
        this.rules = this.sortRulesByFine(backup.fineRules);
      }
      if (Array.isArray(backup.dugnadActivities) && backup.dugnadActivities.length > 0) {
        this.dugnadActivities = backup.dugnadActivities;
      }
      if (backup.teamSettings) {
        this.settings = { ...this.settings, ...backup.teamSettings };
      }
      this.notify();
      return {
        playersCount: importedPersons.filter((p) => p.type === "player").length,
        finesCount: allFines.length,
        dugnadCount: allDugnad.length
      };
    }

    // Live Firestore Persistence
    try {
      if (mode === "replace") {
        const newPersonIds = new Set(importedPersons.map((p) => p.id));
        const newFineIds = new Set(allFines.map((f) => f.id));
        const newDugnadIds = new Set(allDugnad.map((d) => d.id));

        const removePersons = this.persons.filter((p) => !newPersonIds.has(p.id));
        const removeFines = this.fines.filter((f) => !newFineIds.has(f.id));
        const removeDugnad = this.dugnad.filter((d) => !newDugnadIds.has(d.id));

        for (const p of removePersons) {
          await deleteDoc(doc(database, "persons", p.id));
        }
        for (const f of removeFines) {
          await deleteDoc(doc(database, "fines", f.id));
        }
        for (const d of removeDugnad) {
          await deleteDoc(doc(database, "dugnad_entries", d.id));
        }
      }

      // Write persons
      for (const p of importedPersons) {
        await setDoc(doc(database, "persons", p.id), p, { merge: true });
      }

      // Write fines
      for (const f of allFines) {
        await setDoc(doc(database, "fines", f.id), f, { merge: true });
      }

      // Write dugnad entries
      for (const d of allDugnad) {
        await setDoc(doc(database, "dugnad_entries", d.id), d, { merge: true });
      }

      // Write rules if present
      if (Array.isArray(backup.fineRules) && backup.fineRules.length > 0) {
        for (const r of backup.fineRules) {
          await setDoc(doc(database, "fine_rules", r.id), r, { merge: true });
        }
      }

      // Write activities if present
      if (Array.isArray(backup.dugnadActivities) && backup.dugnadActivities.length > 0) {
        for (const a of backup.dugnadActivities) {
          await setDoc(doc(database, "dugnad_activities", a.id), a, { merge: true });
        }
      }

      // Write settings if present
      if (backup.teamSettings) {
        await setDoc(doc(database, "settings", "team"), { ...this.settings, ...backup.teamSettings }, { merge: true });
      }

      this.notify();
      return {
        playersCount: importedPersons.filter((p) => p.type === "player").length,
        finesCount: allFines.length,
        dugnadCount: allDugnad.length
      };
    } catch (err: any) {
      console.error("Firestore import failed:", err);
      handleFirestoreError(err, OperationType.WRITE, "import");
      throw err;
    }
  }
}

export const h4aStore = new H4ADataManager();
