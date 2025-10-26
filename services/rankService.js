/**
 * rankTransport unified: input is array of objects: {mode:"train", trains:[...]} or {mode:"bus", buses:[...]}
 * returns { bestMode, rankedOptions }
 */
export function rankTransport(options = [], userPrefs = {}) {
  const ranked = [];
  const prefModes = (userPrefs.transport?.preferred_modes || ["train","bus"]).map(m=>m.toLowerCase());

  for (const opt of options) {
    const mode = (opt.mode || "train").toLowerCase();
    const list = opt.trains || opt.buses || [];
    if (!list.length) continue;

    // compute min/max for normalizing
    const fares = list.map(i => parseFloat(i.fare || 0) || 0);
    const durations = list.map(i => parseFloat(i.duration || 0) || 0);
    const minFare = Math.min(...(fares.length?fares:[0])), maxFare = Math.max(...(fares.length?fares:[0]));
    const minDur = Math.min(...(durations.length?durations:[0])), maxDur = Math.max(...(durations.length?durations:[0]));

    for (const item of list) {
      const fare = parseFloat(item.fare || 0) || 0;
      const dur = parseFloat(item.duration || 0) || 0;
      const fareNorm = maxFare === minFare ? 0.5 : 1 - ((fare - minFare) / (maxFare - minFare));
      const durNorm = maxDur === minDur ? 0.5 : 1 - ((dur - minDur) / (maxDur - minDur));

      let comfort = 0.5;
      if (mode === "flight") comfort = 1;
      else if (mode === "train") comfort = (item.travelClass && /A|CC|EC/.test(item.travelClass)) ? 0.8 : 0.6;
      else if (mode === "bus") comfort = (item.busType && /ac/i.test(item.busType)) ? 0.7 : 0.5;

      let prefScore = 0.5;
      if (prefModes.includes(mode)) prefScore += 0.3;
      if ((userPrefs.transport?.seat_class || []).some(sc => (item.travelClass || "").includes(sc))) prefScore += 0.2;

      const total = 0.3*fareNorm + 0.3*durNorm + 0.2*comfort + 0.2*Math.min(prefScore, 1);

      ranked.push({
        mode,
        name: item.trainName || item.busName || item.flightName,
        number: item.trainNumber || item.busNumber || item.flightNumber,
        fare,
        duration: dur,
        departureTime: item.departureTime,
        arrivalTime: item.arrivalTime,
        score: +(total*100).toFixed(2)
      });
    }
  }

  ranked.sort((a,b)=>b.score-a.score);
  return { bestMode: ranked[0]?.mode || null, rankedOptions: ranked };
}
