import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  pickSentence, flipAntonym, perturbNumber, crossDefinition,
  makeOX, maskTerm, makeChoice, nameVariants, makeOddOne,
} from "../js/quiz.js";

// pickSentence가 30~120자 문장을 요구하므로 정의문 길이를 실제 데이터에 맞춘다.
// makeChoice가 보기 4개를 채우려면 같은 소분류에 최소 4개가 필요하다.
const POOL = [
  { id: "기준금리", term: "기준금리", alt: null,
    def: "기준금리를 인상하면 시중금리는 상승 압력을 받으며 가계 대출 수요가 줄어든다. 금융통화위원회가 기준금리를 연 8회에 걸쳐 결정하고 그 결과를 공표한다.",
    related: ["콜금리"], category: "금융상식", subcategory: "통화정책" },
  { id: "콜금리", term: "콜금리", alt: null,
    def: "금융기관 사이의 초단기 자금 거래에 적용되는 금리로 하루짜리 자금이 대부분을 차지한다.",
    related: [], category: "금융상식", subcategory: "통화정책" },
  { id: "지급준비율", term: "지급준비율", alt: null,
    def: "예금 가운데 중앙은행에 의무적으로 맡겨야 하는 비율로 통화량을 조절하는 수단이 된다.",
    related: [], category: "금융상식", subcategory: "통화정책" },
  { id: "공개시장운영", term: "공개시장운영", alt: null,
    def: "중앙은행이 증권을 사고팔아 시중 유동성을 조절하는 가장 일반적인 통화정책 수단이다.",
    related: [], category: "금융상식", subcategory: "통화정책" },
  { id: "가계수지", term: "가계수지", alt: null,
    def: "가계의 수입과 지출의 흐름을 나타내는 지표로 살림살이 형편을 가늠하는 데 쓰인다.",
    related: [], category: "경제상식", subcategory: "성장·국민계정" },
];

describe("pickSentence", () => {
  test("30~120자 문장을 고른다", () => {
    const s = pickSentence(POOL[0].def);
    assert.ok(s.length >= 30 && s.length <= 120, `길이 ${s.length}`);
  });

  test("알맞은 길이의 문장이 없으면 null", () => {
    assert.equal(pickSentence("짧다. 매우 짧다."), null);
  });
});

describe("flipAntonym", () => {
  test("반의어 하나만 뒤집는다", () => {
    // ANTONYMS 목록에서 상승/하락이 인상/인하보다 앞서므로 '상승'이 먼저 걸린다.
    const r = flipAntonym("기준금리를 인상하면 시중금리는 상승 압력을 받는다");
    assert.equal(r.text, "기준금리를 인상하면 시중금리는 하락 압력을 받는다");
    assert.equal(r.from, "상승");
    assert.ok(r.text.includes("인상"), "나머지 쌍은 건드리지 않는다");
  });

  test("반의어가 없으면 null", () => {
    assert.equal(flipAntonym("가계의 수입과 지출을 나타낸다"), null);
  });

  test("높이가 낮이로 바뀌지 않는다", () => {
    assert.equal(flipAntonym("건물의 높이를 측정한다"), null,
      "어미 없는 부분 문자열은 치환하지 않는다");
  });
});

describe("perturbNumber", () => {
  test("숫자를 다른 값으로 바꾼다", () => {
    const r = perturbNumber("금융통화위원회가 연 8회 결정한다", () => 0.9);
    assert.notEqual(r.text, "금융통화위원회가 연 8회 결정한다");
    assert.equal(r.from, "8");
  });

  test("연도는 건드리지 않는다", () => {
    assert.equal(perturbNumber("1996년에 도입하였다", () => 0.9), null);
  });

  test("연도를 빼고 남은 숫자는 바꾼다", () => {
    const r = perturbNumber("1996년 10월에 도입하였다", () => 0.9);
    assert.equal(r.from, "10", "연도는 보호되고 '10'만 후보가 된다");
    assert.ok(r.text.includes("1996년"), "연도는 그대로 남는다");
  });

  test("숫자가 없으면 null", () => {
    assert.equal(perturbNumber("가계의 수입과 지출을 나타낸다", () => 0.5), null);
  });
});

describe("crossDefinition", () => {
  test("연관 용어의 정의를 우선 가져온다", () => {
    const r = crossDefinition(POOL[0], POOL, () => 0);
    assert.equal(r.source, "콜금리");
  });

  test("후보가 없으면 null", () => {
    const lonely = { id: "외톨이", term: "외톨이", def: "설명", related: [],
                     category: "없는대분류", subcategory: "없는소분류" };
    assert.equal(crossDefinition(lonely, [lonely], () => 0), null);
  });
});

describe("makeOX", () => {
  test("참 문항은 원문을 쓴다", () => {
    const q = makeOX(POOL[0], POOL, () => 0.1);
    assert.equal(q.answer, true);
    assert.ok(POOL[0].def.includes(q.statement.replace(/\.$/, "")));
  });

  test("거짓 문항은 원문과 다르고 해설이 붙는다", () => {
    const q = makeOX(POOL[0], POOL, () => 0.9);
    assert.equal(q.answer, false);
    assert.ok(q.explain.length > 0);
    assert.ok(!POOL[0].def.includes(q.statement));
  });

  test("어떤 규칙도 못 쓰면 null", () => {
    const plain = { id: "잠상", term: "잠상", def: "짧다.", related: [],
                    category: "금융상식", subcategory: "지급결제·디지털금융" };
    assert.equal(makeOX(plain, [plain], () => 0.9), null);
  });

  test("termId를 실어 보낸다", () => {
    const q = makeOX(POOL[0], POOL, () => 0.1);
    assert.equal(q.termId, "기준금리");
  });
});

describe("maskTerm", () => {
  test("정의 안의 용어명을 가린다", () => {
    const got = maskTerm("기준금리는 한국은행이 정한다", "기준금리", null);
    assert.ok(!got.includes("기준금리"));
    assert.ok(got.includes("○"));
  });

  test("영문명도 가린다", () => {
    const got = maskTerm("기준금리(Base Rate)는 정책금리다", "기준금리", "Base Rate");
    assert.ok(!got.includes("Base Rate"));
  });

  test("여러 번 나와도 모두 가린다", () => {
    const got = maskTerm("가계수지란 무엇인가. 가계수지는 중요하다.", "가계수지", null);
    assert.equal(got.includes("가계수지"), false);
  });

  test("용어명이 없으면 그대로 둔다", () => {
    const text = "전혀 다른 설명이다";
    assert.equal(maskTerm(text, "기준금리", null), text);
  });
});

describe("makeChoice", () => {
  test("보기 4개에 정답이 들어 있다", () => {
    const q = makeChoice(POOL[0], POOL, () => 0.5);
    assert.equal(q.options.length, 4);
    assert.ok(q.options.includes("기준금리"));
    assert.equal(q.answer, "기준금리");
  });

  test("문제에 정답 용어명이 노출되지 않는다", () => {
    const q = makeChoice(POOL[0], POOL, () => 0.5);
    assert.ok(!q.question.includes("기준금리"));
  });

  test("보기는 중복되지 않는다", () => {
    const q = makeChoice(POOL[0], POOL, () => 0.5);
    assert.equal(new Set(q.options).size, 4);
  });

  test("후보가 4개 미만이면 null", () => {
    assert.equal(makeChoice(POOL[0], [POOL[0]], () => 0.5), null);
  });
});

describe("nameVariants / maskTerm 누출 방지", () => {
  test("괄호를 뗀 형태도 가린다", () => {
    const got = maskTerm(
      "스탠더드&푸어스는 무디스, 피치와 함께 3대 평가기관이다",
      "스탠더드&푸어스(S&P)", null);
    assert.ok(!got.includes("스탠더드&푸어스"), "본문은 괄호 없이 쓴다");
  });

  test("괄호 안 약어도 가린다", () => {
    const got = maskTerm("S&P는 신용등급을 매긴다", "스탠더드&푸어스(S&P)", null);
    assert.ok(!got.includes("S&P"));
  });

  test("aliases 조각도 가린다", () => {
    const got = maskTerm("이자를 원금에만 붙이면 단리다", "단리/복리", null, ["단리", "복리"]);
    assert.ok(!got.includes("단리"));
  });

  test("긴 변형을 먼저 지운다", () => {
    const v = nameVariants("가계부실위험지수(HDRI)", null, []);
    assert.ok(v[0].length >= v[v.length - 1].length);
  });
});

describe("makeOddOne — 옳지 않은 것은?", () => {
  const RICH = {
    id: "공개시장운영", term: "공개시장운영", alt: null, aliases: [],
    def: "공개시장운영은 중앙은행이 증권을 매매하여 시중유동성에 영향을 미치는 수단이다. "
       + "증권을 사들이면 시중 유동성이 증가하고 단기금리는 하락 압력을 받는다. "
       + "금융시장의 가격메커니즘에 따라 이루어지므로 시장친화적인 방식에 해당한다. "
       + "한국은행은 이를 연 8회 정례회의에서 정한 방향에 맞추어 수행한다.",
    related: [], category: "금융상식", subcategory: "통화정책",
  };

  test("보기 4개 중 정확히 하나가 답이다", () => {
    const q = makeOddOne(RICH, () => 0.5);
    assert.equal(q.options.length, 4);
    assert.ok(q.options.includes(q.answer));
  });

  test("정답은 원문에 없는 문장이다", () => {
    const q = makeOddOne(RICH, () => 0.5);
    const squash = (s) => s.replace(/\s/g, "");
    assert.ok(!squash(RICH.def).includes(squash(q.answer)), "틀린 보기는 변형된 문장이다");
  });

  test("나머지 세 보기는 원문 그대로다", () => {
    const q = makeOddOne(RICH, () => 0.5);
    const squash = (s) => s.replace(/\s/g, "");
    const others = q.options.filter((o) => o !== q.answer);
    assert.equal(others.length, 3);
    for (const o of others) {
      assert.ok(squash(RICH.def).includes(squash(o)), `원문에 없음: ${o}`);
    }
  });

  test("해설에 원문을 담는다", () => {
    const q = makeOddOne(RICH, () => 0.5);
    assert.ok(q.explain.length > 0);
  });

  test("쓸 만한 문장이 4개가 안 되면 출제하지 않는다", () => {
    const thin = { ...RICH, def: "짧다. 매우 짧다." };
    assert.equal(makeOddOne(thin, () => 0.5), null);
  });

  test("문제에 용어명을 밝힌다", () => {
    // 이 유형은 무슨 용어인지 알아야 판단할 수 있으므로 가리지 않는다
    const q = makeOddOne(RICH, () => 0.5);
    assert.ok(q.question.includes("공개시장운영"));
    assert.ok(q.question.includes("옳지 않은"));
  });
});
