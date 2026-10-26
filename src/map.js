let sidebarListScroll = 0;
/**
 * 지도 및 매물 목록 연결
 * Leaflet 지도 생성, 가격 핀, 매물 선택 및 검색 결과를 관리한다.
 */
// Leaflet과 OpenStreetMap을 사용해 실제 단지 좌표에 마커를 배치합니다.


async function initMap() {
  const element = $('#map');
  if (!element) return;
  if (window.HOUSING_MAP?.kakaoJavaScriptKey) {
    try {
      await loadKakaoSDK();
      if (!element.isConnected) return;
      initKakaoMap(); return;
    } catch (error) {
      if (!element.isConnected) return;
      toast('카카오 지도 연결을 확인해 주세요. 기본 지도로 표시합니다.');
    }
  }
  if (typeof L === 'undefined') {
    $('#map').innerHTML = '<div class="map-error">지도 라이브러리를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</div>';
    return;
  }
  map = L.map('map', { zoomControl: true, scrollWheelZoom: false, preferCanvas: true }).setView(mapState?.center || [37.535, 127.030], mapState?.zoom || 10);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  markers = L.layerGroup().addTo(map);
  map.on('click', () => map.scrollWheelZoom.enable());
  map.on('mouseout', () => map.scrollWheelZoom.disable());
  map.on('moveend', () => {
    paintMarkers();
    if (filter.view === 'map') refreshListingsOnly();
  });
  setTimeout(() => map?.invalidateSize(), 80);
  paintMarkers();
}

function paintMarkers() {
  if (!map || !markers) return;
  if (map.provider === 'kakao') { paintKakaoMarkers(); return; }
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
 const sidebar=$('#property-sidebar'),list=$('#listing-scroll');
 if(list) sidebarListScroll=list.scrollTop;
 if(sidebar) sidebar.innerHTML=sidebarContentHtml();
 $('.lesson-map-layout')?.classList.toggle('sidebar-expanded',Boolean(byId(selected)));
 refreshDecisionDock();
 const restored=$('#listing-scroll');
 if(restored) restored.scrollTop=sidebarListScroll;
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
  if (!matches.length) old.innerHTML = '<p class="none-found">조건에 맞는 집이 없어요. 조건을 바꿔보세요.</p>';
}

let kakaoSDKPromise;
function loadKakaoSDK() {
  if (window.kakao?.maps?.Map) return Promise.resolve();
  if (kakaoSDKPromise) return kakaoSDKPromise;
  kakaoSDKPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const timeout = setTimeout(() => reject(Error('Map SDK timeout')), 8000);
    script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=' + encodeURIComponent(window.HOUSING_MAP.kakaoJavaScriptKey);
    script.onload = () => {
      if (!window.kakao?.maps) { clearTimeout(timeout); reject(Error('Invalid map SDK')); return; }
      window.kakao.maps.load(() => { clearTimeout(timeout); resolve(); });
    };
    script.onerror = () => { clearTimeout(timeout); reject(Error('Map SDK failed')); };
    document.head.append(script);
  });
  return kakaoSDKPromise;
}
function initKakaoMap() {
  const K = kakao.maps, center = mapState?.center;
  const native = new K.Map($('#map'), { center: new K.LatLng(center?.lat || center?.[0] || 37.535, center?.lng || center?.[1] || 127.03), level: Math.max(1, 19 - (mapState?.zoom || 10)) });
  native.addControl(new K.ZoomControl(), K.ControlPosition.RIGHT);
  let overlays = [];
  const idle = () => paintMarkers();
  map = {
    provider: 'kakao', native,
    getCenter: () => ({lat:native.getCenter().getLat(),lng:native.getCenter().getLng()}),
    getZoom: () => 19 - native.getLevel(),
    flyTo: (p,z) => { native.setLevel(Math.max(1,19-z)); native.panTo(new K.LatLng(p[0],p[1])); },
    getBounds: () => ({pad(){return this;},contains(p){return native.getBounds().contain(new K.LatLng(p[0],p[1]));}}),
    off: () => K.event.removeListener(native,'idle',idle),
    remove: () => { overlays.forEach(o=>o.setMap(null)); overlays=[]; markers=null; },
    fit: homes => { const bounds=new K.LatLngBounds(); homes.forEach(h=>bounds.extend(new K.LatLng(h.lat,h.lng))); native.setBounds(bounds); }
  };
  markers = { clearLayers: () => { overlays.forEach(o=>o.setMap(null)); overlays=[]; }, add: o => overlays.push(o) };
  K.event.addListener(native,'idle',idle);
  paintMarkers();
}
function paintKakaoMarkers() {
  markers.clearLayers();
  const homes = getMatches().filter(h=>map.getBounds().contains([h.lat,h.lng]));
  // Only render individual pins at a neighborhood zoom. The list always includes all matches.
  if (map.getZoom()<12 && homes.length>80) {
    const groups = new Map();
    homes.forEach(h=>{const k=h.district; if(!groups.has(k))groups.set(k,[]);groups.get(k).push(h);});
    groups.forEach(group=>{
      const h=group[0], button=document.createElement('button'); button.className='cluster-pin';button.textContent=h.district+' '+group.length+'곳';
      button.onclick=()=>map.fit(group);
      const overlay=new kakao.maps.CustomOverlay({position:new kakao.maps.LatLng(h.lat,h.lng),content:button,map:map.native});markers.add(overlay);
    }); return;
  }
  homes.forEach(h=>{
    const button=document.createElement('button');button.className='price-pin'+(selected===h.id?' active':'');button.textContent=briefWon(valueAt(h,session.year));button.setAttribute('aria-label',h.name+' '+won(valueAt(h,session.year)));
    button.onclick=()=>{selected=h.id;updateSelectedUI();};
    const overlay=new kakao.maps.CustomOverlay({position:new kakao.maps.LatLng(h.lat,h.lng),content:button,map:map.native});markers.add(overlay);
  });
}
function fitMatchingHomes() {
  if (!map) return;
  const homes=getMatches();if(!homes.length)return toast('조건에 맞는 매물이 없어요.');
  if(map.provider==='kakao')map.fit(homes);
  else map.fitBounds(homes.map(h=>[h.lat,h.lng]),{padding:[30,30],maxZoom:14});
}
