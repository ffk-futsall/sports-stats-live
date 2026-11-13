import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useData } from '@/context/DataContext';
import { Match, Player } from '@/types';
import { broadcastNotification, dbLiveStreams } from '@/lib/supabase-db';
import { Trash2 } from 'lucide-react';
const AdminLiveControl: React.FC = () => {
  const { 
    matches, teams, players, competitions, goals,
    getActiveSeason, updateMatch, addGoal, deleteGoal, getGoalsByMatch 
  } = useData();
  const activeSeason = getActiveSeason();

  // Live Streams
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [streamTitle, setStreamTitle] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [editingStreamId, setEditingStreamId] = useState('');
  const [streamDuration, setStreamDuration] = useState('3');

  useEffect(() => {
    dbLiveStreams.getAll().then(setLiveStreams).catch(() => {});
  }, []);

  const loadStreams = () => dbLiveStreams.getAll().then(setLiveStreams).catch(() => {});

  const handleSaveStream = async () => {
    if (!streamTitle.trim() || !streamUrl.trim()) { alert('Ploteso titullin dhe linkun'); return; }
    try {
      const hours = parseInt(streamDuration) || 3;
      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
      await dbLiveStreams.upsert({
        id: editingStreamId || crypto.randomUUID(),
        matchTitle: streamTitle.trim(),
        streamUrl: streamUrl.trim(),
        isLive: true,
        expiresAt,
      });
      setStreamTitle(''); setStreamUrl(''); setEditingStreamId(''); setStreamDuration('3');
      loadStreams();
    } catch (err) {
      alert('Gabim: ' + (err as any)?.message);
    }
  };

  const handleToggleStream = async (s: any) => {
    try {
      await dbLiveStreams.upsert({ ...s, isLive: !s.isLive });
      loadStreams();
    } catch {}
  };

  const handleDeleteStream = async (id: string) => {
    if (!confirm('Fshi transmetimin?')) return;
    await dbLiveStreams.remove(id);
    loadStreams();
  };

  // Get all live matches + planned matches that can be started
  const liveMatches = matches.filter(m => m.status === 'live' && (activeSeason ? m.seasonId === activeSeason.id : true));
  const plannedMatches = matches.filter(m => m.status === 'planned' && (activeSeason ? m.seasonId === activeSeason.id : true));

  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [scorerTeamSide, setScorerTeamSide] = useState<'home' | 'away' | null>(null);
  const [scorerPlayerId, setScorerPlayerId] = useState<string>('');
  const [scorerMinute, setScorerMinute] = useState<string>('');
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [showStartMatch, setShowStartMatch] = useState(false);

  // Auto-select first live match
  useEffect(() => {
    if (!selectedMatchId && liveMatches.length > 0) {
      setSelectedMatchId(liveMatches[0].id);
    }
  }, [liveMatches, selectedMatchId]);

  const selectedMatch = selectedMatchId ? matches.find(m => m.id === selectedMatchId) : null;
  const homeTeam = selectedMatch ? teams.find(t => t.id === selectedMatch.homeTeamId) : null;
  const awayTeam = selectedMatch ? teams.find(t => t.id === selectedMatch.awayTeamId) : null;
  const matchGoals = selectedMatch ? getGoalsByMatch(selectedMatch.id) : [];
  const comp = selectedMatch ? competitions.find(c => c.id === selectedMatch.competitionId) : null;

  const homePlayers = selectedMatch ? players.filter(p => p.teamId === selectedMatch.homeTeamId) : [];
  const awayPlayers = selectedMatch ? players.filter(p => p.teamId === selectedMatch.awayTeamId) : [];

  // ============ MATCH TIMER ============
  const [matchTimer, setMatchTimer] = useState<number>(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load timer from localStorage
  useEffect(() => {
    if (selectedMatchId) {
      const saved = localStorage.getItem(`match_timer_${selectedMatchId}`);
      const savedStart = localStorage.getItem(`match_timer_start_${selectedMatchId}`);
      if (saved && savedStart) {
        const elapsed = Math.floor((Date.now() - Number(savedStart)) / 1000);
        setMatchTimer(Number(saved) + elapsed);
        setTimerRunning(true);
      } else if (saved) {
        setMatchTimer(Number(saved));
        setTimerRunning(false);
      } else {
        setMatchTimer(0);
        setTimerRunning(false);
      }
    }
  }, [selectedMatchId]);

  useEffect(() => {
    if (timerRunning && selectedMatchId) {
      timerRef.current = setInterval(() => {
        setMatchTimer(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, selectedMatchId]);

  const toggleTimer = () => {
    if (!selectedMatchId) return null;
    if (timerRunning) {
      localStorage.setItem(`match_timer_${selectedMatchId}`, String(matchTimer));
      localStorage.removeItem(`match_timer_start_${selectedMatchId}`);
      setTimerRunning(false);
    } else {
      localStorage.setItem(`match_timer_${selectedMatchId}`, String(matchTimer));
      localStorage.setItem(`match_timer_start_${selectedMatchId}`, String(Date.now()));
      setTimerRunning(true);
    }
  };

  const resetTimer = () => {
    if (!selectedMatchId) return null;
    setMatchTimer(0);
    setTimerRunning(false);
    localStorage.removeItem(`match_timer_${selectedMatchId}`);
    localStorage.removeItem(`match_timer_start_${selectedMatchId}`);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ============ QUICK GOAL ============
  const handleQuickGoal = (side: 'home' | 'away') => {
    if (!selectedMatch) return null;
    const newHomeScore = side === 'home' ? (selectedMatch.homeScore ?? 0) + 1 : (selectedMatch.homeScore ?? 0);
    const newAwayScore = side === 'away' ? (selectedMatch.awayScore ?? 0) + 1 : (selectedMatch.awayScore ?? 0);
    
    updateMatch({
      ...selectedMatch,
      homeScore: newHomeScore,
      awayScore: newAwayScore,
    });

    // Open scorer selection
    setScorerTeamSide(side);
    setScorerMinute(String(Math.floor(matchTimer / 60) || 1));

    // Broadcast notification
    broadcastNotification('goal', {
      matchId: selectedMatch.id,
      homeTeam: homeTeam?.name,
      awayTeam: awayTeam?.name,
      homeScore: newHomeScore,
      awayScore: newAwayScore,
      side,
      timestamp: Date.now(),
    });
  };

  const handleUndoGoal = (side: 'home' | 'away') => {
    if (!selectedMatch) return null;
    const currentScore = side === 'home' ? (selectedMatch.homeScore ?? 0) : (selectedMatch.awayScore ?? 0);
    if (currentScore <= 0) return null;
    
    updateMatch({
      ...selectedMatch,
      homeScore: side === 'home' ? currentScore - 1 : (selectedMatch.homeScore ?? 0),
      awayScore: side === 'away' ? currentScore - 1 : (selectedMatch.awayScore ?? 0),
    });
  };

  const handleAssignScorer = () => {
    if (!selectedMatch || !scorerPlayerId || !scorerMinute || !scorerTeamSide) return null;
    const teamId = scorerTeamSide === 'home' ? selectedMatch.homeTeamId : selectedMatch.awayTeamId;
    addGoal({
      matchId: selectedMatch.id,
      playerId: scorerPlayerId,
      teamId,
      minute: Number(scorerMinute),
      isOwnGoal,
    });

    const player = players.find(p => p.id === scorerPlayerId);
    broadcastNotification('goal_scorer', {
      matchId: selectedMatch.id,
      scorerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
      minute: Number(scorerMinute),
      homeTeam: homeTeam?.name,
      awayTeam: awayTeam?.name,
      homeScore: selectedMatch.homeScore ?? 0,
      awayScore: selectedMatch.awayScore ?? 0,
      timestamp: Date.now(),
    });

    setScorerTeamSide(null);
    setScorerPlayerId('');
    setScorerMinute('');
    setIsOwnGoal(false);
  };

  // ============ START / END MATCH ============
  const handleStartMatch = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return null;
    updateMatch({
      ...match,
      status: 'live',
      homeScore: match.homeScore ?? 0,
      awayScore: match.awayScore ?? 0,
    });
    setSelectedMatchId(matchId);
    setShowStartMatch(false);

    const home = teams.find(t => t.id === match.homeTeamId);
    const away = teams.find(t => t.id === match.awayTeamId);
    broadcastNotification('match_start', {
      matchId,
      homeTeam: home?.name,
      awayTeam: away?.name,
      timestamp: Date.now(),
    });
  };

  const handleEndMatch = () => {
    if (!selectedMatch) return null;
    if (!confirm(`Përfundo ndeshjen ${homeTeam?.name} ${selectedMatch.homeScore ?? 0} - ${selectedMatch.awayScore ?? 0} ${awayTeam?.name}?`)) return null;
    
    updateMatch({
      ...selectedMatch,
      status: 'finished',
    });

    // Clean up timer
    localStorage.removeItem(`match_timer_${selectedMatch.id}`);
    localStorage.removeItem(`match_timer_start_${selectedMatch.id}`);
    setTimerRunning(false);
    setMatchTimer(0);

    broadcastNotification('match_end', {
      matchId: selectedMatch.id,
      homeTeam: homeTeam?.name,
      awayTeam: awayTeam?.name,
      homeScore: selectedMatch.homeScore ?? 0,
      awayScore: selectedMatch.awayScore ?? 0,
      timestamp: Date.now(),
    });

    setSelectedMatchId(null);
  };

  const handleSetHalfTime = () => {
    if (!selectedMatch) return null;
    broadcastNotification('half_time', {
      matchId: selectedMatch.id,
      homeTeam: homeTeam?.name,
      awayTeam: awayTeam?.name,
      homeScore: selectedMatch.homeScore ?? 0,
      awayScore: selectedMatch.awayScore ?? 0,
      timestamp: Date.now(),
    });
  };

  // ============ NO LIVE MATCHES VIEW ============
  if (liveMatches.length === 0 && !showStartMatch) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          
        </div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Nuk ka ndeshje LIVE</h3>
        <p className="text-sm text-gray-500 mb-6">Fillo një ndeshje të planifikuar për të përdorur kontrollin LIVE.</p>
        {plannedMatches.length > 0 ? (
          <button
            onClick={() => setShowStartMatch(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
          >
            
            Fillo Ndeshje ({plannedMatches.length} të planifikuara)
          </button>
        ) : (
          <p className="text-sm text-gray-400">Nuk ka ndeshje të planifikuara. Shto ndeshje nga tab-i "Ndeshjet".</p>
        )}
      {/* ====== LIVE STREAMS (shown always) ====== */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm mt-8 text-left">
        <h3 className="font-black text-gray-900 mb-4 text-lg flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
          Transmetimet Live (YouTube / Facebook)
        </h3>
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Titulli i Ndeshjes</label>
              <input value={streamTitle} onChange={e => setStreamTitle(e.target.value)} placeholder="Prishtina vs Drenica" className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Linku (YouTube / Facebook)</label>
              <input value={streamUrl} onChange={e => setStreamUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveStream} className="px-5 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">{editingStreamId ? 'Ruaj' : 'Shto Transmetim'}</button>
            {editingStreamId && <button onClick={() => { setEditingStreamId(''); setStreamTitle(''); setStreamUrl(''); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">Anulo</button>}
          </div>
        </div>
        {liveStreams.length > 0 && (
          <div className="space-y-2 border-t border-gray-100 pt-4">
            {liveStreams.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-[#F8FAFC] rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={"w-2.5 h-2.5 rounded-full " + (s.isLive ? "bg-red-500 animate-pulse" : "bg-gray-300")}></div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{s.matchTitle}</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[300px]">{s.streamUrl}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleStream(s)} className={"text-xs font-bold px-3 py-1 rounded-full " + (s.isLive ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600")}>{s.isLive ? 'Ndale' : 'Aktivizo'}</button>
                  <button onClick={() => { setEditingStreamId(s.id); setStreamTitle(s.matchTitle || ''); setStreamUrl(s.streamUrl || ''); }} className="text-xs text-[#0f1830] hover:underline">Edito</button>
                  <button onClick={() => handleDeleteStream(s.id)} className="text-xs text-red-400 hover:text-red-600">Fshi</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    );
  }

  // ============ START MATCH SELECTION ============
  if (showStartMatch) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Fillo Ndeshje</h2>
          <button aria-label="Mbyll" onClick={() => setShowStartMatch(false)} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plannedMatches.map(m => {
            const home = teams.find(t => t.id === m.homeTeamId);
            const away = teams.find(t => t.id === m.awayTeamId);
            const c = competitions.find(c => c.id === m.competitionId);
            return (
              <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-md transition-all">
                <div className="text-xs text-gray-400 mb-2">{c?.name} - Java {m.week} {m.date && `| ${m.date}`}</div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {home?.logo ? <img src={home.logo} alt="" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-gray-200" />}
                    <span className="font-semibold text-gray-800">{home?.name || '?'}</span>
                  </div>
                  <span className="text-gray-400 text-sm font-medium">vs</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{away?.name || '?'}</span>
                    {away?.logo ? <img src={away.logo} alt="" className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-gray-200" />}
                  </div>
                </div>
                <button
                  onClick={() => handleStartMatch(m.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  
                  Fillo LIVE
                </button>
              </div>
            );
          })}
        </div>
        {plannedMatches.length === 0 && (
          <p className="text-center text-gray-500 py-8">Nuk ka ndeshje të planifikuara.</p>
        )}
      </div>
    );
  }

  // ============ MAIN LIVE CONTROL VIEW ============
  return (
    <div className="space-y-5">
      {/* Live Match Tabs */}
      {liveMatches.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {liveMatches.map(m => {
            const home = teams.find(t => t.id === m.homeTeamId);
            const away = teams.find(t => t.id === m.awayTeamId);
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMatchId(m.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  selectedMatchId === m.id
                    ? 'bg-[#0f1830] text-white shadow-lg shadow-[#0f1830]/25'
                    : 'bg-white text-gray-600 border-2 border-gray-100 hover:border-[#0f1830]/30'
                }`}
              >
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                {home?.name} vs {away?.name}
              </button>
            );
          })}
        </div>
      )}

      {plannedMatches.length > 0 && (
        <button onClick={() => setShowStartMatch(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-[#0f1830] bg-[#0f1830]/5 border border-[#0f1830]/20 rounded-xl font-bold hover:bg-[#0f1830]/10 transition-colors">
          + Fillo ndeshje tjetër
        </button>
      )}

      {selectedMatch && (
        <div className="space-y-5">

          {/* ====== SCOREBOARD CARD ====== */}
          <div className="bg-white rounded-2xl border-2 border-[#0f1830]/20 shadow-xl shadow-[#0f1830]/10 overflow-hidden">
            {/* Top bar */}
            <div className="bg-gradient-to-r from-[#0f1830] to-[#3B82F6] px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
                <span className="text-white text-xs font-black uppercase tracking-[0.15em]">Live Control</span>
              </div>
              <span className="text-white/60 text-xs font-medium">{comp?.name} {selectedMatch.week ? '- Java ' + selectedMatch.week : ''}</span>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center py-4 bg-[#F8FAFC] border-b border-gray-100">
              <div className="inline-flex items-center gap-4 bg-white rounded-2xl px-8 py-3 shadow-sm border border-gray-100">
                <button onClick={toggleTimer} className="w-10 h-10 rounded-xl bg-[#0f1830]/10 hover:bg-[#0f1830]/20 flex items-center justify-center transition-colors text-[#0f1830] font-bold text-lg">
                  {timerRunning ? '||' : '\u25B6'}
                </button>
                <span className="text-4xl font-mono font-black text-gray-900 tracking-wider tabular-nums">{formatTimer(matchTimer)}</span>
                <button onClick={resetTimer} className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-500 font-bold text-sm">
                  RST
                </button>
              </div>
            </div>

            {/* Score with +/- buttons */}
            <div className="flex items-center justify-between px-6 py-8">
              {/* Home */}
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  {homeTeam?.logo && <img src={homeTeam.logo} alt="" className="w-14 h-14 rounded-xl border-2 border-gray-100 p-1 bg-white shadow-sm" />}
                  <span className="font-black text-gray-900 text-lg">{homeTeam?.name}</span>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => handleUndoGoal('home')} className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-all text-xl font-bold border border-red-100">-</button>
                  <span className="text-6xl font-black text-[#0f1830] tabular-nums">{selectedMatch.homeScore ?? 0}</span>
                  <button onClick={() => handleQuickGoal('home')} className="w-14 h-14 rounded-xl bg-[#0f1830] hover:bg-[#1858C8] text-white flex items-center justify-center transition-all shadow-lg shadow-[#0f1830]/25 hover:scale-105 active:scale-95 text-2xl font-bold">+</button>
                </div>
              </div>

              <div className="flex flex-col items-center px-4">
                <div className="w-1.5 h-1.5 bg-[#0f1830] rounded-full"></div>
                <div className="w-0.5 h-6 bg-gray-200"></div>
                <div className="w-1.5 h-1.5 bg-[#0f1830] rounded-full"></div>
              </div>

              {/* Away */}
              <div className="flex-1 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="font-black text-gray-900 text-lg">{awayTeam?.name}</span>
                  {awayTeam?.logo && <img src={awayTeam.logo} alt="" className="w-14 h-14 rounded-xl border-2 border-gray-100 p-1 bg-white shadow-sm" />}
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => handleQuickGoal('away')} className="w-14 h-14 rounded-xl bg-[#0f1830] hover:bg-[#1858C8] text-white flex items-center justify-center transition-all shadow-lg shadow-[#0f1830]/25 hover:scale-105 active:scale-95 text-2xl font-bold">+</button>
                  <span className="text-6xl font-black text-[#0f1830] tabular-nums">{selectedMatch.awayScore ?? 0}</span>
                  <button onClick={() => handleUndoGoal('away')} className="w-10 h-10 rounded-xl bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-all text-xl font-bold border border-red-100">-</button>
                </div>
              </div>
            </div>
          </div>

          {/* ====== SCORER SELECTION ====== */}
          {scorerTeamSide && (
            <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-lg shadow-amber-50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600 text-sm">\u26BD</span>
                  Golashenuesin ({scorerTeamSide === 'home' ? homeTeam?.name : awayTeam?.name})
                </h4>
                <button onClick={() => { setScorerTeamSide(null); setScorerPlayerId(''); }} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors">x</button>
              </div>

              {/* Quick player pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {(scorerTeamSide === 'home' ? homePlayers : awayPlayers).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setScorerPlayerId(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      scorerPlayerId === p.id
                        ? 'bg-[#0f1830] text-white shadow-md shadow-[#0f1830]/25'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:border-[#0f1830]/40'
                    }`}
                  >
                    {p.firstName.charAt(0)}. {p.lastName}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-3 items-end">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">Lojtari</label>
                  <select value={scorerPlayerId} onChange={e => setScorerPlayerId(e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#0f1830] focus:border-transparent">
                    <option value="">Zgjedh...</option>
                    {(scorerTeamSide === 'home' ? homePlayers : awayPlayers).map(p => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName} {p.position ? `(${p.position})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Minuta</label>
                  <input type="number" min="1" value={scorerMinute} onChange={e => setScorerMinute(e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#0f1830]" placeholder={String(Math.floor(matchTimer / 60) || 1)} />
                </div>
                <div className="flex gap-2 items-end">
                  <label className="flex items-center gap-1.5 cursor-pointer bg-gray-50 px-2 py-2.5 rounded-xl border border-gray-200">
                    <input type="checkbox" checked={isOwnGoal} onChange={e => setIsOwnGoal(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-xs font-bold text-gray-600">AG</span>
                  </label>
                  <button onClick={handleAssignScorer} disabled={!scorerPlayerId || !scorerMinute} className="px-5 py-2.5 bg-[#0f1830] text-white rounded-xl text-sm font-bold hover:bg-[#1858C8] disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-[#0f1830]/25 transition-all">Ruaj</button>
                </div>
              </div>
            </div>
          )}

          {/* ====== ACTION BUTTONS ====== */}
          <div className="flex flex-wrap gap-3">
            <button onClick={handleSetHalfTime} className="inline-flex items-center gap-2 px-5 py-3 bg-white text-amber-700 border-2 border-amber-200 rounded-xl text-sm font-bold hover:bg-amber-50 transition-colors shadow-sm">
              <span className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center text-[10px]">HT</span>
              Pushim (Half-Time)
            </button>
            <button onClick={handleEndMatch} className="inline-flex items-center gap-2 px-5 py-3 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 transition-colors shadow-lg shadow-red-200">
              <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[10px]">FT</span>
              Perfundo Ndeshjen
            </button>
          </div>

          {/* ====== GOALS TIMELINE ====== */}
          <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm">
            <h4 className="font-black text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#0f1830]/10 flex items-center justify-center text-[#0f1830] text-sm">\u26BD</span>
              Golat ({matchGoals.length})
            </h4>
            {matchGoals.length === 0 ? (
              <div className="text-center py-8 text-gray-300">
                <p className="text-sm">Nuk ka gola ende</p>
              </div>
            ) : (
              <div className="space-y-2">
                {matchGoals.sort((a, b) => a.minute - b.minute).map(g => {
                  const player = players.find(p => p.id === g.playerId);
                  const isHome = g.teamId === selectedMatch.homeTeamId;
                  return (
                    <div key={g.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${isHome ? 'bg-[#0f1830]/10/50 border border-[#0f1830]/15' : 'bg-gray-50 border border-gray-100'}`}>
                      <span className="text-sm font-black text-[#0f1830] w-10 text-center bg-white rounded-lg py-1 border border-gray-100 shadow-sm">{g.minute}'</span>
                      <span className="text-sm">\u26BD</span>
                      <span className="text-sm font-bold text-gray-800 flex-1">
                        {player ? `${player.firstName} ${player.lastName}` : 'I panjohur'}
                        {g.isOwnGoal && <span className="text-red-500 ml-1 text-xs font-black">(AG)</span>}
                      </span>
                      <span className="text-xs text-gray-400 font-medium">{isHome ? homeTeam?.name : awayTeam?.name}</span>
                      <button onClick={() => { if (confirm('Fshi golin?')) { deleteGoal(g.id); if (isHome) { updateMatch({ ...selectedMatch, homeScore: Math.max(0, (selectedMatch.homeScore ?? 0) - 1) }); } else { updateMatch({ ...selectedMatch, awayScore: Math.max(0, (selectedMatch.awayScore ?? 0) - 1) }); } } }} className="w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 flex items-center justify-center transition-colors text-xs"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ====== ROSTERS ====== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm">
              <h4 className="font-black text-gray-900 mb-3 flex items-center gap-2">
                {homeTeam?.logo && <img src={homeTeam.logo} alt="" className="w-7 h-7 rounded-lg" />}
                {homeTeam?.name} <span className="text-xs text-gray-400 font-medium">({homePlayers.length})</span>
              </h4>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {homePlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-2.5 text-sm text-gray-700 py-1.5 px-2 rounded-lg hover:bg-gray-50">
                    {p.photo ? <img src={p.photo} alt="" className="w-7 h-7 rounded-lg object-cover border border-gray-100" /> : <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-400">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</div>}
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    {p.position && <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">({p.position})</span>}
                  </div>
                ))}
                {homePlayers.length === 0 && <p className="text-xs text-gray-300 text-center py-3">Nuk ka lojtare</p>}
              </div>
            </div>
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm">
              <h4 className="font-black text-gray-900 mb-3 flex items-center gap-2">
                {awayTeam?.logo && <img src={awayTeam.logo} alt="" className="w-7 h-7 rounded-lg" />}
                {awayTeam?.name} <span className="text-xs text-gray-400 font-medium">({awayPlayers.length})</span>
              </h4>
              <div className="space-y-1 max-h-52 overflow-y-auto">
                {awayPlayers.map(p => (
                  <div key={p.id} className="flex items-center gap-2.5 text-sm text-gray-700 py-1.5 px-2 rounded-lg hover:bg-gray-50">
                    {p.photo ? <img src={p.photo} alt="" className="w-7 h-7 rounded-lg object-cover border border-gray-100" /> : <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-400">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</div>}
                    <span className="font-medium">{p.firstName} {p.lastName}</span>
                    {p.position && <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">({p.position})</span>}
                  </div>
                ))}
                {awayPlayers.length === 0 && <p className="text-xs text-gray-300 text-center py-3">Nuk ka lojtare</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====== LIVE STREAMS ====== */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-5 shadow-sm mt-8">
        <h3 className="font-black text-gray-900 mb-4 text-lg flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
          Transmetimet Live (YouTube / Facebook)
        </h3>
        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Titulli i Ndeshjes</label>
              <input value={streamTitle} onChange={e => setStreamTitle(e.target.value)} placeholder="Prishtina vs Drenica" className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Linku (YouTube / Facebook)</label>
              <input value={streamUrl} onChange={e => setStreamUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSaveStream} className="px-5 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600">{editingStreamId ? 'Ruaj' : 'Shto Transmetim'}</button>
            {editingStreamId && <button onClick={() => { setEditingStreamId(''); setStreamTitle(''); setStreamUrl(''); }} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold">Anulo</button>}
          </div>
        </div>

        {liveStreams.length > 0 && (
          <div className="space-y-2 border-t border-gray-100 pt-4">
            {liveStreams.map(s => (
              <div key={s.id} className="flex items-center justify-between bg-[#F8FAFC] rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={"w-2.5 h-2.5 rounded-full " + (s.isLive ? "bg-red-500 animate-pulse" : "bg-gray-300")}></div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{s.matchTitle}</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[300px]">{s.streamUrl}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => handleToggleStream(s)} className={"text-xs font-bold px-3 py-1 rounded-full " + (s.isLive ? "bg-red-50 text-red-500" : "bg-green-50 text-green-600")}>{s.isLive ? 'Ndale' : 'Aktivizo'}</button>
                  <button onClick={() => { setEditingStreamId(s.id); setStreamTitle(s.matchTitle || ''); setStreamUrl(s.streamUrl || ''); }} className="text-xs text-[#0f1830] hover:underline">Edito</button>
                  <button onClick={() => handleDeleteStream(s.id)} className="text-xs text-red-400 hover:text-red-600">Fshi</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLiveControl;
