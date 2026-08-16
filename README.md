# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## Integration with the Smart IV Drip System

This is the `frontend/` piece of a larger monorepo (`firmware/` = ESP32-S3
firmware, `server/` = FastAPI backend). Two separate data sources feed it:

- **Staff auth, roles, and ward settings** - a pre-existing Supabase project
  (`.env` here already points at it: `profiles`, `user_roles`,
  `ward_settings` tables). Unchanged, not part of this integration.
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

To see it live: run `server/` (`uvicorn app.main:app --port 8000`), flash
`firmware/`, run this dashboard, sign in, and hit "Connect ward server" on
`/dashboard`. See `server/README.md` for the full walkthrough.
