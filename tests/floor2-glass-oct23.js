// Oct 23 (AJ): "I tried to set a fire in the second floor room in the B/C corner and the window fail immediately" (test build 16bfacd).
// Bedroom 4 (br4, rear, B/C corner, door closed). The model never failed that glass (closed room stays ventilation-limited, T peaks ~.65),
// but the renderer darkened a smoke-filled room's INTACT pane to 15% with no frame or muntins, so it looked like a failed, open window.
// GLOOK: intact glass keeps frame, muntins and a faint sheen; the smoke stain darkens the pane to ~45% (teaching value). Glass holds until
// the room is near flashover [FSRI-HV08 5.7.2, Tables 9-10]. GLOOK.on=false restores the old picture.
const {chromium}=require('playwright-core');global.window={};
const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('# '+n);
const mm=t=>t==null?'--':`${t<0?'-':''}${Math.floor(Math.abs(t)/60)}:${String(Math.round(Math.abs(t)%60)).padStart(2,'0')}`;
const base={sceneId:'house',origin:'br4',fuel:'modern',preburn:210,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:10,actions:[],tNow:0,companies:M.PRESETS.generic.companies()};
const mk=(b,o)=>M.create(b,JSON.parse(JSON.stringify({...base,...o,sceneId:b.id})));
const above=b=>b.zones.filter(z=>!z.attic&&z.floor!=='B');
// run a drill, recording every self-failed window with the room's hot layer at that second
function run(b,o,T,acts=[]){const S=mk(b,o);const seen={},fails=[];for(let t=0;t<=T;t++){for(const a of acts)if(a.t===t)M.act(S,a);M.step(S);
  for(const id in S.o){const x=S.o[id];if(x.selfFailed&&!seen[id]){seen[id]=1;const z=S.z[x.zone];fails.push({id,zone:x.zone,t:S.t,T:z.T,fo:!!z.flashed});}}}return{S,fails};}
(async()=>{
sec('model: switches and corners');
ok(M.GLOOK&&M.GLOOK.on===true&&M.UGLASS.on===true,'GLOOK and UGLASS on by default');
{const z=BLD.house.zones.find(z=>z.id==='br4');ok(/B\/C corner/.test(z.name)&&z.floor==='2','house: Bedroom 4 is the floor-2 B/C corner room');
 const corners=['br1','br3','br4'].every(id=>BLD.house.openings.some(o=>o.zone===id&&o.type==='window'));ok(corners,'house: the corner bedrooms (A/B br1, A/D-C/D br3, B/C br4) all have windows');}

sec("AJ's case: fire in Bedroom 4, default settings, 30 seeds, arrival 0 / 3:30 / 5:00");
for(const glass of ['fails','hold'])for(const pre of [0,210,300]){let nf=0,mx=0;for(let seed=1;seed<=30;seed++){const r=run(BLD.house,{origin:'br4',glass,preburn:pre,seed},pre+900);nf+=r.fails.filter(f=>f.zone==='br4').length;mx=Math.max(mx,r.S.z.br4.T);}
 ok(nf===0,`glass ${glass}, arrival ${mm(pre)}: no Bedroom 4 window fails in 15 min (${nf}); room peak T ${mx.toFixed(2)} stays below the near-flashover level`);}

sec('every above-grade room, both buildings, closed and vented: glass falls out only on a near-flashover layer [HV08 5.7.2]');
{let n=0,bad=[],early=[];for(const b of [BLD.house,BLD.mixed])for(const z of above(b))for(const glass of ['fails','hold'])for(const pre of [0,210,300])for(const vent of [false,true])for(const seed of [1,2,3,4,5]){
  const fd=b.openings.find(o=>o.front);const acts=vent&&fd?[{t:pre,kind:'open',opening:fd.id}]:[];const r=run(b,{origin:z.id,glass,preburn:pre,seed},pre+900,acts);n++;
  const thr=glass==='hold'?M.UGLASS.holdT:M.BGLASS.fallT;
  for(const f of r.fails){if(f.T<thr-1e-9)bad.push(`${b.id}/${z.id} ${f.id} T ${f.T.toFixed(2)} (${glass}, arr ${mm(pre)}, seed ${seed}${vent?', vented':''})`);
   if(!vent&&f.t-pre<0&&f.zone===z.id&&!f.fo&&f.T<.9)early.push(f.id);}}
 if(bad.length)console.log('   ',bad.slice(0,8).join('\n    '));
 ok(bad.length===0,`${n} runs: every self-failed window had its room's hot layer at the near-flashover level or above (${bad.length} did not)`);
 ok(early.length===0,'no window is already failed at arrival in a closed room below flashover');}
{const r=run(BLD.house,{origin:'br4',seed:3,preburn:210},210+900,[{t:210,kind:'idoor',conn:'hall2-br4',state:'open'},{t:211,kind:'open',opening:'fd'}]);
 ok(r.fails.every(f=>f.T>=M.BGLASS.fallT),`Bedroom 4 with its door and the front door opened: any window that fails does so near flashover (${r.fails.map(f=>f.id+'@'+mm(f.t-210)+' T'+f.T.toFixed(2)).join(', ')||'none'})`);}

sec('picture: intact smoke-stained glass keeps its frame and muntins (does not look failed)');
const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await br.newPage({viewport:{width:1280,height:640}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file:///workspace/sizeup/index.html#noautoplay#nowhatsnew');await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);await p.addStyleTag({content:'.toast{display:none!important}'});
async function bright(origin,ops,glook,pre=300){await p.evaluate(async([o,ops,g,pre])=>{const z=window.__sizeup,M=z.M;M.GLOOK.on=g;await z.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:o,fuel:'modern',preburn:pre,openings:ops,doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:10,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});z.A.playing=false;},[origin,ops,glook,pre]);
 const out={};for(const sd of ['A','B','C','D']){const wins=await p.evaluate(([o,sd])=>{const z=window.__sizeup,M=z.M,S=z.A.S;z.setSide(sd);z.syncUI();const V=M.viewOf(S.B,sd);if(!V.has)return null;const v=M.openingVis(S);
   const r=document.querySelector('canvas').getBoundingClientRect();return{k:r.width/V.W,r:{x:r.x,y:r.y,width:r.width,height:r.height},w:V.openings.filter(x=>!x.hidden&&x.zone===o&&x.type==='window').map(x=>({id:x.id,x:x.x,y:x.y,w:x.w,h:x.h,state:S.o[x.id].state,stain:v[x.id].stain}))};},[origin,sd]);
  if(!wins||!wins.w.length)continue;await p.waitForTimeout(1200);const png=(await p.screenshot({clip:wins.r})).toString('base64');
  const fr=await p.evaluate(async([png,wins])=>{const im=new Image();im.src='data:image/png;base64,'+png;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const g=c.getContext('2d');g.drawImage(im,0,0);const k=wins.k*im.width/wins.r.width;
   return wins.w.map(w=>{const d=g.getImageData(Math.round((w.x-w.w*.4)*k),Math.round((w.y-w.h*.4)*k),Math.round(w.w*.8*k),Math.round(w.h*.8*k)).data;let b=0,n=0,su=0,s2=0;for(let i=0;i<d.length;i+=4){n++;const l=(.299*d[i]+.587*d[i+1]+.114*d[i+2])/255;su+=l;s2+=l*l;if(l>.42)b++;}const mu=su/n;const ls=[];for(let i=0;i<d.length;i+=4)ls.push((.299*d[i]+.587*d[i+1]+.114*d[i+2])/255);return{...w,fr:b/n,mu,sd:Math.sqrt(Math.max(0,s2/n-mu*mu)),ls};});},[png,wins]);
  for(const w of fr)out[sd+':'+w.id]=w;}return out;}
const rooms=above(BLD.house).filter(z=>BLD.house.openings.some(o=>o.zone===z.id&&o.type==='window')).map(z=>z.id);
for(const o of rooms){const nw=await bright(o,{},true),old=await bright(o,{},false),clean=await bright(o,{},true,1);
 for(const k in nw){const a=nw[k],b=old[k],c=clean[k];if(a.state!=='closed'||a.stain<.5)continue;
  console.log(`   ${o} ${k} stain ${a.stain.toFixed(2)}: mean ${a.mu.toFixed(2)} detail ${a.sd.toFixed(3)} | before ${b.mu.toFixed(2)}/${b.sd.toFixed(3)} | unburned ${c.mu.toFixed(2)}/${c.sd.toFixed(3)}`);
  ok(a.sd>=.55*c.sd&&a.mu>=.4*c.mu,`${o} ${k}: intact smoke-stained glass keeps the window's detail (${(a.sd/c.sd*100).toFixed(0)}% of unburned contrast, ${(a.mu/c.mu*100).toFixed(0)}% brightness; before ${(b.sd/c.sd*100).toFixed(0)}% / ${(b.mu/c.mu*100).toFixed(0)}%)`);}}
{const corr=(x,y)=>{const n=Math.min(x.length,y.length);let mx=0,my=0;for(let i=0;i<n;i++){mx+=x[i];my+=y[i];}mx/=n;my/=n;let sxy=0,sx=0,sy=0;for(let i=0;i<n;i++){const a=x[i]-mx,b=y[i]-my;sxy+=a*b;sx+=a*a;sy+=b*b;}return sxy/Math.sqrt(sx*sy||1);};
 const nw=await bright('br4',{},true),fl=await bright('br4',{w2s:'failed',w2b4:'failed'},true),cl=await bright('br4',{},true,1);
 for(const k of ['C:w2s','B:w2b4']){const a=nw[k],b=fl[k],c=cl[k];const ci=corr(a.ls,c.ls),cf=corr(b.ls,c.ls);console.log(`   ${k}: pattern match with the unburned window: intact ${ci.toFixed(2)}, failed ${cf.toFixed(2)}`);
  ok(a.state==='closed'&&b.state==='failed'&&ci>.6&&ci-cf>.25,`${k}: the intact window still looks like the window (pattern match ${ci.toFixed(2)}); a failed one does not (${cf.toFixed(2)})`);}}
await p.evaluate(()=>{window.__sizeup.M.GLOOK.on=true;});
ok(!errs.length,'no page errors '+errs.join());await br.close();
console.log(`floor2-glass-oct23 suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})().catch(e=>{console.log(e);process.exit(1);});
