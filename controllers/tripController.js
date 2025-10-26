import { findBestTransport, fetchAllTransportOptions } from "../services/transportService.js";
import { planHubActivities, planDestinationActivities, generateTripSummary  } from "../services/tripPlannerService.js";

/** 1️⃣ Auto planner — chooses best mode automatically */
export async function planTripAuto(req, res, next) {
  try {
    const prefs = req.body;
    const onward  = await findBestTransport(prefs.fromLocation, prefs.toLocation, prefs);

    const transport = onward;
    if (!transport.best)
      return res.status(404).json({ message: "No transport found", transport });

    const hubPlan = transport.best.viaHub
      ? await planHubActivities(transport.best.hubs.to, transport.best.arrivalTime, prefs)
      : null;

    const destPlan = await planDestinationActivities(prefs.toLocation, prefs);


    let returnPlan = null;
    if (prefs.endDate) {
      console.log("🛫 Planning return journey...");

      const returnPrefs = {
        ...prefs,
        startDate: prefs.endDate, // use trip end date
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
          selectedTransport: back.best,
          reasoning: back.reasoning
        };
      } else {
        console.warn("⚠️ No return transport found");
      }
    }

    const tripSummary = generateTripSummary({
      best: transport.best,
      prefs,
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
      tripType: prefs.endDate ? "round-trip" : "one-way",
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
    const hubPlan = transportChoice.viaHub
      ? await planHubActivities(transportChoice.hub, prefs)
      : null;

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
