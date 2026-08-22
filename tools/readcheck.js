// 가독성 검사 (경고만 출력, 자동 수정 없음)
// 사용: node tools/readcheck.js <원고.md 또는 guide/xxx.html>
// 기준: 글쓰기규칙.md + 가독성 원칙(문장 짧게, 문단 500~1000자, 같은 어미 연속 금지, AI투 금지)
const fs = require('fs');
const file = process.argv[2];
if (!file) { console.log('사용: node tools/readcheck.js <파일>'); process.exit(1); }
let raw = fs.readFileSync(file, 'utf8');

// HTML이면 본문(article 또는 main)만 추출 후 태그 제거
if (/\.html?$/i.test(file)) {
  const m = raw.match(/<article[\s\S]*?<\/article>/i) || raw.match(/<main[\s\S]*?<\/main>/i);
  raw = (m ? m[0] : raw)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<(br|\/p|\/li|\/h[1-6]|\/div|\/tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
} else {
  // md: 제목·메타·구분선·표·코드 제외
  raw = raw.split('\n').filter(l => !/^(#|메타 설명|---|\||```)/.test(l.trim())).join('\n');
}

const paras = raw.split(/\n\s*\n|\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length > 0);
const warn = [];
const LONG_SENT = 70;   // 모바일 3줄 이상 (규칙: 두 줄 넘기지 않기, 약간 여유)
const LONG_PARA = 1000; // 문단 상한
const SHORT_PARA_SKIP = 30; // 소제목·캡션 등은 제외

let allSents = [];
paras.forEach((p, i) => {
  if (p.length > LONG_PARA) warn.push(`[문단 ${i + 1}] ${p.length}자 — 1,000자 초과. 나누기 권장: "${p.slice(0, 30)}…"`);
  const sents = p.split(/(?<=[.!?。])\s+/).map(s => s.trim()).filter(Boolean);
  sents.forEach(s => {
    if (s.length > LONG_SENT) warn.push(`[긴 문장 ${s.length}자] ${s.slice(0, 60)}…`);
    allSents.push(s);
  });
});

// 같은 어미 연속 (마지막 3글자 기준, 구두점 제거) 4회 이상
let run = 1;
for (let i = 1; i < allSents.length; i++) {
  const tail = s => s.replace(/[.!?。"”’)\]]+$/, '').slice(-3);
  if (tail(allSents[i]) === tail(allSents[i - 1])) { run++; if (run === 4) warn.push(`[어미 반복] "…${tail(allSents[i])}" 4문장 연속: ${allSents[i].slice(0, 40)}…`); }
  else run = 1;
}

// 금지 표현 (글쓰기규칙)
const banned = ['여러분', '알아보겠습니다', '하는 것이 중요합니다', '결론적으로', '에 대해 알아보', '무조건', '100%', '절대', '지금 아니면', '한정'];
banned.forEach(b => {
  const n = (raw.match(new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  if (n) warn.push(`[표현 점검] "${b}" ${n}회 — 규칙상 금지/주의 표현. 사실 단정이면 유지, 아니면 수정`);
});

const total = raw.replace(/\s/g, '').length;
console.log(`파일: ${file}\n공백 제외 ${total}자 · 문단 ${paras.filter(p => p.length > SHORT_PARA_SKIP).length}개 · 문장 ${allSents.length}개 · 평균 문장 ${Math.round(allSents.reduce((a, s) => a + s.length, 0) / Math.max(1, allSents.length))}자`);
if (!warn.length) console.log('경고 없음'); else { console.log(`경고 ${warn.length}건:`); warn.forEach(w => console.log(' - ' + w)); }
