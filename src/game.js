/** Decisions and 12-month transitions. */
function render(keep = false) {
  const scrollY = keep ? window.scrollY : 0;
  if (map) { mapState = { center: map.getCenter(), zoom: map.getZoom() }; map.off(); map.remove(); map = null; }
  document.body.classList.toggle('game-active', screen === 'game');
  $('#app').innerHTML = screen === 'intro' ? introHtml() : screen === 'finish' ? finalHtml() : appHtml();
  if (screen === 'game' && $('#map')) initMap();
  window.scrollTo({ top: scrollY, behavior: 'instant' });
  syncDecisionDock(); syncNewsToggle(); save();
}
function initialGame(profile) {
  session = { profile, year: START_YEAR, cash: profile.cash, initialCash: profile.cash, houseId: null, loan: 0, loanMonths: 0, rate: 0, phase: 'decision', lastDecision: '', transactions: [], yearly: [], passages: [], lastPassage: null };
  screen = 'game'; selected = null; filter = defaultFilter(); mapState = null; visibleCount = 18; classroomUI = defaultUI(); render();
}
function decision(action, target) {
  if (!session || session.phase !== 'decision') return false;
  if (!classroomUI.policyRead[session.year]) { toast('이번 정책을 먼저 확인해 주세요.'); return false; }
  if (!reasonKeys(classroomUI.reasons[session.year]).length) { toast('선택 이유를 골라주세요.'); return false; }
  const y = session.year, p = session, prior = byId(p.houseId), worthBefore = assets();
  if (!['hold', 'sell', 'buy'].includes(action)) return false;
  let description;
  if (action === 'hold') description = prior ? '계속 보유' : '현금 보유';
  if (action === 'sell') {
    if (!prior) return false;
    const price = valueAt(prior, y), sale = price * .985 - p.loan;
    if (p.cash + sale < 0) { toast('집을 팔아도 대출을 갚을 자금이 부족해요.'); return false; }
    p.cash += sale; p.houseId = null; p.loan = 0; p.loanMonths = 0; p.rate = 0;
    p.transactions.push({ year: y, kind: 'sell', id: prior.id, price, sellCost: price * .015, buyCost: 0 });
    description = prior.name + ' 매도';
  }
  if (action === 'buy') {
    const h = byId(target); if (!h || h.id === p.houseId) return false;
    const q = quote(h); if (!q.can) { toast('현재 예산으로 살 수 없는 집이에요.'); return false; }
    p.cash = q.remaining; p.loan = q.needLoan; p.loanMonths = q.needLoan > 0 ? 360 : 0; p.rate = annualRate(y); p.houseId = h.id;
    p.transactions.push({ year: y, kind: prior ? 'switch' : 'buy', id: h.id, price: q.price, loan: q.needLoan, buyCost: q.fee, sellCost: prior ? valueAt(prior, y) * .015 : 0 });
    description = (prior ? '갈아타기 · ' : '매수 · ') + h.name;
  }
  p.lastDecision = description; p.phase = 'reveal';
  p.yearly.push({ year: y, decision: description, reason: reasonKeys(classroomUI.reasons[y]).map(k => EXPLANATION_CATEGORIES[k]).join(' · '), worthBefore, worth: assets(), cash: p.cash, houseId: p.houseId });
  save(); render(true); toast('선택을 확정했어요. 1년 뒤 결과를 확인해 보세요.'); return true;
}
function advance() {
  if (!session || session.phase === 'finished') return;
  if (session.phase === 'decision' && !decision(classroomUI.choices[session.year])) return;
  if (session.phase !== 'reveal') return;
  const from = session.year, result = simulatePeriod(session, from);
  session = result.state; session.lastPassage = result.log; session.passages.push(result.log);
  session.phase = session.year === END_YEAR ? 'finished' : 'decision';
  screen = session.phase === 'finished' ? 'finish' : 'game';
  selected = null; visibleCount = 18; render();
  modal(`${from} → ${session.year} · 1년 결산`, periodResultHtml(result.log));
}
function modal(title, inner) {
  $('#dialog-title').textContent = title; $('#dialog-body').innerHTML = inner;
  if (!$('#modal').open) $('#modal').showModal();
}
function openBuy(id) {
  const h = byId(id); if (!h || session.phase !== 'decision' || h.id === session.houseId) return;
  const q = quote(h), budget = budgetPreview(h);
  modal(q.old ? '갈아타기 전 예산 확인' : '매수 전 예산 확인', `<div class="quote-name">${safe(h.name)}</div><div class="quote-rows"><div><span>게임 매수가</span><b>${won(q.price)}</b></div>${q.old ? `<div><span>기존 집 매도·대출 상환 후</span><b>${won(q.saleProceeds)}</b></div>` : ''}<div><span>필요 대출 / 최대 한도</span><b>${won(q.needLoan)} / ${won(q.limit)}</b></div><div><span>월 상환액</span><b>${won(q.month)}</b></div><div><span>매수 후 현금</span><b>${won(q.remaining)}</b></div><div class="budget-forecast"><span>1년 뒤 예상 현금</span><b>${won(budget.endCash)}</b></div></div><p class="subtle">이번 금리와 소득·저축 가정으로 계산한 현금 흐름입니다. 집값 변동은 포함하지 않습니다.</p><div class="quote-status ${q.can ? 'ok' : 'fail'}">${!q.can ? `추가 자금 ${won(q.shortfall)} 필요` : budget.lowestCash < 0 ? '중간에 현금 부족이 예상돼요. 예산을 다시 살펴보세요.' : '매수 가능 · 1년간 현금 유지 예상'}</div><details class="disclosure"><summary>대출·거래비용 계산</summary><p>매수 비용 2.5%, 매도 비용 1.5%, 최소 남길 현금 500만원. 신규 대출은 30년 원리금균등 상환이며 담보 한도와 소득 대비 상환 한도를 함께 적용합니다. 금리는 1년 단위로 다시 적용합니다.</p><p>월별 현금이 부족하면 그 시점의 게임 가격으로 강제 매도되고, 이후 임차 주거비가 반영됩니다.</p></details>${q.can ? `<button class="main-button modal-primary" data-action="confirm-buy" data-id="${safe(id)}">${q.old ? '갈아타기' : '매수'} 확정</button>` : '<button class="small-outline modal-primary" data-action="close-modal">다른 집 찾기</button>'}`);
}
