/* SizeUp: dispatch/assignment setup, task-time settings, time of day & weather, and the company board. */
const PRESET_KEY='sizeup-presets-v1';
const EQ_FLAGS={groundLadders:'Ground ladders',aerial:'Aerial',fan:'PPV fan',tools:'Saws',hooks:'Hooks / pike poles'};
const TYPE_FLAGS={engine:['groundLadders','hooks'],ladder:['groundLadders','aerial','fan','tools','hooks'],rescue:['groundLadders','fan','tools','hooks'],medic:[],chief:[]};
const DIAS=['1.5','1.75','2','2.5','3'];
const SET_GROUPS=[
 ['Hoselines',[['stretchBase','Stretch: base time','s'],['stretchPerFt','Stretch: per foot of hose needed','s/ft'],['perFloor','Each floor above the first','s'],['charge','Charge the line and advance','s'],['reposition','Reposition a line','s']]],
 ['Water supply',[['layBase','Supply lay: base time','s'],['layPerFt','Supply lay: per foot to the hydrant','s/ft'],['hookup','Hydrant hookup and charge','s']]],
 ['Truck & support work',[['horizontal','Horizontal vent','s'],['vertical','Vertical vent (roof)','s'],['aerialFactor','Aerial speeds roof work (multiplier)','×'],['ppv','PPV fan set-up','s'],['pullCeiling','Pull ceiling','s'],['forceGarage','Force the garage door','s'],['ladder','Ladder a side','s'],['lights','Scene lighting set-up','s']]],
 ['Search, RIT & rehab',[['searchBase','Search: base time','s'],['searchPerFloor','Search: one floor area','s'],['secondaryFactor','Secondary search (multiplier)','×'],['rit','RIT in place','s'],['rehab','Rehab set-up','s']]],
 ['Distances',[['setback','Engine setback to the front door','ft'],['hydrantDist','Hydrant distance','ft'],['roomRun','Hose run inside to a room','ft'],['floorRun','Hose per floor (stairs)','ft'],['sideRunBD','Extra hose around to Side B/D','ft'],['sideRunC','Extra hose around to Side C','ft']]],
 ['360 & sides',[['walkSide','360: first look at each of Sides B, C, D','s'],['fence','Fence in the way of a stretch','s'],['expoProtect','Protect an exposure: set-up','s'],['expoHeat','Flame time on a side before an unprotected exposure ignites','s']]],
 ['Modifiers',[['refStaff','Reference staffing (no slow-down at or above)','members'],['shortStaff','Slower per member below reference','×'],['cold','Cold & icy: all tasks take longer','×'],['heatPer10','Heat: fatigue per 10 min of work','×'],['heatCap','Heat: fatigue cap','×']]]];
function ensureScn(sc){if(!sc.companies||!sc.companies.length){sc.companies=M.PRESETS.generic.companies();sc.presetName=sc.presetName||'generic';}
  sc.settings={...M.DEF_SET,...(sc.settings||{})};sc.env={tod:'day',precip:'none',temp:'mild',...(sc.env||{})};if(sc.windShift===undefined)sc.windShift=null;return sc;}
/* ---------- setup tabs ---------- */
A.tab='cond';
function showTab(t){A.tab=t;$$('#setupTabs button').forEach(b=>{b.classList.toggle('on',b.dataset.tab===t);b.setAttribute('aria-selected',b.dataset.tab===t);});$$('.tabp').forEach(p=>p.classList.toggle('on',p.id==='tab-'+t));
  if(t==='disp')renderDispatch();if(t==='times')renderSettings();if(t==='cmd')renderCmdSetup();}
$('#setupTabs').onclick=e=>{const b=e.target.closest('button[data-tab]');if(b)showTab(b.dataset.tab);};
function setupSummary(){const sc=A.scn;if(!sc)return'';const cos=sc.companies||[];const e=sc.env||{};const first=Math.min(...cos.map(c=>c.arrive));
  return `Assignment: ${presetLabel()} · ${cos.length} companies, ${cos.reduce((a,c)=>a+(+c.staff||0),0)} members · first due arrives ${fmt(first)} after dispatch · ${({day:'Day',dusk:'Dusk',night:'Night'})[e.tod]}${e.precip!=='none'?' · '+e.precip:''}${e.temp!=='mild'?' · '+(e.temp==='cold'?'cold & icy':'hot'):''}. Edit on the Dispatch, Time & weather and Task times tabs.`;}
/* ---------- presets ---------- */
function loadPresets(){try{return JSON.parse(localStorage.getItem(PRESET_KEY)||'{}')||{};}catch(e){return{};}}
function savePresets(p){try{localStorage.setItem(PRESET_KEY,JSON.stringify(p));return true;}catch(e){toast('Could not save presets on this device (storage blocked).');return false;}}
function presetLabel(){const n=A.scn.presetName;if(n==='generic')return M.PRESETS.generic.name;if(n&&n.startsWith('custom:'))return n.slice(7);return'Custom assignment (edited)';}
function edited(){A.scn.presetName='edited';}
/* ---------- dispatch tab ---------- */
function minTxt(sec){return +(sec/60).toFixed(2);}
function coCardHTML(c,i){const fl=TYPE_FLAGS[c.type]||[];const eq=c.eq||{};
  const tsel=`<select class="co-type" aria-label="Company type">${Object.entries(M.CO_TYPES).map(([k,v])=>`<option value="${k}"${k===c.type?' selected':''}>${esc(v)}</option>`).join('')}</select>`;
  const sum=`${esc(c.id)} · ${esc(c.name)} · ${c.staff} staff · arrives ${fmt(c.arrive)}${c.type==='engine'?` · ${eq.tank} gal · ${(eq.pre||[]).length} preconnects`:''}${fl.filter(k=>eq[k]&&c.type!=='engine').length?' · '+fl.filter(k=>eq[k]).map(k=>EQ_FLAGS[k].toLowerCase()).join(', '):''}`;
  let h=`<details class="cocard" data-i="${i}"${A.openCards&&A.openCards.has(c.id)?' open':''}><summary><span class="cot-type">${esc(M.CO_TYPES[c.type])}</span>${sum}</summary><div class="corow">${tsel}<input class="co-id" value="${esc(c.id)}" aria-label="Unit ID" maxlength="8"><input class="co-name" value="${esc(c.name)}" aria-label="Unit name" maxlength="30"><button class="iconbtn co-del" aria-label="Remove ${esc(c.name)}">✕</button></div>
   <div class="corow"><label>Staffing <select class="co-staff">${[1,2,3,4,5,6].map(n=>`<option${n===+c.staff?' selected':''}>${n}</option>`).join('')}</select></label>
   <label>Arrives <input class="co-arr" type="number" min="0" max="60" step="0.5" value="${minTxt(c.arrive)}" aria-label="Arrival, minutes after dispatch"> min after dispatch</label></div>`;
  if(c.type==='engine'){h+=`<div class="corow"><label>Tank <input class="co-eq" data-k="tank" type="number" min="0" step="50" value="${eq.tank}"> gal</label><label>Pump <input class="co-eq" data-k="pump" type="number" min="0" step="250" value="${eq.pump}"> gpm</label><label>Supply hose <input class="co-eq" data-k="supplyHose" type="number" min="0" step="50" value="${eq.supplyHose}"> ft</label></div>
    <div class="pres">${(eq.pre||[]).map((p,j)=>`<div class="prow" data-j="${j}"><input class="pr-name" value="${esc(p.name)}" aria-label="Preconnect name"><select class="pr-dia" aria-label="Diameter">${DIAS.map(d=>`<option value="${d}"${d===String(p.dia)?' selected':''}>${M.diaTxt(d)} in.</option>`).join('')}</select><input class="pr-len" type="number" min="50" step="50" value="${p.len}" aria-label="Length, ft">ft<input class="pr-gpm" type="number" min="50" step="10" value="${p.gpm}" aria-label="Flow, gpm">gpm<button class="iconbtn pr-del" aria-label="Remove preconnect">✕</button></div>`).join('')}
    <button class="btn ghost sm pr-add">+ Preconnect</button></div>`;}
  if(fl.length)h+=`<div class="corow flags">${fl.map(k=>`<label class="chk"><input type="checkbox" class="co-flag" data-k="${k}"${eq[k]?' checked':''}>${EQ_FLAGS[k]}</label>`).join('')}</div>`;
  if(c.type==='chief')h+=`<div class="corow muted">Command: arrives and stays Staged until command is transferred to him by radio from the first-arriving officer (the working IC); then he is the IC. No crew tasks in this model.</div>`;
  if(c.type==='medic')h+=`<div class="corow muted">Can set up rehab / EMS standby (helps crews recover in the heat), and can be assigned firefighting tasks by name. Quick orders never pick the medic.</div>`;
  return h+'</details>';}
function renderDispatch(){const sc=A.scn,el=$('#dispatch');if(!sc||!el)return;const P=loadPresets();
  const cur=sc.presetName==='generic'?'generic':sc.presetName&&sc.presetName.startsWith('custom:')?sc.presetName:'';
  const cos=sc.companies.slice().map((c,i)=>[c,i]).sort((a,b)=>a[0].arrive-b[0].arrive);
  el.innerHTML=`<div class="ctl"><div class="lbl">Assignment preset <span class="val" id="presetVal">${esc(presetLabel())}</span></div>
    <div class="row2"><select id="presetSel" aria-label="Assignment preset">${cur?'':'<option value="" selected>Custom assignment (edited)</option>'}<option value="generic"${cur==='generic'?' selected':''}>${esc(M.PRESETS.generic.name)}</option>${Object.keys(P).map(n=>`<option value="custom:${esc(n)}"${cur==='custom:'+n?' selected':''}>${esc(n)} (saved)</option>`).join('')}</select>
    <button class="btn ghost sm" id="presetDel"${cur.startsWith('custom:')?'':' disabled'}>Delete</button></div>
    <div class="row2" style="margin-top:8px"><input id="presetName" placeholder="Name this assignment" maxlength="40" aria-label="Preset name"><button class="btn ghost sm" id="presetSave">Save preset</button></div>
    <div class="hint">Generic, editable teaching defaults, <b>not any department's SOP</b>. Saved presets stay on this device; the assignment also travels inside exported drills. T+0 on the drill clock is when the first company arrives.</div></div>
   <div class="ctl"><div class="lbl">Water &amp; hose distances</div><div class="corow"><label>Hydrant distance <input class="set-in" data-k="hydrantDist" type="number" min="0" step="50" value="${sc.settings.hydrantDist}"> ft</label><label>Engine setback <input class="set-in" data-k="setback" type="number" min="0" step="10" value="${sc.settings.setback}"> ft</label></div>
    <div class="hint">A line must reach: setback + the run inside (or around the building). A supply lay needs at least the hydrant distance of supply hose on the laying engine.</div></div>
   <div class="ctl"><div class="lbl">Companies <span class="val">${sc.companies.length} units · ${sc.companies.reduce((a,c)=>a+(+c.staff||0),0)} members</span></div>
    <div class="cocards">${cos.map(([c,i])=>coCardHTML(c,i)).join('')}</div>
    <div class="btnrow" style="margin-top:10px">${Object.entries(M.CO_TYPES).map(([k,v])=>`<button class="btn ghost sm co-add" data-type="${k}">+ ${esc(v)}</button>`).join('')}</div>
    <div class="hint">Each company works one task at a time. It can split and take a second task only if it has enough members left over (a hoseline needs 2, or 3 for a 2½ in. line; an engine always keeps 1 at the pump). Lines on scene are limited by crews and preconnects, not by a fixed cap.</div></div>`;}
$('#dispatch').addEventListener('toggle',e=>{const d=e.target;if(!d.classList||!d.classList.contains('cocard'))return;A.openCards=A.openCards||new Set();const c=A.scn.companies[+d.dataset.i];if(!c)return;if(d.open)A.openCards.add(c.id);else A.openCards.delete(c.id);},true);
function coAt(t){const card=t.closest('.cocard');return card?A.scn.companies[+card.dataset.i]:null;}
function dispatchChanged(full){edited();rebuild();warm(2);if(full)renderDispatch();else{const v=$('#presetVal');if(v)v.textContent=presetLabel();const ps=$('#presetSel');if(ps&&!ps.querySelector('option[value=""]'))ps.insertAdjacentHTML('afterbegin','<option value="">Custom assignment (edited)</option>');if(ps)ps.value='';const d=$('#presetDel');if(d)d.disabled=true;}renderSetup();}
$('#dispatch').addEventListener('change',e=>{const t=e.target,sc=A.scn;
  if(t.id==='presetSel'){const v=t.value;if(v==='generic'){sc.companies=M.PRESETS.generic.companies();sc.presetName='generic';}else if(v.startsWith('custom:')){const P=loadPresets()[v.slice(7)];if(!P)return;sc.companies=JSON.parse(JSON.stringify(P.companies));if(P.command)sc.command=JSON.parse(JSON.stringify(P.command));sc.presetName=v;}else return;
    rebuild();warm(2);renderDispatch();renderSetup();toast(`Assignment loaded: ${presetLabel()}.`);return;}
  if(t.classList.contains('set-in')){const v=+t.value;if(!isFinite(v)||v<0){t.value=sc.settings[t.dataset.k];return;}sc.settings[t.dataset.k]=v;rebuild();renderSetup();return;}
  const c=coAt(t);if(!c)return;
  if(t.classList.contains('co-type')){const ty=t.value;c.type=ty;c.eq=M.eqDefault(ty);dispatchChanged(true);return;}
  if(t.classList.contains('co-id')){const v=t.value.trim().replace(/[^\w-]/g,'').slice(0,8);if(!v||sc.companies.some(x=>x!==c&&x.id===v)){toast('Each unit needs a unique ID.');t.value=c.id;return;}c.id=v;dispatchChanged(false);return;}
  if(t.classList.contains('co-name')){c.name=t.value.trim()||c.id;dispatchChanged(false);return;}
  if(t.classList.contains('co-staff')){c.staff=+t.value;dispatchChanged(false);return;}
  if(t.classList.contains('co-arr')){const v=+t.value;if(!isFinite(v)||v<0){t.value=minTxt(c.arrive);return;}c.arrive=Math.round(v*60);dispatchChanged(true);return;}
  if(t.classList.contains('co-eq')){const v=+t.value;if(!isFinite(v)||v<0){t.value=c.eq[t.dataset.k];return;}c.eq[t.dataset.k]=v;dispatchChanged(false);return;}
  if(t.classList.contains('co-flag')){c.eq[t.dataset.k]=t.checked;dispatchChanged(false);return;}
  const pr=t.closest('.prow');if(pr){const p=c.eq.pre[+pr.dataset.j];if(t.classList.contains('pr-name'))p.name=t.value.trim()||'Preconnect';
    else if(t.classList.contains('pr-dia'))p.dia=t.value;else{const v=+t.value;if(!isFinite(v)||v<=0){t.value=t.classList.contains('pr-len')?p.len:p.gpm;return;}if(t.classList.contains('pr-len'))p.len=v;else p.gpm=v;}dispatchChanged(false);}});
$('#dispatch').addEventListener('click',e=>{const t=e.target,sc=A.scn;
  if(t.id==='presetSave'){const n=($('#presetName').value||'').trim();if(!n)return needPick($('#presetName'));const P=loadPresets();P[n]={companies:JSON.parse(JSON.stringify(sc.companies)),...(sc.command?{command:JSON.parse(JSON.stringify(sc.command))}:{}),saved:new Date().toISOString()};if(savePresets(P)){sc.presetName='custom:'+n;renderDispatch();renderSetup();toast(`Preset saved on this device: ${n}.`);}return;}
  if(t.id==='presetDel'){const v=$('#presetSel').value;if(!v.startsWith('custom:'))return;const P=loadPresets();delete P[v.slice(7)];savePresets(P);sc.presetName='edited';renderDispatch();renderSetup();toast('Preset deleted.');return;}
  const add=t.closest('.co-add');if(add){const ty=add.dataset.type;const pre={engine:'E',ladder:'L',rescue:'R',medic:'M',chief:'BC'}[ty];let n=1;while(sc.companies.some(c=>c.id===pre+n))n++;
    const last=Math.max(0,...sc.companies.map(c=>c.arrive));A.openCards=A.openCards||new Set();A.openCards.add(pre+n);sc.companies.push(M.newCompany(ty,pre+n,`${({engine:'Engine',ladder:'Ladder',rescue:'Rescue',medic:'Medic',chief:'Battalion'})[ty]} ${n}`,ty==='chief'?1:ty==='medic'?2:3,last+60));dispatchChanged(true);return;}
  const c=coAt(t);if(!c)return;
  if(t.closest('.co-del')){if(sc.companies.length<=1){toast('Keep at least one company on the assignment.');return;}sc.companies.splice(sc.companies.indexOf(c),1);dispatchChanged(true);return;}
  if(t.closest('.pr-add')){c.eq.pre.push({name:'Preconnect '+(c.eq.pre.length+1),dia:'1.75',len:200,gpm:150});dispatchChanged(true);return;}
  if(t.closest('.pr-del')){c.eq.pre.splice(+t.closest('.prow').dataset.j,1);dispatchChanged(true);return;}});
/* ---------- task-time settings tab ---------- */
function renderSettings(){const sc=A.scn,el=$('#settings');if(!sc||!el)return;
  el.innerHTML=`<div class="ctl"><div class="hint" style="margin-top:0"><b>Teaching values, editable per drill, not SOP.</b> Each task's time is built from these: e.g. a line's time = (stretch base + per-foot × hose needed) then + per floor + charge, all × the company factor (short staffing, cold, heat fatigue). They are saved and exported with the drill.</div></div>`
   +SET_GROUPS.map(([g,rows])=>`<div class="ctl"><div class="lbl">${esc(g)}</div><div class="setgrid">${rows.map(([k,l,u])=>`<label><span>${esc(l)}</span><span><input class="set-in" data-k="${k}" type="number" min="0" step="any" value="${sc.settings[k]}" aria-label="${esc(l)}"> ${u}</span></label>`).join('')}</div></div>`).join('')
   +`<div class="ctl" style="border:0"><button class="btn ghost" id="setReset">Reset to the default teaching values</button></div>`;}
$('#settings').addEventListener('change',e=>{const t=e.target;if(!t.classList.contains('set-in'))return;const v=+t.value;if(!isFinite(v)||v<0){t.value=A.scn.settings[t.dataset.k];return;}A.scn.settings[t.dataset.k]=v;rebuild();renderSetup();});
$('#settings').addEventListener('click',e=>{if(e.target.id==='setReset'){A.scn.settings={...M.DEF_SET};rebuild();renderSettings();renderSetup();toast('Task times reset to the default teaching values.');}});
/* ---------- company board ---------- */
function coTaskList(c){return Object.keys(M.TASKDEF).filter(k=>!M.canDo(c,k)&&(k!=='expo'||M.feats(A.B,null,'exposure').length)&&(k!=='forcegarage'||A.B.openings.some(o=>o.type==='garage')));}
function needOf(k,c,pre){if(k==='line'){if(pre&&pre!=='auto'){const [e,i]=pre.split(':');const E=A.S.cos.find(x=>x.id===e);const p=E&&E.eq.pre[+i];if(p)return +p.dia>=2.5?3:2;}return 2;}return M.TASKDEF[k].need;}
function tgtHTML(k,c){const B=A.B,S=A.S;
  if(k==='line')return`<option value="">Line to…</option>`+lineOptsHTML(lineTargets());
  if(k==='hvent')return`<option value="">Window or door…</option>`+B.openings.filter(o=>o.type==='window'||(o.type==='door'&&!o.front)).map(o=>`<option value="${o.id}"${S.o[o.id].state!=='closed'?' disabled':''}>${esc(o.name)}${S.o[o.id].state!=='closed'?' (open)':''}</option>`).join('');
  if(k==='vvent')return`<option value="">Roof over…</option>`+B.zones.filter(z=>z.floor===String(B.stories)&&!z.hidden||z.attic).map(z=>`<option value="${z.id}">${esc(z.name)}</option>`).join('');
  if(k==='search1'||k==='search2')return`<option value="">Floor…</option>`+[...new Set(B.zones.filter(z=>!z.attic).map(z=>z.floor))].sort().map(f=>`<option value="${f}">Floor ${f}</option>`).join('');
  if(k==='pullceiling'){const att=B.zones.find(z=>z.attic);return`<option value="">Room…</option>`+(att?B.conns.filter(q=>q.type==='ceiling'&&(q.a===att.id||q.b===att.id)).map(q=>q.a===att.id?q.b:q.a).filter(id=>!zoneOf(id).attic).map(id=>`<option value="${id}">${esc(zname(id))}</option>`).join(''):'');}
  if(k==='forcegarage')return`<option value="">Garage door…</option>`+B.openings.filter(o=>o.type==='garage').map(o=>`<option value="${o.id}"${S.o[o.id].state!=='closed'?' disabled':''}>${esc(o.name)}${S.o[o.id].state!=='closed'?' (open)':''}</option>`).join('');
  if(k==='ladder')return`<option value="">Side…</option>`+['A','B','C','D'].map(s=>`<option value="${s}"${S.laddered[s]?' disabled':''}>Side ${s}${S.laddered[s]?' (done)':''}</option>`).join('');
  if(k==='expo')return`<option value="">Exposure…</option>`+M.feats(B,null,'exposure').map(f=>`<option value="${f.side}">${esc(f.name)} (Side ${f.side})${S.expo[f.side]&&S.expo[f.side].prot?' (protected)':''}</option>`).join('');
  if(k==='supply')return S.cos.filter(e=>e.type==='engine').map(e=>`<option value="${e.id}"${e.supplied||e.supplyBy?' disabled':''}>To ${esc(e.name)}${e===c?' (itself)':''}${e.supplied?' (supplied)':e.supplyBy?' (supply coming)':''}</option>`).join('');
  return null;}
function optHTML(k,c){const S=A.S;
  if(k==='line'){const tA=Math.max(S.t,c.arriveAt);let h='<option value="auto">Auto: first free preconnect that reaches</option>';
    for(const e of S.cos.filter(e=>e.type==='engine'&&(e===c||e.arriveAt<=tA)))(e.eq.pre||[]).forEach((p,i)=>{const used=S.water.lines.find(l=>l.eng===e.id&&l.pre===i);h+=`<option value="${e.id}:${i}"${used?' disabled':''}>${e===c?'':esc(e.id)+' '}${esc(p.name)}: ${M.diaTxt(p.dia)} in. ${p.len} ft ${p.gpm} gpm${used?` (Line ${used.id})`:''}</option>`;});return h;}
  if(k==='supply')return'<option value="forward">Forward lay (hydrant → engine)</option><option value="reverse">Reverse lay (engine → hydrant)</option>';
  return null;}
function stClass(k){return({enroute:'s-en',staged:'s-st',working:'s-wk',available:'s-av',command:'s-cmd'})[k]||'';}
// the guided transfer card (Command fundamentals with its transfer part on) handles the chief; otherwise the chief's row offers a one-step radio transfer
function bcRadioBtn(c){const S=A.S;return c.type==='chief'&&S.t>=c.arriveAt&&!M.bcInCommand(S,c)&&!(S.cmd&&S.cmd.sub.xfer);}
function renderCompanies(){const S=A.S,el=$('#coList');if(!S||!el)return;const cos=S.cos.slice().sort((a,b)=>a.arriveAt-b.arriveAt);
  const sig=cos.map(c=>c.id+c.type).join(',')+(cmdOn()&&cmdSub('tlo')?'|tlo':'');
  if(el._sig!==sig){el._sig=sig;el.innerHTML=cos.map(c=>{const tk=coTaskList(c);return`<div class="corow2" data-co="${esc(c.id)}"><div class="cohead"><b>${esc(c.id)}</b><span class="coname">${esc(c.name)}</span><span class="cost"></span></div>
      <div class="cometa"></div><div class="cotasks"></div>${c.type==='chief'?`<div class="coassign co-bc" hidden><button class="btn primary sm co-xfer">Transfer command to ${esc(c.id)} by radio</button></div>`:''}
      ${tk.length?`<div class="coassign"><select class="co-task" aria-label="Task for ${esc(c.name)}"><option value="">Assign ${esc(c.id)} to…</option>${tk.map(k=>`<option value="${k}">${esc(M.TASKDEF[k].label)}</option>`).join('')}</select><select class="co-tgt" aria-label="Target for ${esc(c.name)}" hidden></select><select class="co-opt" aria-label="Option for ${esc(c.name)}" hidden></select>${cfTloHTML(c)}<button class="btn ghost sm co-go">Assign</button></div>`:''}</div>`;}).join('');}
  for(const c of cos){const r=el.querySelector(`.corow2[data-co="${CSS.escape(c.id)}"]`);if(!r)continue;const st=M.coStatus(S,c);const cs=r.querySelector('.cost');
    if(cs.textContent!==st.txt.split(':')[0]){cs.textContent=st.k==='working'?'Working':st.txt.split(' · ')[0];}cs.className='cost '+stClass(st.k);
    const free=M.freeCrew(S,c);let meta=`${S.t<c.arriveAt?'Arrives in '+fmt(c.arriveAt-S.t)+' · ':''}${free} of ${c.staff} free`;
    if(c.type==='engine'){const low=!c.supplied&&c.tankLeft<(+c.eq.tank||0)*M.TASK.lowTankFrac;meta+=` · <span class="${low?'water-low':''}">tank ${Math.round(c.tankLeft)}/${c.eq.tank} gal</span>${c.supplied?' · supplied':c.supplyBy?' · supply coming':''}`;}
    if(c.type==='chief'){meta+=S.t>=c.arriveAt?(M.bcInCommand(S,c)?' · in command (IC)':' · on scene, staged until command is transferred'):'';const xb=r.querySelector('.co-bc');if(xb)xb.hidden=!bcRadioBtn(c);}
    if(S.cmd&&S.cmd.ic===c.id&&c.type!=='chief')meta+=' · IC';
    const me=r.querySelector('.cometa');if(me._h!==meta){me.innerHTML=meta;me._h=meta;}
    const tl=M.coTasks(S,c);const th=tl.map(x=>{if(x.line){const l=x.line;return`<div class="cot"><span>${esc(x.label)} <small>${esc(lineStatus(l))} · ${M.diaTxt(l.dia)} in. ${l.len} ft</small></span><button class="btn ghost sm co-wd" data-line="${l.id}">Withdraw</button></div>`;}
      const t=x.task;const left=!t.done&&t.end>S.t?` · ${fmt(t.end-S.t)}`:t.done&&M.CONT[t.kind]?' · in place':'';return`<div class="cot"><span>${esc(t.label)}<small>${S.t<t.start?' · starts on arrival':left}</small></span><button class="btn ghost sm co-rel" data-task="${t.id}">Release</button></div>`;}).join('');
    const te=r.querySelector('.cotasks');if(te._h!==th){te.innerHTML=th;te._h=th;}
    const ts=r.querySelector('.co-task');if(!ts)continue;const k=ts.value;const tg=r.querySelector('.co-tgt'),op=r.querySelector('.co-opt');
    const th2=k?tgtHTML(k,c):null;tg.hidden=th2==null;if(th2!=null)setOpts(tg,th2,k==='line'?defaultLine(lineTargets()):k==='supply'?(S.cos.find(e=>e.type==='engine'&&!e.supplied&&!e.supplyBy)||{}).id:'');
    const oh=k?optHTML(k,c):null;op.hidden=oh==null;if(oh!=null)setOpts(op,oh,k==='supply'?'forward':'auto');cfTloSync(r,c,k,tg);
    const need=k?needOf(k,c,op.value):0;const busy=k&&free<need;const go=r.querySelector('.co-go');const lab=busy?'Reassign':'Assign';if(go.textContent!==lab)go.textContent=lab;go.classList.toggle('warn',!!busy);
    go.title=busy?`${c.name} has ${free} free; this needs ${need}. Reassign releases its current tasks.`:'';}}
$('#coList').addEventListener('change',e=>{const s=e.target.closest('select');if(!s)return;s._touched=!!s.value;s.classList.remove('need');if(s.classList.contains('co-task')){const r=s.closest('.corow2');r.querySelector('.co-tgt')._touched=false;r.querySelector('.co-opt')._touched=false;r.querySelector('.co-tgt')._h=null;r.querySelector('.co-opt')._h=null;}renderCompanies();});
$('#coList').addEventListener('click',e=>{const r=e.target.closest('.corow2');if(!r)return;const co=r.dataset.co;
  if(e.target.closest('.co-xfer')){order({kind:'bcxfer',co});return;}
  const wd=e.target.closest('.co-wd');if(wd){order({kind:'withdraw',line:+wd.dataset.line});return;}
  const rl=e.target.closest('.co-rel');if(rl){order({kind:'release',task:+rl.dataset.task});return;}
  if(!e.target.closest('.co-go'))return;const ts=r.querySelector('.co-task'),tg=r.querySelector('.co-tgt'),op=r.querySelector('.co-opt');const k=ts.value;if(!k)return needPick(ts);
  if(!tg.hidden&&!tg.value)return needPick(tg);const c=A.S.cos.find(x=>x.id===co);const replace=M.freeCrew(A.S,c)<needOf(k,c,op.value);
  const a={kind:'assign',co,task:k};if(replace)a.replace=true;
  if(k==='line'){a.target=tg.value;if(op.value&&op.value!=='auto')a.pre=op.value;}else if(k==='hvent'||k==='forcegarage')a.opening=tg.value;else if(k==='vvent'||k==='pullceiling')a.zone=tg.value;
  else if(k==='search1'||k==='search2')a.floor=tg.value;else if(k==='ladder'||k==='expo')a.side=tg.value;else if(k==='supply'){a.to=tg.value;a.mode=op.value;}
  cfTloArgs(r,a);ts._touched=false;tg._touched=false;op._touched=false;ts.value='';order(a);});
/* ---------- precipitation overlay (drawn over the photo in scene units) ---------- */
const WX={kind:null,ps:[],t:performance.now()};
function drawWeather(c){const S=A.S;if(!S||A.screen<3)return;const e=S.scn.env||{};const kind=e.precip;if(kind!=='rain'&&kind!=='snow'){WX.kind=null;return;}
  const B=curView()||A.B,W=B.W,H=B.H,U=H/800;const t=performance.now();const dt=Math.min(.05,(t-WX.t)/1000);WX.t=t;const wind=SizeupVisual.windPx(S.wind)*(kind==='rain'?5:2.2)*U;
  const N=kind==='rain'?300:240;if(WX.kind!==kind||WX.ps.length!==N){WX.kind=kind;WX.ps=[];for(let i=0;i<N;i++)WX.ps.push({x:Math.random()*W,y:Math.random()*H,z:.5+Math.random()*.9,ph:Math.random()*7});}
  const night=e.tod==='night',lit=!!S.lights;c.save();c.beginPath();c.rect(0,0,W,H);c.clip();
  if(kind==='rain'){c.lineCap='round';const a=night?(lit?.34:.2):.3;c.strokeStyle=`rgba(${night?'170,185,210':'215,225,240'},${a})`;c.beginPath();
    for(const p of WX.ps){const sp=(900+500*p.z)*U;p.y+=sp*dt;p.x+=wind*dt;if(p.y>H){p.y-=H+40*U;p.x=Math.random()*W;}if(p.x>W)p.x-=W;if(p.x<0)p.x+=W;const len=(20+18*p.z)*U;c.lineWidth=(.8+.9*p.z)*U;
      c.moveTo(p.x,p.y);c.lineTo(p.x-wind/sp*len,p.y-len);}c.stroke();}
  else{const a=night?(lit?.8:.5):.85;c.fillStyle=`rgba(${night?'200,205,220':'255,255,255'},${a})`;
    for(const p of WX.ps){p.y+=(55+45*p.z)*U*dt;p.x+=(wind*.6+Math.sin(t/900+p.ph)*14*U)*dt;if(p.y>H){p.y-=H+10*U;p.x=Math.random()*W;}if(p.x>W)p.x-=W;if(p.x<0)p.x+=W;c.beginPath();c.arc(p.x,p.y,(1.3+2.2*p.z)*U,0,7);c.fill();}}
  c.restore();}
/* ---------- debrief: companies & tasks ---------- */
function companyDebrief(add,at){const S=A.S;const log=S.taskLog||[];
  for(const c of S.cos.slice().sort((a,b)=>a.arriveAt-b.arriveAt)){const mine=log.filter(x=>x.co===c.id);const arr=c.arriveAt<=S.t?`on scene ${at(c.arriveAt)}`:'did not arrive before the drill ended';
    const parts=mine.map(x=>x.gpm!=null?`Line ${x.id} → ${x.label} (${M.diaTxt(x.dia)} in. ${x.len} ft, ordered ${at(x.start)}${x.firstFlow!=null?', water '+at(x.firstFlow):''}${x.withdrawnAt!=null?', withdrawn '+at(x.withdrawnAt):''})`
      :`${x.label} (${at(x.start)}${x.doneAt!=null?' → '+(M.CONT[x.kind]?'in place ':'done ')+at(x.doneAt):x.released!=null?' → released '+at(x.released):''})`);
    add(mine.length?'ok':c.type==='chief'?'ok':'mid',`${c.name} (${c.staff}): ${arr}`,mine.length?parts.join(' · '):c.type==='chief'?'Command.':'Never assigned. Staged companies are resources you could have used.',[]);}
  const sup=log.filter(x=>x.kind==='supply');const dry=S.events.filter(e=>/^Tank water exhausted/.test(e.msg));
  if(sup.some(x=>x.done))add('ok',`Water supply: ${sup.filter(x=>x.done).map(x=>`${S.cos.find(c=>c.id===x.co).name} ${x.mode} lay to ${S.cos.find(c=>c.id===x.to).name} at ${at(x.doneAt)}`).join('; ')}`,dry.length?dry.map(e=>`${at(e.t)} ${e.msg}`).join(' · '):'No engine ran its tank dry.',['lines']);
  else add(dry.length?'no':'mid','No supply line connected',dry.length?dry.map(e=>`${at(e.t)} ${e.msg}`).join(' · '):'Lines ran on tank water only.',['lines']);
  const rit=log.find(x=>x.kind==='rit');add(rit?'ok':'mid',rit?`RIT: ${S.cos.find(c=>c.id===rit.co).name} assigned at ${at(rit.start)}`:'No RIT assigned','',[]);
  const e=S.scn.env||{};if(e.tod&&e.tod!=='day'){const li=log.find(x=>x.kind==='lights');add(li&&li.done?'ok':'mid',li&&li.done?`Scene lighting up at ${at(li.doneAt)}`:'No scene lighting',li&&li.done?'Smoke color and the building were easier to read after that.':'At '+e.tod+' smoke color is hard to read without scene lighting.',['night']);}
  S.events.filter(x=>x.kind==='wind').forEach(x=>add('mid',`Wind shift at ${at(x.t)}`,x.msg,['wind']));}
