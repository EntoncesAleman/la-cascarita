'use strict';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const defs={
 leaf:{title:'Un poquito de verde.',label:'UN DIENTE. UNA HOJITA.',instructions:'Arrastrá desde cualquier parte para mover la lengua. Apoyala despacio sobre la hojita hasta despegarla y después bajala sin apurarte. Si la empujás de golpe, vuelve a meterse.',quote:'“Debe ser un poquito de perejil.”',meter:'HOJITA DESPEGADA'},
 bomb:{title:'Un ajuste pendiente.',label:'UN PANEL. UN PEQUEÑO AJUSTE.',instructions:'Revisá el panel. Podés tocar sus cables, el botón o el selector, consultar las instrucciones o validar el estado. El reloj está corriendo.',quote:'“Parece bastante claro.”',meter:'VERIFICACIÓN'},
 tape:{title:'Encontrá la punta.',label:'UN ROLLO. NADA MÁS.',instructions:'Agarrá la pestaña y hacé tirones cortos hacia la derecha. Podés soltar y volver a agarrar para seguir. Si tirás de golpe o te desviás, se corta.',quote:'“Seguro está por acá.”',meter:'CINTA DESPEGADA'},
 usb:{title:'Del otro lado.',label:'TRES CABLES. TRES PUERTOS.',instructions:'Conectá los tres cables. Elegí uno, giralo si hace falta y probá los puertos. Sus colores no garantizan que sean compatibles. Sostené cada conector alineado para enchufarlo.',quote:'“Probá del otro lado.”',meter:'CABLES CONECTADOS'},
 sheet:{title:'La sábana ajustable.',label:'UNA SÁBANA. CUATRO ESQUINAS.',instructions:'Poné un dedo en cada esquina y mantené los cuatro a la vez durante un momento. Si soltás uno, se escapa esa esquina. En computadora, mantené A, S, K y L simultáneamente.',quote:'“La primera ya estaba puesta.”',meter:'CUATRO ESQUINAS A LA VEZ'},
 screw:{title:'Una vueltita más.',label:'UN TORNILLO. UNA VUELTA MÁS.',instructions:'Presioná y dibujá círculos alrededor de la cabeza del tornillo, despacio y en sentido horario. Soltá al llegar al punto justo. Si seguís girando, la madera se agrieta y se parte. Girar hacia atrás afloja el tornillo, pero no repara las grietas.',quote:'“Le falta apenas una vueltita.”',meter:'ROSCA AJUSTADA'},
 needle:{title:'Enhebrá eso.',label:'UN HILO. UNA AGUJA.',instructions:'Arrastrá desde cualquier parte para mover el hilo. La aguja se mueve: alineá la punta con su ojo y atravesalo de izquierda a derecha. No alcanza con apoyarla. Humedecer la punta ayuda.',quote:'“Con buena luz sería fácil.”',meter:'PUNTA ENHEBRADA'}
};
let mode=null,state=null,pressed=false,origin=null,lastPointer=null,tick=0,lastFrame=0;
let mx=190,my=310;const W=900,H=660;
const screwLimits={ready:.96,over:1.08,break:1.26};
let activePointer=null,inputType='mouse',grabOffset={x:0,y:0};
const corners=[{x:210,y:208},{x:685,y:208},{x:685,y:462},{x:210,y:462}];
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function rand(a,b){return a+Math.random()*(b-a)}
function setQuote(x){$('quote').textContent=x}
function sound(){/* Diseño sin audio obligatorio */ }
function init(m){
 document.body.classList.add('is-playing');mode=m;sheetPointers.clear();sheetKeys.clear();activePointer=null;pressed=false;origin=null;lastPointer=null;tick=0;mx=190;my=310;
 state={attempts:0,elapsed:0,started:performance.now(),finished:false,progress:0,heat:0,fail:0,grabbing:false,penalty:0,tipAngle:rand(-1.8,1.8),peel:0,rotation:0,position:{x:170,y:330},fitted:[false,false,false,false],stripped:0,angle:null,thread:{x:175,y:350},wetUntil:0,threadHold:0,needleWobble:0,motion:0,peelStart:0,peelSpan:200,tapeGrip:0,dockHold:0,socketFace:Math.floor(rand(0,2)),cornerIndex:null,cornerHold:0,lastCorner:null,sheetHold:0,threadStage:'approach',threadInsertion:0,tightness:0,woodDamage:0,woodBroken:false,outcome:null,screwHint:'loose',tongue:{x:450,y:425},leaf:{x:494,y:267},leafLoosen:0,leafAttached:false,bombRemaining:45,bombPending:0,bombChoice:null,bombMessage:'Panel en espera'};
 if(m==='usb')createUSB();
 $('hero').style.display='none';$('catalog').style.display='none';$('arcade').classList.add('visible');$('game-title').textContent=defs[m].title.toUpperCase();$('game-subtitle').textContent='Dificultad estimada: baja';$('input-help').textContent={leaf:'Deslizá para mover la lengua. Despegá la hojita y bajala despacio.',bomb:'Revisá el panel y elegí un ajuste. Todavía hay tiempo.',tape:'Sostené la pestaña un instante. Tirones cortos a la derecha; soltá y repetí.',usb:'Conectá los tres cables. Probá puertos: los colores pueden engañar.',sheet:'Un dedo en cada esquina: sostené los cuatro a la vez. En compu: A + S + K + L.',screw:'Girá despacio y soltá en el punto justo. Una vuelta de más puede partir la madera.',needle:'Mové el hilo desde cualquier parte. Atravesá el ojo de izquierda a derecha.'}[m];
 $('task-image').src='assets/'+m+(['leaf','bomb'].includes(m)?'.svg':'-960.webp');$('task-image').alt=defs[m].title;$('task-caption').textContent=defs[m].title;
 $('canvas-label').textContent=defs[m].label;$('instructions').textContent=defs[m].instructions;$('meter-label').textContent=defs[m].meter;
 $('overlay').classList.remove('on');setQuote(defs[m].quote);actions();location.hash=m;
 window.scrollTo({top:0,behavior:'smooth'});
}
function actions(){
 let html='';
 if(mode==='bomb')html='<button id="manual">Consultar instrucciones</button><button id="verify">Validar panel</button>';
 if(mode==='usb')html='<button id="rotate">↻ Girar conector</button>';
 if(mode==='needle')html='<button id="lick">👅 Chupar el hilo</button>';
 if(mode==='tape')html='<button id="find">🔎 Mirar de cerca</button>';
 if(mode==='sheet')html='<span class="input-help">4 dedos · En compu: A + S + K + L</span>';
 if(mode==='screw')html='<button id="steady">Respirar un segundo</button>';
 $('actions').innerHTML=html;
 const bind=(id,fn)=>{const n=$(id);if(n)n.onclick=fn};
 bind('manual',()=>bombAction('manual'));bind('verify',()=>bombAction('check'));
 bind('rotate',()=>{let c=cable();if(!c||c.connected){const next=state.usbCables.find(v=>!v.connected);if(!next)return;state.activeCable=next.id;c=next;}c.face=(c.face+1)%2;state.dockHold=0;state.attempts++;setQuote('“Cable '+c.label+' girado. Probá ahora.”');});
 bind('lick',()=>{state.wetUntil=performance.now()+6500;state.threadHold=0;setQuote('“Sí. Acabás de chupar el hilo. Está temporalmente rígido.”')});
 bind('find',()=>{state.tipAngle=0;state.attempts++;setQuote('“Ahí estaba. ¿Y ahora cómo lo despegás?”')});
 bind('steady',()=>{state.stripped=Math.max(0,state.stripped-.26);setQuote('“Respirás. El tornillo no.”')});
}
function failure(msg){
 state.attempts++;state.fail++;state.penalty=.45;state.grabbing=false;state.threadHold=0;state.dockHold=0;state.cornerHold=0;
 setQuote(msg); if(mode==='tape'){state.peel=Math.max(0,state.peel-.17);state.progress=state.peel}
 if(mode==='usb'){const c=cable();if(c&&!c.connected)c.position={...c.home};}
 if(mode==='needle'){state.thread={x:175,y:350};state.heat=Math.min(1,state.heat+.12)}
 if(mode==='screw')state.stripped=clamp(state.stripped+.22,0,1);
 if(mode==='sheet')state.heat=clamp(state.heat+.18,0,1);
}
function win(){
 if(mode==='bomb'){explodeBomb();return}
 if(state.finished)return;state.finished=true;state.outcome='won';state.progress=1;
 $('overlay-title').textContent='¿Al fin?';$('overlay-text').textContent='Lo conseguiste en '+fmt(state.elapsed)+' y '+state.attempts+' intentos. La humanidad esperaba menos de vos.';
 $('again').textContent='Sufrir otra vez →';$('overlay').classList.add('on');setQuote('“Una victoria absolutamente innecesaria.”');
}
function fmt(s){return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function touchRadius(px,base){return inputType==='touch'?Math.max(base,px*W/canvas.getBoundingClientRect().width):base}
const usbColors=[{name:'coral',base:'#da7b6d',light:'#f3b6a1',dark:'#984a49'},{name:'azul',base:'#69a9c2',light:'#acd7df',dark:'#3f718f'},{name:'amarillo',base:'#dfb14e',light:'#f7d991',dark:'#a47e32'}];
let sheetPointers=new Map(),sheetKeys=new Set();
function createUSB(){
 const choices=[[1,2,0],[2,0,1],[0,2,1],[1,0,2],[2,1,0]],wiring=choices[Math.floor(rand(0,choices.length))];
 state.usbPorts=usbColors.map((color,i)=>({id:i,color,face:Math.floor(rand(0,2)),occupiedBy:null,y:210+i*125}));
 state.usbCables=usbColors.map((color,i)=>({id:i,label:'ABC'[i],color,port:wiring[i],face:Math.floor(rand(0,2)),connected:false,home:{x:185,y:210+i*125},position:{x:185,y:210+i*125}}));
 state.activeCable=0;
}
function cable(){return state.usbCables[state.activeCable]}
function socket(index=0,now=performance.now()){const port=state.usbPorts[index];return{x:655,y:port.y+Math.sin(now/1100+index)*8}}
function dockCable(){
 const c=cable(),port=state.usbPorts[c.port];c.connected=true;c.position={x:655,y:port.y};port.occupiedBy=c.id;
 state.grabbing=false;state.dockHold=0;state.progress=state.usbCables.filter(c=>c.connected).length/3;
 setQuote('“Cable '+c.label+' conectado. '+(state.usbCables.filter(c=>!c.connected).length?'Vamos con el siguiente.':'Listo.')+'”');
 if(state.usbCables.every(c=>c.connected))win();
}
function syncSheet(){
 if(!state||state.finished)return;
 const old=state.fitted.filter(Boolean).length;
 state.fitted=corners.map((_,i)=>sheetKeys.has(i)||Array.from(sheetPointers.values()).some(p=>p.corner===i&&p.inside));
 const n=state.fitted.filter(Boolean).length;state.grabbing=n>0;
 if(n<4)state.sheetHold=0;
 if(!old&&n)state.attempts++;
 if(n<old)setQuote('“No sueltes: las cuatro esquinas al mismo tiempo.”');
}
function sheetDown(e){
 if(!state||state.finished)return;e.preventDefault();inputType=e.pointerType||'mouse';
 if(inputType==='mouse'){setQuote('“En compu: mantené A, S, K y L a la vez.”');return}
 if(sheetPointers.has(e.pointerId))return;
 const p=point(e),i=corners.findIndex(v=>distance(v,p)<touchRadius(23,65));
 if(i<0||Array.from(sheetPointers.values()).some(v=>v.corner===i))return;
 canvas.setPointerCapture(e.pointerId);sheetPointers.set(e.pointerId,{corner:i,inside:true});syncSheet();
 setQuote('“'+state.fitted.filter(Boolean).length+' de cuatro dedos. No los levantes.”');
}
function sheetMove(e){
 const held=sheetPointers.get(e.pointerId);if(!held||!state||state.finished)return;e.preventDefault();
 held.inside=distance(point(e),corners[held.corner])<touchRadius(30,80);syncSheet();
}
function sheetUp(e){
 if(e&&e.pointerId!==undefined)sheetPointers.delete(e.pointerId);else{sheetPointers.clear();sheetKeys.clear()}
 syncSheet();
}
function sheetKey(e,down){
 if(mode!=='sheet'||!state||state.finished||e.ctrlKey||e.metaKey||e.altKey)return;
 const i=['a','s','k','l'].indexOf(String(e.key||'').toLowerCase());if(i<0)return;e.preventDefault();
 if(down)sheetKeys.add(i);else sheetKeys.delete(i);syncSheet();
}
function needleEye(now=performance.now()){return{x:620+Math.sin(now/1570)*25,y:310+Math.sin(now/1070)*29+Math.sin(now/2470)*8,tilt:Math.sin(now/1920)*.12}}
function needleLocal(p,eye){const x=p.x-eye.x,y=p.y-eye.y;return{x:x*Math.cos(eye.tilt)+y*Math.sin(eye.tilt),y:-x*Math.sin(eye.tilt)+y*Math.cos(eye.tilt)}}
function needleWorld(p,eye){return{x:eye.x+p.x*Math.cos(eye.tilt)-p.y*Math.sin(eye.tilt),y:eye.y+p.x*Math.sin(eye.tilt)+p.y*Math.cos(eye.tilt)}}
function snagThread(msg){
 const eye=needleEye(),local=needleLocal(state.thread,eye);state.attempts++;state.fail++;state.threadStage='approach';state.threadInsertion=0;state.penalty=.15;
 state.thread=needleWorld({x:-32,y:clamp(local.y,-24,24)},eye);
 if(lastPointer)grabOffset={x:state.thread.x-lastPointer.x,y:state.thread.y-lastPointer.y};setQuote(msg);
}
function moveThread(p,dt,speed,now){
 const previous=state.thread,eye=needleEye(now),oldEye=needleEye(now-dt*1000),old=needleLocal(previous,oldEye),next=needleLocal(p,eye);
 const wet=now<state.wetUntil,tol=touchRadius(wet?7:4.5,wet?14:7);
 state.thread={x:clamp(p.x,45,825),y:clamp(p.y,105,570)};
 if(state.threadStage==='approach'&&old.x<0&&next.x>=0&&Math.abs(next.y)<70){
  const at=clamp(-old.x/(next.x-old.x||1),0,1),crossY=old.y+(next.y-old.y)*at;
  if(Math.abs(crossY)>tol||speed>(wet?230:155)){snagThread('“Pegó en el borde. Ajustá la punta y volvé a pasar.”');return}
  state.threadStage='through';setQuote('“Entró. Ahora pasá el hilo hacia el otro lado.”');
 }
 if(state.threadStage==='through'){
  if(next.x< -6){state.threadStage='approach';state.threadInsertion=0;return}
  if(Math.abs(next.y)>tol||speed>(wet?230:155)){snagThread('“Se salió del ojo. La punta sigue en tu mano.”');return}
  state.threadInsertion=clamp(next.x/42,0,1);state.progress=.4+state.threadInsertion*.6;
  if(next.x>=42&&p.x>previous.x)win();
 }else state.progress=clamp(1-distance(state.thread,eye)/500,0,1)*.4;
}

function slipLeaf(){
 const gaps=[366,430,494,558];state.leaf={x:gaps[Math.floor(rand(0,gaps.length))],y:267};state.leafAttached=false;state.leafLoosen=Math.max(0,state.leafLoosen-.35);state.penalty=.25;state.fail++;state.attempts++;setQuote('“Se volvió a meter entre los dientes. Ahí está.”');
}
function moveTongue(p,speed){
 state.tongue={x:clamp(p.x,240,665),y:clamp(p.y,235,490)};
 if(state.leafAttached){if(speed>210){slipLeaf();return}state.leaf={...state.tongue};if(state.tongue.y>470){win();return}}
 else if(distance(state.tongue,state.leaf)<65&&speed>170)slipLeaf();
}
const bombWires=[{x:310,color:'#d2746d'},{x:405,color:'#6ca6bd'},{x:500,color:'#dcb14e'},{x:595,color:'#9e94be'}];
function bombAction(action){
 if(mode!=='bomb'||!state||state.finished||state.bombPending>0)return;
 state.attempts++;state.bombChoice=action;state.bombPending=1.45;state.progress=.82;state.bombMessage={wire:'Circuito aislado. Comprobando estabilidad…',button:'Temporizador en pausa. Confirmando…',dial:'Señal sincronizada. Guardando ajuste…',manual:'Procedimiento encontrado. Aplicando…',check:'Panel correcto. Verificación final…'}[action]||'Verificando…';setQuote('“'+state.bombMessage+'”');
}
function explodeBomb(){
 if(!state||state.finished)return;state.finished=true;state.outcome='exploded';state.grabbing=false;state.progress=.99;state.fail++;
 $('overlay-title').textContent='Estaba casi.';$('overlay-text').textContent={wire:'El circuito estaba estable. La bomba lo tomó mal.',button:'Pausaste el reloj. El resto siguió con sus planes.',dial:'La señal era perfecta. Demasiado perfecta.',manual:'La nota decía «ver edición anterior».',check:'Faltaba una última comprobación. Esta era.'}[state.bombChoice]||'Se terminó el tiempo. Parecía que alcanzaba.';
 $('again').textContent='Esta vez sí →';$('overlay').classList.add('on');setQuote('“La próxima seguro.”');
}
function bombTouch(p){
 if(p.y>230&&p.y<365)return'wire';if(distance(p,{x:330,y:455})<80)return'button';if(distance(p,{x:647,y:455})<75)return'dial';return'check';
}

function down(e){
 if(mode==='sheet'){sheetDown(e);return}
 if(!mode||state.finished||state.penalty>0||activePointer!==null)return;
 e.preventDefault();inputType=e.pointerType||'mouse';activePointer=e.pointerId;canvas.setPointerCapture(e.pointerId);
 const p=point(e);pressed=true;origin=p;lastPointer=p;tick=performance.now();state.motion=0;mx=p.x;my=p.y;grabOffset={x:0,y:0};
 if(mode==='leaf'){state.grabbing=true;grabOffset={x:state.tongue.x-p.x,y:state.tongue.y-p.y};state.attempts++;}
 if(mode==='bomb')bombAction(bombTouch(p));
 if(mode==='tape'){const tip=tapeGeometry().tip;if(distance(p,tip)<touchRadius(22,37)){state.grabbing=true;state.tapeGrip=0;state.peelStart=state.peel;state.peelSpan=Math.max(80,Math.min(200,W-p.x-28));mx=tip.x;my=tip.y;grabOffset={x:tip.x-p.x,y:tip.y-p.y};setQuote('“La agarraste. Tirones cortos, sin apurarte.”')}else failure('“Eso no era la punta.”')}
 if(mode==='usb'){const options=state.usbCables.filter(c=>!c.connected).sort((a,b)=>distance(p,a.position)-distance(p,b.position)),c=options[0];if(c&&distance(p,c.position)<touchRadius(25,82)){state.activeCable=c.id;state.grabbing=true;state.dockHold=0;grabOffset={x:c.position.x-p.x,y:c.position.y-p.y};setQuote('“Cable '+c.label+'. A ver dónde entra.”')}else setQuote('“Elegí uno de los cables que todavía están sueltos.”')}
 if(mode==='screw'){const r=distance(p,{x:450,y:330});if(r<touchRadius(38,115)){state.grabbing=true;state.angle=r>=26?Math.atan2(p.y-330,p.x-450):null}else failure('“El destornillador patinó en la mesa.”')}
 if(mode==='needle'){state.grabbing=true;grabOffset={x:state.thread.x-p.x,y:state.thread.y-p.y};setQuote('“El hilo ya está en tu mano. Ahora, el ojo de la aguja.”')}
}
function move(e){
 if(mode==='sheet'){sheetMove(e);return}
 if(e.pointerId!==activePointer||!mode||!pressed||state.finished)return;e.preventDefault();
 const raw=point(e),prev=lastPointer||raw,d=distance(raw,prev),now=performance.now();
 const dt=Math.max(.008,Math.min(.12,(now-tick)/1000||.016));tick=now;lastPointer=raw;
 const p={x:raw.x+grabOffset.x,y:raw.y+grabOffset.y};mx=p.x;my=p.y;
 // Touch thresholds use screen distance, rather than multiplying phone movement by canvas scale.
 const scale=inputType==='touch'?canvas.getBoundingClientRect().width/W/.75:1;
 const speed=d/dt*scale;state.motion=speed;
 if(state.penalty>0||!state.grabbing)return;
 if(mode==='tape'){
 if(Math.max(0,raw.x-origin.x)>touchRadius(8,12)&&state.tapeGrip<.38){failure('“La pestaña sigue pegada. Sostené antes de tirar.”');return}
 if(speed>270-state.peel*55){failure('“Se cortó. Probá un tirón más lento.”');return}
 const delta=Math.max(0,raw.x-origin.x);state.peel=clamp(state.peelStart+Math.min(1,delta/state.peelSpan)*.38,0,1);state.progress=state.peel;
 state.heat=clamp(state.heat+(speed>170?.45:-.12)*dt,0,1);
 if(Math.abs(raw.y-origin.y)>touchRadius(43,115)){failure('“La cinta se dobló sobre sí misma.”');return}
 if(state.heat>=1){failure('“La cinta se pegó sobre sí misma. Volvé a la pestaña.”');state.heat=.2}if(state.peel>=1)win();
 }
 if(mode==='usb'){
 const c=cable();c.position={x:clamp(p.x,80,790),y:clamp(p.y,145,540)};
 const near=state.usbPorts.map(port=>({port,d:distance(c.position,socket(port.id))})).sort((a,b)=>a.d-b.d)[0];
 const count=state.usbCables.filter(v=>v.connected).length;state.progress=(count+clamp(1-near.d/450,0,.7))/3;
 if(near.d<45){if(near.port.occupiedBy!==null)failure('“Ese puerto ya está ocupado.”');else if(c.port!==near.port.id)failure('“Mismo conector, otra compatibilidad. El color no ayudó.”');else if(c.face!==near.port.face)failure('“Es el puerto, pero la otra cara. Girá el cable.”');else if(speed>190)failure('“Más despacio. Se salió del puerto.”')}
 }
 if(mode==='screw'){
 const r=distance(p,{x:450,y:330}),angle=Math.atan2(p.y-330,p.x-450);
 if(r<26){state.angle=null;return}
 if(r>touchRadius(44,115)){failure('“La punta se salió de la ranura.”');return}
 if(state.angle===null){state.angle=angle;return}
 const dr=Math.atan2(Math.sin(angle-state.angle),Math.cos(angle-state.angle));state.angle=angle;
 if(Math.abs(dr)/dt>4.5){failure('“Patinó. Girá a un ritmo constante.”');return}
 if(dr>0){state.tightness+=dr/30;state.stripped=Math.max(0,state.stripped-dt*.025)}
 else if(dr<-.025){state.tightness=Math.max(0,state.tightness+dr/25);state.stripped=clamp(state.stripped+Math.abs(dr)*.12,0,1)}
 updateWood();
 if(!state.finished&&state.stripped>=1){failure('“La cabeza está barrida. Aflojá la presión.”');state.stripped=.58}
 }
 if(mode==='needle')moveThread(p,dt,speed,now);
 if(mode==='leaf')moveTongue(p,speed);
}
function updateWood(){
 state.progress=clamp(state.tightness,0,1);
 state.woodDamage=Math.max(state.woodDamage,clamp((state.tightness-screwLimits.over)/(screwLimits.break-screwLimits.over),0,1));
 if(state.woodDamage>=1){breakWood();return}
 const hint=state.tightness>screwLimits.over?'over':state.tightness>=screwLimits.ready?'ready':'loose';
 if(hint!==state.screwHint){state.screwHint=hint;setQuote(hint==='ready'?'“Ya está. Soltá. No le des otra vuelta.”':hint==='over'?'“Está crujiendo. Aflojá un poco.”':'“Todavía le falta un poquito.”')}
}
function breakWood(){
 if(state.finished)return;state.woodBroken=true;state.woodDamage=1;state.finished=true;state.outcome='broken';state.grabbing=false;state.fail++;state.attempts++;
 $('overlay-title').textContent='La madera se partió.';$('overlay-text').textContent='Una vueltita de más. La próxima, soltá el tornillo al llegar a la zona verde.';$('again').textContent='Cambiar la tabla →';$('overlay').classList.add('on');setQuote('“El tornillo aguantó. La madera, no.”');
}
function up(e){
 if(mode==='sheet'){sheetUp(e);return}
 if(e&&e.pointerId!==undefined&&e.pointerId!==activePointer)return;
 const finish=mode==='screw'&&state&&!state.finished&&pressed&&state.grabbing&&e&&e.type==='pointerup'&&state.tightness>=screwLimits.ready&&state.tightness<=screwLimits.over;
 pressed=false;activePointer=null;
 if(state){state.grabbing=false;state.cornerHold=0;state.cornerIndex=null;state.threadHold=0;state.dockHold=0;state.tapeGrip=0}
 if(finish)win();
}
function advance(dt,now){
 if(!state||state.finished)return;
 state.elapsed=(now-state.started)/1000;state.penalty=Math.max(0,state.penalty-dt);state.heat=Math.max(0,state.heat-dt*.045);
 if(now-tick>100)state.motion=0;
 if(mode==='bomb'){
 if(state.bombPending>0){state.bombPending=Math.max(0,state.bombPending-dt);state.progress=.82+(1-state.bombPending/1.45)*.16;if(state.bombPending===0)explodeBomb();}
 else{state.bombRemaining=Math.max(0,state.bombRemaining-dt);if(state.bombRemaining===0)explodeBomb();}return;
 }
 if(mode==='sheet'){
 syncSheet();const n=state.fitted.filter(Boolean).length;
 if(n===4){state.sheetHold+=dt;if(state.sheetHold>=1.6)win()}else state.sheetHold=0;
 if(!state.finished)state.progress=n/4*.7+Math.min(1,state.sheetHold/1.6)*.3;return;
 }
 if(!pressed||!state.grabbing||state.penalty>0)return;
 if(mode==='leaf'){
 if(!state.leafAttached){if(distance(state.tongue,state.leaf)<30&&state.motion<110){state.leafLoosen=Math.min(1,state.leafLoosen+dt/1.15);if(state.leafLoosen>=1){state.leafAttached=true;setQuote('“La tenés. Bajá la lengua. Despacio.”');}}else state.leafLoosen=Math.max(0,state.leafLoosen-dt*.18);state.progress=state.leafLoosen*.7;}
 else state.progress=.7+clamp((state.tongue.y-267)/210,0,1)*.29;
 }
 if(mode==='tape')state.tapeGrip=Math.min(.38,state.tapeGrip+dt);

 if(mode==='usb'){
 const c=cable();if(!c||c.connected)return;
 const port=state.usbPorts[c.port],target=socket(c.port),near=distance(c.position,target)<42,aligned=Math.abs(c.position.y-target.y)<touchRadius(4,8);
 if(near&&aligned&&c.face===port.face&&port.occupiedBy===null&&state.motion<95){state.dockHold+=dt;state.progress=(state.usbCables.filter(v=>v.connected).length+.7+Math.min(1,state.dockHold/1.1)*.3)/3;if(state.dockHold>=1.1)dockCable()}
 else state.dockHold=Math.max(0,state.dockHold-dt*2);
 }
 if(mode==='needle'&&state.threadStage==='through'){
 const eye=needleEye(now),local=needleLocal(state.thread,eye),wet=now<state.wetUntil,tol=touchRadius(wet?7:4.5,wet?14:7);
 if(Math.abs(local.y)>tol)snagThread('“Se movió la aguja. Volvé a alinear la punta.”');
 else if(local.x< -6){state.threadStage='approach';state.threadInsertion=0;}
 }
}

function shape(draw){ctx.beginPath();draw();ctx.fill();ctx.stroke()}
function rect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function circle(x,y,r,fill,stroke,lw=2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function line(x,y,a,b,color='#667568',width=3){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function text(x,y,s,size=16,col='#5d6759',align='center'){ctx.fillStyle=col;ctx.font=size+'px DM Sans, sans-serif';ctx.textAlign=align;ctx.fillText(s,x,y)}
const palette={ink:'#35473d',sage:'#92a58a',paper:'#faf7eb',line:'#c8cfbc',rust:'#b96748',gold:'#e9c16b'};
function path(points,fill,stroke=palette.ink,width=2){ctx.beginPath();points(ctx);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function oval(x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
function arrow(x,y,ex,ey,col=palette.rust){line(x,y,ex,ey,col,3);let a=Math.atan2(ey-y,ex-x);line(ex,ey,ex-12*Math.cos(a-.5),ey-12*Math.sin(a-.5),col,3);line(ex,ey,ex-12*Math.cos(a+.5),ey-12*Math.sin(a+.5),col,3)}
function pill(x,y,label,col=palette.ink){ctx.font='600 13px DM Sans, sans-serif';let w=ctx.measureText(label).width+28;rect(x-w/2,y-18,w,32,16,palette.paper,palette.line);text(x,y+3,label,13,col)}
function guide(x,y,ex,ey,label){line(x,y,ex,ey,'#87967e',1.5);circle(x,y,3,palette.ink);pill(ex,ey,label)}
function dotted(x,y,r,col=palette.rust){ctx.save();ctx.setLineDash([5,6]);circle(x,y,r,'transparent',col,2);ctx.restore()}
function shade(y,h,top,bottom){const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,top);g.addColorStop(1,bottom);return g;}
function scene(){
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.clearRect(0,0,W,H);ctx.fillStyle=shade(0,H,'#f5e8cc','#e9d7ad');ctx.fillRect(0,0,W,H);
 // Flat vector work surface, with generous space around the contact points.
 rect(35,74,830,542,28,'#c9bb9766');rect(35,65,830,542,26,shade(65,542,'#fff8e6','#f3e8cd'),'#e0cfaa');
 line(65,67,835,67,'#fffdf3',3);
 if(mode==='tape')drawTape();if(mode==='usb')drawUSB();if(mode==='sheet')drawSheet();if(mode==='screw')drawScrew();if(mode==='needle')drawNeedle();if(mode==='leaf')drawLeaf();if(mode==='bomb')drawBomb();
 if(state.penalty>0){rect(280,77,340,36,18,'#f5e0d0');text(450,101,mode==='tape'?'La cinta se soltó. Volvé a la pestaña.':mode==='leaf'?'Se escapó la hojita. Probá más suave.':'Volvé a intentar, despacio.',14,'#9a4d32')}
 ctx.restore();
}
// One projection defines the visible roll, attached ribbon, and interactive cut edge.
function tapeGeometry(){
 const center={x:340,y:278},rx=192,ry=105,depth=100,tilt=-.24;
 const project=(x,y)=>({x:center.x+x*Math.cos(tilt)-y*Math.sin(tilt),y:center.y+x*Math.sin(tilt)+y*Math.cos(tilt)});
 const seam=.66+clamp(state.tipAngle,-1.8,1.8)/1.8*.2;
 const sx=rx*Math.cos(seam),sy=ry*Math.sin(seam);
 const top=project(sx,sy),bottom=project(sx,sy+depth);
 const tip=project(sx+48+state.peel*34,sy+depth/2-12-state.peel*12);
 return{center,rx,ry,depth,tilt,project,top,bottom,tip};
}
function drawTape(){
 const g=tapeGeometry();oval(370,482,223,30,'#ac946b3d');
 ctx.save();ctx.translate(g.center.x,g.center.y);ctx.rotate(g.tilt);
 // Front band of a short cylinder, bounded by the same projected ellipses as its top.
 path(c=>{c.moveTo(g.rx,0);c.lineTo(g.rx,g.depth);c.ellipse(0,g.depth,g.rx,g.ry,0,0,Math.PI);c.lineTo(-g.rx,0);c.ellipse(0,0,g.rx,g.ry,0,Math.PI,0,true);c.closePath()},shade(25,170,'#f5d18b','#cf9c4d'),'#b48846',2.5);
 for(let a=.17;a<Math.PI;a+=.22){const x=Math.cos(a)*g.rx,y=Math.sin(a)*g.ry;line(x,y+7,x,y+g.depth-7,'#ffe4ab80',1.5);}
 // The center really is an opening: the inner cardboard wall sits below the upper rim.
 oval(0,0,98,54,'#a58a64','#977a52');
 ctx.save();ctx.beginPath();ctx.ellipse(0,0,98,54,0,0,Math.PI*2);ctx.clip();
 rect(-102,-60,204,132,0,shade(-50,120,'#aa8760','#d5b78c'));
 oval(0,47,93,50,'#f2e4c7','#947650');ctx.restore();
 ctx.beginPath();ctx.ellipse(0,0,g.rx,g.ry,0,0,Math.PI*2);ctx.moveTo(98,0);ctx.ellipse(0,0,98,54,0,0,Math.PI*2,true);
 ctx.fillStyle=shade(-105,210,'#fff0bd','#e8be6b');ctx.fill('evenodd');ctx.strokeStyle='#b28d4f';ctx.lineWidth=2;ctx.stroke();
 for(const r of [.59,.66,.74,.82,.90,.96]){ctx.beginPath();ctx.ellipse(0,0,g.rx*r,g.ry*r,0,0,Math.PI*2);ctx.strokeStyle='#d7b16a99';ctx.lineWidth=1;ctx.stroke();}
 ctx.beginPath();ctx.ellipse(0,0,g.rx-6,g.ry-5,0,Math.PI*1.08,Math.PI*1.86);ctx.strokeStyle='#fff8dc';ctx.lineWidth=5;ctx.stroke();
 ctx.beginPath();ctx.ellipse(0,0,101,57,0,0,Math.PI*2);ctx.strokeStyle='#fff3d0';ctx.lineWidth=3;ctx.stroke();
 ctx.restore();
 // The peeled tape is the cylinder's full-width outer band, not a separate floating marker.
 const end=state.grabbing?{x:mx,y:my}:g.tip;
 const half={x:-Math.sin(g.tilt)*g.depth*.43,y:Math.cos(g.tilt)*g.depth*.43};
 const upper={x:end.x-half.x,y:end.y-half.y},lower={x:end.x+half.x,y:end.y+half.y};
 const curl=state.grabbing?Math.min(42,Math.max(8,(end.x-g.top.x)*.15)):18;
 // A small cast shadow makes the lifted flap legible against the side of the roll.
 path(c=>{c.moveTo(g.top.x+3,g.top.y+9);c.bezierCurveTo(g.top.x+24,g.top.y+3,upper.x-24,upper.y+curl+8,upper.x+3,upper.y+8);c.lineTo(lower.x+3,lower.y+8);c.bezierCurveTo(lower.x-22,lower.y+curl+12,g.bottom.x+22,g.bottom.y+5,g.bottom.x+3,g.bottom.y+9);c.closePath()},'#8b6a3b20',null);
 path(c=>{c.moveTo(g.top.x,g.top.y);c.bezierCurveTo(g.top.x+23,g.top.y-11,upper.x-26,upper.y+curl,upper.x,upper.y);c.lineTo(lower.x,lower.y);c.bezierCurveTo(lower.x-27,lower.y+curl,g.bottom.x+23,g.bottom.y-7,g.bottom.x,g.bottom.y);c.closePath()},'#fff0b8c9','#b79551',2);
 path(c=>{c.moveTo(g.top.x+7,g.top.y+9);c.bezierCurveTo(g.top.x+35,g.top.y+2,upper.x-23,upper.y+curl+9,upper.x-6,upper.y+10)},null,'#fffbed',3);
 // This edge is exactly the point used by pointerdown and grabOffset.
 line(upper.x,upper.y,lower.x,lower.y,'#ad8440',3);
 line(upper.x-5,upper.y+1,lower.x-5,lower.y+1,'#fff8df',2);
 if(!state.grabbing){dotted(end.x,end.y,29,'#ac7d3e');guide(upper.x,upper.y-3,699,190,'AGARRÁ ESTE BORDE');arrow(640,457,765,457);pill(700,492,'TIRÁ HACIA LA DERECHA');}
 else{circle(end.x,end.y,25,'transparent','#b96748',2);ctx.beginPath();ctx.arc(end.x,end.y,33,-Math.PI/2,-Math.PI/2+state.tapeGrip/.38*Math.PI*2);ctx.strokeStyle='#729b65';ctx.lineWidth=4;ctx.stroke();pill(450,547,state.tapeGrip<.38?'SOSTENÉ PARA LEVANTAR EL BORDE':'TIRÁ · SOLTÁ · VOLVÉ A AGARRAR');}
 text(450,584,state.grabbing?Math.round(state.peel*100)+'% de cinta despegada':'La tira sale del lateral del rollo. Agarrá su borde.',16);
 if(state.penalty>0){line(upper.x-12,upper.y-13,upper.x+10,upper.y-4,palette.rust,3);}
}

function drawUSB(){
 oval(701,541,137,17,'#b8aa8166');rect(612,145,204,391,20,'#92a59566');rect(607,137,204,391,20,shade(137,391,'#e0ebdc','#a8beb0'),'#819e8b');rect(607,137,204,24,12,'#edf4df');
 for(const port of state.usbPorts){
  const color=port.color,y=port.y;rect(627,y-40,164,80,10,shade(y-40,80,color.light,color.base),color.dark);
  rect(643,y-25,108,50,5,'#293e34','#6b8070');const cy=y+(port.face?3:-17);rect(652,cy,89,17,2,'#9daf99');
  [661,681,701,721].forEach(x=>rect(x,cy,8,11,1,'#eed697'));text(774,y+6,String(port.id+1),20,'#fff9e8');
  if(port.occupiedBy!==null){circle(623,y-33,13,'#65966b','#e9f1d5');text(623,y-28,'✓',15,'#fff9e8');}
 }
 const ordered=state.usbCables.filter(c=>c.id!==state.activeCable).concat(state.usbCables.filter(c=>c.id===state.activeCable));
 for(const c of ordered){
  const p={x:c.position.x,y:c.position.y-(c.connected?0:Math.sin(performance.now()/1100+c.port)*8)},col=c.color;
  path(k=>{k.moveTo(-5,c.home.y+30);k.bezierCurveTo(65,c.home.y+50,p.x-145,p.y+20,p.x-104,p.y)},null,col.dark,15);
  path(k=>{k.moveTo(-5,c.home.y+26);k.bezierCurveTo(65,c.home.y+46,p.x-145,p.y+16,p.x-104,p.y-4)},null,col.light,3);
  ctx.save();ctx.translate(p.x,p.y);
  rect(-105,-29,95,58,12,shade(-29,58,col.light,col.base),col.dark);line(-91,-20,-25,-20,col.light,3);
  rect(-10,-21,60,42,3,shade(-21,42,'#eef0e4','#aabdb0'),'#6e8778');rect(2,c.face?6:-14,15,8,1,'#526c5b');rect(26,c.face?6:-14,15,8,1,'#526c5b');
  text(-58,7,c.label,22,'#fff9e9');
  if(!c.connected&&c.id===state.activeCable)rect(-111,-35,107,70,15,'transparent','#ad7852');ctx.restore();
 }
 const active=cable();
 if(active&&!active.connected&&state.dockHold>0){const port=state.usbPorts[active.port];ctx.beginPath();ctx.arc(697,port.y,56,-Math.PI/2,-Math.PI/2+Math.min(1,state.dockHold/1.1)*Math.PI*2);ctx.strokeStyle='#648c58';ctx.lineWidth=4;ctx.stroke();}
 pill(450,558,state.usbCables.filter(c=>c.connected).length+' / 3 CABLES CONECTADOS');text(450,590,'Elegí un cable. Giralo si hace falta y probá un puerto.',16);
 text(187,151,'CABLES A · B · C',13);text(709,111,'PUERTOS 1 · 2 · 3',13);
}

function drawSheet(){
 oval(449,528,301,22,'#b8aa8166');rect(175,208,555,303,28,'#a08059','#786c4e');rect(186,483,20,48,5,'#8b744e');rect(694,483,20,48,5,'#8b744e');
 rect(181,177,535,312,30,'#e1dbbf','#b2ad91');rect(193,187,515,300,29,shade(187,300,'#fff7df','#e6d8b7'),'#c9b68c');rect(184,150,534,47,18,shade(150,47,'#c59057','#9b643b'),'#895d3e');line(203,158,698,158,'#e9b77c',3);
 // The cloth silhouette changes at each exact hit-target corner.
 const f=state.fitted,cs=[{x:210,y:208},{x:685,y:208},{x:685,y:462},{x:210,y:462}];
 const points=cs.map((v,i)=>f[i]?v:{x:v.x+(i===0||i===3?52:-52),y:v.y+(i<2?47:-47)});
 path(c=>{c.moveTo(points[0].x,points[0].y);c.quadraticCurveTo(450,225,points[1].x,points[1].y);c.quadraticCurveTo(661,335,points[2].x,points[2].y);c.quadraticCurveTo(450,444,points[3].x,points[3].y);c.quadraticCurveTo(233,335,points[0].x,points[0].y);c.closePath()},shade(208,254,'#b9d69e','#79a680'),'#557d5c',3);
 // Soft highlights and rounded pillows keep the room warm without hiding the corner targets.
 path(c=>{c.moveTo(points[0].x+13,points[0].y+9);c.quadraticCurveTo(450,238,points[1].x-13,points[1].y+9)},null,'#d9edc0',4);
 rect(307,245,126,61,16,'#6f986a55');rect(303,238,126,61,16,shade(238,61,'#fff4d4','#e2cba1'),'#b4a27b');rect(459,245,126,61,16,'#6f986a55');rect(455,238,126,61,16,shade(238,61,'#fff4d4','#e2cba1'),'#b4a27b');
 path(c=>{c.moveTo(315,249);c.quadraticCurveTo(363,241,416,251);c.moveTo(467,249);c.quadraticCurveTo(515,241,572,251)},null,'#fffbe9',3);
 // Short geometric fabric folds flow toward each fitted or loose corner.
 points.forEach((v,i)=>{let sx=i===0||i===3?1:-1,sy=i<2?1:-1;for(let j=0;j<3;j++)path(c=>{c.moveTo(v.x+sx*(10+j*10),v.y+sy*9);c.quadraticCurveTo(v.x+sx*(43+j*6),v.y+sy*35,v.x+sx*(65+j*12),v.y+sy*(65-j*9))},null,j%2?'#c3cfae':'#8ca47d',2)});
 cs.forEach((v,i)=>{if(f[i]){path(c=>{c.moveTo(v.x-22,v.y);c.lineTo(v.x-7,v.y+13);c.lineTo(v.x+20,v.y-14)},null,'#52734f',4);circle(v.x,v.y,29,'#52734f');text(v.x,v.y+6,'✓',22,'#fffbed');}else{dotted(v.x,v.y,29,'#b27451');circle(v.x,v.y,18,'#faf7eb','#b27451');text(v.x,v.y+6,['A','S','K','L'][i],17,'#9b5a3d');line(points[i].x,points[i].y,v.x,v.y,'#b27451',2);}});
 const n=f.filter(Boolean).length;
 for(let i=0;i<4;i++)if(f[i]){const v=cs[i];ctx.beginPath();ctx.arc(v.x,v.y,37,-Math.PI/2,-Math.PI/2+Math.min(1,state.sheetHold/1.6)*Math.PI*2);ctx.strokeStyle='#e3b85e';ctx.lineWidth=5;ctx.stroke();}
 pill(450,343,n+' / 4 DEDOS SUJETANDO');
 rect(346,365,208,6,3,'#dbe2cc');rect(346,365,208*Math.min(1,state.sheetHold/1.6),6,3,'#678e5e');text(450,392,n===4?'NO SUELTES NINGUNO':'LAS CUATRO ESQUINAS A LA VEZ',11);
 text(450,566,'Un dedo en cada esquina. Sostené los cuatro a la vez.',16);text(450,592,'En computadora: mantené A + S + K + L.',14,'#798773');

}
function drawWoodCracks(){
 if(state.woodDamage<=0)return;
 const routes=[[[365,329],[335,312],[307,330],[275,309],[242,323],[206,301],[167,313],[93,285]],[[535,331],[569,349],[596,331],[625,355],[658,345],[698,370],[739,355],[810,388]],[[407,393],[388,417],[359,422],[348,448]],[[490,261],[510,238],[536,225]]];
 for(const route of routes){
  const length=state.woodDamage*(route.length-1);ctx.beginPath();ctx.moveTo(...route[0]);
  for(let i=1;i<route.length;i++){const t=clamp(length-i+1,0,1);if(t<=0)break;ctx.lineTo(route[i-1][0]+(route[i][0]-route[i-1][0])*t,route[i-1][1]+(route[i][1]-route[i-1][1])*t);}
  ctx.strokeStyle=state.woodBroken?'#754c32':'#a37245';ctx.lineWidth=state.woodBroken?9:1.5+state.woodDamage*3;ctx.stroke();
 }
 if(state.woodBroken){for(const [x,y,a] of [[347,298,.4],[554,367,-.5],[301,353,.2],[601,302,-.2]]){ctx.save();ctx.translate(x,y);ctx.rotate(a);path(c=>{c.moveTo(-13,0);c.lineTo(19,-6);c.lineTo(7,11);c.closePath()},'#f6d7a1','#b38752',1.5);ctx.restore();}}
}
function drawScrew(){
 rect(75,129,750,393,20,shade(129,393,'#efcd91','#d9ae70'),'#bb8d53');line(98,135,802,135,'#ffe3b1',4);rect(75,493,750,29,10,'#b99864');
 for(let i=0;i<6;i++){let y=170+i*54;path(c=>{c.moveTo(95,y);c.bezierCurveTo(250,y-9,316,y+9,385,y);c.moveTo(540,y+2);c.bezierCurveTo(660,y-8,705,y+9,800,y)},null,'#c9aa76',2);}
 drawWoodCracks();
 oval(450,347,103,88,'#ad9469');circle(450,330,85,shade(245,170,'#dce7d8','#859f91'),'#5f7c6d',4);circle(450,330,70,shade(260,140,'#f3f4df','#b4c9b9'),'#93a18e',2);ctx.beginPath();ctx.arc(450,330,77,3.4,5.5);ctx.strokeStyle='#fff9dd';ctx.lineWidth=3;ctx.stroke();
 const a=state.angle===null?-.9:state.angle;
 ctx.save();ctx.translate(450,330);ctx.rotate(a);
 // Phillips recess rotates with the screw, the tool remains centered on it.
 path(c=>{c.moveTo(-13,-48);c.lineTo(13,-48);c.lineTo(13,-13);c.lineTo(48,-13);c.lineTo(48,13);c.lineTo(13,13);c.lineTo(13,48);c.lineTo(-13,48);c.lineTo(-13,13);c.lineTo(-48,13);c.lineTo(-48,-13);c.lineTo(-13,-13);c.closePath()},'#607363','#465b4c',2);
 if(state.stripped>.1){for(let i=0;i<6;i++){ctx.rotate(Math.PI/3);line(38,15,63,23,'#b28661',2+state.stripped*3)}}
 rect(0,-8,137,16,3,'#9dac9c','#5d7160');line(14,-4,129,-4,'#e4e9dd',3);
 rect(119,-23,117,46,11,'#3e5e45','#2f4935');rect(143,-29,72,58,12,shade(-29,58,'#b2cb79','#719655'),'#3e5e45');[152,170,188,206].forEach(x=>line(x,-19,x,19,'#9caf89',3));ctx.restore();
 ctx.save();ctx.setLineDash([5,8]);ctx.beginPath();ctx.arc(450,330,101,-2.5,-.7);ctx.strokeStyle='#b16c47';ctx.lineWidth=2;ctx.stroke();ctx.restore();
 let ax=450+Math.cos(-.7)*101,ay=330+Math.sin(-.7)*101;arrow(ax-9,ay-12,ax,ay,'#b16c47');
 const gx=290,gy=465,gw=320;rect(gx,gy,gw,10,5,'#c29d67');rect(gx+gw*screwLimits.ready/screwLimits.break,gy,gw*(screwLimits.over-screwLimits.ready)/screwLimits.break,10,3,'#7d9e62');
 const marker=gx+gw*Math.min(1,state.tightness/screwLimits.break);line(marker,gy-6,marker,gy+16,state.woodDamage>0?'#a55338':'#fff9e8',3);text(450,503,'PUNTO JUSTO: ZONA VERDE',12);
 pill(450,567,state.woodBroken?'LA MADERA SE PARTIÓ':state.screwHint==='ready'?'YA ESTÁ AJUSTADO · SOLTÁ':state.screwHint==='over'?'ESTÁ CEDIENDO · AFLOJÁ':'GIRÁ DESPACIO Y MIRÁ LA TENSIÓN');text(450,595,state.woodDamage>0?'La madera tiene grietas. Girar de más la parte.':'Soltá en la zona verde para terminar.',15,state.woodDamage>0?'#a85337':'#5d6759');
}
function drawNeedle(){
 const wet=performance.now()<state.wetUntil,eye=needleEye(),p=state.thread;
 // The entire needle shares the exact pose used by the crossing test.
 oval(eye.x+3,eye.y+220,33,10,'#cdd5c0');ctx.save();ctx.translate(eye.x,eye.y);ctx.rotate(eye.tilt);
 path(c=>{c.moveTo(0,218);c.bezierCurveTo(-15,155,-16,-74,-14,-106);c.quadraticCurveTo(0,-146,14,-106);c.bezierCurveTo(16,-44,13,162,0,218);c.closePath()},shade(-130,348,'#f0f2e3','#93b0a0'),'#617d6a',2.5);
 line(-7,-96,-6,157,'#f4f6e9',3);oval(0,0,20,29,'#eaf0df','#617d6a');oval(0,0,13,21,'#fff4da','#839983');ctx.restore();
 guide(eye.x+23,eye.y-5,746,156,'OJO EN MOVIMIENTO');
 rect(79,376,59,121,9,'#b79367','#8e7753');oval(108,379,45,14,'#dfc89d','#a18d66');oval(108,493,45,14,'#dfc89d','#a18d66');rect(76,390,65,90,10,shade(390,90,'#e8976d','#b75d48'),'#9d5540');for(let i=0;i<10;i++)line(82,397+i*8,137,401+i*8,'#d78f6d',2);
 path(c=>{c.moveTo(108,404);c.bezierCurveTo(115,455,p.x-110,p.y+52,p.x,p.y)},null,'#a6553b',6);
 path(c=>{c.moveTo(108,402);c.bezierCurveTo(115,453,p.x-110,p.y+50,p.x-2,p.y-2)},null,'#dc9776',1.5);
 if(wet){line(p.x-14,p.y,p.x+4,p.y,'#9b4a32',5);oval(p.x-2,p.y-11,3,5,'#a7c6ba');}
 else for(let i=-3;i<=3;i++)path(c=>{c.moveTo(p.x-10,p.y);c.quadraticCurveTo(p.x+4,p.y+i*2,p.x+14+Math.abs(i)*2,p.y+i*5)},null,'#b96748',1.6);
 circle(p.x,p.y,17,'transparent','#b37b52',1.5);
 const a=needleWorld({x:-58,y:0},eye),b=needleWorld({x:64,y:0},eye);ctx.save();ctx.setLineDash([4,6]);line(a.x,a.y,b.x,b.y,'#88a17b',2);ctx.restore();arrow(b.x-11,b.y-5,b.x,b.y,'#88a17b');
 if(state.threadStage==='through'){pill(450,558,'ENTRÓ: SEGUÍ HASTA EL OTRO LADO');}
 else pill(450,558,wet?'PUNTA HUMEDECIDA · PASÁ POR EL OJO':'PASÁ EL HILO DE IZQUIERDA A DERECHA');
 text(450,591,'Arrastrá desde cualquier parte. La dificultad está en pasar el hilo.',15);
}

function drawLeaf(){
 oval(450,345,307,196,'#d09b8066');oval(450,330,304,192,shade(138,384,'#f4b9a0','#db937f'),'#bd7f72');
 oval(450,334,270,153,'#75454d','#ae6d70');oval(450,359,242,114,'#593e47');
 // Rounded teeth frame a friendly, schematic mouth, without a tiny pickup target.
 for(let i=0;i<7;i++){
  const x=240+i*64,drop=Math.abs(i-3)*5;
  rect(x,191+drop,58,101-drop,16,shade(191,101,'#fffdf0','#e2dfc8'),'#ccbaa4');line(x+12,200+drop,x+43,200+drop,'#fffef7',3);
  rect(x,394-drop,58,78+drop,15,shade(394,78,'#ede7ce','#fff8e6'),'#c6b49b');
 }
 const p=state.tongue;
 path(c=>{c.moveTo(350,477);c.bezierCurveTo(331,428,p.x-53,p.y+15,p.x-49,p.y);c.bezierCurveTo(p.x-45,p.y-56,p.x+45,p.y-56,p.x+49,p.y);c.bezierCurveTo(p.x+53,p.y+26,572,439,550,477);c.quadraticCurveTo(450,534,350,477);c.closePath()},shade(p.y-44,240,'#f4a3aa','#cf7085'),'#b66578',3);
 path(c=>{c.moveTo(450,488);c.quadraticCurveTo(p.x+6,p.y+80,p.x,p.y-9)},null,'#d17e90',2);
 oval(p.x-16,p.y-21,17,7,'#ffd0ca');
 const leaf=state.leaf;ctx.save();ctx.translate(leaf.x,leaf.y);ctx.rotate(-.4);
 path(c=>{c.moveTo(0,24);c.bezierCurveTo(-31,6,-24,-16,10,-25);c.bezierCurveTo(29,-2,23,17,0,24);c.closePath()},shade(-25,50,'#9fc761','#4f8e4f'),'#3d7346',2);
 line(1,20,8,-19,'#d2e293',2);line(4,2,-11,-7,'#a6c971',1.5);line(6,-7,18,-13,'#a6c971',1.5);ctx.restore();
 if(!state.leafAttached){dotted(leaf.x,leaf.y,30,'#7e9d58');if(state.leafLoosen>0){ctx.beginPath();ctx.arc(leaf.x,leaf.y,36,-Math.PI/2,-Math.PI/2+state.leafLoosen*Math.PI*2);ctx.strokeStyle='#e5c473';ctx.lineWidth=4;ctx.stroke();}}
 else{arrow(683,345,683,462,'#8b9d65');}
 pill(450,557,state.leafAttached?'LA TENÉS · BAJÁ LA LENGUA DESPACIO':'UN POQUITO DE VERDE, NADA MÁS');text(450,590,'Deslizá desde cualquier parte para mover la lengua.',16);
}
function drawBomb(){
 if(state.outcome==='exploded'){
  ctx.save();ctx.translate(450,333);path(c=>{for(let i=0;i<24;i++){const a=i*Math.PI/12,r=i%2?149:239;c.lineTo(Math.cos(a)*r,Math.sin(a)*r);}c.closePath()},'#ecc16c','#bd8052',3);ctx.restore();
  text(450,350,'¡PUM!',74,'#9d5140');pill(450,570,'ESTABA CASI');return;
 }
 oval(450,526,294,27,'#b19b7850');rect(168,137,564,384,24,'#8a8071','#6a6b59');rect(160,125,564,384,24,shade(125,384,'#c5c1a6','#9caa91'),'#6c8069');line(188,132,694,132,'#e5dfc3',4);
 for(const [x,y]of [[185,150],[699,150],[185,485],[699,485]]){circle(x,y,7,'#758a75','#e9e4c6');line(x-3,y,x+3,y,'#e9e4c6',2);}
 rect(285,154,315,84,12,'#42594a','#d6d5b4');
 const seconds=Math.max(0,Math.ceil(state.bombRemaining)),clock='00:'+String(seconds).padStart(2,'0');text(442,211,clock,46,state.bombPending>0?'#b6da97':'#f2d897');
 bombWires.forEach((wire,i)=>{
  circle(wire.x-24,260,11,'#6b7962','#dae2c0');circle(wire.x+24,354,11,'#6b7962','#dae2c0');
  path(c=>{c.moveTo(wire.x-24,260);c.bezierCurveTo(wire.x+38,280,wire.x-40,327,wire.x+24,354)},null,'#52634e',13);
  path(c=>{c.moveTo(wire.x-24,259);c.bezierCurveTo(wire.x+38,279,wire.x-40,326,wire.x+24,353)},null,wire.color,9);
  text(wire.x,388,['◆','●','▲','■'][i],16,'#667c61');
 });
 circle(330,455,40,'#914c48','#d2c9ac',4);circle(330,449,34,shade(415,68,'#edb19a','#c46d63'),'#a15c51');text(330,457,'↻',27,'#fff3d4');
 circle(647,455,35,'#627b68','#d9dcc1',4);circle(647,455,24,'#9eb38e');line(647,455,657,436,'#f5efce',5);
 rect(414,423,135,51,9,'#d8dab9','#82977b');text(481,455,state.bombPending>0?'✓ OK':'REVISAR',16,'#536c50');
 pill(450,557,state.bombPending>0?'SEÑAL ESTABLE · VERIFICANDO':'PANEL EN ESPERA');text(450,590,state.bombPending>0?'Parece que funcionó. Un instante…':'Tocá un elemento o consultá las instrucciones.',16);
}

function frame(now){
 const dt=Math.min(.05,(now-lastFrame)/1000||.016);lastFrame=now;
 if(mode&&state){advance(dt,now);
 $('attempts').textContent=String(state.attempts).padStart(2,'0');$('time').textContent=fmt(state.elapsed);
 $('percent').textContent=Math.round(state.progress*100)+'%';$('progress').style.width=Math.round(state.progress*100)+'%';
 const dpr=Math.min(window.devicePixelRatio||1,2),r=canvas.getBoundingClientRect(),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);scene();
 }requestAnimationFrame(frame)
}
canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('selectstart',e=>e.preventDefault());canvas.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});window.addEventListener('blur',up);window.addEventListener('keydown',e=>sheetKey(e,true));window.addEventListener('keyup',e=>sheetKey(e,false));
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>init(b.dataset.open)));
$('back').onclick=()=>{document.body.classList.remove('is-playing');up();mode=null;state=null;$('arcade').classList.remove('visible');$('hero').style.display='';$('catalog').style.display='';history.replaceState(null,'',location.pathname);window.scrollTo({top:0,behavior:'smooth'})};
$('reset').onclick=()=>init(mode);$('again').onclick=()=>init(mode);
const initial=location.hash.slice(1);if(defs[initial])init(initial);requestAnimationFrame(frame);

