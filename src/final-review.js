/**
 * Final-only market review + personalized yearly hindsight comparisons.
 * Loaded AFTER src/game.js and BEFORE app.js.
 * No Node.js or build tools required in the student's browser.
 *
 * Only the final 2031 screen shows this analysis. It does NOT alter trading.
 * "Best" means the highest one-year ending net worth among trades the
 * student could have afforded using their ACTUAL finances at that year's start.
 * It is NOT a globally optimal 2026–2031 trading strategy.
 */
(function () {
  'use strict';

  const originalFinalHtml = finalHtml;
  let lastKey = null;
  let lastReport = '';

  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function netWorth(p, year) {
    const house = byId(p.houseId);
    return p.cash + (house ? valueAt(house, year) : 0) - p.loan;
  }

  function originalStartingState() {
    return {
      profile: clone(session.profile),
      year: START_YEAR,
      cash: session.initialCash,
      initialCash: session.initialCash,
      houseId: null,
      loan: 0,
      loanMonths: 0,
      rate: 0,
      phase: 'decision',
      lastDecision: '',
      transactions: [],
      yearly: [],
      passages: [],
      lastPassage: null
    };
  }

  // Mirrors finance.js:quote()/maxLoan() without mutating global session.
  function buyFromState(before, h, year) {
    if (before.houseId === h.id) return null;
    const d = roundFor(year);
    const old = byId(before.houseId);
    const price = valueAt(h, year);
    const oldSale = old ? valueAt(old, year) * 0.985 - before.loan : 0;
    const capital = before.cash + oldSale;
    const fee = price * 0.025;
    const reserve = 5000000;
    const needLoan = Math.max(0, Math.ceil((price + fee + reserve - capital) / 100000) * 100000);
    const incomeLimitPerMonth = incomeAt(year, before.profile) * d.paymentRatio / 12;
    const maxByIncome = incomeLimitPerMonth / monthlyPay(1, d.rate / 100);
    const limit = Math.floor(Math.max(0, Math.min(price * d.ltv, maxByIncome)) / 100000) * 100000;
    const shortfall = Math.max(0, price + fee + reserve - capital - limit);
    if (capital < 0 || shortfall >= 1 || needLoan > limit) return null;

    const next = clone(before);
    next.cash = capital + needLoan - price - fee;
    next.loan = needLoan;
    next.loanMonths = needLoan > 0 ? 360 : 0;
    next.rate = d.rate / 100;
    next.houseId = h.id;
    next.transactions.push({
      year,
      kind: old ? 'switch' : 'buy',
      id: h.id,
      price,
      loan: needLoan,
      buyCost: fee,
      sellCost: old ? valueAt(old, year) * 0.015 : 0
    });
    return next;
  }

  function sellFromState(before, year) {
    const old = byId(before.houseId);
    if (!old) return null;
    const price = valueAt(old, year);
    const sale = price * 0.985 - before.loan;
    if (before.cash + sale < 0) return null;
    const next = clone(before);
    next.cash += sale;
    next.houseId = null;
    next.loan = 0;
    next.loanMonths = 0;
    next.rate = 0;
    next.transactions.push({ year, kind: 'sell', id: old.id, price, sellCost: price * 0.015, buyCost: 0 });
    return next;
  }

  function applyTransaction(before, year, transaction) {
    if (!transaction) return clone(before); // hold / remain without housing
    if (transaction.kind === 'sell') return sellFromState(before, year);
    if (transaction.kind === 'buy' || transaction.kind === 'switch') {
      const h = byId(transaction.id);
      return h ? buyFromState(before, h, year) : null;
    }
    return null;
  }

  function optionResult(afterDecision, year, label, description, id) {
    if (!afterDecision) return null;
    const result = simulatePeriod(afterDecision, year);
    // A "best feasible" suggestion must not require forced sale or end bankrupt.
    if (result.log.forcedSale || result.state.cash < -0.01) return null;
    return {
      year,
      kind: label,
      description,
      houseId: id || null,
      worth: netWorth(result.state, year + 1),
      endState: result.state
    };
  }


  // Two rankings are deliberately separated: cash result versus housing suitability.
  // A high-scoring property outside Seoul or far from the job is not a general "best" home.
  function commuteKm(h, profile) {
    const c = profile?.commute;
    if (!h || !c || !Number.isFinite(h.lat) || !Number.isFinite(h.lng)) return Infinity;
    const rad = Math.PI / 180;
    const a = Math.sin((h.lat-c.lat)*rad/2)**2 +
      Math.cos(h.lat*rad)*Math.cos(c.lat*rad)*Math.sin((h.lng-c.lng)*rad/2)**2;
    return 12742 * Math.asin(Math.min(1,Math.sqrt(a)));
  }

  function allFeasibleChoices(before, year) {
    const held = byId(before.houseId);
    const choices = [];
    const add = result => { if (result) choices.push(result); };
    add(optionResult(clone(before),year,'hold',held ? `${held.name} 보유` : '현금 보유',held?.id));
    if (held) add(optionResult(sellFromState(before,year),year,'sell',`${held.name} 매도`,null));
    for (const h of listings) {
      if (h.id === before.houseId) continue;
      const traded = buyFromState(before,h,year);
      if (!traded) continue;
      const item = optionResult(traded,year,held ? 'switch' : 'buy',`${h.name} ${held ? '갈아타기' : '매수'}`,h.id);
      if (item) add(item);
    }
    return choices.sort((a,b)=>b.worth-a.worth);
  }

  function bestDistinctDistrict(choices, profile, predicate, limit=3) {
    const results = [], seen=new Set();
    for (const c of choices) {
      const h=byId(c.houseId);
      if (!h || !predicate(h)) continue;
      const tag=`${regionKey(h)}|${h.district}`;
      if (seen.has(tag)) continue;
      seen.add(tag);
      results.push({...c, district:`${regionKey(h)} ${h.district}`,distance:commuteKm(h,profile),
        price:valueAt(h,c.year),nextPrice:valueAt(h,c.year+1)});
      if (results.length >= limit) break;
    }
    return results;
  }

  function yearlyReview() {
    let before = originalStartingState();
    const rows = [];
    let mismatch = false;
    const trades = session.transactions || [];
    for (const year of DECISION_YEARS) {
      const recordedDecision = (session.yearly || []).find(row => row.year === year);
      const trade = trades.find(t => t.year === year && t.kind !== 'forced');
      const actualPostDecision = applyTransaction(before, year, trade);
      if (!actualPostDecision || !recordedDecision) { mismatch = true; break; }
      const options = allFeasibleChoices(before, year);
      const actual = simulatePeriod(actualPostDecision,year);
      const actualWorth = netWorth(actual.state,year+1);
      const logged = (session.passages || []).find(p=>p.from===year);
      if (logged && Math.abs(logged.worthAfter-actualWorth)>10000) mismatch=true;
      const valid = options.filter(x=>x.houseId);
      rows.push({year,
        actualDescription:recordedDecision.decision,
        actualWorth,
        financialBest:options[0] || null,
        allChoices:options.length,
        purchasable:valid.length,
        // These are separate shortlists, not a single supposedly objective recommendation.
        seoul:bestDistinctDistrict(valid,before.profile,h=>regionKey(h)==='서울'),
        nearby:bestDistinctDistrict(valid,before.profile,h=>commuteKm(h,before.profile)<=25),
        global:bestDistinctDistrict(valid,before.profile,()=>true),
        globalProfit: options[0] ? options[0].worth-actualWorth : 0,
      });
      before=actual.state;
    }
    return {rows,mismatch};
  }

  function median(values) {
    if (!values.length) return 0;
    const sorted=values.slice().sort((a,b)=>a-b),m=Math.floor(sorted.length/2);
    return sorted.length % 2 ? sorted[m] : (sorted[m-1]+sorted[m])/2;
  }
  function marketMovers() {
    const groups=new Map();
    for (const h of listings) {
      if (!(h.basePrice>0))continue;
      const growth=valueAt(h,END_YEAR)/valueAt(h,START_YEAR)-1;
      const district=`${regionKey(h)} · ${h.district}`;
      if (!groups.has(district))groups.set(district,[]);
      groups.get(district).push(growth);
    }
    const districts=[...groups.entries()].filter(([,v])=>v.length>=3)
      .map(([name,values])=>({name,count:values.length,growth:median(values)}))
      .sort((a,b)=>b.growth-a.growth);
    return {rising:districts.slice(0,3),falling:districts.slice(-3).reverse()};
  }
  const rateText=rate=>`${rate>=0?'+':''}${(rate*100).toFixed(1)}%`;
  const rowsFor = items => items.length ? items.map(x=>
    `<li><span>${safe(x.name)}</span><strong>${rateText(x.growth)}</strong><small>${x.count}개 단지 표본 · 게임 가격</small></li>`
  ).join('') : '<li>표본 부족</li>';

  function candidateHtml(list,year) {
    if(!list.length)return '<p class="hindsight-empty">조건에 맞으며 당시 매수·상환 가능한 후보가 없었습니다.</p>';
    return `<ol class="hindsight-choice-list">${list.map((x,i)=>{
      const rise=x.nextPrice/x.price-1;
      const commute=Number.isFinite(x.distance)?` · 직장 직선거리 ${x.distance.toFixed(1)}km`:'';
      return `<li><b>${i+1}. ${safe(x.description)}</b><span>${safe(x.district)}${commute}</span><small>${year}년 ${won(x.price)} → ${year+1}년 ${won(x.nextPrice)} (${rateText(rise)})</small><em>해당 선택 시 1년 후 순자산 ${won(x.worth)}</em></li>`;
    }).join('')}</ol>`;
  }

  function makeReportHtml() {
    const review=yearlyReview(), movers=marketMovers();
    const years=review.rows.map(row=>{
      const best=row.financialBest;
      const h=best && byId(best.houseId);
      const describeBest=best ? `${safe(best.description)}${h?` (${safe(regionKey(h)+' '+h.district)})`:''}`:'비교 불가';
      const extra=best ? ` · ${won(best.worth)}`:'';
      return `<details class="year-hindsight">
        <summary><strong>${row.year}년</strong><span>내 선택: ${safe(row.actualDescription)}</span><b>비교 후보 ${row.allChoices}개</b></summary>
        <div class="year-hindsight-body">
          <p>내 선택의 1년 후 순자산: <b>${won(row.actualWorth)}</b>. 전체 지역에서 재무 성과만 비교한 1위: <b>${describeBest}</b>${extra}.</p>
          <p class="hindsight-footnote">이 순위는 주거 만족도나 실제 이동시간을 고려하지 않은 <b>사후 재무 결과</b>입니다. 위치가 멀다는 이유로 좋은 주거 선택인 것은 아닙니다.</p>
          <h4>① 서울 내 매수 가능한 후보 (구별 상위 3곳)</h4>${candidateHtml(row.seoul,row.year)}
          <h4>② 직장에서 직선거리 25km 이내 후보 (지역별 상위 3곳)</h4>${candidateHtml(row.nearby,row.year)}
          <h4>③ 지역 제한 없이 재무 성과 상위 후보 (구별 상위 3곳)</h4>${candidateHtml(row.global,row.year)}
          <p class="hindsight-footnote">매수 가능 여부는 ${row.year}년 본인의 현금·기존 주택·대출·소득과 거래비용 기준. 중도 강제 매도되는 선택은 제외. 직선거리 25km는 교육용 비교 범위이지 통근시간 조건이 아닙니다.</p>
        </div>
      </details>`;
    }).join('');

    return `<section class="personal-hindsight" aria-label="게임 종료 후 선택 분석">
      <h2>게임 종료 후: 시장과 나의 선택 돌아보기</h2>
      <p>이 자료는 <b>2031년 게임 종료 후에만</b> 공개됩니다. 실제 미래 가격이나 반드시 정답인 집은 없습니다.</p>
      <div class="hindsight-market">
        <section><h3>상승 폭이 컸던 지역</h3><ol>${rowsFor(movers.rising)}</ol></section>
        <section><h3>상대적으로 부진했던 지역</h3><ol>${rowsFor(movers.falling)}</ol></section>
      </div>
      <p class="hindsight-footnote">2026~2031년 게임 속 동일 단지 가격 변화율을 시·군·구별 중앙값으로 비교했습니다. 단지 3개 이상인 지역만 표시합니다.</p>
      <h3>연도별로 내 자산에서 어떤 선택지가 있었을까?</h3>
      <p>그해의 실제 보유 현금·주택·대출·소득을 복원하여 매수 가능한 후보를 비교했습니다. <b>하나의 정답을 추천하는 대신 서울, 직장 주변, 전체 지역을 따로</b> 보여줍니다. 각 해를 눌러 후보와 가격 변화를 확인하세요.</p>
      ${review.mismatch?'<p class="hindsight-warning">저장한 거래 기록과 현행 가격 모델의 계산이 일부 다릅니다. 수정 이후 새 게임으로 시작하면 비교가 정확해집니다.</p>':''}
      ${years}
      <p class="hindsight-footnote"><b>해석 주의:</b> 선택별 1년 뒤 순자산을 결과를 알고 비교한 것입니다. 5년 전체 최적 경로가 아니며, 후보별 수치를 연도 간 합산하면 안 됩니다. 실제 거주 만족도와 출퇴근 교통편, 세금 등은 평가에서 제외됩니다.</p>
    </section>
    <style>
      .personal-hindsight{margin:28px 0;padding:22px;border:1px solid #dbe7e4;border-radius:17px;background:#f8fbfa;color:#213b37}
      .personal-hindsight h2{font-size:1.4rem;margin:0 0 8px}.personal-hindsight h3{font-size:1.05rem;margin:22px 0 10px}
      .personal-hindsight p{line-height:1.65}.hindsight-market{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .hindsight-market section{background:#fff;border:1px solid #e0eae7;border-radius:12px;padding:16px}
      .hindsight-market ol{padding:0;margin:0;list-style:none}.hindsight-market li{display:grid;grid-template-columns:1fr auto;gap:4px 10px;padding:8px 0;border-top:1px solid #edf0ee}
      .hindsight-market li:first-child{border-top:0}.hindsight-market small{grid-column:1/-1;color:#71817f;font-size:.8rem}
      .hindsight-scroll{overflow-x:auto}.hindsight-footnote{font-size:.82rem;color:#5f726e;margin-top:11px}
      .year-hindsight{background:#fff;border:1px solid #dae7e3;border-radius:12px;margin:10px 0}
      .year-hindsight summary{cursor:pointer;padding:15px;display:flex;gap:10px;flex-wrap:wrap;align-items:center}
      .year-hindsight summary strong{font-size:1.05rem;color:#12685d}.year-hindsight summary span{flex:1;min-width:170px}.year-hindsight summary b{font-size:.8rem;color:#607c72}
      .year-hindsight-body{padding:5px 18px 18px;border-top:1px solid #eff3f1}
      .year-hindsight h4{margin:20px 0 7px;font-size:.98rem}
      .hindsight-choice-list{margin:0;padding:0;list-style:none;display:grid;gap:9px}
      .hindsight-choice-list li{padding:11px 13px;border-radius:9px;background:#f2f8f6;display:grid;gap:4px}
      .hindsight-choice-list span,.hindsight-choice-list small{color:#4e675f;font-size:.8rem}
      .hindsight-choice-list em{font-size:.87rem;font-weight:800;font-style:normal}
      .hindsight-empty{background:#f8faf9;border-radius:8px;padding:12px;font-size:.87rem;color:#6d7d77}
      .hindsight-warning{padding:12px;background:#fff4dd;border:1px solid #e4cb93;border-radius:8px;color:#715318}
      @media(max-width:650px){.personal-hindsight{padding:13px}.hindsight-market{grid-template-columns:1fr}}
    </style>`;
  }

  finalHtml=function(){
    const base=originalFinalHtml();
    if(!session || session.phase!=='finished' || session.year!==END_YEAR)return base;
    const key=JSON.stringify([session.profile?.id,session.initialCash,session.yearly,session.transactions,story.meta?.version,listings.length]);
    if(key!==lastKey){lastKey=key;try{lastReport=makeReportHtml();}catch(error){console.error('최종 비교 분석 오류:',error);lastReport='<p class="subtle">추가 분석에 실패했습니다. 기본 결과는 그대로 확인할 수 있습니다.</p>';}}
    const section='<section class="reflection">';
    return base.includes(section)?base.replace(section,lastReport+section):base+lastReport;
  };
})();
