import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { LiveStandingsNotice, LiveTeamIndicators } from '@/components/LiveStandingIndicators';
import { Match, CompetitionType } from '@/types';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MatchDetailModal from '@/components/MatchDetailModal';
import MatchCard from '@/components/MatchCard';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  type: CompetitionType;
  title: string;
}

interface ScorerData {
  id: string;
  firstName: string;
  lastName: string;
  photo?: string;
  goals: number;
  teamId: string;
}

const ScorerPopup: React.FC<{ scorer: ScorerData; onClose: () => void }> = ({ scorer, onClose }) => {
  const { getTeamById, matches, getActiveSeason , videos } = useData() as any;
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl shadow-2xl z-[105]" onClick={e => e.stopPropagation()}>
        <div className="relative bg-gradient-to-br from-[#0f1830] via-[#0F2D5E] to-[#0f1830] pt-6 pb-16 px-6">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-60 h-60 bg-[#0f1830]/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#0066CC]/20 rounded-full blur-3xl" />
          </div>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 z-[110] w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
            S"
          </button>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 backdrop-blur-sm rounded-full mb-4">
              
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Golashenues</span>
            </div>
            <div className="relative mx-auto w-28 h-28 mb-4">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-[#0f1830] rounded-2xl rotate-6 opacity-50 blur-sm" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#0f1830] to-amber-400 rounded-2xl -rotate-3 opacity-30" />
              <div className="relative w-full h-full rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl">
                {scorer.photo ? <img src={scorer.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/10 flex items-center justify-center text-white/50 text-3xl font-bold">{scorer.firstName.charAt(0)}{scorer.lastName.charAt(0)}</div>}
              </div>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">{scorer.firstName} {scorer.lastName}</h2>
            <div className="flex items-center justify-center gap-2 mt-2">
              {team?.logo && <img src={team.logo} alt="" className="w-5 h-5 rounded-full border border-white/20" />}
              <span className="text-sm text-gray-300 font-medium">{team?.name || '-'}</span>
            </div>
          </div>
        </div>
        <div className="relative bg-white rounded-t-3xl -mt-8 pt-6 pb-6 px-6">
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-gradient-to-br from-[#0f1830]/5 to-[#0f1830]/10 rounded-2xl p-4 text-center border border-[#0f1830]/10">
              
              <span className="block text-2xl font-black text-gray-900">{scorer.goals}</span>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Gola</span>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-4 text-center border border-emerald-100">
              
              <span className="block text-2xl font-black text-gray-900">{matchesPlayed}</span>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Ndeshje</span>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-4 text-center border border-amber-100">
              <span className="block text-2xl font-black text-gray-900">{goalsPerMatch}</span>
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Mesatare</span>
            </div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600">Progresi i Golave</span>
              <span className="text-xs font-bold text-[#0f1830]">{scorer.goals} gola</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#0f1830] to-[#3B82F6] rounded-full" style={Object.assign({}, { width: `${Math.min((scorer.goals / Math.max(scorer.goals + 5, 20)) * 100, 100)}%` })} />
            </div>
          </div>
          {team && (
            <div className="flex items-center gap-3 p-3 bg-[#0f1830]/5 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 overflow-hidden flex-shrink-0 shadow-sm">
                {team.logo ? <img src={team.logo} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-gray-400 text-xs font-bold">{team.name?.charAt(0)}</span>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-800">{team.name}</p>
                <p className="text-[11px] text-gray-400">Skuadra aktuale</p>
              </div>
              
            </div>
          )}
        </div>

        {/* Video Section */}
        {(() => {
          const compVideos = (videos || []).filter((v: any) =>
            type === 'superliga' ? v.isFeaturedSuperliga : type === 'liga_pare' ? v.isFeaturedLigaPare : false
          );
          if (compVideos.length === 0) return null;
          return (
            <div className="mt-8 px-3 sm:px-4 md:px-6 lg:px-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-5 bg-[#0f1830] rounded-full"></span>
                <h2 className="text-lg font-bold text-gray-800">Video</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {compVideos.map((v: any) => (
                  <div key={v.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-video">
                      <iframe
                        src={getEmbedUrl(v.url)}
                        className="w-full h-full"
                        allowFullScreen
                        allow="autoplay; encrypted-media"
                        title={v.title}
                      />
                    </div>
                    {v.title && (
                      <div className="p-3">
                        <h3 className="font-semibold text-sm text-gray-800">{v.title}</h3>
                        {v.description && <p className="text-xs text-gray-500 mt-1">{v.description}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

function getEmbedUrl(url: string): string {
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (m) return 'https://www.youtube.com/embed/' + m[1];
  if (url.includes('facebook.com') || url.includes('fb.watch')) {
    return 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(url) + '&show_text=false';
  }
  return url;
}

const CompetitionPage: React.FC<Props> = ({ type, title }) => {
  const { competitions, matches, getActiveSeason, calculateStandings, getAggregatedScorers, getTeamById, videos, protocolLoading, protocolError } = useData() as any;
  const activeSeason = getActiveSeason();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [activeTab, setActiveTab] = useState<'ndeshjet' | 'tabela' | 'golashenuesit'>('ndeshjet');
  const [statusFilter, setStatusFilter] = useState<string>('finished');

  // When "Ardhshme" is selected, jump to next week with planned matches
  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    if (value === 'planned') {
      // Find first week that has planned matches
      const plannedWeeks = [...new Set(
        compMatches.filter(m => m.status === 'planned').map(m => m.week)
      )].sort((a, b) => a - b);
      if (plannedWeeks.length > 0) setSelectedWeek(plannedWeeks[0]);
    } else if (value === 'finished') {
      // Jump to last week with finished matches
      const finishedWeeks = [...new Set(
        compMatches.filter(m => m.status === 'finished').map(m => m.week)
      )].sort((a, b) => a - b);
      if (finishedWeeks.length > 0) setSelectedWeek(finishedWeeks[finishedWeeks.length - 1]);
    }
  };
  const [selectedScorer, setSelectedScorer] = useState<ScorerData | null>(null);

  const comp = useMemo(() =>
    competitions.find(c => c.type === type && (activeSeason ? c.seasonId === activeSeason.id : true)),
    [competitions, type, activeSeason]
  );

  const compMatches = useMemo(() =>
    comp ? matches.filter(m => m.competitionId === comp.id) : [],
    [comp, matches]
  );

  const weeks = useMemo(() => [...new Set(compMatches.map(m => m.week))].sort((a, b) => a - b), [compMatches]);
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    // Find last week with finished matches
    const finishedWeeks = compMatches
      .filter(m => m.status === 'finished')
      .map(m => m.week);
    if (finishedWeeks.length > 0) return Math.max(...finishedWeeks);
    // Fallback to last week with any matches
    const allWeeks = [...new Set(compMatches.map(m => m.week))].sort((a, b) => a - b);
    return allWeeks.length > 0 ? allWeeks[allWeeks.length - 1] : 1;
  });

    useEffect(() => {
    if (compMatches.length === 0) return;
    const finishedWeeks = [...new Set(
      compMatches.filter(m => m.status === 'finished').map(m => m.week)
    )].sort((a, b) => a - b);
    if (finishedWeeks.length > 0) {
      setSelectedWeek(finishedWeeks[finishedWeeks.length - 1]);
      setStatusFilter('finished');
    } else {
      const plannedWeeks = [...new Set(
        compMatches.filter(m => m.status === 'planned').map(m => m.week)
      )].sort((a, b) => a - b);
      if (plannedWeeks.length > 0) {
        setSelectedWeek(plannedWeeks[0]);
        setStatusFilter('planned');
      }
    }
  }, [comp?.id]);

  const weekMatches = useMemo(() => {
    let filtered = compMatches.filter(m => m.week === selectedWeek);
    if (statusFilter !== 'all') filtered = filtered.filter(m => m.status === statusFilter);
    return filtered;
  }, [compMatches, selectedWeek, statusFilter]);

  const standings = useMemo(() => comp ? calculateStandings(comp.id) : [], [comp, calculateStandings]);
  const scorers = useMemo(() => comp ? getAggregatedScorers(comp.id).slice(0, 20) : [], [comp, getAggregatedScorers]);

  const isSuperliga = type === 'superliga';
  const weekIdx = weeks.indexOf(selectedWeek);

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

  const liveMatches = weekMatches.filter(m => m.status === 'live');
  const finishedMatches = weekMatches.filter(m => m.status === 'finished');
  const plannedMatches = weekMatches.filter(m => m.status === 'planned');

  
  const MatchSection: React.FC<{ title: string; matchList: Match[]; dot: string; ring?: boolean }> = ({ title: t, matchList, dot, ring }) => {
    if (matchList.length === 0) return null;
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3"><span className={`w-2.5 h-2.5 rounded-full ${dot}`} /><h3 className="font-semibold text-gray-700">{t}</h3></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matchList.map(m => <div key={m.id} className={ring ? 'ring-2 ring-red-300 rounded-2xl' : ''}><MatchCard match={m} onClick={() => setSelectedMatch(m)} /></div>)}
        </div>
      </div>
    );
  };

  const tabItems = [
    { key: 'ndeshjet' as const, label: 'Ndeshjet', icon: null },
    { key: 'tabela' as const, label: 'Tabela', icon: null },
    { key: 'golashenuesit' as const, label: 'Golashenuesit', icon: null },
  ];

  const medalColors = ['from-amber-300 to-amber-500', 'from-gray-300 to-gray-500', 'from-amber-600 to-amber-800'];

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-gray-400 text-sm mt-1">Sezoni {activeSeason?.name || ''}</p>
        </div>

        <div className="flex gap-2 mb-8">
          {tabItems.map(t => {
            return <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === t.key ? 'bg-[#0f1830] text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>{t.label}</button>;
          })}
        </div>

        {/* Matches */}
        {activeTab === 'ndeshjet' && (
          <div>
            {weeks.length === 0 ? <p className="text-gray-400 text-center py-8">Nuk ka ndeshje te regjistruara.</p> : (
              <>
                <div className="flex items-center justify-between mb-6 bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <button onClick={() => weekIdx > 0 && setSelectedWeek(weeks[weekIdx - 1])} disabled={weekIdx <= 0} className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <div className="flex items-center gap-3">
                    <select value={selectedWeek} onChange={e => setSelectedWeek(Number(e.target.value))} className="text-lg font-bold text-gray-800 bg-transparent border-none focus:ring-0 cursor-pointer">{weeks.map(w => <option key={w} value={w}>Java {w}</option>)}</select>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">{weekIdx + 1} / {weeks.length}</span>
                  </div>
                  <button onClick={() => weekIdx < weeks.length - 1 && setSelectedWeek(weeks[weekIdx + 1])} disabled={weekIdx >= weeks.length - 1} className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
                <div className="flex gap-2 mb-6">
                  {[{ value: 'all', label: 'Te gjitha' }, { value: 'finished', label: 'Perfunduara' }, { value: 'planned', label: 'Ardhshme' }, { value: 'live', label: 'Live' }].map(f => (
                    <button key={f.value} onClick={() => handleStatusFilter(f.value)} className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${statusFilter === f.value ? 'bg-[#0f1830] text-white shadow-sm' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>{f.label}</button>
                  ))}
                </div>
                {weekMatches.length === 0 ? <p className="text-gray-400 text-center py-8 bg-white rounded-2xl border border-gray-100">Nuk ka ndeshje per kete jave.</p> : (
                  <>
                    <MatchSection title="LIVE" matchList={liveMatches} dot="bg-red-500 animate-pulse" ring />
                    <MatchSection title="Ndeshjet e Perfunduara" matchList={finishedMatches} dot="bg-green-500" />
                    <MatchSection title="Ndeshjet e Ardhshme" matchList={plannedMatches} dot="bg-[#0f1830]" />
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Standings - Premium */}
        {activeTab === 'tabela' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {standings.length === 0 ? <p className="text-gray-400 text-center py-8">Nuk ka te dhena per tabelen.</p> : (
              <>
                <div className="bg-[#0f1830] px-5 py-3.5 flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{title}{standings.some(row=>row.liveResults.some(result=>!result.provisional)) ? ' · LIVE' : ''}</span>
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
                        <tr key={row.teamId} className={`${row.liveResults.length ? 'bg-sky-50' : getRowBg(i + 1)} hover:bg-[#0f1830]/10/30 transition-colors border-b border-gray-100 last:border-0`}>
                          <td className={`px-3 py-2.5 sticky left-0 z-10 ${row.liveResults.length ? 'bg-sky-50' : getRowBg(i + 1)}`}>
                            <div className="flex items-center">
                              <span className="w-1 h-6 rounded-sm mr-2 flex-shrink-0" style={Object.assign({}, { backgroundColor: getRowBorder(i + 1) })} />
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
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50/50 flex flex-wrap gap-4 text-[10px] text-gray-500 font-medium">
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
              </>
            )}
          </div>
        )}

        {activeTab === 'golashenuesit' && (
          <div>
            {scorers.length === 0 ? <p className="text-gray-400 text-center py-8">Nuk ka golashenues te regjistruar.</p> : (
              <>
                {/* #1 Top Scorer - Hero Card */}
                {scorers[0] && (() => {
                  const s = scorers[0];
                  const team = getTeamById(s.teamId);
                  return (
                    <div onClick={() => setSelectedScorer(s)} className="cursor-pointer mb-6 group">
                      <div className="bg-gradient-to-br from-[#0f1830] via-[#0F2D5E] to-[#0f1830] rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden relative">
                        <div className="absolute inset-0"><div className="absolute -top-20 -right-20 w-60 h-60 bg-[#0f1830]/20 rounded-full blur-3xl" /><div className="absolute -bottom-10 -left-10 w-40 h-40 bg-[#0066CC]/15 rounded-full blur-3xl" /></div>
                        <div className="relative z-10 flex items-center gap-6">
                          <div className="relative">
                            <div className="absolute -top-2 -left-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center shadow-lg z-10"><span className="text-white text-sm font-black">1</span></div>
                            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/10 border-2 border-white/20 shadow-xl group-hover:scale-105 transition-transform">
                              {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-white/40 text-3xl font-bold">{s.firstName.charAt(0)}{s.lastName.charAt(0)}</div>}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-400/20 rounded-full mb-2">
                              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Golashenuesi #1</span>
                            </div>
                            <h3 className="text-2xl font-black text-white mb-1">{s.firstName} {s.lastName}</h3>
                            <div className="flex items-center gap-2">
                              {team?.logo && <img src={team.logo} alt="" className="w-5 h-5 rounded-full border border-white/20" />}
                              <span className="text-sm text-gray-300">{team?.name || '-'}</span>
                            </div>
                          </div>
                          <div className="text-center">
                            <span className="block text-5xl font-black text-white">{s.goals}</span>
                            <span className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Gola</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Rest of scorers */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="bg-[#0f1830] px-5 py-3.5 flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Golashenuesit</span>
                    <span className="text-[10px] text-gray-400 ml-auto">Kliko per detaje</span>
                  </div>
                  {scorers.slice(1).map((s, idx) => {
                    const i = idx + 1;
                    const team = getTeamById(s.teamId);
                    return (
                      <div key={s.id} onClick={() => setSelectedScorer(s)} className="flex items-center gap-4 px-5 py-3.5 border-t border-gray-50 hover:bg-gray-50/80 transition-colors cursor-pointer group">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i < 3 ? 'bg-gradient-to-br ' + medalColors[i] + ' text-white shadow-sm' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</span>
                        <div className="w-10 h-10 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                          {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">{s.firstName.charAt(0)}{s.lastName.charAt(0)}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-[#0f1830] transition-colors">{s.firstName} {s.lastName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {team?.logo && <img src={team.logo} alt="" className="w-4 h-4 rounded-full" />}
                            <span className="text-[11px] text-gray-400">{team?.name || '-'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                            <div className="h-full bg-gradient-to-r from-[#0f1830] to-[#3B82F6] rounded-full" style={Object.assign({}, { width: `${Math.min((s.goals / (scorers[0]?.goals || 1)) * 100, 100)}%` })} />
                          </div>
                          <span className="text-base font-black text-[#0f1830] w-8 text-right">{s.goals}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
        

        {/* Video Section */}
        {(() => {
          const compVideos = (videos || []).filter((v: any) =>
            type === 'superliga' ? v.isFeaturedSuperliga : type === 'liga_pare' ? v.isFeaturedLigaPare : false
          );
          if (compVideos.length === 0) return null;
          return (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-5 bg-[#0f1830] rounded-full"></span>
                <h2 className="text-lg font-bold text-gray-800">Video</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {compVideos.map((v: any) => (
                  <div key={v.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="aspect-video">
                      <iframe
                        src={getEmbedUrl(v.url)}
                        className="w-full h-full"
                        allowFullScreen
                        allow="autoplay; encrypted-media"
                        title={v.title}
                      />
                    </div>
                    {v.title && (
                      <div className="p-3">
                        <h3 className="font-semibold text-sm text-gray-800">{v.title}</h3>
                        {v.description && <p className="text-xs text-gray-500 mt-1">{v.description}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>
      <div className="mt-auto"><Footer /></div>
      <MatchDetailModal match={selectedMatch} onClose={() => setSelectedMatch(null)} />
      {selectedScorer && <ScorerPopup scorer={selectedScorer} onClose={() => setSelectedScorer(null)} />}
    </div>
  );
};

export default CompetitionPage;

