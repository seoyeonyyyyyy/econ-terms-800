import unittest, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tools.classify import classify, SUBCATEGORIES

class TestClassify(unittest.TestCase):
    def test_통화정책(self):
        self.assertEqual(
            classify("기준금리", "한국은행 금융통화위원회가 정하는 정책금리로 통화정책의 기준이 된다."),
            ("금융상식", "통화정책"),
        )

    def test_외환(self):
        self.assertEqual(
            classify("통화스왑", "두 나라 중앙은행이 서로 다른 통화를 약정 환율로 교환하는 외환 거래이다."),
            ("국제·외환", "외환·환율"),
        )

    def test_회계(self):
        self.assertEqual(
            classify("자기자본이익률(ROE)", "당기순이익을 자기자본으로 나눈 재무 비율로 기업의 수익성을 본다."),
            ("경영·회계", "회계·재무"),
        )

    def test_물가(self):
        self.assertEqual(
            classify("근원인플레이션율", "농산물과 석유류를 제외한 소비자물가 상승률을 말한다."),
            ("경제상식", "물가·인플레이션"),
        )

    def test_모든_소분류가_15개이고_대분류_4개에_속한다(self):
        self.assertEqual(len(SUBCATEGORIES), 15)
        self.assertEqual(len({c for c, _ in SUBCATEGORIES.values()}), 4)

    def test_키워드가_하나도_없어도_분류된다(self):
        cat, sub = classify("잠상", "인쇄물에 숨겨 넣은 문양으로 위조를 막는다.")
        self.assertIn(sub, SUBCATEGORIES)
        self.assertIsNotNone(cat)


class TestDecoys(unittest.TestCase):
    def test_전환율은_환율로_세지_않는다(self):
        cat, sub = classify("전월세 전환율", "전세 보증금을 월세로 돌릴 때 적용하는 비율이다.")
        self.assertNotEqual(sub, "외환·환율")

    def test_진짜_환율_용어는_그대로_잡는다(self):
        self.assertEqual(
            classify("기준환율", "외환시장에서 형성되는 원화와 달러 사이의 환율을 말한다."),
            ("국제·외환", "외환·환율"),
        )

if __name__ == "__main__":
    unittest.main()
