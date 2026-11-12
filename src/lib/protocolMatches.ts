import type { Match } from '../types/index';
import type { ProtocolMatch } from '../components/ProtocolLiveMatches';
const started = new Set(['first','halftime','second','after_second','extra','after_extra','penalties','finished']);
const scoreNumber=(v:unknown):number|undefined=>{
  if ((typeof v!=='string' && typeof v!=='number') || !/^\d+$/.test(String(v).trim())) return undefined;
  const n=Number(v); return Number.isSafeInteger(n)?n:undefined;
};
function scorePair(s?:{a?:unknown;b?:unknown}) {
  const a=scoreNumber(s?.a),b=scoreNumber(s?.b);
  return a===undefined||b===undefined?null:{a,b};
}
// Derive public views only: never write a delegate's score into the official portal record.
export function mergeProtocolMatches(matches:Match[],protocols:ProtocolMatch[]):Match[] {
  const reports=new Map<string,ProtocolMatch>();
  for(const p of protocols){
    if(!p.portalMatchId)continue;
    const old=reports.get(p.portalMatchId);
    if(!old||(p.updatedAt||'')>(old.updatedAt||''))reports.set(p.portalMatchId,p);
  }
  return matches.map(m=>{
    if(m.status==='finished'||m.status==='cancelled')return m;
    const p=reports.get(m.id);
    if(!p||!started.has(p.phase))return m;
    const finished=p.phase==='finished';
    const score=(finished?scorePair(p.scores?.final):null)||scorePair(p.scores?.live);
    return {...m,status:finished?'finished':'live',homeScore:score?.a,awayScore:score?.b,protocolResult:finished?'finished':'live'};
  });
}
