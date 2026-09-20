"""PDF 조판 때문에 단어 중간에 낀 공백을 되돌린다.

원본 PDF가 양쪽 정렬이라 글자 사이가 벌어진 곳을 pdftotext가 공백으로 읽었다.
그래서 "공 개시장운영", "한 편", "신 축적" 같은 조각이 본문 곳곳에 남는다.

형태소 분석 없이 푸는 방법: 자료 전체에서 두 형태의 빈도를 세어 비교한다.
붙은 형태가 훨씬 흔하면 조판 사고이고, 띄운 형태만 쓰이면 정상 띄어쓰기다.

    "공 개시장운영"  붙은형 20회 / 띄운형 1회   → 붙인다
    "수 있다"        붙은형 0회  / 띄운형 295회 → 그대로 둔다
"""
import json, re, sys
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TERMS = ROOT / "data" / "terms.json"
REPORT = ROOT / "build" / "despace-report.txt"

HANGUL = r"[가-힣]"
WORD = re.compile(rf"{HANGUL}{{2,15}}")
PAIR = re.compile(rf"({HANGUL}{{1,6}}) ({HANGUL}{{1,10}})")

# 붙이면 뜻이 달라지는 말. 빈도만 보면 잘못 붙을 수 있어 손으로 막는다.
NEVER_JOIN = {
    ("한", "편"), ("이", "자"), ("그", "러나"), ("한", "국"),
    ("수", "있다"), ("수", "없다"), ("것", "이다"),
}

# 조각 하나가 1글자면("여 기서", "자 금을") 조판 사고가 거의 확실하다.
# 둘 다 두 글자 이상이면 복합명사일 수 있어("실물 자산") 훨씬 엄격하게 본다.
MIN_JOINED_SHORT, RATIO_SHORT = 3, 2.0
MIN_JOINED_LONG, RATIO_LONG = 4, 3.0

@dataclass
class Counts:
    joined: Counter = field(default_factory=Counter)
    prefix: Counter = field(default_factory=Counter)
    split: Counter = field(default_factory=Counter)
    follower: Counter = field(default_factory=Counter)   # 공백 뒤 어절과 그 접두사의 빈도

def build_counts(texts) -> Counts:
    """단어와 그 접두사를 함께 센다.

    조사가 붙어 "공개시장운영은/을/이"로 형태가 갈리므로 단어만 세면
    정작 알고 싶은 "공개시장운영"의 빈도가 잡히지 않는다.
    """
    c = Counts()
    for t in texts:
        for w in WORD.findall(t):
            c.joined[w] += 1
            for k in range(3, len(w)):
                c.prefix[w[:k]] += 1
        for m in PAIR.finditer(t):
            b = m.group(2)
            c.split[(m.group(1), b)] += 1
            c.follower[b] += 1
            for k in range(2, len(b)):       # 조사가 붙어 형태가 갈리므로 접두사도 센다
                c.follower[b[:k]] += 1
    return c

def _b_is_standalone(b: str, counts: Counts) -> bool:
    """뒷조각이 홀로 쓰이는 말인가.

    "자산까지"는 여러 문맥에서 어절로 나타나므로 "실물 자산까지"는 정상 띄어쓰기다.
    "스포저"는 "거액익" 뒤에서만 보이므로 쪼개진 조각이다.
    """
    return any(counts.follower[b[:k]] > 3 for k in range(2, len(b) + 1))

def _support(a: str, b: str, counts: Counts) -> int:
    """붙인 형태가 자료에서 얼마나 뒷받침되는가.

    반드시 b의 첫 글자까지 포함한 조각으로만 센다. a까지만 보면
    "가구의"가 흔하다는 이유로 "가구의 소득"을 붙여 버린다(실측: 정상 띄어쓰기 18201건이 붙었다).
    """
    joined = a + b
    best = 0
    for k in range(len(a) + 1, len(joined) + 1):
        piece = joined[:k]
        if len(piece) < 3:
            continue
        best = max(best, counts.joined.get(piece, 0) + counts.prefix.get(piece, 0))
    return best

def _should_join(a: str, b: str, counts: Counts) -> bool:
    if (a, b) in NEVER_JOIN:
        return False
    joined = a + b
    if len(joined) < 3 or len(joined) > 15:
        return False
    jn = _support(a, b, counts)
    sp = counts.split[(a, b)]
    short = len(a) == 1 or len(b) == 1
    if not short and _b_is_standalone(b, counts):
        return False          # 뒷조각이 홀로 쓰이는 말이면 정상 띄어쓰기다
    need, ratio = ((MIN_JOINED_SHORT, RATIO_SHORT) if short
                   else (MIN_JOINED_LONG, RATIO_LONG))
    return jn >= need and jn > sp * ratio

def fix_text(text: str, counts: Counts) -> str:
    """빈도가 말해 주는 대로만 붙인다. 문단 구분은 건드리지 않는다."""
    def repl(m):
        a, b = m.group(1), m.group(2)
        return a + b if _should_join(a, b, counts) else m.group(0)

    # 한 번에 겹쳐 바뀌지 않도록 문단별로 처리한다
    return "\n\n".join(PAIR.sub(repl, para) for para in text.split("\n\n"))

def main():
    terms = json.loads(TERMS.read_text(encoding="utf-8"))
    changes = []

    # 한 번 고치면 붙은 형태의 빈도가 올라 새 후보가 드러난다.
    # 더 고칠 것이 없을 때까지 돌린다(보통 두세 번이면 멎는다).
    for _round in range(5):
        n = _pass(terms, changes)
        if n == 0:
            break

    TERMS.write_text(json.dumps(terms, ensure_ascii=False, indent=1), encoding="utf-8")
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text("\n".join(changes), encoding="utf-8")

    print(f"띄어쓰기 복원: {len(changes)}건")
    print(f"  목록: {REPORT}")
    for line in changes[:10]:
        print("   ", line)

def _pass(terms, changes) -> int:
    corpus = [t["def"] for t in terms] + [t["summary"] for t in terms if t.get("summary")]
    counts = build_counts(corpus)

    fixed_terms = 0
    for t in terms:
        before = t["def"]
        after = fix_text(before, counts)
        if before != after:
            fixed_terms += 1
            for m in PAIR.finditer(before):
                a, b = m.group(1), m.group(2)
                if _should_join(a, b, counts):
                    changes.append(f"[{t['term']}] '{a} {b}' → '{a}{b}'"
                                   f"  (붙은형 {_support(a, b, counts)}회 / 띄운형 {counts.split[(a,b)]}회)")
            t["def"] = after

        # 글자는 그대로이고 공백만 줄어야 한다
        if before.replace(" ", "") != t["def"].replace(" ", ""):
            sys.exit(f"[{t['term']}] 공백 말고 다른 글자가 바뀌었습니다")

    TERMS.write_text(json.dumps(terms, ensure_ascii=False, indent=1), encoding="utf-8")
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text("\n".join(changes), encoding="utf-8")

    print(f"띄어쓰기 복원: {len(changes)}건 · {fixed_terms}개 용어")
    print(f"  목록: {REPORT}")
    for line in changes[:12]:
        print("   ", line)

if __name__ == "__main__":
    main()
