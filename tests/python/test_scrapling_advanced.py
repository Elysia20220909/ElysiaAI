import json
import unittest
from python.lib.scrapling_bridge import extract_html

class TestScraplingAdvanced(unittest.TestCase):
    def test_ai_targeted_extraction(self):
        html = """
        <html>
            <head><title>Test Page</title></head>
            <body>
                <nav><ul><li>Link</li></ul></nav>
                <main>
                    <h1>Core Content</h1>
                    <p>This is the important part.</p>
                    <script>console.log('noise');</script>
                    <style>.noise { color: red; }</style>
                </main>
                <aside>Sidebar noise</aside>
                <footer>Footer noise</footer>
            </body>
        </html>
        """
        # Test standard extraction (currently extracts the whole body if main_content_only=False)
        result_std = extract_html(html, "http://example.com", main_content_only=False)
        self.assertIn("Core Content", result_std.text)
        self.assertIn("Footer noise", result_std.text) 

        # Test AI-targeted extraction
        result_ai = extract_html(html, "http://example.com", main_content_only=True)
        self.assertIn("Core Content", result_ai.text)
        self.assertIn("This is the important part.", result_ai.text)
        self.assertNotIn("console.log", result_ai.text)
        self.assertNotIn("Sidebar noise", result_ai.text) # Convertor cleans these up in AI-targeted mode
        self.assertNotIn("Footer noise", result_ai.text)
        self.assertEqual(result_ai.engine, "scrapling-selector")

    def test_markdown_extraction(self):
        html = "<body><h1>Title</h1><p>Paragraph</p></body>"
        result = extract_html(html, "http://example.com", extraction_type="markdown")
        # Support both ATX (# Title) and Setext (Title\n====) styles
        self.assertTrue("# Title" in result.text or "Title\n=====" in result.text)
        self.assertIn("Paragraph", result.text)

if __name__ == "__main__":
    unittest.main()
