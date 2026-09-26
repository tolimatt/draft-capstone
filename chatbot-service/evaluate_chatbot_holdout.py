"""Evaluate held-out classifier results and Node fulfillment with a fixed vehicle snapshot."""

import argparse
import json
import subprocess
from collections import Counter
from pathlib import Path

from app import classify_message


BASE_DIR = Path(__file__).parent
CASES_PATH = BASE_DIR / "chatbot_holdout.json"
FULFILL_PATH = BASE_DIR.parent / "backend" / "scripts" / "chatbot-holdout-fulfill.mjs"


def compare_fields(actual, expected, prefix, failures, category):
    for key, value in expected.items():
        observed = actual.get(key) if isinstance(actual, dict) else None
        if observed != value:
            failures.append({"category": category, "field": f"{prefix}.{key}", "expected": value, "actual": observed})


def evaluate():
    document = json.loads(CASES_PATH.read_text(encoding="utf-8"))
    if document.get("schema_version") != "v1" or not document.get("cases"):
        raise RuntimeError("Invalid chatbot holdout set")
    cases = document["cases"]
    classified = [
        classify_message(case["input"], "auto", case.get("previous_language"), case.get("previous_context"))
        for case in cases
    ]
    repeated = [
        classify_message(case["input"], "auto", case.get("previous_language"), case.get("previous_context"))
        for case in cases
    ]
    requests = [{"message": case["input"], "classifier": result} for case, result in zip(cases, classified)]
    process = subprocess.run(
        ["node", str(FULFILL_PATH)], input=json.dumps(requests + requests, ensure_ascii=False),
        capture_output=True, text=True, encoding="utf-8", timeout=30, check=True,
    )
    fulfilled = json.loads(process.stdout)
    if len(fulfilled) != len(cases) * 2:
        raise RuntimeError("Node fulfillment returned the wrong number of cases")

    failures = []
    passed = 0
    for index, (case, classifier, again, final) in enumerate(zip(cases, classified, repeated, fulfilled)):
        issues = []
        if classifier != again or final != fulfilled[index + len(cases)]:
            issues.append({"category": "nondeterministic", "field": "result"})
        if classifier["intent"] != case["intent"] or final["intent"] != case["intent"]:
            issues.append({"category": "wrong_intent", "field": "intent", "actual": classifier["intent"]})
        if classifier["language"] != case["language"] or final["language"] != case["language"]:
            issues.append({"category": "wrong_language", "field": "language", "actual": classifier["language"]})
        compare_fields(classifier.get("entities"), case.get("entities", {}), "entities", issues, "bad_entity")
        compare_fields(classifier.get("conditions"), case.get("conditions", {}), "conditions", issues, "missing_condition")
        compare_fields(final.get("clarification"), case.get("clarification", {}), "clarification", issues, "irrelevant_clarification")
        ids = [vehicle["id"] for vehicle in final["recommendations"]]
        if ids != case.get("recommendations", []):
            issues.append({"category": "incorrect_live_lookup", "field": "recommendations", "expected": case.get("recommendations", []), "actual": ids})
        if "display_rate" in case and (not final["recommendations"] or final["recommendations"][0]["displayRate"] != case["display_rate"]):
            issues.append({"category": "wrong_rate_unit", "field": "display_rate"})
        if "display_rate_unit" in case and (not final["recommendations"] or final["recommendations"][0]["displayRateUnit"] != case["display_rate_unit"]):
            issues.append({"category": "wrong_rate_unit", "field": "display_rate_unit"})
        reply = final["reply"].casefold()
        for phrase in case.get("reply_contains", []):
            if phrase.casefold() not in reply:
                issues.append({"category": "incomplete_or_irrelevant_reply", "field": "reply_contains", "missing": phrase})
        for phrase in case.get("reply_excludes", []):
            if phrase.casefold() in reply:
                issues.append({"category": "hallucinated_or_irrelevant_reply", "field": "reply_excludes", "unexpected": phrase})
        if issues:
            failures.append({"case": case["id"], "input": case["input"], "issues": issues})
        else:
            passed += 1
    categories = Counter(issue["category"] for failure in failures for issue in failure["issues"])
    return {"total": len(cases), "passed": passed, "failed": len(failures),
            "failure_categories": dict(categories), "failures": failures}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    result = evaluate()
    if args.json:
        print(json.dumps(result, ensure_ascii=True, indent=2))
    else:
        print(f"Chatbot holdout: {result['passed']}/{result['total']} passed")
        for failure in result["failures"]:
            print(f"- {failure['case']}: {failure['issues']}")
    raise SystemExit(0 if result["failed"] == 0 else 1)
