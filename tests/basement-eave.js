// Oct 13 (2): basement fire must not put smoke at the 2nd-floor eaves, or floating plumes, without a model reason. Run: node basement-eave.js
const {chromium}=require('playwright-core');const fs=require('fs'),cp=require('child_process');
global.window={};const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');M.UGLASS.on=false;M.VFO.on=false;M.SEEP.on=false;/* Oct 22b: pre-glass/flashover/seepage-reading behaviour (new rules tested in glass-flashover-oct22.js) */M.STRUCT.on=false;M.BGLASS.on=false;
const V=eval(fs.readFileSync('/workspace/sizeup/src/visual.js','utf8')+';SizeupVisual');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('\n# '+n);
const B=BLD.house,OUT='/workspace/sizeup/screens/basement-eave-oct13/';
const mk=door=>M.create(B,{sceneId:'house',origin:'bsmt',fuel:'modern',preburn:0,openings:{},doors:{'kit-bsmt':door},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,actions:[],tNow:0,companies:M.PRESETS.generic.companies()});
sec('model: basement fire, 0-10 min, every side');
for(const door of ['closed','open']){const S=mk(door);let bad=[],float=[],ridge=[];
 for(let t=1;t<=600;t++){M.step(S);if(t%10)continue;const f2=Math.max(...['hall2','br1','br2','br3','br4'].map(i=>S.z[i].s));const upperOpen=B.openings.some(o=>{const z=B.zones.find(z=>z.id===o.zone);return z&&z.floor==='2'&&S.o[o.id].state!=='closed';});
  const ov=M.openingVis(S);
  for(const sd of ['A','B','C','D']){const vw=M.viewOf(B,sd);const eY=(vw.eaves&&vw.eaves[0]?vw.eaves[0].y:B.eaves[0].y);const v=V.build(S,B,M,sd);const bx=vw.bldg||{x0:0,x1:vw.W};
   const justified=S.z.attic.s>.15||f2>.3||upperOpen;
   for(const e of v.emitters){if(e.y<=eY+2&&e.kind!=='roof'&&!justified)bad.push(`${t}s ${sd} ${e.kind}:${e.key}`);
    if(e.kind==='rear'&&e.key!=='rbehind'&&/lo$/.test(e.key)&&e.y<=eY+2)float.push(`${t}s ${sd} ${e.key}@${Math.round(e.y)}`);
    if(e.key==='rbehind'){const src=B.openings.some(o=>{const z=B.zones.find(z=>z.id===o.zone);return o.side!==sd&&ov[o.id].state!=='closed'&&z.floor!=='B'&&o.level!=='B';});if(!src)ridge.push(`${t}s ${sd}`);}}}}
 ok(!bad.length,`${door}: no smoke at or above the 2nd-floor eave without attic/upper-floor involvement (${bad.slice(0,4).join(', ')})`);
 ok(!float.length,`${door}: low-origin side plumes never start at eave height (no floating clouds) (${float.slice(0,4).join(', ')})`);
 ok(!ridge.length,`${door}: no plume over the ridge unless an above-grade opening on another side is open/failed (${ridge.slice(0,4).join(', ')})`);}
{const S=mk('closed');M.run(S,480);ok(S.z.attic.s<.15,'closed stair door: attic seep still faint at 8 min ('+S.z.attic.s.toFixed(3)+')');M.run(S,420);ok(S.z.attic.s>.15,'closed: seep reaches eave-smoke level later (15 min: '+S.z.attic.s.toFixed(3)+')');
 const e=M.eavesVis(S,'A');ok(e&&e.rate<.15,'seep eave smoke is faint (rate '+(e&&e.rate.toFixed(3))+')');}
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const shot=async(url,side,t,file)=>{const p=await br.newPage({viewport:{width:1280,height:900}});await p.goto(url);await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);await p.evaluate(()=>{const M=window.__sizeup.M;if(M.UGLASS){M.UGLASS.on=false;M.VFO.on=false;M.SEEP.on=false;}});
  await p.evaluate(async t=>{const u=window.__sizeup,M=u.M;if(M.STRUCT)M.STRUCT.on=false;if(M.BGLASS)M.BGLASS.on=false;/* eave-fix regression: structural fuel off (Oct 13; floor burn-through at 6:00 legitimately adds smoke upstairs), see structure.js */await u.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'bsmt',fuel:'modern',preburn:t,openings:{},doors:{'kit-bsmt':'closed'},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});u.A.playing=false;},t);
  await p.evaluate(s=>{window.__sizeup.setSide(s);window.__sizeup.syncUI();},side);await p.addStyleTag({content:'.toast{display:none!important}'});await p.waitForTimeout(3000);await p.locator('.slot .stage').screenshot({path:file});await p.close();};
 const lum=(a,b)=>+cp.execFileSync('python3',['-c',`
from PIL import Image,ImageStat
a=Image.open('${a}').convert('L');b=Image.open('${b}').convert('L');W,H=a.size
box=(int(W*.15),int(H*.0),int(W*.98),int(H*.42)) # sky and roof above the 2nd-floor eave
print(ImageStat.Stat(a.crop(box)).mean[0]-ImageStat.Stat(b.crop(box)).mean[0])`],{encoding:'utf8'}).trim();const R={};
 for(const [k,url] of [['before','file:///workspace/sizeup/tests/base/builds/pre-eave-fix-c970ed3.html#noautoplay'],['after','file:///workspace/sizeup/index.html#noautoplay']]){fs.mkdirSync(OUT+k,{recursive:true});
  for(const sd of ['A','C','D']){await shot(url,sd,5,`${OUT}${k}/side${sd}-0s.png`);for(const t of [360,540]){await shot(url,sd,t,`${OUT}${k}/side${sd}-${t}s.png`);R[k+sd+t]=lum(`${OUT}${k}/side${sd}-0s.png`,`${OUT}${k}/side${sd}-${t}s.png`);}}}
 console.log(JSON.stringify(R));// Side C is excluded: its walk-out basement window is in view and its own smoke column rises past the eave (justified)
 for(const sd of ['A','D'])for(const t of [360,540])ok(R['after'+sd+t]<R['before'+sd+t]*.5&&R['after'+sd+t]<6,`Side ${sd} at ${t/60} min: darkening above the upper eave ${R['before'+sd+t].toFixed(1)} before -> ${R['after'+sd+t].toFixed(1)} after`);
 await br.close();console.log(`\nbasement-eave suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})();
