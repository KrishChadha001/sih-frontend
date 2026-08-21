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
