"""Rename a service's top-level `app` package to a unique name.

Only rewrites genuine module references:
    from app.        -> from <new>.
    from app         -> from <new>
    import app.      -> import <new>

Never touches `cybercommon`, and never touches the word "app" in strings,
comments or route paths such as "/api/auth".

Usage: python deploy/tools/rename_package.py <service-dir> <new-package>
"""

import re
import sys
from pathlib import Path

# Match `app` only where it is the module being imported, i.e. directly after
# `from ` / `import ` and followed by `.`, whitespace-then-symbol, or end.
PATTERNS = (
    re.compile(r"(^|\n)([ \t]*)from app(?=[.\s])"),
    re.compile(r"(^|\n)([ \t]*)import app(?=[.\s])"),
)


def rewrite(text: str, new: str) -> str:
    """Replace `from app`/`import app` with `new`, preserving indentation.

    Uses a function replacement so the leading newline and indentation captured
    by groups 1-2 are re-emitted verbatim; a plain string replacement would
    insert the literal text \1\2.
    """
    for keyword in ("from", "import"):
        pattern = re.compile(rf"(^|\n)([ \t]*){keyword} app(?=[.\s])")

        def repl(match: re.Match, _kw: str = keyword) -> str:
            return f"{match.group(1)}{match.group(2)}{_kw} {new}"

        text = pattern.sub(repl, text)
    return text


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2

    service_dir = Path(sys.argv[1]).resolve()
    new_name = sys.argv[2]
    old_pkg = service_dir / "app"
    new_pkg = service_dir / new_name

    if not old_pkg.is_dir():
        print(f"ERROR: {old_pkg} does not exist")
        return 1
    if new_pkg.exists():
        print(f"ERROR: {new_pkg} already exists")
        return 1

    # git mv keeps history; fall back to rename if the dir is untracked.
    import subprocess

    r = subprocess.run(
        ["git", "mv", str(old_pkg), str(new_pkg)],
        cwd=service_dir.parent.parent,
        capture_output=True,
        text=True,
    )
    if r.returncode != 0:
        old_pkg.rename(new_pkg)
        print("  (used pathlib rename; git mv unavailable)")
    else:
        print("  git mv ok")

    # Every .py under the service is rewritten, including the files inside the
    # package itself: app/main.py does `from app.config import settings`, which
    # is exactly the absolute reference that must become `authapp.config`.
    changed = []
    for py in sorted(service_dir.rglob("*.py")):
        original = py.read_text(encoding="utf-8")
        updated = rewrite(original, new_name)
        if updated != original:
            py.write_text(updated, encoding="utf-8", newline="\n")
            changed.append(py.relative_to(service_dir).as_posix())

    print(f"  rewrote {len(changed)} file(s) referencing `{new_name}`")
    for name in changed:
        print(f"    - {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())