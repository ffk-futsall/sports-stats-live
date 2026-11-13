import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { uploadTeamLogo } from '@/lib/supabase-db';
import { v4 as uuidv4 } from 'uuid';
import { Pencil, Trash2 } from 'lucide-react';

const AdminTeams: React.FC = () => {
  const { teams, competitions, getActiveSeason, addTeam, updateTeam, deleteTeam } = useData();
  const activeSeason = getActiveSeason();
  const [filterComp, setFilterComp] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', logo: '', competitionId: '', foundedYear: '', stadium: '' });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const activeComps = competitions.filter(c => activeSeason ? c.seasonId === activeSeason.id : true);
  const filtered = teams.filter(t => {
    if (activeSeason && t.seasonId !== activeSeason.id) return false;
    if (filterComp !== 'all' && t.competitionId !== filterComp) return false;
    return true;
  });

  const resetForm = () => {
    setForm({ name: '', logo: '', competitionId: activeComps[0]?.id || '', foundedYear: '', stadium: '' });
    setEditId(null);
    setShowForm(false);
    setLogoFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.competitionId) return null;
    if (saving) return null;
    setSaving(true);
    try {
      const teamId = editId || uuidv4();
      let logoUrl = form.logo;
      if (logoFile) {
        logoUrl = await uploadTeamLogo(logoFile, teamId);
      }
      if (editId) {
        updateTeam({ id: editId, ...form, logo: logoUrl, seasonId: activeSeason?.id || '' });
      } else {
        addTeam({ ...form, logo: logoUrl, seasonId: activeSeason?.id || '' });
      }
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: typeof teams[0]) => {
    setForm({ name: t.name, logo: t.logo, competitionId: t.competitionId, foundedYear: t.foundedYear || '', stadium: t.stadium || '' });
    setEditId(t.id);
    setShowForm(true);
    setLogoFile(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return null;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(prev => ({ ...prev, logo: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800">Skuadrat</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm font-medium hover:bg-[#1c3570] transition-colors">
          + Shto Skuader
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <select value={filterComp} onChange={e => setFilterComp(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">Te gjitha kompeticionet</option>
          {activeComps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">{editId ? 'Edito Skuadren' : 'Shto Skuader te Re'}</h3>
            <button aria-label="Mbyll" onClick={resetForm} className="text-gray-400 hover:text-gray-600">×</button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Emri *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kompeticioni *</label>
              <select value={form.competitionId} onChange={e => setForm(p => ({ ...p, competitionId: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white" required>
                <option value="">Zgjedh...</option>
                {activeComps.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Logo (ngarko nga kompjuteri)</label>
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" onChange={handleLogoUpload} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              {form.logo && <img src={form.logo} alt="preview" className="w-10 h-10 mt-1 rounded object-cover" />}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stadiumi</label>
              <input value={form.stadium} onChange={e => setForm(p => ({ ...p, stadium: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Viti i Themelimit</label>
              <input value={form.foundedYear} onChange={e => setForm(p => ({ ...p, foundedYear: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="flex items-end">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm font-medium hover:bg-[#1c3570] disabled:opacity-60 disabled:cursor-not-allowed">
                {saving ? 'Duke ruajtur⬦' : (editId ? 'Ruaj Ndryshimet' : 'Shto')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">Nuk ka skuadra.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(t => {
              const comp = activeComps.find(c => c.id === t.competitionId);
              return (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                      {t.logo ? <img src={t.logo} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center w-full h-full text-gray-400 text-xs font-bold">{t.name.charAt(0)}</span>}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{t.name}</p>
                      <p className="text-xs text-gray-400">{comp?.name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(t)} className="p-1.5 text-gray-400 hover:text-[#0f1830] rounded"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm('Fshi skuadren?')) deleteTeam(t.id); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
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

export default AdminTeams;