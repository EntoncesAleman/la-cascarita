'use strict';
globalThis.HouseArt=(()=>{
 // All room illustrations share a 1000 × 650 game coordinate system.
 const positions={living:{sofa:[315,324],table:[560,337],shelf:[793,223]},kitchen:{cupboard:[379,105],bin:[905,351]},bedroom:{wardrobe:[205,269],bed:[528,343],nightstand:[750,272]},bath:{cabinet:[211,348],rack:[766,218]},laundry:{washer:[263,296],supply:[563,159]},entry:{hooks:[214,195],rack:[758,386],drawer:[213,367]}};
 const slots=[[255,470],[405,517],[567,472],[720,520],[314,572],[584,580],[825,568],[146,533]];

 const kinds=['pillow','mug','towel','cloth','shoe','shirt','pants','letter','paper','book','remote','key','sock','bottle','charger','brush','toothbrush','spoon','bowl','plate','pan','umbrella','glasses','blanket'];
 function scene(room,dirt){
  const dust=dirt?`<g fill="#60472d" opacity="${.28+dirt*.12}">${[0,1,2,3,4,5,6,7,8].map(i=>`<ellipse cx="${405+i*10}" cy="${555+Math.sin(i*2)*15}" rx="${3+i%3*2}" ry="${2+i%2}"/>`).join('')}<path d="M403 569q39-13 88-3" stroke="#755334" stroke-width="3" fill="none"/></g>`:'';
  return `<svg viewBox="0 0 1000 650" aria-hidden="true" class="room-illustration" xmlns="http://www.w3.org/2000/svg"><image href="assets/house-room-${room}.webp" width="1000" height="650" preserveAspectRatio="xMidYMid slice"/>${dust}</svg>`;
 }
 function icon(kind){
  const index=Math.max(0,kinds.indexOf(kind)),x=index%6*256,y=Math.floor(index/6)*256;
  // A clipped viewport avoids separate downloads for every inventory item.
  return `<svg viewBox="0 0 100 100" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><svg x="0" y="0" width="100" height="100" viewBox="${x} ${y} 256 256" overflow="hidden"><image href="assets/house-objects.webp" width="1536" height="1024"/></svg></svg>`;
 }
 return {scene,icon,positions,slots};
})();
