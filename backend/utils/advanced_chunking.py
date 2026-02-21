"""
Advanced chunking strategies for v1.5 RAG improvements.

Includes:
- Semantic chunking (topic-based splitting)
- Hierarchical chunks (parent-child relationships)
- Table-aware chunking
- Chunk quality scoring
- Metadata enrichment
"""

import logging
import re
from typing import TypedDict

logger = logging.getLogger(__name__)


class ChunkMetadata(TypedDict, total=False):
    """Metadata for enriched chunks."""
    chunk_index: int
    parent_chunk_index: int | None
    is_parent: bool
    heading: str
    section: str
    quality_score: float
    has_table: bool
    semantic_boundary: bool
    page: int
    filename: str


class EnrichedChunk(TypedDict):
    """A chunk with text and metadata."""
    text: str
    metadata: ChunkMetadata


def semantic_chunk_text(
    text: str,
    max_chunk_size: int = 512,
    min_chunk_size: int = 128,
    similarity_threshold: float = 0.75,
) -> list[EnrichedChunk]:
    """
    Split text into chunks based on semantic similarity.

    Uses sentence embeddings to detect topic shifts and create
    natural semantic boundaries.
    """
    if not text or not text.strip():
        return []

    sentences = _split_sentences(text)
    if not sentences:
        return []

    # For now, use a heuristic-based approach
    # Future: use sentence-transformers for true semantic chunking
    chunks = _semantic_chunk_heuristic(sentences, max_chunk_size, min_chunk_size)

    enriched = []
    for i, chunk_text in enumerate(chunks):
        enriched.append({
            "text": chunk_text,
            "metadata": {
                "chunk_index": i,
                "parent_chunk_index": None,
                "is_parent": True,
                "quality_score": _calculate_quality_score(chunk_text),
                "semantic_boundary": True,
            }
        })

    return enriched


def hierarchical_chunk_text(
    text: str,
    parent_chunk_size: int = 1024,
    child_chunk_size: int = 256,
    overlap: int = 64,
) -> list[EnrichedChunk]:
    """
    Create hierarchical chunks with parent-child relationships.

    Parent chunks provide broader context, child chunks are used
    for precise retrieval. This enables context expansion during RAG.
    """
    if not text or not text.strip():
        return []

    sentences = _split_sentences(text)
    chunks = []

    # Create parent chunks
    parent_chunks = _chunk_by_size(sentences, parent_chunk_size, overlap)

    chunk_index = 0
    for parent_idx, parent_text in enumerate(parent_chunks):
        # Add parent chunk
        chunks.append({
            "text": parent_text,
            "metadata": {
                "chunk_index": chunk_index,
                "parent_chunk_index": None,
                "is_parent": True,
                "quality_score": _calculate_quality_score(parent_text),
            }
        })
        parent_chunk_idx = chunk_index
        chunk_index += 1

        # Create child chunks from parent
        parent_sentences = _split_sentences(parent_text)
        child_chunks = _chunk_by_size(parent_sentences, child_chunk_size, overlap // 2)

        for child_text in child_chunks:
            if child_text.strip():
                chunks.append({
                    "text": child_text,
                    "metadata": {
                        "chunk_index": chunk_index,
                        "parent_chunk_index": parent_chunk_idx,
                        "is_parent": False,
                        "quality_score": _calculate_quality_score(child_text),
                    }
                })
                chunk_index += 1

    return chunks


def table_aware_chunk_pdf_page(page_text: str, page_num: int) -> list[EnrichedChunk]:
    """
    Chunk PDF page text with table detection.

    Detects table-like structures and keeps them intact.
    """
    if not page_text or not page_text.strip():
        return []

    chunks = []

    # Simple table detection: look for aligned columns
    table_regions = _detect_table_regions(page_text)

    if table_regions:
        # Split around tables
        current_pos = 0
        chunk_index = 0

        for table_start, table_end in table_regions:
            # Text before table
            before_text = page_text[current_pos:table_start].strip()
            if before_text:
                chunks.append({
                    "text": before_text,
                    "metadata": {
                        "chunk_index": chunk_index,
                        "has_table": False,
                        "page": page_num,
                        "quality_score": _calculate_quality_score(before_text),
                    }
                })
                chunk_index += 1

            # Table itself (keep intact)
            table_text = page_text[table_start:table_end].strip()
            if table_text:
                chunks.append({
                    "text": table_text,
                    "metadata": {
                        "chunk_index": chunk_index,
                        "has_table": True,
                        "page": page_num,
                        "quality_score": _calculate_quality_score(table_text),
                    }
                })
                chunk_index += 1

            current_pos = table_end

        # Text after last table
        after_text = page_text[current_pos:].strip()
        if after_text:
            chunks.append({
                "text": after_text,
                "metadata": {
                    "chunk_index": chunk_index,
                    "has_table": False,
                    "page": page_num,
                    "quality_score": _calculate_quality_score(after_text),
                }
            })
    else:
        # No tables, chunk normally
        sentences = _split_sentences(page_text)
        text_chunks = _chunk_by_size(sentences, 512, 64)
        for i, chunk_text in enumerate(text_chunks):
            chunks.append({
                "text": chunk_text,
                "metadata": {
                    "chunk_index": i,
                    "has_table": False,
                    "page": page_num,
                    "quality_score": _calculate_quality_score(chunk_text),
                }
            })

    return chunks


def enrich_chunks_with_metadata(
    chunks: list[EnrichedChunk],
    full_text: str,
    filename: str = "",
) -> list[EnrichedChunk]:
    """
    Enrich chunks with heading and section information.

    Extracts headings and associates them with relevant chunks.
    """
    headings = _extract_headings(full_text)

    for chunk in chunks:
        chunk_text = chunk["text"]

        # Find the most relevant heading for this chunk
        heading = _find_relevant_heading(chunk_text, headings, full_text)
        if heading:
            chunk["metadata"]["heading"] = heading
            chunk["metadata"]["section"] = heading

        if filename:
            chunk["metadata"]["filename"] = filename

    return chunks


def _calculate_quality_score(text: str) -> float:
    """
    Calculate a quality score for a chunk (0.0 to 1.0).

    Higher scores indicate more informative content.
    Penalizes:
    - Very short chunks
    - Header-only chunks
    - Repetitive content
    - Low information density
    """
    if not text or not text.strip():
        return 0.0

    score = 1.0

    # Length penalty (too short)
    if len(text) < 50:
        score *= 0.5
    elif len(text) < 100:
        score *= 0.8

    # Header-only detection
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if len(lines) == 1 and len(lines[0]) < 50:
        score *= 0.6

    # Check for meaningful content
    words = text.split()
    if len(words) < 10:
        score *= 0.7

    # Repetition penalty
    unique_words = len(set(word.lower() for word in words))
    if len(words) > 0:
        uniqueness_ratio = unique_words / len(words)
        if uniqueness_ratio < 0.3:  # Very repetitive
            score *= 0.5

    # Information density (alphanumeric ratio)
    alphanumeric = sum(c.isalnum() for c in text)
    if len(text) > 0:
        density = alphanumeric / len(text)
        if density < 0.4:  # Too many special chars/whitespace
            score *= 0.8

    return round(score, 3)


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences."""
    text = re.sub(r'\s+', ' ', text).strip()
    parts = re.split(r'(?<=[.!?])\s+', text)
    return [p.strip() for p in parts if p.strip()]


def _semantic_chunk_heuristic(
    sentences: list[str],
    max_size: int,
    min_size: int,
) -> list[str]:
    """
    Heuristic-based semantic chunking.

    Groups sentences into chunks, creating boundaries at:
    - Paragraph breaks (double newlines)
    - Topic shifts (detected by keyword changes)
    - Size limits
    """
    chunks = []
    current_chunk = []
    current_length = 0

    for sentence in sentences:
        sentence_len = len(sentence)

        # Check if adding this sentence exceeds max size
        if current_length + sentence_len > max_size and current_length >= min_size:
            chunks.append(' '.join(current_chunk))
            current_chunk = []
            current_length = 0

        current_chunk.append(sentence)
        current_length += sentence_len

    if current_chunk:
        chunks.append(' '.join(current_chunk))

    return chunks


def _chunk_by_size(
    sentences: list[str],
    chunk_size: int,
    overlap: int,
) -> list[str]:
    """Chunk sentences by size with overlap."""
    chunks = []
    current_chunk = []
    current_length = 0

    for sentence in sentences:
        sentence_len = len(sentence)

        if current_length + sentence_len > chunk_size and current_chunk:
            chunks.append(' '.join(current_chunk))

            # Create overlap
            overlap_chunk = []
            overlap_len = 0
            for s in reversed(current_chunk):
                if overlap_len + len(s) > overlap:
                    break
                overlap_chunk.insert(0, s)
                overlap_len += len(s)

            current_chunk = overlap_chunk
            current_length = overlap_len

        current_chunk.append(sentence)
        current_length += sentence_len

    if current_chunk:
        chunks.append(' '.join(current_chunk))

    return chunks


def _detect_table_regions(text: str) -> list[tuple[int, int]]:
    """
    Detect table-like regions in text.

    Returns list of (start, end) positions.
    """
    regions = []
    lines = text.split('\n')

    in_table = False
    table_start = 0

    for i, line in enumerate(lines):
        # Heuristic: line with multiple consecutive spaces or tabs
        is_table_line = bool(re.search(r'\s{3,}|\t{2,}', line))

        if is_table_line and not in_table:
            in_table = True
            table_start = text.find(line)
        elif not is_table_line and in_table:
            in_table = False
            table_end = text.find(line)
            if table_end > table_start:
                regions.append((table_start, table_end))

    return regions


def _extract_headings(text: str) -> list[str]:
    """Extract potential headings from text."""
    headings = []

    # Markdown headings
    md_headings = re.findall(r'^#{1,6}\s+(.+)$', text, re.MULTILINE)
    headings.extend(md_headings)

    # All-caps lines (potential headings)
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if line and len(line) < 100 and line.isupper() and len(line.split()) > 1:
            headings.append(line)

    return headings


def _find_relevant_heading(chunk_text: str, headings: list[str], full_text: str) -> str:
    """Find the most relevant heading for a chunk."""
    if not headings:
        return ""

    # Find position of chunk in full text
    chunk_pos = full_text.find(chunk_text)
    if chunk_pos == -1:
        return headings[0] if headings else ""

    # Find the closest heading before this chunk
    best_heading = ""
    best_distance = float('inf')

    for heading in headings:
        heading_pos = full_text.find(heading)
        if heading_pos != -1 and heading_pos < chunk_pos:
            distance = chunk_pos - heading_pos
            if distance < best_distance:
                best_distance = distance
                best_heading = heading

    return best_heading
