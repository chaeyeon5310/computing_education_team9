# 집의 시간 — 부동산 모의투자 (v8 코드 정리판)

**2020년 실제 아파트 기준가격**에서 출발해 **2021~2026년의 가상 시장**을 플레이하는 교육용 부동산 모의투자 게임입니다.

- 아파트 610개: 기존 원본 데이터의 실제 단지명, 좌표, 전용면적, 준공연도, 2020년 실거래가 가공값 활용
- 가상 시나리오: 이후 가격·뉴스·지역 프로젝트·금리·대출규칙은 교육용 가정
- 매년 매수·보유·매도·갈아타기 결정, 순자산/거래 내역/가격 변동 요인 확인
- Leaflet + OpenStreetMap 지도, **Live Server로 바로 실행** (Node/npm 설치 불필요)

> 실제 매물 광고도, 검증된 가격 예측 모델도 아닙니다. 시나리오의 가격 변동 계수는 실거래로 추정된 인과계수가 아니며 투자 판단에 사용하면 안 됩니다.

## 실행

1. VS Code에서 이 폴더 열기
2. `index.html` 우클릭 → **Open with Live Server**
3. 브라우저에서 시작. 지도 타일과 웹 폰트를 불러오려면 인터넷 연결이 필요합니다.

## 폴더 구조

```text
index.html             # 페이지 구조와 JS 파일 로드 순서
styles.css             # 기존 v8 스타일 (내용/순서 유지, 읽기 쉽게 포맷)
app.js                 # 데이터 로드, 사용자 버튼·폼 이벤트 연결
src/
  state.js             # 공통 상태, 유틸리티, 페르소나, 저장/복원
  market-model.js      # 가상 뉴스·지역/단지별 가격 계산식
  finance.js           # 대출·매수 가능액·순자산 계산
  views.js             # 인트로, 뉴스, 매물 목록, 상세, 결과 HTML
  map.js               # Leaflet 지도와 마커, 필터 후 목록 갱신
  game.js              # 연도 진행, 매수/매도/보유/갈아타기
 data/
  listings.json        # 실제 단지 정보와 2020 출발가격
  storyline.json       # 가상 연도별 시장 및 뉴스
 docs/
  ARCHITECTURE.md      # 계산식, 데이터, 로딩 구조
  GITHUB_UPDATE.md     # 기존 Git 레포에 올리는 방법
 tests/
  check-model.cjs      # Node로 가격 계산과 데이터 정합성 검증
```

### 수정 위치 빠르게 찾기

| 바꾸려는 내용 | 파일 |
|---|---|
| 이름/현금/연봉/저축률 등 페르소나 | `src/state.js`의 `personalities` |
| 지역 상승·하락, 교통·개발 시나리오 | `src/market-model.js`의 `yearRegionShocks`, `zoneWeights`, `scenarioProjects` |
| 대출 가능액, 월 납입, 거래비용 | `src/finance.js`의 `maxLoan`, `quote` |
| 뉴스 카드, 매물 카드, 결과 HTML | `src/views.js` |
| 지도 확대·축소, 가격 핀 표시 | `src/map.js` |
| 매수·매도·연도 진행 | `src/game.js` |
| 버튼 연결, 초기 JSON 읽기 | `app.js` |
| 색상·크기·반응형 | `styles.css` |

코드는 빌드 도구 없이 **여러 개의 일반 JavaScript 파일을 `<script defer>` 순서대로 불러오는 구조**입니다. `index.html`의 JS 순서를 바꾸면 의존성이 깨질 수 있습니다.

## 개발 체크

로컬에 Node.js가 있으면 다음 테스트를 실행할 수 있습니다(게임 실행에 Node 설치는 불필요).

```bash
node tests/check-model.cjs
```

버그를 고칠 때는 `index.html`을 Live Server로 열어 **매수 → 다음 연도 → 갈아타기 → 2026년 최종 결과**도 확인하세요.

## GitHub

이 프로젝트는 최초 업로드에 포함된 `.git/config` 기준 **`https://github.com/chaeyeon5310/computing_education_team9.git`의 `main` 브랜치**에서 발전한 버전입니다. 이 ZIP 파일에는 `.git/`이 들어 있지 않습니다. 이미 clone한 레포에 코드만 복사하고, 새 브랜치에서 작업하세요. 명령어는 [docs/GITHUB_UPDATE.md](docs/GITHUB_UPDATE.md)에 있습니다.

기존 레포의 `loan-model.js`, `timeline-engine.js`, `game-engine.js`, 중복 `homes.json` 등은 옛 버전 파일입니다. 새 `index.html`에서는 이 파일을 읽지 않습니다. 삭제 여부는 팀원들과 확인한 뒤 별도 커밋으로 정하는 것이 안전합니다.
