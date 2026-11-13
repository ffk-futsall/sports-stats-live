import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { uploadPlayerPhoto } from '@/lib/supabase-db';
import { v4 as uuidv4 } from 'uuid';
import { Pencil, Trash2 } from 'lucide-react';

const AdminScorers: React.FC = () => {
  const { scorers, teams, competitions, getActiveSeason, addScorer, updateScorer, deleteScorer, getAggregatedScorers, getTeamById } = useData();
  const activeSeason = getActiveSeason();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filterComp, setFilterComp] = useState<string>('all');
  const [form, setForm] = useState({ firstName: '', lastName: '', photo: '', teamId: '', competitionId: '', goals: 1 });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const activeComps = competitions.filter(c => activeSeason ? c.seasonId === activeSeason.id : true);
  const activeTeams = teams.filter(t => activeSeason ? t.seasonId === activeSeason.id : true);

  const aggregated = getAggregatedScorers(filterComp !== 'all' ? filterComp : undefined);

  const resetForm = () => {
    setForm({ firstName: '', lastName: '', photo: '', teamId: '', competitionId: activeComps[0]?.id || '', goals: 1 });
    setEditId(null);
    setShowForm(false);
    setPhotoFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.teamId || !form.competitionId) return null;

    const scorerId = editId || uuidv4();
    let photoUrl = form.photo;

    if (photoFile) {
      photoUrl = await uploadPlayerPhoto(photoFile, `scorer_${scorerId}`);
    }

    if (editId) {
      updateScorer({ id: editId, ...form, photo: photoUrl, seasonId: activeSeason?.id || '', isManual: true });
    } else {
      addScorer({ ...form, photo: photoUrl, seasonId: activeSeason?.id || '', isManual: true });
    }
    setForm(prev => ({ ...prev, firstName: '', lastName: '', photo: '', goals: 1 }));
    setEditId(null);
    setPhotoFile(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return null;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setForm(prev => ({ ...prev, photo: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  const handleEditScorer = (s: typeof scorers[0]) => {
    setForm({ firstName: s.firstName, lastName: s.lastName, photo: s.photo, teamId: s.teamId, competitionId: s.competitionId, goals: s.goals });
    setEditId(s.id);
    setShowForm(true);
    setPhotoFile(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Golashënuesit</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm font-medium hover:bg-[#1c3570]">
          + Shto Golashënues
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <select value={filterComp} onChange={e => setFilterComp(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">Të gjitha</option>
          {activeComps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">{editId ? 'Edito' : 'Shto Golashënues Manual'}</h3>
            <button aria-label="Mbyll" onClick={resetForm} className="text-gray-400 hover:text-gray-600">×</button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Emri *</label>
              <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mbiemri *</label>
              <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Skuadra *</label>
              <select value={form.teamId} onChange={e => setForm(p => ({ ...p, teamId: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" required>
                <option value="">Zgjedh...</option>
                {activeTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kompeticioni *</label>
              <select value={form.competitionId} onChange={e => setForm(p => ({ ...p, competitionId: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" required>
                <option value="">Zgjedh...</option>
                {activeComps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Gjithsej Golat *</label>
              <input type="number" min="1" value={form.goals} onChange={e => setForm(p => ({ ...p, goals: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Foto</label>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
              {form.photo && <img src={form.photo} alt="preview" className="w-8 h-8 mt-1 rounded-full object-cover" />}
            </div>
            <div className="flex items-end">
              <button type="submit" className="px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm font-medium hover:bg-[#1c3570]">
                {editId ? 'Ruaj' : 'Shto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Aggregated List */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-[40px_48px_1fr_auto_60px] gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
          <span>#</span><span></span><span>Lojtari</span><span>Skuadra</span><span className="text-right">Gola</span>
        </div>
        {aggregated.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">Nuk ka golashënues.</p>
        ) : (
          aggregated.map((s, i) => {
            const team = getTeamById(s.teamId);
            const manualScorer = scorers.find(sc => sc.id === s.id && sc.isManual);
            return (
              <div key={s.id} className="grid grid-cols-[40px_48px_1fr_auto_60px] gap-3 px-4 py-3 items-center border-t border-gray-50 hover:bg-gray-50 group">
                <span className={`text-sm font-bold ${i < 3 ? 'text-[#0f1830]' : 'text-gray-400'}`}>{i + 1}</span>
                <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden">
                  {s.photo ? <img src={s.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">{s.firstName.charAt(0)}{s.lastName.charAt(0)}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{s.firstName} {s.lastName}</span>
                  {manualScorer && (
                    <div className="hidden group-hover:flex gap-1">
                      <button onClick={() => handleEditScorer(manualScorer)} className="text-gray-400 hover:text-[#0f1830]"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => { if (confirm('Fshi?')) deleteScorer(manualScorer.id); }} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {team?.logo && <img src={team.logo} alt="" className="w-5 h-5 rounded-full" />}
                  <span className="text-xs text-gray-500 hidden sm:inline">{team?.name || '-'}</span>
                </div>
                <span className="text-right text-sm font-bold text-[#0f1830]">{s.goals}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AdminScorers;
