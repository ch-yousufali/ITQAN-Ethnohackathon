"""OCR adapter: OCR_SERVICE_URL > Gemini > empty stub."""
from __future__ import annotations

import os
from pathlib import Path

import httpx

OCR_SERVICE_URL = os.getenv("OCR_SERVICE_URL", "").strip().rstrip("/")
OCR_TIMEOUT_SECONDS = float(os.getenv("OCR_TIMEOUT_SECONDS", "60"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()


async def extract_manuscript(image_path: Path) -> dict:
    if OCR_SERVICE_URL:
        async with httpx.AsyncClient(timeout=OCR_TIMEOUT_SECONDS) as client:
            with image_path.open("rb") as f:
                files = {"file": (image_path.name, f, "application/octet-stream")}
                resp = await client.post(f"{OCR_SERVICE_URL}/ocr", files=files)
        if resp.status_code == 200:
            data = resp.json()
            return {"text": data.get("text", "") or "",
                    "confidence": float(data.get("confidence") or 0.0),
                    "model": data.get("model_version", "ocr-service"),
                    "error": None}
        return {"text": "", "confidence": 0.0, "model": "ocr-service",
                "error": f"OCR service HTTP {resp.status_code}"}

    if GEMINI_API_KEY:
        from app.manuscripts.gemini_ocr import extract_manuscript_gemini
        return await extract_manuscript_gemini(image_path)

    return {"text": "", "confidence": 0.0, "model": "stub",
            "error": "No OCR configured. Set OCR_SERVICE_URL or GEMINI_API_KEY."}
