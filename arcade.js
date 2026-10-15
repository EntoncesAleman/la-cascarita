'use strict';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const defs={
 tape:{title:'Encontrá la punta.',label:'UN ROLLO. NADA MÁS.',instructions:'Buscá el extremo de la cinta alrededor del rollo. Presioná sobre la punta y arrastrá lentamente hacia la derecha para despegarla. Si tirás muy rápido, se corta.',quote:'“Seguro está por acá.”',meter:'CINTA DESPEGADA'},
 usb:{title:'Del otro lado.',label:'UN CABLE. UN PUERTO.',instructions:'Arrastrá el conector hasta el puerto. Giralo con el botón cuando sea necesario. Si llegás torcido o demasiado rápido, rebota.',quote:'“Probá del otro lado.”',meter:'ALINEACIÓN'},
 sheet:{title:'La sábana ajustable.',label:'UNA SÁBANA. CUATRO ESQUINAS.',instructions:'Tocá cada esquina del colchón para estirar la sábana. Si forzás el orden, una esquina puesta se suelta. El truco es alternar diagonales.',quote:'“La primera ya estaba puesta.”',meter:'ESQUINAS AJUSTADAS'},
 screw:{title:'Una vueltita más.',label:'UN TORNILLO. UNA VUELTA MÁS.',instructions:'Presioná y dibujá círculos alrededor de la cabeza del tornillo, despacio y en sentido horario. Si girás demasiado rápido, se barre. Podés aflojar presión soltando.',quote:'“Le falta apenas una vueltita.”',meter:'ROSCA AJUSTADA'},
 needle:{title:'Enhebrá eso.',label:'UN HILO. UNA AGUJA.',instructions:'Arrastrá la punta del hilo hasta el pequeño ojo de la aguja a la derecha. Acercate despacio. Podés chupar el hilo para endurecer la punta durante unos segundos.',quote:'“Con buena luz sería fácil.”',meter:'PUNTA ENHEBRADA'}
};
let mode=null,state=null,pressed=false,origin=null,lastPointer=null,tick=0,lastFrame=0;
let mx=190,my=310;const W=900,H=660;
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function rand(a,b){return a+Math.random()*(b-a)}
function setQuote(x){$('quote').textContent=x}
function sound(){/* Diseño sin audio obligatorio */ }
function init(m){
 mode=m;pressed=false;origin=null;lastPointer=null;tick=0;mx=190;my=310;
 state={attempts:0,elapsed:0,started:performance.now(),finished:false,progress:0,heat:0,fail:0,grabbing:false,penalty:0,tipAngle:rand(-1.8,1.8),peel:0,rotation:0,position:{x:170,y:330},fitted:[false,false,false,false],stripped:0,angle:null,thread:{x:175,y:350},wetUntil:0,threadHold:0,needleWobble:0};
 $('hero').style.display='none';$('catalog').style.display='none';$('arcade').classList.add('visible');$('game-title').textContent=defs[m].title.toUpperCase();$('game-subtitle').textContent='Dificultad estimada: baja';
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
 bind('lick',()=>{state.wetUntil=performance.now()+8500;state.threadHold=0;setQuote('“Sí. Acabás de chupar el hilo. Está temporalmente rígido.”')});
 bind('find',()=>{state.tipAngle=0;state.attempts++;setQuote('“Ahí estaba. ¿Y ahora cómo lo despegás?”')});
 bind('loosen',()=>{state.heat=Math.max(0,state.heat-.35);setQuote('“Se soltó un poco la tensión. Demasiado fácil no va a ser.”')});
 bind('steady',()=>{state.stripped=Math.max(0,state.stripped-.26);setQuote('“Respirás. El tornillo no.”')});
}
function failure(msg){
 state.attempts++;state.fail++;state.penalty=.45;state.grabbing=false;state.threadHold=0;
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
function down(e){
 if(!mode||state.finished||state.penalty>0)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);
 const p=point(e);pressed=true;origin=p;lastPointer=p;mx=p.x;my=p.y;
 if(mode==='tape'){const tip={x:450+Math.cos(state.tipAngle)*131,y:328+Math.sin(state.tipAngle)*131};if(distance(p,tip)<37){state.grabbing=true;setQuote('“La agarraste. Por ahora.”')}else failure('“Eso no era la punta.”')}
 if(mode==='usb'){if(distance(p,state.position)<90){state.grabbing=true}else failure('“Eso no es el enchufe.”')}
 if(mode==='sheet'){const cs=[{x:210,y:208},{x:685,y:208},{x:685,y:462},{x:210,y:462}];const i=cs.findIndex(v=>distance(v,p)<75);if(i>=0)corner(i);else failure('“La sábana no se ajusta desde el medio.”')}
 if(mode==='screw'){if(distance(p,{x:450,y:330})<100){state.grabbing=true;state.angle=Math.atan2(p.y-330,p.x-450)}else failure('“El destornillador patinó en la mesa.”')}
 if(mode==='needle'){if(distance(p,state.thread)<82){state.grabbing=true}else failure('“Primero encontrá la punta del hilo.”')}
}
function move(e){
 if(!mode||!pressed||state.finished)return;e.preventDefault();
 const p=point(e),prev=lastPointer||p,d=distance(p,prev);lastPointer=p;mx=p.x;my=p.y;
 if(state.penalty>0||!state.grabbing)return;
 const dt=Math.max(.016,Math.min(.09,(performance.now()-tick)/1000||.016));tick=performance.now();const speed=d/dt;
 if(mode==='tape'){
 if(speed>530){failure('“Se cortó. Una tirita microscópica. Excelente.”');return}
 const delta=Math.max(0,p.x-(origin?.x||p.x));state.peel=clamp(Math.max(state.peel,delta/410),0,1);state.progress=state.peel;state.heat=clamp(state.heat+(speed>240?.012:-.004),0,1);
 if(state.heat>=1){failure('“La cinta se pegó sobre sí misma. Empezá de nuevo.”');state.heat=.2}if(state.peel>=1)win();
 }
 if(mode==='usb'){
 state.position={x:clamp(p.x,70,810),y:clamp(p.y,130,540)};
 const good=state.rotation===1,dist=distance(state.position,{x:681,y:330});
 state.progress=clamp(1-dist/540,0,.94);
 if(dist<57){if(!good){failure('“No entra. Dale vuelta. (Como la primera vez.)”')}else if(speed>280||Math.abs(p.y-330)>22){failure('“Casi. Pero llegaste torcido.”')}else win()}
 }
 if(mode==='screw'){
 const angle=Math.atan2(p.y-330,p.x-450),dr=Math.atan2(Math.sin(angle-state.angle),Math.cos(angle-state.angle));state.angle=angle;
 if(distance(p,{x:450,y:330})>105){failure('“La punta se salió de la ranura.”');return}
 if(Math.abs(dr)>.28){failure('“Patinó y se barrió un poco la cabeza.”');return}
 if(dr>0){state.progress=clamp(state.progress+dr/24,0,1);state.stripped=Math.max(0,state.stripped-.001)}
 else if(dr<-.08){state.progress=Math.max(0,state.progress+dr/40);state.stripped=clamp(state.stripped+.012,0,1)}
 if(state.stripped>=1){failure('“La cabeza está barrida. Tomate un segundo.”');state.stripped=.58}if(state.progress>=1)win();
 }
 if(mode==='needle'){
 state.thread={x:clamp(p.x,45,790),y:clamp(p.y,105,575)};
 const wet=performance.now()<state.wetUntil,eye={x:660,y:313+Math.sin(performance.now()/930)*5};
 const tolerance=wet?17:6;state.progress=clamp(1-distance(state.thread,eye)/480,0,.98);
 if(speed>(wet?300:165)){failure('“Se deshilachó de nuevo. Un arte.”');return}
 if(distance(state.thread,eye)<tolerance){state.threadHold+=dt;if(state.threadHold>(wet?.35:.85))win()}
 else state.threadHold=Math.max(0,state.threadHold-dt*1.2);
 }
}
function up(){pressed=false;if(state)state.grabbing=false}
function corner(i){
 state.attempts++;const f=state.fitted;
 if(f[i]){setQuote('“Esa esquina ya estaba puesta.”');return}
 f[i]=true;
 const count=f.filter(Boolean).length;
 if(count===2&&([0,1,2,3].findIndex((v)=>f[v])===i-1)){const oldest=f.findIndex((v,j)=>v!==i&&v);if(oldest>=0)f[oldest]=false;setQuote('“Estiraste de un lado. Se soltó del otro.”')}
 else if(count===3&&state.heat>.32){const a=f.findIndex((v,j)=>j!==i&&v);if(a>=0)f[a]=false;setQuote('“La primera esquina acaba de saltar.”')}
 else setQuote(['“Una puesta. Fácil.”','“Dos. Sos una máquina.”','“Tres. No te confíes.”','“Cuatro. Imposible.”'][count-1]);
 state.heat=clamp(state.heat+.11,0,1);
 state.progress=f.filter(Boolean).length/4;if(state.progress===1)win();
}
function shape(draw){ctx.beginPath();draw();ctx.fill();ctx.stroke()}
function rect(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.stroke()}}
function circle(x,y,r,fill,stroke,lw=2){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw;ctx.stroke()}}
function line(x,y,a,b,color='#667568',width=3){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(a,b);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
function text(x,y,s,size=16,col='#5d6759',align='center'){ctx.fillStyle=col;ctx.font=size+'px DM Sans, sans-serif';ctx.textAlign=align;ctx.fillText(s,x,y)}
function scene(){
 ctx.clearRect(0,0,W,H);ctx.fillStyle='#e6e7d5';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#d6dac7';ctx.lineWidth=1;for(let x=30;x<W;x+=60){line(x,0,x,H,'#d6dac7',1)}for(let y=20;y<H;y+=60){line(0,y,W,y,'#d6dac7',1)}
 if(mode==='tape'){
  circle(450,328,173,'#b3a281','#94876e',5);circle(450,328,137,'#ece7d4','#f8f7e9',12);circle(450,328,80,'#e6e7d5','#afa488',8);
  const a=state.tipAngle,tx=450+Math.cos(a)*131,ty=328+Math.sin(a)*131;
  ctx.beginPath();ctx.arc(450,328,150,-1.7,a+Math.PI*2);ctx.strokeStyle='#fffdf1';ctx.lineWidth=23;ctx.stroke();
  if(state.peel>0){line(tx,ty,tx+state.peel*440,ty-75,'#fdf9e9',24);line(tx,ty,tx+state.peel*440,ty-75,'#dcd6c1',1)}
  circle(tx,ty,12,'#fefbed','#b6ae9a');text(450,550,'La punta es más pequeña de lo que debería.',15);
 }
 if(mode==='usb'){
  rect(570,210,230,260,16,'#4f5852','#28332d');rect(642,296,94,66,5,'#142423','#8b9b90');
  rect(650,302,77,54,3,'#26332f');circle(681,330,5,'#829a90');
  const pos=state.position;ctx.save();ctx.translate(pos.x,pos.y);ctx.rotate(state.rotation?Math.PI:0);rect(-91,-38,156,76,12,'#aebbb1','#74857a');rect(49,-27,80,54,4,'#65776e','#43574e');rect(70,-16,51,32,2,'#3a4540');rect(86,-12,9,9,1,'#dde0d9');rect(104,-12,9,9,1,'#dde0d9');ctx.restore();text(681,503,'PUERTO USB',13);
 }
 if(mode==='sheet'){
  rect(170,165,565,343,35,'#8e9f88','#657c6c');rect(193,187,515,300,29,'#faf7ec','#d3d5c4');
  const cs=[{x:210,y:208},{x:685,y:208},{x:685,y:462},{x:210,y:462}];
  cs.forEach((v,i)=>{circle(v.x,v.y,31,state.fitted[i]?'#4b6b4c':'#b56548','#faf7ec',5);text(v.x,v.y+7,state.fitted[i]?'✓':String(i+1),22,'white')});
  text(452,336,'Tirá de las esquinas. Sin romper la paciencia.',18);text(452,365,'Sugerencia: probá esquinas opuestas primero.',14);
 }
 if(mode==='screw'){
  rect(0,0,W,H,0,'#d4ad85');for(let i=20;i<H;i+=95)line(0,i,W,i+15,'#c69b76',2);
  circle(450,330,123,'#bcaa8f','#b19d83',7);circle(450,330,85,'#818d89','#515c58',8);
  line(411,330,489,330,'#45514e',20);line(450,291,450,369,'#45514e',20);
  const a=state.angle||0;ctx.save();ctx.translate(450,330);ctx.rotate(a);rect(10,-6,159,12,5,'#536663','#384842');ctx.restore();
  text(450,492,'Dibujá círculos en sentido horario sobre el tornillo.',16);
  if(state.stripped>.1)text(450,536,'Cabeza barrida: '+Math.round(state.stripped*100)+'%',14,'#a85337');
 }
 if(mode==='needle'){
  const wet=performance.now()<state.wetUntil;const eyeY=313+Math.sin(performance.now()/930)*5;
  ctx.lineCap='round';line(660,190,660,520,'#7e8e89',23);line(660,190,660,520,'#bac5bf',13);
  circle(660,eyeY,21,'#e6e7d5','#667b73',6);circle(660,eyeY,10,'#e6e7d5');
  ctx.beginPath();ctx.moveTo(65,390);ctx.bezierCurveTo(105,410,state.thread.x-50,state.thread.y+24,state.thread.x,state.thread.y);ctx.strokeStyle='#a85337';ctx.lineWidth=7;ctx.stroke();
  if(!wet){for(let i=-3;i<=3;i++)line(state.thread.x-4,state.thread.y,state.thread.x+rand(8,22),state.thread.y+i*5+Math.sin(performance.now()/220+i)*5,'#b7654a',1.6)}
  else circle(state.thread.x,state.thread.y,5,'#a85337','#7e3e2a');
  text(660,550,'OJO DE LA AGUJA',14);text(290,510,wet?'Punta humedecida. ¡Rápido!':'Punta deshilachada. Cuidado.',15);
 }
}
function frame(now){
 const dt=Math.min(.05,(now-lastFrame)/1000||.016);lastFrame=now;
 if(mode&&state){state.elapsed=(now-state.started)/1000;state.penalty=Math.max(0,state.penalty-dt);state.heat=Math.max(0,state.heat-dt*.045);
 $('attempts').textContent=String(state.attempts).padStart(2,'0');$('time').textContent=fmt(state.elapsed);
 $('percent').textContent=Math.round(state.progress*100)+'%';$('progress').style.width=Math.round(state.progress*100)+'%';
 const dpr=Math.min(window.devicePixelRatio||1,2),r=canvas.getBoundingClientRect(),w=Math.round(r.width*dpr),h=Math.round(r.height*dpr);
 if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h}ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);scene();
 }requestAnimationFrame(frame)
}
canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);window.addEventListener('blur',up);
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>init(b.dataset.open)));
$('back').onclick=()=>{mode=null;state=null;$('arcade').classList.remove('visible');$('hero').style.display='';$('catalog').style.display='';history.replaceState(null,'',location.pathname);window.scrollTo({top:0,behavior:'smooth'})};
$('reset').onclick=()=>init(mode);$('again').onclick=()=>init(mode);
const initial=location.hash.slice(1);if(defs[initial])init(initial);requestAnimationFrame(frame);

