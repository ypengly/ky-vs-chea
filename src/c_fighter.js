
/* ---------- roster ---------- */
const ROSTER={
 KY:{id:'KY',name:'KY',corner:'BLUE',height:1.96,shoulder:.31,torso:1.22,arm:.092,leg:.098,head:.118,skin:0x7a4c30,hair:0x0c0c0c,trunk:0x2458d6,trunk2:0xffffff,glove:0x2f7bff,shoe:0x10131f,
  power:95,speed:40,stamina:70,defense:75,health:100,style:'Heavy puncher',special:'THUNDER SMASH',
  bio:'A heavyweight with broad shoulders and a finishing hook. Every clean shot rattles the building. Slow to recover and hungry for stamina.'},
 CHEA:{id:'CHEA',name:'CHEA',corner:'RED',height:1.74,shoulder:.235,torso:.98,arm:.062,leg:.07,head:.108,skin:0x93653f,hair:0x0c0c0c,trunk:0xd92632,trunk2:0x111111,glove:0xff3d4d,shoe:0x10131f,
  power:65,speed:95,stamina:100,defense:70,health:100,style:'Speed and endurance',special:'RED LIGHTNING',
  bio:'Lean, quick and never tired. Slips heavy punches, answers with long combinations and wins rounds by volume.'}
};
const LADDER=[
 Object.assign({},ROSTER.CHEA,{id:'SOKHA',name:'SOKHA',corner:'RED',trunk:0x1f9d55,trunk2:0xffd23f,glove:0x23b765,skin:0xc9966b,power:52,speed:78,stamina:80,defense:55,style:'Journeyman jabber',tier:.3}),
 Object.assign({},ROSTER.KY,{id:'VIREAK',name:'VIREAK',corner:'RED',height:1.88,trunk:0x6b2fb3,trunk2:0xffc548,glove:0x8d4be0,skin:0x8a5a3a,power:80,speed:50,stamina:75,defense:68,style:'Slugger',tier:.58}),
 null
];
const ATK={
 jab:{dmg:4,st:4,su:.09,ac:.07,rc:.17,reach:1.5,lunge:.5,block:.2,hand:'L',stun:.13,kind:'head',nm:'JAB'},
 cross:{dmg:8,st:7,su:.15,ac:.07,rc:.26,reach:1.65,lunge:.8,block:.25,hand:'R',stun:.2,kind:'head',nm:'CROSS'},
 lhook:{dmg:10,st:9,su:.2,ac:.08,rc:.3,reach:1.45,lunge:.7,block:.35,hand:'L',stun:.26,kind:'hookL',nm:'L HOOK'},
 rhook:{dmg:12,st:11,su:.25,ac:.08,rc:.34,reach:1.5,lunge:.75,block:.35,hand:'R',stun:.3,kind:'hookR',nm:'R HOOK'},
 upper:{dmg:13,st:12,su:.27,ac:.08,rc:.38,reach:1.3,lunge:.5,block:.5,hand:'R',stun:.36,kind:'upper',nm:'UPPERCUT'},
 body:{dmg:9,st:8,su:.19,ac:.08,rc:.3,reach:1.4,lunge:.6,block:.5,hand:'L',stun:.28,kind:'body',nm:'BODY'}
};
const ACTS=['jab','cross','lhook','rhook','upper','body'];

/* ---------- procedural fighter rig ---------- */
const KEYS=['hy','byaw','blx','blz','cyaw','clx','clz','hdx','hdy','Lsx','Lsy','Lsz','Lex','Lez','Rsx','Rsy','Rsz','Rex','Rez','Lhx','Lhz','Lkx','Rhx','Rhz','Rkx','fall'];
const BASE={hy:0,byaw:-.55,blx:.12,blz:0,cyaw:-.1,clx:.12,clz:0,hdx:.2,hdy:.55,Lsx:-1,Lsy:0,Lsz:.1,Lex:-1.9,Lez:0,Rsx:-.85,Rsy:-.35,Rsz:0,Rex:-2.3,Rez:0,Lhx:-.42,Lhz:.14,Lkx:.5,Rhx:.3,Rhz:-.14,Rkx:.45,fall:0};
function buildRig(cfg){
 const H=cfg.height,sh=cfg.shoulder,hw=sh*.62,arm=cfg.arm,leg=cfg.leg,hr=cfg.head,ref=!!cfg.ref;
 const thigh=.255*H,shin=.245*H,foot=.04*H,chestH=.29*H,ua=.17*H,fa=.15*H;
 const skin=stdMat(cfg.skin,.55),trunk=stdMat(cfg.trunk,.5),trunk2=stdMat(cfg.trunk2,.5),glove=stdMat(cfg.glove,.32,.1),shoe=stdMat(cfg.shoe||0x111111,.5);
 const torsoM=ref?stdMat(cfg.shirt,.7):skin, pants=stdMat(0x101218,.7), hairM=stdMat(cfg.hair||0x0c0c0c,.8), dk=stdMat(0x111111,.6), white=stdMat(0xffffff,.5);
 const root=new THREE.Group(),body=new THREE.Group(); body.rotation.order='YXZ'; root.add(body);
 const add=(geo,m,parent,x,y,z,sx,sy,sz)=>{const o=new THREE.Mesh(geo,m);o.position.set(x||0,y||0,z||0);if(sx!==undefined)o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;};
 const cyl=(r0,r1,h,s)=>new THREE.CylinderGeometry(r0,r1,h,s||12), sph=(r,w,h)=>new THREE.SphereGeometry(r,w||12,h||10);
 /* pelvis */
 add(cyl(hw*1.1,hw*1.3,.17*H,16),ref?pants:trunk,body,0,-.01*H,0,1,1,.8);
 add(cyl(hw*1.13,hw*1.13,.035*H,16),ref?pants:trunk2,body,0,.075*H,0,1,1,.8);
 /* chest */
 const chest=new THREE.Group(); chest.rotation.order='YXZ'; chest.position.y=.04*H; body.add(chest);
 add(cyl(sh*1.12,hw*1.05,chestH,18),torsoM,chest,0,chestH/2,0,1,1,.6*cfg.torso);
 if(!ref){ [-1,1].forEach(s=>{ add(sph(sh*.44),skin,chest,s*sh*.48,chestH*.76,sh*.3*cfg.torso*1.1,1,.78,.62);
   for(let i=0;i<3;i++){ const y=chestH*(.12+.15*i), r=hw*1.05+(sh*1.12-hw*1.05)*(y/chestH); add(sph(hw*.3),skin,chest,s*hw*.3,y,r*.6*cfg.torso*.93,1,.85,.5); } }); }
 add(cyl(.06*H*(cfg.torso>1.1?1.1:.95),.065*H,.05*H,10),skin,chest,0,chestH+.015*H,0);
 /* head */
 const head=new THREE.Group(); head.rotation.order='YXZ'; head.position.y=chestH+.04*H; chest.add(head);
 add(sph(hr,18,14),skin,head,0,hr*.95,0,.9,1.08,.98); add(sph(hr*.5,12,8),skin,head,0,hr*.38,hr*.34,1,.7,.9);
 const hair=add(new THREE.SphereGeometry(hr*1.04,16,10,0,TAU,0,Math.PI*.52),hairM,head,0,hr*.98,-hr*.04,.92,1.08,1); hair.rotation.x=-.3;
 [-1,1].forEach(s=>{ add(sph(hr*.1,8,6),dk,head,s*hr*.33,hr*1.06,hr*.84); add(new THREE.BoxGeometry(hr*.34,hr*.06,hr*.06),hairM,head,s*hr*.33,hr*1.2,hr*.86); add(sph(hr*.2,8,6),skin,head,s*hr*.9,hr*.95,0,.5,1,.8); });
 add(sph(hr*.14,8,6),skin,head,0,hr*.9,hr*.98,1,1,1.1); add(new THREE.BoxGeometry(hr*.46,hr*.09,hr*.08),white,head,0,hr*.55,hr*.86);
 /* arms */
 function makeArm(side){ const s=side==='L'?1:-1;
  const shd=new THREE.Group(); shd.rotation.order='YXZ'; shd.position.set(s*sh*1.02,chestH*.96,0); chest.add(shd);
  add(sph(arm*1.55),ref?torsoM:skin,shd); add(cyl(arm*1.12,arm*.88,ua,12),ref?torsoM:skin,shd,0,-ua/2,0);
  const el=new THREE.Group(); el.rotation.order='YXZ'; el.position.y=-ua; shd.add(el); add(sph(arm*.9),skin,el);
  add(cyl(arm*.88,arm*.68,fa,12),skin,el,0,-fa/2,0);
  const hand=new THREE.Group(); hand.position.y=-fa; el.add(hand);
  if(ref){ add(sph(arm*1.1),skin,hand,0,-arm*.9,0); }
  else { add(sph(arm*1.9,16,12),glove,hand,0,-arm*1.5,arm*.12,1.05,1.12,1.2); add(cyl(arm*1.25,arm*1.25,arm*1.3,12),trunk2,hand,0,arm*.1,0); add(sph(arm*.7,8,6),glove,hand,-s*arm*1.4,-arm*1.1,arm*.9,1,1,1.2); }
  return {sh:shd,el,hand}; }
 const L=makeArm('L'),R=makeArm('R');
 /* legs */
 function makeLeg(side){ const s=side==='L'?1:-1;
  const hip=new THREE.Group(); hip.rotation.order='YXZ'; hip.position.set(s*hw*.78,-.01*H,0); body.add(hip);
  add(cyl(leg*1.3,leg*.98,thigh,12),ref?pants:skin,hip,0,-thigh/2,0);
  if(!ref)add(cyl(leg*1.42,leg*1.4,thigh*.45,14),trunk,hip,0,-thigh*.22,0);
  const knee=new THREE.Group(); knee.rotation.order='YXZ'; knee.position.y=-thigh; hip.add(knee); add(sph(leg*.95),ref?pants:skin,knee);
  add(cyl(leg*.95,leg*.72,shin,12),ref?pants:skin,knee,0,-shin/2,0);
  add(new THREE.BoxGeometry(leg*2.1,foot*1.25,.16*H),shoe,knee,0,-shin-foot*.45,.045*H); add(new THREE.BoxGeometry(leg*2.15,foot*.35,.165*H),white,knee,0,-shin-foot*1.02,.045*H);
  if(!ref)add(new THREE.BoxGeometry(leg*2.15,foot*.3,.05*H),trunk2,knee,0,-shin-foot*.3,.1*H);
  return {hip,knee}; }
 const LL=makeLeg('L'),RL=makeLeg('R');
 return {root,body,chest,head,L,R,leg:{L:LL,R:RL},dim:{thigh,shin,foot,H,chestH,ua,fa}};
}
function setArm(a,p,side,Y){ const k=side; const sx=p[k+'sx'],sy=p[k+'Sy']; const wy=p[k+'sy'],sz=p[k+'sz'],ex=p[k+'ex'],ez=p[k+'ez'];
 const left=side==='L'; a.sh.rotation.set(sx,(left?wy:-wy)-Y,left?sz:-sz); a.el.rotation.set(ex,0,left?ez:-ez); }
function applyPose(rig,p){
 const d=rig.dim, fall=p.fall;
 const dl=(d.thigh*Math.cos(p.Lhx)+d.shin*Math.cos(p.Lhx+p.Lkx))*Math.cos(p.Lhz)+d.foot, dr=(d.thigh*Math.cos(p.Rhx)+d.shin*Math.cos(p.Rhx+p.Rkx))*Math.cos(p.Rhz)+d.foot;
 const stand=Math.max(dl,dr)+p.hy+.01*d.H;
 rig.body.position.set(0,lerp(stand,.2,fall),lerp(0,-.3,fall));
 rig.body.rotation.set(p.blx-fall*1.5,p.byaw,p.blz);
 rig.chest.rotation.set(p.clx,p.cyaw,p.clz); rig.head.rotation.set(p.hdx,p.hdy,0);
 const Y=p.byaw+p.cyaw; setArm(rig.L,p,'L',Y); setArm(rig.R,p,'R',Y);
 rig.leg.L.hip.rotation.set(p.Lhx,0,p.Lhz); rig.leg.L.knee.rotation.set(p.Lkx,0,0); rig.leg.R.hip.rotation.set(p.Rhx,0,p.Rhz); rig.leg.R.knee.rotation.set(p.Rkx,0,0);
}
const ease=u=>{u=clamp(u,0,1);return u*u*(3-2*u);};
function mixPose(a,b,k){ for(const key in b)a[key]=lerp(a[key],b[key],k); }
/* punch poses (left arm authored; sy>0 swings outward, ez<0 folds the forearm across) */
const PP={
 jab:{W:{Lsx:-.8,Lex:-2.3,cyaw:-.25,hdx:.25},S:{Lsx:-1.5,Lsy:0,Lsz:0,Lex:-.06,cyaw:.12,clx:.2,byaw:-.4,hy:-.03,Rsx:-.9,Rsy:-.3,Rex:-2.4}},
 cross:{W:{Rsx:-.6,Rex:-2.5,cyaw:-.4,byaw:-.75,hy:-.04},S:{Rsx:-1.5,Rsy:-.1,Rsz:0,Rex:-.06,cyaw:.55,byaw:-.1,clx:.25,hy:-.05,Rhx:-.05,Lsx:-.9,Lsy:.1,Lex:-2.2}},
 lhook:{W:{Lsx:-1.45,Lsy:1.15,Lsz:0,Lex:0,Lez:-1.5,cyaw:-.95,byaw:-.6},S:{Lsx:-1.45,Lsy:.05,Lsz:0,Lex:0,Lez:-1.5,cyaw:.55,byaw:-.1,clx:.15,hy:-.04}},
 rhook:{W:{Rsx:-1.45,Rsy:1.15,Rsz:0,Rex:0,Rez:-1.5,cyaw:-.55,byaw:-.8},S:{Rsx:-1.45,Rsy:.05,Rsz:0,Rex:0,Rez:-1.5,cyaw:.75,byaw:.05,clx:.15,hy:-.05}},
 upper:{W:{Rsx:-.2,Rex:-.9,Rsy:-.3,hy:-.2,clx:.4,cyaw:-.4,Rhx:.15},S:{Rsx:-.95,Rsy:-.25,Rex:-2.2,hy:.04,clx:-.05,cyaw:.5,byaw:-.2,hdx:-.1}},
 body:{W:{Lsx:-.8,Lsy:.7,Lex:0,Lez:-1.2,hy:-.24,clx:.6,cyaw:-.55},S:{Lsx:-.95,Lsy:.1,Lex:0,Lez:-1.3,cyaw:.5,hy:-.28,clx:.62,hdx:.3}}
};
const BLOCKP={hy:-.05,clx:.3,blx:.18,hdx:.4,Lsx:-.78,Lsy:-.4,Lsz:0,Lex:-2.55,Rsx:-.78,Rsy:-.4,Rsz:0,Rex:-2.55};
const STAGGER_COUNT=3;
