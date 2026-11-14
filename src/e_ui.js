
/* ---------- screens ---------- */
function showScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id)); }
function hideScreens(id){ if(id){const e=$(id);e&&e.classList.remove('on');return;} document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on')); }
const isTouchDev=(window.matchMedia&&matchMedia('(pointer:coarse)').matches)||'ontouchstart' in window;
const touchOn=()=>S.touch==='on'||(S.touch==='auto'&&isTouchDev);
function applyTouch(){ $('touch').classList.toggle('on',touchOn()&&$('hud').classList.contains('on')); setHints(); }
function setHints(){ const h=$('hints'); if(touchOn()){h.textContent='';return;}
 h.innerHTML=G.mode==='pvp'?'P1: WASD move, J K U I O L punch, SPACE block, Q E dodge, SHIFT special<br>P2: Arrows move, Num4 5 7 8 9 6 punch, Num0 block, Num1 3 dodge, Enter special':'WASD move - J jab - K cross - U / I hooks - O uppercut - L body<br>SPACE block - Q / E dodge - SHIFT special'; }
function leaveMatch(){ $('hud').classList.remove('on'); $('touch').classList.remove('on'); $('train').classList.remove('on'); $('bars').classList.remove('on'); $('count').classList.remove('on'); $('banner').className='';
 floats.splice(0).forEach(o=>o.el.remove()); G.paused=false; G.shown=false; G.mode=null; G.count=null; setupStage('menu'); led.names=['KY','CHEA']; drawLED(led.t); showScreen('sc-menu'); }

/* ---------- cards, settings ---------- */
const STATS=[['Power','power'],['Speed','speed'],['Stamina','stamina'],['Defense','defense'],['Health','health']];
function buildCards(){ $('selCards').innerHTML=['KY','CHEA'].map(id=>{ const c=ROSTER[id],cl=id==='KY'?'blue':'red';
  return '<button class="card '+cl+(G.pick===id?' on':'')+'" data-pick="'+id+'"><div class="lbl">'+c.corner+' CORNER - '+c.style+'</div><h3>'+c.name+'</h3>'+
   STATS.map(s=>'<div class="stat"><span>'+s[0]+'</span><i><b style="width:'+c[s[1]]+'%"></b></i><em>'+c[s[1]]+'</em></div>').join('')+
   '<p class="mini"><b>'+c.special+'</b><br>'+c.bio+'</p></button>'; }).join(''); }
const SET=[['Difficulty','diff',[['easy','Easy'],['normal','Normal'],['hard','Hard']]],['Rounds','rounds',[[1,'1'],[3,'3'],[5,'5']]],['Round length','roundTime',[[60,'1:00'],[120,'2:00'],[180,'3:00']]],
 ['Sound','sfx',[[true,'On'],[false,'Off']]],['Camera shake','shake',[[true,'On'],[false,'Off']]],['Graphics (reload for crowd)','quality',[['high','High'],['low','Low']]],['Touch controls','touch',[['auto','Auto'],['on','On'],['off','Off']]]];
function buildSettings(){ $('setList').innerHTML=SET.map((s,i)=>'<div class="set"><span class="lbl">'+s[0]+'</span><div class="seg" data-set="'+i+'">'+s[2].map((o,j)=>'<button data-v="'+j+'" class="'+(S[s[1]]===o[0]?'on':'')+'">'+o[1]+'</button>').join('')+'</div></div>').join('')+
 '<div class="set"><span class="lbl">Volume</span><input type="range" id="vol" min="0" max="100" value="'+Math.round(S.vol*100)+'" aria-label="Volume"></div>'; $('vol').oninput=e=>{S.vol=e.target.value/100;Snd.setVol();saveS();}; }
function buildDummySeg(){ const el=$('dummySeg'); const opts=[['stand','Stand'],['guard','Guard'],['spar','Spar']]; el.innerHTML=opts.map(o=>'<button data-dm="'+o[0]+'" class="'+(G.train.dummy===o[0]?'on':'')+'">'+o[1]+'</button>').join(''); }
const DIFF={easy:.2,normal:.5,hard:.85};
const me=()=>ROSTER[G.pick], other=()=>ROSTER[G.pick==='KY'?'CHEA':'KY'], hi=()=>G.pick==='KY'?0:1;
function slots(mine,theirs){ return hi()===0?[mine,theirs]:[theirs,mine]; }
function launch(mode){ const s=slots(me(),other()); startMatch({mode,c0:s[0],c1:s[1],hi:hi(),tier:mode==='train'?.4:DIFF[S.diff],aiMode:mode==='train'?'stand':'fight',label:mode==='train'?'TRAINING':''}); }
function ladderCfg(i){ return i<2?LADDER[i]:Object.assign({},other(),{tier:.95}); }
function startLadder(){ const op=ladderCfg(G.ladder),s=slots(me(),op); startMatch({mode:'champ',c0:s[0],c1:s[1],hi:hi(),tier:op.tier,label:'BOUT '+(G.ladder+1)+' OF 3'}); }

/* ---------- break / result ---------- */
function buildBreak(){ const [a,b]=G.fighters,n=G.cards[0].length; let h='<tr><th>Scorecard</th>'; for(let r=0;r<n;r++)h+='<th>R'+(r+1)+'</th>'; h+='<th>Total</th></tr>';
 const tot=judgeTotals(); G.cards.forEach((c,j)=>{ h+='<tr><td>Judge '+(j+1)+'</td>'+c.map(r=>'<td><span style="color:var(--blue2)">'+r[0]+'</span> - <span style="color:var(--red2)">'+r[1]+'</span></td>').join('')+'<td><b>'+tot[j][0]+' - '+tot[j][1]+'</b></td></tr>'; });
 h+='<tr><td>Landed / thrown</td><td colspan="'+(n+1)+'"><span style="color:var(--blue2)">'+a.cfg.name+' '+a.stats.landed+'/'+a.stats.thrown+'</span> &nbsp; <span style="color:var(--red2)">'+b.cfg.name+' '+b.stats.landed+'/'+b.stats.thrown+'</span></td></tr>';
 $('brkTable').innerHTML=h; $('brkLbl').textContent='End of round '+G.round+' - blue '+a.cfg.name+' vs red '+b.cfg.name; $('brkTime').textContent=fmt(G.breakT); }
function updateBreakTimer(){ $('brkTime').textContent=fmt(G.breakT); }
function showResult(){
 const r=G.result,[a,b]=G.fighters,w=r.w,wf=w>=0?G.fighters[w]:null; const acc=f=>f.stats.thrown?Math.round(f.stats.landed/f.stats.thrown*100)+'%':'-';
 $('resLbl').textContent=!wf?'Result':r.method==='POINTS'?'Winner by decision':r.method==='KO'?'Winner by knockout':'Winner by technical knockout';
 const t=$('resTitle'); t.textContent=wf?wf.cfg.name:'DRAW'; t.style.color=w===0?'var(--blue2)':w===1?'var(--red2)':'var(--gold)';
 const el=r.time; $('resSub').textContent=r.method==='POINTS'?judgeTotals().map(x=>x[0]+'-'+x[1]).join('  |  '):(r.method+' - round '+r.round+' - '+Math.floor(el/60)+':'+String(Math.floor(el%60)).padStart(2,'0'));
 const playerWon=wf&&wf.human; const champ=G.mode==='champ'; const final=champ&&G.ladder>=2;
 $('resBelt').innerHTML=champ&&playerWon&&final?'<div class="belt">WORLD CHAMPION</div>':'';
 if(champ&&playerWon&&final)$('resLbl').textContent='You are the champion';
 const row=(l,x,y)=>'<tr><td>'+l+'</td><td class="b">'+x+'</td><td class="r">'+y+'</td></tr>';
 $('resTable').innerHTML='<tr><th></th><th>'+a.cfg.name+'</th><th>'+b.cfg.name+'</th></tr>'+row('Punches landed',a.stats.landed,b.stats.landed)+row('Punches thrown',a.stats.thrown,b.stats.thrown)+row('Accuracy',acc(a),acc(b))+
  row('Power punches',a.stats.power,b.stats.power)+row('Knockdowns scored',a.stats.kd,b.stats.kd)+row('Blocks',a.stats.blocked,b.stats.blocked)+row('Dodges',a.stats.dodged,b.stats.dodged)+row('Damage dealt',Math.round(a.stats.dmg),Math.round(b.stats.dmg))+row('Best combo',a.bestCombo,b.bestCombo);
 let btn=''; if(champ){ if(playerWon&&!final)btn+='<button class="btn hot sm" data-act="nextopp"><span>Next opponent</span></button>'; else if(!playerWon)btn+='<button class="btn hot sm" data-act="rematch"><span>Try again</span></button>'; }
 else btn+='<button class="btn hot sm" data-act="rematch"><span>Rematch</span></button>';
 btn+='<button class="btn sm" data-act="quit"><span>Main menu</span></button>'; $('resBtns').innerHTML=btn;
 $('hud').classList.remove('on'); $('touch').classList.remove('on'); $('train').classList.remove('on'); showScreen('sc-result'); }

/* ---------- actions ---------- */
function pauseGame(){ if(G.paused||!['fight','ready','count'].includes(G.phase))return; G.paused=true; showScreen('sc-pause'); }
function resumeGame(){ if(!G.paused)return; G.paused=false; hideScreens(); }
const ACTIONS={
 mode(){ $('pvaiSub').textContent=S.rounds+' round'+(S.rounds>1?'s':'')+', '+S.diff+' AI'; showScreen('sc-mode'); },
 select(){ setupStage('select'); buildCards(); showScreen('sc-select'); },
 train(){ launch('train'); }, settings(){ buildSettings(); showScreen('sc-settings'); }, how(){ showScreen('sc-how'); },
 back(){ if(G.phase==='select'){ S.pick=G.pick; saveS(); setupStage('menu'); } showScreen('sc-menu'); },
 pvai(){ launch('pvai'); }, pvp(){ launch('pvp'); }, champ(){ G.ladder=0; startLadder(); },
 nextround(){ nextRound(); }, nextopp(){ G.ladder++; startLadder(); }, rematch(){ G.shown=false; startMatch(G.opts); },
 resume(){ resumeGame(); }, restart(){ G.paused=false; G.shown=false; startMatch(G.opts); }, quit(){ leaveMatch(); }
};
document.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b)return; Snd.init(); Snd.resume();
 if(b.dataset.act&&ACTIONS[b.dataset.act]){ Snd.ui(); ACTIONS[b.dataset.act](); b.blur(); return; }
 if(b.dataset.pick){ G.pick=b.dataset.pick; S.pick=G.pick; saveS(); buildCards(); Snd.ui(); return; }
 if(b.dataset.dm){ G.train.dummy=b.dataset.dm; const p=G.partner; if(p&&p.ai){ p.ai.mode=b.dataset.dm; p.dmgScale=.35; } buildDummySeg(); b.blur(); return; }
 const seg=b.closest('[data-set]'); if(seg){ const s=SET[+seg.dataset.set],o=s[2][+b.dataset.v]; S[s[1]]=o[0]; saveS();
  if(s[1]==='sfx'){Snd.setVol();updateMute();} if(s[1]==='quality'){ renderer.shadowMap.enabled=S.quality!=='low'; sun.castShadow=S.quality!=='low'; renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,S.quality==='low'?1.25:2)); resize(); }
  if(s[1]==='touch')applyTouch(); buildSettings(); Snd.ui(); }
});
$('btnPause').addEventListener('click',()=>pauseGame());
function updateMute(){ $('btnMute').textContent=S.sfx?'SFX':'OFF'; }
$('btnMute').addEventListener('click',e=>{ S.sfx=!S.sfx; Snd.setVol(); saveS(); updateMute(); e.target.blur(); }); updateMute();
document.addEventListener('visibilitychange',()=>{ if(document.hidden)pauseGame(); });

/* ---------- input ---------- */
const K1={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD',block:['Space']};
const K2={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',block:['Numpad0','Slash']};
const ACT={};
[['KeyJ','jab'],['KeyK','cross'],['KeyU','lhook'],['KeyI','rhook'],['KeyO','upper'],['KeyL','body'],['KeyQ','dodgeL'],['KeyE','dodgeR'],['ShiftLeft','special']].forEach(([c,a])=>ACT[c]={p:0,a});
[['Numpad4','jab'],['Numpad5','cross'],['Numpad7','lhook'],['Numpad8','rhook'],['Numpad9','upper'],['Numpad6','body'],['Numpad1','dodgeL'],['Numpad3','dodgeR'],['NumpadEnter','special'],
 ['Digit1','jab'],['Digit2','cross'],['Digit3','lhook'],['Digit4','rhook'],['Digit5','upper'],['Digit6','body'],['Comma','dodgeL'],['Period','dodgeR'],['ShiftRight','special']].forEach(([c,a])=>ACT[c]={p:1,a});
const keys=new Set(), joy={x:0,y:0}, tch={block:false};
const GAMEKEYS=new Set(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Tab','Slash']);
function sendAct(pl,act){ const ph=G.phase; if(ph!=='fight'&&ph!=='count'&&ph!=='ready')return; const f=G.fighters.find(x=>x&&x.human&&x.pl===pl); if(!f)return; if(ph==='ready'&&G.mode!=='train')return; f.queue(act); }
addEventListener('keydown',e=>{
 Snd.init(); const inMatch=['fight','count','ready','roundEnd'].includes(G.phase)&&!G.paused;
 if(e.code==='Escape'||e.code==='KeyP'){ if(G.paused)resumeGame(); else pauseGame(); e.preventDefault(); return; }
 if(e.code==='Enter'&&G.phase==='break'){ nextRound(); e.preventDefault(); return; }
 if(inMatch&&(GAMEKEYS.has(e.code)||ACT[e.code]||e.code===K1.up||e.code===K1.left||e.code===K1.down||e.code===K1.right)){ e.preventDefault(); }
 if(e.repeat){ if(inMatch)keys.add(e.code); return; } keys.add(e.code);
 const m=ACT[e.code]; if(m&&inMatch){ if(m.p===1&&G.mode!=='pvp'){ return; } sendAct(m.p,m.a); }
});
addEventListener('keyup',e=>keys.delete(e.code)); addEventListener('blur',()=>keys.clear());
const kd=c=>keys.has(c);
function readInput(pl){
 const m=pl===0?K1:K2; let ix=(kd(m.right)?1:0)-(kd(m.left)?1:0),iy=(kd(m.up)?1:0)-(kd(m.down)?1:0); let block=m.block.some(kd);
 if(pl===0&&G.mode!=='pvp'){ ix+=(kd('ArrowRight')?1:0)-(kd('ArrowLeft')?1:0); iy+=(kd('ArrowUp')?1:0)-(kd('ArrowDown')?1:0); }
 if(pl===0){ ix+=joy.x; iy+=joy.y; block=block||tch.block; }
 const l=Math.hypot(ix,iy); if(l>1){ix/=l;iy/=l;}
 return {mx:G.camR.x*ix+G.camF.x*iy,mz:G.camR.z*ix+G.camF.z*iy,block};
}
/* touch */
const stick=$('stick'),knob=$('knob'); let stickId=null;
function stickMove(e){ const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,R=r.width/2-14; let dx=e.clientX-cx,dy=e.clientY-cy; const l=Math.hypot(dx,dy); if(l>R){dx*=R/l;dy*=R/l;} knob.style.transform='translate('+dx+'px,'+dy+'px)'; joy.x=dx/R; joy.y=-dy/R; }
stick.addEventListener('pointerdown',e=>{ stickId=e.pointerId; stick.setPointerCapture(e.pointerId); stickMove(e); e.preventDefault(); });
stick.addEventListener('pointermove',e=>{ if(e.pointerId===stickId)stickMove(e); });
const stickEnd=e=>{ if(e.pointerId!==stickId)return; stickId=null; joy.x=joy.y=0; knob.style.transform='translate(0,0)'; };
stick.addEventListener('pointerup',stickEnd); stick.addEventListener('pointercancel',stickEnd);
document.querySelectorAll('#touch .tb').forEach(b=>{
 b.addEventListener('pointerdown',e=>{ e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('dn'); Snd.init(); if(b.dataset.act)sendAct(0,b.dataset.act); if(b.dataset.hold==='block')tch.block=true; });
 const up=()=>{ b.classList.remove('dn'); if(b.dataset.hold==='block')tch.block=false; }; b.addEventListener('pointerup',up); b.addEventListener('pointercancel',up); b.addEventListener('contextmenu',e=>e.preventDefault());
});
document.addEventListener('contextmenu',e=>e.preventDefault());

/* ---------- boot ---------- */
try{
 setupStage('menu'); showScreen('sc-menu'); buildCards(); window.__kycs={G,S,ROSTER,startMatch,Fighter,aiStep,update,launch,scene,camera,THREE_:THREE};
 requestAnimationFrame(t=>{ last=t; frame(t); setTimeout(()=>$('boot').classList.add('off'),250); });
}catch(err){ $('boot').textContent='Could not start: '+err.message; console.error(err); }
})();
