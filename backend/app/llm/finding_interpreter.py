"""
LLM-based interpreter for cross-plant molecular findings.

Takes a finding's evidence payload and returns a structured, hedged,
testable interpretation. Every output is grounded ONLY in the provided
evidence — the prompt forbids external knowledge and efficacy claims.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from app.llm.client import get_client

MODEL = "qwen/qwen3.8-27b"

SYSTEM_PROMPT = """You are a pharmacology research assistant for EthnoSynergy AI.

Your job: interpret a single molecular finding from an ancient polyherbal
formulation. The finding asserts that two compounds from DIFFERENT plants
in the same formulation are both recorded as interacting with the same
biological target.

STRICT RULES (violating any of these is a failure):
1. Use ONLY the evidence provided. Do not add external knowledge.
2. NEVER claim a compound or formulation "treats", "cures", "prevents",
   or "is effective for" any disease.
3. Frame every mechanistic claim as a TESTABLE HYPOTHESIS. Use hedged
   language: "may", "suggests", "is associated with", "could indicate".
4. If the evidence is thin (no measured activity, unknown target, etc.),
   say so explicitly in "limitations".
5. Return ONLY a JSON object. No prose before or after.
"""

USER_TEMPLATE = """Interpret the following finding.

EVIDENCE:
{evidence}

Return a JSON object with EXACTLY these keys:

{{
  "plain_summary": "1-2 sentences in plain language describing the finding. No jargon.",
  "mechanistic_hypothesis": "A testable hypothesis about the shared biological mechanism. Ground it ONLY in the evidence above. Use hedged language.",
  "testable_predictions": [
    "A specific wet-lab experiment that could support or refute the hypothesis.",
    "A second distinct experiment.",
    "A third distinct experiment."
  ],
  "limitations": [
    "A specific caveat about what this finding does NOT show.",
    "Another specific caveat."
  ],
  "confidence": "low" | "medium" | "high"
}}

Guidance for confidence:
- "high": both compounds have MEASURED activity < 1 micromolar AND target is a characterized protein
- "medium": activity exists but weaker, OR only one compound has measured activity
- "low": no measured activity, or target is ambiguous, or plant-part specificity missing
"""


def _evidence_block(payload: dict[str, Any]) -> str:
    return json.dumps(payload, indent=2, default=str)


def interpret_finding(payload: dict[str, Any]) -> dict[str, Any]:
    """Call Groq LLM and return a structured interpretation."""
    client = get_client()
    user_msg = USER_TEMPLATE.format(evidence=_evidence_block(payload))

    resp = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
        max_tokens=1200,
    )

    raw = resp.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return {
            "error": "llm_returned_invalid_json",
            "raw": raw[:500],
            "model": MODEL,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    parsed["model"] = MODEL
    parsed["generated_at"] = datetime.now(timezone.utc).isoformat()
    return parsed
