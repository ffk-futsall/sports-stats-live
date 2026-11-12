import React from 'react';
import { Match } from '@/types';
import { useData } from '@/context/DataContext';
interface MatchCardProps {
  match: Match;
  onClick: (match: Match) => void;
  compact?: boolean;
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const p = iso.split('-');
  if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
  return iso;
}

const MatchCard: React.FC<MatchCardProps> = ({ match, onClick, compact }) => {
  const { getTeamById, competitions } = useData();
  const homeTeam = getTeamById(match.homeTeamId);
  const awayTeam = getTeamById(match.awayTeamId);
  const comp = competitions.find(c => c.id === match.competitionId);

  const isLive = match.status === 'live';
  const isFinished = match.status === 'finished';

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
      onClick={() => onClick(match)}
    >
      {/* Gradient Header  Date, Time, Venue */}
      {!compact && (match.date || match.time || match.venue) && (
        <div className="bg-gradient-to-r from-[#0f1830] to-[#0f1830] px-4 py-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              {match.date && (
                <span className="flex items-center gap-1 text-white/90 text-[11px] font-medium">
                  
                  {formatDate(match.date)}
                </span>
              )}
              {match.time && (
                <span className="flex items-center gap-1 text-white/90 text-[11px] font-medium">
                  
                  {match.time}
                </span>
              )}
            </div>
            {match.venue && (
              <span className="flex items-center gap-1 text-white/70 text-[11px]">
                
                {match.venue}
              </span>
            )}
          </div>
        </div>
      )}

      <div className={compact ? 'p-3' : 'px-5 pt-5 pb-4'}>
        {/* Competition & Week badge */}
        {!compact && comp && (
          <div className="text-center mb-4">
            <span className="text-[10px] font-semibold text-[#0f1830] bg-[#0f1830]/8 px-3 py-1 rounded-full uppercase tracking-wider">
              {comp.name}  Java {match.week}
            </span>
          </div>
        )}

        {/* Teams & Score Row */}
        <div className="flex items-center justify-between gap-2">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div className={`${compact ? 'w-11 h-11' : 'w-16 h-16'} rounded-full bg-gray-50 border-2 border-gray-100 flex items-center justify-center overflow-hidden shadow-sm`}>
              {homeTeam?.logo ? (
                <img src={homeTeam.logo} alt={homeTeam.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-300 text-lg font-bold">{homeTeam?.name?.charAt(0) || '?'}</span>
              )}
            </div>
            <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-gray-700 mt-2 text-center truncate w-full`}>
              {homeTeam?.name || 'TBD'}
            </span>
          </div>

          {/* Score */}
          <div className="flex flex-col items-center px-3 min-w-[70px]">
            {isLive && (
              <div className="flex items-center gap-1.5 mb-2 px-3 py-0.5 bg-red-50 border border-red-100 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide">Live</span>
              </div>
            )}
            {isFinished || isLive ? (
              <div className="flex items-center gap-1">
                <span className={`${compact ? 'text-2xl' : 'text-4xl'} font-black text-gray-900 tabular-nums leading-none`}>
                  {match.homeScore ?? '—'}
                </span>
                <span className={`${compact ? 'text-lg' : 'text-2xl'} font-light text-gray-300 mx-0.5`}>:</span>
                <span className={`${compact ? 'text-2xl' : 'text-4xl'} font-black text-gray-900 tabular-nums leading-none`}>
                  {match.awayScore ?? '—'}
                </span>
              </div>
            ) : (
              <span className={`${compact ? 'text-base' : 'text-xl'} font-bold text-gray-300`}>VS</span>
            )}
            {isFinished && !compact && (
              <span className="text-[9px] font-semibold text-emerald-500 uppercase tracking-wider mt-1.5">{match.protocolResult==='finished' ? 'Përfunduar · përkohshëm' : 'E Perfunduar'}</span>
            )}
            {compact && match.protocolResult==='finished' && <span className="text-xs text-amber-800 text-center mt-1">Procesverbal · përkohshëm</span>}
            {compact && (
              <span className="text-[9px] text-gray-400 mt-1">Java {match.week}</span>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 min-w-0">
            <div className={`${compact ? 'w-11 h-11' : 'w-16 h-16'} rounded-full bg-gray-50 border-2 border-gray-100 flex items-center justify-center overflow-hidden shadow-sm`}>
              {awayTeam?.logo ? (
                <img src={awayTeam.logo} alt={awayTeam.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-gray-300 text-lg font-bold">{awayTeam?.name?.charAt(0) || '?'}</span>
              )}
            </div>
            <span className={`${compact ? 'text-[10px]' : 'text-xs'} font-semibold text-gray-700 mt-2 text-center truncate w-full`}>
              {awayTeam?.name || 'TBD'}
            </span>
          </div>
        </div>

        {/* "Shiko detajet" Button */}
        {!compact && (
          <div className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#0f1830] to-[#0f1830] text-white text-[11px] font-semibold rounded-xl hover:shadow-md hover:shadow-[#0f1830]/25 transition-all duration-200 uppercase tracking-wider">
            Shiko detajet
            ⬺
          </div>
        )}

        {/* Compact: mini info */}
        {compact && (
          <div className="flex items-center justify-center gap-3 mt-2 text-[10px] text-gray-400">
            {match.date && <span>{formatDate(match.date)}</span>}
            {match.time && <span>{match.time}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchCard;