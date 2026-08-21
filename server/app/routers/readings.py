import csv
import io

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..bedfeed import to_bed_payload
from ..config import settings
from ..db import get_db
from ..models import Reading
from ..schemas import ReadingIn, ReadingOut
from ..ws_manager import bed_manager, reading_manager

router = APIRouter(prefix="/api/v1/readings", tags=["readings"])

# A proper Security scheme (not a bare Header dependency) so /docs renders
# a real "Authorize" button - paste the token once, it's sent on every
# request after that. The wire format is unchanged: clients (firmware,
# curl) still send "Authorization: Bearer <token>" exactly as before.
_bearer_scheme = HTTPBearer(auto_error=False)


def require_auth(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme)) -> None:
    if not settings.api_auth_token:
        return  # auth disabled while prototyping
    if credentials is None or credentials.credentials != settings.api_auth_token:
        raise HTTPException(status_code=401, detail="invalid or missing bearer token")


@router.post("", response_model=ReadingOut, status_code=201, dependencies=[Depends(require_auth)])
async def ingest_reading(reading: ReadingIn, db: Session = Depends(get_db)):
    row = Reading(**reading.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)

    out = ReadingOut.model_validate(row)
    await reading_manager.broadcast(out.model_dump(mode="json"))
    await bed_manager.broadcast(to_bed_payload(out))
    return out


@router.get("", response_model=list[ReadingOut])
def list_readings(
    device_id: str | None = None,
    limit: int = Query(default=200, le=5000),
    db: Session = Depends(get_db),
):
    stmt = select(Reading).order_by(Reading.received_at.desc()).limit(limit)
    if device_id:
        stmt = stmt.where(Reading.device_id == device_id)
    return db.scalars(stmt).all()


@router.get("/latest", response_model=ReadingOut)
def latest_reading(device_id: str | None = None, db: Session = Depends(get_db)):
    stmt = select(Reading).order_by(Reading.received_at.desc())
    if device_id:
        stmt = stmt.where(Reading.device_id == device_id)
    row = db.scalars(stmt).first()
    if row is None:
        raise HTTPException(status_code=404, detail="no readings yet")
    return row


_EXPORT_COLUMNS = [
    "id", "device_id", "timestamp_ms", "received_at",
    "fluid_level_percent", "volume_remaining_ml", "bag_capacity_ml",
    "flow_rate_ml_per_hr", "drop_rate_per_min", "estimated_time_remaining_min",
    "battery_percent", "wifi_rssi", "status", "alert",
]


def _fetch_for_export(db: Session, device_id: str | None) -> list[Reading]:
    stmt = select(Reading).order_by(Reading.received_at.asc())
    if device_id:
        stmt = stmt.where(Reading.device_id == device_id)
    return list(db.scalars(stmt).all())


@router.get("/export.csv")
def export_csv(device_id: str | None = None, db: Session = Depends(get_db)):
    rows = _fetch_for_export(db, device_id)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(_EXPORT_COLUMNS)
    for r in rows:
        writer.writerow([getattr(r, col) for col in _EXPORT_COLUMNS])
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=iv_drip_readings.csv"},
    )


@router.get("/export.xlsx")
def export_xlsx(device_id: str | None = None, db: Session = Depends(get_db)):
    rows = _fetch_for_export(db, device_id)

    wb = Workbook()
    ws = wb.active
    ws.title = "Readings"
    ws.append(_EXPORT_COLUMNS)
    for r in rows:
        ws.append([str(getattr(r, col)) if getattr(r, col) is not None else "" for col in _EXPORT_COLUMNS])

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=iv_drip_readings.xlsx"},
    )
