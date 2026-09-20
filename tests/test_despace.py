import unittest, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tools.despace import build_counts, fix_text, _support

class TestFixText(unittest.TestCase):
    def setUp(self):
        # "공개시장운영"은 붙은 형태가 흔하고, "수 있다"는 띄운 형태만 쓰인다
        corpus = [
            "공개시장운영은 통화정책수단이다.",
            "공개시장운영을 통해 금리를 조절한다.",
            "공개시장운영이 가장 널리 쓰인다.",
            "이를 통해 조절할 수 있다.",
            "정책을 펼 수 있다.",
            "목표를 이룰 수 있다.",
        ]
        self.counts = build_counts(corpus)

    def test_조판으로_쪼개진_단어를_붙인다(self):
        got = fix_text("공 개시장운영은 다른 수단에 비해 신축적이다.", self.counts)
        self.assertIn("공개시장운영", got)
        self.assertNotIn("공 개시장운영", got)

    def test_정상_띄어쓰기는_건드리지_않는다(self):
        text = "이를 통해 조절할 수 있다."
        self.assertEqual(fix_text(text, self.counts), text)

    def test_지지도는_접두사까지_본다(self):
        # "공개시장운영"은 조사가 달라 형태가 갈리지만 접두사로는 세 번 나온다
        self.assertGreaterEqual(_support("공", "개시장운영은", self.counts), 3)
        self.assertEqual(_support("수", "있다", self.counts), 0)
        # a만 흔하다고 붙이면 안 된다
        self.assertEqual(_support("공개시장운영은", "다른", self.counts), 0)

    def test_붙은_형태가_없으면_그대로_둔다(self):
        text = "전혀 모르는 말 이다."
        self.assertEqual(fix_text(text, self.counts), text)

    def test_문단_구분은_보존한다(self):
        text = "공 개시장운영은 수단이다.\n\n둘째 문단이다."
        got = fix_text(text, self.counts)
        self.assertIn("\n\n", got)
        self.assertIn("공개시장운영", got)

class TestBuildCounts(unittest.TestCase):
    def test_붙은_형태와_띄운_형태를_모두_센다(self):
        counts = build_counts(["공개시장운영은 수단이다.", "공 개시장운영도 수단이다."])
        # 조사가 붙은 "공개시장운영은"은 단어로, "공개시장운영"은 접두사로 잡힌다
        self.assertGreaterEqual(counts.joined["공개시장운영은"], 1)
        self.assertGreaterEqual(counts.prefix["공개시장운영"], 1)
        self.assertGreaterEqual(counts.split[("공", "개시장운영도")], 1)

if __name__ == "__main__":
    unittest.main()
