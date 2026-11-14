import type { Match } from '../types/index';

// Skema e Kupës: 16 skuadra, 1/8 e finales -> Finalja. Pozicionet 0..15 janë vendet e shortit;
// çifti m i raundit të parë është (slots[2m], slots[2m+1]). Raundet e tjera nxirren automatikisht
// nga fituesit e ndeshjeve (asnjë rezultat nuk ruhet veçmas: ndjek ndeshjet e Kupës në portal).
export const KUPA_SLOTS = 16;
export const KUPA_ROUND_NAMES = ['1/8 e finales', 'Çerekfinalet', 'Gjysmëfinalet', 'Finalja'];

export interface BracketNode {
  round: number;            // 0..3
  index: number;            // pozita brenda raundit
  number: number;           // numri i ndeshjes 1..15
  week: number;             // java/raundi i ndeshjes në portal (round + 1)
  a: string | null;         // ID skuadre ose null (ende e panjohur)
  b: string | null;
  fromA?: number;           // numri i ndeshjes nga vjen skuadra A (për raundet 2+)
  fromB?: number;
  matches: Match[];         // ndeshjet e portalit për këtë çift
  aggA: number;
  aggB: number;
  complete: boolean;        // të gjitha ndeshjet e çiftit kanë përfunduar
  winner: string | null;
}

export const emptySlots = (): (string | null)[] => Array.from({ length: KUPA_SLOTS }, () => null);

export function normalizeSlots(input: unknown): (string | null)[] {
  const out = emptySlots();
  if (Array.isArray(input)) for (let i = 0; i < KUPA_SLOTS; i++) out[i] = typeof input[i] === 'string' && input[i] ? input[i] : null;
  return out;
}

function tie(a: string | null, b: string | null, week: number, cupMatches: Match[]) {
  if (!a || !b) return { matches: [] as Match[], aggA: 0, aggB: 0, complete: false, winner: null as string | null };
  const matches = cupMatches
    .filter(m => m.week === week && m.status !== 'cancelled' && ((m.homeTeamId === a && m.awayTeamId === b) || (m.homeTeamId === b && m.awayTeamId === a)))
    .sort((x, y) => (x.date || '').localeCompare(y.date || '') || (x.time || '').localeCompare(y.time || ''));
  let aggA = 0, aggB = 0, winsA = 0, winsB = 0, all = matches.length > 0;
  for (const m of matches) {
    if (m.status !== 'finished' || m.homeScore == null || m.awayScore == null) { all = false; continue; }
    const ga = m.homeTeamId === a ? m.homeScore : m.awayScore;
    const gb = m.homeTeamId === a ? m.awayScore : m.homeScore;
    aggA += ga; aggB += gb;
    if (ga > gb) winsA++; else if (gb > ga) winsB++;
  }
  let winner: string | null = null;
  if (all) winner = winsA > winsB ? a : winsB > winsA ? b : aggA > aggB ? a : aggB > aggA ? b : null;
  return { matches, aggA, aggB, complete: all, winner };
}

export function buildCupBracket(slotsInput: unknown, cupMatches: Match[]): BracketNode[][] {
  const slots = normalizeSlots(slotsInput);
  const rounds: BracketNode[][] = [];
  let number = 1;
  let prev: BracketNode[] = [];
  for (let r = 0; r < 4; r++) {
    const count = KUPA_SLOTS / 2 / 2 ** r;
    const nodes: BracketNode[] = [];
    for (let i = 0; i < count; i++) {
      const a = r === 0 ? slots[2 * i] : prev[2 * i].winner;
      const b = r === 0 ? slots[2 * i + 1] : prev[2 * i + 1].winner;
      nodes.push({
        round: r, index: i, number: number++, week: r + 1, a, b,
        fromA: r === 0 ? undefined : prev[2 * i].number, fromB: r === 0 ? undefined : prev[2 * i + 1].number,
        ...tie(a, b, r + 1, cupMatches),
      });
    }
    rounds.push(nodes); prev = nodes;
  }
  return rounds;
}

/** Fituesi i finales, nëse është përcaktuar. */
export const bracketChampion = (rounds: BracketNode[][]): string | null => rounds[3]?.[0]?.winner ?? null;
