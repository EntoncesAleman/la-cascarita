'use strict';
(()=>{
 const titles={donkey:'Ponele la cola al burro.',egg:'La cascarita.',tape:'Encontrá la punta.',usb:'Del otro lado.',sheet:'La sábana ajustable.',screw:'Una vueltita más.',needle:'Enhebrá eso.',leaf:'Un poquito de verde.',bomb:'Un ajuste pendiente.',sweep:'La última barrida.',sushi:'Con mucho cuidado.',dog:'Abrí grande.',house:'La casa está en orden.'};
 const rows=Journey.results(),complete=rows.every(r=>r.played),$=id=>document.getElementById(id),time=n=>Math.floor(n/3600)+':'+String(Math.floor(n/60)%60).padStart(2,'0')+':'+String(Math.floor(n)%60).padStart(2,'0');
 $('result-title').textContent=complete?'Resultado final.':'Tu recorrido.';
 $('result-copy').textContent=complete?'Recorriste todas las tareas. Algunas quedaron resueltas. Otras tenían sus propios planes.':'Todavía quedan tareas por recorrer. Tu resultado se guarda a medida que terminás partidas.';
 const totals=[[rows.filter(r=>r.played).length+' / '+rows.length,'Tareas recorridas'],[rows.filter(r=>r.wins>0).length,'Tareas resueltas'],[rows.reduce((sum,r)=>sum+r.losses,0),'Game over reales'],[time(rows.reduce((sum,r)=>sum+r.seconds,0)),'Tiempo en partidas terminadas']];
 $('totals').innerHTML=totals.map(([number,label])=>`<div class="total"><strong>${number}</strong><span>${label}</span></div>`).join('');
 $('result-rows').innerHTML=rows.map(r=>{const recorded=r.wins+r.losses>0,status=r.wins>0?'Resuelto':r.last==='lost'?'GAME OVER':r.played?'Jugado anteriormente':'Pendiente';const title=Journey.can(r.id)?`<a href="${Journey.url(r.id)}">${titles[r.id]}</a>`:titles[r.id];return`<tr><td>${title}</td><td><span class="badge ${r.last==='lost'&&!r.wins?'lost':!recorded?'pending':''}">${status}</span></td><td>${recorded?r.losses:'—'}</td><td>${recorded?time(r.seconds):'—'}</td></tr>`}).join('');
 $('legacy-note').hidden=!rows.some(r=>r.played&&r.wins+r.losses===0);
 const next=rows.find(r=>!r.played&&Journey.can(r.id));if(next){$('continue').href=Journey.url(next.id);$('continue').textContent='Seguir con la próxima tarea →'}
})();
