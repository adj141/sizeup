// Oct 13 basement glass fix: a basement fire failed the first-floor living-room glass ~T+3/4 min (default preburn 3:30). Cause: the floor
// burn-through was timed from ignition (6:00), opening the floor to the living room before the basement fire was even severe.
const {chromium}=require('playwright-core');const fs=require('fs');global.window={};
const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');M.UGLASS.on=false;M.VFO.on=false;M.SEEP.on=false;/* Oct 22b: pre-glass/flashover/seepage-reading behaviour (new rules tested in glass-flashover-oct22.js) */
const ld=f=>{delete require.cache[require.resolve(f)];return require(f);};const M0=ld('./base/model.pre-basementglass.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('# '+n);
const OUT='/workspace/sizeup/screens/basement-glass-oct13/';fs.mkdirSync(OUT,{recursive:true});
const b=BLD.house;const F1=b.openings.filter(o=>o.type==='window'&&b.zones.find(z=>z.id===o.zone).floor==='1').map(o=>o.id);
const mk=(MM,o)=>MM.create(b,{sceneId:'house',origin:'bsmt',fuel:o.fuel||'modern',preburn:0,openings:{},doors:o.doors||{},occupant:'none',wind:o.wind||{dir:'calm',spd:0},glass:'fails',seed:o.seed||5,actions:[],tNow:0,companies:M.PRESETS.generic.companies()});
const mmss=t=>t==null?'never':`${Math.floor(t/60)}:${String(Math.round(t%60)).padStart(2,'0')}`;
function trace(MM,o,T=900){const S=mk(MM,o);const at={};for(let t=0;t<=T;t++){for(const id of F1)if(at[id]==null&&S.o[id].state==='failed')at[id]={t:S.t,T:S.z[S.o[id].zone].T};MM.step(S);}return{S,at};}
const ev=(S,re)=>{const e=S.events.find(e=>re.test(e.msg));return e?e.t:null;};
sec('old model reproduces the bug');
{const {S,at}=trace(M0,{});const f=Math.min(...Object.values(at).map(a=>a.t));ok(f<S.z.bsmt.tFlash+60,`old: first floor-1 glass failed ${mmss(f)}, basement flashover ${mmss(S.z.bsmt.tFlash)}, floor burn-through at ${mmss(ev(S,/^Floor burn-through/))} (from ignition)`);}
const TL=[];
for(const doors of [{},{'kit-bsmt':'closed'},{'kit-bsmt':'open'}])for(const fuel of ['modern','legacy'])for(const seed of [5,77,1234])for(const wind of [{dir:'calm',spd:0},{dir:'A',spd:2}]){
  const {S,at}=trace(M,{doors,fuel,seed,wind});const name=`door ${doors['kit-bsmt']||'default'}, ${fuel}, seed ${seed}, wind ${wind.dir}`;
  const bt=ev(S,/^Floor burn-through/),ext=S.events.filter(e=>/Fire has extended into/.test(e.msg)&&b.zones.find(z=>z.id===e.zone&&z.floor==='1')).map(e=>e.t)[0];
  const tf=S.z.bsmt.tFlash;
  for(const id of F1){const a=at[id];if(!a)continue;const z=b.openings.find(o=>o.id===id).zone;
    ok(tf!=null&&a.t>tf,`${name}: ${id} fails ${mmss(a.t)} only after the basement flashed (${mmss(tf)})`);
    ok(bt!=null&&a.t>bt||ext!=null&&a.t>=ext-60,`${name}: ${id} fails after heat actually reached floor 1 (burn-through ${mmss(bt)})`);
    ok(a.T>=.3,`${name}: ${id} failed on its own room's hot layer (${z} T ${a.T.toFixed(2)} >= 0.3 glass-heating threshold)`);}
  ok(!(bt!=null)||bt-tf>=120&&bt-tf<=261,`${name}: floor burn-through ${mmss(bt)} is 2:00-4:21 after basement flashover ${mmss(tf)}`);
  if(seed===5&&wind.dir==='calm'&&fuel==='modern')TL.push({name,S});}
sec('no floor-1 glass failure in the first 6 min of any basement fire');
for(const doors of [{},{'kit-bsmt':'open'}]){const {at}=trace(M,{doors},360);ok(Object.keys(at).length===0,`door ${doors['kit-bsmt']||'default'}: no floor-1 glass by 6:00`);}
// timeline
let md='# Basement fire timeline, 2-story house (Oct 13 basement glass fix)\n\nModern contents, calm, seed 5, glass "fails", unattended. Times from ignition; default arrival is 3:30 (T+0).\n\n';
const KEY=/Flashover|Collapse warning|Floor burn-through|Floor collapse|failed from heat|extended into|fully involved|Ceiling breach/;
for(const {name,S} of TL){md+=`## ${name}\n\n| Time | T+ (arr 3:30) | Event |\n|---|---|---|\n`;for(const e of S.events.filter(e=>KEY.test(e.msg)&&e.t<=900))md+=`| ${mmss(e.t)} | ${e.t>=210?mmss(e.t-210):'-'+mmss(210-e.t)} | ${e.msg.split('. ')[0]} |\n`;md+='\n';}
{const {S}=trace(M0,{});md+='## BEFORE (live 7b253c5), door default\n\n| Time | Event |\n|---|---|\n';for(const e of S.events.filter(e=>KEY.test(e.msg)&&e.t<=600))md+=`| ${mmss(e.t)} | ${e.msg.split('. ')[0]} |\n`;}
fs.writeFileSync(OUT+'timeline.md',md);
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const shot=async(url,t,doors,file)=>{const p=await br.newPage({viewport:{width:1280,height:900}});await p.goto(url);await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);await p.evaluate(()=>{const M=window.__sizeup.M;if(M.UGLASS){M.UGLASS.on=false;M.VFO.on=false;M.SEEP.on=false;}});
  await p.evaluate(async([t,doors])=>{const u=window.__sizeup,M=u.M;await u.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'bsmt',fuel:'modern',preburn:t,openings:{},doors,occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});u.A.playing=false;},[t,doors]);
  await p.evaluate(()=>{window.__sizeup.setSide('A');window.__sizeup.syncUI();});await p.addStyleTag({content:'.toast{display:none!important}'});await p.waitForTimeout(3000);await p.locator('.slot .stage').screenshot({path:file});await p.close();};
 for(const [k,url] of [['before','file:///workspace/sizeup/tests/base/builds/pre-basement-glass-7b253c5.html#noautoplay'],['after','file:///workspace/sizeup/index.html#noautoplay']])
  for(const t of [480,600,660])for(const [dn,d] of [['default',{}],['open',{'kit-bsmt':'open'}]])await shot(url,t,d,`${OUT}${k}-sideA-${mmss(t).replace(':','m')}-door-${dn}.png`);
 await br.close();console.log(`\nbasement-glass suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})();
