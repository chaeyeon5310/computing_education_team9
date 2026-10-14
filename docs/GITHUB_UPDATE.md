# 기존 GitHub 레포에 v8 가독성 개선판 올리기

원래 업로드한 `computing_education_team9.zip`의 `.git/config`에 기록된 연결:

- remote origin: `https://github.com/chaeyeon5310/computing_education_team9.git`
- branch: `main`

현재 GitHub 서버의 브랜치 상태나 권한은 이 안내서에서 실시간 확인하지 않았습니다.

## 1) 기존 Git 레포 열기

VS Code로 **이미 clone해 둔 `computing_education_team9` 폴더**를 여세요. 폴더 안에 `.git`이 있어야 합니다.

터미널에서:

```bash
git remote -v
git branch --show-current
git status
```

원래 작업에서 저장하지 않은 변경이 있다면 먼저 커밋하거나 `git stash`로 보관하세요.

## 2) 새 브랜치 만들기

```bash
git switch main
git pull --ff-only origin main
git switch -c refactor/v8-readable
```

이미 존재하는 브랜치 이름이라면 `refactor/v8-readable-2`처럼 바꿔 주세요. 팀원의 작업이 있으므로 `main`에 바로 강제로 push하지 마세요.

## 3) 코드 파일 복사

다운로드한 `computing_education_team9_v8_refactored.zip`을 압축 해제합니다.

**압축 해제한 폴더의 _내용물_을 Git 레포 루트에 복사**하세요. 다음 파일이 교체·추가되어야 합니다.

- 교체: `index.html`, `styles.css`, `app.js`
- 추가: `src/` 폴더 6개 JS
- 추가·교체: `data/listings.json`, `data/storyline.json`
- 추가: `README.md`, `docs/`, `tests/`, `.gitignore`

중요: 기존 레포의 **`.git` 폴더는 절대 삭제하거나 덮어쓰지 마세요**. 이 배포 ZIP에는 `.git`이 없습니다. 원본의 `game-engine.js`, `loan-model.js`, `timeline-engine.js` 등 사용하지 않는 파일은 이번 리팩터링에서는 자동 삭제하지 않습니다.

Mac 터미널로 복사하려면, *압축 푼 폴더 이름/경로가 정확할 경우*:

```bash
# 이미 Git 레포 폴더 안에서 실행하는 경우
cp -R ~/Downloads/computing_education_team9_v8_refactored/. .
```

경로가 다르면 `~/Downloads/...` 부분을 실제 경로로 바꿔 주세요.

## 4) 실행과 확인

VS Code `index.html` → 우클릭 → **Open with Live Server**.

확인: 인트로, 프로필 3명, 610개 단지, 지도 확대/축소, 2020 매수, 2021 진행, 갈아타기, 2026 결산.

Node가 설치된 경우:

```bash
node tests/check-model.cjs
```

## 5) 커밋하고 브랜치 push

```bash
git status --short
git diff --check

git add index.html styles.css app.js src/ data/listings.json data/storyline.json README.md docs/ tests/ .gitignore
git diff --cached --stat

git commit -m "refactor: organize v8 housing simulation source"
git push -u origin refactor/v8-readable
```

- `Everything up-to-date`는 커밋되지 않은 변경을 의미할 수도 있으니 `git status` 확인.
- `Permission denied` 또는 권한 오류가 발생하면 레포에 push할 권한이 있는지 확인해야 합니다.
- GitHub에서 `Compare & pull request` → 변경 파일 확인 → 팀원이 리뷰한 다음 `main`에 병합.

직접 `main`에 push하기 전에 PR을 이용하는 것이 안전합니다. `git push --force`는 사용하지 마세요.
