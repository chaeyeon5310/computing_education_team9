/**
 * 2020-09-30 classroom screening. Currency: KRW, rate: annual decimal.
 * Required persona keys: annualIncomeWon,cashWon,existingAnnualDebtWon,age,
 * married,children,assetsWon,homeless,firstHome.
 * Optional: marriageYears,dualIncome,isNewlywed,existingAnnualInterestWon,
 * existingAnnualMortgageDebtWon,reserveWon,householdMembers.
 * Home: past.priceWon,areaM2,region,district; optional dong,address,regulated2020.
 */

export const decisionDate = '2020-09-30';
export const sources = [
  { title: '한국주택금융공사 2020 연차보고서 · 보금자리론 소득·한도', url: 'https://researcher.hf.go.kr/researcher/sub04/sub02.do?articleNo=444466&attachNo=75030&mode=download' },
  { title: '한국주택금융공사 자료 · 당시 디딤돌·보금자리론 비교', url: 'https://www.hf.go.kr/ko/sub05/sub05_02_10_02.do?articleNo=483779&attachNo=85166&mode=download' },
  { title: '2020.02.21 보금자리론 실수요자 조건', url: 'https://www.hf.go.kr/ko/sub04/sub04_08.do?articleNo=327153&mode=view' },
  { title: '2020.06.19 시행 지역 및 보금자리론 LTV·DTI', url: 'https://www.hf.go.kr/ko/sub04/sub04_08.do?articleNo=358992&attachNo=62324&mode=download' },
  { title: '2020.09 보금자리론 금리', url: 'https://www.hf.go.kr/ko/sub04/sub04_08.do?articleNo=382121&mode=view' },
  { title: '2020.05.18 시행 디딤돌 금리', url: 'https://www.hf.go.kr/ko/sub04/sub04_08.do?articleNo=349046&mode=view' },
  { title: '하나은행 2020.10 디딤돌 상품설명서 · 순자산·실거주', url: 'https://image.kebhana.com/cont/download/documents/manual/0000005160140_20201008_m.pdf' },
  { title: 'HF 단독세대주 디딤돌 조건 · 2018 시행 안내', url: 'https://hf.go.kr/ko/sub04/sub04_08.do?articleNo=199324&attachNo=46546&mode=download' },
  { title: '금융위원회 2020 주택담보대출 Q&A · 당시 DSR 적용 범위', url: 'https://fsc.go.kr/po020201/27351' },
  { title: '금융위원회 맞벌이 신혼 보금자리론 소득 완화 안내', url: 'https://www.fsc.go.kr/no010101/73210' },
];

export const modelNotes = [
  '대출은 2020년 9월 제도를 참고한 수업용 선별 계산입니다. 2026년 대출 기준과 구분합니다.',
  '과거 동일 면적 실거래 중앙값을 담보평가액 대신 사용합니다. 당시 KB시세·감정가·실제 승인액과 다를 수 있습니다.',
  '디딤돌·보금자리론은 상품별 LTV, DTI, 소득·주택가격·면적·자산 조건을 적용합니다. 대출은 상품별 대안이며 한도를 더하지 않습니다.',
  '일반은행 옵션은 연 3%, LTV 40%, 연간 전체 원리금 상환 40%의 보수적 교육 가정입니다. 당시 모든 은행대출의 법정 DSR이 40%였다는 의미가 아닙니다.',
  '모든 대출을 원리금균등 30년으로 비교합니다. 우대금리·신용심사·소액임차보증금 차감·기존 임대차·예외자격·대출 결합은 생략합니다.',
  '정책대출은 DTI를 계산합니다. DSR은 전체 부채 원리금 비율을 보여주는 학습 지표로 별도 표시합니다.',
  '기존 대출 이자 정보가 없으면 연간 기존 원리금 전액을 DTI에서 차감하는 보수적 가정을 씁니다. 이자액이 입력되면 기타대출 이자와 기존 주담대 원리금을 구분합니다.',
  '취득 부대비용은 매매가의 2%, 생활예비비는 기본 500만 원으로 둔 교육 가정입니다. 실제 취득세나 거래비용 계산이 아닙니다.',
  '신혼 혜택은 혼인 7년 이내일 때, 보금자리론의 신혼 소득 완화는 맞벌이·전용 85㎡ 이내일 때 적용합니다. 미성년 자녀 수를 사용합니다.',
  '서울·경기·인천의 2020.06.19 지정표를 사용합니다. 읍·면 정보가 없어 제외지역 여부가 모호하면 규제지역으로 보수적으로 계산합니다.',
  '단독세대주 디딤돌 세부조건은 HF 시행 안내를 참고했습니다. 부모 부양 등 특별 예외는 반영하지 않습니다.',
  '가상 인물은 대한민국 국민·무주택 세대주·증빙 가능한 소득·정상 신용·실거주를 전제로 합니다. 버팀목 전세대출은 매매 예산에 합산하지 않습니다.',
];

const M = 1_000_000;
const YEARS = 30;
const nonnegative = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const floorWon = value => Math.floor(Math.max(0, value));

export function monthlyPayment(principalWon, annualRate, years = YEARS) {
  const principal = nonnegative(principalWon);
  const months = Math.max(1, Math.round(nonnegative(years) * 12));
  const r = nonnegative(annualRate) / 12;
  return r === 0 ? principal / months : principal * r / (1 - Math.pow(1 + r, -months));
}

function fromAnnualPayment(annualPaymentWon, rate) {
  return floorWon(nonnegative(annualPaymentWon) / (monthlyPayment(1, rate) * 12));
}

/** Dated geography; subdivision exceptions need a dong/address when available. */
export function regulationStatus(home = {}) {
  if (typeof home.regulated2020 === 'boolean') {
    return { regulated: home.regulated2020, note: '자료에 지정된 2020년 규제지역 여부 적용' };
  }
  const text = [home.region, home.district, home.dong, home.address].filter(Boolean).join(' ');
  if (/서울/.test(text)) return { regulated: true, note: '2020년 서울 전 지역 규제지역' };
  if (/인천/.test(text)) return { regulated: !/강화|옹진/.test(text), note: '2020년 인천: 강화·옹진 제외' };
  if (/경기/.test(text)) {
    if (/김포|파주|연천|동두천|포천|가평|양평|여주|이천/.test(text)) {
      return { regulated: false, note: '2020.06.19 경기도 지정표의 비규제 시·군' };
    }
    const excluded =
      (/용인/.test(text) && /포곡읍|모현[면읍]|백암면|양지[면읍]/.test(text)) ||
      (/용인/.test(text) && /원삼면/.test(text) && /가재월|사암|미평|좌항|두창|맹리/.test(text)) ||
      (/광주/.test(text) && /초월읍|곤지암읍|도척면|퇴촌면|남종면|남한산성면/.test(text)) ||
      (/남양주/.test(text) && /화도읍|수동면|조안면/.test(text)) ||
      (/안성/.test(text) && /일죽면/.test(text)) ||
      (/안성/.test(text) && /죽산면/.test(text) && /죽산리|용설리|장계리|매산리|장릉리|장원리|두현리/.test(text)) ||
      (/안성/.test(text) && /삼죽면/.test(text) && /용월리|덕산리|율곡리|내장리|배태리/.test(text));
    return { regulated: !excluded, note: excluded ? '2020.06.19 지정표의 읍·면 제외지역' : '2020.06.19 지정표 기준; 읍·면이 불명확하면 규제지역 가정' };
  }
  return { regulated: true, note: '상세 지역이 확인되지 않아 규제지역으로 보수적 계산' };
}

function context(persona = {}, home = {}) {
  const income = nonnegative(persona.annualIncomeWon);
  const debt = nonnegative(persona.existingAnnualDebtWon);
  const mortgageDebt = nonnegative(persona.existingAnnualMortgageDebtWon);
  const interestKnown = Number.isFinite(persona.existingAnnualInterestWon);
  const debtForDti = interestKnown ? nonnegative(persona.existingAnnualInterestWon) + mortgageDebt : debt;
  const married = persona.married === true;
  const marriageYearsKnown = Number.isFinite(persona.marriageYears);
  const newlywed = married && (persona.isNewlywed === true || (marriageYearsKnown && persona.marriageYears <= 7 && persona.marriageYears >= 0));
  const children = Math.floor(nonnegative(persona.children));
  return {
    income, debt, debtForDti, interestKnown, married, newlywed, children,
    age: nonnegative(persona.age),
    homeless: persona.homeless === true,
    firstHome: persona.firstHome === true,
    assetsKnown: Number.isFinite(persona.assetsWon),
    assets: nonnegative(persona.assetsWon),
    price: nonnegative(home.past?.priceWon),
    area: nonnegative(home.areaM2),
    geography: regulationStatus(home),
    dualIncome: persona.dualIncome === true,
    loneHead: !married && children === 0 && !(persona.householdMembers > 1),
  };
}

function option(name, c, { rate, ltv, dti, capWon, reasons, assumption, eligibilityNotes = [] }) {
  const ltvLimitWon = floorWon(c.price * ltv);
  const paymentBudgetWon = Math.max(0, c.income * dti - (assumption ? c.debt : c.debtForDti));
  const incomeLimitWon = fromAnnualPayment(paymentBudgetWon, rate);
  const productLimitWon = Number.isFinite(capWon) ? capWon : c.price;
  const failures = [...reasons];
  if (incomeLimitWon <= 0 && c.income > 0) failures.push('기존 대출 상환액을 차감한 후 새 대출 상환여력이 없습니다.');
  const eligible = failures.length === 0;
  const rawLimit = Math.min(ltvLimitWon, incomeLimitWon, productLimitWon);
  const limitWon = eligible ? Math.floor(Math.max(0, rawLimit) / 100_000) * 100_000 : 0;
  const bindingConstraint = !eligible ? '자격 조건' : rawLimit === productLimitWon ? '상품 최대한도' : rawLimit === ltvLimitWon ? 'LTV' : assumption ? '교육용 상환여력 40%' : 'DTI';
  const annualPaymentWon = monthlyPayment(limitWon, rate) * 12;
  return {
    name, eligible, limitWon,
    monthlyPaymentWon: Math.round(annualPaymentWon / 12),
    rate, reasons: failures,
    ltv, dti, years: YEARS, ltvLimitWon, incomeLimitWon, productLimitWon,
    bindingConstraint, assumption: assumption || null,
    eligibilityNotes,
    dtiRatio: c.income > 0 ? (annualPaymentWon + c.debtForDti) / c.income : null,
    dsrRatio: c.income > 0 ? (annualPaymentWon + c.debt) / c.income : null,
    geographyNote: c.geography.note,
    debtNote: c.interestKnown ? '기타대출 이자와 기존 주담대 원리금을 DTI에 반영' : '기존 대출 이자 미입력: 기존 원리금 전액을 DTI에서 보수적으로 차감',
  };
}

export function calcLoanOptions(persona = {}, home = {}) {
  const c = context(persona, home);
  const common = [];
  if (!(c.price > 0)) common.push('과거 매매가격이 확인되지 않습니다.');
  if (c.age < 19) common.push('성년 신청자만 다루는 실습입니다.');
  if (!(c.income > 0)) common.push('증빙 가능한 연소득이 필요합니다.');
  if (!c.homeless) common.push('이번 실습은 무주택 가구만 다룹니다.');

  const didimReasons = [...common];
  const didimIncomeCap = c.firstHome || c.newlywed || c.children >= 2 ? 70 * M : 60 * M;
  const single = c.loneHead;
  const didimPriceCap = single ? 300 * M : 500 * M;
  const didimAreaCap = single ? 60 : 85;
  const didimCap = single ? 150 * M : c.children >= 2 ? 260 * M : c.newlywed ? 220 * M : 200 * M;
  if (single && c.age < 30) didimReasons.push('만 30세 미만 미혼 단독세대주는 디딤돌 대상에서 제외됩니다.');
  if (c.income > didimIncomeCap) didimReasons.push(`가구 연소득이 디딤돌 기준 ${didimIncomeCap / 10_000}만 원을 초과합니다.`);
  if (!c.assetsKnown) didimReasons.push('디딤돌 자산심사를 위한 가구 순자산 정보가 없습니다.');
  else if (c.assets > 391 * M) didimReasons.push('가구 순자산이 2020년 기준 3억 9,100만 원을 초과합니다.');
  if (c.price > didimPriceCap) didimReasons.push(single ? '미혼 단독세대주 디딤돌은 주택가격 3억 원 이하만 가능합니다.' : '디딤돌은 당시 주택가격 5억 원 이하만 가능합니다.');
  if (!(c.area > 0)) didimReasons.push('전용면적 정보가 없어 디딤돌 자격을 확인할 수 없습니다.');
  else if (c.area > didimAreaCap) didimReasons.push(`디딤돌 전용면적 기준 ${didimAreaCap}㎡를 초과합니다.`);
  const firstNewlywed = c.newlywed && c.firstHome;
  const didimRate = firstNewlywed
    ? c.income <= 20 * M ? 0.019 : c.income <= 40 * M ? 0.0215 : 0.024
    : c.income <= 20 * M ? 0.022 : c.income <= 40 * M ? 0.0245 : 0.027;
  const didim = option(firstNewlywed ? '디딤돌 · 생애최초 신혼' : '디딤돌대출', c, {
    rate: didimRate, ltv: 0.7, dti: 0.6, capWon: didimCap, reasons: didimReasons,
    eligibilityNotes: ['2020.05.18 시행 기본금리; 추가 우대금리는 생략', '무주택 세대주·세대원, 실거주 조건을 전제로 계산', `소득 ${didimIncomeCap / 10_000}만 원·주택 ${didimPriceCap / 100_000_000}억 원·전용 ${didimAreaCap}㎡ 이하`, '가구 순자산 3억 9,100만 원 이하'],
  });

  const childIncomeCap = c.children >= 3 ? 100 * M : c.children === 2 ? 90 * M : c.children === 1 ? 80 * M : 70 * M;
  const newlywedIncomeAllowed = c.newlywed && c.dualIncome && c.area > 0 && c.area <= 85;
  const bogIncomeCap = Math.max(childIncomeCap, newlywedIncomeAllowed ? 85 * M : 70 * M);
  const bogReasons = [...common];
  if (c.price > 600 * M) bogReasons.push('보금자리론은 당시 주택가격 6억 원 이하만 가능합니다.');
  if (c.income > bogIncomeCap) bogReasons.push(`가구 연소득이 보금자리론 적용 기준 ${bogIncomeCap / 10_000}만 원을 초과합니다.`);
  const realDemand = c.homeless && c.income <= 70 * M && c.price <= 500 * M;
  const bogReduced = c.geography.regulated && !realDemand;
  const bog = option('보금자리론', c, {
    rate: 0.0235, ltv: bogReduced ? 0.6 : 0.7, dti: bogReduced ? 0.5 : 0.6,
    capWon: c.children >= 3 ? 400 * M : 300 * M,
    reasons: bogReasons,
    eligibilityNotes: ['2020.09 u-보금자리론 30년 기본금리 2.35%; 추가 우대 생략', c.geography.regulated ? realDemand ? '실수요자 3조건 충족: 소득 7천만 원·주택 5억 원 이하·무주택 → LTV 70% / DTI 60%' : '규제지역에서 실수요자 예외 미충족 → LTV 60% / DTI 50%' : '2020년 비규제지역 → LTV 70% / DTI 60%', `소득 ${bogIncomeCap / 10_000}만 원 이하; 신혼 완화는 혼인 7년 이내·맞벌이·전용 85㎡ 이내`, '신혼·자녀 소득 완화와 LTV 실수요자 예외는 서로 다른 조건'],
  });

  const bankReasons = [...common];
  // Conservative classroom range: do not suggest a 2020 Seoul >1.5bn purchase mortgage.
  if (c.price > 1_500 * M) bankReasons.push('15억 원 초과 아파트는 이번 보수적 2020년 매매대출 실습 범위에서 제외합니다.');
  const bank = option('일반은행 · 보수적 실습모형', c, {
    rate: 0.03, ltv: 0.4, dti: 0.4, capWon: c.price, reasons: bankReasons,
    assumption: '연 3%·30년·LTV 40%·전체 원리금/연소득 40%의 교육 가정. 당시 지역별 실제 법정 DSR·은행 승인액 재현이 아닙니다.',
    eligibilityNotes: ['실제 은행 상품이 아닌 비교용 모형', '2020년 차주단위 DSR 적용 범위는 제한적이었음', '지역별 실수요자 가산·9억 초과 역진율·은행별 심사는 생략'],
  });
  return [didim, bog, bank];
}

export function purchasing(persona = {}, home = {}) {
  const options = calcLoanOptions(persona, home);
  const candidates = options.filter(o => o.eligible && o.limitWon > 0)
    .sort((a, b) => b.limitWon - a.limitWon || a.rate - b.rate);
  const best = candidates[0] || null;
  const priceWon = nonnegative(home.past?.priceWon);
  const costsWon = Math.round(priceWon * 0.02);
  const bufferWon = Number.isFinite(persona.reserveWon) ? nonnegative(persona.reserveWon) : 5 * M;
  const cashWon = nonnegative(persona.cashWon);
  const loanWon = best?.limitWon || 0;
  const cashNeededWon = Math.max(0, priceWon + costsWon + bufferWon - loanWon);
  const gapWon = Math.max(0, cashNeededWon - cashWon);
  const surplusWon = Math.max(0, cashWon - cashNeededWon);
  const canBuy = priceWon > 0 && gapWon === 0;
  const requiredLoanWon = Math.max(0, priceWon + costsWon + bufferWon - cashWon);
  const requiredMonthlyPaymentWon = best && canBuy ? Math.round(monthlyPayment(requiredLoanWon, best.rate)) : null;
  return {
    canBuy, loanWon, cashNeededWon, gapWon, costsWon, bufferWon,
    monthlyPaymentWon: best?.monthlyPaymentWon || 0,
    productName: best?.name || '대출 없음 · 자기자금 검토',
    options, bestOption: best, priceWon, cashWon, surplusWon,
    requiredLoanWon, requiredMonthlyPaymentWon,
    dtiRatio: best?.dtiRatio ?? null, dsrRatio: best?.dsrRatio ?? null,
    modelNotes,
  };
}

if (typeof window !== 'undefined') {
  window.LoanModel = { calcLoanOptions, purchasing, monthlyPayment, regulationStatus, modelNotes, sources, decisionDate };
}
