/**
 * Housing Classroom — evidence-linked classroom market model.
 * 2026–2031년 기존 API 유지. 구매력·수요·공급은 공개 일정과 동일한 데이터를 사용.
 * 실제 공식 통계로 추정한 계수가 아니므로 수업용 가상 시나리오로 표시할 것.
 * Browser JavaScript; no Node.js required to play the game.
 * All coefficients are fictional classroom assumptions, not empirical causal estimates.
 * Uses the existing 2026–2031 game timeline without changing transaction logic.
 */
const distanceKm = (a, b) => Math.hypot((a[0] - b[0]) * 111, (a[1] - b[1]) * 88);

const MARKET_PARAMETERS = {
  referenceSupplyRate: { 서울: 2.0, 경기: 2.8, 인천: 2.2 }, // % of housing stock per year
  baseDemand: { 서울: 0, 경기: 0, 인천: 0 }, // unexplained regional premiums disabled
  rateCoefficient: -0.012,       // 1 percentage point mortgage-rate change
  ltvCoefficient: 0.08,          // change in ratio (0..1)
  paymentCoefficient: 0.08,      // change in ratio (0..1)
  demandCoefficient: 0.005,     // one fictional demand step
  projectCoefficient: 0.30,
  supplyCoefficient: -0.022,    // 1 percentage-point supply-rate gap
  supplyWeights: { dong: 0.45, district: 0.45, region: 0.10 },
  annualFloor: -0.17,
  annualCeiling: 0.19
};

function localProjects(h, year) {
  return story.projects.map(p => {
    const proximity = clamp(1 - distanceKm([h.lat, h.lng], p.center) / p.radius, 0, 1);
    const stage = p.stages[String(year)];
    return { ...p, ...(stage || {}), proximity, effect: proximity * (stage?.effect || 0) };
  }).filter(p => p.kind === '수요' && p.proximity > 0.1 && p.stages[String(year)]);
}

const previousPolicy = year => roundFor(year - 1) || story.referencePolicy;

function financeSensitivity(h) {
  const regionFactor = { 서울: 0.95, 경기: 1.05, 인천: 1.10 }[regionKey(h)] || 1;
  const priceFactor = clamp(1.1 - (h.basePrice / 1e9) * 0.15, 0.8, 1.15);
  return regionFactor * priceFactor;
}


/**
 * 명시적인 수업용 가상 입주 일정. 각 호수는 해당 연도 시도 총량의 일부다.
 * 표본 매물 위치/연도로 해시를 생성하거나 사후에 임의 보정하지 않는다.
 * 같은 객체를 가격 계산, 뉴스, 아파트 상세 근거에 사용한다.
 * (2026~2030년 실제 분양·준공 통계나 공식 예측은 아님.)
 *
 * 지역·연도별 나머지 입주는 '그 외 지역' 기본 물량으로 두고,
 * 표본 주택 수(count)를 대략적인 기존 주택 재고 비중의 대리변수로 사용한다.
 */
const CLASSROOM_SUPPLY_CALENDAR = Object.freeze([
  { year: 2026, region: '서울', district: '강서구', center: [37.560, 126.839], radiusKm: 9, homes: 3000, title: '강서 생활권 신축 단지 입주 시작' },
  { year: 2026, region: '서울', district: '노원구', center: [37.652, 127.062], radiusKm: 9, homes: 2200, title: '노원 생활권 정비사업 준공 물량 입주' },
  { year: 2026, region: '경기', district: '용인시', center: [37.250, 127.115], radiusKm: 14, homes: 5000, title: '용인 남부 산업단지 배후 주거단지 입주' },
  { year: 2026, region: '경기', district: '평택시', center: [36.991, 127.091], radiusKm: 15, homes: 5500, title: '평택 신규 주거단지 1차 입주' },
  { year: 2026, region: '인천', district: '서구', center: [37.548, 126.676], radiusKm: 12, homes: 3000, title: '인천 서구 대단지 순차 입주' },
  { year: 2027, region: '서울', district: '강서구', center: [37.560, 126.839], radiusKm: 9, homes: 4200, title: '강서 생활권 신축 2차 입주' },
  { year: 2027, region: '경기', district: '화성시', center: [37.200, 127.085], radiusKm: 17, homes: 7000, title: '화성 경기 남부 신도시 신축 입주' },
  { year: 2027, region: '경기', district: '용인시', center: [37.250, 127.115], radiusKm: 14, homes: 7500, title: '용인 남부 신축 대단지 입주 확대' },
  { year: 2027, region: '경기', district: '평택시', center: [36.991, 127.091], radiusKm: 15, homes: 6400, title: '평택 2차 준공·입주' },
  { year: 2027, region: '인천', district: '서구', center: [37.548, 126.676], radiusKm: 12, homes: 4800, title: '인천 서구 준공 물량 확대' },
  { year: 2028, region: '서울', district: '노원구', center: [37.652, 127.062], radiusKm: 9, homes: 3300, title: '노원 정비사업 2차 입주' },
  { year: 2028, region: '서울', district: '강서구', center: [37.560, 126.839], radiusKm: 9, homes: 4200, title: '강서 3차 입주 물량 집중' },
  { year: 2028, region: '경기', district: '화성시', center: [37.200, 127.085], radiusKm: 17, homes: 11000, title: '화성 신도시 대규모 입주 집중' },
  { year: 2028, region: '경기', district: '용인시', center: [37.250, 127.115], radiusKm: 14, homes: 10500, title: '용인 대단지 동시 준공' },
  { year: 2028, region: '경기', district: '평택시', center: [36.991, 127.091], radiusKm: 15, homes: 9500, title: '평택 신축 입주 정점' },
  { year: 2028, region: '인천', district: '서구', center: [37.548, 126.676], radiusKm: 12, homes: 6400, title: '인천 서구 신축 입주 집중' },
  { year: 2029, region: '서울', district: '노원구', center: [37.652, 127.062], radiusKm: 9, homes: 3400, title: '노원 정비사업 잔여 입주' },
  { year: 2029, region: '서울', district: '강서구', center: [37.560, 126.839], radiusKm: 9, homes: 2500, title: '강서 지역 신축 입주 완화' },
  { year: 2029, region: '경기', district: '화성시', center: [37.200, 127.085], radiusKm: 17, homes: 7800, title: '화성 입주 물량 일부 축소' },
  { year: 2029, region: '경기', district: '용인시', center: [37.250, 127.115], radiusKm: 14, homes: 7500, title: '용인 연속 입주 진행' },
  { year: 2029, region: '인천', district: '서구', center: [37.548, 126.676], radiusKm: 12, homes: 5500, title: '인천 서구 잔여 입주 이어짐' },
  { year: 2030, region: '서울', district: '노원구', center: [37.652, 127.062], radiusKm: 9, homes: 2000, title: '노원 신규 입주 둔화' },
  { year: 2030, region: '경기', district: '평택시', center: [36.991, 127.091], radiusKm: 15, homes: 5000, title: '평택 신축 입주 정점 이후 감소' },
  { year: 2030, region: '경기', district: '용인시', center: [37.250, 127.115], radiusKm: 14, homes: 4000, title: '용인 신축 입주 마무리' },
  { year: 2030, region: '경기', district: '화성시', center: [37.200, 127.085], radiusKm: 17, homes: 4000, title: '화성 신규 준공 감소' },
  { year: 2030, region: '인천', district: '서구', center: [37.548, 126.676], radiusKm: 12, homes: 4000, title: '인천 서구 신규 입주 감소' }
]);

const supplyScheduleForYear = year => CLASSROOM_SUPPLY_CALENDAR.filter(e => e.year === year);
function scheduledSupplyNear(h, year) {
  const region = regionKey(h);
  return supplyScheduleForYear(year).filter(e =>
    e.region === region && String(h.district || '').includes(e.district) &&
    Number.isFinite(h.lat) && Number.isFinite(h.lng) &&
    distanceKm([h.lat, h.lng], e.center) <= e.radiusKm
  );
}

function periodComponents(h, fromYear) {
  const current = roundFor(fromYear);
  if (!current) throw Error('Unknown decision period: ' + fromYear);

  const previous = previousPolicy(fromYear);
  const region = regionKey(h);
  const regional = current.regionalStats[region];
  const projects = localProjects(h, fromYear);
  const neighborhood = neighborhoodSupply(h, fromYear);

  // A change in borrowing conditions affects purchasing power, not market prices mechanically.
  const financialRaw =
    MARKET_PARAMETERS.rateCoefficient * (current.rate - previous.rate) +
    MARKET_PARAMETERS.ltvCoefficient * (current.ltv - previous.ltv) +
    MARKET_PARAMETERS.paymentCoefficient * (current.paymentRatio - previous.paymentRatio);
  const finance = clamp(financialRaw * financeSensitivity(h), -0.04, 0.04);

  const projectDemand = projects.filter(p => p.kind === '수요')
    .reduce((sum, p) => sum + p.effect, 0) * MARKET_PARAMETERS.projectCoefficient;
  // 정체가 불명확한 구 이름 보너스/패널티는 제거.
  // 올해 공개된 광역권 수요 단계 및 사업 단계에만 지역 수요가 반응한다.
  const regionalDemand = Number(regional.demand) || 0;
  const localDemandShift = MARKET_PARAMETERS.demandCoefficient * regionalDemand;
  const demand = clamp(
    MARKET_PARAMETERS.baseDemand[region] + localDemandShift + projectDemand,
    -0.070, 0.085
  );

  // Blending avoids treating the distribution of the sample listings as true dong-level housing stock.
  const rows = neighborhood.rows;
  const district = neighborhood.district;
  const dong = neighborhood.dong;
  const w = MARKET_PARAMETERS.supplyWeights;
  const blendedSupplyRate =
    rows[0].rate * w.region + district.rate * w.district + dong.rate * w.dong;
  const referenceRate = MARKET_PARAMETERS.referenceSupplyRate[region];
  const supply = clamp(
    MARKET_PARAMETERS.supplyCoefficient * (blendedSupplyRate - referenceRate),
    -0.065, 0.050
  );

  return [
    {
      key: 'finance', label: '구매력', value: finance,
      detail: `대출금리 ${previous.rate.toFixed(1)}→${current.rate.toFixed(1)}%, 담보 한도 ${formatPolicyPercent(previous.ltv)}→${formatPolicyPercent(current.ltv)}%, 상환 한도 ${formatPolicyPercent(previous.paymentRatio)}→${formatPolicyPercent(current.paymentRatio)}%. 지역·가격별 민감도를 반영했습니다.`
    },
    {
      key: 'demand', label: '수요', value: demand,
      detail: `${region}의 올해 수요 ${regional.demand > 0 ? ' +' : ''}${regional.demand}단계와, 해당 생활권에서 발표·진행된 교통·고용 사업의 거리별 효과만 반영했습니다.`
    },
    {
      key: 'supply', label: '공급', value: supply,
      detail: `${dong.name} 입주예정 ${KR.format(dong.total)}호 / 가상 기존 주택 ${KR.format(dong.stock)}호(약 ${dong.rate.toFixed(2)}%). 동·구·시도 공급률을 합산한 값은 ${blendedSupplyRate.toFixed(2)}%, 가상 기준은 ${referenceRate.toFixed(1)}%입니다. 지역별 입주 일정 ${scheduledSupplyNear(h, fromYear).map(e => e.title + " (" + KR.format(e.homes) + "호)").join(", ") || "해당 생활권 별도 일정 없음"}과 그 외 지역의 기본 입주 물량을 반영했습니다.`
    }
  ];
}

function annualChange(h, fromYear) {
  const raw = periodComponents(h, fromYear).reduce((sum, item) => sum + item.value, 0);
  return clamp(raw, MARKET_PARAMETERS.annualFloor, MARKET_PARAMETERS.annualCeiling);
}

function valueAt(h, year) {
  if (![...DECISION_YEARS, END_YEAR].includes(year)) throw Error('Unknown price year: ' + year);
  let price = h.basePrice;
  for (const from of DECISION_YEARS) {
    if (from >= year) break;
    price = Math.round(price * (1 + annualChange(h, from)));
  }
  return price;
}

function priceAtMonth(h, fromYear, elapsed) {
  const a = valueAt(h, fromYear);
  const b = valueAt(h, fromYear + 1);
  return Math.round(a * Math.pow(b / a, elapsed / PERIOD_MONTHS));
}

function historyFor(h, year) {
  return [...DECISION_YEARS, END_YEAR].filter(y => y <= year)
    .map(y => ({ year: y, value: valueAt(h, y) }));
}

function explainPeriod(h, fromYear) {
  const base = valueAt(h, fromYear);
  const next = valueAt(h, fromYear + 1);
  const raw = periodComponents(h, fromYear);
  const rawRate = raw.reduce((sum, f) => sum + f.value, 0);
  const effectiveRate = annualChange(h, fromYear);
  const scale = Math.abs(rawRate) > 1e-12 ? effectiveRate / rawRate : 1;
  const components = raw.map(f => ({ ...f, value: f.value * scale, amount: base * f.value * scale }));
  return {
    base, next, change: next - base, rate: next / base - 1, components,
    rounding: next - base - components.reduce((sum, f) => sum + f.amount, 0)
  };
}

function peerSummary(h) {
  let peers = listings.filter(x => x.district === h.district && Math.abs(x.area - h.area) <= 15);
  const scope = peers.length >= 5 ? '같은 시·군·구·유사 면적' : '같은 시·도·유사 면적';
  if (peers.length < 5) peers = listings.filter(x => regionKey(x) === regionKey(h) && Math.abs(x.area - h.area) <= 15);
  const vals = peers.map(x => x.basePrice).sort((a, b) => a - b);
  return { count: vals.length, median: vals[Math.floor(vals.length / 2)] || h.basePrice, scope };
}

function practiceTrades(h, year) {
  const seed = [...String(h.id)].reduce((n, c) => n + c.charCodeAt(0), 0) + year;
  const center = valueAt(h, year) * (1 + ((seed % 7) - 3) * 0.01);
  return [0.98, 1, 1.02].map(f => Math.round(center * f / 100000) * 100000);
}

// Existing app API: neighborhoodSupply(h, year), supplyTree(year) must remain stable.
// A named project receives a specified portion of the region's announced total.
// The remaining region total is allocated by sample count as a proxy stock ratio;
// NO year-dependent hash/randomness or unexplained local growth factor is used.
const classroomSupplyCache = new Map();
const supplyPath = h => [h.region, ...h.district.trim().split(/\s+/), h.dong || '기타 지역'];

function allocateInteger(total, weighted) {
  if (!weighted.length) return [];
  if (!Number.isSafeInteger(total) || total < 0) throw Error('Invalid allocation total');
  const weights = weighted.map(v => Math.max(0, v));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0) throw Error('No housing weight');
  const exact = weights.map(v => total * v / sum);
  const values = exact.map(Math.floor);
  let rest = total - values.reduce((a, b) => a + b, 0);
  const priority = exact.map((x, i) => [x - values[i], i])
    .sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let j = 0; j < rest; j++) values[priority[j][1]]++;
  return values;
}
function supplyTree(year) {
  const round = roundFor(year);
  if (!round) throw Error('Unknown supply period: ' + year);
  const signature = JSON.stringify([
    story.regionalHousingStock, round.regionalStats, supplyScheduleForYear(year), listings.length
  ]);
  const cached = classroomSupplyCache.get(year);
  if (cached?.signature === signature) return cached.root;

  const root = { children: new Map(), count: 0 };
  for (const h of listings) {
    let node = root;
    node.count++;
    for (const label of supplyPath(h)) {
      if (!node.children.has(label)) {
        node.children.set(label, { label, parent: node, children: new Map(), count: 0 });
      }
      node = node.children.get(label);
      node.count++;
    }
    if (!node.homes) node.homes = [];
    node.homes.push(h);
  }
  function allocateByCount(node, total, field) {
    node[field] = total;
    const children = [...node.children.values()];
    if (!children.length) return;
    const splits = allocateInteger(total, children.map(c => c.count));
    children.forEach((c, i) => allocateByCount(c, splits[i], field));
  }
  function leafNodes(node, out = []) {
    if (!node.children.size) out.push(node);
    else for (const child of node.children.values()) leafNodes(child, out);
    return out;
  }
  function addToAncestors(leaf, value) {
    for (let node = leaf; node && node !== root; node = node.parent) node.total += value;
  }
  for (const [regionName, node] of root.children) {
    const region = regionName === '서울특별시' ? '서울' : regionName === '인천광역시' ? '인천' : '경기';
    const total = round.regionalStats[region].completions;
    const plans = supplyScheduleForYear(year).filter(e => e.region === region);
    const specified = plans.reduce((acc, e) => acc + e.homes, 0);
    if (specified > total) throw Error(`Supply schedule exceeds ${region} region total: ${year}`);
    allocateByCount(node, story.regionalHousingStock[region], 'stock');
    const leaves = leafNodes(node);
    // If a project's district is absent from the 610 sample, keep its units in
    // the region-wide remainder instead of faking a project in another district.
    const represented = plans.map(event => {
      const weights = leaves.map(leaf => leaf.homes.reduce((acc, h) => {
        if (regionKey(h) !== event.region || !String(h.district).includes(event.district)) return acc;
        const km = distanceKm([h.lat, h.lng], event.center);
        if (!Number.isFinite(km) || km > event.radiusKm) return acc;
        return acc + Math.max(0.15, 1 - km / event.radiusKm);
      }, 0));
      return { event, weights, applied: weights.some(x => x > 0) };
    });
    const modeledPlanTotal = represented.reduce((acc, e) => acc + (e.applied ? e.event.homes : 0), 0);
    allocateByCount(node, total - modeledPlanTotal, 'total');
    for (const { event, weights, applied } of represented) {
      if (!applied) continue;
      const units = allocateInteger(event.homes, weights);
      leaves.forEach((leaf, i) => { if (units[i]) addToAncestors(leaf, units[i]); });
    }
    if (node.total !== total) throw Error(`Supply mass balance failed: ${year} ${region}`);
  }
  classroomSupplyCache.set(year, { signature, root });
  return root;
}

function neighborhoodSupply(h, year) {
  let node = supplyTree(year);
  let parent;
  const rows = [];
  const describe = n => ({
    name: n.label, total: n.total, stock: n.stock,
    rate: n.stock ? n.total / n.stock * 100 : 0
  });
  for (const name of supplyPath(h)) {
    parent = node;
    node = node.children.get(name);
    if (!node) throw Error('Unknown supply location: ' + name);
    rows.push(describe(node));
  }
  const dong = rows.at(-1);
  const nearby = [...parent.children.values()].filter(n => n !== node).map(describe)
    .sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name, 'ko')).slice(0, 3);
  return { rows, dong, district: rows.at(-2), nearby };
}
