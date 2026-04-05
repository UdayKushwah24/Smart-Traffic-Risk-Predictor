"""Shared Pydantic field types."""

import re
from typing import Annotated

from pydantic import AfterValidator, StringConstraints

_EMAIL_PATTERN = re.compile(
    r"^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$"
)


def _validate_email(value: str) -> str:
    normalized = value.strip().lower()
    if not _EMAIL_PATTERN.fullmatch(normalized):
        raise ValueError("Invalid email address")

    local_part, domain = normalized.rsplit("@", 1)
    if len(local_part) > 64 or len(domain) > 253:
        raise ValueError("Invalid email address")

    return normalized


EmailAddress = Annotated[
    str,
    StringConstraints(min_length=3, max_length=254),
    AfterValidator(_validate_email),
]
