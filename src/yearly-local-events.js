/**
 * Housing Classroom: yearly neighborhood stories and local price responses.
 *
 * - Keep the existing 2026~2031 game, finance, choices and baseline model.
 * - Exactly 1 ordinary LOCAL event in each decision year (2026~2030).
 * - Exactly 2 unexpected LOCAL shocks in the entire game (2028, 2030).
 * - All events are FICTIONAL, predetermined and the same for every student.
 * - Normal events are announced before the decision (but not their precise effect).
 * - Surprise events are revealed only in the year-end result modal.
 * - Their price impact is a regional DEMAND component, not a magical flat region bonus.
 * - The numbers are pedagogical assumptions, not estimated real-estate effects.
 *
 * Load AFTER src/game.js, BEFORE src/final-review.js and BEFORE app.js.
 * No Node.js is needed to use these in the browser.
 */
(function () {
  'use strict';

  // Coordinates = fictional event's affected center; do not imply the real project exists.
  const LOCAL_EVENTS = Object.freeze([
    {
      year: 2026, region: '경기', district: /광명시/,
      center: [37.478, 126.866], radiusKm: 7,
      title: '광명 생활권, 환승시설 확충 계획 확정',
      body: '가상 교통 연계시설의 확충이 확정되어 생활권 접근성 개선이 기대됩니다.',
      effect: 0.036, surprise: false
    },
    {
      year: 2027, region: '인천', district: /부평구/,
      center: [37.490, 126.723], radiusKm: 8,
      title: '인천 부평 생활권, 급행버스 환승체계 개편',
      body: '가상 광역교통망의 환승 편의가 개선될 예정으로 출퇴근 접근성 기대가 높아졌습니다.',
      effect: 0.041, surprise: false
    },
    {
      year: 2028, region: '서울', district: /중랑구/,
      center: [37.596, 127.092], radiusKm: 6,
      title: '서울 중랑 생활권, 교통 연계 노선 확정',
      body: '가상 도시철도 연계 노선 계획이 구체화되면서 일부 역세권의 주거 선호가 높아지고 있습니다.',
      effect: 0.037, surprise: false
    },
    {
      year: 2028, region: '서울', district: /노원구/,
      center: [37.652, 127.062], radiusKm: 7,
      title: '예상보다 빠른 환승역 개통 발표',
      body: '원래 예정된 일정보다 빨리 가상 환승역이 개통됐습니다. 노원 생활권에서 주거 선호가 갑자기 높아졌습니다.',
      effect: 0.079, surprise: true
    },
    {
      year: 2029, region: '서울', district: /강서구/,
      center: [37.560, 126.839], radiusKm: 8,
      title: '강서 업무지구, 신규 기업 입주 계약 체결',
      body: '가상 업무단지의 기업 입주가 확정되어 인근 직주근접 수요가 증가할 것으로 예상됩니다.',
      effect: 0.043, surprise: false
    },
    {
      year: 2030, region: '경기', district: /용인시.*수지구/,
      center: [37.323, 127.094], radiusKm: 8,
      title: '수지 생활권, 광역 교통 환승 서비스 개선',
      body: '가상 광역 환승 개선으로 수도권 업무지구 접근성이 나아질 것으로 예상됩니다.',
      effect: 0.038, surprise: false
    },
    {
      year: 2030, region: '인천', district: /서구/,
      center: [37.548, 126.676], radiusKm: 10,
      title: '주요 기업의 신규 사업장 이전 계획 갑작스러운 철회',
      body: '가상 기업 이전 계획이 예상치 못하게 취소돼 인근 일자리 증가 기대가 크게 낮아졌습니다.',
      effect: -0.068, surprise: true
    }
  ]);

  const PUBLIC_EVENTS = LOCAL_EVENTS.filter(x => !x.surprise);
  const SHOCKS = LOCAL_EVENTS.filter(x => x.surprise);
  if (PUBLIC_EVENTS.length !== 5 || SHOCKS.length !== 2) {
    throw Error('Yearly event count must be 5 ordinary + 2 unexpected');
  }

  function distanceInKm(lat1, lng1, lat2, lng2) {
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLng = (lng2 - lng1) * rad;
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
    return 12742 * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  function localityImpact(h, event) {
    if (regionKey(h) !== event.region || !event.district.test(String(h.district || ''))) return 0;
    if (!Number.isFinite(h.lat) || !Number.isFinite(h.lng)) return 0;
    const km = distanceInKm(h.lat, h.lng, event.center[0], event.center[1]);
    const fraction = Math.max(0, 1 - km / event.radiusKm);
    return event.effect * Math.pow(fraction, 0.7);
  }

  function effectiveEvents(h, year) {
    return LOCAL_EVENTS.filter(e => e.year === year).map(e => ({
      ...e,
      contribution: localityImpact(h, e)
    })).filter(e => Math.abs(e.contribution) >= 0.0001);
  }

  const coreComponents = periodComponents;
  periodComponents = function (h, year) {
    const parts = coreComponents(h, year);
    const events = effectiveEvents(h, year);
    const localAdjustment = events.reduce((sum, x) => sum + x.contribution, 0);
    if (!events.length) return parts;
    // A new transport link or jobs change demand rather than creating
    // a fourth basic price driver. Keep the original three teaching factors.
    const demand = parts.find(x => x.key === 'demand');
    if (!demand) throw Error('Market model must provide demand component');
    demand.value += localAdjustment;
    demand.detail += ' 지역 뉴스의 추가 수요 효과: ' + events.map(e =>
      `${e.title} (${e.contribution >= 0 ? '+' : ''}${(e.contribution * 100).toFixed(2)}%p)`
    ).join(' / ') + '. 지역 내에서도 거리별로 다릅니다. (모두 가상 사건)';
    return parts;
  };

  function announcedEventsHtml(year) {
    const events = PUBLIC_EVENTS.filter(e => e.year === year);
    if (!events.length) return '';
    const items = events.map(e => `<article class="fictional-local-news">
      <span class="fictional-label">가상 지역 뉴스 · ${year}년</span>
      <h4>${safe(e.title)}</h4>
      <p>${safe(e.body)}</p>
      <small>${safe(e.region)} · ${safe(e.district.source.replaceAll('.*', ' '))} 생활권 중심 · 효과와 정확한 상승률은 알 수 없습니다.</small>
    </article>`).join('');
    return `<section class="fictional-news-list" aria-label="올해의 지역 뉴스">
      <div class="fictional-section-title"><h3>올해의 생활권 뉴스</h3><span>확인 가능한 가상 정보</span></div>
      ${items}<p class="fictional-note">어느 아파트나 같은 폭으로 오르는 것은 아닙니다. 실제 결과는 다음 연도에 확인하세요.</p>
    </section>`;
  }

  const coreNewsHtml = newsHtml;
  newsHtml = function () {
    return coreNewsHtml() + (session && session.phase === 'decision' ? announcedEventsHtml(session.year) : '');
  };

  function roundEventHtml(fromYear) {
    const events = LOCAL_EVENTS.filter(e => e.year === fromYear);
    if (!events.length) return '';
    const heldHome = (session && session.lastPassage && session.lastPassage.from === fromYear)
      ? byId(session.lastPassage.heldId) : null;
    const rows = events.map(e => {
      const impact = heldHome ? localityImpact(heldHome, e) : 0;
      const homeDetail = heldHome && Math.abs(impact) > 0.0001
        ? `보유 단지의 사건에 따른 수요 기여도: ${impact >= 0 ? '+' : ''}${(impact * 100).toFixed(2)}%p (가격 최종 상하한 적용 전)`
        : '보유 주택이 없거나 사건의 영향권 밖인 경우 직접 가격 기여도는 없습니다.';
      return `<article class="fictional-event-result ${e.surprise ? 'is-shock' : ''}">
        <span>${e.surprise ? '⚡ 예기치 못한 가상 사건' : '📍 연초에 알려진 지역 변화'}</span>
        <h4>${safe(e.title)}</h4>
        <p>${safe(e.body)}</p>
        <small>${safe(homeDetail)}</small>
      </article>`;
    }).join('');
    return `<section class="fictional-year-end" aria-label="올해의 지역 사건 결산">
      <h3>${fromYear}년 지역 사건 결과</h3>${rows}
      <p class="fictional-note">이벤트는 구매력·수요·공급과 함께 가격에 반영되며, 위 기여도는 교육용 가상 계수입니다. 같은 사건이라도 영향권 밖 아파트의 가격에는 영향을 주지 않습니다.</p>
    </section>`;
  }

  const corePeriodResult = periodResultHtml;
  periodResultHtml = function (p) {
    const body = corePeriodResult(p);
    const result = roundEventHtml(p.from);
    return body.replace('<button class="main-button modal-primary"', `${result}<button class="main-button modal-primary"`);
  };

  // Available only at game end. Publicly announced news stays public, shocks
  // are absent from the decision screen until the year-end result is revealed.
  const css = document.createElement('style');
  css.textContent = `
    .fictional-news-list{margin:20px 25px;padding:20px;background:#f3f8fc;border:1px solid #b9d4e7;border-radius:16px;color:#193b52}
    .fictional-section-title{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:11px}
    .fictional-section-title h3{margin:0;font-size:1.06rem}.fictional-section-title span,.fictional-note{font-size:.81rem;color:#546e82}
    .fictional-local-news,.fictional-event-result{border:1px solid #d7e4eb;border-radius:11px;padding:12px 14px;background:white;margin:8px 0}
    .fictional-local-news h4,.fictional-event-result h4{margin:4px 0 6px;font-size:1rem}
    .fictional-local-news p,.fictional-event-result p{margin:6px 0;line-height:1.58;font-size:.89rem}
    .fictional-local-news small,.fictional-event-result small{color:#526b77;line-height:1.55}
    .fictional-label,.fictional-event-result>span{font-size:.77rem;font-weight:800;color:#256d97}
    .fictional-year-end{margin:18px 0;padding:14px;border-radius:14px;border:1px solid #d4e2e9;background:#f6fafc}
    .fictional-year-end h3{margin:0 0 11px;font-size:1.1rem}
    .fictional-event-result.is-shock{border-left:5px solid #d98418;background:#fffcf7}
  `;
  document.head.appendChild(css);

  // Diagnostic-only: allows us to test the exact annual schedule without
  // exposing a hidden answer inside the user-facing game UI.
  if (typeof window !== 'undefined') {
    window.__housingEventInfo = {
      years: [2026, 2027, 2028, 2029, 2030],
      ordinaryCount: PUBLIC_EVENTS.length,
      shockCount: SHOCKS.length
    };
  }
})();
