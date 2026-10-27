/** Screen templates. Show essentials first; open evidence and explanations on demand. */
function introHtml() {
 return `<section class="intro-wrap"><div class="intro-hero"><span class="eyebrow">2026–2030 · 5라운드 주택 선택 게임</span><h1>내 예산으로 집을 골라볼까?</h1><p>구매력·수요·공급을 살피고, 가격 흐름과 거래 사례를 비교하세요. 미래 가격은 다음 라운드에 공개됩니다.</p></div>
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
<small>${safe(d.title)} · 시나리오 시장</small>\
</div>\
<div class="yearline">${[...DECISION_YEARS, END_YEAR].map(a => `<span class="yr ${a === y ? 'here' : a < y ? 'passed' : ''}">${a}</span>`).join('')}</div>\
</div>\
<div class="persona-banner">${personaIcon(session.profile)}<div><span class="eyebrow">내가 선택한 인물</span><h2>${safe(session.profile.name)} <span>${session.profile.age+y-START_YEAR}세</span></h2><p>${safe(session.profile.job)}</p></div><span class="persona-tag">${safe(session.profile.tag)}</span></div>\
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
<span>진행 <b>${y - START_YEAR + 1}/5년</b></span>\
</div>\
</div>`;
}
function newsHtml() {
 const d=yearData(), prior=previousPolicy(session.year);
 return `<section class="news-section"><section class="policy-brief compact-policy" id="annual-policy" aria-labelledby="policy-title"><div class="policy-title"><span>올해 정책</span><h3 id="policy-title">${session.year}년 금리·대출</h3><b class="data-label">가상 시나리오</b></div><div class="policy-inline"><span>대출금리 <b>${d.rate.toFixed(1)}%</b> <small>(이전 ${prior.rate.toFixed(1)}%)</small></span><span>집값 대비 최대 대출 <b>${formatPolicyPercent(d.ltv)}%</b> <small>(이전 ${formatPolicyPercent(prior.ltv)}%)</small></span><span>소득 대비 상환 상한 <b>${formatPolicyPercent(d.paymentRatio)}%</b></span></div><p class="policy-headline">${safe(d.policy.headline)}</p><label class="policy-check"><input type="checkbox" id="policy-read" ${classroomUI.policyRead[session.year]?'checked':''}> 올해 금리와 대출 한도를 확인했어요</label><details class="policy-extra"><summary>정책 설명과 배운 내용 다시 보기</summary><p>${safe(d.policy.body)}</p><p>${safe(d.policy.question)}</p></details></section><div class="v8-project-news-cards">${d.news.map((n,i)=>`<details class="news-detail" data-news-key="${session.year}:${i}" ${newsIsOpen(String(i))?'open':''}><summary><span>${safe(n.kind)}</span><strong>${safe(n.title)}</strong></summary><div class="news-detail-body"><p>${safe(n.body)}</p></div></details>`).join('')}</div></section>`;
}
function getMatches() {
  const q = filter.query.replace(/\s+/g, '').toLowerCase();
  const matches = listings.filter(h => {
    const price = valueAt(h, session.year);
    if (filter.region !== '전체' && regionKey(h) !== filter.region) return false;
    if (filter.budget === '4억 미만' && price >= 4e8 || filter.budget === '4~7억' && (price < 4e8 || price >= 7e8) || filter.budget === '7~10억' && (price < 7e8 || price >= 10e8) || filter.budget === '10억 이상' && price < 10e8) return false;
    return !q || `${h.name}${h.district}${h.dong}${h.region}`.replace(/\s+/g, '').toLowerCase().includes(q);
  });
  return matches.sort((a, b) => valueAt(a, session.year) - valueAt(b, session.year));
}
const options = (items, selectedValue) => items.map(v => `<option value="${safe(v)}" ${v === selectedValue ? 'selected' : ''}>${safe(v)}</option>`).join('');
function marketToolbar() {
 return `<div class="market-toolbar"><div class="search-control">${uiIcon('search')}<input type="search" id="search" placeholder="단지명 또는 지역 검색" value="${safe(filter.query)}" aria-label="단지명 또는 지역 검색"></div><select aria-label="지역" data-filter="region">${options(['전체','서울','경기','인천'],filter.region)}</select><select aria-label="가격" data-filter="budget">${options(['전체','4억 미만','4~7억','7~10억','10억 이상'],filter.budget)}</select><button class="reset-filter" data-action="filter-reset">조건 초기화</button></div>`;
}
function spark(h, year, width = 104, height = 30) {
  const data = historyFor(h, year), values = data.map(p => p.value), low = Math.min(...values), range = Math.max(...values) - low || 1;
  const pts = data.map((p, i) => `${6 + i / Math.max(1, data.length - 1) * (width - 12)},${height - 5 - (p.value - low) / range * (height - 10)}`);
  return `<svg class="sparkline" viewBox="0 0 ${width} ${height}" aria-label="공개된 게임 가격 흐름"><polyline points="${pts.join(' ')}" fill="none" stroke="#168c7c" stroke-width="2.5"/>${data.length === 1 ? `<circle cx="6" cy="${height - 5}" r="3" fill="#168c7c"/>` : ''}</svg>`;
}
function listCard(h) {
  const price = valueAt(h, session.year), rate = session.year > START_YEAR ? ratio(price, valueAt(h, session.year - 1)) * 100 : null, q = quote(h);
  return `<button class="listing-card ${selected === h.id ? 'active' : ''}" data-action="select" data-id="${safe(h.id)}"><div class="listing-title"><strong>${safe(h.name)}</strong>${session.houseId === h.id ? '<b class="owned-tag">보유 중</b>' : ''}</div><div class="listing-sub">${safe(h.district)} · ${h.area}㎡ · ${h.built}년</div><div class="listing-middle"><strong class="listing-price">${briefWon(price)}</strong><span class="mini-change ${rate === null ? 'neutral' : rate < 0 ? 'negative' : 'positive'}">${rate === null ? '게임 시작가격' : `지난 1년 ${pct(rate)}`}</span></div><div class="listing-extra"><span>${session.houseId === h.id ? '현재 보유 중' : q.can ? '✓ 현재 매수 가능' : `추가 ${briefWon(q.shortfall)} 필요`}</span>${spark(h, session.year)}</div></button>`;
}
function listingPanel() { return `<aside class="listing-panel property-sidebar" id="property-sidebar" aria-label="매물 목록과 상세 정보">${sidebarContentHtml()}</aside>`; }
function sidebarContentHtml() {
 const h=byId(selected);
 if(h) return `<div class="sidebar-head"><button class="sidebar-back" data-action="back-list">← 후보 목록으로</button><span>${h?'선택한 아파트':'올해 선택'}</span></div><div class="sidebar-detail-scroll">${detailHtml(h)}</div>`;
 const matches=getMatches();return `<div class="listing-head"><div><h3>후보 ${KR.format(matches.length)}곳</h3><p>낮은 가격순 · ${session.year}년</p></div></div><div class="listing-scroll" id="listing-scroll">${matches.slice(0,visibleCount).map(listCard).join('')||'<p class="none-found">조건에 맞는 집이 없어요. 조건을 바꿔보세요.</p>'}${matches.length>visibleCount?'<button class="show-more" data-action="more">후보 더 보기 ↓</button>':''}</div>`;
}
function supplyEvidenceHtml(h, supply) {
  const comparison = [{ ...supply.dong, selected: true }, ...supply.nearby];
  return `<details class="disclosure home-evidence"><summary>입주예정 물량 <b>${KR.format(supply.dong.total)}호</b></summary><p>${safe(supply.dong.name)} · 앞으로 12개월</p><div class="supply-highlight"><span>기존 주택 대비 입주 비율</span><b>${supply.dong.rate.toFixed(2)}%</b></div><p class="subtle">입주 ${KR.format(supply.dong.total)}호 ÷ 게임의 기존 주택 ${KR.format(supply.dong.stock)}호. 이 비율이 가격의 공급 요인에 반영됩니다.</p>
  <table class="supply-comparison"><caption>${safe(supply.district.name)} 안에서 비교</caption><thead><tr><th scope="col">동</th><th scope="col">입주예정</th><th scope="col">비율</th></tr></thead><tbody>${comparison.map(row => `<tr class="${row.selected ? 'selected-dong' : ''}"><th scope="row">${safe(row.name)}${row.selected ? '<small>선택한 동</small>' : ''}</th><td>${KR.format(row.total)}호</td><td>${row.rate.toFixed(2)}%</td></tr>`).join('')}</tbody></table><p class="subtle">${supply.nearby.length ? '다른 동은 입주 비율이 높은 순서로 최대 3곳입니다.' : '이 구·시에는 비교할 다른 동 표본이 없어요.'}</p>
  <details class="sub-disclosure"><summary>구·시·도 합계</summary><div class="supply-levels">${supply.rows.slice(0, -1).map(x => `<div><span>${safe(x.name)} 전체</span><b>${KR.format(x.total)}호 · ${x.rate.toFixed(2)}%</b></div>`).join('')}</div><p class="subtle">주택 수와 입주물량은 수업용 설정입니다. 시도 총량을 생활권 입주사업과 표본 단지 분포에 따라 나눴습니다.</p></details><p class="lesson-question">입주 호수가 많아도, 지역 규모 대비 비율은 어떨까요?</p></details>`;
}
function detailHtml(h) {
 if(!h)return '<div class="map-placeholder"><b>목록에서 집을 골라보세요</b><p>선택한 집의 정보와 예산이 여기에 표시돼요.</p></div>';
 const q=quote(h),owned=session.houseId===h.id,d=yearData(),reg=regionKey(h), peers=peerSummary(h);
 const examples=practiceTrades(h,session.year), supply=neighborhoodSupply(h,session.year);
 const projects=localProjects(h,session.year).filter(p=>p.proximity>.17).slice(0,2);
 return `<div class="detail-panel"><div class="detail-top"><span>${safe(reg)} · ${h.area}㎡</span><button class="detail-close" data-action="close-detail" aria-label="매물 상세 닫기">×</button></div><h3>${safe(h.name)}</h3><p class="address">${safe(h.address)}</p><div class="detail-price"><small>${session.year}년 게임 제시가격 · 매수가</small><strong>${won(q.price)}</strong></div>
 <section class="lesson-check"><h4>CHECK 1. 앞으로 12개월 입주예정 물량</h4><div class="local-supply-lead"><span>선택한 동 · ${safe(supply.dong.name)}</span><strong>${KR.format(supply.dong.total)}호</strong><b class="data-label">가상 수업 데이터</b></div><p>기존 주택 대비 입주 비율 ${supply.dong.rate.toFixed(2)}%</p><div class="supply-levels">${supply.rows.slice(1,-1).map(r=>`<div><span>${safe(r.name)} 전체</span><b>${KR.format(r.total)}호</b></div>`).join('')}</div>${supply.nearby.length?`<div class="neighbor-supply">${supply.nearby.map(r=>`<span>같은 구·시의 다른 동 · ${safe(r.name)} ${KR.format(r.total)}호</span>`).join('')}</div>`:''}<small>지역별로 다르게 구성한 게임용 입주예정 물량입니다. 시·도 합계를 하위 지역에 배분한 가상 수치이며 실제 입주 계획·인구를 추정한 값이 아닙니다. 같은 구·시의 다른 동은 거리순이 아닙니다.</small><p class="lesson-question">선택한 동과 구·시 전체의 공급 규모를 구분해 살펴보세요.</p></section>
 <section class="lesson-check"><h4>CHECK 2. 가격 흐름</h4>${lineChart(historyFor(h,session.year))}<div class="chart-years"><span>${START_YEAR}년</span><span>${session.year}년</span></div><small>${session.year===START_YEAR?'시작 연도에는 가격 관측값이 하나예요. 다음 라운드부터 흐름을 비교할 수 있어요.':'지금까지 공개된 게임 가격. 미래 가격은 가상 가격이에요.'}</small><p class="lesson-question">같은 가격이어도, 오르다 도달했는지 내리다 도달했는지 살펴보세요.</p></section>
 <section class="lesson-check"><h4>CHECK 3. 거래 사례</h4><p>연습용 최근 거래 사례 <b class="data-label">가상</b></p><div class="practice-trades">${examples.map(p=>`<span>${won(p)}</span>`).join('')}</div><p>제시가격과 거래 사례를 비교해 보세요.</p><small>위 세 건은 호가·거래가 비교 연습을 위해 생성한 가상 사례입니다. 실제 체결 기록이 아닙니다. 게임 거래는 위 제시가격으로 진행됩니다.</small><details><summary>실제 출발 자료 확인</summary><p>2020년 실거래 표본 중앙값 ${won(h.basePrice)} · ${h.tradeCount}건</p><p>유사 면적 표본 중앙값 ${won(peers.median)} (${safe(peers.scope)})</p><small>원본은 2020년 표본 요약입니다. 개별 계약일·최근 실거래 내역은 포함되어 있지 않습니다.</small></details></section>
 ${projects.length?`<section class="lesson-check"><h4>이 집 주변 수요·공급 뉴스</h4>${projects.map(p=>`<p><b>${safe(p.title)}</b><br>${safe(p.hint)}</p>`).join('')}</section>`:''}
 <div class="detail-finance"><div><span>필요 대출</span><b>${won(q.needLoan)}</b></div><div><span>매달 갚을 돈</span><b>${won(q.month)}</b></div><div><span>매수 후 현금</span><b>${won(q.remaining)}</b></div></div><div class="budget-ribbon ${q.can?'available':'not-yet'}">${owned?'지금 보유 중인 집':q.can?'현재 예산으로 선택 가능':`추가 자금 ${won(q.shortfall)} 필요`}</div><div class="map-links"><a target="_blank" rel="noopener" href="https://map.kakao.com/link/map/${encodeURIComponent(h.name)},${h.lat},${h.lng}">카카오맵에서 위치 보기 ↗</a></div></div>`;

}
function lineChart(data) {
  const w = 320, h = 112, vals = data.map(x => x.value), low = Math.min(...vals) * .97, high = Math.max(...vals) * 1.03, range = high - low || 1;
  const pts = data.map((v, i) => [18 + 284 * i / Math.max(1, data.length - 1), 91 - (v.value - low) / range * 70]);
  return `<svg class="detail-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${safe(data.map(p => `${p.year}년 ${won(p.value)}`).join(', '))}"><line x1="18" x2="302" y1="95" y2="95" stroke="#dce7e4"/><polyline points="${pts.map(p => p.join(',')).join(' ')}" stroke="#168c7c" stroke-width="3" fill="none"/>${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4" fill="#168c7c"><title>${data[i].year}년 ${won(data[i].value)}</title></circle>`).join('')}</svg>`;
}
function mapContent() {
 return `<div class="map-wrapper"><div id="map" aria-label="아파트 위치 지도"></div><button class="map-reset small-outline" data-action="map-reset">검색한 매물 한눈에 보기</button><div class="map-tip">아파트를 누르면 왼쪽 후보 목록이 상세 정보로 바뀝니다.</div></div>`;
}
function decisionHtml() {
 const p=session,held=byId(p.houseId),candidate=byId(selected),choice=classroomUI.choices?.[p.year]||'',locked=p.phase==='reveal';
 const reason=reasonKeys(classroomUI.reasons[p.year]),read=Boolean(classroomUI.policyRead?.[p.year]);
 const ready=read&&reason.length>0,canBuy=candidate&&candidate.id!==p.houseId;
 return `<section class="decision-bar inline-decision" aria-label="예산 확인과 올해 선택"><div class="decision-context"><span class="eyebrow">${p.year}년 · 여기에서 선택하세요</span><h3>${locked?safe(p.lastDecision):'예산 확인부터 다음 라운드까지'}</h3><p>${locked?'이번 선택을 확정했어요. 다음 라운드에서 결과를 확인하세요.':choice==='sell'?'매도 선택 중. 다음 라운드를 누르면 확정돼요.':choice==='hold'?'보유 선택 중. 다음 라운드를 누르면 확정돼요.':'집을 골라 매수하거나, 보유·매도를 선택하세요.'}</p></div>
 <div class="decision-policy"><b>올해 금리 ${yearData().rate.toFixed(1)}% · 대출은 집값의 최대 ${formatPolicyPercent(yearData().ltv)}%</b><span>${read?'✓ 올해 정책 확인 완료':'올해 정책을 확인한 뒤 선택할 수 있어요.'}</span>${!read?'<button class="small-outline" data-action="policy-focus">올해 정책 확인하러 가기 ↑</button>':''}</div>
 ${candidate?`<div class="purchase-summary"><b>${safe(candidate.name)}</b><span>게임 매수가 ${won(valueAt(candidate,p.year))}</span><span>필요 대출 ${won(quote(candidate).needLoan)} · 월 상환 ${won(quote(candidate).month)}</span></div>`:'<p class="choose-house-hint">목록 또는 지도에서 집을 고르면 이곳에 예산이 표시돼요. 집을 사지 않고 현금을 보유해도 돼요.</p>'}
 <fieldset class="reason-picker reason-options" ${locked?'disabled':''}><legend>이번 선택의 이유 <small>여러 개 선택할 수 있어요</small></legend><div>${Object.entries(EXPLANATION_CATEGORIES).map(([k,v])=>`<label><input type="checkbox" data-reason="${k}" ${reason.includes(k)?'checked':''}><span>${v}</span></label>`).join('')}</div></fieldset>
 <div class="decision-buttons">${canBuy?`<button data-action="buy" data-id="${safe(candidate.id)}" class="main-button buy-cta" ${locked||!ready?'disabled':''}>${held?'이 집으로 갈아타기':'이 집 매수하기'} · 예산 확인</button>`:''}<button data-action="hold" class="decision-btn ${choice==='hold'?'chosen':''}" aria-pressed="${choice==='hold'}" ${locked||!read?'disabled':''}>${held?'계속 보유':'현금 보유'}</button><button data-action="sell" class="decision-btn ${choice==='sell'?'chosen':''}" aria-pressed="${choice==='sell'}" ${locked||!held||!read?'disabled':''}>매도</button><button data-action="advance" class="main-button" ${!locked&&(!choice||!ready)?'disabled':''}>${locked ? '1년 뒤 결과 보기 →' : '선택 확정 · 1년 진행 →'}</button></div></section>`;
}
function passageHtml() {
  const p = session.lastPassage;
  if (!p) return '';
  const result = periodPerformance(p);
  return `<div class="passage-recap compact-recap"><span>${p.from}→${p.to} 결산 · 부동산 손익 <b class="${profitTone(result.propertyProfit)}">${signedWon(result.propertyProfit)}</b></span><button class="text-button" data-action="review-period">지난 결과 다시 보기 ↗</button></div>`;
}
function appHtml() {
 return `${topHtml()}${passageHtml()}${newsHtml()}<section class="market-section"><div class="market-heading"><div><h2>지도에서 우리 집 찾기</h2><p>목록이나 지도에서 집을 고르면 왼쪽에 상세 정보가 표시돼요.</p></div></div>${marketToolbar()}<div class="map-layout lesson-map-layout ${byId(selected)?'sidebar-expanded':''}">${listingPanel()}${mapContent()}</div><footer class="trade-footer" aria-label="예산과 거래 선택">${decisionHtml()}</footer></section>`;
}
function factorsHtml(home, from) {
  const e = explainPeriod(home, from);
  return `<div class="factor-list">${e.components.map(f => `<div class="factor-row"><span>${safe(f.label)}</span><div class="factor-track"><i class="${f.value < 0 ? 'negative' : 'positive'}" style="width:${Math.min(100, Math.abs(f.value) / .15 * 100)}%"></i></div><b>${displayRate(f.value)}</b></div>`).join('')}<div class="factor-total"><span>집값 변화율</span><b>${pct(e.rate * 100)}</b></div></div><details class="disclosure"><summary>왜 이렇게 변했나요?</summary>${e.components.map(f => `<p><b>${safe(f.label)}</b> · ${safe(f.detail)}</p>`).join('')}${localProjects(home, from).map(p => `<p>${safe(p.title)}: ${safe(p.result)}</p>`).join('')}<p class="subtle">세 요인의 기여도(%p)를 더해 1년 변동률(%)을 계산합니다. 게임용 계수이며 실제 통계에서 추정한 영향력이 아닙니다.</p></details>`;
}
const signedWon = value => (value > 0 ? '+' : '') + won(value);
const profitTone = value => value < -.5 ? 'profit-loss' : value > .5 ? 'profit-gain' : 'profit-neutral';
function performanceMetricsHtml(result, evaluatedHome = false) {
  return `<div class="performance-metrics"><section class="property-performance"><h3>부동산 손익</h3><strong class="${profitTone(result.propertyProfit)}">${signedWon(result.propertyProfit)}</strong><p>집값이 바뀐 금액에서 대출이자와 거래비용을 뺐어요</p>${evaluatedHome ? '<small>보유 중인 집은 현재 가격으로 계산했어요</small>' : ''}</section><section class="income-performance"><h3>소득에서 모은 저축</h3><strong>${signedWon(result.saved)}</strong><p>월급에서 기본 생활비를 빼고 모은 돈이에요</p></section></div>${result.rent > 0 ? `<p class="separate-rent">별도 임차 주거비 <b>${won(result.rent)}</b></p>` : ''}`;
}
function propertyBreakdownHtml(result) {
  const items = [['집값 증감', result.priceDelta], ['대출이자', -result.interest], ['거래비용', -result.fees]];
  return `<div class="property-breakdown">${items.map(([label, value]) => `<div><span>${label}</span><b>${signedWon(value)}</b></div>`).join('')}<div class="property-total"><span>부동산 손익</span><b class="${profitTone(result.propertyProfit)}">${signedWon(result.propertyProfit)}</b></div></div><p class="subtle">만원 단위 반올림 · 원금 상환은 현금과 빚이 함께 줄어 손익에 포함하지 않습니다.</p>`;
}
function periodComparisonHtml(p) {
  const house = byId(p.heldId);
  return `<dl class="period-comparison">${house ? `<div><dt>집값 · ${p.from}년 → ${p.forcedSale ? safe(p.forcedAt) + ' 매도' : p.to + '년'}</dt><dd><span>${won(p.startPrice)}</span><span aria-hidden="true">→</span><span>${won(p.endPrice)}</span></dd></div>${p.forcedSale ? `<div><dt>${p.to}년 시장가격 · 매도 후</dt><dd>${won(valueAt(house, p.to))}</dd></div>` : ''}` : ''}<div><dt>전체 순자산 (저축 포함) · 선택 전 → ${p.to}년</dt><dd><span>${won(p.worthBefore)}</span><span aria-hidden="true">→</span><span>${won(p.worthAfter)}</span></dd></div></dl><p class="subtle">전체 순자산 변화 = 부동산 손익 + 소득에서 모은 저축 − 임차 주거비</p>`;
}
function periodResultHtml(p) {
  const home = byId(p.heldId), d = roundFor(p.from), result = periodPerformance(p);
  return `<div class="round-result"><span class="data-label">${p.months}개월 경과</span><h3>${p.forcedSale ? '상환 중 현금이 부족했어요' : p.to === END_YEAR ? '5년의 선택이 완성됐어요' : '이번 주택 선택의 결과'}</h3>${performanceMetricsHtml(result, Boolean(home && !p.forcedSale))}${!home && p.tradeFees > 0 ? `<p class="sale-explanation">이 기간에 집을 팔 때 든 비용 ${won(p.tradeFees)}이 부동산 손익에서 빠졌어요. 집을 팔기 전 해까지의 집값 변화는 해당 연도에 이미 반영됐어요.</p>` : ''}<details class="disclosure"><summary>부동산 손익 계산</summary>${propertyBreakdownHtml(result)}</details><details class="disclosure"><summary>이전·이후 금액 비교</summary>${periodComparisonHtml(p)}</details><p>${safe(d.outcome)}</p>${p.forcedSale ? `<p class="budget-alert">${safe(p.forcedAt)}에 현금이 부족해 보유 주택이 매도됐습니다. 이후에는 임차 주거비를 적용했습니다.</p>` : ''}${home ? `<h4>${safe(home.name)} · ${p.from}→${p.to} 시장 변화</h4>${factorsHtml(home, p.from)}` : '<p class="subtle">이 기간에는 집을 보유하지 않았습니다. 매도한 경우 거래비용은 부동산 손익에 반영됩니다.</p>'}<details class="disclosure"><summary>12개월 돈의 흐름</summary><div class="quote-rows"><div><span>소득에서 모은 저축</span><b>${signedWon(p.saved)}</b></div><div><span>임차 주거비</span><b>−${won(p.rent)}</b></div><div><span>대출 상환 총액</span><b>−${won(p.paid)}</b></div><div><span>상환액 중 원금 / 이자</span><b>${won(p.principal)} / ${won(p.interest)}</b></div><div><span>전체 순자산 변화 (저축 포함)</span><b>${signedWon(p.delta)}</b></div></div><p class="subtle">소득 전체가 아니라 기본 생활비를 뺀 저축액을 더합니다. 거래비용과 이자는 위 손익 계산에 이미 포함됩니다.</p></details><button class="main-button modal-primary" data-action="close-modal">${p.to === END_YEAR ? '내 선택 돌아보기 →' : `${p.to}년 정책 살펴보기 →`}</button></div>`;
}
function annualDecisionReview() {
  return `<section class="final-audit"><div class="section-title"><h3>나는 무엇을 보고 선택했나요?</h3></div><div class="review-cards">${session.yearly.map(d => {
    const p = session.passages.find(x => x.from === d.year), home = byId(p.heldId), result = periodPerformance(p);
    return `<article class="review-card"><span class="eyebrow">${d.year} → ${d.year + 1}</span><h4>${safe(d.decision)}</h4><p>선택한 이유 · <b>${safe(d.reason)}</b></p><div class="review-delta">부동산 손익 <strong class="${profitTone(result.propertyProfit)}">${signedWon(result.propertyProfit)}</strong></div>${!home && p.tradeFees > 0 ? `<p class="sale-explanation">매도 비용 ${won(p.tradeFees)}이 반영됐어요.</p>` : ''}<p class="review-savings">별도 소득 저축 ${signedWon(result.saved)}</p><details class="disclosure"><summary>그때의 단서와 결과</summary>${propertyBreakdownHtml(result)}${periodComparisonHtml(p)}<p>${safe(roundFor(d.year).policy.headline)}</p><p>${safe(roundFor(d.year).outcome)}</p>${p.forcedSale ? `<p>${safe(p.forcedAt)} 현금 부족으로 강제 매도</p>` : ''}${home ? factorsHtml(home, d.year) : `<p>저축 ${won(p.saved)} · 주거비 ${won(p.rent)}</p>`}</details></article>`;
  }).join('')}</div></section>`;
}
function finalAuditHtml() {
  const l = ledgerSummary(), items = [['시작 현금', session.initialCash], ['소득에서 모은 저축', l.saved], ['보유 중 집값 변화', l.priceDelta], ['임차 주거비', -l.rent], ['대출 이자', -l.interest], ['거래 비용', -l.fees]];
  const wait = session.initialCash + Array.from({ length: END_YEAR - START_YEAR }, (_, i) => savingsForYear(START_YEAR + i) - rentForYear(START_YEAR + i)).reduce((a, b) => a + b, 0);
  return `<div class="audit-ledger">${items.map(([label, value]) => `<div><span>${label}</span><b>${won(value)}</b></div>`).join('')}<div class="audit-ledger-total"><span>전체 순자산 (저축 포함)</span><b>${won(l.explained)}</b></div></div><p class="subtle">대출 원금은 부채 감소와 상쇄됩니다. ${Math.abs(l.gap) > 1 ? '계산 이력을 확인해 주세요.' : '각 항목의 합계가 전체 순자산과 일치합니다.'}</p><div class="audit-compare"><b>집을 사지 않았을 때의 전체 순자산</b><strong>${won(wait)}</strong><small>같은 소득·저축·임차비 가정. 예금이자·별도 세금은 제외.</small></div><details class="disclosure"><summary>거래 기록 ${session.transactions.length}건</summary>${session.transactions.map(t => `<p>${t.year}년${t.month ? ` ${t.month}월` : ''} · ${safe({ buy: '매수', sell: '매도', switch: '갈아타기', forced: '강제 매도' }[t.kind])} · ${safe(byId(t.id).name)} · ${won(t.price)}</p>`).join('') || '<p>집을 거래하지 않았습니다.</p>'}</details>`;
}
function finalHtml() {
  const held = byId(session.houseId), result = ledgerSummary();
  const recorded = session.yearly.filter(d => Boolean(d.reason)).length;
  const budgetKept = session.cash >= 0 && session.passages.every(p => !p.forcedSale);
  return `<section class="end-screen"><span class="eyebrow">2026–2031 · 5번의 결정, 5년의 변화</span><h1>나의 부동산 선택 결과</h1><div class="completion-summary" aria-label="활동 완료"><span>✓ 5라운드 완료</span><span>이유 기록 ${recorded}/5</span><span>${budgetKept ? '예산 지킴이' : '상환 부담 돌아보기'}</span></div><p>집을 선택해 얻은 손익과 소득에서 모은 저축을 나누어 살펴보세요.</p>${performanceMetricsHtml(result, Boolean(held))}<details class="disclosure"><summary>부동산 손익 계산</summary>${propertyBreakdownHtml(result)}</details><div class="finish-account">${held ? `마지막 보유 주택 · ${safe(held.name)} (${won(valueAt(held, END_YEAR))})` : '마지막 상태 · 현금 보유'}</div>${annualDecisionReview()}<section class="reflection"><h3>짝과 이야기해 보세요</h3><p>① 주택 손익에 가장 크게 작용한 단서는 무엇이었나요?<br>② 집값 변화와 비용을 함께 보면 선택을 어떻게 평가할 수 있나요?<br>③ 다시 선택한다면 어떤 정보를 더 확인할까요?</p></section><details class="disclosure final-calculation"><summary>전체 자산·거래 기록 (저축 포함)</summary><div class="finish-account">현금 ${won(session.cash)} · 대출 잔액 ${won(session.loan)}</div>${finalAuditHtml()}</details><div class="end-actions"><button class="main-button" data-action="restart">다른 선택으로 다시 시작 ↻</button><button class="small-outline" data-action="method">자료 기준 보기</button></div></section>`;
}
function helpHtml() {
  return `<h3>5번 결정하고, 5년을 경험해요</h3><ol><li>2026년부터 2030년까지 매년 정책과 뉴스를 확인합니다.</li><li>집과 예산을 비교하고 선택 이유를 고릅니다.</li><li>매수·보유·매도·갈아타기 후 12개월의 결과를 확인합니다.</li><li>2031년에는 새 거래 없이 최종 결과를 돌아봅니다.</li></ol><details class="disclosure"><summary>실제 자료와 가상 설정</summary><p>실제 단지명·좌표·면적·준공연도와 2020년 1~9월 실거래 표본 요약을 활용합니다. 원본 출처 표기는 국토교통부이며 개별 거래 원장을 별도 대조하지는 않았습니다.</p><p>${safe(story.meta.baseline)}</p><p>${safe(story.meta.reality)}</p></details><details class="disclosure"><summary>가격 변화는 어떻게 정하나요?</summary><p>1년 집값 변화율 = 구매력 + 수요 + 공급. 금리·대출 한도 변화, 지역 수요 단계, 동별 입주 비율과 주변 프로젝트를 사용합니다. 같은 정책 아래에서도 지역에 따라 상승과 하락이 다르게 나타납니다.</p><p>구매력: 금리 변화 1%p당 −3.6%p, 담보 한도 변화 10%p당 +2.16%p, 소득 대비 상환 한도 변화 10%p당 +2.7%p. 수요: 지역 수요 1단계당 +1.35%p와 생활권 효과. 공급: 화면의 동별 입주예정 물량을 게임의 기존 주택 수로 나눈 비율을 사용합니다. 기준 연 1%보다 1%p 높으면 −3.6%p입니다. 입주사업은 물량에 이미 반영되어 중복 가산하지 않습니다.</p><p>이 계수들은 수업용 가정입니다. 현실에서 같은 크기의 영향이 생긴다는 뜻이 아닙니다.</p></details><details class="disclosure"><summary>결과의 손익과 저축 구분</summary><p>부동산 손익은 보유 중 집값 증감에서 대출이자와 거래비용을 뺀 금액입니다. 아직 보유 중인 집의 평가손익도 포함합니다. 소득에서 모은 저축과 임차 주거비는 따로 표시합니다.</p><p>전체 순자산은 시작 현금에 부동산 손익과 소득 저축을 더하고 임차 주거비를 뺀 금액입니다. 결과의 자산 상세에서 확인할 수 있습니다.</p></details><details class="disclosure"><summary>저축·대출·비용 규칙</summary><p>매년 소득은 인물별로 증가합니다. 기본 생활비를 제외한 저축액에서 임차비 또는 대출 상환액을 매달 차감합니다. 대출금리는 각 라운드에서 정해진 값으로 12개월 동안 적용하고 다음 결정 시점에 다시 적용합니다.</p><p>새 대출은 30년 상환, 기존 대출은 남은 만기로 계산합니다. 매수 비용 2.5%, 매도 비용 1.5%, 매수 시 현금 500만원을 남깁니다. 현실의 DSR·세율을 그대로 재현하지 않습니다.</p><p>임차비는 가구별 연 1,080만~1,320만원에서 연 2.5% 증가합니다. 전세 보증금 계약, 보유세, 예금이자, 유지보수비는 따로 계산하지 않습니다. 1년은 게임의 의사결정 간격입니다.</p></details><details class="disclosure"><summary>참고한 과거 사례</summary>${story.meta.references.map(r => `<p><a href="${safe(r.url)}" target="_blank" rel="noopener">${safe(r.title)} ↗</a><br>${safe(r.use)}</p>`).join('')}</details>`;
}
function uiIcon(name) {
 const shapes={search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',home:'<path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/>'};
 return `<span class="ui-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shapes[name]||shapes.home}</svg></span>`;
}
function personaIcon(profile) {
 return `<span class="persona-avatar persona-${safe(profile.id)}" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="17" r="8" fill="currentColor"/><path d="M9 41c0-10 6-15 15-15s15 5 15 15" fill="currentColor"/></svg></span>`;
}
