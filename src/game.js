/**
 * 게임 진행 및 거래 처리
 * 연도 진행과 매수·매도·보유·갈아타기 결정 로직을 담당한다.
 */
// 게임의 의사결정과 연도 진행을 처리합니다. 새 금융 규칙은 finance.js에서 수정하세요.


function render(keep = false) {
  if (map) {
    mapState = { center: map.getCenter(), zoom: map.getZoom() };
    map.off();
    map.remove();
    map = null;
  }
  const el = $('#app');
  el.innerHTML = screen === 'intro' ? introHtml() : screen === 'finish' ? finalHtml() : appHtml();
  if (screen === 'game') initMap();
  save();
}

function initialGame(profile) {
  session = {
    profile,
    year: 2020,
    cash: profile.cash,
    initialCash: profile.cash,
    houseId: null,
    loan: 0,
    rate: 0,
    hasBought: false,
    phase: 'decision',
    lastDecision: '',
    transactions: [],
    yearly: [],
    passages: [],
    lastPassage: null
  };
  screen = 'game';
  selected = null;
  filter = { query: '', region: '전체', type: '전체', budget: '전체', area: '전체', sort: 'price', view: 'all' };
  mapState = null;
  visibleCount = 18;
  moreNews = true;
  render();
  window.scrollTo({ top: 0 });
}

function decision(action, target) {
  if (session.phase !== 'decision') return;
  const y = session.year, p = session, prior = byId(p.houseId);
  let description = '';
  if (action === 'hold') description = prior ? '보유 유지' : '현금 보유 · 매수 대기';
  if (action === 'sell') {
    if (!prior) return toast('매도할 집이 없어요.');
    const sale = valueAt(prior, y) * .985 - p.loan;
    if (p.cash + sale < 0) return toast('매도 후 대출을 상환할 자금이 부족해요.');
    p.cash += sale;
    p.houseId = null;
    p.loan = 0;
    p.rate = 0;
    description = prior.name + ' 매도';
    p.transactions.push({ year: y, kind: 'sell', id: prior.id, price: valueAt(prior, y), sellCost: valueAt(prior, y) * .015, buyCost: 0 });
  }
  if (action === 'buy') {
    const h = byId(target);
    if (!h) return toast('매물을 선택해 주세요.');
    const q = quote(h);
    if (!q.can) return toast('현금과 대출 한도로 매수하기 어렵습니다. 다른 집을 선택해 보세요.');
    p.cash = q.remaining;
    p.loan = q.needLoan;
    p.rate = annualRate(y);
    p.houseId = h.id;
    p.hasBought = true;
    description = (prior ? '갈아타기 → ' : '매수 → ') + h.name;
    p.transactions.push({
      year: y,
      kind: prior ? 'switch' : 'buy',
      id: h.id,
      price: q.price,
      loan: q.needLoan,
      buyCost: q.fee,
      sellCost: prior ? valueAt(prior, y) * .015 : 0
    });
  }
  p.lastDecision = description;
  p.phase = 'reveal';
  const reasonEl = $('#decision-reason');
  const reason = EXPLANATION_CATEGORIES[reasonEl?.value] || '기록되지 않음';
  p.yearly.push({ year: y, decision: description, reason, worth: assets(), cash: p.cash, houseId: p.houseId });
  save();
  render();
  toast(description + ' 확정');
}

function advance() {
  if (session.phase !== 'reveal') return;
  if (session.year === 2026) {
    screen = 'finish';
    render();
    window.scrollTo(0, 0);
    return;
  }
  const y = session.year, oldWorth = assets(), oldHouse = byId(session.houseId);
  const oldPrice = oldHouse ? valueAt(oldHouse, y) : 0;
  // Money flow: explicit savings net of basic living costs, plus housing cost. This is a deliberately simplified classroom model.
  const saved = savingsForYear(y);
  const yearlyRent = oldHouse ? 0 : rentForYear(y);
  session.cash += saved - yearlyRent;
  let paid = 0, interest = 0;
  const newRate = annualRate(y + 1);
  for (let i = 0; i < 12 && session.loan > 0; i++) {
    const mPay = monthlyPay(session.loan, newRate, 30 - (y - 2020)), mInterest = session.loan * newRate / 12;
    const principal = Math.min(session.loan, Math.max(0, mPay - mInterest));
    session.loan = Math.max(0, session.loan - principal);
    paid += mInterest + principal;
    interest += mInterest;
  }
  session.cash -= paid;
  session.rate = newRate;
  session.year = y + 1;
  session.phase = 'decision';
  let forcedSale = false;
  if (session.cash < 0 && session.houseId) {
    const liquidated = byId(session.houseId), sellAt = valueAt(liquidated, y + 1), cost = sellAt * .015;
    session.cash += sellAt - cost - session.loan;
    session.transactions.push({ year: y + 1, kind: 'forced', id: liquidated.id, price: sellAt, buyCost: 0, sellCost: cost });
    session.houseId = null;
    session.loan = 0;
    session.rate = 0;
    forcedSale = true;
  }
  const afterWorth = assets();
  session.lastPassage = {
    from: y,
    to: y + 1,
    heldId: oldHouse?.id || null,
    delta: afterWorth - oldWorth,
    houseDelta: oldHouse ? valueAt(oldHouse, y + 1) - oldPrice : 0,
    saved,
    rent: yearlyRent,
    paid,
    interest,
    forcedSale
  };
  session.passages = session.passages || [];
  session.passages.push(session.lastPassage);
  visibleCount = 18;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast(forcedSale ? `현금이 부족해 ${y + 1}년 주택이 강제 매도됐습니다.` : `${y + 1}년입니다. 보유 자산 변화 ${won(session.lastPassage.delta)}`);
}

function modal(title, inner) {
  $('#dialog-title').textContent = title;
  $('#dialog-body').innerHTML = inner;
  $('#modal').showModal();
}

function openBuy(id) {
  const h = byId(id);
  if (!h || session.phase !== 'decision') return;
  const q = quote(h);
  selected = id;
  updateSelectedUI();
  const stress = savingsForYear(session.year) - q.month * 12;
  modal(q.old ? '갈아타기 검토' : '매수 자금 검토', `<div class="quote-name">${safe(h.name)}</div>\
<div class="quote-rows">\
<div>\
<span>올해 매수가</span>\
<b>${won(q.price)}</b>\
</div>${q.old ? `<div>\
<span>기존 주택 매도 후 순유입</span>\
<b>${won(q.saleProceeds)}</b>\
</div>`: ''}<div>\
<span>취득·중개 등 가상 거래비용(2.5%)</span>\
<b>${won(q.fee)}</b>\
</div>\
<div>\
<span>필요한 대출</span>\
<b>${won(q.needLoan)}</b>\
</div>\
<div>\
<span>가능한 대출 상한</span>\
<b>${won(q.limit)}</b>\
</div>\
<div>\
<span>필요 자기자금 (대출한도 기준)</span>\
<b>${won(q.ownNeeded)}</b>\
</div>${q.can ? '' : `<div>\
<span>지금 부족한 자기자금</span>\
<b>${won(q.shortfall)}</b>\
</div>`}<div>\
<span>예상 월 납입액</span>\
<b>${won(q.month)}</b>\
</div>\
<div>\
<span>연 저축 가능액 − 연 원리금</span>\
<b class="${stress < 0 ? 'down' : 'up'}">${won(stress)}</b>\
</div>\
<div>\
<span>매수 후 남는 현금</span>\
<b>${won(q.remaining)}</b>\
</div>\
</div>\
<div class="quote-status ${q.can ? 'ok' : 'fail'}">${q.can ? '예산 조건 충족' : `지금은 ${won(q.shortfall)} 부족 · 이후 저축/기존 주택 매도 후 재도전`}</div>\
<p class="quote-help">실제 금융상품의 자격·금리·정책과 다르게 단순화한 교육용 계산입니다. 매년 현금이 부족해지면 강제 매도가 발생할 수 있습니다.</p>${q.can ? `<button class="main-button" data-action="confirm-buy" data-id="${safe(id)}">${q.old ? '갈아타기' : '매수'} 확정 →</button>` : '<button class="small-outline" data-action="close-modal">다른 매물 찾기</button>'}`);
}
