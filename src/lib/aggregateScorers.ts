import type { Goal, Match, Player, Scorer } from '../types/index';
import type { ProtocolMatch } from '../components/ProtocolLiveMatches';

type Entry = { firstName:string; lastName:string; photo:string; teamId:string; goals:number; id:string; competitionId:string };
const norm=(v:string)=>(v||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
const personKey=(team:string,competition:string,name:string)=>`${team}\u0000${competition}\u0000${norm(name)}`;

// Protocol scorers are a public projection. A match with portal goal entries uses
// those entries instead. Manual season totals win over a matching protocol name:
// their unattributed totals cannot safely be added without risking duplicates.
export function aggregateScorers(matches:Match[], players:Player[], goals:Goal[], manual:Scorer[], protocols:ProtocolMatch[], compId?:string):Entry[] {
  const results=new Map<string,Entry>();
  const matchById=new Map(matches.map(m=>[m.id,m]));
  const manualKeys=new Set(manual.filter(s=>s.isManual).map(s=>personKey(s.teamId,s.competitionId,`${s.firstName} ${s.lastName}`)));
  const add=(teamId:string,competitionId:string,firstName:string,lastName:string,photo:string,id:string,amount:number)=>{
    if(compId && competitionId!==compId)return;
    const key=personKey(teamId,competitionId,`${firstName} ${lastName}`), existing=results.get(key);
    if(existing){existing.goals+=amount; if(!existing.photo&&photo)existing.photo=photo;}
    else results.set(key,{teamId,competitionId,firstName,lastName,photo,id,goals:amount});
  };
  for(const g of goals){
    if(g.isOwnGoal)continue;
    const player=players.find(p=>p.id===g.playerId), match=matchById.get(g.matchId);
    if(player&&match)add(player.teamId,match.competitionId,player.firstName,player.lastName,player.photo,`goal_${player.id}_${match.competitionId}`,1);
  }
  const goalMatchIds=new Set(goals.map(g=>g.matchId));
  const latest=new Map<string,ProtocolMatch>();
  for(const p of protocols){if(!p.portalMatchId)continue; const old=latest.get(p.portalMatchId); if(!old||(p.updatedAt||'')>(old.updatedAt||''))latest.set(p.portalMatchId,p);}
  for(const [matchId,p] of latest){
    const m=matchById.get(matchId);
    if(!m||m.status==='cancelled'||p.phase==='setup'||goalMatchIds.has(matchId))continue;
    for(const g of p.goals||[]){
      if(!['a','b'].includes(g.team)||!g.scorerName?.trim()||(g.period||'').toLowerCase().includes('penall'))continue;
      const teamId=g.team==='a'?m.homeTeamId:m.awayTeamId, name=g.scorerName.trim().replace(/\s+/g,' ');
      if(manualKeys.has(personKey(teamId,m.competitionId,name)))continue;
      const roster=players.filter(pl=>pl.teamId===teamId && norm(`${pl.firstName} ${pl.lastName}`)===norm(name));
      const player=roster.length===1?roster[0]:undefined;
      const parts=name.split(' '); const firstName=player?.firstName || parts.shift() || ''; const lastName=player?.lastName || parts.join(' ');
      add(teamId,m.competitionId,firstName,lastName,player?.photo||'',`protocol_${teamId}_${m.competitionId}_${norm(name)}`,1);
    }
  }
  for(const s of manual)if(s.isManual)add(s.teamId,s.competitionId,s.firstName,s.lastName,s.photo,s.id,s.goals);
  return [...results.values()].sort((a,b)=>b.goals-a.goals);
}
