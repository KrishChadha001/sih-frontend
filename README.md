# FluidWatch — Ward Dashboard

> [!NOTE]
> This project was scaffolded with [Lovable](https://lovable.dev) and stays
> connected to it - pushes to the connected branch sync back into the
> Lovable editor. See `AGENTS.md` before rewriting published history
> (force-push, rebase, amend of pushed commits).

The staff-facing dashboard for the Smart IV Drip System monorepo: sign in,
see every bed's live fluid level/flow rate, get alerted when one goes
critical. It's the `frontend/` piece of three (`firmware/` = ESP32-S3
firmware, `server/` = FastAPI backend) - see the [root README](../README.md)
for how they fit together.

## Built with

TanStack Start · TypeScript · React · Tailwind CSS · Supabase (auth/roles) ·
a raw WebSocket to `server/`'s `/ws/bedfeed` (live telemetry)

## Local development

Requires Node.js.

```sh
cd frontend
npm i
npm run dev
```

`.env` is already committed with a working Supabase URL + publishable key
(safe to expose - it's an RLS-protected anon key, not a secret) pointing at
the project described in Option A below. Only touch it if you're doing
Option B.

Opens on `http://localhost:8080`. Sign up - **the first account created
becomes the ward admin** (see the `handle_new_user` trigger in
`supabase/migrations/`).

To see live device data instead of the built-in simulator: run `server/`
(`uvicorn app.main:app --port 8000`, see `server/README.md`), sign in here,
go to `/dashboard`, and click **"Connect ward server."** Without a live
connection the dashboard free-runs a client-side random-walk simulator on
six demo beds so the UI is never empty.

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | browser bundle | baked in at build time |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser bundle | baked in at build time |
| `SUPABASE_URL` | SSR (server-side render) | same value, no `VITE_` prefix |
| `SUPABASE_PUBLISHABLE_KEY` | SSR | same value, no `VITE_` prefix |
| `SUPABASE_PROJECT_ID` | tooling (e.g. `supabase` CLI) | |

Locally, `.env` covers all of these (see `src/integrations/supabase/client.ts`,
which reads `import.meta.env` client-side and falls back to `process.env`
server-side). **On a real deployment these are two different mechanisms** -
see [Deployment](#deployment) below.

There's also a `client.server.ts` with a `supabaseAdmin` service-role client
for server-only admin operations that bypass RLS. Nothing in this app uses
it yet - if you add something that does, it needs `SUPABASE_SERVICE_ROLE_KEY`
set (never expose that key to the browser bundle).

## Configuring Supabase

### Option A - use the existing project (default)

`.env` already points at a pre-existing Supabase project
(`nkcweoiecmfxpkegytww`) with the schema below applied. If you're working
against that project, there's nothing to configure - just `npm run dev`.

### Option B - stand up your own project

Needed if you're forking this for a deployment that shouldn't share auth/data
with the original project.

1. Create a project at [supabase.com](https://supabase.com/dashboard) (or
   `supabase init` + `supabase start` locally with the CLI).
2. Apply the schema - open the SQL Editor and run each file in
   `supabase/migrations/` **in filename order** (they're timestamped, so
   sorting the folder gives the right order). This creates:
   - `profiles`, `user_roles` (+ `app_role` enum `admin`/`nurse`) - staff
     accounts, RLS'd so only admins can change roles.
   - `ward_settings` - a single-row table (`watch_level`, `critical_level`,
     `min_flow`, `ws_url`, `sound_alerts`) editable from `/admin`, read by
     the dashboard on load.
   - `handle_new_user` trigger - auto-creates a `profiles` row and makes the
     *first* signup an admin, everyone after a nurse.
3. **Auth → URL Configuration**: set Site URL and add a Redirect URL for
   wherever this will be hosted (`http://localhost:8080` for local dev,
   plus your production URL once you have one - see Deployment). Email
   confirmation is on by default; turn it off under **Auth → Providers →
   Email** if you want signups to be usable immediately during testing.
4. **Google sign-in** ("Continue with Google" on `/auth`) goes through
   Lovable Cloud's auth proxy (`src/integrations/lovable/index.ts`), not a
   plain Supabase OAuth provider - it won't work against a project outside
   Lovable without replacing that call with a native
   `supabase.auth.signInWithOAuth({ provider: "google" })` and configuring
   your own Google OAuth client under **Auth → Providers → Google**. Skip
   this if email/password sign-in is enough.
5. `cp .env.example .env` and fill in the new project's URL and publishable
   (`anon`) key from **Settings → API** (both the `VITE_` and non-`VITE_`
   variants - see the table above).
6. Update `ward_settings.ws_url`'s default if your backend won't run on
   `localhost:8000` - either edit the value directly in the SQL Editor, or
   change it after signing in via `/admin`.

## Deployment

Deploying this dashboard makes it reachable, but it's only useful once
`server/` (the WebSocket source) is *also* running somewhere public over
HTTPS - see `server/README.md`'s Deploying section. Without that, a deployed
dashboard just runs the built-in demo simulator.

### Option A - Lovable Publish (fastest)

Since this project stays connected to Lovable, the simplest path is the
**Publish** button in the [Lovable editor](https://lovable.dev) - it builds
and hosts the app with no local tooling needed. Environment variables
(Supabase URL/key) are managed there too if you're on a project connected to
Lovable Cloud.

### Option B - manual deploy to Cloudflare

The build target is Cloudflare Workers (via TanStack Start's Nitro/Cloudflare
preset, configured in `vite.config.ts`).

```sh
npm run build              # outputs to .output/, generates .output/server/wrangler.json
npx wrangler login          # one-time, opens a browser to authorize your Cloudflare account
npx nitro deploy --prebuilt
```

Notes:

- The worker name is auto-derived (currently `krishchadha001-sih-frontend`,
  from the git remote this was forked from) - edit `name` in
  `.output/server/wrangler.json` before deploying if you want a different
  one, or add a `name` override under `tanstackStart`/Nitro config in
  `vite.config.ts` so it's consistent across rebuilds.
- `VITE_*` env vars are baked into the client bundle **at build time** - set
  them in your shell (or a `.env` present during `npm run build`) before
  building.
- The non-`VITE_` server-side vars (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`)
  are read at **runtime** by the Worker for SSR, and `.env` isn't shipped to
  Cloudflare - set them as real Worker vars/secrets instead:
  ```sh
  npx wrangler secret put SUPABASE_URL
  npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
  ```
- After deploying, add the Worker's `*.workers.dev` URL (or custom domain)
  to Supabase's **Auth → URL Configuration** redirect list, or sign-in will
  fail.
- Point `ward_settings.ws_url` at the deployed backend's `wss://` URL
  (see `server/README.md`) - `ws://localhost:...` only works for local dev.

## Integration with the Smart IV Drip System

Two separate data sources feed this dashboard:

- **Staff auth, roles, and ward settings** - Supabase (`profiles`,
  `user_roles`, `ward_settings` tables; see Configuring Supabase above).
- **Live device telemetry** - `src/routes/_authenticated/dashboard.tsx`
  opens a raw WebSocket to `ward_settings.ws_url` (admin-editable from
  `/admin`, defaults to `DEFAULT_WS_URL` in `src/lib/fluidwatch.ts`) and
  expects messages shaped `{id, bed, patient, fluid, flow, level, status}`
  (single object or array). `server/app/routers/ws.py`'s `/ws/bedfeed`
  produces exactly this, translating each ESP32 reading via
  `server/app/bedfeed.py`.

`src/lib/fluidwatch.ts`'s `applyLiveUpdate()` merges incoming messages into
the bed list by `id`: an id that matches an existing card (including the 6
demo beds seeded in `INITIAL_BEDS`) updates it in place, and an unrecognized
id (a real device's `DEVICE_ID`) is added as a new card - no manual
provisioning needed on the frontend side when a new IV stand comes online.
Alert thresholds (`WATCH`/`CRITICAL` cutoffs on fluid level and flow) come
from `ward_settings` (admin-editable) rather than being hardcoded - both the
live path and the demo simulator use the same `deriveStatus()`.

To see it live: run `server/` (`uvicorn app.main:app --port 8000`), flash
`firmware/`, run this dashboard, sign in, and hit "Connect ward server" on
`/dashboard`. See `server/README.md` for the full walkthrough. Note the
backend now requires a bearer token by default (auto-generated into
`server/.env` on first run) - the firmware's `secrets.h` needs the same
value in `API_AUTH_TOKEN`.
