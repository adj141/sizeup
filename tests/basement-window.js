// Oct 14 basement window fix: basement glass failed ~4:50 after ignition, before basement flashover. Now keyed to the basement's own hot
// layer at a cited fallout condition (BGLASS.fallT, near-flashover; 20-35 kW/m2 fallout flux). FSRI/ISFSI basement experiments: fires stayed
// ventilation-limited with windows as set until fire service ventilation.
const {chromium}=require('playwright-core');const fs=require('fs');global.window={};
const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');
const ld=f=>{delete require.cache[require.resolve(f)];return require(f);};const M0=ld('./base/model.pre-basementwindow.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok:',m);}else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('# '+n);
const OUT='/workspace/sizeup/screens/basement-window-oct14/';fs.mkdirSync(OUT,{recursive:true});
const b=BLD.house;const BW=b.openings.filter(o=>o.type==='window'&&(o.level==='B'||b.zones.find(z=>z.id===o.zone).floor==='B')).map(o=>o.id);
const mk=(MM,o)=>MM.create(b,{sceneId:'house',origin:o.origin||'bsmt',fuel:o.fuel||'modern',preburn:0,openings:o.openings||{},doors:o.doors||{},occupant:'none',wind:o.wind||{dir:'calm',spd:0},glass:'fails',seed:o.seed||5,actions:[],tNow:0,companies:M.PRESETS.generic.companies()});
const mmss=t=>t==null?'never':`${Math.floor(t/60)}:${String(Math.round(t%60)).padStart(2,'0')}`;
function trace(MM,o,T=900){const S=mk(MM,o);const at={};let tHot=null;for(let t=0;t<=T;t++){if(tHot==null&&S.z.bsmt.T>=(M.BGLASS.fallT))tHot=S.t;for(const id of BW)if(at[id]==null&&S.o[id].state==='failed'&&S.o[id].selfFailed)at[id]={t:S.t,T:S.z.bsmt.T};MM.step(S);}return{S,at,tHot};}
sec('cited values');
ok(M.BGLASS.fallT>=.85&&M.BGLASS.fallT<1,'basement glass falls out only with a near-flashover basement hot layer (fallT 0.9; flashover ~1.0); fallout needs ~20-35 kW/m2');
ok(M.BGLASS.well<1,'small window-well window heats more slowly (teaching value '+M.BGLASS.well+')');
ok(b.openings.find(o=>o.id==='bwB').well===true,'Side B basement window is the window-well window');
sec('old model reproduces the bug');
{const {S,at}=trace(M0,{});const f=Math.min(...Object.values(at).map(a=>a.t));ok(f<5*60&&(S.z.bsmt.tFlash==null||f<S.z.bsmt.tFlash),`old: basement glass failed ${mmss(f)}, basement flashover ${mmss(S.z.bsmt.tFlash)}`);}
sec('no basement glass failure before the cited conditions; failure only on the basement\'s own heat');
for(const doors of [{},{'kit-bsmt':'closed'},{'kit-bsmt':'open'}])for(const fuel of ['modern','legacy'])for(const seed of [5,77,1234])for(const wind of [{dir:'calm',spd:0},{dir:'C',spd:2}]){
  const {S,at,tHot}=trace(M,{doors,fuel,seed,wind});const n=`door ${doors['kit-bsmt']||'default'}, ${fuel}, seed ${seed}, wind ${wind.dir}`;
  ok(!Object.values(at).some(a=>a.t<300),`${n}: no basement glass failure by 5:00 (AJ's case)`);
  for(const id in at){ok(tHot!=null&&at[id].t>tHot&&at[id].T>=M.BGLASS.fallT*.95,`${n}: ${id} failed ${mmss(at[id].t)} after the basement layer reached the fallout level (${mmss(tHot)}, T ${at[id].T.toFixed(2)})`);}
  if(tHot==null)ok(Object.keys(at).length===0,`${n}: basement never reached the fallout level, glass intact (ventilation-limited)`);}
for(const origin of ['liv','kit','gar']){const {at,S}=trace(M,{origin},900);ok(Object.keys(at).length===0||S.z.bsmt.T>=M.BGLASS.fallT,`${origin} fire: basement glass intact unless the basement itself gets hot (${Object.keys(at).length} failed)`);}
sec('ventilated basement (window open before ignition): the fire can flash and then glass fails on that heat');
{const {S,at,tHot}=trace(M,{openings:{bw1:'open'}});const tf=S.z.bsmt.tFlash;
 ok(tf!=null,`basement flashes with a window open (${mmss(tf)})`);ok(!at.bwB||at.bwB.t>=tHot,`window-well glass ${at.bwB?'fails '+mmss(at.bwB.t):'intact'} only after the layer reached the fallout level (${mmss(tHot)})`);}
// timeline
const KEY=/Flashover|Collapse warning|Floor burn-through|Floor collapse|failed from heat|extended into|fully involved|Ceiling breach/;
let md='# Basement fire timeline, 2-story house (Oct 14 basement window fix)\n\nModern contents, calm, seed 5, glass "fails", unattended, 15 min. Times from ignition; default arrival 3:30 (T+0). AJ\'s case: arrival at 5:00.\n\n';
const tl=(MM,o,name)=>{const S=mk(MM,o);let pk=0;for(let t=0;t<=900;t++){pk=Math.max(pk,S.z.bsmt.T);MM.step(S);}md+=`## ${name}\n\n| Time | T+ (arr 3:30) | Event |\n|---|---|---|\n`;const es=S.events.filter(e=>KEY.test(e.msg));if(!es.length)md+='| - | - | none (fire stays ventilation-limited: smoke only) |\n';for(const e of es)md+=`| ${mmss(e.t)} | ${e.t>=210?mmss(e.t-210):'-'+mmss(210-e.t)} | ${e.msg.split('. ')[0]} |\n`;md+=`\nBasement peak hot layer T ${pk.toFixed(2)} (glass fallout level ${M.BGLASS.fallT}); basement flashed: ${S.z.bsmt.flashed?mmss(S.z.bsmt.tFlash):'no'}.\n\n`;};
tl(M,{},'AFTER, stair door default (closed)');tl(M,{doors:{'kit-bsmt':'open'}},'AFTER, stair door open');tl(M,{openings:{bw1:'open'}},'AFTER, Side C basement window open before ignition (ventilated)');
tl(M0,{},'BEFORE (live f6888c5), stair door default (closed)');tl(M0,{doors:{'kit-bsmt':'open'}},'BEFORE (live f6888c5), stair door open');
fs.writeFileSync(OUT+'timeline.md',md);
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const shot=async(url,side,t,doors,file)=>{const p=await br.newPage({viewport:{width:1280,height:900}});await p.goto(url);await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);
  await p.evaluate(async([t,doors])=>{const u=window.__sizeup,M=u.M;await u.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'bsmt',fuel:'modern',preburn:t,openings:{},doors,occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});u.A.playing=false;},[t,doors]);
  await p.evaluate(s=>{window.__sizeup.setSide(s);window.__sizeup.syncUI();},side);await p.addStyleTag({content:'.toast{display:none!important}'});await p.waitForTimeout(3000);await p.locator('.slot .stage').screenshot({path:file});await p.close();};
 for(const [k,url] of [['before','file:///workspace/sizeup/tests/base/builds/pre-basement-window-f6888c5.html#noautoplay'],['after','file:///workspace/sizeup/index.html#noautoplay']])
  for(const [sd,t,dn,d] of [['C',300,'closed',{}],['B',300,'closed',{}],['C',300,'open',{'kit-bsmt':'open'}],['A',600,'closed',{}]])await shot(url,sd,t,d,`${OUT}${k}-side${sd}-${t/60}min-door-${dn}.png`);
 await br.close();console.log(`\nbasement-window suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})();
