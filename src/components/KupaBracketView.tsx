import React, { useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Match } from '@/types';
import { BracketNode, KUPA_ROUND_NAMES, buildCupBracket, bracketChampion } from '@/lib/kupaBracket';

const fmtDate = (iso?: string) => { const p = (iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso || ''; };

interface Props { slots: (string | null)[]; cupMatches: Match[]; onSelect: (m: Match) => void }

const TeamRow: React.FC<{ id: string | null; from?: number; score?: number | null; win: boolean; lost: boolean }> = ({ id, from, score, win, lost }) => {
  const { getTeamById } = useData();
  const team = id ? getTeamById(id) : undefined;
  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 ${win ? 'bg-emerald-50' : ''}`}>
      <div className="w-5 h-5 rounded-md bg-white border border-gray-200 overflow-hidden flex-shrink-0">
        {team?.logo ? <img src={team.logo} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-[8px] text-gray-400 font-bold">{team?.name?.charAt(0) || ''}</span>}
      </div>
      {team ? (
        <span className={`flex-1 min-w-0 truncate text-xs ${win ? 'font-black text-[#0f1830]' : lost ? 'font-medium text-gray-400' : 'font-semibold text-gray-800'}`}>{team.name}</span>
      ) : (
        <span className="flex-1 min-w-0 truncate text-[11px] italic text-gray-400">{from ? `Fituesi i ndeshjes ${from}` : 'Skuadra nuk është caktuar'}</span>
      )}
      <span className={`text-sm font-black tabular-nums w-5 text-right ${win ? 'text-[#0f1830]' : 'text-gray-500'}`}>{score ?? ''}</span>
    </div>
  );
};

const NodeCard: React.FC<{ node: BracketNode; onSelect: (m: Match) => void }> = ({ node, onSelect }) => {
  const played = node.matches.filter(m => m.status === 'finished' || m.status === 'live');
  const showScore = played.length > 0;
  const next = node.matches.find(m => m.status === 'planned');
  const live = node.matches.some(m => m.status === 'live');
  const open = node.matches[0];
  return (
    <button
      type="button"
      disabled={!open}
      onClick={() => open && onSelect(node.matches.find(m => m.status === 'live') || node.matches[node.matches.length - 1])}
      className={`w-full text-left rounded-xl border bg-white overflow-hidden ${live ? 'border-red-300' : 'border-[#0f1830]/15'} ${open ? 'hover:shadow-md cursor-pointer' : 'cursor-default'}`}
    >
      <div className="flex items-center justify-between px-2.5 py-0.5 bg-gray-50 border-b border-gray-100">
        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Ndeshja {node.number}</span>
        {live ? <span className="text-[9px] font-bold text-red-500">LIVE</span>
          : next?.date ? <span className="text-[9px] text-gray-400">{fmtDate(next.date)}{next.time ? ` · ${next.time}` : ''}</span>
          : node.complete ? <span className="text-[9px] text-emerald-600 font-semibold">Përfunduar</span> : null}
      </div>
      <TeamRow id={node.a} from={node.fromA} score={showScore ? node.aggA : null} win={!!node.winner && node.winner === node.a} lost={!!node.winner && node.winner !== node.a} />
      <div className="border-t border-gray-100" />
      <TeamRow id={node.b} from={node.fromB} score={showScore ? node.aggB : null} win={!!node.winner && node.winner === node.b} lost={!!node.winner && node.winner !== node.b} />
    </button>
  );
};

const KupaBracketView: React.FC<Props> = ({ slots, cupMatches, onSelect }) => {
  const { getTeamById } = useData();
  const rounds = useMemo(() => buildCupBracket(slots, cupMatches), [slots, cupMatches]);
  const champion = bracketChampion(rounds);
  const champTeam = champion ? getTeamById(champion) : undefined;
  const ROW = 84; // lartësia e një rreshti të raundit të parë
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-8 px-1">
        {rounds.map((nodes, r) => (
          <div key={r} className="w-[230px] flex-shrink-0">
            <div className="flex items-center gap-2 mb-3 justify-center">
              <span className="w-1 h-4 bg-[#0f1830] rounded-full" />
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">{KUPA_ROUND_NAMES[r]}</h3>
            </div>
            <div className="flex flex-col" style={{ height: ROW * 8 }}>
              {nodes.map(node => (
                <div key={node.number} className="relative flex-1 flex items-center">
                  {r > 0 && <span aria-hidden className="absolute -left-4 top-1/2 w-4 border-t border-gray-300" />}
                  {r < 3 && <span aria-hidden className="absolute -right-4 top-1/2 w-4 border-t border-gray-300" />}
                  {r < 3 && node.index % 2 === 0 && <span aria-hidden className="absolute -right-4 top-1/2 h-full border-l border-gray-300" />}
                  <NodeCard node={node} onSelect={onSelect} />
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="w-[190px] flex-shrink-0">
          <div className="flex items-center gap-2 mb-3 justify-center">
            <span className="w-1 h-4 bg-[#D4A93C] rounded-full" />
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Fituesi</h3>
          </div>
          <div className="flex items-center" style={{ height: ROW * 8 }}>
            <div className="relative w-full rounded-xl border-2 border-[#D4A93C] bg-[#0f1830] text-white p-4 text-center">
              <span aria-hidden className="absolute -left-8 top-1/2 w-8 border-t border-gray-300" />
              <div className="mx-auto w-12 h-12 rounded-full bg-white/10 overflow-hidden flex items-center justify-center mb-2">
                {champTeam?.logo ? <img src={champTeam.logo} alt="" className="w-full h-full object-cover" /> : <span className="text-xl">🏆</span>}
              </div>
              <div className="text-sm font-bold">{champTeam?.name || 'Do të përcaktohet'}</div>
              <div className="text-[10px] uppercase tracking-wider text-[#D4A93C] mt-1">Kampioni i Kupës</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KupaBracketView;
