/* ---------- Command fundamentals mode (optional; same scope as app.js) ----------
   A generic teaching layer in SizeUp's own wording. Concepts: Brunacini, Fire Command (NFPA), and public fire-department SOPs
   (see Behind the behavior). Not affiliated with, endorsed by, or a substitute for any commercial incident-command certification program. */
const CF_NOTE='Not affiliated with, endorsed by, or a substitute for any commercial incident-command certification program.';
function cmdOn(){return !!(A.scn&&A.scn.command&&A.scn.command.on);}
function CS(){return A.S&&A.S.cmd;}
function cmdSub(k){const C=CS();return !!(C&&C.sub[k]);}
function cmdScn(){const sc=A.scn;if(!sc.command)sc.command={on:false,sub:{...M.CMD_SUB},set:{...M.CMD_SET},terms:{}};const c=sc.command;c.sub={...M.CMD_SUB,...(c.sub||{})};c.set={...M.CMD_SET,...(c.set||{})};c.terms=c.terms||{};return c;}
function cmdTerms(){const C=CS();if(C)return C.terms;return (M.cmdCfg({command:{...cmdScn(),on:true}})||{}).terms||M.CMD_TERMS;}
const lines_=s=>String(s||'').split('\n').map(x=>x.trim()).filter(Boolean);
/* ---------- setup tab ---------- */
const CF_SUBS=[['irr','Guided initial radio report','Pick-list report builder, checked against the scene'],['pos','Command position','Investigating / fast attack / command post. The first-arriving officer is the working IC and directs every company in any position'],
  ['tlo','Task, location, objective','Every company assignment carries a location and an objective'],['can','Progress reports (CAN)','Companies report conditions, actions and needs'],
  ['bench','Benchmarks','You declare all clear, under control and loss stopped; the model checks them'],['par','PAR and strategy check','PAR prompts and a periodic strategy check'],
  ['xfer','Command transfer','A guided transfer when the chief officer arrives'],['fu','360 follow-up','Prompt for the follow-up report after the 360'],['hints','Hints','Show when the model already agrees (for example, everything knocked down)']];
const CF_SET=[['parEvery','PAR every (elapsed time)'],['parTime','PAR takes'],['stratEvery','Strategy check every'],['cmdSetup','Fast attack → command post takes'],
  ['lowAir','Interior work before a low-air report'],['ackWithin','Acknowledge priority reports within'],['lsHold','Loss stopped: steady after under control for'],
  ['xLook','Transfer: arrive and look'],['xContact','Transfer: radio contact'],['xF2F','Transfer: face-to-face contact'],['xProgress','Transfer: progress report'],['xConfirm','Transfer: confirm assignments'],['xAnnounce','Transfer: announce']];
const CF_TERMMAPS=[['problem','Conditions terms'],['size','Building size terms'],['occ','Occupancy terms'],['constr','Construction terms'],['pos','Command position terms'],['obj','Objectives'],['res','Resource calls'],['bench','Benchmarks']];
function renderCmdSetup(){const el=$('#cmdSetup');if(!el||!A.scn)return;const c=cmdScn(),T=cmdTerms();
  const tg=(id,on,b,s)=>`<button class="toggle" data-cf="${id}" aria-pressed="${on}"><span><b>${b}</b><small>${s}</small></span><span class="sw"></span></button>`;
  const open=[...el.querySelectorAll('details')].map(d=>d.open);
  el.innerHTML=`<div class="ctl">${tg('on',c.on,`Command fundamentals: ${c.on?'On':'Off'}`,'Adds incident-command practice to the drill. Off = the drill runs exactly as before.')}
    <div class="cf-note">A generic teaching layer in SizeUp's own wording. The concepts come from public sources (Brunacini's <i>Fire Command</i> and published fire-department SOPs; see Behind the behavior). <b>${CF_NOTE}</b> Scores and times are editable teaching values, not your department's SOP.</div></div>
   <div class="ctl${c.on?'':' cf-dim'}"><div class="lbl">Parts of the mode</div><div class="cf-subs">${CF_SUBS.map(([k,b,s])=>tg('sub:'+k,!!c.sub[k],b,s)).join('')}</div></div>
   <details class="ctl cf-det${c.on?'':' cf-dim'}"${open[0]?' open':''}><summary class="lbl">Teaching values (seconds unless noted)</summary><div class="cf-set">${CF_SET.map(([k,l,n])=>`<label>${esc(l)}<input type="number" min="0" step="${n?1:5}" data-cfset="${k}" value="${c.set[k]}">${n?'':`<small>${fmt(c.set[k])}</small>`}</label>`).join('')}</div>
    <div class="cf-dhint">Editable teaching values, not SOP. They travel with exported drills.</div></details>
   <details class="ctl cf-det${c.on?'':' cf-dim'}"${open[1]?' open':''}><summary class="lbl">Department terms and pick-lists</summary>
    ${CF_TERMMAPS.map(([k,l])=>`<div class="cf-term"><div class="l">${esc(l)}</div>${Object.keys(M.CMD_TERMS[k]).map(kk=>`<input data-cfterm="${k}.${kk}" value="${esc(T[k][kk])}" aria-label="${esc(l)}: ${kk}">`).join('')}</div>`).join('')}
    <div class="cf-term"><div class="l">Command names (one per line)</div><textarea data-cfterm="names" rows="3">${esc(T.names)}</textarea></div>
    <div class="cf-term"><div class="l">Accountability locations (one per line)</div><textarea data-cfterm="acct" rows="3">${esc(T.acct)}</textarea></div>
    <div class="cf-term"><div class="l">Name for a PAR</div><input data-cfterm="par" value="${esc(T.par)}"></div>
    <div class="btnrow"><button class="btn ghost sm" id="cfReset">Reset terms to SizeUp defaults</button></div>
    <div class="cf-dhint">Terms are saved with your assignment preset (Dispatch tab → Save preset) and travel inside exported drills.</div></details>`;}
function cmdChanged(full){rebuild();warm(2);if(full)renderCmdSetup();syncUI();}
$('#cmdSetup').addEventListener('click',e=>{const b=e.target.closest('[data-cf]');if(b){const c=cmdScn(),k=b.dataset.cf;if(k==='on')c.on=!c.on;else c.sub[k.slice(4)]=!c.sub[k.slice(4)];cmdChanged(true);return;}
  if(e.target.closest('#cfReset')){cmdScn().terms={};cmdChanged(true);toast('Command terms reset to SizeUp defaults.');}});
$('#cmdSetup').addEventListener('change',e=>{const t=e.target,c=cmdScn();
  if(t.dataset.cfset){c.set[t.dataset.cfset]=Math.max(0,+t.value||0);cmdChanged(true);return;}
  if(t.dataset.cfterm){const [k,kk]=t.dataset.cfterm.split('.');if(kk){c.terms[k]={...(c.terms[k]||{}),[kk]:t.value.trim()||M.CMD_TERMS[k][kk]};}else c.terms[k]=t.value;cmdChanged(false);}});
/* ---------- initial radio report builder ---------- */
function irrDefault(){return{unit:'',stories:'',constr:'',occ:'',size:'',problem:'',floor:'',side:'',task:'',loc:'',obj:'',strategy:'',pos:'',name:'',cmdLoc:'',res:'',free:''};}
function irrOpts(){const S=A.S,B=A.B,T=cmdTerms();const floors=[...new Set(B.zones.filter(z=>!z.attic).map(z=>z.floor))].sort((a,b)=>(a==='B'?-1:+a)-(b==='B'?-1:+b));
  const C=CS();const ic=S.cos.find(c=>c.id===(C&&C.ic1));
  return{unit:S.cos.filter(c=>S.t>=c.arriveAt).sort((a,b)=>a.arriveAt-b.arriveAt).map(c=>[c.id,c.name]),stories:['1','2','3','4'].map(x=>[x,x+(x==='1'?' story':' stories')]),constr:Object.entries(T.constr),occ:Object.entries(T.occ),size:Object.entries(T.size),
    problem:Object.entries(T.problem),floor:floors.map(f=>[f,f==='B'?'Basement':'Floor '+f]),side:['A','B','C','D'].map(s=>[s,'Side '+s]),strategy:[['Offensive','Offensive'],['Defensive','Defensive']],pos:Object.entries(T.pos),
    task:[['line','Stretch a hoseline'],['search1','Primary search'],['investigate','Investigate']].filter(([k])=>k==='investigate'||!ic||!M.canDo(ic,k)),obj:Object.entries(T.obj),
    name:lines_(T.names).map(n=>[n,n]),cmdLoc:['A','B','C','D'].map(s=>['Side '+s,'Side '+s]),res:Object.entries(T.res)};}
function irrLocOpts(task){if(task==='line')return lineTargets().filter(t=>t.g!=='ext').map(t=>[t.v,t.short]);if(task==='search1')return irrOpts().floor;if(task==='investigate')return ['A','B','C','D'].map(s=>[s,'Side '+s]);return[];}
function irrText(r){const S=A.S,T=cmdTerms();const co=r.unit&&S.cos.find(c=>c.id===r.unit);const u=co?co.name:'(unit)';const L=(m,k)=>k&&m[k]?m[k]:'';
  const words=['','One','Two','Three','Four'];const p=[];p.push(`${u} on scene.`);
  const bl=[r.stories?words[+r.stories]+'-story':'',L(T.constr,r.constr).toLowerCase(),L(T.occ,r.occ).toLowerCase()].filter(Boolean).join(' ');if(bl||r.size)p.push(`${bl?bl.charAt(0).toUpperCase()+bl.slice(1):'Building'}${r.size?', '+L(T.size,r.size).toLowerCase()+' size':''}.`);
  if(r.problem)p.push(`${L(T.problem,r.problem)}${r.floor?' from '+(r.floor==='B'?'the basement':'floor '+r.floor):''}${r.side?', Side '+r.side:''}.`);
  if(r.task){const loc=(irrLocOpts(r.task).find(o=>o[0]===r.loc)||[])[1]||'';const tw={line:'stretching a line',search1:'starting a primary search',investigate:'investigating'}[r.task];
    p.push(`${u} ${tw}${loc?(r.task==='line'?' to '+loc:r.task==='search1'?' of '+loc.toLowerCase():' on '+loc):''}${r.obj?' for '+L(T.obj,r.obj).toLowerCase():''}.`);}
  if(r.strategy)p.push(`${r.strategy} strategy.`);if(r.res)p.push(L(T.res,r.res)+'.');
  if(r.pos)p.push(`${u} ${({inv:'is',fast:'will be in',post:'is setting up a'})[r.pos]||'is'} ${L(T.pos,r.pos).toLowerCase()}.`);
  if(r.name)p.push(`${u} is ${r.name}${r.cmdLoc?', '+r.cmdLoc:''}.`);if(r.free&&r.free.trim())p.push(r.free.trim());return p.join(' ');}
const IRR_STEPS=[['unit','Unit on scene',['unit']],['building','Building / occupancy',['stories','constr','occ','size']],['conditions','Conditions',['problem','floor','side']],['actions','Actions / strategy',['task','loc','obj','strategy']],['position','Command position',['pos']],['name','Command name / location',['name','cmdLoc','res']]];
function renderIRR(){const el=$('#irrBox');if(!el)return;const on=cmdOn()&&cmdSub('irr');el.hidden=!on;$('#radioWrap').hidden=on;if(!on)return;
  const S=A.S,C=CS();if(!A.irr)A.irr=irrDefault();const r=A.irr;const O=irrOpts();const hid=isHidden();
  if(!r.unit&&O.unit.length)r.unit=O.unit[0][0];if(r.task&&!r.loc&&r.task==='line'){const d=defaultLine(lineTargets());if(irrLocOpts('line').some(o=>o[0]===d))r.loc=d;}
  if(r.task&&!r.obj)r.obj=M.TASK_OBJ[r.task]||(r.task==='investigate'?'support':'');
  const g=M.gradeIRR(S,r);const row=k=>g.rows.find(x=>x.k===k);
  const sent=C.irr;const ed=A.irrEdit||!sent;
  if(!ed){const G=sent.g;const h=`<div class="cf-hd"><h3>Initial radio report</h3><span class="cf-pill gen">Guided</span></div>
    <div class="cf-sent">Sent at T+${fmt(sent.t-S.tArr)}${hid?'':` · <b>${G.score} of 6</b> match the scene (grade ${G.letter})`}</div><div class="cf-report">${esc(irrText(sent.r))}</div>
    ${hid?'':`<details class="cf-irrd"${A.irrOpenRows?' open':''}><summary>Step by step</summary><ul class="cf-glist">${G.rows.map(x=>`<li><i class="cf-m ${x.st}">${x.st==='ok'?'✓':'!'}</i><span><b>${esc(IRR_STEPS.find(s=>s[0]===x.k)[1])}:</b> ${esc(x.msg)}</span></li>`).join('')}</ul></details>`}
    <div class="btnrow"><button class="btn ghost sm" id="irrUpd">Give an updated report</button></div>`;if(el._h!==h){el.innerHTML=h;el._h=h;}return;}
  const chip=(k,v,l)=>`<button class="cf-opt${r[k]===v?' on':''}" data-irr="${k}" data-v="${esc(v)}">${esc(l)}</button>`;
  const sel=(k,opts,ph)=>`<select data-irrs="${k}" aria-label="${ph}"><option value="">${ph}</option>${opts.map(([v,l])=>`<option value="${esc(v)}"${r[k]===v?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
  const mark=k=>{if(hid)return'';const x=row(k);return x?`<div class="cf-ck ${x.st}">${x.st==='ok'?'✓':'!'} ${esc(x.msg)}</div>`:'';};
  const chips=IRR_STEPS.map(([k,l],i)=>{const x=row(k);const st=hid?'p':x.st==='ok'?'g':x.st==='mid'?'a':'p';return`<button class="cf-rchip ${st}" data-irrgo="${k}"><i>${st==='g'?'✓':st==='a'?'!':i+1}</i>${esc(l)}</button>`;}).join('');
  const sec=(k,n,l,body)=>`<div class="cf-field" id="irr-${k}"><div class="cf-fl">${n} · ${esc(l)}</div>${body}${mark(k)}</div>`;
  const h=`<div class="cf-hd"><h3>Initial radio report</h3><span class="cf-pill gen">Guided</span></div><div class="cf-rchips">${chips}</div>
   ${sec('unit',1,'Unit on scene',`<div class="cf-optrow">${O.unit.map(([v,l])=>chip('unit',v,l)).join('')}</div>`)}
   ${sec('building',2,'Building / occupancy',`<div class="cf-optrow">${O.stories.map(([v,l])=>chip('stories',v,l)).join('')}</div><div class="cf-grid3">${sel('constr',O.constr,'Construction')}${sel('occ',O.occ,'Occupancy')}${sel('size',O.size,'Size')}</div>`)}
   ${sec('conditions',3,'Conditions',`<div class="cf-optrow">${O.problem.map(([v,l])=>chip('problem',v,l)).join('')}</div><div class="cf-optrow">${O.floor.map(([v,l])=>chip('floor',v,l)).join('')}<span class="cf-sp"></span>${O.side.map(([v,l])=>chip('side',v,l)).join('')}</div>`)}
   ${sec('actions',4,'Actions / strategy',`<div class="cf-grid3">${sel('task',O.task,'Task')}${sel('loc',irrLocOpts(r.task),'Location')}${sel('obj',O.obj,'Objective')}</div><div class="cf-optrow">${O.strategy.map(([v,l])=>chip('strategy',v,l)).join('')}</div>`)}
   ${sec('position',5,'Command position',`<div class="cf-optrow cf-seg3">${O.pos.map(([v,l])=>chip('pos',v,l)).join('')}</div>`)}
   ${sec('name',6,'Command name / location',`<div class="cf-grid3">${sel('name',O.name,'Command name')}${sel('cmdLoc',O.cmdLoc,'Location')}${sel('res',O.res,'Resources')}</div>`)}
   <div class="cf-field"><div class="cf-fl">Optional free text</div><textarea id="irrFree" rows="2" placeholder="Anything else for incoming units">${esc(r.free)}</textarea></div>
   <div class="cf-fl">Assembled report</div><div class="cf-report" id="irrText">${esc(irrText(r))}</div>
   <div class="cf-tx"><div>${hid?'<span class="muted tiny">Checks hidden until answers are shown.</span>':`<div class="cf-mtr"><i style="width:${Math.round(g.score/6*100)}%"></i></div><span class="muted tiny">${g.score} of 6 steps match the scene right now</span>`}</div><button class="btn primary" id="irrSend">Transmit</button></div>`;
  if(el._h!==h){const f=document.activeElement&&document.activeElement.id==='irrFree';el.innerHTML=h;el._h=h;if(f){const t=$('#irrFree');t.focus();t.setSelectionRange(t.value.length,t.value.length);}}}
$('#irrBox').addEventListener('click',e=>{const b=e.target.closest('[data-irr]');if(b){const k=b.dataset.irr,v=b.dataset.v;A.irr[k]=A.irr[k]===v?'':v;renderIRR();return;}
  const go=e.target.closest('[data-irrgo]');if(go){const s=$('#irr-'+go.dataset.irrgo);if(s)s.scrollIntoView({block:'nearest',behavior:'smooth'});return;}
  if(e.target.closest('#irrUpd')){A.irrEdit=true;A.irr={...CS().irr.r};renderIRR();return;}
  if(e.target.closest('#irrSend'))sendIRR();});
$('#irrBox').addEventListener('toggle',e=>{if(e.target.classList&&e.target.classList.contains('cf-irrd'))A.irrOpenRows=e.target.open;},true);
$('#irrBox').addEventListener('change',e=>{const s=e.target.closest('[data-irrs]');if(!s)return;A.irr[s.dataset.irrs]=s.value;if(s.dataset.irrs==='task'){A.irr.loc='';A.irr.obj='';}renderIRR();});
$('#irrBox').addEventListener('input',e=>{if(e.target.id==='irrFree'){A.irr.free=e.target.value;const t=$('#irrText');if(t)t.textContent=irrText(A.irr);}});
function sendIRR(){const r={...A.irr};const C=CS();if(!r.unit)return toast('Pick the unit on scene first.');const text=irrText(r);const first=!C.irr;
  const ic=C.ic1;const pos=r.pos;const rr={...r};delete rr.free;order({kind:'irr',r:rr,text});
  // the report's own task becomes the first assignment for IC #1's company (task, location, objective)
  if(first&&ic&&r.task&&r.task!=='investigate'&&r.loc){const lab=(irrLocOpts(r.task).find(o=>o[0]===r.loc)||[])[1]||r.loc;const a={kind:'assign',co:ic,task:r.task,loc:lab};if(r.obj)a.obj=r.obj;if(r.task==='line')a.target=r.loc;else a.floor=r.loc;order(a);}
  A.irrEdit=false;$('#radio').value=text;renderBoard();toast(`T+${fmt(now())} · Initial radio report sent${pos?' · '+cmdTerms().pos[pos]:''}.`);}
/* ---------- command card: position, benchmarks, PAR & strategy check, transfer, 360 prompt ---------- */
function ring(f,col){const r=16,c=2*Math.PI*r;return`<svg class="cf-ring" viewBox="0 0 42 42"><circle cx="21" cy="21" r="${r}" fill="none" stroke="#2a2e35" stroke-width="5"/><circle cx="21" cy="21" r="${r}" fill="none" stroke="${col}" stroke-width="5" stroke-dasharray="${(c*Math.max(0,Math.min(1,f))).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 21 21)" stroke-linecap="round"/></svg>`;}
function posPhrase(k){const l=cmdTerms().pos[k]||k;return k==='inv'?l.toLowerCase():k==='post'?'at the '+l.toLowerCase():'in '+l.toLowerCase();}
function renderCmd(){const el=$('#cmdCard');const can=$('#canCard');const on=cmdOn()&&CS()&&A.screen===4;el.hidden=!on;can.hidden=!(on&&cmdSub('can'));if(!on)return;
  const S=A.S,C=CS(),T=C.terms,ta=S.tArr,hid=isHidden();const ic1=S.cos.find(c=>c.id===C.ic1),icNow=S.cos.find(c=>c.id===C.ic);const out=[];
  if(C.sub.pos){const gated=M.cmdGated(S);const pl=C.pos?T.pos[C.pos]:'not set';
    out.push(`<div class="cf-ic"><div><span class="cf-k">IC</span> <b>${esc(icNow?icNow.name:'-')}</b> · ${C.xfer.done?`${esc(T.pos.post)} (took command at T+${fmt(C.xfer.done-ta)})`:esc(pl)}${C.pos==='post'&&S.t<C.postAt?` · ready in ${fmt(C.postAt-S.t)}`:''}</div>
      ${C.xfer.done?'':`<div class="cf-optrow cf-seg3">${Object.entries(T.pos).map(([k,l])=>`<button class="cf-opt${C.pos===k?' on':''}" data-cpos="${k}">${esc(l)}</button>`).join('')}</div>`}
      ${C.xfer.done?'':`<div class="cf-note">${esc(ic1.name)} is the working IC: assign any company that is on scene or staged.</div>`}</div>`);}
  if(C.sub.bench){const floors=[...new Set(A.B.zones.filter(z=>!z.attic).map(z=>z.floor))].sort((a,b)=>(a==='B'?-1:+a)-(b==='B'?-1:+b));const dec=(k,f)=>C.bench.find(b=>b.k===k&&(f==null||b.floor===String(f)));
    const fb=k=>floors.map(f=>{const d=dec(k,f);return`<button class="cf-fbtn${d?' done':''}" data-bench="${k}" data-floor="${f}" ${d?'disabled':''} title="${esc(T.bench[k])} ${f==='B'?'basement':'floor '+f}">${f==='B'?'B':'F'+f}${d?' ✓':''}</button>`;}).join('');
    const tile=(k,body,done,sub)=>`<div class="cf-bm${done?' done':''}"><div class="cf-bk">${esc(T.bench[k])}</div>${body}<div class="cf-s">${sub||''}</div></div>`;
    const uc=dec('uc'),ls=dec('ls');const hint=C.sub.hints&&!hid;
    const acs=C.bench.filter(b=>b.k==='allclear'),acs2=C.bench.filter(b=>b.k==='allclear2');
    out.push(`<div class="cf-hd"><h3>Benchmarks</h3><span class="cf-sp"></span><span class="muted tiny">You declare · the model checks${hint?'':' at the debrief'}</span></div><div class="cf-bench">
      ${tile('allclear',`<div class="cf-fbs">${fb('allclear')}</div>`,acs.length&&acs.length>=floors.length,acs.length?`Declared ${acs.map(b=>(b.floor==='B'?'B':'F'+b.floor)+' T+'+fmt(b.t-ta)).join(', ')}`:'Declare per floor')}
      ${tile('allclear2',`<div class="cf-fbs">${fb('allclear2')}</div>`,acs2.length&&acs2.length>=floors.length,acs2.length?`Declared ${acs2.map(b=>(b.floor==='B'?'B':'F'+b.floor)+' T+'+fmt(b.t-ta)).join(', ')}`:'Declare per floor')}
      ${tile('uc',uc?`<div class="cf-bv">Declared</div>`:`<button class="btn ghost sm" data-bench="uc">Declare</button>`,!!uc,uc?`T+${fmt(uc.t-ta)}${hint?(uc.ok?' · model agrees':' · model: not yet'):''}`:(hint&&C.ucAuto!=null?'<span class="cf-hint">Hint: the model shows no room still burning.</span>':'Not declared'))}
      ${tile('ls',ls?`<div class="cf-bv">Declared</div>`:`<button class="btn ghost sm" data-bench="ls">Declare</button>`,!!ls,ls?`T+${fmt(ls.t-ta)}${hint?(ls.ok?' · model agrees':' · model: not yet'):''}`:(hint&&C.lsAuto!=null?'<span class="cf-hint">Hint: conditions have settled.</span>':'Not declared'))}</div>`);}
  if(C.sub.par){const due=C.par.due.filter(d=>!d.req);const pend=C.par.done.find(p=>p.doneAt>S.t);
    const parT=due.length?`<div class="cf-tm warn">${ring((S.t-due[0].t)/Math.max(1,C.set.ackWithin),'#ffb300')}<div><b>${esc(T.par)} due</b><small>${esc(due[0].why)} · waiting ${fmt(S.t-due[0].t)}</small></div><button class="btn outline sm" id="cfPar">Request ${esc(T.par)}</button></div>`
      :pend?`<div class="cf-tm">${ring(1-(pend.doneAt-S.t)/Math.max(1,C.set.parTime),'#64b5f6')}<div><b>${esc(T.par)} in progress</b><small>companies reporting · ${fmt(pend.doneAt-S.t)}</small></div></div>`
      :`<div class="cf-tm">${ring(1-(C.nextPar-S.t)/C.set.parEvery,'#64b5f6')}<div><b>Next ${esc(T.par)} in ${fmt(Math.max(0,C.nextPar-S.t))}</b><small>also after benchmarks and strategy changes</small></div><button class="btn ghost sm" id="cfPar">${esc(T.par)} now</button></div>`;
    const sd=C.strat.due;const other=S.strategy==='Defensive'?'Offensive':'Defensive';
    const stT=sd?`<div class="cf-tm warn">${ring((S.t-sd.t)/120,'#ffb300')}<div><b>Strategy check due</b><small>${fmt(sd.t-ta)} on scene · confirm or change</small></div><div class="cf-col"><button class="btn outline sm" data-strat="${S.strategy||'Offensive'}">Confirm ${S.strategy||'Offensive'}</button><button class="btn ghost sm" data-strat="${other}">Go ${other.toLowerCase()}</button></div></div>`
      :`<div class="cf-tm">${ring(1-(C.nextStrat-S.t)/C.set.stratEvery,'#64b5f6')}<div><b>Strategy check in ${fmt(Math.max(0,C.nextStrat-S.t))}</b><small>every ${fmt(C.set.stratEvery)}: confirm offensive or defensive</small></div></div>`;
    out.push(`<div class="cf-timers">${parT}${stT}</div>`);}
  if(C.sub.xfer&&C.xfer.avail!=null){const bc=S.cos.find(c=>c.id===C.bc);if(C.xfer.done)out.push(`<div class="cf-pmt blue done"><b>Command transferred</b> to ${esc(bc.name)} at T+${fmt(C.xfer.done-ta)} (${fmt(C.xfer.done-C.xfer.avail)} after arrival).</div>`);
    else{const did=new Set(C.xfer.steps.map(s=>s.step));const ST=[['look','Arrive and look'],['contact','Make contact'],['progress','Get a progress report'],['confirm','Confirm assignments'],['announce','Announce the transfer']];const nx=ST.find(s=>!did.has(s[0]));
      out.push(`<div class="cf-pmt blue"><h4>${esc(bc.name)} on scene: transfer command?</h4><p>${esc(ic1.name)} is ${C.pos?esc(posPhrase(C.pos)):'in command'}. A chief at a stationary post has the full picture and frees the company officer to work with the crew.</p>
        <div class="cf-steps">${ST.map(([k,l])=>`<span class="${did.has(k)?'d':nx&&nx[0]===k?'nx':''}">${did.has(k)?'✓ ':''}${l}</span>`).join('')}</div>
        <div class="cf-row">${nx?nx[0]==='contact'?`<button class="btn primary sm" data-xfer="contact" data-how="radio">By radio (${fmt(C.set.xContact)})</button><button class="btn ghost sm" data-xfer="contact" data-how="f2f">Face to face (${fmt(C.set.xF2F)})</button>`
          :`<button class="btn primary sm" data-xfer="${nx[0]}">${nx[1]} (${fmt(C.set[{look:'xLook',progress:'xProgress',confirm:'xConfirm',announce:'xAnnounce'}[nx[0]]])})</button>`:''}${ST.filter(s=>!did.has(s[0])&&s!==nx).length?`<button class="btn ghost sm" data-xfer="announce">Skip to announce</button>`:''}</div></div>`);}}
  if(C.sub.fu&&!S.followups.length){const lap=S.flags.lap360!=null&&S.flags.lap360<=S.t;const any=['B','C','D'].some(s=>S.walked[s]!=null);
    if(lap||any)out.push(`<div class="cf-pmt"><h4>${lap?'360 done: send your follow-up':'360 under way'}</h4><p>${lap?'Confirm the strategy, any changes to the plan, what the other sides showed, and where accountability is.':'Finish walking the sides (tabs on the photo), then send the follow-up report.'}</p><div class="cf-row"><button class="btn ${lap?'primary':'ghost'} sm" id="cfFu">Open the follow-up report</button></div></div>`);}
  const h=`<div class="cf-hd"><h3>Command</h3><span class="cf-pill gen">Command fundamentals</span></div>${out.join('')}`;if(el._h!==h){el.innerHTML=h;el._h=h;}
  renderCAN();}
function cfStep(step,how){const C=CS();const cost=Math.round(how==='f2f'?C.set.xF2F:how==='radio'?C.set.xContact:C.set[{look:'xLook',progress:'xProgress',confirm:'xConfirm',announce:'xAnnounce'}[step]]||0);
  order({kind:'xfer',step,how});if(cost>1){const ne=advance(cost-1);if(ne.length){A.latest=ne.map(e=>e.msg);handleEvents(ne);}}renderBoard();}
$('#cmdCard').addEventListener('click',e=>{const t=e.target.closest('button');if(!t||t.disabled)return;
  if(t.dataset.cpos){order({kind:'cmdpos',pos:t.dataset.cpos});return;}
  if(t.dataset.bench){const k=t.dataset.bench;order({kind:'bench',k,floor:t.dataset.floor});const C=CS(),b=C.bench[C.bench.length-1];
    if(k==='uc'&&b&&b.ok){if(A.playing){A.playing=false;A.simAcc=0;}A.ucDismissed=null;syncUI();}return;}
  if(t.id==='cfPar'){order({kind:'par'});return;}
  if(t.dataset.strat){order({kind:'stratcheck',v:t.dataset.strat});return;}
  if(t.dataset.xfer){cfStep(t.dataset.xfer,t.dataset.how);return;}
  if(t.id==='cfFu'){const f=$('#fuCard');if(f){f.scrollIntoView({behavior:'smooth',block:'start'});f.classList.add('cf-flash');setTimeout(()=>f.classList.remove('cf-flash'),1400);}}});
/* ---------- CAN reports ---------- */
function renderCAN(){const el=$('#canCard');if(el.hidden)return;const S=A.S,C=CS(),ta=S.tArr;const cos=S.cos.filter(c=>S.t>=c.arriveAt);
  const list=C.cans.slice().reverse();const shown=A.canAll?list:list.slice(0,4);const lab={priority:'Priority',status:'Status change',request:'On request'};
  const cur=($('#canCo')||{}).value;
  const h=`<div class="cf-hd"><h3>Progress reports</h3><span class="cf-sp"></span><span class="muted tiny">Conditions · Actions · Needs</span></div>
   <div class="row2" style="margin-bottom:10px"><select id="canCo" aria-label="Company to report">${cos.map(c=>`<option value="${esc(c.id)}"${cur===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select><button class="btn ghost sm" id="canReq">Request report</button></div>
   ${shown.length?shown.map(r=>{const c=S.cos.find(x=>x.id===r.co);const fresh=r.ack==null;return`<div class="cf-can${r.kind==='priority'?' pri':''}${fresh&&r.kind!=='priority'?' new':''}"><div class="cf-top"><span class="cf-pill ${r.kind==='priority'?'red':r.kind==='status'?'gen':'sim'}">${lab[r.kind]}</span><b>${esc(c.name)}</b><span class="cf-t">T+${fmt(r.t-ta)}</span></div>
     <dl><dt>C</dt><dd>${esc(r.c)}</dd><dt>A</dt><dd>${esc(r.a)}</dd><dt>N</dt><dd class="${r.need?'need':''}">${esc(r.n)}</dd></dl>
     <div class="cf-row">${fresh?`<button class="btn ${r.kind==='priority'?'primary':'ghost'} sm" data-ack="${r.id}">Acknowledge</button>`:`<span class="muted tiny">Acknowledged T+${fmt(r.ack-ta)}</span>`}${r.need&&r.acted==null?`<button class="btn outline sm" data-canas="${r.id}">Assign…</button>`:r.acted!=null?`<span class="muted tiny"> · need answered T+${fmt(r.acted-ta)}</span>`:''}</div></div>`;}).join('')
     +(list.length>4?`<button class="btn ghost sm" id="canMore">${A.canAll?'Show fewer':`Show all ${list.length}`}</button>`:''):'<div class="muted tiny">Companies report when their status changes, on priority traffic (low air, conditions worsening), or when you ask.</div>'}`;
  if(el._h!==h){el.innerHTML=h;el._h=h;}}
function cfFocusAssign(r){const S=A.S;const task={backup:'line',supply:'supply',relief:'line',ems:'rehab',assign:''}[r.need]||'';
  let co=r.need==='assign'?r.co:null;if(!co&&task){const free=S.cos.filter(c=>c.id!==r.co&&!M.canDo(c,task)).sort((a,b)=>(M.freeCrew(S,b)>0)-(M.freeCrew(S,a)>0)||a.arriveAt-b.arriveAt);co=(free.find(c=>S.t>=c.arriveAt&&M.freeCrew(S,c)>=M.TASKDEF[task].need)||free[0]||{}).id;}
  if(co){A.coOpen=co;renderCompanies();}const row=co&&$(`#coList .corow2[data-co="${CSS.escape(co)}"]`);if(!row){toast('No company can take that right now. Add companies or release a task.');return;}
  const ts=row.querySelector('.co-task');if(ts&&task&&[...ts.options].some(o=>o.value===task)){ts.value=task;ts._touched=true;ts.dispatchEvent(new Event('change',{bubbles:true}));}renderCompanies();
  row.scrollIntoView({behavior:'smooth',block:'center'});row.classList.add('cf-flash');setTimeout(()=>row.classList.remove('cf-flash'),1600);}
$('#canCard').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;
  if(t.id==='canReq'){const co=$('#canCo').value;if(co)order({kind:'canreq',co});return;}
  if(t.id==='canMore'){A.canAll=!A.canAll;renderCAN();return;}
  if(t.dataset.ack){order({kind:'canack',id:+t.dataset.ack});return;}
  if(t.dataset.canas){const r=CS().cans.find(x=>x.id===+t.dataset.canas);if(r){if(r.ack==null)order({kind:'canack',id:r.id});cfFocusAssign(r);}}});
/* ---------- TLO helpers for the company rows ---------- */
const CF_LOCS=['Side A','Side B','Side C','Side D','Floor 1','Floor 2','Roof','Staging','Command post','Rehab'];
function cfTloHTML(c){if(!(cmdOn()&&cmdSub('tlo')))return'';const T=cmdTerms();return`<select class="co-loc" aria-label="Location for ${esc(c.name)}" hidden>${CF_LOCS.map(l=>`<option>${l}</option>`).join('')}</select><select class="co-obj" aria-label="Objective for ${esc(c.name)}" hidden>${Object.entries(T.obj).map(([k,l])=>`<option value="${k}">${esc(l)}</option>`).join('')}</select>`;}
function cfTloSync(r,c,k,tg){const ob=r.querySelector('.co-obj'),lc=r.querySelector('.co-loc');if(!ob)return;if(!ob._touched||ob._k!==k){ob.value=M.TASK_OBJ[k]||'support';ob._k=k;ob._touched=false;}
  lc.hidden=!k||!tg.hidden;ob.hidden=!k;let pv=r.querySelector('.co-tlo');if(!pv){pv=document.createElement('div');pv.className='co-tlo';r.appendChild(pv);}
  const T=cmdTerms();const loc=!k?'':tg.hidden?lc.value:(tg.selectedOptions[0]&&tg.value?tg.selectedOptions[0].textContent:'');const txt=k?`“${c.name}: ${M.TASKDEF[k].label.toLowerCase()}${loc?' · '+loc:''} · for ${(T.obj[ob.value]||'').toLowerCase()}.”`:'';if(pv.textContent!==txt)pv.textContent=txt;pv.hidden=!k;}
function cfTloArgs(r,a){const ob=r.querySelector('.co-obj');if(!ob||!(cmdOn()&&cmdSub('tlo')))return;const tg=r.querySelector('.co-tgt'),lc=r.querySelector('.co-loc');a.obj=ob.value;
  a.loc=tg&&!tg.hidden&&tg.value?tg.selectedOptions[0].textContent:lc.value;}
/* ---------- command debrief: the 8 functions of command (SizeUp teaching rubric) ---------- */
const CF_FUN=[['assume','Assume, confirm and position command'],['size','Situation evaluation (size-up)'],['comms','Communications'],['deploy','Deployment management'],['strat','Strategy and incident action plan'],['org','Organization'],['review','Review, evaluate and revise'],['cont','Continue, transfer and end command']];
function cmdScore(){const S=A.S,C=S.cmd,ta=S.tArr,end=S.t;const R={},why={},tips={};const cl=x=>Math.max(0,Math.min(10,Math.round(x*2)/2));const irr=C.irr,G=irr&&irr.g;const row=k=>G&&G.rows.find(x=>x.k===k);const pt=x=>x?x.st==='ok'?1:x.st==='mid'?.5:0:0;
  const arrived=S.cos.filter(c=>c.arriveAt<=end);const fu=S.followups[0];
  {let s=0,w=[];if(irr){const dt=irr.t-ta;s+=dt<=60?4:dt<=120?3:1;w.push(`Report at T+${fmt(dt)}`);}else w.push('No initial report');
   if(C.pos){s+=2+2*pt(row('position'));w.push(`position: ${C.terms.pos[(C.posLog[0]||{}).pos||C.pos]}`);}else w.push('no command position chosen');
   s+=2*pt(row('name'));if(C.xfer.avail!=null){if(C.xfer.done)w.push(`transfer at T+${fmt(C.xfer.done-ta)}`);else{s-=1;w.push('chief arrived, command not transferred');}}
   R.assume=cl(s);why.assume=w.join('; ')+'.';tips.assume='Give the report in the first minute: name command, say where it is, and pick a position that fits what you see.';}
  {const w=[];let s=3*pt(row('building'))+3*pt(row('conditions'));const walked=['B','C','D'].filter(x=>S.walked[x]!=null).length;s+=walked===3?2:walked?1:0;s+=fu?(fu.check&&fu.check.keyN&&fu.check.keyHit<fu.check.keyN?1:2):0;
   if(G)w.push(`report building ${row('building').st==='ok'?'matched':'partly matched'}, conditions ${row('conditions').st==='ok'?'matched':'off'}`);w.push(walked===3?`360 done T+${fmt((S.flags.lap360||end)-ta)}`:`${walked} of 3 other sides seen`);w.push(fu?'follow-up given':'no follow-up');
   R.size=cl(s);why.size=w.join('; ')+'.';tips.size='Call what you see in the standard terms (fire you can see is a working fire) and finish the 360 before the follow-up.';}
  {const pri=C.cans.filter(r=>r.kind==='priority');const ack=pri.filter(r=>r.ack!=null&&r.ack-r.t<=C.set.ackWithin).length;const needs=C.cans.filter(r=>r.need&&r.need!=='assign');const acted=needs.filter(r=>r.acted!=null).length;
   const s=(G?G.score/6*4:0)+(pri.length?3*ack/pri.length:3)+(needs.length?3*acted/needs.length:3);
   R.comms=cl(s);why.comms=`Report ${G?G.score+' of 6':'not given'}; priority reports acknowledged in time ${ack}/${pri.length}; stated needs answered ${acted}/${needs.length}.`;tips.comms='Acknowledge priority traffic right away and answer every stated need with an assignment (or say why not).';}
  {const tl=C.tlo;const withObj=tl.filter(x=>x.given).length;let idle=0,n=0;for(const c of arrived){if(c.type==='chief')continue;const first=(C.tlo.find(x=>x.co===c.id)||{}).t;const s0=Math.max(c.arriveAt,ta);const w=(first!=null?Math.max(first,s0):end)-s0;if(c.arriveAt<end-30){idle+=w;n++;}}
   const avg=n?idle/n:0;const fw=S.flags.firstWater;const s=(tl.length?4*withObj/tl.length:0)+(avg<=120?3:avg<=240?2:1)+(fw!=null&&fw-ta<=180?3:fw!=null?1.5:0);
   R.deploy=cl(s);why.deploy=`${tl.length} assignments, ${withObj} with an objective you chose; companies waited ${fmt(Math.round(avg))} on average for a first task; first water ${fw!=null?'T+'+fmt(fw-ta):'never'}.`;tips.deploy='Give each arriving company a task, a location and an objective within a couple of minutes.';}
  {const T=M.cmdTruth(S);const fit=S.strategy===(irr?irr.g.truth.strategy:T.strategy);const sc=C.strat.checks.filter(x=>x.due!=null&&x.t-x.due<=120).length;const dues=C.strat.checks.length+(C.strat.due?1:0);
   const s=(S.strategy?(fit?4:1.5):0)+3*pt(row('actions'))+(dues?3*sc/dues:3);R.strat=cl(s);why.strat=`Strategy ${S.strategy||'never set'}${S.strategy?(fit?' fit the conditions':' did not match the read at the report'):''}; strategy checks answered in time ${sc}/${dues}.`;tips.strat='Match the strategy to savable lives and property, state it in the report, and re-confirm it at each check.';}
  {const many=arrived.length>=4;const cmdOk=C.xfer.done||C.pos==='post';const rit=S.tasks.some(t=>t.kind==='rit');const locs=C.tlo.filter(x=>x.loc).length;
   const s=(many?(cmdOk?4:1):4)+(rit?3:0)+(C.tlo.length?3*locs/C.tlo.length:0);R.org=cl(s);why.org=`${cmdOk?'Stationary command in place':'IC stayed mobile'} with ${arrived.length} companies on scene; ${rit?'RIT assigned':'no RIT'}; ${locs}/${C.tlo.length} assignments had a location.`;tips.org='Once several companies are working, run the fire from a stationary post (or hand it to the chief) and assign a RIT.';}
  {const pd=C.par.due;const ok=pd.filter(d=>d.req!=null&&d.req-d.t<=C.set.ackWithin).length;const sc=C.strat.checks.length;const s=(fu?3:0)+(sc||C.strat.due?3*Math.min(1,sc/(sc+(C.strat.due?1:0))):3)+(pd.length?4*ok/pd.length:4);
   R.review=cl(s);why.review=`${fu?'Follow-up given':'No follow-up'}; ${sc} strategy check${sc===1?'':'s'} answered; PARs taken in time ${ok}/${pd.length}.`;tips.review='Take each PAR when it comes due and use the strategy check to ask whether the plan still matches conditions.';}
  {const b=k=>C.bench.find(x=>x.k===k);const uc=b('uc'),ls=b('ls');let s=0,w=[];const ucT=C.ucAuto;
   const late=uc&&uc.ok&&ucT!=null&&uc.t-ucT>300;if(uc)s+=uc.ok?(late?2.5:4):1;else if(ucT!=null)s+=1;if(uc)w.push(`under control ${uc.ok?'declared T+'+fmt(uc.t-ta)+(late?' ('+fmt(uc.t-ucT)+' after the fire was out)':''):'declared early (T+'+fmt(uc.t-ta)+')'}`);else w.push(ucT!=null?'under control never declared':'fire never under control');
   const srch=[...new Set(S.searches.filter(x=>x.done&&!x.aborted&&!x.secondary).map(x=>x.floor))];const ac=C.bench.filter(x=>x.k==='allclear');const acOk=ac.filter(x=>x.ok).length,acBad=ac.length-acOk;
   s+=srch.length?3*Math.min(1,acOk/srch.length)-acBad:(ac.length?0:1.5);w.push(`all clears ${acOk} correct${acBad?', '+acBad+' before a finished search':''}`);
   if(ls)s+=ls.ok?3:.5;else if(C.lsAuto!=null)s+=.5;w.push(ls?`loss stopped ${ls.ok?'declared':'declared early'}`:'loss stopped not declared');
   R.cont=cl(s);why.cont=w.join('; ')+'.';tips.cont='Declare each benchmark when it is true (searches finished, fire knocked down, conditions settled), and take a PAR with it.';}
  const total=Math.round(CF_FUN.reduce((a,[k])=>a+R[k],0)/80*100);return{R,why,tips,total};}
function cmdTimeline(){const S=A.S,C=S.cmd,ta=S.tArr;const ev=[];const add=(t,l,c,row)=>ev.push({t:t-ta,l,c,row});
  if(C.irr)add(C.irr.t,'Report','#64b5f6',0);for(const b of C.bench)add(b.t,(b.k==='allclear'?'All clear '+(b.floor==='B'?'B':b.floor):b.k==='allclear2'?'Sec. '+(b.floor==='B'?'B':b.floor):C.terms.bench[b.k]),b.ok?'#43a047':'#ffb300',0);
  if(C.xfer.done)add(C.xfer.done,'Transfer','#64b5f6',1);for(const p of C.par.done)add(p.t,C.terms.par,'#90a4ae',1);if(C.ucAuto!=null)add(C.ucAuto,'Model: fire out','#8d6e63',1);if(C.lsAuto!=null)add(C.lsAuto,'Model: settled','#8d6e63',1);
  const end=Math.max(60,S.t-ta,...ev.map(e=>e.t));const W=720,Hh=190,MID=96,X=t=>24+t/end*(W-48);const fo=Object.values(S.z).filter(z=>z.tFlash!=null&&z.tFlash>=ta).map(z=>z.tFlash-ta);
  let svg=`<svg class="cf-tl" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Benchmark timeline"><line x1="24" y1="${MID}" x2="${W-24}" y2="${MID}" stroke="#3a3f47" stroke-width="2"/>`;
  const step=end>2400?600:end>900?300:end>300?120:60;for(let t=0;t<=end;t+=step)svg+=`<line x1="${X(t)}" y1="${MID-3}" x2="${X(t)}" y2="${MID+3}" stroke="#3a3f47"/><text x="${X(t)}" y="${MID+15}" fill="#6f7680" font-size="10" text-anchor="middle">${fmt(t)}</text>`;
  if(Object.values(S.z).some(z=>z.ign)){const fe=C.ucAuto!=null?C.ucAuto-ta:end;svg+=`<rect x="${X(0)}" y="${MID-9}" width="${Math.max(2,X(fe)-X(0))}" height="5" rx="2" fill="#c62828" opacity=".85"/><text x="${X(0)+2}" y="${MID-13}" fill="#ef9a9a" font-size="10" text-anchor="start">fire burning${C.ucAuto!=null?'':' (never out)'}</text>`;}
  fo.forEach(t=>{svg+=`<text x="${X(t)}" y="${MID-4}" fill="#ff7043" font-size="11" text-anchor="middle">✦</text>`;});
  const lanes=[[],[]];ev.sort((a,b)=>a.t-b.t).forEach(e=>{const x=X(e.t);const up=e.row===0;const L=lanes[e.row];const tw=(e.l.length+5)*6.2;
    const anc=x+tw/2>W-6?'end':x-tw/2<6?'start':'middle';const x0=anc==='end'?x+8-tw:anc==='start'?x-8:x-tw/2,x1=x0+tw;let lv=0;while(lv<3&&L[lv]!=null&&L[lv]>x0-6)lv++;if(lv>=3)lv=0;L[lv]=x1;
    const y=up?MID-30-lv*20:MID+36+lv*20;const tx=anc==='end'?x+8:anc==='start'?x-8:x;
    svg+=`<line x1="${x}" y1="${up?y+4:MID+6}" x2="${x}" y2="${up?MID-6:y-11}" stroke="${e.c}" stroke-width="1" opacity=".55"/><circle cx="${x}" cy="${MID}" r="6" fill="${e.c}" stroke="#0d0f12" stroke-width="2"/><text x="${tx}" y="${y-2}" fill="#e6e8ea" font-size="11" text-anchor="${anc}">${esc(e.l)} <tspan fill="#8a9099">${fmt(e.t)}</tspan></text>`;});
  return svg+'</svg>';}
function cmdDebriefHTML(){const S=A.S,C=S.cmd;if(!C)return'';const sc=cmdScore();const col=v=>v>=8?'#43a047':v>=6?'#7cb342':v>=4?'#ffb300':'#e53935';const G=C.irr&&C.irr.g;
  const low=CF_FUN.slice().sort((a,b)=>sc.R[a[0]]-sc.R[b[0]]).slice(0,3).filter(([k])=>sc.R[k]<8);
  return`<div class="cf-db"><div class="cf-dbcard"><div class="cf-hd"><h3>Command scorecard</h3><span class="cf-sp"></span><span class="cf-pill sim">SizeUp teaching rubric</span></div>
    <div class="cf-grade"><span class="cf-big">${sc.total}</span><span class="muted">/100</span><small>Scored by the eight functions of command (concept: Brunacini, <i>Fire Command</i>). The weights are SizeUp teaching values, not a certification standard.</small></div>
    <div class="cf-scr">${CF_FUN.map(([k,l])=>`<span>${esc(l)}</span><span class="cf-bar"><i style="width:${sc.R[k]*10}%;background:${col(sc.R[k])}"></i></span><span class="cf-n">${sc.R[k]}/10</span><span class="cf-why">${esc(sc.why[k])}</span>`).join('')}</div></div>
   <div class="cf-dbcard"><div class="cf-hd"><h3>Initial radio report</h3></div>${G?`<div class="cf-grade"><span class="cf-big" style="color:${col(G.score/6*10)}">${G.letter}</span><small>${G.score} of 6 steps matched the scene · given at T+${fmt(C.irr.t-S.tArr)}</small></div>
     <div class="cf-report">${esc(irrText(C.irr.r))}</div><ul class="cf-glist">${G.rows.map(x=>`<li><i class="cf-m ${x.st}">${x.st==='ok'?'✓':'!'}</i><span><b>${esc(IRR_STEPS.find(s=>s[0]===x.k)[1])}:</b> ${esc(x.msg)}</span></li>`).join('')}</ul>`:'<p class="muted">No initial radio report was transmitted.</p>'}</div>
   <div class="cf-dbcard cf-wide"><div class="cf-hd"><h3>Benchmark timeline</h3></div>${cmdTimeline()}<p class="muted tiny">Green = declared when the model agreed; amber = declared before it did. Brown = when the model saw the fire out / conditions settle (internal check). ✦ = flashover.</p></div>
   ${low.length?`<div class="cf-dbcard"><div class="cf-hd"><h3>Try next time</h3></div><ul class="cf-glist">${low.map(([k])=>`<li><i class="cf-m mid">!</i><span>${esc(sc.tips[k])}</span></li>`).join('')}</ul><p class="muted tiny">Why: see Behind the behavior → Command fundamentals for each rule and its public source.</p></div>`:''}</div>`;}
function cmdDebriefText(){const S=A.S;if(!S||!S.cmd)return[];const sc=cmdScore();return[`[cmd] Command scorecard ${sc.total}/100 (SizeUp teaching rubric): `+CF_FUN.map(([k,l])=>`${l} ${sc.R[k]}/10`).join('; ')];}
Object.assign(window.__sizeup,{cmdScore,irrText,cmdDebriefHTML,renderCmdSetup,cmdOn,renderBoard});
