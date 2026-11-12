import type { Match, StandingsRow, Team } from '@/types';
import type { ProtocolMatch } from '@/components/ProtocolLiveMatches';

type MatchScore = { home: number; away: number };
type LiveResult = { matchId: string; score: string; result: 'win'|'draw'|'loss'; provisional: boolean };
export type LiveStandingsRow = StandingsRow & { liveResults: LiveResult[]; positionChange: number };

// Empty, malformed and negative scores are never interpreted as a 0–0 draw.
function scoreNumber(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (!/^\d+$/.test(String(value).trim())) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}
function score(home: unknown, away: unknown): MatchScore | null {
  const h=scoreNumber(home), a=scoreNumber(away);
  return h===null || a===null ? null : {home:h,away:a};
}
function sortRows<T extends StandingsRow>(rows:T[]):T[] {
  return rows.sort((a,b)=>b.points-a.points || b.goalDifference-a.goalDifference || b.goalsFor-a.goalsFor || a.teamName.localeCompare(b.teamName));
}
const chronological=(a:Match,b:Match)=>((a.date||'9999').localeCompare(b.date||'9999') || (a.time||'').localeCompare(b.time||'') || (a.week||0)-(b.week||0) || a.id.localeCompare(b.id));
function applyResult(home:StandingsRow,away:StandingsRow,s:MatchScore) {
  home.played++; away.played++;
  home.goalsFor+=s.home; home.goalsAgainst+=s.away;
  away.goalsFor+=s.away; away.goalsAgainst+=s.home;
  if(s.home>s.away){home.won++;home.points+=3;away.lost++;home.form.push('W');away.form.push('L');}
  else if(s.home<s.away){away.won++;away.points+=3;home.lost++;home.form.push('L');away.form.push('W');}
  else {home.drawn++;away.drawn++;home.points++;away.points++;home.form.push('D');away.form.push('D');}
  home.goalDifference=home.goalsFor-home.goalsAgainst;away.goalDifference=away.goalsFor-away.goalsAgainst;
  home.form=home.form.slice(-5);away.form=away.form.slice(-5);
}
export function calculateLeagueStandings(teams:Team[], matches:Match[], competitionId:string):StandingsRow[] {
  const rows:StandingsRow[]=teams.filter(t=>t.competitionId===competitionId).map(t=>({teamId:t.id,teamName:t.name,teamLogo:t.logo,played:0,won:0,drawn:0,lost:0,goalsFor:0,goalsAgainst:0,goalDifference:0,points:0,form:[]}));
  const byId=new Map(rows.map(r=>[r.teamId,r]));
  // Chronological order ensures the form column represents the latest five games.
  const completed=matches.filter(m=>m.competitionId===competitionId&&m.status==='finished').slice().sort(chronological);
  for(const m of completed){const home=byId.get(m.homeTeamId),away=byId.get(m.awayTeamId),s=score(m.homeScore,m.awayScore);if(home&&away&&home!==away&&s)applyResult(home,away,s);}
  return sortRows(rows);
}
export function calculateLiveStandings(teams:Team[],matches:Match[],protocols:ProtocolMatch[],competitionId:string):LiveStandingsRow[] {
  const official=calculateLeagueStandings(teams,matches,competitionId);
  const positions=new Map(official.map((row,i)=>[row.teamId,i]));
  const rows:LiveStandingsRow[]=official.map(row=>({...row,form:[...row.form],liveResults:[],positionChange:0}));
  const byId=new Map(rows.map(r=>[r.teamId,r]));
  // A published report is connected by portalMatchId, never by an uncertain team name.
  const reports=new Map<string,ProtocolMatch>();
  for(const p of protocols)if(p.portalMatchId && (!reports.has(p.portalMatchId) || (p.updatedAt||'')>(reports.get(p.portalMatchId)?.updatedAt||'')))reports.set(p.portalMatchId,p);
  const projected:Match[]=[];
  const started=new Set(['first','halftime','second','after_second','extra','after_extra','penalties','finished']);
  for(const match of matches){
    if(match.competitionId!==competitionId || match.status==='finished' || match.status==='cancelled')continue;
    const home=byId.get(match.homeTeamId),away=byId.get(match.awayTeamId);
    if(!home || !away || home===away)continue;
    const report=reports.get(match.id);
    let current:MatchScore|null=null,provisional=false;
    if(report && started.has(report.phase)){
      provisional=report.phase==='finished';
      const final=report.scores?.final,live=report.scores?.live;
      current=(provisional && final ? score(final.a,final.b) : null) || (live ? score(live.a,live.b) : null);
    } else if(!report && match.status==='live')current=score(match.homeScore,match.awayScore);
    if(!current)continue;
    applyResult(home,away,current);
    projected.push({...match,status:'finished',homeScore:current.home,awayScore:current.away});
    const hResult=current.home>current.away?'win':current.home<current.away?'loss':'draw';
    const aResult=current.home<current.away?'win':current.home>current.away?'loss':'draw';
    home.liveResults.push({matchId:match.id,score:`${current.home}:${current.away}`,result:hResult,provisional});
    away.liveResults.push({matchId:match.id,score:`${current.away}:${current.home}`,result:aResult,provisional});
  }
  // Rebuild form chronologically: completed protocol results may be older than
  // an official result, even though the projected scores were applied later.
  for(const row of rows)row.form=[];
  const ordered=[...matches.filter(m=>m.competitionId===competitionId&&m.status==='finished'),...projected].sort(chronological);
  for(const m of ordered){
    const home=byId.get(m.homeTeamId),away=byId.get(m.awayTeamId),s=score(m.homeScore,m.awayScore);
    if(!home||!away||home===away||!s)continue;
    home.form.push(s.home>s.away?'W':s.home<s.away?'L':'D');
    away.form.push(s.away>s.home?'W':s.away<s.home?'L':'D');
  }
  for(const row of rows)row.form=row.form.slice(-5);
  sortRows(rows).forEach((row,i)=>{row.positionChange=(positions.get(row.teamId)??i)-i;});
  return rows;
}
