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
const TASK={stretch:45,perFloor:30,supplyDelay:240,vertical:300,horizontal:15,ppv:60,searchBase:60,searchPerFloor:120,tankGal:500,gpm:150,
  // simplifications (not FSRI values): hoseline cap stands in for staffing (not modeled), repositioning/pull-ceiling times,
  // knockdown hold, low-tank warning level, and how long a knocked-down room must sit dry before it can rekindle.
  lineCap:3,reposition:30,pullCeiling:30,kdHold:10,lowTank:150,rekindleDry:600,rekindleDryExt:120,noFireShutdown:20};
function floorNum(f){return f==='B'?0:f==='Attic'?99:f==='Roof'?100:+f;}

function create(B,scn){
  const R=rng(scn.seed||1);
  const S={B,scn,t:0,tArr:scn.preburn||360,z:{},o:{},c:{},events:[],fan:null,doorControl:false,
    water:{tank:TASK.tankGal,supplyAt:null,supply:false,lines:[],nextId:1},crews:[],searches:[],ext:[],pending:[],flags:{},victim:null,rnd:R,hist:[]};
  for(const z of B.zones)S.z[z.id]={id:z.id,ign:false,tIgn:0,q:0,T:0,s:0,R:1,fuel:1,flashed:false,tFlash:null,vl:false,out:false,wet:0,wetRegrow:600,water:0,steam:0,decay:false,breached:false,dose:0,kd:0,suppressed:false,smold:0,extOnly:true,vf:z.vol||1,attic:!!z.attic,floor:z.floor,showT:0};
  for(const o of B.openings)S.o[o.id]={id:o.id,state:(scn.openings&&scn.openings[o.id])||o.init||'closed',fail:0,failAt:40+R()*50,zone:o.zone,type:o.type,side:o.side,dyn:false};
  for(const c of B.conns){let st=c.type==='door'?((scn.doors&&scn.doors[c.id])||c.init||'closed'):c.type;S.c[c.id]={id:c.id,a:c.a,b:c.b,type:c.type,state:st};}
  // occupant (hidden from the player)
  const occ=scn.occupant||'none';
  if(occ!=='none'){let zid=occ;if(occ==='random'){const cand=B.zones.filter(z=>!z.attic&&z.floor!=='1'&&z.id!=='stair'&&!/^h\d|hall/.test(z.id));zid=cand[Math.floor(R()*cand.length)].id;}S.victim={zone:zid,status:'inside',dose:0};}
  const o0=S.z[scn.origin];if(o0){o0.ign=true;o0.tIgn=0;}
  return S;
}
function front(S){return S.B.openings.find(o=>o.front);}
function connK(S,c){if(c.type==='door')return c.state==='open'?CONN_K.door_open:CONN_K.door_closed;if(c.type==='ceiling')return c.state==='breached'?CONN_K.ceiling_breached:CONN_K.ceiling;return CONN_K[c.type]||0;}
function openK(S,o){const st=o.state;let k=OPEN_K[o.type]||.5;
  if(st==='closed')return o.type==='window'?.004:.007;
  if(st==='controlled')return .15; // door control: pulled closed to the width of a hoseline [FSRI-VV 4.2]
  let w=1;const wd=S.scn.wind;if(wd&&wd.dir&&wd.dir!=='calm'&&wd.dir===o.side&&o.type!=='roof')w=1+[.4,.9,1.6][wd.spd||0]; // wind into an opening (simplification)
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
function lineReach(S,l){const r={};const add=(id,w)=>{if(S.z[id])r[id]=Math.max(r[id]||0,w);};
  if(l.ext)add(l.zone,.85); // exterior: limited to line of sight into the room through that opening [FSRI-FA water mapping]
  else if(l.via){add(l.zone,.8);add(l.via,.6);} // through a pulled ceiling into the attic/cockloft (simplification)
  else{add(l.zone,1);for(const cid in S.c){const c=S.c[cid];if(connK(S,c)>=.85){if(c.a===l.zone)add(c.b,.45);if(c.b===l.zone)add(c.a,.45);}}}
  return r;}

/* ---------- actions ---------- */
function act(S,a){a={...a,t:a.t==null?S.t:a.t};S.pending.push(a);S.pending.sort((x,y)=>x.t-y.t);}
function doAction(S,a){const F=front(S);const fdo=F&&S.o[F.id];
  const openEntry=(why)=>{if(fdo&&fdo.state==='closed'){fdo.state=S.doorControl?'controlled':'open';ev(S,'vent',`${F.name} opened for ${why}${S.doorControl?' (door controlled)':''}. Opening a door is a ventilation action.`,{src:'FSRI-CFA'});S.flags.entryOpenedAt=S.flags.entryOpenedAt??S.t;}};
  switch(a.kind){
  case 'strategy':S.strategy=a.v;ev(S,'order',`Strategy: ${a.v}.`);if(a.v==='Defensive'){const gone=S.water.lines.filter(l=>!l.ext);S.water.lines=S.water.lines.filter(l=>l.ext);S.searches.forEach(s=>{if(!s.done){s.done=true;s.aborted=true;}});ev(S,'order','Interior crews withdrawn'+(gone.length?` (${gone.map(l=>'Line '+l.id).join(', ')} pulled out)`:'')+'.');}break;
  case 'line':{const W=S.water;
    if(a.target==='none'){if(W.lines.length){W.lines=[];ev(S,'order','All hoselines withdrawn.');}break;}
    const spec=lineSpec(S,a.target);if(!spec)break;
    if(!spec.ext&&S.strategy==='Defensive'){ev(S,'note','Interior line not deployed: strategy is defensive.');break;}
    if(W.lines.some(l=>l.key===spec.key)){ev(S,'note',`A line is already assigned to ${spec.label}.`);break;}
    if(W.lines.length>=TASK.lineCap){ev(S,'note',`All ${TASK.lineCap} hoselines are committed. Reassign or withdraw a line first. (Simplification: staffing is not modeled; the cap stands in for the crews on scene.)`);break;}
    const l={id:W.nextId++,...spec,readyAt:S.t+spec.time,flowing:false};if(!spec.ext)l.entering=S.t+TASK.stretch;W.lines.push(l);
    ev(S,'order',`Line ${l.id} ordered: ${spec.desc}.`);if(spec.ext)S.flags.extOrdered=true;break;}
  case 'reassign':{const W=S.water;const l=W.lines.find(l=>l.id===+a.line);if(!l)break;const spec=lineSpec(S,a.target);if(!spec)break;
    if(!spec.ext&&S.strategy==='Defensive'){ev(S,'note','Line not moved inside: strategy is defensive.');break;}
    if(W.lines.some(x=>x!==l&&x.key===spec.key)){ev(S,'note',`A line is already assigned to ${spec.label}.`);break;}
    if(l.key===spec.key)break;
    const from=l.label;let time;
    if(!l.ext&&!spec.ext&&l.entered)time=TASK.reposition+TASK.perFloor*Math.abs(lineFloor(S,spec)-lineFloor(S,l))+(spec.via?TASK.pullCeiling:0);
    else if(l.ext&&spec.ext)time=TASK.reposition+(spec.roof?TASK.perFloor*S.B.stories:0);else time=spec.time;
    const keepEntered=!l.ext&&!spec.ext&&l.entered;
    Object.assign(l,spec,{readyAt:S.t+time,flowing:false,since:null,inPos:false,noFire:null,pulled:false,warned:false,flowedOnce:false});
    if(spec.ext){l.entering=null;l.entered=false;}else if(!keepEntered){l.entered=false;l.entering=S.t+TASK.stretch;}
    ev(S,'order',`Line ${l.id} reassigned from ${from} to ${spec.label} (in position in about ${fmtS(time)}).`);if(spec.ext)S.flags.extOrdered=true;break;}
  case 'withdraw':{const W=S.water;const i=W.lines.findIndex(l=>l.id===+a.line);if(i<0)break;const l=W.lines[i];W.lines.splice(i,1);ev(S,'order',`Line ${l.id} withdrawn from ${l.label}.`);break;}
  case 'supply':if(!S.water.supplyAt){S.water.supplyAt=S.t+TASK.supplyDelay;ev(S,'order','Water supply ordered (hydrant/supply line).');}break;
  case 'doorcontrol':S.doorControl=!!a.on;if(fdo&&fdo.state!=='closed')fdo.state=a.on?'controlled':'open';ev(S,'order',a.on?`Door control at ${F.name}: door pulled closed to the width of the hoseline.`:'Door control released: entry door fully open.',{src:'FSRI-VV'});break;
  case 'vent':{if(a.type==='horizontal'){const o=S.o[a.opening];if(!o)break;S.pending.push({t:S.t+TASK.horizontal,kind:'_ventdone',opening:a.opening});ev(S,'order',`Horizontal ventilation ordered: ${oname(S,a.opening)}.`);}
    else if(a.type==='vertical'){S.pending.push({t:S.t+TASK.vertical,kind:'_roofdone',zone:a.zone});ev(S,'order',`Vertical ventilation ordered over ${zname(S,a.zone)} (roof operations take time).`,{src:'FSRI-VV'});}
    else if(a.type==='ppv'){openEntry('the fan');S.pending.push({t:S.t+TASK.ppv,kind:'_fanon'});ev(S,'order','PPV/PPA fan ordered at the entry door.',{src:'FSRI-PPV'});}
    else if(a.type==='none'){if(S.fan){S.fan.on=false;ev(S,'order','Fan shut down.');}}
    S.pending.sort((x,y)=>x.t-y.t);break;}
  case '_ventdone':{const o=S.o[a.opening];if(o.state==='closed'||o.state==='controlled'){o.state=o.type==='window'?'failed':'open';ev(S,'vent',`${oname(S,a.opening)} vented.`);S.flags.vents=(S.flags.vents||[]);S.flags.vents.push({t:S.t,kind:'horizontal',zone:o.zone,id:a.opening});}break;}
  case '_roofdone':{let zid=a.zone;const z=S.B.zones.find(z=>z.id===zid);let target=zid;
    if(!z.attic&&!isTop(S,zid)){const top=S.B.zones.find(q=>q.floor===String(S.B.stories)&&q.x0<=(z.x0+z.x1)/2&&q.x1>=(z.x0+z.x1)/2&&!q.hidden);target=top?top.id:zid;}
    const id='roof:'+target;S.o[id]={id,state:'open',zone:target,type:'roof',side:'Roof',dyn:true,fail:0,failAt:1e9};
    // pushing the ceiling below a roof vent opens the void space [FSRI-VV 4.7]
    for(const cid in S.c){const c=S.c[cid];if(c.type==='ceiling'&&((c.a===target&&c.b==='attic')||(c.b===target&&c.a==='attic')))c.state='breached';}
    S.o[id].over=target;if(target!=='attic')S.o[id].zone=S.z.attic?'attic':target;
    ev(S,'vent',`Roof opened over ${zname(S,target)}; ceiling pushed below it.`,{src:'FSRI-VV'});S.flags.vents=(S.flags.vents||[]);S.flags.vents.push({t:S.t,kind:'vertical',zone:target});break;}
  case '_fanon':S.fan={on:true,at:F.id};ev(S,'vent','Fan running at the entry door (positive pressure).',{src:'FSRI-PPV'});S.flags.vents=(S.flags.vents||[]);S.flags.vents.push({t:S.t,kind:'ppv'});break;
  case 'search':{if(S.strategy==='Defensive'){ev(S,'note','Primary search not started: strategy is defensive.');break;}
    openEntry('the search crew');const up=Math.max(0,floorNum(a.floor)-1);S.searches.push({floor:a.floor,start:S.t,end:S.t+TASK.searchBase+TASK.perFloor*up+TASK.searchPerFloor,done:false});ev(S,'order',`Primary search ordered: floor ${a.floor}.`);break;}
  // instructor injects
  case 'fail':{const o=S.o[a.opening];if(o){o.state=o.type==='window'?'failed':'open';ev(S,'inject',`${oname(S,a.opening)} ${o.type==='window'?'fails':'is opened'}.`);}break;}
  case 'open':{const o=S.o[a.opening];if(o){o.state='open';ev(S,'inject',`${oname(S,a.opening)} opened.`);}break;}
  case 'close':{const o=S.o[a.opening];if(o){o.state='closed';ev(S,'inject',`${oname(S,a.opening)} closed.`);}break;}
  case 'idoor':{const c=S.c[a.conn];if(c){c.state=a.state;const nm=(S.B.conns.find(x=>x.id===a.conn)||{}).name||a.conn;ev(S,'inject',`${nm} ${a.state==='open'?'opened':'closed'}.`);}break;}
  case 'wind':S.scn.wind={dir:a.dir,spd:a.spd};ev(S,'inject',a.dir==='calm'?'Wind is now calm.':`Wind shifts: now from Side ${a.dir}.`);break;
  case 'note':ev(S,'inject',a.text);break;
  }}
/* ---------- one simulation second ---------- */
function step(S){const dt=1;
  while(S.pending.length&&S.pending[0].t<=S.t)doAction(S,S.pending.shift());
  const {air,own,hi}=airMap(S);S._air=air;S._own=own;
  // water
  const W=S.water;if(W.supplyAt!=null&&!W.supply&&S.t>=W.supplyAt){W.supply=true;ev(S,'water','Water supply established.');}
  let flowing=0;const hasWater=W.supply||W.tank>0;
  for(const l of W.lines){if(!l.ext&&l.entering!=null&&S.t>=l.entering&&!l.entered){l.entered=true;const F=front(S);const fo=F&&S.o[F.id];if(fo&&fo.state==='closed'){fo.state=S.doorControl?'controlled':'open';S.flags.entryOpenedAt=S.flags.entryOpenedAt??S.t;ev(S,'vent',`${F.name} opened for the hoseline${S.doorControl?' (door controlled)':''}. Opening the door is a ventilation action.`,{src:'FSRI-CFA'});}}
    const r=lineReach(S,l);const fire=Object.keys(r).some(id=>S.z[id].ign&&!S.z[id].out);
    if(S.t>=l.readyAt&&!l.inPos){l.inPos=true;
      if(l.via&&!l.pulled){l.pulled=true;for(const cid in S.c){const c=S.c[cid];if(c.type==='ceiling'&&((c.a===l.via&&c.b===l.zone)||(c.b===l.via&&c.a===l.zone)))c.state='breached';}
        ev(S,'vent',`Line ${l.id}: ceiling pulled in ${zname(S,l.via)} to reach the ${zname(S,l.zone)}. The opening also lets heat and smoke from the void into that room.`,{src:'FSRI-VV'});}
      if(!fire)ev(S,'water',`Line ${l.id} in position: ${l.label}. No fire within reach, so it stands by without flowing.`);}
    if(fire)l.noFire=null;else if(l.noFire==null)l.noFire=S.t;
    const want=l.inPos&&hasWater&&(fire||(l.flowing&&S.t-l.noFire<TASK.noFireShutdown));
    if(want){if(!l.flowing){l.flowing=true;l.since=S.t;
        ev(S,'water',l.flowedOnce?`Line ${l.id} flowing again: fire within reach of ${l.label}.`:l.ext?`Line ${l.id}: water applied from outside through ${oname(S,l.opening)}.`:`Line ${l.id} in position and flowing: ${l.label}.`,{src:l.ext?'FSRI-VV':'FSRI-FA'});
        l.flowedOnce=true;if(S.flags.firstWater==null)S.flags.firstWater=S.t;}flowing++;}
    else if(l.flowing){l.flowing=false;
      if(!hasWater){if(!S.flags.dryMsg){S.flags.dryMsg=true;ev(S,'water','Tank water exhausted: lines have stopped flowing. No supply established.');}}
      else ev(S,'water',`Line ${l.id} shut down: no fire left within reach of ${l.label}. It stands by and restarts if fire returns there.`);}}
  // tank: each flowing line draws its own flow until a supply is established (simplification)
  if(flowing&&!W.supply){W.tank=Math.max(0,W.tank-TASK.gpm/60*dt*flowing);
    if(W.tank<TASK.lowTank&&W.tank>0&&!S.flags.lowTank){S.flags.lowTank=true;ev(S,'water',`Tank water low: about ${Math.round(W.tank)} gal left, roughly ${fmtS(W.tank/(TASK.gpm*flowing/60))} at the current flow.${W.supplyAt!=null?' Supply is on the way.':' No water supply has been ordered.'}`);}}
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
    dT=clamp(dT,-.03,.03);Bz.T+=dT/Bz.vf*.9;A.T-=dT/A.vf*.25;}
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
  for(const s of S.searches){if(s.done)continue;
    const zonesF=S.B.zones.filter(z=>z.floor===s.floor);const worst=Math.max(...zonesF.filter(z=>!z.hidden||true).map(z=>zs[z.id].T*(S.c[connOf(S,z.id)]?.state==='closed'?.2:1)));
    if(worst>.75&&!s.warned){s.warned=true;ev(S,'crew',`Search crew on floor ${s.floor} is in untenable heat in the flow path. Crew must retreat.`,{src:'FSRI-VV'});s.done=true;s.aborted=true;continue;}
    if(S.t>=s.end){s.done=true;let found=false;if(S.victim&&S.victim.status==='inside'&&S.B.zones.find(z=>z.id===S.victim.zone).floor===s.floor){found=true;S.victim.status=S.victim.untenable?'found-late':'rescued';S.victim.foundAt=S.t;}
      ev(S,'search',`Primary search floor ${s.floor} complete: ${found?(S.victim.status==='rescued'?`occupant found in ${zname(S,S.victim.zone)} and removed`:`occupant found in ${zname(S,S.victim.zone)}; conditions there had already exceeded tenability`):'negative'}.`,{src:'FSRI-VV'});}}
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
function openingVis(S){const out={};const own=S._own||airMap(S).own;const bp=bldgPressure(S);
  for(const oid in S.o){const o=S.o[oid],z=S.z[o.zone];if(!z)continue;const sm=smokeOf(S,o.zone,o);
    const open=o.state!=='closed';const ctrl=o.state==='controlled';
    let rate=0;if(open)rate=z.s*(.4+z.T)*(ctrl?.35:1)*(o.type==='roof'?1.6:1)*(S.fan&&S.fan.on&&S.fan.at!==oid?1.7:1);
    else if(z.s>.3)rate=Math.max(0,(z.s-.3)*(z.T*.3+bp*.25)); // pushing through gaps around closed windows/doors
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
function eavesVis(S){const a=S.z.attic;if(!a)return null;let sm=smokeOf(S,'attic');
  // smoke pushing through soffit/eave vents when the attic/cockloft has smoke
  let rate=Math.max(0,a.s-.15)*(.6+a.T*1.5);
  // pressure push: in a closed-up building smoke finds the eaves/soffit gaps too (simplification)
  const bp=bldgPressure(S);let sMax=0,zid=null;for(const id in S.z){const z=S.z[id];if(!z.attic&&z.s>sMax){sMax=z.s;zid=id;}}
  const pr=bp*Math.max(0,sMax-.3)*.45;
  if(pr>rate&&zid){const zs=smokeOf(S,zid);sm={vol:Math.min(2,zs.vol),vel:Math.min(2,zs.vel),den:Math.min(1,zs.den),col:zs.col==='white'?'white':'gray',P:zs.P};rate=pr;}
  return{rate,flame:a.ign&&!a.out&&a.q>.5?a.q:0,...sm,rgb:SMOKE_RGB[sm.col],pressure:pr};}
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
return{bldgPressure,create,step,run,act,lineSpec,lineReach,stageOf,smokeOf,openingVis,eavesVis,summary,flowPath,FUEL,TASK,VOLN,VELN,DENN,SMOKE_RGB,airMap,front,zname,oname};
})();
if(typeof module!=='undefined')module.exports=SizeupModel;
