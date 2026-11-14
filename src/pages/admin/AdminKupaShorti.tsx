import React, { useMemo, useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useData } from '@/context/DataContext';
import { Match } from '@/types';
import { BracketNode, KUPA_ROUND_NAMES, KUPA_SLOTS, buildCupBracket, emptySlots, normalizeSlots } from '@/lib/kupaBracket';
import { archiveProtocolForMatch } from '@/lib/protocolAdmin';

const norm = (v?: string) => (v || '').toLocaleLowerCase();
const fmtDate = (iso?: string) => { const p = (iso || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso || ''; };
const field = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white';

type MatchForm = { id: string | null; nodeNumber: number; homeTeamId: string; awayTeamId: string; date: string; time: string; venue: string };

const AdminKupaShorti: React.FC = () => {
  const { teams, competitions, matches, displayMatches, settings, updateSettings, getActiveSeason, addMatch, updateMatch, deleteMatch, dismissProtocolMatch, getTeamById } = useData();
  const activeSeason = getActiveSeason();
  const inSeason = <T extends { seasonId: string }>(x: T) => (activeSeason ? x.seasonId === activeSeason.id : true);

  const kupa = competitions.find(c => c.type === 'kupa' && inSeason(c));
  const leagueComps = competitions.filter(c => (c.type === 'superliga' || c.type === 'liga_pare') && inSeason(c));
  const candidates = useMemo(() => {
    const ids = new Set(leagueComps.map(c => c.id));
    const list = teams.filter(t => inSeason(t) && ids.has(t.competitionId));
    return (list.length ? list : teams.filter(inSeason)).sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, leagueComps]); // eslint-disable-line react-hooks/exhaustive-deps

  const saved = settings?.kupaBracket?.slots;
  const [slots, setSlots] = useState<(string | null)[]>(() => {
    const s = normalizeSlots(saved);
    if (s.some(Boolean)) return s;
    // Sugjerim fillestar sipas shortit: Prishtina 01 (vendi 1) dhe Drenica (vendi 16) takohen vetëm në finale.
    const find = (key: string) => candidates.find(t => norm(t.name).includes(key))?.id || null;
    const out = emptySlots(); out[0] = find('prishtina'); out[KUPA_SLOTS - 1] = find('drenica');
    return out;
  });
  const [notice, setNotice] = useState('');
  const [form, setForm] = useState<MatchForm | null>(null);

  const dirty = JSON.stringify(slots) !== JSON.stringify(normalizeSlots(saved));
  const cupMatches = useMemo(() => (kupa ? displayMatches.filter(m => m.competitionId === kupa.id) : []), [displayMatches, kupa]);
  const rounds = useMemo(() => buildCupBracket(slots, cupMatches), [slots, cupMatches]);

  const setSlot = (i: number, id: string) => setSlots(prev => prev.map((s, k) => (k === i ? id || null : s)));
  const saveBracket = () => {
    updateSettings({ ...settings, kupaBracket: { slots } });
    setNotice('Shorti u ruajt dhe shfaqet te faqja e Kupës.');
  };
  const resetBracket = () => {
    if (!confirm('Rivendos shortin? Ndeshjet e regjistruara nuk fshihen.')) return;
    setSlots(emptySlots());
  };

  const openNew = (n: BracketNode) => setForm({ id: null, nodeNumber: n.number, homeTeamId: n.a || '', awayTeamId: n.b || '', date: '', time: '', venue: '' });
  const openEdit = (n: BracketNode, m: Match) => setForm({ id: m.id, nodeNumber: n.number, homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, date: m.date || '', time: m.time || '', venue: m.venue || '' });
  const saveMatch = (e: React.FormEvent, n: BracketNode) => {
    e.preventDefault();
    if (!form || !kupa || !form.homeTeamId || !form.awayTeamId || form.homeTeamId === form.awayTeamId) return;
    const base = { date: form.date || undefined, time: form.time || undefined, venue: form.venue || undefined, homeTeamId: form.homeTeamId, awayTeamId: form.awayTeamId };
    if (form.id) {
      // Mos prek rezultatin/statusin zyrtar; vetëm data, ora, vendi dhe renditja e skuadrave
      const official = matches.find(x => x.id === form.id);
      if (official) updateMatch({ ...official, ...base });
    } else {
      addMatch({ ...base, competitionId: kupa.id, seasonId: activeSeason?.id || kupa.seasonId, week: n.week, status: 'planned', isFeaturedLanding: true });
    }
    setNotice(`Ndeshja ${n.number} u ruajt${form.id ? '' : ' dhe shfaqet te "Ndeshjet qe do te zhvillohen"'}.`);
    setForm(null);
  };
  const removeMatch = async (m: Match) => {
    if (!confirm('Fshi ndeshjen? Nëse ka procesverbal, ai arkivohet dhe largohet nga faqja publike.')) return;
    deleteMatch(m.id);
    try { await archiveProtocolForMatch(m.id); dismissProtocolMatch(m.id); } catch { /* ndeshja u fshi; procesverbali mund të arkivohet nga Ndeshjet */ }
  };

  const used = new Set(slots.filter(Boolean) as string[]);
  const filled = slots.filter(Boolean).length;

  if (!kupa) return <p className="text-gray-500 text-sm">Nuk ka kompeticion të tipit "Kupa" për sezonin aktiv. Krijoje te Cilësimet.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Shorti i Kupës së Kosovës</h2>
          <p className="text-sm text-gray-500">{filled} / {KUPA_SLOTS} vende të plotësuara. Çifti = dy vende njëri pas tjetrit (1–2, 3–4 …).</p>
        </div>
        <div className="flex gap-2">
          <button onClick={resetBracket} className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white">Rivendos</button>
          <button onClick={saveBracket} disabled={!dirty} className="px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm font-medium disabled:opacity-40">Ruaj shortin</button>
        </div>
      </div>
      {notice && <p role="status" className="mb-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 p-3 text-sm">{notice} <button className="underline ml-2" onClick={() => setNotice('')}>Mbyll</button></p>}
      {dirty && <p className="mb-3 text-xs text-amber-700">Ke ndryshime të paruajtura në short.</p>}

      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">1. Vendos skuadrat në short</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {Array.from({ length: KUPA_SLOTS }, (_, i) => (
            <label key={i} className="flex items-center gap-2 text-sm">
              <span className="w-14 text-xs font-bold text-gray-500">Vendi {i + 1}</span>
              <select value={slots[i] || ''} onChange={e => setSlot(i, e.target.value)} className={field}>
                <option value="">Zgjidh skuadrën…</option>
                {candidates.filter(t => t.id === slots[i] || !used.has(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-400">Skuadrat vijnë nga Superliga dhe Liga e Parë e sezonit aktiv. Pas ndryshimit kliko "Ruaj shortin".</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <h3 className="font-semibold text-gray-800 mb-1">2. Cakto ndeshjet</h3>
        <p className="text-xs text-gray-500 mb-4">Çdo ndeshje e caktuar këtu shfaqet te faqja e Kupës dhe te faqja kryesore. Rezultatin e fut procesverbali ose editohet te "Ndeshjet". Fituesi kalon automatikisht në raundin tjetër.</p>
        {rounds.map((nodes, r) => (
          <div key={r} className="mb-5">
            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">{KUPA_ROUND_NAMES[r]}</h4>
            <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg">
              {nodes.map(n => {
                const ready = !!n.a && !!n.b;
                const A = n.a ? getTeamById(n.a)?.name : `Fituesi i ndeshjes ${n.fromA}`;
                const B = n.b ? getTeamById(n.b)?.name : `Fituesi i ndeshjes ${n.fromB}`;
                return (
                  <div key={n.number} className="px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-sm min-w-0">
                        <span className="text-xs font-bold text-gray-400 mr-2">N{n.number}</span>
                        <span className={n.a ? 'font-medium text-gray-800' : 'italic text-gray-400'}>{A}</span>
                        <span className="mx-2 text-gray-400">vs</span>
                        <span className={n.b ? 'font-medium text-gray-800' : 'italic text-gray-400'}>{B}</span>
                        {n.winner && <span className="ml-2 text-xs text-emerald-700 font-semibold">Kalon: {getTeamById(n.winner)?.name}</span>}
                      </div>
                      <button disabled={!ready} onClick={() => openNew(n)} className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium bg-white disabled:opacity-40" title={ready ? '' : 'Të dyja skuadrat duhet të jenë të njohura'}>
                        <Plus className="w-3.5 h-3.5" /> Cakto ndeshje
                      </button>
                    </div>
                    {n.matches.map(m => (
                      <div key={m.id} className="mt-1.5 ml-8 flex items-center justify-between text-xs text-gray-600">
                        <span>
                          {getTeamById(m.homeTeamId)?.name} {m.status === 'finished' || m.status === 'live' ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : 'vs'} {getTeamById(m.awayTeamId)?.name}
                          <span className="ml-2 text-gray-400">{fmtDate(m.date) || 'pa datë'}{m.time ? ` · ${m.time}` : ''}{m.venue ? ` · ${m.venue}` : ''}</span>
                          {m.status === 'finished' && <span className="ml-2 text-emerald-700">I përfunduar</span>}
                          {m.status === 'live' && <span className="ml-2 text-red-500 font-bold">LIVE</span>}
                        </span>
                        <span className="flex gap-1">
                          <button onClick={() => openEdit(n, m)} className="p-1 text-gray-400 hover:text-[#0f1830]" title="Edito datën/orën/vendin"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => removeMatch(m)} className="p-1 text-gray-400 hover:text-red-500" title="Fshi"><Trash2 className="w-3.5 h-3.5" /></button>
                        </span>
                      </div>
                    ))}
                    {form && form.nodeNumber === n.number && (
                      <form onSubmit={e => saveMatch(e, n)} className="mt-3 ml-8 grid grid-cols-1 md:grid-cols-5 gap-2 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <select value={form.homeTeamId} onChange={e => setForm({ ...form, homeTeamId: e.target.value })} className={field} aria-label="Pritësi" required>
                          {[n.a, n.b].filter(Boolean).map(id => <option key={id as string} value={id as string}>{getTeamById(id as string)?.name} (pritës)</option>)}
                        </select>
                        <select value={form.awayTeamId} onChange={e => setForm({ ...form, awayTeamId: e.target.value })} className={field} aria-label="Mysafiri" required>
                          {[n.a, n.b].filter(Boolean).map(id => <option key={id as string} value={id as string}>{getTeamById(id as string)?.name} (mysafir)</option>)}
                        </select>
                        <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={field} aria-label="Data" />
                        <input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className={field} aria-label="Ora" />
                        <input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="Vendi" className={field} aria-label="Vendi" />
                        {form.homeTeamId === form.awayTeamId && <p className="md:col-span-5 text-xs text-red-600">Pritësi dhe mysafiri duhet të jenë skuadra të ndryshme.</p>}
                        <div className="md:col-span-5 flex gap-2">
                          <button type="submit" className="px-4 py-2 bg-[#0f1830] text-white rounded-lg text-sm font-medium">{form.id ? 'Ruaj' : 'Cakto'}</button>
                          <button type="button" onClick={() => setForm(null)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white">Anulo</button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminKupaShorti;
