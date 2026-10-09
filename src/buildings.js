/* Building definitions for the bundled sample photos. Coordinates are in image pixels of the bundled JPEG. */
const BUILDINGS=(()=>{
// House: AI-generated photoreal mock from AJ's design set, cleaned. Native 1285x546.
const house={id:'house',name:'2-story house',W:1285,H:546,stories:2,atticName:'Attic',construction:'wood',
 floors:[{f:'Roof',y0:0,y1:75},{f:'Attic',y0:75,y1:148},{f:'2',y0:148,y1:262},{f:'1',y0:262,y1:456},{f:'B',y0:456,y1:546}],
 bldg:{x0:232,x1:1129},eaves:[{x0:262,x1:1000,y:146,zone:'attic'}],ridge:{x0:350,x1:830,y:76},
 zones:[
  {id:'liv',name:'Living room',floor:'1',x0:280,x1:500,vol:1.2},
  {id:'kit',name:'Kitchen / family room (rear)',floor:'1',x0:480,x1:720,vol:1.4,hidden:true},
  {id:'foy',name:'Foyer & open stair',floor:'1',x0:500,x1:615,vol:1.0},
  {id:'gar',name:'Attached garage',floor:'1',x0:720,x1:1060,vol:1.6},
  {id:'hall2',name:'Floor 2 hallway',floor:'2',x0:520,x1:640,vol:.6,hidden:true},
  {id:'br1',name:'Bedroom 1 (A/D corner)',floor:'2',x0:290,x1:400,vol:.8},
  {id:'br2',name:'Bedroom 2 (front center)',floor:'2',x0:400,x1:610,vol:.9},
  {id:'br3',name:'Primary bedroom (A/B corner)',floor:'2',x0:640,x1:860,vol:1.1},
  {id:'attic',name:'Attic',floor:'Attic',x0:262,x1:1000,vol:1.6,attic:true}],
 openings:[
  {id:'w2a',name:'Floor 2 window (Bedroom 1)',type:'window',side:'A',zone:'br1',x:348,y:191,w:40,h:77},
  {id:'w2b',name:'Floor 2 window (Bedroom 2, left)',type:'window',side:'A',zone:'br2',x:450,y:191,w:40,h:77},
  {id:'w2c',name:'Floor 2 window (Bedroom 2, right)',type:'window',side:'A',zone:'br2',x:562,y:191,w:40,h:77},
  {id:'w2d',name:'Floor 2 double window (Primary)',type:'window',side:'A',zone:'br3',x:729,y:191,w:90,h:77},
  {id:'w1a',cover:280,name:'Floor 1 window (Living, left)',type:'window',side:'A',zone:'liv',x:339,y:336,w:44,h:70},
  {id:'w1b',cover:280,name:'Floor 1 window (Living, right)',type:'window',side:'A',zone:'liv',x:444,y:336,w:44,h:70},
  {id:'fd',cover:280,name:'Front door',type:'door',side:'A',zone:'foy',x:557,y:359,w:50,h:115,front:true},
  {id:'gd',name:'Garage door',type:'garage',side:'A',zone:'gar',x:883,y:393,w:309,h:125},
  {id:'rd',name:'Rear slider (Side C)',type:'door',side:'C',zone:'kit',hidden:true},
  {id:'w2r',name:'Rear bedroom windows (Side C)',type:'window',side:'C',zone:'br3',hidden:true}],
 conns:[
  {id:'liv-foy',a:'liv',b:'foy',type:'open'},{id:'liv-kit',a:'liv',b:'kit',type:'open'},{id:'kit-foy',a:'kit',b:'foy',type:'open'},
  {id:'foy-hall2',a:'foy',b:'hall2',type:'stair'},{id:'gar-kit',a:'gar',b:'kit',type:'door',init:'closed',name:'Garage entry door'},
  {id:'hall2-br1',a:'hall2',b:'br1',type:'door',init:'open',name:'Bedroom 1 door'},
  {id:'hall2-br2',a:'hall2',b:'br2',type:'door',init:'closed',name:'Bedroom 2 door'},
  {id:'hall2-br3',a:'hall2',b:'br3',type:'door',init:'open',name:'Primary bedroom door'},
  {id:'br1-attic',a:'br1',b:'attic',type:'ceiling'},{id:'br2-attic',a:'br2',b:'attic',type:'ceiling'},{id:'br3-attic',a:'br3',b:'attic',type:'ceiling'},
  {id:'hall2-attic',a:'hall2',b:'attic',type:'ceiling'},{id:'gar-attic',a:'gar',b:'attic',type:'ceiling'}],
 roofSpots:{br1:{x:360,y:118},br2:{x:500,y:112},br3:{x:740,y:116},hall2:{x:600,y:110},attic:{x:600,y:110},gar:{x:900,y:300}},
 facts:{occupancy:'Single-family residential',construction:'Wood frame, brick veneer floor 1, asphalt shingle roof',stories:'2',exposures:'B: 2-story house ~20 ft · D: open yard / tree line',life:'Unknown. Car in driveway, early morning'},
 suggested:{origin:'liv',fuel:'modern',preburn:210}};
// Mixed-use: "Odd Fellows Hall, West End" by Cbaile19, CC0, Wikimedia Commons. Bundled at 1440x1077.
const S=1.5;const r=v=>Math.round(v*S);
const f3=[257,377,465,551,676,799],f2=[257,377,466,554,675,801];
const mixed={id:'mixed',name:'3-story mixed-use',W:1440,H:1077,stories:3,atticName:'Cockloft',construction:'ordinary',
 floors:[{f:'Roof',y0:0,y1:r(40)},{f:'Attic',y0:r(40),y1:r(100)},{f:'3',y0:r(100),y1:r(262)},{f:'2',y0:r(262),y1:r(485)},{f:'1',y0:r(485),y1:r(662)},{f:'B',y0:r(662),y1:1077}],
 bldg:{x0:r(180),x1:r(890)},eaves:[{x0:r(185),x1:r(885),y:r(58),zone:'attic'}],ridge:{x0:r(170),x1:r(900),y:r(36)},
 zones:[
  {id:'stL',name:'Store (left)',floor:'1',x0:r(180),x1:r(430),vol:1.8},
  {id:'stair',name:'Enclosed stair (all floors)',floor:'1',x0:r(430),x1:r(505),vol:.7},
  {id:'stR',name:'Store (right)',floor:'1',x0:r(505),x1:r(890),vol:2.0},
  {id:'a2L',name:'Apartment 2A (left)',floor:'2',x0:r(180),x1:r(510),vol:1.3},
  {id:'h2',name:'Floor 2 stair landing',floor:'2',x0:r(505),x1:r(530),vol:.4,hidden:true},
  {id:'a2R',name:'Apartment 2B (right)',floor:'2',x0:r(510),x1:r(890),vol:1.3},
  {id:'a3L',name:'Apartment 3A (left)',floor:'3',x0:r(180),x1:r(510),vol:1.3},
  {id:'h3',name:'Floor 3 stair landing',floor:'3',x0:r(505),x1:r(530),vol:.4,hidden:true},
  {id:'a3R',name:'Apartment 3B (right)',floor:'3',x0:r(510),x1:r(890),vol:1.3},
  {id:'attic',name:'Cockloft',floor:'Attic',x0:r(185),x1:r(885),vol:1.4,attic:true}],
 openings:[
  ...f3.map((x,i)=>({id:'w3'+i,name:`Floor 3 window ${i+1}`,type:'window',side:'A',zone:i<3?'a3L':'a3R',x:r(x),y:r(174),w:r(42),h:r(118)})),
  ...f2.map((x,i)=>({id:'w2'+i,name:`Floor 2 window ${i+1}`,type:'window',side:'A',zone:i<3?'a2L':'a2R',x:r(x),y:r(389),w:r(42),h:r(138)})),
  {id:'s1',name:'Store window 1',type:'window',side:'A',zone:'stL',x:r(265),y:r(590),w:r(56),h:r(100)},
  {id:'s2',name:'Store window 2',type:'window',side:'A',zone:'stL',x:r(361),y:r(590),w:r(57),h:r(100)},
  {id:'fd',name:'Stair door (center)',type:'door',side:'A',zone:'stair',x:r(468),y:r(598),w:r(62),h:r(120),front:true},
  {id:'s3',name:'Store window 3',type:'window',side:'A',zone:'stR',x:r(561),y:r(590),w:r(57),h:r(100)},
  {id:'s4',name:'Store window 4',type:'window',side:'A',zone:'stR',x:r(676),y:r(590),w:r(60),h:r(100)},
  {id:'sd',name:'Store door (right)',type:'door',side:'A',zone:'stR',x:r(805),y:r(593),w:r(68),h:r(106)},
  {id:'rdL',name:'Store rear door (Side C)',type:'door',side:'C',zone:'stL',hidden:true},
  {id:'sc',name:'Roof scuttle over stair',type:'roof',side:'Roof',zone:'h3',hidden:true}],
 conns:[
  {id:'stair-h2',a:'stair',b:'h2',type:'stair'},{id:'h2-h3',a:'h2',b:'h3',type:'stair'},
  {id:'stL-stair',a:'stL',b:'stair',type:'door',init:'closed',name:'Store L door to stair'},
  {id:'stR-stair',a:'stR',b:'stair',type:'door',init:'closed',name:'Store R door to stair'},
  {id:'h2-a2L',a:'h2',b:'a2L',type:'door',init:'closed',name:'Apt 2A door'},{id:'h2-a2R',a:'h2',b:'a2R',type:'door',init:'closed',name:'Apt 2B door'},
  {id:'h3-a3L',a:'h3',b:'a3L',type:'door',init:'closed',name:'Apt 3A door'},{id:'h3-a3R',a:'h3',b:'a3R',type:'door',init:'open',name:'Apt 3B door'},
  {id:'stL-a2L',a:'stL',b:'a2L',type:'ceiling'},{id:'stR-a2R',a:'stR',b:'a2R',type:'ceiling'},
  {id:'a2L-a3L',a:'a2L',b:'a3L',type:'ceiling'},{id:'a2R-a3R',a:'a2R',b:'a3R',type:'ceiling'},
  {id:'a3L-attic',a:'a3L',b:'attic',type:'ceiling'},{id:'a3R-attic',a:'a3R',b:'attic',type:'ceiling'},{id:'h3-attic',a:'h3',b:'attic',type:'ceiling'},
  {id:'stL-stR',a:'stL',b:'stR',type:'wall'}],
 roofSpots:{a3L:{x:r(330),y:r(40)},a3R:{x:r(700),y:r(40)},h3:{x:r(520),y:r(40)},attic:{x:r(520),y:r(40)}},
 facts:{occupancy:'Mixed-use: commercial floor 1, residential 2–3',construction:'Ordinary (brick bearing walls, wood joists)',stories:'3',exposures:'B: 2-story brick, ~10 ft · D: alley, utility pole & overhead lines',life:'Apartments above; store closed. Occupants likely'},
 suggested:{origin:'a2L',fuel:'modern',preburn:720,openings:{w21:'failed'},doors:{'h2-a2L':'open'}}};
return {house,mixed};})();
if(typeof module!=='undefined')module.exports=BUILDINGS;
