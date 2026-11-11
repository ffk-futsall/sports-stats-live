// This is a strict allow-list, not a copy of the report: player IDs, signatures,
// private notes, passwords and the running clock must never enter public snapshots.
const text = (x, max = 150) => String(x ?? '').slice(0, max);
const score = (x) => ({ a: text(x?.a, 8), b: text(x?.b, 8) });
const team = (t) => ({
  name: text(t?.name),
  players: (Array.isArray(t?.players) ? t.players : []).slice(0, 30)
    .map(p => ({ name: text(p?.name), shirtNo: text(p?.shirtNo, 8) })).filter(p => p.name || p.shirtNo),
  officials: (Array.isArray(t?.officials) ? t.officials : []).slice(0, 15)
    .filter(o => o?.enabled !== false).map(o => ({ name: text(o?.name), role: text(o?.role) })).filter(o => o.name),
});
export function publicProtocolSnapshot(draft) {
  const d = draft && typeof draft === 'object' ? draft : {};
  const refs = d.officials || {};
  const timeline = (Array.isArray(d.timeline) ? d.timeline : []).slice(0, 300);
  const indexed = new Set(timeline.filter(e=>e?.sourceRow && Number.isInteger(e.slot)).map(e=>`${e.sourceRow}:${e.slot}`));
  const manualCards = Object.entries({kvB1:'a',kvB2:'b',kkA:'a',kkB:'b'}).flatMap(([row,side]) =>
    (Array.isArray(d.discipline?.[row]) ? d.discipline[row] : []).slice(0,20).flatMap((entry,index)=>{
      if (!entry?.shirtNo || indexed.has(`${row}:${index}`)) return [];
      const player=(Array.isArray(d.teams?.[side]?.players)?d.teams[side].players:[]).find(p=>String(p?.shirtNo)===String(entry.shirtNo));
      return [{kind:'card',team:side,minute:text(entry.minute,16),period:'',shirtNo:text(entry.shirtNo,8),playerName:text(player?.name),sourceRow:row,outgoingName:'',incomingName:''}];
    })
  );
  return {
    competition: text(d.competition), round: text(d.round, 20), season: text(d.season, 40),
    matchDate: text(d.matchDate, 30), startTime: text(d.startTime, 16), venue: text(d.venue), city: text(d.city),
    phase: ['setup','first','halftime','second','after_second','extra','after_extra','penalties','finished'].includes(d.phase) ? d.phase : 'setup',
    teams: { a: team(d.teams?.a), b: team(d.teams?.b) },
    scores: { live: score(d.liveScore), first: score(d.scores?.first), second: score(d.scores?.second), extra: score(d.scores?.extra), penalties: score(d.scores?.penalties), final: score(d.scores?.final) },
    officials: { ref1: text(refs.ref1), ref2: text(refs.ref2), ref3: text(refs.ref3), ref4: text(refs.ref4), delegate: text(refs.delegate), timekeeper: text(refs.timekeeper) },
    goals: (Array.isArray(d.goals) ? d.goals : []).slice(0, 50).map(g => ({ team: text(g?.team, 1), shirtNo: text(g?.shirtNo, 8), scorerName: text(g?.scorerName), minute: text(g?.minute, 16), addedTime: text(g?.addedTime, 8), period: text(g?.period, 24), score: /^\d{1,3}\s*:\s*\d{1,3}$/.test(String(g?.score ?? '')) ? text(g.score, 12) : '' })).filter(g => g.team && (g.scorerName || g.shirtNo)),
    events: [...timeline.filter(e => ['goal','card','foul','timeout','substitution'].includes(e?.kind)).map(e => ({ kind: text(e.kind, 20), team: text(e.team, 1), minute: text(e.minute, 16), period: text(e.period, 24), shirtNo: text(e.shirtNo, 8), playerName: text(e.playerName), sourceRow: text(e.sourceRow, 20), outgoingName: text(e.outgoingName), incomingName: text(e.incomingName) })), ...manualCards],
  };
}
