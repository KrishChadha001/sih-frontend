from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..ws_manager import bed_manager, reading_manager

router = APIRouter()


@router.websocket("/ws/readings")
async def readings_feed(ws: WebSocket):
    """Full IVDripReading shape, for our own tooling/future consumers.
    Dashboard clients connect here and receive each new reading as JSON
    the moment POST /api/v1/readings ingests it - no polling needed."""
    await reading_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()  # client doesn't send anything; just keeps the socket open
    except WebSocketDisconnect:
        reading_manager.disconnect(ws)


@router.websocket("/ws/bedfeed")
async def bed_feed(ws: WebSocket):
    """What frontend/src/lib/fluidwatch.ts's dashboard actually connects
    to (see ward_settings.ws_url / DEFAULT_WS_URL) - same event, reshaped
    into the {id, bed, patient, fluid, flow, level, status} the dashboard's
    bed cards expect. See bedfeed.py for the translation."""
    await bed_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        bed_manager.disconnect(ws)
