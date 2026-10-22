const {chromium}=require('playwright-core');const OUT='/workspace/sizeup/screens/command/';
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});require('./ui-reveal.js')(br);
async function setup(vp){const p=await br.newPage({viewport:vp,deviceScaleFactor:vp.width<500?2:1});p.on('pageerror',e=>console.log('ERR',e.message));await p.goto('file:///workspace/sizeup/index.html#noautoplay');await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);
 await p.evaluate(async()=>{const M=window.__sizeup.M;await window.__sizeup.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'liv',fuel:'modern',preburn:360,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies(),command:{on:true,sub:{},set:{},terms:{}}});window.__sizeup.A.playing=false;});
 await p.waitForTimeout(400);return p;}
const adv=(p,n)=>p.evaluate(n=>{const u=window.__sizeup;const ne=u.advance(n);if(ne.length)u.A.latest=ne.map(e=>e.msg);u.syncUI();u.renderBoard();},n);
const hideToast=p=>p.addStyleTag({content:'.toast{display:none!important}'+(p.viewportSize().width>500?'.topbar{position:static!important}':'')});
const shotEl=async(p,sel,name)=>{await p.evaluate(s=>{const u=window.__sizeup;if(u.reveal)u.reveal(s);document.querySelector(s).scrollIntoView({block:'center'});},sel);await p.waitForTimeout(250);await p.locator(sel).screenshot({path:OUT+name});};
async function fillIRR(p,full){const pick=(k,v)=>p.click(`#irrBox [data-irr="${k}"][data-v="${v}"]`),sel=(k,v)=>p.selectOption(`#irrBox [data-irrs="${k}"]`,v);
 await pick('stories','2');await sel('constr','wood');await sel('occ','sfr');await sel('size','medium');await pick('problem','smoke');await pick('floor','1');await pick('side','A');await sel('task','line');await sel('loc','liv');await pick('strategy','Offensive');
 if(full){await pick('problem','working');await pick('pos','fast');await sel('name','Main Street Command');await sel('cmdLoc','Side A');await sel('res','none');}}
// 01 radio builder (mid-way: conditions flagged amber, position not chosen yet)
{const p=await setup({width:1440,height:1100});await hideToast(p);await fillIRR(p,false);await p.fill('#irrFree','Hydrant at the corner of Elm.');await p.click('#irrBox [data-irr="pos"][data-v="fast"]');await shotEl(p,'#irrBox','01-radio-builder.png');
 // 02 board with command features
 await p.click('#irrBox [data-irr="problem"][data-v="working"]');await p.selectOption('#irrBox [data-irrs="name"]','Main Street Command');await p.selectOption('#irrBox [data-irrs="cmdLoc"]','Side A');await p.click('#irrSend');await adv(p,95);
 await p.click('#cmdCard [data-cpos="post"]');await adv(p,62);
 await p.evaluate(()=>{const u=window.__sizeup;u.order({kind:'assign',co:'E2',task:'supply',to:'E1',mode:'forward',obj:'water',loc:'Side A'});u.order({kind:'canack',id:1});});await adv(p,40);
 await p.evaluate(()=>{const u=window.__sizeup;u.order({kind:'assign',co:'L1',task:'search1',floor:'1',obj:'life',loc:'Floor 1'});});await adv(p,10);
 await p.click('#coList .corow2[data-co="E3"] .cohead');await p.click('#coList .corow2[data-co="E3"] [data-k="line"]');await p.waitForTimeout(100);
 await p.evaluate(()=>{const S=window.__sizeup.A.S;for(const r of S.cmd.cans)if(r.ack==null&&r.kind!=='priority'&&r.id<S.cmd.canN-2)window.__sizeup.order({kind:'canack',id:r.id});});await adv(p,2);
 await shotEl(p,'#cmdCard','02-board-command.png');
 await p.evaluate(()=>window.__sizeup.order({kind:'canreq',co:'E2'}));await adv(p,1); await shotEl(p,'#canCard','03-can-reports.png');
 await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(200);await p.screenshot({path:OUT+'02b-board-overview.png'});
 // 04 transfer (mid-way)
 await p.click('#cmdCard [data-xfer="look"]');await p.click('#cmdCard [data-xfer="contact"][data-how="f2f"]');await adv(p,1);
 await shotEl(p,'#cmdCard','04-transfer.png');
 await p.click('#cmdCard [data-xfer="progress"]');await p.click('#cmdCard [data-xfer="confirm"]');await p.click('#cmdCard [data-xfer="announce"]');
 // finish: RIT, 360, follow-up, benchmarks
 await p.evaluate(()=>{const u=window.__sizeup;u.order({kind:'assign',co:'R1',task:'rit',obj:'ffs',loc:'Side A'});u.order({kind:'par'});});await adv(p,60);
 await p.evaluate(()=>{const u=window.__sizeup;u.setSide('B');u.setSide('C');u.setSide('D');u.setSide('A');});await adv(p,240);
 await p.evaluate(()=>{const u=window.__sizeup,S=u.A.S;if(S.cmd.strat.due)u.order({kind:'stratcheck',v:'Offensive'});u.order({kind:'bench',k:'allclear',floor:'1'});u.order({kind:'par'});});await adv(p,200);
 await p.evaluate(()=>{const u=window.__sizeup,S=u.A.S;if(S.cmd.strat.due)u.order({kind:'stratcheck',v:'Offensive'});u.order({kind:'bench',k:'uc'});});await adv(p,180);
 await p.evaluate(()=>{const u=window.__sizeup,S=u.A.S;u.order({kind:'bench',k:'ls'});for(const r of S.cmd.cans)if(r.ack==null)u.order({kind:'canack',id:r.id});});
 await p.click('#finishBtn');await p.waitForTimeout(500);await p.evaluate(()=>document.querySelector('.modal .box').scrollTop=0);await p.screenshot({path:OUT+'05-debrief.png'});
 console.log(JSON.stringify(await p.evaluate(()=>{const S=window.__sizeup.A.S;return{t:S.t-S.tArr,bench:S.cmd.bench,uc:S.underControl,score:window.__sizeup.cmdScore().total};})));await p.close();}
// 06 mobile
{const p=await setup({width:390,height:844});await hideToast(p);await fillIRR(p,true);await p.click('#irrSend');await adv(p,160);await p.evaluate(()=>window.__sizeup.order({kind:'canreq',co:'E1'}));await adv(p,1);
 await p.evaluate(()=>document.querySelector('#cmdCard').scrollIntoView({block:'start'}));await p.evaluate(()=>window.scrollBy(0,-70));await p.waitForTimeout(250);await p.screenshot({path:OUT+'06-mobile.png'});await p.evaluate(()=>document.querySelector('#irrBox').scrollIntoView({block:'start'}));await p.evaluate(()=>window.scrollBy(0,-70));await p.waitForTimeout(200);await p.screenshot({path:OUT+'06b-mobile-report.png'});await p.close();}
await br.close();})();
