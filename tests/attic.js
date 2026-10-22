// Oct 19 2026 attic fire fix (AJ: attic origin, 5 min arrival: fire from ALL eaves on arrival, then the fire went out on its own 6-8 min later).
// Cited values (FIRE-MODEL.md "Attic fires"): FSRI attic study [FSRI-ATTIC]: ventilation-limited in ~5 min (Table 7.1; 7:45/8:00 Exps 3A/4A),
// natural vents keep a VL attic fire burning, burning concentrates at the roof hole, gables and eaves only once the attic is vented;
// NISTIR 7094 [NIST-ROOF]: roof burning ~6 min and collapse 8-9 min after the fire entered the attic; NIOSH 2005-132: trusses 5-10 min.
const {chromium}=require('playwright-core');const fs=require('fs');global.window={};
const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');
const ld=f=>{delete require.cache[require.resolve(f)];return require(f);};const M0=ld('./base/model.pre-attic.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;console.log('  ok:',m);}else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('# '+n);
const OUT='/workspace/sizeup/screens/attic-oct19/';fs.mkdirSync(OUT,{recursive:true});
const b=BLD.house;const A=M.ATTIC;
const mk=(MM,o={})=>MM.create(o.b||b,{format:'sizeup-scenario',v:2,sceneId:'house',origin:'attic',fuel:o.fuel||'modern',preburn:o.preburn||300,openings:{},doors:{},occupant:'none',wind:o.wind||{dir:'calm',spd:0},glass:'fails',seed:o.seed||5,atticU:o.u,actions:[],tNow:0,companies:M.PRESETS.generic.companies()});
const mmss=t=>t==null?'never':`${Math.floor(t/60)}:${String(Math.round(t%60)).padStart(2,'0')}`;
const evT=(S,re)=>{const e=S.events.find(e=>re.test(e.msg));return e?e.t:null;};
// eave fire as the renderer draws it (visual.js): segments with flame > .4, only when the eave reading is not pulsing
const eaveFire=(MM,S,side)=>{const e=MM.eavesVis(S,side);if(!e||!(e.flame>.4)||e.pulse)return[];return e.segs.filter(g=>g.flame!=null?g.flame>.4&&(g.src==='attic'||g.src==='gable'):g.src==='attic'&&g.rate>=e.rate*.6).map(g=>g.fx0!=null?[g.fx0,g.fx1]:[g.x0,g.x1]).filter(([a,c])=>c-a>=8);};
const len=r=>{const v=r.map(x=>[...x]).sort((p,q)=>p[0]-q[0]);let L=0,e=-1e9;for(const [a,c] of v){if(c>e){L+=c-Math.max(a,e);e=c;}}return L;}; // union length
const E=b.eaves[0],EL=E.x1-E.x0;const uOf=x=>(x-E.x0)/EL;
sec('cited values');
ok(A.tg===300,'attic growth potential peaks ~5 min after ignition (FSRI Table 7.1: ventilation-limited in 5 min), independent of room contents');
ok(A.ventSealed>0&&A.ventSealed<A.vent,'natural soffit/gable vents keep air coming after the ridge vent melts shut (less than before)');
ok(A.burn===360,'roof deck burn-through after 6:00 of involvement (NISTIR 7094 test 2: attic 8:00 -> roof burning 14:00)');
ok(A.roof.truss.collapse===540,'truss roof collapse likely after 9:00 of involvement (NISTIR 7094 test 2: attic 8:00 -> collapse 17:00; NIOSH 5-10 min)');
ok(A.roof.rafter.collapse>A.roof.truss.collapse,'rafter (dimensional) roof lasts longer (teaching value)');
ok(b.roofSystem==='truss','sample house assumed to have a lightweight truss roof (as in the FSRI and NIST test structures)');
sec('old model (live 05c26ab) reproduces both bugs');
{const S=mk(M0);let all=null;for(let t=0;t<=12*60;t++){const f=eaveFire(M0,S,'A');if(all==null&&f.length>=4)all=S.t;M0.step(S);}
 ok(all!=null&&all<=6*60,`old: fire at every Side A eave stretch at ${mmss(all)} (AJ: "fire showing from all of the eaves")`);
 ok(S.z.attic.q<.1&&/Decay/.test(M0.stageOf(S,'attic')),`old: attic starved out by 12:00 (q ${S.z.attic.q.toFixed(2)}, "${M0.stageOf(S,'attic')}") (AJ: "goes out on its own")`);}
sec('no eave fire at a 5-min arrival, and none before the roof burns through');
for(const fuel of ['modern','legacy'])for(const seed of [5,77,1234])for(const wind of [{dir:'calm',spd:0},{dir:'A',spd:1}])for(const u of [undefined,.15,.85]){
  const S=mk(M,{fuel,seed,wind,u});const n=`${fuel}, seed ${seed}, wind ${wind.dir}, origin ${u==null?'center':'u '+u}`;let first=null,firstSide=null;
  for(let t=0;t<=20*60;t++){if(first==null)for(const sd of ['A','B','C','D'])if(eaveFire(M,S,sd).length){first=S.t;firstSide=sd;break;}M.step(S);}
  const bt=S.z.attic.roofBurn;
  ok(first==null||first>8*60,`${n}: no eave fire on any side by 8:00 (first ${mmss(first)} on Side ${firstSide||'-'})`);
  ok(bt!=null&&(first==null||first>=bt),`${n}: eave fire only after the roof burn-through (${mmss(bt)})`);}
sec('timeline: smoke, ridge vent seal, ventilation-limited, burn-through, collapse (unattended, modern, calm)');
{const S=mk(M);let tvl=null,smoke5=null;for(let t=0;t<=20*60;t++){if(tvl==null&&S.z.attic.vl)tvl=S.t;if(S.t===300)smoke5=M.eavesVis(S,'A');M.step(S);}
 const a=S.z.attic;
 ok(smoke5&&smoke5.rate>.3,`heavy eave/soffit smoke at the 5:00 arrival (rate ${smoke5&&smoke5.rate.toFixed(2)}), no fire`);
 ok(a.ridgeSealed!=null&&a.ridgeSealed<=tvl,`ridge vent melts shut (${mmss(a.ridgeSealed)}) before the attic goes ventilation-limited (${mmss(tvl)})`);
 ok(tvl>=4*60&&tvl<=8*60,`ventilation-limited at ${mmss(tvl)} (FSRI: ~5:00, 7:45, 8:00)`);
 ok(a.roofBurn>tvl&&a.roofBurn<14*60,`roof burn-through at ${mmss(a.roofBurn)}`);
 ok(a.roofWarn!=null&&a.roofWarn<a.roofBurn,`roof collapse warning when the trusses start burning (${mmss(a.roofWarn)})`);
 ok(a.roofCollapse>a.roofBurn&&a.roofCollapse<=20*60,`roof collapse likely ${mmss(a.roofCollapse)}, ${mmss(a.roofCollapse-a.roofBurn)} after burn-through (NISTIR 7094: 3 min)`);
 ok(a.fullInv>a.roofBurn&&a.fullInv-a.roofBurn<=6*60,`attic fully involved ${mmss(a.fullInv)} (within 6 min of venting; NISTIR 7094: attic flashover 5.5 min after the fire entered)`);
 ok(S.events.some(e=>/^Roof burn-through/.test(e.msg))&&S.events.some(e=>/^Roof collapse likely/.test(e.msg))&&S.events.some(e=>/ridge vent .* melted shut/.test(e.msg)),'events logged');}
{const S=mk(M,{b:{...b,roofSystem:'rafter'}});M.run(S,30*60);ok(S.z.attic.roofCollapse-S.z.attic.roofBurn>(A.roof.truss.collapse-A.burn),`rafter roof: collapse likely ${mmss(S.z.attic.roofCollapse)} (later than trusses)`);}
sec('eave smoke and fire start near the origin and spread');
for(const u of [.15,.5,.85]){const S=mk(M,{u});const near=[],seen=[];let first=null;
  for(let t=0;t<=25*60;t++){const f=eaveFire(M,S,'A');if(f.length){if(first==null)first={t:S.t,r:f};seen.push({t:S.t,L:len(f)});}
    if(S.t===300){const e=M.eavesVis(S,'A');const segs=e.segs.filter(g=>g.src==='attic'||g.src==='push');const d=g=>{const lo=uOf(g.x0),hi=uOf(g.x1);return u<lo?lo-u:u>hi?u-hi:0;};
      const nr=Math.max(...segs.filter(g=>d(g)<.1).map(g=>g.rate)),fr=Math.max(0,...segs.filter(g=>d(g)>.35).map(g=>g.rate));near.push(nr,fr);}
    M.step(S);}
  ok(near[0]>near[1]*1.5,`origin u ${u}: at 5:00 eave smoke near the origin (${near[0].toFixed(2)}) heavier than far away (${near[1].toFixed(2)})`);
  const c=first&&first.r.map(([a,c])=>uOf((a+c)/2));ok(first&&c.every(x=>Math.abs(x-u)<=.3),`origin u ${u}: first eave fire at ${mmss(first&&first.t)} next to the origin (centres u ${c&&c.map(x=>x.toFixed(2)).join(', ')})`);
  const L0=first?len(first.r):0,Lmax=Math.max(...seen.map(s=>s.L));ok(Lmax>L0*1.8,`origin u ${u}: eave fire spreads from ${Math.round(L0)} px to ${Math.round(Lmax)} px of eave`);
  let mono=true;for(let i=1;i<seen.length;i++)if(seen[i].L+30<seen[i-1].L)mono=false;ok(mono,`origin u ${u}: the burning stretch only grows while unattended`);}
{const S=mk(M,{u:.15});M.run(S,11*60+30);const fC=eaveFire(M,S,'C'),fA=eaveFire(M,S,'A');const cu=fC.map(([a,c])=>1-((a+c)/2-285)/(1023-285));
 const hi=S.z.attic.u0+S.z.attic.ext+.05;ok(fA.length&&fC.length&&cu.every(x=>x<=hi)&&cu.some(x=>x<.3),`Side C (rear) mirrors it: Side C eave fire on the Side B end only, inside the involved stretch u 0-${hi.toFixed(2)} (centres u ${cu.map(x=>x.toFixed(2)).join(', ')})`);}
sec('unattended: keeps burning on the structure (no burnout at 30 and 60 min)');
for(const fuel of ['modern','legacy'])for(const u of [undefined,.15]){const S=mk(M,{fuel,u});M.run(S,30*60);const a30=!S.z.attic.out&&S.z.attic.q>.3,st30=M.stageOf(S,'attic');M.run(S,30*60);
  ok(a30&&!S.z.attic.out&&S.z.attic.q>.3,`${fuel}, origin ${u==null?'center':u}: still burning at 30 min ("${st30}") and 60 min (q ${S.z.attic.q.toFixed(2)}, "${M.stageOf(S,'attic')}")`);
  ok(!S.events.some(e=>/burned itself out|has decayed after/.test(e.msg))&&!/Decay/.test(st30),`${fuel}: no burnout or decay message`);}
sec('suppression still knocks it down');
for(const [at,via] of [[300,'br2'],[300,'hall2'],[12*60,'br2']]){const S=mk(M);M.run(S,at);M.act(S,{t:S.t,kind:'assign',co:'E1',task:'line',target:'attic:'+via});M.run(S,15*60);
  ok(S.z.attic.out&&!S.z.attic.burnedOut,`line via a pulled ceiling in ${via}, ordered at ${mmss(at)}: attic knocked down at ${mmss(S.z.attic.tOut)}`);}
sec('other origins keep the earlier attic rules (equiv suite checks them against the baselines)');
{const S2=M.create(b,{origin:'br3',fuel:'modern',preburn:300,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,companies:M.PRESETS.generic.companies()});
 const S0=M0.create(b,JSON.parse(JSON.stringify(S2.scn)));M.run(S2,25*60);M0.run(S0,25*60);
 ok(!M.atticRules(S2)&&JSON.stringify(S2.events)===JSON.stringify(S0.events),'primary-bedroom fire: same events as the live model for 25 min');}
sec('attic smoke at a 5-min arrival leaves through the vents, heaviest near the origin (Oct 19 smoke fix; AJ: "thick cloud blanketing the entire roof line")');
const VIS=(()=>{const src=fs.readFileSync(require.resolve('/workspace/sizeup/src/visual.js'),'utf8');return new Function(src+';return SizeupVisual;')();})();
for(const u of [undefined,.15,.85]){const S=mk(M,{u});M.run(S,300);const e=M.eavesVis(S,'A');const u0=S.z.attic.u0;const vs=e.vents||[];
  const near=vs.filter(v=>Math.abs(uOf(v.x)-u0)<.1),far=vs.filter(v=>Math.abs(uOf(v.x)-u0)>.35);const avg=a=>a.reduce((s,v)=>s+v.rate,0)/Math.max(1,a.length);
  ok(vs.length>=8&&near.length&&far.length&&avg(near)>avg(far)*2.5,`origin ${u==null?'center':'u '+u}: 5:00 soffit-vent smoke near the origin ${avg(near).toFixed(2)} vs far end ${avg(far).toFixed(2)} (${vs.length} vent points)`);
  const fe=Math.max(...vs.filter(v=>Math.abs(uOf(v.x)-u0)>.35).map(v=>v.rate));ok(fe<e.rate*.5,`origin ${u==null?'center':'u '+u}: far-end vents carry under half the heaviest eave smoke (${fe.toFixed(2)} / ${e.rate.toFixed(2)})`);
  const V=VIS.build(S,b,M,'A');const U=b.H/800;const ev=V.emitters.filter(m=>m.kind==='eave'||m.kind==='vent');
  ok(ev.length&&ev.every(m=>m.kind==='vent'&&m.w<=14*U+1e-9),`origin ${u==null?'center':'u '+u}: drawn as narrow vent wisps (${ev.length} vent emitters, none of the wide eave-blanket emitters)`);
  const near1=V.emitters.filter(m=>m.kind==='vent'&&Math.abs(uOf(m.x)-u0)<.1),far1=V.emitters.filter(m=>m.kind==='vent'&&Math.abs(uOf(m.x)-u0)>.35);
  ok(Math.min(...near1.map(m=>m.alpha))>Math.max(...far1.map(m=>m.alpha)),`origin ${u==null?'center':'u '+u}: wisps near the origin are more opaque than at the far end`);}
{const S=mk(M);M.run(S,300);const e=M.eavesVis(S,'A'),c=M.smokeOf(S,'attic');ok(e.vents.every(v=>v.col===c.col&&v.draw.den===c.den&&v.den===e.den),`wisp colour and drawn density come from the model's attic smoke (${c.col}, density ${c.den}), not a preset; the reading on them is the eave reading (density ${e.den})`);}
sec('attic smoke READING follows the attic state (Oct 19: toned down to match the picture)');
{const R=M.ATTIC.smoke.read;ok(R.vents.join()==='1,1,1'&&R.half.join()==='2,1,2'&&R.roof.join()==='2,2,2','reading caps [vol,vel,den]: vents only 1/1/1 (Moderate), half involved 2/1/2, roof open 2/2/2, fully involved uncapped (teaching values)');
 const S=mk(M);const at={};for(let t=0;t<=13*60;t++){if(t===300||t===600||t===780)at[t]={e:M.eavesVis(S,'A'),raw:M.smokeOf(S,'attic'),roof:S.z.attic.roofBurn,full:S.z.attic.fullInv,sealed:S.z.attic.ridgeSealed};M.step(S);}
 const r=x=>`${M.VOLN[x.vol]} ${x.col}, ${M.VELN[x.vel].toLowerCase()}, ${M.DENN[x.den].toLowerCase()}`;
 const a5=at[300].e,a10=at[600].e,a13=at[780].e;
 ok(a5.vol===1&&a5.vel===1&&a5.den===1&&a5.col==='brown'&&a5.pulse===1,`5:00 (vents only, ridge sealed ${mmss(at[300].sealed)}): "${r(a5)}", pulsing (raw attic values ${r(at[300].raw)})`);
 ok(at[600].roof!=null&&!at[600].full&&a10.vol===2&&a10.vel===2&&a10.den===2&&!a10.pulse,`10:00 (roof burned through at ${mmss(at[600].roof)}): "${r(a10)}", no longer pulsing`);
 ok(at[780].full!=null&&a13.vol===at[780].raw.vol&&a13.vel===at[780].raw.vel&&a13.den===at[780].raw.den&&a13.vol===3,`13:00 (fully involved ${mmss(at[780].full)}): uncapped attic reading "${r(a13)}"`);
 ok(a10.vol>=a5.vol&&a13.vol>=a10.vol&&a10.vel>=a5.vel,'volume and velocity only scale up as the attic gets involved');}
{let worst=0;for(const u of [undefined,.15,.85])for(const fuel of ['modern','legacy']){const S=mk(M,{u,fuel});M.run(S,300);const e=M.eavesVis(S,'A');worst=Math.max(worst,e.vol,e.vel,e.den);}
 ok(worst<=1,`every origin and fuel at a 5:00 arrival reads no more than Moderate (max index ${worst})`);}
{const S2=M.create(b,{origin:'br3',fuel:'modern',preburn:300,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,companies:M.PRESETS.generic.companies()});const S0=M0.create(b,JSON.parse(JSON.stringify(S2.scn)));
 let same=true;for(let t=0;t<=20*60;t+=30){const e=M.eavesVis(S2,'A'),e0=M0.eavesVis(S0,'A');if(e&&e0&&(e.vol!==e0.vol||e.vel!==e0.vel||e.den!==e0.den||e.col!==e0.col||e.pulse!==e0.pulse))same=false;M.run(S2,30);M0.run(S0,30);}
 ok(same,'primary-bedroom fire: eave smoke reading identical to the pre-attic model every 30 s for 20 min');}
{const S=mk(M);for(let t=0;t<=300;t++){const e=M.eavesVis(S,'A');if(S.t===200){ok(e&&e.vents&&e.vents.some(v=>v.src==='ridge'),'before the ridge vent seals (3:20) smoke also shows at ridge-vent points');}M.step(S);}
 const e=M.eavesVis(S,'A');ok(!e.vents.some(v=>v.src==='ridge'),`after it melts shut (${mmss(S.z.attic.ridgeSealed)}) no ridge-vent smoke at 5:00`);
 M.run(S,60);const e2=M.eavesVis(S,'A');ok(S.z.attic.vl&&e2.vents.every(v=>v.pulse),'ventilation-limited (6:00): the soffit wisps pulse [FSRI-ATTIC]');}
{const S2=M.create(b,{origin:'br3',fuel:'modern',preburn:300,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,companies:M.PRESETS.generic.companies()});M.run(S2,12*60);
 ok(!('vents' in (M.eavesVis(S2,'A')||{})),'room fires that extend to the attic keep the earlier eave smoke drawing');}
// timeline.md
const KEY=/ridge vent|Roof|roof framing|spreading through|fully involved|Fire has extended|burned itself out|decayed|knocked down/;
let md='# Attic fire timeline, 2-story house (Oct 19 attic fix)\n\nOrigin: attic (centre unless noted), modern contents, calm, seed 5, glass "fails", unattended, 25 min. Times from ignition; AJ\'s case: arrival at 5:00 (T+0).\n\n';
const tl=(MM,o,name)=>{const S=mk(MM,o);const rows=[];let lastF=-1;for(let t=0;t<=25*60;t++){if(t%30===0){const a=S.z.attic;const e=MM.eavesVis(S,'A');const f=eaveFire(MM,S,'A');
    rows.push(`| ${mmss(t)} | ${t>=300?'T+'+mmss(t-300):'-'} | ${a.q.toFixed(2)} | ${a.T.toFixed(2)} | ${a.vl?'yes':'no'} | ${MM.stageOf(S,'attic')} | ${e?e.rate.toFixed(2):'-'}${e&&e.pulse?' (pulsing)':''} | ${f.length?Math.round(len(f)/EL*100)+'% of Side A eave ('+(()=>{const v=f.map(x=>[...x]).sort((p,q)=>p[0]-q[0]);const m=[];for(const [a,c] of v){if(m.length&&a<=m[m.length-1][1])m[m.length-1][1]=Math.max(m[m.length-1][1],c);else m.push([a,c]);}return m.map(([x,y])=>'x '+Math.round(x)+'-'+Math.round(y)).join(', ');})()+')':'none'} |`);}MM.step(S);}
  md+=`## ${name}\n\n| Time | Arrival 5:00 | Attic HRR q | Hot layer T | Vent-limited | Stage | Eave smoke (Side A) | Fire at Side A eaves |\n|---|---|---|---|---|---|---|---|\n${rows.join('\n')}\n\nEvents:\n\n`;
  for(const e of S.events)if(KEY.test(e.msg))md+=`- ${mmss(e.t)}: ${e.msg}\n`;md+='\n';};
tl(M0,{},'BEFORE (live 05c26ab)');tl(M,{},'AFTER');tl(M,{u:.15},'AFTER, origin at the Side B end of the attic (u 0.15)');
fs.writeFileSync(OUT+'timeline.md',md);
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const shot=async(url,side,t,file,u)=>{const p=await br.newPage({viewport:{width:1280,height:900}});await p.goto(url);await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);
  await p.evaluate(async([t,u])=>{const z=window.__sizeup,M=z.M;await z.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'attic',fuel:'modern',preburn:t,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,actions:[],tNow:0,mode:'solo',atticU:u,companies:M.PRESETS.generic.companies()});z.A.playing=false;},[t,u]);
  await p.evaluate(s=>{window.__sizeup.setSide(s);window.__sizeup.syncUI();},side);await p.addStyleTag({content:'.toast{display:none!important}'});await p.waitForTimeout(3000);await p.locator('.slot .stage').screenshot({path:file});await p.close();};
 for(const [k,url] of [['before','file:///workspace/sizeup/tests/base/builds/pre-attic-05c26ab.html#noautoplay'],['after','file:///workspace/sizeup/index.html#noautoplay']]){
  for(const t of [5,5.5,8,10,12])await shot(url,'A',t*60,`${OUT}${k}-sideA-${t}min.png`);
  await shot(url,'A',15*60,`${OUT}${k}-sideA-15min.png`);await shot(url,'C',12*60,`${OUT}${k}-sideC-12min.png`);}
 await shot('file:///workspace/sizeup/index.html#noautoplay','A',11*60+30,`${OUT}after-sideA-11.5min-origin-sideB-end.png`,.15);
 // Oct 19 smoke fix: AJ's view (iPhone 390x844, setup Step 3, Side A, 5 min) and the drill at arrival; before = live f48ba13
 const OUT2='/workspace/sizeup/screens/attic-smoke-oct19/';fs.mkdirSync(OUT2,{recursive:true});const measure=require('./smoke-measure.js');
 const view=async(url,vp,u)=>{const ph=vp[0]<500;const p=await br.newPage({viewport:{width:vp[0],height:vp[1]},deviceScaleFactor:ph?3:1,isMobile:ph,hasTouch:ph});await p.goto(url);await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);await p.addStyleTag({content:'.toast{display:none!important}'});
  await p.evaluate(async u=>{const z=window.__sizeup,M=z.M;await z.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'attic',fuel:'modern',preburn:300,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,actions:[],tNow:0,mode:'solo',atticU:u,companies:M.PRESETS.generic.companies()});z.A.playing=false;},u);await p.waitForTimeout(3000);return p;};
 const step3=async p=>{await p.evaluate(()=>document.querySelector('#steps button[data-go="3"]').click());await p.waitForTimeout(3500);};
 const R={};
 for(const [k,url] of [['before','file:///workspace/sizeup/tests/base/builds/pre-smoke-f48ba13.html#noautoplay'],['after','file:///workspace/sizeup/index.html#noautoplay']]){
  for(const [vp,tag] of [[[390,844],'iphone'],[[1280,900],'desktop']]){const p=await view(url,vp);R[k+tag+'drill']=await measure(p);await p.screenshot({path:`${OUT2}${k}-${tag}-drill-arrival-5min.png`});
   await step3(p);R[k+tag+'setup']=await measure(p);await p.screenshot({path:`${OUT2}${k}-${tag}-setup-step3-5min.png`});if(tag==='iphone')await p.locator('.slot .stage').screenshot({path:`${OUT2}${k}-iphone-setup-step3-5min-stage.png`});await p.close();}}
 {const p=await view('file:///workspace/sizeup/index.html#noautoplay',[390,844],.15);R.afterU15=await measure(p);await step3(p);await p.locator('.slot .stage').screenshot({path:`${OUT2}after-iphone-setup-step3-5min-origin-sideB-end-stage.png`});await p.close();}
 const f=m=>`sky ${(m.sky.cov*100).toFixed(0)}% / roof ${(m.roof.cov*100).toFixed(0)}% covered, letterbox ${m.letterboxPx} px`;
 ok(R.beforeiphonesetup.letterboxPx>500&&R.beforeiphonesetup.sky.cov>.75,`before (live f48ba13) reproduces AJ's view: ${f(R.beforeiphonesetup)}`);
 for(const k of ['iphonesetup','iphonedrill','desktopsetup','desktopdrill']){const m=R['after'+k],m0=R['before'+k];
  ok(m.screen===(/setup/.test(k)?3:4)&&m.t===300,`${k}: same model time (5:00) in the setup preview and the drill`);
  ok(m.letterboxPx===0,`${k}: no smoke pixels outside the photo (${m.letterboxPx} of ${m.letterboxN} letterbox px)`);
  ok(m.sky.cov<=.65&&m.sky.mass<=m0.sky.mass*.5,`${k}: smoke above the ridge covers ${(m.sky.cov*100).toFixed(0)}% of the sky over the house (cap 65%; before ${(m0.sky.cov*100).toFixed(0)}%), smoke mass ${m.sky.mass.toFixed(0)} vs ${m0.sky.mass.toFixed(0)}`);
  ok(m.roof.cov<=.5,`${k}: roof face ${(m.roof.cov*100).toFixed(0)}% covered (cap 50%; before ${(m0.roof.cov*100).toFixed(0)}%), not a blanket`);
  ok(m.thirds[1]>1.8*Math.max(m.thirds[0],m.thirds[2]),`${k}: smoke heaviest over the origin (eave thirds B-end/centre/D-end ${m.thirds.map(x=>x.toFixed(0)).join('/')})`);}
 {const m=R.afterU15;ok(m.thirds[0]>2*m.thirds[2],`origin at the Side B end: heaviest over that end (thirds ${m.thirds.map(x=>x.toFixed(0)).join('/')})`);}
 fs.writeFileSync(OUT2+'metrics.json',JSON.stringify(R,null,1));
 // written reading in the drill and the size-up scoring at 5, 10 and 13 min (same reading as the picture)
 const TXT={};for(const t of [5,10,13]){const p=await view('file:///workspace/sizeup/index.html#noautoplay',[1280,900]);
  const r=await p.evaluate(async t=>{const z=window.__sizeup,M=z.M;await z.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'attic',fuel:'modern',preburn:t*60,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});z.A.playing=false;
   const T=z.truthCalls();const e=M.eavesVis(z.A.S,'A');z.A.calls={floor:T.floor,stage:T.stage.split('|')[0],vol:T.vol,vel:T.vel,den:T.den,col:T.col,fo:T.fo};z.A.locked=false;z.A.lockResult=null;z.syncUI&&z.syncUI();
   const btn=document.getElementById('lockBtn');if(btn)btn.click();const L=z.A.lockResult;return{text:z.smokeText(),T,e:{vol:e.vol,vel:e.vel,den:e.den,col:e.col},board:[...document.querySelectorAll('*')].some(n=>n.childElementCount===0&&n.textContent===z.smokeText()),rows:L&&L.rows.filter(x=>/Volume|Velocity|Density|Color/.test(x.k)).map(x=>[x.k,x.ok,x.truth])};},t);
  TXT[t]=r;await p.close();}
 ok(/^Moderate brown, moderate, moderate · pulsing · from soffit vents \(eaves\)(, ridge vent)?, heaviest near the middle of the roof$/.test(TXT[5].text),`5:00 text: "${TXT[5].text}"`);
 ok(/^Heavy brown, pressurized, thick · from soffit vents \(eaves\), roof vent/.test(TXT[10].text),`10:00 text: "${TXT[10].text}"`);
 ok(/^Very heavy brown, /.test(TXT[13].text)&&/roof vent/.test(TXT[13].text),`13:00 text: "${TXT[13].text}"`);
 for(const t of [5,10,13]){const r=TXT[t];ok(r.T.vol===r.e.vol&&r.T.vel===r.e.vel&&r.T.den===r.e.den,`${t}:00 size-up truth uses the same reading (vol ${r.T.vol}, vel ${r.T.vel}, den ${r.T.den})`);
  ok(r.board,`${t}:00 the board's Smoke line shows that text`);
  ok(r.rows&&r.rows.length===4&&r.rows.every(x=>x[1]===true),`${t}:00 calls matching the reading are scored correct (${r.rows&&r.rows.map(x=>x[0]+' '+x[2]).join(', ')})`);}
 {const S=mk(M);M.run(S,300);const g=M.gradeIRR(S,{unit:'E1',stories:2,constr:'wood',occ:'sfr',size:'medium',problem:'smoke',floor:'Attic',side:'A'});const c=g.rows.find(x=>x.k==='conditions');
  ok(c.st==='ok',`radio report "Smoke showing" from the attic at 5:00 is graded correct (${c.msg})`);}
 fs.writeFileSync(OUT2+'smoke-text.json',JSON.stringify(TXT,null,1));
 await br.close();console.log(`\nattic suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})();
