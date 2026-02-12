# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Volleyball team lineup manager — a mobile-first web app for a volleyball club to manage players, track attendance via QR code/shared link, and auto-generate balanced teams across courts. The project language is French (UI text, comments, README), but code identifiers are in English.

## Commands

- `npm run dev` — Start Next.js dev server
- `npm run build` — Production build
- `npm run lint` — Run ESLint (flat config, `eslint` with no args)
- `npm start` — Start production server

No test framework is configured yet.

## Tech Stack

- **Next.js 16** (App Router) + React 19 + TypeScript (strict mode)
- **Tailwind CSS v4** via `@tailwindcss/postcss` (no `tailwind.config` file — uses CSS-based config in `app/globals.css`)
- **Supabase** (`@supabase/supabase-js`) for PostgreSQL, Auth, and Row Level Security
- Hosting target: Vercel (frontend) + Supabase (database/auth)

## Architecture

- `app/` — Next.js App Router pages and layouts. Uses Server Components by default.
- `lib/supabaseClient.ts` — Singleton Supabase client using `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars. Imported as `supabase` throughout the app.
- `app/debug/supabase/page.tsx` — Dev-only page at `/debug/supabase` to verify Supabase connectivity.
- Path alias: `@/*` maps to the project root (e.g., `@/lib/supabaseClient`).

## Environment Variables

Stored in `.env.local` (not committed):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Domain Concepts

- **Players** (`players` table): name, gender, skill_level, active/inactive status
- **Sessions**: training date, number of courts, preferred team size
- **Attendance**: players declare presence via QR code or shared link
- **Team generation**: algorithm balances skill levels, teams of 3–6 players, all present players must be placed
- Staff-only actions: set skill levels, adjust courts, trigger team generation
