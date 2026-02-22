import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../../.env'), override: true });
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createGameRouter } from './routes/game.js';
import { createNegotiationRouter } from './routes/negotiation.js';
import { GameManager } from './game/GameManager.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Shared game manager (single instance for both routers)
const gameManager = new GameManager();

// Routes
app.use('/api/game', createGameRouter(gameManager));
app.use('/api/negotiation', createNegotiationRouter(gameManager));

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Diplomacy backend running on port ${PORT}`);
});

export default app;
