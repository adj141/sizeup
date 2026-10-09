# SizeUp

**Training prototype, not for operational use.**

SizeUp is a browser-based size-up drill for fire officers. Pick a sample building or photograph your own, tap where the fire starts, and set the conditions. Then run the drill from the command board: read the smoke, give your radio report, make your calls and orders, and watch the fire develop on a live clock.

- **Solo mode:** make your own size-up and decisions, then get a debrief.
- **Crew mode:** big-screen instructor view with clock control, injected events, and hidden answers while the crew calls them out.
- **Share:** save a PNG snapshot, or a self-contained scenario file (.html or .json) that opens offline.

**Live page:** https://adj141.github.io/sizeup/

The fire behavior is a simplified teaching model grounded in UL FSRI (Fire Safety Research Institute) research. See [FIRE-MODEL.md](FIRE-MODEL.md) ([PDF](FIRE-MODEL.pdf)) for how the calculations work and which parts are FSRI-calibrated versus teaching simplifications. It is not a physics fire model (not CFAST/FDS).

Image and source credits are in [CREDITS.md](CREDITS.md).

## Files

- `index.html`: the complete app in one file. It works offline, with no server needed.
- `src/` and `build.py`: the source pieces. `python3 build.py` rebuilds `index.html`. The build expects an `assets/` folder with `house.jpg` and `mixed.jpg`; those images are already embedded in `index.html`.
