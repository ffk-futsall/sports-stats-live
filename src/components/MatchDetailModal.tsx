import React, { useState } from 'react';
import { Match } from '@/types';
import { useData } from '@/context/DataContext';

function formatDate(iso?: string): string {
  if (!iso) return "";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  return `${Number(p[2])}/${Number(p[1])}/${p[0]}`;
}

interface Props {
  match: Match | null;
  onClose: () => void;
}

const MatchDetailModal: React.FC<Props> = ({ match, onClose }) => {
  const { getTeamById, getGoalsByMatch, players, competitions } = useData();
  const [activeSection, setActiveSection] = useState<'stats' | 'officials'>('stats');

  if (!match) return null;

  const homeTeam = getTeamById(match.homeTeamId);
  const awayTeam = getTeamById(match.awayTeamId);
  const goals = getGoalsByMatch(match.id);
  const comp = competitions.find(c => c.id === match.competitionId);

  const getPlayerName = (playerId: string) => {
    const p = players.find(pl => pl.id === playerId);
    return p ? `${p.firstName} ${p.lastName}` : 'I panjohur';
  };

  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';
  const isPlanned = match.status === 'planned';

  const hasStats = match.possession_home != null || match.shots_home != null || match.fouls_home != null;
  const hasOfficials = match.referee1 || match.referee2 || match.referee3 || match.delegate;

  const sections = [
    
    ...(hasStats ? [{ key: 'stats' as const, label: 'Statistikat', count: 0 }] : []),
    ...(hasOfficials ? [{ key: 'officials' as const, label: 'Zyrtaret', count: 0 }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" />
      <div
        className="relative w-full sm:max-w-lg max-h-[95vh] overflow-hidden sm:rounded-2xl rounded-t-2xl border-2 border-[#0f1830]/40 shadow-[0_0_60px_-10px_rgba(30,111,242,0.3)]"
        style={Object.assign({}, { background: 'linear-gradient(145deg, #F0F2F5 0%, #E8EBF0 50%, #F0F2F5 100%)' })}
        onClick={function(e) { e.stopPropagation(); }}
      >
        {/* === HEADER === */}
        <div className="relative overflow-hidden">
          {/* Subtle blue glow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[2px] bg-gradient-to-r from-transparent via-[#0f1830] to-transparent" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[40px] bg-[#0f1830]/5 blur-2xl" />

          {/* Close & Drag */}
          <div className="relative z-20 flex items-center justify-between px-5 pt-4">
            <div className="w-9" />
            <div className="w-10 h-1 rounded-full bg-gray-300" />
            <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-300 transition-all text-gray-500 hover:text-red-500 text-lg font-bold shadow-md"></button>
          </div>

          <div className="relative z-10 px-6 pt-3 pb-6">
            {/* Competition Badge */}
            {comp && (
              <div className="flex justify-center mb-5">
                <span className="px-4 py-1.5 bg-white/80 backdrop-blur-sm rounded-lg text-[10px] font-bold text-[#0f1830] uppercase tracking-[0.15em] border border-[#0f1830]/15 shadow-sm">
                  {comp.name} ⬢ Java {match.week}
                </span>
              </div>
            )}

            {/* Teams & Score */}
            <div className="flex items-center justify-between">
              {/* Home Team */}
              <div className="flex flex-col items-center flex-1 gap-2.5">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-br from-[#0f1830]/20 to-[#0f1830]/5 rounded-2xl blur-sm" />
                  <div className="relative w-[72px] h-[72px] rounded-2xl bg-white border-2 border-[#0f1830]/15 flex items-center justify-center overflow-hidden shadow-lg">
                    {homeTeam?.logo ? (
                      <img src={homeTeam.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-300 text-2xl font-black">{homeTeam?.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                </div>
                <span className="text-[13px] font-bold text-gray-700 text-center leading-tight max-w-[110px]">{homeTeam?.name || 'TBD'}</span>
              </div>

              {/* Score */}
              <div className="flex flex-col items-center px-3">
                {isLive && (
                  <div className="flex items-center gap-1.5 mb-3 px-3.5 py-1 bg-red-500/10 rounded-lg border border-red-200">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.15em]">Live</span>
                  </div>
                )}
                {isFinished && (
                  <div className="flex items-center gap-1.5 mb-3 px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-200">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{match.protocolResult==='finished'?'Procesverbal · përkohshëm':'Perfunduar'}</span>
                  </div>
                )}
                {isPlanned && (
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">E Ardhshme</span>
                )}
                <div className="relative">
                  <div className="absolute -inset-3 bg-white/60 rounded-2xl blur-sm" />
                  <div className="relative flex items-center bg-white rounded-2xl px-5 py-3 border border-[#0f1830]/15 shadow-lg">
                    <span className="text-[44px] font-black text-gray-800 tabular-nums leading-none">{isPlanned ? '-' : (match.homeScore ?? '—')}</span>
                    <div className="flex flex-col items-center gap-1 mx-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0f1830]/30" />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#0f1830]/30" />
                    </div>
                    <span className="text-[44px] font-black text-gray-800 tabular-nums leading-none">{isPlanned ? '-' : (match.awayScore ?? '—')}</span>
                  </div>
                </div>
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center flex-1 gap-2.5">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-br from-[#0f1830]/20 to-[#0f1830]/5 rounded-2xl blur-sm" />
                  <div className="relative w-[72px] h-[72px] rounded-2xl bg-white border-2 border-[#0f1830]/15 flex items-center justify-center overflow-hidden shadow-lg">
                    {awayTeam?.logo ? (
                      <img src={awayTeam.logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-300 text-2xl font-black">{awayTeam?.name?.charAt(0) || '?'}</span>
                    )}
                  </div>
                </div>
                <span className="text-[13px] font-bold text-gray-700 text-center leading-tight max-w-[110px]">{awayTeam?.name || 'TBD'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* === INFO STRIP === */}
        <div className="flex items-center justify-center gap-4 px-6 py-2.5 bg-white/60 border-y border-[#0f1830]/10">
          {match.date && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
              <span className="w-5 h-5 rounded-md bg-[#0f1830]/10 flex items-center justify-center text-[#0f1830] text-[8px] font-black border border-[#0f1830]/10">D</span>
              {formatDate(match.date)}
            </span>
          )}
          {match.time && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
              <span className="w-5 h-5 rounded-md bg-[#0f1830]/10 flex items-center justify-center text-[#0f1830] text-[8px] font-black border border-[#0f1830]/10">T</span>
              {match.time}
            </span>
          )}
          {match.venue && (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500">
              <span className="w-5 h-5 rounded-md bg-[#0f1830]/10 flex items-center justify-center text-[#0f1830] text-[8px] font-black border border-[#0f1830]/10">S</span>
              {match.venue}
            </span>
          )}
        </div>

        {/* === TABS === */}
        {sections.length > 0 && (
          <div className="flex mx-5 mt-4 bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
            {sections.map(s => (
              <button
                key={s.key}
                onClick={() => setActiveSection(s.key)}
                className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeSection === s.key
                    ? 'bg-[#0f1830] text-white shadow-md shadow-[#0f1830]/25'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {s.label}
                {s.count > 0 && (
                  <span className={`ml-1 text-[9px] ${activeSection === s.key ? 'text-white/70' : 'text-gray-300'}`}>({s.count})</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* === CONTENT === */}
        <div className="overflow-y-auto max-h-[calc(95vh-380px)]">
          <div className="px-5 py-4">

            {/* Goals */}
            {activeSection === 'goals' && (
              goals.length > 0 ? (
                <div className="space-y-2">
                  {goals
                    .sort((a, b) => (a.minute || 0) - (b.minute || 0))
                    .map((g) => {
                      const isHome = g.teamId === match.homeTeamId;
                      const team = isHome ? homeTeam : awayTeam;
                      return (
                        <div key={g.id} className={`flex items-center gap-3 p-3 bg-white rounded-xl border transition-all hover:shadow-sm ${
                          g.isOwnGoal ? 'border-red-200' : 'border-gray-150 hover:border-[#0f1830]/20'
                        } ${isHome ? '' : 'flex-row-reverse'}`}>
                          <div className={`flex items-center gap-3 flex-1 min-w-0 ${isHome ? '' : 'flex-row-reverse'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              g.isOwnGoal
                                ? 'bg-red-50 border border-red-200'
                                : 'bg-gradient-to-br from-[#0f1830]/10 to-[#0f1830]/5 border border-[#0f1830]/15'
                            }`}>
                              <span className={`text-xs font-black ${g.isOwnGoal ? 'text-red-500' : 'text-[#0f1830]'}`}>{g.minute}'</span>
                            </div>
                            <div className={`flex-1 min-w-0 ${isHome ? '' : 'text-right'}`}>
                              <p className="text-sm font-bold text-gray-800 truncate">{getPlayerName(g.playerId)}</p>
                              <p className={`text-[10px] font-medium ${g.isOwnGoal ? 'text-red-400' : 'text-gray-400'}`}>
                                {g.isOwnGoal ? 'Autogol' : 'Gol'}
                                {team?.name ? ` ⬢ ${team.name}` : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <span className="text-2xl text-gray-300 font-black">0</span>
                  </div>
                  <p className="text-sm text-gray-400 font-medium">{isPlanned ? 'Ndeshja nuk ka filluar ende' : 'Nuk ka gola ne kete ndeshje'}</p>
                </div>
              )
            )}

            {/* Stats */}
            {activeSection === 'stats' && hasStats && (
              <div className="space-y-3">
                {match.possession_home != null && (
                  <StatBarPremium label="Posedimi" home={match.possession_home} away={match.possession_away ?? 0} suffix="%" />
                )}
                {match.shots_home != null && (
                  <StatBarPremium label="Goditjet" home={match.shots_home} away={match.shots_away ?? 0} />
                )}
                {match.fouls_home != null && (
                  <StatBarPremium label="Faull-et" home={match.fouls_home} away={match.fouls_away ?? 0} />
                )}
              </div>
            )}

            {/* Officials */}
            {activeSection === 'officials' && hasOfficials && (
              <div className="space-y-2">
                {[
                  { key: 'referee1', label: 'Gjyqtari 1', abbr: 'G1', value: match.referee1 },
                  { key: 'referee2', label: 'Gjyqtari 2', abbr: 'G2', value: match.referee2 },
                  { key: 'referee3', label: 'Gjyqtari 3', abbr: 'G3', value: match.referee3 },
                  { key: 'delegate', label: 'Delegati', abbr: 'D', value: match.delegate },
                ].filter(o => o.value).map(o => (
                  <div key={o.key} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-gray-150 hover:border-[#0f1830]/20 transition-all hover:shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0f1830]/10 to-[#0f1830]/5 border border-[#0f1830]/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#0f1830] text-[11px] font-black">{o.abbr}</span>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{o.label}</p>
                      <p className="text-sm font-bold text-gray-800">{o.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom blue glow line */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[#0f1830]/40 to-transparent" />
      </div>
    </div>
  );
};

const StatBarPremium: React.FC<{ label: string; home: number; away: number; suffix?: string }> = ({ label, home, away, suffix }) => {
  const total = home + away || 1;
  const homePercent = Math.round((home / total) * 100);
  const awayPercent = 100 - homePercent;
  const homeWins = home > away;
  const awayWins = away > home;

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-150 hover:border-[#0f1830]/15 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-black tabular-nums ${homeWins ? 'text-[#0f1830]' : 'text-gray-600'}`}>{home}{suffix || ''}</span>
          {homeWins && <span className="w-1.5 h-1.5 rounded-full bg-[#0f1830]" />}
        </div>
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">{label}</span>
        <div className="flex items-center gap-2">
          {awayWins && <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />}
          <span className={`text-lg font-black tabular-nums ${awayWins ? 'text-[#F97316]' : 'text-gray-600'}`}>{away}{suffix || ''}</span>
        </div>
      </div>
      <div className="flex gap-1.5 h-2.5 rounded-full overflow-hidden bg-gray-100">
        <div
          className={`rounded-full transition-all duration-700 ${homeWins ? 'bg-gradient-to-r from-[#0f1830] to-[#3B82F6]' : 'bg-[#0f1830]/40'}`}
          style={Object.assign({}, { width: `${homePercent}%` })}
        />
        <div
          className={`rounded-full transition-all duration-700 ${awayWins ? 'bg-gradient-to-r from-[#F97316] to-[#FB923C]' : 'bg-[#F97316]/40'}`}
          style={Object.assign({}, { width: `${awayPercent}%` })}
        />
      </div>
    </div>
  );
};

export default MatchDetailModal;
