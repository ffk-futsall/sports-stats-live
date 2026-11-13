import React, { useState } from 'react';
import { useData } from '@/context/DataContext';
var statusColors = {
  featured: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'I publikuar' },
  normal: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-400', label: 'Normal' },
};

function getFeaturedClass(isFeatured: boolean) {
  var s = isFeatured ? statusColors.featured : statusColors.normal;
  return 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ' + s.bg + ' ' + s.text + ' border ' + s.border;
}

function getFeaturedDot(isFeatured: boolean) {
  var s = isFeatured ? statusColors.featured : statusColors.normal;
  return 'w-1.5 h-1.5 rounded-full ' + s.dot;
}

function getFeaturedLabel(isFeatured: boolean) {
  return isFeatured ? statusColors.featured.label : statusColors.normal.label;
}

var AdminDecisions: React.FC = function() {
  var _data = useData();
  var decisions = _data.decisions;
  var addDecision = _data.addDecision;
  var updateDecision = _data.updateDecision;
  var deleteDecision = _data.deleteDecision;
  var getActiveSeason = _data.getActiveSeason;
  var activeSeason = getActiveSeason();

  var _sf = useState(false);
  var showForm = _sf[0];
  var setShowForm = _sf[1];
  var _sd = useState<string | null>(null);
  var selectedId = _sd[0];
  var setSelectedId = _sd[1];
  var _ei = useState<string | null>(null);
  var editingId = _ei[0];
  var setEditingId = _ei[1];
  var _f = useState({ title: '', description: '', week: '', isFeatured: false });
  var form = _f[0];
  var setForm = _f[1];

  var seasonDecisions = activeSeason ? decisions.filter(function(d) { return d.seasonId === activeSeason.id; }) : decisions;
  var sorted = seasonDecisions.slice().sort(function(a, b) { return b.week - a.week; });

  var selectedDecision = selectedId ? decisions.find(function(d) { return d.id === selectedId; }) : null;

  var handleAdd = function() {
    if (!form.title.trim() || !form.week.trim()) return null;
    if (!activeSeason) return null;
    addDecision({
      title: form.title,
      description: form.description,
      week: parseInt(form.week) || 0,
      seasonId: activeSeason.id,
      isFeatured: form.isFeatured,
    });
    setForm({ title: '', description: '', week: '', isFeatured: false });
    setShowForm(false);
  };

  var handleEdit = function(d: any) {
    setEditingId(d.id);
    setForm({ title: d.title, description: d.description, week: String(d.week), isFeatured: d.isFeatured });
  };

  var handleSaveEdit = function() {
    if (!editingId) return null;
    var existing = decisions.find(function(d) { return d.id === editingId; });
    if (!existing) return null;
    updateDecision({
      id: editingId,
      title: form.title,
      description: form.description,
      week: parseInt(form.week) || existing.week,
      seasonId: existing.seasonId,
      isFeatured: form.isFeatured,
    });
    setEditingId(null);
    setForm({ title: '', description: '', week: '', isFeatured: false });
  };

  var handleDelete = function(id: string) {
    deleteDecision(id);
  };

  var toggleFeatured = function(d: any) {
    updateDecision(Object.assign({}, d, { isFeatured: !d.isFeatured }));
  };

  var resetForm = function() {
    setEditingId(null);
    setForm({ title: '', description: '', week: '', isFeatured: false });
    setShowForm(!showForm);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#0f1830]/100 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#0f1830]/25">
            
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Vendimet e Komisionit</h2>
            <p className="text-sm text-gray-500">{sorted.length} vendime gjithsej</p>
          </div>
        </div>
        <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#0f1830]/100 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg hover:shadow-[#0f1830]/25 transition-all duration-200">
          +
          Shto Vendim
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0f1830]/10 border border-[#0f1830]/15 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#0f1830]">{sorted.length}</p>
          <p className="text-xs text-[#0f1830] font-medium mt-1">Gjithsej</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{sorted.filter(function(d) { return d.isFeatured; }).length}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">Te publikuara ne Ballina</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Vendim i Ri</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100" placeholder="Titulli i vendimit" value={form.title} onChange={function(e) { setForm(Object.assign({}, form, { title: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100" placeholder="Java (numri, p.sh. 15)" value={form.week} onChange={function(e) { setForm(Object.assign({}, form, { week: e.target.value })); }} />
            <textarea className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100 md:col-span-2" rows={4} placeholder="Pershkrimi i plote i vendimit..." value={form.description} onChange={function(e) { setForm(Object.assign({}, form, { description: e.target.value })); }} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={function(e) { setForm(Object.assign({}, form, { isFeatured: e.target.checked })); }} className="w-4 h-4 text-[#0f1830] rounded border-gray-300 focus:ring-[#0f1830]/100" />
              <span className="text-sm text-gray-700 font-medium">Shfaq ne Ballina</span>
            </label>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleAdd} className="px-5 py-2.5 bg-gradient-to-r from-[#0f1830]/100 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">Ruaj Vendimin</button>
            <button onClick={function() { setShowForm(false); }} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all">Anulo</button>
          </div>
        </div>
      )}

      {editingId && (
        <div className="bg-white border border-[#0f1830]/25 rounded-2xl p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">Edito Vendimin</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100" placeholder="Titulli i vendimit" value={form.title} onChange={function(e) { setForm(Object.assign({}, form, { title: e.target.value })); }} />
            <input className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100" placeholder="Java (numri)" value={form.week} onChange={function(e) { setForm(Object.assign({}, form, { week: e.target.value })); }} />
            <textarea className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0f1830]/100 md:col-span-2" rows={4} placeholder="Pershkrimi..." value={form.description} onChange={function(e) { setForm(Object.assign({}, form, { description: e.target.value })); }} />
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={function(e) { setForm(Object.assign({}, form, { isFeatured: e.target.checked })); }} className="w-4 h-4 text-[#0f1830] rounded border-gray-300 focus:ring-[#0f1830]/100" />
              <span className="text-sm text-gray-700 font-medium">Shfaq ne Ballina</span>
            </label>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={handleSaveEdit} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#0f1830]/100 to-indigo-600 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all">S Ruaj Ndryshimet</button>
            <button onClick={function() { setEditingId(null); setForm({ title: '', description: '', week: '', isFeatured: false }); }} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all">Anulo</button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendimi</th>
              <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Pershkrimi</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Java</th>
              <th className="text-center px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ballina</th>
              <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Veprime</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">Nuk ka vendime te regjistruara. Kliko "Shto Vendim" per te filluar.</td></tr>
            ) : sorted.map(function(d) {
              return (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{d.title}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-[250px] truncate">{d.description}</td>
                  <td className="px-4 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#0f1830]/10 text-[#0f1830] font-bold text-sm">{d.week}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input type="checkbox" checked={d.isFeatured} onChange={function() { toggleFeatured(d); }} className="w-4 h-4 text-[#0f1830] rounded border-gray-300 focus:ring-[#0f1830]/100 cursor-pointer" title="Shfaq ne Ballina" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={function() { setSelectedId(d.id); }} className="p-1.5 text-gray-400 hover:text-[#0f1830] hover:bg-[#0f1830]/10 rounded-lg transition-colors">9</button>
                      <button onClick={function() { handleEdit(d); }} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"></button>
                      <button onClick={function() { handleDelete(d.id); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">S</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedDecision && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={function() { setSelectedId(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={function(e) { e.stopPropagation(); }}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#0f1830]/100 to-indigo-600 rounded-xl flex items-center justify-center">
                  
                </div>
                <h3 className="text-lg font-bold text-gray-800">Detajet e Vendimit</h3>
              </div>
              <button aria-label="Mbyll" onClick={function() { setSelectedId(null); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Vendimi</p>
                <p className="text-base font-semibold text-gray-800">{selectedDecision.title}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Java</p>
                  <p className="text-sm text-gray-700 font-medium">Java {selectedDecision.week}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Ballina</p>
                  <span className={getFeaturedClass(selectedDecision.isFeatured)}>
                    <span className={getFeaturedDot(selectedDecision.isFeatured)} />
                    {getFeaturedLabel(selectedDecision.isFeatured)}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pershkrimi i Plote</p>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedDecision.description || 'Nuk ka pershkrim te shtuar per kete vendim.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDecisions;
