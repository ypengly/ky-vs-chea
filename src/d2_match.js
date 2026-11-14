
/* ---------- fighters / stage ---------- */
function clearFighters(){ G.fighters.forEach(f=>f&&f.dispose()); G.fighters=[null,null]; }
function setupStage(kind){
 clearFighters(); const a=new Fighter(ROSTER.KY,0),b=new Fighter(ROSTER.CHEA,1); G.fighters=[a,b]; a.dmgScale=b.dmgScale=0; a.noKO=b.noKO=true; G.mode=null;
 if(kind==='menu'){ a.reset(-1.5,0,Math.PI/2); b.reset(1.5,0,-Math.PI/2); a.ai=makeAI(.35); b.ai=makeAI(.35); G.view='menu'; G.phase='menu'; }
 else { a.reset(-1.7,0,.45); b.reset(1.7,0,-.45); a.showcase=b.showcase=true; a.noHit=b.noHit=true; G.view='select'; G.phase='select'; G.selT=0; }
}
function resolveBodies(){ const [a,b]=G.fighters; const up=f=>f.state==='down'||f.state==='getup';
 if(!up(a)&&!up(b)){ const dx=b.pos.x-a.pos.x,dz=b.pos.z-a.pos.z,d=Math.hypot(dx,dz)||.01,min=.88; if(d<min){ const p=(min-d)/2,nx=dx/d,nz=dz/d; a.pos.x-=nx*p;a.pos.z-=nz*p;b.pos.x+=nx*p;b.pos.z+=nz*p; } }
 const L=HALF-.15; [a,b].forEach(f=>{ f.pos.x=clamp(f.pos.x,-L,L); f.pos.z=clamp(f.pos.z,-L,L); }); }
const rpts=f=>f.rs.dmg+f.rs.landed*.6+f.rs.def*1.2+f.rs.kd*14;
function scoreRound(){ const [a,b]=G.fighters; const d0=rpts(a)-rpts(b),kdd=a.rs.kd-b.rs.kd;
 for(let j=0;j<3;j++){ const d=d0+[-1.6,0,1.6][j]*rnd(.4,1.4)*(1+Math.abs(d0)*.02); let ra=10,rb=10; if(Math.abs(d)>=1.5){ const lose=(Math.abs(kdd)>=2||Math.abs(d)>50)?8:9; if(d>0)rb=lose; else ra=lose; } G.cards[j].push([ra,rb]); } }
function judgeTotals(){ return G.cards.map(c=>c.reduce((s,r)=>[s[0]+r[0],s[1]+r[1]],[0,0])); }
function pointsWinner(){ let va=0,vb=0; judgeTotals().forEach(t=>{ if(t[0]>t[1])va++; else if(t[1]>t[0])vb++; }); return va>vb?0:vb>va?1:-1; }

/* ---------- match flow ---------- */
function startMatch(o){
 Snd.init(); G.opts=o; G.mode=o.mode; hideScreens(); clearFighters(); const a=new Fighter(o.c0,0),b=new Fighter(o.c1,1); G.fighters=[a,b];
 if(o.mode==='pvp'){ a.human=b.human=true; a.pl=0; b.pl=1; }
 else { const me=G.fighters[o.hi||0],op=G.fighters[1-(o.hi||0)]; me.human=true; me.pl=0; op.ai=makeAI(o.tier,o.aiMode); G.partner=op;
  if(o.mode==='train'){ op.noKO=true; op.dmgScale=.35; G.rounds=999; G.train.dummy='stand'; op.ai.mode='stand'; trainBuild(); buildDummySeg(); } }
 if(o.mode!=='train'){ G.rounds=S.rounds; G.roundLen=S.roundTime; }
 G.round=1; G.cards=[[],[],[]]; G.result=null; G.count=null; G.cornerT=null; G.slowT=0; G.ts=1; G.lastBeep=-1;
 a.reset(-1.6,0,Math.PI/2); b.reset(1.6,0,-Math.PI/2); 
 led.names=[o.c0.name,o.c1.name]; drawLED(led.t); $('n1').textContent=o.c0.name; $('n2').textContent=o.c1.name;
 $('hud').classList.add('on'); $('train').classList.toggle('on',o.mode==='train'); $('b2').style.visibility=o.mode==='pvp'||o.mode==='train'?'visible':'visible';
 setHints(); applyTouch();
 $('inA').textContent=o.c0.name; $('inB').textContent=o.c1.name; $('inA2').textContent=o.c0.style; $('inB2').textContent=o.c1.style+(o.label?'  -  '+o.label:'');
 G.phase='intro'; G.pt=0; G.view='intro'; G.cam.t=0; G.cam.side=null; $('bars').classList.add('on'); showScreen('sc-intro'); status('Introductions'); Snd.swell(.7,3);
}
function startRound(n){
 G.round=n; G.clock=G.roundLen; G.phase='ready'; G.pt=0; G.view='fight'; G.bn=0; G.lastBeep=-1; $('bars').classList.remove('on'); hideScreens('sc-intro');
 const [a,b]=G.fighters; [a,b].forEach(f=>{ f.resetRound(); f.state='idle'; f.atk=null; f.buf=null; f.vel.x=f.vel.z=0; f.stam=f.maxSt; f.daze=0; f.iframes=0; f.cur=Object.assign({},BASE); });
 a.pos.x=-1.6;a.pos.z=0;b.pos.x=1.6;b.pos.z=0; a.yaw=Math.PI/2;b.yaw=-Math.PI/2;
 $('roundlbl').textContent=G.mode==='train'?'TRAINING':'ROUND '+n+' / '+G.rounds; $('timer').textContent=G.mode==='train'?'--':fmt(G.clock); status('Get ready');
}
function endRound(reason){
 G.phase='roundEnd'; G.pt=0; Snd.bell(3); banner(reason==='time'?'TIME':'ROUND OVER',null,false,'#ffc548'); status('Round over'); scoreRound(); Snd.swell(.8,2.5);
 G.fighters.forEach(f=>{f.blocking=false;f.buf=null;});
}
function startBreak(){
 G.phase='break'; G.breakT=60; const [a,b]=G.fighters; [a,b].forEach(f=>{ f.state='corner'; f.atk=null; f.hp=Math.min(f.maxHp,f.hp+35); f.stam=f.maxSt; f.daze=0; }); G.cornerA={x:-2.5,z:-2.3}; G.cornerB={x:2.5,z:-2.3};
 buildBreak(); showScreen('sc-break'); status('Between rounds'); $('timer').textContent=fmt(G.breakT);
}
function finishMatch(method,w){
 G.phase='matchEnd'; G.pt=0; const [a,b]=G.fighters; G.result={method,w,round:G.round,time:Math.max(0,G.roundLen-G.clock)}; G.count=null; $('count').classList.remove('on');
 if(w>=0){ const win=G.fighters[w],lose=G.fighters[1-w]; win.state='win'; win.atk=null; if(lose.state!=='down'&&lose.state!=='getup')lose.state='lose'; }
 else { a.state='idle'; b.state='idle'; }
 G.view='win'; G.cam.t=0; $('bars').classList.add('on'); status(method==='POINTS'?'Judges decision':'Fight over');
 banner(method==='KO'?'KNOCKOUT!':method==='TKO'?'T K O':(w<0?'DRAW':'DECISION'),w>=0?G.fighters[w].cfg.name+' WINS':'ALL SQUARE',true,'#ffc548'); Snd.bell(3); Snd.ko(); Snd.swell(1,4); crowd.excite=1.4; flashScreen('rgba(255,255,255,.5)',.6);
}
function updateCount(dt,ds){
 const c=G.count; if(!c){G.phase='fight';return;} const d=c.f,a=c.att; if(a.state!=='win'&&a.state!=='lose')a.state='corner';
 const tx=G.cornerT.x-a.pos.x,tz=G.cornerT.z-a.pos.z,dd=Math.hypot(tx,tz); const act={mx:dd>.15?tx/dd*2.2:0,mz:dd>.15?tz/dd*2.2:0,block:false};
 a.step(ds,d,act); d.step(ds,a,d.ctl); resolveBodies();
 d.downT+=dt; const sp=(c.ko||c.tko)?1.7:1; const n=d.downT*sp>=.6?Math.min(10,Math.floor(d.downT*sp-.6)+1):0;
 if(n!==c.last&&!c.rising){ c.last=n; if(n>0){ $('count').innerHTML=n+'<small>REFEREE COUNT</small>'; $('count').classList.add('on'); Snd.beep(); } }
 if(c.rising){ d.getT+=dt; if(d.getT>=1.2){ d.state='idle'; d.iframes=1; d.stam=Math.max(d.stam,d.maxSt*.3); a.state='idle'; G.phase='fight'; G.view='fight'; G.count=null; $('bars').classList.remove('on'); banner('BOX!',null,false,'#fff'); status('Fight'); } return; }
 const need=Math.max(2.4,d.getReq-d.mash*.45);
 if(!c.ko&&!c.tko&&d.downT>=need){ c.rising=true; d.state='getup'; d.getT=0; $('count').classList.remove('on'); Snd.swell(.8,1.5); return; }
 if(c.tko&&d.downT>=2){ if(!c.done){c.done=true; finishMatch('TKO',a.idx);} }
 else if(c.ko&&n>=10){ if(!c.done){c.done=true; finishMatch('KO',a.idx);} }
}
function fightUpdate(dr,ds){
 const [a,b]=G.fighters;
 if(G.mode!=='train'){ G.clock-=dr; const cs=Math.ceil(G.clock); if(G.clock<=10&&G.clock>0&&cs!==G.lastBeep){G.lastBeep=cs;Snd.beep();} if(G.clock<=0){G.clock=0;endRound('time');return;} }
 [a,b].forEach(f=>{ const o=f===a?b:a; const ctl=f.human?readInput(f.pl):aiStep(f,o,ds); f.ctl=ctl; f.step(ds,o,ctl); });
 resolveBodies();
 if(G.mode==='train'){ const pt=G.partner,me=a.human?a:b; pt.stam=pt.maxSt; pt.special=0; if(pt.hp<35)pt.hp=pt.maxHp; if(me.state==='dodge')trainMark('dodge'); }
}
function stepIdle(ds){ const [a,b]=G.fighters; [a,b].forEach(f=>{ const o=f===a?b:a; f.step(ds,o,{mx:0,mz:0,block:false}); }); resolveBodies(); }
function nextRound(){ if(G.phase!=='break')return; hideScreens(); startRound(G.round+1); }

/* ---------- camera ---------- */
const cp=new THREE.Vector3(),cl=new THREE.Vector3(),look=new THREE.Vector3(0,RING_Y+1.2,0); camera.position.set(0,3,9);
const fitDist=(half,fov)=>{ const hf=2*Math.atan(Math.tan(fov*Math.PI/360)*camera.aspect); return half/Math.tan(hf/2); };
G.camF={x:0,z:-1}; G.camR={x:1,z:0};
function frameCam(dt){
 const C=G.cam; C.t+=dt; const fs=G.fighters,A=fs[0],B=fs[1]; let fov=42,rate=4;
 if(G.view==='menu'||!A){ const a=C.t*.12+.6; cp.set(Math.sin(a)*8.2,2.7+Math.sin(C.t*.2)*.3,Math.cos(a)*8.2); cl.set(0,RING_Y+1.2,0); rate=3; if(camera.aspect<1)cp.multiplyScalar(1.5); }
 else if(G.view==='select'){ const dd=fitDist(4.9,40); cp.set(0,RING_Y+1.4,Math.max(6.6,dd)); cl.set(0,RING_Y+.95,0); fov=40; }
 else if(G.view==='intro'){ const a=-1.1+C.t*.34; const R=Math.max(7.5,fitDist(3.4,42)); cp.set(Math.sin(a)*R,2.3-C.t*.12,Math.cos(a)*R); cl.set(0,RING_Y+1.3,0); rate=3.5; }
 else if(G.view==='kd'&&G.count){ const d=G.count.f,ang=C.t*.4+Math.atan2(d.pos.x,d.pos.z)+.9; const R=3.6; cp.set(d.pos.x+Math.sin(ang)*R,RING_Y+.9+C.t*.12,d.pos.z+Math.cos(ang)*R); cl.set(d.pos.x,RING_Y+.4,d.pos.z); fov=38; rate=5; }
 else if(G.view==='win'&&G.result){ const w=G.result.w>=0?fs[G.result.w]:null; const tx=w?w.pos.x:0,tz=w?w.pos.z:0; const ang=C.t*.32+1.2; const R=w?3.8:5.5; cp.set(tx+Math.sin(ang)*R,RING_Y+1.2+Math.sin(C.t*.5)*.2,tz+Math.cos(ang)*R); cl.set(tx,RING_Y+(w?1.2:1.1),tz); fov=40; rate=3.5; }
 else {
  const ax=B.pos.x-A.pos.x,az=B.pos.z-A.pos.z,sep=Math.hypot(ax,az)||1,nx=ax/sep,nz=az/sep; let px=-nz,pz=nx;
  if(C.side){ if(px*C.side.x+pz*C.side.z<0){px=-px;pz=-pz;} } else if(pz<0){px=-px;pz=-pz;} C.side={x:px,z:pz};
  const mx=(A.pos.x+B.pos.x)/2,mz=(A.pos.z+B.pos.z)/2; let need=Math.max(4.3,fitDist(sep/2+1.45,fov)); need*=1-C.kick*.1;
  let dx=px*.96+nx*.28,dz=pz*.96+nz*.28; const ln=Math.hypot(dx,dz); dx/=ln; dz/=ln; let h=RING_Y+2.0+need*.1; let lx=mx,lz=mz,ly=RING_Y+1.05;
  const sp=C.special; if(sp){ sp.t+=dt; if(sp.t>sp.dur)C.special=null; else { const u=sp.t/sp.dur,f=sp.f; need*=.62+.1*u; h=RING_Y+1.15; const fp=f.pos; lx=lerp(mx,fp.x,.45); lz=lerp(mz,fp.z,.45); ly=RING_Y+1.25; fov=36; rate=7; const ang=(f.idx===0?-1:1)*.5*u; const c=Math.cos(ang),s=Math.sin(ang); const ox=dx*c-dz*s,oz=dx*s+dz*c; dx=ox;dz=oz; } }
  cp.set(mx+dx*need,h,mz+dz*need); const r=Math.hypot(cp.x,cp.z); if(r>8.6){cp.x*=8.6/r;cp.z*=8.6/r;} cl.set(lx,ly,lz); if(G.phase==='break')rate=2;
 }
 { const m=Math.max(Math.abs(cp.x),Math.abs(cp.z)); if(m>2.4&&m<4.4){ const q=4.4/m; cp.x*=q; cp.z*=q; } if(cp.y<RING_Y+1.6&&m>2.4)cp.y=RING_Y+1.6; }
 const k=1-Math.exp(-rate*dt); camera.position.lerp(cp,k); look.lerp(cl,Math.min(1,k*1.4)); camera.lookAt(look);
 camera.fov=damp(camera.fov,fov-C.kick*3,6,dt); camera.updateProjectionMatrix();
 C.kick*=Math.exp(-3.5*dt); C.shake=clamp(C.shake*Math.exp(-6.5*dt),0,1.6);
 if(S.shake&&C.shake>.01){ camera.position.x+=rnd(-1,1)*C.shake*.07; camera.position.y+=rnd(-1,1)*C.shake*.07; camera.position.z+=rnd(-1,1)*C.shake*.07; camera.rotation.z+=rnd(-1,1)*C.shake*.012; }
 const fx=look.x-camera.position.x,fz=look.z-camera.position.z,fl=Math.hypot(fx,fz)||1; G.camF.x=fx/fl; G.camF.z=fz/fl; G.camR.x=-G.camF.z; G.camR.z=G.camF.x;
 if(G.cam.special&&G.cam.special.t<.1)C.kick=Math.max(C.kick,1);
}

/* ---------- HUD ---------- */
const H={}; ['f1','f2','g1','g2','s1','s2','c1','c2','sp1','sp2','spt1','spt2','timer'].forEach(k=>H[k]=$(k));
function updateHUD(dt){
 const fs=G.fighters; for(let i=0;i<2;i++){ const f=fs[i]; if(!f)continue; const n=i+1;
  if(f.hp>f.hpShown)f.hpShown=f.hp; else f.hpShown=damp(f.hpShown,f.hp,2.5,dt); const pc=f.hp/f.maxHp;
  H['f'+n].style.width=(pc*100)+'%'; H['g'+n].style.width=(f.hpShown/f.maxHp*100)+'%'; H['f'+n].classList.toggle('low',pc<.3); H['s'+n].style.width=(f.stam/f.maxSt*100)+'%';
  H['sp'+n].firstElementChild.style.width=Math.min(100,f.special)+'%'; const rdy=f.special>=100; H['sp'+n].classList.toggle('rdy',rdy);
  H['spt'+n].textContent=rdy?(f.cfg.special+(f.human?(i===0?' READY - SHIFT':' READY'):' READY')):'Special charging';
  const c=H['c'+n]; if(f.comboN>=2){c.classList.add('on');c.firstElementChild.textContent=f.comboN;} else c.classList.remove('on'); }
 if(G.phase==='break')H.timer.textContent=fmt(G.breakT); else if(G.mode!=='train'&&G.phase!=='menu')H.timer.textContent=fmt(G.clock);
 H.timer.classList.toggle('warn',G.mode!=='train'&&G.phase==='fight'&&G.clock<=10);
}

/* ---------- main loop ---------- */
let last=performance.now(),ledT=0;
function update(dr){
 G.slowT-=dr; G.ts=damp(G.ts,G.slowT>0?.28:1,10,dr); let ds=dr*G.ts; if(G.hitStop>0){G.hitStop-=dr;ds=0;}
 const [a,b]=G.fighters;
 if(a&&b){
  switch(G.phase){
   case 'menu':{ [a,b].forEach(f=>{ const o=f===a?b:a; f.special=0; f.hp=f.maxHp; f.stam=Math.max(f.stam,f.maxSt*.5); f.step(ds,o,aiStep(f,o,ds)); }); resolveBodies(); break; }
   case 'select':{ G.selT+=dr; const pk=G.pick; a.state=pk==='KY'?'win':'idle'; b.state=pk==='CHEA'?'win':'idle'; a.yaw=damp(a.yaw,.5,4,dr); b.yaw=damp(b.yaw,-.5,4,dr);
    if(G.selT>1.6){ G.selT=0; [a,b].forEach(f=>{ if(f.state==='idle')f.queue(pick(ACTS)); }); } [a,b].forEach(f=>f.step(ds,f===a?b:a,{mx:0,mz:0,block:false})); break; }
   case 'intro': G.pt+=dr; stepIdle(ds); if(G.pt>3){ hideScreens(); startRound(1); } break;
   case 'ready': G.pt+=dr; stepIdle(ds); if(G.mode==='train'){ if(G.pt>.6){ G.phase='fight'; banner('TRAINING','HIT THE PARTNER',false,'#ffc548'); status('Practice'); } break; }
    if(G.bn===0&&G.pt>.3){G.bn=1; banner('ROUND '+G.round,G.round===G.rounds?'FINAL ROUND':'',false,'#fff');} if(G.bn===1&&G.pt>1.7){G.bn=2; Snd.bell(1); banner('FIGHT!',null,false,'#ff3d4d'); G.phase='fight'; status('Fight'); } break;
   case 'fight': fightUpdate(dr,ds); break;
   case 'count': updateCount(dr,ds); break;
   case 'roundEnd': G.pt+=dr; stepIdle(ds); if(G.pt>2.6){ if(G.round>=G.rounds){ finishMatch('POINTS',pointsWinner()); } else startBreak(); } break;
   case 'break': { G.breakT-=dr; const ca=G.cornerA,cb=G.cornerB; [[a,ca],[b,cb]].forEach(([f,c])=>{ const tx=c.x-f.pos.x,tz=c.z-f.pos.z,d=Math.hypot(tx,tz); f.step(ds,f===a?b:a,{mx:d>.1?tx/d*1.8:0,mz:d>.1?tz/d*1.8:0,block:false}); }); resolveBodies(); updateBreakTimer(); if(G.breakT<=0)nextRound(); break; }
   case 'matchEnd': G.pt+=dr; stepIdle(ds); if(G.pt>4.6&&!G.shown){G.shown=true; showResult();} break;
  }
  a.animate(ds); b.animate(ds);
 }
 updateCrowd(performance.now()/1000,dr); updateFlashes(dr); updateParticles(dr); updateSprites(dr);
 ledT+=dr; led.t+=dr; if(ledT>.08){ledT=0;drawLED(led.t);} cube.rotation.y+=dr*.15;
 frameCam(dr); updateFloats(dr); if(G.phase!=='menu'&&G.phase!=='select')updateHUD(dr);
}
function frame(now){ requestAnimationFrame(frame); const dr=Math.min(.05,(now-last)/1000); last=now;
 if(!G.paused)update(dr); else frameCam(0); renderer.render(scene,camera); }
function resize(){ renderer.setSize(innerWidth,innerHeight,false); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize',resize); resize();
