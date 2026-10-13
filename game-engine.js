import {purchasing} from './loan-model.js';
export const ANCHORS=[
  {name:'시청·광화문 업무지구',short:'시청',lat:37.5654798,lng:126.9771140,sourceUrl:'https://www.openstreetmap.org/node/5935738063'},
  {name:'강남 업무지구',short:'강남',lat:37.4979497,lng:127.0275574,sourceUrl:'https://www.openstreetmap.org/node/5927529147'},
  {name:'여의도 업무지구',short:'여의도',lat:37.5216685,lng:126.9243018,sourceUrl:'https://www.openstreetmap.org/node/6039313670'},
  {name:'판교 업무지구',short:'판교',lat:37.3947237,lng:127.1115312,sourceUrl:'https://www.openstreetmap.org/node/8308318738'}
];
export function distanceKm(a,b){const r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r;const x=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
export function shuffle(arr,rng=Math.random){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const pick=a=>a[Math.floor(Math.random()*a.length)];
export function createPersona(homes){
  const names=['김민서','박도윤','이서연','정지우','윤서준','최수빈','한지민','오유진'];
  const jobs=['IT 서비스 기획자','공공기관 사무직','병원 간호사','제조업 연구원','회계·재무 담당자','콘텐츠 마케터'];
  for(let attempt=0;attempt<100;attempt++){
    const married=Math.random()<.4,children=married&&Math.random()<.4?1:0;
    const income=(married?pick([5800,6400,7200,8000,8500]):pick([3600,4200,4800,5400,6000,6600,7200]))*10000;
    const cash=pick([9000,12000,15000,18000,22000,27000,32000,38000])*10000;
    const existingAnnualDebtWon=pick([0,0,0,120,240,360])*10000;
    const p={name:pick(names),job:pick(jobs),age:pick([26,28,29,31,33,35]),married,marriageYears:married?pick([1,2,3,4,5]):null,dualIncome:married,children,annualIncomeWon:income,cashWon:cash,assetsWon:cash,existingAnnualDebtWon,existingAnnualInterestWon:existingAnnualDebtWon*.2,homeless:true,firstHome:true,anchor:pick(ANCHORS)};
    const possible=homes.filter(h=>purchasing(p,h).canBuy);
    if(possible.length>=5&&homes.length-possible.length>=2)return p;
  }
  throw new Error('데이터의 가격대에 맞는 페르소나를 구성하지 못했습니다.');
}
export function diverseSample(homes,n){const groups=new Map;for(const h of shuffle(homes)){const key=h.district||h.region; if(!groups.has(key))groups.set(key,[]);groups.get(key).push(h);}const result=[];while(result.length<n&&groups.size){for(const [key,values] of shuffle([...groups])){if(result.length>=n)break;result.push(values.pop());if(!values.length)groups.delete(key);}}return result;}
export function createGame(persona,homes){
  const possible=homes.filter(h=>purchasing(persona,h).canBuy),impossible=homes.filter(h=>!purchasing(persona,h).canBuy);
  if(possible.length<5||impossible.length<2)throw new Error('구매 가능한 후보 5개와 예산 초과 후보 2개를 확보하지 못했습니다.');
  return {persona,homes:shuffle([...diverseSample(possible,5),...diverseSample(impossible,2)]).map((h,i)=>({...h,label:String.fromCharCode(65+i)})),round:0,viewedId:null,selectedId:null,changesLeft:2,history:[],startedAt:Date.now()};
}
export const returnRate=h=>(h.recent.priceWon/h.past.priceWon-1)*100;
export function ranking(game){
  const market=[...game.homes].sort((a,b)=>returnRate(b)-returnRate(a));
  return game.homes.map(h=>({...h,financing:purchasing(game.persona,h),returnPct:returnRate(h),marketRank:market.findIndex(x=>x.id===h.id)+1})).sort((a,b)=>{
    if(a.financing.canBuy!==b.financing.canBuy)return a.financing.canBuy?-1:1;
    if(!a.financing.canBuy)return a.financing.gapWon/a.past.priceWon-b.financing.gapWon/b.past.priceWon;
    return b.returnPct-a.returnPct;
  }).map((h,i)=>({...h,rank:i+1}));
}
export function choose(game,id,reason){
  if(!game.homes.some(h=>h.id===id))return {ok:false,message:'후보에 없는 집입니다.'};
  if(game.selectedId===id)return {ok:true,changed:false};
  if(game.round>0&&game.selectedId&&game.changesLeft<=0)return {ok:false,message:'변경권 2회를 모두 사용했습니다. 현재 선택을 유지하세요.'};
  if(!reason)return {ok:false,message:'선택 이유를 하나 골라주세요.'};
  if(game.round>0&&game.selectedId)game.changesLeft--;
  const previousId=game.selectedId;game.selectedId=id;
  if(game.round===0){game.history=[{round:0,id,reason,action:'첫 선택'}];}
  else game.history.push({round:game.round,id,previousId,reason,action:'선택 변경'});
  return {ok:true,changed:true};
}
