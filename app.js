/**
 * 진입점 및 이벤트 연결
 * 초기 JSON 로드, 사용자 이벤트와 버튼 동작을 연결한다.
 */
// 시작 파일: 필요한 스크립트가 index.html의 defer 순서대로 먼저 로드됩니다.


async function boot() {
  try {
    const [lr, sr] = await Promise.all([fetch('./data/listings.json'), fetch('./data/storyline.json')]);
    if (!lr.ok || !sr.ok) throw Error('data/ 파일을 읽지 못했어요. Live Server로 실행해 주세요.');
    const l = await lr.json();
    story = await sr.json();
    listings = l.listings;
    window.__gameMeta = l.meta;
    window.__houseGameDebug = {
      valueAt,
      breakdown,
      componentsFor,
      quote,
      yearRegionShocks,
      zoneWeights,
      localProjects,
      personalities,
      getListings: () => listings,
      getSession: () => session,
      savingsForYear
    };
    restore();
    render();
  } catch (e) {
    $('#app').innerHTML = `<div class="error">\
<h2>데이터를 불러올 수 없어요</h2>\
<p>${safe(e.message)}</p>\
<p>VS Code에서 index.html을 열고 'Open with Live Server'를 클릭해 주세요.</p>\
</div>`;
    console.error(e);
  }
}

$('#app').addEventListener('click', e => {
  const profileEl = e.target.closest('[data-profile]');
  if (profileEl) {
    const p = personalities.find(x => x.id === profileEl.dataset.profile);
    session = { profile: p };
    $$('.profile-opt').forEach(b => b.classList.toggle('active', b.dataset.profile === p.id));
    return;
  }
  const button = e.target.closest('[data-action]');
  if (!button) return;
  const a = button.dataset.action, id = button.dataset.id;
  if (a === 'start') {
    initialGame(session?.profile?.id ? session.profile : personalities[0]);
    return;
  }
  if (a === 'select') {
    selected = id;
    const h = byId(id);
    if (map && h) {
      map.flyTo([h.lat, h.lng], Math.max(12, map.getZoom()), { duration: .55 });
    }
    updateSelectedUI();
    return;
  }
  if (a === 'close-detail') {
    selected = null;
    updateSelectedUI();
    return;
  }
  if (a === 'more') {
    visibleCount += 18;
    refreshListingsOnly();
    return;
  }
  if (a === 'news-toggle') {
    const articles = $$('.news-detail');
    const expand = articles.some(article => !article.open);
    for (const article of articles) {
      article.open = expand;
      classroomUI.news[article.dataset.newsKey] = expand;
    }
    syncNewsToggle();
    save();
    return;
  }
  if (a === 'filter-reset') {
    filter = { query: '', region: '전체', type: '전체', budget: '전체', area: '전체', sort: 'price', view: 'all' };
    visibleCount = 18;
    render(true);
    return;
  }
  if (a === 'focus-list') {
    $('.listing-scroll')?.scrollTo({ top: 0, behavior: 'smooth' });
    $('.market-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  if (a === 'buy') {
    openBuy(id);
    return;
  }
  if (a === 'confirm-buy') {
    decision('buy', id);
    $('#modal').close();
    return;
  }
  if (a === 'sell') {
    modal('주택 매도 확인', `<p>현재 보유한 <b>${safe(byId(session.houseId)?.name)}</b>을(를) 게임상 현재가로 매도합니다.</p>\
<p>매도 거래비용 1.5%와 대출잔액이 차감됩니다.</p>\
<button class="main-button" data-action="confirm-sell">매도 확정</button>`);
    return;
  }
  if (a === 'confirm-sell') {
    decision('sell');
    $('#modal').close();
    return;
  }
  if (a === 'hold') {
    decision('hold');
    return;
  }
  if (a === 'advance') {
    advance();
    return;
  }
  if (a === 'restart') {
    session = null;
    screen = 'intro';
    selected = null;
    mapState = null;
    render();
    window.scrollTo(0, 0);
    return;
  }
  if (a === 'guide' || a === 'method') {
    modal('게임 진행 및 데이터 기준', helpHtml());
    return;
  }
});

$('#app').addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'decision-reason') {
    classroomUI.reasons[session.year] = t.value;
    save();
    return;
  }
  const k = t.dataset.filter;
  if (!k || screen !== 'game') return;
  filter[k] = k === 'view' ? (t.checked ? 'map' : 'all') : t.value;
  visibleCount = 18;
  render(true);
});

// Native disclosures expand in place, without rebuilding the map or decision form.
$('#app').addEventListener('toggle', e => {
  const article = e.target;
  if (!article.matches('.news-detail') || !article.isConnected) return;
  classroomUI.news[article.dataset.newsKey] = article.open;
  syncNewsToggle();
  save();
}, true);

function syncNewsToggle() {
  const button = $('[data-action="news-toggle"]');
  if (!button) return;
  const articles = $$('.news-detail');
  const allOpen = articles.length > 0 && articles.every(article => article.open);
  button.textContent = allOpen ? '모두 접기 ⌃' : '모두 펼치기 ⌄';
}

let dockObserver;
function syncDecisionDock() {
  dockObserver?.disconnect();
  const dock = $('.decision-dock');
  const update = () => {
    const height = dock ? Math.ceil(dock.getBoundingClientRect().height) + 20 : 0;
    document.documentElement.style.setProperty('--decision-dock-space', `${height}px`);
  };
  update();
  if (dock) {
    dockObserver = new ResizeObserver(update);
    dockObserver.observe(dock);
  }
}

function refreshDecisionDock() {
  const dock = $('.decision-dock');
  if (!dock || screen !== 'game') return;
  dock.outerHTML = decisionHtml();
  syncDecisionDock();
}

$('#app').addEventListener('input', e => {
  if (e.target.id !== 'search' || screen !== 'game') return;
  filter.query = e.target.value;
  visibleCount = 18;
  refreshListingsOnly();
  paintMarkers();
  save();
});

$('#modal').addEventListener('click', e => {
  if (e.target === $('#modal')) $('#modal').close();
  const b = e.target.closest('[data-action]');
  if (b?.dataset.action === 'close-modal') $('#modal').close();
  if (b?.dataset.action === 'confirm-buy') {
    decision('buy', b.dataset.id);
    $('#modal').close();
  }
  if (b?.dataset.action === 'confirm-sell') {
    decision('sell');
    $('#modal').close();
  }
});

$('#help-link').addEventListener('click', () => modal('게임 진행 및 데이터 기준', helpHtml()));

$('#reset-link').addEventListener('click', () => {
  if (confirm('진행하던 게임을 초기화할까요?')) {
    session = null;
    screen = 'intro';
    mapState = null;
    selected = null;
    render();
  }
});

boot();
