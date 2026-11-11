import React, { useMemo, useState } from 'react';
import { ChevronDown, CircleDot, MapPin, CalendarDays, UserRound, ArrowRightLeft, Flag, Shield } from 'lucide-react';
import { useData } from '@/context/DataContext';

type Side = 'a' | 'b';
type Score = { a: string; b: string };
type Player = { name: string; shirtNo: string };
type Official = { name: string; role: string };
type Goal = { team: string; scorerName: string; shirtNo: string; minute: string; addedTime: string; period: string; score?: string };
type Event = { kind: string; team: string; minute: string; period?: string; playerName: string; shirtNo: string; sourceRow: string; outgoingName: string; incomingName: string };
export type ProtocolMatch = { id: string; portalMatchId: string; updatedAt: string; competition: string; round: string; matchDate: string; startTime: string; venue: string; city: string; phase: string; teams: Record<Side, { name: string; players: Player[]; officials: Official[] }>; scores: Record<'live'|'first'|'second'|'extra'|'penalties'|'final', Score>; officials: Record<string,string>; goals: Goal[]; events: Event[] };

const phases: Record<string,string> = { setup:'Para fillimit', first:'Pjesa e parë', halftime:'Përfundoi pjesa e parë', second:'Pjesa e dytë', after_second:'Përfundoi pjesa e dytë', extra:'Koha shtesë', after_extra:'Përfundoi koha shtesë', penalties:'Penalltitë', finished:'Ndeshja përfundoi' };
const rowPhases: Record<string,string> = {setup:'Para fillimit',first:'Pjesa e parë',halftime:'Pushim',second:'Pjesa e dytë',after_second:'Pjesa e dytë përfundoi',extra:'Koha shtesë',after_extra:'Koha shtesë përfundoi',penalties:'Penalltitë',finished:'Përfundoi'};
const refNames: Record<string,string> = { ref1:'Gjyqtari 1', ref2:'Gjyqtari 2', ref3:'Gjyqtari 3', ref4:'Gjyqtari 4', delegate:'Delegati', timekeeper:'Kohëmatësi' };
const tabs = [{id:'summary',label:'Përmbledhje'},{id:'lineups',label:'Formacionet'},{id:'info',label:'Informacione'}] as const;
type Tab = typeof tabs[number]['id'];
type TimelineItem = { key:string; period:string; minute:string; addedTime?:string; team:string; kind:string; player:string; score?:string; sourceRow?:string; outgoing?:string; incoming?:string };
const formatScore = (s?: Score) => s && s.a != null && s.b != null && s.a !== '' && s.b !== '' ? `${s.a} : ${s.b}` : '—';
const formatDate = (date:string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('.') : date;
const hasHalf = (m:ProtocolMatch) => !['setup','first'].includes(m.phase);
const periodKey = (s:string) => { const p=(s||'').toLowerCase(); return p==='p1'?'first':p==='p2'?'second':p.includes('ext')?'extra':p.includes('penall')?'penalties':'unknown'; };
function timeline(m:ProtocolMatch):TimelineItem[] {
  const goals=(m.goals||[]).map((g,i)=>({key:`goal-${i}`,period:g.period||'',minute:g.minute||'',addedTime:g.addedTime||'',team:g.team,kind:'goal',player:g.scorerName|| (g.shirtNo?`#${g.shirtNo}`:''),score:g.score}));
  const events=(m.events||[]).filter(e=>e.kind!=='goal').map((e,i)=>({key:`event-${i}`,period:e.period||'',minute:e.minute||'',team:e.team,kind:e.kind,player:e.playerName||(e.shirtNo?`#${e.shirtNo}`:''),sourceRow:e.sourceRow||'',outgoing:e.outgoingName||'',incoming:e.incomingName||''}));
  return [...goals,...events].sort((a,b)=>{
    const rank:Record<string,number>={first:0,second:1,extra:2,penalties:3,unknown:4};
    const periods=rank[periodKey(a.period)]-rank[periodKey(b.period)];
    if(periods)return periods;
    const am=parseInt(a.minute,10),bm=parseInt(b.minute,10);
    return (Number.isFinite(am)?am:9999)-(Number.isFinite(bm)?bm:9999);
  });
}
function EventIcon({item}:{item:TimelineItem}) {
  if(item.kind==='goal') return <span aria-label="Gol" className="w-7 h-7 flex items-center justify-center text-base">⚽</span>;
  if(item.kind==='card')return <span aria-label={item.sourceRow?.startsWith('kk')?'Karton i kuq':'Karton i verdhë'} className={`w-3.5 h-5 rounded-[2px] mx-[7px] ${item.sourceRow?.startsWith('kk')?'bg-red-500':'bg-amber-400'}`}/>;
  if(item.kind==='substitution')return <ArrowRightLeft aria-label="Zëvendësim" className="w-7 h-5 text-emerald-700"/>;
  if(item.kind==='timeout')return <Flag aria-label="Time-out" className="w-7 h-4 text-sky-700"/>;
  return <CircleDot aria-label="Faull" className="w-7 h-4 text-slate-400"/>;
}
function EventList({m}:{m:ProtocolMatch}) {
  const items=timeline(m);
  const groups=[{id:'first',title:'Pjesa e parë'},{id:'second',title:'Pjesa e dytë'},{id:'extra',title:'Koha shtesë'},{id:'penalties',title:'Penalltitë'},{id:'unknown',title:'Ngjarje të tjera'}];
  return <div className="px-3 sm:px-5 pb-5 pt-3">
    <div className="flex items-center justify-between gap-2 mb-3"><h3 className="text-sm font-bold text-slate-900">Ngjarjet e ndeshjes</h3><span className="text-sm text-slate-500">{items.length} të regjistruara</span></div>
    {!items.length && !hasHalf(m) && <p className="py-8 text-center text-sm text-slate-500">Nuk ka ngjarje të regjistruara ende.</p>}
    {groups.map(({id,title})=>{const rows=items.filter(x=>periodKey(x.period)===id);if(!rows.length && !(id==='first'&&hasHalf(m)))return null;
      return <section key={id} aria-label={title} className="mb-3">
        <div className="flex justify-between gap-3 rounded bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700"><span>{title}</span>{id==='first'&&hasHalf(m)&&<span>Pushim · {formatScore(m.scores.first)}</span>}</div>
        {rows.map(item=>{const away=item.team==='b';const title=item.kind==='goal'?(item.player||'Gol'):item.kind==='card'?(item.sourceRow?.startsWith('kk')?'Karton i kuq':'Karton i verdhë'):({foul:'Faull',timeout:'Time-out',substitution:'Zëvendësim'} as Record<string,string>)[item.kind]||'Ngjarje';const detail=[item.kind!=='goal'?item.player:'',item.outgoing?`${item.outgoing}${item.incoming?` → ${item.incoming}`:''}`:'',item.team==='a'?m.teams.a.name:item.team==='b'?m.teams.b.name:''].filter(Boolean).join(' · ');
          return <div key={item.key} className={`flex items-start gap-2 py-2.5 border-b border-slate-100 text-sm ${away?'flex-row-reverse text-right':''}`}>
            <span className="w-8 shrink-0 pt-1 text-slate-500 tabular-nums">{item.minute?`${item.minute}${item.addedTime?`+${item.addedTime}`:''}′`:'—'}</span>
            <span className="flex shrink-0 justify-center items-center w-7 min-h-7"><EventIcon item={item}/></span>
            {item.kind==='goal'&&item.score&&<strong className="pt-1 text-slate-900 whitespace-nowrap tabular-nums">{item.score.replace(':',' : ')}</strong>}
            <div className="min-w-0 leading-5"><div className="font-semibold text-slate-900 break-words">{title}</div>{detail&&<div className="text-slate-600 break-words">{detail}</div>}</div>
          </div>})}
      </section>})}
    {m.phase==='finished'&&<div className="rounded bg-slate-100 px-3 py-2 flex justify-between gap-3 text-sm font-bold text-slate-700"><span>Ndeshja përfundoi</span><span className="tabular-nums">{formatScore(m.scores.final)!=='—'?formatScore(m.scores.final):formatScore(m.scores.live)}</span></div>}
  </div>;
}
function Lineups({m}:{m:ProtocolMatch}) {
  return <div className="grid sm:grid-cols-2 sm:divide-x divide-slate-200">{(['a','b'] as Side[]).map(side=><section key={side} className="p-4 sm:p-5 border-b sm:border-b-0 border-slate-200 last:border-0">
    <h3 className="font-bold text-slate-900 break-words">{m.teams[side].name}</h3><h4 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wider text-slate-600">Lojtarët</h4>
    {m.teams[side].players.length?<ul className="divide-y divide-slate-100">{m.teams[side].players.map((p,i)=><li key={i} className="flex items-center gap-3 py-2.5 text-sm text-slate-900"><span className="w-8 text-center font-bold tabular-nums text-slate-600">{p.shirtNo||'—'}</span><span className="break-words">{p.name||'Lojtar'}</span></li>)}</ul>:<p className="text-sm text-slate-600">Nuk ka lojtarë të regjistruar.</p>}
    <h4 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wider text-slate-600">Zyrtarët e skuadrës</h4>
    {m.teams[side].officials.length?<ul className="space-y-2">{m.teams[side].officials.map((o,i)=><li key={i} className="text-sm text-slate-900 break-words">{o.name}{o.role&&<span className="block text-sm text-slate-600">{o.role}</span>}</li>)}</ul>:<p className="text-sm text-slate-600">Nuk ka zyrtarë të regjistruar.</p>}
  </section>)}</div>;
}
function Info({m}:{m:ProtocolMatch}) {
  const refs=Object.entries(m.officials||{}).filter(([,value])=>value);
  const items=[{icon:CalendarDays,label:'Data dhe ora',value:[formatDate(m.matchDate),m.startTime].filter(Boolean).join(' · ')},{icon:MapPin,label:'Palestra dhe qyteti',value:[m.venue,m.city].filter(Boolean).join(' · ')}].filter(x=>x.value);
  return <div className="p-4 sm:p-5 grid sm:grid-cols-2 gap-6 text-sm"><section><h3 className="font-bold text-slate-900 mb-3">Të dhënat e ndeshjes</h3>{items.length?items.map(({icon:Icon,label,value})=><div key={label} className="flex items-start gap-3 py-2"><Icon className="w-4 h-4 text-slate-600 mt-1 shrink-0"/><div><div className="text-sm text-slate-600">{label}</div><div className="text-slate-900 break-words">{value}</div></div></div>):<p className="text-slate-600">Nuk ka informacione të regjistruara.</p>}</section>
    <section><h3 className="font-bold text-slate-900 mb-3">Gjyqtarët dhe zyrtarët</h3>{refs.length?<ul className="space-y-3">{refs.map(([key,value])=><li key={key} className="flex gap-3"><UserRound className="w-4 h-4 text-slate-600 mt-1 shrink-0"/><div><div className="text-sm text-slate-600">{refNames[key]||key}</div><div className="text-slate-900 break-words">{value}</div></div></li>)}</ul>:<p className="text-slate-600">Nuk ka zyrtarë të ndeshjes të regjistruar.</p>}</section>
  </div>;
}
function TeamMark({logo}:{logo?:string}) {return <span className="flex h-6 w-6 shrink-0 items-center justify-center">{logo?<img src={logo} alt="" className="h-6 w-6 object-contain"/>:<Shield className="h-4 w-4 text-slate-300" aria-hidden="true"/>}</span>}
export default function ProtocolLiveMatches({matches}:{matches:ProtocolMatch[]}) {
  const {matches:portalMatches,getTeamById}=useData();
  const [openId,setOpenId]=useState<string|null>(null),[activeTab,setActiveTab]=useState<Tab>('summary');
  const groups=useMemo(()=>{const out=new Map<string,ProtocolMatch[]>();for(const match of matches){const key=match.competition||'Ndeshje';out.set(key,[...(out.get(key)||[]),match]);}return [...out.entries()];},[matches]);
  if(!matches.length)return null;
  return <div className="mx-auto mb-6 w-full max-w-[760px] space-y-3" aria-label="Ndeshjet nga procesverbali">{groups.map(([competition,group])=><section key={competition} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between gap-3 bg-slate-100 px-4 py-2 sm:px-5"><h2 className="text-sm font-bold text-slate-800">{competition}</h2><span className="text-sm text-slate-500">{group.length} ndeshje</span></div>
    {group.map(m=>{const open=openId===m.id;const portal=portalMatches.find(x=>x.id===m.portalMatchId);const home=portal?getTeamById(portal.homeTeamId):undefined;const away=portal?getTeamById(portal.awayTeamId):undefined;const live=!['setup','finished'].includes(m.phase);
      return <article key={m.id} className="border-t border-slate-200 first:border-0">
        <button type="button" aria-expanded={open} aria-controls={`protocol-details-${m.id}`} onClick={()=>{setOpenId(open?null:m.id);setActiveTab('summary')}} className="w-full text-left px-3 sm:px-5 py-2 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-[-2px]">
          <div className="grid grid-cols-[76px_minmax(0,1fr)_28px] sm:grid-cols-[135px_minmax(0,1fr)_32px] gap-2 sm:gap-4 items-center">
            <div className="self-center text-sm leading-4"><span className={`font-bold ${live?'text-red-600':'text-slate-600'}`}>{live&&<span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5 align-middle"/>}{rowPhases[m.phase]||'Ndeshja'}</span>{m.round&&<div className="mt-1 text-slate-500">Java {m.round}</div>}</div>
            <div className="min-w-0 space-y-1">{(['a','b'] as Side[]).map((side)=><div key={side} className="flex items-center gap-2"><TeamMark logo={side==='a'?home?.logo:away?.logo}/><span className="min-w-0 flex-1 break-words text-sm font-semibold text-slate-800">{m.teams[side].name}</span><strong className="pl-2 text-base tabular-nums text-slate-900">{m.scores.live?.[side]!=='' && m.scores.live?.[side]!=null?m.scores.live[side]:'—'}</strong></div>)}</div>
            <ChevronDown aria-hidden="true" className={`justify-self-end h-5 w-5 text-slate-400 transition-transform motion-reduce:transition-none ${open?'rotate-180':''}`}/>
          </div><span className="sr-only">{open?'Mbyll':'Hap'} detajet e ndeshjes {m.teams.a.name} kundër {m.teams.b.name}</span>
        </button>
        {open&&<div id={`protocol-details-${m.id}`} className="bg-white text-slate-900 border-t border-slate-200">
          <div className="px-4 sm:px-6 pt-3 pb-1 flex items-center justify-between gap-3 text-sm text-slate-600"><span>DETAJET E NDESHJES</span><span className="font-semibold text-slate-700">{phases[m.phase]||'Ndeshja'}</span></div>
          <nav aria-label="Detajet e ndeshjes" className="flex border-b border-slate-200 px-2 sm:px-4">{tabs.map(tab=><button key={tab.id} type="button" aria-pressed={activeTab===tab.id} onClick={()=>setActiveTab(tab.id)} className={`min-h-11 flex-1 px-1 sm:px-4 text-sm font-semibold border-b-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 ${activeTab===tab.id?'text-rose-700 border-rose-600':'text-slate-600 border-transparent hover:text-slate-900'}`}>{tab.label}</button>)}</nav>
          {activeTab==='summary'?<EventList m={m}/>:activeTab==='lineups'?<Lineups m={m}/>:<Info m={m}/>}
        </div>}
      </article>;
    })}
  </section>)}</div>;
}
