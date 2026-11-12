import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Match } from '@/types';
import MatchCard from '@/components/MatchCard';
import MatchDetailModal from '@/components/MatchDetailModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const HeadToHeadPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { teams, displayMatches, getHeadToHead, getTeamById, getActiveSeason, protocolError } = useData();
  const activeSeason = getActiveSeason();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const activeTeams = activeSeason ? teams.filter(t => t.seasonId === activeSeason.id) : teams;

  const [teamAId, setTeamAId] = useState<string>(searchParams.get('teamA') || '');
  const [teamBId, setTeamBId] = useState<string>(searchParams.get('teamB') || '');

  const h2h = useMemo(() => {
    if (!teamAId || !teamBId) return null;
    return getHeadToHead(teamAId, teamBId);
  }, [teamAId, teamBId, getHeadToHead]);

  const liveMeetings=displayMatches.filter(m=>m.status==='live' && ((m.homeTeamId===teamAId&&m.awayTeamId===teamBId)||(m.homeTeamId===teamBId&&m.awayTeamId===teamAId)));
  const teamA = getTeamById(teamAId);
  const teamB = getTeamById(teamBId);

  const chartData = h2h ? [
    { name: 'Fitore', [teamA?.name || 'A']: h2h.teamAWins, [teamB?.name || 'B']: h2h.teamBWins },
    { name: 'Gola', [teamA?.name || 'A']: h2h.teamAGoals, [teamB?.name || 'B']: h2h.teamBGoals },
  ] : [];

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      <Header />
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Krahasimi Head-to-Head</h1>

        {/* Team Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skuadra A</label>
            <select
              value={teamAId}
              onChange={e => setTeamAId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-[#0f1830] focus:border-transparent"
            >
              <option value="">Zgjedh skuadrën</option>
              {activeTeams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Skuadra B</label>
            <select
              value={teamBId}
              onChange={e => setTeamBId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-[#0f1830] focus:border-transparent"
            >
              <option value="">Zgjedh skuadrën</option>
              {activeTeams.filter(t => t.id !== teamAId).map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        {h2h && teamA && teamB && (
          <>
            {/* VS Header */}
            <div className="bg-gradient-to-r from-[#0f1830] to-[#0f1830] rounded-2xl p-8 text-white mb-8 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-center flex-1">
                  <div className="w-20 h-20 rounded-full bg-white/10 overflow-hidden">
                    {teamA.logo ? <img src={teamA.logo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white/50">{teamA.name.charAt(0)}</div>}
                  </div>
                  <span className="font-bold mt-2">{teamA.name}</span>
                </div>
                <div className="text-center px-6">
                  <span className="text-3xl font-bold">{h2h.teamAWins} - {h2h.draws} - {h2h.teamBWins}</span>
                  <p className="text-xs text-[#0f1830]/25 mt-1">{h2h.matches.length} ndeshje të përfunduara</p>
                </div>
                <div className="flex flex-col items-center flex-1">
                  <div className="w-20 h-20 rounded-full bg-white/10 overflow-hidden">
                    {teamB.logo ? <img src={teamB.logo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-white/50">{teamB.name.charAt(0)}</div>}
                  </div>
                  <span className="font-bold mt-2">{teamB.name}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-[#0f1830]">{h2h.teamAGoals}</p>
                <p className="text-xs text-gray-500">Gola {teamA.name}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-gray-600">{h2h.draws}</p>
                <p className="text-xs text-gray-500">Barazime</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center">
                <p className="text-2xl font-bold text-[#FF6B35]">{h2h.teamBGoals}</p>
                <p className="text-xs text-gray-500">Gola {teamB.name}</p>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Krahasimi</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey={teamA.name} fill="#0f1830" />
                    <Bar dataKey={teamB.name} fill="#FF6B35" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            <p className="mb-4 text-sm text-slate-600">Rezultatet e përfunduara nga procesverbali janë të përkohshme deri në konfirmimin në portal.{protocolError && ' Përditësimi live dështoi; të dhënat mund të jenë të vjetruara.'}</p>
            {liveMeetings.length>0&&<div className="mb-6"><h3 className="text-lg font-semibold text-red-700 mb-4">Ndeshjet live</h3><div className="space-y-3">{liveMeetings.map(m=><MatchCard key={m.id} match={m} onClick={setSelectedMatch} compact/>)}</div></div>}
            {/* Match History */}
            {h2h.matches.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Historiku i Ndeshjeve</h3>
                <div className="space-y-3">
                  {h2h.matches.map(m => (
                    <MatchCard key={m.id} match={m} onClick={setSelectedMatch} compact />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {(!teamAId || !teamBId) && (
          <p className="text-gray-500 text-center py-12">Zgjedh dy skuadra për të parë krahasimin head-to-head.</p>
        )}

        {teamAId && teamBId && h2h && h2h.matches.length === 0 && liveMeetings.length === 0 && (
          <p className="text-gray-500 text-center py-12">Nuk ka ndeshje direkte mes këtyre dy skuadrave.</p>
        )}
      </div>
      <div className="mt-auto"><Footer /></div>
      <MatchDetailModal match={selectedMatch ? displayMatches.find(m=>m.id===selectedMatch.id)||selectedMatch : null} onClose={() => setSelectedMatch(null)} />
    </div>
  );
};

export default HeadToHeadPage;


