"""Import alias that exposes backend/app as the top-level app package."""

from pathlib import Path

__path__ = [str(Path(__file__).resolve().parent.parent / "backend" / "app")]
