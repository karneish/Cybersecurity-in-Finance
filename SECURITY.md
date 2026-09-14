# Security Policy

This project builds a cyber-risk platform, so security hardening is a first-class
concern both in the product itself and in how we accept contributions.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security defects. Report
privately instead:

- Open a **private vulnerability report** through GitHub's "Report a
  vulnerability" flow on the repository, or
- Email the maintainers (see `CODEOWNERS` / the repository README for contact).

You should receive an acknowledgement within 48 hours and a planned fix timeline
within 5 business days.

## What we consider in scope

- Default credentials or secrets that ship with the stack (see `.env.example`).
- JWT signing / refresh-token rotation weaknesses in `services/common/cybercommon`.
- Gateway bypass opportunities in `services/api-gateway`.
- WebSocket / STOMP broker issues in `services/notification-service`.
- SQL injection, XSS, or dependency abuse anywhere in the microservices.

## Hardening notes for operators

- **Change `JWT_SECRET`** before any non-local deployment.
- **Change every demo password** (`admin`/`ciso`/`analyst` / `admin123`).
- Do not expose `services/*/docs` (Swagger) or `/health` publicly in production.
- Run Postgres on a private network; containers reach it via `host.docker.internal`.
- Frontend roles are enforced client-side for UX only — every dangerous endpoint
  (e.g. `/api/risk/national/*`) is also gated server-side by role claims.