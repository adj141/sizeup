// in-page smoke metrics: renders the current frame with and without the smoke particles and compares pixels.
// returns: letterbox non-black pixels, smoke coverage of the sky band above the ridge over the building, of the roof band, and smoke "mass" per third of the eave
module.exports=async function measure(p){return p.evaluate(()=>{const z=window.__sizeup,R=z.R(),A=z.A,V=z.curView();const cv=document.getElementById('cv');const cw=cv.width,ch=cv.height;
  const sc=Math.min(cw/V.W,ch/V.H);const r={x:(cw-V.W*sc)/2,y:(ch-V.H*sc)/2,w:V.W*sc,h:V.H*sc};const d=cw/document.getElementById('stage').clientWidth;
  const view={x:r.x/d,y:r.y/d,w:r.w/d,h:r.h/d};
  const grab=()=>{const c=document.createElement('canvas');c.width=cw;c.height=ch;const g=c.getContext('2d');g.drawImage(cv,0,0);return g.getImageData(0,0,cw,ch).data;};
  const keep=R.smoke.slice();R.smoke.length=0;R.draw(view,d);const base=grab();R.smoke.push(...keep);R.draw(view,d);const img=grab();
  const X=x=>r.x+x*sc,Y=y=>r.y+y*sc;let lb=0,lbN=0;const m=2;
  for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){if(x>=r.x-m&&x<r.x+r.w+m&&y>=r.y-m&&y<r.y+r.h+m)continue;lbN++;const i=(y*cw+x)*4;if(img[i]+img[i+1]+img[i+2]>12)lb++;}
  const diff=(x,y)=>{const i=(y*cw+x)*4;return Math.abs(img[i]-base[i])+Math.abs(img[i+1]-base[i+1])+Math.abs(img[i+2]-base[i+2]);};
  const band=(x0,x1,y0,y1)=>{let n=0,c=0,s=0;for(let y=Math.max(0,Math.round(Y(y0)));y<Math.min(ch,Math.round(Y(y1)));y++)for(let x=Math.round(X(x0));x<Math.round(X(x1));x++){n++;const v=diff(x,y);if(v>36)c++;s+=v;}return{cov:n?c/n:0,mass:n?s/n:0};};
  const B=A.B,E=B.eaves[0],rg=B.ridge,bx=B.bldg||{x0:E.x0,x1:E.x1};
  const sky=band(bx.x0,bx.x1,0,rg.y),roof=band(E.x0,E.x1,rg.y,E.y);
  const L=E.x1-E.x0,thirds=[0,1,2].map(k=>band(E.x0+k*L/3,E.x0+(k+1)*L/3,0,E.y).mass);
  return{screen:A.screen,t:A.S.t,parts:R.count(),letterboxPx:lb,letterboxN:lbN,rect:r,sky,roof,thirds};});};
