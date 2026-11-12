import React, { useMemo, useState } from 'react';
import { ChevronDown, CircleDot, MapPin, CalendarDays, UserRound, ArrowRightLeft, Flag, Shield } from 'lucide-react';
import { useData } from '@/context/DataContext';

type Side = 'a' | 'b';
type Score = { a: string; b: string };
type Player = { name: string; shirtNo: string; starter?: boolean };
type Official = { name: string; role: string };
type Goal = { team: string; scorerName: string; shirtNo: string; minute: string; addedTime: string; period: string; score?: string };
type Event = { kind: string; team: string; minute: string; period?: string; playerName: string; shirtNo: string; sourceRow: string; outgoingName: string; incomingName: string };
export type ProtocolMatch = { id: string; portalMatchId: string; updatedAt: string; competition: string; round: string; matchDate: string; startTime: string; venue: string; city: string; phase: string; teams: Record<Side, { name: string; players: Player[]; officials: Official[] }>; scores: Record<'live'|'first'|'second'|'extra'|'penalties'|'final', Score>; officials: Record<string,string>; goals: Goal[]; events: Event[] };

const phases: Record<string,string> = { setup:'Para fillimit', first:'Pjesa e parë', halftime:'Përfundoi pjesa e parë', second:'Pjesa e dytë', after_second:'Përfundoi pjesa e dytë', extra:'Koha shtesë', after_extra:'Përfundoi koha shtesë', penalties:'Penalltitë', finished:'Ndeshja përfundoi' };
const rowPhases: Record<string,string> = {setup:'Para fillimit',first:'Pjesa e parë',halftime:'Pushim',second:'Pjesa e dytë',after_second:'Pjesa e dytë përfundoi',extra:'Koha shtesë',after_extra:'Koha shtesë përfundoi',penalties:'Penalltitë',finished:'Përfundoi'};
const refNames: Record<string,string> = { ref1:'Gjyqtari 1', ref2:'Gjyqtari 2', ref3:'Gjyqtari 3', ref4:'Gjyqtari 4', delegate:'Delegati', timekeeper:'Kohëmatësi' };
const tabs = [{id:'summary',label:'Përmbledhje'},{id:'lineups',label:'Formacionet'},{id:'standings',label:'Tabela live'},{id:'info',label:'Informacione'}] as const;
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
// The court is an illustration, not a player-tracking feed. Only recorded events are counted.
function MatchCourt({m,homeLogo,awayLogo}:{m:ProtocolMatch;homeLogo?:string;awayLogo?:string}) {
  const events=m.events||[];
  // Shfaqen vetëm startuesit e shënuar në procesverbal, jo lojtarët aktualë pas zëvendësimeve.
  const starters:Record<Side,Player[]> = {a:(m.teams.a.players||[]).filter(p=>p.starter===true).slice(0,5), b:(m.teams.b.players||[]).filter(p=>p.starter===true).slice(0,5)};
  const counts=(side:Side,kind:string,red?:boolean)=>events.filter(e=>e.team===side&&e.kind===kind&&(red===undefined||Boolean(e.sourceRow?.toLowerCase().startsWith('kk'))===red)).length;
  const metrics=[{label:'Faulle',a:counts('a','foul'),b:counts('b','foul')},{label:'Kart. të verdhë',a:counts('a','card',false),b:counts('b','card',false)},{label:'Kart. të kuq',a:counts('a','card',true),b:counts('b','card',true)}];
  return <section aria-label="Pamja e ndeshjes live" className="px-3 sm:px-5 pt-4">
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="px-3 sm:px-5 py-4">
        <div className="flex justify-center"><span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600"><span className={`h-2 w-2 rounded-full ${!['setup','finished'].includes(m.phase)?'bg-red-500':'bg-slate-400'}`} aria-hidden="true"/>{rowPhases[m.phase]||'Ndeshja'}</span></div>
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
          {(['a','b'] as Side[]).map((side,i)=><React.Fragment key={side}>
            {i===1&&<div className="min-w-[70px] text-center"><div className="text-2xl sm:text-3xl font-bold tabular-nums text-slate-900" aria-label={`Rezultati ${formatScore(m.scores.live)}`}>{formatScore(m.scores.live)}</div>{hasHalf(m)&&formatScore(m.scores.first)!=='—'&&<div className="mt-1 text-sm text-slate-500">Pjesa e parë {formatScore(m.scores.first)}</div>}</div>}
            <div className={`flex min-w-0 items-center gap-2 ${side==='b'?'flex-row-reverse text-right':''}`}><TeamMark logo={side==='a'?homeLogo:awayLogo}/><span className="text-sm font-bold text-slate-800 break-words">{m.teams[side].name}</span></div>
          </React.Fragment>)}
        </div>
      </div>
      <div className="grid sm:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] border-t border-slate-200">
        <div className="p-3 sm:p-4 bg-slate-50">
          <div className="relative">
          <svg viewBox="0 0 600 310" className="block w-full rounded-md" aria-hidden="true">
            <rect width="600" height="310" rx="9" fill="#28745f"/><path fill="#31846b" d="M0 0h75v310H0zm150 0h75v310h-75zm150 0h75v310h-75zm150 0h75v310h-75z"/>
            <g fill="none" stroke="#d9efe4" strokeWidth="3" opacity=".9"><rect x="18" y="18" width="564" height="274" rx="2"/><path d="M300 18v274"/><circle cx="300" cy="155" r="38"/><circle cx="300" cy="155" r="2" fill="#d9efe4"/><path d="M18 85h20a70 70 0 0 1 0 140H18M582 85h-20a70 70 0 0 0 0 140h20"/><path d="M18 125H5v60h13M582 125h13v60h-13"/><circle cx="98" cy="155" r="2" fill="#d9efe4"/><circle cx="502" cy="155" r="2" fill="#d9efe4"/></g>
          </svg>
          <div className="absolute inset-[4%] grid grid-cols-2 gap-x-2" aria-label="Lojtarët startues në fushë">
            {(['a','b'] as Side[]).map(side=><div key={side} className="grid grid-rows-5 min-w-0" aria-label={`Startuesit e ${m.teams[side].name}`}>
              {starters[side].map((p,i)=><div key={i} className="flex min-w-0 items-center justify-center px-1">
                <span title={`${p.shirtNo ? `#${p.shirtNo} · ` : ''}${p.name || 'Lojtar'}`} className={`inline-flex max-w-full min-w-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold leading-tight shadow-sm ${side==='a'?'bg-white text-slate-900':'bg-slate-900 text-white'}`}>
                  <span className="shrink-0 tabular-nums">{p.shirtNo ? `#${p.shirtNo}` : '—'}</span><span className="truncate">{p.name||'Lojtar'}</span>
                </span>
              </div>)}
            </div>)}
          </div>
          </div>
          <h3 className="mt-2 text-sm font-bold text-slate-900">Lojtarët Startues</h3>
          <p className="mt-1 text-xs text-slate-600">Pozicionet janë ilustruese; shfaqen startuesit e procesverbalit, jo zëvendësimet live.</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(['a','b'] as Side[]).map(side=><div key={side} className="min-w-0">
              <h4 className="text-xs font-bold text-slate-700 break-words">{m.teams[side].name}</h4>
              {starters[side].length ? <ul className="mt-1 space-y-1">{starters[side].map((p,i)=><li key={i} className="text-xs text-slate-700 break-words"><strong>{p.shirtNo?`#${p.shirtNo}`:'—'}</strong> {p.name||'Lojtar'}</li>)}</ul> : <p className="mt-1 text-xs text-slate-600">Startuesit nuk janë shënuar ose nuk janë publikuar ende.</p>}
              {starters[side].length>0&&starters[side].length<5&&<p className="mt-1 text-xs text-slate-600">{starters[side].length} nga 5 startues të shënuar.</p>}
            </div>)}
          </div>
        </div>
        <div className="p-3 sm:p-4 sm:border-l border-t sm:border-t-0 border-slate-200">
          <h3 className="text-sm font-bold text-slate-900">Statistikat e regjistruara</h3>
          <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm font-semibold text-slate-600"><span className="truncate" title={m.teams.a.name}>{m.teams.a.name}</span><span> </span><span className="truncate text-right" title={m.teams.b.name}>{m.teams.b.name}</span></div>
          <dl className="mt-1 divide-y divide-slate-100">{metrics.map(stat=><div key={stat.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-2 text-sm"><dd className="font-bold text-slate-900 tabular-nums">{stat.a}</dd><dt className="text-center text-slate-600">{stat.label}</dt><dd className="text-right font-bold text-slate-900 tabular-nums">{stat.b}</dd></div>)}</dl>
          <p className="mt-2 text-sm text-slate-600">Vetëm ngjarjet e regjistruara në procesverbal.</p>
        </div>
      </div>
    </div>
  </section>;
}
function Lineups({m}:{m:ProtocolMatch}) {
  return <div className="grid sm:grid-cols-2 sm:divide-x divide-slate-200">{(['a','b'] as Side[]).map(side=><section key={side} className="p-4 sm:p-5 border-b sm:border-b-0 border-slate-200 last:border-0">
    <h3 className="font-bold text-slate-900 break-words">{m.teams[side].name}</h3><h4 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wider text-slate-600">Lojtarët</h4>
    {m.teams[side].players.length?<ul className="divide-y divide-slate-100">{m.teams[side].players.map((p,i)=><li key={i} className="flex items-center gap-3 py-2.5 text-sm text-slate-900"><span className="w-8 text-center font-bold tabular-nums text-slate-600">{p.shirtNo||'—'}</span><span className="break-words">{p.name||'Lojtar'}</span></li>)}</ul>:<p className="text-sm text-slate-600">Nuk ka lojtarë të regjistruar.</p>}
    <h4 className="mt-5 mb-2 text-sm font-semibold uppercase tracking-wider text-slate-600">Zyrtarët e skuadrës</h4>
    {m.teams[side].officials.length?<ul className="space-y-2">{m.teams[side].officials.map((o,i)=><li key={i} className="text-sm text-slate-900 break-words">{o.name}{o.role&&<span className="block text-sm text-slate-600">{o.role}</span>}</li>)}</ul>:<p className="text-sm text-slate-600">Nuk ka zyrtarë të regjistruar.</p>}
  </section>)}</div>;
}
function LiveStandings({match,stale}:{match:ProtocolMatch;stale:boolean}) {
  const {matches,competitions,calculateStandings,protocolLoading}=useData();
  const portal=matches.find(item=>item.id===match.portalMatchId);
  const competition=competitions.find(item=>item.id===portal?.competitionId);
  const rows=useMemo(()=>portal && competition && competition.type!=='kupa' ? calculateStandings(portal.competitionId) : [],[calculateStandings,portal,competition]);
  if(!portal || !competition) return <p className="p-5 text-sm text-slate-600">Ndeshja nuk është lidhur me një garë në portal; tabela nuk mund të llogaritet.</p>;
  if(competition.type==='kupa') return <p className="p-5 text-sm text-slate-600">Tabela live është e disponueshme për garat e ligës, jo për ndeshjet e kupës.</p>;
  if(!rows.length) return <p className="p-5 text-sm text-slate-600">Nuk ka skuadra të regjistruara për këtë garë.</p>;
  return <section className="p-3 sm:p-5" aria-label={`Tabela live ${competition.name}`}>
    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500"/><h3 className="font-bold text-slate-900">Tabela live · {competition.name}</h3></div>
    <p className="mt-1 text-xs text-slate-600">Parashikim sipas rezultateve aktuale; renditja zyrtare nuk ndryshohet. Fitore 3 pikë, barazim 1 pikë. Renditja: pikë, goldallim, gola të shënuar.</p>
    <p className="mt-1 text-xs text-slate-600">Ndeshjet e përfunduara në procesverbal mbeten të përkohshme deri sa rezultati të regjistrohet në portal.</p>
    {protocolLoading&&<p role="status" className="mt-2 text-xs text-slate-600">Duke ngarkuar të dhënat live…</p>}
    {stale&&<p role="status" className="mt-2 text-xs font-semibold text-red-700">Përditësimi live dështoi; të dhënat mund të jenë të vjetruara.</p>}
    <p className="mt-2 text-xs text-slate-500 sm:hidden">Rrëshqitni tabelën anash për të parë të gjitha statistikat.</p>
    <div className="mt-3 overflow-x-auto rounded border border-slate-200"><table className="w-full min-w-[560px] text-xs text-left tabular-nums">
      <thead className="bg-slate-100 text-slate-600"><tr><th className="p-2">#</th><th className="p-2">Skuadra / rezultati</th><th className="p-2 text-center" title="Ndeshje">ND</th><th className="p-2 text-center" title="Fitore">F</th><th className="p-2 text-center" title="Barazime">B</th><th className="p-2 text-center" title="Humbje">H</th><th className="p-2 text-center" title="Golat e shënuar dhe të pranuar">G</th><th className="p-2 text-center" title="Goldallimi">DG</th><th className="p-2 text-center" title="Pikë">P</th><th className="p-2 text-center">Forma</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{rows.map((row,i)=><tr key={row.teamId} className={row.liveResults.length?'bg-sky-50':'bg-white'}>
        <td className="p-2 font-bold">{i+1}</td>
        <td className="p-2"><div className="flex items-center gap-1.5"><TeamMark logo={row.teamLogo}/><span className="font-semibold text-slate-900 whitespace-nowrap">{row.teamName}</span>{row.positionChange!==0&&<span className={row.positionChange>0?'text-emerald-700':'text-red-700'} aria-label={row.positionChange>0?`U ngrit ${row.positionChange} pozita`:`Ra ${-row.positionChange} pozita`}>{row.positionChange>0?'▲':'▼'}</span>}{row.liveResults.map(result=><span key={result.matchId} title={result.provisional?'Rezultat në pritje të konfirmimit zyrtar':'Rezultat live nga këndvështrimi i skuadrës'} className={`rounded px-1.5 py-0.5 font-bold text-white ${result.provisional?'bg-slate-500':result.result==='win'?'bg-emerald-600':result.result==='loss'?'bg-red-600':'bg-amber-600'}`}>{result.score}</span>)}</div></td>
        {[row.played,row.won,row.drawn,row.lost,`${row.goalsFor}:${row.goalsAgainst}`,row.goalDifference,row.points].map((value,n)=><td key={n} className={`p-2 text-center ${row.liveResults.length?'font-semibold text-rose-700':'text-slate-700'} ${n===6?'font-bold':''}`}>{value}</td>)}
        <td className="p-2"><div className="flex justify-center gap-0.5">{row.form.map((f,n)=><span key={n} className={`flex h-5 w-5 items-center justify-center rounded text-white font-bold ${f==='W'?'bg-emerald-600':f==='L'?'bg-red-600':'bg-amber-600'}`} aria-label={f==='W'?'Fitore':f==='L'?'Humbje':'Barazim'}>{f==='W'?'F':f==='L'?'H':'B'}</span>)}</div></td>
      </tr>)}</tbody>
    </table></div>
    <p className="mt-2 text-xs text-slate-500">Rezultati pranë skuadrës tregon fillimisht golat e saj. Ngjyra gri tregon rezultat në pritje të konfirmimit.</p>
  </section>;
}
function Info({m}:{m:ProtocolMatch}) {
  const refs=Object.entries(m.officials||{}).filter(([,value])=>value);
  const items=[{icon:CalendarDays,label:'Data dhe ora',value:[formatDate(m.matchDate),m.startTime].filter(Boolean).join(' · ')},{icon:MapPin,label:'Palestra dhe qyteti',value:[m.venue,m.city].filter(Boolean).join(' · ')}].filter(x=>x.value);
  return <div className="p-4 sm:p-5 grid sm:grid-cols-2 gap-6 text-sm"><section><h3 className="font-bold text-slate-900 mb-3">Të dhënat e ndeshjes</h3>{items.length?items.map(({icon:Icon,label,value})=><div key={label} className="flex items-start gap-3 py-2"><Icon className="w-4 h-4 text-slate-600 mt-1 shrink-0"/><div><div className="text-sm text-slate-600">{label}</div><div className="text-slate-900 break-words">{value}</div></div></div>):<p className="text-slate-600">Nuk ka informacione të regjistruara.</p>}</section>
    <section><h3 className="font-bold text-slate-900 mb-3">Gjyqtarët dhe zyrtarët</h3>{refs.length?<ul className="space-y-3">{refs.map(([key,value])=><li key={key} className="flex gap-3"><UserRound className="w-4 h-4 text-slate-600 mt-1 shrink-0"/><div><div className="text-sm text-slate-600">{refNames[key]||key}</div><div className="text-slate-900 break-words">{value}</div></div></li>)}</ul>:<p className="text-slate-600">Nuk ka zyrtarë të ndeshjes të regjistruar.</p>}</section>
  </div>;
}
function TeamMark({logo}:{logo?:string}) {return <span className="flex h-6 w-6 shrink-0 items-center justify-center">{logo?<img src={logo} alt="" className="h-6 w-6 object-contain"/>:<Shield className="h-4 w-4 text-slate-300" aria-hidden="true"/>}</span>}
export default function ProtocolLiveMatches({matches,stale=false}:{matches:ProtocolMatch[];stale?:boolean}) {
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
          {activeTab==='summary'?<><MatchCourt m={m} homeLogo={home?.logo} awayLogo={away?.logo}/><EventList m={m}/></>:activeTab==='lineups'?<Lineups m={m}/>:activeTab==='standings'?<LiveStandings match={m} stale={stale}/>:<Info m={m}/>}
        </div>}
      </article>;
    })}
  </section>)}</div>;
}
