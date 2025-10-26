import axios from "axios";
import { toDDMMYYYY } from "../utils/dateUtils.js";

export async function getBusLocationId(city) {
  const url = `https://www.abhibus.com/wap/abus-autocompleter/api/v1/results?s=${encodeURIComponent(city)}`;
  console.log("Bus location lookup URL:", url);
  const { data } = await axios.get(url);
  if (!data?.length) throw new Error("No bus stop found");
  return data[0].id;
}

export async function getBuses(fromId, toId, jdate) {
  jdate = toDDMMYYYY(jdate);
  const { data } = await axios.post("https://www.abhibus.com/wap/GetBusList", {
    sourceid: fromId,
    destinationid: toId,
    jdate : jdate,
    prd: "mobile",
    filters: 1
  });
if(data?.serviceDetailsList?.length == 0) return [];
  return data?.serviceDetailsList?.map(b => ({
    busName: b.travelerAgentName + b.busTypeName,
    fare: parseFloat(b.fare),
    serviceNumber: b.serviceNumber,
    departureTime: b.startTimeDateFormat,
    arrivalTime: b.arriveTime,
    availability: b.availableSeats ? "AVAILABLE" : "FULL",
    duration: b.travelTime,
  })) || [];
}
