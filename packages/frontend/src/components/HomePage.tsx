import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PowerId } from '@diplomacy/shared';
import { MAP_STYLES } from '@diplomacy/shared';
import { Crown, Swords, Users, Coins, Map, ChevronDown, Settings } from 'lucide-react';
import { apiUrl } from '../config';

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
  { value: 'chat', label: 'DeepSeek V3 (Fast, Lower Cost)', cost: '~$0.08/game' },
  { value: 'reasoner', label: 'DeepSeek R1 (Smarter, Higher Cost)', cost: '~$0.25/game' },
];

export function HomePage() {
  const navigate = useNavigate();
  const [selectedPower, setSelectedPower] = useState<PowerId | null>(null);
  const [mapStyle, setMapStyle] = useState('classic');
  const [victoryCondition, setVictoryCondition] = useState(18);
  const [aiModel, setAiModel] = useState<'chat' | 'reasoner'>('chat');
  const [isCreating, setIsCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const handleCreateGame = async () => {
    if (!selectedPower) return;

    setIsCreating(true);
    try {
      const response = await fetch(apiUrl('/api/game/create'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant: 'classic',
          mapStyle,
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

  const settingsSummary = `${MAP_STYLES.find(s => s.id === mapStyle)?.name} map · ${VICTORY_CONDITIONS.find(v => v.value === victoryCondition)?.label} · ${AI_MODELS.find(m => m.value === aiModel)?.label.split(' (')[0]}`;

  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      {/* Title */}
      <div className="text-center mb-6">
        <h1 className="text-5xl font-serif font-bold text-gray-800 mb-1 tracking-wide">
          DIPLOMACY
        </h1>
        <p className="text-lg text-gray-600 italic">
          The Game of International Intrigue
        </p>
        <div className="flex items-center justify-center gap-2 mt-2 text-gray-500 text-sm">
          <Swords size={16} />
          <span>Negotiate · Strategize · Conquer</span>
          <Crown size={16} />
        </div>
      </div>

      {/* Game Setup */}
      <div className="bg-white/80 backdrop-blur rounded-lg shadow-xl p-6 max-w-3xl w-full">
        <h2 className="text-lg font-serif font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users size={20} />
          Choose Your Power
        </h2>

        <div className="grid grid-cols-4 lg:grid-cols-7 gap-3 mb-2">
          {POWERS.map(power => (
            <button
              key={power.id}
              onClick={() => setSelectedPower(power.id)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedPower === power.id
                  ? 'border-yellow-500 ring-2 ring-yellow-300 scale-105'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <div className={`w-7 h-7 rounded-full ${power.color} mx-auto mb-1`} />
              <div className="text-xs font-semibold">{power.name}</div>
            </button>
          ))}
        </div>

        <p className="text-gray-500 mb-4 text-center italic text-sm h-5">
          {selectedPower ? POWERS.find(p => p.id === selectedPower)?.description : ''}
        </p>

        {/* Collapsible Game Settings */}
        <div className="border border-gray-200 rounded-lg mb-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Settings size={16} />
              Game Settings
            </div>
            <div className="flex items-center gap-3">
              {!showSettings && (
                <span className="text-xs text-gray-400">{settingsSummary}</span>
              )}
              <ChevronDown
                size={16}
                className={`text-gray-400 transition-transform ${showSettings ? 'rotate-180' : ''}`}
              />
            </div>
          </button>

          {showSettings && (
            <div className="px-4 pb-4 space-y-4 border-t border-gray-100">
              {/* Map Style */}
              <div className="pt-3">
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <Map size={14} />
                  Map Style
                </label>
                <select
                  value={mapStyle}
                  onChange={e => setMapStyle(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  {MAP_STYLES.map(style => (
                    <option key={style.id} value={style.id} disabled={!style.available}>
                      {style.name}{!style.available ? ' (Coming Soon)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Victory Condition */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Victory Condition
                </label>
                <select
                  value={victoryCondition}
                  onChange={e => setVictoryCondition(Number(e.target.value))}
                  className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  {VICTORY_CONDITIONS.map(vc => (
                    <option key={vc.value} value={vc.value}>
                      {vc.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Model */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
                  <Coins size={14} />
                  AI Opponents Model
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {AI_MODELS.map(model => (
                    <button
                      key={model.value}
                      onClick={() => setAiModel(model.value as 'chat' | 'reasoner')}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        aiModel === model.value
                          ? 'border-yellow-500 bg-yellow-50'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="font-semibold text-sm">{model.label}</div>
                      <div className="text-xs text-gray-500">{model.cost}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Start Button */}
        <button
          onClick={handleCreateGame}
          disabled={!selectedPower || isCreating}
          className={`w-full py-3 rounded-lg text-lg font-semibold transition-all ${
            selectedPower && !isCreating
              ? 'bg-gray-800 text-white hover:bg-gray-700 active:scale-98'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isCreating ? 'Creating Game...' : 'Begin Campaign'}
        </button>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center text-gray-500 text-xs">
        <p>Classic Diplomacy (1901) · 7 Players · AI Opponents Powered by DeepSeek</p>
      </div>
    </div>
  );
}
