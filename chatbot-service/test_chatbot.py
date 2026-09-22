import json
import unittest
from pathlib import Path

from app import CONFIG, INTENTS_BY_ID, classify_message, normalize_for_match, normalize_informal_text


BASE_DIR = Path(__file__).parent


class ChatbotDatasetTests(unittest.TestCase):
    def test_dataset_examples_are_unique_and_responses_are_arrays(self):
        dataset = json.loads(
            (BASE_DIR / "rentifypro_chatbot_dataset_v6.json").read_text(encoding="utf-8")
        )
        owners = {}
        for item in dataset["items"]:
            for example in item["examples"]:
                normalized = normalize_for_match(example)
                self.assertNotIn(normalized, owners, f"duplicate example in {item['id']}")
                owners[normalized] = item["id"]
            for style in ("en", "fil", "taglish"):
                self.assertIsInstance(item["responses"][style], list)
                self.assertTrue(item["responses"][style])

    def test_all_configured_intents_loaded(self):
        self.assertIn("booking_limits", INTENTS_BY_ID)
        self.assertIn("schedule_conflict", INTENTS_BY_ID)
        self.assertIn("late_return_policy", INTENTS_BY_ID)
        self.assertIn("unpaid_balance", INTENTS_BY_ID)
        self.assertIn("vehicle_brand_search", INTENTS_BY_ID)
        self.assertIn("chat_language_support", INTENTS_BY_ID)
        self.assertEqual(CONFIG["vehicle_brands"][0], "Toyota")
        self.assertNotIn("chat_capabilities", INTENTS_BY_ID)
        self.assertNotIn("online_payment", INTENTS_BY_ID)


class ChatbotClassifierTests(unittest.TestCase):
    def assert_intent(self, message, expected):
        result = classify_message(message, "auto")
        self.assertFalse(result["requires_clarification"], result)
        self.assertEqual(result["intent"], expected, result)
        self.assertGreaterEqual(result["confidence"], CONFIG["confidence_threshold"])

    def test_critical_intent_routes(self):
        cases = {
            "how do I cancel my booking": "booking_cancellation",
            "paano magbayad gamit GCash": "payment_methods",
            "30% lang muna pwede?": "payment_downpayment",
            "how can I pay my 30% using gcash": "payment_downpayment",
            "magkano late fee": "late_return_policy",
            "magkano rent per day": "rental_rate",
            "how many bookings can I have": "booking_limits",
            "can my two bookings overlap": "schedule_conflict",
            "help": "help_request",
            "bye": "chat_goodbye",
            "huh": "unclear_message",
            "hello hello hello": "chat_greeting",
        }
        for message, expected in cases.items():
            with self.subTest(message=message):
                self.assert_intent(message, expected)

    def test_ambiguous_payment_requests_clarification(self):
        result = classify_message("payment", "auto")
        self.assertEqual(result["intent"], "REJECT")
        self.assertTrue(result["requires_clarification"])
        self.assertGreaterEqual(len(result["alternatives"]), 2)
        self.assertIn("30%", result["reply"])

    def test_classifier_returns_valid_structured_metadata(self):
        result = classify_message("lat retrn fee", "auto")
        self.assertEqual(result["intent"], "late_return_policy")
        self.assertIn(result["language"], {"en", "fil", "taglish"})
        self.assertIsInstance(result["alternatives"], list)
        self.assertIsInstance(result["requires_live_data"], bool)
        self.assertEqual(result["reason_code"], "controlled_alias")

    def test_controlled_textese_normalization_routes_incomplete_english_and_filipino(self):
        cases = {
            "r u an ai?": ("chat_identity", "en", {"brand": None, "model": None}),
            "anu mga pwdng renthan?": ("vehicle_categories", "fil", {"brand": None, "model": None}),
            "is thre a ford rptor availble?": (
                "vehicle_brand_search",
                "en",
                {"brand": "Ford", "model": "Raptor"},
            ),
            "kya m ba mgslita ng tgalog?": (
                "chat_language_support",
                "fil",
                {"brand": None, "model": None},
            ),
            "what paymnt methods do you accept?": (
                "payment_methods",
                "en",
                {"brand": None, "model": None},
            ),
            "is insurane included?": (
                "insurance_included",
                "en",
                {"brand": None, "model": None},
            ),
        }
        for message, (intent, language, entities) in cases.items():
            with self.subTest(message=message):
                result = classify_message(message, "auto")
                self.assertFalse(result["requires_clarification"], result)
                self.assertEqual(result["intent"], intent, result)
                self.assertEqual(result["language"], language, result)
                self.assertEqual(result["entities"], entities, result)

        self.assertEqual(
            normalize_informal_text("Can I pay 30% on 2026-09-30?"),
            "can i pay 30% on 2026-09-30",
        )
        categories = classify_message("anu mga pwdng renthan?", "auto")
        self.assertIn("mga kotse", categories["reply"])

    def test_vehicle_brand_and_model_entities(self):
        cases = {
            "Toyota": ("vehicle_brand_search", "Toyota", None),
            "toyota": ("vehicle_brand_search", "Toyota", None),
            "may Honda ba?": ("vehicle_brand_search", "Honda", None),
            "Toyota Vios": ("vehicle_brand_search", "Toyota", "Vios"),
            "Honda Click": ("vehicle_brand_search", "Honda", "Click"),
            "may available bang Toyota bukas?": ("vehicle_brand_search", "Toyota", None),
            "how much is the Toyota Vios?": ("rental_rate", "Toyota", "Vios"),
        }
        for message, (intent, brand, model) in cases.items():
            with self.subTest(message=message):
                result = classify_message(message, "auto")
                self.assertEqual(result["intent"], intent, result)
                self.assertEqual(result["entities"], {"brand": brand, "model": model})

    def test_tagalog_brand_questions_keep_filipino_language_without_inventing_models(self):
        cases = {
            "may Toyota ba?": "Toyota",
            "Ford meron?": "Ford",
            "Ford mayroon?": "Ford",
            "meron bang Nissan?": "Nissan",
        }
        for message, brand in cases.items():
            with self.subTest(message=message):
                result = classify_message(message, "auto")
                self.assertEqual(result["intent"], "vehicle_brand_search", result)
                self.assertEqual(result["language"], "fil", result)
                self.assertEqual(result["entities"], {"brand": brand, "model": None})

    def test_brand_confusions_and_safe_typo_handling(self):
        category = classify_message("do you have SUVs?", "auto")
        self.assertNotEqual(category["intent"], "vehicle_brand_search")
        self.assertEqual(category["entities"], {"brand": None, "model": None})

        nonsense = classify_message("asdfgh", "auto")
        self.assertEqual(nonsense["intent"], "nonsense_message")

        typo = classify_message("toyotaa", "auto")
        self.assertEqual(typo["intent"], "REJECT")
        self.assertTrue(typo["requires_clarification"])
        self.assertEqual(typo["reason_code"], "brand_spelling_clarification")
        self.assertIn("Toyota", typo["reply"])

        unknown_brand = classify_message("Do you have ABC Motors?", "auto")
        self.assertEqual(unknown_brand["intent"], "REJECT")
        self.assertTrue(unknown_brand["requires_clarification"])
        self.assertEqual(unknown_brand["entities"], {"brand": None, "model": None})

    def test_every_intent_is_reachable_through_a_declared_example(self):
        for item in INTENTS_BY_ID.values():
            with self.subTest(intent=item["id"]):
                result = classify_message(item["examples"][0], "auto")
                self.assertEqual(result["intent"], item["id"])
                self.assertFalse(result["requires_clarification"])


if __name__ == "__main__":
    unittest.main()
