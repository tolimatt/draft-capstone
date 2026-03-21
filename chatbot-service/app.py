import json
import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity


BASE_DIR = Path(__file__).parent
DEFAULT_DATASET_CANDIDATES = [
    BASE_DIR / "rentifypro_chatbot_dataset_v5.json",
    BASE_DIR / "rentifypro_chatbot_dataset_v4.json",
    BASE_DIR / "rentifypro_chatbot_dataset.json",
]

MODEL_NAME = os.getenv("CHATBOT_MODEL_NAME", "paraphrase-multilingual-MiniLM-L12-v2")
CONFIDENCE_THRESHOLD = float(os.getenv("CHATBOT_CONFIDENCE_THRESHOLD", "0.58"))
MIN_INTENT_MARGIN = float(os.getenv("CHATBOT_MIN_INTENT_MARGIN", "0.06"))
TOP_DEBUG_INTENTS = int(os.getenv("CHATBOT_TOP_DEBUG_INTENTS", "5"))
TOP_RECOMMENDATIONS = int(os.getenv("CHATBOT_TOP_RECOMMENDATIONS", "3"))

SUPPORTED_STYLES = {"en", "fil", "taglish"}

RECO_INTENT_IDS = {
    "available_vehicles",
    "available_transmission",
    "passenger_capacity",
}

TEXT_REPLACEMENTS = [
    ("\u20b1", "PHP "),
    ("\u00e2\u20ac\u0161\u00c2\u00b1", "PHP "),
    ("\u00e2\u20ac\u2122", "'"),
    ("\u00c3\u00a2\u20ac\u201a\u00ac\u00e2\u201e\u00a2", "'"),
    ("\u00e2\u20ac\u0153", '"'),
    ("\u00e2\u20ac\u009d", '"'),
    ("\u00c3\u00a2\u20ac\u201a\u00ac\u00c5\u201c", '"'),
    ("\u00c3\u00a2\u20ac\u201a\u00ac\u00c2\u009d", '"'),
    ("\u00e2\u20ac\u201c", "-"),
    ("\u00e2\u20ac\u201d", "-"),
    ("\u00c3\u00a2\u20ac\u201a\u00ac\u00e2\u20ac\u0153", "-"),
    ("\u00c3\u00a2\u20ac\u201a\u00ac\u00e2\u20ac\u009d", "-"),
]

INSTRUCTION_LINE_PATTERNS = [
    re.compile(r"^please answer in (english|filipino|taglish).*$", re.IGNORECASE),
    re.compile(r"^pakisagot sa filipino.*$", re.IGNORECASE),
]
DETAIL_LINE_PATTERN = re.compile(r"^(details|mga detalye|filters)\s*:\s*(.*)$", re.IGNORECASE)

TOKEN_PATTERN = re.compile(r"[a-z]+(?:'[a-z]+)?|\d+", re.IGNORECASE)

FILIPINO_TOKENS = {
    "ang",
    "ano",
    "anong",
    "at",
    "ba",
    "bawat",
    "bayad",
    "beripikasyon",
    "de",
    "deposito",
    "dapat",
    "gusto",
    "hanggang",
    "hindi",
    "ibig",
    "ilang",
    "isang",
    "kailangan",
    "kaya",
    "kasama",
    "kayo",
    "kamusta",
    "kanila",
    "kapag",
    "katao",
    "kotse",
    "kung",
    "mag",
    "magbook",
    "magkano",
    "magrenta",
    "makapag",
    "makapagbook",
    "mangyari",
    "may",
    "mga",
    "mo",
    "na",
    "naka",
    "naman",
    "ng",
    "ninyo",
    "oo",
    "oras",
    "paano",
    "pag",
    "pagbalik",
    "pagrenta",
    "pasahero",
    "pwede",
    "pwedeng",
    "pumili",
    "renta",
    "sakay",
    "salamat",
    "sasakyan",
    "sino",
    "subukan",
    "tanggap",
    "tinatanggap",
    "tumanggap",
    "upang",
    "wala",
}

FILIPINO_COURTESY_TOKENS = {"ba", "po", "opo", "lang", "naman"}

ENGLISH_TOKENS = {
    "account",
    "accepted",
    "address",
    "advance",
    "age",
    "allowed",
    "are",
    "automatic",
    "available",
    "bank",
    "book",
    "booking",
    "budget",
    "can",
    "capacity",
    "car",
    "cash",
    "coverage",
    "day",
    "days",
    "deposit",
    "details",
    "discount",
    "do",
    "driver",
    "enough",
    "full",
    "gcash",
    "hello",
    "help",
    "hour",
    "hours",
    "how",
    "i",
    "id",
    "included",
    "insurance",
    "is",
    "manual",
    "match",
    "methods",
    "minimum",
    "model",
    "much",
    "need",
    "now",
    "options",
    "or",
    "passenger",
    "passengers",
    "pay",
    "payment",
    "proof",
    "rates",
    "recommend",
    "rent",
    "rental",
    "requirements",
    "return",
    "same",
    "security",
    "sedan",
    "seats",
    "specific",
    "suv",
    "tank",
    "thank",
    "today",
    "transfer",
    "transmission",
    "truck",
    "type",
    "van",
    "vehicle",
    "vehicles",
    "what",
    "when",
    "where",
    "who",
    "why",
    "with",
}

ENGLISH_CORE_TOKENS = {
    "are",
    "can",
    "could",
    "do",
    "does",
    "how",
    "i",
    "is",
    "much",
    "need",
    "please",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "would",
}

TAGLISH_PATTERNS = [
    re.compile(r"\bhow\s+much\b.*\b(ang|ba|ng)\b", re.IGNORECASE),
    re.compile(r"\bmay\b.*\b(included|available|options|payment|insurance)\b", re.IGNORECASE),
    re.compile(r"\bpwede\b.*\b(book|booking|pay|payment|rent|reserve|today|insurance|transfer)\b", re.IGNORECASE),
    re.compile(r"\b(ano|paano|may|kailangan|pwede)\b.*\b(book|booking|payment|insurance|requirements|available|today|model|transfer)\b", re.IGNORECASE),
    re.compile(r"\b(what|how|is|are|can)\b.*\b(ba|ang|ng|po|naman|mga)\b", re.IGNORECASE),
]

CLARIFICATION_REPLIES = {
    "en": "I want to make sure I answer correctly. Are you asking about booking, payment, requirements, or vehicle availability?",
    "fil": "Gusto kong masigurong tama ang sagot ko. Ang tanong mo ba ay tungkol sa booking, bayad, requirements, o availability ng sasakyan?",
    "taglish": "Gusto kong masigurong tama ang sagot ko. About booking, payment, requirements, or vehicle availability ba ang tanong mo?",
}

RECO_INTROS = {
    "en": "Here are some recommended vehicles based on your request:",
    "fil": "Narito ang ilang inirerekomendang sasakyan batay sa iyong request:",
    "taglish": "Here are some recommended vehicles based sa request mo:",
}

RECO_NO_MATCH = {
    "en": "I couldn't find an available vehicle that matches your request. Try changing passengers, budget, or transmission.",
    "fil": "Wala akong mahanap na available na sasakyan na tugma sa request mo. Subukang baguhin ang passengers, budget, o transmission.",
    "taglish": "Wala akong mahanap na available na sasakyan na tugma sa request mo. Try mong baguhin ang passengers, budget, o transmission.",
}

LEGACY_TAGLISH_RESPONSE_OVERRIDES = {
    "chat_greeting": "Hello! Ako si RentifyPro AI. I can help you sa booking, requirements, payments, at available vehicles.",
    "chat_wellbeing": "Okay ako and ready akong tumulong sa booking, payment, at vehicle questions mo.",
    "chat_identity": "Ako si RentifyPro AI assistant mo for rentals, booking steps, payment, at recommendations.",
    "chat_capabilities": "Matutulungan kita sa vehicle availability, booking process, payment methods, requirements, at recommendations.",
    "chat_gratitude": "You're welcome! Sabihin mo lang if may tanong ka pa about booking o rentals.",
    "rental_rate": "Depende ang rental rate sa vehicle at duration. Sabihin mo lang anong unit at ilang oras o araw.",
    "insurance_included": "Yes, included ang insurance sa lahat ng vehicle rentals.",
    "security_deposit": "Yes, may refundable security deposit na PHP 1,000.",
    "payment_methods": "Pwede kang magbayad via Cash, GCash, at Bank Transfer.",
    "rental_requirements": "Kailangan mo ng at least one valid ID, preferably Driver's License.",
    "minimum_age": "Minimum age requirement is 18 years old.",
    "id_or_proof_of_address": "Yes, kailangan ng valid ID or proof of address for verification.",
    "available_vehicles": "Available options natin are Sedan, Van, SUV, at Pickup Truck.",
    "available_transmission": "May Automatic at Manual transmission options tayo.",
    "full_tank_return": "Yes, kailangan ibalik ang sasakyan na full tank.",
    "passenger_capacity": "Depende sa vehicle, around 5 to 15 passengers ang capacity.",
    "choose_specific_model": "Yes, pwede kang pumili ng specific model depende sa availability.",
    "how_to_book": "To book, i-verify muna ang account mo, submit requirements, then confirm your booking.",
    "same_day_rental": "Yes, pwede ang same-day rental depende sa vehicle availability.",
    "advance_booking_discount": "Sa ngayon, wala pang advance booking discount.",
}


class ChatRequest(BaseModel):
    message: str
    vehicles: Optional[List[Dict[str, Any]]] = None


def clean_text(value: Any) -> str:
    text = str(value or "")
    for bad, good in TEXT_REPLACEMENTS:
        text = text.replace(bad, good)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_for_match(value: Any) -> str:
    text = clean_text(value).lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize(value: str) -> List[str]:
    return [token.lower() for token in TOKEN_PATTERN.findall(value or "")]


def dedupe_keep_order(values: List[str]) -> List[str]:
    seen = set()
    deduped: List[str] = []
    for value in values:
        item = clean_text(value)
        norm = normalize_for_match(item)
        if not item or not norm or norm in seen:
            continue
        seen.add(norm)
        deduped.append(item)
    return deduped


def resolve_dataset_path() -> Path:
    configured = clean_text(os.getenv("CHATBOT_DATASET_PATH", ""))
    if configured:
        configured_path = Path(configured)
        if not configured_path.is_absolute():
            configured_path = BASE_DIR / configured_path
        return configured_path

    for candidate in DEFAULT_DATASET_CANDIDATES:
        if candidate.exists():
            return candidate

    return DEFAULT_DATASET_CANDIDATES[0]


def parse_legacy_item(item: Dict[str, Any]) -> Tuple[List[str], Dict[str, str]]:
    english_block = item.get("english", {})
    filipino_block = item.get("filipino", {})

    examples = dedupe_keep_order([
        english_block.get("question", ""),
        filipino_block.get("question", ""),
    ])

    en_answers = [clean_text(ans) for ans in english_block.get("answers", []) if clean_text(ans)]
    fil_answers = [clean_text(ans) for ans in filipino_block.get("answers", []) if clean_text(ans)]

    response_en = en_answers[0] if en_answers else ""
    response_fil = fil_answers[0] if fil_answers else ""
    response_taglish = LEGACY_TAGLISH_RESPONSE_OVERRIDES.get(clean_text(item.get("id", "")), "")

    if not response_taglish:
        if response_en and response_fil:
            response_taglish = f"{response_en} Kung may tanong ka pa, sabihin mo lang."
        else:
            response_taglish = response_en or response_fil

    responses = {
        "en": response_en,
        "fil": response_fil,
        "taglish": response_taglish,
    }

    return examples, responses


def normalize_responses(intent_id: str, responses: Dict[str, Any]) -> Dict[str, str]:
    normalized = {
        "en": clean_text(responses.get("en", "")),
        "fil": clean_text(responses.get("fil", "")),
        "taglish": clean_text(responses.get("taglish", "")),
    }

    if not normalized["taglish"]:
        normalized["taglish"] = LEGACY_TAGLISH_RESPONSE_OVERRIDES.get(intent_id, "")

    if not normalized["taglish"]:
        if normalized["en"] and normalized["fil"]:
            normalized["taglish"] = f"{normalized['en']} Kung may tanong ka pa, sabihin mo lang."
        else:
            normalized["taglish"] = normalized["en"] or normalized["fil"]

    if not normalized["en"]:
        normalized["en"] = normalized["taglish"] or normalized["fil"]
    if not normalized["fil"]:
        normalized["fil"] = normalized["taglish"] or normalized["en"]

    return normalized


def parse_dataset_item(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    intent_id = clean_text(item.get("id", ""))
    if not intent_id:
        return None

    examples = [clean_text(x) for x in item.get("examples", []) if clean_text(x)]
    responses: Dict[str, Any] = {}
    if isinstance(item.get("responses", {}), dict):
        responses = item.get("responses", {})
    elif any(key in item for key in ("answer_en", "answer_fil", "answer_taglish")):
        responses = {
            "en": item.get("answer_en", ""),
            "fil": item.get("answer_fil", ""),
            "taglish": item.get("answer_taglish", ""),
        }

    if examples and responses:
        normalized_responses = normalize_responses(intent_id, responses)
    else:
        examples, normalized_responses = parse_legacy_item(item)

    if not examples:
        return None

    return {
        "id": intent_id,
        "examples": dedupe_keep_order(examples),
        "responses": normalized_responses,
    }


def load_dataset(dataset_path: Path) -> List[Dict[str, Any]]:
    raw = json.loads(dataset_path.read_text(encoding="utf-8"))
    raw_items = raw.get("items", []) if isinstance(raw, dict) else []
    intents: List[Dict[str, Any]] = []

    for item in raw_items:
        parsed = parse_dataset_item(item)
        if parsed:
            intents.append(parsed)

    if not intents:
        raise RuntimeError(f"No valid intents loaded from dataset: {dataset_path}")

    return intents


def prepare_message_context(message: str) -> Dict[str, str]:
    raw = clean_text(message)
    lines = [clean_text(line) for line in str(message or "").splitlines() if clean_text(line)]

    if not lines:
        normalized = normalize_for_match(raw)
        return {
            "raw": raw,
            "primary": raw,
            "intent_query": raw,
            "normalized": normalized,
        }

    style_lines: List[str] = []
    retrieval_lines: List[str] = []

    for line in lines:
        if any(pattern.match(line) for pattern in INSTRUCTION_LINE_PATTERNS):
            continue

        detail_match = DETAIL_LINE_PATTERN.match(line)
        if detail_match:
            detail_content = clean_text(detail_match.group(2))
            if detail_content:
                retrieval_lines.append(detail_content)
            continue

        style_lines.append(line)
        retrieval_lines.append(line)

    if not retrieval_lines:
        retrieval_lines = lines

    primary = style_lines[-1] if style_lines else retrieval_lines[-1]
    primary_tokens = tokenize(normalize_for_match(primary))

    intent_query = primary if len(primary_tokens) >= 3 else " ".join(retrieval_lines)
    intent_query = clean_text(intent_query) or raw

    return {
        "raw": raw,
        "primary": primary,
        "intent_query": intent_query,
        "normalized": normalize_for_match(intent_query),
    }


def detect_style(text: str) -> Dict[str, Any]:
    normalized = normalize_for_match(text)
    tokens = tokenize(normalized)

    if not tokens:
        return {
            "style": "en",
            "fil_score": 0,
            "en_score": 0,
            "taglish_pattern": False,
            "tokens": [],
            "fil_hits": [],
            "en_hits": [],
        }

    fil_hits = [token for token in tokens if token in FILIPINO_TOKENS]
    en_hits = [token for token in tokens if token in ENGLISH_TOKENS]
    en_core_hits = [token for token in tokens if token in ENGLISH_CORE_TOKENS]

    if re.search(r"\bmay i\b", normalized):
        fil_hits = [token for token in fil_hits if token != "may"]

    fil_score = len(fil_hits)
    en_score = len(en_hits)
    taglish_pattern = any(pattern.search(normalized) for pattern in TAGLISH_PATTERNS)

    style = "en"

    if fil_score > 0 and en_score > 0:
        courtesy_only = all(token in FILIPINO_COURTESY_TOKENS for token in fil_hits)

        if taglish_pattern:
            style = "taglish"
        elif fil_score >= 2 and not en_core_hits:
            style = "fil"
        elif en_score >= 3 and fil_score <= 1 and courtesy_only:
            style = "en"
        elif fil_score >= en_score * 1.7:
            style = "fil"
        elif en_score >= fil_score * 1.7:
            style = "en"
        else:
            style = "taglish"
    elif fil_score > 0:
        style = "fil"

    return {
        "style": style,
        "fil_score": fil_score,
        "en_score": en_score,
        "taglish_pattern": taglish_pattern,
        "tokens": tokens,
        "fil_hits": dedupe_keep_order(fil_hits),
        "en_hits": dedupe_keep_order(en_hits),
    }


def build_intent_index(intent_items: List[Dict[str, Any]]) -> Tuple[List[Dict[str, str]], np.ndarray]:
    rows: List[Dict[str, str]] = []

    for item in intent_items:
        intent_id = item["id"]
        for example in item["examples"]:
            rows.append({
                "intent_id": intent_id,
                "example": example,
            })

    if not rows:
        raise RuntimeError("Intent example index is empty.")

    examples = [row["example"] for row in rows]
    embeddings = embedder.encode(examples, normalize_embeddings=True)

    return rows, embeddings


def retrieve_intents(intent_query: str, top_k: int = TOP_DEBUG_INTENTS) -> List[Dict[str, Any]]:
    user_emb = embedder.encode([intent_query], normalize_embeddings=True)
    sims = cosine_similarity(user_emb, EXAMPLE_EMBEDDINGS)[0]

    best_by_intent: Dict[str, Dict[str, Any]] = {}
    for idx, score in enumerate(sims):
        row = EXAMPLE_INDEX[idx]
        intent_id = row["intent_id"]
        score_value = float(score)

        current = best_by_intent.get(intent_id)
        if current is None or score_value > current["score"]:
            best_by_intent[intent_id] = {
                "intent_id": intent_id,
                "id": intent_id,
                "score": score_value,
                "matched_example": row["example"],
            }

    ranked = sorted(best_by_intent.values(), key=lambda item: item["score"], reverse=True)
    return ranked[: max(1, top_k)]


def assess_prediction(top_preds: List[Dict[str, Any]]) -> Dict[str, Any]:
    top_score = float(top_preds[0]["score"]) if top_preds else 0.0
    second_score = float(top_preds[1]["score"]) if len(top_preds) > 1 else 0.0
    margin = top_score - second_score if len(top_preds) > 1 else top_score

    low_confidence = top_score < CONFIDENCE_THRESHOLD
    ambiguous = len(top_preds) > 1 and margin < MIN_INTENT_MARGIN

    return {
        "top_score": top_score,
        "second_score": second_score,
        "margin": margin,
        "low_confidence": low_confidence,
        "ambiguous": ambiguous,
    }


def has_vehicle_availability_signal(text: str) -> bool:
    normalized = normalize_for_match(text)
    if not normalized:
        return False

    has_vehicle_term = bool(
        re.search(r"\b(vehicle|vehicles|car|cars|kotse|sasakyan|sedan|suv|van|pickup|truck)\b", normalized)
    )
    has_availability_term = bool(
        re.search(r"\b(available|availability|right now|currently|ngayon|meron bang|may available)\b", normalized)
    )
    has_vehicle_list_question = bool(
        re.search(r"\banong?\s+(mga\s+)?(sasakyan|kotse|vehicles?|cars?)\b", normalized)
    )
    has_capacity_signal = bool(
        re.search(r"\b(passengers?|pax|capacity|kasya|kayang|pasahero|seats?)\b", normalized)
    )

    return has_vehicle_term and (has_availability_term or has_vehicle_list_question) and (
        not has_capacity_signal or has_availability_term
    )


def pick_canonical_response(intent_id: str, style: str) -> str:
    intent = INTENTS_BY_ID.get(intent_id)
    if not intent:
        return CLARIFICATION_REPLIES.get(style, CLARIFICATION_REPLIES["en"])

    responses = intent["responses"]
    order = {
        "en": ["en", "taglish", "fil"],
        "fil": ["fil", "taglish", "en"],
        "taglish": ["taglish", "en", "fil"],
    }.get(style, ["en", "fil", "taglish"])

    for key in order:
        candidate = clean_text(responses.get(key, ""))
        if candidate:
            return candidate

    return CLARIFICATION_REPLIES.get(style, CLARIFICATION_REPLIES["en"])


def parse_amount(raw: str) -> Optional[float]:
    token = clean_text(raw).lower().replace(",", "")
    if not token:
        return None

    multiplier = 1000 if token.endswith("k") else 1
    token = token[:-1] if token.endswith("k") else token

    try:
        value = float(token)
    except ValueError:
        return None

    if value < 0:
        return None

    return value * multiplier


def extract_slots(text: str) -> Dict[str, Any]:
    normalized = normalize_for_match(text)

    pax = None
    pax_match = re.search(r"\b(\d{1,2})\s*(pax|passengers?|persons?|people|katao|tao|seats?|seater)?\b", normalized)
    if pax_match:
        pax = int(pax_match.group(1))

    transmission = None
    if re.search(r"\b(automatic|auto|matic)\b", normalized):
        transmission = "automatic"
    elif re.search(r"\b(manual|stick)\b", normalized):
        transmission = "manual"

    vehicle_type = None
    if re.search(r"\b(sedan|car|kotse)\b", normalized):
        vehicle_type = "sedan"
    if re.search(r"\b(suv)\b", normalized):
        vehicle_type = "suv"
    if re.search(r"\b(van|minivan)\b", normalized):
        vehicle_type = "van"
    if re.search(r"\b(pick[\s-]?up|truck)\b", normalized):
        vehicle_type = "pickup"
    if re.search(r"\b(motorcycle|motorbike|motor)\b", normalized):
        vehicle_type = "motorcycle"

    budget = None
    budget_patterns = [
        r"(?:budget|under|below|max|maximum|hanggang|less than|up to|upto)\s*(?:php|p)?\s*([0-9]+(?:\.[0-9]+)?k?)",
        r"(?:php|p)\s*([0-9]+(?:\.[0-9]+)?k?)",
    ]
    for pattern in budget_patterns:
        match = re.search(pattern, normalized)
        if not match:
            continue
        amount = parse_amount(match.group(1))
        if amount is not None:
            budget = round(amount, 2)
            break

    return {
        "pax": pax,
        "transmission": transmission,
        "type": vehicle_type,
        "budget": budget,
    }


def normalize_transmission(value: Any) -> str:
    text = normalize_for_match(value)
    if "automatic" in text or " auto" in f" {text}":
        return "automatic"
    if "manual" in text:
        return "manual"
    return text


def normalize_vehicle_type(value: Any) -> str:
    text = normalize_for_match(value)
    if "pickup" in text or "truck" in text:
        return "pickup"
    if "suv" in text:
        return "suv"
    if "van" in text:
        return "van"
    if "sedan" in text:
        return "sedan"
    if "motor" in text or "bike" in text:
        return "motorcycle"
    return text


def to_number(value: Any, default: float = 0.0) -> float:
    try:
        number = float(value)
        if np.isnan(number) or np.isinf(number):
            return default
        return number
    except (TypeError, ValueError):
        return default


def normalize_vehicle(vehicle: Dict[str, Any]) -> Dict[str, Any]:
    seats = int(to_number(vehicle.get("seats", vehicle.get("passengerCapacity", vehicle.get("capacity", 0))), 0))

    daily_rate = vehicle.get("dailyRate")
    if daily_rate is None:
        daily_rate = vehicle.get("dailyRentalRate")
    if daily_rate is None:
        daily_rate = vehicle.get("hourlyRate")
    if daily_rate is None:
        daily_rate = vehicle.get("price")

    availability_status = normalize_for_match(vehicle.get("availabilityStatus", ""))
    is_available = bool(vehicle.get("isAvailable", availability_status in {"", "available"}))

    normalized = {
        **vehicle,
        "name": clean_text(vehicle.get("name", "")) or "Unnamed vehicle",
        "type": normalize_vehicle_type(vehicle.get("type", "")),
        "transmission": normalize_transmission(vehicle.get("transmission", "")),
        "seats": max(0, seats),
        "dailyRate": to_number(daily_rate, 0.0),
        "isAvailable": is_available,
    }

    return normalized


def score_vehicle(vehicle: Dict[str, Any], slots: Dict[str, Any]) -> float:
    score = 0.0

    if slots["type"]:
        score += 3.0 if vehicle.get("type", "") == slots["type"] else -0.75

    if slots["transmission"]:
        score += 2.0 if vehicle.get("transmission", "") == slots["transmission"] else -0.5

    if slots["pax"] is not None:
        seats = int(vehicle.get("seats", 0) or 0)
        if seats >= slots["pax"]:
            score += 3.0
        score -= abs(seats - slots["pax"]) * 0.05

    if slots["budget"] is not None:
        rate = to_number(vehicle.get("dailyRate", 0.0), 0.0)
        if rate <= slots["budget"]:
            score += 2.0
        else:
            score -= 0.5

    return score


def recommend_vehicles(vehicles: List[Dict[str, Any]], slots: Dict[str, Any], top_n: int = TOP_RECOMMENDATIONS) -> List[Dict[str, Any]]:
    normalized = [normalize_vehicle(vehicle) for vehicle in vehicles]
    filtered = [vehicle for vehicle in normalized if vehicle.get("isAvailable", True)]

    if slots["type"]:
        filtered = [vehicle for vehicle in filtered if vehicle.get("type") == slots["type"]]

    if slots["transmission"]:
        filtered = [vehicle for vehicle in filtered if vehicle.get("transmission") == slots["transmission"]]

    if slots["pax"] is not None:
        filtered = [vehicle for vehicle in filtered if int(vehicle.get("seats", 0) or 0) >= slots["pax"]]

    if slots["budget"] is not None:
        filtered = [vehicle for vehicle in filtered if to_number(vehicle.get("dailyRate", 0.0), 0.0) <= slots["budget"]]

    ranked = sorted(filtered, key=lambda vehicle: score_vehicle(vehicle, slots), reverse=True)
    return ranked[: max(1, top_n)]


def format_rate(value: Any) -> str:
    amount = to_number(value, 0.0)
    if float(amount).is_integer():
        return f"PHP {int(amount)}"
    return f"PHP {amount:.2f}"


def build_recommendation_reply(style: str, recommendations: List[Dict[str, Any]]) -> str:
    intro = RECO_INTROS.get(style, RECO_INTROS["en"])
    lines = [intro]

    for vehicle in recommendations:
        if style == "fil":
            line = (
                f"- {vehicle.get('name', 'Unnamed vehicle')} | {vehicle.get('type', 'unknown')} | "
                f"{vehicle.get('transmission', 'unknown')} | upuan: {vehicle.get('seats', 0)} | "
                f"{format_rate(vehicle.get('dailyRate', 0.0))}/araw"
            )
        else:
            line = (
                f"- {vehicle.get('name', 'Unnamed vehicle')} | {vehicle.get('type', 'unknown')} | "
                f"{vehicle.get('transmission', 'unknown')} | seats: {vehicle.get('seats', 0)} | "
                f"{format_rate(vehicle.get('dailyRate', 0.0))}/day"
            )
        lines.append(line)

    return "\n".join(lines)


def chatbot_reply(message: str) -> Dict[str, Any]:
    message_ctx = prepare_message_context(message)
    style_info = detect_style(message_ctx["primary"])
    style = style_info["style"] if style_info["style"] in SUPPORTED_STYLES else "en"

    top_preds = retrieve_intents(message_ctx["intent_query"], top_k=TOP_DEBUG_INTENTS)
    availability_signal = has_vehicle_availability_signal(message_ctx["primary"])
    if top_preds and availability_signal:
        best = top_preds[0]
        available_pred = next((pred for pred in top_preds if pred["intent_id"] == "available_vehicles"), None)
        if (
            available_pred is not None
            and best["intent_id"] != "available_vehicles"
            and float(available_pred["score"]) >= float(best["score"]) - 0.08
        ):
            top_preds = [available_pred] + [pred for pred in top_preds if pred["intent_id"] != "available_vehicles"]

    prediction = assess_prediction(top_preds)

    should_clarify = not top_preds or prediction["low_confidence"] or prediction["ambiguous"]
    intent_id = "REJECT" if should_clarify else top_preds[0]["intent_id"]

    if should_clarify:
        reply = CLARIFICATION_REPLIES.get(style, CLARIFICATION_REPLIES["en"])
        decision_reason = "low_confidence" if prediction["low_confidence"] else "ambiguous_intent"
        if not top_preds:
            decision_reason = "no_prediction"
    else:
        reply = pick_canonical_response(intent_id, style)
        decision_reason = "accepted"

    return {
        "intent_id": intent_id,
        "reply_lang": style,
        "reply_style": style,
        "score": prediction["top_score"],
        "score_margin": prediction["margin"],
        "reply": reply,
        "top_preds": top_preds,
        "decision_reason": decision_reason,
        "debug": {
            "normalized_message": message_ctx["normalized"],
            "primary_message": message_ctx["primary"],
            "intent_query": message_ctx["intent_query"],
            "confidence_threshold": CONFIDENCE_THRESHOLD,
            "min_intent_margin": MIN_INTENT_MARGIN,
            "top_score": prediction["top_score"],
            "second_score": prediction["second_score"],
            "margin": prediction["margin"],
            "availability_signal": availability_signal,
            "style_detection": style_info,
        },
    }


dataset_path = resolve_dataset_path()
intent_items = load_dataset(dataset_path)
INTENTS_BY_ID: Dict[str, Dict[str, Any]] = {item["id"]: item for item in intent_items}

embedder = SentenceTransformer(MODEL_NAME)
EXAMPLE_INDEX, EXAMPLE_EMBEDDINGS = build_intent_index(intent_items)

app = FastAPI(title="RentifyPro Chatbot Service (Deterministic Multilingual)")


@app.get("/")
def root() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "RentifyPro Chatbot Service",
        "model": MODEL_NAME,
        "dataset": str(dataset_path.name),
        "intent_count": len(INTENTS_BY_ID),
        "example_count": len(EXAMPLE_INDEX),
        "confidence_threshold": CONFIDENCE_THRESHOLD,
        "min_intent_margin": MIN_INTENT_MARGIN,
    }


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/chat")
def chat(req: ChatRequest) -> Dict[str, Any]:
    base = chatbot_reply(req.message)

    if base["intent_id"] in RECO_INTENT_IDS and req.vehicles is not None:
        slots = extract_slots(req.message)
        recommendations = recommend_vehicles(req.vehicles, slots, top_n=TOP_RECOMMENDATIONS)

        base["slots"] = slots
        base["recommendations"] = recommendations

        if recommendations:
            base["reply"] = build_recommendation_reply(base["reply_style"], recommendations)
        else:
            base["reply"] = RECO_NO_MATCH.get(base["reply_style"], RECO_NO_MATCH["en"])
    else:
        base["recommendations"] = []

    return base
