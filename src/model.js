/* SizeUp fire-state model. Simple, explainable, deterministic (seeded). NOT a CFD/zone model.
   Each rule is tagged with a source key (see SOURCES in app) or marked as a simplification. */
const SizeupModel=(()=>{
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function rng(seed){let s=seed>>>0;return()=>{s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Fuel profiles. Times calibrated so a closed modern house goes ventilation-limited ~5 min and legacy ~18 min,
// and the time from ventilation to flashover is ~2 min (modern) vs >8 min (legacy). [FSRI-VV summary report]
const FUEL={modern:{tg:250,tau:22,tauT:50,smoke:1.35,load:1000,label:'Modern synthetic contents'},
            legacy:{tg:1400,tau:100,tauT:190,smoke:.85,load:2600,label:'Legacy (natural-material) contents'}};
const CONN_K={open:1,stair:.85,door_open:.9,door_closed:.025,ceiling:.02,ceiling_breached:.6,wall:.004};
const OPEN_K={window:.5,door:1,garage:1.5,roof:1.25};
const TASK={kdHold:10,rekindleDry:600,rekindleDryExt:120,noFireShutdown:20,lowTankFrac:.25,
  // simplifications (not FSRI values): knockdown hold, low-tank warning level (fraction of each engine's tank),
  // and how long a knocked-down room must sit dry before it can rekindle. Task times live in DEF_SET (editable per drill).
  gpm:150};
/* Editable TEACHING VALUES for task times and distances (not SOP, not FSRI). Each drill carries its own copy in scn.settings. */
const DEF_SET={stretchBase:35,stretchPerFt:.08,perFloor:30,charge:15,reposition:30,layBase:45,layPerFt:.15,hookup:45,
  horizontal:15,vertical:300,aerialFactor:.8,ppv:60,searchBase:60,searchPerFloor:120,secondaryFactor:1.3,pullCeiling:30,ladder:45,rit:60,lights:90,rehab:60,
  setback:50,hydrantDist:400,roomRun:25,floorRun:20,sideRunBD:40,sideRunC:80,
  refStaff:4,shortStaff:.15,cold:1.2,heatPer10:.1,heatCap:.3};
const CO_TYPES={engine:'Engine',ladder:'Ladder/Truck',rescue:'Rescue/Squad',medic:'Medic',chief:'Battalion Chief'};
const TYPE_CH={engine:'e',ladder:'l',rescue:'r',medic:'m',chief:'c'};
// generic, editable equipment defaults (NOT any department's SOP)
function preDefault(){return[{name:'Preconnect 1',dia:'1.75',len:200,gpm:150},{name:'Preconnect 2',dia:'1.75',len:200,gpm:150},{name:'2½ in. preconnect',dia:'2.5',len:200,gpm:250}];}
function eqDefault(type){return type==='engine'?{tank:1000,pump:1500,pre:preDefault(),supplyHose:1000,groundLadders:true,hooks:true}
  :type==='ladder'?{groundLadders:true,aerial:true,fan:true,tools:true,hooks:true}:type==='rescue'?{groundLadders:true,aerial:false,fan:true,tools:true,hooks:true}:{};}
function newCompany(type,id,name,staff,arrive){return{id,type,name,staff,arrive,eq:eqDefault(type)};}
// arrival = seconds after dispatch; T+0 in the drill is when the first company arrives
const PRESETS={generic:{name:'Generic first alarm (residential)',companies:()=>[newCompany('engine','E1','Engine 1',4,240),newCompany('medic','M1','Medic 1',2,330),
  newCompany('engine','E2','Engine 2',3,360),newCompany('chief','BC1','Battalion 1',1,390),newCompany('ladder','L1','Ladder 1',4,420),newCompany('engine','E3','Engine 3',3,480),newCompany('rescue','R1','Rescue 1',3,540)]}};
const TASKDEF={
  line:{label:'Stretch a hoseline',need:2,types:'elr',pref:'elr'},
  supply:{label:'Lay a supply line',need:1,types:'e',pref:'e'},
  hvent:{label:'Horizontal vent',need:1,types:'elr',pref:'lre'},
  vvent:{label:'Vertical vent (roof)',need:2,types:'elr',pref:'lre',eq:c=>c.eq.tools&&(c.eq.aerial||c.eq.groundLadders),why:'needs saws/hooks and a ladder or aerial'},
  ppv:{label:'PPV fan at the entry',need:1,types:'elr',pref:'lre',eq:c=>c.eq.fan,why:'needs a fan'},
  doorcontrol:{label:'Door control at the entry',need:1,types:'elr',pref:'elr'},
  search1:{label:'Primary search',need:2,types:'elr',pref:'rle'},
  search2:{label:'Secondary search',need:2,types:'elr',pref:'rle'},
  pullceiling:{label:'Pull ceiling',need:2,types:'elr',pref:'lre',eq:c=>c.eq.hooks||c.eq.tools,why:'needs hooks'},
  ladder:{label:'Ladder the building',need:2,types:'elr',pref:'lre',eq:c=>c.eq.groundLadders||c.eq.aerial,why:'needs ground ladders or an aerial'},
  rit:{label:'RIT (rapid intervention)',need:2,types:'elr',pref:'rle'},
  lights:{label:'Scene lighting',need:1,types:'elr',pref:'lre'},
  rehab:{label:'Rehab / EMS standby',need:1,types:'m',pref:'m'}};
const CONT={doorcontrol:1,rit:1,rehab:1,supply:1}; // tasks that keep their crew committed until released
function diaTxt(d){return({'1.5':'1½','1.75':'1¾','2':'2','2.5':'2½','3':'3'})[String(d)]||String(d);}
function coById(S,id){return S.cos.find(c=>c.id===id);}
function crewUsed(S,c){let n=c.type==='engine'?1:0;for(const l of S.water.lines)if(l.co===c.id)n+=l.crew;for(const t of S.tasks)if(t.co===c.id&&t.active)n+=t.crew;return n;}
function freeCrew(S,c){return Math.max(0,c.staff-crewUsed(S,c));}
// time multiplier for a company: short staffing, cold/ice, heat fatigue (all simplifications)
function coF(S,c){const st=S.set,e=S.scn.env||{};let f=1+st.shortStaff*Math.max(0,st.refStaff-c.staff);if(e.temp==='cold')f*=st.cold;
  if(e.temp==='hot')f*=1+Math.min(st.heatCap,st.heatPer10*(c.work||0)/600);return f;}
function canDo(c,kind){const d=TASKDEF[kind];if(!d)return'unknown task';if(!d.types.includes(TYPE_CH[c.type]))return`a ${CO_TYPES[c.type]} doesn't take that task here`;if(d.eq&&!d.eq(c))return d.why;return null;}
function coTasks(S,c){return[...S.water.lines.filter(l=>l.co===c.id).map(l=>({line:l,label:`Line ${l.id}: ${l.label}`,crew:l.crew})),...S.tasks.filter(t=>t.co===c.id&&t.active).map(t=>({task:t,label:t.label,crew:t.crew}))];}
// hose needed from the engine to the target: setback + run inside (or around the building) + floors (teaching values)
function hoseNeed(S,spec){const st=S.set;let ft=st.setback;
  if(spec.ext){const o=S.o[spec.opening];const side=o?o.side:'A';ft+=side==='C'?st.sideRunC:(side==='B'||side==='D')?st.sideRunBD:0;
    if(spec.roof)ft+=st.floorRun*S.B.stories+20;else{const z=S.B.zones.find(z=>z.id===spec.zone);const f=z?floorNum(z.floor):1;ft+=15+st.floorRun*Math.max(0,Math.min(f,9)-1);}}
  else{const z=S.B.zones.find(z=>z.id===(spec.via||spec.zone));const f=z?floorNum(z.floor):1;ft+=st.roomRun+st.floorRun*Math.max(0,f-1)+(z&&z.hidden?20:0)+(spec.via?10:0);}
  return Math.round(ft);}
function lineTimes(S,c,spec,need){const st=S.set,f=coF(S,c),up=Math.max(0,lineFloor(S,spec)-1);
  if(spec.ext)return{enter:null,ready:(st.stretchBase+st.stretchPerFt*need+st.charge+(spec.roof?st.perFloor*S.B.stories:0))*f};
  const enter=(st.stretchBase+st.stretchPerFt*need)*f;return{enter,ready:enter+(st.perFloor*up+st.charge+(spec.via?st.pullCeiling:0))*f};}
function engAvail(S,eng,tA){return S.cos.find(c=>c.id===eng&&c.type==='engine'&&c.arriveAt<=tA);}
function preUsed(S,eng,i){return S.water.lines.some(l=>l.eng===eng&&l.pre===i);}
// pick a preconnect this company can stretch: its own engine first, then any engine on scene by then
function pickPre(S,c,need,tA,want){const engs=[...(c.type==='engine'?[c]:[]),...S.cos.filter(e=>e.type==='engine'&&e!==c&&e.arriveAt<=tA)];let longest=0,any=false;
  for(const big of want==='big'?[true]:want==='small'?[false]:[false,true])for(const e of engs)(e.eq.pre||[]).forEach((p,i)=>{if(preUsed(S,e.id,i))return;any=true;longest=Math.max(longest,p.len);});
  for(const big of want==='big'?[true]:want==='small'?[false]:[false,true])for(const e of engs){const ps=e.eq.pre||[];for(let i=0;i<ps.length;i++){const p=ps[i];if(preUsed(S,e.id,i)||p.len<need)continue;if((+p.dia>=2.5)!==big)continue;return{eng:e.id,pre:i,p};}}
  return{none:true,any,longest};}
function lineCrew(p){return +p.dia>=2.5?3:2;}
function floorNum(f){return f==='B'?0:f==='Attic'?99:f==='Roof'?100:+f;}

function create(B,scn){
  const R=rng(scn.seed||1);
  const S={B,scn,t:0,tArr:scn.preburn||360,z:{},o:{},c:{},events:[],fan:null,doorControl:false,
    water:{tank:0,supplyAt:null,supply:false,lines:[],nextId:1},tasks:[],taskLog:[],nextTask:1,laddered:{},lights:false,rehab:false,wind:{...(scn.wind||{dir:'calm',spd:0})},set:{...DEF_SET,...(scn.settings||{})},crews:[],searches:[],ext:[],pending:[],flags:{},victim:null,rnd:R,hist:[]};
  for(const z of B.zones)S.z[z.id]={id:z.id,ign:false,tIgn:0,q:0,T:0,s:0,R:1,fuel:1,flashed:false,tFlash:null,vl:false,out:false,wet:0,wetRegrow:600,water:0,steam:0,decay:false,breached:false,dose:0,kd:0,suppressed:false,smold:0,extOnly:true,vf:z.vol||1,attic:!!z.attic,floor:z.floor,showT:0};
  for(const o of B.openings)S.o[o.id]={id:o.id,state:(scn.openings&&scn.openings[o.id])||o.init||'closed',fail:0,failAt:40+R()*50,zone:o.zone,type:o.type,side:o.side,dyn:false};
  for(const c of B.conns){let st=c.type==='door'?((scn.doors&&scn.doors[c.id])||c.init||'closed'):c.type;S.c[c.id]={id:c.id,a:c.a,b:c.b,type:c.type,state:st};}
  // occupant (hidden from the player)
  const occ=scn.occupant||'none';
  if(occ!=='none'){let zid=occ;if(occ==='random'){const cand=B.zones.filter(z=>!z.attic&&z.floor!=='1'&&z.id!=='stair'&&!/^h\d|hall/.test(z.id));zid=cand[Math.floor(R()*cand.length)].id;}
    else if(occ==='bytime')zid=occByTime(B,(scn.env||{}).tod||'day',R);
    if(zid)S.victim={zone:zid,status:'inside',dose:0};}
  // companies on the assignment (generic first alarm if the drill has none); T+0 = first arrival
  const cos=(scn.companies&&scn.companies.length?scn.companies:PRESETS.generic.companies());const first=Math.min(...cos.map(c=>+c.arrive||0));
  S.cos=cos.map(c=>{const eq={...eqDefault(c.type),...JSON.parse(JSON.stringify(c.eq||{}))};const o={id:c.id,type:c.type,name:c.name||c.id,staff:Math.max(1,Math.min(6,+c.staff||1)),arrive:+c.arrive||0,eq,
    arriveAt:S.tArr+((+c.arrive||0)-first),arrived:false,work:0,tankLeft:c.type==='engine'?+eq.tank||0:0,supplied:false};return o;});
  const ws=scn.windShift;if(ws&&ws.at>0&&ws.dir)S.pending.push({t:S.tArr+ws.at,kind:'wind',dir:ws.dir,spd:ws.spd||0,sched:true});
  const o0=S.z[scn.origin];if(o0){o0.ign=true;o0.tIgn=0;}
  return S;
}
// occupancy likelihood by time of day (simplification, not sourced): homes are most likely occupied (asleep, in bedrooms) at night;
// a business is occupied during the day and closed after hours.
const OCC_P={home:{day:.35,dusk:.6,night:.9},biz:{day:.7,dusk:.35,night:0}};
function occByTime(B,tod,R){const zs=B.zones.filter(z=>!z.attic&&!z.hidden&&z.id!=='stair'&&!/garage|stair|foyer|landing|hall/i.test(z.name));
  const biz=zs.filter(z=>/store|shop|office|business/i.test(z.name)),home=zs.filter(z=>!biz.includes(z));const pick=a=>a[Math.floor(R()*a.length)];
  if(biz.length&&R()<OCC_P.biz[tod]){return pick(biz).id;}
  if(home.length&&R()<OCC_P.home[tod]){const beds=home.filter(z=>/bed|apartment/i.test(z.name));return pick(tod==='night'&&beds.length?beds:home).id;}
  return null;}
function front(S){return S.B.openings.find(o=>o.front);}
function connK(S,c){if(c.type==='door')return c.state==='open'?CONN_K.door_open:CONN_K.door_closed;if(c.type==='ceiling')return c.state==='breached'?CONN_K.ceiling_breached:CONN_K.ceiling;return CONN_K[c.type]||0;}
function openK(S,o){const st=o.state;let k=OPEN_K[o.type]||.5;
  if(st==='closed')return o.type==='window'?.004:.007;
  if(st==='controlled')return .15; // door control: pulled closed to the width of a hoseline [FSRI-VV 4.2]
  let w=1;const wd=S.wind||S.scn.wind;if(wd&&wd.dir&&wd.dir!=='calm'&&wd.dir===o.side&&o.type!=='roof')w=1+[.4,.9,1.6][wd.spd||0]; // wind into an opening (simplification)
  return k*w;}
// air available to each zone: own openings + neighbors through connections (flow path) — relaxation over the graph
function airMap(S){const own={},hi={};for(const id in S.z){own[id]=0;hi[id]=0;}
  for(const id in S.o){const o=S.o[id];const k=openK(S,o);own[o.zone]+=k;if(o.type==='roof'&&o.state!=='closed')hi[o.zone]+=k;}
  if(S.fan&&S.fan.on){const fo=S.o[S.fan.at];if(fo&&fo.state!=='closed')own[fo.zone]+=1.6;}
  let air={...own};
  for(let it=0;it<4;it++){const nx={...own};for(const cid in S.c){const c=S.c[cid],k=connK(S,c);if(k<=0)continue;nx[c.a]+=k*air[c.b]*.6;nx[c.b]+=k*air[c.a]*.6;}air=nx;}
  // high exhaust in the zone or directly connected increases entrainment through low inlets [FSRI-VV 4.3, 4.7]
  const hiAny={};for(const id in S.z){hiAny[id]=hi[id];}
  for(const cid in S.c){const c=S.c[cid],k=connK(S,c);hiAny[c.a]+=hi[c.b]*k;hiAny[c.b]+=hi[c.a]*k;}
  for(const id in air)air[id]*=1+Math.min(.9,hiAny[id]*.7);
  return {own,air,hi:hiAny};}
function fmtS(s){s=Math.round(s);return s<60?s+' s':`${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function ev(S,kind,msg,extra){S.events.push({t:S.t,kind,msg,...(extra||{})});}
function zname(S,id){const z=S.B.zones.find(z=>z.id===id);return z?z.name:id;}
function oname(S,id){const o=S.B.openings.find(o=>o.id===id);if(o)return o.name;if(String(id).startsWith('roof:'))return`Roof vent over ${zname(S,id.slice(5))}`;return id;}
function isTop(S,zid){const z=S.B.zones.find(z=>z.id===zid);return z&&z.floor===String(S.B.stories);}
// what a hoseline order means: interior to a room, exterior through an opening, or attic/cockloft through a pulled ceiling
function lineSpec(S,t){t=String(t||'');
  if(t.startsWith('ext:')){const oid=t.slice(4);const o=S.o[oid];if(!o)return null;const roof=o.type==='roof';
    return{ext:true,opening:oid,zone:o.zone,via:null,key:'ext:'+oid,roof,label:`${oname(S,oid)}${roof?' (into '+zname(S,o.zone)+')':''} (exterior)`,desc:`exterior water through ${oname(S,oid)}${roof?' into the '+zname(S,o.zone):''}`,time:TASK.stretch+(roof?TASK.perFloor*S.B.stories:0)};}
  if(t.startsWith('attic:')){const via=t.slice(6);const vz=S.B.zones.find(z=>z.id===via);const att=S.B.zones.find(z=>z.attic);if(!vz||!att)return null;
    if(!S.B.conns.some(c=>c.type==='ceiling'&&((c.a===via&&c.b===att.id)||(c.b===via&&c.a===att.id))))return null;const up=Math.max(0,floorNum(vz.floor)-1);
    return{ext:false,zone:att.id,via,opening:null,key:'attic:'+via,label:`${att.name} via ${vz.name}`,desc:`interior line to ${vz.name}, pull the ceiling to reach the ${att.name}`,time:TASK.stretch+TASK.perFloor*up+15+TASK.pullCeiling};}
  const z=S.B.zones.find(z=>z.id===t);if(!z||z.attic)return null;const up=Math.max(0,floorNum(z.floor)-1);
  return{ext:false,zone:t,via:null,opening:null,key:t,label:z.name,desc:`interior line to ${z.name}`,time:TASK.stretch+TASK.perFloor*up+15};}
function lineFloor(S,l){const z=S.B.zones.find(z=>z.id===(l.via||l.zone));return z?floorNum(z.floor):1;}
// zones a flowing line puts water on, and how much (1 = full stream). Spill into open-connected areas is a simplification.
function lineReach(S,l){const r={};const k=l.w||1;const add=(id,w)=>{if(S.z[id])r[id]=Math.max(r[id]||0,w*k);};
  if(l.ext)add(l.zone,.85); // exterior: limited to line of sight into the room through that opening [FSRI-FA water mapping]
  else if(l.via){add(l.zone,.8);add(l.via,.6);} // through a pulled ceiling into the attic/cockloft (simplification)
  else{add(l.zone,1);for(const cid in S.c){const c=S.c[cid];if(connK(S,c)>=.85){if(c.a===l.zone)add(c.b,.45);if(c.b===l.zone)add(c.a,.45);}}}
  return r;}

/* ---------- companies & tasks ---------- */
function busyMsg(S,c,need,what){const tk=coTasks(S,c).map(x=>x.label).join('; ');const free=freeCrew(S,c);
  return `${c.name} is busy${tk?' ('+tk+')':''}: ${free} of ${c.staff} member${c.staff===1?'':'s'} free${c.type==='engine'?' (1 stays at the pump)':''}, and ${what} needs ${need}. Release or reassign a task, or pick another company.`;}
function autoPick(S,kind,fit){const d=TASKDEF[kind];let best=null;
  for(const c of S.cos){if(canDo(c,kind))continue;const tA=Math.max(S.t,c.arriveAt);const r=fit(c,tA);if(!r)continue;
    const k=[tA,d.pref.indexOf(TYPE_CH[c.type]),c.arriveAt];if(!best||k[0]<best.k[0]||(k[0]===best.k[0]&&(k[1]<best.k[1]||(k[1]===best.k[1]&&k[2]<best.k[2]))))best={c,r,k};}
  return best;}
function addTask(S,c,kind,p,base,label){const tA=Math.max(S.t,c.arriveAt);const d=base*coF(S,c);
  const t={id:S.nextTask++,co:c.id,kind,crew:TASKDEF[kind].need,start:tA,end:Math.round(tA+d),active:true,done:false,label,...p};S.tasks.push(t);S.taskLog.push(t);c.everWorked=true;
  S.pending.push({t:t.end,kind:'_task',task:t.id});S.pending.sort((x,y)=>x.t-y.t);return t;}
function addLine(S,c,spec,pk,need){const W=S.water;const tA=Math.max(S.t,c.arriveAt);const tm=lineTimes(S,c,spec,need);const E=coById(S,pk.eng);
  const l={id:W.nextId++,...spec,co:c.id,eng:pk.eng,pre:pk.pre,gpm:+pk.p.gpm||150,dia:String(pk.p.dia),len:+pk.p.len,preName:pk.p.name,crew:lineCrew(pk.p),need,start:tA,readyAt:tA+tm.ready,flowing:false};
  if(!spec.ext)l.entering=tA+tm.enter;W.lines.push(l);S.taskLog.push(l);c.everWorked=true;
  ev(S,'order',`Line ${l.id} ordered: ${spec.desc} (${c.name}, ${E.id===c.id?'':E.name+' '}${pk.p.name}: ${diaTxt(l.dia)} in., ${l.len} ft, ${l.gpm} gpm; needs about ${need} ft${tA>S.t?'; starts when '+c.name+' arrives':''}; in position in about ${fmtS(tA-S.t+tm.ready)}).`);
  if(spec.ext)S.flags.extOrdered=true;return l;}
function releaseTask(S,t,log){t.active=false;t.released=S.t;const c=coById(S,t.co);
  if(t.kind==='doorcontrol'&&!S.tasks.some(x=>x.kind==='doorcontrol'&&x.active)){S.doorControl=false;const F=front(S);const fo=F&&S.o[F.id];if(fo&&fo.state==='controlled')fo.state='open';}
  if(t.kind==='search1'||t.kind==='search2'){const s=S.searches.find(s=>s.task===t.id);if(s&&!s.done){s.done=true;s.aborted=true;s.released=true;}}
  if(t.kind==='supply'&&!t.done){const to=coById(S,t.to);if(to)to.supplyBy=null;}
  if(t.kind==='rehab')S.rehab=S.tasks.some(x=>x.kind==='rehab'&&x.active&&x.done);
  if(log)ev(S,'order',`${c.name} released from ${t.label}${t.done||CONT[t.kind]?'':' (not finished)'}.`);}
function releaseAll(S,c){let n=0;for(const t of S.tasks)if(t.co===c.id&&t.active){releaseTask(S,t,true);n++;}
  const ls=S.water.lines.filter(l=>l.co===c.id);for(const l of ls){doAction(S,{kind:'withdraw',line:l.id});n++;}return n;}
function coStatus(S,c){if(S.t<c.arriveAt)return{k:'enroute',txt:`En route · ${fmtS(c.arriveAt-S.t)}`};
  const tk=coTasks(S,c);if(!tk.length)return{k:c.everWorked?'available':'staged',txt:c.everWorked?'Available':'Staged'};
  const parts=tk.map(x=>{if(x.line){const l=x.line;return S.t<l.readyAt?`${x.label} · ${fmtS(l.readyAt-S.t)}`:`${x.label} · ${l.flowing?'flowing':'in position'}`;}
    const t=x.task;return !t.done&&t.end>S.t?`${t.label} · ${fmtS(t.end-S.t)}`:`${t.label}${CONT[t.kind]?' · in place':''}`;});
  return{k:'working',txt:'Working: '+parts.join(' + ')};}
function openEntryNow(S,why){const F=front(S);const fdo=F&&S.o[F.id];if(fdo&&fdo.state==='closed'){fdo.state=S.doorControl?'controlled':'open';ev(S,'vent',`${F.name} opened for ${why}${S.doorControl?' (door controlled)':''}. Opening a door is a ventilation action.`,{src:'FSRI-CFA'});S.flags.entryOpenedAt=S.flags.entryOpenedAt??S.t;}}
/* ---------- actions ---------- */
function act(S,a){a={...a,t:a.t==null?S.t:a.t};S.pending.push(a);S.pending.sort((x,y)=>x.t-y.t);}
function doAction(S,a){const F=front(S);const fdo=F&&S.o[F.id];
  const openEntry=(why,at)=>{if(at!=null&&at>S.t){S.pending.push({t:at,kind:'_open',why});S.pending.sort((x,y)=>x.t-y.t);return;}openEntryNow(S,why);};
  switch(a.kind){
  case 'strategy':S.strategy=a.v;ev(S,'order',`Strategy: ${a.v}.`);if(a.v==='Defensive'){const gone=S.water.lines.filter(l=>!l.ext);gone.forEach(l=>l.withdrawnAt=S.t);S.water.lines=S.water.lines.filter(l=>l.ext);S.searches.forEach(s=>{if(!s.done){s.done=true;s.aborted=true;const t=S.tasks.find(t=>t.id===s.task);if(t)t.active=false;}});ev(S,'order','Interior crews withdrawn'+(gone.length?` (${gone.map(l=>'Line '+l.id).join(', ')} pulled out)`:'')+'.');}break;
  case 'line':{const W=S.water;
    if(a.target==='none'){if(W.lines.length){W.lines.forEach(l=>l.withdrawnAt=S.t);W.lines=[];ev(S,'order','All hoselines withdrawn.');}break;}
    const spec=lineSpec(S,a.target);if(!spec)break;
    if(!spec.ext&&S.strategy==='Defensive'){ev(S,'note','Interior line not deployed: strategy is defensive.');break;}
    if(W.lines.some(l=>l.key===spec.key)){ev(S,'note',`A line is already assigned to ${spec.label}.`);break;}
    const need=hoseNeed(S,spec);
    if(a.co){const c=coById(S,a.co);if(!c)break;const why=canDo(c,'line');if(why){ev(S,'note',`${c.name} can't stretch a line: ${why}.`);break;}
      if(a.replace)releaseAll(S,c);
      const tA=Math.max(S.t,c.arriveAt);let pk;
      if(a.pre){const [eng,ix]=String(a.pre).split(':');const E=engAvail(S,eng,tA);const p=E&&(E.eq.pre||[])[+ix];
        if(!p){ev(S,'note',`${c.name} can't use that preconnect: ${eng} is not on scene${tA>S.t?' when '+c.name+' arrives':''}.`);break;}
        if(preUsed(S,eng,+ix)){ev(S,'note',`${E.name}'s ${p.name} is already stretched.`);break;}
        if(p.len<need){ev(S,'note',`Hose too short: ${E.name}'s ${p.name} is ${p.len} ft, but ${spec.label} needs about ${need} ft (setback ${S.set.setback} ft + the run to the room). Pick a longer line or change the setback.`,{hose:true});break;}
        pk={eng,pre:+ix,p};}
      else{pk=pickPre(S,c,need,tA,a.big?'big':null);if(pk.none){ev(S,'note',pk.any?`Hose too short: no free preconnect reaches ${spec.label} (needs about ${need} ft; longest free line is ${pk.longest} ft).`:`No free preconnect for ${c.name}: every engine line on scene is already stretched.`,{hose:pk.any});break;}}
      const crew=lineCrew(pk.p);if(freeCrew(S,c)<crew){ev(S,'note',busyMsg(S,c,crew,'a '+diaTxt(pk.p.dia)+' in. line'),{busy:c.id});break;}
      addLine(S,c,spec,pk,need,a.reassignOf);break;}
    // quick order: the soonest company that can staff it
    const best=autoPick(S,'line',(c,tA)=>{const pk=pickPre(S,c,need,tA,a.big?'big':null);if(pk.none)return null;return freeCrew(S,c)>=lineCrew(pk.p)?pk:null;});
    if(!best){const pk=pickPre(S,{type:'x'},need,1e9,null);
      ev(S,'note',pk.none&&pk.any?`Hose too short: no free preconnect reaches ${spec.label} (needs about ${need} ft; longest free line is ${pk.longest} ft).`:`No company available to stretch a line to ${spec.label}: every crew on the assignment is committed or no engine line is free. Release a task, or add companies on the Dispatch tab.`,{hose:pk.none&&pk.any});break;}
    addLine(S,best.c,spec,best.r,need);break;}
  case 'reassign':{const W=S.water;const l=W.lines.find(l=>l.id===+a.line);if(!l)break;const spec=lineSpec(S,a.target);if(!spec)break;
    if(!spec.ext&&S.strategy==='Defensive'){ev(S,'note','Line not moved inside: strategy is defensive.');break;}
    if(W.lines.some(x=>x!==l&&x.key===spec.key)){ev(S,'note',`A line is already assigned to ${spec.label}.`);break;}
    if(l.key===spec.key)break;const need=hoseNeed(S,spec);
    if(l.len<need){ev(S,'note',`Hose too short: Line ${l.id} is ${l.len} ft, but ${spec.label} needs about ${need} ft. Withdraw it and stretch a longer line.`,{hose:true});break;}
    const c=coById(S,l.co);const st=S.set,f=coF(S,c);const from=l.label;let time;
    if(!l.ext&&!spec.ext&&l.entered)time=(st.reposition+st.perFloor*Math.abs(lineFloor(S,spec)-lineFloor(S,l))+(spec.via?st.pullCeiling:0))*f;
    else if(l.ext&&spec.ext)time=(st.reposition+(spec.roof?st.perFloor*S.B.stories:0))*f;else time=lineTimes(S,c,spec,need).ready;
    const keepEntered=!l.ext&&!spec.ext&&l.entered;const tA=Math.max(S.t,l.start||S.t);
    Object.assign(l,spec,{need,readyAt:tA+time,flowing:false,since:null,inPos:false,noFire:null,pulled:false,warned:false,flowedOnce:false});
    if(spec.ext){l.entering=null;l.entered=false;}else if(!keepEntered){l.entered=false;l.entering=tA+lineTimes(S,c,spec,need).enter;}
    ev(S,'order',`Line ${l.id} reassigned from ${from} to ${spec.label} (${c.name}; in position in about ${fmtS(tA-S.t+time)}).`);if(spec.ext)S.flags.extOrdered=true;break;}
  case 'withdraw':{const W=S.water;const i=W.lines.findIndex(l=>l.id===+a.line);if(i<0)break;const l=W.lines[i];W.lines.splice(i,1);l.withdrawnAt=S.t;const c=coById(S,l.co);ev(S,'order',`Line ${l.id} withdrawn from ${l.label}${c?' ('+c.name+' crew freed)':''}.`);break;}
  case 'supply':{// a supply line from the hydrant to an engine. Quick order: the next engine lays in to the attack engine.
    const st=S.set;const engs=S.cos.filter(c=>c.type==='engine');if(!engs.length){ev(S,'note','No engine on the assignment to take a water supply.');break;}
    const attack=()=>{const n=e=>S.water.lines.filter(l=>l.eng===e.id).length;return engs.filter(e=>!e.supplied&&!e.supplyBy).sort((x,y)=>n(y)-n(x)||x.arriveAt-y.arriveAt)[0];};
    let to=a.to?coById(S,a.to):attack();if(!to){ev(S,'note','Every engine already has a supply line (or one is on the way).');break;}
    if(to.supplied||to.supplyBy){ev(S,'note',`${to.name} already has a supply line${to.supplyBy?' on the way':''}.`);break;}
    let c=a.co?coById(S,a.co):null;
    if(c){const why=canDo(c,'supply');if(why){ev(S,'note',`${c.name} can't lay supply: ${why}.`);break;}
      if((+c.eq.supplyHose||0)<st.hydrantDist){ev(S,'note',`Not enough supply hose: ${c.name} carries ${c.eq.supplyHose||0} ft, the hydrant is ${st.hydrantDist} ft away.`,{hose:true});break;}
      if(a.replace)releaseAll(S,c);if(freeCrew(S,c)<1){ev(S,'note',busyMsg(S,c,1,'a supply lay'),{busy:c.id});break;}}
    else{const ok=e=>(+e.eq.supplyHose||0)>=st.hydrantDist&&freeCrew(S,e)>=1;const b=autoPick(S,'supply',(e)=>e!==to&&ok(e)?true:null);c=b?b.c:(ok(to)?to:null);
      if(!c){ev(S,'note',engs.some(e=>(+e.eq.supplyHose||0)>=st.hydrantDist)?'No engine has a free member to lay the supply line. Release a task first.':`Not enough supply hose: no engine carries ${st.hydrantDist} ft to reach the hydrant.`,{hose:true});break;}}
    const mode=a.mode==='reverse'?'reverse':'forward';const base=st.layBase+st.layPerFt*st.hydrantDist+st.hookup+(mode==='reverse'?30:0);
    const t=addTask(S,c,'supply',{to:to.id,mode},base,`${mode==='reverse'?'Reverse':'Forward'} lay: hydrant ↔ ${to.name}`);to.supplyBy=c.id;
    S.water.supplyAt=S.water.supplyAt==null?t.end:Math.min(S.water.supplyAt,t.end);
    ev(S,'order',`Water supply ordered: ${c.name} ${mode} lay${c===to?'':' to '+to.name} from the hydrant (${st.hydrantDist} ft)${t.start>S.t?', starting when '+c.name+' arrives':''}; connected in about ${fmtS(t.end-S.t)}.`);break;}
  case 'doorcontrol':{if(a.on){if(S.tasks.some(t=>t.kind==='doorcontrol'&&t.active)){S.doorControl=true;break;}
      const c=a.co?coById(S,a.co):(autoPick(S,'doorcontrol',c=>freeCrew(S,c)>=1?true:null)||{}).c;
      if(!c){ev(S,'note','No member free for door control. Release a task first.',{busy:true});break;}
      if(a.co){const why=canDo(c,'doorcontrol');if(why){ev(S,'note',`${c.name}: ${why}.`);break;}if(a.replace)releaseAll(S,c);if(freeCrew(S,c)<1){ev(S,'note',busyMsg(S,c,1,'door control'),{busy:c.id});break;}}
      const t=addTask(S,c,'doorcontrol',{},0,'Door control at the entry');
      ev(S,'order',`Door control at ${F.name} (${c.name}, 1 member): door pulled closed to the width of the hoseline${t.start>S.t?' once '+c.name+' arrives':''}.`,{src:'FSRI-VV'});break;}
    S.tasks.filter(t=>t.kind==='doorcontrol'&&t.active).forEach(t=>t.active=false);S.doorControl=false;if(fdo&&fdo.state!=='closed')fdo.state='open';ev(S,'order','Door control released: entry door fully open.',{src:'FSRI-VV'});break;}
  case 'vent':{if(a.type==='none'){if(S.fan){S.fan.on=false;ev(S,'order','Fan shut down.');}break;}
    const kind=a.type==='horizontal'?'hvent':a.type==='vertical'?'vvent':'ppv';const st=S.set;
    const ladderOk=c=>{if(kind!=='hvent')return true;const o=S.B.openings.find(o=>o.id===a.opening);const z=o&&S.B.zones.find(z=>z.id===o.zone);return !z||floorNum(z.floor)<2||c.eq.groundLadders||c.eq.aerial||S.laddered[o.side];};
    const base=c=>kind==='hvent'?st.horizontal:kind==='ppv'?st.ppv:st.vertical*(c.eq.aerial?st.aerialFactor:1);
    let c;if(a.co){c=coById(S,a.co);const why=canDo(c,kind)||(ladderOk(c)?null:'an upper-floor window needs a ladder (or ladder that side first)');if(why){ev(S,'note',`${c.name} can't do that: ${why}.`);break;}
      if(a.replace)releaseAll(S,c);if(freeCrew(S,c)<TASKDEF[kind].need){ev(S,'note',busyMsg(S,c,TASKDEF[kind].need,TASKDEF[kind].label.toLowerCase()),{busy:c.id});break;}}
    else{const b=autoPick(S,kind,c=>freeCrew(S,c)>=TASKDEF[kind].need&&ladderOk(c)?true:null);c=b&&b.c;
      if(!c){ev(S,'note',`No company available for ${TASKDEF[kind].label.toLowerCase()}: ${S.cos.some(x=>!canDo(x,kind))?'the companies that can do it are committed':'no company on the assignment '+(TASKDEF[kind].why||'can do it')}.`,{busy:true});break;}}
    if(kind==='hvent'){if(!S.o[a.opening])break;const t=addTask(S,c,'hvent',{opening:a.opening},base(c),`Horizontal vent: ${oname(S,a.opening)}`);ev(S,'order',`Horizontal ventilation ordered: ${oname(S,a.opening)} (${c.name}${t.start>S.t?', on arrival':''}).`);}
    else if(kind==='vvent'){const t=addTask(S,c,'vvent',{zone:a.zone},base(c),`Vertical vent over ${zname(S,a.zone)}`);ev(S,'order',`Vertical ventilation ordered over ${zname(S,a.zone)} (${c.name}${c.eq.aerial?', from the aerial':', off ground ladders'}; about ${fmtS(t.end-S.t)}; roof operations take time).`,{src:'FSRI-VV'});}
    else{const t=addTask(S,c,'ppv',{},base(c),'PPV fan at the entry');openEntry('the fan',t.start);ev(S,'order',`PPV/PPA fan ordered at the entry door (${c.name}).`,{src:'FSRI-PPV'});}
    break;}
  case 'search':{if(S.strategy==='Defensive'){ev(S,'note','Primary search not started: strategy is defensive.');break;}
    const kind=a.secondary?'search2':'search1';const st=S.set;const nm=a.secondary?'Secondary search':'Primary search';
    let c;if(a.co){c=coById(S,a.co);const why=canDo(c,kind);if(why){ev(S,'note',`${c.name}: ${why}.`);break;}if(a.replace)releaseAll(S,c);if(freeCrew(S,c)<2){ev(S,'note',busyMsg(S,c,2,nm.toLowerCase()),{busy:c.id});break;}}
    else{const b=autoPick(S,kind,c=>freeCrew(S,c)>=2?true:null);c=b&&b.c;if(!c){ev(S,'note',`No company available for a ${nm.toLowerCase()} of floor ${a.floor}: every crew is committed. Release a task first.`,{busy:true});break;}}
    const up=Math.max(0,floorNum(a.floor)-1);const base=(st.searchBase+st.perFloor*up+st.searchPerFloor)*(a.secondary?st.secondaryFactor:1);
    const t=addTask(S,c,kind,{floor:a.floor},base,`${nm}: floor ${a.floor}`);S.pending=S.pending.filter(p=>p.task!==t.id);
    S.searches.push({floor:a.floor,start:t.start,end:t.end,done:false,task:t.id,co:c.id,secondary:!!a.secondary});openEntry('the search crew',t.start);
    ev(S,'order',`${nm} ordered: floor ${a.floor}. (${c.name}${t.start>S.t?', on arrival':''})`);break;}
  case 'assign':{// IC assigns a task to a specific company
    const c=coById(S,a.co);if(!c)break;const k=a.task;
    if(k==='line'){doAction(S,{...a,kind:'line'});break;}
    if(k==='supply'){doAction(S,{...a,kind:'supply'});break;}
    if(k==='doorcontrol'){doAction(S,{...a,kind:'doorcontrol',on:true});break;}
    if(k==='hvent'||k==='vvent'||k==='ppv'){doAction(S,{...a,kind:'vent',type:k==='hvent'?'horizontal':k==='vvent'?'vertical':'ppv'});break;}
    if(k==='search1'||k==='search2'){doAction(S,{...a,kind:'search',secondary:k==='search2'});break;}
    const why=canDo(c,k);if(why){ev(S,'note',`${c.name} can't do that: ${why}.`);break;}
    if(a.replace)releaseAll(S,c);
    const d=TASKDEF[k];const st=S.set;const free=freeCrew(S,c);const crew=k==='rit'?Math.max(2,free):d.need;
    if(free<crew||free<d.need){ev(S,'note',busyMsg(S,c,d.need,d.label.toLowerCase()),{busy:c.id});break;}
    if(k==='pullceiling'){const att=S.B.zones.find(z=>z.attic);if(!att||!S.B.conns.some(q=>q.type==='ceiling'&&(q.a===a.zone||q.b===a.zone))){ev(S,'note',`No ceiling to the ${att?att.name:'attic'} in ${zname(S,a.zone)}.`);break;}
      const t=addTask(S,c,k,{zone:a.zone},st.pullCeiling,`Pull ceiling: ${zname(S,a.zone)}`);ev(S,'order',`${c.name}: pull the ceiling in ${zname(S,a.zone)} to open up the ${att.name}.`);break;}
    if(k==='ladder'){const side=a.side||'A';const t=addTask(S,c,k,{side},st.ladder*(c.eq.aerial?.9:1),`Ladder Side ${side}`);ev(S,'order',`${c.name}: ladder Side ${side} (ground ladders to the upper-floor windows${c.eq.aerial?' and the aerial':''}).`);break;}
    if(k==='rit'){const t=addTask(S,c,k,{crew},st.rit,'RIT (rapid intervention)');ev(S,'order',`${c.name} assigned as RIT (${crew} members).`);break;}
    if(k==='lights'){const t=addTask(S,c,k,{},st.lights,'Scene lighting');ev(S,'order',`${c.name}: set up scene lighting.`);break;}
    if(k==='rehab'){const t=addTask(S,c,k,{},st.rehab,'Rehab / EMS standby');ev(S,'order',`${c.name}: set up rehab and EMS standby.`);break;}
    break;}
  case 'release':{const t=S.tasks.find(t=>t.id===+a.task);if(t&&t.active){releaseTask(S,t,true);break;}
    if(a.co&&!a.task){const c=coById(S,a.co);if(c){const n=releaseAll(S,c);if(n)ev(S,'order',`${c.name} released from all tasks and available.`);}}break;}
  case '_open':openEntryNow(S,a.why);break;
  case '_task':{const t=S.tasks.find(t=>t.id===a.task);if(!t||!t.active)break;const c=coById(S,t.co);t.done=true;t.doneAt=S.t;if(!CONT[t.kind])t.active=false;
    if(t.kind==='hvent'){const o=S.o[t.opening];if(o&&(o.state==='closed'||o.state==='controlled')){o.state=o.type==='window'?'failed':'open';ev(S,'vent',`${oname(S,t.opening)} vented (${c.name}).`);S.flags.vents=(S.flags.vents||[]);S.flags.vents.push({t:S.t,kind:'horizontal',zone:o.zone,opening:t.opening});}}
    else if(t.kind==='vvent')doAction(S,{kind:'_roofdone',zone:t.zone,by:c.name});
    else if(t.kind==='ppv')doAction(S,{kind:'_fanon',by:c.name});
    else if(t.kind==='doorcontrol'){S.doorControl=true;if(fdo&&fdo.state!=='closed')fdo.state='controlled';}
    else if(t.kind==='supply'){const to=coById(S,t.to);to.supplied=true;to.supplyBy=null;if(t.mode==='reverse')c.supplied=true;S.water.supply=true;
      ev(S,'water',`Water supply established: ${c.name} ${t.mode} lay to ${to.name} is charged. ${to.name}'s lines no longer draw on its tank.`);}
    else if(t.kind==='pullceiling'){const att=S.B.zones.find(z=>z.attic);for(const cid in S.c){const q=S.c[cid];if(q.type==='ceiling'&&((q.a===t.zone&&q.b===att.id)||(q.b===t.zone&&q.a===att.id)))q.state='breached';}
      ev(S,'vent',`${c.name}: ceiling pulled in ${zname(S,t.zone)}. The ${att.name} is open above it (a line in that room can now reach it), and heat and smoke from the void can come down.`,{src:'FSRI-VV'});}
    else if(t.kind==='ladder'){S.laddered[t.side]=true;ev(S,'order',`${c.name}: Side ${t.side} laddered (secondary egress and access to upper-floor windows).`);}
    else if(t.kind==='rit')ev(S,'order',`${c.name} in place as RIT at the command post.`);
    else if(t.kind==='lights'){S.lights=true;ev(S,'order',`${c.name}: scene lighting is up. Smoke color and the building are easier to read.`);}
    else if(t.kind==='rehab'){S.rehab=true;ev(S,'order',`${c.name}: rehab is set up (crews recover faster in the heat).`);}
    break;}
  case '_roofdone':{let zid=a.zone;const z=S.B.zones.find(z=>z.id===zid);let target=zid;
    if(!z.attic&&!isTop(S,zid)){const top=S.B.zones.find(q=>q.floor===String(S.B.stories)&&q.x0<=(z.x0+z.x1)/2&&q.x1>=(z.x0+z.x1)/2&&!q.hidden);target=top?top.id:zid;}
    const id='roof:'+target;S.o[id]={id,state:'open',zone:target,type:'roof',side:'Roof',dyn:true,fail:0,failAt:1e9};
    // pushing the ceiling below a roof vent opens the void space [FSRI-VV 4.7]
    for(const cid in S.c){const c=S.c[cid];if(c.type==='ceiling'&&((c.a===target&&c.b==='attic')||(c.b===target&&c.a==='attic')))c.state='breached';}
    S.o[id].over=target;if(target!=='attic')S.o[id].zone=S.z.attic?'attic':target;
    ev(S,'vent',`Roof opened over ${zname(S,target)}; ceiling pushed below it${a.by?' ('+a.by+')':''}.`,{src:'FSRI-VV'});S.flags.vents=(S.flags.vents||[]);S.flags.vents.push({t:S.t,kind:'vertical',zone:target});break;}
  case '_fanon':S.fan={on:true,at:F.id};ev(S,'vent',`Fan running at the entry door (positive pressure)${a.by?' ('+a.by+')':''}.`,{src:'FSRI-PPV'});S.flags.vents=(S.flags.vents||[]);S.flags.vents.push({t:S.t,kind:'ppv'});break;
  // instructor injects
  case 'fail':{const o=S.o[a.opening];if(o){o.state=o.type==='window'?'failed':'open';ev(S,'inject',`${oname(S,a.opening)} ${o.type==='window'?'fails':'is opened'}.`);}break;}
  case 'open':{const o=S.o[a.opening];if(o){o.state='open';ev(S,'inject',`${oname(S,a.opening)} opened.`);}break;}
  case 'close':{const o=S.o[a.opening];if(o){o.state='closed';ev(S,'inject',`${oname(S,a.opening)} closed.`);}break;}
  case 'idoor':{const c=S.c[a.conn];if(c){c.state=a.state;const nm=(S.B.conns.find(x=>x.id===a.conn)||{}).name||a.conn;ev(S,'inject',`${nm} ${a.state==='open'?'opened':'closed'}.`);}break;}
  case 'wind':S.wind={dir:a.dir,spd:a.spd||0};ev(S,a.sched?'wind':'inject',a.dir==='calm'?'Wind is now calm.':`Wind shift: now ${['light','moderate','strong'][a.spd||0]} from Side ${a.dir}.${a.sched?' (scheduled in the drill)':''}`,a.sched?{src:'NIST-WD'}:{});break;
  case 'note':ev(S,'inject',a.text);break;
  }}
/* ---------- one simulation second ---------- */
function step(S){const dt=1;
  while(S.pending.length&&S.pending[0].t<=S.t)doAction(S,S.pending.shift());
  const {air,own,hi}=airMap(S);S._air=air;S._own=own;
  // water
  const W=S.water;
  // companies: arrival, work time (heat fatigue), aggregate tank/supply for the board
  for(const c of S.cos){if(!c.arrived&&S.t>=c.arriveAt){c.arrived=true;if(c.arriveAt>S.tArr){const tk=coTasks(S,c);
      ev(S,'company',`${c.name} on scene (${c.staff} ${c.staff===1?'member':'members'})${tk.length?': starting '+tk.map(x=>x.label).join(' + '):', staged and awaiting assignment'}.`,{co:c.id});}}
    if(c.arrived&&coTasks(S,c).length)c.work+=S.rehab?.5:1;else if(c.arrived&&S.rehab)c.work=Math.max(0,c.work-1);}
  const engs=S.cos.filter(c=>c.type==='engine');
  for(const e of engs){e.flowGpm=0;}
  for(const l of W.lines){const E=coById(S,l.eng);const hasWater=E&&(E.supplied||E.tankLeft>0)&&S.t>=E.arriveAt;
    if(!l.ext&&l.entering!=null&&S.t>=l.entering&&!l.entered){l.entered=true;const F=front(S);const fo=F&&S.o[F.id];if(fo&&fo.state==='closed'){fo.state=S.doorControl?'controlled':'open';S.flags.entryOpenedAt=S.flags.entryOpenedAt??S.t;ev(S,'vent',`${F.name} opened for the hoseline${S.doorControl?' (door controlled)':''}. Opening the door is a ventilation action.`,{src:'FSRI-CFA'});}}
    const r=lineReach(S,l);const fire=Object.keys(r).some(id=>S.z[id].ign&&!S.z[id].out);
    if(S.t>=l.readyAt&&!l.inPos){l.inPos=true;
      if(l.via&&!l.pulled){l.pulled=true;const was=S.B.conns.some(q=>q.type==='ceiling'&&S.c[q.id].state==='breached'&&((q.a===l.via&&q.b===l.zone)||(q.b===l.via&&q.a===l.zone)));
        for(const cid in S.c){const c=S.c[cid];if(c.type==='ceiling'&&((c.a===l.via&&c.b===l.zone)||(c.b===l.via&&c.a===l.zone)))c.state='breached';}
        if(!was)ev(S,'vent',`Line ${l.id}: ceiling pulled in ${zname(S,l.via)} to reach the ${zname(S,l.zone)}. The opening also lets heat and smoke from the void into that room.`,{src:'FSRI-VV'});}
      if(!fire)ev(S,'water',`Line ${l.id} in position: ${l.label}. No fire within reach, so it stands by without flowing.`);}
    if(fire)l.noFire=null;else if(l.noFire==null)l.noFire=S.t;
    const want=l.inPos&&hasWater&&(fire||(l.flowing&&S.t-l.noFire<TASK.noFireShutdown));
    if(want){if(!l.flowing){l.flowing=true;l.since=S.t;
        ev(S,'water',l.flowedOnce?`Line ${l.id} flowing again: fire within reach of ${l.label}.`:l.ext?`Line ${l.id}: water applied from outside through ${oname(S,l.opening)} (${l.gpm} gpm).`:`Line ${l.id} in position and flowing: ${l.label} (${l.gpm} gpm).`,{src:l.ext?'FSRI-VV':'FSRI-FA'});
        l.flowedOnce=true;if(l.firstFlow==null)l.firstFlow=S.t;if(S.flags.firstWater==null)S.flags.firstWater=S.t;}E.flowGpm+=l.gpm;}
    else if(l.flowing){l.flowing=false;
      if(!hasWater){if(!E.dryMsg){E.dryMsg=true;ev(S,'water',`Tank water exhausted on ${E.name}: its lines have stopped flowing. No supply line connected to it.`,{co:E.id});}}
      else ev(S,'water',`Line ${l.id} shut down: no fire left within reach of ${l.label}. It stands by and restarts if fire returns there.`);}}
  // tanks: each engine's tank feeds its own lines (at their gpm) until a supply line connects to it; pump capacity caps the flow (simplification)
  for(const e of engs){const pump=+e.eq.pump||1500;e.pumpF=e.flowGpm>pump?pump/e.flowGpm:1;
    if(e.pumpF<1&&!e.pumpMsg){e.pumpMsg=true;ev(S,'water',`${e.name}'s pump is rated ${pump} gpm but its lines call for ${e.flowGpm} gpm: every line on it flows less.`);}
    if(e.flowGpm&&!e.supplied){const tank=+e.eq.tank||0;e.tankLeft=Math.max(0,e.tankLeft-Math.min(e.flowGpm,pump)/60*dt);
      if(e.tankLeft<tank*TASK.lowTankFrac&&e.tankLeft>0&&!e.lowWarned){e.lowWarned=true;ev(S,'water',`Tank water low: ${e.name} has about ${Math.round(e.tankLeft)} gal left, roughly ${fmtS(e.tankLeft/(Math.min(e.flowGpm,pump)/60))} at its current flow (${e.flowGpm} gpm).${e.supplyBy?' A supply line is on the way.':' No supply line has been ordered to it.'}`,{co:e.id});}}}
  W.tank=engs.filter(e=>S.t>=e.arriveAt).reduce((a,e)=>a+e.tankLeft,0);W.supply=engs.some(e=>e.supplied);
  for(const l of W.lines){const E=coById(S,l.eng);l.w=Math.max(.4,Math.min(1.7,(l.gpm||150)/TASK.gpm*(E&&E.pumpF||1)));}
  // wind-driven conditions: wind entering an open opening pushes heat and smoke along the flow path [NIST-WD]
  const wz={};{const wd=S.wind;if(wd&&wd.dir&&wd.dir!=='calm')for(const oid in S.o){const o=S.o[oid];if(o.type!=='roof'&&o.side===wd.dir&&o.state!=='closed'&&o.state!=='controlled')wz[o.zone]=Math.max(wz[o.zone]||0,(wd.spd||0)+1);}}
  S._wz=wz;
  for(const id in wz){const z=S.z[id];if(S.t>=S.tArr&&z.ign&&!z.out&&z.q>.5&&!S.flags['wd_'+id]){S.flags['wd_'+id]=S.t;const inside=W.lines.some(l=>!l.ext&&l.entered)||S.searches.some(s=>!s.done&&S.t>=s.start);
    ev(S,'crew',`Wind-driven conditions: wind entering ${zname(S,id)} is pushing heat and smoke through the flow path toward the exhaust openings${inside?'. Crews inside are in that path':''}. Consider exterior water into the windward opening or closing the flow path.`,{src:'NIST-WD',zone:id});}}
  const waterOn={},intOn={};for(const l of W.lines)if(l.flowing){if(l.ext){const o=S.o[l.opening];if(o&&o.state==='closed')o.state='failed';}
    const r=lineReach(S,l);for(const id in r){waterOn[id]=Math.max(waterOn[id]||0,r[id]);if(!l.ext)intOn[id]=true;}}
  // an interior line in position that covers a room keeps watch on it: no rekindle there (simplification)
  const guarded={};for(const l of W.lines)if(!l.ext&&l.inPos)for(const id in lineReach(S,l))guarded[id]=true;
  // zones
  const zs=S.z,M=FUEL[S.scn.fuel]||FUEL.modern;
  for(const id in zs){const z=zs[id];const w=waterOn[id]||0;z.water=w;
    if(intOn[id])z.extOnly=false;
    if(w>0){z.wet=Math.min(1,z.wet+w*dt/25);const L=S.water.lines.find(l=>l.flowing&&l.zone===id);
      // exterior water on an upper-floor room cools but regrows without interior follow-up [FSRI-CFA single-family]
      z.wetRegrow=(L&&L.ext&&floorNum(z.floor)>=2)?70:900;}
    else z.wet=Math.max(0,z.wet-dt/z.wetRegrow);
    if(z.ign&&!z.out){const age=S.t-z.tIgn;// once water has darkened a flashed room, the post-flashover boost is gone; growth returns to the normal curve (simplification)
      if(w>0&&z.flashed&&z.wet>.5)z.suppressed=true;
      let pot=Math.min(1.25,Math.pow(Math.max(0,age)/M.tg,2));if(z.flashed&&!z.suppressed)pot=2;
      if(z.attic)pot=Math.min(1.25,Math.pow(Math.max(0,age)/(M.tg*1.6),2));
      pot*=z.fuel>.25?1:z.fuel/.25;pot*=(1-z.wet*.97);
      const qAir=.03+.62*air[id];
      // oxygen reservoir: the closed building's air lets the fire grow until it is used up, then it decays [FSRI-VV 4.6]
      const over=Math.max(0,z.q-qAir);z.R=clamp(z.R+((own[id]+.02)*.012*(1-z.R)-over*.0105/z.vf)*dt,0,1);
      const cap=qAir+z.R*1.3;const target=Math.min(pot,cap);
      z.vl=pot>cap+.03&&z.wet<.3;z.decay=z.vl&&z.R<.15&&qAir<.35;
      const tau=target>z.q?M.tau*(z.flashed?.5:1):(w>0?4:M.tau*1.5);z.q+=(target-z.q)*dt/tau;
      if(w>0)z.q*=1-.06*w;
      z.fuel=Math.max(0,z.fuel-z.q*dt/M.load);
      const Ttarget=Math.min(z.q,1.3)*(z.attic?1.0:1.15)/Math.sqrt(z.vf)*(1-z.wet*.6);
      z.T+=(Ttarget-z.T)*dt/(Ttarget>z.T?M.tauT:(w>0?6:240));
      if(!z.flashed&&z.T>=1&&z.q>=.75&&!z.attic){z.flashed=true;z.tFlash=S.t;ev(S,'flashover',`Flashover: ${zname(S,id)}.`,{zone:id,src:'FSRI-VV'});}
      if(z.flashed&&!z.vl&&z.fuel<.15&&!z.burnt){z.burnt=true;}
      if(z.suppressed&&z.wet<.1&&z.q>.6){z.suppressed=false;ev(S,'spread',`Fire has regrown in ${zname(S,id)}: water was not kept on it.`,{zone:id});}
      // knockdown: wet, low heat release and cooled gases, held for a few seconds (simplification)
      if(z.wet>.8&&z.q<.12&&z.T<.3)z.kd+=dt;else z.kd=0;
      if(z.kd>=TASK.kdHold||(z.wet>.85&&z.q<.03)){z.out=true;z.q=0;z.tOut=S.t;z.kd=0;z.smold=0;ev(S,'water',`Fire knocked down: ${zname(S,id)}.`,{zone:id});}
      else if(z.fuel<.05&&z.q<.05&&!z.vl){z.out=true;z.burnedOut=true;z.q=0;z.tOut=S.t;ev(S,'water',`Fire in ${zname(S,id)} has burned itself out (fuel consumed).`,{zone:id});}
    }else{z.q*=.97;z.vl=false;z.decay=false;
      // overhaul: a knocked-down room with fuel left can rekindle once, slowly, only after it has dried out with no water on it
      // and no interior line standing by in reach.
      // Upper-floor rooms knocked down only from outside dry fast and rekindle sooner [FSRI-CFA single-family]. Timing is a simplification.
      if(z.out&&!z.burnedOut&&!z.rekindled){if(z.wet<.05&&z.fuel>.3&&!w&&!guarded[id])z.smold+=dt;else z.smold=0;
        const lim=z.extOnly&&floorNum(z.floor)>=2?TASK.rekindleDryExt:TASK.rekindleDry;
        if(z.smold>lim){z.rekindled=true;z.out=false;z.flashed=false;z.suppressed=false;z.tIgn=S.t;z.q=.03;z.kd=0;z.smold=0;z.R=Math.max(z.R,.5);
          ev(S,'spread',`Rekindle: ${zname(S,id)} reignited after drying out with no water on it${z.extOnly&&floorNum(z.floor)>=2?' (knocked down from outside only)':''}.`,{zone:id,src:z.extOnly?'FSRI-CFA':undefined});}}}
    if(w>0&&z.T>.1)z.steam=Math.min(1,z.steam+dt*.08);else z.steam=Math.max(0,z.steam-dt*.02);
    if(w>0)z.T=Math.max(0,z.T-z.T*.035*w*dt);
    // smoke production / exhaust
    z.s+=(z.q*.02*M.smoke/z.vf+z.steam*.004)*dt;
    // after knockdown smoke production stops and what is left clears faster (simplification)
    const clr=z.out||(S.underControl!=null&&!z.ign);
    const exh=(own[id]*(.012+.03*Math.min(1.5,z.T))*(S.fan&&S.fan.on?1.8:1)+(clr?.004:0))*(clr?3:1);z.s=clamp(z.s-z.s*exh*dt,0,1);}
  // heat & smoke transfer along connections; hot gases move toward low-pressure/exhaust and upward
  for(const cid in S.c){const c=S.c[cid];const k=connK(S,c);if(k<=0)continue;const A=zs[c.a],Bz=zs[c.b];
    const exA=own[c.a],exB=own[c.b];
    const up=(a,b)=>{const fa=floorNum(a.floor),fb=floorNum(b.floor);return fb>fa?1.5:fb<fa?.45:1;};
    let ds=(A.s-Bz.s)*k*.035;ds*=ds>0?up(A,Bz)*(1+exB):up(Bz,A)*(1+exA);
    ds=clamp(ds,-.05,.05);Bz.s=clamp(Bz.s+ds/Bz.vf,0,1);A.s=clamp(A.s-ds/A.vf,0,1);
    let dT=(A.T-Bz.T)*k*.018;dT*=dT>0?up(A,Bz)*(1+1.6*exB):up(Bz,A)*(1+1.6*exA);
    if(S.fan&&S.fan.on){dT*=1.6;}
    const wa=dT>0?wz[c.a]:wz[c.b];if(wa){dT*=1+.45*wa;ds*=1;} // wind-driven push along the flow path (magnitude is a simplification)
    dT=clamp(dT,wa?-.045:-.03,wa?.045:.03);Bz.T+=dT/Bz.vf*.9;A.T-=dT/A.vf*.25;}
  // ignition of other compartments
  for(const id in zs){const z=zs[id];if(z.ign||z.out)continue;
    if(z.T>(z.attic?.6:.82)&&z.wet<.2){z.ign=true;z.tIgn=S.t-FUEL[S.scn.fuel].tg*.55;ev(S,'spread',`Fire has extended into ${zname(S,id)}.`,{zone:id});}}
  // exterior flames: auto-exposure to the floor above / eaves (simplification)
  for(const oid in S.o){const o=S.o[oid];const z=zs[o.zone];if(!z||o.type==='roof')continue;
    const showing=z.flashed&&!z.out&&o.state!=='closed'&&z.q>.5;o.showT=showing?(o.showT||0)+dt:Math.max(0,(o.showT||0)-dt*2);
    if(o.showT>200&&!o.exposed){const Bo=S.B.openings.find(x=>x.id===oid);if(!Bo||Bo.hidden)continue;o.exposed=true;
      const fz=floorNum(Bo&&S.B.zones.find(q=>q.id===o.zone).floor);let tgt=null;
      if(fz===S.B.stories)tgt='attic';else{const above=S.B.openings.filter(x=>!x.hidden&&x.type==='window'&&S.B.zones.find(q=>q.id===x.zone).floor===String(fz+1)).sort((a,b)=>Math.abs(a.x-Bo.x)-Math.abs(b.x-Bo.x))[0];if(above&&Math.abs(above.x-Bo.x)<above.w*1.5)tgt=above.zone;if(above&&S.o[above.id].state==='closed'&&S.B.construction!=='wood'){S.o[above.id].state='failed';}}
      if(tgt&&zs[tgt]&&!zs[tgt].ign){zs[tgt].T=Math.max(zs[tgt].T,.9);ev(S,'spread',`Fire lapping out ${Bo.name} is exposing ${zname(S,tgt)} (exterior extension).`,{zone:tgt});}}}
  // window failure from heat (timing is a simplification)
  for(const oid in S.o){const o=S.o[oid];if(o.type!=='window'||o.state!=='closed')continue;const z=zs[o.zone];
    // glass heats from the hot gas layer and fails after enough accumulated exposure; 'hold' keeps glass intact unless the room is very hot
    const hold=S.scn.glass==='hold';const g=hold?Math.max(0,z.T-.6)*(z.T>.72?1:0):Math.max(0,z.T-.3)*1.0+Math.max(0,z.T-.6)*1.5;
    if(g>0){o.fail+=g*dt;if(o.fail>o.failAt*.35){o.state='failed';o.selfFailed=true;ev(S,'fail',`${oname(S,oid)} has failed from heat and is now venting the fire.`,{zone:o.zone});}}}
  // occupant tenability (FED-like dose; simplification of tenability criteria) [FSRI-VV 4.9, CBYD]
  if(S.victim&&S.victim.status==='inside'){const z=zs[S.victim.zone];S.victim.dose+=dt*(Math.max(0,z.T-.25)*.012+Math.max(0,z.s-.4)*.009);if(S.victim.dose>=1&&!S.victim.untenable){S.victim.untenable=S.t;}}
  // searches
  for(const s of S.searches){if(s.done)continue;if(S.t<s.start)continue;const st_=S.tasks.find(t=>t.id===s.task);const fin=()=>{if(st_){st_.active=false;st_.done=true;st_.doneAt=S.t;}};
    const zonesF=S.B.zones.filter(z=>z.floor===s.floor);const worst=Math.max(...zonesF.filter(z=>!z.hidden||true).map(z=>zs[z.id].T*(S.c[connOf(S,z.id)]?.state==='closed'?.2:1)));
    if(worst>.75&&!s.warned){s.warned=true;ev(S,'crew',`Search crew on floor ${s.floor}${s.co?' ('+coById(S,s.co).name+')':''} is in untenable heat in the flow path. Crew must retreat.`,{src:'FSRI-VV'});s.done=true;s.aborted=true;fin();continue;}
    if(S.t>=s.end){s.done=true;fin();let found=false;if(S.victim&&S.victim.status==='inside'&&S.B.zones.find(z=>z.id===S.victim.zone).floor===s.floor){found=true;S.victim.status=S.victim.untenable?'found-late':'rescued';S.victim.foundAt=S.t;}
      ev(S,'search',`${s.secondary?'Secondary':'Primary'} search floor ${s.floor} complete${s.co?' ('+coById(S,s.co).name+')':''}: ${found?(S.victim.status==='rescued'?`occupant found in ${zname(S,S.victim.zone)} and removed`:`occupant found in ${zname(S,S.victim.zone)}; conditions there had already exceeded tenability`):'negative'}.`,{src:'FSRI-VV'});}}
  // crew safety for interior lines
  for(const l of W.lines){if(l.ext||!l.entered)continue;const z=zs[l.zone];const path=zs[S.B.openings.find(o=>o.front).zone];
    if(Math.max(path.T,l.flowing?0:z.T)>.85&&!l.warned){l.warned=true;ev(S,'crew','Attack crew is between the fire and the exhaust: rapid heat increase in their flow path.',{src:'FSRI-VV'});}}
  // under control: every room that ignited is knocked down or burned out
  {const ign=Object.values(zs).filter(z=>z.ign);const allOut=ign.length>0&&ign.every(z=>z.out);
   if(allOut&&S.underControl==null&&S.t>=S.tArr){S.underControl=S.t;ev(S,'control','Fire under control: no room is still burning.');}
   else if(!allOut&&S.underControl!=null){S.underControl=null;ev(S,'control-lost',`Fire is no longer under control: ${ign.filter(z=>!z.out).map(z=>zname(S,z.id)).join(', ')} burning again.`);}}
  S.t+=dt;
  if(S.t%10===0)S.hist.push(snap(S));
}
function connOf(S,zid){for(const cid in S.c){const c=S.c[cid];if(c.type==='door'&&(c.a===zid||c.b===zid))return cid;}return null;}
function snap(S){const o=S.scn.origin,z=S.z[o];return{t:S.t,q:+z.q.toFixed(3),T:+z.T.toFixed(3),s:+z.s.toFixed(3),vl:z.vl,fl:z.flashed};}
function run(S,sec){for(let i=0;i<sec;i++)step(S);}
/* ---------- derived readings ---------- */
function stageOf(S,id){const z=S.z[id];if(!z.ign)return z.s>.25?'Smoke only':'Not involved';if(z.out)return z.burnedOut?'Burned out':'Knocked down';
  if(z.water>0&&z.q<.25)return'Decay (water applied)';
  if(z.wet>.3&&z.q<.25)return'Decay (darkened by water, can regrow)';
  if(z.fuel<.15)return'Decay (fuel consumed)';
  if(z.flashed&&z.q<.5)return'Decay (after flashover)';
  if(z.flashed)return z.vl?'Fully developed (ventilation-limited)':'Fully developed';
  if(z.decay)return'Decay (ventilation-limited, starved for air)';
  if(z.vl)return'Growth (ventilation-limited)';
  return z.q<.12?'Incipient':'Growth';}
const VOLN=['Light','Moderate','Heavy','Very heavy'],VELN=['Lazy','Moderate','Pressurized','Turbulent'],DENN=['Thin','Moderate','Thick','Very thick'];
// smoke attributes for gases leaving a zone (Reading Smoke: volume, velocity, density, color — widely taught)
function smokeOf(S,zid,o){const z=S.z[zid];const M=FUEL[S.scn.fuel];const air=S._own?S._own[zid]:0;
  const P=z.T*(.6+.6*z.s)*(z.vl?1.25:1);
  let vel=P<.18?0:P<.45?1:P<.8?2:3;if(z.decay)vel=Math.min(vel,1);
  const prod=z.q*M.smoke+z.s*.6;let vol=prod<.25?0:prod<.6?1:prod<1.05?2:3;
  let den=z.s<.3?0:z.s<.55?1:z.s<.8?2:3;if(z.vl&&z.s>.6)den=Math.max(den,2);if(z.flashed&&z.vl)den=3;
  // colour: steam/early heating -> white; mixed -> gray; structural wood -> brown; fuel-rich synthetics -> black
  let col='gray';
  if(z.out||(S.underControl!=null&&!z.ign)){col='white';vel=Math.min(vel,1);} // cooling smoke and steam after knockdown (simplification)
  else if(z.steam>.25)col='white';else if(z.T<.25&&z.q<.15)col=z.s<.4?'white':'gray';
  else if(z.attic||(S.B.construction==='wood'&&z.flashed&&S.t-(z.tFlash||0)>420))col='brown';
  else if(z.vl||z.T>.7)col=S.scn.fuel==='modern'?'black':'gray-black';else col='gray';
  return{vol,vel,den,col,P};}
const SMOKE_RGB={white:[226,224,218],gray:[128,126,122],'gray-black':[70,68,66],brown:[102,80,56],black:[26,24,23]};
// building pressure (simplification): a growing fire in a closed-up building pressurizes it and pushes smoke out of every gap;
// openings to the outside relieve that pressure.
function bldgPressure(S){let p=0;for(const id in S.z){const z=S.z[id];if(z.ign&&!z.out)p=Math.max(p,z.q*z.T*1.7);}
  let open=0;for(const id in S.o){const o=S.o[id];if(o.state!=='closed')open+=openK(S,o);}return clamp(p/(1+open*2.5),0,1);}
/* As a closed-up fire goes ventilation-limited and uses up its air, the smoke forced out of the gaps fades [FSRI-HV08:
   "once the fire became ventilation limited the smoke being forced out of the gaps of the houses greatly diminished or stopped all
   together"]. 1 while the burning rooms still have air (oxygen reservoir R >= 0.3), falling to 0 as R runs out (thresholds are teaching values). */
function vlPush(S){let k=1;for(const id in S.z){const z=S.z[id];if(z.ign&&!z.out&&z.vl)k=Math.min(k,clamp((z.R-.05)/.25,0,1));}return k;}
function openingVis(S){const out={};const own=S._own||airMap(S).own;const bp=bldgPressure(S),vk=vlPush(S);
  for(const oid in S.o){const o=S.o[oid],z=S.z[o.zone];if(!z)continue;const sm=smokeOf(S,o.zone,o);
    const open=o.state!=='closed';const ctrl=o.state==='controlled';
    let rate=0;if(open)rate=z.s*(.4+z.T)*(ctrl?.35:1)*(o.type==='roof'?1.6:1)*(S.fan&&S.fan.on&&S.fan.at!==oid?1.7:1);
    else if(z.s>.3)rate=Math.max(0,(z.s-.3)*(z.T*.3+bp*vk*.25)); // pushing through gaps around closed windows/doors; fades once the fire is starved [FSRI-HV08]
    if(!open){const cap=rate>.05?2:1;sm.vol=Math.min(sm.vol,cap);sm.vel=Math.min(sm.vel,cap);} // leakage through gaps: what you see is limited by the gap, not the fire [simplification]
    let flame=0;if(open&&z.ign&&!z.out){if(z.flashed&&z.q>.7)flame=clamp(z.q*.6,0,1.2);else if(z.q>.6&&o.type!=='door')flame=(z.q-.6)*.8;}
    if(o.type==='door'&&open&&!z.flashed)flame*=.3;
    if(z.water>0)flame*=.25;
    const glow=z.ign&&!z.out?clamp(z.q*1.1,0,1.2):0;
    let frac=o.type==='door'?.5:.65; // neutral plane: outflow from the top part of a bidirectional opening [FSRI-VV 4.6]
    if(S.fan&&S.fan.on&&S.fan.at===oid){frac=0;rate=0;}
    let pulse=z.decay?1:0;
    out[oid]={rate,flame,glow,stain:clamp((z.s-.35)*1.6,0,1),frac,pulse,inflow:open&&!(S.fan&&S.fan.at===oid)?(z.ign&&z.q>.2?1:0):0,...sm,rgb:SMOKE_RGB[sm.col],state:o.state,zone:o.zone,steam:z.steam};}
  return out;}
/* Eave / soffit / cornice smoke, localized (Oct 9 2026 rework).
   - Attic smoke leaks along the eave, most over the part of the attic fed from the burning/hot room below, plus any marked gable/soffit
     vents (B.eaveVents [{x,w,kind:'gable'|'soffit',y?}]) which concentrate it.
   - Pressure push at the eaves only comes from the TOP floor (the rooms directly under the roof), once that floor is itself charged
     with smoke (s > 0.5), above that room, and fades as the fire goes ventilation-limited. A first-floor room fire therefore shows
     at its own window/door gaps first, not at the eaves. [simplification; the eave cue follows FSRI-ATTIC]
   - Deliberate pulsing only for a ventilation-limited attic with no roof opening: "Once the ridge vent seals, the eaves will act as
     both the source of air as well as the exhaust and you may notice a pulsing of smoke out of the eaves. This is a sign that you
     have a ventilation-limited fire in the attic." [FSRI-ATTIC] */
function eavesVis(S){const B=S.B,a=S.z.attic;if(!a||!B.eaves||!B.eaves.length)return null;
  const ex0=Math.min(...B.eaves.map(e=>e.x0)),ex1=Math.max(...B.eaves.map(e=>e.x1));const top=String(B.stories||2);
  const bp=bldgPressure(S),vk=vlPush(S);const atticRate=Math.max(0,a.s-.15)*(.6+a.T*1.5);
  const roofOpen=Object.values(S.o).some(o=>o.type==='roof'&&o.state!=='closed');
  const pulse=a.ign&&!a.out&&a.vl&&!roofOpen?1:0;
  const tops=B.zones.filter(z=>z.floor===top&&!z.attic&&S.z[z.id]);
  // the attic is fed (heat and smoke) mostly over the burning/hot room below it, so weight by that room's fire and heat, not by smoke (which evens out across a floor)
  const feed=z=>(z.ign&&!z.out?Math.min(1,z.q):0)*.7+Math.min(1,z.T)*.3;let fMax=0;for(const bz of tops)fMax=Math.max(fMax,feed(S.z[bz.id]));
  const segs=[];const cover=[];const gap=sm=>({vol:Math.min(2,sm.vol),vel:Math.min(2,sm.vel),den:Math.min(1,sm.den),col:sm.col,P:sm.P});
  for(const bz of tops){const z=S.z[bz.id];const x0=Math.max(ex0,bz.x0),x1=Math.min(ex1,bz.x1);if(x1-x0<5)continue;cover.push([x0,x1]);
    const push=bp*vk*Math.max(0,z.s-.5)*.45;
    const share=atticRate*(.12+.88*(fMax>.02?feed(z)/fMax:1));
    if(Math.max(push,share)<=.005)continue;const fromAttic=share>=push;const sm=fromAttic?smokeOf(S,'attic'):gap(smokeOf(S,bz.id));
    segs.push({x0,x1,zone:bz.id,src:fromAttic?'attic':'push',rate:Math.max(push,share),pulse:fromAttic?pulse:0,...sm});}
  if(atticRate>.005){const sm=smokeOf(S,'attic');cover.sort((p,q)=>p[0]-q[0]);let x=ex0;
    for(const [c0,c1] of cover.concat([[ex1,ex1]])){if(c0-x>20)segs.push({x0:x,x1:c0,zone:'attic',src:'attic',rate:atticRate*.12,pulse,...sm});x=Math.max(x,c1);}
    for(const v of (B.eaveVents||[]))segs.push({x0:v.x-v.w/2,x1:v.x+v.w/2,y:v.y,zone:'attic',src:v.kind||'vent',rate:atticRate*(v.kind==='gable'?1.6:1.2),pulse,...sm});}
  let best=null;for(const g of segs){g.rgb=SMOKE_RGB[g.col];if(!best||g.rate>best.rate)best=g;}
  const flame=a.ign&&!a.out&&a.q>.5?a.q:0;
  if(!best){const sm=smokeOf(S,'attic');return{rate:0,flame,segs,pulse,pressure:0,...sm,rgb:SMOKE_RGB[sm.col]};}
  return{rate:best.rate,flame,segs,pulse,pressure:Math.max(0,...segs.filter(g=>g.src==='push').map(g=>g.rate)),vol:best.vol,vel:best.vel,den:best.den,col:best.col,P:best.P,rgb:best.rgb,zone:best.zone};}
function summary(S){const o=S.scn.origin;const burning=Object.values(S.z).filter(z=>z.ign&&!z.out).map(z=>z.id);
  const vis=openingVis(S);let best=null;for(const id in vis){const v=vis[id];const sc=v.rate+v.flame;if(!best||sc>best.sc)best={id,sc,...v};}
  const ev_=eavesVis(S);
  return{origin:o,stage:stageOf(S,o),burning,vis,eaves:ev_,best};}
// flow path: intake (low / fresh air in) vs exhaust (smoke out)
function flowPath(S){const intake=[],exhaust=[];const vis=openingVis(S);
  for(const oid in S.o){const o=S.o[oid];if(o.state==='closed')continue;const v=vis[oid];const B=S.B.openings.find(x=>x.id===oid);const nm=B?B.name:(o.type==='roof'?'Roof vent':oid);
    if(S.fan&&S.fan.on&&S.fan.at===oid){intake.push(nm+' (fan)');continue;}
    if(o.type==='roof'){exhaust.push(nm);continue;}
    const z=S.z[o.zone];if(v.rate>.05){if(o.type==='door'||o.type==='garage'){exhaust.push(nm+' (top)');intake.push(nm+' (bottom)');}else exhaust.push(nm);} else intake.push(nm);}
  return{intake,exhaust};}
return{vlPush,DEF_SET,PRESETS,TASKDEF,CO_TYPES,CONT,newCompany,eqDefault,preDefault,coStatus,freeCrew,crewUsed,canDo,hoseNeed,lineTimes,coTasks,diaTxt,coById,occByTime,OCC_P,bldgPressure,create,step,run,act,lineSpec,lineReach,stageOf,smokeOf,openingVis,eavesVis,summary,flowPath,FUEL,TASK,VOLN,VELN,DENN,SMOKE_RGB,airMap,front,zname,oname};
})();
if(typeof module!=='undefined')module.exports=SizeupModel;
