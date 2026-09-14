"""Make the investment-optimizer app package and shared cybercommon importable."""

import sys
from pathlib import Path

_SERVICE_ROOT = Path(__file__).resolve().parents[1]          # services/investment-optimizer
_COMMON_ROOT = Path(__file__).resolve().parents[2] / "common"  # services/common

for root in (_SERVICE_ROOT, _COMMON_ROOT):
    if str(root) not in sys.path:
        sys.path.insert(0, str(root))