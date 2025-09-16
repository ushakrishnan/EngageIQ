## Karma system — developer notes

Purpose: explain key implementation details of the client/server karma system, idempotency protections, and how to test follow/karma flows during development.

Summary (contract)
- Inputs: canonical actions (post_created, post_liked, comment_made, mentioned, followed, etc.), userId, relatedId (postId / target user id), description
- Outputs: local optimistic update to auth profile, local daily-progress update, and an audit + daily-progress persisted document in Cosmos
- Error modes: persistence failures fall back to the unsynced queue; audit deterministic key prevents duplicate awards on retry

Key implementation points
- Client-side
  - `useKarmaSystem` (frontend/src/hooks/useKarmaSystem.ts) calculates points using `karmaData` and performs an optimistic update of the current user's `karma` and `karmaHistory` so UI components (RightSidebar, Daily Goals) reflect immediate changes.
  - To reduce accidental duplicate awards in a single session/day, follow-type awards are deduped in-session using a Set keyed by `${userId}|${relatedId}|${date}`.
  - The hook also updates local `daily-progress` counters (posts, comments, likes, mentions, follows, groupsJoined) so the Daily Goals widget reflects the awarded points.

- Server-side / persistence
  - `awardKarmaWithTracking` in `frontend/src/lib/karmaHelpers.ts` writes two things:
    1) A deterministic audit record id (award key) of the form `award-${userId}-${canonicalAction}-${relatedId || 'none'}-${YYYY-MM-DD}`; the code first attempts to read that audit id and will no-op if it exists. This provides idempotency across retries and sessions.
    2) A daily-progress `daily-progress` document which contains per-day counters (posts, comments, likes, mentions, follows, groupsJoined) and the day's `karmaEarned`.
  - If persistence fails, the helper enqueues the necessary work in the unsynced queue so it can be retried later by the `retryAllUnsynced` flow.

Why this prevents gaming
- Deterministic award audit ids mean repeated attempts (retries, multiple clients) won't create duplicate persisted awards.
- Client-side session dedupe prevents noisy repeated follow/unfollow cycles from awarding repeatedly in the same session and day.

How to inspect documents
- Audit: read the `audit` container (or use `backend/scripts/inspect-audit.mjs`) and look for ids starting with `award-`.
- Daily progress: read the `daily-progress` container (or query via `backend/scripts/query-data-posts.mjs` adapted to daily-progress) and check `follows`, `mentions`, `karmaEarned` for a given `userId` + `date`.

How to smoke-test the follow/karma flow locally
1. Ensure backend is running and you have seeded demo data (`cd backend && npm run seed`).
2. Start the frontend dev server: `cd frontend && npm run dev` and sign in as a seeded demo user (e.g., `alice@demo.com` or check seeded emails in the seed script output).
3. From a terminal run the smoke script: `node ./backend/scripts/smoke-follow-test.mjs`. The script will exercise follow/unfollow flows; inspect the console output and then check audit/daily-progress for deterministic award ids.

Notes and caveats
- The deterministic key logic includes the canonical action name and the date. If you change canonical action names or the date format, update both client-side and server-side helpers.
- This doc is developer-facing; if you want a short admin-facing note, I can add it to README or the admin docs.

Created: September 16, 2025
