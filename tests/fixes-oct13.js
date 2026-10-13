// Oct 13 fixes: smoke above the roofline from first-floor openings around the corner (item 7), Side D garage view (item 3). Run: node fixes-oct13.js
const {chromium}=require('playwright-core');const fs=require('fs'),cp=require('child_process');
global.window={};const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');
const V=eval(fs.readFileSync('/workspace/sizeup/src/visual.js','utf8')+';SizeupVisual');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('\n# '+n);
const OUT='/workspace/sizeup/screens/fixes-oct13/';const OLD='file:///workspace/sizeup-publish/index.html#noautoplay',NEW='file:///workspace/sizeup/index.html#noautoplay';
const scn=o=>({sceneId:'house',origin:o.origin||'liv',fuel:'modern',preburn:o.preburn||210,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,actions:[],tNow:0,companies:M.PRESETS.generic.companies()});
sec('model/visual: hidden-side plumes start at the floor they come from');
{const S=M.create(BLD.house,scn({}));M.run(S,450);const v=V.build(S,BLD.house,M,'D');const eaveY=BLD.house.views.D.eaves[0].y;const f1=BLD.house.views.D.floors.find(f=>f.f==='1').y0;
 const rear=v.emitters.filter(e=>e.kind==='rear'&&e.key!=='rbehind');ok(rear.length>0,'side D at 7:30 (floor 1 only): around-the-corner plumes from the floor-1 windows');
 ok(rear.every(e=>e.y>=f1-1),'all floor-1 plumes start at floor-1 height ('+rear.map(e=>Math.round(e.y)).join(',')+') not at the 2nd-floor eave ('+eaveY+')');
 const bx=BLD.house.views.D.bldg;ok(rear.every(e=>e.x<bx.x0||e.x>bx.x1),'they rise just outside the building corner, not over the roof');
 M.run(S,180);const v2=V.build(S,BLD.house,M,'D');ok(v2.emitters.some(e=>e.kind==='rear'&&e.y===eaveY),'once upper-floor windows fail (10:30) a plume at the eave is justified and drawn');
 const S0=M.create(BLD.house,scn({}));M.run(S0,250);ok(!V.build(S0,BLD.house,M,'D').emitters.some(e=>e.kind==='rear'),'4:10, nothing failed yet: no hidden-side plume at all');
 // Side A unaffected for the 'behind' plume
 const SA=M.create(BLD.house,scn({}));M.run(SA,450);ok(V.build(SA,BLD.house,M,'A').emitters.filter(e=>e.kind==='rear').every(e=>e.key==='rbehind'||e.y>=BLD.house.floors.find(f=>f.f==='1').y0-1),'side A: floor-1 plumes also start low');}
sec('Side D garage view');
{const D=BLD.house.views.D,o=BLD.house.openings;const g=id=>o.find(x=>x.id===id);ok(g('gsdD').x>600&&g('gwD').w>=100,'D: side door at the far end, wide double window');
 ok(cp.execSync('md5sum /workspace/sizeup/assets/house-c.jpg /workspace/sizeup/assets/house-d.jpg').toString().split('\n').map(l=>l.split(' ')[0]).filter(Boolean).length===2,'C and D are different files');}
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const shot=async(url,side,t,file)=>{const p=await br.newPage({viewport:{width:1280,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);
  await p.evaluate(async t=>{const u=window.__sizeup,M=u.M;await u.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'liv',fuel:'modern',preburn:t,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:5,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});u.A.playing=false;},t);
  await p.evaluate(s=>{window.__sizeup.setSide(s);window.__sizeup.syncUI();},side);await p.addStyleTag({content:'.toast{display:none!important}'});await p.waitForTimeout(3000);await p.locator('.slot .stage').screenshot({path:file});await p.close();return errs;};
 for(const [k,url] of [['before',OLD],['after',NEW]]){fs.mkdirSync(OUT+k,{recursive:true});
  ok(!(await shot(url,'D',450,`${OUT}${k}/07-sideD-smoke-450s.png`)).length,k+': no errors');await shot(url,'D',5,`${OUT}${k}/07-sideD-nosmoke.png`);await shot(url,'C',5,`${OUT}${k}/03-sideC.png`);await shot(url,'D',5,`${OUT}${k}/03-sideD.png`);}
 const lum=(a,b)=>+cp.execFileSync('python3',['-c',`
from PIL import Image,ImageStat
a=Image.open('${a}').convert('L');b=Image.open('${b}').convert('L');W,H=a.size
box=(int(W*.72),int(H*.12),int(W*.86),int(H*.30)) # sky just above the right end of the 2nd-floor roofline
print(ImageStat.Stat(b.crop(box)).mean[0]-ImageStat.Stat(a.crop(box)).mean[0])`],{encoding:'utf8'}).trim();
 const db=lum(`${OUT}before/07-sideD-smoke-450s.png`,`${OUT}before/07-sideD-nosmoke.png`),da=lum(`${OUT}after/07-sideD-smoke-450s.png`,`${OUT}after/07-sideD-nosmoke.png`);
 ok(da<db*.75,`sky above the upper-right roofline at 7:30 darkens ${db.toFixed(1)} (before) vs ${da.toFixed(1)} (after)`);
 const cd=+cp.execFileSync('python3',['-c',`
from PIL import Image,ImageChops,ImageStat
a=Image.open('${OUT}after/03-sideD.png').convert('L');b=Image.open('${OUT}before/03-sideD.png').convert('L').resize(a.size)
print(ImageStat.Stat(ImageChops.difference(a,b)).mean[0])`],{encoding:'utf8'}).trim();ok(cd>1,'Side D picture changed ('+cd.toFixed(2)+')');
 await br.close();console.log(`\nfixes-oct13 suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})();
