import axios from "axios";

/**
 * Get latitude & longitude for a given place name
 */
export async function getLatLon(locationName) {
    const API_KEY = process.env.GOOGLE_API_KEY;
    console.log("GOOGLE_KEY: (getLatLon)", API_KEY);
  if (!locationName) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      locationName
    )}&key=${API_KEY}`;
    const { data } = await axios.get(url);
    const first = data.results?.[0];
    if (!first) return null;

    return {
      lat: first.geometry.location.lat,
      lon: first.geometry.location.lng,
      formattedAddress: first.formatted_address,
      placeId: first.place_id,
    };
  } catch (err) {
    console.error("Geocode error:", err.message);
    return null;
  }
}
