"""
Gemini vision OCR adapter with model fallback chain.

Tries multiple Gemini models in sequence on 503 (high demand) errors.
Free tier has rate limits — different models have different capacity.
"""
from __future__ import annotations

import asyncio
import base64
import os
from pathlib import Path

import httpx

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Try in order. First one that responds wins.
MODEL_CHAIN = [
    "gemini-3.8-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-2.5-flash",
]

PROMPT = """You are an OCR system for historical Ayurvedic manuscripts.

Extract ALL text from this image exactly as written, preserving line breaks
with \\n. Do not translate, modernize, or add anything. If a character is
unreadable, output [?] for that character.

Supported scripts: Devanagari, Latin, and mixed.

Output format: ONLY the extracted text, nothing else. No preamble, no
explanation. If the image contains no text, output an empty string."""


async def _try_model(
    client: httpx.AsyncClient, model: str, mime: str, b64: str
) -> dict:
    payload = {
        "contents": [{"parts": [
            {"text": PROMPT},
            {"inline_data": {"mime_type": mime, "data": b64}},
        ]}],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 8192},
    }
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    resp = await client.post(url, params={"key": GEMINI_API_KEY}, json=payload)
    return {"status": resp.status_code, "body": resp.text, "model": model}


async def extract_manuscript_gemini(image_path: Path) -> dict:
    if not GEMINI_API_KEY:
        return {"text": "", "confidence": 0.0, "model": "gemini",
                "error": "GEMINI_API_KEY not configured"}

    suffix = image_path.suffix.lower()
    mime = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png", ".webp": "image/webp"}.get(suffix, "image/jpeg")
    b64 = base64.b64encode(image_path.read_bytes()).decode()

    errors = []
    async with httpx.AsyncClient(timeout=120.0) as client:
        for model in MODEL_CHAIN:
            for attempt in (1, 2):
                try:
                    r = await _try_model(client, model, mime, b64)
                except httpx.TimeoutException:
                    errors.append(f"{model}: timeout")
                    continue
                except httpx.RequestError as exc:
                    errors.append(f"{model}: {type(exc).__name__}")
                    continue

                if r["status"] == 200:
                    try:
                        body = __import__("json").loads(r["body"])
                        text = body["candidates"][0]["content"]["parts"][0]["text"].strip()
                        unreadable = text.count("[?]")
                        confidence = max(0.0, 1.0 - unreadable / max(len(text), 1))
                        return {"text": text, "confidence": confidence,
                                "model": model, "error": None}
                    except (KeyError, IndexError, ValueError) as exc:
                        errors.append(f"{model}: parse {type(exc).__name__}")
                        break

                if r["status"] == 503 and attempt == 1:
                    await asyncio.sleep(3)
                    continue

                errors.append(f"{model}: HTTP {r['status']}")
                break

    return {"text": "", "confidence": 0.0, "model": "gemini-fallback-chain",
            "error": "All Gemini models failed: " + " | ".join(errors[:4])}
