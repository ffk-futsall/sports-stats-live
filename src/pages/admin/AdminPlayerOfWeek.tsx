import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { uploadPlayerPhoto } from '@/lib/supabase-db';
import { v4 as uuidv4 } from 'uuid';
import { Pencil, Trash2 } from 'lucide-react';

const AdminPlayerOfWeek: React.FC = () => {
  const { playersOfWeek, teams, getActiveSeason, addPlayerOfWeek, updatePlayerOfWeek, deletePlayerOfWeek, getTeamById } = useData();
  const activeSeason = getActiveSeason();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', photo: '', teamId: '', week: 1, isScorer: false, goalsCount: 0 });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const activeTeams = teams.filter(t => activeSeason ? t.seasonId === activeSeason.id : true);
  const filtered = playersOfWeek.filter(p => activeSeason ? p.seasonId === activeSeason.id : true).sort((a, b) => b.week - a.week);

  const resetForm = () => {
    setForm({ firstName: '', lastName: '', photo: '', teamId: '', week: 1, isScorer: false, goalsCount: 0 });
    setEditId(null);
    setShowForm(false);
    setPhotoFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.teamId) return null;
    const powId = editId || uuidv4();
    let photoUrl = form.photo;
    if (photoFile) {
      photoUrl = await uploadPlayerPhoto(photoFile, `pow_${powId}`);
    }
    if (editId) {
      updatePlayerOfWeek({ id: editId, ...form, photo: photoUrl, seasonId: activeSeason?.id || '' });
    } else {
      addPlayerOfWeek({ ...form, photo: photoUrl, seasonId: activeSeason?.id || '' });
    }
    resetForm();
  };

  const handleEdit = (p: typeof playersOfWeek[0]) => {
    setForm({ firstName: p.firstName, lastName: p.lastName, photo: p.photo, teamId: p.teamId, week: p.week, isScorer: p.isScorer, goalsCount: p.goalsCount });
    setEditId(p.id);
    setShowForm(true);
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

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Lojtari i Javës</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm font-medium hover:bg-[#1c3570]">
          + Shto Lojtarin e Javës
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">{editId ? 'Edito' : 'Shto Lojtarin e Javës'}</h3>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Java *</label>
              <input type="number" min="1" value={form.week} onChange={e => setForm(p => ({ ...p, week: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Foto</label>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
              {form.photo && <img src={form.photo} alt="preview" className="w-8 h-8 mt-1 rounded-full object-cover" />}
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isScorer} onChange={e => setForm(p => ({ ...p, isScorer: e.target.checked, goalsCount: e.target.checked ? p.goalsCount : 0 }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">9shtë golashënues?</span>
              </label>
              {form.isScorer && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Numri i golave</label>
                  <input type="number" min="1" value={form.goalsCount} onChange={e => setForm(p => ({ ...p, goalsCount: Number(e.target.value) }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                </div>
              )}
            </div>
            <div className="flex items-end">
              <button type="submit" className="px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm font-medium hover:bg-[#1c3570]">
                {editId ? 'Ruaj' : 'Shto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">Nuk ka Lojtar të Javës.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(p => {
              const team = getTeamById(p.teamId);
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                      {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</div>}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.firstName} {p.lastName}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Java {p.week}</span>
                        <span>{team?.name || '-'}</span>
                        {p.isScorer && <span className="text-[#0f1830]">Golashënues ({p.goalsCount})</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-[#0f1830]"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm('Fshi?')) deletePlayerOfWeek(p.id); }} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPlayerOfWeek;
