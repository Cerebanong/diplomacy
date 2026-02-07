import { useState, useEffect } from 'react';
import type { GameState, Order } from '@diplomacy/shared';
import { Play, Trash2, Plus } from 'lucide-react';
import { apiUrl } from '../../config';

interface OrdersPanelProps {
  gameState: GameState;
  gameId: string;
  aiNegotiationsInProgress: boolean;
  onOrdersSubmitted: (newState: GameState) => void;
}

type OrderType = 'hold' | 'move' | 'support' | 'convoy';

interface DraftOrder {
  id: string;
  unitType: 'army' | 'fleet';
  location: string;
  type: OrderType;
  destination?: string;
  supportedUnit?: { type: 'army' | 'fleet'; location: string };
  supportDestination?: string;
}

export function OrdersPanel({
  gameState,
  gameId,
  aiNegotiationsInProgress,
  onOrdersSubmitted,
}: OrdersPanelProps) {
  const [orders, setOrders] = useState<DraftOrder[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [turnResult, setTurnResult] = useState<string | null>(null);

  useEffect(() => {
    if (turnResult) {
      const timer = setTimeout(() => setTurnResult(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [turnResult]);

  const playerPower = gameState.powers[gameState.playerPower];
  const units = playerPower.units;

  const addOrder = (unit: typeof units[0]) => {
    const existingOrder = orders.find(o => o.location === unit.territory);
    if (existingOrder) return;

    setOrders(prev => [
      ...prev,
      {
        id: `${unit.territory}-${Date.now()}`,
        unitType: unit.type,
        location: unit.territory,
        type: 'hold',
      },
    ]);
  };

  const updateOrder = (id: string, updates: Partial<DraftOrder>) => {
    setOrders(prev =>
      prev.map(o => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const removeOrder = (id: string) => {
    setOrders(prev => prev.filter(o => o.id !== id));
  };

  const formatPhase = (phase: string, year: number) => {
    const name = phase.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    return `${name} ${year}`;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Add hold orders for any units without orders
      const finalOrders: Order[] = units.map(unit => {
        const existingOrder = orders.find(o => o.location === unit.territory);
        if (existingOrder) {
          return {
            power: gameState.playerPower,
            type: existingOrder.type,
            unitType: existingOrder.unitType,
            location: existingOrder.location,
            destination: existingOrder.destination,
            supportedUnit: existingOrder.supportedUnit,
            supportDestination: existingOrder.supportDestination,
          } as Order;
        }
        return {
          power: gameState.playerPower,
          type: 'hold' as const,
          unitType: unit.type,
          location: unit.territory,
        };
      });

      const previousPhase = formatPhase(gameState.phase, gameState.year);

      const response = await fetch(apiUrl(`/api/game/${gameId}/orders`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orders: finalOrders }),
      });

      if (response.ok) {
        const result = await response.json();
        const newPhase = formatPhase(result.newState.phase, result.newState.year);
        setTurnResult(`${previousPhase} resolved — advancing to ${newPhase}`);
        setOrders([]);
        onOrdersSubmitted(result.newState);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit orders');
      }
    } catch (err) {
      console.error('Failed to submit orders:', err);
      alert('Failed to submit orders');
    } finally {
      setIsSubmitting(false);
    }
  };

  const unorderedUnits = units.filter(
    u => !orders.some(o => o.location === u.territory)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-800">
          {gameState.phase.replace('_', ' ').toUpperCase()}
        </h3>
        <p className="text-sm text-gray-500">
          {orders.length} of {units.length} units have orders
        </p>
      </div>

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Existing Orders */}
        {orders.map(order => (
          <div
            key={order.id}
            className="bg-gray-50 rounded-lg p-3 border border-gray-200"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">
                {order.unitType === 'army' ? 'A' : 'F'} {order.location.toUpperCase()}
              </span>
              <button
                onClick={() => removeOrder(order.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <select
                value={order.type}
                onChange={e => updateOrder(order.id, { type: e.target.value as OrderType })}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              >
                <option value="hold">Hold</option>
                <option value="move">Move</option>
                <option value="support">Support</option>
                {order.unitType === 'fleet' && <option value="convoy">Convoy</option>}
              </select>

              {order.type === 'move' && (
                <input
                  type="text"
                  placeholder="Destination (e.g., bur)"
                  value={order.destination || ''}
                  onChange={e => updateOrder(order.id, { destination: e.target.value.toLowerCase() })}
                  className="w-full p-2 border border-gray-300 rounded text-sm"
                />
              )}

              {order.type === 'support' && (
                <>
                  <input
                    type="text"
                    placeholder="Supported unit location"
                    value={order.supportedUnit?.location || ''}
                    onChange={e =>
                      updateOrder(order.id, {
                        supportedUnit: { type: 'army', location: e.target.value.toLowerCase() },
                      })
                    }
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Support destination (optional)"
                    value={order.supportDestination || ''}
                    onChange={e => updateOrder(order.id, { supportDestination: e.target.value.toLowerCase() })}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                </>
              )}
            </div>
          </div>
        ))}

        {/* Unordered Units */}
        {unorderedUnits.length > 0 && (
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm text-gray-500 mb-2">Units without orders:</p>
            <div className="space-y-2">
              {unorderedUnits.map(unit => (
                <button
                  key={unit.territory}
                  onClick={() => addOrder(unit)}
                  className="w-full flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <span>
                    {unit.type === 'army' ? 'A' : 'F'} {unit.territory.toUpperCase()}
                  </span>
                  <Plus size={16} className="text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="p-4 border-t border-gray-200">
        {turnResult && (
          <div className="mb-3 text-center py-2 px-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium">
            {turnResult}
          </div>
        )}
        {aiNegotiationsInProgress && (
          <div className="mb-3 text-center text-yellow-600 animate-pulse text-sm">
            AI diplomats are negotiating...
          </div>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
            isSubmitting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gray-800 text-white hover:bg-gray-700'
          }`}
        >
          <Play size={20} />
          {isSubmitting ? 'Resolving...' : aiNegotiationsInProgress ? 'Submit Orders' : 'Resolve Turn'}
        </button>
      </div>
    </div>
  );
}
