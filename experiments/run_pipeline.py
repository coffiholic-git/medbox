from pathlib import Path
import sys

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from src.perception.pipeline import recognize_medicine


def main() -> None:
    image_path = PROJECT_ROOT / "data" / "medicine_images" / "image.png"

    result = recognize_medicine(image_path)

    print("MEDBOX MEDICINE RECOGNITION")
    print("---------------------------")

    # Medicine Name
    medicine_name = (
        result.get("medicine_name")
        or result.get("candidate_medicine")
        or "Unknown"
    )

    print("Medicine Name:")
    print(medicine_name)

    # Confidence
    confidence = result.get("confidence", 0.0)

    try:
        confidence = float(confidence)
    except (TypeError, ValueError):
        confidence = 0.0

    print()
    print("Confidence:")
    print(f"{confidence * 100:.1f}%")

    # Status
    print()
    print("Status:")
    print(result.get("status", "Unknown"))

    # Message
    print()
    print("Message:")
    print(result.get("message", ""))

    # Medicine Information
    medicine_info = result.get("medicine_info")

    if medicine_info:
        print()
        print("MEDICINE INFORMATION")
        print("--------------------")

        for key, value in medicine_info.items():
            print(f"{key.replace('_', ' ').title()} : {value}")

    # Package Information
    package_details = result.get("package_details")

    if package_details:
        print()
        print("PACKAGE INFORMATION")
        print("-------------------")

        print(
            "Dosage             :",
            package_details.get("dosage") or "Not detected",
        )

        print(
            "Manufacturing Date :",
            package_details.get("manufacturing_date")
            or "Not detected",
        )

        print(
            "Expiry Date        :",
            package_details.get("expiry_date")
            or "Not detected",
        )

        print(
            "Batch Number       :",
            package_details.get("batch_number")
            or "Not detected",
        )

    print()


if __name__ == "__main__":
    main()