import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def extract_text(file_path: str) -> list[tuple[int, str]]:
    """Extract text from a file. Returns list of (page_number, text) tuples."""
    path = Path(file_path)
    ext = path.suffix.lower()

    extractors = {
        ".pdf": _extract_pdf,
        ".txt": _extract_plain,
        ".md": _extract_plain,
        ".docx": _extract_docx,
    }

    extractor = extractors.get(ext)
    if not extractor:
        raise ValueError(f"Unsupported file type: {ext}")

    return extractor(path)


def _extract_pdf(path: Path) -> list[tuple[int, str]]:
    from pypdf import PdfReader

    reader = PdfReader(str(path))
    pages = []
    for i, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        text = text.strip()
        if text:
            pages.append((i + 1, text))
    return pages


def _extract_plain(path: Path) -> list[tuple[int, str]]:
    import chardet

    raw = path.read_bytes()
    detected = chardet.detect(raw)
    encoding = detected.get("encoding", "utf-8") or "utf-8"

    try:
        text = raw.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        text = raw.decode("utf-8", errors="replace")

    text = text.strip()
    if text:
        return [(1, text)]
    return []


def _extract_docx(path: Path) -> list[tuple[int, str]]:
    from docx import Document

    doc = Document(str(path))
    full_text = []
    for paragraph in doc.paragraphs:
        if paragraph.text.strip():
            full_text.append(paragraph.text)

    text = "\n".join(full_text).strip()
    if text:
        return [(1, text)]
    return []
