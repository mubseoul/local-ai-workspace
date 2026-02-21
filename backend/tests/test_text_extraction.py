import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.text_extraction import extract_text


class TestExtractPlainText:
    def test_txt_file(self):
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False) as f:
            f.write("Hello, this is a test file.\nSecond line here.")
            f.flush()
            result = extract_text(f.name)
        assert len(result) == 1
        assert result[0][0] == 1
        assert "Hello" in result[0][1]
        assert "Second line" in result[0][1]

    def test_md_file(self):
        with tempfile.NamedTemporaryFile(suffix=".md", mode="w", delete=False) as f:
            f.write("# Heading\n\nSome markdown content.")
            f.flush()
            result = extract_text(f.name)
        assert len(result) == 1
        assert "Heading" in result[0][1]

    def test_empty_file(self):
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False) as f:
            f.write("")
            f.flush()
            result = extract_text(f.name)
        assert result == []

    def test_whitespace_only(self):
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False) as f:
            f.write("   \n\n  \t  ")
            f.flush()
            result = extract_text(f.name)
        assert result == []

    def test_utf8_content(self):
        with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", delete=False, encoding="utf-8") as f:
            f.write("Cześć! Привет! 你好!")
            f.flush()
            result = extract_text(f.name)
        assert len(result) == 1
        assert "Cześć" in result[0][1]

    def test_unsupported_format(self):
        with tempfile.NamedTemporaryFile(suffix=".xyz", mode="w", delete=False) as f:
            f.write("content")
            f.flush()
            try:
                extract_text(f.name)
                assert False, "Should have raised ValueError"
            except ValueError as e:
                assert "Unsupported" in str(e)
