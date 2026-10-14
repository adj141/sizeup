// Basement smoke fix (Oct 11, 2026): regression tests. Run: node basement.js
const fs=require('fs'),cp=require('child_process');global.window={};
const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');M.STRUCT.on=false; // basement smoke-fix regression: structural fuel (Oct 13) off; covered by tests/structure.js
const ld=f=>{delete require.cache[require.resolve(f)];return require(f);};const M0=ld('./base/model.pre-basementfix.js');
const V=new Function(fs.readFileSync('/workspace/sizeup/src/visual.js','utf8')+';return SizeupVisual;')();
const V0=new Function(fs.readFileSync('./base/visual.pre-basementfix.js','utf8')+';return SizeupVisual;')();
let PIX=null,pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('# '+n);
const scn=(b,origin,o={})=>({sceneId:b.id,origin,fuel:'modern',preburn:0,openings:{},doors:o.doors||{},occupant:'none',wind:o.wind||{dir:'calm',spd:0},glass:'fails',seed:o.seed||12345,actions:[],tNow:0,companies:M.PRESETS.generic.companies()});
const run=(MM,b,origin,o,T,cb)=>{const S=MM.create(b,scn(b,origin,o));for(let t=0;t<=T;t++){cb&&cb(S,t);MM.step(S);}return S;};
const sig=e=>JSON.stringify([e.key,e.kind,+e.x.toFixed(2),+e.y.toFixed(2),+e.rate.toFixed(5),e.den,e.rgb&&e.rgb.map(c=>+c.toFixed(2)),e.alpha,e.pulse]);

sec('other fires (until/unless the fire reaches the basement): gap-leak and eave cues unchanged (living room, kitchen, bedrooms, attic; house and mixed-use)');
{let n=0,bad=0;const cases=[['house',['liv','kit','foy','br1','br2','br3','br4','hall2','attic']],['mixed',BLD.mixed.zones.filter(z=>!/st|hall/.test(z.id)).map(z=>z.id)]];
 for(const [bid,origins] of cases){const b=BLD[bid];for(const origin of origins)for(const doors of [{},{'kit-bsmt':'open'}]){
  const a=[],c=[];const S0=M0.create(b,scn(b,origin,{doors})),S1=M.create(b,scn(b,origin,{doors}));
  for(let t=0;t<=600;t++){if(S0.z.bsmt&&S0.z.bsmt.ign){console.log(`   (${bid}/${origin} ${JSON.stringify(doors)}: fire reached the basement at ${t}s; compared up to then)`);break;}if(t%30===0)for(const side of ['A','B','C','D']){const k=x=>x.emitters.filter(e=>e.kind!=='rear').map(sig).join('|');const x0=V0.build(S0,b,M0,side),x1=V.build(S1,b,M,side);a.push(k(x0)+JSON.stringify(x0.flames));c.push(k(x1)+JSON.stringify(x1.flames));}M0.step(S0);M.step(S1);}
  n++;if(a.join('#')!==c.join('#')){bad++;console.log('   differs:',bid,origin,JSON.stringify(doors));}
  const SK=z=>JSON.stringify(z,(k,v)=>["sf","structural","t0","onStruct","ceilGone","floorWarn","floorGone","floorCollapse"].includes(k)?undefined:v);ok(SK(S0.z)===SK(S1.z),`model values identical: ${bid}/${origin}`);}}
 ok(bad===0,`leak/open/eave/roof emitters and flames identical in ${n} non-basement cases (${bad} differ)`);}

sec('basement fire: no early roof/attic smoke; first-floor gaps with the stair door open; Side C at grade');
const B=BLD.house;const eY=B.eaves[0].y;const res={};
for(const stair of ['closed','open']){const log=[];run(M,B,'bsmt',{doors:{'kit-bsmt':stair}},480,(S,t)=>{const z=S.z;const f2=Math.max(...['hall2','br1','br2','br3','br4'].map(i=>z[i].s));
   const A=V.build(S,B,M,'A'),C=V.build(S,B,M,'C');const ov=M.openingVis(S);const srcDen=Math.max(...B.openings.filter(o=>o.zone==='bsmt').map(o=>ov[o.id].den||0));
   const f1=B.openings.filter(o=>['liv','kit','foy'].includes(o.zone)&&(o.side||'A')==='A').map(o=>ov[o.id].rate);log[t]={t,at:z.attic.s,f2,A,C,srcDen,f1:Math.max(...f1)};});res[stair]=log;
 const L=log;let early=0,stack=0,dil=0;for(const r of L.slice(0,301)){const hi=r.A.emitters.filter(e=>e.y<eY-1&&e.rate>.5);if(r.at<.15&&r.f2<.3&&hi.length)early++;
   for(const vis of [r.A,r.C]){const rear=vis.emitters.filter(e=>e.kind==='rear');if(new Set(rear.map(e=>e.key)).size!==rear.length||rear.length>3)stack++;if(rear.some(e=>e.alpha>.4||e.den>Math.max(0,r.srcDen-1)))dil++;}}
 ok(early===0,`${stair}: no smoke above the Side A eave line in the first 5 min while the attic and floor 2 are clear (${early} s with it)`);
 ok(stack===0,`${stair}: at most one rear plume per hidden side`);ok(dil===0,`${stair}: rear plumes diluted (alpha ≤ .4, density below the source)`);
 ok(L[150].at<.05,`${stair}: attic still clear at 2:30 (${L[150].at.toFixed(3)})`);ok(L[480].at>.03,`${stair}: basement-to-attic chase is under way by 8 min (${L[480].at.toFixed(3)})`);if(stair==='closed')ok(L[480].at<.15,`closed: the seep alone is still below the eave-smoke threshold at 8 min (Oct 13 slow-down; ${L[480].at.toFixed(3)})`);
 const eave=L.find(r=>r.A.emitters.some(e=>e.kind==='eave'));ok(!eave||eave.t>=(stair==='closed'?480:300),`${stair}: eave smoke no earlier than ${stair==='closed'?8:5} min (${eave&&eave.t})`);}
{const O=res.open,Cl=res.closed;ok(O[270].f1>.01&&Cl[270].f1===0,`stair door open: first-floor Side A gaps leak a minute after arrival (open ${O[270].f1.toFixed(3)} vs closed ${Cl[270].f1})`);
 ok(O[300].A.emitters.some(e=>e.kind==='leak'&&e.y>eY),'stair door open: leak emitters on Side A below the eave by 5 min');
 const cl=r=>r.C.emitters.filter(e=>e.kind==='leak'&&e.y>=378).reduce((a,e)=>a+e.rate,0);ok(cl(Cl[210])>cl(O[210])&&cl(Cl[210])>0,`stair door closed: Side C basement-level leaks stronger than with it open at arrival (${cl(Cl[210]).toFixed(1)} vs ${cl(O[210]).toFixed(1)})`);
 const A0=V0.build((()=>{const S=M0.create(B,scn(B,'bsmt',{doors:{'kit-bsmt':'closed'}}));for(let i=0;i<210;i++)M0.step(S);return S;})(),B,M0,'A');ok(A0.emitters.filter(e=>e.kind==='rear').length===3,'control: the old build drew 3 stacked roof plumes at arrival (the bug)');}

sec('chase only for basement fires');
{const S=run(M,B,'liv',{},900);const S0=run(M0,B,'liv',{},900);ok(S.z.attic.s===S0.z.attic.s,'living-room fire attic unchanged by the chase');ok(M.CHASE_K>0&&M.CHASE_K<.01,'chase rate is a small teaching value');}

sec('pixels: Side A roof at arrival, stair door closed (old vs new build)');
{const out=cp.execFileSync('node',['bfpix.js'],{encoding:'utf8',timeout:240000}).trim().split('\n').pop();const r=JSON.parse(out);PIX=r;
 ok(r.old>r.new*2&&r.new<6,`roof darkening above the ridge at T=210 s: old build ${r.old.toFixed(1)}, new build ${r.new.toFixed(1)} (mean luminance drop vs a no-smoke frame)`);}
console.log('pixels',JSON.stringify(PIX));console.log(`\nbasement suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);
