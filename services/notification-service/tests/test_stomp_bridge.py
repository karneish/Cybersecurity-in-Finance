"""STOMP-over-WS bridge logic tests (pure: no Redis / DB required)."""

import asyncio

from app.core.stomp import (
    REDIS_TO_DEST,
    STOMPBroker,
    RedisBridgeThread,
    alert_dest,
    ingestion_dest,
    parse_frame,
    risk_dest,
)


class _FakeWS:
    async def send_text(self, frame: str) -> None:
        self.sent = frame


def _await(coro):
    loop = asyncio.new_event_loop()
    try:
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def test_redis_channels_map_to_frontend_destinations():
    assert REDIS_TO_DEST["risk.events.updated"] == risk_dest
    assert REDIS_TO_DEST["risk.events.alert"] == alert_dest
    assert REDIS_TO_DEST["security.events.vulnerability"] == ingestion_dest
    assert REDIS_TO_DEST["security.events.control"] == ingestion_dest
    assert REDIS_TO_DEST["security.events.asset"] == ingestion_dest


def test_parse_connect_frame():
    frame = "CONNECT\naccept-version:1.2\nhost:localhost\n\n\x00"
    parsed = parse_frame(frame)
    assert parsed["type"] == "connect"
    assert parsed["headers"]["accept-version"] == "1.2"


def test_parse_subscribe_and_send():
    sub = "SUBSCRIBE\nid:sub-0\ndestination:/topic/risk/alert\n\n\x00"
    assert parse_frame(sub)["type"] == "subscribe"
    send = "SEND\ndestination:/app/subscribe\n\nhello\x00"
    parsed = parse_frame(send)
    assert parsed["type"] == "send"
    assert parsed["body"] == "hello"


def test_parse_heartbeat_and_empty():
    assert parse_frame("\n")["type"] == "heartbeat"
    assert parse_frame("")["type"] == "heartbeat"


def test_broadcast_sends_stomp_message_frame_to_subscribers():
    ws = _FakeWS()
    broker = STOMPBroker()
    broker.register(ws)
    broker.add_subscription(ws, alert_dest, "sub-1")

    count = _await(broker.broadcast(alert_dest, {"assetId": "a-1", "currentRisk": 92}))

    assert count == 1
    frame = ws.sent
    assert frame.startswith("MESSAGE\n")
    assert "destination:/topic/risk/alert" in frame
    assert "currentRisk" in frame
    assert frame.endswith("\x00")


def test_broadcast_skips_connections_on_other_topics():
    ws = _FakeWS()
    broker = STOMPBroker()
    broker.register(ws)
    broker.add_subscription(ws, risk_dest, "sub-1")

    count = _await(broker.broadcast(alert_dest, {"x": 1}))

    assert count == 0


def test_alert_auto_eval_ignores_invalid_or_non_numeric_payload():
    bridge = RedisBridgeThread(None, None)
    assert bridge._evaluate_asset_alert("not-json") is None
    assert bridge._evaluate_asset_alert('{"assetId":"a-1","message":"hi"}') is None