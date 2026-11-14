import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { Match } from '@/types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MatchDetailModal from '@/components/MatchDetailModal';
import KupaBracketView from '@/components/KupaBracketView';
import { normalizeSlots, KUPA_ROUND_NAMES } from '@/lib/kupaBracket';

function formatDate(iso?: string): string {
  if (!iso) return '';
  const p = iso.split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return iso;
}

interface Tie {
  teamA: string;
  teamB: string;
  legs: Match[];
  aggA: number;
  aggB: number;
  winsA: number;
  winsB: number;
  isComplete: boolean;
  winner?: string;
}

const KupaPage: React.FC = () => {
  const { competitions, displayMatches:matches, getActiveSeason, getTeamById, getAggregatedScorers, getGoalsByMatch, protocolError, settings } = useData();
  const activeSeason = getActiveSeason();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [activeTab, setActiveTab] = useState<'skema' | 'bracket' | 'golashenuesit'>('skema');

  const comp = useMemo(() =>
    competitions.find(c => c.type === 'kupa' && (activeSeason ? c.seasonId === activeSeason.id : true)),
    [competitions, activeSeason]
  );

  const cupMatches = useMemo(() =>
    comp ? matches.filter(m => m.competitionId === comp.id) : [],
    [comp, matches]
  );

  const rounds = useMemo(() => {
    const roundMap: Record<number, Match[]> = {};
    cupMatches.forEach(m => {
      if (!roundMap[m.week]) roundMap[m.week] = [];
      roundMap[m.week].push(m);
    });

    return Object.entries(roundMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([round, ms]) => {
        const ties: Tie[] = [];
        const used = new Set<string>();

        ms.forEach(m => {
          if (used.has(m.id)) return;

          const teamPair = [m.homeTeamId, m.awayTeamId].sort().join('|');
          const relatedLegs = ms.filter(m2 => {
            const pair2 = [m2.homeTeamId, m2.awayTeamId].sort().join('|');
            return pair2 === teamPair && !used.has(m2.id);
          });

          relatedLegs.forEach(l => used.add(l.id));
          relatedLegs.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));

          const teamA = relatedLegs[0].homeTeamId;
          const teamB = relatedLegs[0].awayTeamId;

          let aggA = 0, aggB = 0, winsA = 0, winsB = 0;
          let allFinished = true;

          relatedLegs.forEach(leg => {
            if (leg.status !== 'finished' || leg.homeScore == null || leg.awayScore == null) { allFinished = false; return; }
            let goalsA = 0, goalsB = 0;
            if (leg.homeTeamId === teamA) {
              goalsA = leg.homeScore ?? 0;
              goalsB = leg.awayScore ?? 0;
            } else {
              goalsA = leg.awayScore ?? 0;
              goalsB = leg.homeScore ?? 0;
            }
            aggA += goalsA;
            aggB += goalsB;
            if (goalsA > goalsB) winsA++;
            else if (goalsB > goalsA) winsB++;
          });

          const isComplete = allFinished && relatedLegs.length >= 1;
          let winner: string | undefined;

          if (isComplete) {
            if (winsA > winsB) winner = teamA;
            else if (winsB > winsA) winner = teamB;
            else if (aggA > aggB) winner = teamA;
            else if (aggB > aggA) winner = teamB;
          }

          ties.push({ teamA, teamB, legs: relatedLegs, aggA, aggB, winsA, winsB, isComplete, winner });
        });

        return { round: Number(round), ties };
      });
  }, [cupMatches]);

  const bracketSlots = useMemo(() => normalizeSlots(settings?.kupaBracket?.slots), [settings]);
  const hasBracket = bracketSlots.some(Boolean);
  const upcoming = useMemo(() => cupMatches
    .filter(m => m.status === 'planned' || m.status === 'live')
    .sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.time || '').localeCompare(b.time || '')), [cupMatches]);

  const roundNames: Record<number, string> = {
    1: 'Raundi 1',
    2: 'Cerekfinalet',
    3: 'Gjysme finalet',
    4: 'Finalja',
  };

  const scorers = useMemo(() => comp ? getAggregatedScorers(comp.id).slice(0, 20) : [], [comp, getAggregatedScorers]);

  const LegRow: React.FC<{ match: Match; legLabel: string }> = ({ match, legLabel }) => {
    const home = getTeamById(match.homeTeamId);
    const away = getTeamById(match.awayTeamId);
    const isFinished = match.status === 'finished';
    const isLive = match.status === 'live';

    return (
      <div
        className={`bg-white rounded-xl border cursor-pointer transition-all hover:shadow-md ${isLive ? 'border-red-200 shadow-sm shadow-red-50' : 'border-gray-100 hover:border-[#0f1830]/20'}`}
        onClick={() => setSelectedMatch(match)}
      >
        <div className={`flex items-center justify-between px-2.5 py-1 border-b ${isLive ? 'bg-red-50/50 border-red-100' : 'bg-gray-50/50 border-gray-100'}`}>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{legLabel}</span>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" /> Live
              </span>
            )}
            {match.date && <span className="text-[10px] text-gray-400">{formatDate(match.date)}</span>}
            {match.time && <span className="text-[10px] text-gray-400">{match.time}</span>}
          </div>
        </div>
        <div className="px-2.5 py-1.5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-5 h-5 rounded-md bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0">
                {home?.logo ? <img src={home.logo} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-[8px] text-gray-400 font-bold">{home?.name?.charAt(0)}</span>}
              </div>
              <span className="text-xs font-semibold text-gray-800 truncate">{home?.name || 'TBD'}</span>
            </div>
            <span className={`text-sm font-black tabular-nums ${isFinished || isLive ? 'text-gray-900' : 'text-gray-300'}`}>
              {isFinished || isLive ? (match.homeScore ?? '—') : '-'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-5 h-5 rounded-md bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0">
                {away?.logo ? <img src={away.logo} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-[8px] text-gray-400 font-bold">{away?.name?.charAt(0)}</span>}
              </div>
              <span className="text-xs font-semibold text-gray-800 truncate">{away?.name || 'TBD'}</span>
            </div>
            <span className={`text-sm font-black tabular-nums ${isFinished || isLive ? 'text-gray-900' : 'text-gray-300'}`}>
              {isFinished || isLive ? (match.awayScore ?? '—') : '-'}
            </span>
          </div>
          <div className="mt-1 text-center">
            <span className="text-[10px] text-[#0f1830] font-semibold cursor-pointer hover:underline">Shiko detajet ⬺</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Kupa e Kosoves</h1>
          {protocolError && <p role="status" className="mt-2 text-sm text-amber-800">Përditësimi i procesverbaleve dështoi; rezultatet mund të jenë të vjetruara ose të mungojnë.</p>}
          <p className="text-gray-400 text-sm mt-1">Sezoni {activeSeason?.name || ''}</p>
        </div>

        <div className="flex gap-2 mb-8">
          {[
            { key: 'skema' as const, label: 'Skema' },
            { key: 'bracket' as const, label: 'Ndeshjet' },
            { key: 'golashenuesit' as const, label: 'Golashenuesit' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === t.key ? 'bg-[#0f1830] text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'skema' && (
          <>
            {hasBracket ? (
              <KupaBracketView slots={bracketSlots} cupMatches={cupMatches} onSelect={setSelectedMatch} />
            ) : (
              <p className="text-gray-400 text-center py-8">Shorti i Kupes nuk eshte publikuar ende.</p>
            )}
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 bg-[#0f1830] rounded-full" />
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Ndeshjet qe do te zhvillohen</h3>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-gray-400 text-sm py-4">Nuk ka ndeshje te caktuara per momentin.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {upcoming.map(m => (
                    <LegRow key={m.id} match={m} legLabel={KUPA_ROUND_NAMES[(m.week || 1) - 1] || `Raundi ${m.week}`} />
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'bracket' && (
          rounds.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Nuk ka ndeshje te regjistruara ne Kupe.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="flex gap-4 min-w-max pb-4">
                {rounds.map(r => (
                  <div key={r.round} className="min-w-[280px]">
                    <div className="flex items-center gap-2 mb-3 justify-center">
                      <span className="w-1 h-4 bg-[#0f1830] rounded-full" />
                      <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                        {roundNames[r.round] || `Raundi ${r.round}`}
                      </h3>
                      {r.round === 3 && <span className="text-[10px] bg-[#0f1830]/10 text-[#0f1830] font-bold px-2 py-0.5 rounded-full border border-[#0f1830]/15">Best of 3</span>}
                    </div>
                    <div className="space-y-3">
                      {r.ties.map((tie, ti) => {
                        const teamA = getTeamById(tie.teamA);
                        const teamB = getTeamById(tie.teamB);
                        const hasManyLegs = tie.legs.length > 1;

                        return (
                          <div key={ti} className="rounded-xl border border-[#0f1830]/15 overflow-hidden" style={Object.assign({}, { background: 'linear-gradient(145deg, #F7F8FA 0%, #EEF0F4 100%)' })}>
                            {/* Aggregate Header */}
                            {hasManyLegs && (
                              <div className="px-3 py-2 border-b border-[#0f1830]/10">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div className="w-5 h-5 rounded-md bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                                      {teamA?.logo ? <img src={teamA.logo} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-[8px] text-gray-400 font-bold">{teamA?.name?.charAt(0)}</span>}
                                    </div>
                                    <div className="min-w-0">
                                      <span className={`text-xs font-bold truncate block ${tie.winner === tie.teamA ? 'text-[#0f1830]' : 'text-gray-700'}`}>{teamA?.name || 'TBD'}</span>
                                      <span className="text-[9px] text-gray-400">{tie.winsA} fitore</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-center mx-3">
                                    <div className="flex items-center gap-1">
                                      <span className={`text-base font-black tabular-nums ${tie.winner === tie.teamA ? 'text-[#0f1830]' : 'text-gray-800'}`}>{tie.aggA}</span>
                                      <span className="text-gray-300 font-light mx-0.5">:</span>
                                      <span className={`text-base font-black tabular-nums ${tie.winner === tie.teamB ? 'text-[#0f1830]' : 'text-gray-800'}`}>{tie.aggB}</span>
                                    </div>
                                    <span className="text-[9px] text-gray-400 font-semibold uppercase">Rezultati Final</span>
                                  </div>
                                  <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                    <div className="min-w-0 text-right">
                                      <span className={`text-xs font-bold truncate block ${tie.winner === tie.teamB ? 'text-[#0f1830]' : 'text-gray-700'}`}>{teamB?.name || 'TBD'}</span>
                                      <span className="text-[9px] text-gray-400">{tie.winsB} fitore</span>
                                    </div>
                                    <div className="w-5 h-5 rounded-md bg-white border border-gray-200 overflow-hidden flex-shrink-0">
                                      {teamB?.logo ? <img src={teamB.logo} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-[8px] text-gray-400 font-bold">{teamB?.name?.charAt(0)}</span>}
                                    </div>
                                  </div>
                                </div>
                                {tie.isComplete && tie.winner && (
                                  <div className="flex justify-center mt-1">
                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-100">
                                      Kalon: {tie.winner === tie.teamA ? teamA?.name : teamB?.name}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Individual legs */}
                            <div className="p-2 space-y-1.5">
                              {tie.legs.map((leg, li) => (
                                <LegRow
                                  key={leg.id}
                                  match={leg}
                                  legLabel={tie.legs.length === 1
                                    ? (roundNames[r.round] === 'Finalja' ? 'Finalja' : 'Ndeshja')
                                    : `Ndeshja e ${li + 1}-${li === 0 ? 're' : li === 1 ? 'te' : 'te'}`
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        )}

        {activeTab === 'golashenuesit' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden max-w-4xl">
            {scorers.length === 0 ? (
              <p className="text-gray-400 text-center py-8">Nuk ka golashenues te regjistruar.</p>
            ) : (
              <>
                <div className="grid grid-cols-[40px_48px_1fr_auto_60px] gap-3 px-4 py-3.5 bg-[#0f1830] text-xs font-semibold text-gray-300 uppercase">
                  <span>#</span><span></span><span>Lojtari</span><span>Skuadra</span><span className="text-right">Gola</span>
                </div>
                {scorers.map((s, i) => {
                  const team = getTeamById(s.teamId);
                  return (
                    <div key={s.id} className="grid grid-cols-[40px_48px_1fr_auto_60px] gap-3 px-4 py-3 items-center border-t border-gray-50 hover:bg-gray-50/80 transition-colors">
                      <span className={`text-sm font-bold ${i < 3 ? 'text-[#0f1830]' : 'text-gray-400'}`}>{i + 1}</span>
                      <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden border border-gray-200">
                        {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">{s.firstName.charAt(0)}{s.lastName.charAt(0)}</div>}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{s.firstName} {s.lastName}</span>
                      <div className="flex items-center gap-1.5">
                        {team?.logo && <img src={team.logo} alt="" className="w-5 h-5 rounded-full" />}
                        <span className="text-xs text-gray-500 hidden sm:inline">{team?.name || '-'}</span>
                      </div>
                      <span className="text-right text-sm font-bold text-[#0f1830]">{s.goals}</span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>
      <div className="mt-auto"><Footer /></div>
      <MatchDetailModal match={selectedMatch ? matches.find(m=>m.id===selectedMatch.id)||selectedMatch : null} onClose={() => setSelectedMatch(null)} />
    </div>
  );
};

export default KupaPage;


