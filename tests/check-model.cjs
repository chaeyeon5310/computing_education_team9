const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const input = JSON.parse(read('data/listings.json'));
const scenario = JSON.parse(read('data/classroom-scenario.json'));
const storage = new Map();
const context = vm.createContext({ console, document: {}, window: {}, localStorage: { setItem: (k,v) => storage.set(k,v), getItem: k => storage.get(k) || null } });
for (const file of ['src/state.js', 'src/market-model.js', 'src/finance.js', 'src/views.js', 'src/game.js']) vm.runInContext(read(file), context, { filename: file });
context.input = input; context.scenario = scenario;
const run = code => vm.runInContext(code, context);
run('listings = input.listings; story = scenario; render = () => {}; toast = () => {}; modal = () => {};');
const near = (a,b,msg) => assert.ok(Math.abs(a-b) < .02, `${msg}: ${a} != ${b}`);
assert.equal(input.listings.length, 610);
assert.equal(new Set(input.listings.map(x => x.id)).size, 610);
assert.deepEqual(scenario.meta.decisionYears, [2026,2028,2030]);
assert.equal(scenario.projects.length,8);
assert.equal(run('Object.keys(EXPLANATION_CATEGORIES).length'),6);
assert.notEqual(run('EXPLANATION_CATEGORIES.trend'),run('EXPLANATION_CATEGORIES.trades'));
let compared = 0;
for (const h of input.listings) {
  context.home = h;
  const result = run(`({ prices: [2026,2028,2030,2032].map(y => valueAt(home,y)), effects: DECISION_YEARS.map(y => explainPeriod(home,y)) })`);
  assert.equal(result.prices[0], h.basePrice);
  assert.ok(result.prices.every(p => Number.isFinite(p) && p > 0));
  result.effects.forEach((e,i) => {
    near(e.components.reduce((n,f) => n+f.amount,0) + e.rounding, result.prices[i+1]-result.prices[i], 'Contribution reconciliation');
    assert.ok(Math.abs(e.rounding) <= .5001);
    assert.ok(Math.abs(e.rate) < .3);
    compared++;
  });
}
// No future outcome is rendered in the first-round information or detail screen.
run('initialGame(personalities[0]); selected = listings[0].id;');
const initialHtml = run('appHtml()');
assert.ok(!initialHtml.includes(scenario.rounds[0].outcome));
assert.ok(!initialHtml.includes(scenario.rounds[1].policy.headline));
assert.ok(!initialHtml.includes(scenario.projects[0].stages['2026'].result));
assert.ok(initialHtml.includes('앞으로 24개월'));
assert.ok(!initialHtml.includes('7라운드'));
assert.ok(initialHtml.includes('data-action="policy-focus"'));
// Every period offers both directions; learners must compare local evidence.
const directions = run(`DECISION_YEARS.map(y => {
 const rates=listings.map(h=>explainPeriod(h,y).rate);
 return {year:y,up:rates.filter(x=>x>0).length,down:rates.filter(x=>x<0).length};
})`);
for(const row of directions) { assert.ok(row.up>0); assert.ok(row.down>0); assert.equal(row.up+row.down,610); }
// Every local displayed ratio is the supply input; stock is fixed across periods.
run(`for(const h of listings) for(const y of DECISION_YEARS) {
 const s=neighborhoodSupply(h,y), parts=periodComponents(h,y);
 if(Math.abs(parts[2].value-.02*(2-s.dong.total/s.dong.stock*100))>1e-12) throw Error('Displayed supply disconnected');
 if(s.dong.stock!==neighborhoodSupply(h,2026).dong.stock) throw Error('Housing stock changed');
 if(s.nearby.some(x=>x.name===s.dong.name)||s.nearby.length>3) throw Error('Invalid comparison');
}`);
// Both supply and fictional housing stock add up exactly at every administrative level.
run(`for (const y of DECISION_YEARS) {
 const root = supplyTree(y);
 function check(n) { if(n.children.size) { for(const field of ['total','stock']) { const sum=[...n.children.values()].reduce((s,c)=>s+c[field],0); if(sum!==n[field]) throw Error('Supply total mismatch'); } n.children.forEach(check); } }
 root.children.forEach(check);
}`);
run('var comparisonHome=listings.find(h=>neighborhoodSupply(h,2026).nearby.length===3);');
assert.ok(run('detailHtml(comparisonHome).includes("선택한 동")'));
assert.ok(run('neighborhoodSupply(comparisonHome,2026).nearby.every(d=>detailHtml(comparisonHome).includes(safe(d.name)))'));
// Higher interest reduces both purchase budget and the model's purchase contribution.
run('initialGame(personalities[0]);');
const before = run('({loan:maxLoan(listings[150],2026), effect:periodComponents(listings[150],2026)[0].value})');
run('story.rounds[0].rate += 1;');
const after = run('({loan:maxLoan(listings[150],2026), effect:periodComponents(listings[150],2026)[0].value})');
assert.ok(after.loan <= before.loan); near(before.effect-after.effect,.02,'Rate sensitivity');
run('story.rounds[0].rate -= 1;');
// Higher scheduled supply lowers the supply contribution, not unrelated demand.
const supplyBefore = run('periodComponents(listings[150],2026)');
run('story.rounds[0].regionalStats[regionKey(listings[150])].completions += 20000;');
const supplyAfter = run('periodComponents(listings[150],2026)');
assert.ok(supplyAfter[2].value<supplyBefore[2].value);
assert.equal(supplyAfter[1].value,supplyBefore[1].value);
run('story.rounds[0].regionalStats[regionKey(listings[150])].completions -= 20000;');
// A nearby supply project changes its displayed dong allocation, with the regional total fixed.
run("var west=story.projects.find(p=>p.id==='west-supply'); var westHome=[...listings].sort((a,b)=>distanceKm([a.lat,a.lng],west.center)-distanceKm([b.lat,b.lng],west.center))[0];");
const localBefore=run('neighborhoodSupply(westHome,2026)');
run('west.stages[2026].supplyPressure += 1;');
const localAfter=run('neighborhoodSupply(westHome,2026)');
assert.ok(localAfter.dong.total>localBefore.dong.total);
assert.equal(localAfter.rows[0].total,localBefore.rows[0].total);
run('west.stages[2026].supplyPressure -= 1;');
// A decision requires both an acknowledged policy and a reason.
assert.equal(run("decision('hold')"), false);
run('classroomUI.policyRead[2026]=true;');
assert.equal(run("decision('hold')"), false);
// All-cash strategy: exactly 6 years, 3 choices, 72 monthly cash flows.
for (let profile=0; profile<3; profile++) {
  run(`initialGame(personalities[${profile}]);`);
  for (let round=0; round<3; round++) run("classroomUI.policyRead[session.year]=true; classroomUI.reasons[session.year]='finance'; classroomUI.choices[session.year]='hold'; advance();");
  const result = run('({year:session.year,phase:session.phase,choices:session.yearly.length,months:session.passages.reduce((s,p)=>s+p.months,0),cash:session.cash,expected:session.initialCash+Array.from({length:6},(_,i)=>savingsForYear(2026+i)-rentForYear(2026+i)).reduce((a,b)=>a+b,0),gap:ledgerSummary().gap})');
  assert.equal(result.year,2032); assert.equal(result.phase,'finished'); assert.equal(result.choices,3); assert.equal(result.months,72);
  near(result.cash,result.expected,'Six-year cash strategy'); near(result.gap,0,'Cash ledger');
  assert.equal(run('ledgerSummary().propertyProfit'),0,'No house means no property profit');
  near(run('ledgerSummary().saved-ledgerSummary().rent'),run('assets()-session.initialCash'),'Cash growth is savings less rent');
  run('advance();'); assert.equal(run('session.yearly.length'),3);
}
// Financed purchase, hold under a repriced policy, switch, and sale paths for every persona.
let paths = 0;
for (let profile=0; profile<3; profile++) {
  for (const actions of [['buy','hold','sell'],['buy','buy','hold'],['hold','buy','buy']]) {
    run(`initialGame(personalities[${profile}]);`);
    for (const action of actions) {
      run("classroomUI.policyRead[session.year]=true; classroomUI.reasons[session.year]='finance';");
      let ok;
      if (action === 'buy') {
        ok = run("var target = listings.filter(h=>h.id!==session.houseId&&quote(h).can&&quote(h).needLoan>5e7&&budgetPreview(h).lowestCash>=0).sort((a,b)=>valueAt(a,session.year)-valueAt(b,session.year))[0]; target ? decision('buy', target.id) : decision('hold');");
      } else ok = run(`decision('${action}')`);
      assert.equal(ok,true, JSON.stringify({profile,actions,action,state:run("session")}));
      const oldMonths=run('session.loanMonths');
      run('advance();');
      assert.equal(run('session.lastPassage.months'),24);
      if (!run('session.lastPassage.forcedSale') && run('session.loan') > 0) assert.equal(run('session.loanMonths'),oldMonths-24);
      near(run('ledgerSummary().gap'),0,'Buy/sell/switch ledger');
      near(run('session.lastPassage.worthBefore'),run('session.yearly.at(-1).worthBefore'),'Decision snapshot before fees');
      near(run('session.lastPassage.worthAfter-session.lastPassage.worthBefore'),run('session.lastPassage.delta'),'Before/after comparison');
      assert.ok(run('periodResultHtml(session.lastPassage).includes("이전·이후 금액 비교")'));
      near(run('periodPerformance(session.lastPassage).totalChange'),run('session.lastPassage.delta'),'Separated round reconciliation');
    }
    assert.equal(run('session.year'),2032); near(run('session.passages.reduce((s,p)=>s+p.delta,0)'),run('assets()-session.initialCash'),'Round totals include transaction fees');
    near(run('session.passages.reduce((s,p)=>s+periodPerformance(p).propertyProfit,0)'),run('ledgerSummary().propertyProfit'),'Round property profits sum to final');
    near(run('ledgerSummary().propertyProfit+ledgerSummary().saved-ledgerSummary().rent'),run('assets()-session.initialCash'),'Separate income from property profit'); paths++;
  }
}
// Independent amortization oracle: one fixed payment for 24 months, principal is not an expense.
run('initialGame(personalities[0]);');
const amort = run(`(() => {
 const h=listings.find(h=>h.basePrice>4e8), state={...session, cash:1e8,houseId:h.id,loan:2e8,loanMonths:360,transactions:[]};
 const r=simulatePeriod(state,2026); return {loan:r.state.loan,paid:r.log.paid,interest:r.log.interest,principal:r.log.principal,annual:r.log.annual};
})()`);
const rate=.032/12, pay=2e8*rate/(1-Math.pow(1+rate,-360));
let balance=2e8, interest=0;
for(let m=0;m<24;m++){interest+=balance*rate;balance-=pay-balance*rate;}
near(amort.loan,balance,'24-month amortization'); near(amort.paid,24*pay,'24 payments'); near(amort.interest,interest,'Interest'); near(amort.principal,2e8-balance,'Principal');
assert.equal(amort.annual.length,2);
// Forced sale happens in the first shortfall month; rent starts only after liquidation.
const stress=run(`(() => {
 const h=listings.find(h=>h.basePrice>4e8), state={...session,profile:{...session.profile,income:0},cash:1000,houseId:h.id,loan:2e8,loanMonths:360,transactions:[]};
 const before=state.cash+h.basePrice-state.loan, result=simulatePeriod(state,2026), p=result.state, log=result.log;
 const fees=p.transactions.reduce((s,t)=>s+t.sellCost,0);
 return {log,house:p.houseId,tx:p.transactions.length,gap:p.cash-(before+log.saved-log.rent-log.interest+log.houseDelta-fees),expectedRent:rentForYear(2026,state.profile)*11/12+rentForYear(2027,state.profile)};
})()`);
assert.equal(stress.log.forcedSale,true); assert.equal(stress.log.forcedAt,'2026년 1월'); assert.equal(stress.house,null); assert.equal(stress.tx,1); near(stress.gap,0,'Forced-sale ledger'); near(stress.log.rent,stress.expectedRent,'Post-sale rent');
near(stress.log.endPrice-stress.log.startPrice,stress.log.houseDelta,'Forced-sale price comparison');
context.stressLog=stress.log;
assert.ok(run('periodComparisonHtml(stressLog).includes("2026년 1월 매도")'));
assert.ok(run('periodComparisonHtml(stressLog).includes("시장가격 · 매도 후")'));
near(run('periodPerformance(stressLog).totalChange'),stress.log.delta,'Forced-sale separated accounting');
// Positive salary savings must never conceal a property loss or change its color/sign.
const incomeTrap=run(`periodPerformance({houseDelta:-20000000,interest:5000000,tradeFees:2000000,saved:120000000,rent:3000000})`);
assert.equal(incomeTrap.propertyProfit,-27000000);
assert.equal(incomeTrap.totalChange,90000000);
context.incomeTrap=incomeTrap;
assert.ok(run('performanceMetricsHtml(incomeTrap).includes(\'class="profit-loss"\')'));
assert.ok(run('performanceMetricsHtml(incomeTrap).includes("-2,700만원")'));
assert.ok(run('performanceMetricsHtml(incomeTrap).includes("소득에서 모은 저축")'));
assert.equal(run('periodPerformance({houseDelta:-20000000,interest:5000000,tradeFees:2000000,saved:999000000,rent:3000000}).propertyProfit'),incomeTrap.propertyProfit);
// Refresh preserves committed choices; a repeat decision cannot duplicate transactions.
run("initialGame(personalities[0]); classroomUI.policyRead[2026]=true; classroomUI.reasons[2026]='finance'; decision('hold'); save(); session=null; restore();");
assert.equal(run('session.phase'),'reveal'); assert.equal(run("decision('hold')"),false); assert.equal(run('session.yearly.length'),1);
// A previous model's saved prices never leak into the new model or get overwritten.
const currentSave=storage.get('housing-fifth-future-v2');
storage.set('housing-fifth-future-v1','previous-scenario'); storage.delete('housing-fifth-future-v2');
assert.equal(run('restore()'),false); assert.equal(storage.get('housing-fifth-future-v1'),'previous-scenario');
storage.set('housing-fifth-future-v2',currentSave); assert.equal(run('restore()'),true);
// A collapsed mobile map cannot block selecting a home or move an invalid viewport.
vm.runInContext(read('src/map.js'), context, { filename: 'src/map.js' });
context.document.querySelector = () => ({clientWidth:0,clientHeight:0});
run("map={getZoom(){throw Error('Hidden map accessed');}}; markers={clearLayers(){throw Error('Hidden map painted');}}; focusMapHome(listings[0]); paintMarkers(); fitMatchingHomes();");
context.document.querySelector = () => ({clientWidth:600,clientHeight:500});
run("var cameraUpdates=0; map={getZoom:()=>10,invalidateSize(){},setView(p,z){if(!p.every(Number.isFinite)||z!==12)throw Error('Bad camera');cameraUpdates++;}}; focusMapHome(listings[0]);");
assert.equal(run('cameraUpdates'),1);
console.log(`PASS: 610 homes, ${compared} price reconciliations, ${paths} financed paths, 3 cash paths, 24-month amortization, forced sale, policy guards and save/restore.`);
console.log('Mixed local outcomes: '+JSON.stringify(directions));
