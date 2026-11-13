import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import MatchDetailModal from './MatchDetailModal';
import MatchVoteWidget from './MatchVoteWidget';
import ProtocolLiveMatches from './ProtocolLiveMatches';
import { Match } from '@/types';
type TabType = 'upcoming' | 'live' | 'finished';

function formatDate(iso?: string): string {
  if (!iso) return '';
  const p = iso.split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return iso;
}

interface LandingMatchesProps {
  initialTab?: TabType;
}

const LandingMatches: React.FC<LandingMatchesProps> = ({ initialTab = 'upcoming' }) => {
  const { matches:portalMatches, displayMatches:matches, competitions, getActiveSeason, getTeamById, settings, protocolMatches, protocolError } = useData();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const activeSeason = getActiveSeason();
  const displayedProtocols = useMemo(()=>{
    const latest=new Map<string,typeof protocolMatches[number]>();
    for(const p of protocolMatches){
      const key=p.portalMatchId||p.id, old=latest.get(key);
      if(!old||(p.updatedAt||'')>(old.updatedAt||''))latest.set(key,p);
    }
    return [...latest.values()].filter(p=>{
      const portal=portalMatches.find(m=>m.id===p.portalMatchId);
      return portal?.status!=='cancelled' && (activeTab==='live'?p.phase!=='finished' && portal?.status!=='finished':activeTab==='finished'?p.phase==='finished' && !portal:false);
    });
  },[protocolMatches,portalMatches,activeTab]);
  const publishedIds = useMemo(()=>new Set(displayedProtocols.map(m=>m.portalMatchId).filter(Boolean)),[displayedProtocols]);

  const seasonMatches = useMemo(() =>
    activeSeason ? matches.filter(m => m.seasonId === activeSeason.id) : matches,
    [matches, activeSeason]
  );

  const superligaComp = useMemo(() =>
    competitions.find(c => c.type === 'superliga' && (activeSeason ? c.seasonId === activeSeason.id : true)),
    [competitions, activeSeason]
  );

  const kupaComp = useMemo(() =>
    competitions.find(c => c.type === 'kupa' && (activeSeason ? c.seasonId === activeSeason.id : true)),
    [competitions, activeSeason]
  );

  const ligaPareComp = useMemo(() =>
    competitions.find(c => c.type === 'liga_pare' && (activeSeason ? c.seasonId === activeSeason.id : true)),
    [competitions, activeSeason]
  );

  const getCompMatches = (compId: string | undefined, status: string): { matches: Match[]; week?: number } => {
    if (!compId) return { matches: [] };
    const filtered = seasonMatches.filter(m => m.competitionId === compId && (status === 'finished' || m.isFeaturedLanding));
    if (status === 'finished') {
      const fin = filtered.filter(m => m.status === 'finished');
      if (fin.length === 0) return { matches: [] };
      const maxWeek = Math.max(...fin.map(m => m.week || 0));
      return { matches: fin.filter(m => !publishedIds.has(m.id)).sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.week || 0)-(a.week || 0)) };
    }
    if (status === 'planned') {
      const pl = filtered.filter(m => m.status === 'planned').sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      const minWeek = pl.length > 0 ? Math.min(...pl.map(m => m.week || 0)) : undefined;
      return { matches: pl, week: minWeek };
    }
    if (status === 'live') return { matches: filtered.filter(m => m.status === 'live' && !publishedIds.has(m.id)) };
    return { matches: [] };
  };

  const statusMap: Record<TabType, string> = { upcoming: 'planned', live: 'live', finished: 'finished' };
  const currentStatus = statusMap[activeTab];

  const superligaData = getCompMatches(superligaComp?.id, currentStatus);
  const ligaPareData = getCompMatches(ligaPareComp?.id, currentStatus);
  const kupaData = getCompMatches(kupaComp?.id, currentStatus);
  const superligaMatches = superligaData.matches;
  const ligaPareMatches = ligaPareData.matches;
  const kupaMatches = kupaData.matches;
  const hasAny = superligaMatches.length > 0 || ligaPareMatches.length > 0 || kupaMatches.length > 0;
  const unavailableEmpty = activeTab === 'live' && protocolError && protocolMatches.length === 0 && !hasAny;

  const liveIds=new Set(protocolMatches.filter(m=>!['finished','setup'].includes(m.phase)).map(m=>m.portalMatchId||m.id));
  const liveCount = seasonMatches.filter(m => m.status === 'live' && !liveIds.has(m.id)).length + liveIds.size;

  const tabs: { key: TabType; label: string }[] = [
    { key: 'live', label: 'Live' },
    { key: 'finished', label: 'Te luajtura' },
    { key: 'upcoming', label: 'Te ardhshme' },
  ];

  // ============ COMPACT MATCH CARD ============
  const MatchRow: React.FC<{ match: Match }> = ({ match }) => {
    const home = getTeamById(match.homeTeamId);
    const away = getTeamById(match.awayTeamId);
    const isFinished = match.status === 'finished';
    const isLive = match.status === 'live';

    return (
      <div
        className={`relative bg-white rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer ${
          isLive ? 'shadow-lg shadow-red-100' : 'shadow-sm border border-gray-100'
        }`}
        onClick={() => setSelectedMatch(match)}
      >
        {/* Left accent stripe, mockup-style */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${isLive ? 'bg-red-500' : 'bg-[#d0a650]'}`} />

        {/* Top bar: date + venue - compact */}
        <div className={`pl-4 pr-3 py-1.5 flex items-center justify-between text-[10px] ${
          isLive
            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white/90'
            : 'bg-gradient-to-r from-[#0f1830] to-[#0f1830] text-white/80'
        }`}>
          <div className="flex items-center gap-2">
            {match.date && (
              <span className="flex items-center gap-1 font-medium">
                
                {formatDate(match.date)}
              </span>
            )}
            {match.time && (
              <span className="flex items-center gap-1 font-medium">
                
                {match.time}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {match.week && !competitions.find(c => c.id === match.competitionId && c.type === "kupa") && (<span className="flex items-center gap-1 text-white/90 text-[11px] font-semibold"><span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">Java {match.week}</span></span>)}
            {match.venue && (
              <span className="flex items-center gap-1 opacity-70">
                
                {match.venue}
              </span>
            )}
            {isLive && (
              <span className="flex items-center gap-1 bg-white/20 px-1.5 py-0.5 rounded">
                <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
                <span className="font-bold tracking-wide">LIVE</span>
              </span>
            )}
          </div>
        </div>

        {match.protocolResult==='finished'&&<div className="px-4 pt-2 text-xs text-amber-800">Përfunduar</div>}
        {/* Main row: home - score - away */}
        <div className="flex items-center justify-between pl-4 pr-4 py-4">
          {/* Home */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-full bg-gray-50 border-2 border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {home?.logo ? (
                <img src={home.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-300 text-base font-bold">{home?.name?.charAt(0) || '?'}</span>
              )}
            </div>
            <span className="text-[13px] font-bold text-gray-800 truncate">{home?.name || 'TBD'}</span>
          </div>

          {/* Score */}
          <div className="flex items-center gap-1 px-3 min-w-[70px] justify-center">
            {isFinished || isLive ? (
              <>
                <span className={`text-2xl font-black tabular-nums w-7 text-right ${isLive ? 'text-red-500' : 'text-gray-900'}`}>{match.homeScore ?? '—'}</span>
                <span className="text-sm font-light text-gray-300 mx-0.5">:</span>
                <span className={`text-2xl font-black tabular-nums w-7 text-left ${isLive ? 'text-red-500' : 'text-gray-900'}`}>{match.awayScore ?? '—'}</span>
              </>
            ) : (
              <span className="text-sm font-bold text-[#0f1830] bg-[#0f1830]/10 px-2.5 py-1 rounded-lg">{match.time || 'VS'}</span>
            )}
          </div>

          {/* Away */}
          <div className="flex items-center gap-3 flex-1 min-w-0 justify-end">
            <span className="text-[13px] font-bold text-gray-800 truncate text-right">{away?.name || 'TBD'}</span>
            <div className="w-12 h-12 rounded-full bg-gray-50 border-2 border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
              {away?.logo ? (
                <img src={away.logo} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-300 text-base font-bold">{away?.name?.charAt(0) || '?'}</span>
              )}
            </div>
          </div>
        </div>

      </div>
    );
  };

  // ============ MATCH GRID ============
  const kupaRoundNames: Record<number, string> = { 1: 'Raundi 1', 2: 'Cerekfinalet', 3: 'Gjysmefinalet', 4: 'Finalja' };
  const MatchGrid: React.FC<{ matchList: Match[]; title: string; week?: number; isKupa?: boolean }> = ({ matchList, title, week, isKupa }) => {
    const weekLabel = isKupa && week ? (kupaRoundNames[week] || `Raundi ${week}`) : !isKupa && week ? `Java ${week}` : ''; // was: isKupa && week ? (kupaRoundNames[week] || `Raundi ${week}`) : week ? `Java ${week}` : '';
    if (matchList.length === 0) {
      return (
        <div className="mb-6">
          <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="w-1 h-5 bg-[#0f1830] rounded-full" />
            {title}
            {weekLabel && <span className="text-[10px] font-bold text-[#0f1830] bg-[#0f1830]/10 px-2.5 py-0.5 rounded-full border border-[#0f1830]/15">{weekLabel}</span>}
          </h3>
          <p className="text-gray-400 text-xs text-center py-6 bg-white rounded-xl border border-gray-100">
            Nuk ka ndeshje per kete kategori.
          </p>
        </div>
      );
    }
    return (
      <div className="mb-6">
        <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span className="w-1 h-5 bg-[#0f1830] rounded-full" />
          {title}
          {weekLabel && <span className="text-[10px] font-bold text-[#0f1830] bg-[#0f1830]/10 px-2.5 py-0.5 rounded-full border border-[#0f1830]/15">{weekLabel}</span>}
        <span className="ml-auto text-[10px] font-semibold text-gray-400 bg-gray-100 px-2.5 py-0.5 rounded-full">{matchList.length}</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {matchList.map(m => <MatchRow key={m.id} match={m} />)}
        </div>
      </div>
    );
  };

  // ============ RENDER ============
  return (
    <section className="py-10 px-3 sm:px-4 md:px-6 lg:px-8 bg-[#F1F5F9]">
      <div className="w-full">
                {/* Tab buttons — segmented pill control */}
        <div className="flex items-center justify-center mb-8">
          <div className="inline-flex items-center gap-1 bg-white rounded-full p-1 border border-gray-200 shadow-sm">
            {tabs.map(t => {
              const isActive = activeTab === t.key;
              const isLiveTab = t.key === 'live';
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`relative flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? t.key === 'live'
                        ? 'bg-red-500 text-white shadow-md shadow-red-200'
                        : 'bg-[#0f1830] text-white shadow-md'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {isLiveTab && liveCount > 0 && (
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-black ${
                      isActive ? 'bg-white text-red-500' : 'bg-red-500 text-white'
                    }`}>
                      {liveCount}
                    </span>
                  )}
                  {t.label}
                  {isLiveTab && liveCount > 0 && isActive && (
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {activeTab !== 'upcoming' && protocolError && <p role="alert" className="mb-4 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 p-3 text-sm">Përditësimi live nuk është i disponueshëm; të dhënat mund të jenë të vjetra.</p>}
        {activeTab !== 'upcoming' && <ProtocolLiveMatches matches={displayedProtocols} stale={protocolError} />}
        {!unavailableEmpty && !(activeTab !== 'upcoming' && displayedProtocols.length && !superligaMatches.length) && <MatchGrid matchList={superligaMatches} title="Superliga e Kosoves" week={superligaData.week} />}
        {!unavailableEmpty && !(activeTab !== 'upcoming' && displayedProtocols.length && !ligaPareMatches.length) && <MatchGrid matchList={ligaPareMatches} title="Liga e Pare" week={ligaPareData.week} />}
        {!unavailableEmpty && !(activeTab !== 'upcoming' && displayedProtocols.length && !kupaMatches.length) && <MatchGrid matchList={kupaMatches} title="Kupa e Kosoves" week={kupaData.week} isKupa />}

        {!unavailableEmpty && !hasAny && !(activeTab !== 'upcoming' && displayedProtocols.length > 0) && (
          <div className="text-center py-10">
            <p className="text-gray-400 text-sm">Nuk ka ndeshje per kete kategori.</p>
          </div>
        )}
      </div>

      <MatchDetailModal match={selectedMatch ? matches.find(m=>m.id===selectedMatch.id)||selectedMatch : null} onClose={() => setSelectedMatch(null)} />
    </section>
  );
};

export default LandingMatches;
