"""본문에서 용어별 정의를 추출한다."""
import json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from tools.schema import build_record

HEADER = "I 경제금융용어 800선"
PAGE_NO = re.compile(r"^\d{1,3}$")
CHOSUNG_ONLY = re.compile(r"^[ㄱ-ㅎ]$")
ROMAN_NO = re.compile(r"^[ivxl]{1,6}$", re.I)
SIDE_INDEX = re.compile(r"^[ㄱ-ㅎ]\s+|\s+[ㄱ-ㅎ]$")
RELATED = re.compile(r"^연관검색어\s*(.+)$", re.M)
# 문장이 끝났다고 볼 수 있는 꼬리
CLOSED = re.compile(r"[.)%\d]$|다$")

def clean_lines(page_text: str, running_heads: set[str] | None = None) -> list[str]:
    # 측면 초성 인덱스가 줄머리나 줄끝에 달라붙는다 ("ㅇ 외국환포지션", "…개인들로부 ㅋ").
    # 단독 줄로만 걸러내면 용어명을 못 알아보고 정의에도 찌꺼기가 남는다.
    lines = [SIDE_INDEX.sub("", ln.strip()).strip() for ln in page_text.split("\n")]
    kept = [
        ln for ln in lines
        if ln and ln != HEADER and not PAGE_NO.match(ln)
        and not ROMAN_NO.match(ln) and not CHOSUNG_ONLY.match(ln)
    ]
    if not kept:
        return []

    # 러닝 헤드 판별: 첫 줄이 용어명이고, 같은 페이지 아래에 그 이름이 한 번 더 나오면
    # 첫 줄은 머리글이다. 한 번뿐이라면 그게 진짜 용어이므로 버리면 안 된다
    # (버리면 페이지 맨 위에서 시작하는 용어가 통째로 사라진다 — 실측 89건).
    if running_heads and kept[0] in running_heads and kept[0] in kept[1:]:
        return kept[1:]
    return kept

def join_wrapped(lines: list[str]) -> str:
    if not lines:
        return ""
    buf = [lines[0]]
    for ln in lines[1:]:
        if CLOSED.search(buf[-1]):
            buf.append(ln)                      # 앞 줄이 끝났으면 새 조각
        else:
            buf[-1] = buf[-1] + " " + ln        # 안 끝났으면 이어 붙인다
    return " ".join(buf)

def split_related(body: str) -> tuple[str, list[str]]:
    m = RELATED.search(body)
    if not m:
        return body.strip(), []
    related = [t.strip() for t in m.group(1).split(",") if t.strip()]
    definition = (body[: m.start()] + body[m.end():]).strip()
    return definition, related

def _prefix_index(names) -> dict[str, list[str]]:
    """이름 앞 두 글자로 버킷을 만든다. 줄마다 789개를 전부 훑지 않기 위해서다."""
    idx: dict[str, list[str]] = {}
    for n in names:
        idx.setdefault(n[:2], []).append(n)
    for bucket in idx.values():
        bucket.sort(key=len, reverse=True)    # 긴 이름을 먼저 맞춰 본다
    return idx

def _match_name(line: str, names, by_prefix: dict[str, list[str]]) -> str | None:
    """줄이 용어명이거나 용어명으로 시작하면 그 이름을 돌려준다.

    레이아웃에 따라 용어명이 단독 줄이 아니라 정의 첫 줄에 붙어 나온다
    ("크라우드펀딩 크라우드펀딩(Crowd Funding)은 …"). 단독 줄만 찾으면 이런 항목을 통째로 놓친다.
    """
    if line in names:
        return line
    for cand in by_prefix.get(line[:2], ()):
        if len(line) > len(cand) and line.startswith(cand) and line[len(cand)] == " ":
            return cand
    return None

def pick_marks(cands: list[tuple[int, str]], total: int) -> list[tuple[int, str]]:
    """같은 용어가 여러 번 걸리면 뒤따르는 본문이 가장 긴 등장을 고른다.

    첫 등장을 쓰면 안 된다. 러닝 헤드가 다음 페이지의 용어를 미리 가리키는 경우가 있어
    첫 등장이 머리글일 수 있고, 그러면 정의가 비거나 옆 용어의 꼬리가 붙는다(실측 7건).
    머리글 바로 다음 줄에는 다른 용어가 오므로 간격이 짧아 자연히 탈락한다.
    """
    if not cands:
        return []
    spans = [
        (cands[k + 1][0] if k + 1 < len(cands) else total) - i
        for k, (i, _) in enumerate(cands)
    ]
    best: dict[str, int] = {}
    for k, (_, name) in enumerate(cands):
        if name not in best or spans[k] > spans[best[name]]:
            best[name] = k
    return [cands[k] for k in sorted(best.values())]

def extract(text: str, toc: list[dict]) -> list[dict]:
    """목차를 정답지로 삼아 본문을 용어 단위로 자른다."""
    names = {e["term"]: e["page"] for e in toc}
    pages = text.split("\f")

    flat: list[tuple[str, int]] = []          # (줄, 본문 페이지 인덱스)
    for pno, page in enumerate(pages, start=1):
        for ln in clean_lines(page, running_heads=set(names)):
            flat.append((ln, pno))

    # 본문 시작점: 첫 용어가 단독 줄로 나오는 마지막 지점(목차의 동명 항목을 건너뛴다)
    first = toc[0]["term"]
    starts = [i for i, (ln, _) in enumerate(flat) if ln == first]
    if not starts:
        raise ValueError(f"본문 시작 용어를 찾을 수 없습니다: {first}")
    start = starts[-1] if len(starts) > 1 else starts[0]

    # 용어 경계 탐지 — 이름이 줄머리에 오고 목차 페이지와 가까울 때
    by_prefix = _prefix_index(names)
    marks: list[tuple[int, str]] = []
    offset = None
    for i in range(start, len(flat)):
        ln, pno = flat[i]
        name = _match_name(ln, names, by_prefix)
        if name is None:
            continue
        if offset is None:
            offset = pno - names[name]        # 본문 쪽수와 인쇄 쪽수의 차이
        if abs((pno - offset) - names[name]) <= 1:
            marks.append((i, name))

    uniq_marks = pick_marks(marks, len(flat))

    out = []
    for k, (i, name) in enumerate(uniq_marks):
        end = uniq_marks[k + 1][0] if k + 1 < len(uniq_marks) else len(flat)
        # 용어명이 정의 첫 줄에 붙어 있으면 그 나머지가 정의의 시작이다
        head = flat[i][0]
        rest = head[len(name):].strip() if head != name else ""
        body = join_wrapped(([rest] if rest else []) + [ln for ln, _ in flat[i + 1: end]])
        definition, related = split_related(body)
        out.append({
            "term": name,
            "def": definition,
            "related": related,
            "page": names[name],
        })
    return out

def main():
    text = Path("build/full.txt").read_text(encoding="utf-8")
    toc = json.loads(Path("build/toc.json").read_text(encoding="utf-8"))
    terms = extract(text, toc)

    # related는 실제 존재하는 용어만 남긴다
    valid = {t["term"] for t in terms}
    for t in terms:
        t["related"] = [r for r in t["related"] if r in valid]

    terms = [build_record(t) for t in terms]

    Path("build/raw_terms.json").write_text(
        json.dumps(terms, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"추출: {len(terms)}개 / 목차 {len(toc)}개")

    # 누락은 기록만 하고 통과시킨다 — 개수는 느슨하게
    missing = sorted({e["term"] for e in toc} - {t["term"] for t in terms})
    Path("build/missing.txt").write_text("\n".join(missing), encoding="utf-8")
    if missing:
        print(f"누락 {len(missing)}개 (build/missing.txt에 기록):", missing[:10])
    if len(terms) < 750:
        print(f"추출이 너무 적습니다: {len(terms)}개")
        sys.exit(1)

    ids = [t["term"] for t in terms]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        print("id 중복:", sorted(dupes))
        sys.exit(1)

    # 품질은 엄격하게 — 정의가 잘린 것은 개수와 무관한 문제다
    short = [t["term"] for t in terms if len(t["def"]) < 50]
    if short:
        print(f"정의가 짧은 항목 {len(short)}개:", short[:20])
        sys.exit(1)

if __name__ == "__main__":
    main()
