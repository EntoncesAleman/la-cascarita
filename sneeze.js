'use strict';
// Shared, frame-rate-independent surprise used by both game pages.
const Sneeze={
 random:()=>Math.random(),
 create(){return{cooldown:.8,flash:0,count:0,random:this.random}},
 fire(s){s.count++;s.flash=1.15;s.cooldown=9+s.random()*5;return true},
 tick(s,dt,near){dt=Math.max(0,Math.min(dt,.1));s.flash=Math.max(0,s.flash-dt);s.cooldown=Math.max(0,s.cooldown-dt);return near&&s.cooldown===0&&s.random()<1-Math.exp(-.65*dt)?this.fire(s):false},
 finish(s){return s.cooldown===0&&s.random()<.22?this.fire(s):false},
 draw(ctx,s,w,h){
  if(s.flash<=0)return;ctx.save();ctx.globalAlpha=Math.min(1,s.flash/.25);ctx.translate(w*.5,h*.22);
  ctx.fillStyle='#fff5dceF';ctx.strokeStyle='#c6ad7f';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(-146,-44,292,88,22);ctx.fill();ctx.stroke();
  ctx.fillStyle='#edc780';ctx.beginPath();ctx.arc(-96,0,28,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#8c6848';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(-113,-7);ctx.lineTo(-106,-3);ctx.lineTo(-113,1);ctx.moveTo(-91,-7);ctx.lineTo(-98,-3);ctx.lineTo(-91,1);ctx.moveTo(-99,8);ctx.quadraticCurveTo(-91,7,-89,13);ctx.stroke();
  ctx.fillStyle='#fffdf0';for(const [x,y,r]of [[-73,12,8],[-62,7,11],[-51,14,9]]){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle='#9f6547';ctx.font='bold 30px sans-serif';ctx.textAlign='center';ctx.fillText('¡ACHÍS!',40,10);ctx.restore();
 }
};
