# FORGE — your CSWP study atlas

A personal, responsive SOLIDWORKS study companion for learners, running from **29 October to 20 November 2026**. Vanilla JavaScript and CSS, no npm dependencies, paid services or API keys.

## Start on your Mac

Double-click **Start_FORGE.command**. Keep the Terminal window open while using the app. It launches your browser with a private access link and enables access from your phone on the same trusted Wi-Fi.

Or run:

```sh
cd "path/to/forge"
python3 server.py --share --open
```

Do not open `index.html` directly: browsers restrict JavaScript module loading from local files. Use the launcher or Python server.

To stop, press **Control+C** in the Terminal window. If port 8765 is occupied, use `python3 server.py --share --open --port 8766` instead.

## Open it on your phone

1. Connect the phone and Mac to the same trusted Wi-Fi; keep the Mac awake.
2. In FORGE, open **Settings → Take your workshop with you**.
3. Copy the private phone link and open it in Safari or Chrome on your phone.
4. You may use Safari’s Share → Add to Home Screen for a convenient shortcut.

The link grants access to your shared progress and the Calendar helper. Keep it private. A new server launch generates a new access link. macOS may ask to allow incoming connections. Guest Wi-Fi or a network that isolates devices can prevent phone access.

Phone and desktop share progress through the local helper when opened with their private links. Reload a device to retrieve the latest shared version. Concurrent saves use a revision check: an older device keeps its work locally instead of overwriting newer progress. Export its backup before reloading if that happens.

## Connect Apple Calendar

1. Open **Calendar**, choose your available hours, preferred session times and study days, and save.
2. Click **Connect Apple Calendar**. On first use, the server compiles a small native helper using Apple Command Line Tools. Allow the requested Calendar access in macOS.
3. The helper reads busy intervals, including recurring and all-day events. Calendar titles and event descriptions from your other calendars are not sent to the browser.
4. Review the proposed sessions. Conflicts and sessions that cannot fit are shown explicitly. Today’s elapsed times and completed study missions are excluded.
5. Click **Add / update sessions**. The helper checks availability again and saves to **FORGE • CSWP 2026**, with tasks, links and ten-minute reminders. Sessions with new conflicts are skipped.

Repeated direct additions update the existing FORGE session IDs. They do not delete other events. Previously added study sessions that are later omitted from the preview remain in Calendar; remove those manually if you change study days or complete a mission early. Completed events can remain as your study record.

The first connection requires macOS permission and has **not** been exercised during development. If compiling the helper or Calendar access fails, **Export sessions (.ics)** works without the helper. Import into a dedicated calendar. Repeated manual imports may create duplicates; replace the old imported study calendar when reimporting a changed plan.

The app intentionally does **not** schedule your exam: its start time and academic sitting format must be confirmed with your lecturer. Exam-day prompts are available in the Atlas.

## Meet Bevel

Bevel now wanders around the screen’s edges across all pages. His transparent artwork matches the approved mint cube character. Click or tap him to open his compact tip panel.

- Hover over him or give him keyboard focus to stop his movement. Click or tap to open his tips; the panel stays put while open. Escape closes it for keyboard users.
- Choose **A tip, Bevel?** for guidance from the current lesson.
- Use **Pause wandering** in his panel or the checkbox in Settings for a persistent pause. Resume is available from the same places.
- Starting a focus timer changes him to his pencil pose. Tips remain visible while the timer ticks.
- Completing a new mission triggers a short celebration with the exact XP award; completing a full day includes the 25 XP bonus.
- He also celebrates an unaided re-test and offers encouragement when you record a mistake.
- **Settings → Quiet mode** keeps him still and skips celebration reactions. The operating system’s reduced-motion preference also stops movement.
- Reactions are brief and silent. He stays above phone navigation and checks for visible controls before taking each movement step. His tip panel is kept inside the viewport.
- Reduced-motion and quiet mode stop wandering. Mouse hover and keyboard focus also pause him; touch input does not leave a stuck hover state.

Bevel offers built-in curriculum guidance. His artwork is decorative; the accompanying text and labelled buttons provide the accessible interaction. There are no sound effects or automatic chat pop-ups.

The wandering update passed 32 code checks: 16 for viewport boundaries and movement math, and 16 simulated event checks for hover, keyboard focus, opening/closing, touch, persistent pause/resume, quiet mode, reduced motion and cleanup. JavaScript and Python syntax checks pass. These are code-level checks; visual browser verification remains unavailable because the browser connection previously returned a session error. Restart the server after updating so it can serve the new companion module.

## Your daily routine

- Open **Workshop** and select a numbered day on the route.
- **Learn** the principle, **Practice** the exact exercise in SOLIDWORKS, then **Reflect** and check the finish line.
- Use the focus timer if helpful. Record a result or measurement before marking a mission complete.
- Capture recurring problems in **Mistake lab**, set a re-test date and resolve them after an unaided repeat.
- Visit **Atlas** to revisit missed days and inspect progress. No artificial locks prevent revision.

Learn earns 15 XP, Practice 40 XP and Reflect 20 XP, plus a 25 XP bonus for all three. A streak counts consecutive South African dates with completed work. Rewards reflect self-reported effort, not automatic CAD grading or guaranteed exam readiness.

The plan contains **23 days, 69 missions**, including 66 pre-exam sessions (2,150 study minutes) and three short exam-day prompts. The full mock is 70 + 50 + 80 minutes. The official sample PDF is for Segment 1; other rehearsals use fresh configuration and assembly exercises.

## Save and move your progress

Use **Settings → Export progress** regularly. Import replaces device progress after confirmation. Backups do not contain the private access link or calendar access. Timers are device-local.

The helper stores progress in its ignored private runtime directory. Do not commit runtime data, access links or compiled binaries. If browser-local progress is replaced when connecting to shared progress, a prior device snapshot is retained in browser storage under `forge-cswp-v1-device-snapshot` for recovery.

## Put the source on GitHub

Commit these source files to your own repository. Do not include the private runtime directory or generated design concepts. `.gitignore` excludes them.

To use **GitHub Pages**, choose **Settings → Pages → Deploy from a branch → main / root** in that repository. The JavaScript/CSS app works as a static site with no build. GitHub Pages is an optional deployment, not part of this delivery.

On Pages, progress is saved in each browser, and .ics export remains available. Direct Apple Calendar integration and shared progress require the Python helper on the Mac. They cannot run on GitHub Pages. Use JSON backup/import to move progress between static copies.

## Design and accessibility

The interface follows a tactile industrial-design workbook: a numbered route, chapter spine, lesson sheets and a focus dial. The approved concept’s decorative technical illustration is intentionally omitted so the workbook remains code-native and the space serves actual teaching content.

- 60% cool neutral `#EDF2F4`, 30% muted mint `#DDECE6`, 10% forest green `#136349` as a visual composition guideline.
- Ink `#18382D` and secondary text `#496259`. Functional borders remain visible independently of the soft shadows.
- Responsive layouts defined for desktop, tablet, phone and 320px widths.
- Semantic navigation, native forms, keyboard-operable mission tabs, skip link, labelled controls, visible focus, reduced-motion and forced-colour support.
- Primary touch controls are at least 44 CSS pixels. Completion is communicated with text and symbols as well as colour.

Designed toward relevant WCAG 2.2 AA criteria, without claiming audited conformance.

## Validation and limits

- Curriculum and scheduling: 15 automated checks passed, including date boundaries, calendar clashes, non-overlap, completed-task exclusion, past-time handling, UTC conversion, recurrence-expanded interval handling, and UTF-8 .ics folding.
- All six views render meaningful markup in a JavaScriptCore DOM stub; XP/day bonus calculation, escaped user content and invalid-backup rejection passed. These are code checks, not browser layout tests.
- Another 16 checks passed for helper authentication, cross-origin rejection, revision conflicts, event validation and palette contrast. Main text/background contrast ratios range from 5.86:1 to 11.33:1; white on the green primary button is 7.22:1.
- JavaScript syntax checked with JavaScriptCore. Python syntax checked; the native Swift/EventKit helper compiles on this Mac.
- The original bracket drill’s analytical masses were independently calculated: **1042.63 g** initially; **1541.59 g** after resizing.
- This execution session could not bind a preview server, and browser-control connections were unavailable. Desktop/mobile rendering, actual touch/keyboard interaction and live Calendar permission/write flows still need a first-run check. No calendar events have been added.

Official resource links were checked on 29 October 2026. No paid training is required; MySolidWorks videos may require an account or subscription. CAD practice still requires access to SOLIDWORKS and the correct exercise files.

## Source map

| File | Purpose |
| --- | --- |
| `index.html` | Semantic app shell |
| `styles.css` | Responsive soft UI and accessibility styles |
| `data.js` | Full curriculum, teaching notes and references |
| `app.js` | Lessons, timer, rewards, mistakes, progress and navigation |
| `bevel.js` / `bevel.css` | Companion reactions, contextual tips and responsive styling |
| `bevel-wander.js` | Viewport movement, hover/focus pause and click/tap tip panel |
| `assets/bevel-*.png` | Three transparent Bevel poses |
| `calendar.js` | Scheduling and standards-based .ics generation |
| `server.py` | Optional private local/LAN server, shared progress and native bridge |
| `CalendarBridge.swift` | EventKit calendar read/write helper |
| `CalendarBridge-Info.plist` | macOS Calendar usage descriptions |
| `Start_FORGE.command` | One-click Mac launcher |

Independent study software, not an official SOLIDWORKS product or exam question bank.
