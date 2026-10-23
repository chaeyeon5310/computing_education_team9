/**
 * 지도 및 매물 목록 연결
 * Leaflet 지도 생성, 가격 핀, 매물 선택 및 검색 결과를 관리한다.
 */
// Leaflet과 OpenStreetMap을 사용해 실제 단지 좌표에 마커를 배치합니다.


function initMap() {
  if (typeof L === 'undefined') {
    $('#map').innerHTML = '<div class="map-error">지도 라이브러리를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</div>';
    return;
  }
  map = L.map('map', { zoomControl: true, scrollWheelZoom: true, preferCanvas: true }).setView(mapState?.center || [37.535, 127.030], mapState?.zoom || 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  markers = L.layerGroup().addTo(map);
  map.on('moveend', () => {
    paintMarkers();
    if (filter.view === 'map') refreshListingsOnly();
  });
  setTimeout(() => map?.invalidateSize(), 80);
  paintMarkers();
}

function paintMarkers() {
  if (!map || !markers) return;
  markers.clearLayers();
  const matches = listings.filter(h => {
    const q = filter.query.replace(/\s+/g, '').toLowerCase();
    const price = valueAt(h, session.year);
    return (filter.region === '전체' || regionKey(h) === filter.region) && (filter.type === '전체' || h.type === filter.type) && (!q || `${h.name}${h.region}${h.district}${h.dong}`.replace(/\s+/g, '').toLowerCase().includes(q)) && (filter.budget === '전체' || filter.budget === '4억 미만' && price < 4e8 || filter.budget === '4~7억' && price >= 4e8 && price < 7e8 || filter.budget === '7~10억' && price >= 7e8 && price < 10e8 || filter.budget === '10억 이상' && price >= 10e8) && (filter.area === '전체' || filter.area === '60㎡ 미만' && h.area < 60 || filter.area === '60~85㎡' && h.area >= 60 && h.area < 85 || filter.area === '85㎡ 이상' && h.area >= 85);
  });
  const z = map.getZoom(), bounds = map.getBounds().pad(.1), arr = matches.filter(h => bounds.contains([h.lat, h.lng]));
  const grouped = new Map(), cell = z < 11 ? 74 : z < 13 ? 52 : 30;
  for (const h of arr) {
    const p = map.project([h.lat, h.lng], z);
    const key = `${Math.round(p.x / cell)}_${Math.round(p.y / cell)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(h);
  }
  for (const group of grouped.values()) {
    if (group.length > 1 && z < 15) {
      const mid = { lat: group.reduce((s, x) => s + x.lat, 0) / group.length, lng: group.reduce((s, x) => s + x.lng, 0) / group.length };
      const icon = L.divIcon({
        className: 'map-div-icon',
        html: `<span class="cluster-pin">${group.length}개</span>`,
        iconSize: [54, 35],
        iconAnchor: [27, 17]
      });
      L.marker(mid, { icon }).on('click', () => map.flyTo([mid.lat, mid.lng], Math.min(z + 2, 16))).addTo(markers);
    } else {
      for (const h of group) {
        const price = valueAt(h, session.year), style = selected === h.id ? 'active' : 'real';
        const icon = L.divIcon({
          className: 'map-div-icon',
          html: `<span class="price-pin ${style}">${briefWon(price)}</span>`,
          iconSize: [78, 32],
          iconAnchor: [39, 32]
        });
        L.marker([h.lat, h.lng], { icon, zIndexOffset: selected === h.id ? 2000 : 0 }).on('click', () => {
          selected = h.id;
          updateSelectedUI();
        }).addTo(markers);
      }
    }
  }
}

function updateSelectedUI() {
  const d = $('#detail-position');
  if (d) d.innerHTML = detailHtml(byId(selected));
  $$('.listing-card').forEach(el => el.classList.toggle('active', el.dataset.id === selected));
  refreshDecisionDock();
  paintMarkers();
  save();
}

function refreshListingsOnly() {
  const old = $('#listing-scroll');
  if (!old) return;
  const y = old.scrollTop;
  let matches = getMatches();
  old.innerHTML = matches.slice(0, visibleCount).map(listCard).join('') + (matches.length > visibleCount ? `<button class="show-more" data-action="more">더 보기 ↓</button>` : '');
  old.scrollTop = y;
  const caption = $('.listing-head p');
  if (caption) caption.innerHTML = `총 <b>${KR.format(matches.length)}</b>개 · 현재 ${session.year}년`;
}
