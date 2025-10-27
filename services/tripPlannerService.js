import axios from "axios";

/** Check if arrival time falls between 6 PM – 6 AM */
function isLateNight(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + (m || 0);
  return total >= 18 * 60 || total <= 6 * 60;
}

/**
 * 🏙️ Plan hub activities (stay, food, transfer)
 */
export async function planHubActivities(hub, arrivalTime, prefs) {
  const isNightArrival = arrivalTime && isLateNight(arrivalTime);

  if (!isNightArrival) {
    return {
      hubName: hub.name,
      overnightRequired: false,
      note: "No overnight stay needed — direct or same-day connection available."
    };
  }

  const stayResults = await searchPlaces(hub.lat, hub.lon, "lodging");
  const foodResults = await searchPlaces(hub.lat, hub.lon, "restaurant");
  return {
    hubName: hub.name,
    overnightRequired: true,
    stay: stayResults,
    food: foodResults,
    transfer: {
      mapsLink: `https://www.google.com/maps/dir/?api=1&origin=${hub.lat},${hub.lon}&destination=${encodeURIComponent(prefs.toLocation)}`,
      estimatedDistanceKm: await estimateDistanceKm(hub, prefs.toLocation)
    }
  };

  // return {
  //   hubName: hub.name,
  //   overnightRequired: true,
  //   stay: filterAccommodation(stayResults, prefs.accommodation, prefs.budgetCategory),
  //   food: filterFood(foodResults, prefs.food),
  //   transfer: {
  //     mapsLink: `https://www.google.com/maps/dir/?api=1&origin=${hub.lat},${hub.lon}&destination=${encodeURIComponent(prefs.toLocation)}`,
  //     estimatedDistanceKm: await estimateDistanceKm(hub, prefs.toLocation)
  //   }
  // };
}

/**
 * 🎯 Plan sightseeing, stay & food at the final destination
 */
export async function planDestinationActivities(dest, prefs) {
  const API_KEY = process.env.GOOGLE_API_KEY;
  let query = encodeURIComponent(dest + " tourist attractions");

  // Instead of generic query:
// query = `${dest} tourist attractions`;
// console.log("Destination Query:", query);
// // Personalized smart query:
// let interestKeywords = prefs.sightseeing?.interests?.join(" OR ") || "tourist attractions";
// query = `${dest} ${interestKeywords}`;


  const { data: attractionsData } = await axios.get(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${API_KEY}`
  );

  let attractions = simplifyPlaces(attractionsData.results.slice(0, 30));
  
  const hotels = await searchPlacesByQuery(dest, "hotels");
  const food = await searchPlacesByQuery(dest, "restaurants");
  //attractions = filterAttractions(attractions, prefs.sightseeing);
  // const hotels = filterAccommodation(
  //   await searchPlacesByQuery(dest, "hotels"),
  //   prefs.accommodation,
  //   prefs.budgetCategory
  // );
  // const food = filterFood(
  //   await searchPlacesByQuery(dest, "restaurants"),
  //   prefs.food
  // );

  return { attractions, hotels, food };
}

/**
 * 🔍 Nearby search using lat/lon
 */
async function searchPlaces(lat, lon, type) {
  const API_KEY = process.env.GOOGLE_API_KEY;
  const { data } = await axios.get(
    `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}&radius=3000&type=${type}&key=${API_KEY}`
  );
  return simplifyPlaces(data.results.slice(0, 5));
}

/**
 * 🔍 Text search using city name
 */
async function searchPlacesByQuery(city, type) {
  const API_KEY = process.env.GOOGLE_API_KEY;
  const { data } = await axios.get(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(city + " " + type)}&key=${API_KEY}`
  );
  return simplifyPlaces(data.results.slice(0, 5));
}

/**
 * 🧩 Simplify Google Place results
 */
function simplifyPlaces(results = []) {
  return results.map((p) => ({
    name: p.name,
    rating: p.rating || "N/A",
    userRatingsTotal: p.user_ratings_total || 0,
    address: p.formatted_address || p.vicinity || "Not available",
    location: p.geometry?.location || null,
    mapLink: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
    types: p.types?.slice(0, 3) || [],
    priceLevel: p.price_level || null
  }));
}

/**
 * 💰 Filter stays/hotels by budget + rating + type
 */
function filterAccommodation(items, accommodationPrefs, budgetCategory) {
  if (!items?.length) return [];

  return items.filter((p) => {
    const meetsType = !accommodationPrefs?.types?.length ||
      accommodationPrefs.types.some((t) =>
        (p.types || []).some((pt) => pt.includes(t))
      );

    const meetsRating =
      !accommodationPrefs?.rating_min ||
      (p.rating && p.rating >= accommodationPrefs.rating_min);

    const meetsBudget = (() => {
      if (!budgetCategory || !p.priceLevel) return true;
      if (budgetCategory === "low") return p.priceLevel <= 2;
      if (budgetCategory === "mid") return p.priceLevel <= 3;
      if (budgetCategory === "high") return p.priceLevel >= 3;
      return true;
    })();

    return meetsType && meetsRating && meetsBudget;
  });
}

/**
 * 🍽️ Filter restaurants by cuisine and veg/non-veg
 */
function filterFood(restaurants, foodPrefs) {
  if (!restaurants?.length) return [];

  return restaurants.filter((r) => {
    const name = r.name.toLowerCase();
    const cuisines = foodPrefs?.preferred_cuisines?.map((c) => c.toLowerCase()) || [];

    const cuisineMatch = cuisines.length
      ? cuisines.some((c) => name.includes(c))
      : true;

    const vegMatch =
      !foodPrefs?.type ||
      (foodPrefs.type.toLowerCase() === "veg" ? name.includes("veg") : true);

    return cuisineMatch && vegMatch;
  });
}

/**
 * 🏞️ Filter attractions by interests (nature, waterfalls, etc.)
 */
function filterAttractions(attractions, sightseeingPrefs) {
  if (!sightseeingPrefs?.interests?.length) return attractions;

  const keywords = sightseeingPrefs.interests.map((i) => i.toLowerCase());

  let filtered = attractions.filter((a) =>
    keywords.some((k) =>
      (a.name + " " + (a.types || []).join(" ")).toLowerCase().includes(k)
    )
  );

  if (sightseeingPrefs.avoid_crowds) {
    filtered = filtered.filter((a) => (a.userRatingsTotal || 0) < 1000);
  }

  return filtered;
}

/**
 * 🗺️ Distance between hub and destination
 */
async function estimateDistanceKm(hub, destinationQuery) {
  try {
    const API_KEY = process.env.GOOGLE_API_KEY;
    const { data } = await axios.get(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${hub.lat},${hub.lon}&destinations=${encodeURIComponent(destinationQuery)}&key=${API_KEY}`
    );

    const el = data.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") return { distance: "N/A", duration: "N/A" };

    return {
      distance: el.distance?.text || "N/A",
      duration: el.duration?.text || "N/A"
    };
  } catch (err) {
    console.warn("DistanceMatrix error:", err.message);
    return { distance: "N/A", duration: "N/A" };
  }
}

/**
 * 🧭 Natural-language trip summary
 */
export function generateTripSummary({ best, prefs, hubPlan, destinationPlan }) {
  if (!best) return "No transport found for trip summary.";

  const modeEmoji = best.mode === "train" ? "🚆" : "🚌";
  const startDate = prefs.startDate;
  const startTime = best.departureTime ? `at ${best.departureTime}` : "";
  const arriveTime = best.arrivalTime ? `around ${best.arrivalTime}` : "";
  const viaText = best.viaHub
    ? `via ${best.hubs?.from?.name || best.hubs?.to?.name}`
    : "";

  let summary = `${modeEmoji} Start from ${prefs.fromLocation} on ${startDate} ${startTime} ${viaText} to reach ${prefs.toLocation} ${arriveTime}.`;

  if (best.viaHub && hubPlan?.overnightRequired) {
    summary += ` Stay overnight at ${hubPlan.hubName}, then continue the next morning.`;
  }

  if (destinationPlan?.attractions?.length) {
    summary += ` Explore highlights like ${destinationPlan.attractions
      .slice(0, 2)
      .map((a) => a.name)
      .join(", ")} in ${prefs.toLocation}.`;
  }

  if (prefs.returnDate) {
    summary += ` Return on ${prefs.returnDate} during ${prefs.preferredReturnTime || "evening"}.`;
  }

  summary += " Have a safe and comfortable journey! ✈️";
  return summary.trim();
}
