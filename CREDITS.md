# SizeUp v2: credits, sources and licenses

Training prototype, not for operational use.

## Images (embedded in index.html as data URIs)

| Asset | Source | License |
|---|---|---|
| `assets/house.jpg`: 2-story house sample | Cropped from the SizeUp design mock made for AJ (AI-generated image, created for this project). A UI label was painted out (`assets/src/house-clean.png`). | Project asset (no third-party rights) |
| `assets/house-b.jpg`, `assets/house-c.jpg`, `assets/house-d.jpg`: Sides B, C and D of the 2-story house sample | **Illustrated views made for this project**, drawn as SVG by a script (`assets/src/sides.py`, SVG sources and PNGs kept in `assets/src/`) to match the colours and style of the AI-generated Side A mock. They are illustrations, not photos, and are labelled "Illustrated view (not a photo)" in the app. Side C shows the walk-out basement. | Project asset (no third-party rights) |
| `assets/mixed.jpg`: 3-story brick mixed-use sample | "Odd Fellows Hall, West End, 2023-10-07, 01.jpg" by **Cbaile19**, Wikimedia Commons: https://commons.wikimedia.org/wiki/File:Odd_Fellows_Hall,_West_End,_2023-10-07,_01.jpg (resized to 1440 px, JPEG q85; original kept in `assets/src/`) | **CC0 1.0** (public domain dedication) |

## Fire and smoke

All fire, smoke, glow, soot and window-interior effects are **procedural**: WebGL shaders plus a tileable FBM/billow noise texture generated at runtime in `src/render.js`. **No third-party video, footage, sprite sheets or textures are used.** That keeps the app fully offline with no licensing issues.

## Code

All application code (`src/*.js`, `src/*.css`, `src/body.html`, `build.py`) was written for this project. It uses no external libraries. Tests use `playwright-core` (Apache-2.0), which is a test-only dev dependency and is not shipped.

## Fire-behavior sources (UL FSRI)

The model's rules and the in-app **Behind the behavior** panel quote these pages verbatim. Quotes come only from the pages listed here.

- FSRI-HV: Impact of Ventilation on Fire Behavior in Legacy and Contemporary Residential Construction. https://fsri.org/research/impact-ventilation-fire-behavior-legacy-and-contemporary-residential-construction
- FSRI-VV: Effectiveness of Fire Service Vertical Ventilation and Suppression Tactics. https://fsri.org/research/effectiveness-fire-service-vertical-ventilation-and-suppression-tactics
- FSRI-VVR: Fire Service Summary Report: Vertical Ventilation and Suppression Tactics in Single Family Homes (PDF). https://fsri.org/sites/default/files/2021-07/2010-DHS-FD-Summary.pdf
- FSRI-PPV: Effectiveness of Fire Service Positive Pressure Ventilation (tactical considerations). https://technicalpanels.fsri.org/research-projects/effectiveness-of-fire-service-positive-pressure-ventilation.html
- FSRI-PPV2: Effectiveness of Fire Service Positive Pressure Ventilation (project page). https://fsri.org/research/effectiveness-fire-service-positive-pressure-ventilation
- FSRI-CFA: Study of Coordinated Fire Attack Utilizing Acquired Structures. https://fsri.org/research/study-coordinated-fire-attack-utilizing-acquired-structures
- FSRI-FA: Study of the Impact of Fire Attack Utilizing Interior and Exterior Streams on Firefighter Safety and Occupant Survival. https://fsri.org/research/study-impact-fire-attack-utilizing-interior-and-exterior-streams-firefighter-safety-and
- FSRI-CBYD: Close Before You Doze: Before & After. https://fsri.org/program-update/close-you-doze-series-after
- FSRI-BSMT: Understanding and Fighting Basement Fires (FSRI & ISFSI). https://fsri.org/research/understanding-and-fighting-basement-fires
- FSRI-ACAD: FSRI Fire Safety Academy (free courses, linked for further training). https://training.fsri.org/

FSRI content is quoted for training and reference with attribution. It is not redistributed.

### Labelled simplifications (not from FSRI)

- Reading Smoke color, volume, velocity and density mapping. These are widely taught generic cues, not FSRI measurements.
- All task times (line stretch, water supply, roof cut, search), tank and flow numbers, and the model's time constants. These are teaching values tuned so the timing *pattern* matches the FSRI findings cited above.
- Wind effects on the plume and flow path.
- The 360 walk time, the follow-up report check, and the fence, power-line, car and exposure effects. The basement behavior follows FSRI-BSMT; its thresholds are teaching values.
- Window glass failing on its own from heat. The timing is seeded and variable, and a "Holds" option keeps closed-house decay.
- Building-pressure smoke push at the eaves and around closed windows and doors.
- Smoke leaking around closed windows and doors is capped in volume and velocity because the gap limits what is visible.

## Command fundamentals mode: public sources

- Alan V. Brunacini, *Fire Command* (NFPA, 1985), source of the eight functions of command: https://archive.org/details/firecommand0000brun
- Phoenix Regional Standard Operating Procedures, M.P. 201.01 Command Procedures (public PDF): https://www.phoenix.gov/content/dam/phoenix/firesite/documents/20101.pdf
- Fire Engineering, "Command Safety": https://www.fireengineering.com/fire-safety/command-safety/
- FEMA, National Incident Management System: https://www.fema.gov/emergency-managers/nims

All wording in the app is SizeUp's own. SizeUp is not affiliated with, endorsed by, or a substitute for any commercial incident-command certification program. Scoring weights, times and thresholds are SizeUp teaching values.
