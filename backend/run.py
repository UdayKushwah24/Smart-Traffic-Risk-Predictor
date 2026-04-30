"""Convenience runner for local development."""

from app.core.config import HOST, PORT


if __name__ == "__main__":
	import uvicorn

	uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
