"""Risk dependency graph and blast-radius traversal.

The dependency graph is stored in `asset.asset_dependencies` where an edge
(asset_id=A, depends_on_id=B) means: A is a direct consumer of B. If B is
compromised, A is in B's blast radius. Traversal flows "upstream" — from the
compromised asset to everything that depends on it (directly or transitively).
"""
from collections import deque
from dataclasses import dataclass, field
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.asset import Asset, AssetDependency
from app.core.risk_calculator import RiskCalculator


@dataclass
class GraphNode:
    id: str
    name: str
    asset_type: str
    criticality: int
    environment: str
    internet_exposed: bool


@dataclass
class GraphEdge:
    source: str          # asset_id (consumer)
    target: str          # depends_on_id (dependency)
    dependency_type: str
    criticality: int


class RiskGraph:
    """Loads the asset graph and computes blast radii."""

    def __init__(self, db: Session):
        self.db = db
        self._nodes: dict[str, GraphNode] = {}
        self._upstream: dict[str, list[GraphEdge]] = {}   # compromised -> dependents
        self._downstream: dict[str, list[GraphEdge]] = {} # asset -> its dependencies
        self._loaded = False

    def load(self) -> None:
        if self._loaded:
            return

        for asset in self.db.query(Asset).all():
            node = GraphNode(
                id=str(asset.id),
                name=asset.name,
                asset_type=asset.asset_type,
                criticality=asset.criticality_score or 0,
                environment=asset.environment or "PRODUCTION",
                internet_exposed=bool(asset.internet_exposed),
            )
            self._nodes[node.id] = node
            self._upstream.setdefault(node.id, [])

        for dep in self.db.query(AssetDependency).all():
            edge = GraphEdge(
                source=str(dep.asset_id),
                target=str(dep.depends_on_id),
                dependency_type=dep.dependency_type,
                criticality=dep.criticality or 50,
            )
            self._upstream.setdefault(edge.target, []).append(edge)
            self._downstream.setdefault(edge.source, []).append(edge)

        self._loaded = True

    def get_graph(self) -> dict:
        """Full graph payload for the risk-twin visualization."""
        self.load()
        nodes = [
            {
                "id": n.id,
                "name": n.name,
                "asset_type": n.asset_type,
                "criticality": n.criticality,
                "environment": n.environment,
                "internet_exposed": n.internet_exposed,
            }
            for n in self._nodes.values()
        ]
        edges = []
        seen = set()
        for edges_for in self._upstream.values():
            for e in edges_for:
                key = (e.source, e.target)
                if key in seen:
                    continue
                seen.add(key)
                edges.append({
                    "source": e.source,
                    "target": e.target,
                    "dependency_type": e.dependency_type,
                    "criticality": e.criticality,
                })
        return {"nodes": nodes, "edges": edges}

    def get_blast_radius(self, asset_id: str) -> dict:
        """BFS blast radius from a compromised asset."""
        self.load()
        origin = self._nodes.get(asset_id)
        if origin is None:
            return {"error": f"Asset {asset_id} not found in graph"}

        calc = RiskCalculator(self.db)
        visited: dict[str, int] = {asset_id: 0}
        parents: dict[str, str | None] = {asset_id: None}
        queue = deque([asset_id])
        order = []

        while queue:
            current = queue.popleft()
            order.append(current)
            depth = visited[current]
            if depth >= 4:
                continue
            for edge in self._upstream.get(current, []):
                dependant = edge.source
                if dependant in visited:
                    continue
                visited[dependant] = depth + 1
                parents[dependant] = current
                queue.append(dependant)

        impacted_nodes = []
        total_exposed_eal = 0.0
        total_asset_value = 0.0

        for node_id, depth in visited.items():
            node = self._nodes[node_id]
            risk = calc.calculate_asset_risk(node_id)
            eal = float(risk["expected_annual_loss"]) if risk else 0.0
            total_exposed_eal += eal

            asset = self.db.query(Asset).filter(Asset.id == node_id).first()
            total_asset_value += float(asset.business_value_inr) if asset else 0.0

            impacted_nodes.append({
                "id": node_id,
                "name": node.name,
                "asset_type": node.asset_type,
                "criticality": node.criticality,
                "depth": depth,
                "hop_path": self._path_to(node_id, parents, asset_id),
                "risk_score": float(risk["risk_score"]) if risk else 0.0,
                "expected_annual_loss": eal,
            })

        impacted_nodes.sort(key=lambda x: (x["depth"], -x["expected_annual_loss"]))
        self_criticality = origin.criticality

        return {
            "origin": {
                "id": origin.id,
                "name": origin.name,
                "criticality": self_criticality,
            },
            "impacted_asset_count": len(impacted_nodes),
            "max_depth": max(visited.values()) if visited else 0,
            "direct_impact_count": sum(1 for n in impacted_nodes if n["depth"] == 1),
            "indirect_impact_count": sum(1 for n in impacted_nodes if n["depth"] > 1),
            "exposed_eal_inr": round(total_exposed_eal, 2),
            "exposed_asset_value_inr": round(total_asset_value, 2),
            "impacted_nodes": impacted_nodes,
        }

    def _path_to(self, node_id: str, parents: dict[str, str | None], origin: str) -> list[str]:
        path = []
        cur = node_id
        while cur is not None:
            path.append(cur)
            if cur == origin:
                break
            cur = parents.get(cur)
        path.reverse()
        return path