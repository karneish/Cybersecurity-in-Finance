# notification-service

WebSocket STOMP 1.2 broker — pushes live risk and ingestion events to browser clients.

**Port:** 8086  
**Stack:** FastAPI + native WebSocket + Redis pub/sub

## Architecture

```
Redis channels                      STOMP broker
risk.events.updated ──► RedisBridgeThread ──► /topic/risk/updated
ingestion.events.realtime ──────────────────► /topic/ingestion/event
```

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| WS | `/ws` | STOMP 1.2 broker endpoint |
| WS | `/ws/info` | Broker metadata |

## STOMP topics

| Topic | Triggered by |
|---|---|
| `/topic/risk/updated` | Every risk recalculation (drill, scenario, control change) |
| `/topic/ingestion/event` | Every new ingested security event |

## Connection protocol

The broker speaks STOMP 1.2 over plain WebSocket. Supported subprotocols:
`v12.stomp`, `v11.stomp`, `v10.stomp`. The server echoes the selected
subprotocol in the `Sec-WebSocket-Protocol` header during the WebSocket
handshake (RFC 6455 compliant).

## Redis bridge

A background thread (`RedisBridgeThread`) subscribes to the configured Redis
channels and forwards each message to the STOMP broker's topic. Channel
mapping is defined in `app/core/stomp.py` → `REDIS_TO_DEST`.

## Heartbeats

The server sends heartbeats on the STOMP session. Clients should send
`heartbeats: 0,0` to indicate they do not require server-initiated
heartbeats.