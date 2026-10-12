// Command fundamentals mode: node model tests + browser UI tests. Run: node command.js
const {chromium}=require('playwright-core');const fs=require('fs');
global.window={};const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c){pass++;}else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('\n# '+n);
const NOTE='not affiliated with, endorsed by, or a substitute for any commercial incident-command certification program';
function mk(o={}){const sc={sceneId:'house',origin:o.origin||'liv',fuel:'modern',preburn:o.preburn||360,openings:{},doors:{},occupant:o.occ||'none',wind:{dir:'calm',spd:0},glass:'fails',seed:o.seed||5,actions:[],tNow:0,
  companies:M.PRESETS.generic.companies(),command:o.off?undefined:{on:true,sub:{...(o.sub||{})},set:{...(o.set||{})},terms:o.terms||{}}};const S=M.create(BLD[o.b||'house'],sc);M.run(S,sc.preburn);return S;}
const act=(S,a)=>{M.act(S,{...a,t:S.t});M.step(S);};const tick=(S,n)=>{for(let i=0;i<n;i++)M.step(S);};const evs=(S,k)=>S.events.filter(e=>!k||e.kind===k);
(async()=>{
sec('model: mode off');
{const S=mk({off:true});ok(S.cmd===null,'no command state when off');act(S,{kind:'assign',co:'E2',task:'supply',to:'E1',mode:'forward'});ok(!evs(S,'note').some(e=>/can't direct/.test(e.msg)),'no gating when off');
 tick(S,1500);ok(evs(S).every(e=>e.kind!=='can'&&e.kind!=='cmd'),'no command events when off');}
sec('model: initial radio report graded against live truth and seen sides');
{const S=mk();const T=M.cmdTruth(S);ok(T.problem==='working'&&T.floor==='1'&&T.occ==='sfr'&&T.constr==='wood','truth: working fire floor 1, sfr, wood');
 const good={unit:'E1',stories:'2',constr:'wood',occ:'sfr',size:'medium',problem:'working',floor:'1',side:'A',task:'line',loc:'liv',obj:'fire',strategy:'Offensive',pos:'fast',name:'Main Street Command',cmdLoc:'Side A'};
 const g=M.gradeIRR(S,good);ok(g.score===6&&g.letter==='A','perfect report = 6/6 A ('+g.score+')');
 const bad=M.gradeIRR(S,{...good,problem:'nothing',unit:'E2',strategy:'Defensive',pos:'inv'});ok(bad.score<4,'wrong report scores low ('+bad.score+')');
 ok(bad.rows.find(r=>r.k==='conditions').st==='no','nothing showing on a working fire = no');
 ok(M.gradeIRR(S,{...good,problem:'smoke'}).rows.find(r=>r.k==='conditions').st==='mid','smoke showing on a working fire = partial');
 const S2=mk({preburn:180});const T2=M.cmdTruth(S2);ok(['smoke','nothing'].includes(T2.problem),'early: no fire visible yet ('+T2.problem+')');
 ok(M.seenSides(S).join()==='A','only Side A seen at arrival');act(S,{kind:'view',side:'C'});tick(S,40);ok(M.seenSides(S).includes('C'),'Side C counts after the walk');
 act(S,{kind:'irr',r:good,text:'x'});ok(S.cmd.irr&&S.cmd.irr.g.score===6,'irr action records the grade');ok(S.cmd.pos==='fast','irr sets the position');ok(S.strategy==='Offensive','irr sets the strategy');
 const S3=mk({preburn:480});ok(M.cmdTruth(S3).posFit.join()==='post','bigger fire: command post fits');ok(M.cmdTruth(mk({preburn:360})).posFit.includes('fast'),'one room: fast attack fits');}
sec('model: command position limits IC #1');
{const S=mk();act(S,{kind:'cmdpos',pos:'fast'});ok(M.cmdGated(S),'fast attack gates');
 act(S,{kind:'assign',co:'E1',task:'line',target:'liv'});ok(S.water.lines.some(l=>l.co==='E1'),'own company can be assigned');
 tick(S,100);act(S,{kind:'assign',co:'E2',task:'supply',to:'E1',mode:'forward'});ok(!S.tasks.some(t=>t.co==='E2'),'other company refused in fast attack');ok(evs(S,'note').some(e=>/can't direct Engine 2/.test(e.msg)),'refusal explained');
 ok(S.cmd.refused.length===1,'refusal logged for the debrief');act(S,{kind:'search',floor:'2'});ok(!S.searches.length,'quick orders gated too');
 act(S,{kind:'cmdpos',pos:'post'});ok(M.cmdGated(S),'still gated while walking out');const t0=S.t;tick(S,S.cmd.set.cmdSetup);ok(!M.cmdGated(S),'command post set up after cmdSetup ('+(S.t-t0)+'s)');
 const E1=M.coById(S,'E1');ok(M.freeCrew(S,E1)===E1.staff-M.crewUsed(S,E1)-1,'command-post officer not a crew member');
 act(S,{kind:'assign',co:'E2',task:'supply',to:'E1',mode:'forward'});ok(S.tasks.some(t=>t.co==='E2'),'after setup: other companies can be assigned');
 const Sf=mk({set:{fastOrders:1}});act(Sf,{kind:'cmdpos',pos:'fast'});tick(Sf,100);act(Sf,{kind:'assign',co:'E2',task:'supply',to:'E1',mode:'forward'});ok(Sf.tasks.some(t=>t.co==='E2'),'fastOrders=1 allows one order');
 const Sx=mk({sub:{pos:false}});act(Sx,{kind:'cmdpos',pos:'fast'});tick(Sx,100);act(Sx,{kind:'assign',co:'E2',task:'supply',to:'E1',mode:'forward'});ok(Sx.tasks.some(t=>t.co==='E2'),'position switch off: no gating');}
sec('model: TLO and CAN reports');
{const S=mk({set:{lowAir:120}});act(S,{kind:'cmdpos',pos:'post'});act(S,{kind:'assign',co:'E1',task:'line',target:'liv',loc:'Floor 1 Living',obj:'fire'});
 ok(S.cmd.tlo.length===1&&S.cmd.tlo[0].loc==='Floor 1 Living'&&S.cmd.tlo[0].given,'TLO recorded');ok(evs(S,'cmd').some(e=>/Engine 1 · Stretch a hoseline · Floor 1 Living · Fire control/.test(e.msg)),'TLO logged');
 tick(S,90);ok(S.cmd.cans.some(r=>r.co==='E1'&&r.kind==='status'),'status CAN when the line flows');
 tick(S,200);const pri=S.cmd.cans.find(r=>r.kind==='priority'&&/Low-air/.test(r.c));ok(S.cmd.cans.some(r=>r.kind==='priority'&&/Conditions worsening/.test(r.c)),'priority CAN when conditions worsen');ok(pri&&/Low-air/.test(pri.c)&&pri.need==='relief','priority CAN on low air: '+(pri&&pri.c));
 act(S,{kind:'canreq',co:'E1'});const rq=S.cmd.cans[S.cmd.cans.length-1];ok(rq.kind==='request'&&/Living/.test(rq.c),'on-request CAN with conditions at the line');
 act(S,{kind:'canack',id:pri.id});ok(pri.ack===S.t-1||pri.ack!=null,'acknowledged');
 tick(S,30);act(S,{kind:'assign',co:'E2',task:'line',target:'kit'});ok(S.cmd.cans.some(r=>r.need&&r.need!=='assign'&&r.acted!=null),'a stated need answered by a line assignment');}
sec('model: benchmarks checked against model truth');
{const S=mk();act(S,{kind:'cmdpos',pos:'post'});act(S,{kind:'bench',k:'uc'});ok(S.cmd.bench[0].ok===false,'early under control = not true');
 ok(!evs(S,'control').length,'no automatic under-control event in this mode');ok(S.cmd.par.due.length===1,'PAR due after a benchmark');
 act(S,{kind:'assign',co:'E1',task:'line',target:'liv'});act(S,{kind:'assign',co:'L1',task:'search1',floor:'1'});tick(S,700);
 ok(S.underControl!=null&&S.cmd.ucAuto!=null,'model sees under control internally');act(S,{kind:'bench',k:'uc'});ok(S.cmd.bench[S.cmd.bench.length-1].ok,'declared after knockdown = true');
 act(S,{kind:'bench',k:'allclear',floor:'1'});ok(S.cmd.bench.find(b=>b.k==='allclear').ok,'all clear floor 1 true after search');act(S,{kind:'bench',k:'allclear',floor:'2'});ok(S.cmd.bench.filter(b=>b.k==='allclear')[1].ok===false,'floor 2 not searched = false');
 tick(S,200);ok(S.cmd.lsAuto!=null,'loss stopped seen by the model');act(S,{kind:'bench',k:'ls'});ok(S.cmd.bench.find(b=>b.k==='ls').ok,'loss stopped true');}
sec('model: PAR and strategy check');
{const S=mk({set:{parEvery:300,stratEvery:200}});tick(S,201);ok(S.cmd.strat.due,'strategy check due at 200s');act(S,{kind:'stratcheck',v:'Offensive'});ok(S.cmd.strat.checks.length===1&&S.strategy==='Offensive','check answered');
 tick(S,100);ok(S.cmd.par.due.some(d=>d.why==='elapsed-time'),'timed PAR due');act(S,{kind:'par'});tick(S,31);ok(evs(S,'cmd').some(e=>/PAR complete/.test(e.msg)),'PAR completes after parTime');
 act(S,{kind:'strategy',v:'Defensive'});ok(S.cmd.par.due.some(d=>d.why==='strategy change'),'PAR after strategy change');}
sec('model: command transfer');
{const S=mk();act(S,{kind:'cmdpos',pos:'fast'});act(S,{kind:'xfer',step:'look'});ok(!S.cmd.xfer.steps.length,'no transfer before chief arrives');tick(S,160);ok(S.cmd.xfer.avail!=null,'chief arrival prompt');
 for(const st of ['look','contact','progress','confirm'])act(S,{kind:'xfer',step:st,how:'f2f'});ok(M.cmdGated(S),'still gated before announce');act(S,{kind:'xfer',step:'announce'});
 ok(S.cmd.xfer.done&&S.cmd.ic==='BC1'&&!M.cmdGated(S),'after announce: BC1 in command, limits lifted');ok(S.cmd.cans.some(r=>r.co==='E1'&&r.kind==='request'),'progress report generated a CAN');}
sec('model: export/replay determinism');
{const a=[{t:5,kind:'irr',r:{unit:'E1',pos:'fast',strategy:'Offensive'},text:'x'},{t:10,kind:'assign',co:'E1',task:'line',target:'liv',obj:'fire',loc:'Living'},{t:20,kind:'assign',co:'E2',task:'supply',to:'E1',mode:'forward'},{t:120,kind:'cmdpos',pos:'post'},{t:300,kind:'bench',k:'uc'},{t:400,kind:'canreq',co:'E1'}];
 const go=()=>{const S=mk();const S0=M.create(BLD.house,S.scn);M.run(S0,360);for(const x of a)M.act(S0,{...x,t:360+x.t});M.run(S0,1500);return JSON.stringify([S0.events,S0.cmd]);};ok(go()===go(),'two runs identical');}

/* ---------------- browser ---------------- */
const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const URL='file:///workspace/sizeup/index.html#noautoplay';
async function page(vp){const p=await br.newPage({viewport:vp||{width:1280,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.errs=errs;await p.goto(URL);await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);return p;}
async function drill(p,o={}){await p.evaluate(async o=>{const M=window.__sizeup.M;await window.__sizeup.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'liv',fuel:'modern',preburn:o.preburn||360,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,actions:[],tNow:0,mode:o.mode||'solo',hideAnswers:!!o.hide,
  companies:M.PRESETS.generic.companies(),...(o.off?{}:{command:{on:true,sub:{...(o.sub||{})},set:{...(o.set||{})},terms:{}}})});window.__sizeup.A.playing=false;window.__sizeup.syncUI();},o);await p.waitForTimeout(150);}
const adv=(p,n)=>p.evaluate(n=>{const u=window.__sizeup;const ne=u.advance(n);u.syncUI();u.renderBoard();return ne.length;},n);
const vis=(p,s)=>p.evaluate(s=>{const e=document.querySelector(s);return !!e&&!e.hidden&&e.offsetParent!==null;},s);
sec('browser: mode off = as before');
{const p=await page();await drill(p,{off:true});ok(!await vis(p,'#irrBox')&&!await vis(p,'#cmdCard')&&!await vis(p,'#canCard'),'no command UI');ok(await vis(p,'#radio'),'free-text radio box shown');ok(!p.errs.length,'no errors '+p.errs.join());await p.close();}
sec('browser: setup toggle and sub-switches');
{const p=await page();await p.click('[data-sample="house"]');await p.waitForTimeout(300);
 await p.evaluate(()=>{const u=window.__sizeup;u.A.originSet=true;u.syncUI();});await p.click('#toDial');await p.waitForTimeout(200);
 await p.click('#setupTabs [data-tab="cmd"]');await p.waitForTimeout(100);ok(await vis(p,'#cmdSetup [data-cf="on"]'),'Command tab with toggle');
 ok((await p.textContent('#cmdSetup')).toLowerCase().includes(NOTE),'non-affiliation note text exact');ok(!/blue card/i.test(await p.textContent('body')),'no Blue Card name in the UI');
 ok(/Off/.test(await p.textContent('#cmdSetup [data-cf="on"]')),'off by default');await p.click('#cmdSetup [data-cf="on"]');ok(/Command fundamentals: On/.test(await p.textContent('#cmdSetup [data-cf="on"]')),'toggle on');
 await p.click('#cmdSetup [data-cf="sub:can"]');ok(await p.evaluate(()=>window.__sizeup.A.scn.command.sub.can===false),'sub-switch writes scenario');await p.click('#cmdSetup [data-cf="sub:can"]');
 await p.evaluate(()=>{document.querySelectorAll('#cmdSetup details').forEach(d=>d.open=true);});await p.fill('[data-cfset="parEvery"]','600');await p.dispatchEvent('[data-cfset="parEvery"]','change');ok(await p.evaluate(()=>window.__sizeup.A.S.cmd.set.parEvery===600),'teaching value applies to the drill');
 await p.fill('[data-cfterm="pos.post"]','Command mode');await p.dispatchEvent('[data-cfterm="pos.post"]','change');ok(await p.evaluate(()=>window.__sizeup.A.S.cmd.terms.pos.post==='Command mode'),'department term applies');
 await p.click('#setupTabs [data-tab="disp"]');await p.fill('#presetName','Dept A');await p.click('#presetSave');
 ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('sizeup-presets-v1'))['Dept A'].command.terms.pos.post==='Command mode'),'preset saves the command config');
 await p.evaluate(()=>{const c=window.__sizeup.A.scn.command;c.terms={};c.on=false;});await p.selectOption('#presetSel','custom:Dept A');await p.waitForTimeout(100);
 ok(await p.evaluate(()=>window.__sizeup.A.scn.command.on&&window.__sizeup.A.scn.command.terms.pos.post==='Command mode'),'preset load restores command config');
 await p.click('#toBoard');await p.waitForTimeout(300);ok(await vis(p,'#irrBox')&&!await vis(p,'#radioWrap'),'board: radio box becomes the builder');ok(/Command mode/.test(await p.textContent('#irrBox')),'custom term used in the builder');ok(!p.errs.length,'no errors '+p.errs.join());await p.close();}
sec('browser: guided radio report');
{const p=await page();await drill(p);ok((await p.$$('#irrBox .cf-rchip')).length===6,'six step chips');
 const pick=async(k,v)=>{await p.click(`#irrBox [data-irr="${k}"][data-v="${v}"]`);};const sel=async(k,v)=>{await p.selectOption(`#irrBox [data-irrs="${k}"]`,v);};
 await pick('stories','2');await sel('constr','wood');await sel('occ','sfr');await sel('size','medium');await pick('problem','working');await pick('floor','1');await pick('side','A');
 await sel('task','line');await sel('loc','liv');await pick('strategy','Offensive');await pick('pos','fast');await sel('name','Main Street Command');await sel('cmdLoc','Side A');
 ok((await p.$$('#irrBox .cf-rchip.g')).length===6,'all six chips green');const txt=await p.textContent('#irrText');ok(/Engine 1 on scene\. Two-story wood frame single-family residential/.test(txt)&&/Working fire from floor 1, Side A/.test(txt)&&/Main Street Command/.test(txt),'assembled text: '+txt.slice(0,160));
 await p.click('#irrBox [data-irr="problem"][data-v="nothing"]');ok(/ck no|cf-ck no/.test(await p.innerHTML('#irr-conditions'))||(await p.$('#irr-conditions .cf-ck.no'))!==null,'live check flags a wrong condition');await p.click('#irrBox [data-irr="problem"][data-v="working"]');
 await p.fill('#irrFree','Hydrant at Elm');ok(/Hydrant at Elm/.test(await p.textContent('#irrText')),'free text appended');
 await p.click('#irrSend');await p.waitForTimeout(100);const st=await p.evaluate(()=>{const C=window.__sizeup.A.S.cmd;return{s:C.irr&&C.irr.g.score,pos:C.pos,tlo:C.tlo.length,line:window.__sizeup.A.S.water.lines.length};});
 ok(st.s===6&&st.pos==='fast','report transmitted and graded');ok(st.tlo===1&&st.line===1,'report task became E1\'s first TLO assignment');ok(/Sent at T\+/.test(await p.textContent('#irrBox')),'sent summary shown');
 await p.click('#irrUpd');ok(await vis(p,'#irrSend'),'can give an updated report');ok(!p.errs.length,'no errors '+p.errs.join());await p.close();}
sec('browser: hidden answers hide the checks');
{const p=await page();await drill(p,{hide:true});ok(!(await p.$('#irrBox .cf-ck'))&&/Checks hidden/.test(await p.textContent('#irrBox')),'checks hidden');await p.close();}
sec('browser: board command features');
{const p=await page();await drill(p);await p.click('#cmdCard [data-cpos="fast"]');await p.waitForTimeout(80);ok(/can direct only Engine 1/.test(await p.textContent('#cmdCard')),'fast attack note');
 await adv(p,100);await p.selectOption('#coList .corow2[data-co="E2"] .co-task','supply');await p.waitForTimeout(80);await p.click('#coList .corow2[data-co="E2"] .co-go');await p.waitForTimeout(80);
 ok(await p.evaluate(()=>!window.__sizeup.A.S.tasks.some(t=>t.co==='E2')),'gated in the UI');
 await p.click('#cmdCard [data-cpos="post"]');await adv(p,61);
 await p.selectOption('#coList .corow2[data-co="L1"] .co-task','search1');await p.waitForTimeout(80);ok(await vis(p,'#coList .corow2[data-co="L1"] .co-obj'),'objective picker in the company row');
 ok(/primary search/i.test(await p.textContent('#coList .corow2[data-co="L1"] .co-tlo')),'TLO preview');await p.selectOption('#coList .corow2[data-co="L1"] .co-obj','life');
 await adv(p,30);await p.selectOption('#coList .corow2[data-co="L1"] .co-task','search1');await p.waitForTimeout(80);await p.selectOption('#coList .corow2[data-co="L1"] .co-tgt','1');await p.selectOption('#coList .corow2[data-co="L1"] .co-obj','life');await p.waitForTimeout(80);await p.click('#coList .corow2[data-co="L1"] .co-go');await p.waitForTimeout(80);
 const tl=await p.evaluate(()=>window.__sizeup.A.S.cmd.tlo.slice(-1)[0]);ok(tl&&tl.co==='L1'&&tl.obj==='life'&&/Floor/.test(tl.loc),'TLO from the company row: '+JSON.stringify(tl));
 ok(await vis(p,'#canCard'),'CAN card shown');await p.selectOption('#canCo','E2');await p.click('#canReq');await p.waitForTimeout(80);ok((await p.$$('#canCard .cf-can')).length>=1,'CAN on request shown');
 const n0=(await p.$$('#canCard [data-ack]')).length;await p.click('#canCard [data-ack]');await p.waitForTimeout(80);ok((await p.$$('#canCard [data-ack]')).length===n0-1,'acknowledge');
 await p.click('#cmdCard [data-bench="uc"]');await p.waitForTimeout(80);ok(!await p.evaluate(()=>document.querySelector('#ucBanner').classList.contains('show')),'early declare does not open the under-control banner');
 ok(/PAR due/.test(await p.textContent('#cmdCard')),'PAR due after the benchmark');await p.click('#cfPar');await adv(p,31);ok(/PAR complete/.test(await p.evaluate(()=>window.__sizeup.A.S.events.map(e=>e.msg).join('|'))),'PAR completes');
 ok(!/Hint:/.test(await p.textContent('#cmdCard')),'no hints when hints off');ok(!p.errs.length,'no errors '+p.errs.join());await p.close();}
sec('browser: under control declared by the IC; hints only when on');
{for(const hints of [false,true]){const p=await page();await drill(p,{sub:{hints}});await p.click('#cmdCard [data-cpos="post"]');
 await p.evaluate(()=>{const u=window.__sizeup;u.order({kind:'assign',co:'E1',task:'line',target:'liv'});});await adv(p,700);
 ok(await p.evaluate(()=>window.__sizeup.A.S.underControl!=null),'model fire out');ok(!await p.evaluate(()=>document.querySelector('#ucBanner').classList.contains('show')),'no banner until declared (hints '+hints+')');
 ok(/Hint: the model shows no room still burning/.test(await p.textContent('#cmdCard'))===hints,'hint '+(hints?'shown':'hidden'));
 await p.click('#cmdCard [data-bench="uc"]');await p.waitForTimeout(100);ok(await p.evaluate(()=>document.querySelector('#ucBanner').classList.contains('show')),'banner after a true declaration');ok(/Under control declared/.test(await p.textContent('#ucT')),'banner text');await p.close();}}
sec('browser: strategy check, 360 prompt and transfer');
{const p=await page();await drill(p,{set:{stratEvery:120}});await p.click('#cmdCard [data-cpos="fast"]');await adv(p,121);ok(/Strategy check due/.test(await p.textContent('#cmdCard')),'strategy check due');await p.click('#cmdCard [data-strat="Offensive"]');ok(await p.evaluate(()=>window.__sizeup.A.S.cmd.strat.checks.length===1),'answered');
 await p.evaluate(()=>window.__sizeup.setSide('C'));await p.waitForTimeout(80);ok(/360 under way|360 done/.test(await p.textContent('#cmdCard')),'360 follow-up prompt');await p.evaluate(()=>window.__sizeup.setSide('A'));
 await adv(p,40);ok(/Battalion 1 on scene: transfer command\?|on scene: transfer command/.test(await p.textContent('#cmdCard')),'transfer prompt when the chief arrives');
 const t0=await p.evaluate(()=>window.__sizeup.A.S.t);await p.click('#cmdCard [data-xfer="look"]');await p.click('#cmdCard [data-xfer="contact"][data-how="f2f"]');await p.click('#cmdCard [data-xfer="progress"]');await p.click('#cmdCard [data-xfer="confirm"]');await p.click('#cmdCard [data-xfer="announce"]');await p.waitForTimeout(80);
 const r=await p.evaluate(()=>{const S=window.__sizeup.A.S;return{dt:S.t,ic:S.cmd.ic,done:S.cmd.xfer.done,steps:S.cmd.xfer.steps.map(s=>s.step).join()};});const C=M.CMD_SET;
 ok(r.ic==='BC1'&&r.done&&r.steps==='look,contact,progress,confirm,announce','guided transfer steps');ok(r.dt-t0>=C.xLook+C.xF2F+C.xProgress+C.xConfirm+C.xAnnounce-5,'transfer uses drill time ('+(r.dt-t0)+'s)');ok(/Command transferred/.test(await p.textContent('#cmdCard')),'transferred shown');
 ok(/in command/.test(await p.textContent('#coList .corow2[data-co="BC1"] .cometa')),'chief row shows in command');ok(!p.errs.length,'no errors '+p.errs.join());await p.close();}
sec('browser: CAN priority and assign from the report');
{const p=await page();await drill(p,{set:{lowAir:60}});await p.click('#cmdCard [data-cpos="post"]');await p.evaluate(()=>window.__sizeup.order({kind:'assign',co:'E1',task:'line',target:'liv'}));await adv(p,180);
 ok((await p.$$('#canCard .cf-can.pri')).length>=1,'priority report card');await p.click('#canCard .cf-can.pri [data-canas]');await p.waitForTimeout(300);
 ok(await p.evaluate(()=>{const r=document.querySelector('#coList .cf-flash');return !!r&&r.querySelector('.co-task').value==='line';}),'assign jumps to a company with the task preselected');await p.close();}
sec('browser: command debrief');
{const p=await page();await drill(p);await p.evaluate(()=>{const u=window.__sizeup;u.order({kind:'irr',r:{unit:'E1',pos:'fast',strategy:'Offensive',problem:'working',floor:'1'},text:'E1 on scene'});u.order({kind:'assign',co:'E1',task:'line',target:'liv',obj:'fire',loc:'Living'});});await adv(p,600);
 await p.click('#cmdCard [data-bench="uc"]');await p.click('#finishBtn');await p.waitForTimeout(300);const t=await p.textContent('#mBody');
 ok(/Command scorecard/.test(t),'scorecard');for(const f of ['Assume, confirm and position command','Situation evaluation','Communications','Deployment management','Strategy and incident action plan','Organization','Review, evaluate and revise','Continue, transfer and end command'])ok(t.includes(f),'function: '+f);
 ok(/Brunacini/.test(t)&&/Fire Command/.test(t),'cites Brunacini Fire Command');ok(/SizeUp teaching values/.test(t),'weights labeled teaching values');ok(/Initial radio report/.test(t)&&/of 6 steps matched/.test(t),'radio report grade');
 ok((await p.$$('#mBody svg.cf-tl'))[0]!=null,'benchmark timeline');ok(/Under control/.test(await p.textContent('#mBody svg.cf-tl')),'timeline lists the declaration');
 const sc=await p.evaluate(()=>window.__sizeup.cmdScore());ok(sc.total>=0&&sc.total<=100&&Object.keys(sc.R).length===8,'score 0-100 over 8 functions ('+sc.total+')');ok(!p.errs.length,'no errors '+p.errs.join());await p.close();}
sec('browser: export / replay');
{const p=await page();await drill(p);await p.evaluate(()=>{const u=window.__sizeup;u.order({kind:'cmdpos',pos:'fast'});u.order({kind:'assign',co:'E1',task:'line',target:'liv',obj:'fire',loc:'Living'});});await adv(p,120);
 await p.evaluate(()=>{const u=window.__sizeup;u.order({kind:'cmdpos',pos:'post'});u.A.scn.command.terms={pos:{post:'Dept CP'}};u.rebuild();});await adv(p,200);await p.evaluate(()=>{window.__sizeup.order({kind:'bench',k:'uc'});window.__sizeup.order({kind:'canreq',co:'E1'});});await adv(p,30);
 const a=await p.evaluate(()=>{const u=window.__sizeup;return{o:u.scenarioObj(false),ev:JSON.stringify(u.A.S.events),c:JSON.stringify(u.A.S.cmd)};});
 const q=await page();await q.evaluate(async o=>{await window.__sizeup.loadScenario(o);window.__sizeup.A.playing=false;},a.o);const b=await q.evaluate(()=>({ev:JSON.stringify(window.__sizeup.A.S.events),c:JSON.stringify(window.__sizeup.A.S.cmd)}));
 ok(a.o.command&&a.o.command.on&&a.o.command.terms.pos.post==='Dept CP','export carries the command config');ok(a.ev===b.ev,'replayed events identical');ok(a.c===b.c,'replayed command state identical');
 const h=await p.evaluate(()=>{const u=window.__sizeup;return u.scenarioHTML(u.scenarioObj(false));});ok(/"command":\{"on":true/.test(h),'HTML export embeds it');await p.close();await q.close();}
sec('browser: crew mode');
{const p=await page();await drill(p,{mode:'crew'});ok(await vis(p,'#irrBox')&&await vis(p,'#cmdCard'),'command UI in crew mode');ok(!await vis(p,'#callsCard'),'solo-only calls hidden in crew mode');ok(!p.errs.length,'no errors');await p.close();}
sec('browser: mobile 390px');
{const p=await page({width:390,height:844});await drill(p);await p.click('#cmdCard [data-cpos="fast"]');await adv(p,160);await p.evaluate(()=>window.__sizeup.order({kind:'canreq',co:'E1'}));await p.waitForTimeout(100);
 const ov=await p.evaluate(()=>{const W=document.documentElement.clientWidth;const bad=[...document.querySelectorAll('#irrBox *,#cmdCard *,#canCard *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.right>W+1;}).map(e=>e.className||e.tagName);return{sw:document.documentElement.scrollWidth,W,bad:bad.slice(0,5)};});
 ok(ov.sw<=ov.W&&!ov.bad.length,'no horizontal overflow at 390px '+JSON.stringify(ov));
 const tap=await p.evaluate(()=>[...document.querySelectorAll('#irrBox .cf-opt,#cmdCard button')].filter(b=>b.offsetParent&&b.getBoundingClientRect().height<34).length);ok(tap===0,'tap targets at least 34px');
 await p.click('#finishBtn');await p.waitForTimeout(300);const dov=await p.evaluate(()=>document.querySelector('.modal .box').scrollWidth<=document.querySelector('.modal .box').clientWidth+1);ok(dov,'debrief fits at 390px');await p.close();}
sec('browser: mode off matches the Phase 1 build (UI flow)');
{const flow=async url=>{const p=await br.newPage({viewport:{width:1280,height:900}});await p.goto(url);await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);
  await p.evaluate(async()=>{const M=window.__sizeup.M;await window.__sizeup.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'kit',fuel:'modern',preburn:300,openings:{},doors:{},occupant:'random',wind:{dir:'B',spd:15},glass:'fails',seed:77,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});window.__sizeup.A.playing=false;});
  await p.selectOption('#coList .corow2[data-co="E1"] .co-task','line');await p.waitForTimeout(60);await p.click('#coList .corow2[data-co="E1"] .co-go');
  await p.evaluate(()=>{const u=window.__sizeup;u.advance(100);u.order({kind:'assign',co:'E2',task:'supply',to:'E1',mode:'forward'});u.advance(100);u.setSide('C');u.order({kind:'search',floor:'2'});u.advance(600);u.syncUI();});
  await p.click('#finishBtn');await p.waitForTimeout(300);const r=await p.evaluate(()=>({ev:window.__sizeup.A.S.events.map(e=>e.t+e.kind+e.msg).join('\n'),sum:window.__sizeup.summary().join('\n'),db:document.querySelector('#mBody').innerText}));await p.close();return r;};
 const a=await flow('file:///tmp/basebuild/index.html#noautoplay'),b=await flow(URL);ok(a.ev===b.ev,'same events as Phase 1');ok(a.sum===b.sum,'same summary as Phase 1');ok(a.db===b.db,'same debrief as Phase 1');}
await br.close();console.log(`\ncommand suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})().catch(e=>{console.error(e);process.exit(1);});
