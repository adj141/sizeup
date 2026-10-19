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
 await br.close();console.log(`\nattic suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})();
