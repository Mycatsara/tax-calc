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

- head: title, meta description, og:title/og:description(메타 설명 축약)/og:type=article, Google Fonts 링크, JSON-LD Article (mainEntityOfPage는 `https://taxtool.kr/guide/<슬러그>.html`)
- head 끝(`</head>` 직전): AdSense 스크립트 + **Google Analytics 4 스니펫(측정 ID G-P4F2M5B9DS)** — 최근 글 페이지의 것을 그대로 복사. 둘 중 하나라도 빠지면 안 됨
- 본문: crumb(홈/가이드/짧은 주제명) → eyebrow(주제 태그) → h1 → .meta 한 줄 소개 → article
- article 내부: 첫 문단은 `.lead`, `##` → `<h2>`, `**굵게**` → `<b>`, 목록 → `<ul>/<ol>`, 상대 링크는 그대로 `<a href>`
- `## 정리` 섹션 → `.summary-box`로 변환
- 마지막 계산기 안내 문장 → `.cta` 박스 (링크 하나만)
- 기울임 면책 문구 → `.footnote`
- 푸터(가이드·사이트 소개·개인정보처리방침 링크) 포함

**본문 내용, 특히 세금 수치·법령·기한은 원고에서 한 글자도 바꾸지 않는다.** 문구 개선이 필요해 보여도 게시 전에 운영자에게 물어본다.

## 4단계: 3종 반영 (하나라도 빠지면 안 됨)

1. **guide/index.html**: `.list` 맨 위에 새 `.post-card` 추가 (태그·제목·메타설명 기반 요약·"읽어보기 →")
2. **sitemap.xml**: `</urlset>` 앞에 새 url 블록 추가 (changefreq monthly, priority 0.6)
3. **index.html(홈)**: `.related` 안에 새 `.rel-card` 추가. 배치는 계산기 사용자 관심 순서를 고려해 판단. **카드가 6개를 넘으면 추가하기 전에 운영자에게 어떤 글을 홈에서 뺄지 확인**

## 5단계: 배포 전 검사

- 새 페이지와 수정된 파일의 내부 링크(`href="/..."`)가 모두 실제 파일로 연결되는지 전수 확인. 깨진 링크가 있으면 **배포 중단**하고 수정
- 메타 설명 문구가 본문에 노출되지 않았는지 확인

## 6단계: 커밋·푸시

- 한글 커밋 메시지 (예: `가이드 5편 게시: 기한 후 신고와 경정청구 (목록·sitemap·홈 카드 반영)`)
- **푸시까지 완료해야 실제 반영** — 커밋만 하고 끝내지 않는다

## 7단계: 마무리

1. 원고 파일을 `원고대기` → `원고완료`로 이동
2. `C:\Users\사라띠\Documents\CLAUDE.md`의 "게시된 글" 목록에 추가하고 "지금 단계" 갱신
3. 운영자에게 보고: 게시된 URL (`https://taxtool.kr/guide/<슬러그>.html`), GitHub Pages 반영 1~2분 소요 안내, **서치콘솔에서 해당 URL 색인 요청** 리마인드
