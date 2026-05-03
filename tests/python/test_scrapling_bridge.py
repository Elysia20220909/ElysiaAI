import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))

from lib.scrapling_bridge import extract_html  # noqa: E402


def test_extract_html_prefers_readable_content():
    page = extract_html(
        """
        <html>
          <head>
            <title>Sample Page</title>
            <meta name="description" content="Short summary">
            <style>.hidden { display: none; }</style>
          </head>
          <body>
            <main>
              <h1>Hello Elysia</h1>
              <p>Scrapling makes page extraction sturdier.</p>
            </main>
            <script>window.secret = "ignore me";</script>
          </body>
        </html>
        """,
        "https://example.test/page",
    )

    assert page.url == "https://example.test/page"
    assert page.title == "Sample Page"
    assert page.description == "Short summary"
    assert "Hello Elysia" in page.text
    assert "Scrapling makes page extraction sturdier." in page.text
    assert "ignore me" not in page.text
