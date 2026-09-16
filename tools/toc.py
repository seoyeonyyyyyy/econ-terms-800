"""목차에서 용어 화이트리스트를 추출한다."""
import json, re, sys
from pathlib import Path

# 점선 구분자 + 페이지번호. 이것만 찾고 "구분자 사이의 텍스트"를 이름으로 취한다.
# 이름 쪽을 정규식으로 표현하려 들면 (가운뎃점을 허용하면서) 백트래킹이 폭발한다.
SEP = re.compile(r"·{3,}\s*(\d+)")
NOISE = re.compile(r"^(?:[ㄱ-ㅎ]|[A-Z]|[ivxlIVXL]+|I 경제금융용어 800선|찾아보기.*)$")

def parse_toc(text: str) -> list[tuple[str, int]]:
    start = text.find("찾아보기")
    if start < 0:
        raise ValueError("목차(찾아보기)를 찾을 수 없습니다")

    out: list[tuple[str, int]] = []
    for page in text[start:].split("\f"):
        if not SEP.search(page):
            continue                    # 목차가 아닌 페이지는 건너뛴다
        out.extend(_parse_page(page))
    return out

def _parse_page(page: str) -> list[tuple[str, int]]:
    out: list[tuple[str, int]] = []
    carry = ""                          # 다음 줄로 이어질 제목 앞부분
    for raw in page.split("\n"):
        line = raw.strip()
        if not line or NOISE.match(line):
            continue

        line = carry + line
        carry = ""

        pos = 0
        for m in SEP.finditer(line):
            name = _clean(line[pos:m.start()])
            if name:
                out.append((name, int(m.group(1))))
            pos = m.end()

        # 마지막 구분자 뒤에 남은 꼬리는 다음 줄로 이어지는 제목이다
        tail = line[pos:].strip()
        if tail:
            carry = tail.rstrip("·").strip()
    return out

def _clean(name: str) -> str:
    """앞에 붙은 초성/알파벳 섹션 머리글자와 군더더기를 뗀다."""
    name = name.strip()
    name = re.sub(r"^[ㄱ-ㅎ]\s+", "", name)
    name = re.sub(r"^[A-Z]\s{2,}", "", name)
    return name.strip(" ·")

def main():
    text = Path("build/full.txt").read_text(encoding="utf-8")
    entries = parse_toc(text)
    seen, uniq = set(), []
    for name, page in entries:
        if name not in seen:
            seen.add(name)
            uniq.append({"term": name, "page": page})

    Path("build/toc.json").write_text(
        json.dumps(uniq, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    print(f"목차 항목: {len(uniq)}개 (목표 789)")
    if len(uniq) < 750:
        print(f"너무 적습니다 ({len(uniq)}개). 파싱이 깨진 것으로 보입니다.")
        print("마지막 10개:", [u["term"] for u in uniq[-10:]])
        sys.exit(1)

if __name__ == "__main__":
    main()
