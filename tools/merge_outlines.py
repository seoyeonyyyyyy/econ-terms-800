"""배치로 작성한 정리본을 terms.json에 병합한다.

정리본은 `라벨 + 내용` 항목 3~5개다. 원문은 그대로 두고 덧붙인다.
정리본이 없는 용어는 지금까지처럼 원문만 보여주므로, 중간에 멈춰도 앱은 멀쩡하다.
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BATCHES = ROOT / "build" / "outlines"
TERMS = ROOT / "data" / "terms.json"

MIN_ITEMS, MAX_ITEMS = 2, 6
MAX_LABEL, MAX_TEXT = 12, 90

def collect() -> dict:
    merged = {}
    if not BATCHES.exists():
        return merged
    for f in sorted(BATCHES.glob("o*.json")):
        part = json.loads(f.read_text(encoding="utf-8"))
        dupes = set(part) & set(merged)
        if dupes:
            sys.exit(f"{f.name}에 중복된 용어가 있습니다: {sorted(dupes)[:5]}")
        merged.update(part)
    return merged

def check(outlines: dict, ids: set) -> list[str]:
    errors = []
    for term, items in outlines.items():
        if term not in ids:
            errors.append(f"[{term}] terms.json에 없는 용어")
            continue
        if not (MIN_ITEMS <= len(items) <= MAX_ITEMS):
            errors.append(f"[{term}] 항목 수가 {MIN_ITEMS}~{MAX_ITEMS}개를 벗어남: {len(items)}")
        for it in items:
            if not isinstance(it, list) or len(it) != 2:
                errors.append(f"[{term}] 항목은 [라벨, 내용] 두 칸이어야 합니다: {it!r}")
                continue
            label, text = it
            if not label or len(label) > MAX_LABEL:
                errors.append(f"[{term}] 라벨 길이가 1~{MAX_LABEL}자를 벗어남: {label!r}")
            if not text or len(text) > MAX_TEXT:
                errors.append(f"[{term}] 내용 길이가 1~{MAX_TEXT}자를 벗어남: {len(text)}자")
    return errors

def main():
    terms = json.loads(TERMS.read_text(encoding="utf-8"))
    ids = {t["id"] for t in terms}
    outlines = collect()

    errors = check(outlines, ids)
    if errors:
        print(f"검증 실패 — {len(errors)}건")
        for e in errors[:20]:
            print("  ", e)
        sys.exit(1)

    for t in terms:
        items = outlines.get(t["id"])
        t["outline"] = [[a, b] for a, b in items] if items else []

    TERMS.write_text(json.dumps(terms, ensure_ascii=False, indent=1), encoding="utf-8")
    done = sum(1 for t in terms if t["outline"])
    print(f"정리본 병합: {done} / {len(terms)}개 ({round(done/len(terms)*100)}%)")

if __name__ == "__main__":
    main()
