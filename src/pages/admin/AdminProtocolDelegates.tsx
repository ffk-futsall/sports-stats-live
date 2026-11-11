import React, { useEffect, useState } from 'react';
import { useData } from '@/context/DataContext';
import { supabaseClient } from '@/lib/supabaseClient';

type Delegate = {id:string; username:string; first_name:string; last_name:string; city:string; active:boolean; must_change_password:boolean};
type Assignment = {id:string; delegate_id:string; state:'pending'|'accepted'|'rejected'; rejection_reason?:string; match_details:{home:string;away:string;competition:string;date:string;time:string;venue:string}};
const label={pending:'Në pritje',accepted:'Pranuar',rejected:'Refuzuar'};
const field='w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600';
async function request(method:string,body?:unknown){
  const {data}=await supabaseClient.auth.getSession();
  const response=await fetch('/api/delegates',{method,headers:{Authorization:`Bearer ${data.session?.access_token||''}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const json=await response.json().catch(()=>({})); if(!response.ok)throw new Error(json.error||'Kërkesa dështoi.'); return json;
}
export default function AdminProtocolDelegates(){
  const {matches,teams,competitions}=useData();
  const [delegates,setDelegates]=useState<Delegate[]>([]),[assignments,setAssignments]=useState<Assignment[]>([]);
  const [form,setForm]=useState({firstName:'',lastName:'',city:'',username:'',password:''});
  const [delegateId,setDelegateId]=useState(''),[matchId,setMatchId]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const reload=async()=>{const data=await request('GET');setDelegates(data.delegates);setAssignments(data.assignments);};
  useEffect(()=>{let active=true;const load=()=>request('GET').then(data=>{if(active){setDelegates(data.delegates);setAssignments(data.assignments)}}).catch(e=>{if(active)setError(e.message)});load();const timer=setInterval(load,15000);return()=>{active=false;clearInterval(timer)};},[]);
  const create=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{await request('POST',{action:'create',...form});setForm({firstName:'',lastName:'',city:'',username:'',password:''});await reload();setMessage('Delegati u krijua. Jepjani fjalëkalimin e përkohshëm privatisht.');}catch(err){setError((err as Error).message)}finally{setBusy(false)}};
  const assign=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');setMessage('');try{await request('POST',{action:'assign',delegateId,matchId});setMatchId('');await reload();setMessage('Ndeshja iu caktua delegatit.');}catch(err){setError((err as Error).message)}finally{setBusy(false)}};
  const teamName=(id:string)=>teams.find(t=>t.id===id)?.name||'Skuadër e panjohur';
  return <section className="space-y-6 max-w-5xl">
    <header><h2 className="text-2xl font-bold text-slate-900">Delegatët Procesverbali</h2><p className="text-sm text-slate-600 mt-1">Krijoni llogari dhe caktoni ndeshjet. Rezultatet e procesverbalit nuk ndryshojnë renditjen.</p></header>
    {error&&<div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-red-800">{error}</div>}
    {message&&<div role="status" className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-green-800">{message}</div>}
    <form onSubmit={create} className="space-y-4 bg-white border border-slate-200 rounded-xl p-5">
      <div><h3 className="text-lg font-bold">Shto delegat</h3><p className="text-sm text-slate-600">Pa ftesë me email. Delegati duhet ta ndryshojë fjalëkalimin në hyrjen e parë.</p></div>
      <div className="grid sm:grid-cols-2 gap-4">{(['firstName','lastName','city','username'] as const).map((key)=> <label key={key} className="text-sm font-semibold space-y-1"><span>{({firstName:'Emri',lastName:'Mbiemri',city:'Qyteti',username:'Emri i përdoruesit'})[key]}</span><input className={field} value={form[key]} required maxLength={key==='username'?40:100} pattern={key==='username'?'[a-zA-Z0-9][a-zA-Z0-9_-]{2,39}':undefined} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
        <label className="text-sm font-semibold space-y-1 sm:col-span-2"><span>Fjalëkalimi i përkohshëm (të paktën 12 karaktere)</span><input className={field} type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
      </div><button disabled={busy} className="bg-[#0f1830] text-white font-semibold rounded-lg px-4 py-2.5 disabled:opacity-50">Shto delegatin</button>
    </form>
    <form onSubmit={assign} className="space-y-4 bg-white border border-slate-200 rounded-xl p-5"><h3 className="text-lg font-bold">Cakto ndeshje</h3><div className="grid sm:grid-cols-2 gap-4"><label className="text-sm font-semibold space-y-1"><span>Delegati</span><select required className={field} value={delegateId} onChange={e=>setDelegateId(e.target.value)}><option value="">Zgjidhni delegatin</option>{delegates.filter(d=>d.active).map(d=><option key={d.id} value={d.id}>{d.first_name} {d.last_name} · {d.city}</option>)}</select></label><label className="text-sm font-semibold space-y-1"><span>Ndeshja në portal</span><select required className={field} value={matchId} onChange={e=>setMatchId(e.target.value)}><option value="">Zgjidhni ndeshjen</option>{matches.filter(m=>m.status!=='cancelled').map(m=><option key={m.id} value={m.id}>{teamName(m.homeTeamId)} – {teamName(m.awayTeamId)} · {m.date||'Pa datë'} · {competitions.find(c=>c.id===m.competitionId)?.name||''}</option>)}</select></label></div><button disabled={busy} className="bg-[#0f1830] text-white font-semibold rounded-lg px-4 py-2.5 disabled:opacity-50">Cakto ndeshjen</button></form>
    <section className="bg-white border border-slate-200 rounded-xl p-5"><h3 className="text-lg font-bold mb-4">Delegatët dhe përgjigjet</h3>{delegates.length===0&&<p className="text-slate-600">Nuk ka delegatë të regjistruar.</p>}<div className="space-y-4">{delegates.map(d=><article key={d.id} className="border border-slate-200 rounded-lg p-4"><h4 className="font-bold">{d.first_name} {d.last_name}</h4><p className="text-sm text-slate-600">{d.city} · {d.username}{d.must_change_password?' · Hyrja e parë në pritje':''}</p><ul className="mt-3 space-y-2">{assignments.filter(a=>a.delegate_id===d.id).map(a=><li key={a.id} className="bg-slate-50 rounded-lg p-3 text-sm"><div className="font-semibold">{a.match_details.home} – {a.match_details.away}</div><div className="text-slate-600">{a.match_details.date} {a.match_details.time} · {label[a.state]}</div>{a.state==='rejected'&&<p className="text-red-800 mt-1">Arsyeja: {a.rejection_reason}</p>}</li>)}</ul></article>)}</div></section>
  </section>;
}
