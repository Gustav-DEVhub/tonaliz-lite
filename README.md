# Tonaliz Lite

Independent music discovery with local-first listening flows.

## Overview

Tonaliz Lite is a React music discovery app focused on independent tracks and artists. It uses Jamendo-backed music data, persistent playback surfaces, and a library model designed around tracks, artists, playlists, and saved collections.

The project is intentionally local-first. Favorites, saved tracks, local playlists, saved artists, shelf collections, and playback-oriented metadata are persisted in the browser through IndexedDB.

The goal is a credible music-product MVP: clear discovery flows, responsive desktop/mobile UX, and well-separated action semantics for tracks, artists, and collections.

## Features

- Mood-based Home experience with dynamic recommendation rails.
- Discover shelves and search for independent tracks.
- `Music I Like` as the automatic favorite collection.
- `Songs` powered by persisted `savedTracks`.
- Local playlists with add-to-playlist flows.
- Saved artists and saved collections.
- Shelf Collections from Home and Discover rails.
- Artist Page and Artist tracks collection flows.
- Mini-player, expanded player, queue, shuffle, repeat, and desktop queue rail.
- Desktop popovers and mobile bottom sheets for contextual actions.
- Responsive desktop/mobile shell with local persistence.

## Product Notes

- `Music I Like` is the automatic collection for hearted tracks.
- `Songs` is powered by `savedTracks`.
- `Save artist` saves an artist entity into Library.
- `Save to Library` is context-aware: tracks are saved as tracks, while shelves, playlists, and artist tracks are saved as collections.
- Saving a collection does not dump all of its tracks into `Songs`.

## Tech Stack

- React 19
- TypeScript
- Vite
- Zustand
- Dexie.js
- Tailwind CSS v4
- Motion for React
- React Router
- Radix Dialog
- Lucide React
- DnD Kit
- vite-plugin-pwa

## Architecture Snapshot

Tonaliz Lite is organized by product boundaries instead of a single flat components folder.

```text
src/
  app/                 bootstrap, routes, shell layout, audio sync
  entities/track/      track domain types, normalization, reusable track UI
  features/artist/     artist page and artist route helpers
  features/discover/   search, shelves, shelf collections, browse state
  features/home/       Home rails, mood context, listening surfaces
  features/library/    Library UI, playlists, saved tracks, saved collections
  features/player/     mini-player, expanded player, queue, now playing panels
  lib/                 Jamendo services, Dexie repositories, mood and audio helpers
  shared/              UI primitives, toast store, share helpers, utilities
```

Persistence is split between Zustand stores and Dexie repositories. Track, artist, and collection actions are intentionally separated so saving an artist, saving a track, and saving a collection do not mutate the same data by accident.

## Screenshots

Screenshots are available from the PWA assets:

- `public/pwa-screenshot-wide.png`
- `public/pwa-screenshot-mobile.png`

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Run lint:

```bash
npm run lint
```

Run TypeScript validation:

```bash
npx tsc -b --pretty false
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Environment Variables

Create a local `.env` file from `.env.example`:

```bash
VITE_JAMENDO_CLIENT_ID=your_jamendo_client_id
```

No secrets should be committed to the repository.

## Project Status

Status: MVP / portfolio-ready build in progress.

## Roadmap

- Test coverage for stores, repositories, and key UI flows.
- Accessibility audit for desktop popovers and mobile bottom sheets.
- Richer recommendation logic for Home and Discover.
- Cloud sync and authentication.
- PWA polish and installability QA.
- Better artist metadata and collection detail enrichment.

## License

License: Not specified yet.
