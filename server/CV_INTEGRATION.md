# Wiring in the real fluid-level model

This is the one file you need to change to plug your trained model into
the running system. Everything else - the upload endpoint, the database,
the WebSocket push to the dashboard - is already built and already
working with a mock. You're filling in one function.

## The interface

`app/cv/pipeline.py`:

```python
class FrameProcessor(ABC):
    @abstractmethod
    def process(self, device_id: str, frame_bytes: bytes) -> float: ...
```

That's the whole contract. Implement a class with this one method:

```python
class RealFrameProcessor(FrameProcessor):
    def process(self, device_id: str, frame_bytes: bytes) -> float:
        # frame_bytes is the raw uploaded image file (JPEG/PNG/whatever
        # your camera sends), exactly as bytes - decode it however your
        # script already does (cv2.imdecode, PIL.Image.open(BytesIO(...)), etc).
        #
        # Run your model, return the fill percentage as a plain float,
        # 0-100. That's it - nothing else to return.
        ...
        return level_pct
```

Then in the same file, change the last line from:

```python
active_processor: FrameProcessor = MockFrameProcessor()
```

to:

```python
active_processor: FrameProcessor = RealFrameProcessor()
```

Load your model weights once, outside `process()` (e.g. in `__init__` or
as a module-level global) - not on every request, or every upload will
re-load the model from disk.

## What you don't need to worry about

Everything downstream of that float is already handled centrally in
`app/cv/reading_builder.py`'s `build_reading()`:

- **Volume remaining** - computed from your level % × bag capacity (500mL
  default; pass a different `bag_capacity_ml` into `build_reading()` if
  needed).
- **Flow rate** - a single photo can't show a rate, so it's derived from
  how much volume drained since this same `device_id`'s last reading in
  the database (looked up automatically).
- **Status / alerts** (`NORMAL` / `LOW_LEVEL` / `EMPTY`) - derived from
  your level % against fixed thresholds.
- **Bed/patient/fluid labels, battery, wifi signal** - defaults or passed
  through separately; not something the image analysis produces.

You genuinely only need to return one number.

## Your dependencies and model file

- Add whatever your script needs (`opencv-python`, `torch`, `tensorflow`,
  `scikit-learn`, ...) to `requirements.txt` in this folder.
- Put your model weights file somewhere under `app/cv/` (e.g.
  `app/cv/models/level_model.pt`) and load it by a path relative to that
  file (`Path(__file__).parent / "models" / "..."`), not an absolute path
  from your own machine.
- If the weights file is large (tens of MB+), flag it - we may want it in
  Git LFS or downloaded at deploy time instead of committed directly.
- **Heads up on deployment**: the backend's free-tier host (Render) is
  CPU-only with limited RAM. If your model needs a GPU or a lot of memory
  to run inference, say so before we deploy - we'd need a different host
  or a lighter export of the model (e.g. ONNX/quantized) for it to run
  there at all.

## Testing without any camera or ESP32 hardware

1. `cd frontend/server`, activate the venv, `pip install -r requirements.txt`
   (after adding your deps), `uvicorn app.main:app --reload --port 8000`.
2. Open `http://localhost:8000/docs` in a browser.
3. Find `POST /api/v1/frames`, click "Try it out".
4. Set `device_id` to anything (e.g. `test-1`), pick any image file from
   your dataset, hit Execute.
5. You'll get back a full reading JSON with your computed level % flowed
   through into `fluid_level_percent`, `volume_remaining_ml`, `status`,
   etc. - confirms your model ran and the whole pipeline works.
6. Repeat with a couple of different images (different fill levels) and
   check the numbers move the way you'd expect.

If you'd rather script it than click through Swagger, `require_auth`
needs a bearer token unless `API_AUTH_TOKEN` is unset in `.env` (see the
main `README.md`'s Setup section) - check the startup log for the
current token.

```sh
curl -X POST "http://localhost:8000/api/v1/frames?device_id=test-1" \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/some_bag_photo.jpg"
```
