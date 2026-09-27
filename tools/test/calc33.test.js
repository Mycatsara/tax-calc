// node tools/test/calc33.test.js — 3.3% 계산기(/33/) 계산 대조 (2026-09-28 추가)
// 페이지(33/index.html) 안의 실제 계산 코드를 꺼내 실행하고, 법정 방식의 정수 계산과 비교한다.
// 기준: 사업소득 원천징수 소득세 3% + 지방소득세(소득세의 10%), 각각 10원 미만 절사.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(ROOT, '33', 'index.html'), 'utf8');

const floorLine = (html.match(/const floor10 = [^\n]+/) || [])[0];
const start = html.indexOf('let gross, tax, local, net;');
const end = html.indexOf("document.getElementById('rGross')");
if (!floorLine || start < 0 || end < 0) { console.log('FAIL 페이지에서 계산 코드를 찾지 못함'); process.exit(1); }
const calc = new Function('mode', 'v', `${floorLine}\n${html.slice(start, end)}\nreturn { gross, tax, local, net };`);

let pass = 0, fail = 0;
const eq = (name, got, exp) => { if (got === exp) pass++; else { fail++; console.log('FAIL', name, 'got', got, 'expected', exp); } };

// 1) 손으로 확인한 예시 (wonchon 글: 100만 원 지급이면 실지급 967,000원)
let r = calc('gross', 1000000);
eq('100만 소득세', r.tax, 30000); eq('100만 지방세', r.local, 3000); eq('100만 실수령', r.net, 967000);
r = calc('gross', 3000000);
eq('300만 소득세', r.tax, 90000); eq('300만 지방세', r.local, 9000); eq('300만 실수령', r.net, 2901000);
r = calc('gross', 1234567);
eq('1,234,567 소득세', r.tax, 37030); eq('1,234,567 지방세', r.local, 3700); eq('1,234,567 실수령', r.net, 1193837);

// 2) 세전 입력: 0원~500만 원 1원 단위 전수 — 법정 정수 계산과 일치해야 한다
const lawTax = (g) => Math.floor(Math.floor((g * 3) / 100) / 10) * 10;
const lawLocal = (t) => Math.floor(Math.floor(t / 10) / 10) * 10;
let sweepFail = 0, firstBad = null;
for (let g = 0; g <= 5000000; g++) {
  const x = calc('gross', g), t = lawTax(g), l = lawLocal(t);
  if (x.tax !== t || x.local !== l || x.net !== g - t - l) { sweepFail++; if (!firstBad) firstBad = { g, page: x, law: { tax: t, local: l } }; }
}
eq('세전 0~500만 전수 불일치 건수', sweepFail, 0);
if (firstBad) console.log('  첫 불일치:', JSON.stringify(firstBad));

// 3) 실수령 입력(역산): 보여 주는 세전·세금·실수령이 서로 맞아야 한다
let revFail = 0, revFirst = null;
for (let n = 0; n <= 5000000; n += 1) {
  const x = calc('net', n), t = lawTax(x.gross), l = lawLocal(t);
  if (x.gross - x.tax - x.local !== n || x.tax !== t || x.local !== l) { revFail++; if (!revFirst) revFirst = { net: n, page: x, lawFromGross: { tax: t, local: l } }; }
}
eq('실수령 역산 앞뒤 불일치 건수(0~500만 전수)', revFail, 0);
if (revFirst) console.log('  첫 불일치:', JSON.stringify(revFirst));

// 4) 역산은 맞는 답 중 v÷0.967에 가장 가까운 것 — 단순 반올림 값이 맞는 답이면 그 값 그대로(예전 결과 유지)
eq('실수령 967,000 → 세전', calc('net', 967000).gross, 1000000);
eq('실수령 100,246 → 세전', calc('net', 100246).gross, 103656);
let keepFail = 0;
for (let n = 0; n <= 5000000; n += 7) {
  const g0 = Math.round(n / 0.967);
  if (g0 - lawTax(g0) - lawLocal(lawTax(g0)) === n && calc('net', n).gross !== g0) keepFail++;
}
eq('반올림 값이 맞는 답일 때 결과 유지(0~500만, 7원 간격)', keepFail, 0);

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
process.exit(fail ? 1 : 0);
