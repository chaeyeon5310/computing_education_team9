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
<b>이 매물을 판단할 때 확인할 근거</b>\
<span>실제 정보 / 가상 자료 구분</span>\
</div>
 <div class="evidence-grid">
  <div>\
<small>실제 · 2020년 거래 표본</small>\
<b>${h.tradeCount}건</b>\
<em>동일 표본 기준 · 거래가 적으면 불확실성 증가</em>\
</div>
  <div>\
<small>실제 출발가 · 2020년 1~9월</small>\
<b>${won(h.basePrice)}</b>\
<em>원본 실거래 중앙값 · 현재 매물 호가 아님</em>\
</div>
  <div>\
<small>참고 · 표본 내 유사 면적 중앙값</small>\
<b>${won(peers.median)}</b>\
<em>${peers.scope} · ${peers.count}개 표본 / 지역 전체 대표 아님</em>\
</div>
  <div>\
<small>가상 · ${regionKey(h)} 지역 매매거래 변화</small>\
<b>${session.year === 2020 ? '시작 연도' : pct(diff(reg.transactions, last.transactions))}</b>\
<em>광역단위 월간 거래 · 해당 단지 거래량 아님</em>\
</div>
  <div>\
<small>가상 · ${regionKey(h)} 지역 준공물량</small>\
<b>${KR.format(reg.completions)}호</b>\
<em>시도 단위 향후 12개월 공급 전망 · 단지 반경 자료 없음</em>\
</div>
  <div>\
<small>가상 · ${regionKey(h)} 지역 미분양</small>\
<b>${KR.format(reg.unsold)}호</b>\
<em>최근 발표된 시도 단위 가상 값 · 해당 생활권 미분양 아님</em>\
</div>
 </div>\
<p>※ 실제 매수라면 최근 같은 면적·층 실거래, 등기·권리관계, 단지 반경 입주 예정 물량, 주변 전세가율을 추가 확인해야 합니다. 여기에는 원본 데이터가 없어 표시하지 않습니다.</p>\
</div>`;
}

function introHtml() {
  return `<section class="intro-wrap">\
<div class="intro-hero">\
<span class="eyebrow">HOUSING DECISION LAB · V8</span>\
<h1>집을 찾는 것처럼,<br>\
<em>부동산 시장을 플레이하다.</em>\
</h1>\
<p>지도에서 매물을 비교하고, 매년 시장 뉴스를 읽고, 집을 살지 팔지 결정하세요.<br>2020년 실제 실거래가격을 출발점으로 하는 <strong>가상 7년 투자 게임</strong>입니다.</p>\
<div class="hero-pills">\
<span>실제 아파트 위치 610곳</span>\
<span>전용면적·가격·연식 다양</span>\
<span>매년 뉴스 6개 이상</span>\
<span>미래 가격 비공개</span>\
</div>\
</div>\
<div class="intro-bottom">\
<div class="intro-left">\
<div class="section-eyebrow">01 · 투자자 프로필 선택</div>\
<h2>어떤 조건으로 시작할까요?</h2>\
<div class="profile-choices">${personalities.map(p => `<button type="button" data-profile="${p.id}" class="profile-opt ${((session?.profile.id || 'starter') === p.id) ? 'active' : ''}">\
<span class="tiny-tag">${p.tag}</span>\
<strong>${p.name} <small>${p.age}세</small>\
</strong>\
<small>${p.job}</small>\
<span class="profile-finance">현금 ${briefWon(p.cash)} · 연봉 ${briefWon(p.income)}</span>\
<span class="profile-tradeoff">연봉 증가 가정 ${(100 * p.growth).toFixed(1)}%/년 · 연 저축 소득의 ${(100 * p.saveRatio).toFixed(0)}%</span>\
<em>${p.desc}</em>\
</button>`).join('')}</div>\
<button class="main-button" data-action="start">2020년 부동산 탐색 시작 <span>↗</span>\
</button>\
<p class="origin">아파트 실제 위치·2020년 실거래와 가상 시장 시나리오를 명확히 구분해 제공합니다. 계정이나 서버 저장은 필요 없습니다.</p>\
</div>\
<div class="intro-right">\
<div class="intro-caption">게임 화면 미리보기</div>\
<div class="preview-mock">\
<div class="mock-nav">2020년 <span>매물 검색 · 시장 브리핑</span>\
</div>\
<div class="mock-cols">\
<div>\
<div>서울 · 경기 · 인천</div>\
<p>매매 4억 8,000만</p>\
<p>매매 5억 1,500만</p>\
<p>매매 3억 9,000만</p>\
</div>\
<div class="mock-map">\
<span>◉ 5.1억</span>\
<span>◉ 3.9억</span>\
<span>◉ 4.8억</span>\
</div>\
</div>\
</div>\
<div class="intro-foot">실거래를 그대로 재현한 게임이 아닙니다. 실거래는 2020년 기준선이며 이후 수치·사건은 역사적 시장 메커니즘을 모방한 시뮬레이션입니다.</div>\
</div>\
</div>\
</section>`;
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
<div class="my-strip">\
<div>\
<small>현금</small>\
<b>${briefWon(session.cash)}</b>\
</div>\
<div>\
<small>현재 가구 연소득</small>\
<b>${briefWon(currentIncome())}</b>\
</div>\
<div>\
<small>보유 주택</small>\
<b>${h ? safe(h.name) : '무주택'}</b>\
</div>\
<div>\
<small>대출 잔액</small>\
<b>${briefWon(session.loan)}</b>\
</div>\
<div>\
<small>순자산</small>\
<b>${briefWon(assets())}</b>\
</div>\
<div>\
<small>진행</small>\
<b>${y - 2019}/7년</b>\
</div>\
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
<small>실제 도시 위치를 활용한 <strong>가상 프로젝트</strong> · 향후 결과는 비공개</small>\
</div>\
<div class="v8-project-news-cards">${[...newly, ...prior.slice(-3)].map(p => `<article>\
<span>${p.notice === session.year ? '올해 새 소식' : '진행 중'} · ${safe(p.kind)}</span>\
<strong>${safe(p.title)}</strong>\
<p>${safe(p.hint)}</p>\
</article>`).join('')}</div>\
</section>`;
}

function newsHtml() {
  const d = yearData(), prior = story.years[String(Math.max(2020, session.year - 1))], nfmt = n => KR.format(Math.round(n));
  const dif = (n, p, unit = '건') => session.year === 2020 ? '2020년 시나리오 기준' : `${n >= p ? '+' : ''}${nfmt(n - p)}${unit} · 전년 대비`;
  const cards = [
    indCard('최근 발표 월간 아파트 매매거래', `${nfmt(d.transactions)}건`, dif(d.transactions, prior.transactions), '거래량 증가가 실제 구매 수요를 뜻하는지 확인'),
    indCard('향후 12개월 공동주택 준공 전망', `${nfmt(d.completions)}호`, dif(d.completions, prior.completions, '호'), '현재 알려진 입주 예상 일정의 공급 부담 · 확정 실적 아님'),
    indCard('최근 발표 월말 미분양', `${nfmt(d.unsold)}호`, dif(d.unsold, prior.unsold, '호'), '계약되지 않은 공급이 누적되고 있는가'),
    indCard('최근 12개월 전세가격 변화', `${d.rentChangePct > 0 ? '+' : ''}${d.rentChangePct.toFixed(1)}%`, '수도권 아파트 · 전년 대비', '임차 수요와 매수 수요의 변화'),
    indCard('주택담보대출 금리', `${d.rate.toFixed(1)}%`, session.year === 2020 ? '초기 가정' : `${(d.rate - prior.rate) >= 0 ? '+' : ''}${(d.rate - prior.rate).toFixed(1)}%p · 전년 대비`, '대출 원리금 부담과 매수 가능액'),
    indCard('게임 내 LTV 상한', `${Math.round(d.ltv * 100)}%`, '일률 가정 · 현실 규제 아님', '집값 대비 대출 한도 참고')
  ];
  const local = d.local.length ? `<div class="local-watch">\
<b>지역별 이슈 · 계획과 확정은 구분하기</b>\
<div>${d.local.map(n => `<span>\
<strong>${safe(n.area)}</strong> ${safe(n.headline)}</span>`).join('')}</div>\
</div>`: '';
  const regionRows = ['서울', '경기', '인천'].map(r => {
    const b = d.regionalStats[r], pr = prior.regionalStats[r];
    return `<tr>\
<th>${r}</th>\
<td>${nfmt(b.transactions)}건 <small>${session.year > 2020 ? `${pct(100 * ratio(b.transactions, pr.transactions))}` : ''}</small>\
</td>\
<td>${nfmt(b.completions)}호</td>\
<td>${nfmt(b.unsold)}호</td>\
</tr>`;
  }).join('');
  const regional = `<div class="regional-brief">\
<div class="regional-brief-head">\
<strong>지역별 수급·거래 비교</strong>\
<small>실제 통계에 사용되는 단위로 만든 게임 시나리오</small>\
</div>\
<div class="regional-overflow">\
<table>\
<thead>\
<tr>\
<th>지역</th>\
<th>최근 월간 거래</th>\
<th>준공 전망</th>\
<th>최근 미분양</th>\
</tr>\
</thead>\
<tbody>${regionRows}</tbody>\
</table>\
</div>\
</div>`;
  return `<section class="news-section">\
<div class="news-heading">\
<div>\
<span class="eyebrow">${session.year} · 종합 부동산 브리핑</span>\
<h2>${safe(d.title)}</h2>\
<p class="market-explainer">현재 투자자가 알 수 있는 가상의 공개 정보와 향후 공급 전망을 제공합니다. <b>금리·거래·공급·미분양·전세</b>를 함께 보세요. 모든 숫자는 <b>가상 수치</b>입니다.</p>\
</div>\
<div class="news-controls">\
<span class="sim-stamp">실제 지표 아님 · 가상 시나리오 수치</span>\
<button class="small-outline" data-action="news-toggle">${moreNews ? '뉴스 접기' : '모든 뉴스 보기'} ${moreNews ? '⌃' : '⌄'}</button>\
</div>\
</div>\
<div class="indicators indicators-six">${cards.join('')}</div>${moreNews ? `<div class="headline-grid">${d.news.map((n, i) => `<article class="headline-card">\
<div class="news-type">${safe(n.category)} <span>${String(i + 1).padStart(2, '0')}</span>\
</div>\
<strong>${safe(n.headline)}</strong>\
<p>${safe(n.context)}</p>\
<div class="invest-question">판단 포인트 · ${safe(n.question)}</div>\
</article>`).join('')}</div>${regional}${local}` : ''}${neighborhoodWatchHtml()}<div class="decision-guide">\
<b>뉴스를 읽고 무엇을 판단해야 할까?</b>\
<div>\
<span>① 가격</span>\
<p>매물의 출발 실거래 표본과 같은 면적 비교가격이 적절한가?</p>\
</div>\
<div>\
<span>② 수요·공급</span>\
<p>지역 거래량·준공·미분양 신호가 서로 같은 방향인가, 엇갈리는가?</p>\
</div>\
<div>\
<span>③ 대출·위험</span>\
<p>금리 상승과 소득 변동에도 현금과 월 상환액을 감당할 수 있는가?</p>\
</div>\
<small>이 게임은 실거래 시계열·단지별 신규 공급 자료가 없어 투자 판단에 필요한 정보가 일부 누락돼 있습니다. 결론을 단정하지 말고 여러 신호를 비교하세요.</small>\
</div>\
<div class="simulation-note">현실 기준: <a href="https://www.reb.or.kr/r-one/" target="_blank" rel="noopener">한국부동산원 통계</a> · <a href="https://rt.molit.go.kr/" target="_blank" rel="noopener">국토부 실거래가</a> · <a href="https://ecos.bok.or.kr/" target="_blank" rel="noopener">한국은행 금리</a>. 게임 수치는 실제 공표값이 아니며 지역·기간별 통계 범위를 구분해 참고했습니다.</div>\
</section>`;
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
  return `<div class="market-toolbar">\
<div class="search-control">\
<span>⌕</span>\
<input type="search" id="search" placeholder="단지명, 지역 검색" value="${safe(filter.query)}" aria-label="단지명, 지역 검색" />\
</div>\
<select aria-label="지역" data-filter="region">${options(['전체', '서울', '경기', '인천'], filter.region)}</select>\
<select aria-label="주택 유형" data-filter="type">${options(['전체', '아파트'], filter.type)}</select>\
<select aria-label="매매 가격" data-filter="budget">${options(['전체', '4억 미만', '4~7억', '7~10억', '10억 이상'], filter.budget)}</select>\
<select aria-label="전용 면적" data-filter="area">${options(['전체', '60㎡ 미만', '60~85㎡', '85㎡ 이상'], filter.area)}</select>\
<button class="reset-filter" data-action="filter-reset">초기화 ↻</button>\
</div>`;
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
  const matches = getMatches();
  const visible = matches.slice(0, visibleCount);
  return `<aside class="listing-panel">\
<div class="listing-head">\
<div>\
<h3>매물 탐색</h3>\
<p>총 <b>${KR.format(matches.length)}</b>개 · 현재 ${session.year}년</p>\
</div>\
<button class="help-button" data-action="guide" title="게임 도움말">?</button>\
</div>\
<div class="listing-sort">\
<label>\
<input type="checkbox" data-filter="view" ${filter.view === 'map' ? 'checked' : ''}> 지도 안 매물만</label>\
<select aria-label="매물 정렬" data-filter="sort">${[['price', '낮은 가격순'], ['high', '높은 가격순'], ['new', '신축순'], ['area', '넓은 면적순'], ['rise', '최근 상승순']].map(([k, v]) => `<option value="${k}" ${filter.sort === k ? 'selected' : ''}>${v}</option>`).join('')}</select>\
</div>\
<div class="listing-scroll" id="listing-scroll">${visible.length ? visible.map(listCard).join('') : '<p class="none-found">조건에 맞는 매물이 없어요.<br>검색 조건을 바꿔보세요.</p>'}${matches.length > visibleCount ? `<button class="show-more" data-action="more">더 보기 (${Math.min(matches.length - visibleCount, 18)}개) ↓</button>` : ''}</div>\
<div class="list-footer">실제 아파트 단지 610곳 · 주택형별 가격 표본<br>매매 가능 매물이 아닌 <b>가상 거래 기회</b>입니다.</div>\
</aside>`;
}

function localProjectInfoHtml(h) {
  const near = localProjects(h, session.year).filter(e => e.proximity > .17);
  if (!near.length) return '';
  return `<div class="v8-projects">\
<b>현재까지 알려진 생활권 변수 <small>가상 계획 · 실제 개발계획 아님</small>\
</b>${near.slice(0, 3).map(e => `<div>\
<span>${safe(e.kind)}</span>\
<strong>${safe(e.title)}</strong>\
<small>${safe(e.hint)}</small>\
</div>`).join('')}</div>`;
}

function detailHtml(h) {
  if (!h) return `<div class="map-placeholder">\
<span>⌖</span>\
<b>지도에서 매물을 선택하세요</b>\
<p>가격 핀 또는 왼쪽 매물 카드를 눌러 상세 정보를 확인할 수 있어요.</p>\
</div>`;
  const price = valueAt(h, session.year), hist = historyFor(h, session.year), growth = (price / valueAt(h, Math.max(2020, session.year - 1)) - 1) * 100;
  const ev = localEvent(h), q = quote(h), owned = session.houseId === h.id;
  return `<div class="detail-panel">\
<div class="detail-top">\
<span>${safe(h.type)} · ${h.reality.startsWith('가상') ? '가상 매물' : '실제 단지'}</span>\
<button class="detail-close" data-action="close-detail">×</button>\
</div>\
<h3>${safe(h.name)}</h3>\
<p class="address">${safe(h.address)}</p>\
<div class="detail-price">\
<small>현재 ${session.year}년 게임 매매가</small>\
<strong>${won(price)}</strong>\
<span>${session.year === 2020 && h.type === '아파트' ? '2020년 실거래 중앙값' : '가상 시나리오 가격'}</span>\
</div>\
<div class="detail-facts">\
<div>\
<small>전용면적</small>\
<b>${h.area}㎡</b>\
</div>\
<div>\
<small>준공연도</small>\
<b>${h.built}년</b>\
</div>\
<div>\
<small>지역</small>\
<b>${safe(h.district)}</b>\
</div>\
</div>\
<div class="detail-graph">\
<div class="graph-heading">\
<strong>현재까지 공개된 가격 흐름</strong>\
<small>미래 가격은 비공개</small>\
</div>${lineChart(hist)}<div class="chart-years">\
<span>${hist[0].year}년</span>\
<span>${hist.at(-1).year}년</span>\
</div>\
<small class="graph-caption">${session.year === 2020 ? '2020년 실거래 기준점 · 이전 연도 데이터 미제공' : '2020년 실거래 기준점 이후는 가상 가격 흐름'}</small>\
</div>${localProjectInfoHtml(h)}${ev ? `<div class="area-insight">\
<b>생활권 정보 · ${safe(ev.topic)}</b>\
<p>${safe(ev.headline)}</p>\
<small>올해의 영향은 다른 변수와 결합되어 가격에 반영됨</small>\
</div>`: ''}${basisEvidenceHtml(h)}${session.year > 2020 ? `<div class="price-reasons">\
<b>올해 게임 내 가격 변동 원인 <small>검증된 인과효과 아님</small>\
</b>${componentsFor(h, session.year).filter(x => Math.abs(x.value) > .00005).map(x => `<div>\
<span>${safe(x.label)}</span>\
<strong>${displayRate(x.value)}</strong>\
</div>`).join('')}<p class="model-disclaimer">이 수치는 게임이 정한 계수의 계산 결과입니다. 실제 한국 시장에서 추정·검증된 인과효과가 아닙니다.</p>\
</div>`: ''}<div class="detail-finance">\
<div>\
<span>최대 대출 가정</span>\
<b>${won(q.limit)}</b>\
</div>\
<div>\
<span>필요 대출</span>\
<b>${won(q.needLoan)}</b>\
</div>\
<div>\
<span>월 상환액 가정</span>\
<b>${won(q.month)}</b>\
</div>\
</div>\
<div class="budget-ribbon ${q.can ? 'available' : 'not-yet'}">${q.can ? '✓ 현재 조건으로 매수 가능' : `현재 부족한 자기자금 ${won(q.shortfall)} · 저축·갈아타기로 도전`}</div>${session.phase === 'decision' ? `${owned ? '<button class="btn-muted" disabled>현재 보유 중인 집</button>' : `<button class="main-button buy-cta" data-action="buy" data-id="${safe(h.id)}">${session.houseId ? '이 집으로 갈아타기' : '이 집 매수하기'} ${q.can ? '↗' : '· 예산 확인'}</button>`}` : '<div class="detail-disabled">다음 해로 진행하면 거래할 수 있어요.</div>'}<small class="data-caveat">※ 실제 단지·위치는 국토부 자료 기반. 2020년 가격 외 연도별 가격·뉴스·통계 숫자는 가상. 교육용 투자이며 실제 매물 제안이 아닙니다.</small>\
</div>`;
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
  return `<div class="map-wrapper">\
<div id="map" aria-label="서울 경기 인천 실제 지도 및 매물 위치">\
</div>\
<div class="map-tip">마우스 휠·트랙패드로 확대/축소 · 지도를 드래그해 이동 <span>● 실제 아파트 위치</span>\
</div>\
<div class="detail-position" id="detail-position">${detailHtml(byId(selected))}</div>\
</div>`;
}

function decisionHtml() {
  const p = session, held = byId(p.houseId);
  if (p.phase !== 'decision') return `<div class="decision-bar reveal-mode">\
<div>\
<span class="eyebrow">투자 결정 완료</span>\
<h3>${safe(p.lastDecision || '올해 선택 완료')}</h3>\
<p>다음 해에는 새 시장 지표와 가상 거래가격이 공개됩니다.</p>\
</div>\
<button class="main-button" data-action="advance">${p.year === 2026 ? '최종 결과 · 선택 이유 분석 보기' : '다음 연도 결과 보기 →'}</button>\
</div>`;
  return `<div class="decision-bar">\
<div class="decision-context">\
<span class="eyebrow">${p.year}년 의사결정</span>\
<h3>${held ? '보유할까, 팔까, 갈아탈까?' : '어느 집을 살까, 기다릴까?'}</h3>\
<p>${held ? safe(held.name) + ' 보유 · 대출 ' + briefWon(p.loan) : '매물을 비교한 후 매수 또는 관망을 선택해 보세요.'} <span class="cash-alert">${cashEmergency() ? '※ 현금 여유가 적어요.' : ''}</span>\
</p>\
<label class="reason-picker">올해 내 판단의 핵심 근거 <select id="decision-reason">${Object.entries(EXPLANATION_CATEGORIES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select>\
</label>\
</div>\
<div class="decision-buttons">${held ? `<button data-action="hold" class="decision-btn">⌂ 계속 보유</button>\
<button data-action="sell" class="decision-btn">↗ 매도</button>\
<button data-action="focus-list" class="decision-btn accented">⇄ 갈아타기</button>`: `<button data-action="hold" class="decision-btn">◷ 현금 보유</button>\
<button data-action="focus-list" class="decision-btn accented">⌂ 아파트 찾기</button>`}</div>\
</div>`;
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
  return `${topHtml()}${passageHtml()}${newsHtml()}<section class="market-section">\
<div class="market-heading">\
<div>\
<span class="eyebrow">MAP · PROPERTY SEARCH</span>\
<h2>지도에서 매물 찾기</h2>\
</div>\
<span class="source-pill">ⓘ 실제 단지·좌표 / 2020 실거래 기준 / 이후 가상 가격</span>\
</div>${marketToolbar()}<div class="map-layout">${listingPanel()}${mapContent()}</div>\
</section>${decisionHtml()}<section class="bottom-note">실제 아파트 이름·주소·지도 좌표를 사용하지만 거래 가능한 매물 공고는 아닙니다. 각 단지의 표본 면적·가격을 활용한 학습용 투자 기회입니다. ${session.year === 2020 ? '현재 가격은 실제 아파트의 2020년 1~9월 중위 거래가격입니다.' : '2021~2026년 개별 아파트 가격은 실제 거래값이 아닌 규칙 기반 가상 가격입니다.'}</section>`;
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
<small>여기 표시한 %p는 <b>게임 계산식에 따른 기여분</b>입니다. 실제 인과관계나 현실의 단지별 상승 이유가 검증됐다는 뜻이 아닙니다. 시장 상한·다른 요인까지 합친 전체 분해는 매물 상세에서 볼 수 있습니다.</small>\
</div>`;
}

function annualDecisionReview() {
  return `<section class="final-audit">\
<div class="section-eyebrow">DECISION JOURNAL</div>\
<h3>매년 무엇을 보고 선택했나?</h3>\
<p>선택 당시 알 수 있었던 정보와 다음 해에 드러난 결과는 구분해야 합니다. 사후에 맞았다고 당시 선택이 반드시 옳았던 것도, 틀렸다고 비합리적이었던 것도 아닙니다.</p>
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
<div class="section-eyebrow">PERFORMANCE ATTRIBUTION</div>\
<h3>집값 말고, 실제 게임 자산은 왜 변했나?</h3>\
<p>매년의 가격 변동, 이자, 주거비, 거래비용을 구분한 <b>게임 내부 회계</b>입니다. 현실의 세금·투자수익을 재현한 정산이 아닙니다.</p>
 <div class="audit-ledger">\
<div>\
<span>시작 현금</span>\
<b>${won(session.initialCash)}</b>\
</div>\
<div>\
<span>6년간 저축 (페르소나별 소득 성장 가정)</span>\
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
<small>프로필별 소득 성장·연 저축과 임차비 상승 가정, 예금이자·물가·세금 제외. 게임 내부 비교이며 최적 전략 추천이 아닙니다.</small>\
</div>
 <h3>내가 보유한 집의 가격은 왜 움직였나?</h3>${holding.length ? holding.map(explainHoldingHtml).join('') : '<div class="audit-empty">보유한 아파트가 없어서 집값 기여분은 없습니다. 대기 전략에서 중요한 것은 저축과 임차비, 매수 기회비용입니다.</div>'}
 <div class="audit-limit">\
<b>이 결과로 알 수 있는 것과 없는 것</b>\
<p>\
<strong>알 수 있는 것</strong> · 이 게임이 어떤 입력값·가정·가중치로 결과를 냈는지, 어느 해에 무엇이 유리하거나 불리하게 작용했는지.</p>\
<p>\
<strong>알 수 없는 것</strong> · 해당 실제 아파트가 현실에서 왜 올랐는지, 특정 뉴스의 실제 인과효과, 다음 시장을 맞힐 확률. 세부 생활권 사건과 가구 소득 성장도 모두 가상 가정이며, 현재는 검증된 가격예측·투자추천 모델이 아닙니다.</p>\
</div>
 </section>${annualDecisionReview()}`;
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
<div class="section-eyebrow">MARKET DIVERGENCE</div>\
<h3>같은 7년, 모든 집이 똑같이 움직이지 않았어요</h3>\
<p>아래는 실제 아파트 위치와 2020년 실거래 기준가에서 출발한 <b>가상 가격 경로</b> 비교입니다. 어느 단지가 더 많이 움직였는지, 왜 그랬는지 위의 연간 요인 분해와 함께 확인하세요.</p>\
<div class="v8-market-compare">${sampled.map(h => `<div>\
<span>${safe(h.district)} · ${safe(h.name)}</span>\
<b class="${rate(h) < 0 ? 'down' : 'up'}">${pct(rate(h))}</b>\
</div>`).join('')}</div>\
<small>이 수익률은 실제 투자 성과가 아닙니다. 가상 개발·공급·유동성 시나리오 결과입니다.</small>\
</section>`;
}

function finalHtml() {
  const hist = session.yearly || [], growth = assets() - session.initialCash;
  return `<section class="end-screen">\
<span class="eyebrow">2020 — 2026 · YOUR DECISIONS</span>\
<h1>7년간의 선택, 그 이유까지 분석합니다.</h1>\
<p>최종 금액만이 아니라 어느 해에 어떤 변수가 영향을 주었는지 되짚어 보세요.</p>\
<div class="final-metrics">\
<div>\
<small>최종 순자산</small>\
<b>${won(assets())}</b>\
</div>\
<div>\
<small>초기 대비 변화</small>\
<b>${won(growth)}</b>\
</div>\
<div>\
<small>총 거래 횟수</small>\
<b>${session.transactions.length}회</b>\
</div>\
<div>\
<small>최종 보유주택</small>\
<b>${safe(byId(session.houseId)?.name || '없음')}</b>\
</div>\
</div>\
<div class="final-graph">\
<h3>연도별 순자산 변화</h3>${lineChart(hist.map(v => ({ year: v.year, value: v.worth })))}</div>${marketDifferenceHtml()}${finalAuditHtml()}<div class="final-transactions">\
<h3>7년간 거래 기록</h3>${session.transactions.map(t => `<div>\
<b>${t.year}년</b>\
<span>${safe(t.kind === 'forced' ? '강제 매도' : t.kind === 'sell' ? '매도' : t.kind === 'switch' ? '갈아타기' : '매수')} · ${safe(byId(t.id)?.name || '')}</span>\
<strong>${won(t.price)}</strong>\
</div>`).join('') || '<p>매수·매도 내역 없음</p>'}</div>\
<div class="end-actions">\
<button class="main-button" data-action="restart">다른 전략으로 다시 플레이 ↻</button>\
<button class="small-outline" data-action="method">데이터·가정·검증 범위</button>\
</div>\
<p class="final-disclaimer">2020년 출발 실거래가격을 제외한 시장 숫자와 결과는 가상입니다. 결과를 투자 전망으로 사용하지 마세요.</p>\
</section>`;
}

function helpHtml() {
  return `<p>이 게임은 <b>실제 대한민국 부동산 데이터의 특성</b>과 과거 시장에서 관찰된 <b>금리·거래량·공급·규제 변화의 메커니즘</b>을 이용해 구성한 가상 시나리오입니다.</p>\
<ol>\
<li>매년 주어진 뉴스와 매물을 자유롭게 살펴봅니다.</li>\
<li>매수·보유·매도·갈아타기 중 한 가지를 결정합니다.</li>\
<li>다음 연도로 넘어가면 새로운 가격과 기사가 표시됩니다.</li>\
<li>2026년까지의 순자산 변화와 거래 기록을 비교합니다.</li>\
</ol>\
<div class="help-alert">\
<b>실제 데이터</b>: 원본 2020년 1~9월 아파트 실거래 중앙값 610개, 단지 위치/면적/연식<br>\
<b>가상 데이터</b>: 2021~2026년 가격 및 모든 뉴스 헤드라인·경제 통계 시나리오 수치·제도 단순화</div>\
<p>3개의 페르소나는 고소득·저현금, 저소득·고현금, 맞벌이 중간형으로 장단점이 다릅니다. 매년 소득 성장 및 저축이 적용됩니다. 처음에는 고가주택이 불가능해도 갈아타기 후 재도전할 수 있지만, 20억~30억원대 주택은 자금이 부족하면 현실적으로 살 수 없습니다.</p>\
<p>2026년 실제 매매가격을 소급 사용해 게임 가격을 계산하지 않으므로 결과를 미리 아는 문제를 피했습니다. 시나리오는 난수가 아니라 거래량·준공·미분양·금리·전세·단지 특성에 연동된 고정 규칙으로 계산합니다.</p>\
<p>\
<strong>근거 한계:</strong> 거래량·금리·공급이 가격에 영향을 줄 수 있다는 방향은 선행연구와 실제 통계에서 검토할 수 있지만, 게임의 생활권·면적·연식·공급 사건별 변동 계수는 실거래에서 추정한 값이 아닙니다. 실제 지역별 상관관계나 인과효과를 주장할 수 없습니다. 게임은 단지별 주변 입주, 실거래 연간 추세, 같은 동·층 실거래 표본을 아직 제공하지 않습니다.</p>\
<p class="method-links">\
<a href="https://rt.molit.go.kr/" target="_blank" rel="noopener">국토교통부 실거래가 ↗</a>\
<a href="https://www.reb.or.kr/r-one/" target="_blank" rel="noopener">한국부동산원 R-ONE ↗</a>\
<a href="https://ecos.bok.or.kr/" target="_blank" rel="noopener">한국은행 ECOS ↗</a>\
</p>`;
}
