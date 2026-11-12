import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { LiveStandingsNotice, LiveTeamIndicators } from '@/components/LiveStandingIndicators';
import { Link } from 'react-router-dom';
interface ScorerModalData {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string;
  goals: number;
  teamId: string;
}

const ScorerModal: React.FC<{ scorer: ScorerModalData; onClose: () => void }> = ({ scorer, onClose }) => {
  const { getTeamById, matches, getActiveSeason } = useData();
  const team = getTeamById(scorer.teamId);
  const activeSeason = getActiveSeason();

  const seasonMatches = useMemo(() =>
    activeSeason ? matches.filter(m => m.seasonId === activeSeason.id && m.status === 'finished') : matches.filter(m => m.status === 'finished'),
    [matches, activeSeason]
  );

  const matchesPlayed = useMemo(() =>
    seasonMatches.filter(m => m.homeTeamId === scorer.teamId || m.awayTeamId === scorer.teamId).length,
    [seasonMatches, scorer.teamId]
  );

  const goalsPerMatch = matchesPlayed > 0 ? (scorer.goals / matchesPlayed).toFixed(2) : '0.00';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md cursor-pointer" onClick={onClose} />
      <div
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border-2 border-[#0f1830]/40 shadow-[0_0_60px_-10px_rgba(30,111,242,0.3)]"
        style={Object.assign({}, { background: 'linear-gradient(145deg, #F0F2F5 0%, #E8EBF0 50%, #F0F2F5 100%)' })}
        onClick={e => e.stopPropagation()}
      >
        {/* Top blue glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[2px] bg-gradient-to-r from-transparent via-[#0f1830] to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150px] h-[30px] bg-[#0f1830]/5 blur-2xl" />

        {/* Close */}
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 z-[110] w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-all text-gray-500 hover:text-red-500 text-lg font-bold shadow-md">
          Ò
        </button>

        {/* Player Header */}
        <div className="px-6 pt-6 pb-5 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#0f1830]/15 rounded-lg mb-4 shadow-sm">
            <span className="text-[10px] font-bold text-[#0f1830] uppercase tracking-wider">Golashenues</span>
          </div>
          <div className="relative mx-auto w-24 h-24 mb-4">
            <div className="absolute -inset-1 bg-gradient-to-br from-[#0f1830]/20 to-[#0f1830]/5 rounded-2xl blur-sm" />
            <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-[#0f1830]/20 shadow-xl bg-white">
              {scorer.photo ? <img src={scorer.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl font-black">{scorer.firstName.charAt(0)}{scorer.lastName.charAt(0)}</div>}
            </div>
          </div>
          <h2 className="text-xl font-black text-gray-800 tracking-tight">{scorer.firstName} {scorer.lastName}</h2>
          <div className="flex items-center justify-center gap-2 mt-2">
            {team?.logo && <img src={team.logo} alt="" className="w-5 h-5 rounded-full border border-gray-200" />}
            <span className="text-sm text-gray-500 font-medium">{team?.name || '-'}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-5 pb-5 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white rounded-xl p-3.5 text-center border border-[#0f1830]/15 shadow-sm">
              <span className="block text-2xl font-black text-[#0f1830]">{scorer.goals}</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Gola</span>
            </div>
            <div className="bg-white rounded-xl p-3.5 text-center border border-gray-200 shadow-sm">
              <span className="block text-2xl font-black text-gray-700">{matchesPlayed}</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Ndeshje</span>
            </div>
            <div className="bg-white rounded-xl p-3.5 text-center border border-gray-200 shadow-sm">
              <span className="block text-2xl font-black text-gray-700">{goalsPerMatch}</span>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Mesatare</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-600">Progresi i Golave</span>
              <span className="text-xs font-black text-[#0f1830]">{scorer.goals} gola</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#0f1830] to-[#3B82F6] rounded-full transition-all duration-700" style={Object.assign({}, { width: `${Math.min((scorer.goals / Math.max(scorer.goals + 5, 20)) * 100, 100)}%` })} />
            </div>
          </div>

          {/* Team Card */}
          {team && (
            <div className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-[#0f1830]/15 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 overflow-hidden flex-shrink-0 shadow-sm">
                {team.logo ? <img src={team.logo} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-gray-400 text-xs font-bold">{team.name?.charAt(0)}</span>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">{team.name}</p>
                <p className="text-[11px] text-gray-400">Skuadra aktuale</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom blue glow */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#0f1830]/40 to-transparent" />
      </div>
    </div>
  );
};

const LeagueTablesSection: React.FC = () => {
  const { competitions, calculateStandings, getActiveSeason, getLatestPlayerOfWeek, getTeamById, getAggregatedScorers, isLoading, protocolLoading, protocolError } = useData();
  const activeSeason = getActiveSeason();
  const [selectedScorer, setSelectedScorer] = useState<ScorerModalData | null>(null);

  const leagueComps = useMemo(() =>
    competitions.filter(c =>
      (c.type === 'superliga' || c.type === 'liga_pare') &&
      (activeSeason ? c.seasonId === activeSeason.id : true)
    ), [competitions, activeSeason]);

  const [selectedComp, setSelectedComp] = useState<string>(leagueComps[0]?.id || '');

  useEffect(() => {
    if (!selectedComp && leagueComps.length > 0) {
      setSelectedComp(leagueComps[0].id);
    }
  }, [leagueComps, selectedComp]);

  const standings = useMemo(() => {
    if (!selectedComp) return [];
    return calculateStandings(selectedComp);
  }, [selectedComp, calculateStandings]);

  const currentComp = competitions.find(c => c.id === selectedComp);
  const isSuperliga = currentComp?.type === 'superliga';

  const pow = getLatestPlayerOfWeek();
  const powTeam = pow ? getTeamById(pow.teamId) : null;

  const topScorers = getAggregatedScorers().slice(0, 3);

  if (isLoading) return (
    <section className="py-10 px-4 flex justify-center items-center min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-4 border-[#0f1830] border-t-transparent animate-spin" />
        <span className="text-sm text-gray-400 font-medium">Duke ngarkuar tabelën...</span>
      </div>
    </section>
  );
  if (leagueComps.length === 0) return null;

  const getRowBorder = (pos: number) => {
    if (isSuperliga) {
      if (pos <= 2) return '#22C55E';
      if (pos <= 6) return '#F59E0B';
      if (pos === 7) return '#D1D5DB';
      if (pos === 8) return '#EAB308';
      if (pos >= 9) return '#EF4444';
    } else {
      if (pos <= 2) return '#22C55E';
      if (pos === 3) return '#F59E0B';
    }
    return '#E5E7EB';
  };

  const getRowBg = (pos: number) => {
    if (isSuperliga) {
      if (pos <= 2) return 'bg-emerald-50/40';
      if (pos <= 6) return 'bg-amber-50/30';
      if (pos === 8) return 'bg-yellow-50/30';
      if (pos >= 9) return 'bg-red-50/30';
    } else {
      if (pos <= 2) return 'bg-emerald-50/40';
      if (pos === 3) return 'bg-amber-50/30';
    }
    return '';
  };

  const medalColors = ['from-amber-300 to-amber-500', 'from-gray-300 to-gray-500', 'from-amber-600 to-amber-800'];
  const medalBg = ['bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200', 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200', 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'];

  return (
    <section className="py-10 px-4 bg-gradient-to-b from-[#F1F5F9] to-white">
      <div className="w-full">

        {/* === PROFESSIONAL SQUARE TAB BUTTONS === */}
        {leagueComps.length > 1 && (
          <div className="flex justify-center mb-8">
            <div className="inline-flex border border-gray-200 overflow-hidden rounded-md shadow-sm">
              {leagueComps.map((c, i) => {
                const isActive = selectedComp === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedComp(c.id)}
                    className={`flex items-center gap-2 px-7 py-3 text-sm font-bold transition-all duration-200 ${
                      i > 0 ? 'border-l border-gray-200' : ''
                    } ${
                      isActive
                        ? 'bg-[#0f1830] text-white'
                        : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">

          {/* === TABLE === */}
          <div className="flex-1 min-w-0">
            {standings.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Nuk ka te dhena per tabelen.</p>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Table header */}
                <div className="bg-[#0f1830] px-3 sm:px-4 md:px-6 lg:px-8 py-3 flex items-center gap-2">
                  
                  <span className="text-sm font-bold text-white">{currentComp?.name || 'Tabela'}{standings.some(row=>row.liveResults.length>0) ? ' · LIVE' : ''}</span>
                  <span className="ml-auto text-[10px] text-gray-400 font-medium uppercase tracking-wider">Sezoni {activeSeason?.name}</span>
                </div>

                <LiveStandingsNotice rows={standings} loading={protocolLoading} error={protocolError} />
                <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[560px] sm:min-w-0">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider w-10 sticky left-0 bg-gray-50 z-10">#</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-500 uppercase tracking-wider sticky left-10 bg-gray-50 z-10">Skuadra</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-9">ND</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-9">F</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-9">B</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-9">H</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-14">G</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-10">DG</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider w-11">P</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Forma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => (
                      <tr
                        key={row.teamId}
                        className={`${row.liveResults.length ? 'bg-sky-50' : getRowBg(i + 1)} hover:bg-[#0f1830]/10/30 transition-colors border-b border-gray-100 last:border-0`}
                      >
                        <td className={`px-3 py-2.5 sticky left-0 z-10 ${row.liveResults.length ? 'bg-sky-50' : getRowBg(i + 1)}`}>
                          <div className="flex items-center">
                            <span
                              className="w-1 h-6 rounded-sm mr-2 flex-shrink-0"
                              style={Object.assign({}, { backgroundColor: getRowBorder(i + 1) })}
                            />
                            <span className={`text-xs font-bold ${i < 3 ? 'text-[#0f1830]' : 'text-gray-400'}`}>{i + 1}</span>
                          </div>
                        </td>
                        <td className={`px-3 py-2.5 sticky left-10 z-10 ${row.liveResults.length ? 'bg-sky-50' : getRowBg(i + 1)}`}>
                          <div className="flex items-center gap-2"><Link to={`/skuadra/${row.teamId}`} className="flex items-center gap-2 hover:text-[#0f1830] transition-colors group">
                            <div className="w-7 h-7 rounded-md bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-200 group-hover:border-[#0f1830]/30 transition-colors">
                              {row.teamLogo ? <img src={row.teamLogo} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-[9px] text-gray-400 font-bold">{row.teamName.charAt(0)}</span>}
                            </div>
                            <span className="font-semibold text-gray-800 group-hover:text-[#0f1830] whitespace-nowrap text-[13px]">{row.teamName}</span>
                          </Link><LiveTeamIndicators row={row}/></div>
                        </td>
                        <td className={`px-3 py-2.5 text-center font-medium ${row.liveResults.length?'text-rose-700':'text-gray-600'}`}>{row.played}</td>
                        <td className={`px-3 py-2.5 text-center font-semibold ${row.liveResults.length?'text-rose-700':'text-emerald-600'}`}>{row.won}</td>
                        <td className={`px-3 py-2.5 text-center ${row.liveResults.length?'text-rose-700 font-semibold':'text-gray-400'}`}>{row.drawn}</td>
                        <td className={`px-3 py-2.5 text-center font-semibold ${row.liveResults.length?'text-rose-700':'text-red-500'}`}>{row.lost}</td>
                        <td className={`px-3 py-2.5 text-center text-xs font-medium ${row.liveResults.length?'text-rose-700':'text-gray-500'}`}>{row.goalsFor}:{row.goalsAgainst}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-xs" style={Object.assign({}, { color: row.goalDifference > 0 ? '#22C55E' : row.goalDifference < 0 ? '#EF4444' : '#9CA3AF' })}>{row.goalDifference > 0 ? '+' : ''}{row.goalDifference}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center justify-center w-8 h-7 rounded-md text-white font-bold text-xs ${row.liveResults.length?'bg-rose-700':'bg-[#0f1830]'}`}>{row.points}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center hidden md:table-cell">
                          <div className="flex justify-center gap-0.5">
                            {row.form.map((f, fi) => (
                              <span key={fi} className={`w-5 h-5 rounded-sm text-[9px] font-bold flex items-center justify-center text-white ${f === 'W' ? 'bg-emerald-500' : f === 'L' ? 'bg-red-500' : 'bg-gray-400'}`}>
                                {f === 'W' ? 'F' : f === 'L' ? 'H' : 'B'}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>

                {/* Legend */}
                <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 border-t border-gray-200 bg-gray-50/50 flex flex-wrap gap-4 text-[10px] text-gray-500 font-medium">
                  {isSuperliga ? (
                    <>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-4 rounded-sm bg-emerald-500" /> Gjysme finale Playoff</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-4 rounded-sm bg-amber-500" /> Playoff</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-4 rounded-sm bg-yellow-500" /> Playoff Renie/Ngritje</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-4 rounded-sm bg-red-500" /> Bie ne Ligen e Pare</span>
                    </>
                  ) : (
                    <>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-4 rounded-sm bg-emerald-500" /> Promovohen ne Superlige</span>
                      <span className="flex items-center gap-1.5"><span className="w-2 h-4 rounded-sm bg-amber-500" /> Playoff Renie/Ngritje</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* === SIDEBAR === */}
          <div className="lg:w-[340px] flex-shrink-0 space-y-6">
            {/* Player of the Week */}
        {pow && (
          <Link to="/lojtari-javes" className="block group">
            <div className="rounded-xl overflow-hidden border-2 border-[#0f1830]/30 shadow-[0_0_30px_-8px_rgba(30,111,242,0.2)] hover:shadow-[0_0_40px_-5px_rgba(30,111,242,0.3)] transition-all duration-300 hover:-translate-y-1" style={Object.assign({}, { background: 'linear-gradient(145deg, #F0F2F5 0%, #E8EBF0 100%)' })}>
              {/* Top blue glow */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#0f1830] to-transparent" />
              <div className="px-5 pt-5 pb-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-[#0f1830]/15 rounded-lg shadow-sm">
                  <span className="text-[10px] font-bold text-[#0f1830] uppercase tracking-wider">Lojtari i Javes</span>
                </div>
              </div>
              <div className="flex justify-center py-5">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-[#0f1830]/20 to-[#0f1830]/5 rounded-2xl blur-sm" />
                  <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-white border-2 border-[#0f1830]/20 shadow-xl group-hover:scale-105 transition-transform duration-300">
                    {pow.photo ? <img src={pow.photo} alt={pow.firstName} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-3xl font-black">{pow.firstName.charAt(0)}{pow.lastName.charAt(0)}</div>}
                  </div>
                </div>
              </div>
              <div className="px-5 pb-5 text-center">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#0f1830]/10 rounded-md text-[10px] font-bold text-[#0f1830] uppercase tracking-wider mb-2 border border-[#0f1830]/10">Java {pow.week}</span>
                <h3 className="text-lg font-black text-gray-800 mb-2">{pow.firstName} {pow.lastName}</h3>
                <div className="flex items-center justify-center gap-2">
                  {powTeam?.logo && <img src={powTeam.logo} alt={powTeam.name} className="w-5 h-5 rounded-full border border-gray-200" />}
                  <span className="text-sm text-gray-500 font-medium">{powTeam?.name || '-'}</span>
                </div>
                {pow.isScorer && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-3 sm:px-4 md:px-6 lg:px-8 py-1.5 bg-white border border-[#0f1830]/15 rounded-lg shadow-sm">
                    <span className="text-xs font-bold text-[#0f1830]">{pow.goalsCount} Gola</span>
                  </div>
                )}
              </div>
              {/* Bottom blue glow */}
              <div className="h-[2px] bg-gradient-to-r from-transparent via-[#0f1830]/30 to-transparent" />
            </div>
          </Link>
        )}

            {/* Top Scorers */}
        {topScorers.length > 0 && (
          <div className="rounded-xl overflow-hidden border-2 border-[#0f1830]/25 shadow-[0_0_30px_-8px_rgba(30,111,242,0.15)]" style={Object.assign({}, { background: 'linear-gradient(145deg, #F0F2F5 0%, #E8EBF0 100%)' })}>
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#0f1830] to-transparent" />
            <div className="px-5 py-3.5 flex items-center gap-2 border-b border-gray-200/60">
              <span className="text-sm font-bold text-gray-800">Top Golashenuesit</span>
              <span className="ml-auto text-[10px] font-bold text-[#0f1830] bg-white px-2 py-0.5 rounded-md border border-[#0f1830]/15">TOP 3</span>
            </div>
            <div className="p-3 space-y-2">
              {topScorers.map((s, i) => {
                const team = getTeamById(s.teamId);
                const rankColors = ['border-[#0f1830]/30 bg-white shadow-md', 'border-gray-200 bg-white shadow-sm', 'border-gray-200 bg-white shadow-sm'];
                const numColors = ['bg-gradient-to-br from-[#0f1830] to-[#3B82F6] text-white', 'bg-gray-200 text-gray-500', 'bg-gray-200 text-gray-500'];
                return (
                  <div key={s.id} onClick={() => setSelectedScorer(s)} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-[#0f1830]/30 ${rankColors[i]}`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${numColors[i]}`}>
                      <span className="text-sm font-black">{i + 1}</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-50 border-2 border-white shadow-md flex-shrink-0">
                      {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-gray-400 text-xs font-bold">{s.firstName.charAt(0)}{s.lastName.charAt(0)}</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{s.firstName} {s.lastName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {team?.logo && <img src={team.logo} alt="" className="w-4 h-4 rounded-full" />}
                        <span className="text-[11px] text-gray-400 font-medium">{team?.name || '-'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-xl font-black text-[#0f1830]">{s.goals}</span>
                      <span className="text-[9px] text-gray-400 font-bold uppercase">Gola</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#0f1830]/30 to-transparent" />
          </div>
        )}
          </div>
        </div>
      </div>
      {selectedScorer && <ScorerModal scorer={selectedScorer} onClose={() => setSelectedScorer(null)} />}
    </section>
  );
};

export default LeagueTablesSection;