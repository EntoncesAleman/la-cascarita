'use strict';
// A voluntary release after the twenty-fifth attempt, shared by both boards.
globalThis.Desastre={
 ready(attempts){return attempts>25},
 draw(ctx,w,h,elapsed,kind){
  const t=Math.min(1,elapsed/1.1),colors={egg:['#faf5de','#d7b879','#d99b51'],tape:['#e9c46d','#f3dc9e','#b89b68'],usb:['#d17d6b','#7ba6b9','#e0b859'],sheet:['#94b080','#c3d1a2','#6c946e'],screw:['#d1a16f','#b78250','#e1ba85'],needle:['#c46d5f','#b7c5bd','#e8d3b0'],leaf:['#84ab61','#a8c774','#6d9556'],bomb:['#91a183','#d2bd7b','#c87f6b'],sweep:['#c6a06d','#8da57d','#ddd0a7'],sushi:['#fff6d8','#e4a280','#6d8c6a'],dog:['#f2d086','#c3cf9c','#e8b777']}[kind];
  ctx.save();ctx.lineCap='round';
  // Only props break: living characters get crumbs or leaves, never cracks.
  if(['egg','usb','bomb','screw'].includes(kind)){
   ctx.strokeStyle='#7b675c';ctx.lineWidth=3;
   for(let i=0;i<7;i++){const a=i*.91+.2;ctx.beginPath();ctx.moveTo(w*.52,h*.47);ctx.lineTo(w*.52+Math.cos(a)*w*.11*t,h*.47+Math.sin(a)*h*.12*t);ctx.lineTo(w*.52+Math.cos(a+.12)*w*.27*t,h*.47+Math.sin(a+.12)*h*.27*t);ctx.stroke();}
  }
  for(let i=0;i<34;i++){
   const a=i*2.4,x=w*.5+Math.cos(a)*(40+i*5)*t,y=h*.38+Math.sin(a)*(25+i*3)*t+h*.28*t*t;
   ctx.save();ctx.translate(x,y);ctx.rotate(a+t*2);ctx.fillStyle=colors[i%colors.length];ctx.strokeStyle='#8d8064';ctx.lineWidth=1;
   ctx.beginPath();if(kind==='needle'){ctx.moveTo(-13,0);ctx.quadraticCurveTo(0,-15,17,6);ctx.strokeStyle=colors[i%3];ctx.lineWidth=3;ctx.stroke();}
   else{ctx.moveTo(-7,-4);ctx.lineTo(9,-5);ctx.lineTo(5,kind==='sheet'||kind==='tape'?28:8);ctx.lineTo(-5,5);ctx.closePath();ctx.fill();ctx.stroke();}ctx.restore();
  }
  ctx.restore();
 }
};
