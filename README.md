# NAKSAN.NAV 작업 현황

한성대 진로로드맵 e-Advisor 공모전 프로젝트 **NAKSAN.NAV**의 작업 현황 페이지예요.
지금 하는 일, 결정이 필요한 것, 할 일, 한 일, 요청 이력, 기획서 대비 기능 현황을 한 화면에서 볼 수 있어요.

- 페이지: https://maverick6666.github.io/naksan-nav-progress/
- 이력: 이 저장소의 커밋 하나하나가 요청·진행 기록이에요.

## 어떻게 갱신하나요

새 요청이 생기거나 일이 시작·완료될 때마다 `data/tracker.json`만 고쳐서 커밋해요.
화면(`index.html`, `app.js`, `style.css`)은 이 파일을 읽어서 그리기 때문에 빌드 과정이 없어요.

커밋 메시지는 이렇게 맞춰요.

| 언제 | 메시지 |
| --- | --- |
| 새 요청이 들어올 때 | `요청 추가: <제목> (N-0xx)` |
| 일을 시작할 때 | `작업 시작: <제목> (N-0xx)` |
| 일이 끝났을 때 | `완료: <제목> (N-0xx)` |
| 누군가의 결정을 기다릴 때 | `결정 필요: <제목> (N-0xx)` |
| 그 밖의 정리 | `정리: <내용>` |

## `data/tracker.json` 구조

| 키 | 내용 |
| --- | --- |
| `meta` | 제목, 부제, 마지막 업데이트 시각(`+09:00`), 이 저장소 주소 |
| `owners`, `areas` | 담당(나 · PM · 기획 · 팀)과 영역 이름 |
| `milestones` | 공모전 일정: `id`, `name`, `from`, `to`, `note` |
| `items` | 일 하나하나: `id`, `title`, `area`, `owner`, `status`(`todo` · `doing` · `waiting` · `done`), `requested`, `started`, `done`, `stage`(일정 `id`), `request`(요청 요약), `note`, `ref`(커밋·PR), `steps`, `check`(다시 확인할 일), `waitingOn` |
| `events` | 이력. 시간 순서대로 **뒤에 붙여요**: `at`, `type`(`request` · `start` · `done` · `wait` · `note`), `item`, `text` |
| `features` | 기획서 기능 대비 현황: `group`, `rows[]`(`name`, `status`(`done` · `partial` · `todo`), `have`, `left`) |

날짜는 모두 한국 시간이고, `YYYY-MM-DD` 또는 `YYYY-MM-DDTHH:MM` 형식이에요.

## 내 PC에서 보기

`index.html`을 파일로 바로 열면 브라우저 보안 때문에 데이터를 못 읽어요. 이 폴더에서 정적 서버로 열어 주세요.

```bash
npx serve .
```

## 공개 규칙

- 학번 · 연락처 · 이메일 같은 개인정보와 팀원 실명은 적지 않아요. 팀원은 역할(PM · 기획)로 적어요.
- 팀 저장소(비공개)의 코드와 데이터는 올리지 않아요. 커밋 번호만 참고로 남겨요.
