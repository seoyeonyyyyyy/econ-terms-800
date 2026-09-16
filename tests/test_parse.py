import unittest, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tools.parse import clean_lines, join_wrapped, split_related

class TestCleanLines(unittest.TestCase):
    def test_페이지_헤더와_번호와_초성을_지운다(self):
        page = "I 경제금융용어 800선\n경기순응성이란 통상 …\nㄱ\n13"
        self.assertEqual(clean_lines(page), ["경기순응성이란 통상 …"])

    def test_같은_페이지에_또_나오는_첫줄은_러닝헤드다(self):
        # 러닝 헤드는 그 페이지에 실린 항목의 이름이므로 아래에 한 번 더 나온다
        page = "경기종합지수\n호경기에는 미래에 대한 낙관적 기대 등으로\n경기종합지수\n산업생산지수 등 개별 지표를"
        self.assertEqual(
            clean_lines(page, running_heads={"경기종합지수"}),
            ["호경기에는 미래에 대한 낙관적 기대 등으로", "경기종합지수", "산업생산지수 등 개별 지표를"],
        )

    def test_한_번만_나오는_첫줄은_진짜_용어다(self):
        # 진짜 용어가 페이지 맨 위에 오는 경우를 러닝 헤드로 오인하면 안 된다
        page = "가계처분가능소득\n가계가 마음대로 소비와 저축으로 처분할 수 있는 소득을 의미한다."
        self.assertEqual(
            clean_lines(page, running_heads={"가계처분가능소득"}),
            ["가계처분가능소득", "가계가 마음대로 소비와 저축으로 처분할 수 있는 소득을 의미한다."],
        )

class TestJoinWrapped(unittest.TestCase):
    def test_종결되지_않은_줄을_이어붙인다(self):
        lines = ["호경기에는 미래에 대한 낙관적 기대 등으로", "여신심사기준도 완화된다."]
        self.assertEqual(
            join_wrapped(lines),
            "호경기에는 미래에 대한 낙관적 기대 등으로 여신심사기준도 완화된다.",
        )

    def test_종결된_줄은_그대로_둔다(self):
        lines = ["첫 문장이다.", "둘째 문장이다."]
        self.assertEqual(join_wrapped(lines), "첫 문장이다. 둘째 문장이다.")

    def test_수식으로_끝나는_줄을_보존한다(self):
        lines = ["가계순저축률(%) = {가계부문 순저축 / 가계순처분가능소득} × 100"]
        self.assertIn("× 100", join_wrapped(lines))

class TestSplitRelated(unittest.TestCase):
    def test_연관검색어를_분리한다(self):
        body = "경기조절정책은 … 취한다.\n연관검색어 재정정책, 통화정책"
        definition, related = split_related(body)
        self.assertEqual(related, ["재정정책", "통화정책"])
        self.assertNotIn("연관검색어", definition)
        self.assertTrue(definition.endswith("취한다."))

    def test_연관검색어가_없으면_빈_목록(self):
        definition, related = split_related("설명만 있다.")
        self.assertEqual(related, [])
        self.assertEqual(definition, "설명만 있다.")

if __name__ == "__main__":
    unittest.main()

class TestPickMarks(unittest.TestCase):
    def test_본문이_가장_긴_등장을_고른다(self):
        from tools.parse import pick_marks
        # 10번 위치의 '크라우드펀딩'은 바로 다음 줄에 다른 용어가 와서 머리글이다
        cands = [(10, "크라우드펀딩"), (11, "테일러 준칙"), (40, "크라우드펀딩")]
        got = pick_marks(cands, total=80)
        self.assertEqual(got, [(11, "테일러 준칙"), (40, "크라우드펀딩")])

    def test_한_번만_나오면_그대로_쓴다(self):
        from tools.parse import pick_marks
        self.assertEqual(pick_marks([(5, "기준금리")], total=20), [(5, "기준금리")])

    def test_빈_목록(self):
        from tools.parse import pick_marks
        self.assertEqual(pick_marks([], total=10), [])

class TestMatchName(unittest.TestCase):
    def setUp(self):
        from tools.parse import _prefix_index
        self.names = {"크라우드펀딩": 335, "콜옵션": 336, "금리": 100, "금리스왑": 101}
        self.idx = _prefix_index(self.names)

    def test_단독_줄을_맞춘다(self):
        from tools.parse import _match_name
        self.assertEqual(_match_name("콜옵션", self.names, self.idx), "콜옵션")

    def test_용어명이_정의에_붙어_있어도_맞춘다(self):
        from tools.parse import _match_name
        line = "크라우드펀딩 크라우드펀딩(Crowd Funding)은 온라인 플랫폼을 통해"
        self.assertEqual(_match_name(line, self.names, self.idx), "크라우드펀딩")

    def test_긴_이름을_먼저_맞춘다(self):
        from tools.parse import _match_name
        self.assertEqual(_match_name("금리스왑 금리스왑이란", self.names, self.idx), "금리스왑")

    def test_공백_없이_이어지면_맞추지_않는다(self):
        from tools.parse import _match_name
        self.assertIsNone(_match_name("금리스왑거래는 파생상품이다", self.names, self.idx))

    def test_관계없는_줄(self):
        from tools.parse import _match_name
        self.assertIsNone(_match_name("이는 세 행위주체 즉", self.names, self.idx))

class TestSideIndex(unittest.TestCase):
    def test_줄머리_초성_인덱스를_벗긴다(self):
        self.assertEqual(clean_lines("ㅇ 외국환포지션"), ["외국환포지션"])

    def test_줄끝_초성_인덱스를_벗긴다(self):
        page = "온라인 플랫폼을 통해 다수의 개인들로부 ㅋ"
        self.assertEqual(clean_lines(page), ["온라인 플랫폼을 통해 다수의 개인들로부"])
