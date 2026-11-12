import type { ProtocolMatch } from '@/components/ProtocolLiveMatches';
export type StatisticsPeriod = 'match' | 'first' | 'second';
type Side = 'a' | 'b';
export type StatisticRow = { key:string; label:string; a:number; b:number };
const number = (value: unknown): number | null => {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+$/.test(String(value).trim())) return null;
  const n=Number(value); return Number.isSafeInteger(n)?n:null;
};
export const statisticPeriod = (period?:string) => {
  const p=(period||'').trim().toLowerCase();
  if(p==='p1')return 'first'; if(p==='p2')return 'second';
  if(p.includes('ext'))return 'extra'; if(p.includes('penall'))return 'penalties';
  return 'unknown';
};
// Goals use the protocol's score when present; a blank score falls back to recorded goals.
// Event-goals mirror the goals list and are never counted a second time.
export function protocolStatistics(match:ProtocolMatch, period:StatisticsPeriod) {
  const events=match.events||[], goals=match.goals||[];
  const within=(p?:string)=>period==='match'||statisticPeriod(p)===period;
  const goalsFor=(side:Side)=>{
    const final=match.scores?.final;
    const score=period==='match'?(match.phase==='finished' && number(final?.a)!==null && number(final?.b)!==null ? final : match.scores?.live):match.scores?.[period];
    const recorded=number(score?.[side]);
    return recorded ?? goals.filter(g=>g.team===side && statisticPeriod(g.period)!=='penalties' && within(g.period)).length;
  };
  const count=(side:Side,kind:string,card?:'yellow'|'red')=>events.filter(e=>e.team===side && e.kind===kind && within(e.period) && (!card || (card==='red'?/^kk/i:/^kv/i).test(e.sourceRow||''))).length;
  const rows:StatisticRow[]=[
    {key:'goals',label:'Gola',a:goalsFor('a'),b:goalsFor('b')},
    {key:'fouls',label:'Faulle',a:count('a','foul'),b:count('b','foul')},
    {key:'yellow',label:'Kartonë të verdhë',a:count('a','card','yellow'),b:count('b','card','yellow')},
    {key:'red',label:'Kartonë të kuq',a:count('a','card','red'),b:count('b','card','red')},
    {key:'timeout',label:'Time-out',a:count('a','timeout'),b:count('b','timeout')},
  ];
  const unknownPeriod=events.some(e=>['foul','card','timeout'].includes(e.kind) && ['a','b'].includes(e.team) && statisticPeriod(e.period)==='unknown');
  const unknownCard=events.some(e=>e.kind==='card' && ['a','b'].includes(e.team) && !/^(kv|kk)/i.test(e.sourceRow||''));
  const final=match.scores?.final;
  const score=period==='match'?(match.phase==='finished' && number(final?.a)!==null && number(final?.b)!==null ? final : match.scores?.live):match.scores?.[period];
  const goalFallback=(['a','b'] as Side[]).some(side=>number(score?.[side])===null);
  return {rows,unknownPeriod,unknownCard,goalFallback};
}
