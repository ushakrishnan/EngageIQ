# EngageIQ — scripts/ directory documentation

> NOTE: For strict frontend/backend separation the utility scripts have been moved to `backend/scripts/`. To run them from the repository root use:
>
>   cd backend && node ./scripts/<script-name>
>
> This document still documents the available operations; the script locations have been centralized under `backend/scripts`.

TOC: Setup · Seeding · Migrations · Validation · Admin tools · Utilities

This document describes the utility scripts under the `scripts/` folder. Each entry follows the same format:

- File: path to script
- Purpose: short description
- Usage: how to run (examples)
- Environment: relevant env vars (if any)
- Notes: additional information, warnings, dependencies

---

### `scripts/postinstall-setup.mjs`
- Purpose: Create a `.env` from `.env.example` during `npm install` if `.env` is missing.
- Usage:
  - Runs automatically on `npm install` (postinstall)
  - Manually: `node ./scripts/postinstall-setup.mjs`
- Environment: none required
- Notes: Non-fatal if `.env.example` or `.env` not present. Keeps install non-blocking.

---

### `scripts/setup.mjs`
- Purpose: Interactive setup wizard (Cosmos-only). Prompts for Cosmos config, writes `.env`, optionally seeds DB and marks setup complete.
- Usage:
  - `node ./scripts/setup.mjs`
  - Called by developers or the `dev-server.mjs` wrapper when setup is missing.
- Environment:
  - Writes: `VITE_DATABASE_PROVIDER`, `VITE_COSMOS_ENDPOINT`, `VITE_COSMOS_KEY`, `VITE_COSMOS_DATABASE_NAME`, etc.
- Notes:
  - Interactive; overwrites `.env` if user confirms. Runs `scripts/create-containers-and-seed.mjs` if seeding requested.

---

### `scripts/setup-cosmos-only.mjs`
- Purpose: Interactive Cosmos-only configuration helper (standalone, non-TS/ESM style code for clarity).
- Usage: `node ./scripts/setup-cosmos-only.mjs`
- Environment: same Cosmos env vars as above
- Notes: A focused variant that only sets up Cosmos-related values and validates connection.

---

### `scripts/quick-setup-cosmos.mjs`
- Purpose: Quick, minimal CLI to populate `.env` with essential Cosmos settings (fast path).
- Usage: `node ./scripts/quick-setup-cosmos.mjs`
- Environment:
  - Writes: `VITE_DATABASE_PROVIDER=cosmos`, `VITE_COSMOS_ENDPOINT`, `VITE_COSMOS_KEY`, `VITE_COSMOS_DATABASE_NAME`, `VITE_COSMOS_CONTAINER_NAME`
- Notes: Non-interactive scripts may read `.env` to preserve existing values.

---

### `scripts/postinstall-setup.mjs` (covered above)

---

### `scripts/create-containers-and-seed.mjs`
- Purpose: Ensure required per-type containers exist in Cosmos and then run the seeder.
- Usage: `node ./scripts/create-containers-and-seed.mjs`
- Environment:
  - `VITE_COSMOS_ENDPOINT`, `VITE_COSMOS_KEY`, `VITE_COSMOS_DATABASE_NAME` (defaults to 'EngageIQ')
- Notes:
  - This script supports local emulator (will temporarily set `NODE_TLS_REJECT_UNAUTHORIZED=0` when running against localhost).
  - Invokes `./seed-data.mjs` to populate sample data.

---

### `scripts/seed-data.mjs`
- Purpose: Module that seeds sample data into Cosmos (users, groups, posts, comments, etc.). Exports `seedSampleData(provider, seedLevel)`.
- Usage:
  - Imported by other scripts (e.g., `create-containers-and-seed.mjs`).
  - Not intended as a standalone CLI but can be used by `node ./scripts/run-seed-cosmos.mjs`.
- Environment: Requires valid Cosmos env vars.
- Notes: Supports seed levels `basic|full|none`.

---

### `scripts/run-seed-cosmos.mjs`
- Purpose: Convenience wrapper that loads `.env` and executes the seeder (`seed-data.mjs`).
- Usage: `node ./scripts/run-seed-cosmos.mjs`
- Environment: same Cosmos env vars
- Notes: Lightweight wrapper; useful in CI or local scripting.

---

### `scripts/fresh-seed-all.mjs`
- Purpose: Recreate per-type containers and seed demo data. Deletes known per-type containers (and a fallback container) first, then re-creates them and seeds data.
- Usage: `node ./scripts/fresh-seed-all.mjs`
- Environment: Cosmos env vars
- Notes:
  - This is destructive: it attempts to delete containers before recreating/seeding; use with caution or only in disposable dev environments.
  - See also: `scripts/smoke-follow-test.mjs` — a lightweight smoke-test script useful for exercising follow/unfollow and karma flows against a seeded demo environment.

---

### `scripts/migrate-cosmos.mjs`
- Purpose: Migration/seed utility. Can seed demo data and run interactive migration operations.
- Usage:
  - Interactive: `node ./scripts/migrate-cosmos.mjs` (prompts to seed/clear)
  - CLI options: `--seed` to seed demo data, `--clear` to clear existing per-type data
- Environment: Cosmos env vars
- Notes: Can be used to seed users/groups/posts in a migration-style workflow. Provides helper functions (`migrateData`, `convertToCosmosFormat`).

---

### `scripts/migrate-data-to-containers.mjs`
  - `VITE_COSMOS_ENDPOINT`, `VITE_COSMOS_KEY`, `VITE_COSMOS_DATABASE_NAME`, and optionally `VITE_COSMOS_CONTAINER_NAME` (source `data` container)
  - Ensures per-type containers exist and upserts converted documents. Good for converting older schemas to the current per-type model.
  - Not destructive (does not delete source items), but you should back up data first.


### `scripts/migrate-per-type-to-data.mjs` (moved to `scripts/tobedeleted/`)

---

### `scripts/cleanup-data-container.mjs`
- Purpose: Iterate over a fallback `data` container and delete all documents (useful when migrating away from the fallback approach).
- Usage: `node ./scripts/cleanup-data-container.mjs`
- Environment: Cosmos env vars
- Notes: Destructive; will remove items found in the configured fallback container (default `data`). Use with care.

---

### `scripts/delete-fallback-container.mjs`
- Purpose: Delete the configured fallback container entirely (container removal).
- Usage: `node ./scripts/delete-fallback-container.mjs`
- Environment: Cosmos env vars
- Notes: Destructive; will remove the container.

---

### `scripts/fix-missing-partitionkey.mjs`
- Purpose: Migration helper to fix documents missing `partitionKey` or `type` fields in a container. Defaults to a dry run; use `--apply` to make changes.
- Usage:
  - Dry run: `node ./scripts/fix-missing-partitionkey.mjs`
  - Apply fixes: `node ./scripts/fix-missing-partitionkey.mjs --apply`
- Environment: Cosmos env vars
- Notes:
  - Performs best-effort type deduction (user/group/post/comment) from document shape. Upserts updated documents to add `partitionKey` and `type`.
  - Runs safely in dry-run mode by default — strongly recommended to review dry-run output before applying.

---

### `scripts/dev-server.mjs` (deprecated)
- Purpose: Previously a convenience wrapper to start the Vite development server and prompt for setup as needed. This helper remains in `backend/scripts/dev-server.mjs` for reference but is deprecated in favor of running Vite directly from the frontend or using the backend TypeScript dev runner.
- Recommended usage now:
  - Run the frontend Vite server directly from the frontend folder:
    - cd frontend && npm run dev
  - For backend TypeScript workflows use:
    - npm --prefix backend run ts:dev
  - If you need to inspect the helper it is still available at `backend/scripts/dev-server.mjs` in this repo (or view it via git history with `git log -p -- backend/scripts/dev-server.mjs`).
- Notes: We recommend running Vite directly from `frontend/` for clarity and reproducibility, and using `backend/` npm scripts for backend-only operations.

---

### `scripts/startup-check.mjs`
- Purpose: Check whether the app needs setup (checks `.env`, `.setup-state`); can run `scripts/setup.mjs` automatically.
- Usage: `node ./scripts/startup-check.mjs`
- Environment: `.env`
- Notes: Useful to detect missing configuration and automatically prompt/trigger setup.

---

### `scripts/setup-status.mjs`
- Purpose: Performs a quick check on `.env` and Cosmos config and reports readiness and next steps.
- Usage: `node ./scripts/setup-status.mjs`
- Environment: `.env`
- Notes: Non-destructive. Good for manual preflight checks.

---

### `scripts/validate-cosmos.mjs`
- Purpose: Validate Cosmos setup by performing test write/read/delete operations and confirming database/container exist.
- Usage: `node ./scripts/validate-cosmos.mjs`
- Environment: `VITE_COSMOS_ENDPOINT`, `VITE_COSMOS_KEY`, `VITE_COSMOS_DATABASE_NAME`, `VITE_COSMOS_CONTAINER_NAME`
- Notes: Useful for CI or troubleshooting connectivity/auth issues.

---

### `scripts/validate-setup.mjs`
- Purpose: Validate overall setup (environment, Cosmos connection, and setup completion marker).
- Usage: `node ./scripts/validate-setup.mjs`
- Environment: `.env` and `.setup-state.json` or `.setup-complete` marker
- Notes: High-level validation script; exits non-zero on failures.

---

### `scripts/ensure-admin-now.mjs`
- Purpose: Upsert a default admin user (`demo-user-admin`) into the configured container (useful for quickly enabling admin-only flows).
- Usage: `node ./scripts/ensure-admin-now.mjs`
- Environment: Cosmos env vars
- Notes: Idempotent — safe to run multiple times. Writes to configured container (default `data` or per-type container as used by the script).

---

### `scripts/set-admin-email.mjs`
- Purpose: Upsert an admin user into the per-type `users` container specifically. Useful to set admin email in per-type model.
- Usage: `node ./scripts/set-admin-email.mjs`
- Environment: Cosmos env vars
- Notes: Safe to run; it will ensure `users` container exists and upsert the admin doc.

---

### `scripts/get-item-by-id.mjs`
- Purpose: Helper to fetch an item from Cosmos by id and partitionKey (reads `.env` and supports fallback partitionKey derivation).
- Usage: `node ./scripts/get-item-by-id.mjs <id> [partitionKey]`
- Environment: `.env` or set env vars directly
- Notes: Useful for quick debugging or data inspection. Defaults partitionKey to the first token of the id when not provided.

---

### `scripts/query-data-posts.mjs`
- Purpose: Query `post` type documents from the configured container and print a summary (id, author, preview)
- Usage: `node ./scripts/query-data-posts.mjs`
- Environment: `.env`
- Notes: Non-destructive. Useful to inspect seeded/demo content.

---

### `scripts/get-audit-logs.mjs` and `scripts/inspect-audit.mjs`
- Purpose:
  - `get-audit-logs.mjs` calls the local admin server (`/admin/audit-logs`) to fetch the last audit logs via HTTP.
  - `inspect-audit.mjs` connects directly to Cosmos and reads from the `audit` container to show recent audit events.
- Usage:
  - `node ./scripts/get-audit-logs.mjs` (requires admin server running: `VITE_ADMIN_SERVER_URL`, default `http://localhost:4000`)
  - `node ./scripts/inspect-audit.mjs` (requires Cosmos env vars)
- Notes: Both are read-only helpers for observability and troubleshooting.

---

### `scripts/write-audit-now.mjs` and `scripts/write-error-now.mjs`
- Purpose: Small test helpers to write an audit or an error document into their respective containers and display recent entries.
- Usage:
  - `node ./scripts/write-audit-now.mjs`
  - `node ./scripts/write-error-now.mjs`
- Environment: Cosmos env vars
- Notes: Useful to verify the audit/error collection pipeline is functional.

---

### `scripts/test-autotag.mjs`
- Purpose: Call the local admin autotag endpoint to verify autotagging works via the admin server.
- Usage: `node ./scripts/test-autotag.mjs`
- Environment:
  - `VITE_ADMIN_SERVER_URL` (defaults to `http://localhost:4000`)
- Notes: Helpful to test AOAI/Foundry autotag provider integrations quickly.

---

### `scripts/welcome.mjs`
- Purpose: Print a short getting-started / welcome message in the terminal.
- Usage: `node ./scripts/welcome.mjs`
- Notes: Non-destructive, purely informative.

---

### `scripts/find-user.mjs`
- Purpose: Search for admin user entries in the configured container (checks a few admin emails/usernames) and prints results.
- Usage: `node ./scripts/find-user.mjs`
- Environment: `.env` or direct env variables
- Notes: Basic data-inspection helper; useful if you want to locate the admin doc quickly.

---

### `scripts/run-fix-with-env.mjs`
- Purpose: Small wrapper that loads `.env` and runs the `fix-missing-partitionkey.mjs` with `--apply` flag support.
- Usage: `node ./scripts/run-fix-with-env.mjs [--apply]`
- Environment: `.env`
- Notes: Convenience wrapper for running migration fixes in a consistent environment.

---

### `scripts/validate-aoai-env.mjs`
- Purpose: Validate that the AOAI (Azure OpenAI) environment variables are present and that the AOAI endpoint responds to a lightweight completion request.
- Usage:
  - Run locally: `node ./scripts/validate-aoai-env.mjs`
  - Recommended to run before starting the admin server or when troubleshooting AOAI configuration.
- Environment:
  - `AUTOTAG_PROVIDER` must be set to `AOAI` (case-insensitive) to run the validation check.
  - Required AOAI variables: `AOAI_ENDPOINT`, `AOAI_KEY`, `AOAI_DEPLOYMENT`, `AOAI_API_VERSION`.
- Notes:
  - The script reads values from the current process environment if already loaded, otherwise it parses the project root `.env` file.
  - It performs a single, small POST request to the AOAI completion endpoint to verify reachability and credentials.
  - The script exits with non-zero codes on missing variables (1) or endpoint/network errors (2).
  - Node 18+ is required because the script uses the built-in `fetch` implementation. If using an older Node.js runtime, install and provide a global `fetch` polyfill (e.g., `node-fetch`).

---

### `scripts/demo-rewrite-and-autotag.mjs`
- Purpose: Demo script that performs a sample rewrite and extracts tags using your configured AOAI/Foundry provider.
- Usage: `node ./scripts/demo-rewrite-and-autotag.mjs` or `npm run demo:ai:rewrite-autotag`
- Environment: Uses `.env` or process.env. Required AOAI vars for AOAI provider: `AOAI_ENDPOINT`, `AOAI_KEY`, `AOAI_DEPLOYMENT`, `AOAI_API_VERSION`.
- Notes:
  - Demonstrates a full roundtrip: original → rewritten → tags.
  - Uses chat/completions for AOAI and v1/chat/completions for Foundry.
  - Designed to be a small developer utility; not intended for production usage directly.

---

If you would like, I can:
- Create an entry at the top-level `README.md` that links to this document, or
- Move additional files into `scripts/tobedeleted` and optionally purge them after review, or
- Render a short table-of-contents for quick lookup of commonly-used scripts.

---

End of `scriptsDocumentation.md`.
