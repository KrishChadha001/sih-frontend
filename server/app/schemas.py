from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ReadingIn(BaseModel):
    """What the ESP32 firmware POSTs. Must match CloudClient::sendReading()
    in firmware/esp32-iv-monitor/src/cloud_client.cpp."""

    device_id: str
    timestamp_ms: int
    fluid_level_percent: float
    volume_remaining_ml: float
    bag_capacity_ml: float
    flow_rate_ml_per_hr: float
    drop_rate_per_min: float
    estimated_time_remaining_min: float
    battery_percent: int
    wifi_rssi: int
    status: str
    alert: str | None = None

    bed_label: str | None = None
    patient_name: str | None = None
    fluid_label: str | None = None


class ReadingOut(ReadingIn):
    model_config = ConfigDict(from_attributes=True)

    id: int
    received_at: datetime
