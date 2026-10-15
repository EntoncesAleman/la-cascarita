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
const palette={ink:'#35473d',sage:'#92a58a',paper:'#faf7eb',line:'#c8cfbc',rust:'#b96748',gold:'#e9c16b'};
function path(points,fill,stroke=palette.ink,width=2){ctx.beginPath();points(ctx);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke()}}
function oval(x,y,rx,ry,fill,stroke){ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke()}}
function arrow(x,y,ex,ey,col=palette.rust){line(x,y,ex,ey,col,3);let a=Math.atan2(ey-y,ex-x);line(ex,ey,ex-12*Math.cos(a-.5),ey-12*Math.sin(a-.5),col,3);line(ex,ey,ex-12*Math.cos(a+.5),ey-12*Math.sin(a+.5),col,3)}
function pill(x,y,label,col=palette.ink){ctx.font='600 13px DM Sans, sans-serif';let w=ctx.measureText(label).width+28;rect(x-w/2,y-18,w,32,16,palette.paper,palette.line);text(x,y+3,label,13,col)}
function guide(x,y,ex,ey,label){line(x,y,ex,ey,'#87967e',1.5);circle(x,y,3,palette.ink);pill(ex,ey,label)}
function dotted(x,y,r,col=palette.rust){ctx.save();ctx.setLineDash([5,6]);circle(x,y,r,'transparent',col,2);ctx.restore()}
function scene(){
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.clearRect(0,0,W,H);ctx.fillStyle='#e6e7d5';ctx.fillRect(0,0,W,H);
 // Flat vector work surface, with generous space around the contact points.
 rect(35,65,830,542,26,'#edf0e1','#d6dcc9');
 if(mode==='tape')drawTape();if(mode==='usb')drawUSB();if(mode==='sheet')drawSheet();if(mode==='screw')drawScrew();if(mode==='needle')drawNeedle();
 if(state.penalty>0){rect(280,77,340,36,18,'#f5e0d0');text(450,101,mode==='tape'?'La cinta se soltó. Volvé a la pestaña.':'Volvé a intentar, despacio.',14,'#9a4d32')}
 ctx.restore();
}
function drawTape(){
 oval(450,505,205,29,'#d4d9c4');
 // Thickness, concentric layers, and cardboard core make this read as a tape roll.
 path(c=>{c.moveTo(277,328);c.lineTo(277,365);c.bezierCurveTo(277,593,623,593,623,365);c.lineTo(623,328);c.closePath()},'#d5b56c','#907a4b');
 for(let i=0;i<6;i++)line(288+i*55,372,288+i*55,419+Math.sin(i/5*Math.PI)*76,'#e7cc8b',2);
 circle(450,328,173,'#ead294','#9e8956',3);
 [101,113,126,140,154,165].forEach(r=>circle(450,328,r,'transparent','#d5bb7d',1));
 circle(450,328,88,'#ba976c','#937750',3);oval(450,340,76,65,'#edf0e1','#947a54');
 path(c=>{c.arc(450,328,88,Math.PI,Math.PI*2);c.bezierCurveTo(525,329,520,345,520,354);c.bezierCurveTo(488,299,411,299,380,354);c.bezierCurveTo(377,343,373,335,362,328)},'#c4a17a',null);
 ctx.beginPath();ctx.arc(450,328,159,3.65,5.35);ctx.strokeStyle='#faf0c5';ctx.lineWidth=8;ctx.stroke();
 const tx=450+Math.cos(state.tipAngle)*131,ty=328+Math.sin(state.tipAngle)*131;
 const end=state.grabbing?{x:mx,y:my}:{x:tx+state.peel*260,y:ty-28-state.peel*40};
 if(state.peel>0||state.grabbing){
 path(c=>{c.moveTo(tx-12,ty-9);c.bezierCurveTo(tx+40,ty-60,end.x-40,end.y-45,end.x,end.y-17);c.lineTo(end.x,end.y+17);c.bezierCurveTo(end.x-50,end.y-5,tx+36,ty-22,tx+12,ty+9);c.closePath()},'#fff6d4d9','#a38d59',2);
 line(end.x-7,end.y-13,end.x-7,end.y+12,'#e0c78b',2);
 }
 // The lifted folded tab stays centered on the existing 37px interaction target.
 ctx.save();ctx.translate(tx,ty);ctx.rotate(-.25);
 path(c=>{c.moveTo(-22,14);c.lineTo(-19,-10);c.quadraticCurveTo(-10,-24,14,-20);c.lineTo(25,6);c.quadraticCurveTo(4,-4,-22,14);c.closePath()},'#fff9df','#957b48',2.5);
 path(c=>{c.moveTo(-19,-10);c.quadraticCurveTo(-3,-5,25,6)},null,'#d2b876',2);ctx.restore();
 if(!state.grabbing){dotted(tx,ty,32,'#957b48');guide(tx,ty-28,tx>490?690:230,ty<290?170:190,'PESTAÑA LEVANTADA');}
 else{circle(end.x,end.y,23,'transparent','#b96748',2);pill(450,547,'SOSTENÉ Y DESPEGÁ DESPACIO');}
 if(!state.grabbing){arrow(350,550,537,550);text(450,582,'Agarrá la pestaña y arrastrá hacia la derecha.',16);}
 else{text(450,585,Math.round(state.peel*100)+'% de cinta despegada',15);}
 if(state.penalty>0){line(end.x-15,end.y-22,end.x+9,end.y-8,palette.rust,3);}
}
function drawUSB(){
 // Laptop side: the port's contact center remains exactly (681,330).
 oval(681,484,140,18,'#d6dbc7');rect(566,206,247,248,17,'#b8c4b6','#718372');rect(566,206,247,28,12,'#d6decf');line(576,243,803,243,'#8d9f8d',2);
 rect(620,281,133,98,9,'#778b79','#526954');rect(637,295,102,69,5,'#253c33','#e5e8d9');
 rect(648,326,80,26,3,'#99ab99');[660,677,694,711].forEach(x=>rect(x,326,7,13,1,'#e6c874'));
 line(773,312,791,312,'#66846e',3);line(773,325,791,325,'#66846e',3);line(773,338,791,338,'#66846e',3);
 guide(738,328,714,170,'PUERTO USB');
 const p=state.position;
 path(c=>{c.moveTo(-20,475);c.bezierCurveTo(80,475,p.x-180,p.y+25,p.x-94,p.y)},null,'#425b4b',18);
 path(c=>{c.moveTo(-20,471);c.bezierCurveTo(80,471,p.x-180,p.y+20,p.x-94,p.y-4)},null,'#6f8770',4);
 ctx.save();ctx.translate(p.x-30,p.y);ctx.scale(.7,1);
 // Flipping a USB changes the contact face, never the direction of its plug.
 rect(-91,-38,156,76,12,'#48614d','#2d4435');rect(-83,-30,140,12,5,'#638067');
 [0,8,16].forEach(n=>line(-75-n,-19,-75-n,19,'#738b70',2));
 rect(49,-27,80,54,4,'#dce1d6','#6a7d6c');rect(62,-19,57,38,2,'#b4c1af');
 const yy=state.rotation?7:-16;rect(73,yy,15,9,1,'#4b6150');rect(100,yy,15,9,1,'#4b6150');
 // Small USB trident embossed in the grip.
 line(-43,0,13,0,'#a3b99b',2);arrow(0,0,13,0,'#a3b99b');line(-19,0,-30,-13,'#a3b99b',2);circle(-31,-14,3,'#a3b99b');line(-9,0,-20,13,'#a3b99b',2);rect(-23,11,6,6,1,'#a3b99b');ctx.restore();
 if(!state.grabbing)guide(p.x,p.y+42,p.x,465,'ARRASTRÁ EL CONECTOR');
 if(p.x<485)arrow(380,330,536,330,'#a3b198');
 pill(450,558,'ARRASTRÁ · GIRÁ · CONECTÁ');text(450,590,'El botón «Girar conector» cambia la cara del USB.',15);
}
function drawSheet(){
 oval(449,528,301,22,'#d2d8c2');rect(175,208,555,303,28,'#a08059','#786c4e');rect(186,483,20,48,5,'#8b744e');rect(694,483,20,48,5,'#8b744e');
 rect(181,177,535,312,30,'#e1dbbf','#b2ad91');rect(193,187,515,300,29,'#faf7eb','#c9c7ae');
 // The cloth silhouette changes at each exact hit-target corner.
 const f=state.fitted,cs=[{x:210,y:208},{x:685,y:208},{x:685,y:462},{x:210,y:462}];
 const points=cs.map((v,i)=>f[i]?v:{x:v.x+(i===0||i===3?52:-52),y:v.y+(i<2?47:-47)});
 path(c=>{c.moveTo(points[0].x,points[0].y);c.quadraticCurveTo(450,225,points[1].x,points[1].y);c.quadraticCurveTo(661,335,points[2].x,points[2].y);c.quadraticCurveTo(450,444,points[3].x,points[3].y);c.quadraticCurveTo(233,335,points[0].x,points[0].y);c.closePath()},'#a5b794','#607e61',3);
 // Short geometric fabric folds flow toward each fitted or loose corner.
 points.forEach((v,i)=>{let sx=i===0||i===3?1:-1,sy=i<2?1:-1;for(let j=0;j<3;j++)path(c=>{c.moveTo(v.x+sx*(10+j*10),v.y+sy*9);c.quadraticCurveTo(v.x+sx*(43+j*6),v.y+sy*35,v.x+sx*(65+j*12),v.y+sy*(65-j*9))},null,j%2?'#c3cfae':'#8ca47d',2)});
 cs.forEach((v,i)=>{if(f[i]){path(c=>{c.moveTo(v.x-22,v.y);c.lineTo(v.x-7,v.y+13);c.lineTo(v.x+20,v.y-14)},null,'#52734f',4);circle(v.x,v.y,29,'#52734f');text(v.x,v.y+6,'✓',22,'#fffbed');}else{dotted(v.x,v.y,29,'#b27451');circle(v.x,v.y,18,'#faf7eb','#b27451');text(v.x,v.y+6,String(i+1),17,'#9b5a3d');line(points[i].x,points[i].y,v.x,v.y,'#b27451',2);}});
 pill(450,334,f.filter(Boolean).length+' / 4 ESQUINAS');text(450,566,'Tocá una esquina para llevar la tela hasta el colchón.',16);text(450,592,'Las esquinas opuestas reparten mejor la tensión.',14,'#798773');
}
function drawScrew(){
 rect(75,129,750,393,20,'#d9bd8c','#b19566');rect(75,493,750,29,10,'#b99864');
 for(let i=0;i<6;i++){let y=170+i*54;path(c=>{c.moveTo(95,y);c.bezierCurveTo(250,y-9,316,y+9,385,y);c.moveTo(540,y+2);c.bezierCurveTo(660,y-8,705,y+9,800,y)},null,'#c9aa76',2);}
 oval(450,347,103,88,'#ad9469');circle(450,330,85,'#aab7aa','#5f7565',4);circle(450,330,70,'#dce1d4','#93a18e',2);
 const a=state.angle===null?-.9:state.angle;
 ctx.save();ctx.translate(450,330);ctx.rotate(a);
 // Phillips recess rotates with the screw, the tool remains centered on it.
 path(c=>{c.moveTo(-13,-48);c.lineTo(13,-48);c.lineTo(13,-13);c.lineTo(48,-13);c.lineTo(48,13);c.lineTo(13,13);c.lineTo(13,48);c.lineTo(-13,48);c.lineTo(-13,13);c.lineTo(-48,13);c.lineTo(-48,-13);c.lineTo(-13,-13);c.closePath()},'#607363','#465b4c',2);
 if(state.stripped>.1){for(let i=0;i<6;i++){ctx.rotate(Math.PI/3);line(38,15,63,23,'#b28661',2+state.stripped*3)}}
 rect(0,-8,137,16,3,'#9dac9c','#5d7160');line(14,-4,129,-4,'#e4e9dd',3);
 rect(119,-23,117,46,11,'#3e5e45','#2f4935');rect(143,-29,72,58,12,'#748e68','#3e5e45');[152,170,188,206].forEach(x=>line(x,-19,x,19,'#9caf89',3));ctx.restore();
 ctx.save();ctx.setLineDash([5,8]);ctx.beginPath();ctx.arc(450,330,101,-2.5,-.7);ctx.strokeStyle='#b16c47';ctx.lineWidth=2;ctx.stroke();ctx.restore();
 let ax=450+Math.cos(-.7)*101,ay=330+Math.sin(-.7)*101;arrow(ax-9,ay-12,ax,ay,'#b16c47');
 pill(450,567,'SOSTENÉ Y GIRÁ EN SENTIDO HORARIO');text(450,595,state.stripped>.1?'Desgaste de la ranura: '+Math.round(state.stripped*100)+'%':'Hacé círculos pequeños sobre la cabeza del tornillo.',15);
}
function drawNeedle(){
 const wet=performance.now()<state.wetUntil,ey=313+Math.sin(performance.now()/930)*5,p=state.thread;
 // A real needle silhouette with an elongated, unfilled eye at the hit point.
 oval(663,533,33,10,'#cdd5c0');
 path(c=>{c.moveTo(660,534);c.bezierCurveTo(645,473,644,240,646,208);c.quadraticCurveTo(660,168,674,208);c.bezierCurveTo(676,270,673,478,660,534);c.closePath()},'#c2cfc0','#617d6a',2.5);
 line(653,218,654,472,'#f4f6e9',3);
 oval(660,ey,21,30,'#eaf0df','#617d6a');oval(660,ey,13,21,'#edf0e1','#839983');
 guide(684,ey,751,170,'OJO DE LA AGUJA');
 // Thread spool, trailing curve, and stable frayed fibers at the dragged tip.
 rect(79,376,59,121,9,'#b79367','#8e7753');oval(108,379,45,14,'#dfc89d','#a18d66');oval(108,493,45,14,'#dfc89d','#a18d66');rect(76,390,65,90,10,'#b86649');for(let i=0;i<10;i++)line(82,397+i*8,137,401+i*8,'#d78f6d',2);
 path(c=>{c.moveTo(108,404);c.bezierCurveTo(115,455,p.x-110,p.y+52,p.x-8,p.y)},null,'#a6553b',6);
 path(c=>{c.moveTo(108,402);c.bezierCurveTo(115,453,p.x-110,p.y+50,p.x-8,p.y-2)},null,'#dc9776',1.5);
 if(wet){line(p.x-14,p.y,p.x+4,p.y,'#9b4a32',5);oval(p.x-2,p.y-11,3,5,'#a7c6ba');}
 else for(let i=-3;i<=3;i++){path(c=>{c.moveTo(p.x-10,p.y);c.quadraticCurveTo(p.x+4,p.y+i*2,p.x+14+Math.abs(i)*2,p.y+i*5)},null,'#b96748',1.6);}
 if(!state.grabbing){dotted(p.x,p.y,28);guide(p.x,p.y-30,Math.max(180,p.x),180,'AGARRÁ LA PUNTA');}
 if(state.grabbing&&state.threadHold>0){ctx.beginPath();ctx.arc(660,ey,35,-Math.PI/2,-Math.PI/2+Math.min(1,state.threadHold/(wet?.35:.85))*Math.PI*2);ctx.strokeStyle='#698d62';ctx.lineWidth=4;ctx.stroke();}
 pill(450,565,wet?'PUNTA HUMEDECIDA':'PASÁ EL HILO POR EL OJO');text(450,594,'Arrastrá la punta y sostenela dentro del ojo de la aguja.',15);
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

