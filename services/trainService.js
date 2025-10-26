import axios from "axios";
import { toDDMMYYYY } from "../utils/dateUtils.js";

const BASE = "https://cttrainsapi.confirmtkt.com/api/v2/trains";


export async function getStationCode(search) {
  if (!search) return null;

  try {
    const url = `${BASE}/stations/auto-suggestion?searchString=${encodeURIComponent(
      search
    )}&sourceStnCode=&popularStnListLimit=15&preferredStnListLimit=6&channel=ABHIBUS&language=EN`;

    const res = await axios.get(url);

    // Case 1: API-level error response
    if (res.data?.error) {
      console.warn(
        `⚠️ ConfirmTKT Station lookup failed for "${search}": ${res.data.error.message}`
      );
      return null;
    }

    // Case 2: No stations found
    const stn = res.data?.data?.stationList?.[0];
    if (!stn) {
      console.warn(`⚠️ No station found for "${search}"`);
      return null;
    }

    // ✅ Success
    return {
      code: stn.stationCode,
      name: stn.stationName,
      lat: parseFloat(stn.latitude),
      lon: parseFloat(stn.longitude),
    };
  } catch (err) {
    // Case 3: Network or 500 error
    console.warn(`⚠️ Station code lookup failed for "${search}": ${err.message}`);
    return null;
  }
}

export async function getTrains(from, to, dateOfJourney) {

  dateOfJourney = toDDMMYYYY(dateOfJourney);
  const url = `https://cttrainsapi.confirmtkt.com/api/v1/trains/search?sourceStationCode=${from}&destinationStationCode=${to}&addAvailabilityCache=true&excludeMultiTicketAlternates=false&excludeBoostAlternates=false&sortBy=DEFAULT&dateOfJourney=${dateOfJourney}&enableNearby=true&enableTG=true&tGPlan=CTG-15&showTGPrediction=false&tgColor=DEFAULT&showPredictionGlobal=true&showNewAlternates=false`;

  const { data } = await axios.get(url);

  return data?.data?.trainList?.map(t => ({
    trainNumber: t.trainNumber,
    trainName: t.trainName,
    fromStnCode: t.fromStnCode,
    toStnCode: t.toStnCode,
    departureTime: t.departureTime,
    arrivalTime: t.arrivalTime,
    fare: Object.values(t.availabilityCache || {})[0]?.fare ?? 0,
    availability: Object.values(t.availabilityCache || {})[0]?.availability ?? "",
    duration: t.duration,
  })) || [];
}
