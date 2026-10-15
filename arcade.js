'use strict';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const defs={
 dog:{title:'Abrí grande.',label:'UN PERRO. UN BOCADITO.',instructions:'Arrastrá desde cualquier parte para acercar el queso despacio. Esperá a que abra la boca y sostené el bocado un instante. Después, esperá para comprobar que se lo comió.',quote:'“Dale su remedio. Es un momentito.”',meter:'BOCADO ACEPTADO'},
 sushi:{title:'Con mucho cuidado.',label:'TRES PIEZAS. DOS PALITOS.',instructions:'Sostené una pieza un instante para tomarla con los palitos. Arrastrala despacio hasta el plato de la derecha y soltá. Si la sacudís, la soltás antes de tiempo o apretás demasiado rato, se desarma.',quote:'“Es solo pasarla de un plato a otro.”',meter:'PIEZAS ENTERAS'},
 sweep:{title:'La última barrida.',label:'UNA ESCOBA. UNA PALA.',instructions:'Arrastrá desde cualquier parte para mover la escoba. Juntá la basura y empujala hacia la boca de la pala, a la derecha. Cuando esté todo junto, levantá la pala.',quote:'“Una última pasada y termino.”',meter:'PISO BARRIDO'},
 leaf:{title:'Un poquito de verde.',label:'UN DIENTE. UNA HOJITA.',instructions:'Arrastrá desde cualquier parte para mover la lengua. Apoyala despacio sobre la hojita hasta despegarla y después bajala sin apurarte. Si la empujás de golpe, vuelve a meterse.',quote:'“Debe ser un poquito de perejil.”',meter:'HOJITA DESPEGADA'},
 bomb:{title:'Un ajuste pendiente.',label:'UN PANEL. UN PEQUEÑO AJUSTE.',instructions:'Probá botones, teclas, perillas e interruptores del panel. Elegí las pinzas y tocá un cable para cortarlo, o arrastralas desde la derecha hasta el cable. Revisá las señales después de cada ajuste.',quote:'“Parece bastante claro.”',meter:'VERIFICACIÓN'},
 tape:{title:'Encontrá la punta.',label:'UN ROLLO. NADA MÁS.',instructions:'Agarrá la pestaña y hacé tirones cortos hacia la derecha. Podés soltar y volver a agarrar para seguir. Si tirás de golpe o te desviás, se corta.',quote:'“Seguro está por acá.”',meter:'CINTA DESPEGADA'},
 usb:{title:'Del otro lado.',label:'TRES CABLES. TRES PUERTOS.',instructions:'Conectá los tres cables. Elegí uno, giralo si hace falta y probá los puertos. Sus colores no garantizan que sean compatibles. Sostené cada conector alineado para enchufarlo.',quote:'“Probá del otro lado.”',meter:'CABLES CONECTADOS'},
 sheet:{title:'La sábana ajustable.',label:'UNA SÁBANA. CUATRO ESQUINAS.',instructions:'Poné un dedo en cada esquina y mantené los cuatro a la vez durante un momento. Si soltás uno, se escapa esa esquina. En computadora, mantené A, S, K y L simultáneamente.',quote:'“La primera ya estaba puesta.”',meter:'CUATRO ESQUINAS A LA VEZ'},
 screw:{title:'Una vueltita más.',label:'UN TORNILLO. UNA VUELTA MÁS.',instructions:'Presioná y dibujá círculos alrededor de la cabeza del tornillo, despacio y en sentido horario. Soltá al llegar al punto justo. Si pasás el final de la zona verde, perdés y se parte la madera. Si patinás, la barra vuelve al principio.',quote:'“Le falta apenas una vueltita.”',meter:'ROSCA AJUSTADA'},
 needle:{title:'Enhebrá eso.',label:'UN HILO. UNA AGUJA.',instructions:'Arrastrá desde cualquier parte para mover el hilo. La aguja se mueve: alineá la punta con su ojo y atravesalo de izquierda a derecha. No alcanza con apoyarla. Humedecer la punta ayuda.',quote:'“Con buena luz sería fácil.”',meter:'PUNTA ENHEBRADA'}
};
let mode=null,state=null,pressed=false,origin=null,lastPointer=null,tick=0,lastFrame=0;
let mx=190,my=310;const W=900,H=660;
const screwLimits={ready:.96,over:1.08,scale:1.26};
let activePointer=null,inputType='mouse',grabOffset={x:0,y:0};
const corners=[{x:210,y:208},{x:685,y:208},{x:685,y:462},{x:210,y:462}];
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function rand(a,b){return a+Math.random()*(b-a)}
function setQuote(x){$('quote').textContent=x}
function sound(){/* Diseño sin audio obligatorio */ }
function init(m){
 document.body.classList.add('is-playing');mode=m;sheetPointers.clear();sheetKeys.clear();sneezeBlockedKeys.clear();activePointer=null;pressed=false;origin=null;lastPointer=null;tick=0;mx=190;my=310;
 state={attempts:0,chaos:false,chaosTime:0,chaosShown:false,elapsed:0,started:performance.now(),finished:false,progress:0,heat:0,fail:0,grabbing:false,penalty:0,noticeTime:0,tipAngle:rand(-1.8,1.8),peel:0,rotation:0,position:{x:170,y:330},fitted:[false,false,false,false],stripped:0,angle:null,thread:{x:175,y:350},wetUntil:0,threadHold:0,needleWobble:0,motion:0,peelStart:0,peelSpan:200,tapeGrip:0,dockHold:0,socketFace:Math.floor(rand(0,2)),cornerIndex:null,cornerHold:0,lastCorner:null,sheetHold:0,threadStage:'approach',threadInsertion:0,tightness:0,woodDamage:0,woodBroken:false,outcome:null,screwHint:'loose',tongue:{x:450,y:425},leaf:{x:494,y:267},leafLoosen:0,leafAttached:false,bombRemaining:0,bombStarted:false,bombTool:false,bombCuts:[false,false,false,false],bombFeedback:0,bombDial:0,bombButton:false,bombKnobs:[0,0],bombSwitches:[false,false,false],bombAux:[false,false],bombCode:'',bombKey:-1,bombChoice:null,bombMessage:'Panel en espera',sneeze:Sneeze.create(),broom:{x:280,y:430},dust:[],dustCollected:0,sweepRounds:0};
 if(m==='sweep')state.dust=floorDust();
 if(m==='dog')createDog();if(m==='usb')createUSB();if(m==='sushi')createSushi();
 $('hero').style.display='none';$('catalog').style.display='none';$('arcade').classList.add('visible');$('game-title').textContent=defs[m].title.toUpperCase();$('game-subtitle').textContent='Dificultad estimada: baja';$('input-help').textContent={dog:'Deslizá despacio. Esperá a que abra la boca y sostené el bocado.',sushi:'Sostené para agarrar, llevá despacio y soltá sobre el plato. No aprietes de más.',sweep:'Barré hacia la pala de la derecha. Después, levantala.',leaf:'Deslizá para mover la lengua. Despegá la hojita y bajala despacio.',bomb:'Revisá el panel y elegí un ajuste. Todavía hay tiempo.',tape:'Sostené la pestaña un instante. Tirones cortos a la derecha; soltá y repetí.',usb:'Conectá los tres cables. Probá puertos: los colores pueden engañar.',sheet:'Un dedo en cada esquina: sostené los cuatro a la vez. En compu: A + S + K + L.',screw:'Girá despacio y soltá en el punto justo. Una vuelta de más puede partir la madera.',needle:'Mové el hilo desde cualquier parte. Atravesá el ojo de izquierda a derecha.'}[m];
 $('task-image').src='assets/'+m+'-960.webp';$('task-image').alt=defs[m].title;$('task-caption').textContent=defs[m].title;
 $('canvas-label').textContent=defs[m].label;$('instructions').textContent=defs[m].instructions;$('meter-label').textContent=defs[m].meter;
 $('overlay').classList.remove('on');setQuote(defs[m].quote);actions();location.hash=m;
 window.scrollTo({top:0,behavior:'smooth'});
}
function actions(){
 let html='';
 if(mode==='dog')html='<button id="cheese">Envolver en más queso</button>';
 if(mode==='sweep')html='<button id="lift-pan">Levantar la pala</button>';
 if(mode==='bomb')html='<button id="pliers">Usar pinzas</button><button id="manual">Consultar instrucciones</button><button id="verify">Validar panel</button>';
 if(mode==='usb')html='<button id="rotate">↻ Girar conector</button>';
 if(mode==='needle')html='<button id="lick">👅 Chupar el hilo</button>';
 if(mode==='tape')html='<button id="find">🔎 Mirar de cerca</button>';
 if(mode==='sheet')html='<span class="input-help">4 dedos · En compu: A + S + K + L</span>';
 if(mode==='screw')html='<button id="steady">Respirar un segundo</button>';
 $('actions').innerHTML=html+'<button id="break-all" class="break-all" hidden>Romper todo</button>';
 syncActions();
 const bind=(id,fn)=>{const n=$(id);if(n)n.onclick=()=>{if(!state||state.finished||state.chaos)return;fn();syncActions()}};
 bind('break-all',destroyGame);
 bind('cheese',()=>{if(state.dogStage!=='offer'||state.finished)return;state.dogWrapped=true;setQuote('“Ahora sí que parece solamente queso.”');});
 bind('lift-pan',liftDustpan);
 bind('pliers',()=>bombAction('pliers'));
 bind('manual',()=>bombAction('manual'));bind('verify',()=>bombAction('check'));
 bind('rotate',()=>{let c=cable();if(!c||c.connected){const next=state.usbCables.find(v=>!v.connected);if(!next)return;state.activeCable=next.id;c=next;}c.face=(c.face+1)%2;state.dockHold=0;state.attempts++;setQuote('“Cable '+c.label+' girado. Probá ahora.”');});
 bind('lick',()=>{state.wetUntil=performance.now()+6500;state.threadHold=0;setQuote('“Sí. Acabás de chupar el hilo. Está temporalmente rígido.”')});
 bind('find',()=>{state.tipAngle=0;state.attempts++;setQuote('“Ahí estaba. ¿Y ahora cómo lo despegás?”')});
 bind('steady',()=>{state.stripped=Math.max(0,state.stripped-.26);setQuote('“Respirás. El tornillo no.”')});
}
function syncActions(){
 if(!state)return;
 $('break-all').hidden=!Desastre.ready(state.attempts)||state.finished||state.chaos;
 for(const id of ['cheese','lift-pan','pliers','manual','verify','rotate','lick','find','steady','break-all']){const button=$(id);if(button)button.disabled=state.finished||state.chaos;}
}
function destroyGame(){
 if(!state||state.finished||state.chaos||!Desastre.ready(state.attempts))return;
 const ids=mode==='sheet'?Array.from(sheetPointers.keys()):activePointer===null?[]:[activePointer];
 state.chaos=true;state.chaosTime=0;state.grabbing=false;pressed=false;activePointer=null;sheetPointers.clear();sheetKeys.clear();state.dockHold=0;state.dogFeed=0;state.threadHold=0;
 if(mode==='sushi'){state.sushiHeld=false;for(const c of state.sushiPieces){c.broken=true;c.delivered=false;}}
 if(mode==='sheet')state.fitted=[false,false,false,false];
 if(mode==='screw'){state.woodDamage=1;state.woodBroken=true;}
 if(mode==='usb'){for(const c of state.usbCables){c.connected=false;c.position={x:c.home.x+80+c.id*25,y:c.home.y+45};}for(const p of state.usbPorts)p.occupiedBy=null;}
 if(mode!=='bomb'){state.finished=true;state.outcome='chaos';state.progress=0;}
 for(const id of ids)if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);
 setQuote(mode==='bomb'?'“El panel dejó de responder. Eso no puede ser bueno.”':'“Bueno. Se terminó la tarea.”');syncActions();
}
function chaosOverlay(){
 if(!state.chaos||mode==='bomb'||state.chaosShown||state.chaosTime<1.2)return;
 state.chaosShown=true;
 const lines={tape:'La cinta quedó hecha tiras.',usb:'Cables por todos lados. Ninguno conectado.',sheet:'La sábana no resistió otra esquina.',screw:'No quedó ni la tabla.',needle:'El hilo se cortó y la aguja se dobló.',leaf:'La hojita terminó en todas partes.',sweep:'Ahora sí hay algo para barrer.',sushi:'Arroz por todo el piso.',dog:'El queso voló. El perro está encantado.'};
 $('overlay-title').textContent='Bueno. Se rompió todo.';$('overlay-text').textContent=lines[mode];$('again').textContent='Jugar de nuevo';$('overlay').classList.add('on');
}
function failure(msg){
 state.attempts++;state.fail++;state.penalty=.45;state.noticeTime=4;state.grabbing=false;state.threadHold=0;state.dockHold=0;state.cornerHold=0;
 setQuote(msg); if(mode==='sweep'){state.dust.push(...floorDust(8));state.dustCollected=Math.max(0,state.dustCollected-8);state.progress=Math.min(.99,state.dustCollected/18);}
 if(mode==='tape'){state.peel=Math.max(0,state.peel-.17);state.progress=state.peel}
 if(mode==='usb'){const c=cable();if(c&&!c.connected)c.position={...c.home};}
 if(mode==='needle'){state.thread={x:175,y:350};state.heat=Math.min(1,state.heat+.12)}
 if(mode==='screw'){state.stripped=clamp(state.stripped+.22,0,1);state.tightness=0;state.progress=0;state.angle=null;state.screwHint='loose';}
 if(mode==='sheet')state.heat=clamp(state.heat+.18,0,1);
}
function win(){
 if(mode==='sweep')return;
 if(mode==='bomb')return;
 if(state.finished)return;if(Sneeze.finish(state.sneeze)){sneezeImpact();return}state.finished=true;state.outcome='won';state.progress=1;
 $('overlay-title').textContent='¿Al fin?';$('overlay-text').textContent='Lo conseguiste en '+fmt(state.elapsed)+' y '+state.attempts+' intentos. La humanidad esperaba menos de vos.';
 $('again').textContent='Jugar de nuevo';$('overlay').classList.add('on');setQuote('“Una victoria absolutamente innecesaria.”');
}
function fmt(s){return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function touchRadius(px,base){return inputType==='touch'?Math.max(base,px*W/canvas.getBoundingClientRect().width):base}
const usbColors=[{name:'coral',base:'#da7b6d',light:'#f3b6a1',dark:'#984a49'},{name:'azul',base:'#69a9c2',light:'#acd7df',dark:'#3f718f'},{name:'amarillo',base:'#dfb14e',light:'#f7d991',dark:'#a47e32'}];
let sheetPointers=new Map(),sheetKeys=new Set(),sneezeBlockedKeys=new Set();
function createUSB(){
 const choices=[[1,2,0],[2,0,1],[0,2,1],[1,0,2],[2,1,0]],wiring=choices[Math.floor(rand(0,choices.length))];
 state.usbPorts=usbColors.map((color,i)=>({id:i,color,face:Math.floor(rand(0,2)),occupiedBy:null,y:210+i*125}));
 state.usbCables=usbColors.map((color,i)=>({id:i,label:'ABC'[i],color,port:wiring[i],face:Math.floor(rand(0,2)),connected:false,home:{x:185,y:210+i*125},position:{x:185,y:210+i*125}}));
 state.activeCable=0;
}
function cable(){return state.usbCables[state.activeCable]}
function socket(index=0,now=performance.now()){const port=state.usbPorts[index];return{x:655,y:port.y+Math.sin(now/1100+index)*8}}
function usbSignal(c){
 if(c.connected)return{status:'green',portId:c.port,message:'Conectado.'};
 const nearest=state.usbPorts.map(port=>({port,target:socket(port.id)})).sort((a,b)=>distance(c.position,a.target)-distance(c.position,b.target))[0];
 const {port,target}=nearest;
 if(distance(c.position,target)>105)return{status:'off',portId:null,message:'Acercá el cable a un puerto para ver la señal.'};
 let message='';
 if(port.occupiedBy!==null)message='Rojo: ese puerto ya está ocupado.';
 else if(c.port!==port.id)message='Rojo: probá otro puerto.';
 else if(c.face!==port.face)message='Rojo: es el puerto. Girá el conector.';
 else if(Math.abs(c.position.y-target.y)>=touchRadius(4,8))message='Rojo: alineá el conector con el puerto.';
 else if(state.motion>=95)message='Rojo: movelo más despacio.';
 return{status:message?'red':'green',portId:port.id,message:message||'Verde: vas bien. Acercá y sostené el cable.'};
}
function usbLight(x,y,status){
 const color={green:'#5fae60',red:'#df6655',off:'#65796d'}[status];
 if(status!=='off')circle(x,y,12,status==='green'?'#8bce6d44':'#ef826344');
 circle(x,y,7,color,'#eef2da',1.5);circle(x-2,y-2,2,status==='off'?'#8e9e88':'#fff5d9');
}
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
 if(e&&e.pointerId!==undefined)sheetPointers.delete(e.pointerId);else{sheetPointers.clear();sheetKeys.clear();sneezeBlockedKeys.clear()}
 syncSheet();
}
function sheetKey(e,down){
 if(mode!=='sheet'||!state||state.finished||e.ctrlKey||e.metaKey||e.altKey)return;
 const i=['a','s','k','l'].indexOf(String(e.key||'').toLowerCase());if(i<0)return;e.preventDefault();
 if(down){if(sneezeBlockedKeys.has(i))return;sheetKeys.add(i);}else{sheetKeys.delete(i);sneezeBlockedKeys.delete(i);}syncSheet();
}
function needleEye(now=performance.now()){return{x:620+Math.sin(now/1570)*25,y:310+Math.sin(now/1070)*29+Math.sin(now/2470)*8,tilt:Math.sin(now/1920)*.12}}
function needleLocal(p,eye){const x=p.x-eye.x,y=p.y-eye.y;return{x:x*Math.cos(eye.tilt)+y*Math.sin(eye.tilt),y:-x*Math.sin(eye.tilt)+y*Math.cos(eye.tilt)}}
function needleWorld(p,eye){return{x:eye.x+p.x*Math.cos(eye.tilt)-p.y*Math.sin(eye.tilt),y:eye.y+p.x*Math.sin(eye.tilt)+p.y*Math.cos(eye.tilt)}}
function snagThread(msg){
 const eye=needleEye(),local=needleLocal(state.thread,eye);state.attempts++;state.fail++;state.threadStage='approach';state.threadInsertion=0;state.penalty=.15;state.noticeTime=4;
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
 const gaps=[366,430,494,558];state.leaf={x:gaps[Math.floor(rand(0,gaps.length))],y:267};state.leafAttached=false;state.leafLoosen=Math.max(0,state.leafLoosen-.35);state.penalty=.25;state.noticeTime=4;state.fail++;state.attempts++;setQuote('“Se volvió a meter entre los dientes. Ahí está.”');
}
function moveTongue(p,speed){
 state.tongue={x:clamp(p.x,240,665),y:clamp(p.y,235,490)};
 if(state.leafAttached){if(speed>210){slipLeaf();return}state.leaf={...state.tongue};if(state.tongue.y>470){win();return}}
 else if(distance(state.tongue,state.leaf)<65&&speed>170)slipLeaf();
}
function createDog(){
 state.dogHand={x:220,y:400};state.dogStage='offer';state.dogClock=0;state.dogTurn=0;state.dogSuspicion=0;state.dogFeed=0;state.dogWait=0;state.dogWrapped=false;state.dogSpit=false;
}
function dogMouth(){return{x:564+Math.sin(state.dogClock*1.1)*13+(state.dogTurn>0?38:0),y:341+Math.sin(state.dogClock*1.7)*9}}
function dogOpen(){return state.dogStage==='offer'&&state.dogTurn===0&&Math.sin(state.dogClock*1.7)>.25}
function dogRefuse(message){
 state.dogTurn=1.5;state.dogSuspicion=.8;state.dogFeed=0;state.dogHand={x:220,y:400};state.grabbing=false;state.fail++;state.noticeTime=4;state.progress=0;setQuote(message||'“Se dio vuelta. No vio nada, seguro.”');
}
function moveDog(p,speed){
 if(state.dogStage!=='offer')return;
 state.dogHand={x:clamp(p.x,145,720),y:clamp(p.y,175,495)};
 if(distance(state.dogHand,dogMouth())<145&&speed>(inputType==='mouse'?330:250))dogRefuse('“Ese movimiento fue sospechoso.”');
}
function advanceDog(dt){
 state.dogClock+=dt;state.dogTurn=Math.max(0,state.dogTurn-dt);state.dogSuspicion=Math.max(0,state.dogSuspicion-dt*.15);
 if(state.dogStage==='chew'||state.dogStage==='check'){
  state.dogWait-=dt;
  if(state.dogWait<=0&&state.dogStage==='chew'){state.dogStage='check';state.dogWait=1.6;state.progress=.95;setQuote('“Parece que la tragó. Esperá un segundo…”');}
  else if(state.dogWait<=0){
   if(state.dogSpit){state.dogStage='spit';state.dogWait=1.4;state.progress=.15;state.fail++;state.noticeTime=4;setQuote('“El queso sí. La pastilla está en el piso.”');}
   else{state.dogStage='done';win();}
  }return;
 }
 if(state.dogStage==='spit'){state.dogWait-=dt;if(state.dogWait<=0){state.dogStage='offer';state.dogHand={x:220,y:400};state.dogFeed=0;state.progress=0;}return;}
 if(state.dogStage!=='offer')return;
 const near=distance(state.dogHand,dogMouth())<34;
 if(pressed&&state.grabbing&&near&&dogOpen()&&state.motion<100){
  state.dogFeed=Math.min(.5,state.dogFeed+dt);state.progress=state.dogFeed/.5*.8;
  if(state.dogFeed>=.5){state.dogStage='chew';state.dogWait=1.25;state.dogSpit=Math.random()<(state.dogWrapped?.4:.7);state.dogWrapped=false;state.grabbing=false;state.progress=.85;setQuote('“Agarró el bocado. Ahora, a esperar.”');}
 }else{state.dogFeed=Math.max(0,state.dogFeed-dt*2);state.progress=state.dogFeed/.5*.8;}
}

const bombExtras=[
 ...Array.from({length:6},(_,i)=>({kind:'key',id:i,x:202+(i%2)*42,y:274+Math.floor(i/2)*44,r:20})),
 ...[275,320,365].map((y,id)=>({kind:'switch',id,x:665,y,r:20})),
 ...[222,650].map((x,id)=>({kind:'knob',id,x,y:198,r:33})),
 ...[210,255].map((x,id)=>({kind:'aux',id,x,y:450,r:20}))
];
const bombWires=[{x:310,color:'#d2746d'},{x:405,color:'#6ca6bd'},{x:500,color:'#dcb14e'},{x:595,color:'#9e94be'}];
function bombAction(action,wireIndex=null){
 if(mode!=='bomb'||!state||state.finished||state.chaos)return;
 if(!state.bombStarted){state.bombStarted=true;state.bombRemaining=rand(12,39.5);}
 state.attempts++;state.bombChoice=action;state.bombFeedback=2.5;
 if(action==='pliers')state.bombTool=true;
 if(action==='wire'){
  if(!state.bombTool){state.bombMessage='Elegí las pinzas para cortar un cable.';setQuote('“'+state.bombMessage+'”');return;}
  if(wireIndex===null||state.bombCuts[wireIndex])return;
  state.bombCuts[wireIndex]=true;
 }
 if(action==='knob')state.bombKnobs[wireIndex]=(state.bombKnobs[wireIndex]+1)%8;
 if(action==='switch')state.bombSwitches[wireIndex]=!state.bombSwitches[wireIndex];
 if(action==='aux')state.bombAux[wireIndex]=!state.bombAux[wireIndex];
 if(action==='key'){state.bombKey=wireIndex;state.bombCode=(state.bombCode+(wireIndex+1)).slice(-6);}
 if(action==='button')state.bombButton=!state.bombButton;
 if(action==='dial')state.bombDial=(state.bombDial+1)%6;
 state.progress=Math.min(.97,state.progress+(action==='wire'?.18:.07));
 state.bombMessage={knob:'Selector calibrado. Revisá la otra señal.',switch:'Canal actualizado. Indicadores en línea.',aux:'Módulo auxiliar listo. Falta confirmar.',key:'Secuencia recibida. Comprobando combinación.',pliers:'Pinzas listas. Elegí un cable.',wire:'Cable cortado. La señal parece estable.',button:'Ajuste recibido. Indicador actualizado.',dial:'Frecuencia ajustada. Señal alineada.',manual:'Revisá cables, selector e indicadores.',check:'Señal estable. Queda un ajuste pendiente.'}[action]||'Revisando…';setQuote('“'+state.bombMessage+'”');
}
function explodeBomb(){
 if(!state||state.finished)return;state.finished=true;state.outcome='exploded';state.grabbing=false;state.progress=.99;state.fail++;
 $('overlay-title').textContent='Estaba casi.';$('overlay-text').textContent='Las señales parecían correctas. Algo quedó pendiente.';
 $('again').textContent='Jugar de nuevo';$('overlay').classList.add('on');setQuote('“La próxima seguro.”');
}
function bombWireAt(p){return p.y>=260&&p.y<=354?bombWires.findIndex(w=>Math.abs(p.x-w.x)<37):-1;}
function bombTouch(p){
 const extra=bombExtras.find(c=>distance(p,c)<c.r);if(extra){bombAction(extra.kind,extra.id);return;}
 const wire=bombWireAt(p);if(wire>=0){bombAction('wire',wire);return;}
 if(distance(p,{x:787,y:350})<65){bombAction('pliers');state.grabbing=true;return;}
 if(distance(p,{x:330,y:455})<48)bombAction('button');
 else if(distance(p,{x:647,y:455})<44)bombAction('dial');
 else if(p.x>=414&&p.x<=549&&p.y>=423&&p.y<=474)bombAction('check');
}

const dustpan={x:610,y:294,w:118,h:106};
function floorDust(n=18){return Array.from({length:n},(_,i)=>({x:230+(i*73)%290,y:230+(i*47)%240,r:3+i%4,kind:i%3}))}
function lastDust(){return[0,1,2].map(i=>({x:578-i*9,y:329+i*8,r:2.5,kind:0}))}
function leaveDust(){
 state.sweepRounds++;state.dust=lastDust();state.progress=Math.min(.99,state.dustCollected/18);
 setQuote(['“Quedó esa rayita. Una pasada más.”','“Estaba justo debajo de la pala.”','“Ahora sí. No, pará: falta un poquito.”'][state.sweepRounds%3]);
}
function liftDustpan(){
 if(mode!=='sweep'||state.finished)return;state.attempts++;state.dust.push(...lastDust());state.dustCollected=Math.max(0,state.dustCollected-2);state.progress=Math.min(.99,state.dustCollected/18);setQuote('“La pala está levantada. La rayita sigue en el piso.”');
}
function moveBroom(p){
 const old=state.broom,next={x:clamp(p.x,140,735),y:clamp(p.y,175,510)},dx=next.x-old.x,dy=next.y-old.y,len=dx*dx+dy*dy;state.broom=next;
 if(len<.1)return;
 for(const grain of state.dust){
  const t=clamp(((grain.x-old.x)*dx+(grain.y-old.y)*dy)/len,0,1),near={x:old.x+t*dx,y:old.y+t*dy};
  if(distance(grain,near)<48&&(grain.x-old.x)*dx+(grain.y-old.y)*dy>=-20){grain.x=clamp(grain.x+dx*.95,110,778);grain.y=clamp(grain.y+dy*.95,175,520);}
 }
 const kept=state.dust.filter(d=>!(dx>0&&d.x>=dustpan.x&&d.x<=dustpan.x+dustpan.w&&d.y>=dustpan.y&&d.y<=dustpan.y+dustpan.h));
 state.dustCollected+=state.dust.length-kept.length;state.dust=kept;state.progress=Math.min(.99,state.dustCollected/18);
 if(!state.dust.length)leaveDust();
}
function drawSweep(){
 rect(87,127,731,395,16,shade(127,395,'#eee4cb','#d8c6a1'),'#c9b78f');
 for(let x=225;x<815;x+=145)line(x,130,x,519,'#c9b894',2);for(let y=235;y<520;y+=100)line(91,y,814,y,'#c9b894',2);
 // The lip in the drawing is also the collection boundary.
 oval(673,415,92,15,'#b19e7750');path(c=>{c.moveTo(dustpan.x,294);c.lineTo(714,267);c.quadraticCurveTo(758,324,729,400);c.lineTo(dustpan.x,400);c.closePath()},shade(270,130,'#c1d6a7','#789b76'),'#567d60',3);
 path(c=>{c.moveTo(626,306);c.lineTo(702,285);c.quadraticCurveTo(731,328,712,380);c.lineTo(626,380);c.closePath()},'#90ad83','#6b916b',2);
 line(610,294,610,400,'#e1e8bb',6);line(733,290,767,197,'#587a5d',17);line(731,286,765,195,'#a6bd8a',5);rect(756,169,25,42,10,'#6c9068','#4e7355');
 for(const d of state.dust){
  if(d.kind===1){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(.4);rect(-d.r,-d.r,d.r*2,d.r*1.6,1,'#f2e4bd','#a99777');ctx.restore();}
  else if(d.kind===2){path(c=>{c.moveTo(d.x-d.r,d.y);c.lineTo(d.x+d.r,d.y-d.r);c.lineTo(d.x+2,d.y+d.r);c.closePath()},'#ac9270',null);}
  else circle(d.x,d.y,d.r,'#9e8a6d');
 }
 const p=state.broom;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.22);
 rect(-6,-176,13,166,5,shade(-176,166,'#cfad76','#a47f4b'),'#8c6e48');rect(-10,-188,21,32,8,'#799368','#527152');
 path(c=>{c.moveTo(-39,-9);c.lineTo(39,-9);c.lineTo(57,31);c.quadraticCurveTo(0,44,-57,31);c.closePath()},shade(-9,48,'#ebcf87','#c79f56'),'#a88548',2);
 for(let x=-44;x<=44;x+=8)line(x*.75,2,x,32,'#aa874c',1.5);
 rect(-44,-19,88,25,7,shade(-19,25,'#e3a18a','#bf7569'),'#9d605b');line(-34,-14,34,-14,'#efc4a1',3);ctx.restore();
 pill(450,563,state.sweepRounds?'QUEDA UNA ÚLTIMA RAYITA':'JUNTÁ TODO EN LA PALA');text(450,592,'Deslizá para barrer. La pala está a la derecha.',16);
}

function createSushi(){
 state.sushiPieces=['nigiri','maki','tamago'].map((kind,i)=>({id:i,kind,home:{x:237,y:245+i*108},position:{x:237,y:245+i*108},delivered:false,broken:false,limit:165-i*15}));
 state.sushiActive=0;state.sushiHeld=false;state.sushiGrip=0;state.sushiPressure=0;state.sushiRecover=0;state.sushiDebris=[];
}
function sushiPiece(){return state.sushiPieces[state.sushiActive]}
function onSushiPlate(p){return Math.hypot((p.x-680)/103,(p.y-350)/127)<1}
function crumbleSushi(count=true){
 const c=sushiPiece();if(!c||c.delivered||c.broken)return;
 c.broken=true;state.sushiHeld=false;state.sushiGrip=0;state.sushiPressure=0;state.grabbing=false;state.penalty=.85;state.noticeTime=4;state.sushiRecover=.85;
 state.sushiDebris=Array.from({length:16},(_,i)=>({x:c.position.x+Math.cos(i*2.4)*(19+i*2),y:c.position.y+Math.sin(i*2.4)*(15+i*1.8),color:i%5===0?'#df956e':'#fff5d9'}));
 if(count){state.fail++;state.attempts++;}state.progress=state.sushiPieces.filter(c=>c.delivered).length/3;setQuote('“Se desarmó. Eran palitos, no una prensa.”');
}
function moveSushi(p,speed){
 const c=sushiPiece();if(!c||c.broken||c.delivered)return;
 if(!state.sushiHeld){if(distance(p,c.position)>(inputType==='mouse'?30:touchRadius(8,18)))crumbleSushi();return}
 c.position={x:clamp(p.x,130,785),y:clamp(p.y,170,520)};
 const movementLimit=c.limit*(inputType==='mouse'?3:1);
 if(speed>movementLimit)crumbleSushi();
}
function releaseSushi(e){
 if(!state||state.finished)return;
 const c=sushiPiece();if(!c)return;
 if(state.sushiHeld){
  state.sushiHeld=false;
  if(e?.type==='pointerup'&&onSushiPlate(c.position)){
   c.delivered=true;c.position=[{x:635,y:270},{x:710,y:350},{x:635,y:430}][c.id];state.sushiPressure=0;state.sushiGrip=0;
   state.progress=state.sushiPieces.filter(p=>p.delivered).length/3;setQuote('“Una pieza entera. Seguimos.”');if(state.sushiPieces.every(p=>p.delivered))win();
  }else crumbleSushi();
 }else{state.sushiGrip=0;state.sushiPressure=0;}
}
function advanceSushi(dt){
 if(state.sushiRecover>0){state.sushiRecover=Math.max(0,state.sushiRecover-dt);if(state.sushiRecover===0){for(const c of state.sushiPieces)if(c.broken){c.broken=false;c.position={...c.home};}state.sushiDebris=[];}return}
 if(!pressed||!state.grabbing||state.penalty>0)return;
 const c=sushiPiece();if(!c||c.delivered)return;
 if(!state.sushiHeld){state.sushiGrip+=dt;state.sushiPressure=Math.min(.42,state.sushiGrip/.38*.42);if(state.sushiGrip>=.38){state.sushiHeld=true;setQuote('“La tenés. Sin apretar tanto. Al plato.”');}}
 else{state.sushiPressure+=dt*(state.motion<20?.16:.03);if(state.sushiPressure>=.96)crumbleSushi();}
}

function down(e){
 if(state?.chaos)return;
 if(mode==='sheet'){sheetDown(e);return}
 if(!mode||state.finished||state.penalty>0||activePointer!==null)return;
 e.preventDefault();inputType=e.pointerType||'mouse';activePointer=e.pointerId;canvas.setPointerCapture(e.pointerId);
 const p=point(e);pressed=true;origin=p;lastPointer=p;tick=performance.now();state.motion=0;mx=p.x;my=p.y;grabOffset={x:0,y:0};
 if(mode==='sushi'){const pieces=state.sushiPieces.filter(c=>!c.delivered&&!c.broken).sort((a,b)=>distance(p,a.position)-distance(p,b.position)),c=pieces[0];if(c&&distance(p,c.position)<touchRadius(23,60)){state.sushiActive=c.id;state.grabbing=true;state.sushiGrip=0;state.sushiPressure=0;grabOffset={x:c.position.x-p.x,y:c.position.y-p.y};setQuote('“Cerrá los palitos despacio…”')}else setQuote('“Elegí una de las piezas de la tabla.”');}
 if(mode==='sweep'){state.grabbing=true;grabOffset={x:state.broom.x-p.x,y:state.broom.y-p.y};state.attempts++;}
 if(mode==='dog'&&state.dogStage==='offer'){state.grabbing=true;grabOffset={x:state.dogHand.x-p.x,y:state.dogHand.y-p.y};state.attempts++;}
 if(mode==='leaf'){state.grabbing=true;grabOffset={x:state.tongue.x-p.x,y:state.tongue.y-p.y};state.attempts++;}
 if(mode==='bomb')bombTouch(p);
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
 if(mode==='sweep')moveBroom(p);
 if(mode==='dog')moveDog(p,speed);
 if(mode==='sushi')moveSushi(p,speed);
}
function updateWood(){
 if(state.finished)return;
 if(state.tightness>screwLimits.over){breakWood();return}
 state.progress=clamp(state.tightness,0,1);
 const hint=state.tightness>=screwLimits.ready?'ready':'loose';
 if(hint!==state.screwHint){state.screwHint=hint;setQuote(hint==='ready'?'“Ya está. Soltá. No le des otra vuelta.”':'“Todavía le falta un poquito.”')}
}
function breakWood(){
 if(state.finished)return;
 const id=activePointer;state.woodBroken=true;state.woodDamage=1;state.finished=true;state.outcome='broken';state.grabbing=false;state.fail++;state.attempts++;
 state.tightness=0;state.progress=0;state.angle=null;state.screwHint='broken';pressed=false;activePointer=null;
 if(id!==null&&canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);
 $('overlay-title').textContent='Te pasaste de lo verde.';$('overlay-text').textContent='La madera se partió. La barra vuelve al principio: soltá dentro de la zona verde en el próximo intento.';$('again').textContent='Jugar de nuevo';$('overlay').classList.add('on');setQuote('“Era soltar ahí. Justo ahí.”');syncActions();
}
function up(e){
 if(mode==='sheet'){sheetUp(e);return}
 if(e&&e.pointerId!==undefined&&e.pointerId!==activePointer)return;
 if(mode==='bomb'&&state.grabbing&&e?.type==='pointerup'){const wire=bombWireAt(point(e));if(wire>=0)bombAction('wire',wire);}
 const finish=mode==='screw'&&state&&!state.finished&&pressed&&state.grabbing&&e&&e.type==='pointerup'&&state.tightness>=screwLimits.ready&&state.tightness<=screwLimits.over;
 pressed=false;activePointer=null;
 if(state){state.grabbing=false;state.cornerHold=0;state.cornerIndex=null;state.threadHold=0;state.dockHold=0;state.tapeGrip=0}
 if(mode==='sushi')releaseSushi(e);
 if(finish)win();
}
function almostThere(){
 if(!state||state.finished||state.penalty>0)return false;
 if(mode==='bomb')return false;
 if(mode==='dog')return state.dogStage==='check'||state.dogFeed>.35;
 if(mode==='sheet')return state.fitted.every(Boolean)&&state.sheetHold>.65;
 if(!pressed||!state.grabbing)return false;
 if(mode==='sushi')return state.sushiHeld&&sushiPiece().position.x>490;
 if(mode==='sweep')return state.progress>.78;
 if(mode==='tape')return state.peel>.65;
 if(mode==='usb')return state.usbCables.filter(c=>c.connected).length===2&&state.dockHold>.35;
 if(mode==='screw')return state.tightness>.85;
 if(mode==='needle'){const p=needleLocal(state.thread,needleEye());return state.threadStage==='through'||(p.x> -24&&p.x<30&&Math.abs(p.y)<24)}
 if(mode==='leaf')return state.leafLoosen>.85||state.leafAttached;
 return false;
}
function sneezeImpact(){
 if(!state||state.finished||mode==='bomb')return;
 const ids=mode==='sheet'?Array.from(sheetPointers.keys()):activePointer===null?[]:[activePointer];
 if(mode==='sheet'){for(const key of sheetKeys)sneezeBlockedKeys.add(key);sheetPointers.clear();sheetKeys.clear();state.fitted=[false,false,false,false];state.sheetHold=0;}
 pressed=false;activePointer=null;state.grabbing=false;state.dockHold=0;state.tapeGrip=0;state.motion=0;state.fail++;state.attempts++;state.penalty=.65;state.noticeTime=4;
 for(const id of ids)if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);
 if(mode==='sweep'){state.dust.push(...floorDust(8));state.dustCollected=Math.max(0,state.dustCollected-8);state.progress=Math.min(.99,state.dustCollected/18);}
 if(mode==='sushi'){const c=sushiPiece();if(c.delivered)c.delivered=false;crumbleSushi(false);}
 if(mode==='tape'){state.peel=Math.max(0,state.peel-.48);state.progress=state.peel;}
 if(mode==='usb'){const c=cable();if(c){if(c.connected){c.connected=false;state.usbPorts[c.port].occupiedBy=null;}c.position={...c.home};}state.progress=state.usbCables.filter(c=>c.connected).length/3;}
 if(mode==='needle'){state.thread={x:175,y:350};state.threadStage='approach';state.threadInsertion=0;state.progress=0;}
 if(mode==='dog'){state.dogStage='offer';state.dogHand={x:220,y:400};state.dogFeed=0;state.dogWait=0;state.progress=0;}
 if(mode==='leaf'){state.leaf={x:494,y:267};state.tongue={x:450,y:425};state.leafAttached=false;state.leafLoosen=0;state.progress=0;}
 if(mode==='sheet')state.progress=0;
 if(mode==='screw'){state.tightness+=.34;updateWood();}
 setQuote(mode==='screw'&&state.woodBroken?'“¡Achís! Una vuelta de más y se partió.”':'“¡Achís! Justo ahora. Volvé a agarrar.”');
}

function advance(dt,now){
 if(!state)return;
 if(state.chaos){state.chaosTime+=dt;chaosOverlay();}
 state.noticeTime=Math.max(0,state.noticeTime-dt);
 if(!state.chaos&&mode!=='bomb'&&Sneeze.tick(state.sneeze,dt,almostThere())){sneezeImpact();return}
 if(state.finished)return;
 state.elapsed=mode==='bomb'?(state.bombStarted?state.elapsed+dt:0):(now-state.started)/1000;state.penalty=Math.max(0,state.penalty-dt);state.heat=Math.max(0,state.heat-dt*.045);
 if(now-tick>100)state.motion=0;
 if(mode==='dog'){advanceDog(dt);return}
 if(mode==='sushi'){advanceSushi(dt);return}
 if(mode==='bomb'){
 state.bombFeedback=Math.max(0,state.bombFeedback-dt);
 if(state.bombStarted){state.bombRemaining=Math.max(0,state.bombRemaining-dt);if(state.bombRemaining===0)explodeBomb();}return;
 }
 if(mode==='sheet'){
 syncSheet();const n=state.fitted.filter(Boolean).length;
 if(n===4){state.sheetHold+=dt;if(state.sheetHold>=1.6){win();return}}else state.sheetHold=0;
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
 ctx.save();if(state.chaos){ctx.translate(W/2,H/2);ctx.rotate(-.06*Math.min(1,state.chaosTime));ctx.translate(-W/2,-H/2);}
 if(mode==='dog')drawDog();if(mode==='tape')drawTape();if(mode==='usb')drawUSB();if(mode==='sheet')drawSheet();if(mode==='screw')drawScrew();if(mode==='needle')drawNeedle();if(mode==='leaf')drawLeaf();if(mode==='bomb')drawBomb();if(mode==='sweep')drawSweep();if(mode==='sushi')drawSushi();
 ctx.restore();if(state.chaos)Desastre.draw(ctx,W,H,state.chaosTime,mode);
 if(state.noticeTime>0&&!state.chaos){rect(280,77,340,36,18,'#f5e0d0');text(450,101,mode==='tape'?'La cinta se soltó. Volvé a la pestaña.':mode==='leaf'?'Se escapó la hojita. Probá más suave.':mode==='sushi'?'Se desarmó. Probá con otra pieza.':mode==='dog'?'El queso sí. La pastilla, todavía no.':'Volvé a intentar, despacio.',14,'#9a4d32')}
 Sneeze.draw(ctx,state.sneeze,W,H);
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
 const active=cable(),signal=usbSignal(active);
 oval(701,541,137,17,'#b8aa8166');rect(612,145,204,391,20,'#92a59566');rect(607,137,204,391,20,shade(137,391,'#e0ebdc','#a8beb0'),'#819e8b');rect(607,137,204,24,12,'#edf4df');
 for(const port of state.usbPorts){
  const color=port.color,y=port.y;rect(627,y-40,164,80,10,shade(y-40,80,color.light,color.base),color.dark);
  rect(643,y-25,108,50,5,'#293e34','#6b8070');const cy=y+(port.face?3:-17);rect(652,cy,89,17,2,'#9daf99');
  [661,681,701,721].forEach(x=>rect(x,cy,8,11,1,'#eed697'));text(774,y+6,String(port.id+1),20,'#fff9e8');
  const status=port.occupiedBy!==null?'green':signal.portId===port.id?signal.status:'off';usbLight(774,y-25,status);
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
  text(-58,7,c.label,22,'#fff9e9');usbLight(-28,12,c.connected?'green':c.id===state.activeCable?signal.status:'off');
  if(!c.connected&&c.id===state.activeCable)rect(-111,-35,107,70,15,'transparent','#ad7852');ctx.restore();
 }
 if(active&&!active.connected&&state.dockHold>0){const port=state.usbPorts[active.port];ctx.beginPath();ctx.arc(697,port.y,56,-Math.PI/2,-Math.PI/2+Math.min(1,state.dockHold/1.1)*Math.PI*2);ctx.strokeStyle='#648c58';ctx.lineWidth=4;ctx.stroke();}
 pill(450,558,state.usbCables.filter(c=>c.connected).length+' / 3 CABLES CONECTADOS');text(450,590,signal.message,15,signal.status==='red'?'#ad5145':signal.status==='green'?'#4d7e47':'#63775b');
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
 const gx=290,gy=465,gw=320;rect(gx,gy,gw,10,5,'#c29d67');rect(gx+gw*screwLimits.ready/screwLimits.scale,gy,gw*(screwLimits.over-screwLimits.ready)/screwLimits.scale,10,3,'#7d9e62');
 const marker=gx+gw*Math.min(1,state.tightness/screwLimits.scale);line(marker,gy-6,marker,gy+16,state.woodDamage>0?'#a55338':'#fff9e8',3);text(450,503,'PUNTO JUSTO: ZONA VERDE',12);
 pill(450,567,state.woodBroken?'LA MADERA SE PARTIÓ':state.screwHint==='ready'?'YA ESTÁ AJUSTADO · SOLTÁ':'GIRÁ DESPACIO Y MIRÁ LA TENSIÓN');text(450,595,state.woodBroken?'Te pasaste. La barra volvió al principio.':'Pasarte del verde hace perder. Soltá dentro de la zona.',15,state.woodDamage>0?'#a85337':'#5d6759');
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
 // The lips define the opening; teeth and tongue are clipped inside it.
 oval(450,351,321,198,'#b6836540');
 oval(450,327,324,211,shade(116,422,'#f4c7a1','#dfa481'));
 path(c=>{c.moveTo(197,317);c.bezierCurveTo(263,231,339,165,414,180);c.quadraticCurveTo(450,198,486,180);c.bezierCurveTo(561,165,637,231,703,317);c.bezierCurveTo(634,275,560,217,450,211);c.bezierCurveTo(340,217,266,275,197,317);c.closePath()},shade(174,150,'#d48178','#ac5360'),'#ad6061',2);
 path(c=>{c.moveTo(197,317);c.bezierCurveTo(265,435,338,523,450,526);c.bezierCurveTo(562,523,635,435,703,317);c.bezierCurveTo(644,412,561,482,450,484);c.bezierCurveTo(339,482,256,412,197,317);c.closePath()},shade(317,212,'#b75d69','#ed9c95'),'#b7676a',2);
 const mouthOpening=()=>{ctx.beginPath();ctx.moveTo(197,317);ctx.bezierCurveTo(270,248,345,211,450,211);ctx.bezierCurveTo(555,211,630,248,703,317);ctx.bezierCurveTo(644,412,561,482,450,484);ctx.bezierCurveTo(339,482,256,412,197,317);ctx.closePath()};
 mouthOpening();ctx.fillStyle=shade(211,274,'#673842','#351f31');ctx.fill();
 ctx.save();mouthOpening();ctx.clip();
 // Gum lines sit behind both rows of teeth, within the dark cavity.
 oval(450,204,242,54,'#c8777b');oval(450,475,235,45,'#b76974');
 for(let i=0;i<7;i++){
  const x=240+i*64,drop=Math.abs(i-3)*5;
  rect(x,191+drop,58,101-drop,14,shade(191,101,'#fffdf0','#ded7bf'),'#bfb29e');
  line(x+13,219+drop,x+42,219+drop,'#fffef7',3);
  // Lower teeth follow the lower jaw, behind the tongue.
  const rise=Math.abs(i-3)*11;
  rect(x,424-rise,58,95,14,shade(411,108,'#f9f1dd','#d6c5af'),'#baaa96');
 }
 const p=state.tongue;
 path(c=>{c.moveTo(340,486);c.bezierCurveTo(330,436,p.x-58,p.y+30,p.x-49,p.y);c.bezierCurveTo(p.x-45,p.y-56,p.x+45,p.y-56,p.x+49,p.y);c.bezierCurveTo(p.x+58,p.y+30,570,436,560,486);c.quadraticCurveTo(450,529,340,486);c.closePath()},shade(p.y-44,240,'#f3a0aa','#b75978'),'#a4536c',3);
 path(c=>{c.moveTo(450,495);c.quadraticCurveTo(p.x+6,p.y+80,p.x,p.y-9)},null,'#ce7188',2);
 oval(p.x-16,p.y-21,17,7,'#ffd0ca');
 const leaf=state.leaf;ctx.save();ctx.translate(leaf.x,leaf.y);ctx.rotate(-.4);
 path(c=>{c.moveTo(0,24);c.bezierCurveTo(-31,6,-24,-16,10,-25);c.bezierCurveTo(29,-2,23,17,0,24);c.closePath()},shade(-25,50,'#9fc761','#4f8e4f'),'#3d7346',2);
 line(1,20,8,-19,'#d2e293',2);line(4,2,-11,-7,'#a6c971',1.5);line(6,-7,18,-13,'#a6c971',1.5);ctx.restore();
 if(!state.leafAttached){dotted(leaf.x,leaf.y,30,'#7e9d58');if(state.leafLoosen>0){ctx.beginPath();ctx.arc(leaf.x,leaf.y,36,-Math.PI/2,-Math.PI/2+state.leafLoosen*Math.PI*2);ctx.strokeStyle='#e5c473';ctx.lineWidth=4;ctx.stroke();}}
 ctx.restore();
 // Lip highlights and corner creases make the mouth read as a face.
 path(c=>{c.moveTo(347,197);c.quadraticCurveTo(382,180,410,191)},null,'#efb1a0',4);
 path(c=>{c.moveTo(377,506);c.quadraticCurveTo(450,529,523,506)},null,'#f5b6a7',6);
 path(c=>{c.moveTo(189,304);c.quadraticCurveTo(181,321,194,340);c.moveTo(711,304);c.quadraticCurveTo(719,321,706,340)},null,'#ba7a69',3);
 if(state.leafAttached){arrow(726,345,726,462,'#8b9d65');}
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
 text(442,193,state.bombFeedback>0?'SEÑAL OK':'EN LÍNEA',23,'#b6da97');
 text(442,223,state.bombCode||'— — — — — —',17,'#d4d99e');
 for(const c of bombExtras){
  if(c.kind==='key'){
   const on=state.bombKey===c.id&&state.bombFeedback>0;rect(c.x-18,c.y-17,36,36,7,'#76816c');rect(c.x-18,c.y-20,36,34,7,on?'#e3c37e':'#e8e1c6','#8b987e');text(c.x,c.y+3,String(c.id+1),18,'#52634e');
  }else if(c.kind==='switch'){
   const on=state.bombSwitches[c.id];rect(c.x-18,c.y-18,36,36,9,'#74836d','#c8ceb0');rect(c.x-5,c.y-13,10,26,5,'#3c5248');circle(c.x,c.y+(on?-8:8),10,on?'#d6bb76':'#e0dec8','#879781');circle(c.x+27,c.y,4,on?'#e6cb7c':'#5c715d');
  }else if(c.kind==='knob'){
   const angle=state.bombKnobs[c.id]*Math.PI/4;circle(c.x,c.y,30,'#7d8f76','#e7dfbf',3);circle(c.x,c.y,22,shade(c.y-22,44,'#bdcaa3','#849c7c'),'#5e7a64');line(c.x,c.y,c.x+Math.sin(angle)*18,c.y-Math.cos(angle)*18,'#faf1ca',4);text(c.x,c.y+43,c.id?'GANANCIA':'MODO',10,'#546c54');
  }else{
   const on=state.bombAux[c.id];circle(c.x,c.y+3,19,'#6e7a65','#d1d6b6',2);circle(c.x,c.y,15,on?'#edcb6d':(c.id?'#b2a3c8':'#76a5ae'));text(c.x,c.y+5,c.id?'B':'A',12,'#fff4d4');
  }
 }
 for(let i=0;i<8;i++){const on=(state.attempts+i)%3!==0;circle(387+i*22,492,4,on?'#dce5a1':'#6c806b');}
 bombWires.forEach((wire,i)=>{
  circle(wire.x-24,260,11,'#6b7962','#dae2c0');circle(wire.x+24,354,11,'#6b7962','#dae2c0');
  if(state.bombCuts[i]){
   path(c=>{c.moveTo(wire.x-24,260);c.quadraticCurveTo(wire.x+10,273,wire.x-9,299)},null,wire.color,9);
   path(c=>{c.moveTo(wire.x+12,318);c.quadraticCurveTo(wire.x-12,338,wire.x+24,354)},null,wire.color,9);
   circle(wire.x-9,299,4,'#e8c581');circle(wire.x+12,318,4,'#e8c581');
  }else{
   path(c=>{c.moveTo(wire.x-24,260);c.bezierCurveTo(wire.x+38,280,wire.x-40,327,wire.x+24,354)},null,'#52634e',13);
   path(c=>{c.moveTo(wire.x-24,259);c.bezierCurveTo(wire.x+38,279,wire.x-40,326,wire.x+24,353)},null,wire.color,9);
  }
  text(wire.x,388,['◆','●','▲','■'][i],16,'#667c61');
 });
 circle(330,455,40,'#914c48','#d2c9ac',4);circle(330,449,34,shade(415,68,'#edb19a','#c46d63'),'#a15c51');text(330,457,state.bombButton?'✓':'↻',27,'#fff3d4');
 circle(647,455,35,'#627b68','#d9dcc1',4);circle(647,455,24,'#9eb38e');line(647,455,647+Math.sin(state.bombDial*Math.PI/3)*21,455-Math.cos(state.bombDial*Math.PI/3)*21,'#f5efce',5);
 rect(414,423,135,51,9,'#d8dab9','#82977b');text(481,455,state.bombFeedback>0?'✓ OK':'REVISAR',16,'#536c50');
 const tool=state.grabbing?{x:mx,y:my}:{x:787,y:350};
 ctx.save();ctx.translate(tool.x,tool.y);ctx.rotate(-.35);
 line(-5,5,-24,58,'#608779',13);line(5,5,24,58,'#608779',13);
 path(c=>{c.moveTo(-7,6);c.lineTo(-23,-30);c.lineTo(-7,-18);c.lineTo(0,-4);c.lineTo(7,-18);c.lineTo(23,-30);c.lineTo(7,6);c.closePath()},'#b8c1b2','#657c71',2);circle(0,7,7,'#d1b77e','#687a6b');ctx.restore();
 if(!state.grabbing)text(787,435,state.bombTool?'PINZAS LISTAS':'PINZAS',13,'#607a65');
 pill(450,557,state.bombFeedback>0?'SEÑAL ESTABLE · REVISANDO':'PANEL EN ESPERA');text(450,590,'Botones, teclas, perillas… Alguna combinación debe servir.',16);
}

function dogGlow(x,y,r,light,dark){const g=ctx.createRadialGradient(x-r*.3,y-r*.4,r*.08,x,y,r);g.addColorStop(0,light);g.addColorStop(1,dark);return g;}
function drawDog(){
 const clock=state.dogClock,mouth=dogMouth(),dx=mouth.x-564,dy=mouth.y-341;
 const open=dogOpen()||state.dogStage==='spit',chew=state.dogStage==='chew',chewY=chew?Math.sin(clock*17)*3:0;
 // A sunlit room and upholstered sofa, drawn with the same shapes at every scale.
 rect(78,127,744,402,25,shade(127,402,'#c5c8a0','#a5ae87'),'#bcc09a');
 rect(95,143,142,186,6,'#e9d9ac','#c1b78d');rect(104,151,124,170,3,shade(151,170,'#fff3c6','#dcd8ac'));
 line(165,151,165,322,'#c9c99f',5);line(104,231,228,231,'#d2cba3',5);
 path(c=>{c.moveTo(109,148);c.lineTo(215,148);c.lineTo(492,514);c.lineTo(246,514);c.closePath()},'#fff0b72b',null);
 rect(102,242,678,249,36,shade(242,249,'#a7b48b','#7f9471'),'#839574');
 rect(111,257,202,176,28,shade(257,176,'#b7c49a','#94a67f'),'#91a37d');rect(320,257,203,176,28,shade(257,176,'#b5c198','#91a47e'),'#91a37d');
 line(319,279,319,413,'#d1d6af',2);rect(106,415,676,99,25,shade(415,99,'#bac7a1','#92a87f'),'#829a74');
 path(c=>{c.moveTo(114,451);c.quadraticCurveTo(428,469,772,446)},null,'#d0d9b6',3);
 ctx.save();ctx.translate(233,326);ctx.rotate(-.15);rect(-80,-70,157,142,22,shade(-70,142,'#e9dfbb','#c8c7a2'),'#aeb58d');
 for(let i=-56;i<70;i+=24){line(i,-64,i,64,'#b1b996',7);line(-73,i,70,i,'#c0c5a0',7);line(i+4,-64,i+4,64,'#f6ecd1',1);}ctx.restore();
 // Soft shadows, wagging tail, fluffy chest and separate toes.
 oval(649,512,151,15,'#6f795334');
 const wag=Math.sin(clock*5)*9;
 path(c=>{c.moveTo(736,467);c.bezierCurveTo(797,451,797+wag,406,778+wag,397)},null,'#987048',27);
 path(c=>{c.moveTo(738,461);c.bezierCurveTo(792,445,792+wag,410,778+wag,397)},null,'#d5ab71',20);
 oval(676,436,99,75,dogGlow(665,422,111,'#eac48a','#ae7e4a'),'#af8653');
 path(c=>{c.moveTo(610,377);c.bezierCurveTo(578,414,583,466,613,487);c.quadraticCurveTo(646,506,675,477);c.bezierCurveTo(682,448,664,399,651,382);c.closePath()},shade(381,112,'#fff0c7','#dbc08f'),'#c7a675');
 path(c=>{c.moveTo(613,405);c.lineTo(607,430);c.lineTo(617,425);c.lineTo(613,449);c.moveTo(650,406);c.lineTo(660,430);c.lineTo(651,426)},null,'#e5c994',2);
 oval(609,487,38,24,dogGlow(605,479,46,'#f0d3a0','#c19762'),'#b08a59');oval(707,487,41,24,dogGlow(697,479,49,'#ebca91','#ba8e57'),'#ad8150');
 for(const x of [594,610,691,707])path(c=>{c.moveTo(x,489);c.quadraticCurveTo(x-3,496,x,504)},null,'#a9875c',1.7);
 rect(588,375,125,22,10,shade(375,22,'#91aa7f','#56775e'),'#4f7358');line(597,379,703,379,'#bdd0a0',2);circle(647,401,13,dogGlow(645,398,16,'#f6de99','#c5a254'),'#af8e45');circle(647,401,5,'#e8c77c');
 // Ears sit behind the head; a cream blaze and overlapping cheeks give the muzzle depth.
 ctx.save();ctx.translate(dx,dy);
 path(c=>{c.moveTo(562,214);c.bezierCurveTo(539,184,504,212,503,274);c.bezierCurveTo(499,319,511,365,537,363);c.bezierCurveTo(562,362,575,299,579,251);c.closePath()},shade(204,164,'#b78852','#805938'),'#997044',2);
 path(c=>{c.moveTo(547,226);c.bezierCurveTo(524,243,515,315,531,345)},null,'#cf9f66',6);
 path(c=>{c.moveTo(570,213);c.bezierCurveTo(581,178,620,164,660,172);c.bezierCurveTo(700,169,745,202,753,244);c.bezierCurveTo(773,293,751,363,710,389);c.bezierCurveTo(664,421,601,396,570,363);c.bezierCurveTo(548,337,543,268,557,237);c.closePath()},dogGlow(625,258,173,'#f3d298','#bc8a50'),'#b48956',2);
 path(c=>{c.moveTo(597,203);c.quadraticCurveTo(625,181,649,185);c.moveTo(615,191);c.quadraticCurveTo(625,171,638,177);c.moveTo(641,185);c.quadraticCurveTo(655,177,666,184)},null,'#f8dda8',4);
 path(c=>{c.moveTo(627,184);c.bezierCurveTo(611,219,614,258,599,283);c.quadraticCurveTo(578,299,572,324);c.lineTo(636,328);c.bezierCurveTo(644,289,620,256,634,221);c.quadraticCurveTo(643,192,627,184);c.closePath()},shade(184,150,'#fff1cd','#e9d2a4'),null);
 // Glossy almond eyes track the cheese instead of staring straight ahead.
 const focus=state.dogStage==='offer'?state.dogHand:mouth,lookX=state.dogTurn>0?6:clamp((focus.x-625)/55,-6,4),lookY=clamp((focus.y-280)/80,-3,4);
 for(const eye of [{x:591,y:268,rx:23,ry:27},{x:683,y:264,rx:24,ry:28}]){
  oval(eye.x,eye.y+3,eye.rx+4,eye.ry+4,'#b18757');oval(eye.x,eye.y,eye.rx,eye.ry,'#fff4d8','#946b45');
  oval(eye.x+lookX,eye.y+lookY,16,21,dogGlow(eye.x+lookX-3,eye.y+lookY-6,25,'#b9874e','#513a2a'),'#4c3929');
  oval(eye.x+lookX-1,eye.y+lookY+1,9,15,'#302e28');oval(eye.x+lookX-6,eye.y+lookY-8,6,8,'#fff9e6');circle(eye.x+lookX+6,eye.y+lookY+9,2.5,'#e6d0a0');
  path(c=>{c.moveTo(eye.x-eye.rx,eye.y-4);c.quadraticCurveTo(eye.x-3,eye.y-eye.ry-13,eye.x+eye.rx,eye.y-7)},null,'#8b633d',3);
 }
 const brow=state.dogTurn>0?5:0;
 path(c=>{c.moveTo(566,236);c.quadraticCurveTo(583,222-brow,605,233);c.moveTo(664,228);c.quadraticCurveTo(684,217+brow,704,234)},null,'#b0804e',6);
 path(c=>{c.moveTo(716,217);c.bezierCurveTo(735,192,768,204,778,249);c.bezierCurveTo(796,301,790,375,763,389);c.bezierCurveTo(735,404,711,362,708,312);c.bezierCurveTo(701,270,702,236,716,217);c.closePath()},dogGlow(738,261,145,'#c79a60','#87603c'),'#9d7547',2.5);
 for(let i=0;i<5;i++)path(c=>{const x=720+i*10;c.moveTo(x,237+i*2);c.bezierCurveTo(x-10,279,x+29,328,x+6,367-i*3)},null,i%2?'#a57a49':'#d1a56b',2);
 // The visible mouth center is also the unchanged gameplay target (564,341).
 oval(606,343,48,47,dogGlow(595,325,73,'#fff0c9','#d7b47f'));
 path(c=>{c.moveTo(525,316);c.bezierCurveTo(537,293,566,288,588,303);c.bezierCurveTo(622,301,635,325,628,350+chewY);c.bezierCurveTo(622,377+chewY,574,385,539,369);c.bezierCurveTo(516,360,511,337,525,316);c.closePath()},dogGlow(563,322,92,'#fff0c7','#e0c18e'),'#c4a16e',2);
 if(open){
  path(c=>{c.moveTo(526,334);c.quadraticCurveTo(564,320,602,334);c.bezierCurveTo(601,365,579,378,555,369);c.quadraticCurveTo(534,366,526,334);c.closePath()},shade(324,51,'#553933','#392a2b'),'#8e6450',2);
  oval(564,357,22,11,shade(346,23,'#efb6aa','#cb8b87'));line(564,350,565,362,'#bd7e7c',1.5);
  path(c=>{c.moveTo(536,335);c.lineTo(542,345);c.lineTo(548,334);c.moveTo(585,333);c.lineTo(591,344);c.lineTo(596,335)},'#fff5d9',null);
 }else path(c=>{c.moveTo(530,340+chewY);c.quadraticCurveTo(563,356+chewY,600,338-chewY)},null,'#86604b',3.5);
 path(c=>{c.moveTo(553,301);c.bezierCurveTo(563,293,589,294,599,302);c.quadraticCurveTo(605,313,582,325);c.quadraticCurveTo(557,322,553,301);c.closePath()},dogGlow(576,303,32,'#6e6453','#3c3830'),'#554838',2);
 oval(570,301,12,4,'#a3967c');oval(562,308,5,3,'#342e28');oval(590,309,5,3,'#342e28');line(579,324,578,333,'#987758',2);
 for(const [x,y]of [[535,323],[546,326],[534,335],[608,321],[615,333]])circle(x,y,1.7,'#b69a71');
 path(c=>{c.moveTo(622,355);c.quadraticCurveTo(649,348,658,331)},null,'#e8c795',3);
 ctx.restore();
 if(state.dogStage==='offer'){
  const p=state.dogHand;
  // One continuous palm silhouette, two pinching fingers and a fingernail.
  path(c=>{c.moveTo(77,502);c.bezierCurveTo(123,477,p.x-119,p.y+56,p.x-63,p.y+32);c.quadraticCurveTo(p.x-42,p.y+43,p.x-19,p.y+29);c.quadraticCurveTo(p.x+5,p.y+26,p.x+8,p.y+12);c.quadraticCurveTo(p.x+8,p.y+2,p.x-7,p.y+2);c.lineTo(p.x-38,p.y+5);c.quadraticCurveTo(p.x-45,p.y-1,p.x-28,p.y-4);c.lineTo(p.x+7,p.y-5);c.quadraticCurveTo(p.x+20,p.y-12,p.x+8,p.y-20);c.quadraticCurveTo(p.x-21,p.y-29,p.x-53,p.y-12);c.bezierCurveTo(p.x-99,p.y+3,119,439,77,450);c.closePath()},shade(p.y-24,150,'#f6c89e','#d69c75'),'#bf8965',2);
  path(c=>{c.moveTo(p.x-58,p.y+4);c.quadraticCurveTo(p.x-53,p.y+27,p.x-32,p.y+27);c.moveTo(p.x-36,p.y+8);c.quadraticCurveTo(p.x-24,p.y+13,p.x-9,p.y+9)},null,'#d29b76',2);
  oval(p.x-5,p.y+12,11,7,'#f4d5b8','#d9ae8e');line(p.x-10,p.y+16,p.x+3,p.y+16,'#fff0d8',1);
  path(c=>{c.moveTo(p.x-19,p.y-23);c.lineTo(p.x+12,p.y-28);c.lineTo(p.x+24,p.y-16);c.lineTo(p.x-7,p.y-11);c.closePath()},'#ffe9a5','#c3a258',1.5);
  path(c=>{c.moveTo(p.x-19,p.y-23);c.lineTo(p.x-7,p.y-11);c.lineTo(p.x-6,p.y+10);c.lineTo(p.x-19,p.y-1);c.closePath()},'#dab35d','#c3a258',1.5);
  path(c=>{c.moveTo(p.x-7,p.y-11);c.lineTo(p.x+24,p.y-16);c.lineTo(p.x+22,p.y+5);c.lineTo(p.x-6,p.y+10);c.closePath()},shade(p.y-16,27,'#f8d985','#e6be64'),'#c3a258',1.5);
  oval(p.x+13,p.y-2,3.5,3,'#d5aa54');oval(p.x-1,p.y+3,2.5,2,'#dbb25d');
  if(!state.dogWrapped){ctx.save();ctx.translate(p.x+3,p.y-17);ctx.rotate(-.2);oval(0,0,11,6,'#fffbea','#c9c8b3');line(0,-4,0,4,'#d3d2bc',1);ctx.restore();}
  else path(c=>{c.moveTo(p.x-3,p.y-17);c.quadraticCurveTo(p.x+6,p.y-27,p.x+15,p.y-19)},null,'#ffe5a0',5);
  if(dogOpen())dotted(mouth.x,mouth.y,32,'#8fa56b');
 }
 if(state.dogStage==='spit'){
  const t=clamp(1-state.dogWait/1.4,0,1);ctx.save();ctx.translate(564+dx-95*t,355+dy+132*t*t);ctx.rotate(t*4);oval(0,0,11,6,'#fffae9','#c6c7ac');line(0,-4,0,4,'#d6d0b6',1);ctx.restore();
 }
 const labels={offer:state.dogTurn>0?'SE HIZO EL DISTRAÍDO':dogOpen()?'ABRIÓ LA BOCA · ACERCÁ EL BOCADO':'UN BOCADITO, NADA MÁS',chew:'ESTÁ MASTICANDO…',check:'PARECE QUE SÍ. ESPERÁ UN INSTANTE.',spit:'EL QUESO DESAPARECIÓ. LA PASTILLA NO.',done:'AHORA SÍ.'};
 pill(450,557,labels[state.dogStage]);text(450,590,'Deslizá despacio y esperá a que abra la boca.',15);
}

function sushiShape(c){
 const p=c.position;ctx.save();ctx.translate(p.x,p.y);oval(2,23,43,13,'#927c6050');
 if(c.kind==='maki'){
  rect(-33,-20,66,54,18,shade(-20,54,'#577563','#2d4c3e'),'#2f4b3b');oval(0,-18,33,24,'#e9e7cd','#3b5b45');oval(0,-18,24,16,'#fff7dc');oval(-7,-18,10,9,'#e99f7a');oval(9,-17,7,8,'#88b16d');
 }else{
  rect(-40,-14,80,47,16,shade(-14,47,'#fffcef','#e7dfbd'),'#cabe9c');
  for(let i=0;i<9;i++)oval(-28+(i%5)*13,-2+Math.floor(i/5)*17,4,2,'#d5cda9');
  if(c.kind==='nigiri'){
   path(k=>{k.moveTo(-45,-12);k.quadraticCurveTo(-28,-39,12,-32);k.quadraticCurveTo(42,-34,47,-10);k.lineTo(35,2);k.quadraticCurveTo(-2,-8,-42,3);k.closePath()},shade(-35,40,'#f1b49a','#db8a6a'),'#bf765e',2);
   for(let x=-24;x<35;x+=17)path(k=>{k.moveTo(x,-28);k.quadraticCurveTo(x-5,-13,x+3,-1)},null,'#ffd7ad',3);
  }else{
   rect(-43,-31,86,36,9,shade(-31,36,'#f6d77c','#dcb153'),'#bc9447');rect(-8,-32,16,60,2,'#466650','#35523f');line(-32,-26,31,-26,'#f9e7a0',3);
  }
 }
 ctx.restore();
}
function drawSushi(){
 rect(115,162,263,362,20,'#b49562');rect(110,151,263,362,20,shade(151,362,'#e2c394','#c69e69'),'#a68150');
 for(let y=184;y<500;y+=57)path(c=>{c.moveTo(128,y);c.quadraticCurveTo(235,y-9,353,y+5)},null,'#c29c69',1.5);
 oval(680,365,143,174,'#b7ac8a55');oval(675,350,143,174,'#f9f6e8','#d4cdb8');oval(675,350,124,153,'#e9ecdd','#d2d6c0');oval(675,350,115,143,'#f7f5e7');
 for(const p of [{x:635,y:270},{x:710,y:350},{x:635,y:430}]){ctx.save();ctx.setLineDash([4,6]);oval(p.x,p.y,43,29,'transparent','#c9cfb9');ctx.restore();}
 for(const c of state.sushiPieces)if(!c.broken)sushiShape(c);
 for(const d of state.sushiDebris){ctx.save();ctx.translate(d.x,d.y);ctx.rotate(d.x*.17);rect(-4,-2,8,4,2,d.color,'#cdbb99');ctx.restore();}
 const active=sushiPiece();if(active&&!active.delivered&&!active.broken){
  const p=active.position,gap=state.sushiHeld?12:28-16*Math.min(1,state.sushiGrip/.38);
  line(p.x-gap,p.y+8,p.x+112,p.y+127,'#97774f',8);line(p.x-gap-1,p.y+6,p.x+111,p.y+125,'#e6c894',3);
  line(p.x+gap,p.y+6,p.x+151,p.y+104,'#97774f',8);line(p.x+gap-1,p.y+4,p.x+150,p.y+102,'#e6c894',3);
  if(state.grabbing&&!state.sushiHeld){ctx.beginPath();ctx.arc(p.x,p.y,52,-Math.PI/2,-Math.PI/2+Math.min(1,state.sushiGrip/.38)*Math.PI*2);ctx.strokeStyle='#739765';ctx.lineWidth=3;ctx.stroke();}
 }
 text(242,128,'LA TABLA',12);text(678,144,'SOLTÁ SOBRE EL PLATO',12);
 const count=state.sushiPieces.filter(c=>c.delivered).length;
 pill(450,557,state.sushiHeld?(onSushiPlate(active.position)?'SOBRE EL PLATO · SOLTÁ':'SUAVE. QUE NO SE DESARME.'):count+' / 3 PIEZAS ENTERAS');
 if(state.sushiHeld){rect(324,579,252,6,3,'#dedac3');rect(324,579,252*Math.min(1,state.sushiPressure),6,3,state.sushiPressure>.78?'#bc6f56':'#94a571');text(450,609,'PRESIÓN DE LOS PALITOS',11);}
 else text(450,592,'Sostené un instante, llevá despacio y soltá en el plato.',15);
}

function frame(now){
 const dt=Math.min(.05,(now-lastFrame)/1000||.016);lastFrame=now;
 if(mode&&state){advance(dt,now);
 syncActions();$('attempts').textContent=String(state.attempts).padStart(2,'0');$('time').textContent=fmt(state.elapsed);
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

