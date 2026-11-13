import React, { useState, useMemo } from 'react';
import { useData } from '@/context/DataContext';
import { PlayerStats } from '@/types';
import { getSuspensionRules, getSuspensionStatus } from '@/lib/suspensions';
import {protocolPlayerCards} from '@/lib/protocolPlayerCards';
function loadPlayerStats(): PlayerStats[] {
  try { var s = localStorage.getItem('ffk_player_stats'); if (s) return JSON.parse(s); } catch(e) {}
  return [];
}

var PlayerStatsSection: React.FC = function() {
  var data = useData();
  var teams = data.teams;
  var players = data.players;
  var competitions = data.competitions;
  var getActiveSeason = data.getActiveSeason;
  var getTeamById = data.getTeamById;
  var activeSeason = getActiveSeason();
  var settings = data.settings;
  var suspensionRules = getSuspensionRules(settings);

  var stats = loadPlayerStats();
  var reportCards = useMemo(()=>protocolPlayerCards(data.displayMatches,players,stats,data.protocolMatches),[data.displayMatches,players,stats,data.protocolMatches]);

  var _compFilter = useState<'all' | string>('all');
  var compFilter = _compFilter[0]; var setCompFilter = _compFilter[1];
  var _teamFilter = useState<'all' | string>('all');
  var teamFilter = _teamFilter[0]; var setTeamFilter = _teamFilter[1];
  var _weekFilter = useState<'all' | string>('all');
  var weekFilter = _weekFilter[0]; var setWeekFilter = _weekFilter[1];
  var _search = useState('');
  var search = _search[0]; var setSearch = _search[1];

  var superligaComp = competitions.find(function(c) { return c.type === 'superliga' && (activeSeason ? c.seasonId === activeSeason.id : true); });
  var ligaPareComp = competitions.find(function(c) { return c.type === 'liga_pare' && (activeSeason ? c.seasonId === activeSeason.id : true); });
  var kupaComp = competitions.find(function(c) { return c.type === 'kupa' && (activeSeason ? c.seasonId === activeSeason.id : true); });

  var filteredTeams = useMemo(function() {
    if (compFilter === 'all') return teams.filter(function(t) { return activeSeason ? t.seasonId === activeSeason.id : true; });
    return teams.filter(function(t) { return t.competitionId === compFilter; });
  }, [teams, compFilter, activeSeason]);

  var weeks = useMemo(function() {
    var set = new Set<number>();
    stats.forEach(function(s) { set.add(s.week); });
    reportCards.forEach(function(s) { set.add(s.week); });
    return Array.from(set).sort(function(a, b) { return a - b; });
  }, [stats, reportCards]);

  var aggregated = useMemo(function() {
    var map: Record<string, { playerId: string; firstName: string; lastName: string; photo: string; teamId: string; yellowCards: number; redCards: number }> = {};

    stats.forEach(function(s) {
      if (compFilter !== 'all' && s.competitionId !== compFilter) return null;
      if (teamFilter !== 'all' && s.teamId !== teamFilter) return null;
      if (weekFilter !== 'all' && String(s.week) !== weekFilter) return null;
      if (activeSeason && s.seasonId !== activeSeason.id) return null;

      if (!map[s.playerId]) {
        var player = players.find(function(p) { return p.id === s.playerId; });
        if (!player) return null;
        map[s.playerId] = { playerId: s.playerId, firstName: player.firstName, lastName: player.lastName, photo: player.photo, teamId: s.teamId, yellowCards: 0, redCards: 0 };
      }
      map[s.playerId].yellowCards += s.yellowCards;
      map[s.playerId].redCards += s.redCards;
    });

    reportCards.forEach(function(s) {
      if (compFilter !== 'all' && s.competitionId !== compFilter) return;
      if (teamFilter !== 'all' && s.teamId !== teamFilter) return;
      if (weekFilter !== 'all' && String(s.week) !== weekFilter) return;
      if (activeSeason && s.seasonId !== activeSeason.id) return;
      var key = s.playerId || `report:${s.teamId}:${(s.firstName+' '+s.lastName).toLowerCase()}`;
      if (!map[key]) map[key] = {playerId:key,firstName:s.firstName,lastName:s.lastName,photo:s.photo,teamId:s.teamId,yellowCards:0,redCards:0};
      map[key].yellowCards += s.yellowCards; map[key].redCards += s.redCards;
    });

    var result = Object.values(map);
    if (search) {
      var q = search.toLowerCase();
      result = result.filter(function(r) { return (r.firstName + ' ' + r.lastName).toLowerCase().indexOf(q) !== -1; });
    }
    return result.sort(function(a, b) { return (b.yellowCards + b.redCards * 2) - (a.yellowCards + a.redCards * 2); });
  }, [stats, reportCards, players, compFilter, teamFilter, weekFilter, search, activeSeason]);

  return (
    <div className="mt-10 px-6 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-red-500 rounded-xl flex items-center justify-center shadow-lg">
          
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Statistikat Individuale</h2>
          <p className="text-sm text-gray-500">Kartonat e verdha dhe te kuqe per lojtar. Statusi i pezullimit bazohet vetëm në të dhënat manuale.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select value={compFilter} onChange={function(e) { setCompFilter(e.target.value); setTeamFilter('all'); }} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100">
          <option value="all">Te gjitha kompeticionet</option>
          {superligaComp && <option value={superligaComp.id}>Superliga</option>}
          {ligaPareComp && <option value={ligaPareComp.id}>Liga e Pare</option>}
          {kupaComp && <option value={kupaComp.id}>Kupa</option>}
        </select>
        <select value={teamFilter} onChange={function(e) { setTeamFilter(e.target.value); }} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100">
          <option value="all">Te gjitha skuadrat</option>
          {filteredTeams.map(function(t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}
        </select>
        <select value={weekFilter} onChange={function(e) { setWeekFilter(e.target.value); }} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100">
          <option value="all">Te gjitha javet</option>
          {weeks.map(function(w) { return <option key={w} value={String(w)}>Java {w}</option>; })}
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <input type="text" value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Kerko lojtar..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lojtari</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Skuadra</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kartona te Verdha</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kartona te Kuqe</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statusi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {aggregated.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Nuk ka statistika individuale</td></tr>
            ) : aggregated.map(function(p, i) {
              var team = getTeamById(p.teamId);
              var suspension = getSuspensionStatus(stats, p.playerId, suspensionRules);
              return (
                <tr key={p.playerId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500 font-medium">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : null}
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{p.firstName} {p.lastName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {team?.logo && <img src={team.logo} alt="" className="w-5 h-5 rounded-full" />}
                      <span className="text-sm text-gray-600">{team?.name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-yellow-50 text-yellow-700 text-sm font-semibold">
                      {p.yellowCards}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-sm font-semibold">
                      {p.redCards}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!stats.some(s=>s.playerId===p.playerId) ? (
                      <span className="text-slate-400">—</span>
                    ) : suspension.suspended ? (
                      <span title={suspension.reason} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase">
                        I Pezulluar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase">
                        I Disponueshem
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PlayerStatsSection;
