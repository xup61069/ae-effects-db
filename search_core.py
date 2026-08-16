"""Shared search semantics for the CLI, generated indexes, and parity tests."""

from __future__ import annotations

import collections
import json
import os
import re
import unicodedata
from typing import Iterable


ROOT = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(ROOT, "curation", "search.json")
JA_CONFIG_PATH = os.path.join(ROOT, "curation", "search-aliases.ja.json")


def load_search_config() -> dict:
    with open(CONFIG_PATH, encoding="utf-8") as handle:
        config = json.load(handle)
    try:
        with open(JA_CONFIG_PATH, encoding="utf-8") as handle:
            japanese = json.load(handle).get("aliases", {})
    except (FileNotFoundError, json.JSONDecodeError):
        japanese = {}
    aliases = {key: tuple(values) for key, values in config.get("aliases", {}).items()}
    aliases.update({key: tuple(values) for key, values in japanese.items()})
    return {
        "aliases": aliases,
        "translation": str.maketrans(config.get("simplified_to_traditional", {})),
    }


SEARCH_CONFIG = load_search_config()
ALIASES = SEARCH_CONFIG["aliases"]
SIMPLIFIED_TO_TRADITIONAL = SEARCH_CONFIG["translation"]


def normalize_text(value: object) -> str:
    text = unicodedata.normalize("NFKC", str(value or ""))
    return " ".join(text.translate(SIMPLIFIED_TO_TRADITIONAL).casefold().split())


def parse_terms(raw: str) -> list[str]:
    values = [a or b or c for a, b, c in re.findall(r'"([^"]+)"|\'([^\']+)\'|(\S+)', raw)]
    return list(dict.fromkeys(term for value in values if (term := normalize_text(value))))


def term_groups(terms: Iterable[str]) -> list[set[str]]:
    groups: list[set[str]] = []
    for raw in terms:
        term = normalize_text(raw)
        if not term:
            continue
        values = {term}
        values.update(normalize_text(alias) for alias in ALIASES.get(term, ()))
        groups.append({value for value in values if value})
    return groups


def local_field(row: dict, field: str, lang: str = "zh") -> str:
    return str(row.get(f"{field}_{lang}") or row.get(field) or "")


def haystack(row: dict, lang: str = "zh") -> str:
    parts = [
        row.get("name", ""), row.get("kind", ""), row.get("cat", ""),
        local_field(row, "desc", lang), local_field(row, "look", lang),
        row.get("suite", ""), row.get("vendor", ""), " ".join(row.get("tags", [])),
        " ".join(row.get("stack", [])),
    ]
    variants = row.get("variants")
    if isinstance(variants, dict):
        parts.extend((" ".join(variants), " ".join(map(str, variants.values()))))
    return normalize_text(" ".join(map(str, parts)))


def match_details(row: dict, terms: Iterable[str], lang: str = "zh") -> tuple[int, list[str]]:
    name = normalize_text(row.get("name", ""))
    tags = [normalize_text(value) for value in row.get("tags", [])]
    variants = normalize_text(" ".join((row.get("variants") or {}).keys()))
    description = normalize_text(f"{local_field(row, 'desc', lang)} {local_field(row, 'look', lang)}")
    text = haystack(row, lang)
    score = 0
    reasons: list[str] = []
    for original, group in zip((normalize_text(term) for term in terms), term_groups(terms)):
        best = (0, "")
        for term in group:
            alias = term != original
            candidates = [
                (50 if name == term else 32 if name.startswith(term) else 20 if term in name else 0, "name"),
                (14 if term in tags else 10 if any(term in tag for tag in tags) else 0, "tag"),
                (10 if term in variants else 0, "variant"),
                (4 if term in description else 0, "description"),
                (1 if term in text else 0, "text"),
            ]
            value, field = max(candidates)
            if alias and value:
                field = f"alias:{original}->{term}:{field}"
            if value > best[0]:
                best = (value, field)
        score += best[0]
        if best[1]:
            reasons.append(best[1])
    phrase = " ".join(normalize_text(term) for term in terms if normalize_text(term))
    if phrase:
        if name == phrase:
            score += 80
            reasons.append("exact-name")
        elif name.startswith(phrase):
            score += 35
            reasons.append("name-prefix")
        elif phrase in name:
            score += 20
            reasons.append("name-phrase")
    return score, list(dict.fromkeys(reasons))


def score(row: dict, terms: Iterable[str], lang: str = "zh") -> int:
    return match_details(row, terms, lang)[0]


def ranked(rows: Iterable[dict], terms: Iterable[str], require_all: bool = True, lang: str = "zh"):
    terms = list(terms)
    groups = term_groups(terms)
    found = []
    for row in rows:
        text = haystack(row, lang)
        matches = [any(term in text for term in group) for group in groups]
        if require_all and not all(matches):
            continue
        value, reasons = match_details(row, terms, lang)
        if value > 0:
            found.append((value, row, reasons))
    return sorted(found, key=lambda item: (-item[0], item[1].get("name", "").casefold(), item[1].get("id", "")))


def _cjk_char(char: str) -> bool:
    return "一" <= char <= "鿿" or "㐀" <= char <= "䶿"


def is_cjk(value: str) -> bool:
    return any(_cjk_char(char) for char in value)


def segment(terms: Iterable[str]) -> list[str]:
    output: list[str] = []
    for term in terms:
        if len(term) >= 3 and is_cjk(term):
            for index in range(len(term) - 1):
                part = term[index:index + 2]
                if all(_cjk_char(char) for char in part) and part not in output:
                    output.append(part)
    return output


def damerau_levenshtein(a: str, b: str) -> int:
    matrix = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for index in range(len(a) + 1):
        matrix[index][0] = index
    for index in range(len(b) + 1):
        matrix[0][index] = index
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            matrix[i][j] = min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost)
            if i > 1 and j > 1 and a[i - 1] == b[j - 2] and a[i - 2] == b[j - 1]:
                matrix[i][j] = min(matrix[i][j], matrix[i - 2][j - 2] + 1)
    return matrix[-1][-1]


def split_words(value: str):
    current: list[str] = []
    for char in value:
        if char.isalnum() or _cjk_char(char):
            current.append(char)
        elif current:
            yield "".join(current)
            current = []
    if current:
        yield "".join(current)


def vocabulary(rows: Iterable[dict]) -> collections.Counter:
    words: collections.Counter = collections.Counter()
    for row in rows:
        for index, value in enumerate([row.get("name", ""), *row.get("tags", [])]):
            weight = 5 if index == 0 else 1
            words.update({word: weight for word in split_words(normalize_text(value)) if len(word) >= 3})
    return words


def correction_suggestions(rows: Iterable[dict], term: str, limit_results: int = 3) -> list[str]:
    normalized = normalize_text(term)
    if len(normalized) < 4 or is_cjk(normalized):
        return []
    words = vocabulary(rows)
    if normalized in words:
        return []
    limit = 2 if len(normalized) >= 7 else 1
    candidates = []
    for word, frequency in words.items():
        if abs(len(word) - len(normalized)) > limit:
            continue
        distance = damerau_levenshtein(normalized, word)
        if distance <= limit:
            candidates.append((distance, abs(len(word) - len(normalized)), -frequency, word))
    candidates.sort()
    if not candidates:
        return []
    best_key = candidates[0][:2]
    return [item[3] for item in candidates if item[:2] == best_key][:limit_results]


def correct_terms(rows: Iterable[dict], terms: Iterable[str]) -> list[str]:
    rows = list(rows)
    corrected: list[str] = []
    changed = False
    for raw in terms:
        term = normalize_text(raw)
        suggestions = correction_suggestions(rows, term)
        if not suggestions:
            corrected.append(term)
            continue
        best = suggestions[0]
        # Only auto-correct when the best candidate is structurally clearer than
        # the runner-up; ambiguous candidates remain user-visible suggestions.
        if len(suggestions) > 1:
            best_key = (damerau_levenshtein(term, best), abs(len(best) - len(term)))
            next_key = (damerau_levenshtein(term, suggestions[1]), abs(len(suggestions[1]) - len(term)))
            if best_key == next_key:
                corrected.append(term)
                continue
        corrected.append(best)
        changed = changed or best != term
    return corrected if changed else []
