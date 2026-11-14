import { supabaseClient } from '@/lib/supabaseClient';

/**
 * Arkivon çdo procesverbal/caktim të lidhur me një ndeshje të portalit (admin).
 * Thirret kur ndeshja fshihet, që rezultati i procesverbalit të largohet nga "Të luajtura".
 * Kthen numrin e procesverbaleve të arkivuara.
 */
export async function archiveProtocolForMatch(matchId: string): Promise<number> {
  const { data } = await supabaseClient.auth.getSession();
  const response = await fetch('/api/delegates', {
    method: 'POST',
    headers: { Authorization: `Bearer ${data.session?.access_token || ''}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'archive-match', matchId }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.error || 'Procesverbali nuk u largua.');
  return Number(json.archived) || 0;
}
