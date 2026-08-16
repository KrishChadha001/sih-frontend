import random
from abc import ABC, abstractmethod

from ..schemas import ReadingIn


class FrameProcessor(ABC):
    """Turns a raw camera frame into an IV drip reading. This is the
    server-side mirror of the firmware's IDataProvider swap point
    (firmware/esp32-iv-monitor/include/data_provider.h): once the ESP32-S3
    starts shipping real frames instead of precomputed mock readings, wire
    a real implementation here (OpenCV contour/level detection, optical
    flow for flow rate, etc.) and swap it in in app/routers/frames.py -
    nothing else in the API changes."""

    @abstractmethod
    def process(self, device_id: str, frame_bytes: bytes) -> ReadingIn: ...


class MockFrameProcessor(FrameProcessor):
    """Ignores the frame entirely and returns plausible random numbers, so
    the /api/v1/frames upload path can be exercised end-to-end before any
    real CV exists."""

    def process(self, device_id: str, frame_bytes: bytes) -> ReadingIn:
        level = round(random.uniform(10, 100), 1)
        capacity = 500.0
        return ReadingIn(
            device_id=device_id,
            timestamp_ms=0,
            fluid_level_percent=level,
            volume_remaining_ml=round(capacity * level / 100, 1),
            bag_capacity_ml=capacity,
            flow_rate_ml_per_hr=125.0,
            drop_rate_per_min=41.6,
            estimated_time_remaining_min=round((capacity * level / 100) / 125.0 * 60, 1),
            battery_percent=100,
            wifi_rssi=0,
            status="LOW_LEVEL" if level <= 15 else "NORMAL",
            alert="Fluid level low" if level <= 15 else None,
        )


active_processor: FrameProcessor = MockFrameProcessor()
