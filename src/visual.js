/* Maps model state -> renderer inputs (windows, lights, flames, smoke emitters). */
const SizeupVisual=(()=>{
function windPx(w){if(!w||w.dir==='calm')return 0;const s=[14,34,62][w.spd||0];return w.dir==='B'?s:w.dir==='D'?-s:0;}
// time of day & weather -> lighting/haze parameters for the renderer (look-tuned, not physical)
function envOf(S){const e=S.scn.env||{};const tod=e.tod||'day',pr=e.precip||'none',lit=!!S.lights;
  const T={day:{amb:[1,1,1],gk:1,samb:[1,1,1],fogc:[.74,.76,.79],ug:0},
    dusk:{amb:[.5,.45,.56],gk:1.7,samb:[.52,.5,.58],fogc:[.36,.34,.42],ug:.9},
    night:{amb:[.075,.09,.15],gk:2.6,samb:[.16,.17,.22],fogc:[.05,.06,.08],ug:2.2}}[tod]||{};
  const o={amb:T.amb.slice(),gk:T.gk,samb:T.samb.slice(),fogc:T.fogc.slice(),ug:T.ug,fog:0,flood:0,sfog:0,tod,precip:pr,lit};
  if(lit&&tod!=='day'){o.flood=tod==='night'?.42:.22;o.samb=o.samb.map(v=>Math.max(v,tod==='night'?.62:.72));o.fogc=o.fogc.map(v=>v+(tod==='night'?.16:.08));}
  if(pr==='rain'){o.amb=o.amb.map((v,i)=>v*[.78,.81,.88][i]);o.samb=o.samb.map(v=>v*.92);o.fog=.12;}
  if(pr==='snow'){o.amb=o.amb.map((v,i)=>v*[.9,.93,1][i]);o.fog=.2;o.fogc=o.fogc.map(v=>tod==='day'?v+.08:v+.03);}
  if(pr==='fog'){o.fog=tod==='day'?.52:.45;}
  o.sfog=o.fog*.85;return o;}
function build(S,B,M){const vis={windows:[],lights:[],flames:[],emitters:[],wind:windPx(S.wind||S.scn.wind),dim:0,env:envOf(S)};const ov=M.openingVis(S);const U=B.H/800;const lean=vis.wind/90;
  let total=0;
  B.openings.forEach((o,i)=>{const v=ov[o.id];if(!v)return;const seed=(i*0.137)%1;
    if(o.hidden){if(v.rate>.05&&B.ridge){const z=B.zones.find(z=>z.id===o.zone);vis.emitters.push({key:'r'+o.id,kind:'rear',x:(z.x0+z.x1)/2,y:B.ridge.y+30*U,w:Math.min(240*U,(z.x1-z.x0)),hgt:10*U,rate:v.rate*16,vel:Math.min(2,v.vel),den:v.den,vol:v.vol,rgb:v.rgb,alpha:.85,cool:.5});total+=v.rate*.6;}return;}
    const top=o.y-o.h/2;const broken=v.state!=='closed';
    if(o.type==='window'||(o.type==='door'&&broken)||(o.type==='garage'&&broken)){
      vis.windows.push({x:o.x,y:o.y,w:o.w,h:o.h,glow:o.type==='window'||broken?v.glow*(broken?1:.8):0,stain:o.type==='window'?v.stain:0,broken,seed});}
    if(v.glow>.05){vis.lights.push({x:o.x,y:o.y-o.h*.2,r:Math.max(o.w,o.h)*(1.1+v.glow*.6+v.flame*1.2),i:Math.min(1.1,(broken?.45:.22)*v.glow+v.flame*.6)});}
    if(v.flame>.04){// flame starts at the neutral plane, rolls out over the head and licks up the wall above
      const npf=o.type==='door'?.5:.44;const inside=o.h*npf;let up=o.h*(.45+1.3*v.flame);
      if(o.cover!=null)up=Math.min(up,Math.max(8*U,o.cover-top+10*U));
      const fh=inside+up,base=top+inside;const ww=Math.max(o.w,40*U);
      // quad half-width = w*.8 (renderer); opening half-width = ww/2 -> ow = (ww/2)/(w*.8)
      const qw=ww*1.25;vis.flames.push({x:o.x,y:base,w:qw,h:fh,i:.9+v.flame*.45,seed,lean,asp:qw/Math.max(1,fh)*1.6,hv:inside/fh,ow:(ww/2)/(qw*.8)});
      if(o.cover!=null&&v.flame>.5)vis.flames.push({x:o.x,y:o.cover+14*U,w:ww*1.6,h:(30+50*v.flame)*U,i:.6+v.flame*.4,seed:seed+.5,lean,asp:ww*1.6/((30+50*v.flame)*U)*1.6});}
    if(v.rate>.01){const k=o.type==='door'||o.type==='garage'?.45:v.frac;const ey=o.cover!=null?o.cover:top+(broken?o.h*.08:0);
      vis.emitters.push({key:o.id,kind:broken?'open':'leak',x:o.x,y:ey,w:broken?o.w*.85:o.w*(o.cover!=null?1.6:.9),hgt:broken?o.h*k*.55:4*U,rate:v.rate*(broken?34:110)*(o.w>200*U?2:1),vel:v.vel,den:v.den,vol:v.vol,rgb:v.steam>.3?[205,203,198]:broken?v.rgb:v.rgb.map((c,j)=>c*.45+[120,117,112][j]*.55),glow:v.flame>.05?.9:v.glow*.25,pulse:v.pulse,alpha:broken?1:.5,cool:v.col==='white'?.1:.35});total+=v.rate*(broken?1:.3);}
  });
  for(const oid in S.o){const o=S.o[oid];if(o.type!=='roof'||o.state==='closed')continue;const v=ov[oid];const sp=B.roofSpots&&(B.roofSpots[o.over]||B.roofSpots[o.zone]);if(!sp||!v)continue;
    vis.emitters.push({key:oid,kind:'roof',x:sp.x,y:sp.y,w:70*U,hgt:6*U,rate:v.rate*30+2,vel:Math.max(1,v.vel),den:v.den,vol:v.vol,rgb:v.rgb,glow:v.flame>.05?.8:0,cool:.4});total+=v.rate;
    const az=S.z[o.zone];if(az&&az.ign&&!az.out&&az.q>.35){const fh=(60+az.q*110)*U;vis.flames.push({x:sp.x,y:sp.y+8*U,w:70*U,h:fh,i:.8+az.q*.4,seed:.77,lean,asp:1.2});vis.lights.push({x:sp.x,y:sp.y,r:160*U,i:.6*az.q});}}
  // eave / soffit smoke: one short run of emitters per smoky stretch of eave (localized, weighted by that zone) [see model eavesVis]
  const e=M.eavesVis(S);if(e&&e.segs&&e.rate>.02){const ey=B.eaves[0].y;
    for(const g of e.segs){if(g.rate<.012)continue;const n=Math.max(1,Math.round((g.x1-g.x0)/(60*U)));
      for(let i=0;i<n;i++){const x=g.x0+(i+.5)*(g.x1-g.x0)/n;
        vis.emitters.push({key:'eave:'+g.zone+':'+(g.src||'')+':'+Math.round(g.x0)+':'+i,kind:'eave',x,y:g.y!=null?g.y:ey,w:(g.x1-g.x0)/n*(g.src==='gable'?1:.9),hgt:4*U,rate:g.rate*7,vel:Math.min(3,g.vel),den:g.den,vol:g.vol,rgb:g.rgb,alpha:.45+.15*g.den,cool:.4,glow:e.flame?.5:0,pulse:g.pulse?'attic':0});}}
    if(e.flame>.4&&!e.pulse){const hot=e.segs.filter(g=>g.src==='attic'&&g.rate>=e.rate*.6);for(const g of hot)vis.flames.push({x:(g.x0+g.x1)/2,y:ey,w:(g.x1-g.x0)*.8,h:(50+e.flame*90)*U,i:.5+e.flame*.4,seed:.31+g.x0*.001,lean,asp:Math.max(1.5,(g.x1-g.x0)*.8/((50+e.flame*90)*U)*1.6)});}
    total+=e.rate;}
  vis.lights.sort((a,b)=>b.i-a.i);vis.lights=vis.lights.slice(0,8);
  vis.dim=Math.min(.28,total*.06);
  return vis;}
return{build,windPx,envOf};})();
