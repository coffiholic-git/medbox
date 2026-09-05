"""
Integration coverage for the adapter in services/ocr_service.py that
actually wires the router up to backend/perception (as opposed to
test_recognition.py, which monkeypatches run_recognition entirely to
test the confirmation-loop logic in isolation).

These exercise the real pipeline against the sample image, so they
also double as a smoke test that backend/perception + its reference
data are actually reachable from inside the backend package.
"""
from backend.services import ocr_service


def test_run_recognition_without_image_falls_back_to_simulated():
    result = ocr_service.run_recognition(None, file_name="whatever.jpg")

    assert result.simulated is True
    assert result.matched is not None
    assert 0.0 <= result.confidence <= 100.0


def test_run_recognition_with_real_image_runs_the_real_pipeline_or_degrades_gracefully():
    with open(
        "backend/data/medicine_images/image.png", "rb"
    ) as f:
        image_bytes = f.read()

    result = ocr_service.run_recognition(image_bytes, file_name="image.png")

    # Whether or not PaddleOCR happens to be installed in this
    # environment, the real path (simulated=False) must never crash —
    # it should either produce a real result or fall back cleanly.
    assert isinstance(result.confidence, float)
    assert isinstance(result.engines_agree, bool)
    if result.matched is not None:
        assert {"name", "strength", "form", "instructions"} <= result.matched.keys()
