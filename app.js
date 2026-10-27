/** Entry point and accessible UI events. */
async function boot() {
  try {
    const [lr, sr] = await Promise.all([fetch('./data/listings.json'), fetch('./data/classroom-scenario.json')]);
    if (!lr.ok || !sr.ok) throw Error('게임 자료를 불러오지 못했어요. 페이지를 새로고침해 주세요.');
    const l = await lr.json(); story = await sr.json(); listings = l.listings;
    if (story.meta.startYear !== START_YEAR || story.meta.endYear !== END_YEAR || story.meta.periodMonths !== PERIOD_MONTHS) throw Error('게임과 시나리오의 기간 설정이 다릅니다.');
    restore(); render();
  } catch (e) {
    $('#app').innerHTML = `<div class="error"><h2>게임을 준비하지 못했어요</h2><p>${safe(e.message)}</p></div>`;
    console.error(e);
  }
}
function resetGame() {
  session = null; screen = 'intro'; selected = null; mapState = null; classroomUI = defaultUI(); filter = defaultFilter(); render();
}
$('#app').addEventListener('click', e => {
  const profile = e.target.closest('[data-profile]');
  if (profile) {
    session = { profile: personalities.find(p => p.id === profile.dataset.profile) };
    $$('.profile-opt').forEach(b => { const active = b.dataset.profile === session.profile.id; b.classList.toggle('active', active); b.setAttribute('aria-pressed', String(active)); });
    return;
  }
  const b = e.target.closest('[data-action]'); if (!b || b.disabled) return;
  const action = b.dataset.action, id = b.dataset.id;
  if (action === 'policy-focus') {
    $('#annual-policy')?.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    $('#policy-read')?.focus({ preventScroll: true }); return;
  }
  if (action === 'start') initialGame(session?.profile || personalities[0]);
  if (action === 'select') {
    selected = id; const h = byId(id);
    updateSelectedUI();
    focusMapHome(h);
  }
  if (action === 'close-detail' || action === 'back-list') { selected = null; updateSelectedUI(); }
  if (action === 'more') { visibleCount += 18; refreshListingsOnly(); }
  if (action === 'filter-reset') { selected = null; filter = defaultFilter(); visibleCount = 18; render(true); }
  if (action === 'buy') openBuy(id);
  if (action === 'hold' || action === 'sell') {
    if (session.phase !== 'decision' || action === 'sell' && !session.houseId) return;
    classroomUI.choices[session.year] = action; refreshDecisionDock(); save();
  }
  if (action === 'map-toggle') { classroomUI.showMap = !classroomUI.showMap; render(true); }
  if (action === 'map-reset') fitMatchingHomes();
  if (action === 'advance') advance();
  if (action === 'restart') resetGame();
  if (action === 'guide' || action === 'method') modal('진행 방법과 자료 기준', helpHtml());
  if (action === 'review-period') modal('지난 2년 결산', periodResultHtml(session.lastPassage));
});
$('#app').addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'policy-read') { classroomUI.policyRead[session.year] = t.checked; refreshDecisionDock(); save(); return; }
  if (t.id === 'decision-reason') { classroomUI.reasons[session.year] = t.value; refreshDecisionDock(); save(); return; }
  if (t.dataset.filter && screen === 'game') { filter[t.dataset.filter] = t.value; visibleCount = 18; selected = null; render(true); }
});
$('#app').addEventListener('toggle', e => {
  const a = e.target;
  if (a.matches('.news-detail') && a.isConnected) { classroomUI.news[a.dataset.newsKey] = a.open; save(); }
}, true);
$('#app').addEventListener('input', e => {
  if (e.target.id !== 'search' || screen !== 'game') return;
  filter.query = e.target.value; visibleCount = 18;
  if (selected) { selected = null; updateSelectedUI(); }
  refreshListingsOnly(); paintMarkers(); save();
});
function syncNewsToggle() {}
function syncDecisionDock() {
  document.documentElement.style.setProperty('--decision-dock-space', '0px');
}
function refreshDecisionDock() {
  const dock = $('.inline-decision'); if (dock && screen === 'game') dock.outerHTML = decisionHtml();
}
$('#modal').addEventListener('click', e => {
  if (e.target === $('#modal')) $('#modal').close();
  const b = e.target.closest('[data-action]'); if (!b || b.disabled) return;
  if (b.dataset.action === 'close-modal') $('#modal').close();
  if (b.dataset.action === 'confirm-buy' && decision('buy', b.dataset.id)) $('#modal').close();
});
$('#help-link').addEventListener('click', () => modal('진행 방법과 자료 기준', helpHtml()));
$('#reset-link').addEventListener('click', () => { if (confirm('진행하던 게임을 초기화할까요?')) resetGame(); });
boot();
