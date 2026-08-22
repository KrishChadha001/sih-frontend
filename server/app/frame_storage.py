"""Keeps exactly one JPEG on disk per device - the most recent frame it
sent. Deliberately overwrite-only, not an accumulating history: for a
multi-hour/multi-day demo period this means image storage never grows
past (frame size x number of distinct devices), regardless of how many
uploads happen. Readings (the numeric history) still accumulate in the
DB - see reading_builder.prune_old_readings for that side."""

import re
from pathlib import Path

FRAMES_DIR = Path(__file__).resolve().parent.parent / "data" / "frames"
_SAFE_DEVICE_ID = re.compile(r"[^A-Za-z0-9_-]")


def _frame_path(device_id: str) -> Path:
    # device_id comes straight from a query param - sanitize before using
    # it in a filename so it can't escape FRAMES_DIR or collide oddly.
    safe_id = _SAFE_DEVICE_ID.sub("_", device_id) or "unknown"
    return FRAMES_DIR / f"{safe_id}.jpg"


def save_latest_frame(device_id: str, frame_bytes: bytes) -> None:
    FRAMES_DIR.mkdir(parents=True, exist_ok=True)
    _frame_path(device_id).write_bytes(frame_bytes)


def load_latest_frame(device_id: str) -> bytes | None:
    path = _frame_path(device_id)
    if not path.exists():
        return None
    return path.read_bytes()
