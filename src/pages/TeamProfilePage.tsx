import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/context/DataContext';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadialBarChart, RadialBar, BarChart, Bar } from 'recharts';
import FavoriteTeamButton from '@/components/FavoriteTeamButton';
import {hasResult} from '@/lib/matchHistory';

const DONUT_COLORS = ['#6366F1', '#F59E0B', '#22C55E', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];
const FORM_COLORS: Record<string, { bg: string; text: string }> = {
  F: { bg: '#22C55E', text: '#FFFFFF' },
  H: { bg: '#EF4444', text: '#FFFFFF' },
  B: { bg: '#F59E0B', text: '#FFFFFF' },
};
const FORM_LABELS: Record<string, string> = { F: 'Fitore', H: 'Humbje', B: 'Barazim' };

const TeamProfilePage: React.FC = () => {
  const { id: teamId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { teams, players, displayMatches:matches, goals } = useData();
  const [searchPlayer, setSearchPlayer] = useState('');

  const team = teams.find(t => t.id === teamId);
  const teamPlayers = players.filter(p => p.teamId === teamId);
  const teamMatches = matches.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);
  const finishedMatches = teamMatches.filter(m => m.status === 'finished' && hasResult(m));
  const liveMatches = teamMatches.filter(m => m.status === 'live');

  // Main stats
  const stats = useMemo(() => {
    let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0;
    let homeWins = 0, homePlayed = 0, awayWins = 0, awayPlayed = 0;
    let cleanSheets = 0, homeGoals = 0, awayGoals = 0;

    finishedMatches.forEach(m => {
      const hs = m.homeScore ?? 0;
      const as_ = m.awayScore ?? 0;
      const isHome = m.homeTeamId === teamId;
      const gf = isHome ? hs : as_;
      const ga = isHome ? as_ : hs;
      goalsFor += gf;
      goalsAgainst += ga;

      if (isHome) { homePlayed++; homeGoals += gf; if (gf > ga) homeWins++; }
      else { awayPlayed++; awayGoals += gf; if (gf > ga) awayWins++; }

      if (ga === 0) cleanSheets++;
      if (gf > ga) wins++;
      else if (gf < ga) losses++;
      else draws++;
    });

    const played = finishedMatches.length;
    const avgGoals = played > 0 ? (goalsFor / played).toFixed(1) : '0';
    const avgConceded = played > 0 ? (goalsAgainst / played).toFixed(1) : '0';
    const winRate = played > 0 ? Math.round((wins / played) * 100) : 0;

    return { wins, draws, losses, goalsFor, goalsAgainst, played, homeWins, homePlayed, awayWins, awayPlayed, cleanSheets, homeGoals, awayGoals, avgGoals, avgConceded, winRate };
  }, [finishedMatches, teamId]);

  // Form (last 5)
  const formData = useMemo(() => {
    const sorted = [...finishedMatches].sort((a, b) => (b.week || 0) - (a.week || 0)).slice(0, 5);
    return sorted.map(m => {
      const hs = m.homeScore ?? 0;
      const as_ = m.awayScore ?? 0;
      const isHome = m.homeTeamId === teamId;
      const gf = isHome ? hs : as_;
      const ga = isHome ? as_ : hs;
      if (gf > ga) return 'F';
      if (gf < ga) return 'H';
      return 'B';
    }).reverse();
  }, [finishedMatches, teamId]);

  // Weekly goals for area chart
  const weeklyData = useMemo(() => {
    const weekMap: Record<number, { goalsFor: number; goalsAgainst: number }> = {};
    finishedMatches.forEach(m => {
      const w = m.week || 1;
      if (!weekMap[w]) weekMap[w] = { goalsFor: 0, goalsAgainst: 0 };
      const hs = m.homeScore ?? 0;
      const as_ = m.awayScore ?? 0;
      const isHome = m.homeTeamId === teamId;
      weekMap[w].goalsFor += isHome ? hs : as_;
      weekMap[w].goalsAgainst += isHome ? as_ : hs;
    });
    return Object.entries(weekMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([week, data]) => ({ name: 'Java ' + week, 'Gola Per': data.goalsFor, 'Gola Kunder': data.goalsAgainst }));
  }, [finishedMatches, teamId]);

  // Position distribution
  const positionData = useMemo(() => {
    const posMap: Record<string, number> = {};
    teamPlayers.forEach(p => {
      const pos = p.position || 'Tjeter';
      posMap[pos] = (posMap[pos] || 0) + 1;
    });
    return Object.entries(posMap).map(([name, value]) => ({ name, value }));
  }, [teamPlayers]);

  // Home vs Away bar data
  const homeAwayData = [
    { name: 'Shtepi', Fitore: stats.homeWins, Ndeshje: stats.homePlayed, Gola: stats.homeGoals },
    { name: 'Jashte', Fitore: stats.awayWins, Ndeshje: stats.awayPlayed, Gola: stats.awayGoals },
  ];

  const totalMatches = stats.played || 1;
  const winPct = Math.round((stats.wins / totalMatches) * 100);
  const lossPct = Math.round((stats.losses / totalMatches) * 100);
  const drawPct = Math.round((stats.draws / totalMatches) * 100);

  const pieData = [
    { name: 'Fitore', value: stats.wins },
    { name: 'Humbje', value: stats.losses },
    { name: 'Barazim', value: stats.draws },
  ];
  const PIE_COLORS_MAIN = ['#22C55E', '#EF4444', '#F59E0B'];

  const filteredPlayers = teamPlayers.filter(p =>
    (p.firstName + ' ' + p.lastName).toLowerCase().includes(searchPlayer.toLowerCase())
  );

  // Recent results
  const recentMatches = useMemo(() => {
    return [...finishedMatches].sort((a, b) => (b.week || 0) - (a.week || 0)).slice(0, 5);
  }, [finishedMatches]);

  if (!team) {
    return (
    <div style={Object.assign({}, { overflowX: "hidden" as const, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f1830 0%, #1a3a5c 100%)' })}>
        <div style={Object.assign({}, { textAlign: 'center' as const, color: '#FFFFFF' })}>
          <p style={Object.assign({}, { fontSize: '18px', marginBottom: '16px' })}>Skuadra nuk u gjet.</p>
          <button onClick={() => navigate(-1)} style={Object.assign({}, { color: '#60A5FA', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' })}>  Kthehu</button>
        </div>
      </div>
    );
  }

  const card = (extra?: any) => Object.assign({}, { background: '#FFFFFF', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }, extra || {});

  return (
    <div style={Object.assign({}, { minHeight: '100vh', background: '#F1F5F9', fontFamily: "'Inter', -apple-system, sans-serif" })}>

      {/* Hero Header */}
      <div style={Object.assign({}, { background: 'linear-gradient(135deg, #0f1830 0%, #1E3A5F 50%, #0f1830 100%)', padding: '20px 16px 32px', position: 'relative' as const, overflow: 'hidden' })}>
        <div style={Object.assign({}, { position: 'absolute' as const, top: 0, right: 0, width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)', borderRadius: '50%' })}></div>

        <div style={Object.assign({}, { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' as const, zIndex: 1 })}>
          <div style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '20px' })}>
            <button onClick={() => navigate(-1)} style={Object.assign({}, { background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px', padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' })}>
               
            </button>
            <div style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '16px' })}>
              {team.logo ? (
                <div style={Object.assign({}, { width: '64px', height: '64px', borderRadius: '18px', overflow: 'hidden', background: 'rgba(255,255,255,0.15)', padding: '3px' })}>
                  <img src={team.logo} alt="" style={Object.assign({}, { width: '100%', height: '100%', borderRadius: '15px', objectFit: 'cover' })} />
                </div>
              ) : (
                <div style={Object.assign({}, { width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '24px' })}>
                  {team.name.charAt(0)}
                </div>
              )}
              <div>
                <div style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '10px' })}>
                  <h1 style={Object.assign({}, { fontSize: '26px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.5px' })}>{team.name}</h1>
                  <FavoriteTeamButton teamId={team.id} size={22} />
                </div>
                <p style={Object.assign({}, { fontSize: '13px', color: 'rgba(255,255,255,0.6)', margin: '4px 0 0 0' })}>
                  {team.stadium || 'Statistikat e detajuara'}
                  {team.foundedYear ? ' · Est. ' + team.foundedYear : ''}
                </p>
              </div>
            </div>
          </div>

          {/* Form badges */}
          <div style={Object.assign({}, { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '8px' })}>
            <span style={Object.assign({}, { fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const, letterSpacing: '1px', fontWeight: 600 })}>Forma</span>
            <div style={Object.assign({}, { display: 'flex', gap: '6px' })}>
              {formData.length > 0 ? formData.map((f, i) => (
                <div key={i} style={Object.assign({}, { position: 'relative' as const })}>
                  <span style={Object.assign({}, {
                    width: '34px', height: '34px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: FORM_COLORS[f]?.text || '#FFF', fontWeight: 800, fontSize: '13px',
                    background: FORM_COLORS[f]?.bg || '#94A3B8',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  })}>{f}</span>
                </div>
              )) : <span style={Object.assign({}, { color: 'rgba(255,255,255,0.4)', fontSize: '13px' })}>Pa ndeshje</span>}
            </div>
          </div>
        </div>

        {/* Quick stats in header */}
        <div style={Object.assign({}, { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginTop: '28px', position: 'relative' as const, zIndex: 1 })}>
          {[
            { label: 'Ndeshje', value: stats.played, icon: null },
            { label: 'Fitore', value: stats.wins, icon: null },
            { label: 'Barazim', value: stats.draws, icon: null },
            { label: 'Humbje', value: stats.losses, icon: null },
            { label: '% Fitore', value: stats.winRate + '%', icon: null },
          ].map((s, i) => (
            <div key={i} style={Object.assign({}, { background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '16px', textAlign: 'center' as const })}>
              
              <p style={Object.assign({}, { fontSize: '22px', fontWeight: 800, color: '#FFFFFF', margin: 0 })}>{s.value}</p>
              <p style={Object.assign({}, { fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px' })}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div style={Object.assign({}, { padding: '24px 32px' })}>

        {/* Row 1: Area chart + Results donut + Results analytics */}
        <div style={Object.assign({}, { display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '20px' })}>
          {/* Area Chart */}
          <div style={card()}>
            <div style={Object.assign({}, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' })}>
              <div>
                <h3 style={Object.assign({}, { fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 })}>Performanca per Jave</h3>
                <p style={Object.assign({}, { fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' })}>Krahasimi i golave per dhe kunder</p>
              </div>
              <div style={Object.assign({}, { display: 'flex', gap: '16px', fontSize: '12px' })}>
                <span style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '6px' })}><span style={Object.assign({}, { width: '10px', height: '10px', borderRadius: '3px', background: '#6366F1' })}></span>Per</span>
                <span style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '6px' })}><span style={Object.assign({}, { width: '10px', height: '10px', borderRadius: '3px', background: '#F43F5E' })}></span>Kunder</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="gradFor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAgainst" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={Object.assign({}, { fontSize: 11, fill: '#94A3B8' })} axisLine={false} tickLine={false} />
                <YAxis tick={Object.assign({}, { fontSize: 11, fill: '#94A3B8' })} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={Object.assign({}, { borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' })} />
                <Area type="monotone" dataKey="Gola Per" stroke="#6366F1" strokeWidth={2.5} fill="url(#gradFor)" dot={Object.assign({}, { r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#FFFFFF' })} />
                <Area type="monotone" dataKey="Gola Kunder" stroke="#F43F5E" strokeWidth={2.5} fill="url(#gradAgainst)" dot={Object.assign({}, { r: 4, fill: '#F43F5E', strokeWidth: 2, stroke: '#FFFFFF' })} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Results section */}
          <div style={Object.assign({}, { display: 'flex', flexDirection: 'column' as const, gap: '20px' })}>
            {/* Donut */}
            <div style={card({ flex: 1 })}>
              <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' })}>Rezultatet</h3>
              <div style={Object.assign({}, { display: 'flex', alignItems: 'center' })}>
                <div style={Object.assign({}, { width: '50%', position: 'relative' as const })}>
                  <ResponsiveContainer width="100%" height={130}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={55} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                        {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS_MAIN[i]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={Object.assign({}, { position: 'absolute' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' as const })}>
                    <p style={Object.assign({}, { fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 })}>{stats.played}</p>
                    <p style={Object.assign({}, { fontSize: '9px', color: '#94A3B8', margin: 0, textTransform: 'uppercase' as const })}>Total</p>
                  </div>
                </div>
                <div style={Object.assign({}, { width: '50%', fontSize: '12px' })}>
                  {[
                    { label: 'Fitore', val: stats.wins, color: '#22C55E' },
                    { label: 'Humbje', val: stats.losses, color: '#EF4444' },
                    { label: 'Barazim', val: stats.draws, color: '#F59E0B' },
                  ].map((r, i) => (
                    <div key={i} style={Object.assign({}, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' })}>
                      <div style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '8px' })}>
                        <span style={Object.assign({}, { width: '8px', height: '8px', borderRadius: '3px', background: r.color })}></span>
                        <span style={Object.assign({}, { color: '#64748B' })}>{r.label}</span>
                      </div>
                      <span style={Object.assign({}, { fontWeight: 700, color: '#0F172A' })}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Key stats */}
            <div style={card({ flex: 1 })}>
              <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' })}>Statistika Kryesore</h3>
              {[
                { label: 'Mesatare Gola/Ndeshje', value: stats.avgGoals, color: '#6366F1' },
                { label: 'Mesatare Pranuar/Ndeshje', value: stats.avgConceded, color: '#F43F5E' },
                { label: 'Clean Sheets', value: String(stats.cleanSheets), color: '#22C55E' },
                { label: 'Diferenca Golave', value: String(stats.goalsFor - stats.goalsAgainst), color: stats.goalsFor >= stats.goalsAgainst ? '#22C55E' : '#EF4444' },
              ].map((s, i) => (
                <div key={i} style={Object.assign({}, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 3 ? '1px solid #F1F5F9' : 'none' })}>
                  <span style={Object.assign({}, { fontSize: '12px', color: '#64748B' })}>{s.label}</span>
                  <span style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: s.color })}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Home/Away + Positions + Progress stats */}
        <div style={Object.assign({}, { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' })}>
          {/* Home vs Away */}
          <div style={card()}>
            <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' })}>
              
              Shtepi vs Jashte
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={homeAwayData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={Object.assign({}, { fontSize: 11, fill: '#94A3B8' })} axisLine={false} />
                <YAxis tick={Object.assign({}, { fontSize: 11, fill: '#94A3B8' })} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={Object.assign({}, { borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' })} />
                <Bar dataKey="Fitore" fill="#6366F1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Gola" fill="#22C55E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Positions donut */}
          <div style={card()}>
            <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' })}>Pozicionet e Lojtareve</h3>
            <div style={Object.assign({}, { display: 'flex', alignItems: 'center' })}>
              <div style={Object.assign({}, { width: '55%', position: 'relative' as const })}>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={positionData} cx="50%" cy="50%" innerRadius={32} outerRadius={52} dataKey="value" stroke="#FFFFFF" strokeWidth={3}>
                      {positionData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div style={Object.assign({}, { position: 'absolute' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' as const })}>
                  <p style={Object.assign({}, { fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 })}>{teamPlayers.length}</p>
                  <p style={Object.assign({}, { fontSize: '8px', color: '#94A3B8', margin: 0, textTransform: 'uppercase' as const })}>Lojtar</p>
                </div>
              </div>
              <div style={Object.assign({}, { width: '45%' })}>
                {positionData.map((p, i) => (
                  <div key={i} style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '11px' })}>
                    <span style={Object.assign({}, { width: '8px', height: '8px', borderRadius: '3px', background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 })}></span>
                    <span style={Object.assign({}, { color: '#64748B', flex: 1 })}>{p.name}</span>
                    <span style={Object.assign({}, { fontWeight: 700, color: '#0F172A' })}>{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed progress stats */}
          <div style={card()}>
            <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' })}>
              
              Analitika
            </h3>
            {[
              { label: 'Perqindja Fitoreve', pct: winPct, color: '#22C55E' },
              { label: 'Perqindja Humbjeve', pct: lossPct, color: '#EF4444' },
              { label: 'Perqindja Barazimeve', pct: drawPct, color: '#F59E0B' },
              { label: 'Clean Sheets', pct: stats.played > 0 ? Math.round((stats.cleanSheets / stats.played) * 100) : 0, color: '#6366F1' },
              { label: 'Fitore ne Shtepi', pct: stats.homePlayed > 0 ? Math.round((stats.homeWins / stats.homePlayed) * 100) : 0, color: '#14B8A6' },
            ].map((item, i) => (
              <div key={i} style={Object.assign({}, { marginBottom: '12px' })}>
                <div style={Object.assign({}, { display: 'flex', justifyContent: 'space-between', marginBottom: '5px' })}>
                  <span style={Object.assign({}, { fontSize: '11px', color: '#64748B' })}>{item.label}</span>
                  <span style={Object.assign({}, { fontSize: '11px', fontWeight: 700, color: '#0F172A' })}>{item.pct}%</span>
                </div>
                <div style={Object.assign({}, { height: '6px', background: '#F1F5F9', borderRadius: '3px', overflow: 'hidden' })}>
                  <div style={Object.assign({}, { height: '100%', width: item.pct + '%', background: item.color, borderRadius: '3px', transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)' })}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 3: Recent matches + Players */}
        <div style={Object.assign({}, { display: 'grid', gridTemplateColumns: '1fr', gap: '16px' })}>
          {/* Recent matches */}
          <div style={card()}>
            <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' })}>
              
              Ndeshjet e Fundit
            </h3>
            {recentMatches.length === 0 ? (
              <p style={Object.assign({}, { color: '#94A3B8', fontSize: '13px', textAlign: 'center' as const, padding: '20px 0' })}>Ska ndeshje te perfunduara.</p>
            ) : (
              <div>
                {recentMatches.map((m, i) => {
                  const homeTeam = teams.find(t => t.id === m.homeTeamId);
                  const awayTeam = teams.find(t => t.id === m.awayTeamId);
                  const isHome = m.homeTeamId === teamId;
                  const gf = isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0);
                  const ga = isHome ? (m.awayScore ?? 0) : (m.homeScore ?? 0);
                  const result = gf > ga ? 'F' : gf < ga ? 'H' : 'B';
                  const opponent = isHome ? awayTeam : homeTeam;

                  return (
                    <div key={m.id} style={Object.assign({}, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < recentMatches.length - 1 ? '1px solid #F1F5F9' : 'none' })}>
                      <div style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '10px', flex: 1 })}>
                        <span style={Object.assign({}, {
                          width: '26px', height: '26px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 800, color: '#FFF',
                          background: FORM_COLORS[result]?.bg || '#94A3B8'
                        })}>{result}</span>
                        <div>
                          <p style={Object.assign({}, { fontSize: '12px', fontWeight: 600, color: '#0F172A', margin: 0 })}>{isHome ? 'vs' : '@'} {opponent?.name || '?'}</p>
                          <p style={Object.assign({}, { fontSize: '10px', color: '#94A3B8', margin: 0 })}>Java {m.week || '-'}</p>
                        </div>
                      </div>
                      <span style={Object.assign({}, { fontSize: '14px', fontWeight: 800, color: '#0F172A' })}>{m.homeScore} - {m.awayScore}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Players table */}
          <div style={card()}>
            <div style={Object.assign({}, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' })}>
              <div>
                <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 })}>Skuadra ({teamPlayers.length} lojtar)</h3>
              </div>
              <div style={Object.assign({}, { position: 'relative' as const })}>
                a
                <input
                  value={searchPlayer}
                  onChange={e => setSearchPlayer(e.target.value)}
                  placeholder="Kerko..."
                  style={Object.assign({}, { paddingLeft: '34px', paddingRight: '14px', paddingTop: '9px', paddingBottom: '9px', border: '1px solid #E2E8F0', borderRadius: '12px', fontSize: '13px', outline: 'none', width: '180px', background: '#F8FAFC', transition: 'all 0.2s' })}
                />
              </div>
            </div>
            {filteredPlayers.length === 0 ? (
              <p style={Object.assign({}, { color: '#94A3B8', textAlign: 'center' as const, padding: '32px 0', fontSize: '13px' })}>Nuk ka lojtar.</p>
            ) : (
              <div style={Object.assign({}, { overflowX: 'auto' as const, maxHeight: '340px', overflowY: 'auto' as const })}>
                <table style={Object.assign({}, { width: '100%', borderCollapse: 'collapse' as const, fontSize: '13px' })}>
                  <thead>
                    <tr>
                      <th style={Object.assign({}, { textAlign: 'left' as const, padding: '10px 12px', color: '#94A3B8', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', position: 'sticky' as const, top: 0, background: '#FFFFFF', borderBottom: '2px solid #F1F5F9' })}>Nr</th>
                      <th style={Object.assign({}, { textAlign: 'left' as const, padding: '10px 12px', color: '#94A3B8', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', position: 'sticky' as const, top: 0, background: '#FFFFFF', borderBottom: '2px solid #F1F5F9' })}>Lojtari</th>
                      <th style={Object.assign({}, { textAlign: 'left' as const, padding: '10px 12px', color: '#94A3B8', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase' as const, letterSpacing: '0.5px', position: 'sticky' as const, top: 0, background: '#FFFFFF', borderBottom: '2px solid #F1F5F9' })}>Pozicioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((p, idx) => (
                      <tr key={p.id} style={Object.assign({}, { borderBottom: '1px solid #F8FAFC', transition: 'background 0.15s' })}>
                        <td style={Object.assign({}, { padding: '10px 12px', color: '#94A3B8', fontWeight: 600, fontSize: '12px', width: '40px' })}>{p.number || '-'}</td>
                        <td style={Object.assign({}, { padding: '10px 12px' })}>
                          <div style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '10px' })}>
                            {p.photo ? (
                              <img src={p.photo} alt="" style={Object.assign({}, { width: '34px', height: '34px', borderRadius: '10px', objectFit: 'cover' as const })} />
                            ) : (
                              <div style={Object.assign({}, { width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #E0E7FF, #C7D2FE)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366F1', fontSize: '11px', fontWeight: 700 })}>
                                {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                              </div>
                            )}
                            <span style={Object.assign({}, { fontWeight: 600, color: '#0F172A', fontSize: '13px' })}>{p.firstName} {p.lastName}</span>
                          </div>
                        </td>
                        <td style={Object.assign({}, { padding: '10px 12px' })}>
                          <span style={Object.assign({}, { fontSize: '11px', padding: '4px 10px', borderRadius: '6px', background: '#F1F5F9', color: '#64748B', fontWeight: 500 })}>{p.position || '-'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamProfilePage;