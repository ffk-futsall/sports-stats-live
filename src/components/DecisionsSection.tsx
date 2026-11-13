import React, { useState, useEffect } from 'react';
interface Decision {
  id: string;
  vendimi: string;
  pershkrimi: string;
  java: string;
  detajet: string;
  data: string;
  statusi: 'aprovuar' | 'refuzuar' | 'ne_pritje';
  shfaqNeBallina: boolean;
}

var statusMap: Record<string, { bg: string; text: string; border: string; dot: string; label: string }> = {
  aprovuar: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', label: 'Aprovuar' },
  refuzuar: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', label: 'Refuzuar' },
  ne_pritje: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', label: 'Ne Pritje' },
};

function getStatusClass(s: { bg: string; text: string; border: string }) {
  return 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ' + s.bg + ' ' + s.text + ' border ' + s.border;
}

var DecisionsSection: React.FC = function() {
  var _d = useState<Decision[]>([]);
  var decisions = _d[0];
  var setDecisions = _d[1];
  var _sd = useState<Decision | null>(null);
  var selectedDecision = _sd[0];
  var setSelectedDecision = _sd[1];

  useEffect(function() {
    try {
      var saved = localStorage.getItem('komisioni_vendimet');
      if (saved) {
        var all: Decision[] = JSON.parse(saved);
        setDecisions(all.filter(function(d) { return d.shfaqNeBallina; }));
      }
    } catch (e) {}
  }, []);

  useEffect(function() {
    var handler = function() {
      try {
        var saved = localStorage.getItem('komisioni_vendimet');
        if (saved) {
          var all: Decision[] = JSON.parse(saved);
          setDecisions(all.filter(function(d) { return d.shfaqNeBallina; }));
        }
      } catch (e) {}
    };
    window.addEventListener('storage', handler);
    var interval = setInterval(handler, 2000);
    return function() {
      window.removeEventListener('storage', handler);
      clearInterval(interval);
    };
  }, []);

  if (decisions.length === 0) return null;

  return (
    <section className="py-10 px-4 bg-gradient-to-b from-white to-[#F1F5F9]">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#0f1830]/100 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-[#0f1830]/25">
              
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">Vendimet e Komisionit</h2>
              <p className="text-xs text-gray-400 font-medium">{decisions.length} vendime aktive</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {decisions.map(function(d) {
            var s = statusMap[d.statusi] || statusMap['ne_pritje'];
            return (
              <div key={d.id} onClick={function() { setSelectedDecision(d); }} className="bg-white rounded-2xl border border-gray-100 p-5 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-gray-200 group">
                <div className="flex items-start justify-between mb-3">
                  <span className={getStatusClass(s)}>
                    <span className={'w-1.5 h-1.5 rounded-full ' + s.dot} />
                    {s.label}
                  </span>
                  <span className="text-[10px] text-gray-400 font-semibold bg-gray-50 px-2 py-1 rounded-lg">{d.java}</span>
                </div>
                <h3 className="font-bold text-gray-800 mb-2 group-hover:text-[#0f1830] transition-colors">{d.vendimi}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{d.pershkrimi || 'Nuk ka pershkrim.'}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400">{d.data}</span>
                  <span className="flex items-center gap-1 text-[11px] text-[#0f1830] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Shiko detajet ⬺
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDecision && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={function() { setSelectedDecision(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto" onClick={function(e) { e.stopPropagation(); }}>
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#0f1830]/100 to-indigo-600 rounded-xl flex items-center justify-center">
                  
                </div>
                <h3 className="text-lg font-bold text-gray-800">Detajet e Vendimit</h3>
              </div>
              <button aria-label="Mbyll" onClick={function() { setSelectedDecision(null); }} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Vendimi</p>
                <p className="text-base font-semibold text-gray-800">{selectedDecision.vendimi}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Pershkrimi</p>
                <p className="text-sm text-gray-600">{selectedDecision.pershkrimi || 'Nuk ka pershkrim.'}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Java</p>
                  <p className="text-sm text-gray-700 font-medium">{selectedDecision.java}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Data</p>
                  <p className="text-sm text-gray-700">{selectedDecision.data}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Statusi</p>
                  <span className={getStatusClass(statusMap[selectedDecision.statusi])}>
                    <span className={'w-1.5 h-1.5 rounded-full ' + statusMap[selectedDecision.statusi].dot} />
                    {statusMap[selectedDecision.statusi].label}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Detajet e Plota</p>
                <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 leading-relaxed">
                  {selectedDecision.detajet || 'Nuk ka detaje te shtuara per kete vendim.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DecisionsSection;
