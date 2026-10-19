# SizeUp

**Training prototype, not for operational use.**

SizeUp is a browser-based size-up drill for fire officers. Pick a sample building or photograph your own, tap where the fire starts, and set the conditions. Then run the drill from the command board: read the smoke, give your radio report, make your calls and orders, and watch the fire develop on a live clock.

- **Solo mode:** make your own size-up and decisions, then get a debrief.
- **Crew mode:** big-screen instructor view with clock control, injected events, and hidden answers while the crew calls them out.
- **Share:** save a PNG snapshot, or a self-contained scenario file (.html or .json) that opens offline.

**Live page:** https://adj141.github.io/sizeup/

The fire behavior is a simplified teaching model grounded in UL FSRI (Fire Safety Research Institute) research. See [FIRE-MODEL.md](FIRE-MODEL.md) ([PDF](FIRE-MODEL.pdf)) for how the calculations work and which parts are FSRI-calibrated versus teaching simplifications. It is not a physics fire model (not CFAST/FDS).

Image and source credits are in [CREDITS.md](CREDITS.md).

## What's new (Oct 19, 2026): attic fires
- **No more fire from every eave at once.** A fire that starts in the attic shows heavy smoke from the eaves and gable vents on a 5-min arrival, heaviest over where it started, with no fire showing. The plastic ridge vent melts shut and the eaves pulse as the attic goes ventilation-limited (FSRI attic study).
- **It keeps burning.** The soffit and gable vents keep a ventilation-limited attic fire going on the roof framing; it no longer starves out after a few minutes.
- **Burn-through and collapse.** The roof deck burns through over the origin (about 9-10 min), fire then shows there first and spreads along the eaves, and the truss roof is flagged as likely to collapse about 3 min later (NISTIR 7094; NIOSH 2005-132). See FIRE-MODEL.md section 5i.

## What's new (Oct 11, 2026, late): basement fire smoke
- **No more instant "roof/attic" smoke on a basement fire.** Smoke from openings on the sides you are not looking at is now one thin, diluted plume per side, placed toward that side (B left, D right, C behind the ridge); gap leakage and grade/basement-level openings rarely clear the roofline.
- **Stair door matters.** Closed: smoke stays below and leaks at the basement windows and the Side C walk-out (do your 360). Open: the first and second floors fill and leak at their window and door gaps (NIOSH 2018-154: dense smoke at the ground or first floor with modest heat and no visible fire indicates a below-grade fire).
- **Eaves later and lighter.** A slow basement-to-attic chase (pipe and cable penetrations, NIOSH 2018-154) brings light eave smoke a few minutes after arrival. The rate is a teaching value. Fires that never reach the basement look and behave exactly as before.

## What's new (Oct 11, 2026, night): Command fundamentals mode (optional)

- **Off by default; with it off nothing changes.** Turn it on in Set up → Command. It's a generic teaching layer in SizeUp's own wording, citing public sources (Brunacini's *Fire Command*, a public fire-department SOP, FEMA NIMS). Not affiliated with, endorsed by, or a substitute for any commercial incident-command certification program. Each part has its own switch.
- **Guided initial radio report.** The radio box becomes a pick-list builder: unit on scene, building, conditions, actions and strategy, command position, command name and location, plus free text. Each step is checked live against the fire and the sides you've seen, and the assembled report reads back as you build it.
- **Command position.** Investigating, fast attack or command post. In fast attack the IC can direct only their own company until a command post is set up (60 s) or command is transferred. At a command post the officer no longer counts as crew.
- **Task, location, objective** on every company assignment.
- **Progress reports (conditions, actions, needs)** from companies: on status changes, as priority traffic (low air, conditions worsening) and on request. Acknowledge them, and assign to answer the need.
- **Benchmarks you declare** (all clear per floor, under control, loss stopped), checked against the model with times. Under control is now declared by the IC; the model's own detection is used for grading (hint only if Hints is on).
- **PAR prompts** (timer, after benchmarks, after strategy changes) and a **10-minute strategy check**.
- **Transfer of command** when the chief arrives: arrive and look, contact (face to face or radio), progress report, confirm assignments, announce. Each step takes drill time.
- **Command debrief:** a scorecard by the eight functions of command (Brunacini, *Fire Command*; weights are SizeUp teaching values), the radio report grade, and a benchmark timeline.
- **Your department's terms.** Pick-list wording, command names, accountability locations and every time are editable, saved in presets and exported with drills.

## Earlier (Oct 11, 2026): multi-side buildings and the 360

- **Four sides.** Tabs above the picture (or a swipe on a phone) switch between Sides A, B, C and D. Each side is drawn live on the same drill clock from its own windows and doors, with the eave rules applied to that side. Smoke from the other sides rises over the roofline.
- **The 360 costs time.** The first look at each of Sides B, C and D costs drill time (default 30 s, editable on the Task times tab). After that, switching is free. Every view is logged with its time.
- **360 follow-up report.** A board card builds the report: findings from a pick-list with a side (walk-out basement, extra stories, fire or smoke on another side, victims, power lines, fence, exposure, car), strategy confirmed or changed, assignment changes, the accountability location, and optional free text. It is checked against the scenario.
- **Debrief for the 360.** Shows which sides you saw and when, whether you gave a follow-up and which key findings it had, and whether your tactics adapted. A missed item is shown on that side's picture with the item outlined.
- **Sample house, now with Sides B, C and D** (illustrated views made for this project, not photos, labelled in the app). It has a rear bedroom and a **walk-out basement on Side C**: 3 stories at the rear, 2 at the front. Basement fires follow the FSRI basement study: going down the interior stair opens the stair door and puts the crew in the exhaust path (with a warning), crews over a burning basement get a collapse-risk warning, and a line through the walk-out door or a basement window attacks the fire from its own level.
- **Builder for every side.** Load a photo for each side (Side A required). Mark windows, doors, garage doors and basement openings, the eave and grade lines, the stories visible on that side, and features: fence, power lines, exposure building, car, porch/deck and utility meter. Each opening maps to a room (rear rooms and a basement are added as needed), and you can change the mapping. A side without a photo can have a text description instead. The builder's marks are hidden during the drill.
- **Features change tactics** (simple teaching rules): a fence adds hose-stretch time on its side; power lines block ladders and the aerial on their side; a car blocks the aerial; an exposure building takes radiant heat while fire shows on that side and can ignite unless a company protects it (new task: Protect an exposure).
- The board's Showing and Smoke readings now cover only the sides you've seen.

## Earlier (Oct 9, 2026, evening)

- **Eave and gap smoke reworked.** A closed-up first-floor fire now shows first at the fire room's own window and door gaps, not as a band along the second-floor eave. Eave smoke appears only when the attic has smoke or the top floor is smoke-charged, and it shows above the rooms feeding it (or at marked gable/soffit vents). Smoke from the gaps fades as a starved fire runs out of air, per the FSRI ventilation study ("no smoke showing"). Eave smoke pulses only for a ventilation-limited attic, irregularly, per the FSRI attic study. No smoke source puffs in lockstep any more.
- **Dispatch and companies.** A Dispatch tab before the drill builds the assignment: engines, ladders/trucks, rescues/squads, medics and a battalion chief, each with an ID, staffing (1 to 6), arrival time after dispatch and equipment. Engines have a tank (default 1000 gal), a pump, supply hose and editable preconnects (defaults: 1¾ in. 200 ft at 150 gpm ×2 and 2½ in. 200 ft at 250 gpm). Ladders and rescues have ground ladders, an aerial, a fan, saws and hooks. These are generic, editable defaults, not any department's SOP.
- **Presets.** "Generic first alarm (residential)" is built in. You can save and load your own assignments on this device, and the assignment travels inside exported drills.
- **Assign tasks to a company.** Companies show on the board as en route, staged, working (with a countdown) or available. You can give a specific company a task: stretch a chosen preconnect to a room or opening, lay a forward or reverse supply line from the hydrant, horizontal or vertical vent, PPV, door control, primary or secondary search, pull ceiling, ladder a side, RIT, scene lighting or rehab. A busy company is refused with the reason, and **Reassign** releases its current tasks. Quick orders still work; they go to the company that can start soonest.
- **Crews limit the lines** in place of the old 3-line cap. Each engine's tank feeds its own lines at their real gpm until a supply line reaches it. A line must be long enough for the setback and the run inside.
- **Editable task times.** The Task times tab holds the teaching values that every task time is built from, along with staffing, hose length, floor, setback, and cold and heat modifiers. They're saved and exported with the drill.
- **Time of day and weather.** Day, dusk or night: at night the scene darkens, fire glow lights the windows, smoke and facade, and smoke colour is hard to read until a company sets up scene lighting. Occupancy can follow the time of day. You can add rain, snow or fog, cold and icy or hot conditions, and wind with a scheduled wind shift. Wind into an open window of a burning room drives heat and smoke along the flow path; this follows the NIST wind-driven fire experiments.
- The debrief now lists each company and its tasks, supply, RIT and scene lighting.

## Earlier on Oct 9, 2026

- Orders picked from the dropdowns now stay selected while the drill clock runs. Pressing an order button with nothing picked shows a message.
- The line list puts burning rooms first and preselects one. One-tap "＋ Line → room" chips appear for burning rooms.
- Several hoselines at once, interior and exterior. Each line is shown on the board with its status, plus Reassign and Withdraw controls.
- Flashed-over rooms can now be knocked down. A knocked-down room left dry, with no line standing by, can rekindle once, slowly.
- The attic or cockloft can be reached by pulling the ceiling from a room below it, or with an exterior stream through an open roof vent.
- "Fire under control" when no room is still burning: a banner appears, the clock pauses, and you're prompted to open the debrief.
- Smoke lightens and clears faster after knockdown.
- Lines with no fire within reach stand by instead of draining the tank. A low-tank warning is logged.

## Files

- `index.html`: the complete app in one file. It works offline, with no server needed.
- `src/` and `build.py`: the source pieces. `python3 build.py` rebuilds `index.html`. The build expects an `assets/` folder with `house.jpg`, `mixed.jpg` and the sample house side views `house-b.jpg`, `house-c.jpg`, `house-d.jpg`; those images are already embedded in `index.html`.
