"""
Re-embed SOP chunks into the configured provider's vector space.

Run this after changing EMBEDDING_PROVIDER:

    python -m app.scripts.reembed_sop --dry-run
    python -m app.scripts.reembed_sop

Why it is mandatory rather than optional: nomic-embed-text and Gemini text-embedding-004
are both 768-dimensional, so a mismatched corpus produces no error anywhere — pgvector
accepts the rows and cosine_distance returns plausible numbers. The retrieval results are
simply wrong, and those wrong SOP chunks become grounding for investigation-path
generation. A silent failure is the reason this script exists.

Scope: reads and writes sop_chunks.embedding only. Never inserts, never deletes, never
touches cases, users, evidence or complaints. Unlike app.seeds.run, which is a full
demo-data rebuild, this preserves everything already in the database.

Known tradeoff: nomic-embed-text is trained with asymmetric task prefixes
("search_document: " for a corpus, "search_query: " for a query). Using them would
require embed() to know which side it is embedding, i.e. a gateway signature change. Both
corpus and query are therefore embedded unprefixed — self-consistent and correct, just
below nomic's ceiling. Prefixing here but not in rag_service would be actively wrong.
"""
import argparse
import logging
import sys

from sqlalchemy import select

from app.ai.gemini_client import embed
from app.config import settings
from app.database import SessionLocal
from app.models import SopChunk

logger = logging.getLogger("crime_os.scripts.reembed_sop")

# Marker row in fallback_cache recording which provider the corpus was embedded with, so a
# later mismatch can be detected instead of silently degrading retrieval.
PROVIDER_MARKER_PURPOSE = "_embedding_provider"


def _provider_label() -> str:
    if settings.EMBEDDING_PROVIDER == "ollama":
        return f"ollama:{settings.OLLAMA_EMBED_MODEL}"
    return f"gemini:{settings.GEMINI_EMBEDDING_MODEL}"


def reembed(*, dry_run: bool = False, batch_size: int = 16) -> int:
    """Recompute every SopChunk.embedding with the configured provider.

    Returns the number of rows updated (or that would be updated, when dry_run is True).
    Raises RuntimeError if the configuration cannot produce usable vectors, and
    GenerationError if the provider itself fails — both before any row is written.
    """
    if settings.EMBEDDING_PROVIDER == "ollama" and not settings.OLLAMA_ENABLED:
        raise RuntimeError(
            "EMBEDDING_PROVIDER=ollama but OLLAMA_ENABLED=false — start Ollama or set "
            "EMBEDDING_PROVIDER=gemini before re-embedding."
        )

    provider = _provider_label()
    db = SessionLocal()
    try:
        chunks = list(db.scalars(select(SopChunk).order_by(SopChunk.id)))
        if not chunks:
            logger.warning("reembed_sop no sop_chunks found — run `python -m app.seeds.run` first")
            return 0

        updated = 0
        for start in range(0, len(chunks), batch_size):
            batch = chunks[start : start + batch_size]
            # Embed the stored text verbatim: it already carries the "<title>: " prefix
            # applied at seed time, and re-deriving it would desynchronise vector from row.
            vectors = embed([chunk.chunk_text for chunk in batch])

            # Validate the whole batch before mutating anything in it.
            if len(vectors) != len(batch):
                raise RuntimeError(f"provider returned {len(vectors)} vectors for {len(batch)} chunks")
            expected = settings.OLLAMA_EMBED_DIM
            for vector in vectors:
                if len(vector) != expected:
                    raise RuntimeError(f"provider returned {len(vector)} dimensions, expected {expected}")

            for chunk, vector in zip(batch, vectors, strict=True):
                if dry_run:
                    preview = [round(value, 4) for value in vector[:3]]
                    logger.info(
                        "would update id=%s dim=%d head=%s text=%s",
                        chunk.id,
                        len(vector),
                        preview,
                        chunk.chunk_text[:60],
                    )
                else:
                    chunk.embedding = vector
                updated += 1

        if dry_run:
            db.rollback()
            logger.info("reembed_sop DRY RUN provider=%s rows=%d — nothing written", provider, updated)
            return updated

        _write_provider_marker(db, provider)
        db.commit()
        logger.info("reembed_sop provider=%s rows=%d committed", provider, updated)
        return updated
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def _write_provider_marker(db, provider: str) -> None:
    """Record the corpus's vector space so a later provider change is detectable."""
    from app.models import FallbackCache

    marker = db.scalar(
        select(FallbackCache).where(
            FallbackCache.purpose == PROVIDER_MARKER_PURPOSE,
            FallbackCache.input_hash == PROVIDER_MARKER_PURPOSE,
        )
    )
    payload = {"provider": provider}
    if marker:
        marker.response_json = payload
    else:
        db.add(
            FallbackCache(
                purpose=PROVIDER_MARKER_PURPOSE,
                input_hash=PROVIDER_MARKER_PURPOSE,
                response_json=payload,
            )
        )
    db.flush()


def read_corpus_provider(db) -> str | None:
    """The provider that last embedded the SOP corpus, or None if never recorded.

    Compare against _provider_label() to detect a vector-space mismatch — the failure mode
    that produces plausible-looking but wrong retrieval results with no error anywhere.
    """
    from app.models import FallbackCache

    marker = db.scalar(
        select(FallbackCache).where(
            FallbackCache.purpose == PROVIDER_MARKER_PURPOSE,
            FallbackCache.input_hash == PROVIDER_MARKER_PURPOSE,
        )
    )
    if marker and isinstance(marker.response_json, dict):
        value = marker.response_json.get("provider")
        return str(value) if value else None
    return None


def current_provider_label() -> str:
    """The provider embeddings would be generated with right now."""
    return _provider_label()


def main() -> None:
    """CLI entry: python -m app.scripts.reembed_sop [--dry-run] [--batch-size N]"""
    parser = argparse.ArgumentParser(description="Re-embed SOP chunks with the configured provider.")
    parser.add_argument("--dry-run", action="store_true", help="report what would change, write nothing")
    parser.add_argument("--batch-size", type=int, default=16, help="chunks per embedding request")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s %(message)s")
    try:
        count = reembed(dry_run=args.dry_run, batch_size=args.batch_size)
    except Exception as exc:
        logger.error("reembed_sop failed: %s", exc)
        sys.exit(1)
    logger.info("done rows=%d dry_run=%s", count, args.dry_run)


if __name__ == "__main__":
    main()
