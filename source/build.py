"""반복 구조 학습실 빌드: src와 vendor를 합쳐 한 장짜리 html을 만든다.
나오는 파일
- out/repetition-lab.html : claude.ai 아티팩트에 올리는 본문(문서 머리 없음)
- out/test.html           : 검사용 단독 파일
- ../index.html           : GitHub Pages 배포 파일(검색 노출 막음)
"""
import base64, pathlib
ROOT = pathlib.Path(__file__).resolve().parent
src, vendor, out = ROOT / "src", ROOT / "vendor", ROOT / "out"
out.mkdir(exist_ok=True)
css = (src / "styles.css").read_text(encoding="utf-8")
font64 = base64.b64encode((vendor / "pretendard-gov-sub.woff2").read_bytes()).decode()
css = css.replace("/*FONT*/", '@font-face{font-family:"Pretendard GOV"; src:url(data:font/woff2;base64,' + font64 + ') format("woff2"); font-weight:400 700; font-style:normal; font-display:swap}')
js = "(function(){\n" + "\n".join((src / f).read_text(encoding="utf-8") for f in ["data.js", "app-core.js", "app-lab.js", "app-shell.js", "app-agent.js"]) + "\n})();"
page = (src / "body.html").read_text(encoding="utf-8").replace("/*CSS*/", css).replace("/*JS*/", js)
if "codeLab: true" in (src / "data.js").read_text(encoding="utf-8"):
    lib = (vendor / "JSCPP.es5.min.js").read_text(encoding="utf-8")
    assert "</script" not in lib.lower()
    lib = lib.replace("\ufffd", "\\ufffd")
    i = page.rfind("<script")
    page = page[:i] + '<script type="text/plain" id="jscppLib">' + lib + "</script>\n" + page[i:]
head = '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
(out / "repetition-lab.html").write_text(page, encoding="utf-8")
(out / "test.html").write_text(head + "</head><body>" + page + "</body></html>", encoding="utf-8")
(out / "bundle.js").write_text(js, encoding="utf-8")
(ROOT.parent / "index.html").write_text(head + '<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#ffffff"></head><body>' + page + "</body></html>", encoding="utf-8")
print("built", len(page.encode("utf-8")), "bytes")
