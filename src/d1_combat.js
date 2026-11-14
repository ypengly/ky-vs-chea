
/* ---------- game state ---------- */
const G={mode:null,phase:'menu',view:'menu',fighters:[null,null],round:1,rounds:3,roundLen:120,clock:120,pt:0,ts:1,slowT:0,hitStop:0,paused:false,
 cam:{t:0,shake:0,kick:0,special:null,focus:null},cards:[],ladder:0,opts:null,count:null,result:null,train:{done:{},dummy:'stand'},started:false,pick:S.pick||'KY',banners:0};
const fmt=t=>{t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');};

/* ---------- floating text ---------- */
const floats=[];
function floatText(text,f,color,size){ const el=document.createElement('div'); el.className='fl'; el.textContent=text; el.style.color=color||'#fff'; if(size)el.style.fontSize=size+'px'; $('floats').appendChild(el);
 const p=f.headPos(); p.y+=.35+rnd(0,.25); p.x+=rnd(-.25,.25); floats.push({el,p,t:0,life:1.1}); if(floats.length>14){const o=floats.shift();o.el.remove();} }
function updateFloats(dt){ for(let i=floats.length-1;i>=0;i--){ const o=floats[i]; o.t+=dt; if(o.t>o.life){o.el.remove();floats.splice(i,1);continue;}
  const v=o.p.clone(); v.y+=o.t*.7; v.project(camera); if(v.z>1){o.el.style.opacity=0;continue;} const k=o.t/o.life;
  o.el.style.left=((v.x*.5+.5)*innerWidth)+'px'; o.el.style.top=((-v.y*.5+.5)*innerHeight)+'px'; o.el.style.opacity=k<.1?k*10:1-Math.max(0,(k-.6)/.4); o.el.style.transform='translate(-50%,-50%) scale('+(1+(1-k)*.3)+')'; } }
function banner(text,sub,long,color){ const b=$('banner'); b.innerHTML=text+(sub?'<small>'+sub+'</small>':''); b.style.color=color||'#fff'; b.className=''; void b.offsetWidth; b.className='show'+(long?' long':''); }
function flashScreen(color,op){ const f=$('flash'); f.style.background=color||'radial-gradient(ellipse at center,transparent 35%,rgba(255,30,50,.65))'; f.style.transition='none'; f.style.opacity=op==null?.8:op; void f.offsetWidth; f.style.transition='opacity .5s'; f.style.opacity=0; }
function status(t){ $('status').textContent=t; }

/* ---------- hit resolution ---------- */
function resolveAttack(att,def,a,dmgBase,type,sp){
 if(def.state==='down'||def.state==='getup'||def.state==='win'||def.state==='lose')return 'miss';
 const dx=def.pos.x-att.pos.x,dz=def.pos.z-att.pos.z,dist=Math.hypot(dx,dz)||.001;
 const reach=a.reach*(att.cfg.height/1.8*.25+.75); if(dist>reach)return null;
 const fx=Math.sin(att.yaw),fz=Math.cos(att.yaw); if((dx*fx+dz*fz)/dist<.5)return null;
 if(def.iframes>0){ def.counterT=1.2; def.stats.dodged++; def.rs.def++; def.special=Math.min(100,def.special+4); floatText('DODGE','#9fd4ff'===0?def:def,'#9fd4ff',26); Snd.miss(); return 'dodge'; }
 const blocked=def.blocking&&def.state==='idle'&&def.stam>0;
 let dmg=dmgBase*att.dm; if(att.stam<att.maxSt*.2)dmg*=.7; dmg*=1+Math.min(.3,att.comboN*.04);
 let tag=null; const da=def.atk;
 if(att.counterT>0){dmg*=1.3;tag='COUNTER!';att.counterT=0;} else if(!blocked&&def.state==='atk'&&da&&da.t<da.su+da.ac){dmg*=1.3;tag='COUNTER!';}
 let crit=false; if(!blocked&&!sp&&(type==='upper'||type==='rhook'||type==='cross')&&Math.random()<.07+att.cfg.power/100*.07){crit=true;dmg*=1.5;tag='CRITICAL!';}
 if(def.state==='exh')dmg*=1.25; dmg*=def.taken; const scale=att.dmgScale; dmg*=scale;
 const head=(a.kind!=='body'); const pos=head?def.headPos():def.chestPos(); const dir={x:fx,z:fz};
 if(blocked){
  dmg*=a.block; def.stam-=dmg*1.1+1.5; def.stats.blocked++; def.rs.def+=.6; def.counterT=.9; def.special=Math.min(100,def.special+dmg*.6);
  if(a.heavy||a.force)def.hp=Math.max(def.noKO?10:0,def.hp-dmg*.45);
  if(G.mode==='train'&&def.human)trainMark('block'); Snd.block(); burst(pos,8,0x9fb4ff,2.2,dir); impactFlash(pos,.5,0x9fb4ff); floatText('BLOCK',def,'#c9d6ff',24); G.cam.shake+=.12;
  def.vel.x+=fx*.6;def.vel.z+=fz*.6; att.stats.thrown+=0;
  if(def.stam<=0){ def.stam=0; def.hitReact('break',.55,fx*1.2,fz*1.2,1); floatText('GUARD BROKEN',def,'#ffc548',28); }
  else if(a.heavy){ def.hitReact('break',.35,fx*1.6,fz*1.6,1); }
  return 'block';
 }
 const kdNow=!def.noKO;
 if(def.dmgLock)dmg=0;
 def.hp=Math.max(def.noKO?10:0,def.hp-dmg); def.daze+=scale>0?dmg*.7+dmg*dmg*.1+(a.daze||0)+(a.kind==='upper'?6:0):0; def.lastHit=0; def.comboN=0;
 att.stats.landed++; att.rs.landed++; att.rs.dmg+=dmg; att.stats.dmg+=dmg; if(dmg>=5.5)att.stats.power++;
 att.comboN++; att.comboT=1.8; att.bestCombo=Math.max(att.bestCombo,att.comboN);
 const boost=G.mode==='train'?3:1; att.special=Math.min(100,att.special+dmg*1.4*boost); def.special=Math.min(100,def.special+dmg*.8);
 if(G.mode==='train'&&att.human)trainHit(att,type);
 const push=clamp(dmg*.07,.25,2.8); const side=a.hand==='L'?1:-1;
 const kd=kdNow&&scale>0&&(def.hp<=0||def.daze>=100||a.force);
 burst(pos,Math.round(8+dmg*1.4),crit||a.heavy?0xffc548:0xffffff,3+dmg*.12,dir); impactFlash(pos,.6+dmg*.05,crit?0xffc548:0xffffff);
 floatText('-'+Math.max(1,Math.round(dmg)),def,crit?'#ffc548':'#ffffff',22+Math.min(18,dmg)); if(tag)floatText(tag,def,'#ffc548',30);
 Snd.punch(clamp(dmg/22,0,1)); if(a.heavy){Snd.heavy();} Snd.swell(clamp(dmg/25,.2,1),1.2); crowd.excite=Math.min(1.4,crowd.excite+dmg*.03);
 G.cam.shake+=clamp(dmg/16,.12,a.heavy?1.4:.8); G.hitStop=Math.max(G.hitStop,a.heavy?.12:dmg>10?.07:.035); if(dmg>8)flashScreen('radial-gradient(ellipse at center,transparent 50%,rgba(255,255,255,.25))',.5);
 if(def.human&&dmg>6)flashScreen(null,Math.min(.7,dmg/25));
 const da2=def.atk,armor=def.state==='atk'&&da2&&((da2.t>=da2.su&&da2.t<da2.su+da2.ac)||(def.cfg.power>=80&&da2.t<da2.su&&dmg<2.4));
 if(kd){ knockdown(def,att,a.heavy||crit); } else if(armor){ def.vel.x+=fx*push*.3; def.vel.z+=fz*push*.3; floatText('ARMOR',def,'#ffb13d',22); } else { def.hitReact(a.kind,a.stun*(.9+def.daze/220),fx*push,fz*push,side); }
 return 'hit';
}
function onSpecialStart(f){ G.cam.special={f,t:0,dur:f.spKind==='thunder'?1.9:1.7}; banner(f.cfg.special,'SPECIAL',false,f.idx===0?'#8db8ff':'#ff9aa3'); Snd.swell(1,1.6); if(G.mode==='train'&&f.human)trainMark('special'); }
function knockdown(def,att,heavy){
 def.state='down'; def.atk=null; def.buf=null; def.blocking=false; def.downT=0; def.getT=0; def.mash=0; def.kdRound++; def.kdTotal++; def.stats.kd++; att.stats.kd+=0; att.rs.kd++; def.rs.kd+=0;
 def.daze=35; def.comboN=0; def.vel.x*=.3; def.vel.z*=.3;
 const ko=def.hp<=0, tko=def.kdRound>=3;
 def.getReq=(ko||tko)?99:clamp(3.2+(1-def.hp/def.maxHp)*5.5+def.kdRound*.9+rnd(-.4,1),3,9.2);
 G.count={f:def,att,n:0,ko,tko,rising:false,rt:0,last:0}; G.phase='count'; G.slowT=1.3; G.view='kd'; G.cam.t=0; G.hitStop=Math.max(G.hitStop,.14);
 banner(ko?'KNOCKOUT?':'KNOCKDOWN!',null,false,'#ffc548'); Snd.ko(); Snd.swell(1,2.5); crowd.excite=1.4; G.cam.shake+=1; flashScreen('rgba(255,255,255,.6)',.7); status('Knockdown');
 att.state='idle'; att.atk=null; att.buf=null; att.exhaustAfter=false; att.ctl={mx:0,mz:0,block:false};
 const c=att.pos.x>=0?1:-1, cz=att.pos.z>=0?-1:1; G.cornerT={x:c*2.5,z:cz*2.3};
 if(G.mode==='pvai'||G.mode==='champ'){} $('bars').classList.add('on');
}

/* ---------- AI ---------- */
function makeAI(tier,mode){ return {tier,mode:mode||'fight',cd:rnd(.5,1.2),rea:null,blockT:0,q:[],qT:0,circ:1,circT:0,noRea:0,hurtT:0}; }
const COMBO_FAST=[['jab','jab','cross'],['jab','cross','lhook','rhook'],['jab','cross','lhook','upper'],['jab','jab','jab','cross'],['jab','body','cross','lhook'],['jab','cross'],['lhook','rhook','upper'],['jab','cross','body','rhook','upper']];
const COMBO_HEAVY=[['cross'],['rhook'],['lhook','rhook'],['jab','cross'],['upper'],['body','rhook'],['lhook'],['jab','rhook']];
function aiStep(f,opp,dt){
 const A=f.ai,T=A.tier,ctl={mx:0,mz:0,block:false};
 const react=lerp(.55,.14,T),blockP=lerp(.2,.78,T),dodgeP=lerp(.08,.4,T),aggr=A.mode==='spar'?.3:lerp(.3,.9,T);
 if(A.mode==='stand')return ctl; if(A.mode==='guard'){ctl.block=true;return ctl;}
 const dx=opp.pos.x-f.pos.x,dz=opp.pos.z-f.pos.z,dist=Math.hypot(dx,dz)||1,ax=dx/dist,az=dz/dist,px=-az,pz=ax;
 const heavy=f.cfg.power>f.cfg.speed, pref=heavy?1.25:1.6;
 if(A.noRea>0)A.noRea-=dt; const oa=opp.atk;
 if(oa&&oa.t<oa.su+oa.ac&&dist<2.1&&!A.rea&&A.noRea<=0&&f.state==='idle'){ const r=Math.random(); A.rea={t:react*rnd(.7,1.3),act:r<blockP?'block':(r<blockP+dodgeP?(Math.random()<.5?'dodgeL':'dodgeR'):null)}; }
 if(A.rea){ A.rea.t-=dt; if(A.rea.t<=0){ if(A.rea.act==='block')A.blockT=.5; else if(A.rea.act)f.queue(A.rea.act); A.rea=null; A.noRea=.45; } }
 if(f.state==='hit'&&!A.hurtT){A.hurtT=1; if(Math.random()<blockP)A.blockT=.55;} if(f.state!=='hit')A.hurtT=0;
 if(A.blockT>0){A.blockT-=dt;ctl.block=true;}
 const retreat=f.stam<f.maxSt*.22||f.state==='exh'; let want=retreat?2.4:pref,mv=0;
 if(dist>want+.2)mv=1; else if(dist<want-.3)mv=-1;
 A.circT-=dt; if(A.circT<=0){A.circ=pick([-1,0,1,1,-1]);A.circT=rnd(.6,1.8);}
 let mx=ax*mv+px*A.circ*.7-f.pos.x*.12,mz=az*mv+pz*A.circ*.7-f.pos.z*.12; const m=Math.hypot(mx,mz); if(m>1){mx/=m;mz/=m;} ctl.mx=mx; ctl.mz=mz;
 if(A.mode==='spar'&&dist<1.2){ctl.mx=-ax*.5;ctl.mz=-az*.5;}
 A.cd-=dt;
 if(A.q.length&&!f.buf&&f.canStart()&&f.state!=='exh'){ A.qT-=dt; if(A.qT<=0){ f.queue(A.q.shift()); A.qT=rnd(0,.08); } }
 if(!A.q.length&&A.cd<=0&&f.state==='idle'&&dist<1.55&&!retreat&&opp.state!=='down'){
  const vuln=opp.state==='exh'||opp.state==='hit'; if(vuln||Math.random()<dt*(1+aggr*3.2)){ const pool=heavy?COMBO_HEAVY:COMBO_FAST; let c=pick(pool); if(!heavy&&aggr<.45)c=c.slice(0,Math.max(1,Math.ceil(c.length/2)));
   A.q=c.slice(); A.cd=rnd(.5,1.5)*(1.55-aggr)*(.6+f.ts*.5); if(Math.random()<.35&&!heavy)A.q.push(pick(['lhook','upper','body'])); } }
 if(f.special>=100&&f.state==='idle'&&dist<1.7&&A.mode!=='spar'&&Math.random()<dt*1.3)f.queue('special');
 return ctl;
}

/* ---------- training drills ---------- */
const DRILLS=[['jab','Left jab'],['cross','Right cross'],['lhook','Left hook'],['rhook','Right hook'],['upper','Uppercut'],['body','Body punch'],['block','Block a punch'],['dodge','Dodge'],['combo','3-hit combo'],['special','Special']];
function trainBuild(){ $('drills').innerHTML=DRILLS.map(d=>'<li data-d="'+d[0]+'">'+d[1]+'</li>').join(''); G.train.done={}; }
function trainMark(k){ if(G.train.done[k])return; G.train.done[k]=1; const li=document.querySelector('#drills li[data-d="'+k+'"]'); if(li)li.classList.add('ok'); Snd.ui();
 if(Object.keys(G.train.done).length>=DRILLS.length){ banner('DRILLS COMPLETE','NICE WORK',true,'#3ddc97'); setTimeout(()=>{ if(G.mode==='train')trainBuild(); },3500); } }
function trainHit(att,type){ trainMark(type); if(att.comboN>=3)trainMark('combo'); }
