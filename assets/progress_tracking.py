import socket
from threading import Thread
from contextlib import contextmanager
import tempfile
import ffmpeg
from pathlib import Path
from tqdm import tqdm


@contextmanager
def open_progress_socket():
    with tempfile.TemporaryDirectory() as tempdir:
        sock = socket.socket(
            socket.AF_UNIX, socket.SOCK_STREAM)
        socket_filename = Path(tempdir) / "progress.sock"
        sock.bind(str(socket_filename))
        sock.settimeout(15)
        try:
            sock.listen(1)
            yield sock, socket_filename
        finally:
            sock.close()


def watch_progress(sock: socket.socket, total_duration: int):
    conn, _ = sock.accept()
    abs_progress = 0
    with tqdm(total=total_duration) as pbar:
        while rec := conn.recv(4096):
            out_time_us = dict(
                map(
                    lambda x: x.split("="),
                    rec.decode("utf-8").split("\n")[:-1],
                )
            )["out_time_us"]
            processed_seconds = round(
                int(out_time_us) / 1000000
            )
            delta = processed_seconds - abs_progress
            pbar.update(delta)
            abs_progress = processed_seconds


with open_progress_socket() as (sock, socket_filename):
    total_duration = float(
        ffmpeg.probe(
            "outputs/viofo_marked.mp4"
        )["streams"][0]["duration"]
    )
    print(f"Total duration: {total_duration}")
    t = Thread(target=watch_progress, args=(sock, total_duration))
    t.start()
    (
        ffmpeg.input("outputs/viofo_marked.mp4")
        .output(
            "outputs/viofo_marked_h265.mp4",
            vcodec="hevc"
        )
        .overwrite_output()
        .global_args(
            "-progress",
            f"unix://{socket_filename}"
        )
    ).run(quiet=True)
    t.join()
