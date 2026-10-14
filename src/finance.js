/**
 * 대출 및 자산 계산
 * 구매 가능 여부, 월 상환액, 잔여 대출과 순자산을 계산한다.
 */
// 대출·매매 부대비용은 수업용 단순화 규칙입니다.
// 현실의 LTV/DSR 제도·세율을 정확히 재현하지 않습니다.


const annualRate = y => Number(story.years[String(y)].rate) / 100;

const monthlyPay = (amount, annual, years = 30) => {
  if (amount <= 0) return 0;
  const r = annual / 12, n = years * 12;
  return r === 0 ? amount / n : amount * r / (1 - Math.pow(1 + r, -n));
};

function maxLoan(h, y) {
  const d = story.years[String(y)], price = valueAt(h, y);
  const ltvRule = price >= 2e9 ? Math.min(d.ltv, .45) : price >= 1.2e9 ? Math.min(d.ltv, .55) : d.ltv;
  const ltv = price * ltvRule;
  const monthlyLimit = currentIncome(y) * d.dsr / 12;
  const annuity1 = monthlyPay(1, annualRate(y));
  return Math.floor(Math.max(0, Math.min(ltv, monthlyLimit / annuity1)) / 100000) * 100000;
}

function quote(h) {
  const p = session, price = valueAt(h, p.year), old = byId(p.houseId);
  const saleProceeds = old ? valueAt(old, p.year) * .985 - p.loan : 0;
  const capital = p.cash + saleProceeds, fee = price * .025, reserve = 15000000;
  const needLoan = Math.max(0, Math.ceil((price + fee + reserve - capital) / 100000) * 100000);
  const limit = maxLoan(h, p.year);
  const shortfall = Math.max(0, price + fee + reserve - capital - limit);
  const can = shortfall <= 1 && needLoan <= limit && capital >= 0;
  const investableCash = Math.max(0, capital);
  return {
    can,
    price,
    fee,
    capital,
    needLoan,
    limit,
    saleProceeds,
    reserve,
    shortfall,
    investableCash,
    ownNeeded: price + fee + reserve - limit,
    month: monthlyPay(needLoan, annualRate(p.year)),
    remaining: capital + needLoan - price - fee,
    old
  };
}


function assets() {
  if (!session) return 0;
  return session.cash + (session.houseId ? valueAt(byId(session.houseId), session.year) : 0) - session.loan;
}

function cashEmergency() {
  return session?.cash < 20000000;
}
