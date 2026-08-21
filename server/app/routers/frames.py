from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from ..bedfeed import to_bed_payload
from ..cv.pipeline import active_processor
from ..cv.reading_builder import build_reading
from ..db import get_db
from ..models import Reading
from ..schemas import ReadingOut
from ..ws_manager import bed_manager, reading_manager
from .readings import require_auth

router = APIRouter(prefix="/api/v1/frames", tags=["frames"])


@router.post("", response_model=ReadingOut, status_code=201, dependencies=[Depends(require_auth)])
async def ingest_frame(
    device_id: str,
    file: UploadFile,
    bed_label: str | None = None,
    patient_name: str | None = None,
    fluid_label: str | None = None,
    db: Session = Depends(get_db),
):
    """The camera-frame path: an image comes in, active_processor (see
    app/cv/pipeline.py) turns it into a fill percentage, and
    build_reading() (app/cv/reading_builder.py) turns that into a full
    reading - same DB row and broadcast as the ESP32 JSON path. Test this
    manually with any image via the file-upload widget at /docs, no
    device or CV model required (MockFrameProcessor is active by
    default). See CV_INTEGRATION.md for wiring in a real model."""
    frame_bytes = await file.read()
    level_pct = active_processor.process(device_id, frame_bytes)
    reading_in = build_reading(
        db,
        device_id,
        level_pct,
        bed_label=bed_label,
        patient_name=patient_name,
        fluid_label=fluid_label,
    )

    row = Reading(**reading_in.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)

    out = ReadingOut.model_validate(row)
    await reading_manager.broadcast(out.model_dump(mode="json"))
    await bed_manager.broadcast(to_bed_payload(out))
    return out
