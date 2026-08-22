/*
 * taxtool.kr 급여(월급) 실수령액 계산 로직 — 화면과 분리된 순수 계산 모듈
 * 기준: 2026년 8월 (요율 출처: Documents\급여계산기_자료\요율조사_보고서_2026-08-22.md)
 *  - 국민연금 근로자 4.75% (기준소득월액 하한 41만·상한 659만, 천원 미만 절사, 보험료 원 단위 절사)
 *  - 건강보험 근로자 3.595% (10원 미만 절사, 월 보험료 근로자분 상한 4,591,740원)
 *  - 장기요양 건강보험료의 13.14% (10원 미만 절사)
 *  - 고용보험 근로자 0.9% (원 단위 절사)
 *  - 소득세: 소득세법 시행령 별표2 <개정 2026.2.27> 간이세액표 원문 조회 (ganyi2026.js)
 *  - 지방소득세: 소득세의 10% (10원 미만 절사)
 * 브라우저에서는 window.PayCalc, node에서는 module.exports 로 노출.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./ganyi2026.js'));
  } else {
    root.PayCalc = factory(root.GANYI2026);
  }
})(typeof window !== 'undefined' ? window : this, function (T) {
  'use strict';

  var RATES = {
    asOf: '2026-08',
    nps: { rate: 0.0475, min: 410000, max: 6590000 },
    hi:  { rate: 0.03595, maxPremium: 4591740, minPremium: 10080 }, // 월별 보험료 상한 9,183,480·하한 20,160의 근로자 절반
    ltc: { rateOfHi: 0.1314 },
    ei:  { rate: 0.009 },
    localTax: 0.10
  };

  function floor1(n)  { return Math.floor(n); }
  function floor10(n) { return Math.floor(n / 10) * 10; }
  function floor1000(n) { return Math.floor(n / 1000) * 1000; }
  // 소수 요율 곱셈의 부동소수점 오차(예: 3,000,000×0.009=26,999.99…) 방지 — 정수 분자/분모로 계산
  function pct(n, num, den) { return n * num / den; }

  // 간이세액표 조회 — taxable: 월급여액(비과세 제외, 원), family: 공제대상가족 수(본인 포함, 1 이상)
  function lookupTable(taxable, family) {
    if (taxable < 770000) return 0;
    var col = Math.min(Math.max(family, 1), 11) - 1;
    var v;
    if (taxable < 10000000) {
      var row = null;
      // 이진 탐색
      var lo = 0, hi = T.rows.length - 1;
      while (lo <= hi) {
        var mid = (lo + hi) >> 1, r = T.rows[mid];
        if (taxable < r.min * 1000) hi = mid - 1;
        else if (taxable >= r.max * 1000) lo = mid + 1;
        else { row = r; break; }
      }
      if (!row) return 0; // 도달 불가(표는 770~10,000천원 연속)
      v = pick(row.v, family, col);
    } else if (taxable === 10000000) {
      v = pick(T.row10k, family, col);
    } else {
      var base = pick(T.row10k, family, col);
      v = base + overTenMillion(taxable);
      v = floor10(v);
    }
    return Math.max(v, 0);
  }

  // 공제대상가족 11명 초과: 비고 4 — 11명 세액 − (10명 세액 − 11명 세액) × (초과 가족 수)
  function pick(vals, family, col) {
    if (family <= 11) return vals[col];
    var v11 = vals[10], v10 = vals[9];
    return Math.max(v11 - (v10 - v11) * (family - 11), 0);
  }

  // 월급여 1,000만원 초과분 산식 (별표2 제6호 하단) — 10,000천원인 경우의 세액에 더할 금액
  // 부동소수점 오차 방지를 위해 "98%를 곱한 금액의 35%" 등은 정수 분자/분모로 계산 (0.98×0.35 = 343/1000)
  function overTenMillion(taxable) {
    var t = taxable;
    if (t <= 14000000) return floor1(pct(t - 10000000, 343, 1000)) + 25000;       // 98% × 35%
    if (t <= 28000000) return 1397000 + floor1(pct(t - 14000000, 3724, 10000));   // 98% × 38%
    if (t <= 30000000) return 6610600 + floor1(pct(t - 28000000, 392, 1000));     // 98% × 40%
    if (t <= 45000000) return 7394600 + floor1(pct(t - 30000000, 40, 100));       // 40%
    if (t <= 87000000) return 13394600 + floor1(pct(t - 45000000, 42, 100));      // 42%
    return 31034600 + floor1(pct(t - 87000000, 45, 100));                          // 45%
  }

  // 8세 이상 20세 이하 자녀 공제 (비고 3)
  function childDeduction(kids) {
    if (kids <= 0) return 0;
    if (kids === 1) return T.child.one;
    if (kids === 2) return T.child.two;
    return T.child.two + (kids - 2) * T.child.extraPer;
  }

  /**
   * @param {object} p
   *  gross   월급(세전, 원) — 비과세 포함 총지급액
   *  nontax  비과세액(원, 식대 등) 기본 0
   *  family  공제대상가족 수(본인 포함) 기본 1
   *  kids    그중 8~20세 자녀 수 기본 0
   *  ratio   간이세액 적용 비율 0.8 / 1 / 1.2 기본 1
   */
  function calc(p) {
    var gross  = Math.max(floor1(p.gross || 0), 0);
    var nontax = Math.max(floor1(p.nontax || 0), 0);
    var family = Math.max(floor1(p.family || 1), 1);
    var kids   = Math.max(floor1(p.kids || 0), 0);
    var ratio  = p.ratio || 1;

    var taxable = Math.max(gross - nontax, 0);

    // 국민연금: 기준소득월액 = 과세급여(천원 미만 절사)를 하한·상한으로 제한
    var npsBase = taxable > 0 ? Math.min(Math.max(floor1000(taxable), RATES.nps.min), RATES.nps.max) : 0;
    var nps = floor1(pct(npsBase, 475, 10000));          // 4.75%

    // 건강보험 / 장기요양
    var hi = floor10(pct(taxable, 3595, 100000));        // 3.595%
    if (hi > RATES.hi.maxPremium) hi = RATES.hi.maxPremium;
    if (taxable > 0 && hi < RATES.hi.minPremium) hi = RATES.hi.minPremium;
    var ltc = floor10(pct(hi, 1314, 10000));             // 건보료의 13.14%

    // 고용보험
    var ei = floor1(pct(taxable, 9, 1000));              // 0.9%

    // 소득세 (간이세액표) → 자녀 공제 → 비율 적용
    var tax = lookupTable(taxable, family);
    tax = Math.max(tax - childDeduction(kids), 0);
    if (ratio !== 1) tax = floor10(pct(tax, Math.round(ratio * 100), 100));
    var local = floor10(pct(tax, 1, 10));                // 10%

    var total = nps + hi + ltc + ei + tax + local;
    return {
      gross: gross, nontax: nontax, taxable: taxable, family: family, kids: kids,
      nps: nps, npsBase: npsBase, hi: hi, ltc: ltc, ei: ei, tax: tax, local: local,
      total: total, net: gross - total
    };
  }

  return { calc: calc, lookupTable: lookupTable, childDeduction: childDeduction, RATES: RATES, TABLE_SOURCE: T.source };
});
