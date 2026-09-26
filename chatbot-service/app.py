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
    "chat_gender_identity",
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
MODEL_CONTEXT_START = re.compile(
    r"\b(?:per|bawat|kada|daily|hourly|today|tomorrow|bukas|ngayon|"
    r"for\s+(?:\d+|one|two|three|isang|dalawang)\s+(?:days?|hours?|araw|oras)|"
    r"under|below|less\s+than|up\s+to|maximum|max|hanggang|mas\s+mababa\s+sa|"
    r"available|availability|rate|price|cost|rent|rental|"
    r"automatic|manual|in|at|sa|on|from)\b",
    re.IGNORECASE,
)
VEHICLE_CATEGORIES = {
    "suv": "suv", "suvs": "suv", "sedan": "sedan", "sedans": "sedan",
    "van": "van", "vans": "van", "truck": "pickup", "trucks": "pickup",
    "pickup": "pickup", "motorcycle": "motorcycle", "motorcycles": "motorcycle",
    "motorbike": "motorcycle", "motorbikes": "motorcycle", "car": "sedan",
    "cars": "sedan", "kotse": "sedan",
}
AMOUNT_PATTERN = r"(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*k?"
BUDGET_PATTERN = re.compile(
    rf"\b(?:under|below|less\s+than|up\s+to|max(?:imum)?|budget(?:\s+of)?|"
    rf"hanggang|mas\s+mababa\s+sa)\s*(?:php|₱|p)?\s*({AMOUNT_PATTERN})\b",
    re.IGNORECASE,
)
DAY_UNIT_PATTERN = re.compile(r"\b(?:per\s+day|per\s+24\s*hours?|daily|bawat\s+araw|kada\s+araw)\b", re.IGNORECASE)
HOUR_UNIT_PATTERN = re.compile(r"\b(?:per\s+hour|hourly|bawat\s+oras|kada\s+oras)\b", re.IGNORECASE)
PICKUP_TIME_PATTERN = re.compile(
    r"\b(?:pickup\s+(?:time|schedule)|(?:when|what\s+time)\s+(?:is\s+)?(?:my\s+)?pickup|"
    r"(?:what|when|anong|ilang)\s+(?:time|oras).*\b(?:pick\s*up|pickup|kukunin|kunin|kuha)|"
    r"(?:pick\s*up|pickup|kukunin|kunin|kuha).*\b(?:what|when|time|oras|schedule|kailan))\b",
    re.IGNORECASE,
)
PERSONAL_BOOKING_PATTERNS = (
    ("my_active_bookings", (
        re.compile(r"^(?:do i have|have i got|is there|are there|show(?: me)?|check)\b.{0,55}\b(?:active|current|ongoing)\b.{0,20}\b(?:bookings?|rentals?)\b"),
        re.compile(r"^(?:may|meron|mayroon)\b.{0,50}\b(?:active|current|ongoing|kasalukuyang)\b.{0,20}\b(?:booking|rental|renta)\b.{0,20}\b(?:ako|ko)\b"),
        re.compile(r"^(?:may|meron|mayroon)\s+(?:booking|rental|renta)\s+pa\s+ba\s+ako\b"),
    )),
    ("my_unpaid_balance", (
        re.compile(r"^(?:do i have|is there|are there|how much|what is my|check my)\b.{0,65}\b(?:unpaid|outstanding|remaining|due|overdue|owe)\b.{0,25}\b(?:balance|payment|amount|fee|bookings?)\b"),
        re.compile(r"^(?:do i|am i)\s+(?:still\s+)?owe\b"),
        re.compile(r"^(?:may|meron|mayroon)\b.{0,45}\b(?:unpaid|balance|balanse|utang)\b.{0,25}\b(?:ako|ko)\s*(?:ba)?$"),
        re.compile(r"^magkano\b.{0,35}\b(?:balance|balanse|utang)\s+ko\b"),
    )),
    ("my_overdue_return", (
        re.compile(r"^(?:am i|is my|are my|do i have|are any of my)\b.{0,65}\b(?:overdue|late(?:\s+return)?|returning\s+late)\b"),
        re.compile(r"^(?:late|overdue|nahuli)\s+(?:na\s+)?ba\b.{0,50}\b(?:booking|return|balik|rental|renta|ako|ko)\b"),
        re.compile(r"^(?:may|meron|mayroon)\b.{0,35}\b(?:late|overdue)\s+(?:return|balik)\b.{0,15}\b(?:ako|ko)\b"),
    )),
    ("booking_status", (
        re.compile(r"^(?:do i have|have i got)\b.{0,45}\b(?:bookings?|reservations?)\b(?:\s+(?:right now|currently))?$"),
        re.compile(r"^(?:do i have|have i got|may|meron|mayroon)\b.{0,35}\b(?:pending|confirmed)\s+(?:booking|reservation|renta)\b"),
    )),
)
# These forms address the assistant itself. Keep third-party rental questions out
# of this conversational intent (for example, "can a gay renter book?").
ASSISTANT_IDENTITY_TERMS = (
    r"(?:girl|boy|woman|man|gay|lesbian|male|female|straight|non[- ]?binary|"
    r"bisexual|pansexual|asexual|queer|transgender|trans|tomboy|fem[- ]?boy|"
    r"babae|lalaki|bakla|bading|beki|tibo|lesbiyana|silahis)"
)
FEMBOY_PATTERN = re.compile(r"\bfem[- ]?boy\b")
SELF_GENDER_QUESTION_PATTERNS = (
    re.compile(rf"^(?:are you|r u)\s+(?:(?:a|an)\s+)?{ASSISTANT_IDENTITY_TERMS}\b"),
    re.compile(r"^(?:what(?:'s| is)|which is)\s+your\s+(?:gender|sex|sexuality|sexual orientation)\b"),
    re.compile(r"^what\s+gender\s+are\s+you\b"),
    re.compile(rf"^do you (?:have\s+(?:a\s+)?(?:gender|sex|sexuality|sexual orientation)|identify as\s+(?:a\s+)?{ASSISTANT_IDENTITY_TERMS})\b"),
    re.compile(rf"^(?:ikaw\s+(?:ba\s+)?(?:ay\s+)?)?{ASSISTANT_IDENTITY_TERMS}\s+ka\b|^ikaw\s+(?:ba\s+)?(?:ay\s+)?{ASSISTANT_IDENTITY_TERMS}\b"),
    re.compile(rf"^{ASSISTANT_IDENTITY_TERMS}\s+ba\s+(?:ikaw|si\s+rentify\s+ai|ang\s+chatbot)\b"),
    re.compile(r"^(?:ano|anong)\s+(?:ang\s+)?(?:kasarian|gender|sexual orientation)\s+mo\b"),
    re.compile(r"^(?:may|meron|mayroon)\s+ka\s+ba(?:ng)?\s+(?:kasarian|gender|sexual orientation)\b"),
)
STYLE_DIRECTIVE_PATTERN = re.compile(
    r"^\s*(?:(?:please\s+)?(?:reply|answer|respond|speak)\s+in\s+"
    r"(?P<en>english)|(?:please\s+)?(?:reply|answer|respond|speak)\s+in\s+"
    r"(?P<fil>filipino|tagalog)|(?:please\s+)?(?:reply|answer|respond|speak)\s+in\s+"
    r"(?P<taglish>taglish))\s*[:,.]?\s*",
    re.IGNORECASE,
)

FILIPINO_TOKENS = {
    "ako", "ang", "ano", "anong", "at", "ba", "bakit", "balanse", "bayad",
    "dapat", "di", "gamit", "hindi", "ilang", "kailangan", "kaso", "kotse",
    "kaya", "kung", "late", "mag", "magbayad", "magbook", "magkano", "magrenta", "magsalita",
    "kumusta", "lang", "magsoli", "makapagbook", "may", "mayroon", "meron", "mga", "mo", "muna",
    "na", "ng", "ngayon", "paano", "pano", "para", "pasahero", "po", "puwedeng", "pwede",
    "renta", "rentahan", "sabay", "salamat", "sana", "sasakyan", "sige", "sobra", "tulong",
    "wala", "yung", "kasya",
    "oo", "opo", "ko", "kong", "akin", "gusto", "nasaan", "dito", "doon",
    "iyan", "yon", "yun", "naman", "pala", "kasi", "pero", "tapos", "kapag",
    "pag", "baka", "talaga", "puwede", "kuha", "kunin", "ibalik", "bayaran",
    "oras", "araw", "bukas", "ngayon", "yung", "maaaring", "bawat", "mas",
    "ikaw", "ka", "babae", "lalaki", "bakla", "bading", "beki",
    "tibo", "tomboy", "femboy", "lesbiyana", "silahis", "kasarian",
    "nahuli", "balik", "utang", "kasalukuyang",
}
ENGLISH_TOKENS = {
    "account", "available", "balance", "book", "booking", "can", "cancel",
    "car", "cash", "day", "deposit", "do", "driver", "extend", "fee", "gcash",
    "automatic", "book", "date", "dates", "fuel", "help", "how", "insurance",
    "late", "level", "methods", "pax", "payment", "pending", "price", "rate", "rent",
    "rental", "requirements", "return", "same", "status", "vehicle", "what", "when",
    "where", "which", "why",
    "pickup", "time", "hour", "hours", "daily", "hourly", "model", "brand",
    "van", "truck", "motorcycle", "today", "tomorrow", "budget",
    "under", "below", "maximum", "minimum", "refund", "refundable", "due",
    "overdue", "unpaid", "active", "current", "ongoing", "owe", "owner",
    "location", "schedule", "manual", "listing",
    "availability", "extension",
    "thank", "thanks", "please", "you",
    "girl", "boy", "woman", "man", "gay", "lesbian", "male", "female", "gender",
    "sexuality", "straight", "nonbinary", "bisexual", "pansexual", "asexual",
    "queer", "transgender", "trans", "tomboy", "femboy",
}
FILIPINO_GRAMMAR_PATTERN = re.compile(r"\b(?:may|meron|mayroon)\b.*\b(?:ba|bang)\b|\b(?:yung|ang|ng|ko|kong|mga)\b", re.IGNORECASE)
ENGLISH_DOMAIN_PATTERN = re.compile(
    r"\b(?:available|booking|payment|status|vehicle|pickup|rental|rate|extend|"
    r"automatic|manual|van|car|driver|per\s+day|per\s+hour)\b", re.IGNORECASE
)
AMBIGUOUS_SHORT_FOLLOWUPS = {
    "oo", "opo", "sige", "ok", "okay", "yes", "no", "per day", "per hour",
    "bawat araw", "bawat oras", "daily", "hourly",
}

GENERIC_CLARIFICATIONS = {
    "en": "I want to make sure I answer correctly. Could you add a little more detail to your question?",
    "fil": "Gusto kong masigurong tama ang sagot ko. Maaari mo bang dagdagan ng kaunting detalye ang tanong?",
    "taglish": "Gusto kong masigurong tama ang sagot ko. Could you add a little more detail?",
}
FEMBOY_REPLIES = {
    "en": "Femboy usually describes feminine gender expression, not sexual orientation. I'm an AI assistant, so I'm not a femboy and I don't have a sexual orientation.",
    "fil": "Ang femboy ay karaniwang tumutukoy sa pambabaeng pagpapahayag ng kasarian, hindi sa seksuwal na oryentasyon. AI assistant ako, kaya hindi ako femboy at wala akong seksuwal na oryentasyon.",
    "taglish": "Femboy usually describes feminine gender expression, hindi sexual orientation. AI assistant ako, so hindi ako femboy at wala akong sexual orientation.",
}
FEMBOY_DEFINITION_REPLIES = {
    "en": "Femboy usually describes feminine gender expression, not sexual orientation. A person's orientation cannot be inferred from that label.",
    "fil": "Ang femboy ay karaniwang tumutukoy sa pambabaeng pagpapahayag ng kasarian, hindi sa seksuwal na oryentasyon. Hindi matutukoy ang oryentasyon ng isang tao mula sa tawag na iyon.",
    "taglish": "Femboy usually describes feminine gender expression, hindi sexual orientation. Hindi malalaman ang orientation ng isang tao from that label alone.",
}


class ChatRequest(BaseModel):
    message: str
    language: Optional[str] = "auto"
    previous_language: Optional[str] = None
    previous_context: Optional[Dict[str, Any]] = None
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


def mentioned_brands(message: str) -> List[str]:
    tokens = [normalize_for_match(token) for token in TOKEN_PATTERN.findall(clean_text(message))]
    found = set()
    for normalized_brand, canonical in VEHICLE_BRAND_BY_NORMALIZED.items():
        width = len(normalized_brand.split())
        if any(tokens[index:index + width] == normalized_brand.split()
               for index in range(len(tokens) - width + 1)):
            found.add(canonical)
    return sorted(found)


def canonicalize_model_token(token: str) -> str:
    if token.islower() or token.isupper():
        return token[:1].upper() + token[1:].lower()
    return token


def extract_vehicle_entities(message: str) -> Dict[str, Optional[str]]:
    brand, _, brand_end, original_tokens = find_brand_token_span(message)
    if not brand:
        return {"brand": None, "model": None}

    suffix = " ".join(original_tokens[brand_end:])
    context = MODEL_CONTEXT_START.search(suffix)
    if context:
        suffix = suffix[:context.start()]
    model_tokens: List[str] = []
    for token in TOKEN_PATTERN.findall(suffix):
        normalized = normalize_for_match(token)
        if not normalized or normalized in MODEL_BOUNDARY_TOKENS or normalized in VEHICLE_CATEGORIES:
            break
        model_tokens.append(canonicalize_model_token(token))
        if len(model_tokens) >= 4:
            break
    return {
        "brand": brand,
        "model": " ".join(model_tokens) or None,
    }


def extract_query_entities(message: str, original_message: Optional[str] = None) -> Dict[str, Any]:
    entities: Dict[str, Any] = extract_vehicle_entities(message)
    normalized = normalize_for_match(message)
    for token in tokenize(normalized):
        category = VEHICLE_CATEGORIES.get(token)
        if category:
            entities["category"] = category
            break
    day_unit = bool(DAY_UNIT_PATTERN.search(normalized))
    hour_unit = bool(HOUR_UNIT_PATTERN.search(normalized))
    if day_unit != hour_unit:
        entities["rate_unit"] = "day" if day_unit else "hour"
    budget_match = BUDGET_PATTERN.search(clean_text(original_message or message))
    if budget_match:
        amount = budget_match.group(1).replace(",", "").replace(" ", "").lower()
        multiplier = 1000 if amount.endswith("k") else 1
        try:
            budget = float(amount.rstrip("k")) * multiplier
        except ValueError:
            budget = 0
        if 0 < budget <= 10_000_000:
            entities["max_budget"] = round(budget, 2)
            entities["currency"] = "PHP"
    transmission = re.search(r"\b(automatic|manual|matic)\b", normalized)
    if transmission:
        entities["transmission"] = "automatic" if transmission.group(1) in {"automatic", "matic"} else "manual"
    return entities


def extract_conditions(message: str) -> Dict[str, Any]:
    normalized = normalize_for_match(message)
    conditions: Dict[str, Any] = {}
    percent = re.search(r"\b(\d{1,3})\s*%", normalized)
    if percent and 0 < int(percent.group(1)) <= 100:
        conditions["downpayment_percent"] = int(percent.group(1))
    if re.search(r"\b(?:remaining|outstanding|unpaid)\s+balance\b|\bbalance\b|\bbalanse\b|\bnatitirang\s+bayad\b", normalized):
        conditions["remaining_balance"] = True
    if re.search(
        r"\b(?:after|past|beyond)\s+(?:the\s+)?(?:due\s+date|deadline)|"
        r"\b(?:pagkatapos\s+ng|lampas\s+sa)\s+(?:due\s+date|deadline)|"
        r"\b(?:pay|payment|balance|balanse|bayad)\b.*\boverdue\b",
        normalized,
    ):
        conditions["payment_after_due_date"] = True
    return conditions


def validated_pending_search(value: Any) -> Dict[str, Any]:
    if not isinstance(value, dict) or set(value) - {
        "brand", "model", "category", "max_budget", "currency", "transmission"
    }:
        return {}
    brand = value.get("brand")
    category = value.get("category")
    budget = value.get("max_budget")
    if brand not in VEHICLE_BRAND_BY_NORMALIZED.values() and brand is not None:
        return {}
    if category is not None and category not in set(VEHICLE_CATEGORIES.values()):
        return {}
    if not brand and not category:
        return {}
    if isinstance(budget, bool) or not isinstance(budget, (int, float)) or not 0 < budget <= 10_000_000:
        return {}
    if value.get("currency") != "PHP":
        return {}
    model = value.get("model")
    if model is not None and (not isinstance(model, str) or len(model) > 80):
        return {}
    transmission = value.get("transmission")
    if transmission is not None and transmission not in {"automatic", "manual"}:
        return {}
    return {key: item for key, item in value.items() if item is not None}


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
    fil_hits = [token for token in tokens if token in FILIPINO_TOKENS and token not in ENGLISH_TOKENS]
    en_hits = [token for token in tokens if token in ENGLISH_TOKENS and token not in FILIPINO_TOKENS]
    filipino_grammar = bool(FILIPINO_GRAMMAR_PATTERN.search(normalized))
    english_domain = bool(ENGLISH_DOMAIN_PATTERN.search(normalized))
    if (fil_hits or filipino_grammar) and (en_hits or english_domain):
        return "taglish"
    if fil_hits:
        return "fil"
    return "en"


def extract_style_directive(message: str) -> Tuple[Optional[str], str]:
    match = STYLE_DIRECTIVE_PATTERN.match(message)
    if not match:
        return None, message
    style = "en" if match.group("en") else "fil" if match.group("fil") else "taglish"
    return style, message[match.end():].strip()


def resolve_style(requested_language: Optional[str], text: str, previous_language: Optional[str] = None) -> str:
    requested = normalize_for_match(requested_language or "")
    if requested and requested != "auto":
        mapped = REQUESTED_LANGUAGE_TO_STYLE.get(requested)
        if mapped in SUPPORTED_STYLES:
            return mapped
    directive, _ = extract_style_directive(text)
    if directive:
        return directive
    normalized = normalize_for_match(text)
    tokens = tokenize(normalized)
    previous = REQUESTED_LANGUAGE_TO_STYLE.get(normalize_for_match(previous_language or ""))
    has_language_signal = any(token in FILIPINO_TOKENS or token in ENGLISH_TOKENS for token in tokens)
    if previous and len(tokens) <= 2 and (normalized in AMBIGUOUS_SHORT_FOLLOWUPS or not has_language_signal):
        return previous
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
    if intent_id == "chat_gender_identity" and FEMBOY_PATTERN.search(normalized_query):
        self_question = any(pattern.search(normalized_query) for pattern in SELF_GENDER_QUESTION_PATTERNS)
        return FEMBOY_REPLIES[style] if self_question else FEMBOY_DEFINITION_REPLIES[style]
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


def clarification_reply(candidates: List[Dict[str, Any]], style: str, query: str = "") -> str:
    if not re.search(
        r"\b(?:payment|pay|bayad|balanse|balance|deposit|rate|price|cost|magkano|"
        r"booking|reservation|vehicle|vehicles|car|cars|kotse|suv|van|motorcycle|"
        r"pickup|return|rent|rental)\b",
        query,
        re.IGNORECASE,
    ):
        return GENERIC_CLARIFICATIONS[style]
    for candidate in candidates:
        clarification = INTENTS_BY_ID[candidate["intent"]]["clarification"].get(style)
        if clarification:
            return clarification
    return GENERIC_CLARIFICATIONS[style]


def classify_message(
    message: str, requested_language: Optional[str] = "auto", previous_language: Optional[str] = None,
    previous_context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    clean_message = clean_text(message)
    style = resolve_style(requested_language, clean_message, previous_language)
    directive_style, question = extract_style_directive(clean_message)
    query_message = question if directive_style and question else clean_message
    normalized_message = normalize_for_match(query_message)
    informal_query = normalize_informal_text(query_message)
    normalized_query = (
        informal_query
        if find_controlled_alias_matches(informal_query)
        else normalize_unique_known_typos(informal_query)
    )
    used_controlled_normalization = normalized_query != normalized_message
    entities = extract_query_entities(normalized_query, query_message)
    pending = validated_pending_search(previous_context)
    context_followup = bool(pending and entities.get("rate_unit")
                            and len(tokenize(normalized_query)) <= 3
                            and not entities.get("brand") and not entities.get("category")
                            and "max_budget" not in entities)
    if context_followup:
        entities = {"brand": None, "model": None, **pending, "rate_unit": entities["rate_unit"]}
    conditions = extract_conditions(normalized_query)

    def with_details(result: Dict[str, Any], clarification_type: Optional[str] = None,
                     clarification_field: Optional[str] = None) -> Dict[str, Any]:
        return {
            **result,
            "language": style,
            "reply_lang": style,
            "entities": entities,
            "conditions": conditions,
            "clarification": {
                "required": bool(result.get("requires_clarification")),
                "type": clarification_type,
                "field": clarification_field,
            },
        }

    if directive_style and not question:
        reply = {
            "en": "I'll reply in English. What would you like to know about your rental?",
            "fil": "Sasagot ako sa Filipino. Ano ang gusto mong malaman tungkol sa rental mo?",
            "taglish": "I'll reply in Taglish. Ano ang gusto mong malaman sa rental mo?",
        }[style]
        return with_details({
            "intent": "chat_language_support", "intent_id": "chat_language_support",
            "confidence": 0.99, "score": 0.99, "reply": reply,
            "alternatives": [], "top_preds": [], "requires_clarification": False,
            "matched_alias": "", "reason_code": "language_preference",
            "requires_live_data": False, "live_source": "",
        })

    if not normalized_query:
        return with_details({
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
        }, "unknown_intent")

    brands = mentioned_brands(normalized_query)
    if len(brands) > 1:
        entities = {"brand": None, "model": None}
        names = " and ".join(brands)
        reply = {
            "en": f"Are you asking me to compare current {names} vehicle listings?",
            "fil": f"Gusto mo bang ihambing ang kasalukuyang {names} vehicle listings?",
            "taglish": f"Gusto mo bang i-compare ang current {names} vehicle listings?",
        }[style]
        return with_details({
            "intent": "REJECT", "intent_id": "REJECT", "confidence": 0.7, "score": 0.7,
            "reply": reply, "alternatives": [], "top_preds": [], "requires_clarification": True,
            "matched_alias": "", "reason_code": "multiple_brands",
            "requires_live_data": False, "live_source": "",
        }, "ambiguous_entity", "brand")

    suggested_brand = find_safe_brand_typo(normalized_query) if not entities["brand"] else None
    if suggested_brand:
        typo_candidates = [{
            "intent": "vehicle_brand_search",
            "score": 0.74,
            "matched_source": "brand_spelling_clarification",
        }]
        return with_details({
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
        }, "spelling_confirmation", "brand")

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
    self_gender_question = any(pattern.search(normalized_query) for pattern in SELF_GENDER_QUESTION_PATTERNS)
    personal_booking_intent = next(
        (intent_id for intent_id, patterns in PERSONAL_BOOKING_PATTERNS
         if any(pattern.search(normalized_query) for pattern in patterns)),
        None,
    )
    pickup_time = bool(PICKUP_TIME_PATTERN.search(normalized_query))
    vehicle_budget_search = "max_budget" in entities and bool(entities.get("brand") or entities.get("category"))
    if self_gender_question:
        candidates = prioritize_intent(candidates, "chat_gender_identity", "assistant_gender_question")
        decision_reason = "assistant_gender_question"
    elif personal_booking_intent:
        candidates = prioritize_intent(candidates, personal_booking_intent, "renter_booking_status_question")
        decision_reason = "renter_booking_status_question"
    elif pickup_time:
        candidates = prioritize_intent(candidates, "booking_pickup_time", "pickup_time_context")
        decision_reason = "pickup_time_context"
    elif vehicle_budget_search or context_followup:
        candidates = prioritize_intent(candidates, "available_vehicles", "vehicle_budget_context")
        decision_reason = "vehicle_budget_context"
    elif entities["brand"]:
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
        return with_details({
            "intent": "REJECT",
            "intent_id": "REJECT",
            "confidence": round(top_score, 6),
            "score": round(top_score, 6),
            "language": style,
            "reply_lang": style,
            "reply": clarification_reply(candidates, style, normalized_query),
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
        }, "ambiguous_intent" if ambiguous or exact_ambiguous else "unknown_intent")

    selected_intent = candidates[0]["intent"]
    selected_item = INTENTS_BY_ID[selected_intent]
    missing_rate_unit = selected_intent == "available_vehicles" and "max_budget" in entities and "rate_unit" not in entities
    missing_booking = selected_intent == "booking_pickup_time"
    if missing_rate_unit:
        currency_amount = f"PHP {entities['max_budget']:,.0f}"
        reply = {
            "en": f"Is your {currency_amount} budget per day or per hour?",
            "fil": f"Ang {currency_amount} budget mo ba ay bawat araw o bawat oras?",
            "taglish": f"Yung {currency_amount} budget mo ba ay per day or per hour?",
        }[style]
    elif missing_booking:
        reply = {
            "en": "Pickup time is set for each booking. Which booking or vehicle are you asking about? Check your booking details for the scheduled time.",
            "fil": "Nakatakda ang oras ng pagkuha sa bawat booking. Aling booking o sasakyan ang tinutukoy mo? Tingnan ang detalye ng booking para sa oras nito.",
            "taglish": "Pickup time depends on your booking. Aling booking or vehicle ang tinutukoy mo? Check your booking details for the scheduled time.",
        }[style]
    else:
        reply = select_response(selected_intent, style, normalized_query)
    return with_details({
        "intent": selected_intent,
        "intent_id": selected_intent,
        "confidence": round(top_score, 6),
        "score": round(top_score, 6),
        "language": style,
        "reply_lang": style,
        "reply": reply,
        "alternatives": build_alternatives(candidates, exclude_intent=selected_intent),
        "top_preds": [
            {"intent_id": candidate["intent"], "id": candidate["intent"], "score": round(float(candidate["score"]), 6)}
            for candidate in candidates
        ],
        "requires_clarification": missing_rate_unit or missing_booking,
        "matched_alias": candidates[0].get("matched_alias", "") or (clean_message if exact_reason == "exact_alias" else ""),
        "reason_code": "missing_rate_unit" if missing_rate_unit else "missing_booking" if missing_booking else decision_reason or exact_reason or candidates[0].get("matched_source", "semantic_match"),
        "requires_live_data": selected_item["requires_live_data"] and not (missing_rate_unit or missing_booking),
        "live_source": selected_item["live_source"],
        "entities": entities,
    }, "missing_entity" if missing_rate_unit or missing_booking else None,
        "rate_unit" if missing_rate_unit else "booking" if missing_booking else None)


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
    return classify_message(req.message, req.language, req.previous_language, req.previous_context)
