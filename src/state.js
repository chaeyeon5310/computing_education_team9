/**
 * 공유 상태 및 유틸리티
 * 프로젝트 전역 상태, 포맷터, 페르소나 정의 및 로컬 저장을 관리한다.
 */
// 이 파일의 최상위 변수는 나머지 classic <script defer>에서 공유합니다.
// 기존 저장된 v8 세션과의 호환성을 위해 상태 키·형식을 유지합니다.

const $ = (q, root = document) => root.querySelector(q);

const $$ = (q, root = document) => [...root.querySelectorAll(q)];

const KR = new Intl.NumberFormat('ko-KR');

const won = n => {
  if (!Number.isFinite(n)) return '—';
  const neg = n < 0 ? '-' : '';
  n = Math.abs(n);
  const e = Math.floor(n / 1e8), m = Math.round((n - e * 1e8) / 1e4);
  return neg + (e ? `${e}억${m ? ` ${KR.format(m)}만` : ''}` : `${KR.format(m)}만`) + '원';
};

const briefWon = n => Number(n) >= 1e8 ? `${(n / 1e8).toFixed(1).replace(/\.0$/, '')}억` : `${Math.round(n / 1e4)}만`;

const pct = n => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

const safe = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const KEY = 'housing-time-map-v8-differentiated';

let listings = [], story = {}, session = null, screen = 'intro', selected = null, filter = { query: '', region: '전체', type: '전체', budget: '전체', area: '전체', sort: 'price', view: 'all' }, map = null, markers = null, markerLayers = [], mapArea = '서울·경기·인천', mapState = null, visibleCount = 18, moreNews = true, activeTab = 'all', toastHandle;

// Presentation choices are independent of the simulation and its calculations.
let classroomUI = { news: {}, reasons: {} };

const newsIsOpen = key => Boolean(classroomUI.news[`${session.year}:${key}`]);
const decisionReason = () => classroomUI.reasons[session.year] || 'rate';

const personalities = [
  {
    id: 'earn',
    tag: '고소득 · 적은 종잣돈',
    name: '김하린',
    age: 30,
    job: 'IT 직장인 · 판교',
    income: 155000000,
    cash: 170000000,
    growth: .065,
    saveRatio: .36,
    commute: { lat: 37.3948, lng: 127.111 },
    desc: '연봉은 높지만 현금이 적음. 시간이 지날수록 저축·대출 여력 확대'
  },
  {
    id: 'asset',
    tag: '종잣돈 · 낮은 소득',
    name: '윤민서',
    age: 31,
    job: '연구직 · 광화문',
    income: 73000000,
    cash: 480000000,
    growth: .025,
    saveRatio: .24,
    commute: { lat: 37.565, lng: 126.977 },
    desc: '모아 둔 돈은 넉넉하지만 대출 상환능력이 상대적으로 낮음'
  },
  {
    id: 'balance',
    tag: '맞벌이 · 중간형',
    name: '이현우',
    age: 32,
    job: '맞벌이 가구 · 여의도',
    income: 118000000,
    cash: 310000000,
    growth: .045,
    saveRatio: .33,
    commute: { lat: 37.5217, lng: 126.9243 },
    desc: '현금과 소득이 중간 정도. 두 사람의 소득과 생활비를 함께 관리'
  }
];

const currentIncome = (yr = session?.year || 2020) => session ? Math.round(session.profile.income * Math.pow(1 + (session.profile.growth || 0), yr - 2020)) : 0;

const savingsForYear = (year, profile = session.profile) => Math.round(profile.income * Math.pow(1 + (profile.growth || 0), year - 2020) * (profile.saveRatio || .25));

const rentForYear = (year, profile = session.profile) => Math.round((profile.id === 'balance' ? 13200000 : 10800000) * Math.pow(1.025, year - 2020));


const byId = id => listings.find(x => x.id === id);

const yearData = () => story.years[String(session.year)];

const regionKey = h => h.region === '서울특별시' ? '서울' : h.region === '인천광역시' ? '인천' : '경기';

const localEvent = h => story.localEvents.find(e => e.target.some(t => h.district.includes(t))) || null;

const biasYear = (ev, y) => ev ? Number(ev.bias[y - 2020] || 0) : 0;

const ratio = (a, b) => b > 0 ? (a - b) / b : 0;

// v7 AUDIT: coefficients are education-only scenario assumptions, NOT empirically estimated elasticities.
// Research supports investigating rates / supply / credit, not any precise coefficient below.
const EXPLANATION_CATEGORIES = {
  rate: '금리', transactions: '거래량', supply: '입주·미분양', rent: '전월세', location: '지역·입지', finance: '자금·위험 관리'
};

const displayRate = v => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%p`;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ session, screen, selected, filter, moreNews, classroomUI }));
  } catch (e) {
    console.warn(e);
  }
}

function restore() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s?.session?.year >= 2020 && s.session.year <= 2026) {
      session = s.session;
      screen = s.screen || 'game';
      selected = s.selected;
      filter = { ...filter, ...s.filter };
      moreNews = s.moreNews ?? true;
      classroomUI = { news: s.classroomUI?.news || {}, reasons: s.classroomUI?.reasons || {} };
      return true;
    }
  } catch { }
  return false;
}

function toast(m) {
  const el = $('#toast');
  el.textContent = m;
  el.classList.add('show');
  clearTimeout(toastHandle);
  toastHandle = setTimeout(() => el.classList.remove('show'), 3300);
}
