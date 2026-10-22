// Regression: with Command fundamentals OFF, the model must behave exactly as the Phase 1 build (git 08a5429).
global.window={};const B=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');
delete require.cache[require.resolve('/workspace/sizeup/src/model.js')];const M0=require('./base/model.js');
// Baselines: every scenario is compared with the Phase 1 model (base/model.js), EXCEPT basement-origin fires, which the basement smoke fix
// (Oct 11, 2026) deliberately changed: a slow basement-to-attic chase (NIOSH 2018-154, teaching rate) moves attic smoke values. Those are compared
// with base/model.basementfix.js, a snapshot of the model at that fix, and are also required to DIFFER from Phase 1 (so the change stays deliberate).
const MB=require('./base/model.eavefix-oct13.js'); // Oct 13 eave fix: slower basement-to-attic chase (CHASE_K .0025 -> .0012); was base/model.basementfix.js
// Oct 13 structural-fuel fix (AJ-approved): contents burnout no longer ends a fire; finish/framing burn, ceilings burn through into the attic
// and floors over basement fires warn/burn through/collapse (UL, RISE timings, see FIRE-MODEL.md). Baseline handling:
//  1. with M.STRUCT.on=false the model must still match the old baselines exactly (proves nothing else changed);
//  2. with it on, every scenario matches base/model.structure-oct13.js, AND is identical to the old baseline up to the first structural event,
//     so differences begin only once a room is fully involved (flashover+1 min) or a basement floor has been exposed 3:28+.
const MS=require('./base/model.structure-oct13.js');/* Oct 14: snapshot refreshed for the basement-glass rule (BGLASS); only fires with basement glass involved changed. The structural checks below run with BGLASS off. *//* refreshed for the Oct 13 basement-glass fix (floor clock keyed to basement severity): only basement-origin scenarios changed */const STRUCT_RE=/fully involved|Ceiling breach|Collapse warning|Floor burn-through|Floor collapse|burning on the structure/;
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m);}};
/* Oct 22 smoke fix: gap smoke through intact glass now reads at most Moderate volume/velocity (GAPS). It changes no fire behaviour, only the
   smoke reading of closed openings (which appears in summary()). The baselines are compared with it off; a check at the end proves the fire
   (events, zones, water, victim, control) is identical with it on. */
M.GAPS.on=false;
/* Oct 22b glass/flashover/seepage (AJ): above-grade near-flashover glass (UGLASS), vent-induced flashover (VFO) and the gap-seepage reading
   (SEEP) deliberately change fire behaviour and readings; the baselines here are compared with them off. They are tested in glass-flashover-oct22.js. */
M.UGLASS.on=false;M.VFO.on=false;M.SEEP.on=false;
function scn(b,o){return{format:'sizeup-scenario',v:2,sceneId:b.id,origin:o.origin,fuel:o.fuel||'modern',preburn:o.preburn||360,openings:{},doors:{},occupant:o.occ||'random',wind:o.wind||{dir:'calm',spd:0},glass:'fails',seed:o.seed,actions:[],tNow:0,
  companies:M0.PRESETS.generic.companies(),presetName:'generic',env:o.env,windShift:o.ws||null,...(o.command?{command:o.command}:{})};}
function run(MM,b,o,acts,T){const S=MM.create(b,JSON.parse(JSON.stringify(scn(b,o))));MM.run(S,S.scn.preburn);for(const a of acts)MM.act(S,{...a,t:S.scn.preburn+a.t});MM.run(S,S.scn.preburn+T);
  return JSON.stringify({ev:S.events.map(e=>[e.t,e.kind,e.msg]),z:Object.values(S.z).map(z=>[z.q,z.T,z.s,z.ign,z.out,z.flashed].map(x=>typeof x==='number'?+x.toFixed(6):x)),w:S.water.lines.map(l=>[l.id,l.flowing,l.zone]),v:S.victim,uc:S.underControl,sum:MM.summary?JSON.stringify(MM.summary(S)):''});}
const houses=Object.values(B);let n=0,nb=0,nbt=0,ns=0,ns0=0,preArr=0;
const ACTS=[[],[{t:20,kind:'assign',co:'E1',task:'line',target:null}],[{t:10,kind:'assign',co:'L1',task:'search1',floor:'2'},{t:15,kind:'doorcontrol',on:true},{t:40,kind:'assign',co:'E2',task:'supply',to:'E1',mode:'forward'}],
  [{t:5,kind:'strategy',v:'Offensive'},{t:30,kind:'assign',co:'L1',task:'hvent',opening:null},{t:60,kind:'view',side:'C'},{t:90,kind:'assign',co:'E1',task:'line',target:null}],
  [{t:0,kind:'strategy',v:'Defensive'},{t:100,kind:'assign',co:'E1',task:'line',target:null,ext:true},{t:200,kind:'assign',co:'L1',task:'ladder',side:'A'}]];
for(const b of houses){const zs=b.zones.filter(z=>!z.attic&&!/hall|stair|garage/.test(z.id)).map(z=>z.id);
  for(const [i,origin] of zs.entries())for(let k=0;k<ACTS.length;k++){const seed=1000+i*31+k*7;
    const t1=b.openings.find(o=>o.zone===origin)||b.openings[0];const acts=ACTS[k].map(a=>({...a,target:a.task==='line'?origin:a.target,opening:a.task==='hvent'?t1.id:a.opening}));
    const o={origin,seed,preburn:[240,360,480][k%3],wind:k===3?{dir:'A',spd:20}:undefined,env:k===4?{tod:'night',precip:'snow',temp:20,wind:{dir:'B',spd:10}}:undefined,ws:k===2?{at:120,dir:'C',spd:15}:null};
    const bz=b.zones.find(z=>z.id===origin).floor==='B';M.STRUCT.on=false;M.BGLASS.on=false;const a=run(bz?MB:M0,b,o,acts,900),bb=run(M,b,o,acts,900);ok(a===bb,`${b.id}/${origin}/acts${k}${bz?' (basement-fix baseline)':''}`);n++;
    if(bz)nb+=run(M0,b,o,acts,900)!==bb?1:0,nbt++;
    // a scenario carrying a command block that is switched off is also identical
    const c=run(M,b,{...o,command:{on:false,sub:{},set:{},terms:{}}},acts,900);ok(a===c,`${b.id}/${origin}/acts${k} command off`);
    M.STRUCT.on=true;M.BGLASS.on=true;const nw=run(M,b,o,acts,900);ok(nw===run(MS,b,o,acts,900),`${b.id}/${origin}/acts${k} structural baseline`);
    ok(nw===run(M,b,{...o,command:{on:false,sub:{},set:{},terms:{}}},acts,900),`${b.id}/${origin}/acts${k} structural, command off`);
    M.BGLASS.on=false;const nwG=run(M,b,o,acts,900);M.BGLASS.on=true;const se=JSON.parse(nwG).ev.find(e=>STRUCT_RE.test(e[2]));if(!se){ok(nwG===a,`${b.id}/${origin}/acts${k} no structural event -> unchanged`);ns0++;}
    else{const T=Math.floor(se[0]-2*o.preburn)-1;/* run() is relative: preburn, then preburn+T more seconds */ns++;if(T>0){M.BGLASS.on=false;const x=JSON.parse(run(bz?MB:M0,b,o,acts,T)),y=JSON.parse(run(M,b,o,acts,T));M.BGLASS.on=true;delete x.ev;delete y.ev;
      const evOld=JSON.parse(a).ev.filter(e=>e[0]<se[0]),evNew=JSON.parse(nwG).ev.filter(e=>e[0]<se[0]);
      ok(JSON.stringify(x)===JSON.stringify(y)&&JSON.stringify(evOld)===JSON.stringify(evNew),`${b.id}/${origin}/acts${k} identical before first structural event (${se[0]}s)`);}
      else{preArr++;ok(JSON.stringify(JSON.parse(a).ev.filter(e=>e[0]<se[0]))===JSON.stringify(JSON.parse(nwG).ev.filter(e=>e[0]<se[0])),`${b.id}/${origin}/acts${k} events identical before first structural event`);}}}}
{let same=0,tot=0,rd=0;for(const b of houses)for(const z of b.zones.filter(z=>!z.attic).slice(0,6))for(let k=0;k<ACTS.length;k+=2){const o={origin:z.id,seed:2000+k,preburn:[240,360,480][k%3]};
  const t1=b.openings.find(q=>q.zone===z.id)||b.openings[0];const acts=ACTS[k].map(a=>({...a,target:a.task==='line'?z.id:a.target,opening:a.task==='hvent'?t1.id:a.opening}));
  M.GAPS.on=false;const off=JSON.parse(run(M,b,o,acts,900));M.GAPS.on=true;const on=JSON.parse(run(M,b,o,acts,900));M.GAPS.on=false;tot++;
  if(JSON.stringify([off.ev,off.z,off.w,off.v,off.uc])===JSON.stringify([on.ev,on.z,on.w,on.v,on.uc]))same++;if(off.sum!==on.sum)rd++;}
 ok(same===tot,`Oct 22 gap-smoke cap changes no fire behaviour: ${same}/${tot} scenarios identical in events, zones, water, victim and control (${rd} differ only in the smoke reading)`);M.GAPS.on=true;}
ok(nbt>0&&nb>0,`basement-origin scenarios changed vs Phase 1 as intended (${nb}/${nbt})`);console.log(`structural: ${ns} scenarios reach a structural event within 15 min after arrival (${preArr} of them in the first preburn window after arrival, where only the pre-event event log is compared), ${ns0} unchanged`);console.log(`equiv: ${n} scenarios x2, ${pass} pass, ${fail} fail`);process.exit(fail?1:0);
