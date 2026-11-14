
const THUNDER={W:{Rsx:.9,Rsy:-.2,Rex:-1.1,cyaw:-1.05,byaw:-1.0,clx:.45,hy:-.24,Lsx:-1.3,Lsy:.1,Lex:-.3,hdx:.3,Rhx:.4,Lhx:-.55},
 S:{Rsx:-1.5,Rsy:-.1,Rex:-.05,cyaw:.95,byaw:.35,clx:.35,hy:-.12,Lsx:-.6,Lsy:.3,Lex:-2.1,Rhx:-.15,Lhx:-.35,hdx:.1}};
const _v=new THREE.Vector3();
class Fighter{
 constructor(cfg,idx){
  this.cfg=cfg; this.idx=idx; this.rig=buildRig(cfg); scene.add(this.rig.root); this.cur=Object.assign({},BASE);
  this.ts=1.35-cfg.speed/100*.8; this.dm=Math.pow(cfg.power/100,1.8)*.62; this.taken=1.25-cfg.defense/100*.5;
  this.maxSt=cfg.stamina; this.regen=(6+cfg.stamina*.12)*(cfg.stamina>=95?1.3:1); this.sc=.5+cfg.power/100*.5; this.spd=1.6+cfg.speed/100*1.6;
  this.maxHp=cfg.health||100; this.spKind=cfg.power>cfg.speed?'thunder':'lightning';
  this.ctl={mx:0,mz:0,block:false}; this.ai=null; this.human=false; this.noHit=false; this.demo=false; this.dmgScale=1; this.showcase=false;
  this.reset(0,0,0);
 }
 dispose(){ scene.remove(this.rig.root); }
 reset(x,z,yaw){
  this.pos={x,z}; this.vel={x:0,z:0}; this.yaw=yaw; this.hp=this.maxHp; this.hpShown=this.maxHp; this.stam=this.maxSt; this.special=0; this.daze=0; this.lastHit=9;
  this.state='idle'; this.atk=null; this.buf=null; this.blocking=false; this.dodgeT=0; this.dodgeDur=.3; this.dodgeDir=1; this.dodgeCD=0; this.iframes=0;
  this.hitT=0; this.hitDur=.2; this.hitKind='head'; this.hitSide=1; this.exhT=0; this.downT=0; this.getReq=5; this.mash=0; this.getT=0; this.kdRound=0; this.kdTotal=0;
  this.comboN=0; this.comboT=0; this.bestCombo=0; this.counterT=0; this.lastAct=9; this.walk=0; this.t=Math.random()*10; this.outcome=null; this.dist=2; this.noAct=0; this.exhaustAfter=false;
  this.stats={thrown:0,landed:0,power:0,blocked:0,dodged:0,kd:0,dmg:0};
  this.rs={dmg:0,landed:0,def:0,kd:0};
  this.cur=Object.assign({},BASE); this.sync();
 }
 resetRound(){ this.rs={dmg:0,landed:0,def:0,kd:0}; this.kdRound=0; }
 sync(){ this.rig.root.position.set(this.pos.x,RING_Y,this.pos.z); this.rig.root.rotation.y=this.yaw; }
 queue(act){ if(this.state==='down'){this.mash++;return;} if(this.state==='win'||this.state==='lose')return; this.buf={act,t:.3}; }
 canStart(){ const A=this.atk; return (this.state==='idle')||(this.state==='atk'&&A&&!A.special&&A.t>=A.su+A.ac+A.rc*.55); }
 canDodge(){ const A=this.atk; return this.dodgeCD<=0&&this.stam>=5&&(this.state==='idle'||(this.state==='atk'&&A&&!A.special&&A.t>=A.su+A.ac+A.rc*.3)); }
 faceOK(){ return this.state!=='down'&&this.state!=='getup'||false; }
 startAttack(type){
  const a=ATK[type],ts=this.ts; this.atk={type,a,t:0,su:a.su*ts,ac:a.ac*ts,rc:a.rc*ts,done:false,special:false,wh:false};
  this.stam-=a.st*this.sc; if(this.stam<=0){this.stam=0;this.exhaustAfter=true;} this.state='atk'; this.lastAct=0; this.blocking=false; this.stats.thrown++;
 }
 startSpecial(){
  const steps=[]; let su,ac,rc;
  if(this.spKind==='thunder'){ su=.7; ac=.14; rc=.65; steps.push({at:.7,win:.14,type:'thunder',a:{dmg:26,reach:1.9,block:.4,stun:.7,kind:'head',hand:'R',force:true,nm:'THUNDER SMASH',daze:70,heavy:true}}); this.stam=Math.max(0,this.stam-22); }
  else { su=.2; for(let i=0;i<5;i++)steps.push({at:.2+i*.11,win:.1,type:i%2?'cross':'jab',a:{dmg:4.2,reach:1.6,block:.3,stun:.16,kind:'head',hand:i%2?'R':'L',nm:'LIGHTNING',daze:8}});
   steps.push({at:.85,win:.12,type:'rhook',a:{dmg:14,reach:1.65,block:.4,stun:.5,kind:'hookR',hand:'R',nm:'RED LIGHTNING',daze:48,heavy:true,fin:true}}); ac=.77; rc=.5; this.stam=Math.max(0,this.stam-14); }
  steps.forEach(s=>{s.done=false;});
  this.atk={type:this.spKind,a:steps[0].a,t:0,su,ac,rc,special:true,steps,done:false,wh:false,cur:steps[0].type,fired:0};
  this.special=0; this.state='atk'; this.lastAct=0; this.blocking=false; this.buf=null; this.stats.thrown+=steps.length; Snd.charge(); onSpecialStart(this);
 }
 startDodge(dir){
  this.state='dodge'; this.dodgeT=0; this.dodgeDur=.3*(.75+this.ts*.35); this.dodgeDir=dir; this.iframes=this.dodgeDur*.85; this.dodgeCD=this.dodgeDur+.25*(this.ts+.3);
  this.stam=Math.max(0,this.stam-5); this.lastAct=0; this.blocking=false; this.atk=null; Snd.miss();
 }
 hitReact(kind,dur,pushX,pushZ,side){ this.state='hit'; this.hitKind=kind; this.hitDur=Math.max(.1,dur); this.hitT=this.hitDur; this.hitSide=side||1; this.atk=null; this.blocking=false; this.vel.x+=pushX; this.vel.z+=pushZ; this.exhaustAfter=false; }
 headPos(){ return this.rig.head.getWorldPosition(_v).clone(); }
 chestPos(){ return this.rig.chest.getWorldPosition(_v).clone().add(new THREE.Vector3(0,this.rig.dim.chestH*.5,0)); }
 handPos(side){ return this.rig[side].hand.getWorldPosition(_v).clone(); }
 step(dt,opp,ctl){
  this.t+=dt; this.lastAct+=dt; this.lastHit+=dt;
  if(this.iframes>0)this.iframes-=dt; if(this.dodgeCD>0)this.dodgeCD-=dt; if(this.counterT>0)this.counterT-=dt; if(this.noAct>0)this.noAct-=dt;
  if(this.comboT>0){this.comboT-=dt;if(this.comboT<=0)this.comboN=0;}
  if(this.buf){this.buf.t-=dt;if(this.buf.t<=0)this.buf=null;}
  if(this.lastHit>1.5)this.daze=Math.max(0,this.daze-7*dt);
  const dx=opp.pos.x-this.pos.x,dz=opp.pos.z-this.pos.z,dist=Math.hypot(dx,dz)||.001; this.dist=dist;
  const st=this.state;
  if(!this.showcase&&st!=='down'&&st!=='getup'&&st!=='win'&&st!=='lose') this.yaw+=angDiff(this.yaw,Math.atan2(dx,dz))*(1-Math.exp(-14*dt));
  else if((st==='win'||st==='lose')&&!this.showcase){ this.yaw+=angDiff(this.yaw,Math.atan2(dx,dz))*(1-Math.exp(-4*dt)); }
  const fx=Math.sin(this.yaw),fz=Math.cos(this.yaw); let moveMul=0,tvx=0,tvz=0; ctl=ctl||this.ctl;
  const stamRegen=()=>{ if(this.lastAct>.55)this.stam=Math.min(this.maxSt,this.stam+this.regen*dt*(this.blocking?.3:1)); };
  if(st==='idle'||st==='exh'){
   this.blocking=!!ctl.block&&st==='idle'&&this.stam>0; moveMul=this.blocking?.45:(st==='exh'?.3:1);
   tvx=ctl.mx*this.spd*moveMul; tvz=ctl.mz*this.spd*moveMul;
   if(st==='exh'){ this.exhT-=dt; if(this.exhT<=0){this.state='idle';this.stam=this.maxSt*.22;} }
   else { stamRegen(); if(this.stam<=0&&this.state==='idle'){this.state='exh';this.exhT=1.7;this.blocking=false;this.buf=null;} }
  } else if(st==='atk'){
   const A=this.atk; A.t+=dt; moveMul=.12; tvx=ctl.mx*this.spd*moveMul; tvz=ctl.mz*this.spd*moveMul;
   if(A.t>A.su*.35&&A.t<(A.special?A.su+A.ac*.8:A.su+A.ac)&&dist>.95){ const l=(A.special?(A.type==='thunder'?1.1:.5):A.a.lunge)/(A.su*.65+A.ac*(A.special&&A.type==='lightning'?.7:1)); this.vel.x+=fx*l*dt*9; this.vel.z+=fz*l*dt*9; }
   if(!A.special){
    if(A.t>=A.su&&!A.wh){A.wh=true;Snd.whoosh(A.a.dmg/13);}
    if(A.t>=A.su&&A.t<=A.su+A.ac&&!A.done&&!this.noHit){ const r=resolveAttack(this,opp,A.a,A.a.dmg,A.type); if(r)A.done=true; }
   } else {
    A.steps.forEach((s,i)=>{ if(s.done)return; if(A.t>=s.at&&A.t<=s.at+s.win){ if(!s.snd){s.snd=true;Snd.whoosh(.6);A.cur=s.type;A.fired=i+1;} if(!this.noHit){const r=resolveAttack(this,opp,s.a,s.a.dmg,s.type,true); if(r)s.done=true;} } else if(A.t>s.at+s.win){s.done=true;} });
   }
   if(A.t>=A.su+A.ac+A.rc){ this.atk=null; this.state='idle'; this.lastAct=0; if(this.exhaustAfter){this.exhaustAfter=false;this.state='exh';this.exhT=1.5;} }
  } else if(st==='dodge'){
   this.dodgeT+=dt; const u=this.dodgeT/this.dodgeDur,lx=Math.cos(this.yaw),lz=-Math.sin(this.yaw),sp=1.5/this.dodgeDur*(1-u*.75);
   this.vel.x=lx*this.dodgeDir*sp-fx*.4; this.vel.z=lz*this.dodgeDir*sp-fz*.4; moveMul=0; tvx=this.vel.x; tvz=this.vel.z;
   if(this.dodgeT>=this.dodgeDur){this.state='idle';this.lastAct=0;}
  } else if(st==='hit'){
   this.hitT-=dt; moveMul=0; if(this.hitT<=0){this.state=this.stam<=0?'exh':'idle'; if(this.state==='exh')this.exhT=1.4;}
  } else if(st==='down'||st==='getup'||st==='win'||st==='lose'||st==='corner'){
   moveMul=0; if(st==='corner'||st==='win'||st==='lose'){ tvx=ctl.mx||0; tvz=ctl.mz||0; }
   if(st==='down'||st==='corner')stamRegen();
  }
  // act from buffer
  if(this.buf&&this.noAct<=0&&(st==='idle'||st==='atk')){ const a=this.buf.act;
   if(a==='dodgeL'||a==='dodgeR'){ if(this.canDodge()){this.startDodge(a==='dodgeL'?1:-1);this.buf=null;} }
   else if(a==='special'){ if(this.special>=100&&this.canStart()){this.startSpecial();} this.buf=null; }
   else if(this.canStart()&&this.state!=='exh'){ this.startAttack(a); this.buf=null; } }
  // velocity and position
  if(st!=='dodge'&&st!=='hit'){ const k=1-Math.exp(-(moveMul>0?10:7)*dt); this.vel.x+=((st==='win'||st==='lose'||st==='corner')?tvx:tvx-this.vel.x*0)*0; this.vel.x=lerp(this.vel.x,tvx,k); this.vel.z=lerp(this.vel.z,tvz,k); }
  else if(st==='hit'){ const k=Math.exp(-7*dt); this.vel.x*=k; this.vel.z*=k; }
  this.pos.x+=this.vel.x*dt; this.pos.z+=this.vel.z*dt;
  const sp=Math.hypot(this.vel.x,this.vel.z); this.walk+=sp*dt*3; this.speedNow=sp;
 }
 animate(dt){
  const p=Object.assign({},BASE),t=this.t,st=this.state; let rate=14; const v=Math.hypot(this.vel.x,this.vel.z);
  p.hy+=Math.sin(t*5.2+this.idx)*.012; p.clz+=Math.sin(t*2.6+this.idx*2)*.02; p.blz+=Math.sin(t*2.6+this.idx*2)*.012; p.Lsy+=Math.sin(t*3.1)*.04; p.Rsy+=Math.sin(t*3.3+1)*.04; p.hdx+=Math.sin(t*2)*.02;
  if(v>.15&&(st==='idle'||st==='atk'||st==='exh')){ const k=Math.min(1,v/2.2),s=Math.sin(this.walk);
   p.Lhx+=s*.32*k; p.Rhx-=s*.32*k; p.Lkx+=Math.max(0,-s)*.5*k; p.Rkx+=Math.max(0,s)*.5*k; p.hy+=-Math.abs(Math.cos(this.walk))*.025*k; p.blx+=.06*k; }
  if(st==='idle'){ if(this.blocking){ mixPose(p,BLOCKP,1); rate=22; } else if(this.daze>70){ p.blz+=Math.sin(t*3)*.15; p.clz+=Math.sin(t*3.3)*.12; p.hdx+=.2; p.Lsx=-.6; p.Rsx=-.5; p.Lex=-1.4; p.Rex=-1.6; } }
  else if(st==='exh'){ mixPose(p,{clx:.65+Math.sin(t*8)*.06,blx:.3,hdx:.35,Lsx:-.15,Lsy:0,Lex:-.35,Rsx:-.15,Rsy:0,Rex:-.35,Lkx:.8,Rkx:.75,hy:-.1},1); }
  else if(st==='atk'){ const A=this.atk;
   if(A){ let W,S; if(A.special){ if(A.type==='thunder'){W=THUNDER.W;S=THUNDER.S;} else {const pp=PP[A.cur]||PP.jab;W=pp.W;S=pp.S;} } else {const pp=PP[A.type];W=pp.W;S=pp.S;}
    const e=A.su+A.ac;
    if(A.t<A.su){ mixPose(p,W,ease(A.t/A.su)); rate=A.special&&A.type==='thunder'?10:20; }
    else if(A.t<e){ mixPose(p,W,1); mixPose(p,S,1); rate=A.special&&A.type==='lightning'?60:50; if(A.special&&A.type==='lightning'){ const pp=PP[A.cur]||PP.jab; mixPose(p,pp.S,1); } }
    else { const r=ease((A.t-e)/A.rc); const q=Object.assign({},S); for(const k in q)q[k]=lerp(q[k],p[k],r); mixPose(p,q,1); rate=A.special&&A.type==='thunder'?9:18; } } }
  else if(st==='dodge'){ const u=this.dodgeT/this.dodgeDur,l=Math.sin(clamp(u,0,1)*Math.PI); mixPose(p,BLOCKP,.7*l); p.blz=-this.dodgeDir*.55*l; p.clz=-this.dodgeDir*.35*l; p.hy-=.14*l; p.hdx=.3; rate=30; }
  else if(st==='hit'){ const k=ease(this.hitT/this.hitDur),s=this.hitSide; rate=34; p.Lsx=lerp(p.Lsx,-.5,k); p.Lex=lerp(p.Lex,-1.2,k); p.Rsx=lerp(p.Rsx,-.5,k); p.Rex=lerp(p.Rex,-1.3,k);
   switch(this.hitKind){
    case 'upper': p.hdx-=1.0*k; p.clx-=.5*k; p.blx-=.3*k; p.hy+=.03*k; break;
    case 'body': p.clx+=.9*k; p.hdx+=.5*k; p.hy-=.1*k; break;
    case 'hookL': case 'hookR': p.hdy+=s*1.0*k; p.clz+=s*.3*k; p.hdx-=.1*k; p.cyaw+=s*.4*k; break;
    case 'break': p.Lsx=-.2*k+p.Lsx*(1-k); p.Rsx=-.2*k+p.Rsx*(1-k); p.clx-=.3*k; p.hdx-=.4*k; break;
    default: p.hdx-=.55*k; p.clx-=.3*k; p.blx-=.15*k; } }
  else if(st==='down'){ rate=9; mixPose(p,{fall:1,Lsx:-.1,Lsy:0,Lsz:1.2,Lex:-.2,Rsx:-.1,Rsy:0,Rsz:1.2,Rex:-.2,Lhx:-.25,Rhx:-.1,Lkx:.25,Rkx:.2,Lhz:.25,Rhz:-.25,hdx:.1,hdy:0,clx:Math.sin(t*3)*.05,cyaw:0,byaw:0,blx:0},1); }
  else if(st==='getup'){ const u=clamp(this.getT/1.2,0,1); rate=8; p.fall=Math.max(0,1-u*1.5); p.hy+=-.28*Math.sin(u*Math.PI)+(-.05); p.clx+=.4*(1-u); p.hdx+=.3*(1-u); mixPose(p,{Lsx:-.6,Lex:-1.4,Rsx:-.6,Rex:-1.4},1-u*.6); }
  else if(st==='win'){ rate=10; const b=Math.abs(Math.sin(t*5)); mixPose(p,{Lsx:-2.9,Lsy:.25,Lsz:.3,Lex:-.25,Rsx:-2.9,Rsy:.25,Rsz:.3,Rex:-.25,hy:.06+b*.1,hdx:-.25,hdy:0,byaw:-.2,cyaw:0,clx:-.1,blx:0,Lhx:-.1,Rhx:-.1,Lhz:.12,Rhz:-.12,Lkx:.2,Rkx:.2},1); }
  else if(st==='lose'){ rate=8; mixPose(p,{clx:.4+Math.sin(t*2)*.03,blx:.2,hdx:.55,hdy:0,Lsx:-.1,Lsy:0,Lex:-.2,Rsx:-.1,Rsy:0,Rex:-.2,Lkx:.35,Rkx:.3,hy:-.06},1); }
  else if(st==='corner'){ rate=8; mixPose(p,{clx:.25+Math.sin(t*3)*.05,hdx:.1,Lsx:-.2,Lsy:0,Lex:-.7,Rsx:-.2,Rsy:0,Rex:-.7,Lhx:-.1,Rhx:.1,Lkx:.2,Rkx:.2,byaw:-.3},1); }
  const kd=1-Math.exp(-rate*dt); for(let i=0;i<KEYS.length;i++){ const k=KEYS[i]; this.cur[k]+=(p[k]-this.cur[k])*kd; }
  applyPose(this.rig,this.cur); this.sync();
 }
}
