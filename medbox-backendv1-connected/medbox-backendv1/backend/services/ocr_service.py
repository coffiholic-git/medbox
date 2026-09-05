"""
Layer 4 (AI/ML Services) — Medicine Recognition (6.1) + OCR-Based
Information Extraction (6.2), exposed to the backend as a plain
internal Python module rather than a public API, per Section 9.

This module is the seam described in the work-division matrix
("Exposed to the backend as internal Python modules/services, not a
public API — this is where Gazala's work plugs in cleanly"): the
router only ever calls `run_recognition(image_bytes)` and gets back
a RecognitionResult, so the router itself never needed to change
when the real pipeline was wired in below.

Current implementation, in order of preference:
  1. If a real image was uploaded, write it to a temp file and run
     it through the real multi-engine pipeline in
     `backend.perception.pipeline` (OpenCV preprocessing, PaddleOCR
     primary / Tesseract cross-check, fuzzy medicine matching,
     6.6's confidence scoring). This is the actual AI/ML module, not
     a stand-in for it.
  2. If there's no image, or the pipeline can't run in this
     environment (PaddleOCR not installed, no tesseract binary,
     an unreadable image, etc.), fall back to a deterministic
     simulated read so `/docs` and the demo flow still work
     end-to-end — this fallback is clearly flagged in the result
     (`simulated=True`) and never silently presented as a real
     camera read.

Either path produces the same shape: raw OCR text (kept only for
the recognition-history audit trail — never read out or acted on),
a matched reference entry (or None), and a single 0-100 confidence
score. The real path gets that score from the pipeline's own
engine-agreement + fuzzy-match weighting (6.1/6.6); the simulated
path derives a stand-in the same way it always has.
"""
import hashlib
import json
import logging
import os
import tempfile
from dataclasses import dataclass
from typing import Optional

from backend.perception.pipeline import recognize_medicine_with_audit_trail

logger = logging.getLogger(__name__)

_DATA_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "medicine_reference.json")
with open(_DATA_PATH) as f:
    MEDICINE_REFERENCE = json.load(f)

_FORM_BY_NAME = {
    entry["name"].strip().lower(): entry.get("form")
    for entry in MEDICINE_REFERENCE
    if entry.get("name")
}


@dataclass
class RecognitionResult:
    ocr_text: str
    matched: Optional[dict]
    confidence: float
    engines_agree: bool
    simulated: bool


CONFIDENCE_THRESHOLD = 80.0  # 6.6, Step 2 — "roughly above 80%" (pipeline's 0.80, x100)


def _lookup_form(medicine_name: Optional[str]) -> str:
    """
    The pipeline's medicine_info doesn't carry a `form` field (it
    wasn't part of the shared reference shape the matcher builds),
    but the backend's Medicine/RecognitionHistory rows expect one —
    so it's looked up from the same reference file by name.
    """
    if not medicine_name:
        return "Tablet"
    return _FORM_BY_NAME.get(medicine_name.strip().lower()) or "Tablet"


def _to_matched_dict(pipeline_result: dict) -> Optional[dict]:
    """Adapt the pipeline's `medicine_info` shape to the {name, strength,
    form, instructions, manufacturer} shape routers/recognition.py expects."""

    medicine_info = pipeline_result.get("medicine_info")
    if not medicine_info:
        return None

    package_details = pipeline_result.get("package_details") or {}
    name = medicine_info.get("generic_name")

    return {
        "name": name,
        "strength": medicine_info.get("strength") or package_details.get("dosage") or "",
        "form": _lookup_form(name),
        "instructions": medicine_info.get("instructions") or "",
        "manufacturer": medicine_info.get("manufacturer"),
    }


def _engines_agree_from(engine_agreement: Optional[float]) -> bool:
    """
    Map the pipeline's engine_agreement (a 0.0-1.0 text-similarity
    score, or None when only one engine actually produced usable
    text) onto the RecognitionHistory.engine_agreement boolean
    column. `None` means there was no cross-check available at all,
    which is recorded as "did not agree" rather than assumed True.
    """
    if engine_agreement is None:
        return False
    return engine_agreement >= 0.5


def _run_real_pipeline(image_bytes: bytes, file_name: str) -> RecognitionResult:
    """Write the uploaded image to disk and run it through the real
    OCR + medicine-matching pipeline (backend/perception)."""

    suffix = os.path.splitext(file_name or "")[1] or ".jpg"
    fd, temp_path = tempfile.mkstemp(suffix=suffix)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(image_bytes)

        pipeline_result, ocr_text = recognize_medicine_with_audit_trail(temp_path)
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass

    confidence = round(float(pipeline_result.get("confidence", 0.0)) * 100, 1)
    matched = _to_matched_dict(pipeline_result)
    engines_agree = _engines_agree_from(pipeline_result.get("engine_agreement"))

    return RecognitionResult(
        ocr_text=ocr_text or "",
        matched=matched,
        confidence=confidence,
        engines_agree=engines_agree,
        simulated=False,
    )


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
    if image_bytes:
        try:
            return _run_real_pipeline(image_bytes, file_name)
        except Exception:
            # Never replace a real uploaded photo with a guessed demo drug.
            # An unavailable OCR engine or unreadable image must produce an
            # honest rescan request, not a potentially dangerous match.
            logger.warning(
                "Real recognition pipeline unavailable; returning a safe "
                "low-confidence result.",
                exc_info=True,
            )
            return RecognitionResult(
                ocr_text="",
                matched=None,
                confidence=0.0,
                engines_agree=False,
                simulated=False,
            )

    # This no-image branch only supports the explicit demo/docs flow. The
    # browser scanner always sends camera or uploaded-image data.
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
