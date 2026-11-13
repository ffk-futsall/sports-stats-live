# Cloudflare Pages migration — draft, not production-ready

This branch is an isolated compatibility prototype. Do not switch DNS or merge it to production until the checklist below is completed.

- Pages build: `npm run build`; output directory `dist`; the checked-in `wrangler.jsonc` is for Pages, not the existing static Worker.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_VAPID_PUBLIC_KEY` are build-time public values. Set server-only `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` and `PROTOCOL_ORIGIN` as Pages runtime variables/secrets; never add server secrets to `VITE_` variables or commit them.
- Back up the production database and any storage objects before migrating. The free project dashboard showed no backups; verify a restorable offsite backup.
- Several important records still live in the original browser's localStorage (player stats, officials, match sheets, club document links and legacy editors). They have not been migrated. Design a safe authenticated import from each original browser, preserve source copies, and protect private records and credentials; never store these in the publicly readable `app_data` blob.
- `app_data` currently replaces a whole JSON document and may lose concurrent cross-device edits. Address concurrency before encouraging multiple administrators to write simultaneously.
- Test API endpoints with an isolated staging Supabase project, including authentication, delegate CORS, live matches, writes, notifications and actual web push. Only local request adaptation and unauthenticated rejection/preflight were tested so far. Node `web-push` sending has not yet been verified on Cloudflare.
- Test login, browser-local migration, images, documents, app workflows and push on a Pages preview. Existing Vercel and delegate app must remain working. Do not point the public domain until all tests pass and rollback is prepared.
- Cloudflare Functions invocation limits apply to `/api/*`; static routes are excluded via `_routes.json`. Measure live polling and database limits.
