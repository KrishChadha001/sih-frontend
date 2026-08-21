import random
from abc import ABC, abstractmethod


class FrameProcessor(ABC):
    """Turns a raw camera frame into a fluid-level reading, 0-100%. This is
    the *entire* contract a real CV/ML implementation needs to satisfy -
    see CV_INTEGRATION.md for the full spec. Volume, flow rate, status and
    defaults are derived centrally from this number in
    app/cv/reading_builder.py, so an implementation here only ever needs
    to answer one question: given this image, what's the fill percentage?
    """

    @abstractmethod
    def process(self, device_id: str, frame_bytes: bytes) -> float: ...


class MockFrameProcessor(FrameProcessor):
    """Ignores the frame entirely and returns a plausible random level, so
    the /api/v1/frames upload path can be exercised end-to-end before any
    real CV exists."""

    def process(self, device_id: str, frame_bytes: bytes) -> float:
        return round(random.uniform(10, 100), 1)


# Swap this to your real implementation once it's ready - everything else
# (routing, DB, WebSocket broadcast, frontend) stays exactly as-is. See
# CV_INTEGRATION.md.
active_processor: FrameProcessor = MockFrameProcessor()
