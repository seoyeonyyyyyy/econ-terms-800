"""배포용 단일 HTML을 만든다.

Artifact와 공개 링크는 상대 경로 asset을 올려주지 않으므로 전부 인라인해야 한다.
ES 모듈 import를 걷어내고 한 스코프로 합친다. 빌드 도구는 쓰지 않는다.
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "build" / "econ-terms.html"

# 의존 순서대로. store → filter → quiz(순수 로직) → 화면들 → app
MODULES = [
    "js/store.js", "js/filter.js", "js/quiz.js",
    "js/list.js", "js/session.js", "js/quiz-ui.js", "js/stats.js",
    "js/app.js",
]

def strip_modules(src: str) -> str:
    """import/export 구문을 제거한다. 한 스코프로 합치므로 필요 없다."""
    src = re.sub(r"^\s*import\s[^;]+;\s*$", "", src, flags=re.M)
    src = re.sub(r"^\s*export\s+(?=(function|const|let|class))", "", src, flags=re.M)
    src = re.sub(r"^\s*export\s+\{[^}]*\};\s*$", "", src, flags=re.M)
    return src

def main():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
    terms = json.loads((ROOT / "data" / "terms.json").read_text(encoding="utf-8"))

    js = "\n".join(strip_modules((ROOT / m).read_text(encoding="utf-8")) for m in MODULES)

    # 각 모듈의 init()은 app.js가 동적 import로 부르던 것이라 직접 호출로 바꾼다
    js = js.replace(
        "  const modules = await Promise.all([\n"
        '    import("./list.js").catch(() => null),\n'
        '    import("./session.js").catch(() => null),\n'
        '    import("./quiz-ui.js").catch(() => null),\n'
        '    import("./stats.js").catch(() => null),\n'
        "  ]);\n"
        "  for (const m of modules) m?.init?.();",
        "  initList(); initSession(); initQuiz(); initStats();"
    )

    # 같은 이름의 init이 넷이라 모듈별로 이름을 바꾼다
    for src, name in [("js/list.js", "initList"), ("js/session.js", "initSession"),
                      ("js/quiz-ui.js", "initQuiz"), ("js/stats.js", "initStats")]:
        body = strip_modules((ROOT / src).read_text(encoding="utf-8"))
        js = js.replace(body, body.replace("function init()", f"function {name}()"), 1)

    html = html.replace('<link rel="stylesheet" href="css/style.css">', f"<style>\n{css}\n</style>")
    html = html.replace('<link rel="manifest" href="manifest.json">', "")
    html = html.replace(
        '<script type="module" src="js/app.js"></script>',
        "<script>\nglobalThis.TERMS_INLINE = "
        + json.dumps(terms, ensure_ascii=False, separators=(",", ":"))
        + ";\n" + js + "\n</script>"
    )

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    size = OUT.stat().st_size
    print(f"번들 완료: {OUT} ({size / 1024 / 1024:.2f} MB)")
    if size > 15 * 1024 * 1024:
        print("경고: 16MB 제한에 근접합니다")

    # Artifact는 doctype/html/head/body 껍데기를 발행 시점에 씌운다.
    # 그대로 올리면 태그가 중첩되므로 알맹이만 남긴 판을 따로 만든다.
    inner = html
    inner = re.sub(r"<!doctype html>\s*", "", inner, flags=re.I)
    inner = re.sub(r"</?html[^>]*>\s*", "", inner, flags=re.I)
    inner = re.sub(r"</?head[^>]*>\s*", "", inner, flags=re.I)
    inner = re.sub(r"</?body[^>]*>\s*", "", inner, flags=re.I)
    inner = re.sub(r'<meta charset[^>]*>\s*', "", inner, flags=re.I)
    inner = re.sub(r'<meta name="viewport"[^>]*>\s*', "", inner, flags=re.I)
    art = OUT.with_name("econ-terms.artifact.html")
    art.write_text(inner, encoding="utf-8")
    print(f"Artifact 판 : {art} ({art.stat().st_size / 1024 / 1024:.2f} MB)")

if __name__ == "__main__":
    main()
