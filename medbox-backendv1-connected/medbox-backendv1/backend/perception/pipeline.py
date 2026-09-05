import logging
import re
from difflib import SequenceMatcher
from pathlib import Path
from typing import Protocol

from backend.perception.medicine_matcher import (
    MedicineMatch,
    find_best_medicine_match,
)

from backend.perception.medicine_info_extractor import (
    extract_medicine_details,
)

from backend.perception.ocr import (
    OCRResult,
    PaddleOCREngine,
    TesseractOCREngine,
)

from backend.perception.preprocessing import (
    load_image,
    prepare_for_ocr,
)

logger = logging.getLogger(__name__)


# ============================================================
# MEDBOX CONFIDENCE SETTINGS
# ============================================================
#
# 6.6, Step 2 draws exactly one line: "if the score is high
# (roughly above 80%) ... If the score is low, MedBox does not
# read out a name at all". There is no documented middle tier, so
# there is exactly one threshold here, not two. (A previous version
# of this module had a second "medium confidence" tier that still
# named a candidate medicine below the high-confidence threshold —
# that directly contradicted 6.6 and has been removed.)

HIGH_CONFIDENCE_THRESHOLD = 0.80

# Ignore OCR detections below this confidence.
MIN_OCR_CONFIDENCE = 0.40

# Minimum fuzzy similarity for medicine evidence.
FUZZY_MATCH_THRESHOLD = 0.60

# Confidence-score weights (6.1 / 6.6, Step 1): "Engine agreement
# plus per-engine confidence produces a single confidence score" /
# "based on how well the two OCR engines agreed and how closely the
# text matched a known medicine in the database."
WEIGHT_MATCH_SCORE = 0.45
WEIGHT_OCR_CONFIDENCE = 0.30
WEIGHT_ENGINE_AGREEMENT = 0.25

# Weights used when only one OCR engine actually ran (e.g. the
# secondary engine isn't installed in this environment). There is
# no agreement signal to weigh in this case, so its share is folded
# back into the other two rather than silently boosting confidence.
WEIGHT_MATCH_SCORE_SINGLE_ENGINE = 0.60
WEIGHT_OCR_CONFIDENCE_SINGLE_ENGINE = 0.40


# ============================================================
# OCR ENGINE INTERFACE
# ============================================================

class OCREngine(Protocol):
    def recognize(self, image) -> list[OCRResult]:
        ...


def _default_primary_engine() -> OCREngine:
    """Use PaddleOCR when present, otherwise run real Tesseract OCR.

    The former implementation raised when the optional Paddle package was
    absent, so the API discarded an otherwise usable local Tesseract install
    and always returned simulated recognition.  Tesseract remains a genuine
    OCR path; the service-level simulation is now reserved for when neither
    local engine can run.
    """
    try:
        return PaddleOCREngine()
    except ImportError:
        logger.info("PaddleOCR unavailable; using Tesseract for primary OCR.")
        return TesseractOCREngine()


def _default_secondary_engine() -> OCREngine:
    """Tesseract is the documented cross-check engine (6.1 / Section 10)."""
    return TesseractOCREngine()


# ============================================================
# OCR CLEANING
# ============================================================

def clean_text(text: str) -> str:
    """
    Clean OCR text while preserving useful characters.
    """

    if not text:
        return ""

    text = str(text).strip()

    # Replace repeated whitespace.
    text = re.sub(r"\s+", " ", text)

    return text


def is_useful_ocr_result(result: OCRResult) -> bool:
    """
    Remove obvious OCR garbage.

    OCR detections below MIN_OCR_CONFIDENCE are ignored.
    """

    text = clean_text(result.text)

    if not text:
        return False

    # Ignore low-confidence OCR.
    if result.confidence < MIN_OCR_CONFIDENCE:
        return False

    # Ignore extremely short detections.
    if len(text) < 2:
        return False

    # Count letters and numbers.
    alphanumeric = sum(
        character.isalnum()
        for character in text
    )

    if alphanumeric == 0:
        return False

    # Ignore text that is mostly symbols.
    ratio = alphanumeric / len(text)

    if ratio < 0.50:
        return False

    return True


def filter_ocr_results(
    ocr_results: list[OCRResult],
) -> list[OCRResult]:
    """
    Keep only useful OCR detections.
    """

    filtered = []

    for result in ocr_results:

        if not is_useful_ocr_result(result):
            continue

        # Clean OCR text.
        try:
            result.text = clean_text(result.text)
        except Exception:
            pass

        filtered.append(result)

    return filtered


# ============================================================
# MEDICINE EVIDENCE
# ============================================================

def calculate_medicine_ocr_confidence(
    ocr_results: list[OCRResult],
    medicine_match: MedicineMatch,
) -> float:
    """
    Calculate OCR confidence supporting the medicine match.

    Uses:
    1. Exact/contained matching.
    2. Individual-word fuzzy matching.
    3. The matcher score as fallback evidence.
    """

    if not medicine_match.medicine_key:
        return 0.0

    if not medicine_match.medicine_info:
        return 0.0

    medicine_name = str(
        medicine_match.medicine_info.get(
            "generic_name",
            "",
        )
    ).lower().strip()

    if not medicine_name:
        return 0.0

    best_evidence = 0.0

    # --------------------------------------------------------
    # Examine every OCR detection.
    # --------------------------------------------------------

    for result in ocr_results:

        text = clean_text(result.text).lower()

        if not text:
            continue

        # ----------------------------------------------------
        # Exact / contained match
        # ----------------------------------------------------

        if medicine_name in text:

            evidence = float(result.confidence)

            best_evidence = max(
                best_evidence,
                evidence,
            )

            continue

        # ----------------------------------------------------
        # Compare individual words.
        # ----------------------------------------------------

        for word in text.split():

            if len(word) < 4:
                continue

            similarity = SequenceMatcher(
                None,
                word,
                medicine_name,
            ).ratio()

            if similarity >= FUZZY_MATCH_THRESHOLD:

                evidence = (
                    float(result.confidence)
                    * similarity
                )

                best_evidence = max(
                    best_evidence,
                    evidence,
                )

    # --------------------------------------------------------
    # Matcher score fallback.
    # --------------------------------------------------------

    if medicine_match.score > 0:

        matcher_evidence = (
            float(medicine_match.score)
            * 0.70
        )

        best_evidence = max(
            best_evidence,
            matcher_evidence,
        )

    return min(
        max(best_evidence, 0.0),
        1.0,
    )


# ============================================================
# ENGINE AGREEMENT (6.1 / 6.6, Step 1)
# ============================================================

def calculate_engine_agreement(
    primary_texts: list[str],
    secondary_texts: list[str],
) -> float | None:
    """
    Estimate how well the two OCR engines agree on what's on the
    package, independent of whether either one matched a known
    medicine yet.

    Returns None when only one engine actually produced usable
    text, since there is nothing to compare against — the caller
    treats that as "no cross-check available" rather than as
    disagreement.
    """

    if not primary_texts or not secondary_texts:
        return None

    primary_combined = " ".join(primary_texts).lower()
    secondary_combined = " ".join(secondary_texts).lower()

    if not primary_combined or not secondary_combined:
        return None

    return SequenceMatcher(
        None,
        primary_combined,
        secondary_combined,
    ).ratio()


# ============================================================
# MAIN MEDBOX PIPELINE
# ============================================================

def recognize_medicine(
    image_path: str | Path,
    ocr_engine: OCREngine | None = None,
    secondary_ocr_engine: OCREngine | None = None,
) -> dict[str, object]:
    """
    Run the complete MedBox medicine recognition pipeline.

    Pipeline (6.1):

        Image
          -> Preprocessing (OpenCV)
          -> Primary OCR (PaddleOCR) + Secondary OCR (Tesseract), in parallel
          -> OCR filtering
          -> Package information extraction
          -> Medicine matching
          -> Confidence calculation (matcher score + OCR confidence + engine agreement)
          -> Safe structured result (6.6 / Section 13)

    ``ocr_engine`` overrides the primary engine (defaults to
    PaddleOCR) and ``secondary_ocr_engine`` overrides the cross-check
    engine (defaults to Tesseract). Both are only auto-constructed
    when the caller supplies neither — a test that passes a single
    fake ``ocr_engine`` still runs in single-engine mode rather than
    silently instantiating a second real engine.
    """

    result, _ocr_texts = _run_pipeline(
        image_path,
        ocr_engine=ocr_engine,
        secondary_ocr_engine=secondary_ocr_engine,
    )
    return result


def recognize_medicine_with_audit_trail(
    image_path: str | Path,
    ocr_engine: OCREngine | None = None,
    secondary_ocr_engine: OCREngine | None = None,
) -> tuple[dict[str, object], str]:
    """
    Same pipeline and same safety guarantees as ``recognize_medicine``,
    but additionally returns the raw combined OCR text alongside the
    safety result.

    ``recognize_medicine`` deliberately never exposes raw OCR text in
    its result (6.6 / Section 13) — it isn't something to read out or
    act on. This wrapper exists for callers like the backend's
    recognition-history audit trail (7.6), which needs *some* record
    of what the scan actually saw, purely for logging, without
    re-running OCR a second time or loosening what
    ``recognize_medicine`` itself promises callers.
    """

    result, ocr_texts = _run_pipeline(
        image_path,
        ocr_engine=ocr_engine,
        secondary_ocr_engine=secondary_ocr_engine,
    )
    return result, " ".join(ocr_texts)


def _run_pipeline(
    image_path: str | Path,
    ocr_engine: OCREngine | None = None,
    secondary_ocr_engine: OCREngine | None = None,
) -> tuple[dict[str, object], list[str]]:
    """Shared implementation behind both public entry points above."""

    # --------------------------------------------------------
    # 1-2. Load + preprocess image
    # --------------------------------------------------------

    image = load_image(image_path)
    prepared_image = prepare_for_ocr(image)

    # --------------------------------------------------------
    # 3. Run OCR engines
    #
    # 6.1: "run through two OCR engines in parallel — PaddleOCR as
    # primary, Tesseract/EasyOCR as a cross-check." A previous
    # version of this pipeline only ever ran a single engine
    # (Tesseract) and never used PaddleOCR at all, so there was no
    # cross-check and no engine-agreement signal feeding into 6.6's
    # confidence score. That is corrected here.
    # --------------------------------------------------------

    primary_engine = ocr_engine or _default_primary_engine()
    primary_raw_results = primary_engine.recognize(prepared_image)

    secondary_raw_results: list[OCRResult] = []

    if secondary_ocr_engine is not None:
        secondary_raw_results = secondary_ocr_engine.recognize(prepared_image)
    elif ocr_engine is None:
        # Only auto-provision a real secondary engine when nothing
        # was supplied at all (production use). If the caller
        # supplied a single test double as `ocr_engine`, respect
        # that as an intentional single-engine run.
        try:
            secondary_raw_results = _default_secondary_engine().recognize(
                prepared_image
            )
        except Exception:
            logger.warning(
                "Secondary OCR engine unavailable; continuing "
                "with primary-only recognition."
            )
            secondary_raw_results = []

    # --------------------------------------------------------
    # 4. Filter OCR results (per engine)
    # --------------------------------------------------------

    primary_results = filter_ocr_results(primary_raw_results)
    secondary_results = filter_ocr_results(secondary_raw_results)

    all_ocr_results = primary_results + secondary_results

    # --------------------------------------------------------
    # 5. Extract OCR text
    # --------------------------------------------------------

    primary_texts = [
        clean_text(result.text)
        for result in primary_results
        if clean_text(result.text)
    ]
    secondary_texts = [
        clean_text(result.text)
        for result in secondary_results
        if clean_text(result.text)
    ]
    ocr_texts = primary_texts + secondary_texts

    logger.debug("Primary OCR text: %r", primary_texts)
    logger.debug("Secondary OCR text: %r", secondary_texts)

    # --------------------------------------------------------
    # 6. Extract package-specific medicine information
    #
    # This includes:
    # - Dosage
    # - Manufacturing date
    # - Expiry date
    # - Batch number
    # --------------------------------------------------------

    medicine_details = extract_medicine_details(
        ocr_texts
    )

    # --------------------------------------------------------
    # 7. Find best medicine match
    # --------------------------------------------------------

    medicine_match = find_best_medicine_match(
        ocr_texts
    )

    # --------------------------------------------------------
    # 8. Calculate OCR evidence + engine agreement
    # --------------------------------------------------------

    ocr_confidence = calculate_medicine_ocr_confidence(
        all_ocr_results,
        medicine_match,
    )

    engine_agreement = calculate_engine_agreement(
        primary_texts,
        secondary_texts,
    )

    # --------------------------------------------------------
    # 9. Calculate final confidence
    # --------------------------------------------------------

    if medicine_match.medicine_key:

        if engine_agreement is None:
            # Single-engine run: no agreement signal available.
            combined_confidence = (
                WEIGHT_MATCH_SCORE_SINGLE_ENGINE * medicine_match.score
                + WEIGHT_OCR_CONFIDENCE_SINGLE_ENGINE * ocr_confidence
            )
        else:
            combined_confidence = (
                WEIGHT_MATCH_SCORE * medicine_match.score
                + WEIGHT_OCR_CONFIDENCE * ocr_confidence
                + WEIGHT_ENGINE_AGREEMENT * engine_agreement
            )

    else:

        combined_confidence = 0.0

    # --------------------------------------------------------
    # 10. Build final result
    # --------------------------------------------------------

    safety_result = _build_safety_result(
        medicine_match=medicine_match,
        confidence=combined_confidence,
        medicine_details=medicine_details,
        engine_agreement=engine_agreement,
    )

    return safety_result, ocr_texts


# ============================================================
# FINAL OUTPUT
# ============================================================

def _build_safety_result(
    medicine_match: MedicineMatch,
    confidence: float,
    medicine_details,
    engine_agreement: float | None = None,
) -> dict[str, object]:
    """
    Build a clean structured result.

    Raw OCR text is intentionally not returned.

    Package-specific information extracted directly from
    the medicine package is stored separately from general
    medicine information.

    6.6 / Section 13 / FR10: MedBox must never treat a recognition
    result as already-confirmed. This function only ever describes
    a *candidate* result for the voice/confirmation layer to read
    back — it never sets ``needs_confirmation`` to False, and it
    never exposes a candidate name below the high-confidence
    threshold (a previous version did both: it skipped confirmation
    entirely above 80%, and named a candidate medicine in a "medium
    confidence" tier below 80% — 6.6 explicitly says a low-confidence
    read "does not read out a name at all").
    """

    confidence = round(
        max(
            0.0,
            min(1.0, confidence),
        ),
        3,
    )

    # ========================================================
    # PACKAGE INFORMATION
    # ========================================================

    package_details = {
        "dosage": medicine_details.dosage,
        "manufacturing_date": medicine_details.manufacturing_date,
        "expiry_date": medicine_details.expiry_date,
        "batch_number": medicine_details.batch_number,
    }

    # ========================================================
    # HIGH CONFIDENCE — read back the candidate and ask "is that
    # right?" (7.6). Confirmation is still required; nothing here
    # is saved or acted on until that confirmation happens (FR10).
    # ========================================================

    if (
        medicine_match.medicine_key
        and medicine_match.medicine_info
        and confidence >= HIGH_CONFIDENCE_THRESHOLD
    ):

        medicine_info = medicine_match.medicine_info

        return {
            "recognized": True,

            "medicine_name": medicine_info["generic_name"],

            "candidate_medicine": medicine_info["generic_name"],

            "confidence": confidence,

            "engine_agreement": engine_agreement,

            "needs_confirmation": True,

            "medicine_info": medicine_info,

            "package_details": package_details,

            "message":
                f"The medicine appears to be {medicine_info['generic_name']}"
                + (
                    f" {medicine_info['strength']}."
                    if medicine_info.get("strength")
                    else "."
                )
                + " Is that right?",

            "status": "Needs Confirmation",
        }

    # ========================================================
    # BELOW THRESHOLD — no name is guessed at all (6.6, Step 2).
    # Any candidate the matcher found internally is deliberately
    # withheld from the response so it can never be spoken.
    # ========================================================

    return {
        "recognized": False,

        "medicine_name": None,

        "candidate_medicine": None,

        "confidence": confidence,

        "engine_agreement": engine_agreement,

        "needs_confirmation": True,

        "medicine_info": None,

        "package_details": package_details,

        "message":
            "I am not confident about the medicine name. "
            "Please capture the package again with better lighting.",

        "status": "Needs Rescan",
    }
