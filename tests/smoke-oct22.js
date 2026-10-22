// Oct 22 smoke fix (AJ, live redesign 3b7c3ca): 2-story house, 1st-floor B/C-corner kitchen fire, arrival 3.5 min, default doors/windows.
//  1. Smoke through the gaps of INTACT glass was read and drawn as Heavy / Pressurized black smoke that climbed past the floor above
//     (it looked like heavy smoke from the 2nd-floor windows). FSRI-HV08 9.3 / Fig. 481: smoke visible from the windows of the closed
//     two-story house, fading once the fire is ventilation-limited. Now: gap smoke at most Moderate volume / Moderate velocity, drawn light.
//  2. A detached plume floated in the sky above the garage on Side A: the upper-floor corner plume from a Side D window used the whole
//     footprint (house + 1-storey garage) as its corner. Now it rises at the corner of the upper-floor eave, from window height.
// Every plume, on every side, 0-15 min, must sit on the building's roofline or openings.
const fs=require('fs');global.window={};
const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');
const ld=f=>{delete require.cache[require.resolve(f)];return require(f);};const M0=ld('./base/model.pre-smoke-oct22.js');
const V=new Function(fs.readFileSync('/workspace/sizeup/src/visual.js','utf8')+';return SizeupVisual;')();
const V0=new Function(fs.readFileSync('./base/visual.pre-smoke-oct22.js','utf8')+';return SizeupVisual;')();
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('# '+n);
const base={sceneId:'house',origin:'kit',fuel:'modern',preburn:0,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:10,actions:[],tNow:0,companies:M.PRESETS.generic.companies()};
const mk=(MM,b,o)=>MM.create(b,JSON.parse(JSON.stringify({...base,...o,sceneId:b.id})));
// silhouette test: above the top eave a point must be inside the roof (eave span narrowing to the ridge span), below it inside the footprint
function onBuilding(v,e){const U=v.H/800,m=30*U;const E=v.eaves||[];if(!E.length||!v.ridge)return true;const ey0=Math.min(...E.map(q=>q.y));
  const ue={x0:Math.min(...E.filter(q=>q.y<=ey0+1).map(q=>q.x0)),x1:Math.max(...E.filter(q=>q.y<=ey0+1).map(q=>q.x1))};const bx=v.bldg||ue;
  if(e.y<v.ridge.y-10*U)return false;
  if(e.y<=ey0+m){const k=Math.max(0,Math.min(1,(ey0-e.y)/Math.max(1,ey0-v.ridge.y)));const x0=ue.x0+(v.ridge.x0-ue.x0)*k,x1=ue.x1+(v.ridge.x1-ue.x1)*k;return e.x>=x0-m&&e.x<=x1+m;}
  return e.x>=bx.x0-m&&e.x<=bx.x1+m;}
function sweep(MM,VV,b,o,T,step){const S=mk(MM,b,o);const bad=[];let n=0;for(let t=0;t<=T;t++){if(t%step===0)for(const sd of 'ABCD'){const v=MM.viewOf(b,sd);if(v.has===false)continue;
    for(const e of VV.build(S,b,MM,sd).emitters){if(e.rate<=.001)continue;n++;if(!onBuilding(v,e))bad.push(`${o.origin} ${t}s ${sd} ${e.key}@${Math.round(e.x)},${Math.round(e.y)}`);}}MM.step(S);}return{bad,n};}

sec('old build reproduces the floating plume (AJ, Side A, T+7:02, seed 10, arrival 3:30)');
{const r=sweep(M0,V0,BLD.house,{origin:'kit',seed:10},900,15);ok(r.bad.some(x=>/ A rrighthi@10[6-9]\d/.test(x)),`old: Side A right corner plume over the garage (${r.bad.slice(0,2).join('; ')||'none'})`);}
sec('every plume sits on the roofline or an opening: all origins, all sides, 0-18.5 min from ignition (15 min after a 3:30 arrival), two seeds, both contents');
for(const b of [BLD.house,BLD.mixed]){let bad=[],n=0;for(const z of b.zones)for(const seed of [10,3])for(const fuel of ['modern','legacy']){const r=sweep(M,V,b,{origin:z.id,seed,fuel},1110,15);bad=bad.concat(r.bad);n+=r.n;}
  ok(bad.length===0,`${b.id}: ${n} emitter frames, ${bad.length} off the building ${bad.slice(0,4).join('; ')}`);}
sec('with wind the plume sources stay anchored (drift is in the particles, not the source)');
{let bad=[];for(const dir of ['B','D'])for(const z of ['kit','liv','br4','br1','gar','bsmt']){bad=bad.concat(sweep(M,V,BLD.house,{origin:z,wind:{dir,spd:2}},900,30).bad);}ok(bad.length===0,`windy: ${bad.slice(0,4).join('; ')||'all anchored'}`);}

sec('intact glass: at most light-to-moderate seepage (FSRI-HV08 9.3)');
{let worst={vol:0,vel:0},n=0,leakA=0,leakR=0,oldHeavy=0;for(const z of ['kit','liv','foy','br1','br4','hall2','gar','bsmt'])for(const fuel of ['modern','legacy']){const S=mk(M,BLD.house,{origin:z,fuel,seed:10}),S0=mk(M0,BLD.house,{origin:z,fuel,seed:10});
  for(let t=0;t<=900;t++){if(t%15===0){const ov=M.openingVis(S),ov0=M0.openingVis(S0);for(const k in ov){if(S.o[k].state!=='closed'||ov[k].rate<=.01)continue;n++;worst.vol=Math.max(worst.vol,ov[k].vol);worst.vel=Math.max(worst.vel,ov[k].vel);}
    for(const k in ov0)if(S0.o[k].state==='closed'&&ov0[k].rate>.01&&(ov0[k].vol>1||ov0[k].vel>1))oldHeavy++;
    for(const sd of 'AC')for(const e of V.build(S,BLD.house,M,sd).emitters)if(e.kind==='leak'){leakA=Math.max(leakA,e.alpha);leakR=Math.max(leakR,e.rate/Math.max(.001,ov[e.key].rate)/(e.w>200*BLD.house.H/800?2:1));if(!e.gap)leakA=9;}}
   M.step(S);M0.step(S0);}}
 ok(oldHeavy>0,`old: intact glass read Heavy/Pressurized (${oldHeavy} frames)`);
 ok(worst.vol<=1&&worst.vel<=1,`new: intact-glass smoke at most Moderate volume / Moderate velocity over ${n} frames (worst vol ${worst.vol} vel ${worst.vel})`);
 ok(leakA<=.34+1e-9,`intact-glass emitters are drawn light (alpha ${leakA}) and flagged as gap seepage`);ok(leakR<=45+1e-6,`intact-glass draw rate at most 45x the model rate (was 110x): ${leakR.toFixed(1)}`);}
sec("AJ's timeline (kit, modern, arrival 3:30, seed 10)");
{const S=mk(M,BLD.house,{origin:'kit',seed:10,preburn:210});for(let t=0;t<210+125;t++)M.step(S);let ov=M.openingVis(S);
 ok(['w1k','rd','w1bk'].every(k=>S.o[k].state==='closed'&&ov[k].vol<=1&&ov[k].vel<=1),`T+2:05: kitchen glass intact, gap smoke only (w1k vol ${ov.w1k.vol} vel ${ov.w1k.vel})`);
 ok(Object.keys(ov).filter(k=>/^w2/.test(k)).every(k=>ov[k].rate<=.01),'T+2:05: no smoke from the 2nd-floor windows yet');
 const vC=V.build(S,BLD.house,M,'C');ok(vC.emitters.every(e=>e.kind!=='leak'||e.y>=262),'T+2:05 Side C: the only smoke is gap seepage at the 1st-floor kitchen glass');
 for(let t=0;t<90;t++)M.step(S);ov=M.openingVis(S);ok(S.o.w1k.state==='failed'&&ov.w1k.flame>0,'T+3:35: kitchen window has failed from heat, flames showing');
 ok(Object.keys(ov).filter(k=>/^w2/.test(k)).every(k=>S.o[k].state==='closed'&&ov[k].vol<=1),'T+3:35: 2nd-floor glass intact, light seepage at most');
 for(let t=0;t<65;t++)M.step(S);ov=M.openingVis(S);ok(['w2a','w2b','w2c','w2d'].every(k=>S.o[k].state!=='closed'||ov[k].vol<=1&&ov[k].vel<=1),'T+4:40 Side A: 2nd-floor front windows intact, light seepage');
 ok(BLD.house.conns.find(c=>c.id==='foy-hall2').type==='stair'&&S.c['foy-hall2'].state!=='closed',`default: interior stair open (foy-hall2 ${S.c['foy-hall2'].state})`);}
sec('flag off restores the pre-fix drawing exactly');
{M.GAPS.on=false;let diff=0,n=0;for(const z of ['kit','liv','br3'])  {const S=mk(M,BLD.house,{origin:z}),S0=mk(M0,BLD.house,{origin:z});for(let t=0;t<=900;t++){if(t%60===0)for(const sd of 'ABCD'){n++;if(JSON.stringify(V.build(S,BLD.house,M,sd).emitters)!==JSON.stringify(V0.build(S0,BLD.house,M0,sd).emitters))diff++;}M.step(S);M0.step(S0);}}
 M.GAPS.on=true;ok(diff===0,`GAPS.on=false: emitters identical to the pre-fix build (${n} frames, ${diff} differ)`);}
console.log(`\nsmoke-oct22 suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);
