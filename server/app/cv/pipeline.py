import random

from .base import FrameProcessor
from .real_frame_processor import RealFrameProcessor

__all__ = ["FrameProcessor", "MockFrameProcessor", "active_processor"]


class MockFrameProcessor(FrameProcessor):
    """Ignores the frame entirely and returns a plausible random level, so
    the /api/v1/frames upload path can be exercised end-to-end before any
    real CV exists."""

    def process(self, device_id: str, frame_bytes: bytes) -> float:
        return round(random.uniform(10, 100), 1)


# The real model - see CV_INTEGRATION.md / real_frame_processor.py. Fall
# back to `MockFrameProcessor()` here if you need the random-numbers path
# again (e.g. the real model file isn't present locally).
active_processor: FrameProcessor = RealFrameProcessor()
