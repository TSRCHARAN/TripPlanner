import axios from "axios";
import { mapBudgetToRange } from "../utils/budgetUtils.js";

const GOOGLE_KEY = process.env.GOOGLE_API_KEY;

/** get nearby places by type with budget mapping (for hotels/restaurants) */
async function getNearbyByType(lat, lon, type, preferences = {}) {
  const budget = mapBudgetToRange(preferences.budget_category || "mid");
  const minp = budget.priceLevel[0], maxp = budget.priceLevel[1];
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=4000&type=${type}&minprice=${minp}&maxprice=${maxp}&key=${GOOGLE_KEY}`;
  const { data } = await axios.get(url);
  return (data.results || []).slice(0, 10).map(p => ({
    name: p.name,
    address: p.vicinity || p.formatted_address,
    rating: p.rating,
    user_ratings_total: p.user_ratings_total,
    location: p.geometry?.location,
    place_id: p.place_id,
    maps_url: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`
  }));
}

export async function planLocationActivities(location, preferences = {}) {
  const coords = location?.lat ? { lat: location.lat, lon: location.lon } : (location?.location || location);
  if (!coords || !coords.lat) return { attractions: [], hotels: [], food: [] };
  const lat = coords.lat, lon = coords.lon;
  const [attractions, hotels, food] = await Promise.all([
    getNearbyByType(lat, lon, "tourist_attraction", preferences),
    getNearbyByType(lat, lon, "lodging", preferences),
    getNearbyByType(lat, lon, "restaurant", preferences)
  ]);
  return { attractions, hotels, food };
}

/**
 * 🌙 Checks if arrival time falls between 9 PM – 6 AM
 */
function isLateNight(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + (m || 0);
  return total >= 21 * 60 || total <= 4 * 60;
}

export async function planHubActivities(hub, arrivalTime = null, preferences = {}) {
  if (!hub) return { stay: [], food: [] };
console.log("Arrival Time:", arrivalTime);
  const isNightArrival = arrivalTime && isLateNight(arrivalTime);
console.log("Is Night Arrival:", isNightArrival);
  if (!isNightArrival) {
    return {
      hubName: hub.name,
      overnightRequired: false,
      note: "No overnight stay needed — direct or same-day connection available.",
    };
  }

  const coords = hub.lat ? { lat: hub.lat, lon: hub.lon } : hub;
  return planLocationActivities(coords, preferences);
}
