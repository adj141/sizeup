// Structural fuel fix (Oct 13 2026, AJ-approved). Contents burnout does not end a fire; timings cited in FIRE-MODEL.md "Structural fuel and collapse".
global.window={};const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');M.UGLASS.on=false;M.VFO.on=false;M.SEEP.on=false;/* Oct 22b: pre-glass/flashover/seepage-reading behaviour (new rules tested in glass-flashover-oct22.js) */
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok:',m);}else{fail++;console.log('  FAIL:',m);}};
const mk=(b,origin,o={})=>M.create(b,{format:'sizeup-scenario',v:2,sceneId:b.id,origin,fuel:o.fuel||'modern',preburn:0,openings:o.openings||{},doors:o.doors||{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:7,companies:M.PRESETS.generic.companies(),presetName:'generic'});
const until=(S,t)=>M.run(S,t-S.t);const burning=S=>Object.entries(S.z).filter(([k,z])=>z.ign&&!z.out&&z.q>.05).map(([k])=>k);
const evT=(S,re)=>{const e=S.events.find(e=>re.test(e.msg));return e?e.t:null;};const mmss=t=>t==null?'-':`${Math.floor(t/60)}:${String(Math.round(t%60)).padStart(2,'0')}`;
const ST=M.STRUCT;
console.log('# cited values (UL-SSEL E119, UL/NIST ARRA full-scale basement tests, RISE/AWC gypsum)');
ok(ST.floor.engineered.warn===0,'engineered floor: warning as soon as the basement fire is severe (no reliable warning signs, FSRI)');
ok(ST.floor.engineered.breach===199&&ST.floor.engineered.collapse===199,'I-joist floor burn-through/collapse after 3:19 of severe exposure (UL/NIST ARRA App. C: 2:00-4:21 after basement flashover)');
ok(ST.floor.engineered.breach>=120&&ST.floor.engineered.breach<=261,'engineered timing inside the cited 2:00-4:21 post-flashover spread');
ok(ST.floor.dimensional.collapse===496,'dimensional: 3:19 + 4:57 (UL full-scale avg difference 11:57-7:00), teaching value');
ok(ST.sevT===.82,'severity threshold = model threshold for igniting exposed fuel (the joists)');
ok(ST.ceilBreach>=360&&ST.ceilBreach<13*60,'gypsum ceiling burn-through 6-13 min after flashover (teaching value below the 13-26 min type X range)');
ok(ST.onset>0&&ST.onset<=120,'structure counted as involved within 2 min of flashover (minutes, not tens of minutes)');
for(const [bid,origin,fuel,op] of [['house','liv','modern'],['house','bsmt','modern',{bw1:'open'}],['mixed','stL','modern'],['mixed','a2L','modern']]){
  const b=BLD[bid];const S=mk(b,origin,{fuel,openings:op});console.log(`# unattended ${bid}/${origin} (${fuel} contents${op?', Side C basement window open before ignition (UL/NIST ARRA openings-open case)':''})`);
  until(S,30*60);const tf=S.z[origin].tFlash,ts=S.z[origin].structural;
  ok(tf!=null&&ts!=null&&ts-tf>=0&&ts-tf<=120,`structure involved ${mmss(ts)}, ${ts-tf} s after flashover at ${mmss(tf)} (cited: flashover involves all exposed fuel; onset ${ST.onset} s)`);
  ok(ts<20*60,`structural involvement well before the 30 min checkpoint (${mmss(ts)})`);
  const b15=(until(S,15*60),0);const S2=mk(b,origin,{fuel,openings:op});until(S2,15*60);const n15=burning(S2).length;
  const n30=burning(S).length;const r30=burning(S).includes(origin)||S.z[origin].ign&&!S.z[origin].out;
  ok(r30&&n30>1,`still burning at 30 min (${n30} spaces burning, origin ${S.z[origin].out?'out':'burning'})`);
  until(S,60*60);const n60=burning(S).length;
  ok(n60>=2&&n60>=n15&&!S.z[origin].out,`still burning and spread at 60 min (${n15} spaces at 15 min -> ${n30} at 30 -> ${n60} at 60)`);
  const at=b.zones.find(z=>z.attic).id;ok(S.z[at].ign,`fire has reached the ${b.zones.find(z=>z.attic).name.toLowerCase()} by 60 min`);
  ok(!S.events.some(e=>/burned itself out/.test(e.msg)),'no "burned itself out" outcome');}
console.log('# basement floor over a basement fire (Side C basement window open before ignition; with everything closed the fire stays ventilation-limited, FSRI-BSMT)');
{const S=mk(BLD.house,'bsmt',{openings:{bw1:'open'}});let tSev=null;for(let t=0;t<15*60;t++){if(tSev==null&&S.z.bsmt.T>=ST.sevT)tSev=S.t;M.step(S);}
 const tf=S.z.bsmt.tFlash,w=evT(S,/^Collapse warning/),bt=evT(S,/^Floor burn-through/);
 ok(w!=null&&Math.abs(w-tSev)<=2,`house (engineered, assumed): collapse warning ${mmss(w)} when the basement became severe (${mmss(tSev)}), not at a fixed time from ignition`);
 ok(bt!=null&&bt-tf>=120&&bt-tf<=261,`burn-through ${mmss(bt)}, ${mmss(bt-tf)} after basement flashover ${mmss(tf)} (cited 2:00-4:21)`);
 ok(evT(S,/^Floor collapse likely/)===bt,'collapse likely with the burn-through (E119: flame passage 6:00, collapse 6:03)');
 ok(S.B.conns.filter(c=>c.type==='floor').every(c=>S.c[c.id].state==='breached'),'floor connections breached');}
{const b={...BLD.house,floorSystem:'dimensional'};const S=mk(b,'bsmt',{openings:{bw1:'open'}});until(S,20*60);const w=evT(S,/^Collapse warning/),c=evT(S,/^Floor collapse likely/);
 ok(w!=null&&c!=null&&c-S.z.bsmt.tFlash>=495&&c-S.z.bsmt.tFlash<=520,`dimensional lumber: warning ${mmss(w)}, collapse likely ${mmss(c)} (8:16 of severe exposure, teaching value)`);}
{const S=mk(BLD.house,'bsmt',{doors:{'kit-bsmt':'open'}});until(S,15*60);
 ok(!S.events.some(e=>/^Floor burn-through/.test(e.msg))||S.z.bsmt.flashed,'stair door open: basement fire stays ventilation-limited and never severe, so the floor clock does not run (limit: see FIRE-MODEL.md)');}
console.log('# ceiling burn-through into the attic');
{const S=mk(BLD.house,'liv');until(S,40*60);const r=Object.keys(S.z).find(k=>S.z[k].ceilGone);const tb=r&&S.z[r].ceilGone,tf=r&&S.z[r].tFlash;
 ok(tb!=null&&tb-tf>=ST.ceilBreach&&tb-tf<ST.ceilBreach+30,`${r} ceiling breached ${mmss(tb-tf)} after flashover; event logged`);ok(S.events.some(e=>/^Ceiling breach/.test(e.msg)),'ceiling collapse hazard event');}
console.log('# closed-up rooms that never flash stay vent-limited (still burning, not spread): no forced spread');
for(const [origin,fuel] of [['br1','modern'],['kit','modern'],['liv','legacy']]){const S=mk(BLD.house,origin,{fuel});until(S,30*60);const a=!S.z[origin].out;until(S,60*60);
 ok(a&&!S.z[origin].out,`house/${origin} (${fuel}): ${S.z[origin].flashed?'flashed':'has not flashed'}, still burning at 30 and 60 min`);ok(!S.events.some(e=>/burned itself out/.test(e.msg)),`house/${origin}: no "burned itself out"`);}
console.log('# suppression still ends it');
{const S=mk(BLD.house,'liv');until(S,6*60);M.act(S,{t:S.t,kind:'assign',co:'E1',task:'line',target:'liv'});until(S,20*60);
 ok(S.z.liv.out||S.z.liv.q<.05,`living room knocked down by the first line (q ${S.z.liv.q.toFixed(3)})`);}
console.log('# long decay only after total involvement');
{const S=mk(BLD.house,'liv');until(S,4*3600);const z=S.z.liv;const e=S.events.find(e=>/has decayed after burning through/.test(e.msg)&&e.zone==='liv');
 const et=e?e.t:null;ok(et==null||et-z.tFlash>=60*60,`living room: ${et==null?'still burning at 4 h':'decays '+mmss(et-z.tFlash)+' after flashover'} (at least an hour)`);}
console.log(`\nstructure suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);
