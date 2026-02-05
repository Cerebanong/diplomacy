# Diplomacy - AI Strategy Game

A web-based implementation of the classic board game Diplomacy, where you play against AI opponents powered by Claude.

## Features

- **Classic Diplomacy Gameplay**: Full implementation of the standard 7-player map (1901)
- **AI Opponents**: 6 AI-controlled powers with distinct, randomly generated personalities
- **Free-form Negotiation**: Chat with AI opponents to form alliances, request support, and negotiate deals
- **Dynamic Trust System**: AI agents track trust levels based on your actions and agreements
- **Post-game Analysis**: Review all AI-to-AI negotiations and trust score histories after the game

## Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Express.js + TypeScript
- **AI**: Claude API (Anthropic)
- **Deployment**: Azure Static Web Apps (frontend) + Azure App Service (backend)

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Anthropic API key

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/diplomacy.git
cd diplomacy

# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Run development servers
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`.

## Project Structure

```
diplomacy/
├── packages/
│   ├── frontend/          # React SPA
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── Map/       # Interactive SVG map
│   │   │   │   ├── Chat/      # Negotiation panel
│   │   │   │   └── Orders/    # Order entry UI
│   │   │   └── ...
│   │   └── ...
│   ├── backend/           # Express API
│   │   ├── src/
│   │   │   ├── game/      # Game state management
│   │   │   ├── ai/        # AI agent logic
│   │   │   ├── routes/    # API endpoints
│   │   │   └── ...
│   │   └── ...
│   └── shared/            # Shared types and utilities
│       ├── src/
│       │   ├── types/     # TypeScript interfaces
│       │   ├── maps/      # Map data
│       │   └── rules/     # Game variants
│       └── ...
├── .github/workflows/     # CI/CD pipelines
└── ...
```

## Game Rules

Diplomacy is a game of negotiation, strategy, and betrayal set in pre-WWI Europe. Key rules:

- **No Dice**: All combat is resolved deterministically based on unit support
- **Simultaneous Moves**: All players submit orders secretly, then all orders resolve at once
- **Support**: Units can support each other's moves or holds
- **Victory**: Control 18 supply centers (configurable)

## AI Behavior

Each AI opponent has a randomly generated personality with traits like:
- Aggressive / Defensive
- Diplomatic / Deceptive
- Loyal / Opportunistic
- Cautious / Bold

AI agents negotiate with each other (hidden from the player) and maintain trust scores based on past interactions.

## API Costs

The game uses Claude API for AI negotiations. Estimated costs:
- **Claude Haiku**: ~$0.50 per full game
- **Claude Sonnet**: ~$2.00 per full game

A cost counter is displayed during gameplay.

## Deployment

### Azure Setup

1. Create Azure resources:
   - App Service (for backend): `diplomacy-api-dev` and `diplomacy-api-prod`
   - Static Web App (for frontend): dev and prod instances

2. Configure GitHub secrets:
   - `AZURE_CREDENTIALS`: Service principal JSON
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_DEV`: Dev Static Web App token
   - `AZURE_STATIC_WEB_APPS_API_TOKEN_PROD`: Prod Static Web App token

3. Set up custom domains:
   - Dev: `devdiplomacy.kevinandpauline.com`
   - Prod: `diplomacy.kevinandpauline.com`

## Future Plans

- [ ] Additional map variants (Colonial, Ancient Mediterranean)
- [ ] Save/load game state
- [ ] Full DATC-compliant adjudicator integration
- [ ] Replay system
- [ ] Multiplayer support

## License

MIT
