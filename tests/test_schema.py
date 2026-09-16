import unittest, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tools.schema import chosung, extract_alt, split_aliases, build_record

class TestChosung(unittest.TestCase):
    def test_한글_초성을_뽑는다(self):
        self.assertEqual(chosung("기준금리"), "ㄱㅈㄱㄹ")

    def test_쌍자음_초성(self):
        self.assertEqual(chosung("따라잡기"), "ㄸㄹㅈㄱ")

    def test_한글이_아닌_문자는_건너뛴다(self):
        self.assertEqual(chosung("가계부실위험지수(HDRI)"), "ㄱㄱㅂㅅㅇㅎㅈㅅ")

class TestExtractAlt(unittest.TestCase):
    def test_정의_첫머리_괄호_영문명을_뽑는다(self):
        alt = extract_alt("경기", "경기(Business Conditions)라는 단어는 일상생활에서")
        self.assertEqual(alt, "Business Conditions")

    def test_용어명_괄호_안_약어를_뽑는다(self):
        alt = extract_alt("가계부실위험지수(HDRI)", "가구의 소득 흐름은 물론")
        self.assertEqual(alt, "HDRI")

    def test_영문명이_없으면_None(self):
        self.assertIsNone(extract_alt("경기순응성", "경기순응성이란 통상 경제주체의"))

class TestSplitAliases(unittest.TestCase):
    def test_슬래시로_묶인_용어를_조각낸다(self):
        self.assertEqual(split_aliases("단리/복리"), ["단리", "복리"])

    def test_세_조각도_처리한다(self):
        self.assertEqual(
            split_aliases("경제활동인구/비경제활동인구/경제활동참가율"),
            ["경제활동인구", "비경제활동인구", "경제활동참가율"],
        )

    def test_슬래시가_없으면_빈_목록(self):
        self.assertEqual(split_aliases("기준금리"), [])

class TestBuildRecord(unittest.TestCase):
    def test_전체_레코드를_만든다(self):
        rec = build_record({
            "term": "기준금리",
            "def": "기준금리(Base Rate)는 한국은행이 정하는 금리다.",
            "related": ["콜금리"],
            "page": 137,
        })
        self.assertEqual(rec["id"], "기준금리")
        self.assertEqual(rec["chosung"], "ㄱㅈㄱㄹ")
        self.assertEqual(rec["alt"], "Base Rate")
        self.assertEqual(rec["aliases"], [])
        self.assertEqual(rec["page"], 137)

    def test_묶음_용어는_aliases를_채운다(self):
        rec = build_record({
            "term": "단리/복리",
            "def": "이자를 원금에만 붙이면 단리, 이자에도 붙이면 복리이다.",
            "related": [],
            "page": 89,
        })
        self.assertEqual(rec["aliases"], ["단리", "복리"])

if __name__ == "__main__":
    unittest.main()
