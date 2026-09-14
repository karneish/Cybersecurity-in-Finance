from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.stomp import broker, parse_frame

router = APIRouter()

STOMP_SUBPROTOCOLS = ("v12.stomp", "v11.stomp", "v10.stomp")


def _pick_subprotocol(requested: str) -> str | None:
    """Echo the best STOMP subprotocol the client offered, or None.

    RFC 6455 requires the server to select a subprotocol the client offered;
    otherwise a compliant client (e.g. @stomp/stompjs) fails the handshake.
    """
    for proto in STOMP_SUBPROTOCOLS:
        if proto in requested:
            return proto
    return None


async def ws_handler(websocket: WebSocket):
    requested = websocket.headers.get("sec-websocket-protocol", "")
    await websocket.accept(subprotocol=_pick_subprotocol(requested))
    broker.register(websocket)
    buffer = ""
    try:
        while True:
            raw = await websocket.receive_text()
            if raw == "\n" or raw.strip("\n") == "":
                await websocket.send_text("\n")
                continue
            buffer += raw
            while "\x00" in buffer:
                frame_raw, _, buffer = buffer.partition("\x00")
                if not frame_raw.strip():
                    continue
                frame = parse_frame(frame_raw)
                try:
                    await handle_frame(websocket, frame)
                except Exception:
                    await websocket.close(code=1011)
                    return
    except WebSocketDisconnect:
        pass
    finally:
        broker.unregister(websocket)


async def handle_frame(websocket: WebSocket, frame: dict):
    ftype = frame.get("type")
    if ftype == "connect":
        # Keep STOMP 1.2 semantics; disable server-side heartbeats.
        headers = {
            "version": "1.2",
            "heart-beat": "0,0",
            "server": "cybergate-python-stomp/1.0",
        }
        await websocket.send_text(broker._frame("CONNECTED", headers))
    elif ftype == "subscribe":
        destination = frame["headers"].get("destination", "")
        sub_id = frame["headers"].get("id", "sub-0")
        broker.add_subscription(websocket, destination, sub_id)
    elif ftype == "unsubscribe":
        broker.unregister(websocket)
    elif ftype == "send":
        destination = frame["headers"].get("destination", "")
        if destination == "/app/subscribe":
            topic = (frame.get("body") or "").strip() or "risk/updated"
            topic = topic.lstrip("/")
            await broker.broadcast(
                f"/topic/{topic}",
                {"status": "subscribed", "topic": topic},
            )
    elif ftype == "disconnect":
        await websocket.close()


@router.websocket("/ws")
async def ws_endpoint(websocket: WebSocket):
    await ws_handler(websocket)


@router.get("/ws/info")
async def ws_info():
    return {"destinations": broker.destinations(), "server": "cybergate-python-stomp"}