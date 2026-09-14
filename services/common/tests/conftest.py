"""Make the shared cybercommon package importable for unit tests."""

import sys
from pathlib import Path

_COMMON_ROOT = Path(__file__).resolve().parents[1]

if str(_COMMON_ROOT) not in sys.path:
    sys.path.insert(0, str(_COMMON_ROOT))