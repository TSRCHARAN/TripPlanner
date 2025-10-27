import fs from "fs";
import { haversineDistance } from "../utils/distanceUtils.js";

const railwayStations = JSON.parse(fs.readFileSync("./public/railwayStations.json","utf-8"));
const busDepots = JSON.parse(fs.readFileSync("./public/busStands.json","utf-8"));

export function getNearestHub(location, mode = "train") {
  let data = [];
  if (mode === "train") {
    data = railwayStations.features.map(f => ({
      name: f.properties.name,
      code: f.properties.code,
      lat: f.geometry?.coordinates[1],
      lon: f.geometry?.coordinates[0],
      isJunction: f.properties.name.toLowerCase().includes("jn")
    }));
  } else if (mode === "bus") {
    data = busDepots.map(b => ({
      name: b.name,
      lat: b.latitude,
      lon: b.longitude,
      isDepot: true
    }));
  }

  let nearest = null, nearestJunction = null;
  let min = Infinity, minJ = Infinity;
  for (const hub of data) {
    const d = haversineDistance(location.lat, location.lon, hub.lat, hub.lon);
    if (d < min) { min = d; nearest = { ...hub, distance_km: d }; }
    if (hub.isJunction && d < minJ) { minJ = d; nearestJunction = { ...hub, distance_km: d }; }
    if (hub.isDepot && d < minJ) { minJ = d; nearestJunction = { ...hub, distance_km: d }; }
  }
  return { nearest, nearestJunction };
}
