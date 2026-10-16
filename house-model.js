'use strict';
globalThis.HouseModel=(()=>{
 const rooms={living:{name:'Living',line:'Un almohadón no se acomoda solo.',zones:{sofa:'Sillón',table:'Mesa ratona',shelf:'Biblioteca'}},kitchen:{name:'Cocina',line:'Son apenas unos platos.',zones:{cupboard:'Alacena',bin:'Cesto de basura'}},bedroom:{name:'Dormitorio',line:'La ropa no vive en una silla.',zones:{wardrobe:'Placard',bed:'Cama',nightstand:'Mesa de luz'}},bath:{name:'Baño',line:'Un lugar para recomponerse.',zones:{cabinet:'Botiquín',rack:'Toallero'}},laundry:{name:'Lavadero',line:'La ropa también tiene un recorrido.',zones:{washer:'Lavarropas',supply:'Estante de limpieza'}},entry:{name:'Entrada',line:'Cada cosa en su lugar.',zones:{hooks:'Perchero',rack:'Zapatero',drawer:'Cajón de la entrada'}}};
 const data=[
 ['cushion','Almohadón','pillow','living','living','sofa'],['mug','Taza','mug','living','kitchen','cupboard'],['towel','Toalla','towel','living','bath','rack'],['shoe','Zapatilla','shoe','living','entry','rack'],['letter','Sobre','letter','living','entry','drawer'],['coat','Campera','shirt','living','entry','hooks'],
 ['book','Libro','book','kitchen','living','shelf'],['charger','Cargador','charger','kitchen','bedroom','nightstand'],['pajamas','Pijama usado','shirt','kitchen','laundry','washer'],['brush','Cepillo de pelo','brush','kitchen','bath','cabinet'],['umbrella','Paraguas','umbrella','kitchen','entry','hooks'],['wrapper','Envoltorio','paper','kitchen','kitchen','bin'],
 ['remote','Control remoto','remote','bedroom','living','table'],['bowl','Bowl','bowl','bedroom','kitchen','cupboard'],['slipper','Pantufla','shoe','bedroom','entry','rack'],['detergent','Detergente','bottle','bedroom','laundry','supply'],['notebook','Cuaderno','book','bedroom','living','shelf'],['jeans','Pantalón limpio','pants','bedroom','bedroom','wardrobe'],
 ['magazine','Revista','book','bath','living','table'],['shirt','Remera usada','shirt','bath','laundry','washer'],['spoon','Cuchara','spoon','bath','kitchen','cupboard'],['cloth','Paño de limpieza','cloth','bath','laundry','supply'],
 ['bedpillow','Almohada','pillow','laundry','bedroom','bed'],['toothbrush','Cepillo de dientes','toothbrush','laundry','bath','cabinet'],['blanket','Manta limpia','towel','laundry','bedroom','wardrobe'],['keyring','Llaves de casa','key','laundry','entry','hooks'],['pan','Sartén','pan','laundry','kitchen','cupboard'],
 ['shampoo','Champú','bottle','entry','bath','cabinet'],['plate','Plato','plate','entry','kitchen','cupboard'],['sheets','Sábana limpia','towel','entry','bedroom','bed'],['receipt','Papel arrugado','paper','entry','kitchen','bin'],
 ['sock-a','Media izquierda','sock','living','laundry','washer',{under:'cushion'}],['sock-b','Media derecha','sock','bedroom','laundry','washer',{under:'jeans'}],['cabinet-key','Llave de la alacena','key','living','kitchen','cupboard',{under:'coat'}],
 ['clean-shirt','Remera recién lavada','shirt','laundry','bedroom','wardrobe',{washed:true}],['clean-pajamas','Pijama limpio','shirt','laundry','bedroom','wardrobe',{washed:true}],['clean-socks','Par de medias limpio','sock','laundry','bedroom','wardrobe',{washed:true}],
 ['last-glasses','Anteojos','glasses','living','bedroom','nightstand',{inspection:true}],['last-toy','Libro chiquito','book','kitchen','living','shelf',{inspection:true}],['last-cup','Vaso olvidado','mug','bedroom','kitchen','cupboard',{inspection:true}],['last-soap','Jabón de lavar','bottle','bath','laundry','supply',{inspection:true}],['last-scarf','Bufanda','towel','laundry','entry','hooks',{inspection:true}],['last-remote','Otro control remoto','remote','entry','living','table',{inspection:true}]
 ];
 const items=data.map(([id,name,kind,origin,dest,zone,extra={}])=>({id,name,kind,origin,dest,zone,...extra}));
 const slots={},roomSlots={};for(const item of items){slots[item.id]=item.under?slots[item.under]:item.washed?5+items.filter(i=>i.washed).findIndex(i=>i.id===item.id):item.inspection?3:(roomSlots[item.origin]||0);if(!item.under&&!item.washed&&!item.inspection)roomSlots[item.origin]=(roomSlots[item.origin]||0)+1;}
 const byId=Object.fromEntries(items.map(i=>[i.id,i])),dirtyOn={cushion:'living',wrapper:'kitchen',jeans:'bedroom',cloth:'bath',pan:'laundry',sheets:'entry'};
 const dirtyClothes=['pajamas','shirt','sock-a','sock-b'];
 function create(){return{version:1,room:'living',slot:{...slots},status:Object.fromEntries(items.map(i=>[i.id,i.under||i.washed||i.inspection?'hidden':'floor'])),location:Object.fromEntries(items.map(i=>[i.id,i.origin])),basket:[],selected:null,cloth:false,unlocked:false,dirt:Object.fromEntries(Object.keys(rooms).map(r=>[r,0])),wash:'idle',washTime:0,inspection:false,won:false,crying:false,cryTime:0,cries:0,patience:100,elapsed:0,moves:0,mistakes:0,hints:0,message:'Levantá algo del piso. Seguro sabés dónde va.',log:[]}}
 function say(s,msg){s.message=msg;s.log=[msg,...s.log].slice(0,5);return msg}
 function floor(s,room=s.room){return items.filter(i=>s.status[i.id]==='floor'&&s.location[i.id]===room)}
 function free(s){return !s.won&&!s.crying}
 function go(s,room){if(s.crying||!rooms[room])return false;if(s.room!==room){s.room=room;if(!s.won){s.moves++;say(s,rooms[room].line)}}return true}
 function pick(s,id){
  const item=byId[id];if(!free(s)||!item||s.status[id]!=='floor'||s.location[id]!==s.room)return false;
  if(id!=='cloth'&&s.basket.length>=3){say(s,'El canasto tiene tres lugares. Guardá algo o dejalo en este piso.');return false}
  if(id==='cloth'){s.cloth=true;s.status[id]='stored';say(s,'El paño va al bolsillo. Ahora podés limpiar los rincones.');}
  else{s.status[id]='basket';s.basket.push(id);s.selected=id;say(s,item.name+' en el canasto. ¿En qué habitación iba?')}
  if(dirtyOn[id])s.dirt[dirtyOn[id]]=3;
  const found=items.filter(i=>i.under===id&&s.status[i.id]==='hidden');
  for(const child of found)s.status[child.id]='floor';
  if(found.length){s.patience=Math.max(0,s.patience-3);say(s,'Debajo de '+item.name.toLowerCase()+' había '+found.map(i=>i.name.toLowerCase()).join(' y ')+'. Por supuesto.')}
  return true;
 }
 function select(s,id){if(!free(s)||!s.basket.includes(id))return false;s.selected=id;return true}
 function drop(s){if(!free(s)||!s.basket.includes(s.selected))return false;const id=s.selected;s.status[id]='floor';s.location[id]=s.room;const occupied=new Set(floor(s).filter(i=>i.id!==id).map(i=>s.slot[i.id]));let available=0;while(occupied.has(available))available++;s.slot[id]=available;s.basket=s.basket.filter(v=>v!==id);s.selected=s.basket[0]||null;say(s,'Dejaste '+byId[id].name.toLowerCase()+' en este piso. Sigue pendiente.');return true}
 function wrong(s,msg){s.mistakes++;s.patience=Math.max(0,s.patience-6);say(s,msg);return false}
 function place(s,zone){
  if(!free(s)||!rooms[s.room].zones[zone])return false;
  const item=byId[s.selected];if(!item||!s.basket.includes(item.id)){say(s,'Elegí primero algo del canasto.');return false}
  if(item.dest!==s.room||item.zone!==zone)return wrong(s,'Eso no vive ahí. '+item.name+' vuelve al canasto.');
  if(s.room==='kitchen'&&zone==='cupboard'&&!s.unlocked&&item.id!=='cabinet-key'){say(s,'La alacena está cerrada. Tiene que haber una llave en alguna parte.');return false}
  if(item.id.startsWith('sock-')&&(!s.basket.includes('sock-a')||!s.basket.includes('sock-b'))){say(s,'Una media sola no arma un par. Traé las dos juntas al lavarropas.');return false}
  const ids=item.id.startsWith('sock-')?['sock-a','sock-b']:[item.id];
  for(const id of ids)s.status[id]='stored';s.basket=s.basket.filter(id=>!ids.includes(id));s.selected=s.basket[0]||null;
  if(item.id==='cabinet-key'){s.unlocked=true;say(s,'La llave entró. La alacena ya se puede usar.');}
  else say(s,ids.length===2?'El par de medias, por fin.':'Guardaste '+item.name.toLowerCase()+'. Una cosa menos.');
  return true;
 }
 function clean(s){if(!free(s)||!s.dirt[s.room])return false;if(!s.cloth){say(s,'Hace falta un paño. No vas a limpiar esto con la mano.');return false}s.dirt[s.room]--;say(s,s.dirt[s.room]?'Una pasada más. Todavía queda un poquito.':'Este rincón sí quedó limpio.');return true}
 function wash(s){if(!free(s)||s.room!=='laundry'||s.wash!=='idle')return false;if(!dirtyClothes.every(id=>s.status[id]==='stored')){say(s,'Falta ropa: el pijama, la remera y el par de medias.');return false}s.wash='running';s.washTime=10;say(s,'Lavando. Podés ir acomodando otra habitación mientras tanto.');return true}
 function cry(s){if(!free(s)||s.room!=='bath')return false;s.crying=true;s.cryTime=0;s.cries++;say(s,'Cerraste la puerta del baño. La casa puede esperar un rato.');return true}
 function stopCry(s){if(!s.crying)return false;s.crying=false;s.patience=Math.min(100,s.patience+Math.min(30,Math.floor(s.cryTime)*5));say(s,'Bueno. Una habitación a la vez.');return true}
 function tick(s,dt){if(s.won)return false;dt=Math.max(0,Math.min(1,dt));if(s.crying){s.cryTime+=dt;return true}s.elapsed+=dt;if(s.wash==='running'){s.washTime=Math.max(0,s.washTime-dt);if(!s.washTime){s.wash='done';for(const item of items)if(item.washed)s.status[item.id]='floor';say(s,'Terminó el lavado. Ahora falta guardar la ropa limpia.');return true}}return false}
 function hint(s){if(!free(s))return false;s.hints++;const item=byId[s.selected];if(item){say(s,item.id==='cloth'?'El paño ya está en tu bolsillo.':item.id.startsWith('sock-')?'Juntá las dos medias. Una apareció bajo el almohadón y otra bajo el pantalón.':item.id==='cabinet-key'?'Probá la llave en la alacena de la cocina.':item.name+': '+rooms[item.dest].name+' → '+rooms[item.dest].zones[item.zone]+'.');}
  else if(!s.cloth)say(s,'Buscá el paño de limpieza en el baño.');else if(!s.unlocked)say(s,'La campera del living estaba tapando algo.');else{const todo=Object.keys(rooms).find(r=>floor(s,r).length||s.dirt[r]);say(s,todo?'Revisá '+rooms[todo].name.toLowerCase()+'. Todavía hay algo pendiente.':s.wash==='idle'?'En el lavadero falta poner el lavado.':s.wash==='running'?'Esperá a que termine el lavado.':'Probá el botón «Ya terminé».');}return true}
 function inspect(s){
  if(!free(s))return false;
  if(s.basket.length){say(s,'Todavía llevás cosas en el canasto. Primero hay que guardarlas.');return false}
  const pending=Object.keys(rooms).find(r=>floor(s,r).length||s.dirt[r]);if(pending){s.patience=Math.max(0,s.patience-3);say(s,'Parecía que sí. Mirá otra vez '+rooms[pending].name.toLowerCase()+'.');return false}
  if(s.wash!=='done'){say(s,s.wash==='running'?'Todavía está andando el lavarropas.':'Falta terminar con la ropa del lavadero.');return false}
  if(!s.inspection){s.inspection=true;for(const item of items)if(item.inspection)s.status[item.id]='floor';say(s,'Última recorrida: debajo de los muebles había unas cositas. Una en cada habitación.');return false}
  if(items.some(i=>s.status[i.id]!=='stored')){say(s,'Algo quedó sin revisar. Buscá lo que está debajo de otras cosas.');return false}
  s.won=true;say(s,'La casa está en orden. Esta vez, de verdad.');return true;
 }
 function restore(raw){
  try{const old=typeof raw==='string'?JSON.parse(raw):raw;if(!old||old.version!==1)return create();const s=create();
   if(!Object.hasOwn(rooms,old.room)||!Array.isArray(old.basket)||old.basket.length>3||old.basket.some(id=>!byId[id])||new Set(old.basket).size!==old.basket.length)return create();
   for(const item of items){if(!['floor','hidden','basket','stored'].includes(old.status?.[item.id])||!Object.hasOwn(rooms,old.location?.[item.id]))return create();s.status[item.id]=old.status[item.id];s.location[item.id]=old.location[item.id];s.slot[item.id]=Number.isInteger(old.slot?.[item.id])&&old.slot[item.id]>=0&&old.slot[item.id]<50?old.slot[item.id]:s.slot[item.id];}
   if(items.some(i=>(s.status[i.id]==='basket')!==old.basket.includes(i.id)))return create();
   s.room=old.room;s.basket=old.basket;s.selected=s.basket.includes(old.selected)?old.selected:s.basket[0]||null;
   for(const k of ['unlocked','inspection','won'])s[k]=old[k]===true;s.cloth=s.status.cloth==='stored';
   for(const r of Object.keys(rooms))s.dirt[r]=Math.max(0,Math.min(3,Number(old.dirt?.[r])||0));
   for(const k of ['elapsed','moves','mistakes','hints','cries'])s[k]=Math.max(0,Number(old[k])||0);
   s.patience=Math.max(0,Math.min(100,Number(old.patience)||0));s.wash=['idle','running','done'].includes(old.wash)?old.wash:'idle';s.washTime=Math.max(0,Math.min(10,Number(old.washTime)||0));s.message='Seguimos donde habías dejado. Una habitación a la vez.';return s;
  }catch{return create()}
 }
 return{rooms,items,byId,dirtyClothes,create,restore,floor,go,pick,select,drop,place,clean,wash,cry,stopCry,tick,hint,inspect};
})();
