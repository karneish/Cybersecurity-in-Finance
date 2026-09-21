"""WS6 OR-Tools CP-SAT knapsack selection tests (pure, DB-free)."""

from app.core.optimizer import InvestmentOptimizer, _HAS_ORTools


OPT = InvestmentOptimizer(None)


def _c(name, reduction, cost):
    return {
        "id": name,
        "name": name,
        "control_type": "TECHNICAL",
        "implementation_cost": cost,
        "annual_maintenance": 0.0,
        "eal_reduction": reduction,
    }


def test_empty_candidates_returns_empty():
    assert OPT._cp_knapsack([], 1000.0) == []


def test_no_feasible_item_returns_empty():
    candidates = [_c("a", 5.0, 20.0)]
    assert OPT._cp_knapsack(candidates, 10.0) == []


def test_budget_respected():
    candidates = [
        _c("a", 5.0, 5.0),
        _c("b", 10.0, 8.0),
        _c("c", 20.0, 40.0),
    ]
    picked = OPT._cp_knapsack(candidates, 10.0)
    assert sum(p["implementation_cost"] for p in picked) <= 10.0


def test_global_optimum_beats_density_greedy():
    # density-greedy would take A+B (9.0 reduction); optimal is B+C (12.0).
    candidates = [
        _c("a", 5.0, 5.0),
        _c("b", 4.0, 4.0),
        _c("c", 8.0, 6.0),
    ]
    picked = OPT._cp_knapsack(candidates, 10.0)
    reduction = sum(p["eal_reduction"] for p in picked)
    assert reduction >= 9.0
    if _HAS_ORTools:
        assert reduction == 12.0
        assert {p["id"] for p in picked} == {"b", "c"}


def test_whole_budget_capacity_fills_all():
    candidates = [_c("a", 2.0, 1.0), _c("b", 3.0, 1.0)]
    picked = OPT._cp_knapsack(candidates, 100.0)
    assert len(picked) == 2


def test_zeros_are_ignored():
    candidates = [_c("z1", 0.0, 5.0), _c("z2", 5.0, 0.0), _c("ok", 3.0, 3.0)]
    picked = OPT._cp_knapsack(candidates, 10.0)
    assert len(picked) == 1
    assert picked[0]["id"] == "ok"