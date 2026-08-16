from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from ..bedfeed import to_bed_payload
from ..cv.pipeline import active_processor
from ..db import get_db
from ..models import Reading
from ..schemas import ReadingOut
from ..ws_manager import bed_manager, reading_manager
from .readings import require_auth

router = APIRouter(prefix="/api/v1/frames", tags=["frames"])


@router.post("", response_model=ReadingOut, status_code=201, dependencies=[Depends(require_auth)])
async def ingest_frame(device_id: str, file: UploadFile, db: Session = Depends(get_db)):
    """Not used yet - this is where the real camera path lands once
    CameraDataProvider (firmware side) starts uploading frames instead of
    precomputed mock readings. Currently runs MockFrameProcessor, which
    ignores the image and returns random-but-plausible numbers, purely so
    this path can be tested end-to-end ahead of the real CV pipeline."""
    frame_bytes = await file.read()
    reading_in = active_processor.process(device_id, frame_bytes)

    row = Reading(**reading_in.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)

    out = ReadingOut.model_validate(row)
    await reading_manager.broadcast(out.model_dump(mode="json"))
    await bed_manager.broadcast(to_bed_payload(out))
    return out
