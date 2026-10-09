(()=>{
'use strict';
const PRISTINE=(()=>{const c=document.documentElement.cloneNode(true);const e=c.querySelector('#sizeup-scenario');if(e)e.remove();return'<!DOCTYPE html>\n'+c.outerHTML;})();
const SCN_TAG='<scr'+'ipt id="sizeup-scenario" type="application/json">',SCN_END='</scr'+'ipt>';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const M=SizeupModel,SRC=SIZEUP_SOURCES,RULES=SIZEUP_RULES;
const fmt=s=>{s=Math.max(0,Math.round(s));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
const CHECKS=['360 completed','Water supply','RIT / RIC assigned','Search priority set','Command established','More resources requested'];
const A={mode:'solo',screen:1,maxScreen:1,B:null,img:null,scn:null,S:null,hidden:false,calls:{},locked:false,lockResult:null,checks:{},facts:{},
  playing:false,speed:1,stepSize:60,simAcc:0,lastEvN:0,latest:[],showFlow:true,markMode:'origin',side:'A',vis:null,visT:-1,photoMarks:null,finished:false};
window.__sizeup={A,M};

/* ---------- assets ---------- */
const IMGS={};
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
async function initSamples(){for(const k of ['house','mixed']){IMGS[k]=await loadImg(SIZEUP_ASSETS[k]);$('#th_'+k).src=SIZEUP_ASSETS[k];}}

/* ---------- photo building (manual marks) ---------- */
function defaultMarks(W,H,stories){return{stories,eave:Math.round(H*.25),grade:Math.round(H*.86),openings:[]};}
function photoBuilding(W,H,mk){const n=mk.stories,eave=mk.eave,grade=mk.grade,bh=(grade-eave)/n;
  const floors=[{f:'Roof',y0:0,y1:Math.max(1,eave-H*.09)},{f:'Attic',y0:Math.max(1,eave-H*.09),y1:eave}];
  for(let i=n;i>=1;i--)floors.push({f:String(i),y0:eave+(n-i)*bh,y1:eave+(n-i+1)*bh});floors.push({f:'B',y0:grade,y1:H});
  const xs=mk.openings.map(o=>o.x);const x0=xs.length?Math.max(0,Math.min(...xs)-W*.08):W*.12,x1=xs.length?Math.min(W,Math.max(...xs)+W*.08):W*.88,mid=(x0+x1)/2;
  const zones=[],conns=[],openings=[];
  for(let f=1;f<=n;f++){zones.push({id:'L'+f,name:`Floor ${f}, left room`,floor:String(f),x0,x1:mid,vol:1},{id:'R'+f,name:`Floor ${f}, right room`,floor:String(f),x0:mid,x1,vol:1},{id:'h'+f,name:`Floor ${f} hall / stair`,floor:String(f),x0:mid-W*.03,x1:mid+W*.03,vol:.6,hidden:true});
    conns.push({id:`h${f}-L${f}`,a:'h'+f,b:'L'+f,type:f===1?'open':'door',init:'open',name:`Floor ${f} left room door`},{id:`h${f}-R${f}`,a:'h'+f,b:'R'+f,type:f===1?'open':'door',init:f===1?'open':'closed',name:`Floor ${f} right room door`});
    if(f>1)conns.push({id:`h${f-1}-h${f}`,a:'h'+(f-1),b:'h'+f,type:'stair'},{id:`L${f-1}-L${f}`,a:'L'+(f-1),b:'L'+f,type:'ceiling'},{id:`R${f-1}-R${f}`,a:'R'+(f-1),b:'R'+f,type:'ceiling'});}
  zones.push({id:'attic',name:'Attic',floor:'Attic',x0,x1,vol:1.4,attic:true});
  conns.push({id:`L${n}-attic`,a:'L'+n,b:'attic',type:'ceiling'},{id:`R${n}-attic`,a:'R'+n,b:'attic',type:'ceiling'},{id:`h${n}-attic`,a:'h'+n,b:'attic',type:'ceiling'});
  let front=false;const cnt={};
  mk.openings.forEach((o,i)=>{let f='1';for(const b of floors)if(o.y>=b.y0&&o.y<b.y1)f=b.f;if(!/^\d+$/.test(f))f=o.y<eave?String(n):'1';
    let zone=(o.x<mid?'L':'R')+f;let isFront=false;if(o.type==='door'&&f==='1'&&!front){zone='h1';front=true;isFront=true;}
    cnt[f]=(cnt[f]||0)+1;openings.push({id:'p'+i,name:`Floor ${f} ${o.type} ${cnt[f]}`,type:o.type,side:'A',zone,x:o.x,y:o.y,w:o.w,h:o.h,front:isFront});});
  if(!front)openings.push({id:'pfd',name:'Entry door (not marked)',type:'door',side:'A',zone:'h1',hidden:true,front:true});
  openings.push({id:'prear',name:'Rear door (Side C)',type:'door',side:'C',zone:'L1',hidden:true});
  const roofSpots={};zones.filter(z=>z.floor===String(n)||z.attic).forEach(z=>roofSpots[z.id]={x:(z.x0+z.x1)/2,y:Math.max(4,eave-H*.05)});
  return{id:'photo',name:'Your photo',W,H,stories:n,atticName:'Attic',construction:'wood',floors,bldg:{x0,x1},eaves:[{x0,x1,y:eave,zone:'attic'}],ridge:{x0,x1,y:Math.max(4,eave-H*.08)},zones,openings,conns,roofSpots,
    facts:{occupancy:'Residential (confirm)',construction:'Unknown, confirm on 360',stories:String(n),exposures:'B: ? · D: ?',life:'Unknown, not yet confirmed'},suggested:{origin:'L1',fuel:'modern',preburn:210}};}

/* ---------- scenario & sim ---------- */
function newScenario(B){const sg=B.suggested||{};return{format:'sizeup-scenario',v:2,sceneId:B.id,origin:sg.origin||B.zones[0].id,fuel:sg.fuel||'modern',preburn:sg.preburn||360,
  openings:{...(sg.openings||{})},doors:{...(sg.doors||{})},occupant:'random',wind:{dir:'calm',spd:0},glass:'fails',seed:(Math.random()*1e9)|0,actions:[],tNow:0};}
function rebuild(){const sc=A.scn;const S=M.create(A.B,JSON.parse(JSON.stringify(sc)));M.run(S,sc.preburn);S.tArr=sc.preburn;
  const evs=S.events.length;A.preEvents=S.events.slice();
  for(const a of sc.actions)M.act(S,{...a,t:sc.preburn+a.t});M.run(S,sc.tNow);A.S=S;A.lastEvN=evs;A.visT=-1;A.simAcc=0;}
const now=()=>A.S?A.S.t-A.S.tArr:0;
const NOAUTO=/noautoplay/.test(location.hash);
function startClock(){A.simAcc=0;A.playing=!NOAUTO;A.wasPlaying=false;syncUI();}
function advance(sec){const S=A.S;const n0=S.events.length;for(let i=0;i<sec;i++)M.step(S);A.scn.tNow=now();return S.events.slice(n0);}
function order(a){const t=now();const act={...a,t};A.scn.actions.push(act);M.act(A.S,{...a,t:A.S.t});M.step(A.S);A.scn.tNow=now();// apply immediately-due orders
  refreshAll();}
function zoneOf(id){return A.B.zones.find(z=>z.id===id);}
function zname(id){return M.zname(A.S||{B:A.B},id);}

/* ---------- renderer & layout ---------- */
const stage=$('#stage'),cv=$('#cv'),ov=$('#ov'),octx=ov.getContext('2d');let R=null,rect={x:0,y:0,w:1,h:1},dpr=1;
try{R=SizeupRender.create(cv);}catch(e){console.error(e);R=null;}
if(!R)$('#glfail').style.display='block';
window.__sizeup.R=()=>R;
function layout(){const w=stage.clientWidth||300,B=A.B,W=B?B.W:1200,H=B?B.H:800,wide=innerWidth>=960;
  let maxH=A.screen===4?(wide?innerHeight*(A.mode==='crew'?.78:.6):innerHeight*.42):(wide?innerHeight*.72:innerHeight*.48);
  const h=Math.round(Math.min(w*H/W,Math.max(220,maxH)));stage.style.height=h+'px';dpr=Math.min(devicePixelRatio||1,1.6);
  for(const c of [cv,ov]){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}
  const sc=Math.min(w/W,h/H);rect={x:(w-W*sc)/2,y:(h-H*sc)/2,w:W*sc,h:H*sc};}
new ResizeObserver(()=>layout()).observe(stage);
function curVis(){if(!A.S||A.screen<3)return null;if(A.visT!==A.S.t){A.vis=SizeupVisual.build(A.S,A.B,M);A.visT=A.S.t;}return A.vis;}
function setTexture(){if(R&&A.img)R.setImage(A.img,A.B.W,A.B.H);}
function warm(sec){if(R){R.clear();const v=curVis();if(v)R.prewarm(sec,v);}}
let last=performance.now(),uiT=0;
function loop(now_){const wdt=Math.min(1,(now_-last)/1000),dt=Math.min(.05,wdt);last=now_;
  if(A.screen>=2&&A.B&&!document.hidden){
    if(A.playing&&A.screen===4&&A.S){A.simAcc+=wdt*A.speed;let n=0;const n0=A.S.events.length;while(A.simAcc>=1&&n<60){A.simAcc--;M.step(A.S);n++;}A.scn.tNow=now();
      const ne=A.S.events.slice(n0);if(ne.length){A.latest=ne.map(e=>e.msg);buildInjects();toast(`T+${fmt(now())} · ${ne[0].msg}`);}uiT+=wdt;if(uiT>.5||ne.length){uiT=0;renderBoard();}}
    if(R){R.update(dt,A.screen>=3?curVis():null);R.draw(rect,dpr);}drawOverlay();}
  requestAnimationFrame(loop);}
function toScene(cx,cy){return{x:(cx-rect.x)/rect.w*A.B.W,y:(cy-rect.y)/rect.h*A.B.H};}
function drawOverlay(){const c=octx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,ov.width,ov.height);if(!A.B)return;const B=A.B;const k=rect.w/B.W*dpr;c.setTransform(k,0,0,k,rect.x*dpr,rect.y*dpr);const U=B.H/800;
  const markRect=(o,col,dash)=>{c.setLineDash(dash?[8*U,6*U]:[]);c.strokeStyle=col;c.lineWidth=3*U/Math.max(.6,k*B.W/1200/ (B.W/1200));c.lineWidth=Math.max(2*U,2/k);c.strokeRect(o.x-o.w/2,o.y-o.h/2,o.w,o.h);c.setLineDash([]);};
  if(A.screen===2){if(B.id==='photo'){const mk=A.photoMarks;c.setLineDash([10*U,8*U]);c.lineWidth=Math.max(2/k,2*U);c.strokeStyle='#ffb300';c.beginPath();c.moveTo(0,mk.eave);c.lineTo(B.W,mk.eave);c.stroke();c.strokeStyle='#90caf9';c.beginPath();c.moveTo(0,mk.grade);c.lineTo(B.W,mk.grade);c.stroke();c.setLineDash([]);
      c.font=`${Math.round(16*U)}px sans-serif`;c.fillStyle='#ffb300';c.fillText('EAVE',8*U,mk.eave-6*U);c.fillStyle='#90caf9';c.fillText('GRADE',8*U,mk.grade-6*U);
      B.floors.filter(f=>/^\d+$/.test(f.f)).forEach(f=>{c.fillStyle='rgba(255,255,255,.75)';c.fillText('F'+f.f,B.W-40*U,(f.y0+f.y1)/2);});
      B.openings.filter(o=>!o.hidden).forEach(o=>markRect(o,o.type==='door'?'#90caf9':'#ffb300',false));}
    const o=A.originPt;if(o){const r=20*U*(1+.12*Math.sin(performance.now()/180));c.fillStyle='rgba(211,47,47,.3)';c.beginPath();c.arc(o.x,o.y,r*1.6,0,7);c.fill();c.lineWidth=5*U;c.strokeStyle='#fff';c.beginPath();c.arc(o.x,o.y,r,0,7);c.stroke();c.fillStyle='#fff';c.beginPath();c.arc(o.x,o.y,6*U,0,7);c.fill();}}
  if(A.screen===3&&A.S){B.openings.filter(o=>!o.hidden).forEach(o=>{const st=A.S.o[o.id].state;if(st!=='closed')markRect(o,'#ffb300',true);else{c.globalAlpha=.25;markRect(o,'#fff',true);c.globalAlpha=1;}});}
  if(A.screen===4&&A.S&&A.showFlow&&!isHidden()){const v=curVis();const ov_=M.openingVis(A.S);
    for(const o of B.openings){if(o.hidden)continue;const st=A.S.o[o.id];if(!st||st.state==='closed')continue;const vv=ov_[o.id];const out=vv.rate>.05,inn=vv.inflow||(A.S.fan&&A.S.fan.at===o.id);
      const arrow=(x,y,dir,col)=>{const s=16*U;c.fillStyle=col;c.strokeStyle='rgba(0,0,0,.6)';c.lineWidth=2*U;c.beginPath();if(dir<0){c.moveTo(x,y-s);c.lineTo(x+s*.8,y+s*.4);c.lineTo(x-s*.8,y+s*.4);}else{c.moveTo(x,y+s);c.lineTo(x+s*.8,y-s*.4);c.lineTo(x-s*.8,y-s*.4);}c.closePath();c.fill();c.stroke();};
      if(out)arrow(o.x,o.y-o.h/2-12*U,-1,'#ff7043');if(inn)arrow(o.x,o.y+o.h/2-14*U,1,'#64b5f6');}}}

/* ---------- navigation ---------- */
const TITLES={1:['SizeUp','Capture the building'],2:['Tap where the fire starts','Set the fire origin'],3:['Dial in fire & smoke','Set the conditions at arrival'],4:['Command board','Size-up drill']};
function show(n){if(n>A.maxScreen)return;const prev=A.screen;A.screen=n;$$('.screen').forEach(s=>s.classList.toggle('on',s.id==='s'+n));
  const slot=$('#s'+n+' .slot');if(slot){slot.appendChild(stage);stage.style.display='';}else{document.body.appendChild(stage);stage.style.display='none';}
  $('#ttl').textContent=TITLES[n][0];$('#sub').textContent=`Step ${n} of 4 · ${TITLES[n][1]}`;$('#backBtn').hidden=n===1;stage.classList.toggle('tapmode',n===2||n===3);
  if(n>=3&&(!A.S||prev<3)){rebuild();warm(4);}if(n<4)A.playing=false;
  layout();syncUI();if(n===3)renderSetup();if(n===4){renderBoard();buildInjects();}scrollTo({top:0});}
$('#backBtn').onclick=()=>show(Math.max(1,A.screen-1));
$$('#steps button').forEach(b=>b.onclick=()=>show(+b.dataset.go));
function reach(n){A.maxScreen=Math.max(A.maxScreen,n);}
function useBuilding(B,img){A.B=B;A.img=img;A.scn=newScenario(B);A.S=null;A.originPt=null;A.calls={};A.locked=false;A.lockResult=null;A.checks={};A.facts={...B.facts};A.latest=[];A.finished=false;A.hidden=false;
  $('#radio').value='';setTexture();buildRoomSel();A.maxScreen=2;show(2);}
$$('.sample').forEach(b=>b.onclick=()=>{const B=BUILDINGS[b.dataset.sample];useBuilding(B,IMGS[b.dataset.sample]);A.originPt=null;A.originSet=false;});
async function loadPhoto(file){if(!file)return;$('#fileErr').textContent='';try{let src;
  try{src=await createImageBitmap(file,{imageOrientation:'from-image'});}catch(e){src=await loadImg(URL.createObjectURL(file));}
  const k=Math.min(1,1400/Math.max(src.width,src.height)),c=document.createElement('canvas');c.width=Math.round(src.width*k);c.height=Math.round(src.height*k);c.getContext('2d').drawImage(src,0,0,c.width,c.height);
  A.photoData=c.toDataURL('image/jpeg',.85);const im=await loadImg(A.photoData);A.photoMarks=defaultMarks(c.width,c.height,2);useBuilding(photoBuilding(c.width,c.height,A.photoMarks),im);A.markMode='window';A.originSet=false;syncUI();}
  catch(e){console.error(e);$('#fileErr').textContent='Could not read that image. Try a JPG or PNG.';}}
['#fileCam','#fileUpload'].forEach(id=>$(id).addEventListener('change',e=>{loadPhoto(e.target.files[0]);e.target.value='';}));

/* ---------- step 2: origin & marking ---------- */
function buildRoomSel(){const B=A.B;$('#roomSel').innerHTML=B.zones.map(z=>`<option value="${z.id}">${esc(z.name)}${z.hidden?' (interior)':''}</option>`).join('');$('#roomSel').value=A.scn.origin;}
$('#roomSel').onchange=e=>{A.scn.origin=e.target.value;A.originSet=true;const z=zoneOf(A.scn.origin);const o=A.B.openings.find(o=>o.zone===z.id&&!o.hidden);A.originPt=o?{x:o.x,y:o.y}:{x:(z.x0+z.x1)/2,y:A.B.floors.find(f=>f.f===z.floor)?((f=>(f.y0+f.y1)/2)(A.B.floors.find(f=>f.f===z.floor))):A.B.H/2};A.S=null;syncUI();};
function zoneAt(x,y){const B=A.B;const o=B.openings.find(o=>!o.hidden&&Math.abs(x-o.x)<o.w/2+10&&Math.abs(y-o.y)<o.h/2+10);if(o)return o.zone;
  let f=null;for(const b of B.floors)if(y>=b.y0&&y<b.y1)f=b.f;if(f==='Roof'||f==='Attic')return(B.zones.find(z=>z.attic)||{}).id;if(f==='B'||!f)f='1';
  const c=B.zones.filter(z=>z.floor===f&&!z.hidden);if(!c.length)return B.zones[0].id;c.sort((a,b)=>Math.abs((a.x0+a.x1)/2-x)-Math.abs((b.x0+b.x1)/2-x));return(c.find(z=>x>=z.x0&&x<=z.x1)||c[0]).id;}
function onTap(cx,cy){if(!A.B)return;if(cx<rect.x||cx>rect.x+rect.w||cy<rect.y||cy>rect.y+rect.h)return;const p=toScene(cx,cy);
  if(A.screen===2){if(A.B.id==='photo'&&A.markMode!=='origin'){const mk=A.photoMarks;const bh=(mk.grade-mk.eave)/mk.stories;
      if(A.markMode==='eave')mk.eave=Math.round(Math.min(p.y,mk.grade-40));else if(A.markMode==='grade')mk.grade=Math.round(Math.max(p.y,mk.eave+40));
      else{const hit=mk.openings.findIndex(o=>Math.abs(p.x-o.x)<o.w/2&&Math.abs(p.y-o.y)<o.h/2);if(hit>=0)mk.openings.splice(hit,1);else{const h=A.markMode==='door'?bh*.78:bh*.5,w=A.markMode==='door'?h*.45:h*.7;mk.openings.push({type:A.markMode,x:Math.round(p.x),y:Math.round(A.markMode==='door'?Math.min(p.y,mk.grade-h/2):p.y),w:Math.round(w),h:Math.round(h)});}}
      const keep=A.scn.origin;A.B=photoBuilding(A.B.W,A.B.H,mk);buildRoomSel();if(A.B.zones.some(z=>z.id===keep))A.scn.origin=keep;$('#roomSel').value=A.scn.origin;A.S=null;syncUI();return;}
    A.scn.origin=zoneAt(p.x,p.y);A.originPt=p;A.originSet=true;$('#roomSel').value=A.scn.origin;A.S=null;syncUI();return;}
  if(A.screen===3){const o=A.B.openings.find(o=>!o.hidden&&Math.abs(p.x-o.x)<o.w/2+8&&Math.abs(p.y-o.y)<o.h/2+8);if(o){cycleOpening(o.id);}}}
cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect();onTap(e.clientX-r.left,e.clientY-r.top);});
$('#undoMark').onclick=()=>{if(!A.photoMarks)return;A.photoMarks.openings.pop();A.B=photoBuilding(A.B.W,A.B.H,A.photoMarks);buildRoomSel();A.S=null;syncUI();};
function setStories(n){if(!A.B||A.B.id!=='photo')return;A.photoMarks.stories=clamp(n,1,6);A.B=photoBuilding(A.B.W,A.B.H,A.photoMarks);A.facts.stories=String(A.photoMarks.stories);buildRoomSel();A.S=null;syncUI();}
$('#stDown').onclick=()=>setStories((A.photoMarks||{stories:2}).stories-1);$('#stUp').onclick=()=>setStories((A.photoMarks||{stories:2}).stories+1);
$('#toDial').onclick=()=>{reach(3);show(3);};

/* ---------- step 3: conditions at arrival ---------- */
function cycleOpening(id){const o=A.B.openings.find(o=>o.id===id);const cur=A.scn.openings[id]||o.init||'closed';const nx=cur==='closed'?(o.type==='window'?'failed':'open'):'closed';A.scn.openings[id]=nx;rebuild();warm(3);renderSetup();}
function fireRoomConn(){const z=A.scn.origin;return A.B.conns.find(c=>c.type==='door'&&(c.a===z||c.b===z));}
function renderSetup(){if(!A.B)return;const sc=A.scn;
  $('#olist').innerHTML=A.B.openings.map(o=>{const st=sc.openings[o.id]||o.init||'closed';return `<div class="oitem"><span>${esc(o.name)}</span><div class="seg" data-op="${o.id}"><button data-v="closed" class="${st==='closed'?'on':''}">Closed</button><button data-v="${o.type==='window'?'failed':'open'}" class="${st!=='closed'?'on':''}">${o.type==='window'?'Broken/open':'Open'}</button></div></div>`;}).join('');
  $('#dlist').innerHTML=A.B.conns.filter(c=>c.type==='door').map(c=>{const st=sc.doors[c.id]||c.init||'closed';return `<div class="oitem"><span>${esc(c.name||c.id)}</span><div class="seg" data-dr="${c.id}"><button data-v="open" class="${st==='open'?'on':''}">Open</button><button data-v="closed" class="${st==='closed'?'on':''}">Closed</button></div></div>`;}).join('');
  const occ=sc.occupant;$('#occSel').innerHTML=`<option value="none">No occupant reported</option><option value="random">Occupant reported, location unknown (random, hidden)</option>`+A.B.zones.filter(z=>!z.attic).map(z=>`<option value="${z.id}">Occupant in ${esc(z.name)}</option>`).join('');$('#occSel').value=occ;
  const frc=fireRoomConn();$('#vFrd').textContent=frc?frc.name:'(no door: open to the rest of the floor)';$$('.seg[data-key=frdoor] button').forEach(b=>{b.disabled=!frc;b.classList.toggle('on',!!frc&&(sc.doors[frc.id]||frc.init)===b.dataset.v);});
  $('#reading').innerHTML=readingHTML();
  if(A.S){const nf=Object.values(A.S.o).filter(o=>o.state!=='closed'&&o.type==='window').length;$('#preHint').textContent=`At arrival: ${M.stageOf(A.S,A.scn.origin).toLowerCase()}${nf?` · ${nf} window${nf>1?'s':''} already open/failed`:''}. The clock starts running at arrival.`;}syncUI();}
$('#olist').onclick=e=>{const b=e.target.closest('button');const sg=e.target.closest('[data-op]');if(!b||!sg)return;A.scn.openings[sg.dataset.op]=b.dataset.v;rebuild();warm(3);renderSetup();};
$('#dlist').onclick=e=>{const b=e.target.closest('button');const sg=e.target.closest('[data-dr]');if(!b||!sg)return;A.scn.doors[sg.dataset.dr]=b.dataset.v;rebuild();warm(3);renderSetup();};
$('#occSel').onchange=e=>{A.scn.occupant=e.target.value;rebuild();renderSetup();};
$('#toBoard').onclick=()=>{reach(4);A.scn.actions=[];A.scn.tNow=0;rebuild();warm(4);show(4);startClock();toast(A.playing?'Drill clock running. The fire keeps developing until you act. Pause any time.':'Drill clock paused. Press Play to start.');};
$('#surprise').onclick=()=>{const sc=A.scn,r=Math.random;sc.fuel=r()<.75?'modern':'legacy';sc.preburn=[180,300,480,720,900][Math.floor(r()*5)];sc.occupant=r()<.6?'random':'none';
  for(const c of A.B.conns)if(c.type==='door')sc.doors[c.id]=r()<.5?'open':'closed';sc.openings={};if(r()<.35){const w=A.B.openings.filter(o=>o.type==='window'&&!o.hidden);sc.openings[w[Math.floor(r()*w.length)].id]='failed';}
  sc.wind={dir:['calm','A','B','C','D'][Math.floor(r()*5)],spd:Math.floor(r()*3)};sc.preburn=[150,210,300,480,720,900][Math.floor(r()*6)];sc.seed=(r()*1e9)|0;A.hidden=true;A.locked=false;reach(4);sc.actions=[];sc.tNow=0;rebuild();warm(4);show(4);startClock();toast('Conditions randomized. Answers are hidden until you lock in your size-up.');};

/* ---------- segmented controls ---------- */
$$('.seg[data-key]').forEach(seg=>seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;const key=seg.dataset.key;let v=b.dataset.v;if(seg.hasAttribute('data-num'))v=+v;
  const sc=A.scn;
  switch(key){case 'markMode':A.markMode=v;break;case 'side':A.side=v;break;
   case 'fuel':sc.fuel=v;rebuild();warm(3);break;case 'glass':sc.glass=v;rebuild();warm(3);break;case 'preburn':sc.preburn=v;rebuild();warm(3);break;
   case 'frdoor':{const c=fireRoomConn();if(c){sc.doors[c.id]=v;rebuild();warm(3);}break;}
   case 'windDir':sc.wind={...sc.wind,dir:v};if(A.S)A.S.scn.wind={...sc.wind};A.visT=-1;break;case 'windSpd':sc.wind={...sc.wind,spd:v};if(A.S)A.S.scn.wind={...sc.wind};A.visT=-1;break;
   case 'strategy':order({kind:'strategy',v});break;
   case 'speed':A.speed=v;break;case 'stepSize':A.stepSize=v;break;
   default:if(key.startsWith('call_')){A.calls[key.slice(5)]=v;renderCalls();}}
  if(A.screen===3)renderSetup();syncUI();}));
function syncUI(){const sc=A.scn;
  $$('.seg[data-key]').forEach(seg=>{const k=seg.dataset.key;let v;
    if(k==='markMode')v=A.markMode;else if(k==='side')v=A.side;else if(!sc)return;else if(k==='fuel')v=sc.fuel;else if(k==='glass')v=sc.glass||'fails';else if(k==='preburn')v=sc.preburn;else if(k==='windDir')v=sc.wind.dir;else if(k==='windSpd')v=sc.wind.spd;else if(k==='strategy')v=A.S&&A.S.strategy;else if(k==='speed')v=A.speed;else if(k==='stepSize')v=A.stepSize;else if(k.startsWith('call_'))v=A.calls[k.slice(5)];else return;
    seg.querySelectorAll('button').forEach(b=>b.classList.toggle('on',String(v)===b.dataset.v));});
  if(!sc)return;
  $('#vFuel').textContent=M.FUEL[sc.fuel].label;$('#vPre').textContent=`${+(sc.preburn/60).toFixed(1)} min`;$('#vGlass').textContent=(sc.glass||'fails')==='hold'?'Glass holds: closed fires starve':'Glass can fail on its own';$('#vWind').textContent=windText();
  $$('.seg[data-key=windSpd] button').forEach(b=>b.disabled=sc.wind.dir==='calm');
  const isPhoto=A.B&&A.B.id==='photo';$('#markCtl').hidden=!isPhoto;$('#storiesCtl').hidden=!isPhoto;
  if(isPhoto){const mk=A.photoMarks;$('#markStat').textContent=`${mk.openings.filter(o=>o.type==='window').length} windows, ${mk.openings.filter(o=>o.type==='door').length} doors marked. Tap a marked one again to remove it.`;$('#markHint').textContent={origin:'Tap the fire room',window:'Tap each window',door:'Tap each door',eave:'Tap the eave line',grade:'Tap the ground line'}[A.markMode];$('#stOut').textContent=mk.stories;}
  const z=zoneOf(sc.origin);$('#floorAuto').textContent=A.originSet?`${z.name} · ${floorLabel(z.floor)}`:'Tap the photo or pick a room';
  $('#toDial').disabled=!A.originSet;
  const chips=A.screen>=2&&A.originSet&&!isHidden();$('#chipSide').hidden=!chips;$('#chipFloor').hidden=!chips;$('#chipSide b').textContent=A.side;$('#chipFloor b').textContent=z.floor==='Attic'?'ATT':z.floor;$('#chipFloor small').textContent=/^\d+$/.test(z.floor)?'FLOOR':'LEVEL';
  $('#taphint').classList.toggle('show',A.screen===2&&!A.originSet&&!(isPhoto&&A.markMode!=='origin'));if(isPhoto&&A.screen===2&&A.markMode!=='origin'){$('#taphint').textContent=$('#markHint').textContent;$('#taphint').classList.add('show');}else $('#taphint').textContent='Tap where the fire starts';
  const fo=A.S&&A.screen>=3&&Object.values(A.S.z).some(z=>z.flashed&&!z.out)&&!isHidden();$('#foChip').classList.toggle('show',!!fo);
  $('#clock').classList.toggle('show',A.screen===4);$('#clock').classList.toggle('paused',!A.playing);$('#clock').textContent=A.playing?`▶ T+${fmt(now())} · ${A.speed}×`:`❚❚ PAUSED · T+${fmt(now())}`;
  $('#cbT').textContent=`T+${fmt(now())}`;$('#cbS').textContent=A.playing?`running ${A.speed}× · since arrival`:'paused · since arrival';$('#cbClock').classList.toggle('run',A.playing);
  $('#legend').classList.toggle('show',A.screen===4&&A.showFlow&&!isHidden());
  $$('#steps button').forEach(b=>{const n=+b.dataset.go;b.disabled=n>A.maxScreen;b.classList.toggle('on',n===A.screen);b.classList.toggle('done',n<A.screen);});
  $$('.modesw button').forEach(b=>b.classList.toggle('on',b.dataset.mode===A.mode));document.body.classList.toggle('crew',A.mode==='crew');document.body.classList.toggle('solo',A.mode==='solo');
  $('#playBtn').textContent=A.playing?'❚❚ Pause':'▶ Play';$('#playBtn').classList.toggle('primary',!A.playing);$('#playBtn').classList.toggle('outline',A.playing);$('#playBtn').setAttribute('aria-label',A.playing?'Pause the drill clock':'Start the drill clock');$('#hideBtn').textContent=A.hidden?'Reveal answers':'Hide answers';$('#evLbl').textContent=`Evolve +${A.stepSize<60?A.stepSize+' s':A.stepSize/60+' min'}`;
  $('#dcToggle').setAttribute('aria-pressed',!!(A.S&&A.S.doorControl));$$('#checks .check').forEach(b=>b.setAttribute('aria-pressed',!!A.checks[b.dataset.k]));}
$$('.modesw button').forEach(b=>b.onclick=()=>{A.mode=b.dataset.mode;if(A.mode==='crew')A.hidden=true;layout();syncUI();renderBoard();});
function isHidden(){return A.mode==='crew'?A.hidden:(A.hidden&&!A.locked);}
function floorLabel(f){if(f==='Attic')return A.B.atticName||'Attic';if(f==='B')return'Basement';return'Floor '+f;}
function windText(){const w=A.scn.wind;return w.dir==='calm'?'Calm':`${['Light','Moderate','Strong'][w.spd]} from Side ${w.dir}`;}

/* ---------- readings ---------- */
function dominant(){const S=A.S;const v=M.openingVis(S);let best=null;for(const o of A.B.openings){const x=v[o.id];if(!x)continue;const sc=x.rate+x.flame*.5;if(sc>.01&&(!best||sc>best.sc))best={...x,sc,name:o.name,id:o.id};}
  const e=M.eavesVis(S);if(e&&e.rate>.04&&(!best||e.rate*1.2>best.sc))best={...e,sc:e.rate,name:'eaves / cornice',id:'eaves'};return best;}
function smokeWhere(){const S=A.S;const v=M.openingVis(S);const list=A.B.openings.filter(o=>v[o.id]&&v[o.id].rate>.01).sort((a,b)=>v[b.id].rate-v[a.id].rate).map(o=>(o.hidden?o.name:o.name.replace(/ \(.+\)/,''))+(v[o.id].state==='closed'?' (around the closed '+o.type+')':''));const e=M.eavesVis(S);if(e&&e.rate>.02)list.push(A.B.id==='mixed'?'cornice':'eaves');for(const id in S.o)if(S.o[id].type==='roof'&&S.o[id].state!=='closed'&&v[id]&&v[id].rate>.02)list.push('roof vent');return [...new Set(list)];}
function fireShowing(){const S=A.S;const v=M.openingVis(S);return A.B.openings.filter(o=>v[o.id]&&v[o.id].flame>.05).map(o=>o.name);}
function smokeText(){const d=dominant();if(!d)return'Nothing showing';const w=smokeWhere();return `${M.VOLN[d.vol]} ${d.col}, ${M.VELN[d.vel].toLowerCase()}, ${M.DENN[d.den].toLowerCase()}${d.pulse?' · pulsing':''} · from ${w.slice(0,4).join(', ')}${w.length>4?'…':''}`;}
function burningText(){const S=A.S;const b=Object.values(S.z).filter(z=>z.ign&&!z.out);if(!b.length)return Object.values(S.z).some(z=>z.out)?'Knocked down':'No fire';return b.map(z=>`${zname(z.id)}: ${M.stageOf(S,z.id).toLowerCase()}`).join(' · ');}
function hostile(){const S=A.S,o=S.z[A.scn.origin];let s=0,why=[];
  if(o.vl&&!o.flashed&&o.T>.3){s+=3;why.push('ventilation-limited and hot: new air will speed it up');}
  if(o.decay){s+=1;why.push('starved fire, pulsing smoke');}
  if(Object.values(S.z).some(z=>z.flashed&&!z.out)){s+=2;why.push('flashover has occurred');}
  const d=dominant();if(d){if(d.vel>=2)s++;if(d.den>=2)s++;if(d.col==='black')s++;}
  if(Object.values(S.z).some(z=>z.water>0&&z.ign))s-=2;
  s=clamp(s,0,8);return{s,l:s<=2?'Low':s<=4?'Moderate':'High',pct:clamp(s/8,.06,1),why};}
function meter(){const h=hostile();return `<span class="meter"><i><b style="width:${Math.round(h.pct*100)}%"></b></i>${h.l}</span>`;}
function cues(d){if(!d)return[['Smoke','Nothing visible from Side A. Little or no smoke can mean an early fire, or a ventilation-limited fire that is starved for air (FSRI). Treat it as ventilation-limited until proven otherwise.']];
  return[['Volume',['Light: little fuel off-gassing so far, or a large building.','Moderate volume.','Heavy: a lot of fuel is off-gassing for the size of the building.','Very heavy: the building is filling up and pushing smoke out.'][d.vol]],
   ['Velocity',['Lazy: may mean an early or distant fire, smoke that has cooled, or a fire starved for air.','Moderate: some heat and pressure behind the smoke.','Pressurized: heat is pushing smoke out and pressure is building.','Turbulent: a widely taught warning sign of high heat and a possible hostile fire event.'][d.vel]+(d.pulse?' Pulsing: the fire is trying to pull air through gaps (FSRI).':'')],
   ['Density',['Thin: less fuel in the smoke itself.','Moderate density.','Thick: smoke is fuel. Thicker smoke means more fuel and faster fire spread.','Very thick: high potential for a hostile fire event and near-zero visibility inside.'][d.den]],
   ['Color',{white:'White: often steam or early heating, or smoke that has traveled and cooled.',gray:'Gray: a mix. Read it with velocity and density.','gray-black':'Dark gray: fuel-rich smoke. Read it with velocity.',brown:'Brown: often taught as unfinished wood (structure) burning.',black:'Black: high heat and incomplete combustion, rich in fuel. Common with ventilation-limited modern contents.'}[d.col]]];}
function readingHTML(){if(!A.S)return'';const d=dominant();const st=M.stageOf(A.S,A.scn.origin);
  return `<b>At arrival (T+0)</b> <span class="muted">· ${esc(M.FUEL[A.scn.fuel].label)} · ${Math.round(A.scn.preburn/60)} min after ignition</span><div style="margin:6px 0"><b>Fire room:</b> ${esc(zname(A.scn.origin))}: ${esc(st)}</div>
  <b>Reading smoke</b> <span class="muted">· from the model, not set by hand</span><ul>${cues(d).map(([k,v])=>`<li><b>${k}:</b> ${esc(v)}</li>`).join('')}</ul><div><b>Smoke showing:</b> ${esc(smokeText())}</div><div style="margin-top:6px"><b>Hostile fire event indicators:</b> ${meter()} <span class="muted">(training estimate)</span></div>`;}

/* ---------- command board ---------- */
const ICON={home:'<path d="M3 11L12 4l9 7v9h-6v-6H9v6H3z" fill="currentColor"/>',brick:'<path d="M3 5h18v4H3zM3 10h8v4H3zM12 10h9v4h-9zM3 15h18v4H3z" fill="currentColor"/>',
 flame:'<path d="M12 2c1 4 5 6 5 11a5 5 0 01-10 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-5 0-9z" fill="currentColor"/>',cloud:'<path d="M7 18a4 4 0 010-8 5 5 0 019.6-1.5A4 4 0 0117 18z" fill="currentColor"/>',
 wind:'<path d="M3 8h11a3 3 0 10-3-3M3 12h15a3 3 0 11-3 3M3 16h7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',layers:'<path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" fill="none" stroke="currentColor" stroke-width="2"/>',
 users:'<circle cx="9" cy="8" r="3.5" fill="currentColor"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6z" fill="currentColor"/>',bldgs:'<path d="M3 21V9h6v12M9 21V4h7v17M16 21v-9h5v9" fill="none" stroke="currentColor" stroke-width="2"/>',
 flow:'<path d="M4 18c4 0 4-12 8-12s4 12 8 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',gauge:'<path d="M4 16a8 8 0 1116 0" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 16l4-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
 stage:'<path d="M4 20h16M6 20V12M10 20V8M14 20V10M18 20V5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',drop:'<path d="M12 3c4 5 6 8 6 11a6 6 0 01-12 0c0-3 2-6 6-11z" fill="currentColor"/>'};
const svg=n=>`<svg viewBox="0 0 24 24">${ICON[n]}</svg>`;
function renderBoard(){if(!A.B||A.screen!==4||!A.S)return;const F=A.facts,S=A.S,hid=isHidden();
  const ed=(k,ic,label)=>`<div class="frow">${svg(ic)}<span class="k">${label}<span class="tag">EDIT</span></span><span class="v ed" contenteditable="true" role="textbox" data-f="${k}" aria-label="${label}">${esc(F[k]||'')}</span></div>`;
  const au=(ic,label,v,stack)=>`<div class="frow${stack?' stack':''}">${svg(ic)}<span class="k">${label}</span><span class="v${hid?' hidev':''}">${v}</span></div>`;
  const fs=fireShowing();const fp=M.flowPath(S);const W=S.water;
  const occ=A.scn.occupant==='none'?'':' · occupant reported'+(A.scn.occupant==='random'?', location unknown':'');
  $('#facts').innerHTML=(hid?`<div class="frow"><span class="hiddenNote">Answers hidden. Call out what you see: smoke, stage and flow path.</span></div>`:'')+ed('occupancy','home','Occupancy')+ed('construction','brick','Construction')
   +au('flame','Showing',esc(fs.length?'Fire from '+fs.join(', '):'No visible fire from Side A'))+au('cloud','Smoke',esc(smokeText()))+au('wind','Wind',windText())
   +au('stage','Fire stage',esc(burningText()))+ed('stories','layers','Stories')+ed('exposures','bldgs','Exposures')+ed('life','users','Life hazard')
   +au('flow','Flow path',`${esc('Exhaust: '+(fp.exhaust.join(', ')||'none open (leakage only)'))}<br>${esc('Intake: '+(fp.intake.join(', ')||'none'))} <button class="btn ghost sm" id="flowTog" style="min-height:34px;margin-left:6px">${A.showFlow?'Hide arrows':'Show arrows'}</button>`,true)
   +au('gauge','Hostile-event indicators',`${meter()} <span class="muted" style="font-size:13px">${esc(hostile().why.join('; '))}</span>`,true)
   +`<div class="frow">${svg('drop')}<span class="k">Water</span><span class="v">${W.supply?'Supply established':W.supplyAt!=null?`Supply in ${fmt(W.supplyAt-S.t)}`:'Tank only'} · tank ${Math.round(W.tank)} gal${occ}</span></div>`;
  $$('#facts .ed').forEach(i=>{i.oninput=()=>{A.facts[i.dataset.f]=i.textContent.trim();};i.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();i.blur();}};});
  const ft=$('#flowTog');if(ft)ft.onclick=()=>{A.showFlow=!A.showFlow;renderBoard();syncUI();};
  const t=now();$('#pT').textContent=`T+${fmt(t)}`;$('#prompt').classList.toggle('changing',t>0&&A.latest.length>0);
  if(t===0){$('#pH').textContent='You’re first due.';$('#pP').textContent=A.mode==='solo'?(A.locked?'Give your initial radio report and make your first orders.':'Make your size-up calls below, then give your initial radio report.'):'Crew: call out the size-up. Instructor: play or advance the clock.';}
  else if(A.latest.length){$('#pH').textContent='Conditions changing.';$('#pP').textContent=A.latest.slice(-3).join(' ')+' Update your report, strategy and assignments.';}
  else{$('#pH').textContent='Reassess.';$('#pP').textContent='No major change in this interval. Does your plan still match conditions?';}
  renderOrders();renderLog();renderCalls();syncUI();}
function renderOrders(){const B=A.B,S=A.S;const cur={};
  $('#lineSel').innerHTML=`<option value="">Attack line…</option>`+B.zones.filter(z=>!z.attic).map(z=>`<option value="${z.id}">Interior line to ${esc(z.name)}</option>`).join('')+B.openings.filter(o=>!o.hidden&&o.type!=='garage').map(o=>`<option value="ext:${o.id}">Exterior water through ${esc(o.name)}</option>`).join('')+`<option value="none">Shut down lines</option>`;
  const fr=B.openings.find(o=>o.front);
  $('#ventSel').innerHTML=`<option value="">Ventilation…</option>`+B.openings.filter(o=>o.type==='window'||(o.type==='door'&&!o.front)).map(o=>`<option value="h:${o.id}">Horizontal: ${esc(o.name)}</option>`).join('')
    +B.zones.filter(z=>z.floor===String(B.stories)&&!z.hidden||z.attic).map(z=>`<option value="v:${z.id}">Vertical: roof over ${esc(z.name)}</option>`).join('')+(fr?`<option value="ppv">PPV/PPA fan at ${esc(fr.name)}</option><option value="fanoff">Fan off</option>`:'');
  const floors=[...new Set(B.zones.filter(z=>!z.attic).map(z=>z.floor))].sort();
  $('#searchSel').innerHTML=`<option value="">Primary search…</option>`+floors.map(f=>`<option value="${f}">Primary search: floor ${f}</option>`).join('');
  const W=S.water;const lines=W.lines.map(l=>`${l.ext?'exterior → '+M.oname(S,l.opening):'interior → '+zname(l.zone)}${l.flowing?' (flowing)':S.t<l.readyAt?` (in ${fmt(l.readyAt-S.t)})`:' (no water)'}`);
  const srch=S.searches.map(s=>`floor ${s.floor} ${s.done?(s.aborted?'aborted':'done'):`(${fmt(s.end-S.t)} left)`}`);
  $('#opsStat').textContent=`Strategy: ${S.strategy||'not set'} · Lines: ${lines.join('; ')||'none'} · Search: ${srch.join('; ')||'none'}${S.fan&&S.fan.on?' · Fan running':''}`;}
$('#lineGo').onclick=()=>{const v=$('#lineSel').value;if(!v)return;order({kind:'line',target:v});};
$('#ventGo').onclick=()=>{const v=$('#ventSel').value;if(!v)return;if(v.startsWith('h:'))order({kind:'vent',type:'horizontal',opening:v.slice(2)});else if(v.startsWith('v:'))order({kind:'vent',type:'vertical',zone:v.slice(2)});else if(v==='ppv')order({kind:'vent',type:'ppv'});else order({kind:'vent',type:'none'});};
$('#searchGo').onclick=()=>{const v=$('#searchSel').value;if(!v)return;order({kind:'search',floor:v});};
$('#dcToggle').onclick=()=>order({kind:'doorcontrol',on:!A.S.doorControl});
$('#supplyGo').onclick=()=>order({kind:'supply'});
function renderLog(){const S=A.S;const items=S.events.filter(e=>e.t>=S.tArr).slice().reverse();
  const pre=A.preEvents||[];
  $('#log').innerHTML=(items.length?items.map(e=>`<div class="e"><b>T+${fmt(e.t-S.tArr)}</b> · ${esc(e.msg)}${e.src&&SRC[e.src]?` <small><a href="${SRC[e.src].url}" target="_blank" rel="noopener">${e.src}</a></small>`:''}</div>`).join(''):'<div class="muted" style="font-size:14px">T+0: first-due arrival. Give orders, then Evolve to advance the clock.</div>')
   +(pre.length&&!isHidden()?`<div class="e" style="opacity:.8"><b>Before arrival</b> · ${esc(pre.map(e=>`${fmt(e.t)} ${e.msg}`).join(' · '))}</div>`:'');}
$('#checks').innerHTML=CHECKS.map(c=>`<button class="check" data-k="${c}" aria-pressed="false"><i></i>${c}</button>`).join('');
$('#checks').onclick=e=>{const b=e.target.closest('.check');if(!b)return;A.checks[b.dataset.k]=!A.checks[b.dataset.k];syncUI();};
function doEvolve(sec){if(!A.S)return;const ne=advance(sec);A.latest=ne.map(e=>e.msg);if(R){const v=curVis();R.prewarm(Math.min(2.5,sec/20+1),v);}renderBoard();buildInjects();toast(ne.length?`T+${fmt(now())} · ${ne[0].msg}`:`T+${fmt(now())} · no major change`);}
$('#evolveBtn').onclick=()=>doEvolve(A.stepSize);
$('#adv1').onclick=()=>doEvolve(60);
const togglePlay=()=>{A.playing=!A.playing;A.simAcc=0;syncUI();};$('#playBtn').onclick=togglePlay;$('#clock').onclick=()=>{if(A.screen===4)togglePlay();};
$('#hideBtn').onclick=()=>{A.hidden=!A.hidden;renderBoard();};
$('#fsBtn').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen().catch(()=>{});};
function buildInjects(){const B=A.B,S=A.S;if(!S)return;let h='<option value="">Inject event…</option>';
  B.openings.forEach(o=>{const st=S.o[o.id].state;if(st==='closed')h+=`<option value="${o.type==='window'?'fail':'open'}|${o.id}">${o.type==='window'?'Window fails':'Door opened'}: ${esc(o.name)}</option>`;else h+=`<option value="close|${o.id}">Closed: ${esc(o.name)}</option>`;});
  B.conns.filter(c=>c.type==='door').forEach(c=>{const st=S.c[c.id].state;h+=`<option value="idoor|${c.id}|${st==='open'?'closed':'open'}">${st==='open'?'Interior door closed':'Interior door opened'}: ${esc(c.name)}</option>`;});
  ['A','B','C','D','calm'].forEach(d=>h+=`<option value="wind|${d}">Wind shift: ${d==='calm'?'calm':'strong from Side '+d}</option>`);
  h+=`<option value="note|Bystander reports someone at a window upstairs.">Report: someone seen at an upper window</option><option value="note|Occupant reported out. Confirm with your search.">Report: occupants say everyone is out</option>`;
  $('#injectSel').innerHTML=h;}
$('#injectBtn').onclick=()=>{const v=$('#injectSel').value;if(!v)return;const p=v.split('|');let a;
  if(p[0]==='fail'||p[0]==='open'||p[0]==='close')a={kind:p[0],opening:p[1]};else if(p[0]==='idoor')a={kind:'idoor',conn:p[1],state:p[2]};else if(p[0]==='wind'){a={kind:'wind',dir:p[1],spd:2};A.scn.wind={dir:p[1],spd:2};}else a={kind:'note',text:p[1]};
  order(a);A.latest=[A.S.events[A.S.events.length-1].msg];toast(`Inject · ${A.latest[0]}`);buildInjects();renderBoard();};

/* ---------- solo size-up calls ---------- */
const STAGES=['Incipient / growth','Ventilation-limited','Fully developed','Decay'];
function truthCalls(){const S=A.S,z=S.z[A.scn.origin],d=dominant()||{vol:0,vel:0,den:0,col:'white'};const st=M.stageOf(S,A.scn.origin);
  let stage=/Fully/.test(st)?'Fully developed':/Decay/.test(st)?(z.decay?'Ventilation-limited|Decay':'Decay'):/ventilation-limited/.test(st)?'Ventilation-limited':'Incipient / growth';
  const fo=z.flashed?'High':(z.vl&&z.T>.3)||z.decay?'High':z.q>.3?'Moderate':'Low';
  return{floor:zoneOf(A.scn.origin).floor,stage,vol:d.vol,vel:d.vel,den:d.den,col:d.col==='gray-black'?'black':d.col,fo};}
function renderCalls(){const el=$('#callsCard');if(A.mode!=='solo'||!A.S){el.innerHTML='';return;}
  if(A.locked&&A.lockResult){const r=A.lockResult;el.innerHTML=`<h2 style="margin-top:0">Your size-up at T+${fmt(r.t)} <span class="score ${r.score>=5?'ok':r.score>=3?'mid':'no'}">${r.score}/${r.n}</span></h2>`+r.rows.map(x=>`<div style="font-size:14px;margin:4px 0"><span class="badge2 ${x.ok===true?'ok':x.ok==='close'?'mid':'no'}">${x.ok===true?'✓':x.ok==='close'?'~':'✗'}</span><b>${x.k}:</b> you said ${esc(x.you)} · model: ${esc(x.truth)}</div>`).join('')+`<p class="muted" style="font-size:13px">“Close” means one step off. Smoke is read from the strongest opening. See the debrief for the reasoning and sources.</p>`;return;}
  const floors=[...new Set(A.B.zones.map(z=>z.floor))].filter(f=>f!=='Roof');
  const seg=(k,opts,lab)=>`<div><div class="lbl2">${lab}</div><div class="seg" data-key="call_${k}">${opts.map(([v,t])=>`<button data-v="${v}" class="${String(A.calls[k])===String(v)?'on':''}">${t}</button>`).join('')}</div></div>`;
  el.innerHTML=`<h2 style="margin-top:0">Your size-up calls</h2>`+seg('floor',floors.map(f=>[f,f==='Attic'?A.B.atticName:f]),'Fire floor')+seg('stage',STAGES.map(s=>[s,s.replace(' / growth','/growth')]),'Fire stage')
   +seg('vol',[[0,'Light'],[1,'Mod'],[2,'Heavy'],[3,'V. heavy']],'Smoke volume')+seg('vel',[[0,'Lazy'],[1,'Mod'],[2,'Press.'],[3,'Turb.']],'Velocity')+seg('den',[[0,'Thin'],[1,'Mod'],[2,'Thick'],[3,'V. thick']],'Density')
   +seg('col',[['white','White'],['gray','Gray'],['brown','Brown'],['black','Black']],'Color')+seg('fo',[['Low','Low'],['Moderate','Moderate'],['High','High']],'Hostile event potential')
   +`<button class="btn primary" id="lockBtn">Lock in my size-up</button>`;
  el.querySelectorAll('.seg[data-key]').forEach(seg=>seg.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const k=seg.dataset.key.slice(5);let v=b.dataset.v;if(['vol','vel','den'].includes(k))v=+v;A.calls[k]=v;renderCalls();}));
  $('#lockBtn').onclick=lockIn;}
function lockIn(){const T=truthCalls(),C=A.calls;const rows=[];const num=(k,names,lab)=>{const y=C[k];const ok=y==null?false:y===T[k]?true:Math.abs(y-T[k])===1?'close':false;rows.push({k:lab,you:y==null?'(no call)':names[y],truth:names[T[k]],ok});};
  rows.push({k:'Fire floor',you:C.floor??'(no call)',truth:T.floor,ok:C.floor===T.floor});
  const st=T.stage.split('|');rows.push({k:'Stage',you:C.stage??'(no call)',truth:st.join(' or '),ok:st.includes(C.stage)});
  num('vol',M.VOLN,'Volume');num('vel',M.VELN,'Velocity');num('den',M.DENN,'Density');
  rows.push({k:'Color',you:C.col??'(no call)',truth:T.col,ok:C.col===T.col||(C.col==='gray'&&T.col==='black')?(C.col===T.col?true:'close'):false});
  rows.push({k:'Hostile event potential',you:C.fo??'(no call)',truth:T.fo,ok:C.fo===T.fo});
  const score=rows.reduce((s,r)=>s+(r.ok===true?1:r.ok==='close'?.5:0),0);A.lockResult={t:now(),rows,score,n:rows.length};A.locked=true;renderBoard();toast(`Size-up locked in: ${score}/${rows.length}`);}

/* ---------- debrief ---------- */
function ruleHTML(ids){return ids.map(id=>{const r=RULES.find(r=>r.id===id);if(!r)return'';return `<span class="q">${esc(r.quote||r.does)}</span><small>${r.src.map(s=>`<a href="${SRC[s].url}" target="_blank" rel="noopener">${esc(SRC[s].title)}</a>`).join(' · ')||'Simplification (not from FSRI)'}</small>`;}).join('');}
function debrief(){const S=A.S,sc=A.scn,ta=S.tArr,items=[];const at=t=>`T+${fmt(t-ta)}`;
  const add=(st,title,detail,rules)=>items.push({st,title,detail,rules:rules||[]});
  if(A.mode==='solo'){if(A.lockResult)add(A.lockResult.score>=5?'ok':A.lockResult.score>=3?'mid':'no',`Size-up calls: ${A.lockResult.score}/${A.lockResult.n}`,A.lockResult.rows.map(r=>`${r.k}: ${r.you} (model: ${r.truth})`).join(' · '),['smokecolor','pulse']);
    else add('mid','Size-up calls not locked in','Lock in your read of the smoke and stage next time before acting.',[]);}
  const rr=$('#radio').value.trim().toLowerCase();if(rr){const el=[['unit',/engine|truck|ladder|rescue|squad|battalion|medic|\b[etlq]\s?\d/],['building',/stor(y|ies)|wood|brick|frame|residential|commercial|mixed|apartment|house/],['conditions',/smoke|fire|flame|nothing showing|showing/],['strategy',/offensive|defensive|attack|investigat|transitional/],['command',/command/],['needs',/request|need|alarm|additional|assign/]];const miss=el.filter(([k,re])=>!re.test(rr)).map(([k])=>k);
    add(miss.length<=1?'ok':'mid','Initial radio report',miss.length?`Missing: ${miss.join(', ')}.`:'Covered unit, building, conditions, strategy, command and needs.',[]);}else add('no','Initial radio report','No report given.',[]);
  // first water
  const fw=S.flags.firstWater;if(fw!=null)add(fw-ta<=150?'ok':'mid',`First water at ${at(fw)}`,fw-ta<=150?'Water went on the fire early.':'Water was slow to reach the fire. Faster water from any position improves conditions everywhere.',['soften']);
  else add('no','No water was applied to the fire','',['soften']);
  // entry door / door control
  if(S.flags.entryOpenedAt!=null){const tOpen=S.flags.entryOpenedAt;const flashAfter=Object.values(S.z).filter(z=>z.tFlash!=null&&z.tFlash>tOpen&&(fw==null||z.tFlash<fw));
    if(S.doorControl||S.o[(S.B.openings.find(o=>o.front)||{}).id]?.state==='controlled')add('ok',`Entry door controlled (opened ${at(tOpen)})`,'Limiting air at the entry slowed growth until water was on the fire.',['door']);
    else if(flashAfter.length)add('no',`Entry door opened at ${at(tOpen)} without control, then flashover at ${at(flashAfter[0].tFlash)} before water`,'The open door was the air supply for the ventilation-limited fire.',['door','stages','timing']);
    else add('mid',`Entry door opened at ${at(tOpen)} without door control`,'No flashover followed this time, but the open door was still a ventilation action.',['door']);}
  // ventilation coordination
  for(const v of (S.flags.vents||[])){const waterThen=fw!=null&&fw<=v.t+20;const burning=S.z[v.zone]&&S.z[v.zone].ign;
    if(v.kind==='vertical')add(waterThen?'ok':'no',`Vertical ventilation at ${at(v.t)} over ${zname(v.zone)}`,waterThen?'Coordinated with water on the fire, so the vent let heat and smoke out.':'No water was on the fire yet, so the roof opening fed a ventilation-limited fire.',waterThen?['vertical']:['vertical','timing','attic']);
    else if(v.kind==='horizontal'){const fireZone=Object.values(S.z).some(z=>z.ign&&!z.out&&z.id===v.zone);
      add(waterThen?'ok':(fireZone?'mid':'no'),`Horizontal ventilation at ${at(v.t)}: ${M.oname(S,v.id)}`,waterThen?'Done with water on the fire.':fireZone?'Vented the fire room before water: expect growth unless the line is right behind it.':'Vented remote from the fire before water. That made a flow path through the building toward this opening.',waterThen?['timing']:fireZone?['timing','stages']:['flow','timing']);}
    else if(v.kind==='ppv'){const exh=Object.values(S.o).some(o=>o.state!=='closed'&&S.z[o.zone]&&S.z[o.zone].ign&&o.type!=='door');add(waterThen&&exh?'ok':'no',`Fan (PPA/PPV) at ${at(v.t)}`,(exh?'There was an exhaust in the fire area. ':'No exhaust opening in the fire room. ')+(waterThen?'Water was on the fire.':'Water was not yet on the fire.'),['ppv']);}}
  // flashovers & spread after arrival
  const fos=S.events.filter(e=>e.t>=ta&&e.kind==='flashover');if(fos.length)add('no',`Flashover after arrival: ${fos.map(e=>`${e.msg.replace('Flashover: ','')} (${at(e.t)})`).join(', ')}`,'Look at what changed the air supply in the 2 minutes before each one.',['timing','flow','showing']);
  const sp=S.events.filter(e=>e.t>=ta&&e.kind==='spread');if(sp.length)add('mid',`Fire extended (${sp.length})`,sp.map(e=>`${at(e.t)} ${e.msg}`).join(' · '),['flow']);
  // exterior regrowth
  const extUp=S.water.lines.some(l=>l.ext&&/^[2-9]$/.test(zoneOf(l.zone).floor));if(extUp)add('mid','Exterior water on an upper floor','Exterior water knocks an upper-floor room back, but it regrows without an interior line to finish.',['regrow']);
  // crew warnings
  S.events.filter(e=>e.kind==='crew').forEach(e=>add('no',`Crew safety at ${at(e.t)}`,e.msg,['flow']));
  // search & occupant
  if(S.victim){const v=S.victim;const closed=(()=>{for(const c of S.B.conns)if(c.type==='door'&&(c.a===v.zone||c.b===v.zone))return S.c[c.id].state==='closed';return false;})();
    add(v.status==='rescued'?'ok':'no',`Occupant (${zname(v.zone)}, door ${closed?'closed':'open'})`,v.status==='rescued'?`Found and removed at ${at(v.foundAt)}.`:v.status==='found-late'?`Found at ${at(v.foundAt)}, after conditions there exceeded tenability (${at(v.untenable)}).`:v.untenable?`Not found. Conditions in that room exceeded tenability at ${at(v.untenable)}.`:'Not found yet. That room is still survivable. Search it.',['closed']);}
  const S0=S.searches.filter(s=>s.done&&!s.aborted);if(!S.searches.length)add('mid','No primary search ordered','',[]);
  // strategy note
  if(S.strategy==='Defensive'){const o=S.z[sc.origin];const confined=Object.values(S.z).filter(z=>z.ign).length<=1&&!o.flashed;add('mid','Defensive strategy',confined?'At arrival the fire was in one compartment. Compare that with your life-hazard read. The choice is yours; this is just what the model showed.':'Conditions included flashover or extension. The model just shows what the building did.',[]);}
  const out=Object.values(S.z).filter(z=>z.ign);const allOut=out.length&&out.every(z=>z.out);add(allOut?'ok':'mid',allOut?`All fire knocked down by ${at(Math.max(...out.map(z=>z.tOut||0)))}`:'Fire not yet under control at the end of the drill',`Burned: ${out.map(z=>zname(z.id)).join(', ')||'none'}.`,['push']);
  return items;}
$('#finishBtn').onclick=()=>{A.playing=false;A.wasPlaying=false;A.finished=true;syncUI();const items=debrief();const ok=items.filter(i=>i.st==='ok').length;
  openModal('Debrief',`<div class="debrief"><p style="margin:0 0 8px">${esc(A.B.name)} · ${esc(M.FUEL[A.scn.fuel].label)} · drill ended at T+${fmt(now())}. ${ok}/${items.length} items went well.</p>${items.map(i=>`<div class="item"><b><span class="badge2 ${i.st}">${i.st==='ok'?'✓':i.st==='mid'?'!':'✗'}</span>${esc(i.title)}</b>${i.detail?`<small>${esc(i.detail)}</small>`:''}${ruleHTML(i.rules)}</div>`).join('')}
  <p class="tip">The model is a simplified teaching tool informed by UL FSRI research. It does not grade you against any department SOP. Training prototype, not for operational use.</p></div><div class="btnrow"><button class="btn ghost" id="dbCopy">Copy debrief</button><button class="btn primary" id="dbShare">Share drill</button></div>`);
  A.lastDebrief=items;$('#dbCopy').onclick=()=>copyText(items.map(i=>`[${i.st}] ${i.title}${i.detail?' - '+i.detail:''}`).join('\n'),'#dbCopy');$('#dbShare').onclick=openShare;};

/* ---------- sources panel ---------- */
$('#rules').innerHTML=RULES.map(r=>`<div class="rule"><b>${esc(r.name)}<span class="tag ${r.kind==='fsri'?'fsri':'simp'}">${r.kind==='fsri'?'FSRI':'SIMPLIFICATION'}</span></b>${esc(r.does)}${r.quote?`<span class="q">${esc(r.quote)}</span>`:''}${r.src.length?`<div class="srcl">${r.src.map(s=>`<a href="${SRC[s].url}" target="_blank" rel="noopener">${esc(SRC[s].title)}</a>`).join('<br>')}</div>`:''}</div>`).join('')
  +`<div class="rule"><b>Further training</b><a href="${SRC['FSRI-ACAD'].url}" target="_blank" rel="noopener">${esc(SRC['FSRI-ACAD'].title)}</a></div>`;

/* ---------- share / export / import ---------- */
function summary(){const F=A.facts,S=A.S;return[`SizeUp drill · TRAINING · T+${fmt(now())}`,`Building: ${F.occupancy} · ${F.construction} · ${F.stories} stories`,`Contents: ${M.FUEL[A.scn.fuel].label}`,
  ...(isHidden()?['Conditions: (hidden, call them out)']:[`Fire: ${burningText()}`,`Smoke: ${smokeText()}`]),`Wind: ${windText()}`,`Exposures: ${F.exposures}`,`Life hazard: ${F.life}`,
  ...(A.latest.length?[`Latest: ${A.latest.join(' ')}`]:[]),`Task: You're first due. Give your initial radio report, strategy and initial assignments.`,'Training prototype, not for operational use.'];}
function wrap(g,text,maxW){const words=text.split(' '),lines=[];let l='';for(const w of words){const t=l?l+' '+w:w;if(g.measureText(t).width>maxW&&l){lines.push(l);l=w;}else l=t;}if(l)lines.push(l);return lines;}
function exportPNG(){if(R)R.draw(rect,dpr);const B=A.B,EW=Math.min(Math.round(rect.w*dpr),1600),EH=Math.round(EW*B.H/B.W),k=Math.max(EW/1200,.8);
  const c=document.createElement('canvas'),g=c.getContext('2d'),lines=summary(),fs=Math.round(24*k),pad=Math.round(28*k),font=w=>`${w} ${fs}px -apple-system,Segoe UI,Roboto,Arial,sans-serif`;
  g.font=font(500);const wl=[];lines.slice(1).forEach(t=>wl.push(...wrap(g,t,EW-pad*2)));const panel=Math.round(pad*2+fs*1.8+wl.length*fs*1.35);c.width=EW;c.height=EH+panel;
  g.drawImage(cv,rect.x*dpr,rect.y*dpr,rect.w*dpr,rect.h*dpr,0,0,EW,EH);
  g.font=`800 ${Math.round(fs*.8)}px Arial,sans-serif`;const bw=g.measureText('TRAINING').width+fs;g.fillStyle='#d32f2f';g.fillRect(EW-bw-pad*.6,pad*.6,bw,fs*1.4);g.fillStyle='#fff';g.textBaseline='middle';g.fillText('TRAINING',EW-bw-pad*.6+fs/2,pad*.6+fs*.72);g.textBaseline='alphabetic';
  g.fillStyle='#14171b';g.fillRect(0,EH,EW,panel);g.fillStyle='#d32f2f';g.fillRect(0,EH,EW,6);let y=EH+pad+fs;g.fillStyle='#fff';g.font=`800 ${Math.round(fs*1.2)}px -apple-system,Segoe UI,Roboto,Arial,sans-serif`;g.fillText(lines[0],pad,y);y+=fs*1.6;
  g.font=font(500);let col='#e6e8ea';wl.forEach(t=>{if(/^(Latest|Task):/.test(t))col='#ffb300';else if(/^Training prototype/.test(t))col='#9ca2aa';else if(/^[A-Z][a-z ]+:/.test(t))col='#e6e8ea';g.fillStyle=col;g.fillText(t,pad,y);y+=fs*1.35;});return c;}
function scenarioObj(hide){const o=JSON.parse(JSON.stringify(A.scn));o.format='sizeup-scenario';o.v=2;o.mode=A.mode;o.hideAnswers=!!hide;o.facts={...A.facts};o.radio=$('#radio').value;o.side=A.side;o.created=new Date().toISOString();
  if(A.B.id==='photo'){o.photo=A.photoData;o.marks=JSON.parse(JSON.stringify(A.photoMarks));}o.note='SizeUp training scenario. Training prototype, not for operational use.';return o;}
function scenarioHTML(obj){const json=JSON.stringify(obj).replace(/</g,'\\u003c');const i=PRISTINE.lastIndexOf('</body>');return PRISTINE.slice(0,i)+SCN_TAG+json+SCN_END+'\n'+PRISTINE.slice(i);}
function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);}
function canShareFiles(){try{return!!(navigator.canShare&&navigator.canShare({files:[new File([new Blob(['x'])],'a.png',{type:'image/png'})]}));}catch(e){return false;}}
async function copyText(t,btn){try{await navigator.clipboard.writeText(t);}catch(e){const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(_){}ta.remove();}if(btn){const b=$(btn);const o=b.textContent;b.textContent='Copied ✓';setTimeout(()=>b.textContent=o,1800);}}
function openModal(title,html){$('#mTitle').textContent=title;$('#mBody').innerHTML=html;if(A.playing){A.wasPlaying=true;A.playing=false;syncUI();}$('#modal').classList.add('show');}
function closeModal(){$('#modal').classList.remove('show');if(A.wasPlaying&&!A.finished){A.playing=true;A.simAcc=0;}A.wasPlaying=false;syncUI();}
function stamp(){return `T${Math.round(now()/60)}m`;}
function openShare(){const c=exportPNG();const url=c.toDataURL('image/png');A.lastPNG={url,c};
  openModal('Share drill',`<img src="${url}" alt="Drill snapshot" id="mImg" style="width:100%;border-radius:10px;border:1px solid var(--line)"><pre style="white-space:pre-wrap;font-family:inherit;font-size:14px;background:#0f1114;border:1px solid var(--line);border-radius:10px;padding:10px;margin:10px 0">${esc(summary().join('\n'))}</pre>
   <label class="toggle" style="margin-bottom:10px"><span><b>Hide answers when opened</b><small>For crew drills: facts stay hidden until revealed</small></span><input type="checkbox" id="shHide" ${A.mode==='crew'||A.hidden?'checked':''} style="width:24px;height:24px"></label>
   <div style="display:grid;gap:10px"><button class="btn primary" id="shHtml">Scenario file (.html, opens offline anywhere)</button>
   <div class="btnrow"><button class="btn ghost" id="shPng">PNG snapshot</button><button class="btn ghost" id="shJson">Scenario data (.json)</button></div>
   <div class="btnrow"><button class="btn ghost" id="shCopy">Copy summary</button><button class="btn ghost" id="shSend" ${canShareFiles()?'':'hidden'}>Send via device…</button></div></div>
   <p class="tip" id="shNote">The scenario file has the photo, openings, fire origin, contents, seed and every order and inject so far. Anyone can open it offline and run or continue the drill. No server.</p>`);
  const nm=`sizeup-${A.B.id}-${stamp()}`;
  $('#shPng').onclick=()=>{c.toBlob(b=>download(b,nm+'.png'));$('#shNote').textContent=`Saved ${nm}.png`;};
  $('#shJson').onclick=()=>{download(new Blob([JSON.stringify(scenarioObj($('#shHide').checked),null,1)],{type:'application/json'}),nm+'.json');$('#shNote').textContent=`Saved ${nm}.json. Open it from the Capture screen (Open drill).`;};
  $('#shHtml').onclick=()=>{download(new Blob([scenarioHTML(scenarioObj($('#shHide').checked))],{type:'text/html'}),nm+'.html');$('#shNote').textContent=`Saved ${nm}.html. Send it to the crew. It opens straight to this drill in any browser, offline.`;};
  $('#shCopy').onclick=()=>copyText(summary().join('\n'),'#shCopy');
  $('#shSend').onclick=()=>{const f=new File([scenarioHTML(scenarioObj($('#shHide').checked))],nm+'.html',{type:'text/html'});c.toBlob(b=>{const p=new File([b],nm+'.png',{type:'image/png'});navigator.share({files:[f,p],title:'SizeUp drill',text:summary().join('\n')}).catch(()=>{});});};}
$('#shareBtn').onclick=openShare;
$('#mClose').onclick=closeModal;$('#modal').onclick=e=>{if(e.target.id==='modal')closeModal();};
async function loadScenario(o){if(!o||o.format!=='sizeup-scenario')throw new Error('Not a SizeUp scenario file');
  let B,img;if(o.sceneId==='photo'){img=await loadImg(o.photo);A.photoData=o.photo;A.photoMarks=o.marks;B=photoBuilding(img.naturalWidth,img.naturalHeight,o.marks);}else{B=BUILDINGS[o.sceneId];img=IMGS[o.sceneId];}
  A.B=B;A.img=img;setTexture();A.scn={format:o.format,v:o.v,sceneId:o.sceneId,origin:o.origin,fuel:o.fuel,preburn:o.preburn,openings:o.openings||{},doors:o.doors||{},occupant:o.occupant||'none',wind:o.wind||{dir:'calm',spd:0},glass:o.glass||'fails',seed:o.seed,actions:o.actions||[],tNow:o.tNow||0};
  A.mode=o.mode==='crew'?'crew':'solo';A.hidden=!!o.hideAnswers;A.locked=false;A.lockResult=null;A.calls={};A.facts={...B.facts,...(o.facts||{})};$('#radio').value=o.radio||'';A.side=o.side||'A';A.originSet=true;A.latest=[];buildRoomSel();
  A.maxScreen=4;A.screen=3;A.finished=false;rebuild();warm(4);show(4);buildInjects();startClock();toast(`Drill loaded: ${B.name} at T+${fmt(now())}. Clock running.`);}
$('#fileScn').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const t=await f.text();let o;if(/^\s*</.test(t)){const d=new DOMParser().parseFromString(t,'text/html').getElementById('sizeup-scenario');if(!d)throw new Error('No scenario inside that file');o=JSON.parse(d.textContent);}else o=JSON.parse(t);await loadScenario(o);}catch(err){$('#fileErr').textContent='Could not open that drill: '+err.message;}});
$('#resetBtn').onclick=()=>{A.scn.actions=[];A.scn.tNow=0;A.latest=[];A.finished=false;rebuild();warm(4);renderBoard();buildInjects();startClock();toast('Reset to arrival (T+0). Clock running.');};
$('#newBtn').onclick=()=>{A.maxScreen=1;A.playing=false;show(1);};
let tt;function toast(t){const el=$('#toast');el.textContent=t;el.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>el.classList.remove('show'),4500);}
function refreshAll(){A.visT=-1;if(A.screen===4){renderBoard();buildInjects();}else if(A.screen===3)renderSetup();}
document.addEventListener('keydown',e=>{if(A.screen!==4||$('#modal').classList.contains('show')||/TEXTAREA|INPUT|SELECT|BUTTON/.test(e.target.tagName)&&e.key===' '||/TEXTAREA|INPUT|SELECT/.test(e.target.tagName)||e.target.isContentEditable)return;if(e.key===' '){e.preventDefault();togglePlay();}else if(e.key==='ArrowRight')doEvolve(60);else if((e.key==='h'||e.key==='H')&&A.mode==='crew'){A.hidden=!A.hidden;renderBoard();}});

/* ---------- boot ---------- */
(async()=>{await initSamples();syncUI();requestAnimationFrame(loop);
  const emb=document.getElementById('sizeup-scenario');if(emb){try{await loadScenario(JSON.parse(emb.textContent));}catch(e){console.error(e);$('#fileErr').textContent='Embedded drill could not be loaded.';}}
  window.__sizeup.ready=true;})();
Object.assign(window.__sizeup,{syncUI,rebuild,advance,order,debrief,scenarioObj,scenarioHTML,loadScenario,truthCalls,summary,exportPNG,buildInjects,smokeText,openShare,layout});

})();
