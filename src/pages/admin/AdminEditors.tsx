import React, { useState, useEffect } from 'react';
import { useData } from '@/context/DataContext';
import { Editor } from '@/types';
import { v4 as uuidv4 } from 'uuid';

function loadEditors(): Editor[] {
  try { var s = localStorage.getItem('ffk_editors'); if (s) return JSON.parse(s); } catch(e) {}
  return [];
}
function saveEditors(list: Editor[]) {
  localStorage.setItem('ffk_editors', JSON.stringify(list));
}

var AdminEditors: React.FC = function() {
  var _data = useData();
  var teams = _data.teams;
  var competitions = _data.competitions;
  var getActiveSeason = _data.getActiveSeason;
  var getTeamById = _data.getTeamById;
  var activeSeason = getActiveSeason();

  var _eds = useState<Editor[]>(loadEditors);
  var editors = _eds[0]; var setEditors = _eds[1];
  var _sf = useState(false);
  var showForm = _sf[0]; var setShowForm = _sf[1];
  var _ei = useState<string | null>(null);
  var editingId = _ei[0]; var setEditingId = _ei[1];
  var _sp = useState<Record<string, boolean>>({});
  var showPasswords = _sp[0]; var setShowPasswords = _sp[1];
  var _search = useState('');
  var search = _search[0]; var setSearch = _search[1];
  var _filter = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  var filter = _filter[0]; var setFilter = _filter[1];
  var _form = useState({ firstName: '', lastName: '', username: '', password: '', phone: '', email: '', teamId: '' });
  var form = _form[0]; var setForm = _form[1];

  useEffect(function() { saveEditors(editors); }, [editors]);
  useEffect(function() {
    var interval = setInterval(function() { setEditors(loadEditors()); }, 2000);
    return function() { clearInterval(interval); };
  }, []);

  var superligaComp = competitions.find(function(c) { return c.type === 'superliga' && (activeSeason ? c.seasonId === activeSeason.id : true); });
  var ligaPareComp = competitions.find(function(c) { return c.type === 'liga_pare' && (activeSeason ? c.seasonId === activeSeason.id : true); });
  var superligaTeams = teams.filter(function(t) { return superligaComp ? t.competitionId === superligaComp.id : false; });
  var ligaPareTeams = teams.filter(function(t) { return ligaPareComp ? t.competitionId === ligaPareComp.id : false; });

  var filtered = editors.filter(function(ed) {
    if (filter !== 'all' && ed.status !== filter) return false;
    if (search) {
      var s = search.toLowerCase();
      var fullName = (ed.firstName + ' ' + ed.lastName).toLowerCase();
      return fullName.indexOf(s) !== -1 || ed.username.toLowerCase().indexOf(s) !== -1 || ed.email.toLowerCase().indexOf(s) !== -1;
    }
    return true;
  });

  var handleApprove = function(id: string) {
    var updated = editors.map(function(ed) { return ed.id === id ? Object.assign({}, ed, { status: 'approved' as const }) : ed; });
    setEditors(updated);
    var ed = updated.find(function(e) { return e.id === id; });
    if (ed) {
      var users = _data.users;
      var exists = users.find(function(u) { return u.username === ed.username; });
      if (!exists) {
        _data.addUser({ username: ed.username, password: ed.password, role: 'editor' });
      }
    }
  };

  var handleReject = function(id: string) {
    setEditors(editors.map(function(ed) { return ed.id === id ? Object.assign({}, ed, { status: 'rejected' as const }) : ed; }));
    var ed = editors.find(function(e) { return e.id === id; });
    if (ed) {
      var users = _data.users;
      var userMatch = users.find(function(u) { return u.username === ed.username; });
      if (userMatch) { _data.deleteUser(userMatch.id); }
    }
  };

  var handleDelete = function(id: string) {
    var ed = editors.find(function(e) { return e.id === id; });
    setEditors(editors.filter(function(e) { return e.id !== id; }));
    if (ed) {
      var users = _data.users;
      var userMatch = users.find(function(u) { return u.username === ed.username; });
      if (userMatch) { _data.deleteUser(userMatch.id); }
    }
  };

  var handleEdit = function(ed: Editor) {
    setEditingId(ed.id);
    setForm({ firstName: ed.firstName, lastName: ed.lastName, username: ed.username, password: ed.password, phone: ed.phone, email: ed.email, teamId: ed.teamId });
  };

  var handleSaveEdit = function() {
    if (!editingId) return null;
    var oldEd = editors.find(function(e) { return e.id === editingId; });
    setEditors(editors.map(function(ed) {
      if (ed.id === editingId) return Object.assign({}, ed, form);
      return ed;
    }));
    if (oldEd && oldEd.status === 'approved') {
      var users = _data.users;
      var userMatch = users.find(function(u) { return u.username === oldEd.username; });
      if (userMatch) {
        _data.updateUser(Object.assign({}, userMatch, { username: form.username, password: form.password }));
      }
    }
    setEditingId(null);
    setForm({ firstName: '', lastName: '', username: '', password: '', phone: '', email: '', teamId: '' });
  };

  var handleAddNew = function() {
    if (!form.firstName || !form.username || !form.password || !form.teamId) return null;
    var newEd: Editor = {
      id: uuidv4(),
      firstName: form.firstName,
      lastName: form.lastName,
      username: form.username,
      password: form.password,
      phone: form.phone,
      email: form.email,
      teamId: form.teamId,
      status: 'approved',
      seasonId: activeSeason ? activeSeason.id : '',
    };
    setEditors([newEd].concat(editors));
    _data.addUser({ username: form.username, password: form.password, role: 'editor' });
    setForm({ firstName: '', lastName: '', username: '', password: '', phone: '', email: '', teamId: '' });
    setShowForm(false);
  };

  var togglePassword = function(id: string) {
    var copy = Object.assign({}, showPasswords);
    copy[id] = !copy[id];
    setShowPasswords(copy);
  };

  var statusStyle = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };
  var statusLabel = { pending: 'Ne Pritje', approved: 'Aprovuar', rejected: 'Refuzuar' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200">
            
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Menaxhimi i Editoreve</h2>
            <p className="text-sm text-gray-500">{editors.length} editore gjithsej</p>
          </div>
        </div>
        <button onClick={function() { setShowForm(!showForm); setEditingId(null); setForm({ firstName: '', lastName: '', username: '', password: '', phone: '', email: '', teamId: '' }); }} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">
           Shto Editor
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{editors.filter(function(e) { return e.status === 'pending'; }).length}</p>
          <p className="text-xs text-amber-600 font-medium mt-1">Ne Pritje</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{editors.filter(function(e) { return e.status === 'approved'; }).length}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Aprovuar</p>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{editors.filter(function(e) { return e.status === 'rejected'; }).length}</p>
          <p className="text-xs text-red-600 font-medium mt-1">Refuzuar</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          a
          <input type="text" value={search} onChange={function(e) { setSearch(e.target.value); }} placeholder="Kerko editore..." className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none" />
        </div>
        <select value={filter} onChange={function(e) { setFilter(e.target.value as any); }} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-500 outline-none bg-white">
          <option value="all">Te gjithe</option>
          <option value="pending">Ne Pritje</option>
          <option value="approved">Aprovuar</option>
          <option value="rejected">Refuzuar</option>
        </select>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Editor i Ri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Emri" value={form.firstName} onChange={function(e) { setForm(Object.assign({}, form, { firstName: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Mbiemri" value={form.lastName} onChange={function(e) { setForm(Object.assign({}, form, { lastName: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Username" value={form.username} onChange={function(e) { setForm(Object.assign({}, form, { username: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Password" value={form.password} onChange={function(e) { setForm(Object.assign({}, form, { password: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Nr. Telefonit" value={form.phone} onChange={function(e) { setForm(Object.assign({}, form, { phone: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Email" value={form.email} onChange={function(e) { setForm(Object.assign({}, form, { email: e.target.value })); }} />
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white md:col-span-2" value={form.teamId} onChange={function(e) { setForm(Object.assign({}, form, { teamId: e.target.value })); }}>
              <option value="">-- Zgjedh skuadren --</option>
              {superligaTeams.length > 0 && <optgroup label="Superliga">{superligaTeams.map(function(t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}</optgroup>}
              {ligaPareTeams.length > 0 && <optgroup label="Liga e Pare">{ligaPareTeams.map(function(t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}</optgroup>}
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleAddNew} className="px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">Ruaj Editorin</button>
            <button onClick={function() { setShowForm(false); }} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all">Anulo</button>
          </div>
        </div>
      )}

      {editingId && (
        <div className="bg-white border border-[#0f1830]/25 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Edito Editorin</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100" placeholder="Emri" value={form.firstName} onChange={function(e) { setForm(Object.assign({}, form, { firstName: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100" placeholder="Mbiemri" value={form.lastName} onChange={function(e) { setForm(Object.assign({}, form, { lastName: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100" placeholder="Username" value={form.username} onChange={function(e) { setForm(Object.assign({}, form, { username: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100" placeholder="Password" value={form.password} onChange={function(e) { setForm(Object.assign({}, form, { password: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100" placeholder="Nr. Telefonit" value={form.phone} onChange={function(e) { setForm(Object.assign({}, form, { phone: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100" placeholder="Email" value={form.email} onChange={function(e) { setForm(Object.assign({}, form, { email: e.target.value })); }} />
            <select className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100 bg-white md:col-span-2" value={form.teamId} onChange={function(e) { setForm(Object.assign({}, form, { teamId: e.target.value })); }}>
              <option value="">-- Zgjedh skuadren --</option>
              {superligaTeams.length > 0 && <optgroup label="Superliga">{superligaTeams.map(function(t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}</optgroup>}
              {ligaPareTeams.length > 0 && <optgroup label="Liga e Pare">{ligaPareTeams.map(function(t) { return <option key={t.id} value={t.id}>{t.name}</option>; })}</optgroup>}
            </select>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSaveEdit} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0f1830]/100 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">S Ruaj Ndryshimet</button>
            <button onClick={function() { setEditingId(null); }} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all">Anulo</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Emri</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Password</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Skuadra</th>
              <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kontakti</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statusi</th>
              <th className="text-right px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Veprime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">Nuk ka editore.</td></tr>
            ) : filtered.map(function(ed) {
              var team = getTeamById(ed.teamId);
              return (
                <tr key={ed.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{ed.firstName} {ed.lastName}</p>
                      <p className="text-[11px] text-gray-400">{ed.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 font-mono">{ed.username}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 font-mono">{showPasswords[ed.id] ? ed.password : '********'}</span>
                      <button onClick={function() { togglePassword(ed.id); }} className="text-gray-400 hover:text-gray-600">
                        {showPasswords[ed.id] ? null : "9"}
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {team?.logo && <img src={team.logo} alt="" className="w-5 h-5 rounded-full" />}
                      <span className="text-sm text-gray-700">{team?.name || '-'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{ed.phone}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ' + statusStyle[ed.status]}>{statusLabel[ed.status]}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {ed.status === 'pending' && (
                        <>
                          <button onClick={function() { handleApprove(ed.id); }} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Aprovo">S</button>
                          <button onClick={function() { handleReject(ed.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Refuzo">×</button>
                        </>
                      )}
                      {ed.status === 'rejected' && (
                        <button onClick={function() { handleApprove(ed.id); }} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors" title="Aprovo">S</button>
                      )}
                      {ed.status === 'approved' && (
                        <button onClick={function() { handleReject(ed.id); }} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors" title="Pezullo">×</button>
                      )}
                      <button onClick={function() { handleEdit(ed); }} className="p-1.5 text-gray-400 hover:text-[#0f1830] hover:bg-[#0f1830]/10 rounded-lg transition-colors" title="Edito"></button>
                      <button onClick={function() { handleDelete(ed.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Fshi">S</button>
                    </div>
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

export default AdminEditors;
