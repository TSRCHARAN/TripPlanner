import assert from "node:assert/strict";
import { generateTripSummary } from "../services/tripPlannerService.js";

function runTests() {
  // Test 1: basic train trip with attractions and via hub overnight
  const best = {
    mode: "train",
    departureTime: "08:00",
    arrivalTime: "18:30",
    viaHub: true,
    hubs: { from: { name: "Source Jn" }, to: { name: "Hub City" } },
  };

  const prefs = {
    fromLocation: "City A",
    toLocation: "City B",
    startDate: "2025-11-10",
    returnDate: "2025-11-15",
    preferredReturnTime: "morning",
  };

  const hubPlan = { hubName: "Hub City", overnightRequired: true };
  const destinationPlan = { attractions: [{ name: "Museum" }, { name: "Park" }], reasoning: [] };

  const summary = generateTripSummary({ best, prefs, hubPlan, destinationPlan });

  assert.ok(summary.includes("Start from City A"), "Should mention start location");
  assert.ok(summary.includes("Hub City"), "Should mention hub name");
  assert.ok(summary.includes("Museum"), "Should mention attractions");

  // Test 2: no best -> friendly message
  const empty = generateTripSummary({ best: null, prefs: {} });
  assert.strictEqual(empty, "No transport found for trip summary.");

  console.log("All tests passed for generateTripSummary");
}

runTests();
