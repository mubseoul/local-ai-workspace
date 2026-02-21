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
        ".md": _extract_markdown,
        ".docx": _extract_docx,
        ".epub": _extract_epub,
        ".html": _extract_html,
        ".htm": _extract_html,
        ".csv": _extract_csv,
        ".xlsx": _extract_excel,
        ".xls": _extract_excel,
        # Source code files
        ".py": _extract_source_code,
        ".js": _extract_source_code,
        ".ts": _extract_source_code,
        ".tsx": _extract_source_code,
        ".jsx": _extract_source_code,
        ".rs": _extract_source_code,
        ".go": _extract_source_code,
        ".java": _extract_source_code,
        ".cpp": _extract_source_code,
        ".c": _extract_source_code,
        ".h": _extract_source_code,
        ".hpp": _extract_source_code,
        ".rb": _extract_source_code,
        ".php": _extract_source_code,
        ".swift": _extract_source_code,
        ".kt": _extract_source_code,
        ".sql": _extract_source_code,
        ".sh": _extract_source_code,
        ".yaml": _extract_source_code,
        ".yml": _extract_source_code,
        ".json": _extract_source_code,
        ".xml": _extract_source_code,
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


def _extract_markdown(path: Path) -> list[tuple[int, str]]:
    """Extract text from Markdown with frontmatter parsing."""
    import yaml
    import chardet

    raw = path.read_bytes()
    detected = chardet.detect(raw)
    encoding = detected.get("encoding", "utf-8") or "utf-8"

    try:
        content = raw.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        content = raw.decode("utf-8", errors="replace")

    # Parse frontmatter
    frontmatter_data = {}
    text = content

    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            try:
                frontmatter_data = yaml.safe_load(parts[1])
                text = parts[2].strip()
            except Exception as e:
                logger.warning(f"Failed to parse frontmatter: {e}")

    # Include frontmatter metadata in the text
    if frontmatter_data:
        metadata_text = "\n".join(
            f"{key}: {value}" for key, value in frontmatter_data.items()
        )
        text = f"{metadata_text}\n\n{text}"

    if text.strip():
        return [(1, text.strip())]
    return []


def _extract_epub(path: Path) -> list[tuple[int, str]]:
    """Extract text from EPUB e-books."""
    try:
        import ebooklib
        from ebooklib import epub
        from bs4 import BeautifulSoup
    except ImportError:
        logger.error("ebooklib not installed. Install with: pip install ebooklib beautifulsoup4")
        return []

    try:
        book = epub.read_epub(str(path))
    except Exception as e:
        logger.error(f"Failed to read EPUB: {e}")
        return []

    chapters = []
    chapter_num = 1

    for item in book.get_items():
        if item.get_type() == ebooklib.ITEM_DOCUMENT:
            soup = BeautifulSoup(item.get_content(), 'html.parser')
            text = soup.get_text(separator='\n', strip=True)

            if text.strip():
                chapters.append((chapter_num, text.strip()))
                chapter_num += 1

    return chapters


def _extract_html(path: Path) -> list[tuple[int, str]]:
    """Extract text from HTML files."""
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        logger.error("beautifulsoup4 not installed. Install with: pip install beautifulsoup4")
        return []

    import chardet

    raw = path.read_bytes()
    detected = chardet.detect(raw)
    encoding = detected.get("encoding", "utf-8") or "utf-8"

    try:
        html = raw.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        html = raw.decode("utf-8", errors="replace")

    soup = BeautifulSoup(html, 'html.parser')

    # Remove script and style elements
    for script in soup(["script", "style"]):
        script.decompose()

    # Get text
    text = soup.get_text(separator='\n', strip=True)

    # Clean up whitespace
    lines = [line.strip() for line in text.splitlines()]
    text = '\n'.join(line for line in lines if line)

    if text.strip():
        return [(1, text.strip())]
    return []


def _extract_csv(path: Path) -> list[tuple[int, str]]:
    """Extract text from CSV files with column awareness."""
    try:
        import pandas as pd
    except ImportError:
        logger.error("pandas not installed. Install with: pip install pandas")
        return []

    try:
        df = pd.read_csv(str(path))
    except Exception as e:
        logger.error(f"Failed to read CSV: {e}")
        return []

    # Convert DataFrame to readable text
    text_parts = []

    # Add column names
    text_parts.append("Columns: " + ", ".join(df.columns))

    # Add data summary
    text_parts.append(f"\nTotal rows: {len(df)}")

    # Add first few rows as examples
    text_parts.append("\nSample data:")
    text_parts.append(df.head(10).to_string(index=False))

    # Add column statistics if numeric
    numeric_cols = df.select_dtypes(include=['number']).columns
    if len(numeric_cols) > 0:
        text_parts.append("\nNumeric column statistics:")
        text_parts.append(df[numeric_cols].describe().to_string())

    text = "\n".join(text_parts)

    if text.strip():
        return [(1, text.strip())]
    return []


def _extract_excel(path: Path) -> list[tuple[int, str]]:
    """Extract text from Excel files."""
    try:
        import pandas as pd
    except ImportError:
        logger.error("pandas not installed. Install with: pip install pandas openpyxl")
        return []

    try:
        # Read all sheets
        excel_file = pd.ExcelFile(str(path))
        sheets = []

        for sheet_name in excel_file.sheet_names:
            df = pd.read_excel(excel_file, sheet_name=sheet_name)

            text_parts = [f"Sheet: {sheet_name}"]
            text_parts.append("Columns: " + ", ".join(df.columns))
            text_parts.append(f"Total rows: {len(df)}")
            text_parts.append("\nSample data:")
            text_parts.append(df.head(10).to_string(index=False))

            sheets.append((len(sheets) + 1, "\n".join(text_parts)))

        return sheets

    except Exception as e:
        logger.error(f"Failed to read Excel: {e}")
        return []


def _extract_source_code(path: Path) -> list[tuple[int, str]]:
    """
    Extract text from source code files.

    Preserves code structure and adds file type metadata.
    """
    import chardet

    raw = path.read_bytes()
    detected = chardet.detect(raw)
    encoding = detected.get("encoding", "utf-8") or "utf-8"

    try:
        code = raw.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        code = raw.decode("utf-8", errors="replace")

    # Add metadata
    file_type = path.suffix[1:] if path.suffix else "unknown"
    metadata = f"File type: {file_type}\nFile name: {path.name}\n\n"

    text = metadata + code.strip()

    if text.strip():
        return [(1, text.strip())]
    return []
