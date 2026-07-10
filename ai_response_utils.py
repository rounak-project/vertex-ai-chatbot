"""Shared parsing helpers for module-specific AI responses."""

import json
import re


def parse_ai_json(content, label="AI response"):
    """Parse JSON from raw model output, markdown fences, or prose-wrapped JSON."""
    text = str(content or "").strip()
    if not text:
        raise ValueError(f"{label} was empty")

    fence = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.IGNORECASE | re.DOTALL)
    if fence:
        text = fence.group(1).strip()

    decoder = json.JSONDecoder()
    candidates = [0]
    candidates.extend(match.start() for match in re.finditer(r"[\{\[]", text))

    seen = set()
    for start in candidates:
        if start in seen:
            continue
        seen.add(start)
        try:
            parsed, _ = decoder.raw_decode(text[start:])
            return parsed
        except json.JSONDecodeError:
            continue

    raise ValueError(f"No valid JSON found in {label}")
