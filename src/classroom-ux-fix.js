/**
 * 검색/정렬 다양화 + 보유 주택의 독립적인 지도 마커.
 * feature/housing-classroom에서 기존 게임 로직을 변경하지 않는 UI 보강.
 * src/final-review.js 다음, app.js 이전에 읽혀야 한다.
 */
(function () {
  'use strict';

  const commuteDistance = (h) => {
    const c = session?.profile?.commute;
    if (!c || !Number.isFinite(h?.lat) || !Number.isFinite(h?.lng)) return Infinity;
    const rad = Math.PI / 180;
    const a = Math.sin((h.lat - c.lat) * rad / 2) ** 2 +
      Math.cos(c.lat * rad) * Math.cos(h.lat * rad) * Math.sin((h.lng - c.lng) * rad / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
  };

  const originalToolbar = marketToolbar;
  marketToolbar = function () {
    return originalToolbar() + `<div class="extra-market-controls">
      <label>매수 가능 여부 <select data-filter="affordability" aria-label="매수 가능 여부">
        <option value="all" ${(!filter.affordability || filter.affordability === 'all') ? 'selected' : ''}>전체 매물</option>
        <option value="can" ${filter.affordability === 'can' ? 'selected' : ''}>내 예산으로 매수 가능</option>
        <option value="cannot" ${filter.affordability === 'cannot' ? 'selected' : ''}>예산 초과 매물</option>
      </select></label>
      <label>정렬 <select data-filter="sort" aria-label="매물 정렬">
        ${[['price','가격 낮은 순'],['price-desc','가격 높은 순'],['distance','직장과 가까운 순'],['area','면적 넓은 순'],['shortfall','추가 자금 적은 순']].map(([key,label]) => `<option value="${key}" ${filter.sort === key ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>
      <span class="extra-hint">직장까지의 거리는 직선거리 기준입니다. 실제 이동시간과 다릅니다.</span>
    </div>`;
  };

  getMatches = function () {
    if (!session) return listings.slice();
    const q = (filter.query || '').replace(/\s+/g, '').toLowerCase();
    const all = listings.filter(h => {
      const price = valueAt(h, session.year);
      if (filter.region && filter.region !== '전체' && regionKey(h) !== filter.region) return false;
      if (filter.type && filter.type !== '전체' && h.type !== filter.type) return false;
      if (filter.area && filter.area !== '전체') {
        if (filter.area === '60㎡ 미만' && h.area >= 60) return false;
        if (filter.area === '60~85㎡' && (h.area < 60 || h.area >= 85)) return false;
        if (filter.area === '85㎡ 이상' && h.area < 85) return false;
      }
      if (filter.budget === '4억 미만' && price >= 4e8) return false;
      if (filter.budget === '4~7억' && (price < 4e8 || price >= 7e8)) return false;
      if (filter.budget === '7~10억' && (price < 7e8 || price >= 10e8)) return false;
      if (filter.budget === '10억 이상' && price < 10e8) return false;
      if (q && !`${h.name}${h.district}${h.dong}${h.region}`.replace(/\s+/g, '').toLowerCase().includes(q)) return false;
      if (filter.affordability === 'can' || filter.affordability === 'cannot') {
        const can = session.houseId === h.id || quote(h).can;
        if (filter.affordability === 'can' && !can) return false;
        if (filter.affordability === 'cannot' && can) return false;
      }
      return true;
    });
    const sort = filter.sort || 'price';
    const val = h => valueAt(h, session.year);
    const extra = h => session.houseId === h.id ? 0 : quote(h).shortfall;
    all.sort((a,b) => {
      let delta = 0;
      if (sort === 'price-desc') delta = val(b) - val(a);
      else if (sort === 'distance') delta = commuteDistance(a) - commuteDistance(b);
      else if (sort === 'area') delta = b.area - a.area;
      else if (sort === 'shortfall') delta = extra(a) - extra(b);
      else delta = val(a) - val(b);
      return delta || String(a.id).localeCompare(String(b.id));
    });
    return all;
  };

  const originalSidebar = sidebarContentHtml;
  sidebarContentHtml = function () {
    const html = originalSidebar();
    if (!session?.houseId) return html;
    const home = byId(session.houseId);
    if (!home) return html;
    const banner = `<div class="owned-home-banner">
      <strong>🏠 내 보유 주택</strong><span>${safe(home.name)} · ${safe(home.district)}</span>
      <button type="button" data-action="jump-home">지도에서 내 집 찾기</button></div>`;
    return banner + html;
  };

  const originalMapContent = mapContent;
  mapContent = function () {
    return originalMapContent().replace(
      '<div class="map-tip">',
      `${session?.houseId ? '<button type="button" class="home-map-jump" data-action="jump-home">🏠 내 집 위치로 이동</button>' : ''}<div class="map-tip"><strong class="legend-home">🏠 파랑: 내 집</strong> · `
    );
  };

  function ownedPinHtml(h) {
    return `<span class="owned-map-pin" title="내가 보유한 주택: ${safe(h.name)}"><b>🏠 내 집</b><small>${briefWon(valueAt(h, session.year))}</small></span>`;
  }

  // Use exactly the same filtered list for map and sidebar.
  // Always keep the currently owned home outside the marker clustering.
  paintMarkers = function () {
    if (!session || !map || !markers || !mapIsVisible()) return;
    const owned = session.houseId ? byId(session.houseId) : null;
    const matches = getMatches().filter(h => h.id !== owned?.id && Number.isFinite(h.lat) && Number.isFinite(h.lng));
    const bounds = map.getBounds().pad(0.1);
    const visible = matches.filter(h => bounds.contains([h.lat,h.lng]));
    markers.clearLayers();

    const clickHome = h => { selected = h.id; updateSelectedUI(); };
    if (map.provider === 'kakao') {
      const K=window.kakao?.maps;
      if (!K) return;
      const overlay=(h,content,zIndex=1)=>{
        const ov=new K.CustomOverlay({position:new K.LatLng(h.lat,h.lng),content,map:map.native,zIndex,yAnchor:1});
        markers.add(ov);
      };
      if (map.getZoom() < 12 && visible.length > 80) {
        const groups=new Map();
        visible.forEach(h=>{const name=`${h.region}|${h.district}`;if(!groups.has(name))groups.set(name,[]);groups.get(name).push(h);});
        groups.forEach(group=>{
          const h=group[0],btn=document.createElement('button');
          btn.type='button';btn.className='cluster-pin';btn.textContent=`${h.district} ${group.length}곳`;
          btn.onclick=()=>map.fit(group);
          overlay(h,btn,1);
        });
      } else {
        for (const h of visible) {
          const btn=document.createElement('button');
          btn.type='button';btn.className=`price-pin${selected === h.id ? ' active' : ''}`;
          btn.textContent=briefWon(valueAt(h,session.year));
          btn.setAttribute('aria-label',`${h.name} ${won(valueAt(h,session.year))}`);
          btn.onclick=()=>clickHome(h);
          overlay(h,btn,selected===h.id?5:1);
        }
      }
      if (owned) {
        const btn=document.createElement('button');
        btn.type='button';btn.className='owned-map-pin';
        btn.title=`보유 주택: ${owned.name}`;
        btn.innerHTML=`<b>🏠 내 집</b><small>${briefWon(valueAt(owned,session.year))}</small>`;
        btn.onclick=()=>clickHome(owned);
        overlay(owned,btn,20);
      }
      return;
    }

    if (typeof L === 'undefined') return;
    const z=map.getZoom(),cell=z<11?74:z<13?52:30;
    const groups=new Map();
    for(const h of visible){
      const p=map.project([h.lat,h.lng],z);
      const key=`${Math.round(p.x/cell)}_${Math.round(p.y/cell)}`;
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(h);
    }
    for(const group of groups.values()){
      if(group.length>1 && z<15){
        const center={lat:group.reduce((s,h)=>s+h.lat,0)/group.length,lng:group.reduce((s,h)=>s+h.lng,0)/group.length};
        const icon=L.divIcon({className:'map-div-icon',html:`<span class="cluster-pin">${group.length}개</span>`,iconSize:[54,35],iconAnchor:[27,17]});
        L.marker(center,{icon}).on('click',()=>map.flyTo([center.lat,center.lng],Math.min(z+2,16))).addTo(markers);
      }else{
        for(const h of group){
          const style=selected===h.id?'active':'real';
          const icon=L.divIcon({className:'map-div-icon',html:`<span class="price-pin ${style}">${briefWon(valueAt(h,session.year))}</span>`,iconSize:[78,32],iconAnchor:[39,32]});
          L.marker([h.lat,h.lng],{icon,zIndexOffset:selected===h.id?2000:0}).on('click',()=>clickHome(h)).addTo(markers);
        }
      }
    }
    if(owned){
      const icon=L.divIcon({className:'map-div-icon owned-icon',html:ownedPinHtml(owned),iconSize:[102,46],iconAnchor:[51,46]});
      L.marker([owned.lat,owned.lng],{icon,zIndexOffset:9000}).on('click',()=>clickHome(owned)).addTo(markers);
    }
  };

  const originalRefresh = refreshListingsOnly;
  refreshListingsOnly = function () {
    originalRefresh();
    const labels = {price:'가격 낮은 순', 'price-desc':'가격 높은 순', distance:'직장 가까운 순',area:'면적 넓은 순', shortfall:'추가 자금 적은 순'};
    const el = document.querySelector('.listing-head p');
    if (el) el.textContent = `${labels[filter.sort || 'price'] || '가격 낮은 순'} · ${session.year}년`;
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action="jump-home"]');
    if (!trigger || !session?.houseId) return;
    event.preventDefault();
    const h = byId(session.houseId);
    if (!h) return;
    selected = h.id;
    updateSelectedUI();
    focusMapHome(h);
  });

  const css = document.createElement('style');
  css.textContent = `
    .extra-market-controls{display:flex;gap:14px;flex-wrap:wrap;align-items:center;padding:10px 0 14px;color:#405b57;font-size:.88rem}
    .extra-market-controls label{display:flex;gap:7px;align-items:center;font-weight:700}
    .extra-market-controls select{padding:8px 10px;border:1px solid #c5d8d1;border-radius:9px;background:#fff;color:#233a36}
    .extra-hint{color:#687973;font-size:.78rem}
    .owned-home-banner{padding:12px 14px;background:#eaf3ff;border:2px solid #397fdd;border-radius:12px;margin:8px 10px;display:grid;gap:4px;color:#173b72}
    .owned-home-banner span{font-size:.84rem}
    .owned-home-banner button,.home-map-jump{border:1px solid #397fdd;background:#fff;border-radius:8px;padding:8px;color:#174d95;font-weight:800;cursor:pointer}
    .home-map-jump{position:absolute;top:54px;right:10px;z-index:901;background:#fff;box-shadow:0 2px 8px #3332}
    .map-wrapper{position:relative}.legend-home{color:#174d95}
    .owned-map-pin{display:flex;align-items:center;flex-direction:column;justify-content:center;gap:1px;min-width:95px;height:43px;background:#145ec3;color:#fff!important;border:3px solid #fff;border-radius:13px;box-shadow:0 5px 16px #001d4f88;font-size:12px;font-weight:800;line-height:1.05;white-space:nowrap}
    .owned-map-pin small{font-size:11px;color:#fff!important}.owned-icon{z-index:9000!important}
    @media(max-width:680px){.extra-market-controls{padding:10px}.home-map-jump{top:48px;right:5px;font-size:12px}}
  `;
  document.head.appendChild(css);
})();
