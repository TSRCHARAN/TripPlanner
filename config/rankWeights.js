/**
 * 🎚️ Rank Weights Configuration
 * You can easily tweak the influence of each preference dimension.
 * Values should sum roughly to 1.0 for balanced scoring.
 */

export const RANK_WEIGHTS = {
  budget: 0.3,         // 💰 How strongly budget impacts ranking
  time: 0.25,          // ⏰ Importance of departure timing
  comfort: 0.25,       // 🛋️ Influence of seat/class quality
  convenience: 0.2,    // ⚙️ Preference for direct vs via-hub
};

/**
 * ✈️ Mode-specific multipliers (used for "comfort" vs "adventure" travelers)
 * Example: trains get a higher comfort factor, buses get more flexibility
 */
export const MODE_MULTIPLIERS = {
  train: { comfort: 1.1, costEfficiency: 0.9 },
  bus: { comfort: 0.8, costEfficiency: 1.2 },
  flight: { comfort: 1.3, costEfficiency: 0.7 },
};

/**
 * 🕒 Time slot boundaries (in minutes since midnight)
 */
export const TIME_SLOTS = {
  morning: [360, 720],      // 6 AM – 12 PM
  afternoon: [720, 1080],   // 12 PM – 6 PM
  evening: [1080, 1440],    // 6 PM – 12 AM
  night: [0, 360],          // 12 AM – 6 AM
};

/**
 * 🧭 Seat class hierarchy for comfort ranking
 * The higher the value, the more comfortable it’s considered.
 */
export const SEAT_COMFORT_LEVEL = {
  "1A": 1.0,
  "2A": 0.9,
  "3A": 0.8,
  "EC": 0.85,
  "CC": 0.75,
  "SL": 0.6,
  "2S": 0.5,
  "NONAC": 0.5,
  "AC": 0.8,
};
