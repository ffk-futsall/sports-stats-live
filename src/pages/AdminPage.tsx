import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dbVisitors } from '@/lib/supabase-db';
import { useData } from '@/context/DataContext';
import Header from '@/components/Header';
import AdminTeams from './admin/AdminTeams';
import AdminPlayers from './admin/AdminPlayers';
import AdminMatches from './admin/AdminMatches';
import AdminScorers from './admin/AdminScorers';
import AdminPlayerOfWeek from './admin/AdminPlayerOfWeek';
import AdminSettings from './admin/AdminSettings';
import AdminDecisions from './admin/AdminDecisions';
import AdminEditors from './admin/AdminEditors';
import AdminTeamsPlayers from './admin/AdminTeamsPlayers';
import AdminKombetarja from './admin/AdminNationalTeam';
import EditorPanel from './admin/EditorPanel';
import AdminLiveControl from './admin/AdminLiveControl';
import AdminVideos from './admin/AdminVideos';
import AdminNews from './admin/AdminNews';
import AdminPlayoff from './admin/AdminPlayoff';
import AdminNormativeActs from './admin/AdminNormativeActs';
import AdminShorti from './admin/AdminShorti';
import AdminDocuments from './admin/AdminDocuments';
const AdminPage: React.FC = () => {
  const { isAuthenticated, isAdmin, isEditor, currentUser, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate('/login');
  }, [loading, isAuthenticated, navigate]);
  const { matches, teams, players, getActiveSeason, competitions, scorers, playersOfWeek } = useData();
  
  // Default tab: editors go to 'live', admins go to 'dashboard'
  const [activeTab, setActiveTab] = useState(() => {
    if (currentUser?.role === 'editor') return 'myteam';
    return 'dashboard';
  });

  // Update default tab when user changes
  useEffect(() => {
    if (currentUser?.role === 'editor' && activeTab === 'dashboard') {
      setActiveTab('live');
    }
  }, [currentUser]);

  const [visitorStats, setVisitorStats] = useState<any>(null);
  useEffect(() => {
    if (isAuthenticated) dbVisitors.getStats().then(setVisitorStats).catch(() => {});
  }, [isAuthenticated]);

  if (!isAuthenticated) return null;

  const activeSeason = getActiveSeason();
  const activeMatches = matches.filter(m => activeSeason ? m.seasonId === activeSeason.id : true);
  const liveMatches = activeMatches.filter(m => m.status === 'live');
  const finishedMatches = activeMatches.filter(m => m.status === 'finished');
  const activeTeams = teams.filter(t => activeSeason ? t.seasonId === activeSeason.id : true);

  const DashCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-xs font-medium opacity-70 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );

  const tabs = [
    { key: 'myteam', label: 'Skuadra Ime', icon: null, editorAccess: true },
    { key: 'live', label: 'LIVE Control', icon: null, editorAccess: false, highlight: liveMatches.length > 0 },
    { key: 'dashboard', label: 'Dashboard', icon: null, editorAccess: false },
    { key: 'teams', label: 'Skuadrat', icon: null, editorAccess: false },
    { key: 'players', label: 'Lojtarët', icon: null, editorAccess: false },
    { key: 'matches', label: 'Ndeshjet', icon: null, editorAccess: false },
    { key: 'scorers', label: 'Golashënuesit', icon: null, editorAccess: false },
    { key: 'pow', label: 'Lojtari Javës', icon: null, editorAccess: false },
    { key: 'settings', label: 'Cilësimet', icon: null, editorAccess: false },
    { key: 'decisions', label: 'Komisioni', icon: null, editorAccess: false },
    { key: 'teamsplayers', label: 'Skuadrat & Lojtaret', icon: null, editorAccess: false },
    { key: 'kombetarja', label: 'Kombetarja', icon: null, editorAccess: false },
    { key: 'playoff', label: 'PlayOff', icon: null, editorAccess: false },
    { key: 'normativeActs', label: 'Aktet Normative', icon: null, editorAccess: false },
    { key: 'shorti', label: 'Shorti', icon: null, editorAccess: false },
    { key: 'videos', label: 'Video', icon: null, editorAccess: false },
    { key: 'news', label: 'Lajme', icon: null, editorAccess: false },
    { key: 'documents', label: 'Dokumentet', icon: null, editorAccess: false },
  ];

  const visibleTabs = isAdmin ? tabs : tabs.filter(t => t.editorAccess);

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <Header />
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-sm text-gray-500">
              {currentUser?.username} ({isAdmin ? 'Administrator' : 'Editor'})
              {activeSeason && <span className="ml-2 text-[#0f1830]">Sezoni: {activeSeason.name}</span>}
            </p>
          </div>
          {liveMatches.length > 0 && activeTab !== 'live' && (
            <button
              onClick={() => setActiveTab('live')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors animate-pulse"
            >
              <span className="w-2 h-2 bg-white rounded-full" />
              {liveMatches.length} LIVE
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {visibleTabs.map(tab => {
            const isLive = tab.key === 'live' && liveMatches.length > 0;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? isLive
                      ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                      : 'bg-[#0f1830] text-white shadow-sm'
                    : isLive
                      ? 'text-red-600 bg-red-50 hover:bg-red-100 border border-red-200'
                      : 'text-gray-600 hover:bg-white hover:shadow-sm'
                }`}
              >
                {isLive && <span className="w-2 h-2 bg-current rounded-full animate-pulse" />}
                
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* LIVE Control */}
        {activeTab === 'myteam' && isEditor && <EditorPanel />}
        {activeTab === 'live' && <AdminLiveControl />}

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <DashCard label="Skuadra" value={activeTeams.length} color="bg-[#0f1830]/10 text-[#0f1830]" />
              <DashCard label="Ndeshje" value={activeMatches.length} color="bg-green-50 text-green-600" />
              <DashCard label="Lojtarë" value={players.filter(p => activeSeason ? p.seasonId === activeSeason.id : true).length} color="bg-purple-50 text-purple-600" />
              <DashCard label="LIVE" value={liveMatches.length} color="bg-red-50 text-red-600" />
            </div>

            {/* Visitor Stats */}
            {visitorStats && (
              <div className="mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <DashCard label="Vizita Totale" value={visitorStats.total} color="bg-indigo-50 text-indigo-600" />
                  <DashCard label="IP Unike" value={visitorStats.unique} color="bg-cyan-50 text-cyan-600" />
                  <DashCard label="Vizita Sot" value={visitorStats.today} color="bg-amber-50 text-amber-600" />
                  <DashCard label="Unike Sot" value={visitorStats.uniqueToday} color="bg-rose-50 text-rose-600" />
                </div>

                <div className="bg-white rounded-xl border border-gray-100 p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Vizitoret e Fundit
                  </h3>
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">#</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">IP</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Qyteti</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Shteti</th>
                          <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Koha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visitorStats.recent.map((v: any, i: number) => (
                          <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                            <td className="px-3 py-2 font-mono text-xs">{v.ip}</td>
                            <td className="px-3 py-2">{v.city}{v.region ? ', ' + v.region : ''}</td>
                            <td className="px-3 py-2">{v.country}</td>
                            <td className="px-3 py-2 text-gray-400 text-xs">{v.visited_at ? new Date(v.visited_at).toLocaleString('sq-AL') : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {liveMatches.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  
                  Ndeshjet LIVE
                </h3>
                <div className="space-y-2">
                  {liveMatches.map(m => {
                    const home = teams.find(t => t.id === m.homeTeamId);
                    const away = teams.find(t => t.id === m.awayTeamId);
                    return (
                      <div key={m.id} className="bg-white rounded-lg border border-red-100 p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-sm font-medium">{home?.name} {m.homeScore ?? 0} - {m.awayScore ?? 0} {away?.name}</span>
                        </div>
                        <button
                          onClick={() => setActiveTab('live')}
                          className="text-xs text-red-600 hover:underline font-medium"
                        >
                          LIVE Control
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Ndeshjet e Fundit</h3>
                {finishedMatches.slice(-5).reverse().map(m => {
                  const home = teams.find(t => t.id === m.homeTeamId);
                  const away = teams.find(t => t.id === m.awayTeamId);
                  return (
                    <div key={m.id} className="text-sm text-gray-600 py-1.5 border-b border-gray-50 last:border-0">
                      {home?.name} {m.homeScore} - {m.awayScore} {away?.name}
                      <span className="text-xs text-gray-400 ml-2">J{m.week}</span>
                    </div>
                  );
                })}
                {finishedMatches.length === 0 && <p className="text-gray-400 text-sm">Nuk ka ndeshje të përfunduara.</p>}
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Kompeticionet Aktive</h3>
                {competitions.filter(c => activeSeason ? c.seasonId === activeSeason.id : true).map(c => (
                  <div key={c.id} className="text-sm text-gray-600 py-1.5 border-b border-gray-50 last:border-0 flex items-center justify-between">
                    <span>{c.name}</span>
                    <span className="text-xs text-gray-400">{teams.filter(t => t.competitionId === c.id).length} skuadra</span>
                  </div>
                ))}
                {competitions.filter(c => activeSeason ? c.seasonId === activeSeason.id : true).length === 0 && (
                  <p className="text-gray-400 text-sm">Nuk ka kompeticione aktive.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'teams' && isAdmin && <AdminTeams />}
        {activeTab === 'players' && isAdmin && <AdminPlayers />}
        {activeTab === 'matches' && <AdminMatches />}
        {activeTab === 'scorers' && isAdmin && <AdminScorers />}
        {activeTab === 'pow' && isAdmin && <AdminPlayerOfWeek />}
        {activeTab === 'settings' && isAdmin && <AdminSettings />}
        {activeTab === 'decisions' && isAdmin && <AdminDecisions />}
        {activeTab === 'editors' && isAdmin && <AdminEditors />}
        {activeTab === 'teamsplayers' && isAdmin && <AdminTeamsPlayers />}
        {activeTab === 'kombetarja' && isAdmin && <AdminKombetarja />}
        {activeTab === 'playoff' && isAdmin && <AdminPlayoff />}
        {activeTab === 'normativeActs' && isAdmin && <AdminNormativeActs />}
        {activeTab === 'shorti' && isAdmin && <AdminShorti />}
        {activeTab === 'videos' && isAdmin && <AdminVideos />}
        {activeTab === 'news' && isAdmin && <AdminNews />}
        {activeTab === 'documents' && isAdmin && <AdminDocuments />}
      </div>
    </div>
  );
};

export default AdminPage;


