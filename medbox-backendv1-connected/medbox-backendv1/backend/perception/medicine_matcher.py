import json
import re
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path


# 6.1 / 6.2: OCR text is "fuzzy-matched against the medicine
# database" and structured fields are pulled out for each match.
#
# This used to be a single hardcoded entry ("paracetamol"), so the
# matcher could never recognize anything else — a fresh scan of any
# other real medicine would always fall through to "no match" no
# matter how good the OCR was. It now loads the shared reference
# dataset directly from backend/data/medicine_reference.json — the
# same file the rest of the backend (medicines/interaction routers)
# already reads — so the matcher covers the full medicine library
# and there is exactly one copy of the reference data on disk, with
# the single-entry dict kept only as a last-resort fallback so the
# module still degrades gracefully if the data file is missing.
_REFERENCE_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "medicine_reference.json"
)

_FALLBACK_MEDICINES = {
    "paracetamol": {
        "generic_name": "Paracetamol",
        "strength": "500 mg",
        "active_ingredient": "acetaminophen",
        "manufacturer": None,
        "instructions": None,
        "common_uses": ["pain relief", "fever"],
        "warning": "Use only as directed.",
    },
}


def _load_medicines() -> dict:
    """Build the MEDICINES lookup from the shared reference dataset."""

    try:
        with open(_REFERENCE_PATH, encoding="utf-8") as handle:
            entries = json.load(handle)
    except (OSError, ValueError):
        # Data file missing or unreadable — fall back rather than
        # crashing the whole matching module.
        return dict(_FALLBACK_MEDICINES)

    medicines = {}

    for entry in entries:
        name = entry.get("name")

        if not name:
            continue

        key = name.strip().lower()

        medicines[key] = {
            "generic_name": name,
            "strength": entry.get("strength"),
            "active_ingredient": entry.get("active_ingredient"),
            "manufacturer": entry.get("manufacturer"),
            "instructions": entry.get("instructions"),
            # Not part of the shared reference file yet; kept so
            # downstream voice responses have a consistent shape.
            "common_uses": entry.get("common_uses", []),
            "warning": entry.get("warning", "Use only as directed."),
        }

    return medicines or dict(_FALLBACK_MEDICINES)


MEDICINES = _load_medicines()


@dataclass
class MedicineMatch:
    medicine_key: str | None
    medicine_info: dict | None
    score: float
    matched_text: str | None


def normalize_text(text: str) -> str:
    """
    Normalize OCR text before comparison.
    """
    text = text.lower()

    # Remove special characters.
    text = re.sub(r"[^a-z0-9\s]", " ", text)

    # Normalize whitespace.
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def similarity(a: str, b: str) -> float:
    """
    Calculate similarity between two strings.
    """
    return SequenceMatcher(None, a, b).ratio()


def correct_common_ocr_errors(text: str) -> str:
    """
    Correct a few common OCR character errors.

    These corrections are intentionally conservative.
    """

    replacements = {
        "0": "o",
        "1": "l",
        "5": "s",
        "8": "b",
    }

    for wrong, correct in replacements.items():
        text = text.replace(wrong, correct)

    return text


def compare_ocr_text(text: str, medicine_name: str) -> float:
    """
    Compare OCR text against a medicine name using
    multiple matching strategies.
    """

    text = normalize_text(text)
    medicine_name = normalize_text(medicine_name)

    if not text:
        return 0.0

    # Direct similarity.
    best_score = similarity(text, medicine_name)

    # OCR corrections.
    corrected_text = correct_common_ocr_errors(text)

    corrected_score = similarity(corrected_text, medicine_name)
    best_score = max(best_score, corrected_score)

    # Compare individual OCR words.
    for word in corrected_text.split():

        if len(word) < 4:
            continue

        word_score = similarity(word, medicine_name)
        best_score = max(best_score, word_score)

    return best_score


def find_best_medicine_match(ocr_texts: list[str]) -> MedicineMatch:
    """
    Find the medicine whose name most closely matches
    the OCR detections.
    """

    best_key = None
    best_info = None
    best_score = 0.0
    best_text = None

    for medicine_key, medicine_info in MEDICINES.items():

        medicine_name = medicine_info["generic_name"]

        for raw_text in ocr_texts:

            if not isinstance(raw_text, str):
                continue

            text = normalize_text(raw_text)

            if not text:
                continue

            score = compare_ocr_text(
                text,
                medicine_name
            )

            if score > best_score:

                best_score = score
                best_key = medicine_key
                best_info = medicine_info
                best_text = text

    # Accept strong matches.
    #
    # 0.60 is intentionally used here because OCR can
    # introduce character-level errors.
    if best_score >= 0.60:

        return MedicineMatch(
            medicine_key=best_key,
            medicine_info=best_info,
            score=best_score,
            matched_text=best_text,
        )

    # No sufficiently strong match.
    return MedicineMatch(
        medicine_key=None,
        medicine_info=None,
        score=best_score,
        matched_text=best_text,
    )