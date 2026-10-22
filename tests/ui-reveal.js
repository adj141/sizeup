// Oct 21 iOS redesign: controls live on drill tabs, bottom sheets and setup detail pages.
// Before a test taps, types or picks, reveal the tab/sheet/page that holds the control, as a user would tap the tab first.
// Builds without the helper (older baselines) are unaffected.
module.exports=function patch(br){const np=br.newPage.bind(br);br.newPage=async o=>{const p=await np(o);
  const rv=s=>typeof s==='string'?p.evaluate(s=>{const u=window.__sizeup;return u&&u.reveal?u.reveal(s):false;},s).catch(()=>false):null;
  for(const f of ['click','fill','selectOption','check','tap']){const g=p[f].bind(p);p[f]=async(s,...a)=>{await rv(s);return g(s,...a);};}
  return p;};return br;};
