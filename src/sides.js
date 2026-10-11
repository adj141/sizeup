/* SizeUp: multi-side buildings & the 360. Side views (A-D), the walk-around time cost, builder marks for Sides B/C/D
   (photos, openings mapped to rooms, eave/grade, stories, tactical features), the 360 follow-up report, and the 360 debrief.
   The builder's marks are scenario truth: they are drawn only on the builder step (2), never during the drill. */
const SIDE_ORDER=['A','B','C','D'];
const FEATS={fence:'Fence',power:'Power lines',exposure:'Exposure building',car:'Car',porch:'Porch / deck',meter:'Utility meter'};
const FEAT_FX={fence:'adds hose-stretch time to lines on this side',power:'no ladders or aerial on this side',exposure:'radiant-heat risk when fire shows on this side',car:'blocks apparatus: no aerial on this side',porch:'access note (no model effect)',meter:'utility shut-off location (no model effect)'};
const FEAT_COL={fence:'#bcaaa4',power:'#ffee58',exposure:'#ef5350',car:'#4fc3f7',porch:'#a5d6a7',meter:'#ce93d8'};
function curView(){if(!A.B)return null;if(A._vB!==A.B||A._vs!==A.side){A._vB=A.B;A._vs=A.side;A._view=M.viewOf(A.B,A.side);}return A._view;}
function sideImg(side){return side==='A'?A.img:(A.sideImgs[side]||null);}
function sideHas(side){const V=M.viewOf(A.B,side);return !!(V.has&&sideImg(side));}
/* ---------- switching sides ---------- */
function setSide(side){if(!A.B||!SIDE_ORDER.includes(side))return;if(side===A.side){syncSide();return;}
  if(A.screen===4&&A.S){const S=A.S;const first=side!=='A'&&S.walked[side]==null;const cost=first?Math.max(0,Math.round(S.set.walkSide)):0;
    A.side=side;if(first)order({kind:'view',side,cost});else{const a={kind:'view',side,cost:0};A.scn.actions.push({...a,t:now()});M.act(S,{...a,t:S.t});}// a revisit takes no drill time
    if(first&&cost>1){const ne=advance(cost-1);if(ne.length){A.latest=ne.map(e=>e.msg);handleEvents(ne);}renderBoard();buildInjects();}
    toast(first?`T+${fmt(now())} · 360: walked to Side ${side}. That took ${fmt(cost)} of drill time.`:`Side ${side}${side==='A'?'':' (already walked: no extra time)'}`);}
  else A.side=side;
  applySide();}
function applySide(){A.visT=-1;setTexture();layout();if(R){R.clear();const v=curVis();if(v&&!v.none)R.prewarm(A.screen===4?3:2,v);}syncUI();if(A.screen===2)renderSideCtl();if(A.screen===3)renderSetup();if(A.screen===4)renderBoard();}
function syncSide(){const tabs=$('#sideTabs');if(!tabs)return;const show=!!A.B&&A.screen>=2;tabs.hidden=!show;stage.classList.toggle('hastabs',show);if(!show){$('#sideTag').hidden=true;stage.classList.remove('nophoto');return;}
  const S=A.S,drill=A.screen===4&&S;
  tabs.querySelectorAll('button[data-side]').forEach(b=>{const s=b.dataset.side;b.classList.toggle('on',s===A.side);const walked=!drill||s==='A'||S.walked[s]!=null;b.classList.toggle('walk',!walked);b.classList.toggle('nopic',!sideHas(s));
    b.title=s==='A'?'Side A (front)':walked?`Side ${s}`:`Side ${s}: first look costs ${fmt(S.set.walkSide)} of drill time (walking there)`;});
  const V=curView();const nop=!!A.B&&!(V&&V.has&&sideImg(A.side));stage.classList.toggle('nophoto',nop);$('#sideTag').hidden=!(V&&V.has&&V.illustrated&&!nop);const d=$('#sideDesc');
  if(nop&&d){const live=A.S&&A.screen>=3?sideLive(A.side):'';d.innerHTML=`<b>Side ${A.side}</b><span class="tag">NO PHOTO</span><p>${esc((V&&V.desc)||'No description entered for this side.')}</p>${live?`<p class="live">${esc(live)}</p>`:''}`;}}
// what you'd see on a side with no photo: from the model, the same readings the picture would show
function sideLive(side){const S=A.S,v=M.openingVis(S);const os=A.B.openings.filter(o=>o.side===side&&v[o.id]);const fl=os.filter(o=>v[o.id].flame>.05),sm=os.filter(o=>v[o.id].rate>.03);
  const e=M.eavesVis(S,side);const parts=[];if(fl.length)parts.push('Fire showing from '+fl.map(o=>o.name).join(', '));
  if(sm.length){const d=v[sm[0].id];parts.push(`${M.VOLN[d.vol]} ${d.col} smoke from ${sm.map(o=>o.name+(v[o.id].state==='closed'?', around the gaps':'')).join(', ')}`);}
  if(e&&e.rate>.02)parts.push('Smoke at the eaves');if(!parts.length)parts.push(os.length?'Nothing showing from this side right now.':'No openings marked on this side.');return'From here: '+parts.join(' · ')+'.';}
$('#sideTabs').addEventListener('click',e=>{const b=e.target.closest('button[data-side]');if(b)setSide(b.dataset.side);});
{let t0=null;stage.addEventListener('touchstart',e=>{if(e.touches.length===1)t0={x:e.touches[0].clientX,y:e.touches[0].clientY,t:performance.now()};},{passive:true});
 stage.addEventListener('touchend',e=>{if(!t0||!A.B||A.screen<2)return;const t=e.changedTouches[0];const dx=t.clientX-t0.x,dy=t.clientY-t0.y;const ok=Math.abs(dx)>60&&Math.abs(dy)<45&&performance.now()-t0.t<700;t0=null;
   if(!ok)return;const i=SIDE_ORDER.indexOf(A.side);setSide(SIDE_ORDER[(i+(dx<0?1:3))%4]);},{passive:true});}
/* ---------- builder marks on the viewed side (step 2 only) ---------- */
function drawFeatures(c,V,side,U){for(const f of (A.B.features||[]).filter(f=>f.side===side&&f.w)){const col=FEAT_COL[f.type]||'#fff';c.setLineDash([6*U,5*U]);c.lineWidth=Math.max(2*U,2);c.strokeStyle=col;c.strokeRect(f.x-f.w/2,f.y-f.h/2,f.w,f.h);c.setLineDash([]);
  c.font=`700 ${Math.round(15*U)}px sans-serif`;const t=(FEATS[f.type]||f.type).toUpperCase();const tw=c.measureText(t).width;const ty=Math.max(16*U,f.y-f.h/2-6*U);c.fillStyle='rgba(0,0,0,.65)';c.fillRect(f.x-f.w/2,ty-15*U,tw+10*U,19*U);c.fillStyle=col;c.fillText(t,f.x-f.w/2+5*U,ty);}}
function drawSideMarks(c,V,k,U){const side=A.side;const sm=A.B.id==='photo'?(A.photoMarks.sides||{})[side]:null;
  const line=(y,col,lab)=>{c.setLineDash([10*U,8*U]);c.lineWidth=Math.max(2/k,2*U);c.strokeStyle=col;c.beginPath();c.moveTo(0,y);c.lineTo(V.W,y);c.stroke();c.setLineDash([]);c.font=`${Math.round(16*U)}px sans-serif`;c.fillStyle=col;c.fillText(lab,8*U,y-6*U);};
  const eave=sm?sm.eave:(V.eaves&&V.eaves[0]?V.eaves[0].y:null),grade=sm?sm.grade:(A.B.views[side]||{}).grade;
  if(eave!=null)line(eave,'#ffb300','EAVE');if(grade!=null)line(grade,'#90caf9','GRADE');
  (V.floors||[]).filter(f=>/^(\d+|B)$/.test(f.f)&&f.y1>f.y0+8).forEach(f=>{c.font=`700 ${Math.round(15*U)}px sans-serif`;c.fillStyle=f.f==='B'?'#90caf9':'rgba(255,255,255,.8)';c.fillText(f.f==='B'?'BSMT':'F'+f.f,V.W-56*U,(f.y0+f.y1)/2);});
  for(const o of V.openings.filter(o=>!o.hidden)){const col=o.level==='B'?'#90caf9':o.type==='door'?'#90caf9':'#ffb300';c.lineWidth=Math.max(2*U,2/k);c.strokeStyle=col;c.strokeRect(o.x-o.w/2,o.y-o.h/2,o.w,o.h);
    c.font=`600 ${Math.round(12*U)}px sans-serif`;const t=M.zname(A.S||{B:A.B},o.zone);const tw=c.measureText(t).width;c.fillStyle='rgba(0,0,0,.7)';c.fillRect(o.x-tw/2-4*U,o.y+o.h/2+3*U,tw+8*U,16*U);c.fillStyle='#fff';c.fillText(t,o.x-tw/2,o.y+o.h/2+15*U);}
  drawFeatures(c,V,side,U);}
function featTap(mk,p,V){const fs=mk.features||(mk.features=[]);const hit=fs.findIndex(f=>Math.abs(p.x-f.x)<f.w/2&&Math.abs(p.y-f.y)<f.h/2);if(hit>=0){fs.splice(hit,1);return;}
  const W=V.W,H=V.H;const sz={fence:[W*.35,H*.08],power:[W*.35,H*.14],exposure:[W*.12,H*.5],car:[W*.2,H*.13],porch:[W*.2,H*.16],meter:[W*.04,H*.07]}[A.markMode];fs.push({type:A.markMode,x:Math.round(p.x),y:Math.round(p.y),w:Math.round(sz[0]),h:Math.round(sz[1])});}
function sideMarkTap(p){const sm=(A.photoMarks.sides||{})[A.side];if(!sm||!sm.W){toast(`Load a photo of Side ${A.side} first, or describe it in the box below.`);return;}
  const n=sm.stories||A.photoMarks.stories,bh=(sm.grade-sm.eave)/n;
  if(A.markMode==='eave')sm.eave=Math.round(Math.min(p.y,sm.grade-40));else if(A.markMode==='grade')sm.grade=Math.round(Math.max(p.y,sm.eave+40));
  else if(FEATS[A.markMode])featTap(sm,p,curView());
  else{const hit=sm.openings.findIndex(o=>Math.abs(p.x-o.x)<o.w/2&&Math.abs(p.y-o.y)<o.h/2);if(hit>=0)sm.openings.splice(hit,1);
    else{const t=A.markMode==='garage'?'garage':A.markMode;const h=t==='door'?bh*.78:t==='garage'?bh*.72:bh*.5,w=t==='door'?h*.45:t==='garage'?h*2:h*.7;
      sm.openings.push({type:t,x:Math.round(p.x),y:Math.round(t!=='window'?Math.min(p.y,sm.grade-h/2):p.y),w:Math.round(w),h:Math.round(h)});}}
  rebuildPhoto();}
function rebuildPhoto(){const keep=A.scn.origin;A.B=photoBuilding(A.B.W,A.B.H,A.photoMarks);buildRoomSel();if(A.B.zones.some(z=>z.id===keep))A.scn.origin=keep;$('#roomSel').value=A.scn.origin;A.S=null;A.visT=-1;setTexture();syncUI();renderSideCtl();}
/* Builds the other sides of a photo building from the builder's marks: rooms behind each side's openings (rear rooms for Side C,
   a basement for any opening below grade or in an extra lowest level on a side with more stories than the front), views & features. */
function extendPhotoSides(b,mk){const n=mk.stories;const sides=mk.sides||{};b.views={A:{stories:n}};b.features=(mk.features||[]).map(f=>({...f,side:'A',name:FEATS[f.type]}));
  const lvl=(sm,o)=>{const ns=sm.stories||n;const bh=(sm.grade-sm.eave)/ns;if(o.y>=sm.grade)return'B';const i=Math.floor((o.y-sm.eave)/bh);const lv=Math.max(1,Math.min(ns,ns-i));const extra=Math.max(0,ns-n);return lv<=extra?'B':String(Math.min(n,lv-extra));};
  const F={};let needB=!!mk.basement;const rear={};
  for(const s of ['B','C','D']){const sm=sides[s];if(!sm)continue;b.views[s]={desc:sm.desc||'',stories:sm.stories||n};if(!sm.W)continue;
    F[s]=sm.openings.map(o=>lvl(sm,o));F[s].forEach(f=>{if(f==='B')needB=true;else if(s==='C')rear[f]=true;});}
  for(const f of Object.keys(rear).sort()){b.zones.push({id:'C'+f,name:`Floor ${f}, rear room`,floor:f,x0:b.bldg.x0,x1:b.bldg.x1,vol:1,hidden:true,rear:true});
    b.conns.push({id:`h${f}-C${f}`,a:'h'+f,b:'C'+f,type:f==='1'?'open':'door',init:f==='1'?'open':'closed',name:`Floor ${f} rear room door`});
    if(rear[String(+f-1)])b.conns.push({id:`C${+f-1}-C${f}`,a:'C'+(+f-1),b:'C'+f,type:'ceiling'});if(f===String(n))b.conns.push({id:`C${f}-attic`,a:'C'+f,b:'attic',type:'ceiling'});}
  if(needB){b.zones.push({id:'bsmt',name:'Basement',floor:'B',x0:b.bldg.x0,x1:b.bldg.x1,vol:1.4,hidden:true,rear:true});
    b.conns.push({id:'h1-bsmt',a:'h1',b:'bsmt',type:'door',init:'closed',name:'Basement stair door',stair:true},{id:'bsmt-L1',a:'bsmt',b:'L1',type:'floor'},{id:'bsmt-R1',a:'bsmt',b:'R1',type:'floor'});}
  const zid=(s,f)=>f==='B'?'bsmt':s==='C'?'C'+f:s==='B'?'L'+f:'R'+f;const top=String(n);
  for(const s of ['B','C','D']){const sm=sides[s];if(!sm||!sm.W)continue;const cnt={};
    sm.openings.forEach((o,i)=>{const f=F[s][i];cnt[f]=(cnt[f]||0)+1;const auto=zid(s,f);const zone=o.zone&&b.zones.some(z=>z.id===o.zone)?o.zone:auto;
      b.openings.push({id:`${s.toLowerCase()}${i}`,name:`Side ${s} ${f==='B'?'basement':'floor '+f} ${o.type} ${cnt[f]}`,type:o.type,side:s,zone,x:o.x,y:o.y,w:o.w,h:o.h,hidden:true,level:f==='B'?'B':undefined,autoZone:auto,mark:i});});
    const ns=sm.stories||n,bh=(sm.grade-sm.eave)/ns,extra=Math.max(0,ns-n);const xs=sm.openings.map(o=>o.x);
    const x0=xs.length?Math.max(0,Math.min(...xs)-sm.W*.1):sm.W*.12,x1=xs.length?Math.min(sm.W,Math.max(...xs)+sm.W*.1):sm.W*.88,mid=(x0+x1)/2;
    const floors=[{f:'Roof',y0:0,y1:Math.max(1,sm.eave-sm.H*.09)},{f:'Attic',y0:Math.max(1,sm.eave-sm.H*.09),y1:sm.eave}];
    for(let i=0;i<ns;i++){const lv=ns-i;floors.push({f:lv<=extra?'B':String(lv-extra),y0:sm.eave+i*bh,y1:sm.eave+(i+1)*bh});}if(!extra)floors.push({f:'B',y0:sm.grade,y1:sm.H});
    // top-floor rooms along this side's eave, and where every room sits in this picture (for smoke behind the roofline)
    const hasC=b.zones.some(z=>z.id==='C'+top);const zx={};const L=[x0,mid],Rr=[mid,x1];
    if(s==='C'){if(hasC)zx['C'+top]=[x0,x1];else{zx['R'+top]=L;zx['L'+top]=Rr;}}else if(s==='B'){if(hasC){zx['C'+top]=L;zx['L'+top]=Rr;}else zx['L'+top]=[x0,x1];}else{if(hasC){zx['R'+top]=L;zx['C'+top]=Rr;}else zx['R'+top]=[x0,x1];}
    const zc={};b.zones.forEach(z=>{const isC=/^C/.test(z.id)||z.id==='bsmt';const isL=/^L/.test(z.id),isR=/^R/.test(z.id);
      zc[z.id]=s==='C'?(isR?(x0+mid)/2:isL?(mid+x1)/2:mid):s==='B'?(isC?(x0+mid)/2:(mid+x1)/2):(isC?(mid+x1)/2:(x0+mid)/2);});
    Object.assign(b.views[s],{W:sm.W,H:sm.H,img:'side'+s,floors,bldg:{x0,x1},eaves:[{x0,x1,y:sm.eave}],ridge:{x0:x0+(x1-x0)*.25,x1:x1-(x1-x0)*.25,y:Math.max(4,sm.eave-sm.H*.08)},roofSpots:{},zx,zc,grade:sm.grade,walkout:extra>0});
    b.features.push(...(sm.features||[]).map(f=>({...f,side:s,name:FEATS[f.type]})));}
  if(b.openings.some(o=>o.side==='C'&&o.type==='door'&&o.id!=='prear'))b.openings=b.openings.filter(o=>o.id!=='prear');
  return b;}
/* ---------- builder panel for the viewed side (step 2) ---------- */
function renderSideCtl(){const el=$('#sideCtl');if(!el||!A.B)return;const side=A.side;const photo=A.B.id==='photo';el.hidden=side==='A';$('#markCtl').classList.toggle('sidemode',side!=='A');if(side==='A')return;
  const V=curView();const sm=photo?(A.photoMarks.sides||{})[side]:null;const desc=photo?(sm&&sm.desc)||'':((A.B.views||{})[side]||{}).desc||'';
  const ops=A.B.openings.filter(o=>o.side===side);const zs=A.B.zones.filter(z=>!z.attic);
  const opRows=ops.map(o=>`<div class="oitem"><span>${esc(o.name)}</span>${photo&&o.mark!=null?`<select class="sop" data-mark="${o.mark}" aria-label="Room behind ${esc(o.name)}">${zs.map(z=>`<option value="${z.id}"${z.id===o.zone?' selected':''}>${esc(z.name)}${z.id===o.autoZone?' (auto)':''}</option>`).join('')}</select>`:`<span class="muted">→ ${esc(M.zname({B:A.B},o.zone))}</span>`}</div>`).join('')||'<div class="muted tiny">No openings marked on this side yet.</div>';
  const fts=(A.B.features||[]).filter(f=>f.side===side).map(f=>`<li><b>${esc(f.name||FEATS[f.type])}</b> · <span class="muted">${esc(FEAT_FX[f.type]||'')}</span></li>`).join('');
  el.innerHTML=`<div class="lbl">Side ${side} <span class="val">${V&&V.has?(V.illustrated?'Illustrated view (not a photo)':'Photo'):'No photo: text description'}</span></div>
   <div class="note2">Builder view. These marks are the scenario truth: they are hidden during the drill (no labels or outlines).</div>
   ${photo?`<div class="btnrow" style="margin:8px 0"><label class="btn ghost sm filebtn">${sm&&sm.W?'Replace':'Load'} Side ${side} photo<input type="file" accept="image/*" id="fileSide" hidden></label>${sm&&sm.W?'<button class="btn ghost sm" id="sideRm">Remove photo</button>':''}</div>
     ${sm&&sm.W?`<div class="lbl" style="margin-top:6px">Stories visible on Side ${side} <span class="val">more than the front = walk-out basement</span></div><div class="stepper"><button id="ssDown" aria-label="Fewer stories on this side">−</button><output id="ssOut">${sm.stories||A.photoMarks.stories}</output><button id="ssUp" aria-label="More stories on this side">+</button></div>`:''}`:''}
   <div class="lbl" style="margin-top:8px">Description <span class="val">shown in the drill if there is no photo</span></div>
   <textarea id="sideDescIn" rows="2" ${photo?'':'readonly'} placeholder="e.g. Side C: 3 stories, walk-out basement door at grade, fence and gate">${esc(desc)}</textarea>
   <div class="lbl" style="margin-top:8px">Openings → rooms</div><div class="olist">${opRows}</div>
   ${fts?`<div class="lbl" style="margin-top:8px">Features (teaching effects)</div><ul class="flist">${fts}</ul>`:''}`;
  const fi=$('#fileSide');if(fi)fi.onchange=e=>{loadSidePhoto(e.target.files[0]);e.target.value='';};
  const rm=$('#sideRm');if(rm)rm.onclick=()=>{const s=A.photoMarks.sides[side];const d=s.desc;A.photoMarks.sides[side]={desc:d};delete A.sidePhotos[side];delete A.sideImgs[side];rebuildPhoto();layout();};
  const st=d=>{const s=A.photoMarks.sides[side];s.stories=clamp((s.stories||A.photoMarks.stories)+d,1,7);rebuildPhoto();};
  if($('#ssDown')){$('#ssDown').onclick=()=>st(-1);$('#ssUp').onclick=()=>st(1);}
  const di=$('#sideDescIn');if(photo)di.oninput=()=>{const s=(A.photoMarks.sides||(A.photoMarks.sides={}));(s[side]=s[side]||{}).desc=di.value;A.B.views[side]=A.B.views[side]||{};A.B.views[side].desc=di.value;};
  el.querySelectorAll('select.sop').forEach(sel=>sel.onchange=()=>{const s=A.photoMarks.sides[side];s.openings[+sel.dataset.mark].zone=sel.value;rebuildPhoto();});}
async function loadSidePhoto(file){if(!file)return;const side=A.side;try{let src;try{src=await createImageBitmap(file,{imageOrientation:'from-image'});}catch(e){src=await loadImg(URL.createObjectURL(file));}
  const k=Math.min(1,1400/Math.max(src.width,src.height)),c=document.createElement('canvas');c.width=Math.round(src.width*k);c.height=Math.round(src.height*k);c.getContext('2d').drawImage(src,0,0,c.width,c.height);
  const url=c.toDataURL('image/jpeg',.85);const im=await loadImg(url);A.sidePhotos[side]=url;A.sideImgs[side]=im;const s=(A.photoMarks.sides||(A.photoMarks.sides={}));const old=s[side]||{};
  s[side]={W:c.width,H:c.height,eave:Math.round(c.height*.25),grade:Math.round(c.height*.86),stories:old.stories||A.photoMarks.stories,openings:[],features:[],desc:old.desc||''};A.markMode='window';rebuildPhoto();layout();toast(`Side ${side} photo loaded. Mark its openings, eave and grade lines, and features.`);}
  catch(e){console.error(e);toast('Could not read that image. Try a JPG or PNG.');}}
/* ---------- the 360 follow-up report (board) ---------- */
const FU_KEYS=['walkout','basement','stories','fire','smoke','victim','power','fence','exposure','car','nothing'];
function renderFU(){const el=$('#fuCard');if(!el||!A.S)return;const S=A.S,F=A.fu;const walked=['B','C','D'].filter(s=>S.walked[s]!=null);
  const last=S.followups[S.followups.length-1];const sig=JSON.stringify([F,walked,last&&last.t,S.strategy,A.mode]);if(el._sig===sig)return;el._sig=sig;
  el.innerHTML=`<h2 style="margin-top:0">360 &amp; follow-up report</h2>
   <div class="fuwalk">${['A','B','C','D'].map(s=>`<span class="${s==='A'||S.walked[s]!=null?'ok':''}">${s}${s!=='A'&&S.walked[s]!=null?' ✓':''}</span>`).join('')}<small>Tap a side above the picture (or swipe) to walk there. The first look at each of Sides B, C and D costs ${fmt(S.set.walkSide)} of drill time; after that, switching is free (treat it as reports from crews there). Teaching value, editable in Task times.</small></div>
   <div class="lbl2">Findings</div>
   <div class="furow"><select id="fuK" aria-label="Finding">${FU_KEYS.map(k=>`<option value="${k}">${esc(M.FIND[k])}</option>`).join('')}</select>
    <div class="seg" id="fuSide" aria-label="Side">${['A','B','C','D'].map(s=>`<button data-v="${s}" class="${(A.fuSide||'C')===s?'on':''}">${s}</button>`).join('')}</div><button class="btn ghost sm" id="fuAdd">Add</button></div>
   <div class="fuchips">${F.findings.map((f,i)=>`<button class="fuchip" data-i="${i}" aria-label="Remove ${esc(M.FIND[f.k])}">${esc(M.FIND[f.k])}${f.side&&f.k!=='nothing'?' · Side '+f.side:''} ✕</button>`).join('')||'<span class="muted tiny">None added yet.</span>'}</div>
   <div class="lbl2">Strategy</div><div class="seg red" id="fuStrat"><button data-v="Offensive" class="${(F.strategy||S.strategy)==='Offensive'?'on':''}">Offensive</button><button data-v="Defensive" class="${(F.strategy||S.strategy)==='Defensive'?'on':''}">Defensive</button></div>
   <div class="tiny muted" style="margin-top:4px">${S.strategy?`Now ${S.strategy}: picking the other one changes it when you give the report.`:'Not set yet: the report sets it.'}</div>
   <div class="lbl2">Assignment changes</div><input id="fuAssign" type="text" value="${esc(F.assign||'')}" placeholder="e.g. Engine 2: 1¾ in. line through the Side C basement slider">
   <div class="lbl2">Accountability location</div><select id="fuAcct"><option value="">Pick…</option>${['Command post, Side A','Side A at the engine','Side B','Side C','Side D'].map(v=>`<option${F.acct===v?' selected':''}>${v}</option>`).join('')}</select>
   <div class="lbl2">Anything else <span class="muted">(optional)</span></div><textarea id="fuText" rows="2" placeholder="Free text, e.g. 3 stories on Side C, walk-out basement, smoke from the basement slider">${esc(F.text||'')}</textarea>
   <button class="btn primary" id="fuGo" style="margin-top:10px">Give follow-up report</button>
   ${last?`<p class="tiny muted" style="margin:8px 0 0">Follow-up given at T+${fmt(last.t-S.tArr)}${S.followups.length>1?` (${S.followups.length} so far)`:''}. It is checked against the scenario in the debrief.</p>`:''}`;
  const sv=()=>{F.assign=$('#fuAssign').value;F.acct=$('#fuAcct').value;F.text=$('#fuText').value;};
  ['#fuAssign','#fuText'].forEach(id=>$(id).oninput=sv);$('#fuAcct').onchange=sv;
  $('#fuSide').onclick=e=>{const b=e.target.closest('button');if(!b)return;A.fuSide=b.dataset.v;$$('#fuSide button').forEach(x=>x.classList.toggle('on',x===b));};
  $('#fuAdd').onclick=()=>{sv();const k=$('#fuK').value;const side=k==='nothing'?null:(A.fuSide||'C');if(!F.findings.some(f=>f.k===k&&f.side===side))F.findings.push({k,side});el._sig=null;renderFU();};
  el.querySelectorAll('.fuchip').forEach(b=>b.onclick=()=>{sv();F.findings.splice(+b.dataset.i,1);el._sig=null;renderFU();});
  $('#fuStrat').onclick=e=>{const b=e.target.closest('button');if(!b)return;sv();F.strategy=b.dataset.v;el._sig=null;renderFU();};
  $('#fuGo').onclick=()=>{sv();order({kind:'followup',findings:F.findings.slice(),strategy:F.strategy||S.strategy||null,assign:F.assign||'',acct:F.acct||'',text:F.text||''});el._sig=null;renderFU();
    toast(`T+${fmt(now())} · 360 follow-up report given. It is checked against the scenario in the debrief.`);};}
/* ---------- debrief: the 360 ---------- */
// that side's picture with the missed item highlighted (opening, feature, or the whole elevation for extra stories)
function missImage(f){const side=f.side;if(!side||!f.mark)return null;const V=M.viewOf(A.B,side);const im=sideImg(side);if(!V.has||!im)return null;
  const W=640,k=W/V.W,H=Math.round(V.H*k);const c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');g.drawImage(im,0,0,W,H);g.fillStyle='rgba(0,0,0,.35)';g.fillRect(0,0,W,H);
  let r=null;if(f.mark.opening){const o=A.B.openings.find(o=>o.id===f.mark.opening);if(o&&o.side===side&&o.x!=null)r=[o.x-o.w/2,o.y-o.h/2,o.w,o.h];}
  else if(f.mark.feature&&f.mark.feature.w){const q=f.mark.feature;r=[q.x-q.w/2,q.y-q.h/2,q.w,q.h];}
  else if(f.mark.band){const vv=(A.B.views||{})[side]||{};const e=V.eaves&&V.eaves[0];r=[V.bldg.x0,e?e.y-10:0,V.bldg.x1-V.bldg.x0,(vv.grade||V.H)-(e?e.y-10:0)];}
  if(!r)return null;const [x,y,w,h]=r.map(v=>v*k);g.save();g.beginPath();g.rect(x-6,y-6,w+12,h+12);g.clip();g.drawImage(im,0,0,W,H);g.restore();
  g.lineWidth=4;g.strokeStyle='#ff5252';g.shadowColor='#ff1744';g.shadowBlur=12;g.strokeRect(x-6,y-6,w+12,h+12);g.shadowBlur=0;
  g.font='700 15px sans-serif';const t=`MISSED · Side ${side}: ${M.FIND[f.k]||f.label}`;const tw=g.measureText(t).width;const ty=y-14>22?y-14:Math.min(H-8,y+h+26);g.fillStyle='rgba(0,0,0,.8)';g.fillRect(Math.max(4,Math.min(W-tw-14,x-6)),ty-17,tw+12,23);g.fillStyle='#fff';g.fillText(t,Math.max(10,Math.min(W-tw-8,x)),ty);
  g.font='600 12px sans-serif';g.fillStyle='rgba(255,255,255,.75)';g.fillText(V.illustrated?'Illustrated view (not a photo)':'Builder photo',8,H-8);return c.toDataURL('image/jpeg',.82);}
function debrief360(add,at){const S=A.S,B=A.B;const others=['B','C','D'];const anySide=others.some(s=>((B.views||{})[s]||{}).W||((B.views||{})[s]||{}).desc);if(!anySide&&!S.views.length)return;
  const seen=others.filter(s=>S.walked[s]!=null);
  add(seen.length===3?'ok':seen.length?'mid':'no',seen.length===3?`360 complete at ${at(S.flags.lap360)}`:seen.length?`Partial 360: saw ${seen.map(s=>'Side '+s).join(', ')}`:'No 360: only Side A was viewed',
    others.map(s=>`Side ${s}: ${S.walked[s]!=null?'viewed '+at(S.walked[s]):'not viewed'}`).join(' · ')+`. The first look at each side cost ${fmt(S.set.walkSide)} of drill time.`,['sides360']);
  const fu=S.followups[S.followups.length-1];const truth=fu?fu.truth:M.findings(S);const res=fu?fu.check.res:truth.map(f=>({...f,st:'miss'}));
  if(!fu)add('no','No 360 follow-up report','After the 360, give a follow-up: what you found (basement, extra stories, fire or smoke on other sides, hazards), strategy confirmed or changed, assignment changes, and where accountability is.',['sides360']);
  else{const ch=fu.check;add(ch.keyHit===ch.keyN?'ok':ch.keyHit?'mid':'no',`360 follow-up at ${at(fu.t)}: ${ch.keyHit} of ${ch.keyN} key findings`,[`Reported: ${fu.findings.map(f=>M.FIND[f.k]+(f.side?' (Side '+f.side+')':'')).join('; ')||'nothing'}`,fu.strategy?`strategy ${fu.strategy}`:'no strategy stated',fu.acct?`accountability: ${fu.acct}`:'no accountability location',fu.assign?`changes: ${fu.assign}`:''].filter(Boolean).join(' · '),['sides360']);
    if(ch.extra.length)add('mid','Reported but not found by the model',ch.extra.map(x=>M.FIND[x.k]+(x.side?' (Side '+x.side+')':'')).join('; ')+'. Report what you see; check it on that side.',[]);}
  for(const r of res){if(r.st==='hit')continue;if(!r.key&&!['power','fence','exposure','car'].includes(r.k))continue;
    const why=r.st==='side'?`Mentioned, but not as ${r.k==='walkout'?'a walk-out on Side '+r.side:'Side '+r.side}.`:S.walked[r.side]==null?`Side ${r.side} was never viewed.`:`Side ${r.side} was viewed but this was not reported.`;
    add(r.key?(r.st==='side'?'mid':'no'):'mid',`${r.st==='side'?'Partly reported':'Missed'}: ${r.label}`,why+(r.k==='walkout'?' A walk-out basement means more stories at the rear and gives you basement-level access for water and entry.':r.k==='stories'?' The building is taller at the rear: plan ladders, egress and search for the extra level.':r.k==='power'?' Ladders and the aerial stay clear of that side.':''),r.k==='walkout'||r.k==='basement'?['basement']:[],missImage(r));}
  // did tactics adapt to what the 360 showed?
  const t360=Math.min(...others.map(s=>S.walked[s]??1e9),fu?fu.t:1e9);const log=S.taskLog||[];const after=x=>(x.start??0)>=t360;
  const bz=B.zones.filter(z=>z.floor==='B').map(z=>z.id);const bFire=bz.some(id=>S.z[id].ign);
  if(bz.length&&bFire){const bf=truth.find(f=>f.k==='walkout'||f.k==='basement');const bAcc=bf&&bf.side?` (basement access on Side ${bf.side})`:'';const fromLevel=log.filter(x=>x.gpm!=null&&(bz.includes(x.zone))&&(x.ext||x.entry));const stair=log.filter(x=>x.gpm!=null&&bz.includes(x.zone)&&!x.ext&&!x.entry);
    add(fromLevel.length?'ok':stair.length?'mid':'no',fromLevel.length?`Basement fire: water from the basement's own level (${fromLevel.map(x=>'Line '+x.id+' '+x.label).join('; ')})`:stair.length?'Basement fire attacked down the interior stair only'+bAcc:'Basement fire: no line to the basement'+bAcc,
      fromLevel.length?'Water through a basement-level door or window, without operating over the fire or in the stairway exhaust path.':'FSRI: water from the basement level (walk-out door, window) or through the floor controls the fire without crews over it or in the stair exhaust. The 360 is where you find that access.',['basement'],!fromLevel.length?missImage(bf||{}):null);}
  const rearFire=truth.filter(f=>f.k==='fire');for(const f of rearFire){const zs=new Set(B.openings.filter(o=>o.side===f.side).map(o=>o.zone));const hit=log.filter(x=>x.gpm!=null&&after(x)&&(zs.has(x.zone)||(x.opening&&S.o[x.opening]&&S.o[x.opening].side===f.side)));
    add(hit.length?'ok':'mid',hit.length?`Tactics adapted to fire on Side ${f.side}`:`No line went to the fire found on Side ${f.side}`,hit.length?hit.map(x=>'Line '+x.id+' → '+x.label).join('; '):'The 360 showed fire on that side; the plan did not change to cover it.',['sides360']);}
  for(const e of S.events.filter(e=>e.hazard==='power'))add('mid',`Power lines blocked a task on Side ${e.side} (${at(e.t)})`,e.msg,[]);
  for(const s in S.expo){const x=S.expo[s];if(!x.warned)continue;const p=log.find(t=>t.kind==='expo'&&t.side===s);add(x.ignited?'no':p?'ok':'mid',x.ignited?`Exposure on Side ${s} ignited at ${at(x.ignited)}`:p?`Exposure on Side ${s} protected (${S.cos.find(c=>c.id===p.co).name})`:`Exposure on Side ${s} was under radiant heat and not protected`,x.ignited?'Fire showing on that side put radiant heat on it long enough to ignite (teaching simplification).':'',['sides360']);}}
