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
| 하는 중에 단계가 끝났을 때 | `진행: <끝난 단계> (N-0xx)` |
| 일이 끝났을 때 | `완료: <제목> (N-0xx)` |
| 누군가의 결정을 기다릴 때 | `결정 필요: <제목> (N-0xx)` |
| 그 밖의 정리 | `정리: <내용>` |

## `data/tracker.json` 구조

| 키 | 내용 |
| --- | --- |
| `meta` | 제목, 부제, 마지막 업데이트 시각(`+09:00`), 이 저장소 주소 |
| `owners`, `areas` | 담당(나 · PM · 기획 · 팀)과 영역 이름 |
| `milestones` | 공모전 일정: `id`, `name`, `from`, `to`, `note` |
| `keyDates` | 다가오는 일정(미팅·마감): `date`, `time`, `name`, `item` |
| `items` | 일 하나하나 (아래 표) |
| `events` | 이력: `at`, `type`(`request` · `start` · `done` · `wait` · `note`), `item`, `text`. 날짜 순서로 넣고, 같은 날은 일어난 순서대로 |
| `features` | 기획서 기능 대비 현황: `group`, `rows[]`(`name`, `status`(`done` · `partial` · `todo`), `have`, `left`) |

`items` 한 개의 칸:

| 칸 | 내용 |
| --- | --- |
| `id`, `title` | `N-000` 번호와 제목. 번호는 바꾸지 않아요 (주소 `#N-044`로 바로 열림) |
| `status` | `todo` 할 일 · `doing` 진행 중 · `waiting` 결정 필요 · `done` 완료 |
| `owner`, `area` | 담당, 영역 |
| `priority`, `rank` | 우선순위 1 먼저 · 2 다음 · 3 나중, 같은 우선순위 안의 순서 |
| `stage`, `due` | 속한 일정 `id`, 마감일 |
| `desc` | 무엇을 왜 하는지 |
| `steps` | 단계 `[{ text, done }]` |
| `includes` | 끝난 일에 들어간 것 |
| `accept` | 끝났다고 볼 기준 |
| `request`, `source` | 요청 요약, 어디서 나온 일인지 (예: 카톡 11/10 PM 제안) |
| `requested`, `started`, `done` | 올라온 날, 시작한 날, 끝낸 날 |
| `waitingOn`, `related`, `ref`, `note`, `check` | 기다리는 사람, 관련 번호, 커밋·PR, 메모, 다시 확인할 일 |

날짜는 모두 한국 시간이고, `YYYY-MM-DD` 또는 `YYYY-MM-DDTHH:MM` 형식이에요.

## 내 PC에서 보기

`index.html`을 파일로 바로 열면 브라우저 보안 때문에 데이터를 못 읽어요. 이 폴더에서 정적 서버로 열어 주세요.

```bash
npx serve .
```

## 공개 규칙

- 학번 · 연락처 · 이메일 같은 개인정보와 팀원 실명은 적지 않아요. 팀원은 역할(PM · 기획)로 적어요.
- 팀 저장소(비공개)의 코드와 데이터는 올리지 않아요. 커밋 번호만 참고로 남겨요.
