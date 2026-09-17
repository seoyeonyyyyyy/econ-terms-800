"""배치별로 작성한 요약을 data/summaries.json으로 합치고 terms.json에 병합한다."""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BATCHES = ROOT / "build" / "batches"
SUMMARIES = ROOT / "data" / "summaries.json"
TERMS = ROOT / "data" / "terms.json"

MIN_LEN, MAX_LEN = 12, 80

def collect() -> dict:
    merged = {}
    for f in sorted(BATCHES.glob("s*.json")):
        part = json.loads(f.read_text(encoding="utf-8"))
        dupes = set(part) & set(merged)
        if dupes:
            sys.exit(f"{f.name}에 중복된 용어가 있습니다: {sorted(dupes)[:5]}")
        merged.update(part)
    return merged

def main():
    summaries = collect()
    terms = json.loads(TERMS.read_text(encoding="utf-8"))
    ids = {t["id"] for t in terms}

    missing = sorted(ids - set(summaries))
    extra = sorted(set(summaries) - ids)
    if extra:
        sys.exit(f"terms.json에 없는 용어의 요약이 {len(extra)}개 있습니다: {extra[:5]}")
    if missing:
        sys.exit(f"요약이 없는 용어가 {len(missing)}개 있습니다: {missing[:10]}")

    errors = []
    for t in terms:
        s = summaries[t["id"]].strip()
        if not (MIN_LEN <= len(s) <= MAX_LEN):
            errors.append(f"[{t['term']}] 요약 길이 {len(s)}자 (허용 {MIN_LEN}~{MAX_LEN})")
        # 원문을 그대로 베낀 것은 요약이 아니다
        if s and s in t["def"]:
            errors.append(f"[{t['term']}] 요약이 정의문을 그대로 옮겼습니다")
    if errors:
        print(f"검증 실패 — {len(errors)}건")
        for e in errors[:20]:
            print("  ", e)
        sys.exit(1)

    SUMMARIES.write_text(
        json.dumps(summaries, ensure_ascii=False, indent=1), encoding="utf-8")

    for t in terms:
        t["summary"] = summaries[t["id"]].strip()
    TERMS.write_text(
        json.dumps(terms, ensure_ascii=False, indent=1), encoding="utf-8")

    lens = sorted(len(s) for s in summaries.values())
    print(f"요약 병합 완료: {len(summaries)}개")
    print(f"  길이 — 최소 {lens[0]}자, 중앙값 {lens[len(lens)//2]}자, 최대 {lens[-1]}자")

if __name__ == "__main__":
    main()
