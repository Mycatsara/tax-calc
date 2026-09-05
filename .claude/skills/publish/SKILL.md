---
name: publish
description: taxtool.kr 가이드 글 배포 파이프라인. 검수 완료된 원고 md를 HTML로 변환해 목록·sitemap·홈 카드에 반영하고 커밋·푸시까지 완료한다. 운영자가 "/publish <원고파일>" 또는 "N편 올려줘"라고 하면 사용한다.
---

# taxtool.kr 글 배포 파이프라인

운영자가 승인한 원고 md 파일 하나를 받아 taxtool.kr에 게시하는 전 과정. 아래 단계를 **순서대로 전부** 수행한다. 하나라도 건너뛰지 않는다.

원고 위치: `C:\Users\사라띠\Documents\원고대기\` (파일명 규칙: `article-NN-슬러그.md`)
저장소: `C:\Users\사라띠\Documents\tax-calc\`

## 0단계: 사전 점검 (멀티 기기 대응)

1. `git pull` 먼저 실행 — 운영자가 회사 PC와 노트북을 오가므로 반드시 최신화 후 시작
2. git 사용자 정보 확인: 미설정 기기라면 `git config user.name "wptjsdkenl"`, `git config user.email "wptjsdkenl@gmail.com"` (저장소 로컬로만 설정)

## 1단계: 발행 한도 확인 (하루 최대 2편 — 절대 규칙)

오늘 자정 이후 커밋에서 새로 추가된 `guide/*.html` 수를 센다:
```bash
git log --since=midnight --diff-filter=A --name-only --pretty=format: -- guide/ | grep -c "guide/.*\.html"
```
(guide/index.html 제외) **이미 2편이면 여기서 중단하고 운영자에게 보고한다.** "내일 올릴까요?"라고 묻는다. 운영자가 명시적으로 한도 초과를 지시해도 리듬 규칙을 상기시킨 뒤 재확인받는다.

## 2단계: 원고 파싱

- 첫 줄 `# 제목` → `<title>`(뒤에 " — taxtool.kr" 붙임), `og:title`, JSON-LD headline, `<h1>`에 사용
- `메타 설명(검색용):` 줄 → `<meta name="description">`과 JSON-LD description에**만** 사용. **본문에 절대 노출 금지**
- `---` 구분선 아래가 본문
- 슬러그: 파일명 `article-NN-슬러그.md`의 슬러그 부분 (영문 소문자)

## 3단계: HTML 페이지 생성 → `guide/<슬러그>.html`

**가장 최근에 게시된 글 페이지(예: guide/jongsose.html)를 열어 그 구조·CSS를 그대로 복사**하고 내용만 교체한다. 스타일을 새로 짓지 않는다. 구성 요소:

- head: title, meta description, og:title/og:description(**80~125자**. 메타 설명이 그 범위면 그대로, 길면 핵심만 축약 — 스레드·카톡 공유 카드에 그대로 노출됨)/og:type=article, Google Fonts 링크, JSON-LD Article (mainEntityOfPage는 `https://taxtool.kr/guide/<슬러그>.html`)
- head 끝(`</head>` 직전): AdSense 스크립트 + **Google Analytics 4 스니펫(측정 ID G-P4F2M5B9DS)** — 최근 글 페이지의 것을 그대로 복사. 둘 중 하나라도 빠지면 안 됨
- head 공유·검색 태그(8/22~ 필수): `og:url`(페이지 절대 URL) · `og:image`=`https://taxtool.kr/og.png` + width 1200/height 630 · `og:site_name` · `twitter:card=summary_large_image` · `<link rel="canonical">` — 최근 글 페이지에서 복사하고 URL만 교체. 그리고 `</head>` 직전에 **BreadcrumbList JSON-LD**(홈 › 가이드 › 짧은 주제명, item은 절대 URL). `html{}`에 `-webkit-text-size-adjust:100%` 유지
- **날짜(GEO·최신성 신호)**: Article JSON-LD에 `datePublished`(게시일)와 `dateModified`를 **둘 다** 넣는다. 신규 글은 두 값이 같다. 헤더 `.meta` 바로 아래에 `<p class="pubdate">YYYY년 M월 D일 게시</p>` 표시. **기존 글의 세율·법령·수치를 고치면 `dateModified`와 화면 문구를 그날 날짜로 갱신**하고 문구는 `~ 게시 · YYYY년 M월 D일 수정`으로 바꾼다. 오탈자·디자인 수정만 한 경우에는 갱신하지 않는다
- 본문: crumb(홈/가이드/짧은 주제명) → eyebrow(주제 태그) → h1 → .meta 한 줄 소개 → article
- article 내부: 첫 문단은 `.lead`, `##` → `<h2>`, `**굵게**` → `<b>`, 목록 → `<ul>/<ol>`, 상대 링크는 그대로 `<a href>`
- **이미지(2026-09-02~, 글마다 2장)**: 원고의 `![alt](/img/파일.webp)` 줄은 그 자리에 `<figure class="fig"><img src="/img/파일.webp" width="1200" height="686" alt="…" loading="lazy" decoding="async"></figure>`로 변환한다. 규칙:
  - **alt 필수** — 원고의 대괄호 문구 그대로(장면을 한 문장으로). 빈 alt·"이미지"·파일명 금지
  - **width/height 속성 필수**(레이아웃 밀림 방지). 값은 `node tools/imgopt.js`가 출력한 것을 쓴다
  - **첫 번째 이미지(히어로)는 `loading="lazy"` 빼고 `fetchpriority="high"`**, 나머지는 lazy. 히어로는 `.lead` 문단 바로 아래, 두 번째는 핵심 소제목 `<h2>` 바로 위
  - **파일은 300KB 이하 webp, 폭 1200px**, 위치 `tax-calc/img/슬러그-용도.webp`(예: myeongsese-hero, myeongsese-deduct). 생성 원본 PNG는 `Documents/원고대기/사진/`에 보관(git 제외)
  - CSS는 최근 글에서 `.fig` 블록을 복사: `article .fig{margin:22px 0}` `article .fig img{display:block;width:100%;height:auto;border-radius:12px}` (`article .lead{…}` 줄 바로 아래)
  - **taxtool 그림체 — 9/5 변경: 앞으로 발행하는 글은 눈치와 동일한 실사 사진**(`Documents/기록/이미지생성_진행상황.md` "★ 실사 이미지 규칙" 전부 적용 — 글의 순간·승인 두 번·검수 3단계+실사 항목, 아래 "프롬프트 규칙" 줄의 일러스트 항목은 실사에 맞게 대체). 기존 10편의 선화 일러스트는 그대로 두고 바꾸지 않는다. 옛 선화 스타일 문장(참고용)은 `Documents/tools/imgplan-taxtool-2026-09-02.json`의 `style` 값을 그대로 쓴다(진회색 윤곽선·단색 면·회청색 배경·초록/주황 포인트·서류 글자는 흐린 줄 무늬). 마이펫랩의 고양이 파스텔풍과 섞지 않는다
  - 생성·압축·삽입은 계획 JSON(`"site": "tax-calc"`) 한 벌로: `Documents`에서 `node tools/imgbatch.js <계획.json>` → 검수 → `node tools/imginsert.js <계획.json>`(이미 게시된 글) 또는 원고 md에 `![alt](/img/…)` 줄 추가(새 글). 축소 시트는 `node tools/imgsheet.js <계획.json>`
  - **프롬프트는 `Documents/기록/이미지생성_진행상황.md`의 "★ 프롬프트 규칙"을 따른다** — 사람은 상반신 이상 보이게(손만 금지) / 이목구비 단순·성별·나이 특정 없음 / 서명·글자·숫자 없음(명세서·지폐도 숫자 없이) / 물건 목록 명시 후 "그 외 물건 없음" / 소품 3개 이하. 생성 후 검수 3단계(시트·구석 확대·체크리스트) 통과 전 게시 금지
- `## 정리` 섹션 → `.summary-box`로 변환
- 마지막 계산기 안내 문장 → `.cta` 박스 (링크 하나만)
- 기울임 면책 문구 → `.footnote`
- 푸터(가이드·사이트 소개·개인정보처리방침 링크) 포함

**본문 내용, 특히 세금 수치·법령·기한은 원고에서 한 글자도 바꾸지 않는다.** 문구 개선이 필요해 보여도 게시 전에 운영자에게 물어본다.

## 4단계: 목록 반영 (tools/posts.json 한 곳만 고친다)

1. **tools/posts.json**의 `posts` 배열 **맨 앞**에 새 글 항목을 추가한다:
   `{ "slug", "date"(게시일), "tag"(반드시 파일 위쪽 "tags" 목록 안의 값), "title"(목록용 전체 제목), "short"(홈·관련글용 짧은 제목, 30자 안팎), "summary"(목록 카드 설명 2줄) }`
   문맥상 꼭 이어 읽히면 좋은 글이 있으면 `"related": ["슬러그", ...]`로 직접 지정한다. 생략하면 같은 태그 우선 → 최신순으로 자동 선정된다.
2. `node tools/buildlist.js` 실행 → **가이드 목록·태그 칩·전체 편수·홈 최신 5편·모든 글의 "이어서 읽으면 좋은 글"이 한 번에 갱신**된다. 오류가 나면(파일 없음, 슬러그 중복 등) 메시지대로 고친 뒤 다시 실행한다.
3. **sitemap.xml**: `</urlset>` 앞에 새 url 블록 추가 (`<lastmod>`=게시일 YYYY-MM-DD). **글의 `dateModified`를 갱신하면 sitemap의 `<lastmod>`도 같은 날짜로 함께 갱신**한다(불일치 금지).

※ guide/index.html·index.html·각 글의 `<!-- AUTO:... -->` 구간은 **손으로 고치지 않는다.** 전부 buildlist.js가 생성한다.

## 5단계: 배포 전 검사

- `node tools/readcheck.js guide/<슬러그>.html` 실행 → 긴 문장(70자+)·1,000자 넘는 문단·같은 어미 4연속·금지 표현 경고를 확인한다. 경고는 **고칠지 운영자에게 보고**하고 자동 수정하지 않는다(수치·법령 임의 수정 금지). 경고 0건이 목표지만 사실 단정("절대 불가" 등 사실인 경우)은 유지 가능
- 새 페이지와 수정된 파일의 내부 링크(`href="/..."`)가 모두 실제 파일로 연결되는지 전수 확인. 깨진 링크가 있으면 **배포 중단**하고 수정
- 메타 설명 문구가 본문에 노출되지 않았는지 확인
- 이미지가 있는 글: `img/` 파일 존재·300KB 이하·alt 비어 있지 않음·width/height 있음 확인. 배포 후 **375px 폭(모바일)으로 열어 이미지가 본문 폭을 넘지 않고 글자와 겹치지 않는지** 스크린샷으로 확인

## 6단계: 커밋·푸시

- 한글 커밋 메시지 (예: `가이드 5편 게시: 기한 후 신고와 경정청구 (목록·sitemap·홈 카드 반영)`)
- **푸시까지 완료해야 실제 반영** — 커밋만 하고 끝내지 않는다
- **IndexNow 알림(9/5~)**: 푸시 후 실사이트에서 새 글 URL이 **200을 돌려주는 것을 확인한 뒤** `node tools/indexnow.js https://taxtool.kr/guide/<슬러그>.html` 실행. 응답 200/202면 네이버·빙 접수. 403은 키 불일치, 422는 키 파일 위치·호스트 문제. 결과 코드를 보고에 남긴다. dateModified를 올린 수정 글도 같은 방법으로 다시 보낸다. 구글은 API가 없어 별도(서치콘솔 색인 요청)

## 7단계: 마무리

1. 원고 파일을 `원고대기` → `원고완료`로 이동
2. `C:\Users\사라띠\Documents\CLAUDE.md`의 "게시된 글" 목록에 추가하고 "지금 단계" 갱신
3. 운영자에게 보고: 게시된 URL (`https://taxtool.kr/guide/<슬러그>.html`), GitHub Pages 반영 1~2분 소요 안내. **구글 색인 요청은 클로드가 한다(9/5 운영자 결정)**: 클로드 인 크롬으로 서치콘솔(운영자가 로그인 유지) → 해당 속성 → 상단 URL 검사창에 새 글 주소 → "색인 생성 요청" 클릭 → 완료 문구 확인 후 보고. 로그인·비밀번호 입력은 하지 않고, 로그아웃 상태면 운영자에게 로그인만 요청. 한도는 속성당 하루 10건 안팎
