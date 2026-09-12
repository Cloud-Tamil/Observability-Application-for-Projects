# ShopSphere

A full-stack e-commerce starter: Node + TypeScript + Prisma + Postgres API, React + Vite + Tailwind web app, wired together with Docker Compose.

## Stack

| Layer     | Tech                                                          |
|-----------|---------------------------------------------------------------|
| API       | Node 20, Express, TypeScript, Prisma, Zod, JWT, Pino           |
| Web       | React 18, Vite, TypeScript, Tailwind, React Router, React Query, Zustand |
| Database  | PostgreSQL 16                                                 |
| Container | Docker, Docker Compose, nginx                                 |

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Web:  http://localhost:8080
- API:  http://localhost:4000/health

Seed users (created automatically when `SEED_ON_START=true`):

| Email                     | Password         | Role     |
|---------------------------|------------------|----------|
| admin@shopsphere.dev      | admin12345       | ADMIN    |
| customer@shopsphere.dev   | customer12345    | CUSTOMER |

## Local development (no Docker for app, DB in Docker)

```bash
docker compose up -d db

# API
cd server
npm install
npx prisma migrate dev
npm run seed
npm run dev          # http://localhost:4000

# Web
cd ../web
npm install
npm run dev          # http://localhost:5173
```

## API surface

```
POST   /api/auth/register     { email, password, name }
POST   /api/auth/login        { email, password }
POST   /api/auth/refresh      { refreshToken }
POST   /api/auth/logout       { refreshToken }
GET    /api/auth/me           Bearer

GET    /api/products
GET    /api/products/:slug

GET    /api/cart              Bearer
POST   /api/cart/items        Bearer { productId, quantity }
PATCH  /api/cart/items/:id    Bearer { quantity }
DELETE /api/cart/items/:id    Bearer
DELETE /api/cart              Bearer
```
