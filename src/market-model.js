/**
 * 가상 시장 및 단지별 가격 모델
 * 2020 실거래 기준선 + 2021~2026년 가상 가격 변화. 계수는 실증 추정값이 아니다.
 */
// ⚠ 현실 가격 예측 모형이 아닙니다.
// 모든 계수와 사건은 교육용 시뮬레이션의 가정입니다.
// 아파트의 2020년 기준가는 원본 국토부 실거래 가공 데이터입니다.


function regionMeasures(h, year) {
  const y = story.years[String(year)];
  return y.regionalStats[regionKey(h)];
}

function peerSummary(h) {
  const sameSize = x => Math.abs(x.area - h.area) <= 15;
  let peers = listings.filter(x => x.district === h.district && sameSize(x));
  const scope = peers.length >= 5 ? '같은 시·군·구·유사 면적' : '같은 시·도·유사 면적';
  if (peers.length < 5) peers = listings.filter(x => regionKey(x) === regionKey(h) && sameSize(x));
  const vals = peers.map(x => x.basePrice).sort((a, b) => a - b);
  const at = p => vals[Math.floor((vals.length - 1) * p)] || h.basePrice;
  return { count: vals.length, median: at(.5), low: at(.25), high: at(.75), scope };
}

// Scenario factors are pre-written, deterministic and location-linked; none is a statistically estimated causal coefficient.
// Same city's districts differ through location / housing size / vintage / price band / neighboring announced projects.
const yearRegionShocks = {
  2021: { 서울: .065, 경기: .105, 인천: .095 },
  2022: { 서울: -.080, 경기: -.145, 인천: -.155 },
  2023: { 서울: .012, 경기: -.036, 인천: -.052 },
  2024: { 서울: .070, 경기: -.023, 인천: -.040 },
  2025: { 서울: .067, 경기: .006, 인천: -.025 },
  2026: { 서울: .024, 경기: .023, 인천: .015 }
};

const zoneWeights = {
  강남: [.015, -.015, .025, .036, .018, -.035],
  도심: [.012, -.012, .022, .028, .032, .008],
  노도강: [.058, -.040, -.040, -.028, -.018, .045],
  경기남부: [.050, -.052, .030, .014, .028, .035],
  경기서부: [.034, -.028, -.030, -.008, -.022, .010],
  경기외곽: [.065, -.065, -.052, -.040, -.022, .040],
  인천동부: [.045, -.045, -.035, -.020, .010, .020],
  인천서부: [.075, -.075, -.060, -.045, -.035, .035]
};

const scenarioProjects = [
  {
    id: 'rail-west',
    title: '서북권 광역철도 환승망 논의',
    kind: '교통 기대',
    notice: 2020,
    center: [37.650, 126.855],
    radius: 20,
    effects: { 2021: .080, 2022: -.035, 2023: -.025, 2024: .025, 2025: .045, 2026: .015 },
    hint: '환승망 기대가 있으나 개통 시기와 사업 확정 여부는 불투명'
  },
  {
    id: 'new-city',
    title: '김포·인천 서북부 택지 대규모 입주',
    kind: '공급 부담',
    notice: 2020,
    center: [37.600, 126.700],
    radius: 19,
    effects: { 2021: .020, 2022: -.100, 2023: -.085, 2024: -.045, 2025: -.020, 2026: .005 },
    hint: '향후 2~4년간 신축 입주가 몰릴 수 있다는 전망'
  },
  {
    id: 'tech-job',
    title: '판교·분당권 기업 연구시설 집적',
    kind: '일자리 유입',
    notice: 2021,
    center: [37.390, 127.115],
    radius: 22,
    effects: { 2022: -.010, 2023: .090, 2024: .055, 2025: .060, 2026: .025 },
    hint: '연구직 채용 확대 계획이 발표됐으나 실제 상주 인원은 확인 필요'
  },
  {
    id: 'old-east',
    title: '서울 동부 구축 정비사업 추진',
    kind: '재건축 기대',
    notice: 2021,
    center: [37.530, 127.080],
    radius: 17,
    effects: { 2022: -.050, 2023: .025, 2024: .075, 2025: .055, 2026: -.040 },
    hint: '조합 추진 단계로 인허가·분담금·공급 지연 위험 존재'
  },
  {
    id: 'supply-south',
    title: '경기 남부 산업단지 인근 신축 준공',
    kind: '입주 충격',
    notice: 2022,
    center: [37.230, 127.070],
    radius: 24,
    effects: { 2023: -.075, 2024: -.035, 2025: -.095, 2026: .040 },
    hint: '일자리와 주택 공급이 동시에 증가해 어느 효과가 클지 불확실'
  },
  {
    id: 'river-biz',
    title: '도심 업무지구 이전 수요 확대',
    kind: '직장 수요',
    notice: 2022,
    center: [37.552, 126.955],
    radius: 13,
    effects: { 2023: .035, 2024: .080, 2025: .065, 2026: .015 },
    hint: '업무시설 증가에 따른 직주근접 수요, 주거 공급은 제한적'
  },
  {
    id: 'incheon-fail',
    title: '인천 구도심 교통사업 재검토',
    kind: '계획 불확실',
    notice: 2023,
    center: [37.464, 126.696],
    radius: 18,
    effects: { 2024: .015, 2025: -.030, 2026: -.080 },
    hint: '교통사업 재원 확보 여부가 불분명해 실현 시점에 주의'
  },
  {
    id: 'gyeonggi-rail',
    title: '경기 동북부 급행철도 환승 기대',
    kind: '교통 기대',
    notice: 2023,
    center: [37.650, 127.110],
    radius: 16,
    effects: { 2024: .015, 2025: .060, 2026: .070 },
    hint: '통근시간 단축 기대가 있으나 역세권 실질 접근성 확인 필요'
  }
];

const distanceKm = (a, b) => {
  const x = (a[0] - b[0]) * 111;
  const y = (a[1] - b[1]) * 88;
  return Math.hypot(x, y);
};

const localProjects = (h, y, includeFuture = false) => scenarioProjects.map(ev => {
  const proximity = clamp(1 - distanceKm([h.lat, h.lng], ev.center) / ev.radius, 0, 1);
  const effect = proximity * Number(ev.effects[y] || 0);
  return { ...ev, proximity, effect };
}).filter(ev => ev.proximity > .10 && ev.notice <= (includeFuture ? y : y));

function zoneName(h) {
  const ev = localEvent(h);
  return ev?.key || regionKey(h);
}

function componentsFor(h, year) {
  if (year <= 2020) return [];
  const region = regionKey(h), zone = zoneName(h), i = year - 2021, d = story.years[String(year)], before = story.years[String(year - 1)];
  const now = d.regionalStats[region], prev = before.regionalStats[region];
  const macro = (yearRegionShocks[year]?.[region] ?? 0);
  const zoneShock = (zoneWeights[zone]?.[i] || 0);
  const globalTx = clamp(.028 * ratio(now.transactions, prev.transactions), -.028, .028);
  const credit = clamp(-.008 * (d.rate - before.rate), -.024, .023);
  const supply = clamp(-.017 * ratio(now.completions, prev.completions), -.015, .017);
  const rent = clamp(.04 * (d.rentChangePct / 100), -.006, .008);
  const age = year - h.built;
  const old = h.built <= 1993 ? 1 : 0, fresh = h.built >= 2012 ? 1 : 0, small = h.area < 60 ? 1 : 0, large = h.area >= 110 ? 1 : 0;
  const expensive = h.basePrice >= 12e8 ? 1 : 0;
  const outside = zone === '경기외곽' || zone === '인천서부' || zone === '경기서부' ? 1 : 0;
  const demandBias = ({ 2021: .022, 2022: -.050, 2023: -.012, 2024: .030, 2025: .040, 2026: .025 }[year] || 0) * ((expensive ? 1.15 : 0) + (large ? .65 : 0) - (small ? .35 : 0));
  const vintage = old * ({ 2021: .026, 2022: -.032, 2023: -.018, 2024: .045, 2025: .040, 2026: -.015 }[year] || 0) + fresh * ({ 2021: .017, 2022: .018, 2023: .012, 2024: .012, 2025: .015, 2026: .023 }[year] || 0);
  const peripheral = outside * ({ 2021: .015, 2022: -.034, 2023: -.033, 2024: -.030, 2025: -.030, 2026: .034 }[year] || 0);
  const weakLiquidity = h.tradeCount < 5 ? ({ 2021: .007, 2022: -.025, 2023: -.008, 2024: -.008, 2025: -.010, 2026: .008 }[year] || 0) : 0;
  const projects = localProjects(h, year).filter(ev => Math.abs(ev.effect) > .0001);
  const parts = [
    { label: '시·도 경기 국면', value: macro, type: 'scenario' },
    { label: '세부 생활권 수급', value: zoneShock, type: 'zone' },
    { label: '지역 거래·금리·입주 신호', value: globalTx + credit + supply + rent, type: 'scenario' },
    { label: '가격대·면적별 선호', value: demandBias, type: 'characteristic' },
    { label: '준공연도·정비사업 민감도', value: vintage, type: 'characteristic' },
    { label: '외곽 공급·거래 민감도', value: peripheral, type: 'zone' },
    { label: '거래 표본 적음 · 유동성', value: weakLiquidity, type: 'characteristic' },
    ...projects.map(ev => ({ label: ev.title, value: ev.effect, type: 'local' }))
  ];
  const raw = parts.reduce((v, p) => v + p.value, 0), cap = clamp(raw, -.310, .320);
  if (Math.abs(cap - raw) > .00001) parts.push({ label: '극단적 변동 제한', value: cap - raw, type: 'cap' });
  return parts;
}


function explainYear(h, fromYear, toYear) {
  const b = componentsFor(h, toYear), base = valueAt(h, fromYear), next = valueAt(h, toYear);
  const sorted = [...b].filter(x => Math.abs(x.value) > .00001).sort((a, c) => Math.abs(c.value) - Math.abs(a.value));
  const strongestPositive = sorted.find(x => x.value > 0);
  const strongestNegative = sorted.find(x => x.value < 0);
  return {
    base,
    next,
    change: next - base,
    rate: ratio(next, base),
    components: b,
    positive: strongestPositive,
    negative: strongestNegative
  };
}

// Price effects are calculated from recognizable economic quantities rather than dice rolls.
// Real apartment and 2020 base price; all market indicators/price changes after 2020 are simulated.
function breakdown(h, y) {
  if (y <= 2020) return { market: 0, regional: 0, local: 0, type: 0, building: 0, unit: 0, total: 0, factors: [] };
  const parts = componentsFor(h, y), total = parts.reduce((a, x) => a + x.value, 0);
  return {
    market: parts.filter(x => x.type === 'scenario').reduce((a, x) => a + x.value, 0),
    regional: parts.filter(x => x.type === 'zone').reduce((a, x) => a + x.value, 0),
    local: parts.filter(x => x.type === 'local').reduce((a, x) => a + x.value, 0),
    type: 0,
    building: parts.filter(x => x.type === 'characteristic').reduce((a, x) => a + x.value, 0),
    unit: parts.filter(x => x.type === 'cap').reduce((a, x) => a + x.value, 0),
    total,
    factors: parts.map(x => ({ name: x.label, val: x.value }))
  };
}

function valueAt(h, y) {
  let price = h.basePrice;
  if (y === 2020) return price;
  if (y < 2020) return Math.round(price / Math.pow(1.075, 2020 - y) / 100000) * 100000;
  for (let step = 2021; step <= y; step++)price *= (1 + breakdown(h, step).total);
  return Math.round(price / 100000) * 100000;
}

function historyFor(h, y) {
  return Array.from({ length: y - 2019 }, (_, i) => ({ year: 2020 + i, value: valueAt(h, 2020 + i) }));
}
