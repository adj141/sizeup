// Structural fuel fix (Oct 13 2026, AJ-approved). Contents burnout does not end a fire; timings cited in FIRE-MODEL.md "Structural fuel and collapse".
global.window={};const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok:',m);}else{fail++;console.log('  FAIL:',m);}};
const mk=(b,origin,o={})=>M.create(b,{format:'sizeup-scenario',v:2,sceneId:b.id,origin,fuel:o.fuel||'modern',preburn:0,openings:{},doors:o.doors||{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:7,companies:M.PRESETS.generic.companies(),presetName:'generic'});
const until=(S,t)=>M.run(S,t-S.t);const burning=S=>Object.entries(S.z).filter(([k,z])=>z.ign&&!z.out&&z.q>.05).map(([k])=>k);
const evT=(S,re)=>{const e=S.events.find(e=>re.test(e.msg));return e?e.t:null;};const mmss=t=>t==null?'-':`${Math.floor(t/60)}:${String(Math.round(t%60)).padStart(2,'0')}`;
const ST=M.STRUCT;
console.log('# cited values (UL-SSEL E119, UL/NIST ARRA full-scale basement tests, RISE/AWC gypsum)');
ok(ST.floor.engineered.warn===208,'engineered floor collapse warning at 3:28 = earliest collapse in UL full-scale basement tests (3:28-12:45)');
ok(ST.floor.engineered.breach===360,'I-joist floor burn-through at 6:00 = E119 unprotected I-joist flame passage');
ok(ST.floor.engineered.collapse===420,'engineered floor collapse likely at 7:00 = UL full-scale engineered average');
ok(ST.floor.dimensional.collapse===717,'dimensional floor collapse likely at 11:57 = UL full-scale dimensional average');
for(const f of ['engineered','dimensional'])ok(ST.floor[f].warn>=208&&ST.floor[f].collapse<=765&&ST.floor[f].warn<ST.floor[f].collapse,`${f}: warning and collapse inside the 3:28-12:45 full-scale range`);
ok(ST.ceilBreach>=360&&ST.ceilBreach<13*60,'gypsum ceiling burn-through 6-13 min after flashover (teaching value below the 13-26 min type X range)');
ok(ST.onset>0&&ST.onset<=120,'structure counted as involved within 2 min of flashover (minutes, not tens of minutes)');
for(const [bid,origin,fuel] of [['house','liv','modern'],['house','bsmt','modern'],['mixed','stL','modern'],['mixed','a2L','modern']]){
  const b=BLD[bid];const S=mk(b,origin,{fuel});console.log(`# unattended ${bid}/${origin} (${fuel} contents)`);
  until(S,30*60);const tf=S.z[origin].tFlash,ts=S.z[origin].structural;
  ok(tf!=null&&ts!=null&&ts-tf>=0&&ts-tf<=120,`structure involved ${mmss(ts)}, ${ts-tf} s after flashover at ${mmss(tf)} (cited: flashover involves all exposed fuel; onset ${ST.onset} s)`);
  ok(ts<20*60,`structural involvement well before the 30 min checkpoint (${mmss(ts)})`);
  const b15=(until(S,15*60),0);const S2=mk(b,origin,{fuel});until(S2,15*60);const n15=burning(S2).length;
  const n30=burning(S).length;const r30=burning(S).includes(origin)||S.z[origin].ign&&!S.z[origin].out;
  ok(r30&&n30>1,`still burning at 30 min (${n30} spaces burning, origin ${S.z[origin].out?'out':'burning'})`);
  until(S,60*60);const n60=burning(S).length;
  ok(n60>=2&&n60>=n15&&!S.z[origin].out,`still burning and spread at 60 min (${n15} spaces at 15 min -> ${n30} at 30 -> ${n60} at 60)`);
  const at=b.zones.find(z=>z.attic).id;ok(S.z[at].ign,`fire has reached the ${b.zones.find(z=>z.attic).name.toLowerCase()} by 60 min`);
  ok(!S.events.some(e=>/burned itself out/.test(e.msg)),'no "burned itself out" outcome');}
console.log('# basement floor over a basement fire');
{const S=mk(BLD.house,'bsmt');until(S,15*60);const t0=0;
 ok(evT(S,/^Collapse warning/)===208,`house (engineered, assumed): collapse warning ${mmss(evT(S,/^Collapse warning/))}`);
 ok(evT(S,/^Floor burn-through/)===360,`burn-through ${mmss(evT(S,/^Floor burn-through/))}`);ok(evT(S,/^Floor collapse likely/)===420,`collapse likely ${mmss(evT(S,/^Floor collapse likely/))}`);
 ok(S.B.conns.filter(c=>c.type==='floor').every(c=>S.c[c.id].state==='breached'),'floor connections breached');}
{const b={...BLD.house,floorSystem:'dimensional'};const S=mk(b,'bsmt');until(S,15*60);
 ok(evT(S,/^Collapse warning/)===540&&evT(S,/^Floor collapse likely/)===717,`dimensional lumber: warning ${mmss(evT(S,/^Collapse warning/))} (teaching value), collapse likely ${mmss(evT(S,/^Floor collapse likely/))}`);}
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
