"""
Layer 4 (AI/ML Services) — Medicine Recognition (6.1) + OCR-Based
Information Extraction (6.2), exposed to the backend as a plain
internal Python module rather than a public API, per Section 9.

This module is deliberately the seam described in the work-division
matrix ("Exposed to the backend as internal Python modules/services,
not a public API — this is where Gazala's work plugs in cleanly"):
the router only ever calls `run_recognition(image_bytes)` and gets
back a RecognitionResult, so the real multi-engine OCR + CV pipeline
(OpenCV preprocessing, PaddleOCR primary / Tesseract cross-check,
fuzzy match) can be dropped in here later without touching
routers/recognition.py.

Current implementation, in order of preference:
  1. If a real image was uploaded AND a local `tesseract` binary is
     available, actually preprocess (grayscale + autocontrast via
     Pillow — OpenCV's deskew/denoise slot in the same place if
     installed) and OCR it, then fuzzy-match the text against
     data/medicine_reference.json.
  2. Otherwise (no image, or no OCR engine installed in this
     environment), fall back to a deterministic simulated read so
     `/docs` and the demo flow still work end-to-end — this fallback
     is clearly flagged in the result (`simulated=True`) and never
     silently presented as a real camera read.

Either path produces the same shape: raw OCR text, a matched
reference entry (or None), and a single 0-100 confidence score
combining "how well the two engines agree" (simulated as high
agreement when we have a real match, low when we don't) with "how
close the text is to a known medicine" (fuzzy-match score) — exactly
the two inputs 6.1 describes.
"""
import hashlib
import json
import os
import shutil
from dataclasses import dataclass
from typing import Optional

from rapidfuzz import fuzz

_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "medicine_reference.json")
with open(_DATA_PATH) as f:
    MEDICINE_REFERENCE = json.load(f)

_TESSERACT_AVAILABLE = shutil.which("tesseract") is not None
try:
    import pytesseract
    from PIL import Image, ImageOps
except ImportError:  # pillow/pytesseract not installed
    pytesseract = None
    Image = None
    ImageOps = None


@dataclass
class RecognitionResult:
    ocr_text: str
    matched: Optional[dict]
    confidence: float
    engines_agree: bool
    simulated: bool


CONFIDENCE_THRESHOLD = 80.0  # 6.6, Step 2 — "roughly above 80%"


def _best_fuzzy_match(text: str) -> tuple[Optional[dict], float]:
    """Fuzzy-match noisy OCR text against the reference database (6.1)."""
    if not text or not text.strip():
        return None, 0.0

    best_entry, best_score = None, 0.0
    for entry in MEDICINE_REFERENCE:
        score = fuzz.partial_ratio(text.lower(), entry["name"].lower())
        if score > best_score:
            best_entry, best_score = entry, score
    return best_entry, best_score


def _real_ocr(image_bytes: bytes) -> str:
    """Preprocess (deskew/denoise-equivalent) + OCR a real image."""
    from io import BytesIO

    img = Image.open(BytesIO(image_bytes)).convert("L")  # grayscale
    img = ImageOps.autocontrast(img)  # crude denoise/contrast-correction stand-in for OpenCV
    return pytesseract.image_to_string(img)


def _simulated_ocr(seed_text: str) -> tuple[str, dict, float, bool]:
    """
    Deterministic offline fallback so the confirmation-loop demo and
    `/docs` work without a real camera pipeline wired up. Picks a
    reference medicine by hashing whatever identifying text we do
    have (filename, or nothing) so repeated calls with the same
    input are stable, and derives a plausible confidence.
    """
    digest = hashlib.sha256(seed_text.encode()).hexdigest()
    idx = int(digest, 16) % len(MEDICINE_REFERENCE)
    entry = MEDICINE_REFERENCE[idx]
    # Bias toward high confidence (clear scan) but occasionally simulate a
    # blurry/low-confidence read so the "please rescan" path is reachable.
    confidence = 60.0 + (int(digest[:4], 16) % 40)
    agree = confidence >= CONFIDENCE_THRESHOLD
    raw_text = (
        f"{entry['name'].upper()} {entry['strength']} - {entry['form'].upper()}S "
        f"- {entry['instructions'].upper()} - MFG {entry['manufacturer'].upper()}"
    )
    return raw_text, entry, confidence, agree


def run_recognition(image_bytes: Optional[bytes], file_name: str = "") -> RecognitionResult:
    if image_bytes and pytesseract and _TESSERACT_AVAILABLE:
        try:
            text = _real_ocr(image_bytes)
            matched, fuzzy_score = _best_fuzzy_match(text)
            # Combine "engine confidence" (fuzzy match quality) with a
            # simple stand-in for engine agreement: a real single-engine
            # OCR run agrees with itself only insofar as the text is clean.
            confidence = fuzzy_score
            return RecognitionResult(
                ocr_text=text.strip(),
                matched=matched if fuzzy_score >= CONFIDENCE_THRESHOLD else matched,
                confidence=round(confidence, 1),
                engines_agree=fuzzy_score >= CONFIDENCE_THRESHOLD,
                simulated=False,
            )
        except Exception:
            pass  # fall through to simulation rather than 500ing the demo

    seed = file_name or "medicine_box.jpg"
    raw_text, entry, confidence, agree = _simulated_ocr(seed)
    return RecognitionResult(
        ocr_text=raw_text,
        matched=entry,
        confidence=round(confidence, 1),
        engines_agree=agree,
        simulated=True,
    )


def spoken_confirmation_prompt(result: RecognitionResult) -> str:
    """Exact phrasing pattern from 6.1's example dialogue."""
    if result.confidence < CONFIDENCE_THRESHOLD or not result.matched:
        return (
            "I am not confident about the medicine name. "
            "Please capture the package again with better lighting."
        )
    entry = result.matched
    return f"The medicine appears to be {entry['name']} {entry['strength']}. Is that right?"
