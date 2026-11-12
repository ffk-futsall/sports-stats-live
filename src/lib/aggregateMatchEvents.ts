import type {Match} from '../types/index';
import type {ProtocolMatch} from '../components/ProtocolLiveMatches';
import {protocolStatistics} from './protocolStatistics.ts';

type Totals = {fouls:number; yellow:number; red:number; timeout:number; withProtocol:number; withFouls:number};
// These counts cover only recorded events. A manual portal foul pair takes
// precedence over a protocol's foul pair; other events come from the report.
export function aggregateMatchEvents(matches:Match[],protocols:ProtocolMatch[]):Totals {
  const latest=new Map<string,ProtocolMatch>();
  for(const p of protocols){if(!p.portalMatchId)continue;const old=latest.get(p.portalMatchId);if(!old||(p.updatedAt||'')>(old.updatedAt||''))latest.set(p.portalMatchId,p);}
  const totals:Totals={fouls:0,yellow:0,red:0,timeout:0,withProtocol:0,withFouls:0};
  for(const m of matches){
    if(m.status!=='finished'&&m.status!=='live')continue;
    const p=latest.get(m.id);const usable=p && p.phase!=='setup';
    const pair=[m.fouls_home,m.fouls_away];
    const manual=pair.every(x=>typeof x==='number' && Number.isSafeInteger(x) && x>=0);
    if(usable){
      const rows=protocolStatistics(p,'match').rows;const total=(key:string)=>{const row=rows.find(r=>r.key===key);return row ? row.a+row.b : 0};
      totals.withProtocol++; totals.yellow+=total('yellow');totals.red+=total('red');totals.timeout+=total('timeout');
      if(!manual)totals.fouls+=total('fouls');
    }
    if(manual)totals.fouls+=(pair[0] as number)+(pair[1] as number);
    if(manual||usable)totals.withFouls++;
  }
  return totals;
}
