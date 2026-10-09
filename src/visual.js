/* Maps model state -> renderer inputs (windows, lights, flames, smoke emitters). */
const SizeupVisual=(()=>{
function windPx(w){if(!w||w.dir==='calm')return 0;const s=[14,34,62][w.spd||0];return w.dir==='B'?s:w.dir==='D'?-s:0;}
function build(S,B,M){const vis={windows:[],lights:[],flames:[],emitters:[],wind:windPx(S.scn.wind),dim:0};const ov=M.openingVis(S);const U=B.H/800;const lean=vis.wind/90;
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
  const e=M.eavesVis(S);if(e&&e.rate>.02)for(const ev of B.eaves){const n=Math.max(3,Math.round((ev.x1-ev.x0)/(70*U)));for(let i=0;i<n;i++){const x=ev.x0+(i+.5)*(ev.x1-ev.x0)/n;
      vis.emitters.push({key:'eave'+i,kind:'eave',x,y:ev.y,w:(ev.x1-ev.x0)/n,hgt:4*U,rate:e.rate*7,vel:Math.min(3,e.vel),den:e.den,vol:e.vol,rgb:e.rgb,alpha:.45+.15*e.den,cool:.4,glow:e.flame?.5:0});}
    if(e.flame>.4)for(const ev of B.eaves){vis.flames.push({x:(ev.x0+ev.x1)/2,y:ev.y,w:(ev.x1-ev.x0)*.6,h:(50+e.flame*90)*U,i:.5+e.flame*.4,seed:.31,lean,asp:6});}total+=e.rate;}
  vis.lights.sort((a,b)=>b.i-a.i);vis.lights=vis.lights.slice(0,8);
  vis.dim=Math.min(.28,total*.06);
  return vis;}
return{build,windPx};})();
