from src.perception.ocr import OCRResult
from src.perception.pipeline import recognize_medicine

IMAGE_PATH = "data/medicine_images/image.png"


class FakeOCREngine:
    def __init__(self, results):
        self._results = results

    def recognize(self, image):
        return self._results


def test_pipeline_recognizes_high_confidence_medicine():
    engine = FakeOCREngine([OCRResult("PARACETAMOL", 0.95, [])])

    result = recognize_medicine(IMAGE_PATH, ocr_engine=engine)

    assert result["recognized"] is True
    assert result["medicine_name"] == "Paracetamol"
    assert result["needs_confirmation"] is False


def test_pipeline_requires_rescan_for_low_confidence_result():
    engine = FakeOCREngine([OCRResult("unknown text", 0.30, [])])

    result = recognize_medicine(IMAGE_PATH, ocr_engine=engine)

    assert result["recognized"] is False
    assert result["medicine_name"] is None
    assert result["needs_confirmation"] is True
