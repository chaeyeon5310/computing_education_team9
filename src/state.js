/** Shared state for the 2026–2032 classroom scenario. */
const $ = (q, root = document) => root.querySelector(q);
const $$ = (q, root = document) => [...root.querySelectorAll(q)];
const KR = new Intl.NumberFormat('ko-KR');
const won = n => {
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? '-' : '', units = Math.round(Math.abs(n) / 10000);
  const e = Math.floor(units / 10000), m = units % 10000;
  return sign + (e ? `${e}억${m ? ` ${KR.format(m)}만` : ''}` : `${KR.format(m)}만`) + '원';
};
const briefWon = n => (n < 0 ? '-' : '') + (Math.abs(n) >= 1e8 ? `${(Math.abs(n) / 1e8).toFixed(1).replace(/\.0$/, '')}억` : `${Math.round(Math.abs(n) / 1e4)}만`);
const pct = n => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';
const safe = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const START_YEAR = 2026, END_YEAR = 2032, PERIOD_MONTHS = 24;
const DECISION_YEARS = [2026, 2028, 2030];
// Preserve the previous scenario's save instead of mixing its prices with this model.
const KEY = 'housing-fifth-future-v2';
const defaultFilter = () => ({ query: '', region: '전체', type: '전체', budget: '전체', area: '전체', sort: 'price', view: 'all' });
const defaultUI = () => ({ news: {}, reasons: {}, choices: {}, policyRead: {}, showMap: false, sidebarMode: 'list' });
let listings = [], story = {}, session = null, screen = 'intro', selected = null, filter = defaultFilter(), map = null, markers = null, markerLayers = [], mapArea = '서울·경기·인천', mapState = null, visibleCount = 18, toastHandle;
let classroomUI = defaultUI();
const newsIsOpen = key => Boolean(classroomUI.news[`${session.year}:${key}`]);
const personalities = [
  { id: 'earn', tag: '고소득 · 적은 종잣돈', name: '김하린', age: 30, job: '앱 개발자 · 판교', income: 155000000, cash: 170000000, growth: .065, saveRatio: .36, commute: { lat: 37.3948, lng: 127.111 }, desc: '대출 여력은 크지만 시작 현금이 적어요.' },
  { id: 'asset', tag: '종잣돈 · 낮은 소득', name: '윤민서', age: 31, job: '연구원 · 광화문', income: 73000000, cash: 480000000, growth: .025, saveRatio: .24, commute: { lat: 37.565, lng: 126.977 }, desc: '현금은 넉넉하지만 상환 여력을 살펴야 해요.' },
  { id: 'balance', tag: '맞벌이 · 중간형', name: '이현우', age: 32, job: '맞벌이 · 여의도', income: 118000000, cash: 310000000, growth: .045, saveRatio: .33, commute: { lat: 37.5217, lng: 126.9243 }, desc: '두 사람의 소득과 주거비를 함께 관리해요.' }
];
const incomeAt = (year, profile) => Math.round(profile.income * Math.pow(1 + profile.growth, year - START_YEAR));
const currentIncome = (year = session?.year || START_YEAR) => session ? incomeAt(year, session.profile) : 0;
const savingsForYear = (year, profile = session.profile) => Math.round(incomeAt(year, profile) * profile.saveRatio);
const rentForYear = (year, profile = session.profile) => Math.round((profile.id === 'balance' ? 13200000 : 10800000) * Math.pow(1.025, year - START_YEAR));
const byId = id => listings.find(x => x.id === id);
const roundFor = year => story.rounds.find(r => r.year === year);
const yearData = () => roundFor(session.year);
const regionKey = h => h.region === '서울특별시' ? '서울' : h.region === '인천광역시' ? '인천' : '경기';
const ratio = (a, b) => b > 0 ? (a - b) / b : 0;
const EXPLANATION_CATEGORIES = { finance: '내 예산·상환 여력', policy: '금리·대출 정책', demand: '일자리·교통·개발 수요', supply: '입주예정 물량', trend: '가격 흐름', trades: '거래 사례 비교' };
const displayRate = v => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%p`;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify({ version: 2, session, screen, selected, filter, classroomUI })); }
  catch (e) { console.warn('게임 저장 실패', e); }
}
function restore() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s?.version !== 2 || !s.session || ![...DECISION_YEARS, END_YEAR].includes(s.session.year)) return false;
    if (!personalities.some(p => p.id === s.session.profile?.id) || !['decision', 'reveal', 'finished'].includes(s.session.phase)) return false;
    if (![s.session.cash, s.session.loan, s.session.loanMonths].every(Number.isFinite)) return false;
    session = s.session; screen = session.phase === 'finished' ? 'finish' : 'game';
    selected = byId(s.selected) ? s.selected : null; filter = { ...defaultFilter(), ...s.filter };
    classroomUI = { ...defaultUI(), ...s.classroomUI };
    return true;
  } catch { return false; }
}
function toast(message) {
  const el = $('#toast'); el.textContent = message; el.classList.add('show');
  clearTimeout(toastHandle); toastHandle = setTimeout(() => el.classList.remove('show'), 3300);
}
