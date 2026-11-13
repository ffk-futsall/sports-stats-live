import React, { useMemo, useState } from 'react';
import { useData } from '@/context/DataContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import PlayerStatsSection from '@/components/PlayerStatsSection';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadialBarChart, RadialBar } from 'recharts';
import { Link } from 'react-router-dom';
import { hasResult } from '@/lib/matchHistory';
import { aggregateMatchEvents } from '@/lib/aggregateMatchEvents';
const StatistikatPage: React.FC = () => {
  const { competitions, displayMatches:matches, teams, players, getActiveSeason, getAggregatedScorers, calculateStandings, getTeamById, protocolError, protocolMatches } = useData();
  const activeSeason = getActiveSeason();
  const [selectedCompId, setSelectedCompId] = useState<string>('all');

  const activeComps = useMemo(() =>
    competitions.filter(c => activeSeason ? c.seasonId === activeSeason.id : true),
    [competitions, activeSeason]
  );

  const filteredMatches = useMemo(() => {
    let m = matches;
    if (activeSeason) m = m.filter(x => x.seasonId === activeSeason.id);
    if (selectedCompId !== 'all') m = m.filter(x => x.competitionId === selectedCompId);
    return m;
  }, [matches, activeSeason, selectedCompId]);

  const activeTeams = useMemo(() => {
    if (selectedCompId === 'all') return teams.filter(t => activeSeason ? t.seasonId === activeSeason.id : true);
    return teams.filter(t => t.competitionId === selectedCompId);
  }, [teams, activeSeason, selectedCompId]);

  const activePlayers = useMemo(() => {
    const teamIds = new Set(activeTeams.map(t => t.id));
    return players.filter(p => teamIds.has(p.teamId));
  }, [players, activeTeams]);

  const finishedMatches = filteredMatches.filter(m => m.status === 'finished' && hasResult(m));
  const eventTotals = useMemo(()=>aggregateMatchEvents(filteredMatches,protocolMatches),[filteredMatches,protocolMatches]);
  const liveMatches = filteredMatches.filter(m => m.status === 'live');
  const upcomingMatches = filteredMatches.filter(m => m.status === 'planned');
  const totalGoals = finishedMatches.reduce((sum, m) => sum + (m.homeScore ?? 0) + (m.awayScore ?? 0), 0);
  const avgGoals = finishedMatches.length > 0 ? (totalGoals / finishedMatches.length).toFixed(1) : '0';
  const highestScore = finishedMatches.reduce((max, m) => Math.max(max, (m.homeScore ?? 0) + (m.awayScore ?? 0)), 0);

  const homeWins = finishedMatches.filter(m => (m.homeScore ?? 0) > (m.awayScore ?? 0)).length;
  const awayWins = finishedMatches.filter(m => (m.awayScore ?? 0) > (m.homeScore ?? 0)).length;
  const draws = finishedMatches.filter(m => (m.homeScore ?? 0) === (m.awayScore ?? 0)).length;
  const total = finishedMatches.length || 1;
  const homeWinPct = Math.round((homeWins / total) * 100);
  const awayWinPct = Math.round((awayWins / total) * 100);
  const drawPct = Math.round((draws / total) * 100);

  // Goals per week for area chart
  const weeklyGoals = useMemo(() => {
    const weekMap: Record<number, { home: number; away: number; total: number }> = {};
    finishedMatches.forEach(m => {
      const w = m.week || 1;
      if (!weekMap[w]) weekMap[w] = { home: 0, away: 0, total: 0 };
      const hs = m.homeScore ?? 0;
      const as_ = m.awayScore ?? 0;
      weekMap[w].home += hs;
      weekMap[w].away += as_;
      weekMap[w].total += hs + as_;
    });
    return Object.entries(weekMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([week, data]) => ({ name: 'Java ' + week, 'Shtepi': data.home, 'Jashte': data.away, 'Total': data.total }));
  }, [finishedMatches]);

  // Scorers
  const scorers = getAggregatedScorers(selectedCompId !== 'all' ? selectedCompId : undefined).slice(0, 8);
  const scorerChartData = scorers.map(s => ({
    name: s.firstName.charAt(0) + '. ' + s.lastName,
    gola: s.goals,
    team: getTeamById(s.teamId)?.name || '',
  }));

  // Top teams by goals
  const teamGoals = useMemo(() => {
    const map: Record<string, { name: string; logo: string; goalsFor: number; goalsAgainst: number; played: number }> = {};
    finishedMatches.forEach(m => {
      const ht = getTeamById(m.homeTeamId);
      const at = getTeamById(m.awayTeamId);
      const hs = m.homeScore ?? 0;
      const as_ = m.awayScore ?? 0;
      if (ht) {
        if (!map[ht.id]) map[ht.id] = { name: ht.name, logo: ht.logo, goalsFor: 0, goalsAgainst: 0, played: 0 };
        map[ht.id].goalsFor += hs;
        map[ht.id].goalsAgainst += as_;
        map[ht.id].played++;
      }
      if (at) {
        if (!map[at.id]) map[at.id] = { name: at.name, logo: at.logo, goalsFor: 0, goalsAgainst: 0, played: 0 };
        map[at.id].goalsFor += as_;
        map[at.id].goalsAgainst += hs;
        map[at.id].played++;
      }
    });
    return Object.values(map).sort((a, b) => b.goalsFor - a.goalsFor).slice(0, 5);
  }, [finishedMatches, getTeamById]);

  // Match results distribution per week
  const weeklyResults = useMemo(() => {
    const weekMap: Record<number, { homeWins: number; awayWins: number; draws: number }> = {};
    finishedMatches.forEach(m => {
      const w = m.week || 1;
      if (!weekMap[w]) weekMap[w] = { homeWins: 0, awayWins: 0, draws: 0 };
      const hs = m.homeScore ?? 0;
      const as_ = m.awayScore ?? 0;
      if (hs > as_) weekMap[w].homeWins++;
      else if (as_ > hs) weekMap[w].awayWins++;
      else weekMap[w].draws++;
    });
    return Object.entries(weekMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([week, data]) => ({ name: 'J' + week, 'Shtepi': data.homeWins, 'Jashte': data.awayWins, 'Barazim': data.draws }));
  }, [finishedMatches]);

  const resultPieData = [
    { name: 'Fitore Shtepi', value: homeWins },
    { name: 'Fitore Jashte', value: awayWins },
    { name: 'Barazime', value: draws },
  ];
  const PIE_COLORS = ['#6366F1', '#F59E0B', '#94A3B8'];

  const card = (extra?: any) => Object.assign({}, { background: '#FFFFFF', borderRadius: '20px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)' }, extra || {});

  return (
    <div style={Object.assign({}, { overflowX: 'hidden' as const, minHeight: '100vh', background: '#F1F5F9', fontFamily: "'Inter', -apple-system, sans-serif" })}>
      <Header />
      <div style={Object.assign({}, { maxWidth: '1280px', margin: '0 auto', padding: '32px 24px' })}>

        {/* Title section */}
        <div style={Object.assign({}, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap' as const, gap: '12px' })}>
          <div>
            <h1 style={Object.assign({}, { fontSize: '28px', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.5px' })}>Statistikat</h1>
            <p style={Object.assign({}, { fontSize: '13px', color: '#94A3B8', margin: '4px 0 0 0' })}>Pasqyre e detajuar e te dhenave te sezonit</p>
          </div>
          <Link to="/head-to-head" style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#FFFFFF', borderRadius: '12px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)' })}>
             Head-to-Head
          </Link>
        </div>

        {/* Competition filter pills */}
        <div style={Object.assign({}, { display: 'flex', flexWrap: 'wrap' as const, gap: '8px', marginBottom: '28px' })}>
          <button
            onClick={() => setSelectedCompId('all')}
            style={Object.assign({}, {
              padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              background: selectedCompId === 'all' ? 'linear-gradient(135deg, #0F172A, #1E293B)' : '#FFFFFF',
              color: selectedCompId === 'all' ? '#FFFFFF' : '#64748B',
              boxShadow: selectedCompId === 'all' ? '0 4px 12px rgba(15, 23, 42, 0.2)' : '0 1px 3px rgba(0,0,0,0.06)'
            })}
          >Te Gjitha</button>
          {activeComps.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCompId(c.id)}
              style={Object.assign({}, {
                padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                background: selectedCompId === c.id ? 'linear-gradient(135deg, #6366F1, #8B5CF6)' : '#FFFFFF',
                color: selectedCompId === c.id ? '#FFFFFF' : '#64748B',
                boxShadow: selectedCompId === c.id ? '0 4px 12px rgba(99, 102, 241, 0.3)' : '0 1px 3px rgba(0,0,0,0.06)'
              })}
            >{c.name}</button>
          ))}
        </div>

        {protocolError && <p role="status" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Përditësimi i procesverbaleve nuk është i disponueshëm; statistikat mund të jenë të vjetruara.</p>}
        {/* Scorecard row - 6 cards */}
        <div style={Object.assign({}, { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '24px' })}>
          {[
            { label: 'Ndeshje', value: finishedMatches.length, icon: null, color: '#6366F1', bg: 'linear-gradient(135deg, #EEF2FF, #E0E7FF)', trend: liveMatches.length > 0 ? liveMatches.length + ' LIVE' : null, trendColor: '#22C55E' },
            { label: 'Gola Totale', value: totalGoals, icon: null, color: '#F59E0B', bg: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', trend: null },
            { label: 'Mesatare/Ndeshje', value: avgGoals, icon: null, color: '#22C55E', bg: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)', trend: null },
            { label: 'Skuadra', value: activeTeams.length, icon: null, color: '#8B5CF6', bg: 'linear-gradient(135deg, #F5F3FF, #EDE9FE)', trend: null },
            { label: 'Lojtare', value: activePlayers.length, icon: null, color: '#EC4899', bg: 'linear-gradient(135deg, #FDF2F8, #FCE7F3)', trend: null },
            { label: 'Rezultati me i larte', value: highestScore, icon: null, color: '#EF4444', bg: 'linear-gradient(135deg, #FEF2F2, #FEE2E2)', trend: null },
          ].map((s, i) => (
            <div key={i} style={card({ padding: '20px' })}>
              <div style={Object.assign({}, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' })}>
                <div style={Object.assign({}, { width: '40px', height: '40px', borderRadius: '12px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' })}>
                  
                </div>
                {s.trend && (
                  <span style={Object.assign({}, { fontSize: '10px', fontWeight: 700, color: s.trendColor, background: s.trendColor + '15', padding: '3px 8px', borderRadius: '6px' })}>{s.trend}</span>
                )}
              </div>
              <p style={Object.assign({}, { fontSize: '26px', fontWeight: 800, color: '#0F172A', margin: 0 })}>{s.value}</p>
              <p style={Object.assign({}, { fontSize: '11px', color: '#94A3B8', margin: '2px 0 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.5px', fontWeight: 500 })}>{s.label}</p>
            </div>
          ))}
        </div>

        <section style={card({ marginBottom: '20px' })} aria-label="Ngjarjet e regjistruara">
          <h2 style={{fontSize:16,fontWeight:700,margin:'0 0 8px'}}>Ngjarjet e regjistruara</h2>
          <p style={{fontSize:12,color:'#64748B',margin:'0 0 14px'}}>Vetëm të dhënat e regjistruara; faulle nga {eventTotals.withFouls} ndeshje, kartonë dhe time-out nga {eventTotals.withProtocol} procesverbale të publikuara.</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:12}}>{[['Faulle',eventTotals.fouls],['Kartonë të verdhë',eventTotals.yellow],['Kartonë të kuq',eventTotals.red],['Time-out',eventTotals.timeout]].map(([label,value])=><div key={label} style={{background:'#F8FAFC',borderRadius:10,padding:12}}><strong style={{display:'block',fontSize:20,color:'#0F172A'}}>{value}</strong><span style={{fontSize:12,color:'#475569'}}>{label}</span></div>)}</div>
        </section>
        {/* Row 2: Area chart + Results */}
        <div style={Object.assign({}, { display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '20px' })}>
          {/* Area chart - Goals per week */}
          <div style={card()}>
            <div style={Object.assign({}, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' })}>
              <div>
                <h3 style={Object.assign({}, { fontSize: '16px', fontWeight: 700, color: '#0F172A', margin: 0 })}>Gola per Jave</h3>
                <p style={Object.assign({}, { fontSize: '12px', color: '#94A3B8', margin: '2px 0 0 0' })}>Trendi i golave ne shtepi dhe jashte</p>
              </div>
              <div style={Object.assign({}, { display: 'flex', gap: '14px', fontSize: '11px' })}>
                <span style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '6px' })}><span style={Object.assign({}, { width: '10px', height: '10px', borderRadius: '3px', background: '#6366F1' })}></span>Shtepi</span>
                <span style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '6px' })}><span style={Object.assign({}, { width: '10px', height: '10px', borderRadius: '3px', background: '#F59E0B' })}></span>Jashte</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={weeklyGoals}>
                <defs>
                  <linearGradient id="gradHome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAway" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={Object.assign({}, { fontSize: 10, fill: '#94A3B8' })} axisLine={false} tickLine={false} />
                <YAxis tick={Object.assign({}, { fontSize: 10, fill: '#94A3B8' })} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={Object.assign({}, { borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: '12px' })} />
                <Area type="monotone" dataKey="Shtepi" stroke="#6366F1" strokeWidth={2.5} fill="url(#gradHome)" dot={Object.assign({}, { r: 4, fill: '#6366F1', strokeWidth: 2, stroke: '#FFFFFF' })} />
                <Area type="monotone" dataKey="Jashte" stroke="#F59E0B" strokeWidth={2.5} fill="url(#gradAway)" dot={Object.assign({}, { r: 4, fill: '#F59E0B', strokeWidth: 2, stroke: '#FFFFFF' })} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Results section */}
          <div style={Object.assign({}, { display: 'flex', flexDirection: 'column' as const, gap: '20px' })}>
            {/* Results donut */}
            <div style={card({ flex: 1 })}>
              <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0' })}>Shperndarja e Rezultateve</h3>
              <div style={Object.assign({}, { display: 'flex', alignItems: 'center' })}>
                <div style={Object.assign({}, { width: '50%', position: 'relative' as const })}>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={resultPieData} cx="50%" cy="50%" innerRadius={38} outerRadius={56} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>
                        {resultPieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={Object.assign({}, { position: 'absolute' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' as const })}>
                    <p style={Object.assign({}, { fontSize: '20px', fontWeight: 800, color: '#0F172A', margin: 0 })}>{finishedMatches.length}</p>
                    <p style={Object.assign({}, { fontSize: '8px', color: '#94A3B8', margin: 0, textTransform: 'uppercase' as const })}>Ndeshje</p>
                  </div>
                </div>
                <div style={Object.assign({}, { width: '50%' })}>
                  {[
                    { label: 'Fitore Shtepi', val: homeWins, pct: homeWinPct, color: '#6366F1' },
                    { label: 'Fitore Jashte', val: awayWins, pct: awayWinPct, color: '#F59E0B' },
                    { label: 'Barazime', val: draws, pct: drawPct, color: '#94A3B8' },
                  ].map((r, i) => (
                    <div key={i} style={Object.assign({}, { marginBottom: '8px' })}>
                      <div style={Object.assign({}, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' })}>
                        <div style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '6px' })}>
                          <span style={Object.assign({}, { width: '8px', height: '8px', borderRadius: '3px', background: r.color })}></span>
                          <span style={Object.assign({}, { color: '#64748B' })}>{r.label}</span>
                        </div>
                        <span style={Object.assign({}, { fontWeight: 700, color: '#0F172A' })}>{r.pct}%</span>
                      </div>
                      <div style={Object.assign({}, { height: '4px', background: '#F1F5F9', borderRadius: '2px', overflow: 'hidden' })}>
                        <div style={Object.assign({}, { height: '100%', width: r.pct + '%', background: r.color, borderRadius: '2px', transition: 'width 0.8s ease' })}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick comparison */}
            <div style={card({ flex: 1, display: 'flex', flexDirection: 'column' as const })}>
              <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 12px 0' })}>Krahasim i Shpejte</h3>
              {[
                { label: 'Gola Shtepi', value: finishedMatches.reduce((s, m) => s + (m.homeScore ?? 0), 0), icon: null, color: '#6366F1' },
                { label: 'Gola Jashte', value: finishedMatches.reduce((s, m) => s + (m.awayScore ?? 0), 0), icon: null, color: '#F59E0B' },
                { label: 'Mesatare Golave', value: avgGoals, icon: null, color: '#22C55E' },
              ].map((item, i) => (
                <div key={i} style={Object.assign({}, { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid #F1F5F9' : 'none' })}>
                  <div style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '8px' })}>
                    
                    <span style={Object.assign({}, { fontSize: '12px', color: '#64748B' })}>{item.label}</span>
                  </div>
                  <span style={Object.assign({}, { fontSize: '15px', fontWeight: 700, color: item.color })}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 3: Top scorers + Top teams + Weekly results */}
        <div style={Object.assign({}, { display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '20px' })}>
          {/* Top scorers horizontal bar */}
          <div style={card()}>
            <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' })}>
              
              Golashenuesit Kryesore
            </h3>
            {scorerChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={scorerChartData} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={Object.assign({}, { fontSize: 10, fill: '#94A3B8' })} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={75} tick={Object.assign({}, { fontSize: 11, fill: '#64748B' })} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={Object.assign({}, { borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' })} />
                  <Bar dataKey="gola" fill="#6366F1" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={Object.assign({}, { color: '#94A3B8', textAlign: 'center' as const, padding: '40px 0', fontSize: '13px' })}>Ska te dhena</p>
            )}
          </div>

          {/* Top teams by goals */}
          <div style={card()}>
            <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' })}>
              
              Skuadrat me shume Gola
            </h3>
            {teamGoals.length === 0 ? (
              <p style={Object.assign({}, { color: '#94A3B8', textAlign: 'center' as const, padding: '40px 0', fontSize: '13px' })}>Ska te dhena</p>
            ) : teamGoals.map((t, i) => (
              <div key={i} style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: i < teamGoals.length - 1 ? '1px solid #F1F5F9' : 'none' })}>
                <span style={Object.assign({}, { width: '22px', height: '22px', borderRadius: '7px', background: i === 0 ? '#FEF3C7' : i === 1 ? '#F1F5F9' : i === 2 ? '#FEF2F2' : '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800, color: i === 0 ? '#D97706' : '#64748B' })}>{i + 1}</span>
                <div style={Object.assign({}, { width: '30px', height: '30px', borderRadius: '8px', overflow: 'hidden', background: '#F1F5F9', flexShrink: 0 })}>
                  {t.logo ? <img src={t.logo} alt="" style={Object.assign({}, { width: '100%', height: '100%', objectFit: 'cover' })} /> : <span style={Object.assign({}, { display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#94A3B8' })}>{t.name.charAt(0)}</span>}
                </div>
                <div style={Object.assign({}, { flex: 1 })}>
                  <p style={Object.assign({}, { fontSize: '12px', fontWeight: 600, color: '#0F172A', margin: 0 })}>{t.name}</p>
                  <p style={Object.assign({}, { fontSize: '10px', color: '#94A3B8', margin: 0 })}>{t.played} ndeshje</p>
                </div>
                <div style={Object.assign({}, { textAlign: 'right' as const })}>
                  <p style={Object.assign({}, { fontSize: '16px', fontWeight: 800, color: '#6366F1', margin: 0 })}>{t.goalsFor}</p>
                  <p style={Object.assign({}, { fontSize: '9px', color: '#94A3B8', margin: 0 })}>gola</p>
                </div>
              </div>
            ))}
          </div>

          {/* Weekly results stacked */}
          <div style={card()}>
            <h3 style={Object.assign({}, { fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: '0 0 16px 0' })}>
              
              Rezultatet per Jave
            </h3>
            {weeklyResults.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyResults} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={Object.assign({}, { fontSize: 10, fill: '#94A3B8' })} axisLine={false} tickLine={false} />
                  <YAxis tick={Object.assign({}, { fontSize: 10, fill: '#94A3B8' })} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={Object.assign({}, { borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '12px' })} />
                  <Bar dataKey="Shtepi" stackId="a" fill="#6366F1" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="Jashte" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="Barazim" stackId="a" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={Object.assign({}, { color: '#94A3B8', textAlign: 'center' as const, padding: '40px 0', fontSize: '13px' })}>Ska te dhena</p>
            )}
            <div style={Object.assign({}, { display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '12px', fontSize: '10px' })}>
              <span style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '4px' })}><span style={Object.assign({}, { width: '8px', height: '8px', borderRadius: '2px', background: '#6366F1' })}></span>Shtepi</span>
              <span style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '4px' })}><span style={Object.assign({}, { width: '8px', height: '8px', borderRadius: '2px', background: '#F59E0B' })}></span>Jashte</span>
              <span style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '4px' })}><span style={Object.assign({}, { width: '8px', height: '8px', borderRadius: '2px', background: '#CBD5E1' })}></span>Barazim</span>
            </div>
          </div>
        </div>

        {/* Sulmi/Mbrojtja me e mire per liga */}
        <div style={Object.assign({}, { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginBottom: "20px" })}>
          {activeComps.filter(c => c.type !== "kupa").map(comp => {
            const cm = matches.filter(m => m.competitionId === comp.id && m.status === "finished" && hasResult(m) && (activeSeason ? m.seasonId === activeSeason.id : true));
            const ct = teams.filter(t => t.competitionId === comp.id);
            const stats: Record<string, { name: string; logo: string; gf: number; ga: number; played: number }> = {};
            ct.forEach(t => { stats[t.id] = { name: t.name, logo: t.logo, gf: 0, ga: 0, played: 0 }; });
            cm.forEach(m => {
              const hs = m.homeScore ?? 0; const as_ = m.awayScore ?? 0;
              if (stats[m.homeTeamId]) { stats[m.homeTeamId].gf += hs; stats[m.homeTeamId].ga += as_; stats[m.homeTeamId].played++; }
              if (stats[m.awayTeamId]) { stats[m.awayTeamId].gf += as_; stats[m.awayTeamId].ga += hs; stats[m.awayTeamId].played++; }
            });
            const arr = Object.values(stats).filter(x => x.played > 0);
            const bestAtk = arr.slice().sort((a, b) => b.gf - a.gf)[0];
            const bestDef = arr.slice().sort((a, b) => a.ga - b.ga)[0];
            return (
              <div key={comp.id} style={card()}>
                <h3 style={Object.assign({}, { fontSize: "14px", fontWeight: 700, color: "#0F172A", margin: "0 0 12px 0" })}>{comp.name}</h3>
                <div style={Object.assign({}, { display: "grid", gridTemplateColumns: '1fr', gap: '10px' })}>
                  <div style={Object.assign({}, { padding: "12px", background: "linear-gradient(135deg, #FEF3C7, #FDE68A)", borderRadius: "12px" })}>
                    <p style={Object.assign({}, { fontSize: "10px", color: "#92400E", textTransform: "uppercase" as const, letterSpacing: "0.5px", fontWeight: 700, margin: 0 })}>Sulmi me i mire</p>
                    {bestAtk ? (<><p style={Object.assign({}, { fontSize: "13px", fontWeight: 700, color: "#0F172A", margin: "6px 0 2px 0" })}>{bestAtk.name}</p><p style={Object.assign({}, { fontSize: "18px", fontWeight: 800, color: "#D97706", margin: 0 })}>{bestAtk.gf} <span style={Object.assign({}, { fontSize: "10px", fontWeight: 500, color: "#92400E" })}>gola</span></p></>) : <p style={Object.assign({}, { fontSize: "12px", color: "#92400E", margin: "6px 0 0 0" })}>Ska te dhena</p>}
                  </div>
                  <div style={Object.assign({}, { padding: "12px", background: "linear-gradient(135deg, #DBEAFE, #BFDBFE)", borderRadius: "12px" })}>
                    <p style={Object.assign({}, { fontSize: "10px", color: "#1E40AF", textTransform: "uppercase" as const, letterSpacing: "0.5px", fontWeight: 700, margin: 0 })}>Mbrojtja me e mire</p>
                    {bestDef ? (<><p style={Object.assign({}, { fontSize: "13px", fontWeight: 700, color: "#0F172A", margin: "6px 0 2px 0" })}>{bestDef.name}</p><p style={Object.assign({}, { fontSize: "18px", fontWeight: 800, color: "#2563EB", margin: 0 })}>{bestDef.ga} <span style={Object.assign({}, { fontSize: "10px", fontWeight: 500, color: "#1E40AF" })}>gola te pranuara</span></p></>) : <p style={Object.assign({}, { fontSize: "12px", color: "#1E40AF", margin: "6px 0 0 0" })}>Ska te dhena</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Head to Head CTA */}
        <div style={Object.assign({}, card({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)' }))}>
          <div>
            <h3 style={Object.assign({}, { fontSize: '18px', fontWeight: 700, color: '#FFFFFF', margin: 0 })}>Krahasimi Head-to-Head</h3>
            <p style={Object.assign({}, { fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0' })}>Krahaso dy skuadra dhe shiko statistikat e ndeshjeve direkte</p>
          </div>
          <Link to="/head-to-head" style={Object.assign({}, { display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 24px', background: 'linear-gradient(135deg, #6366F1, #8B5CF6)', color: '#FFFFFF', borderRadius: '12px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)' })}>
            Krahaso ↗
          </Link>
        </div>
      </div>
      <PlayerStatsSection />
      <Footer />
    </div>
  );
};

export default StatistikatPage;