import {createPersona,createGame,choose,ranking,returnRate,distanceKm} from './game-engine.js';
import {purchasing,calcLoanOptions,modelNotes,sources as loanSources} from './loan-model.js';
import {TIMELINE_YEARS,annualPrice,simulateAnnualJourney} from './timeline-engine.js';

const $=s=>document.querySelector(s),app=$('#app');
const e=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf=new Intl.NumberFormat('ko-KR');
const won=n=>nf.format(Math.round(n||0))+'원';
const money=n=>Math.abs(n)>=1e8?(n/1e8).toFixed(2).replace(/0+$/,'').replace(/\.$/,'')+'억':nf.format(Math.round(n/1e4))+'만';
const pct=n=>(n>=0?'+':'')+n.toFixed(1)+'%';
const safeUrl=u=>/^https:\/\//.test(u||'')?e(u):'#';
const LOCAL_KEY='housing-time-lab-v1';
const stages=['첫 선택','대출 조건','입지·교통','공급·가격'];
const reasons=['가격 대비 상승 가능성','교통·업무지구 접근성','주변 신축·공급 여건','낮은 현재 가격','전용면적·준공연도','대출 조건·구매 가능성','생활권·실거주 선호'];
let dataset=null,facts=[],persona=null,game=null,screen='intro',map=null,mapView=null,markers=new Map(),toastTimer;
let timelineChoices={},timelineOverrides={},timelineResult=null,timelineSavingRate=25;
const currentHome=()=>game?.homes.find(h=>h.id===game.viewedId);
const selectedHome=()=>game?.homes.find(h=>h.id===game.selectedId);
const loc=h=>`${h.region.replace('특별시','').replace('광역시','').replace('경기도','경기')} ${h.district}`;
const household=p=>p.married?`맞벌이 · 혼인 ${p.marriageYears}년 · 자녀 ${p.children}명`:'미혼 · 1인 가구';

async function boot(){
  try{
    const response=await fetch('./data/homes.json');if(!response.ok)throw new Error('실거래 데이터 파일을 불러오지 못했습니다.');
    dataset=await response.json();if(!Array.isArray(dataset.homes)||dataset.homes.length<10)throw new Error('비교 가능한 실거래 표본이 부족합니다.');
    try{const r=await fetch('./data/historical-facts.json');if(r.ok){const d=await r.json();facts=Array.isArray(d)?d:d.facts||[];}}catch{}
    restore();if(!persona)persona=createPersona(dataset.homes);render();
  }catch(error){app.innerHTML=`<div class="loading-state"><h1>자료를 준비하지 못했어요</h1><p>${e(error.message)}</p><button class="primary" data-action="reload">다시 불러오기 <span>↻</span></button></div>`;}
}
function persist(){try{localStorage.setItem(LOCAL_KEY,JSON.stringify({version:1,snapshot:dataset.meta.retrievedAt,persona,game:game?{...game,homes:game.homes.map(h=>h.id)}:null,screen}));}catch{}}
function restore(){
  try{const s=JSON.parse(localStorage.getItem(LOCAL_KEY));if(!s||s.version!==1||s.snapshot!==dataset.meta.retrievedAt)return;
    if(!s.persona||!Number.isFinite(s.persona.cashWon)||!s.persona.anchor)return;
    persona=s.persona;if(s.game&&Array.isArray(s.game.homes)&&s.game.homes.length===7){const hs=s.game.homes.map(id=>dataset.homes.find(h=>h.id===id));if(hs.every(Boolean)&&new Set(hs.map(h=>h.id)).size===7&&s.game.round>=0&&s.game.round<=3){game={...s.game,homes:hs.map((h,i)=>({...h,label:String.fromCharCode(65+i)}))};screen=['room','results'].includes(s.screen)?s.screen:'intro';}}
  }catch{try{localStorage.removeItem(LOCAL_KEY);}catch{}}
}
function metric(label,value,compact=false){return `<div class="metric"><dt>${label}</dt><dd${compact?' class="compact"':''}>${value}</dd></div>`;}
function render(){
  if(map){mapView={center:map.getCenter(),zoom:map.getZoom()};map.remove();map=null;markers.clear();}
  app.innerHTML=screen==='intro'?introHtml():screen==='room'?roomHtml():screen==='timeline'?timelineHtml():resultsHtml();
  if(screen==='room')initMap();if(screen==='timeline')syncTimelineControls();persist();
}
function introHtml(){const p=persona,m=dataset.meta;
  return `<section class="intro"><div class="hero-row"><div><div class="eyebrow">과거로 돌아가는 부동산 의사결정 실습</div><h1>그때의 선택,<br><em>지금의 결과.</em></h1><p>2020년의 당신에게 집을 고를 기회가 주어집니다.<br>대출과 지역 정보를 읽고, 실제 거래 결과로 선택을 확인하세요.</p></div><div class="date-ticket"><span>YOUR DECISION WINDOW</span><div class="date-range"><strong>2020.09</strong><b>→</b><strong>2026.09</strong></div><p>두 시점의 1~9월 실거래 중앙값 비교</p></div></div>
  <div class="intro-grid"><article class="persona-card"><div class="card-heading"><span class="overline">01 / 당신의 2020년 프로필</span><button class="subtle-button" data-action="reroll">↻ 인물 다시 뽑기</button></div><div class="person-title"><div class="avatar">${e(p.name.slice(1))}</div><div><h2>${e(p.name)} <span style="font-size:15px;font-weight:400">${p.age}세</span></h2><p>${e(p.job)} · ${e(household(p))}</p></div></div><dl class="persona-fields">${metric(p.married?'부부 합산 연소득':'연소득',money(p.annualIncomeWon)+'<small> 원</small>')}${metric('보유 현금 · 자기자금',money(p.cashWon)+'<small> 원</small>')}${metric('기존 대출 연간 원리금',money(p.existingAnnualDebtWon)+'<small> 원</small>')}${metric('직장 기준 생활권',e(p.anchor.short)+' 업무지구',true)}${metric('주택 보유 이력','무주택 · 생애 첫 매수',true)}${metric('주거 상황',p.married?`혼인 ${p.marriageYears}년 · 자녀 ${p.children}명`:'미혼 · 단독세대주',true)}</dl><div class="note">인물과 자금은 실습용 가상 조건입니다. 직접 수정은 할 수 없으며, 시작 전에는 자유롭게 다시 뽑을 수 있습니다.</div><button class="primary full" data-action="start">이 인물로 2020년 들어가기 <span>→</span></button></article>
  <article class="brief-card"><span class="overline">THE MISSION</span><h2>내가 살 수 있는 집 중,<br><strong>가장 많이 오른 집</strong>을 고르세요.</h2><ol><li><b>01</b><div><strong>실제 단지 7곳을 비교합니다</strong><p>공식 실거래 자료에서 후보를 추첨합니다.<br>5곳은 게임 예산 안에, 2곳은 예산 밖에 있습니다.</p></div></li><li><b>02</b><div><strong>단서는 세 번, 변경은 두 번</strong><p>대출 → 입지·교통 → 공급·가격 정보를 읽으며<br>선택을 유지하거나 변경권을 사용하세요.</p></div></li><li><b>03</b><div><strong>6년 뒤 실제 거래 결과를 확인합니다</strong><p>구매 가능성을 먼저 판별하고,<br>그 안에서 실제 가격 변화율로 순위를 매깁니다.</p></div></li></ol><div class="brief-bottom">최근 가격은 최종 선택 후 공개됩니다.<br>변화율은 동일 단지·전용면적 거래 표본의 중앙값 변화입니다.</div><button class="secondary full timeline-launch" data-action="start-timeline">연도별 갈아타기 모드 추가 실습 <span>→</span></button></article></div>
  <div class="dataset-strip"><div><span>국토교통부 원자료</span><strong>${nf.format(m.rawTransactionCount||0)}<small>2020·2026년 거래 행</small></strong></div><div><span>추첨 가능한 실거래 후보</span><strong>${nf.format(dataset.homes.length)}<small>서울·경기·인천 단지</small></strong></div><div><span>가격 표본 기준</span><strong>각 기간 5건 이상<small>해제 거래 제외 · 중앙값 비교</small></strong></div></div></section>`;
}
function profileHtml(){const p=game.persona;return `<aside class="room-sidebar"><article class="profile-mini"><div class="avatar">${e(p.name.slice(1))}</div><h2>${e(p.name)} · ${p.age}세</h2><p>${e(p.job)}<br>${e(household(p))}</p>${metric(p.married?'부부 합산 연소득':'연소득',money(p.annualIncomeWon)+'<small> 원</small>')}${metric('자기자금',money(p.cashWon)+'<small> 원</small>')}${metric('기존 대출 연간 원리금',money(p.existingAnnualDebtWon)+'<small> 원</small>')}${metric('직장 생활권',e(p.anchor.short)+' 업무지구',true)}</article><article class="change-box"><div class="overline">남은 선택 변경권</div><div class="tokens">${[0,1].map(i=>`<span class="token ${i>=game.changesLeft?'used':''}">${i<game.changesLeft?'↺':'−'}</span>`).join('')}</div><p>첫 선택 단계는 자유롭게 고를 수 있습니다. 대출 단서 공개부터 변경권이 사용됩니다.</p></article><button class="mini-reset" data-action="reset-prompt">처음부터 다시 시작</button></aside>`;}
function roomHtml(){
  const r=game.round,s=selectedHome();
  const next=['대출 조건 공개','입지·교통 단서 공개','공급·가격 단서 공개','2026년 실제 결과 확인'][r];
  return `<section class="workspace"><div class="room-top"><div><h1>${r===0?'2020년, 어떤 집을 고를까요?':stages[r]+'을 보고 판단하세요.'}</h1><p>의사결정 시점 2020.09.30 · 이후 정보는 결과에서 공개됩니다.</p></div><ol class="stage-track">${stages.map((name,i)=>`<li class="${i===r?'active':i<r?'done':''}"><b>${i<r?'✓':i+1}</b>${name}</li>`).join('')}</ol></div><div class="room-grid">${profileHtml()}<div class="room-map"><article class="map-card"><div class="map-toolbar"><h2>서울 · 수도권 후보 지도</h2><span>A–G 실제 단지 / ⌖ 직장 기준점</span></div><div id="map" aria-label="후보 아파트와 직장 기준점 지도"></div><div class="map-caption">단지 위치는 국토교통부 공식 GIS 좌표입니다. 지도 배경·행정명은 현재 기준이며, 2020년 시설 현황을 나타내지 않습니다.</div></article>${insightHtml()}</div><div class="room-detail">${currentHome()?detailHtml(currentHome()):`<article class="candidate-detail detail-empty"><b>⌖</b><h3>7개 후보를 둘러보세요</h3><p>지도 위 A–G 또는 아래 카드를 누르면<br>단지 정보와 선택 버튼이 표시됩니다.</p></article>`}</div></div>
  <section class="pool-section"><div class="pool-heading"><h2>후보 7곳 <span class="overline" style="margin-left:8px">2020년 실거래 기준</span></h2><p>${r===0?'이 단계에서는 선택을 자유롭게 바꿀 수 있어요.':'구매 가능 5곳 · 예산 초과 2곳'}</p></div><div class="house-cards">${game.homes.map(h=>houseCard(h)).join('')}</div></section><div class="round-bottom"><p>${s?`현재 선택 <strong>${e(s.label)} · ${e(s.name)}</strong><br>`:'먼저 후보를 살펴보고 집을 선택하세요.<br>'}${r===0?'첫 선택을 마치면 대출 조건이 공개됩니다.':r===3?'최종 선택을 확정하면 실제 가격 변화와 순위가 공개됩니다.':`선택을 유지해도 다음 단서를 볼 수 있습니다. 변경권 ${game.changesLeft}회 남음.`}</p><button class="primary ${r===3?'orange':''}" data-action="next" ${s?'':'disabled'}>${next}<span>→</span></button></div></section>`;
}
function houseCard(h){const f=game.round>0?purchasing(game.persona,h):null;return `<button class="house-card ${h.id===game.viewedId?'viewed':''} ${h.id===game.selectedId?'selected':''}" data-action="view" data-id="${e(h.id)}"><div class="house-card-head"><b>${h.label}</b><span class="${f&&!f.canBuy?'no':''}">${h.id===game.selectedId?'✓ 내 선택':f?(f.canBuy?'구매 가능':'예산 초과'):''}</span></div><h3>${e(h.name)}</h3><p>${e(loc(h))} · ${h.areaM2.toFixed(2)}㎡</p><strong>${money(h.past.priceWon)}<small>2020.01–09 · ${h.past.count}건 중앙값</small></strong></button>`;}
function matchingFacts(h,type){const key=(h.region+'|'+h.district).replace(/\s/g,'');return facts.filter(f=>(!type||f.type===type)&&(f.districtKeys||[]).some(k=>k==='*'||k.replace(/\s/g,'')===key)).sort((a,b)=>a.districtKeys.includes('*')-b.districtKeys.includes('*')).slice(0,2);}
function factsHtml(h,type){return matchingFacts(h,type).map(f=>`<p style="margin-top:12px"><strong>${e(f.title||'당시 공개된 정보')}</strong><br>${e(f.factText||f.text)}<br><span style="font-size:10px">${e(f.applicabilityNote||'')}</span><br><a href="${safeUrl(f.sourceUrl)}" target="_blank" rel="noopener">${e(f.publishedAt||f.date||'2020년 이전')} 공식 자료 ↗</a></p>`).join('');}
function districtStats(h){return h.districtPastStats||{transactionCount:h.districtPastTransactionCount,recentlyBuiltObservedComplexCount:h.districtObservedNewComplexCount};}
function insightHtml(){const h=currentHome();const p=game.persona;let body,title,tags=[];
  if(game.round===0){title='당시 가격으로, 첫 판단을 내려보세요.';body='실거래 가격과 전용면적, 준공연도, 위치를 비교하세요. 지금은 대출 한도가 공개되기 전입니다. 앞으로 오를 것 같은 집을 먼저 골라보고 선택 이유를 남기세요.';tags=['실제 거래가격','7곳 비교','첫 선택은 자유'];}
  if(game.round===1){title='집마다 받을 수 있는 대출이 다릅니다.';body='상품의 소득·주택가격·면적 조건과 LTV·DTI를 적용한 게임 한도를 공개합니다. 디딤돌, 보금자리론, 일반은행 대안을 비교하며 구매 가능한 후보를 가려보세요. 전세용 버팀목은 매매 예산에 더하지 않습니다.';tags=['정책대출 자격','LTV·DTI','상환여력'];}
  if(game.round===2){title='입지와 가격을 함께 읽으세요.';body=`업무지구 접근성, 면적, 준공연도를 비교하세요. 직장 기준점은 ${e(p.anchor.name)}입니다. 표시된 거리는 실제 단지 좌표로 계산한 직선거리이며 통근시간이 아닙니다. 당시 공개된 교통 단서가 있는 지역은 출처와 함께 표시합니다.`;tags=['업무지구 거리','과거 교통 정보','면적·연식'];}
  if(game.round===3){title='주변 신축과 현재 가격, 무엇을 더 볼까요?';body='2020년 당시 거래에서 관측된 최근 준공 단지 수와 지역 거래량을 살펴보세요. 이 지표는 신축 공급을 생각해보기 위한 단서이며 실제 입주 물량이 아닙니다. 낮은 매수가격과 입지의 강점을 함께 비교하고 최종 선택을 확정하세요.';tags=['신축 거래 관측','지역 거래량','전용㎡당 가격'];}
  return `<article class="insight-card"><div class="insight-top"><span>${game.round===0?'DECISION BRIEF':`CLUE 0${game.round} / ${stages[game.round]}`}</span><span>${game.round===0?'준비':`${game.round}/3`}</span></div><h3>${title}</h3><p>${body}</p>${h&&game.round===2?factsHtml(h,'transport')+factsHtml(h,'jobs'):''}${h&&game.round===3?factsHtml(h,'supply'):''}<div class="insight-tags">${tags.map(t=>`<span>${t}</span>`).join('')}</div></article>`;
}
function detailHtml(h){const p=game.persona,r=game.round,f=purchasing(p,h),d=distanceKm(h,p.anchor),stats=districtStats(h),isSelected=h.id===game.selectedId;
  return `<article class="candidate-detail"><div class="detail-kicker"><b>${h.label}</b><span>공식 실거래 자료</span></div><h2>${e(h.name)}</h2><div class="detail-address">${e(h.address||loc(h))}</div><div class="price-big">${money(h.past.priceWon)}<small>원</small></div><div class="price-label">2020년 1~9월 ${h.past.count}건의 중앙값<br>같은 단지 · 전용 ${h.areaM2.toFixed(2)}㎡</div><dl class="home-specs"><div><dt>전용면적</dt><dd>${h.areaM2.toFixed(2)}㎡ <small>(${(h.areaM2/3.3058).toFixed(1)}평)</small></dd></div><div><dt>준공연도</dt><dd>${h.builtYear}년 <small>당시 ${2020-h.builtYear}년차</small></dd></div>${r>=2?`<div><dt>${e(p.anchor.short)}까지 직선거리</dt><dd>${d.toFixed(1)}km</dd></div><div><dt>2020년 전용㎡당 가격</dt><dd>${nf.format(Math.round(h.past.priceWon/h.areaM2/1e4))}만 원</dd></div>`:''}${r>=3?`<div><dt>지역 과거 거래 관측</dt><dd>${nf.format(stats.transactionCount||0)}건</dd></div><div><dt>최근 준공·거래 관측 단지</dt><dd>${nf.format(stats.recentlyBuiltObservedComplexCount||0)}곳</dd></div>`:''}</dl>
  ${r>=1?`<div class="loan-summary ${f.canBuy?'':'unaffordable'}"><strong>${f.canBuy?'✓ 게임 예산으로 구매 가능':'! 게임 예산으로 구매 불가'}</strong><div class="loan-row"><span>선별된 대출 대안</span><b>${e(f.productName)}</b></div><div class="loan-row"><span>예상 최대 대출 한도</span><b>${money(f.loanWon)} 원</b></div><div class="loan-row"><span>부대비용·예비비 포함 필요 현금</span><b>${money(f.cashNeededWon)} 원</b></div><div class="loan-row"><span>${f.canBuy?'대출 후 자기자금 여유':'부족한 자기자금'}</span><b>${money(f.canBuy?f.surplusWon:f.gapWon)} 원</b></div>${f.canBuy?`<div class="loan-row"><span>필요액만 빌릴 때 월상환</span><b>${money(f.requiredMonthlyPaymentWon)} 원</b></div>`:''}<p>2020년 제도 참고 계산 · 실승인액과 다를 수 있음<br>부대비용 2%·생활예비비 500만 원은 게임 가정</p></div><button class="loan-link" data-action="loans" data-id="${e(h.id)}">상품별 자격·한도 계산 보기 ↗</button>`:'<div class="note">대출 조건은 첫 선택 후 공개됩니다. 자기자금과 가격을 먼저 비교해보세요.</div>'}
  ${r>=3?'<p class="fineprint" style="font-size:9px;margin:12px 0">신축 관측 단지: 2020년 거래에 나타난 2018~2020년 준공 단지 수. 전체 공급량·입주 예정 물량과 다릅니다.</p>':''}
  <div style="margin:12px 0"><button class="table-link" data-action="transactions" data-id="${e(h.id)}" data-period="past">2020년 거래 표본 보기</button></div>
  ${isSelected?`<div class="selection-status ${r>0&&!f.canBuy?'no':''}">✓ 현재 내가 선택한 집${r>0&&!f.canBuy?' · 예산 초과':''}</div>`:`<label class="reason-label" for="choice-reason">이 집을 선택하는 가장 큰 이유</label><select id="choice-reason" class="reason-select"><option value="">선택 이유를 골라주세요</option>${reasons.map(x=>`<option>${x}</option>`).join('')}</select><button class="select-button" data-action="choose" data-id="${e(h.id)}" ${r>0&&game.selectedId&&game.changesLeft===0?'disabled':''}>${!game.selectedId?'이 집으로 첫 선택':r===0?'이 집으로 선택 바꾸기':`이 집으로 변경하기 · 변경권 1회 사용`}</button>`}</article>`;
}
function initMap(){
  if(!window.L){$('#map').innerHTML='<div class="map-unavailable">지도를 불러오지 못했습니다.<br>아래 후보 카드에서 모든 집을 비교하고 선택할 수 있습니다.</div>';return;}
  map=L.map('map',{scrollWheelZoom:false,attributionControl:true});
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
  for(const h of game.homes){const f=game.round>0?purchasing(game.persona,h):null;const icon=L.divIcon({className:`house-marker ${h.id===game.selectedId?'selected':''} ${f&&!f.canBuy?'unaffordable':''}`,html:h.label,iconSize:[34,34],iconAnchor:[17,17]});const marker=L.marker([h.lat,h.lng],{icon,keyboard:true,title:`${h.label} ${h.name} ${money(h.past.priceWon)}원`}).addTo(map).bindTooltip(`${h.label} · ${e(h.name)}<br>${money(h.past.priceWon)} 원`,{direction:'top',offset:[0,-14]});marker.on('click',()=>viewHome(h.id));markers.set(h.id,marker);}
  const anchor=game.persona.anchor;L.marker([anchor.lat,anchor.lng],{icon:L.divIcon({className:'work-marker',html:'⌖ '+e(anchor.short)+' 직장',iconSize:[100,25],iconAnchor:[35,12]}),title:anchor.name}).addTo(map);
  if(mapView)map.setView(mapView.center,mapView.zoom);else map.fitBounds(L.latLngBounds([...game.homes.map(h=>[h.lat,h.lng]),[anchor.lat,anchor.lng]]).pad(.15),{maxZoom:11});
}
function viewHome(id){if(!game.homes.some(h=>h.id===id))return;game.viewedId=id;const scroll=window.scrollY;render();window.scrollTo({top:scroll});}
function resultsHtml(){
  const rows=ranking(game),mine=rows.find(h=>h.id===game.selectedId),best=rows.find(h=>h.financing.canBuy),possible=rows.filter(h=>h.financing.canBuy),f=mine.financing;
  const score=f.canBuy?(mine.id===best.id?100:Math.max(0,Math.round(100*(mine.returnPct-possible.at(-1).returnPct)/(best.returnPct-possible.at(-1).returnPct||1)))):0;
  const initial=game.homes.find(h=>h.id===game.history[0]?.id);
  return `<section class="results"><div class="results-heading"><div><div class="eyebrow">2026년 9월 / 실제 거래 결과</div><h1>당신의 선택은 ${f.canBuy?`${mine.rank}위였습니다.`:'예산을 넘었습니다.'}</h1><p>2020년의 판단이 실제 가격 변화와 어떻게 연결됐는지 살펴보세요.<br>조회일 ${e(dataset.meta.retrievedAt)} · 각 연도 1~9월 거래 표본 비교</p></div><button class="source-pill" data-action="sources">실거래 비교 기준 ↗</button></div>
  <div class="result-hero"><article class="result-score"><span class="overline">MY DECISION RESULT</span><div class="score-number">${f.canBuy?mine.rank:'—'}<small>${f.canBuy?'/ 5 구매 가능 후보':'구매 불가'}</small></div><h2>${f.canBuy?(mine.id===best.id?'살 수 있었던 최고의 집을 골랐어요.':`내 조건의 1위는 ${e(best.name)}였습니다.`):`자기자금 ${money(f.gapWon)}원이 부족합니다.`}</h2><p>${f.canBuy?`선택 성과 ${score}점 · 가능한 후보 안에서 상대 평가<br>내 선택 변화율 ${pct(mine.returnPct)} / 가능한 최고 ${pct(best.returnPct)}`:`전체 집값 변화 순위는 ${mine.marketRank}위였지만,<br>이 인물의 대출·자기자금으로 계약할 수 없었습니다.`}</p></article>
  <article class="result-price"><span class="overline">내 선택 ${mine.label} / ${e(loc(mine))}</span><h2>${e(mine.name)}</h2><p class="fineprint" style="margin:0">전용 ${mine.areaM2.toFixed(2)}㎡ · 동일 단지·면적의 두 기간 중앙값</p><div class="price-compare"><div><small>2020년 1~9월 · ${mine.past.count}건</small><strong>${money(mine.past.priceWon)} 원</strong></div><span>→</span><div><small>2026년 1~9월 · ${mine.recent.count}건</small><strong>${money(mine.recent.priceWon)} 원</strong></div></div><span class="return-badge ${mine.returnPct<0?'down':''}">${pct(mine.returnPct)}</span><p class="fineprint">매매 중앙값 변화 ${money(mine.recent.priceWon-mine.past.priceWon)} 원<br>가격 변화율이며 대출이자·보유세·매도 비용을 반영한 투자 수익률은 아닙니다.</p></article></div>
  <div class="pool-heading" style="margin-top:29px;margin-bottom:0"><h2>7개 후보의 실제 결과</h2><p>구매 가능 우선 → 가격 변화율 순위</p></div><div class="result-table-wrap"><table class="result-table"><thead><tr><th>게임 순위</th><th>단지 · 전용면적</th><th>2020년 가격</th><th>2026년 가격</th><th>가격 변화율</th><th>내 구매 가능성</th><th>실거래 표본</th></tr></thead><tbody>${rows.map(h=>`<tr class="${h.id===mine.id?'mine':h.id===best.id?'best':''}"><td><strong>${h.rank}위</strong><small>${h.id===mine.id?'내 선택':h.id===best.id?'내 조건의 최선':''}</small></td><td><strong>${h.label} · ${e(h.name)}</strong><small>${e(loc(h))} · ${h.areaM2.toFixed(2)}㎡</small></td><td>${money(h.past.priceWon)} 원<small>${h.past.count}건 중앙값</small></td><td>${money(h.recent.priceWon)} 원<small>${h.recent.count}건 중앙값</small></td><td class="${h.returnPct>=0?'up':'down'}"><strong>${pct(h.returnPct)}</strong><small>전체 가격 변화 ${h.marketRank}위</small></td><td><span class="status-tag ${h.financing.canBuy?'':'no'}">${h.financing.canBuy?'구매 가능':'자금 부족 '+money(h.financing.gapWon)+'원'}</span></td><td><button class="table-link" data-action="transactions" data-id="${e(h.id)}" data-period="both">거래 기록 보기</button></td></tr>`).join('')}</tbody></table></div>
  <div class="reflection"><article><h2>정보를 읽고, 어떻게 바꿨나요?</h2><ul class="history-list">${game.history.map(item=>{const h=game.homes.find(x=>x.id===item.id);return `<li><b>${item.action} · ${h?.label} ${e(h?.name)}</b><span>${stages[item.round]} 단계 / ${e(item.reason)}</span></li>`;}).join('')}</ul><p style="margin:15px 0 0">${initial&&initial.id!==mine.id?`처음 고른 집 ${initial.label}의 변화율은 ${pct(returnRate(initial))}, 최종 선택 ${mine.label}은 ${pct(mine.returnPct)}였습니다.`:'처음 선택을 유지했습니다. 당시 중요하게 본 단서와 결과를 함께 비교해보세요.'}</p></article><article><h2>결과를 읽는 세 가지 질문</h2><ul><li>대출 한도를 제한한 것은 주택가격, 소득, 면적, 상품 한도 중 무엇이었나요?</li><li>교통·업무지구 접근성, 주변 신축, 처음 가격 중 어떤 단서를 가장 중요하게 봤나요?</li><li>그 판단은 실제 결과와 맞았나요? 다른 지역에서도 같은 판단이 통할까요?</li></ul><p style="margin:15px 0 0">거래 결과만으로 가격 변화의 원인이나 각 요소의 기여도를 확정할 수는 없습니다. 이 실습은 당시 정보에 대한 판단을 실제 결과와 비교하는 과정입니다.</p></article></div>
  <div class="result-footer"><p>각 기간은 서로 다른 층·동·호수의 거래 표본입니다. 동일 주택을 되판 결과가 아니며 신고 지연·거래 취소로 자료가 바뀔 수 있습니다. 구매 불가 후보는 자금 부족 비율이 클수록 아래에 배치합니다.</p><div class="result-actions"><button class="secondary" data-action="export">결과 CSV 저장</button><button class="primary" data-action="reset">다른 인물로 다시 실습 <span>↺</span></button></div></div></section>`;
}
function timelinePriceLabel(home,year){
  const value=annualPrice(home,year,timelineOverrides);
  const observed=year===2020||year===2026;
  const edited=!!timelineOverrides?.[home.id]?.[year];
  return `<span class="annual-price-value ${observed?'observed':'estimated'}">${money(value)}<small>${observed?'실거래 중앙값':edited?'직접 입력':'모형 추정값'}</small></span>`;
}
function timelinePriceTable(){
  return `<div class="timeline-price-wrap"><table class="timeline-price-table"><thead><tr><th>후보 단지</th>${TIMELINE_YEARS.map(y=>`<th>${y}${y===2020||y===2026?'<small>실거래</small>':'<small>수정 가능</small>'}</th>`).join('')}<th>2020→2026 변화</th></tr></thead><tbody>${game.homes.map(h=>`<tr><th><b>${h.label} · ${e(h.name)}</b><small>${e(loc(h))} · ${h.areaM2.toFixed(2)}㎡</small></th>${TIMELINE_YEARS.map(y=>`<td>${y===2020||y===2026?timelinePriceLabel(h,y):`<label class="annual-price-edit"><span class="sr-only">${y}년 ${e(h.name)} 가격(원)</span><input type="number" min="1" step="1000000" class="annual-price-input" data-home-id="${e(h.id)}" data-price-year="${y}" value="${Math.round(annualPrice(h,y,timelineOverrides))}" aria-label="${y}년 ${e(h.name)} 가격(원)"><small>${timelineOverrides?.[h.id]?.[y]?'직접 입력':'모형 추정값'}</small></label>`}</td>`).join('')}<td class="${h.recent.priceWon>=h.past.priceWon?'up':'down'}"><strong>${pct((h.recent.priceWon/h.past.priceWon-1)*100)}</strong></td></tr>`).join('')}</tbody></table></div>`;
}
function timelineCandidateCards(){
  return `<div class="timeline-candidate-grid">${game.homes.map(h=>{
    const financing=purchasing(game.persona,h),stats=districtStats(h),distance=distanceKm(h,game.persona.anchor);
    return `<article class="timeline-candidate-card"><div class="detail-kicker"><b>${h.label}</b><span>국토교통부 실거래 표본</span></div><h3>${e(h.name)}</h3><p class="timeline-address">${e(loc(h))} · 전용 ${h.areaM2.toFixed(2)}㎡ · ${h.builtYear}년 준공</p><div class="timeline-endpoints"><div><small>2020년 중앙값</small><strong>${money(h.past.priceWon)}</strong></div><span>→</span><div><small>2026년 중앙값</small><strong>${money(h.recent.priceWon)}</strong></div></div><div class="timeline-return ${h.recent.priceWon>=h.past.priceWon?'up':'down'}">가격 변화 ${pct((h.recent.priceWon/h.past.priceWon-1)*100)}</div><dl class="timeline-facts"><div><dt>2020년 구매 판정</dt><dd>${financing.canBuy?'구매 가능':'자기자금 부족'}</dd></div><div><dt>2020년 예상 대출한도</dt><dd>${money(financing.loanWon)}원</dd></div><div><dt>필요 자기자금</dt><dd>${money(financing.cashNeededWon)}원</dd></div><div><dt>${e(game.persona.anchor.short)}까지 직선거리</dt><dd>${distance.toFixed(1)}km</dd></div><div><dt>지역 거래 관측</dt><dd>${nf.format(stats.transactionCount||0)}건</dd></div><div><dt>신축 관측 단지</dt><dd>${nf.format(stats.recentlyBuiltObservedComplexCount||0)}곳</dd></div></dl><div class="timeline-loan-foot"><button class="loan-link" data-action="loans" data-id="${e(h.id)}">대출 자격·한도 보기 ↗</button><button class="table-link" data-action="transactions" data-id="${e(h.id)}" data-period="both">2020·2026 거래 기록 ↗</button></div><details class="timeline-extra" open><summary>입지·교통·공급 단서 모두 보기</summary>${factsHtml(h,'transport')}${factsHtml(h,'jobs')}${factsHtml(h,'supply')}<p class="timeline-source"><a href="${safeUrl(h.sourceUrl)}" target="_blank" rel="noopener">국토교통부 거래자료 출처 ↗</a></p></details></article>`;
  }).join('')}</div>`;
}
function timelineChoicesHtml(){
  return `<div class="timeline-choice-grid">${TIMELINE_YEARS.map((year,index)=>{
    const value=timelineChoices[year]??(year===2020?'':'keep');
    const options=year===2020
      ? `<option value="">2020년 첫 선택</option><option value="rent">무주택으로 시작</option>${game.homes.map(h=>`<option value="buy:${e(h.id)}">${h.label} · ${e(h.name)} 매수</option>`).join('')}`
      : `<option value="keep">현재 상태 유지</option><option value="sell">매도 후 무주택(또는 무주택 유지)</option>${game.homes.map(h=>`<option value="buy:${e(h.id)}">${h.label} · ${e(h.name)} 매수/갈아타기</option>`).join('')}`;
    return `<article class="timeline-year-choice"><div class="timeline-year-number"><b>${year}</b><span>${index===0?'첫 매수·무주택':index===6?'최종 상태':'유지·매도·갈아타기'}</span></div><label for="timeline-choice-${year}">이 해의 선택</label><select id="timeline-choice-${year}" class="timeline-choice-select" data-timeline-year="${year}">${options}</select><p>${index===0?'처음 보유할 집을 고르거나 무주택으로 시작합니다.':`${year}년 가격과 누적 자산을 보고 선택하세요.`}</p></article>`;
  }).join('')}</div>`;
}
function syncTimelineControls(){
  for(const year of TIMELINE_YEARS){const el=$(`[data-timeline-year="${year}"]`);if(el)el.value=timelineChoices[year]??(year===2020?'':'keep');}
  const saving=$('#timeline-saving-rate');if(saving)saving.value=String(timelineSavingRate);
  document.querySelectorAll('.annual-price-input').forEach(input=>{const id=input.dataset.homeId,year=Number(input.dataset.priceYear);if(timelineOverrides?.[id]?.[year])input.value=String(timelineOverrides[id][year]);});
}
function timelineProfileHtml(){
  const p=game.persona;
  return `<article class="profile-mini timeline-profile"><div class="avatar">${e(p.name.slice(1))}</div><h2>${e(p.name)} · ${p.age}세</h2><p>${e(p.job)}<br>${e(household(p))}</p>${metric(p.married?'부부 합산 연소득':'연소득',money(p.annualIncomeWon)+'<small> 원</small>')}${metric('처음 보유 현금',money(p.cashWon)+'<small> 원</small>')}${metric('기존 대출 연간 원리금',money(p.existingAnnualDebtWon)+'<small> 원</small>')}${metric('직장 생활권',e(p.anchor.short)+' 업무지구',true)}</article>`;
}
function timelineResultsHtml(){
  if(!timelineResult)return '';
  const result=timelineResult,rows=result.records;
  const first=rows[0],last=rows[rows.length-1];
  const moneySigned=n=>(n<0?'-':'')+money(Math.abs(n));
  const maxAbs=Math.max(1,...rows.map(r=>Math.abs(r.netWorthWon)));
  const chart= `<div class="timeline-net-chart" role="img" aria-label="연도별 순자산 변화 막대그래프">${rows.map(r=>`<div class="timeline-net-bar-wrap"><span>${moneySigned(r.netWorthWon)}</span><div class="timeline-net-bar ${r.netWorthWon<0?'negative':''}" style="height:${Math.max(3,Math.abs(r.netWorthWon)/maxAbs*100)}%"></div><b>${r.year}</b></div>`).join('')}</div>`;
  return `<section id="timeline-results" class="timeline-results"><div class="pool-heading"><h2>선택 경로 계산 결과</h2><p>2020년 시작 → 2026년 최종 상태</p></div><div class="result-hero timeline-result-hero"><article class="result-score"><span class="overline">2020→2026 NET ASSET CHANGE</span><div class="score-number">${result.changeWon<0?'-':''}${money(Math.abs(result.changeWon))}</div><h2>${last.homeName?`2026년 보유 주택: ${e(last.homeLabel)} · ${e(last.homeName)}`:'2026년 최종 상태: 무주택'}</h2><p>최종 순자산 ${moneySigned(last.netWorthWon)}원<br>처음 순자산 ${moneySigned(first.netWorthWon)}원 · 연 저축률 ${result.savingsRatePercent}% 가정</p></article><article class="result-price"><span class="overline">YEAR-BY-YEAR TRACK</span><h2>연도별 순자산 변화</h2><p class="fineprint">현금 + 보유주택 추정가 − 남은 주담대</p>${chart}<p class="fineprint">급여저축·단순 원리금 상환 반영. 임대료·세금·수선비·물가·소득 증가 등은 제외했습니다.</p></article></div><div class="result-table-wrap"><table class="result-table timeline-result-table"><thead><tr><th>연도</th><th>선택</th><th>연말 보유주택</th><th>주택가격</th><th>현금 잔액</th><th>대출 잔액</th><th>순자산</th><th>결과</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${r.year}</strong></td><td>${e(r.decision)}</td><td>${r.homeName?`${e(r.homeLabel)} · ${e(r.homeName)}`:'무주택'}</td><td>${money(r.homeValueWon)}원</td><td class="${r.cashWon<0?'down':''}">${moneySigned(r.cashWon)}원</td><td>${money(r.mortgageBalanceWon)}원</td><td><strong>${moneySigned(r.netWorthWon)}원</strong></td><td>${e(r.actionStatus)}</td></tr>`).join('')}</tbody></table></div><div class="reflection timeline-reflection"><article><h2>나의 갈아타기 경로</h2><ul class="history-list">${rows.map(r=>`<li><b>${r.year}년 · ${e(r.actionStatus)}</b><span>${r.homeName?`${e(r.homeLabel)} · ${e(r.homeName)} / 주택 ${money(r.homeValueWon)}원`:'무주택'} · 순자산 ${moneySigned(r.netWorthWon)}원</span></li>`).join('')}</ul></article><article><h2>결과를 읽는 질문</h2><ul><li>언제 집을 갈아타거나 계속 보유한 선택이 순자산에 가장 큰 영향을 줬나요?</li><li>매수 가능 여부와 월 상환 부담이 선택을 바꾸었나요?</li><li>중간 연도의 가격을 실제 연도별 실거래값으로 교체하면 결과가 얼마나 달라질까요?</li></ul><p>이 결과는 정해진 저축률과 매매비용·대출 가정으로 계산한 수업용 시나리오이며, 실제 투자수익이나 대출승인을 뜻하지 않습니다.</p></article></div><div class="result-footer"><p>거래비용은 매수·매도 각각 가격의 2%로 단순 가정합니다. 대출한도는 기존 2020년 참고 모형을 매년 동일하게 적용하며, 해마다 바뀐 정책을 재현하지 않습니다. 2021~2025년 가격은 초기 추정값 또는 사용자가 입력한 값입니다.</p><div class="result-actions"><button class="secondary" data-action="clear-timeline-results">선택 수정하기</button><button class="primary" data-action="back-timeline-top">연도별 선택으로 <span>↑</span></button></div></div></section>`;
}
function timelineHtml(){
  const p=game.persona;
  return `<section class="workspace timeline-workspace"><div class="room-top timeline-room-top"><div><div class="eyebrow">YEAR-BY-YEAR HOUSING JOURNEY</div><h1>2020년부터 2026년까지,<br>매년 다시 결정합니다.</h1><p>기존 단계형 실습은 그대로 두고 추가한 연도별 모드입니다. 모든 단지 정보와 모든 연도 가격을 먼저 확인한 뒤, 유지·매도·갈아타기 경로를 직접 정해보세요.</p></div><button class="secondary timeline-back" data-action="back-intro">기존 실습으로 돌아가기</button></div><div class="timeline-profile-row">${timelineProfileHtml()}<article class="timeline-assumption-card"><span class="overline">READ ALL THE CLUES FIRST</span><h2>정보를 한 번에 공개합니다.</h2><p>후보 7곳의 가격 변화, 대출 가능성, 입지·교통·공급 단서를 모두 확인할 수 있습니다. 연도별 선택은 미리 입력해도 되고, 결과를 보며 수정해도 됩니다.</p><div class="insight-tags"><span>2020–2026</span><span>7개 단지</span><span>연도별 선택</span><span>유지·갈아타기</span></div></article></div><section class="timeline-section"><div class="pool-heading"><h2>1. 후보 7곳 · 연도별 가격을 한눈에</h2><p>2020·2026 실거래 + 중간 연도 수정값</p></div><div class="timeline-disclaimer"><strong>가격 데이터 구분</strong><p>2020년과 2026년은 원본에 포함된 실제 실거래 중앙값입니다. 원본 데이터에는 2021~2025년의 단지별 연간 중앙값이 없으므로, 중간 연도는 추정값으로 시작합니다. 아래 숫자 입력란에 조사한 연간 실거래 중앙값을 넣으면 그 값으로 경로를 계산합니다.</p></div>${timelinePriceTable()}</section><section class="timeline-section"><div class="pool-heading"><h2>2. 후보별 대출·입지·공급 정보</h2><p>기존 단계별 단서 모두 공개</p></div>${timelineCandidateCards()}</section><section class="timeline-section timeline-choice-section"><div class="pool-heading"><h2>3. 2020년부터 해마다 어떤 선택을 할까요?</h2><p>각 연도의 선택을 한 번에 입력</p></div><p class="timeline-help">2020년에 첫 집 또는 무주택을 정하고, 이후 각 연도마다 현재 상태 유지·매도·다른 집으로 갈아타기를 선택하세요. 선택이 자금상 불가능하면 거래는 실행되지 않고 기존 상태가 유지됩니다.</p><div class="timeline-saving-setting"><label for="timeline-saving-rate">연소득 중 매년 저축 비율 (%)</label><input id="timeline-saving-rate" type="number" min="0" max="100" step="5" value="${timelineSavingRate}"><span>기본 ${timelineSavingRate}% · 저축액에서 대출 원리금을 차감</span></div>${timelineChoicesHtml()}<div class="round-bottom timeline-run-row"><p>모든 연도의 선택을 정한 뒤 계산하세요.<br>연도별 현금·대출 잔액·보유주택·순자산을 이어서 계산합니다.</p><button class="primary orange" data-action="run-timeline">선택 경로 시뮬레이션 <span>→</span></button></div></section>${timelineResultsHtml()}</section>`;
}
function startTimeline(){
  game=createGame(persona,dataset.homes);
  game.viewedId=null;game.selectedId=null;game.round=0;game.history=[];
  timelineChoices=Object.fromEntries(TIMELINE_YEARS.map(y=>[y,y===2020?'': 'keep']));
  timelineOverrides={};timelineResult=null;timelineSavingRate=25;screen='timeline';render();window.scrollTo({top:0,behavior:'smooth'});
}
function captureTimelineInputs(){
  document.querySelectorAll('[data-timeline-year]').forEach(input=>{timelineChoices[Number(input.dataset.timelineYear)]=input.value;});
  document.querySelectorAll('.annual-price-input').forEach(input=>{
    const homeId=input.dataset.homeId,year=Number(input.dataset.priceYear),value=Number(input.value);
    if(!homeId)return;
    if(input.value.trim()===''){if(timelineOverrides[homeId])delete timelineOverrides[homeId][year];}
    else if(Number.isFinite(value)&&value>0){timelineOverrides[homeId]??={};timelineOverrides[homeId][year]=Math.round(value);}
  });
  const rateInput=$('#timeline-saving-rate');
  if(rateInput&&Number.isFinite(Number(rateInput.value)))timelineSavingRate=Math.min(100,Math.max(0,Number(rateInput.value)));
}
function runTimeline(){
  captureTimelineInputs();
  if(!timelineChoices[2020]){toast('2020년 첫 선택을 먼저 지정하세요.');return;}
  timelineResult=simulateAnnualJourney({persona:game.persona,homes:game.homes,choices:timelineChoices,overrides:timelineOverrides,savingsRatePercent:timelineSavingRate});
  render();setTimeout(()=>$('#timeline-results')?.scrollIntoView({behavior:'smooth',block:'start'}),50);
}

function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
function openDialog(label,html){$('#dialog-label').textContent=label;$('#dialog-content').innerHTML=html;if(!$('#dialog').open)$('#dialog').showModal();}
function showSources(){const m=dataset?.meta||{};const src=m.sources||[];openDialog('DATA & MODEL / 데이터와 계산 기준',`<h2>실거래는 실제 자료,<br>인물과 대출 계산은 실습 조건입니다.</h2><p>의사결정 시점은 2020.09.30, 비교 결과는 2026년 1~9월 실제 거래입니다. ‘현재 가격’은 오늘의 호가가 아니라 확인된 거래 표본의 중앙값입니다.</p><div class="method-callout"><p style="margin:0">자료 조회 ${e(m.retrievedAt||'2026-10-10')}<br>원자료 ${nf.format(m.rawTransactionCount||0)}행 → 비교 후보 ${nf.format(dataset?.homes.length||0)}단지<br>가격 변화율 = (2026년 중앙값 ÷ 2020년 중앙값 − 1) × 100</p></div><h3>실거래 표본</h3><ul>${(m.methodNotes||[]).map(n=>`<li>${e(n)}</li>`).join('')}<li>동일 단지·전용면적에서 두 기간 각각 5건 이상 거래가 있는 후보를 사용합니다.</li><li>당시 존재했던 단지 중 두 기간 모두 거래가 있는 표본만 선택되어 표본 선택 편향이 있습니다.</li><li>같은 단지여도 층·향·동·상태가 다를 수 있습니다. 동일 세대의 반복매매 수익률이 아닙니다.</li><li>지역명은 자료제공 시점 행정구역 기준입니다. 지도 배경은 현재 지도입니다.</li></ul><h3>대출 계산 가정</h3><ul>${modelNotes.map(n=>`<li>${e(n)}</li>`).join('')}<li>가상 인물의 기존 대출 이자는 연간 원리금의 20%로 가정했습니다. 직장 기준점은 업무지구의 대표 좌표이며 경로·통근시간을 계산하지 않습니다.</li></ul><h3>공식 출처</h3><ul>${src.map(s=>`<li><a href="${safeUrl(s.url||s.sourceUrl)}" target="_blank" rel="noopener">${e(s.title||s.name||'국토교통부 실거래가 공개시스템')}</a></li>`).join('')}${loanSources.map(s=>`<li><a href="${safeUrl(s.url)}" target="_blank" rel="noopener">${e(s.title)}</a></li>`).join('')}</ul><h3>교통·공급 단서</h3><p>2020년 9월 이전 공식 발표·개통 자료만 의사결정 단계에 공개합니다. 신축 관측 단지 수는 거래 표본에서 관측된 2018~2020년 준공 단지 수로, 실제 공급량·입주 예정 물량과 다릅니다.</p>`);}
function showGuide(){openDialog('CLASSROOM GUIDE / 진행 가이드',`<h2>한 번의 선택을,<br>세 번의 정보로 다시 판단하세요.</h2><p>실습 목표는 ‘이 인물의 예산으로 살 수 있는 집 중 실제 가격 변화율이 가장 큰 후보’를 고르는 것입니다.</p><table><tr><th>진행</th><th>권장 시간</th><th>할 일</th></tr><tr><td>인물 추첨</td><td>2분</td><td>소득·현금·기존 대출을 읽고 인물 확정</td></tr><tr><td>첫 선택</td><td>4분</td><td>지도와 7개 단지를 비교하고 이유 선택</td></tr><tr><td>대출 단서</td><td>4분</td><td>상품 자격·LTV·DTI·월상환액 확인</td></tr><tr><td>입지·교통</td><td>4분</td><td>업무지구 접근성·과거 교통 정보 비교</td></tr><tr><td>공급·가격</td><td>4분</td><td>주변 신축 관측·거래량·단위면적 가격 비교</td></tr><tr><td>실제 결과와 토론</td><td>5분</td><td>순위·가격 변화·선택 이력 비교</td></tr></table><h3>변경권 규칙</h3><p>첫 선택 단계는 자유롭게 수정할 수 있습니다. 대출 조건 공개 이후에는 총 2회 변경할 수 있습니다. 선택을 유지하면 변경권이 소모되지 않습니다. 모든 단서를 확인한 뒤 최종 결과를 공개합니다.</p><h3>순위 규칙</h3><p>구매 가능한 5개 후보를 가격 변화율 순으로 먼저 배치합니다. 예산을 넘는 후보 2개는 뒤에 배치하며 부족 자금 ÷ 과거 집값 비율이 클수록 아래 순위입니다. 전체 7개 후보의 가격 변화 순위도 따로 보여줍니다.</p><h3>진행자 토론 질문</h3><p>“왜 그 집을 골랐나요?” “어떤 정보 때문에 바꿨나요?” “대출 한도가 달랐다면 결과도 달라졌을까요?”<br>인물·후보가 다르므로 다른 사람과 점수를 겨루기보다는 각자의 가능한 최선과 비교하세요.</p>`);}
function showLoans(h){const opts=calcLoanOptions(game.persona,h),f=purchasing(game.persona,h);openDialog('LOAN BRIEF / 2020년 제도 참고',`<h2>${e(h.name)}의<br>대출 대안을 비교하세요.</h2><p>과거 가격 ${money(h.past.priceWon)}원 · 자기자금 ${money(game.persona.cashWon)}원<br>각 상품은 대안입니다. 한도를 합산하지 않습니다.</p>${opts.map(o=>`<article class="loan-option"><h3>${e(o.name)} <span class="status-tag ${o.eligible?'':'no'}">${o.eligible?'게임 자격 충족':'조건 미충족'}</span></h3><strong>${o.eligible?money(o.limitWon)+' 원':'—'}</strong><div class="limits">${o.eligible?`한도 전액 대출 시 월상환 ${money(o.monthlyPaymentWon)}원 · 연 ${(o.rate*100).toFixed(2)}%<br>LTV ${(o.ltv*100).toFixed(0)}% → ${money(o.ltvLimitWon)}원 / 소득·상환 한도 ${money(o.incomeLimitWon)}원<br>한도 전액 실행 시 DTI ${(o.dtiRatio*100).toFixed(1)}% / 전체 부채 DSR ${(o.dsrRatio*100).toFixed(1)}%`:''}</div><p>${e(o.bindingConstraint||'')}${o.reasons?.length?'<br>'+o.reasons.map(e).join('<br>'):''}${o.eligibilityNotes?.length?'<br>'+o.eligibilityNotes.map(e).join('<br>'):''}</p>${o.assumption?`<p>${e(o.assumption)}</p>`:''}</article>`).join('')}<div class="method-callout"><p style="margin:0">예상 최대 한도 ${money(f.loanWon)}원<br>필요 자기자금 = 집값 + 부대비용 2% + 예비비 500만 원 − 대출 한도<br>이 집의 필요 자기자금 ${money(f.cashNeededWon)}원<br>${f.canBuy?'게임 예산 안에 있습니다.':'자기자금 '+money(f.gapWon)+'원이 부족합니다.'}</p></div><p>LTV는 집값 대비 대출 비율, DTI는 주택대출 원리금·기타대출 이자 대비 소득, DSR은 전체 대출 원리금 대비 소득입니다. 정책대출은 DTI로 한도를 선별하며 DSR은 학습 지표로 보여줍니다.</p><p>실승인액은 담보평가·신용심사·지역 규제·기타 조건에 따라 달라집니다. 일반은행 옵션의 LTV 40%·상환여력 40%·연 3%는 게임의 비교 가정입니다.</p>`);}
function showTransactions(h,period){if(period==='both'&&!['results','timeline'].includes(screen))period='past';const periods=period==='both'?['past','recent']:[period];openDialog('TRANSACTION EVIDENCE / 실거래 표본',`<h2>${e(h.name)}<br><span style="font-size:14px;font-weight:400">전용 ${h.areaM2.toFixed(2)}㎡ · ${e(loc(h))}</span></h2><p>표시 가격은 확인된 거래 표본의 중앙값입니다. 아래는 해당 표본 중 일부 거래이며 전체 집계 거래 수와 다를 수 있습니다.</p>${periods.map(k=>{const d=h[k],rows=d.records||d.rows||[];return `<h3>${k==='past'?'2020년':'2026년'} 1~9월 · ${d.count}건</h3><p>중앙값 <strong>${won(d.priceWon)}</strong></p><table><thead><tr><th>계약일</th><th>전용면적</th><th>층</th><th>거래금액</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${e(x.date)}</td><td>${Number(x.areaM2).toFixed(2)}㎡</td><td>${e(x.floor)}층</td><td>${won(x.amountWon)}</td></tr>`).join('')}</tbody></table>`;}).join('')}<p style="margin-top:22px"><a href="${safeUrl(h.sourceUrl)}" target="_blank" rel="noopener">국토교통부 실거래가 공개시스템에서 확인 ↗</a><br>${e(h.comparisonNote||'동일 단지·전용면적의 기간별 거래 중앙값 비교')}</p>`);}
function nextRound(){if(!game.selectedId){toast('먼저 집을 선택하세요.');return;}if(game.round<3){game.round++;render();window.scrollTo({top:0,behavior:'smooth'});}else{screen='results';render();window.scrollTo({top:0,behavior:'smooth'});}}
function reset(){screen='intro';game=null;mapView=null;timelineChoices={};timelineOverrides={};timelineResult=null;timelineSavingRate=25;persona=createPersona(dataset.homes);render();window.scrollTo({top:0,behavior:'smooth'});}
function exportCsv(){const quote=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const rows=ranking(game);const headers=['게임순위','후보','단지','지역','전용면적㎡','2020중앙값원','2020표본수','2026중앙값원','2026표본수','가격변화율%','구매가능','부족자금원','전체가격변화순위','내선택','출처'];const lines=[headers, ...rows.map(h=>[h.rank,h.label,h.name,loc(h),h.areaM2,h.past.priceWon,h.past.count,h.recent.priceWon,h.recent.count,h.returnPct.toFixed(4),h.financing.canBuy?'가능':'불가',h.financing.gapWon,h.marketRank,h.id===game.selectedId?'선택':'',h.sourceUrl])].map(row=>row.map(quote).join(','));const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`집의시간_${game.persona.name}_실습결과.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);toast('7개 후보의 실거래 비교 결과를 저장했습니다.');}

document.addEventListener('click',event=>{
  const btn=event.target.closest('[data-action]');if(!btn||btn.disabled)return;
  const action=btn.dataset.action,id=btn.dataset.id;
  try{
    if(action==='close-dialog')$('#dialog').close();
    else if(action==='sources')showSources();
    else if(action==='guide')showGuide();
    else if(action==='reload')location.reload();
    else if(action==='reroll'){persona=createPersona(dataset.homes);render();toast('새 인물을 뽑았습니다.');}
    else if(action==='start'){game=createGame(persona,dataset.homes);screen='room';mapView=null;render();window.scrollTo({top:0,behavior:'smooth'});}
    else if(action==='start-timeline')startTimeline();
    else if(action==='back-intro'){screen='intro';render();window.scrollTo({top:0,behavior:'smooth'});}
    else if(action==='run-timeline')runTimeline();
    else if(action==='clear-timeline-results'){timelineResult=null;$('#timeline-results')?.remove();$('.timeline-choice-section')?.scrollIntoView({behavior:'smooth',block:'start'});toast('선택을 수정한 뒤 다시 계산하세요.');}
    else if(action==='back-timeline-top'){$('.timeline-choice-section')?.scrollIntoView({behavior:'smooth',block:'start'});}
    else if(action==='view')viewHome(id);
    else if(action==='choose'){const result=choose(game,id,$('#choice-reason')?.value);if(result.ok){render();toast(game.round===0?'첫 선택을 기록했습니다.':`선택을 바꿨습니다. 변경권 ${game.changesLeft}회 남음.`);}else toast(result.message);}
    else if(action==='next')nextRound();
    else if(action==='loans')showLoans(game.homes.find(h=>h.id===id));
    else if(action==='transactions')showTransactions(game.homes.find(h=>h.id===id),btn.dataset.period);
    else if(action==='reset-prompt')openDialog('처음부터 다시 시작',`<h2>다른 인물로 다시 시작할까요?</h2><p>현재 선택 이력은 새 실습으로 대체됩니다.</p><button class="primary full" data-action="confirm-reset">새 인물 뽑고 다시 시작 <span>↺</span></button>`);
    else if(action==='confirm-reset'){$('#dialog').close();reset();}
    else if(action==='reset')reset();
    else if(action==='export')exportCsv();
  }catch(error){toast('진행 중 문제가 생겼습니다. '+error.message);}
});
document.addEventListener('change',event=>{
  const target=event.target;
  if(target.matches('[data-timeline-year]'))timelineChoices[Number(target.dataset.timelineYear)]=target.value;
  if(target.matches('.annual-price-input')){
    const id=target.dataset.homeId,year=Number(target.dataset.priceYear),value=Number(target.value);
    if(id&&target.value.trim()===''){if(timelineOverrides[id])delete timelineOverrides[id][year];}
    else if(id&&Number.isFinite(value)&&value>0){timelineOverrides[id]??={};timelineOverrides[id][year]=Math.round(value);}
  }
  if(target.matches('[data-timeline-year],.annual-price-input,#timeline-saving-rate')){
    if(target.id==='timeline-saving-rate'&&Number.isFinite(Number(target.value)))timelineSavingRate=Math.min(100,Math.max(0,Number(target.value)));
    timelineResult=null;$('#timeline-results')?.remove();
  }
});
$('#dialog').addEventListener('click',event=>{if(event.target===$('#dialog')){const r=$('#dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)$('#dialog').close();}});
boot();
