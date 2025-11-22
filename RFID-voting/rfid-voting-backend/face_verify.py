import cv2
import face_recognition
import sys
import os
import time
import numpy as np

TIMEOUT_SECONDS = 10
FACE_DIR = "faces"  # folder where reference images are stored


def load_reference_encoding(tag_id):
    """
    Loads the reference image for the given tag ID and returns its face encoding.
    Supports:
    - faces/<tag>.jpg
    - faces/<tag>.png
    """

    jpg_path = os.path.join(FACE_DIR, f"{tag_id}.jpg")
    png_path = os.path.join(FACE_DIR, f"{tag_id}.png")

    if os.path.exists(jpg_path):
        ref_img = face_recognition.load_image_file(jpg_path)
    elif os.path.exists(png_path):
        ref_img = face_recognition.load_image_file(png_path)
    else:
        print(f"ERROR: Reference image for tag {tag_id} not found.")
        return None

    # Detect face in reference image
    ref_locations = face_recognition.face_locations(ref_img, model="hog")
    if len(ref_locations) == 0:
        print("ERROR: No face found in the reference image.")
        return None

    # dlib 20-compatible encoding call
    ref_encoding = face_recognition.face_encodings(ref_img, ref_locations, num_jitters=1, model="large")[0]
    return ref_encoding


def verify_live_face(tag_id):
    """
    Opens webcam, compares live face to reference encoding.
    """

    ref_encoding = load_reference_encoding(tag_id)
    if ref_encoding is None:
        return False

    print(f"INFO: Verifying live face for tag {tag_id}. Look at the camera...")

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Cannot access camera.")
        return False

    start_time = time.time()

    while True:
        ret, frame = cap.read()
        if not ret:
            print("ERROR: Failed to capture frame.")
            break

        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Detect face locations
        locations = face_recognition.face_locations(rgb, model="hog")

        if len(locations) > 0:
            # Encode detected face (works with dlib 20)
            encodings = face_recognition.face_encodings(rgb, locations, num_jitters=1, model="large")

            if len(encodings) > 0:
                live_encoding = encodings[0]
                # Compare face distances
                distance = np.linalg.norm(ref_encoding - live_encoding)

                print(f"INFO: Face distance = {distance:.3f}")

                if distance < 0.55:  # threshold
                    print("VERIFIED: Face match successful.")
                    cap.release()
                    cv2.destroyAllWindows()
                    return True
                else:
                    print("WARNING: Face does not match.")

        # Timeout
        if time.time() - start_time > TIMEOUT_SECONDS:
            print("FAILED: Timeout - No matching face found.")
            break

        # Display live feed (optional)
        cv2.imshow("Face Verification", frame)
        if cv2.waitKey(1) == 27:  # ESC to exit manually
            break

    cap.release()
    cv2.destroyAllWindows()
    return False


def main():
    if len(sys.argv) < 2:
        print("ERROR: No tag ID provided.")
        sys.exit(1)

    tag_id = sys.argv[1].strip()

    result = verify_live_face(tag_id)
    sys.exit(0 if result else 1)


if __name__ == "__main__":
    main()
