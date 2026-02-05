import { useState, useEffect, useRef } from 'react';
import type { GameState, PowerId, Message } from '@diplomacy/shared';
import { Send } from 'lucide-react';

interface NegotiationPanelProps {
  gameState: GameState;
  gameId: string;
  selectedPower: PowerId;
  onSelectPower: (power: PowerId) => void;
}

const POWERS: { id: PowerId; name: string; color: string }[] = [
  { id: 'england', name: 'England', color: 'bg-england' },
  { id: 'france', name: 'France', color: 'bg-france' },
  { id: 'germany', name: 'Germany', color: 'bg-germany' },
  { id: 'italy', name: 'Italy', color: 'bg-italy' },
  { id: 'austria', name: 'Austria', color: 'bg-austria' },
  { id: 'russia', name: 'Russia', color: 'bg-russia' },
  { id: 'turkey', name: 'Turkey', color: 'bg-turkey' },
];

export function NegotiationPanel({
  gameState,
  gameId,
  selectedPower,
  onSelectPower,
}: NegotiationPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const otherPowers = POWERS.filter(p => p.id !== gameState.playerPower);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/negotiation/${gameId}/channel/${selectedPower}`);
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [gameId, selectedPower]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/negotiation/${gameId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: selectedPower,
          content: newMessage.trim(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMessages(prev => [...prev, result.playerMessage, result.aiResponse]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const selectedPowerInfo = POWERS.find(p => p.id === selectedPower);

  return (
    <div className="flex flex-col h-full">
      {/* Power Tabs */}
      <div className="flex gap-1 p-2 border-b border-gray-200 overflow-x-auto">
        {otherPowers.map(power => (
          <button
            key={power.id}
            onClick={() => onSelectPower(power.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap ${
              selectedPower === power.id
                ? 'bg-gray-200 font-semibold'
                : 'hover:bg-gray-100'
            }`}
          >
            <div className={`w-3 h-3 rounded-full ${power.color}`} />
            {power.name}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No messages with {selectedPowerInfo?.name} yet.</p>
            <p className="text-sm mt-2">Start a conversation to negotiate!</p>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`chat-message ${
                message.isHuman ? 'ml-8' : 'mr-8'
              }`}
            >
              <div
                className={`p-3 rounded-lg ${
                  message.isHuman
                    ? 'bg-gray-800 text-white ml-auto'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                <div className="text-xs text-gray-500 mb-1">
                  {message.isHuman ? 'You' : selectedPowerInfo?.name}
                </div>
                <p className="text-sm">{message.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder={`Message ${selectedPowerInfo?.name}...`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent"
            disabled={isSending}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || isSending}
            className={`px-4 py-2 rounded-lg ${
              newMessage.trim() && !isSending
                ? 'bg-gray-800 text-white hover:bg-gray-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
