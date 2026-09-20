import unittest, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tools.enrich import split_paragraphs, extract_formulas, resolve_alt

class TestSplitParagraphs(unittest.TestCase):
    def test_문장_서너_개마다_문단을_나눈다(self):
        text = "첫째 문장이다. 둘째 문장이다. 셋째 문장이다. 넷째 문장이다. 다섯째 문장이다."
        got = split_paragraphs(text, per_para=3)
        self.assertEqual(got.count("\n\n"), 1)

    def test_원문_글자를_바꾸지_않는다(self):
        text = "첫째 문장이다. 둘째 문장이다. 셋째 문장이다. 넷째 문장이다."
        got = split_paragraphs(text, per_para=2)
        self.assertEqual(got.replace("\n\n", " ").split(), text.split())

    def test_문장이_적으면_그대로_둔다(self):
        text = "한 문장뿐이다."
        self.assertEqual(split_paragraphs(text), text)

class TestExtractFormulas(unittest.TestCase):
    def test_독립된_수식_줄을_뽑는다(self):
        text = "가계순저축률은 저축 성향을 보여준다. 가계순저축률(%) = {순저축 / 처분가능소득} × 100"
        body, formulas = extract_formulas(text)
        self.assertEqual(len(formulas), 1)
        self.assertIn("× 100", formulas[0])
        self.assertNotIn("× 100", body)

    def test_문장_중간의_등호는_건드리지_않는다(self):
        text = "이 지수는 100 = 기준값으로 설정되어 있으며 그보다 높으면 위험하다."
        body, formulas = extract_formulas(text)
        self.assertEqual(formulas, [])
        self.assertEqual(body, text)

    def test_수식이_없으면_그대로(self):
        text = "수식이 전혀 없는 설명이다."
        body, formulas = extract_formulas(text)
        self.assertEqual(formulas, [])
        self.assertEqual(body, text)

class TestResolveAlt(unittest.TestCase):
    def test_약자의_풀네임을_원문에서_찾는다(self):
        alt = resolve_alt("국내총생산(GDP)", "국내총생산(GDP; Gross Domestic Product)은 한 나라의")
        self.assertEqual(alt, "GDP · Gross Domestic Product")

    def test_풀네임이_괄호_앞에_있는_형태도_찾는다(self):
        alt = resolve_alt("국제통화기금(IMF)", "International Monetary Fund(IMF)는 국제금융기구다")
        self.assertEqual(alt, "IMF · International Monetary Fund")

    def test_풀네임이_없으면_약자만(self):
        alt = resolve_alt("담보인정비율(LTV)", "주택담보대출 취급 시 담보가치 대비 비율을 의미한다")
        self.assertEqual(alt, "LTV")

    def test_용어명_바로_뒤_괄호_영문을_쓴다(self):
        alt = resolve_alt("경기", "경기(Business Conditions)라는 단어는 일상생활에서")
        self.assertEqual(alt, "Business Conditions")

    def test_정의문_아무_데나_있는_약어는_가져오지_않는다(self):
        # '가계수지'와 무관한 DSR을 집어오면 안 된다
        alt = resolve_alt("가계수지", "가정에서 수입과 지출을 비교한다. 원리금상환비율(DSR; Debt Service Ratio)을 쓴다.")
        self.assertIsNone(alt)

    def test_영문이_전혀_없으면_None(self):
        self.assertIsNone(resolve_alt("경기순응성", "경기순응성이란 통상 경제주체의 위험인식이"))

if __name__ == "__main__":
    unittest.main()
