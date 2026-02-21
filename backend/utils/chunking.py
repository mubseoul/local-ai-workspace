def chunk_text(
    text: str,
    chunk_size: int = 512,
    chunk_overlap: int = 64,
    strategy: str = "sentence",
) -> list[str]:
    """
    Split text into overlapping chunks.

    Args:
        text: Text to chunk
        chunk_size: Maximum chunk size
        chunk_overlap: Overlap between chunks
        strategy: Chunking strategy - "sentence" (default), "semantic", "hierarchical"

    Returns:
        List of chunk texts
    """
    if not text or not text.strip():
        return []

    if strategy == "semantic":
        from utils.advanced_chunking import semantic_chunk_text
        enriched = semantic_chunk_text(text, max_chunk_size=chunk_size)
        return [chunk["text"] for chunk in enriched]

    elif strategy == "hierarchical":
        from utils.advanced_chunking import hierarchical_chunk_text
        enriched = hierarchical_chunk_text(
            text,
            parent_chunk_size=chunk_size * 2,
            child_chunk_size=chunk_size,
            overlap=chunk_overlap,
        )
        # Return only child chunks for now (parent chunks stored separately)
        return [chunk["text"] for chunk in enriched if not chunk["metadata"].get("is_parent", False)]

    # Default: sentence-based chunking
    sentences = _split_sentences(text)
    chunks = []
    current_chunk: list[str] = []
    current_length = 0

    for sentence in sentences:
        sentence_len = len(sentence)

        if current_length + sentence_len > chunk_size and current_chunk:
            chunks.append(" ".join(current_chunk))

            overlap_chunk: list[str] = []
            overlap_len = 0
            for s in reversed(current_chunk):
                if overlap_len + len(s) > chunk_overlap:
                    break
                overlap_chunk.insert(0, s)
                overlap_len += len(s)

            current_chunk = overlap_chunk
            current_length = overlap_len

        current_chunk.append(sentence)
        current_length += sentence_len

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return [c.strip() for c in chunks if c.strip()]


def _split_sentences(text: str) -> list[str]:
    import re

    text = re.sub(r"\s+", " ", text).strip()
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if p.strip()]
