import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { GameState, PowerId } from '@diplomacy/shared';
import { GameMap } from './Map/GameMap';
import { NegotiationPanel } from './Chat/NegotiationPanel';
import { OrdersPanel } from './Orders/OrdersPanel';
import { GameHeader } from './GameHeader';

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [aiNegotiationsInProgress, setAiNegotiationsInProgress] = useState(false);
  const [selectedPower, setSelectedPower] = useState<PowerId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/game/${gameId}/status`);
        if (!response.ok) throw new Error('Failed to fetch game');
        const data = await response.json();
        setGameState(data.state);
        setAiNegotiationsInProgress(data.aiNegotiationsInProgress);
      } catch (err) {
        setError('Failed to load game');
        console.error(err);
      }
    };

    fetchGame();

    // Poll for AI negotiation status
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/negotiation/${gameId}/ai-status`);
        if (response.ok) {
          const status = await response.json();
          setAiNegotiationsInProgress(status.inProgress);
        }
      } catch (err) {
        console.error('Failed to check AI status:', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [gameId]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 text-red-700 p-6 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Loading game...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <GameHeader
        gameState={gameState}
        aiNegotiationsInProgress={aiNegotiationsInProgress}
      />

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Map Area */}
        <div className="flex-1 p-4">
          <GameMap
            gameState={gameState}
            onTerritoryClick={(territoryId) => console.log('Clicked:', territoryId)}
          />
        </div>

        {/* Side Panel */}
        <div className="w-96 border-l border-gray-300 flex flex-col bg-white/90">
          {/* Tabs */}
          <div className="flex border-b border-gray-300">
            <button
              onClick={() => setSelectedPower(null)}
              className={`flex-1 py-3 px-4 text-sm font-semibold ${
                selectedPower === null
                  ? 'bg-gray-100 border-b-2 border-gray-800'
                  : 'hover:bg-gray-50'
              }`}
            >
              Orders
            </button>
            <button
              onClick={() => setSelectedPower(selectedPower || 'england')}
              className={`flex-1 py-3 px-4 text-sm font-semibold ${
                selectedPower !== null
                  ? 'bg-gray-100 border-b-2 border-gray-800'
                  : 'hover:bg-gray-50'
              }`}
            >
              Diplomacy
            </button>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-hidden">
            {selectedPower === null ? (
              <OrdersPanel
                gameState={gameState}
                gameId={gameId!}
                aiNegotiationsInProgress={aiNegotiationsInProgress}
                onOrdersSubmitted={(newState) => setGameState(newState)}
              />
            ) : (
              <NegotiationPanel
                gameState={gameState}
                gameId={gameId!}
                selectedPower={selectedPower}
                onSelectPower={setSelectedPower}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
