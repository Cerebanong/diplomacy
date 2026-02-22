import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { GameState, PowerId } from '@diplomacy/shared';
import { GameMap } from './Map/GameMap';
import { NegotiationPanel } from './Chat/NegotiationPanel';
import { OrdersPanel } from './Orders/OrdersPanel';
import { HistoryPanel } from './History/HistoryPanel';
import { GameHeader } from './GameHeader';
import { GameEndModal } from './GameEndModal';
import { useToast } from './Toast';
import { apiUrl } from '../config';

type LogbookTab = 'orders' | 'diplomacy';

const POWER_NAMES: Record<string, string> = {
  england: 'England',
  france: 'France',
  germany: 'Germany',
  italy: 'Italy',
  austria: 'Austria-Hungary',
  russia: 'Russia',
  turkey: 'Turkey',
};

export function GamePage() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [aiNegotiationsInProgress, setAiNegotiationsInProgress] = useState(false);
  const [activeTab, setActiveTab] = useState<LogbookTab>('orders');
  const [selectedPower, setSelectedPower] = useState<PowerId>('england');
  const [error, setError] = useState<string | null>(null);
  const [showEndModal, setShowEndModal] = useState(false);

  // Track previous powers state for elimination detection
  const prevPowersRef = useRef<Record<PowerId, { isEliminated: boolean }> | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const fetchGame = async () => {
      try {
        const response = await fetch(apiUrl(`/api/game/${gameId}/status`));
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

    // Poll for AI negotiation status — skip if game is complete
    const interval = setInterval(async () => {
      if (gameState?.isComplete) return;
      try {
        const response = await fetch(apiUrl(`/api/negotiation/${gameId}/ai-status`));
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

  // Show end modal when game becomes complete
  useEffect(() => {
    if (gameState?.isComplete) {
      setShowEndModal(true);
    }
  }, [gameState?.isComplete]);

  // Detect elimination changes
  useEffect(() => {
    if (!gameState) return;

    const prev = prevPowersRef.current;
    if (prev) {
      for (const powerId of Object.keys(gameState.powers) as PowerId[]) {
        const wasEliminated = prev[powerId]?.isEliminated;
        const isEliminated = gameState.powers[powerId].isEliminated;
        if (!wasEliminated && isEliminated) {
          addToast(`${POWER_NAMES[powerId]} has been eliminated!`, 'warning', 6000);
        }
      }
    }

    // Save current state for next comparison
    const snapshot: Record<PowerId, { isEliminated: boolean }> = {} as any;
    for (const powerId of Object.keys(gameState.powers) as PowerId[]) {
      snapshot[powerId] = { isEliminated: gameState.powers[powerId].isEliminated };
    }
    prevPowersRef.current = snapshot;
  }, [gameState, addToast]);

  const handleProposeDraw = async () => {
    if (!gameId) return;
    if (!window.confirm('Are you sure you want to propose a draw? This will end the game immediately.')) return;

    try {
      const response = await fetch(apiUrl(`/api/game/${gameId}/draw`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        setGameState(data.state);
      } else {
        const err = await response.json();
        addToast(err.error || 'Failed to propose draw', 'error');
      }
    } catch (err) {
      console.error('Failed to propose draw:', err);
      addToast('Failed to propose draw', 'error');
    }
  };

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
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <GameHeader
        gameState={gameState}
        aiNegotiationsInProgress={aiNegotiationsInProgress}
        onProposeDraw={handleProposeDraw}
      />

      {/* Desk Surface */}
      <div className="desk-surface flex-1 flex min-h-0 px-5 py-4 gap-5">
        {/* LEFT: Logbook + Tabs */}
        <div className="flex-shrink-0 flex flex-row min-h-0">
          {/* Logbook Panel */}
          <div className="logbook w-[420px] flex flex-col min-h-0 relative">
            <div className="logbook-spine" />
            <div className="ml-3 flex-1 flex flex-col overflow-hidden">
              {activeTab === 'orders' && (
                <OrdersPanel
                  gameState={gameState}
                  gameId={gameId!}
                  aiNegotiationsInProgress={aiNegotiationsInProgress}
                  onOrdersSubmitted={(newState) => setGameState(newState)}
                />
              )}
              {activeTab === 'diplomacy' && (
                <NegotiationPanel
                  gameState={gameState}
                  gameId={gameId!}
                  selectedPower={selectedPower}
                  onSelectPower={setSelectedPower}
                />
              )}
            </div>
          </div>

          {/* Tab Column */}
          <div className="flex flex-col gap-1 pt-4 ml-[-1px]">
            {(['orders', 'diplomacy'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`logbook-tab ${activeTab === tab ? 'active' : 'inactive'}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* CENTER: Map */}
        <div className="flex-1 min-h-0 min-w-0 p-0">
          <GameMap
            gameState={gameState}
            onTerritoryClick={(territoryId) => console.log('Clicked:', territoryId)}
          />
        </div>

        {/* RIGHT: Parchment Scroll */}
        <div className="w-[320px] flex-shrink-0 px-2 min-h-0">
          <div className="parchment-scroll h-full">
            <div className="scroll-rod" />
            <div className="scroll-parchment">
              <HistoryPanel
                gameState={gameState}
                gameId={gameId!}
              />
            </div>
            <div className="scroll-rod" />
          </div>
        </div>
      </div>

      {/* Game End Modal */}
      {showEndModal && gameState.isComplete && (
        <GameEndModal
          gameState={gameState}
          onClose={() => setShowEndModal(false)}
          onNewGame={() => navigate('/')}
        />
      )}
    </div>
  );
}
