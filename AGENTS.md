<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project working agreement

## User requirements

- Keep the dashboard white with a navy sidebar. The overview must show city-wide subsystem status and prominent current weather: PM2.5, temperature and humidity.
- No demonstration mode, simulated events, random sensor values, synthetic telemetry, fake RFID cards, or invented device coordinates. Missing measurements must remain visibly missing.
- Never imply that empty data means all systems are healthy. Distinguish unavailable storage, no measurements, stale measurements and current measurements.
- Preserve actual telemetry and existing database records. Exclude known legacy installer samples through the documented integrity filter; do not bulk-delete database data.

## Repository workflow (explicit user request)

- Canonical remote: `https://github.com/Bungkii/Smart-City.git`.
- After each completed code-change task, update `README.md`, this `AGENTS.md`, and `CONTEXT.md` to reflect the resulting behavior, decisions, checks and remaining limitations.
- Run relevant checks, inspect the final diff, commit the task changes, and push to the canonical repository every time. This workflow was explicitly authorized by the user on 2026-09-26.
- Verify the remote and current branch before pushing. Do not force-push, rewrite shared history, include unrelated user changes, or commit credentials, `.env.local`, local databases, generated builds or temporary editing scripts.
- If pushing fails, preserve the local commit and report the concrete blocker. Do not claim a push succeeded without remote verification.
- Preserve the generated Next.js instructions above. Read the relevant installed Next.js documentation before writing framework code.

## Validation and key files

- `src/components/OperationsOverview.tsx`: white city overview, real-data gauges, weather, chart, map and recent records.
- `src/app/monitor.css`: overview layout and responsive styles. `operations.css` adjusts shared dashboard surfaces.
- `src/lib/data-integrity.ts`: known legacy telemetry and RFID sample exclusions.
- `node tests/data-integrity.test.cjs`, `npx next typegen`, `npm run typecheck`, `npm run build`.
- Verify desktop/mobile empty-data states without seeding a database. Do not send hardware control commands merely to test layout.
- Update `CONTEXT.md` for continuity; keep the user-facing README free of real keys and tokens.

## Latest confirmed direction — 2026-09-26

The user supplied a monitoring-wall reference, then explicitly chose the original white palette. Keep its at-a-glance multi-system organization without the dark canvas. The weather strip and all five subsystem panels belong on the overview. A button may hide navigation for a wider monitoring view.

## Navigation and brand — 2026-09-26

- Use the user-provided ACT 1961 asset at `public/act-logo-1961.png` for visible branding and browser icons. Keep the supplied image intact.
- Use IBM Plex Sans Thai throughout the application: Thai, Latin text, numerals, graphs, maps, inputs and RFID identifiers. The user explicitly requested this after the initial font explanation. Do not reintroduce Inter or monospace overrides.
- The shared shell must let users collapse and reopen desktop navigation on every route, including loading/error screens. Remember desktop preference in localStorage and keep mobile drawer behavior independent.
- Mobile navigation must offer a close button, backdrop dismissal and Escape dismissal. Hidden menus should not remain keyboard-focusable.
