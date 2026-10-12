const {chromium}=require('playwright-core');const OUT=process.argv[2];
(async()=>{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await br.newPage({viewport:{width:1280,height:900}});await p.goto('file:///workspace/sizeup/index.html#noautoplay');await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);
await p.addStyleTag({content:'.toast{display:none!important}'});
for(const stair of ['closed','open'])for(const t of [120,210,300]){
 await p.evaluate(async([stair,t])=>{const u=window.__sizeup,M=u.M;await u.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'bsmt',fuel:'modern',preburn:t,openings:{},doors:{'kit-bsmt':stair},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:12345,actions:[],tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});u.A.playing=false;},[stair,t]);
 for(const side of ['A','C']){await p.evaluate(s=>{const u=window.__sizeup;u.A.S.walked={A:0,B:0,C:0,D:0,...u.A.S.walked};u.setSide(s);u.A.playing=false;},side);
  // setSide may charge walk time; log the clock actually shown
  await p.waitForTimeout(2500);const T=await p.evaluate(()=>window.__sizeup.A.S.t);await p.locator('.slot .stage').screenshot({path:`${OUT}stair-${stair}-t${t}-side${side}.png`});console.log(stair,t,side,'model t',T);}}
await br.close();})();
