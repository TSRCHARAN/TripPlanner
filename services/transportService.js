import { getTrains, getStationCode } from "./trainService.js";
import { getBuses, getBusLocationId } from "./busService.js";
import { getNearestHub } from "./hubService.js";
import { computeScore, explainChoice } from "../utils/rankUtils.js";
import { getLatLon } from "../utils/geocodeUtils.js";

/** 🚆 + 🚌 Unified Transport Discovery, Ranking & Fallback */
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

  // --- Step 2: Get codes/IDs ---
  const [fromTrain, toTrain] = await Promise.allSettled([
    getStationCode(start),
    getStationCode(dest),
  ]);
  const [fromBus, toBus] = await Promise.allSettled([
    getBusLocationId(start),
    getBusLocationId(dest),
  ]);

  // --- Step 3: Direct routes ---
  const trains =
    fromTrain.value?.code && toTrain.value?.code
      ? await getTrains(fromTrain.value.code, toTrain.value.code, prefs.startDate)
      : [];

  const buses =
    fromBus.value && toBus.value
      ? await getBuses(fromBus.value, toBus.value, prefs.startDate)
      : [];

  let options = [];

  // Respect avoidModes
  const allowTrain = !prefs.avoidModes?.includes("train");
  const allowBus = !prefs.avoidModes?.includes("bus");

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

    // Train Hubs
    const nearestSourceTrainHub = allowTrain ? getNearestHub(startGeo, "train") : null;
    const nearestDestTrainHub = allowTrain ? getNearestHub(destGeo, "train") : null;

    // Bus Hubs
    const nearestSourceBusHub = allowBus ? getNearestHub(startGeo, "bus") : null;
    const nearestDestBusHub = allowBus ? getNearestHub(destGeo, "bus") : null;

    // 🚆 TRAIN FALLBACK LOGIC
    if (allowTrain) {
      const sHub = nearestSourceTrainHub?.nearest;
      const sJn = nearestSourceTrainHub?.nearestJunction;
      const dHub = nearestDestTrainHub?.nearest;
      const dJn = nearestDestTrainHub?.nearestJunction;

      const allTrainCombos = [
        { from: sHub, to: toTrain.value?.code || dest },
        { from: fromTrain.value?.code || start, to: dHub },
        { from: sJn, to: toTrain.value?.code || dest },
        { from: fromTrain.value?.code || start, to: dJn },
        { from: sJn, to: dJn },
      ];

      for (const combo of allTrainCombos) {
        if (!combo.from || !combo.to?.code) continue;

        const viaTrains = await getTrains(
          combo.from.code || combo.from,
          combo.to.code || combo.to,
          prefs.startDate
        );

        options.push(
          ...viaTrains.map((t) => ({
            mode: "train",
            viaHub: true,
            hubs: { from: combo.from, to: combo.to },
            ...t,
            score: computeScore(t, prefs),
          }))
        );
      }
    }

    // 🚌 BUS FALLBACK LOGIC
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

  console.log("✅ Total transport options found:", options.length);

  // --- Step 5: Rank & return ---
  if (!options.length)
    throw new Error("No transport options found (direct or via hub/junction)");

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
