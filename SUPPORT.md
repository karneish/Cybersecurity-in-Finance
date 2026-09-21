# Support

## Getting started

1. **Docker Compose (recommended)** — see `README.md §18`.
2. **Without Docker** — run Postgres + Redis locally, install `services/common/cybercommon`,
   then run each `services/*/app/main.py` on its port with `uvicorn`.

## Troubleshooting checklist

| Symptom | Likely cause | Fix |
|---|---|---|
| Gateway returns 502 on `/api/...` | Upstream service not ready | Check `docker compose ps`; re-run health probe after 30 s |
| WebSocket not connecting | nginx missing upgrade headers | Verify `frontend/nginx.conf` has `Upgrade` + `Connection` in `/ws/` |
| `database/migrate_and_seed.py` fails | DATABASE_URL wrong or Postgres unreachable | Check `.env` DATABASE_URL; confirm port 5432 is listening |
| Frontend shows blank page | misconfigured `VITE_WS_URL` | Leave `VITE_WS_URL` empty so it derives same-origin `ws(s)://<host>/ws`, or set it to the public `ws(s)://<host>/ws` path |
| 401 on every authenticated call | JWT_SECRET mismatch or token expired | Re-login; confirm JWT_SECRET in `.env` matches what was used at token creation |

## Logs

```bash
docker compose logs -f api-gateway     # gateway proxy decisions
docker compose logs -f risk-engine     # risk calc & WS publishing
docker compose logs -f notification-service  # STOMP broker / Redis bridge
```

## Where to ask

- **Bug reports:** GitHub Issues → Bug report template.
- **Feature requests:** GitHub Issues → Feature request template.
- **Security issues:** see `SECURITY.md` — please do not open a public issue.