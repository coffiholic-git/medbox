from pathlib import Path
from typing import Protocol
from difflib import SequenceMatcher
import re

from src.perception.medicine_matcher import (
    MedicineMatch,
    find_best_medicine_match,
)

from src.perception.medicine_info_extractor import (
    extract_medicine_details,
)

from src.perception.ocr import (
    OCRResult,
    TesseractOCREngine,
)

from src.perception.preprocessing import (
    load_image,
    prepare_for_ocr,
)


# ============================================================
# MEDBOX CONFIDENCE SETTINGS
# ============================================================

HIGH_CONFIDENCE_THRESHOLD = 0.80
LOW_CONFIDENCE_THRESHOLD = 0.50

# Ignore OCR detections below this confidence.
MIN_OCR_CONFIDENCE = 0.40

# Minimum fuzzy similarity for medicine evidence.
FUZZY_MATCH_THRESHOLD = 0.60


# ============================================================
# OCR ENGINE INTERFACE
# ============================================================

class OCREngine(Protocol):
    def recognize(self, image) -> list[OCRResult]:
        ...


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
# MAIN MEDBOX PIPELINE
# ============================================================

def recognize_medicine(
    image_path: str | Path,
    ocr_engine: OCREngine | None = None,
) -> dict[str, object]:
    """
    Run the complete MedBox medicine recognition pipeline.

    Pipeline:

        Image
          ↓
        Preprocessing
          ↓
        OCR
          ↓
        OCR filtering
          ↓
        Package information extraction
          ↓
        Medicine matching
          ↓
        Confidence calculation
          ↓
        Safe structured result
    """

    # --------------------------------------------------------
    # 1. Load image
    # --------------------------------------------------------

    image = load_image(image_path)

    # --------------------------------------------------------
    # 2. Preprocess image
    # --------------------------------------------------------

    prepared_image = prepare_for_ocr(image)

    # --------------------------------------------------------
    # 3. OCR
    # --------------------------------------------------------

    engine = ocr_engine or TesseractOCREngine()

    all_ocr_results = engine.recognize(
        prepared_image
    )

    # --------------------------------------------------------
    # 4. Filter OCR results
    # --------------------------------------------------------

    ocr_results = filter_ocr_results(
        all_ocr_results
    )

    # --------------------------------------------------------
    # 5. Extract OCR text
    # --------------------------------------------------------

    ocr_texts = [
        clean_text(result.text)
        for result in ocr_results
        if clean_text(result.text)
    ]

    # Temporary debugging.
    # This helps us see exactly what Tesseract reads.
    print("\n--- OCR TEXT ---")

    for text in ocr_texts:
        print(repr(text))

    print("--- END OCR TEXT ---\n")

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
    # 8. Calculate OCR evidence
    # --------------------------------------------------------

    ocr_confidence = calculate_medicine_ocr_confidence(
        ocr_results,
        medicine_match,
    )

    # --------------------------------------------------------
    # 9. Calculate final confidence
    # --------------------------------------------------------

    if medicine_match.medicine_key:

        combined_confidence = (
            0.60 * medicine_match.score
            + 0.40 * ocr_confidence
        )

    else:

        combined_confidence = 0.0

    # --------------------------------------------------------
    # 10. Build final result
    # --------------------------------------------------------

    return _build_safety_result(
        medicine_match=medicine_match,
        confidence=combined_confidence,
        medicine_details=medicine_details,
    )


# ============================================================
# FINAL OUTPUT
# ============================================================

def _build_safety_result(
    medicine_match: MedicineMatch,
    confidence: float,
    medicine_details,
) -> dict[str, object]:
    """
    Build a clean structured result.

    Raw OCR text is intentionally not returned.

    Package-specific information extracted directly from
    the medicine package is stored separately from general
    medicine information.
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
    # HIGH CONFIDENCE
    # ========================================================

    if (
        medicine_match.medicine_key
        and medicine_match.medicine_info
        and confidence >= HIGH_CONFIDENCE_THRESHOLD
    ):

        medicine_info = medicine_match.medicine_info

        return {
            "recognized": True,

            "medicine_name": medicine_info[
                "generic_name"
            ],

            "candidate_medicine": medicine_info[
                "generic_name"
            ],

            "confidence": confidence,

            "needs_confirmation": False,

            "medicine_info": medicine_info,

            "package_details": package_details,

            "message":
                "Medicine identified with high confidence.",

            "status": "Identified",
        }

    # ========================================================
    # MEDIUM CONFIDENCE
    # ========================================================

    if (
        medicine_match.medicine_key
        and medicine_match.medicine_info
        and confidence >= LOW_CONFIDENCE_THRESHOLD
    ):

        medicine_info = medicine_match.medicine_info

        return {
            "recognized": False,

            "medicine_name": None,

            "candidate_medicine": medicine_info[
                "generic_name"
            ],

            "confidence": confidence,

            "needs_confirmation": True,

            "medicine_info": medicine_info,

            "package_details": package_details,

            "message":
                "Medicine detected but confirmation is required.",

            "status": "Needs Confirmation",
        }

    # ========================================================
    # LOW CONFIDENCE WITH A CANDIDATE
    # ========================================================

    if (
        medicine_match.medicine_key
        and medicine_match.medicine_info
    ):

        medicine_info = medicine_match.medicine_info

        return {
            "recognized": False,

            "medicine_name": None,

            "candidate_medicine": medicine_info[
                "generic_name"
            ],

            "confidence": confidence,

            "needs_confirmation": True,

            "medicine_info": medicine_info,

            "package_details": package_details,

            "message":
                "A possible medicine match was detected, "
                "but confidence is too low. Please rescan "
                "the package.",

            "status": "Needs Confirmation",
        }

    # ========================================================
    # NO MEDICINE MATCH
    # ========================================================

    return {
        "recognized": False,

        "medicine_name": None,

        "candidate_medicine": None,

        "confidence": confidence,

        "needs_confirmation": True,

        "medicine_info": None,

        "package_details": package_details,

        "message":
            "Medicine could not be identified confidently. "
            "Please rescan the package.",

        "status": "Needs Rescan",
    }