import type { GameState, PowerId } from '@diplomacy/shared';
import { Trophy, HeartHandshake } from 'lucide-react';

interface GameEndModalProps {
  gameState: GameState;
  onClose: () => void;
  onNewGame: () => void;
}

const POWER_NAMES: Record<string, string> = {
  england: 'England',
  france: 'France',
  germany: 'Germany',
  italy: 'Italy',
  austria: 'Austria-Hungary',
  russia: 'Russia',
  turkey: 'Turkey',
};

const POWER_COLORS: Record<string, string> = {
  england: 'bg-england',
  france: 'bg-france',
  germany: 'bg-germany',
  italy: 'bg-italy',
  austria: 'bg-austria',
  russia: 'bg-russia',
  turkey: 'bg-turkey',
};

const ALL_POWERS: PowerId[] = ['england', 'france', 'germany', 'italy', 'austria', 'russia', 'turkey'];

export function GameEndModal({ gameState, onClose, onNewGame }: GameEndModalProps) {
  const isDraw = gameState.isDraw;
  const winner = gameState.winner;

  // Sort powers by SC count descending
  const sorted = [...ALL_POWERS].sort(
    (a, b) => gameState.powers[b].supplyCenters.length - gameState.powers[a].supplyCenters.length
  );

  const survivors = ALL_POWERS.filter(p => !gameState.powers[p].isEliminated);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className={`px-6 py-5 text-center ${isDraw ? 'bg-amber-50' : 'bg-yellow-50'}`}>
          {isDraw ? (
            <>
              <HeartHandshake size={40} className="mx-auto text-amber-600 mb-2" />
              <h2 className="text-2xl font-bold text-gray-900">Draw</h2>
              <p className="text-gray-600 mt-1">
                {survivors.length} powers agree to share the continent
              </p>
            </>
          ) : (
            <>
              <Trophy size={40} className="mx-auto text-yellow-500 mb-2" />
              <h2 className="text-2xl font-bold text-gray-900">
                {POWER_NAMES[winner!]} Wins!
              </h2>
            </>
          )}
          <p className="text-sm text-gray-500 mt-1">
            Game ended in {gameState.year}
          </p>
        </div>

        {/* SC Table */}
        <div className="px-6 py-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs uppercase">
                <th className="text-left py-1">Power</th>
                <th className="text-right py-1">SCs</th>
                <th className="text-right py-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(powerId => {
                const power = gameState.powers[powerId];
                const scCount = power.supplyCenters.length;
                const isWinner = powerId === winner;
                const isEliminated = power.isEliminated;
                const inDraw = isDraw && !isEliminated;

                return (
                  <tr key={powerId} className="border-t border-gray-100">
                    <td className="py-2 flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${POWER_COLORS[powerId]}`} />
                      <span className={isEliminated ? 'text-gray-400' : 'text-gray-800'}>
                        {POWER_NAMES[powerId]}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono">
                      {scCount}
                    </td>
                    <td className="py-2 text-right">
                      {isWinner && (
                        <span className="text-xs font-semibold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">
                          Winner
                        </span>
                      )}
                      {inDraw && (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                          Draw
                        </span>
                      )}
                      {isEliminated && (
                        <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                          Eliminated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Buttons */}
        <div className="px-6 py-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onNewGame}
            className="flex-1 py-2.5 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-700"
          >
            New Game
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
