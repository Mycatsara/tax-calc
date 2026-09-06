// 전 HTML 뼈대·마커·내부 링크·sitemap 대조. 실행: node tools/test/shell.test.js
const fs = require('fs'); const path = require('path'); const assert = require('assert');
const ROOT = path.join(__dirname, '..', '..');
const html = (d) => fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith('.html')).map((f) => path.join(d, f));
const cats = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/posts.json'), 'utf8')).cats;
const PAGES = [...html('.'), ...html('guide'), ...html('pay'), ...html('33'), ...cats.flatMap((c) => html(`guide/${c.slug}`))];
let n = 0; const ok = (m) => { n++; console.log('  ✓', m); };

for (const c of cats) assert(fs.existsSync(path.join(ROOT, 'guide', c.slug, 'index.html')), `카테고리 페이지 없음 ${c.slug}`);
for (const f of PAGES) {
  const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  assert(s.includes('<!-- AUTO:NAV:START -->'), `${f}: NAV 마커 없음`);
  assert(s.includes('<link rel="stylesheet" href="/site.css?v='), `${f}: site.css 링크 없음`);
  assert(/<link rel="stylesheet" href="\/site\.css\?v=[^"]+">[\s\S]*<style>/.test(s), `${f}: site.css가 인라인 style보다 앞에 있어야 함`);
  assert(s.includes('<header class="site-head">'), `${f}: site-head 없음`);
  assert(s.includes('<!-- AUTO:CALCS:START -->') && s.includes('<!-- AUTO:SIDE:START -->'), `${f}: CALCS/SIDE 마커 없음`);
  assert(s.includes('<aside class="side">') && s.includes('<main class="main">'), `${f}: layout 없음`);
  assert(!/^\s*:root\{/m.test(s), `${f}: 인라인 :root 남아 있음 (site.css로 이동해야 함)`);
  assert(s.includes('link_area'), `${f}: GA internal_link에 link_area 없음`);
  assert(s.includes('G-P4F2M5B9DS') && s.includes('ga=off'), `${f}: GA 스니펫 훼손`);
  for (const m of s.matchAll(/(?:href|src)="(\/[^"#?]+)/g)) {
    let p = m[1]; if (p.endsWith('/')) p += 'index.html';
    assert(fs.existsSync(path.join(ROOT, p)), `${f}: 내부 링크 깨짐 ${m[1]}`);
  }
}
ok(`페이지 ${PAGES.length}개 뼈대·마커·내부 링크`);

const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
const urls = [...sm.matchAll(/<loc>https:\/\/taxtool\.kr(\/[^<]*)<\/loc>/g)].map((m) => m[1]);
assert(urls.includes('/33/'), 'sitemap에 /33/ 없음');
for (const c of cats) assert(urls.includes(`/guide/${c.slug}/`), `sitemap에 /guide/${c.slug}/ 없음`);
for (const u of urls) { const p = u.endsWith('/') ? u + 'index.html' : u; assert(fs.existsSync(path.join(ROOT, p)), `sitemap URL 파일 없음 ${u}`); }
ok(`sitemap ${urls.length}개 URL ↔ 파일`);

const home = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const c33 = fs.readFileSync(path.join(ROOT, '33', 'index.html'), 'utf8');
assert(!home.includes('"FAQPage"') && c33.includes('"FAQPage"'), 'FAQPage 스키마는 /33/에만');
assert(c33.includes('<link rel="canonical" href="https://taxtool.kr/33/">'), '/33/ canonical');
assert(home.includes('<link rel="canonical" href="https://taxtool.kr/">'), '홈 canonical');
assert(home.includes('post-card thumb'), '홈에 썸네일 카드 없음');
ok('홈·/33/ 메타');
console.log(`shell.test: ${n}건 통과`);
