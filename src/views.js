/**
 * 화면 템플릿
 * 게임 소개, 뉴스, 매물 카드, 지도 상세, 결과 분석 HTML을 생성한다.
 */
// 순수 화면 출력 함수입니다. 화면을 바꿀 때는 우선 여기서 수정합니다.
// HTML 템플릿의 역슬래시(\) 줄바꿈은 렌더링 문자열을 바꾸지 않는 줄 연속 표기입니다.


function basisEvidenceHtml(h) {
  const peers = peerSummary(h), reg = regionMeasures(h, session.year), now = yearData(), last = story.years[String(Math.max(2020, session.year - 1))].regionalStats[regionKey(h)];
  const diff = (a, b) => b ? (a - b) / b * 100 : 0;
  return `<div class="evidence-block">\
<div class="evidence-head">\
<b>매물 비교 정보</b>\
</div>
 <div class="evidence-grid">
  <div>\
<small>실제 · 2020년 거래 표본</small>\
<b>${h.tradeCount}건</b>\
</div>
  <div>\
<small>실제 출발가 · 2020년 1~9월</small>\
<b>${won(h.basePrice)}</b>\
</div>
  <div>\
<small>참고 · 표본 내 유사 면적 중앙값</small>\
<b>${won(peers.median)}</b>\
<em>${peers.scope} · ${peers.count}개 표본</em>\
</div>
  <div>\
<small>가상 · ${regionKey(h)} 지역 매매거래 변화</small>\
<b>${session.year === 2020 ? '시작 연도' : pct(diff(reg.transactions, last.transactions))}</b>\
<em>광역단위 월간 거래</em>\
</div>
  <div>\
<small>가상 · ${regionKey(h)} 지역 준공물량</small>\
<b>${KR.format(reg.completions)}호</b>\
<em>시도 단위 향후 12개월 공급 전망</em>\
</div>
  <div>\
<small>가상 · ${regionKey(h)} 지역 미분양</small>\
<b>${KR.format(reg.unsold)}호</b>\
<em>최근 발표된 시도 단위 가상 값</em>\
</div>
 </div>\
</div>`;
}

function introHtml() {
 return `<section class="intro-wrap"><div class="intro-hero"><span class="eyebrow">7라운드 주택 선택 게임</span><h1>내 예산으로 집을 골라볼까?</h1><p>구매력·수요·공급을 살피고, 가격 흐름과 거래 사례를 비교하세요. 미래 가격은 다음 라운드에 공개됩니다.</p></div>
 <div class="game-rules"><b>오늘의 미션</b><ol><li>내 구매력과 입주예정 물량 살펴보기</li><li>가격 흐름·거래 사례를 비교하고 선택하기</li><li>선택 이유를 남기고 다음 라운드 결과 확인하기</li></ol><p>돈을 많이 버는 것과 함께, 선택의 이유와 감당할 수 있는 예산을 생각해 보세요.</p></div>
 <div class="intro-left"><h2>시작 조건을 골라주세요</h2><div class="profile-choices">${personalities.map(p=>`<button data-profile="${p.id}" class="profile-opt ${session?.profile?.id===p.id||!session&&p===personalities[0]?'active':''}"><span class="persona-choice-head">${personaIcon(p)}<strong>${safe(p.name)} <small>${p.age}세</small></strong></span><span class="persona-job">${safe(p.job)}</span><span class="persona-tag">${safe(p.tag)}</span><span class="profile-finance">현금 ${briefWon(p.cash)} · 연소득 ${briefWon(p.income)}</span><em>${p.desc}</em></button>`).join('')}</div><button class="main-button" data-action="start">게임 시작 →</button></div><p class="simulation-note">실제 아파트의 위치·2020년 가격 표본을 출발점으로 삼는 수업용 가상 게임입니다. 이후 가격은 단순화한 규칙으로 움직입니다.</p></section>`;
}

function topHtml() {
  const y = session.year, d = yearData(), h = byId(session.houseId);
  return `<div class="game-top">\
<div class="top-title">\
<div class="top-left">\
<span class="eyebrow">실제 지도 × 가상 경제</span>\
<strong>${y}년 <span>매매 의사결정</span>\
</strong>\
<small>${d.phase} · 시나리오 시장</small>\
</div>\
<div class="yearline">${[2020, 2021, 2022, 2023, 2024, 2025, 2026].map(a => `<span class="yr ${a === y ? 'here' : a < y ? 'passed' : ''}">${a}</span>`).join('')}</div>\
</div>\
<div class="persona-banner">${personaIcon(session.profile)}<div><span class="eyebrow">내가 선택한 인물</span><h2>${safe(session.profile.name)} <span>${session.profile.age+y-2020}세</span></h2><p>${safe(session.profile.job)}</p></div><span class="persona-tag">${safe(session.profile.tag)}</span></div>\
<div class="asset-summary" aria-label="내 자산 요약">\
<div>\
<small>현금</small>\
<b>${briefWon(session.cash)}</b>\
</div>\
<div>\
<small>대출 잔액</small>\
<b>${briefWon(session.loan)}</b>\
</div>\
<div class="net-worth">\
<small>순자산</small>\
<b>${briefWon(assets())}</b>\
</div>\
</div>\
<div class="account-details">\
<span>가구 연소득 <b>${briefWon(currentIncome())}</b></span>\
<span>보유 주택 <b>${h ? safe(h.name) : '무주택'}</b></span>\
<span>진행 <b>${y - 2019}/7년</b></span>\
</div>\
</div>`;
}

function indCard(title, value, comparison, tip) {
  return `<div class="metric-card">\
<small>${title} <i>시나리오</i>\
</small>\
<b>${value}</b>\
<span>${comparison}</span>\
<em>${tip}</em>\
</div>`;
}

function neighborhoodWatchHtml() {
  const open = scenarioProjects.filter(p => p.notice <= session.year);
  const newly = open.filter(p => p.notice === session.year);
  const prior = open.filter(p => p.notice < session.year);
  return `<section class="v8-project-news">\
<div>\
<b>생활권 개발·공급 뉴스</b>\
<small>향후 결과는 비공개</small>\
</div>\
<div class="v8-project-news-cards">${[...newly, ...prior.slice(-3)].map(p => `<details class="news-detail project-detail" data-news-key="${session.year}:project-${safe(p.id)}" ${newsIsOpen(`project-${p.id}`) ? 'open' : ''}>\
<summary>\
<span>${p.notice === session.year ? '올해 새 소식' : '진행 중'} · ${safe(p.kind)}</span>\
<strong>${safe(p.title)}</strong>\
</summary>\
<div class="news-detail-body"><p>${safe(p.hint)}</p></div>\
</details>`).join('')}</div>\
</section>`;
}

function newsHtml() {
 const d=yearData(),prior=story.years[String(Math.max(2020,session.year-1))],policy=d.news.find(n=>n.category==='정책');
 return `<section class="news-section"><section class="policy-brief compact-policy" id="annual-policy" aria-labelledby="policy-title"><div class="policy-title"><span>올해 정책</span><h3 id="policy-title">${session.year}년 금리·대출</h3><b class="data-label">가상 시나리오</b></div><div class="policy-inline"><span>대출금리 <b>${d.rate.toFixed(1)}%</b>${session.year>2020?` <small>(작년 ${prior.rate.toFixed(1)}%)</small>`:''}</span><span>집값 대비 최대 대출 <b>${Math.round(d.ltv*100)}%</b>${session.year>2020?` <small>(작년 ${Math.round(prior.ltv*100)}%)</small>`:''}</span></div>${policy?`<p class="policy-headline">${safe(policy.headline)}</p>`:''}<label class="policy-check"><input type="checkbox" id="policy-read" ${classroomUI.policyRead?.[session.year]?'checked':''}> 올해 금리와 대출 한도를 확인했어요</label><details class="policy-extra"><summary>정책 설명과 배운 내용 다시 보기</summary>${policy?`<p>${safe(policy.context)}</p>`:''}<p>구매력은 소득·대출 규제·금리에 따라 달라져요. 직장·교통·생활환경에 따른 수요와 실제 입주 시점의 공급도 함께 살펴보세요.</p><p>한 가지 정책만으로 집값 방향을 단정하지 말고, 관심 매물의 가격 흐름과 거래 사례를 비교해 보세요.</p></details></section></section>`;
}

function getMatches() {
  let l = listings.filter(h => {
    if (filter.region !== '전체' && regionKey(h) !== filter.region) return false;
    if (filter.type !== '전체' && h.type !== filter.type) return false;
    const price = valueAt(h, session.year);
    if (filter.budget === '4억 미만' && price >= 4e8) return false;
    if (filter.budget === '4~7억' && (price < 4e8 || price >= 7e8)) return false;
    if (filter.budget === '7~10억' && (price < 7e8 || price >= 10e8)) return false;
    if (filter.budget === '10억 이상' && price < 10e8) return false;
    if (filter.area === '60㎡ 미만' && h.area >= 60) return false;
    if (filter.area === '60~85㎡' && (h.area < 60 || h.area >= 85)) return false;
    if (filter.area === '85㎡ 이상' && h.area < 85) return false;
    const q = filter.query.replace(/\s+/g, '').toLowerCase();
    if (q && !`${h.name}${h.district}${h.dong}${h.region}`.replace(/\s+/g, '').toLowerCase().includes(q)) return false;
    return true;
  });
  if (filter.view === 'map' && map) {
    const bounds = map.getBounds().pad(.04);
    l = l.filter(h => bounds.contains([h.lat, h.lng]));
  }
  const s = filter.sort;
  if (s === 'price') l.sort((a, b) => valueAt(a, session.year) - valueAt(b, session.year));
  if (s === 'high') l.sort((a, b) => valueAt(b, session.year) - valueAt(a, session.year));
  if (s === 'area') l.sort((a, b) => b.area - a.area);
  if (s === 'new') l.sort((a, b) => b.built - a.built);
  if (s === 'rise') l.sort((a, b) => (session.year > 2020 ? breakdown(b, session.year).total - breakdown(a, session.year).total : b.tradeCount - a.tradeCount));
  return l;
}

const options = (items, v) => items.map(a => `<option value="${safe(a)}" ${a === v ? 'selected' : ''}>${safe(a)}</option>`).join('');

function marketToolbar() {
 return `<div class="market-toolbar"><div class="search-control">${uiIcon('search')}<input type="search" id="search" placeholder="단지명 또는 지역 검색" value="${safe(filter.query)}" aria-label="단지명 또는 지역 검색"></div><select aria-label="지역" data-filter="region">${options(['전체','서울','경기','인천'],filter.region)}</select><select aria-label="가격" data-filter="budget">${options(['전체','4억 미만','4~7억','7~10억','10억 이상'],filter.budget)}</select><button class="reset-filter" data-action="filter-reset">조건 초기화</button></div>`;
}

function spark(h, y, width = 170, height = 42) {
  const arr = historyFor(h, y);
  const vs = arr.map(a => a.value);
  const mn = Math.min(...vs), mx = Math.max(...vs);
  const delta = mx - mn || 1;
  const pts = vs.map((v, i) => `${(i / (vs.length - 1 || 1) * (width - 12) + 6).toFixed(1)},${(height - 10) - (v - mn) / delta * (height - 19)}`).join(' ');
  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" aria-label="2020년부터 공개된 가격 경로 (가상)">\
<polyline points="${pts}" fill="none" stroke="${h.type === '아파트' ? '#168c7c' : '#687ee0'}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>\
</svg>`;
}

function listCard(h) {
  const p = valueAt(h, session.year), owned = session.houseId === h.id, viewed = selected === h.id, rate = session.year > 2020 ? breakdown(h, session.year).total * 100 : null;
  return `<button class="listing-card ${viewed ? 'active' : ''}" data-action="select" data-id="${safe(h.id)}">\
<div class="listing-title">\
<strong>${safe(h.name)}</strong>${owned ? '<b class="owned-tag">보유 중</b>' : ''}</div>\
<div class="listing-sub">${safe(h.district)} · 전용 ${h.area}㎡ · ${h.built}년</div>\
<div class="listing-middle">\
<strong class="listing-price">매매 ${briefWon(p)}</strong>${rate === null ? '<span class="mini-change neutral">2020 실거래 기준</span>' : `<span class="mini-change ${rate < 0 ? 'negative' : 'positive'}">전년 대비 ${pct(rate)}</span>`}</div>\
<div class="listing-extra">\
<span>${quote(h).can ? '✓ 현재 매수 가능' : `목표 매물 · 추가 ${briefWon(quote(h).shortfall)}`} </span>${spark(h, session.year, 104, 30)}</div>\
</button>`;
}

function listingPanel() {
 return `<aside class="listing-panel property-sidebar" id="property-sidebar" aria-label="매물 목록과 상세 정보">${sidebarContentHtml()}</aside>`;
}
function sidebarContentHtml() {
 const h=byId(selected);
 if(h) return `<div class="sidebar-head"><button class="sidebar-back" data-action="back-list">← 후보 목록으로</button><span>${h?'선택한 아파트':'올해 선택'}</span></div><div class="sidebar-detail-scroll">${detailHtml(h)}</div>`;
 const matches=getMatches();return `<div class="listing-head"><div><h3>후보 ${KR.format(matches.length)}곳</h3><p>낮은 가격순 · ${session.year}년</p></div></div><div class="listing-scroll" id="listing-scroll">${matches.slice(0,visibleCount).map(listCard).join('')||'<p class="none-found">조건에 맞는 집이 없어요. 조건을 바꿔보세요.</p>'}${matches.length>visibleCount?'<button class="show-more" data-action="more">후보 더 보기 ↓</button>':''}</div>`;
}

function localProjectInfoHtml(h) {
  const near = localProjects(h, session.year).filter(e => e.proximity > .17);
  if (!near.length) return '';
  return `<div class="v8-projects">\
<b>현재까지 알려진 생활권 변수\
</b>${near.slice(0, 3).map(e => `<div>\
<span>${safe(e.kind)}</span>\
<strong>${safe(e.title)}</strong>\
<small>${safe(e.hint)}</small>\
</div>`).join('')}</div>`;
}

function detailHtml(h) {
 if(!h)return '<div class="map-placeholder"><b>목록에서 집을 골라보세요</b><p>선택한 집의 정보와 예산이 여기에 표시돼요.</p></div>';
 const q=quote(h),owned=session.houseId===h.id,d=yearData(),reg=regionKey(h), peers=peerSummary(h);
 const examples=practiceTrades(h,session.year), supply=neighborhoodSupply(h,session.year);
 const projects=localProjects(h,session.year).filter(p=>p.proximity>.17).slice(0,2);
 return `<div class="detail-panel"><div class="detail-top"><span>${safe(reg)} · ${h.area}㎡</span><button class="detail-close" data-action="close-detail" aria-label="매물 상세 닫기">×</button></div><h3>${safe(h.name)}</h3><p class="address">${safe(h.address)}</p><div class="detail-price"><small>${session.year}년 게임 제시가격 · 매수가</small><strong>${won(q.price)}</strong></div>
 <section class="lesson-check"><h4>CHECK 1. 향후 12개월 입주예정 물량</h4><div class="local-supply-lead"><span>${safe(supply.dong.name)}</span><strong>${KR.format(supply.dong.total)}호</strong><b class="data-label">가상 수업 데이터</b></div><div class="supply-levels">${supply.rows.slice(1,-1).map(r=>`<div><span>${safe(r.name)} 전체</span><b>${KR.format(r.total)}호</b></div>`).join('')}</div>${supply.nearby.length?`<div class="neighbor-supply">${supply.nearby.map(r=>`<span>같은 구·시의 다른 동 · ${safe(r.name)} ${KR.format(r.total)}호</span>`).join('')}</div>`:''}<small>지역별로 다르게 구성한 게임용 입주예정 물량입니다. 시·도 합계를 하위 지역에 배분한 가상 수치이며 실제 입주 계획·인구를 추정한 값이 아닙니다. 같은 구·시의 다른 동은 거리순이 아닙니다.</small><p class="lesson-question">선택한 동과 구·시 전체의 공급 규모를 구분해 살펴보세요.</p></section>
 <section class="lesson-check"><h4>CHECK 2. 가격 흐름</h4>${lineChart(historyFor(h,session.year))}<div class="chart-years"><span>2020년</span><span>${session.year}년</span></div><small>${session.year===2020?'시작 연도에는 가격 관측값이 하나예요. 다음 라운드부터 흐름을 비교할 수 있어요.':'지금까지 공개된 게임 가격. 2021년 이후는 가상 가격이에요.'}</small><p class="lesson-question">같은 가격이어도, 오르다 도달했는지 내리다 도달했는지 살펴보세요.</p></section>
 <section class="lesson-check"><h4>CHECK 3. 거래 사례</h4><p>연습용 최근 거래 사례 <b class="data-label">가상</b></p><div class="practice-trades">${examples.map(p=>`<span>${won(p)}</span>`).join('')}</div><p>제시가격과 거래 사례를 비교해 보세요.</p><small>위 세 건은 호가·거래가 비교 연습을 위해 생성한 가상 사례입니다. 실제 체결 기록이 아닙니다. 게임 거래는 위 제시가격으로 진행됩니다.</small><details><summary>실제 출발 자료 확인</summary><p>2020년 실거래 표본 중앙값 ${won(h.basePrice)} · ${h.tradeCount}건</p><p>유사 면적 표본 중앙값 ${won(peers.median)} (${safe(peers.scope)})</p><small>원본은 2020년 표본 요약입니다. 개별 계약일·최근 실거래 내역은 포함되어 있지 않습니다.</small></details></section>
 ${projects.length?`<section class="lesson-check"><h4>이 집 주변 수요·공급 뉴스</h4>${projects.map(p=>`<p><b>${safe(p.title)}</b><br>${safe(p.hint)}</p>`).join('')}</section>`:''}
 <div class="detail-finance"><div><span>필요 대출</span><b>${won(q.needLoan)}</b></div><div><span>매달 갚을 돈</span><b>${won(q.month)}</b></div><div><span>매수 후 현금</span><b>${won(q.remaining)}</b></div></div><div class="budget-ribbon ${q.can?'available':'not-yet'}">${owned?'지금 보유 중인 집':q.can?'현재 예산으로 선택 가능':`추가 자금 ${won(q.shortfall)} 필요`}</div><div class="map-links"><a target="_blank" rel="noopener" href="https://map.kakao.com/link/map/${encodeURIComponent(h.name)},${h.lat},${h.lng}">카카오맵에서 위치 보기 ↗</a></div></div>`;

}

function lineChart(data) {
  const w = 290, h = 88, vals = data.map(x => x.value);
  const min = Math.min(...vals) * .97, max = Math.max(...vals) * 1.03, range = max - min || 1;
  const pts = data.map((v, i) => [14 + (w - 28) * i / Math.max(1, data.length - 1), h - 12 - (v.value - min) / range * (h - 23)]);
  return `<svg class="detail-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="지금까지의 연도별 가격 변화 그래프">\
<line x1="14" x2="276" y1="72" y2="72" stroke="#dce7e4" stroke-width="1"/>\
<polyline points="${pts.map(x => x.join(',')).join(' ')}" stroke="#168c7c" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#168c7c"/>`).join('')}</svg>`;
}

function mapContent() {
 return `<div class="map-wrapper"><div id="map" aria-label="아파트 위치 지도"></div><button class="map-reset small-outline" data-action="map-reset">검색한 매물 한눈에 보기</button><div class="map-tip">아파트를 누르면 왼쪽 후보 목록이 상세 정보로 바뀝니다.</div></div>`;
}

function decisionHtml() {
 const p=session,held=byId(p.houseId),candidate=byId(selected),choice=classroomUI.choices?.[p.year]||'',locked=p.phase==='reveal';
 const reason=classroomUI.reasons[p.year]||'',read=Boolean(classroomUI.policyRead?.[p.year]);
 const ready=read&&reason,canBuy=candidate&&candidate.id!==p.houseId;
 return `<section class="decision-bar inline-decision" aria-label="예산 확인과 올해 선택"><div class="decision-context"><span class="eyebrow">${p.year}년 · 여기에서 선택하세요</span><h3>${locked?safe(p.lastDecision):'예산 확인부터 다음 라운드까지'}</h3><p>${locked?'이번 선택을 확정했어요. 다음 라운드에서 결과를 확인하세요.':choice==='sell'?'매도 선택 중. 다음 라운드를 누르면 확정돼요.':choice==='hold'?'보유 선택 중. 다음 라운드를 누르면 확정돼요.':'집을 골라 매수하거나, 보유·매도를 선택하세요.'}</p></div>
 <div class="decision-policy"><b>올해 금리 ${yearData().rate.toFixed(1)}% · 대출은 집값의 최대 ${Math.round(yearData().ltv*100)}%</b><span>${read?'✓ 올해 정책 확인 완료':'올해 정책을 확인한 뒤 선택할 수 있어요.'}</span>${!read?'<button class="small-outline" data-action="policy-focus">올해 정책 확인하러 가기 ↑</button>':''}</div>
 ${candidate?`<div class="purchase-summary"><b>${safe(candidate.name)}</b><span>게임 매수가 ${won(valueAt(candidate,p.year))}</span><span>필요 대출 ${won(quote(candidate).needLoan)} · 월 상환 ${won(quote(candidate).month)}</span></div>`:'<p class="choose-house-hint">목록 또는 지도에서 집을 고르면 이곳에 예산이 표시돼요. 집을 사지 않고 현금을 보유해도 돼요.</p>'}
 <label class="reason-picker">이번 선택의 이유<select id="decision-reason" ${locked?'disabled':''}><option value="">이유를 골라주세요</option>${Object.entries(EXPLANATION_CATEGORIES).map(([k,v])=>`<option value="${k}" ${k===reason?'selected':''}>${v}</option>`).join('')}</select></label>
 <div class="decision-buttons">${canBuy?`<button data-action="buy" data-id="${safe(candidate.id)}" class="main-button buy-cta" ${locked||!ready?'disabled':''}>${held?'이 집으로 갈아타기':'이 집 매수하기'} · 예산 확인</button>`:''}<button data-action="hold" class="decision-btn ${choice==='hold'?'chosen':''}" aria-pressed="${choice==='hold'}" ${locked||!read?'disabled':''}>${held?'계속 보유':'현금 보유'}</button><button data-action="sell" class="decision-btn ${choice==='sell'?'chosen':''}" aria-pressed="${choice==='sell'}" ${locked||!held||!read?'disabled':''}>매도</button><button data-action="advance" class="main-button" ${!locked&&(!choice||!ready)?'disabled':''}>${p.year===2026?'최종 결과 보기':'선택 확정 · 다음 라운드 →'}</button></div></section>`;
}

function passageHtml() {
  const p = session.lastPassage;
  if (!p || p.to !== session.year) return "";
  return `<div class="passage-recap">\
<div>\
<b>${p.forcedSale ? '⚠ 현금 부족 · 강제 매도 발생' : '지난 1년 결산'}</b>\
<span>${p.from} → ${p.to}</span>\
</div>\
<div>\
<small>집값 변화</small>\
<b>${won(p.houseDelta)}</b>\
</div>\
<div>\
<small>저축</small>\
<b>${won(p.saved)}</b>\
</div>\
<div>\
<small>대출 원리금</small>\
<b>${won(p.paid)}</b>\
</div>\
<div>\
<small>순자산 변화</small>\
<b>${won(p.delta)}</b>\
</div>\
</div>`;
}

function appHtml() {
 return `${topHtml()}${passageHtml()}${newsHtml()}<section class="market-section"><div class="market-heading"><div><h2>지도에서 우리 집 찾기</h2><p>목록이나 지도에서 집을 고르면 왼쪽에 상세 정보가 표시돼요.</p></div></div>${marketToolbar()}<div class="map-layout lesson-map-layout ${byId(selected)?'sidebar-expanded':''}">${listingPanel()}${mapContent()}</div><footer class="trade-footer" aria-label="예산과 거래 선택">${decisionHtml()}</footer></section>`;
}

function ledgerSummary() {
  const entries = session.passages || [], tx = session.transactions || [];
  const saved = entries.reduce((t, x) => t + x.saved, 0);
  const rent = entries.reduce((t, x) => t + x.rent, 0);
  const interest = entries.reduce((t, x) => t + x.interest, 0);
  const priceDelta = entries.reduce((t, x) => t + x.houseDelta, 0);
  const fees = tx.reduce((t, x) => t + (x.buyCost || 0) + (x.sellCost || 0), 0);
  const explained = session.initialCash + saved - rent - interest + priceDelta - fees;
  return { saved, rent, interest, priceDelta, fees, explained, gap: assets() - explained };
}

function explainHoldingHtml(log) {
  const h = byId(log.heldId);
  if (!h) return '';
  const e = explainYear(h, log.from, log.to);
  const topPos = e.components.filter(c => c.value > .0001).sort((a, b) => b.value - a.value).slice(0, 2);
  const topNeg = e.components.filter(c => c.value < -.0001).sort((a, b) => a.value - b.value).slice(0, 2);
  const factors = [...topPos, ...topNeg].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  return `<div class="audit-house-year">\
<div class="audit-period">\
<b>${log.from} → ${log.to} · ${safe(h.name)}</b>\
<strong class="${log.houseDelta < 0 ? 'down' : 'up'}">${pct(100 * e.rate)} · ${won(log.houseDelta)}</strong>\
</div>\
<p>전년 가격 ${won(e.base)} → 다음 해 ${won(e.next)} (가상 거래가격)</p>\
<div class="audit-factors">${factors.map(f => `<div>\
<span>${safe(f.label)}</span>\
<b>${displayRate(f.value)}</b>\
</div>`).join('')}</div>\
</div>`;
}

function annualDecisionReview() {
  return `<section class="final-audit">\
<h3>매년 무엇을 보고 선택했나?</h3>\
<p>결과를 보기 전, 내 선택의 근거는 타당했나요?</p>
 <div class="audit-timeline">${(session.yearly || []).map((d, i) => {
    const passage = (session.passages || []).find(x => x.from === d.year);
    const premise = d.reason || '기록되지 않음', h = byId(d.houseId);
    return `<div class="audit-choice">\
<div class="audit-period">\
<b>${d.year}년 · ${safe(d.decision || '보유')}</b>\
<span>${safe(premise)} 근거</span>\
</div>\
<div class="audit-mini">\
<span>당시 순자산 ${won(d.worth)}</span>\
<span>${h ? '선택 후 보유: ' + safe(h.name) : '현금·무주택 상태'}</span>\
</div>${passage ? `<p>다음 해 확인된 결과: ${passage.heldId ? `집값 ${won(passage.houseDelta)}, ` : '무주택 · '}순자산 ${won(passage.delta)} 변동</p>` : `<p>2026년 마지막 선택 · 다음 해 결과는 게임 범위 밖입니다.</p>`}</div>`;
  }).join('')}</div>\
</section>`;
}

function finalAuditHtml() {
  const l = ledgerSummary(), holding = (session.passages || []).filter(x => x.heldId);
  const counterfactual = session.initialCash + Array.from({ length: 6 }, (_, i) => savingsForYear(2020 + i) - rentForYear(2020 + i)).reduce((a, b) => a + b, 0);
  return `<section class="final-audit">\
<h3>순자산 변동 내역</h3>\
<p>매년의 가격 변동, 이자, 주거비, 거래비용을 구분한 <b>게임 내부 회계</b>입니다.</p>
 <div class="audit-ledger">\
<div>\
<span>시작 현금</span>\
<b>${won(session.initialCash)}</b>\
</div>\
<div>\
<span>누적 저축</span>\
<b class="up">${won(l.saved)}</b>\
</div>\
<div>\
<span>보유 주택 가격 증감</span>\
<b class="${l.priceDelta < 0 ? 'down' : 'up'}">${won(l.priceDelta)}</b>\
</div>\
<div>\
<span>임차 거주비</span>\
<b>${won(-l.rent)}</b>\
</div>\
<div>\
<span>대출이자</span>\
<b>${won(-l.interest)}</b>\
</div>\
<div>\
<span>매수·매도 비용</span>\
<b>${won(-l.fees)}</b>\
</div>\
<div class="audit-ledger-total">\
<span>기말 순자산 (장부 계산)</span>\
<b>${won(l.explained)}</b>\
</div>\
</div>
 <p class="audit-warning">${Math.abs(l.gap) > 1000 ? `⚠ 회계 오차 ${won(l.gap)}가 검출됐습니다. 로컬 게임 진행 이력 또는 계산을 점검해야 합니다.` : '✓ 금액 합계와 실제 게임 내 순자산 계산이 일치합니다.'} 대출 원금 상환은 현금을 줄이지만 부채도 같은 금액 감소하므로 순자산 증감에서 별도로 차감하지 않습니다.</p>
 <div class="audit-compare">\
<b>아예 집을 사지 않고 대기했다면?</b>\
<strong>${won(counterfactual)}</strong>\
<small>프로필별 소득 성장·연 저축과 임차비 상승 가정, 예금이자·물가·세금 제외.</small>\
</div>
 <h3>내가 보유한 집의 가격은 왜 움직였나?</h3>${holding.length ? holding.map(explainHoldingHtml).join('') : '<div class="audit-empty">보유한 아파트가 없어서 집값 기여분은 없습니다. 대기 전략에서 중요한 것은 저축과 임차비, 매수 기회비용입니다.</div>'}
 </section>`;
}

function marketDifferenceHtml() {
  const picks = [...listings].filter(h => h.tradeCount >= 6).sort((a, b) => b.basePrice - a.basePrice);
  const sampled = [];
  for (const district of ['강남구', '노원구', '성남시 분당구', '평택시', '김포시', '연수구', '수원시 영통구', '용산구']) {
    const h = picks.find(x => x.district === district);
    if (h) sampled.push(h);
  }
  const rate = h => (valueAt(h, 2026) / valueAt(h, 2020) - 1) * 100;
  return `<section class="final-audit">\
<h3>같은 7년, 모든 집이 똑같이 움직이지 않았어요</h3>\
<p>어느 단지가 더 많이 움직였는지, 왜 그랬는지 위의 연간 요인 분해와 함께 확인하세요.</p>\
<div class="v8-market-compare">${sampled.map(h => `<div>\
<span>${safe(h.district)} · ${safe(h.name)}</span>\
<b class="${rate(h) < 0 ? 'down' : 'up'}">${pct(rate(h))}</b>\
</div>`).join('')}</div>\
</section>`;
}

function finalHtml() {
 const decisions=session.yearly||[], count=decisions.filter(d=>Object.values(EXPLANATION_CATEGORIES).includes(d.reason)).length;
 return `<section class="end-screen"><span class="eyebrow">7라운드 완료</span><h1>나의 주택 선택 기록</h1><div class="achievement"><b>🏁 완주 배지</b><span>이유를 남긴 라운드 ${count}/7</span><span>${session.cash>=0?'💰 예산 지킴이':'예산을 다시 점검해 보세요'}</span></div><div class="final-metrics"><div><small>마지막 순자산</small><b>${won(assets())}</b></div><div><small>시작 대비 변화</small><b>${won(assets()-session.initialCash)}</b></div></div><p>순자산에는 저축·집값 변화·대출·비용이 함께 반영됩니다. 수익만으로 선택의 이유를 평가하지 말고, 당시 힌트를 보고 설명해 보세요.</p>${annualDecisionReview()}<details><summary>자산 계산 자세히 보기</summary>${finalAuditHtml()}</details><div class="end-actions"><button class="main-button" data-action="restart">다른 선택으로 다시 도전 ↻</button></div></section>`;
}

function helpHtml() {
 return `<h3>게임 방법</h3><ol><li>금리와 지역별 수요·공급 힌트를 확인합니다.</li><li>목록에서 집을 골라 예산을 확인하고 매수하거나, 현금을 보유합니다.</li><li>보유한 집이 있으면 보유·매도 중 선택합니다. 다른 집으로 갈아타려면 그 집의 상세 화면에서 매수합니다.</li><li>선택 이유를 고르고 다음 라운드를 누릅니다.</li><li>가격 변화와 내 자산 변화를 확인합니다.</li></ol><p>7라운드를 완주하고 내 선택의 이유를 설명하는 것이 목표입니다. 위치와 출발 가격 표본 외의 시장·가격은 수업용 가상 시나리오입니다.</p>`;
}

function uiIcon(name) {
 const shapes={search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',home:'<path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/>'};
 return `<span class="ui-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shapes[name]||shapes.home}</svg></span>`;
}
function personaIcon(profile) {
 return `<span class="persona-avatar persona-${safe(profile.id)}" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="17" r="8" fill="currentColor"/><path d="M9 41c0-10 6-15 15-15s15 5 15 15" fill="currentColor"/></svg></span>`;
}
