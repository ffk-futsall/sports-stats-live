import type { Match } from '../types/index';

type ProtocolReference = { portalMatchId: string; phase: string };
const scoreNumber = (value: unknown): number | null => {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+$/.test(String(value).trim())) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : null;
};
const dateKey = (match: Match) => /^\d{4}-\d{2}-\d{2}$/.test(match.date || '') ? `${match.date} ${/^\d{2}:\d{2}/.test(match.time || '') ? match.time : '00:00'}` : '';
const unique = (matches: Match[]) => [...new Map(matches.map(m => [m.id, m])).values()];
const sortDates = (direction: 1 | -1) => (a: Match, b: Match) => {
  const x = dateKey(a), y = dateKey(b);
  if (!x || !y) return x ? -1 : y ? 1 : 0;
  return direction * x.localeCompare(y);
};
export const hasResult = (m: Match) => scoreNumber(m.homeScore) !== null && scoreNumber(m.awayScore) !== null;

// Compare only completed, recorded results, regardless of home/away orientation.
export function getHeadToHeadHistory(matches: Match[], teamA: string, teamB: string, currentId: string) {
  const meetings = unique(matches).filter(m => m.id !== currentId && m.status === 'finished' && hasResult(m) && ((m.homeTeamId === teamA && m.awayTeamId === teamB) || (m.homeTeamId === teamB && m.awayTeamId === teamA))).sort(sortDates(-1));
  const result = { meetings, teamAWins: 0, teamBWins: 0, draws: 0, teamAGoals: 0, teamBGoals: 0 };
  for (const m of meetings) {
    const a = scoreNumber(m.homeTeamId === teamA ? m.homeScore : m.awayScore)!;
    const b = scoreNumber(m.homeTeamId === teamB ? m.homeScore : m.awayScore)!;
    result.teamAGoals += a; result.teamBGoals += b;
    if (a > b) result.teamAWins++; else if (b > a) result.teamBWins++; else result.draws++;
  }
  return result;
}

export function getTeamMatchHistory(matches: Match[], teamId: string, currentId: string, protocols: ProtocolReference[], today: string) {
  // A portal fixture can remain planned while its protocol is already live or finished.
  const underway = new Set(protocols.filter(p => p.phase && p.phase !== 'setup').map(p => p.portalMatchId));
  const teamMatches = unique(matches).filter(m => m.id !== currentId && (m.homeTeamId === teamId || m.awayTeamId === teamId));
  const past = teamMatches.filter(m => m.status === 'finished').sort(sortDates(-1)).slice(0, 5);
  const upcoming = teamMatches.filter(m => m.status === 'planned' && !underway.has(m.id) && (!dateKey(m) || m.date! >= today)).sort(sortDates(1)).slice(0, 5);
  return { past, upcoming };
}
