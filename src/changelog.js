/* What's New (Oct 21). One entry per release, newest first. To publish a release, add an entry at the top:
   v = release id (also the version label), date = shown to the user, items = 1-3 short plain-language bullets for firefighters. */
const CHANGELOG=[
 {v:'2026.10.26',date:'Oct 26, 2026',title:'Tap the right room',items:[
   'Tapping a wall on Side B, C or D now picks the room that is really behind it, including rooms with no window on that side (for example Bedroom 4 at the B/C corner), the basement and the garage.']},
 {v:'2026.10.23',date:'Oct 23, 2026',title:'Smoky windows',items:[
   'A window in a smoke-filled room now still looks like a closed window: the glass darkens, but the frame and panes stay visible. Before, it turned solid black and looked like it had already failed.',
   'Glass still falls out only when the room gets close to flashover, on every floor and every side of the house.']},
 {v:'2026.10.22.2',date:'Oct 22, 2026',title:'Windows and flashover',items:[
   'Windows now fall out only when the room is close to flashover, as in the UL FSRI house fire experiments. A closed-up house stays starved for air and the fire dies down until someone opens it up.',
   'Give a starved fire air (a vent, an opened door) and it flashes over about 1½ to 4½ minutes later unless water gets there first. The debrief names the opening.',
   'Smoke seeping around closed windows and doors is now scored as gray and no thicker than Moderate, matching the picture.']},
 {v:'2026.10.22',date:'Oct 22, 2026',title:'Smoke you can read',items:[
   'Smoke seeping around a closed window or door now looks light, the way it did in the UL FSRI house fire experiments. Heavy, pushing smoke means a real opening: a failed window or an open door.',
   'No more smoke cloud floating in the sky away from the house. Smoke from a window around the corner now rises at the corner of the roof.']},
 {v:'2026.10.21',date:'Oct 21, 2026',title:'New look',items:[
   'Cleaner, phone-style screens: fewer words, one main button per screen, tabs during the drill.',
   'Tap a unit to assign it from a pop-up list. Command transfer, scene facts and quick orders open the same way.',
   'Version number and this What’s New list, under About.']},
 {v:'2026.10.19',date:'Oct 19, 2026',title:'Attic fires',items:[
   'Attic fires start where you tap and spread from there, breathing through the soffit and ridge vents.',
   'Flames at the eaves only after the roof burns through. The fire keeps burning the structure and warns of truss roof collapse.',
   'Attic smoke shows as light wisps from the vents, heaviest over the fire. Sharper picture on phones.']},
 {v:'2026.10.14',date:'Oct 14, 2026',title:'Basement timing',items:[
   'Basement windows fail only near basement flashover, so a closed basement fire stays starved for air.',
   'The first-floor collapse clock runs only while the basement fire is severe.']},
 {v:'2026.10.13',date:'Oct 13, 2026',title:'Command and companies',items:[
   'The first-arriving officer is the IC and assigns every company. The chief stays staged until command is transferred by radio.',
   'Force the garage door, give the medic firefighting tasks, and pick tasks from shorter lists. Garage Sides C and D redrawn.',
   'Fires burn into the structure instead of burning out. Ceiling burn-through, basement floor collapse, and smoke fixes for garage and basement fires.']},
 {v:'2026.10.11',date:'Oct 11, 2026',title:'360 and command practice',items:[
   'Walk all four sides (360) and send a follow-up report. Walk-out basements.',
   'Optional command practice: guided radio report, command position, benchmarks, PAR and command transfer.',
   'Basement smoke comes out where it really leaks, not straight up through the roof.']},
 {v:'2026.10.09',date:'Oct 9, 2026',title:'First release',items:[
   'Photograph a building, set the fire, and run a size-up drill.',
   'Companies and dispatch, task times, time of day and weather, with wind-driven fire.',
   'Fire goes out when water reaches it. Smoke at the eaves only from the right floors.']}
];
