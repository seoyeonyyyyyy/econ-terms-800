"""용어 상세를 읽기 쉽게 보강한다 — 문단 나누기, 영문명, 계산식, 그래프 지정.

원문 글자는 바꾸지 않는다. 끊어 주고, 뽑아내고, 이름을 찾아 붙일 뿐이다.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TERMS = ROOT / "data" / "terms.json"

SENT_END = re.compile(r"(?<=다\.)\s+")
# 용어명 끝의 영문 약자: 국내총생산(GDP)
ABBR_IN_TERM = re.compile(r"\(([A-Z][A-Za-z0-9&+./-]{1,14})\)\s*$")

# 그림이 있으면 확실히 쉬워지는 용어만. 장식용 그림은 그리지 않는다.
GRAPHS = {
    "로렌츠곡선": "lorenz",
    "래퍼곡선": "laffer",
    "필립스곡선": "phillips",
    "수익률곡선": "yieldcurve",
    "베버리지곡선": "beveridge",
    "J커브효과": "jcurve",
    "경기": "cycle",
    "수요탄력성": "elasticity",
    "규모의 경제": "scale",
    "GDP갭": "gdpgap",
    "통화정책 파급경로": "transmission",
    "신용창조": "creation",
    "국제수지(BOP)": "bop",
    "지급결제시스템": "settlement",
    "수요견인 인플레이션": "demandpull",
    "비용인상 인플레이션": "costpush",
    "예대금리차(예대마진)": "spread",
    "기회비용": "opportunity",
    "자산유동화": "abs",
    "듀레이션": "duration",
}

def split_paragraphs(text: str, per_para: int = 3, max_chars: int = 250) -> str:
    """문단을 끊는다. 글자는 그대로 둔다.

    문장 개수가 아니라 글자 수로 끊는다. 이 자료는 한 문장이 200자를 넘는 일이 흔해서
    "네 문장까지는 한 문단" 같은 규칙으로는 578자짜리가 통째로 남는다(실측 23건).
    """
    sentences = [s for s in SENT_END.split(text.strip()) if s]
    if len(sentences) <= 1:
        return text.strip()

    paras, buf = [], []
    for s in sentences:
        buf.append(s)
        joined = " ".join(buf)
        if len(buf) >= per_para or len(joined) >= max_chars:
            paras.append(joined)
            buf = []
    if buf:
        paras.append(" ".join(buf))
    return "\n\n".join(paras)

def extract_formulas(text: str) -> tuple[str, list[str]]:
    """독립된 수식 조각을 뽑아낸다.

    문장 한가운데의 등호(`100 = 기준값`)는 건드리지 않는다.
    수식은 보통 `이름 = 식` 꼴로 문장 끝에 따로 붙어 있다.
    """
    formulas = []
    body = text

    # "<이름>(%) = ..." 또는 "<이름> = ..." 이 문장 끝까지 이어지는 꼴
    pat = re.compile(r"(?:(?<=\.)|(?<=^)|(?<=\n))\s*([^.\n]{2,40}?\s*=\s*[^.\n]{4,200})(?=\s*(?:$|\n))")
    for m in list(pat.finditer(body)):
        frag = m.group(1).strip()
        if "=" not in frag:
            continue
        pieces = _split_and_clean(frag)
        if not pieces:
            continue
        # 조각 일부를 버렸다면 본문을 건드리지 않는다.
        # 버린 글자만큼 원문이 사라져 정의문이 훼손된다.
        if _squash(pieces) != _squash([frag]):
            continue
        formulas.extend(pieces)
        body = body.replace(m.group(0), " ", 1)

    body = re.sub(r"\s{2,}", " ", body).strip()
    # 뽑아내고 나서 문장이 깨졌으면 되돌린다
    if formulas and re.search(r"(을|를|의|에|로|와|과|및|또는)$", body):
        return text, []
    return body, formulas

# 한 줄에 식이 여러 개 붙어 나온다: "고용률(%) = … × 100 실업률(%) = … × 100"
NEXT_FORMULA = re.compile(r"\s+(?=[가-힣A-Z][가-힣A-Za-z0-9()%\s]{1,24}\s*=)")
# PDF가 분수를 세로로 조판해 순서가 뒤엉킨 것: "경제활동참가율 = ×100 15세 이상 인구"
BROKEN = re.compile(r"=\s*[×÷/]")

def _squash(parts) -> str:
    return "".join("".join(p.split()) for p in parts)

def _split_and_clean(fragment: str) -> list[str]:
    """붙어 있는 식을 나누고, 조판이 깨진 것은 버린다."""
    out = []
    for piece in NEXT_FORMULA.split(fragment):
        piece = piece.strip()
        if "=" not in piece or BROKEN.search(piece):
            continue
        if len(piece) < 8 or len(piece) > 160:
            continue
        out.append(piece)
    return out

def resolve_alt(term: str, definition: str) -> str | None:
    """용어명 옆에 쓸 영문명. 원문에 있는 것만 쓴다."""
    m = ABBR_IN_TERM.search(term)
    if m:
        abbr = m.group(1)
        esc = re.escape(abbr)
        # 1) "GDP; Gross Domestic Product"
        full = re.search(esc + r"\s*[;:]\s*([A-Za-z][A-Za-z0-9 .,&/'-]{4,60})", definition)
        # 2) "Gross Domestic Product(GDP)"
        if not full:
            full = re.search(r"([A-Z][A-Za-z0-9 .,&/'-]{4,60}?)\s*\(" + esc + r"\)", definition)
        if full:
            return f"{abbr} · {full.group(1).strip().rstrip(',.')}"
        return abbr

    # 용어명 바로 뒤 괄호 영문만 인정한다.
    # 정의문 아무 데나 있는 괄호를 가져오면 엉뚱한 약어가 붙는다.
    head = re.escape(term) + r"\s*\(([A-Za-z][A-Za-z0-9 .,&/'-]{2,60})\)"
    m = re.search(head, definition)
    if m:
        return m.group(1).strip().rstrip(",.")
    return None

def main():
    terms = json.loads(TERMS.read_text(encoding="utf-8"))
    stats = {"alt": 0, "formulas": 0, "graph": 0, "para": 0}

    for t in terms:
        # 다시 돌려도 같은 결과가 나오도록 지난번에 뽑아낸 것을 도로 합친다.
        # 합치지 않으면 두 번째 실행에서 수식이 이미 빠져 있어 0개가 된다.
        raw = re.sub(r"\n{2,}", " ", t["def"]).strip()
        prev = t.get("formulas") or []
        if prev:
            raw = (raw + " " + " ".join(prev)).strip()

        body, formulas = extract_formulas(raw)
        t["formulas"] = formulas
        if formulas:
            stats["formulas"] += 1

        t["def"] = split_paragraphs(body)
        if "\n\n" in t["def"]:
            stats["para"] += 1

        alt = resolve_alt(t["term"], raw)
        t["alt"] = alt
        if alt:
            stats["alt"] += 1

        g = GRAPHS.get(t["term"])
        t["graph"] = g
        if g:
            stats["graph"] += 1

        # 원문이 훼손되지 않았는지 그 자리에서 확인한다
        before = "".join(raw.split())
        after = "".join((t["def"] + " " + " ".join(formulas)).split())
        if sorted(before) != sorted(after):
            sys.exit(f"[{t['term']}] 보강 과정에서 원문 글자가 바뀌었습니다")

    TERMS.write_text(json.dumps(terms, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"보강 완료: {len(terms)}개")
    print(f"  영문명 {stats['alt']}개 · 계산식 {stats['formulas']}개 "
          f"· 그래프 {stats['graph']}개 · 문단 나뉨 {stats['para']}개")

if __name__ == "__main__":
    main()
