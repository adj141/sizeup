// Oct 22b glass / flashover / seepage reading (AJ). Source: FSRI-HV08 (UL, Impact of Ventilation on Fire Behavior in Legacy and Contemporary
// Residential Construction). Three changes, each with an old-behaviour switch:
//  UGLASS: every window (all floors) falls out only on a near-flashover hot layer (the Oct 14 basement rule, T >= .9) [HV08 5.7.2, Tables 9-10]
//  VFO:    a ventilation-limited room (modern contents) that gets new air flashes over 1.5-4.5 min later unless water or closing the vent stops it [HV08 8.8.4, Table 37]
//  SEEP:   gap seepage at intact glass reads Gray and at most Moderate density (it is drawn light gray). Teaching value: HV08 gives no colour/density for gap smoke.
const {chromium}=require('playwright-core');global.window={};
const BLD=require('/workspace/sizeup/src/buildings.js');const M=require('/workspace/sizeup/src/model.js');
const ld=f=>{delete require.cache[require.resolve(f)];return require(f);};const M0=ld('./base/model.pre-glass-oct22.js');
let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('  FAIL:',m);}};const sec=n=>console.log('# '+n);
const mm=t=>t==null?'--':`${Math.floor(t/60)}:${String(Math.round(t%60)).padStart(2,'0')}`;
const base={sceneId:'house',origin:'kit',fuel:'modern',preburn:210,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:10,actions:[],tNow:0,companies:M.PRESETS.generic.companies()};
const mk=(MM,b,o)=>MM.create(b,JSON.parse(JSON.stringify({...base,...o,sceneId:b.id})));
function drill(MM,b,o,T,acts=[],hook){const S=mk(MM,b,o);for(let t=0;t<=T;t++){for(const a of acts)if(a.t===t)MM.act(S,a);if(hook)hook(S,t);MM.step(S);}return S;}
const on=v=>{M.UGLASS.on=v;M.VFO.on=v;M.SEEP.on=v;};
(async()=>{
sec('switches off: identical to the live build f65045a (events, zones, readings)');
{on(false);let n=0,d=0;for(const b of [BLD.house,BLD.mixed])for(const z of b.zones)for(const fuel of ['modern','legacy']){const acts=[{t:330,kind:'open',opening:b.openings.find(o=>o.front).id}];
  const S=mk(M,b,{origin:z.id,fuel,seed:7}),S0=mk(M0,b,{origin:z.id,fuel,seed:7});for(let t=0;t<=1100;t++){for(const a of acts)if(a.t===t){M.act(S,a);M0.act(S0,a);}M.step(S);M0.step(S0);
   if(t%100===0){n++;const f=(MM,SS)=>JSON.stringify({e:SS.events.map(e=>[e.t,e.kind,e.msg]),z:Object.values(SS.z).map(q=>[q.q,q.T,q.s,q.flashed]),o:Object.values(MM.openingVis(SS)).map(v=>[v.rate,v.vol,v.vel,v.den,v.col])});if(f(M,S)!==f(M0,S0))d++;}}}
 on(true);ok(d===0,`UGLASS/VFO/SEEP off: ${n} frames identical to f65045a (${d} differ)`);}

sec("AJ's drill, closed house (kit, modern, arrival 3:30, seeds 1-30, 15 min after arrival)");
{const old={gf:[],fo:[],unb:0},nw={gf:[],fo:[],unb:0,q:[],T:[]};for(let seed=1;seed<=30;seed++){
  for(const [MM,r] of [[M0,old],[M,nw]]){const S=drill(MM,BLD.house,{seed},210+900);const f=S.events.find(e=>e.kind==='fail'&&e.zone==='kit');if(f)r.gf.push(f.t);
   const fo=S.events.find(e=>e.kind==='flashover'&&e.zone==='kit');if(fo)r.fo.push(fo.t);r.unb+=S.events.filter(e=>e.kind==='fail'&&!(S.z[e.zone].ign&&S.z[e.zone].tIgn<e.t)).length;if(MM===M){r.q.push(S.z.kit.q);r.T.push(S.z.kit.T);}}}
 console.log(`   before: kitchen glass failed ${old.gf.length}/30 (${mm(Math.min(...old.gf))}-${mm(Math.max(...old.gf))} after ignition), kitchen flashover ${old.fo.length}/30, ${old.unb} windows lost in unburned rooms`);
 console.log(`   after:  kitchen glass failed ${nw.gf.length}/30, kitchen flashover ${nw.fo.length}/30, ${nw.unb} windows lost in unburned rooms; kitchen at 18:30 q ${Math.max(...nw.q).toFixed(2)} max, T ${Math.max(...nw.T).toFixed(2)} max`);
 ok(old.gf.length>=20&&old.unb>0,`old rule: fire glass failed in ${old.gf.length}/30 at ${mm(Math.min(...old.gf))}-${mm(Math.max(...old.gf))}, ${old.unb} windows lost in unburned rooms`);
 ok(nw.gf.length===0&&nw.fo.length===0&&nw.unb===0,'new: closed house: no glass fails, no flashover (the fire stays ventilation-limited) [HV08 8.8.1-8.8.2, 9.1]');
 ok(Math.max(...nw.q)<.4&&Math.max(...nw.T)<.6,'new: closed-house kitchen fire has decayed by 15 min after arrival');}

sec('glass falls out only on a near-flashover layer (all origins, both buildings, seeds 1-6, vented at 5:30)');
{let n=0,bad=[];for(const b of [BLD.house,BLD.mixed])for(const z of b.zones)for(let seed=1;seed<=6;seed++){const fd=b.openings.find(o=>o.front).id;const prevT={};
  const S=drill(M,b,{origin:z.id,seed},210+900,[{t:330,kind:'open',opening:fd}],S=>{for(const id in S.z)prevT[id]=S.z[id].T;});
  for(const e of S.events.filter(e=>e.kind==='fail')){n++;const fz=S.z[e.zone];if(!(fz.flashed||fz.T>=.9||fz.attic))bad.push(`${b.id}/${z.id}/${seed} ${e.zone}@${e.t}`);if(!fz.ign||fz.tIgn>e.t)bad.push(`${b.id}/${z.id}/${seed} unburned ${e.zone}@${e.t}`);}}
 ok(bad.length===0,`${n} glass failures, all in burning rooms at a near-flashover layer ${bad.slice(0,3).join('; ')}`);}
{let hb=0;for(let seed=1;seed<=10;seed++){const S=mk(M,BLD.house,{seed,glass:'hold'});const fd='fd';let maxT=0;for(let t=0;t<=1110;t++){if(t===330)M.act(S,{kind:'open',opening:fd});M.step(S);
   for(const e of S.events.filter(e=>e.kind==='fail'&&e.t===S.t-1))if(S.z[e.zone].T<M.UGLASS.holdT)hb++;}}
 ok(hb===0,`"Holds": glass falls out only at T >= ${M.UGLASS.holdT} (legacy end of the HV08 range)`);}

sec('vent-induced flashover: 1.5-4.5 min after the vent [HV08 8.8.4, Table 37]');
const VD={};
for(const [lab,acts] of [['front door opened at 5:30',[{t:330,kind:'open',opening:'fd'}]],['kitchen window vented at 8:30',[{t:510,kind:'open',opening:'w1k'}]],['rear slider opened at 6:30',[{t:390,kind:'open',opening:'rd'}]]]){
 const d=[],dOld=[];let src=0,by=0;for(let seed=1;seed<=30;seed++){const S=drill(M,BLD.house,{seed},210+900,acts);const fo=S.events.find(e=>e.kind==='flashover'&&e.zone==='kit');
   if(fo){d.push(fo.t-acts[0].t);if(fo.src==='FSRI-HV08'&&fo.vfo)src++;if(fo.by)by++;}
   const S0=drill(M0,BLD.house,{seed},210+900,acts);const f0=S0.events.find(e=>e.kind==='flashover'&&e.zone==='kit');if(f0)dOld.push(f0.t-acts[0].t);}
 VD[lab]={d,dOld};const s=[...d].sort((a,b)=>a-b),s0=[...dOld].sort((a,b)=>a-b);
 console.log(`   ${lab}: after ${d.length}/30, ${mm(s[0])}-${mm(s[s.length-1])} (median ${mm(s[s.length>>1])}); before ${dOld.length}/30, ${mm(s0[0])}-${mm(s0[s0.length-1])} (median ${mm(s0[s0.length>>1])})`);
 ok(d.length===30&&s[0]>=90&&s[s.length-1]<=270,`${lab}: kitchen flashes in 30/30 seeds, ${mm(s[0])}-${mm(s[s.length-1])} after the vent`);
 ok(src===30&&by===30,`${lab}: logged as vent-induced (FSRI-HV08) with the opening that gave the air`);}
{const rows=[];for(const z of ['liv','br1','br3','br2','foy','hall2']){const d=[],nat=[];let none=0;for(let seed=1;seed<=10;seed++){const S=drill(M,BLD.house,{origin:z,seed},210+900,[{t:420,kind:'open',opening:'fd'}]);const fo=S.events.find(e=>e.kind==='flashover'&&e.zone===z);
   if(!fo)none++;else if(fo.vfo)d.push(fo.after);else nat.push(fo.t-420);}rows.push([z,d,nat,none]);
   console.log(`   ${z} (front door opened at 7:00): vent-induced ${d.length}/10${d.length?` ${mm(Math.min(...d))}-${mm(Math.max(...d))} after the air reached it`:''}; natural ${nat.length}/10${nat.length?` ${mm(Math.min(...nat))}-${mm(Math.max(...nat))} after the vent`:''}; none ${none}/10`);}
 ok(rows.every(([z,d])=>d.every(x=>x>=90&&x<=270)),'every vent-induced flashover (other rooms) 1:30-4:30 after the air reached the room');
 ok(rows.every(([z,d,nat])=>nat.every(x=>x>=60&&x<=270)),'a room the vent makes fuel-limited (front door into it) still flashes 1-4.5 min after the vent (natural model)');
 ok(rows.find(r=>r[0]==='br2')[3]===10,'Bedroom 2 behind its closed door gets no air: no flashover (HV08: the closed bedroom stayed tenable)');}
{let n=0,stop=0;for(let seed=1;seed<=30;seed++){const S=drill(M,BLD.house,{seed},210+900,[{t:330,kind:'open',opening:'fd'},{t:400,kind:'close',opening:'fd'}]);n++;if(!S.events.some(e=>e.kind==='flashover'&&e.vfo&&e.t<400+60))stop++;}
 ok(stop===n,`closing the vent again (70 s later) stops the clock: no vent-induced flashover in ${stop}/${n}`);}
{let bad=0,n=0;for(let seed=1;seed<=30;seed++){let wet=null;const S=drill(M,BLD.house,{seed},210+900,[{t:211,kind:'assign',co:'E1',task:'line',target:'kit'},{t:330,kind:'open',opening:'fd'}],S=>{if(wet==null&&S.z.kit.water>0)wet=S.t;});
  const fo=S.events.find(e=>e.kind==='flashover'&&e.zone==='kit'&&e.vfo);if(wet!=null&&wet<(fo?fo.t:1e9)){n++;if(fo&&fo.t-fo.after>=wet-1)bad++;}}
 ok(bad===0,`water on the room before the deadline cancels the clock (${n} runs with early water, ${bad} flashed on the same clock)`);}
{let v=0;for(let seed=1;seed<=30;seed++){const S=drill(M,BLD.house,{seed,fuel:'legacy'},210+900,[{t:330,kind:'open',opening:'fd'}]);if(S.events.some(e=>e.vfo))v++;}
 ok(v===0,'legacy contents keep the natural model (no vent-induced clock) [FSRI-VVR]');}
{let v=0;for(const o of ['bsmt','attic'])for(let seed=1;seed<=10;seed++){const S=drill(M,BLD.house,{origin:o,seed},210+900,[{t:330,kind:'open',opening:'fd'}]);if(S.events.some(e=>e.vfo&&(e.zone==='bsmt'||e.zone==='attic')))v++;}
 ok(v===0,'basement and attic keep their own rules');}

sec('browser: answer key, debrief, What’s New');
{const br=await chromium.launch({executablePath:'/usr/bin/google-chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await br.newPage({viewport:{width:1280,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file:///workspace/sizeup/index.html#noautoplay');await p.waitForFunction(()=>window.__sizeup&&window.__sizeup.ready);
 const r=await p.evaluate(async()=>{const z=window.__sizeup,M=z.M;const L=async a=>{await z.loadScenario({format:'sizeup-scenario',v:2,sceneId:'house',origin:'kit',fuel:'modern',preburn:210,openings:{},doors:{},occupant:'none',wind:{dir:'calm',spd:0},glass:'fails',seed:10,actions:a,tNow:0,mode:'solo',companies:M.PRESETS.generic.companies()});z.A.playing=false;};
   await L([]);z.advance(69);z.setSide('C');const k=z.truthCalls(),txt=z.smokeText();
   await L([]);z.advance(900);const closed={fo:z.A.S.events.filter(e=>e.kind==='flashover').length,fail:z.A.S.events.filter(e=>e.kind==='fail').length};
   await L([{t:330,kind:'open',opening:'fd'}]);z.advance(500);const fo=z.A.S.events.find(e=>e.kind==='flashover');const db=z.debrief?(()=>{try{const d=z.debrief();return typeof d==='string'?d:JSON.stringify(d);}catch(e){return 'ERR '+e.message;}})():'';
   return{k,txt,closed,fo:fo&&{t:fo.t,after:fo.after,by:fo.by,vfo:fo.vfo},db,V:z.VERSION,top:z.CHANGELOG[0],fx:z.CHANGELOG.find(c=>c.v!=='2026.10.22'&&/flashover/i.test(c.title+c.items.join(' ')))};});
 ok(r.k.vol===1&&r.k.vel===1&&r.k.den===1&&r.k.col==='gray',`AJ T+1:09 Side C answer key: Moderate / Moderate / Moderate / Gray (${r.k.vol}/${r.k.vel}/${r.k.den}/${r.k.col}) "${r.txt.slice(0,60)}"`);
 ok(r.closed.fo===0&&r.closed.fail===0,`closed house in the app: no glass failure, no flashover by T+15 (${JSON.stringify(r.closed)})`);
 ok(r.fo&&r.fo.vfo&&r.fo.by==='fd'&&r.fo.after>=90&&r.fo.after<=270,`front door opened at T+5:30 (scenario action times are drill time): kitchen flashes ${r.fo&&mm(r.fo.after)} later, logged with the front door`);
 ok(/Flashover after arrival[^"]*after air from Front door/i.test(r.db),`debrief names the vent before the flashover (${(r.db.match(/Flashover after arrival[^"]{0,120}/)||[''])[0]})`);
 ok(r.V===r.top.v&&r.V!=='2026.10.22'&&r.fx,`What’s New: top entry ${r.V} "${r.top.title}"; flashover entry ${r.fx&&r.fx.v} "${r.fx&&r.fx.title}"`); // Oct 26: later releases may sit above the flashover entry
 ok(!errs.length,'no page errors '+errs.join());await br.close();}
console.log(`\nglass-flashover-oct22 suite: ${pass} pass, ${fail} fail`);process.exit(fail?1:0);})();
