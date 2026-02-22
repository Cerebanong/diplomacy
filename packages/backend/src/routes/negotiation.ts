import { Router } from 'express';
import { z } from 'zod';
import { GameManager } from '../game/GameManager.js';

// Schema for sending a message
const sendMessageSchema = z.object({
  to: z.enum(['england', 'france', 'germany', 'italy', 'austria', 'russia', 'turkey']),
  content: z.string().min(1).max(2000),
});

export function createNegotiationRouter(gameManager: GameManager) {
  const negotiationRouter = Router();

  /**
   * GET /api/negotiation/:gameId/channels
   * Get all negotiation channels for the player
   */
  negotiationRouter.get('/:gameId/channels', (req, res) => {
    const channels = gameManager.getPlayerChannels(req.params.gameId);
    if (!channels) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json(channels);
  });

  /**
   * GET /api/negotiation/:gameId/channel/:power
   * Get messages in a specific channel
   */
  negotiationRouter.get('/:gameId/channel/:power', (req, res) => {
    const messages = gameManager.getChannelMessages(
      req.params.gameId,
      req.params.power as any
    );
    if (!messages) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }
    res.json(messages);
  });

  /**
   * POST /api/negotiation/:gameId/send
   * Send a message to another power
   */
  negotiationRouter.post('/:gameId/send', async (req, res) => {
    try {
      const { to, content } = sendMessageSchema.parse(req.body);
      const result = await gameManager.sendMessage(req.params.gameId, to, content);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid message', details: error.errors });
      } else if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
      }
    }
  });

  /**
   * GET /api/negotiation/:gameId/ai-status
   * Check if AI negotiations are complete
   */
  negotiationRouter.get('/:gameId/ai-status', (req, res) => {
    const status = gameManager.getAiNegotiationStatus(req.params.gameId);
    if (!status) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json(status);
  });

  /**
   * GET /api/negotiation/:gameId/reveal
   * Reveal all AI-to-AI negotiations (post-game only)
   */
  negotiationRouter.get('/:gameId/reveal', (req, res) => {
    const revealed = gameManager.revealAllNegotiations(req.params.gameId);
    if (!revealed) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    if (revealed.error) {
      res.status(400).json({ error: revealed.error });
      return;
    }
    res.json(revealed);
  });

  return negotiationRouter;
}
