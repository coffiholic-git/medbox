import cv2

image_path = input("Enter image path: ")

image = cv2.imread(image_path)

if image is None:
    print("Could not load the image.")
else:
    print("Original image shape:", image.shape)

    resized_image = cv2.resize(image, (250, 206))
    print("Resized image shape:", resized_image.shape)

    gray_image = cv2.cvtColor(resized_image, cv2.COLOR_BGR2GRAY)
    print("Grayscale image shape:", gray_image.shape)