import { purchasing, monthlyPayment } from './loan-model.js';

export const TIMELINE_YEARS = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
const INTERMEDIATE_CYCLE = { 2021: 1.07, 2022: 1.12, 2023: 1.05, 2024: 0.99, 2025: 1.01 };
const BUY_COST_RATE = 0.02;
const SELL_COST_RATE = 0.02;
const RESERVE_WON = 5_000_000;
const LOAN_TERM_YEARS = 30;

/**
 * The shipped dataset has observed transaction medians for 2020 and 2026 only.
 * Values between those endpoints are illustrative estimates so the annual-choice
 * game can run. Teachers can replace them through the editable UI.
 */
export function annualPrice(home, year, overrides = {}) {
  if (year === 2020) return Math.round(Number(home.past?.priceWon) || 0);
  if (year === 2026) return Math.round(Number(home.recent?.priceWon) || 0);
  const override = Number(overrides?.[home.id]?.[year]);
  if (Number.isFinite(override) && override > 0) return Math.round(override);
  const start = Number(home.past?.priceWon) || 0;
  const end = Number(home.recent?.priceWon) || 0;
  if (start <= 0 || end <= 0) return 0;
  const t = (year - 2020) / 6;
  const trend = start * Math.pow(end / start, t);
  return Math.round(trend * (INTERMEDIATE_CYCLE[year] || 1));
}

const nonnegative = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const signedCash = value => Number.isFinite(Number(value)) ? Number(value) : 0;

function loanHome(home, priceWon) {
  return { ...home, past: { ...home.past, priceWon } };
}

function rollMortgage(balanceWon, annualRate, monthlyPaymentWon) {
  let balance = nonnegative(balanceWon);
  let paid = 0;
  for (let month = 0; month < 12 && balance > 0; month++) {
    const interest = balance * (nonnegative(annualRate) / 12);
    const payment = Math.min(nonnegative(monthlyPaymentWon), balance + interest);
    balance = Math.max(0, balance + interest - payment);
    paid += payment;
  }
  return { balanceWon: Math.round(balance), paidWon: Math.round(paid) };
}

function decisionLabel(action, homes) {
  if (action === 'keep') return '현재 상태 유지';
  if (action === 'rent') return '무주택 유지';
  if (action === 'sell') return '매도 후 무주택';
  if (action?.startsWith('buy:')) {
    const home = homes.find(item => item.id === action.slice(4));
    return home ? `${home.label} · ${home.name} 매수/갈아타기` : '주택 매수/갈아타기';
  }
  return '선택 없음';
}

/** Simulates a teaching scenario; it is not a formal financial or loan forecast. */
export function simulateAnnualJourney({ persona, homes, choices, overrides = {}, savingsRatePercent = 25 }) {
  if (!persona || !Array.isArray(homes) || homes.length === 0) throw new Error('인물과 아파트 후보가 필요합니다.');
  if (!choices?.[2020]) throw new Error('2020년 첫 선택을 먼저 지정하세요.');

  const state = {
    cashWon: signedCash(persona.cashWon),
    currentHomeId: null,
    mortgageBalanceWon: 0,
    loanRate: 0.03,
    monthlyPaymentWon: 0,
    hasBoughtEver: false,
  };
  const records = [];
  const purchaseEvents = [];
  const savingsRate = Math.min(100, Math.max(0, Number(savingsRatePercent) || 0)) / 100;

  for (const year of TIMELINE_YEARS) {
    let savingsAddedWon = 0;
    let mortgagePaidWon = 0;
    let actionStatus = '';

    if (year > 2020) {
      savingsAddedWon = Math.round(nonnegative(persona.annualIncomeWon) * savingsRate);
      state.cashWon += savingsAddedWon;
      if (state.mortgageBalanceWon > 0) {
        const amortized = rollMortgage(state.mortgageBalanceWon, state.loanRate, state.monthlyPaymentWon);
        state.mortgageBalanceWon = amortized.balanceWon;
        mortgagePaidWon = amortized.paidWon;
        state.cashWon -= mortgagePaidWon;
      }
    }

    const action = choices[year] || (year === 2020 ? '' : 'keep');
    const desiredHomeId = action.startsWith('buy:') ? action.slice(4) : null;

    if (action === 'rent' || action === 'sell') {
      if (!state.currentHomeId) {
        actionStatus = '이미 무주택 상태 · 유지';
      } else {
        const previousHome = homes.find(home => home.id === state.currentHomeId);
        const salePrice = annualPrice(previousHome, year, overrides);
        const netSaleProceeds = salePrice * (1 - SELL_COST_RATE) - state.mortgageBalanceWon;
        state.cashWon += netSaleProceeds;
        purchaseEvents.push({ year, kind: 'sell', homeId: previousHome.id, priceWon: salePrice });
        state.currentHomeId = null;
        state.mortgageBalanceWon = 0;
        state.monthlyPaymentWon = 0;
        state.loanRate = 0.03;
        actionStatus = `매도 완료 · 매도비용 2% 가정 / 순유입 ${Math.round(netSaleProceeds).toLocaleString('ko-KR')}원`;
      }
    } else if (desiredHomeId) {
      const nextHome = homes.find(home => home.id === desiredHomeId);
      if (!nextHome) {
        actionStatus = '후보를 찾지 못해 거래하지 않음';
      } else if (state.currentHomeId === nextHome.id) {
        actionStatus = '이미 보유한 주택 · 유지';
      } else {
        const oldHome = homes.find(home => home.id === state.currentHomeId);
        const oldSalePrice = oldHome ? annualPrice(oldHome, year, overrides) : 0;
        const oldNetProceeds = oldHome ? oldSalePrice * (1 - SELL_COST_RATE) - state.mortgageBalanceWon : 0;
        const cashForNewHome = state.cashWon + oldNetProceeds;
        const newPrice = annualPrice(nextHome, year, overrides);
        const simulatedPersona = {
          ...persona,
          age: nonnegative(persona.age) + (year - 2020),
          cashWon: Math.max(0, cashForNewHome),
          assetsWon: Math.max(0, cashForNewHome),
          homeless: true,
          firstHome: !state.hasBoughtEver,
          reserveWon: Number.isFinite(persona.reserveWon) ? persona.reserveWon : RESERVE_WON,
        };
        const financing = purchasing(simulatedPersona, loanHome(nextHome, newPrice));
        if (cashForNewHome < 0 || !financing.canBuy) {
          actionStatus = `자금 부족 · 거래 미실행${state.currentHomeId ? ' / 기존 주택 유지' : ''}`;
        } else {
          const buyingCosts = newPrice * BUY_COST_RATE;
          const reserve = nonnegative(simulatedPersona.reserveWon);
          const requiredLoanWon = Math.max(0, newPrice + buyingCosts + reserve - cashForNewHome);
          if (requiredLoanWon > financing.loanWon) {
            actionStatus = `자금 부족 · 거래 미실행${state.currentHomeId ? ' / 기존 주택 유지' : ''}`;
          } else {
            state.cashWon = cashForNewHome - (newPrice + buyingCosts - requiredLoanWon);
            state.currentHomeId = nextHome.id;
            state.mortgageBalanceWon = requiredLoanWon;
            state.loanRate = financing.bestOption?.rate ?? 0.03;
            state.monthlyPaymentWon = requiredLoanWon > 0 ? monthlyPayment(requiredLoanWon, state.loanRate, LOAN_TERM_YEARS) : 0;
            state.hasBoughtEver = true;
            purchaseEvents.push({ year, kind: oldHome ? 'switch' : 'buy', homeId: nextHome.id, previousHomeId: oldHome?.id || null, priceWon: newPrice, loanWon: requiredLoanWon });
            actionStatus = oldHome ? `${nextHome.label}로 갈아타기 완료 · 매도비용 2% 가정` : `${nextHome.label} 매수 완료`;
          }
        }
      }
    } else if (action === 'keep') {
      actionStatus = state.currentHomeId ? '보유 주택 유지' : '무주택 상태 유지';
    } else {
      actionStatus = year === 2020 ? '무주택으로 시작' : (state.currentHomeId ? '보유 주택 유지' : '무주택 상태 유지');
    }

    const heldHome = homes.find(home => home.id === state.currentHomeId) || null;
    const homeValueWon = heldHome ? annualPrice(heldHome, year, overrides) : 0;
    const netWorthWon = Math.round(state.cashWon + homeValueWon - state.mortgageBalanceWon);
    records.push({
      year,
      action,
      decision: decisionLabel(action, homes),
      actionStatus,
      cashWon: Math.round(state.cashWon),
      savingsAddedWon,
      mortgagePaidWon,
      homeId: heldHome?.id || null,
      homeLabel: heldHome?.label || null,
      homeName: heldHome?.name || null,
      homeValueWon: Math.round(homeValueWon),
      mortgageBalanceWon: Math.round(state.mortgageBalanceWon),
      netWorthWon,
      monthlyPaymentWon: Math.round(state.monthlyPaymentWon),
      loanRate: state.loanRate,
      event: purchaseEvents.at(-1)?.year === year ? purchaseEvents.at(-1) : null,
    });
  }

  return {
    records,
    purchaseEvents,
    savingsRatePercent: Math.min(100, Math.max(0, Number(savingsRatePercent) || 0)),
    initialNetWorthWon: records[0]?.netWorthWon || 0,
    finalNetWorthWon: records.at(-1)?.netWorthWon || 0,
    changeWon: (records.at(-1)?.netWorthWon || 0) - (records[0]?.netWorthWon || 0),
  };
}
