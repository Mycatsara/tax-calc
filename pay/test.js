// node pay/test.js — 급여 계산기 로직 자동 검증 (기대값은 요율조사 보고서·별표2 원문에서 손으로 산출)
const C = require('./calc.js');
const T = require('./ganyi2026.js');
let pass = 0, fail = 0;
function eq(name, got, exp) {
  if (got === exp) { pass++; }
  else { fail++; console.log('FAIL', name, 'got', got, 'expected', exp); }
}
function row(k) { return T.rows.find(r => k >= r.min && k < r.max); }

// T1 보고서 예시: 300만 / 1인 / 비과세 0
let r = C.calc({ gross: 3000000, family: 1 });
eq('T1 nps', r.nps, 142500); eq('T1 hi', r.hi, 107850); eq('T1 ltc', r.ltc, 14170);
eq('T1 ei', r.ei, 27000); eq('T1 tax', r.tax, 74350); eq('T1 local', r.local, 7430);
eq('T1 total', r.total, 373300); eq('T1 net', r.net, 2626700);

// T2 표 경계
eq('T2 <770천', C.lookupTable(769999, 1), 0);
eq('T2 770천', C.lookupTable(770000, 1), 0);
eq('T2 1,500천', C.lookupTable(1500000, 1), 8920);
eq('T2 1,500천 2인', C.lookupTable(1500000, 2), 4420);
eq('T2 2,999,999', C.lookupTable(2999999, 1), 73060);
eq('T2 3,000,000', C.lookupTable(3000000, 1), 74350);
eq('T2 9,999,999', C.lookupTable(9999999, 1), 1503990);
eq('T2 10,000,000', C.lookupTable(10000000, 1), 1507400);
eq('T2 10,000,010', C.lookupTable(10000010, 1), 1532400); // 1,507,400 + floor(10*0.98*0.35)=3 + 25,000 → 10원 절사
eq('T2 14,000,000 연속성', C.lookupTable(14000000, 1), 1507400 + 1397000);
eq('T2 28,000,000 연속성', C.lookupTable(28000000, 1), 1507400 + 6610600);
eq('T2 30,000,000 연속성', C.lookupTable(30000000, 1), 1507400 + 7394600);
eq('T2 45,000,000 연속성', C.lookupTable(45000000, 1), 1507400 + 13394600);
eq('T2 87,000,000 연속성', C.lookupTable(87000000, 1), 1507400 + 31034600);
eq('T2 100,000,000', C.lookupTable(100000000, 1), floor10(1507400 + 31034600 + 13000000 * 0.45));
function floor10(n) { return Math.floor(n / 10) * 10; }
// 표 임의 행 대조 (원문 텍스트 값)
eq('T2 row 2,000천 1인', C.lookupTable(2000000, 1), 19520);
eq('T2 row 2,000천 4인', C.lookupTable(2005000, 4), 3220);
eq('T2 row 4,000천 11인', C.lookupTable(4010000, 11), 23070);
eq('T2 row 5,000천 3인', C.lookupTable(5019999, 3), 237850);
eq('T2 row 2,670천 8인', C.lookupTable(2670000, 8), 3250);

// T3 가족 수
eq('T3 300만 2인', C.lookupTable(3000000, 2), 56850);
eq('T3 300만 11인', C.lookupTable(3000000, 11), 0);
eq('T3 300만 12인(음수→0)', C.lookupTable(3000000, 12), 0);
eq('T3 500만 12인', C.lookupTable(5000000, 12), 87850 - (106600 - 87850) * 1);
eq('T3 500만 13인', C.lookupTable(5000000, 13), 87850 - (106600 - 87850) * 2);

// T4 자녀 공제
eq('T4 자녀1', C.childDeduction(1), 20830);
eq('T4 자녀2', C.childDeduction(2), 45830);
eq('T4 자녀3', C.childDeduction(3), 45830 + 33330);
eq('T4 자녀5', C.childDeduction(5), 45830 + 33330 * 3);
r = C.calc({ gross: 3000000, family: 3, kids: 1 }); eq('T4 300만 3인 자녀1 tax', r.tax, 31940 - 20830);
r = C.calc({ gross: 3000000, family: 4, kids: 2 }); eq('T4 300만 4인 자녀2 tax→0', r.tax, 0); eq('T4 local 0', r.local, 0);

// T5 국민연금 상·하한
r = C.calc({ gross: 8000000, family: 1 }); eq('T5 800만 nps 상한', r.nps, Math.floor(6590000 * 0.0475)); eq('T5 npsBase', r.npsBase, 6590000);
r = C.calc({ gross: 300000, family: 1 }); eq('T5 30만 nps 하한', r.nps, Math.floor(410000 * 0.0475)); eq('T5 30만 tax 0', r.tax, 0);
r = C.calc({ gross: 3000500, family: 1 }); eq('T5 천원절사 nps', r.nps, 142500); eq('T5 hi 10원절사', r.hi, 107860);

// T6 건강보험 상한
r = C.calc({ gross: 200000000, family: 1 }); eq('T6 hi cap', r.hi, 4591740); eq('T6 ltc of cap', r.ltc, floor10(4591740 * 0.1314));

// T7 비과세
r = C.calc({ gross: 3000000, nontax: 200000, family: 1 });
eq('T7 taxable', r.taxable, 2800000); eq('T7 nps', r.nps, 133000); eq('T7 hi', r.hi, 100660); eq('T7 ltc', r.ltc, 13220); eq('T7 ei', r.ei, 25200);
eq('T7 tax = 표 2,800천 1인', r.tax, row(2800).v[0]); eq('T7 net', r.net, 3000000 - (133000 + 100660 + 13220 + 25200 + r.tax + floor10(r.tax * 0.1)));
r = C.calc({ gross: 1000000, nontax: 2000000, family: 1 }); eq('T8 비과세>월급 total 0', r.total, 0); eq('T8 net=gross', r.net, 1000000);

// T9 연봉 모드(월 환산은 화면에서 /12 절사) 3,600만 → 300만
r = C.calc({ gross: Math.floor(36000000 / 12), family: 1 }); eq('T9 연봉3600 net', r.net, 2626700);

// T10 비율 80/120
r = C.calc({ gross: 3000000, family: 1, ratio: 0.8 }); eq('T10 80%', r.tax, floor10(74350 * 0.8));
r = C.calc({ gross: 3000000, family: 1, ratio: 1.2 }); eq('T10 120%', r.tax, floor10(74350 * 1.2));

// T11 입력 방어
r = C.calc({ gross: 0 }); eq('T11 0원', r.net, 0);
r = C.calc({ gross: -5, family: 0, kids: -1 }); eq('T11 음수 방어', r.net, 0);

// T13 (독립 검증에서 발견) 1,000만 초과 구간 부동소수점 오차 — 정수 산식 기대값과 1만원 단위 전수 대조
eq('T13 10,090,000 1인', C.lookupTable(10090000, 1), 1563270);
eq('T13 11,400,000 2인', C.lookupTable(11400000, 2), 1936770);
eq('T13 12,000,000 12인', C.lookupTable(12000000, 12), 1641840);
let fpMism = 0;
for (let t = 10010000; t <= 100000000; t += 10000) {
  const b = T.row10k[0]; let add;
  if (t <= 14000000) add = Math.floor((t - 10000000) * 343 / 1000) + 25000;
  else if (t <= 28000000) add = 1397000 + Math.floor((t - 14000000) * 3724 / 10000);
  else if (t <= 30000000) add = 6610600 + Math.floor((t - 28000000) * 392 / 1000);
  else if (t <= 45000000) add = 7394600 + Math.floor((t - 30000000) * 40 / 100);
  else if (t <= 87000000) add = 13394600 + Math.floor((t - 45000000) * 42 / 100);
  else add = 31034600 + Math.floor((t - 87000000) * 45 / 100);
  if (C.lookupTable(t, 1) !== floor10(b + add)) fpMism++;
}
eq('T13 초과 구간 전수(1만원 단위) 불일치 수', fpMism, 0);
// T14 건강보험 하한(근로자 10,080) — 과세급여 20만원
r = C.calc({ gross: 200000, family: 1 }); eq('T14 hi 하한', r.hi, 10080); eq('T14 ltc of 하한', r.ltc, floor10(10080 * 0.1314));

// T12 표 전수 대조: 646행 × 11열 모두 lookupTable이 원문 값을 그대로 돌려주는지 (구간 하한·상한-1원 양 끝)
let mism = 0;
for (const rw of T.rows) for (let f = 1; f <= 11; f++) {
  if (C.lookupTable(rw.min * 1000, f) !== rw.v[f - 1]) mism++;
  if (C.lookupTable(rw.max * 1000 - 1, f) !== rw.v[f - 1]) mism++;
}
eq('T12 전수 대조 불일치 수', mism, 0);
// 참고: 실수령액은 월급에 대해 단조 증가가 아님 — 간이세액표 자체가 계단식(예: 5,840천원에서 1인 +19,910원)이며 이는 법령 원문 그대로임
let drops = 0, maxDrop = 0;
let prev = -1;
for (let g = 500000; g <= 12000000; g += 10000) { const n = C.calc({ gross: g, family: 1 }).net; if (n < prev) { drops++; maxDrop = Math.max(maxDrop, prev - n); } prev = n; }
console.log(`참고: 1만원 단위 구간 중 실수령 역전 ${drops}회, 최대 역전폭 ${maxDrop}원 (표의 계단 구조 때문, 오류 아님)`);

console.log(`\n결과: ${pass} 통과 / ${fail} 실패`);
process.exit(fail ? 1 : 0);
