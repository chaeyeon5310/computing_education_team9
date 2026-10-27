/**
 * Housing Classroom — calibrated teaching market model.
 * Browser JavaScript; no Node.js required to play the game.
 * All coefficients are fictional classroom assumptions, not empirical causal estimates.
 * Uses the existing 2026–2031 game timeline without changing transaction logic.
 */
const distanceKm = (a, b) => Math.hypot((a[0] - b[0]) * 111, (a[1] - b[1]) * 88);

const MARKET_PARAMETERS = {
  referenceSupplyRate: { 서울: 1.8, 경기: 2.7, 인천: 2.2 }, // % of housing stock per year
  baseDemand: { 서울: 0.008, 경기: 0.005, 인천: 0.003 }, // annual rate
  rateCoefficient: -0.012,       // 1 percentage point mortgage-rate change
  ltvCoefficient: 0.08,          // change in ratio (0..1)
  paymentCoefficient: 0.08,      // change in ratio (0..1)
  demandCoefficient: 0.004,     // one fictional demand step
  projectCoefficient: 0.22,
  supplyCoefficient: -0.012,    // 1 percentage-point supply-rate gap
  supplyWeights: { dong: 0.25, district: 0.45, region: 0.30 },
  annualFloor: -0.12,
  annualCeiling: 0.13
};

function localProjects(h, year) {
  return story.projects.map(p => {
    const proximity = clamp(1 - distanceKm([h.lat, h.lng], p.center) / p.radius, 0, 1);
    const stage = p.stages[String(year)];
    return { ...p, ...(stage || {}), proximity, effect: proximity * (stage?.effect || 0) };
  }).filter(p => p.proximity > 0.1 && p.stages[String(year)]);
}

const previousPolicy = year => roundFor(year - 1) || story.referencePolicy;

function financeSensitivity(h) {
  const regionFactor = { 서울: 0.95, 경기: 1.05, 인천: 1.10 }[regionKey(h)] || 1;
  const priceFactor = clamp(1.1 - (h.basePrice / 1e9) * 0.15, 0.8, 1.15);
  return regionFactor * priceFactor;
}


/**
 * 지역별 고정된 주거 선호 가정. 실제 실거래 데이터나 공식 등급이 아니다.
 * 강남/서초 등 이름이 특정 지역에 해당할 때만 추가 가산한다.
 * 해당 보정은 연도별 수요에만 적용하며 초기 주택가격은 바꾸지 않는다.
 */
function areaDemandPressure(h) {
  const loc = `${h.district || ''} ${h.dong || ''}`;
  const region = regionKey(h);
  if (region === '서울') {
    if (/강남구|서초구|송파구|용산구|성동구|마포구/.test(loc)) return 0.005;
    if (/영등포구|동작구|광진구|양천구|중구|종로구/.test(loc)) return 0.0025;
    return -0.001;
  }
  if (region === '경기') {
    if (/성남시.*분당구|과천시|하남시|광명시|안양시.*동안구/.test(loc)) return 0.004;
    if (/수원시.*영통구|용인시.*수지구|고양시.*일산|화성시.*동탄|구리시/.test(loc)) return 0.002;
    return -0.001;
  }
  if (/연수구|남동구/.test(loc)) return 0.0015;
  return -0.001;
}

// 물량 배분은 결정론적이다. 연도가 같으면 모든 학생에게 같은 입주량이 나온다.
function localityFraction(text) {
  let hash = 2166136261;
  for (const c of String(text)) {
    hash ^= c.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

/**
 * 매년 지역별 착공/입주 파이프라인 차이를 나타내는 가상 집중도.
 * 과거 전체 공급 총량은 그대로 두고 구·동 간 배분만 차별화한다.
 * 이 값은 '특별 이벤트'가 아닌 일반 입주 물량 변동을 뜻한다.
 */
function localSupplyWeight(h, year) {
  const district = `${h.region}|${h.district}`;
  const dong = `${district}|${h.dong || '기타 지역'}`;
  const districtCycle = 0.7 + 0.65 * localityFraction(`구|${district}|${year}`);
  const dongCycle = 0.72 + 0.60 * localityFraction(`동|${dong}|${year}`);
  const projects = localProjects(h, year).filter(p => p.kind === '공급');
  const pressure = projects.reduce(
    (sum, p) => sum + Math.max(0, p.proximity * (p.supplyPressure || 0)), 0
  );
  const projectMultiplier = 1 + clamp(pressure, 0, 1.25);
  return districtCycle * dongCycle * projectMultiplier;
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
  // 일자리·교통·도심 접근성을 반영하는 고정된 가상 생활권 성향.
  // 미래 시세를 미리 정하는 보정계수가 아니며, 모든 지역이 반드시 상승하는 것은 아니다.
  const areaDemand = areaDemandPressure(h);
  const demand = clamp(
    MARKET_PARAMETERS.baseDemand[region] + areaDemand +
    MARKET_PARAMETERS.demandCoefficient * regional.demand + projectDemand,
    -0.045, 0.055
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
    -0.04, 0.035
  );

  return [
    {
      key: 'finance', label: '구매력', value: finance,
      detail: `대출금리 ${previous.rate.toFixed(1)}→${current.rate.toFixed(1)}%, 담보 한도 ${formatPolicyPercent(previous.ltv)}→${formatPolicyPercent(current.ltv)}%, 상환 한도 ${formatPolicyPercent(previous.paymentRatio)}→${formatPolicyPercent(current.paymentRatio)}%. 지역·가격별 민감도를 반영했습니다.`
    },
    {
      key: 'demand', label: '수요', value: demand,
      detail: `${region} 수요 변화 ${regional.demand > 0 ? '+' : ''}${regional.demand}단계, ${h.district}의 가상 생활권 수요 ${(areaDemand * 100).toFixed(2)}%p와 주변 교통·고용 사업을 반영했습니다.`
    },
    {
      key: 'supply', label: '공급', value: supply,
      detail: `${dong.name} 입주예정 ${KR.format(dong.total)}호 / 가상 기존 주택 ${KR.format(dong.stock)}호(약 ${dong.rate.toFixed(2)}%). 동·구·시도 공급률을 합산한 값은 ${blendedSupplyRate.toFixed(2)}%, 가상 기준은 ${referenceRate.toFixed(1)}%입니다. 공급 사업 효과는 입주 물량에만 반영했습니다.`
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

// The existing app displays supply figures by region, district and dong.
// Keep that API unchanged, and preserve the regional totals exactly.
const classroomSupplyCache = new Map();
const supplyPath = h => [h.region, ...h.district.trim().split(/\s+/), h.dong || '기타 지역'];

function supplyTree(year) {
  const round = roundFor(year);
  if (!round) throw Error('Unknown supply period: ' + year);
  const signature = JSON.stringify([
    story.regionalHousingStock, round.regionalStats, story.projects.filter(p => p.kind === '공급')
  ]);
  const cached = classroomSupplyCache.get(year);
  if (cached?.signature === signature) return cached.root;

  const root = { children: new Map() };
  for (const h of listings) {
    const weight = localSupplyWeight(h, year);
    let node = root;
    for (const label of supplyPath(h)) {
      if (!node.children.has(label)) {
        node.children.set(label, { label, children: new Map(), count: 0, weight: 0 });
      }
      node = node.children.get(label);
      node.count++;
      node.weight += weight;
    }
  }

  function allocate(node, total, field, weightField) {
    node[field] = total;
    const children = [...node.children.values()];
    if (!children.length) return;
    const sum = children.reduce((s, c) => s + c[weightField], 0);
    if (sum <= 0) throw Error('Invalid housing allocation weights');
    const shares = children.map(c => total * c[weightField] / sum);
    const amounts = shares.map(Math.floor);
    const order = shares.map((n, i) => ({ i, fraction: n - amounts[i] }))
      .sort((a, b) => b.fraction - a.fraction);
    const left = total - amounts.reduce((a, b) => a + b, 0);
    for (let i = 0; i < left; i++) amounts[order[i].i]++;
    children.forEach((c, i) => allocate(c, amounts[i], field, weightField));
  }

  for (const [region, node] of root.children) {
    const key = region === '서울특별시' ? '서울' : region === '인천광역시' ? '인천' : '경기';
    allocate(node, story.regionalHousingStock[key], 'stock', 'count');
    allocate(node, round.regionalStats[key].completions, 'total', 'weight');
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
