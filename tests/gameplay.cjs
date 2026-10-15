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
  let prevented=false;const scale=width/(egg?1000:900),e={clientX:x*scale,clientY:y*scale,pointerId:id,pointerType,preventDefault(){prevented=true}};
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
test('tape needs a held grip and three short strokes, all within the canvas',()=>{
 const h=setup();h.run("init('tape');state.tipAngle=0");h.fire('pointerdown',581,328);h.setTime(h.time+20);h.fire('pointermove',620,328);assert.equal(h.run('state.peel'),0);assert(h.run('state.fail')>0);h.fire('pointerup',620,328);h.step(.5);
 for(let stroke=0;stroke<3;stroke++){
  h.fire('pointerdown',581,328);h.step(.4);
  for(let x=585;x<=781;x+=4){h.setTime(h.time+25);h.fire('pointermove',x,328);}
  if(stroke===0){assert(h.run('state.peel')>.35);assert(!h.run('state.finished'));}
  h.fire('pointerup',781,328);
 }
 assert(h.run('state.finished'));
});
test('USB requires correct face and steady alignment rather than instant contact',()=>{
 const h=setup();h.run("init('usb');state.socketFace=1;state.rotation=0;state.position=socket()");h.fire('pointerdown',681,h.run('state.position.y'));h.setTime(h.time+20);h.fire('pointermove',680,h.run('socket().y'));assert(h.run('state.fail')>0);h.fire('pointerup',680,330);h.step(.5);
 h.run('state.rotation=1;state.position=socket()');h.fire('pointerdown',681,h.run('state.position.y'));h.step(.3);assert(!h.run('state.finished'));
 for(let i=0;i<80&&!h.run('state.finished');i++){h.setTime(h.time+16);h.fire('pointermove',681,h.run('socket().y'));h.run(`advance(.016,${h.time})`);}
 assert(h.run('state.finished'));
});
test('sheet cannot be won with four taps; holds, diagonals and tension management work',()=>{
 const h=setup();h.run("init('sheet')");for(const [x,y]of [[210,208],[685,208],[685,462],[210,462]]){h.fire('pointerdown',x,y);h.fire('pointerup',x,y);}assert.equal(h.run('state.progress'),0);
 h.fire('pointerdown',210,208);h.step(.75);h.fire('pointerup',210,208);h.fire('pointerdown',685,208);h.step(.75);h.fire('pointerup',685,208);assert.equal(h.run('state.fitted.filter(Boolean).length'),1);
 h.run("init('sheet')");for(const i of [0,2,1,3]){if(i===1||i===3)h.els.loosen.onclick();const v=h.run(`corners[${i}]`);h.fire('pointerdown',v.x,v.y);h.step(.75);h.fire('pointerup',v.x,v.y);}assert(h.run('state.finished'));
});
test('screw difficulty depends on angular speed, not pointer-event frequency',()=>{
 const progress=[];for(const hz of [30,120]){const h=setup();h.run("init('screw')");h.fire('pointerdown',520,330);for(let i=1;i<=hz*3;i++){const a=i/hz*3;h.setTime(h.time+1000/hz);h.fire('pointermove',450+70*Math.cos(a),330+70*Math.sin(a));}assert.equal(h.run('state.fail'),0);progress.push(h.run('state.progress'));}assert(Math.abs(progress[0]-progress[1])<.002);
 const h=setup();h.run("init('screw')");h.fire('pointerdown',520,330);h.setTime(h.time+16);h.fire('pointermove',450,400);assert(h.run('state.fail')>0);
});
test('needle threading continues while a finger stays still',()=>{
 const h=setup();h.run("init('needle');state.thread={x:660,y:313};state.wetUntil=10000");h.fire('pointerdown',660,313);h.step(.4);assert(!h.run('state.finished'));h.step(.55);assert(h.run('state.finished'));const elapsed=h.run('state.elapsed');h.step(1);assert.equal(h.run('state.elapsed'),elapsed);
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
