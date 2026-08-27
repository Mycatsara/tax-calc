---
name: design
description: taxtool.kr 디자인 규칙(색상·폰트·컴포넌트·금지사항). 새 계산기 페이지(/pay/ 등)나 새 페이지를 만들거나 기존 페이지 디자인을 손댈 때 코드를 쓰기 전에 반드시 먼저 읽는다. 글(guide) 변환은 /publish 스킬이 담당하지만 그때도 이 규칙이 우선한다.
---

# taxtool.kr 디자인 스킬

**목적**: AI가 페이지를 만들 때마다 디자인이 달라지는 것을 막는다. 아래 값을 그대로 쓴다. 새 색·새 폰트·새 그림자·새 모서리 값을 발명하지 않는다. 기준 구현체는 `index.html`(계산기)과 가장 최근 `guide/*.html`(글)이다 — 애매하면 그 파일의 CSS를 복사한다.

## 1. 컨셉 한 줄
**"세무서 영수증"** — 회청색 서류 받침 위에 흰 영수증 종이, 입금 초록으로 결과 강조, 주황 도장. 차분하고 신뢰감. 화려함·그라데이션·네온 금지.

## 2. 색상 토큰 (`:root`에 그대로 선언)
```css
--bg:#EDF0F4;        /* 페이지 배경: 서류 받침 회청색 */
--ink:#14181F;       /* 본문 글자: 먹색 */
--paper:#FFFFFF;     /* 카드·영수증 종이 */
--green:#0E7A4E;     /* 주색: 입금 초록 — 강조·링크·결과 박스·CTA */
--green-deep:#0A5C3B;
--amber:#E8A13C;     /* 보조: 도장 주황 — 스탬프·포커스 링·chip active */
--line:#D8DCE2;      /* 테두리·구분선 */
--sub:#5B6472;       /* 보조 글자(라벨·메타) */
```
고정 보조색: 본문 회색 `#333A45` / 마이너스 빨강 `#C0392B` / 팁·요약 박스 배경 `#FDF6EA` 테두리 `#F0DDBB` 글자 `#6B5320` / 태그 배경 `#E7F3ED` / 푸터 글자 `#98A0AB` / 탭 트랙 `#E0E4EA` / 입력 배경 `#FAFBFC`.

## 3. 타이포
- Google Fonts: `Noto+Sans+KR:wght@400;500;700;900` + `IBM+Plex+Mono:wght@500;600` (preconnect 포함)
- 본문 `'Noto Sans KR'`, line-height 1.6. **숫자(금액·결과·입력값)는 `'IBM Plex Mono'` 600**
- h1: 계산기 32px/900, 글 26px/900, letter-spacing -0.5px. 강조 단어는 `<span class="pct">`로 초록
- section/article h2: 19~20px/900, letter-spacing -0.3px
- 본문 p: 14.5px, color #333A45. 라벨 13px/700 `--sub`
- eyebrow(상단 작은 태그): 12px/700, letter-spacing 2px, 초록 글자+1.5px 초록 테두리, radius 4px

## 4. 레이아웃
- `.wrap{max-width:560px}` 계산기 / `640px` 글. `margin:0 auto;padding:32px 20px 60px`
- **모바일 우선 단일 컬럼.** 좌우 여백 20px. 데스크톱도 중앙 좁은 컬럼 유지(앱 느낌)
- 세로 리듬: 헤더 → 탭(26px 위) → 카드(14px) → 결과(22px) → 본문 섹션(44px) → 푸터(48px)

## 5. 컴포넌트 (클래스명·수치 고정)
| 컴포넌트 | 규칙 |
|---|---|
| `.card` 입력 카드 | paper 배경, 1px `--line`, **radius 14px**, padding 22px 20px |
| `.tabs` 방향 전환 | 트랙 `#E0E4EA` radius 12px padding 4px / 버튼 radius 9px 14px/700 / `.on`은 paper 배경 + `0 1px 3px rgba(20,24,31,.12)` |
| `input[type=text]` | Plex Mono 26px/600 우측 정렬, 2px `--line` 테두리 radius 10px, focus 시 `--green` 테두리 |
| `.chip` 빠른 입력 | pill(999px), 1.5px `--ink` 테두리, 13px/700, active 시 amber 채움. `.chip.reset`은 `--line` 테두리 회색 글자 |
| `.receipt` 결과(시그니처) | radius 14px 14px 0 0, 그림자 `0 6px 20px rgba(20,24,31,.10)`, 머리 구분선 **1.5px dashed**, `.stamp`(amber 2px 테두리, -6deg 회전), `.r-line`(Plex Mono 15px, 키는 Noto 13.5px sub), `.r-line.minus .v` 빨강, `.r-total`(초록 배경 흰 글자, 값 36px/600), 하단 `.receipt-tear` 절취선 mask |
| `.copy-btn` | 전체폭, 1.5px ink 테두리, radius 10px, 13px 패딩, active 시 ink 채움 |
| `details/summary` FAQ | paper 카드 radius 10px, summary 14.5px/700, `::after` "+" → open 시 "–" |
| `.rel-card` 관련 글 | 가로 flex, radius 10px, hover 시 초록 테두리, `.tag`(11px 초록 글자 #E7F3ED 배경), `.arr` 초록 화살표 |
| `.tip` / `.summary-box` | 배경 #FDF6EA, 테두리 #F0DDBB, radius 10px, 글자 #6B5320 |
| `.cta` (글 하단) | 초록 배경 흰 글자 radius 12px padding 20px, 링크 **하나만**, 밑줄 `rgba(255,255,255,.5)` |
| `.footnote` | 12.5px sub 이탤릭 |
| `.tbl` 금액 표 (글 본문) | `width:100%;border-collapse:collapse`, 14px, 셀 padding 9px 4px, 행 구분 1px `--line`, `th`는 12.5px/700 sub + 1.5px `--line` 밑줄. **마지막 열(금액)은 우측 정렬 + Plex Mono 600 + `white-space:nowrap`**. 합계행 `tr.total`은 위 1.5px dashed + ink 굵게. 기본 2열. **값이 짧으면(연봉 축약형·금액·% 등) `.tbl.cols3`로 3열 허용** — 가운데 열도 mono 우측 정렬, 단 375px에서 표 폭 실측이 통과해야 한다(yeonbong: 285px 통과). 4열 이상은 목록으로 바꾼다 |
| `.pubdate` 게시일 | 글 헤더 `.meta` 바로 아래, `margin-top:6px;font-size:12.5px;color:#98A0AB` |
| `.stepper` 수량 입력 (pay) | `.step-btn` 38×38 pill, 1.5px ink 테두리, active 시 amber 채움, disabled 시 `--line` 테두리+sub 글자 / `.step-val` Plex Mono 22px/600 / `.step-unit` 14px/700 sub. 옵션 묶음은 `.opt-row`(간격 18px) + `.hint`(12px sub) |
| `.r-line.sum` 공제 합계 | 영수증 안 소계 행: 위 1.5px dashed 구분선, 값 600. `.r-line .k small`(11.5px)로 요율 표기. `.r-total .sub`(12.5px, opacity .85)로 연 환산 등 보조 정보 |
| `.home-link` | 계산기 하위 페이지 상단 "← 홈" 13px sub 링크 |
| `footer` | 12px #98A0AB 중앙 정렬, `.disclaimer`(max 420px) → 한 줄 소개 → `.footer-links`(가이드·사이트 소개·개인정보처리방침) |
| `.post-list` 번호형 글 목록 | 홈·글 하단 공용. `<ol>`, 위아래 1px `--line` 구분선, 행 padding 12px 2px, `.n`(Plex Mono 12.5px/600 #98A0AB) · `.t`(14.5px/700) · `.g`(초록 화살표). hover 시 `.t`가 초록 |
| `.next-read` 글 하단 관련 글 | `margin-top:34px`, h2 15px/900. **위치는 정리 박스 뒤 · CTA 앞** (계산기로 바로 보내면 이탈하므로 다음 읽을거리를 먼저 준다). 내용은 `tools/buildlist.js`가 생성 |
| `.filter` 글 검색·태그 칩 (가이드 목록) | `.search input`(Noto 14.5px 좌측 정렬, 1.5px `--line`, radius 10px, focus 초록) + `.chip`(pill, 1.5px ink 테두리, `.on`은 amber 채움) + `.count` + `.no-result`. 계산기 입력창과 달리 Plex Mono·우측 정렬을 쓰지 않는다 |

그림자는 위 두 가지(`0 1px 3px` / `0 6px 20px`)만 쓴다. 모서리는 4 / 9 / 10 / 12 / 14 / 999px만 쓴다. transition은 `.15s`만.

## 6. 새 계산기 페이지 뼈대 (예: /pay/index.html)
```
<a class="home-link">← 홈</a>(선택) → header(eyebrow → h1 → p 한 줄)
→ .tabs(모드가 2개 이상일 때만) → .card(입력: label + .input-row + .chips)
→ .receipt(결과: receipt-head(제목+stamp) → receipt-body(.r-line 들 → .r-total)) → .receipt-tear → .copy-btn
→ section(안내 p 2~3개) → section(FAQ details 3~5개, JSON-LD FAQPage와 내용 일치)
→ .related(.rel-card 2~4개 + .rel-more) → .tip(선택) → footer
```
- head: charset, viewport, title(" — 설명" 형식), description, og 3종, **og:url·og:image(/og.png 1200×630)·og:site_name·twitter:card·canonical**, Google Fonts, JSON-LD(FAQPage 또는 Article), **BreadcrumbList(홈 › 계산기명)**, **WebApplication(name·url·applicationCategory=FinanceApplication·isAccessibleForFree·offers 0원·dateModified)**, **AdSense 스크립트 + GA4 스니펫(G-P4F2M5B9DS, 자동화·`?ga=off` 제외 가드 포함) `</head>` 직전** — 둘 다 `index.html`에서 복사
- 결과 금액에는 반드시 `comma()` 천단위 콤마 + "원". 마이너스 항목은 `.minus`
- GA 이벤트: 첫 입력 `calc_use{tool,mode}`, 탭 전환 `calc_mode`, 복사 `calc_copy` — `typeof gtag==='function'` 가드. **입력 금액 값은 이벤트에 담지 않는다**(privacy 고지와 일치)

## 6-2. 광고 배치 시 필수 확인 (8/22 추가)

**광고는 "조용히 안 뜨는" 것이 기본값이다.** 광고 태그 자체에 `display:none`이 들어 있어서, 반응형으로 PC/모바일을 나눌 때 base 클래스를 빠뜨리면 한쪽에서만 영구히 숨겨진다. (실제 사례: 같은 유형의 계산기 사이트가 모바일 광고만 안 뜨는 상태로 **21곳 동일 실수**를 방치)

광고를 넣거나 고친 뒤 배포하면 반드시:
1. **375px 폭**에서 광고 컨테이너의 `offsetHeight > 0` 인지 확인
2. **1280px 폭**에서도 동일 확인
3. 광고를 넣은 **모든 페이지를 전수 확인** — 한 곳의 실수는 전 페이지의 실수다
4. 콘솔에 `adsbygoogle` 관련 오류가 없는지 확인
5. 배치 한도 준수: 계산 결과 아래 1개 중심, 페이지당 2~3개 이하

## 7. 금지
- **이모지 금지** (아이콘 필요하면 텍스트 기호 `+ – → ·` 또는 CSS 도형). 이 사이트는 기호만 쓴다
- 그라데이션, 네온, 유리 효과, 큰 그림자, 둥근 pill 버튼 남발, 파스텔 배경 카드 금지
- 새 폰트·외부 아이콘 라이브러리·프레임워크(Tailwind 등) 도입 금지 — 순수 HTML/CSS/JS 단일 파일
- 조급함 파는 문구("지금 당장", "놓치면 손해") 금지. 사실 기반 기한은 OK
- 본문 글 수치·법령은 승인 원고 그대로. 디자인 작업 중 문구를 손대지 않는다

## 8. 모바일 체크 (배포 전)
- 375px 폭에서 `.r-total .v` 36px 금액이 한 줄에 들어가는지(억 단위면 32px로 축소 허용)
- 한 행에 정보가 몰리면 줄바꿈. 긴 안내문은 `~입니다.` 호흡에서 끊는다
- 탭 버튼 글자가 두 줄로 꺾이지 않는지, chip이 wrap되는지
- 인앱브라우저(스레드·카카오)에서 폰트가 커 보이면 html에 `-webkit-text-size-adjust:100%`

## 9. 스킬 갱신 규칙
새 컴포넌트(예: 표·슬라이더·연봉별 표)를 만들면 5번 표에 한 줄 추가한다. 기준 구현체가 바뀌면(예: 급여계산기가 더 최신) 2~6번 값을 그 파일 기준으로 재검토한다.
