/* iOS-style shell (Oct 21 redesign): nav bar, drill tabs, bottom sheets, info sheets, version label, What's New.
   It only moves and labels existing controls; every order still goes through the same handlers and the model is untouched. */
const BUILD=window.SIZEUP_BUILD||{};
const VERSION=CHANGELOG[0].v;
const VER_LABEL=`Version ${VERSION}${BUILD.hash?' ('+BUILD.hash+')':''}`;
const WN_KEY='sizeup-version-seen';
const INFO={
 smoke:['Reading Smoke','Volume follows how much fuel is off-gassing. Velocity follows heat and pressure. Density follows how much fuel is in the smoke. Color: white is often steam or early heating, gray is mixed, brown is often wood (structure) burning, black is fuel-rich. Generic teaching cues, not FSRI measurements.'],
 stage:['Fire Stage','Growth: the fire still has air. Vent-limited: the fire has used up the air and is waiting for more. Developed: the room has flashed over. Decay: the fire is running out of fuel or air. Treat a quiet, smoky building as ventilation-limited until proven otherwise (UL FSRI).'],
 radio:['Initial Radio Report','Commonly includes: unit on scene, building description, conditions, actions and strategy, command, and needs.'],
 feats:['Feature Effects','Fence: extra hose-stretch time on that side. Power lines: no ladders or aerial on that side. Car: no aerial on that side. Exposure: radiant-heat risk when fire shows on that side. Openings below the grade line, or in an extra lowest story on that side, are the basement.'],
 disp:['Dispatch','Generic, editable teaching defaults, not any department’s SOP. Saved presets stay on this device; the assignment also travels inside exported drills. T+0 on the drill clock is when the first company arrives. Each company works one task at a time and splits only if it has enough members left (a hoseline needs 2, or 3 for a 2½ in. line; an engine keeps 1 at the pump). A line must reach the setback plus the run inside; a supply lay needs at least the hydrant distance of supply hose.'],
 times:['Task Times','Teaching values, editable per drill, not SOP. A line’s time = (stretch base + per-foot × hose needed) + per floor + charge, all × the company factor (short staffing, cold, heat fatigue). Saved and exported with the drill.'],
 cmd:['Command Practice','Adds incident-command practice: a guided radio report, command position, benchmarks, PAR, progress reports and command transfer. Off = the drill runs exactly as before. '+CF_NOTE]};
/* ---- sheets ---- */
let SHEET=null;
function openSheet(id){const el=$('#sh-'+id);if(!el)return;closeSheet();
  if(id==='about')renderAbout();if(id==='preview'){$('#reading').innerHTML=readingHTML();const ss=$('#setupSum');if(ss)ss.textContent=setupSummary();}
  el.classList.add('on');SHEET=id;$('#dim').classList.toggle('on',!el.classList.contains('nodim'));el.scrollTop=0;}
function closeSheet(){if(!SHEET)return;const el=$('#sh-'+SHEET);if(el)el.classList.remove('on');SHEET=null;dimSync();}
function openInfo(k){const x=INFO[k];if(!x)return;$('#infoTitle').textContent=x[0];$('#infoBody').textContent=x[1];openSheet('info');}
function dimSync(){$('#dim').classList.toggle('on',!!(SHEET&&!$('#sh-'+SHEET).classList.contains('nodim'))||(A.screen===4&&!!A.coOpen)||document.body.classList.contains('xfer-open'));}
document.addEventListener('click',e=>{const t=e.target;
  const sh=t.closest('[data-sheet]');if(sh){e.preventDefault();openSheet(sh.dataset.sheet);return;}
  if(t.closest('[data-close]')){closeSheet();return;}
  const inf=t.closest('[data-info]');if(inf){e.preventDefault();openInfo(inf.dataset.info);return;}});
$('#dim').onclick=()=>{if(SHEET==='whatsnew')return;if(SHEET){closeSheet();return;}
  if(document.body.classList.contains('xfer-open')){document.body.classList.remove('xfer-open');dimSync();return;}
  if(A.coOpen){A.coOpen=null;renderCompanies();}};
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(SHEET&&SHEET!=='whatsnew')closeSheet();else if(document.body.classList.contains('xfer-open')){document.body.classList.remove('xfer-open');dimSync();}else if(A.coOpen){A.coOpen=null;renderCompanies();}});
$$('.modesw button').forEach(b=>b.addEventListener('click',()=>setTimeout(closeSheet,120)));
/* ---- drill tabs ---- */
A.pane='sizeup';
function pane(n){A.pane=n;$$('.pane').forEach(p=>p.classList.toggle('on',p.id==='pane-'+n));$$('#tabbar button').forEach(b=>b.classList.toggle('on',b.dataset.pane===n));
  if(innerWidth<960){const L=$('#s4 .left');const y=L?Math.max(0,L.offsetTop-(($('.topbar')||{}).offsetHeight||0)):0;if(scrollY>y)scrollTo({top:y});}}
$('#tabbar').onclick=e=>{const b=e.target.closest('[data-pane]');if(b)pane(b.dataset.pane);};
$('#navEnd').onclick=()=>$('#finishBtn').click();
$('#editCond').onclick=()=>show(3);
$('#cmdOffRow').onclick=()=>{show(3);showTab('cmd');};
$('#behindRow').onclick=()=>{const b=$('#behind');b.hidden=!b.hidden;};
$('#cmdCard').addEventListener('click',e=>{if(e.target.closest('#cfFu'))openSheet('fu');},true);
$('#xferBanner').onclick=e=>{if(e.target.closest('#xferOpen')){document.body.classList.add('xfer-open');dimSync();}};
$('#cmdCard').addEventListener('click',e=>{if(e.target.closest('.xf-close')){document.body.classList.remove('xfer-open');dimSync();}});
$('#coList').addEventListener('click',e=>{if(e.target.closest('.co-close')){e.stopPropagation();A.coOpen=null;renderCompanies();}},true);
/* ---- Conditions: Doors & Windows side filter ---- */
A.openSide='all';
$('#openSide').onclick=e=>{const b=e.target.closest('button[data-v]');if(!b)return;A.openSide=b.dataset.v;shellSetup();};
function shellSetup(){if(!A.B||!A.scn)return;const ops=A.B.openings;const sides=[...new Set(ops.map(o=>o.side||'A'))].sort();
  const sg=$('#openSide');const h=sides.length>1?['all',...sides].map(s=>`<button data-v="${s}" class="${A.openSide===s?'on':''}">${s==='all'?'All':'Side '+s}</button>`).join(''):'';if(sg._h!==h){sg.innerHTML=h;sg._h=h;}sg.hidden=!h;
  if(A.openSide!=='all'&&!sides.includes(A.openSide))A.openSide='all';
  $$('#olist .oitem').forEach((r,i)=>{const o=ops[i];r.hidden=!!o&&A.openSide!=='all'&&(o.side||'A')!==A.openSide;});
  const sc=A.scn,st=o=>sc.openings[o.id]||o.init||'closed';const nOpen=ops.filter(o=>st(o)!=='closed').length;
  const ds=A.B.conns.filter(c=>c.type==='door'),dOpen=ds.filter(c=>(sc.doors[c.id]||c.init||'closed')==='open').length;
  const e=sc.env||{},cos=sc.companies||[];const isDef=Object.keys(M.DEF_SET).every(k=>sc.settings[k]===M.DEF_SET[k]);
  const set=(id,t)=>{const el=$(id);if(el&&el.textContent!==t)el.textContent=t;};
  set('#vOpen',nOpen?`${nOpen} open`:'All closed');set('#vIdoor',ds.length?`${ds.length-dOpen} closed${dOpen?` · ${dOpen} open`:''}`:'None');
  set('#vWx',[({day:'Day',dusk:'Dusk',night:'Night'})[e.tod],({none:'Clear',rain:'Rain',snow:'Snow',fog:'Fog'})[e.precip],sc.wind.dir==='calm'?'Calm':'Wind '+sc.wind.dir].join(' · '));
  set('#vDisp',`${cos.length} units · ${cos.reduce((a,c)=>a+(+c.staff||0),0)} staff`);set('#vTimes',isDef?'Defaults':'Edited');set('#vCmd',cmdOn()?'On':'Off');
  const os=$('#occSel');set('#vOcc',os.selectedIndex>=0?os.options[os.selectedIndex].textContent.replace(/^Occupant in /,'').replace(/ \(.*\)$/,'').replace(/^No occupant reported$/,'None reported').replace(/^Occupant reported, location unknown$/,'Reported, unknown'):'');}
/* ---- board: nav title, badge, transfer banner, sheet headers ---- */
function icName(){const S=A.S;if(!S)return'';const C=S.cmd;let c=C&&S.cos.find(x=>x.id===C.ic);if(!c)c=S.cos.find(x=>x.type==='chief'&&M.bcInCommand(S,x));if(!c)c=S.cos.slice().sort((a,b)=>a.arriveAt-b.arriveAt).find(x=>x.type!=='chief');return c?c.name:'';}
function shellBoard(){if(A.screen!==4||!A.S)return;const S=A.S,C=S.cmd;
  const t=icName();const tt=t?`${t} · IC`:'Drill';const te=$('#ttl');if(te.textContent!==tt)te.textContent=tt;
  $('#cmdOff').hidden=!!C;
  // guided command transfer: banner on the Command tab, steps in a bottom sheet
  const pm=$('#cmdCard .cf-pmt.blue:not(.done)');let bh='';
  if(pm){const h4=pm.querySelector('h4');bh=`<div class="banner"><b>${esc(h4?h4.textContent.replace(/:\s*transfer command\?$/i,'').replace(/( on scene)?$/,' on scene'):'Chief on scene')}</b><span>${esc(t)} has command. Transfer when ready.</span><button class="cta" id="xferOpen">Transfer Command</button></div>`;
    if(!pm.querySelector('.xf-top'))pm.insertAdjacentHTML('afterbegin',`<div class="sh xf-top"><b>Transfer Command</b><button class="x xf-close" aria-label="Close">✕</button></div>`);}
  else if(document.body.classList.contains('xfer-open'))document.body.classList.remove('xfer-open');
  const xb=$('#xferBanner');if(xb._h!==bh){xb.innerHTML=bh;xb._h=bh;}
  let n=0;if(C){if(pm)n++;n+=C.cans.filter(r=>r.ack==null).length;if(C.strat&&C.strat.due)n++;if(C.par&&C.par.due.some(d=>!d.req))n++;}
  const bd=$('#cmdBdg');const bt=n?String(n):'';if(bd.textContent!==bt)bd.textContent=bt;bd.hidden=!n;
  const fu=S.followups&&S.followups.length?'Sent':'After 360';for(const id of ['#vFu','#vFu2']){const e=$(id);if(e.textContent!==fu)e.textContent=fu;}
  const nl=S.events.filter(e=>e.t>=S.tArr).length;const lt=nl?`${nl} event${nl>1?'s':''}`:'';const le=$('#vLog');if(le.textContent!==lt)le.textContent=lt;
  dimSync();}
let lastCoOpen=null;
function shellCompanies(){const el=$('#coList');if(!el||!A.S)return;
  if(A.coOpen&&A.coOpen!==lastCoOpen&&A.pane!=='units'&&A.screen===4)pane('units');lastCoOpen=A.coOpen;
  const r=A.coOpen&&el.querySelector(`.corow2[data-co="${CSS.escape(A.coOpen)}"] .copanel`);
  if(r&&!r.querySelector('.co-top')){const c=A.S.cos.find(x=>x.id===A.coOpen);r.insertAdjacentHTML('afterbegin',`<div class="grab"></div><div class="sh co-top"><b>${esc(c?c.name:A.coOpen)}</b><button class="x co-close" aria-label="Close">✕</button></div>`);}
  dimSync();}
/* ---- version label and What's New ---- */
function wnHTML(list){return list.map(r=>`<div class="row stack wnr"><div class="lab"><b>${esc(r.title)}</b><span class="v">${esc(r.date)}</span></div><ul>${r.items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul></div>`).join('');}
function renderAbout(){$('#verAbout').textContent=VER_LABEL;const w=$('#wnList');if(!w._h){w.innerHTML=wnHTML(CHANGELOG);w._h=1;}}
for(const id of ['#verStart']){$(id).textContent=`${VER_LABEL} · What’s New`;}$('#verRow').textContent=VERSION;
function whatsNewDue(){if(document.getElementById('sizeup-scenario')||/noautoplay|nowhatsnew/.test(location.hash))return null;let seen;try{seen=localStorage.getItem(WN_KEY);}catch(e){return null;}
  if(seen===VERSION)return null;const i=CHANGELOG.findIndex(r=>r.v===seen);return CHANGELOG.slice(0,i>0?i:1);}
function checkWhatsNew(){const list=whatsNewDue();if(!list)return;$('#wnVer').textContent=VER_LABEL;$('#wnOnce').innerHTML=wnHTML(list.slice(0,3));openSheet('whatsnew');}
$('#wnContinue').onclick=()=>{try{localStorage.setItem(WN_KEY,VERSION);}catch(e){}closeSheet();};
/* ---- wrap the existing renderers (same scope) ---- */
{const _s=syncUI;syncUI=function(){_s();shellSync();};const _b=renderBoard;renderBoard=function(){_b();shellBoard();};
 const _c=renderCompanies;renderCompanies=function(){_c();shellCompanies();};const _r=renderSetup;renderSetup=function(){_r();shellSetup();};
 const _t=showTab;showTab=function(t){_t(t);if(A.screen===3&&innerWidth<960)scrollTo({top:0});};
 const _w=show;show=function(n){if(n!==4)closeSheet();document.body.classList.remove('xfer-open');_w(n);const L=$('#s'+A.screen+' .large');if(L&&L.nextElementSibling!==$('#steps'))L.after($('#steps'));};}
{const L=$('#s1 .large');if(L)L.after($('#steps'));}
function shellSync(){const b=document.body;$$('#steps button').forEach(x=>{const n=+x.dataset.go;x.disabled=n>A.maxScreen;x.classList.toggle('on',n===A.screen);x.classList.toggle('done',n<A.screen);});for(let i=1;i<=4;i++)b.classList.toggle('scr'+i,A.screen===i);
  const m=A.mode==='crew'?'Crew ▾':'Solo ▾';const nm=$('#navMode');if(nm.textContent!==m)nm.textContent=m;
  $('#navMode').hidden=A.screen===4;$('#navPreview').hidden=A.screen!==3;$('#navFacts').hidden=A.screen!==4;$('#navEnd').hidden=A.screen!==4;
  const sp=`${A.speed}×`,se=$('#speedPill');if(se.textContent!==sp)se.textContent=sp;
  const ph=A.B&&A.B.id==='photo';$('#markRow').hidden=!ph;
  $('#playBtn').classList.toggle('on',!!A.playing);}
window.__sizeup.syncUI=syncUI;window.__sizeup.renderBoard=renderBoard;
Object.assign(window.__sizeup,{coNow:id=>coNow(A.S.cos.find(c=>c.id===id)),pane,openSheet,closeSheet,showTab,show,CHANGELOG,VERSION,checkWhatsNew,whatsNewDue,WN_KEY,
  // test/automation helper: reveal the tab, sheet or setup page holding an element, as a user would before tapping it
  reveal(sel){const el=document.querySelector(sel);if(!el)return false;const p=el.closest('.pane');if(p&&!p.classList.contains('on'))pane(p.id.slice(5));
    const ir=el.closest('.irrs');if(ir&&!ir.classList.contains('on')){A.irrStep=ir.id.slice(4);renderIRR();}
    const tp=el.closest('.tabp');if(tp&&!tp.classList.contains('on')&&A.screen===3)showTab(tp.id.slice(4));
    if(!tp&&A.screen===3&&el.closest('#s3')&&A.tab!=='cond')showTab('cond');
    const sh=el.closest('.sheet');if(sh&&!sh.classList.contains('on'))openSheet(sh.id.slice(3));
    if(el.closest('#cmdCard .cf-pmt.blue:not(.done)')&&!document.body.classList.contains('xfer-open')){document.body.classList.add('xfer-open');dimSync();}
    if(!sh&&SHEET&&SHEET!=='mark')closeSheet();
    if(A.coOpen&&!el.closest('.corow2.open'))  {A.coOpen=null;renderCompanies();}
    if(document.body.classList.contains('xfer-open')&&!el.closest('#cmdCard .cf-pmt.blue')){document.body.classList.remove('xfer-open');dimSync();}return true;}});
setTimeout(checkWhatsNew,400);
