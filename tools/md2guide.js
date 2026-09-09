// 원고 md → guide/<slug>.html 변환 (publish 스킬 2~3단계의 기계 부분). 2026-09-07
// 사용: node tools/md2guide.js <원고.md> --slug jangryeo --date 2026-09-07 --short 근로장려금 --meta "한 줄 소개"
// 뼈대는 가장 최근 글(guide/<template>.html, 기본 myeongsese)의 head·body를 그대로 복사하고 내용만 바꾼다.
// AUTO 구간(NAV·CALCS·SIDE·NEXT)은 비워 두거나 그대로 두면 buildlist.js가 채운다.
// 표: 마지막 열이 숫자(원·일·시간·%)면 .tbl(오른쪽 정렬), 아니면 .tbl.txt(왼쪽 정렬) — 글 고유 CSS 한 줄 추가.
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const mdFile = args[0];
const opt = (k, d) => { const i = args.indexOf("--" + k); return i > -1 ? args[i + 1] : d; };
const slug = opt("slug"); const date = opt("date"); const short = opt("short"); const metaLine = opt("meta");
const tpl = opt("template", "myeongsese");
if (!mdFile || !slug || !date || !short || !metaLine) { console.error("사용: node tools/md2guide.js <md> --slug s --date YYYY-MM-DD --short 짧은주제 --meta \"한 줄 소개\""); process.exit(1); }

const ROOT = path.join(__dirname, "..");
const md = fs.readFileSync(mdFile, "utf8").replace(/\r\n/g, "\n");
const html0 = fs.readFileSync(path.join(ROOT, "guide", tpl + ".html"), "utf8").replace(/\r\n/g, "\n");

// ── 원고 파싱 ──
const lines = md.split("\n");
const title = lines[0].replace(/^#\s*/, "").trim();
const metaDesc = (lines.find((l) => l.startsWith("메타 설명(검색용):")) || "").replace("메타 설명(검색용):", "").trim();
const sep = lines.indexOf("---");
const body = lines.slice(sep + 1);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => esc(s)
  .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
  .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

const isNumCol = (cells) => cells.every((c) => /^[\d,.\s]*(원|일|시간|%|만|억)?[^가-힣]*$/.test(c.replace(/\*\*/g, "").replace(/\(.*?\)/g, "").trim()) || /^\d/.test(c.trim()));

let out = [];
let figN = 0;
let i = 0;
let summaryMode = false;
const blocks = []; // {type, ...}
while (i < body.length) {
  const l = body[i];
  if (!l.trim()) { i++; continue; }
  if (l.startsWith("## ")) { blocks.push({ type: "h2", text: l.slice(3).trim() }); i++; continue; }
  const fig = l.match(/^!\[(.*?)\]\((.*?)\)\s*$/);
  if (fig) { blocks.push({ type: "fig", alt: fig[1], src: fig[2] }); i++; continue; }
  if (l.startsWith("|")) {
    const rows = [];
    while (i < body.length && body[i].startsWith("|")) { rows.push(body[i]); i++; }
    const cells = rows.filter((r) => !/^\|\s*-+/.test(r)).map((r) => r.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
    blocks.push({ type: "table", head: cells[0], rows: cells.slice(1) });
    continue;
  }
  if (/^[-*] /.test(l)) {
    const items = [];
    while (i < body.length && /^[-*] /.test(body[i])) { items.push(body[i].replace(/^[-*] /, "")); i++; }
    blocks.push({ type: "ul", items }); continue;
  }
  if (/^\d+\. /.test(l)) {
    const items = [];
    while (i < body.length && /^\d+\. /.test(body[i])) { items.push(body[i].replace(/^\d+\. /, "")); i++; }
    blocks.push({ type: "ol", items }); continue;
  }
  if (l.startsWith("---")) { i++; continue; }
  if (/^\*[^*].*\*\s*$/.test(l)) { blocks.push({ type: "footnote", text: l.replace(/^\*|\*\s*$/g, "") }); i++; continue; }
  blocks.push({ type: "p", text: l.trim() }); i++;
}

// 정리 → summary-box, 그 뒤 첫 문단(링크 포함) → cta
const idxSummary = blocks.findIndex((b) => b.type === "h2" && b.text === "정리");
let ctaHtml = "", footHtml = "", summaryHtml = "";
let mainBlocks = blocks;
if (idxSummary > -1) {
  const after = blocks.slice(idxSummary + 1);
  const list = after.find((b) => b.type === "ul");
  summaryHtml = `    <div class="summary-box">\n      <h2>정리</h2>\n      <ul>\n${list.items.map((t) => `        <li>${inline(t)}</li>`).join("\n")}\n      </ul>\n    </div>`;
  const cta = after.find((b) => b.type === "p" && /\]\(/.test(b.text));
  if (cta) {
    const m = cta.text.match(/\[([^\]]+)\]\(([^)]+)\)/);
    const text = cta.text.replace(/\[([^\]]+)\]\(([^)]+)\)/, "$1").replace(/\.$/, "");
    ctaHtml = `    <div class="cta">\n      <a href="${m[2]}">${esc(text)} →</a>\n    </div>`;
  }
  const fn = after.find((b) => b.type === "footnote");
  if (fn) footHtml = `    <p class="footnote">${esc(fn.text)}</p>`;
  mainBlocks = blocks.slice(0, idxSummary);
}

let hasTxtTable = false; let hasWideTable = false;
const render = (b, idx) => {
  switch (b.type) {
    case "h2": return `\n    <h2>${inline(b.text)}</h2>`;
    case "p": return idx === 0 ? `    <p class="lead">${inline(b.text)}</p>` : `    <p>${inline(b.text)}</p>`;
    case "fig": { figN++; const pr = figN === 1 ? ' fetchpriority="high"' : ' loading="lazy"'; return `    <figure class="fig"><img src="${b.src}" width="1200" height="686" alt="${esc(b.alt)}"${pr} decoding="async"></figure>`; }
    case "ul": return `    <ul>\n${b.items.map((t) => `      <li>${inline(t)}</li>`).join("\n")}\n    </ul>`;
    case "ol": return `    <ol>\n${b.items.map((t) => `      <li>${inline(t)}</li>`).join("\n")}\n    </ol>`;
    case "table": {
      const lastNum = isNumCol(b.rows.map((r) => r[r.length - 1]));
      if (!lastNum) hasTxtTable = true;
      const cls = lastNum ? "tbl" : "tbl txt";
      const th = b.head.map((c) => `<th>${inline(c)}</th>`).join("");
      const trs = b.rows.map((r) => `        <tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("\n");
      const tbl = `    <table class="${cls}">\n      <thead>\n        <tr>${th}</tr>\n      </thead>\n      <tbody>\n${trs}\n      </tbody>\n    </table>`;
      // 열 5개 이상은 모바일 375px에 못 들어가므로 가로 스크롤 상자로 감싼다(9/9 실업급여 6열 표에서 본문 카드 밖으로 삐져나옴)
      if (b.head.length >= 5) { hasWideTable = true; return `    <div class="tbl-wrap">\n${tbl}\n    </div>`; }
      return tbl;
    }
    default: return "";
  }
};
const articleInner = mainBlocks.map(render).join("\n");

// ── 템플릿 치환 ──
const ogDesc = (() => { if (metaDesc.length <= 125) return metaDesc; const cut = metaDesc.slice(0, 125); const j = cut.lastIndexOf("."); return (j >= 80 ? cut.slice(0, j + 1) : cut.slice(0, 120) + "…"); })();
const [y, mo, d] = date.split("-").map(Number);
const pubdate = `${y}년 ${mo}월 ${d}일 게시`;
const url = `https://taxtool.kr/guide/${slug}.html`;

let html = html0;
const tplTitle = html0.match(/<title>(.*?) — taxtool\.kr<\/title>/)[1];
const tplUrl = html0.match(/<link rel="canonical" href="(.*?)">/)[1];
const tplDesc = html0.match(/<meta name="description" content="(.*?)">/)[1];
const tplOg = html0.match(/<meta property="og:description" content="(.*?)">/)[1];
const tplDate = html0.match(/"datePublished": "(.*?)"/)[1];
const tplPub = html0.match(/<p class="pubdate">(.*?)<\/p>/)[1];
const tplShort = html0.match(/"position":3,"name":"(.*?)"/)[1];
const tplMeta = html0.match(/<p class="meta">(.*?)<\/p>/)[1];
html = html.split(tplTitle).join(esc(title));
html = html.split(tplUrl).join(url);
html = html.split(tplDesc).join(esc(metaDesc));
html = html.split(tplOg).join(esc(ogDesc));
html = html.replace(/"datePublished": ".*?"/, `"datePublished": "${date}"`).replace(/"dateModified": ".*?"/, `"dateModified": "${date}"`);
html = html.split(tplPub).join(pubdate);
// short(짧은 주제)는 빵부스러기 두 곳에만 넣는다 — 전체 치환은 본문까지 바꾼다(9/8 "대상 대상" 사고)
html = html.replace(`"position":3,"name":"${tplShort}"`, `"position":3,"name":"${esc(short)}"`);
html = html.replace(/(<p class="crumb">.*\/ )([^<]*?)(<\/p>)/,(m, a, mid, z) => mid === tplShort ? a + esc(short) + z : m);
html = html.split(tplMeta).join(esc(metaLine));
html = html.replace(/<span class="eyebrow">.*?<\/span>/, `<span class="eyebrow">${short}</span>`);
if (tplDate !== date) { /* no-op: dates replaced above */ }
// article 본문 교체
const aStart = html.indexOf("  <article>") + "  <article>\n".length;
const nextStart = html.indexOf("    <!-- AUTO:NEXT:START -->");
const nextEnd = html.indexOf("<!-- AUTO:NEXT:END -->") + "<!-- AUTO:NEXT:END -->".length;
const aEnd = html.indexOf("  </article>");
const nextBlock = html.slice(nextStart, nextEnd);
const newArticle = `${articleInner}\n\n${summaryHtml}\n\n${nextBlock}\n\n${ctaHtml}\n\n${footHtml}\n`;
html = html.slice(0, aStart) + newArticle + html.slice(aEnd);
// 표 왼쪽 정렬 CSS(필요할 때만)
if (hasTxtTable && !html.includes(".tbl.txt")) html = html.replace("  .summary-box{", "  .tbl.txt th:last-child,.tbl.txt td:last-child{text-align:left;font-family:inherit;font-weight:400;white-space:normal}\n  .summary-box{");
// 표 열 수가 3 이상이면 글자 크기 살짝 축소(모바일 375px 대비)
if (blocks.some((b) => b.type === "table" && b.head.length >= 4) && !html.includes(".tbl.wide")) html = html.replace("  .summary-box{", "  .tbl th,.tbl td{padding:8px 3px;font-size:13px}\n  .summary-box{");
// 열 5개 이상 표: 가로 스크롤 상자 CSS(표 자체는 자연 폭, 넘치면 상자 안에서만 스크롤)
if (hasWideTable && !html.includes(".tbl-wrap{")) html = html.replace("  .summary-box{", "  .tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:8px 0 14px}\n  .tbl-wrap .tbl{margin:0;white-space:nowrap}\n  .summary-box{");

const outFile = path.join(ROOT, "guide", slug + ".html");
fs.writeFileSync(outFile, html);
console.log(`저장: ${outFile} (${html.length}자) · 이미지 ${figN}장 · 표 ${blocks.filter((b) => b.type === "table").length}개 · og:description ${ogDesc.length}자`);
if (!ctaHtml) console.warn("(주의) CTA 문단을 찾지 못함");
if (!footHtml) console.warn("(주의) 면책 문구를 찾지 못함");
if (html.includes(metaDesc.slice(0, 30)) && html.split(metaDesc.slice(0, 30)).length > 4) console.warn("(주의) 메타 설명이 본문에 노출됐는지 확인");
