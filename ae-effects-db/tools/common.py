"""Shared data helpers used by importers, validators, and index builders."""

from __future__ import annotations

import hashlib
import re
import unicodedata
from urllib.parse import urlparse


ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{2,63}$")


def canonical_url(value: str) -> str:
    return str(value or "").strip().rstrip("/").casefold()


def derive_src(src: str, url: str) -> str:
    """Derive marketplace sources from their official URL host."""
    try:
        host = (urlparse(url).netloc or "").casefold()
    except (TypeError, ValueError):
        host = ""
    if host == "booth.pm" or host.endswith(".booth.pm"):
        return "booth"
    if host == "gumroad.com" or host.endswith(".gumroad.com"):
        return "gumroad"
    return src


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", str(value or ""))
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").casefold()
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")


def make_stable_id(item: dict, source: str, used: set[str] | None = None) -> str:
    """Create a deterministic URL-safe ID; once committed it must not change."""
    used = used or set()
    source_slug = slugify(source) or "effect"
    name_slug = slugify(item.get("name", ""))
    seed = "\0".join((source, str(item.get("name", "")), canonical_url(item.get("url", ""))))
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:10]
    base = f"{source_slug}-{name_slug}" if name_slug else f"{source_slug}-{digest}"
    base = base[:64].rstrip("-")
    candidate = base
    if candidate in used or not ID_PATTERN.fullmatch(candidate):
        prefix = base[:53].rstrip("-") or source_slug[:53]
        candidate = f"{prefix}-{digest}"
    counter = 2
    while candidate in used:
        suffix = f"-{counter}"
        candidate = f"{base[:64-len(suffix)].rstrip('-')}{suffix}"
        counter += 1
    return candidate
