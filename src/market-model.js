/** Deterministic teaching model. Coefficients are authored, not empirical estimates. */
const distanceKm = (a, b) => Math.hypot((a[0] - b[0]) * 111, (a[1] - b[1]) * 88);
function localProjects(h, year) {
  return story.projects.map(p => {
    const proximity = clamp(1 - distanceKm([h.lat, h.lng], p.center) / p.radius, 0, 1);
    const stage = p.stages[String(year)];
    return { ...p, ...stage, proximity, effect: proximity * (stage?.effect || 0) };
  }).filter(p => p.proximity > .1 && p.stages[String(year)]);
}
const previousPolicy = year => roundFor(year - 2) || story.referencePolicy;
function periodComponents(h, fromYear) {
  const d = roundFor(fromYear);
  if (!d) throw Error('Unknown decision period: ' + fromYear);
  const prev = previousPolicy(fromYear), r = d.regionalStats[regionKey(h)];
  const projects = localProjects(h, fromYear);
  const purchase = -.02 * (d.rate - prev.rate) + .12 * (d.ltv - prev.ltv) + .15 * (d.paymentRatio - prev.paymentRatio);
  const demand = .015 * r.demand + projects.filter(p => p.kind === '수요').reduce((s, p) => s + p.effect, 0);
  const neighborhood = neighborhoodSupply(h, fromYear);
  // Use the very same local counts and denominator shown to the learner.
  // Supply projects change those counts, so they must not be added a second time.
  const supply = .02 * (2 - neighborhood.dong.rate);
  return [
    { key: 'finance', label: '구매력', value: purchase, detail: `금리 ${prev.rate.toFixed(1)}→${d.rate.toFixed(1)}%, 담보 한도 ${prev.ltv * 100}→${d.ltv * 100}%, 소득 대비 상환 한도 ${Math.round(prev.paymentRatio * 100)}→${Math.round(d.paymentRatio * 100)}%` },
    { key: 'demand', label: '수요', value: demand, detail: `${regionKey(h)} 수요 변화 ${r.demand > 0 ? '+' : ''}${r.demand}단계${projects.some(p => p.kind === '수요') ? '와 주변 일자리·교통 변화' : ''}` },
    { key: 'supply', label: '공급', value: supply, detail: `${neighborhood.dong.name} 입주예정 ${KR.format(neighborhood.dong.total)}호 ÷ 가상 기존 주택 ${KR.format(neighborhood.dong.stock)}호 = ${neighborhood.dong.rate.toFixed(2)}%. 게임 기준 2%와 비교하며, 주변 입주사업은 이 물량에 이미 반영됐습니다.` }
  ];
}
function valueAt(h, year) {
  if (![...DECISION_YEARS, END_YEAR].includes(year)) throw Error('Unknown price year: ' + year);
  let price = h.basePrice;
  for (const from of DECISION_YEARS) {
    if (from >= year) break;
    price = Math.round(price * (1 + periodComponents(h, from).reduce((s, f) => s + f.value, 0)));
  }
  return price;
}
function priceAtMonth(h, fromYear, elapsed) {
  const a = valueAt(h, fromYear), b = valueAt(h, fromYear + 2);
  return Math.round(a * Math.pow(b / a, elapsed / PERIOD_MONTHS));
}
function historyFor(h, year) {
  return [...DECISION_YEARS, END_YEAR].filter(y => y <= year).map(y => ({ year: y, value: valueAt(h, y) }));
}
function explainPeriod(h, fromYear) {
  const base = valueAt(h, fromYear), next = valueAt(h, fromYear + 2);
  const components = periodComponents(h, fromYear).map(f => ({ ...f, amount: base * f.value }));
  return { base, next, change: next - base, rate: next / base - 1, components, rounding: next - base - components.reduce((s, f) => s + f.amount, 0) };
}
function peerSummary(h) {
  let peers = listings.filter(x => x.district === h.district && Math.abs(x.area - h.area) <= 15);
  const scope = peers.length >= 5 ? '같은 시·군·구·유사 면적' : '같은 시·도·유사 면적';
  if (peers.length < 5) peers = listings.filter(x => regionKey(x) === regionKey(h) && Math.abs(x.area - h.area) <= 15);
  const vals = peers.map(x => x.basePrice).sort((a, b) => a - b);
  return { count: vals.length, median: vals[Math.floor(vals.length / 2)] || h.basePrice, scope };
}
function practiceTrades(h, year) {
  const seed = [...h.id].reduce((n, c) => n + c.charCodeAt(0), 0) + year;
  const center = valueAt(h, year) * (1 + ((seed % 7) - 3) * .01);
  return [.98, 1, 1.02].map(f => Math.round(center * f / 100000) * 100000);
}
// Authored supply projects concentrate the announced regional total in nearby dongs.
// Housing stock is a fixed, fictional denominator; neither value estimates real local stock.
const classroomSupplyCache = new Map();
const supplyPath = h => [h.region, ...h.district.trim().split(/\s+/), h.dong || '기타 지역'];
function supplyTree(year) {
  const d = roundFor(year);
  const signature = JSON.stringify([story.regionalHousingStock, d.regionalStats, story.projects.filter(p => p.kind === '공급')]);
  const cached = classroomSupplyCache.get(year);
  if (cached?.signature === signature) return cached.root;
  const root = { children: new Map() };
  for (const h of listings) {
    const weight = 1 + localProjects(h, year).filter(p => p.kind === '공급').reduce((s, p) => s + p.proximity * (p.supplyPressure || 0), 0);
    let node = root;
    for (const label of supplyPath(h)) {
      if (!node.children.has(label)) node.children.set(label, { label, children: new Map(), count: 0, weight: 0 });
      node = node.children.get(label); node.count++; node.weight += weight;
    }
  }
  function allocate(node, total, field, weightField) {
    node[field] = total;
    const children = [...node.children.values()]; if (!children.length) return;
    const sum = children.reduce((s, c) => s + c[weightField], 0);
    const shares = children.map(c => total * c[weightField] / sum), amounts = shares.map(Math.floor);
    const order = shares.map((n, i) => ({ i, fraction: n - amounts[i] })).sort((a, b) => b.fraction - a.fraction);
    for (let i = 0, left = total - amounts.reduce((a, b) => a + b, 0); i < left; i++) amounts[order[i].i]++;
    children.forEach((c, i) => allocate(c, amounts[i], field, weightField));
  }
  for (const [region, node] of root.children) {
    const key = region === '서울특별시' ? '서울' : region === '인천광역시' ? '인천' : '경기';
    allocate(node, story.regionalHousingStock[key], 'stock', 'count');
    allocate(node, d.regionalStats[key].completions, 'total', 'weight');
  }
  classroomSupplyCache.set(year, { signature, root }); return root;
}
function neighborhoodSupply(h, year) {
  let node = supplyTree(year), parent; const rows = [];
  const describe = n => ({ name: n.label, total: n.total, stock: n.stock, rate: n.stock ? n.total / n.stock * 100 : 0 });
  for (const name of supplyPath(h)) { parent = node; node = node.children.get(name); rows.push(describe(node)); }
  const dong = rows.at(-1);
  const nearby = [...parent.children.values()].filter(n => n !== node).map(describe).sort((a, b) => b.rate - a.rate || a.name.localeCompare(b.name, 'ko')).slice(0, 3);
  return { rows, dong, district: rows.at(-2), nearby };
}
