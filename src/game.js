/**
 * 게임 진행 및 거래 처리
 * 연도 진행과 매수·매도·보유·갈아타기 결정 로직을 담당한다.
 */
// 게임의 의사결정과 연도 진행을 처리합니다. 새 금융 규칙은 finance.js에서 수정하세요.


function render(keep = false) {
  const scrollY = window.scrollY;
  if (map) {
    mapState = { center: map.getCenter(), zoom: map.getZoom() };
    map.off();
    map.remove();
    map = null;
  }
  const el = $('#app');
  document.body.classList.toggle('game-active', screen === 'game');
  el.innerHTML = screen === 'intro' ? introHtml() : screen === 'finish' ? finalHtml() : appHtml();
  if (screen === 'game' && $('#map')) initMap();
  window.scrollTo({ top: scrollY, behavior: 'instant' });
  syncDecisionDock();
  syncNewsToggle();
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
  classroomUI = { news: {}, reasons: {}, choices: {}, policyRead: {}, showMap: false };
  render();
  window.scrollTo({ top: 0 });
}

function decision(action, target) {
  if (session.phase !== 'decision') return;
  if (!classroomUI.policyRead?.[session.year]) return toast('올해 금리와 대출 한도를 먼저 확인해 주세요.');
  if (!EXPLANATION_CATEGORIES[classroomUI.reasons[session.year]]) return toast('선택 이유를 먼저 골라주세요.');
  const y = session.year, p = session, prior = byId(p.houseId);
  if (!['hold', 'sell', 'buy'].includes(action)) return;
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
  const reason = EXPLANATION_CATEGORIES[classroomUI.reasons[y]] || '기록되지 않음';
  p.yearly.push({ year: y, decision: description, reason, worth: assets(), cash: p.cash, houseId: p.houseId });
  save();
  render();
  toast(description + ' 확정');
}

function advance() {
  if (session.phase === 'decision') {
    const choice = classroomUI.choices?.[session.year];
    if (!choice || !classroomUI.reasons[session.year]) return toast('보유 또는 매도와 선택 이유를 골라주세요.');
    decision(choice);
  }
  if (session.phase !== 'reveal') return;
  if (session.year === 2026) {
    screen = 'finish';
    render();
    window.scrollTo({ top: 0, behavior: 'instant' });
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
  $('#annual-policy')?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
  classroomUI.pendingPolicyFocus = true;
  modal(`${y + 1}년 결과`, `<div class="round-result"><h3>${forcedSale ? '현금이 부족해 집이 매도됐어요.' : '다음 라운드가 열렸어요!'}</h3><p>${oldHouse ? safe(oldHouse.name) + ': ' + won(oldPrice) + ' → ' + won(valueAt(oldHouse, y + 1)) : '현금을 보유하며 다음 매수 기회를 기다렸어요.'}</p><p>순자산 변화 <b>${won(session.lastPassage.delta)}</b></p><p>저축 ${won(saved)} · 주거비 ${won(yearlyRent)} · 대출 상환 ${won(paid)}</p>${oldHouse ? '<p>집값 변화 요인: ' + componentsFor(oldHouse, y + 1).map(f => safe(f.label) + ' ' + displayRate(f.value)).join(' / ') + '</p>' : ''}<button class="main-button" data-action="close-modal">이어서 선택하기</button></div>`);
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
  modal(q.old ? '다른 집으로 갈아타기' : '매수 전 예산 확인', `<div class="quote-name">${safe(h.name)}</div><div class="quote-rows"><div><span>집값</span><b>${won(q.price)}</b></div>${q.old ? `<div><span>지금 집을 팔고 대출을 갚으면</span><b>${won(q.saleProceeds)}</b></div>` : ''}<div><span>빌릴 돈</span><b>${won(q.needLoan)}</b></div><div><span>매달 갚을 돈</span><b>${won(q.month)}</b></div><div><span>거래 후 남는 현금</span><b>${won(q.remaining)}</b></div></div><div class="quote-status ${q.can ? 'ok' : 'fail'}">${q.can ? '게임 예산 조건을 충족해요.' : `추가 자금 ${won(q.shortfall)}이 필요해요.`}</div><details><summary>예산 계산 규칙</summary><p>매수 비용은 집값의 2.5%, 매도 비용은 1.5%입니다. 대출은 올해 집값의 ${Math.round(yearData().ltv*100)}% 및 연간 상환액이 소득의 30% 이내로 제한하며, 현금 1,500만원을 남깁니다. 대출 상환은 30년 원리금균등 방식입니다.</p></details><p class="quote-help">매년 저축에서 주거비 또는 대출 상환액이 빠집니다. 현금이 부족해지면 보유한 집이 강제 매도될 수 있어요.</p>${q.can ? `<button class="main-button" data-action="confirm-buy" data-id="${safe(id)}">${q.old ? '갈아타기' : '매수'} 확정</button>` : '<button class="small-outline" data-action="close-modal">다른 집 찾기</button>'}`);
}
