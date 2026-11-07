import re
import unicodedata

from unidecode import unidecode

_PUNCT_RE = re.compile(r"[^\w\s]", re.UNICODE)
_WS_RE = re.compile(r"\s+", re.UNICODE)


def normalize_name(raw: str) -> str:
    """
    Deterministic normalization used by BOTH the loader (populating
    plant_aliases.normalized_alias) and the resolver (Stage 1).
    If this ever changes, every existing normalized_alias must be
    re-computed — this is a load-bearing contract, not a helper.

    - NFKD decomposition (handles Devanagari, CJK, diacritics)
    - Transliterate non-Latin scripts to ASCII
    - Lowercase, strip punctuation, collapse whitespace
    """
    if not raw:
        return ""
    text = unicodedata.normalize("NFKD", raw)
    text = unidecode(text)
    text = text.lower().strip()
    text = _PUNCT_RE.sub(" ", text)
    return _WS_RE.sub(" ", text).strip()
