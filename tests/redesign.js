// Oct 21 iOS-style redesign: layout, reachability and What's New checks. Run: node redesign.js (runall.sh rewrites the path)
const {chromium}=require('playwright-core');
const URL0='file:///workspace/sizeup/index.html';const URL=URL0+'#noautoplay';
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL: '+m);}};const sec=t=>console.log('\n# '+t);
const PH={width:390,height:844};
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});require('./ui-reveal.js')(br);
async function page(vp,url,o={}){const ph=(vp||PH).width<500;const ctx=await br.newContext({viewport:vp||PH,deviceScaleFactor:o.dsf||(ph?3:1),isMobile:ph,hasTouch:ph});const p=await ctx.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.errs=errs;p.ctx=ctx;
  await p.goto(url||URL);await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);await p.addStyleTag({content:'.toast{display:none!important}'});return p;}
const drill=(p,o={})=>p.evaluate(async o=>{const z=window.__sizeup,M=z.M;await z.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'br2',fuel:'modern',preburn:300,openings:{},doors:{},occupant:'random',wind:{dir:'calm',spd:0},glass:'fails',seed:7,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies(),...(o.cmd?{command:{on:true,sub:{},set:{},terms:{}}}:{})});z.A.playing=false;z.syncUI();},o);
const m=p=>p.evaluate(()=>{const vis=e=>e&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
  const scr=document.querySelector('.screen.on');const words=t=>(t.match(/[A-Za-z0-9][\w’'.+/-]*/g)||[]).length;
  let root=scr;if(scr.id==='s4')root=document.querySelector('.pane.on');const nav=document.querySelector('.topbar').innerText;
  return{scrollH:+(document.scrollingElement.scrollHeight/innerHeight).toFixed(2),words:words(root.innerText)+words(nav)-[...root.querySelectorAll('select')].filter(vis).reduce((n,x)=>n+words(x.innerText)-words((x.selectedOptions[0]||{text:''}).text),0),hov:document.scrollingElement.scrollWidth>innerWidth+1};});
const toS=async(p,n)=>{await p.evaluate(n=>{const z=window.__sizeup;z.A.originSet=true;z.A.maxScreen=Math.max(z.A.maxScreen,n);z.show(n);},n);await p.waitForTimeout(250);};
sec('phone: one primary action per screen, short screens, few words');
{const p=await page();await p.click('[data-sample="house"]');await p.waitForTimeout(300);
 await p.evaluate(()=>window.__sizeup.show(1));let r=await m(p);ok(r.scrollH<=1.5,'start fits 1.5 screens ('+r.scrollH+')');ok(r.words<=60,'start: under 60 words ('+r.words+')');ok(!r.hov,'start: no sideways scroll');
 ok(await p.evaluate(()=>[...document.querySelectorAll('#s1 .cta')].filter(e=>e.getClientRects().length).length===1),'start: one primary button');
 ok(/Version \d{4}\.\d\d\.\d\d/.test(await p.textContent('#verStart')),'start: version label');
 await toS(p,2);r=await m(p);ok(r.scrollH<=1.5,'fire origin fits 1.5 screens ('+r.scrollH+')');ok(r.words<=45,'fire origin: under 45 words ('+r.words+')');
 await toS(p,3);r=await m(p);ok(r.scrollH<=1.5,'conditions fits 1.5 screens ('+r.scrollH+')');ok(r.words<=100,'conditions: under 100 words ('+r.words+')');ok(!r.hov,'conditions: no sideways scroll');
 ok(await p.evaluate(()=>[...document.querySelectorAll('#s3 .cta')].filter(e=>e.getClientRects().length).length===1),'conditions: one primary button');
 for(const t of ['arr','open','idoor','wx','disp','times','cmd']){await p.click(`#tab-cond [data-tab="${t}"]`);await p.waitForTimeout(120);
   const v=await p.evaluate(t=>{const e=document.querySelector('#tab-'+t);const r=e.getBoundingClientRect();return e.classList.contains('on')&&r.width>300&&getComputedStyle(e).position==='fixed';},t);ok(v,`conditions: ${t} opens as a full page`);
   await p.click(`#tab-${t} .dnav .back`);await p.waitForTimeout(80);ok(await p.evaluate(()=>document.querySelector('#tab-cond').classList.contains('on')),`conditions: back from ${t}`);}
 await p.click('#tab-cond [data-tab="arr"]');await p.click('#tab-arr [data-key="preburn"] [data-v="480"]');ok(await p.evaluate(()=>window.__sizeup.A.scn.preburn===480),'arrival page sets the time since ignition');await p.click('#tab-arr .dnav .back');
 ok(/8 min/.test(await p.textContent('#vPre')),'arrival row shows the value');
 await p.click('#navPreview');await p.waitForTimeout(100);ok(await p.evaluate(()=>document.querySelector('#sh-preview').classList.contains('on')&&/Fire Room/.test(document.querySelector('#reading').innerText)),'preview sheet shows the answers at arrival');await p.click('#sh-preview [data-close]');
 await p.click('#navMode');await p.click('#sh-mode [data-mode="crew"]');await p.waitForTimeout(200);ok(await p.evaluate(()=>window.__sizeup.A.mode==='crew'&&/Crew/.test(document.querySelector('#navMode').textContent)),'mode sheet switches to crew');
 await p.click('#navMode');await p.click('#sh-mode [data-mode="solo"]');await p.waitForTimeout(200);
 ok(!p.errs.length,'no errors '+p.errs.join());await p.ctx.close();}
sec('phone: drill tabs, sheets and tap targets');
{const p=await page();await drill(p,{cmd:true});
 const tabs=['sizeup','report','units','command','check'];
 for(const t of tabs){await p.click(`#tabbar [data-pane="${t}"]`);await p.waitForTimeout(120);const r=await m(p);
  ok(await p.evaluate(t=>document.querySelector('#pane-'+t).classList.contains('on')&&[...document.querySelectorAll('.pane.on')].length===1,t),`tab ${t} opens alone`);
  ok(r.scrollH<=1.6,`tab ${t}: under 1.6 screens (${r.scrollH})`);ok(!r.hov,`tab ${t}: no sideways scroll`);
  const pin=await p.evaluate(()=>{scrollTo(0,9999);const s=document.querySelector('#s4 .slot').getBoundingClientRect(),tb=document.querySelector('.topbar').getBoundingClientRect();const y=scrollY;scrollTo(0,0);return Math.abs(s.top-tb.bottom)<3||y<5;});ok(pin,`tab ${t}: scene stays pinned`);}
 const small=await p.evaluate(()=>[...document.querySelectorAll('#tabbar button,.pane.on .row,.pane.on .cta,.topbar .navbtn,.check')].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().height<43.5).map(e=>e.id||e.className));ok(!small.length,'rows, buttons and tabs are at least 44px: '+small.join());
 for(const s of ['facts','clock','qo','fu','log','about']){await p.evaluate(s=>window.__sizeup.openSheet(s),s);await p.waitForTimeout(400);
  const r=await p.evaluate(s=>{const e=document.querySelector('#sh-'+s);const b=e.getBoundingClientRect();return e.classList.contains('on')&&b.bottom<=innerHeight+1&&b.height<=innerHeight*.9&&document.querySelector('#dim').classList.contains('on');},s);ok(r,`sheet ${s} opens from the bottom with a dimmed backdrop`);
  await p.click('#dim',{position:{x:20,y:20}});await p.waitForTimeout(60);ok(await p.evaluate(s=>!document.querySelector('#sh-'+s).classList.contains('on'),s),`sheet ${s} closes on backdrop tap`);}
 await p.click('#navFacts');ok(await p.evaluate(()=>/Occupancy/.test(document.querySelector('#facts').innerText)),'Facts in the nav bar opens scene facts');await p.click('#sh-facts [data-close]');
 // every task a company can take right now is reachable in its sheet
 await p.evaluate(()=>{const u=window.__sizeup;u.advance(400);u.syncUI();u.renderBoard();});
 for(const co of ['E1','E2','L1','M1','R1']){const r=`#coList .corow2[data-co="${co}"]`;await p.click('#tabbar [data-pane="units"]');await p.click(r+' .cohead');await p.waitForTimeout(80);
  const got=await p.evaluate(r=>[...document.querySelectorAll(r+' .coquick [data-k],'+r+' .comoreb [data-k]')].map(b=>b.dataset.k).sort().join(),r);const want=await p.evaluate(co=>window.__sizeup.coNow(co).sort().join(),co);
  ok(got===want&&want.length>0,`${co}: all ${want.split(',').length} available tasks reachable in the sheet`);
  const sh=await p.evaluate(r=>{const e=document.querySelector(r+' .copanel');const b=e.getBoundingClientRect();return getComputedStyle(e).position==='fixed'&&b.bottom<=innerHeight+1&&!!e.querySelector('.co-close');},r);ok(sh,`${co}: opens as a bottom sheet with a close button`);
  await p.click(r+' .co-close');await p.waitForTimeout(60);ok(await p.evaluate(()=>!window.__sizeup.A.coOpen),`${co}: sheet closes`);}
 {const r='#coList .corow2[data-co="E2"]';await p.click(r+' .cohead');await p.click(r+' .coquick [data-k="line"]');await p.waitForTimeout(80);const v=await p.$eval(r+' .cowhere',w=>(w.querySelector('[data-tgt]:not([disabled])')||{}).dataset.tgt);await p.click(`${r} .cowhere [data-tgt="${v}"]`);await p.waitForTimeout(80);if(await p.$(r+' .copick:not([hidden]) .co-go'))await p.click(r+' .co-go');await p.waitForTimeout(80);
  ok(await p.evaluate(()=>(()=>{const S=window.__sizeup.A.S,c=S.cos.find(c=>c.id==='E2');return !!(c.task||c.job||c.busy)||JSON.stringify(S.water.lines).includes('E2');})()),'hoseline assigned to E2 from its sheet');await p.click('#dim',{position:{x:20,y:20}});await p.waitForTimeout(80);ok(await p.evaluate(()=>!window.__sizeup.A.coOpen),'backdrop tap closes the unit sheet');}
 // command transfer: banner on the Command tab, steps in a sheet
 await p.evaluate(()=>{const u=window.__sizeup;u.advance(200);u.syncUI();u.renderBoard();});await p.click('#tabbar [data-pane="command"]');await p.waitForTimeout(100);
 ok(await p.evaluate(()=>!!document.querySelector('#xferBanner #xferOpen')),'transfer banner on the Command tab');ok(await p.evaluate(()=>+document.querySelector('#cmdBdg').textContent>=1),'Command tab badge counts the pending transfer');
 await p.click('#xferOpen');await p.waitForTimeout(100);ok(await p.evaluate(()=>{const e=document.querySelector('#cmdCard .cf-pmt.blue');return getComputedStyle(e).position==='fixed'&&e.getBoundingClientRect().bottom<=innerHeight+1;}),'transfer steps open as a bottom sheet');
 for(const s of ['look','contact','progress','confirm','announce']){const sel=s==='contact'?'#cmdCard [data-xfer="contact"][data-how="radio"]':`#cmdCard [data-xfer="${s}"]`;await p.click(sel);await p.waitForTimeout(60);}
 ok(await p.evaluate(()=>{const S=window.__sizeup.A.S;return S.cmd.xfer.done!=null&&!document.querySelector('#xferBanner #xferOpen');}),'transfer completes from the sheet; banner goes away');
 ok(/Battalion 1 · IC/.test(await p.textContent('#ttl')),'nav title shows the new IC');
 // debrief
 await p.click('#navEnd');await p.waitForTimeout(300);const db=await p.evaluate(()=>{const b=document.querySelector('.modal .box');return{seg:document.querySelectorAll('.dbseg button').length,rows:document.querySelectorAll('.dbl.on .dbrow').length,fits:b.scrollWidth<=b.clientWidth+1,h:+(b.scrollHeight/innerHeight).toFixed(2)};});
 ok(db.seg===3&&db.rows>0,'debrief: Fix / Watch / Good with rows');ok(db.fits,'debrief fits 390px');ok(db.h<=1.6,'debrief under 1.6 screens ('+db.h+')');
 await p.click('.dbl.on .dbrow');await p.waitForTimeout(100);ok(await p.evaluate(()=>!document.querySelector('#dbDet').hidden&&[...document.querySelectorAll('.dbd')].filter(d=>!d.hidden).length===1),'debrief row opens its detail');await p.click('#dbBack');
 await p.click('#dbCmdRow');ok(await p.evaluate(()=>!!document.querySelector('.dbd[data-i="cmd"]:not([hidden]) .cf-db')),'command review opens');
 ok(!p.errs.length,'no errors '+p.errs.join());await p.ctx.close();}
sec('What’s New and About');
{const p=await page(PH,URL0);await p.waitForTimeout(700);const V=await p.evaluate(()=>window.__sizeup.VERSION);
 const r=await p.evaluate(()=>{const s=document.querySelector('#sh-whatsnew');return{on:s.classList.contains('on'),btns:[...s.querySelectorAll('button')].filter(b=>b.getClientRects().length).map(b=>b.textContent.trim())};});
 ok(r.on,'first launch: What’s New sheet shows');ok(r.btns.length===1&&r.btns[0]==='Continue','one Continue button ('+r.btns.join('|')+')');
 await p.screenshot({path:'/workspace/sizeup/screens/ios-redesign/after-00-whats-new.png'}).catch(()=>{});
 await p.click('#dim',{position:{x:20,y:20}}).catch(()=>{});ok(await p.evaluate(()=>document.querySelector('#sh-whatsnew').classList.contains('on')),'backdrop tap does not dismiss it');
 await p.click('#wnContinue');ok(await p.evaluate(V=>localStorage.getItem(window.__sizeup.WN_KEY)===V,V),'Continue stores the version');
 await p.reload();await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);await p.waitForTimeout(700);ok(await p.evaluate(()=>!document.querySelector('#sh-whatsnew').classList.contains('on')),'second launch: no sheet');
 await p.evaluate(()=>localStorage.setItem(window.__sizeup.WN_KEY,'2026.10.13'));await p.reload();await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);await p.waitForTimeout(700);
 ok(await p.evaluate(()=>document.querySelector('#sh-whatsnew').classList.contains('on')&&document.querySelectorAll('#wnOnce .wnr').length===3),'after an update from Oct 13: shows the 3 newer releases');await p.click('#wnContinue');
 const CL=await p.evaluate(()=>window.__sizeup.CHANGELOG);ok(CL.length>=6,'changelog seeded ('+CL.length+' releases)');
 ok(CL.every((c,i)=>i===0||c.v<CL[i-1].v),'newest first');ok(CL.every(c=>c.date&&c.items.length>=1&&c.items.length<=3),'a date and 1-3 bullets per release');
 ok(CL[CL.length-1].date==='Oct 9, 2026'&&CL[0].v===V,'Oct 9 first publish through this release');
 const txt=CL.map(c=>c.items.join(' ')).join(' ');ok(!/\b(commit|refactor|JS|CSS|HTML|WebGL|API|bug|regression|function|localStorage|DOM|selector|test)s?\b/i.test(txt),'plain language, no code terms');
 for(const k of ['dispatch','transfer','garage','medic','smoke','list','structure','basement','floor','window','attic']){ok(new RegExp(k,'i').test(txt),'changelog mentions '+k);}
 await p.click('#verStart');await p.waitForTimeout(100);ok(await p.evaluate(V=>document.querySelector('#sh-about').classList.contains('on')&&document.querySelector('#verAbout').textContent.includes(V)&&document.querySelectorAll('#wnList .wnr').length===window.__sizeup.CHANGELOG.length,V),'About: version label next to What’s New, all releases');
 
 ok(await p.evaluate(()=>/not for operational use/.test(document.querySelector('#sh-about').innerText)),'About keeps the training disclaimer');
 ok(!p.errs.length,'no errors '+p.errs.join());await p.ctx.close();
 const q=await page(PH,URL0+'#nowhatsnew');await q.waitForTimeout(600);ok(await q.evaluate(()=>!document.querySelector('#sh-whatsnew').classList.contains('on')),'#nowhatsnew suppresses it');await q.ctx.close();}
sec('desktop and iPad');
for(const vp of [{width:1280,height:900},{width:820,height:1180},{width:1180,height:820}]){const p=await page(vp);await drill(p,{cmd:true});await p.waitForTimeout(300);
 const r=await p.evaluate(()=>{const s=document.querySelector('#s4 .stage').getBoundingClientRect(),t=document.querySelector('#tabbar').getBoundingClientRect(),pn=document.querySelector('.pane.on').getBoundingClientRect();return{sw:s.width,tb:t.height>40&&t.bottom<=innerHeight+1,side:pn.left>=s.right-2||pn.top>=s.bottom-2,hov:document.scrollingElement.scrollWidth>innerWidth+1};});
 ok(r.sw>380&&r.tb&&r.side&&!r.hov,`${vp.width}x${vp.height}: scene, tab bar and content laid out (${JSON.stringify(r)})`);
 await p.evaluate(()=>window.__sizeup.openSheet('facts'));const sw=await p.evaluate(()=>document.querySelector('#sh-facts').getBoundingClientRect().width);ok(sw<=Math.min(600,vp.width)+1,`${vp.width}: sheet width ${Math.round(sw)}`);
 ok(!p.errs.length,'no errors '+p.errs.join());await p.ctx.close();}
sec('hi-DPI scene and safe areas');
{const p=await page(PH,URL,{dsf:3});await drill(p);await p.waitForTimeout(300);const r=await p.evaluate(()=>{const c=document.querySelector('#cv');return{w:c.width,cw:c.clientWidth};});ok(Math.abs(r.w-Math.round(r.cw*1.6))<=1,`phone renders the scene at 1.6x (${r.w} for ${r.cw})`);
 ok(await p.evaluate(()=>[...document.styleSheets].some(s=>[...s.cssRules].some(x=>/safe-area-inset-bottom/.test(x.cssText)))),'safe-area insets used');await p.ctx.close();}
await br.close();console.log(`\nredesign suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})().catch(e=>{console.error(e);process.exit(1);});
