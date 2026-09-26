import { readFileSync } from "node:fs";
import { applyChatbotGuardrails, buildChatbotPayload } from "../utils/chatbotPayload.js";

// Fixed renter-visible snapshot. The unavailable record exercises visibility filtering.
const vehicles = [
  { _id: "vios", name: "Toyota Vios", dailyRentalRate: 2400, pricingUnit: "daily", availabilityStatus: "available", specs: { type: "sedan", seats: 5, transmission: "Automatic" } },
  { _id: "everest", name: "Ford Everest", dailyRentalRate: 1800, pricingUnit: "daily", availabilityStatus: "available", specs: { type: "suv", seats: 7, transmission: "Automatic" } },
  { _id: "fortuner", name: "Toyota Fortuner", dailyRentalRate: 2500, pricingUnit: "daily", availabilityStatus: "available", specs: { type: "suv", seats: 7, transmission: "Automatic" } },
  { _id: "raptor", name: "Ford Ranger Raptor", dailyRentalRate: 3200, pricingUnit: "daily", availabilityStatus: "available", specs: { type: "pickup", seats: 5, transmission: "Automatic" } },
  { _id: "city", name: "Honda City", dailyRentalRate: 1400, pricingUnit: "daily", availabilityStatus: "available", specs: { type: "sedan", seats: 5, transmission: "Automatic" } },
  { _id: "van", name: "Toyota Hiace", dailyRentalRate: 400, pricingUnit: "hourly", availabilityStatus: "available", specs: { type: "van", seats: 12, transmission: "Manual" } },
  { _id: "hidden", name: "Honda SUV", dailyRentalRate: 1000, pricingUnit: "daily", availabilityStatus: "unavailable", specs: { type: "suv", seats: 7, transmission: "Automatic" } },
];

const requests = JSON.parse(readFileSync(0, "utf8"));
const responses = requests.map(({ message, classifier }) => {
  const payload = buildChatbotPayload(message, "auto", vehicles, classifier.entities);
  const response = applyChatbotGuardrails(classifier, payload);
  return {
    intent: response.intent,
    language: response.language,
    entities: response.entities,
    conditions: response.conditions,
    clarification: response.clarification,
    reply: response.reply,
    recommendations: response.recommendations.map(({ _id, displayRate, displayRateUnit }) => ({
      id: _id, displayRate, displayRateUnit,
    })),
  };
});
process.stdout.write(JSON.stringify(responses));
