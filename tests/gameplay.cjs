'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),noop=()=>{};
function setup(egg=false,width=360){
 let now=1000;const listeners={},els={};
 const ctx=new Proxy({measureText:s=>({width:s.length*8}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]??noop});
 const canvas={style:{},width,height:width*(egg?735/1000:660/900),getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width,height:width*(egg?735/1000:660/900)}),addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn)},setPointerCapture:noop,focus:noop};
 function el(id){return els[id]??={style:{},classList:{add:noop,remove:noop},textContent:'',innerHTML:'',setAttribute:noop};}
 const s={console,document:{body:{classList:{add:noop,remove:noop}},getElementById:id=>id==='scene'?canvas:el(id),querySelector:()=>canvas,querySelectorAll:()=>[]},window:{scrollTo:noop,addEventListener:noop,devicePixelRatio:1},performance:{now:()=>now},location:{hash:'',pathname:'/'},history:{replaceState:noop},localStorage:{getItem:()=>null,setItem:noop},requestAnimationFrame:noop,devicePixelRatio:1};
 vm.createContext(s);vm.runInContext(fs.readFileSync(path.join(root,'sneeze.js'),'utf8'),s);vm.runInContext('Sneeze.random=()=>1',s);const source=egg?fs.readFileSync(path.join(root,'cascarita.html'),'utf8').split('<script>')[1].split('</script>')[0]:fs.readFileSync(path.join(root,'arcade.js'),'utf8');vm.runInContext(source,s);
 const run=code=>vm.runInContext(code,s);
 function fire(type,x,y,id=1,pointerType='touch'){
  let prevented=false;const scale=width/(egg?1000:900),e={clientX:x*scale,clientY:y*scale,pointerId:id,pointerType,type,preventDefault(){prevented=true}};
  for(const fn of listeners[type]||[])fn(e);return prevented;
 }
 function step(seconds){const n=Math.ceil(seconds*60);for(let i=0;i<n;i++){now+=seconds/n*1000;run(egg?`draw(${seconds/n})`:`advance(${seconds/n},${now})`);}}
 return{run,fire,step,els,listeners,setTime:n=>now=n,get time(){return now}};
}
function test(name,fn){fn();console.log('PASS '+name);}
test('selection and callout protection stays scoped to game surfaces',()=>{
 for(const name of ['index.html','cascarita.html']){const html=fs.readFileSync(path.join(root,name),'utf8');assert.match(html,/-webkit-user-select:none/);assert.match(html,/-webkit-touch-callout:none/);assert.match(html,/touch-action:none/);assert.equal((html.match(/id="input-help"/g)||[]).length,1);}
});
test('touch capture blocks default gesture, ignores a second finger, cancels cleanly',()=>{
 const h=setup();h.run("init('needle')");assert(h.fire('pointerdown',175,350));h.fire('pointerdown',700,100,2);h.fire('pointermove',780,100,2);assert.equal(h.run('state.thread.x'),175);h.fire('pointercancel',0,0,2);assert(h.run('pressed'));h.fire('lostpointercapture',0,0);assert.equal(h.run('activePointer'),null);assert(!h.run('pressed'));assert(h.fire('contextmenu',0,0));assert(h.fire('selectstart',0,0));
});
test('dragging a touched object preserves the initial grab offset',()=>{
 const h=setup();h.run("init('needle')");h.fire('pointerdown',205,370);h.setTime(h.time+40);h.fire('pointermove',210,374);assert.equal(h.run('state.thread.x'),180);assert.equal(h.run('state.thread.y'),354);
});
test('tape grabs its visible projected cut edge, not the hole or a detached hotspot',()=>{
 const h=setup();h.run("init('tape');state.tipAngle=0");
 const hole=h.run('tapeGeometry().center');h.fire('pointerdown',hole.x,hole.y);assert(!h.run('state.grabbing'));h.fire('pointerup',hole.x,hole.y);h.step(.5);
 const tip=h.run('tapeGeometry().tip');h.fire('pointerdown',tip.x,tip.y);assert(h.run('state.grabbing'));assert(Math.abs(h.run('mx')-tip.x)<1e-8);assert(Math.abs(h.run('my')-tip.y)<1e-8);
 h.step(.4);h.setTime(h.time+40);h.fire('pointermove',tip.x+4,tip.y);assert(Math.abs(h.run('mx')-tip.x-4)<1e-8);h.fire('pointerup',tip.x+4,tip.y);
 h.run('state.peel=.5');const shifted=h.run('tapeGeometry().tip');assert(shifted.x>tip.x);h.fire('pointerdown',shifted.x,shifted.y);assert(h.run('state.grabbing'));
});
test('perspective tape still needs a held grip and three strokes inside the canvas',()=>{
 const h=setup();h.run("init('tape');state.tipAngle=0");let tip=h.run('tapeGeometry().tip');h.fire('pointerdown',tip.x,tip.y);h.setTime(h.time+20);h.fire('pointermove',tip.x+39,tip.y);assert.equal(h.run('state.peel'),0);assert(h.run('state.fail')>0);h.fire('pointerup',tip.x+39,tip.y);h.step(.5);
 for(let stroke=0;stroke<3;stroke++){
  tip=h.run('tapeGeometry().tip');h.fire('pointerdown',tip.x,tip.y);h.step(.4);const span=h.run('state.peelSpan');assert(tip.x+span<900);
  for(let i=1;i<=50;i++){h.setTime(h.time+25);h.fire('pointermove',tip.x+span*i/50,tip.y);}
  if(stroke===0){assert(h.run('state.peel')>.35);assert(!h.run('state.finished'));}
  h.fire('pointerup',tip.x+span,tip.y);
 }
 assert(h.run('state.finished'));
});
test('USB colors do not determine compatibility; all three distinct cables must connect',()=>{
 const h=setup();h.run("init('usb')");assert.equal(h.run('new Set(state.usbCables.map(c=>c.port)).size'),3);assert(h.run('state.usbCables.some(c=>c.port!==c.id)'));
 const wrong=h.run('state.usbCables.find(c=>c.port!==c.id).id');h.run(`state.activeCable=${wrong};cable().position=socket(${wrong});cable().face=state.usbPorts[${wrong}].face`);
 let pos=h.run('cable().position');h.fire('pointerdown',pos.x,pos.y);h.setTime(h.time+20);h.fire('pointermove',pos.x+.2,pos.y);assert(h.run('state.fail')>0);assert(!h.run('cable().connected'));h.fire('pointerup',pos.x,pos.y);h.step(.5);
 for(let i=0;i<3;i++){
  h.run(`state.activeCable=${i};cable().position=socket(cable().port);cable().face=state.usbPorts[cable().port].face`);pos=h.run('cable().position');h.fire('pointerdown',pos.x,pos.y);h.step(.3);assert(!h.run(`state.usbCables[${i}].connected`));
  for(let n=0;n<100&&!h.run(`state.usbCables[${i}].connected`);n++){h.setTime(h.time+16);pos=h.run(`socket(state.usbCables[${i}].port)`);h.fire('pointermove',pos.x,pos.y);h.run(`advance(.016,${h.time})`);}
  assert(h.run(`state.usbCables[${i}].connected`));if(i<2)assert(!h.run('state.finished'));h.fire('pointerup',pos.x,pos.y);
 }
 assert(h.run('state.finished'));assert.equal(h.run('new Set(state.usbPorts.map(p=>p.occupiedBy)).size'),3);
});
test('USB rejects a wrong face and never assigns an occupied port twice',()=>{
 const h=setup();h.run("init('usb');state.activeCable=0;cable().position=socket(cable().port);cable().face=1-state.usbPorts[cable().port].face");let p=h.run('cable().position');h.fire('pointerdown',p.x,p.y);h.setTime(h.time+20);h.fire('pointermove',p.x+.2,p.y);assert(h.run('state.fail')>0);assert(!h.run('cable().connected'));h.fire('pointerup',p.x,p.y);h.step(.5);
 h.els.rotate.onclick();assert(h.run('cable().face===state.usbPorts[cable().port].face'));
 h.run('state.usbCables[0].connected=true;state.usbPorts[state.usbCables[0].port].occupiedBy=0;state.activeCable=1;cable().position=socket(state.usbCables[0].port)');p=h.run('cable().position');h.fire('pointerdown',p.x,p.y);h.setTime(h.time+20);h.fire('pointermove',p.x+.2,p.y);assert(!h.run('state.usbCables[1].connected'));assert.equal(h.run('state.usbPorts[state.usbCables[0].port].occupiedBy'),0);
});
test('sheet needs four independent fingers held simultaneously, not sequential taps',()=>{
 const h=setup();h.run("init('sheet')");const cs=h.run('corners');
 for(const v of cs){h.fire('pointerdown',v.x,v.y,1);h.step(.1);h.fire('pointerup',v.x,v.y,1);}assert(!h.run('state.finished'));assert.equal(h.run('state.sheetHold'),0);
 for(let i=0;i<3;i++)h.fire('pointerdown',cs[i].x,cs[i].y,10+i);
 h.step(2);assert(!h.run('state.finished'));assert.equal(h.run('state.fitted.filter(Boolean).length'),3);
 h.fire('pointerdown',cs[3].x,cs[3].y,10);assert.equal(h.run('state.fitted.filter(Boolean).length'),3);
 h.fire('pointerdown',cs[3].x,cs[3].y,13);h.step(.8);assert(!h.run('state.finished'));
 h.fire('pointerup',cs[0].x,cs[0].y,10);assert.equal(h.run('state.sheetHold'),0);h.step(1);assert(!h.run('state.finished'));
 h.fire('pointerdown',cs[0].x,cs[0].y,14);h.step(1.65);assert(h.run('state.finished'));
});
test('sheet cancellation and moving one finger away release only its corner',()=>{
 const h=setup();h.run("init('sheet')");const cs=h.run('corners');for(let i=0;i<4;i++)h.fire('pointerdown',cs[i].x,cs[i].y,20+i);h.step(.4);
 h.fire('pointermove',450,330,20);assert.equal(h.run('state.fitted.filter(Boolean).length'),3);assert.equal(h.run('state.sheetHold'),0);
 h.fire('pointermove',cs[0].x,cs[0].y,20);assert.equal(h.run('state.fitted.filter(Boolean).length'),4);
 h.fire('pointercancel',cs[1].x,cs[1].y,21);assert.equal(h.run('state.fitted.filter(Boolean).length'),3);
 h.fire('lostpointercapture',cs[2].x,cs[2].y,22);assert.equal(h.run('state.fitted.filter(Boolean).length'),2);
 h.run("init('sheet')");assert.equal(h.run('sheetPointers.size'),0);assert.equal(h.run('state.fitted.filter(Boolean).length'),0);
});
test('desktop sheet requires A S K L held together',()=>{
 const h=setup();h.run("init('sheet')");for(const key of ['a','s','k'])h.run(`sheetKey({key:'${key}',preventDefault(){}},true)`);h.step(2);assert(!h.run('state.finished'));
 h.run("sheetKey({key:'l',preventDefault(){}},true)");h.step(1.65);assert(h.run('state.finished'));
});
test('screw difficulty depends on angular speed, not pointer-event frequency',()=>{
 const progress=[];for(const hz of [30,120]){const h=setup();h.run("init('screw')");h.fire('pointerdown',520,330);for(let i=1;i<=hz*3;i++){const a=i/hz*3;h.setTime(h.time+1000/hz);h.fire('pointermove',450+70*Math.cos(a),330+70*Math.sin(a));}assert.equal(h.run('state.fail'),0);progress.push(h.run('state.progress'));}assert(Math.abs(progress[0]-progress[1])<.002);
 const h=setup();h.run("init('screw')");h.fire('pointerdown',520,330);h.setTime(h.time+16);h.fire('pointermove',450,400);assert(h.run('state.fail')>0);
});
test('screw only wins when released at the right tightness',()=>{
 const h=setup();h.run("init('screw');state.tightness=.95");h.fire('pointerdown',520,330);
 for(let i=1;i<=10;i++){h.setTime(h.time+40);h.fire('pointermove',450+70*Math.cos(i*.1),330+70*Math.sin(i*.1));}
 assert(h.run('state.tightness>=screwLimits.ready'));assert(!h.run('state.finished'));h.fire('pointerup',520,330);assert.equal(h.run('state.outcome'),'won');
});
test('too much rotation cracks then breaks wood; releasing cannot turn a break into a win',()=>{
 const h=setup();h.run("init('screw');state.tightness=1.07");h.fire('pointerdown',520,330);
 for(let i=1;i<=65&&!h.run('state.finished');i++){h.setTime(h.time+40);h.fire('pointermove',450+70*Math.cos(i*.1),330+70*Math.sin(i*.1));if(i===10){assert(h.run('state.woodDamage>0'));assert(!h.run('state.finished'));}}
 assert(h.run('state.woodBroken'));assert.equal(h.run('state.outcome'),'broken');h.fire('pointerup',520,330);assert.equal(h.run('state.outcome'),'broken');h.run("init('screw')");assert.equal(h.run('state.woodDamage'),0);assert(!h.run('state.woodBroken'));
});
test('backing off does not heal cracks, and cancelled contact never wins',()=>{
 const h=setup();h.run("init('screw');state.tightness=1.16;updateWood()");const damage=h.run('state.woodDamage');h.fire('pointerdown',520,330);
 for(let i=1;i<=25;i++){h.setTime(h.time+40);h.fire('pointermove',450+70*Math.cos(-i*.1),330+70*Math.sin(-i*.1));}
 assert(h.run('state.tightness<1.08'));assert.equal(h.run('state.woodDamage'),damage);h.fire('pointercancel',520,330);assert(!h.run('state.finished'));
});
test('thread pickup works anywhere without moving or losing the tip',()=>{
 const h=setup();h.run("init('needle')");assert(h.fire('pointerdown',430,490));assert(h.run('state.grabbing'));assert.equal(h.run('state.fail'),0);assert.equal(h.run('state.thread.x'),175);
 h.setTime(h.time+40);h.fire('pointermove',440,485);assert.equal(h.run('state.thread.x'),185);assert.equal(h.run('state.thread.y'),345);
});
test('needle cannot be won by holding still in its eye',()=>{
 const h=setup();h.run("init('needle');state.thread=needleWorld({x:0,y:0},needleEye());state.wetUntil=10000");const p=h.run('state.thread');h.fire('pointerdown',p.x,p.y);h.step(2);assert(!h.run('state.finished'));assert.equal(h.run('state.threadStage'),'approach');
});
test('thread must follow the moving needle and pass completely through from the left',()=>{
 const h=setup();h.run("init('needle');state.thread=needleWorld({x:-55,y:0},needleEye());state.wetUntil=10000");let p=h.run('state.thread');h.fire('pointerdown',p.x,p.y);
 for(let i=1;i<=62&&!h.run('state.finished');i++){
  h.setTime(h.time+20);p=h.run(`needleWorld({x:${-55+i*1.7},y:0},needleEye())`);h.fire('pointermove',p.x,p.y);h.run(`advance(.02,${h.time})`);
  if(i===40){assert.equal(h.run('state.threadStage'),'through');assert(!h.run('state.finished'));}
 }
 assert(h.run('state.finished'));
});
test('missing the eye keeps the thread in hand near the needle for another try',()=>{
 const h=setup();h.run("init('needle');state.thread=needleWorld({x:-12,y:30},needleEye())");let p=h.run('state.thread');h.fire('pointerdown',p.x,p.y);h.setTime(h.time+100);p=h.run('needleWorld({x:8,y:30},needleEye())');h.fire('pointermove',p.x,p.y);
 assert(h.run('state.fail')>0);assert(h.run('state.grabbing'));assert(h.run('distance(state.thread,needleEye())<50'));assert(!h.run('state.finished'));
});
test('egg touch starts without teleporting the tool or agitating the white',()=>{
 const h=setup(true);h.run('reset()');assert(h.fire('pointerdown',800,600));assert.equal(h.run('p.x'),500);assert.equal(h.run('p.y'),470);assert.equal(h.run('heat'),0);h.setTime(h.time+40);h.fire('pointermove',810,595);assert(Math.abs(h.run('p.x')-510)<1e-8);assert(Math.abs(h.run('p.y')-465)<1e-8);h.fire('pointermove',100,100,2);assert(Math.abs(h.run('p.x')-510)<1e-8);h.fire('pointercancel',0,0);assert.equal(h.run('eggPointer'),null);assert(!h.run('down'));assert(h.fire('contextmenu',0,0));
});
test('egg held transport tolerates the same physical touch speed at 30 and 60 Hz',()=>{
 for(const hz of [30,60]){const h=setup(true);h.run('reset()');h.fire('pointerdown',100,300);h.run('holding=true;shell.x=p.x;shell.y=p.y');for(let i=0;i<hz;i++){h.setTime(h.time+1000/hz);h.fire('pointermove',100+(i+1)*1000/hz/9,300);h.run(`draw(${1/hz})`);}assert(h.run('holding'),hz+' Hz should not drop the shell');assert.equal(h.run('heat'),0);}
});
test('egg can be caught and carried using slow touch movement',()=>{
 const h=setup(true);h.run('reset()');let rx=250,ry=400;h.fire('pointerdown',rx,ry);
 for(let i=0;i<1800&&!h.run('holding');i++){
  const dx=h.run('shell.x-p.x'),dy=h.run('shell.y-p.y'),d=Math.hypot(dx,dy),step=Math.min(d,105/60);rx+=dx/(d||1)*step;ry+=dy/(d||1)*step;
  h.setTime(h.time+1000/60);h.fire('pointermove',rx,ry);h.run('draw(1/60)');
 }
 assert(h.run('holding'),'a patient touch approach must be able to catch the shell');
 for(let i=0;i<1200&&!h.run('won');i++){
  const dx=890-h.run('p.x'),dy=365-h.run('p.y'),d=Math.hypot(dx,dy),step=Math.min(d,80/60);rx+=dx/(d||1)*step;ry+=dy/(d||1)*step;
  h.setTime(h.time+1000/60);h.fire('pointermove',rx,ry);h.run('draw(1/60)');
 }
 assert(h.run('won'),'carrying the shell slowly to the edge must win');
});
test('leaf can be loosened slowly and carried down by the tongue',()=>{
 const h=setup();h.run("init('leaf')");h.fire('pointerdown',400,500);assert(h.run('state.grabbing'));assert.equal(h.run('state.tongue.x'),450);
 let offset=h.run('grabOffset');
 for(let i=1;i<=80;i++){const p={x:450+44*i/80,y:425-158*i/80};h.setTime(h.time+20);h.fire('pointermove',p.x-offset.x,p.y-offset.y);h.run(`advance(.02,${h.time})`);}
 h.step(1.2);assert(h.run('state.leafAttached'));assert(!h.run('state.finished'));
 for(let y=269;y<=485&&!h.run('state.finished');y+=2){h.setTime(h.time+25);h.fire('pointermove',494-offset.x,y-offset.y);h.run(`advance(.025,${h.time})`);}
 assert.equal(h.run('state.outcome'),'won');
});
test('rushing the tongue makes the leaf slip back between the teeth',()=>{
 const h=setup();h.run("init('leaf');state.tongue={x:494,y:267};state.leafLoosen=.7");h.fire('pointerdown',100,100);h.setTime(h.time+20);h.fire('pointermove',140,100);assert(h.run('state.fail')>0);assert(!h.run('state.leafAttached'));assert(h.run('state.leafLoosen<.7'));assert.equal(h.run('state.leaf.y'),267);
});
test('bomb waits for first interaction, then explodes only at its hidden random deadline',()=>{
 const h=setup();h.run("init('bomb');Sneeze.random=()=>0;state.sneeze.cooldown=0");h.step(450);assert(!h.run('state.finished'));assert.equal(h.run('state.bombRemaining'),0);assert.equal(h.run('state.elapsed'),0);assert.equal(h.run('state.sneeze.count'),0);
 h.run("bombAction('button')");const deadline=h.run('state.bombRemaining');assert(deadline>=12&&deadline<40);
 h.step(2);assert(!h.run('state.finished'));const remaining=h.run('state.bombRemaining');h.run("bombAction('dial');bombAction('manual');bombAction('check');win();sneezeImpact()");assert.equal(h.run('state.bombRemaining'),remaining);assert(!h.run('state.finished'));assert.equal(h.run('state.sneeze.count'),0);
 h.step(remaining-.1);assert(!h.run('state.finished'));h.step(.2);assert.equal(h.run('state.outcome'),'exploded');assert(!/achís/i.test(h.els['overlay-title'].textContent));
 h.run("init('bomb')");assert(!h.run('state.bombStarted'));assert(h.run('state.bombCuts.every(c=>!c)'));
});
test('bomb buttons respond and pliers cut individual wires through tap or drag',()=>{
 const h=setup();h.run("init('bomb')");h.fire('pointerdown',330,455);h.fire('pointerup',330,455);assert(h.run('state.bombButton'));
 h.fire('pointerdown',647,455);h.fire('pointerup',647,455);assert.equal(h.run('state.bombDial'),1);
 h.fire('pointerdown',310,300);h.fire('pointerup',310,300);assert(!h.run('state.bombCuts[0]'));
 h.fire('pointerdown',787,350);h.fire('pointermove',310,300);h.fire('pointerup',310,300);assert(h.run('state.bombCuts[0]'));
 h.fire('pointerdown',405,300);h.fire('pointerup',405,300);assert(h.run('state.bombCuts[1]'));assert(!h.run('state.bombCuts[2]'));
 h.fire('pointerdown',787,350);h.fire('pointercancel',500,300);assert(!h.run('state.bombCuts[2]'));
 assert(!h.run('state.finished'));assert(h.run('state.progress')<1);
});
test('eleven catalog entries link to existing game artwork without revealing the bomb trick',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.equal((html.match(/class="game-card"/g)||[]).length,11);
 for(const mode of ['leaf','bomb','sweep','sushi','dog']){assert(html.includes('data-open="'+mode+'"'));for(const width of [480,960]){assert(html.includes('assets/'+mode+'-'+width+'.webp'));assert(fs.existsSync(path.join(root,'assets',mode+'-'+width+'.webp')));}}
 const card=html.split('data-open="bomb"')[0].split('<article').pop();assert(!/imposible|sin solución|siempre explota/i.test(card));
});
test('random sneeze affects the other nine arcade games only near completion',()=>{
 const situations={dog:"state.dogStage='check'",sushi:'state.sushiHeld=true;sushiPiece().position={x:600,y:350}',sweep:'state.progress=.9',tape:'state.peel=.9',usb:'state.usbCables[0].connected=true;state.usbCables[1].connected=true;state.activeCable=2;state.dockHold=.6',sheet:'sheetKeys=new Set([0,1,2,3]);syncSheet();state.sheetHold=1',screw:'state.tightness=.99',needle:"state.threadStage='through'",leaf:'state.leafAttached=true'};
 for(const [mode,prepare]of Object.entries(situations)){
  const h=setup();h.run(`init('${mode}');state.sneeze.cooldown=0;state.sneeze.random=()=>0;pressed=true;state.grabbing=true;${prepare}`);h.run(`advance(.016,${h.time})`);assert.equal(h.run('state.sneeze.count'),1,mode);assert(h.run('state.sneeze.cooldown>=300&&state.sneeze.cooldown<=420'));assert(!h.run('state.grabbing'));
  if(mode==='tape')assert(h.run('state.peel<.5'));
  if(mode==='usb'){assert.equal(h.run('state.usbCables.filter(c=>c.connected).length'),2);assert.equal(h.run('state.dockHold'),0);}
  if(mode==='sheet'){assert.equal(h.run('sheetKeys.size'),0);assert.equal(h.run('state.fitted.filter(Boolean).length'),0);}
  if(mode==='screw')assert(h.run('state.woodBroken'));
  if(mode==='needle')assert.equal(h.run('state.threadStage'),'approach');
  if(mode==='leaf')assert(!h.run('state.leafAttached'));
  if(mode==='bomb')assert.equal(h.run('state.outcome'),'exploded');
 }
});
test('egg sneeze drops the shell and clears contact',()=>{
 const h=setup(true);h.run('reset()');h.fire('pointerdown',100,200);h.run('holding=true;shell.x=710;shell.y=365;eggSneeze.cooldown=0;eggSneeze.random=()=>0;draw(.016)');assert.equal(h.run('eggSneeze.count'),1);assert(!h.run('holding'));assert.equal(h.run('eggPointer'),null);assert(h.run('cooldown>0'));
});
test('sneeze does not trigger while idle or after the game is finished',()=>{
 const h=setup();h.run("init('tape');state.sneeze.cooldown=0;state.sneeze.random=()=>0");h.step(2);assert.equal(h.run('state.sneeze.count'),0);h.run("state.finished=true;state.outcome='won';state.peel=.99;pressed=true;state.grabbing=true");h.step(1);assert.equal(h.run('state.sneeze.count'),0);assert.equal(h.run('state.outcome'),'won');
});
test('late sneeze can undo the final USB but never the other two connections',()=>{
 const h=setup();h.run("init('usb');for(const c of state.usbCables){c.connected=true;state.usbPorts[c.port].occupiedBy=c.id;}state.activeCable=2;state.sneeze.cooldown=0;state.sneeze.random=()=>0;win()");assert(!h.run('state.finished'));assert.equal(h.run('state.usbCables.filter(c=>c.connected).length'),2);assert.equal(h.run('state.usbPorts[cable().port].occupiedBy'),null);
 h.run('state.sneeze.random=()=>1;state.usbCables[2].connected=true;win()');assert.equal(h.run('state.outcome'),'won');
});
test('sheet sneeze requires releasing held keyboard fingers before trying again',()=>{
 const h=setup();h.run("init('sheet');sheetKeys=new Set([0,1,2,3]);syncSheet();state.sneeze.cooldown=0;state.sneeze.random=()=>0;state.sheetHold=1;advance(.016,1000)");
 for(const key of ['a','s','k','l'])h.run(`sheetKey({key:'${key}',preventDefault(){}},true)`);assert.equal(h.run('state.fitted.filter(Boolean).length'),0);
 for(const key of ['a','s','k','l']){h.run(`sheetKey({key:'${key}',preventDefault(){}},false)`);h.run(`sheetKey({key:'${key}',preventDefault(){}},true)`);}
 assert.equal(h.run('state.fitted.filter(Boolean).length'),4);h.run('state.sneeze.random=()=>1');h.step(1.65);assert.equal(h.run('state.outcome'),'won');
});
test('sneeze cooldown prevents immediate repeats and reset clears the animation',()=>{
 const h=setup();h.run("init('tape');state.peel=.9;pressed=true;state.grabbing=true;state.sneeze.cooldown=0;state.sneeze.random=()=>0;advance(.016,1000)");h.run('state.peel=.9;state.penalty=0;pressed=true;state.grabbing=true');h.step(1);assert.equal(h.run('state.sneeze.count'),1);h.run("init('tape')");assert.equal(h.run('state.sneeze.count'),0);assert.equal(h.run('state.sneeze.flash'),0);
});
test('sneeze probability is comparable at 30 and 120 frames per second',()=>{
 const h=setup();const rates=h.run(`(()=>{let seed=47;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);return [30,120].map(hz=>{let hits=0;for(let n=0;n<1000;n++){const s=Sneeze.create();s.random=rng;s.cooldown=0;for(let i=0;i<hz*2;i++)if(Sneeze.tick(s,1/hz,true)){hits++;break}}return hits/1000})})()`);assert(Math.abs(rates[0]-rates[1])<.07);assert(rates.every(n=>n>.6&&n<.83));
});
test('broom uses relative touch movement and physically pushes nearby dust toward the pan',()=>{
 const h=setup();h.run("init('sweep');state.broom={x:500,y:330};state.dust=[{x:560,y:330,r:4,kind:0}];state.dustCollected=17");h.fire('pointerdown',300,400);assert.equal(h.run('state.broom.x'),500);h.setTime(h.time+100);h.fire('pointermove',400,400);assert.equal(h.run('state.broom.x'),600);assert.equal(h.run('state.dustCollected'),18);assert.equal(h.run('state.sweepRounds'),1);assert.equal(h.run('state.dust.length'),3);assert(!h.run('state.finished'));assert.equal(h.run('state.progress'),.99);
});
test('a last line of dust remains after repeated cleanup and lifting the pan',()=>{
 const h=setup();h.run("init('sweep');state.dustCollected=18");
 for(let i=0;i<4;i++){h.run('state.dust=lastDust();state.broom={x:525,y:335};moveBroom({x:635,y:335})');assert(h.run('state.dust.length>0'));assert(!h.run('state.finished'));assert(h.run('state.progress')<1);}
 const before=h.run('state.dust.length');h.els['lift-pan'].onclick();assert(h.run('state.dust.length')>before);h.run('win()');assert(!h.run('state.finished'));
});
test('a sneeze scatters collected dust and resetting restores the starting floor',()=>{
 const h=setup();h.run("init('sweep');state.progress=.99;state.dustCollected=18;state.dust=lastDust();pressed=true;state.grabbing=true;state.sneeze.cooldown=0;state.sneeze.random=()=>0;advance(.016,1000)");assert.equal(h.run('state.sneeze.count'),1);assert(h.run('state.dust.length')>3);assert(h.run('state.progress')<.99);assert(!h.run('state.grabbing'));h.run("init('sweep')");assert.equal(h.run('state.dust.length'),18);assert.equal(h.run('state.progress'),0);
});
test('sushi grip takes a moment and three gentle deliveries win',()=>{
 const h=setup();h.run("init('sushi')");
 for(let id=0;id<3;id++){
  const home=h.run(`state.sushiPieces[${id}].home`);h.fire('pointerdown',home.x,home.y);h.step(.2);assert(!h.run('state.sushiHeld'));h.step(.2);assert(h.run('state.sushiHeld'));
  for(let i=1;i<=160;i++){h.setTime(h.time+20);h.fire('pointermove',home.x+(680-home.x)*i/160,home.y+(350-home.y)*i/160);h.run(`advance(.02,${h.time})`);}
  assert(!h.run('state.finished'));h.fire('pointerup',680,350);assert(h.run(`state.sushiPieces[${id}].delivered`));if(id<2)assert(!h.run('state.finished'));
 }
 assert.equal(h.run('state.outcome'),'won');
});
test('jerking sushi breaks it and recovery restores only the damaged piece',()=>{
 const h=setup();h.run("init('sushi');state.sushiPieces[1].delivered=true");h.fire('pointerdown',237,245);h.step(.4);h.setTime(h.time+16);h.fire('pointermove',500,245);assert(h.run('state.sushiPieces[0].broken'));assert(h.run('state.sushiDebris.length>0'));h.fire('pointerup',500,245);h.step(.9);assert(!h.run('state.sushiPieces[0].broken'));assert.equal(h.run('state.sushiPieces[0].position.x'),237);assert(h.run('state.sushiPieces[1].delivered'));
});
test('holding chopsticks too long crushes sushi; releasing outside the plate also fails',()=>{
 const h=setup();h.run("init('sushi')");h.fire('pointerdown',237,245);h.step(3.9);assert(h.run('state.fail')>0);assert(!h.run('state.sushiHeld'));h.fire('pointerup',237,245);h.step(1);
 h.fire('pointerdown',237,245);h.step(.4);h.fire('pointerup',237,245);assert(h.run('state.sushiPieces[0].broken'));assert(!h.run('state.sushiPieces[0].delivered'));
});
test('cancelled touch over the sushi plate does not count as delivery',()=>{
 const h=setup();h.run("init('sushi')");h.fire('pointerdown',237,245);h.step(.4);h.run('sushiPiece().position={x:680,y:350}');h.fire('pointercancel',680,350);assert(!h.run('sushiPiece().delivered'));assert(h.run('sushiPiece().broken'));
});
test('sushi sneeze drops the held piece and can undo a final delivery',()=>{
 const h=setup();h.run("init('sushi');state.sushiPieces[0].delivered=true;state.sushiPieces[1].delivered=true;state.sushiActive=2;state.sushiHeld=true;sushiPiece().position={x:610,y:350};pressed=true;state.grabbing=true;state.sneeze.cooldown=0;state.sneeze.random=()=>0;advance(.016,1000)");assert.equal(h.run('state.sneeze.count'),1);assert(h.run('sushiPiece().broken'));assert.equal(h.run('state.sushiPieces.filter(c=>c.delivered).length'),2);
 h.run("init('sushi');for(const c of state.sushiPieces)c.delivered=true;state.sushiActive=2;state.sneeze.cooldown=0;state.sneeze.random=()=>0;win()");assert(!h.run('state.finished'));assert.equal(h.run('state.sushiPieces.filter(c=>c.delivered).length'),2);
});
test('all scenes render after interaction and tool changes',()=>{
 const h=setup();for(const mode of ['tape','usb','sheet','screw','needle','leaf','bomb','sweep','sushi','dog'])h.run(`init('${mode}');scene()`);const e=setup(true);e.run("reset();draw(.016);tool='spoon';draw(.016);tool='tweezers';draw(.016)");
});

test('sneeze initial and repeat waits range from five to seven minutes',()=>{
 const h=setup();
 for(const [random,seconds] of [[0,300],[.5,360],[1,420]]){
  h.run(`Sneeze.random=()=>${random};globalThis.waitState=Sneeze.create()`);
  assert.equal(h.run('waitState.cooldown'),seconds);
  h.run('Sneeze.fire(waitState)');assert.equal(h.run('waitState.cooldown'),seconds);
 }
});
test('nearing victory cannot trigger a sneeze before five minutes',()=>{
 const h=setup();h.run('Sneeze.random=()=>0;globalThis.waitState=Sneeze.create()');
 for(let i=0;i<2999;i++){
  assert(!h.run('Sneeze.tick(waitState,.1,true)'));
  assert(!h.run('Sneeze.finish(waitState)'));
 }
 assert.equal(h.run('waitState.count'),0);
 h.run('Sneeze.tick(waitState,.1,true);Sneeze.tick(waitState,.1,true)');
 assert.equal(h.run('waitState.count'),1);
 for(let i=0;i<2999;i++){
  assert(!h.run('Sneeze.tick(waitState,.1,true)'));
  assert(!h.run('Sneeze.finish(waitState)'));
 }
 assert.equal(h.run('waitState.count'),1);
});

test('red notices remain readable for four seconds without extending input penalties',()=>{
 const h=setup();h.run("init('leaf');slipLeaf()");assert.equal(h.run('state.noticeTime'),4);
 h.step(.3);assert.equal(h.run('state.penalty'),0);assert(h.run('state.noticeTime')>3.6);
 h.fire('pointerdown',450,425);assert(h.run('state.grabbing'));h.fire('pointerup',450,425);
 h.step(3.6);assert(h.run('state.noticeTime')>0);h.step(.2);assert.equal(h.run('state.noticeTime'),0);
 h.run('slipLeaf()');h.step(2);h.run('slipLeaf()');assert.equal(h.run('state.noticeTime'),4);
 h.run("init('leaf')");assert.equal(h.run('state.noticeTime'),0);
});

test('desktop sushi tolerates mouse pickup jitter and moderate movement but still rejects jerks',()=>{
 const h=setup(false,900);h.run("init('sushi')");
 for(let id=0;id<3;id++){
  const home=h.run(`state.sushiPieces[${id}].home`);
  h.fire('pointerdown',home.x,home.y,1,'mouse');h.setTime(h.time+30);h.fire('pointermove',home.x+24,home.y,1,'mouse');assert(!h.run('sushiPiece().broken'));h.step(.4);
  for(let i=1;i<=36;i++){
   h.setTime(h.time+40);h.fire('pointermove',home.x+(680-home.x)*i/36,home.y+(350-home.y)*i/36,1,'mouse');h.run(`advance(.04,${h.time})`);
  }
  assert(!h.run('sushiPiece().broken'));h.fire('pointerup',680,350,1,'mouse');assert(h.run(`state.sushiPieces[${id}].delivered`));
 }
 assert.equal(h.run('state.outcome'),'won');
 h.run("init('sushi')");h.fire('pointerdown',237,245,1,'mouse');h.step(.4);h.setTime(h.time+16);h.fire('pointermove',500,245,1,'mouse');assert(h.run('sushiPiece().broken'));
});
test('all thirteen extra bomb controls respond without resetting the hidden deadline',()=>{
 const h=setup();h.run("init('bomb')");
 const controls=h.run('bombExtras');assert.equal(controls.length,13);
 for(const c of controls){
  h.fire('pointerdown',c.x,c.y);h.fire('pointerup',c.x,c.y);
  assert.equal(h.run('state.bombChoice'),c.kind);
  if(c.kind==='key')assert(h.run('state.bombCode').endsWith(String(c.id+1)));
  if(c.kind==='knob')assert.equal(h.run(`state.bombKnobs[${c.id}]`),1);
  if(c.kind==='switch')assert(h.run(`state.bombSwitches[${c.id}]`));
  if(c.kind==='aux')assert(h.run(`state.bombAux[${c.id}]`));
 }
 assert.equal(h.run('state.bombCode'),'123456');assert(!h.run('state.finished'));
 const remaining=h.run('state.bombRemaining');h.step(1);h.fire('pointerdown',222,198);h.fire('pointerup',222,198);assert(Math.abs(h.run('state.bombRemaining')-remaining+1)<1e-8);
 h.step(remaining);assert.equal(h.run('state.outcome'),'exploded');
 h.run("init('bomb')");assert.equal(h.run('state.bombCode'),'');assert(h.run('state.bombSwitches.every(v=>!v)'));assert(h.run('state.bombKnobs.every(v=>v===0)'));
});

test('USB lights distinguish neutral, wrong port, face, alignment, speed and connected states',()=>{
 const h=setup();h.run("init('usb');inputType='mouse';state.motion=0");assert.equal(h.run('usbSignal(cable()).status'),'off');
 h.run('cable().face=state.usbPorts[cable().port].face;cable().position={...socket(cable().port)}');assert.equal(h.run('usbSignal(cable()).status'),'green');
 h.run('cable().face=1-cable().face');assert.equal(h.run('usbSignal(cable()).status'),'red');assert.match(h.run('usbSignal(cable()).message'),/Girá/);
 h.run('cable().face=1-cable().face;cable().position={...socket((cable().port+1)%3)}');assert.equal(h.run('usbSignal(cable()).status'),'red');assert.match(h.run('usbSignal(cable()).message'),/otro puerto/);
 h.run('cable().position={...socket(cable().port)};state.usbPorts[cable().port].occupiedBy=1');assert.match(h.run('usbSignal(cable()).message'),/ocupado/);
 h.run('state.usbPorts[cable().port].occupiedBy=null;cable().position.y+=20');assert.match(h.run('usbSignal(cable()).message'),/alineá/);
 h.run('cable().position={...socket(cable().port)};state.motion=120');assert.match(h.run('usbSignal(cable()).message'),/despacio/);
 h.run('state.motion=0;dockCable()');assert.equal(h.run('usbSignal(cable()).status'),'green');
});

test('dog touch moves the cheese relatively and rejects only a rushed close approach',()=>{
 const h=setup();h.run("init('dog')");h.fire('pointerdown',90,200);h.setTime(h.time+50);h.fire('pointermove',95,203);assert.equal(h.run('state.dogHand.x'),225);assert.equal(h.run('state.dogHand.y'),403);
 h.setTime(h.time+16);h.fire('pointermove',445,145);assert(h.run('state.fail')>0);assert(!h.run('state.grabbing'));h.fire('pointercancel',445,145);h.step(1.6);assert.equal(h.run('state.dogTurn'),0);
});
test('dog only takes cheese through an open mouth while held, then checks before victory',()=>{
 const h=setup();h.run("init('dog');Math.random=()=>.99;state.dogClock=2.5;state.dogHand={...dogMouth()};pressed=true;state.grabbing=true");h.run('advanceDog(.1)');assert.equal(h.run('state.dogFeed'),0);
 h.run('state.dogClock=.6;pressed=false');h.run('advanceDog(.1)');assert.equal(h.run('state.dogFeed'),0);
 h.run('pressed=true;state.dogClock=.6;state.dogHand={...dogMouth()}');h.step(.55);assert.equal(h.run('state.dogStage'),'chew');assert(!h.run('state.finished'));
 h.step(1.3);assert.equal(h.run('state.dogStage'),'check');assert(!h.run('state.finished'));h.step(1.7);assert.equal(h.run('state.outcome'),'won');
});
test('dog can eat cheese and spit the pill, with a clean retry and optional wrapping',()=>{
 const h=setup();h.run("init('dog');Math.random=()=>0;state.dogClock=.6;state.dogHand={...dogMouth()};pressed=true;state.grabbing=true");h.step(.55);h.fire('pointerup',564,341);h.step(1.3);h.step(1.7);assert.equal(h.run('state.dogStage'),'spit');assert(!h.run('state.finished'));assert(h.run('state.fail')>0);
 h.step(1.5);assert.equal(h.run('state.dogStage'),'offer');assert.equal(h.run('state.dogHand.x'),220);
 h.els.cheese.onclick();assert(h.run('state.dogWrapped'));h.run("init('dog')");assert(!h.run('state.dogWrapped'));assert.equal(h.run('state.dogStage'),'offer');
});
