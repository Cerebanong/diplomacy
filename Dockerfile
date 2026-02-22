FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/backend/package.json ./packages/backend/
RUN npm ci --omit=dev
COPY packages/backend/dist/ ./packages/backend/dist/
ENV PORT=8080
EXPOSE 8080
CMD ["node", "packages/backend/dist/index.js"]
