import axios from "axios";

/** Check if arrival time falls between 6 PM – 6 AM */
function isLateNight(timeStr) {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + (m || 0);
  return total >= 18 * 60 || total <= 6 * 60;
}

/* ─────────────────────────────────────────────
   🏙️  HUB PLANNING
────────────────────────────────────────────── */
export async function planHubActivities(hub, arrivalTime, prefs) {
  const isNightArrival = arrivalTime && isLateNight(arrivalTime);

  if (!isNightArrival) {
    return {
      hubName: hub.name,
      overnightRequired: false,
      note: "No overnight stay needed — direct or same-day connection available."
    };
  }

  const stayResults = await searchPlacesSmart(hub.lat, hub.lon, "lodging", prefs);
  const foodResults = await searchPlacesSmart(hub.lat, hub.lon, "restaurant", prefs);

  const filteredStay = lightFilter(stayResults, prefs, "accommodation");
  const filteredFood = lightFilter(foodResults, prefs, "food");

  return {
    hubName: hub.name,
    overnightRequired: true,
    stay: filteredStay.results,
    food: filteredFood.results,
    reasoning: [filteredStay.reason, filteredFood.reason].filter(Boolean),
    transfer: {
      mapsLink: `https://www.google.com/maps/dir/?api=1&origin=${hub.lat},${hub.lon}&destination=${encodeURIComponent(prefs.toLocation)}`,
      estimatedDistanceKm: await estimateDistanceKm(hub, prefs.toLocation)
    }
  };
}

/* ─────────────────────────────────────────────
   🎯  DESTINATION PLANNING
────────────────────────────────────────────── */
export async function planDestinationActivities(dest, prefs) {
  const attractions = await searchPlacesSmart(dest, null, "attractions", prefs);
  const hotels = await searchPlacesSmart(dest, null, "hotels", prefs);
  const food = await searchPlacesSmart(dest, null, "restaurants", prefs);

  const filteredAttractions = lightFilter(attractions, prefs, "sightseeing");
  const filteredHotels = lightFilter(hotels, prefs, "accommodation");
  const filteredFood = lightFilter(food, prefs, "food");

  return {
    attractions: filteredAttractions.results,
    hotels: filteredHotels.results,
    food: filteredFood.results,
    reasoning: [
      filteredAttractions.reason,
      filteredHotels.reason,
      filteredFood.reason
    ].filter(Boolean)
  };
}

/* ─────────────────────────────────────────────
   🔍  SMART SEARCH (Google + preferences)
────────────────────────────────────────────── */
async function searchPlacesSmart(cityOrLat, lon, type, prefs = {}) {
  const API_KEY = process.env.GOOGLE_API_KEY;
  let url, query;

  if (lon) {
    // Nearby search for hubs
    query = buildQueryKeyword(type, prefs);
    url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${cityOrLat},${lon}&radius=3000&type=${type}&keyword=${encodeURIComponent(query)}&key=${API_KEY}`;
  } else {
    // Text search for destination city
    query = `${cityOrLat} ${buildQueryKeyword(type, prefs)}`;
    url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${API_KEY}`;
  }

  const { data } = await axios.get(url);
  return simplifyPlaces(data.results.slice(0, 7));
}

/* ─────────────────────────────────────────────
   🧠  Query builder (inject preferences)
────────────────────────────────────────────── */
function buildQueryKeyword(type, prefs) {
  switch (type) {
    case "restaurants":
      const cuisines = prefs.food?.preferred_cuisines?.join(" ") || "";
      const veg = prefs.food?.type === "veg" ? "veg" : "";
      return `${veg} ${cuisines} restaurants`;
    case "hotels":
    case "lodging":
      const types = prefs.accommodation?.types?.join(" ") || "";
      const budget =
        prefs.budgetCategory === "low"
          ? "budget"
          : prefs.budgetCategory === "high"
          ? "luxury"
          : "midrange";
      return `${budget} ${types} hotels`;
    case "attractions":
      const interests = prefs.sightseeing?.interests?.join(" ") || "tourist attractions";
      return interests;
    default:
      return type;
  }
}

/* ─────────────────────────────────────────────
   🔎  Simplify Google response
────────────────────────────────────────────── */
export function simplifyPlaces(results = []) {
  function mapCategoryFromTypes(types = []) {
    // return a more granular key where possible; fall back to generic keys
    if (!types || !types.length) return { key: "other", label: "Other" };
    const set = new Set(types || []);

    // Specific attractions
    if (set.has("museum")) return { key: "museum", label: "Museum" };
    if (set.has("art_gallery")) return { key: "art_gallery", label: "Art gallery" };
    if (set.has("zoo")) return { key: "zoo", label: "Zoo" };
    if (set.has("aquarium")) return { key: "aquarium", label: "Aquarium" };
    if (set.has("park")) return { key: "park", label: "Park" };
    if (set.has("tourist_attraction")) return { key: "tourist_attraction", label: "Attraction" };

    // Food & drink
    if (set.has("restaurant")) return { key: "restaurant", label: "Restaurant" };
    if (set.has("cafe")) return { key: "cafe", label: "Cafe" };
    if (set.has("bar")) return { key: "bar", label: "Bar" };
    if (set.has("bakery")) return { key: "bakery", label: "Bakery" };

    // Lodging
    if (set.has("lodging") || set.has("hotel")) return { key: "hotel", label: "Hotel" };
    if (set.has("hostel")) return { key: "hostel", label: "Hostel" };

    // Shopping
    if (set.has("shopping_mall")) return { key: "shopping_mall", label: "Shopping mall" };
    if (set.has("store") || set.has("clothing_store") || set.has("department_store")) return { key: "store", label: "Store" };

    // Transit / stations
    if (set.has("airport")) return { key: "airport", label: "Airport" };
    if (set.has("train_station")) return { key: "train_station", label: "Train station" };
    if (set.has("bus_station")) return { key: "bus_station", label: "Bus station" };
    if (set.has("transit_station")) return { key: "transit_station", label: "Transit station" };

    // Fallback grouping
    if (types.join("|").match(/food|meal/)) return { key: "food", label: "Food" };
    return { key: "other", label: "Other" };
  }

  return results.map((p) => {
    const photos = (p.photos || []).slice(0, 3).map((ph) => ({
      ref: ph.photo_reference,
      width: ph.width,
      height: ph.height,
    }));

    const photoCount = (p.photos || []).length || 0;
    const photosAvailable = photoCount > 0;

    const thumbnail = photosAvailable
      ? `/photo/placePhoto?ref=${encodeURIComponent(photos[0].ref)}&maxwidth=300`
      : null;

    const location = p.geometry?.location
      ? { lat: p.geometry.location.lat, lon: p.geometry.location.lng }
      : null;

    return {
      id: p.place_id,
      name: p.name,
  rawTypes: p.types || [],
  categoryKey: mapCategoryFromTypes(p.types || []).key,
  category: mapCategoryFromTypes(p.types || []).label,
      opening_hours: p.opening_hours
        ? { open_now: !!p.opening_hours.open_now, weekday_text: p.opening_hours.weekday_text || [] }
        : null,
      phone: p.formatted_phone_number || p.international_phone_number || null,
      website: p.website || null,
      rating: typeof p.rating === "number" ? p.rating : null,
      userRatingsTotal: p.user_ratings_total || 0,
      address: p.formatted_address || p.vicinity || "Not available",
      location,
      mapLink: `https://www.google.com/maps/place/?q=place_id:${p.place_id}`,
  // Return full types array from Google Places (breaking change): frontend may rely on full tokens
  types: p.types || [],
      priceLevel: p.price_level || null,
  thumbnail,
  photosAvailable,
  photoCount,
      source: "google_places",
    };
  });
}

/* ─────────────────────────────────────────────
   🧹  Lightweight filtering + fallback logic
────────────────────────────────────────────── */
function lightFilter(items, prefs, category) {
  if (!items?.length)
    return { results: [], reason: "No data found from Google API." };

  let filtered = [];
  let reason = "";

  switch (category) {
    case "accommodation":
      filtered = items.filter(
        (h) =>
          (!prefs.accommodation?.rating_min ||
            h.rating >= prefs.accommodation.rating_min) &&
          (!prefs.budgetCategory ||
            (prefs.budgetCategory === "low" && h.priceLevel <= 2) ||
            (prefs.budgetCategory === "mid" && h.priceLevel <= 3) ||
            (prefs.budgetCategory === "high" && h.priceLevel >= 3))
      );

      if (!filtered.length) {
        filtered = items.filter((h) => h.rating >= 3);
        reason =
          "No hotels matched your filters — showing top-rated stays instead.";
      }
      break;

    case "food":
      filtered = items.filter((r) => {
        const name = r.name.toLowerCase();
        const vegOk = prefs.food?.type !== "veg" || name.includes("veg");
        const cuisineOk =
          !prefs.food?.preferred_cuisines?.length ||
          prefs.food.preferred_cuisines.some((c) =>
            name.includes(c.toLowerCase())
          );
        return vegOk && cuisineOk;
      });

      if (!filtered.length) {
        filtered = items.slice(0, 5);
        reason =
          "No exact cuisine matches found — showing general restaurants nearby.";
      }
      break;

    case "sightseeing":
      filtered = items;
      if (prefs.sightseeing?.interests?.length) {
        const keywords = prefs.sightseeing.interests.map((i) =>
          i.toLowerCase()
        );
        filtered = items.filter((a) =>
          keywords.some((k) =>
            (a.name + " " + (a.types || []).join(" ")).toLowerCase().includes(k)
          )
        );
      }

      if (prefs.sightseeing?.avoid_crowds)
        filtered = filtered.filter((a) => (a.userRatingsTotal || 0) < 1000);

      if (!filtered.length) {
        filtered = items.slice(0, 5);
        reason =
          "No attractions matched your interests — showing popular nearby spots.";
      }
      break;

    default:
      filtered = items;
  }

  return { results: filtered, reason };
}

/* ─────────────────────────────────────────────
   📏  Distance Matrix helper
────────────────────────────────────────────── */
async function estimateDistanceKm(hub, destinationQuery) {
  try {
    const API_KEY = process.env.GOOGLE_API_KEY;
    const { data } = await axios.get(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${hub.lat},${hub.lon}&destinations=${encodeURIComponent(
        destinationQuery
      )}&key=${API_KEY}`
    );

    const el = data.rows?.[0]?.elements?.[0];
    if (!el || el.status !== "OK") return { distance: "N/A", duration: "N/A" };
    return {
      distance: el.distance?.text || "N/A",
      duration: el.duration?.text || "N/A"
    };
  } catch {
    return { distance: "N/A", duration: "N/A" };
  }
}

/* ─────────────────────────────────────────────
   🧭  Trip summary generator
────────────────────────────────────────────── */
export function generateTripSummary({ best, prefs, hubPlan, destinationPlan }) {
  if (!best) return "No transport found for trip summary.";

  const modeEmoji = best.mode === "train" ? "🚆" : "🚌";
  const startTime = best.departureTime ? `at ${best.departureTime}` : "";
  const arriveTime = best.arrivalTime ? `around ${best.arrivalTime}` : "";
  const viaText = best.viaHub
    ? ` via ${best.hubs?.from?.name || best.hubs?.to?.name}`
    : "";

  let summary = `${modeEmoji} Start from ${prefs.fromLocation} on ${prefs.startDate} ${startTime}${viaText} to reach ${prefs.toLocation} ${arriveTime}.`;

  if (best.viaHub && hubPlan?.overnightRequired)
    summary += ` Stay overnight at ${hubPlan.hubName}, then continue the next morning.`;

  if (destinationPlan?.attractions?.length)
    summary += ` Explore ${destinationPlan.attractions
      .slice(0, 2)
      .map((a) => a.name)
      .join(", ")}.`;

  if (destinationPlan?.reasoning?.length)
    summary += ` (Some preferences were adjusted: ${destinationPlan.reasoning.join(
      " "
    )}).`;

  if (prefs.returnDate)
    summary += ` Return on ${prefs.returnDate} (${prefs.preferredReturnTime || "evening"}).`;

  return summary.trim();
}
