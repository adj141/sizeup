# SizeUp

**Training prototype, not for operational use.**

SizeUp is a browser-based size-up drill for fire officers. Pick a sample building or photograph your own, tap where the fire starts, and set the conditions. Then run the drill from the command board: read the smoke, give your radio report, make your calls and orders, and watch the fire develop on a live clock.

- **Solo mode:** make your own size-up and decisions, then get a debrief.
- **Crew mode:** big-screen instructor view with clock control, injected events, and hidden answers while the crew calls them out.
- **Share:** save a PNG snapshot, or a self-contained scenario file (.html or .json) that opens offline.

**Live page:** https://adj141.github.io/sizeup/

The fire behavior is a simplified teaching model grounded in UL FSRI (Fire Safety Research Institute) research. See [FIRE-MODEL.md](FIRE-MODEL.md) ([PDF](FIRE-MODEL.pdf)) for how the calculations work and which parts are FSRI-calibrated versus teaching simplifications. It is not a physics fire model (not CFAST/FDS).

Image and source credits are in [CREDITS.md](CREDITS.md).

## What's new (Oct 9, 2026)

- Orders picked from the dropdowns now stay selected while the drill clock runs. Pressing an order button with nothing picked shows a message.
- The line list puts burning rooms first and preselects one. One-tap "＋ Line → room" chips appear for burning rooms.
- Up to 3 hoselines at once, interior and exterior. Each line is shown on the board with its status, plus Reassign and Withdraw controls.
- Flashed-over rooms can now be knocked down. A knocked-down room left dry, with no line standing by, can rekindle once, slowly.
- The attic or cockloft can be reached by pulling the ceiling from a room below it, or with an exterior stream through an open roof vent.
- "Fire under control" when no room is still burning: a banner appears, the clock pauses, and you're prompted to open the debrief.
- Smoke lightens and clears faster after knockdown.
- Lines with no fire within reach stand by instead of draining the tank. A low-tank warning is logged.

## Files

- `index.html`: the complete app in one file. It works offline, with no server needed.
- `src/` and `build.py`: the source pieces. `python3 build.py` rebuilds `index.html`. The build expects an `assets/` folder with `house.jpg` and `mixed.jpg`; those images are already embedded in `index.html`.
