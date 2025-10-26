import { getTrains, getStationCode } from "./trainService.js";
import { getBuses, getBusLocationId } from "./busService.js";
import { getNearestHub } from "./hubService.js";
import { computeScore, explainChoice } from "../utils/rankUtils.js";
import { getLatLon } from "../utils/geocodeUtils.js";

/**
 * Fetch all possible direct transport options (trains + buses)
 */
export async function fetchAllTransportOptions(start, dest, prefs) {
  const [fromTrain, toTrain] = await Promise.allSettled([
    getStationCode(start),
    getStationCode(dest),
  ]);

  const [fromBus, toBus] = await Promise.allSettled([
    getBusLocationId(start),
    getBusLocationId(dest),
  ]);

  const trains =
    fromTrain.value?.code && toTrain.value?.code
      ? await getTrains(fromTrain.value.code, toTrain.value.code, prefs.startDate)
      : [];

  const buses =
    fromBus.value && toBus.value
      ? await getBuses(fromBus.value, toBus.value, prefs.startDate)
      : [];

  return { trains, buses };
}

/**
 * 🚀 Unified Transport Discovery, Ranking & Fallback (Train + Bus)
 */
export async function findBestTransport(start, dest, prefs) {
  // --- Step 1: Resolve coordinates ---
  const startGeo = prefs.startLat
    ? { lat: prefs.startLat, lon: prefs.startLon }
    : await getLatLon(start);
  const destGeo = prefs.destLat
    ? { lat: prefs.destLat, lon: prefs.destLon }
    : await getLatLon(dest);

  if (!startGeo || !destGeo)
    throw new Error("Unable to resolve location coordinates");

  // --- Step 2: Get station/bus IDs ---
  const [fromTrain, toTrain] = await Promise.allSettled([
    getStationCode(start),
    getStationCode(dest),
  ]);
  const [fromBus, toBus] = await Promise.allSettled([
    getBusLocationId(start),
    getBusLocationId(dest),
  ]);

  // --- Step 3: Try direct routes ---
  const trains =
    fromTrain.value?.code && toTrain.value?.code
      ? await getTrains(fromTrain.value.code, toTrain.value.code, prefs.startDate)
      : [];

  const buses =
    fromBus.value && toBus.value
      ? await getBuses(fromBus.value, toBus.value, prefs.startDate)
      : [];

  let options = [];

  // 🚫 Respect avoidModes
  const allowTrain = !prefs.avoidModes?.includes("train");
  const allowBus = !prefs.avoidModes?.includes("bus");
  const allowFlight = !prefs.avoidModes?.includes("flight");

  if (allowTrain) {
    options.push(
      ...trains.map((t) => ({
        mode: "train",
        ...t,
        score: computeScore(t, prefs),
      }))
    );
  }

  if (allowBus) {
    options.push(
      ...buses.map((b) => ({
        mode: "bus",
        ...b,
        score: computeScore(b, prefs),
      }))
    );
  }

  // --- Step 4: Fallback to hubs if no direct found ---
  if (!options.length) {
    console.log("⚠️ No direct transport found, searching via hubs...");

    const nearestSourceTrainHub = allowTrain ? getNearestHub(startGeo, "train") : null;
    const nearestDestTrainHub = allowTrain ? getNearestHub(destGeo, "train") : null;
    const nearestSourceBusHub = allowBus ? getNearestHub(startGeo, "bus") : null;
    const nearestDestBusHub = allowBus ? getNearestHub(destGeo, "bus") : null;

    // 🧩 TRAIN FALLBACK LOGIC
    if (allowTrain) {
      // SourceHub → Destination
      if (nearestSourceTrainHub?.nearest) {
        const via1 = await getTrains(
          nearestSourceTrainHub.nearest.code,
          toTrain.value?.code || dest,
          prefs.startDate
        );
        options.push(
          ...via1.map((t) => ({
            mode: "train",
            viaHub: true,
            hubs: { from: nearestSourceTrainHub.nearest },
            ...t,
            score: computeScore(t, prefs),
          }))
        );
      }

      // Source → DestinationHub
      if (nearestDestTrainHub?.nearest) {
        const via2 = await getTrains(
          fromTrain.value?.code || start,
          nearestDestTrainHub.nearest.code,
          prefs.startDate
        );
        options.push(
          ...via2.map((t) => ({
            mode: "train",
            viaHub: true,
            hubs: { to: nearestDestTrainHub.nearest },
            ...t,
            score: computeScore(t, prefs),
          }))
        );
      }

      // SourceHub → DestinationHub
      if (nearestSourceTrainHub?.nearest && nearestDestTrainHub?.nearest) {
        const via3 = await getTrains(
          nearestSourceTrainHub.nearest.code,
          nearestDestTrainHub.nearest.code,
          prefs.startDate
        );
        options.push(
          ...via3.map((t) => ({
            mode: "train",
            viaHub: true,
            hubs: {
              from: nearestSourceTrainHub.nearest,
              to: nearestDestTrainHub.nearest,
            },
            ...t,
            score: computeScore(t, prefs),
          }))
        );
      }
    }

    // 🧩 BUS FALLBACK LOGIC
    if (allowBus && nearestSourceBusHub?.nearest && nearestDestBusHub?.nearest) {
      const fromId = await getBusLocationId(nearestSourceBusHub.nearest.name);
      const toId = await getBusLocationId(nearestDestBusHub.nearest.name);

      const viaBus = await getBuses(fromId, toId, prefs.startDate);
      options.push(
        ...viaBus.map((b) => ({
          mode: "bus",
          viaHub: true,
          hubs: {
            from: nearestSourceBusHub.nearest,
            to: nearestDestBusHub.nearest,
          },
          ...b,
          score: computeScore(b, prefs),
        }))
      );
    }
  }

  // --- Step 5: Rank & choose best option ---
  if (!options.length)
    throw new Error("No transport options found (direct or via hub)");

  options.sort((a, b) => b.score - a.score);
  const best = options[0];
  const reasoning = explainChoice(best.mode, best, prefs);

  return {
    best,
    allOptions: options,
    reasoning,
    usedGeocode: { startGeo, destGeo },
  };
}
