import type { GameState } from '@diplomacy/shared';
import { Calendar, Crown, Coins, Users, Flag } from 'lucide-react';

interface GameHeaderProps {
  gameState: GameState;
  aiNegotiationsInProgress: boolean;
  onProposeDraw: () => void;
}

const PHASE_NAMES: Record<string, string> = {
  spring_orders: 'Spring Orders',
  spring_retreats: 'Spring Retreats',
  fall_orders: 'Fall Orders',
  fall_retreats: 'Fall Retreats',
  winter_builds: 'Winter Adjustments',
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

const POWER_NAMES: Record<string, string> = {
  england: 'England',
  france: 'France',
  germany: 'Germany',
  italy: 'Italy',
  austria: 'Austria-Hungary',
  russia: 'Russia',
  turkey: 'Turkey',
};

export function GameHeader({ gameState, aiNegotiationsInProgress, onProposeDraw }: GameHeaderProps) {
  const playerPower = gameState.powers[gameState.playerPower];

  return (
    <header className="bg-gray-800 text-white px-6 py-3 flex items-center justify-between">
      {/* Left: Year and Phase */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Calendar size={20} />
          <span className="text-xl font-semibold">{gameState.year}</span>
        </div>
        {gameState.isComplete ? (
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <Flag size={16} />
            Game Over
          </div>
        ) : (
          <div className="text-gray-300">
            {PHASE_NAMES[gameState.phase] || gameState.phase}
          </div>
        )}
      </div>

      {/* Center: Player Power */}
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full ${POWER_COLORS[gameState.playerPower]}`} />
        <span className="font-semibold">{POWER_NAMES[gameState.playerPower]}</span>
        <span className="text-gray-400">|</span>
        <div className="flex items-center gap-1">
          <Crown size={16} className="text-yellow-500" />
          <span>{playerPower.supplyCenters.length} / {gameState.victoryCondition} SC</span>
        </div>
        <div className="flex items-center gap-1">
          <Users size={16} className="text-blue-400" />
          <span>{playerPower.units.length} units</span>
        </div>
      </div>

      {/* Right: Draw button, AI Status and Cost */}
      <div className="flex items-center gap-6">
        {!gameState.isComplete && (
          <button
            onClick={onProposeDraw}
            className="px-3 py-1.5 text-sm font-medium text-gray-300 border border-gray-500 rounded hover:bg-gray-700 hover:text-white"
          >
            Propose Draw
          </button>
        )}
        {aiNegotiationsInProgress && (
          <div className="flex items-center gap-2 text-yellow-400 animate-pulse">
            <div className="w-2 h-2 bg-yellow-400 rounded-full" />
            AI diplomats are negotiating...
          </div>
        )}
        <div className="flex items-center gap-2 text-gray-300">
          <Coins size={16} />
          <span>${gameState.totalApiCost.toFixed(4)}</span>
        </div>
      </div>
    </header>
  );
}
