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

## 6단계: 커밋·푸시

- 한글 커밋 메시지 (예: `가이드 5편 게시: 기한 후 신고와 경정청구 (목록·sitemap·홈 카드 반영)`)
- **푸시까지 완료해야 실제 반영** — 커밋만 하고 끝내지 않는다

## 7단계: 마무리

1. 원고 파일을 `원고대기` → `원고완료`로 이동
2. `C:\Users\사라띠\Documents\CLAUDE.md`의 "게시된 글" 목록에 추가하고 "지금 단계" 갱신
3. 운영자에게 보고: 게시된 URL (`https://taxtool.kr/guide/<슬러그>.html`), GitHub Pages 반영 1~2분 소요 안내, **서치콘솔에서 해당 URL 색인 요청** 리마인드
