"""용어 레코드 스키마 조립."""
import re

CHO = list("ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ")
HANGUL_BASE = 0xAC00
HANGUL_LAST = 0xD7A3

def chosung(s: str) -> str:
    out = []
    for ch in s:
        code = ord(ch)
        if HANGUL_BASE <= code <= HANGUL_LAST:
            out.append(CHO[(code - HANGUL_BASE) // 588])
    return "".join(out)

def extract_alt(term: str, definition: str) -> str | None:
    # 1순위: 용어명 자체의 괄호 안 약어
    m = re.search(r"\(([A-Za-z][A-Za-z0-9 .;/&'-]{1,40})\)", term)
    if m:
        return m.group(1).strip()
    # 2순위: 정의 첫머리에서 "용어명(English)" 형태
    head = definition[:120]
    m = re.search(r"\(([A-Za-z][A-Za-z0-9 .;/&'-]{2,40})\)", head)
    if m:
        return m.group(1).strip()
    return None

def split_aliases(term: str) -> list[str]:
    """'단리/복리'처럼 묶인 표제어를 조각낸다. 레코드는 쪼개지 않고 검색용으로만 쓴다."""
    if "/" not in term:
        return []
    return [p.strip() for p in term.split("/") if p.strip()]

def build_record(raw: dict) -> dict:
    term = raw["term"]
    return {
        "id": term,
        "term": term,
        "alt": extract_alt(term, raw["def"]),
        "aliases": split_aliases(term),
        "chosung": chosung(term),
        "def": raw["def"],
        "related": raw["related"],
        "category": None,       # Task 5에서 채운다
        "subcategory": None,
        "page": raw["page"],
    }
