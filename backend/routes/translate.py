"""
Auto-translation proxy using MyMemory API (free, no key required).
- Free quota: 5000 words/day per IP (10000 with email param)
- Endpoint: GET https://api.mymemory.translated.net/get?q=...&langpair=fr|en
"""
import os
from typing import Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth_deps import require_admin

router = APIRouter(prefix="/api/translate", tags=["translate"])

# Optional email to lift quota from 5k to 10k words/day
TRANSLATOR_EMAIL = os.environ.get("TRANSLATOR_EMAIL", "")


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    source_lang: str = Field(default="fr")
    target_langs: List[str] = Field(default=["en", "ar"])


class BatchTranslateRequest(BaseModel):
    items: List[Dict[str, str]]  # [{"key": "name", "text": "T-shirt"}, ...]
    source_lang: str = "fr"
    target_langs: List[str] = ["en", "ar"]


# MyMemory uses ISO 639-1 codes. Our supported langs match directly.
LANG_MAP = {"fr": "fr", "en": "en", "ar": "ar"}


async def _translate_one(client: httpx.AsyncClient, text: str, src: str, tgt: str) -> str:
    """Calls MyMemory once for a single (text, src, tgt). Returns translated text or empty on error."""
    if not text.strip():
        return ""
    if src == tgt:
        return text
    src_code = LANG_MAP.get(src, src)
    tgt_code = LANG_MAP.get(tgt, tgt)
    params = {"q": text, "langpair": f"{src_code}|{tgt_code}"}
    if TRANSLATOR_EMAIL:
        params["de"] = TRANSLATOR_EMAIL
    try:
        r = await client.get("https://api.mymemory.translated.net/get", params=params)
        if r.status_code != 200:
            return ""
        data = r.json()
        # MyMemory shape: {"responseData": {"translatedText": "..."}, "responseStatus": 200}
        translated = (data.get("responseData") or {}).get("translatedText", "")
        # Filter out MyMemory error markers (e.g., "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY.")
        if translated and "MYMEMORY WARNING" in translated.upper():
            return ""
        if translated and "PLEASE SELECT TWO DIFFERENT LANGUAGES" in translated.upper():
            return text
        return translated or ""
    except Exception as e:
        print(f"[translate] error for '{text[:30]}…' ({src}->{tgt}): {e}")
        return ""


@router.post("")
async def translate_text(payload: TranslateRequest, _admin: dict = Depends(require_admin)):
    """Translate one piece of text into multiple target languages."""
    async with httpx.AsyncClient(timeout=20.0) as client:
        out: Dict[str, str] = {}
        for tgt in payload.target_langs:
            out[tgt] = await _translate_one(client, payload.text, payload.source_lang, tgt)
    return {"source": payload.source_lang, "translations": out}


@router.post("/batch")
async def translate_batch(payload: BatchTranslateRequest, _admin: dict = Depends(require_admin)):
    """
    Translate multiple fields at once.
    Input:  { items: [{key, text}, ...], source_lang, target_langs }
    Output: { results: { en: {key: translated, ...}, ar: {key: translated, ...} } }
    """
    if not payload.items:
        raise HTTPException(status_code=400, detail="items is required")
    if len(payload.items) > 50:
        raise HTTPException(status_code=400, detail="Max 50 items per batch")

    results: Dict[str, Dict[str, str]] = {tgt: {} for tgt in payload.target_langs}
    async with httpx.AsyncClient(timeout=30.0) as client:
        for it in payload.items:
            key = it.get("key", "")
            text = it.get("text", "") or ""
            for tgt in payload.target_langs:
                results[tgt][key] = await _translate_one(client, text, payload.source_lang, tgt)
    return {"results": results}
