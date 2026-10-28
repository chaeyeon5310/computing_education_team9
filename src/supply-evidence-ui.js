/**
 * 공개되는 연도별 입주 일정 = market-model.js에서 가격 계산에 쓰는 일정.
 * 이 파일은 가격을 수정하지 않으며 뉴스/아파트 근거를 읽기 쉽게 표시한다.
 * 기존 views.js와 yearly-local-events.js 다음, app.js 이전에 로딩.
 */
(function () {
  'use strict';

  const originalNewsHtml = newsHtml;
  newsHtml = function () {
    const html = originalNewsHtml();
    if (!session || session.phase !== 'decision') return html;
    const events = supplyScheduleForYear(session.year);
    const rows = events.map(e =>
      `<li><strong>${safe(e.region)} · ${safe(e.district)}</strong> — ${safe(e.title)} <b>${KR.format(e.homes)}호</b></li>`
    ).join('');
    return html + `<section class="classroom-supply-calendar" aria-label="올해 예정된 가상 입주 사업">
      <div class="classroom-supply-calendar-head"><span>공급 · 게임 속 사전 공개 일정</span><h3>${session.year}년 지역별 가상 입주 일정</h3></div>
      <p>아래 사업은 실제로 가격 계산에 반영됩니다. 호수는 해당 시·도 전체 입주 물량에 <b>이미 포함</b>되어 있으며 별도로 더해지지 않습니다.</p>
      <ul>${rows}</ul>
      <details><summary>그 외 지역의 물량은 어떻게 계산되나요?</summary>
        <p>시·도 총입주량에서 위에 명시된 지역별 물량을 뺀 나머지는 표본 단지 수를 가상 기존 주택 재고의 대리변수로 사용해 배분합니다. 이는 실제 동별 준공 통계가 아닙니다. 해당 생활권의 표본 매물이 없는 사업 물량은 기본 물량에 포함해 보정합니다. 입주 일정이 명시된 곳과 기본 물량만 있는 곳을 비교하세요.</p>
      </details>
    </section>`;
  };

  const originalDetailHtml = detailHtml;
  detailHtml = function (h) {
    const html = originalDetailHtml(h);
    if (!h || !session) return html;
    const events = scheduledSupplyNear(h, session.year);
    const extra = `<section class="lesson-check classroom-supply-evidence">
      <h4>이 집의 공급량 산정 근거</h4>
      ${events.length ? events.map(e =>
        `<p><b>${safe(e.title)}</b> (${session.year}년 · ${KR.format(e.homes)}호)</p>`
      ).join('') : '<p>이 집의 생활권에는 별도 지정된 대규모 입주 일정이 없습니다. 시·도 기본 물량이 반영됩니다.</p>'}
      <small>사업 물량은 해당 지역 전체의 가상 입주 일정이며 선택한 아파트에 그대로 입주하는 세대수가 아닙니다. 기존 주택 대비 입주 비율은 위 CHECK 1에 표시됩니다.</small>
    </section>`;
    return html.replace('<section class="lesson-check"><h4>CHECK 2.', extra + '<section class="lesson-check"><h4>CHECK 2.');
  };

  const css = document.createElement('style');
  css.textContent = `
    .classroom-supply-calendar{margin:18px 25px;padding:18px 20px;border:1px solid #b6d1bb;border-radius:16px;background:#f3f9f3;color:#253c2a}
    .classroom-supply-calendar-head span{font-size:.77rem;color:#41634a;font-weight:700}
    .classroom-supply-calendar h3{margin:5px 0 9px;font-size:1.05rem}
    .classroom-supply-calendar p,.classroom-supply-calendar details{font-size:.86rem;line-height:1.62}
    .classroom-supply-calendar ul{margin:13px 0;padding-left:21px;display:grid;gap:8px}
    .classroom-supply-calendar li{font-size:.86rem;line-height:1.5}
    .classroom-supply-calendar li b{white-space:nowrap}
    .classroom-supply-evidence{background:#f6faf6}
    @media (max-width:600px){.classroom-supply-calendar{margin:14px 12px;padding:15px}}
  `;
  document.head.appendChild(css);
})();
