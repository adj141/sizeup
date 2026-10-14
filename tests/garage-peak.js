// Oct 13 garage peak fix: a garage fire showed smoke at the roof peak on Side B (the garage is a 1-story wing on the D end, hidden behind
// the house from B). Cause: the far-side (Side D) garage window failed and the hidden-side rule drew a "behind the ridge" plume at the peak.
const {chromium}=require('playwright-core');const fs=require('fs');global.window={};
const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');
const ld=f=>{delete require.cache[require.resolve(f)];return require(f);};const M0=ld('./base/model.pre-garagefix.js');
const V=new Function(fs.readFileSync('/workspace/sizeup/src/visual.js','utf8')+';return SizeupVisual;')();
const V0=new Function(fs.readFileSync('./base/visual.pre-garagefix.js','utf8')+';return SizeupVisual;')();
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('# '+n);
const b=BLD.house;const scn={sceneId:'house',origin:'gar',fuel:'modern',preburn:0,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:12345,actions:[],tNow:0,companies:M.PRESETS.generic.companies()};
const GAR=/^(gd|gw|gsd|gsdD|gwD)$/;const isAttic=e=>/^eave:/.test(e.key);
const S=M.create(b,JSON.parse(JSON.stringify(scn))),S0=M0.create(b,JSON.parse(JSON.stringify(scn)));let bugOld=0,firstB=null;const R={A:[],B:[],C:[],D:[]};
for(let t=0;t<=1500;t++){if(t%30===0)for(const sd of 'ABCD'){const es=V.build(S,b,M,sd).emitters.filter(e=>e.rate>.001),es0=V0.build(S0,b,M0,sd).emitters.filter(e=>e.rate>.001);
  const vb=M.viewOf(b,sd);const att=S.z.attic;
  if(sd==='B'&&es0.some(e=>e.key==='rbehind'))bugOld++;
  for(const e of es){let good;
    if(isAttic(e))good=att.s>.1;                                                    // attic smoke only once the attic actually has smoke
    else if(sd==='A')good=GAR.test(e.key)||e.key==='rbehind:gar'&&e.y>=250||e.key==='rrightlo'&&e.x>1060; // garage door, garage roof, D-end corner
    else if(sd==='B')good=false;                                                     // garage wing is entirely behind the house from B
    else if(sd==='C')good=GAR.test(e.key)&&e.x<600||e.key==='rleftlo'&&e.x<vb.bldg.x0+40; // garage window/door on the D end of C, D-end corner
    else good=GAR.test(e.key)||e.key==='rrightlo'&&e.y>=vb.floors.find(f=>f.f==='1').y0-1; // garage openings on D, and Side C garage openings at the C-end corner of the wing, from floor 1
    if(!good)R[sd].push(`${t}s ${e.key}@${Math.round(e.x)},${Math.round(e.y)}`);}
  if(sd==='B'&&es.length&&firstB==null)firstB={t,es};}
 M.step(S);M0.step(S0);}
sec('old build reproduces the bug');ok(bugOld>0,`old visual: Side B ridge-peak plume from the garage (${bugOld} frames)`);
for(const sd of 'ABCD'){sec(`Side ${sd}: every plume ties to the garage geometry, or to the attic once it has smoke`);ok(R[sd].length===0,`Side ${sd}: ${R[sd].length?R[sd].slice(0,4).join('; '):'all sources justified'}`);}
sec('Side B: peak smoke only when the attic is involved, from the gable vent / eaves, faint at first');
ok(firstB&&firstB.es.every(isAttic),`first Side B smoke at ${firstB&&firstB.t}s is attic (gable/eave) smoke`);
ok(firstB&&Math.max(...firstB.es.map(e=>e.rate))<1,`and faint (max rate ${firstB&&Math.max(...firstB.es.map(e=>e.rate)).toFixed(2)})`);
ok(firstB&&firstB.t>=10*60,`not before 10 min (first at ${firstB&&(firstB.t/60).toFixed(1)} min)`);
sec('other origins unchanged by the fix (no garage zone involved)');
{let bad=0,n=0;for(const o of ['liv','kit','br1','br3','bsmt']){const a=M.create(b,{...JSON.parse(JSON.stringify(scn)),origin:o});for(let t=0;t<=600;t++){if(a.z.gar.ign)break;if(t%60===0)for(const sd of 'ABCD'){n++;if(JSON.stringify(V.build(a,b,M,sd).emitters)!==JSON.stringify(V0.build(a,b,M,sd).emitters))bad++;}M.step(a);}}
 ok(bad===0,`emitters identical old vs new for non-garage fires (${n} frames, ${bad} differ)`);}
(async()=>{const OUT='/workspace/sizeup/screens/garage-peak-oct13/';fs.mkdirSync(OUT,{recursive:true});
 const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const shot=async(url,side,t,file)=>{const p=await br.newPage({viewport:{width:1280,height:900}});await p.goto(url);await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);
  await p.evaluate(async t=>{const u=window.__sizeup,M=u.M;await u.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'gar',fuel:'modern',preburn:t,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:12345,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});u.A.playing=false;},t);
  await p.evaluate(s=>{window.__sizeup.setSide(s);window.__sizeup.syncUI();},side);await p.addStyleTag({content:'.toast{display:none!important}'});await p.waitForTimeout(3000);await p.locator('.slot .stage').screenshot({path:file});await p.close();};
 for(const [k,url] of [['before','file:///workspace/sizeup/tests/base/builds/pre-garage-fix-be661a9.html#noautoplay'],['after','file:///workspace/sizeup/index.html#noautoplay']])
  for(const [sd,t] of [['B',480],['B',840],['B',1200],['A',480],['C',480],['D',480]])await shot(url,sd,t,`${OUT}${k}-side${sd}-${t/60}min.png`);
 await br.close();console.log(`\ngarage-peak suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})();
