"""PDF에서 텍스트를 추출한다. 페이지 구분은 \\f."""
import subprocess, sys
from pathlib import Path

PDF = Path("2026_경제금융용어 800선.pdf")
OUT = Path("build/full.txt")

def main():
    if not PDF.exists():
        sys.exit(f"PDF를 찾을 수 없습니다: {PDF}")
    OUT.parent.mkdir(exist_ok=True)
    subprocess.run(
        ["pdftotext", "-enc", "UTF-8", str(PDF), str(OUT)],
        check=True,
    )
    text = OUT.read_text(encoding="utf-8")
    pages = text.count("\f")
    print(f"추출 완료: {len(text):,}자, {pages}페이지")
    if pages < 400:
        sys.exit(f"페이지 수가 비정상입니다: {pages} (예상 423)")

if __name__ == "__main__":
    main()
