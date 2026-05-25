# Tonaliz Lite

Tonaliz Lite is a portfolio-ready music discovery PWA focused on independent tracks.

It connects directly to the Jamendo API, lets users search and play real songs in the browser, persists favorites with IndexedDB, and adapts the interface with lightweight mood-driven visuals. The goal is not to imitate Spotify. The goal is to show product judgment, modern frontend architecture, and a credible base for future client-side AI features.

## Problem

Many music portfolio demos fail in one of two ways:

- they look like generic SaaS dashboards with album covers dropped into cards
- they aim for a full streaming clone and become unrealistic, overbuilt, or unfinished

That usually hides the parts that matter most to technical reviewers:

- clear state architecture
- resilient client-side playback
- local persistence
- responsive media UX
- product thinking
- future-readiness for client-side intelligence

## Solution

Tonaliz Lite starts with a smaller and more believable phase-1 product:

- discover independent music through Jamendo
- play tracks in a persistent responsive player
- save favorites locally
- revisit a local Library even when offline
- adapt the atmosphere of the interface to the mood of the current track

This keeps the experience usable today while preparing the architecture for more advanced local AI and audio features later.

## Current Features

### Discover

- Real search against the Jamendo tracks API
- Defensive track normalization so incomplete payloads do not break the UI
- Desktop list layout for fast scanning
- Mobile artwork-first cards
- Loading, error, and empty states
- Offline-aware search behavior
- Internal desktop scrolling for result browsing

### Playback

- Single active audio source across the whole app
- Persistent bottom player
- Play, pause, previous, next, seek, shuffle, and repeat
- Queue synced from Discover results or Library favorites
- Expanded Player route at `/now-playing`
- Desktop right-side Now Playing panel
- Desktop volume control with hover, focus, drag, and delayed fade-out behavior

### Favorites and Library

- Favorites persisted with Dexie + IndexedDB
- Instant favorite toggling from track lists and player controls
- Local Library page for saved tracks
- Metadata remains available even when the app is offline

### Mood UI

- Rule-based mood detection from tags and genre
- Per-track mood badge
- Mood-driven accents, glow, and shell atmosphere

### Product Shell

- Desktop sidebar + centered header search
- Sticky/fixed app header
- Responsive navigation
- Installable PWA shell
- Online/offline indicator
- Vercel-ready SPA deployment setup

## Tech Stack

- React 19
- Vite
- TypeScript
- Tailwind CSS v4
- Zustand
- Dexie.js
- React Router
- Lucide React
- Jamendo API
- vite-plugin-pwa

`shadcn/ui` is used here as an in-repo primitive approach rather than as a dominant design identity.

## Architecture

The project is organized around product boundaries instead of a flat component folder:

```text
src/
  app/                 app bootstrap, shell layout, routes, audio sync bridge
  entities/track/      domain types, track normalization, playlist helpers, reusable track UI
  features/discover/   discover flow, result rendering, search interactions
  features/library/    favorites state, hydration, Library page
  features/player/     playback UI, queue logic, expanded player, desktop panel
  lib/                 Jamendo services, Dexie layer, mood logic, audio controller, env helpers
  shared/              UI primitives, constants, helpers, styling utilities
```

### Domain Responsibilities

- `app`
  - layout shell
  - routing
  - online/offline bootstrap
  - browser audio synchronization

- `features/discover`
  - search state
  - desktop/mobile result layouts
  - loading, error, and empty UX

- `features/library`
  - favorites state
  - IndexedDB hydration
  - local Library rendering

- `features/player`
  - transport controls
  - queue, shuffle, and repeat
  - bottom player and expanded player
  - desktop Now Playing panel
  - volume interaction UX

- `lib/jamendo`
  - track search
  - artist enrichment
  - response normalization

- `lib/db`
  - Dexie-backed persistence
  - no direct IndexedDB access from presentational components

## Core Models

### `Track`

- `id`
- `name`
- `artistName`
- `audioUrl`
- `imageUrl`
- `duration`
- `tags`
- `genre`
- `moodSource?`
- `artistId?`
- `artistShareUrl?`
- `artistWebsite?`
- `artistImageUrl?`

### `Playlist`

- `id`
- `title`
- `source`
- `trackIds`
- `tracks`

### `Favorite`

- persisted track snapshot
- `savedAt`
- `updatedAt`

### `ArtistProfile`

- `id`
- `name`
- `imageUrl`
- `shareUrl`
- `website`

## Technical Decisions

- Jamendo is consumed directly from the client to keep phase 1 fast and backend-free.
- Zustand is split by domain instead of forcing a single oversized store.
- Dexie isolates persistence from UI components and keeps storage logic replaceable.
- Mood detection is intentionally rule-based in phase 1 so the architecture stays ready for local inference later.
- Audio playback is centralized to prevent multiple tracks from playing at the same time.
- The visual direction avoids dashboard conventions and leans into a darker editorial music-product feel.

## Environment Variables

Create a local `.env` file from `.env.example`:

```bash
VITE_JAMENDO_CLIENT_ID=your_jamendo_client_id
```

If the variable is missing, Discover fails gracefully with a clear message instead of crashing the app.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run the linter:

```bash
npm run lint
```

Validate a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Deployment

Tonaliz Lite is ready for static deployment on Vercel.

- `vercel.json` handles SPA rewrites
- `vite-plugin-pwa` provides the installable shell

Demo placeholder:

```text
https://tonaliz-lite.vercel.app
```

## Current Limitations

This is intentionally a phase-1 product. It does **not** include:

- Transformers.js inference
- WebGPU processing
- real offline audio playback
- audio blob downloads
- pitch or tempo manipulation
- drag-and-drop MP3 imports
- backend services
- authentication
- payments
- native mobile packaging

Practical constraints that still apply:

- playback depends on remote Jamendo availability
- artist metadata depth depends on what Jamendo exposes per track and artist
- shuffle and repeat are client-side queue behaviors, not account-level playback state

## Future Roadmap

The current architecture is intentionally prepared for later upgrades such as:

- local mood or similarity inference with Transformers.js
- richer discovery and recommendation logic
- offline playback strategies and audio caching
- advanced audio controls
- local collections and imported tracks
- experimental visual/audio workflows powered by WebGPU

## Portfolio Value

Tonaliz Lite is built to demonstrate:

- product thinking, not just component assembly
- modern React architecture with clear domain boundaries
- client-side state coordination for media playback
- local persistence through IndexedDB with a clean abstraction layer
- responsive music UX with a persistent player model
- a realistic foundation for future client-side AI product work

## License

This repository is intended as a personal portfolio project unless a separate license is added.
