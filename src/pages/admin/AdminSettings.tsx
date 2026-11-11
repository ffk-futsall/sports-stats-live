import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import AdminNewSeasonWizard from './AdminNewSeasonWizard';
import { Trash2, Pencil } from 'lucide-react';

const AdminSettings: React.FC = () => {
  const {
    seasons, competitions, users, settings,
    addSeason, updateSeason, deleteSeason,
    addCompetition, updateCompetition, deleteCompetition,
    addUser, deleteUser, updateSettings,
    teams, players, scorers, addTeam, addPlayer, addScorer, getActiveSeason
  } = useData();
  const { isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('seasons');

  const [showSeasonForm, setShowSeasonForm] = useState(false);
  const [seasonForm, setSeasonForm] = useState({ name: '', startDate: '', endDate: '', isActive: false });
  const [editSeasonId, setEditSeasonId] = useState<string | null>(null);

  const [showCompForm, setShowCompForm] = useState(false);
  const [compForm, setCompForm] = useState({ name: '', type: 'superliga' as 'superliga' | 'liga_pare' | 'kupa', seasonId: '', isActiveLanding: true });

  const [showEditorForm, setShowEditorForm] = useState(false);
  const [editorForm, setEditorForm] = useState({ username: '', password: '' });

  // Migration tool state
  const [copyFrom, setCopyFrom] = useState('');
  const [copyTo, setCopyTo] = useState('');
  const [copyTeams, setCopyTeams] = useState(true);
  const [copyPlayers, setCopyPlayers] = useState(false);
  const [copyScorers, setCopyScorers] = useState(false);
  const [copyComps, setCopyComps] = useState(false);
  const [migrationResult, setMigrationResult] = useState<string | null>(null);

  // New Season Wizard
  const [showWizard, setShowWizard] = useState(false);

  const activeSeason = getActiveSeason();

  const handleAddSeason = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonForm.name) return null;
    if (editSeasonId) {
      updateSeason({ id: editSeasonId, ...seasonForm });
    } else {
      addSeason(seasonForm);
    }
    setSeasonForm({ name: '', startDate: '', endDate: '', isActive: false });
    setShowSeasonForm(false);
    setEditSeasonId(null);
  };

  const handleAddComp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!compForm.name || !compForm.seasonId) return null;
    addCompetition(compForm);
    setCompForm({ name: '', type: 'superliga', seasonId: activeSeason?.id || '', isActiveLanding: true });
    setShowCompForm(false);
  };

  const handleAddEditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editorForm.username || !editorForm.password) return null;
    addUser({ ...editorForm, role: 'editor' });
    setEditorForm({ username: '', password: '' });
    setShowEditorForm(false);
  };

  const handleMigration = () => {
    if (!copyFrom || !copyTo) return null;
    let copiedTeams = 0, copiedPlayers = 0, copiedScorersCount = 0, copiedComps = 0;

    const sourceComps = competitions.filter(c => c.seasonId === copyFrom);
    const targetComps = competitions.filter(c => c.seasonId === copyTo);

    // Copy competitions if selected
    if (copyComps) {
      sourceComps.forEach(c => {
        const exists = targetComps.find(tc => tc.type === c.type);
        if (!exists) {
          addCompetition({
            name: c.name,
            type: c.type,
            seasonId: copyTo,
            isActiveLanding: c.isActiveLanding,
          });
          copiedComps++;
        }
      });
    }

    // Copy teams
    if (copyTeams) {
      const sourceTeams = teams.filter(t => t.seasonId === copyFrom);
      const updatedTargetComps = [...targetComps];
      
      sourceTeams.forEach(t => {
        const sourceComp = sourceComps.find(c => c.id === t.competitionId);
        const targetComp = (copyComps ? competitions : targetComps).find(c => sourceComp && c.type === sourceComp.type && c.seasonId === copyTo)
          || updatedTargetComps.find(c => sourceComp && c.type === sourceComp.type);
        
        if (targetComp) {
          addTeam({
            name: t.name,
            logo: t.logo,
            competitionId: targetComp.id,
            seasonId: copyTo,
            foundedYear: t.foundedYear,
            stadium: t.stadium,
          });
          copiedTeams++;

          // Copy players for this team
          if (copyPlayers) {
            const teamPlayers = players.filter(p => p.teamId === t.id);
            teamPlayers.forEach(p => {
              addPlayer({
                firstName: p.firstName,
                lastName: p.lastName,
                photo: p.photo,
                birthDate: p.birthDate,
                position: p.position,
                teamId: t.id, // Will need mapping in practice
                seasonId: copyTo,
              });
              copiedPlayers++;
            });
          }
        }
      });
    }

    // Copy scorers
    if (copyScorers) {
      const sourceScorers = scorers.filter(s => s.seasonId === copyFrom && s.isManual);
      sourceScorers.forEach(s => {
        addScorer({
          firstName: s.firstName,
          lastName: s.lastName,
          photo: s.photo,
          teamId: s.teamId,
          competitionId: s.competitionId,
          seasonId: copyTo,
          goals: 0,
          isManual: true,
        });
        copiedScorersCount++;
      });
    }

    setMigrationResult(
      `U kopjuan: ${copiedComps} kompeticione, ${copiedTeams} skuadra, ${copiedPlayers} lojtarë, ${copiedScorersCount} golashënues`
    );
  };

  const sections = [
    { key: 'seasons', label: 'Sezonet' },
    { key: 'competitions', label: 'Kompeticionet' },
    { key: 'general', label: 'Përgjithshme' },
    { key: 'header', label: 'Header' },
    { key: 'suspensions', label: 'Kartona & Pezullime' },
    { key: 'migration', label: 'Migracioni' },
    { key: 'wizard', label: 'Sezon i Ri' },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-4">Cilësimet</h2>

      <div className="flex gap-2 mb-6 flex-wrap">
        {sections.map(s => (
          <button
            key={s.key}
            onClick={() => { setActiveSection(s.key); if (s.key === 'wizard') setShowWizard(true); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeSection === s.key ? 'bg-[#0f1830] text-white' : 
              s.key === 'wizard' ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' :
              'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {null}
            {s.label}
          </button>
        ))}
      </div>

      {/* New Season Wizard */}
      {activeSection === 'wizard' && showWizard && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <AdminNewSeasonWizard onClose={() => { setShowWizard(false); setActiveSection('seasons'); }} />
        </div>
      )}

      {activeSection === 'seasons' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Sezonet</h3>
            <div className="flex gap-2">
              <button onClick={() => { setShowWizard(true); setActiveSection('wizard'); }} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                 Wizard
              </button>
              <button onClick={() => { setSeasonForm({ name: '', startDate: '', endDate: '', isActive: false }); setEditSeasonId(null); setShowSeasonForm(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-[#0f1830] text-white rounded-lg text-sm hover:bg-[#1c3570]">
                + Shto Sezon
              </button>
            </div>
          </div>
          {showSeasonForm && (
            <form onSubmit={handleAddSeason} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Emri *</label>
                <input value={seasonForm.name} onChange={e => setSeasonForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="2025/2026" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fillimi</label>
                <input type="date" value={seasonForm.startDate} onChange={e => setSeasonForm(p => ({ ...p, startDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mbarimi</label>
                <input type="date" value={seasonForm.endDate} onChange={e => setSeasonForm(p => ({ ...p, endDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={seasonForm.isActive} onChange={e => setSeasonForm(p => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm">Aktiv</span>
              </label>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm hover:bg-[#1c3570]">{editSeasonId ? 'Ruaj' : 'Shto'}</button>
                <button type="button" onClick={() => { setShowSeasonForm(false); setEditSeasonId(null); }} className="text-gray-400 hover:text-gray-600">S"</button>
              </div>
            </form>
          )}
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {seasons.length === 0 ? (
              <p className="text-gray-500 text-center py-6 text-sm">Nuk ka sezone. Shto një sezon për të filluar.</p>
            ) : (
              seasons.map(s => (
                <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div>
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    {s.isActive && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Aktiv</span>}
                    {s.startDate && <span className="text-xs text-gray-400 ml-2">{s.startDate} - {s.endDate}</span>}
                    <span className="text-xs text-gray-400 ml-2">
                      ({teams.filter(t => t.seasonId === s.id).length} skuadra, {competitions.filter(c => c.seasonId === s.id).length} komp.)
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {!s.isActive && (
                      <button onClick={() => updateSeason({ ...s, isActive: true })} className="px-2 py-1 text-xs bg-green-50 text-green-700 rounded hover:bg-green-100">Aktivizo</button>
                    )}
                    <button onClick={() => { setSeasonForm({ name: s.name, startDate: s.startDate, endDate: s.endDate, isActive: s.isActive }); setEditSeasonId(s.id); setShowSeasonForm(true); }} className="p-1.5 text-gray-400 hover:text-[#0f1830]"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm('Fshi sezonin?')) deleteSeason(s.id); }} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeSection === 'competitions' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Kompeticionet</h3>
            <button onClick={() => { setCompForm(p => ({ ...p, seasonId: activeSeason?.id || '' })); setShowCompForm(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-[#0f1830] text-white rounded-lg text-sm hover:bg-[#1c3570]">
              + Shto
            </button>
          </div>
          {showCompForm && (
            <form onSubmit={handleAddComp} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Emri *</label>
                <input value={compForm.name} onChange={e => setCompForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lloji *</label>
                <select value={compForm.type} onChange={e => setCompForm(p => ({ ...p, type: e.target.value as any }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="superliga">Superliga</option>
                  <option value="liga_pare">Liga e Parë</option>
                  <option value="kupa">Kupa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sezoni *</label>
                <select value={compForm.seasonId} onChange={e => setCompForm(p => ({ ...p, seasonId: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" required>
                  <option value="">Zgjedh...</option>
                  {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input type="checkbox" checked={compForm.isActiveLanding} onChange={e => setCompForm(p => ({ ...p, isActiveLanding: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-xs">Landing Page</span>
              </label>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm hover:bg-[#1c3570]">Shto</button>
                <button type="button" onClick={() => setShowCompForm(false)} className="text-gray-400">S"</button>
              </div>
            </form>
          )}
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {competitions.length === 0 ? (
              <p className="text-gray-500 text-center py-6 text-sm">Nuk ka kompeticione.</p>
            ) : (
              competitions.map(c => {
                const season = seasons.find(s => s.id === c.seasonId);
                return (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div>
                      <span className="text-sm font-medium text-gray-800">{c.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{season?.name || ''}</span>
                      {c.isActiveLanding && <span className="ml-2 text-xs bg-[#0f1830]/10 text-[#0f1830] px-2 py-0.5 rounded-full">Landing</span>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => updateCompetition({ ...c, isActiveLanding: !c.isActiveLanding })} className={`px-2 py-1 text-xs rounded ${c.isActiveLanding ? 'bg-[#0f1830]/10 text-[#0f1830]' : 'bg-gray-50 text-gray-500'}`}>
                        {c.isActiveLanding ? 'Fshih nga LP' : 'Shfaq në LP'}
                      </button>
                      <button onClick={() => { if (confirm('Fshi kompeticionin?')) deleteCompetition(c.id); }} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeSection === 'editors' && isAdmin && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700">Editorët</h3>
            <button onClick={() => setShowEditorForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-[#0f1830] text-white rounded-lg text-sm hover:bg-[#1c3570]">
              + Shto Editor
            </button>
          </div>
          {showEditorForm && (
            <form onSubmit={handleAddEditor} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Username *</label>
                <input value={editorForm.username} onChange={e => setEditorForm(p => ({ ...p, username: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
                <input type="password" value={editorForm.password} onChange={e => setEditorForm(p => ({ ...p, password: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm hover:bg-[#1c3570]">Shto</button>
                <button type="button" onClick={() => setShowEditorForm(false)} className="text-gray-400">S"</button>
              </div>
            </form>
          )}
          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {users.filter(u => u.role === 'editor').length === 0 ? (
              <p className="text-gray-500 text-center py-6 text-sm">Nuk ka editorë.</p>
            ) : (
              users.filter(u => u.role === 'editor').map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <span className="text-sm font-medium text-gray-800">{u.username} <span className="text-xs text-gray-400">(editor)</span></span>
                  <button onClick={() => { if (confirm('Fshi editorin?')) deleteUser(u.id); }} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeSection === 'general' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-4">Cilësimet e Përgjithshme</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Emri i Aplikacionit</label>
              <input value={settings.appName} onChange={e => updateSettings({ ...settings, appName: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kontakti</label>
              <input value={settings.contact} onChange={e => updateSettings({ ...settings, contact: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Numri WhatsApp (me +383)</label>
              <input value={(settings as any).whatsappNumber || ''} onChange={e => updateSettings({ ...settings, whatsappNumber: e.target.value } as any)} placeholder="+38345278279" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
        </div>
      )}

      {activeSection === 'header' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-2">Faqet ne Header</h3>
          <p className="text-sm text-gray-500 mb-4">Zgjidh cilat faqe te shfaqen ne menyne e navigimit (header).</p>
          <div className="space-y-2">
            {[
              { path: '/', label: 'Ballina' },
              { path: '/live', label: 'Live' },
              { path: '/superliga', label: 'Superliga' },
              { path: '/liga-pare', label: 'Liga e Pare' },
              { path: '/kupa', label: 'Kupa e Kosoves' },
              { path: '/lojtari-javes', label: 'Lojtari i Javes' },
              { path: '/statistikat', label: 'Statistikat' },
              { path: '/komisioni', label: 'Komisioni' },
              { path: '/aktet-normative', label: 'Aktet Normative' },
              { path: '/kombetarja', label: 'Kombetarja' },
              { path: '/playoff', label: 'PlayOff' },
            ].map(link => {
              const hidden = ((settings as any)?.hiddenNavPaths || []).includes(link.path);
              return (
                <label key={link.path} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <input
                    type="checkbox"
                    checked={!hidden}
                    onChange={e => {
                      const current: string[] = (settings as any)?.hiddenNavPaths || [];
                      const updated = e.target.checked
                        ? current.filter(p => p !== link.path)
                        : [...current, link.path];
                      updateSettings({ ...settings, hiddenNavPaths: updated } as any);
                    }}
                    className="w-4 h-4 rounded text-[#0f1830]"
                  />
                  <span className="text-sm font-medium text-gray-800">{link.label}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {activeSection === 'suspensions' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-700 mb-2">Rregullat e Kartonave & Pezullimeve</h3>
          <p className="text-sm text-gray-500 mb-4">
            Kto rregulla perdoren per te llogaritur automatikisht statusin AVAILABLE / SUSPENDED
            te lojtareve ne baz te kartonave te akumuluara (Statistikat Individuale, Profili i Skuadres).
            Nuk jane hard-coded ne kod  mund t'i ndryshosh kurdo qe deshiron.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prag i kartonave te verdha</label>
              <input
                type="number"
                min={1}
                value={(settings as any)?.suspensionRules?.yellowThreshold ?? 3}
                onChange={e => updateSettings({
                  ...settings,
                  suspensionRules: {
                    yellowThreshold: parseInt(e.target.value) || 1,
                    yellowSuspensionMatches: (settings as any)?.suspensionRules?.yellowSuspensionMatches ?? 1,
                    redSuspensionMatches: (settings as any)?.suspensionRules?.redSuspensionMatches ?? 1,
                  },
                } as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ndeshje pezullim (per te verdha)</label>
              <input
                type="number"
                min={1}
                value={(settings as any)?.suspensionRules?.yellowSuspensionMatches ?? 1}
                onChange={e => updateSettings({
                  ...settings,
                  suspensionRules: {
                    yellowThreshold: (settings as any)?.suspensionRules?.yellowThreshold ?? 3,
                    yellowSuspensionMatches: parseInt(e.target.value) || 1,
                    redSuspensionMatches: (settings as any)?.suspensionRules?.redSuspensionMatches ?? 1,
                  },
                } as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ndeshje pezullim (per te kuq)</label>
              <input
                type="number"
                min={1}
                value={(settings as any)?.suspensionRules?.redSuspensionMatches ?? 1}
                onChange={e => updateSettings({
                  ...settings,
                  suspensionRules: {
                    yellowThreshold: (settings as any)?.suspensionRules?.yellowThreshold ?? 3,
                    yellowSuspensionMatches: (settings as any)?.suspensionRules?.yellowSuspensionMatches ?? 1,
                    redSuspensionMatches: parseInt(e.target.value) || 1,
                  },
                } as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {activeSection === 'migration' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-700 mb-2">Migracioni i të Dhënave</h3>
            <p className="text-sm text-gray-500 mb-4">
              Kopjo të dhëna nga një sezon në tjetrin. Zgjedh çfarë dëshiron të kopjosh.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sezoni Burim</label>
                <select value={copyFrom} onChange={e => { setCopyFrom(e.target.value); setMigrationResult(null); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="">Zgjedh...</option>
                  {seasons.map(s => <option key={s.id} value={s.id}>{s.name} {s.isActive ? '(Aktiv)' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sezoni Destinacion</label>
                <select value={copyTo} onChange={e => { setCopyTo(e.target.value); setMigrationResult(null); }} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                  <option value="">Zgjedh...</option>
                  {seasons.filter(s => s.id !== copyFrom).map(s => <option key={s.id} value={s.id}>{s.name} {s.isActive ? '(Aktiv)' : ''}</option>)}
                </select>
              </div>
            </div>

            {copyFrom && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                <p className="font-medium mb-1">Sezoni burim përmban:</p>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span>{competitions.filter(c => c.seasonId === copyFrom).length} kompeticione</span>
                  <span>{teams.filter(t => t.seasonId === copyFrom).length} skuadra</span>
                  <span>{players.filter(p => p.seasonId === copyFrom).length} lojtarë</span>
                  <span>{scorers.filter(s => s.seasonId === copyFrom).length} golashënues</span>
                </div>
              </div>
            )}

            <div className="space-y-2 mb-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">!farë të kopjohet:</p>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" checked={copyComps} onChange={e => setCopyComps(e.target.checked)} className="w-4 h-4 rounded text-[#0f1830]" />
                <div>
                  <span className="text-sm font-medium text-gray-800">Kompeticionet</span>
                  <p className="text-xs text-gray-500">Kopjo strukturën e kompeticioneve (Superliga, Liga e Parë, Kupa)</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" checked={copyTeams} onChange={e => setCopyTeams(e.target.checked)} className="w-4 h-4 rounded text-[#0f1830]" />
                <div>
                  <span className="text-sm font-medium text-gray-800">Skuadrat</span>
                  <p className="text-xs text-gray-500">Kopjo skuadrat me logot dhe informacionet</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" checked={copyPlayers} onChange={e => setCopyPlayers(e.target.checked)} className="w-4 h-4 rounded text-[#0f1830]" disabled={!copyTeams} />
                <div>
                  <span className={`text-sm font-medium ${!copyTeams ? 'text-gray-400' : 'text-gray-800'}`}>Lojtarët</span>
                  <p className="text-xs text-gray-500">Kopjo rostat e lojtarëve (kërkon kopjimin e skuadrave)</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" checked={copyScorers} onChange={e => setCopyScorers(e.target.checked)} className="w-4 h-4 rounded text-[#0f1830]" />
                <div>
                  <span className="text-sm font-medium text-gray-800">Golashënuesit (manual)</span>
                  <p className="text-xs text-gray-500">Kopjo golashënuesit manual me 0 gola</p>
                </div>
              </label>
            </div>

            <button
              onClick={handleMigration}
              disabled={!copyFrom || !copyTo || (!copyTeams && !copyComps && !copyScorers)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#0f1830] text-white rounded-xl text-sm font-medium hover:bg-[#1c3570] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
               Ekzekuto Migracionin
            </button>

            {migrationResult && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                {migrationResult}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSettings;

