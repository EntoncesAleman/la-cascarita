'use strict';
globalThis.Journey=(()=>{
 const order=['donkey','egg','tape','usb','sheet','screw','needle','leaf','bomb','sweep','sushi','dog','house'],key='tareas-recorrido-v1';
 const rewards={sweep:'Escoba y pala',screw:'Destornillador',sheet:'Sábana ajustable',tape:'Rollo de cinta'};
 let equipment=[];try{const raw=JSON.parse(localStorage.getItem('tareas-herramientas-v1')||'[]');if(Array.isArray(raw))equipment=raw.filter(id=>Object.hasOwn(rewards,id))}catch{}
 function collect(id){if(!completed.includes(id)||!rewards[id])return false;if(!equipment.includes(id)){equipment.push(id);try{localStorage.setItem('tareas-herramientas-v1',JSON.stringify(equipment))}catch{}}return true}
 let completed=[];try{const data=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(data))completed=data.filter(id=>order.includes(id))}catch{}
 const resultKey='tareas-resultados-v1',activeRounds=new Map();
 let records={};
 try{const raw=JSON.parse(localStorage.getItem(resultKey)||'{}');for(const id of order){const r=raw?.[id];if(r&&Number.isSafeInteger(r.wins)&&r.wins>=0&&Number.isSafeInteger(r.losses)&&r.losses>=0&&Number.isFinite(r.seconds)&&r.seconds>=0)records[id]={wins:r.wins,losses:r.losses,seconds:r.seconds,last:['won','lost'].includes(r.last)?r.last:null,best:Number.isFinite(r.best)&&r.best>=0?r.best:null};}}catch{}
 function begin(id){if(!can(id))return false;activeRounds.set(id,true);return true}
 function end(id,outcome,seconds=0){if(!activeRounds.get(id)||!['won','lost'].includes(outcome))return false;activeRounds.delete(id);const r=records[id]||{wins:0,losses:0,seconds:0,last:null,best:null};const duration=Math.max(0,Number.isFinite(seconds)?seconds:0);if(outcome==='won'){r.wins++;r.best=r.best===null?duration:Math.min(r.best,duration)}else r.losses++;r.seconds+=duration;r.last=outcome;records[id]=r;try{localStorage.setItem(resultKey,JSON.stringify(records))}catch{}finish(id);return true}
 function attempts(id){return records[id]?.losses||0}
 function results(){return order.map(id=>({id,played:completed.includes(id),...(records[id]?{...records[id]}:{wins:0,losses:0,seconds:0,last:null,best:null})}))}
 const can=id=>order.indexOf(id)===0||completed.includes(order[order.indexOf(id)-1]);
 function finish(id){if(!can(id)||completed.includes(id))return;completed.push(id);try{localStorage.setItem(key,JSON.stringify(completed))}catch{}refresh();document.dispatchEvent(new CustomEvent('task-complete',{detail:id}))}
 function url(id){return id==='egg'?'cascarita.html':id==='house'?'house.html':id==='donkey'?'donkey.html':'index.html#'+id}
 function refresh(){document.querySelectorAll('.game-card').forEach(card=>{const b=card.querySelector('.play');if(!b)return;const id=b.dataset.open||(b.getAttribute('href')?.includes('donkey')?'donkey':b.getAttribute('href')?.includes('house')?'house':'egg');const locked=!can(id);b.setAttribute('aria-disabled',String(locked));card.classList.toggle('locked',locked);b.title=locked?'Jugá una partida de la tarea anterior para continuar.':'';b.innerHTML=locked?'Primero, la tarea anterior <span>🔒</span>':(completed.includes(id)?'Volver a jugar':'Empezar')+' <span>↗</span>';});}
 document.addEventListener('click',e=>{const b=e.target.closest('.play');if(b?.getAttribute('aria-disabled')==='true'){e.preventDefault();e.stopImmediatePropagation()}},true);
 document.addEventListener('DOMContentLoaded',()=>{refresh();const style=document.createElement('style');style.textContent='.game-card.locked .art{filter:saturate(.35)}.play[aria-disabled=true]{background:#858775;cursor:not-allowed}.journey-next{display:block;margin:14px auto;padding:12px;color:#fff8e6;background:#485d40;border-radius:8px;text-align:center;text-decoration:none}';document.head.append(style);});
 function next(id,container){finish(id);if(container&&rewards[id]&&!container.querySelector('.take-tool')){const b=document.createElement('button');b.className='take-tool';b.style.cssText='margin:10px;padding:12px;border-radius:8px;min-height:44px';b.textContent=equipment.includes(id)?rewards[id]+' · en tu bolso':'Llevar: '+rewards[id];b.disabled=equipment.includes(id);b.onclick=()=>{if(collect(id)){b.textContent=rewards[id]+' · en tu bolso';b.disabled=true}};container.append(b)}const next=order[order.indexOf(id)+1];if(!next||!container||container.querySelector('.journey-next'))return;const a=document.createElement('a');a.className='journey-next';a.href=url(next);a.textContent='Siguiente tarea →';container.append(a)}
 return{order,can,finish,url,next,refresh,rewards,collect,begin,end,attempts,results,has:id=>equipment.includes(id)};
})();
