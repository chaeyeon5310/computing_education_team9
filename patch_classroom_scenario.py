#!/usr/bin/env python3
"""Patch feature/housing-classroom/data/classroom-scenario.json; no Node.js required.
Run from project root: python3 patch_classroom_scenario.py
Keeps game years, rates, loan rules, projects, profiles, and non-supply news.
"""
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TARGET = ROOT / 'data' / 'classroom-scenario.json'
BACKUP = ROOT / 'data' / 'classroom-scenario.before-market-update.json'
REGIONS = ('서울', '경기', '인천')

MARKET = {
    2026: {
        'completions': {'서울': 42000, '경기': 95000, '인천': 19000},
        'demand': {'서울': 1.5, '경기': 1.0, '인천': 0.0},
        'hint': {'서울': '업무·교통 접근성 수요 유지, 입주 확대', '경기': '지역별 일자리 증가와 신축 입주 병존', '인천': '신규 입주와 구도심 수요 차별화'},
        'title': '수도권 신규 입주 확대, 지역별 영향은 다르다'
    },
    2027: {
        'completions': {'서울': 48000, '경기': 108000, '인천': 23000},
        'demand': {'서울': 1.0, '경기': 0.5, '인천': -0.5},
        'hint': {'서울': '입주 물량 증가, 핵심 생활권 수요 유지', '경기': '신규 주택 공급 확대, 지역별 수요 차이', '인천': '신규 입주 증가로 기존 주택 경쟁 심화'},
        'title': '수도권 입주 물량 증가, 기존 주택과 경쟁'
    },
    2028: {
        'completions': {'서울': 50000, '경기': 125000, '인천': 28000},
        'demand': {'서울': 0.5, '경기': -1.0, '인천': -1.5},
        'hint': {'서울': '금융 부담과 공급 증가로 수요 둔화', '경기': '대규모 입주와 금융 부담의 중첩', '인천': '신규 공급 집중과 구매 수요 약화'},
        'title': '경기·인천 입주 집중, 공급 부담 확대'
    },
    2029: {
        'completions': {'서울': 45000, '경기': 105000, '인천': 24000},
        'demand': {'서울': 1.0, '경기': 0.0, '인천': -0.5},
        'hint': {'서울': '일부 지역 수요 회복, 입주 부담 완화', '경기': '교통·일자리 변화에 따른 지역별 차별화', '인천': '신규 입주가 이어지는 가운데 수요 정체'},
        'title': '입주 물량 일부 감소, 지역별 차별화'
    },
    2030: {
        'completions': {'서울': 40000, '경기': 90000, '인천': 20000},
        'demand': {'서울': 1.5, '경기': 1.0, '인천': 0.5},
        'hint': {'서울': '기초 주거 수요 회복과 입주 감소', '경기': '일자리·교통 생활권 중심 수요 회복', '인천': '공급 부담 완화와 완만한 수요 개선'},
        'title': '신규 입주 둔화, 지역별 가격 반응 차별화'
    }
}

if not TARGET.is_file():
    raise SystemExit(f'파일을 찾을 수 없습니다: {TARGET}\nGit 저장소 최상위 폴더에 이 파일을 넣고 실행하세요.')

try:
    original = TARGET.read_text(encoding='utf-8')
    scenario = json.loads(original)
except (ValueError, OSError) as exc:
    raise SystemExit(f'원본 JSON을 읽지 못했습니다: {exc}')

meta = scenario.get('meta', {})
years = [r.get('year') for r in scenario.get('rounds', [])]
if (meta.get('startYear'), meta.get('endYear')) != (2026, 2031) or years != list(MARKET):
    raise SystemExit('현재 feature/housing-classroom 구조(2026~2031 / 5개 라운드)와 다릅니다. 파일을 수정하지 않았습니다.')

for round_data in scenario['rounds']:
    year = round_data['year']
    entry = MARKET[year]
    stats = round_data.get('regionalStats', {})
    if any(region not in stats for region in REGIONS):
        raise SystemExit(f'{year}년 regionalStats가 예상 구조와 다릅니다. 파일을 수정하지 않았습니다.')
    news_list = round_data.get('news', [])
    if not isinstance(news_list, list):
        raise SystemExit(f'{year}년 news 구조가 예상과 다릅니다. 파일을 수정하지 않았습니다.')

    for region in REGIONS:
        stats[region]['completions'] = entry['completions'][region]
        stats[region]['demand'] = entry['demand'][region]
        stats[region]['hint'] = entry['hint'][region]

    supply_news = next((n for n in news_list if n.get('kind') == '공급'), None)
    if supply_news is not None:
        supply_news['title'] = entry['title']
        supply_news['body'] = (
            f"[가상 시나리오] {year}년 예정 입주 물량: "
            f"서울 {entry['completions']['서울']:,}호, "
            f"경기 {entry['completions']['경기']:,}호, "
            f"인천 {entry['completions']['인천']:,}호. "
            '게임에서는 동네별·인접 지역별 공급과 수요를 함께 비교하세요.'
        )

meta['reality'] = (
    '2026~2031년 금리·대출 정책·주택 수요·입주 물량·가격 변동은 모두 교육용 가상 시나리오입니다. '
    '지역별 입주 물량은 국내 주택 준공 규모를 참고해 설정한 가정값이며 공식 전망치가 아닙니다. '
    '가격 모델 계수는 실제 부동산 시장에서 실증 추정한 인과효과가 아닙니다.'
)
references = meta.get('references')
if isinstance(references, list) and not any(r.get('title') == '국토교통부 주택통계 안내' for r in references if isinstance(r, dict)):
    references.append({
        'title': '국토교통부 주택통계 안내',
        'url': 'https://www.molit.go.kr',
        'use': '가상 입주 물량의 단위와 규모를 정하는 데 참고. 게임에 넣은 숫자는 실제 미래 예상치가 아님.'
    })

# Validate all expected edited values before overwriting.
for r in scenario['rounds']:
    for region in REGIONS:
        s = r['regionalStats'][region]
        if not isinstance(s['completions'], int) or s['completions'] <= 0 or not isinstance(s['demand'], (int, float)):
            raise SystemExit('수정값 검증 실패: 파일을 수정하지 않았습니다.')

if not BACKUP.exists():
    shutil.copy2(TARGET, BACKUP)

TARGET.write_text(json.dumps(scenario, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('완료: data/classroom-scenario.json 수정')
print('백업:', BACKUP)
for r in scenario['rounds']:
    print(r['year'], '/ '.join(f"{k} {r['regionalStats'][k]['completions']:,}호" for k in REGIONS))
