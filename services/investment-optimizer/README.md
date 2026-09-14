# investment-optimizer

Budget optimisation using Google OR-Tools — maximise risk reduction per rupee.

**Port:** 8091  
**Stack:** FastAPI + SQLAlchemy + OR-Tools

## Key features

- **Enterprise mode:** knapsack-style selection of security controls for a budget, with ROSI (Return on Security Investment)
- **National mode:** allocate budget across sectors; per-sector allocations + portfolio ROSI
- **Investment curve:** budget vs EAL reduction frontier
- **ROSI leaderboard:** ranking controls by risk reduction per rupee
- **Plan persistence:** save, list, load, delete optimiser plans

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/investment/curve` | Budget vs EAL reduction curve |
| POST | `/api/investment/optimize` | Optimise control selection for budget |
| POST | `/api/investment/national` | National budget allocation across sectors |
| POST | `/api/investment/plans` | Save a plan |
| GET | `/api/investment/plans` | List saved plans |
| GET | `/api/investment/plans/{id}` | Load a plan |
| DELETE | `/api/investment/plans/{id}` | Delete a plan |
| GET | `/api/investment/leaderboard` | ROSI ranking |
| GET | `/api/investment/summary` | Portfolio totals |

## Optimisation model

The solver maximises total EAL reduction subject to:
- Total cost ≤ budget
- Each control is selected at most once
- Control costs and risk reductions come from the live control catalogue

The result is a binary selection vector with the maximum achievable ROSI.