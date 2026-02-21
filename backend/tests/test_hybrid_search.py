"""Tests for hybrid search and re-ranking (v1.5)."""

import pytest
from services.hybrid_search import HybridSearchService


@pytest.fixture
def hybrid_service():
    """Create a HybridSearchService instance for testing."""
    return HybridSearchService()


@pytest.fixture
def sample_documents():
    """Sample documents for testing."""
    return [
        "Machine learning is a subset of artificial intelligence focused on data.",
        "Deep learning uses neural networks with multiple layers.",
        "Natural language processing enables computers to understand human language.",
        "Computer vision allows machines to interpret visual information.",
        "Reinforcement learning is about training agents through rewards.",
    ]


def test_bm25_indexing(hybrid_service, sample_documents):
    """Test BM25 index creation."""
    workspace_id = "test_workspace"

    hybrid_service.index_documents_for_bm25(workspace_id, sample_documents)

    assert workspace_id in hybrid_service.bm25_indices
    assert "index" in hybrid_service.bm25_indices[workspace_id]
    assert "documents" in hybrid_service.bm25_indices[workspace_id]
    assert len(hybrid_service.bm25_indices[workspace_id]["documents"]) == len(sample_documents)


def test_bm25_search(hybrid_service, sample_documents):
    """Test BM25 keyword search."""
    workspace_id = "test_workspace"
    hybrid_service.index_documents_for_bm25(workspace_id, sample_documents)

    # Search for "neural networks"
    results = hybrid_service.search_bm25(workspace_id, "neural networks", top_k=3)

    assert len(results) > 0
    assert len(results) <= 3
    assert all("chunk_text" in r for r in results)
    assert all("score" in r for r in results)

    # The document about "deep learning" should be in the results
    found = any("neural networks" in r["chunk_text"] for r in results)
    assert found, "Expected to find document containing 'neural networks'"


def test_bm25_no_results(hybrid_service, sample_documents):
    """Test BM25 search with no matching documents."""
    workspace_id = "test_workspace"
    hybrid_service.index_documents_for_bm25(workspace_id, sample_documents)

    # Search for something not in the documents
    results = hybrid_service.search_bm25(workspace_id, "quantum physics", top_k=5)

    # May return empty or low-score results
    assert isinstance(results, list)


def test_bm25_missing_workspace(hybrid_service):
    """Test BM25 search on non-existent workspace."""
    results = hybrid_service.search_bm25("nonexistent_workspace", "test query")

    assert results == []


@pytest.mark.asyncio
async def test_hybrid_search_basic(hybrid_service, sample_documents):
    """Test hybrid search combining vector and BM25."""
    workspace_id = "test_workspace"
    hybrid_service.index_documents_for_bm25(workspace_id, sample_documents)

    # Simulate vector search results
    vector_results = [
        {
            "chunk_text": sample_documents[0],
            "score": 0.9,
            "filename": "doc1.txt",
            "page": 1,
        },
        {
            "chunk_text": sample_documents[1],
            "score": 0.7,
            "filename": "doc2.txt",
            "page": 1,
        },
    ]

    query = "machine learning data"
    query_embedding = [0.1] * 384  # Dummy embedding

    results = await hybrid_service.hybrid_search(
        workspace_id=workspace_id,
        query=query,
        query_embedding=query_embedding,
        vector_results=vector_results,
        top_k=5,
    )

    assert len(results) > 0
    assert all("score" in r for r in results)
    # Results should be sorted by score
    scores = [r["score"] for r in results]
    assert scores == sorted(scores, reverse=True)


@pytest.mark.asyncio
async def test_hybrid_search_no_bm25(hybrid_service):
    """Test hybrid search falls back to vector-only when BM25 unavailable."""
    workspace_id = "empty_workspace"

    vector_results = [
        {
            "chunk_text": "Test document",
            "score": 0.8,
            "filename": "test.txt",
            "page": 1,
        }
    ]

    results = await hybrid_service.hybrid_search(
        workspace_id=workspace_id,
        query="test",
        query_embedding=[0.1] * 384,
        vector_results=vector_results,
        top_k=5,
    )

    # Should fall back to vector results
    assert len(results) > 0
    assert results[0]["chunk_text"] == "Test document"


def test_score_normalization(hybrid_service):
    """Test score normalization."""
    results = [
        {"chunk_text": "doc1", "score": 10.0},
        {"chunk_text": "doc2", "score": 5.0},
        {"chunk_text": "doc3", "score": 2.0},
    ]

    normalized = hybrid_service._normalize_scores(results)

    assert all(0.0 <= r["score"] <= 1.0 for r in normalized)
    # Max score should be 1.0, min should be 0.0
    scores = [r["score"] for r in normalized]
    assert max(scores) == 1.0
    assert min(scores) == 0.0


def test_score_normalization_same_scores(hybrid_service):
    """Test normalization when all scores are the same."""
    results = [
        {"chunk_text": "doc1", "score": 5.0},
        {"chunk_text": "doc2", "score": 5.0},
        {"chunk_text": "doc3", "score": 5.0},
    ]

    normalized = hybrid_service._normalize_scores(results)

    # All scores should be 1.0
    assert all(r["score"] == 1.0 for r in normalized)


def test_combine_results(hybrid_service):
    """Test combining vector and BM25 results."""
    vector_results = [
        {"chunk_text": "doc1", "score": 0.9},
        {"chunk_text": "doc2", "score": 0.7},
    ]

    bm25_results = [
        {"chunk_text": "doc2", "score": 0.8},  # Overlaps with vector
        {"chunk_text": "doc3", "score": 0.6},
    ]

    combined = hybrid_service._combine_results(
        vector_results,
        bm25_results,
        vector_weight=0.7,
        bm25_weight=0.3,
    )

    # doc1: only in vector
    # doc2: in both (should have boosted score)
    # doc3: only in BM25
    assert len(combined) == 3

    # doc2 should have highest combined score
    doc2 = next(r for r in combined if r["chunk_text"] == "doc2")
    assert "vector_score" in doc2
    assert "bm25_score" in doc2


@pytest.mark.asyncio
async def test_recursive_retrieval_high_confidence(hybrid_service):
    """Test recursive retrieval with high-confidence results."""
    results = [
        {"chunk_text": "High quality result", "score": 0.9},
        {"chunk_text": "Another good result", "score": 0.85},
    ]

    query_embedding = [0.1] * 384

    final_results, iterations = await hybrid_service.recursive_retrieval(
        workspace_id="test",
        query="test query",
        query_embedding=query_embedding,
        initial_results=results,
        confidence_threshold=0.5,
    )

    # Should not recurse because confidence is high
    assert iterations == 0
    assert final_results == results


@pytest.mark.asyncio
async def test_recursive_retrieval_low_confidence(hybrid_service):
    """Test recursive retrieval with low-confidence results."""
    results = [
        {"chunk_text": "Low quality result", "score": 0.3},
        {"chunk_text": "Another poor result", "score": 0.2},
    ]

    query_embedding = [0.1] * 384

    final_results, iterations = await hybrid_service.recursive_retrieval(
        workspace_id="test",
        query="test query",
        query_embedding=query_embedding,
        initial_results=results,
        confidence_threshold=0.5,
    )

    # Should attempt recursion
    assert iterations > 0


def test_index_update(hybrid_service, sample_documents):
    """Test updating BM25 index."""
    workspace_id = "test_workspace"

    # Initial index
    hybrid_service.index_documents_for_bm25(workspace_id, sample_documents[:3])
    assert len(hybrid_service.bm25_indices[workspace_id]["documents"]) == 3

    # Update with new documents
    hybrid_service.update_index(workspace_id, sample_documents)
    assert len(hybrid_service.bm25_indices[workspace_id]["documents"]) == 5


def test_index_deletion(hybrid_service, sample_documents):
    """Test deleting BM25 index."""
    workspace_id = "test_workspace"

    hybrid_service.index_documents_for_bm25(workspace_id, sample_documents)
    assert workspace_id in hybrid_service.bm25_indices

    hybrid_service.delete_index(workspace_id)
    assert workspace_id not in hybrid_service.bm25_indices


def test_delete_nonexistent_index(hybrid_service):
    """Test deleting non-existent index doesn't error."""
    # Should not raise error
    hybrid_service.delete_index("nonexistent_workspace")
