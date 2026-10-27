// Oct 26 (AJ): "At 3.5 mins after ignition, the smoke is coming from the eaves and when I take the window out there is a large volume of
// black smoke" (fire in Bedroom 4, 2nd floor, B/C corner, door closed). The old 'pressure push' sent smoke from a smoke-filled top-floor room
// straight out of the eaves (heavier than the room's own window gaps) while the answer key ignored it. EATTIC: eaves follow the attic.
// Eave smoke now comes only from the attic's own smoke (> 0.15). Research: FSRI/NIJ Fire Damage Patterns 2019 (ranch bedroom fires show smoke
// at the window and door gaps; no eave smoke described) [FSRI-FDP]; FSRI attic study for eave behavior [FSRI-ATTIC]. EATTIC.on=false = old push.
const {chromium}=require('playwright-core');global.window={};
const BLD=require('/workspace/sizeup-live/src/buildings.js');const M=require('/workspace/sizeup-live/src/model.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('# '+n);
const mm=t=>t==null?'never':`${Math.floor(t/60)}:${String(Math.round(t%60)).padStart(2,'0')}`;
const base={sceneId:'house',origin:'br4',fuel:'modern',preburn:210,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:10,actions:[],tNow:0,companies:M.PRESETS.generic.companies()};
const mk=(b,o)=>M.create(b,JSON.parse(JSON.stringify({...base,...o,sceneId:b.id})));
const sides=['A','B','C','D'];
const eaveMax=S=>{let r=0,src='';for(const sd of sides){const e=M.eavesVis(S,sd);if(e&&e.rate>r){r=e.rate;src=(e.segs.find(g=>g.rate===e.rate)||{}).src||'';}}return{r,src};};
const pushSegs=S=>{let n=0;for(const sd of sides){const e=M.eavesVis(S,sd);if(e)n+=e.segs.filter(g=>g.src==='push').length;}return n;};
// run a drill; vent = fail the origin room's window at 3:30 (arrival) + 2 s; returns first eave time (rate>.02 = what the key reads), attic>.15 time
function run(b,o,T,{vent=false,on=true}={}){M.EATTIC.on=on;const S=mk(b,o);const arr=o.preburn==null?210:o.preburn;const r={first:null,src:null,atticT:null,pushSeen:0,preEave:0,preKeyEave:0,S};
 for(let t=1;t<=T;t++){if(vent&&t===arr+2){const w=b.openings.filter(x=>x.zone===S.scn.origin&&x.type==='window')[0];if(w)M.act(S,{kind:'fail',opening:w.id});}M.step(S);
  const e=eaveMax(S);if(r.first==null&&e.r>.02){r.first=t;r.src=e.src;}if(r.atticT==null&&S.z.attic&&S.z.attic.s>.15)r.atticT=t;
  r.pushSeen+=pushSegs(S);
  if(r.atticT==null&&e.r>.005)r.preEave++;}
 M.EATTIC.on=true;return r;}
(async()=>{
sec('model: switch and the old behavior');
ok(M.EATTIC&&M.EATTIC.on===true,'EATTIC exists and is on by default');
{const o=run(BLD.house,{origin:'br4'},600,{on:false});ok(o.src==='push'&&o.first<=200&&o.first>=150,`EATTIC.on=false: the old push shows eave smoke at ${mm(o.first)} (src ${o.src}), the Oct 26 report`);
 ok(o.pushSeen>0,'EATTIC.on=false: push segments exist (old picture restorable)');}

sec("AJ's case: Bedroom 4 fire, door closed, 3:30 arrival, 30 seeds, closed and window out at 3:30");
{const f=[],fv=[];let bad=0,badAt330=0,pushN=0,gapOK=0;
 for(let seed=1;seed<=30;seed++)for(const vent of [false,true]){const r=run(BLD.house,{origin:'br4',seed},900,{vent});
  pushN+=r.pushSeen;if(r.preEave>0)bad++;
  const S=mk(BLD.house,{origin:'br4',seed});for(let t=0;t<210;t++)M.step(S);if(eaveMax(S).r>.005)badAt330++;
  ok(r.first!=null&&r.atticT!=null,`seed ${seed}${vent?' vented':''}: eaves show once the attic fills (${mm(r.first)}, attic > 0.15 at ${mm(r.atticT)})`);
  if(r.first!=null&&r.atticT!=null)ok(r.first>=r.atticT-1&&r.first<=r.atticT+120,`seed ${seed}${vent?' vented':''}: first eave smoke ${mm(r.first)} follows attic smoke > 0.15 at ${mm(r.atticT)} (src ${r.src})`);
  (vent?fv:f).push(r.first);}
 ok(pushN===0,`no 'push' eave segment in any of 60 runs (${pushN})`);
 ok(bad===0,`no eave smoke at all (rate > .005) before the attic passes 0.15, in 60 runs (${bad} bad)`);
 ok(badAt330===0,`no eave smoke at T+3:30 on any side, 30 seeds (${badAt330} bad)`);
 const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;console.log(`  info: Bedroom 4 first eave smoke, mean over 30 seeds: closed ${mm(mean(f))} (min ${mm(Math.min(...f))}, max ${mm(Math.max(...f))}); window out at 3:32 ${mm(mean(fv))} (min ${mm(Math.min(...fv))}, max ${mm(Math.max(...fv))})`);}

sec('seed 10 timeline (the screenshots): no eave reading at 3:30, 3:32 vented, 4:30');
{for(const vent of [false,true]){M.EATTIC.on=true;const S=mk(BLD.house,{origin:'br4'});const seen={};for(let t=1;t<=300;t++){if(vent&&t===212){M.act(S,{kind:'fail',opening:'w2s'});}M.step(S);if([210,212,270,300].includes(t))seen[t]=eaveMax(S).r;}
  ok(seen[210]===0&&seen[212]===0&&seen[270]===0&&seen[300]===0,`${vent?'window out':'closed'}: eaves 0 at 3:30, 3:32, 4:30, 5:00 (${JSON.stringify(seen)})`);}
 // the room's own gaps / vented window still show the smoke
 const S=mk(BLD.house,{origin:'br4'});for(let t=0;t<210;t++)M.step(S);const g=M.openingVis(S).w2s;ok(g.rate>.05&&g.state==='closed',`closed room still shows smoke at its window gaps at 3:30 (rate ${g.rate.toFixed(2)})`);
 M.act(S,{kind:'fail',opening:'w2s'});for(let i=0;i<2;i++)M.step(S);const gv=M.openingVis(S).w2s;ok(gv.rate>.5,`the failed window still pushes a large volume of smoke at 3:32 (rate ${gv.rate.toFixed(2)}, ${M.VOLN[gv.vol]})`);
 for(let i=0;i<58;i++)M.step(S);const g4=M.openingVis(S).w2s;ok(g4.rate>.8&&g4.col==='black','vented window smoke is still large and black at 4:30 (unchanged)');}

sec('eave smoke appears when attic smoke passes the threshold, with the same rule as before for the attic path');
{for(const vent of [false,true]){const r=run(BLD.house,{origin:'br4'},900,{vent});const S=r.S;
  console.log(`  info: seed 10 Bedroom 4 ${vent?'window out at 3:32':'closed'}: attic smoke > 0.15 at ${mm(r.atticT)}, eaves first read (> .02) at ${mm(r.first)} (src ${r.src})`);
  ok(r.first>=r.atticT&&r.first-r.atticT<=120,`${vent?'vented':'closed'}: first eave ${mm(r.first)} within 2 min after attic > 0.15 (${mm(r.atticT)})`);}
 // the eave formula itself: just above and just below the threshold on a made-up attic state
 const S=mk(BLD.house,{origin:'br4'});for(let t=0;t<300;t++)M.step(S);S.z.attic.s=.14;S.z.attic.T=.2;ok(eaveMax(S).r<.005,'attic smoke 0.14: no eave smoke');S.z.attic.s=.30;ok(eaveMax(S).r>.02,'attic smoke 0.30: eave smoke shows');}

sec('every other top-floor room: no push; eaves only with attic smoke; old build did push');
{for(const [b,id] of [[BLD.house,'br1'],[BLD.house,'br2'],[BLD.house,'br3'],[BLD.house,'br4'],[BLD.house,'hall2'],[BLD.mixed,'a3L'],[BLD.mixed,'a3R'],[BLD.mixed,'h3']])for(const vent of [false,true]){
   const n=run(b,{origin:id},900,{vent}),o=run(b,{origin:id},900,{vent,on:false});
   ok(n.pushSeen===0&&n.preEave===0,`${b.id}/${id}${vent?' vented':''}: no eave smoke before the attic > 0.15 (${mm(n.atticT)}); first eave ${mm(n.first)}`);
   if(o.first!=null&&o.src==='push')ok(n.first==null||n.first>o.first+60,`${b.id}/${id}${vent?' vented':''}: eave smoke moved from ${mm(o.first)} (old push) to ${mm(n.first)} (attic)`);
   console.log(`  info: ${b.id}/${id}${vent?' vented':' closed'}: old ${mm(o.first)} (${o.src||'-'}) -> new ${mm(n.first)} (${n.src||'-'}); attic>0.15 ${mm(n.atticT)}`);}}

sec('first-floor and basement fires: unchanged unless the second floor used to push');
{for(const id of ['liv','kit','foy','gar','bsmt'])for(const vent of [false,true]){const n=run(BLD.house,{origin:id},900,{vent}),o=run(BLD.house,{origin:id},900,{vent,on:false});
   const same=n.first===o.first&&n.src===o.src;
   if(o.src==='push')ok(n.src!=='push'&&(n.first==null||n.first>o.first),`house/${id}${vent?' vented':' closed'}: old push at ${mm(o.first)} now from the attic at ${mm(n.first)}`);
   else ok(same,`house/${id}${vent?' vented':' closed'}: eaves identical to the old build (${mm(n.first)} ${n.src||'-'})`);
   console.log(`  info: house/${id}${vent?' vented':' closed'}: old ${mm(o.first)} (${o.src||'-'}) -> new ${mm(n.first)} (${n.src||'-'})`);}
 // basement chase path (NIOSH-BG) is untouched
 const n=run(BLD.house,{origin:'bsmt'},900),o=run(BLD.house,{origin:'bsmt'},900,{on:false});ok(n.first===o.first&&n.first!=null,`basement fire: eaves via the chase unchanged (${mm(n.first)})`);}

sec('attic-origin fires still show eaves (FSRI attic)');
{for(const b of [BLD.house,BLD.mixed])for(const vent of [false,true]){const n=run(b,{origin:'attic'},900,{vent}),o=run(b,{origin:'attic'},900,{vent,on:false});
   ok(n.first!=null&&n.first===o.first&&n.src===o.src,`${b.id} attic fire${vent?' (vented)':''}: eaves/vents at ${mm(n.first)} ${n.src}, identical to the old build (${mm(o.first)})`);}
 // a room fire that extends into the attic shows the eaves as before once the attic burns
 const S=mk(BLD.house,{origin:'br2'});for(let t=0;t<1500;t++)M.step(S);const e=eaveMax(S);ok(e.r>.1,`room fire at 25 min with the attic involved: heavy eave smoke (${e.r.toFixed(2)})`);}

sec('browser: the answer key and picture agree (no eaves in the key until the attic has smoke)');
{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await br.newPage({viewport:{width:1280,height:700}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file:///workspace/sizeup-live/index.html#noautoplay#nowhatsnew');await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);
 for(const vent of [false,true]){
  const r=await p.evaluate(async vent=>{const z=window.__sizeup,M=z.M;await z.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'br4',fuel:'modern',preburn:210,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:10,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});z.A.playing=false;
   for(const sd of ['B','C','D'])z.A.S.walked[sd]=0;const S=z.A.S;const out={t0:S.t,keys:{},firstKeyEave:null,atticT:null,truth330:null,preKeyEave:0};
   out.truth330=M.cmdTruth(S).problem;out.keys[S.t]=z.smokeText();
   const eaveRe=/eave|cornice/i;
   for(let i=0;i<700;i++){if(vent&&i===1)M.act(S,{kind:'fail',opening:'w2s'});z.advance(1);const k=z.smokeText();
    if([2,60,90].includes(i+1))out.keys[S.t]=k;
    if(S.z.attic.s>.15&&out.atticT==null)out.atticT=S.t;
    if(eaveRe.test(k)){if(out.firstKeyEave==null){out.firstKeyEave=S.t;out.keyAtFirst=k;}if(out.atticT==null)out.preKeyEave++;}}
   return out;},vent);
  console.log(`  info (${vent?'vented':'closed'}): start T=${r.t0}, key mentions eaves first at ${mm(r.firstKeyEave)}; attic > 0.15 at ${mm(r.atticT)}; key then: ${r.keyAtFirst}`);
  for(const t in r.keys)console.log(`    key @${mm(+t)}: ${r.keys[t]}`);
  ok(r.preKeyEave===0,`${vent?'vented':'closed'}: the key never mentions eaves/cornice before attic smoke passes 0.15`);
  ok(r.firstKeyEave!=null&&r.atticT!=null&&r.firstKeyEave>=r.atticT-1,`${vent?'vented':'closed'}: the key mentions eaves only after the attic smoke shows (${mm(r.firstKeyEave)} vs ${mm(r.atticT)})`);
  ok(r.truth330==='smoke'||r.truth330==='nothing','radio report truth at 3:30 reads from the room gaps, not eaves ('+r.truth330+')');
  ok(!/eave|cornice/i.test(Object.values(r.keys).join('|')),`${vent?'vented':'closed'}: key at 3:30, 3:32, 4:30 and 5:00 has no eaves`);}
 ok(errs.length===0,'no page errors ('+errs.join('|')+')');await br.close();}
console.log(`eave-attic-oct26 suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})();
