import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
import { uploadPlayerPhoto } from '@/lib/supabase-db';
import { v4 as uuidv4 } from 'uuid';
import { Pencil, Trash2 } from 'lucide-react';

const AdminPlayers: React.FC = () => {
  const { players, teams, competitions, getActiveSeason, addPlayer, updatePlayer, deletePlayer } = useData();
  const activeSeason = getActiveSeason();
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', photo: '', birthDate: '', position: '', teamId: '' });
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const activeTeams = teams.filter(t => activeSeason ? t.seasonId === activeSeason.id : true);
  const filtered = players.filter(p => {
    if (activeSeason && p.seasonId !== activeSeason.id) return false;
    if (filterTeam !== 'all' && p.teamId !== filterTeam) return false;
    return true;
  });

  const resetForm = () => {
    setForm({ firstName: '', lastName: '', photo: '', birthDate: '', position: '', teamId: activeTeams[0]?.id || '' });
    setEditId(null);
    setShowForm(false);
    setPhotoFile(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.teamId) return null;

    const playerId = editId || uuidv4();
    let photoUrl = form.photo;

    if (photoFile) {
      photoUrl = await uploadPlayerPhoto(photoFile, playerId);
    }

    if (editId) {
      updatePlayer({ id: editId, ...form, photo: photoUrl, seasonId: activeSeason?.id || '' });
    } else {
      addPlayer({ ...form, photo: photoUrl, seasonId: activeSeason?.id || '' });
    }
    // Keep form open for quick adding
    setForm(prev => ({ ...prev, firstName: '', lastName: '', photo: '', birthDate: '' }));
    setEditId(null);
    setPhotoFile(null);
  };

  const handleEdit = (p: typeof players[0]) => {
    setForm({ firstName: p.firstName, lastName: p.lastName, photo: p.photo, birthDate: p.birthDate || '', position: p.position || '', teamId: p.teamId });
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
        <h2 className="text-xl font-bold text-gray-800">Lojtarët</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm font-medium hover:bg-[#1c3570]">
          + Shto Lojtar
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <select value={filterTeam} onChange={e => setFilterTeam(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
          <option value="all">Të gjitha skuadrat</option>
          {activeTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800">{editId ? 'Edito Lojtarin' : 'Shto Lojtar të Ri'}</h3>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Pozita</label>
              <select value={form.position} onChange={e => setForm(p => ({ ...p, position: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
                <option value="">Zgjedh...</option>
                <option value="Portier">Portier</option>
                <option value="Mbrojtës">Mbrojtës</option>
                <option value="Mesfushor">Mesfushor</option>
                <option value="Sulmues">Sulmues</option>
                <option value="Pivot">Pivot</option>
                <option value="Ala">Ala</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Datëlindja</label>
              <input type="date" value={form.birthDate} onChange={e => setForm(p => ({ ...p, birthDate: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Foto</label>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
              {form.photo && <img src={form.photo} alt="preview" className="w-8 h-8 mt-1 rounded-full object-cover" />}
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm font-medium hover:bg-[#1c3570]">
                {editId ? 'Ruaj' : 'Shto'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">Nuk ka lojtarë.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {filtered.map(p => {
              const team = activeTeams.find(t => t.id === p.teamId);
              return (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                      {p.photo ? <img src={p.photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">{p.firstName.charAt(0)}{p.lastName.charAt(0)}</div>}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.firstName} {p.lastName}</p>
                      <p className="text-xs text-gray-400">{team?.name || '-'} {p.position ? `· ${p.position}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEdit(p)} className="p-1.5 text-gray-400 hover:text-[#0f1830]"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => { if (confirm('Fshi lojtarin?')) deletePlayer(p.id); }} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
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

export default AdminPlayers;
