// Regression: with Command fundamentals OFF, the model must behave exactly as the Phase 1 build (GitHub commit 924830e; put its src/model.js in tests/base/).
global.window={};const B=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');
delete require.cache[require.resolve('/workspace/sizeup/src/model.js')];const M0=require('./base/model.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m);}};
function scn(b,o){return{format:'sizeup-scenario',v:2,sceneId:b.id,origin:o.origin,fuel:o.fuel||'modern',preburn:o.preburn||360,openings:{},doors:{},occupant:o.occ||'random',wind:o.wind||{dir:'calm',spd:0},glass:'fails',seed:o.seed,actions:[],tNow:0,
  companies:M0.PRESETS.generic.companies(),presetName:'generic',env:o.env,windShift:o.ws||null,...(o.command?{command:o.command}:{})};}
function run(MM,b,o,acts,T){const S=MM.create(b,JSON.parse(JSON.stringify(scn(b,o))));MM.run(S,S.scn.preburn);for(const a of acts)MM.act(S,{...a,t:S.scn.preburn+a.t});MM.run(S,S.scn.preburn+T);
  return JSON.stringify({ev:S.events.map(e=>[e.t,e.kind,e.msg]),z:Object.values(S.z).map(z=>[z.q,z.T,z.s,z.ign,z.out,z.flashed].map(x=>typeof x==='number'?+x.toFixed(6):x)),w:S.water.lines.map(l=>[l.id,l.flowing,l.zone]),v:S.victim,uc:S.underControl,sum:MM.summary?JSON.stringify(MM.summary(S)):''});}
const houses=Object.values(B);let n=0;
const ACTS=[[],[{t:20,kind:'assign',co:'E1',task:'line',target:null}],[{t:10,kind:'assign',co:'L1',task:'search1',floor:'2'},{t:15,kind:'doorcontrol',on:true},{t:40,kind:'assign',co:'E2',task:'supply',to:'E1',mode:'forward'}],
  [{t:5,kind:'strategy',v:'Offensive'},{t:30,kind:'assign',co:'L1',task:'hvent',opening:null},{t:60,kind:'view',side:'C'},{t:90,kind:'assign',co:'E1',task:'line',target:null}],
  [{t:0,kind:'strategy',v:'Defensive'},{t:100,kind:'assign',co:'E1',task:'line',target:null,ext:true},{t:200,kind:'assign',co:'L1',task:'ladder',side:'A'}]];
for(const b of houses){const zs=b.zones.filter(z=>!z.attic&&!/hall|stair|garage/.test(z.id)).map(z=>z.id);
  for(const [i,origin] of zs.entries())for(let k=0;k<ACTS.length;k++){const seed=1000+i*31+k*7;
    const t1=b.openings.find(o=>o.zone===origin)||b.openings[0];const acts=ACTS[k].map(a=>({...a,target:a.task==='line'?origin:a.target,opening:a.task==='hvent'?t1.id:a.opening}));
    const o={origin,seed,preburn:[240,360,480][k%3],wind:k===3?{dir:'A',spd:20}:undefined,env:k===4?{tod:'night',precip:'snow',temp:20,wind:{dir:'B',spd:10}}:undefined,ws:k===2?{at:120,dir:'C',spd:15}:null};
    const a=run(M0,b,o,acts,900),bb=run(M,b,o,acts,900);ok(a===bb,`${b.id}/${origin}/acts${k}`);n++;
    // a scenario carrying a command block that is switched off is also identical
    const c=run(M,b,{...o,command:{on:false,sub:{},set:{},terms:{}}},acts,900);ok(a===c,`${b.id}/${origin}/acts${k} command off`);}}
console.log(`equiv: ${n} scenarios x2, ${pass} pass, ${fail} fail`);process.exit(fail?1:0);
