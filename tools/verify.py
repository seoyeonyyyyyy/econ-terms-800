"""data/terms.json을 검증한다. 스펙 §9 데이터 항목."""
import json, re, sys
from collections import Counter
from pathlib import Path

VALID = {
    "경제상식": {"물가·인플레이션", "경기·경기지표", "성장·국민계정", "재정·조세", "노동·산업"},
    "금융상식": {"통화정책", "금융시장", "금융기관·감독", "금융안정·리스크", "지급결제·디지털금융"},
    "국제·외환": {"외환·환율", "국제수지·무역", "국제기구·협정"},
    "경영·회계": {"회계·재무", "기업경영"},
}
NOISE = ["경제금융용어 800선"]
# 잘림 판정은 "끝나도 되는 꼴"을 열거하는 대신 "끝나면 안 되는 꼴"을 본다.
# 정의는 수식(= 임금 + 지대 + 이윤)이나 명사형(허용되지 않음), 표 내용으로도 끝나므로
# 허용 목록 방식은 멀쩡한 항목을 대량으로 잡아낸다(실측 오탐 9건).
# 진짜 잘림의 신호는 조사·접속어로 끝나는 것이다.
BAD_END = re.compile(r"(을|를|의|에|로|으로|와|과|및|또는|에서|에게|보다|처럼|만큼)$")
LOWER_BOUND = 750

def check(terms: list[dict]) -> list[str]:
    errors = []

    # 개수는 느슨하게 — 하한만 본다
    if len(terms) < LOWER_BOUND:
        errors.append(f"용어 수가 하한 {LOWER_BOUND} 미만: {len(terms)}")

    ids = [t["id"] for t in terms]
    dupes = [i for i, n in Counter(ids).items() if n > 1]
    if dupes:
        errors.append(f"id 중복 {len(dupes)}건: {dupes[:10]}")

    id_set = set(ids)
    for t in terms:
        term, d = t["term"], t["def"]

        if len(d) < 50:
            errors.append(f"[{term}] 정의가 50자 미만: {len(d)}자")
        for n in NOISE:
            if n in d:
                errors.append(f"[{term}] 정의에 노이즈 '{n}' 포함")
        if re.search(r"(^|\s)[ㄱ-ㅎ](\s|$)", d):
            errors.append(f"[{term}] 정의에 단독 초성 포함")
        if BAD_END.search(d.strip()):
            errors.append(f"[{term}] 정의가 조사에서 끊김: …{d[-25:]!r}")

        for r in t["related"]:
            if r not in id_set:
                errors.append(f"[{term}] related '{r}'가 존재하지 않는 id")

        cat, sub = t["category"], t["subcategory"]
        if cat not in VALID:
            errors.append(f"[{term}] 알 수 없는 대분류: {cat}")
        elif sub not in VALID[cat]:
            errors.append(f"[{term}] 대분류 {cat}에 없는 소분류: {sub}")

        if not t["chosung"] and re.search(r"[가-힣]", term):
            errors.append(f"[{term}] 한글 용어인데 초성이 비어 있음")

        if "/" in term and not t["aliases"]:
            errors.append(f"[{term}] 묶음 표제어인데 aliases가 비어 있음")

        summary = t.get("summary", "")
        if not summary:
            errors.append(f"[{term}] 요약이 없음")
        elif not (12 <= len(summary) <= 80):
            errors.append(f"[{term}] 요약 길이가 12~80자를 벗어남: {len(summary)}자")
        elif summary in d:
            errors.append(f"[{term}] 요약이 정의문을 그대로 옮김")

    return errors

def main():
    terms = json.loads(Path("data/terms.json").read_text(encoding="utf-8"))
    errors = check(terms)

    if errors:
        print(f"검증 실패 — {len(errors)}건")
        for e in errors[:40]:
            print("  ", e)
        if len(errors) > 40:
            print(f"   … 외 {len(errors) - 40}건")
        sys.exit(1)

    print(f"검증 통과 — {len(terms)}개")
    by_cat = Counter(t["category"] for t in terms)
    for cat, n in by_cat.most_common():
        print(f"  {cat:8s} {n:4d}")

if __name__ == "__main__":
    main()
