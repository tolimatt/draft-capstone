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
        self.assertIn("my_active_bookings", INTENTS_BY_ID)
        self.assertIn("my_overdue_return", INTENTS_BY_ID)
        self.assertIn("my_unpaid_balance", INTENTS_BY_ID)
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

    def test_renter_account_status_questions_keep_private_intents_separate_from_policy(self):
        cases = {
            "do I have an active booking?": ("my_active_bookings", "en"),
            "may active booking ba ako?": ("my_active_bookings", "taglish"),
            "may kasalukuyang renta ba ako?": ("my_active_bookings", "fil"),
            "am I overdue for return?": ("my_overdue_return", "en"),
            "are any of my rentals overdue?": ("my_overdue_return", "en"),
            "late na ba ang return ko?": ("my_overdue_return", "taglish"),
            "may late return ba ako?": ("my_overdue_return", "taglish"),
            "nahuli na ba ako sa balik?": ("my_overdue_return", "fil"),
            "do I have an unpaid balance?": ("my_unpaid_balance", "en"),
            "do I have an overdue payment?": ("my_unpaid_balance", "en"),
            "do I still owe anything?": ("my_unpaid_balance", "en"),
            "may unpaid balance ba ako?": ("my_unpaid_balance", "taglish"),
            "may utang pa ba ako?": ("my_unpaid_balance", "fil"),
            "what is my booking status?": ("booking_status", "en"),
            "may pending booking ba ako?": ("booking_status", "taglish"),
        }
        for message, (intent, language) in cases.items():
            with self.subTest(message=message):
                result = classify_message(message, "auto")
                self.assertEqual(result["intent"], intent, result)
                self.assertEqual(result["language"], language, result)
                self.assertFalse(result["requires_clarification"], result)

        for message, intent in {
            "how many active bookings can I have?": "booking_limits",
            "can I book with an unpaid balance?": "unpaid_balance",
            "may balance pa ako pwede pa ba mag book?": "unpaid_balance",
            "what is the late return fee?": "late_return_policy",
        }.items():
            with self.subTest(message=message):
                self.assertEqual(classify_message(message, "auto")["intent"], intent)

    def test_assistant_gender_questions_answer_the_question_in_each_style(self):
        cases = {
            "are you a girl?": ("en", "gender or sexual orientation"),
            "are you a boy?": ("en", "gender or sexual orientation"),
            "are you a woman?": ("en", "gender or sexual orientation"),
            "are you a gay?": ("en", "gender or sexual orientation"),
            "are you lesbian?": ("en", "gender or sexual orientation"),
            "are you bisexual?": ("en", "gender or sexual orientation"),
            "babae ka ba?": ("fil", "wala akong kasarian"),
            "lalaki ka ba?": ("fil", "wala akong kasarian"),
            "bakla ka ba?": ("fil", "wala akong kasarian"),
            "bading ka ba?": ("fil", "wala akong kasarian"),
            "bading ka?": ("fil", "wala akong kasarian"),
            "beki ka ba?": ("fil", "wala akong kasarian"),
            "tibo ka ba?": ("fil", "wala akong kasarian"),
            "lesbiyana ka ba?": ("fil", "wala akong kasarian"),
            "silahis ka ba?": ("fil", "wala akong kasarian"),
            "tomboy ka ba?": ("fil", "wala akong kasarian"),
            "bading ba si Rentify AI?": ("fil", "wala akong kasarian"),
            "ikaw ba ay bading?": ("fil", "wala akong kasarian"),
            "girl ka ba?": ("taglish", "wala akong gender"),
            "gay ka ba?": ("taglish", "wala akong gender"),
            "lesbian ka ba?": ("taglish", "wala akong gender"),
            "are you bading?": ("taglish", "wala akong gender"),
            "reply in Filipino: are you a girl?": ("fil", "wala akong kasarian"),
        }
        for message, (language, reply_text) in cases.items():
            with self.subTest(message=message):
                result = classify_message(message, "auto")
                self.assertEqual(result["intent"], "chat_gender_identity", result)
                self.assertEqual(result["language"], language, result)
                self.assertIn(reply_text, result["reply"], result)
                self.assertFalse(result["requires_clarification"], result)

        self.assertEqual(classify_message("who are you?")["intent"], "chat_identity")
        self.assertNotEqual(classify_message("can a gay renter book a car?")["intent"], "chat_gender_identity")
        self.assertNotEqual(classify_message("do you have a female driver?")["intent"], "chat_gender_identity")
        self.assertNotEqual(classify_message("bading ba si owner?")["intent"], "chat_gender_identity")
        self.assertNotEqual(classify_message("tomboy ba ang driver?")["intent"], "chat_gender_identity")

    def test_femboy_questions_explain_gender_expression_in_each_style(self):
        cases = {
            "are you a femboy?": ("en", "gender expression"),
            "femboy ka ba?": ("fil", "pagpapahayag ng kasarian"),
            "reply in Taglish: femboy ka ba?": ("taglish", "gender expression"),
            "are you a fem-boy?": ("en", "gender expression"),
        }
        for message, (language, reply_text) in cases.items():
            with self.subTest(message=message):
                result = classify_message(message, "auto")
                self.assertEqual(result["intent"], "chat_gender_identity", result)
                self.assertEqual(result["language"], language, result)
                self.assertIn(reply_text, result["reply"], result)
                self.assertIn("oryentasyon" if language == "fil" else "orientation", result["reply"])
                self.assertFalse(result["requires_clarification"], result)

        for message, language in (
            ("what does femboy mean?", "en"),
            ("ano ang ibig sabihin ng femboy?", "fil"),
            ("femboy sexual orientation", "en"),
        ):
            with self.subTest(message=message):
                result = classify_message(message, "auto")
                self.assertEqual(result["intent"], "chat_gender_identity", result)
                self.assertEqual(result["language"], language, result)
                self.assertNotIn("I'm an AI assistant", result["reply"])
                self.assertNotIn("AI assistant ako", result["reply"])

        self.assertNotEqual(classify_message("can a femboy rent a car?")["intent"], "chat_gender_identity")
        self.assertNotEqual(classify_message("femboy ba ang driver?")["intent"], "chat_gender_identity")

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
        self.assertEqual(category["entities"]["brand"], None)
        self.assertEqual(category["entities"]["model"], None)
        self.assertEqual(category["entities"]["category"], "suv")

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
                if item["id"] == "booking_pickup_time":
                    self.assertEqual(result["clarification"]["field"], "booking")
                else:
                    self.assertFalse(result["requires_clarification"])

    def test_vehicle_conditions_and_model_boundaries(self):
        cases = [
            ("How much is a Toyota Vios per day?", "rental_rate", "en", "Vios", "day"),
            ("Magkano ang Toyota Vios bawat araw?", "rental_rate", "fil", "Vios", "day"),
            ("Magkano yung Toyota Vios per day?", "rental_rate", "taglish", "Vios", "day"),
            ("Toyota Vios tomorrow", "vehicle_brand_search", "en", "Vios", None),
            ("Toyota Vios available today", "vehicle_brand_search", "en", "Vios", None),
            ("Toyota Vios automatic", "vehicle_brand_search", "en", "Vios", None),
            ("Toyota Vios under ₱2,000", "available_vehicles", "en", "Vios", None),
            ("Toyota Vios for 3 days", "vehicle_brand_search", "en", "Vios", None),
        ]
        for message, intent, language, model, unit in cases:
            with self.subTest(message=message):
                result = classify_message(message)
                self.assertEqual(result["intent"], intent, result)
                self.assertEqual(result["language"], language, result)
                self.assertEqual(result["entities"]["brand"], "Toyota", result)
                self.assertEqual(result["entities"]["model"], model, result)
                self.assertEqual(result["entities"].get("rate_unit"), unit, result)

    def test_budget_search_and_missing_unit_clarification(self):
        cases = [
            ("Are there SUVs under ₱2,000?", "en", 2000, None),
            ("May SUV ba under ₱2,000 per day?", "taglish", 2000, "day"),
            ("May SUV bang mas mababa sa ₱2,000 bawat araw?", "fil", 2000, "day"),
            ("show me vans below ₱3,000 daily", "en", 3000, "day"),
            ("van below 500 per hour", "en", 500, "hour"),
            ("may SUV under 2k per day?", "taglish", 2000, "day"),
        ]
        for message, language, budget, unit in cases:
            with self.subTest(message=message):
                result = classify_message(message)
                self.assertEqual(result["intent"], "available_vehicles", result)
                self.assertEqual(result["language"], language, result)
                self.assertEqual(result["entities"]["max_budget"], budget, result)
                self.assertEqual(result["entities"]["currency"], "PHP", result)
                self.assertEqual(result["entities"].get("rate_unit"), unit, result)
                if unit is None:
                    self.assertEqual(result["clarification"], {"required": True, "type": "missing_entity", "field": "rate_unit"})
                    self.assertIn("2,000", result["reply"])

    def test_compound_payment_pickup_and_reply_style(self):
        payment = classify_message("Can I pay 30% now and the balance after the due date?")
        self.assertEqual(payment["intent"], "payment_downpayment")
        self.assertEqual(payment["conditions"], {
            "downpayment_percent": 30, "remaining_balance": True, "payment_after_due_date": True,
        })
        taglish_payment = classify_message("Pwede bang 30% muna tapos balanse pagkatapos ng due date?")
        self.assertEqual(taglish_payment["intent"], "payment_downpayment")
        self.assertEqual(taglish_payment["language"], "taglish")
        self.assertEqual(taglish_payment["conditions"], payment["conditions"])
        balance = classify_message("Can I pay the remaining balance after the deadline?")
        self.assertEqual(balance["intent"], "unpaid_balance")
        self.assertEqual(balance["conditions"], {
            "remaining_balance": True, "payment_after_due_date": True,
        })
        for message, language in [
            ("What time can I pick up the car?", "en"),
            ("Anong oras ko kukunin yung car?", "taglish"),
            ("Anong oras ko maaaring kunin ang sasakyan?", "fil"),
        ]:
            with self.subTest(message=message):
                result = classify_message(message)
                self.assertEqual(result["intent"], "booking_pickup_time")
                self.assertEqual(result["language"], language)
                self.assertEqual(result["clarification"]["field"], "booking")
        directed = classify_message("Reply in Filipino: how much is the Toyota Vios?")
        self.assertEqual((directed["intent"], directed["language"]), ("rental_rate", "fil"))
        self.assertEqual(classify_message("oo", previous_language="taglish")["language"], "taglish")
        self.assertEqual(classify_message("salamat", previous_language="en")["language"], "fil")
        self.assertEqual(classify_message("thanks", previous_language="fil")["language"], "en")
        self.assertEqual(classify_message("Answer in English.", previous_language="taglish")["language"], "en")
        followup = classify_message("per day", previous_language="taglish", previous_context={
            "category": "suv", "max_budget": 2000, "currency": "PHP",
        })
        self.assertEqual(followup["intent"], "available_vehicles")
        self.assertEqual(followup["language"], "taglish")
        self.assertEqual(followup["entities"]["rate_unit"], "day")


if __name__ == "__main__":
    unittest.main()
