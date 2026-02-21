import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.chunking import chunk_text, _split_sentences


class TestSplitSentences:
    def test_basic(self):
        result = _split_sentences("Hello world. How are you? Fine thanks!")
        assert result == ["Hello world.", "How are you?", "Fine thanks!"]

    def test_empty(self):
        assert _split_sentences("") == []
        assert _split_sentences("   ") == []

    def test_single_sentence(self):
        result = _split_sentences("Just one sentence.")
        assert result == ["Just one sentence."]

    def test_collapses_whitespace(self):
        result = _split_sentences("Hello   world.\n\nNew  paragraph.")
        assert result == ["Hello world.", "New paragraph."]


class TestChunkText:
    def test_empty_input(self):
        assert chunk_text("") == []
        assert chunk_text("   ") == []
        assert chunk_text(None) == []

    def test_short_text_single_chunk(self):
        text = "Short text. Nothing more."
        result = chunk_text(text, chunk_size=1000, chunk_overlap=64)
        assert len(result) == 1
        assert "Short text" in result[0]

    def test_splits_into_multiple_chunks(self):
        sentences = ["Sentence number %d is here." % i for i in range(50)]
        text = " ".join(sentences)
        result = chunk_text(text, chunk_size=100, chunk_overlap=20)
        assert len(result) > 1
        full_text = " ".join(result)
        for s in sentences[:5]:
            assert s in full_text

    def test_overlap_present(self):
        text = "First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence."
        result = chunk_text(text, chunk_size=40, chunk_overlap=20)
        if len(result) >= 2:
            last_words_first = result[0].split()[-2:]
            first_words_second = result[1].split()[:5]
            has_overlap = any(w in first_words_second for w in last_words_first)
            assert has_overlap or len(result) == 1

    def test_respects_chunk_size(self):
        sentences = ["Word " * 10 + "end." for _ in range(20)]
        text = " ".join(sentences)
        result = chunk_text(text, chunk_size=200, chunk_overlap=30)
        for chunk in result:
            assert len(chunk) < 400  # generous bound accounting for sentence boundaries

    def test_no_empty_chunks(self):
        text = "A. B. C. D. E. F. G."
        result = chunk_text(text, chunk_size=5, chunk_overlap=2)
        for chunk in result:
            assert chunk.strip() != ""

    def test_zero_overlap(self):
        text = "First sentence here. Second sentence here. Third sentence here."
        result = chunk_text(text, chunk_size=30, chunk_overlap=0)
        assert len(result) >= 1
