import { findBestTransport } from "../services/transportService.js";
import { planHubActivities, planDestinationActivities, generateTripSummary  } from "../services/tripPlannerService.js";
import { getNearestHub as findNearestHub } from "../services/hubService.js";
import { getLatLon } from "../utils/geocodeUtils.js";

/** 1️⃣ Auto planner — chooses best mode automatically */
export async function planTripAuto(req, res, next) {
  try {
    const prefs = req.body || {};

    // Basic validation
    if (!prefs.fromLocation || !prefs.toLocation) {
      return res.status(400).json({ message: "fromLocation and toLocation are required" });
    }

    const onward  = await findBestTransport(prefs.fromLocation, prefs.toLocation, prefs);

    const transport = onward;
    if (!transport.best)
      return res.status(404).json({ message: "No transport found", transport });

    let hubPlan = null;
    if (transport.best.viaHub) {
      // Normalize hub object: ensure we pass an object with lat/lon to planHubActivities
      let hubCandidate = transport.best.hubs?.to || transport.best.hub || transport.best.hubs?.from;

      // If hubCandidate lacks lat/lon, try to resolve via geocode using its name/string
      if (hubCandidate && !(hubCandidate.lat && hubCandidate.lon)) {
        const hubName = typeof hubCandidate === "string" ? hubCandidate : hubCandidate?.name;
        if (hubName) {
          const geo = await getLatLon(hubName);
          if (geo) hubCandidate = { ...(typeof hubCandidate === "object" ? hubCandidate : {}), lat: geo.lat, lon: geo.lon, name: hubName };
        }
      }

      hubPlan = await planHubActivities(hubCandidate, transport.best.arrivalTime, prefs);
    }

    const destPlan = await planDestinationActivities(prefs.toLocation, prefs);


    let returnPlan = null;
    // Support both returnDate and legacy endDate (prefer returnDate)
    const returnDate = prefs.returnDate || prefs.endDate;
    if (returnDate) {
      console.log("🛫 Planning return journey...");

      const returnPrefs = {
        ...prefs,
        // Use returnDate as the start date for the return search
        startDate: returnDate,
        // keep returnDate in prefs so generateTripSummary can read it
        returnDate: returnDate,
        preferredStartTime: prefs.preferredReturnTime || "evening",
        isReturn: true
      };

      const back = await findBestTransport(
        prefs.toLocation,
        prefs.fromLocation,
        returnPrefs
      );

      if (back.best) {
        returnPlan = {
          found: true,
          selectedTransport: back.best,
          reasoning: back.reasoning
        };
      } else {
        console.warn("⚠️ No return transport found");
        returnPlan = { found: false, reason: "No return transport found" };
      }
    }

    const tripSummary = generateTripSummary({
      best: transport.best,
      prefs: { ...prefs, returnDate: prefs.returnDate || prefs.endDate },
      hubPlan,
      destinationPlan: destPlan,
    });

    // res.json({
    //   selectedTransport: transport.best,
    //   reasoning: transport.reasoning,
    //   hubPlan,
    //   destinationPlan: destPlan,
    // });

    res.json({
      tripType: (prefs.returnDate || prefs.endDate) ? "round-trip" : "one-way",
      onward: {
        selectedTransport: onward.best,
        reasoning: onward.reasoning,
        hubPlan
      },
      destinationPlan: destPlan,
      return: returnPlan,
      tripSummary
    });
  } catch (e) { next(e); }
}

/** 2️⃣ Manual planner — user picks a specific transport */
export async function planTripWithTransport(req, res, next) {
  try {
    const { transportChoice, prefs } = req.body;
    let hubPlan = null;
    if (transportChoice?.viaHub) {
      // transportChoice may contain hubs.{from,to} or a hub property
      let hubCandidate = transportChoice.hubs?.to || transportChoice.hub || transportChoice.hubs?.from;
      const arrivalTime = transportChoice.arrivalTime || transportChoice.arrival_time || null;

      // Try to resolve lat/lon if missing
      if (hubCandidate && !(hubCandidate.lat && hubCandidate.lon)) {
        const hubName = typeof hubCandidate === "string" ? hubCandidate : hubCandidate?.name;
        if (hubName) {
          const geo = await getLatLon(hubName);
          if (geo) hubCandidate = { ...(typeof hubCandidate === "object" ? hubCandidate : {}), lat: geo.lat, lon: geo.lon, name: hubName };
        }
      }

      hubPlan = await planHubActivities(hubCandidate, arrivalTime, prefs);
    }

    const destPlan = await planDestinationActivities(prefs.toLocation, prefs);

    res.json({
      selectedTransport: transportChoice,
      hubPlan,
      destinationPlan: destPlan
    });
  } catch (e) { next(e); }
}

/** 3️⃣ Fetch all available transport options only */
export async function getTransportOptions(req, res, next) {
  try {
    const prefs = req.body;
    const options = await findBestTransport(prefs.start, prefs.destination, prefs);
    res.json(options);
  } catch (e) { next(e); }
}

/** 4️⃣ Find nearest hub (helper endpoint) */
export async function getNearestHub(req, res, next) {
  try {
    const { location, mode = "train" } = req.body || {};

    let locObj = null;
    if (!location) return res.status(400).json({ message: "Missing 'location' in request body" });

    if (typeof location === "object" && location.lat && location.lon) {
      locObj = { lat: location.lat, lon: location.lon };
    } else if (typeof location === "string") {
      const geo = await getLatLon(location);
      if (!geo) return res.status(404).json({ message: "Could not resolve location" });
      locObj = { lat: geo.lat, lon: geo.lon, formattedAddress: geo.formattedAddress };
    } else {
      return res.status(400).json({ message: "Unsupported 'location' format. Provide a string or {lat,lon}." });
    }

    const hubs = findNearestHub(locObj, mode);
    res.json({ location: locObj, mode, hubs });
  } catch (e) { next(e); }
}
