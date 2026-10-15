'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),noop=()=>{};
function setup(egg=false,width=360){
 let now=1000;const listeners={},els={};
 const ctx=new Proxy({measureText:s=>({width:s.length*8}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>o[k]??noop});
 const canvas={style:{},width,height:width*(egg?735/1000:660/900),getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width,height:width*(egg?735/1000:660/900)}),addEventListener:(name,fn)=>{(listeners[name]??=[]).push(fn)},setPointerCapture:noop,focus:noop};
 function el(id){return els[id]??={style:{},classList:{add:noop,remove:noop},textContent:'',innerHTML:'',setAttribute:noop};}
 const s={console,document:{body:{classList:{add:noop,remove:noop}},getElementById:id=>id==='scene'?canvas:el(id),querySelector:()=>canvas,querySelectorAll:()=>[]},window:{scrollTo:noop,addEventListener:noop,devicePixelRatio:1},performance:{now:()=>now},location:{hash:'',pathname:'/'},history:{replaceState:noop},localStorage:{getItem:()=>null,setItem:noop},requestAnimationFrame:noop,devicePixelRatio:1};
 vm.createContext(s);const source=egg?fs.readFileSync(path.join(root,'cascarita.html'),'utf8').split('<script>')[1].split('</script>')[0]:fs.readFileSync(path.join(root,'arcade.js'),'utf8');vm.runInContext(source,s);
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
test('all scenes render after interaction and tool changes',()=>{
 const h=setup();for(const mode of ['tape','usb','sheet','screw','needle'])h.run(`init('${mode}');scene()`);const e=setup(true);e.run("reset();draw(.016);tool='spoon';draw(.016);tool='tweezers';draw(.016)");
});
