import json
import os
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Keep routine startup and evaluation logs readable without changing model behavior.
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TRANSFORMERS_NO_ADVISORY_WARNINGS", "1")

from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


BASE_DIR = Path(__file__).parent
DATASET_PATH = BASE_DIR / "rentifypro_chatbot_dataset_v6.json"
CONFIG_PATH = BASE_DIR / "chatbot_config.json"
DATASET_SCHEMA_VERSION = "v6_intent_multilingual_conversational"


def load_config(path: Path) -> Dict[str, Any]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict) or raw.get("schema_version") != "v1":
        raise RuntimeError(f"Invalid chatbot configuration: {path}")
    return raw


CONFIG = load_config(CONFIG_PATH)
MODEL_NAME = os.getenv("CHATBOT_MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2")
CONFIDENCE_THRESHOLD = float(
    os.getenv("CHATBOT_CONFIDENCE_THRESHOLD", CONFIG["confidence_threshold"])
)
HIGH_CONFIDENCE_THRESHOLD = float(
    os.getenv("CHATBOT_HIGH_CONFIDENCE_THRESHOLD", CONFIG["high_confidence_threshold"])
)
CLARIFICATION_MARGIN = float(
    os.getenv("CHATBOT_CLARIFICATION_MARGIN", CONFIG["clarification_margin"])
)
HARD_NEGATIVE_FLOOR = float(CONFIG["hard_negative_floor"])
HARD_NEGATIVE_PENALTY = float(CONFIG["hard_negative_penalty"])
MAX_MESSAGE_LENGTH = int(CONFIG["max_message_length"])
MAX_ALTERNATIVES = int(CONFIG["max_alternatives"])
TOP_PREDICTIONS = int(CONFIG["top_predictions"])
UNIQUE_TYPO_MIN_LENGTH = int(CONFIG.get("unique_typo_min_length", 4))
if UNIQUE_TYPO_MIN_LENGTH < 4:
    raise RuntimeError("chatbot_config.json unique_typo_min_length must be at least 4")
CONFIGURED_VEHICLE_BRANDS = CONFIG.get("vehicle_brands")
if not isinstance(CONFIGURED_VEHICLE_BRANDS, list) or not CONFIGURED_VEHICLE_BRANDS:
    raise RuntimeError("chatbot_config.json must define a non-empty vehicle_brands array")

SUPPORTED_STYLES = {"en", "fil", "taglish"}
REQUESTED_LANGUAGE_TO_STYLE = {
    "english": "en",
    "filipino": "fil",
    "taglish": "taglish",
    "en": "en",
    "fil": "fil",
    "tag": "taglish",
}
CONVERSATIONAL_INTENTS = {
    "chat_greeting",
    "chat_wellbeing",
    "chat_identity",
    "chat_language_support",
    "chat_gratitude",
    "chat_acknowledgement",
    "chat_goodbye",
    "chat_casual_conversation",
    "help_request",
    "unclear_message",
    "nonsense_message",
}
BRAND_CONTEXT_POLICY_INTENTS = {
    "insurance_included",
    "security_deposit",
    "full_tank_return",
    "driver_option",
}

APOSTROPHE_TRANSLATION = str.maketrans({
    "\u2018": "'",
    "\u2019": "'",
    "\u02bc": "'",
    "\u201c": '"',
    "\u201d": '"',
    "\u2010": "-",
    "\u2011": "-",
    "\u2012": "-",
    "\u2013": "-",
    "\u2014": "-",
    "\u2212": "-",
    "\u00a0": " ",
})
TOKEN_PATTERN = re.compile(r"[^\W_]+(?:'[^\W_]+)?|\d+(?:\.\d+)?%?", re.UNICODE)
RATE_QUERY_PATTERN = re.compile(
    r"\b(?:how much|price|pricing|rate|cost|magkano|presyo)\b",
    re.IGNORECASE,
)
MODEL_BOUNDARY_TOKENS = {
    "a", "an", "ang", "available", "ba", "bang", "bukas", "car", "cars",
    "for", "from", "in", "is", "lang", "may", "na", "ng", "ngayon", "now",
    "mayroon", "meron", "please", "po", "price", "rate", "rent", "rental", "sana", "show", "today",
    "tomorrow", "vehicle", "vehicles", "with", "available", "automatic", "manual",
}

FILIPINO_TOKENS = {
    "ako", "ang", "ano", "anong", "at", "ba", "bakit", "balanse", "bayad",
    "dapat", "di", "gamit", "hindi", "ilang", "kailangan", "kaso", "kotse",
    "kaya", "kung", "late", "mag", "magbayad", "magbook", "magkano", "magrenta", "magsalita",
    "kumusta", "lang", "magsoli", "makapagbook", "may", "mayroon", "meron", "mga", "mo", "muna",
    "na", "ng", "ngayon", "paano", "pano", "para", "pasahero", "po", "puwedeng", "pwede",
    "renta", "rentahan", "sabay", "salamat", "sana", "sasakyan", "sige", "sobra", "tulong",
    "wala", "yung", "kasya",
}
ENGLISH_TOKENS = {
    "account", "available", "balance", "book", "booking", "can", "cancel",
    "car", "cash", "day", "deposit", "do", "driver", "extend", "fee", "gcash",
    "automatic", "book", "date", "dates", "fuel", "help", "how", "insurance",
    "late", "level", "methods", "pax", "payment", "pending", "price", "rate", "rent",
    "rental", "requirements", "return", "same", "status", "vehicle", "what", "when",
    "where", "which", "why",
}

GENERIC_CLARIFICATIONS = {
    "en": "I want to make sure I answer correctly. Could you add a little more detail to your question?",
    "fil": "Gusto kong masigurong tama ang sagot ko. Maaari mo bang dagdagan ng kaunting detalye ang tanong?",
    "taglish": "Gusto kong masigurong tama ang sagot ko. Could you add a little more detail?",
}


class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "auto"
    # Retained for backward compatibility. Live recommendations are fulfilled
    # by the Node backend after this service selects the intent.
    vehicles: Optional[List[Dict[str, Any]]] = None


def clean_text(value: Any) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).translate(APOSTROPHE_TRANSLATION)
    text = re.sub(r"\s+", " ", text, flags=re.UNICODE).strip()
    return text[:MAX_MESSAGE_LENGTH]


def normalize_for_match(value: Any) -> str:
    text = clean_text(value).lower().replace("\u20b1", " php ")
    text = re.sub(r"([!?.,])\1+", r"\1", text)
    text = re.sub(r"[^\w\s%#'\-]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text, flags=re.UNICODE).strip()


def tokenize(value: str) -> List[str]:
    return [token.lower() for token in TOKEN_PATTERN.findall(value or "")]


def build_informal_text_normalizations(value: Any) -> List[Tuple[str, str]]:
    if not isinstance(value, dict) or not value:
        raise RuntimeError("chatbot_config.json must define informal_text_normalizations")
    rules: List[Tuple[str, str]] = []
    seen: Set[str] = set()
    for raw_source, raw_target in value.items():
        source = normalize_for_match(raw_source)
        target = normalize_for_match(raw_target)
        if not source or not target or source == target or source in seen:
            raise RuntimeError("chatbot_config.json contains an invalid informal text normalization")
        seen.add(source)
        rules.append((source, target))
    return sorted(rules, key=lambda item: (-len(item[0].split()), -len(item[0]), item[0]))


INFORMAL_TEXT_NORMALIZATIONS = build_informal_text_normalizations(
    CONFIG.get("informal_text_normalizations")
)


def normalize_informal_text(value: Any) -> str:
    normalized = normalize_for_match(value)
    for source, target in INFORMAL_TEXT_NORMALIZATIONS:
        normalized = re.sub(
            rf"(?<!\w){re.escape(source)}(?!\w)",
            target,
            normalized,
            flags=re.UNICODE,
        )
    return re.sub(r"\s+", " ", normalized, flags=re.UNICODE).strip()


def build_vehicle_brand_lookup(values: List[Any]) -> Dict[str, str]:
    lookup: Dict[str, str] = {}
    for value in values:
        canonical = clean_text(value)
        normalized = normalize_for_match(canonical)
        if not canonical or not normalized or normalized in lookup:
            raise RuntimeError("chatbot_config.json contains an invalid or duplicate vehicle brand")
        lookup[normalized] = canonical
    return lookup


VEHICLE_BRAND_BY_NORMALIZED = build_vehicle_brand_lookup(CONFIGURED_VEHICLE_BRANDS)


def find_brand_token_span(message: str) -> Tuple[Optional[str], int, int, List[str]]:
    original_tokens = TOKEN_PATTERN.findall(clean_text(message))
    normalized_tokens = [normalize_for_match(token) for token in original_tokens]
    for normalized_brand, canonical_brand in sorted(
        VEHICLE_BRAND_BY_NORMALIZED.items(), key=lambda item: len(item[0]), reverse=True
    ):
        brand_tokens = normalized_brand.split()
        width = len(brand_tokens)
        for index in range(0, len(normalized_tokens) - width + 1):
            if normalized_tokens[index:index + width] == brand_tokens:
                return canonical_brand, index, index + width, original_tokens
    return None, -1, -1, original_tokens


def canonicalize_model_token(token: str) -> str:
    if token.islower() or token.isupper():
        return token[:1].upper() + token[1:].lower()
    return token


def extract_vehicle_entities(message: str) -> Dict[str, Optional[str]]:
    brand, _, brand_end, original_tokens = find_brand_token_span(message)
    if not brand:
        return {"brand": None, "model": None}

    model_tokens: List[str] = []
    for token in original_tokens[brand_end:]:
        normalized = normalize_for_match(token)
        if not normalized or normalized in MODEL_BOUNDARY_TOKENS:
            break
        model_tokens.append(canonicalize_model_token(token))
        if len(model_tokens) >= 4:
            break
    return {
        "brand": brand,
        "model": " ".join(model_tokens) or None,
    }


def one_edit_apart(left: str, right: str) -> bool:
    if left == right or abs(len(left) - len(right)) > 1:
        return False
    if len(left) > len(right):
        left, right = right, left
    if len(left) == len(right):
        mismatches = [index for index, (a, b) in enumerate(zip(left, right)) if a != b]
        if len(mismatches) == 1:
            return True
        return bool(
            len(mismatches) == 2
            and mismatches[1] == mismatches[0] + 1
            and left[mismatches[0]] == right[mismatches[1]]
            and left[mismatches[1]] == right[mismatches[0]]
        )
    index_left = 0
    index_right = 0
    edits = 0
    while index_left < len(left) and index_right < len(right):
        if left[index_left] == right[index_right]:
            index_left += 1
            index_right += 1
            continue
        edits += 1
        index_right += 1
        if edits > 1:
            return False
    return True


def build_unique_typo_vocabulary(items: List[Dict[str, Any]]) -> Set[str]:
    vocabulary = {
        token
        for token in FILIPINO_TOKENS.union(ENGLISH_TOKENS)
        if len(token) >= UNIQUE_TYPO_MIN_LENGTH and token.isalpha()
    }
    for item in items:
        for example in item["examples"]:
            for token in tokenize(normalize_for_match(example)):
                if len(token) >= UNIQUE_TYPO_MIN_LENGTH and token.isalpha():
                    vocabulary.add(token)
    for brand in VEHICLE_BRAND_BY_NORMALIZED:
        vocabulary.update(
            token
            for token in brand.split()
            if len(token) >= UNIQUE_TYPO_MIN_LENGTH and token.isalpha()
        )
    return vocabulary


def normalize_unique_known_typos(normalized_text: str) -> str:
    corrected_tokens: List[str] = []
    brand_tokens = set(VEHICLE_BRAND_BY_NORMALIZED)
    for token in normalized_text.split():
        if (
            len(token) < UNIQUE_TYPO_MIN_LENGTH
            or not token.isalpha()
            or token in UNIQUE_TYPO_VOCABULARY
            or any(one_edit_apart(token, brand) for brand in brand_tokens)
        ):
            corrected_tokens.append(token)
            continue
        matches = {
            candidate
            for candidate in UNIQUE_TYPO_VOCABULARY
            if candidate[0] == token[0]
            and abs(len(candidate) - len(token)) <= 1
            and one_edit_apart(token, candidate)
        }
        corrected_tokens.append(next(iter(matches)) if len(matches) == 1 else token)
    return " ".join(corrected_tokens)


def find_safe_brand_typo(message: str) -> Optional[str]:
    normalized = normalize_for_match(message)
    tokens = normalized.split()
    if not tokens:
        return None
    has_brand_context = len(tokens) == 1 or bool(
        {"brand", "car", "cars", "vehicle", "vehicles", "hanap", "gusto", "have"}.intersection(tokens)
    )
    if not has_brand_context:
        return None
    suggestions = {
        canonical
        for token in tokens
        if len(token) >= 5
        for candidate, canonical in VEHICLE_BRAND_BY_NORMALIZED.items()
        if len(candidate) >= 5 and one_edit_apart(token, candidate)
    }
    return next(iter(suggestions)) if len(suggestions) == 1 else None


def brand_typo_reply(brand: str, style: str) -> str:
    if style == "fil":
        return f"Ang ibig mo bang sabihin ay {brand}? Kung oo, hahanapin ko ang kasalukuyang RentifyPro listings."
    if style == "taglish":
        return f"Did you mean {brand}? If yes, hahanapin ko ang current RentifyPro listings."
    return f"Did you mean {brand}? If so, I can search the current RentifyPro listings."


def dedupe_keep_order(values: Any) -> List[str]:
    source = values if isinstance(values, list) else []
    seen: Set[str] = set()
    result: List[str] = []
    for value in source:
        text = clean_text(value)
        key = normalize_for_match(text)
        if not text or not key or key in seen:
            continue
        seen.add(key)
        result.append(text)
    return result


def normalize_responses(value: Any) -> Dict[str, List[str]]:
    responses = value if isinstance(value, dict) else {}
    return {
        "en": dedupe_keep_order(responses.get("en")),
        "fil": dedupe_keep_order(responses.get("fil")),
        "taglish": dedupe_keep_order(responses.get("taglish")),
    }


def normalize_clarification(value: Any) -> Dict[str, str]:
    clarification = value if isinstance(value, dict) else {}
    return {
        style: clean_text(clarification.get(style, ""))
        for style in SUPPORTED_STYLES
    }


def parse_dataset_item(item: Dict[str, Any], index: int) -> Dict[str, Any]:
    intent_id = clean_text(item.get("id"))
    examples = dedupe_keep_order(item.get("examples"))
    aliases = dedupe_keep_order(item.get("aliases"))
    hard_negatives = dedupe_keep_order(item.get("hard_negatives"))
    responses = normalize_responses(item.get("responses"))
    if not intent_id or not examples or any(not responses[style] for style in SUPPORTED_STYLES):
        raise RuntimeError(f"Invalid v6 chatbot intent at index {index}: {DATASET_PATH}")

    return {
        **item,
        "id": intent_id,
        "description": clean_text(item.get("description")),
        "aliases": aliases,
        "examples": examples,
        "hard_negatives": hard_negatives,
        "clarification": normalize_clarification(item.get("clarification")),
        "requires_live_data": bool(item.get("requires_live_data", False)),
        "live_source": clean_text(item.get("live_source")),
        "policy_source": clean_text(item.get("policy_source")),
        "reviewed_at": clean_text(item.get("reviewed_at")),
        "priority": int(item.get("priority", 0) or 0),
        "fallback_only": bool(item.get("fallback_only", False)),
        "responses": responses,
    }


def load_dataset(path: Path) -> List[Dict[str, Any]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict) or raw.get("schema_version") != DATASET_SCHEMA_VERSION:
        raise RuntimeError(f"Chatbot dataset must use schema {DATASET_SCHEMA_VERSION}: {path}")

    intents: List[Dict[str, Any]] = []
    intent_ids: Set[str] = set()
    example_owners: Dict[str, str] = {}
    for index, item in enumerate(raw.get("items", [])):
        parsed = parse_dataset_item(item, index)
        intent_id = parsed["id"]
        if intent_id in intent_ids:
            raise RuntimeError(f"Duplicate v6 chatbot intent id '{intent_id}': {path}")
        intent_ids.add(intent_id)

        for example in parsed["examples"]:
            normalized = normalize_for_match(example)
            owner = example_owners.get(normalized)
            if owner and owner != intent_id:
                raise RuntimeError(
                    f"Duplicate normalized example '{example}' in '{owner}' and '{intent_id}'"
                )
            example_owners[normalized] = intent_id
        intents.append(parsed)

    if not intents:
        raise RuntimeError(f"No valid intents loaded from dataset: {path}")
    return intents


def detect_style(text: str) -> str:
    normalized = normalize_for_match(text)
    tokens = tokenize(normalized)
    fil_hits = [token for token in tokens if token in FILIPINO_TOKENS]
    en_hits = [token for token in tokens if token in ENGLISH_TOKENS]
    if fil_hits and en_hits:
        return "taglish"
    if fil_hits:
        return "fil"
    return "en"


def resolve_style(requested_language: Optional[str], text: str) -> str:
    requested = normalize_for_match(requested_language or "")
    if requested and requested != "auto":
        mapped = REQUESTED_LANGUAGE_TO_STYLE.get(requested)
        if mapped in SUPPORTED_STYLES:
            return mapped
    return detect_style(text)


def build_indexes(intent_items: List[Dict[str, Any]]) -> Tuple[
    List[Dict[str, str]], Any, List[Dict[str, str]], Any, Dict[str, Set[str]], Dict[str, Set[str]]
]:
    positive_rows: List[Dict[str, str]] = []
    negative_rows: List[Dict[str, str]] = []
    exact_examples: Dict[str, Set[str]] = defaultdict(set)
    exact_aliases: Dict[str, Set[str]] = defaultdict(set)

    for item in intent_items:
        intent_id = item["id"]
        for example in item["examples"]:
            normalized = normalize_for_match(example)
            exact_examples[normalized].add(intent_id)
            if not item["fallback_only"]:
                positive_rows.append({"intent": intent_id, "text": example, "source": "example"})
        for alias in item["aliases"]:
            normalized = normalize_for_match(alias)
            exact_aliases[normalized].add(intent_id)
            if not item["fallback_only"]:
                positive_rows.append({"intent": intent_id, "text": alias, "source": "alias"})
        for hard_negative in item["hard_negatives"]:
            negative_rows.append({"intent": intent_id, "text": hard_negative, "source": "hard_negative"})

    if not positive_rows:
        raise RuntimeError("Intent example index is empty.")

    positive_embeddings = embedder.encode(
        [row["text"] for row in positive_rows], normalize_embeddings=True
    )
    negative_embeddings = (
        embedder.encode([row["text"] for row in negative_rows], normalize_embeddings=True)
        if negative_rows
        else None
    )
    return (
        positive_rows,
        positive_embeddings,
        negative_rows,
        negative_embeddings,
        exact_examples,
        exact_aliases,
    )


def phrase_in_query(alias: str, query: str) -> bool:
    if not alias or not query:
        return False
    return f" {alias} " in f" {query} "


def find_controlled_alias_matches(normalized_query: str) -> List[Dict[str, Any]]:
    matches: Dict[str, Dict[str, Any]] = {}
    for item in intent_items:
        for alias in item["aliases"]:
            normalized_alias = normalize_for_match(alias)
            if not phrase_in_query(normalized_alias, normalized_query):
                continue
            candidate = {
                "intent": item["id"],
                "alias": alias,
                "priority": item["priority"],
                "specificity": len(tokenize(normalized_alias)) * 100 + len(normalized_alias),
            }
            current = matches.get(item["id"])
            if current is None or (candidate["priority"], candidate["specificity"]) > (
                current["priority"], current["specificity"]
            ):
                matches[item["id"]] = candidate
    return sorted(
        matches.values(),
        key=lambda candidate: (candidate["priority"], candidate["specificity"], candidate["intent"]),
        reverse=True,
    )


def retrieve_intents(query: str, top_k: int = TOP_PREDICTIONS) -> List[Dict[str, Any]]:
    user_embedding = embedder.encode([query], normalize_embeddings=True)
    positive_similarities = cosine_similarity(user_embedding, POSITIVE_EMBEDDINGS)[0]
    best_by_intent: Dict[str, Dict[str, Any]] = {}
    for row, raw_score in zip(POSITIVE_ROWS, positive_similarities):
        score = float(raw_score)
        current = best_by_intent.get(row["intent"])
        if current is None or score > current["raw_score"]:
            best_by_intent[row["intent"]] = {
                "intent": row["intent"],
                "raw_score": score,
                "score": score,
                "matched_source": row["source"],
            }

    if NEGATIVE_EMBEDDINGS is not None:
        negative_similarities = cosine_similarity(user_embedding, NEGATIVE_EMBEDDINGS)[0]
        best_negative_by_intent: Dict[str, float] = {}
        for row, negative_score in zip(NEGATIVE_ROWS, negative_similarities):
            value = float(negative_score)
            best_negative_by_intent[row["intent"]] = max(
                best_negative_by_intent.get(row["intent"], -1.0), value
            )
        for intent_id, candidate in best_by_intent.items():
            negative_score = best_negative_by_intent.get(intent_id, -1.0)
            penalty = max(0.0, negative_score - HARD_NEGATIVE_FLOOR) * HARD_NEGATIVE_PENALTY
            candidate["hard_negative_score"] = negative_score
            candidate["score"] = candidate["raw_score"] - penalty

    alias_matches = find_controlled_alias_matches(normalize_for_match(query))
    if alias_matches:
        top_priority = alias_matches[0]["priority"]
        for index, alias_match in enumerate(alias_matches):
            candidate = best_by_intent.get(alias_match["intent"])
            if candidate is None:
                candidate = {
                    "intent": alias_match["intent"],
                    "raw_score": 0.0,
                    "score": 0.0,
                    "matched_source": "controlled_alias",
                }
                best_by_intent[alias_match["intent"]] = candidate
            priority_gap = top_priority - alias_match["priority"]
            alias_score = 0.94 if index == 0 else max(0.60, 0.90 - priority_gap * 0.01 - index * 0.03)
            if alias_score > candidate["score"]:
                candidate["score"] = alias_score
                candidate["matched_source"] = "controlled_alias"
                candidate["matched_alias"] = alias_match["alias"]

    ranked = sorted(
        best_by_intent.values(),
        key=lambda item: (item["score"], INTENTS_BY_ID[item["intent"]]["priority"], item["intent"]),
        reverse=True,
    )
    for candidate in ranked:
        candidate["score"] = max(0.0, min(1.0, float(candidate["score"])))
    return ranked[: max(1, top_k)]


def exact_candidates(normalized_query: str) -> Tuple[List[str], str]:
    examples = sorted(EXACT_EXAMPLES.get(normalized_query, set()))
    if examples:
        return examples, "exact_example"
    aliases = sorted(EXACT_ALIASES.get(normalized_query, set()))
    if aliases:
        return aliases, "exact_alias"
    return [], ""


def rank_exact_candidates(intent_ids: List[str]) -> List[Dict[str, Any]]:
    ordered = sorted(
        intent_ids,
        key=lambda intent_id: (INTENTS_BY_ID[intent_id]["priority"], intent_id),
        reverse=True,
    )
    if len(ordered) == 1:
        return [{"intent": ordered[0], "score": 0.99, "matched_source": "exact"}]
    base = 0.70
    return [
        {"intent": intent_id, "score": max(0.5, base - index * 0.01), "matched_source": "ambiguous_alias"}
        for index, intent_id in enumerate(ordered)
    ]


def prioritize_intent(
    candidates: List[Dict[str, Any]], intent_id: str, matched_source: str
) -> List[Dict[str, Any]]:
    promoted = {
        "intent": intent_id,
        "score": 0.995,
        "raw_score": 0.995,
        "matched_source": matched_source,
    }
    remaining = [candidate for candidate in candidates if candidate["intent"] != intent_id]
    return [promoted, *remaining[: max(0, TOP_PREDICTIONS - 1)]]


def select_response(intent_id: str, style: str, normalized_query: str) -> str:
    responses = INTENTS_BY_ID[intent_id]["responses"].get(style, [])
    if not responses:
        responses = INTENTS_BY_ID[intent_id]["responses"]["en"]
    if intent_id not in CONVERSATIONAL_INTENTS or len(responses) == 1:
        return responses[0]
    selection_key = f"{intent_id}:{style}:{normalized_query}"
    index = sum((position + 1) * ord(character) for position, character in enumerate(selection_key)) % len(responses)
    return responses[index]


def build_alternatives(candidates: List[Dict[str, Any]], exclude_intent: str = "") -> List[Dict[str, Any]]:
    alternatives = []
    for candidate in candidates:
        if candidate["intent"] == exclude_intent:
            continue
        alternatives.append({
            "intent": candidate["intent"],
            "confidence": round(float(candidate["score"]), 6),
        })
        if len(alternatives) >= MAX_ALTERNATIVES:
            break
    return alternatives


def clarification_reply(candidates: List[Dict[str, Any]], style: str) -> str:
    for candidate in candidates:
        clarification = INTENTS_BY_ID[candidate["intent"]]["clarification"].get(style)
        if clarification:
            return clarification
    return GENERIC_CLARIFICATIONS[style]


def classify_message(message: str, requested_language: Optional[str] = "auto") -> Dict[str, Any]:
    clean_message = clean_text(message)
    normalized_message = normalize_for_match(clean_message)
    informal_query = normalize_informal_text(clean_message)
    normalized_query = (
        informal_query
        if find_controlled_alias_matches(informal_query)
        else normalize_unique_known_typos(informal_query)
    )
    used_controlled_normalization = normalized_query != normalized_message
    style = resolve_style(requested_language, normalized_query)
    entities = extract_vehicle_entities(normalized_query)

    if not normalized_query:
        return {
            "intent": "REJECT",
            "intent_id": "REJECT",
            "confidence": 0.0,
            "score": 0.0,
            "language": style,
            "reply_lang": style,
            "reply": GENERIC_CLARIFICATIONS[style],
            "alternatives": [],
            "top_preds": [],
            "requires_clarification": True,
            "matched_alias": "",
            "reason_code": "empty_message",
            "requires_live_data": False,
            "live_source": "",
            "entities": entities,
        }

    suggested_brand = find_safe_brand_typo(normalized_query) if not entities["brand"] else None
    if suggested_brand:
        typo_candidates = [{
            "intent": "vehicle_brand_search",
            "score": 0.74,
            "matched_source": "brand_spelling_clarification",
        }]
        return {
            "intent": "REJECT",
            "intent_id": "REJECT",
            "confidence": 0.74,
            "score": 0.74,
            "language": style,
            "reply_lang": style,
            "reply": brand_typo_reply(suggested_brand, style),
            "alternatives": build_alternatives(typo_candidates),
            "top_preds": [{
                "intent_id": "vehicle_brand_search",
                "id": "vehicle_brand_search",
                "score": 0.74,
            }],
            "requires_clarification": True,
            "matched_alias": "",
            "reason_code": "brand_spelling_clarification",
            "requires_live_data": False,
            "live_source": "",
            "entities": entities,
        }

    matched_ids, exact_reason = exact_candidates(normalized_query)
    candidates = rank_exact_candidates(matched_ids) if matched_ids else retrieve_intents(normalized_query)
    decision_reason = (
        "controlled_text_normalization"
        if used_controlled_normalization
        and not exact_reason
        and candidates
        and candidates[0].get("matched_source") != "controlled_alias"
        else ""
    )
    if entities["brand"]:
        current_intent = candidates[0]["intent"] if candidates else ""
        if RATE_QUERY_PATTERN.search(normalized_query):
            target_intent = "rental_rate"
            decision_reason = "brand_rate_context"
        elif current_intent in BRAND_CONTEXT_POLICY_INTENTS:
            target_intent = current_intent
        else:
            target_intent = "vehicle_brand_search"
            decision_reason = "recognized_brand"
        if (
            target_intent in {"rental_rate", "vehicle_brand_search"}
            or not candidates
            or candidates[0]["intent"] != target_intent
        ):
            candidates = prioritize_intent(candidates, target_intent, decision_reason or "recognized_brand")

    top_score = float(candidates[0]["score"]) if candidates else 0.0
    second_score = float(candidates[1]["score"]) if len(candidates) > 1 else 0.0
    margin = top_score - second_score
    exact_ambiguous = exact_reason == "exact_alias" and len(matched_ids) > 1
    low_confidence = top_score < CONFIDENCE_THRESHOLD
    ambiguous = len(candidates) > 1 and margin < CLARIFICATION_MARGIN and top_score < HIGH_CONFIDENCE_THRESHOLD
    missing_brand = bool(
        candidates
        and candidates[0]["intent"] == "vehicle_brand_search"
        and not entities["brand"]
    )
    requires_clarification = not candidates or exact_ambiguous or low_confidence or ambiguous or missing_brand

    if requires_clarification:
        reason_code = (
            "missing_brand"
            if missing_brand
            else "ambiguous_alias"
            if exact_ambiguous
            else "low_confidence"
            if low_confidence
            else "ambiguous_intent"
        )
        return {
            "intent": "REJECT",
            "intent_id": "REJECT",
            "confidence": round(top_score, 6),
            "score": round(top_score, 6),
            "language": style,
            "reply_lang": style,
            "reply": clarification_reply(candidates, style),
            "alternatives": build_alternatives(candidates),
            "top_preds": [
                {"intent_id": candidate["intent"], "id": candidate["intent"], "score": round(float(candidate["score"]), 6)}
                for candidate in candidates
            ],
            "requires_clarification": True,
            "matched_alias": candidates[0].get("matched_alias", "") if candidates else "",
            "reason_code": reason_code,
            "requires_live_data": False,
            "live_source": "",
            "entities": entities,
        }

    selected_intent = candidates[0]["intent"]
    selected_item = INTENTS_BY_ID[selected_intent]
    return {
        "intent": selected_intent,
        "intent_id": selected_intent,
        "confidence": round(top_score, 6),
        "score": round(top_score, 6),
        "language": style,
        "reply_lang": style,
        "reply": select_response(selected_intent, style, normalized_query),
        "alternatives": build_alternatives(candidates, exclude_intent=selected_intent),
        "top_preds": [
            {"intent_id": candidate["intent"], "id": candidate["intent"], "score": round(float(candidate["score"]), 6)}
            for candidate in candidates
        ],
        "requires_clarification": False,
        "matched_alias": candidates[0].get("matched_alias", "") or (clean_message if exact_reason == "exact_alias" else ""),
        "reason_code": decision_reason or exact_reason or candidates[0].get("matched_source", "semantic_match"),
        "requires_live_data": selected_item["requires_live_data"],
        "live_source": selected_item["live_source"],
        "entities": entities,
    }


if not DATASET_PATH.is_file():
    raise RuntimeError(f"Required chatbot dataset v6 is missing: {DATASET_PATH}")

intent_items = load_dataset(DATASET_PATH)
INTENTS_BY_ID: Dict[str, Dict[str, Any]] = {item["id"]: item for item in intent_items}
UNIQUE_TYPO_VOCABULARY = build_unique_typo_vocabulary(intent_items)
embedder = SentenceTransformer(MODEL_NAME)
(
    POSITIVE_ROWS,
    POSITIVE_EMBEDDINGS,
    NEGATIVE_ROWS,
    NEGATIVE_EMBEDDINGS,
    EXACT_EXAMPLES,
    EXACT_ALIASES,
) = build_indexes(intent_items)

app = FastAPI(title="RentifyPro Chatbot Service (Deterministic Multilingual)")


@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "RentifyPro Chatbot Service",
        "model": MODEL_NAME,
        "dataset": DATASET_PATH.name,
        "intent_count": len(INTENTS_BY_ID),
        "example_count": len(POSITIVE_ROWS),
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "high_confidence_threshold": HIGH_CONFIDENCE_THRESHOLD,
        "clarification_margin": CLARIFICATION_MARGIN,
    }


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/chat")
def chat(req: ChatRequest) -> Dict[str, Any]:
    return classify_message(req.message, req.language)
