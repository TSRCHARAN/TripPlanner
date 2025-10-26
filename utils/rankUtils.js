import {
  RANK_WEIGHTS,
  MODE_MULTIPLIERS,
  TIME_SLOTS,
  SEAT_COMFORT_LEVEL,
} from "../config/rankWeights.js";

/**
 * 🎯 Compute transport option score
 * Dynamically balances cost, comfort, timing, and convenience
 * for both onward and return legs.
 */
export function computeScore(option, prefs = {}) {
  let score = 0;

  // --- 💰 Budget Fit ---
  const maxBudget = prefs.budget || 2000;
  const price = parseFloat(option.fare || option.price || 0);
  const budgetScore = 1 - Math.min(price / maxBudget, 1);
  score += budgetScore * RANK_WEIGHTS.budget;

  // --- 🕒 Timing Fit (different for onward vs return) ---
  const depTime = option.departureTime ? toMinutes(option.departureTime) : null;
  const arrTime = option.arrivalTime ? toMinutes(option.arrivalTime) : null;

  let timeScore = 0.5;
  if (prefs.isReturn) {
    // Return leg → focus on ARRIVAL time
    timeScore = arrTime
      ? matchPreferredTimeSlot(arrTime, prefs.preferredReturnTime)
      : 0.5;
  } else {
    // Onward leg → focus on DEPARTURE time
    timeScore = depTime
      ? matchPreferredTimeSlot(depTime, prefs.preferredStartTime)
      : 0.5;
  }
  score += timeScore * RANK_WEIGHTS.time;

  // --- 🛋️ Comfort Level ---
  const seat = option.avlClasses?.[0] || option.seatType || "";
  const comfortScore = SEAT_COMFORT_LEVEL[seat] || 0.5;
  score += comfortScore * RANK_WEIGHTS.comfort;

  // --- ⚙️ Convenience (direct > via hub) ---
  const convenienceScore = option.viaHub ? 0.6 : 1.0;
  score += convenienceScore * RANK_WEIGHTS.convenience;

  // --- ✈️ Apply mode multipliers (train/bus/flight) ---
  if (MODE_MULTIPLIERS[option.mode]) {
    const mult = MODE_MULTIPLIERS[option.mode];
    score *= (mult.comfort + mult.costEfficiency) / 2;
  }

  return parseFloat(score.toFixed(3));
}

/**
 * 🧭 Match user preferred time slot (0–1)
 */
function matchPreferredTimeSlot(depMinutes, prefSlot) {
  if (!prefSlot || !TIME_SLOTS[prefSlot]) return 0.5;
  const [start, end] = TIME_SLOTS[prefSlot];
  if (depMinutes >= start && depMinutes <= end) return 1.0;
  const buffer = 120;
  if (depMinutes >= start - buffer && depMinutes <= end + buffer) return 0.7;
  return 0.4;
}

/**
 * ⏱️ Convert HH:MM → minutes since midnight
 */
function toMinutes(timeStr) {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * 💬 Explain reasoning behind choice
 */
export function explainChoice(mode, bestOption, prefs) {
  const reasons = [];

  if (mode === "train")
    reasons.push("Train chosen for reliability and comfort.");
  if (mode === "bus")
    reasons.push("Bus chosen for cost-effectiveness and schedule alignment.");
  if (mode === "flight")
    reasons.push("Flight chosen for speed and convenience.");

  if (prefs.isReturn)
    reasons.push(
      `Arrival aligns with preferred return time (${prefs.preferredReturnTime || "evening"}).`
    );
  else
    reasons.push(
      `Departure aligns with preferred start time (${prefs.preferredStartTime || "morning"}).`
    );

  if (bestOption.fare && prefs.budget)
    reasons.push(`Fare ₹${bestOption.fare} fits your budget ₹${prefs.budget}.`);

  if (bestOption.avlClasses)
    reasons.push(`Comfortable seats: ${bestOption.avlClasses.join(", ")}.`);

  if (bestOption.viaHub)
    reasons.push(
      `Routed via ${bestOption.hubs?.to?.name || bestOption.hubs?.from?.name}.`
    );

  return reasons.join(" ");
}
