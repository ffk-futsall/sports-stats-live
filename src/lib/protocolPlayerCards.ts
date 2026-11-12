import type { Match, Player, PlayerStats } from '../types/index';
import type { ProtocolMatch } from '../components/ProtocolLiveMatches';
export type ReportCard = {id:string; playerId?:string; firstName:string; lastName:string; photo:string; teamId:string; competitionId:string; seasonId:string; week:number; yellowCards:number; redCards:number};
const norm=(v:string)=>(v||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
// Names are only attached to existing player IDs on an unambiguous team/name match.
// A manual player/week record wins over report events for that same player/week.
export function protocolPlayerCards(matches:Match[],players:Player[],manual:PlayerStats[],protocols:ProtocolMatch[]):ReportCard[]{
 const latest=new Map<string,ProtocolMatch>();for(const p of protocols){if(!p.portalMatchId)continue;const old=latest.get(p.portalMatchId);if(!old||(p.updatedAt||'')>(old.updatedAt||''))latest.set(p.portalMatchId,p)}
 const rows=new Map<string,ReportCard>();
 for(const m of matches){if(!['live','finished'].includes(m.status))continue;const p=latest.get(m.id);if(!p||p.phase==='setup')continue;
  for(const e of p.events||[]){if(e.kind!=='card'||!['a','b'].includes(e.team)||!e.playerName?.trim()||!/^(kv|kk)/i.test(e.sourceRow||''))continue;
   const teamId=e.team==='a'?m.homeTeamId:m.awayTeamId,name=e.playerName.trim().replace(/\s+/g,' '),roster=players.filter(x=>x.teamId===teamId && norm(`${x.firstName} ${x.lastName}`)===norm(name));const player=roster.length===1?roster[0]:undefined;
   if(player&&manual.some(s=>s.playerId===player.id&&s.teamId===teamId&&s.competitionId===m.competitionId&&s.seasonId===m.seasonId&&s.week===m.week))continue;
   const id=`${m.competitionId}:${teamId}:${m.week}:${norm(name)}`;let row=rows.get(id);if(!row){const parts=name.split(' ');row={id,playerId:player?.id,firstName:player?.firstName||parts.shift()||'',lastName:player?.lastName||parts.join(' '),photo:player?.photo||'',teamId,competitionId:m.competitionId,seasonId:m.seasonId,week:m.week,yellowCards:0,redCards:0};rows.set(id,row)}
   if(/^kk/i.test(e.sourceRow))row.redCards++;else row.yellowCards++;
  }
 }
 return [...rows.values()];
}
