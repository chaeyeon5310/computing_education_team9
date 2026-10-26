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
 if(year<=2020)return [];
 const d=story.years[String(year)],prev=story.years[String(year-1)],r=regionKey(h),local=localProjects(h,year);
 const supplyProjects=local.filter(p=>/공급|입주|준공|택지/.test(p.kind+' '+p.title));
 const demandProjects=local.filter(p=>!supplyProjects.includes(p));
 const purchase=clamp(-.012*(d.rate-prev.rate)+.10*(d.ltv-prev.ltv),-.06,.06);
 const demand=(yearRegionShocks[year]?.[r]||0)+(zoneWeights[zoneName(h)]?.[year-2021]||0)+demandProjects.reduce((s,p)=>s+p.effect,0);
 const supply=clamp(-.035*ratio(neighborhoodSupply(h,year).dong.total,neighborhoodSupply(h,year-1).dong.total),-.04,.04)+supplyProjects.reduce((s,p)=>s+p.effect,0);
 return [{label:'구매력 · 금리와 대출 한도',value:purchase,type:'scenario'},{label:'수요 · 지역 선호와 생활권 변화',value:demand,type:'zone'},{label:'공급 · 입주와 주변 지역 변화',value:supply,type:'local'}];
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

// Reproducible teaching examples, not historical transaction records.
function practiceTrades(h,year) {
 const seed=[...h.id].reduce((n,c)=>n+c.charCodeAt(0),0)+year;
 const center=valueAt(h,year)*(1+((seed%7)-3)*.015);
 return [.98,1,1.02].map(f=>Math.round(center*f/100000)*100000);
}

// Authored classroom supply allocation, not actual neighborhood forecasts.
// Allocate each scenario regional total down an administrative tree so totals agree.
const classroomSupplyCache = new Map();
function supplyPath(h) {
  return [h.region, ...h.district.trim().split(/\s+/), h.dong || '기타 지역'];
}
function supplyHash(text) {
  return [...text].reduce((n,c)=>(Math.imul(n,31)+c.charCodeAt(0))>>>0,7);
}
function supplyTree(year) {
  if (classroomSupplyCache.has(year)) return classroomSupplyCache.get(year);
  const root={children:new Map(), count:0};
  for (const h of listings) {
    let node=root;
    for (const label of supplyPath(h)) {
      if(!node.children.has(label)) node.children.set(label,{label,children:new Map(),count:0});
      node=node.children.get(label);node.count++;
    }
  }
  function allocate(node,total,path) {
    node.total=total;
    const children=[...node.children.values()];if(!children.length)return;
    const weights=children.map(c=>Math.sqrt(c.count)*(0.35+(supplyHash(path+'/'+c.label+':'+year)%170)/100));
    const sum=weights.reduce((a,b)=>a+b,0);
    const shares=weights.map(w=>total*w/sum), amounts=shares.map(Math.floor);
    const order=shares.map((x,i)=>({i,f:x-amounts[i]})).sort((a,b)=>b.f-a.f);
    for(let left=total-amounts.reduce((a,b)=>a+b,0),i=0;i<left;i++)amounts[order[i].i]++;
    children.forEach((c,i)=>allocate(c,amounts[i],path+'/'+c.label));
  }
  for(const [region,node] of root.children) {
    const key=region==='서울특별시'?'서울':region==='인천광역시'?'인천':'경기';
    allocate(node,story.years[String(year)].regionalStats[key].completions,region);
  }
  classroomSupplyCache.set(year,root);return root;
}
function neighborhoodSupply(h,year) {
  let node=supplyTree(year),path=[];
  const rows=[];
  for(const name of supplyPath(h)) {
    node=node.children.get(name);path.push(name);
    rows.push({name,path:path.join(' '),total:node.total});
  }
  const dong=rows.at(-1),district=rows.at(-2);
  let parent=supplyTree(year);for(const name of supplyPath(h).slice(0,-1))parent=parent.children.get(name);
  const nearby=[...parent.children.values()].filter(n=>n.label!==dong.name).slice(0,3).map(n=>({name:n.label,total:n.total}));
  return {rows,dong,district,nearby};
}
