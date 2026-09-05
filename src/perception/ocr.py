from dataclasses import dataclass
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import pytesseract


@dataclass
class OCRResult:
    text: str
    confidence: float
    bbox: list[Any]


def parse_paddleocr_results(raw_results: Any) -> list[OCRResult]:
    """Convert PaddleOCR output into the common OCRResult format."""

    results: list[OCRResult] = []

    # Newer PaddleOCR result format
    if isinstance(raw_results, dict):
        data = raw_results.get("res", raw_results)

        if isinstance(data, dict):
            texts = data.get("rec_texts", [])
            scores = data.get("rec_scores", [])
            boxes = data.get("rec_polys") or data.get("rec_boxes") or []

            if isinstance(texts, list) and isinstance(scores, list):
                for i, text in enumerate(texts):
                    text = str(text).strip()

                    if not text:
                        continue

                    try:
                        confidence = float(scores[i])
                    except (ValueError, TypeError, IndexError):
                        confidence = 0.0

                    bbox = boxes[i] if i < len(boxes) else []

                    results.append(
                        OCRResult(
                            text=text,
                            confidence=confidence,
                            bbox=bbox,
                        )
                    )

        return [
            result
            for result in results
            if result.text
        ]

    # Older PaddleOCR list format
    if isinstance(raw_results, list):
        for item in raw_results:
            results.extend(
                _parse_paddle_item(item)
            )

    return [
        result
        for result in results
        if result.text
    ]


def _parse_paddle_item(
    item: Any,
) -> list[OCRResult]:
    """Parse one item from the older PaddleOCR result format."""

    if not isinstance(item, list):
        return []

    # One OCR result:
    # [bbox, [text, confidence]]
    if (
        len(item) == 2
        and isinstance(item[1], (list, tuple))
        and len(item[1]) == 2
    ):
        bbox, text_score = item
        text, confidence = text_score

        return [
            OCRResult(
                text=str(text).strip(),
                confidence=float(confidence),
                bbox=bbox,
            )
        ]

    results: list[OCRResult] = []

    for child in item:
        results.extend(
            _parse_paddle_item(child)
        )

    return results


class TesseractOCREngine:
    """OCR engine using Tesseract for MedBox."""

    def __init__(self) -> None:
        tesseract_path = Path(
            r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        )

        if not tesseract_path.exists():
            raise FileNotFoundError(
                "Tesseract was not found at "
                f"{tesseract_path}"
            )

        pytesseract.pytesseract.tesseract_cmd = str(
            tesseract_path
        )

    def recognize(
        self,
        image: np.ndarray,
    ) -> list[OCRResult]:
        """Run Tesseract OCR on a prepared OpenCV image."""

        # Enlarge the image to make small medicine text easier to read.
        image = cv2.resize(
            image,
            None,
            fx=3,
            fy=3,
            interpolation=cv2.INTER_CUBIC,
        )

        # Convert to grayscale only if the image is still in color.
        if len(image.shape) == 3:
            gray = cv2.cvtColor(
                image,
                cv2.COLOR_BGR2GRAY,
            )
        else:
            gray = image

        # Reduce small image noise.
        gray = cv2.GaussianBlur(
            gray,
            (3, 3),
            0,
        )

        # Improve contrast for the metallic medicine strip.
        thresholded = cv2.adaptiveThreshold(
            gray,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            11,
        )

        # Get word-level OCR data including confidence and bounding boxes.
        data = pytesseract.image_to_data(
            thresholded,
            config="--psm 6",
            output_type=pytesseract.Output.DICT,
        )

        results: list[OCRResult] = []

        for i, text in enumerate(
            data["text"]
        ):
            text = text.strip()

            if not text:
                continue

            # Tesseract confidence is returned as 0-100.
            try:
                confidence = (
                    float(data["conf"][i])
                    / 100.0
                )
            except (
                ValueError,
                TypeError,
                IndexError,
            ):
                confidence = 0.0

            # Ignore extremely low-confidence detections.
            if confidence < 0.15:
                continue

            x = int(data["left"][i])
            y = int(data["top"][i])
            width = int(data["width"][i])
            height = int(data["height"][i])

            bbox = [
                [x, y],
                [x + width, y],
                [x + width, y + height],
                [x, y + height],
            ]

            results.append(
                OCRResult(
                    text=text,
                    confidence=confidence,
                    bbox=bbox,
                )
            )

        return results