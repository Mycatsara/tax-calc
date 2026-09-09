// 글 목록 자동 생성 — tools/posts.json 하나만 고치면 아래가 한 번에 갱신된다.
//   1) guide/index.html : 카테고리 칩(링크) + 전체 편수 + 글 카드 목록(2열 격자)
//   2) index.html(홈)    : 썸네일 카드 목록 전체 (AUTO:HOME)
//   3) guide/<글>.html   : 글 하단 "이어서 읽으면 좋은 글" 3편 (CTA 앞)
//   4) guide/<cat>/index.html : 카테고리 페이지 3개 — tools/tpl-category.html에서 생성 (없으면 만들고, 있으면 AUTO 구간만 갱신)
//   5) 모든 페이지      : <!-- AUTO:NAV --> 상단 메뉴, <!-- AUTO:CALCS --> 모바일 계산기 줄, <!-- AUTO:SIDE --> 사이드바(계산기·검색·카테고리·최근 글)
// 사용: node tools/buildlist.js
// 규칙: 자동 생성 구간은 <!-- AUTO:XXX:START --> ~ <!-- AUTO:XXX:END --> 사이만 바뀐다. 그 밖은 손대지 않는다.
// 2026-09-06 블로그형 개편: 카테고리 3개(cats), 계산기(calcs), 사이드바·상단 메뉴 자동화

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const CFG = {
  cardArrowText: '읽어보기 →',
  cardMax: Number(process.env.CARDMAX) || 4, // 홈·목록·카테고리에서 사진 카드로 보일 글 수 (나머지는 제목 목록). posts.json의 cardMax가 있으면 그 값
  pageSize: 6,                      // 제목 목록 한 페이지 편수(9/6 운영자: 10은 눈에 안 들어와 6으로) — 넘으면 site.js가 1·2·3 번호를 만든다. posts.json의 pageSize가 있으면 그 값

  recentMax: 4,                     // 사이드바 최근 글 수
  nextMax: 3,                       // 글 하단 관련 글 수
  nextHeading: '이어서 읽으면 좋은 글',
  countText: (n) => `전체 ${n}편`,
  cssVersion: '20260906',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const num = (i) => String(i + 1).padStart(2, '0');
const dateKo = (d) => { const [y, m, dd] = d.split('-'); return `${y}.${m}.${dd}`; };

function read(f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); }
function write(f, s) { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), s, 'utf8'); }

function fill(file, name, inner) {
  const s = read(file);
  const re = new RegExp(`(<!-- AUTO:${name}:START -->)[\\s\\S]*?(<!-- AUTO:${name}:END -->)`);
  if (!re.test(s)) { throw new Error(`${file}: AUTO:${name} 마커가 없습니다`); }
  const next = s.replace(re, `$1\n${inner}\n$2`);
  if (next === s) return false;
  write(file, next);
  return true;
}
function fillIf(file, name, inner) { // 마커가 없으면 건너뜀
  return read(file).includes(`<!-- AUTO:${name}:START -->`) ? fill(file, name, inner) : false;
}

// ---------- 데이터 ----------
const data = JSON.parse(read('tools/posts.json'));
const posts = data.posts;
const calcs = data.calcs || [];
const cats = data.cats || [];
const catOf = (p) => cats.find((c) => c.slug === p.cat);
const countOf = (c) => posts.filter((p) => p.cat === c.slug).length;

// 검증: posts.json ↔ 실제 파일, cat 슬러그
const files = fs.readdirSync(path.join(ROOT, 'guide'))
  .filter((f) => f.endsWith('.html') && f !== 'index.html')
  .map((f) => f.replace('.html', ''));
const slugs = posts.map((p) => p.slug);
const missing = slugs.filter((s) => !files.includes(s));
const orphan = files.filter((f) => !slugs.includes(f));
if (missing.length) { console.error('오류: posts.json에 있으나 파일이 없음 →', missing.join(', ')); process.exit(1); }
if (orphan.length) { console.error('오류: 파일은 있으나 posts.json에 없음 →', orphan.join(', ')); process.exit(1); }
const dupe = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupe.length) { console.error('오류: posts.json 슬러그 중복 →', dupe.join(', ')); process.exit(1); }
const badCat = posts.filter((p) => !catOf(p));
if (badCat.length) { console.error('오류: cats에 없는 cat →', badCat.map((p) => `${p.slug}(${p.cat})`).join(', ')); process.exit(1); }

// 글의 첫 이미지(히어로) 경로 — 썸네일용. 없으면 null
function hero(slug) {
  const m = read(`guide/${slug}.html`).match(/<figure class="fig"><img src="([^"]+)"/);
  return m ? m[1] : null;
}
// 파일 경로 → 사이트 URL (현재 페이지 표시용)
function urlOf(file) { return '/' + file.replace(/\\/g, '/').replace(/index\.html$/, ''); }

// ---------- 조각 ----------
const listItem = (p, i) => `        <li><a href="/guide/${p.slug}.html"><span class="n">${num(i)}</span><span class="t">${esc(p.short || p.title)}</span><span class="g">→</span></a></li>`;

// 2열 격자 카드 (홈·가이드 전체·카테고리 페이지 공용)
const gridCard = (p) => {
  const img = hero(p.slug);
  const pic = img ? `        <img src="${img}" width="1200" height="686" alt="" loading="lazy" decoding="async">` : `        <span class="ph" aria-hidden="true"></span>`;
  return `      <a class="post-card thumb" href="/guide/${p.slug}.html" data-cat="${p.cat}" data-text="${esc((p.title + ' ' + p.summary + ' ' + catOf(p).name).replace(/\s+/g, ' '))}">
${pic}
        <span class="body"><span class="tag">${esc(catOf(p).name)}</span><span class="date">${dateKo(p.date)}</span>
        <h2>${esc(p.title)}</h2>
        <p>${esc(p.summary)}</p></span>
      </a>`;
};

// 목록 블록: 앞 N편은 사진 카드(2열), 나머지는 제목·날짜 목록 (9/6 운영자 결정)
// 번호 없음(9/6 운영자). 순서는 posts.json 순서 = 최신이 위, 오래된 글이 아래
const listItemDated = (p) => `        <li data-cat="${p.cat}" data-text="${esc((p.title + ' ' + p.summary + ' ' + catOf(p).name).replace(/\s+/g, ' '))}"><a href="/guide/${p.slug}.html"><span class="t">${esc(p.title)}</span><span class="d">${dateKo(p.date)}</span><span class="g">→</span></a></li>`;
function listBlock(list) {
  const n = data.cardMax || CFG.cardMax;
  const cards = list.slice(0, n).map(gridCard).join('\n');
  const rest = list.slice(n);
  const ol = rest.length ? `\n      <ol class="post-list archive" data-page-size="${data.pageSize || CFG.pageSize}">\n${rest.map(listItemDated).join('\n')}\n      </ol>` : '';
  return `      <div class="grid">\n${cards}\n      </div>${ol}`;
}

// 상단 메뉴: 홈 · 계산기 · 카테고리… · 소개 (운영자 결정 9/6)
function navHtml(cur) {
  const items = [['/', '홈'], ['/33/', '계산기'], ...cats.map((c) => [`/guide/${c.slug}/`, c.name]), ['/about.html', '소개']];
  return items.map(([h, t]) => `    <a href="${h}"${h === cur ? ' aria-current="page"' : ''}>${esc(t)}</a>`).join('\n');
}
function stripHtml(cur) {
  return calcs.map((c) => `    <a href="${c.path}"${c.path === cur ? ' aria-current="page"' : ''}><span class="lbl">${esc(c.label)}</span><span class="nm">${esc(c.name)}</span><span class="ds">${esc(c.desc)}</span></a>`).join('\n');
}
// 사이드바: 계산기 → 카테고리 → 검색 → 최근 글(썸네일)  (9/6 운영자 순서)
function sideHtml(cur) {
  const cs = calcs.map((c) => `      <a class="side-calc" href="${c.path}"${c.path === cur ? ' aria-current="page"' : ''}><span class="txt"><span class="nm">${esc(c.name)}</span><span class="ds">${esc(c.desc)}</span></span><span class="arr">→</span></a>`).join('\n');
  // 전체(N) — 맨 위, 전체 글 목록(/guide/)으로 (2026-09-09 운영자 요청, 4개 블로그 공통)
  const allCat = `      <a class="side-cat" href="/guide/"${cur === '/guide/' ? ' aria-current="page"' : ''}>전체 <span>(${posts.length})</span></a>`;
  const ct = [allCat, ...cats.map((c) => `      <a class="side-cat" href="/guide/${c.slug}/"${`/guide/${c.slug}/` === cur ? ' aria-current="page"' : ''}>${esc(c.name)} <span>(${countOf(c)})</span></a>`)].join('\n');
  const rs = posts.slice(0, CFG.recentMax).map((p) => {
    const img = hero(p.slug);
    const pic = img ? `<img src="${img}" width="84" height="48" alt="" loading="lazy" decoding="async">` : `<span class="ph" aria-hidden="true"></span>`;
    return `      <a class="side-post" href="/guide/${p.slug}.html">${pic}<span class="txt"><span class="t">${esc(p.short || p.title)}</span><span class="d">${dateKo(p.date)}</span></span></a>`;
  }).join('\n');
  return [
    `    <div class="side-box calcs">\n      <h2>계산기</h2>\n${cs}\n    </div>`,
    `    <div class="side-box">\n      <h2>카테고리</h2>\n${ct}\n    </div>`,
    `    <div class="side-box">\n      <h2>검색</h2>\n      <form class="side-search" action="/guide/" method="get" role="search"><input type="search" name="q" placeholder="찾는 말" aria-label="글 검색" autocomplete="off"><button type="submit">찾기</button></form>\n    </div>`,
    `    <div class="side-box">\n      <h2>최근 글</h2>\n${rs}\n    </div>`,
  ].join('\n');
}
// 카테고리 칩(링크): 전체 + 카테고리. 현재 페이지 .on
function chipsHtml(cur) {
  const all = [['/guide/', '전체'], ...cats.map((c) => [`/guide/${c.slug}/`, `${c.name} ${countOf(c)}`])];
  return all.map(([h, t]) => `        <a class="chip${h === cur ? ' on' : ''}" href="${h}">${esc(t)}</a>`).join('\n');
}

// 관련 글: 같은 카테고리 우선 → 나머지 최신순으로 채움
function related(p) {
  const byS = (s) => posts.find((x) => x.slug === s);
  const picked = (p.related || []).map(byS).filter((x) => x && x.slug !== p.slug);
  const others = posts.filter((x) => x.slug !== p.slug && !picked.includes(x));
  const same = others.filter((x) => x.cat === p.cat);
  const rest = others.filter((x) => x.cat !== p.cat);
  return [...picked, ...same, ...rest].slice(0, CFG.nextMax);
}

let changed = 0;

// ---------- 1) 가이드 전체 목록 ----------
if (fill('guide/index.html', 'CHIPS', chipsHtml('/guide/'))) changed++;
if (fill('guide/index.html', 'COUNT', `  <p class="count" id="count">${CFG.countText(posts.length)}</p>`)) changed++;
if (fill('guide/index.html', 'LIST', listBlock(posts))) changed++;

// ---------- 2) 홈 ----------
if (fill('index.html', 'HOME', listBlock(posts))) changed++;

// ---------- 3) 각 글의 관련 글 ----------
for (const p of posts) {
  const items = related(p).map(listItem).join('\n');
  const block = `    <div class="next-read">
      <h2>${CFG.nextHeading}</h2>
      <ol class="post-list">
${items}
      </ol>
    </div>`;
  if (fill(`guide/${p.slug}.html`, 'NEXT', block)) changed++;
}

// ---------- 4) 카테고리 페이지 ----------
const tpl = fs.existsSync(path.join(ROOT, 'tools/tpl-category.html')) ? read('tools/tpl-category.html') : null;
for (const c of cats) {
  const f = `guide/${c.slug}/index.html`;
  if (!fs.existsSync(path.join(ROOT, f))) {
    if (!tpl) throw new Error('tools/tpl-category.html 이 없어 카테고리 페이지를 만들 수 없습니다');
    const s = tpl.replace(/\{\{NAME\}\}/g, esc(c.name)).replace(/\{\{SLUG\}\}/g, c.slug).replace(/\{\{DESC\}\}/g, esc(c.desc)).replace(/\{\{COUNT\}\}/g, String(countOf(c)));
    write(f, s); changed++; console.log('카테고리 페이지 생성:', f);
  } else {
    // 편수는 헤더 문구에도 있으므로 갱신
    const s = read(f); const next = s.replace(/· 전체 \d+편<\/p>/, `· 전체 ${countOf(c)}편</p>`).replace(/가이드 \d+편\./g, `가이드 ${countOf(c)}편.`);
    if (next !== s) { write(f, next); changed++; }
  }
  if (fill(f, 'CHIPS', chipsHtml(`/guide/${c.slug}/`))) changed++;
  if (fill(f, 'LIST', listBlock(posts.filter((p) => p.cat === c.slug)))) changed++;
}

// ---------- 5) 모든 페이지: 상단 메뉴 + 계산기 줄 + 사이드바 ----------
const allPages = [];
for (const d of ['.', 'guide', 'pay', '33', ...cats.map((c) => `guide/${c.slug}`)]) {
  if (!fs.existsSync(path.join(ROOT, d))) continue;
  for (const f of fs.readdirSync(path.join(ROOT, d))) if (f.endsWith('.html')) allPages.push(d === '.' ? f : `${d}/${f}`);
}
for (const f of allPages) {
  const cur = urlOf(f);
  if (fillIf(f, 'NAV', navHtml(cur))) changed++;
  if (fillIf(f, 'CALCS', stripHtml(cur))) changed++;
  if (fillIf(f, 'SIDE', sideHtml(cur))) changed++;
}

console.log(`글 ${posts.length}편 · 카테고리 ${cats.length}개 · 계산기 ${calcs.length}개 · 페이지 ${allPages.length}개 · 갱신된 파일 ${changed}개`);
