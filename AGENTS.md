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
- For environment schema changes, also run `node tests/environment-schema.test.cjs`.
- Verify desktop/mobile empty-data states without seeding a database. Do not send hardware control commands merely to test layout.
- Update `CONTEXT.md` for continuity; keep the user-facing README free of real keys and tokens.

## Latest confirmed direction — 2026-09-26

The user supplied a monitoring-wall reference, then explicitly chose the original white palette. Keep its at-a-glance multi-system organization without the dark canvas. The weather strip and all five subsystem panels belong on the overview. A button may hide navigation for a wider monitoring view.

## Navigation and brand — 2026-09-26

- Use the user-provided ACT 1961 asset at `public/act-logo-1961.png` for visible branding and browser icons. Keep the supplied image intact.
- Use IBM Plex Sans Thai throughout the application: Thai, Latin text, numerals, graphs, maps, inputs and RFID identifiers. The user explicitly requested this after the initial font explanation. Do not reintroduce Inter or monospace overrides.
- The shared shell must let users collapse and reopen desktop navigation on every route, including loading/error screens. Remember desktop preference in localStorage and keep mobile drawer behavior independent.
- Mobile navigation must offer a close button, backdrop dismissal and Escape dismissal. Hidden menus should not remain keyboard-focusable.

## Interface controls — 2026-09-27

- Keep the current white dashboard, navy navigation and IBM Plex Sans Thai while using HeroUI v3 for visible cards, actions, inputs, selectors and critical confirmation dialogs.
- Shared `src/components/ui/AccessibleSelect.tsx` and `ConfirmAction.tsx` wrap HeroUI Select and AlertDialog for station, device-command and RFID choices and for hardware/RFID confirmation. Keep confirmation before real hardware commands and card deletion.
- The controls are styled in `src/app/ui-controls.css`; do not reintroduce browser `confirm()` prompts or example values to fill empty states. Semantic sections, links, charts and the mobile backdrop can remain native elements.

## Premium visual layer — 2026-09-27

- `src/app/premium.css` is loaded last and provides the current Apple-inspired finish for the shared shell, overview, subsystem cards, and supporting panels. Preserve the white dashboard, navy navigation, IBM Plex Sans Thai, responsive layouts and visibly empty states.
- Do not add fabricated numbers, health claims or decorative animation that could be mistaken for live telemetry. Keep focus and keyboard affordances visible.

## RFID registry — 2026-09-27

- The gate detail must expose a real card registry even before gate telemetry arrives. Its card list and scan logs require `RFID_ADMIN_TOKEN`; writes use the server-only `SUPABASE_SERVICE_ROLE_KEY`. Never place this key in client code.
- Create and edit are separate actions. New cards start banned, UID is immutable during edit, duplicate creates fail, and deletion requires confirmation. Never invent a scanned UID or a holder identity from logs.
- `supabase/migrations/20260927_rfid_access.sql` restricts publishable-key access to card SELECT and gate-log INSERT for current Board 1 firmware. It must be applied to existing Supabase databases manually; no existing records are deleted. The current firmware still exposes card data through its direct read path, so do not claim the system is fully hardened.
- Board 1 source fails closed when Wi-Fi is lost; this only affects hardware after reflashing. Do not test by actuating the gate. Registry GET currently loads up to 500 cards and 50 logs; UI search is limited to loaded cards.

## Firmware data integrity — 2026-10-01

- All six board sketches (Board 1 to Board 6) were reviewed for fabricated timestamps, positions, credentials and sensor claims. Supabase insert paths rely on database time and omit unverified coordinates. Direct dashboard ingest paths require a synchronized UTC clock.
- Board 1 (GT-1) handles Gate In, Board 6 (GT-2) handles Gate Out with distinct directions and IDs. Both deny entry/exit when card verification fails.
- Board 2 (TR-1) and Board 5 (SL-1) implement automatic reconnection and SSL socket cleanup (`http.stop()`, `sslClient.stop()`) on Arduino UNO R4 to prevent offline drops.
- Board 3 (PK-1) displays live available slots out of 8 on its OLED alongside Royal Thai Navy NTP time (`time.navy.mi.th`) and reports real aggregate occupancy telemetry to Supabase.
- Board 4 (EN-1) sends verified DHT readings and gas alerts; PM2.5 remains empty until a real PM sensor is installed.
- Board 5 (SL-1) and Board 6 (GT-2) use ESP32 pin definitions (GPIO 34 LDR, GPIO 27 PIR, GPIO 18 PWM for Board 5; GPIO 5 SS, GPIO 4 RST, GPIO 18/19/21 SPI, GPIO 22/23 I2C, GPIO 25 Buzzer, GPIO 14 Gate for Board 6); ESP8266 is explicitly deprecated due to GPIO and TLS constraints.
- `SmartCitySecrets.h` files are local and ignored; copy each board's example and fill deployment values before compiling. Never commit Wi-Fi passwords, ingest tokens or service-role keys. Existing exposed values in Git history require rotation.
