export interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export type CompetitionType = 'superliga' | 'liga_pare' | 'kupa';

export interface Competition {
  id: string;
  name: string;
  type: CompetitionType;
  seasonId: string;
  isActiveLanding: boolean;
}

export interface Team {
  id: string;
  name: string;
  logo: string;
  competitionId: string;
  seasonId: string;
  foundedYear?: string;
  stadium?: string;

  city?: string;}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  birthDate?: string;
  position?: string;
  teamId: string;
  seasonId: string;
}

export type MatchStatus = 'planned' | 'live' | 'finished' | 'cancelled';

export interface Match {
  id: string;
  competitionId: string;
  seasonId: string;
  week: number;
  date?: string;
  time?: string;
  venue?: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  status: MatchStatus;
  /** Presentation-only result derived from a published protocol; never persisted as an official result. */
  protocolResult?: 'live' | 'finished';
  isFeaturedLanding: boolean;
  referee1?: string;
  referee2?: string;
  referee3?: string;
  delegate?: string;
  dayOfWeek?: string;
  possession_home?: number;
  possession_away?: number;
  shots_home?: number;
  shots_away?: number;
  fouls_home?: number;
  fouls_away?: number;
}

export interface Goal {
  id: string;
  matchId: string;
  playerId: string;
  teamId: string;
  minute: number;
  isOwnGoal: boolean;
}

export interface Scorer {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  teamId: string;
  competitionId: string;
  seasonId: string;
  goals: number;
  isManual: boolean;
  matchId?: string;
}

export interface PlayerOfWeek {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  teamId: string;
  week: number;
  seasonId: string;
  isScorer: boolean;
  goalsCount: number;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'editor';
}

export interface StandingsRow {
  teamId: string;
  teamName: string;
  teamLogo: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: string[];
}

export interface CupRound {
  id: string;
  name: string;
  order: number;
  competitionId: string;
  seasonId: string;
}

export interface ShortiRubrik {
  id: string;
  number: number;
  teamId: string | null;
}

export interface AppSettings {
  whatsappNumber?: string;
  appName: string;
  logo: string;
  contact: string;
  hiddenNavPaths?: string[];
  votingEnabled?: boolean;
  suspensionRules?: {
    yellowThreshold: number;
    yellowSuspensionMatches: number;
    redSuspensionMatches: number;
  };
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  week: number;
  seasonId: string;
  isFeatured: boolean;
}

export interface Editor {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  password: string;
  phone: string;
  email: string;
  teamId: string;
  status: 'pending' | 'approved' | 'rejected';
  seasonId: string;
}

export interface Official {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  photo: string;
  teamId: string;
  seasonId: string;
  addedByEditorId: string;
}

export interface PlayerStats {
  id: string;
  playerId: string;
  teamId: string;
  competitionId: string;
  seasonId: string;
  week: number;
  yellowCards: number;
  redCards: number;
  extraNotes: string;
}

export interface NationalPlayer {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  position: string;
  number?: number;
  birthDate?: string;
  club?: string;
  caps?: number;
  goals?: number;
}

export interface NationalMatch {
  id: string;
  opponent: string;
  opponentLogo: string;
  date?: string;
  time?: string;
  venue?: string;
  competition: string;
  homeScore?: number;
  awayScore?: number;
  isHome: boolean;
  status: 'planned' | 'live' | 'finished';
  liveUrl?: string;
}


export interface Video {
  id: string;
  title: string;
  description: string;
  url: string;
  isFeaturedLanding: boolean;
  isFeaturedSuperliga?: boolean;
  isFeaturedLigaPare?: boolean;
  createdAt?: string;
}

export interface News {
  id: string;
  title: string;
  description: string;
  content: string;
  photo: string;
  videoUrl?: string;
  isFeaturedLanding: boolean;
  createdAt?: string;
}

export interface NationalTeamPlayer {
  id: string;
  firstName: string;
  lastName: string;
  position?: string;
  number?: number;
  photo?: string;
  birthDate?: string;
  club?: string;
  goals?: number;
  appearances?: number;
}

export interface NationalTeamMatch {
  id: string;
  opponent: string;
  opponentLogo?: string;
  date?: string;
  time?: string;
  venue?: string;
  type?: string; // 'friendly' | 'qualifier' | 'tournament'
  homeScore?: number;
  awayScore?: number;
  status?: string; // 'planned' | 'finished' | 'live'
  isHome?: boolean;
}

export interface NationalTeamStaff {
  id: string;
  name: string;
  role: string;
  photo?: string;
}

export interface NtCompetition {
  id: string;
  name: string;
  year?: string;
}

export interface NtGroup {
  id: string;
  competitionId: string;
  name: string;
}

export interface NtGroupTeam {
  id: string;
  groupId: string;
  teamName: string;
  teamLogo?: string;
  isKosova?: boolean;
}

export interface NtGroupMatch {
  id: string;
  groupId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  date?: string;
  time?: string;
  venue?: string;
  status?: string;
}

export interface NormativeAct {
  id: string;
  title: string;
  description?: string;
  pdfUrl: string;
  order?: number;
  createdAt?: string;
}

// ============ PROTOKOLLI ELEKTRONIK I NDESHJES (Match Sheet) ============
export interface MatchSheet {
  id: string;
  matchId: string;
  teamId: string;
  seasonId: string;
  playerIds: string[];
  captainId?: string;
  goalkeeperId?: string;
  notes?: string;
  submittedBy?: string;
  createdAt: string;
}

// ============ DOCUMENT CENTER ============
export type ClubDocumentCategory = 'licence' | 'raport' | 'njoftim' | 'ndeshje' | 'tjeter';

export interface ClubDocument {
  id: string;
  // '' / 'all' = dokument i dukshem per te GJITHA klubet (p.sh. njoftim i FFK-se)
  teamId: string;
  title: string;
  category: ClubDocumentCategory;
  url: string;
  seasonId?: string;
  uploadedBy?: string;
  createdAt: string;
}


