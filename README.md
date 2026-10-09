# SizeUp

**Training prototype, not for operational use.**

SizeUp is a browser-based size-up drill for fire officers. Pick a sample building or photograph your own, tap where the fire starts, and set the conditions. Then run the drill from the command board: read the smoke, give your radio report, make your calls and orders, and watch the fire develop on a live clock.

- **Solo mode:** make your own size-up and decisions, then get a debrief.
- **Crew mode:** big-screen instructor view with clock control, injected events, and hidden answers while the crew calls them out.
- **Share:** save a PNG snapshot, or a self-contained scenario file (.html or .json) that opens offline.

**Live page:** https://adj141.github.io/sizeup/

The fire behavior is a simplified teaching model grounded in UL FSRI (Fire Safety Research Institute) research. See [FIRE-MODEL.md](FIRE-MODEL.md) ([PDF](FIRE-MODEL.pdf)) for how the calculations work and which parts are FSRI-calibrated versus teaching simplifications. It is not a physics fire model (not CFAST/FDS).

Image and source credits are in [CREDITS.md](CREDITS.md).

## What's new (Oct 9, 2026, evening)

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
- `src/` and `build.py`: the source pieces. `python3 build.py` rebuilds `index.html`. The build expects an `assets/` folder with `house.jpg` and `mixed.jpg`; those images are already embedded in `index.html`.
