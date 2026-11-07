"""
Extract ingredient names from raw OCR text using Groq LLM with constrained JSON.

This is the NLP layer: OCR text -> structured ingredient names.
Uses the same Groq client and qwen model that powers finding interpretation.
"""
from __future__ import annotations

import json

from app.llm.client import get_client

MODEL = "qwen/qwen3.8-27b"

SYSTEM_PROMPT = """You are an Ayurvedic text analyzer. Your job is to extract
ingredient names from OCR text of historical Indian medicinal manuscripts.

Rules:
1. Extract ONLY traditional names of herbs, minerals, or animal products
   that appear in the text. Do not invent names.
2. Include Sanskrit, Hindi, Tamil, or Latin botanical names as they appear.
3. Skip numbers, units (pala, tola, karsha), quantities, verbs, adjectives.
4. Skip words like "and", "with", "mix", "grind", "boil".
5. Return valid JSON only.

If no ingredient names are found, return an empty list.
"""

USER_TEMPLATE = """Extract ingredient names from this text:

{text}

Return JSON: {{"ingredients": [{{"traditional_name": "Pippali", "confidence": 0.9}}]}}
"""


def extract_ingredients(text: str) -> list[dict]:
    if not text or not text.strip():
        return []

    client = get_client()
    user_msg = USER_TEMPLATE.format(text=text[:4000])  # cap to avoid huge prompts
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=1500,
    )

    raw = resp.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return []

    out = []
    for item in data.get("ingredients", []):
        name = (item.get("traditional_name") or "").strip()
        if not name:
            continue
        out.append({
            "traditional_name": name[:255],
            "confidence": float(item.get("confidence") or 0.5),
        })
    return out
