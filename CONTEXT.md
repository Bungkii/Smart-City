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

## Follow-up: HeroUI v3 + Tailwind CSS v4 + shadcn-ui + Headless UI — 2026-09-26

- User request: "logo ขอมนๆ และขอ UI Premium หน่อย tailwind css และใช้ HeroUI แบบเต็มระบบเลย และ shadcn-ui headlessui ด้วยใส่ๆมา"
- Installed packages: `tailwindcss@4.3.3`, `@heroui/react@3.2.6`, `@heroui/styles@3.2.6`, `@headlessui/react@2.2.10`, `@tailwindcss/postcss` (dev).
- **HeroUI v3 key finding:** v3 is a React Aria Components (RAC) wrapper library with CSS-first styling via `@heroui/styles`. It has NO `HeroUIProvider`, NO `SelectItem`, NO NextUI-style `variant="bordered"/"flat"` or `color` prop on Button. Correct Button variants: `"primary" | "secondary" | "tertiary" | "outline" | "ghost" | "danger" | "danger-soft"`. Correct Chip variants: `"primary" | "secondary" | "soft"`, colors: `"accent" | "danger" | "default" | "success" | "warning"`.
- Integrated `@import "tailwindcss"` + `@import "@heroui/styles"` into `globals.css` with `@theme` block mapping IBM Plex Sans Thai as `--font-sans` and brand colors as Tailwind CSS tokens.
- Created `postcss.config.mjs` with `@tailwindcss/postcss` plugin (required for Tailwind v4 in Next.js).
- Created `src/app/providers.tsx` (thin passthrough, no provider needed in HeroUI v3).
- Applied HeroUI `Button` (outline/primary variants, `onPress`, `isDisabled`, `isIconOnly`, `fullWidth`) and `Chip` (soft variant, success/warning/danger/default color) throughout `Dashboard.tsx` and `OperationsOverview.tsx`.
- Brand logo made circular (`border-radius: 50%`) in CSS as requested ("มนๆ").
- Appended premium CSS overrides in `globals.css` to align HeroUI button/chip visual style with the navy/teal palette and IBM Plex Sans Thai font.
- `@headlessui/react` installed (available for future Transition/Disclosure usage); shadcn/ui not initialized (would require interactive CLI; HeroUI+RAC covers the component needs).
- All checks passed: `node tests/data-integrity.test.cjs` ✓, `npm run typecheck` ✓, `npm run build` ✓.

## Follow-up: Ultra-Premium UI & Maximum Animations — 2026-09-26

- User request: "Premium UI ที่สุดเอามาเต็มระบบ Animation มาเต็ม"
- Enhanced all key surfaces across the dashboard with modern UI aesthetics & rich micro-animations:
  - **Keyframe animations**: added `@keyframes pulse-radar`, `pulse-green`, `pulse-warning`, `glow-breathe`, and `wave-scan` for live connection and status beacon indicators.
  - **Operations Overview**: implemented staggered card entry transitions using Framer Motion `cardVariants` (`opacity`, `y`, `scale`, `ease: "easeOut"`), spring physics hover lifts (`whileHover={{ y: -4, scale: 1.01 }}`), glowing active status indicators, and frosted glass highlights.
  - **City Weather strip**: upgraded with subtle gradient backdrop, luminous radial glow highlights for PM2.5/Temp/Humidity, and clean typography hierarchy.
  - **Subsystem Visualizers**:
    - *Parking*: real-time matrix with glowing vacancy/occupied pills, animated car parking states, and slot hover bounce.
    - *Traffic*: 4-way intersection visualizer with glowing lens halos, pulsating signals, and countdown ring timer.
    - *Streetlight*: adaptive lighting matrix with glowing lamp post flares, breathing halos, animated gradient brightness bars, and eco energy counter.
    - *Gate & RFID*: barrier gate with smooth physics rotation, scanner terminal glowing LED feedback, and access pass card with gradient chip styling.
    - *Environment*: PM2.5 radial gauge with breathing aura gradient and color-coded PCD air quality levels.
  - **Sidebar & Header**: rounded ACT 1961 logo with hover scale/rotation micro-interaction, active navigation glow border, and animated live connection radar beacon.
- All checks verified: `node tests/data-integrity.test.cjs` ✓, `npm run typecheck` ✓, `npm run build` (all 12 routes static/dynamic generated) ✓.


