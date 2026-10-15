'use strict';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const defs={
 tape:{title:'Encontrá la punta.',label:'UN ROLLO. NADA MÁS.',instructions:'Agarrá la pestaña y hacé tirones cortos hacia la derecha. Podés soltar y volver a agarrar para seguir. Si tirás de golpe o te desviás, se corta.',quote:'“Seguro está por acá.”',meter:'CINTA DESPEGADA'},
 usb:{title:'Del otro lado.',label:'UN CABLE. UN PUERTO.',instructions:'Arrastrá el conector hasta el puerto. Giralo con el botón cuando sea necesario. La punta tiembla un poco: mantenela centrada en el puerto un segundo. Si llegás demasiado rápido, rebota.',quote:'“Probá del otro lado.”',meter:'ALINEACIÓN'},
 sheet:{title:'La sábana ajustable.',label:'UNA SÁBANA. CUATRO ESQUINAS.',instructions:'Mantené presionada cada esquina para estirar la sábana. Si forzás el orden, una esquina puesta se suelta. El truco es alternar diagonales.',quote:'“La primera ya estaba puesta.”',meter:'ESQUINAS AJUSTADAS'},
 screw:{title:'Una vueltita más.',label:'UN TORNILLO. UNA VUELTA MÁS.',instructions:'Presioná y dibujá círculos alrededor de la cabeza del tornillo, despacio y en sentido horario. Si girás demasiado rápido, se barre. Podés aflojar presión soltando.',quote:'“Le falta apenas una vueltita.”',meter:'ROSCA AJUSTADA'},
 needle:{title:'Enhebrá eso.',label:'UN HILO. UNA AGUJA.',instructions:'Arrastrá la punta del hilo hasta el pequeño ojo de la aguja a la derecha. Acercate despacio. Podés chupar el hilo para endurecer la punta durante unos segundos.',quote:'“Con buena luz sería fácil.”',meter:'PUNTA ENHEBRADA'}
};
let mode=null,state=null,pressed=false,origin=null,lastPointer=null,tick=0,lastFrame=0;
let mx=190,my=310;const W=900,H=660;
let activePointer=null,inputType='mouse',grabOffset={x:0,y:0};
const corners=[{x:210,y:208},{x:685,y:208},{x:685,y:462},{x:210,y:462}];
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function rand(a,b){return a+Math.random()*(b-a)}
function setQuote(x){$('quote').textContent=x}
function sound(){/* Diseño sin audio obligatorio */ }
function init(m){
 document.body.classList.add('is-playing');mode=m;activePointer=null;pressed=false;origin=null;lastPointer=null;tick=0;mx=190;my=310;
 state={attempts:0,elapsed:0,started:performance.now(),finished:false,progress:0,heat:0,fail:0,grabbing:false,penalty:0,tipAngle:rand(-1.8,1.8),peel:0,rotation:0,position:{x:170,y:330},fitted:[false,false,false,false],stripped:0,angle:null,thread:{x:175,y:350},wetUntil:0,threadHold:0,needleWobble:0,motion:0,peelStart:0,peelSpan:200,tapeGrip:0,dockHold:0,socketFace:Math.floor(rand(0,2)),cornerIndex:null,cornerHold:0,lastCorner:null};
 $('hero').style.display='none';$('catalog').style.display='none';$('arcade').classList.add('visible');$('game-title').textContent=defs[m].title.toUpperCase();$('game-subtitle').textContent='Dificultad estimada: baja';$('input-help').textContent={tape:'Sostené la pestaña un instante. Tirones cortos a la derecha; soltá y repetí.',usb:'Arrastrá el conector, giralo si hace falta y sostenelo alineado.',sheet:'Sostené cada esquina para estirarla. Alterná diagonales y aflojá la tensión.',screw:'Sostené y girá alrededor del tornillo, despacio y en sentido horario.',needle:'Arrastrá la punta y sostenela dentro del ojo. Humedecerla ayuda.'}[m];
 $('task-image').src='assets/'+m+'-960.webp';$('task-image').alt=defs[m].title;$('task-caption').textContent=defs[m].title;
 $('canvas-label').textContent=defs[m].label;$('instructions').textContent=defs[m].instructions;$('meter-label').textContent=defs[m].meter;
 $('overlay').classList.remove('on');setQuote(defs[m].quote);actions();location.hash=m;
 window.scrollTo({top:0,behavior:'smooth'});
}
function actions(){
 let html='';
 if(mode==='usb')html='<button id="rotate">↻ Girar conector</button>';
 if(mode==='needle')html='<button id="lick">👅 Chupar el hilo</button>';
 if(mode==='tape')html='<button id="find">🔎 Mirar de cerca</button>';
 if(mode==='sheet')html='<button id="loosen">Aflojar tensión</button>';
 if(mode==='screw')html='<button id="steady">Respirar un segundo</button>';
 $('actions').innerHTML=html;
 const bind=(id,fn)=>{const n=$(id);if(n)n.onclick=fn};
 bind('rotate',()=>{state.rotation=(state.rotation+1)%2;state.attempts++;setQuote(state.rotation?'“Ahora seguro entra.”':'“¿No estaba bien antes?”')});
 bind('lick',()=>{state.wetUntil=performance.now()+6500;state.threadHold=0;setQuote('“Sí. Acabás de chupar el hilo. Está temporalmente rígido.”')});
 bind('find',()=>{state.tipAngle=0;state.attempts++;setQuote('“Ahí estaba. ¿Y ahora cómo lo despegás?”')});
 bind('loosen',()=>{state.heat=Math.max(0,state.heat-.35);setQuote('“Se soltó un poco la tensión. Demasiado fácil no va a ser.”')});
 bind('steady',()=>{state.stripped=Math.max(0,state.stripped-.26);setQuote('“Respirás. El tornillo no.”')});
}
function failure(msg){
 state.attempts++;state.fail++;state.penalty=.45;state.grabbing=false;state.threadHold=0;state.dockHold=0;state.cornerHold=0;
 setQuote(msg); if(mode==='tape'){state.peel=Math.max(0,state.peel-.17);state.progress=state.peel}
 if(mode==='usb')state.position={x:170,y:330};
 if(mode==='needle'){state.thread={x:175,y:350};state.heat=Math.min(1,state.heat+.12)}
 if(mode==='screw')state.stripped=clamp(state.stripped+.22,0,1);
 if(mode==='sheet')state.heat=clamp(state.heat+.18,0,1);
}
function win(){
 if(state.finished)return;state.finished=true;state.progress=1;
 $('overlay-title').textContent='¿Al fin?';$('overlay-text').textContent='Lo conseguiste en '+fmt(state.elapsed)+' y '+state.attempts+' intentos. La humanidad esperaba menos de vos.';
 $('again').textContent='Sufrir otra vez →';$('overlay').classList.add('on');setQuote('“Una victoria absolutamente innecesaria.”');
}
function fmt(s){return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')}
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height}}
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function touchRadius(px,base){return inputType==='touch'?Math.max(base,px*W/canvas.getBoundingClientRect().width):base}
function socket(){return{x:681,y:330+Math.sin(performance.now()/1100)*14}}
function down(e){
 if(!mode||state.finished||state.penalty>0||activePointer!==null)return;
 e.preventDefault();inputType=e.pointerType||'mouse';activePointer=e.pointerId;canvas.setPointerCapture(e.pointerId);
 const p=point(e);pressed=true;origin=p;lastPointer=p;tick=performance.now();state.motion=0;mx=p.x;my=p.y;grabOffset={x:0,y:0};
 if(mode==='tape'){const tip=tapeGeometry().tip;if(distance(p,tip)<touchRadius(22,37)){state.grabbing=true;state.tapeGrip=0;state.peelStart=state.peel;state.peelSpan=Math.max(80,Math.min(200,W-p.x-28));mx=tip.x;my=tip.y;grabOffset={x:tip.x-p.x,y:tip.y-p.y};setQuote('“La agarraste. Tirones cortos, sin apurarte.”')}else failure('“Eso no era la punta.”')}
 if(mode==='usb'){if(distance(p,state.position)<touchRadius(28,105)){state.grabbing=true;grabOffset={x:state.position.x-p.x,y:state.position.y-p.y}}else failure('“Eso no es el enchufe.”')}
 if(mode==='sheet'){const i=corners.findIndex(v=>distance(v,p)<touchRadius(24,65));if(i>=0&&!state.fitted[i]){state.grabbing=true;state.cornerIndex=i;state.cornerHold=0;setQuote('“Sostené para estirar. La tela necesita un momento.”')}else if(i>=0)setQuote('“Esa esquina ya estaba puesta.”');else failure('“La sábana no se ajusta desde el medio.”')}
 if(mode==='screw'){const r=distance(p,{x:450,y:330});if(r<touchRadius(38,115)){state.grabbing=true;state.angle=r>=26?Math.atan2(p.y-330,p.x-450):null}else failure('“El destornillador patinó en la mesa.”')}
 if(mode==='needle'){if(distance(p,state.thread)<touchRadius(28,82)){state.grabbing=true;grabOffset={x:state.thread.x-p.x,y:state.thread.y-p.y}}else failure('“Primero encontrá la punta del hilo.”')}
}
function move(e){
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
 state.position={x:clamp(p.x,70,810),y:clamp(p.y,130,540)};
 const target=socket(),dist=distance(state.position,target);state.progress=clamp(1-dist/540,0,.78);
 if(dist<48){if(state.rotation!==state.socketFace)failure('“Es la otra cara. Giralo y probá de nuevo.”');else if(speed>190||Math.abs(p.y-target.y)>touchRadius(14,19))failure('“Casi. Entrá recto y más despacio.”')}
 }
 if(mode==='sheet'&&state.cornerIndex!==null){if(distance(raw,corners[state.cornerIndex])>touchRadius(34,85)){state.grabbing=false;state.cornerHold=0;setQuote('“Se soltó la tela. Sostené sobre la esquina.”')}}
 if(mode==='screw'){
 const r=distance(p,{x:450,y:330}),angle=Math.atan2(p.y-330,p.x-450);
 if(r<26){state.angle=null;return}
 if(r>touchRadius(44,115)){failure('“La punta se salió de la ranura.”');return}
 if(state.angle===null){state.angle=angle;return}
 const dr=Math.atan2(Math.sin(angle-state.angle),Math.cos(angle-state.angle));state.angle=angle;
 if(Math.abs(dr)/dt>4.5){failure('“Patinó. Girá a un ritmo constante.”');return}
 if(dr>0){state.progress=clamp(state.progress+dr/30,0,1);state.stripped=Math.max(0,state.stripped-dt*.025)}
 else if(dr<-.025){state.progress=Math.max(0,state.progress+dr/25);state.stripped=clamp(state.stripped+Math.abs(dr)*.12,0,1)}
 if(state.stripped>=1){failure('“La cabeza está barrida. Aflojá la presión.”');state.stripped=.58}if(state.progress>=1)win();
 }
 if(mode==='needle'){
 state.thread={x:clamp(p.x,45,790),y:clamp(p.y,105,575)};
 const wet=performance.now()<state.wetUntil,eye={x:660,y:313+Math.sin(performance.now()/930)*5};
 state.progress=clamp(1-distance(state.thread,eye)/480,0,.86);
 if(speed>(wet?260:170)){failure('“Se deshilachó de nuevo. Acercate más despacio.”');return}
 }
}
function up(e){if(e&&e.pointerId!==undefined&&e.pointerId!==activePointer)return;pressed=false;activePointer=null;if(state){state.grabbing=false;state.cornerHold=0;state.cornerIndex=null;state.threadHold=0;state.dockHold=0;state.tapeGrip=0}}
function advance(dt,now){
 if(!state||state.finished)return;
 state.elapsed=(now-state.started)/1000;state.penalty=Math.max(0,state.penalty-dt);state.heat=Math.max(0,state.heat-dt*.045);
 if(now-tick>100)state.motion=0;
 if(!pressed||!state.grabbing||state.penalty>0)return;
 if(mode==='tape')state.tapeGrip=Math.min(.38,state.tapeGrip+dt);
 if(mode==='sheet'&&state.cornerIndex!==null){state.cornerHold+=dt;if(state.cornerHold>=.72){corner(state.cornerIndex);state.cornerHold=0;state.cornerIndex=null;state.grabbing=false}}
 if(mode==='usb'){
 const target=socket(),near=distance(state.position,target)<42,aligned=Math.abs(state.position.y-target.y)<touchRadius(4,8);
 if(near&&aligned&&state.rotation===state.socketFace&&state.motion<95){state.dockHold+=dt;state.progress=.78+Math.min(1,state.dockHold/1.1)*.22;setQuote('“Ahí. Sostenelo alineado un segundo.”');if(state.dockHold>=1.1)win()}
 else state.dockHold=Math.max(0,state.dockHold-dt*2);
 }
 if(mode==='needle'){
 const wet=now<state.wetUntil,eye={x:660,y:313+Math.sin(now/930)*5},tol=touchRadius(wet?8:5,wet?17:7),duration=wet?.85:1.25;
 if(distance(state.thread,eye)<tol&&state.motion<(wet?100:65)){state.threadHold+=dt;state.progress=.86+Math.min(1,state.threadHold/duration)*.14;if(state.threadHold>=duration)win()}
 else state.threadHold=Math.max(0,state.threadHold-dt*1.8);
 }
}
function corner(i){
 state.attempts++;const f=state.fitted;if(f[i])return;
 const before=f.filter(Boolean).length,previous=state.lastCorner;f[i]=true;
 if(before===1&&previous!==null&&(previous+2)%4!==i&&state.heat>.12){f[previous]=false;setQuote('“Estiraste de un lado. Se soltó del otro.”')}
 else if(before>=2&&state.heat>.43){const old=f.findIndex((v,j)=>j!==i&&v);if(old>=0)f[old]=false;setQuote('“Demasiada tensión. Se soltó otra esquina.”')}
 else setQuote('“'+f.filter(Boolean).length+' esquinas puestas. Sin apurarse.”');
 state.lastCorner=i;state.heat=clamp(state.heat+.26,0,1);state.progress=f.filter(Boolean).length/4;if(state.progress===1)win();
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
 if(mode==='tape')drawTape();if(mode==='usb')drawUSB();if(mode==='sheet')drawSheet();if(mode==='screw')drawScrew();if(mode==='needle')drawNeedle();
 if(state.penalty>0){rect(280,77,340,36,18,'#f5e0d0');text(450,101,mode==='tape'?'La cinta se soltó. Volvé a la pestaña.':'Volvé a intentar, despacio.',14,'#9a4d32')}
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
 // Laptop side: the port's contact center remains exactly (681,330).
 oval(681,484,140,18,'#b8aa8166');rect(568,215,247,248,20,'#8c987c55');rect(566,206,247,248,17,shade(206,248,'#d9e5da','#9cb6a6'),'#6c8c7e');rect(566,206,247,28,12,'#eaf2df');line(576,243,803,243,'#8d9f8d',2);
 rect(620,281,133,98,9,'#778b79','#526954');rect(637,295,102,69,5,'#253c33','#e5e8d9');
 const contactY=state.socketFace?326:304;rect(648,contactY,80,26,3,'#99ab99');[660,677,694,711].forEach(x=>rect(x,contactY,7,13,1,'#e6c874'));
 line(773,312,791,312,'#66846e',3);line(773,325,791,325,'#66846e',3);line(773,338,791,338,'#66846e',3);
 guide(738,328,714,170,'PUERTO USB');
 const target=socket();line(630,330,636,330,'#bb744e',3);
 if(state.dockHold>0){ctx.beginPath();ctx.arc(681,330,56,-Math.PI/2,-Math.PI/2+Math.min(1,state.dockHold/1.1)*Math.PI*2);ctx.strokeStyle='#52734f';ctx.lineWidth=4;ctx.stroke();}
 const p={x:state.position.x,y:state.position.y-(target.y-330)};
 path(c=>{c.moveTo(-20,475);c.bezierCurveTo(80,475,p.x-180,p.y+25,p.x-94,p.y)},null,'#425b4b',18);
 path(c=>{c.moveTo(-20,471);c.bezierCurveTo(80,471,p.x-180,p.y+20,p.x-94,p.y-4)},null,'#6f8770',4);
 ctx.save();ctx.translate(p.x-30,p.y);ctx.scale(.7,1);
 // Flipping a USB changes the contact face, never the direction of its plug.
 rect(-91,-38,156,76,12,shade(-38,76,'#719c76','#426c52'),'#31563e');rect(-83,-30,140,12,5,'#638067');
 [0,8,16].forEach(n=>line(-75-n,-19,-75-n,19,'#738b70',2));
 rect(49,-27,80,54,4,'#dce1d6','#6a7d6c');rect(62,-19,57,38,2,'#b4c1af');
 const yy=state.rotation?7:-16;rect(73,yy,15,9,1,'#4b6150');rect(100,yy,15,9,1,'#4b6150');
 // Small USB trident embossed in the grip.
 line(-43,0,13,0,'#a3b99b',2);arrow(0,0,13,0,'#a3b99b');line(-19,0,-30,-13,'#a3b99b',2);circle(-31,-14,3,'#a3b99b');line(-9,0,-20,13,'#a3b99b',2);rect(-23,11,6,6,1,'#a3b99b');ctx.restore();
 if(!state.grabbing)guide(p.x,p.y+42,p.x,465,'ARRASTRÁ EL CONECTOR');
 if(p.x<485)arrow(380,330,536,330,'#a3b198');
 pill(450,558,'ALINEÁ Y SOSTENÉ UN SEGUNDO');text(450,590,'El botón «Girar conector» cambia la cara del USB.',15);
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
 cs.forEach((v,i)=>{if(f[i]){path(c=>{c.moveTo(v.x-22,v.y);c.lineTo(v.x-7,v.y+13);c.lineTo(v.x+20,v.y-14)},null,'#52734f',4);circle(v.x,v.y,29,'#52734f');text(v.x,v.y+6,'✓',22,'#fffbed');}else{dotted(v.x,v.y,29,'#b27451');circle(v.x,v.y,18,'#faf7eb','#b27451');text(v.x,v.y+6,String(i+1),17,'#9b5a3d');line(points[i].x,points[i].y,v.x,v.y,'#b27451',2);}});
 if(state.cornerIndex!==null&&state.grabbing){const v=cs[state.cornerIndex];ctx.beginPath();ctx.arc(v.x,v.y,38,-Math.PI/2,-Math.PI/2+Math.min(1,state.cornerHold/.72)*Math.PI*2);ctx.strokeStyle='#b96748';ctx.lineWidth=4;ctx.stroke();}
 pill(450,343,f.filter(Boolean).length+' / 4 ESQUINAS');
 rect(346,365,208,5,3,'#dbe2cc');rect(346,356,208*state.heat,5,3,state.heat>.43?'#b96748':'#607e61');text(450,392,'TENSIÓN DE LA TELA',11);text(450,566,'Sostené cada esquina para estirar la tela.',16);text(450,592,'Las esquinas opuestas reparten mejor la tensión.',14,'#798773');
}
function drawScrew(){
 rect(75,129,750,393,20,shade(129,393,'#efcd91','#d9ae70'),'#bb8d53');line(98,135,802,135,'#ffe3b1',4);rect(75,493,750,29,10,'#b99864');
 for(let i=0;i<6;i++){let y=170+i*54;path(c=>{c.moveTo(95,y);c.bezierCurveTo(250,y-9,316,y+9,385,y);c.moveTo(540,y+2);c.bezierCurveTo(660,y-8,705,y+9,800,y)},null,'#c9aa76',2);}
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
 pill(450,567,'SOSTENÉ Y GIRÁ EN SENTIDO HORARIO');text(450,595,state.stripped>.1?'Desgaste de la ranura: '+Math.round(state.stripped*100)+'%':'Hacé círculos pequeños sobre la cabeza del tornillo.',15);
}
function drawNeedle(){
 const wet=performance.now()<state.wetUntil,ey=313+Math.sin(performance.now()/930)*5,p=state.thread;
 // A real needle silhouette with an elongated, unfilled eye at the hit point.
 oval(663,533,33,10,'#cdd5c0');
 path(c=>{c.moveTo(660,534);c.bezierCurveTo(645,473,644,240,646,208);c.quadraticCurveTo(660,168,674,208);c.bezierCurveTo(676,270,673,478,660,534);c.closePath()},shade(190,344,'#f0f2e3','#93b0a0'),'#617d6a',2.5);
 line(653,218,654,472,'#f4f6e9',3);
 oval(660,ey,21,30,'#eaf0df','#617d6a');oval(660,ey,13,21,'#fff4da','#839983');
 guide(684,ey,751,170,'OJO DE LA AGUJA');
 // Thread spool, trailing curve, and stable frayed fibers at the dragged tip.
 rect(79,376,59,121,9,'#b79367','#8e7753');oval(108,379,45,14,'#dfc89d','#a18d66');oval(108,493,45,14,'#dfc89d','#a18d66');rect(76,390,65,90,10,shade(390,90,'#e8976d','#b75d48'),'#9d5540');for(let i=0;i<10;i++)line(82,397+i*8,137,401+i*8,'#d78f6d',2);
 path(c=>{c.moveTo(108,404);c.bezierCurveTo(115,455,p.x-110,p.y+52,p.x-8,p.y)},null,'#a6553b',6);
 path(c=>{c.moveTo(108,402);c.bezierCurveTo(115,453,p.x-110,p.y+50,p.x-8,p.y-2)},null,'#dc9776',1.5);
 if(wet){line(p.x-14,p.y,p.x+4,p.y,'#9b4a32',5);oval(p.x-2,p.y-11,3,5,'#a7c6ba');}
 else for(let i=-3;i<=3;i++){path(c=>{c.moveTo(p.x-10,p.y);c.quadraticCurveTo(p.x+4,p.y+i*2,p.x+14+Math.abs(i)*2,p.y+i*5)},null,'#b96748',1.6);}
 if(!state.grabbing){dotted(p.x,p.y,28);guide(p.x,p.y-30,Math.max(180,p.x),180,'AGARRÁ LA PUNTA');}
 if(state.grabbing&&state.threadHold>0){ctx.beginPath();ctx.arc(660,ey,35,-Math.PI/2,-Math.PI/2+Math.min(1,state.threadHold/(wet?.85:1.25))*Math.PI*2);ctx.strokeStyle='#698d62';ctx.lineWidth=4;ctx.stroke();}
 pill(450,565,wet?'PUNTA HUMEDECIDA':'PASÁ EL HILO POR EL OJO');text(450,594,'Arrastrá la punta y sostenela dentro del ojo de la aguja.',15);
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
canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('lostpointercapture',up);canvas.addEventListener('contextmenu',e=>e.preventDefault());canvas.addEventListener('selectstart',e=>e.preventDefault());canvas.addEventListener('touchstart',e=>e.preventDefault(),{passive:false});window.addEventListener('blur',up);
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>init(b.dataset.open)));
$('back').onclick=()=>{document.body.classList.remove('is-playing');up();mode=null;state=null;$('arcade').classList.remove('visible');$('hero').style.display='';$('catalog').style.display='';history.replaceState(null,'',location.pathname);window.scrollTo({top:0,behavior:'smooth'})};
$('reset').onclick=()=>init(mode);$('again').onclick=()=>init(mode);
const initial=location.hash.slice(1);if(defs[initial])init(initial);requestAnimationFrame(frame);

