import React from 'react';
import type { LiveStandingsRow } from '@/lib/standings';

export function LiveTeamIndicators({row}:{row:LiveStandingsRow}) {
  return <span className="inline-flex items-center gap-1 shrink-0">
    {row.positionChange!==0 && <span className={row.positionChange>0?'text-emerald-700':'text-red-700'} aria-label={row.positionChange>0?`U ngrit ${row.positionChange} pozita`:`Ra ${-row.positionChange} pozita`}>{row.positionChange>0?'▲':'▼'}</span>}
    {row.liveResults.map(result=><span key={result.matchId} title={result.provisional?'Rezultat në pritje të konfirmimit zyrtar':'Rezultat live nga këndvështrimi i skuadrës'} className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${result.provisional?'bg-slate-500':result.result==='win'?'bg-emerald-600':result.result==='loss'?'bg-red-600':'bg-amber-600'}`}>{result.score}</span>)}
  </span>;
}
export function LiveStandingsNotice({rows,loading,error}:{rows:LiveStandingsRow[];loading:boolean;error:boolean}) {
  const active=rows.some(row=>row.liveResults.length>0);
  const provisional=rows.some(row=>row.liveResults.some(result=>result.provisional));
  return <div className="border-b border-slate-200 px-3 sm:px-5 py-2 text-xs text-slate-600" role="status">
    {loading ? 'Duke ngarkuar të dhënat live…' : error ? 'Përditësimi live dështoi; tabela mund të mos jetë e përditësuar.' : active ? 'Tabela përfshin rezultatet live dhe është e përkohshme; rezultati pranë skuadrës tregon fillimisht golat e saj.' : 'Tabela përditësohet automatikisht kur ka ndeshje live.'}
    {!loading && !error && provisional && ' Rezultatet gri presin konfirmimin zyrtar në portal.'}
    <span className="block mt-1 sm:hidden">Rrëshqitni tabelën anash për të parë të gjitha statistikat.</span>
  </div>;
}
