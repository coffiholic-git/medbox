import re
from dataclasses import dataclass


@dataclass
class MedicineDetails:
    expiry_date: str | None = None
    manufacturing_date: str | None = None
    batch_number: str | None = None
    dosage: str | None = None


def extract_expiry_date(text: str) -> str | None:
    if not text:
        return None

    pattern = re.compile(
        r"""
        (?:EXP(?:IRY)?)
        \s*[:.\-]?\s*
        (
            (?:0?[1-9]|1[0-2])
            \s*[/\-]\s*
            (?:\d{4}|\d{2})
        )
        """,
        re.IGNORECASE | re.VERBOSE,
    )

    match = pattern.search(text)

    if match:
        return match.group(1).replace(" ", "")

    return None


def extract_manufacturing_date(text: str) -> str | None:
    if not text:
        return None

    pattern = re.compile(
        r"""
        (?:MFG|MFD|MANUFACTURED)
        \s*[:.\-]?\s*
        (
            (?:0?[1-9]|1[0-2])
            \s*[/\-]\s*
            (?:\d{4}|\d{2})
        )
        """,
        re.IGNORECASE | re.VERBOSE,
    )

    match = pattern.search(text)

    if match:
        return match.group(1).replace(" ", "")

    return None


def extract_batch_number(text: str) -> str | None:
    if not text:
        return None

    pattern = re.compile(
        r"""
        (?:
            BATCH
            (?:\s*NO)? |
            B\.?\s*NO |
            LOT
        )
        \s*[:#.\-]?\s*
        ([A-Z0-9][A-Z0-9\-/]{2,})
        """,
        re.IGNORECASE | re.VERBOSE,
    )

    match = pattern.search(text)

    if match:
        return match.group(1)

    return None


def extract_dosage(text: str) -> str | None:
    if not text:
        return None

    pattern = re.compile(
        r"""
        \b
        \d+(?:\.\d+)?
        \s*
        (?:
            mg/ml
            |mg
            |mcg
            |ml
            |g
            |%
        )
        \b
        """,
        re.IGNORECASE | re.VERBOSE,
    )

    match = pattern.search(text)

    if match:
        return match.group(0).strip()

    return None


def extract_medicine_details(
    ocr_texts: list[str],
) -> MedicineDetails:

    if not ocr_texts:
        return MedicineDetails()

    combined_text = " ".join(
        str(text)
        for text in ocr_texts
        if text
    )

    return MedicineDetails(
        expiry_date=extract_expiry_date(combined_text),
        manufacturing_date=extract_manufacturing_date(combined_text),
        batch_number=extract_batch_number(combined_text),
        dosage=extract_dosage(combined_text),
    )