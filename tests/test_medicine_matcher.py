from src.perception.medicine_matcher import find_best_medicine_match, normalize_text


def test_normalize_text_removes_extra_symbols():
    assert normalize_text(" Para-cetamol 500mg! ") == "para cetamol 500mg"


def test_find_best_medicine_match_finds_known_name_in_ocr_text():
    match = find_best_medicine_match(["PARACETAMOL 500"])

    assert match.medicine_key == "paracetamol"
    assert match.score >= 0.9

