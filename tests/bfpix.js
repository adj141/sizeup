// helper for basement.js: mean luminance drop in the roof band above Side A's ridge, smoky frame vs a no-smoke frame
// old build: git -C sizeup-publish show 1e79062:index.html > /tmp/bd/before-index.html (the build before the basement smoke fix)
const {chromium}=require('playwright-core');const cp=require('child_process');
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});const res={};
for(const [k,url] of [['old','file:///tmp/bd/before-index.html#noautoplay'],['new','file:///workspace/sizeup/index.html#noautoplay']]){const p=await br.newPage({viewport:{width:1280,height:900}});await p.goto(url);await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);
 const shot=async t=>{await p.evaluate(async t=>{const u=window.__sizeup,M=u.M;await u.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'bsmt',fuel:'modern',preburn:t,openings:{},doors:{'kit-bsmt':'closed'},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:12345,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});u.A.playing=false;},t);await p.waitForTimeout(2500);
  const f=`/tmp/bfpix-${k}-${t}.png`;await p.locator('.slot .stage').screenshot({path:f});return f;};
 const a=await shot(5),b=await shot(210);
 res[k]=+cp.execFileSync('python3',['-c',`
from PIL import Image,ImageStat
a=Image.open('${a}').convert('L');b=Image.open('${b}').convert('L');W,H=a.size
box=(int(W*.27),int(H*.02),int(W*.65),int(H*.17)) # roof band above the ridge on Side A
print(ImageStat.Stat(a.crop(box)).mean[0]-ImageStat.Stat(b.crop(box)).mean[0])`],{encoding:'utf8'}).trim();await p.close();}
console.log(JSON.stringify(res));await br.close();})();
