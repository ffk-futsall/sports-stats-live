// Export only known business records. Credentials and sessions stay out of the backup.
export function collectLocalBackup(storage, now = new Date()) {
  const keys = ['ffk_player_stats', 'ffk_officials', 'ffk_match_sheets', 'ffk_club_documents', 'komisioni_vendimet'];
  const records = {}, errors = [];
  for (const key of keys) {
    const raw = storage.getItem(key);
    if (raw === null) continue;
    try {
      const value = JSON.parse(raw);
      if (!Array.isArray(value)) throw new Error('Expected an array');
      records[key] = value;
    } catch { errors.push(key); }
  }
  // Legacy editor records may contain plaintext passwords: export profile fields only.
  const editors = storage.getItem('ffk_editors');
  if (editors !== null) {
    try {
      const parsed = JSON.parse(editors);
      if (!Array.isArray(parsed)) throw new Error('Expected an array');
      records.ffk_editors = parsed.map(({id,firstName,lastName,username,phone,email,teamId,status,seasonId}) => ({id,firstName,lastName,username,phone,email,teamId,status,seasonId}));
    } catch { errors.push('ffk_editors'); }
  }
  return { format: 'ffk-local-export-v1', createdAt: now.toISOString(), sourceOrigin: typeof location === 'undefined' ? '' : location.origin, records, errors };
}
export function downloadLocalBackup(storage = localStorage) {
  const backup = collectLocalBackup(storage);
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'}));
  const link = document.createElement('a'); link.href = url;
  link.download = `ffk-te-dhenat-lokale-${backup.createdAt.slice(0,10)}.json`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return backup;
}
