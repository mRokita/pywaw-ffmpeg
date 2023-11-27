from typing import Sequence

import ffmpeg
import numpy as np
import cv2

INPUT_FILE = "registration_plates.mp4"
OUTPUT_FILE = "outputs/viofo_marked.mp4"


def mark_plates(frame: cv2.typing.MatLike, found_plates: Sequence[cv2.typing.Rect]) -> None:
    y_offset = video_height // 20
    x_offset = video_width // 20
    for plate in found_plates:
        x, y, width, height = plate
        registration_plate = frame[y : y + height, x : x + width]
        new_height = height * 20
        new_width = width * 20
        big_plate = cv2.resize(registration_plate, (new_width, new_height))
        frame[
            y_offset : y_offset + new_height, x_offset : x_offset + new_width
        ] = big_plate
        cv2.rectangle(frame, (x, y), (x + width, y + height), (0, 255, 0), 5)
        y_offset += new_height + 10


video_width, video_height, framerate = next(
    (
        (s["width"], s["height"], int(s["r_frame_rate"].split("/")[0]))
        for s in ffmpeg.probe(INPUT_FILE)["streams"]
        if s["codec_type"] == "video"
    )
)

process1 = (
    ffmpeg.input(INPUT_FILE)
    .video.filter("fps", framerate)
    .output("pipe:", format="rawvideo", pix_fmt="bgr24")
    .run_async(pipe_stdout=True)
)

process2 = (
    ffmpeg.input(
        "pipe:",
        format="rawvideo",
        pix_fmt="bgr24",
        s=f"{video_width}x{video_height}",
        framerate=framerate // 4,
    )
    .output(OUTPUT_FILE, pix_fmt="yuv420p")
    .overwrite_output()
    .run_async(pipe_stdin=True)
)

classifier = cv2.CascadeClassifier("haarcascade_plate_number.xml")

while in_bytes := process1.stdout.read(video_width * video_height * 3):
    in_frame = (
        np.frombuffer(in_bytes, np.uint8)
        .reshape([video_height, video_width, 3])
        .astype(np.uint8)
    )
    frame = in_frame.copy()
    found_plates = classifier.detectMultiScale(
        frame, minNeighbors=4, scaleFactor=1.05, minSize=(50, 20), maxSize=(100, 40)
    )
    mark_plates(frame, found_plates)
    process2.stdin.write(frame.astype(np.uint8).tobytes())

process2.stdin.close()
process1.wait()
process2.wait()
