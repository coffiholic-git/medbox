from pathlib import Path

import cv2
import numpy as np


def load_image(image_path: str | Path) -> np.ndarray:
    """Load an image from disk using OpenCV."""
    path = Path(image_path)
    image = cv2.imread(str(path))

    if image is None:
        raise FileNotFoundError(
            f"Could not load image: {path}"
        )

    return image


def resize_with_aspect_ratio(
    image: np.ndarray,
    max_width: int = 1000,
    max_height: int = 1000,
) -> np.ndarray:
    """Resize an image to fit inside max_width/max_height without stretching."""
    height, width = image.shape[:2]

    scale = min(
        max_width / width,
        max_height / height,
        1.0,
    )

    if scale == 1.0:
        return image.copy()

    new_size = (
        int(width * scale),
        int(height * scale),
    )

    return cv2.resize(
        image,
        new_size,
        interpolation=cv2.INTER_AREA,
    )


def convert_to_grayscale(
    image: np.ndarray,
) -> np.ndarray:
    """Convert a BGR color image to grayscale."""

    if len(image.shape) == 2:
        return image.copy()

    return cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY,
    )


def sharpen_image(
    image: np.ndarray,
) -> np.ndarray:
    """Apply a light sharpening filter that can help some medicine labels."""

    kernel = np.array(
        [
            [0, -1, 0],
            [-1, 5, -1],
            [0, -1, 0],
        ]
    )

    return cv2.filter2D(
        image,
        -1,
        kernel,
    )


def prepare_for_ocr(
    image: np.ndarray,
    max_width: int = 1000,
    grayscale: bool = True,
    denoise: bool = False,
    sharpen: bool = False,
) -> np.ndarray:
    """Prepare an image for OCR with simple, configurable steps."""

    prepared = resize_with_aspect_ratio(
        image,
        max_width=max_width,
    )

    if grayscale:
        prepared = convert_to_grayscale(
            prepared
        )

    if denoise:
        prepared = cv2.fastNlMeansDenoising(
            prepared
        )

    if sharpen:
        prepared = sharpen_image(
            prepared
        )

    return prepared