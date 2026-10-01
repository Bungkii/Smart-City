# Project context

Updated: 2026-10-01

## Follow-up: 6-board firmware upgrade & cloud verification — 2026-10-01

- Added Board 6 (`ESP32-6_RFID Exit Gate.ino`) for GT-2 RFID Gate Out with outbound scan logging.
- Upgraded Board 2 (TR-1) and Board 5 (SL-1) with auto-reconnection and explicit SSL socket termination (`http.stop()`, `sslClient.stop()`) on Arduino UNO R4 to prevent offline dropouts.
- Upgraded Board 3 (PK-1) with OLED display layout showing "Avail X/8", Royal Thai Navy NTP time sync (`time.navy.mi.th`), and live aggregate occupancy telemetry to Supabase.
- Upgraded Board 4 (EN-1) with auto-reconnect and NTP time synchronization.
- All 6 boards configured with Wi-Fi network `Secondary_STEMBELL` in local `SmartCitySecrets.h`.
- Documented Board 5 and 6 pinouts in `Arduino/README.md` and `Arduino/WIRE.md`, recommending ESP32 over ESP8266 due to GPIO availability and TLS memory stability. Updated `ESP32-5_Adaptive Street Light.ino` to cleanly map ESP32 GPIOs (LDR: 34, PIR: 27, PWM: 18) while maintaining UNO R4 compatibility.
- Web dashboard verified live at `https://smartcity.bungkii.app/`, showing real-time incoming events from deployed hardware (TR-1, PK-1, GT-1, GT-2).
- Unit tests (`data-integrity.test.cjs`), typecheck, and Next.js production build passing cleanly.

## Follow-up: five-board firmware integrity pass — 2026-09-27

- User explicitly authorized editing Arduino Board 1–5 for the new system. Firmware no longer publishes fixed September 2026 timestamps or invented coordinates. Supabase events use the database timestamp; ESP32 dashboard-ingest paths require synchronized UTC.
- Board 1 treats database failures and parse failures as verification unavailable and keeps the gate closed, separately from a genuinely unregistered card. It no longer prints full card records to Serial. Boards 1, 3 and 4 no longer upload Wi-Fi credentials to `settings`.
- Board 2 reports all-red as red rather than yellow. Board 3 no longer claims eight available spaces or a made-up A-01 bay; it only displays entrance/exit sensor triggers since boot and sends no occupancy until real bay sensing and a restart-safe baseline exist.
- Board 4 no longer substitutes DHT values or estimates PM2.5 from MQ-2. Environment telemetry can omit PM2.5; the dashboard preserves temperature/humidity and shows PM2.5 unavailable. Board 5 no longer emits fixed date/coordinate data.
- Board-local `SmartCitySecrets.example.h` templates and Git ignore replace embedded deployment credentials in source. Previous credentials in Git history must be rotated. ESP32 sketches still use insecure TLS and firmware has not been compiled/flashed or physically tested.
- `Arduino/README.md` now explains setup and each board's actual data limits. The database was not modified; legacy records remain.
- Added a runtime schema test proving temperature/humidity events remain valid without PM2.5 and rejecting a nonnumeric PM value.

## Follow-up: operational RFID card registry — 2026-09-27

- User asked for a serious real card-enrolment workflow with no mock screen. Gate detail now opens the registry even before gate telemetry, with an explicit empty/unavailable gate state instead of an invented closed state or decorative sample pass.
- Registry read, create, edit and delete go through `/api/rfid` with `RFID_ADMIN_TOKEN`; server-only `SUPABASE_SERVICE_ROLE_KEY` performs database operations. Create no longer upserts; duplicate UID returns 409. Edit keeps UID fixed. New cards default to banned. Save/delete responses and reloaded records are reported distinctly.
- `supabase/migrations/20260927_rfid_access.sql` and the installer schema restrict public database operations to card SELECT and gate-log INSERT required by current Board 1 firmware. No database rows were deleted. Existing deployment still needs the migration and server secrets configured manually.
- Board 1 source now denies access when Wi-Fi is unavailable; hardware needs reflashing. Existing direct publishable-key card read, log write, firmware credentials and insecure TLS remain production-security limitations. Wi-Fi settings authorization remains separate. Registry currently loads 500 latest cards and 50 logs; page search only covers those loaded records.
- `.env.example` uses placeholders instead of real-looking keys and documents the two new server secrets. Validation and Git status for this task are recorded by the final turn result; no real Supabase or hardware operation was attempted.

## Follow-up: Apple-inspired design and full HeroUI controls — 2026-09-27

- User requested an Apple-inspired design with HeroUI throughout. Reworked `src/app/premium.css` toward quiet white surfaces, soft blue weather emphasis, larger hierarchy, rounded cards and controls, and restrained shadows. The ACT logo, IBM Plex Sans Thai, navy sidebar and real-data-only rules remain.
- Converted overview KPI cards to HeroUI `Card`, navigation toggles to HeroUI `Button`, all shared dropdowns to HeroUI `Select`, and critical confirmations to HeroUI `AlertDialog`. Existing HeroUI buttons, inputs, chips, alerts and spinners remain. The now-unused `@headlessui/react` package was removed from the manifest and lockfile. Native semantic links/sections, charts and the invisible mobile backdrop are retained.
- Type generation, TypeScript, production build and data-integrity test passed. Browser visual inspection and real-hardware interaction were unavailable; no hardware command was sent. Build keeps the existing non-fatal Node 20/Supabase and external package-lock warnings.

## Follow-up: Premium UI refinement — 2026-09-27

- User requested a premium UI. Added `src/app/premium.css` after existing styles to create a coherent white/navy command-center finish across the shell, KPI cards, weather strip, subsystem cards and overview panels.
- Increased text sizes and hierarchy, aligned card spacing and heights, softened borders and shadows, and tuned tablet/mobile layouts. Interaction and real-data logic were not changed; missing readings stay visibly missing.
- Validation: `node tests/data-integrity.test.cjs`, `npx next typegen`, `npm run typecheck`, and `npm run build` passed. Browser visual inspection and real-hardware testing were not available in this session. The existing Node 20/Supabase and external package-lock warnings remain non-fatal.

## Follow-up: Headless UI and HeroUI controls — 2026-09-27

- User requested another interface pass using Headless UI and HeroUI throughout the existing dashboard. Preserved the white/navy palette, IBM Plex Sans Thai and real-data-only behavior.
- Added a shared Headless UI Listbox for the environment station, device command, RFID role and RFID status. All use the same styled dropdown and keyboard navigation.
- Replaced native browser confirmation prompts for live device commands and RFID deletion with a Headless UI dialog and HeroUI actions. The command confirmation identifies the target device and warns that it affects real hardware; RFID confirmation identifies the card UID.
- Styles are in `src/app/ui-controls.css`; HeroUI remains the button/input/chip layer already used across the dashboard. No provider is required for installed HeroUI v3.
- Removed invented parking bay labels/license plates and assumed streetlight power/energy savings from the detail visualizers, preserving the real-data-only rule. Removed remaining monospace RFID UID overrides.
- Type generation, TypeScript check, data-integrity test and final production build passed. Browser visual inspection was unavailable in this session; no hardware control command was sent. An existing Google Fonts import-order warning was fixed by moving the IBM Plex Sans Thai import before Tailwind/HeroUI imports. The build still reports Node 20/Supabase and external package-lock warnings, without failing.

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

## Follow-up: Full HeroUI Component Adoption Across All Surfaces — 2026-09-26

- User request: "HeroUI ละใช้แม่งให้หมดเลย"
- Replaced native UI elements with HeroUI v3 component suite across all pages and visualizers:
  - **`Alert`**: Replaced standard `.error-bar` with HeroUI `Alert` (`status="danger"`, `Alert.Title`, `Alert.Description`) with retry button integration.
  - **`Spinner`**: Used HeroUI `Spinner` (`size="sm"`) for the loading state during live telemetry connection.
  - **`Input`**: Replaced all native text, password, and search inputs in `Dashboard.tsx` (Device Search, Device Control commands, Settings Token, Wi-Fi SSID & Password) and `SystemVisualizers.tsx` (RFID Card UID, Card Holder Name).
  - **`Button`**: Replaced native HTML `<button>` and interactive triggers with HeroUI `Button` (`variant="primary" | "outline" | "ghost"`, `size="sm"`, `onPress`, `isDisabled`, `fullWidth`) for toolbar tools, CSV export, wall mode, control submissions, Wi-Fi sync, and Gate RFID visualizer tab switches.
  - **`Chip`**: Replaced status badges with HeroUI `Chip` (`variant="soft"`, `color="success" | "warning" | "danger" | "accent" | "default"`) for connection status, health pills, device metadata tags, RFID roles (Student, Teacher, Staff, VIP), scan direction (IN, OUT), authorization results (Granted, Denied), and Thai PCD air quality badges.
- All checks verified: `node tests/data-integrity.test.cjs` ✓, `npm run typecheck` ✓, `npm run build` (12/12 static/dynamic routes compiled) ✓.
## Follow-up: RFID UID Auto-Capture & Remote Control for All 5 Boards — 2026-09-26

- User request: "พร้อมมีให้เพิ่มบัตร แสกนบัตรเป็น UID ลงไป หรือควบคุมทุกboardผ่านระบบนี้ได้หมด"
- **RFID Card Scanning & UID Auto-Capture**:
  - `GateVisualizer` (`src/components/SystemVisualizers.tsx`):
    - Added 1-click auto-capture button (`⚡ ดึง UID นี้มากรอกทันที`) whenever a card is tapped on the physical gate reader (`cardRef` from live telemetry or latest scan logs).
    - Added quick "+ เพิ่ม / จัดการสิทธิ์บัตร UID" button directly under the live RFID card visualizer preview.
    - Added "+ เพิ่มบัตรนี้" / "✏️ แก้ไขบัตร" action buttons on every row of the real-time Gate Scan Logs table (`gate_logs`).
    - Added 1-click status toggling (Allow / Banned) and card deletion with confirmation.
  - `src/app/api/rfid/route.ts`:
    - Added `DELETE` endpoint handler to remove RFID cards by `card_id` query parameter from Supabase table `rfid_cards`.
- **Command & Control for ALL 5 Smart City Boards**:
  - `src/lib/model.ts`:
    - Expanded Zod `commandSchema` discriminated union to support all 5 hardware systems:
      - `gate`: `open`, `close`, `hold_open`, `lock`
      - `traffic`: `adaptive`, `fixed`, `manual`, `force_ns_green`, `force_ew_green`, `force_all_red`, `incident_clear`
      - `streetlight`: `auto`, `manual`, `on`, `off`, `eco_mode`, `dim_50`, `full_100`
      - `parking`: `reset_bay`, `reserve_bay`, `calibrate`
      - `environment`: `calibrate`, `alert_test`, `fan_on`, `fan_off`
  - `src/components/Dashboard.tsx`:
    - Enabled `ControlPanel` for all 5 subsystems without restriction.
    - Configured comprehensive Thai labels, system icons, and command descriptions for each board.
    - Integrated operator token validation and error handling.
- **Validation**:
  - `node tests/data-integrity.test.cjs` ✓ PASS
  - `npm run typecheck` ✓ PASS
  - `npm run build` (12/12 routes compiled with Next.js Turbopack) ✓ PASS

## Follow-up: Clean & Professional Industrial UI (De-AI Polish) — 2026-09-26

- User request: "ทำให้ UI ไม่ Ai เกินไป"
- **Clean Industrial Aesthetic Refinements**:
  - **Removed Over-the-Top AI Tropes & Emojis**:
    - Removed random emoji clutter from all device control options, select menus, Wi-Fi configuration forms, and action buttons.
    - Replaced sci-fi buzzwords ("COMMAND CENTER MATRIX", "LIVE PARKING BAY MATRIX", "ADAPTIVE LIGHTING MATRIX", "FLEET WI-FI SYNC") with clean, standard industrial engineering terminology ("ผังช่องจอดรถ", "สัญญาณไฟจราจร", "ระบบไฟส่องสว่าง", "ระบบไม้กั้น & บัตรผ่าน", "การตั้งค่า Wi-Fi กลาง").
  - **Refined Status Indicators & Visual Indicators**:
    - Removed neon glowing halos, over-hyped box-shadows, and pulsating radar animations.
    - Switched to crisp, solid SCADA-style status indicators with clean border contrast and standard color definitions.
  - **Natural & Calmer Micro-Interactions**:
    - Softened hover transitions (`whileHover={{ y: -2, transition: { duration: 0.15 } }}`) to eliminate distracting bouncy scale shifts.
    - Refined radial air quality gauge, traffic housing, and streetlight visualizer for an authentic control-room look.
- **Validation**:
  - `node tests/data-integrity.test.cjs` ✓ PASS
  - `npm run typecheck` ✓ PASS
  - `npm run build` (12/12 routes compiled with Next.js Turbopack) ✓ PASS

## Follow-up: Remove Eyebrow Header Tag — 2026-09-29

- User request: Removed the `ASSUMPTION COLLEGE THONBURI · SMART CAMPUS` eyebrow tag from the top of `OperationsOverview.tsx`.
- **Validation**:
  - `node tests/data-integrity.test.cjs` ✓ PASS
  - `npm run typecheck` ✓ PASS
  - `npm run build` (12/12 routes compiled with Next.js Turbopack) ✓ PASS

## Follow-up: Command Palette & Global Hotkey (⌘K / Ctrl+K) — 2026-09-29

- User request: Added Quick Search / Command Palette modal with global hotkey support.
- **Implementation**:
  - `src/components/CommandPalette.tsx`: modal search with real-time filtering across Command Center, 5 subsystems, and settings, supporting keyboard navigation (`↑`/`↓`/`↵`/`Esc`).
  - `src/app/spotlight.css`: clean frosted modal styling and responsive shortcut badges.
  - `src/components/Dashboard.tsx`: registered global `mod+K` (`Ctrl+K` / `⌘K`) listener and added topbar quick search button.
- **Validation**:
  - `node tests/data-integrity.test.cjs` ✓ PASS
  - `npm run typecheck` ✓ PASS
  - `npm run build` (12/12 routes compiled with Next.js Turbopack) ✓ PASS

## Follow-up: 1-Second Continuous Telemetry & RFID Live Polling — 2026-09-29

- User request: Update dashboard polling interval to continuous 1-second real-time refresh and ensure live card scan logs refresh automatically.
- **Implementation**:
  - `src/components/Dashboard.tsx`: Set telemetry polling interval to 1000ms (`setInterval(load, 1000)`).
  - `src/components/OperationsOverview.tsx`: Updated indicator label to "ตรวจสอบข้อมูลทุก 1 วินาที (Real-time)".
  - `src/components/SystemVisualizers.tsx`: Added 1-second auto-refresh for authorized RFID Registry & Gate Logs.
- **Validation**:
  - `node tests/data-integrity.test.cjs` ✓ PASS
  - `npm run typecheck` ✓ PASS
  - `npm run build` (12/12 routes compiled with Next.js Turbopack) ✓ PASS



