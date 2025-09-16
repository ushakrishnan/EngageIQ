# Backend — EngageIQ

This folder contains the backend admin server and utility scripts used to manage local development, seeding, and migrations for the app.

Quick start (local):

1. Install dependencies
   cd backend
   npm install

2. Configure environment
   - Copy `.env.example` to `.env` and update values OR run `npm run setup` to interactively create a `.env`.

3. Run the admin server (dev):
   npm run dev

4. Useful commands
   - npm run setup               # Runs the interactive setup wizard and writes .env
   - npm run seed                # Run destructive fresh seed: recreates containers and seed demo data
   - npm run ensure-containers   # Create required Cosmos containers and seed data
   - npm run postinstall-setup   # Create .env from .env.example if missing (non-fatal)
   - npm run dev                 # Start admin server (TypeScript dev: ts:dev)
   - npm run build               # Compile TypeScript (ts:build)
   - npm run start               # Start compiled server (ts:start)

Scripts and utilities are located in `backend/scripts/` — run them from the backend directory, e.g.:

  cd backend && node ./scripts/fresh-seed-all.mjs

Notes
- For strict separation, all management scripts now live under `backend/scripts`.
- The frontend code expects Vite variables to be prefixed with `VITE_` (see `frontend/.env.development` and `frontend/.env.production` for examples).
- Do not commit secrets; use `.env` for local testing only or use a secrets manager for CI/CD.

### Quick commands (copy/paste)

From the repository root (recommended):

- Install backend deps:
  - npm --prefix backend install

- Run TypeScript dev server (hot reload):
  - npm --prefix backend run dev

- Build (compile TypeScript to dist):
  - npm --prefix backend run build

- Start built server:
  - npm --prefix backend run start

- Build + start detached (background):
  - npm --prefix backend run ts:detach

- Seed demo data (destructive):
  - npm --prefix backend run seed

- Run a CLI wrapper command (examples):
  - npm --prefix backend run cli -- seed
  - npm --prefix backend run cli -- validate-cosmos

Or, from inside the `backend/` folder (alternative):

- npm install
- npm run dev
- npm run build
- npm run start
- npm run ts:detach
- npm run seed
- npm run cli -- seed

Note: If you are using the Azure Cosmos DB emulator (local) which uses a self-signed TLS certificate, set `ALLOW_SELF_SIGNED_TLS=1` in your `backend/.env` (or install the emulator cert in the OS trust store). This will temporarily allow the server and validation scripts to accept the emulator cert for local development only.

Example (repo-root):
```
# in PowerShell (temporary for this session)
$env:ALLOW_SELF_SIGNED_TLS = '1'; npm --prefix backend run validate-cosmos
```
