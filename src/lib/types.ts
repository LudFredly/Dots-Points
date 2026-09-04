export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  number?: number;
  role?: string; // e.g. "Setter", "Outside Hitter", "Middle Blocker", "Opposite", "Libero", "Head Coach", "Assistant Coach", "Player"
  type: "player" | "coach";
  active?: boolean;
  exemptFromDutyReverse?: boolean;
}

// Alias for Player
export type Player = Person;

export interface FineRule {
  id: string;
  title: string;
  fine?: number; // fallback/summary rate
  fineMatch?: number; // Match rate (kr)
  finePractice?: number; // Practice rate (kr)
  fineSocial?: number; // Social rate (kr)
  category?: string;
  description?: string;
}

export type OccasionType = "Practice" | "Match" | "Social" | "Other";

export interface FineReport {
  id: string;
  playerId: string; // ID of the person (player or coach)
  playerName: string; // Snapshot display name or full name
  ruleIds: string[];
  ruleTitles: string[];
  totalFine: number;
  comment: string;
  reportedBy?: string;
  date: string; // ISO string
  eventContext: OccasionType | string; // "Practice", "Match", "Social", "Other"
  status: "pending" | "approved" | "rejected";
  paid?: boolean;
  paidDate?: string;
}

export interface DugnadActivity {
  id: string;
  title: string;
  defaultHours: number;
  pointsPer: number;
  pointsType: "perHour" | "fixed";
  description?: string;
}

export interface DugnadEntry {
  id: string;
  playerId: string; // player ID only
  playerName: string;
  activityType: string;
  hours: number; // total duty + travel hours
  points: number; // total duty + travel points
  dutyHours?: number;
  dutyPoints?: number;
  hadTravel?: boolean;
  travelHours?: number;
  travelPoints?: number;
  comment?: string;
  date: string; // ISO string
  reportedBy?: string;
  status: "pending" | "approved" | "rejected";
}

export interface TeamSettings {
  teamName: string;
  season: string; // e.g. "26/27"
  finePotPublished: boolean;
  hourlyPointsRate: number;
}

export interface PlayerBackupData extends Person {
  totalFineSum: number;
  totalDugnadHours: number;
  totalDugnadPoints: number;
  fines: FineReport[];
  dugnad: DugnadEntry[];
}

export interface TeamDataBackup {
  _documentation?: {
    title?: string;
    description?: string;
    howToPopulate?: string;
    howToRestore?: string;
  };
  version: string;
  exportedAt: string;
  teamSettings?: Partial<TeamSettings>;
  fineRules?: FineRule[];
  dugnadActivities?: DugnadActivity[];
  players: PlayerBackupData[];
  coaches?: Person[];
  unassignedFines?: FineReport[];
  unassignedDugnad?: DugnadEntry[];
}
