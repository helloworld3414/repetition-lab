# 반복 구조 학습실

중학교 1학년 정보 '반복 구조' 차시를 다루는 연구용 시안이다. 생성형 AI 에이전트의 페르소나(러닝코치, 러닝메이트)가 학습에 미치는 영향을 보기 위한 공동연구의 화면 시제품이다.

- 이 주소에서는 실시간 AI 대신 미리 쓴 대본으로 답한다.
- 학습 기록과 게시판 글은 보는 사람의 브라우저에만 저장된다.
- 연구자 보기는 연구팀 코드로 잠겨 있다.
- 검색 엔진에 나오지 않도록 noindex를 걸어 두었다.

## 주소

- 배포(GitHub Pages): https://helloworld3414.github.io/repetition-lab/
- claude.ai 아티팩트(실시간 AI 사용 가능): https://claude.ai/artifact/FwxMRV1uXpDjdUhWrQQjmi

## 고치는 방법

화면 소스는 `source/`에 있고, 배포 파일 `index.html`은 빌드로 만든다. `index.html`을 직접 고치지 않는다.

1. `source/src`의 파일을 고친다.
   - `data.js`: 차시 내용, 문항, 대본, 지정 오류
   - `app-core.js`: 학습 흐름, 기록(xAPI), 공통 화면
   - `app-shell.js`: 내 수업, 대시보드, 게시판, 과제, 노트, 오른쪽 창
   - `app-agent.js`: AI 대화, 하네스, 연구자 보기
   - `app-lab.js`: 코드 실습장
   - `styles.css`, `body.html`: 모양과 뼈대
2. `python3 source/build.py`를 실행한다. `index.html`과 `source/out/`이 새로 만들어진다.
3. 검사: `cd source && python3 tests/run_check.py && python3 tests/lab_check.py && python3 tests/home_check.py` (Playwright 필요)
4. 커밋하고 올린다. 아티팩트는 `source/out/repetition-lab.html`을 같은 아티팩트 주소로 다시 올린다.
