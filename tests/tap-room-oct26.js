// Oct 26 (AJ approved): tapping a wall on the Fire Origin screen must pick the room that sits behind that spot on THAT side and floor.
// Bug: hidden/windowless rooms were skipped and side pictures used Side A's room positions, so the floor-2 B/C-corner wall on Sides B and C
// picked Bedroom 3/1/2 instead of Bedroom 4. Fix: per-side footprint map (views[side].taps) in buildings.js; zoneAt uses it.
const {chromium}=require('playwright-core');global.window={};
const BLD=require('/workspace/sizeup/src/buildings.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('# '+n);
(async()=>{
const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await br.newPage({viewport:{width:1280,height:800}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///workspace/sizeup/index.html#noautoplay#nowhatsnew');await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);
async function open(sample){await p.evaluate(s=>{document.querySelector(`.sample[data-sample=${s}]`).click();const z=window.__sizeup;z.A.maxScreen=Math.max(z.A.maxScreen,2);z.show(2);},sample);await p.waitForTimeout(300);}
const at=(sd,pts)=>p.evaluate(([sd,pts])=>{const z=window.__sizeup;z.setSide(sd);const V=z.curView();return pts.map(q=>z.zoneAt(q[0],q[1]));},[sd,pts]);
const V=(b,sd)=>{const v=(b.views||{})[sd]||{};return sd==='A'?{...b,...v,W:b.W,H:b.H,floors:b.floors,bldg:b.bldg}:v;};

sec('2-story house: hand-checked corners of every side and floor (left/right as you face that side)');
await open('house');const H=BLD.house;
const corners={A:{'2':['br1','br3'],'1':['liv','gar']},B:{'2':['br4','br1'],'1':['kit','liv'],'B':['bsmt','bsmt']},C:{'2':['br3','br4'],'1':['gar','kit'],'B':['bsmt','bsmt']},D:{'2':['br3','br3'],'1':['gar','gar']}};
for(const sd of 'ABCD'){const v=V(H,sd);for(const fl in corners[sd]){const band=v.floors.find(f=>f.f===fl);const rs=v.taps.filter(r=>H.zones.find(z=>z.id===r.z).floor===fl&&r.y0<band.y1&&r.y1>band.y0);
  const x0=Math.min(...rs.map(r=>r.x0)),x1=Math.max(...rs.map(r=>r.x1)),ym=(Math.max(band.y0,...rs.map(r=>r.y0))+Math.min(band.y1,...rs.map(r=>r.y1)))/2;
  for(const [i,x] of [[0,x0+6],[1,x1-6]])for(const y of [Math.max(band.y0,Math.min(...rs.map(r=>r.y0)))+6,ym]){const [got]=await at(sd,[[x,y]]);
   ok(got===corners[sd][fl][i],`Side ${sd} floor ${fl} ${i?'right':'left'} corner (${Math.round(x)},${Math.round(y)}) -> ${got} (want ${corners[sd][fl][i]})`);}}}
{const [b]=await at('B',[[215,170]]),[c]=await at('C',[[1010,170]]);ok(b==='br4'&&c==='br4',`AJ's case: floor-2 B/C-corner wall picks Bedroom 4 on Side B (${b}) and Side C (${c})`);}

sec('house: every window/door centre picks its own room; every wall point and footprint corner picks the room behind it');
for(const sd of 'ABCD'){const v=V(H,sd);const ops=H.openings.filter(o=>o.side===sd&&o.x!=null);
 const got=await at(sd,ops.map(o=>[o.x,o.y]));ops.forEach((o,i)=>ok(got[i]===o.zone,`Side ${sd} ${o.id} centre -> ${got[i]} (want ${o.zone})`));
 // footprint map agrees with the windows: an opening inside a footprint belongs to that room
 for(const r of v.taps)for(const o of ops)if(o.x>=r.x0&&o.x<r.x1&&o.y>=r.y0&&o.y<r.y1)ok(o.zone===r.z,`Side ${sd} footprint ${r.z} contains ${o.id} of ${o.zone}`);
 const hitsOp=(x,y)=>ops.some(o=>Math.abs(x-o.x)<o.w/2+10&&Math.abs(y-o.y)<o.h/2+10);
 const pts=[];for(const r of v.taps){for(const [x,y] of [[r.x0+5,r.y0+5],[r.x1-5,r.y0+5],[r.x0+5,r.y1-5],[r.x1-5,r.y1-5],[(r.x0+r.x1)/2,(r.y0+r.y1)/2]])if(!hitsOp(x,y))pts.push([x,y,r.z]);}
 // wall points halfway between neighbouring windows on the same floor
 const byY={};ops.filter(o=>o.type==='window').forEach(o=>{const fl=v.floors.find(f=>o.y>=f.y0&&o.y<f.y1).f;(byY[fl]=byY[fl]||[]).push(o);});
 for(const fl in byY){const a=byY[fl].sort((x,y)=>x.x-y.x);for(let i=1;i<a.length;i++){const x=(a[i-1].x+a[i-1].w/2+a[i].x-a[i].w/2)/2,y=(a[i-1].y+a[i].y)/2;if(hitsOp(x,y))continue;const r=v.taps.find(r=>x>=r.x0&&x<r.x1&&y>=r.y0&&y<r.y1);if(r)pts.push([x,y,r.z]);}}
 const g=await at(sd,pts.map(q=>[q[0],q[1]]));let bad=pts.filter((q,i)=>g[i]!==q[2]).map((q,i)=>`${Math.round(q[0])},${Math.round(q[1])}->${g[pts.indexOf(q)]} want ${q[2]}`);
 ok(!bad.length,`Side ${sd}: ${pts.length} wall/corner points pick the room behind them ${bad.slice(0,5).join('; ')}`);
 // whole-wall sweep: never a room from another wall
 const allowed=new Set([...v.taps.map(r=>r.z),...ops.map(o=>o.zone),'attic']);const sw=[];for(let x=v.bldg.x0;x<=v.bldg.x1;x+=15)for(let y=0;y<v.H;y+=12)sw.push([x,y]);
 const gs=await at(sd,sw);const wrong=sw.filter((q,i)=>!allowed.has(gs[i])).map((q,i)=>q.join(',')+'->'+gs[sw.indexOf(q)]);
 ok(!wrong.length,`Side ${sd}: ${sw.length}-point sweep picks only rooms on that wall (${[...allowed].join(' ')}) ${wrong.slice(0,5).join('; ')}`);
 const [att]=await at(sd,[[(v.bldg.x0+v.bldg.x1)/2,(v.floors.find(f=>f.f==='Attic').y0+v.floors.find(f=>f.f==='Attic').y1)/2]]);ok(att==='attic',`Side ${sd}: attic band picks the attic (${att})`);}
{const [a,b,c]=await at('C',[[300,440],[700,470],[960,400]]);ok(a==='gar'&&b==='bsmt'&&c==='bsmt',`Side C: lawn under the garage -> ${a}; walk-out basement wall -> ${b}, ${c}`);}
{const [a]=await at('B',[[600,470]]);ok(a==='bsmt',`Side B: foundation band -> basement (${a})`);}
{const [a]=await at('A',[[400,500]]);ok(a==='liv',`Side A: lawn below the porch -> the floor-1 room above (${a})`);}

sec('house: real taps on the picture (Fire Origin screen) set the Fire Room');
for(const [sd,x,y,want] of [['B',215,200,'br4'],['C',1000,200,'br4'],['C',640,200,'hall2'],['B',330,470,'bsmt'],['A',600,200,'br2'],['D',300,200,'br3']]){
 const r=await p.evaluate(([sd,x,y])=>{const z=window.__sizeup;z.setSide(sd);const V=z.curView();const c=document.querySelector('#cv').getBoundingClientRect();const sc=Math.min(c.width/V.W,c.height/V.H);
  return {cx:c.x+(c.width-V.W*sc)/2+x*sc,cy:c.y+(c.height-V.H*sc)/2+y*sc};},[sd,x,y]);
 await p.mouse.click(r.cx,r.cy);await p.waitForTimeout(150);const o=await p.evaluate(()=>({o:window.__sizeup.A.scn.origin,lab:document.querySelector('#roomSel').selectedOptions[0].textContent,on:!document.querySelector('#toDial').disabled}));
 ok(o.o===want&&o.on,`tap Side ${sd} (${x},${y}) -> ${o.lab}`);}

sec('3-story mixed-use: Side A windows, walls between windows and corners; no-picture sides ignore taps');
await open('mixed');const X=BLD.mixed;{const v=V(X,'A');const ops=X.openings.filter(o=>o.side==='A'&&o.x!=null);const g=await at('A',ops.map(o=>[o.x,o.y]));ops.forEach((o,i)=>ok(g[i]===o.zone,`mixed ${o.id} -> ${g[i]} (want ${o.zone})`));
 const zx=id=>X.zones.find(z=>z.id===id);const pts=[];for(const fl of ['3','2']){const b=v.floors.find(f=>f.f===fl),y=(b.y0+b.y1)/2;const w=ops.filter(o=>o.id.startsWith('w'+fl)).sort((a,c)=>a.x-c.x);
  const ln=zx('a'+fl+'L').x1;for(let i=1;i<w.length;i++){const m=(w[i-1].x+w[i].x)/2;if(Math.abs(m-ln)>12)pts.push([m,y,m<ln?'a'+fl+'L':'a'+fl+'R']);}pts.push([ln-15,y,'a'+fl+'L'],[ln+15,y,'a'+fl+'R']);pts.push([v.bldg.x0+8,y,'a'+fl+'L'],[v.bldg.x1-8,y,'a'+fl+'R']);}
 {const b=v.floors.find(f=>f.f==='1'),y=b.y0+20;pts.push([v.bldg.x0+8,y,'stL'],[v.bldg.x1-8,y,'stR']);}
 const g2=await at('A',pts.map(q=>[q[0],q[1]]));pts.forEach((q,i)=>ok(g2[i]===q[2],`mixed (${Math.round(q[0])},${Math.round(q[1])}) -> ${g2[i]} (want ${q[2]})`));
 const [att]=await at('A',[[700,100]]);ok(att==='attic','mixed: cockloft band picks the cockloft');}
for(const sd of 'BCD'){const before=await p.evaluate(()=>window.__sizeup.A.scn.origin);const r=await p.evaluate(sd=>{const z=window.__sizeup;z.setSide(sd);const c=document.querySelector('#cv').getBoundingClientRect();return{cx:c.x+c.width/2,cy:c.y+c.height/2};},sd);
 await p.mouse.click(r.cx,r.cy);await p.waitForTimeout(100);const after=await p.evaluate(()=>window.__sizeup.A.scn.origin);ok(after===before,`mixed Side ${sd} (no picture): a tap changes nothing (${after})`);}
ok(!errs.length,'no page errors '+errs.join(' | '));await br.close();
console.log(`tap-room-oct26 suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})().catch(e=>{console.log(e);process.exit(1);});
