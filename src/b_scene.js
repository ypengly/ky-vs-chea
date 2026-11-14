(function(){
'use strict';
const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const damp=(a,b,r,dt)=>a+(b-a)*(1-Math.exp(-r*dt));
const rnd=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const TAU=Math.PI*2;
const angDiff=(a,b)=>{let d=(b-a)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d;};
const isMobile=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&innerWidth<1100);

/* ---------- settings ---------- */
const DEF={diff:'normal',rounds:3,roundTime:120,vol:0.7,sfx:true,shake:true,quality:isMobile?'low':'high',touch:'auto',pick:'KY'};
const S=Object.assign({},DEF);
try{Object.assign(S,JSON.parse(localStorage.getItem('kycs')||'{}'))}catch(e){}
const saveS=()=>{try{localStorage.setItem('kycs',JSON.stringify(S))}catch(e){}};

/* ---------- audio (all synthesized) ---------- */
const Snd={ctx:null,out:null,ready:false,
 init(){ if(this.ready){this.resume();return;} try{
  const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
  const c=this.ctx=new AC(); this.out=c.createGain(); this.out.gain.value=S.sfx?S.vol:0;
  const comp=c.createDynamicsCompressor(); this.out.connect(comp); comp.connect(c.destination);
  const b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0); for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1; this.nb=b;
  const s=c.createBufferSource(); s.buffer=b; s.loop=true; const f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=650; f.Q.value=.35;
  const g=c.createGain(); g.gain.value=.05; s.connect(f); f.connect(g); g.connect(this.out); s.start(); this.cg=g; this.ready=true;
 }catch(e){} },
 resume(){ try{ if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume(); }catch(e){} },
 setVol(){ if(this.out)this.out.gain.value=S.sfx?S.vol:0; },
 swell(a,dur){ if(!this.ready)return; const g=this.cg.gain,t=this.ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value,t); g.linearRampToValueAtTime(.05+a*.13,t+.12); g.linearRampToValueAtTime(.05,t+dur); },
 tone(f,d,type,v,slide,delay){ if(!this.ready)return; const c=this.ctx,t=c.currentTime+(delay||0),o=c.createOscillator(),g=c.createGain();
  o.type=type||'sine'; o.frequency.setValueAtTime(f,t); if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+d);
  g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0008,t+d); o.connect(g); g.connect(this.out); o.start(t); o.stop(t+d+.02); },
 noise(d,v,freq,type,delay,q){ if(!this.ready)return; const c=this.ctx,t=c.currentTime+(delay||0),s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();
  s.buffer=this.nb; f.type=type||'lowpass'; f.frequency.value=freq; f.Q.value=q||1; g.gain.setValueAtTime(v,t); g.gain.exponentialRampToValueAtTime(.0008,t+d);
  s.connect(f); f.connect(g); g.connect(this.out); s.start(t,Math.random()); s.stop(t+d+.02); },
 punch(p){ this.noise(.13,.55+.4*p,350+(1-p)*900,'lowpass'); this.tone(110-p*45,.2,'sine',.7+.3*p,-60); if(p>.6)this.tone(55,.35,'sine',.8,-20); },
 whoosh(p){ this.noise(.16,.1+.08*p,1400+p*800,'bandpass',0,.8); },
 block(){ this.noise(.09,.45,1800,'bandpass',0,2); this.tone(220,.07,'square',.1,-80); },
 miss(){ this.noise(.1,.06,2400,'highpass'); },
 bell(n){ for(let i=0;i<n;i++){ [1,2.76,5.4,8.9].forEach((m,j)=>this.tone(560*m,1.3,'sine',.22/(j+1),0,i*.32)); } },
 beep(){ this.tone(880,.12,'square',.14); },
 ko(){ this.tone(70,.9,'sawtooth',.5,-40); this.noise(.6,.5,400,'lowpass'); },
 heavy(){ this.tone(48,.7,'sine',1,-18); this.noise(.35,.7,260,'lowpass'); this.tone(900,.25,'sawtooth',.06,-600); },
 charge(){ this.tone(120,.6,'sawtooth',.14,500); },
 ui(){ this.tone(660,.06,'triangle',.12); }
};

/* ---------- renderer / scene ---------- */
const canvas=$('gl'); let renderer;
try{
 renderer=new THREE.WebGLRenderer({canvas,antialias:!isMobile,powerPreference:'high-performance'});
}catch(e){ $('boot').textContent='WebGL is not available in this browser.'; throw e; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,S.quality==='low'?1.25:2));
renderer.shadowMap.enabled=S.quality!=='low'; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputEncoding=THREE.sRGBEncoding; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.82;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x05060b); scene.fog=new THREE.FogExp2(0x05060b,.012);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,120);
const RING_Y=.96, HALF=3.0;
function canvasTex(w,h,draw,rep){ const c=document.createElement('canvas'); c.width=w; c.height=h; const x=c.getContext('2d'); draw(x,w,h); const t=new THREE.CanvasTexture(c); t.encoding=THREE.sRGBEncoding; t.anisotropy=4; if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping; t.repeat.set(rep[0],rep[1]);} return t; }
const stdMat=(c,r,m,extra)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:r==null?.7:r,metalness:m||0},extra||{}));
function box(w,h,d,m,x,y,z,parent){ const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m); b.position.set(x,y,z); b.castShadow=true; b.receiveShadow=true; (parent||scene).add(b); return b; }

/* lights */
scene.add(new THREE.HemisphereLight(0x9fb4ff,0x1a1022,.32));
const sun=new THREE.DirectionalLight(0xfff1dd,.62); sun.position.set(3,14,5); sun.target.position.set(0,RING_Y,0); scene.add(sun,sun.target);
sun.castShadow=renderer.shadowMap.enabled; sun.shadow.mapSize.set(1024,1024); const sc=sun.shadow.camera; sc.left=-5;sc.right=5;sc.top=5;sc.bottom=-5;sc.near=4;sc.far=30; sun.shadow.bias=-.0004; sun.shadow.radius=3;
const spots=[]; [[-5,11,-5],[5,11,-5],[-5,11,5],[5,11,5]].forEach((p,i)=>{
 const s=new THREE.SpotLight(0xfff4e0,.5,0,.5,.65,1); s.position.set(...p); s.target.position.set(0,RING_Y,0); scene.add(s,s.target); spots.push(s); });
const rimB=new THREE.PointLight(0x2f7bff,.8,14); rimB.position.set(-6,3.5,0); scene.add(rimB);
const rimR=new THREE.PointLight(0xff3d4d,.8,14); rimR.position.set(6,3.5,0); scene.add(rimR);

/* hall floor + dome */
const floor=new THREE.Mesh(new THREE.CircleGeometry(40,48),stdMat(0x0b0c14,.9)); floor.rotation.x=-Math.PI/2; floor.receiveShadow=true; scene.add(floor);
const domeTex=canvasTex(1024,256,(x,w,h)=>{ const g=x.createLinearGradient(0,0,0,h); g.addColorStop(0,'#06070d'); g.addColorStop(.6,'#0b1022'); g.addColorStop(1,'#14182c'); x.fillStyle=g; x.fillRect(0,0,w,h);
 for(let i=0;i<260;i++){ const px=Math.random()*w,py=h*.35+Math.random()*h*.65,r=Math.random()*4+1; x.fillStyle=pick(['rgba(255,200,120,.35)','rgba(120,170,255,.35)','rgba(255,90,110,.3)','rgba(255,255,255,.25)']); x.beginPath(); x.arc(px,py,r,0,TAU); x.fill(); } });
const dome=new THREE.Mesh(new THREE.CylinderGeometry(36,36,34,48,1,true),new THREE.MeshBasicMaterial({map:domeTex,side:THREE.BackSide,fog:false})); dome.position.y=15; scene.add(dome);
const roof=new THREE.Mesh(new THREE.CircleGeometry(36,32),new THREE.MeshBasicMaterial({color:0x04050a,fog:false})); roof.rotation.x=Math.PI/2; roof.position.y=32; scene.add(roof);

/* ring */
const bannerTex=canvasTex(1024,128,(x,w,h)=>{ x.fillStyle='#10131f'; x.fillRect(0,0,w,h); x.fillStyle='#2f7bff'; x.fillRect(0,0,w,8); x.fillStyle='#ff3d4d'; x.fillRect(0,h-8,w,8);
 x.font='900 64px Impact,"Arial Narrow",sans-serif'; x.textBaseline='middle'; x.fillStyle='#2f7bff'; x.fillText('KY',40,h/2); x.fillStyle='#ffc548'; x.fillText('VS',150,h/2); x.fillStyle='#ff3d4d'; x.fillText('CHEA',250,h/2); x.fillStyle='#e9edf7'; x.font='700 34px Arial Narrow,sans-serif'; x.fillText('BOXING CHAMPIONSHIP',480,h/2); x.fillStyle='#ffc548'; x.fillText('★ ★ ★',860,h/2); },[2,1]);
const dark=stdMat(0x14161f,.8);
const ringBase=new THREE.Mesh(new THREE.BoxGeometry(8.6,.9,8.6),[stdMat(0xffffff,.6,0,{map:bannerTex}),stdMat(0xffffff,.6,0,{map:bannerTex}),dark,dark,stdMat(0xffffff,.6,0,{map:bannerTex}),stdMat(0xffffff,.6,0,{map:bannerTex})]);
ringBase.position.y=.45; ringBase.receiveShadow=true; scene.add(ringBase);
const matTex=canvasTex(1024,1024,(x,w,h)=>{ x.fillStyle='#1a2142'; x.fillRect(0,0,w,h);
 for(let i=0;i<32;i++){ x.fillStyle=i%2?'rgba(255,255,255,.025)':'rgba(0,0,0,.05)'; x.fillRect(0,i*32,w,32); }
 x.lineWidth=26; x.strokeStyle='#2f7bff'; x.beginPath(); x.moveTo(40,40); x.lineTo(40,h-40); x.lineTo(w/2,h-40); x.stroke(); x.beginPath(); x.moveTo(40,40); x.lineTo(w/2,40); x.stroke();
 x.strokeStyle='#ff3d4d'; x.beginPath(); x.moveTo(w-40,h-40); x.lineTo(w-40,40); x.lineTo(w/2,40); x.stroke(); x.beginPath(); x.moveTo(w-40,h-40); x.lineTo(w/2,h-40); x.stroke();
 x.save(); x.translate(w/2,h/2); x.strokeStyle='#ffc548'; x.lineWidth=10; x.beginPath(); x.arc(0,0,250,0,TAU); x.stroke(); x.lineWidth=3; x.beginPath(); x.arc(0,0,225,0,TAU); x.stroke();
 x.textAlign='center'; x.textBaseline='middle'; x.font='900 150px Impact,"Arial Narrow",sans-serif'; x.fillStyle='#2f7bff'; x.fillText('KY',-100,-70); x.fillStyle='#ff3d4d'; x.fillText('CHEA',70,60);
 x.fillStyle='#ffc548'; x.font='900 52px Impact,sans-serif'; x.fillText('VS',-30,-5); x.fillStyle='#e9edf7'; x.font='700 30px Arial Narrow,sans-serif'; x.fillText('B O X I N G   C H A M P I O N S H I P',0,170); x.restore(); });
const mat=new THREE.Mesh(new THREE.BoxGeometry(7,.08,7),[dark,dark,stdMat(0xffffff,.85,0,{map:matTex}),dark,dark,dark]); mat.position.y=.9+.04; mat.receiveShadow=true; scene.add(mat);
const ropeCols=[0xe9edf7,0xff3d4d,0xe9edf7,0x2f7bff], ropeY=[1.55,1.2,.85,.5];
const corners=[[-3.3,-3.3,0x2f7bff],[3.3,-3.3,0xff3d4d],[-3.3,3.3,0xe9edf7],[3.3,3.3,0xe9edf7]];
corners.forEach(([x,z,c])=>{ const p=new THREE.Mesh(new THREE.CylinderGeometry(.1,.1,1.85,12),stdMat(0x777f95,.4,.8)); p.position.set(x,RING_Y+.92,z); p.castShadow=true; scene.add(p);
 ropeY.forEach(y=>box(.34,.3,.34,stdMat(c,.6),x,RING_Y+y,z)); });
function rope(x1,z1,x2,z2,y,col){ const len=Math.hypot(x2-x1,z2-z1); const m=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,len,8),stdMat(col,.5)); m.position.set((x1+x2)/2,RING_Y+y,(z1+z2)/2); m.rotation.z=Math.PI/2; m.rotation.y=-Math.atan2(z2-z1,x2-x1)+0; m.castShadow=true; scene.add(m); }
ropeY.forEach((y,i)=>{ const c=ropeCols[i]; rope(-3.3,-3.3,3.3,-3.3,y,c); rope(-3.3,3.3,3.3,3.3,y,c);
 const m1=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,6.6,8),stdMat(c,.5)); m1.rotation.x=Math.PI/2; m1.position.set(-3.3,RING_Y+y,0); scene.add(m1);
 const m2=m1.clone(); m2.position.x=3.3; scene.add(m2); });
/* corner stools and buckets */
box(.5,.55,.5,stdMat(0x2f7bff,.6),-4.55,.28,-3.9); box(.5,.55,.5,stdMat(0xff3d4d,.6),4.55,.28,-3.9);
const bucket=new THREE.CylinderGeometry(.18,.14,.34,12); [[-4.0,-4.6,0x2f7bff],[4.0,-4.6,0xff3d4d]].forEach(([x,z,c])=>{ const b=new THREE.Mesh(bucket,stdMat(c,.5)); b.position.set(x,.17,z); scene.add(b); });
/* ringside barrier */
const barTex=canvasTex(1024,64,(x,w,h)=>{ x.fillStyle='#0d1020'; x.fillRect(0,0,w,h); for(let i=0;i<8;i++){ x.fillStyle=i%2?'#2f7bff':'#ff3d4d'; x.fillRect(i*128,0,64,10); } x.fillStyle='#e9edf7'; x.font='800 36px Arial Narrow,sans-serif'; x.textBaseline='middle'; for(let i=0;i<4;i++)x.fillText('CHAMPIONSHIP',i*256+20,h/2+4); },[6,1]);
barTex.repeat.set(-6,1);
const barrier=new THREE.Mesh(new THREE.CylinderGeometry(7.4,7.4,1.05,64,1,true),stdMat(0xffffff,.5,0,{map:barTex,side:THREE.BackSide})); barrier.position.y=.52; scene.add(barrier);

/* tiers + crowd */
const ROWS=6, rowR=r=>9.0+r*1.4, rowTop=r=>.6+r*.58;
(function(){ const geo=new THREE.BoxGeometry(1,1,1); let n=0; for(let r=0;r<ROWS;r++)n+=Math.floor(TAU*rowR(r)/1.2);
 const im=new THREE.InstancedMesh(geo,stdMat(0x1a1d2c,.9),n); const o=new THREE.Object3D(); let k=0;
 for(let r=0;r<ROWS;r++){ const R=rowR(r),cnt=Math.floor(TAU*R/1.2),h=rowTop(r);
  for(let i=0;i<cnt;i++){ const a=i/cnt*TAU; o.position.set(Math.cos(a)*R,h/2,Math.sin(a)*R); o.rotation.set(0,-a,0); o.scale.set(1.4,h,1.25); o.updateMatrix(); im.setMatrixAt(k++,o.matrix); } }
 im.receiveShadow=true; scene.add(im); })();
const crowd={n:0,body:null,head:null,data:[],excite:0,o:new THREE.Object3D(),f:0};
(function(){ const per=S.quality==='low'?1.55:.8; const list=[];
 for(let r=0;r<ROWS;r++){ const R=rowR(r)+.1,cnt=Math.floor(TAU*R/per); for(let i=0;i<cnt;i++){ const a=(i+Math.random()*.3)/cnt*TAU; list.push({x:Math.cos(a)*R,z:Math.sin(a)*R,y:rowTop(r),a,ph:Math.random()*TAU,sp:rnd(2,5),amp:rnd(.04,.16),s:rnd(.9,1.12)}); } }
 crowd.n=list.length; crowd.data=list;
 const bg=new THREE.CylinderGeometry(.2,.26,.62,8), hg=new THREE.SphereGeometry(.15,10,8);
 crowd.body=new THREE.InstancedMesh(bg,stdMat(0xffffff,.9),crowd.n); crowd.head=new THREE.InstancedMesh(hg,stdMat(0xffffff,.8),crowd.n);
 const pal=[0x2f7bff,0xff3d4d,0xe9edf7,0x20232f,0xffc548,0x3ddc97,0x7a5cff,0x9aa3b8], sk=[0xf1c8a6,0xd9a47a,0xb97a52,0x8a5a3a,0x6b4128];
 const col=new THREE.Color(); list.forEach((d,i)=>{ col.setHex(pick(pal)); crowd.body.setColorAt(i,col); col.setHex(pick(sk)); crowd.head.setColorAt(i,col); });
 scene.add(crowd.body,crowd.head); })();
function updateCrowd(t,dt){ crowd.f++; if(crowd.f%2)return; crowd.excite=damp(crowd.excite,.15,.8,dt*2); const o=crowd.o,e=crowd.excite;
 for(let i=0;i<crowd.n;i++){ const d=crowd.data[i]; const j=Math.abs(Math.sin(t*d.sp+d.ph))*d.amp*(.4+e*2.2); const sway=Math.sin(t*d.sp*.5+d.ph)*.03*(1+e*2);
  o.position.set(d.x+sway,d.y+.31*d.s+j,d.z); o.rotation.set(0,-d.a+Math.PI/2,0); o.scale.set(d.s,d.s,d.s); o.updateMatrix(); crowd.body.setMatrixAt(i,o.matrix);
  o.position.y=d.y+.78*d.s+j; o.scale.setScalar(d.s); o.updateMatrix(); crowd.head.setMatrixAt(i,o.matrix); }
 crowd.body.instanceMatrix.needsUpdate=true; crowd.head.instanceMatrix.needsUpdate=true; }
/* camera flashes */
const flashN=36, flashPos=new Float32Array(flashN*3), flashCol=new Float32Array(flashN*3), flashT=new Float32Array(flashN);
for(let i=0;i<flashN;i++){ const r=Math.floor(rnd(0,ROWS)),a=rnd(0,TAU),R=rowR(r); flashPos.set([Math.cos(a)*R,rowTop(r)+1.1,Math.sin(a)*R],i*3); }
const flashGeo=new THREE.BufferGeometry(); flashGeo.setAttribute('position',new THREE.BufferAttribute(flashPos,3)); flashGeo.setAttribute('color',new THREE.BufferAttribute(flashCol,3));
const flashPts=new THREE.Points(flashGeo,new THREE.PointsMaterial({size:.55,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false})); scene.add(flashPts);
function updateFlashes(dt){ for(let i=0;i<flashN;i++){ if(flashT[i]>0){ flashT[i]-=dt; const v=Math.max(0,flashT[i]/.12); flashCol.set([v,v,v*.9],i*3); } else { flashCol.set([0,0,0],i*3); if(Math.random()<dt*(.5+crowd.excite*8))flashT[i]=.12; } } flashGeo.attributes.color.needsUpdate=true; }

/* LED screens */
const led={c:document.createElement('canvas'),names:['KY','CHEA'],t:0,acc:0};
led.c.width=1024; led.c.height=256; led.x=led.c.getContext('2d'); led.tex=new THREE.CanvasTexture(led.c); led.tex.encoding=THREE.sRGBEncoding;
function drawLED(t){ const x=led.x,w=1024,h=256; const g=x.createLinearGradient(0,0,w,0); g.addColorStop(0,'#071a45'); g.addColorStop(.5,'#0b0d1a'); g.addColorStop(1,'#4a0b16'); x.fillStyle=g; x.fillRect(0,0,w,h);
 x.save(); x.globalAlpha=.18; for(let i=-4;i<20;i++){ x.fillStyle=i%2?'#2f7bff':'#ff3d4d'; x.beginPath(); const ox=((t*60)%128)+i*64; x.moveTo(ox,0); x.lineTo(ox+40,0); x.lineTo(ox-40,h); x.lineTo(ox-80,h); x.fill(); } x.restore();
 x.textBaseline='middle'; x.textAlign='center'; x.font='900 150px Impact,"Arial Narrow",sans-serif'; const a=led.names[0],b=led.names[1];
 x.shadowBlur=30; x.shadowColor='#2f7bff'; x.fillStyle='#8db8ff'; x.fillText(a,230,110); x.shadowColor='#ff3d4d'; x.fillStyle='#ff9aa3'; x.fillText(b,800,110); x.shadowBlur=0;
 x.fillStyle='#ffc548'; x.font='900 70px Impact,sans-serif'; x.fillText('VS',515,110);
 x.fillStyle='#e9edf7'; x.font='700 34px Arial Narrow,sans-serif'; const msg='   BOXING CHAMPIONSHIP   ★   3 ROUNDS   ★   KNOCKOUT OR POINTS   ★   '; const off=(t*90)%(x.measureText(msg).width||600); x.textAlign='left'; x.fillText(msg+msg+msg,-off,226); led.tex.needsUpdate=true; }
drawLED(0);
const ledMat=new THREE.MeshBasicMaterial({map:led.tex,fog:false});
for(let i=0;i<4;i++){ const a=i/4*TAU+Math.PI/4, R=19; const m=new THREE.Mesh(new THREE.PlaneGeometry(14,3.5),ledMat); m.position.set(Math.cos(a)*R,8.8,Math.sin(a)*R); m.lookAt(0,6,0); scene.add(m);
 const fr=new THREE.Mesh(new THREE.PlaneGeometry(14.4,3.9),new THREE.MeshBasicMaterial({color:0x10131f,fog:false})); fr.position.copy(m.position); fr.quaternion.copy(m.quaternion); fr.translateZ(-.05); scene.add(fr); }
/* hanging cube */
const cube=new THREE.Group(); cube.position.set(0,8.2,0); scene.add(cube);
for(let i=0;i<4;i++){ const m=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.7),ledMat); const a=i*Math.PI/2; m.position.set(Math.sin(a)*1.7,0,Math.cos(a)*1.7); m.rotation.y=a; cube.add(m); }
box(3.5,.25,3.5,stdMat(0x10131f,.5),0,.98,0,cube); box(3.5,.25,3.5,stdMat(0x10131f,.5),0,-.98,0,cube);
[[1.2,1.2],[-1.2,1.2],[1.2,-1.2],[-1.2,-1.2]].forEach(([x,z])=>{ const c=new THREE.Mesh(new THREE.CylinderGeometry(.015,.015,9,4),stdMat(0x888888)); c.position.set(x,5.5,z); cube.add(c); });
/* truss + lamp beams */
const truss=new THREE.Mesh(new THREE.TorusGeometry(7.2,.12,8,48),stdMat(0x333844,.4,.8)); truss.rotation.x=Math.PI/2; truss.position.y=11; scene.add(truss);
spots.forEach(s=>{ const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.25,.4,.6,12),new THREE.MeshBasicMaterial({color:0xfff4d0,fog:false})); lamp.position.copy(s.position); scene.add(lamp);
 const len=s.position.distanceTo(new THREE.Vector3(0,RING_Y,0)); const cone=new THREE.Mesh(new THREE.ConeGeometry(2.3,len,24,1,true),new THREE.MeshBasicMaterial({color:0xfff0cc,transparent:true,opacity:.045,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,fog:false}));
 cone.position.copy(s.position).lerp(new THREE.Vector3(0,RING_Y,0),.5); cone.lookAt(0,RING_Y,0); cone.rotateX(Math.PI/2); cone.rotateX(Math.PI); scene.add(cone); });

/* ---------- effects: particles, flash sprites ---------- */
const PN=320, pPos=new Float32Array(PN*3), pCol=new Float32Array(PN*3), pVel=new Float32Array(PN*3), pLife=new Float32Array(PN), pCol0=new Float32Array(PN*3); let pHead=0;
const pGeo=new THREE.BufferGeometry(); pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3)); pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
const pts=new THREE.Points(pGeo,new THREE.PointsMaterial({size:.1,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})); pts.frustumCulled=false; scene.add(pts);
function burst(pos,n,color,speed,dir){ const c=new THREE.Color(color); for(let i=0;i<n;i++){ const k=pHead++%PN; pPos.set([pos.x,pos.y,pos.z],k*3); const a=rnd(0,TAU),b=rnd(-.3,1),s=rnd(.3,1)*speed;
  pVel.set([Math.cos(a)*s*(1-Math.abs(b)*.3)+(dir?dir.x*s*.6:0),b*s+1,Math.sin(a)*s*(1-Math.abs(b)*.3)+(dir?dir.z*s*.6:0)],k*3); pCol0.set([c.r,c.g,c.b],k*3); pLife[k]=rnd(.35,.8); } }
function updateParticles(dt){ for(let k=0;k<PN;k++){ if(pLife[k]>0){ pLife[k]-=dt; const l=Math.max(0,pLife[k]); pVel[k*3+1]-=7*dt; pPos[k*3]+=pVel[k*3]*dt; pPos[k*3+1]+=pVel[k*3+1]*dt; pPos[k*3+2]+=pVel[k*3+2]*dt; const f=Math.min(1,l*2); pCol[k*3]=pCol0[k*3]*f; pCol[k*3+1]=pCol0[k*3+1]*f; pCol[k*3+2]=pCol0[k*3+2]*f; } else { pCol[k*3]=pCol[k*3+1]=pCol[k*3+2]=0; } } pGeo.attributes.position.needsUpdate=true; pGeo.attributes.color.needsUpdate=true; }
const starTex=canvasTex(128,128,(x,w,h)=>{ const g=x.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.25,'rgba(255,230,160,.8)'); g.addColorStop(1,'rgba(255,200,80,0)'); x.fillStyle=g; x.fillRect(0,0,w,h); x.strokeStyle='rgba(255,255,255,.9)'; x.lineWidth=4; for(let i=0;i<8;i++){ const a=i/8*TAU; x.beginPath(); x.moveTo(64+Math.cos(a)*14,64+Math.sin(a)*14); x.lineTo(64+Math.cos(a)*60,64+Math.sin(a)*60); x.stroke(); } });
const sprites=[]; for(let i=0;i<5;i++){ const s=new THREE.Sprite(new THREE.SpriteMaterial({map:starTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0})); s.userData.t=0; s.visible=false; scene.add(s); sprites.push(s); }
let spriteI=0; function impactFlash(pos,size,color){ const s=sprites[spriteI++%sprites.length]; s.position.copy(pos); s.userData.t=.2; s.userData.size=size; s.material.color.set(color||0xffffff); s.visible=true; }
function updateSprites(dt){ sprites.forEach(s=>{ if(s.userData.t>0){ s.userData.t-=dt; const k=1-s.userData.t/.2; s.scale.setScalar(s.userData.size*(.5+k*1.1)); s.material.opacity=Math.max(0,1-k); if(s.userData.t<=0)s.visible=false; } }); }
