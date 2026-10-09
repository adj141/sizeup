# How SizeUp's simulated fire works

*For fire officers. This describes the code in `src/model.js` exactly as it runs today (SizeUp v2, Oct 2026).*

> **Read this first.** SizeUp uses a **teaching model**, not fire physics. It is not CFAST, FDS or any validated zone/CFD model. Every number in it is a **dimensionless index** (0 = nothing, 1 = "flashover-level"), not °F, kW or ppm. The model's job is to put events in the **right order with roughly the right timing**, and to react to tactics the way the UL FSRI experiments describe. It cannot predict any real building. Training prototype, not for operational use.

Each rule below is labelled:
- **[FSRI: source]**: the behavior or timing is set to match a finding on the named UL FSRI page (quotes are in the app's *Behind the behavior* panel).
- **[Teaching value]**: a number chosen so the drill plays sensibly. It is not from research.

FSRI sources referred to:
- **VVR**: *Fire Service Summary Report: Vertical Ventilation and Suppression Tactics in Single Family Homes* (PDF)
- **VV**: *Effectiveness of Fire Service Vertical Ventilation and Suppression Tactics*
- **HV**: *Impact of Ventilation on Fire Behavior in Legacy and Contemporary Residential Construction*
- **CFA**: *Study of Coordinated Fire Attack Utilizing Acquired Structures*
- **FA**: *Impact of Fire Attack Utilizing Interior and Exterior Streams*
- **PPV**: *Effectiveness of Fire Service Positive Pressure Ventilation*
- **CBYD**: *Close Before You Doze: Before & After*

---

## 1. The building as the model sees it

- **Rooms ("zones")**: living room, kitchen, foyer, bedrooms, hall, attic/cockloft, and so on. Each has a size factor `vf` (1 = typical room; a big open room is 1.2–1.4). Bigger rooms heat and fill with smoke more slowly.
- **Openings to the outside**: windows, doors, the garage door, roof vents you cut. Each opening is *closed*, *open*, *failed* (broken glass) or *controlled* (door held to hose width).
- **Connections between rooms**, each with a "how freely do heat, smoke and air pass" number `k`:

| Connection | k | Label |
|---|---|---|
| Open archway / open plan | 1.0 | Teaching value |
| Interior door open | 0.9 | Teaching value |
| Open stair | 0.85 | Teaching value |
| Ceiling pushed (after roof/ceiling breach) | 0.6 | Teaching value |
| Interior door **closed** | 0.025 | Teaching value; the effect is FSRI: VVR/CBYD (closed door protects the room) |
| Intact ceiling to attic | 0.02 | Teaching value |
| Wall | 0.004 | Teaching value |

## 2. What each room tracks

| State | Meaning | Range |
|---|---|---|
| `q` heat release | How hard the fire in this room is burning | 0 → ~1.4 (a flashed room is driven toward 2) |
| `T` heat | Hot-gas temperature index; **1.0 = flashover level** | 0 → ~1.5 |
| `s` smoke | How full of smoke the room is | 0 → 1 |
| `R` oxygen reserve | Air still trapped in the room/building that the fire can use | 1 at ignition → 0 |
| `fuel` | Fuel remaining | 1 → 0 |
| `wet` | How much water has cooled the room and its fuel | 0 → 1 |
| `steam` | Steam from water application (whitens smoke) | 0 → 1 |
| flags | ignited, ventilation-limited, decaying, flashed over, knocked out | yes/no |

Each opening also tracks a **glass heat** counter, and the hidden occupant (if any) tracks an exposure **dose** (0 → 1).

## 3. The clock: one-second steps

- The model advances in **1-second steps**. Before arrival it runs silently for the "time since ignition" you chose (e.g. 210 s). At arrival the drill clock reads T+0:00.
- At 1× the app runs one step per real second; 2×, 4× and 10× run 2, 4 or 10 steps per second. Evolve and +1 min run many steps at once.
- Every order or inject is a timestamped action. The same scenario, seed and actions always replay to exactly the same result.

Each step runs in this order:

```mermaid
flowchart TD
  A[Apply any orders or injects due now] --> B[Air map: how much air reaches each room<br/>from openings, through connections]
  B --> C[Water: supply, tank, which lines are flowing,<br/>how much water each room gets]
  C --> D[Each burning room: growth potential vs air cap<br/>→ heat release q, heat T, fuel, smoke]
  D --> E[Heat and smoke move between connected rooms<br/>upward and toward exhaust]
  E --> F[Neighbors hot enough ignite<br/>flames out a window expose the floor above]
  F --> G[Window glass heats and may fail]
  G --> H[Occupant dose, search progress,<br/>crew-safety checks]
  H --> I[t = t + 1 s]
  I --> A
```

## 4. Step by step

### 4a. Air supply (the flow path's "in" side)

Each opening lets in air according to its state:

| Opening state | Air value | Label |
|---|---|---|
| Closed window (leakage) | 0.004 | Teaching value |
| Closed door (leakage) | 0.007 | Teaching value |
| Door **controlled** (to hose width) | 0.15 | Value is teaching; the effect is FSRI: VVR, CFA ("the door should be controlled until water is applied") |
| Open/failed window | 0.5 | Teaching value |
| Open door | 1.0 | Teaching value |
| Open garage door | 1.5 | Teaching value |
| Roof vent | 1.25 | Teaching value |

- **Wind** blowing into an opening multiplies its air by 1.4 / 1.9 / 2.6 for light / moderate / strong. [Simplification]
- A **PPV fan** adds +1.6 air to the room at the entry door. [Teaching value]

Air then spreads through the house in four passes:

```
air[room] = own openings + Σ over connections ( k × air[neighbor] × 0.6 )
```

Air reaching a room through an open stair or hall counts, but almost none passes a closed door (k = 0.025). That is how a **remote vent opening a flow path to the fire** shows up. [FSRI: HV, VVR, flow path]

If there is a **high exhaust** (a roof vent) in the room or a connected one, the room's air is boosted by up to 90% (`× (1 + min(0.9, 0.7 × exhaust))`), modeling low intake / high exhaust. [Behavior FSRI: VV; size teaching value]

### 4b. How a fire grows: the growth curve

A burning room has a **growth potential** that follows a "t-squared" curve, a standard fire-engineering shape:

```
potential = min(1.25, (time since ignition ÷ tg)²)
```

| Contents | tg (growth time) | Response time τ (heat release) | τT (heat) | Smoke factor | Fuel load |
|---|---|---|---|---|---|
| Modern synthetic | 250 s | 22 s | 50 s | 1.35 | 1000 |
| Legacy | 1400 s | 100 s | 190 s | 0.85 | 2600 |

These values were **tuned to FSRI: VVR timing**. FSRI found that a closed house went ventilation-limited in **about 5 minutes with modern fuel vs about 18 minutes with legacy**, and that ventilation-to-flashover took **about 2 minutes (modern) vs over 8 minutes (legacy)**. What SizeUp produces (living-room fire, closed house, glass held):

| | FSRI (VVR) | SizeUp today |
|---|---|---|
| Modern: ignition → ventilation-limited | ~5 min | 4.0 min (240 s) |
| Legacy: ignition → ventilation-limited | ~18 min | 16.7 min (1002 s) |
| Modern: door opened at 8 min → flashover | ~2 min | 1.8 min (107 s) |
| Legacy: door opened at 18 min → flashover | >8 min | ~16 min (982 s) |

The shape matches; the exact minutes are approximate.

Other rules:
- After flashover the potential is set to 2, meaning "burn as hard as the air allows."
- An attic grows 1.6× slower.
- Below 25% fuel remaining, the potential falls with the fuel.
- Water multiplies the potential by (1 − 0.97 × wet).

### 4c. The air cap: ventilation-limited fire

The fire can only burn as hard as its air allows:

```
air limit      = 0.03 + 0.62 × air reaching the room
oxygen reserve R: refills slowly through openings, drains when the fire burns above the air limit
   R ← R + [ (own openings + 0.02) × 0.012 × (1 − R)  −  (q − air limit) × 0.0105 ÷ room size ] each second
cap            = air limit + 1.3 × R
target         = smaller of (potential, cap)
q              moves toward target:  q ← q + (target − q) ÷ τ   each second
```

- At ignition `R = 1`, so a closed room grows on its trapped air at first. As the fire uses that up, `R` falls and the cap drops toward the leakage-only air limit.
- **Ventilation-limited** is flagged when the potential exceeds the cap by more than 0.03 (and the room isn't wet).
- **Decay (starved for air)** is flagged when it is ventilation-limited, the reserve is below 0.15, and the air limit is below 0.35.

This reproduces the FSRI sequence: growth, then ventilation-limited, then decay while the house stays hot. **New air from any source (a failed window, an opened door, a vent) raises the cap and starts a second growth stage.** [FSRI: VVR, "Once an opening is made, a second growth stage begins"]

**Lag**: `q` rises with τ = 22 s (modern) or 100 s (legacy), halved after flashover. Heat `T` lags further behind (τT 50 / 190 s). That is why a vent can look good for a minute and then turn bad. [FSRI: VVR, "The fire does not react to additional oxygen instantaneously… 2 minutes later…"]. The values themselves are tuned teaching values.

### 4d. Heat, fuel and smoke inside the room

```
heat target  = min(q, 1.3) × 1.15 (attic 1.0) ÷ √(room size) × (1 − 0.6 × wet)
T            moves toward heat target with τT rising; falls with a 240 s lag (6 s while water is on it)
fuel         ← fuel − q ÷ fuel load   each second
smoke made   = q × 0.02 × smoke factor ÷ room size  (+ steam × 0.004)
smoke vented = smoke × own openings × (0.012 + 0.03 × min(1.5, T))   (× 1.8 with a fan running)
```

All of these constants are teaching values.

### 4e. Flashover

A room flashes over when **heat T reaches 1.0 and heat release q is at least 0.75** (attics don't "flash"; they ignite). After that the room burns at whatever the air allows, and flames show at its openings. The trigger level is a teaching threshold. The *timing* it produces is calibrated to FSRI: VVR (section 4b).

### 4f. Heat and smoke moving between rooms; spread

For each connection, every second:

```
smoke moved = (smoke difference) × k × 0.035   capped at 0.05
heat moved  = (heat difference)  × k × 0.018   capped at 0.03
```

- Movement **upward** is ×1.5 and **downward** ×0.45, because hot gas rises.
- Movement toward a room that has exhaust openings is multiplied by (1 + exhaust) for smoke and (1 + 1.6 × exhaust) for heat. Heat and smoke head for the vent, which is the flow-path effect. [FSRI: HV, VVR]
- A running fan multiplies heat movement ×1.6. [Teaching value; behavior FSRI: PPV]
- The receiving room gains 90% of the moved heat (÷ its size); the sending room loses 25%. The gap stands in for hot gas still flowing.

**Spread / extension**: an unburned room ignites when its heat passes **0.82** (the attic at **0.60**) and it isn't wet. It starts partway up its own growth curve (a head start of 0.55 × tg). [Teaching values]

**Exterior extension**: once a flashed room has had flames showing out an opening for **200 s**, the room above is exposed (its heat is set to at least 0.9), or the attic if it is the top floor. On non-wood construction the window above also fails. [Simplification]

**Roof vent / attic**: a vertical vent opens a 1.25 roof opening and **pushes the ceiling below it** (the connection goes from 0.02 to 0.6). This ties the attic into the fire. [FSRI: VVR / VV]

### 4g. Window glass failure

Each closed window keeps a heat counter:

```
glass heat += [ (T − 0.30 if positive) + 1.5 × (T − 0.60 if positive) ]  each second
fails when glass heat > threshold, threshold = 14 to 31.5 (set randomly per window by the scenario seed)
```

With modern contents and the default 3½-minute arrival, the living-room glass fails about **4:50–5:20 after ignition**, and flashover follows about **80–85 s** later. The choice **"Window glass: Holds"** only lets glass fail above heat 0.72. That keeps the closed-house decay FSRI describes.

**This whole rule is a simplification.** FSRI notes the fire *can* fail a window, but the timing here is a teaching value, not an FSRI measurement.

### 4h. What you see: smoke volume, velocity, density, color

These come from the room the smoke is leaving. **The cue mapping is the widely taught "Reading Smoke" approach, not an FSRI measurement. [Simplification]**

| Cue | Driven by | Steps |
|---|---|---|
| **Velocity** (pressure) | `P = T × (0.6 + 0.6 × smoke) × 1.25 if ventilation-limited` | <0.18 Lazy · <0.45 Moderate · <0.8 Pressurized · else Turbulent. A decaying fire is capped at Moderate and shown **pulsing** [FSRI: VVR] |
| **Volume** | `q × smoke factor + 0.6 × smoke` | <0.25 Light · <0.6 Moderate · <1.05 Heavy · else Very heavy |
| **Density** | room smoke `s` | <0.3 Thin · <0.55 Moderate · <0.8 Thick · else Very thick. Ventilation-limited with s > 0.6 → at least Thick; flashed and ventilation-limited → Very thick |
| **Color** | state | Steam > 0.25 → **white**. Cool early fire → white/gray. Attic, or wood structure burning 7+ min after flashover → **brown**. Ventilation-limited or hot (T > 0.7) → **black** (modern) / gray-black (legacy). Otherwise **gray** |

**How much smoke leaves each opening:**
- Open: `smoke × (0.4 + T)`, ×0.35 if the door is controlled, ×1.6 for a roof vent, and ×1.7 at the other openings when a fan is running.
- Closed (leaking around the frame): `(smoke − 0.3) × (0.3 × T + 0.25 × building pressure)`. The volume and velocity you can see from a gap are capped (Moderate, or Heavy if it's pushing hard).
- **Building pressure** = `1.7 × q × T` of the hottest fire ÷ (1 + 2.5 × total open-opening area), capped at 1. A growing fire in a closed-up house pushes smoke around windows, doors and at the eaves; opening the house relieves it. [Simplification]

**Neutral plane**: an open window exhausts from its top ~65%, a door from its top ~50%. Below that, air flows in. This affects how it is drawn. [Behavior FSRI: VV/VVR; fractions are teaching values]

**Flow path shown on the board**:
- An open opening with smoke outflow above 0.05 is an **exhaust**. A door or garage is listed as exhaust at the top *and* intake at the bottom.
- Open openings with little outflow are **intakes**.
- A roof vent is always exhaust; a fan door is always intake.

**Fire showing**: flames show at an opening of a flashed room when `q > 0.7` (size `0.6 × q`), or at a window of an unflashed room when `q > 0.6`. Water cuts visible flame to 25%.

**Stage label** (fire room): Incipient (q < 0.12) → Growth → Growth (ventilation-limited) → Decay (starved for air) → Fully developed → Decay (fuel consumed / water applied) → Knocked down.

## 5. What your orders do to the numbers

Task times are **teaching values**, not SOP or FSRI numbers:

| Task | Time | Effect |
|---|---|---|
| Interior line | 45 s stretch + 30 s per floor above the 1st + 15 s | When the crew enters (at 45 s) it **opens the entry door** (or *controls* it if door control is on). Water starts at the ready time |
| Exterior line | 45 s | Breaks/opens that opening; water only into that room |
| Water supply | 240 s | Until then lines run off a **500-gal tank at 150 gpm** (≈3.3 min of flow) and stop when it's empty |
| Horizontal vent | 15 s | Opening becomes open/failed |
| Vertical vent | 300 s | Roof hole + ceiling pushed below it |
| PPV/PPA fan | entry door opens now; fan on after 60 s | See below |
| Primary search | 60 s + 30 s per floor above 1st + 120 s | Opens the entry door |

**Water** (rooms that receive it):
- An interior line gives its room **1.0**, and **0.45** to rooms joined by an open plan, open stair or open door.
- An exterior stream gives **0.85** to that room only.
- Each second under water:
  - wet rises by water ÷ 25
  - heat drops by 3.5% × water
  - heat release drops 6% × water and its target collapses with a 4 s lag
  - steam builds, so the smoke turns white
- Knockdown happens when **wet > 0.85 and q < 0.03**. Lines shut down 20 s after knockdown.
- Wet dries off slowly (over 900 s). For an **upper-floor room hit only from outside**, it dries in **70 s**, so the room can **regrow** unless an interior line follows. [FSRI: CFA]
- Water from any direction cools the fire room and the rooms around it. [FSRI: VVR, the 40% / 22% finding; this behavior is qualitative and the code is not tuned to those exact percentages]
- Water does not push fire; only flow paths move it. [FSRI: VVR]

**Ventilation**:
- Horizontal and vertical vents simply add openings, raising air (the cap) and exhaust. If water isn't yet winning, the fire grows. [FSRI: VVR, VV]
- **Door control** changes the entry door's air from 1.0 to 0.15 and its outflow ×0.35. [FSRI: VVR, CFA]
- **PPV**:
  - adds +1.6 air into the entry room
  - multiplies heat movement ×1.6 and smoke venting ×1.8
  - multiplies outflow ×1.7 at every other opening, so a fan helps only when there is an exhaust in the fire room [FSRI: PPV, "Positive Pressure Attack is exhaust dependent"]
- **Defensive strategy** withdraws interior lines and stops searches.

## 6. Occupant and crew-safety calculations

**Occupant** (hidden; placed by you or at random in an upper-floor bedroom):
```
dose += 0.012 × (T − 0.25 if positive) + 0.009 × (smoke − 0.40 if positive)   each second
untenable when dose ≥ 1
```
This is a simplified stand-in for heat and toxic-gas exposure (FED-style), not a real tenability calculation. A closed door keeps the room's heat and smoke low, which matches FSRI's finding. [FSRI: VVR, CBYD; constants are teaching values]

**Search**:
- When a floor search finishes, the occupant is found if they are on that floor. The outcome is *rescued* if their dose never reached 1, otherwise *found after conditions were untenable*.
- **The search is aborted with a crew warning** if any room on that floor reaches heat **> 0.75**. A room behind a closed door counts at only 20% of its heat.

**Attack crew warning**: once a line crew has entered, the warning fires if the heat at the entry (front-door room), or in the fire room before their water is flowing, exceeds **0.85**. The message is: "Attack crew is between the fire and the exhaust." [Behavior FSRI: VV/VVR flow-path hazard; threshold is a teaching value]

## 7. Honest limits

- **Not physics.** There are no real temperatures, gas concentrations, pressures or mass flows. Indices stand in for them so the *sequence and timing* resemble FSRI results.
- **Few calibration points.** Only the modern/legacy timings in section 4b are set to FSRI numbers; most other constants are teaching values.
- **Coarse building.** One heat value and one smoke value per room: no hot layer vs cool floor inside a room, and no separate doorways. Rooms in an uploaded photo are a generic left room / right room / hall per floor.
- **Random within the seed.** Window failure timing, occupant placement and similar draws come from the scenario seed. The same seed gives the same drill; a different seed gives slightly different timing.
- **Generic tactics.** Task times and drill timings are not your department's SOPs.
