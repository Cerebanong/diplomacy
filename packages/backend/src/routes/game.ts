import { Router } from 'express';
import { z } from 'zod';
import { GameManager } from '../game/GameManager.js';
import type { Order, BuildOrder, RetreatOrder } from '@diplomacy/shared';

// Schema for creating a new game
const createGameSchema = z.object({
  variant: z.string().default('classic'),
  mapStyle: z.string().default('classic'),
  playerPower: z.enum(['england', 'france', 'germany', 'italy', 'austria', 'russia', 'turkey']),
  victoryCondition: z.number().min(1).max(34).default(18),
  aiModel: z.enum(['chat', 'reasoner']).default('chat'),
});

// Schema for submitting orders
const submitOrdersSchema = z.object({
  gameId: z.string().uuid(),
  orders: z.array(z.object({
    type: z.enum(['hold', 'move', 'support', 'convoy']),
    unitType: z.enum(['army', 'fleet']),
    location: z.string(),
    coast: z.string().optional(),
    destination: z.string().optional(),
    destinationCoast: z.string().optional(),
    viaConvoy: z.boolean().optional(),
    supportedUnit: z.object({
      type: z.enum(['army', 'fleet']),
      location: z.string(),
    }).optional(),
    supportDestination: z.string().optional(),
    convoyedArmy: z.object({
      location: z.string(),
    }).optional(),
    convoyDestination: z.string().optional(),
  })),
});

export function createGameRouter(gameManager: GameManager) {
  const gameRouter = Router();

  /**
   * GET /api/game/variants
   * Get available game variants
   */
  gameRouter.get('/variants', (_req, res) => {
    res.json(gameManager.getAvailableVariants());
  });

  /**
   * POST /api/game/create
   * Create a new game
   */
  gameRouter.post('/create', async (req, res) => {
    try {
      const config = createGameSchema.parse(req.body);
      const game = await gameManager.createGame(config);
      res.json(game);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request', details: error.errors });
      } else {
        console.error('Error creating game:', error);
        res.status(500).json({ error: 'Failed to create game' });
      }
    }
  });

  /**
   * GET /api/game/:id
   * Get current game state
   */
  gameRouter.get('/:id', (req, res) => {
    const game = gameManager.getGame(req.params.id);
    if (!game) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json(game);
  });

  /**
   * GET /api/game/:id/status
   * Get game status including AI negotiation state
   */
  gameRouter.get('/:id/status', (req, res) => {
    const status = gameManager.getGameStatus(req.params.id);
    if (!status) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json(status);
  });

  /**
   * POST /api/game/:id/orders
   * Submit player orders and resolve turn
   */
  gameRouter.post('/:id/orders', async (req, res) => {
    try {
      const { orders } = submitOrdersSchema.parse({ ...req.body, gameId: req.params.id });
      // Cast orders - the power field will be added in GameManager
      const result = await gameManager.submitOrders(req.params.id, orders as unknown as Order[]);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid orders', details: error.errors });
      } else if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof Error && error.message.includes('AI negotiations')) {
        res.status(409).json({ error: error.message });
      } else {
        console.error('Error submitting orders:', error);
        res.status(500).json({ error: 'Failed to submit orders' });
      }
    }
  });

  /**
   * POST /api/game/:id/builds
   * Submit player build/disband orders for winter phase
   */
  gameRouter.post('/:id/builds', async (req, res) => {
    try {
      const builds: BuildOrder[] = (req.body.builds || []).map((b: any) => ({
        power: '', // will be set by GameManager
        action: b.action,
        unitType: b.unitType,
        location: b.location,
        coast: b.coast,
      }));
      const result = await gameManager.submitBuilds(req.params.id, builds);
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof Error && error.message.includes('Not in winter')) {
        res.status(409).json({ error: error.message });
      } else {
        console.error('Error submitting builds:', error);
        res.status(500).json({ error: 'Failed to submit builds' });
      }
    }
  });

  /**
   * POST /api/game/:id/retreats
   * Submit player retreat orders
   */
  gameRouter.post('/:id/retreats', async (req, res) => {
    try {
      const retreats: RetreatOrder[] = (req.body.retreats || []).map((r: any) => ({
        power: '' as any,
        unitType: r.unitType,
        location: r.location,
        destination: r.destination,
      }));
      const result = await gameManager.submitRetreats(req.params.id, retreats);
      res.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof Error && error.message.includes('Not in a retreat')) {
        res.status(409).json({ error: error.message });
      } else {
        console.error('Error submitting retreats:', error);
        res.status(500).json({ error: 'Failed to submit retreats' });
      }
    }
  });

  /**
   * POST /api/game/:id/draw
   * Propose a draw (ends game immediately)
   */
  gameRouter.post('/:id/draw', (req, res) => {
    try {
      const state = gameManager.proposeDraw(req.params.id);
      res.json({ state });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof Error && error.message.includes('already complete')) {
        res.status(409).json({ error: error.message });
      } else {
        console.error('Error proposing draw:', error);
        res.status(500).json({ error: 'Failed to propose draw' });
      }
    }
  });

  /**
   * GET /api/game/:id/history
   * Get game history (for post-game analysis)
   */
  gameRouter.get('/:id/history', (req, res) => {
    const history = gameManager.getGameHistory(req.params.id);
    if (!history) {
      res.status(404).json({ error: 'Game not found' });
      return;
    }
    res.json(history);
  });

  return gameRouter;
}
