import unittest, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tools.toc import parse_toc

class TestParseToc(unittest.TestCase):
    def test_한_줄에_있는_여러_항목을_모두_뽑는다(self):
        line = "가계부실위험지수(HDRI)······ 1 가계수지······ 1 가계순저축률······ 2"
        got = parse_toc("찾아보기\n" + line)
        self.assertEqual(got, [
            ("가계부실위험지수(HDRI)", 1),
            ("가계수지", 1),
            ("가계순저축률", 2),
        ])

    def test_두_줄로_쪼개진_제목을_병합한다(self):
        text = "찾아보기\n통화정책 운영체제\n(Monetary Policy Regime)····· 346"
        self.assertEqual(
            parse_toc(text),
            [("통화정책 운영체제(Monetary Policy Regime)", 346)],
        )

    def test_앞_항목_뒤에_붙은_제목도_병합한다(self):
        text = "찾아보기\n금융제도······ 67 동아시아·태평양중앙은행기구·\n(EMEAP)····· 101"
        self.assertEqual(
            parse_toc(text),
            [("금융제도", 67), ("동아시아·태평양중앙은행기구(EMEAP)", 101)],
        )

    def test_용어명_안의_가운뎃점을_보존한다(self):
        # 점선(·····)과 용어명 속 가운뎃점(·)을 구분해야 한다
        text = "찾아보기\n대외의존도·수출입의존도······ 93"
        self.assertEqual(parse_toc(text), [("대외의존도·수출입의존도", 93)])

    def test_초성_인덱스와_페이지번호를_버린다(self):
        text = "찾아보기\nㄱ\niv\nI 경제금융용어 800선\n가계수지····· 1"
        self.assertEqual(parse_toc(text), [("가계수지", 1)])

if __name__ == "__main__":
    unittest.main()
