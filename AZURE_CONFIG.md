# Azure Configuration

> Last updated: 2026-02-20

## Subscription

- **Name**: MacroQuality Azure subscription 1
- **ID**: `0c22dded-e5db-4947-8741-c74fa6f41157`
- **Region**: westus2

## Resource Group

All resources are in **personal-apps-rg**, shared with other personal apps (Family Photos, Auction Finder, Landing Page).

## Architecture

```
diplomacy.kevinandpauline.com
        |
  [Static Web App]  diplomacy-frontend-prod (Free)
        |
  [Container App]   diplomacy-api-prod (scale-to-zero)
```

No database or storage currently. Game state is in-memory. If persistence is needed later, add a storage account or database.

## Backend - Container App

| Property | Value |
|----------|-------|
| **Name** | diplomacy-api-prod |
| **Resource Group** | personal-apps-rg |
| **Environment** | personal-apps-env |
| **Image** | macroqualityacr.azurecr.io/diplomacy-api:v2 |
| **FQDN** | diplomacy-api-prod.purplemushroom-6e6a3ac6.westus2.azurecontainerapps.io |
| **CPU / Memory** | 0.25 / 0.5Gi |
| **Min / Max Replicas** | 0 / 2 (scales to zero when idle) |
| **Target Port** | 8080 |
| **Ingress** | External |
| **Logging** | Disabled (no Log Analytics) |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | API key for Claude AI (used for AI game opponents) |
| `CORS_ORIGINS` | `https://diplomacy.kevinandpauline.com,https://black-bush-0719d1e1e.1.azurestaticapps.net` |
| `NODE_ENV` | `production` |

## Frontend - Static Web App

| Property | Value |
|----------|-------|
| **Name** | diplomacy-frontend-prod |
| **Resource Group** | personal-apps-rg |
| **SKU** | Free |
| **Default URL** | black-bush-0719d1e1e.1.azurestaticapps.net |
| **Custom Domain** | diplomacy.kevinandpauline.com |

**Important**: The frontend must be configured to call the Container App backend URL (not the old App Service URL). Update the API base URL in the frontend config to: `https://diplomacy-api-prod.purplemushroom-6e6a3ac6.westus2.azurecontainerapps.io`

## Container Registry (shared)

| Property | Value |
|----------|-------|
| **Registry** | macroqualityacr |
| **Login Server** | macroqualityacr.azurecr.io |
| **Repository** | diplomacy-api |
| **Resource Group** | DataToolsRG (shared with DataTools) |

## Deployment

### Build and deploy

The Diplomacy backend has TypeScript compilation issues in Docker (shared package types not resolved). Use the local build approach:

```bash
# 1. Build locally with esbuild (from project root)
npx esbuild packages/backend/src/index.ts \
  --bundle --platform=node --target=node20 \
  --outfile=packages/backend/dist/index.js \
  --format=esm \
  --external:express --external:cors --external:helmet \
  --external:zod --external:dotenv --external:uuid --external:openai \
  --resolve-extensions=.ts,.js

# 2. Build Docker image and push to ACR
az acr build --registry macroqualityacr --image diplomacy-api:v3 --file Dockerfile .

# 3. Update Container App with new image tag
az containerapp update -n diplomacy-api-prod -g personal-apps-rg \
  --image macroqualityacr.azurecr.io/diplomacy-api:v3
```

**Important**: Always use a new image tag (v3, v4, etc.) to force a new Container App revision. Using the same tag may not trigger a redeployment.

### Dockerfile

The Dockerfile is at the project root. It is a single-stage build that copies pre-built dist:
- Installs production npm dependencies
- Copies `packages/backend/dist/` (must be built locally first)
- Runs `node packages/backend/dist/index.js` on port 8080

The `.dockerignore` excludes `packages/shared/dist` and `packages/frontend/dist` but **includes** `packages/backend/dist`.

### Update environment variables

```bash
az containerapp update -n diplomacy-api-prod -g personal-apps-rg \
  --set-env-vars "KEY=value"
```

## Health Check

```bash
curl https://diplomacy-api-prod.purplemushroom-6e6a3ac6.westus2.azurecontainerapps.io/health
# Returns: {"status":"ok","timestamp":"..."}
```

## Previous Architecture (deleted 2026-02-20)

The backend previously ran on a B1 App Service plan (shared with Family Photos, $13/month) in familyphotos-rg. It was migrated to a Container App with scale-to-zero. The old App Service, dev apps, and resource groups were deleted.
