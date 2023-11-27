import ffmpeg

input_video = ffmpeg.input("viofo_ph.mp4")

hist = (
    input_video
    .filter("format", "gbrp")
    .filter("histogram", display_mode="stack")
    .filter("scale", "iw*2", "ih")
)

edges = (
    input_video
    .filter("edgedetect")
    .filter("scale", "iw/4", "ih/4")
)

hist_overlay = input_video.overlay(hist)

out_stream = hist_overlay.overlay(edges, x=800, y=0)

out_stream.output(
    f"outputs/histogram_python.mp4"
).overwrite_output().run()
