# Monkii Tribe — Web app

The Monkii Tribe progressive web app: React 18, Vite, Tailwind CSS 4, TanStack
Query, i18next (English / French), hls.js for streaming and our own service
worker (app shell, image cache, encrypted offline tracks, web push).

## Structure

```
src/
├─ main.tsx / App.tsx    entry point (theme, i18n) / providers: QueryClient, Auth, Router
├─ routes/               index.tsx route table (lazy studio, org, admin) + guards.tsx (Root, RequireAuth)
├─ services/             http.ts (fetch client, token + refresh cookie, ApiError) + one <name>.service.ts per backend service
├─ hooks/                React Query hooks per area (query keys and cache invalidations live here)
├─ validation/           zod schemas of the forms (<area>.schemas.ts) + their tests
├─ types/                API response shapes, one file per service, re-exported by index.ts
├─ utils/                pure helpers: format, csv, problems (error messages), theme, download
├─ auth/                 AuthProvider (session state), GoogleButton
├─ pages/                one file per screen (listener, auth, studio, org, admin)
├─ components/           shared UI
├─ player/               player state (queue, shuffle, repeat), HLS, Now Playing
├─ offline/              encrypted offline tracks and queued play beacons (IndexedDB)
├─ i18n/                 i18next setup, en.json, fr.json
└─ styles/               Tailwind entry (index.css)
src-sw/                  service worker (injectManifest)
public/                  icons, favicon
nginx/default.conf       Nginx config baked into the image (static files only)
```

## Run

Needs Node 22+ and the API gateway running (start the platform with the
**monkii-infra** repository; the gateway listens on http://localhost:4400).

```bash
npm install
npm run dev          # http://localhost:5173 — /api and /docs are proxied to GATEWAY_URL
```

Set `GATEWAY_URL` (see `.env.example`) if the gateway is somewhere else.
The API is proxied on the same origin, so the httpOnly refresh cookie just works.

```bash
npm run typecheck
npm test             # vitest: form rules, service paths, http client
npm run build        # dist/ (PWA with precache manifest)
npm run preview      # serves dist/ on http://localhost:8080
docker build -t monkii/web .
```

`npm run icons` regenerates the PNG icons from `public/favicon.svg`.
