# ingestion-service

Security event ingestion, simulation, replay, and live connector management.

**Port:** 8085  
**Stack:** FastAPI + SQLAlchemy + Redis

## Key features

- **Event ingestion:** accept vulnerability, control, or asset events from external feeds
- **Batch ingestion:** up to 100 events per request
- **Simulation:** generate synthetic security events (realistic vendor payloads)
- **Replay:** re-stream historical events on a timer for live-feed testing
- **Live connectors:** 7 toggleable simulated sources (Nessus, CrowdStrike, Defender, Splunk, WAF/CDN, JSON, CSV)
- **Real-time publishing:** every ingested event is published to Redis `ingestion.events.realtime` → WebSocket → dashboard

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/ingestion/{kind}/events` | Ingest single event |
| POST | `/api/ingestion/batch` | Batch ingest |
| GET | `/api/ingestion/events` | Paginated list |
| GET | `/api/ingestion/stats` | Per-kind/vendor counts |
| POST | `/api/ingestion/simulate` | Generate synthetic events |
| POST | `/api/ingestion/replay` | Replay on timer (foreground) |
| POST | `/api/ingestion/replay/background` | Replay (background job) |
| GET | `/api/ingestion/connectors` | List 7 simulated data sources |
| POST | `/api/ingestion/connectors/{id}/toggle` | Start/stop connector |
| POST | `/api/ingestion/connectors/{id}/trigger` | Fire once now |

## Event flow

```
External feed / simulator
        ↓
  POST /api/ingestion/{kind}/events
        ↓
  Persist to public.security_events
        ↓
  Redis PUBLISH ingestion.events.realtime
        ↓
  notification-service STOMP broker
        ↓
  Browser WebSocket /topic/ingestion/event
```