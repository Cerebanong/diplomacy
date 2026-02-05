import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PowerId } from '@diplomacy/shared';
import { Crown, Swords, Users, Coins } from 'lucide-react';

const POWERS: { id: PowerId; name: string; color: string; description: string }[] = [
  { id: 'england', name: 'England', color: 'bg-england', description: 'Island nation with strong naval position' },
  { id: 'france', name: 'France', color: 'bg-france', description: 'Central power with multiple fronts' },
  { id: 'germany', name: 'Germany', color: 'bg-germany', description: 'Powerful center position, many neighbors' },
  { id: 'italy', name: 'Italy', color: 'bg-italy', description: 'Mediterranean power with defensive options' },
  { id: 'austria', name: 'Austria-Hungary', color: 'bg-austria', description: 'Challenging central position' },
  { id: 'russia', name: 'Russia', color: 'bg-russia', description: 'Largest power, spread across the map' },
  { id: 'turkey', name: 'Turkey', color: 'bg-turkey', description: 'Corner position with strong defense' },
];

const VICTORY_CONDITIONS = [
  { value: 15, label: 'Short Game (15 SC)' },
  { value: 18, label: 'Standard (18 SC)' },
  { value: 24, label: 'Long Game (24 SC)' },
  { value: 34, label: 'Total Domination (34 SC)' },
];

const AI_MODELS = [
  { value: 'haiku', label: 'Claude Haiku (Fast, Lower Cost)', cost: '~$0.50/game' },
  { value: 'sonnet', label: 'Claude Sonnet (Smarter, Higher Cost)', cost: '~$2.00/game' },
];

export function HomePage() {
  const navigate = useNavigate();
  const [selectedPower, setSelectedPower] = useState<PowerId | null>(null);
  const [victoryCondition, setVictoryCondition] = useState(18);
  const [aiModel, setAiModel] = useState<'haiku' | 'sonnet'>('haiku');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGame = async () => {
    if (!selectedPower) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/game/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant: 'classic',
          playerPower: selectedPower,
          victoryCondition,
          aiModel,
        }),
      });

      if (!response.ok) throw new Error('Failed to create game');

      const { gameId } = await response.json();
      navigate(`/game/${gameId}`);
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Failed to create game. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-serif font-bold text-gray-800 mb-4 tracking-wide">
          DIPLOMACY
        </h1>
        <p className="text-xl text-gray-600 italic">
          The Game of International Intrigue
        </p>
        <div className="flex items-center justify-center gap-2 mt-4 text-gray-500">
          <Swords size={20} />
          <span>Negotiate • Strategize • Conquer</span>
          <Crown size={20} />
        </div>
      </div>

      {/* Game Setup */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-xl p-8 max-w-4xl w-full">
        <h2 className="text-2xl font-serif font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <Users size={24} />
          Choose Your Power
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          {POWERS.map(power => (
            <button
              key={power.id}
              onClick={() => setSelectedPower(power.id)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedPower === power.id
                  ? 'border-yellow-500 ring-2 ring-yellow-300 scale-105'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className={`w-8 h-8 rounded-full ${power.color} mx-auto mb-2`} />
              <div className="text-sm font-semibold">{power.name}</div>
            </button>
          ))}
        </div>

        {selectedPower && (
          <p className="text-gray-600 mb-6 text-center italic">
            {POWERS.find(p => p.id === selectedPower)?.description}
          </p>
        )}

        {/* Victory Condition */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Victory Condition
          </label>
          <select
            value={victoryCondition}
            onChange={e => setVictoryCondition(Number(e.target.value))}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
          >
            {VICTORY_CONDITIONS.map(vc => (
              <option key={vc.value} value={vc.value}>
                {vc.label}
              </option>
            ))}
          </select>
        </div>

        {/* AI Model */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
            <Coins size={16} />
            AI Opponents Model
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AI_MODELS.map(model => (
              <button
                key={model.value}
                onClick={() => setAiModel(model.value as 'haiku' | 'sonnet')}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  aiModel === model.value
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <div className="font-semibold">{model.label}</div>
                <div className="text-sm text-gray-500">{model.cost}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={handleCreateGame}
          disabled={!selectedPower || isCreating}
          className={`w-full py-4 rounded-lg text-xl font-semibold transition-all ${
            selectedPower && !isCreating
              ? 'bg-gray-800 text-white hover:bg-gray-700 active:scale-98'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isCreating ? 'Creating Game...' : 'Begin Campaign'}
        </button>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Classic Diplomacy (1901) • 7 Players • AI Opponents Powered by Claude</p>
      </div>
    </div>
  );
}
