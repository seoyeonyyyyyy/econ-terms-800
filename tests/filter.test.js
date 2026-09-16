import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { filterTerms } from "../js/filter.js";

const TERMS = [
  { id: "기준금리", term: "기준금리", chosung: "ㄱㅈㄱㄹ", alt: "Base Rate", aliases: [],
    def: "한국은행이 정하는 정책금리", category: "금융상식", subcategory: "통화정책" },
  { id: "가계수지", term: "가계수지", chosung: "ㄱㄱㅅㅈ", alt: null, aliases: [],
    def: "가계의 수입과 지출", category: "경제상식", subcategory: "성장·국민계정" },
  { id: "통화스왑", term: "통화스왑", chosung: "ㅌㅎㅅㅇ", alt: null, aliases: [],
    def: "두 나라가 통화를 교환", category: "국제·외환", subcategory: "외환·환율" },
  { id: "단리/복리", term: "단리/복리", chosung: "ㄷㄹㅂㄹ", alt: null,
    aliases: ["단리", "복리"],
    def: "이자를 원금에만 붙이면 단리다", category: "금융상식", subcategory: "금융시장" },
];
const PROGRESS = {
  기준금리: { status: "known", starred: true },
  가계수지: { status: "unknown", starred: false },
  "단리/복리": { status: "unknown", starred: false },
};

describe("filterTerms", () => {
  test("조건이 없으면 전부 준다", () => {
    assert.equal(filterTerms(TERMS, PROGRESS, {}).length, 4);
  });

  test("묶음 용어를 조각으로도 찾는다", () => {
    const got = filterTerms(TERMS, PROGRESS, { q: "복리" });
    assert.deepEqual(got.map((t) => t.id), ["단리/복리"]);
  });

  test("용어명으로 검색한다", () => {
    const got = filterTerms(TERMS, PROGRESS, { q: "기준" });
    assert.deepEqual(got.map((t) => t.id), ["기준금리"]);
  });

  test("정의 본문으로도 검색한다", () => {
    const got = filterTerms(TERMS, PROGRESS, { q: "교환" });
    assert.deepEqual(got.map((t) => t.id), ["통화스왑"]);
  });

  test("초성으로 검색한다", () => {
    const got = filterTerms(TERMS, PROGRESS, { q: "ㄱㅈㄱㄹ" });
    assert.deepEqual(got.map((t) => t.id), ["기준금리"]);
  });

  test("영문명으로 검색한다", () => {
    const got = filterTerms(TERMS, PROGRESS, { q: "base" });
    assert.deepEqual(got.map((t) => t.id), ["기준금리"]);
  });

  test("미학습 상태를 걸러낸다", () => {
    const got = filterTerms(TERMS, PROGRESS, { status: "none" });
    assert.deepEqual(got.map((t) => t.id), ["통화스왑"]);
  });

  test("초성 필터", () => {
    const got = filterTerms(TERMS, PROGRESS, { chosung: "ㄱ" });
    assert.deepEqual(got.map((t) => t.id), ["기준금리", "가계수지"]);
  });

  test("조건을 AND로 조합한다", () => {
    const got = filterTerms(TERMS, PROGRESS, { category: "금융상식", status: "known", starred: "1" });
    assert.deepEqual(got.map((t) => t.id), ["기준금리"]);
  });

  test("조합 결과가 없으면 빈 배열", () => {
    const got = filterTerms(TERMS, PROGRESS, { category: "경제상식", starred: "1" });
    assert.deepEqual(got, []);
  });
});
