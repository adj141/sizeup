/* SizeUp WebGL renderer: photo + albedo-lit fire glow + window interiors + noise-textured smoke particles + procedural flames.
   Everything is procedural (no external textures needed) so it works offline. */
const SizeupRender=(()=>{
'use strict';
const rand=(a,b)=>a+Math.random()*(b-a);
function makeNoise(N){// tileable value-noise FBM in 4 channels
  const lat=(f,seed)=>{const g=new Float32Array(f*f);let s=seed;for(let i=0;i<g.length;i++){s=(s*1664525+1013904223)>>>0;g[i]=s/4294967296;}return g;};
  const sm=t=>t*t*(3-2*t);
  function vn(f,seed){const g=lat(f,seed),out=new Float32Array(N*N);for(let y=0;y<N;y++)for(let x=0;x<N;x++){const fx=x/N*f,fy=y/N*f,ix=Math.floor(fx),iy=Math.floor(fy),tx=sm(fx-ix),ty=sm(fy-iy);
    const a=g[(iy%f)*f+ix%f],b=g[(iy%f)*f+(ix+1)%f],c=g[((iy+1)%f)*f+ix%f],d=g[((iy+1)%f)*f+(ix+1)%f];out[y*N+x]=(a+(b-a)*tx)*(1-ty)+(c+(d-c)*tx)*ty;}return out;}
  function fbm(f0,oct,seed,billow){const acc=new Float32Array(N*N);let amp=.5,tot=0;for(let o=0;o<oct;o++){const v=vn(f0<<o,seed+o*977);for(let i=0;i<acc.length;i++){let n=v[i];if(billow)n=1-Math.abs(n*2-1);acc[i]+=n*amp;}tot+=amp;amp*=.5;}for(let i=0;i<acc.length;i++)acc[i]/=tot;return acc;}
  const ch=[fbm(4,5,11,false),fbm(8,4,23,false),fbm(4,5,37,true),fbm(16,3,51,false)];
  const px=new Uint8Array(N*N*4);for(let c=0;c<4;c++){let mn=1,mx=0;for(const v of ch[c]){mn=Math.min(mn,v);mx=Math.max(mx,v);}for(let i=0;i<N*N;i++)px[i*4+c]=Math.round((ch[c][i]-mn)/(mx-mn)*255);}
  return px;}
const VS_PHOTO=`attribute vec2 a;uniform vec4 u_view;varying vec2 v;void main(){v=a;gl_Position=vec4((u_view.xy+a*u_view.zw)*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);}`;
const FS_PHOTO=`precision mediump float;varying vec2 v;uniform sampler2D u_img,u_noise;uniform vec2 u_size;uniform float u_time,u_dim,u_gk,u_fog,u_flood;uniform vec3 u_amb,u_fogc;
uniform vec4 u_L[8];uniform vec4 u_W[24];uniform vec4 u_WP[24];uniform int u_nL,u_nW;
void main(){vec2 p=v*u_size;vec3 base=texture2D(u_img,v).rgb;vec3 col=base*u_amb*(1.-u_dim);
 col+=base*vec3(.86,.9,1.)*u_flood*(.25+.75*smoothstep(.2,1.,v.y)); // apparatus scene lighting, strongest low on the facade
 vec3 light=vec3(0.);
 for(int i=0;i<8;i++){if(i>=u_nL)break;vec4 L=u_L[i];vec2 d=(p-L.xy)/L.z;d.y*=d.y<0.?.75:1.25;float r2=dot(d,d);float fl=.82+.18*sin(u_time*11.+float(i)*3.1)*sin(u_time*6.3+float(i));light+=vec3(1.,.42,.12)*L.w*fl/(1.+r2*12.)*smoothstep(1.6,0.,r2);}
 col+=base*light*1.1*u_gk+light*.02*u_gk*u_gk; // fire light on the facade reads much stronger after dark
 for(int i=0;i<24;i++){if(i>=u_nW)break;vec4 R=u_W[i];vec4 P=u_WP[i];if(P.z<.5||P.x<.25)continue;
   // soot/heat staining on the wall above a vented, burning opening
   vec2 s=(p-vec2(R.x,R.y-R.w*.5))/vec2(R.z*.5,R.w);float up=-s.y;if(up<-.05||up>2.2)continue;
   float spread=1.+up*.55;float sn=texture2D(u_noise,vec2(s.x*.25+P.w,up*.3)).r;
   float soot=(1.-smoothstep(.55*spread,1.05*spread,abs(s.x)+(sn-.5)*.5))*smoothstep(2.2,.2,up+(sn-.5)*.6)*smoothstep(-.05,.08,up);
   col*=1.-clamp(soot*min(1.,P.x)*.72,0.,.8);}
 for(int i=0;i<24;i++){if(i>=u_nW)break;vec4 R=u_W[i];vec4 P=u_WP[i];vec2 q=(p-R.xy)/(R.zw*.5);if(abs(q.x)>1.||abs(q.y)>1.)continue;
   // P: x=glow y=stain z=broken w=seed
   float n=texture2D(u_noise,vec2(q.x*.16+P.w,q.y*.22-u_time*.28)).r;float n2=texture2D(u_noise,vec2(q.x*.35+P.w*1.7,q.y*.45-u_time*.8)).g;
   float fl=.8+.2*sin(u_time*9.+P.w*20.)*sin(u_time*5.7+P.w*7.);
   float yb=q.y*.5+.5; // 0 top .. 1 bottom
   float g=clamp(P.x,0.,1.2);
   // interior seen through the opening, split at the neutral plane: hot smoke (and rolling flame) above, the room and incoming air below
   float np=mix(.58,.44,clamp(g,0.,1.));
   float n3=texture2D(u_noise,vec2(q.x*.7+P.w*3.1,q.y*.9-u_time*1.4)).a;
   float lit=smoothstep(np-.3,np,yb);
   vec3 upper=mix(vec3(.035,.028,.024),vec3(.42,.15,.04),clamp(n*g*.55+lit*g*.55,0.,1.))*fl;
   upper+=vec3(1.,.5,.12)*clamp(g-.75,0.,.6)*smoothstep(.45,.8,n2*.7+n3*.3+lit*.25)*1.1*fl;
   float floorGlow=smoothstep(np,1.,yb);
   vec3 lower=vec3(.05,.035,.03)+vec3(.62,.24,.06)*g*(.18+.5*floorGlow)*(.55+.45*n2)*fl;
   lower+=vec3(1.,.55,.15)*clamp(g-.9,0.,.5)*smoothstep(.82,1.,yb+(n3-.5)*.25)*.9;
   float m=smoothstep(np-.05,np+.05,yb+(n-.5)*.1);
   vec3 room=mix(upper,lower,m);
   vec3 inside;
   if(P.z>.5)inside=mix(vec3(.03,.025,.02),room,clamp(g*1.4+.25,0.,1.));
   else{vec3 glass=base*(u_amb+u_flood*.4)*(1.-P.y*.85)+light*.18*u_gk;vec3 behind=mix(upper,lower,m)*.8;inside=mix(glass,behind+glass*.12,clamp(g*.75*(1.-P.y*.5),0.,1.));}
   float edge=smoothstep(1.,.9,max(abs(q.x),abs(q.y)));col=mix(col,inside,edge);}

 // fog / precipitation haze: scatters the fire glow into a halo
 float fg=u_fog*(.8+.2*(1.-v.y));col=mix(col,u_fogc+light*.35*u_gk,fg);
 gl_FragColor=vec4(col,1.);}`;
const VS_P=`attribute vec2 a_pos;attribute vec2 a_uv;attribute vec4 a_col;attribute vec3 a_p;uniform vec4 u_view;uniform vec2 u_size;varying vec2 v_uv;varying vec4 v_col;varying vec3 v_p;
void main(){v_uv=a_uv;v_col=a_col;v_p=a_p;vec2 n=a_pos/u_size;gl_Position=vec4((u_view.xy+n*u_view.zw)*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);}`;
const FS_SMOKE=`precision mediump float;varying vec2 v_uv;varying vec4 v_col;varying vec3 v_p;uniform sampler2D u_noise;uniform float u_time,u_sfog;uniform vec3 u_samb,u_fogc;
float D(vec2 b,float ev){float d1=texture2D(u_noise,b+vec2(ev*.03,-ev*.05)).b;float d2=texture2D(u_noise,b*2.6+vec2(-ev*.05,ev*.02)+d1*.18).b;float d3=texture2D(u_noise,b*5.3+d2*.1).r;return d1*.55+d2*.3+d3*.15;}
void main(){float r=length(v_uv);if(r>1.)discard;
 float ev=v_p.y;vec2 b=v_uv*.42+vec2(v_p.x*3.1,v_p.x*1.37);
 float d=D(b,ev);
 float fall=1.-smoothstep(.2,1.,r);
 float body=d*.9+fall*.75-.62;
 float dens=smoothstep(.0,.22,body)*smoothstep(1.,.75,r);
 vec2 L=vec2(-.06,-.10);float dl=D(b+L,ev)*.9+(1.-smoothstep(.2,1.,length(v_uv+L*2.4)))*.75-.62;
 float lit=clamp(.5+(body-dl)*3.2,0.,1.);
 float top=clamp(-v_uv.y*.5+.5,0.,1.);
 vec3 c=v_col.rgb*(.42+.95*lit)*(.85+.3*top);
 c+=vec3(.08)*lit*top*(1.-dot(v_col.rgb,vec3(.33))); // sky light catching the tops of dark billows
 c*=u_samb; // ambient light: at night smoke colour is hard to read without scene lighting
 c+=vec3(.9,.38,.1)*v_p.z*.55*smoothstep(-.2,1.,v_uv.y)*lit; // under-lit by the fire
 c=mix(c,u_fogc,u_sfog);
 float a=dens*v_col.a*(1.-u_sfog*.45);gl_FragColor=vec4(c*a,a);}`;
const FS_FIRE=`precision mediump float;varying vec2 v_uv;varying vec4 v_col;varying vec3 v_p;uniform sampler2D u_noise;uniform float u_time;
// quad: base at the neutral plane inside the opening; hv = fraction of quad height that is inside the opening (base..head); ow = opening half-width in quad units
void main(){vec2 uv=v_uv;float h=clamp(uv.y,0.,1.);
 float I=v_col.r,seed=v_col.g,lean=v_col.b,asp=v_col.a;float hv=clamp(v_p.x,0.,.9);float ow=v_p.y>0.?v_p.y:.5;
 float t=u_time;float above=clamp((h-hv)/(1.-hv),0.,1.);
 float x=uv.x-lean*above*above*1.2;
 vec2 q=vec2(x*.5*asp,h);
 float w1=texture2D(u_noise,vec2(q.x*.3+seed,q.y*.35-t*.35)).r;
 vec2 qw=q+vec2((w1-.5)*.35,0.);
 float n1=texture2D(u_noise,vec2(qw.x*.45+seed*1.3,qw.y*.55-t*.9)).g;
 float n2=texture2D(u_noise,vec2(qw.x*1.1+seed*.7,qw.y*1.25-t*1.9)).a;
 float n=n1*.68+n2*.32;
 // width: held by the jambs inside the opening, rolls out wider over the head, then tapers as it licks up the wall
 float roll=smoothstep(0.,.18,above);
 float width=h<hv?ow*.97:mix(ow*1.05,ow*1.7,roll)*(1.-.78*pow(above,1.25));
 float xo=x+(n-.5)*(.18+1.2*above)*(h<hv?.4:1.)+(n2-.5)*.15*above;
 float side=1.-smoothstep(width*.45,width,abs(xo));
 if(h<hv)side*=1.-smoothstep(ow*.9,ow,abs(x));
 float vert=1.-smoothstep(.2,1.,above+(.5-n)*.7+(.5-n2)*.25);
 float f=side*vert;
 f*=smoothstep(.12,.55,n*.85+.12*n2+.48*(1.-above));
 // inside the opening: little flame near the neutral plane, building to the head (fire rolls out of the top of the opening)
 f*=h<hv?pow(smoothstep(0.,hv,h),2.2)*smoothstep(.25,.7,n+h/hv*.4):1.;
 f=clamp(f*I,0.,1.3);
 float core=smoothstep(.55,1.05,f);
 vec3 col=mix(vec3(.55,.08,.01),vec3(1.,.42,.05),smoothstep(.05,.5,f));col=mix(col,vec3(1.,.78,.4),core*.7);
 float a=smoothstep(.02,.25,f);
 gl_FragColor=vec4(col*a*(.5+.6*f),0.);}`;
function compile(gl,vs,fs){const p=gl.createProgram();for(const[t,s]of[[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const sh=gl.createShader(t);gl.shaderSource(sh,s);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(sh));gl.attachShader(p,sh);}
  gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));const u={},a={};
  const nu=gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);for(let i=0;i<nu;i++){const inf=gl.getActiveUniform(p,i);const n=inf.name.replace(/\[0\]$/,'');u[n]=gl.getUniformLocation(p,inf.name);}
  const na=gl.getProgramParameter(p,gl.ACTIVE_ATTRIBUTES);for(let i=0;i<na;i++){const inf=gl.getActiveAttrib(p,i);a[inf.name]=gl.getAttribLocation(p,inf.name);}return{p,u,a};}
function create(canvas){
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:true});
  if(!gl)return null;
  const P={photo:compile(gl,VS_PHOTO,FS_PHOTO),smoke:compile(gl,VS_P,FS_SMOKE),fire:compile(gl,VS_P,FS_FIRE)};
  const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);
  const NN=256,noise=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,noise);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,NN,NN,0,gl.RGBA,gl.UNSIGNED_BYTE,makeNoise(NN));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);
  const img=gl.createTexture();let W=1,H=1;
  const MAXP=1400,FL=13,vb=new Float32Array(MAXP*6*FL),pbuf=gl.createBuffer();
  const R={gl,canvas,smoke:[],time:0,acc:{},em:{},vis:null};
  R.setImage=(src,w,h)=>{W=w;H=h;gl.bindTexture(gl.TEXTURE_2D,img);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,src);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);R.smoke=[];R.acc={};R.em={};};
  R.clear=()=>{R.smoke=[];R.acc={};R.em={};};
  /* ---- particle simulation (scene pixel units) ---- */
  function emit(src,U,wind){if(R.smoke.length>=MAXP)return;const vel=src.vel,den=src.den;const w=src.w;
    const x=src.x+rand(-.45,.45)*w,y=src.y+rand(0,1)*(src.hgt||0);
    const VT=src.kind==='vent';// Oct 19: attic soffit/ridge vent wisp: narrow source, small puffs that widen only a little as they rise
    const rise=[16,28,42,55][vel]*U*(src.kind==='roof'?1.4:src.kind==='leak'||VT?1.5:1);const burst=VT?[0,10,20,30][vel]*U:[0,25,80,120][vel]*U;
    const life=(VT?rand(4.2,6.2):src.kind==='eave'||src.kind==='leak'?rand(3,5.5):rand(4.5,8))*(vel===0?1.25:1);
    const s0=VT?rand(14,20)*U:Math.max((src.kind==='leak'?9:14)*U,w*(src.kind==='eave'||src.kind==='leak'?.35:.75))*rand(.8,1.2),s1=VT?s0*rand(2,2.5)+(44+src.vol*16)*U:s0*rand(2.2,3)+(70+src.vol*45)*U*(src.kind==='leak'?.5:1);
    const shade=rand(.88,1.08);const rgb=src.rgb.map(c=>Math.min(255,c*shade)/255);
    R.smoke.push({x,y,vx:rand(-6,6)*U*(VT?.4:1)+(src.side||0)*burst*.25,vy:-rise-burst*rand(.5,1),rise,age:0,life,s0,s1,a:[.28,.5,.72,.92][den]*(src.alpha||1),turb:[4,10,18,40][vel]*U,ph:rand(0,99),rot:rand(0,6.28),vr:rand(-.25,.25)*(vel===3?2.5:1),
      rgb,seed:rand(0,1),glow:src.glow||0,wind:wind*U,ev:rand(0,10),evr:[.18,.3,.45,.8][vel],cool:src.cool==null?.35:src.cool});}
  R.update=(dt,vis)=>{R.time+=dt;R.vis=vis;if(!vis)return;const U=H/800,wind=vis.wind||0;
    vis.emitters.forEach((s,i)=>{if(s.rate<=0)return;const k='e'+(s.key||i);
      /* De-synced, irregular spawning for EVERY emitter (Oct 9 rework): each emitter gets its own random starting counter, its own
         rate offset (±25%), slow incommensurate "gusts", and a random interval between puffs (threshold 0.35–1.65 instead of a fixed 1),
         so neighbouring emitters never puff in lockstep. Visual only; the model is unchanged. */
      let st=R.em[k];if(!st){st=R.em[k]={acc:Math.random(),thr:rand(.35,1.65),j:rand(.75,1.25),f1:rand(.25,.6),f2:rand(.9,1.7),p1:rand(0,6.3),p2:rand(0,6.3)};}
      const gust=1+.28*Math.sin(R.time*st.f1+st.p1)+.16*Math.sin(R.time*st.f2+st.p2);let r=s.rate*st.j*gust;
      if(s.pulse){/* irregular breathing, not a metronome: two incommensurate cycles; 'attic' = ventilation-limited attic [FSRI-ATTIC], 1 = starved room [FSRI-VVR] */
        const b=.5+.3*Math.sin(R.time*(s.pulse==='attic'?1.1:1.7)*st.f2+st.p1)+.2*Math.sin(R.time*.53*st.f2+st.p2*1.7);r*=.2+1.3*Math.max(0,b)*Math.max(0,b);}
      st.acc+=r*dt;while(st.acc>=st.thr){st.acc-=st.thr;st.thr=rand(.35,1.65);emit(s,U,wind);}});
    const sm=R.smoke;for(let i=sm.length-1;i>=0;i--){const p=sm[i];p.age+=dt;if(p.age>=p.life){sm[i]=sm[sm.length-1];sm.pop();continue;}const k=p.age/p.life;
      p.vy+=(-p.rise*(1-k*.4)-p.vy)*Math.min(1,dt*1.3);p.vx+=(p.wind*(.3+k*1.2)-p.vx)*Math.min(1,dt*.8);
      p.x+=(p.vx+Math.sin(p.y*.02/U+R.time*1.7+p.ph)*p.turb*(.4+k))*dt;p.y+=p.vy*dt;p.rot+=p.vr*dt;p.ev+=p.evr*dt;}};
  R.prewarm=(sec,vis)=>{for(let t=0;t<sec;t+=1/30)R.update(1/30,vis);};
  /* ---- draw ---- */
  R.draw=(view,dpr,opt={})=>{// view: {x,y,w,h} in CSS px inside the canvas
    const cw=canvas.width,ch=canvas.height;gl.viewport(0,0,cw,ch);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);
    const vw=[view.x*dpr/cw,view.y*dpr/ch,view.w*dpr/cw,view.h*dpr/ch];const vis=R.vis;const t=R.time;
    // photo pass
    let pr=P.photo;gl.useProgram(pr.p);gl.disable(gl.BLEND);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(pr.a.a);gl.vertexAttribPointer(pr.a.a,2,gl.FLOAT,false,0,0);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,img);gl.uniform1i(pr.u.u_img,0);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,noise);gl.uniform1i(pr.u.u_noise,1);
    gl.uniform4fv(pr.u.u_view,vw);gl.uniform2f(pr.u.u_size,W,H);gl.uniform1f(pr.u.u_time,t);
    const L=new Float32Array(32),Wd=new Float32Array(96),WP=new Float32Array(96);let nL=0,nW=0,dim=0;
    if(vis){(vis.lights||[]).slice(0,8).forEach((l,i)=>{L.set([l.x,l.y,l.r,l.i],i*4);nL++;});(vis.windows||[]).slice(0,24).forEach((w,i)=>{Wd.set([w.x,w.y,w.w,w.h],i*4);WP.set([w.glow,w.stain,w.broken?1:0,w.seed],i*4);nW++;});dim=vis.dim||0;}
    gl.uniform4fv(pr.u.u_L,L);gl.uniform4fv(pr.u.u_W,Wd);gl.uniform4fv(pr.u.u_WP,WP);gl.uniform1i(pr.u.u_nL,nL);gl.uniform1i(pr.u.u_nW,nW);gl.uniform1f(pr.u.u_dim,dim);
    const E=(vis&&vis.env)||{};gl.uniform3fv(pr.u.u_amb,E.amb||[1,1,1]);gl.uniform1f(pr.u.u_gk,E.gk||1);gl.uniform1f(pr.u.u_fog,E.fog||0);gl.uniform3fv(pr.u.u_fogc,E.fogc||[.7,.72,.75]);gl.uniform1f(pr.u.u_flood,E.flood||0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    if(!vis)return;
    // Oct 19: clip smoke and flames to the photo (never draw over the letterbox bars around a letterboxed picture)
    gl.enable(gl.SCISSOR_TEST);gl.scissor(Math.round(view.x*dpr),Math.round(ch-(view.y+view.h)*dpr),Math.round(view.w*dpr),Math.round(view.h*dpr));
    // smoke particles (premultiplied alpha), sorted: older (higher) first so fresh dense smoke sits in front at the opening
    const EV=vis.env||{};const LT=vis.lights||[];const U=H/800;let n=0;const sm=R.smoke.slice().sort((a,b)=>b.age/b.life-a.age/a.life);
    for(const p of sm){const k=p.age/p.life;const sz=(p.s0+(p.s1-p.s0)*Math.sqrt(k))*.5;const a=p.a*Math.min(1,k/.12)*(k>.3?Math.pow((1-k)/.7,1.5):1);if(a<.01)continue;
      const fade=Math.min(1,k*p.cool*2.2);const g=[.47,.46,.45];const c=p.rgb.map((v,j)=>v+(g[j]-v)*fade*.45);
      let glow=p.glow*Math.max(0,1-k*3.5);if(EV.ug>0&&LT.length){let li=0;for(const l of LT){const dx=p.x-l.x,dy=p.y-l.y;const d2=(dx*dx+dy*dy)/(l.r*l.r*6);li+=l.i/(1+d2*3);}glow+=Math.min(1.7,li*EV.ug);}
      const cs=Math.cos(p.rot)*sz,sn=Math.sin(p.rot)*sz;const corners=[[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]];
      for(const[u,v]of corners){const o=n*FL;vb[o]=p.x+u*cs-v*sn;vb[o+1]=p.y+u*sn+v*cs;vb[o+2]=u;vb[o+3]=v;vb[o+4]=c[0];vb[o+5]=c[1];vb[o+6]=c[2];vb[o+7]=a;vb[o+8]=p.seed;vb[o+9]=p.ev;vb[o+10]=glow;n++;}}
    const drawBatch=(prog,count)=>{gl.useProgram(prog.p);gl.bindBuffer(gl.ARRAY_BUFFER,pbuf);gl.bufferData(gl.ARRAY_BUFFER,vb.subarray(0,count*FL),gl.DYNAMIC_DRAW);const S=FL*4;
      gl.enableVertexAttribArray(prog.a.a_pos);gl.vertexAttribPointer(prog.a.a_pos,2,gl.FLOAT,false,S,0);gl.enableVertexAttribArray(prog.a.a_uv);gl.vertexAttribPointer(prog.a.a_uv,2,gl.FLOAT,false,S,8);
      gl.enableVertexAttribArray(prog.a.a_col);gl.vertexAttribPointer(prog.a.a_col,4,gl.FLOAT,false,S,16);gl.enableVertexAttribArray(prog.a.a_p);gl.vertexAttribPointer(prog.a.a_p,3,gl.FLOAT,false,S,32);
      gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,noise);gl.uniform1i(prog.u.u_noise,1);if(prog.u.u_samb){const E=vis.env||{};gl.uniform3fv(prog.u.u_samb,E.samb||[1,1,1]);gl.uniform1f(prog.u.u_sfog,E.sfog||0);gl.uniform3fv(prog.u.u_fogc,E.fogc||[.7,.72,.75]);}gl.uniform4fv(prog.u.u_view,vw);gl.uniform2f(prog.u.u_size,W,H);gl.uniform1f(prog.u.u_time,t);gl.drawArrays(gl.TRIANGLES,0,count);};
    // fire quads (additive). Built first so smoke can be split into behind/in-front sets.
    const fires=vis.flames||[];
    gl.enable(gl.BLEND);
    // draw smoke that is behind the flames (older), then flames, then the young smoke in front of the opening
    if(n){gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);drawBatch(P.smoke,n);}
    if(fires.length){let m=0;for(const f of fires){const w=f.w*.5,h=f.h;const c=[[-1,0],[1,0],[-1,1],[-1,1],[1,0],[1,1]];
        for(const[u,v]of c){const o=m*FL;vb[o]=f.x+u*w*1.6*(1+v*.2*(f.hv?0:1))+ (f.lean||0)*v*h*.3;vb[o+1]=f.y-v*h;vb[o+2]=u*1.0;vb[o+3]=v;vb[o+4]=f.i;vb[o+5]=f.seed;vb[o+6]=f.lean||0;vb[o+7]=f.asp||1;vb[o+8]=f.hv||0;vb[o+9]=f.ow||.5;vb[o+10]=0;m++;}}
      gl.blendFunc(gl.ONE,gl.ONE);drawBatch(P.fire,m);}
    gl.disable(gl.BLEND);gl.disable(gl.SCISSOR_TEST);};
  R.count=()=>R.smoke.length;
  return R;}
return{create};})();
