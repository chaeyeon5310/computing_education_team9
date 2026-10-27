/** Classroom financing: policy fixed for each 24-month period, repriced at the next decision. */
const annualRate = year => roundFor(year).rate / 100;
function monthlyPay(amount, annual, years = 30) {
  if (amount <= 0) return 0;
  const n = Math.max(1, Math.round(years * 12)), r = annual / 12;
  return r === 0 ? amount / n : amount * r / (1 - Math.pow(1 + r, -n));
}
function maxLoan(h, year) {
  const d = roundFor(year), monthlyLimit = currentIncome(year) * d.paymentRatio / 12;
  return Math.floor(Math.max(0, Math.min(valueAt(h, year) * d.ltv, monthlyLimit / monthlyPay(1, d.rate / 100))) / 100000) * 100000;
}
function quote(h) {
  const p = session, price = valueAt(h, p.year), old = byId(p.houseId);
  const saleProceeds = old ? valueAt(old, p.year) * .985 - p.loan : 0;
  const capital = p.cash + saleProceeds, fee = price * .025, reserve = 15000000;
  const needLoan = Math.max(0, Math.ceil((price + fee + reserve - capital) / 100000) * 100000);
  const limit = maxLoan(h, p.year), shortfall = Math.max(0, price + fee + reserve - capital - limit);
  const remaining = capital + needLoan - price - fee;
  return { can: shortfall < 1 && needLoan <= limit && capital >= 0, price, fee, capital, needLoan, limit, saleProceeds, reserve, shortfall, remaining, month: monthlyPay(needLoan, annualRate(p.year)), old };
}
const assets = () => session ? session.cash + (session.houseId ? valueAt(byId(session.houseId), session.year) : 0) - session.loan : 0;
function simulatePeriod(state, fromYear) {
  const p = JSON.parse(JSON.stringify(state)), h = byId(p.houseId), startPrice = h ? valueAt(h, fromYear) : 0;
  const rate = annualRate(fromYear), scheduled = monthlyPay(p.loan, rate, p.loanMonths / 12);
  const log = { from: fromYear, to: fromYear + 2, months: PERIOD_MONTHS, heldId: h?.id || null, saved: 0, rent: 0, paid: 0, interest: 0, principal: 0, houseDelta: 0, forcedSale: false, forcedAt: null, annual: [] };
  const startWorth = p.cash + startPrice - p.loan;
  const entryFees = p.transactions.filter(t => t.year === fromYear && t.kind !== 'forced').reduce((s, t) => s + (t.buyCost || 0) + (t.sellCost || 0), 0);
  log.worthBefore = startWorth + entryFees;
  log.startPrice = startPrice;
  log.tradeFees = entryFees;
  for (let m = 0; m < PERIOD_MONTHS; m++) {
    const year = fromYear + Math.floor(m / 12);
    if (m % 12 === 0) log.annual.push({ year, saved: 0, rent: 0, paid: 0, interest: 0, principal: 0 });
    const row = log.annual.at(-1), saved = savingsForYear(year, p.profile) / 12, rent = p.houseId ? 0 : rentForYear(year, p.profile) / 12;
    let interest = 0, principal = 0;
    if (p.loan > 0) {
      interest = p.loan * rate / 12;
      principal = p.loanMonths <= 1 ? p.loan : Math.min(p.loan, Math.max(0, scheduled - interest));
      p.loan = Math.max(0, p.loan - principal); p.loanMonths = Math.max(0, p.loanMonths - 1);
      if (p.loan < .01) { p.loan = 0; p.loanMonths = 0; }
    }
    const paid = interest + principal;
    p.cash += saved - rent - paid;
    for (const [key, val] of Object.entries({ saved, rent, paid, interest, principal })) { row[key] += val; log[key] += val; }
    if (p.cash < 0 && p.houseId) {
      const sale = priceAtMonth(h, fromYear, m + 1), cost = sale * .015;
      p.cash += sale - cost - p.loan; log.tradeFees += cost;
      p.transactions.push({ year, month: m % 12 + 1, kind: 'forced', id: h.id, price: sale, buyCost: 0, sellCost: cost });
      log.houseDelta = sale - startPrice; log.forcedSale = true; log.forcedAt = `${year}년 ${m % 12 + 1}월`;
      log.endPrice = sale;
      p.houseId = null; p.loan = 0; p.loanMonths = 0;
    }
  }
  if (p.houseId) { log.endPrice = valueAt(h, fromYear + 2); log.houseDelta = log.endPrice - startPrice; }
  p.year = fromYear + 2;
  log.worthAfter = p.cash + (p.houseId ? valueAt(h, p.year) : 0) - p.loan;
  log.delta = log.worthAfter - log.worthBefore;
  p.rate = p.houseId ? rate : 0;
  return { state: p, log };
}
// Budget preview uses cash flows only; future sale price and market outcome never enter it.
function budgetPreview(h = null) {
  const q = h ? quote(h) : null;
  const loan = q ? q.needLoan : session.loan, months = q ? 360 : session.loanMonths;
  const own = q ? true : Boolean(session.houseId), cash = q ? q.remaining : session.cash;
  const payment = monthlyPay(loan, annualRate(session.year), months / 12);
  let balance = cash, low = cash, remaining = loan;
  for (let m = 0; m < PERIOD_MONTHS; m++) {
    const year = session.year + Math.floor(m / 12), interest = remaining * annualRate(session.year) / 12;
    const paid = remaining > 0 ? Math.min(payment, remaining + interest) : 0;
    remaining = Math.max(0, remaining - Math.max(0, paid - interest));
    balance += savingsForYear(year) / 12 - (own ? 0 : rentForYear(year) / 12) - paid;
    low = Math.min(low, balance);
  }
  return { endCash: balance, lowestCash: low, payment };
}
// Performance excludes earned savings. Principal repayment is not an expense.
function periodPerformance(p) {
  const propertyProfit = p.houseDelta - p.interest - (p.tradeFees || 0);
  return { propertyProfit, saved: p.saved, rent: p.rent, priceDelta: p.houseDelta, interest: p.interest, fees: p.tradeFees || 0, totalChange: propertyProfit + p.saved - p.rent };
}
function ledgerSummary() {
  const entries = session.passages || [], tx = session.transactions || [];
  const sum = key => entries.reduce((t, x) => t + x[key], 0);
  const saved = sum('saved'), rent = sum('rent'), interest = sum('interest'), priceDelta = sum('houseDelta');
  const fees = tx.reduce((t, x) => t + (x.buyCost || 0) + (x.sellCost || 0), 0);
  const propertyProfit = priceDelta - interest - fees;
  const totalChange = propertyProfit + saved - rent;
  const explained = session.initialCash + totalChange;
  return { saved, rent, interest, priceDelta, fees, propertyProfit, totalChange, explained, gap: assets() - explained };
}
