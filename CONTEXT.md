# Project context

Updated: 2026-09-26

## Current user intent

Build a credible dashboard using real device data only. The user supplied an industrial monitoring-wall reference, then clarified that the original white background must remain. The overview should show what is happening throughout the city, especially current air/environment conditions. The latest request explicitly requires updating README.md, AGENTS.md and CONTEXT.md and committing/pushing every completed change to https://github.com/Bungkii/Smart-City.git.

## Completed changes

- White overview with navy navigation, four fleet counters, prominent PM2.5/temperature/humidity strip and five subsystem panels.
- Parking and streetlight gauges, traffic indicators, gate state, environment history, real-coordinate map and recent telemetry log.
- Responsive layout and navigation-hiding monitor view; CSV export and five-second polling.
- Removed the simulation API, event generators, database auto-seeding, mode-switching UI, fabricated fallback values and the SSR test page.
- Removed telemetry/RFID/todo seed inserts from the SQL installer. Existing database rows were not deleted.
- Added fingerprint filtering for known historical installer telemetry falsely labelled live, the old SQLite seed note and unmodified sample RFID cards.
- PostgreSQL read failures produce dashboard HTTP 503; failed inserts no longer return fabricated event IDs. Wi-Fi failures no longer claim successful writes.
- Replaced the invented campus layout with a coordinate-only map and an explicit no-coordinate state.
- Removed real-looking deployment credentials from README; environment names are documented without secret values.

## Validation

- Focused data-integrity assertions passed, including preservation of non-sample and changed measurements.
- Next type generation, TypeScript and production build passed after the white-theme/weather changes.
- Browser inspected at 1440px desktop and 390px mobile; monitoring-view toggle worked.
- Local dashboard returned live mode and zero qualifying devices after known seed records were excluded. This is the intended honest empty state, not a hardware test.
- Removed simulation endpoint returned HTTP 404.
- No firmware changes or hardware control commands were made. No external deployment was verified.

## Known limits / follow-up context

- Live source labels are not cryptographic proof of provenance. The exclusion filter recognizes known old seeds only; manually altered sample rows may require review.
- PostgreSQL latest reads 60 recent rows before deduplication; scale-out should use a database latest-per-device query.
- Client health uses the default 120-second threshold. A custom server OFFLINE_AFTER_SECONDS value is not currently propagated to client components.
- Existing public SQL policies and RFID/Wi-Fi authorization need a separate production-security review; the UI work does not resolve that architecture.
- Existing Node 20 environment produces a Supabase deprecation warning during build. Build succeeds; no runtime upgrade was made.
- No verified real device measurements were available during this task. Do not populate blank panels with sample data to improve screenshots.

## Git handoff

- Canonical remote is origin: https://github.com/Bungkii/Smart-City.git.
- Working branch at task start: main.
- User explicitly authorized commit/push on each completed change. Keep this agreement in AGENTS.md and update these three documents on future tasks.
- Consult git log and origin/main for the exact commit IDs rather than hard-coding the current commit hash into this file.

## Follow-up: logo and collapsible navigation — 2026-09-26

- User asked which fonts are used, requested collapsible navigation and supplied a replacement ACT 1961 PNG.
- Follow-up instruction changed the font to IBM Plex Sans Thai throughout the application, including Latin text, numerals, graph/map UI and RFID identifiers. Removed the Inter font request and monospace overrides; sans-serif remains the network-failure fallback.
- Copied the supplied PNG intact to `public/act-logo-1961.png`; sidebar, collapsed/mobile header branding and icon metadata use this new asset path to avoid the previous logo cache.
- Added a desktop collapse/reopen button to the shared Shell, persisting preference in `smartcity.sidebar.collapsed`. It also works before telemetry loads or when storage fails.
- Mobile menu remains a separate drawer with close button, backdrop and Escape handling. The sidebar is removed from keyboard navigation when hidden.
- Added `src/app/navigation.css`, loaded after monitor styling so behavior works on overview, subsystem and settings pages.

## Follow-up: UI Equalization & Framer Motion Integration — 2026-09-26

- User request: "ช่วยทำให้หน้าตา UI ดีกว่าหน่อยแบบขนาดเท่าๆกันกดแล้วไม่มีอะไรเด้งแปลกๆ นะจ้ะแล้วขอให้ใช้ FramerMotion"
- Standardized heights across the 5 subsystem panels (`.monitor-systems` in `OperationsOverview.tsx` and `monitor.css`) so gauges, traffic indicators, gate previews, and air quality cards maintain uniform height (120px) and clean flex alignment without jarring layout shifts.
- Installed and integrated `framer-motion` (`motion.div`, `motion.section`, `AnimatePresence`, `whileHover`, `whileTap`) across overview cards, visualizers (`ParkingVisualizer`, `TrafficVisualizer`, `StreetlightVisualizer`, `GateVisualizer`, `EnvironmentVisualizer`), and `Dashboard.tsx` subsystem views.
- Replaced disruptive CSS transform hops on hover with smooth Framer Motion micro-animations and border/shadow transitions.
- Validation: `node tests/data-integrity.test.cjs`, `npm run typecheck`, and `npm run build` all passed with 0 errors.
