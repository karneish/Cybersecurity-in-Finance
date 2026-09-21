"""Minimal STOMP-over-WebSocket server for the dashboard live feed.

Speaks the STOMP 1.2 subset used by @stomp/stompjs with a native WebSocket
broker URL (ws://<host>:8086/ws):

    CONNECT  → CONNECTED (heart-beat 0,0; the client keeps its own 10s pings)
    SUBSCRIBE→ MESSAGE   (broadcast of Redis risk / ingestion events)
    SEND     → /app/subscribe echo on /topic/{topic} (parity with the Java bridge)
    <LF>     → <LF> (heartbeat ping/pong)
"""

import asyncio
import json
import threading

from fastapi import WebSocket

from cybercommon.redis import redis_client

risk_dest = "/topic/risk/updated"
ingestion_dest = "/topic/ingestion/event"
alert_dest = "/topic/risk/alert"

REDIS_TO_DEST = {
    "risk.events.updated": risk_dest,
    "risk.events.alert": alert_dest,
    "security.events.vulnerability": ingestion_dest,
    "security.events.control": ingestion_dest,
    "security.events.asset": ingestion_dest,
    "security.events.default": ingestion_dest,
}


class STOMPBroker:
    def __init__(self) -> None:
        self._conns: dict[WebSocket, dict[str, str]] = {}
        self._lock = threading.Lock()

    def register(self, ws: WebSocket) -> None:
        with self._lock:
            self._conns.setdefault(ws, {})

    def unregister(self, ws: WebSocket) -> None:
        with self._lock:
            self._conns.pop(ws, None)

    def add_subscription(self, ws: WebSocket, destination: str, sub_id: str) -> None:
        with self._lock:
            self._conns.setdefault(ws, {})[destination] = sub_id

    @staticmethod
    def _frame(command: str, headers: dict, body: str | None = None) -> str:
        lines = [command]
        for k, v in headers.items():
            lines.append(f"{k}:{v}")
        lines.append("")
        lines.append("")
        if body:
            lines.append(body)
        return "\n".join(lines) + "\x00"

    async def broadcast(self, destination: str, payload: object) -> int:
        body = payload if isinstance(payload, str) else json.dumps(payload, default=str)
        with self._lock:
            targets = [(ws, sub_id) for ws, subs in self._conns.items() for dest, sub_id in subs.items() if dest == destination]
        sent = 0
        for ws, sub_id in targets:
            try:
                frame = self._frame("MESSAGE", {
                    "subscription": sub_id,
                    "destination": destination,
                    "content-type": "application/json",
                }, body)
                await ws.send_text(frame)
                sent += 1
            except Exception:
                self.unregister(ws)
        return sent

    def destinations(self) -> list[str]:
        with self._lock:
            dests: set[str] = set()
            for subs in self._conns.values():
                dests.update(subs.keys())
            return sorted(dests)


# ─── STOMP frame parsing ───────────────────────────────────────
def parse_frame(raw: str) -> dict:
    """Parse a STOMP frame (command + headers + body)."""
    raw = raw.rstrip("\x00")
    if raw.startswith("\n") or raw == "":
        return {"type": "heartbeat"}
    lines = raw.split("\n")
    command = lines[0].strip()
    headers: dict[str, str] = {}
    idx = 1
    while idx < len(lines) and lines[idx].strip() != "":
        line = lines[idx]
        if ":" in line:
            key, _, value = line.partition(":")
            headers[key.strip()] = value.strip()
        idx += 1
    body_lines = lines[idx + 1:] if idx < len(lines) else []
    body = "\n".join(body_lines).lstrip("\x00")
    if command == "CONNECT":
        return {"type": "connect", "headers": headers}
    if command in ("SUBSCRIBE", "UNSUBSCRIBE"):
        return {"type": command.lower(), "headers": headers}
    if command == "SEND":
        return {"type": "send", "headers": headers, "body": body}
    if command == "DISCONNECT":
        return {"type": "disconnect"}
    return {"type": "unknown", "command": command, "headers": headers}


broker = STOMPBroker()


# ─── Redis → WebSocket bridge ──────────────────────────────────
class RedisBridgeThread(threading.Thread):
    def __init__(self, broker: STOMPBroker, loop: asyncio.AbstractEventLoop):
        super().__init__(daemon=True, name="redis-ws-bridge")
        self.broker = broker
        self.loop = loop

    def run(self) -> None:
        while True:
            try:
                client = redis_client()
                pubsub = client.pubsub()
                pubsub.subscribe(*list(REDIS_TO_DEST.keys()))
                for message in pubsub.listen():
                    if message.get("type") != "message":
                        continue
                    if message["channel"] == "risk.events.updated":
                        self._evaluate_asset_alert(message["data"])
                    destination = REDIS_TO_DEST.get(message["channel"], ingestion_dest)
                    asyncio.run_coroutine_threadsafe(
                        self.broker.broadcast(destination, message["data"]), self.loop
                    )
                pubsub.close()
            except Exception:
                import time

                time.sleep(2)

    def _evaluate_asset_alert(self, raw: str) -> None:
        """Auto-evaluate threshold rules from per-asset risk-update messages."""
        try:
            payload = json.loads(raw)
        except (ValueError, TypeError):
            return
        metrics = {
            "risk_score": payload.get("currentRisk"),
            "total_eal": payload.get("currentEAL"),
            "asset_id": payload.get("assetId"),
        }
        metrics = {k: v for k, v in metrics.items() if isinstance(v, (int, float))}
        if not metrics:
            return
        try:
            from cybercommon.database import SessionLocal

            with SessionLocal() as db:
                from app.core.alerts import evaluate_rules

                evaluate_rules(db, metrics)
        except Exception:
            import logging

            logging.getLogger("notification-service.bridge").exception(
                "Failed to auto-evaluate risk alert"
            )


def start_bridge(loop: asyncio.AbstractEventLoop) -> RedisBridgeThread:
    thread = RedisBridgeThread(broker, loop)
    thread.start()
    return thread