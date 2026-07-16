import logging
from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from app.models import SopChunk, LegalSection
from app.ai import gemini_client

logger = logging.getLogger("crime_os.rag")

def retrieve_sop_chunks(db: Session, query: str, limit: int = 5) -> list[SopChunk]:
    """
    Retrieve top-k SOP chunks matching the query using pgvector cosine distance.
    Falls back to text search if embedding or vector query fails.
    """
    try:
        query_vectors = gemini_client.embed([query])
        if not query_vectors:
            logger.warning("No embeddings returned from Gemini API, falling back to text search")
            return _fallback_text_search(db, query, limit)
        
        query_vec = query_vectors[0]
        stmt = (
            select(SopChunk)
            .order_by(SopChunk.embedding.cosine_distance(query_vec))
            .limit(limit)
        )
        return list(db.scalars(stmt))
    except Exception as e:
        logger.error(f"Failed to retrieve SOP chunks via vector search: {e}. Falling back to text search.")
        return _fallback_text_search(db, query, limit)

def _fallback_text_search(db: Session, query: str, limit: int = 5) -> list[SopChunk]:
    """Simple text search fallback for SopChunk"""
    words = [w.strip().lower() for w in query.split() if len(w.strip()) > 3]
    if not words:
        return list(db.scalars(select(SopChunk).limit(limit)))
    
    conditions = [SopChunk.chunk_text.ilike(f"%{w}%") for w in words]
    stmt = select(SopChunk).where(or_(*conditions)).limit(limit)
    return list(db.scalars(stmt))

def get_relevant_legal_sections(db: Session, query: str) -> list[LegalSection]:
    """
    Retrieve legal sections matching keywords from the query.
    Falls back to returning all sections if no keyword matches.
    """
    words = [w.strip().lower() for w in query.split() if len(w.strip()) > 3]
    if not words:
        return list(db.scalars(select(LegalSection)))
    
    conditions = []
    for w in words:
        conditions.append(LegalSection.title.ilike(f"%{w}%"))
        conditions.append(LegalSection.text.ilike(f"%{w}%"))
        
    stmt = select(LegalSection).where(or_(*conditions))
    results = list(db.scalars(stmt))
    if not results:
        # Fallback to returning all if no keyword match
        return list(db.scalars(select(LegalSection)))
    return results
